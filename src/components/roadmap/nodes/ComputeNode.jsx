/**
 * @fileoverview ComputeNode — AI Gatekeeper with n8n-Inspired Dense Aesthetic
 * @description
 * The AI verification gate. Appears between execution nodes as a
 * "Gemini evaluation checkpoint." Visually inspired by n8n's circular
 * tool nodes but rendered in Discotive's Void + Gold design language.
 *
 * States:
 * - LOCKED:    Dark grey circle, no glow
 * - ACTIVE:    Gold pulsing circle, ready for payload
 * - VERIFYING: Violet spinning ring, AI is evaluating
 * - VERIFIED:  Emerald solid, checkmark, locked forever
 * - BACKOFF:   Crimson with countdown timer
 */

import React, { memo, useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";
import { Cpu, CheckCircle, AlertCircle, Loader, Zap, Lock } from "lucide-react";
import { NODE_STATES } from "../../../stores/useRoadmapStore";
import { useRoadmapStore } from "../../../stores/useRoadmapStore";

const SIZE = 64;

const STATE_CFG = {
  [NODE_STATES.VERIFIED]: {
    ring: "#4ADE80",
    bg: "rgba(74,222,128,0.12)",
    glow: "rgba(74,222,128,0.5)",
    icon: CheckCircle,
    spin: false,
    pulse: false,
  },
  [NODE_STATES.ACTIVE]: {
    ring: "#D4AF78",
    bg: "rgba(191,162,100,0.10)",
    glow: "rgba(191,162,100,0.4)",
    icon: Cpu,
    spin: false,
    pulse: true,
  },
  [NODE_STATES.IN_PROGRESS]: {
    ring: "#D4AF78",
    bg: "rgba(191,162,100,0.10)",
    glow: "rgba(191,162,100,0.4)",
    icon: Cpu,
    spin: false,
    pulse: true,
  },
  [NODE_STATES.VERIFYING]: {
    ring: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    glow: "rgba(167,139,250,0.5)",
    icon: Loader,
    spin: true,
    pulse: false,
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    ring: "#F87171",
    bg: "rgba(248,113,113,0.10)",
    glow: "rgba(248,113,113,0.4)",
    icon: AlertCircle,
    spin: false,
    pulse: false,
  },
  [NODE_STATES.LOCKED]: {
    ring: "#2A2A35",
    bg: "rgba(255,255,255,0.02)",
    glow: "none",
    icon: Lock,
    spin: false,
    pulse: false,
  },
};
const DEFAULT = STATE_CFG[NODE_STATES.LOCKED];

const formatMs = (ms) => {
  if (!ms || ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
};

const HANDLE_S = {
  width: 8,
  height: 8,
  background: "#0D0D12",
  border: "1.5px solid rgba(167,139,250,0.35)",
  borderRadius: "50%",
};

export const ComputeNode = memo(({ id, data, selected }) => {
  const selectNode = useRoadmapStore((s) => s.selectNode);
  const state = data._computed?.state || NODE_STATES.LOCKED;
  const timeL = data._computed?.timeLeft || 0;
  const cfg = STATE_CFG[state] || DEFAULT;
  const Icon = cfg.icon;
  const label = data.title || "AI Gate";

  const [timer, setTimer] = useState(timeL);
  useEffect(() => {
    setTimer(timeL);
  }, [timeL]);
  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((p) => Math.max(0, p - 1000)), 1000);
    return () => clearInterval(t);
  }, [timer]);

  return (
    <div
      onClick={() => selectNode(id)}
      style={{
        width: SIZE,
        height: SIZE,
        position: "relative",
        cursor: "pointer",
      }}
      role="article"
      aria-label={`Compute node: ${label} — ${state}`}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ ...HANDLE_S, top: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ ...HANDLE_S, left: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...HANDLE_S, top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...HANDLE_S, left: "50%" }}
      />

      {/* Outer pulse ring */}
      {cfg.pulse && (
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `1.5px solid ${cfg.ring}`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Selection glow */}
      {selected && (
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            border: `2px solid ${cfg.ring}`,
            boxShadow: `0 0 16px ${cfg.glow}`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Main circle */}
      <div
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          background: cfg.bg,
          border: `2px solid ${cfg.ring}`,
          boxShadow: cfg.glow !== "none" ? `0 0 10px ${cfg.glow}` : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
      >
        <motion.div
          animate={cfg.spin ? { rotate: 360 } : { rotate: 0 }}
          transition={
            cfg.spin ? { duration: 1.5, repeat: Infinity, ease: "linear" } : {}
          }
        >
          <Icon style={{ width: 18, height: 18, color: cfg.ring }} />
        </motion.div>

        {timer > 0 ? (
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              fontFamily: "monospace",
              color: cfg.ring,
              marginTop: 3,
            }}
          >
            {formatMs(timer)}
          </span>
        ) : (
          <span
            style={{
              fontSize: 7,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: `${cfg.ring}80`,
              marginTop: 2,
              maxWidth: SIZE - 12,
              textAlign: "center",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {state === NODE_STATES.VERIFIED
              ? "PASS"
              : state === NODE_STATES.VERIFYING
                ? "EVAL"
                : "GATE"}
          </span>
        )}
      </div>

      {/* Node label below */}
      <div
        style={{
          position: "absolute",
          top: SIZE + 6,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "rgba(245,240,232,0.50)",
            fontFamily: "'Poppins', sans-serif",
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </p>
        {data.verificationContract?.scoreReward > 0 && (
          <p
            style={{
              fontSize: 8,
              fontWeight: 800,
              color: "rgba(191,162,100,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              marginTop: 1,
            }}
          >
            <Zap style={{ width: 7, height: 7 }} />+
            {data.verificationContract.scoreReward}
          </p>
        )}
      </div>

      {/* Verified overlay badge */}
      {state === NODE_STATES.VERIFIED && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#4ADE80",
            border: "2px solid #030303",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 8px rgba(74,222,128,0.6)",
            zIndex: 10,
          }}
        >
          <CheckCircle style={{ width: 8, height: 8, color: "#030303" }} />
        </motion.div>
      )}
    </div>
  );
});

ComputeNode.displayName = "ComputeNode";
