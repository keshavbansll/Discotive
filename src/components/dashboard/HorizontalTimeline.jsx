/**
 * @fileoverview Horizontal Timeline & Execution Gantt Chart
 * @module Dashboard/HorizontalTimeline
 * @description
 * Visualizes the user's temporal execution data.
 * Strictly adheres to the dark-mode OS aesthetic. No hardcoded mock data.
 * Gracefully handles empty telemetry states with a MAANG-grade UI fallback.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TerminalSquare,
  Activity,
} from "lucide-react";

import { cn } from "../../lib/cn"; // Adjust relative path

const HorizontalTimeline = ({ events = [] }) => {
  const [view, setView] = useState("days");
  const [baseDate, setBaseDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState(1);

  const realToday = new Date();
  realToday.setHours(0, 0, 0, 0);

  const handlePrev = () => {
    setSlideDirection(-1);
    const newDate = new Date(baseDate);
    if (view === "months") newDate.setFullYear(newDate.getFullYear() - 1);
    else newDate.setMonth(newDate.getMonth() - 1);
    setBaseDate(newDate);
  };

  const handleNext = () => {
    setSlideDirection(1);
    const newDate = new Date(baseDate);
    if (view === "months") newDate.setFullYear(newDate.getFullYear() + 1);
    else newDate.setMonth(newDate.getMonth() + 1);
    setBaseDate(newDate);
  };

  const { periodStart, periodEnd, totalDays } = useMemo(() => {
    let start, end;
    if (view === "months") {
      start = new Date(baseDate.getFullYear(), 0, 1);
      end = new Date(baseDate.getFullYear(), 11, 31);
    } else {
      start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    }
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return { periodStart: start, periodEnd: end, totalDays: days };
  }, [baseDate, view]);

  // ============================================================================
  // EMPTY STATE FALLBACK (Zero Telemetry)
  // ============================================================================
  if (!events || events.length === 0) {
    return (
      <div className="w-full min-h-[300px] flex flex-col items-center justify-center text-center border border-dashed border-[#333] rounded-xl bg-[#050505] p-8">
        <div className="w-16 h-16 bg-[#111] border border-[#222] rounded-full flex items-center justify-center mb-4 shadow-inner">
          <Activity className="w-6 h-6 text-[#444]" />
        </div>
        <h4 className="text-white font-extrabold tracking-widest uppercase text-xs mb-2">
          Awaiting Chain Activity
        </h4>
        <p className="text-[#666] text-[10px] uppercase tracking-widest leading-relaxed max-w-sm mx-auto">
          No execution nodes found in the current temporal window. Initialize
          your roadmap or deploy assets to populate the timeline matrix.
        </p>
      </div>
    );
  }

  // ============================================================================
  // GRID RENDERING ENGINE
  // ============================================================================
  const renderGrid = () => {
    const columns = [];
    if (view === "days") {
      for (let i = 1; i <= totalDays; i++) {
        const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), i);
        const isPast = d < realToday;
        const isToday = d.getTime() === realToday.getTime();
        columns.push(
          <div
            key={i}
            className={cn(
              "flex-1 min-w-[40px] border-r border-white/5 flex flex-col items-center justify-center relative transition-colors",
              isPast ? "bg-[#000]/40" : "",
              isToday ? "bg-amber-500/10 border-x-amber-500/30" : "",
              "hover:bg-[#111]",
            )}
          >
            <span className="text-[9px] text-[#666] font-bold uppercase tracking-widest">
              {d.toLocaleDateString("en-US", { weekday: "narrow" })}
            </span>
            <span
              className={cn(
                "text-xs font-black",
                isToday ? "text-amber-500" : "text-[#888]",
              )}
            >
              {i}
            </span>
            {isToday && (
              <div className="absolute top-0 bottom-0 w-[1px] bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] z-10" />
            )}
          </div>,
        );
      }
    } else if (view === "weeks") {
      let currentDay = 1;
      let weekNum = 1;
      while (currentDay <= totalDays) {
        const endDay = Math.min(currentDay + 6, totalDays);
        const isCurrentWeek =
          realToday.getDate() >= currentDay &&
          realToday.getDate() <= endDay &&
          realToday.getMonth() === baseDate.getMonth();
        columns.push(
          <div
            key={weekNum}
            className={cn(
              "flex-1 min-w-[100px] border-r border-white/5 flex flex-col items-center justify-center relative transition-colors",
              isCurrentWeek ? "bg-amber-500/10" : "",
              "hover:bg-[#111]",
            )}
          >
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest",
                isCurrentWeek ? "text-amber-500" : "text-[#888]",
              )}
            >
              Week {weekNum}
            </span>
            <span className="text-[10px] text-[#555] font-mono">
              ({currentDay}-{endDay})
            </span>
            {isCurrentWeek && (
              <div className="absolute top-0 bottom-0 w-[1px] bg-amber-500 z-10" />
            )}
          </div>,
        );
        currentDay += 7;
        weekNum++;
      }
    } else if (view === "months") {
      const monthNames = [
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
      for (let i = 0; i < 12; i++) {
        const isCurrentMonth =
          baseDate.getFullYear() === realToday.getFullYear() &&
          i === realToday.getMonth();
        columns.push(
          <div
            key={i}
            className={cn(
              "flex-1 min-w-[80px] border-r border-white/5 flex items-center justify-center relative transition-colors",
              isCurrentMonth ? "bg-amber-500/10" : "",
              "hover:bg-[#111]",
            )}
          >
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isCurrentMonth ? "text-amber-500" : "text-[#888]",
              )}
            >
              {monthNames[i]}
            </span>
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-[1px] bg-amber-500 z-10" />
            )}
          </div>,
        );
      }
    }
    return columns;
  };

  const getTaskStyle = (task) => {
    // Safety check for malformed event data
    if (!task.start || !task.end) return { display: "none" };

    const start = Math.max(task.start.getTime(), periodStart.getTime());
    const end = Math.min(task.end.getTime(), periodEnd.getTime());

    if (start > periodEnd.getTime() || end < periodStart.getTime())
      return { display: "none" };

    const totalMs = periodEnd.getTime() - periodStart.getTime();
    const leftPct = ((start - periodStart.getTime()) / totalMs) * 100;
    const widthPct = ((end - start) / totalMs) * 100;

    return {
      left: `${leftPct}%`,
      width: `${Math.max(widthPct, 2)}%`,
      top: `${(task.row || 0) * 52 + 10}px`,
      backgroundColor: task.color || "#f59e0b",
    };
  };

  // ============================================================================
  // RENDER PIPELINE
  // ============================================================================
  return (
    <div className="bg-[#050505] rounded-2xl border border-[#222] shadow-2xl flex flex-col relative overflow-hidden h-[400px]">
      {/* HEADER TOOLBAR */}
      <div className="p-4 border-b border-[#222] flex flex-col md:flex-row items-center justify-between gap-4 z-20 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#111] border border-[#333] rounded-lg text-[#888]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-white tracking-widest uppercase">
            Temporal Map
          </h3>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar">
          {/* Date Navigator */}
          <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-[#222] rounded-md transition-colors text-[#888] hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-bold text-white min-w-[100px] text-center uppercase tracking-widest font-mono">
              {view === "months"
                ? baseDate.getFullYear()
                : baseDate.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-[#222] rounded-md transition-colors text-[#888] hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex bg-[#111] border border-[#222] p-1 rounded-lg shrink-0">
            {["days", "weeks", "months"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-bold rounded-md uppercase tracking-widest transition-all",
                  view === v
                    ? "bg-[#222] text-white shadow-inner border border-[#333]"
                    : "text-[#666] hover:text-white",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GANTT WORKSPACE */}
      <div className="flex flex-1 overflow-hidden relative bg-[#030303]">
        {/* Left Sidebar (Task Names) */}
        <div className="hidden md:flex flex-col w-64 border-r border-[#222] bg-[#050505] z-20">
          <div className="h-12 border-b border-[#222] flex items-center px-4 shrink-0 bg-[#0a0a0a]">
            <span className="text-[9px] font-bold text-[#666] uppercase tracking-[0.2em]">
              Execution Nodes
            </span>
          </div>
          <div className="flex-1 relative pt-[10px]">
            {events.map((task) => {
              const Icon = task.icon || TerminalSquare;
              return (
                <div
                  key={task.id}
                  className="absolute w-full h-10 px-4 flex items-center gap-3 hover:bg-[#111] border-l-2 border-transparent hover:border-amber-500 cursor-pointer transition-all"
                  style={{ top: `${(task.row || 0) * 52}px` }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: task.color || "#888" }}
                  />
                  <span className="text-xs font-bold text-[#ccc] truncate">
                    {task.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrolling Timeline Area */}
        <div className="flex-1 overflow-x-auto relative hide-scrollbar">
          <AnimatePresence
            mode="popLayout"
            initial={false}
            custom={slideDirection}
          >
            <motion.div
              key={baseDate.toISOString() + view}
              custom={slideDirection}
              initial={{ x: slideDirection > 0 ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: slideDirection > 0 ? -300 : 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              className="min-w-full h-full absolute inset-0 flex flex-col"
            >
              {/* Timeline Header Grid */}
              <div className="flex h-12 border-b border-[#222] shrink-0 bg-[#0a0a0a]">
                {renderGrid()}
              </div>

              {/* Timeline Body Grid & Data Nodes */}
              <div className="flex-1 relative">
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  {renderGrid().map((col, i) => (
                    <div
                      key={i}
                      className={col.props.className
                        .replace("justify-center", "")
                        .replace("items-center", "")
                        .replace(/hover:[^\s]+/g, "")}
                    ></div>
                  ))}
                </div>

                {/* Data Node Rendering */}
                <div className="absolute inset-0 z-20">
                  {events.map((task) => (
                    <div
                      key={task.id}
                      className="absolute h-8 rounded-lg shadow-lg flex items-center px-3 cursor-pointer group hover:brightness-125 transition-all border border-white/20"
                      style={getTaskStyle(task)}
                    >
                      <span className="text-[10px] font-extrabold text-white truncate z-10 tracking-widest uppercase shadow-black drop-shadow-md">
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default HorizontalTimeline;
