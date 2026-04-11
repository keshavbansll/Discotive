/**
 * @fileoverview useRoadmapStore — Zustand Atomic State Engine
 * @description
 * Replaces the monolithic RoadmapContext + AgenticExecutionEngine with
 * granular, slice-based Zustand stores. Each slice only triggers re-renders
 * in components that subscribe to it — canvas drag never re-renders the panel.
 *
 * Architecture:
 *  canvasSlice    → nodes[], edges[], viewport (HIGH FREQUENCY — no Firestore)
 *  persistSlice   → dirty flag, lastSaved, isSaving
 *  uiSlice        → selectedNodeId, activePanelTab, toasts, modals
 *  engineSlice    → computed DAG states (derived, never written to DB)
 *
 * Write strategy: IDB is primary. Firestore fires only on:
 *   - Explicit Ctrl+S
 *   - 10s debounce after last structural change (NOT position-only changes)
 *   - Tab close / visibility:hidden (via sendBeacon)
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

// ── Node state constants (engine output) ─────────────────────────────────────
export const NODE_STATES = Object.freeze({
  LOCKED: "LOCKED",
  ACTIVE: "ACTIVE",
  IN_PROGRESS: "IN_PROGRESS",
  VERIFYING: "VERIFYING",
  VERIFIED_GHOST: "VERIFIED_GHOST",
  VERIFIED: "VERIFIED",
  FAILED_BACKOFF: "FAILED_BACKOFF",
  CORRUPTED: "CORRUPTED",
});

// ── Debounce helper ───────────────────────────────────────────────────────────
let _structuralDebounceTimer = null;
export const scheduleStructuralSave = (saveFn, ms = 10000) => {
  if (_structuralDebounceTimer) clearTimeout(_structuralDebounceTimer);
  _structuralDebounceTimer = setTimeout(saveFn, ms);
};

// ── DAG compiler (pure function, no side-effects) ────────────────────────────
export const compileDAG = (
  nodes,
  edges,
  serverTimeMs = Date.now(),
  vault = [],
) => {
  if (!nodes?.length) return nodes;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDeg = new Map(nodes.map((n) => [n.id, 0]));
  const adj = new Map(nodes.map((n) => [n.id, []]));
  const revAdj = new Map(nodes.map((n) => [n.id, []]));
  const computed = new Map();

  for (const e of edges) {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) continue;
    adj.get(e.source).push(e.target);
    revAdj.get(e.target).push(e.source);
    inDeg.set(e.target, inDeg.get(e.target) + 1);
  }

  const queue = [...inDeg.entries()]
    .filter(([, d]) => d === 0)
    .map(([id]) => id);
  const out = [];

  while (queue.length) {
    const id = queue.shift();
    const node = nodeMap.get(id);
    if (!node) continue;

    const sd = node.data?.stateData || {};
    const vc = node.data?.verificationContract || {};
    let state = NODE_STATES.LOCKED,
      timeLeft = null,
      reason = null;

    // LEARN_ID check
    if (vc.type === "LEARN_ID" && vc.requiredLearnId) {
      const hit = vault.find(
        (a) =>
          a.discotiveLearnId === vc.requiredLearnId && a.status === "VERIFIED",
      );
      if (!hit) {
        computed.set(id, NODE_STATES.LOCKED);
        out.push({
          ...node,
          data: {
            ...node.data,
            _computed: {
              state: NODE_STATES.LOCKED,
              reason: `Requires: ${vc.requiredLearnId}`,
              timeLeft: null,
              isInteractable: false,
            },
          },
        });
        for (const nid of adj.get(id) || []) {
          inDeg.set(nid, inDeg.get(nid) - 1);
          if (inDeg.get(nid) === 0) queue.push(nid);
        }
        continue;
      }
    }

    if (sd.status === "VERIFIED" || sd.isVerifiedPublic)
      state = NODE_STATES.VERIFIED;
    else if (sd.status === "VERIFIED_GHOST" || sd.isVerifiedGhost) {
      const unlock = sd.ghostUnlockTimeMs || 0;
      state =
        serverTimeMs >= unlock
          ? NODE_STATES.VERIFIED
          : NODE_STATES.VERIFIED_GHOST;
      if (state === NODE_STATES.VERIFIED_GHOST)
        timeLeft = unlock - serverTimeMs;
    } else if (sd.status === "VERIFYING" || sd.isVerifying)
      state = NODE_STATES.VERIFYING;
    else {
      const parents = revAdj.get(id) || [];
      const allVerified = parents.every(
        (p) => computed.get(p) === NODE_STATES.VERIFIED,
      );
      if (!allVerified && parents.length) {
        state = NODE_STATES.LOCKED;
        reason = "Awaiting upstream";
      } else if (sd.status === "FAILED_BACKOFF" && sd.penaltyExpiresAt) {
        const exp =
          typeof sd.penaltyExpiresAt?.toMillis === "function"
            ? sd.penaltyExpiresAt.toMillis()
            : Number(sd.penaltyExpiresAt);
        if (serverTimeMs < exp) {
          state = NODE_STATES.FAILED_BACKOFF;
          timeLeft = exp - serverTimeMs;
          reason = "Backoff active";
        } else state = NODE_STATES.ACTIVE;
      } else if (sd.startedAtMs) {
        const minMs = (node.data?.minimumTimeMinutes || 0) * 60000;
        const elapsed = serverTimeMs - sd.startedAtMs;
        if (elapsed < minMs) {
          state = NODE_STATES.IN_PROGRESS;
          timeLeft = minMs - elapsed;
        } else state = NODE_STATES.ACTIVE;
      } else {
        // AUTO_TIME milestone: verified if all parents verified
        state =
          vc.type === "AUTO_TIME" && parents.length === 0
            ? NODE_STATES.VERIFIED
            : NODE_STATES.ACTIVE;
      }
    }

    computed.set(id, state);
    out.push({
      ...node,
      data: {
        ...node.data,
        _computed: {
          state,
          timeLeft,
          reason,
          isInteractable: [
            NODE_STATES.ACTIVE,
            NODE_STATES.IN_PROGRESS,
            NODE_STATES.FAILED_BACKOFF,
          ].includes(state),
        },
      },
    });

    for (const nid of adj.get(id) || []) {
      inDeg.set(nid, inDeg.get(nid) - 1);
      if (inDeg.get(nid) === 0) queue.push(nid);
    }
  }

  // Cycle detection fallback
  for (const node of nodes) {
    if (!computed.has(node.id)) {
      out.push({
        ...node,
        data: {
          ...node.data,
          _computed: {
            state: NODE_STATES.CORRUPTED,
            reason: "CYCLE_DETECTED",
            timeLeft: null,
            isInteractable: false,
          },
        },
      });
    }
  }

  return out;
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN STORE
// ═══════════════════════════════════════════════════════════════════════════════
export const useRoadmapStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Canvas state ──────────────────────────────────────────────────────────
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },

    setNodes: (updater) =>
      set((s) => ({
        nodes: typeof updater === "function" ? updater(s.nodes) : updater,
      })),
    setEdges: (updater) =>
      set((s) => ({
        edges: typeof updater === "function" ? updater(s.edges) : updater,
      })),
    setViewport: (vp) => set({ viewport: vp }),

    // Batch update — structural change → mark dirty
    commitNodes: (nodes, edges) => {
      set({ nodes, edges });
      get().markDirty();
    },

    // ── Engine ────────────────────────────────────────────────────────────────
    userVault: [],
    setUserVault: (vault) => set({ userVault: vault }),

    recompile: () => {
      const { nodes, edges, userVault } = get();
      const compiled = compileDAG(nodes, edges, Date.now(), userVault);
      // Surgical update — only touch nodes whose _computed state changed
      set((s) => ({
        nodes: s.nodes.map((n) => {
          const fresh = compiled.find((c) => c.id === n.id);
          if (!fresh) return n;
          const prev = n.data?._computed;
          const next = fresh.data?._computed;
          if (
            prev?.state === next?.state &&
            Math.abs((prev?.timeLeft || 0) - (next?.timeLeft || 0)) < 1000
          )
            return n;
          return { ...n, data: { ...n.data, _computed: next } };
        }),
      }));
    },

    // ── Persistence ───────────────────────────────────────────────────────────
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    markDirty: () => set({ isDirty: true }),
    markSaved: () =>
      set({ isDirty: false, isSaving: false, lastSaved: Date.now() }),
    setSaving: (v) => set({ isSaving: v }),

    // ── UI State ──────────────────────────────────────────────────────────────
    selectedNodeId: null,
    activePanelTab: "info",
    isFullscreen: false,
    isMobile: typeof window !== "undefined" && window.innerWidth < 768,

    selectNode: (id) => set({ selectedNodeId: id, activePanelTab: "info" }),
    deselectNode: () => set({ selectedNodeId: null }),
    setActivePanelTab: (tab) => set({ activePanelTab: tab }),
    toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

    // ── Toasts ────────────────────────────────────────────────────────────────
    toasts: [],
    addToast: (msg, type = "grey") => {
      const id = crypto.randomUUID();
      set((s) => ({ toasts: [...s.toasts.slice(-4), { id, msg, type }] }));
      setTimeout(
        () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        4000,
      );
    },

    // ── Node mutations (structural — trigger dirty) ───────────────────────────
    updateNodeData: (nodeId, field, value) => {
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id !== nodeId
            ? n
            : {
                ...n,
                data: { ...n.data, [field]: value },
              },
        ),
        isDirty: true,
      }));
    },

    deleteNode: (nodeId) => {
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== nodeId),
        edges: s.edges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        ),
        selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
        isDirty: true,
      }));
    },

    toggleSubtask: (nodeId, taskId, addPendingScore) => {
      set((s) => ({
        nodes: s.nodes.map((n) => {
          if (n.id !== nodeId) return n;
          const tasks = (n.data.tasks || []).map((t) => {
            if (t.id !== taskId) return t;
            const done = !t.completed;
            addPendingScore?.(done ? t.points || 10 : -(t.points || 10));
            return { ...t, completed: done };
          });
          return { ...n, data: { ...n.data, tasks } };
        }),
        isDirty: true,
      }));
    },

    collapseNode: (nodeId, collapsed) => {
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id !== nodeId ? n : { ...n, data: { ...n.data, collapsed } },
        ),
        isDirty: true,
      }));
    },

    // ── Explorer modal ────────────────────────────────────────────────────────
    explorerModal: {
      isOpen: false,
      targetNodeId: null,
      defaultTab: "vault_certificate",
      requiredLearnId: null,
    },
    openExplorer: (
      targetNodeId,
      defaultTab = "vault_certificate",
      requiredLearnId = null,
    ) =>
      set({
        explorerModal: {
          isOpen: true,
          targetNodeId,
          defaultTab,
          requiredLearnId,
        },
      }),
    closeExplorer: () =>
      set({
        explorerModal: {
          isOpen: false,
          targetNodeId: null,
          defaultTab: "vault_certificate",
          requiredLearnId: null,
        },
      }),

    // ── Pending score delta ───────────────────────────────────────────────────
    pendingScore: 0,
    addPendingScore: (delta) =>
      set((s) => ({ pendingScore: s.pendingScore + delta })),
    clearPendingScore: () => set({ pendingScore: 0 }),
  })),
);

// ── Selector hooks (prevent unnecessary re-renders via shallow) ───────────────
export const useCanvasNodes = () => useRoadmapStore((s) => s.nodes);
export const useCanvasEdges = () => useRoadmapStore((s) => s.edges);
export const useSelectedNode = () =>
  useRoadmapStore(
    (s) => s.nodes.find((n) => n.id === s.selectedNodeId) || null,
  );
export const usePersistState = () =>
  useRoadmapStore(
    (s) => ({
      isDirty: s.isDirty,
      isSaving: s.isSaving,
      lastSaved: s.lastSaved,
    }),
    shallow,
  );
export const useToasts = () => useRoadmapStore((s) => s.toasts);
export const useExplorerModal = () =>
  useRoadmapStore((s) => s.explorerModal, shallow);
