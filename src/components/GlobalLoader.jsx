import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const GlobalLoader = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let currentProgress = 0;

    const simulateLoading = () => {
      // Realistic loading jump (only ever moves forward)
      const jump = Math.floor(Math.random() * 12) + 2;

      // Simulate network "hanging" (pauses randomly, but never goes backward)
      const isPaused =
        Math.random() > 0.7 && currentProgress > 20 && currentProgress < 85;

      if (!isPaused) {
        currentProgress += jump;
      }

      if (currentProgress >= 100) {
        currentProgress = 100;
        setProgress(100);
        setTimeout(() => {
          onComplete(); // Tell the app to unmount the loader
        }, 500); // Brief pause at 100% before snapping away
        return;
      }

      setProgress(currentProgress);

      // If paused, wait longer before the next tick
      const nextTick = isPaused
        ? Math.floor(Math.random() * 400) + 200
        : Math.floor(Math.random() * 120) + 30;
      setTimeout(simulateLoading, nextTick);
    };

    setTimeout(simulateLoading, 200);
  }, [onComplete]);

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
      <div className="w-full max-w-xs flex flex-col items-center gap-6">
        <h1 className="text-3xl font-extrabold tracking-tighter">DISCOTIVE</h1>

        <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <motion.div
            className="absolute top-0 left-0 h-full bg-white rounded-full shadow-[0_0_10px_white]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "tween", ease: "circOut", duration: 0.2 }}
          />
        </div>

        <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">
          Booting Core OS... {progress}%
        </p>
      </div>
    </motion.div>
  );
};

export default GlobalLoader;
