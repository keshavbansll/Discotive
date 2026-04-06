/**
 * @fileoverview ExecutionNode — v4 Neural Engine Redesign
 *
 * Philosophy: "professional tool, not a game"
 * Now fully decoupled from UI-based state. Driven strictly by the
 * DAG Compiler (graphEngine.js). Features native time-locks,
 * backoff penalties, and verification ghost states.
 */

import React, { useState, useEffect, memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
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
} from "lucide-react";
import { cn } from "../../lib/cn";
import {
  NODE_ACCENT_PALETTE,
  NODE_STATES,
} from "../../lib/roadmap/constants.js";
import { useRoadmap } from "../../contexts/RoadmapContext.jsx";

// ── Handle style (invisible hit area with visible dot) ────────────────────────
const HANDLE_STYLE = {
  width: 10,
  height: 10,
  background: "#1a1a20",
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderRadius: "50%",
};

const HANDLE_HOVER_CLS =
  "hover:!scale-150 transition-transform before:absolute before:-inset-5 before:content-[''] before:z-50 relative";

// ── Time formatting utility for brutalist timers ──────────────────────────────
const formatMonospaceTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  if (h > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
};

export const ExecutionNode = memo(
  ({ data, selected, id, style: nodeStyle }) => {
    const [collapsed, setCollapsed] = useState(data.collapsed ?? false);
    const { toggleNodeCollapse, setActiveEditNodeId } = useRoadmap();

    // ── Strict Engine State Parsing ──────────────────────────────────────────────
    // Fallback maps legacy data to the new engine states if graphEngine is unmounted
    const computedState =
      data._computed?.state ||
      (data.isCompleted ? NODE_STATES.VERIFIED : NODE_STATES.ACTIVE);
    const baseTimeRemaining = data._computed?.timeRemaining || 0;

    // ── Local Ticker for Active Locks & Penalties ───────────────────────────────
    const [timeLeft, setTimeLeft] = useState(baseTimeRemaining);

    useEffect(() => {
      setTimeLeft(baseTimeRemaining);
    }, [baseTimeRemaining]);

    useEffect(() => {
      if (timeLeft <= 0) return;
      const interval = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(interval);
    }, [timeLeft]);

    // ── Derived State Checks ───────────────────────────────────────────────────
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
    const accent = NODE_ACCENT_PALETTE[data.accentColor || "amber"];

    const tasks = data.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;

    // ── Brutalist State Mapping ────────────────────────────────────────────────
    let statusColor, statusLabel, accentBarColor;

    switch (computedState) {
      case NODE_STATES.LOCKED:
        statusColor = "rgba(255,255,255,0.2)";
        statusLabel = "Locked";
        accentBarColor = "#222";
        break;
      case NODE_STATES.ACTIVE:
        statusColor = accent.primary;
        statusLabel = "Ready";
        accentBarColor = accent.primary;
        break;
      case NODE_STATES.IN_PROGRESS:
        statusColor = accent.primary;
        statusLabel = "In Progress";
        accentBarColor = accent.primary;
        break;
      case NODE_STATES.VERIFYING:
        statusColor = "#f59e0b"; // System Amber
        statusLabel = "Verifying...";
        accentBarColor = "#f59e0b";
        break;
      case NODE_STATES.FAILED_BACKOFF:
        statusColor = "#ef4444"; // System Crimson
        statusLabel = "Penalty Lock";
        accentBarColor = "#ef4444";
        break;
      case NODE_STATES.VERIFIED:
      case NODE_STATES.VERIFIED_GHOST:
        statusColor = "#10b981"; // System Emerald
        statusLabel = "Verified";
        accentBarColor = "#10b981";
        break;
      default:
        statusColor = "rgba(255,255,255,0.2)";
        statusLabel = "Pending";
        accentBarColor = "#333";
    }

    if (isOverdue && !isVerified && !isLocked && !isBackoff) {
      statusColor = "#ef4444";
      statusLabel = "Overdue";
    }

    if (data._computed?.lockReason === "CYCLE_DETECTED") {
      statusColor = "#ef4444";
      statusLabel = "Cycle Error";
    }

    // ── Node dimensions & UI Computation ───────────────────────────────────────
    const nodeWidth = nodeStyle?.width ?? 300;
    const nodeHeight = nodeStyle?.height ?? "auto";

    const borderColor = selected
      ? `${accentBarColor}80`
      : isBackoff
        ? `${statusColor}40`
        : "rgba(255,255,255,0.07)";

    const nodeShadow = selected
      ? `0 4px 20px rgba(0,0,0,0.8), 0 0 0 1px ${accentBarColor}25`
      : isBackoff
        ? `0 0 15px ${statusColor}15`
        : "0 1px 6px rgba(0,0,0,0.5)";

    return (
      <div
        role="article"
        aria-label={`${data.title || "Untitled"} — ${statusLabel}`}
        aria-selected={selected}
        className={cn(
          "relative flex flex-col overflow-hidden transition-all duration-200",
          (data.isDimmed || isLocked) &&
            "opacity-40 grayscale pointer-events-none",
          isBackoff && "animate-pulse",
          selected ? "scale-[1.012] z-50" : "z-10",
        )}
        style={{
          width: nodeWidth,
          height: nodeHeight,
          minWidth: 220,
          minHeight: 100,
          borderRadius: 12,
          background: "#0d0d12",
          border: `1px solid ${borderColor}`,
          boxShadow: nodeShadow,
        }}
        onClick={() => setActiveEditNodeId(id)}
      >
        {/* ── NodeResizer ──────────────────────────────────────────────────── */}
        <NodeResizer
          minWidth={220}
          minHeight={100}
          isVisible={selected}
          lineStyle={{ border: `1px dashed ${accent.primary}50` }}
          handleStyle={{
            backgroundColor: accent.primary,
            width: 7,
            height: 7,
            borderRadius: 2,
            border: "2px solid #0d0d12",
          }}
        />

        {/* ── Handles ──────────────────────────────────────────────────────── */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          className={HANDLE_HOVER_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accent.primary}60` }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={HANDLE_HOVER_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accent.primary}60` }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={HANDLE_HOVER_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accent.primary}60` }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={HANDLE_HOVER_CLS}
          style={{ ...HANDLE_STYLE, borderColor: `${accent.primary}60` }}
        />

        {/* ══════════════════════════════════════════════════════════════════
          TOP ACCENT BAR — State driven identity line
      ══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            height: 2,
            background: accentBarColor,
            opacity: selected ? 1 : 0.65,
            flexShrink: 0,
            transition: "opacity 0.2s",
          }}
        />

        {/* ══════════════════════════════════════════════════════════════════
          CONTENT AREA
      ══════════════════════════════════════════════════════════════════ */}
        <div
          className="pointer-events-none select-none"
          style={{ padding: "10px 12px 10px" }}
        >
          {/* ── Header row: Status + Time Locks ─────────────────────────────── */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isLocked ? (
                <Lock style={{ width: 10, height: 10, color: statusColor }} />
              ) : isVerifying ? (
                <RefreshCw
                  className="animate-spin"
                  style={{ width: 10, height: 10, color: statusColor }}
                />
              ) : isBackoff ? (
                <AlertCircle
                  style={{ width: 10, height: 10, color: statusColor }}
                />
              ) : (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusColor,
                    boxShadow:
                      isActive || isInProgress
                        ? `0 0 4px ${statusColor}80`
                        : undefined,
                  }}
                />
              )}
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: `${statusColor}b0` }}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {data.nodeType && (
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                  {data.nodeType}
                </span>
              )}

              {/* Native Countdown Timer / Date Tracker */}
              {timeLeft > 0 && (isInProgress || isBackoff) ? (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold font-mono tracking-wider"
                  style={{ color: statusColor }}
                >
                  <Clock className="w-2.5 h-2.5" />{" "}
                  {formatMonospaceTime(timeLeft)}
                </span>
              ) : (
                data.deadline && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[8px] font-semibold",
                      isOverdue && !isVerified
                        ? "text-rose-400/70"
                        : "text-white/25",
                    )}
                  >
                    <CalendarIcon className="w-2.5 h-2.5" />
                    {new Date(data.deadline).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                    {isOverdue && !isVerified && (
                      <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />
                    )}
                  </span>
                )
              )}

              <button
                aria-label={collapsed ? "Expand node" : "Collapse node"}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !collapsed;
                  setCollapsed(next);
                  toggleNodeCollapse(id, next);
                }}
                className="pointer-events-auto w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors focus-visible:ring-1 focus-visible:ring-amber-500 rounded"
              >
                {collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* ── Title & Subtitle ────────────────────────────────────────── */}
          <h3
            className="font-bold leading-snug mb-0.5"
            style={{
              fontSize: 14,
              color: isVerified
                ? "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.92)",
              textDecoration: isVerified ? "line-through" : "none",
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {data.title || "Unnamed Protocol"}
          </h3>

          {data.subtitle && (
            <p
              className="mb-2 truncate"
              style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}
            >
              {data.subtitle}
            </p>
          )}

          {/* ── Expanded content (Tasks & Tags preserved perfectly) ─────── */}
          {!collapsed && (
            <>
              {data.desc && (
                <p
                  className="mb-2.5 line-clamp-2 leading-relaxed"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}
                >
                  {data.desc}
                </p>
              )}

              {data.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2.5">
                  {data.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `${accent.primary}15`,
                        color: `${accent.primary}80`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {tasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {tasks.slice(0, 5).map((task, i) => (
                    <div
                      key={task.id || i}
                      className="flex items-start gap-1.5"
                    >
                      <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                          width: 13,
                          height: 13,
                          marginTop: 1,
                          borderRadius: 3,
                          border: `1px solid ${task.completed ? "#10b981" : "rgba(255,255,255,0.15)"}`,
                          background: task.completed
                            ? "rgba(16,185,129,0.12)"
                            : "transparent",
                        }}
                      >
                        {task.completed && (
                          <Check
                            style={{ width: 8, height: 8, color: "#10b981" }}
                          />
                        )}
                      </div>
                      <span
                        className="flex-1 leading-snug"
                        style={{
                          fontSize: 11,
                          color: task.completed
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.62)",
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {task.text || (
                          <em style={{ color: "rgba(255,255,255,0.15)" }}>
                            Empty task
                          </em>
                        )}
                      </span>
                      {(task.points ?? 0) > 0 && (
                        <div
                          className="shrink-0 flex items-center gap-0.5"
                          style={{
                            fontSize: 8,
                            color: "rgba(245,158,11,0.4)",
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
                      className="pl-5"
                      style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}
                    >
                      +{tasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              )}

              {(data.linkedAssets?.length > 0 ||
                data.delegates?.length > 0) && (
                <div
                  className="flex items-center justify-between mt-2 pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {data.linkedAssets?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck
                        style={{
                          width: 11,
                          height: 11,
                          color: "rgba(16,185,129,0.5)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          color: "rgba(16,185,129,0.5)",
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
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#1a1a20",
                            border: "1px solid rgba(255,255,255,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 7,
                            fontWeight: 800,
                            color: "rgba(255,255,255,0.4)",
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

        {/* ══════════════════════════════════════════════════════════════════
          ENGINE FOOTER — Removed arbitrary progress, strictly enforces state
      ══════════════════════════════════════════════════════════════════ */}
        {!collapsed && computedState === NODE_STATES.ACTIVE && (
          <div className="mt-auto border-t border-white/5 bg-white/[0.02] px-3 py-2 flex justify-between items-center">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
              Dependencies Met
            </span>
            <div className="text-[9px] font-bold text-white/50 animate-pulse">
              Awaiting Initialization
            </div>
          </div>
        )}
      </div>
    );
  },
);

ExecutionNode.displayName = "ExecutionNode";
