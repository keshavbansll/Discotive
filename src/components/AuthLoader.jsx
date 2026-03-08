// src/components/AuthLoader.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const messages = [
  "Ingesting skill matrix...",
  "Mapping network nodes...",
  "Calculating placement probability...",
  "Synthesizing career roadmap...",
  "Initializing personal ledger...",
];

const AuthLoader = () => {
  const navigate = useNavigate();
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through messages every 1.2 seconds
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev < messages.length - 1 ? prev + 1 : prev));
    }, 1200);

    // After 6 seconds, the "AI" is done, navigate to the OS
    const navigationTimer = setTimeout(() => {
      navigate("/app");
    }, 6000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[10000] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Dynamic Ambient Background Gradients (Alive & Moving) */}
      <motion.div
        animate={{
          x: [0, 100, -100, 0],
          y: [0, -100, 100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -100, 100, 0],
          y: [0, 100, -100, 0],
          scale: [1, 1.5, 1],
        }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Abstract Floating UI Elements (Simulating AI building the dashboard) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none perspective-1000">
        <motion.div
          animate={{ rotateY: 360, rotateX: 360 }}
          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          className="relative w-96 h-96 transform-style-3d"
        >
          <div className="absolute top-0 left-10 w-32 h-20 border border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-xl" />
          <div className="absolute bottom-10 right-0 w-40 h-32 border border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-xl" />
          <div className="absolute top-1/2 -left-10 w-24 h-24 border border-white/5 bg-white/[0.02] backdrop-blur-sm rounded-xl" />
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6">
        {/* Simple Pulsing Logo (No Text) */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-extrabold text-3xl shadow-[0_0_40px_rgba(255,255,255,0.3)] mb-12"
        >
          D
        </motion.div>

        {/* Cycling Text */}
        <div className="h-6 mb-8 relative w-full flex justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-bold text-slate-400 uppercase tracking-widest absolute text-center w-full"
            >
              {messages[messageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Ultra-Minimal Slow Loading Bar */}
        <div className="w-full h-[1px] bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5.5, ease: "easeInOut" }}
            className="h-full bg-white shadow-[0_0_10px_white]"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default AuthLoader;
