import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Cpu } from "lucide-react";

const AILoader = ({ phase = "questions" }) => {
  const [loadingText, setLoadingText] = useState("");

  const questionTexts = [
    "Analyzing operator footprint...",
    "Querying global baseline constraints...",
    "Synthesizing calibration parameters...",
    "Generating neural pathways...",
  ];

  const roadmapTexts = [
    "Processing calibration answers...",
    "Calculating optimal trajectory...",
    "Structuring execution nodes...",
    "Finalizing cryptographic map...",
  ];

  useEffect(() => {
    const texts = phase === "questions" ? questionTexts : roadmapTexts;
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative flex items-center justify-center w-24 h-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-t-2 border-amber-500/50 border-r-2 border-transparent"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-b-2 border-white/50 border-l-2 border-transparent"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-amber-500/10 rounded-full m-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <Cpu className="w-6 h-6 text-amber-500 animate-pulse" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className="text-sm font-extrabold text-white tracking-widest uppercase flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> Discotive AI
        </h3>
        <p className="text-xs text-[#888] font-mono animate-pulse">
          {loadingText}
        </p>
      </div>
    </div>
  );
};

export default AILoader;
