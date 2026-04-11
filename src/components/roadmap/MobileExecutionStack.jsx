/**
 * @fileoverview MobileExecutionStack — Native Mobile Execution View
 * @description
 * The canvas is hostile to mobile. This replaces it entirely on screens < 768px.
 * Architecture: vertical "Phase Group" accordion → Node Cards → Swipe-up bottom sheet.
 *
 * UX principles:
 * - Grouped by sprintPhase — each phase is a collapsible section
 * - Each node renders as a horizontal card (thumb-sized, min 56px height)
 * - State-colored left bar + compact metadata + expand chevron
 * - Tap → bottom sheet slides up from bottom (spring physics, swipe-to-close)
 * - All edit/complete/task operations available in sheet
 * - Zero canvas interaction — pure list paradigm
 */

import React, { useState, useRef, useCallback, memo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useAnimation,
} from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Zap,
  Shield,
  Lock,
  Clock,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  Target,
  Award,
  Layers,
  Activity,
  Calendar,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useRoadmapStore, NODE_STATES } from "../../store/useRoadmapStore";

// ── Design tokens (same as canvas) ───────────────────────────────────────────
const STATE_CFG = {
  [NODE_STATES.VERIFIED]: {
    bar: "#4ADE80",
    text: "#4ADE80",
    bg: "rgba(74,222,128,0.06)",
    label: "VERIFIED",
    icon: ShieldCheck,
  },
  [NODE_STATES.ACTIVE]: {
    bar: "#BFA264",
    text: "#D4AF78",
    bg: "rgba(191,162,100,0.05)",
    label: "READY",
    icon: Zap,
  },
  [NODE_STATES.IN_PROGRESS]: {
    bar: "#BFA264",
    text: "#D4AF78",
    bg: "rgba(191,162,100,0.05)",
    label: "EXECUTING",
    icon: RefreshCw,
  },
  [NODE_STATES.VERIFYING]: {
    bar: "#A78BFA",
    text: "#A78BFA",
    bg: "rgba(167,139,250,0.05)",
    label: "VERIFYING",
    icon: RefreshCw,
  },
  [NODE_STATES.VERIFIED_GHOST]: {
    bar: "#4ADE80",
    text: "#4ADE80",
    bg: "rgba(74,222,128,0.03)",
    label: "PROPAGATING",
    icon: Clock,
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    bar: "#F87171",
    text: "#F87171",
    bg: "rgba(248,113,113,0.05)",
    label: "BACKOFF",
    icon: AlertCircle,
  },
  [NODE_STATES.LOCKED]: {
    bar: "#2A2A35",
    text: "rgba(245,240,232,0.2)",
    bg: "transparent",
    label: "LOCKED",
    icon: Lock,
  },
};
const DEFAULT_CFG = STATE_CFG[NODE_STATES.LOCKED];

// ── Phase colors ──────────────────────────────────────────────────────────────
const PHASE_COLORS = [
  { accent: "#BFA264", bg: "rgba(191,162,100,0.05)" },
  { accent: "#4ADE80", bg: "rgba(74,222,128,0.04)" },
  { accent: "#38BDF8", bg: "rgba(56,189,248,0.04)" },
  { accent: "#A78BFA", bg: "rgba(167,139,250,0.04)" },
  { accent: "#FB923C", bg: "rgba(251,146,60,0.04)" },
];

// ── Single node card ───────────────────────────────────────────────────────────
const NodeCard = memo(({ node, onTap }) => {
  const state = node.data?._computed?.state || NODE_STATES.LOCKED;
  const cfg = STATE_CFG[state] || DEFAULT_CFG;
  const Icon = cfg.icon;
  const tasks = node.data?.tasks || [];
  const done = tasks.filter((t) => t.completed).length;
  const isVerified = [
    NODE_STATES.VERIFIED,
    NODE_STATES.VERIFIED_GHOST,
  ].includes(state);
  const isLocked = state === NODE_STATES.LOCKED;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => !isLocked && onTap(node)}
      className="relative flex items-center gap-0 overflow-hidden"
      style={{
        minHeight: 60,
        background: cfg.bg,
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        opacity: isLocked ? 0.45 : 1,
        cursor: isLocked ? "default" : "pointer",
      }}
    >
      {/* Left bar */}
      <div
        style={{
          width: 3,
          alignSelf: "stretch",
          background: cfg.bar,
          flexShrink: 0,
          boxShadow: !isLocked ? `1px 0 6px ${cfg.bar}40` : "none",
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {/* Status icon */}
          <Icon
            style={{ width: 12, height: 12, color: cfg.text, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isVerified
                ? "rgba(245,240,232,0.35)"
                : "rgba(245,240,232,0.90)",
              textDecoration: isVerified ? "line-through" : "none",
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {node.data?.title || "Untitled"}
          </span>
          {/* Deadline */}
          {node.data?.deadline && (
            <span
              style={{
                fontSize: 9,
                color: "rgba(245,240,232,0.25)",
                fontFamily: "monospace",
                flexShrink: 0,
              }}
            >
              {new Date(node.data.deadline).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {!isLocked && (
            <ChevronRight
              style={{
                width: 12,
                height: 12,
                color: "rgba(245,240,232,0.20)",
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {/* Sub-row: tags + task progress */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: `${cfg.text}80`,
            }}
          >
            {cfg.label}
          </span>
          {tasks.length > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  height: 8,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 32,
                    height: 2,
                    borderRadius: 1,
                    background: "rgba(255,255,255,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: cfg.bar,
                      borderRadius: 1,
                      width: tasks.length
                        ? `${Math.round((done / tasks.length) * 100)}%`
                        : "0%",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 8,
                    color: "rgba(245,240,232,0.28)",
                    fontFamily: "monospace",
                  }}
                >
                  {done}/{tasks.length}
                </span>
              </div>
            </>
          )}
          {node.data?.verificationContract?.scoreReward > 0 && (
            <>
              <div
                style={{
                  width: 1,
                  height: 8,
                  background: "rgba(255,255,255,0.08)",
                }}
              />
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: "rgba(191,162,100,0.4)",
                }}
              >
                +{node.data.verificationContract.scoreReward}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
});
NodeCard.displayName = "NodeCard";

// ── Phase group ────────────────────────────────────────────────────────────────
const PhaseGroup = memo(({ phase, nodes, phaseIdx, onNodeTap }) => {
  const [open, setOpen] = useState(true);
  const colors = PHASE_COLORS[phaseIdx % PHASE_COLORS.length];
  const verified = nodes.filter((n) =>
    [NODE_STATES.VERIFIED, NODE_STATES.VERIFIED_GHOST].includes(
      n.data?._computed?.state,
    ),
  ).length;
  const pct =
    nodes.length > 0 ? Math.round((verified / nodes.length) * 100) : 0;

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Phase header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3"
        style={{
          background: open ? colors.bg : "transparent",
          borderBottom: open ? "1px solid rgba(255,255,255,0.04)" : "none",
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: colors.accent,
            flexShrink: 0,
            boxShadow: `0 0 6px ${colors.accent}60`,
          }}
        />
        <span
          style={{
            flex: 1,
            textAlign: "left",
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: colors.accent,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          {phase}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {/* Mini progress */}
          <div
            style={{
              width: 28,
              height: 2,
              borderRadius: 1,
              background: "rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 1,
                background: colors.accent,
                width: `${pct}%`,
                transition: "width 0.4s",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              color: `${colors.accent}80`,
            }}
          >
            {pct}%
          </span>
          <ChevronDown
            style={{
              width: 12,
              height: 12,
              color: `${colors.accent}60`,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </div>
      </button>

      {/* Nodes */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            {nodes.map((node) => (
              <NodeCard key={node.id} node={node} onTap={onNodeTap} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
PhaseGroup.displayName = "PhaseGroup";

// ── Node detail bottom sheet ───────────────────────────────────────────────────
const NodeBottomSheet = memo(({ node, onClose }) => {
  const toggleSubtask = useRoadmapStore((s) => s.toggleSubtask);
  const addPendingScore = useRoadmapStore((s) => s.addPendingScore);
  const updateNodeData = useRoadmapStore((s) => s.updateNodeData);

  const state = node?.data?._computed?.state || NODE_STATES.LOCKED;
  const cfg = STATE_CFG[state] || DEFAULT_CFG;
  const tasks = node?.data?.tasks || [];
  const Icon = cfg.icon;

  // Drag to dismiss
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const controls = useAnimation();

  const handleDragEnd = useCallback(
    async (_, info) => {
      if (info.offset.y > 80 || info.velocity.y > 400) {
        await controls.start({ y: "100%", opacity: 0 });
        onClose();
      } else {
        controls.start({ y: 0 });
      }
    },
    [controls, onClose],
  );

  if (!node) return null;

  return (
    <div className="fixed inset-0 z-[400]" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={controls}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        style={{ y, opacity }}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 rounded-t-[1.5rem] overflow-hidden flex flex-col"
        style={{
          maxHeight: "88vh",
          background: "#0A0A0F",
          border: "1px solid rgba(191,162,100,0.12)",
          borderBottom: "none",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3" aria-hidden>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: "rgba(255,255,255,0.12)",
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              style={{
                width: 4,
                height: 32,
                borderRadius: 2,
                background: cfg.bar,
                flexShrink: 0,
              }}
            />
            <div className="min-w-0">
              <h2
                className="text-base font-black text-white truncate"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {node.data?.title || "Node"}
              </h2>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: cfg.text }}
              >
                {cfg.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X
              style={{ width: 14, height: 14, color: "rgba(245,240,232,0.5)" }}
            />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Description */}
          {node.data?.desc && (
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(245,240,232,0.55)",
                  lineHeight: 1.6,
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {node.data.desc}
              </p>
            </div>
          )}

          {/* Meta row */}
          <div
            className="flex items-center gap-3 px-5 py-3 flex-wrap"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            {node.data?.deadline && (
              <div className="flex items-center gap-2">
                <Calendar
                  style={{
                    width: 12,
                    height: 12,
                    color: "rgba(245,240,232,0.35)",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(245,240,232,0.5)",
                    fontFamily: "monospace",
                  }}
                >
                  {new Date(node.data.deadline).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {node.data?.verificationContract?.scoreReward > 0 && (
              <div className="flex items-center gap-1.5">
                <Zap style={{ width: 12, height: 12, color: "#BFA264" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "rgba(191,162,100,0.7)",
                  }}
                >
                  +{node.data.verificationContract.scoreReward} pts
                </span>
              </div>
            )}
            {node.data?.nodeType && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(191,162,100,0.5)",
                  background: "rgba(191,162,100,0.08)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid rgba(191,162,100,0.15)",
                }}
              >
                {node.data.nodeType}
              </span>
            )}
          </div>

          {/* Tasks */}
          {tasks.length > 0 && (
            <div
              className="px-5 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(245,240,232,0.3)",
                  marginBottom: 12,
                }}
              >
                Sub-Routines ({tasks.filter((t) => t.completed).length}/
                {tasks.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() =>
                      toggleSubtask(node.id, task.id, addPendingScore)
                    }
                    disabled={state === NODE_STATES.LOCKED}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                      minHeight: 44,
                      width: "100%",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1.5px solid ${task.completed ? "#4ADE80" : "rgba(255,255,255,0.15)"}`,
                        background: task.completed
                          ? "rgba(74,222,128,0.12)"
                          : "transparent",
                      }}
                    >
                      {task.completed && (
                        <Check
                          style={{ width: 10, height: 10, color: "#4ADE80" }}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontFamily: "'Poppins', sans-serif",
                        color: task.completed
                          ? "rgba(245,240,232,0.28)"
                          : "rgba(245,240,232,0.75)",
                        textDecoration: task.completed
                          ? "line-through"
                          : "none",
                        lineHeight: 1.3,
                      }}
                    >
                      {task.text || "Empty task"}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "rgba(191,162,100,0.4)",
                        flexShrink: 0,
                      }}
                    >
                      +{task.points || 10}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Complete toggle */}
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "rgba(245,240,232,0.85)",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Mark Complete
              </p>
              <p style={{ fontSize: 11, color: "rgba(245,240,232,0.35)" }}>
                Locks this protocol as executed
              </p>
            </div>
            <button
              onClick={() =>
                updateNodeData(node.id, "isCompleted", !node.data?.isCompleted)
              }
              style={{
                width: 52,
                height: 30,
                borderRadius: 15,
                flexShrink: 0,
                background: node.data?.isCompleted
                  ? "#4ADE80"
                  : "rgba(255,255,255,0.08)",
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                boxShadow: node.data?.isCompleted
                  ? "0 0 10px rgba(74,222,128,0.4)"
                  : "none",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 4,
                  left: node.data?.isCompleted ? 26 : 4,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </div>

          {/* Tags */}
          {node.data?.tags?.length > 0 && (
            <div className="px-5 py-4">
              <p
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "rgba(245,240,232,0.3)",
                  marginBottom: 8,
                }}
              >
                Tags
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {node.data.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      background: "rgba(191,162,100,0.08)",
                      color: "rgba(191,162,100,0.7)",
                      padding: "4px 8px",
                      borderRadius: 5,
                      border: "1px solid rgba(191,162,100,0.18)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safe bottom padding */}
          <div
            style={{
              height: "env(safe-area-inset-bottom, 16px)",
              minHeight: 16,
            }}
          />
        </div>
      </motion.div>
    </div>
  );
});
NodeBottomSheet.displayName = "NodeBottomSheet";

// ── MAIN MOBILE STACK ──────────────────────────────────────────────────────────
const MobileExecutionStack = ({ nodes, edges }) => {
  const [activeNode, setActiveNode] = useState(null);

  // Group by sprintPhase, then by unlabeled nodes
  const grouped = React.useMemo(() => {
    const phases = {};
    const ungrouped = [];
    for (const node of nodes) {
      if (["logicGate", "computeNode", "groupNode"].includes(node.type))
        continue;
      const phase = node.data?.sprintPhase;
      if (phase) {
        if (!phases[phase]) phases[phase] = [];
        phases[phase].push(node);
      } else {
        ungrouped.push(node);
      }
    }
    return { phases, ungrouped };
  }, [nodes]);

  const phaseKeys = Object.keys(grouped.phases);
  const totalNodes = nodes.filter((n) => n.type === "executionNode").length;
  const verifiedNodes = nodes.filter((n) =>
    [NODE_STATES.VERIFIED, NODE_STATES.VERIFIED_GHOST].includes(
      n.data?._computed?.state,
    ),
  ).length;
  const pct =
    totalNodes > 0 ? Math.round((verifiedNodes / totalNodes) * 100) : 0;

  return (
    <div className="flex flex-col h-full" style={{ background: "#070709" }}>
      {/* Stack header */}
      <div
        className="shrink-0 px-4 py-4"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(10,10,15,0.9)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: "rgba(245,240,232,0.9)",
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              Execution Map
            </h2>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "rgba(245,240,232,0.3)",
                marginTop: 2,
              }}
            >
              {verifiedNodes}/{totalNodes} verified · {phaseKeys.length} phases
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="40"
                height="40"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="#BFA264"
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  style={{
                    filter: "drop-shadow(0 0 4px rgba(191,162,100,0.5))",
                    transition: "stroke-dashoffset 0.6s",
                  }}
                />
              </svg>
              <span
                style={{
                  position: "absolute",
                  fontSize: 10,
                  fontWeight: 900,
                  color: "#BFA264",
                  fontFamily: "monospace",
                }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Global progress bar */}
        <div
          style={{
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          <motion.div
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            style={{
              height: "100%",
              borderRadius: 2,
              background: "#BFA264",
              boxShadow: "0 0 8px rgba(191,162,100,0.5)",
            }}
          />
        </div>
      </div>

      {/* Phase groups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Layers
              style={{
                width: 40,
                height: 40,
                color: "rgba(245,240,232,0.1)",
                marginBottom: 16,
              }}
            />
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(245,240,232,0.4)",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              No execution map yet
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgba(245,240,232,0.2)",
                marginTop: 6,
              }}
            >
              Use a PC to generate or edit your map
            </p>
          </div>
        ) : (
          <>
            {phaseKeys.map((phase, idx) => (
              <PhaseGroup
                key={phase}
                phase={phase}
                nodes={grouped.phases[phase]}
                phaseIdx={idx}
                onNodeTap={setActiveNode}
              />
            ))}
            {grouped.ungrouped.length > 0 && (
              <PhaseGroup
                phase="Unassigned"
                nodes={grouped.ungrouped}
                phaseIdx={phaseKeys.length}
                onNodeTap={setActiveNode}
              />
            )}
          </>
        )}
        <div
          style={{
            height: "calc(env(safe-area-inset-bottom) + 80px)",
            minHeight: 96,
          }}
        />
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {activeNode && (
          <NodeBottomSheet
            node={activeNode}
            onClose={() => setActiveNode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileExecutionStack;
