/**
 * @fileoverview Discotive OS — GitHub Connector v3.0 "Cinematica"
 * @module Vault/Connectors/GitHub
 *
 * ARCHITECTURE:
 * - GitHub public REST API (unauthenticated, 60 req/hr per IP)
 * - Activity: /events/public (last ~90 events ≈ 30 days of commits)
 * - Repo sync: writes vault asset (PENDING) → admin verifies → score awarded
 * - Connected state persisted: users/{uid}.connectors.github
 * - Mobile: bottom-sheet sync modal, horizontal scroll repos
 * - Desktop: Netflix swimlane repos, cinematic hero card
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Github,
  GitBranch,
  Star,
  GitFork,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Check,
  X,
  Lock,
  Unlock,
  BarChart2,
  RefreshCw,
  Search,
  Plus,
  ShieldCheck,
  Clock,
  Upload,
  ArrowUpRight,
  Users,
  BookOpen,
  Zap,
  Activity,
  ChevronRight,
  Database,
  Eye,
  Calendar,
} from "lucide-react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

/* ─── Design Tokens (identical to Dashboard) ────────────────────────────── */
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

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
});

/* ─── Language Color Registry ────────────────────────────────────────────── */
const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
  SCSS: "#c6538c",
  "C#": "#178600",
  PHP: "#4F5D95",
  R: "#198ce7",
  Lua: "#000080",
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const timeAgo = (dateStr) => {
  if (!dateStr) return "—";
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 86400000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
};

const fmtNum = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n || 0);

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════════════ */

/* ─── Animated Skeleton ──────────────────────────────────────────────────── */
const Shimmer = memo(({ className }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    className={`rounded-xl ${className}`}
    style={{
      background: `linear-gradient(90deg, ${V.surface}, ${V.elevated}, ${V.surface})`,
    }}
  />
));

/* ─── Language Bar ───────────────────────────────────────────────────────── */
const LanguageBar = memo(({ languages }) => {
  const entries = Object.entries(languages || {});
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return null;
  const sorted = entries.sort(([, a], [, b]) => b - a).slice(0, 7);

  return (
    <div>
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-3"
        style={{ color: T.dim }}
      >
        Language Arsenal
      </p>
      <div className="flex rounded-full overflow-hidden h-1.5 mb-4 gap-px">
        {sorted.map(([lang, bytes]) => (
          <motion.div
            key={lang}
            initial={{ width: 0 }}
            animate={{ width: `${(bytes / total) * 100}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: LANG_COLORS[lang] || "#4a4a4a" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sorted.map(([lang, bytes]) => (
          <motion.div
            key={lang}
            whileHover={{ x: 4 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: LANG_COLORS[lang] || "#4a4a4a" }}
            />
            <span
              className="text-[10px] font-bold truncate"
              style={{ color: T.secondary }}
            >
              {lang}
            </span>
            <span
              className="text-[9px] font-mono ml-auto shrink-0"
              style={{ color: T.dim }}
            >
              {((bytes / total) * 100).toFixed(0)}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

/* ─── Recent Activity Bars (30-day from events) ──────────────────────────── */
const RecentActivityChart = memo(({ commitsByDay }) => {
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result.push({
        key,
        count: commitsByDay[key] || 0,
        dayOfWeek: d.getDay(),
      });
    }
    return result;
  }, [commitsByDay]);

  const max = Math.max(...days.map((d) => d.count), 1);
  const total = days.reduce((s, d) => s + d.count, 0);

  if (total === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Last 30 Days
        </p>
        <span
          className="text-[10px] font-black font-mono"
          style={{ color: G.bright }}
        >
          {total} commits
        </span>
      </div>
      <div className="flex items-end gap-[3px] h-10">
        {days.map((day) => {
          const pct = day.count === 0 ? 0 : Math.max(0.12, day.count / max);
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
          const bg =
            day.count === 0
              ? "rgba(255,255,255,0.04)"
              : day.count >= max * 0.8
                ? G.bright
                : day.count >= max * 0.4
                  ? "rgba(191,162,100,0.6)"
                  : "rgba(191,162,100,0.3)";

          return (
            <motion.div
              key={day.key}
              initial={{ height: 0 }}
              animate={{ height: `${pct * 100}%` }}
              transition={{
                delay: (30 - days.indexOf(day)) * 0.01,
                duration: 0.4,
                ease: "easeOut",
              }}
              title={`${day.key}: ${day.count} commit${day.count !== 1 ? "s" : ""}`}
              className="flex-1 rounded-[2px] cursor-crosshair hover:brightness-125 transition-all"
              style={{
                background: bg,
                minHeight: 2,
                opacity: isWeekend ? 0.7 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-[8px]" style={{ color: T.dim }}>
          30 days ago
        </span>
        <span className="text-[8px]" style={{ color: T.dim }}>
          Today
        </span>
      </div>
    </div>
  );
});

/* ─── Repository Post-Card ────────────────────────────────────────────────── */
const RepoCard = memo(({ repo, onSync, synced, syncing }) => {
  const langColor = LANG_COLORS[repo.language] || "#4a4a4a";
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-col gap-0 rounded-2xl overflow-hidden cursor-default shrink-0"
      style={{
        width: 240,
        background: synced ? "rgba(16,185,129,0.06)" : V.surface,
        border: `1px solid ${
          synced
            ? "rgba(16,185,129,0.25)"
            : isHovered
              ? G.border
              : "rgba(255,255,255,0.06)"
        }`,
        transition: "border-color 0.2s, background 0.2s",
        scrollSnapAlign: "start",
      }}
    >
      {/* Color accent top bar */}
      <div
        className="h-[3px] w-full"
        style={{
          background: synced
            ? "linear-gradient(90deg,#10b981,#34d399)"
            : `linear-gradient(90deg,${langColor}80,${langColor}20)`,
        }}
      />

      {/* Glow effect */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${G.dimBg} 0%, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>

      <div className="p-4 flex flex-col gap-3 flex-1 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              {repo.private ? (
                <Lock
                  className="w-3 h-3 shrink-0"
                  style={{ color: "#f59e0b" }}
                />
              ) : (
                <Unlock className="w-3 h-3 shrink-0" style={{ color: T.dim }} />
              )}
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-black truncate hover:underline"
                style={{ color: T.primary }}
                onClick={(e) => e.stopPropagation()}
              >
                {repo.name}
              </a>
            </div>
            {repo.description && (
              <p
                className="text-[10px] leading-relaxed line-clamp-2"
                style={{ color: T.secondary }}
              >
                {repo.description}
              </p>
            )}
          </div>
          <motion.a
            whileHover={{ scale: 1.15 }}
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.04)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" style={{ color: T.dim }} />
          </motion.a>
        </div>

        {/* Repo meta chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {repo.language && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: langColor }}
              />
              <span
                className="text-[9px] font-bold"
                style={{ color: T.secondary }}
              >
                {repo.language}
              </span>
            </div>
          )}
          {repo.stargazers_count > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-2.5 h-2.5" style={{ color: "#f59e0b" }} />
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: T.secondary }}
              >
                {fmtNum(repo.stargazers_count)}
              </span>
            </div>
          )}
          {repo.forks_count > 0 && (
            <div className="flex items-center gap-1">
              <GitFork className="w-2.5 h-2.5" style={{ color: T.dim }} />
              <span className="text-[9px] font-mono" style={{ color: T.dim }}>
                {fmtNum(repo.forks_count)}
              </span>
            </div>
          )}
        </div>

        {/* Topics */}
        {repo.topics?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                style={{
                  background: G.dimBg,
                  color: G.base,
                  border: `1px solid ${G.border}`,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Updated date */}
        <p className="text-[9px] mt-auto" style={{ color: T.dim }}>
          Updated {timeAgo(repo.pushed_at)}
        </p>

        {/* Sync CTA */}
        <motion.button
          whileHover={{ scale: synced ? 1 : 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => !synced && !syncing && onSync(repo)}
          disabled={synced || syncing}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          style={
            synced
              ? {
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#10b981",
                  cursor: "default",
                }
              : {
                  background: G.dimBg,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }
          }
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : synced ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5" /> Queued for Review
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" /> Sync to Vault
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
});

/* ─── Synced Vault Repo Row ───────────────────────────────────────────────── */
const VaultRepoRow = memo(({ asset }) => {
  const isVerified = asset.status === "VERIFIED";
  const isStrong = asset.strength === "Strong";
  const isMedium = asset.strength === "Medium";

  const strengthColor = isStrong
    ? "#10b981"
    : isMedium
      ? G.bright
      : asset.strength === "Weak"
        ? "#f97316"
        : isVerified
          ? "#10b981"
          : "#f59e0b";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between p-3.5 rounded-xl group"
      style={{
        background: isVerified
          ? "rgba(16,185,129,0.04)"
          : "rgba(255,255,255,0.02)",
        border: `1px solid ${
          isVerified ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)"
        }`,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Github className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-black" style={{ color: T.primary }}>
            {asset.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {asset.credentials?.language && (
              <span className="text-[9px] font-mono" style={{ color: T.dim }}>
                {asset.credentials.language}
              </span>
            )}
            {asset.credentials?.stars > 0 && (
              <>
                <span style={{ color: T.dim }}>·</span>
                <span
                  className="text-[9px] font-mono flex items-center gap-0.5"
                  style={{ color: "#f59e0b" }}
                >
                  <Star className="w-2.5 h-2.5" />
                  {asset.credentials.stars}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {asset.scoreYield > 0 && (
          <span
            className="text-[10px] font-black font-mono"
            style={{ color: G.base }}
          >
            +{asset.scoreYield} pts
          </span>
        )}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: `${strengthColor}15`,
            border: `1px solid ${strengthColor}30`,
          }}
        >
          {isVerified ? (
            <ShieldCheck className="w-3 h-3" style={{ color: strengthColor }} />
          ) : (
            <Clock className="w-3 h-3" style={{ color: strengthColor }} />
          )}
          <span
            className="text-[8px] font-black uppercase tracking-widest"
            style={{ color: strengthColor }}
          >
            {isVerified ? asset.strength || "Verified" : "Pending Review"}
          </span>
        </div>
      </div>
    </motion.div>
  );
});

/* ─── Profile Hero Card ───────────────────────────────────────────────────── */
const ProfileHeroCard = memo(({ user, stats }) => (
  <motion.div
    {...FADE_UP(0)}
    className="relative overflow-hidden rounded-2xl"
    style={{
      background: `linear-gradient(135deg, #0d1117 0%, ${V.depth} 60%, rgba(191,162,100,0.04) 100%)`,
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    {/* Decorative orb */}
    <div
      className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
      style={{
        background: `radial-gradient(circle, rgba(191,162,100,0.08) 0%, transparent 70%)`,
      }}
    />

    <div className="relative z-10 p-5 flex items-center gap-5">
      {/* Avatar */}
      <motion.div whileHover={{ scale: 1.05 }} className="relative shrink-0">
        <img
          src={user.avatar_url}
          alt={user.login}
          className="w-16 h-16 rounded-2xl"
          style={{ border: `2px solid ${G.border}` }}
        />
        {user.hireable && (
          <div
            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: "#10b981", border: "2px solid #030303" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
        )}
      </motion.div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h2
            className="text-lg font-black leading-tight truncate"
            style={{ color: T.primary, fontFamily: "Montserrat, sans-serif" }}
          >
            {user.name || user.login}
          </h2>
          <a
            href={user.html_url}
            target="_blank"
            rel="noreferrer"
            className="shrink-0"
          >
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: G.base }} />
          </a>
        </div>
        <p className="text-[11px] font-mono mb-2" style={{ color: T.dim }}>
          @{user.login}
        </p>
        {user.bio && (
          <p
            className="text-[10px] leading-relaxed line-clamp-2"
            style={{ color: T.secondary }}
          >
            {user.bio}
          </p>
        )}
        {user.company && (
          <div className="flex items-center gap-1 mt-1.5">
            <BarChart2 className="w-3 h-3" style={{ color: G.base }} />
            <span className="text-[10px]" style={{ color: T.dim }}>
              {user.company}
            </span>
          </div>
        )}
      </div>
    </div>

    {/* Stat row */}
    <div
      className="grid grid-cols-4 border-t"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      {[
        { label: "Repos", value: fmtNum(user.public_repos), color: G.bright },
        { label: "Stars", value: fmtNum(stats.totalStars), color: "#f59e0b" },
        { label: "Following", value: fmtNum(user.following), color: "#38bdf8" },
        {
          label: "Gists",
          value: fmtNum(user.public_gists || 0),
          color: "#a855f7",
        },
      ].map(({ label, value, color }) => (
        <div
          key={label}
          className="flex flex-col items-center py-3.5 gap-0.5"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span
            className="text-base font-black font-mono leading-none"
            style={{ color }}
          >
            {value}
          </span>
          <span
            className="text-[8px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  </motion.div>
));

/* ─── Sync Repo Modal (Command Palette) ──────────────────────────────────── */
const SyncModal = memo(
  ({ repos, syncedRepos, syncingRepoId, onSync, onClose }) => {
    const [q, setQ] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const filtered = useMemo(
      () => repos.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())),
      [repos, q],
    );

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
          }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-2xl flex flex-col overflow-hidden"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "1.5rem 1.5rem 0 0",
            maxHeight: "80vh",
            // On sm+ screens, all rounded
            ...(window.innerWidth >= 640 ? { borderRadius: "1.5rem" } : {}),
            boxShadow: `0 -4px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(191,162,100,0.1)`,
          }}
        >
          {/* Drag handle (mobile) */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <Github className="w-4 h-4" style={{ color: G.bright }} />
              </div>
              <div>
                <h3
                  className="text-sm font-black"
                  style={{
                    color: T.primary,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Sync Repository
                </h3>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Select a repo to submit for verification
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <X className="w-4 h-4" style={{ color: T.dim }} />
            </motion.button>
          </div>

          {/* Search */}
          <div
            className="p-3 border-b"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: T.dim }}
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search repositories..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: T.primary,
                  caretColor: G.bright,
                }}
              />
            </div>
          </div>

          {/* Repo list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Search className="w-8 h-8" style={{ color: T.dim }} />
                <p className="text-xs font-black" style={{ color: T.dim }}>
                  No repos match "{q}"
                </p>
              </div>
            ) : (
              filtered.map((repo) => {
                const isSynced = syncedRepos.has(repo.id);
                const isSyncing = syncingRepoId === repo.id;
                const langColor = LANG_COLORS[repo.language] || "#4a4a4a";

                return (
                  <motion.div
                    key={repo.id}
                    whileHover={{
                      background: isSynced
                        ? "rgba(16,185,129,0.06)"
                        : "rgba(255,255,255,0.04)",
                    }}
                    className="flex items-center justify-between px-3 py-3 rounded-xl transition-all group"
                    style={{ cursor: isSynced ? "default" : "pointer" }}
                    onClick={() => !isSynced && !isSyncing && onSync(repo)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Language dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: langColor }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-bold truncate"
                            style={{ color: T.primary }}
                          >
                            {repo.name}
                          </p>
                          {repo.private && (
                            <Lock
                              className="w-3 h-3 shrink-0"
                              style={{ color: "#f59e0b" }}
                            />
                          )}
                        </div>
                        <div
                          className="flex items-center gap-2 text-[9px] font-mono mt-0.5"
                          style={{ color: T.dim }}
                        >
                          <span>{repo.language || "Mixed"}</span>
                          {repo.stargazers_count > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5" />{" "}
                                {repo.stargazers_count}
                              </span>
                            </>
                          )}
                          <span>· {timeAgo(repo.pushed_at)}</span>
                        </div>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0"
                      style={
                        isSynced
                          ? {
                              background: "rgba(16,185,129,0.1)",
                              border: "1px solid rgba(16,185,129,0.2)",
                              color: "#10b981",
                            }
                          : {
                              background: G.dimBg,
                              border: `1px solid ${G.border}`,
                              color: G.bright,
                            }
                      }
                    >
                      {isSyncing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isSynced ? (
                        <>
                          <Check className="w-3 h-3" /> Synced
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3" /> Submit
                        </>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-2 p-3 border-t"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <AlertTriangle
              className="w-3 h-3 shrink-0"
              style={{ color: G.base }}
            />
            <p className="text-[9px]" style={{ color: T.dim }}>
              Repos are submitted to admin review. Score is awarded after
              verification.
            </p>
          </div>
        </motion.div>
      </div>,
      document.body,
    );
  },
);

/* ─── Connection Form ────────────────────────────────────────────────────── */
const ConnectForm = memo(({ onConnect, loading, error }) => {
  const [val, setVal] = useState("");

  return (
    <motion.div
      {...FADE_UP(0)}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center"
    >
      {/* Hero icon */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, #0d1117, #161b22)",
          border: "2px solid rgba(255,255,255,0.1)",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
        }}
      >
        <Github className="w-10 h-10 text-white" />
      </motion.div>

      <h2
        className="text-2xl font-black mb-2 leading-tight"
        style={{
          color: T.primary,
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.03em",
        }}
      >
        Connect GitHub
      </h2>
      <p
        className="text-sm max-w-xs mb-8 leading-relaxed"
        style={{ color: T.secondary }}
      >
        Sync your repositories to the Vault. Admin-verified repos earn Discotive
        Score.
      </p>

      {/* Perks */}
      <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-sm">
        {[
          { icon: Database, label: "Repo Portfolio", color: G.bright },
          { icon: Zap, label: "Earn Score", color: "#f59e0b" },
          { icon: Eye, label: "Public Profile", color: "#38bdf8" },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 py-3 rounded-xl"
            style={{
              background: `${color}08`,
              border: `1px solid ${color}20`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest text-center leading-tight"
              style={{ color: T.dim }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="w-full max-w-sm">
        <div
          className="flex items-center gap-0 rounded-xl overflow-hidden mb-3"
          style={{
            background: V.surface,
            border: `1px solid ${error ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <div
            className="px-3.5 py-3 shrink-0"
            style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Github className="w-4 h-4" style={{ color: T.dim }} />
          </div>
          <input
            type="text"
            placeholder="your-github-username"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && val.trim() && onConnect(val.trim())
            }
            className="flex-1 px-3 py-3 text-sm bg-transparent focus:outline-none"
            style={{ color: T.primary, caretColor: G.bright }}
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[10px] mb-3 flex items-center gap-1.5"
              style={{ color: "#f87171" }}
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => val.trim() && onConnect(val.trim())}
          disabled={loading || !val.trim()}
          className="w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
          style={{
            background: loading
              ? "rgba(191,162,100,0.15)"
              : `linear-gradient(135deg,${G.deep},${G.base})`,
            color: loading ? G.dim : "#0a0a0a",
            opacity: !val.trim() ? 0.5 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Github className="w-4 h-4" />
              Connect GitHub
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
});

/* ─── Swimlane Header ────────────────────────────────────────────────────── */
const SwimlaneHeader = memo(({ icon: Icon, iconColor, label, cta, onCta }) => (
  <div className="flex items-center justify-between mb-4 px-1">
    <div className="flex items-center gap-2">
      {Icon && <Icon style={{ color: iconColor, width: 13, height: 13 }} />}
      <span
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: T.dim }}
      >
        {label}
      </span>
    </div>
    {onCta && (
      <motion.button
        whileHover={{ scale: 1.05 }}
        onClick={onCta}
        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
        style={{ color: G.base }}
      >
        {cta} <ChevronRight className="w-3 h-3" />
      </motion.button>
    )}
  </div>
));

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const GitHubConnector = ({ userData, onVaultAssetAdded, addToast }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [phase, setPhase] = useState("idle"); // idle | fetching | connected | error
  const [githubData, setGithubData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncedRepos, setSyncedRepos] = useState(new Set());
  const [syncingRepoId, setSyncingRepoId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ── Vault repos ─────────────────────────────────────────────────────── */
  const vaultRepos = useMemo(
    () => (userData?.vault || []).filter((a) => a.connectorSource === "github"),
    [userData?.vault],
  );

  /* ── GitHub API Fetch ─────────────────────────────────────────────────── */
  const fetchGitHubData = useCallback(
    async (username) => {
      setLoading(true);
      setError(null);

      try {
        const headers = { Accept: "application/vnd.github.v3+json" };

        const [userRes, reposRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${username}`, { headers }),
          fetch(
            `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
            { headers },
          ),
          fetch(
            `https://api.github.com/users/${username}/events/public?per_page=100`,
            { headers },
          ),
        ]);

        if (userRes.status === 403 || userRes.status === 429) {
          const resetHeader = userRes.headers.get("X-RateLimit-Reset");
          const minutesLeft = resetHeader
            ? Math.ceil((parseInt(resetHeader) * 1000 - Date.now()) / 60000)
            : 60;
          throw new Error(
            `Rate limit reached. Try again in ~${minutesLeft} min.`,
          );
        }
        if (userRes.status === 404) {
          throw new Error(`GitHub user "@${username}" not found.`);
        }
        if (!userRes.ok) {
          throw new Error(`GitHub API error (${userRes.status}).`);
        }

        const [user, repos, events] = await Promise.all([
          userRes.json(),
          reposRes.ok ? reposRes.json() : [],
          eventsRes.ok ? eventsRes.json() : [],
        ]);

        const repoList = Array.isArray(repos) ? repos : [];
        const eventList = Array.isArray(events) ? events : [];

        /* ── Language stats ── */
        const languages = {};
        repoList.forEach((r) => {
          if (r.language && !r.fork) {
            languages[r.language] =
              (languages[r.language] || 0) + (r.size || 1);
          }
        });

        /* ── Commit activity: last 30 days from events ── */
        const commitsByDay = {};
        const now = Date.now();
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        let recentCommits = 0;
        eventList.forEach((ev) => {
          if (ev.type === "PushEvent" && ev.payload?.commits) {
            const date = ev.created_at?.split("T")[0];
            if (date) {
              const evMs = new Date(date).getTime();
              if (now - evMs <= THIRTY_DAYS) {
                const count = ev.payload.commits.length;
                commitsByDay[date] = (commitsByDay[date] || 0) + count;
                recentCommits += count;
              }
            }
          }
        });

        /* ── Total stars ── */
        const totalStars = repoList.reduce(
          (s, r) => s + (r.stargazers_count || 0),
          0,
        );

        const data = {
          user,
          repos: repoList,
          languages,
          commitsByDay,
          stats: { totalStars, recentCommits },
        };

        setGithubData(data);
        setPhase("connected");

        /* ── Persist to Firestore ── */
        if (uid) {
          const existingUsername = userData?.connectors?.github?.username;
          if (existingUsername !== username) {
            await updateDoc(doc(db, "users", uid), {
              "connectors.github": {
                username,
                connectedAt: new Date().toISOString(),
                publicRepos: user.public_repos,
                followers: user.followers,
                avatarUrl: user.avatar_url,
              },
            });
          }
        }
      } catch (err) {
        setError(err.message || "Failed to fetch GitHub profile.");
        setPhase("error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid, userData?.connectors?.github?.username],
  );

  /* ── Restore persisted connection ─────────────────────────────────────── */
  useEffect(() => {
    const existing = userData?.connectors?.github?.username;
    if (existing && phase === "idle") {
      setPhase("fetching");
      fetchGitHubData(existing);
    }
  }, [userData?.connectors?.github?.username, phase, fetchGitHubData]);

  /* ── Global Refresh Listener ──────────────────────────────────────────── */
  useEffect(() => {
    const onRefresh = () => {
      const username = userData?.connectors?.github?.username;
      if (username) {
        setRefreshing(true);
        fetchGitHubData(username);
      }
    };
    window.addEventListener("TRIGGER_CONNECTOR_REFRESH", onRefresh);
    return () =>
      window.removeEventListener("TRIGGER_CONNECTOR_REFRESH", onRefresh);
  }, [userData?.connectors?.github?.username, fetchGitHubData]);

  /* ── Hydrate synced set from vault ────────────────────────────────────── */
  useEffect(() => {
    if (userData?.vault?.length) {
      const synced = new Set(
        userData.vault
          .filter((a) => a.connectorSource === "github" && a.connectorRepoId)
          .map((a) => a.connectorRepoId),
      );
      setSyncedRepos(synced);
    }
  }, [userData?.vault]);

  /* ── Sync repo to vault ───────────────────────────────────────────────── */
  const handleSyncRepo = useCallback(
    async (repo) => {
      if (!uid || syncedRepos.has(repo.id)) return;

      setSyncingRepoId(repo.id);
      const assetId = `gh_${repo.id}_${Date.now()}`;

      const asset = {
        id: assetId,
        category: "Project",
        title: repo.name,
        description:
          repo.description || `${repo.language || "Code"} repository on GitHub`,
        url: repo.html_url,
        status: "PENDING",
        connectorSource: "github",
        connectorRepoId: repo.id,
        uploadedAt: new Date().toISOString(),
        credentials: {
          language: repo.language || "Mixed",
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          visibility: repo.private ? "Private" : "Public",
          lastPushed: repo.pushed_at,
        },
      };

      try {
        await updateDoc(doc(db, "users", uid), {
          vault: arrayUnion(asset),
          vault_count: (userData?.vault?.length || 0) + 1,
        });
        setSyncedRepos((prev) => new Set([...prev, repo.id]));
        onVaultAssetAdded?.(asset);
        addToast?.("Repository submitted for admin review!", "success");
        setIsSyncModalOpen(false);
      } catch (err) {
        addToast?.("Sync failed. Try again.", "error");
        console.error("[GitHubConnector] Sync error:", err);
      } finally {
        setSyncingRepoId(null);
      }
    },
    [uid, syncedRepos, userData?.vault?.length, onVaultAssetAdded, addToast],
  );

  /* ── Refresh ──────────────────────────────────────────────────────────── */
  const handleRefresh = useCallback(() => {
    const username = userData?.connectors?.github?.username;
    if (!username) return;
    setRefreshing(true);
    fetchGitHubData(username);
  }, [userData?.connectors?.github?.username, fetchGitHubData]);

  /* ── Disconnect ───────────────────────────────────────────────────────── */
  const handleDisconnect = useCallback(async () => {
    if (
      !uid ||
      !window.confirm("Disconnect GitHub? Synced repos stay in your Vault.")
    )
      return;
    try {
      await updateDoc(doc(db, "users", uid), {
        "connectors.github": null,
      });
      setGithubData(null);
      setPhase("idle");
      addToast?.("GitHub disconnected.");
    } catch (err) {
      addToast?.("Disconnect failed.");
    }
  }, [uid, addToast]);

  /* ══════════════════════════════════════════════════════════════════════
     RENDERS
  ═══════════════════════════════════════════════════════════════════════ */

  /* ── Connection form ─────────────────────────────────────────────────── */
  if (phase === "idle" || (phase === "error" && !githubData)) {
    return (
      <ConnectForm
        onConnect={(username) => {
          setPhase("fetching");
          fetchGitHubData(username);
        }}
        loading={loading}
        error={error}
      />
    );
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (phase === "fetching" && !githubData) {
    return (
      <div className="space-y-5 p-1">
        <Shimmer className="h-28 w-full" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Shimmer key={i} className="h-20" />
          ))}
        </div>
        <Shimmer className="h-12 w-full" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <Shimmer key={i} className="h-64 w-60 shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Connected ───────────────────────────────────────────────────────── */
  const { user, repos, languages, commitsByDay, stats } = githubData;

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "repos", label: `Repos (${repos.length})`, icon: BookOpen },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* ── Hero Profile Card ── */}
      <motion.div {...FADE_UP(0)}>
        <ProfileHeroCard user={user} stats={stats} />
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div {...FADE_UP(0.05)}>
        <div
          className="flex p-1 rounded-xl gap-1"
          style={{
            background: V.surface,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {tabs.map(({ key, label, icon: Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={
                activeTab === key
                  ? {
                      background: G.dimBg,
                      color: G.bright,
                      border: `1px solid ${G.border}`,
                    }
                  : {
                      color: T.dim,
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Header controls removed — Maintained by Global UI Hub ── */}

      {/* ════════════════════════════════════════════
          TAB CONTENT
      ════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Recent Activity */}
            {Object.keys(commitsByDay).length > 0 && (
              <motion.div
                {...FADE_UP(0.1)}
                className="p-5 rounded-2xl"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <RecentActivityChart commitsByDay={commitsByDay} />
              </motion.div>
            )}

            {/* Language distribution */}
            {Object.keys(languages).length > 0 && (
              <motion.div
                {...FADE_UP(0.14)}
                className="p-5 rounded-2xl"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <LanguageBar languages={languages} />
              </motion.div>
            )}

            {/* Connected Repositories Cinematic Cards */}
            <motion.div {...FADE_UP(0.17)}>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <Database style={{ color: G.base, width: 13, height: 13 }} />
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.18em]"
                    style={{ color: T.dim }}
                  >
                    Connected Repositories
                  </span>
                </div>
                <div className="relative group">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </motion.button>
                  <div
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden shadow-2xl"
                    style={{
                      background: V.elevated,
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                      {repos.map((repo) => {
                        const isSynced = syncedRepos.has(repo.id);
                        return (
                          <div
                            key={repo.id}
                            className="flex items-center justify-between px-3 py-2.5 rounded-lg group/repo hover:bg-white/5 transition-colors"
                          >
                            <span className="text-xs font-bold truncate pr-2 text-white/80 group-hover/repo:text-white">
                              {repo.name}
                            </span>
                            {!isSynced ? (
                              <button
                                onClick={() => handleSyncRepo(repo)}
                                disabled={syncingRepoId === repo.id}
                                className="opacity-0 group-hover/repo:opacity-100 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all shrink-0"
                                style={{
                                  background:
                                    syncingRepoId === repo.id
                                      ? "rgba(255,255,255,0.05)"
                                      : "rgba(191,162,100,0.15)",
                                  color:
                                    syncingRepoId === repo.id
                                      ? T.dim
                                      : G.bright,
                                }}
                              >
                                {syncingRepoId === repo.id
                                  ? "Syncing..."
                                  : "Submit"}
                              </button>
                            ) : (
                              <Check className="w-3 h-3 text-[#10b981] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {vaultRepos.length === 0 ? (
                <div
                  className="py-8 text-center rounded-xl"
                  style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs text-white/40">
                    No connected repositories yet.
                  </p>
                </div>
              ) : (
                <div
                  className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 px-1"
                  style={{
                    scrollSnapType: "x mandatory",
                    WebkitOverflowScrolling: "touch",
                  }}
                >
                  {vaultRepos.map((asset, i) => (
                    <motion.div
                      key={asset.id}
                      className="shrink-0 relative cursor-pointer group rounded-xl overflow-hidden flex flex-col justify-between p-4 transition-all"
                      style={{
                        width: 180,
                        height: 240,
                        scrollSnapAlign: "start",
                        background: `linear-gradient(to bottom, ${V.depth} 0%, ${V.elevated} 100%)`,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                      whileHover={{ y: -4, border: `1px solid ${G.border}` }}
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-[0.06] group-hover:opacity-10 transition-opacity">
                        <BookOpen size={90} style={{ color: G.base }} />
                      </div>
                      <div className="relative z-10">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                          style={{ background: "rgba(255,255,255,0.05)" }}
                        >
                          <Github className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="text-sm font-black leading-tight text-white line-clamp-2 mb-1">
                          {asset.title}
                        </h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#BFA264]/70">
                          {asset.credentials?.language || "Repository"}
                        </p>
                      </div>
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] font-black font-mono text-[#f59e0b]">
                          <Star className="w-3 h-3" />{" "}
                          {fmtNum(asset.credentials?.stars || 0)}
                        </div>
                        {asset.status === "VERIFIED" ? (
                          <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">
                              Verified
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Clock className="w-2.5 h-2.5 text-amber-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-amber-400">
                              Review
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* ── REPOSITORIES ── */}
        {activeTab === "repos" && (
          <motion.div
            key="repos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {repos.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <BookOpen className="w-10 h-10 mb-4" style={{ color: T.dim }} />
                <p className="font-black" style={{ color: T.dim }}>
                  No public repositories.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: horizontal scroll swimlane */}
                <div className="hidden md:block">
                  <div
                    className="overflow-x-auto hide-scrollbar -mx-1 px-1 pb-4"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <div
                      className="flex gap-4"
                      style={{ scrollSnapType: "x mandatory" }}
                    >
                      {repos.map((repo, i) => (
                        <motion.div
                          key={repo.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.3 }}
                        >
                          <RepoCard
                            repo={repo}
                            onSync={handleSyncRepo}
                            synced={syncedRepos.has(repo.id)}
                            syncing={syncingRepoId === repo.id}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile: vertical list */}
                <div className="md:hidden space-y-3">
                  {repos.map((repo, i) => {
                    const langColor = LANG_COLORS[repo.language] || "#4a4a4a";
                    const isSynced = syncedRepos.has(repo.id);
                    const isSyncing = syncingRepoId === repo.id;

                    return (
                      <motion.div
                        key={repo.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="flex items-center gap-3 p-3.5 rounded-2xl"
                        style={{
                          background: isSynced
                            ? "rgba(16,185,129,0.04)"
                            : V.surface,
                          border: `1px solid ${isSynced ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`,
                        }}
                      >
                        <div
                          className="w-1 self-stretch rounded-full shrink-0"
                          style={{ background: langColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-[13px] font-black truncate"
                            style={{ color: T.primary }}
                          >
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p
                              className="text-[10px] line-clamp-1 mt-0.5"
                              style={{ color: T.secondary }}
                            >
                              {repo.description}
                            </p>
                          )}
                          <div
                            className="flex items-center gap-2 mt-1 text-[9px] font-mono"
                            style={{ color: T.dim }}
                          >
                            {repo.language && <span>{repo.language}</span>}
                            {repo.stargazers_count > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 text-amber-500" />
                                {repo.stargazers_count}
                              </span>
                            )}
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() =>
                            !isSynced && !isSyncing && handleSyncRepo(repo)
                          }
                          disabled={isSynced || isSyncing}
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={
                            isSynced
                              ? {
                                  background: "rgba(16,185,129,0.1)",
                                  border: "1px solid rgba(16,185,129,0.2)",
                                }
                              : {
                                  background: G.dimBg,
                                  border: `1px solid ${G.border}`,
                                }
                          }
                        >
                          {isSyncing ? (
                            <Loader2
                              className="w-3.5 h-3.5 animate-spin"
                              style={{ color: G.bright }}
                            />
                          ) : isSynced ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Upload
                              className="w-3.5 h-3.5"
                              style={{ color: G.bright }}
                            />
                          )}
                        </motion.button>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GitHubConnector;
