/**
 * @fileoverview Discotive OS — Execution Roadmap (Orchestrator)
 * @module Pages/Roadmap
 *
 * This file is intentionally thin. It owns:
 * - Top-level state (nodes, edges, persistence, AI phase)
 * - Firebase load/save with IDB fallback and conflict detection
 * - beforeunload guard (prevents silent data loss on tab close)
 * - RoadmapContext.Provider wiring
 * - Toast system
 * - Keyboard shortcuts that affect the full page (Ctrl+S, Escape, F, J, ?)
 *
 * All rendering is delegated to FlowCanvas, NodeEditPanel, and modal components.
 *
 * File count at ~300 lines. This is intentional.
 * Prior monolith was 6,021 lines — see /docs/roadmap-refactor.md for history.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db, auth } from "../firebase";

import { useUserData } from "../hooks/useUserData";
import { useMapHistory } from "../lib/roadmap/useMapHistory.js";
import { idbPut, idbGet, idbClear } from "../lib/roadmap/idb.js";
import { generateNeuralLayout } from "../lib/roadmap/layout.js";
import { sanitize } from "../lib/roadmap/sanitize.js";
import {
  SAVE_DEBOUNCE_MS,
  TIER_LIMITS,
  EDGE_KEYFRAMES,
} from "../lib/roadmap/constants.js";
import { RoadmapContext } from "../contexts/RoadmapContext.jsx";
import { mutateScore } from "../lib/scoreEngine";
import {
  generateCalibrationQuestions,
  generateExecutionMap,
} from "../lib/gemini";
import AILoader from "../components/AILoader";

import { FlowCanvas } from "../components/roadmap/FlowCanvas.jsx";
import { NodeEditPanel } from "../components/roadmap/NodeEditPanel.jsx";
import { MobileEditSheet } from "../components/roadmap/MobileEditSheet.jsx";
import { ShortcutsPanel } from "../components/roadmap/ShortcutsPanel.jsx";
import { ConflictDialog } from "../components/roadmap/ConflictDialog.jsx";
import { JournalModal } from "../components/roadmap/JournalModal.jsx";
import { ExplorerModal } from "../components/roadmap/ExplorerModal.jsx";

import {
  Activity,
  Crown,
  Lock,
  ArrowRight,
  X,
  Check,
  AlertTriangle,
  Zap,
  Keyboard,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// ── Inject CSS keyframes for edge animations (once, in <head>) ───────────────
if (typeof document !== "undefined") {
  const styleId = "discotive-roadmap-keyframes";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = EDGE_KEYFRAMES;
    document.head.appendChild(s);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
const Roadmap = () => {
  const navigate = useNavigate();
  const { userData, loading } = useUserData();

  // ── History-aware node/edge state ──────────────────────────────────────────
  const { nodes, edges, commit, undo, redo, reset, canUndo, canRedo } =
    useMapHistory([], []);

  const [nodes2, setNodes2] = useState(nodes); // local optimistic copy for ReactFlow
  const [edges2, setEdges2] = useState(edges);

  // Sync history → local state after undo/redo
  useEffect(() => {
    setNodes2(nodes);
    setEdges2(edges);
  }, [nodes, edges]);

  // ── Page state ─────────────────────────────────────────────────────────────
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [isBooting, setIsBooting] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeEditNodeId, setActiveEditNodeId] = useState(null);
  const [pendingScoreDelta, setPendingScoreDelta] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [systemLedger, setSystemLedger] = useState([]);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalReason, setProModalReason] = useState("nodes");

  // ── Conflict dialog ────────────────────────────────────────────────────────
  const [conflict, setConflict] = useState(null); // { localNodes, cloudNodes, localTs, cloudTs, idbData }

  // ── AI calibration phase ───────────────────────────────────────────────────
  const [aiPhase, setAiPhase] = useState("idle"); // idle | questions | generating | done
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiAnswers, setAiAnswers] = useState({});
  const [aiQIdx, setAiQIdx] = useState(0);

  // ── Unified Explorer Modal State ───────────────────────────────────────────
  const [explorerModal, setExplorerModal] = useState({
    isOpen: false,
    targetNodeId: null,
    defaultTab: "vault_certificate",
    requiredLearnId: null,
  });

  const saveTimerRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const uid = auth?.currentUser?.uid || userData?.uid || userData?.id;

  const hasInitializedBefore = useRef(
    typeof localStorage !== "undefined" &&
      localStorage.getItem("discotive_initialized_v6") === "true",
  );

  const isFirstTime =
    !hasInitializedBefore.current && nodes2.length === 0 && !isBooting;
  const showInitProtocol = isFirstTime && aiPhase === "idle";
  const canRegenerate =
    subscriptionTier === "pro" &&
    (Date.now() - new Date(userData?.telemetry?.lastRoadmapGen || 0)) /
      86400000 >=
      14;

  // ── Toast system ───────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = "grey") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const addLedgerEntry = useCallback((action) => {
    const entry = {
      id: crypto.randomUUID(),
      action,
      time: new Date().toISOString(),
    };
    setSystemLedger((prev) => {
      const updated = [entry, ...prev].slice(0, 80);
      try {
        localStorage.setItem("discotive_ledger_v6", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  const addPendingScore = useCallback((delta) => {
    setPendingScoreDelta((p) => p + delta);
  }, []);

  // ── Context actions (replacing all window events) ─────────────────────────
  const toggleNodeCollapse = useCallback((nodeId, collapsed) => {
    setNodes2((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, collapsed } } : n,
      ),
    );
    setHasUnsavedChanges(true);
  }, []);

  // New Unified Modal Accessor
  const openExplorerModal = useCallback(
    (nodeId, defaultTab = "vault_certificate", requiredLearnId = null) => {
      setExplorerModal({
        isOpen: true,
        targetNodeId: nodeId,
        defaultTab,
        requiredLearnId,
      });
    },
    [],
  );

  // Legacy mappings for backwards compatibility if some nodes haven't been updated yet
  const openVaultModal = useCallback(
    (nodeId, mode, requiredLearnId) => {
      openExplorerModal(nodeId, "vault_certificate", requiredLearnId);
    },
    [openExplorerModal],
  );

  const openVideoModal = useCallback(
    (nodeId) => {
      openExplorerModal(nodeId, "videos");
    },
    [openExplorerModal],
  );

  const markVideoWatched = useCallback(
    (nodeId, scoreData) => {
      setNodes2((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, isWatched: true } } : n,
        ),
      );

      // Proportional score logic execution
      if (scoreData) {
        addPendingScore(scoreData.earned);
        addToast(scoreData.message, "green");
      } else {
        // Fallback for legacy calls
        addPendingScore(10);
        addToast("Media logged. +10 pts pending save.", "green");
      }

      setHasUnsavedChanges(true);
    },
    [addPendingScore, addToast],
  );

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i,
    );
    return match ? match[1] : url; // Extracts ID, or falls back to string if it's already an ID
  };

  // Unified sync handler for both videos and assets
  const handleExplorerSelect = useCallback(
    (nodeId, item) => {
      setNodes2((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;

          // Differentiate between Vault Asset and Video Media
          if (item.youtubeId || item.url?.includes("youtu")) {
            // It's a Video
            return {
              ...n,
              data: {
                ...n.data,
                youtubeId: extractYouTubeId(item.url || item.youtubeId),
                title: item.title,
                learnId: item.learnId || item.discotiveLearnId,
                platform: "YouTube",
              },
            };
          } else {
            // It's a Vault Asset
            return {
              ...n,
              data: {
                ...n.data,
                assetId: item.id,
                assetTitle: item.title,
                learnId: item.discotiveLearnId,
                status: item.status,
                url: item.url,
              },
            };
          }
        }),
      );

      setExplorerModal({
        isOpen: false,
        targetNodeId: null,
        defaultTab: "vault_certificate",
        requiredLearnId: null,
      });
      setHasUnsavedChanges(true);
      addToast("Payload successfully linked to execution node.", "green");
    },
    [addToast],
  );

  // ── Firestore cloud save ──────────────────────────────────────────────────

  const handleCloudSave = useCallback(
    async (overrideNodes, overrideEdges) => {
      if (!uid) return;
      setIsSaving(true);
      const n = overrideNodes ?? nodes2;
      const e = overrideEdges ?? edges2;
      try {
        const batch = writeBatch(db);
        const mapRef = doc(db, "users", uid, "execution_map", "current");
        const ts = Date.now();
        batch.set(mapRef, { nodes: n, edges: e, updatedAt: ts });
        await batch.commit();

        // Update IDB with cloud timestamp so conflict logic works correctly
        await idbPut(uid, { nodes: n, edges: e }, ts);

        // Flush pending score delta
        if (pendingScoreDelta !== 0 && uid) {
          await mutateScore(
            uid,
            pendingScoreDelta,
            pendingScoreDelta > 0 ? "Execution map progress" : "Task unchecked",
          );
          setPendingScoreDelta(0);
        }

        setHasUnsavedChanges(false);
        commit(n, e);
        addLedgerEntry("Map saved to cloud.");
        addToast("Synced to cloud.", "green");
      } catch (err) {
        console.error("[Roadmap] Cloud save failed:", err);
        addToast("Save failed. Changes kept locally.", "red");
      } finally {
        setIsSaving(false);
      }
    },
    [uid, nodes2, edges2, pendingScoreDelta, commit, addLedgerEntry, addToast],
  );

  // ── Debounced auto-save ───────────────────────────────────────────────────
  useEffect(() => {
    if (!hasUnsavedChanges || !uid) return;
    // IDB save is always immediate — cheap and local
    idbPut(uid, { nodes: nodes2, edges: edges2 });
    // Cloud save is debounced
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(
      () => handleCloudSave(),
      SAVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(saveTimerRef.current);
  }, [hasUnsavedChanges, nodes2, edges2, uid]); // eslint-disable-line

  // ── beforeunload guard — CRITICAL FIX (original had none) ─────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Leave anyway?";
      // Best-effort synchronous save via sendBeacon (no await possible in beforeunload)
      if (uid && navigator.sendBeacon) {
        // sendBeacon can only POST; Firestore REST would need auth.
        // The IDB is already updated synchronously in the debounce above,
        // so data is safe locally. We trigger an async cloud save and hope
        // it completes before the tab closes — this is the best possible outcome.
        handleCloudSave();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, uid, handleCloudSave]);

  // ── Cold load: Firestore primary, IDB fallback, conflict detection ─────────
  useEffect(() => {
    const fetchData = async () => {
      if (!uid || hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      setIsBooting(true);
      try {
        const [mapSnap, subSnap] = await Promise.all([
          getDoc(doc(db, "users", uid, "execution_map", "current")),
          getDoc(doc(db, "users", uid, "subscription", "current")),
        ]);

        if (subSnap.exists()) {
          setSubscriptionTier((subSnap.data().tier || "free").toLowerCase());
        } else if (userData?.tier) {
          setSubscriptionTier(userData.tier.toLowerCase());
        }

        const localCache = await idbGet(uid);
        const cloudTs = mapSnap.exists() ? mapSnap.data().updatedAt || 0 : 0;
        const localTs = localCache?.localTs || 0;

        // Read the cloud timestamp that the local cache is aware of
        const idbCloudTs = localCache?.cloudTs;

        if (mapSnap.exists()) {
          const rm = mapSnap.data();

          // CONFLICT CHECK: local IDB is newer than last cloud save
          // (only if both have meaningful data)
          if (
            localCache?.nodes?.length > 0 &&
            rm.nodes?.length > 0 &&
            localTs > cloudTs + 5000 &&
            idbCloudTs !== cloudTs // <-- THE MAGIC BULLET
          ) {
            setConflict({
              cloudNodes: rm.nodes.length,
              localNodes: localCache.nodes.length,
              cloudTs,
              localTs,
              idbData: localCache,
              cloudData: { nodes: rm.nodes || [], edges: rm.edges || [] },
            });
            setIsBooting(false);
            return; // wait for user choice
          }

          // Cloud wins (no conflict)
          const n = rm.nodes || [];
          const e = rm.edges || [];
          setNodes2(n);
          setEdges2(e);
          reset(n, e);
          idbPut(uid, { nodes: n, edges: e }, cloudTs);
          if (n.length > 0) {
            hasInitializedBefore.current = true;
            try {
              localStorage.setItem("discotive_initialized_v6", "true");
            } catch (_) {}
          }
        } else if (localCache?.nodes?.length > 0) {
          // No cloud doc — restore from IDB
          const n = localCache.nodes;
          const e = localCache.edges || [];
          setNodes2(n);
          setEdges2(e);
          reset(n, e);
          hasInitializedBefore.current = true;
          addToast("Restored from local cache. Save to sync.", "grey");
        }
      } catch (err) {
        console.error("[Roadmap] Cold load failed:", err);
        addToast("Load failed. Working offline.", "red");
      } finally {
        setIsBooting(false);
      }
    };
    if (!loading) fetchData();
  }, [uid, loading]); // eslint-disable-line

  // ── Conflict resolution ────────────────────────────────────────────────────
  const resolveConflict = useCallback(
    (useCloud) => {
      const data = useCloud ? conflict.cloudData : conflict.idbData;
      const n = data.nodes || [];
      const e = data.edges || [];
      setNodes2(n);
      setEdges2(e);
      reset(n, e);
      setConflict(null);
      if (!useCloud) {
        setHasUnsavedChanges(true);
        addToast("Local version loaded. Save when ready.", "grey");
      } else {
        // MAANG FIX: Completely nuke the stale cache so it stops fighting the cloud.
        idbClear(uid);
        addToast("Cloud version restored.", "green");
      }
    },
    [conflict, reset, addToast, uid],
  );

  // ── Global keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return (
        ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
        document.activeElement?.contentEditable === "true"
      );
    };
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleCloudSave();
        return;
      }
      if (e.key === "Escape") {
        if (isMapFullscreen) {
          setIsMapFullscreen(false);
          return;
        }
        setActiveEditNodeId(null);
        return;
      }
      if (isTyping()) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsMapFullscreen((v) => !v);
        return;
      }
      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (subscriptionTier !== "free") setIsJournalOpen((v) => !v);
        else {
          setProModalReason("journal");
          setIsProModalOpen(true);
        }
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setIsShortcutsOpen((v) => !v);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCloudSave, isMapFullscreen, subscriptionTier]);

  // ── AI calibration ────────────────────────────────────────────────────────
  const handleStartCalibration = useCallback(async () => {
    if (subscriptionTier === "free" && !isFirstTime && !canRegenerate) {
      setProModalReason("regenerate");
      setIsProModalOpen(true);
      return;
    }
    setAiPhase("questions");
    try {
      const qs = await generateCalibrationQuestions(userData);
      setAiQuestions(qs);
    } catch {
      addToast("AI calibration unavailable.", "red");
      setAiPhase("idle");
    }
  }, [subscriptionTier, isFirstTime, canRegenerate, userData, addToast]);

  const handleAiSubmit = useCallback(async () => {
    setAiPhase("generating");
    try {
      const { nodes: newNodes, edges: newEdges } = await generateExecutionMap(
        userData,
        aiAnswers,
      );
      const laidOut = generateNeuralLayout(
        newNodes.map((n) => ({
          ...n,
          data: { ...n.data, _freshlyGenerated: true },
        })),
        newEdges,
      );
      setNodes2(laidOut);
      setEdges2(newEdges);
      setHasUnsavedChanges(true);
      setAiPhase("done");
      hasInitializedBefore.current = true;
      try {
        localStorage.setItem("discotive_initialized_v6", "true");
      } catch (_) {}
      addToast("Execution map generated. Review and save.", "green");
    } catch (err) {
      console.error("[Roadmap] AI generation failed:", err);
      addToast("AI generation failed. Try again.", "red");
      setAiPhase("idle");
    }
  }, [userData, aiAnswers, addToast]);

  // ── Node edit actions ─────────────────────────────────────────────────────
  const activeNode = nodes2.find((n) => n.id === activeEditNodeId) || null;

  const updateActiveNode = useCallback(
    (field, value) => {
      if (!activeEditNodeId) return;
      setNodes2((nds) =>
        nds.map((n) =>
          n.id === activeEditNodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  [field]: typeof value === "string" ? sanitize(value) : value,
                },
              }
            : n,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [activeEditNodeId],
  );

  const deleteActiveNode = useCallback(() => {
    if (!activeEditNodeId) return;
    setNodes2((nds) => nds.filter((n) => n.id !== activeEditNodeId));
    setEdges2((eds) =>
      eds.filter(
        (e) => e.source !== activeEditNodeId && e.target !== activeEditNodeId,
      ),
    );
    setActiveEditNodeId(null);
    setHasUnsavedChanges(true);
    addToast("Protocol removed.", "red");
  }, [activeEditNodeId, addToast]);

  const toggleSubtask = useCallback(
    (taskId) => {
      if (!activeEditNodeId) return;
      setNodes2((nds) =>
        nds.map((n) => {
          if (n.id !== activeEditNodeId) return n;
          const tasks = (n.data.tasks || []).map((t) => {
            if (t.id !== taskId) return t;
            const done = !t.completed;
            addPendingScore(done ? t.points || 10 : -(t.points || 10));
            return { ...t, completed: done };
          });
          return { ...n, data: { ...n.data, tasks } };
        }),
      );
      setHasUnsavedChanges(true);
    },
    [activeEditNodeId, addPendingScore],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Context value
  // ─────────────────────────────────────────────────────────────────────────
  const ctxValue = {
    setActiveEditNodeId,
    addToast,
    addPendingScore,
    toggleNodeCollapse,
    openVaultModal,
    openVideoModal,
    openExplorerModal, // <-- INJECTED INTO CONTEXT
    markVideoWatched,
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading || isBooting) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.4, 1, 0.4] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.12,
                }}
                className="w-1 h-8 bg-amber-500 rounded-full origin-bottom"
              />
            ))}
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.25em] font-bold">
            Loading execution map
          </p>
        </div>
      </div>
    );
  }

  // ── AI generation screen ──────────────────────────────────────────────────
  if (aiPhase === "generating") {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <AILoader message="Synthesising your execution trajectory…" />
      </div>
    );
  }

  // ── First-time splash ─────────────────────────────────────────────────────
  if (showInitProtocol && aiPhase === "idle") {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-3">
            Initialise Execution Map
          </h1>
          <p className="text-sm text-[#666] leading-relaxed mb-8">
            Your AI-powered career DAG is ready to be synthesised. Answer a few
            calibration questions and we'll generate your personalised execution
            trajectory.
          </p>
          <button
            onClick={handleStartCalibration}
            className="w-full py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-colors shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" /> Begin Calibration
          </button>
        </motion.div>
      </div>
    );
  }

  // ── AI calibration questions ──────────────────────────────────────────────
  if (aiPhase === "questions" && aiQuestions.length > 0) {
    const q = aiQuestions[aiQIdx];
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-6">
        <motion.div
          key={aiQIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-lg w-full"
        >
          <div className="mb-6">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-2">
              {aiQIdx + 1} of {aiQuestions.length}
            </p>
            <div className="h-1 bg-[#111] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                animate={{
                  width: `${((aiQIdx + 1) / aiQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <h2 className="text-xl font-black text-white mb-6">
            {q?.question || q}
          </h2>
          <textarea
            autoFocus
            value={aiAnswers[aiQIdx] || ""}
            onChange={(e) =>
              setAiAnswers((a) => ({ ...a, [aiQIdx]: e.target.value }))
            }
            placeholder="Be specific. The AI uses this verbatim."
            rows={4}
            className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors resize-none placeholder:text-[#444] mb-5"
          />
          <div className="flex gap-3">
            {aiQIdx > 0 && (
              <button
                onClick={() => setAiQIdx((i) => i - 1)}
                className="flex-1 py-3 bg-[#0a0a0a] border border-[#1e1e1e] text-white text-sm font-bold rounded-xl hover:bg-[#111] transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() =>
                aiQIdx < aiQuestions.length - 1
                  ? setAiQIdx((i) => i + 1)
                  : handleAiSubmit()
              }
              disabled={!aiAnswers[aiQIdx]?.trim()}
              className="flex-1 py-3 bg-amber-500 text-black text-sm font-black rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-colors uppercase tracking-widest"
            >
              {aiQIdx < aiQuestions.length - 1 ? "Next" : "Generate Map"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── MAIN CANVAS ───────────────────────────────────────────────────────────
  return (
    <RoadmapContext.Provider value={ctxValue}>
      <div
        className={cn(
          "flex bg-[#030303] text-white font-sans overflow-hidden selection:bg-amber-500/20",
          isMapFullscreen ? "fixed inset-0 z-[500]" : "h-screen",
        )}
      >
        {/* ReactFlow provider */}
        <ReactFlowProvider>
          {/* Canvas */}
          <FlowCanvas
            nodes={nodes2}
            edges={edges2}
            setNodes={setNodes2}
            setEdges={setEdges2}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            isSaving={isSaving}
            handleCloudSave={handleCloudSave}
            isMapFullscreen={isMapFullscreen}
            setIsMapFullscreen={setIsMapFullscreen}
            subscriptionTier={subscriptionTier}
            totalNodesCount={
              nodes2.filter((n) => n.type === "executionNode").length
            }
            onLimitReached={() => {
              setProModalReason("nodes");
              setIsProModalOpen(true);
            }}
            isFirstTime={isFirstTime}
            handleStartCalibration={handleStartCalibration}
            canUndo={canUndo}
            canRedo={canRedo}
            undo={undo}
            redo={redo}
            commit={commit}
          />

          {/* Node edit panel (desktop sidebar) */}
          {activeNode && !isMapFullscreen && (
            <NodeEditPanel
              node={activeNode}
              onUpdate={updateActiveNode}
              onDelete={deleteActiveNode}
              onSubtaskToggle={toggleSubtask}
              pendingScoreDelta={pendingScoreDelta}
              addToast={addToast}
              userData={userData}
              subscriptionTier={subscriptionTier}
            />
          )}
        </ReactFlowProvider>

        {/* Toasts */}
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[800] flex flex-col gap-2 items-center pointer-events-none"
          aria-live="polite"
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                className={cn(
                  "px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold flex items-center gap-2.5 max-w-xs",
                  t.type === "green"
                    ? "bg-emerald-900/80 border-emerald-500/30 text-emerald-300"
                    : t.type === "red"
                      ? "bg-rose-900/80 border-rose-500/30 text-rose-300"
                      : "bg-[#111]/90 border-white/10 text-white/80",
                )}
              >
                {t.type === "green" ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : t.type === "red" ? (
                  <X className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Keyboard shortcuts hint */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          aria-label="Show keyboard shortcuts (?)"
          className="fixed bottom-6 right-6 z-[100] w-9 h-9 bg-[#0a0a0a]/90 border border-[#1e1e1e] rounded-full flex items-center justify-center text-[#555] hover:text-white hover:border-[#333] transition-all backdrop-blur-xl shadow-2xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <span className="text-xs font-black font-mono">?</span>
        </button>

        {/* Modals */}
        <ShortcutsPanel
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <ConflictDialog
          isOpen={!!conflict}
          conflict={conflict}
          onUseCloud={() => resolveConflict(true)}
          onUseLocal={() => resolveConflict(false)}
        />

        {isJournalOpen && (
          <JournalModal
            userId={uid}
            onClose={() => setIsJournalOpen(false)}
            addToast={addToast}
          />
        )}

        {/* Unified Explorer Modal */}
        <ExplorerModal
          isOpen={explorerModal.isOpen}
          onClose={() =>
            setExplorerModal({
              isOpen: false,
              targetNodeId: null,
              defaultTab: "vault_certificate",
              requiredLearnId: null,
            })
          }
          onSelect={(item) =>
            handleExplorerSelect(explorerModal.targetNodeId, item)
          }
          defaultTab={explorerModal.defaultTab}
          requiredLearnId={explorerModal.requiredLearnId}
          vault={userData?.vault || []}
        />

        {/* Pro gate modal */}
        <AnimatePresence>
          {isProModalOpen && (
            <div
              className="fixed inset-0 z-[500] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Pro feature required"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsProModalOpen(false)}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 20 }}
                className="relative w-full max-w-md bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-8 text-center shadow-2xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-500/8 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
                  <Lock className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-3">
                  Protocol Locked
                </h3>
                <p className="text-[#666] text-sm mb-7 leading-relaxed">
                  {proModalReason === "nodes"
                    ? `Free tier supports up to ${TIER_LIMITS.free} nodes. Upgrade for unlimited neural expansion.`
                    : proModalReason === "regenerate"
                      ? "Neural regeneration requires Discotive Pro clearance."
                      : "This feature requires an active Discotive Pro subscription."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsProModalOpen(false)}
                    className="flex-1 py-3 bg-[#0d0d0d] border border-[#1e1e1e] text-white text-xs font-bold rounded-xl hover:bg-[#111] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => navigate("/premium")}
                    className="flex-1 py-3 bg-amber-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_25px_rgba(245,158,11,0.25)]"
                  >
                    Upgrade OS
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </RoadmapContext.Provider>
  );
};

export default Roadmap;
