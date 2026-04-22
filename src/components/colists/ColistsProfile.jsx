/**
 * @fileoverview ColistsProfile — Personal Colist Intelligence Dashboard
 * @description Tracks stats, resonance, reading progress, saved colists,
 * and the user's own publications (published + drafts) with per-colist analytics.
 *
 * Place at: src/components/colists/ColistsProfile.jsx
 *
 * Usage:
 *   import ColistsProfile from "@/components/colists/ColistsProfile";
 *   <ColistsProfile onRead={(colist) => handleOpenReader(colist)} />
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
// eslint-disable-next-line no-unused-vars
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useUserData } from "../../hooks/useUserData";
import { cn } from "../../lib/cn";
import {
  BookOpen,
  Eye,
  Bookmark,
  Globe,
  Lock,
  Share2,
  Crown,
  Star,
  TrendingUp,
  ArrowRight,
  BarChart2,
  Edit3,
  Plus,
  Copy,
  Check,
  Flame,
  Zap,
  Award,
  Clock,
  Heart,
  X,
  Shield,
  ArrowUpRight,
  Play,
  Activity,
  Layers,
  PenTool,
  FileText,
  BookMarked,
  Users,
  RefreshCw,
  ChevronRight,
  MoreHorizontal,
  MoreVertical,
  LayoutGrid,
  List,
  Search,
  Trash,
  Trash2,
} from "lucide-react";

/* ─── Design Tokens (mirrors Discotive Gold & Void system) ──────────────── */
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
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

/* ─── Resonance Milestones ───────────────────────────────────────────────── */
const RESONANCE_MILESTONES = [
  { threshold: 50, globalPts: 5, emoji: "✨" },
  { threshold: 100, globalPts: 10, emoji: "⚡" },
  { threshold: 250, globalPts: 20, emoji: "🔥" },
  { threshold: 500, globalPts: 35, emoji: "💎" },
  { threshold: 1000, globalPts: 50, emoji: "👑" },
];

/* ─── Progress key helper ────────────────────────────────────────────────── */
const PROGRESS_KEY = (uid, colistId) => `colist_progress_${uid}_${colistId}`;

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/* ─── Animated Resonance Ring ────────────────────────────────────────────── */
const ResonanceRing = memo(({ score = 0, size = 80, showMilestone = true }) => {
  const next = RESONANCE_MILESTONES.find((m) => m.threshold > (score || 0));
  const prev = [...RESONANCE_MILESTONES]
    .reverse()
    .find((m) => m.threshold <= (score || 0));
  const pct = next
    ? Math.min(
        100,
        ((score - (prev?.threshold || 0)) /
          (next.threshold - (prev?.threshold || 0))) *
          100,
      )
    : 100;

  const strokeW = size * 0.075;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ width: size, height: size, position: "relative" }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(191,162,100,0.12)"
            strokeWidth={strokeW}
          />
          {/* Fill */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={G.bright}
            strokeWidth={strokeW}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${G.bright}80)` }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0">
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display font-black leading-none"
            style={{ fontSize: size * 0.19, color: G.bright }}
          >
            {score >= 1000 ? `${(score / 1000).toFixed(1)}K` : score}
          </motion.span>
          <span
            className="font-bold uppercase tracking-widest"
            style={{ fontSize: size * 0.085, color: T.dim }}
          >
            resonance
          </span>
        </div>
      </div>
      {showMilestone && next && (
        <p
          className="text-center font-mono"
          style={{ fontSize: 9, color: T.dim, lineHeight: 1.4 }}
        >
          <span style={{ color: G.base }}>{next.threshold - score}</span> to
          <span style={{ color: G.bright }}>+{next.globalPts}pts</span>
        </p>
      )}
    </div>
  );
});

/* ─── Stat Tile ──────────────────────────────────────────────────────────── */
const StatTile = memo(
  ({
    // eslint-disable-next-line no-unused-vars
    icon: Icon,
    label,
    value,
    color = G.base,
    animate: shouldAnim = true,
    className = "",
    comingSoon = false,
  }) => {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
      if (!shouldAnim || typeof value !== "number") {
        requestAnimationFrame(() => setDisplay(value));
        return;
      }
      let start;
      const dur = 900;
      const anim = (t) => {
        if (!start) start = t;
        const p = Math.min((t - start) / dur, 1);
        const ease = 1 - Math.pow(2, -10 * p);
        setDisplay(Math.floor(value * ease));
        if (p < 1) requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }, [value, shouldAnim]);

    return (
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 rounded-2xl border px-4 py-4 text-center cursor-default shrink-0 overflow-hidden group",
          className,
        )}
        style={{
          background: V.surface,
          borderColor: `${color}22`,
          minWidth: 82,
        }}
      >
        {comingSoon && (
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-[#050505]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex flex-col items-center gap-1">
              <Lock size={14} style={{ color: G.bright }} />
              <span
                className="text-[7px] font-black uppercase tracking-widest"
                style={{ color: G.bright }}
              >
                Locked
              </span>
            </div>
          </div>
        )}
        <Icon size={14} style={{ color }} className="relative z-0" />
        <span
          className="font-display font-black text-xl leading-none relative z-0"
          style={{ color: T.primary }}
        >
          {typeof display === "number" ? display.toLocaleString() : display}
        </span>
        <span
          className="font-bold uppercase tracking-widest relative z-0"
          style={{ fontSize: 8, color: T.dim }}
        >
          {label}
        </span>
      </motion.div>
    );
  },
);

/* ─── Undo Toast ─────────────────────────────────────────────────────────── */
const UndoToast = memo(({ onUndo, onDismiss, itemTitle }) => {
  const [timeLeft, setTimeLeft] = useState(25);

  useEffect(() => {
    const t = setInterval(
      () =>
        setTimeLeft((p) => {
          if (p <= 1) {
            clearInterval(t);
            onDismiss();
            return 0;
          }
          return p - 1;
        }),
      200,
    );
    return () => clearInterval(t);
  }, [onDismiss]);

  const pct = (timeLeft / 25) * 100;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: V.elevated,
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: 280,
      }}
    >
      <div className="relative w-8 h-8">
        <svg width="32" height="32" className="-rotate-90">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2.5"
          />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="#F87171"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 13}`}
            style={{
              strokeDashoffset: 2 * Math.PI * 13 * (1 - pct / 100),
              transition: "stroke-dashoffset 0.2s linear",
            }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-black"
          style={{ color: "#F87171" }}
        >
          {Math.ceil(timeLeft / 5)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold" style={{ color: T.primary }}>
          1 item deleted
        </p>
        <p
          className="text-[10px] truncate max-w-[120px]"
          style={{ color: T.dim }}
        >
          {itemTitle}
        </p>
      </div>
      <button
        onClick={onUndo}
        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
        style={{
          background: G.dimBg,
          border: `1px solid ${G.border}`,
          color: G.bright,
        }}
      >
        Undo
      </button>
    </motion.div>
  );
});

/* ─── Colist Row ─────────────────────────────────────────────────────────── */
const ColistRow = memo(
  ({
    colist,
    onRead,
    onEdit,
    onShare,
    onDelete,
    progress = null,
    showShare = true,
    isOwner = false,
    view = "list",
  }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const x = useMotionValue(0);
    const bg = useTransform(
      x,
      [-100, 0],
      ["rgba(239,68,68,0.9)", "rgba(255,255,255,0)"],
    );
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const blockCount = useMemo(
      () => (colist.blocks || []).filter((b) => b.type !== "divider").length,
      [colist.blocks],
    );
    const mins = useMemo(() => {
      const words = (colist.blocks || []).reduce((acc, b) => {
        const txt = [b.content, b.title, b.description]
          .filter(Boolean)
          .join(" ");
        return acc + txt.split(/\s+/).filter(Boolean).length;
      }, 0);
      return Math.max(1, Math.ceil(words / 200));
    }, [colist.blocks]);

    const pagesRead = progress?.pagesRead?.length || 0;
    const progressPct = blockCount > 0 ? (pagesRead / blockCount) * 100 : 0;
    const isComplete = pagesRead >= blockCount && blockCount > 0;
    const hasProgress = pagesRead > 0 && !isComplete;
    const isDraft = !colist.isPublic;

    return (
      <motion.div layout className="relative rounded-2xl">
        {isOwner && isMobile && view === "list" && (
          <motion.div
            className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl pointer-events-none z-0"
            style={{ background: bg }}
          >
            <Trash2 size={18} style={{ color: "white" }} />
          </motion.div>
        )}
        <motion.div
          drag={isOwner && isMobile && view === "list" ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.7, right: 0 }}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(_, info) => {
            setIsDragging(false);
            if (info.offset.x < -80) onDelete?.(colist);
          }}
          whileHover={view === "list" && !isMobile ? { x: 4 } : { y: -4 }}
          onClick={() => !isDragging && onRead?.(colist)}
          className={cn(
            "group cursor-pointer relative",
            view === "list"
              ? "flex items-center gap-4 p-4 rounded-2xl"
              : "flex flex-col gap-3 p-4 rounded-2xl h-full",
          )}
          style={{
            x: isOwner && isMobile && view === "list" ? x : 0,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.05)",
            transition: isDragging ? "none" : "background 0.2s",
          }}
        >
          {/* Background container with overflow-hidden for hover effect without clipping absolute elements */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  view === "list"
                    ? "radial-gradient(ellipse at 0% 50%, rgba(191,162,100,0.05) 0%, transparent 70%)"
                    : "radial-gradient(ellipse at 50% 0%, rgba(191,162,100,0.05) 0%, transparent 70%)",
              }}
            />
          </div>

          {/* Cover swatch */}
          <div
            className={cn(
              "rounded-xl shrink-0 flex items-center justify-center overflow-hidden relative z-10",
              view === "list" ? "w-14 h-14" : "w-full h-24",
            )}
            style={{
              background:
                colist.coverGradient ||
                "linear-gradient(135deg,#8B7240,#D4AF78)",
            }}
          >
            <BookOpen
              size={view === "list" ? 18 : 24}
              style={{ color: "rgba(255,255,255,0.55)" }}
            />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 relative z-10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-0.5">
              <h3
                className="text-sm font-black truncate"
                style={{ color: T.primary }}
              >
                {colist.title}
              </h3>
              {colist.isPublic ? (
                <Globe
                  size={9}
                  style={{ color: G.base }}
                  className="shrink-0"
                />
              ) : (
                <Lock size={9} style={{ color: T.dim }} className="shrink-0" />
              )}
            </div>

            {isDraft && colist.description && (
              <p
                className="text-[10px] line-clamp-2 mt-1"
                style={{ color: T.secondary }}
              >
                {colist.description}
              </p>
            )}

            {!isDraft && (
              <div className="flex items-center gap-3 flex-wrap mt-1">
                {[
                  { I: Eye, v: colist.viewCount || 0 },
                  { I: Bookmark, v: colist.saveCount || 0 },
                  { I: Clock, v: `${mins}m` },
                  { I: Layers, v: `${blockCount}p` },
                ].map(
                  // eslint-disable-next-line no-unused-vars
                  ({ I, v }, i) => (
                    <span
                      key={i}
                      className="font-mono flex items-center gap-1"
                      style={{ fontSize: 9, color: T.dim }}
                    >
                      <I size={8} /> {v}
                    </span>
                  ),
                )}
              </div>
            )}

            {/* Progress bar */}
            {!isDraft && (hasProgress || isComplete) && (
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
                      background: isComplete ? "#4ADE80" : G.bright,
                    }}
                  />
                </div>
                <span
                  className="font-black"
                  style={{
                    fontSize: 8,
                    color: isComplete ? "#4ADE80" : G.bright,
                  }}
                >
                  {isComplete ? "✓" : `${pagesRead}/${blockCount}`}
                </span>
              </div>
            )}
          </div>

          {/* Right side / Bottom side */}
          <div
            className={cn(
              "flex items-center gap-2 shrink-0 relative z-20",
              view === "list"
                ? "flex-col items-end"
                : "justify-between mt-auto pt-2 border-t border-white/5",
            )}
          >
            {/* Resonance badge */}
            {!isDraft && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <Heart size={8} style={{ color: G.bright }} />
                <span
                  className="font-black font-mono"
                  style={{ fontSize: 8, color: G.bright }}
                >
                  {colist.colistScore || 0}
                </span>
              </div>
            )}
            {isDraft && <div className="flex-1" />}

            {/* Actions (owner only) */}
            {isOwner ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  style={{ color: T.dim, background: "rgba(255,255,255,0.04)" }}
                >
                  <MoreVertical size={14} />
                </motion.button>
                {showMenu && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                )}
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      className="absolute right-0 top-full mt-2 w-28 border border-white/10 rounded-xl p-1 z-50 flex flex-col shadow-2xl origin-top-right"
                      style={{ background: "#1A1A1A" }}
                    >
                      {isDraft && onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onEdit?.(colist);
                          }}
                          className="px-3 py-2 text-[10px] font-bold text-left hover:bg-white/5 rounded-lg flex items-center gap-2 text-white transition-colors"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      )}
                      {!isDraft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            onShare?.(colist);
                          }}
                          className="px-3 py-2 text-[10px] font-bold text-left hover:bg-white/5 rounded-lg flex items-center gap-2 text-white transition-colors"
                        >
                          <Share2 size={12} /> Share
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onDelete?.(colist);
                        }}
                        className="px-3 py-2 text-[10px] font-bold text-left hover:bg-red-500/10 rounded-lg flex items-center gap-2 text-red-400 transition-colors"
                      >
                        <Trash size={12} /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              showShare &&
              !isDraft && (
                <motion.button
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.(colist);
                  }}
                  className="p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  style={{ color: T.dim, background: "rgba(255,255,255,0.04)" }}
                >
                  <Share2 size={11} />
                </motion.button>
              )
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

/* ─── Currently Reading Card ─────────────────────────────────────────────── */
const ReadingCard = memo(({ colist, progress, onResume }) => {
  const blockCount = useMemo(
    () => (colist.blocks || []).filter((b) => b.type !== "divider").length,
    [colist.blocks],
  );
  const pagesRead = progress?.pagesRead?.length || 0;
  const resumeIdx = progress?.pageIndex || 0;
  const pct =
    blockCount > 0 ? Math.min(100, (pagesRead / blockCount) * 100) : 0;

  const r = 13;
  const circ = 2 * Math.PI * r;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onResume?.(colist)}
      className="relative shrink-0 cursor-pointer rounded-2xl overflow-hidden"
      style={{ width: 190, height: 275, scrollSnapAlign: "start" }}
    >
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            colist.coverGradient || "linear-gradient(135deg,#8B7240,#D4AF78)",
        }}
      />
      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 25%, rgba(3,3,3,0.92) 100%)",
        }}
      />

      {/* Mini progress ring */}
      <div className="absolute top-3 right-3">
        <div style={{ width: 34, height: 34, position: "relative" }}>
          <svg width={34} height={34} className="-rotate-90">
            <circle
              cx={17}
              cy={17}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={3}
            />
            <motion.circle
              cx={17}
              cy={17}
              r={r}
              fill="none"
              stroke={G.bright}
              strokeWidth={3}
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-black font-mono"
            style={{ fontSize: 7, color: G.bright }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p
          className="font-black leading-tight line-clamp-2 mb-1.5"
          style={{ fontSize: 13, color: T.primary }}
        >
          {colist.title}
        </p>
        <p className="font-mono mb-3" style={{ fontSize: 9, color: T.dim }}>
          Page {resumeIdx + 1} of {blockCount}
        </p>

        <motion.div
          whileHover={{ scale: 1.04 }}
          className="flex items-center justify-center gap-2 py-2 rounded-xl"
          style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
        >
          <Play size={10} style={{ color: G.bright }} />
          <span
            className="font-black uppercase tracking-widest"
            style={{ fontSize: 9, color: G.bright }}
          >
            Resume
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
});

/* ─── Resonance Milestone Bar ────────────────────────────────────────────── */
const MilestoneBadge = memo(({ milestone, hit, current }) => {
  const pct = hit
    ? 100
    : Math.min(
        100,
        ((current -
          (RESONANCE_MILESTONES[RESONANCE_MILESTONES.indexOf(milestone) - 1]
            ?.threshold || 0)) /
          (milestone.threshold -
            (RESONANCE_MILESTONES[RESONANCE_MILESTONES.indexOf(milestone) - 1]
              ?.threshold || 0))) *
          100,
      );

  return (
    <motion.div
      whileHover={{ scale: 1.06 }}
      className="flex flex-col items-center p-3 rounded-2xl border text-center relative overflow-hidden"
      style={{
        background: hit ? G.dimBg : "rgba(255,255,255,0.02)",
        borderColor: hit ? G.border : "rgba(255,255,255,0.05)",
        opacity: hit ? 1 : 0.55,
        minWidth: 64,
      }}
    >
      {hit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 0%,rgba(191,162,100,0.15) 0%,transparent 70%)",
          }}
        />
      )}
      <span className="text-lg mb-1 relative z-10">
        {hit ? milestone.emoji : "🔒"}
      </span>
      <span
        className="font-black relative z-10"
        style={{ fontSize: 9, color: hit ? G.bright : T.dim }}
      >
        {milestone.threshold}
      </span>
      <span
        className="font-mono relative z-10"
        style={{ fontSize: 7, color: T.dim }}
      >
        +{milestone.globalPts}pts
      </span>

      {/* Progress sliver at bottom */}
      {!hit && pct > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: G.base }}
          />
        </div>
      )}
    </motion.div>
  );
});

/* ─── Empty State ────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
const EmptyState = memo(({ icon: Icon, title, sub, ctaLabel, onCta }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-14 text-center"
  >
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Icon size={28} style={{ color: "rgba(255,255,255,0.15)" }} />
    </div>
    <p className="font-black text-sm mb-2" style={{ color: T.dim }}>
      {title}
    </p>
    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{sub}</p>
    {ctaLabel && onCta && (
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onCta}
        className="mt-5 flex items-center gap-2 px-6 py-3 rounded-full"
        style={{
          background: G.dimBg,
          border: `1px solid ${G.border}`,
          color: G.bright,
          fontSize: 10,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        <Plus size={11} /> {ctaLabel}
      </motion.button>
    )}
  </motion.div>
));

/* ─── Tab Button ─────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
const TabBtn = memo(({ id, label, icon: Icon, active, onClick, count }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={() => onClick(id)}
    className="relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black uppercase tracking-widest"
    style={{
      fontSize: 10,
      color: active ? "#000" : T.dim,
      zIndex: 1,
    }}
  >
    {active && (
      <motion.div
        layoutId="colist-profile-tab-bg"
        className="absolute inset-0 rounded-xl"
        style={{ background: "linear-gradient(135deg,#8B7240,#D4AF78)" }}
        transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
      />
    )}
    <Icon size={13} className="relative z-10" />
    <span className="relative z-10 hidden sm:inline">{label}</span>
    {count > 0 && !active && (
      <span
        className="relative z-10 font-black font-mono rounded-full px-1.5 py-0.5 hidden sm:inline"
        style={{
          fontSize: 7,
          background: G.dimBg,
          color: G.base,
          border: `1px solid ${G.border}`,
        }}
      >
        {count}
      </span>
    )}
  </motion.button>
));

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const ColistsProfile = ({ onRead, onEdit }) => {
  const { currentUser } = useAuth();
  const { userData } = useUserData();
  const navigate = useNavigate();
  const uid = currentUser?.uid;

  const [myColists, setMyColists] = useState([]);
  const [savedColists, setSavedColists] = useState([]);
  const [readingColists, setReadingColists] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeFilter, setActiveFilter] = useState("all"); // all | published | drafts
  const [mySearch, setMySearch] = useState("");
  const [myView, setMyView] = useState("list"); // "list" | "grid"
  const [savedSearch, setSavedSearch] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [undoState, setUndoState] = useState(null);
  const fetchedRef = useRef(false);

  const handleDelete = useCallback(async (colist) => {
    try {
      // Optimistic delete
      setMyColists((prev) => prev.filter((c) => c.id !== colist.id));
      setSavedColists((prev) => prev.filter((c) => c.id !== colist.id));
      setReadingColists((prev) => prev.filter((c) => c.id !== colist.id));

      setUndoState({ colist });

      // Actual deletion execution
      await deleteDoc(doc(db, "colists", colist.id));
    } catch (e) {
      console.error("Deletion failed:", e);
    }
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoState) return;
    const { colist } = undoState;

    try {
      await setDoc(doc(db, "colists", colist.id), colist);
      setMyColists((prev) =>
        [colist, ...prev].sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
        ),
      );
      setUndoState(null);
    } catch (e) {
      console.error("Undo failed:", e);
    }
  }, [undoState]);

  /* ── Fetch all user's colists ── */
  const fetchMyColists = useCallback(async () => {
    if (!uid) return;
    setMyLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "colists"),
          where("authorId", "==", uid),
          orderBy("createdAt", "desc"),
          limit(50),
        ),
      );
      setMyColists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("[ColistsProfile] fetchMyColists:", e);
    } finally {
      setMyLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchMyColists();
  }, [uid, fetchMyColists]);

  /* ── Fetch saved colists (from vault) ── */
  useEffect(() => {
    const savedEntries = (userData?.vault || []).filter(
      (a) => a.source === "colist" && a.colistId,
    );
    if (!savedEntries.length) {
      requestAnimationFrame(() => setSavedColists([]));
      return;
    }
    requestAnimationFrame(() => setSavedLoading(true));
    const fetch = async () => {
      const results = [];
      for (const entry of savedEntries.slice(0, 25)) {
        try {
          const snap = await getDoc(doc(db, "colists", entry.colistId));
          if (snap.exists()) results.push({ id: snap.id, ...snap.data() });
        } catch (e) {
          // ignore
        }
      }
      setSavedColists(results);
      setSavedLoading(false);
    };
    fetch();
  }, [userData?.vault]);

  /* ── Build progress map from localStorage ── */
  const progressMap = useMemo(() => {
    if (!uid) return {};
    const map = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const prefix = `colist_progress_${uid}_`;
        if (key?.startsWith(prefix)) {
          const colistId = key.slice(prefix.length);
          try {
            map[colistId] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }
    return map;
  }, [uid, refreshing]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch "currently reading" colists ── */
  useEffect(() => {
    const inProgressIds = Object.entries(progressMap)
      .filter(([, p]) => {
        const blockCountInProgress = p?.pagesRead?.length || 0;
        return p?.pageIndex > 0 || blockCountInProgress > 0;
      })
      .map(([id]) => id)
      .slice(0, 12);

    if (!inProgressIds.length) {
      requestAnimationFrame(() => setReadingColists([]));
      return;
    }

    const fetch = async () => {
      const results = [];
      for (const id of inProgressIds) {
        try {
          const snap = await getDoc(doc(db, "colists", id));
          if (snap.exists()) {
            const data = snap.data();
            const p = progressMap[id];
            const blockCount = (data.blocks || []).filter(
              (b) => b.type !== "divider",
            ).length;
            const pagesRead = p?.pagesRead?.length || 0;
            // Only show incomplete ones
            if (pagesRead < blockCount) {
              results.push({ id: snap.id, ...data });
            }
          }
        } catch (e) {
          // ignore
        }
      }
      setReadingColists(results);
    };
    fetch();
  }, [progressMap]);

  /* ── Aggregated stats ── */
  const stats = useMemo(() => {
    const totalViews = myColists.reduce((s, c) => s + (c.viewCount || 0), 0);
    const totalSaves = myColists.reduce((s, c) => s + (c.saveCount || 0), 0);
    const totalResonance = myColists.reduce(
      (s, c) => s + (c.colistScore || 0),
      0,
    );
    const published = myColists.filter((c) => c.isPublic).length;
    const drafts = myColists.filter((c) => !c.isPublic).length;
    return {
      totalViews,
      totalSaves,
      totalResonance,
      published,
      drafts,
      total: myColists.length,
    };
  }, [myColists]);

  const filteredMyColists = useMemo(() => {
    let list = myColists;
    if (activeFilter === "published") list = list.filter((c) => c.isPublic);
    if (activeFilter === "drafts") list = list.filter((c) => !c.isPublic);
    if (mySearch.trim()) {
      const q = mySearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [myColists, activeFilter, mySearch]);

  const filteredSavedColists = useMemo(() => {
    if (!savedSearch.trim()) return savedColists;
    const q = savedSearch.toLowerCase();
    return savedColists.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [savedColists, savedSearch]);

  /* ── Actions ── */
  const handleShare = useCallback((colist) => {
    const url = `${window.location.origin}/colists/${colist.slug}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(colist.id);
    setTimeout(() => setCopiedId(null), 2200);
  }, []);

  const handleRefresh = useCallback(async () => {
    fetchedRef.current = false;
    setRefreshing(true);
    await fetchMyColists();
    setRefreshing(false);
  }, [fetchMyColists]);

  /* ── Profile info ── */
  const operatorName = userData?.identity?.firstName
    ? `${userData.identity.firstName} ${userData.identity?.lastName || ""}`.trim()
    : "Operator";
  const username = userData?.identity?.username || "operator";
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  /* ── Not signed in ── */
  if (!uid) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 px-6 text-center"
        style={{ background: V.bg, minHeight: "60vh" }}
      >
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
        >
          <BookOpen size={32} style={{ color: G.base }} />
        </div>
        <h2
          className="font-display font-black text-2xl mb-3"
          style={{ color: T.primary, letterSpacing: "-0.02em" }}
        >
          Your Colist Profile
        </h2>
        <p className="text-sm mb-8" style={{ color: T.secondary }}>
          Sign in to track your reading, publications, and resonance.
        </p>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/auth")}
          className="flex items-center gap-2 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest"
          style={{
            background: "linear-gradient(135deg,#8B7240,#D4AF78)",
            color: "#000",
          }}
        >
          Sign In to Continue <ArrowRight size={14} />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: V.bg }}>
      {/* ════════════════════════════════════════════
          PROFILE HEADER
      ══════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%,rgba(191,162,100,0.18) 0%,transparent 65%)",
        }}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="max-w-4xl mx-auto px-5 md:px-8 pt-8 pb-6">
          <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border"
              style={{ borderColor: G.border, background: G.dimBg }}
            >
              {userData?.identity?.avatarUrl ? (
                <img
                  src={userData.identity.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-display font-black text-3xl"
                  style={{ color: G.bright }}
                >
                  {operatorName.charAt(0)}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <h1
                  className="font-display font-black"
                  style={{
                    fontSize: "clamp(1.3rem,4vw,1.8rem)",
                    color: T.primary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {operatorName}
                </h1>
                {isPro && (
                  <img
                    src="/logo-premium.png"
                    alt="Pro"
                    className="h-5 md:h-6 w-auto object-contain"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 mb-1.5">
                <p className="font-mono" style={{ fontSize: 10, color: T.dim }}>
                  @{username}
                </p>
                <motion.button
                  whileTap={{ scale: 0.9, rotate: 180 }}
                  onClick={handleRefresh}
                  className="p-1.5 rounded-full transition-all hover:bg-white/10"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: T.dim,
                  }}
                  title="Refresh"
                >
                  <RefreshCw
                    size={11}
                    className={refreshing ? "animate-spin" : ""}
                  />
                </motion.button>
              </div>

              {userData?.identity?.domain && (
                <p className="text-xs mb-3" style={{ color: T.secondary }}>
                  {userData.identity.domain}
                </p>
              )}

              {/* Go To App Button (Mobile Only) */}
              <div className="flex items-center gap-2 mt-2 md:hidden">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => navigate("/app")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full font-black uppercase tracking-widest"
                  style={{
                    background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                    color: "#000",
                    fontSize: 9,
                  }}
                >
                  <ArrowUpRight size={10} /> Go to App
                </motion.button>
              </div>
            </motion.div>

            {/* Resonance Ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="shrink-0"
            >
              <ResonanceRing
                score={stats.totalResonance}
                size={96}
                showMilestone
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
         STATS BAR
      ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 pb-6">
        <div
          className="flex gap-2.5 overflow-x-auto hide-scrollbar py-2 -my-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <StatTile
            icon={Bookmark}
            label="Saves"
            value={stats.totalSaves}
            color="#4ADE80"
            className="flex-1 min-w-[80px]"
          />
          <StatTile
            icon={Globe}
            label="Published"
            value={stats.published}
            color="#8b5cf6"
            className="flex-1 min-w-[80px]"
          />
          <StatTile
            icon={FileText}
            label="Drafts"
            value={stats.drafts}
            color={T.secondary}
            animate={false}
            className="flex-1 min-w-[80px]"
          />
          <StatTile
            icon={Users}
            label="Followers"
            value={0}
            color="#f97316"
            animate={false}
            comingSoon={true}
            className="flex-1 min-w-[80px]"
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          TABS
      ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 mb-6">
        <div
          className="flex items-center gap-1 p-1 rounded-2xl"
          style={{
            background: V.surface,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <TabBtn
            id="overview"
            label="Overview"
            icon={Activity}
            active={activeTab === "overview"}
            onClick={setActiveTab}
            count={0}
          />
          <TabBtn
            id="mine"
            label="My Colists"
            icon={PenTool}
            active={activeTab === "mine"}
            onClick={setActiveTab}
            count={stats.total}
          />
          <TabBtn
            id="saved"
            label="Saved"
            icon={BookMarked}
            active={activeTab === "saved"}
            onClick={setActiveTab}
            count={savedColists.length}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════════════ */}
      <div className="max-w-4xl mx-auto px-5 md:px-8">
        <AnimatePresence mode="wait">
          {/* ─── OVERVIEW ── */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Currently Reading */}
              {readingColists.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <Play size={12} style={{ color: "#38bdf8" }} />
                    <span
                      className="font-black uppercase tracking-widest"
                      style={{ fontSize: 9, color: T.dim }}
                    >
                      Currently Reading
                    </span>
                  </div>
                  <div
                    className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
                    style={{
                      WebkitOverflowScrolling: "touch",
                      scrollSnapType: "x mandatory",
                    }}
                  >
                    {readingColists.map((c) => (
                      <ReadingCard
                        key={c.id}
                        colist={c}
                        progress={progressMap[c.id]}
                        onResume={onRead}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Resonance Milestones */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Award size={12} style={{ color: G.base }} />
                  <span
                    className="font-black uppercase tracking-widest"
                    style={{ fontSize: 9, color: T.dim }}
                  >
                    Resonance Milestones
                  </span>
                  <span
                    className="font-mono ml-auto"
                    style={{ fontSize: 9, color: T.dim }}
                  >
                    {stats.totalResonance} total
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {RESONANCE_MILESTONES.map((m) => (
                    <MilestoneBadge
                      key={m.threshold}
                      milestone={m}
                      hit={stats.totalResonance >= m.threshold}
                      current={stats.totalResonance}
                    />
                  ))}
                </div>
              </section>

              {/* Top performing colists */}
              {myColists.filter((c) => c.isPublic).length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} style={{ color: G.base }} />
                      <span
                        className="font-black uppercase tracking-widest"
                        style={{ fontSize: 9, color: T.dim }}
                      >
                        Top Publications
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveTab("mine")}
                      className="flex items-center gap-1 font-black uppercase tracking-widest"
                      style={{ fontSize: 9, color: G.base }}
                    >
                      All <ChevronRight size={10} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {myColists
                      .filter((c) => c.isPublic)
                      .sort(
                        (a, b) => (b.colistScore || 0) - (a.colistScore || 0),
                      )
                      .slice(0, 5)
                      .map((c) => (
                        <ColistRow
                          key={c.id}
                          colist={c}
                          onRead={onRead}
                          onShare={handleShare}
                          onDelete={handleDelete}
                          progress={progressMap[c.id]}
                          showShare
                          isOwner
                        />
                      ))}
                  </div>
                </section>
              )}

              {/* If nothing at all */}
              {myColists.length === 0 && !myLoading && (
                <EmptyState
                  icon={PenTool}
                  title="No colists yet."
                  sub="Create your first colist and start building resonance."
                  ctaLabel="Create First Colist"
                  onCta={() => navigate("/colists/new")}
                />
              )}
            </motion.div>
          )}

          {/* ─── MY COLISTS ── */}
          {activeTab === "mine" && (
            <motion.div
              key="mine"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Search & Filter chips */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={12}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      value={mySearch}
                      onChange={(e) => setMySearch(e.target.value)}
                      placeholder="Search your colists..."
                      className="w-full bg-[#111] border border-white/5 rounded-xl pl-8 pr-3 py-2 text-[11px] text-white outline-none focus:border-[#BFA264]/50 transition-colors"
                    />
                  </div>
                  <div
                    className="relative flex items-center p-1 rounded-xl border w-[72px] shrink-0"
                    style={{ background: "#111", borderColor: "#222" }}
                  >
                    <motion.div
                      className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
                      animate={{
                        left: myView === "grid" ? "4px" : "calc(50% + 2px)",
                        width: "calc(50% - 6px)",
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 35,
                      }}
                      style={{
                        background: "linear-gradient(135deg, #8B7240, #D4AF78)",
                      }}
                    />
                    <button
                      onClick={() => setMyView("grid")}
                      className="relative flex-1 py-1.5 rounded-lg z-10 flex items-center justify-center"
                      style={{ color: myView === "grid" ? "#000" : "#555" }}
                    >
                      <LayoutGrid size={13} />
                    </button>
                    <button
                      onClick={() => setMyView("list")}
                      className="relative flex-1 py-1.5 rounded-lg z-10 flex items-center justify-center"
                      style={{ color: myView === "list" ? "#000" : "#555" }}
                    >
                      <List size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {[
                    { id: "all", label: "All", count: stats.total },
                    {
                      id: "published",
                      label: "Published",
                      count: stats.published,
                    },
                    { id: "drafts", label: "Drafts", count: stats.drafts },
                  ].map((f) => (
                    <motion.button
                      key={f.id}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setActiveFilter(f.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-black uppercase tracking-widest transition-all"
                      style={{
                        fontSize: 9,
                        background:
                          activeFilter === f.id ? G.dimBg : "transparent",
                        borderColor:
                          activeFilter === f.id
                            ? G.border
                            : "rgba(255,255,255,0.08)",
                        color: activeFilter === f.id ? G.bright : T.dim,
                      }}
                    >
                      {f.label}
                      <span className="font-mono" style={{ opacity: 0.7 }}>
                        {f.count}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {myLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 0.65, 0.3] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="h-20 rounded-2xl"
                      style={{ background: V.surface }}
                    />
                  ))}
                </div>
              ) : filteredMyColists.length === 0 ? (
                <EmptyState
                  icon={activeFilter === "drafts" ? FileText : Globe}
                  title={
                    activeFilter === "drafts"
                      ? "No drafts saved."
                      : "No published colists yet."
                  }
                  sub={
                    activeFilter === "drafts"
                      ? "Drafts are auto-saved when you write."
                      : "Publish your first colist to reach the community."
                  }
                  ctaLabel={
                    activeFilter !== "published" ? "Start Writing" : undefined
                  }
                  onCta={
                    activeFilter !== "published"
                      ? () => navigate("/colists/new")
                      : undefined
                  }
                />
              ) : (
                <motion.div
                  layout
                  className={cn(
                    "gap-4",
                    myView === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2"
                      : "flex flex-col",
                  )}
                >
                  <AnimatePresence>
                    {filteredMyColists.map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <ColistRow
                          colist={c}
                          onRead={onRead}
                          onEdit={onEdit}
                          onShare={handleShare}
                          onDelete={handleDelete}
                          progress={progressMap[c.id]}
                          showShare
                          isOwner
                          view={myView}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── SAVED ── */}
          {activeTab === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  value={savedSearch}
                  onChange={(e) => setSavedSearch(e.target.value)}
                  placeholder="Search saved colists..."
                  className="w-full bg-[#111] border border-white/5 rounded-xl pl-8 pr-3 py-2 text-[11px] text-white outline-none focus:border-[#BFA264]/50 transition-colors"
                />
              </div>

              {savedLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 0.65, 0.3] }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="h-20 rounded-2xl"
                      style={{ background: V.surface }}
                    />
                  ))}
                </div>
              ) : filteredSavedColists.length === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="No saved colists yet."
                  sub="While reading, tap the bookmark icon to save a colist here."
                  ctaLabel="Browse Colists"
                  onCta={() => navigate("/colists")}
                />
              ) : (
                <AnimatePresence>
                  {filteredSavedColists.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <ColistRow
                        colist={c}
                        onRead={onRead}
                        progress={progressMap[c.id]}
                        showShare={false}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Undo Toast ── */}
      <AnimatePresence>
        {undoState && (
          <UndoToast
            onUndo={handleUndo}
            onDismiss={() => setUndoState(null)}
            itemTitle={undoState.colist.title}
          />
        )}
      </AnimatePresence>

      {/* ── Copy link toast ── */}
      <AnimatePresence>
        {copiedId && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.92 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
            style={{
              background: V.elevated,
              border: "1px solid rgba(74,222,128,0.3)",
              backdropFilter: "blur(20px)",
            }}
          >
            <Check size={14} style={{ color: "#4ADE80" }} />
            <span
              className="font-black"
              style={{ fontSize: 12, color: T.primary }}
            >
              Link copied to clipboard
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ColistsProfile;
