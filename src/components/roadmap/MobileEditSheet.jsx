/**
 * @fileoverview Discotive Roadmap — Mobile Edit Bottom Sheet
 *
 * Thumb-optimised portal sheet for node editing on mobile.
 * Identical feature parity with NodeEditPanel but designed for touch:
 * - Rendered as createPortal directly into document.body
 * - Spring physics drag-to-dismiss
 * - Large tap targets (min 44px)
 * - Focus trap for accessibility
 */

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  X,
  Type,
  Activity,
  Tag,
  Palette,
  BookOpen,
  Trash2,
  Plus,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { NODE_ACCENT_PALETTE, NODE_TAGS } from "../../lib/roadmap/constants.js";
import { sanitize } from "../../lib/roadmap/sanitize.js";

const TABS = [
  { id: "info", label: "Info", icon: Type },
  { id: "tasks", label: "Tasks", icon: Activity },
  { id: "tags", label: "Tags", icon: Tag },
  { id: "color", label: "Color", icon: Palette },
];

const MOODS = [
  "⚡ In flow",
  "🔥 On fire",
  "😤 Grinding",
  "🧊 Blocked",
  "💡 Clarity",
  "🎯 Locked in",
];

export const MobileEditSheet = ({
  activeNode,
  onUpdate,
  onClose,
  onDelete,
  pendingScoreDelta,
  onSubtaskToggle,
}) => {
  const [tab, setTab] = useState("info");
  const closeRef = useRef(null);

  // Focus close button on open (accessibility)
  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 100);
  }, []);

  // Escape to close
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!activeNode) return null;

  const accent = NODE_ACCENT_PALETTE[activeNode.data?.accentColor || "amber"];
  const tasks = activeNode.data?.tasks || [];
  const doneTasks = tasks.filter((t) => t.completed).length;

  const addTask = () => {
    onUpdate("tasks", [
      ...tasks,
      { id: crypto.randomUUID(), text: "", completed: false, points: 10 },
    ]);
  };

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[200]"
        aria-hidden="true"
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Edit: ${activeNode.data?.title || "node"}`}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-[210] bg-[#080808] border-t border-[#1e1e1e] rounded-t-[2rem] flex flex-col shadow-[0_-30px_60px_rgba(0,0,0,0.8)]"
        style={{ maxHeight: "85vh" }}
      >
        {/* Drag indicator */}
        <div
          className="flex justify-center pt-3 pb-1 shrink-0"
          aria-hidden="true"
        >
          <div className="w-10 h-1 bg-[#333] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-[#1a1a1a] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Settings2
              className="w-4 h-4 shrink-0"
              style={{ color: accent.primary }}
            />
            <h2 className="text-sm font-black text-white tracking-tight truncate max-w-[200px]">
              {activeNode.data?.title || "Untitled"}
            </h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close panel"
              className="w-9 h-9 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#666] hover:text-white focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="h-0.5 bg-[#1a1a1a] shrink-0">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${Math.round((doneTasks / tasks.length) * 100)}%`,
                background: accent.primary,
              }}
            />
          </div>
        )}

        {/* Tab bar */}
        <div
          className="flex border-b border-[#1a1a1a] shrink-0 overflow-x-auto"
          role="tablist"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 -mb-px min-h-[44px] focus-visible:outline-none",
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
                <Icon className="w-4 h-4 shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* INFO TAB */}
          {tab === "info" && (
            <>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={activeNode.data?.title || ""}
                  onChange={(e) => onUpdate("title", sanitize(e.target.value))}
                  aria-label="Node title"
                  className="w-full bg-transparent text-xl font-black text-white placeholder-[#222] border-b border-[#222] focus:outline-none pb-2 transition-colors"
                  style={{ caretColor: accent.primary }}
                  onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = "#222")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Sub-Classification
                </label>
                <input
                  type="text"
                  value={activeNode.data?.subtitle || ""}
                  onChange={(e) =>
                    onUpdate("subtitle", sanitize(e.target.value))
                  }
                  aria-label="Node subtitle"
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none min-h-[44px]"
                  onFocus={(e) => (e.target.style.borderColor = accent.primary)}
                  onBlur={(e) => (e.target.style.borderColor = "#1a1a1a")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  value={activeNode.data?.deadline || ""}
                  onChange={(e) => onUpdate("deadline", e.target.value)}
                  aria-label="Node deadline"
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none min-h-[44px] [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-40"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-3 gap-2" role="radiogroup">
                  {["READY", "FUTURE", "BLOCKED"].map((s) => {
                    const active = activeNode.data?.priorityStatus === s;
                    return (
                      <button
                        key={s}
                        role="radio"
                        aria-checked={active}
                        onClick={() => onUpdate("priorityStatus", s)}
                        className="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                        style={
                          active
                            ? {
                                background: accent.bg,
                                borderColor: `${accent.primary}40`,
                                color: accent.primary,
                              }
                            : {
                                borderColor: "#1a1a1a",
                                background: "#111",
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
              {/* Complete toggle */}
              <div className="flex items-center justify-between p-4 bg-[#111] border border-[#1a1a1a] rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">Mark Complete</p>
                  <p className="text-[9px] text-[#555] mt-0.5">
                    Locks protocol as executed
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={!!activeNode.data?.isCompleted}
                  onClick={() =>
                    onUpdate("isCompleted", !activeNode.data?.isCompleted)
                  }
                  className={cn(
                    "relative w-12 h-7 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none",
                    activeNode.data?.isCompleted
                      ? "bg-emerald-500"
                      : "bg-[#333]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                      activeNode.data?.isCompleted
                        ? "translate-x-5"
                        : "translate-x-0",
                    )}
                  />
                </button>
              </div>
            </>
          )}

          {/* TASKS TAB */}
          {tab === "tasks" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
                  Sub-Routines ({doneTasks}/{tasks.length})
                </p>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 bg-[#111] border border-[#1a1a1a] p-3.5 rounded-xl"
                  >
                    <button
                      onClick={() => onSubtaskToggle(task.id)}
                      role="checkbox"
                      aria-checked={task.completed}
                      aria-label={
                        task.completed ? "Mark incomplete" : "Mark complete"
                      }
                      className="w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all min-w-[24px] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                      style={{
                        background: task.completed ? accent.bg : "transparent",
                        borderColor: task.completed ? accent.primary : "#333",
                      }}
                    >
                      {task.completed && (
                        <Check
                          className="w-3.5 h-3.5"
                          style={{ color: accent.primary }}
                        />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        task.completed
                          ? "line-through text-[#444]"
                          : "text-white",
                      )}
                    >
                      {task.text || (
                        <span className="text-[#444] italic">Empty task</span>
                      )}
                    </span>
                    <span className="text-[8px] font-black text-amber-500/40 flex items-center gap-0.5 shrink-0">
                      <Zap className="w-2.5 h-2.5" />
                      {task.points || 10}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={addTask}
                className="w-full py-4 border border-dashed border-[#222] rounded-xl text-[#555] text-sm font-bold flex items-center justify-center gap-2 hover:border-[#333] hover:text-white transition-all min-h-[44px]"
              >
                <Plus className="w-4 h-4" /> Add Sub-Routine
              </button>
            </>
          )}

          {/* TAGS TAB */}
          {tab === "tags" && (
            <div
              className="flex flex-wrap gap-2.5"
              role="group"
              aria-label="Tags"
            >
              {NODE_TAGS.map((tag) => {
                const active = (activeNode.data?.tags || []).includes(tag);
                return (
                  <button
                    key={tag}
                    role="checkbox"
                    aria-checked={active}
                    onClick={() => {
                      const curr = activeNode.data?.tags || [];
                      onUpdate(
                        "tags",
                        active ? curr.filter((t) => t !== tag) : [...curr, tag],
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border min-h-[44px] focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
                    style={
                      active
                        ? {
                            background: accent.bg,
                            borderColor: `${accent.primary}40`,
                            color: accent.primary,
                          }
                        : {
                            background: "#111",
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
          )}

          {/* COLOR TAB */}
          {tab === "color" && (
            <div
              className="grid grid-cols-4 gap-3"
              role="radiogroup"
              aria-label="Accent color"
            >
              {Object.entries(NODE_ACCENT_PALETTE).map(([key, val]) => {
                const isActive = activeNode.data?.accentColor === key;
                return (
                  <button
                    key={key}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onUpdate("accentColor", key)}
                    className="relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 p-2 transition-all min-h-[60px] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
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
                      className="text-[7px] font-black uppercase tracking-widest"
                      style={{ color: val.primary }}
                    >
                      {key}
                    </span>
                    {isActive && (
                      <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingScoreDelta !== 0 && (
          <div
            className={cn(
              "mx-5 mb-4 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 border",
              pendingScoreDelta > 0
                ? "bg-emerald-500/8 text-emerald-400 border-emerald-500/20"
                : "bg-rose-500/8 text-rose-400 border-rose-500/20",
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            {pendingScoreDelta > 0 ? "+" : ""}
            {pendingScoreDelta} pts pending save
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};
