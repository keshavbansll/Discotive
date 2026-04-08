/**
 * @fileoverview ExecutionNode — v5 Definitive
 *
 * FIXES:
 * 1. Gold color system: #BFA264 / #D4AF78 (not amber #f59e0b)
 * 2. Reads `data._computed` (not `_computed`) — consistent with graphEngine v5
 * 3. `timeLeft` (not `timeRemaining`) — consistent with graphEngine v5
 * 4. Node background: #0d0d0d warm black (no blue tint)
 * 5. State transition pulse animation on LOCKED→ACTIVE
 * 6. Font family explicitly Poppins on all text elements
 * 7. Correct `useRoadmap` context usage
 */

import React, { useState, useEffect, useRef, memo } from "react";
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
import { cn } from "../../../lib/cn";
import {
  NODE_ACCENT_PALETTE,
  NODE_STATES,
} from "../../../lib/roadmap/constants.js";
import { useRoadmap } from "../../../contexts/RoadmapContext.jsx";

// ── Design system gold tokens ─────────────────────────────────────────────────
const GOLD_CORE = "#BFA264";
const GOLD_BRIGHT = "#D4AF78";
const GOLD_DIM = "rgba(191,162,100,0.10)";
const GOLD_BORDER = "rgba(191,162,100,0.25)";

// Corrected palette — overrides amber with brand gold
const RESOLVED_PALETTE = {
  ...NODE_ACCENT_PALETTE,
  amber: {
    primary: GOLD_CORE,
    glow: "rgba(191,162,100,0.25)",
    bg: "rgba(191,162,100,0.07)",
  },
};

// ── Handle style ──────────────────────────────────────────────────────────────
const HANDLE_S = {
  width: 10,
  height: 10,
  background: "#1a1a1a",
  border: "1.5px solid rgba(255,255,255,0.12)",
  borderRadius: "50%",
};

// ── Format countdown ──────────────────────────────────────────────────────────
const fmt = (ms) => {
  if (!ms || ms <= 0) return "00:00";
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (t % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const ExecutionNode = memo(
  ({ data, selected, id, style: nodeStyle }) => {
    const [collapsed, setCollapsed] = useState(data.collapsed ?? false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [justUnlocked, setJustUnlocked] = useState(false);
    const prevStateRef = useRef(null);
    const { toggleNodeCollapse, setActiveEditNodeId } = useRoadmap();

    // ── Read computed state from data._computed ───────────────────────────────
    const computed = data._computed || {};
    const computedState =
      computed.state ||
      (data.isCompleted ? NODE_STATES.VERIFIED : NODE_STATES.LOCKED);
    const baseTimeLeft = computed.timeLeft || 0;

    // ── Sync timer from engine ─────────────────────────────────────────────────
    useEffect(() => {
      setTimeLeft(baseTimeLeft);
    }, [baseTimeLeft]);

    // ── Live countdown ─────────────────────────────────────────────────────────
    useEffect(() => {
      if (timeLeft <= 0) return;
      const id_ = setInterval(() => {
        setTimeLeft((p) => Math.max(0, p - 1000));
      }, 1000);
      return () => clearInterval(id_);
    }, [timeLeft]);

    // ── Unlock animation trigger ───────────────────────────────────────────────
    useEffect(() => {
      const prev = prevStateRef.current;
      if (prev === NODE_STATES.LOCKED && computedState === NODE_STATES.ACTIVE) {
        setJustUnlocked(true);
        const t = setTimeout(() => setJustUnlocked(false), 800);
        return () => clearTimeout(t);
      }
      prevStateRef.current = computedState;
    }, [computedState]);

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

    const accent = RESOLVED_PALETTE[data.accentColor || "amber"];

    // ── State → visual mapping ─────────────────────────────────────────────────
    let statusColor, statusLabel, accentBarColor;
    switch (computedState) {
      case NODE_STATES.LOCKED:
        statusColor = "rgba(255,255,255,0.18)";
        statusLabel = "Locked";
        accentBarColor = "#1a1a1a";
        break;
      case NODE_STATES.ACTIVE:
        statusColor = accent.primary;
        statusLabel = "Ready";
        accentBarColor = accent.primary;
        break;
      case NODE_STATES.IN_PROGRESS:
        statusColor = GOLD_BRIGHT;
        statusLabel = "In Progress";
        accentBarColor = GOLD_BRIGHT;
        break;
      case NODE_STATES.VERIFYING:
        statusColor = "#A78BFA";
        statusLabel = "Verifying…";
        accentBarColor = "#A78BFA";
        break;
      case NODE_STATES.FAILED_BACKOFF:
        statusColor = "#F87171";
        statusLabel = "Penalty Lock";
        accentBarColor = "#F87171";
        break;
      case NODE_STATES.VERIFIED:
      case NODE_STATES.VERIFIED_GHOST:
        statusColor = "#4ADE80";
        statusLabel = "Verified";
        accentBarColor = "#4ADE80";
        break;
      case NODE_STATES.CORRUPTED:
        statusColor = "#F87171";
        statusLabel = "Cycle Error";
        accentBarColor = "#F87171";
        break;
      default:
        statusColor = "rgba(255,255,255,0.18)";
        statusLabel = "Pending";
        accentBarColor = "#222";
    }

    if (isOverdue && !isVerified && !isLocked && !isBackoff) {
      statusColor = "#F87171";
      statusLabel = "Overdue";
    }

    const nodeWidth = nodeStyle?.width ?? 300;
    const nodeHeight = nodeStyle?.height ?? "auto";

    const borderColor = selected
      ? `${accentBarColor}90`
      : isBackoff
        ? `${statusColor}35`
        : justUnlocked
          ? `${accent.primary}80`
          : "rgba(255,255,255,0.06)";

    const nodeShadow = selected
      ? `0 4px 24px rgba(0,0,0,0.9), 0 0 0 1px ${accentBarColor}20`
      : isBackoff
        ? `0 0 16px ${statusColor}15`
        : justUnlocked
          ? `0 0 24px ${accent.primary}30`
          : "0 1px 6px rgba(0,0,0,0.6)";

    const tasks = data.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;

    return (
      <div
        role="article"
        aria-label={`${data.title || "Untitled"} — ${statusLabel}`}
        aria-selected={selected}
        className={cn(
          "relative flex flex-col overflow-hidden transition-all duration-200",
          isLocked && "opacity-35 grayscale pointer-events-none",
          isBackoff && "animate-pulse",
          selected ? "scale-[1.012] z-50" : "z-10",
          justUnlocked && "scale-[1.04]",
        )}
        style={{
          width: nodeWidth,
          height: nodeHeight,
          minWidth: 220,
          minHeight: 100,
          borderRadius: 13,
          // Warm void background — no blue tint
          background: "#0d0d0d",
          border: `1px solid ${borderColor}`,
          boxShadow: nodeShadow,
          fontFamily: "'Poppins', sans-serif",
          transition:
            "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, border-color 0.3s",
        }}
        onClick={() => setActiveEditNodeId?.(id)}
      >
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
            border: "2px solid #0d0d0d",
          }}
        />

        {/* Handles */}
        {[
          { type: "target", position: Position.Top, id: "top" },
          { type: "target", position: Position.Left, id: "left" },
          { type: "source", position: Position.Bottom, id: "bottom" },
          { type: "source", position: Position.Right, id: "right" },
        ].map(({ type, position, id: hId }) => (
          <Handle
            key={hId}
            type={type}
            position={position}
            id={hId}
            className="hover:!scale-150 transition-transform before:absolute before:-inset-5 before:content-[''] before:z-50 relative"
            style={{ ...HANDLE_S, borderColor: `${accent.primary}50` }}
          />
        ))}

        {/* Top accent bar — brand gold, state-driven color */}
        <div
          style={{
            height: 2,
            background: accentBarColor,
            opacity: selected ? 1 : 0.7,
            flexShrink: 0,
            transition: "background 0.4s, opacity 0.2s",
          }}
        />

        {/* Unlock pulse overlay */}
        {justUnlocked && (
          <div
            className="absolute inset-0 rounded-[13px] pointer-events-none z-20 animate-ping"
            style={{
              border: `2px solid ${accent.primary}`,
              opacity: 0.6,
            }}
          />
        )}

        {/* Content */}
        <div
          className="pointer-events-none select-none"
          style={{
            padding: "10px 12px 10px",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {/* State indicator */}
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
                        ? `0 0 5px ${statusColor}90`
                        : undefined,
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: `${statusColor}b0`,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Node type label */}
              {data.nodeType && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.2)",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {data.nodeType}
                </span>
              )}

              {/* Countdown or deadline */}
              {timeLeft > 0 && (isInProgress || isBackoff) ? (
                <span
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.05]"
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: statusColor,
                    fontFamily: "monospace",
                  }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {fmt(timeLeft)}
                </span>
              ) : data.deadline ? (
                <span
                  className="flex items-center gap-0.5"
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color:
                      isOverdue && !isVerified
                        ? "rgba(248,113,113,0.75)"
                        : "rgba(255,255,255,0.22)",
                  }}
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
              ) : null}

              {/* Collapse toggle */}
              <button
                aria-label={collapsed ? "Expand node" : "Collapse node"}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !collapsed;
                  setCollapsed(next);
                  toggleNodeCollapse?.(id, next);
                }}
                className="pointer-events-auto w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors focus-visible:ring-1 rounded"
                style={{ focusRing: accent.primary }}
              >
                {collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Title */}
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.35,
              marginBottom: 2,
              color: isVerified
                ? "rgba(255,255,255,0.30)"
                : "rgba(245,240,232,0.92)",
              textDecoration: isVerified ? "line-through" : "none",
              wordBreak: "break-word",
              hyphens: "auto",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {data.title || "Unnamed Protocol"}
          </h3>

          {/* Subtitle */}
          {data.subtitle && (
            <p
              className="mb-1.5 truncate"
              style={{
                fontSize: 10,
                color: "rgba(245,240,232,0.28)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {data.subtitle}
            </p>
          )}

          {/* Expanded body */}
          {!collapsed && (
            <>
              {data.desc && (
                <p
                  className="mb-2 line-clamp-2 leading-relaxed"
                  style={{
                    fontSize: 10,
                    color: "rgba(245,240,232,0.38)",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {data.desc}
                </p>
              )}

              {/* Tags */}
              {(data.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {data.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: `${accent.primary}14`,
                        color: `${accent.primary}75`,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {tasks.slice(0, 4).map((task, i) => (
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
                          border: `1px solid ${task.completed ? "#4ADE80" : "rgba(255,255,255,0.13)"}`,
                          background: task.completed
                            ? "rgba(74,222,128,0.10)"
                            : "transparent",
                        }}
                      >
                        {task.completed && (
                          <Check
                            style={{ width: 8, height: 8, color: "#4ADE80" }}
                          />
                        )}
                      </div>
                      <span
                        className="flex-1 leading-snug"
                        style={{
                          fontSize: 10,
                          fontFamily: "'Poppins', sans-serif",
                          color: task.completed
                            ? "rgba(255,255,255,0.22)"
                            : "rgba(245,240,232,0.62)",
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
                            color: `${GOLD_CORE}45`,
                            fontWeight: 800,
                          }}
                        >
                          <Zap style={{ width: 7, height: 7 }} />
                          {task.points}
                        </div>
                      )}
                    </div>
                  ))}
                  {tasks.length > 4 && (
                    <p
                      className="pl-5"
                      style={{ fontSize: 9, color: "rgba(255,255,255,0.18)" }}
                    >
                      +{tasks.length - 4} more tasks
                    </p>
                  )}
                </div>
              )}

              {/* Linked assets / delegates footer */}
              {(data.linkedAssets?.length > 0 ||
                data.delegates?.length > 0) && (
                <div
                  className="flex items-center justify-between mt-2 pt-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {data.linkedAssets?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <ShieldCheck
                        style={{ width: 11, height: 11, color: "#4ADE8070" }}
                      />
                      <span
                        style={{
                          fontSize: 9,
                          color: "#4ADE8070",
                          fontWeight: 700,
                        }}
                      >
                        {data.linkedAssets.length} verified
                      </span>
                    </div>
                  )}
                  {data.delegates?.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {data.delegates.slice(0, 3).map((d, i) => (
                        <div
                          key={i}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#1a1a20",
                            border: "1px solid rgba(255,255,255,0.07)",
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

        {/* Active state footer prompt */}
        {!collapsed && isActive && (
          <div
            className="mt-auto flex justify-between items-center px-3 py-2"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.04)",
              background: "rgba(191,162,100,0.03)",
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(191,162,100,0.40)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Dependencies Met
            </span>
            <span
              className="animate-pulse"
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "rgba(191,162,100,0.55)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Tap to Begin ↗
            </span>
          </div>
        )}

        {/* Progress bar at bottom (tasks) */}
        {!collapsed && tasks.length > 0 && (
          <div
            style={{
              height: 2,
              background: "rgba(255,255,255,0.04)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                background: accentBarColor,
                transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          </div>
        )}
      </div>
    );
  },
);

ExecutionNode.displayName = "ExecutionNode";
