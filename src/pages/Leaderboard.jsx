/**
 * @fileoverview Discotive OS — Arena Leaderboard (MAANG-Grade Definitive)
 * @module Execution/Leaderboard
 *
 * @description
 * Zero onSnapshot usage. Strict cursor-based pagination.
 * getCountFromServer fires only on filter change (never on pagination).
 * Rank milestone notifications written to Firestore once per threshold
 * (cached in localStorage to prevent spam).
 * Search is debounced 500 ms client-side prefix filter on fetched data.
 *
 * Notification thresholds (written to users/{uid}.notifications):
 *   - Rank improved by 10+ positions
 *   - Entered Top 10%, Top 5%, Top 1% globally
 *   - Entered global Top 10 or Top 3
 *   - New #1 rank achieved
 *
 * Premium logo: /logo-premium.png shown next to PRO tier users.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  where,
  limitToLast,
  endBefore,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useUserData, useOnboardingGate } from "../hooks/useUserData";
import { useNetwork } from "../hooks/useNetwork";
import CompareModal from "../components/CompareModal";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Crown,
  X,
  Zap,
  Activity,
  ChevronDown,
  MapPin,
  Target,
  Database,
  GraduationCap,
  SlidersHorizontal,
  User,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Network,
  Lock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Flame,
  Award,
  Users,
  Trophy,
  Star,
  Bell,
  Check,
  BarChart2,
  Eye,
  Maximize2,
} from "lucide-react";
import { cn } from "../lib/cn";

// ─── Taxonomy ─────────────────────────────────────────────────────────────────
const DOMAINS = [
  "Engineering & Tech",
  "Design & Creative",
  "Business & Strategy",
  "Marketing & Growth",
  "Product Management",
  "Data & Analytics",
  "Sales & Revenue",
];
const NICHES = {
  "Engineering & Tech": [
    "Frontend",
    "Backend",
    "Fullstack",
    "DevOps",
    "AI/ML",
    "Cybersecurity",
    "Mobile iOS",
    "Mobile Android",
    "Web3/Blockchain",
  ],
  "Design & Creative": [
    "UI/UX",
    "Product Design",
    "Graphic Design",
    "Motion Graphics",
    "3D Modeling",
    "Brand Identity",
  ],
  "Business & Strategy": [
    "Operations",
    "Finance",
    "Venture Capital",
    "Consulting",
    "Supply Chain",
  ],
  "Marketing & Growth": [
    "SEO/SEM",
    "Content Marketing",
    "Performance Marketing",
    "Social Media",
    "Email Marketing",
  ],
  "Product Management": [
    "Technical PM",
    "Growth PM",
    "Data PM",
    "Scrum Master",
  ],
  "Data & Analytics": [
    "Data Science",
    "Data Engineering",
    "Business Intelligence",
    "Quantitative Analysis",
  ],
  "Sales & Revenue": [
    "B2B Enterprise",
    "SaaS Sales",
    "Account Management",
    "Customer Success",
  ],
};
const LEVELS = [
  "L1 - Initiate",
  "L2 - Operator",
  "L3 - Specialist",
  "L4 - Architect",
  "L5 - Principal",
];
const COUNTRIES = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Singapore",
  "UAE",
  "Remote/Global",
];
const SORT_OPTIONS = [
  { label: "Score ↓", value: "score_desc" },
  { label: "Score ↑", value: "score_asc" },
  { label: "Vault", value: "vault_desc" },
  { label: "Streak", value: "streak_desc" },
];
const PAGE_SIZES = [10, 15, 20, 30];

// ─── Character assets ─────────────────────────────────────────────────────────
const CHARS = {
  rank1: {
    Male: "/Characters/Boy-1.webp",
    Female: "/Characters/Girl-1.webp",
    Other: "/Characters/Others-1.webp",
  },
  rank2: {
    Male: "/Characters/Boy-2.webp",
    Female: "/Characters/Girl-2.webp",
    Other: "/Characters/Others-1.webp",
  },
  rank3: {
    Male: "/Characters/Boy-3.webp",
    Female: "/Characters/Girl-3.webp",
    Other: "/Characters/Others-1.webp",
  },
  observer: {
    Male: "/Characters/Observer.webp",
    Female: "/Characters/Observer.webp",
    Other: "/Characters/Observer.webp",
  },
};
const getAvatar = (key, gender) =>
  CHARS[key]?.[gender] || CHARS[key]?.Other || CHARS.observer.Other;

// ─── Level aura ───────────────────────────────────────────────────────────────
const LEVEL_AURA = {
  L5: {
    card: "bg-red-500/10 border-red-500/40",
    badge: "bg-red-500/15 border-red-500/40 text-red-400",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
    ring: "border-red-500/50",
  },
  L4: {
    card: "bg-amber-500/10 border-amber-500/40",
    badge: "bg-amber-500/15 border-amber-500/40 text-amber-400",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]",
    ring: "border-amber-500/60",
  },
  L3: {
    card: "bg-indigo-500/8 border-indigo-500/30",
    badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
    glow: "",
    ring: "border-indigo-500/40",
  },
  L2: {
    card: "bg-blue-500/6 border-blue-500/20",
    badge: "bg-blue-500/15 border-blue-500/20 text-blue-400",
    glow: "",
    ring: "border-blue-500/30",
  },
  L1: {
    card: "bg-white/[0.02] border-white/[0.06]",
    badge: "bg-white/[0.05] border-white/[0.08] text-white/40",
    glow: "",
    ring: "border-white/20",
  },
};
const getLevelKey = (level) => {
  if (!level) return "L1";
  const code = String(level).match(/L(\d)/)?.[1];
  const n = parseInt(code || "1");
  return n >= 5
    ? "L5"
    : n === 4
      ? "L4"
      : n === 3
        ? "L3"
        : n === 2
          ? "L2"
          : "L1";
};

// ─── Notification milestones ──────────────────────────────────────────────────
const RANK_MILESTONES = [1, 3, 10, 50];
const PERCENTILE_MILESTONES = [1, 5, 10, 25, 50];

async function maybeWriteRankNotification(uid, newRank, totalUsers) {
  if (!uid || !newRank || !totalUsers) return;
  const storageKey = `lbNotified_${uid}`;
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    stored = {};
  }

  const prevRank = stored.rank || newRank;
  const prevPct = stored.pct || 100;
  const newPct = Math.ceil((newRank / totalUsers) * 100);

  const notifications = [];

  // Rank improved by 10+ positions
  if (prevRank - newRank >= 10) {
    notifications.push({
      message: `⚡ Rank climbed! You're now #${newRank} on the global leaderboard. Keep executing.`,
      time: new Date().toISOString(),
      type: "rank",
      read: false,
    });
  }

  // Crossed a rank milestone
  for (const milestone of RANK_MILESTONES) {
    if (newRank <= milestone && prevRank > milestone) {
      const msgs = {
        1: "🏆 You are #1 globally. Absolute elite. Congratulations.",
        3: "🥉 You've entered the Top 3 globally. Extraordinary execution.",
        10: "🎯 Top 10 globally. You are in the elite tier.",
        50: "🔥 Top 50 globally. Exceptional momentum.",
      };
      notifications.push({
        message: msgs[milestone],
        time: new Date().toISOString(),
        type: "rank_milestone",
        read: false,
      });
    }
  }

  // Crossed a percentile milestone
  for (const pct of PERCENTILE_MILESTONES) {
    if (newPct <= pct && prevPct > pct) {
      const work =
        pct <= 5 ? "Incredible." : pct <= 10 ? "Outstanding." : "Keep pushing.";
      notifications.push({
        message: `🎉 You're now in the Top ${pct}% globally! ${work}`,
        time: new Date().toISOString(),
        type: "percentile",
        read: false,
      });
    }
  }

  // Rank dropped by 10+ positions — motivational
  if (newRank - prevRank >= 10 && prevRank !== newRank) {
    notifications.push({
      message: `💪 Your rank slipped to #${newRank}. Work hard — execute relentlessly.`,
      time: new Date().toISOString(),
      type: "rank_drop",
      read: false,
    });
  }

  if (notifications.length > 0) {
    try {
      const userRef = doc(db, "users", uid);
      for (const notif of notifications) {
        await updateDoc(userRef, { notifications: arrayUnion(notif) });
      }
    } catch (e) {
      console.warn("[Leaderboard] Notification write failed:", e);
    }
  }

  // Cache new state
  localStorage.setItem(
    storageKey,
    JSON.stringify({ rank: newRank, pct: newPct, ts: Date.now() }),
  );
}

// ─── Small components ─────────────────────────────────────────────────────────

const Toast = ({ toasts }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[800] flex flex-col gap-2 items-center pointer-events-none">
    <AnimatePresence>
      {toasts.map((t) => (
        <motion.div
          key={t.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          className={cn(
            "px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-xs font-bold flex items-center gap-2.5 max-w-sm text-center",
            t.type === "success"
              ? "bg-emerald-900/80 border-emerald-500/30 text-emerald-300"
              : t.type === "rank"
                ? "bg-amber-900/80 border-amber-500/30 text-amber-300"
                : t.type === "drop"
                  ? "bg-rose-900/80 border-rose-500/30 text-rose-300"
                  : "bg-[#111]/90 border-white/10 text-white/80",
          )}
        >
          {t.type === "rank"
            ? "🏆"
            : t.type === "success"
              ? "✅"
              : t.type === "drop"
                ? "💪"
                : "ℹ️"}
          {t.message}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

const Pill = ({ active, onClick, children, color = "amber" }) => {
  const C = {
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    blue: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all shrink-0",
        active
          ? C[color] || C.amber
          : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/60",
      )}
    >
      {children}
    </button>
  );
};

const FilterSelect = ({ label, value, onChange, options, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all",
          disabled
            ? "opacity-40 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-white/30"
            : open
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : value
                ? "bg-white/[0.04] border-white/[0.08] text-white"
                : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:border-white/15",
        )}
      >
        <span className="truncate">{value || label}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-[#0f0f0f] border border-[#222] rounded-xl shadow-2xl z-50 max-h-44 overflow-y-auto custom-scrollbar"
          >
            <div
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="px-3 py-2.5 text-xs font-bold text-white/30 hover:bg-white/[0.04] hover:text-white cursor-pointer transition-colors border-b border-[#1a1a1a]"
            >
              Any {label}
            </div>
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn(
                  "px-3 py-2.5 text-xs font-bold cursor-pointer transition-colors border-b border-[#1a1a1a] last:border-0",
                  value === opt
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Composite Operator Avatar ────────────────────────────────────────────────
// Primary: real profile photo. Overlay: Discotive character badge (bottom-right).
const OperatorAvatar = ({ player, size = "md", aura, className = "" }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-14 h-14",
    xl: "w-16 h-16",
  };
  const charSz = { sm: "w-5 h-5", md: "w-6 h-6", lg: "w-8 h-8", xl: "w-9 h-9" };
  const radii = {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-2xl",
  };
  const textSz = {
    sm: "text-[9px]",
    md: "text-xs",
    lg: "text-base",
    xl: "text-lg",
  };

  const initials = (
    player?.identity?.firstName?.charAt(0) ||
    player?.identity?.fullName?.charAt(0) ||
    player?.identity?.username?.charAt(0) ||
    "?"
  ).toUpperCase();

  const gender = player?.identity?.gender || "Male";
  const score = player?.discotiveScore?.current || 0;
  const rankKey =
    score > 4000
      ? "rank1"
      : score > 1800
        ? "rank2"
        : score > 600
          ? "rank3"
          : "observer";
  const charSrc = getAvatar(rankKey, gender);

  return (
    <div
      className={cn(
        "relative shrink-0 transition-transform group-hover:scale-105",
        className,
      )}
    >
      {/* Primary: profile photo or gradient fallback */}
      <div
        className={cn(
          sizes[size],
          radii[size],
          "border-2 flex items-center justify-center overflow-hidden font-black",
          aura?.ring || "border-white/20",
          aura?.badge?.split(" ").slice(-1)[0] || "bg-white/[0.06]",
        )}
      >
        {player?.identity?.avatarUrl ? (
          <img
            src={player.identity.avatarUrl}
            alt={initials}
            className="w-full h-full object-cover"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
          />
        ) : (
          <span className={cn(textSz[size], "select-none")}>{initials}</span>
        )}
      </div>

      {/* Character badge — bottom-right overlay */}
      <div
        className={cn(
          "absolute -bottom-1.5 -right-1.5 rounded-full border-2 border-[#030303] bg-[#030303] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
          charSz[size],
        )}
      >
        <img
          src={charSrc}
          alt=""
          className="w-full h-full object-contain scale-125 translate-y-0.5"
          draggable={false}
        />
      </div>
    </div>
  );
};

// ─── Podium card ──────────────────────────────────────────────────────────────
const PodiumCard = ({ player, rank, resolvePlayerName, isMe, onClick }) => {
  const rankKey = rank === 1 ? "rank1" : rank === 2 ? "rank2" : "rank3";
  const heights = {
    1: "h-[260px] md:h-[320px]",
    2: "h-[210px] md:h-[270px]",
    3: "h-[180px] md:h-[230px]",
  };
  const avatarSizes = {
    1: "w-24 h-24 md:w-36 md:h-36",
    2: "w-20 h-20 md:w-28 md:h-28",
    3: "w-16 h-16 md:w-24 md:h-24",
  };
  const badgeSizes = {
    1: "w-10 h-10 md:w-14 md:h-14 -bottom-1 -right-1 md:-bottom-2 md:-right-2",
    2: "w-8 h-8 md:w-12 md:h-12 -bottom-1 -right-1 md:-bottom-1.5 md:-right-1.5",
    3: "w-7 h-7 md:w-10 md:h-10 -bottom-0.5 -right-0.5",
  };
  const ringColors = {
    1: "border-[#BFA264] shadow-[0_0_30px_rgba(191,162,100,0.4)] ring-4 ring-[#BFA264]/20",
    2: "border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.25)] ring-4 ring-slate-300/20",
    3: "border-orange-700 shadow-[0_0_20px_rgba(194,65,12,0.25)] ring-4 ring-orange-700/20",
  };
  const textSizes = {
    1: "text-3xl md:text-5xl",
    2: "text-2xl md:text-4xl",
    3: "text-xl md:text-3xl",
  };

  const initials = (
    player?.identity?.firstName?.charAt(0) ||
    player?.identity?.fullName?.charAt(0) ||
    player?.identity?.username?.charAt(0) ||
    "?"
  ).toUpperCase();

  const gradients = {
    1: "from-[#231a05] to-[#16100200] border-amber-900/40 shadow-[0_-30px_60px_rgba(245,158,11,0.12)]",
    2: "from-[#141822] to-[#0e111800] border-slate-700/25",
    3: "from-[#1a1105] to-[#12090000] border-orange-900/25",
  };
  const textColors = {
    1: "text-amber-400",
    2: "text-slate-300",
    3: "text-orange-400/70",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-end cursor-pointer group",
        heights[rank],
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center mb-[-12px] z-10 transition-transform group-hover:scale-105",
          avatarSizes[rank],
        )}
      >
        {rank === 1 && (
          <Crown className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 w-7 h-7 md:w-9 md:h-9 text-[#BFA264] animate-bounce drop-shadow-[0_0_15px_rgba(191,162,100,0.8)] z-30" />
        )}

        {/* Academy Award Primary Frame */}
        <div
          className={cn(
            "w-full h-full rounded-2xl flex items-center justify-center overflow-hidden border-2 bg-[#0a0a0a]",
            ringColors[rank],
            isMe && "brightness-110",
          )}
        >
          {player?.identity?.avatarUrl ? (
            <img
              src={player.identity.avatarUrl}
              alt={`${player.identity?.username || "Operator"}'s avatar`}
              className="w-full h-full object-cover"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <span
              className={cn(
                "font-black text-white/50 select-none",
                textSizes[rank],
              )}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Character Badge Overlay */}
        <div
          className={cn(
            "absolute rounded-full border-2 border-[#030303] bg-[#030303] overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.9)] z-20",
            badgeSizes[rank],
          )}
        >
          <img
            src={getAvatar(rankKey, player.identity?.gender)}
            alt="Rank Badge"
            className="w-full h-full object-contain scale-125 translate-y-0.5 pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      <div
        className={cn(
          "w-full bg-gradient-to-t rounded-t-2xl flex flex-col items-center border relative overflow-hidden px-2 py-3 flex-1",
          gradients[rank],
        )}
      >
        {/* Shimmer on rank 1 */}
        {rank === 1 && (
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-amber-500/8 to-transparent pointer-events-none"
          />
        )}

        <p
          className={cn(
            "text-[10px] md:text-xs font-black truncate w-full text-center",
            textColors[rank],
          )}
        >
          {resolvePlayerName(player, true)}
        </p>
        <p className="text-[8px] md:text-[9px] text-white/30 font-mono truncate w-full text-center">
          @{player.identity?.username || "—"}
        </p>

        {/* Premium logo */}
        {player.tier === "PRO" && (
          <img
            src="/logo-premium.png"
            alt="Pro"
            className="w-4 h-4 object-contain mt-0.5 opacity-80"
          />
        )}

        <p className="text-[7px] md:text-[8px] font-bold uppercase tracking-widest text-white/20 truncate w-full text-center mt-0.5">
          {player.identity?.niche || "General"}
        </p>

        <div
          className={cn(
            "mt-auto font-mono font-black text-sm md:text-base opacity-20",
            textColors[rank],
          )}
        >
          {String(rank).padStart(2, "0")}
        </div>

        <div
          className={cn("text-[9px] font-black font-mono", textColors[rank])}
        >
          {(player.discotiveScore?.current || 0).toLocaleString()} pts
        </div>
      </div>
    </motion.div>
  );
};

// ─── Player row (desktop table row + mobile card) ─────────────────────────────
const PlayerRow = ({
  player,
  rank,
  isMe,
  onClick,
  resolvePlayerName,
  myRank,
}) => {
  const score = player.discotiveScore?.current || 0;
  const last24 = player.discotiveScore?.last24h || score;
  const delta = score - last24;
  const vault = player.vault?.length || 0;
  const streak = player.discotiveScore?.streak || 0;
  const levelStr = player.identity?.level || player.level || "L1";
  const levelKey = getLevelKey(levelStr);
  const aura = LEVEL_AURA[levelKey];
  const levelCode = levelStr.split(" - ")[0] || "L1";
  const isNextTarget = myRank && rank === myRank - 1;

  const initials = (
    player.identity?.firstName?.charAt(0) ||
    player.identity?.fullName?.charAt(0) ||
    player.identity?.username?.charAt(0) ||
    "?"
  ).toUpperCase();

  const name = resolvePlayerName(player);
  const username = player.identity?.username || player.username || "—";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-all duration-200 border-b border-white/[0.03] relative overflow-hidden",
        isMe
          ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.1]"
          : isNextTarget
            ? "bg-sky-500/[0.04] hover:bg-sky-500/[0.08]"
            : "hover:bg-white/[0.025]",
        aura.card.includes("L5") || aura.card.includes("L4") ? aura.glow : "",
      )}
    >
      {/* DESKTOP ROW */}
      <div className="hidden md:grid grid-cols-[52px_2fr_1.2fr_100px_70px_70px_100px] gap-3 items-center px-5 py-4">
        {/* Rank # */}
        <div
          className={cn(
            "text-center font-mono font-black text-sm",
            rank === 1
              ? "text-amber-400"
              : rank <= 3
                ? "text-white/60"
                : "text-white/25",
          )}
        >
          {rank <= 3 ? (
            <span
              className={cn(
                "text-lg",
                rank === 1
                  ? "text-amber-500"
                  : rank === 2
                    ? "text-slate-400"
                    : "text-orange-500/60",
              )}
            >
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </span>
          ) : (
            rank
          )}
        </div>

        {/* Operator */}
        <div className="flex items-center gap-3 min-w-0">
          <OperatorAvatar player={player} size="md" aura={aura} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-sm font-bold truncate transition-colors",
                  isMe
                    ? "text-amber-400"
                    : "text-white/90 group-hover:text-white",
                )}
              >
                {name}
              </span>
              {player.tier === "PRO" && (
                <img
                  src="/logo-premium.png"
                  alt="Pro"
                  className="w-4 h-4 object-contain shrink-0"
                />
              )}
              {isMe && (
                <span className="text-[8px] font-black bg-amber-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                  You
                </span>
              )}
              {isNextTarget && (
                <span className="text-[8px] font-black bg-sky-500/15 border border-sky-500/25 text-sky-400 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                  Target
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/30 font-mono">
              @{username}
            </span>
          </div>
        </div>

        {/* Domain/Niche */}
        <div className="min-w-0">
          <p className="text-xs text-white/60 truncate">
            {player.identity?.domain || "—"}
          </p>
          <p className="text-[10px] text-white/25 truncate">
            {player.identity?.niche || "General"}
          </p>
        </div>

        {/* Level badge */}
        <div>
          <span
            className={cn(
              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
              aura.badge,
            )}
          >
            {levelCode}
          </span>
        </div>

        {/* Vault */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Database className="w-3 h-3 text-emerald-500/50 shrink-0" />
            <span className="text-xs font-mono text-white/50">{vault}</span>
          </div>
        </div>

        {/* Streak */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame
              className={cn(
                "w-3 h-3 shrink-0",
                streak >= 7 ? "text-orange-400" : "text-white/20",
              )}
            />
            <span
              className={cn(
                "text-xs font-mono",
                streak >= 7 ? "text-orange-400" : "text-white/30",
              )}
            >
              {streak}d
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <div
            className={cn(
              "font-mono text-sm font-black",
              rank <= 3 ? "text-amber-400" : "text-white/80",
            )}
          >
            {score.toLocaleString()}
          </div>
          {delta !== 0 && (
            <div
              className={cn(
                "flex items-center justify-end gap-0.5 text-[9px] font-bold mt-0.5",
                delta > 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              {delta > 0 ? `+${delta}` : delta}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE CARD */}
      <div className="flex md:hidden items-start gap-3 px-4 py-3.5">
        {/* Rank */}
        <div className="w-8 shrink-0 text-center pt-1">
          {rank <= 3 ? (
            <span className="text-lg">
              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
            </span>
          ) : (
            <span className="text-xs font-black font-mono text-white/25">
              #{rank}
            </span>
          )}
        </div>

        {/* Avatar */}
        <OperatorAvatar player={player} size="md" aura={aura} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                "text-sm font-bold",
                isMe ? "text-amber-400" : "text-white/90",
              )}
            >
              {name}
            </span>
            {player.tier === "PRO" && (
              <img
                src="/logo-premium.png"
                alt="Pro"
                className="w-3.5 h-3.5 object-contain shrink-0"
              />
            )}
            {isMe && (
              <span className="text-[7px] font-black bg-amber-500/20 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                You
              </span>
            )}
            {isNextTarget && (
              <span className="text-[7px] font-black bg-sky-500/15 border border-sky-500/25 text-sky-400 px-1.5 py-0.5 rounded uppercase tracking-widest">
                Target
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[9px] text-white/30 font-mono">
              @{username}
            </span>
            <span className="text-[9px] text-white/25">·</span>
            <span
              className={cn(
                "text-[8px] font-black px-1.5 py-0.5 rounded border",
                aura.badge,
              )}
            >
              {levelCode}
            </span>
          </div>
          <p className="text-[9px] text-white/20 mt-0.5 truncate">
            {player.identity?.domain || "—"} ·{" "}
            {player.identity?.niche || "General"}
          </p>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "font-mono text-sm font-black",
              rank <= 3 ? "text-amber-400" : "text-white/80",
            )}
          >
            {score.toLocaleString()}
          </div>
          {delta !== 0 && (
            <div
              className={cn(
                "flex items-center justify-end gap-0.5 text-[8px] font-bold",
                delta > 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {delta > 0 ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" />
              )}
              {delta > 0 ? `+${delta}` : delta}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Player detail sidebar ─────────────────────────────────────────────────────
const PlayerSidebar = ({
  player,
  onClose,
  onCompare,
  resolvePlayerName,
  navigate,
}) => {
  const score = player.discotiveScore?.current || 0;
  const vault = player.vault || [];
  const allies = player.allies || [];
  const skills = player.skills?.alignedSkills || [];
  const name = resolvePlayerName(player);
  const level = player.identity?.level || "L1";
  const lk = getLevelKey(level);
  const aura = LEVEL_AURA[lk];

  const radarData = [
    { metric: "Execution", val: Math.min(100, score / 50) },
    { metric: "Vault", val: Math.min(100, vault.length * 10) },
    { metric: "Network", val: Math.min(100, allies.length * 5) },
    { metric: "Skills", val: Math.min(100, skills.length * 10) },
    {
      metric: "Streak",
      val: Math.min(100, (player.discotiveScore?.streak || 0) * 3),
    },
  ];

  return (
    <motion.aside
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed md:relative inset-0 md:inset-auto z-[200] md:z-auto md:w-[340px] lg:w-[380px] shrink-0 bg-[#050505] border-l border-[#1a1a1a] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#111] bg-[#080808] shrink-0">
        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
          Operator Profile
        </p>
        <button
          onClick={onClose}
          className="p-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <OperatorAvatar player={player} size="lg" aura={aura} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">{name}</h3>
              {player.tier === "PRO" && (
                <img
                  src="/logo-premium.png"
                  alt="Pro"
                  className="w-5 h-5 object-contain"
                />
              )}
            </div>
            <p className="text-xs text-white/30 font-mono">
              @{player.identity?.username || "—"}
            </p>
            <span
              className={cn(
                "inline-flex mt-1.5 text-[8px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest",
                aura.badge,
              )}
            >
              {(player.identity?.level || "L1").split(" - ")[0]}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="space-y-2">
          {player.identity?.domain && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Target className="w-3.5 h-3.5 text-amber-500/50 shrink-0" />
              {player.identity.domain}
              {player.identity.niche ? ` · ${player.identity.niche}` : ""}
            </div>
          )}
          {(player.footprint?.location || player.identity?.country) && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {player.footprint?.location || player.identity?.country}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              label: "Score",
              val: score.toLocaleString(),
              icon: Zap,
              color: "text-amber-400",
            },
            {
              label: "Vault",
              val: vault.length,
              icon: Database,
              color: "text-emerald-400",
            },
            {
              label: "Allies",
              val: allies.length,
              icon: Users,
              color: "text-violet-400",
            },
          ].map(({ label, val, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-3 text-center"
            >
              <Icon className={cn("w-4 h-4 mx-auto mb-1.5", color)} />
              <p className="text-xs font-mono font-black text-white">{val}</p>
              <p className="text-[8px] text-white/25 uppercase tracking-widest mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Radar */}
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-4">
          <p className="text-[8px] font-black text-white/30 uppercase tracking-widest text-center mb-3">
            Execution Telemetry
          </p>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }}
                />
                <Radar
                  name="Operator"
                  dataKey="val"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <p className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-2">
              Capabilities
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 8).map((s, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[9px] font-bold text-white/50"
                >
                  {s}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="text-[9px] text-white/20 self-center">
                  +{skills.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bio */}
        {player.footprint?.bio && (
          <div>
            <p className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-2">
              Bio
            </p>
            <p className="text-xs text-white/40 leading-relaxed">
              {player.footprint.bio}
            </p>
          </div>
        )}

        {/* Vault assets */}
        {vault.filter((v) => v.status === "VERIFIED").length > 0 && (
          <div>
            <p className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-2">
              Verified Assets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vault
                .filter((v) => v.status === "VERIFIED")
                .slice(0, 3)
                .map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-1 bg-emerald-500/8 border border-emerald-500/20 rounded-lg text-[8px] font-bold text-emerald-400"
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {a.category || "Asset"}
                  </span>
                ))}
              {vault.filter((v) => v.status === "VERIFIED").length > 3 && (
                <span className="text-[9px] text-white/25">
                  +{vault.filter((v) => v.status === "VERIFIED").length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#111] bg-[#080808] shrink-0 flex flex-col gap-2">
        <button
          onClick={onCompare}
          className="w-full py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <Crosshair className="w-4 h-4" /> X-Ray Analysis
        </button>
        <button
          onClick={() =>
            navigate(`/@${player.identity?.username || player.username}`)
          }
          className="w-full py-2.5 bg-white text-black text-xs font-black rounded-xl hover:bg-[#ddd] transition-colors flex items-center justify-center gap-2 uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Eye className="w-4 h-4" /> View Public Profile
        </button>
      </div>
    </motion.aside>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Leaderboard = () => {
  const filterCountCache = useRef(new Map());

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { userData, loading: userLoading } = useUserData();
  const { requireOnboarding } = useOnboardingGate();
  const { competitors = [], fetchNetworkData } =
    useNetwork(currentUser, userData) || {};

  // ── Data state ──────────────────────────────────────────────────────────
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ── Pagination cursors ──────────────────────────────────────────────────
  const [firstDoc, setFirstDoc] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // ── Rank telemetry ──────────────────────────────────────────────────────
  const [myRank, setMyRank] = useState(null);
  const [nextTarget, setNextTarget] = useState(null);
  const [percentile, setPercentile] = useState(null);

  // ── UI ──────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search: searchParams.get("q") || "",
    domain: "",
    niche: "",
    level: "",
    country: "",
    sortBy: "score_desc",
    pageSize: 15,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [searchInput, setSearchInput] = useState(filters.search);
  // "global" | "territory" | "hitlist" | "alliances"
  const [arenaTab, setArenaTab] = useState("global");

  const searchDebounceRef = useRef(null);
  const lastFetchFilterRef = useRef("");

  // ── Helpers ─────────────────────────────────────────────────────────────
  const isGhostUser = useMemo(
    () =>
      userData?.isGhostUser === true || userData?.onboardingComplete === false,
    [userData],
  );

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  const addToast = (message, type = "default") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const resolvePlayerName = useCallback((player, firstOnly = false) => {
    const id = player?.identity || {};
    if (id.firstName) {
      const full = `${id.firstName} ${id.lastName || ""}`.trim();
      return firstOnly ? id.firstName : full;
    }
    if (id.fullName) return firstOnly ? id.fullName.split(" ")[0] : id.fullName;
    if (id.username) return `@${id.username}`;
    return "Operator";
  }, []);

  // ── Filter constraints builder ──────────────────────────────────────────
  const buildConstraints = useCallback(
    (extra = []) => {
      const c = [where("onboardingComplete", "==", true), ...extra];
      if (filters.domain)
        c.push(where("identity.domain", "==", filters.domain));
      if (filters.niche) c.push(where("identity.niche", "==", filters.niche));
      if (filters.level) c.push(where("identity.level", "==", filters.level));
      if (filters.country)
        c.push(where("identity.country", "==", filters.country));
      return c;
    },
    [filters.domain, filters.niche, filters.level, filters.country],
  );

  // ── Order by ────────────────────────────────────────────────────────────
  const getOrderBy = () => {
    switch (filters.sortBy) {
      case "score_asc":
        return [orderBy("discotiveScore.current", "asc")];
      case "vault_desc":
        return [
          orderBy("vault_count", "desc"),
          orderBy("discotiveScore.current", "desc"),
        ];
      case "streak_desc":
        return [orderBy("discotiveScore.streak", "desc")];
      default:
        return [orderBy("discotiveScore.current", "desc")];
    }
  };

  // ── Main fetch ──────────────────────────────────────────────────────────
  const executeFetch = useCallback(
    async (direction = "initial") => {
      setFetchError(null);
      if (direction === "initial") {
        setIsLoading(true);
        setPage(1);
      } else setIsPaging(true);

      try {
        let q;

        if (filters.search) {
          // Prefix search on username — no composite index needed
          const term = filters.search.toLowerCase();
          q = query(
            collection(db, "users"),
            where("onboardingComplete", "==", true),
            where("identity.username", ">=", term),
            where("identity.username", "<=", term + "\uf8ff"),
            limit(30),
          );
        } else {
          const constraints = buildConstraints();
          const ordering = getOrderBy();

          if (direction === "next" && lastDoc) {
            q = query(
              collection(db, "users"),
              ...constraints,
              ...ordering,
              startAfter(lastDoc),
              limit(filters.pageSize),
            );
          } else if (direction === "prev" && firstDoc) {
            q = query(
              collection(db, "users"),
              ...constraints,
              ...ordering,
              endBefore(firstDoc),
              limitToLast(filters.pageSize),
            );
          } else {
            q = query(
              collection(db, "users"),
              ...constraints,
              ...ordering,
              limit(filters.pageSize),
            );
          }
        }

        const snap = await getDocs(q);
        const docs = snap.docs;

        let fetched = docs.map((d) => ({ id: d.id, ...d.data() }));

        // Local sort for search (Firebase can't combine inequality + order on different field)
        if (filters.search) {
          fetched.sort(
            (a, b) =>
              (b.discotiveScore?.current || 0) -
              (a.discotiveScore?.current || 0),
          );
        }

        setPlayers(fetched);
        if (docs.length > 0) {
          setFirstDoc(docs[0]);
          setLastDoc(docs[docs.length - 1]);
        }

        if (direction === "initial") {
          setHasPrev(false);
          setHasNext(docs.length === (filters.search ? 30 : filters.pageSize));
          setPage(1);
        } else if (direction === "next") {
          setPage((p) => p + 1);
          setHasPrev(true);
          setHasNext(docs.length === filters.pageSize);
        } else if (direction === "prev") {
          setPage((p) => p - 1);
          setHasNext(true);
          setHasPrev(page - 1 > 1);
        }

        if (docs.length === 0 && direction === "initial") setPlayers([]);
      } catch (err) {
        console.error("[Leaderboard] Fetch failed:", err.message);
        setFetchError(
          "Index building in progress or filter not yet supported. Try a broader filter, or check the console for an index creation link.",
        );
      } finally {
        setIsLoading(false);
        setIsPaging(false);
      }
    },
    [filters, buildConstraints, lastDoc, firstDoc, page],
  ); // eslint-disable-line

  // ── Rank + count (only on filter change, quota-safe) ────────────────────
  const fetchRankAndCount = useCallback(async () => {
    if (isGhostUser || !userData?.discotiveScore) return;

    const cacheKey = JSON.stringify({
      domain: filters.domain,
      niche: filters.niche,
      level: filters.level,
      country: filters.country,
    });
    // 1. Check if we already queried this exact filter combination
    if (filterCountCache.current.has(cacheKey)) {
      const cached = filterCountCache.current.get(cacheKey);
      setTotalCount(cached.total);
      setMyRank(cached.myRank);
      setPercentile(cached.percentile);
      setNextTarget(cached.nextTarget);
      return; // Exit instantly. Zero reads.
    }

    try {
      const constraints = buildConstraints();

      // Total count (1 Firestore read)
      const totalSnap = await getCountFromServer(
        query(collection(db, "users"), ...constraints),
      );
      const total = totalSnap.data().count;

      // My rank (1 Firestore read)
      const myScore = userData.discotiveScore.current;
      const rankSnap = await getCountFromServer(
        query(
          collection(db, "users"),
          ...constraints,
          where("discotiveScore.current", ">", myScore),
        ),
      );
      const newRank = rankSnap.data().count + 1;
      const newPct = total > 0 ? Math.ceil((newRank / total) * 100) : 100;

      // Next target (1 read)
      const targetSnap = await getDocs(
        query(
          collection(db, "users"),
          ...constraints,
          where("discotiveScore.current", ">", myScore),
          orderBy("discotiveScore.current", "asc"),
          limit(1),
        ),
      );

      const nextTargetData = targetSnap.empty
        ? null
        : { id: targetSnap.docs[0].id, ...targetSnap.docs[0].data() };

      // Update UI
      setTotalCount(total);
      setMyRank(newRank);
      setPercentile(newPct);
      setNextTarget(nextTargetData);

      // 2. Save to cache so we never pay for this combo again
      filterCountCache.current.set(cacheKey, {
        total,
        myRank: newRank,
        percentile: newPct,
        nextTarget: nextTargetData,
      });

      // Notification logic (async, non-blocking)
      const uid = userData.uid || userData.id;
      if (uid) maybeWriteRankNotification(uid, newRank, total).catch(() => {});
    } catch (e) {
      console.error("[Leaderboard] Rank engine:", e);
    }
  }, [isGhostUser, userData, buildConstraints, filters]);

  // ── Effects ──────────────────────────────────────────────────────────────
  // Hydrate network targets for the Live Battlefield
  useEffect(() => {
    if (userLoading || !currentUser || !fetchNetworkData) return;
    fetchNetworkData();
  }, [userLoading, currentUser, fetchNetworkData]);

  useEffect(() => {
    if (userLoading) return;
    executeFetch("initial");
    fetchRankAndCount();
  }, [
    filters.domain,
    filters.niche,
    filters.level,
    filters.country,
    filters.sortBy,
    filters.pageSize,
    userLoading,
  ]); // eslint-disable-line

  // Search debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      if (!userLoading) executeFetch("initial");
    }, 500);
    return () => clearTimeout(searchDebounceRef.current);
  }, [searchInput]); // eslint-disable-line

  // ── Derived ──────────────────────────────────────────────────────────────
  const isFirstPage = page === 1;
  const top3 = isFirstPage && !filters.search ? players.slice(0, 3) : [];
  const listPlayers =
    isFirstPage && !filters.search ? players.slice(3) : players;

  const myPlayerObj = players.find(
    (p) =>
      p.id === userData?.uid ||
      p.id === userData?.id ||
      p.identity?.username === userData?.identity?.username,
  );

  // ── Arena tab derived data (zero extra Firestore reads) ──────────────────
  const myScore = userData?.discotiveScore?.current || 0;
  const myCountry = userData?.identity?.country || "";

  const myAlliesIds = useMemo(
    () => new Set(userData?.allies || []),
    [userData?.allies], // eslint-disable-line
  );

  const arenaFilteredList = useMemo(() => {
    if (arenaTab === "territory" && myCountry) {
      return players.filter((p) => p.identity?.country === myCountry);
    }
    if (arenaTab === "alliances") {
      return players.filter((p) => myAlliesIds.has(p.id));
    }
    return players;
  }, [arenaTab, players, myCountry, myAlliesIds]);

  // Tabs other than global bypass the podium + use client-side filtered list
  const tabListPlayers =
    arenaTab === "global" ? listPlayers : arenaFilteredList;
  const tabTop3 = arenaTab === "global" ? top3 : [];

  const myLevelStr = userData?.identity?.level || userData?.level || "L1";
  const userAura = LEVEL_AURA[getLevelKey(myLevelStr)];

  const activeFilterCount = [
    filters.domain,
    filters.niche,
    filters.level,
    filters.country,
  ].filter(Boolean).length;
  const isFirstRender = isLoading && players.length === 0;

  // ── Mini Leaderboard Data (You + Targets) ────────────────────────────────
  const miniLeaderboard = useMemo(() => {
    if (!userData) return [];
    const me = {
      id: userData.uid || userData.id,
      identity: userData.identity,
      discotiveScore: userData.discotiveScore,
      tier: userData.tier,
      _isMe: true,
    };
    const mappedCompetitors = competitors.map((c) => ({
      id: c.targetId,
      identity: {
        username: c.targetUsername,
        firstName: c.targetName?.split(" ")[0],
        lastName: c.targetName?.split(" ").slice(1).join(" "),
        avatarUrl: c.targetAvatar,
      },
      discotiveScore: { current: c.targetScore || 0 },
      _isMe: false,
    }));

    return [me, ...mappedCompetitors]
      .sort(
        (a, b) =>
          (b.discotiveScore?.current || 0) - (a.discotiveScore?.current || 0),
      )
      .slice(0, 11);
  }, [userData, competitors]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCompare = (player) => {
    if (!requireOnboarding("compare_xray")) return;
    if (!isPro) {
      setIsUpsellOpen(true);
      return;
    }
    if (player.id === (userData?.uid || userData?.id)) return;
    setCompareTarget(player);
    setIsCompareOpen(true);
  };

  const clearFilters = () => {
    setFilters((f) => ({
      ...f,
      domain: "",
      niche: "",
      level: "",
      country: "",
    }));
    setSearchInput("");
    lastFetchFilterRef.current = "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (userLoading || isFirstRender)
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.12 }}
                className="w-1 h-7 bg-amber-500 rounded-full origin-bottom"
              />
            ))}
          </div>
          <p className="text-[9px] text-white/30 uppercase tracking-[0.25em] font-bold">
            Syncing Arena Matrix
          </p>
        </div>
      </div>
    );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-[#030303] text-white font-sans overflow-hidden selection:bg-amber-500/20">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <header className="relative z-20 shrink-0 border-b border-white/[0.05] bg-[#030303]/90 backdrop-blur-2xl px-4 md:px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title Section */}
          <div className="shrink-0 flex items-center justify-between w-full lg:w-auto">
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h1 className="text-base md:text-lg font-black tracking-tight text-white">
                  Global Arena
                </h1>
              </div>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest ml-7">
                {totalCount > 0
                  ? `${totalCount.toLocaleString()} operators`
                  : "Live rankings"}{" "}
                · Page {page}
              </p>
            </div>
          </div>

          {/* Controls Section (Search, Sort, Filters) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto lg:flex-1 justify-end">
            {/* Search */}
            <div className="flex-1 relative group w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 group-focus-within:text-amber-400 transition-colors" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search @username…"
                className="w-full bg-white/[0.03] border border-white/[0.06] text-white pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-amber-500/40 focus:bg-white/[0.05] transition-all text-sm placeholder:text-white/20"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & Filters Wrapper */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {/* Sort (Hidden on small mobile, visible on sm+) */}
              <div className="hidden sm:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.05] rounded-xl p-1">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() =>
                      setFilters((f) => ({ ...f, sortBy: o.value }))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      filters.sortBy === o.value
                        ? "bg-amber-500/15 text-amber-400"
                        : "text-white/25 hover:text-white/60",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => {
                  setIsFilterOpen((v) => !v);
                  setSelectedUser(null);
                }}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-black transition-all uppercase tracking-widest",
                  isFilterOpen || activeFilterCount > 0
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                    : "bg-white/[0.03] border-white/[0.05] text-white/40 hover:border-white/15 hover:text-white/70",
                )}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[8px] font-black flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Active filter pills */}
        {activeFilterCount > 0 && (
          <div className="max-w-[1600px] mx-auto mt-2 flex items-center gap-2 flex-wrap">
            {[
              { key: "domain", label: filters.domain },
              { key: "niche", label: filters.niche },
              { key: "level", label: filters.level },
              { key: "country", label: filters.country },
            ]
              .filter((f) => f.label)
              .map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-bold text-amber-400"
                >
                  {f.label}
                  <button
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, [f.key]: "" }))
                    }
                    className="hover:text-amber-200 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            <button
              onClick={clearFilters}
              className="text-[9px] font-bold text-white/25 hover:text-white/60 transition-colors uppercase tracking-widest"
            >
              Clear all
            </button>
          </div>
        )}
      </header>

      {/* Ghost banner */}
      {isGhostUser && (
        <div className="shrink-0 px-4 py-2.5 bg-amber-500/8 border-b border-amber-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs font-bold text-amber-400">
              Preview Mode —{" "}
              <span className="text-[#777] font-medium">
                Complete onboarding to appear in rankings and access X-Ray
                analytics.
              </span>
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-black font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all"
          >
            Onboard <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error banner */}
      {fetchError && (
        <div className="shrink-0 px-4 py-2.5 bg-rose-500/8 border-b border-rose-500/20 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-xs font-bold text-rose-400 flex-1">{fetchError}</p>
          <button onClick={() => setFetchError(null)}>
            <X className="w-3.5 h-3.5 text-rose-400 hover:text-white transition-colors" />
          </button>
        </div>
      )}

      {/* ════════════════════ WORKSPACE ════════════════════ */}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* ── FILTER SIDEBAR ───────────────────────────────────────────── */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="w-[260px] shrink-0 bg-[#050505] border-r border-[#111] overflow-y-auto custom-scrollbar p-5 space-y-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                  Filter Matrix
                </p>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 hover:bg-white/[0.05] rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/30" />
                </button>
              </div>

              <FilterSelect
                label="Domain"
                value={filters.domain}
                onChange={(v) =>
                  setFilters((f) => ({ ...f, domain: v, niche: "" }))
                }
                options={DOMAINS}
              />
              <FilterSelect
                label="Niche"
                value={filters.niche}
                onChange={(v) => setFilters((f) => ({ ...f, niche: v }))}
                options={NICHES[filters.domain] || Object.values(NICHES).flat()}
                disabled={!filters.domain}
              />
              <FilterSelect
                label="Level"
                value={filters.level}
                onChange={(v) => setFilters((f) => ({ ...f, level: v }))}
                options={LEVELS}
              />
              <FilterSelect
                label="Country"
                value={filters.country}
                onChange={(v) => setFilters((f) => ({ ...f, country: v }))}
                options={COUNTRIES}
              />

              <div>
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">
                  Page Size
                </p>
                <div className="flex gap-1.5">
                  {PAGE_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilters((f) => ({ ...f, pageSize: s }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg border text-[9px] font-black transition-all",
                        filters.pageSize === s
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-white/[0.03] border-white/[0.05] text-white/30 hover:text-white/60",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort (mobile — shown here when hidden in header) */}
              <div className="sm:hidden">
                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">
                  Sort By
                </p>
                <div className="flex flex-col gap-1.5">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() =>
                        setFilters((f) => ({ ...f, sortBy: o.value }))
                      }
                      className={cn(
                        "w-full px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all",
                        filters.sortBy === o.value
                          ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          : "bg-white/[0.02] border-white/[0.05] text-white/40",
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 border border-rose-500/20 bg-rose-500/8 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/15 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MAIN LIST + RIGHT TELEMETRY RAIL ─────────────────────────── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar min-w-0">
          <div className="p-4 md:p-6 pb-40 flex gap-5 xl:gap-6 max-w-[1680px] mx-auto">
            {/* ══ CENTER COLUMN ════════════════════════════════════════════ */}
            <div className="flex-1 min-w-0">
              {/* ── ARENA TAB BAR ────────────────────────────────────────── */}
              <div className="flex items-center gap-1.5 mb-5 overflow-x-auto hide-scrollbar pb-1">
                {[
                  { id: "global", icon: Trophy, label: "Global" },
                  {
                    id: "territory",
                    icon: MapPin,
                    label: myCountry
                      ? myCountry.split("/")[0].trim().split(" ")[0]
                      : "Territory",
                    disabled: !myCountry,
                  },
                  {
                    id: "alliances",
                    icon: Users,
                    label: "Alliances",
                    badge:
                      arenaTab !== "alliances" &&
                      (userData?.allies?.length || 0) > 0
                        ? userData.allies.length
                        : null,
                    badgeColor: "bg-violet-500 text-white",
                  },
                ].map(
                  ({ id, icon: Icon, label, badge, badgeColor, disabled }) => (
                    <button
                      key={id}
                      disabled={!!disabled}
                      onClick={() => setArenaTab(id)}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
                        arenaTab === id
                          ? "bg-[rgba(191,162,100,0.10)] border-[rgba(191,162,100,0.35)] text-[#BFA264] shadow-[0_0_14px_rgba(191,162,100,0.12)]"
                          : disabled
                            ? "bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed"
                            : "bg-white/[0.03] border-white/[0.05] text-white/40 hover:bg-white/[0.06] hover:text-white/70 hover:border-white/10",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:block">{label}</span>
                      {badge && (
                        <span
                          className={cn(
                            "min-w-[16px] h-4 px-1 rounded-full text-[7px] font-black flex items-center justify-center",
                            badgeColor || "bg-[#BFA264] text-black",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  ),
                )}

                {/* Contextual label */}
                <AnimatePresence mode="wait">
                  {arenaTab === "alliances" && (
                    <motion.div
                      key="al-label"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/8 border border-violet-500/20 rounded-xl shrink-0"
                    >
                      <Users className="w-3 h-3 text-violet-400" />
                      <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest hidden sm:block">
                        {userData?.allies?.length || 0} allies tracked
                      </span>
                    </motion.div>
                  )}
                  {arenaTab === "territory" && myCountry && (
                    <motion.div
                      key="tr-label"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/8 border border-sky-500/20 rounded-xl shrink-0"
                    >
                      <MapPin className="w-3 h-3 text-sky-400" />
                      <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest hidden sm:block">
                        {myCountry} · current page
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── PODIUM (global tab only) ────────────────────────────── */}
              {tabTop3.length > 0 && !isPaging && (
                <div className="mb-6 mt-8 md:mt-4">
                  <div className="flex items-end justify-center gap-2 md:gap-3 h-[280px] md:h-[340px]">
                    {[tabTop3[1], tabTop3[0], tabTop3[2]].map(
                      (player, podiumIdx) => {
                        if (!player)
                          return (
                            <div
                              key={podiumIdx}
                              className="flex-1 max-w-[140px]"
                            />
                          );
                        const rank =
                          podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                        const isMe =
                          player.id === (userData?.uid || userData?.id) ||
                          player.identity?.username ===
                            userData?.identity?.username;
                        return (
                          <div
                            key={player.id}
                            className="flex-1 max-w-[160px] md:max-w-[220px]"
                          >
                            <PodiumCard
                              player={player}
                              rank={rank}
                              resolvePlayerName={resolvePlayerName}
                              isMe={isMe}
                              onClick={() => {
                                setSelectedUser(player);
                                setIsFilterOpen(false);
                              }}
                            />
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* ── ALLIANCES EMPTY STATE ───────────────────────────────── */}
              {arenaTab === "alliances" &&
                tabListPlayers.length === 0 &&
                !isPaging && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-violet-400/50" />
                    </div>
                    <p className="text-base font-black text-white/40 mb-1">
                      No allies in current view
                    </p>
                    <p className="text-xs text-white/20 max-w-[240px]">
                      Forge alliances from the Network hub, or switch to Global
                      to see all operators.
                    </p>
                  </motion.div>
                )}

              {/* ── MY RANK BAR ─────────────────────────────────────────── */}
              {!isGhostUser && myRank && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 sm:p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[rgba(191,162,100,0.04)] to-transparent pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[rgba(191,162,100,0.15)] border border-[rgba(191,162,100,0.25)] flex items-center justify-center shrink-0 overflow-hidden">
                        {userData?.identity?.avatarUrl ? (
                          <img
                            src={userData.identity.avatarUrl}
                            alt="You"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={getAvatar(
                              "observer",
                              userData?.identity?.gender,
                            )}
                            alt="Your Avatar"
                            loading="lazy"
                            decoding="async"
                            width={44}
                            height={44}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                      <div>
                        <p className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-widest">
                          Your Standing
                        </p>
                        <p className="text-xl sm:text-2xl font-black text-[#BFA264] font-mono leading-none mt-0.5">
                          #{myRank.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                      {percentile && (
                        <div className="px-2.5 py-1.5 bg-[rgba(191,162,100,0.10)] border border-[rgba(191,162,100,0.20)] rounded-lg text-[9px] font-black text-[#BFA264] uppercase tracking-widest whitespace-nowrap">
                          Top {percentile}%
                        </div>
                      )}
                      {nextTarget ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg shrink-0">
                          <Crosshair className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="text-[9px] font-bold text-red-400 truncate max-w-[140px] sm:max-w-none">
                            Target: {resolvePlayerName(nextTarget, true)}
                            <span className="font-black ml-1 text-red-300">
                              (+
                              {(nextTarget.discotiveScore?.current || 0) -
                                (userData?.discotiveScore?.current || 0)}{" "}
                              pts)
                            </span>
                          </span>
                        </div>
                      ) : myRank === 1 ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(191,162,100,0.10)] border border-[rgba(191,162,100,0.20)] rounded-lg shrink-0">
                          <Crown className="w-3.5 h-3.5 text-[#BFA264] animate-pulse shrink-0" />
                          <span className="text-[9px] font-black text-[#BFA264] uppercase tracking-widest">
                            Defend the throne
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PLAYER LIST ─────────────────────────────────────────── */}
              <div className="bg-[#070707] border border-[#111] rounded-2xl overflow-hidden shadow-2xl">
                <div className="hidden md:grid grid-cols-[52px_2fr_1.2fr_100px_70px_70px_100px] gap-3 px-5 py-3 border-b border-white/[0.05] bg-white/[0.01]">
                  {[
                    "#",
                    "Operator",
                    "Domain / Niche",
                    "Level",
                    "Vault",
                    "Streak",
                    "Score",
                  ].map((h, i) => (
                    <div
                      key={h}
                      className={cn(
                        "text-[9px] font-black text-white/25 uppercase tracking-widest",
                        i === 0 ? "text-center" : i >= 5 ? "text-right" : "",
                      )}
                    >
                      {h}
                    </div>
                  ))}
                </div>

                {isPaging && (
                  <div className="p-6 flex items-center justify-center gap-3 text-white/30">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Loading…
                    </span>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {!isPaging &&
                    (tabListPlayers.length === 0 && arenaTab === "global" ? (
                      <div className="p-16 text-center">
                        <Trophy className="w-10 h-10 text-white/10 mx-auto mb-4" />
                        <p className="text-sm font-bold text-white/25">
                          No operators match the current filters.
                        </p>
                        <button
                          onClick={clearFilters}
                          className="mt-4 text-xs font-bold text-[#BFA264]/60 hover:text-[#BFA264] transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      tabListPlayers.map((player, idx) => {
                        const rank =
                          arenaTab === "global" &&
                          isFirstPage &&
                          !filters.search
                            ? idx + 4
                            : (page - 1) * filters.pageSize + idx + 1;
                        const isMe =
                          player.id === (userData?.uid || userData?.id) ||
                          player.identity?.username ===
                            userData?.identity?.username;
                        return (
                          <PlayerRow
                            key={player.id}
                            player={player}
                            rank={rank}
                            isMe={isMe}
                            onClick={() => {
                              setSelectedUser(player);
                              setIsFilterOpen(false);
                            }}
                            resolvePlayerName={resolvePlayerName}
                            myRank={myRank}
                          />
                        );
                      })
                    ))}
                </AnimatePresence>
              </div>

              {/* ── PAGINATION (global tab only) ────────────────────────── */}
              {arenaTab === "global" && !filters.search && (
                <div className="flex items-center justify-between mt-5">
                  <button
                    onClick={() => executeFetch("prev")}
                    disabled={!hasPrev || isPaging}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                      hasPrev && !isPaging
                        ? "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.08]"
                        : "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-white/30",
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="font-mono font-bold">Page {page}</span>
                    {totalCount > 0 && (
                      <span>of {Math.ceil(totalCount / filters.pageSize)}</span>
                    )}
                  </div>
                  <button
                    onClick={() => executeFetch("next")}
                    disabled={!hasNext || isPaging}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all",
                      hasNext && !isPaging
                        ? "bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.08]"
                        : "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/[0.04] text-white/30",
                    )}
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {/* END CENTER COLUMN */}

            {/* ══ RIGHT TELEMETRY RAIL (xl+ only) ════════════════════════ */}
            <div className="hidden xl:flex flex-col w-[340px] shrink-0 h-[80vh] bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden relative shadow-2xl">
              <div className="p-4 border-b border-[#1a1a1a] shrink-0 bg-[#070707] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Crosshair className="w-4 h-4 text-red-400 animate-pulse" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      Live Battlefield
                    </h3>
                  </div>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest">
                    You vs Targets ({Math.max(0, miniLeaderboard.length - 1)})
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate("/app/connective/network/battlefield")
                  }
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all shrink-0"
                  title="Expand Battlefield"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {miniLeaderboard.map((u, i) => {
                  const isMe = u._isMe;
                  const score = u.discotiveScore?.current || 0;
                  const name = isMe
                    ? "You"
                    : `${u.identity?.firstName || ""} ${u.identity?.lastName || ""}`.trim() ||
                      u.identity?.username ||
                      "Operator";
                  const initials = name.charAt(0).toUpperCase() || "O";

                  return (
                    <div
                      key={u.id || i}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                        isMe
                          ? "bg-[rgba(191,162,100,0.08)] border-[rgba(191,162,100,0.25)] hover:bg-[rgba(191,162,100,0.12)]"
                          : "bg-[#0f0f0f] border-white/[0.05] hover:border-white/[0.15] hover:bg-[#151515]",
                      )}
                      onClick={() => {
                        if (!isMe) {
                          setSelectedUser(u);
                          setIsFilterOpen(false);
                        }
                      }}
                    >
                      <div className="w-6 text-center shrink-0 font-mono text-[10px] font-black text-white/30">
                        #{i + 1}
                      </div>

                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden border",
                          isMe
                            ? "bg-[#111] border-[#BFA264]/40 text-[#BFA264]"
                            : "bg-[#111] border-red-500/20 text-red-400",
                        )}
                      >
                        {u.identity?.avatarUrl ? (
                          <img
                            src={u.identity.avatarUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p
                            className={cn(
                              "text-[11px] font-bold truncate",
                              isMe
                                ? "text-[#BFA264]"
                                : "text-white group-hover:text-red-300",
                            )}
                          >
                            {name}
                          </p>
                          {u.tier === "PRO" && (
                            <img
                              src="/logo-premium.png"
                              alt="PRO"
                              className="w-3 h-3 object-contain shrink-0"
                            />
                          )}
                        </div>
                        {!isMe && u.identity?.username && (
                          <p className="text-[9px] text-white/30 font-mono truncate">
                            @{u.identity.username}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            "font-mono text-[11px] font-black",
                            isMe ? "text-[#BFA264]" : "text-white/80",
                          )}
                        >
                          {score.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {miniLeaderboard.length === 1 && (
                  <div className="py-8 text-center px-4">
                    <Target className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-[10px] text-white/30 font-bold leading-relaxed">
                      No targets tracked. Mark targets on the network page to
                      track their momentum here.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* END RIGHT RAIL */}
          </div>
        </main>

        {/* ── PLAYER DETAIL SIDEBAR ─────────────────────────────────────── */}
        <AnimatePresence>
          {selectedUser && (
            <PlayerSidebar
              player={selectedUser}
              onClose={() => setSelectedUser(null)}
              onCompare={() => handleCompare(selectedUser)}
              resolvePlayerName={resolvePlayerName}
              navigate={navigate}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ════ UPSELL MODAL ════ */}
      <AnimatePresence>
        {isUpsellOpen && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-sm bg-[#080808] border border-[#222] rounded-[2rem] p-7 text-center relative overflow-hidden"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500 opacity-[0.06] blur-3xl rounded-full pointer-events-none" />
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Crown className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                Protocol Locked
              </h3>
              <p className="text-xs text-[#666] leading-relaxed mb-6">
                {isGhostUser
                  ? "Complete onboarding to unlock Competitor X-Ray and arena ranking."
                  : "X-Ray deep-dive analytics requires Discotive Pro clearance."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsUpsellOpen(false)}
                  className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    isGhostUser ? navigate("/") : navigate("/premium")
                  }
                  className="flex-1 py-3 bg-amber-500 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
                >
                  {isGhostUser ? "Onboard" : "Upgrade"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════ COMPARE MODAL ════ */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentUser={userData}
        targetUser={compareTarget}
      />

      {/* ════ TOASTS ════ */}
      <Toast toasts={toasts} />
    </div>
  );
};

export default Leaderboard;
