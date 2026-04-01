/**
 * @fileoverview ExecutionNode — v3 Visual Redesign
 *
 * Philosophy: "professional tool, not a game"
 * Inspired by Linear / n8n / Vercel dashboard aesthetic — dark, clean, fast.
 *
 * Performance improvements vs v2:
 *  - Width 300px (was 420px) → 40% more nodes visible in viewport
 *  - Removed backdrop-blur-2xl (was the #1 GPU bottleneck)
 *  - Removed SVG progress ring (replaced with 2px bottom bar)
 *  - Removed glow box-shadows from non-selected state
 *  - Simplified DOM: 3 fewer nesting levels
 *  - No inline filter: computations
 *  - All functionality preserved (handles, resize, collapse, tasks, tags, deadline, assets, delegates)
 */

import React, { useState, memo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Users,
} from "lucide-react";
import { cn } from "../ui/BentoCard";
import { NODE_ACCENT_PALETTE } from "../../lib/roadmap/constants.js";
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

export const ExecutionNode = memo(
  ({ data, selected, id, style: nodeStyle }) => {
    const [collapsed, setCollapsed] = useState(data.collapsed ?? false);
    const { toggleNodeCollapse, setActiveEditNodeId } = useRoadmap();

    // ── Derived state ──────────────────────────────────────────────────────────
    const isCompleted = !!data.isCompleted;
    const isOverdue =
      !isCompleted && data.deadline && new Date(data.deadline) < new Date();
    const isActive =
      data.priorityStatus === "READY" && !isCompleted && !isOverdue;
    const isFuture =
      data.priorityStatus === "FUTURE" && !isCompleted && !isOverdue;

    const accent = NODE_ACCENT_PALETTE[data.accentColor || "amber"];

    const tasks = data.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;
    const progress =
      tasks.length > 0
        ? Math.round((doneTasks / tasks.length) * 100)
        : isCompleted
          ? 100
          : 0;

    // ── Status ─────────────────────────────────────────────────────────────────
    const statusColor = isCompleted
      ? "#10b981"
      : isOverdue
        ? "#ef4444"
        : isActive
          ? accent.primary
          : "rgba(255,255,255,0.2)";

    const statusLabel = isCompleted
      ? "Done"
      : isOverdue
        ? "Overdue"
        : isActive
          ? "Active"
          : "Pending";

    const accentBarColor = isCompleted
      ? "#10b981"
      : isOverdue
        ? "#ef4444"
        : accent.primary;

    // ── Node dimensions ────────────────────────────────────────────────────────
    const nodeWidth = nodeStyle?.width ?? 300;
    const nodeHeight = nodeStyle?.height ?? "auto";

    // ── Border & shadow ────────────────────────────────────────────────────────
    const borderColor = selected
      ? `${accentBarColor}55`
      : "rgba(255,255,255,0.07)";

    const nodeShadow = selected
      ? `0 4px 20px rgba(0,0,0,0.8), 0 0 0 1px ${accentBarColor}25`
      : "0 1px 6px rgba(0,0,0,0.5)";

    return (
      <div
        role="article"
        aria-label={`${data.title || "Untitled"} — ${statusLabel}`}
        aria-selected={selected}
        className={cn(
          "relative flex flex-col overflow-hidden transition-all duration-200",
          data.isDimmed && "opacity-15 grayscale pointer-events-none",
          isFuture && !selected && !data.isDimmed && "opacity-50",
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
          transition: "box-shadow 0.2s, border-color 0.2s, transform 0.15s",
        }}
        onClick={() => setActiveEditNodeId(id)}
      >
        {/* ── NodeResizer ──────────────────────────────────────────────────── */}
        <NodeResizer
          minWidth={220}
          minHeight={100}
          isVisible={selected}
          lineStyle={{
            border: `1px dashed ${accent.primary}50`,
          }}
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
          style={{
            ...HANDLE_STYLE,
            borderColor: `${accent.primary}60`,
          }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className={HANDLE_HOVER_CLS}
          style={{
            ...HANDLE_STYLE,
            borderColor: `${accent.primary}60`,
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          className={HANDLE_HOVER_CLS}
          style={{
            ...HANDLE_STYLE,
            borderColor: `${accent.primary}60`,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className={HANDLE_HOVER_CLS}
          style={{
            ...HANDLE_STYLE,
            borderColor: `${accent.primary}60`,
          }}
        />

        {/* ══════════════════════════════════════════════════════════════════
          TOP ACCENT BAR — the brand/identity line
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
          {/* ── Header row ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-2">
            {/* Status dot + label */}
            <div className="flex items-center gap-1.5">
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusColor,
                  boxShadow:
                    isActive && !isCompleted
                      ? `0 0 4px ${accent.primary}80`
                      : undefined,
                  flexShrink: 0,
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: `${statusColor}b0` }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Right: type + deadline + collapse */}
            <div className="flex items-center gap-2">
              {data.nodeType && (
                <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                  {data.nodeType}
                </span>
              )}

              {data.deadline && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[8px] font-semibold",
                    isOverdue && !isCompleted
                      ? "text-rose-400/70"
                      : "text-white/25",
                  )}
                >
                  <CalendarIcon className="w-2.5 h-2.5" />
                  {new Date(data.deadline).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                  })}
                  {isOverdue && !isCompleted && (
                    <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />
                  )}
                </span>
              )}

              <button
                aria-label={collapsed ? "Expand node" : "Collapse node"}
                aria-expanded={!collapsed}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const next = !collapsed;
                  setCollapsed(next);
                  toggleNodeCollapse(id, next);
                }}
                className="pointer-events-auto w-5 h-5 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:outline-none rounded"
              >
                {collapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* ── Title ───────────────────────────────────────────────────── */}
          <h3
            className="font-bold leading-snug mb-0.5"
            style={{
              fontSize: 14,
              color: isCompleted
                ? "rgba(255,255,255,0.35)"
                : "rgba(255,255,255,0.92)",
              textDecoration: isCompleted ? "line-through" : "none",
              // Long titles wrap cleanly
              wordBreak: "break-word",
              hyphens: "auto",
            }}
          >
            {data.title || "Unnamed Protocol"}
          </h3>

          {/* ── Subtitle ────────────────────────────────────────────────── */}
          {data.subtitle && (
            <p
              className="mb-2 truncate"
              style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}
            >
              {data.subtitle}
            </p>
          )}

          {/* ── Expanded content ─────────────────────────────────────────── */}
          {!collapsed && (
            <>
              {/* Description snippet */}
              {data.desc && (
                <p
                  className="mb-2.5 line-clamp-2 leading-relaxed"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}
                >
                  {data.desc}
                </p>
              )}

              {/* Tags */}
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

              {/* Tasks */}
              {tasks.length > 0 && (
                <div className="space-y-1 mb-2">
                  {tasks.slice(0, 5).map((task, i) => (
                    <div
                      key={task.id || i}
                      className="flex items-start gap-1.5"
                    >
                      {/* Checkbox */}
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

              {/* Footer meta: linked assets + delegates */}
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
                      {data.delegates.length > 4 && (
                        <span
                          style={{
                            fontSize: 8,
                            color: "rgba(255,255,255,0.2)",
                            marginLeft: 2,
                          }}
                        >
                          +{data.delegates.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
          PROGRESS FOOTER — thin 2px bottom bar + percentage
      ══════════════════════════════════════════════════════════════════ */}
        {(tasks.length > 0 || isCompleted) && (
          <>
            {/* Track */}
            <div
              style={{
                height: 2,
                background: "rgba(255,255,255,0.04)",
                flexShrink: 0,
                position: "relative",
              }}
            >
              {/* Fill */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${progress}%`,
                  background: accentBarColor,
                  opacity: 0.8,
                  transition: "width 0.6s ease",
                  borderRadius: "0 1px 1px 0",
                }}
              />
            </div>

            {/* % label row — only when expanded and has tasks */}
            {!collapsed && tasks.length > 0 && (
              <div
                className="flex items-center justify-between"
                style={{
                  padding: "4px 12px 6px",
                  borderTop: "none",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.18)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {doneTasks}/{tasks.length} tasks
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    fontFamily: "monospace",
                    color: `${accentBarColor}80`,
                  }}
                >
                  {progress}%
                </span>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

ExecutionNode.displayName = "ExecutionNode";
