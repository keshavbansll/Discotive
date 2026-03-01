import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Book,
  Maximize2,
  Minimize2,
  X,
  Target,
  Code,
  Briefcase,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const HorizontalTimeline = () => {
  const [view, setView] = useState("days");
  const [baseDate, setBaseDate] = useState(new Date());
  const [slideDirection, setSlideDirection] = useState(1);

  // Diary State
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryExpanded, setDiaryExpanded] = useState(false);
  const [diaryCurrentDate, setDiaryCurrentDate] = useState(new Date());
  const [diaryText, setDiaryText] = useState(
    "## Today's Execution Plan\n\n1. Review React architecture.\n2. Apply for RG Consultancy.\n3. Complete MVP UI.",
  );

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

  const handleDiaryPrev = () => {
    const d = new Date(diaryCurrentDate);
    d.setDate(d.getDate() - 1);
    setDiaryCurrentDate(d);
  };

  const handleDiaryNext = () => {
    const d = new Date(diaryCurrentDate);
    d.setDate(d.getDate() + 1);
    setDiaryCurrentDate(d);
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

  const timelineTasks = useMemo(() => {
    const y = realToday.getFullYear();
    const m = realToday.getMonth();
    const d = realToday.getDate();
    return [
      {
        id: 1,
        title: "Advanced React Patterns",
        icon: Code,
        color: "#6366f1",
        start: new Date(y, m, Math.max(1, d - 10)),
        end: new Date(y, m, d - 2),
        row: 0,
      },
      {
        id: 2,
        title: "Build Discotive MVP",
        icon: Target,
        color: "#3b82f6",
        start: new Date(y, m, d - 1),
        end: new Date(y, m, d + 8),
        row: 1,
        dependsOn: 1,
      },
      {
        id: 3,
        title: "Update Resume",
        icon: Briefcase,
        color: "#f43f5e",
        start: new Date(y, m, Math.max(1, d - 5)),
        end: new Date(y, m, d - 1),
        row: 2,
      },
      {
        id: 4,
        title: "Apply for Internships",
        icon: Briefcase,
        color: "#f59e0b",
        start: new Date(y, m, d),
        end: new Date(y, m, d + 12),
        row: 3,
        dependsOn: 3,
      },
    ];
  }, []);

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
              "flex-1 min-w-[40px] border-r border-slate-200 dark:border-slate-800/50 flex flex-col items-center justify-center relative transition-colors",
              isPast ? "bg-slate-50/50 dark:bg-slate-900/40" : "",
              isToday
                ? "bg-rose-50/30 dark:bg-rose-900/10 border-x-rose-200 dark:border-x-rose-900/50"
                : "",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <span className="text-[10px] text-slate-400 font-medium uppercase">
              {d.toLocaleDateString("en-US", { weekday: "narrow" })}
            </span>
            <span
              className={cn(
                "text-xs font-bold",
                isToday
                  ? "text-rose-600 dark:text-rose-500"
                  : "text-slate-600 dark:text-slate-300",
              )}
            >
              {i}
            </span>
            {isToday && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" />
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
              "flex-1 min-w-[100px] border-r border-slate-200 dark:border-slate-800/50 flex flex-col items-center justify-center relative transition-colors",
              isCurrentWeek ? "bg-rose-50/30 dark:bg-rose-900/10" : "",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <span
              className={cn(
                "text-sm font-bold",
                isCurrentWeek
                  ? "text-rose-600 dark:text-rose-500"
                  : "text-slate-700 dark:text-slate-300",
              )}
            >
              Week {weekNum}
            </span>
            <span className="text-xs text-slate-400">
              ({currentDay}-{endDay})
            </span>
            {isCurrentWeek && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" />
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
              "flex-1 min-w-[80px] border-r border-slate-200 dark:border-slate-800/50 flex items-center justify-center relative transition-colors",
              isCurrentMonth ? "bg-rose-50/30 dark:bg-rose-900/10" : "",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <span
              className={cn(
                "text-xs font-bold uppercase",
                isCurrentMonth
                  ? "text-rose-600 dark:text-rose-500"
                  : "text-slate-600 dark:text-slate-300",
              )}
            >
              {monthNames[i]}
            </span>
            {isCurrentMonth && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10" />
            )}
          </div>,
        );
      }
    }
    return columns;
  };

  const getTaskStyle = (task) => {
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
      top: `${task.row * 52 + 10}px`,
      backgroundColor: task.color,
    };
  };

  return (
    <div className="bg-white dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden">
      {/* HEADER TOOLBAR */}
      <div className="p-4 md:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 z-20 bg-white dark:bg-slate-900 relative">
        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Career Execution
            </h3>
          </div>
          <button
            onClick={() => setDiaryOpen(true)}
            className="md:hidden p-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg"
          >
            <Book className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[100px] text-center">
              {view === "months"
                ? baseDate.getFullYear()
                : baseDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
            </span>
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-500 dark:text-slate-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0">
            {["days", "weeks", "months"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-md capitalize transition-all",
                  view === v
                    ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button className="hidden md:flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add Goal
          </button>
          <button
            onClick={() => setDiaryOpen(true)}
            className="hidden md:flex p-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors shrink-0"
          >
            <Book className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* GANTT WORKSPACE */}
      <div className="flex flex-1 overflow-hidden min-h-[350px] relative">
        <div className="hidden md:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 z-20">
          <div className="h-12 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 shrink-0 bg-white dark:bg-slate-900">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Milestones & Tasks
            </span>
          </div>
          <div className="flex-1 relative pt-[10px]">
            {timelineTasks.map((task) => (
              <div
                key={task.id}
                className="absolute w-full h-10 px-4 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                style={{ top: `${task.row * 52}px` }}
              >
                <task.icon className="w-4 h-4" style={{ color: task.color }} />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>

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
              <div className="flex h-12 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                {renderGrid()}
              </div>
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
                <div className="absolute inset-0 z-20">
                  {timelineTasks.map((task) => (
                    <div
                      key={task.id}
                      className="absolute h-8 rounded-md shadow-md flex items-center px-3 cursor-pointer group hover:brightness-110 transition-all border border-black/10 dark:border-white/10"
                      style={getTaskStyle(task)}
                    >
                      <span className="text-xs font-bold text-black dark:text-white truncate z-10 drop-shadow-sm">
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

      {/* DIARY OVERLAY COMPONENT (Perfectly Centered Modal when expanded) */}
      <AnimatePresence>
        {diaryOpen && (
          <div
            className={cn(
              "z-[100]",
              diaryExpanded
                ? "fixed inset-0 flex items-center justify-center p-4 sm:p-6"
                : "absolute top-16 right-4",
            )}
          >
            {/* Backdrop for Expanded Mode */}
            {diaryExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
                onClick={() => setDiaryOpen(false)}
              />
            )}

            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={cn(
                "bg-amber-50 dark:bg-[#1a1614] border border-amber-200 dark:border-amber-900/50 shadow-2xl overflow-hidden flex flex-col relative z-10",
                diaryExpanded
                  ? "w-full max-w-4xl h-[85vh] rounded-2xl"
                  : "w-80 h-[400px] rounded-xl",
              )}
            >
              <div className="flex items-center justify-between p-3 border-b border-amber-200 dark:border-amber-900/50 bg-amber-100/50 dark:bg-[#231d1a]">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500 font-bold text-sm">
                  <Book className="w-4 h-4" />
                  Journal
                </div>

                {/* Diary Date Switcher */}
                <div className="flex items-center gap-1 bg-amber-200/50 dark:bg-amber-900/30 rounded-md px-1 py-0.5">
                  <button
                    onClick={handleDiaryPrev}
                    className="p-1 hover:bg-amber-300 dark:hover:bg-amber-800/50 rounded text-amber-700 dark:text-amber-500 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-400 w-20 text-center">
                    {diaryCurrentDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    onClick={handleDiaryNext}
                    className="p-1 hover:bg-amber-300 dark:hover:bg-amber-800/50 rounded text-amber-700 dark:text-amber-500 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setDiaryExpanded(!diaryExpanded)}
                    className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded text-amber-700 dark:text-amber-600 transition-colors"
                  >
                    {diaryExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setDiaryOpen(false)}
                    className="p-1.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded text-amber-700 dark:text-amber-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                className="flex-1 w-full p-5 bg-transparent outline-none resize-none text-slate-800 dark:text-amber-100/90 font-medium text-sm leading-relaxed custom-scrollbar"
                placeholder="Write your daily logs, thoughts, or milestone notes here..."
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HorizontalTimeline;
