/**
 * @fileoverview PremiumAlgoFeed — Discotive Learn Algorithmic Execution Roadmap
 * @module Components/Learn/PremiumAlgoFeed
 *
 * ARCHITECTURE MANDATE:
 * - Premium tier: Computes weighted relevance score against user profile.
 *   Factors: domain match, niche match, industry relevance, skill gap, score reward.
 * - Essential tier: Elegant locked silhouette — FOMO engineering. Never just hide.
 * - Client-side scoring on the ≤40 loaded items ONLY (not on a massive array).
 * - Memoized: item scores recomputed only when rawItems or userData changes.
 * - PC: Horizontal scroll strip with ranked cards + "Why this?" tooltip.
 * - Mobile: Horizontal snap-x section.
 *
 * Score Weights:
 *   Domain match:          +40
 *   Niche match:           +25
 *   Industry Strong/Med/Weak: +30/15/5
 *   Prerequisites met:     +5 per skill
 *   Free item:             +5
 *   Score reward:          up to +10
 */

import React, { useMemo, useState, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Crown,
  Zap,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Play,
  Award,
  Check,
  Sparkles,
  Info,
  Target,
  ArrowRight,
  BarChart2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
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

// ── Algorithm Engine ──────────────────────────────────────────────────────────
const computeAlgoScore = (item, type, userData) => {
  const userDomain = (
    userData?.identity?.domain ||
    userData?.vision?.passion ||
    ""
  ).toLowerCase();
  const userNiche = (userData?.identity?.niche || "").toLowerCase();
  const userSkills = (userData?.skills?.alignedSkills || []).map((s) =>
    s.toLowerCase(),
  );

  let score = 0;
  let reasons = [];

  // 1. Domain match — highest weight
  const domainMatch = item.domains?.some((d) => d.toLowerCase() === userDomain);
  if (domainMatch) {
    score += 40;
    reasons.push("Matches your domain");
  }

  // 2. Niche match
  if (userNiche && item.niche && item.niche.toLowerCase().includes(userNiche)) {
    score += 25;
    reasons.push("Aligns with your niche");
  }

  // 3. Industry relevance
  const relMap = { Strong: 30, Medium: 15, Weak: 5 };
  const relScore = relMap[item.industryRelevance];
  if (relScore) {
    score += relScore;
    if (item.industryRelevance === "Strong")
      reasons.push("High industry demand");
  }

  // 4. Prerequisites met by user's existing skills
  const metPrereqs = (item.skillsRequired || []).filter((req) =>
    userSkills.some(
      (us) => req.toLowerCase().includes(us) || us.includes(req.toLowerCase()),
    ),
  ).length;
  score += metPrereqs * 5;
  if (metPrereqs > 0)
    reasons.push(`${metPrereqs} prereq${metPrereqs > 1 ? "s" : ""} met`);

  // 5. Free item boost
  if (!item.isPaid) {
    score += 5;
    reasons.push("Free access");
  }

  // 6. Score reward weight (capped)
  const rwScore = Math.min((item.scoreReward || 0) / 5, 10);
  score += rwScore;
  if (item.scoreReward >= 50) reasons.push(`+${item.scoreReward} pts reward`);

  // 7. Videos are faster to start
  if (type === "video") score += 3;

  return { score, reasons };
};

// ── Ghost Card (for Essential locked state) ───────────────────────────────────
const GhostAlgoCard = memo(({ index }) => (
  <div
    className="relative shrink-0 overflow-hidden select-none"
    style={{
      width: 240,
      background: V.depth,
      borderLeft: `2px solid ${G.deep}20`,
      filter: "blur(3px)",
      opacity: 0.35 - index * 0.08,
      pointerEvents: "none",
    }}
  >
    <div
      className="w-full"
      style={{ aspectRatio: "16/9", background: "#0d0d0d" }}
    />
    <div className="p-3 space-y-2">
      <div className="h-2 w-3/4 rounded bg-white/5" />
      <div className="h-3 w-full rounded bg-white/8" />
      <div className="h-3 w-2/3 rounded bg-white/5" />
      <div className="flex gap-1 mt-2">
        <div className="h-4 w-12 rounded bg-white/5" />
        <div className="h-4 w-16 rounded bg-white/5" />
      </div>
    </div>
    {/* Fake relevance bar */}
    <div className="px-3 pb-3">
      <div className="h-0.5 bg-white/5 w-full rounded" />
    </div>
  </div>
));

// ── Ranked Algo Card ──────────────────────────────────────────────────────────
const AlgoCard = memo(
  ({ item, type, rank, algoData, completion, onSelect }) => {
    const [showReason, setShowReason] = useState(false);
    const isVerified = completion?.verified;
    const thumbnail =
      type === "video"
        ? `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`
        : item.thumbnailUrl;

    const rankColor =
      rank === 1
        ? G.bright
        : rank === 2
          ? "rgba(245,240,232,0.7)"
          : rank === 3
            ? "#CD7F32"
            : T.dim;

    return (
      <motion.article
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.3,
          delay: rank * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        onClick={() => onSelect(item, type)}
        className="relative shrink-0 cursor-pointer group overflow-hidden flex flex-col"
        style={{
          width: 240,
          background: isVerified ? "#040f07" : V.depth,
          borderLeft: isVerified
            ? "2px solid rgba(74,222,128,0.5)"
            : `2px solid ${G.deep}40`,
        }}
      >
        {/* Rank badge */}
        <div
          className="absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center text-[9px] font-black"
          style={{
            background: "rgba(0,0,0,0.8)",
            color: rankColor,
            border: `1px solid ${rankColor}40`,
            backdropFilter: "blur(4px)",
          }}
        >
          {rank}
        </div>

        {/* Thumbnail */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={item.title}
              loading="lazy"
              className="w-full h-full object-cover transition-all duration-500 opacity-60 group-hover:opacity-85 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "#060606" }}
            >
              {type === "video" ? (
                <Play
                  className="w-8 h-8"
                  style={{ color: "rgba(255,255,255,0.05)" }}
                />
              ) : (
                <Award
                  className="w-8 h-8"
                  style={{ color: "rgba(255,255,255,0.05)" }}
                />
              )}
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(10,10,10,0.9) 0%, transparent 60%)",
            }}
          />

          {/* Completion state */}
          {isVerified && (
            <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "#10b981",
                  boxShadow: "0 0 20px rgba(16,185,129,0.5)",
                }}
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            </div>
          )}

          {/* Score reward */}
          {item.scoreReward > 0 && (
            <div
              className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black"
              style={{
                background: "rgba(0,0,0,0.75)",
                color: G.bright,
                border: `1px solid ${G.bright}25`,
                backdropFilter: "blur(4px)",
              }}
            >
              <Zap className="w-2.5 h-2.5" />+{item.scoreReward}
            </div>
          )}

          {/* Algo score badge */}
          <div
            className="absolute bottom-2 left-8 flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-black"
            style={{
              background: "rgba(0,0,0,0.75)",
              color: rankColor,
              backdropFilter: "blur(4px)",
            }}
          >
            <BarChart2 className="w-2.5 h-2.5" />
            {algoData.score}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-3 pt-2 pb-2.5 gap-1.5">
          <p
            className="text-[8px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            {item.provider || item.category || "Discotive Learn"}
          </p>
          <h3
            className="text-[12px] font-bold leading-snug line-clamp-2 transition-colors duration-200 group-hover:text-white"
            style={{ color: T.secondary, fontFamily: "'Poppins', sans-serif" }}
          >
            {item.title}
          </h3>

          {/* Relevance bar */}
          {item.industryRelevance && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    background:
                      item.industryRelevance === "Strong"
                        ? "#4ADE80"
                        : item.industryRelevance === "Medium"
                          ? G.bright
                          : "rgba(255,255,255,0.2)",
                    width:
                      item.industryRelevance === "Strong"
                        ? "100%"
                        : item.industryRelevance === "Medium"
                          ? "60%"
                          : "25%",
                  }}
                />
              </div>
              <span
                className="text-[7px] font-black uppercase tracking-widest shrink-0"
                style={{
                  color:
                    item.industryRelevance === "Strong"
                      ? "#4ADE80"
                      : item.industryRelevance === "Medium"
                        ? G.bright
                        : T.dim,
                }}
              >
                {item.industryRelevance}
              </span>
            </div>
          )}

          {/* Why this? reasons */}
          {algoData.reasons.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReason((v) => !v);
                }}
                className="flex items-center gap-1 text-[8px] font-bold transition-colors"
                style={{ color: showReason ? G.bright : T.dim }}
              >
                <Info className="w-2.5 h-2.5" />
                Why this?
              </button>
              <AnimatePresence>
                {showReason && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-3 right-3 z-20 flex flex-col gap-1 p-2 rounded"
                    style={{
                      bottom: "calc(100% + 4px)",
                      background: "#111",
                      border: `1px solid ${G.border}`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {algoData.reasons.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div
                          className="w-1 h-1 rounded-full shrink-0"
                          style={{ background: G.bright }}
                        />
                        <span
                          className="text-[8px] font-bold"
                          style={{ color: T.secondary }}
                        >
                          {r}
                        </span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.article>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM ALGO FEED
// ═══════════════════════════════════════════════════════════════════════════════
const PremiumAlgoFeed = ({
  rawCerts = [],
  rawVideos = [],
  userData,
  completionMap = {},
  onSelect,
  isPremium = false,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // ── Compute ranked items (only runs when rawCerts/rawVideos/userData change)
  const rankedItems = useMemo(() => {
    if (!isPremium) return [];

    const allItems = [
      ...rawCerts.map((item) => ({ item, type: "cert" })),
      ...rawVideos.map((item) => ({ item, type: "video" })),
    ];

    return allItems
      .map(({ item, type }) => ({
        item,
        type,
        algoData: computeAlgoScore(item, type, userData),
      }))
      .filter(({ algoData }) => algoData.score > 0)
      .sort((a, b) => b.algoData.score - a.algoData.score)
      .slice(0, 10);
  }, [rawCerts, rawVideos, userData, isPremium]);

  // ── Scroll handlers ────────────────────────────────────────────────────────
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  const scroll = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  }, []);

  // ── NO items or all items score 0 ─────────────────────────────────────────
  const hasProfile = !!(
    userData?.identity?.domain || userData?.vision?.passion
  );

  // ── Locked state (Essential tier) ─────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" style={{ color: G.bright }} />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                color: G.bright,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Algorithmic Execution Roadmap
            </span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest"
            style={{
              color: G.bright,
              background: G.dimBg,
              border: `1px solid ${G.border}`,
            }}
          >
            <Lock className="w-2.5 h-2.5" /> Pro
          </div>
        </div>

        {/* FOMO silhouette */}
        <div className="relative overflow-hidden">
          <div
            className="flex gap-0 overflow-hidden select-none"
            style={{ height: 240 }}
          >
            {[0, 1, 2, 3].map((i) => (
              <GhostAlgoCard key={i} index={i} />
            ))}
          </div>

          {/* Overlay */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4"
            style={{
              background:
                "linear-gradient(to right, rgba(3,3,3,0.1) 0%, rgba(3,3,3,0.75) 40%, rgba(3,3,3,0.95) 100%)",
            }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{
                  background: G.dimBg,
                  border: `1px solid ${G.border}`,
                  boxShadow: `0 0 40px rgba(191,162,100,0.15)`,
                }}
              >
                <Crown className="w-5 h-5" style={{ color: G.bright }} />
              </div>
              <div>
                <p
                  className="text-base font-black mb-1"
                  style={{
                    color: T.primary,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Your Execution Roadmap
                </p>
                <p
                  className="text-[11px] max-w-[260px] leading-relaxed"
                  style={{ color: T.dim }}
                >
                  AI-ranked curriculum matched to your domain, niche, and skill
                  gap.
                </p>
              </div>
              <button
                onClick={() => navigate("/premium")}
                className="flex items-center gap-2 px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.15em] transition-all"
                style={{
                  background: G.base,
                  color: "#030303",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                <Crown className="w-3 h-3" /> Unlock at ₹139/mo
              </button>
            </div>
          </div>
        </div>

        {/* Bottom divider */}
        <div
          className="h-px mx-6 mt-3"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      </div>
    );
  }

  // ── Premium: No profile set ───────────────────────────────────────────────
  if (isPremium && !hasProfile) {
    return (
      <div className="px-6 py-4 flex items-center gap-3">
        <Target className="w-4 h-4" style={{ color: T.dim }} />
        <p className="text-[11px]" style={{ color: T.dim }}>
          Complete your profile domain & niche to activate the Algorithmic
          Roadmap.
        </p>
      </div>
    );
  }

  // ── Premium: No ranked items yet (items not loaded) ───────────────────────
  if (isPremium && rankedItems.length === 0) {
    return (
      <div className="px-6 py-4 flex items-center gap-3">
        <TrendingUp className="w-4 h-4" style={{ color: G.base }} />
        <p className="text-[11px]" style={{ color: T.secondary }}>
          Algorithmic roadmap is computing…
        </p>
      </div>
    );
  }

  // ── Premium: Show ranked feed ─────────────────────────────────────────────
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" style={{ color: G.bright }} />
          <div>
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                color: G.bright,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Your Execution Roadmap
            </span>
            <span
              className="ml-2 text-[8px] font-bold uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              {rankedItems.length} ranked
            </span>
          </div>
        </div>

        {/* Scroll controls (PC only) */}
        {!isMobile && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className="w-7 h-7 flex items-center justify-center transition-all disabled:opacity-20"
              style={{ color: canScrollLeft ? G.bright : T.dim }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className="w-7 h-7 flex items-center justify-center transition-all disabled:opacity-20"
              style={{ color: canScrollRight ? G.bright : T.dim }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Ranked scroll strip */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-0 overflow-x-auto hide-scrollbar"
        style={{
          scrollSnapType: isMobile ? "x mandatory" : "none",
        }}
      >
        {rankedItems.map(({ item, type, algoData }, idx) => (
          <div
            key={item.id}
            style={{ scrollSnapAlign: isMobile ? "start" : "none" }}
          >
            <AlgoCard
              item={item}
              type={type}
              rank={idx + 1}
              algoData={algoData}
              completion={completionMap[item.discotiveLearnId]}
              onSelect={onSelect}
            />
          </div>
        ))}

        {/* CTA tail */}
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-2 px-8"
          style={{ width: 160, background: V.depth }}
        >
          <ArrowRight className="w-5 h-5" style={{ color: T.dim }} />
          <p
            className="text-[9px] font-black uppercase tracking-widest text-center"
            style={{ color: T.dim }}
          >
            Browse full library below
          </p>
        </div>
      </div>

      {/* Bottom divider */}
      <div
        className="h-px mx-6 mt-3"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />
    </div>
  );
};

PremiumAlgoFeed.displayName = "PremiumAlgoFeed";
export default PremiumAlgoFeed;
