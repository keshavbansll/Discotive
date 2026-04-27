/**
 * @fileoverview BorderlessAssetCard — Discotive Learn v2.0
 *
 * DESIGN MANDATES:
 * - NO floating rounded pills in negative space.
 * - NO drop-shadows or thick borders to establish hierarchy.
 * - Depth via background contrast. Hover creates cinematic reveal.
 * - Edge-to-edge within its grid column.
 * - PC: Hover triggers metadata expansion panel (absolute overlay).
 * - Mobile: No hover logic — tap triggers detail sheet.
 *
 * Extended metadata fields assumed on each asset:
 *   isPaid, industryRelevance, expiresAt, skillsRequired, skillsGained, niche
 */

import React, { useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Play,
  Check,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Headphones,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = { base: "#BFA264", bright: "#D4AF78" };

const RELEVANCE_CONFIG = {
  Strong: {
    color: "#4ADE80",
    label: "Strong Relevance",
    bg: "rgba(74,222,128,0.08)",
  },
  Medium: {
    color: "#D4AF78",
    label: "Medium Relevance",
    bg: "rgba(212,175,120,0.08)",
  },
  Weak: {
    color: "rgba(245,240,232,0.30)",
    label: "Low Relevance",
    bg: "rgba(255,255,255,0.03)",
  },
};

const DIFF_MAP = {
  Beginner: { color: "#4ADE80", border: "rgba(74,222,128,0.25)" },
  Intermediate: { color: "#D4AF78", border: "rgba(212,175,120,0.25)" },
  Advanced: { color: "#F97316", border: "rgba(249,115,22,0.25)" },
  Expert: { color: "#F87171", border: "rgba(248,113,113,0.25)" },
};

// ── YouTube thumbnail resolver ────────────────────────────────────────────────
export const ytThumb = (id) =>
  id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;

// ── Difficulty Chip ───────────────────────────────────────────────────────────
const DiffChip = memo(({ level }) => {
  const d = DIFF_MAP[level] || DIFF_MAP.Beginner;
  return (
    <span
      className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
      style={{
        color: d.color,
        border: `1px solid ${d.border}`,
        background: `${d.color}10`,
      }}
    >
      {level}
    </span>
  );
});

// ── Industry Relevance Indicator ─────────────────────────────────────────────
const RelevanceBar = memo(({ level }) => {
  if (!level) return null;
  const cfg = RELEVANCE_CONFIG[level];
  const width =
    level === "Strong" ? "100%" : level === "Medium" ? "60%" : "25%";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-0.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: cfg.color }}
        />
      </div>
      <span
        className="text-[8px] font-black uppercase tracking-wider shrink-0"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
});

// ── Skill Tags ────────────────────────────────────────────────────────────────
const SkillTags = memo(({ skills = [], label, color }) => {
  if (!skills?.length) return null;
  return (
    <div>
      <p
        className="text-[8px] font-black uppercase tracking-widest mb-1"
        style={{ color: "rgba(245,240,232,0.25)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {skills.slice(0, 4).map((s) => (
          <span
            key={s}
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-sm"
            style={{
              color,
              background: `${color}12`,
              border: `1px solid ${color}20`,
            }}
          >
            {s}
          </span>
        ))}
        {skills.length > 4 && (
          <span className="text-[8px] text-white/20 px-1 py-0.5">
            +{skills.length - 4}
          </span>
        )}
      </div>
    </div>
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// BORDERLESS ASSET CARD
// ═════════════════════════════════════════════════════════════════════════════
const BorderlessAssetCard = memo(
  ({
    item,
    type, // 'cert' | 'video'
    completion,
    onSelect,
    isMobile = false,
    index = 0,
  }) => {
    const [hovered, setHovered] = useState(false);
    const isVerified = completion?.verified;
    const isPending = completion?.pending;

    // ── Derived thumbnail ──────────────────────────────────────────────────────
    const thumbnail =
      type === "video" ? ytThumb(item.youtubeId) : item.thumbnailUrl || null;

    const handleClick = useCallback(
      () => onSelect?.(item, type),
      [item, type, onSelect],
    );

    // ── Stagger animation ──────────────────────────────────────────────────────
    const cardVariants = {
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.35,
          delay: index * 0.04,
          ease: [0.22, 1, 0.36, 1],
        },
      },
    };

    return (
      <motion.article
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        layout
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => !isMobile && setHovered(false)}
        onClick={handleClick}
        className={cn(
          "relative group cursor-pointer overflow-hidden flex flex-col select-none",
          "transition-all duration-200",
          // Borderless — depth via background, not borders
          isVerified ? "bg-[#040f07]" : "bg-[#090909] hover:bg-[#0e0e0e]",
        )}
        style={{
          // Completion state: subtle left accent line
          borderLeft: isVerified
            ? "2px solid rgba(74,222,128,0.5)"
            : isPending
              ? "2px solid rgba(212,175,120,0.4)"
              : "2px solid transparent",
        }}
        aria-label={item.title}
      >
        {/* ── Thumbnail ────────────────────────────────────────────────────── */}
        <div
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: type === "video" ? "16/9" : "16/7" }}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={item.title}
              loading="lazy"
              className={cn(
                "w-full h-full object-cover transition-all duration-500",
                hovered ? "scale-105 opacity-85" : "opacity-60",
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#060606]">
              {type === "video" ? (
                <Play className="w-8 h-8 text-white/5" />
              ) : type === "cert" ? (
                <Award className="w-8 h-8 text-white/5" />
              ) : (
                <Headphones className="w-8 h-8 text-white/5" />
              )}
            </div>
          )}

          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent opacity-80" />

          {/* Completion overlay */}
          {isVerified && (
            <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_24px_rgba(74,222,128,0.5)]">
                <Check className="w-4.5 h-4.5 text-white" strokeWidth={3} />
              </div>
            </div>
          )}

          {/* Video: Play button on hover */}
          {type === "video" && !isVerified && (
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(191,162,100,0.35)]"
                    style={{ background: G.base }}
                  >
                    <Play className="w-5 h-5 text-black ml-0.5" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ── Overlaid chips (always visible) ────────────────────────────── */}
          <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
            {/* Duration chip */}
            {(item.duration || item.durationMinutes) && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono font-bold text-white/70"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <Clock className="w-2.5 h-2.5" />
                {typeof item.durationMinutes === "number"
                  ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`.replace(
                      "0h ",
                      "",
                    )
                  : item.duration}
              </span>
            )}
            {/* Score reward */}
            {item.scoreReward > 0 && (
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black"
                style={{
                  color: G.bright,
                  background: "rgba(0,0,0,0.6)",
                  backdropFilter: "blur(4px)",
                  border: `1px solid ${G.bright}25`,
                }}
              >
                <Zap className="w-2.5 h-2.5" />+{item.scoreReward}
              </span>
            )}
          </div>

          {/* Pending badge */}
          {isPending && !isVerified && (
            <div
              className="absolute top-2 right-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(0,0,0,0.7)",
                color: G.bright,
                border: `1px solid ${G.bright}30`,
              }}
            >
              Pending Audit
            </div>
          )}

          {/* Industry relevance strip */}
          {item.industryRelevance && (
            <div className="absolute top-2 left-2 flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background:
                    RELEVANCE_CONFIG[item.industryRelevance]?.color || "#fff",
                }}
              />
            </div>
          )}
        </div>

        {/* ── Content area ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3 gap-1.5">
          {/* Provider / Category */}
          <p
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(245,240,232,0.30)" }}
          >
            {item.provider || item.category || "Discotive Learn"}
          </p>

          {/* Title */}
          <h3
            className={cn(
              "font-bold leading-snug transition-colors duration-200",
              "text-[13px]",
              hovered ? "text-white" : "text-[rgba(245,240,232,0.85)]",
            )}
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            {item.title}
          </h3>

          {/* Chips row */}
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {item.difficulty && <DiffChip level={item.difficulty} />}
            {item.isPaid && (
              <span
                className="text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest"
                style={{
                  color: "#a78bfa",
                  background: "rgba(167,139,250,0.08)",
                  border: "1px solid rgba(167,139,250,0.2)",
                }}
              >
                Paid
              </span>
            )}
            {!item.isPaid && (
              <span
                className="text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest"
                style={{
                  color: "#4ADE80",
                  background: "rgba(74,222,128,0.06)",
                  border: "1px solid rgba(74,222,128,0.15)",
                }}
              >
                Free
              </span>
            )}
          </div>
        </div>

        {/* ── PC Hover Expansion Panel ─────────────────────────────────────── */}
        {!isMobile && (
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute inset-x-0 bottom-0 flex flex-col gap-2.5 px-3 pb-3 pt-8"
                style={{
                  background:
                    "linear-gradient(to top, rgba(9,9,9,0.98) 60%, transparent 100%)",
                  pointerEvents: "none",
                }}
              >
                {/* Industry relevance bar */}
                <RelevanceBar level={item.industryRelevance} />

                {/* Skills gained */}
                <SkillTags
                  skills={item.skillsGained}
                  label="Skills Gained"
                  color="#4ADE80"
                />

                {/* Skills required */}
                <SkillTags
                  skills={item.skillsRequired}
                  label="Prerequisites"
                  color={G.bright}
                />

                {/* Expiry notice */}
                {item.expiresAt && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500/60" />
                    <span className="text-[8px] font-bold text-white/25 uppercase tracking-wider">
                      Cert expires{" "}
                      {new Date(
                        item.expiresAt?.seconds * 1000 || item.expiresAt,
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* CTA arrow */}
                <div
                  className="flex items-center gap-1 mt-1"
                  style={{ color: G.bright, pointerEvents: "auto" }}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    {type === "video" ? "Watch" : "Enroll"}
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Vertical domain accent strip ─────────────────────────────────── */}
        {item.domains?.[0] && (
          <div
            className="absolute right-0 top-4 bottom-4 w-0.5 opacity-20"
            style={{ background: G.base }}
          />
        )}
      </motion.article>
    );
  },
);

BorderlessAssetCard.displayName = "BorderlessAssetCard";
export default BorderlessAssetCard;
