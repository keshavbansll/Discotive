/**
 * @fileoverview Discotive OS - Command Center (Dashboard)
 * @module Execution/CommandCenter
 * @description
 * High-density, calculative operator hub.
 * Features dynamic leaderboard cycling, real-time percentile rankings, and strict empty-states.
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getCountFromServer,
  doc,
  updateDoc,
  arrayUnion,
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
  User,
  Eye,
  Lock,
  Flame,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getDoc, doc as firestoreDoc } from "firebase/firestore";
import { cn } from "../components/ui/BentoCard";

// --- CHARACTER ASSETS FOR WIDGET ---
const CHARACTERS = {
  rank1: {
    Male: "/Characters/Boy-1.gif",
    Female: "/Characters/Girl-1.gif",
    Other: "/Characters/Others-1.gif",
  },
  rank2: {
    Male: "/Characters/Boy-2.gif",
    Female: "/Characters/Girl-2.gif",
    Other: "/Characters/Others-1.gif",
  },
  rank3: {
    Male: "/Characters/Boy-3.gif",
    Female: "/Characters/Boy-1.gif",
    Other: "/Characters/Boy-1.gif",
  },
  observer: {
    Male: "/Characters/Observer.gif",
    Female: "/Characters/Observer.gif",
    Other: "/Characters/Observer.gif",
  },
};
const getAvatar = (rankKey, gender) =>
  CHARACTERS[rankKey][gender] || CHARACTERS[rankKey]["Other"];

// ============================================================================
// MAIN COMMAND CENTER
// ============================================================================

const Dashboard = () => {
  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();

  // --- UI STATE ---
  const [journalEntry, setJournalEntry] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);

  // --- TELEMETRY STATE ---
  const [percentiles, setPercentiles] = useState({
    global: 100,
    domain: 100,
    niche: 100,
    parallel: 100,
  });
  const [isCalculating, setIsCalculating] = useState(true);

  // --- DYNAMIC LEADERBOARD WIDGET STATE ---
  const LB_FILTERS = [
    { label: "GLOBAL MATRIX", key: "global", dbField: null },
    { label: "MACRO DOMAIN", key: "domain", dbField: "identity.domain" },
    { label: "SPECIFIC NICHE", key: "niche", dbField: "identity.niche" },
    {
      label: "PARALLEL GOAL",
      key: "parallelGoal",
      dbField: "identity.parallelGoal",
    },
    { label: "NATION", key: "country", dbField: "identity.country" },
  ];
  const [lbFilterIndex, setLbFilterIndex] = useState(0);
  const [lbRank, setLbRank] = useState("?");
  const [isLbRefreshing, setIsLbRefreshing] = useState(false);

  // --- EXECUTION MAP STATE (for Gantt) ---
  const [executionNodes, setExecutionNodes] = useState([]);
  const [isFetchingMap, setIsFetchingMap] = useState(false);

  // --- CORE METRICS ---
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

  const vaultCount = userData?.vault?.length || 0;
  /**
   * @description
   * nodesCount: Prefer the freshly-fetched execution map (subcollection).
   * Falls back to userData cache if the async fetch is still in-flight.
   */
  const nodesCount =
    executionNodes.length > 0
      ? executionNodes.filter((n) => n.type === "executionNode").length
      : userData?.execution_map?.nodes?.length || 0;
  const profileViews = userData?.profileViews || 0;
  const operatorName =
    userData?.identity?.firstName ||
    userData?.firstName ||
    userData?.identity?.fullName?.split(" ")[0] ||
    userData?.username ||
    "Operator";

  // Boot Sequence: Force Consistency Check in case Auth missed it
  useEffect(() => {
    if (userData?.uid) processDailyConsistency(userData.uid);
  }, [userData?.uid]);

  // Fetch execution map for Gantt timeline
  useEffect(() => {
    const fetchMap = async () => {
      if (!userData?.uid) return;
      setIsFetchingMap(true);
      try {
        const snap = await getDoc(
          firestoreDoc(db, "users", userData.uid, "execution_map", "current"),
        );
        if (snap.exists()) {
          const mapData = snap.data();
          setExecutionNodes(mapData.nodes || []);
        }
      } catch (err) {
        console.warn("[Dashboard] Execution map fetch failed:", err);
      } finally {
        setIsFetchingMap(false);
      }
    };
    fetchMap();
  }, [userData?.uid]);

  // ============================================================================
  // TELEMETRY & RANK ENGINES
  // ============================================================================

  // Engine 1: Global Percentiles
  useEffect(() => {
    const calculateStandings = async () => {
      if (!userData?.discotiveScore) return;
      setIsCalculating(true);
      try {
        const usersRef = collection(db, "users");
        const domain = userData?.identity?.domain || userData?.domain;
        const niche = userData?.identity?.niche || userData?.niche;
        const parallelGoal =
          userData?.identity?.parallelGoal || userData?.parallelGoal;

        const qGlobalTotal = query(usersRef);
        const qGlobalRank = query(
          usersRef,
          where("discotiveScore.current", ">", currentScore),
        );
        const promises = [
          getCountFromServer(qGlobalTotal),
          getCountFromServer(qGlobalRank),
        ];

        if (domain) {
          promises.push(
            getCountFromServer(
              query(usersRef, where("identity.domain", "==", domain)),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                usersRef,
                where("identity.domain", "==", domain),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        }
        if (niche) {
          promises.push(
            getCountFromServer(
              query(usersRef, where("identity.niche", "==", niche)),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                usersRef,
                where("identity.niche", "==", niche),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        }
        if (parallelGoal) {
          promises.push(
            getCountFromServer(
              query(
                usersRef,
                where("identity.parallelGoal", "==", parallelGoal),
              ),
            ),
          );
          promises.push(
            getCountFromServer(
              query(
                usersRef,
                where("identity.parallelGoal", "==", parallelGoal),
                where("discotiveScore.current", ">", currentScore),
              ),
            ),
          );
        }

        const results = await Promise.all(promises);
        const calcPercentile = (totalSnap, rankSnap) => {
          const total = totalSnap.data().count;
          if (total === 0) return 1;
          const rank = rankSnap.data().count + 1;
          return Math.max(1, Math.ceil((rank / total) * 100));
        };

        setPercentiles({
          global: calcPercentile(results[0], results[1]),
          domain:
            domain && results[2] ? calcPercentile(results[2], results[3]) : 100,
          niche:
            niche && results[4] ? calcPercentile(results[4], results[5]) : 100,
          parallel:
            parallelGoal && results[6]
              ? calcPercentile(results[6], results[7])
              : 100,
        });
      } catch (error) {
        console.error(error);
      } finally {
        setIsCalculating(false);
      }
    };
    if (!userLoading) calculateStandings();
  }, [userLoading, currentScore, userData?.identity]);

  // Engine 2: Dynamic Leaderboard Widget
  // Wrapped in useMemo to get a stable reference for useEffect deps
  const fetchWidgetRank = React.useCallback(async () => {
    if (!userData?.discotiveScore) return;
    setIsLbRefreshing(true);
    try {
      const filter = LB_FILTERS[lbFilterIndex];
      const constraints = [where("discotiveScore.current", ">", currentScore)];

      if (filter.dbField) {
        /**
         * @description
         * Resolve the user's value for this filter dimension.
         * Identity data may live at `userData.identity.domain` OR `userData.domain`.
         * We check both in priority order: nested identity object first, root fallback.
         * The Firestore field path comes from `filter.dbField` — this is the
         * canonical database path (e.g. "identity.domain") and NOT the JS key.
         */
        const userValue =
          userData?.identity?.[filter.key] ?? userData?.[filter.key] ?? null;

        if (userValue) {
          constraints.push(where(filter.dbField, "==", userValue));
        } else {
          // User hasn't set this dimension — show N/A, not an error
          setLbRank("N/A");
          setIsLbRefreshing(false);
          return;
        }
      }

      const q = query(collection(db, "users"), ...constraints);
      const snap = await getCountFromServer(q);
      // Rank = number of users with strictly higher score + 1
      setLbRank(snap.data().count + 1);
    } catch (error) {
      console.error("[Dashboard] Leaderboard rank engine failed:", error);
      setLbRank("—");
    } finally {
      setIsLbRefreshing(false);
    }
  }, [lbFilterIndex, currentScore, userData]); // eslint-disable-line

  useEffect(() => {
    if (!userLoading) fetchWidgetRank();
  }, [fetchWidgetRank, userLoading]);

  // ============================================================================
  // DATA PARSERS
  // ============================================================================
  /**
   * @description
   * Builds the 7-day score sparkline from `score_history`.
   * Falls back to synthesizing a minimal 2-point baseline from `current` score
   * so the chart renders immediately on first load instead of showing empty state.
   * A unique gradient ID prevents SVG defs collisions when multiple recharts
   * instances share the same `id="scoreGradient"` in the DOM.
   */
  const SPARKLINE_GRADIENT_ID = `scoreGrad_${Math.random().toString(36).slice(2, 8)}`;

  const sparklineData = useMemo(() => {
    const history = userData?.score_history || [];
    if (history.length >= 2) {
      return history.slice(-14).map((entry) => ({
        day: entry.date
          ? new Date(entry.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })
          : "—",
        score: typeof entry.score === "number" ? entry.score : 0,
      }));
    }
    // Synthesize a minimal visible baseline
    if (currentScore > 0) {
      const today = new Date();
      return [
        {
          day: new Date(today.getTime() - 86400000).toLocaleDateString(
            undefined,
            { month: "short", day: "numeric" },
          ),
          score: Math.max(0, currentScore - 10),
        },
        {
          day: today.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: currentScore,
        },
      ];
    }
    return [];
  }, [userData, currentScore]);

  /**
   * @description
   * 28-day activity heatmap. Resolves active dates from multiple sources
   * so it populates regardless of which write path was used:
   *  1. journal_ledger entries (dashboard daily ledger)
   *  2. consistency_log (written by processDailyConsistency in scoreEngine)
   *  3. login_history (array of ISO date strings written by auth listener)
   *  4. score_history (any day with a score event counts as active)
   *
   * All sources are unioned so a single active data point from any source
   * marks that day as lit on the heatmap.
   */
  const heatmapData = useMemo(() => {
    const activeDates = new Set();

    // Source 1: journal ledger
    (userData?.journal_ledger || []).forEach((entry) => {
      if (entry?.date) activeDates.add(entry.date.split("T")[0]);
    });

    // Source 2: consistency_log (array of ISO date strings)
    (userData?.consistency_log || []).forEach((dateStr) => {
      if (typeof dateStr === "string") activeDates.add(dateStr.split("T")[0]);
    });

    // Source 3: login_history
    (userData?.login_history || []).forEach((dateStr) => {
      if (typeof dateStr === "string") activeDates.add(dateStr.split("T")[0]);
    });

    // Source 4: score_history — any day score moved is an active day
    (userData?.score_history || []).forEach((entry) => {
      if (entry?.date) activeDates.add(entry.date.split("T")[0]);
    });

    // Source 5: lastLoginDate from discotiveScore (always mark today if logged in)
    const lastLogin = userData?.discotiveScore?.lastLoginDate;
    if (lastLogin) activeDates.add(lastLogin.split("T")[0]);

    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (27 - i));
      const dateStr = d.toISOString().split("T")[0];
      return { date: dateStr, active: activeDates.has(dateStr) };
    });
  }, [userData]);

  /**
   * @description
   * Gantt timeline data derived from execution map nodes.
   * Shows the 10 nearest-deadline nodes as horizontal bars spanning
   * from today to their deadline within a rolling 90-day viewport.
   * Nodes without deadlines are excluded. Completed nodes are dimmed.
   */
  const ganttData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const windowDays = 90;
    const windowEnd = new Date(today.getTime() + windowDays * 86400000);

    const execNodes = executionNodes
      .filter((n) => n.type === "executionNode" && n.data?.deadline)
      .map((n) => {
        const deadlineDate = new Date(n.data.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        const startDate = today; // Each bar starts from today
        const totalMs = deadlineDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(totalMs / 86400000);
        return {
          id: n.id,
          title: n.data.title || "Untitled",
          nodeType: n.data.nodeType || "branch",
          isCompleted: n.data.isCompleted || false,
          deadline: n.data.deadline,
          deadlineDate,
          daysLeft,
          accentColor: n.data.accentColor || "amber",
          progress: n.data.tasks?.length
            ? Math.round(
                (n.data.tasks.filter((t) => t.completed).length /
                  n.data.tasks.length) *
                  100,
              )
            : n.data.isCompleted
              ? 100
              : 0,
        };
      })
      .filter((n) => n.deadlineDate <= windowEnd)
      .sort((a, b) => a.deadlineDate - b.deadlineDate)
      .slice(0, 10);

    return { nodes: execNodes, windowDays };
  }, [executionNodes]);

  // ============================================================================
  // ACTIONS
  // ============================================================================
  const handleCommitJournal = async () => {
    if (!journalEntry.trim() || !userData?.uid) return;
    setIsCommitting(true);
    try {
      const todayIso = new Date().toISOString();
      await updateDoc(doc(db, "users", userData.uid), {
        journal_ledger: arrayUnion({
          date: todayIso,
          content: journalEntry.trim(),
        }),
      });
      setJournalEntry("");
    } catch (error) {
      console.error("Journal Commit Failed:", error);
    } finally {
      setIsCommitting(false);
    }
  };

  // ============================================================================
  // RENDER PIPELINE
  // ============================================================================
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <Activity className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Determine widget avatar
  const rankKey =
    lbRank === 1
      ? "rank1"
      : lbRank === 2
        ? "rank2"
        : lbRank === 3
          ? "rank3"
          : "observer";
  const avatarGif = getAvatar(rankKey, userData?.identity?.gender);

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] font-sans selection:bg-amber-500/30 overflow-x-hidden pb-24">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto p-4 md:p-8 relative z-10">
        {/* ==================== HEADER ==================== */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1.5 rounded-full bg-[#111] border border-[#333] text-[9px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <Clock className="w-3 h-3" /> Profile Verified
              </div>
              {userData?.tier === "PRO" && (
                <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Crown className="w-3 h-3" /> God Mode
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
              Hello, <span className="text-white/50">{operatorName}</span>.
            </h1>
          </motion.div>
        </header>

        {/* ==================== BENTO GRID MATRIX ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          {/* 1. MASTER SCORE & REAL-TIME LOG (Span 8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 md:col-span-8 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[250px]"
          >
            <div className="flex justify-between items-start relative z-10 w-full">
              <div>
                <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-amber-500" /> Real-Time
                  Telemetry
                </h2>
                <div className="flex items-end gap-4 mb-4">
                  <span className="text-6xl md:text-8xl font-black text-white font-mono tracking-tighter leading-none">
                    {currentScore}
                  </span>
                </div>

                {/* Real-time Reason Log */}
                <div className="inline-flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-2.5 backdrop-blur-md">
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-md",
                      lastAmount >= 0
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400",
                    )}
                  >
                    {lastAmount >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      Last Shift
                    </span>
                    <span className="text-xs font-semibold text-white/80">
                      {lastReason}{" "}
                      <span
                        className={cn(
                          "font-mono font-bold",
                          lastAmount >= 0 ? "text-green-400" : "text-red-400",
                        )}
                      >
                        ({lastAmount > 0 ? `+${lastAmount}` : lastAmount})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Data Sparkline with MAANG Empty State */}
            <div className="absolute bottom-0 left-0 right-0 h-44 pointer-events-none">
              {sparklineData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sparklineData}
                    margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id={SPARKLINE_GRADIENT_ID}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" hide />
                    <YAxis domain={["auto", "auto"]} hide />
                    <RechartsTooltip
                      contentStyle={{
                        background: "#0a0a0c",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                      itemStyle={{ color: "#f59e0b" }}
                      labelStyle={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 9,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                      formatter={(value) => [value, "Score"]}
                      cursor={{
                        stroke: "rgba(245,158,11,0.3)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      wrapperStyle={{ pointerEvents: "all", zIndex: 100 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fill={`url(#${SPARKLINE_GRADIENT_ID})`}
                      isAnimationActive
                      animationDuration={800}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#f59e0b",
                        stroke: "#0a0a0c",
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-end justify-center pb-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent">
                  <span className="text-[10px] font-bold text-amber-500/40 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3 animate-pulse" /> Baseline
                    Telemetry Establishing
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          {/* 2. DYNAMIC LEADERBOARD WIDGET (Span 4, Vertical) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="col-span-1 md:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 shadow-2xl flex flex-col relative overflow-hidden"
          >
            {/* Widget Header Controls */}
            <div className="flex justify-between items-center mb-6 relative z-10">
              <div className="flex items-center gap-2 bg-[#111] border border-[#222] rounded-lg p-1">
                <button
                  onClick={() =>
                    setLbFilterIndex((i) =>
                      i === 0 ? LB_FILTERS.length - 1 : i - 1,
                    )
                  }
                  className="p-1 hover:bg-[#222] rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest w-24 text-center">
                  {LB_FILTERS[lbFilterIndex].label}
                </span>
                <button
                  onClick={() =>
                    setLbFilterIndex((i) =>
                      i === LB_FILTERS.length - 1 ? 0 : i + 1,
                    )
                  }
                  className="p-1 hover:bg-[#222] rounded text-white/50 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={fetchWidgetRank}
                className={cn(
                  "p-1.5 rounded-md border border-[#333] bg-[#111] text-white/50 hover:text-white transition-all",
                  isLbRefreshing && "animate-spin text-amber-500",
                )}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            {/* Avatar & Rank Display */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 pb-4">
              <div className="w-24 h-24 mb-4 relative flex items-end justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {lbRank === 1 && (
                  <Crown className="absolute -top-4 text-amber-500 w-6 h-6 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] z-20" />
                )}
                <img
                  src={avatarGif}
                  alt="Rank Avatar"
                  className={cn(
                    "w-full h-full object-contain pointer-events-none",
                    rankKey === "observer" &&
                      "grayscale brightness-75 opacity-70",
                  )}
                />
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-5xl font-black font-mono tracking-tighter transition-all duration-300",
                    rankKey === "rank1"
                      ? "text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : lbRank === "N/A" || lbRank === "—"
                        ? "text-white/30"
                        : "text-white",
                  )}
                >
                  {isLbRefreshing ? (
                    <span className="inline-flex items-center gap-1 text-2xl text-white/30">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    </span>
                  ) : lbRank === "N/A" || lbRank === "—" ? (
                    <span className="text-2xl">N/A</span>
                  ) : (
                    `#${lbRank}`
                  )}
                </span>
                {delta !== 0 && lbRank !== "?" && lbRank !== "ERR" && (
                  <div
                    className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full border",
                      delta > 0
                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                        : "bg-red-500/10 border-red-500/30 text-red-400",
                    )}
                  >
                    {delta > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-2 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Live Standing
              </p>
            </div>

            {/* Glowing Base */}
            <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white/5 to-transparent pointer-events-none" />
          </motion.div>

          {/* 3. GLOBAL MATRIX PERCENTILES (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 md:col-span-4 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 shadow-2xl flex flex-col justify-between"
          >
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Network className="w-4 h-4 text-blue-400" /> Position Matrix
            </h2>

            {isCalculating ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "Global Pool",
                    val: percentiles.global,
                    color: "text-slate-400",
                    bg: "bg-slate-400",
                    shadow: "",
                  },
                  {
                    label: userData?.identity?.domain || "Domain",
                    val: percentiles.domain,
                    color: "text-amber-500",
                    bg: "bg-amber-500",
                    shadow: "shadow-[0_0_10px_rgba(245,158,11,0.5)]",
                  },
                  {
                    label: userData?.identity?.niche || "Niche",
                    val: percentiles.niche,
                    color: "text-emerald-500",
                    bg: "bg-emerald-500",
                    shadow: "shadow-[0_0_10px_rgba(16,185,129,0.5)]",
                  },
                  {
                    label: userData?.identity?.parallelGoal || "Parallel Goal",
                    val: percentiles.parallel,
                    color: "text-indigo-400",
                    bg: "bg-indigo-500",
                    shadow: "shadow-[0_0_10px_rgba(99,102,241,0.5)]",
                  },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-white/60 truncate mr-2">
                        {stat.label}
                      </span>
                      <span className={cn("font-mono shrink-0", stat.color)}>
                        Top {stat.val}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-[#111] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full", stat.bg, stat.shadow)}
                        style={{ width: `${100 - stat.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* 4. EXECUTION GANTT TIMELINE (Full Width / Span 12) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="col-span-1 md:col-span-12 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" /> Execution
                Timeline — 90D Horizon
              </h2>
              {isFetchingMap ? (
                <div className="flex items-center gap-1.5 text-[9px] font-bold text-white/30 uppercase tracking-widest">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
                </div>
              ) : (
                <span className="text-[9px] font-bold text-white/25 uppercase tracking-widest">
                  {ganttData.nodes.length} active protocol
                  {ganttData.nodes.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {isFetchingMap ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-6 h-6 text-white/20 animate-spin" />
              </div>
            ) : ganttData.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <Target className="w-7 h-7 text-white/10 mb-3" />
                <p className="text-sm font-bold text-white/25">
                  No active protocols with deadlines
                </p>
                <p className="text-[9px] text-white/15 uppercase tracking-widest mt-1 font-bold">
                  Deploy nodes with deadlines on your execution map
                </p>
              </div>
            ) : (
              <>
                {/* Timeline ruler */}
                <div className="flex items-center mb-3 pl-[160px] md:pl-[200px]">
                  {[0, 15, 30, 45, 60, 75, 90].map((day) => (
                    <div
                      key={day}
                      className="flex-1 text-[8px] font-mono font-bold text-white/20 border-l border-white/[0.04] pl-1"
                    >
                      {day === 0 ? "Today" : `+${day}d`}
                    </div>
                  ))}
                </div>

                {/* Gantt rows */}
                <div className="space-y-2.5">
                  {ganttData.nodes.map((node) => {
                    // Calculate bar width as % of 90-day window
                    const barPct = Math.min(
                      100,
                      Math.max(
                        2,
                        (Math.max(0, node.daysLeft) / ganttData.windowDays) *
                          100,
                      ),
                    );

                    const isOverdue = node.daysLeft < 0;
                    const isUrgent = node.daysLeft >= 0 && node.daysLeft <= 7;

                    const ACCENT_COLORS = {
                      amber: {
                        bar: "#f59e0b",
                        bg: "rgba(245,158,11,0.15)",
                        text: "#f59e0b",
                      },
                      emerald: {
                        bar: "#10b981",
                        bg: "rgba(16,185,129,0.15)",
                        text: "#10b981",
                      },
                      violet: {
                        bar: "#8b5cf6",
                        bg: "rgba(139,92,246,0.15)",
                        text: "#8b5cf6",
                      },
                      cyan: {
                        bar: "#06b6d4",
                        bg: "rgba(6,182,212,0.15)",
                        text: "#06b6d4",
                      },
                      rose: {
                        bar: "#f43f5e",
                        bg: "rgba(244,63,94,0.15)",
                        text: "#f43f5e",
                      },
                      orange: {
                        bar: "#f97316",
                        bg: "rgba(249,115,22,0.15)",
                        text: "#f97316",
                      },
                      sky: {
                        bar: "#38bdf8",
                        bg: "rgba(56,189,248,0.15)",
                        text: "#38bdf8",
                      },
                      white: {
                        bar: "#ffffff",
                        bg: "rgba(255,255,255,0.08)",
                        text: "#ffffff",
                      },
                    };

                    const accent = node.isCompleted
                      ? {
                          bar: "#10b981",
                          bg: "rgba(16,185,129,0.1)",
                          text: "#10b981",
                        }
                      : isOverdue
                        ? {
                            bar: "#ef4444",
                            bg: "rgba(239,68,68,0.15)",
                            text: "#ef4444",
                          }
                        : isUrgent
                          ? {
                              bar: "#f97316",
                              bg: "rgba(249,115,22,0.15)",
                              text: "#f97316",
                            }
                          : ACCENT_COLORS[node.accentColor] ||
                            ACCENT_COLORS.amber;

                    return (
                      <div
                        key={node.id}
                        onClick={() => navigate("/roadmap")}
                        className="flex items-center gap-3 group cursor-pointer"
                      >
                        {/* Node label */}
                        <div className="w-[160px] md:w-[200px] shrink-0 flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: accent.bar }}
                          />
                          <div className="min-w-0">
                            <p
                              className="text-[11px] font-bold truncate leading-tight"
                              style={{
                                color: node.isCompleted
                                  ? "rgba(255,255,255,0.3)"
                                  : "rgba(255,255,255,0.7)",
                                textDecoration: node.isCompleted
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {node.title}
                            </p>
                            <p className="text-[8px] font-bold uppercase tracking-widest text-white/20 truncate">
                              {isOverdue
                                ? `${Math.abs(node.daysLeft)}d overdue`
                                : node.isCompleted
                                  ? "completed"
                                  : `${node.daysLeft}d left`}
                            </p>
                          </div>
                        </div>

                        {/* Gantt bar track */}
                        <div className="flex-1 h-7 bg-white/[0.03] border border-white/[0.04] rounded-full overflow-hidden relative">
                          {/* Progress fill behind the deadline bar */}
                          {node.progress > 0 && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-full opacity-20"
                              style={{
                                width: `${barPct}%`,
                                background: accent.bar,
                              }}
                            />
                          )}
                          {/* Main deadline bar */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barPct}%` }}
                            transition={{
                              duration: 0.8,
                              ease: "easeOut",
                              delay: 0.1,
                            }}
                            className="absolute inset-y-0 left-0 rounded-full flex items-center overflow-hidden"
                            style={{
                              background: `linear-gradient(90deg, ${accent.bar}30, ${accent.bar}60)`,
                              border: `1px solid ${accent.bar}40`,
                            }}
                          >
                            {/* Progress overlay */}
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${node.progress}%`,
                                background: `linear-gradient(90deg, ${accent.bar}60, ${accent.bar})`,
                                boxShadow: `0 0 8px ${accent.bar}50`,
                              }}
                            />
                            {/* Progress % text */}
                            {barPct > 18 && node.progress > 0 && (
                              <span
                                className="absolute right-2 text-[8px] font-black font-mono"
                                style={{ color: accent.text }}
                              >
                                {node.progress}%
                              </span>
                            )}
                          </motion.div>

                          {/* Today indicator */}
                          <div className="absolute inset-y-0 left-0 w-px bg-white/20" />
                        </div>

                        {/* Deadline badge */}
                        <div
                          className="shrink-0 text-[8px] font-black font-mono px-2 py-1 rounded-lg border"
                          style={{
                            color: accent.text,
                            borderColor: `${accent.bar}30`,
                            background: accent.bg,
                          }}
                        >
                          {new Date(node.deadline).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline legend */}
                <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/[0.04]">
                  {[
                    { color: "#10b981", label: "Completed" },
                    { color: "#f59e0b", label: "On Track" },
                    { color: "#f97316", label: "Urgent (≤7d)" },
                    { color: "#ef4444", label: "Overdue" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        {label}
                      </span>
                    </div>
                  ))}
                  <span className="ml-auto text-[8px] font-bold text-white/20 uppercase tracking-widest">
                    Bar width = time remaining · Fill = task completion
                  </span>
                </div>
              </>
            )}
          </motion.div>

          {/* 5. EXECUTION HEATMAP & STREAK (Span 8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="col-span-1 md:col-span-8 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 shadow-2xl flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" /> Consistency Engine
              </h2>
              <div className="text-right">
                <p className="text-3xl font-black text-white font-mono leading-none">
                  {streak}{" "}
                  <span className="text-sm text-white/40 font-sans">Days</span>
                </p>
              </div>
            </div>

            {/* 28-Day Grid (GitHub Style) */}
            <div className="flex gap-1.5 flex-wrap mb-6">
              {heatmapData.map((day, i) => (
                <div
                  key={i}
                  title={day.date}
                  className={cn(
                    "w-[calc(14.28%-6px)] md:w-[calc(7.14%-6px)] aspect-square rounded-[4px] border",
                    day.active
                      ? "bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                      : "bg-[#111] border-[#222]",
                  )}
                />
              ))}
            </div>

            {/* Streak Milestones */}
            <div className="flex gap-3">
              {[7, 14, 30].map((target) => (
                <div
                  key={target}
                  className={cn(
                    "flex-1 p-2 md:p-3 rounded-xl border flex items-center justify-center gap-2",
                    streak >= target
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "bg-[#111] border-[#222] text-[#444]",
                  )}
                >
                  <ShieldCheck className="w-4 h-4 hidden md:block" />
                  <div className="text-sm font-black font-mono">
                    {target}D{" "}
                    <span className="text-[9px] uppercase tracking-widest font-bold ml-1">
                      Lock
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 6. COMPACT VAULT & VIEWS (Span 4) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-1 md:col-span-4 flex flex-col md:flex-row gap-4 md:gap-6"
          >
            <div
              onClick={() => navigate("/vault")}
              className="flex-1 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 cursor-pointer hover:border-white/10 transition-colors shadow-2xl flex flex-col justify-center items-center text-center"
            >
              <Database className="w-6 h-6 text-emerald-500 mb-2" />
              <div className="text-3xl font-black text-white font-mono mb-1">
                {vaultCount}
              </div>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                Vault Assets
              </p>
            </div>
            <div
              onClick={() => navigate("/network")}
              className="flex-1 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-5 cursor-pointer hover:border-white/10 transition-colors shadow-2xl flex flex-col justify-center items-center text-center"
            >
              <Eye className="w-6 h-6 text-blue-500 mb-2" />
              <div className="text-3xl font-black text-white font-mono mb-1">
                {profileViews}
              </div>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                Profile Views
              </p>
            </div>
          </motion.div>

          {/* 7. MINIMAL ROADMAP & DAILY LEDGER (Span 8) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="col-span-1 md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
          >
            {/* Minimal Execution Plan (Sleek Horizontal UI) */}
            <div
              onClick={() => navigate("/roadmap")}
              className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 cursor-pointer shadow-2xl relative overflow-hidden group flex flex-col justify-center"
            >
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
                <Target className="w-4 h-4 text-indigo-400" /> Active Protocol
              </h2>

              {nodesCount === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-4 bg-[#111] border border-[#222] rounded-2xl relative z-10">
                  <Lock className="w-5 h-5 text-white/20 mb-2" />
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                    Awaiting Generation
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-1 w-full max-w-[80%] mx-auto mb-6">
                    <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] shrink-0" />
                    <div className="h-0.5 flex-1 bg-amber-500/50" />
                    <div className="w-4 h-4 rounded-full border-2 border-amber-500 shrink-0" />
                    <div className="h-0.5 flex-1 bg-[#333]" />
                    <div className="w-4 h-4 rounded-full bg-[#222] border border-[#444] shrink-0" />
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-white font-mono">
                      {nodesCount}
                    </div>
                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                      Active Nodes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Ledger (Tier Gated) */}
            <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] relative overflow-hidden shadow-2xl flex flex-col h-[220px]">
              <TierGate
                featureKey="canUseJournal"
                fallbackType="modal"
                upsellMessage="The Daily Execution Ledger requires Pro clearance. Secure your consistency streak."
              >
                <div className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <TerminalSquare className="w-3 h-3 text-white" /> Daily
                      Ledger
                    </h2>
                  </div>
                  <textarea
                    value={journalEntry}
                    onChange={(e) => setJournalEntry(e.target.value)}
                    placeholder="Document today's reality. Execute."
                    className="flex-1 w-full bg-transparent text-sm font-medium text-white/90 placeholder-white/20 focus:outline-none resize-none custom-scrollbar"
                  />
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    <p className="text-[9px] font-mono font-bold text-white/30">
                      {journalEntry.length} / 250
                    </p>
                    <button
                      onClick={handleCommitJournal}
                      disabled={isCommitting || journalEntry.length === 0}
                      className="px-4 py-1.5 bg-white text-black hover:bg-[#ccc] rounded-lg text-[10px] font-extrabold uppercase tracking-widest disabled:opacity-50 flex items-center gap-1.5 shadow-lg"
                    >
                      {isCommitting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        "Commit"
                      )}
                    </button>
                  </div>
                </div>
              </TierGate>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
