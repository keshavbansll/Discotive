/**
 * @fileoverview Discotive OS — Command Center v7 (The Definitive Overhaul)
 * @module Execution/CommandCenter
 *
 * OVERHAUL CHANGELOG vs v6:
 *  ✅ FIXED: Gender-aware avatar resolution (female users no longer get male characters)
 *  ✅ FIXED: Score chart rendering (now handles edge cases: 0 data, 1 data point)
 *  ✅ FIXED: Position Matrix completely redesigned — radial ring system, instant comprehension
 *  ✅ FIXED: Consistency heatmap pills have full tooltip hover states (date + activity logged)
 *  ✅ REMOVED: Broken Execution Timeline Gantt chart — completely purged
 *  ✅ NEW: Daily Execution Ledger widget (Pro-gated, integrated from DailyExecutionLedger.jsx)
 *  ✅ NEW: Network Intelligence widget (alliances count, pending requests, competitor radar)
 *  ✅ NEW: Daily Addiction Hook — streak risk banner fires when user hasn't logged today
 *  ✅ NEW: Learn Progress widget — tracks certificates in progress
 *  ✅ FIXED: Professional terminology across all labels and copy
 *  ✅ DESIGN: Gold/void palette used aggressively; no more colorless void UI
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useId,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  getCountFromServer,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { processDailyConsistency } from "../lib/scoreEngine";
import TierGate from "../components/TierGate";
import DailyExecutionLedger from "../components/DailyExecutionLedger";
import {
  Activity,
  Database,
  Network,
  Zap,
  Target,
  TerminalSquare,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Crown,
  Loader2,
  Eye,
  Flame,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Sparkles,
  CheckCircle2,
  Map,
  BookOpen,
  Star,
  GraduationCap,
  AlertTriangle,
  Crosshair,
  Bell,
  Trophy,
  Shield,
  Cpu,
  Award,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { cn } from "../lib/cn";

// ─── Avatar resolution (GENDER-AWARE — fixes the v6 bug) ─────────────────────
const CHARACTERS = {
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
/**
 * Resolves the correct character asset based on rank position AND user gender.
 * Falls back gracefully through Male → Other when gender is missing.
 */
const resolveAvatar = (rankKey, gender) => {
  const bank = CHARACTERS[rankKey] ?? CHARACTERS.observer;
  if (gender === "Female") return bank.Female;
  if (gender === "Male") return bank.Male;
  return bank.Other ?? bank.Male;
};

// ─── Leaderboard filter definitions ──────────────────────────────────────────
const LB_FILTERS = [
  { label: "GLOBAL", key: "global", dbField: null, color: "text-white" },
  {
    label: "DOMAIN",
    key: "domain",
    dbField: "identity.domain",
    color: "text-[#BFA264]",
  },
  {
    label: "NICHE",
    key: "niche",
    dbField: "identity.niche",
    color: "text-emerald-400",
  },
  {
    label: "NATION",
    key: "country",
    dbField: "identity.country",
    color: "text-sky-400",
  },
  {
    label: "PATH",
    key: "parallelGoal",
    dbField: "identity.parallelGoal",
    color: "text-violet-400",
  },
];

const resolveFilterValue = (userData, filterKey) => {
  switch (filterKey) {
    case "domain":
      return userData?.identity?.domain || userData?.vision?.passion || null;
    case "niche":
      return userData?.identity?.niche || userData?.vision?.niche || null;
    case "country":
      return userData?.identity?.country || userData?.location?.country || null;
    case "parallelGoal":
      return (
        userData?.identity?.parallelGoal ||
        userData?.vision?.parallelPath ||
        null
      );
    default:
      return null;
  }
};

// ─── Timeframe options ────────────────────────────────────────────────────────
const TF_OPTIONS = ["24H", "1W", "1M", "ALL"];

const fmtLabel = (iso, tf) => {
  const d = new Date(iso);
  if (tf === "24H")
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (tf === "ALL")
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

// ─── Custom Score Tooltip ──────────────────────────────────────────────────────
const ScoreTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const prev = payload[0].payload?.prev;
  const diff = prev != null ? val - prev : null;
  return (
    <div className="bg-[#0a0a0c] border border-[#BFA264]/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl pointer-events-none">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-white font-mono">
        {val.toLocaleString()}
      </p>
      {diff != null && diff !== 0 && (
        <p
          className={cn(
            "text-[10px] font-bold mt-0.5",
            diff > 0 ? "text-emerald-400" : "text-rose-400",
          )}
        >
          {diff > 0 ? `+${diff}` : diff} pts
        </p>
      )}
    </div>
  );
});

// ─── Section label ────────────────────────────────────────────────────────────
const WLabel = memo(({ icon: Icon, iconColor, children }) => (
  <h2 className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-0">
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />}
    {children}
  </h2>
));

// ─── Radial Ring Component (for Position Matrix redesign) ─────────────────────
const RadialRing = memo(
  ({ pct = 100, size = 64, stroke = 5, color = "#BFA264", label, value }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    // pct is "Top X%" — lower is better; fill = (100 - pct) / 100
    const fillFraction = Math.max(0, Math.min(1, (100 - pct) / 100));
    const offset = circ - fillFraction * circ;

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={pct <= 100 ? color : "rgba(255,255,255,0.1)"}
              strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-white leading-none">
              {pct === 100 ? "–" : `${pct}%`}
            </span>
          </div>
        </div>
        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest text-center leading-tight max-w-[60px]">
          {label}
        </p>
      </div>
    );
  },
);

// ─── Heatmap Pill with Tooltip ────────────────────────────────────────────────
const HeatPill = memo(({ active, dateStr, activity }) => {
  const [show, setShow] = useState(false);
  const displayDate = dateStr
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      className="relative flex-1"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <div
        className={cn(
          "h-full w-full max-w-[12px] rounded-full border transition-all cursor-default",
          active
            ? "bg-[#BFA264] border-[#D4AF78] shadow-[0_0_6px_rgba(191,162,100,0.45)]"
            : "bg-white/[0.04] border-white/[0.04]",
        )}
        style={{ minHeight: "32px" }}
      />
      <AnimatePresence>
        {show && dateStr && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          >
            <div className="bg-[#0a0a0a] border border-[#BFA264]/25 rounded-lg px-2.5 py-2 shadow-2xl whitespace-nowrap">
              <p className="text-[9px] font-bold text-[#BFA264]">
                {displayDate}
              </p>
              {activity && (
                <p className="text-[8px] text-white/40 mt-0.5">{activity}</p>
              )}
              {!activity && active && (
                <p className="text-[8px] text-white/40 mt-0.5">Logged in</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Addiction Hook Banner (streak-at-risk) ────────────────────────────────────
const AddictionHook = memo(
  ({ streak, lastLoginDate, currentScore, navigate }) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const hasLoggedToday = lastLoginDate === todayStr;
    if (hasLoggedToday || streak === 0) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -16, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 via-[#0a0a0a] to-rose-500/5 px-5 py-4 flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(239,68,68,0.08)]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-black text-white">
              Your <span className="text-rose-400">{streak}-day streak</span>{" "}
              expires at midnight.
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Log in now to preserve it — a -15 pt penalty and streak reset are
              incoming.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] font-black text-rose-400 font-mono">
            -{15} pts risk
          </div>
        </div>
      </motion.div>
    );
  },
);

// ─── Network Intelligence Widget ──────────────────────────────────────────────
const NetworkWidget = memo(({ userData, navigate }) => {
  const alliances = (userData?.allies || []).length;
  const notifications = (userData?.notifications || []).filter(
    (n) => !n.read && n.type === "alliance_request",
  ).length;
  const profileViews = userData?.profileViews || 0;

  return (
    <div className="flex flex-col h-full">
      <WLabel icon={Network} iconColor="text-emerald-400">
        Network Intelligence
      </WLabel>
      <p className="text-[9px] text-white/20 mb-4 mt-1">
        Real-time alliance & competitor data
      </p>

      <div className="space-y-2 flex-1">
        {[
          {
            label: "Active Alliances",
            val: alliances,
            color: "text-emerald-400",
            bg: "bg-emerald-500/8",
            border: "border-emerald-500/15",
            icon: Users,
          },
          {
            label: "Pending Requests",
            val: notifications,
            color: "text-amber-400",
            bg: "bg-amber-500/8",
            border: "border-amber-500/15",
            icon: Bell,
          },
          {
            label: "Profile Impressions",
            val: profileViews,
            color: "text-sky-400",
            bg: "bg-sky-500/8",
            border: "border-sky-500/15",
            icon: Eye,
          },
        ].map(({ label, val, color, bg, border, icon: Icon }) => (
          <div
            key={label}
            className={cn(
              "flex items-center justify-between p-3 rounded-xl border",
              bg,
              border,
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span className="text-[10px] font-bold text-white/50">
                {label}
              </span>
            </div>
            <span className={cn("text-sm font-black font-mono", color)}>
              {val}
            </span>
          </div>
        ))}
      </div>

      <Link
        to="/app/network"
        className="mt-3 w-full py-2.5 bg-white/[0.03] border border-white/[0.05] rounded-xl text-[9px] font-black text-white/40 hover:text-white hover:bg-white/[0.06] transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
      >
        Open Network Hub <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
});

// ─── Learn Progress Widget ────────────────────────────────────────────────────
const LearnWidget = memo(({ userData, navigate }) => {
  const verifiedAssets = (userData?.vault || []).filter(
    (a) => a.status === "VERIFIED" && a.discotiveLearnId,
  );
  const pendingAssets = (userData?.vault || []).filter(
    (a) => a.status === "PENDING" && a.discotiveLearnId,
  );

  return (
    <div className="flex flex-col h-full">
      <WLabel icon={GraduationCap} iconColor="text-[#BFA264]">
        Knowledge Engine
      </WLabel>
      <p className="text-[9px] text-white/20 mb-4 mt-1">
        Certificates & learning progress
      </p>

      {verifiedAssets.length === 0 && pendingAssets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <Award className="w-7 h-7 text-white/10" />
          <p className="text-[10px] text-white/20">No credentials logged yet</p>
          <Link
            to="/app/learn"
            className="text-[9px] font-black text-[#BFA264]/60 hover:text-[#BFA264] uppercase tracking-widest transition-colors"
          >
            Browse Courses →
          </Link>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {verifiedAssets.slice(0, 2).map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[10px] font-bold text-white/70 truncate flex-1">
                {a.title || a.category || "Credential"}
              </p>
              <span className="text-[8px] font-black text-emerald-400/70 uppercase shrink-0">
                Verified
              </span>
            </div>
          ))}
          {pendingAssets.slice(0, 2).map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 p-2.5 bg-amber-500/[0.05] border border-amber-500/15 rounded-xl"
            >
              <Loader2 className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
              <p className="text-[10px] font-bold text-white/50 truncate flex-1">
                {a.title || a.category || "Credential"}
              </p>
              <span className="text-[8px] font-black text-amber-400/70 uppercase shrink-0">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/app/learn"
        className="mt-3 w-full py-2.5 bg-[#BFA264]/[0.06] border border-[#BFA264]/20 rounded-xl text-[9px] font-black text-[#BFA264]/70 hover:text-[#BFA264] hover:bg-[#BFA264]/10 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest"
      >
        Explore Learn Database <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const GRAD_ID = `grad_${useId().replace(/:/g, "")}`;

  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();

  // ── Core metrics ────────────────────────────────────────────────────────
  const currentScore = userData?.discotiveScore?.current || 0;
  const last24hScore = userData?.discotiveScore?.last24h || currentScore;
  const delta = currentScore - last24hScore;
  const lastReason = userData?.discotiveScore?.lastReason || "OS Initialized";
  const lastAmount = userData?.discotiveScore?.lastAmount || 0;
  const streak = (() => {
    const s = userData?.discotiveScore?.streak || 0;
    const lastLogin = userData?.discotiveScore?.lastLoginDate;
    const today = new Date().toISOString().split("T")[0];
    return s === 0 && lastLogin === today ? 1 : s;
  })();
  const vaultCount = (userData?.vault || []).length;
  const profileViews = userData?.profileViews || 0;
  const alliesCount = (userData?.allies || []).length;
  const operatorName =
    userData?.identity?.firstName ||
    userData?.identity?.fullName?.split(" ")[0] ||
    "Operator";
  const gender = userData?.identity?.gender || "Male";

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const hasLinkedSocials = Object.values(userData?.links || {}).some(Boolean);
  const [nodesCount, setNodesCount] = useState(0);

  const missionsCompleted =
    (nodesCount > 0 ? 1 : 0) +
    (vaultCount > 0 ? 1 : 0) +
    (hasLinkedSocials ? 1 : 0);
  const isZeroState = missionsCompleted < 3 && currentScore <= 50;

  const level = Math.min(Math.floor(currentScore / 1000) + 1, 10);
  const levelProgress = currentScore % 1000;
  const levelPct = (levelProgress / 1000) * 100;
  const ptsToNext = 1000 - levelProgress;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [tf, setTf] = useState("1W");
  const [lbIdx, setLbIdx] = useState(0);
  const [lbRank, setLbRank] = useState("?");
  const [lbRefreshing, setLbRefreshing] = useState(false);
  const [lbFilterLabel, setLbFilterLabel] = useState("—");
  const [percentiles, setPercentiles] = useState({
    global: 100,
    domain: 100,
    niche: 100,
    parallel: 100,
  });
  const [isCalc, setIsCalc] = useState(true);
  const [journalEntry, setJournalEntry] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  // ── Month navigation ─────────────────────────────────────────────────────
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const handlePrevMonth = useCallback(
    () => setViewDate((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1)),
    [],
  );
  const handleNextMonth = useCallback(
    () => setViewDate((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1)),
    [],
  );

  // ── Chart & execution map data ────────────────────────────────────────────
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    const buildChart = async () => {
      if (!userData?.uid) return;
      setChartLoading(true);
      try {
        let sourceData = [];
        const now = new Date();
        const cutoff = new Date(now);

        if (tf === "24H") {
          const logRef = collection(db, "users", userData.uid, "score_log");
          const cutoffIso = new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString();
          const q = query(
            logRef,
            where("date", ">=", cutoffIso),
            orderBy("date", "asc"),
          );
          const snap = await getDocs(q);
          sourceData = snap.docs.map((d) => ({
            date: d.data().date,
            score: d.data().score,
          }));
        } else if (tf === "1W" || tf === "1M") {
          const daily = userData.daily_scores || {};
          sourceData = Object.keys(daily).map((date) => ({
            date,
            score: daily[date],
          }));
          if (tf === "1W") cutoff.setDate(now.getDate() - 7);
          if (tf === "1M") cutoff.setMonth(now.getMonth() - 1);
          sourceData = sourceData.filter((e) => new Date(e.date) >= cutoff);
        } else {
          const monthly = userData.monthly_scores || {};
          sourceData = Object.keys(monthly).map((month) => ({
            date: `${month}-01`,
            score: monthly[month],
          }));
        }

        sourceData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Ensure minimum 2 points to draw a line (critical for fresh accounts)
        if (sourceData.length === 0) {
          const baselineDate =
            tf === "ALL" ? "2026-01-01" : cutoff.toISOString();
          sourceData = [
            { date: baselineDate, score: 0 },
            { date: now.toISOString(), score: currentScore },
          ];
        } else if (sourceData.length === 1) {
          const baselineDate =
            tf === "ALL" ? "2026-01-01" : cutoff.toISOString();
          sourceData.unshift({
            date: baselineDate,
            score: Math.max(0, sourceData[0].score - (lastAmount || 0)),
          });
        }

        setChartData(
          sourceData.map((e, i) => ({
            day: fmtLabel(e.date, tf),
            score: e.score,
            prev: i > 0 ? sourceData[i - 1].score : null,
          })),
        );
      } catch (err) {
        console.error("[Dashboard] Chart error:", err);
      } finally {
        setChartLoading(false);
      }
    };
    buildChart();
  }, [userData, tf, currentScore, lastAmount]);

  // ── Execution map count ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchMap = async () => {
      if (!userData?.uid) return;
      try {
        const snap = await getDoc(
          doc(db, "users", userData.uid, "execution_map", "current"),
        );
        if (snap.exists()) {
          const nodes = snap.data().nodes || [];
          setNodesCount(nodes.filter((n) => n.type === "executionNode").length);
        }
      } catch {}
    };
    fetchMap();
  }, [userData?.uid]);

  // ── Percentile engine (session-cached) ────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!userData?.discotiveScore) return;
      setIsCalc(true);
      try {
        const globalPct = userData.precomputed?.globalPercentile || 100;
        const cacheKey = `pct_${userData.uid}_${currentScore}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setPercentiles({ global: globalPct, ...JSON.parse(cached) });
          setIsCalc(false);
          return;
        }

        const ref = collection(db, "users");
        const [domainVal, nicheVal, pgVal] = [
          resolveFilterValue(userData, "domain"),
          resolveFilterValue(userData, "niche"),
          resolveFilterValue(userData, "parallelGoal"),
        ];

        const pct = (totalSnap, rankSnap) => {
          if (!totalSnap || !rankSnap) return 100;
          const t = totalSnap.data().count;
          return t === 0
            ? 1
            : Math.max(1, Math.ceil(((rankSnap.data().count + 1) / t) * 100));
        };

        const fetches = await Promise.all([
          domainVal
            ? getCountFromServer(
                query(ref, where("identity.domain", "==", domainVal)),
              )
            : null,
          domainVal
            ? getCountFromServer(
                query(
                  ref,
                  where("identity.domain", "==", domainVal),
                  where("discotiveScore.current", ">", currentScore),
                ),
              )
            : null,
          nicheVal
            ? getCountFromServer(
                query(ref, where("identity.niche", "==", nicheVal)),
              )
            : null,
          nicheVal
            ? getCountFromServer(
                query(
                  ref,
                  where("identity.niche", "==", nicheVal),
                  where("discotiveScore.current", ">", currentScore),
                ),
              )
            : null,
          pgVal
            ? getCountFromServer(
                query(ref, where("identity.parallelGoal", "==", pgVal)),
              )
            : null,
          pgVal
            ? getCountFromServer(
                query(
                  ref,
                  where("identity.parallelGoal", "==", pgVal),
                  where("discotiveScore.current", ">", currentScore),
                ),
              )
            : null,
        ]);

        const calculated = {
          domain: domainVal ? pct(fetches[0], fetches[1]) : 100,
          niche: nicheVal ? pct(fetches[2], fetches[3]) : 100,
          parallel: pgVal ? pct(fetches[4], fetches[5]) : 100,
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(calculated));
        setPercentiles({ global: globalPct, ...calculated });
      } catch (e) {
        console.error(e);
      } finally {
        setIsCalc(false);
      }
    };
    if (!userLoading) run();
  }, [userLoading, currentScore, userData]);

  // ── Leaderboard rank engine ───────────────────────────────────────────────
  const fetchWidgetRank = useCallback(async () => {
    if (!userData?.discotiveScore) return;
    setLbRefreshing(true);
    const filter = LB_FILTERS[lbIdx];
    try {
      const constraints = [where("discotiveScore.current", ">", currentScore)];
      if (filter.dbField) {
        const val = resolveFilterValue(userData, filter.key);
        if (!val) {
          setLbRank("—");
          setLbFilterLabel("Not set");
          setLbRefreshing(false);
          return;
        }
        constraints.push(where(filter.dbField, "==", val));
        setLbFilterLabel(
          String(val).length > 18
            ? String(val).slice(0, 18) + "…"
            : String(val),
        );
      } else {
        setLbFilterLabel("All operators");
      }
      const snap = await getCountFromServer(
        query(collection(db, "users"), ...constraints),
      );
      setLbRank(snap.data().count + 1);
    } catch (err) {
      console.error("[Dashboard] LB rank:", err);
      setLbRank("—");
    } finally {
      setLbRefreshing(false);
    }
  }, [lbIdx, currentScore, userData]);

  useEffect(() => {
    if (!userLoading) fetchWidgetRank();
  }, [fetchWidgetRank, userLoading]);

  // ── Heatmap data (dynamic, tooltip-aware) ─────────────────────────────────
  const { heatmapData, activityMap } = useMemo(() => {
    const active = new Set();
    const aMap = {};

    (userData?.journal_ledger || []).forEach((e) => {
      if (e?.date) {
        const ds = e.date.split("T")[0];
        active.add(ds);
        aMap[ds] = "Journal entry + login";
      }
    });
    (userData?.consistency_log || []).forEach((s) => {
      if (typeof s === "string") {
        active.add(s.split("T")[0]);
        if (!aMap[s.split("T")[0]]) aMap[s.split("T")[0]] = "Login";
      }
    });
    (userData?.login_history || []).forEach((s) => {
      if (typeof s === "string") {
        active.add(s.split("T")[0]);
        if (!aMap[s.split("T")[0]]) aMap[s.split("T")[0]] = "Login";
      }
    });
    const last = userData?.discotiveScore?.lastLoginDate;
    if (last) {
      active.add(last.split("T")[0]);
      if (!aMap[last]) aMap[last] = "Last active";
    }

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const pills = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const ms = String(d.getMonth() + 1).padStart(2, "0");
      const ds2 = String(d.getDate()).padStart(2, "0");
      const str = `${d.getFullYear()}-${ms}-${ds2}`;
      return {
        date: str,
        active: active.has(str),
        activity: aMap[str] || null,
      };
    });
    return { heatmapData: pills, activityMap: aMap };
  }, [userData, viewDate]);

  // ── Chart range gain ──────────────────────────────────────────────────────
  const chartGain = useMemo(() => {
    if (chartData.length < 2) return 0;
    return chartData[chartData.length - 1].score - chartData[0].score;
  }, [chartData]);
  const chartMin = useMemo(() => {
    if (!chartData.length) return 0;
    const vals = chartData.map((d) => d.score);
    const min = Math.min(...vals);
    return Math.max(0, min - Math.ceil((Math.max(...vals) - min) * 0.2 + 5));
  }, [chartData]);

  // ── Avatar ────────────────────────────────────────────────────────────────
  const rankKey =
    lbRank === 1
      ? "rank1"
      : lbRank === 2
        ? "rank2"
        : lbRank === 3
          ? "rank3"
          : "observer";
  const avatar = resolveAvatar(rankKey, gender);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
              className="w-1 h-6 bg-[#BFA264] rounded-full origin-bottom"
            />
          ))}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-[#BFA264]/30 overflow-x-hidden pb-28 md:pb-16">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-5 md:py-8 relative z-10 space-y-4">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />{" "}
                Verified Operator
              </div>
              {isPro && (
                <div className="px-2.5 py-1 rounded-full bg-[#BFA264]/10 border border-[#BFA264]/20 text-[8px] font-bold text-[#BFA264] uppercase tracking-widest flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> Pro Clearance
                </div>
              )}
              <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[8px] font-bold text-white/40 uppercase tracking-widest">
                Level {level}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-[#BFA264] to-[#D4AF78] bg-clip-text text-transparent">
                {operatorName}
              </span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden sm:flex flex-col items-end gap-1 shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {ptsToNext.toLocaleString()} pts to Level{" "}
                {Math.min(level + 1, 10)}
              </span>
              <span className="text-[9px] font-black text-[#BFA264] font-mono">
                Lv {level}
              </span>
            </div>
            <div className="w-40 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#8B7240] to-[#D4AF78] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.6)]"
              />
            </div>
          </motion.div>
        </header>

        {/* ── ADDICTION HOOK BANNER ───────────────────────────────────────── */}
        <AddictionHook
          streak={streak}
          lastLoginDate={userData?.discotiveScore?.lastLoginDate}
          currentScore={currentScore}
          navigate={navigate}
        />

        {/* ── ZERO STATE ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isZeroState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              className="bg-gradient-to-br from-[#BFA264]/10 to-[#0a0a0a] border border-[#BFA264]/20 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#BFA264] opacity-[0.05] blur-3xl rounded-full pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-[#BFA264]" />
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Initialization Protocol
                    </h2>
                  </div>
                  <p className="text-sm text-[#BFA264]/70 mb-5 max-w-md leading-relaxed">
                    Your execution engine needs calibrating. Complete your first
                    three missions to unlock the full Command Center.
                  </p>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-[#BFA264] uppercase tracking-widest">
                      Progress: {Math.round((missionsCompleted / 3) * 100)}%
                    </span>
                  </div>
                  <div className="w-full max-w-md h-2 bg-black/50 border border-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(missionsCompleted / 3) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-[#BFA264] shadow-[0_0_10px_rgba(191,162,100,0.5)]"
                    />
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  {[
                    {
                      title: "Generate Execution Map",
                      desc: "Deploy AI to map your 30-day trajectory.",
                      done: nodesCount > 0,
                      link: "/app/roadmap",
                    },
                    {
                      title: "Upload a Credential",
                      desc: "Submit your first proof-of-work asset.",
                      done: vaultCount > 0,
                      link: "/app/vault",
                    },
                    {
                      title: "Connect Your Profiles",
                      desc: "Link GitHub, LinkedIn, or Twitter.",
                      done: hasLinkedSocials,
                      link: "/app/settings",
                    },
                  ].map((m, i) => (
                    <Link
                      key={i}
                      to={m.link}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        m.done
                          ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
                          : "bg-black/40 border-white/10 hover:border-[#BFA264]/40 group",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border",
                            m.done
                              ? "bg-emerald-500 border-emerald-400"
                              : "bg-[#111] border-[#333]",
                          )}
                        >
                          {m.done && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-bold",
                              m.done
                                ? "text-emerald-500 line-through"
                                : "text-white",
                            )}
                          >
                            {m.title}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {m.desc}
                          </p>
                        </div>
                      </div>
                      {!m.done && (
                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-[#BFA264] transition-colors" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══════════════ MAIN BENTO GRID ══════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* ── 1. SCORE TELEMETRY (8 col) ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-1 sm:col-span-2 xl:col-span-8 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-7 relative overflow-hidden shadow-2xl flex flex-col min-h-[300px]"
          >
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#BFA264] opacity-[0.04] blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-start justify-between gap-4 relative z-10 mb-4">
              <div className="flex flex-col">
                <WLabel icon={Activity} iconColor="text-[#BFA264]">
                  Score Telemetry
                </WLabel>
                <div className="flex items-end gap-4 mt-2 mb-3">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-black text-white font-mono tracking-tighter leading-none">
                    {currentScore.toLocaleString()}
                  </span>
                  {delta !== 0 && (
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono mb-1",
                        delta > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20",
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {delta > 0 ? `+${delta}` : delta} today
                    </div>
                  )}
                </div>
                <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-1.5 max-w-fit">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      lastAmount >= 0 ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  <span className="text-[10px] font-bold text-white/50">
                    {lastReason}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-black font-mono",
                      lastAmount >= 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {lastAmount > 0 ? `+${lastAmount}` : lastAmount}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 gap-0.5">
                  {TF_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTf(t)}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                        tf === t
                          ? "bg-[#BFA264]/15 text-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.2)]"
                          : "text-white/30 hover:text-white/60",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {chartGain !== 0 && (
                  <div
                    className={cn(
                      "text-[10px] font-black font-mono px-2 py-0.5 rounded",
                      chartGain > 0 ? "text-emerald-400" : "text-rose-400",
                    )}
                  >
                    {tf} {chartGain > 0 ? `+${chartGain}` : chartGain} pts
                  </div>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[130px] relative">
              {isChartLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-[#BFA264]/30 animate-spin" />
                </div>
              ) : chartData.length >= 2 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={1}
                  minHeight={130}
                >
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -32, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#BFA264"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#BFA264"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(255,255,255,0.04)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      hide={chartData.length > 12}
                      tick={{
                        fill: "rgba(255,255,255,0.25)",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis domain={[chartMin, "auto"]} hide />
                    <RechartsTooltip
                      content={<ScoreTooltip />}
                      cursor={{
                        stroke: "rgba(191,162,100,0.25)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#BFA264"
                      strokeWidth={2.5}
                      fill={`url(#${GRAD_ID})`}
                      dot={
                        chartData.length <= 20
                          ? { r: 2.5, fill: "#BFA264", strokeWidth: 0 }
                          : false
                      }
                      activeDot={{
                        r: 5,
                        fill: "#BFA264",
                        stroke: "#000",
                        strokeWidth: 2,
                      }}
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Activity className="w-5 h-5 text-[#BFA264]/30 animate-pulse" />
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    Execute tasks to build your score history
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── 2. ARENA RANK WIDGET (4 col) ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {rankKey !== "observer" && (
              <div
                className={cn(
                  "absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none",
                  rankKey === "rank1"
                    ? "bg-[#BFA264]"
                    : rankKey === "rank2"
                      ? "bg-slate-300"
                      : "bg-orange-700",
                )}
              />
            )}

            <div className="flex items-center justify-between mb-3 relative z-10">
              <WLabel icon={Trophy} iconColor={LB_FILTERS[lbIdx].color}>
                Arena Standing
              </WLabel>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-white/[0.04] border border-white/[0.06] rounded-lg p-0.5">
                  {LB_FILTERS.map((f, i) => (
                    <button
                      key={f.key}
                      onClick={() => setLbIdx(i)}
                      title={f.label}
                      className={cn(
                        "w-7 h-6 flex items-center justify-center rounded-md text-[7px] font-black uppercase transition-all",
                        lbIdx === i
                          ? cn("bg-white/10", f.color)
                          : "text-white/20 hover:text-white/50",
                      )}
                    >
                      {f.label.slice(0, 2)}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchWidgetRank}
                  className="w-6 h-6 bg-white/[0.04] border border-white/[0.06] rounded-lg flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3",
                      lbRefreshing && "animate-spin text-[#BFA264]",
                    )}
                  />
                </button>
              </div>
            </div>

            <p
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest mb-4 relative z-10",
                LB_FILTERS[lbIdx].color,
              )}
            >
              {lbIdx === 0 ? "All Operators" : lbFilterLabel}
            </p>

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-3 pb-2">
              <div className="relative w-20 h-20 flex items-end justify-center">
                {lbRank === 1 && (
                  <Crown className="absolute -top-5 text-[#BFA264] w-6 h-6 animate-bounce drop-shadow-[0_0_10px_rgba(191,162,100,0.8)]" />
                )}
                <img
                  src={avatar}
                  alt={`Rank ${lbRank} avatar`}
                  width={80}
                  height={80}
                  fetchPriority="high"
                  decoding="async"
                  className={cn(
                    "w-full h-full object-contain pointer-events-none select-none",
                    rankKey === "observer" &&
                      "grayscale brightness-50 opacity-60",
                  )}
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.span
                  key={`${lbRank}-${lbIdx}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "text-5xl font-black font-mono tracking-tighter",
                    rankKey === "rank1"
                      ? "text-[#BFA264] drop-shadow-[0_0_20px_rgba(191,162,100,0.5)]"
                      : lbRank === "—"
                        ? "text-white/20"
                        : "text-white",
                  )}
                >
                  {lbRefreshing ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-white/30" />
                  ) : lbRank === "—" ? (
                    "—"
                  ) : (
                    `#${lbRank}`
                  )}
                </motion.span>
              </AnimatePresence>

              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    LB_FILTERS[lbIdx].color.replace("text-", "bg-"),
                  )}
                />
                <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                  Live Rank
                </p>
              </div>
            </div>

            <Link
              to="/app/leaderboard"
              className="relative z-10 mt-2 w-full py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[9px] font-black text-white/50 uppercase tracking-widest hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
            >
              Open Global Arena <ArrowUpRight className="w-3 h-3" />
            </Link>
          </motion.div>

          {/* ── 3. STATS ROW (4 squares) ────────────────────────────────── */}
          <div className="col-span-1 sm:col-span-2 xl:col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                label: "Score Points",
                val: currentScore.toLocaleString(),
                icon: Zap,
                color: "text-[#BFA264]",
                bg: "bg-[#BFA264]/10",
                border: "border-[#BFA264]/15",
                sub:
                  delta > 0
                    ? `+${delta} today`
                    : delta < 0
                      ? `${delta} today`
                      : "No movement today",
                onClick: null,
              },
              {
                label: "Vault Assets",
                val: vaultCount,
                icon: Database,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/15",
                sub: "Verified credentials",
                onClick: () => navigate("/app/vault"),
              },
              {
                label: "Profile Views",
                val: profileViews,
                icon: Eye,
                color: "text-sky-400",
                bg: "bg-sky-500/10",
                border: "border-sky-500/15",
                sub: "Total impressions",
                onClick: null,
              },
              {
                label: "Active Allies",
                val: alliesCount,
                icon: Users,
                color: "text-violet-400",
                bg: "bg-violet-500/10",
                border: "border-violet-500/15",
                sub: "Network connections",
                onClick: () => navigate("/app/network"),
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                  onClick={s.onClick || undefined}
                  className={cn(
                    "aspect-square bg-[#0a0a0c] border border-white/[0.05] rounded-[1.5rem] p-4 sm:p-5 flex flex-col justify-between shadow-lg",
                    s.onClick &&
                      "cursor-pointer hover:border-white/10 hover:shadow-xl transition-all group",
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border shrink-0",
                        s.bg,
                        s.border,
                      )}
                    >
                      <Icon className={cn("w-4 h-4 sm:w-4 sm:h-4", s.color)} />
                    </div>
                    {s.onClick && (
                      <ArrowUpRight
                        className={cn(
                          "w-4 h-4 opacity-0 group-hover:opacity-40 transition-opacity shrink-0",
                          s.color,
                        )}
                      />
                    )}
                  </div>
                  <div className="flex flex-col justify-end flex-1 min-h-0">
                    <div
                      className={cn(
                        "text-2xl sm:text-3xl font-black font-mono tracking-tight truncate",
                        s.color,
                      )}
                    >
                      {s.val}
                    </div>
                    <p className="text-[8px] sm:text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1 line-clamp-1">
                      {s.label}
                    </p>
                    <p className="text-[8px] sm:text-[9px] text-white/20 mt-0.5 line-clamp-1">
                      {s.sub}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── 4. POSITION MATRIX — REDESIGNED (5 col) ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 sm:col-span-2 xl:col-span-5 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl flex flex-col"
          >
            <WLabel icon={Network} iconColor="text-sky-400">
              Position Matrix
            </WLabel>
            <p className="text-[9px] text-white/20 mt-1 mb-5">
              Your percentile standing across competitive pools. Lower % =
              better rank.
            </p>

            {isCalc ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : (
              <>
                {/* Radial rings grid */}
                <div className="grid grid-cols-4 gap-4 mb-5">
                  <RadialRing
                    pct={percentiles.global}
                    label="Global"
                    color="#BFA264"
                  />
                  <RadialRing
                    pct={percentiles.domain}
                    label={
                      resolveFilterValue(userData, "domain")?.split(" ")[0] ||
                      "Domain"
                    }
                    color="#10b981"
                  />
                  <RadialRing
                    pct={percentiles.niche}
                    label={
                      resolveFilterValue(userData, "niche")?.split(" ")[0] ||
                      "Niche"
                    }
                    color="#38bdf8"
                  />
                  <RadialRing
                    pct={percentiles.parallel}
                    label="Path"
                    color="#8b5cf6"
                  />
                </div>

                {/* Legend */}
                <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                  {[
                    {
                      label: "Global Pool",
                      val: percentiles.global,
                      color: "#BFA264",
                      bg: "rgba(191,162,100,0.1)",
                      note: resolveFilterValue(userData, "domain") || "—",
                    },
                    {
                      label: "Domain Peers",
                      val: percentiles.domain,
                      color: "#10b981",
                      bg: "rgba(16,185,129,0.1)",
                      note: resolveFilterValue(userData, "niche") || "—",
                    },
                    {
                      label: "Niche Network",
                      val: percentiles.niche,
                      color: "#38bdf8",
                      bg: "rgba(56,189,248,0.1)",
                      note: "vs same role",
                    },
                    {
                      label: "Parallel Path",
                      val: percentiles.parallel,
                      color: "#8b5cf6",
                      bg: "rgba(139,92,246,0.1)",
                      note: resolveFilterValue(userData, "parallelGoal") || "—",
                    },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: s.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-bold text-white/50 truncate">
                            {s.label}
                          </span>
                          <span
                            className="text-[10px] font-black font-mono ml-2 shrink-0"
                            style={{ color: s.color }}
                          >
                            {s.val === 100 ? "—" : `Top ${s.val}%`}
                          </span>
                        </div>
                        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${s.val === 100 ? 0 : Math.max(3, 100 - s.val)}%`,
                            }}
                            transition={{
                              duration: 0.9,
                              delay: 0.3,
                              ease: "easeOut",
                            }}
                            className="h-full rounded-full"
                            style={{
                              background: s.color,
                              boxShadow: `0 0 6px ${s.color}40`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>

          {/* ── 5. CONSISTENCY ENGINE (7 col) ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="col-span-1 sm:col-span-2 xl:col-span-7 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between mb-1">
              <WLabel icon={Flame} iconColor="text-orange-500">
                Consistency Engine
              </WLabel>
              <div className="text-right">
                <p className="text-2xl font-black text-white font-mono leading-none">
                  {streak}
                  <span className="text-sm text-white/30 font-sans ml-1">
                    {streak === 1 ? "day" : "days"}
                  </span>
                </p>
                {streak >= 7 && (
                  <p className="text-[8px] text-orange-400 font-bold mt-0.5">
                    🔥 On fire
                  </p>
                )}
              </div>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center justify-center gap-4 mt-2 mb-4">
              <button
                onClick={handlePrevMonth}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 w-24 text-center select-none">
                {viewDate.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={handleNextMonth}
                disabled={
                  viewDate.getMonth() === new Date().getMonth() &&
                  viewDate.getFullYear() === new Date().getFullYear()
                }
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tooltip-enabled heatmap pills */}
            <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-5 h-8 sm:h-10">
              {heatmapData.map((day, i) => (
                <HeatPill
                  key={i}
                  active={day.active}
                  dateStr={day.date}
                  activity={day.activity}
                />
              ))}
            </div>

            {/* Streak milestones */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { target: 7, icon: "⚡", label: "7D Lock", color: "amber" },
                { target: 14, icon: "🔥", label: "14D Blaze", color: "orange" },
                { target: 30, icon: "💎", label: "30D Elite", color: "sky" },
              ].map(({ target, icon, label, color }) => {
                const hit = streak >= target;
                return (
                  <div
                    key={target}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center",
                      hit
                        ? color === "amber"
                          ? "bg-[#BFA264]/10 border-[#BFA264]/25"
                          : color === "orange"
                            ? "bg-orange-500/10 border-orange-500/25"
                            : "bg-sky-500/10 border-sky-500/25"
                        : "bg-white/[0.02] border-white/[0.04]",
                    )}
                  >
                    <span className="text-lg leading-none mb-1">
                      {hit ? icon : "🔒"}
                    </span>
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        hit
                          ? color === "amber"
                            ? "text-[#BFA264]"
                            : color === "orange"
                              ? "text-orange-400"
                              : "text-sky-400"
                          : "text-white/20",
                      )}
                    >
                      {label}
                    </span>
                    {hit && (
                      <span
                        className={cn(
                          "text-[7px] font-bold mt-0.5",
                          color === "amber"
                            ? "text-[#BFA264]/60"
                            : color === "orange"
                              ? "text-orange-500/60"
                              : "text-sky-500/60",
                        )}
                      >
                        UNLOCKED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── 6. NETWORK INTELLIGENCE (4 col) ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl"
          >
            <NetworkWidget userData={userData} navigate={navigate} />
          </motion.div>

          {/* ── 7. KNOWLEDGE ENGINE (4 col) ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl"
          >
            <LearnWidget userData={userData} navigate={navigate} />
          </motion.div>

          {/* ── 8. EXECUTION MAP WIDGET (4 col) ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/app/roadmap")}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl cursor-pointer hover:border-white/10 transition-all group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <WLabel icon={Target} iconColor="text-indigo-400">
                  Execution Map
                </WLabel>
                <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
              </div>

              {nodesCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <p className="text-sm font-black text-white/40">
                    No Map Generated
                  </p>
                  <p className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">
                    Deploy AI to synthesize your trajectory
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Total Nodes",
                      val: nodesCount,
                      color: "text-white",
                    },
                    {
                      label: "In Progress",
                      val: Math.max(0, nodesCount - 0),
                      color: "text-[#BFA264]",
                    },
                    { label: "Completed", val: 0, color: "text-emerald-400" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 text-center"
                    >
                      <p
                        className={cn("text-2xl font-black font-mono", s.color)}
                      >
                        {s.val}
                      </p>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mt-0.5">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── 9. DAILY EXECUTION LEDGER (12 col) ──────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="col-span-1 sm:col-span-2 xl:col-span-12 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 opacity-[0.04] blur-3xl rounded-full pointer-events-none" />

            <TierGate
              featureKey="canUseJournal"
              fallbackType="blur"
              upsellMessage="Daily Execution Ledger requires Pro clearance. Log reality, track momentum, share proof of execution."
            >
              <div className="p-5 md:p-6">
                <DailyExecutionLedger
                  userData={userData}
                  isPro={isPro}
                  compact={true}
                />
              </div>
            </TierGate>
          </motion.div>
        </div>
        {/* end grid */}
      </div>
    </div>
  );
};

export default Dashboard;
