/**
 * @fileoverview LearnCard.jsx — Discotive Learn Engine Card v5.0
 * Dashboard-native design. Borderless depth. OTT psychology.
 * Shows completion status, progress bar, difficulty-based score reward.
 * YouTube replaces Masterclass. Score display tied to difficulty.
 */

import React, { memo } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Award,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  Youtube,
  Headphones,
  FileText,
} from "lucide-react";
import { TYPE_CONFIG } from "../../lib/discotiveLearn";

const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

const DIFF_COLORS = {
  Beginner: "#4ADE80",
  Intermediate: G.bright,
  Advanced: "#F59E0B",
  Expert: "#EF4444",
};

// Score reward per difficulty (must match calculateCourseScoreReward in discotiveLearn.js)
const DIFF_SCORE = {
  Beginner: 5,
  Intermediate: 15,
  Advanced: 25,
  Expert: 25,
};

const TypePlaceholder = ({ type, color }) => {
  if (type === "video" || type === "podcast") {
    const Icon = type === "podcast" ? Headphones : Youtube;
    return <Icon className="w-8 h-8" style={{ color: `${color}40` }} />;
  }
  if (type === "course")
    return <Award className="w-8 h-8" style={{ color: `${color}40` }} />;
  return <FileText className="w-8 h-8" style={{ color: `${color}40` }} />;
};

const LearnCard = memo(({ item, onClick, completion, progress }) => {
  if (!item) return null;

  const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;
  const isVerified = completion?.verified;
  const isPending = completion?.pending;
  const progressPct = progress?.progressPct || 0;
  const isStarted = progressPct > 0 && progressPct < 100;

  // Determine effective score reward
  const scoreReward =
    item.scoreReward != null
      ? item.scoreReward
      : DIFF_SCORE[item.difficulty] || 5;

  const thumb =
    item.thumbnailUrl ||
    (item.youtubeId
      ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
      : null);

  const durationText = item.estimatedHours
    ? `${item.estimatedHours}h`
    : item.durationMinutes
      ? item.durationMinutes < 60
        ? `${item.durationMinutes}m`
        : `${Math.floor(item.durationMinutes / 60)}h`
      : null;

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="cursor-pointer relative rounded-2xl overflow-hidden group"
      style={{
        background: V.surface,
        width: 200,
        minWidth: 200,
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative overflow-hidden"
        style={{ height: 112, background: V.depth }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `${tc.color}08` }}
          >
            <TypePlaceholder type={item.type} color={tc.color} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(15,15,15,0.9) 0%, rgba(15,15,15,0.1) 50%, transparent 100%)",
          }}
        />

        {/* Play hover for videos/podcasts */}
        {(item.type === "video" ||
          item.type === "podcast" ||
          item.youtubeId) && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <Play className="w-4 h-4 text-white ml-0.5 fill-current" />
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span
            className="px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest"
            style={{
              background: `${tc.color}22`,
              border: `1px solid ${tc.color}40`,
              color: tc.color,
            }}
          >
            {tc.label}
          </span>
        </div>

        {/* Score reward badge — courses only, difficulty-based */}
        {item.type === "course" && (
          <div
            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              border: `1px solid ${G.border}`,
            }}
          >
            <Zap className="w-2.5 h-2.5" style={{ color: G.bright }} />
            <span className="text-[8px] font-black" style={{ color: G.bright }}>
              +{scoreReward}
            </span>
          </div>
        )}

        {/* YouTube badge for youtube platform */}
        {(item.platform === "youtube" || item.youtubeId) &&
          item.type !== "course" && (
            <div className="absolute top-2 right-2">
              <Youtube className="w-3.5 h-3.5 text-red-500" />
            </div>
          )}

        {/* Completion badge */}
        {isVerified && (
          <div className="absolute bottom-2 right-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: "#4ADE80" }} />
          </div>
        )}
        {isPending && !isVerified && (
          <div
            className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <span className="text-[7px] font-black text-amber-400">
              PENDING
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {isStarted && (
        <div className="h-0.5" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            style={{
              width: `${progressPct}%`,
              height: "100%",
              background: tc.color,
              transition: "width 0.5s ease",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <p
          className="text-xs font-bold text-white line-clamp-2 mb-1.5 leading-snug"
          style={{ minHeight: 32 }}
        >
          {item.title}
        </p>

        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.difficulty && (
              <span
                className="text-[8px] font-black uppercase shrink-0"
                style={{ color: DIFF_COLORS[item.difficulty] || T.dim }}
              >
                {item.difficulty}
              </span>
            )}
            {durationText && (
              <>
                <span className="text-[8px]" style={{ color: T.dim }}>
                  ·
                </span>
                <span
                  className="flex items-center gap-0.5 text-[8px]"
                  style={{ color: T.dim }}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {durationText}
                </span>
              </>
            )}
          </div>

          {/* Provider / Channel */}
          {(item.provider || item.channelName) && (
            <span
              className="text-[8px] font-bold truncate max-w-[60px]"
              style={{ color: T.dim }}
            >
              {item.provider || item.channelName}
            </span>
          )}
        </div>

        {/* Course-specific footer */}
        {item.type === "course" && (
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[8px] font-bold uppercase tracking-widest"
              style={{ color: item.isPaid ? "#F59E0B" : "#4ADE80" }}
            >
              {item.isPaid ? "Paid" : "Free"}
            </span>
            {item.platform && (
              <span className="text-[8px]" style={{ color: T.dim }}>
                {item.platform === "youtube" ? "YouTube" : item.platform}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

LearnCard.displayName = "LearnCard";

export default LearnCard;
