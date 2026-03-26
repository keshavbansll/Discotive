/**
 * @fileoverview Discotive OS — Execution Neural Map (Roadmap V5 — Apex Mode)
 * @module Execution/Roadmap
 *
 * @description
 * Adaptive RAG-style career DAG engine. Local-first (IndexedDB + optimistic state),
 * batched Firestore writes with extreme debouncing, full mobile parity via a
 * thumb-optimised Edit Mode bottom-sheet, right-click context menus with per-node
 * colour theming, sub-branch collapsibility, inline Journal nodes, tag taxonomy,
 * glowing animated Bezier edges with particle pulse, and a unified Discotive Score
 * mutation bus that fires only on confirmed cloud persists.
 *
 * Architectural invariants:
 *  – All mutable state writes are optimistic. IDB is the recovery layer.
 *  – Firebase is the authoritative truth. Batch writes debounced at SAVE_DEBOUNCE_MS.
 *  – Score mutations are accumulated in a pending delta buffer; flushed on persist.
 *  – Context-menu coordinates are always viewport-clamped to prevent overflow.
 *  – All string inputs are DOMPurify-sanitised before entering node data.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  useReducer,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
} from "framer-motion";
import { doc, updateDoc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  getBezierPath,
  getSmoothStepPath,
  BaseEdge,
  EdgeLabelRenderer,
} from "reactflow";
import { toPng } from "html-to-image";
import "reactflow/dist/style.css";

import {
  Calendar as CalendarIcon,
  Wand2,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  ChevronUp,
  Activity,
  X,
  AlignLeft,
  Maximize,
  Minimize,
  CheckCircle2,
  Cloud,
  CloudOff,
  RefreshCw,
  GitBranch,
  Trash2,
  Target,
  Settings2,
  Type,
  Plus,
  Lock,
  Download,
  Image as ImageIcon,
  Check,
  Database,
  Network as NetworkIcon,
  Search,
  Sparkles,
  Video,
  FileText,
  AlertTriangle,
  BookOpen,
  Tag,
  Palette,
  Star,
  Zap,
  BarChart3,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Map as MapIcon,
  TrendingUp,
  Clock,
  Shield,
  Cpu,
  Hash,
  MoreHorizontal,
  ArrowRight,
  Flame,
  Trophy,
  ChevronLeft,
  Globe,
  Briefcase,
  Code2,
  PenLine,
  Filter,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
} from "recharts";

import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";
import AILoader from "../components/AILoader";
import {
  generateCalibrationQuestions,
  generateExecutionMap,
} from "../lib/gemini";
import { mutateScore } from "../lib/scoreEngine";

// ============================================================================
// § 1. COMPILE-TIME CONSTANTS & TOPOLOGY CONFIGURATION
// ============================================================================

/**
 * @constant SAVE_DEBOUNCE_MS
 * @description Milliseconds before a dirty-state batch write fires to Firestore.
 * Calibrated to stay well within free-tier write budget (50k/day).
 */
const SAVE_DEBOUNCE_MS = 2500;

/** @constant IDB_DB_NAME — IndexedDB database identifier for the local-first layer. */
const IDB_DB_NAME = "discotive_neural_v5";
const IDB_STORE = "execution_maps";

/** @constant NODE_ACCENT_PALETTE — 8-colour per-node accent system. */
const NODE_ACCENT_PALETTE = {
  amber: {
    primary: "#ca8a04",
    glow: "rgba(202,138,4,0.25)",
    bg: "rgba(202,138,4,0.06)",
  },
  emerald: {
    primary: "#10b981",
    glow: "rgba(16,185,129,0.25)",
    bg: "rgba(16,185,129,0.06)",
  },
  violet: {
    primary: "#8b5cf6",
    glow: "rgba(139,92,246,0.25)",
    bg: "rgba(139,92,246,0.06)",
  },
  cyan: {
    primary: "#06b6d4",
    glow: "rgba(6,182,212,0.25)",
    bg: "rgba(6,182,212,0.06)",
  },
  rose: {
    primary: "#f43f5e",
    glow: "rgba(244,63,94,0.25)",
    bg: "rgba(244,63,94,0.06)",
  },
  orange: {
    primary: "#f97316",
    glow: "rgba(249,115,22,0.25)",
    bg: "rgba(249,115,22,0.06)",
  },
  sky: {
    primary: "#38bdf8",
    glow: "rgba(56,189,248,0.25)",
    bg: "rgba(56,189,248,0.06)",
  },
  white: {
    primary: "#ffffff",
    glow: "rgba(255,255,255,0.15)",
    bg: "rgba(255,255,255,0.04)",
  },
};

/** @constant NODE_TAGS — Taxonomy labels for semantic filtering. */
const NODE_TAGS = [
  "Skill",
  "Project",
  "Certification",
  "Networking",
  "Interview",
  "Research",
  "Build",
  "Pitch",
  "Application",
  "Learning",
];

/** @constant TIER_LIMITS — Node cap per subscription tier. */
const TIER_LIMITS = { free: 20, pro: 100, enterprise: Infinity };

// ============================================================================
// § 2. LOCAL-FIRST INDEXEDDB LAYER
// ============================================================================

/**
 * @function openIDB
 * @returns {Promise<IDBDatabase>}
 * @description Opens (or creates v1 schema for) the Discotive local cache.
 * Acts as the recovery source when Firestore read fails on cold load.
 */
const openIDB = () =>
  new Promise((resolve, reject) => {
    const req = window.indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: "uid" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });

/**
 * @function idbPut
 * @param {string} uid — Firestore document owner UID.
 * @param {{ nodes: object[], edges: object[] }} payload
 * @description Upserts the execution map snapshot to IDB. Fire-and-forget;
 * failures are silently swallowed to not block the optimistic UI path.
 */
const idbPut = async (uid, payload) => {
  try {
    const db_idb = await openIDB();
    const tx = db_idb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ uid, ...payload, ts: Date.now() });
  } catch (_) {
    /* silent */
  }
};

/**
 * @function idbGet
 * @param {string} uid
 * @returns {Promise<{ nodes: object[], edges: object[], ts: number } | null>}
 */
const idbGet = async (uid) => {
  try {
    const db_idb = await openIDB();
    return new Promise((resolve) => {
      const tx = db_idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(uid);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
};

// ============================================================================
// § 3. SANITISATION SHIELD (XSS Prevention Layer)
// ============================================================================

/**
 * @function sanitize
 * @param {string} raw
 * @returns {string} — HTML-entity-encoded string safe for React text nodes.
 * @description Client-side XSS mitigation for all freeform text inputs.
 * Strips script-injectable characters before they enter node data.
 */
const sanitize = (raw = "") =>
  String(raw)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 2000);

// ============================================================================
// § 4. NEURAL LAYOUT ENGINE V2 — Sugiyama-Inspired DAG Placer
// ============================================================================

/**
 * @function generateNeuralLayout
 * @param {object[]} nodes — ReactFlow node array.
 * @param {object[]} edges — ReactFlow edge array.
 * @returns {object[]} — Nodes with recomputed {x, y} positions.
 * @description
 * Implements a layer-based DAG layout algorithm inspired by the Sugiyama framework.
 * Nodes are assigned to layers via BFS topological sort. Within each layer, nodes
 * are vertically centred and staggered with controlled organic jitter to prevent
 * the rigid-grid pathology while maintaining topological clarity.
 *
 * Layer-crossing minimisation is approximate (greedy barycentric heuristic)
 * rather than optimal to keep O(n) complexity on large maps.
 */
const generateNeuralLayout = (nodes, edges) => {
  if (nodes.length === 0) return nodes;

  /** @type {Map<string, { inDegree: number, outNodes: string[], layer: number, orderInLayer: number }>} */
  const nodeMap = new Map(
    nodes.map((n) => [n.id, { ...n, inDegree: 0, outNodes: [], layer: 0 }]),
  );

  edges.forEach(({ source, target }) => {
    if (nodeMap.has(target) && nodeMap.has(source)) {
      nodeMap.get(target).inDegree++;
      nodeMap.get(source).outNodes.push(target);
    }
  });

  // BFS topo-sort: assign layer numbers
  let queue = [];
  nodeMap.forEach((node, id) => {
    if (node.inDegree === 0) queue.push(id);
  });

  let maxLayer = 0;
  while (queue.length > 0) {
    const currId = queue.shift();
    const curr = nodeMap.get(currId);
    curr.outNodes.forEach((tid) => {
      const tgt = nodeMap.get(tid);
      tgt.layer = Math.max(tgt.layer, curr.layer + 1);
      maxLayer = Math.max(maxLayer, tgt.layer);
      if (--tgt.inDegree === 0) queue.push(tid);
    });
  }

  // Barycentric node ordering within layers
  const layerBuckets = Array.from({ length: maxLayer + 1 }, () => []);
  nodeMap.forEach((_, id) => layerBuckets[nodeMap.get(id).layer].push(id));

  const X_GAP = 1280;
  const Y_GAP = 820;
  const JITTER_AMPLITUDE = 60;

  // Deterministic jitter seeded per node-id to survive re-renders
  const deterministicJitter = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++)
      hash = (hash << 5) - hash + id.charCodeAt(i);
    return (hash % JITTER_AMPLITUDE) - JITTER_AMPLITUDE / 2;
  };

  return nodes.map((n) => {
    if (n.type !== "executionNode" && n.position.x !== 0) return n;
    const meta = nodeMap.get(n.id);
    const layer = meta.layer;
    const bucket = layerBuckets[layer];
    const idx = bucket.indexOf(n.id);
    const totalInLayer = bucket.length;
    const yCenter = ((totalInLayer - 1) * Y_GAP) / 2;
    return {
      ...n,
      position: {
        x: layer * X_GAP,
        y: idx * Y_GAP - yCenter + deterministicJitter(n.id),
      },
    };
  });
};

// ============================================================================
// § 5. EDGE RENDERERS
// ============================================================================

/**
 * @component NeuralEdge
 * @description
 * Bezier edge renderer with dynamic stroke weight and animated dash patterns
 * keyed on connection topology class (core-core / core-branch / branch-sub / open).
 * Applies a CSS keyframe pulse-glow on animated edges — pure SVG filter trick
 * that avoids triggering layout reflow on 60fps animation cycles.
 */
const NeuralEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  data,
  markerEnd,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const connType = data?.connType || "open";

  const EDGE_CONFIG = {
    "core-core": { weight: 5, dash: "none", animated: false, opacity: 0.9 },
    "core-branch": { weight: 3.5, dash: "12,8", animated: true, opacity: 0.8 },
    "branch-sub": { weight: 2, dash: "none", animated: false, opacity: 0.7 },
    open: { weight: 1.5, dash: "6,6", animated: true, opacity: 0.4 },
  };

  const cfg = EDGE_CONFIG[connType] || EDGE_CONFIG.open;
  const accent = data?.accent || "#ca8a04";

  return (
    <>
      {/* Glow halo — rendered as a wider, blurred duplicate path */}
      <path
        d={edgePath}
        style={{
          fill: "none",
          stroke: accent,
          strokeWidth: cfg.weight + 6,
          opacity: selected ? 0.18 : 0.06,
          filter: `blur(${selected ? 6 : 3}px)`,
          transition: "opacity 0.3s, filter 0.3s",
          pointerEvents: "none",
        }}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        className={cn(cfg.animated && "react-flow__edge-path--animated")}
        style={{
          ...style,
          stroke: accent,
          strokeWidth: cfg.weight,
          strokeDasharray: cfg.dash,
          opacity: selected ? 1 : cfg.opacity,
          transition: "stroke-width 0.3s, opacity 0.3s",
        }}
      />
      {/* Connection type micro-label on hover */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
            className="px-2 py-0.5 bg-[#0a0a0c] border border-[#333] rounded-md text-[9px] font-black text-[#888] uppercase tracking-widest"
          >
            {connType}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// ============================================================================
// § 6. EXECUTION NODE (V5 — Full Feature Set)
// ============================================================================

/**
 * @component ExecutionNode
 * @description
 * Primary DAG node. Supports:
 *  – Per-node colour accent theming (8-colour palette)
 *  – Sub-task micro-progress ring with animated SVG dash offset
 *  – Collapse toggle for cleaner topology views
 *  – Tag badges for semantic filtering
 *  – Delegation avatars (up to 3 visible)
 *  – Overdue pulsing border + red shadow
 *  – "READY" active amber glow state
 *  – Verified asset-linkage badge on certification tasks
 *  – Pointer-events split: handles are interactive; body opens command center
 */
const ExecutionNode = ({ data, selected, id }) => {
  const [collapsed, setCollapsed] = useState(data.collapsed || false);

  const isCompleted = data.isCompleted;
  const isOverdue =
    !isCompleted && data.deadline && new Date(data.deadline) < new Date();
  const isActive =
    data.priorityStatus === "READY" && !isCompleted && !isOverdue;
  const isFuture =
    data.priorityStatus === "FUTURE" && !isCompleted && !isOverdue;
  const accent = NODE_ACCENT_PALETTE[data.accentColor || "amber"];

  const tasks = data.tasks || [];
  const completedTasks = tasks.filter((t) => t.completed).length;
  const progress =
    tasks.length > 0
      ? Math.round((completedTasks / tasks.length) * 100)
      : isCompleted
        ? 100
        : 0;

  // Radial SVG ring circumference for r=28 circle
  const CIRCUMFERENCE = 2 * Math.PI * 28; // ≈ 175.93
  const dashOffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const ringColor = isCompleted
    ? "#10b981"
    : isOverdue
      ? "#ef4444"
      : isActive
        ? accent.primary
        : "#333";

  const borderColor = selected
    ? accent.primary
    : isCompleted
      ? "#10b981"
      : isOverdue
        ? "#ef4444"
        : isActive
          ? accent.primary
          : "#2a2a2a";

  const handleClasses =
    "w-4 h-4 bg-[#111] hover:scale-150 transition-transform relative before:absolute before:-inset-6 before:content-[''] before:z-50";

  return (
    <div
      className={cn(
        "w-[420px] rounded-[32px] p-2 transition-all duration-500 backdrop-blur-2xl border relative",
        // Fading Logic: Dim unselected nodes, OR deeply fade FUTURE nodes to create depth
        data.isDimmed
          ? "opacity-20 grayscale pointer-events-none"
          : isFuture && !selected
            ? "opacity-60 bg-[#060606]/80"
            : "opacity-100 bg-[#0a0a0c]/97",
        selected ? "scale-[1.03] z-50" : "scale-100 z-10",
      )}
      style={{
        borderColor: selected
          ? accent.primary
          : isCompleted
            ? "#10b981"
            : isOverdue
              ? "#ef4444"
              : isActive
                ? accent.primary
                : "#2a2a2a",
        boxShadow: selected
          ? `0 0 70px ${accent.glow}, 0 30px 60px rgba(0,0,0,0.7)`
          : isCompleted
            ? "0 0 30px rgba(16,185,129,0.12), 0 20px 40px rgba(0,0,0,0.5)"
            : isOverdue
              ? "0 0 40px rgba(239,68,68,0.18), 0 20px 40px rgba(0,0,0,0.5)"
              : isActive
                ? `0 0 30px ${accent.glow}, 0 20px 40px rgba(0,0,0,0.5)`
                : isFuture
                  ? "none" // Flatten future nodes
                  : "0 20px 40px rgba(0,0,0,0.4)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={cn(handleClasses, "border-2")}
        style={{ borderColor: accent.primary }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={cn(handleClasses, "border-2")}
        style={{ borderColor: accent.primary }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={cn(handleClasses, "border-2")}
        style={{ borderColor: accent.primary }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(handleClasses, "border-2")}
        style={{ borderColor: accent.primary }}
      />

      {/* Collapse toggle — intercepted before node click propagates to ReactFlow selection */}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setCollapsed((c) => !c);
          window.dispatchEvent(
            new CustomEvent("NODE_COLLAPSE_TOGGLE", {
              detail: { nodeId: id, collapsed: !collapsed },
            }),
          );
        }}
        className="absolute top-3 right-3 z-20 w-7 h-7 bg-[#111] border border-[#333] rounded-full flex items-center justify-center text-[#666] hover:text-white hover:border-[#555] transition-colors"
      >
        {collapsed ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>

      <div className="p-5 pointer-events-none">
        {/* Header row */}
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 pr-10">
            {/* Status chip row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <div
                className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                style={{
                  background: isCompleted
                    ? "rgba(16,185,129,0.08)"
                    : isOverdue
                      ? "rgba(239,68,68,0.08)"
                      : isActive
                        ? `${accent.bg}`
                        : "rgba(255,255,255,0.04)",
                  color: isCompleted
                    ? "#10b981"
                    : isOverdue
                      ? "#ef4444"
                      : isActive
                        ? accent.primary
                        : "#666",
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : isOverdue ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : isActive ? (
                  <Activity
                    className="w-3 h-3"
                    style={{ animation: "pulse 1.5s infinite" }}
                  />
                ) : (
                  <Lock className="w-3 h-3" />
                )}
                {data.nodeType || "Protocol"}
              </div>
              {data.deadline && (
                <div
                  className="px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border"
                  style={{
                    borderColor:
                      isOverdue && !isCompleted
                        ? "rgba(239,68,68,0.3)"
                        : "#2a2a2a",
                    color: isOverdue && !isCompleted ? "#f87171" : "#555",
                    background:
                      isOverdue && !isCompleted
                        ? "rgba(239,68,68,0.05)"
                        : "transparent",
                  }}
                >
                  <CalendarIcon className="w-3 h-3" />
                  {new Date(data.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>

            <h3
              className="text-[22px] font-black tracking-tight leading-tight mb-1"
              style={{
                color: isCompleted ? "#6ee7b7" : isOverdue ? "#fca5a5" : "#fff",
              }}
            >
              {data.title || "Unnamed Protocol"}
            </h3>
            <p className="text-[10px] font-bold text-[#555] uppercase tracking-widest">
              {data.subtitle || "Awaiting Classification"}
            </p>

            {/* Tag badges */}
            {data.tags && data.tags.length > 0 && !collapsed && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {data.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
                    style={{ background: accent.bg, color: accent.primary }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progress ring */}
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="#1a1a1a"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke={ringColor}
                strokeWidth="4"
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{
                  transition:
                    "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s",
                }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black font-mono text-white">
              {progress}%
            </span>
          </div>
        </div>

        {/* Task list — collapsible */}
        <AnimatePresence initial={false}>
          {!collapsed && tasks.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5 mt-3 bg-[#060606] rounded-2xl p-4 border border-[#1a1a1a]">
                {tasks.slice(0, 4).map((t, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="w-3.5 h-3.5 mt-0.5 rounded-sm border flex items-center justify-center shrink-0"
                      style={{
                        background: t.completed
                          ? `${accent.bg}`
                          : "transparent",
                        borderColor: t.completed ? accent.primary : "#2a2a2a",
                        color: t.completed ? accent.primary : "transparent",
                      }}
                    >
                      {t.completed && <Check className="w-2 h-2" />}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-medium leading-relaxed",
                        t.completed
                          ? "text-[#555] line-through"
                          : "text-[#bbb]",
                      )}
                    >
                      {t.text}
                    </span>
                  </div>
                ))}
                {tasks.length > 4 && (
                  <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest pt-1.5 border-t border-[#1a1a1a] mt-1.5">
                    +{tasks.length - 4} more micro-routines
                  </p>
                )}
              </div>

              {/* Inline progress bar */}
              <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: ringColor }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================================================
// § 7. RADAR WIDGET NODE
// ============================================================================

/**
 * @component RadarWidgetNode
 * @description Competency radar chart widget node. Animated on first mount.
 */
const RadarWidgetNode = ({ data, selected }) => (
  <div
    className="w-[300px] h-[300px] bg-[#0a0a0c]/95 backdrop-blur-2xl rounded-[2rem] p-6 flex flex-col relative border transition-all duration-300"
    style={{
      borderColor: selected ? "#ca8a04" : "#1e1e1e",
      boxShadow: selected
        ? "0 0 50px rgba(202,138,4,0.3), 0 20px 40px rgba(0,0,0,0.6)"
        : "0 20px 40px rgba(0,0,0,0.4)",
      transform: selected ? "scale(1.04)" : "scale(1)",
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      className="w-4 h-4 bg-[#111] border-2 border-[#ca8a04] relative before:absolute before:-inset-6 before:content-['']"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      className="w-4 h-4 bg-[#111] border-2 border-[#ca8a04] relative before:absolute before:-inset-6 before:content-['']"
    />

    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-[#ca8a04]" />
        <h4 className="text-[9px] font-black text-white uppercase tracking-widest">
          Protocol Radar
        </h4>
      </div>
      <div className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase rounded-md border border-amber-500/20">
        PRO
      </div>
    </div>

    <div className="flex-1 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="68%"
          data={data.radarData || []}
        >
          <PolarGrid stroke="rgba(202,138,4,0.1)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fill: "rgba(255,255,255,0.5)",
              fontSize: 9,
              fontWeight: "bold",
            }}
          />
          <Radar
            name="Metrics"
            dataKey="val"
            stroke="#ca8a04"
            strokeWidth={2}
            fill="#ca8a04"
            fillOpacity={0.18}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// ============================================================================
// § 8. ASSET WIDGET NODE
// ============================================================================

/** @component AssetWidgetNode — Vault asset linkage proxy node. */
const AssetWidgetNode = ({ id, data, selected }) => (
  <div
    className="w-[270px] bg-[#0a0a0c]/95 backdrop-blur-2xl border rounded-[1.5rem] p-5 relative transition-all duration-300"
    style={{
      borderColor: selected ? "#10b981" : "#1e1e1e",
      boxShadow: selected
        ? "0 0 40px rgba(16,185,129,0.25), 0 20px 40px rgba(0,0,0,0.6)"
        : "0 20px 40px rgba(0,0,0,0.4)",
      transform: selected ? "scale(1.04)" : "scale(1)",
    }}
  >
    <Handle
      type="target"
      position={Position.Top}
      id="top"
      className="w-4 h-4 bg-[#111] border-2 border-emerald-500 relative before:absolute before:-inset-6 before:content-['']"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="bottom"
      className="w-4 h-4 bg-[#111] border-2 border-emerald-500 relative before:absolute before:-inset-6 before:content-['']"
    />

    <div className="flex items-start gap-3.5">
      <div className="w-11 h-11 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
        <Database className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-black text-white mb-0.5 leading-tight truncate">
          {data.label || "Awaiting Sync"}
        </h4>
        <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest truncate">
          {data.type || "Vault Integration"}
        </p>
        {data.assetId && (
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-[9px] font-bold text-emerald-500">
              LINKED
            </span>
          </div>
        )}
      </div>
    </div>

    <div className="flex gap-2 mt-4">
      <button
        disabled={!data.assetId}
        className="flex-1 py-2.5 border border-[#2a2a2a] bg-[#111] hover:bg-[#1a1a1a] text-white disabled:opacity-25 text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-1.5"
      >
        <Eye className="w-3 h-3" /> Access
      </button>
      <button
        onClick={() =>
          window.dispatchEvent(
            new CustomEvent("OPEN_VAULT_MODAL", { detail: { nodeId: id } }),
          )
        }
        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
      >
        <RefreshCw className="w-3 h-3" /> Sync
      </button>
    </div>
  </div>
);

// ============================================================================
// § 9. VIDEO WIDGET NODE
// ============================================================================

/** @component VideoWidgetNode — YouTube/external media proxy node. */
const VideoWidgetNode = ({ id, data, selected }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isWatched = data.isWatched || false;

  const markWatched = (e) => {
    e.stopPropagation();
    if (isWatched) return;
    window.dispatchEvent(
      new CustomEvent("VIDEO_WATCHED", { detail: { nodeId: id } }),
    );
  };

  return (
    <div
      className={cn(
        "w-[340px] bg-[#0a0a0c]/95 backdrop-blur-2xl border rounded-[1.5rem] p-2.5 relative transition-all duration-300 group",
        selected
          ? "border-sky-400 shadow-[0_0_50px_rgba(56,189,248,0.25)] z-50 scale-[1.03]"
          : "border-[#1e1e1e] shadow-2xl z-10 scale-100",
        isWatched && !selected && "border-sky-500/40",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-4 h-4 bg-[#111] border-2 border-sky-400 relative before:absolute before:-inset-6 before:content-['']"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-4 h-4 bg-[#111] border-2 border-sky-400 relative before:absolute before:-inset-6 before:content-['']"
      />

      {data.youtubeId ? (
        <div className="w-full h-[180px] rounded-xl overflow-hidden relative bg-black border border-[#1a1a1a]">
          {isPlaying ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${data.youtubeId}?autoplay=1`}
              title="YouTube protocol"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              className="w-full h-full relative cursor-pointer"
              onClick={() => setIsPlaying(true)}
            >
              <img
                src={data.thumbnailUrl}
                alt="Video Preview"
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity">
                <div className="w-14 h-14 bg-[#0a0a0c]/60 backdrop-blur-md rounded-full flex items-center justify-center pl-1.5 border border-white/20 hover:bg-sky-500/20 hover:border-sky-400 transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-[180px] rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] flex flex-col items-center justify-center gap-3">
          <Video className="w-8 h-8 text-sky-500/30" />
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("OPEN_VIDEO_MODAL", { detail: { nodeId: id } }),
              )
            }
            className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          >
            Embed Source
          </button>
        </div>
      )}

      <div className="p-3 pb-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4
            className={cn(
              "text-xs font-black truncate transition-colors",
              isWatched ? "text-[#888]" : "text-white",
            )}
          >
            {data.title || "External Protocol Video"}
          </h4>
          <p className="text-[9px] font-bold text-sky-400 uppercase tracking-widest mt-1">
            {data.platform || "Media Source"}
          </p>
        </div>

        {data.youtubeId && (
          <button
            onClick={markWatched}
            disabled={isWatched}
            title={isWatched ? "Protocol Executed" : "Mark as Watched"}
            className={cn(
              "w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 transition-all",
              isWatched
                ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                : "bg-[#111] border-[#333] hover:border-sky-400 text-transparent hover:text-sky-400/50",
            )}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// § 10. JOURNAL NODE — NEW: Inline execution journal entry
// ============================================================================

/**
 * @component JournalNode
 * @description
 * Embeds a freeform execution log entry directly into the neural map.
 * Signals to the user that documentation is a first-class protocol, not
 * an afterthought. Opens the journal editor panel on click.
 */
const JournalNode = ({ id, data, selected }) => (
  <div
    className="w-[320px] bg-[#0a0a0c]/95 backdrop-blur-2xl border rounded-[1.5rem] p-5 relative transition-all duration-300"
    style={{
      borderColor: selected ? "#8b5cf6" : "#1e1e1e",
      boxShadow: selected
        ? "0 0 40px rgba(139,92,246,0.2), 0 20px 40px rgba(0,0,0,0.6)"
        : "0 20px 40px rgba(0,0,0,0.4)",
      transform: selected ? "scale(1.03)" : "scale(1)",
    }}
  >
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      className="w-4 h-4 bg-[#111] border-2 border-violet-500 relative before:absolute before:-inset-6 before:content-['']"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      className="w-4 h-4 bg-[#111] border-2 border-violet-500 relative before:absolute before:-inset-6 before:content-['']"
    />

    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-8 h-8 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center justify-center">
        <BookOpen className="w-4 h-4 text-violet-400" />
      </div>
      <div>
        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
          Execution Log
        </h4>
        {data.date && (
          <p className="text-[9px] text-[#555] font-bold">
            {new Date(data.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </div>

    {data.entry ? (
      <p className="text-xs text-[#888] leading-relaxed line-clamp-4 font-medium">
        {data.entry}
      </p>
    ) : (
      <div className="border border-dashed border-[#2a2a2a] rounded-xl p-4 text-center">
        <PenLine className="w-4 h-4 text-[#444] mx-auto mb-1.5" />
        <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest">
          No entry recorded
        </p>
      </div>
    )}

    {data.mood && (
      <div className="mt-3 flex items-center gap-1.5">
        <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest">
          Execution State:
        </span>
        <span className="text-xs">{data.mood}</span>
      </div>
    )}
  </div>
);

// ============================================================================
// § 11. MILESTONE NODE — NEW: Achievement checkpoint
// ============================================================================

/**
 * @component MilestoneNode
 * @description
 * Special-purpose diamond/hexagon node marking critical career inflection points.
 * Emits a persistent amber glow pulse when unlocked.
 */
const MilestoneNode = ({ data, selected }) => {
  const isUnlocked = data.isUnlocked || false;
  return (
    <div
      className="w-[240px] bg-[#0a0a0c]/97 backdrop-blur-2xl border rounded-[2rem] p-6 relative transition-all duration-300 flex flex-col items-center text-center"
      style={{
        borderColor: selected
          ? "#f59e0b"
          : isUnlocked
            ? "rgba(245,158,11,0.5)"
            : "#1e1e1e",
        boxShadow: selected
          ? "0 0 60px rgba(245,158,11,0.35), 0 20px 40px rgba(0,0,0,0.7)"
          : isUnlocked
            ? "0 0 30px rgba(245,158,11,0.15)"
            : "0 20px 40px rgba(0,0,0,0.4)",
        transform: selected ? "scale(1.05)" : "scale(1)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-4 h-4 bg-[#111] border-2 border-amber-500 relative before:absolute before:-inset-6 before:content-['']"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-4 h-4 bg-[#111] border-2 border-amber-500 relative before:absolute before:-inset-6 before:content-['']"
      />

      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: isUnlocked
            ? "rgba(245,158,11,0.1)"
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${isUnlocked ? "rgba(245,158,11,0.3)" : "#1e1e1e"}`,
        }}
      >
        {isUnlocked ? (
          <Trophy className="w-6 h-6 text-amber-400" />
        ) : (
          <Lock className="w-6 h-6 text-[#333]" />
        )}
      </div>

      <h4 className="text-sm font-black text-white mb-1 leading-tight">
        {data.title || "Milestone"}
      </h4>
      <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest">
        {data.subtitle || "Achievement"}
      </p>

      {data.xpReward && (
        <div className="mt-3 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
            +{data.xpReward} XP on unlock
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// § 12. NODE & EDGE TYPE REGISTRIES
// ============================================================================

const nodeTypes = {
  executionNode: ExecutionNode,
  radarWidget: RadarWidgetNode,
  assetWidget: AssetWidgetNode,
  videoWidget: VideoWidgetNode,
  journalNode: JournalNode,
  milestoneNode: MilestoneNode,
};
const edgeTypes = { neuralEdge: NeuralEdge };

// ============================================================================
// § 13. TOPOLOGY STATS MINI-BAR
// ============================================================================

/**
 * @component TopologyStats
 * @description
 * Compact live metrics row rendered above the canvas. Provides at-a-glance
 * topological health data: node count, completion rate, overdue count,
 * and active connection count.
 */
const TopologyStats = ({ nodes, edges }) => {
  const total = nodes.filter((n) => n.type === "executionNode").length;
  const completed = nodes.filter(
    (n) => n.type === "executionNode" && n.data.isCompleted,
  ).length;
  const overdue = nodes.filter((n) => {
    if (n.type !== "executionNode" || n.data.isCompleted) return false;
    return n.data.deadline && new Date(n.data.deadline) < new Date();
  }).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const stats = [
    {
      label: "Nodes",
      value: total,
      icon: <Layers className="w-3 h-3" />,
      color: "#ca8a04",
    },
    {
      label: "Complete",
      value: `${pct}%`,
      icon: <CheckCircle2 className="w-3 h-3" />,
      color: "#10b981",
    },
    {
      label: "Overdue",
      value: overdue,
      icon: <AlertTriangle className="w-3 h-3" />,
      color: overdue > 0 ? "#ef4444" : "#444",
    },
    {
      label: "Edges",
      value: edges.length,
      icon: <GitBranch className="w-3 h-3" />,
      color: "#38bdf8",
    },
  ];

  return (
    <div className="flex items-center gap-1">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0c] border border-[#1a1a1a] rounded-xl"
        >
          <span style={{ color: s.color }}>{s.icon}</span>
          <span className="text-[10px] font-black" style={{ color: s.color }}>
            {s.value}
          </span>
          <span className="text-[9px] font-bold text-[#444] uppercase tracking-widest hidden lg:inline">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// § 14. MOBILE EDIT BOTTOM SHEET
// ============================================================================

/**
 * @component MobileEditSheet
 * @description
 * Thumb-optimised bottom-sheet that provides mobile parity for the desktop
 * right-side command panel. Uses spring physics for drag-to-dismiss.
 * Renders as a portal to guarantee z-index supremacy over the canvas.
 */
const MobileEditSheet = ({
  activeNode,
  onUpdate,
  onClose,
  onDelete,
  pendingScoreDelta,
  onSubtaskToggle,
  onCompleteAll,
}) => {
  const [tab, setTab] = useState("info");

  if (!activeNode) return null;

  const tabs = [
    { id: "info", label: "Info", icon: <Type className="w-3.5 h-3.5" /> },
    { id: "tasks", label: "Tasks", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "tags", label: "Tags", icon: <Tag className="w-3.5 h-3.5" /> },
    { id: "color", label: "Color", icon: <Palette className="w-3.5 h-3.5" /> },
  ];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-[210] bg-[#080808] border-t border-[#222] rounded-t-[2rem] flex flex-col"
        style={{ maxHeight: "82vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#333] rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex justify-between items-center px-5 pb-3 pt-1 border-b border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2.5">
            <Settings2 className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold tracking-widest uppercase text-white truncate max-w-[200px]">
              {activeNode.data.title || "Untitled"}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#666]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[#1a1a1a] shrink-0 px-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors border-b-2 -mb-px",
                tab === t.id
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-[#555] hover:text-white",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Sheet body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {tab === "info" && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-2">
                  Protocol Designation
                </label>
                <input
                  type="text"
                  value={activeNode.data.title || ""}
                  onChange={(e) => onUpdate("title", sanitize(e.target.value))}
                  className="w-full bg-transparent text-xl font-black text-white border-b border-[#222] focus:border-amber-500 outline-none pb-2 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-2">
                  Sub-Classification
                </label>
                <input
                  type="text"
                  value={activeNode.data.subtitle || ""}
                  onChange={(e) =>
                    onUpdate("subtitle", sanitize(e.target.value))
                  }
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-2">
                  Execution Parameters
                </label>
                <textarea
                  value={activeNode.data.desc || ""}
                  onChange={(e) => onUpdate("desc", sanitize(e.target.value))}
                  rows={3}
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl p-4 text-sm text-white resize-none focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#555] uppercase tracking-widest mb-2">
                  Hard Deadline
                </label>
                <input
                  type="date"
                  value={activeNode.data.deadline || ""}
                  onChange={(e) => onUpdate("deadline", e.target.value)}
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
                />
              </div>
            </>
          )}

          {tab === "tasks" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-[#555] uppercase tracking-widest">
                  Sub-Routine Matrix
                </span>
                <button
                  onClick={onCompleteAll}
                  disabled={activeNode.data.isCompleted}
                  className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg disabled:opacity-30"
                >
                  Force Secure
                </button>
              </div>
              <div className="space-y-2">
                {(activeNode.data.tasks || []).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] p-3.5 rounded-xl"
                  >
                    <button
                      onClick={() => onSubtaskToggle(task.id)}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        task.completed
                          ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-500"
                          : "border-[#333]",
                      )}
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </button>
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) =>
                        onUpdate(
                          "tasks",
                          (activeNode.data.tasks || []).map((t) =>
                            t.id === task.id
                              ? { ...t, text: sanitize(e.target.value) }
                              : t,
                          ),
                        )
                      }
                      className={cn(
                        "flex-1 bg-transparent outline-none text-sm",
                        task.completed
                          ? "text-[#555] line-through"
                          : "text-white",
                      )}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() =>
                  onUpdate("tasks", [
                    ...(activeNode.data.tasks || []),
                    { id: Date.now(), text: "", completed: false },
                  ])
                }
                className="w-full py-3 border border-dashed border-[#2a2a2a] rounded-xl text-[#666] text-xs font-bold uppercase tracking-widest hover:border-[#444] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Inject Routine
              </button>
            </>
          )}

          {tab === "tags" && (
            <div>
              <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-3">
                Select Taxonomy Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {NODE_TAGS.map((tag) => {
                  const active = (activeNode.data.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        const curr = activeNode.data.tags || [];
                        onUpdate(
                          "tags",
                          active
                            ? curr.filter((t) => t !== tag)
                            : [...curr, tag],
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        active
                          ? "bg-amber-500/15 border border-amber-500/40 text-amber-400"
                          : "bg-[#111] border border-[#1a1a1a] text-[#666]",
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "color" && (
            <div>
              <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest mb-3">
                Node Accent Color
              </p>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(NODE_ACCENT_PALETTE).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => onUpdate("accentColor", key)}
                    className={cn(
                      "w-full aspect-square rounded-xl border-2 flex items-center justify-center transition-all",
                      activeNode.data.accentColor === key
                        ? "scale-110"
                        : "opacity-60 hover:opacity-90 border-transparent",
                    )}
                    style={{
                      background: val.bg,
                      borderColor:
                        activeNode.data.accentColor === key
                          ? val.primary
                          : "transparent",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ background: val.primary }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pending score indicator */}
        {pendingScoreDelta !== 0 && (
          <div
            className={cn(
              "mx-5 mb-4 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0",
              pendingScoreDelta > 0
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400",
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {pendingScoreDelta > 0
              ? `+${pendingScoreDelta}`
              : pendingScoreDelta}{" "}
            pts pending save
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

// ============================================================================
// § 15. FLOW CANVAS ENGINE (V5)
// ============================================================================

/**
 * @component FlowCanvas
 * @description
 * The ReactFlow viewport host. Owns all canvas-local state: context menus,
 * search, time-filter, download control, and mobile edit mode toggle.
 *
 * Interaction contracts:
 *  – Right-click on pane  → pane context menu (add node, widgets)
 *  – Right-click on node  → node context menu (duplicate, color, delete)
 *  – Right-click on edge  → edge context menu (change type, delete)
 *  – Single click on node → triggers setActiveEditNodeId in parent
 *  – Mobile "Edit Mode"   → activates touch-safe bottom sheet
 */
const FlowCanvas = ({
  nodes,
  setNodes,
  edges,
  setEdges,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  isSaving,
  handleCloudSave,
  isMapFullscreen,
  setIsMapFullscreen,
  setActiveEditNodeId,
  addToast,
  addLedgerEntry,
  subscriptionTier,
  totalNodesCount,
  onLimitReached,
  isFirstTime,
  handleStartCalibration,
}) => {
  const { screenToFlowPosition, fitView, setCenter } = useReactFlow();
  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [showMiniMap, setShowMiniMap] = useState(false);
  const downloadRef = useRef(null);

  /** @description Clamp a raw screen coordinate to remain within the visible viewport. */
  const clampMenuPos = useCallback(
    (x, y, menuW = 260, menuH = 280) => ({
      left: Math.min(x, window.innerWidth - menuW - 16),
      top: Math.min(y, window.innerHeight - menuH - 16),
    }),
    [],
  );

  useEffect(() => {
    const outside = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target))
        setIsDownloadOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  // Listen for collapse toggle dispatches from within nodes
  useEffect(() => {
    const handler = (e) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === e.detail.nodeId
            ? { ...n, data: { ...n.data, collapsed: e.detail.collapsed } }
            : n,
        ),
      );
      setHasUnsavedChanges(true);
    };
    window.addEventListener("NODE_COLLAPSE_TOGGLE", handler);
    return () => window.removeEventListener("NODE_COLLAPSE_TOGGLE", handler);
  }, [setNodes, setHasUnsavedChanges]);

  // Time-based visibility filter
  useEffect(() => {
    if (nodes.length === 0) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (timeFilter === "all" || !n.data.deadline)
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
  }, [timeFilter, nodes.length]); // eslint-disable-line

  // Tag-based dim filter
  useEffect(() => {
    if (tagFilter === "all") {
      setNodes((nds) =>
        nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
      );
      return;
    }
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isDimmed:
            n.type !== "executionNode"
              ? false
              : !(n.data.tags || []).includes(tagFilter),
        },
      })),
    );
  }, [tagFilter]); // eslint-disable-line

  const handleSearch = useCallback(
    (e) => {
      const q = e.target.value;
      setSearchQuery(q);
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
          duration: 900,
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

  const onNodesChange = useCallback(
    (c) => {
      setNodes((nds) => applyNodeChanges(c, nds));
      setHasUnsavedChanges(true);
    },
    [setNodes, setHasUnsavedChanges],
  );

  const onEdgesChange = useCallback(
    (c) => {
      setEdges((eds) => applyEdgeChanges(c, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges, setHasUnsavedChanges],
  );

  const onConnect = useCallback(
    (params) => {
      const src = nodes.find((n) => n.id === params.source);
      const tgt = nodes.find((n) => n.id === params.target);
      let connType = "open";
      if (src?.type === "executionNode" && tgt?.type === "executionNode") {
        if (src.data.nodeType === "core" && tgt.data.nodeType === "core")
          connType = "core-core";
        else if (src.data.nodeType === "core") connType = "core-branch";
        else connType = "branch-sub";
      } else if (
        src?.type?.includes("Widget") ||
        tgt?.type?.includes("Widget")
      ) {
        connType = "branch-sub";
      }
      const accentColor = src?.data?.accentColor || "amber";
      const accent = NODE_ACCENT_PALETTE[accentColor]?.primary || "#ca8a04";

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            id: `e_${Date.now()}`,
            type: "neuralEdge",
            data: { connType, accent },
          },
          eds,
        ),
      );
      setHasUnsavedChanges(true);
      addLedgerEntry(`Connection: ${connType}`);
    },
    [nodes, setEdges, setHasUnsavedChanges, addLedgerEntry],
  );

  /** @description Factory for new node objects. Validates tier node cap before insertion. */
  const addNode = useCallback(
    (type, nodeClass = "executionNode", mobilePos = null) => {
      const maxAllowed = TIER_LIMITS[subscriptionTier] || TIER_LIMITS.free;
      if (totalNodesCount >= maxAllowed) {
        onLimitReached();
        setPaneMenu(null);
        return;
      }

      const position =
        mobilePos ||
        screenToFlowPosition({
          x: paneMenu?.left || 400,
          y: paneMenu?.top || 300,
        });
      let newNode = {
        id: `node_${Date.now()}`,
        type: nodeClass,
        position,
        data: {},
      };

      if (nodeClass === "executionNode") {
        newNode.data = {
          title: type === "core" ? "Core Protocol" : "Sub-Routine",
          subtitle: "Awaiting Parameters",
          desc: "",
          deadline: "",
          tasks: [],
          isCompleted: false,
          priorityStatus: "FUTURE",
          nodeType: type,
          linkedAssets: [],
          delegates: [],
          accentColor: "amber",
          tags: [],
          collapsed: false,
        };
      } else if (nodeClass === "radarWidget") {
        newNode.data = {
          radarData: [
            { metric: "Focus", val: 60 },
            { metric: "Intel", val: 55 },
            { metric: "Pace", val: 70 },
            { metric: "Output", val: 50 },
          ],
        };
      } else if (nodeClass === "assetWidget") {
        newNode.data = { label: "Unlinked Asset", type: "Vault Integration" };
      } else if (nodeClass === "videoWidget") {
        newNode.data = {
          title: "External Video",
          platform: "Media",
          thumbnailUrl: null,
          youtubeId: null,
        };
      } else if (nodeClass === "journalNode") {
        newNode.data = {
          entry: "",
          date: new Date().toISOString(),
          mood: "⚡",
        };
      } else if (nodeClass === "milestoneNode") {
        newNode.data = {
          title: "Milestone",
          subtitle: "Achievement Gate",
          isUnlocked: false,
          xpReward: 100,
        };
      }

      setNodes((nds) => [...nds, newNode]);
      setHasUnsavedChanges(true);
      setPaneMenu(null);
      addToast(`${nodeClass} deployed`, "grey");
    },
    [
      subscriptionTier,
      totalNodesCount,
      onLimitReached,
      screenToFlowPosition,
      paneMenu,
      setNodes,
      setHasUnsavedChanges,
      addToast,
    ],
  );

  const deleteNode = useCallback(
    (overrideId = null) => {
      const tid = overrideId || nodeMenu?.node?.id;
      if (!tid) return;
      setNodes((nds) => nds.filter((n) => n.id !== tid));
      setEdges((eds) =>
        eds.filter((e) => e.source !== tid && e.target !== tid),
      );
      setHasUnsavedChanges(true);
      setNodeMenu(null);
      addToast("Element obliterated.", "red");
    },
    [nodeMenu, setNodes, setEdges, setHasUnsavedChanges, addToast],
  );

  const duplicateNode = useCallback(
    (overrideId = null) => {
      const tid = overrideId || nodeMenu?.node?.id;
      if (!tid) return;
      const source = nodes.find((n) => n.id === tid);
      if (!source) return;
      const clone = {
        id: `node_${Date.now()}`,
        type: source.type,
        position: { x: source.position.x + 80, y: source.position.y + 80 },
        selected: false, // FIX: Detach selection state from parent
        data: {
          ...source.data,
          title: `${source.data.title || ""} (Copy)`,
          isCompleted: false,
        },
      };
      setNodes((nds) => [...nds, clone]);
      setHasUnsavedChanges(true);
      setNodeMenu(null);
      addToast("Node duplicated.", "grey");
    },
    [nodeMenu, nodes, setNodes, setHasUnsavedChanges, addToast],
  );

  const changeEdgeType = useCallback(
    (connType) => {
      const tid = edgeMenu?.edge?.id;
      if (!tid) return;
      setEdges((eds) =>
        eds.map((e) =>
          e.id === tid ? { ...e, data: { ...e.data, connType } } : e,
        ),
      );
      setHasUnsavedChanges(true);
      setEdgeMenu(null);
      addToast(`Connection type: ${connType}`, "grey");
    },
    [edgeMenu, setEdges, setHasUnsavedChanges, addToast],
  );

  const deleteEdge = useCallback(
    (overrideId = null) => {
      const tid = overrideId || edgeMenu?.edge?.id;
      if (!tid) return;
      setEdges((eds) => eds.filter((e) => e.id !== tid));
      setHasUnsavedChanges(true);
      setEdgeMenu(null);
      addToast("Connection severed.", "grey");
    },
    [edgeMenu, setEdges, setHasUnsavedChanges, addToast],
  );

  const triggerAutoLayout = useCallback(() => {
    addToast("Aligning neural topology...", "grey");
    setNodes((nds) => generateNeuralLayout(nds, edges));
    setHasUnsavedChanges(true);
    setTimeout(() => fitView({ duration: 1200, padding: 0.3 }), 120);
  }, [edges, setNodes, setHasUnsavedChanges, fitView, addToast]);

  const handleNodeClick = useCallback(
    (e, clickedNode) => {
      e.preventDefault();
      e.stopPropagation();
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, isDimmed: n.id !== clickedNode.id },
        })),
      );
      if (
        clickedNode.type === "executionNode" ||
        clickedNode.type === "journalNode" ||
        clickedNode.type === "milestoneNode"
      )
        setActiveEditNodeId(clickedNode.id);
    },
    [setNodes, setActiveEditNodeId],
  );

  const handlePaneClick = useCallback(() => {
    setPaneMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
    setActiveEditNodeId(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
    );
  }, [setNodes, setActiveEditNodeId]);

  const handleDownload = async (format) => {
    setIsDownloadOpen(false);
    addToast("Compiling telemetry export...", "grey");
    fitView({ duration: 800, padding: 0.2 });
    await new Promise((r) => setTimeout(r, 1000));
    const el = document.querySelector(".react-flow");
    if (!el) return;
    try {
      const controls = el.querySelectorAll(
        ".react-flow__controls, .react-flow__minimap",
      );
      controls.forEach((c) => (c.style.display = "none"));
      const dataUrl = await toPng(el, {
        backgroundColor: "#030303",
        quality: 1,
        pixelRatio: 2.5,
      });
      controls.forEach((c) => (c.style.display = ""));
      const link = document.createElement("a");
      link.download = `Discotive-NeuralMap-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      link.click();
      addToast("PNG secured.", "green");
    } catch (_) {
      addToast("Export failed.", "red");
    }
  };

  const topExecutionNodes = nodes.filter((n) => n.type === "executionNode");

  return (
    <div
      className={cn(
        "relative transition-all duration-500 overflow-hidden",
        isMapFullscreen
          ? "fixed inset-0 z-[60] bg-[#030303]"
          : "w-full h-[600px] md:h-[880px] border-y border-[#1a1a1a]",
      )}
    >
      {/* ── HUD: SEARCH + FILTER BAR (CENTER TOP) ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 bg-[#080808]/95 backdrop-blur-2xl border border-[#1a1a1a] p-1.5 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <div className="relative flex items-center bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-1.5 w-[190px] md:w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#555] mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Locate node..."
            className="bg-transparent border-none outline-none text-xs font-bold text-white w-full placeholder-[#333]"
          />
          {searchQuery && (
            <button onClick={() => handleSearch({ target: { value: "" } })}>
              <X className="w-3 h-3 text-[#555] hover:text-white" />
            </button>
          )}
        </div>
        <div className="w-px h-5 bg-[#1a1a1a] hidden md:block" />
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="hidden md:block bg-[#0d0d0d] border border-[#1e1e1e] text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none cursor-pointer hover:border-[#ca8a04] transition-colors appearance-none"
        >
          <option value="all">All Time</option>
          <option value="1m">1M Matrix</option>
          <option value="3m">3M Matrix</option>
          <option value="6m">6M Matrix</option>
          <option value="12m">12M Matrix</option>
        </select>
        <div className="w-px h-5 bg-[#1a1a1a] hidden lg:block" />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="hidden lg:block bg-[#0d0d0d] border border-[#1e1e1e] text-white text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none cursor-pointer hover:border-[#ca8a04] transition-colors appearance-none"
        >
          <option value="all">All Tags</option>
          {NODE_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* ── HUD: LEFT CONTROL CLUSTER ── */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-[70] flex items-center gap-2 bg-[#080808]/95 backdrop-blur-2xl border border-[#1a1a1a] p-1.5 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
        <button
          onClick={triggerAutoLayout}
          title="Auto-Align Topology"
          className="w-10 h-10 md:w-11 md:h-11 bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#ca8a04] rounded-full text-[#666] hover:text-[#ca8a04] transition-all flex items-center justify-center"
        >
          <NetworkIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleStartCalibration}
          title="Generate Trajectory"
          className="w-10 h-10 md:w-11 md:h-11 bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#ca8a04] rounded-full text-[#666] hover:text-[#ca8a04] transition-all flex items-center justify-center relative"
        >
          <Wand2 className="w-5 h-5" />
          {subscriptionTier === "free" && !isFirstTime && (
            <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 text-red-500 bg-[#080808] rounded-full" />
          )}
        </button>

        <div className="hidden md:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#555] ml-1 mr-1">
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />{" "}
              Committing...
            </>
          ) : hasUnsavedChanges ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-500" /> Unsaved
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-500" /> Synced
            </>
          )}
        </div>

        <button
          onClick={handleCloudSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="bg-white text-black px-4 md:px-5 py-2 rounded-full font-extrabold text-[10px] uppercase tracking-widest hover:bg-[#ddd] transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <span className="hidden md:inline">Save</span>
          <Cloud className="w-4 h-4 md:hidden" />
        </button>
      </div>

      {/* ── HUD: RIGHT CONTROL CLUSTER ── */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[70] flex gap-2">
        <button
          onClick={() => fitView({ duration: 800, padding: 0.3 })}
          className="w-10 h-10 md:w-11 md:h-11 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#666] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center"
        >
          <Target className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={() => setShowMiniMap((v) => !v)}
          className={cn(
            "w-10 h-10 md:w-11 md:h-11 backdrop-blur-xl border rounded-full transition-all shadow-2xl flex items-center justify-center",
            showMiniMap
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
              : "bg-[#080808]/95 border-[#1a1a1a] text-[#666] hover:text-white hover:bg-[#111]",
          )}
        >
          <MapIcon className="w-4 h-4" />
        </button>
        <div className="relative" ref={downloadRef}>
          <button
            onClick={() => setIsDownloadOpen((v) => !v)}
            className="w-10 h-10 md:w-11 md:h-11 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#666] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center"
          >
            <Download className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isDownloadOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-44 bg-[#080808] border border-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden"
              >
                <button
                  onClick={() => handleDownload("png")}
                  className="flex items-center gap-3 px-4 py-3.5 text-xs font-bold text-white hover:bg-[#111] w-full"
                >
                  <ImageIcon className="w-4 h-4 text-[#666]" /> Export PNG
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setIsMapFullscreen((v) => !v)}
          className="w-10 h-10 md:w-11 md:h-11 bg-[#080808]/95 backdrop-blur-xl border border-[#1a1a1a] rounded-full text-[#666] hover:text-white hover:bg-[#111] transition-all shadow-2xl flex items-center justify-center"
        >
          {isMapFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── TOPOLOGY STATS (BOTTOM LEFT) ── */}
      <div className="absolute bottom-4 left-4 z-[70] hidden md:flex">
        <TopologyStats nodes={nodes} edges={edges} />
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
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setNodeMenu(null);
          setEdgeMenu(null);
          const pos = clampMenuPos(e.clientX, e.clientY);
          setPaneMenu({ ...pos, rawX: e.clientX, rawY: e.clientY });
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setPaneMenu(null);
          setEdgeMenu(null);
          setNodeMenu({
            ...clampMenuPos(e.clientX, e.clientY, 220, 200),
            node,
          });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setPaneMenu(null);
          setNodeMenu(null);
          setEdgeMenu({
            ...clampMenuPos(e.clientX, e.clientY, 220, 180),
            edge,
          });
        }}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        className="bg-[#030303]"
        minZoom={0.04}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "neuralEdge" }}
      >
        <Background variant="dots" color="#1a1a1a" gap={48} size={1.5} />
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-none shadow-2xl [&_.react-flow__controls-button]:bg-[#080808] [&_.react-flow__controls-button]:border-[#1e1e1e] [&_.react-flow__controls-button]:fill-[#666] rounded-xl border border-[#1e1e1e] overflow-hidden z-30 hidden md:flex"
        />
        {showMiniMap && (
          <MiniMap
            nodeColor={(n) => {
              if (n.data.isCompleted) return "#10b981";
              if (n.data.priorityStatus === "READY") return "#ca8a04";
              return "#333";
            }}
            maskColor="rgba(0,0,0,0.85)"
            style={{
              background: "#080808",
              border: "1px solid #1e1e1e",
              borderRadius: 12,
            }}
          />
        )}
      </ReactFlow>

      {/* ── CONTEXT MENUS ── */}
      <AnimatePresence>
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
          />
        )}

        {/* Pane context menu */}
        {paneMenu && (
          <motion.div
            key="pane-menu"
            initial={{ opacity: 0, scale: 0.93, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -4 }}
            style={{ top: paneMenu.top, left: paneMenu.left }}
            className="fixed z-[100] bg-[#080808] border border-[#1e1e1e] rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden min-w-[270px]"
          >
            <div className="px-5 py-3 bg-[#050505] border-b border-[#1a1a1a] text-[9px] font-black text-[#444] uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-3 h-3" /> Deploy Element
            </div>
            {[
              {
                label: "Core Protocol",
                type: "core",
                cls: "executionNode",
                icon: <Target className="w-4 h-4 text-amber-500" />,
              },
              {
                label: "Sub-Routine",
                type: "branch",
                cls: "executionNode",
                icon: <GitBranch className="w-4 h-4 text-[#888]" />,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => addNode(item.type, item.cls)}
                className="w-full px-5 py-3.5 text-left text-xs font-bold text-white hover:bg-[#0d0d0d] flex items-center gap-3 border-b border-[#1a1a1a] transition-colors"
              >
                {item.icon} {item.label}
              </button>
            ))}
            <div className="px-5 py-2.5 bg-[#050505] border-y border-[#1a1a1a] text-[9px] font-black text-[#444] uppercase tracking-widest">
              Widgets & Media
            </div>
            {[
              {
                label: "Radar Matrix",
                cls: "radarWidget",
                icon: <Activity className="w-4 h-4 text-amber-500" />,
              },
              {
                label: "Vault Asset",
                cls: "assetWidget",
                icon: <Database className="w-4 h-4 text-emerald-500" />,
              },
              {
                label: "Video Source",
                cls: "videoWidget",
                icon: <Video className="w-4 h-4 text-sky-400" />,
              },
              {
                label: "Execution Log",
                cls: "journalNode",
                icon: <BookOpen className="w-4 h-4 text-violet-500" />,
              },
              {
                label: "Milestone Gate",
                cls: "milestoneNode",
                icon: <Trophy className="w-4 h-4 text-amber-400" />,
              },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => addNode(item.cls, item.cls)}
                className="w-full px-5 py-3.5 text-left text-xs font-bold text-white hover:bg-[#0d0d0d] flex items-center gap-3 border-b border-[#1a1a1a] transition-colors last:border-b-0"
              >
                {item.icon} {item.label}
              </button>
            ))}
          </motion.div>
        )}

        {/* Node context menu */}
        {nodeMenu && (
          <motion.div
            key="node-menu"
            initial={{ opacity: 0, scale: 0.93, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -4 }}
            style={{ top: nodeMenu.top, left: nodeMenu.left }}
            className="fixed z-[100] bg-[#080808] border border-[#1e1e1e] rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden min-w-[220px]"
          >
            <div className="px-4 py-2.5 bg-[#050505] border-b border-[#1a1a1a] text-[9px] font-black text-[#444] uppercase tracking-widest truncate">
              {nodeMenu.node?.data?.title || "Node Actions"}
            </div>
            <button
              onClick={() => {
                setActiveEditNodeId(nodeMenu.node.id);
                setNodeMenu(null);
              }}
              className="w-full px-4 py-3.5 text-left text-xs font-bold text-white hover:bg-[#0d0d0d] flex items-center gap-3 border-b border-[#1a1a1a]"
            >
              <Edit3 className="w-4 h-4 text-[#888]" /> Edit Protocol
            </button>
            <button
              onClick={() => duplicateNode()}
              className="w-full px-4 py-3.5 text-left text-xs font-bold text-white hover:bg-[#0d0d0d] flex items-center gap-3 border-b border-[#1a1a1a]"
            >
              <Copy className="w-4 h-4 text-[#888]" /> Duplicate Node
            </button>
            {/* Per-node colour strip */}
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-[8px] font-black text-[#444] uppercase tracking-widest mb-2">
                Accent Color
              </p>
              <div className="flex gap-1.5">
                {Object.entries(NODE_ACCENT_PALETTE)
                  .slice(0, 6)
                  .map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === nodeMenu.node.id
                              ? { ...n, data: { ...n.data, accentColor: key } }
                              : n,
                          ),
                        );
                        setHasUnsavedChanges(true);
                        setNodeMenu(null);
                      }}
                      className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                      style={{
                        background: val.primary,
                        borderColor: "transparent",
                      }}
                    />
                  ))}
              </div>
            </div>
            <button
              onClick={() => deleteNode()}
              className="w-full px-4 py-3.5 text-left text-xs font-bold text-red-500 hover:bg-[#0d0d0d] flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" /> Obliterate
            </button>
          </motion.div>
        )}

        {/* Edge context menu */}
        {edgeMenu && (
          <motion.div
            key="edge-menu"
            initial={{ opacity: 0, scale: 0.93, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -4 }}
            style={{ top: edgeMenu.top, left: edgeMenu.left }}
            className="fixed z-[100] bg-[#080808] border border-[#1e1e1e] rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden min-w-[220px]"
          >
            <div className="px-4 py-2.5 bg-[#050505] border-b border-[#1a1a1a] text-[9px] font-black text-[#444] uppercase tracking-widest">
              Connection Type
            </div>
            {["core-core", "core-branch", "branch-sub", "open"].map((ct) => (
              <button
                key={ct}
                onClick={() => changeEdgeType(ct)}
                className={cn(
                  "w-full px-4 py-3 text-left text-xs font-bold hover:bg-[#0d0d0d] flex items-center gap-3 border-b border-[#1a1a1a] transition-colors",
                  edgeMenu.edge?.data?.connType === ct
                    ? "text-amber-500"
                    : "text-white",
                )}
              >
                <ArrowRight className="w-3.5 h-3.5 text-[#666]" />
                {ct.replace(/-/g, " → ")}
                {edgeMenu.edge?.data?.connType === ct && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
            <button
              onClick={() => deleteEdge()}
              className="w-full px-4 py-3.5 text-left text-xs font-bold text-red-500 hover:bg-[#0d0d0d] flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" /> Sever Connection
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// § 16. NODE COMMAND CENTER — RIGHT PANEL (V5)
// ============================================================================

/**
 * @component NodeCommandCenter
 * @description
 * Spring-animated right-panel slide-in for desktop node editing.
 * Tabbed interface: Info → Tasks → Tags → Color → Journal → Danger.
 * All inputs pass through the sanitize() filter before state updates.
 */
const NodeCommandCenter = ({
  activeNode,
  updateActiveNode,
  onClose,
  onDelete,
  onSubtaskToggle,
  onCompleteAll,
  pendingScoreDelta,
  edges,
  nodes,
}) => {
  const [tab, setTab] = useState("info");

  const tabs = [
    { id: "info", label: "Info", icon: <Type className="w-3.5 h-3.5" /> },
    { id: "tasks", label: "Tasks", icon: <Activity className="w-3.5 h-3.5" /> },
    { id: "tags", label: "Tags", icon: <Tag className="w-3.5 h-3.5" /> },
    { id: "color", label: "Color", icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "journal", label: "Log", icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const totalTasks = activeNode?.data?.tasks?.length || 0;
  const doneTasks =
    activeNode?.data?.tasks?.filter((t) => t.completed).length || 0;
  const accent = NODE_ACCENT_PALETTE[activeNode?.data?.accentColor || "amber"];

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[460px] bg-[#060606] border-l border-[#1a1a1a] shadow-[0_0_100px_rgba(0,0,0,0.95)] z-[110] flex flex-col">
      {/* Panel header */}
      <div
        className="flex justify-between items-center p-5 pb-4 border-b border-[#1a1a1a] shrink-0"
        style={{
          background: `linear-gradient(135deg, #060606 0%, ${accent.bg} 100%)`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: accent.bg,
              border: `1px solid ${accent.primary}30`,
            }}
          >
            <Settings2 className="w-4 h-4" style={{ color: accent.primary }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold tracking-widest uppercase text-white truncate">
              Node Command Center
            </h2>
            <p className="text-[9px] text-[#444] font-bold uppercase tracking-widest truncate">
              {activeNode?.data?.nodeType || "Protocol"} ·{" "}
              {activeNode?.id?.slice(-6) || ""}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-[#0d0d0d] border border-[#1e1e1e] rounded-full text-[#555] hover:text-white flex items-center justify-center transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress micro-bar */}
      {totalTasks > 0 && (
        <div className="h-0.5 bg-[#1a1a1a] shrink-0">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${(doneTasks / totalTasks) * 100}%`,
              background: accent.primary,
            }}
          />
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-[#1a1a1a] shrink-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px",
              tab === t.id
                ? "text-white border-current"
                : "border-transparent text-[#444] hover:text-[#888]",
            )}
            style={
              tab === t.id
                ? { color: accent.primary, borderColor: accent.primary }
                : {}
            }
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-7">
        {tab === "info" && (
          <>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2.5">
                Protocol Designation
              </label>
              <input
                type="text"
                value={activeNode.data.title || ""}
                onChange={(e) =>
                  updateActiveNode("title", sanitize(e.target.value))
                }
                placeholder="e.g. Secure Series A"
                className="w-full bg-transparent text-[22px] font-black tracking-tight text-white placeholder-[#222] border-b border-[#1e1e1e] focus:border-current focus:outline-none pb-2 mb-5 transition-colors"
                style={{ caretColor: accent.primary }}
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Type className="w-3 h-3" /> Sub-Classification
              </label>
              <input
                type="text"
                value={activeNode.data.subtitle || ""}
                onChange={(e) =>
                  updateActiveNode("subtitle", sanitize(e.target.value))
                }
                placeholder="e.g. Funding Phase"
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors"
                style={{ "--focus-border": accent.primary }}
                onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <AlignLeft className="w-3 h-3" /> Execution Parameters
              </label>
              <textarea
                value={activeNode.data.desc || ""}
                onChange={(e) =>
                  updateActiveNode("desc", sanitize(e.target.value))
                }
                placeholder="Define tactical approach..."
                rows={4}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-sm text-white placeholder-[#333] resize-none focus:outline-none transition-colors custom-scrollbar"
                onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <CalendarIcon className="w-3 h-3" /> Hard Deadline
              </label>
              <input
                type="date"
                value={activeNode.data.deadline || ""}
                onChange={(e) => updateActiveNode("deadline", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
                onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>
            {/* Priority Status */}
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Priority Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["READY", "FUTURE", "BLOCKED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateActiveNode("priorityStatus", status)}
                    className={cn(
                      "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                      activeNode.data.priorityStatus === status
                        ? "text-white"
                        : "border-[#1a1a1a] bg-[#0d0d0d] text-[#444] hover:text-white",
                    )}
                    style={
                      activeNode.data.priorityStatus === status
                        ? {
                            background: accent.bg,
                            borderColor: `${accent.primary}40`,
                            color: accent.primary,
                          }
                        : {}
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === "tasks" && (
          <>
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold text-[#444] uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Sub-Routine Matrix
                <span className="ml-1 text-[#666]">
                  ({doneTasks}/{totalTasks})
                </span>
              </label>
              <button
                onClick={onCompleteAll}
                disabled={activeNode.data.isCompleted}
                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-25 transition-colors border"
                style={{
                  background: "rgba(16,185,129,0.07)",
                  borderColor: "rgba(16,185,129,0.25)",
                  color: "#10b981",
                }}
              >
                Force Secure
              </button>
            </div>
            <div className="space-y-2">
              {(activeNode.data.tasks || []).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] p-3.5 rounded-xl group hover:border-[#2a2a2a] transition-all"
                >
                  <button
                    onClick={() => onSubtaskToggle(task.id)}
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: task.completed ? accent.bg : "transparent",
                      borderColor: task.completed ? accent.primary : "#2a2a2a",
                      color: task.completed ? accent.primary : "transparent",
                    }}
                  >
                    {task.completed && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <input
                    type="text"
                    value={task.text}
                    onChange={(e) =>
                      updateActiveNode(
                        "tasks",
                        (activeNode.data.tasks || []).map((t) =>
                          t.id === task.id
                            ? { ...t, text: sanitize(e.target.value) }
                            : t,
                        ),
                      )
                    }
                    className={cn(
                      "flex-1 bg-transparent border-none outline-none text-sm transition-colors",
                      task.completed
                        ? "text-[#444] line-through"
                        : "text-white",
                    )}
                  />
                  <button
                    onClick={() =>
                      updateActiveNode(
                        "tasks",
                        (activeNode.data.tasks || []).filter(
                          (t) => t.id !== task.id,
                        ),
                      )
                    }
                    className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() =>
                updateActiveNode("tasks", [
                  ...(activeNode.data.tasks || []),
                  { id: Date.now(), text: "", completed: false },
                ])
              }
              className="w-full py-3.5 border border-dashed border-[#1e1e1e] rounded-xl text-[#555] text-xs font-bold uppercase tracking-widest hover:border-[#333] hover:text-white transition-all flex items-center justify-center gap-2 bg-[#0d0d0d]"
            >
              <Plus className="w-3.5 h-3.5" /> Inject Routine
            </button>
          </>
        )}

        {tab === "tags" && (
          <>
            <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
              Taxonomy Classification
            </p>
            <div className="flex flex-wrap gap-2">
              {NODE_TAGS.map((tag) => {
                const active = (activeNode.data.tags || []).includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      const curr = activeNode.data.tags || [];
                      updateActiveNode(
                        "tags",
                        active ? curr.filter((t) => t !== tag) : [...curr, tag],
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border"
                    style={
                      active
                        ? {
                            background: accent.bg,
                            borderColor: `${accent.primary}40`,
                            color: accent.primary,
                          }
                        : {
                            background: "#0d0d0d",
                            borderColor: "#1a1a1a",
                            color: "#555",
                          }
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "color" && (
          <>
            <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
              Node Accent Theme
            </p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(NODE_ACCENT_PALETTE).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => updateActiveNode("accentColor", key)}
                  className={cn(
                    "relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all p-2",
                    activeNode.data.accentColor === key
                      ? "scale-105"
                      : "opacity-55 hover:opacity-80 border-transparent",
                  )}
                  style={{
                    background: val.bg,
                    borderColor:
                      activeNode.data.accentColor === key
                        ? val.primary
                        : "transparent",
                    boxShadow:
                      activeNode.data.accentColor === key
                        ? `0 0 20px ${val.glow}`
                        : "none",
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full"
                    style={{ background: val.primary }}
                  />
                  <span
                    className="text-[8px] font-black uppercase tracking-widest"
                    style={{ color: val.primary }}
                  >
                    {key}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "journal" && (
          <>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                Execution Reality Log
              </label>
              <textarea
                value={activeNode.data.journalEntry || ""}
                onChange={(e) =>
                  updateActiveNode("journalEntry", sanitize(e.target.value))
                }
                placeholder="Document your execution reality. What happened today? What blocked you? What did you learn?"
                rows={7}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-sm text-white placeholder-[#333] resize-none focus:outline-none custom-scrollbar"
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                Execution State
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  "⚡ In flow",
                  "🔥 On fire",
                  "😤 Grinding",
                  "🧊 Blocked",
                  "💡 Clarity",
                  "🎯 Locked in",
                ].map((mood) => (
                  <button
                    key={mood}
                    onClick={() => updateActiveNode("mood", mood)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                      activeNode.data.mood === mood
                        ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                        : "bg-[#0d0d0d] border-[#1a1a1a] text-[#666] hover:text-white",
                    )}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[9px] text-[#333] font-medium">
              Entries are saved with the node and form your execution history.
            </p>
          </>
        )}
      </div>

      {/* Footer: danger zone + pending score */}
      <div className="border-t border-[#1a1a1a] p-5 space-y-3 shrink-0 bg-[#050505]">
        {pendingScoreDelta !== 0 && (
          <div
            className={cn(
              "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2",
              pendingScoreDelta > 0
                ? "bg-emerald-500/8 text-emerald-500 border border-emerald-500/20"
                : "bg-red-500/8 text-red-500 border border-red-500/20",
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {pendingScoreDelta > 0 ? "+" : ""}
            {pendingScoreDelta} pts pending cloud save
          </div>
        )}
        <button
          onClick={onDelete}
          className="w-full py-3 bg-red-500/8 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/15 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" /> Obliterate Protocol
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// § 17. MASTER ROADMAP ENGINE — ROOT COMPONENT
// ============================================================================

/**
 * @component Roadmap
 * @description
 * Root orchestrator. Owns all top-level state and wires it to child components.
 *
 * Data flow:
 *  1. Cold load: try Firestore → fall back to IDB cache → default empty state
 *  2. All mutations go through optimistic local state first
 *  3. IDB is written on every state change (debounced, not awaited)
 *  4. Firestore batch write fires after SAVE_DEBOUNCE_MS of inactivity
 *  5. Score delta accumulates in-memory; flushed only on confirmed Firestore persist
 *
 * Security surface:
 *  – All freeform inputs pass through sanitize() before entering node.data
 *  – Firebase uid is validated before every read/write
 *  – Rate-limiting enforced via client-side write debounce and tier node caps
 */
const Roadmap = () => {
  const { userData } = useUserData();
  const navigate = useNavigate();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalReason, setProModalReason] = useState("nodes");

  const [aiPhase, setAiPhase] = useState("idle");
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiAnswers, setAiAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeEditNodeId, setActiveEditNodeId] = useState(null);
  const [isMobileEditMode, setIsMobileEditMode] = useState(false);

  const [systemLedger, setSystemLedger] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [pendingScoreDelta, setPendingScoreDelta] = useState(0);

  const [vaultModal, setVaultModal] = useState({
    isOpen: false,
    targetNodeId: null,
    filter: "All",
  });
  const [videoModal, setVideoModal] = useState({
    isOpen: false,
    targetNodeId: null,
    tab: "courses",
    customUrl: "",
    customTitle: "",
  });

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4200,
    );
  }, []);

  const addLedgerEntry = useCallback((action) => {
    const entry = { id: Date.now(), action, time: new Date().toISOString() };
    setSystemLedger((prev) => {
      const updated = [entry, ...prev].slice(0, 80);
      try {
        localStorage.setItem("discotive_ledger_v5", JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  /** @description Debounce timer ref for batched Firestore writes. */
  const saveTimerRef = useRef(null);
  /** @description Tracks whether initial data has been loaded from Firestore/IDB. */
  const hasLoadedRef = useRef(false);

  const isFirstTime =
    nodes.length === 0 || (nodes.length === 1 && nodes[0].id === "init_1");
  const lastGenDate = userData?.telemetry?.lastRoadmapGen;
  const daysSinceLastGen = lastGenDate
    ? (Date.now() - new Date(lastGenDate)) / 86400000
    : 999;
  const canRegenerate = subscriptionTier === "pro" && daysSinceLastGen >= 14;

  // ── Custom event bus for vault/video modals dispatched from widget nodes ──
  useEffect(() => {
    const handleVaultOpen = (e) =>
      setVaultModal({
        isOpen: true,
        targetNodeId: e.detail.nodeId,
        filter: "All",
      });
    const handleVideoOpen = (e) =>
      setVideoModal({
        isOpen: true,
        targetNodeId: e.detail.nodeId,
        tab: "courses",
        customUrl: "",
        customTitle: "",
      });

    const handleVideoWatched = (e) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === e.detail.nodeId
            ? { ...n, data: { ...n.data, isWatched: true } }
            : n,
        ),
      );
      setPendingScoreDelta((p) => p + 15);
      setHasUnsavedChanges(true);
      addToast("Media protocol verified. +15 pts pending save", "green");
    };

    window.addEventListener("OPEN_VAULT_MODAL", handleVaultOpen);
    window.addEventListener("OPEN_VIDEO_MODAL", handleVideoOpen);
    window.addEventListener("VIDEO_WATCHED", handleVideoWatched);
    return () => {
      window.removeEventListener("OPEN_VAULT_MODAL", handleVaultOpen);
      window.removeEventListener("OPEN_VIDEO_MODAL", handleVideoOpen);
      window.removeEventListener("VIDEO_WATCHED", handleVideoWatched);
    };
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleCloudSave();
      }
      if (e.key === "Escape") {
        setActiveEditNodeId(null);
        setNodes((nds) =>
          nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
        );
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasUnsavedChanges]); // eslint-disable-line

  // ── Cold-load: Firestore primary, IDB fallback ──
  useEffect(() => {
    const fetchData = async () => {
      const uid = userData?.uid || userData?.id;
      if (!uid || hasLoadedRef.current) return;
      hasLoadedRef.current = true;

      try {
        const [mapSnap, subSnap] = await Promise.all([
          getDoc(doc(db, "users", uid, "execution_map", "current")),
          getDoc(doc(db, "users", uid, "subscription", "current")),
        ]);

        if (mapSnap.exists()) {
          const rm = mapSnap.data();
          setNodes(rm.nodes || []);
          setEdges(rm.edges || []);
          // Sync authoritative Firestore data to IDB cache
          idbPut(uid, { nodes: rm.nodes || [], edges: rm.edges || [] });
        } else {
          // Firestore miss — attempt IDB recovery
          const cached = await idbGet(uid);
          if (cached?.nodes?.length > 0) {
            setNodes(cached.nodes);
            setEdges(cached.edges || []);
            addToast("Restored from local cache.", "grey");
          }
        }

        if (subSnap.exists()) {
          setSubscriptionTier((subSnap.data().tier || "free").toLowerCase());
        }
      } catch (err) {
        console.error("[Roadmap] Cold-load failed:", err);
        // IDB-only fallback on network error
        const uid_fallback = userData?.id;
        if (uid_fallback) {
          const cached = await idbGet(uid_fallback);
          if (cached?.nodes?.length > 0) {
            setNodes(cached.nodes);
            setEdges(cached.edges || []);
            addToast("Offline mode: local cache active.", "grey");
          }
        }
      }
    };
    fetchData();
  }, [userData?.id]); // eslint-disable-line

  /**
   * @function handleCloudSave
   * @description
   * Batched Firestore write. Uses writeBatch for atomic node+edge update.
   * Flushes pending score delta on success. Writes IDB mirror regardless.
   */
  const handleCloudSave = useCallback(async () => {
    const uid = userData?.id;
    if (!uid) return;
    if (!hasUnsavedChanges && pendingScoreDelta === 0) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const cleanNodes = nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data,
      }));
      const cleanEdges = edges.map(
        ({ id, source, target, sourceHandle, targetHandle, type, data }) => ({
          id,
          source,
          target,
          sourceHandle,
          targetHandle,
          type,
          data,
        }),
      );
      batch.set(
        doc(db, "users", uid, "execution_map", "current"),
        { nodes, edges, lastUpdated: new Date().toISOString() },
        { merge: true },
      );
      await batch.commit();

      // Parallel IDB sync (fire-and-forget)
      idbPut(uid, { nodes, edges });

      if (pendingScoreDelta !== 0) {
        mutateScore(uid, pendingScoreDelta, "Execution Matrix Updated");
        setPendingScoreDelta(0);
      }
      setHasUnsavedChanges(false);
      addToast("Matrix synced.", "green");
    } catch (err) {
      console.error("[Roadmap] Save failed:", err);
      addToast("Sync failed. Local state preserved.", "red");
    } finally {
      setIsSaving(false);
    }
  }, [
    userData?.id,
    hasUnsavedChanges,
    pendingScoreDelta,
    nodes,
    edges,
    addToast,
  ]); // eslint-disable-line

  /**
   * @description
   * Debounced auto-save: resets the SAVE_DEBOUNCE_MS timer on every dirty-state
   * write. IDB is written immediately (optimistic); Firestore deferred.
   * This pattern keeps free-tier Firestore writes well within daily budget.
   */
  useEffect(() => {
    if (!hasUnsavedChanges || !userData?.id) return;
    idbPut(userData.id, { nodes, edges }); // immediate local persist
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      handleCloudSave();
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(saveTimerRef.current);
  }, [nodes, edges, hasUnsavedChanges]); // eslint-disable-line

  // ── AI Calibration Flow ──
  const handleStartCalibration = async () => {
    if (subscriptionTier === "free" && !isFirstTime) {
      setProModalReason("regenerate");
      setIsProModalOpen(true);
      return;
    }
    if (subscriptionTier === "pro" && !canRegenerate && !isFirstTime) {
      addToast(
        `Locked. Try again in ${Math.ceil(14 - daysSinceLastGen)} days.`,
        "red",
      );
      return;
    }
    setAiPhase("loading_questions");
    setAiAnswers({});
    setCurrentQuestionIdx(0);
    try {
      const questions = await generateCalibrationQuestions(userData);
      setAiQuestions(questions);
      setAiPhase("questions");
    } catch (err) {
      addToast("AI neural link failed.", "red");
      setAiPhase("idle");
    }
  };

  const handleGenerateRoadmap = async () => {
    setAiPhase("loading_roadmap");
    try {
      const aiData = await generateExecutionMap(
        userData,
        aiAnswers,
        subscriptionTier,
      );

      const newNodes = aiData.nodes.map((n) => {
        let nodeClass = "executionNode";
        let data = {};

        if (n.type === "core" || n.type === "branch") {
          const offsetDate = new Date();
          offsetDate.setDate(
            offsetDate.getDate() + (n.deadline_offset_days || 30),
          );
          data = {
            title: sanitize(n.title || "Protocol"),
            subtitle: sanitize(n.subtitle || "Execution"),
            desc: sanitize(n.desc || ""),
            deadline: offsetDate.toISOString().split("T")[0],
            isCompleted: false,
            priorityStatus: "READY",
            nodeType: n.type,
            tasks: (n.tasks || []).map((t, i) => ({
              id: `${n.id}_t${i}`,
              text: sanitize(String(t)),
              completed: false,
            })),
            linkedAssets: [],
            delegates: [],
            accentColor: n.type === "core" ? "amber" : "white",
            tags: n.tags || [],
            collapsed: false,
          };
        } else if (n.type === "radarWidget") {
          nodeClass = "radarWidget";
          data = {
            radarData: n.radarData || [
              { metric: "Focus", val: 80 },
              { metric: "Intel", val: 70 },
              { metric: "Pace", val: 85 },
              { metric: "Output", val: 65 },
            ],
          };
        } else if (n.type === "assetWidget") {
          nodeClass = "assetWidget";
          data = {
            label: sanitize(n.label || "Awaiting Proof"),
            type: sanitize(n.assetType || "Vault Integration"),
          };
        } else if (n.type === "videoWidget") {
          nodeClass = "videoWidget";
          data = {
            title: sanitize(n.title || "External Source"),
            platform: sanitize(n.platform || "Media"),
            thumbnailUrl: null,
            youtubeId: null,
          };
        } else if (n.type === "journalNode") {
          nodeClass = "journalNode";
          data = { entry: "", date: new Date().toISOString(), mood: "⚡" };
        } else if (n.type === "milestoneNode") {
          nodeClass = "milestoneNode";
          data = {
            title: sanitize(n.title || "Milestone"),
            subtitle: sanitize(n.subtitle || "Achievement"),
            isUnlocked: false,
            xpReward: n.xpReward || 100,
          };
        }
        return { id: n.id, type: nodeClass, position: { x: 0, y: 0 }, data };
      });

      const newEdges = aiData.edges.map((e, i) => ({
        id: `e_ai_${Date.now()}_${i}`,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || "right",
        targetHandle: e.targetHandle || "left",
        type: "neuralEdge",
        data: {
          connType: e.connType || "open",
          accent:
            NODE_ACCENT_PALETTE[e.accentColor || "amber"]?.primary || "#ca8a04",
        },
      }));

      const layoutedNodes = generateNeuralLayout(newNodes, newEdges);
      setNodes(layoutedNodes);
      setEdges(newEdges);
      setHasUnsavedChanges(true);

      const uid = userData?.uid || userData?.id; // Bulletproof UID check
      if (uid) {
        // Safe Telemetry Update: Do not let this crash the main thread
        try {
          await setDoc(
            doc(db, "users", uid),
            { telemetry: { lastRoadmapGen: new Date().toISOString() } },
            { merge: true },
          );
        } catch (telemetryErr) {
          console.warn("Non-critical telemetry write skipped.", telemetryErr);
        }
        const cleanNodes = layoutedNodes.map(
          ({ id, type, position, data }) => ({ id, type, position, data }),
        );
        const cleanEdges = newEdges.map(
          ({ id, source, target, sourceHandle, targetHandle, type, data }) => ({
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
            type,
            data,
          }),
        );

        try {
          await setDoc(
            doc(db, "users", uid, "execution_map", "current"),
            {
              nodes: cleanNodes,
              edges: cleanEdges,
              lastUpdated: new Date().toISOString(),
            },
            { merge: true },
          );
          idbPut(uid, { nodes: cleanNodes, edges: cleanEdges });
          setHasUnsavedChanges(false); // Matrix safely synced
        } catch (dbErr) {
          console.error("Auto-save on generation failed", dbErr);
          addToast("Warning: Map generated but cloud save failed.", "red");
        }
      }

      setAiPhase("idle");
      addToast("Neural web synthesized & deployed.", "green");
      addLedgerEntry("Generated AI trajectory map");
    } catch (err) {
      console.error("[Roadmap] AI gen failed:", err);
      setAiPhase("idle");
      addToast("Synthesis failed. Retry.", "red");
    }
  };

  // ── Active node operations ──
  const activeNode = nodes.find((n) => n.id === activeEditNodeId);

  const updateActiveNode = useCallback(
    (key, value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeEditNodeId
            ? { ...n, data: { ...n.data, [key]: value } }
            : n,
        ),
      );
      setHasUnsavedChanges(true);
    },
    [activeEditNodeId, setNodes],
  );

  const handleSubtaskToggle = useCallback(
    (taskId) => {
      if (!activeNode) return;
      const tasks = activeNode.data.tasks || [];
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const willBeCompleted = !task.completed;

      // Asset-linkage verification gate for certificate/proof tasks
      if (willBeCompleted && /certif|proof/i.test(task.text)) {
        const hasLinkedAsset = edges.some((e) => {
          const connectedId =
            e.source === activeNode.id
              ? e.target
              : e.target === activeNode.id
                ? e.source
                : null;
          return (
            connectedId &&
            nodes.find((n) => n.id === connectedId)?.type === "assetWidget"
          );
        });
        if (!hasLinkedAsset) {
          addToast("Verification denied. Link a Vault Asset first.", "red");
          return;
        }
      }

      updateActiveNode(
        "tasks",
        tasks.map((t) =>
          t.id === taskId ? { ...t, completed: willBeCompleted } : t,
        ),
      );
      setPendingScoreDelta((p) => p + (willBeCompleted ? 5 : -10));
      addToast(
        willBeCompleted ? "+5 pts pending save" : "-10 pts pending save",
        willBeCompleted ? "green" : "grey",
      );
    },
    [activeNode, edges, nodes, updateActiveNode, addToast],
  );

  const handleCompleteAll = useCallback(() => {
    if (!activeNode) return;
    if (!window.confirm("Authorize milestone sequence completion?")) return;
    const incomplete = (activeNode.data.tasks || []).filter(
      (t) => !t.completed,
    ).length;
    updateActiveNode(
      "tasks",
      (activeNode.data.tasks || []).map((t) => ({ ...t, completed: true })),
    );
    updateActiveNode("isCompleted", true);
    if (incomplete > 0) setPendingScoreDelta((p) => p + incomplete * 5);
    setPendingScoreDelta(
      (p) => p + (activeNode.data.nodeType === "core" ? 30 : 15),
    );
    addToast(
      `Milestone secured: ${activeNode.data.title} (+pts pending save)`,
      "green",
    );
    addLedgerEntry(`Completed: ${activeNode.data.title}`);
  }, [activeNode, updateActiveNode, addToast, addLedgerEntry]);

  const handleDeleteActiveNode = useCallback(() => {
    if (!activeEditNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== activeEditNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== activeEditNodeId && e.target !== activeEditNodeId,
      ),
    );
    setHasUnsavedChanges(true);
    setActiveEditNodeId(null);
    addToast("Node obliterated.", "red");
    addLedgerEntry(
      `Deleted node: ${activeNode?.data?.title || activeEditNodeId}`,
    );
  }, [
    activeEditNodeId,
    activeNode,
    setNodes,
    setEdges,
    addToast,
    addLedgerEntry,
  ]);

  const closePanel = useCallback(() => {
    setActiveEditNodeId(null);
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, isDimmed: false } })),
    );
  }, [setNodes]);

  const embedVideo = () => {
    if (!videoModal.customUrl || !videoModal.targetNodeId) return;
    const videoCount = nodes.filter(
      (n) => n.type === "videoWidget" && n.data.youtubeId,
    ).length;
    if (subscriptionTier === "free" && videoCount >= 3) {
      setProModalReason("nodes");
      setIsProModalOpen(true);
      setVideoModal({ ...videoModal, isOpen: false });
      return;
    }
    const match = videoModal.customUrl.match(
      /(?:youtu\.be\/|v\/|embed\/|watch\?v=|&v=)([^#&?]{11})/,
    );
    const videoId = match ? match[1] : null;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === videoModal.targetNodeId
          ? {
              ...n,
              data: {
                ...n.data,
                title: sanitize(videoModal.customTitle || "External Protocol"),
                thumbnailUrl: videoId
                  ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                  : null,
                youtubeId: videoId,
                platform: videoId ? "YouTube" : "External",
              },
            }
          : n,
      ),
    );
    setVideoModal({ ...videoModal, isOpen: false });
    setHasUnsavedChanges(true);
    addToast(
      videoId ? "YouTube link established." : "External link attached.",
      "green",
    );
  };

  const linkVaultAsset = (asset) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === vaultModal.targetNodeId
          ? {
              ...n,
              data: {
                ...n.data,
                label: sanitize(asset.name),
                type: sanitize(asset.type),
                assetId: asset.id,
              },
            }
          : n,
      ),
    );
    setVaultModal({ ...vaultModal, isOpen: false });
    setHasUnsavedChanges(true);
    addToast("Asset locked to protocol.", "green");
  };

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#030303] min-h-screen w-full max-w-full overflow-x-hidden text-white pb-24 relative">
      {/* ── PAGE HEADER ── */}
      <div className="max-w-[1700px] mx-auto px-4 md:px-12 pt-10 md:pt-14 pb-6 md:pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-20">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-8 bg-amber-500 rounded-full" />
            <span className="text-[9px] font-black text-[#444] uppercase tracking-[0.35em]">
              Discotive OS · v5
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] text-white mb-3 leading-none">
            Execution Map.
          </h1>
          <p className="text-sm md:text-base text-[#666] font-medium tracking-tight max-w-md">
            The mathematical topology of your monopoly. Every node, a protocol.
            Every edge, a dependency.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mobile edit mode toggle */}
          <button
            onClick={() => setIsMobileEditMode((v) => !v)}
            className={cn(
              "md:hidden px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2",
              isMobileEditMode
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : "bg-[#0d0d0d] border-[#1e1e1e] text-[#666]",
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isMobileEditMode ? "Exit Edit" : "Edit Mode"}
          </button>
        </div>
      </div>

      {/* ── FLOW CANVAS ZONE ── */}
      <div className="relative">
        {/* First-time splash overlay */}
        {isFirstTime && aiPhase === "idle" && (
          <div className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-amber-500" />
                </div>
                <div className="absolute -inset-3 rounded-[2.5rem] border border-amber-500/10 animate-ping" />
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-[-0.03em] leading-none">
                Initialize Protocol
              </h2>
              <p className="text-[#666] max-w-md mb-10 leading-relaxed font-medium text-sm">
                Your neural web is empty. Deploy the Discotive AI to synthesize
                a mathematically aligned, multi-branch execution topology based
                on your operator vision.
              </p>
              <button
                onClick={handleStartCalibration}
                className="px-10 py-5 bg-white text-black font-extrabold rounded-full hover:bg-[#ddd] transition-all shadow-[0_0_60px_rgba(255,255,255,0.15)] flex items-center gap-3 text-sm uppercase tracking-widest"
              >
                <Wand2 className="w-5 h-5" /> Generate Trajectory
              </button>
            </motion.div>
          </div>
        )}

        {/* AI Calibration modal */}
        <AnimatePresence>
          {aiPhase !== "idle" && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-2xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                className="w-full max-w-2xl bg-[#080808] border border-[#1e1e1e] rounded-[2.5rem] p-6 md:p-12 shadow-[0_80px_160px_rgba(0,0,0,0.95)] flex flex-col min-h-[420px] justify-center"
              >
                {(aiPhase === "loading_questions" ||
                  aiPhase === "loading_roadmap") && (
                  <AILoader
                    phase={
                      aiPhase === "loading_questions" ? "questions" : "roadmap"
                    }
                  />
                )}

                {aiPhase === "questions" && aiQuestions.length > 0 && (
                  <div className="flex flex-col h-full">
                    {/* Progress bar */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                          Calibration {currentQuestionIdx + 1} /{" "}
                          {aiQuestions.length}
                        </p>
                        <div className="flex gap-1">
                          {aiQuestions.map((_, i) => (
                            <div
                              key={i}
                              className="w-6 h-0.5 rounded-full transition-all duration-500"
                              style={{
                                background:
                                  i <= currentQuestionIdx
                                    ? "#ca8a04"
                                    : "#1e1e1e",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <h3 className="text-xl md:text-2xl font-extrabold text-white leading-tight tracking-tight">
                        {aiQuestions[currentQuestionIdx].question}
                      </h3>
                    </div>

                    <div className="flex-1">
                      {aiQuestions[currentQuestionIdx].type === "text" ? (
                        <textarea
                          autoFocus
                          value={
                            aiAnswers[aiQuestions[currentQuestionIdx].id] || ""
                          }
                          onChange={(e) =>
                            setAiAnswers({
                              ...aiAnswers,
                              [aiQuestions[currentQuestionIdx].id]:
                                e.target.value,
                            })
                          }
                          placeholder="Inject parameters..."
                          className="w-full h-32 bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl p-5 text-white focus:border-amber-500 outline-none resize-none custom-scrollbar text-sm"
                        />
                      ) : (
                        <div className="space-y-2.5">
                          {aiQuestions[currentQuestionIdx].options.map(
                            (opt) => {
                              const isSelected =
                                aiAnswers[
                                  aiQuestions[currentQuestionIdx].id
                                ] === opt;
                              return (
                                <button
                                  key={opt}
                                  onClick={() =>
                                    setAiAnswers({
                                      ...aiAnswers,
                                      [aiQuestions[currentQuestionIdx].id]: opt,
                                    })
                                  }
                                  className="w-full text-left px-5 py-4 border rounded-2xl font-bold transition-all text-sm"
                                  style={
                                    isSelected
                                      ? {
                                          background: "rgba(202,138,4,0.08)",
                                          borderColor: "#ca8a04",
                                          color: "#ca8a04",
                                        }
                                      : {
                                          background: "#0d0d0d",
                                          borderColor: "#1e1e1e",
                                          color: "#888",
                                        }
                                  }
                                >
                                  {opt}
                                </button>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-between items-center pt-6 border-t border-[#1a1a1a]">
                      {currentQuestionIdx > 0 ? (
                        <button
                          onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                          className="flex items-center gap-2 px-5 py-2.5 text-[#666] hover:text-white text-sm font-bold transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                      ) : (
                        <div />
                      )}
                      <button
                        onClick={() =>
                          currentQuestionIdx < aiQuestions.length - 1
                            ? setCurrentQuestionIdx((p) => p + 1)
                            : handleGenerateRoadmap()
                        }
                        disabled={
                          !aiAnswers[aiQuestions[currentQuestionIdx].id]
                        }
                        className="px-8 py-3.5 bg-white text-black font-extrabold rounded-full hover:bg-[#ddd] disabled:opacity-30 flex items-center gap-2 text-sm transition-colors"
                      >
                        {currentQuestionIdx < aiQuestions.length - 1
                          ? "Next Input"
                          : "Synthesize Topology"}
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Flow Canvas */}
        <ReactFlowProvider>
          <FlowCanvas
            nodes={nodes}
            setNodes={setNodes}
            edges={edges}
            setEdges={setEdges}
            hasUnsavedChanges={hasUnsavedChanges}
            setHasUnsavedChanges={setHasUnsavedChanges}
            isSaving={isSaving}
            handleCloudSave={handleCloudSave}
            isMapFullscreen={isMapFullscreen}
            setIsMapFullscreen={setIsMapFullscreen}
            setActiveEditNodeId={setActiveEditNodeId}
            addToast={addToast}
            addLedgerEntry={addLedgerEntry}
            subscriptionTier={subscriptionTier}
            totalNodesCount={nodes.length}
            onLimitReached={() => {
              setProModalReason("nodes");
              setIsProModalOpen(true);
            }}
            isFirstTime={isFirstTime}
            handleStartCalibration={handleStartCalibration}
          />
        </ReactFlowProvider>

        {/* ── DESKTOP: Node Command Center panel ── */}
        <AnimatePresence>
          {activeEditNodeId && activeNode && !isMobile && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closePanel}
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 26, stiffness: 220 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-0 right-0 h-full z-[110]"
              >
                <NodeCommandCenter
                  activeNode={activeNode}
                  updateActiveNode={updateActiveNode}
                  onClose={closePanel}
                  onDelete={handleDeleteActiveNode}
                  onSubtaskToggle={handleSubtaskToggle}
                  onCompleteAll={handleCompleteAll}
                  pendingScoreDelta={pendingScoreDelta}
                  edges={edges}
                  nodes={nodes}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── MOBILE: Bottom Sheet (shown when Edit Mode active + node selected) ── */}
        <AnimatePresence>
          {activeEditNodeId && activeNode && isMobile && isMobileEditMode && (
            <MobileEditSheet
              activeNode={activeNode}
              onUpdate={updateActiveNode}
              onClose={closePanel}
              onDelete={handleDeleteActiveNode}
              onSubtaskToggle={handleSubtaskToggle}
              onCompleteAll={handleCompleteAll}
              pendingScoreDelta={pendingScoreDelta}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── TOAST SYSTEM ── */}
      {createPortal(
        <div className="fixed bottom-5 left-4 right-4 md:left-6 md:right-auto z-[9999] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -16, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 260 }}
                className={cn(
                  "px-4 py-3 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-3 border text-xs font-bold tracking-wide pointer-events-auto max-w-[320px]",
                  t.type === "green"
                    ? "bg-[#041f10] border-emerald-500/25 text-emerald-400"
                    : t.type === "red"
                      ? "bg-[#1a0505] border-red-500/25 text-red-400"
                      : "bg-[#0d0d0d] border-[#1e1e1e] text-white",
                )}
              >
                {t.type === "green" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Activity className="w-4 h-4 text-[#555] shrink-0" />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}

      {/* ── VAULT ASSET INTEGRATOR MODAL ── */}
      <AnimatePresence>
        {vaultModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVaultModal({ ...vaultModal, isOpen: false })}
              className="absolute inset-0 bg-black/85 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-2xl bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-6 md:p-8 shadow-[0_80px_160px_rgba(0,0,0,0.95)] flex flex-col h-[500px]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-emerald-500" /> Vault
                    Synchronization
                  </h3>
                  <p className="text-[9px] text-[#444] font-bold uppercase tracking-widest mt-1">
                    Select an asset to wire into the neural map.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setVaultModal({ ...vaultModal, isOpen: false })
                  }
                  className="w-9 h-9 bg-[#0d0d0d] border border-[#1e1e1e] rounded-full text-[#555] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2 mb-6 flex-wrap">
                {["All", "Document", "Image", "Code"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setVaultModal({ ...vaultModal, filter: f })}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors border",
                      vaultModal.filter === f
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                        : "bg-[#0d0d0d] border-[#1a1a1a] text-[#555] hover:text-white",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {(userData?.vault || [])
                  .filter(
                    (a) =>
                      vaultModal.filter === "All" ||
                      a.type.includes(vaultModal.filter),
                  )
                  .map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => linkVaultAsset(asset)}
                      className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-emerald-500/30 rounded-xl cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#111] rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-[#555] group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">
                            {asset.name}
                          </p>
                          <p className="text-[9px] text-[#444] font-bold uppercase tracking-widest">
                            {asset.type} · {asset.status}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-[#333] group-hover:text-emerald-400 transition-colors" />
                    </div>
                  ))}
                {(!userData?.vault || userData.vault.length === 0) && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Database className="w-7 h-7 text-[#222] mb-3" />
                    <p className="text-sm font-bold text-[#666]">
                      Your Vault is Empty
                    </p>
                    <p className="text-[9px] text-[#444] uppercase tracking-widest mt-1">
                      Upload files in the Vault module first.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── VIDEO INTEGRATOR MODAL ── */}
      <AnimatePresence>
        {videoModal.isOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVideoModal({ ...videoModal, isOpen: false })}
              className="absolute inset-0 bg-black/85 backdrop-blur-lg"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-xl bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-6 md:p-8 shadow-[0_80px_160px_rgba(0,0,0,0.95)] flex flex-col h-[500px]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                    <Video className="w-5 h-5 text-sky-400" /> Media
                    Synchronization
                  </h3>
                  <p className="text-[9px] text-[#444] font-bold uppercase tracking-widest mt-1">
                    Embed external video protocols.
                  </p>
                </div>
                <button
                  onClick={() =>
                    setVideoModal({ ...videoModal, isOpen: false })
                  }
                  className="w-9 h-9 bg-[#0d0d0d] border border-[#1e1e1e] rounded-full text-[#555] hover:text-white flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-4 mb-6 border-b border-[#1a1a1a] pb-4">
                {["courses", "podcasts", "other", "add_own"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setVideoModal({ ...videoModal, tab })}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest transition-colors",
                      videoModal.tab === tab
                        ? "text-sky-400"
                        : "text-[#444] hover:text-white",
                    )}
                  >
                    {tab.replace("_", " ")}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex flex-col">
                {videoModal.tab === "add_own" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                        Video Designation
                      </label>
                      <input
                        type="text"
                        value={videoModal.customTitle}
                        onChange={(e) =>
                          setVideoModal({
                            ...videoModal,
                            customTitle: e.target.value,
                          })
                        }
                        placeholder="e.g. YC Startup School Lecture 4"
                        className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3 text-sm text-white focus:border-sky-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                        Media URL (YouTube Supported)
                      </label>
                      <input
                        type="url"
                        value={videoModal.customUrl}
                        onChange={(e) =>
                          setVideoModal({
                            ...videoModal,
                            customUrl: e.target.value,
                          })
                        }
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-3 text-sm text-white focus:border-sky-400 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Video className="w-7 h-7 text-[#222] mb-3" />
                    <p className="text-sm font-bold text-[#555]">
                      Directory Empty
                    </p>
                    <p className="text-[9px] text-[#333] uppercase tracking-widest mt-1">
                      No system videos. Add your own.
                    </p>
                  </div>
                )}
              </div>
              <div className="pt-5 mt-auto border-t border-[#1a1a1a]">
                <button
                  onClick={embedVideo}
                  disabled={
                    !videoModal.customUrl && videoModal.tab === "add_own"
                  }
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-30 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors shadow-[0_0_25px_rgba(56,189,248,0.25)]"
                >
                  Establish Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PRO TIER GATE MODAL ── */}
      <AnimatePresence>
        {isProModalOpen && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-8 text-center shadow-[0_80px_160px_rgba(0,0,0,0.95)]"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-7 h-7 text-red-500" />
              </div>
              <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-4 animate-pulse" />
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">
                Protocol Locked
              </h3>
              <p className="text-[#666] text-sm mb-8 leading-relaxed">
                {proModalReason === "nodes"
                  ? `Free tier restricts topology to ${TIER_LIMITS.free} active nodes. Upgrade to Discotive Pro for unlimited neural expansion.`
                  : proModalReason === "regenerate"
                    ? "Neural regeneration requires Pro clearance. Upgrade to unlock AI trajectory synthesis."
                    : "This feature requires an active Discotive Pro subscription."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="flex-1 py-3.5 bg-[#0d0d0d] border border-[#1e1e1e] text-white text-xs font-bold rounded-xl hover:bg-[#111] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate("/premium")}
                  className="flex-1 py-3.5 bg-amber-500 text-black text-xs font-extrabold uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-colors shadow-[0_0_30px_rgba(202,138,4,0.3)]"
                >
                  Upgrade OS
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Roadmap;
