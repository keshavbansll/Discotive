import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const loadingPhrases = [
  "Initializing instance...",
  "Encrypting Asset Vault...",
  "Mapping execution dependencies...",
  "Calculating baseline momentum...",
];

const AuthLoader = ({ taskComplete }) => {
  const navigate = useNavigate();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [minTimeMet, setMinTimeMet] = useState(false);

  useEffect(() => {
    // 1. Cycle text twice as fast (600ms) so they actually see the OS booting vibe
    const textInterval = setInterval(() => {
      setPhraseIndex((prev) =>
        prev + 1 < loadingPhrases.length ? prev + 1 : prev,
      );
    }, 600);

    // 2. Strict 1.5-second minimum animation (CRITICAL FIX: Down from 6.0 seconds)
    const minTimer = setTimeout(() => {
      setMinTimeMet(true);
    }, 1500);

    return () => {
      clearInterval(textInterval);
      clearTimeout(minTimer);
    };
  }, []);

  // 3. When BOTH the 1.5s have passed AND Firebase is done -> Route to App
  useEffect(() => {
    if (minTimeMet && taskComplete) {
      // Add a tiny 300ms buffer so they actually see "Deployment Ready"
      // before the component unmounts and shifts to the dashboard.
      const exitTimer = setTimeout(() => navigate("/app"), 300);
      return () => clearTimeout(exitTimer);
    }
  }, [minTimeMet, taskComplete, navigate]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030303] text-white flex flex-col items-center justify-center selection:bg-white selection:text-black">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />

      {/* 1. THE CENTER ANIMATION */}
      <div className="relative w-32 h-32 mb-16 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 border border-[#333] rounded-full"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-4 border-2 border-[#666] border-dashed rounded-lg"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute w-8 h-8 bg-white rounded-sm shadow-[0_0_30px_rgba(255,255,255,0.8)]"
          animate={{ rotate: 180, scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* 2. THE HORIZONTAL LINE LOADER */}
      <div className="w-64 md:w-80 h-[2px] bg-[#222] overflow-hidden mb-8 relative rounded-full">
        <motion.div
          className="absolute top-0 left-0 h-full bg-white"
          initial={{ width: "0%" }}
          // Notice we changed the transition duration here to match the 1.5s minimum
          animate={{ width: taskComplete ? "100%" : "85%" }}
          transition={{ duration: taskComplete ? 0.3 : 1.5, ease: "easeInOut" }}
        />
      </div>

      {/* 3. CYCLING TEXT */}
      <div className="h-8 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={phraseIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-xs md:text-sm font-bold text-[#888] uppercase tracking-widest text-center"
          >
            {taskComplete && minTimeMet
              ? "Deployment Ready."
              : loadingPhrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthLoader;
