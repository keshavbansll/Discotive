/**
 * @fileoverview LogicGateNode.jsx — AND / OR Convergence Gate
 * @description
 * Models agentic workflow conditional logic. The gate evaluates ALL (AND) or
 * ANY (OR) inbound parent node states before unlocking downstream children.
 * Visual states: locked dim diamond → active pulsing amber → verified emerald.
 * The engine state is computed by AgenticExecutionEngine, not here.
 */

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { NODE_STATES } from "../../../contexts/AgenticExecutionEngine.jsx";

const HANDLE_S = {
  width: 10,
  height: 10,
  background: "#111",
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderRadius: "50%",
};

const STATE_MAP = {
  [NODE_STATES.VERIFIED]: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.4)",
    glow: "0 0 20px rgba(16,185,129,0.35)",
  },
  [NODE_STATES.ACTIVE]: {
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    border: "rgba(191,162,100,0.35)",
    glow: "0 0 14px rgba(191,162,100,0.3)",
  },
  [NODE_STATES.IN_PROGRESS]: {
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    border: "rgba(191,162,100,0.35)",
    glow: "0 0 14px rgba(191,162,100,0.3)",
  },
  [NODE_STATES.VERIFYING]: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.4)",
    glow: "0 0 18px rgba(139,92,246,0.4)",
  },
  [NODE_STATES.LOCKED]: {
    color: "rgba(255,255,255,0.2)",
    bg: "rgba(255,255,255,0.02)",
    border: "rgba(255,255,255,0.07)",
    glow: "none",
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.35)",
    glow: "0 0 14px rgba(239,68,68,0.3)",
  },
};
const DEFAULT_STATE = STATE_MAP[NODE_STATES.LOCKED];

export const LogicGateNode = memo(({ data, selected }) => {
  const computedState = data._computed?.state || NODE_STATES.LOCKED;
  const logicType = data.logicType || "AND";
  const vis = STATE_MAP[computedState] ?? DEFAULT_STATE;

  const isVerified = computedState === NODE_STATES.VERIFIED;
  const isActive =
    computedState === NODE_STATES.ACTIVE ||
    computedState === NODE_STATES.IN_PROGRESS;
  const isLocked = computedState === NODE_STATES.LOCKED;

  const SIZE = 56;

  return (
    <motion.div
      animate={isActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={
        isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}
      }
      style={{
        width: SIZE,
        height: SIZE,
        position: "relative",
        zIndex: 10,
      }}
      role="article"
      aria-label={`${logicType} Logic Gate — ${computedState}`}
    >
      {/* ── Handles ─────────────────────────────────────────────────────────── */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ ...HANDLE_S, borderColor: `${vis.color}60`, top: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ ...HANDLE_S, borderColor: `${vis.color}60`, left: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...HANDLE_S, borderColor: `${vis.color}60`, top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...HANDLE_S, borderColor: `${vis.color}60`, left: "50%" }}
      />

      {/* ── Gate shape (rotated square = diamond) ───────────────────────────── */}
      <div
        style={{
          width: SIZE,
          height: SIZE,
          transform: "rotate(45deg)",
          background: vis.bg,
          border: `2px solid ${selected ? vis.color : vis.border}`,
          borderRadius: 8,
          boxShadow: selected ? vis.glow : isActive ? vis.glow : "none",
          transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* ── Pulse ring for active state ── */}
        {isActive && (
          <motion.div
            animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: 10,
              border: `1.5px solid ${vis.color}`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* ── Type label (un-rotates so text reads normally) ── */}
        <div
          style={{
            transform: "rotate(-45deg)",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: vis.color,
              letterSpacing: "0.05em",
              fontFamily: "monospace",
              display: "block",
              textAlign: "center",
              lineHeight: 1,
            }}
          >
            {logicType}
          </span>
          {!isLocked && (
            <span
              style={{
                fontSize: 7,
                fontWeight: 700,
                color: `${vis.color}70`,
                letterSpacing: "0.1em",
                display: "block",
                textAlign: "center",
                lineHeight: 1,
                marginTop: 2,
                textTransform: "uppercase",
              }}
            >
              {computedState === NODE_STATES.VERIFIED
                ? "PASS"
                : computedState === NODE_STATES.VERIFYING
                  ? "EVAL"
                  : "GATE"}
            </span>
          )}
        </div>
      </div>

      {/* ── Verified checkmark overlay ── */}
      {isVerified && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#10b981",
            border: "2px solid #030303",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            boxShadow: "0 0 8px rgba(16,185,129,0.5)",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1 4L3 6L7 2"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}

      {/* ── Tooltip on hover ── */}
      {selected && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            background: "rgba(6,6,6,0.95)",
            border: `1px solid ${vis.border}`,
            borderRadius: 8,
            padding: "4px 8px",
            fontSize: 8,
            fontWeight: 800,
            color: vis.color,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            backdropFilter: "blur(8px)",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {logicType === "AND"
            ? "ALL parents must complete"
            : "ANY parent completes"}
        </div>
      )}
    </motion.div>
  );
});

LogicGateNode.displayName = "LogicGateNode";
