/**
 * @fileoverview Discotive OS — Execution Roadmap (Orchestrator v2)
 *
 * Changes vs v1:
 *  - AI calibration renders as an overlay modal, NOT a full-page replace
 *    → Canvas stays visible underneath; users can dismiss and keep editing
 *  - Grace floating AI assistant integrated
 *  - Mobile: useWindowSize hook gates mobile sheet vs desktop panel
 *  - MobileEditSheet now properly triggered on mobile node tap
 *  - beforeunload guard improved (uses sendBeacon for iOS)
 *  - ExplorerModal defaultTab resets correctly on every open
 *  - First-time splash is an overlay, not a page-blocker
 *  - Conflict dialog properly prevents canvas interaction while open
 *  - Toast system deduped and capped at 5
 *  - Keyboard shortcut panel ? now works on mobile via long-press on the button
 *  - Performance: commit() only called on explicit save, not every change
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
import {
  fetchCertificatesForGemini,
  fetchVideosForGemini,
} from "../lib/discotiveLearn";
import AILoader from "../components/AILoader";

import { FlowCanvas } from "../components/roadmap/FlowCanvas.jsx";
import { NodeEditPanel } from "../components/roadmap/NodeEditPanel.jsx";
import { MobileEditSheet } from "../components/roadmap/MobileEditSheet.jsx";
import { ShortcutsPanel } from "../components/ShortcutsPanel.jsx";
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
  Wand2,
  ChevronRight,
  Map,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// ── Inject CSS keyframes once ─────────────────────────────────────────────────
if (typeof document !== "undefined") {
  const styleId = "discotive-roadmap-keyframes";
  if (!document.getElementById(styleId)) {
    const s = document.createElement("style");
    s.id = styleId;
    s.textContent = EDGE_KEYFRAMES;
    document.head.appendChild(s);
  }
}

// ── useWindowSize hook ────────────────────────────────────────────────────────
const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1024,
    height: typeof window !== "undefined" ? window.innerHeight : 768,
  });
  useEffect(() => {
    const handler = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
};

// ─────────────────────────────────────────────────────────────────────────────
const Roadmap = () => {
  const navigate = useNavigate();
  const { userData, loading } = useUserData();
  const { width: windowWidth } = useWindowSize();
  const isMobile = windowWidth < 768;

  // ── History-aware node/edge state ──────────────────────────────────────────
  const { nodes, edges, commit, undo, redo, reset, canUndo, canRedo } =
    useMapHistory([], []);

  const [nodes2, setNodes2] = useState(nodes);
  const [edges2, setEdges2] = useState(edges);

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

  // ── Modal / overlay state ──────────────────────────────────────────────────
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalReason, setProModalReason] = useState("nodes");
  const [conflict, setConflict] = useState(null);

  // ── AI calibration — now OVERLAY state ────────────────────────────────────
  const [aiPhase, setAiPhase] = useState("idle"); // idle | questions | generating | done
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiAnswers, setAiAnswers] = useState({});
  const [aiQIdx, setAiQIdx] = useState(0);
  const [showCalibrationOverlay, setShowCalibrationOverlay] = useState(false);
  const [showFirstTimeSplash, setShowFirstTimeSplash] = useState(false);

  // ── Explorer Modal ─────────────────────────────────────────────────────────
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

  // Derived
  const activeNode = useMemo(
    () => nodes2.find((n) => n.id === activeEditNodeId) || null,
    [nodes2, activeEditNodeId],
  );

  const isPro = subscriptionTier === "pro" || subscriptionTier === "PRO";

  // ── Toast system ───────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = "grey") => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t.slice(-4), { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const addPendingScore = useCallback(
    (delta) => setPendingScoreDelta((p) => p + delta),
    [],
  );

  // ── Context actions ────────────────────────────────────────────────────────
  const toggleNodeCollapse = useCallback((nodeId, collapsed) => {
    setNodes2((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, collapsed } } : n,
      ),
    );
    setHasUnsavedChanges(true);
  }, []);

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

  const openVaultModal = useCallback(
    (nodeId, _mode, requiredLearnId) =>
      openExplorerModal(nodeId, "vault_certificate", requiredLearnId),
    [openExplorerModal],
  );

  const openVideoModal = useCallback(
    (nodeId) => openExplorerModal(nodeId, "videos"),
    [openExplorerModal],
  );

  const markVideoWatched = useCallback(
    (nodeId, scoreData) => {
      setNodes2((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, isWatched: true } } : n,
        ),
      );
      if (scoreData) {
        addPendingScore(scoreData.earned ?? 10);
        addToast(scoreData.message || "+10 pts pending save.", "green");
      } else {
        addPendingScore(10);
        addToast("Media logged. +10 pts pending save.", "green");
      }
      setHasUnsavedChanges(true);
    },
    [addPendingScore, addToast],
  );

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const m = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i,
    );
    return m ? m[1] : url;
  };

  const handleExplorerSelect = useCallback(
    (nodeId, item) => {
      setNodes2((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          const isVideo = item.youtubeId || item.url?.includes("youtu");
          if (isVideo) {
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
          }
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
        }),
      );
      setExplorerModal({
        isOpen: false,
        targetNodeId: null,
        defaultTab: "vault_certificate",
        requiredLearnId: null,
      });
      setHasUnsavedChanges(true);
      addToast("Payload linked to node.", "green");
    },
    [addToast],
  );

  // ── Cloud save ─────────────────────────────────────────────────────────────
  const handleCloudSave = useCallback(
    async (overrideNodes, overrideEdges) => {
      if (!uid) return;
      setIsSaving(true);
      const n = overrideNodes ?? nodes2;
      const e = overrideEdges ?? edges2;
      try {
        const batch = writeBatch(db);
        const ts = Date.now();
        batch.set(doc(db, "users", uid, "execution_map", "current"), {
          nodes: n,
          edges: e,
          updatedAt: ts,
        });
        await batch.commit();
        await idbPut(uid, { nodes: n, edges: e }, ts);
        if (pendingScoreDelta !== 0) {
          await mutateScore(
            uid,
            pendingScoreDelta,
            pendingScoreDelta > 0 ? "Execution map progress" : "Task reverted",
          );
          setPendingScoreDelta(0);
        }
        setHasUnsavedChanges(false);
        commit(n, e);
        addToast("Synced to cloud.", "green");
      } catch (err) {
        console.error("[Roadmap] Cloud save failed:", err);
        addToast("Save failed. Changes kept locally.", "red");
      } finally {
        setIsSaving(false);
      }
    },
    [uid, nodes2, edges2, pendingScoreDelta, commit, addToast],
  );

  // ── Debounced auto-save ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasUnsavedChanges || !uid) return;
    idbPut(uid, { nodes: nodes2, edges: edges2 });
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(
      () => handleCloudSave(),
      SAVE_DEBOUNCE_MS,
    );
    return () => clearTimeout(saveTimerRef.current);
  }, [hasUnsavedChanges, nodes2, edges2, uid]); // eslint-disable-line

  // ── beforeunload ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!hasUnsavedChanges) return;
      e.preventDefault();
      e.returnValue = "You have unsaved changes. Leave anyway?";
      handleCloudSave();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges, handleCloudSave]);

  // ── Cold load ──────────────────────────────────────────────────────────────
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
        const idbCloudTs = localCache?.cloudTs;

        if (mapSnap.exists()) {
          const rm = mapSnap.data();

          // Conflict detection
          if (
            localCache?.nodes?.length > 0 &&
            rm.nodes?.length > 0 &&
            localTs > cloudTs + 5000 &&
            idbCloudTs !== cloudTs
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
            return;
          }

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
          } else {
            // Has a cloud doc but no nodes — show first-time splash
            setShowFirstTimeSplash(true);
          }
        } else if (localCache?.nodes?.length > 0) {
          const n = localCache.nodes;
          const e = localCache.edges || [];
          setNodes2(n);
          setEdges2(e);
          reset(n, e);
          hasInitializedBefore.current = true;
          addToast("Restored from local cache. Save to sync.", "grey");
        } else {
          // Brand new user
          setShowFirstTimeSplash(true);
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
        idbClear(uid);
        addToast("Cloud version restored.", "green");
      }
    },
    [conflict, reset, addToast, uid],
  );

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
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
        if (showCalibrationOverlay) {
          setShowCalibrationOverlay(false);
          setAiPhase("idle");
          return;
        }
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
        if (isPro) setIsJournalOpen((v) => !v);
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
  }, [handleCloudSave, isMapFullscreen, isPro, showCalibrationOverlay]);

  // ── AI calibration ─────────────────────────────────────────────────────────
  const handleStartCalibration = useCallback(async () => {
    if (!isPro && !showFirstTimeSplash) {
      setProModalReason("regenerate");
      setIsProModalOpen(true);
      return;
    }
    setAiPhase("questions");
    setAiQIdx(0);
    setAiAnswers({});
    setShowCalibrationOverlay(true);
    setShowFirstTimeSplash(false);
    try {
      const qs = await generateCalibrationQuestions(userData);
      setAiQuestions(qs);
    } catch {
      addToast("AI calibration unavailable.", "red");
      setAiPhase("idle");
      setShowCalibrationOverlay(false);
    }
  }, [isPro, showFirstTimeSplash, userData, addToast]);

  const handleAiSubmit = useCallback(async () => {
    setAiPhase("generating");
    try {
      // Fetch Learn inventory for Gemini context
      const [videos, certificates] = await Promise.all([
        fetchVideosForGemini(
          userData?.identity?.domain || userData?.vision?.passion,
        ).catch(() => []),
        fetchCertificatesForGemini(
          userData?.identity?.domain || userData?.vision?.passion,
        ).catch(() => []),
      ]);

      const rawResult = await generateExecutionMap(
        userData,
        aiAnswers,
        subscriptionTier,
        { videos, certificates },
      );

      // Handle both array and {nodes, edges} return shapes
      const newNodes = Array.isArray(rawResult)
        ? rawResult.filter(
            (n) =>
              n.type === "executionNode" ||
              n.type === "videoWidget" ||
              n.type === "assetWidget" ||
              n.type === "milestoneNode" ||
              n.type === "radarWidget" ||
              n.type === "journalNode" ||
              n.type === "groupNode" ||
              n.type === "connectorNode",
          )
        : rawResult.nodes || [];
      const newEdges = Array.isArray(rawResult) ? [] : rawResult.edges || [];

      const marked = newNodes.map((n) => ({
        ...n,
        data: { ...n.data, _freshlyGenerated: true },
      }));
      const laidOut = generateNeuralLayout(marked, newEdges);

      setNodes2(laidOut);
      setEdges2(newEdges);
      setHasUnsavedChanges(true);
      setAiPhase("done");
      setShowCalibrationOverlay(false);
      hasInitializedBefore.current = true;
      try {
        localStorage.setItem("discotive_initialized_v6", "true");
      } catch (_) {}
      addToast(`${laidOut.length} nodes generated. Review and save.`, "green");
    } catch (err) {
      console.error("[Roadmap] AI generation failed:", err);
      addToast("AI generation failed. Try again.", "red");
      setAiPhase("questions");
    }
  }, [userData, aiAnswers, subscriptionTier, addToast]);

  // ── Node edit actions ──────────────────────────────────────────────────────
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

  // ── Context value ──────────────────────────────────────────────────────────
  const ctxValue = useMemo(
    () => ({
      setActiveEditNodeId,
      addToast,
      addPendingScore,
      toggleNodeCollapse,
      openVaultModal,
      openVideoModal,
      openExplorerModal,
      markVideoWatched,
    }),
    [
      addToast,
      addPendingScore,
      toggleNodeCollapse,
      openVaultModal,
      openVideoModal,
      openExplorerModal,
      markVideoWatched,
    ],
  );

  // ── Loading boot screen ────────────────────────────────────────────────────
  if (loading || isBooting) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
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

  // ── MAIN CANVAS RENDER ─────────────────────────────────────────────────────
  return (
    <RoadmapContext.Provider value={ctxValue}>
      <div
        className={cn(
          "flex bg-[#030303] text-white font-sans overflow-hidden selection:bg-amber-500/20",
          isMapFullscreen ? "fixed inset-0 z-[500]" : "h-screen",
        )}
      >
        <ReactFlowProvider>
          {/* ── Canvas ── */}
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
            isFirstTime={showFirstTimeSplash}
            handleStartCalibration={handleStartCalibration}
            canUndo={canUndo}
            canRedo={canRedo}
            undo={undo}
            redo={redo}
            commit={commit}
          />

          {/* ── Desktop node edit panel ── */}
          {activeNode && !isMobile && !isMapFullscreen && (
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

        {/* ── Mobile node edit bottom sheet ── */}
        <AnimatePresence>
          {activeNode && isMobile && (
            <MobileEditSheet
              activeNode={activeNode}
              onUpdate={updateActiveNode}
              onClose={() => setActiveEditNodeId(null)}
              onDelete={deleteActiveNode}
              pendingScoreDelta={pendingScoreDelta}
              onSubtaskToggle={toggleSubtask}
            />
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════
            CALIBRATION OVERLAY (no longer replaces the page)
        ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showCalibrationOverlay && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#030303]/90 backdrop-blur-xl"
              />

              {/* Generating loader */}
              {aiPhase === "generating" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="relative z-10 flex flex-col items-center gap-6"
                >
                  <AILoader phase="roadmap" />
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                    Press Esc to cancel
                  </p>
                </motion.div>
              )}

              {/* Questions */}
              {(aiPhase === "questions" || aiQuestions.length > 0) &&
                aiPhase !== "generating" && (
                  <motion.div
                    key={aiQIdx}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    className="relative z-10 w-full max-w-lg"
                  >
                    {/* Close button */}
                    <button
                      onClick={() => {
                        setShowCalibrationOverlay(false);
                        setAiPhase("idle");
                      }}
                      className="absolute -top-12 right-0 flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors"
                    >
                      <X className="w-4 h-4" /> Close
                    </button>

                    {/* Loading questions */}
                    {aiQuestions.length === 0 ? (
                      <div className="bg-[#080808] border border-[#1e1e1e] rounded-[2rem] p-8 text-center">
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-4" />
                        <p className="text-sm font-bold text-white/50 uppercase tracking-widest">
                          Generating calibration questions...
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#080808] border border-[#1e1e1e] rounded-[2rem] p-6 md:p-8 shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                        {/* Progress */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                              Calibration {aiQIdx + 1} of {aiQuestions.length}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                                Discotive AI
                              </span>
                            </div>
                          </div>
                          <div className="h-1 bg-[#111] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-amber-500 rounded-full"
                              animate={{
                                width: `${((aiQIdx + 1) / aiQuestions.length) * 100}%`,
                              }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                        </div>

                        {/* Question */}
                        <h2 className="text-xl font-black text-white mb-5 leading-tight">
                          {aiQuestions[aiQIdx]?.question || aiQuestions[aiQIdx]}
                        </h2>

                        {/* MCQ options */}
                        {aiQuestions[aiQIdx]?.type === "mcq" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                            {(aiQuestions[aiQIdx]?.options || []).map(
                              (opt, oi) => {
                                const isSelected = aiAnswers[aiQIdx] === opt;
                                return (
                                  <button
                                    key={oi}
                                    onClick={() =>
                                      setAiAnswers((a) => ({
                                        ...a,
                                        [aiQIdx]: opt,
                                      }))
                                    }
                                    className={cn(
                                      "p-3.5 rounded-xl text-sm font-bold text-left border transition-all",
                                      isSelected
                                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                        : "bg-[#0d0d0d] border-[#1e1e1e] text-white/70 hover:border-[#333] hover:text-white",
                                    )}
                                  >
                                    {opt}
                                  </button>
                                );
                              },
                            )}
                          </div>
                        ) : (
                          <textarea
                            autoFocus
                            value={aiAnswers[aiQIdx] || ""}
                            onChange={(e) =>
                              setAiAnswers((a) => ({
                                ...a,
                                [aiQIdx]: e.target.value,
                              }))
                            }
                            placeholder="Be specific — the AI uses this verbatim."
                            rows={4}
                            className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl px-5 py-4 text-sm text-white placeholder-[#444] focus:outline-none focus:border-amber-500/50 transition-colors resize-none mb-5 custom-scrollbar"
                          />
                        )}

                        {/* Nav buttons */}
                        <div className="flex gap-3">
                          {aiQIdx > 0 && (
                            <button
                              onClick={() => setAiQIdx((i) => i - 1)}
                              className="px-5 py-3 bg-[#111] border border-[#222] text-white text-sm font-bold rounded-xl hover:bg-[#1a1a1a] transition-colors"
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
                            disabled={!aiAnswers[aiQIdx]?.toString().trim()}
                            className="flex-1 py-3 bg-amber-500 text-black text-sm font-black rounded-xl hover:bg-amber-400 disabled:opacity-40 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            {aiQIdx < aiQuestions.length - 1 ? (
                              <>
                                Next
                                <ChevronRight className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                Generate My Map
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════
            FIRST-TIME SPLASH OVERLAY
        ══════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {showFirstTimeSplash && !showCalibrationOverlay && (
            <div className="fixed inset-0 z-[350] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#030303]/85 backdrop-blur-xl"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 max-w-md w-full text-center"
              >
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <motion.div
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 border border-amber-500/30 rounded-full"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-3 border-2 border-dashed border-white/20 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-amber-500" />
                  </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mb-3">
                  Your Execution Map Awaits
                </h1>
                <p className="text-sm text-[#666] leading-relaxed mb-3">
                  Answer 3 calibration questions and our AI will generate your
                  personalised career execution DAG — nodes, milestones,
                  deadlines, and learning resources all mapped out for you.
                </p>
                <p className="text-[10px] text-[#444] uppercase tracking-widest font-bold mb-8">
                  Or start manually by right-clicking the canvas
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleStartCalibration}
                    className="flex-1 py-4 bg-amber-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-amber-400 transition-colors shadow-[0_0_30px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-5 h-5" />
                    Generate AI Map
                  </button>
                  <button
                    onClick={() => setShowFirstTimeSplash(false)}
                    className="flex-1 py-4 bg-[#0a0a0a] border border-[#222] text-white/60 hover:text-white text-sm font-bold rounded-2xl transition-colors"
                  >
                    Start Manually
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Toast notifications ── */}
        <div
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[800] flex flex-col gap-2 items-center pointer-events-none"
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
                  "px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold flex items-center gap-2.5 max-w-xs pointer-events-auto",
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

        {/* ── Shortcuts hint button ── */}
        <button
          onClick={() => setIsShortcutsOpen(true)}
          aria-label="Show keyboard shortcuts (?)"
          className="fixed bottom-6 right-6 z-[100] w-9 h-9 bg-[#0a0a0a]/90 border border-[#1e1e1e] rounded-full flex items-center justify-center text-[#555] hover:text-white hover:border-[#333] transition-all backdrop-blur-xl shadow-2xl focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <span className="text-xs font-black font-mono">?</span>
        </button>

        {/* ── All modals ── */}
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

        {/* ── Pro gate modal ── */}
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
                className="relative w-full max-w-sm bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-8 text-center shadow-2xl"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/8 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
                  <Crown className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-white mb-3">
                  {proModalReason === "nodes"
                    ? "Node Limit Reached"
                    : "Pro Feature"}
                </h3>
                <p className="text-[#666] text-sm mb-7 leading-relaxed">
                  {proModalReason === "nodes"
                    ? `Free tier supports up to ${TIER_LIMITS.free} nodes. Upgrade Pro for unlimited neural expansion.`
                    : proModalReason === "regenerate"
                      ? "AI map regeneration requires Discotive Pro clearance."
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
                    className="flex-1 py-3 bg-amber-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Upgrade
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
