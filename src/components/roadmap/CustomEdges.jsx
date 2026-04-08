/**
 * @fileoverview CustomEdges.jsx — Agentic Data Pipeline Edges
 * @description
 * These are NOT decorative lines. They are animated state machine conduits.
 * Visual language:
 * - LOCKED source → grey dashed, no particle, no animation
 * - ACTIVE/IN_PROGRESS source → amber dashed flowing, 1 particle
 * - VERIFIED source → emerald solid, 3 particles (max throughput)
 * - VERIFYING source → violet pulsing, 2 slow particles
 * - FAILED_BACKOFF source → crimson dashed, no particle, ominous glow
 *
 * Particles use CSS offset-path for GPU-composited animation (60fps, zero jank).
 * Edge label shows connection type + flow state on selection.
 */

import React, { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  useStore,
} from "reactflow";
import { NODE_STATES } from "../../contexts/AgenticExecutionEngine.jsx";

// ── Structural config per connection type ─────────────────────────────────────
const EDGE_CFG = {
  "core-core": { w: 2.5, defaultDash: 0, curveType: "bezier" },
  "core-branch": { w: 1.8, defaultDash: 8, curveType: "smoothstep" },
  "branch-sub": { w: 1.2, defaultDash: 0, curveType: "smoothstep" },
  open: { w: 1.0, defaultDash: 6, curveType: "smoothstep" },
};
const DEFAULT_CFG = { w: 1.0, defaultDash: 6, curveType: "smoothstep" };

// ── State → visual mapping ────────────────────────────────────────────────────
const STATE_VISUAL = {
  [NODE_STATES.VERIFIED]: {
    color: "#10b981",
    opacity: 0.85,
    glow: "0 0 8px rgba(16,185,129,0.5)",
    particles: 3,
    particleColor: "#10b981",
    particleSize: 3,
    speed: 1.8,
    dashDivisor: 0,
  },
  [NODE_STATES.IN_PROGRESS]: {
    color: "#BFA264",
    opacity: 0.8,
    glow: "0 0 6px rgba(191,162,100,0.4)",
    particles: 2,
    particleColor: "#D4AF78",
    particleSize: 2.5,
    speed: 2.5,
    dashDivisor: 6,
  },
  [NODE_STATES.ACTIVE]: {
    color: "#BFA264",
    opacity: 0.6,
    glow: "none",
    particles: 1,
    particleColor: "#BFA264",
    particleSize: 2,
    speed: 3.5,
    dashDivisor: 8,
  },
  [NODE_STATES.VERIFYING]: {
    color: "#8b5cf6",
    opacity: 0.75,
    glow: "0 0 10px rgba(139,92,246,0.5)",
    particles: 2,
    particleColor: "#8b5cf6",
    particleSize: 3,
    speed: 4.0,
    dashDivisor: 0,
  },
  [NODE_STATES.VERIFIED_GHOST]: {
    color: "#10b981",
    opacity: 0.35,
    glow: "none",
    particles: 1,
    particleColor: "#10b981",
    particleSize: 1.5,
    speed: 5.0,
    dashDivisor: 4,
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    color: "#ef4444",
    opacity: 0.5,
    glow: "0 0 6px rgba(239,68,68,0.3)",
    particles: 0,
    particleColor: "#ef4444",
    particleSize: 0,
    speed: 0,
    dashDivisor: 4,
  },
  [NODE_STATES.LOCKED]: {
    color: "rgba(255,255,255,0.12)",
    opacity: 0.2,
    glow: "none",
    particles: 0,
    particleColor: "transparent",
    particleSize: 0,
    speed: 0,
    dashDivisor: 6,
  },
  [NODE_STATES.CORRUPTED]: {
    color: "#ef4444",
    opacity: 0.3,
    glow: "none",
    particles: 0,
    particleColor: "#ef4444",
    particleSize: 0,
    speed: 0,
    dashDivisor: 2,
  },
};
const DEFAULT_VISUAL = STATE_VISUAL[NODE_STATES.LOCKED];

// ── Keyframes injected once ───────────────────────────────────────────────────
let _keyframesInjected = false;
const injectKeyframes = () => {
  if (_keyframesInjected || typeof document === "undefined") return;
  _keyframesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes discotive_dashFlow   { to { stroke-dashoffset: -32; } }
    @keyframes discotive_orbit0     { 0% { offset-distance: 0%; } 100% { offset-distance: 100%; } }
    @keyframes discotive_orbit1     { 0% { offset-distance: 33%; } 100% { offset-distance: 133%; } }
    @keyframes discotive_orbit2     { 0% { offset-distance: 66%; } 100% { offset-distance: 166%; } }
    @keyframes discotive_pulse      { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
    @keyframes discotive_backoffGlow { 0%,100% { stroke-opacity: 0.5; } 50% { stroke-opacity: 0.15; } }
  `;
  document.head.appendChild(style);
};

// ── NeuralEdge ────────────────────────────────────────────────────────────────
export const NeuralEdge = memo(
  ({
    id,
    source,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    data,
    selected,
  }) => {
    injectKeyframes();

    // Subscribe to source node state from React Flow's internal store
    const sourceNode = useStore((s) => s.nodeInternals.get(source));
    const sourceState =
      sourceNode?.data?._computed?.state || NODE_STATES.LOCKED;

    const connType = data?.connType || "open";
    const cfg = EDGE_CFG[connType] ?? DEFAULT_CFG;
    const vis = STATE_VISUAL[sourceState] ?? DEFAULT_VISUAL;
    const accent = data?.accent || vis.color;
    const isRequired = data?.isRequired !== false;
    const logicType = data?.logicGateType;

    // ── Path computation ───────────────────────────────────────────────────────
    const [edgePath, labelX, labelY] = useMemo(() => {
      const pathArgs = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      };
      if (cfg.curveType === "bezier") return getBezierPath(pathArgs);
      return getSmoothStepPath({ ...pathArgs, borderRadius: 14, offset: 50 });
    }, [
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      cfg.curveType,
    ]);

    // ── Visual resolution ──────────────────────────────────────────────────────
    const strokeColor = selected ? accent || vis.color : vis.color;
    const strokeOpacity = selected
      ? Math.min(vis.opacity + 0.2, 1)
      : vis.opacity;
    const strokeW = selected ? cfg.w + 0.5 : cfg.w;

    const isFlowing = vis.particles > 0;
    const dashArray = !isFlowing
      ? vis.dashDivisor > 0
        ? `${vis.dashDivisor} ${Math.round(vis.dashDivisor * 0.75)}`
        : undefined
      : cfg.defaultDash > 0
        ? `${cfg.defaultDash} ${Math.round(cfg.defaultDash * 0.5)}`
        : undefined;

    const strokeAnimation =
      sourceState === NODE_STATES.FAILED_BACKOFF
        ? { animation: "discotive_backoffGlow 2s ease-in-out infinite" }
        : isFlowing && dashArray
          ? { animation: "discotive_dashFlow 1.8s linear infinite" }
          : {};

    // ── Particle count: more particles = higher data throughput visual ─────────
    const particleCount = selected
      ? Math.min(vis.particles + 1, 4)
      : vis.particles;

    return (
      <>
        {/* ── Main conduit stroke ── */}
        <BaseEdge
          path={edgePath}
          style={{
            ...style,
            stroke: strokeColor,
            strokeWidth: strokeW,
            opacity: strokeOpacity,
            strokeDasharray: dashArray,
            filter: selected && vis.glow !== "none" ? vis.glow : "none",
            transition: "stroke 0.3s, stroke-width 0.2s, opacity 0.3s",
            ...strokeAnimation,
          }}
        />

        {/* ── Required indicator: double-stroke for mandatory edges ── */}
        {isRequired && connType === "core-core" && (
          <BaseEdge
            path={edgePath}
            style={{
              ...style,
              stroke: strokeColor,
              strokeWidth: strokeW + 3,
              opacity: strokeOpacity * 0.08,
              strokeDasharray: undefined,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ── Data particles: GPU-composited offset-path animation ── */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <circle
            key={i}
            r={selected ? vis.particleSize + 0.5 : vis.particleSize}
            fill={vis.particleColor}
            style={{
              filter: `drop-shadow(0 0 ${selected ? 6 : 3}px ${vis.particleColor}90)`,
              offsetPath: `path("${edgePath}")`,
              offsetDistance: "0%",
              animation: `discotive_orbit${i} ${vis.speed + i * 0.4}s linear infinite`,
              willChange: "offset-distance",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* ── Logic gate type indicator on edge ── */}
        {logicType && (
          <circle
            cx={(sourceX + targetX) / 2}
            cy={(sourceY + targetY) / 2}
            r={8}
            fill="#0a0a0a"
            stroke={strokeColor}
            strokeWidth={1.5}
            style={{ filter: "drop-shadow(0 0 4px rgba(0,0,0,0.8))" }}
          />
        )}
        {logicType && (
          <text
            x={(sourceX + targetX) / 2}
            y={(sourceY + targetY) / 2 + 3}
            textAnchor="middle"
            style={{
              fontSize: 7,
              fontWeight: 900,
              fill: vis.particleColor,
              fontFamily: "monospace",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {logicType}
          </text>
        )}

        {/* ── Diagnostic label: shown only on selection ── */}
        {selected && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "none",
                background: "rgba(6,6,6,0.95)",
                border: `1px solid ${accent}40`,
                fontSize: 8,
                fontWeight: 900,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                backdropFilter: "blur(8px)",
              }}
              className="px-2 py-1 rounded-lg shadow-xl flex items-center gap-1.5"
            >
              <div
                className="w-1 h-1 rounded-full"
                style={{
                  background: vis.color,
                  boxShadow: vis.glow !== "none" ? vis.glow : "none",
                }}
              />
              {connType}
              <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 2 }}>
                {isFlowing
                  ? "FLOWING"
                  : sourceState === NODE_STATES.FAILED_BACKOFF
                    ? "BLOCKED"
                    : "LOCKED"}
              </span>
              {isRequired && (
                <span style={{ color: vis.color, marginLeft: 2 }}>
                  REQUIRED
                </span>
              )}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

NeuralEdge.displayName = "NeuralEdge";
export const edgeTypes = { neuralEdge: NeuralEdge };
