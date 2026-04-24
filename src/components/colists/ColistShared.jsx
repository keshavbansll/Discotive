import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  G,
  T,
  VERIFICATION_TIERS,
  getNextMilestone,
  RESONANCE_MILESTONES,
} from "../../lib/colistConstants";
import { cn } from "../../lib/cn";

export const ResonanceRing = memo(
  ({ colistScore = 0, size = 48, showLabel = false, onClick }) => {
    const next = getNextMilestone(colistScore);

    const prevMilestone = RESONANCE_MILESTONES.slice()
      .reverse()
      .find((m) => m.threshold <= (colistScore || 0));
    const pct = next
      ? Math.min(
          100,
          ((colistScore - (prevMilestone?.threshold || 0)) /
            (next.threshold - (prevMilestone?.threshold || 0))) *
            100,
        )
      : 100;

    const r = (size - 5) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);

    return (
      <motion.div
        whileHover={onClick ? { scale: 1.08 } : {}}
        onClick={onClick}
        className={cn(
          "relative flex flex-col items-center gap-1",
          onClick && "cursor-pointer",
        )}
      >
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(191,162,100,0.12)"
              strokeWidth={4.5}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={G.bright}
              strokeWidth={4.5}
              strokeDasharray={circ}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: `drop-shadow(0 0 4px ${G.bright})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[9px] font-black font-mono"
              style={{ color: G.bright }}
            >
              {colistScore >= 1000
                ? `${(colistScore / 1000).toFixed(1)}K`
                : colistScore}
            </span>
          </div>
        </div>
        {showLabel && (
          <div className="text-center">
            <p
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: G.base }}
            >
              Resonance
            </p>
            {next && (
              <p className="text-[7px] font-mono" style={{ color: T.dim }}>
                {next.threshold - colistScore} → +{next.globalPts}pts
              </p>
            )}
          </div>
        )}
      </motion.div>
    );
  },
);

export const VerificationBadge = memo(({ tier, compact = false }) => {
  if (!tier || !VERIFICATION_TIERS[tier]) return null;
  const {
    label,
    color,
    border,
    bg,
    glow,
    icon: Icon,
  } = VERIFICATION_TIERS[tier];
  if (tier === "weak") return null;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border"
        title={label}
        style={{ background: bg, borderColor: border, boxShadow: glow }}
      >
        {Icon && <Icon size={8} style={{ color }} />}
        <span
          className="text-[7px] font-black uppercase tracking-wider"
          style={{ color }}
        >
          {tier === "original" ? "Original" : label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
      style={{ background: bg, borderColor: border, boxShadow: glow }}
    >
      {Icon && <Icon size={11} style={{ color }} />}
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
});
