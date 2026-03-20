import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, X, Zap, ShieldCheck, Lock, Activity } from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

const Premium = () => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();

  // Handle Pro Checkout Routing
  const handleProClick = () => {
    if (userData) {
      navigate("/checkout");
    } else {
      // You can implement a redirect parameter here in the future if needed
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#666] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 font-sans relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-32 pb-16 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#333] bg-[#111] mb-8">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-extrabold text-[#888] uppercase tracking-widest">
              Discotive OS Upgrades
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-6 leading-tight">
            Scale your monopoly.
          </h1>
          <p className="text-lg md:text-xl text-[#888] font-medium tracking-tight max-w-2xl mx-auto">
            The basic OS gets you started. Discotive Pro unlocks infinite
            execution parameters and complete historical ledger access.
          </p>
        </motion.div>
      </div>

      {/* PRICING GRID */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {/* TIER 1: FREE (Basic OS) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-[2.5rem] p-8 md:p-10 flex flex-col hover:border-[#444] transition-colors h-full"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
                Basic OS
              </h2>
              <p className="text-sm text-[#666] font-medium h-10">
                Standard deployment for early-stage builders.
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter text-white">
                  ₹0
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
                <p className="text-sm font-bold text-[#ccc] pt-0.5">
                  Execution Plan{" "}
                  <span className="text-[#666] font-mono text-[10px] ml-1 uppercase tracking-widest">
                    (Max 10 Nodes)
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-4 opacity-50">
                <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                  <X className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-sm font-bold text-[#666] pt-0.5 line-through decoration-[#444]">
                  Execution Journal
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </div>
                <p className="text-sm font-bold text-[#ccc] pt-0.5">
                  Milestone Tracker
                </p>
              </div>
            </div>

            <Link
              to="/auth"
              className="w-full py-4 px-6 rounded-full border border-[#444] text-white font-extrabold text-sm uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-all text-center mt-auto"
            >
              Sign Up
            </Link>
          </motion.div>

          {/* TIER 2: PRO (Highlighted) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#111] border border-[#444] rounded-[2.5rem] p-8 md:p-10 flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.05)] relative overflow-hidden h-full transform md:-translate-y-4"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-white" />

            <div className="mb-8">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-white">
                  Discotive Pro
                </h2>
                <span className="px-3 py-1 bg-white text-black text-[9px] font-extrabold uppercase tracking-widest rounded-full">
                  Recommended
                </span>
              </div>
              <p className="text-sm text-[#888] font-medium h-10">
                Unrestricted execution and complete historical archiving.
              </p>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tighter text-white">
                  ₹99
                </span>
                <span className="text-[#666] font-bold text-sm">/ month</span>
              </div>
            </div>

            <div className="flex-1 space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <p className="text-sm font-bold text-white pt-0.5">
                  Execution Plan{" "}
                  <span className="text-amber-500 font-mono text-[10px] ml-1 uppercase tracking-widest">
                    (Unlimited Nodes)
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <p className="text-sm font-bold text-white pt-0.5">
                  Execution Journal{" "}
                  <span className="text-amber-500 font-mono text-[10px] ml-1 uppercase tracking-widest">
                    (Full Ledger)
                  </span>
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </div>
                <p className="text-sm font-bold text-white pt-0.5">
                  Milestone Tracker
                </p>
              </div>
            </div>

            <button
              onClick={handleProClick}
              className="w-full py-4 px-6 rounded-full bg-white text-black font-extrabold text-sm uppercase tracking-widest hover:bg-[#ccc] transition-all text-center mt-auto shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              ₹99 / Month
            </button>
          </motion.div>

          {/* TIER 3: ENTERPRISE (Faded + Slow Flicker) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="relative h-full"
          >
            {/* The Flicker Animation Container */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="bg-[#050505] border border-[#1a1a1a] rounded-[2.5rem] p-8 md:p-10 flex flex-col h-full pointer-events-none"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold tracking-tight text-[#666] mb-2 flex items-center gap-3">
                  Enterprise <Lock className="w-4 h-4 text-[#444]" />
                </h2>
                <p className="text-sm text-[#444] font-medium h-10">
                  Bespoke OS deployment for accelerators, colleges, and VC
                  cohorts.
                </p>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tighter text-[#444]">
                    Custom
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-6 mb-12">
                <div className="flex items-start gap-4 opacity-40">
                  <div className="w-6 h-6 rounded-full bg-[#111] border border-[#333] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#666]" />
                  </div>
                  <p className="text-sm font-bold text-[#555] pt-0.5">
                    Dedicated Campus Hub UI
                  </p>
                </div>
                <div className="flex items-start gap-4 opacity-40">
                  <div className="w-6 h-6 rounded-full bg-[#111] border border-[#333] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#666]" />
                  </div>
                  <p className="text-sm font-bold text-[#555] pt-0.5">
                    Admin Telemetry Dashboard
                  </p>
                </div>
                <div className="flex items-start gap-4 opacity-40">
                  <div className="w-6 h-6 rounded-full bg-[#111] border border-[#333] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#666]" />
                  </div>
                  <p className="text-sm font-bold text-[#555] pt-0.5">
                    Bulk Node Injection
                  </p>
                </div>
              </div>

              <div className="w-full py-4 px-6 rounded-full border border-[#222] bg-[#0a0a0a] text-[#444] font-extrabold text-sm uppercase tracking-widest text-center mt-auto flex justify-center items-center gap-2">
                Coming Soon
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
