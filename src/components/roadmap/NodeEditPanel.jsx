/**
 * @fileoverview Discotive Roadmap — Node Edit Panel (Dynamic Inspector)
 * Upgraded to morph based on node.type. Widgets get dedicated config forms,
 * Execution nodes get the full task/journal suite and Proof of Work submission.
 */

import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  X,
  Type,
  Activity,
  Tag,
  Palette,
  BookOpen,
  Trash2,
  Plus,
  Check,
  Calendar as CalendarIcon,
  Zap,
  Settings2,
  Users,
  Video,
  Database,
  Link2,
  Lock,
} from "lucide-react";
import { cn } from "../lib/cn";
import {
  NODE_ACCENT_PALETTE,
  NODE_TAGS,
  NODE_STATES,
} from "../../lib/roadmap/constants.js";
import { sanitize } from "../../lib/roadmap/sanitize.js";
import { useRoadmap } from "../../contexts/RoadmapContext.jsx";
import { useVerificationAPI } from "../../hooks/useVerificationAPI.js";

const MOODS = [
  "⚡ In flow",
  "🔥 On fire",
  "😤 Grinding",
  "🧊 Blocked",
  "💡 Clarity",
  "🎯 Locked in",
];
const STATUSES = ["READY", "FUTURE", "BLOCKED"];
const NODE_TYPES = ["core", "branch", "sub", "milestone"];

const fieldInput =
  "w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none transition-colors";

const getTabsForType = (type) => {
  switch (type) {
    case "videoWidget":
      return [
        { id: "video", label: "Media Engine", icon: Video },
        { id: "color", label: "Theme", icon: Palette },
      ];
    case "assetWidget":
      return [
        { id: "asset", label: "Vault Target", icon: Database },
        { id: "color", label: "Theme", icon: Palette },
      ];
    case "connectorNode":
      return [
        { id: "connector", label: "Integration", icon: Link2 },
        { id: "color", label: "Theme", icon: Palette },
      ];
    case "radarWidget":
    case "groupNode":
      return [{ id: "color", label: "Theme", icon: Palette }];
    default:
      return [
        { id: "info", label: "Info", icon: Type },
        { id: "tasks", label: "Tasks", icon: Activity },
        { id: "tags", label: "Tags", icon: Tag },
        { id: "color", label: "Color", icon: Palette },
        { id: "journal", label: "Journal", icon: BookOpen },
      ];
  }
};

export const NodeEditPanel = memo(
  ({
    node,
    mapId,
    onUpdate,
    onDelete,
    onSubtaskToggle,
    pendingScoreDelta,
    addToast,
  }) => {
    const { openVideoModal, setActiveEditNodeId } = useRoadmap();
    const { submitPayload, isVerifying } = useVerificationAPI();

    const availableTabs = useMemo(() => getTabsForType(node.type), [node.type]);
    const [tab, setTab] = useState(availableTabs[0].id);
    const [delegateInput, setDelegateInput] = useState("");
    const [payloadData, setPayloadData] = useState("");
    const titleRef = useRef(null);

    const isExecutionNode =
      !node.type ||
      node.type === "executionNode" ||
      node.type === "milestoneNode";

    const accent = NODE_ACCENT_PALETTE[node.data?.accentColor || "amber"];
    const tasks = node.data?.tasks || [];
    const doneTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const isCompleted = !!node.data?.isCompleted;

    // Strict computed state for Verification
    const computedState = node?.data?._computed?.state;
    const isLocked = computedState === NODE_STATES?.LOCKED;
    const isBackoff = computedState === NODE_STATES?.FAILED_BACKOFF;

    useEffect(() => {
      if (!availableTabs.find((t) => t.id === tab)) setTab(availableTabs[0].id);
      if (titleRef.current && isExecutionNode)
        setTimeout(() => titleRef.current?.focus(), 60);
    }, [node.id, node.type, availableTabs, tab, isExecutionNode]);

    const handleAccentFocus = (e) =>
      (e.target.style.borderColor = accent.primary);
    const handleAccentBlur = (e) => (e.target.style.borderColor = "#1e1e1e");

    const addTask = () =>
      onUpdate("tasks", [
        ...tasks,
        { id: crypto.randomUUID(), text: "", completed: false, points: 10 },
      ]);

    const updateTaskText = (taskId, text) =>
      onUpdate(
        "tasks",
        tasks.map((t) =>
          t.id === taskId ? { ...t, text: sanitize(text) } : t,
        ),
      );

    const removeTask = (taskId) =>
      onUpdate(
        "tasks",
        tasks.filter((t) => t.id !== taskId),
      );

    const completeAll = () => {
      onUpdate(
        "tasks",
        tasks.map((t) => ({ ...t, completed: true })),
      );
      onUpdate("isCompleted", true);
      addToast?.("All tasks secured. Protocol complete.", "green");
    };

    const addDelegate = () => {
      const val = delegateInput.trim();
      if (!val) return;
      onUpdate("delegates", [...(node.data.delegates || []), val]);
      setDelegateInput("");
    };

    const handleSubmission = async () => {
      if (isLocked || isBackoff) return;
      if (payloadData.trim().length < 5) return;

      await submitPayload(node.id, mapId, {
        type: "github_url",
        content: payloadData,
      });

      setPayloadData("");
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-[340px] xl:w-[380px] bg-[#060606] border-l border-[#1a1a1a] flex flex-col overflow-hidden shrink-0 z-[50]"
        role="complementary"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Settings2
              className="w-4 h-4 shrink-0"
              style={{ color: accent.primary }}
            />
            <span className="text-sm font-black text-white truncate">
              {node.type === "videoWidget"
                ? "Video Configuration"
                : node.type === "assetWidget"
                  ? "Vault Target Settings"
                  : node.type === "connectorNode"
                    ? "App Integration"
                    : node.data?.title || "Untitled"}
            </span>
          </div>
          <button
            onClick={() => setActiveEditNodeId(null)}
            className="w-7 h-7 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-[#888] hover:bg-white/10 hover:text-white transition-colors ml-2 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {isExecutionNode && totalTasks > 0 && (
          <div className="h-1 bg-[#1a1a1a] shrink-0">
            <div
              className="h-full transition-all duration-700 rounded-r-full"
              style={{
                width: `${Math.round((doneTasks / totalTasks) * 100)}%`,
                background: accent.primary,
              }}
            />
          </div>
        )}

        <div
          className="flex border-b border-[#1a1a1a] shrink-0 overflow-x-auto"
          role="tablist"
        >
          {availableTabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px focus-visible:outline-none",
                  isActive
                    ? "border-current"
                    : "border-transparent text-[#444] hover:text-[#777]",
                )}
                style={
                  isActive
                    ? { color: accent.primary, borderColor: accent.primary }
                    : {}
                }
              >
                <Icon className="w-3 h-3 shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
          {/* ── INFO & WIDGET CONFIGS ── */}
          {tab === "video" && (
            <div className="space-y-5">
              <div className="p-5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-center">
                {node.data?.youtubeId ? (
                  <>
                    <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center justify-center mb-1">
                      <Video className="w-7 h-7 text-sky-400" />
                    </div>
                    <div className="px-2">
                      <h4 className="text-sm font-black text-white leading-tight">
                        {node.data.title}
                      </h4>
                      <p className="text-[10px] text-[#666] font-mono mt-1.5 bg-[#111] py-1 px-2 rounded-md inline-block">
                        ID: {node.data.learnId?.split("_").pop()}
                      </p>
                    </div>
                    <button
                      onClick={() => openVideoModal(node.id)}
                      disabled={node.data?.isWatched}
                      className={cn(
                        "mt-3 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        node.data?.isWatched
                          ? "bg-[#0a0a0c] border-[#1a1a1a] text-[#333] cursor-not-allowed"
                          : "bg-[#111] hover:bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:text-white",
                      )}
                    >
                      {node.data?.isWatched
                        ? "Payload Locked"
                        : "Relink Media Vault"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-[#111] border border-[#1e1e1e] rounded-2xl flex items-center justify-center mb-1">
                      <Video className="w-7 h-7 text-[#444]" />
                    </div>
                    <div className="px-2">
                      <p className="text-xs font-bold text-[#666]">
                        No media payload attached.
                      </p>
                      <p className="text-[9px] text-[#444] mt-1">
                        Connect a source from the Vault to activate the tracking
                        engine.
                      </p>
                    </div>
                    <button
                      onClick={() => openVideoModal(node.id)}
                      className="mt-3 w-full py-3 bg-sky-500 hover:bg-sky-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(56,189,248,0.2)] transition-all"
                    >
                      Open Media Vault
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === "asset" && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Target Label
                </label>
                <input
                  type="text"
                  value={node.data?.label || ""}
                  onChange={(e) => onUpdate("label", sanitize(e.target.value))}
                  className={fieldInput}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500" /> Required
                  Verification ID
                </label>
                <input
                  type="text"
                  value={node.data?.requiredLearnId || ""}
                  onChange={(e) =>
                    onUpdate("requiredLearnId", sanitize(e.target.value))
                  }
                  placeholder="discotive_certificate_XXXXXX"
                  className={cn(fieldInput, "font-mono text-emerald-500/80")}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
                <p className="text-[8px] text-[#444] mt-1.5">
                  If set, only assets verified with this exact Learn ID will
                  fulfill the node.
                </p>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Category Hint
                </label>
                <input
                  type="text"
                  value={node.data?.category || ""}
                  onChange={(e) =>
                    onUpdate("category", sanitize(e.target.value))
                  }
                  placeholder="e.g. Certificate"
                  className={fieldInput}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
            </>
          )}

          {tab === "connector" && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={node.data?.app || ""}
                  onChange={(e) => onUpdate("app", sanitize(e.target.value))}
                  className={fieldInput}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Action / Trigger
                </label>
                <input
                  type="text"
                  value={node.data?.action || ""}
                  onChange={(e) => onUpdate("action", sanitize(e.target.value))}
                  className={fieldInput}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">
                    Connection Status
                  </p>
                  <p className="text-[9px] text-[#555]">
                    Mock integration state
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={!!node.data?.isConnected}
                  onClick={() =>
                    onUpdate("isConnected", !node.data?.isConnected)
                  }
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-all",
                    node.data?.isConnected ? "bg-emerald-500" : "bg-[#222]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      node.data?.isConnected
                        ? "translate-x-5"
                        : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </>
          )}

          {tab === "info" && isExecutionNode && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Protocol Designation
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={node.data?.title || ""}
                  onChange={(e) => onUpdate("title", sanitize(e.target.value))}
                  className="w-full bg-transparent text-[20px] font-black tracking-tight text-white placeholder-[#222] border-b border-[#1e1e1e] focus:outline-none pb-2 transition-colors"
                  style={{ caretColor: accent.primary }}
                  onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Sub-Classification
                </label>
                <input
                  type="text"
                  value={node.data?.subtitle || ""}
                  onChange={(e) =>
                    onUpdate("subtitle", sanitize(e.target.value))
                  }
                  className={fieldInput}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Execution Parameters
                </label>
                <textarea
                  value={node.data?.desc || ""}
                  onChange={(e) => onUpdate("desc", sanitize(e.target.value))}
                  rows={4}
                  className={cn(fieldInput, "resize-none")}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3" /> Hard Deadline
                </label>
                <input
                  type="date"
                  value={node.data?.deadline || ""}
                  onChange={(e) => onUpdate("deadline", e.target.value)}
                  className={cn(
                    fieldInput,
                    "[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40",
                  )}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Priority Status
                </label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup">
                  {STATUSES.map((s) => {
                    const active = node.data?.priorityStatus === s;
                    return (
                      <button
                        key={s}
                        role="radio"
                        aria-checked={active}
                        onClick={() => onUpdate("priorityStatus", s)}
                        className="py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
                        style={
                          active
                            ? {
                                background: accent.bg,
                                borderColor: `${accent.primary}40`,
                                color: accent.primary,
                              }
                            : {
                                borderColor: "#1a1a1a",
                                background: "#0d0d0d",
                                color: "#444",
                              }
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Node Type
                </label>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup">
                  {NODE_TYPES.map((t) => {
                    const active = node.data?.nodeType === t;
                    return (
                      <button
                        key={t}
                        role="radio"
                        aria-checked={active}
                        onClick={() => onUpdate("nodeType", t)}
                        className="py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border"
                        style={
                          active
                            ? {
                                background: accent.bg,
                                borderColor: `${accent.primary}40`,
                                color: accent.primary,
                              }
                            : {
                                borderColor: "#1a1a1a",
                                background: "#0d0d0d",
                                color: "#444",
                              }
                        }
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Mark Complete</p>
                  <p className="text-[9px] text-[#555]">
                    Locks this protocol as executed
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={isCompleted}
                  onClick={() => onUpdate("isCompleted", !isCompleted)}
                  className={cn(
                    "relative w-11 h-6 rounded-full transition-all",
                    isCompleted
                      ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                      : "bg-[#222]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      isCompleted ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </button>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Team Delegation
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={delegateInput}
                    onChange={(e) => setDelegateInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDelegate()}
                    placeholder="@username"
                    className={cn(fieldInput, "flex-1")}
                    onFocus={handleAccentFocus}
                    onBlur={handleAccentBlur}
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      addDelegate();
                    }}
                    className="px-3 bg-white/[0.06] border border-white/[0.08] rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
                {(node.data?.delegates || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {node.data.delegates.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-full text-[9px] text-[#888]"
                      >
                        {d}
                        <button
                          onClick={() =>
                            onUpdate(
                              "delegates",
                              node.data.delegates.filter((_, j) => j !== i),
                            )
                          }
                          className="hover:text-rose-400 transition-colors ml-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── EXECUTION: TASKS ── */}
          {tab === "tasks" && isExecutionNode && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-[#444] uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Sub-Routines{" "}
                  <span className="ml-1 text-[#555]">
                    ({doneTasks}/{totalTasks})
                  </span>
                </label>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    completeAll();
                  }}
                  disabled={isCompleted}
                  className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-25 transition-colors border bg-emerald-500/8 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15"
                >
                  Complete All
                </button>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] p-3.5 rounded-xl group hover:border-[#2a2a2a] transition-all"
                  >
                    <button
                      onClick={() => onSubtaskToggle(task.id)}
                      role="checkbox"
                      aria-checked={task.completed}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: task.completed ? accent.bg : "transparent",
                        borderColor: task.completed
                          ? accent.primary
                          : "#2a2a2a",
                      }}
                    >
                      {task.completed && (
                        <Check
                          className="w-3 h-3"
                          style={{ color: accent.primary }}
                        />
                      )}
                    </button>
                    <input
                      type="text"
                      value={task.text}
                      onChange={(e) => updateTaskText(task.id, e.target.value)}
                      placeholder="Define sub-routine…"
                      className={cn(
                        "flex-1 bg-transparent border-none outline-none text-sm transition-colors",
                        task.completed
                          ? "text-[#444] line-through"
                          : "text-white",
                      )}
                    />
                    <span className="text-[8px] font-black text-amber-500/40 flex items-center gap-0.5 shrink-0">
                      <Zap className="w-2 h-2" />
                      {task.points || 10}
                    </span>
                    <button
                      onClick={() => removeTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-rose-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  addTask();
                }}
                className="w-full py-3 border border-dashed border-[#1e1e1e] rounded-xl text-[#555] text-xs font-bold uppercase tracking-widest hover:border-[#333] hover:text-white transition-all flex items-center justify-center gap-2 bg-[#0d0d0d]"
              >
                <Plus className="w-3.5 h-3.5" /> Add Sub-Routine
              </button>

              <hr className="border-[#1a1a1a] my-6" />

              {/* ── EXECUTION INITIATION ── */}
              {computedState === NODE_STATES.ACTIVE && (
                <div className="mb-5">
                  <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500" /> Initiate
                    Execution
                  </label>
                  <p className="text-[10px] text-[#555] mb-3 leading-relaxed">
                    Starting execution locks this node's minimum time
                    requirement. The timer begins server-side and cannot be
                    manipulated.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const { getFunctions, httpsCallable } =
                          await import("firebase/functions");
                        const { app } = await import("../../firebase");
                        const beginFn = httpsCallable(
                          getFunctions(app),
                          "beginNodeExecution",
                        );
                        await beginFn({ nodeId: node.id });
                        addToast?.(
                          "Execution initiated. Timer is running.",
                          "green",
                        );
                      } catch (err) {
                        addToast?.(
                          err.message || "Failed to begin execution.",
                          "red",
                        );
                      }
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  >
                    <Zap className="w-3.5 h-3.5" /> Begin Execution
                  </button>
                </div>
              )}

              {/* ── VERIFICATION: PROOF OF WORK ── */}
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-500" /> Proof of Work
                  Validation
                </label>
                <input
                  type="text"
                  value={payloadData}
                  onChange={(e) => setPayloadData(e.target.value)}
                  placeholder="Paste repository or asset link..."
                  disabled={isVerifying || isLocked || isBackoff}
                  className={cn(
                    fieldInput,
                    "mb-3 disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  onFocus={handleAccentFocus}
                  onBlur={handleAccentBlur}
                />
                <button
                  onClick={handleSubmission}
                  disabled={
                    isVerifying ||
                    isLocked ||
                    isBackoff ||
                    payloadData.length < 5
                  }
                  className={cn(
                    "w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center disabled:cursor-not-allowed",
                    isVerifying
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse"
                      : isBackoff
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                  )}
                >
                  {isVerifying
                    ? "Verifying via AI..."
                    : isBackoff
                      ? "System Locked"
                      : "Submit Proof of Work"}
                </button>

                {isBackoff && (
                  <p className="text-rose-500 text-[10px] text-center mt-3 font-mono bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                    Penalty active. Review constraints & await timer bypass.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── SHARED: TAGS ── */}
          {tab === "tags" && (
            <>
              <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
                Taxonomy Classification
              </p>
              <div className="flex flex-wrap gap-2" role="group">
                {NODE_TAGS.map((tag) => {
                  const active = (node.data?.tags || []).includes(tag);
                  return (
                    <button
                      key={tag}
                      role="checkbox"
                      aria-checked={active}
                      onClick={() => {
                        const curr = node.data?.tags || [];
                        onUpdate(
                          "tags",
                          active
                            ? curr.filter((t) => t !== tag)
                            : [...curr, tag],
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border"
                      style={
                        active
                          ? {
                              background: accent.bg,
                              borderColor: `${accent.primary}40`,
                              color: accent.primary,
                            }
                          : {
                              background: "#0d0d0d",
                              borderColor: "#1a1a1a",
                              color: "#555",
                            }
                      }
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── SHARED: COLOR ── */}
          {tab === "color" && (
            <>
              <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
                Node Accent Theme
              </p>
              <div className="grid grid-cols-4 gap-3" role="radiogroup">
                {Object.entries(NODE_ACCENT_PALETTE).map(([key, val]) => {
                  const isActive = node.data?.accentColor === key;
                  return (
                    <button
                      key={key}
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => onUpdate("accentColor", key)}
                      className="relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all p-2"
                      style={{
                        background: val.bg,
                        borderColor: isActive ? val.primary : "transparent",
                        boxShadow: isActive ? `0 0 20px ${val.glow}` : "none",
                        opacity: isActive ? 1 : 0.5,
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: val.primary }}
                      />
                      <span
                        className="text-[8px] font-black uppercase tracking-widest"
                        style={{ color: val.primary }}
                      >
                        {key}
                      </span>
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full bg-white/20 flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── EXECUTION: JOURNAL ── */}
          {tab === "journal" && isExecutionNode && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Execution Reality Log
                </label>
                <textarea
                  value={node.data?.journalEntry || ""}
                  onChange={(e) =>
                    onUpdate("journalEntry", sanitize(e.target.value))
                  }
                  placeholder="Document your execution reality. What happened? What blocked you?"
                  rows={7}
                  className={cn(fieldInput, "resize-none custom-scrollbar")}
                  onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                  onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Execution State
                </label>
                <div className="flex gap-2 flex-wrap" role="radiogroup">
                  {MOODS.map((mood) => (
                    <button
                      key={mood}
                      role="radio"
                      aria-checked={node.data?.mood === mood}
                      onClick={() =>
                        onUpdate("mood", node.data?.mood === mood ? "" : mood)
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                        node.data?.mood === mood
                          ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                          : "bg-[#0d0d0d] border-[#1a1a1a] text-[#666] hover:text-white",
                      )}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-[#1a1a1a] p-5 space-y-3 shrink-0 bg-[#050505]">
          {pendingScoreDelta !== 0 && (
            <div
              className={cn(
                "px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border",
                pendingScoreDelta > 0
                  ? "bg-emerald-500/6 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/6 text-rose-400 border-rose-500/20",
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              {pendingScoreDelta > 0 ? "+" : ""}
              {pendingScoreDelta} pts pending cloud save
            </div>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete?.();
            }}
            className="w-full py-3 bg-rose-500/6 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-500/12 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Protocol
          </button>
        </div>
      </motion.div>
    );
  },
);

NodeEditPanel.displayName = "NodeEditPanel";
