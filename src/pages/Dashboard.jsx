/**
 * @fileoverview Discotive OS — Command Center v6 (The Definitive Build)
 * @module Execution/CommandCenter
 * @description
 * The god-view of everything Discotive.
 * Mobile-first, PC-polished, colour-rich, and engineered never to be touched again.
 *
 * Fixes:
 *  — Score chart shows ALL mutations (ups & downs) — not just 1-point-per-day
 *  — Leaderboard rank resolves across multiple data paths (identity.domain,
 *    vision.passion, etc.) so Domain / Niche / Nation never show N/A for real users
 *  — Layout uses explicit col-span breakpoints so no widget leaves horizontal voids
 *  — Mobile stacks cleanly; desktop fills all 12 columns with no dead space
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useId,
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
  doc as firestoreDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { processDailyConsistency } from "../lib/scoreEngine";
import TierGate from "../components/TierGate";
import {
  Activity,
  Database,
  Network,
  Zap,
  Target,
  TerminalSquare,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Crown,
  Loader2,
  Eye,
  Lock,
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

// ─── Character assets ────────────────────────────────────────────────────────
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
    Female: "/Characters/Boy-1.webp",
    Other: "/Characters/Boy-1.webp",
  },
  observer: {
    Male: "/Characters/Observer.webp",
    Female: "/Characters/Observer.webp",
    Other: "/Characters/Observer.webp",
  },
};
const getAvatar = (key, gender) =>
  CHARACTERS[key]?.[gender] ||
  CHARACTERS[key]?.Other ||
  CHARACTERS.observer.Other;

// ─── Leaderboard filter definitions ─────────────────────────────────────────
const LB_FILTERS = [
  { label: "GLOBAL", key: "global", dbField: null, color: "text-white" },
  {
    label: "DOMAIN",
    key: "domain",
    dbField: "identity.domain",
    color: "text-amber-500",
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
    label: "PARALLEL",
    key: "parallelGoal",
    dbField: "identity.parallelGoal",
    color: "text-violet-400",
  },
];

/**
 * Multi-path field resolution so filters work even for users whose data
 * landed in vision.* (older schema) rather than identity.*.
 */
const resolveFilterValue = (userData, filterKey) => {
  switch (filterKey) {
    case "domain":
      return (
        userData?.identity?.domain ||
        userData?.vision?.passion ||
        userData?.domain ||
        null
      );
    case "niche":
      return (
        userData?.identity?.niche ||
        userData?.vision?.niche ||
        userData?.niche ||
        null
      );
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

// ─── Timeframe filter options ─────────────────────────────────────────────────
const TF_OPTIONS = ["24H", "1W", "1M", "ALL"];

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmtLabel = (iso, tf) => {
  const d = new Date(iso);
  if (tf === "24H")
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (tf === "ALL")
    return d.toLocaleDateString([], { month: "short", year: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

// ─── Custom tooltip for the score chart ───────────────────────────────────────
const ScoreTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const prev = payload[0].payload?.prev;
  const diff = prev != null ? val - prev : null;
  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl text-left pointer-events-none">
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
};

// ─── Widget label shared style ────────────────────────────────────────────────
const WLabel = ({ icon: Icon, iconColor, children }) => (
  <h2 className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-0">
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />}
    {children}
  </h2>
);

// ─── Accent colour accent map for Gantt ──────────────────────────────────────
const ACCENT = {
  amber: { bar: "#f59e0b", bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  emerald: { bar: "#10b981", bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  violet: { bar: "#8b5cf6", bg: "rgba(139,92,246,0.15)", text: "#8b5cf6" },
  cyan: { bar: "#06b6d4", bg: "rgba(6,182,212,0.15)", text: "#06b6d4" },
  rose: { bar: "#f43f5e", bg: "rgba(244,63,94,0.15)", text: "#f43f5e" },
  orange: { bar: "#f97316", bg: "rgba(249,115,22,0.15)", text: "#f97316" },
  sky: { bar: "#38bdf8", bg: "rgba(56,189,248,0.15)", text: "#38bdf8" },
  white: { bar: "#ffffff", bg: "rgba(255,255,255,0.08)", text: "#ffffff" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const uid = useId(); // stable per-render gradient id
  const GRAD_ID = `grad_${uid.replace(/:/g, "")}`;

  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();

  const [nodesCount, setNodesCount] = useState(0);

  // ── Core metrics ─────────────────────────────────────────────────────────
  const currentScore = userData?.discotiveScore?.current || 0;
  const last24hScore = userData?.discotiveScore?.last24h || currentScore;
  const delta = currentScore - last24hScore;
  const lastReason = userData?.discotiveScore?.lastReason || "OS Initialized";
  const lastAmount = userData?.discotiveScore?.lastAmount || 0;
  const streak =
    userData?.discotiveScore?.streak === 0 &&
    userData?.discotiveScore?.lastLoginDate ===
      new Date().toISOString().split("T")[0]
      ? 1
      : userData?.discotiveScore?.streak || 0;
  const vaultCount = (userData?.vault || []).length;
  const profileViews = userData?.profileViews || 0;
  const alliesCount = (userData?.allies || []).length;
  const operatorName =
    userData?.identity?.firstName ||
    userData?.identity?.fullName?.split(" ")[0] ||
    "Operator";

  const hasLinkedSocials = Object.values(userData?.links || {}).some(Boolean);
  const missionsCompleted =
    (nodesCount > 0 ? 1 : 0) +
    (vaultCount > 0 ? 1 : 0) +
    (hasLinkedSocials ? 1 : 0);

  // They are in the Zero State if they haven't finished the core loop and have a low score
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
  const [executionNodes, setExecNodes] = useState([]);
  const [isFetchingMap, setFetchingMap] = useState(false);
  const [journalEntry, setJournalEntry] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  // ── Month Navigation State ───────────────────────────────────────────────
  // Always set to the 1st of the month to prevent day-overflow calculation bugs
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const handlePrevMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  // ── Execution map fetch ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchMap = async () => {
      if (!userData?.uid) return;
      setFetchingMap(true);
      try {
        const snap = await getDoc(
          firestoreDoc(db, "users", userData.uid, "execution_map", "current"),
        );
        if (snap.exists()) {
          const nodes = snap.data().nodes || [];
          setExecNodes(nodes);
          setNodesCount(nodes.filter((n) => n.type === "executionNode").length);
        }
      } catch (err) {
        console.warn("[Dashboard] Map fetch:", err);
      } finally {
        setFetchingMap(false);
      }
    };
    fetchMap();
  }, [userData?.uid]);

  // ── Percentiles engine (MAANG-Grade Cached) ───────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!userData?.discotiveScore) return;
      setIsCalc(true);
      try {
        // 1. Instantly load Global from the nightly Cron Job (Zero database reads!)
        const globalPct = userData.precomputed?.globalPercentile || 100;

        // 2. Check if we already calculated the expensive sub-filters this session
        const cacheKey = `pct_${userData.uid}_${currentScore}`;
        const cached = sessionStorage.getItem(cacheKey);

        if (cached) {
          setPercentiles({ global: globalPct, ...JSON.parse(cached) });
          setIsCalc(false);
          return;
        }

        // 3. Only if no cache exists, fetch the sub-filters
        const ref = collection(db, "users");
        const domain = resolveFilterValue(userData, "domain");
        const niche = resolveFilterValue(userData, "niche");
        const pg = resolveFilterValue(userData, "parallelGoal");

        const promises = [];

        if (domain) {
          promises.push(
            getCountFromServer(
              query(ref, where("identity.domain", "==", domain)),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                ref,
                where("identity.domain", "==", domain),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        } else {
          promises.push(null, null);
        }

        if (niche) {
          promises.push(
            getCountFromServer(
              query(ref, where("identity.niche", "==", niche)),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                ref,
                where("identity.niche", "==", niche),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        } else {
          promises.push(null, null);
        }

        if (pg) {
          promises.push(
            getCountFromServer(
              query(ref, where("identity.parallelGoal", "==", pg)),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                ref,
                where("identity.parallelGoal", "==", pg),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        } else {
          promises.push(null, null);
        }

        const r = await Promise.all(promises);

        const pct = (tot, rank) => {
          if (!tot || !rank) return 100;
          const t = tot.data().count;
          if (t === 0) return 1;
          return Math.max(1, Math.ceil(((rank.data().count + 1) / t) * 100));
        };

        const calculated = {
          domain: domain ? pct(r[0], r[1]) : 100,
          niche: niche ? pct(r[2], r[3]) : 100,
          parallel: pg ? pct(r[4], r[5]) : 100,
        };

        // Save to cache so we never pay for these reads again this session
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

  // ── Leaderboard rank engine (fixed multi-path) ───────────────────────────
  const fetchWidgetRank = useCallback(async () => {
    if (!userData?.discotiveScore) return;
    setLbRefreshing(true);
    const filter = LB_FILTERS[lbIdx];
    try {
      const constraints = [where("discotiveScore.current", ">", currentScore)];

      if (filter.dbField) {
        const val = resolveFilterValue(userData, filter.key);
        if (!val) {
          // User doesn't have this dimension filled in
          setLbRank("—");
          setLbFilterLabel("Not set");
          setLbRefreshing(false);
          return;
        }
        constraints.push(where(filter.dbField, "==", val));
        // Show what dimension we're filtering by
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
      setLbFilterLabel("Error");
    } finally {
      setLbRefreshing(false);
    }
  }, [lbIdx, currentScore, userData]);

  useEffect(() => {
    if (!userLoading) fetchWidgetRank();
  }, [fetchWidgetRank, userLoading]);

  // ── Score chart data (3-Tier Aggregation Architecture) ──────────────────────────
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  useEffect(() => {
    const buildChartData = async () => {
      if (!userData?.uid) return;
      setIsChartLoading(true);

      try {
        let sourceData = [];

        if (tf === "24H") {
          // 1. Fetch from the 24H granular subcollection safely

          const logRef = collection(db, "users", userData.uid, "score_log");

          // Strict 24-hour lookback to prevent TTL bleed
          const cutoffIso = new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString();

          // Order by 'date' (ISO string), NOT 'timestamp' to prevent null-crashes on optimistic writes
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
          // 2. Read from the daily map on the user doc
          const daily = userData.daily_scores || {};
          sourceData = Object.keys(daily).map((date) => ({
            date,
            score: daily[date],
          }));
        } else if (tf === "ALL") {
          // 3. Read from the monthly map on the user doc
          const monthly = userData.monthly_scores || {};
          sourceData = Object.keys(monthly).map((month) => ({
            date: `${month}-01`, // Append day for safe Date parsing
            score: monthly[month],
          }));
        }

        // Sort chronologically
        sourceData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Apply specific cutoffs for map data
        const now = new Date();
        const cutoff = new Date(now);
        if (tf === "24H") cutoff.setHours(now.getHours() - 24);
        if (tf === "1W") cutoff.setDate(now.getDate() - 7);
        if (tf === "1M") cutoff.setMonth(now.getMonth() - 1);

        // Enforce the cutoff for ALL timeframes except ALL
        if (tf !== "ALL") {
          sourceData = sourceData.filter((e) => new Date(e.date) >= cutoff);
        }

        // 🔥 THE FIX: Pad the data if Recharts doesn't have enough points to draw a line
        if (sourceData.length === 1) {
          // If we only have today's data, inject a baseline point at the cutoff time
          const baselineDate =
            tf === "ALL"
              ? new Date("2026-03-01").toISOString()
              : cutoff.toISOString();
          sourceData.unshift({
            date: baselineDate,
            score: tf === "24H" ? userData.discotiveScore?.last24h || 0 : 0,
          });
        } else if (sourceData.length === 0) {
          // Completely empty? Draw a flat zero line so the UI doesn't crash
          const baselineDate =
            tf === "ALL"
              ? new Date("2026-03-01").toISOString()
              : cutoff.toISOString();
          sourceData = [
            { date: baselineDate, score: 0 },
            { date: now.toISOString(), score: 0 },
          ];
        }

        // Map to Recharts format
        const formatted = sourceData.map((e, i) => ({
          day: fmtLabel(e.date, tf),
          score: e.score,
          prev: i > 0 ? sourceData[i - 1].score : null,
        }));

        setChartData(formatted);
      } catch (err) {
        console.error("[Dashboard] Chart rendering failed:", err);
      } finally {
        setIsChartLoading(false);
      }
    };

    buildChartData();
  }, [userData, tf]);

  // ── Score chart range ────────────────────────────────────────────────────
  const chartMin = useMemo(() => {
    if (chartData.length === 0) return 0;
    const vals = chartData.map((d) => d.score);
    const min = Math.min(...vals);
    return Math.max(0, min - Math.ceil((Math.max(...vals) - min) * 0.2 + 5));
  }, [chartData]);

  const chartGain = useMemo(() => {
    if (chartData.length < 2) return 0;
    return chartData[chartData.length - 1].score - chartData[0].score;
  }, [chartData]);

  // ── Heatmap data (Dynamic to Selected Month) ─────────────────────────────
  const heatmapData = useMemo(() => {
    const active = new Set();
    (userData?.journal_ledger || []).forEach(
      (e) => e?.date && active.add(e.date.split("T")[0]),
    );
    (userData?.consistency_log || []).forEach(
      (s) => typeof s === "string" && active.add(s.split("T")[0]),
    );
    (userData?.login_history || []).forEach(
      (s) => typeof s === "string" && active.add(s.split("T")[0]),
    );
    (userData?.score_history || []).forEach(
      (e) => e?.date && active.add(e.date.split("T")[0]),
    );
    const last = userData?.discotiveScore?.lastLoginDate;
    if (last) active.add(last.split("T")[0]);

    // Use viewDate to determine the target month and year
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const str = `${d.getFullYear()}-${monthStr}-${dayStr}`;

      return { date: str, active: active.has(str), dayNum: d.getDate() };
    });
  }, [userData, viewDate]);

  // ── Gantt data ───────────────────────────────────────────────────────────
  const ganttData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const WINDOW = 90;
    const windowEnd = new Date(today.getTime() + WINDOW * 86400000);

    const nodes = executionNodes
      .filter((n) => n.type === "executionNode" && n.data?.deadline)
      .map((n) => {
        const dl = new Date(n.data.deadline);
        dl.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((dl - today) / 86400000);
        const tasks = n.data.tasks || [];
        return {
          id: n.id,
          title: n.data.title || "Untitled",
          isCompleted: !!n.data.isCompleted,
          deadline: n.data.deadline,
          deadlineDate: dl,
          daysLeft,
          accentColor: n.data.accentColor || "amber",
          progress: tasks.length
            ? Math.round(
                (tasks.filter((t) => t.completed).length / tasks.length) * 100,
              )
            : n.data.isCompleted
              ? 100
              : 0,
        };
      })
      .filter((n) => n.deadlineDate <= windowEnd)
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 8);

    return { nodes, WINDOW };
  }, [executionNodes]);

  // ── Today's score events ─────────────────────────────────────────────────
  const todayEvents = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return (userData?.score_history || [])
      .filter((e) => e?.date?.startsWith(today) && typeof e.score === "number")
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }, [userData?.score_history]);

  // ── Journal commit ───────────────────────────────────────────────────────
  const handleCommitJournal = async () => {
    if (!journalEntry.trim() || !userData?.uid) return;
    setIsCommitting(true);
    try {
      await updateDoc(doc(db, "users", userData.uid), {
        journal_ledger: arrayUnion({
          date: new Date().toISOString(),
          content: journalEntry.trim(),
        }),
      });
      setJournalEntry("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsCommitting(false);
    }
  };

  // ── Leaderboard avatar ───────────────────────────────────────────────────
  const rankKey =
    lbRank === 1
      ? "rank1"
      : lbRank === 2
        ? "rank2"
        : lbRank === 3
          ? "rank3"
          : "observer";
  const avatar = getAvatar(rankKey, userData?.identity?.gender);

  // ─────────────────────────────────────────────────────────────────────────
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
              className="w-1 h-6 bg-amber-500 rounded-full origin-bottom"
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
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-amber-500/30 overflow-x-hidden pb-28 md:pb-16">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-5 md:py-8 relative z-10 space-y-4">
        {/* ════════════════════════════════════════════════════════════════════
            HEADER
        ════════════════════════════════════════════════════════════════════ */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Verified Operator
              </div>
              {userData?.tier === "PRO" && (
                <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5" /> God Mode
                </div>
              )}
              <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[8px] font-bold text-white/40 uppercase tracking-widest">
                Lv {level} Operator
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Hi,{" "}
              <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                {operatorName}
              </span>
            </h1>
          </motion.div>

          {/* Level progress — hidden on tiny screens */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden sm:flex flex-col items-end gap-1 shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {ptsToNext.toLocaleString()} pts to Lv {Math.min(level + 1, 10)}
              </span>
              <span className="text-[9px] font-black text-amber-500 font-mono">
                Lv {level}
              </span>
            </div>
            <div className="w-40 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
              />
            </div>
          </motion.div>
        </header>

        {/* ════════════════════════════════════════════════════════════════════
            ZERO STATE: INITIALIZATION PROTOCOL
        ════════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {isZeroState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              className="bg-gradient-to-br from-amber-500/10 to-[#0a0a0c] border border-amber-500/20 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden mb-4"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 opacity-[0.05] blur-3xl rounded-full pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-xl font-black text-white tracking-tight">
                      Initialization Protocol
                    </h2>
                  </div>
                  <p className="text-sm text-amber-500/70 mb-6 max-w-md leading-relaxed">
                    Your telemetry is flatlined. Complete your first three
                    missions to calibrate the Discotive Engine and unlock your
                    dashboard.
                  </p>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                      Calibration Progress:{" "}
                      {Math.round((missionsCompleted / 3) * 100)}%
                    </span>
                  </div>
                  <div className="w-full max-w-md h-2 bg-black/50 border border-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(missionsCompleted / 3) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-3">
                  {[
                    {
                      title: "Generate Execution Map",
                      desc: "Deploy AI to plot your 30-day trajectory.",
                      done: nodesCount > 0,
                      link: "/app/roadmap",
                    },
                    {
                      title: "Secure a Vault Asset",
                      desc: "Upload your first proof-of-work credential.",
                      done: vaultCount > 0,
                      link: "/app/vault",
                    },
                    {
                      title: "Link Social Connectors",
                      desc: "Connect your GitHub or LinkedIn profile.",
                      done: hasLinkedSocials,
                      link: "/app/settings",
                    },
                  ].map((mission, i) => (
                    <Link
                      key={i}
                      to={mission.link}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl border transition-all",
                        mission.done
                          ? "bg-emerald-500/5 border-emerald-500/20 opacity-60"
                          : "bg-black/40 border-white/10 hover:border-amber-500/40 hover:bg-black/60 group",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center border",
                            mission.done
                              ? "bg-emerald-500 border-emerald-400"
                              : "bg-[#111] border-[#333]",
                          )}
                        >
                          {mission.done && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div>
                          <p
                            className={cn(
                              "text-sm font-bold",
                              mission.done
                                ? "text-emerald-500 line-through"
                                : "text-white",
                            )}
                          >
                            {mission.title}
                          </p>
                          <p className="text-[10px] text-white/40 mt-0.5">
                            {mission.desc}
                          </p>
                        </div>
                      </div>
                      {!mission.done && (
                        <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-amber-500 transition-colors" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════════════════
            MAIN BENTO GRID
        ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* ── 1. SCORE TELEMETRY (12→8 col) ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-1 sm:col-span-2 xl:col-span-8 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-7 relative overflow-hidden shadow-2xl flex flex-col min-h-[300px]"
          >
            {/* Gradient glow */}
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-amber-500 opacity-[0.04] blur-3xl pointer-events-none" />

            <div className="flex flex-wrap items-start justify-between gap-4 relative z-10 mb-4">
              {/* Score number + last mutation */}
              <div className="flex flex-col">
                <WLabel icon={Activity} iconColor="text-amber-500">
                  Real-Time Telemetry
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

                {/* Last mutation pill */}
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

              {/* Timeframe toggles + period gain */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex bg-white/[0.04] border border-white/[0.06] rounded-xl p-1 gap-0.5">
                  {TF_OPTIONS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTf(t)}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                        tf === t
                          ? "bg-amber-500/15 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
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
              {chartData.length >= 2 ? (
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
                          stopColor="#f59e0b"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
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
                        stroke: "rgba(245,158,11,0.25)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill={`url(#${GRAD_ID})`}
                      dot={
                        chartData.length <= 20
                          ? { r: 2.5, fill: "#f59e0b", strokeWidth: 0 }
                          : false
                      }
                      activeDot={{
                        r: 5,
                        fill: "#f59e0b",
                        stroke: "#000",
                        strokeWidth: 2,
                      }}
                      animationDuration={700}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Activity className="w-5 h-5 text-amber-500/30 animate-pulse" />
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                    Execute tasks to build your score history
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── 2. LEADERBOARD RANK WIDGET (12→4 col) ────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {/* Rank glow */}
            {rankKey !== "observer" && (
              <div
                className={cn(
                  "absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none",
                  rankKey === "rank1"
                    ? "bg-amber-500"
                    : rankKey === "rank2"
                      ? "bg-slate-300"
                      : "bg-orange-700",
                )}
              />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-3 relative z-10">
              <WLabel icon={Crown} iconColor={LB_FILTERS[lbIdx].color}>
                Arena Rank
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
                      lbRefreshing && "animate-spin text-amber-500",
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Dimension label */}
            <p
              className={cn(
                "text-[9px] font-bold uppercase tracking-widest mb-4 relative z-10",
                LB_FILTERS[lbIdx].color,
              )}
            >
              {lbIdx === 0 ? "All Operators" : lbFilterLabel}
            </p>

            {/* Avatar + rank */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-3 pb-2">
              <div className="relative w-20 h-20 flex items-end justify-center">
                {lbRank === 1 && (
                  <Crown className="absolute -top-5 text-amber-500 w-6 h-6 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                )}
                <img
                  src={avatar.replace(".gif", ".webp")} // Ensure you use WebP
                  alt="Rank"
                  width={80} // 20 * 4 (Tailwind w-20)
                  height={80}
                  fetchpriority="high" // This is highly visible above the fold
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
                      ? "text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
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
                {delta > 0 && lbRank !== "?" && lbRank !== "—" && (
                  <div className="px-1.5 py-0.5 bg-emerald-500/10 rounded text-[8px] font-black text-emerald-400 border border-emerald-500/20">
                    +{delta}
                  </div>
                )}
              </div>
            </div>

            {/* Navigate */}
            <Link
              to="/app/leaderboard"
              className="relative z-10 mt-2 w-full py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl text-[9px] font-black text-white/50 uppercase tracking-widest hover:text-white hover:bg-white/[0.08] transition-all flex items-center justify-center gap-1.5"
            >
              Open Leaderboard <ArrowUpRight className="w-3 h-3" />
            </Link>
          </motion.div>

          {/* ── 3. QUICK STATS ROW (2x2 square on mobile, 4 in a row on xl) ─────────── */}
          <div className="col-span-1 sm:col-span-2 xl:col-span-12 grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                label: "Score Points",
                val: currentScore.toLocaleString(),
                icon: Zap,
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                border: "border-amber-500/15",
                sub:
                  delta > 0
                    ? `+${delta} today`
                    : delta < 0
                      ? `${delta} today`
                      : "No change today",
                onClick: null,
              },
              {
                label: "Vault Assets",
                val: vaultCount,
                icon: Database,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/15",
                sub: "Verified proofs",
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

          {/* ── 4. POSITION MATRIX PERCENTILES (12→5 col) ───────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 sm:col-span-2 xl:col-span-5 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl flex flex-col"
          >
            <WLabel icon={Network} iconColor="text-sky-400">
              Position Matrix
            </WLabel>
            <p className="text-[9px] text-white/20 mb-5 mt-1">
              Your global percentile standing
            </p>

            {isCalc ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                {[
                  {
                    label: "Global Pool",
                    val: percentiles.global,
                    bar: "from-slate-500 to-slate-400",
                    text: "text-slate-300",
                    glow: "",
                  },
                  {
                    label:
                      resolveFilterValue(userData, "domain") || "Your Domain",
                    val: percentiles.domain,
                    bar: "from-amber-500 to-amber-400",
                    text: "text-amber-400",
                    glow: "shadow-[0_0_8px_rgba(245,158,11,0.4)]",
                  },
                  {
                    label:
                      resolveFilterValue(userData, "niche") || "Your Niche",
                    val: percentiles.niche,
                    bar: "from-emerald-500 to-emerald-400",
                    text: "text-emerald-400",
                    glow: "shadow-[0_0_8px_rgba(16,185,129,0.4)]",
                  },
                  {
                    label:
                      resolveFilterValue(userData, "parallelGoal") ||
                      "Parallel Goal",
                    val: percentiles.parallel,
                    bar: "from-violet-500 to-violet-400",
                    text: "text-violet-400",
                    glow: "shadow-[0_0_8px_rgba(139,92,246,0.4)]",
                  },
                ].map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[10px] font-bold text-white/50 truncate max-w-[60%]">
                        {s.label}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-black font-mono shrink-0",
                          s.text,
                        )}
                      >
                        Top {s.val}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(2, 100 - s.val)}%` }}
                        transition={{
                          duration: 0.9,
                          delay: 0.3 + i * 0.1,
                          ease: "easeOut",
                        }}
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r",
                          s.bar,
                          s.glow,
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Today's events mini-feed */}
            {todayEvents.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.04] space-y-1.5">
                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">
                  Today's Mutations
                </p>
                {todayEvents.map((e, i) => {
                  const prev =
                    todayEvents[i + 1]?.score ??
                    (i < todayEvents.length - 1
                      ? todayEvents[i + 1].score
                      : e.score);
                  const diff = e.score - (prev || e.score);
                  return (
                    <div
                      key={e.date + i}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[9px] text-white/30 font-mono">
                        {new Date(e.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span
                        className={cn(
                          "text-[9px] font-black font-mono",
                          diff >= 0 ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {diff >= 0 ? `+${diff}` : diff}
                      </span>
                      <span className="text-[9px] font-black text-white/60">
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── 5. CONSISTENCY HEATMAP (12→7 col) ────────────────────────── */}
          {!isZeroState && (
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
              <div className="flex items-center justify-center gap-4 mt-2 mb-5">
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
                  // Optional: Disable going into future months
                  disabled={
                    viewDate.getMonth() === new Date().getMonth() &&
                    viewDate.getFullYear() === new Date().getFullYear()
                  }
                  className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dynamic timeline (Vertical Pill bars) */}
              <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-5 h-8 sm:h-10">
                {heatmapData.map((day, i) => (
                  <div
                    key={i}
                    title={day.date}
                    className={cn(
                      "flex-1 h-full max-w-[10px] sm:max-w-[12px] rounded-full border transition-all",
                      day.active
                        ? "bg-amber-500 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                        : "bg-white/[0.04] border-white/[0.04]",
                    )}
                  />
                ))}
              </div>

              {/* Streak milestones */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { target: 7, icon: "⚡", label: "7D Lock", color: "amber" },
                  {
                    target: 14,
                    icon: "🔥",
                    label: "14D Blaze",
                    color: "orange",
                  },
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
                            ? "bg-amber-500/10 border-amber-500/25"
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
                              ? "text-amber-400"
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
                              ? "text-amber-500/60"
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
          )}

          {/* ── 6. EXECUTION TIMELINE GANTT (12 col) ──────────────────────── */}
          {!isZeroState && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="col-span-1 sm:col-span-2 xl:col-span-12 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-7 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-5">
                <WLabel icon={Map} iconColor="text-indigo-400">
                  Execution Timeline - 90D Horizon
                </WLabel>
                <div className="flex items-center gap-3">
                  {isFetchingMap && (
                    <RefreshCw className="w-3 h-3 text-white/20 animate-spin" />
                  )}
                  <Link
                    to="/app/roadmap"
                    className="text-[9px] font-black text-indigo-400/60 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1"
                  >
                    Roadmap <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {ganttData.nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="w-7 h-7 text-white/10 mb-3" />
                  <p className="text-sm font-bold text-white/20 mb-1">
                    No active protocols with deadlines
                  </p>
                  <Link
                    to="/app/roadmap"
                    className="text-[9px] font-black text-indigo-400/50 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                  >
                    Generate your execution map →
                  </Link>
                </div>
              ) : (
                <>
                  {/* Ruler */}
                  <div className="flex items-center mb-2 pl-[140px] sm:pl-[180px]">
                    {[0, 15, 30, 45, 60, 75, 90].map((d) => (
                      <div
                        key={d}
                        className="flex-1 text-[7px] font-mono font-bold text-white/15 border-l border-white/[0.04] pl-1"
                      >
                        {d === 0 ? "Today" : `+${d}d`}
                      </div>
                    ))}
                  </div>

                  {/* Bars */}
                  <div className="space-y-2">
                    {ganttData.nodes.map((n) => {
                      const pct = n.isCompleted
                        ? 100
                        : Math.min(
                            100,
                            Math.max(
                              2,
                              (Math.max(0, n.daysLeft) / window) * 100,
                            ),
                          );
                      const isOverdue = n.daysLeft < 0;
                      const isUrgent = !isOverdue && n.daysLeft <= 7;
                      const a = n.isCompleted
                        ? ACCENT.emerald
                        : isOverdue
                          ? {
                              bar: "#ef4444",
                              bg: "rgba(239,68,68,0.15)",
                              text: "#ef4444",
                            }
                          : isUrgent
                            ? ACCENT.orange
                            : ACCENT[n.accentColor] || ACCENT.amber;

                      return (
                        <Link
                          to="/app/roadmap"
                          key={n.id}
                          className="flex items-center gap-2 group cursor-pointer"
                        >
                          {/* Label */}
                          <div className="w-[140px] sm:w-[180px] shrink-0 flex items-center gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: a.bar }}
                            />
                            <div className="min-w-0">
                              <p
                                className="text-[10px] font-bold truncate leading-tight"
                                style={{
                                  color: n.isCompleted
                                    ? "rgba(255,255,255,0.25)"
                                    : "rgba(255,255,255,0.7)",
                                  textDecoration: n.isCompleted
                                    ? "line-through"
                                    : "none",
                                }}
                              >
                                {n.title}
                              </p>
                              <p className="text-[7px] font-bold uppercase tracking-widest text-white/20">
                                {isOverdue
                                  ? `${Math.abs(n.daysLeft)}d overdue`
                                  : n.isCompleted
                                    ? "done"
                                    : `${n.daysLeft}d`}
                              </p>
                            </div>
                          </div>

                          {/* Bar track */}
                          <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden relative border border-white/[0.04]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                background: `linear-gradient(90deg,${a.bar}25,${a.bar}55)`,
                                border: `1px solid ${a.bar}30`,
                              }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${n.progress}%`,
                                  background: `linear-gradient(90deg,${a.bar}70,${a.bar})`,
                                  boxShadow: `0 0 6px ${a.bar}50`,
                                }}
                              />
                            </motion.div>
                            <div className="absolute inset-y-0 left-0 w-px bg-white/15" />
                          </div>

                          {/* Deadline */}
                          <div
                            className="shrink-0 text-[7px] font-black font-mono px-1.5 py-1 rounded-lg border"
                            style={{
                              color: a.text,
                              borderColor: `${a.bar}25`,
                              background: a.bg,
                            }}
                          >
                            {new Date(n.deadline).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.04]">
                    {[
                      ["#10b981", "Done"],
                      ["#f59e0b", "On Track"],
                      ["#f97316", "Urgent ≤7d"],
                      ["#ef4444", "Overdue"],
                    ].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: c }}
                        />
                        <span className="text-[7px] font-bold text-white/25 uppercase tracking-widest">
                          {l}
                        </span>
                      </div>
                    ))}
                    <span className="ml-auto text-[7px] font-bold text-white/15 uppercase tracking-widest hidden sm:inline">
                      Bar = time left · Fill = task %
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── 7. ROADMAP NODES (12→6 col) ──────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            onClick={() => navigate("/app/roadmap")}
            className="col-span-1 sm:col-span-2 xl:col-span-6 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 md:p-6 shadow-2xl cursor-pointer hover:border-white/10 transition-all group relative overflow-hidden"
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
                <div className="flex flex-col items-center justify-center py-8 text-center">
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
                <>
                  {/* Progress pipeline visual */}
                  <div className="flex items-center gap-0 w-full mb-5 relative">
                    {[...Array(Math.min(nodesCount, 7))].map((_, i) => {
                      const done = executionNodes
                        .filter((n) => n.type === "executionNode")
                        .slice(i, i + 1)[0]?.data?.isCompleted;
                      return (
                        <React.Fragment key={i}>
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 text-[8px]",
                              done
                                ? "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                                : i === 0
                                  ? "bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                  : "bg-white/[0.04] border-white/10",
                            )}
                          >
                            {done && (
                              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                          {i < Math.min(nodesCount, 7) - 1 && (
                            <div
                              className={cn(
                                "flex-1 h-0.5",
                                done ? "bg-emerald-500/40" : "bg-white/[0.06]",
                              )}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                    {nodesCount > 7 && (
                      <span className="text-[9px] text-white/20 font-bold ml-2">
                        +{nodesCount - 7}
                      </span>
                    )}
                  </div>

                  {/* Counts */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Total Nodes",
                        val: nodesCount,
                        color: "text-white",
                      },
                      {
                        label: "Completed",
                        val: executionNodes.filter(
                          (n) =>
                            n.type === "executionNode" && n.data?.isCompleted,
                        ).length,
                        color: "text-emerald-400",
                      },
                      {
                        label: "In Progress",
                        val: executionNodes.filter(
                          (n) =>
                            n.type === "executionNode" &&
                            !n.data?.isCompleted &&
                            n.data?.priorityStatus === "READY",
                        ).length,
                        color: "text-amber-400",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3 text-center"
                      >
                        <p
                          className={cn(
                            "text-2xl font-black font-mono",
                            s.color,
                          )}
                        >
                          {s.val}
                        </p>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mt-0.5">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ── 8. DAILY LEDGER (12→6 col) ────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="col-span-1 sm:col-span-2 xl:col-span-6 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] shadow-2xl relative overflow-hidden"
          >
            {/* Violet glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500 opacity-[0.04] blur-3xl rounded-full pointer-events-none" />

            <TierGate
              featureKey="canUseJournal"
              fallbackType="blur"
              upsellMessage="Daily Execution Ledger requires Pro clearance. Log reality, build momentum."
            >
              <div className="p-5 md:p-6 flex flex-col h-full min-h-[220px]">
                <div className="flex items-center justify-between mb-3">
                  <WLabel icon={BookOpen} iconColor="text-violet-400">
                    Daily Ledger
                  </WLabel>
                  <Star className="w-3.5 h-3.5 text-violet-400/30" />
                </div>
                <textarea
                  value={journalEntry}
                  onChange={(e) =>
                    setJournalEntry(e.target.value.slice(0, 250))
                  }
                  placeholder="Document today's reality. What did you execute? Where did you struggle? What's tomorrow's target?"
                  className="flex-1 w-full bg-transparent text-sm font-medium text-white/80 placeholder-white/15 focus:outline-none resize-none custom-scrollbar leading-relaxed min-h-[100px]"
                />
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.05] mt-3">
                  <p className="text-[9px] font-mono font-bold text-white/20">
                    {journalEntry.length} / 250
                  </p>
                  <button
                    onClick={handleCommitJournal}
                    disabled={isCommitting || journalEntry.length === 0}
                    className="px-4 py-1.5 bg-violet-500 hover:bg-violet-400 disabled:opacity-30 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  >
                    {isCommitting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <TerminalSquare className="w-3 h-3" />
                    )}
                    Commit
                  </button>
                </div>
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
