/**
 * @fileoverview ExecutionNode v5 — Hyper-Dense Agentic Aesthetic
 * @description
 * Inspired by n8n/Anthropic agent canvas but executed in Discotive's
 * "Void + Gold" design language. Every pixel earns its place.
 *
 * Visual language:
 * - 3px left accent bar: state-colored, no wasted space
 * - Header row: status pulse dot + title + collapse toggle
 * - Sub-header: node type tag + deadline
 * - Body: tasks mini-list at 10px, truncated to 3 items
 * - Footer: score reward + verification type badge
 * - Zero rounded excess — border-radius 8px max, feels mechanical
 * - Background: #0D0D12 with 1px border, elevated on select
 */

import React, { useState, useEffect, memo, useCallback } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  Zap,
  ShieldCheck,
  Lock,
  Clock,
  RefreshCw,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { NODE_STATES } from "../../../stores/useRoadmapStore";
import { useRoadmapStore } from "../../../stores/useRoadmapStore";

// ── Design tokens ─────────────────────────────────────────────────────────────
const STATE_CONFIG = {
  [NODE_STATES.VERIFIED]: {
    bar: "#4ADE80",
    dot: "#4ADE80",
    glow: "rgba(74,222,128,0.4)",
    label: "VERIFIED",
    icon: ShieldCheck,
  },
  [NODE_STATES.ACTIVE]: {
    bar: "#BFA264",
    dot: "#D4AF78",
    glow: "rgba(191,162,100,0.4)",
    label: "READY",
    icon: Zap,
  },
  [NODE_STATES.IN_PROGRESS]: {
    bar: "#BFA264",
    dot: "#D4AF78",
    glow: "rgba(191,162,100,0.4)",
    label: "EXECUTING",
    icon: RefreshCw,
  },
  [NODE_STATES.VERIFYING]: {
    bar: "#A78BFA",
    dot: "#A78BFA",
    glow: "rgba(167,139,250,0.4)",
    label: "VERIFYING",
    icon: RefreshCw,
  },
  [NODE_STATES.VERIFIED_GHOST]: {
    bar: "#4ADE80",
    dot: "#4ADE80",
    glow: "rgba(74,222,128,0.15)",
    label: "PROPAGATING",
    icon: Clock,
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    bar: "#F87171",
    dot: "#F87171",
    glow: "rgba(248,113,113,0.4)",
    label: "BACKOFF",
    icon: AlertCircle,
  },
  [NODE_STATES.LOCKED]: {
    bar: "#2A2A35",
    dot: "#333344",
    glow: "none",
    label: "LOCKED",
    icon: Lock,
  },
  [NODE_STATES.CORRUPTED]: {
    bar: "#F87171",
    dot: "#F87171",
    glow: "rgba(248,113,113,0.4)",
    label: "CYCLE ERR",
    icon: AlertCircle,
  },
};
const DEFAULT_CFG = STATE_CONFIG[NODE_STATES.LOCKED];

const formatTime = (ms) => {
  if (!ms || ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

const HANDLE_STYLE = {
  width: 8,
  height: 8,
  background: "#0D0D12",
  border: "1.5px solid rgba(191,162,100,0.35)",
  borderRadius: "50%",
  transition: "border-color 0.15s, transform 0.15s",
};

const AccentPalette = {
  amber: "#BFA264",
  emerald: "#4ADE80",
  violet: "#A78BFA",
  cyan: "#22D3EE",
  rose: "#F87171",
  orange: "#FB923C",
  sky: "#38BDF8",
  white: "#E8D5A3",
};

export const ExecutionNode = memo(
  ({ id, data, selected, style: nodeStyle }) => {
    const selectNode = useRoadmapStore((s) => s.selectNode);
    const collapseNode = useRoadmapStore((s) => s.collapseNode);

    const computedState = data._computed?.state || NODE_STATES.LOCKED;
    const timeLeft = data._computed?.timeLeft || 0;
    const cfg = STATE_CONFIG[computedState] || DEFAULT_CFG;
    const Icon = cfg.icon;
    const accent = AccentPalette[data.accentColor] || AccentPalette.amber;

    const [localTimer, setLocalTimer] = useState(timeLeft);
    const [collapsed, setCollapsed] = useState(data.collapsed ?? false);

    useEffect(() => {
      setLocalTimer(timeLeft);
    }, [timeLeft]);
    useEffect(() => {
      if (localTimer <= 0) return;
      const t = setInterval(
        () => setLocalTimer((p) => Math.max(0, p - 1000)),
        1000,
      );
      return () => clearInterval(t);
    }, [localTimer]);

    const isLocked = computedState === NODE_STATES.LOCKED;
    const isVerified = [
      NODE_STATES.VERIFIED,
      NODE_STATES.VERIFIED_GHOST,
    ].includes(computedState);
    const isActive = computedState === NODE_STATES.ACTIVE;
    const isOverdue =
      !isVerified && data.deadline && new Date(data.deadline) < new Date();

    const tasks = data.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;

    const nodeW = nodeStyle?.width ?? 240;

    const handleCollapse = useCallback(
      (e) => {
        e.stopPropagation();
        const next = !collapsed;
        setCollapsed(next);
        collapseNode(id, next);
      },
      [collapsed, collapseNode, id],
    );

    return (
      <div
        role="article"
        aria-label={`${data.title || "Node"} — ${cfg.label}`}
        aria-selected={selected}
        onClick={() => selectNode(id)}
        style={{
          width: nodeW,
          minWidth: 200,
          borderRadius: 8,
          background: "#0D0D12",
          border: `1px solid ${selected ? `${accent}50` : isLocked ? "rgba(255,255,255,0.05)" : "rgba(191,162,100,0.15)"}`,
          boxShadow: selected
            ? `0 0 0 1px ${accent}30, 0 8px 24px rgba(0,0,0,0.7)`
            : "0 2px 8px rgba(0,0,0,0.6)",
          opacity: isLocked ? 0.45 : 1,
          filter: isLocked ? "grayscale(0.6)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s, opacity 0.2s",
          overflow: "hidden",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <NodeResizer
          minWidth={200}
          minHeight={80}
          isVisible={selected}
          lineStyle={{ border: `1px dashed ${accent}40` }}
          handleStyle={{
            backgroundColor: accent,
            width: 6,
            height: 6,
            borderRadius: 2,
            border: "2px solid #0D0D12",
          }}
        />

        {/* Handles */}
        {["top", "bottom", "left", "right"].map((pos) => (
          <Handle
            key={pos}
            type={["top", "left"].includes(pos) ? "target" : "source"}
            position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
            id={pos}
            style={{ ...HANDLE_STYLE, borderColor: `${cfg.bar}50` }}
            className="hover:!scale-150 hover:!border-current transition-transform"
          />
        ))}

        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: cfg.bar,
            transition: "background 0.3s",
            boxShadow: cfg.glow !== "none" ? `2px 0 8px ${cfg.glow}` : "none",
          }}
        />

        {/* Content */}
        <div
          style={{
            paddingLeft: 11,
            paddingRight: 10,
            paddingTop: 9,
            paddingBottom: 9,
          }}
        >
          {/* ── ROW 1: Status + Title + Collapse ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 5,
            }}
          >
            {/* Pulse dot */}
            <div
              style={{
                position: "relative",
                width: 7,
                height: 7,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: cfg.dot,
                  boxShadow:
                    cfg.glow !== "none" ? `0 0 5px ${cfg.glow}` : "none",
                }}
              />
              {(isActive || computedState === NODE_STATES.IN_PROGRESS) && (
                <div
                  style={{
                    position: "absolute",
                    inset: -2,
                    borderRadius: "50%",
                    border: `1px solid ${cfg.dot}`,
                    animation: "nodeStatePulse 1.8s ease-out infinite",
                    opacity: 0.5,
                  }}
                />
              )}
            </div>

            {/* Title */}
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 12,
                fontWeight: 700,
                color: isVerified
                  ? "rgba(245,240,232,0.35)"
                  : "rgba(245,240,232,0.92)",
                textDecoration: isVerified ? "line-through" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              {data.title || "Untitled"}
            </span>

            {/* Timer / collapse */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {localTimer > 0 && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: cfg.dot,
                    background: `${cfg.dot}15`,
                    padding: "1px 5px",
                    borderRadius: 4,
                    border: `1px solid ${cfg.dot}25`,
                  }}
                >
                  {formatTime(localTimer)}
                </span>
              )}
              <button
                onClick={handleCollapse}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(245,240,232,0.25)",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {collapsed ? (
                  <ChevronDown style={{ width: 12, height: 12 }} />
                ) : (
                  <ChevronUp style={{ width: 12, height: 12 }} />
                )}
              </button>
            </div>
          </div>

          {/* ── ROW 2: Type tag + Status label + Deadline ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginBottom: collapsed ? 0 : 7,
            }}
          >
            {data.nodeType && (
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: `${accent}90`,
                  background: `${accent}12`,
                  padding: "1px 6px",
                  borderRadius: 3,
                  border: `1px solid ${accent}25`,
                  flexShrink: 0,
                }}
              >
                {data.nodeType}
              </span>
            )}
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: `${cfg.dot}90`,
                flexShrink: 0,
              }}
            >
              {cfg.label}
            </span>
            <div style={{ flex: 1 }} />
            {data.deadline && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexShrink: 0,
                }}
              >
                <Calendar
                  style={{
                    width: 8,
                    height: 8,
                    color: isOverdue ? "#F87171" : "rgba(245,240,232,0.25)",
                  }}
                />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 600,
                    color: isOverdue ? "#F87171" : "rgba(245,240,232,0.25)",
                    fontFamily: "monospace",
                  }}
                >
                  {new Date(data.deadline).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* ── EXPANDED CONTENT ── */}
          {!collapsed && (
            <>
              {/* Subtitle */}
              {data.subtitle && (
                <p
                  style={{
                    fontSize: 10,
                    color: "rgba(245,240,232,0.38)",
                    marginBottom: 6,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  {data.subtitle}
                </p>
              )}

              {/* Tasks mini-list (max 3) */}
              {tasks.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  {tasks.slice(0, 3).map((task, i) => (
                    <div
                      key={task.id || i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: 2,
                          flexShrink: 0,
                          border: `1px solid ${task.completed ? "#4ADE80" : "rgba(255,255,255,0.12)"}`,
                          background: task.completed
                            ? "rgba(74,222,128,0.12)"
                            : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {task.completed && (
                          <Check
                            style={{ width: 7, height: 7, color: "#4ADE80" }}
                          />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          lineHeight: 1.3,
                          flex: 1,
                          minWidth: 0,
                          color: task.completed
                            ? "rgba(245,240,232,0.22)"
                            : "rgba(245,240,232,0.58)",
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontFamily: "'Poppins', sans-serif",
                        }}
                      >
                        {task.text || <em style={{ opacity: 0.4 }}>Empty</em>}
                      </span>
                      {(task.points ?? 0) > 0 && (
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            color: "rgba(191,162,100,0.4)",
                            flexShrink: 0,
                          }}
                        >
                          +{task.points}
                        </span>
                      )}
                    </div>
                  ))}
                  {tasks.length > 3 && (
                    <span
                      style={{
                        fontSize: 9,
                        color: "rgba(245,240,232,0.2)",
                        paddingLeft: 17,
                      }}
                    >
                      +{tasks.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Tags */}
              {data.tags?.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 3,
                    marginBottom: 6,
                  }}
                >
                  {data.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        background: `${accent}10`,
                        color: `${accent}70`,
                        padding: "1px 5px",
                        borderRadius: 3,
                        border: `1px solid ${accent}18`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer: score + VC type */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  paddingTop: 6,
                  marginTop: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap
                    style={{
                      width: 9,
                      height: 9,
                      color: "rgba(191,162,100,0.5)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      color: "rgba(191,162,100,0.5)",
                    }}
                  >
                    +{data.verificationContract?.scoreReward || 25}
                  </span>
                </div>
                {data.verificationContract?.type && (
                  <span
                    style={{
                      fontSize: 7,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "rgba(245,240,232,0.2)",
                      background: "rgba(255,255,255,0.03)",
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}
                  >
                    {data.verificationContract.type.replace("_", " ")}
                  </span>
                )}
                {tasks.length > 0 && (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 3 }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 2,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.05)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0}%`,
                          background: accent,
                          transition: "width 0.4s",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 8,
                        color: "rgba(245,240,232,0.25)",
                        fontFamily: "monospace",
                      }}
                    >
                      {doneTasks}/{tasks.length}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
        @keyframes nodeStatePulse {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
      </div>
    );
  },
);

ExecutionNode.displayName = "ExecutionNode";
