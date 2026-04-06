/**
 * @fileoverview Discotive Roadmap — Journal Modal
 * Firestore-backed daily execution log with inline calendar.
 * Fixed: dynamic firebase imports replaced with static (already imported at top of file).
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "../../lib/cn";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MOODS = [
  "⚡ In flow",
  "🔥 On fire",
  "😤 Grinding",
  "🧊 Blocked",
  "💡 Clarity",
  "🎯 Locked in",
];
const MAX_CHARS = 1000;
const toDateStr = (d) => d.toISOString().split("T")[0];

export const JournalModal = ({ userId, onClose, addToast }) => {
  const today = new Date();
  const [selDate, setSelDate] = useState(today);
  const [calMonth, setCalMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [entry, setEntry] = useState("");
  const [mood, setMood] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedDates, setSavedDates] = useState(new Set());
  const closeRef = useRef(null);

  // Focus close button on mount
  useEffect(() => {
    setTimeout(() => closeRef.current?.focus(), 50);
  }, []);

  // Load entry for selected date
  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setEntry("");
    setMood("");
    const load = async () => {
      try {
        const snap = await getDoc(
          doc(db, "users", userId, "journal", toDateStr(selDate)),
        );
        if (snap.exists()) {
          setEntry(snap.data().entry || "");
          setMood(snap.data().mood || "");
        }
      } catch (e) {
        console.warn("[Journal] Load failed:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selDate, userId]);

  // Load saved date dots
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "users", userId, "journal"));
        setSavedDates(new Set(snap.docs.map((d) => d.id)));
      } catch (_) {}
    };
    load();
  }, [userId]);

  const handleSave = async () => {
    if (!userId || !entry.trim()) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", userId, "journal", toDateStr(selDate)), {
        entry: entry.trim(),
        mood,
        date: toDateStr(selDate),
        savedAt: new Date().toISOString(),
      });
      setSavedDates((prev) => new Set([...prev, toDateStr(selDate)]));
      addToast?.("Journal entry saved.", "green");
    } catch (e) {
      addToast?.("Save failed. Try again.", "red");
    } finally {
      setIsSaving(false);
    }
  };

  // Calendar render
  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInM = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInM }, (_, i) => i + 1),
  ];

  const isSelected = (d) =>
    d && new Date(year, month, d).toDateString() === selDate.toDateString();
  const isToday = (d) =>
    d && new Date(year, month, d).toDateString() === today.toDateString();
  const hasEntry = (d) =>
    d && savedDates.has(toDateStr(new Date(year, month, d)));
  const isFuture = (d) => d && new Date(year, month, d) > today;
  const canGoNext =
    new Date(year, month + 1, 1) <=
    new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-end md:pr-6 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="Daily execution journal"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.97 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] max-h-[90vh] bg-[#060606] border border-[#1e1e1e] rounded-[2rem] shadow-[0_60px_120px_rgba(0,0,0,0.95)] flex flex-col pointer-events-auto overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <h2 className="text-base font-black text-white">
              Execution Journal
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close journal"
            className="w-9 h-9 bg-[#0d0d0d] border border-[#1e1e1e] rounded-full flex items-center justify-center text-[#666] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Calendar */}
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalMonth(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="w-8 h-8 rounded-xl bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-black text-white uppercase tracking-widest">
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={() =>
                  canGoNext && setCalMonth(new Date(year, month + 1, 1))
                }
                disabled={!canGoNext}
                aria-label="Next month"
                className="w-8 h-8 rounded-xl bg-[#111] border border-[#1a1a1a] text-[#666] hover:text-white flex items-center justify-center transition-colors disabled:opacity-30 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1" role="row">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[8px] font-black text-[#444] uppercase py-1"
                  aria-label={d}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div
              className="grid grid-cols-7 gap-0.5"
              role="grid"
              aria-label="Calendar"
            >
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const fut = isFuture(d);
                const sel = isSelected(d);
                const tod = isToday(d);
                const has = hasEntry(d);
                return (
                  <button
                    key={i}
                    role="gridcell"
                    aria-label={`${MONTHS[month]} ${d}, ${year}${has ? " (has entry)" : ""}${fut ? " (future)" : ""}`}
                    aria-selected={sel}
                    aria-disabled={fut}
                    onClick={() => !fut && setSelDate(new Date(year, month, d))}
                    disabled={fut}
                    className={cn(
                      "relative aspect-square flex items-center justify-center rounded-xl text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none",
                      fut ? "text-[#222] cursor-not-allowed" : "cursor-pointer",
                      sel
                        ? "bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                        : tod
                          ? "bg-[#1a1a1a] border border-violet-500/30 text-violet-400"
                          : !fut
                            ? "hover:bg-[#1a1a1a] text-[#888] hover:text-white"
                            : "",
                    )}
                  >
                    {d}
                    {has && !sel && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date heading */}
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
              {selDate.toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            {hasEntry(selDate.getDate()) && !isLoading && (
              <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-400">
                <Check className="w-2.5 h-2.5" /> Saved
              </div>
            )}
          </div>

          {/* Entry textarea */}
          <div className="relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl">
                <Loader2 className="w-5 h-5 text-[#333] animate-spin" />
              </div>
            ) : (
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Document your execution reality. What happened? What blocked you? What did you learn? What's tomorrow's target?"
                rows={6}
                aria-label="Journal entry"
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 text-sm text-white placeholder-[#333] resize-none focus:outline-none transition-colors custom-scrollbar"
                onFocus={(e) => (e.target.style.borderColor = "#8b5cf6")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
              />
            )}
            <div className="flex justify-end mt-1.5">
              <span
                className={cn(
                  "text-[9px] font-mono font-bold",
                  entry.length >= MAX_CHARS - 50
                    ? "text-amber-500"
                    : "text-[#333]",
                )}
              >
                {entry.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {/* Mood selector */}
          <div>
            <label className="block text-[9px] font-bold text-[#444] uppercase tracking-widest mb-2">
              Execution State
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Execution mood"
            >
              {MOODS.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mood === m}
                  onClick={() => setMood(mood === m ? "" : m)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none",
                    mood === m
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-400"
                      : "bg-[#0d0d0d] border-[#1a1a1a] text-[#666] hover:text-white",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1a1a1a] bg-[#050505] shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving || !entry.trim()}
            aria-label="Save journal entry"
            className="w-full py-3.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.25)] focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:outline-none"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isSaving ? "Saving…" : "Commit Entry"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
