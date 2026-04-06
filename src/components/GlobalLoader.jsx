import { useEffect } from "react";
import { motion } from "framer-motion";

const GlobalLoader = ({ onComplete }) => {
  useEffect(() => {
    // 1. If the app isn't ready (Auth/Data still fetching), do absolutely nothing.
    if (!isReady) return;

    // 2. The app IS ready. Now we calculate if we need to pad the time.
    // We want a minimum display time of 500ms so the loader doesn't look like a glitch.
    const MIN_DISPLAY_MS = 500;

    // performance.now() tracks time since the page started loading
    const timeElapsed = performance.now();
    const remainingTime = Math.max(0, MIN_DISPLAY_MS - timeElapsed);

    // 3. Fire onComplete after the remaining time (often 0ms on slow networks, ~300ms on fast ones)
    const timer = setTimeout(() => {
      onComplete();
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [isReady, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        y: -20,
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
      }}
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col items-center justify-center text-white"
    >
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-extrabold tracking-tighter">DISCOTIVE</h1>

        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="relative flex items-center justify-center w-12 h-12"
        >
          <svg className="w-full h-full" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="20"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="25"
              cy="25"
              r="20"
              stroke="#ffffff"
              strokeWidth="4"
              fill="none"
              strokeDasharray="125"
              strokeDashoffset="90"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
          </svg>
        </motion.div>

        <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-[-10px]">
          Booting Core OS
        </p>
      </div>
    </motion.div>
  );
};

export default GlobalLoader;
