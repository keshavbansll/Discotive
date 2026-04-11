/**
 * @fileoverview QuantumEdge — Directional Data Flow Conduits
 * @description
 * Replaces NeuralEdge.jsx with a precise, high-performance implementation.
 * Uses CSS offset-path particles (GPU-composited, zero main-thread cost).
 *
 * Visual contract:
 * - LOCKED source:   thin dashed grey, no particles
 * - ACTIVE source:   amber dashed, 1 slow particle
 * - IN_PROGRESS:     amber solid, 1 fast particle
 * - VERIFIED source: emerald solid, 3 particles (max throughput)
 * - VERIFYING:       violet pulsing dashed, 2 medium particles
 * - BACKOFF:         crimson dashed, 0 particles (flow blocked)
 *
 * Edge style computed from SOURCE node state.
 * O(1) lookup via useStore — zero context dependency.
 */

import React, { memo, useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getBezierPath,
  useStore,
} from "reactflow";
import { NODE_STATES } from "../../store/useRoadmapStore";

// ── Inject CSS keyframes once ─────────────────────────────────────────────────
let _injected = false;
const injectKeyframes = () => {
  if (_injected || typeof document === "undefined") return;
  _injected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes qDash   { to { stroke-dashoffset: -28; } }
    @keyframes qOrbit0 { 0% { offset-distance: 0%;   } 100% { offset-distance: 100%; } }
    @keyframes qOrbit1 { 0% { offset-distance: 33%;  } 100% { offset-distance: 133%; } }
    @keyframes qOrbit2 { 0% { offset-distance: 66%;  } 100% { offset-distance: 166%; } }
    @keyframes qBlink  { 0%, 100% { stroke-opacity: 0.5; } 50% { stroke-opacity: 0.15; } }
  `;
  document.head.appendChild(style);
};

// ── State → visual mapping ────────────────────────────────────────────────────
const VISUALS = {
  [NODE_STATES.VERIFIED]: {
    color: "#4ADE80",
    opacity: 0.85,
    particles: 3,
    speed: 1.8,
    dash: 0,
    glow: "drop-shadow(0 0 5px rgba(74,222,128,0.6))",
  },
  [NODE_STATES.IN_PROGRESS]: {
    color: "#BFA264",
    opacity: 0.8,
    particles: 2,
    speed: 2.2,
    dash: 0,
    glow: "drop-shadow(0 0 4px rgba(191,162,100,0.5))",
  },
  [NODE_STATES.ACTIVE]: {
    color: "#BFA264",
    opacity: 0.55,
    particles: 1,
    speed: 3.0,
    dash: 7,
    glow: "none",
  },
  [NODE_STATES.VERIFYING]: {
    color: "#A78BFA",
    opacity: 0.75,
    particles: 2,
    speed: 3.5,
    dash: 6,
    glow: "drop-shadow(0 0 6px rgba(167,139,250,0.6))",
  },
  [NODE_STATES.VERIFIED_GHOST]: {
    color: "#4ADE80",
    opacity: 0.3,
    particles: 1,
    speed: 5.0,
    dash: 4,
    glow: "none",
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    color: "#F87171",
    opacity: 0.45,
    particles: 0,
    speed: 0,
    dash: 4,
    glow: "none",
    backoffAnim: true,
  },
  [NODE_STATES.LOCKED]: {
    color: "rgba(255,255,255,0.1)",
    opacity: 0.3,
    particles: 0,
    speed: 0,
    dash: 6,
    glow: "none",
  },
};
const DEFAULT_VIS = VISUALS[NODE_STATES.LOCKED];

export const QuantumEdge = memo(
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

    // O(1) source node state lookup
    const sourceNode = useStore((s) => s.nodeInternals.get(source));
    const sourceState =
      sourceNode?.data?._computed?.state || NODE_STATES.LOCKED;
    const vis = VISUALS[sourceState] || DEFAULT_VIS;

    const connType = data?.connType || "open";
    const accent = data?.accent || vis.color;
    const w =
      connType === "core-core" ? 2.5 : connType === "core-branch" ? 1.8 : 1.2;

    // Path computation
    const [edgePath, labelX, labelY] = useMemo(() => {
      const args = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      };
      return connType === "core-core"
        ? getBezierPath(args)
        : getSmoothStepPath({ ...args, borderRadius: 12, offset: 40 });
    }, [
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      connType,
    ]);

    const strokeColor = selected ? accent : vis.color;
    const strokeW = selected ? w + 0.5 : w;
    const dashArray =
      vis.dash > 0 ? `${vis.dash} ${Math.round(vis.dash * 0.6)}` : undefined;
    const particleCount = selected
      ? Math.min(vis.particles + 1, 4)
      : vis.particles;

    const strokeStyle = {
      stroke: strokeColor,
      strokeWidth: strokeW,
      opacity: selected ? Math.min(vis.opacity + 0.2, 1) : vis.opacity,
      strokeDasharray: dashArray,
      filter: selected && vis.glow !== "none" ? vis.glow : "none",
      ...(vis.backoffAnim
        ? { animation: "qBlink 2s ease-in-out infinite" }
        : {}),
      ...(vis.particles > 0 && dashArray
        ? { animation: `qDash 1.6s linear infinite` }
        : {}),
      transition: "stroke-width 0.2s, opacity 0.3s, stroke 0.3s",
    };

    return (
      <>
        <BaseEdge path={edgePath} style={{ ...style, ...strokeStyle }} />

        {/* Double-stroke for required core connections */}
        {connType === "core-core" && data?.isRequired && (
          <BaseEdge
            path={edgePath}
            style={{
              ...style,
              stroke: strokeColor,
              strokeWidth: w + 4,
              opacity: vis.opacity * 0.07,
              strokeDasharray: undefined,
              pointerEvents: "none",
            }}
          />
        )}

        {/* GPU-composited data particles */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <circle
            key={i}
            r={selected ? 3.5 : 2.5}
            fill={vis.color}
            style={{
              filter: `drop-shadow(0 0 ${selected ? 6 : 3}px ${vis.color}90)`,
              offsetPath: `path("${edgePath}")`,
              offsetDistance: "0%",
              animation: `qOrbit${i} ${vis.speed + i * 0.5}s linear infinite`,
              willChange: "offset-distance",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Selected diagnostic label */}
        {selected && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "none",
                background: "rgba(7,7,9,0.95)",
                border: `1px solid ${strokeColor}40`,
                fontSize: 8,
                fontWeight: 900,
                color: strokeColor,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                padding: "2px 6px",
                borderRadius: 6,
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: vis.color,
                  boxShadow:
                    vis.glow !== "none" ? `0 0 4px ${vis.color}` : "none",
                }}
              />
              {connType}
              <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
              <span style={{ color: vis.color }}>
                {vis.particles > 0
                  ? "LIVE"
                  : sourceState === NODE_STATES.FAILED_BACKOFF
                    ? "BLOCKED"
                    : "IDLE"}
              </span>
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

QuantumEdge.displayName = "QuantumEdge";
export const edgeTypes = { neuralEdge: QuantumEdge };
