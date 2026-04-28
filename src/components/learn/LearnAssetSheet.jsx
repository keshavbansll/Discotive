/**
 * @fileoverview LearnAssetSheet.jsx — Discotive Learn Asset Detail Overlay
 * @module Components/Learn/LearnAssetSheet
 *
 * Handles deep-dive view for both certificates and videos.
 *
 * CERT MODE:
 *  - Full metadata display (skills, domains, industry relevance)
 *  - External course link CTA
 *  - "Upload Certificate" CTA → routes to /app/vault with prefill
 *  - Completion state display
 *
 * VIDEO MODE:
 *  - Embedded YouTube player via useYouTubePlayer hook
 *  - Live watch progress bar (gold)
 *  - Proportional score calculation (calculateVideoScore)
 *  - Snapshot on close (awards proportional points)
 *
 * LAYOUT:
 *  Mobile: full-screen bottom sheet, swipe-to-dismiss
 *  PC: centered overlay modal (max-w-3xl), click-outside to close
 *
 * DESIGN RULES (SKILL.md):
 *  - NO floating pills in negative space
 *  - NO rounded bento boxes
 *  - Background depth hierarchy, not borders
 *  - Gold (#BFA264) accent system
 *  - Edge-to-edge on mobile
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  ExternalLink,
  Upload,
  Check,
  Clock,
  Zap,
  Award,
  Play,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Lock,
  Headphones,
} from "lucide-react";

import { useYouTubePlayer, YT_STATE } from "../../hooks/useYouTubePlayer";
import { calculateVideoScore } from "../../lib/discotiveLearn";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ── Industry relevance config ─────────────────────────────────────────────────
const RELEVANCE_CFG = {
  Strong: { color: "#4ADE80", width: "100%" },
  Medium: { color: G.bright, width: "60%" },
  Weak: { color: T.dim, width: "25%" },
};

// ── Skill tag list ────────────────────────────────────────────────────────────
const SkillList = memo(({ label, skills = [], color }) => {
  if (!skills?.length) return null;
  return (
    <div>
      <p
        className="text-[8px] font-black uppercase tracking-[0.2em] mb-2"
        style={{ color: T.dim }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {skills.slice(0, 6).map((s) => (
          <span
            key={s}
            className="text-[9px] font-bold px-2 py-1"
            style={{
              color,
              background: `${color}10`,
              border: `1px solid ${color}20`,
            }}
          >
            {s}
          </span>
        ))}
        {skills.length > 6 && (
          <span className="text-[9px] px-2 py-1" style={{ color: T.dim }}>
            +{skills.length - 6} more
          </span>
        )}
      </div>
    </div>
  );
});

// ── Score reward chip ─────────────────────────────────────────────────────────
const ScoreChip = memo(({ amount, earned, total }) => {
  const display = earned != null ? earned : amount;
  const isPartial = earned != null && earned < (total || amount);
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2"
      style={{
        background: G.dimBg,
        border: `1px solid ${G.border}`,
      }}
    >
      <Zap className="w-3.5 h-3.5" style={{ color: G.bright }} />
      <span
        className="text-[11px] font-black"
        style={{ color: G.bright, fontFamily: "'Montserrat', sans-serif" }}
      >
        +{display}
      </span>
      <span className="text-[9px]" style={{ color: T.dim }}>
        {isPartial ? `/ ${total} pts` : "pts"}
      </span>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO PLAYER PANEL
// ─────────────────────────────────────────────────────────────────────────────
const VideoPlayerPanel = memo(({ item, completion, isPremium }) => {
  const [earnedScore, setEarnedScore] = useState(null);
  const [watchPct, setWatchPct] = useState(0);

  const handleProgress = useCallback((prog) => {
    setWatchPct(prog.percentage);
    const result = calculateVideoScore(prog.percentage);
    setEarnedScore(result.earned);
  }, []);

  const { containerRef, isReady, playerState, progress } = useYouTubePlayer(
    item.youtubeId,
    { onProgress: handleProgress, autoplay: false },
  );

  const scoreResult = useMemo(() => calculateVideoScore(watchPct), [watchPct]);

  const isPlaying = playerState === YT_STATE.PLAYING;
  const isCompleted = completion?.verified;

  return (
    <div className="flex flex-col gap-0">
      {/* Player container — 16/9 */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: "16/9",
          background: "#000",
        }}
      >
        {/* YouTube iframe target */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Loading overlay */}
        {!isReady && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "#000" }}
          >
            <div
              className="relative"
              style={{
                backgroundImage: item.youtubeId
                  ? `url(https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg)`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "rgba(0,0,0,0.6)" }}
              />
              <div className="relative flex items-center justify-center w-16 h-16">
                <Play className="w-8 h-8" style={{ color: G.bright }} />
              </div>
            </div>
          </div>
        )}

        {/* Completed overlay */}
        {isCompleted && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5"
            style={{
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.35)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">
              Verified
            </span>
          </div>
        )}
      </div>

      {/* Watch progress bar */}
      <div
        className="h-1 w-full"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <motion.div
          className="h-full"
          animate={{ width: `${watchPct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            background:
              watchPct >= 95
                ? "#4ADE80"
                : `linear-gradient(90deg, ${G.deep}, ${G.bright})`,
          }}
        />
      </div>

      {/* Watch stats */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: V.depth }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: T.dim }} />
          <span className="text-[10px]" style={{ color: T.secondary }}>
            {Math.floor(watchPct)}% watched
          </span>
        </div>
        <ScoreChip
          amount={item.scoreReward || 10}
          earned={scoreResult.earned}
          total={item.scoreReward || 10}
        />
      </div>

      {/* Score tier message */}
      {watchPct > 0 && (
        <div className="px-5 py-2" style={{ background: V.surface }}>
          <p
            className="text-[9px]"
            style={{ color: scoreResult.earned > 0 ? G.bright : T.dim }}
          >
            {scoreResult.message}
          </p>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CERT DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
const CertDetailPanel = memo(
  ({ item, completion, isPremium, onNavigateVault }) => {
    const isCompleted = completion?.verified;
    const isPending = completion?.pending;

    const relevanceCfg = RELEVANCE_CFG[item.industryRelevance];

    return (
      <div className="flex flex-col gap-0">
        {/* Thumbnail hero */}
        <div className="relative w-full" style={{ aspectRatio: "16/7" }}>
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.title}
              className="w-full h-full object-cover opacity-70"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: V.depth }}
            >
              <Award
                className="w-12 h-12"
                style={{ color: "rgba(255,255,255,0.04)" }}
              />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 30%, rgba(3,3,3,0.95) 100%)",
            }}
          />

          {/* Completion overlay */}
          {isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/40">
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  background: "#10b981",
                  boxShadow: "0 0 40px rgba(16,185,129,0.5)",
                }}
              >
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </div>
          )}

          {/* Bottom overlay chips */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {item.difficulty && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {item.difficulty}
                </span>
              )}
              {item.isPaid ? (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    color: "#a78bfa",
                    border: "1px solid rgba(167,139,250,0.3)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  Paid
                </span>
              ) : (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-2 py-1"
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    color: "#4ADE80",
                    border: "1px solid rgba(74,222,128,0.3)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  Free
                </span>
              )}
            </div>
            {item.scoreReward > 0 && (
              <span
                className="flex items-center gap-1 px-2 py-1 text-[8px] font-black"
                style={{
                  background: "rgba(0,0,0,0.75)",
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                  backdropFilter: "blur(4px)",
                }}
              >
                <Zap className="w-2.5 h-2.5" />+{item.scoreReward}
              </span>
            )}
          </div>
        </div>

        {/* Industry relevance bar */}
        {relevanceCfg && (
          <div
            className="px-5 py-3 flex items-center gap-3"
            style={{
              background: V.depth,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="flex-1 h-0.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: relevanceCfg.width }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="h-full"
                style={{ background: relevanceCfg.color }}
              />
            </div>
            <span
              className="text-[8px] font-black uppercase tracking-widest shrink-0"
              style={{ color: relevanceCfg.color }}
            >
              {item.industryRelevance} Industry Relevance
            </span>
          </div>
        )}

        {/* Status bar */}
        {(isCompleted || isPending) && (
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{
              background: isCompleted
                ? "rgba(16,185,129,0.06)"
                : "rgba(191,162,100,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {isCompleted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  Certificate Verified
                </span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" style={{ color: G.bright }} />
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: G.bright }}
                >
                  Pending Vault Verification
                </span>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

// =============================================================================
// LEARN ASSET SHEET
// =============================================================================
const LearnAssetSheet = ({
  item,
  type, // 'cert' | 'video'
  completion,
  onClose,
  userData,
  isPremium,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const isCompleted = completion?.verified;
  const isPending = completion?.pending;

  const handleOpenCourse = useCallback(() => {
    if (item.link) {
      window.open(item.link, "_blank", "noopener,noreferrer");
    }
  }, [item.link]);

  const handleUploadCert = useCallback(() => {
    onClose();
    // Navigate to vault with learn ID prefill
    navigate(
      `/app/vault?learnId=${item.discotiveLearnId}&title=${encodeURIComponent(item.title)}`,
    );
  }, [item, navigate, onClose]);

  // ── Duration display ──────────────────────────────────────────────────────
  const durationDisplay = useMemo(() => {
    if (type === "video" && item.durationMinutes) {
      const h = Math.floor(item.durationMinutes / 60);
      const m = item.durationMinutes % 60;
      return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
    }
    return item.duration || null;
  }, [type, item]);

  // ── Backdrop + sheet motion variants ─────────────────────────────────────
  const mobileVariants = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  };

  const pcVariants = {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.97, y: 4 },
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex">
        {/* ── Backdrop ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
          }}
        />

        {/* ── Sheet / Modal ───────────────────────────────────────────────── */}
        <motion.div
          {...(isMobile ? mobileVariants : pcVariants)}
          transition={{ type: "spring", damping: 30, stiffness: 380 }}
          drag={isMobile ? "y" : false}
          dragConstraints={isMobile ? { top: 0, bottom: 0 } : undefined}
          dragElastic={isMobile ? { top: 0, bottom: 0.3 } : undefined}
          onDragEnd={
            isMobile
              ? (_, info) => {
                  if (info.offset.y > 120) onClose();
                }
              : undefined
          }
          className={
            isMobile
              ? "absolute bottom-0 left-0 right-0 flex flex-col overflow-hidden"
              : "relative m-auto flex flex-col overflow-hidden w-full"
          }
          style={{
            background: V.depth,
            maxHeight: isMobile ? "92dvh" : "88vh",
            maxWidth: isMobile ? undefined : 768,
            borderTop: isMobile
              ? `1px solid rgba(255,255,255,0.07)`
              : undefined,
            border: !isMobile ? `1px solid rgba(255,255,255,0.07)` : undefined,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
            </div>
          )}

          {/* ── HEADER ────────────────────────────────────────────────────── */}
          <div
            className="flex items-start justify-between px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex-1 pr-4 min-w-0">
              {/* Provider / category */}
              <p
                className="text-[8px] font-bold uppercase tracking-[0.2em] mb-1.5"
                style={{ color: T.dim }}
              >
                {item.provider || item.category || "Discotive Learn"}
              </p>
              {/* Title */}
              <h2
                className="text-[15px] font-black leading-snug"
                style={{
                  color: T.primary,
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {item.title}
              </h2>
              {/* Meta row */}
              <div className="flex items-center gap-3 mt-2">
                {durationDisplay && (
                  <span
                    className="flex items-center gap-1 text-[9px]"
                    style={{ color: T.dim }}
                  >
                    <Clock className="w-3 h-3" /> {durationDisplay}
                  </span>
                )}
                {item.discotiveLearnId && (
                  <span
                    className="text-[8px] font-mono"
                    style={{ color: T.dim }}
                  >
                    {item.discotiveLearnId}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center shrink-0 transition-all"
              style={{
                color: T.dim,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── SCROLLABLE BODY ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Media section */}
            {type === "video" ? (
              <VideoPlayerPanel
                item={item}
                completion={completion}
                isPremium={isPremium}
              />
            ) : (
              <CertDetailPanel
                item={item}
                completion={completion}
                isPremium={isPremium}
                onNavigateVault={handleUploadCert}
              />
            )}

            {/* ── METADATA BODY ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-6 px-5 py-6">
              {/* Description */}
              {item.description && (
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-2"
                    style={{ color: T.dim }}
                  >
                    About
                  </p>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: T.secondary }}
                  >
                    {item.description}
                  </p>
                </div>
              )}

              {/* Domains */}
              {item.domains?.length > 0 && (
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-2"
                    style={{ color: T.dim }}
                  >
                    Domains
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.domains.map((d) => (
                      <span
                        key={d}
                        className="text-[9px] font-bold px-2 py-1"
                        style={{
                          color: G.bright,
                          background: G.dimBg,
                          border: `1px solid ${G.border}`,
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              <SkillList
                label="Skills Gained"
                skills={item.skillsGained}
                color="#4ADE80"
              />
              <SkillList
                label="Prerequisites"
                skills={item.skillsRequired}
                color={G.bright}
              />

              {/* Tags */}
              {item.tags?.length > 0 && (
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-2"
                    style={{ color: T.dim }}
                  >
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-2 py-1"
                        style={{
                          color: T.dim,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expiry warning */}
              {item.expiresAt && (
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span
                    className="text-[9px]"
                    style={{ color: "rgba(245,158,11,0.8)" }}
                  >
                    Certificate expires{" "}
                    {new Date(
                      item.expiresAt?.seconds
                        ? item.expiresAt.seconds * 1000
                        : item.expiresAt,
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}

              {/* Portfolio lock notice */}
              {!isPremium && type === "cert" && (
                <div
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <Lock
                    className="w-4 h-4 shrink-0"
                    style={{ color: G.bright }}
                  />
                  <div>
                    <p
                      className="text-[10px] font-black"
                      style={{ color: G.bright }}
                    >
                      Learn Portfolio
                    </p>
                    <p className="text-[9px] mt-0.5" style={{ color: T.dim }}>
                      Track all verified certificates in one place. Pro feature.
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-2" />
            </div>
          </div>

          {/* ── STICKY CTA BAR ────────────────────────────────────────────── */}
          <div
            className="shrink-0 px-5 py-4 flex gap-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: V.depth,
              paddingBottom: isMobile
                ? "calc(env(safe-area-inset-bottom) + 16px)"
                : 16,
            }}
          >
            {type === "cert" ? (
              <>
                {/* Open course */}
                <button
                  onClick={handleOpenCourse}
                  className="flex-1 h-13 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
                  style={{
                    background: G.base,
                    color: "#030303",
                    fontFamily: "'Montserrat', sans-serif",
                    minHeight: 52,
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Course
                </button>

                {/* Upload cert */}
                {!isCompleted && (
                  <button
                    onClick={handleUploadCert}
                    className="flex-1 h-13 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
                    style={{
                      background: V.surface,
                      color: T.secondary,
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontFamily: "'Montserrat', sans-serif",
                      minHeight: 52,
                    }}
                  >
                    <Upload className="w-4 h-4" />
                    {isPending ? "Check Status" : "Upload Cert"}
                  </button>
                )}
              </>
            ) : (
              /* Video: open on YouTube */
              <button
                onClick={() =>
                  window.open(
                    `https://www.youtube.com/watch?v=${item.youtubeId}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="flex items-center gap-2 px-5 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
                style={{
                  background: V.surface,
                  color: T.dim,
                  border: "1px solid rgba(255,255,255,0.07)",
                  fontFamily: "'Montserrat', sans-serif",
                  minHeight: 52,
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                YouTube
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

LearnAssetSheet.displayName = "LearnAssetSheet";
export default LearnAssetSheet;
