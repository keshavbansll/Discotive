/**
 * @fileoverview MobileNodeSheet.jsx — Agentic Mobile Node Interaction Sheet
 * @description
 * Bottom sheet for mobile node interaction on the agentic execution canvas.
 * Shows node state, tasks, verification contract, and proof-of-work submission.
 * Supports drag-to-dismiss with spring physics.
 * Renders via createPortal to escape React Flow's stacking context.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  X,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Database,
  Video,
  Send,
  Loader2,
  Check,
  Activity,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { NODE_STATES } from "../../contexts/AgenticExecutionEngine.jsx";

// ── Time formatter ────────────────────────────────────────────────────────────
const formatTime = (ms) => {
  if (!ms || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// ── State config ──────────────────────────────────────────────────────────────
const STATE_CONFIG = {
  [NODE_STATES.VERIFIED]: {
    color: "#4ADE80",
    label: "Verified",
    icon: CheckCircle,
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
  },
  [NODE_STATES.ACTIVE]: {
    color: "#BFA264",
    label: "Ready to Execute",
    icon: Zap,
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  [NODE_STATES.IN_PROGRESS]: {
    color: "#BFA264",
    label: "In Progress",
    icon: Activity,
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
  },
  [NODE_STATES.VERIFYING]: {
    color: "#A78BFA",
    label: "Verifying...",
    icon: RefreshCw,
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
  },
  [NODE_STATES.LOCKED]: {
    color: "rgba(255,255,255,0.2)",
    label: "Locked",
    icon: Lock,
    bg: "bg-white/[0.03]",
    border: "border-white/[0.07]",
  },
  [NODE_STATES.FAILED_BACKOFF]: {
    color: "#F87171",
    label: "Penalty Active",
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/25",
  },
  [NODE_STATES.VERIFIED_GHOST]: {
    color: "#4ADE80",
    label: "Propagating...",
    icon: RefreshCw,
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/15",
  },
  [NODE_STATES.CORRUPTED]: {
    color: "#F87171",
    label: "Cycle Error",
    icon: AlertCircle,
    bg: "bg-red-500/10",
    border: "border-red-500/25",
  },
};
const DEFAULT_CONFIG = STATE_CONFIG[NODE_STATES.LOCKED];

// ── Task row ──────────────────────────────────────────────────────────────────
const TaskRow = ({ task, accentColor = "#BFA264" }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
    <div
      className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0"
      style={{
        background: task.completed ? `${accentColor}20` : "transparent",
        borderColor: task.completed ? accentColor : "rgba(255,255,255,0.15)",
      }}
    >
      {task.completed && (
        <Check className="w-3 h-3" style={{ color: accentColor }} />
      )}
    </div>
    <span
      className={cn(
        "flex-1 text-sm leading-snug",
        task.completed ? "text-white/30 line-through" : "text-white/80",
      )}
    >
      {task.text || <span className="italic text-white/20">Empty task</span>}
    </span>
    {(task.points ?? 0) > 0 && (
      <span
        className="text-[9px] font-black font-mono shrink-0"
        style={{ color: `${accentColor}70` }}
      >
        +{task.points}
      </span>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const MobileNodeSheet = ({
  node,
  onClose,
  onExecute,
  onVerify,
  userVault = [],
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [proofInput, setProofInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const dragY = useMotionValue(0);
  const sheetOpacity = useTransform(dragY, [0, 200], [1, 0.3]);

  const computedState = node.data?._computed?.state || NODE_STATES.LOCKED;
  const stateConfig = STATE_CONFIG[computedState] || DEFAULT_CONFIG;
  const StateIcon = stateConfig.icon;

  const accentColor =
    {
      amber: "#BFA264",
      emerald: "#10b981",
      violet: "#8b5cf6",
      cyan: "#06b6d4",
      rose: "#f43f5e",
      orange: "#f97316",
      sky: "#38bdf8",
      white: "#ffffff",
    }[node.data?.accentColor || "amber"] || "#BFA264";

  const tasks = node.data?.tasks || [];
  const doneTasks = tasks.filter((t) => t.completed).length;
  const vc = node.data?.verificationContract || {};
  const isLocked = computedState === NODE_STATES.LOCKED;
  const isVerified =
    computedState === NODE_STATES.VERIFIED ||
    computedState === NODE_STATES.VERIFIED_GHOST;
  const isActive = computedState === NODE_STATES.ACTIVE;
  const isBackoff = computedState === NODE_STATES.FAILED_BACKOFF;
  const isInteractable = node.data?._computed?.isInteractable;

  // Live countdown timer
  useEffect(() => {
    const baseTime = node.data?._computed?.timeRemaining || 0;
    if (!baseTime) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(baseTime);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (!prev || prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [node.data?._computed?.timeRemaining]);

  // Drag to dismiss
  const handleDragEnd = useCallback(
    (_, info) => {
      if (info.offset.y > 120 || info.velocity.y > 400) onClose();
      else dragY.set(0);
    },
    [onClose, dragY],
  );

  const handleSubmitProof = useCallback(async () => {
    if (!proofInput.trim() || proofInput.trim().length < 5 || isSubmitting)
      return;
    setIsSubmitting(true);
    try {
      await onVerify?.(node.id, proofInput.trim());
      setProofInput("");
    } finally {
      setIsSubmitting(false);
    }
  }, [proofInput, isSubmitting, onVerify, node.id]);

  if (!node) return null;

  // ── Linked vault asset (if assetWidget or has linked asset) ──────────────
  const linkedAsset = userVault.find(
    (a) =>
      a.id === node.data?.assetId ||
      (node.data?.learnId && a.discotiveLearnId === node.data?.learnId),
  );

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: `Tasks (${doneTasks}/${tasks.length})` },
    ...(isInteractable ? [{ id: "verify", label: "Verify" }] : []),
  ];

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="mobile-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[500]"
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        key="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Node: ${node.data?.title || "Execution Node"}`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.8 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={handleDragEnd}
        style={{ y: dragY, opacity: sheetOpacity }}
        className="fixed bottom-0 left-0 right-0 z-[510] bg-[#0a0a0a] border-t border-white/[0.08] rounded-t-[1.75rem] flex flex-col shadow-[0_-30px_60px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent line — color-coded by state */}
        <div
          className="h-0.5 w-full rounded-t-[1.75rem]"
          style={{ background: stateConfig.color, opacity: 0.8 }}
        />

        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing"
          aria-hidden="true"
        >
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            {/* State badge */}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest mb-2",
                stateConfig.bg,
                stateConfig.border,
              )}
            >
              <StateIcon
                className={cn(
                  "w-3 h-3",
                  computedState === NODE_STATES.VERIFYING && "animate-spin",
                )}
                style={{ color: stateConfig.color }}
              />
              <span style={{ color: stateConfig.color }}>
                {stateConfig.label}
              </span>
            </div>

            {/* Title */}
            <h2
              className={cn(
                "text-lg font-black text-white leading-tight truncate",
                isVerified && "line-through text-white/40",
              )}
            >
              {node.data?.title || "Untitled Protocol"}
            </h2>

            {/* Subtitle */}
            {node.data?.subtitle && (
              <p className="text-xs text-white/40 mt-0.5 truncate">
                {node.data.subtitle}
              </p>
            )}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close sheet"
            className="w-9 h-9 bg-white/[0.06] border border-white/[0.08] rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock reason */}
        {(isLocked || isBackoff) && node.data?._computed?.lockReason && (
          <div className="mx-5 mb-2 px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <p className="text-[10px] text-white/40 leading-relaxed">
              {node.data._computed.lockReason}
            </p>
          </div>
        )}

        {/* Countdown timer */}
        {timeLeft != null && timeLeft > 0 && (
          <div
            className="mx-5 mb-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border"
            style={{
              background: `${stateConfig.color}10`,
              borderColor: `${stateConfig.color}30`,
            }}
          >
            <Clock
              className="w-4 h-4 shrink-0"
              style={{ color: stateConfig.color }}
            />
            <div className="flex-1 min-w-0">
              <p
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: stateConfig.color }}
              >
                {computedState === NODE_STATES.FAILED_BACKOFF
                  ? "Backoff Expires"
                  : "Minimum Time Remaining"}
              </p>
              <p
                className="text-base font-black font-mono"
                style={{ color: stateConfig.color }}
              >
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        )}

        {/* Progress bar (tasks) */}
        {tasks.length > 0 && (
          <div className="mx-5 mb-2 h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                background: accentColor,
              }}
            />
          </div>
        )}

        {/* Tabs */}
        {TABS.length > 1 && (
          <div className="flex border-b border-white/[0.06] shrink-0 mx-0 px-5 gap-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "border-current"
                    : "border-transparent text-white/30",
                )}
                style={
                  activeTab === tab.id
                    ? { color: accentColor, borderColor: accentColor }
                    : {}
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Body — max 55vh to leave room for bottom nav */}
        <div
          className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4"
          style={{ maxHeight: "55vh" }}
        >
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <>
              {/* Description */}
              {node.data?.desc && (
                <p className="text-sm text-white/60 leading-relaxed">
                  {node.data.desc}
                </p>
              )}

              {/* Deadline */}
              {node.data?.deadline && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Deadline:{" "}
                    <span
                      className={cn(
                        "font-bold",
                        !isVerified && new Date(node.data.deadline) < new Date()
                          ? "text-red-400"
                          : "text-white/70",
                      )}
                    >
                      {new Date(node.data.deadline).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </span>
                </div>
              )}

              {/* XP Reward */}
              {(node.data?.xpReward || vc.scoreReward) > 0 && (
                <div className="flex items-center gap-2">
                  <Zap
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: accentColor }}
                  />
                  <span
                    className="text-xs font-bold"
                    style={{ color: accentColor }}
                  >
                    +{node.data?.xpReward || vc.scoreReward} pts on verification
                  </span>
                </div>
              )}

              {/* Tags */}
              {(node.data?.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {node.data.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        background: `${accentColor}12`,
                        color: `${accentColor}90`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Linked asset */}
              {linkedAsset && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                  <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-400 truncate">
                      {linkedAsset.title}
                    </p>
                    <p className="text-[9px] text-emerald-400/50 uppercase tracking-widest">
                      {linkedAsset.status === "VERIFIED"
                        ? "Verified Asset"
                        : "Pending Verification"}
                    </p>
                  </div>
                  {linkedAsset.url && (
                    <a
                      href={linkedAsset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-emerald-500/20 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                    </a>
                  )}
                </div>
              )}

              {/* Sprint phase */}
              {node.data?.sprintPhase && (
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/25">
                  Sprint: {node.data.sprintPhase}
                </div>
              )}
            </>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === "tasks" && (
            <>
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-white/25 text-sm">
                  No sub-routines defined.
                </div>
              ) : (
                <div>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      accentColor={accentColor}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── VERIFY TAB ── */}
          {activeTab === "verify" && (
            <>
              {isBackoff ? (
                <div className="p-4 bg-red-500/8 border border-red-500/20 rounded-xl text-center">
                  <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-red-400">
                    Penalty lock active
                  </p>
                  <p className="text-[10px] text-red-400/60 mt-1">
                    Wait for the countdown to expire before resubmitting.
                  </p>
                </div>
              ) : isActive ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">
                      Proof of Work
                    </label>
                    <p className="text-[10px] text-white/30 leading-relaxed mb-3">
                      Submit a GitHub URL, deployed link, article, or written
                      reflection (min. 50 words) as proof.
                    </p>
                    <textarea
                      value={proofInput}
                      onChange={(e) => setProofInput(e.target.value)}
                      placeholder="Paste your proof URL or write a detailed reflection..."
                      rows={4}
                      className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/40 transition-colors resize-none custom-scrollbar"
                      disabled={isSubmitting}
                    />
                    <div className="flex justify-end mt-1">
                      <span className="text-[9px] font-mono text-white/25">
                        {proofInput.length} chars
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSubmitProof}
                    disabled={proofInput.trim().length < 5 || isSubmitting}
                    className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{
                      background: accentColor,
                      color: "#000",
                      boxShadow: `0 0 20px ${accentColor}30`,
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying
                        via AI...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Proof
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
                  <p className="text-xs text-white/40">
                    Node must be in Active state to submit verification.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom safe area spacer */}
        <div className="h-[calc(1rem+env(safe-area-inset-bottom))] shrink-0" />
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default MobileNodeSheet;
