/**
 * @fileoverview FlowCanvas.jsx — Agentic Execution Canvas v3
 * @description
 * The visual layer of the Discotive Agentic Execution Environment.
 * This is NOT a flowchart editor. This is a live state machine visualizer
 * where every node has a computed execution state driven by AgenticExecutionEngine.
 *
 * Features:
 * - Dagre auto-layout (LR topology) with dynamic re-layout on graph changes
 * - Sprint Phase topology grouping (visual clusters per week)
 * - Animated particle edges (data flowing through live connections)
 * - Node state-driven visual language (locked/active/verifying/verified)
 * - Mobile: bottom sheet node interaction (full feature parity)
 * - PC: keyboard shortcuts + side panel + context menus
 * - Real-time state updates from AgenticExecutionEngine via context
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
  Suspense,
  lazy,
} from "react";
import ReactFlow, {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  Panel,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Maximize,
  Minimize,
  Target,
  Map as MapIcon,
  Cloud,
  CloudOff,
  RefreshCw,
  Wand2,
  Plus,
  Search,
  X,
  Trash2,
  Copy,
  Network,
  Zap,
  Lock,
  Layers,
  CheckCircle,
  Video,
  Database,
  GitBranch,
  Cpu,
  BookOpen,
  LayoutGrid,
  Radio,
  Activity,
  SlidersHorizontal,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  AlignLeft,
  Share2,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { cn } from "../../lib/cn";
import { getLayoutedElements } from "../../lib/roadmap/layout.js";
import { useAgenticEngine } from "../../contexts/AgenticExecutionEngine.jsx";
import { NODE_STATES } from "../../contexts/AgenticExecutionEngine.jsx";
import {
  NODE_ACCENT_PALETTE,
  TIER_LIMITS,
} from "../../lib/roadmap/constants.js";

// Node type imports
import { ExecutionNode } from "./nodes/ExecutionNode.jsx";
import { NeuralEdge, edgeTypes } from "./CustomEdges.jsx";
import { TopologyStats } from "./TopologyStats.jsx";
import { LogicGateNode } from "./nodes/LogicGateNode.jsx";
import { AppConnectorNode } from "./nodes/AppConnectorNode.jsx";
import { VaultVerificationNode } from "./nodes/VaultVerificationNode.jsx";
import { MilestoneNode } from "./nodes/MilestoneNode.jsx";
import { VideoWidgetNode } from "./nodes/VideoWidgetNode.jsx";
import { JournalNode } from "./nodes/JournalNode.jsx";
import { GroupNode } from "./nodes/GroupNode.jsx";
import { ComputeNode } from "./nodes/ComputeNode.jsx";

// Lazy mobile sheet
const MobileNodeSheet = lazy(() => import("./MobileNodeSheet.jsx"));

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD = "#BFA264";
const GOLD_BRIGHT = "#D4AF78";
const GOLD_DIM = "rgba(191,162,100,0.12)";
const GOLD_BORDER = "rgba(191,162,100,0.25)";
const VOID = "#030303";
const SURFACE = "#0a0a0a";
const ELEVATED = "#111111";

// ─── Node type registry ───────────────────────────────────────────────────────
const nodeTypes = {
  executionNode: ExecutionNode,
  milestoneNode: MilestoneNode,
  logicGate: LogicGateNode,
  connectorNode: AppConnectorNode,
  assetWidget: VaultVerificationNode,
  videoWidget: VideoWidgetNode,
  journalNode: JournalNode,
  groupNode: GroupNode,
  computeNode: ComputeNode,
};

// ─── Node palette for context menu ───────────────────────────────────────────
const NODE_PALETTE = [
  { type: "executionNode", label: "Execution Node", icon: Zap, color: GOLD },
  {
    type: "milestoneNode",
    label: "Milestone Gate",
    icon: CheckCircle,
    color: "#10b981",
  },
  {
    type: "logicGate",
    label: "Logic Gate (AND/OR)",
    icon: GitBranch,
    color: "#38bdf8",
  },
  {
    type: "connectorNode",
    label: "App Connector",
    icon: Radio,
    color: "#10b981",
  },
  {
    type: "assetWidget",
    label: "Vault Verification",
    icon: Database,
    color: GOLD,
  },
  { type: "videoWidget", label: "Video Node", icon: Video, color: "#38bdf8" },
  {
    type: "journalNode",
    label: "Journal Gate",
    icon: BookOpen,
    color: "#8b5cf6",
  },
  {
    type: "computeNode",
    label: "AI Compute Gate",
    icon: Cpu,
    color: "#8b5cf6",
  },
  { type: "groupNode", label: "Sprint Frame", icon: Layers, color: "#555" },
];

// ─── Sprint phase colors ──────────────────────────────────────────────────────
const PHASE_COLORS = [
  { bg: "rgba(191,162,100,0.06)", border: "rgba(191,162,100,0.2)", text: GOLD },
  {
    bg: "rgba(16,185,129,0.06)",
    border: "rgba(16,185,129,0.2)",
    text: "#10b981",
  },
  {
    bg: "rgba(56,189,248,0.06)",
    border: "rgba(56,189,248,0.2)",
    text: "#38bdf8",
  },
  {
    bg: "rgba(139,92,246,0.06)",
    border: "rgba(139,92,246,0.2)",
    text: "#8b5cf6",
  },
  {
    bg: "rgba(249,115,22,0.06)",
    border: "rgba(249,115,22,0.2)",
    text: "#f97316",
  },
];

// ─── Clamp context menu to viewport ──────────────────────────────────────────
const clampMenu = (x, y, w = 240, h = 400) => ({
  left: Math.min(x, window.innerWidth - w - 16),
  top: Math.min(y, window.innerHeight - h - 16),
  rawX: x,
  rawY: y,
});

// ─── Derive sprint phases from nodes ─────────────────────────────────────────
const derivePhases = (nodes) => {
  const seen = new Set();
  const arr = [];
  nodes.forEach((n) => {
    const phase = n.data?.sprintPhase;
    if (phase && !seen.has(phase)) {
      seen.add(phase);
      arr.push(phase);
    }
  });
  return arr;
};

// ─── Execution stats from node states ────────────────────────────────────────
const deriveStats = (nodes) => {
  const exec = nodes.filter((n) => n.type === "executionNode");
  const total = exec.length;
  const verified = exec.filter(
    (n) => n.data?._computed?.state === NODE_STATES.VERIFIED,
  ).length;
  const active = exec.filter(
    (n) => n.data?._computed?.state === NODE_STATES.ACTIVE,
  ).length;
  const locked = exec.filter(
    (n) => n.data?._computed?.state === NODE_STATES.LOCKED,
  ).length;
  const verifying = exec.filter(
    (n) => n.data?._computed?.state === NODE_STATES.VERIFYING,
  ).length;
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  return { total, verified, active, locked, verifying, pct };
};

// ─── HudButton ────────────────────────────────────────────────────────────────
const HudButton = memo(
  ({
    children,
    onClick,
    disabled,
    title,
    gold,
    active,
    style: extStyle = {},
  }) => (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={disabled ? {} : { scale: 1.08 }}
      whileTap={disabled ? {} : { scale: 0.93 }}
      className={cn(
        "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shadow-2xl backdrop-blur-xl focus-visible:outline-none disabled:opacity-30",
        gold
          ? "text-black"
          : active
            ? "text-white"
            : "text-[#888] hover:text-white",
      )}
      style={{
        background: gold ? GOLD : active ? ELEVATED : `${SURFACE}/90`,
        borderColor: gold ? `${GOLD}80` : active ? `${GOLD}40` : "#1a1a1a",
        boxShadow: gold ? `0 0 16px ${GOLD_DIM}` : "none",
        ...extStyle,
      }}
    >
      {children}
    </motion.button>
  ),
);
HudButton.displayName = "HudButton";

// ─── SprintPhaseBar ───────────────────────────────────────────────────────────
const SprintPhaseBar = memo(({ phases, activePhase, onPhaseChange }) => {
  if (phases.length === 0) return null;
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1.5 pointer-events-auto">
      <div className="flex items-center gap-1.5 bg-[#060606]/90 backdrop-blur-xl border border-[#1a1a1a] px-3 py-1.5 rounded-xl shadow-2xl">
        <Layers className="w-3 h-3 shrink-0" style={{ color: GOLD }} />
        <span
          className="text-[9px] font-black uppercase tracking-widest mr-1"
          style={{ color: GOLD }}
        >
          Sprint
        </span>
        <button
          onClick={() => onPhaseChange(null)}
          className={cn(
            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
            !activePhase ? "text-black" : "text-[#555] hover:text-white",
          )}
          style={!activePhase ? { background: GOLD } : {}}
        >
          All
        </button>
        {phases.map((p, i) => {
          const col = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <button
              key={p}
              onClick={() => onPhaseChange(activePhase === p ? null : p)}
              className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
              style={
                activePhase === p
                  ? { background: col.text, color: "#000" }
                  : { color: "#555" }
              }
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
});
SprintPhaseBar.displayName = "SprintPhaseBar";

// ─── ContextMenuBase ──────────────────────────────────────────────────────────
const ContextMenuBase = ({ pos, children, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: -6 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: -6 }}
    transition={{ duration: 0.1 }}
    style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100 }}
    className="w-[240px] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.95)]"
    role="menu"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.key === "Escape" && onClose()}
  >
    <div style={{ background: "#060606" }}>{children}</div>
  </motion.div>
);

// ─── PaneContextMenu ──────────────────────────────────────────────────────────
const PaneContextMenu = ({
  pos,
  nodes,
  setNodes,
  setEdges,
  setHasUnsavedChanges,
  addToast,
  screenToFlowPosition,
  subscriptionTier,
  onLimitReached,
  onClose,
  setActiveEditNodeId,
}) => {
  const addNode = (type) => {
    const max = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
    if (nodes.length >= max) {
      onLimitReached();
      onClose();
      return;
    }
    const fp = screenToFlowPosition({ x: pos.rawX, y: pos.rawY });
    const id = crypto.randomUUID();
    const defaults = {
      title:
        type === "executionNode"
          ? "New Protocol"
          : type === "milestoneNode"
            ? "Phase Gate"
            : type === "logicGate"
              ? "AND Gate"
              : type === "assetWidget"
                ? "Vault Verification"
                : "Node",
      subtitle: "",
      desc: "",
      nodeType: "branch",
      accentColor: "amber",
      tasks: [],
      isCompleted: false,
      priorityStatus: "FUTURE",
      tags: [],
      collapsed: false,
      linkedAssets: [],
      delegates: [],
      verificationContract: { type: "HUMAN_PROOF", scoreReward: 25 },
      outputBindings: {
        onVerified: "UNLOCK_CHILDREN",
        onFailed: "BACKOFF_30M",
      },
      sprintPhase: "Week 1",
    };
    if (type === "logicGate") defaults.logicType = "AND";
    if (type === "milestoneNode") {
      defaults.verificationContract = { type: "AUTO_TIME", scoreReward: 50 };
      defaults.xpReward = 50;
    }
    setNodes((nds) => [
      ...nds,
      { id, type, position: { x: fp.x, y: fp.y }, data: defaults },
    ]);
    setHasUnsavedChanges(true);
    setActiveEditNodeId(id);
    addToast(`${type} deployed.`, "grey");
    onClose();
  };
  return (
    <ContextMenuBase pos={pos} onClose={onClose}>
      <div className="px-4 py-2.5 border-b border-[#111]">
        <span className="text-[8px] font-black text-[#444] uppercase tracking-widest">
          Deploy Node
        </span>
      </div>
      {NODE_PALETTE.map(({ type, label, icon: Icon, color }) => (
        <button
          key={type}
          onClick={() => addNode(type)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#ccc] hover:bg-white/[0.03] hover:text-white transition-colors text-left"
        >
          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} /> {label}
        </button>
      ))}
    </ContextMenuBase>
  );
};

// ─── NodeContextMenu ──────────────────────────────────────────────────────────
const NodeContextMenu = ({
  pos,
  setNodes,
  setEdges,
  setHasUnsavedChanges,
  addToast,
  onClose,
}) => {
  const { node } = pos;
  return (
    <ContextMenuBase pos={pos} onClose={onClose}>
      <button
        onClick={() => {
          const id = crypto.randomUUID();
          setNodes((nds) => [
            ...nds,
            {
              ...node,
              id,
              position: { x: node.position.x + 80, y: node.position.y + 80 },
              data: {
                ...node.data,
                title: `${node.data.title} (Copy)`,
                isCompleted: false,
              },
            },
          ]);
          setHasUnsavedChanges(true);
          addToast("Node duplicated.", "grey");
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-[#ccc] hover:bg-white/[0.03] hover:text-white transition-colors text-left"
      >
        <Copy className="w-4 h-4" /> Duplicate
      </button>
      <button
        onClick={() => {
          setNodes((nds) => nds.filter((n) => n.id !== node.id));
          setEdges((eds) =>
            eds.filter((e) => e.source !== node.id && e.target !== node.id),
          );
          setHasUnsavedChanges(true);
          addToast("Node removed.", "red");
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors text-left border-t border-[#111]"
      >
        <Trash2 className="w-4 h-4" /> Delete Node
      </button>
    </ContextMenuBase>
  );
};

// ─── EdgeContextMenu ──────────────────────────────────────────────────────────
const EdgeContextMenu = ({
  pos,
  setEdges,
  setHasUnsavedChanges,
  addToast,
  onClose,
}) => {
  const { edge } = pos;
  const TYPES = ["core-core", "core-branch", "branch-sub", "open"];
  return (
    <ContextMenuBase pos={pos} onClose={onClose}>
      <div className="px-4 py-2 border-b border-[#111]">
        <span className="text-[8px] font-black text-[#444] uppercase tracking-widest">
          Edge Type
        </span>
      </div>
      {TYPES.map((t) => (
        <button
          key={t}
          onClick={() => {
            setEdges((eds) =>
              eds.map((e) =>
                e.id === edge.id
                  ? { ...e, data: { ...e.data, connType: t } }
                  : e,
              ),
            );
            setHasUnsavedChanges(true);
            onClose();
          }}
          className={cn(
            "w-full px-4 py-2.5 text-xs font-bold transition-colors text-left",
            edge.data?.connType === t
              ? "text-[#BFA264] bg-[#BFA264]/8"
              : "text-[#888] hover:bg-white/[0.03] hover:text-white",
          )}
        >
          {t}
        </button>
      ))}
      <button
        onClick={() => {
          setEdges((eds) => eds.filter((e) => e.id !== edge.id));
          setHasUnsavedChanges(true);
          addToast("Edge removed.", "red");
          onClose();
        }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors text-left border-t border-[#111]"
      >
        <Trash2 className="w-4 h-4" /> Delete Edge
      </button>
    </ContextMenuBase>
  );
};

// ─── Main FlowCanvas export ───────────────────────────────────────────────────
export const FlowCanvas = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  isSaving,
  handleCloudSave,
  isMapFullscreen,
  setIsMapFullscreen,
  subscriptionTier,
  totalNodesCount,
  onLimitReached,
  isFirstTime,
  handleStartCalibration,
  canUndo,
  canRedo,
  undo,
  redo,
  commit,
  // Agentic-specific props
  onNodeExecute,
  onNodeVerify,
  userVault = [],
}) => {
  const { screenToFlowPosition, fitView, setCenter, setViewport, getViewport } =
    useReactFlow();
  const { forceEvaluate } = useAgenticEngine();

  const {
    setActiveEditNodeId,
    addToast,
    addPendingScore,
    toggleNodeCollapse,
    openExplorerModal,
    openVideoModal,
    markVideoWatched,
  } = React.useContext(React.createContext({})) ?? {};

  // ── Local UI state ────────────────────────────────────────────────────────
  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [showMini, setShowMini] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [activePhase, setActivePhase] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [activeNodeId, setActiveNodeIdLocal] = useState(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const dlRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Responsive detection ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler, { passive: true });
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Click-outside for download menu ──────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Sprint phase derivation ────────────────────────────────────────────────
  const phases = useMemo(() => derivePhases(nodes), [nodes]);
  const stats = useMemo(() => deriveStats(nodes), [nodes]);

  // ── Phase filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePhase) {
      setNodes((nds) => nds.map((n) => ({ ...n, hidden: false })));
      return;
    }
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        hidden: !!(n.data?.sprintPhase && n.data.sprintPhase !== activePhase),
      })),
    );
    setTimeout(() => fitView({ duration: 700, padding: 0.25 }), 80);
  }, [activePhase]); // eslint-disable-line

  // ── Auto-layout (Dagre) ────────────────────────────────────────────────────
  const applyAutoLayout = useCallback(
    (direction = "LR") => {
      setNodes((current) => {
        if (!current.length) return current;
        const { layoutedNodes } = getLayoutedElements(
          current,
          edges,
          direction,
        );
        setHasUnsavedChanges(true);
        return layoutedNodes;
      });
      addToast?.("Topology auto-aligned.", "grey");
      setTimeout(() => fitView({ duration: 800, padding: 0.28 }), 60);
    },
    [edges, setNodes, fitView, setHasUnsavedChanges, addToast],
  );

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(
    (q) => {
      setSearchQ(q);
      if (!q) {
        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
        );
        return;
      }
      const lower = q.toLowerCase();
      let found = null;
      setNodes((nds) =>
        nds.map((n) => {
          const match =
            n.data?.title?.toLowerCase().includes(lower) ||
            n.data?.desc?.toLowerCase().includes(lower) ||
            n.data?.sprintPhase?.toLowerCase().includes(lower);
          if (match && !found) found = n;
          return { ...n, data: { ...n.data, isDimmed: !match } };
        }),
      );
      if (found)
        setCenter(found.position.x + 150, found.position.y + 100, {
          zoom: 1.4,
          duration: 700,
        });
    },
    [setNodes, setCenter],
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
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
        handleCloudSave?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo?.();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo?.();
        return;
      }
      if (isTyping()) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsMapFullscreen((v) => !v);
        setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 60);
        return;
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setShowMini((v) => !v);
        return;
      }
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        applyAutoLayout("LR");
        return;
      }
      if (e.key === "Escape") {
        setPaneMenu(null);
        setNodeMenu(null);
        setEdgeMenu(null);
        setActiveNodeIdLocal(null);
        setSearchQ("");
        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
        );
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = nodes.filter((n) => n.selected);
        const selE = edges.filter((ed) => ed.selected);
        if (!sel.length && !selE.length) return;
        e.preventDefault();
        const ids = new Set(sel.map((n) => n.id));
        const eids = new Set(selE.map((ed) => ed.id));
        setEdges((eds) =>
          eds.filter(
            (ed) =>
              !ids.has(ed.source) && !ids.has(ed.target) && !eids.has(ed.id),
          ),
        );
        setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
        setHasUnsavedChanges(true);
        addToast?.(`${sel.length + selE.length} element(s) removed.`, "red");
        return;
      }
      if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const max = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
        if (nodes.length >= max) {
          onLimitReached();
          return;
        }
        const vp = getViewport();
        const W = window.innerWidth;
        const H = window.innerHeight;
        const cx = (-vp.x + W / 2) / vp.zoom;
        const cy = (-vp.y + H / 2) / vp.zoom;
        const id = crypto.randomUUID();
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: "executionNode",
            position: { x: cx - 150, y: cy - 90 },
            data: {
              title: "New Protocol",
              subtitle: "",
              desc: "",
              nodeType: "branch",
              accentColor: "amber",
              tasks: [],
              isCompleted: false,
              priorityStatus: "FUTURE",
              tags: [],
              collapsed: false,
              linkedAssets: [],
              verificationContract: { type: "HUMAN_PROOF", scoreReward: 25 },
              outputBindings: {
                onVerified: "UNLOCK_CHILDREN",
                onFailed: "BACKOFF_30M",
              },
              sprintPhase: "Week 1",
            },
          },
        ]);
        setHasUnsavedChanges(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        const sel = nodes.filter((n) => n.selected);
        if (!sel.length) return;
        const max = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
        if (nodes.length + sel.length > max) {
          onLimitReached();
          return;
        }
        const clones = sel.map((n) => ({
          id: crypto.randomUUID(),
          type: n.type,
          position: { x: n.position.x + 80, y: n.position.y + 80 },
          data: {
            ...n.data,
            title: `${n.data.title || ""} (Copy)`,
            isCompleted: false,
          },
          selected: true,
        }));
        setNodes((nds) => [
          ...nds.map((n) => ({ ...n, selected: false })),
          ...clones,
        ]);
        setHasUnsavedChanges(true);
        addToast?.(`${clones.length} node(s) duplicated.`, "grey");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const exec = nodes.filter((n) => n.type === "executionNode");
        if (!exec.length) return;
        const cur = exec.findIndex((n) => n.selected);
        const next = e.shiftKey
          ? cur <= 0
            ? exec.length - 1
            : cur - 1
          : cur >= exec.length - 1
            ? 0
            : cur + 1;
        const tgt = exec[next];
        setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === tgt.id })),
        );
        setActiveNodeIdLocal(tgt.id);
        setCenter(tgt.position.x + 150, tgt.position.y + 90, {
          zoom: 1.2,
          duration: 550,
        });
        return;
      }
      const PAN = 80;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const vp = getViewport();
        const dx =
          e.key === "ArrowLeft" ? PAN : e.key === "ArrowRight" ? -PAN : 0;
        const dy = e.key === "ArrowUp" ? PAN : e.key === "ArrowDown" ? -PAN : 0;
        setViewport(
          { x: vp.x + dx, y: vp.y + dy, zoom: vp.zoom },
          { duration: 100 },
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    nodes,
    edges,
    setNodes,
    setEdges,
    undo,
    redo,
    handleCloudSave,
    subscriptionTier,
    onLimitReached,
    setHasUnsavedChanges,
    addToast,
    setActiveNodeIdLocal,
    setCenter,
    setViewport,
    getViewport,
    isMapFullscreen,
    setIsMapFullscreen,
    applyAutoLayout,
    fitView,
  ]); // eslint-disable-line

  // ── ReactFlow handlers ─────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        const hasPositionOrData = changes.some(
          (c) =>
            c.type === "position" ||
            c.type === "dimensions" ||
            c.type === "remove",
        );
        if (hasPositionOrData) setHasUnsavedChanges(true);
        return updated;
      });
    },
    [setNodes, setHasUnsavedChanges],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const hasRemove = changes.some((c) => c.type === "remove");
        if (hasRemove) setHasUnsavedChanges(true);
        return applyEdgeChanges(changes, eds);
      });
    },
    [setEdges, setHasUnsavedChanges],
  );

  const onConnect = useCallback(
    (params) => {
      const src = nodes.find((n) => n.id === params.source);
      const tgt = nodes.find((n) => n.id === params.target);
      let connType = "open";
      if (src?.type === "executionNode" && tgt?.type === "executionNode") {
        connType =
          src.data?.nodeType === "core" && tgt.data?.nodeType === "core"
            ? "core-core"
            : src.data?.nodeType === "core"
              ? "core-branch"
              : "branch-sub";
      }
      const accent =
        NODE_ACCENT_PALETTE[src?.data?.accentColor || "amber"]?.primary || GOLD;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e_${crypto.randomUUID()}`,
            type: "neuralEdge",
            data: { connType, accent, isRequired: true, logicGateType: null },
          },
          eds,
        ),
      );
      setHasUnsavedChanges(true);
      forceEvaluate();
    },
    [nodes, setEdges, setHasUnsavedChanges, forceEvaluate],
  );

  const handleNodeClick = useCallback(
    (e, node) => {
      setActiveNodeIdLocal(node.id);
      setPaneMenu(null);
      setNodeMenu(null);
      setEdgeMenu(null);
      if (isMobile) setIsMobileSheetOpen(true);
    },
    [isMobile],
  );

  const handlePaneClick = useCallback(() => {
    setActiveNodeIdLocal(null);
    setPaneMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
    );
    if (searchQ) setSearchQ("");
    if (isMobile) setIsMobileSheetOpen(false);
  }, [setActiveNodeIdLocal, setNodes, searchQ, isMobile]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleDownload = async (format) => {
    setDlOpen(false);
    const el = document.querySelector(".react-flow__renderer");
    if (!el) return;
    addToast?.("Preparing export…", "grey");
    try {
      if (format === "png") {
        const dataUrl = await toPng(el, {
          pixelRatio: 3,
          backgroundColor: VOID,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `discotive_agentic_map_${Date.now()}.png`;
        a.click();
      } else if (format === "pdf") {
        const dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: VOID,
        });
        const pdf = new jsPDF({ orientation: "landscape", format: "a2" });
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();
        pdf.addImage(dataUrl, "PNG", 0, 0, W, H);
        pdf.save(`discotive_agentic_map_${Date.now()}.pdf`);
      }
      addToast?.("Export ready.", "green");
    } catch (err) {
      console.error("[FlowCanvas Export]", err);
      addToast?.("Export failed.", "red");
    }
  };

  const activeNode = useMemo(
    () => nodes.find((n) => n.id === activeNodeId),
    [nodes, activeNodeId],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* Sprint Phase Bar */}
      <SprintPhaseBar
        phases={phases}
        activePhase={activePhase}
        onPhaseChange={setActivePhase}
      />

      {/* ── HUD: LEFT CLUSTER ── */}
      <div
        className="absolute z-[70] flex flex-col gap-2"
        style={{
          top: phases.length > 0 ? "3.5rem" : "1.25rem",
          left: "1.25rem",
        }}
      >
        <HudButton
          onClick={handleStartCalibration}
          title="Generate Agentic Map"
          gold
        >
          <Wand2 className="w-4 h-4" />
        </HudButton>
        <HudButton onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </HudButton>
        <HudButton
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
          </svg>
        </HudButton>
        <HudButton
          onClick={() => applyAutoLayout("LR")}
          title="Auto-Layout (L)"
        >
          <Network className="w-4 h-4" />
        </HudButton>
      </div>

      {/* ── HUD: TOP CENTER ── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 flex-wrap justify-center"
        style={{ top: phases.length > 0 ? "3.5rem" : "1.25rem" }}
      >
        {/* Execution stats pills */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#060606]/90 backdrop-blur-xl border border-[#1a1a1a] px-3 py-1.5 rounded-xl">
          {[
            { label: "VERIFIED", val: stats.verified, color: "#10b981" },
            { label: "ACTIVE", val: stats.active, color: GOLD },
            { label: "LOCKED", val: stats.locked, color: "#555" },
            { label: "VERIFYING", val: stats.verifying, color: "#8b5cf6" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-1.5 px-2 py-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
              <span
                className="text-[8px] font-black uppercase tracking-widest"
                style={{ color }}
              >
                {val} {label}
              </span>
            </div>
          ))}
          {stats.total > 0 && (
            <div className="ml-2 px-2 py-0.5 bg-white/[0.04] rounded border border-white/[0.04]">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">
                {stats.pct}% COMPLETE
              </span>
            </div>
          )}
        </div>

        {/* Sync badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-xl"
          style={{
            background: `${SURFACE}/90`,
            borderColor: isSaving
              ? `${GOLD}60`
              : hasUnsavedChanges
                ? "rgba(245,158,11,0.4)"
                : "rgba(16,185,129,0.3)",
          }}
        >
          {isSaving ? (
            <>
              <RefreshCw
                className="w-3 h-3 animate-spin"
                style={{ color: GOLD }}
              />{" "}
              Saving…
            </>
          ) : hasUnsavedChanges ? (
            <>
              <CloudOff className="w-3 h-3 text-amber-400" /> Unsaved
            </>
          ) : (
            <>
              <Cloud className="w-3 h-3 text-emerald-400" /> Synced
            </>
          )}
        </div>

        <button
          onClick={handleCloudSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="px-4 py-1.5 rounded-full font-extrabold text-[9px] uppercase tracking-widest transition-colors disabled:opacity-40"
          style={{
            background: hasUnsavedChanges ? GOLD : ELEVATED,
            color: hasUnsavedChanges ? "#000" : "#555",
            boxShadow: hasUnsavedChanges ? `0 0 16px ${GOLD_DIM}` : "none",
          }}
        >
          Save
        </button>
      </div>

      {/* ── HUD: SEARCH ── */}
      <div
        className="absolute z-[70]"
        style={{
          top: phases.length > 0 ? "3.5rem" : "1.25rem",
          right: "12.5rem",
        }}
      >
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555] group-focus-within:text-[#BFA264] transition-colors" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQ}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Find node…"
            className="w-24 md:w-36 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#1a1a1a] text-white pl-8 pr-3 py-2 rounded-full focus:outline-none text-xs placeholder:text-[#444] transition-all focus:w-36 md:focus:w-48"
            onFocus={(e) => (e.target.style.borderColor = GOLD_BORDER)}
            onBlur={(e) => (e.target.style.borderColor = "#1a1a1a")}
          />
          {searchQ && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── HUD: RIGHT CLUSTER ── */}
      <div
        className="absolute z-[70] flex flex-col gap-2"
        style={{
          top: phases.length > 0 ? "3.5rem" : "1.25rem",
          right: "1.25rem",
        }}
      >
        <HudButton
          onClick={() => fitView({ duration: 800, padding: 0.3 })}
          title="Fit to View"
        >
          <Target className="w-4 h-4" />
        </HudButton>
        <HudButton
          onClick={() => setShowMini((v) => !v)}
          title="Toggle Minimap (M)"
          active={showMini}
        >
          <MapIcon className="w-4 h-4" />
        </HudButton>
        <div className="relative" ref={dlRef}>
          <HudButton onClick={() => setDlOpen((v) => !v)} title="Export Map">
            <Download className="w-4 h-4" />
          </HudButton>
          <AnimatePresence>
            {dlOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-44 rounded-xl overflow-hidden shadow-2xl border border-[#1e1e1e]"
                style={{ background: SURFACE }}
              >
                {[
                  { format: "png", label: "Export PNG" },
                  { format: "pdf", label: "Export PDF" },
                ].map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={() => handleDownload(format)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-white hover:bg-white/[0.04] w-full border-b border-[#1a1a1a] last:border-0 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <HudButton
          onClick={() => {
            setIsMapFullscreen((v) => !v);
            setTimeout(() => fitView({ duration: 600, padding: 0.25 }), 60);
          }}
          title={isMapFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
        >
          {isMapFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </HudButton>
      </div>

      {/* ── REACT FLOW CANVAS ── */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setNodeMenu(null);
          setEdgeMenu(null);
          setPaneMenu(clampMenu(e.clientX, e.clientY));
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setPaneMenu(null);
          setEdgeMenu(null);
          setNodeMenu({ ...clampMenu(e.clientX, e.clientY, 220, 160), node });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setPaneMenu(null);
          setNodeMenu(null);
          setEdgeMenu({ ...clampMenu(e.clientX, e.clientY, 220, 200), edge });
        }}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 800 }}
        snapToGrid
        snapGrid={[16, 16]}
        connectionLineType="smoothstep"
        connectionRadius={36}
        minZoom={0.04}
        maxZoom={3.5}
        elevateNodesOnSelect
        selectNodesOnDrag={false}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "neuralEdge", animated: false }}
        className="bg-[#070707]"
      >
        <Suspense fallback={null}>
          <Background
            variant={BackgroundVariant.Dots}
            color="rgba(191,162,100,0.06)"
            gap={28}
            size={1.2}
            style={{ backgroundColor: "#070707" }}
          />
        </Suspense>
        <Suspense fallback={null}>
          <Controls
            showInteractive={false}
            className="!bg-transparent !border-none [&_.react-flow__controls-button]:bg-[#0d0d12] [&_.react-flow__controls-button]:border-white/[0.06] [&_.react-flow__controls-button]:fill-[rgba(255,255,255,0.35)] [&_.react-flow__controls-button:hover]:bg-[#13131a] rounded-xl border border-[#1a1a1a] overflow-hidden z-30 hidden md:flex"
          />
        </Suspense>
        {showMini && (
          <Suspense fallback={null}>
            <MiniMap
              nodeColor={(n) => {
                const state = n.data?._computed?.state;
                if (state === NODE_STATES.VERIFIED) return "#10b981";
                if (
                  state === NODE_STATES.ACTIVE ||
                  state === NODE_STATES.IN_PROGRESS
                )
                  return GOLD;
                if (state === NODE_STATES.VERIFYING) return "#8b5cf6";
                if (state === NODE_STATES.FAILED_BACKOFF) return "#ef4444";
                return "#222";
              }}
              maskColor="rgba(0,0,0,0.88)"
              style={{
                background: "#060606",
                border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 10,
              }}
            />
          </Suspense>
        )}
      </ReactFlow>

      {/* Context menu backdrops */}
      {(paneMenu || nodeMenu || edgeMenu) && (
        <div
          className="fixed inset-0 z-[90]"
          onClick={() => {
            setPaneMenu(null);
            setNodeMenu(null);
            setEdgeMenu(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setPaneMenu(null);
            setNodeMenu(null);
            setEdgeMenu(null);
          }}
          aria-hidden
        />
      )}

      {/* Context menus */}
      <AnimatePresence>
        {paneMenu && (
          <PaneContextMenu
            pos={paneMenu}
            nodes={nodes}
            setNodes={setNodes}
            setEdges={setEdges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            addToast={addToast}
            screenToFlowPosition={screenToFlowPosition}
            subscriptionTier={subscriptionTier}
            onLimitReached={onLimitReached}
            onClose={() => setPaneMenu(null)}
            setActiveEditNodeId={setActiveNodeIdLocal}
          />
        )}
        {nodeMenu && (
          <NodeContextMenu
            pos={nodeMenu}
            setNodes={setNodes}
            setEdges={setEdges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            addToast={addToast}
            onClose={() => setNodeMenu(null)}
          />
        )}
        {edgeMenu && (
          <EdgeContextMenu
            pos={edgeMenu}
            setEdges={setEdges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            addToast={addToast}
            onClose={() => setEdgeMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isMobile && isMobileSheetOpen && activeNode && (
          <Suspense fallback={null}>
            <MobileNodeSheet
              node={activeNode}
              onClose={() => {
                setIsMobileSheetOpen(false);
                setActiveNodeIdLocal(null);
              }}
              onExecute={onNodeExecute}
              onVerify={onNodeVerify}
              userVault={userVault}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};
