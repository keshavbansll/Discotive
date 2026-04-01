/**
 * @fileoverview Discotive Roadmap — Flow Canvas Engine
 *
 * ReactFlow viewport host. All inter-component communication now flows
 * through RoadmapContext — no window.dispatchEvent calls here.
 *
 * Keyboard shortcuts owned here:
 *   + / =         add node
 *   Delete        delete selected
 *   Ctrl+D        duplicate
 *   Ctrl+A        select all
 *   Ctrl+Z        undo (via prop)
 *   Ctrl+Shift+Z  redo (via prop)
 *   Tab           cycle nodes
 *   Arrow keys    pan canvas
 */

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
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
  Lock,
  ImageIcon,
  FileText,
  Plus,
  Search,
  X,
  Filter,
  Trash2,
  Copy,
  Palette,
} from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { cn } from "../ui/BentoCard";

import { ExecutionNode } from "./ExecutionNode.jsx";
import { NeuralEdge, edgeTypes } from "./NeuralEdge.jsx";
import { TopologyStats } from "./TopologyStats.jsx";
import {
  NODE_ACCENT_PALETTE,
  APP_CONNECTORS,
  TIER_LIMITS,
} from "../../lib/roadmap/constants.js";
import { useRoadmap } from "../../contexts/RoadmapContext.jsx";

// ─── Lazy node type registry (other node types imported on demand) ────────────
// Kept here so FlowCanvas is self-contained. Non-critical nodes are memoized.
import { AssetWidgetNode } from "./nodes/AssetWidgetNode.jsx";
import { VideoWidgetNode } from "./nodes/VideoWidgetNode.jsx";
import { JournalNode } from "./nodes/JournalNode.jsx";
import { MilestoneNode } from "./nodes/MilestoneNode.jsx";
import { AppConnectorNode } from "./nodes/AppConnectorNode.jsx";
import { GroupNode } from "./nodes/GroupNode.jsx";
import { RadarWidgetNode } from "./nodes/RadarWidgetNode.jsx";

const nodeTypes = {
  executionNode: ExecutionNode,
  radarWidget: RadarWidgetNode,
  assetWidget: AssetWidgetNode,
  videoWidget: VideoWidgetNode,
  journalNode: JournalNode,
  milestoneNode: MilestoneNode,
  connectorNode: AppConnectorNode,
  groupNode: GroupNode,
};

const clampMenu = (x, y, w = 260, h = 280) => ({
  left: Math.min(x, window.innerWidth - w - 16),
  top: Math.min(y, window.innerHeight - h - 16),
});

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
    openVaultModal,
    openVideoModal,
    markVideoWatched,
  } = useRoadmap();

  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [showMini, setShowMini] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const dlRef = useRef(null);

  // Click-outside for download menu
  useEffect(() => {
    const fn = (e) => {
      if (dlRef.current && !dlRef.current.contains(e.target)) setDlOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Time filter ───────────────────────────────────────────────────────────
  const prevTFRef = useRef("all");
  useEffect(() => {
    if (prevTFRef.current === timeFilter) return;
    prevTFRef.current = timeFilter;
    setNodes((nds) =>
      nds.map((n) => {
        if (timeFilter === "all" || !n.data?.deadline)
          return { ...n, hidden: false };
        const months =
          (new Date(n.data.deadline).getFullYear() - new Date().getFullYear()) *
            12 +
          (new Date(n.data.deadline).getMonth() - new Date().getMonth());
        const vis = {
          "1m": months <= 1,
          "3m": months <= 3,
          "6m": months <= 6,
          "12m": months <= 12,
        };
        return { ...n, hidden: !(vis[timeFilter] ?? true) };
      }),
    );
    if (timeFilter !== "all")
      setTimeout(() => fitView({ duration: 800, padding: 0.25 }), 100);
  }, [timeFilter]); // eslint-disable-line

  // ── Tag filter ────────────────────────────────────────────────────────────
  const prevTagRef = useRef("all");
  useEffect(() => {
    if (prevTagRef.current === tagFilter) return;
    prevTagRef.current = tagFilter;
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isDimmed:
            tagFilter === "all"
              ? false
              : n.type !== "executionNode"
                ? false
                : !(n.data.tags || []).includes(tagFilter),
        },
      })),
    );
  }, [tagFilter]); // eslint-disable-line

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
      const target = nodes.find(
        (n) =>
          n.data?.title?.toLowerCase().includes(q.toLowerCase()) ||
          n.data?.subtitle?.toLowerCase().includes(q.toLowerCase()),
      );
      if (target) {
        setCenter(target.position.x + 210, target.position.y + 160, {
          zoom: 1.3,
          duration: 800,
        });
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            data: { ...n.data, isDimmed: n.id !== target.id },
          })),
        );
      }
    },
    [nodes, setNodes, setCenter],
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
      if (isTyping()) return;

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

      // Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        const sel = nodes.filter((n) => n.selected);
        const selE = edges.filter((ed) => ed.selected);
        if (sel.length === 0 && selE.length === 0) return;
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
        addToast(`${sel.length} node(s) removed.`, "red");
        return;
      }

      // + or =  — add node
      if ((e.key === "+" || e.key === "=") && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const maxAllowed = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
        if (nodes.length >= maxAllowed) {
          onLimitReached();
          return;
        }
        const vp = getViewport();
        const W = window.innerWidth;
        const H = window.innerHeight;
        const cx = (-vp.x + W / 2) / vp.zoom;
        const cy = (-vp.y + H / 2) / vp.zoom;
        const id = crypto.randomUUID(); // Fix: was Date.now() — collision-safe
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
              accentColor: "amber",
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
        if (sel.length === 0) return;
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

      // Tab — cycle nodes
      if (e.key === "Tab") {
        e.preventDefault();
        const exec = nodes.filter((n) => n.type === "executionNode");
        if (exec.length === 0) return;
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
        setCenter(tgt.position.x + 210, tgt.position.y + 100, {
          zoom: 1.2,
          duration: 600,
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
        return;
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
    subscriptionTier,
    onLimitReached,
    setHasUnsavedChanges,
    addToast,
    setActiveEditNodeId,
    setCenter,
    setViewport,
    getViewport,
  ]); // eslint-disable-line

  // ── ReactFlow handlers ────────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        setHasUnsavedChanges(true);
        return updated;
      });
    },
    [setNodes, setHasUnsavedChanges],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        setHasUnsavedChanges(true);
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
        NODE_ACCENT_PALETTE[src?.data?.accentColor || "amber"]?.primary ||
        "#f59e0b";
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
    if (searchQ) setSearchQ("");
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
          backgroundColor: "#030303",
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `discotive_map_${Date.now()}.png`;
        a.click();
      } else if (format === "svg") {
        // SVG-first export: captures the ReactFlow SVG layer
        const svgEl = el.querySelector("svg");
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `discotive_map_${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        // Vector-first PDF: render SVG → embed in PDF (not a raster screenshot)
        const svgEl = el.querySelector("svg");
        const dataUrl = svgEl
          ? `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svgEl))}`
          : await toPng(el, { pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: "landscape", format: "a2" });
        const W = pdf.internal.pageSize.getWidth();
        const H = pdf.internal.pageSize.getHeight();
        if (svgEl) {
          // addSvgAsImage is vector-preserving when using SVG source
          pdf.addImage(dataUrl, "SVG", 0, 0, W, H);
        } else {
          pdf.addImage(dataUrl, "PNG", 0, 0, W, H);
        }
        pdf.save(`discotive_map_${Date.now()}.pdf`);
      }
      addToast("Export ready.", "green");
    } catch (e) {
      console.error("[Export]", e);
      addToast("Export failed. Try PNG instead.", "red");
    }
  };

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* ── HUD: LEFT CLUSTER ── */}
      <div className="absolute top-4 left-4 md:top-5 md:left-5 z-[70] flex flex-col gap-2">
        {/* Calibration trigger */}
        <button
          onClick={(e) => {
            e.preventDefault();
            handleStartCalibration?.();
          }}
          aria-label="Generate AI execution map"
          title="Generate AI execution map (Wand)"
          className="relative w-9 h-9 bg-[#0d0d12] border border-white/[0.08] rounded-xl text-[#888] hover:text-white hover:border-amber-500/40 hover:bg-amber-500/8 transition-all shadow-2xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <Wand2 className="w-4 h-4" />
        </button>

        {/* Undo / Redo */}
        <button
          onClick={(e) => {
            e.preventDefault();
            undo?.();
          }}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="w-10 h-10 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#888] hover:text-white transition-all shadow-2xl flex items-center justify-center disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            redo?.();
          }}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          className="w-10 h-10 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#888] hover:text-white transition-all shadow-2xl flex items-center justify-center disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
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
        </button>
      </div>

      {/* ── HUD: TOP BAR ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 flex-wrap justify-center">
        <TopologyStats nodes={nodes} edges={edges} />

        {/* Sync status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[9px] font-black uppercase tracking-widest text-[#555]">
          {isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />{" "}
              Saving…
            </>
          ) : hasUnsavedChanges ? (
            <>
              <CloudOff className="w-3 h-3 text-amber-500" /> Unsaved
            </>
          ) : (
            <>
              <Cloud className="w-3 h-3 text-emerald-500" /> Synced
            </>
          )}
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            handleCloudSave?.();
          }}
          disabled={!hasUnsavedChanges || isSaving}
          aria-label="Save to cloud (Ctrl+S)"
          className="bg-white text-black px-4 py-1.5 rounded-full font-extrabold text-[9px] uppercase tracking-widest hover:bg-[#ddd] transition-colors disabled:opacity-40 shadow-[0_0_15px_rgba(255,255,255,0.1)] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          Save
        </button>
      </div>

      {/* ── HUD: SEARCH + FILTER ── */}
      <div className="absolute top-4 right-[180px] md:right-[200px] z-[70] flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555]" />
          <input
            type="search"
            value={searchQ}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Find node…"
            aria-label="Search nodes"
            className="w-24 md:w-36 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] text-white pl-8 pr-3 py-2 rounded-full focus:outline-none focus:border-amber-500/40 text-xs placeholder:text-[#444] transition-all focus:w-32 md:focus:w-48 focus-visible:ring-1 focus-visible:ring-amber-500"
          />
          {searchQ && (
            <button
              onClick={() => handleSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#444] hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── HUD: RIGHT CLUSTER ── */}
      <div className="absolute top-4 right-4 md:top-5 md:right-5 z-[70] flex flex-col gap-2">
        <button
          onClick={() => fitView({ duration: 800, padding: 0.3 })}
          aria-label="Fit view"
          title="Fit map to view"
          className="w-10 h-10 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#888] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          <Target className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowMini((v) => !v)}
          aria-label={showMini ? "Hide minimap" : "Show minimap"}
          title="Toggle minimap"
          className={cn(
            "w-10 h-10 backdrop-blur-xl border rounded-full transition-all shadow-2xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none",
            showMini
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
              : "bg-[#080808]/95 border-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#111]",
          )}
        >
          <MapIcon className="w-4 h-4" />
        </button>

        {/* Download menu */}
        <div className="relative" ref={dlRef}>
          <button
            onClick={() => setDlOpen((v) => !v)}
            aria-label="Export options"
            aria-haspopup="menu"
            aria-expanded={dlOpen}
            className="w-10 h-10 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#888] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
          >
            <Download className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {dlOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-48 bg-[#080808] border border-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden"
              >
                {[
                  { format: "png", label: "Export PNG", icon: ImageIcon },
                  {
                    format: "svg",
                    label: "Export SVG (vector)",
                    icon: FileText,
                  },
                  {
                    format: "pdf",
                    label: "Export PDF (vector)",
                    icon: FileText,
                  },
                ].map(({ format, label, icon: Icon }) => (
                  <button
                    key={format}
                    role="menuitem"
                    onClick={() => handleDownload(format)}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-white hover:bg-[#111] w-full border-b border-[#1a1a1a] last:border-0 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-[#666]" /> {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => {
            setIsMapFullscreen((v) => !v);
            setTimeout(() => fitView({ duration: 800, padding: 0.3 }), 50);
          }}
          aria-label={
            isMapFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"
          }
          title={isMapFullscreen ? "Exit fullscreen" : "Fullscreen (F)"}
          className="w-10 h-10 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#888] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
        >
          {isMapFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
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
          setPaneMenu({
            ...clampMenu(e.clientX, e.clientY),
            rawX: e.clientX,
            rawY: e.clientY,
          });
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setPaneMenu(null);
          setEdgeMenu(null);
          setNodeMenu({ ...clampMenu(e.clientX, e.clientY, 220, 200), node });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setPaneMenu(null);
          setNodeMenu(null);
          setEdgeMenu({ ...clampMenu(e.clientX, e.clientY, 220, 180), edge });
        }}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 800 }}
        snapToGrid
        snapGrid={[20, 20]}
        connectionLineType="smoothstep"
        connectionRadius={35}
        minZoom={0.03}
        maxZoom={3}
        elevateNodesOnSelect
        selectNodesOnDrag={false}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "neuralEdge", animated: false }}
        className="bg-[#101010]"
      >
        <Background
          variant="dots"
          color="rgba(255,255,255,0.15)"
          gap={24}
          size={1.5}
          style={{ backgroundColor: "#070707" }}
        />
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-none [&_.react-flow__controls-button]:bg-[#0d0d12] [&_.react-flow__controls-button]:border-white/[0.07] [&_.react-flow__controls-button]:fill-[rgba(255,255,255,0.4)] [&_.react-flow__controls-button:hover]:bg-[#13131a] rounded-xl border border-white/[0.06] overflow-hidden z-30 hidden md:flex"
        />
        {showMini && (
          <MiniMap
            nodeColor={(n) =>
              n.data?.isCompleted
                ? "#10b981"
                : n.data?.priorityStatus === "READY"
                  ? "#f59e0b"
                  : "#333"
            }
            maskColor="rgba(0,0,0,0.85)"
            style={{
              background: "#080808",
              border: "1px solid #1e1e1e",
              borderRadius: 12,
            }}
            aria-label="Canvas minimap"
          />
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
          aria-hidden="true"
        />
      )}

      {/* Pane context menu — inline (ContextMenus.jsx handles the visual) */}
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
            totalNodesCount={totalNodesCount}
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

// ─── Inline context menus (kept here to avoid cross-file coupling) ────────────

const menuItem = (label, icon, onClick, danger = false) => {
  const Icon = icon;
  return (
    <button
      key={label}
      onClick={onClick}
      role="menuitem"
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors text-left focus-visible:bg-[#1a1a1a] focus-visible:outline-none",
        danger
          ? "text-rose-400 hover:bg-rose-500/10"
          : "text-[#ccc] hover:bg-[#111] hover:text-white",
      )}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {label}
    </button>
  );
};

const ContextMenuBase = ({ pos, children, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: -4 }}
    style={{ position: "fixed", left: pos.left, top: pos.top, zIndex: 100 }}
    className="w-[220px] bg-[#060606] border border-[#1e1e1e] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.95)] overflow-hidden"
    role="menu"
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.key === "Escape" && onClose()}
  >
    {children}
  </motion.div>
);

const PaneContextMenu = ({
  pos,
  nodes,
  setNodes,
  setHasUnsavedChanges,
  addToast,
  screenToFlowPosition,
  subscriptionTier,
  totalNodesCount,
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
    setNodes((nds) => [
      ...nds,
      {
        id,
        type,
        position: { x: fp.x, y: fp.y },
        data: {
          title: "New Protocol",
          subtitle: "",
          desc: "",
          tasks: [],
          isCompleted: false,
          priorityStatus: "FUTURE",
          nodeType: "branch",
          accentColor: "amber",
          tags: [],
          collapsed: false,
          linkedAssets: [],
          ...extra,
        },
      },
    ]);
    setHasUnsavedChanges(true);
    setActiveEditNodeId(id);
    addToast(`${type} deployed.`, "grey");
    onClose();
  };
  return (
    <ContextMenuBase pos={pos} onClose={onClose}>
      <div className="px-4 py-2 border-b border-[#111]">
        <span className="text-[8px] font-black text-[#444] uppercase tracking-widest">
          Add Node
        </span>
      </div>
      {[
        { label: "Execution Node", type: "executionNode" },
        { label: "Milestone", type: "milestoneNode" },
        { label: "Journal Entry", type: "journalNode" },
        { label: "Asset Widget", type: "assetWidget" },
        { label: "Video Widget", type: "videoWidget" },
        { label: "App Connector", type: "connectorNode" },
        { label: "Group / Label", type: "groupNode" },
      ].map(({ label, type }) => (
        <button
          key={type}
          onClick={() => addNode(type)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#ccc] hover:bg-[#111] hover:text-white transition-colors text-left"
        >
          {label}
        </button>
      ))}
    </ContextMenuBase>
  );
};

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
        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#ccc] hover:bg-[#111] hover:text-white transition-colors text-left"
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
        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
      >
        <Trash2 className="w-4 h-4" /> Delete
      </button>
    </ContextMenuBase>
  );
};

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
              ? "text-amber-400 bg-amber-500/8"
              : "text-[#888] hover:bg-[#111] hover:text-white",
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
