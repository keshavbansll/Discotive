/**
 * @fileoverview SpatialConcept — Interactive Node Graph (2D SVG / Framer Motion)
 * @description
 * Psychological Hook: Visualizing complex multiplicative intelligence.
 * Framer Motion orchestrated SVG network graph — nodes snap into unified architecture.
 * Slider-driven reveal: fragmented → connected.
 * Zero WebGL dependency — GPU-safe, battery-safe, universal support.
 * Graceful degradation: static fallback if animation fails.
 */

import React, { useState, useCallback, useMemo, memo, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

/* ─── Constants ────────────────────────────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  border: "rgba(191,162,100,0.25)",
  dimBg: "rgba(191,162,100,0.08)",
};
const T = {
  primary: "#F5F0E8",
  dim: "rgba(245,240,232,0.28)",
  secondary: "rgba(245,240,232,0.6)",
};
const V = { surface: "#0F0F0F" };

/* ─── Graph layout helpers ──────────────────────────────────────────────── */
const parseNodesFromBlock = (block) => {
  // Use block.nodes if provided, else derive from block.concepts array or title
  if (block.nodes && Array.isArray(block.nodes) && block.nodes.length > 0) {
    return block.nodes;
  }
  // Fallback: auto-generate from concepts
  const concepts = block.concepts || [
    block.title || "Core Concept",
    "Execution",
    "Systems",
    "Leverage",
    "Outcome",
  ];
  return concepts.slice(0, 7).map((label, i) => ({ id: `n${i}`, label }));
};

const parseEdgesFromBlock = (block, nodes) => {
  if (block.edges && Array.isArray(block.edges)) return block.edges;
  // Auto-connect: hub-spoke from first node, then chain
  const edges = [];
  for (let i = 1; i < nodes.length; i++) {
    edges.push({ source: nodes[0].id, target: nodes[i].id });
    if (i > 1 && i < nodes.length - 1) {
      edges.push({
        source: nodes[i].id,
        target: nodes[i + 1 < nodes.length ? i + 1 : 0].id,
      });
    }
  }
  return edges;
};

/* ─── Layout algorithm: force-directed approximation (static, fast) ─────── */
const computeLayout = (nodes, width, height) => {
  const cx = width / 2;
  const cy = height / 2;
  const n = nodes.length;
  if (n === 0) return {};
  if (n === 1) return { [nodes[0].id]: { x: cx, y: cy } };

  // First node = center hub
  const positions = { [nodes[0].id]: { x: cx, y: cy } };

  // Remaining nodes: arrange in ellipse with golden-angle offset
  const rx = Math.min(width * 0.36, 130);
  const ry = Math.min(height * 0.36, 100);
  const goldenAngle = 2.399963; // radians

  for (let i = 1; i < n; i++) {
    const angle = i * goldenAngle;
    positions[nodes[i].id] = {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  }
  return positions;
};

/* ─── "Fragmented" scattered positions (pre-reveal) ─────────────────────── */
const computeScatterLayout = (nodes, width, height, seed = 42) => {
  const positions = {};
  let r = seed;
  const rand = () => {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    return (r >>> 0) / 0xffffffff;
  };

  for (const node of nodes) {
    positions[node.id] = {
      x: 30 + rand() * (width - 60),
      y: 20 + rand() * (height - 40),
    };
  }
  return positions;
};

/* ─── Node component ────────────────────────────────────────────────────── */
const GraphNode = memo(
  ({ node, pos, connected, isCenter, progress, onClick, isActive }) => {
    const r = isCenter ? 26 : 18;
    const opacity = connected ? 1 : 0.3 + progress * 0.7;

    return (
      <motion.g
        style={{ cursor: "pointer" }}
        onClick={() => onClick(node.id)}
        whileHover="hover"
      >
        {/* Glow ring */}
        {(isCenter || isActive) && (
          <motion.circle
            cx={pos.x}
            cy={pos.y}
            r={r + 8}
            fill="none"
            stroke={G.bright}
            strokeWidth={1}
            strokeOpacity={0.2 + progress * 0.3}
            animate={{ r: [r + 6, r + 12, r + 6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Node circle */}
        <motion.circle
          cx={pos.x}
          cy={pos.y}
          r={r}
          fill={
            isCenter
              ? `url(#goldGrad)`
              : isActive
                ? "rgba(191,162,100,0.2)"
                : "rgba(255,255,255,0.04)"
          }
          stroke={
            isCenter || isActive
              ? G.bright
              : connected
                ? "rgba(191,162,100,0.4)"
                : "rgba(255,255,255,0.1)"
          }
          strokeWidth={isCenter ? 2 : 1.5}
          opacity={opacity}
          whileHover={{ r: r + 3 }}
          transition={{ duration: 0.2 }}
        />

        {/* Label */}
        <motion.text
          x={pos.x}
          y={pos.y + r + 13}
          textAnchor="middle"
          fill={isCenter ? G.bright : T.secondary}
          fontSize={isCenter ? 9 : 8}
          fontWeight={isCenter ? "900" : "700"}
          fontFamily="Montserrat, sans-serif"
          letterSpacing="0.05em"
          opacity={opacity}
          style={{ userSelect: "none", textTransform: "uppercase" }}
        >
          {node.label?.length > 12 ? `${node.label.slice(0, 11)}…` : node.label}
        </motion.text>
      </motion.g>
    );
  },
);

/* ─── Edge component ─────────────────────────────────────────────────────── */
const GraphEdge = memo(({ x1, y1, x2, y2, progress, active }) => {
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  return (
    <motion.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={active ? G.bright : "rgba(191,162,100,0.25)"}
      strokeWidth={active ? 1.5 : 1}
      strokeDasharray={length}
      strokeDashoffset={length * (1 - progress)}
      opacity={0.15 + progress * 0.7}
      style={{ filter: active ? `drop-shadow(0 0 3px ${G.bright}60)` : "none" }}
      transition={{ strokeDashoffset: { duration: 0.6, ease: "easeOut" } }}
    />
  );
});

/* ─── Main Component ───────────────────────────────────────────────────── */
const SpatialConcept = ({ block, textColor }) => {
  const tc = textColor || T.primary;
  const [progress, setProgress] = useState(0); // 0 = scattered, 1 = unified
  const [activeNode, setActiveNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const W = 320;
  const H = 200;

  const nodes = useMemo(() => parseNodesFromBlock(block), [block]);
  const edges = useMemo(
    () => parseEdgesFromBlock(block, nodes),
    [block, nodes],
  );

  const unifiedPositions = useMemo(() => computeLayout(nodes, W, H), [nodes]);
  const scatterPositions = useMemo(
    () => computeScatterLayout(nodes, W, H),
    [nodes],
  );

  // Interpolate between scatter and unified based on progress
  const currentPositions = useMemo(() => {
    const result = {};
    for (const node of nodes) {
      const s = scatterPositions[node.id] || { x: W / 2, y: H / 2 };
      const u = unifiedPositions[node.id] || { x: W / 2, y: H / 2 };
      result[node.id] = {
        x: s.x + (u.x - s.x) * progress,
        y: s.y + (u.y - s.y) * progress,
      };
    }
    return result;
  }, [nodes, scatterPositions, unifiedPositions, progress]);

  const connectedNodes = useMemo(() => {
    const set = new Set();
    if (progress > 0.5) {
      edges.forEach((e) => {
        set.add(e.source);
        set.add(e.target);
      });
    }
    return set;
  }, [edges, progress]);

  const handleNodeClick = useCallback((id) => {
    setActiveNode((prev) => (prev === id ? null : id));
  }, []);

  const activeNodeData = useMemo(
    () => nodes.find((n) => n.id === activeNode),
    [nodes, activeNode],
  );

  const handleSliderChange = useCallback((e) => {
    setProgress(parseFloat(e.target.value));
    setActiveNode(null);
  }, []);

  const snapToUnified = useCallback(() => {
    // Animate slider snap
    let p = progress;
    const target = progress > 0.5 ? 1 : 0;
    const step = () => {
      p += (target - p) * 0.15;
      if (Math.abs(p - target) < 0.005) {
        setProgress(target);
        return;
      }
      setProgress(p);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [progress]);

  return (
    <div
      className="h-full flex flex-col justify-center px-7 md:px-11 py-8"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke={G.bright}
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="4" r="2" />
            <circle cx="20" cy="8" r="2" />
            <circle cx="20" cy="16" r="2" />
            <circle cx="12" cy="20" r="2" />
            <circle cx="4" cy="16" r="2" />
            <circle cx="4" cy="8" r="2" />
            <line x1="12" y1="7" x2="12" y2="9" />
            <line x1="18.5" y1="9.5" x2="14" y2="11" />
            <line x1="18.5" y1="14.5" x2="14" y2="13" />
            <line x1="12" y1="15" x2="12" y2="17" />
            <line x1="5.5" y1="14.5" x2="10" y2="13" />
            <line x1="5.5" y1="9.5" x2="10" y2="11" />
          </svg>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-[0.25em]"
          style={{ color: G.base }}
        >
          Spatial Concept
        </span>
        <div
          className="flex-1 h-px"
          style={{
            background: `linear-gradient(to right, rgba(191,162,100,0.2), transparent)`,
          }}
        />
        <span
          className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{
            background: progress > 0.5 ? G.dimBg : "rgba(255,255,255,0.04)",
            color: progress > 0.5 ? G.bright : T.dim,
            border: `1px solid ${progress > 0.5 ? G.border : "rgba(255,255,255,0.06)"}`,
            transition: "all 0.3s",
          }}
        >
          {progress === 0
            ? "Fragmented"
            : progress === 1
              ? "Unified"
              : "Connecting…"}
        </span>
      </div>

      {/* Block title */}
      {block.title && (
        <h2
          className="font-display font-black leading-tight mb-5"
          style={{
            fontSize: "clamp(1.1rem, 2.8vw, 1.5rem)",
            color: tc,
            letterSpacing: "-0.025em",
          }}
        >
          {block.title}
        </h2>
      )}

      {/* SVG Graph */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          height: H + 20,
        }}
      >
        {/* Background grid dots */}
        <svg
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern
              id="grid"
              x="0"
              y="0"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="12" cy="12" r="0.5" fill={G.bright} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <svg
          width="100%"
          height={H + 20}
          viewBox={`0 0 ${W} ${H + 20}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={G.light} stopOpacity="0.9" />
              <stop offset="100%" stopColor={G.deep} stopOpacity="1" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const sp = currentPositions[edge.source];
            const tp = currentPositions[edge.target];
            if (!sp || !tp) return null;
            const isActive =
              activeNode === edge.source || activeNode === edge.target;
            return (
              <GraphEdge
                key={`e-${i}`}
                x1={sp.x}
                y1={sp.y}
                x2={tp.x}
                y2={tp.y}
                progress={Math.max(0, Math.min(1, (progress - 0.3) / 0.7))}
                active={isActive}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const pos = currentPositions[node.id];
            if (!pos) return null;
            return (
              <GraphNode
                key={node.id}
                node={node}
                pos={pos}
                connected={connectedNodes.has(node.id)}
                isCenter={i === 0}
                progress={progress}
                onClick={handleNodeClick}
                isActive={activeNode === node.id}
              />
            );
          })}
        </svg>

        {/* Active node tooltip */}
        <AnimatePresence>
          {activeNodeData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-2 left-2 right-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(20,20,20,0.95)",
                border: `1px solid ${G.border}`,
                backdropFilter: "blur(12px)",
              }}
            >
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: G.bright }}
              >
                {activeNodeData.label}
              </p>
              {activeNodeData.detail && (
                <p className="text-[9px] mt-0.5" style={{ color: T.dim }}>
                  {activeNodeData.detail}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slider control */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Fragment
          </span>
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Unified
          </span>
        </div>

        <div className="relative flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={handleSliderChange}
            onMouseUp={snapToUnified}
            onTouchEnd={snapToUnified}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${G.bright} ${progress * 100}%, rgba(255,255,255,0.08) ${progress * 100}%)`,
              WebkitAppearance: "none",
            }}
          />
        </div>

        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${G.light}, ${G.deep});
            border: 2px solid ${G.bright};
            box-shadow: 0 0 8px rgba(191,162,100,0.4);
            cursor: pointer;
            transition: transform 0.15s;
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }
          input[type=range]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, ${G.light}, ${G.deep});
            border: 2px solid ${G.bright};
            cursor: pointer;
          }
        `}</style>

        <p
          className="text-[8px] font-mono text-center"
          style={{ color: T.dim }}
        >
          Drag to connect · Tap a node to inspect
        </p>
      </div>

      {/* Description */}
      {block.description && (
        <p
          className="mt-4 text-xs leading-relaxed"
          style={{
            color: `${tc}70`,
            fontSize: "clamp(0.75rem, 2vw, 0.875rem)",
          }}
        >
          {block.description}
        </p>
      )}
    </div>
  );
};

export default memo(SpatialConcept);
