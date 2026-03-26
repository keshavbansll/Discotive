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
} from "recharts";
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
  const nodesCount = userData?.execution_map?.nodes?.length || 0;
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
  const fetchWidgetRank = async () => {
    if (!userData?.discotiveScore) return;
    setIsLbRefreshing(true);
    try {
      const filter = LB_FILTERS[lbFilterIndex];
      let constraints = [where("discotiveScore.current", ">", currentScore)];

      if (filter.dbField) {
        // Look for the data in either the identity object OR the root object
        const userValue =
          userData?.identity?.[filter.key] || userData?.[filter.key];

        if (userValue) {
          // Tell Firebase to query the exact path where the data was found
          const actualDbPath = userData?.identity?.[filter.key]
            ? `identity.${filter.key}`
            : filter.key;
          constraints.push(where(actualDbPath, "==", userValue));
        } else {
          setLbRank("N/A"); // Triggers if you legitimately haven't set a domain/niche
          setIsLbRefreshing(false);
          return;
        }
      }

      const q = query(collection(db, "users"), ...constraints);
      const snap = await getCountFromServer(q);
      setLbRank(snap.data().count + 1);
    } catch (error) {
      console.error("Widget Rank Engine Failed:", error);
      setLbRank("ERR");
    } finally {
      setIsLbRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWidgetRank();
  }, [lbFilterIndex, currentScore]);

  // ============================================================================
  // DATA PARSERS
  // ============================================================================
  const sparklineData = useMemo(() => {
    const history = userData?.score_history || [];
    return history
      .slice(-7)
      .map((entry) => ({ day: entry.date, score: entry.score }));
  }, [userData]);

  const heatmapData = useMemo(() => {
    const ledger = userData?.journal_ledger || [];
    const activeDates = new Set(
      ledger.map((entry) => entry.date?.split("T")[0]),
    );
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (27 - i));
      const dateStr = d.toISOString().split("T")[0];
      return { date: dateStr, active: activeDates.has(dateStr) };
    });
  }, [userData]);

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
                <Clock className="w-3 h-3" /> System Synchronized
              </div>
              {userData?.tier === "PRO" && (
                <div className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Crown className="w-3 h-3" /> God Mode
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
              Welcome, <span className="text-white/50">{operatorName}</span>.
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
            <div className="absolute bottom-0 left-0 right-0 h-40 opacity-80 pointer-events-none">
              {sparklineData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={sparklineData}
                    margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="scoreGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#f59e0b"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#f59e0b"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      fill="url(#scoreGradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-end justify-center pb-6 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent">
                  <span className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-3 h-3 animate-pulse" /> Establishing
                    Baseline Telemetry
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
                    "text-5xl font-black font-mono tracking-tighter",
                    rankKey === "rank1"
                      ? "text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                      : "text-white",
                  )}
                >
                  {isLbRefreshing ? "--" : `#${lbRank}`}
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

          {/* 4. EXECUTION HEATMAP & STREAK (Span 8) */}
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

          {/* 5. COMPACT VAULT & VIEWS (Span 4) */}
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

          {/* 6. MINIMAL ROADMAP & DAILY LEDGER (Span 8) */}
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
