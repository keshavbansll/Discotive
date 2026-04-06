import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Lock, Crown, Zap } from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { checkAccess, TIERS } from "../lib/TierEngine";
import { cn } from "../lib/cn";

/**
 * A highly aggressive, MAANG-style UI wrapper that blocks free users
 * from accessing Pro features and serves an in-line upsell.
 */
const TierGate = ({
  featureKey,
  children,
  fallbackType = "blur", // 'blur' | 'hide' | 'modal'
  upsellMessage = "This module requires Pro Clearance.",
}) => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();

  if (loading)
    return <div className="animate-pulse bg-[#111] h-full w-full rounded-xl" />;

  const userTier = userData?.tier || TIERS.ESSENTIAL;
  const hasAccess = checkAccess(userTier, featureKey);

  if (hasAccess) {
    return <>{children}</>;
  }

  // If they don't have access, render the aggressive upsell
  if (fallbackType === "hide") return null;

  return (
    <div className="relative w-full h-full group overflow-hidden rounded-2xl border border-[#222] bg-[#050505]">
      {/* The Blurred Background Feature */}
      <div className="absolute inset-0 opacity-20 blur-sm pointer-events-none select-none grayscale">
        {children}
      </div>

      {/* The Upsell Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent">
        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
          <Lock className="w-5 h-5 text-amber-500" />
        </div>

        <h3 className="text-lg font-black text-white mb-2 tracking-tight">
          Protocol Locked
        </h3>
        <p className="text-xs text-[#888] font-medium max-w-[250px] mb-6 leading-relaxed">
          {upsellMessage}
        </p>

        <button
          onClick={() => navigate("/premium")}
          className="px-6 py-3 bg-white text-black text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:bg-[#ccc] transition-all flex items-center gap-2 group-hover:scale-105 shadow-xl"
        >
          <Crown className="w-4 h-4" /> Upgrade to Pro
        </button>
      </div>
    </div>
  );
};

export default TierGate;
