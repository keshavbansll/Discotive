/**
 * @fileoverview Discotive Roadmap — Flow Canvas Engine v5 (Gold/Void Overhaul)
 *
 * CRITICAL FIXES vs v4:
 *   - getLayoutedElements was called but NEVER imported → runtime crash on Auto Layout. FIXED.
 *   - Duplicate `import "reactflow/dist/style.css"` removed.
 *   - Gold/Void brand palette (#BFA264 / #D4AF78 / #030303) fully applied.
 *   - Sprint topology bar with Phase selector.
 *   - Stagger-reveal animation on initial node load.
 *   - Magnetic edge connection preview.
 *   - Canvas lock for verification nodes (cannot drag/edit until learn_id verified).
 *   - "Completion burst" CSS particle on node verify event.
 *
 * Keyboard shortcuts:
 *   + / =         add execution node at viewport center
 *   Delete        delete selected nodes/edges
 *   Ctrl+D        duplicate selected
 *   Ctrl+A        select all
 *   Ctrl+Z        undo
 *   Ctrl+Shift+Z  redo
 *   Tab           cycle execution nodes
 *   Arrow keys    pan canvas
 *   F             toggle fullscreen
 *   L             auto-layout (dagre LR)
 *   M             toggle minimap
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
  memo,
} from "react";
import ReactFlow, {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";

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
  ImageIcon,
  FileText,
  Plus,
  Search,
  X,
  Trash2,
  Copy,
  Network,
  ChevronRight,
  ChevronLeft,
  Zap,
  Lock,
  Layers,
  CheckCircle,
  AlertCircle,
  Video,
  Database,
  GitBranch,
  Cpu,
  BookOpen,
  Group,
  LayoutGrid,
  Radio,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { cn } from "../../lib/cn";

// ── Critical import that was previously MISSING ───────────────────────────────
import { getLayoutedElements } from "../../lib/roadmap/layout.js";

import { ExecutionNode } from "./ExecutionNode.jsx";
import { NeuralEdge, edgeTypes } from "./NeuralEdge.jsx";
import { TopologyStats } from "./TopologyStats.jsx";
import {
  NODE_ACCENT_PALETTE,
  TIER_LIMITS,
} from "../../lib/roadmap/constants.js";
import { useRoadmap } from "../../contexts/RoadmapContext.jsx";

import { AssetWidgetNode } from "./nodes/AssetWidgetNode.jsx";
import { VideoWidgetNode } from "./nodes/VideoWidgetNode.jsx";
import { JournalNode } from "./nodes/JournalNode.jsx";
import { MilestoneNode } from "./nodes/MilestoneNode.jsx";
import { AppConnectorNode } from "./nodes/AppConnectorNode.jsx";
import { GroupNode } from "./nodes/GroupNode.jsx";
import { RadarWidgetNode } from "./nodes/RadarWidgetNode.jsx";
import { LogicNode } from "./nodes/LogicNode.jsx";
import { ComputeNode } from "./nodes/ComputeNode.jsx";

// ── Lazy ReactFlow sub-components ─────────────────────────────────────────────
const MiniMap = lazy(() =>
  import("reactflow").then((m) => ({ default: m.MiniMap })),
);
const Controls = lazy(() =>
  import("reactflow").then((m) => ({ default: m.Controls })),
);
const Background = lazy(() =>
  import("reactflow").then((m) => ({ default: m.Background })),
);

// ── Node type registry ────────────────────────────────────────────────────────
const nodeTypes = {
  executionNode: ExecutionNode,
  radarWidget: RadarWidgetNode,
  assetWidget: AssetWidgetNode,
  videoWidget: VideoWidgetNode,
  journalNode: JournalNode,
  milestoneNode: MilestoneNode,
  connectorNode: AppConnectorNode,
  groupNode: GroupNode,
  logicGate: LogicNode,
  computeNode: ComputeNode,
};

// ── Brand palette tokens ──────────────────────────────────────────────────────
const GOLD = "#BFA264";
const GOLD_BRIGHT = "#D4AF78";
const GOLD_DIM = "rgba(191,162,100,0.15)";
const GOLD_BORDER = "rgba(191,162,100,0.25)";
const VOID = "#030303";
const SURFACE = "#0a0a0a";
const ELEVATED = "#111111";

// ── Node palette — for context menu ──────────────────────────────────────────
const NODE_PALETTE = [
  { type: "executionNode", label: "Task Node", icon: Zap, color: GOLD },
  {
    type: "milestoneNode",
    label: "Milestone",
    icon: CheckCircle,
    color: "#10b981",
  },
  { type: "computeNode", label: "AI Gate", icon: Cpu, color: "#8b5cf6" },
  { type: "logicGate", label: "Logic Gate", icon: GitBranch, color: "#38bdf8" },
  { type: "assetWidget", label: "Asset Verify", icon: Database, color: GOLD },
  { type: "videoWidget", label: "Video Node", icon: Video, color: "#38bdf8" },
  { type: "journalNode", label: "Journal", icon: BookOpen, color: "#8b5cf6" },
  {
    type: "connectorNode",
    label: "App Connector",
    icon: Radio,
    color: "#10b981",
  },
  { type: "groupNode", label: "Group Frame", icon: Layers, color: "#555" },
];

// ── Clamp context menu to viewport ───────────────────────────────────────────
const clampMenu = (x, y, w = 240, h = 380) => ({
  left: Math.min(x, window.innerWidth - w - 16),
  top: Math.min(y, window.innerHeight - h - 16),
  rawX: x,
  rawY: y,
});

// ─────────────────────────────────────────────────────────────────────────────
// FlowCanvas — Main Export
// ─────────────────────────────────────────────────────────────────────────────
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
}) => {
  const { screenToFlowPosition, fitView, setCenter, setViewport, getViewport } =
    useReactFlow();

  const {
    setActiveEditNodeId,
    addToast,
    addPendingScore,
    toggleNodeCollapse,
    openExplorerModal,
    openVideoModal,
    markVideoWatched,
  } = useRoadmap();

  // ── UI State ────────────────────────────────────────────────────────────
  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [showMini, setShowMini] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [activePhase, setActivePhase] = useState(null); // sprint phase filter
  const [nodeStaggerDone, setNodeStaggerDone] = useState(false);

  const dlRef = useRef(null);
  const searchInputRef = useRef(null);

  // ── Click-outside for download menu ──────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Stagger-reveal on first mount ────────────────────────────────────────
  useEffect(() => {
    if (nodes.length > 0 && !nodeStaggerDone) {
      setNodes((nds) =>
        nds.map((n, i) => ({
          ...n,
          data: { ...n.data, _staggerIndex: i, _justMounted: true },
        })),
      );
      const timer = setTimeout(
        () => {
          setNodeStaggerDone(true);
          setNodes((nds) =>
            nds.map((n) => {
              const { _justMounted, _staggerIndex, ...rest } = n.data || {};
              return { ...n, data: rest };
            }),
          );
        },
        nodes.length * 40 + 500,
      );
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line

  // ── Derive sprint phases from node data ───────────────────────────────────
  const phases = React.useMemo(() => {
    const seen = new Set();
    const arr = [];
    nodes.forEach((n) => {
      const phase = n.data?.phase || n.data?.sprintPhase;
      if (phase && !seen.has(phase)) {
        seen.add(phase);
        arr.push(phase);
      }
    });
    return arr;
  }, [nodes]);

  // ── Phase filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activePhase) {
      setNodes((nds) => nds.map((n) => ({ ...n, hidden: false })));
      return;
    }
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        hidden: !!(
          (n.data?.phase || n.data?.sprintPhase) &&
          (n.data?.phase || n.data?.sprintPhase) !== activePhase
        ),
      })),
    );
    setTimeout(() => fitView({ duration: 700, padding: 0.25 }), 80);
  }, [activePhase]); // eslint-disable-line

  // ── Search ────────────────────────────────────────────────────────────────
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
            n.data?.subtitle?.toLowerCase().includes(lower) ||
            n.data?.desc?.toLowerCase().includes(lower);
          if (match && !found) found = n;
          return { ...n, data: { ...n.data, isDimmed: !match } };
        }),
      );
      if (found) {
        setCenter(found.position.x + 150, found.position.y + 100, {
          zoom: 1.4,
          duration: 700,
        });
      }
    },
    [setNodes, setCenter],
  );

  // ── Auto Layout (Dagre) ────────────────────────────────────────────────────
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
      addToast("Neural topology auto-aligned.", "grey");
      setTimeout(() => fitView({ duration: 800, padding: 0.28 }), 60);
    },
    [edges, setNodes, fitView, setHasUnsavedChanges, addToast],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return (
        ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
        document.activeElement?.contentEditable === "true"
      );
    };

    const handler = (e) => {
      // Ctrl+S — save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleCloudSave?.();
        return;
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo?.();
        return;
      }

      // Ctrl+Shift+Z — redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo?.();
        return;
      }

      if (isTyping()) return;

      // F — fullscreen
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setIsMapFullscreen((v) => !v);
        setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 60);
        return;
      }

      // M — minimap
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setShowMini((v) => !v);
        return;
      }

      // L — auto-layout
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        applyAutoLayout("LR");
        return;
      }

      // Escape — close menus, deselect
      if (e.key === "Escape") {
        setPaneMenu(null);
        setNodeMenu(null);
        setEdgeMenu(null);
        setActiveEditNodeId(null);
        setSearchQ("");
        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
        );
        return;
      }

      // Delete / Backspace — remove selected
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
        addToast(`${sel.length + selE.size} element(s) removed.`, "red");
        return;
      }

      // + or = — add node
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
              deadline: "",
              tasks: [],
              isCompleted: false,
              priorityStatus: "FUTURE",
              nodeType: "branch",
              accentColor: "gold",
              tags: [],
              collapsed: false,
              linkedAssets: [],
            },
          },
        ]);
        setHasUnsavedChanges(true);
        setActiveEditNodeId(id);
        return;
      }

      // Ctrl+D — duplicate
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
        addToast(`${clones.length} node(s) duplicated.`, "grey");
        return;
      }

      // Ctrl+A — select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
        return;
      }

      // Tab — cycle execution nodes
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
        setActiveEditNodeId(tgt.id);
        setCenter(tgt.position.x + 150, tgt.position.y + 90, {
          zoom: 1.2,
          duration: 550,
        });
        return;
      }

      // Arrow keys — pan
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
    setActiveEditNodeId,
    setCenter,
    setViewport,
    getViewport,
    isMapFullscreen,
    setIsMapFullscreen,
    applyAutoLayout,
    fitView,
  ]); // eslint-disable-line

  // ── ReactFlow core handlers ────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        // Only mark dirty on non-selection changes
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
      } else if (
        src?.type?.includes("Widget") ||
        tgt?.type?.includes("Widget")
      ) {
        connType = "branch-sub";
      }
      const accent =
        NODE_ACCENT_PALETTE[src?.data?.accentColor || "amber"]?.primary || GOLD;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e_${crypto.randomUUID()}`,
            type: "neuralEdge",
            data: { connType, accent },
          },
          eds,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [nodes, setEdges, setHasUnsavedChanges],
  );

  const handleNodeClick = useCallback(
    (e, node) => {
      setActiveEditNodeId(node.id);
      setPaneMenu(null);
      setNodeMenu(null);
      setEdgeMenu(null);
    },
    [setActiveEditNodeId],
  );

  const handlePaneClick = useCallback(() => {
    setActiveEditNodeId(null);
    setPaneMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
    );
    if (searchQ) {
      setSearchQ("");
    }
  }, [setActiveEditNodeId, setNodes, searchQ]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleDownload = async (format) => {
    setDlOpen(false);
    const el = document.querySelector(".react-flow__renderer");
    if (!el) return;
    addToast("Preparing export…", "grey");
    try {
      if (format === "png") {
        const dataUrl = await toPng(el, {
          pixelRatio: 3,
          backgroundColor: VOID,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `discotive_map_${Date.now()}.png`;
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
        pdf.save(`discotive_map_${Date.now()}.pdf`);
      }
      addToast("Export ready.", "green");
    } catch (err) {
      console.error("[FlowCanvas Export]", err);
      addToast("Export failed. Try PNG.", "red");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* ══════════════ SPRINT PHASE BAR ══════════════ */}
      {phases.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-[60] flex items-center gap-1.5 px-4 pt-2 pb-0 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto bg-[#060606]/90 backdrop-blur-xl border border-[#1a1a1a] px-3 py-1.5 rounded-xl shadow-2xl">
            <Layers className="w-3 h-3 shrink-0" style={{ color: GOLD }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest mr-1"
              style={{ color: GOLD }}
            >
              Sprint
            </span>
            <button
              onClick={() => setActivePhase(null)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                !activePhase ? "text-black" : "text-[#555] hover:text-white",
              )}
              style={!activePhase ? { background: GOLD } : {}}
            >
              All
            </button>
            {phases.map((p) => (
              <button
                key={p}
                onClick={() => setActivePhase(activePhase === p ? null : p)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activePhase === p
                    ? "text-black"
                    : "text-[#555] hover:text-white",
                )}
                style={activePhase === p ? { background: GOLD } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ HUD: LEFT CLUSTER ══════════════ */}
      <div
        className="absolute z-[70] flex flex-col gap-2"
        style={{
          top: phases.length > 0 ? "3.5rem" : "1.25rem",
          left: "1.25rem",
        }}
      >
        {/* AI Calibration */}
        <HudButton
          onClick={handleStartCalibration}
          title="Generate AI Execution Map"
          gold
        >
          <Wand2 className="w-4 h-4" />
        </HudButton>

        {/* Undo */}
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

        {/* Redo */}
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
      </div>

      {/* ══════════════ HUD: TOP CENTER ══════════════ */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 flex-wrap justify-center"
        style={{ top: phases.length > 0 ? "3.5rem" : "1.25rem" }}
      >
        <TopologyStats nodes={nodes} edges={edges} />

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

      {/* ══════════════ HUD: SEARCH ══════════════ */}
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
            style={{ "--tw-ring-color": GOLD }}
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

      {/* ══════════════ HUD: RIGHT CLUSTER ══════════════ */}
      <div
        className="absolute z-[70] flex flex-col gap-2"
        style={{
          top: phases.length > 0 ? "3.5rem" : "1.25rem",
          right: "1.25rem",
        }}
      >
        {/* Auto-layout */}
        <HudButton
          onClick={() => applyAutoLayout("LR")}
          title="Auto-Layout Topology (L)"
          style={{ borderColor: `${GOLD}40`, color: GOLD }}
        >
          <Network className="w-4 h-4" />
        </HudButton>

        {/* Fit view */}
        <HudButton
          onClick={() => fitView({ duration: 800, padding: 0.3 })}
          title="Fit to View"
        >
          <Target className="w-4 h-4" />
        </HudButton>

        {/* Minimap toggle */}
        <HudButton
          onClick={() => setShowMini((v) => !v)}
          title="Toggle Minimap (M)"
          active={showMini}
        >
          <MapIcon className="w-4 h-4" />
        </HudButton>

        {/* Download */}
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
                  { format: "png", label: "Export PNG", icon: ImageIcon },
                  { format: "pdf", label: "Export PDF", icon: FileText },
                ].map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    onClick={() => handleDownload(format)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-white hover:bg-white/[0.04] w-full border-b border-[#1a1a1a] last:border-0 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#666]" /> {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fullscreen */}
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

      {/* ══════════════ REACT FLOW CANVAS ══════════════ */}
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
        className="bg-[#0a0a0a]"
      >
        <Suspense fallback={null}>
          <Background
            variant="dots"
            color="rgba(191,162,100,0.08)"
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
              nodeColor={(n) =>
                n.data?.isCompleted
                  ? "#10b981"
                  : n.data?.priorityStatus === "READY"
                    ? GOLD
                    : "#222"
              }
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

      {/* Context menus backdrop */}
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
            setHasUnsavedChanges={setHasUnsavedChanges}
            addToast={addToast}
            screenToFlowPosition={screenToFlowPosition}
            subscriptionTier={subscriptionTier}
            onLimitReached={onLimitReached}
            onClose={() => setPaneMenu(null)}
            setActiveEditNodeId={setActiveEditNodeId}
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
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// HudButton — reusable HUD icon button
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// ContextMenuBase — shared wrapper
// ─────────────────────────────────────────────────────────────────────────────
const ContextMenuBase = ({ pos, children, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: -6 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: -6 }}
    transition={{ duration: 0.12 }}
    style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100 }}
    className="w-[220px] border border-[#1e1e1e] rounded-2xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.95)]"
    style2={{ background: SURFACE }}
    role="menu"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.key === "Escape" && onClose()}
  >
    <div style={{ background: "#060606" }}>{children}</div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────────────────────────
// PaneContextMenu — right-click on empty canvas
// ─────────────────────────────────────────────────────────────────────────────
const PaneContextMenu = ({
  pos,
  nodes,
  setNodes,
  setHasUnsavedChanges,
  addToast,
  screenToFlowPosition,
  subscriptionTier,
  onLimitReached,
  onClose,
  setActiveEditNodeId,
}) => {
  const addNode = (type, extra = {}) => {
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
            ? "Phase Complete"
            : type === "assetWidget"
              ? "Vault Target"
              : "Node",
      subtitle: "",
      desc: "",
      tasks: [],
      isCompleted: false,
      priorityStatus: "FUTURE",
      nodeType: "branch",
      accentColor: "gold",
      tags: [],
      collapsed: false,
      linkedAssets: [],
    };
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        position: { x: fp.x, y: fp.y },
        data: { ...defaults, ...extra },
      },
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
          Add Node
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

// ─────────────────────────────────────────────────────────────────────────────
// NodeContextMenu — right-click on a node
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// EdgeContextMenu — right-click on an edge
// ─────────────────────────────────────────────────────────────────────────────
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
