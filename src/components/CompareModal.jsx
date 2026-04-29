/**
 * @fileoverview Discotive OS - Reusable Comparison Engine (Apple-Minimalist)
 * @module Components/CompareModal
 * @description
 * High-fidelity, side-by-side comparison matrix.
 * Features strict daily rate-limiting enforced via Firebase document updates.
 * Designed for cross-page compatibility (Leaderboard, Network, Public Profile).
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import {
  X,
  Activity,
  ShieldCheck,
  Database,
  Network,
  Zap,
  Target,
  Lock,
  Crown,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { checkAccess, TIERS } from "../lib/TierEngine";
import { cn } from "../lib/cn";

// ============================================================================
// SYSTEM LIMITS
// ============================================================================
const LIMITS = {
  [TIERS.ESSENTIAL]: 1,
  [TIERS.PRO]: 3,
};

// ============================================================================
// COMPONENT
// ============================================================================
const CompareModal = ({ isOpen, onClose, currentUser, targetUser }) => {
  const [usageData, setUsageData] = useState({ count: 0, date: null });
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- RATE LIMITING ENGINE ---
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    const verifyRateLimit = async () => {
      setIsVerifying(true);
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const today = new Date().toISOString().split("T")[0];
          const currentLimit = LIMITS[data.tier || TIERS.ESSENTIAL];

          let currentUsage = data.dailyComparisons || { count: 0, date: today };

          // Reset if it's a new day
          if (currentUsage.date !== today) {
            currentUsage = { count: 0, date: today };
          }

          setUsageData({ ...currentUsage, limit: currentLimit });

          if (currentUsage.count < currentLimit) {
            setHasAccess(true);
            // Log the usage atomically
            await updateDoc(userRef, {
              dailyComparisons: { count: currentUsage.count + 1, date: today },
            });
          } else {
            setHasAccess(false);
          }
        }
      } catch (error) {
        console.error("Rate limit verification failed:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyRateLimit();
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // --- DATA FORMATTING ---
  const myScore = currentUser?.discotiveScore?.current || 0;
  const theirScore = targetUser?.discotiveScore?.current || 0;

  // Synthetic Data Generation based on Score (Since we don't have deeply tracked sub-metrics yet)
  const radarData = [
    {
      metric: "Execution",
      You: Math.min(100, (myScore / 500) * 100),
      Opponent: Math.min(100, (theirScore / 500) * 100),
    },
    {
      metric: "Vault Assets",
      You: Math.min(100, ((currentUser?.vault?.length || 0) / 10) * 100),
      Opponent: Math.min(100, ((targetUser?.vault?.length || 0) / 10) * 100),
    },
    {
      metric: "Network",
      You: Math.min(100, ((currentUser?.allies?.length || 0) / 20) * 100),
      Opponent: Math.min(100, ((targetUser?.allies?.length || 0) / 20) * 100),
    },
    {
      metric: "Consistency",
      You: currentUser?.discotiveScore?.last24h < myScore ? 85 : 40,
      Opponent: targetUser?.discotiveScore?.last24h < theirScore ? 85 : 40,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl bg-[#0a0a0c] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* HEADER */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#050505]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Competitor Analysis
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                  Target: @{targetUser?.identity?.username || "Operator"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Limit Indicator */}
              {!isVerifying && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <Activity className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    {usageData.count + (hasAccess ? 1 : 0)} / {usageData.limit}
                    Daily Uses
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {isVerifying ? (
              <div className="h-64 flex flex-col items-center justify-center gap-4">
                <Activity className="w-6 h-6 text-slate-400 dark:text-slate-500 animate-spin" />
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                  Authenticating Clearance...
                </p>
              </div>
            ) : !hasAccess ? (
              <div className="h-64 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Daily Limit Exhausted
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  You have utilized your {usageData.limit} comparison(s) for
                  today. Upgrade to Discotive Pro to unlock deeper competitive
                  intelligence.
                </p>
                {usageData.limit < LIMITS[TIERS.PRO] && (
                  <button className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-full hover:scale-105 transition-transform">
                    Upgrade to Pro
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* RADAR CHART (Sleek Apple Style) */}
                <div className="bg-[#050505] rounded-3xl p-6 border border-slate-100 dark:border-white/5 flex flex-col">
                  <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-6 text-center">
                    Execution Vector Mapping
                  </h4>
                  <div className="flex-1 min-h-[250px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="65%"
                        data={radarData}
                      >
                        <PolarGrid
                          stroke="#e2e8f0"
                          className="dark:stroke-[#222]"
                        />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{
                            fill: "#64748b",
                            fontSize: 10,
                            fontWeight: 500,
                          }}
                          className="dark:fill-[#888]"
                        />
                        <Radar
                          name="You"
                          dataKey="You"
                          stroke="#0f172a"
                          fill="#0f172a"
                          fillOpacity={0.1}
                          className="dark:stroke-white dark:fill-white"
                        />
                        <Radar
                          name="Opponent"
                          dataKey="Opponent"
                          stroke="#94a3b8"
                          fill="#94a3b8"
                          fillOpacity={0.1}
                          strokeDasharray="4 4"
                          className="dark:stroke-[#555] dark:fill-[#555]"
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        You
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full border-2 border-slate-400 dark:border-[#555] border-dashed" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Opponent
                      </span>
                    </div>
                  </div>
                </div>

                {/* SIDE-BY-SIDE STATS */}
                <div className="flex flex-col justify-center gap-4">
                  <StatRow
                    icon={Zap}
                    label="Discotive Score"
                    val1={myScore}
                    val2={theirScore}
                  />
                  <StatRow
                    icon={Database}
                    label="Vault Assets"
                    val1={currentUser?.vault?.length || 0}
                    val2={targetUser?.vault?.length || 0}
                  />
                  <StatRow
                    icon={Network}
                    label="Execution Nodes"
                    val1={currentUser?.execution_map?.nodes?.length || 0}
                    val2={targetUser?.execution_map?.nodes?.length || 0}
                  />
                  <StatRow
                    icon={ShieldCheck}
                    label="Clearance Tier"
                    val1={currentUser?.tier || "ESSENTIAL"}
                    val2={targetUser?.tier || "ESSENTIAL"}
                    isString
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// --- HELPER COMPONENTS ---
const StatRow = ({ icon: Icon, label, val1, val2, isString }) => {
  const isWinning = !isString && Number(val1) >= Number(val2);

  return (
    <div className="bg-[#050505] rounded-2xl p-4 border border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <p className="text-[10px] text-slate-400 mb-1">You</p>
          <p
            className={cn(
              "text-xl font-bold tracking-tight",
              isString
                ? "text-white text-sm"
                : isWinning
                  ? "text-white"
                  : "text-slate-400 dark:text-slate-600",
            )}
          >
            {val1}
          </p>
        </div>
        <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-4" />
        <div className="flex-1 text-center">
          <p className="text-[10px] text-slate-400 mb-1">Target</p>
          <p
            className={cn(
              "text-xl font-bold tracking-tight",
              isString
                ? "text-white text-sm"
                : !isWinning
                  ? "text-white"
                  : "text-slate-400 dark:text-slate-600",
            )}
          >
            {val2}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompareModal;
