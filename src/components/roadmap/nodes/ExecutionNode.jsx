/**
 * @fileoverview ExecutionNode — v5 Gold/Void Overhaul
 *
 * What changed vs v4:
 *  - Brand palette: #BFA264 (GOLD) / #D4AF78 (GOLD_BRIGHT) / #030303 (VOID).
 *    The old amber/generic accent is replaced at the token level.
 *  - Stagger-reveal mount animation (controlled by data._staggerIndex).
 *  - Completion burst: scale + ring-glow on isCompleted flip.
 *  - Verification lock visual: cross-hatch overlay when node requires
 *    a learn_id but none is confirmed. User gets a visual "locked" state.
 *  - Magnetic hover: subtle translate-y lift powered by CSS transition.
 *  - Priority status pills replaced with coloured dot indicator.
 *  - Tasks render as compact inline chips when collapsed.
 *  - Overdue ring blinks at 1Hz.
 *  - Node resize handles styled to match the Gold palette.
 */

import React, { useState, useEffect, useRef, memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Clock,
  RefreshCw,
  AlertCircle,
  Shield,
} from "lucide-react";
import { cn } from "../../../lib/cn.js";
import { NODE_STATES } from "../../../lib/roadmap/constants.js";
import { useRoadmap } from "../../../contexts/RoadmapContext.jsx";

// ── Brand palette ─────────────────────────────────────────────────────────────
const GOLD = "#BFA264";
const GOLD_BRIGHT = "#D4AF78";
const GOLD_DIM = "rgba(191,162,100,0.12)";
const GOLD_BORDER = "rgba(191,162,100,0.28)";
const VOID = "#030303";
const SURFACE = "#0d0d12";
const EMERALD = "#10b981";
const CRIMSON = "#ef4444";
const VIOLET = "#8b5cf6";

// ── Handle style (invisible hit-area with themed dot) ─────────────────────────
const HANDLE_STYLE = {
  width: 10,
  height: 10,
  background: "#1a1a20",
  border: `1.5px solid ${GOLD_BORDER}`,
  borderRadius: "50%",
};
const HANDLE_CLS =
  "hover:!scale-150 transition-transform before:absolute before:-inset-5 before:content-[''] before:z-50 relative";

// ── Time formatting ───────────────────────────────────────────────────────────
const fmtMs = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sc = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sc}` : `${m}:${sc}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// ExecutionNode
// ─────────────────────────────────────────────────────────────────────────────
export const ExecutionNode = memo(
  ({ data, selected, id, style: nodeStyle }) => {
    const [collapsed, setCollapsed] = useState(data.collapsed ?? false);
    const [justCompleted, setJustCompleted] = useState(false);
    const prevCompleted = useRef(data.isCompleted);

    const { toggleNodeCollapse, setActiveEditNodeId } = useRoadmap();

    // ── Completion burst effect ────────────────────────────────────────────────
    useEffect(() => {
      if (data.isCompleted && !prevCompleted.current) {
        setJustCompleted(true);
        const timer = setTimeout(() => setJustCompleted(false), 900);
        prevCompleted.current = true;
        return () => clearTimeout(timer);
      }
      prevCompleted.current = data.isCompleted;
    }, [data.isCompleted]);

    // ── Engine state ───────────────────────────────────────────────────────────
    const computedState =
      data._computed?.state ||
      (data.isCompleted ? NODE_STATES.VERIFIED : NODE_STATES.ACTIVE);
    const baseTimeLeft = data._computed?.timeRemaining || 0;
    const [timeLeft, setTimeLeft] = useState(baseTimeLeft);

    useEffect(() => setTimeLeft(baseTimeLeft), [baseTimeLeft]);
    useEffect(() => {
      if (timeLeft <= 0) return;
      const iv = setInterval(
        () => setTimeLeft((p) => Math.max(0, p - 1000)),
        1000,
      );
      return () => clearInterval(iv);
    }, [timeLeft]);

    // ── Derived booleans ───────────────────────────────────────────────────────
    const isLocked = computedState === NODE_STATES.LOCKED;
    const isVerified =
      computedState === NODE_STATES.VERIFIED ||
      computedState === NODE_STATES.VERIFIED_GHOST;
    const isBackoff = computedState === NODE_STATES.FAILED_BACKOFF;
    const isVerifying = computedState === NODE_STATES.VERIFYING;
    const isInProgress = computedState === NODE_STATES.IN_PROGRESS;
    const isActive = computedState === NODE_STATES.ACTIVE;

    const isOverdue =
      !isVerified && data.deadline && new Date(data.deadline) < new Date();
    const hasCycleError = data._computed?.lockReason === "CYCLE_DETECTED";

    // ── Requires learn_id (asset verification lock) ────────────────────────────
    const needsLearnId = !!data.requiredLearnId;
    const hasLearnId = !!data.linkedLearnId || !!data.assetId;
    const isLearnLocked = needsLearnId && !hasLearnId && !isVerified;

    // ── Tasks summary ──────────────────────────────────────────────────────────
    const tasks = data.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;

    // ── Visual theme derived from engine state ────────────────────────────────
    let accentColor, statusLabel, statusDotColor;

    if (hasCycleError) {
      accentColor = CRIMSON;
      statusLabel = "Cycle Error";
      statusDotColor = CRIMSON;
    } else if (isBackoff) {
      accentColor = CRIMSON;
      statusLabel = "Penalty Lock";
      statusDotColor = CRIMSON;
    } else if (isVerifying) {
      accentColor = VIOLET;
      statusLabel = "Verifying…";
      statusDotColor = VIOLET;
    } else if (isLearnLocked) {
      accentColor = GOLD;
      statusLabel = "Locked";
      statusDotColor = GOLD_BORDER;
    } else if (isLocked) {
      accentColor = "rgba(255,255,255,0.15)";
      statusLabel = "Locked";
      statusDotColor = "#333";
    } else if (isVerified) {
      accentColor = EMERALD;
      statusLabel = "Verified";
      statusDotColor = EMERALD;
    } else if (isInProgress) {
      accentColor = GOLD;
      statusLabel = "In Progress";
      statusDotColor = GOLD;
    } else if (isOverdue) {
      accentColor = CRIMSON;
      statusLabel = "Overdue";
      statusDotColor = CRIMSON;
    } else {
      accentColor = GOLD;
      statusLabel = "Ready";
      statusDotColor = GOLD;
    }

    const nodeW = nodeStyle?.width ?? 300;

    const borderColor = selected
      ? `${accentColor}70`
      : isBackoff
        ? `${accentColor}35`
        : isLearnLocked
          ? GOLD_BORDER
          : "rgba(255,255,255,0.07)";

    const nodeShadow = selected
      ? `0 4px 24px rgba(0,0,0,0.9), 0 0 0 1px ${accentColor}22`
      : isVerified
        ? `0 0 12px ${EMERALD}10`
        : "0 2px 8px rgba(0,0,0,0.6)";

    // ── Stagger mount animation ────────────────────────────────────────────────
    const staggerDelay = (data._staggerIndex ?? 0) * 0.04;

    return (
      <motion.div
        initial={data._justMounted ? { opacity: 0, scale: 0.88, y: 10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          delay: staggerDelay,
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1],
        }}
        role="article"
        aria-label={`${data.title || "Untitled"} — ${statusLabel}`}
        aria-selected={selected}
        className={cn(
          "relative flex flex-col overflow-hidden transition-all duration-200",
          (data.isDimmed || (isLocked && !isLearnLocked)) &&
            "opacity-35 grayscale pointer-events-none",
          isBackoff && "animate-pulse",
          selected ? "scale-[1.015] z-50" : "z-10",
        )}
        style={{
          width: nodeW,
          minWidth: 220,
          minHeight: 100,
          borderRadius: 14,
          background: SURFACE,
          border: `1px solid ${borderColor}`,
          boxShadow: nodeShadow,
          cursor: "pointer",
          transition: "border-color 0.25s, box-shadow 0.25s, transform 0.15s",
        }}
        onClick={() => setActiveEditNodeId(id)}
        whileHover={!isLocked ? { y: -2 } : {}}
      >
        {/* ── NodeResizer ──────────────────────────────────────────────────── */}
        <NodeResizer
          minWidth={220}
          minHeight={90}
          isVisible={selected}
          lineStyle={{ border: `1px dashed ${GOLD_BORDER}` }}
          handleStyle={{
            backgroundColor: GOLD,
            width: 7,
            height: 7,
            borderRadius: 2,
            border: `2px solid ${SURFACE}`,
          }}
        />

        {/* ── Handles ──────────────────────────────────────────────────────── */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={HANDLE_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={HANDLE_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={HANDLE_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={HANDLE_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accentColor}55` }}
        />

        {/* ══ TOP ACCENT BAR ═══════════════════════════════════════════════ */}
        <div
          style={{
            height: 2.5,
            background: accentColor,
            opacity: selected ? 1 : isVerified ? 0.7 : 0.55,
            flexShrink: 0,
            transition: "background 0.3s, opacity 0.3s",
          }}
        />

        {/* ══ LEARN_ID LOCK OVERLAY ═════════════════════════════════════════ */}
        {isLearnLocked && (
          <div
            className="absolute inset-0 pointer-events-none z-20 rounded-[13px] overflow-hidden"
            style={{ background: "rgba(191,162,100,0.04)" }}
          >
            {/* Cross-hatch via SVG pattern */}
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                <pattern
                  id={`hatch-${id}`}
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="10"
                    stroke={GOLD_BORDER}
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#hatch-${id})`} />
            </svg>
            {/* Lock badge */}
            <div
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{
                background: GOLD_DIM,
                border: `1px solid ${GOLD_BORDER}`,
              }}
            >
              <Shield className="w-2.5 h-2.5" style={{ color: GOLD }} />
              <span
                className="text-[7px] font-black uppercase tracking-widest"
                style={{ color: GOLD }}
              >
                Requires Vault Cert
              </span>
            </div>
          </div>
        )}

        {/* ══ COMPLETION BURST RING ════════════════════════════════════════ */}
        <AnimatePresence>
          {justCompleted && (
            <>
              <motion.div
                initial={{ opacity: 0.9, scale: 0.9 }}
                animate={{ opacity: 0, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="absolute inset-0 rounded-[13px] pointer-events-none z-30"
                style={{
                  border: `2px solid ${EMERALD}`,
                  boxShadow: `0 0 30px ${EMERALD}40`,
                }}
              />
              <motion.div
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                className="absolute inset-0 rounded-[13px] pointer-events-none z-30"
                style={{ background: `${EMERALD}08` }}
              />
            </>
          )}
        </AnimatePresence>

        {/* ══ CONTENT AREA ════════════════════════════════════════════════ */}
        <div
          className="pointer-events-none select-none flex flex-col"
          style={{ padding: "10px 12px 10px" }}
        >
          {/* ── Header row ── */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              {/* Status indicator */}
              {isLocked && !isLearnLocked ? (
                <Lock
                  style={{
                    width: 9,
                    height: 9,
                    color: "rgba(255,255,255,0.2)",
                  }}
                />
              ) : isVerifying ? (
                <RefreshCw
                  className="animate-spin"
                  style={{ width: 9, height: 9, color: VIOLET }}
                />
              ) : isBackoff ? (
                <AlertCircle style={{ width: 9, height: 9, color: CRIMSON }} />
              ) : isLearnLocked ? (
                <Shield style={{ width: 9, height: 9, color: GOLD }} />
              ) : (
                <motion.div
                  animate={
                    isActive || isInProgress
                      ? { opacity: [1, 0.4, 1] }
                      : { opacity: 1 }
                  }
                  transition={{ duration: 1.6, repeat: Infinity }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusDotColor,
                    boxShadow:
                      isActive || isInProgress
                        ? `0 0 6px ${statusDotColor}80`
                        : "none",
                  }}
                />
              )}
              <span
                className="text-[8px] font-black uppercase tracking-widest"
                style={{ color: `${accentColor}b0` }}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Node type */}
              {data.nodeType && (
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/15">
                  {data.nodeType}
                </span>
              )}

              {/* Countdown timer */}
              {timeLeft > 0 && (isInProgress || isBackoff) ? (
                <span
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: accentColor,
                  }}
                >
                  <Clock className="w-2 h-2" /> {fmtMs(timeLeft)}
                </span>
              ) : (
                data.deadline && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[8px] font-semibold",
                      isOverdue && !isVerified
                        ? "text-rose-400/80"
                        : "text-white/20",
                    )}
                  >
                    <CalendarIcon className="w-2.5 h-2.5" />
                    {new Date(data.deadline).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                    {isOverdue && !isVerified && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />
                      </motion.span>
                    )}
                  </span>
                )
              )}

              {/* Collapse toggle */}
              <button
                aria-label={collapsed ? "Expand node" : "Collapse node"}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !collapsed;
                  setCollapsed(next);
                  toggleNodeCollapse(id, next);
                }}
                className="pointer-events-auto w-5 h-5 flex items-center justify-center text-white/15 hover:text-white/50 transition-colors rounded"
              >
                {collapsed ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* ── Title ── */}
          <h3
            className="font-bold leading-snug mb-0.5"
            style={{
              fontSize: 14,
              color: isVerified
                ? "rgba(255,255,255,0.30)"
                : isLocked && !isLearnLocked
                  ? "rgba(255,255,255,0.30)"
                  : "rgba(255,255,255,0.92)",
              textDecoration: isVerified ? "line-through" : "none",
              wordBreak: "break-word",
            }}
          >
            {data.title || "Unnamed Protocol"}
          </h3>

          {data.subtitle && (
            <p
              className="truncate mb-1.5"
              style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}
            >
              {data.subtitle}
            </p>
          )}

          {/* ── Collapsed task chips ── */}
          {collapsed && tasks.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {tasks.slice(0, 5).map((t, i) => (
                <div
                  key={t.id || i}
                  className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center"
                  style={{
                    background: t.completed
                      ? `${EMERALD}18`
                      : "rgba(255,255,255,0.03)",
                    borderColor: t.completed
                      ? `${EMERALD}40`
                      : "rgba(255,255,255,0.08)",
                  }}
                >
                  {t.completed && (
                    <Check style={{ width: 8, height: 8, color: EMERALD }} />
                  )}
                </div>
              ))}
              {tasks.length > 5 && (
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>
                  +{tasks.length - 5}
                </span>
              )}
            </div>
          )}

          {/* ── Expanded content ── */}
          {!collapsed && (
            <>
              {data.desc && (
                <p
                  className="mb-2 line-clamp-2 leading-relaxed"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}
                >
                  {data.desc}
                </p>
              )}

              {/* Tags */}
              {data.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {data.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: GOLD_DIM, color: `${GOLD}90` }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {/* Progress bar */}
                  <div className="h-0.5 bg-white/[0.05] rounded-full overflow-hidden mb-1.5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: GOLD }}
                      animate={{
                        width: `${(doneTasks / tasks.length) * 100}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                  {tasks.slice(0, 5).map((task, i) => (
                    <div
                      key={task.id || i}
                      className="flex items-start gap-1.5"
                    >
                      <div
                        className="shrink-0 flex items-center justify-center mt-px"
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          border: `1px solid ${task.completed ? EMERALD : "rgba(255,255,255,0.12)"}`,
                          background: task.completed
                            ? `${EMERALD}14`
                            : "transparent",
                        }}
                      >
                        {task.completed && (
                          <Check
                            style={{ width: 7, height: 7, color: EMERALD }}
                          />
                        )}
                      </div>
                      <span
                        className="flex-1 leading-snug"
                        style={{
                          fontSize: 11,
                          color: task.completed
                            ? "rgba(255,255,255,0.22)"
                            : "rgba(255,255,255,0.60)",
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {task.text || (
                          <em style={{ color: "rgba(255,255,255,0.15)" }}>
                            Empty
                          </em>
                        )}
                      </span>
                      {(task.points ?? 0) > 0 && (
                        <div
                          className="shrink-0 flex items-center gap-0.5"
                          style={{
                            fontSize: 8,
                            color: `${GOLD}55`,
                            fontWeight: 800,
                          }}
                        >
                          <Zap style={{ width: 7, height: 7 }} />
                          {task.points}
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length > 5 && (
                    <p
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,0.18)",
                        paddingLeft: 16,
                      }}
                    >
                      +{tasks.length - 5} more
                    </p>
                  )}
                </div>
              )}

              {/* Linked assets + delegates */}
              {(data.linkedAssets?.length > 0 ||
                data.delegates?.length > 0) && (
                <div
                  className="flex items-center justify-between mt-1.5 pt-1.5"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {data.linkedAssets?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck
                        style={{ width: 10, height: 10, color: `${EMERALD}60` }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          color: `${EMERALD}60`,
                          fontWeight: 700,
                        }}
                      >
                        {data.linkedAssets.length} verified
                      </span>
                    </div>
                  )}
                  {data.delegates?.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {data.delegates.slice(0, 4).map((d, i) => (
                        <div
                          key={i}
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#1a1a20",
                            border: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 7,
                            fontWeight: 800,
                            color: "rgba(255,255,255,0.35)",
                          }}
                        >
                          {d.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ══ ENGINE FOOTER ═══════════════════════════════════════════════ */}
        {!collapsed && isActive && !isLearnLocked && (
          <div
            className="mt-auto border-t border-white/[0.04] flex justify-between items-center shrink-0"
            style={{
              background: "rgba(255,255,255,0.015)",
              padding: "6px 12px",
            }}
          >
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
              Awaiting Init
            </span>
            <motion.div
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: GOLD,
              }}
            />
          </div>
        )}

        {!collapsed && isLearnLocked && (
          <div
            className="mt-auto border-t flex justify-between items-center shrink-0"
            style={{
              background: GOLD_DIM,
              borderColor: GOLD_BORDER,
              padding: "6px 12px",
            }}
          >
            <span
              className="text-[8px] font-bold uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Upload to Vault to Unlock
            </span>
            <Lock style={{ width: 9, height: 9, color: GOLD }} />
          </div>
        )}
      </motion.div>
    );
  },
);

ExecutionNode.displayName = "ExecutionNode";
