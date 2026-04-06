import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  Sparkles,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { createPortal } from "react-dom";

const SetupSequence = React.memo(({ onComplete }) => {
  const [taskIndex, setTaskIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("tasks"); // 'tasks', 'bonus', 'done'
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const tasks = useMemo(
    () => [
      "Initializing command center",
      "Deploying execution timeline",
      "Calibrating leaderboard",
      "Securing asset vault",
      "Establishing network hub",
      "Building operator profile",
    ],
    [],
  );

  const animateScore = useCallback((start, end, durationStr = 30) => {
    let current = start;
    const interval = setInterval(() => {
      current += 1;
      setScore(current);
      if (current >= end) clearInterval(interval);
    }, durationStr);
  }, []);

  useEffect(() => {
    if (phase !== "tasks") return;
    if (taskIndex < tasks.length) {
      const timer = setTimeout(
        () => {
          if (taskIndex === 0) animateScore(0, 20, 40);
          setTaskIndex((prev) => prev + 1);
        },
        taskIndex === 0 ? 2000 : 1200,
      );
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase("bonus"), 500);
      return () => clearTimeout(timer);
    }
  }, [taskIndex, phase, tasks.length, animateScore]);

  useEffect(() => {
    if (phase === "bonus") {
      const timer1 = setTimeout(() => {
        animateScore(20, 70, 30);
        const timer2 = setTimeout(() => {
          setPhase("done");
        }, 2500);
        return () => clearTimeout(timer2);
      }, 1500);
      return () => clearTimeout(timer1);
    }
  }, [phase, animateScore]);

  useEffect(() => {
    if (phase === "done") onComplete();
  }, [phase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-[#030303] flex flex-col items-center justify-center p-8 text-white selection:bg-white selection:text-black"
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-12 left-1/2 -translate-x-1/2 text-center"
      >
        <h1 className="text-xl md:text-2xl font-extrabold tracking-[0.3em] uppercase text-[#888]">
          Welcome to Discotive
        </h1>
      </motion.div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        <div className="space-y-6">
          {tasks.map((task, i) => {
            const isPending = i > taskIndex;
            const isActive = i === taskIndex && phase === "tasks";
            const isDone = i < taskIndex || phase !== "tasks";

            if (isPending) return null;

            return (
              <motion.div
                key={task}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 text-sm md:text-base font-bold tracking-wide ${isDone ? "text-[#888]" : "text-white"}`}
              >
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  {isActive ? (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <span>{task}...</span>
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-col items-center md:items-end justify-center border-t md:border-t-0 md:border-l border-[#222] pt-12 md:pt-0 md:pl-12 h-64">
          <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4">
            Baseline Score
          </p>
          <div className="relative flex items-center justify-center">
            <motion.span
              className={`text-8xl md:text-9xl font-black font-mono tracking-tighter transition-colors duration-500 ${phase === "bonus" ? "text-amber-500 drop-shadow-[0_0_40px_rgba(245,158,11,0.5)]" : "text-white"}`}
            >
              {score}
            </motion.span>
            <AnimatePresence>
              {phase === "bonus" && score === 20 && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.5 }}
                  animate={{ opacity: 1, y: -60, scale: 1 }}
                  exit={{ opacity: 0, y: -100 }}
                  className="absolute top-0 right-0 md:-right-12 text-3xl font-extrabold text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]"
                >
                  +50
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            {phase === "bonus" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-extrabold text-amber-500 uppercase tracking-widest">
                  Discotive Initialization Bonus
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {createPortal(
        <div className="fixed bottom-5 left-4 right-4 md:left-6 md:right-auto z-[9999] flex flex-col gap-2 pointer-events-none">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -16, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 260 }}
                className={`px-4 py-3 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center gap-3 border text-xs font-bold tracking-wide pointer-events-auto max-w-[320px] ${
                  t.type === "green"
                    ? "bg-[#041f10] border-emerald-500/25 text-emerald-400"
                    : t.type === "red"
                      ? "bg-[#1a0505] border-red-500/25 text-red-400"
                      : "bg-[#0d0d0d] border-[#1e1e1e] text-white"
                }`}
              >
                {t.type === "green" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Activity className="w-4 h-4 text-[#555] shrink-0" />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </motion.div>
  );
});

export default SetupSequence;
