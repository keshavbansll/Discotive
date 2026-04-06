import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Zap,
  Database,
  BarChart2,
  ArrowRight,
  Check,
} from "lucide-react";

const PRO_FEATURES = [
  { icon: Zap, label: "Unlimited Execution Nodes", sub: "No 15-node cap" },
  { icon: Database, label: "100MB Asset Vault", sub: "50 verified assets" },
  {
    icon: BarChart2,
    label: "X-Ray Competitor Analysis",
    sub: "Leaderboard intelligence",
  },
  {
    icon: Crown,
    label: "Daily Execution Journal",
    sub: "Pro-only reflection system",
  },
];

export default function StepPremiumPrompt({
  firstName,
  onUpgrade,
  onContinue,
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      {/* Gold glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500 opacity-[0.06] blur-3xl rounded-full pointer-events-none" />

      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <Crown className="w-8 h-8 text-black" />
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
            Limited Time — Launch Pricing
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-3 text-white">
          Welcome, {firstName}. <br />
          <span className="text-amber-400">Build without limits.</span>
        </h2>
        <p className="text-sm text-[#888] mb-8 max-w-sm mx-auto leading-relaxed">
          You're on the Essential tier. Upgrade to Pro for{" "}
          <strong className="text-white">₹99/month</strong> and unlock the full
          Career Engine — everything serious operators use.
        </p>

        <div className="space-y-2.5 mb-8 text-left max-w-xs mx-auto">
          {PRO_FEATURES.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-3 bg-[#111] border border-[#1a1a1a] rounded-xl"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">{label}</p>
                <p className="text-[10px] text-[#666]">{sub}</p>
              </div>
              <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-auto" />
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="w-full py-4 mb-3 bg-amber-500 text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" /> Upgrade to Pro — ₹99/mo
        </button>

        <button
          onClick={onContinue}
          className="w-full py-3 text-xs font-bold text-[#555] hover:text-[#888] transition-colors flex items-center justify-center gap-1.5"
        >
          Continue with Essential <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <p className="text-[9px] text-[#333] mt-4">
          Cancel anytime. No hidden charges. Indian pricing — ₹99/month.
        </p>
      </div>
    </motion.div>
  );
}
