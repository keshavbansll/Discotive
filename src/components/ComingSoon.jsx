import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Activity, Code2 } from "lucide-react";
import { cn } from "../lib/cn";

const ComingSoon = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
      {/* --- Animated Background Elements (The Void & Gold) --- */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="w-[600px] h-[600px] rounded-full border border-[rgba(191,162,100,0.05)] border-dashed"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
          className="absolute w-[800px] h-[800px] rounded-full border border-[rgba(191,162,100,0.02)] border-dashed"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 max-w-lg w-full"
      >
        {/* --- Central Animated Icon --- */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-[#BFA264] rounded-full blur-[40px] opacity-20"
            />
            <div className="w-20 h-20 bg-[rgba(191,162,100,0.05)] border border-[rgba(191,162,100,0.2)] rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(191,162,100,0.1)] backdrop-blur-xl relative z-10">
              <Code2 className="w-10 h-10 text-[#D4AF78]" />
            </div>
            {/* Orbital floating dot indicating live status */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute w-28 h-28 rounded-full border border-transparent z-0"
            >
              <div className="w-2 h-2 bg-[#4ADE80] rounded-full absolute -top-1 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#4ADE80]" />
            </motion.div>
          </div>

          {/* --- Status Badge --- */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.25)] mb-4">
            <Activity className="w-3.5 h-3.5 text-[#D4AF78]" />
            <span className="text-[10px] font-black text-[#D4AF78] uppercase tracking-[0.2em]">
              Developer Testing Phase
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-[#F5F0E8] tracking-tight mb-4 capitalize">
            {title}
          </h1>

          <p className="text-[#F5F0E8]/60 text-sm md:text-base font-medium leading-relaxed max-w-md mx-auto">
            This sector of the Discotive execution engine is currently
            undergoing strict QA and technical calibration. It will be deployed
            to the main branch soon.
          </p>
        </div>

        {/* --- Actions Grid --- */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mt-8">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-6 py-3.5 flex items-center justify-center gap-2 rounded-xl bg-[#0F0F0F] border border-white/10 text-[#F5F0E8]/80 hover:text-[#F5F0E8] hover:bg-white/5 hover:border-white/20 transition-all font-bold text-xs uppercase tracking-widest active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Return
          </button>

          <button
            onClick={() => navigate("/app")}
            className="w-full sm:w-auto px-6 py-3.5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF78] to-[#8B7240] text-[#030303] hover:from-[#E8D5A3] hover:to-[#BFA264] transition-all font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(191,162,100,0.3)] active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            Command Center
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ComingSoon;
