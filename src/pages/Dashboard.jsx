import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import {
  Flame,
  TrendingUp,
  Target,
  Users,
  FolderLock,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// MAIN COMMAND CENTER
// ============================================================================
const Dashboard = () => {
  const { userData, loading: userLoading } = useUserData();

  // --- Real Data States ---
  const [globalMetrics, setGlobalMetrics] = useState({
    totalUsers: 0,
    rank: 0,
    percentile: 100,
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [isEngineLoading, setIsEngineLoading] = useState(true);

  // --- 1. THE DAILY STREAK ENGINE ---
  useEffect(() => {
    const updateStreak = async () => {
      if (!userData?.id) return;

      const today = new Date().toISOString().split("T")[0];
      const lastLogin = userData?.telemetry?.lastLoginDate || "";
      let currentStreak = userData?.telemetry?.loginStreak || 0;

      // If already logged in today, do nothing.
      if (lastLogin === today) return;

      // Check if logged in yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastLogin === yesterdayStr) {
        currentStreak += 1; // Continued streak
      } else {
        currentStreak = 1; // Broken streak, reset
      }

      try {
        await updateDoc(doc(db, "users", userData.id), {
          "telemetry.lastLoginDate": today,
          "telemetry.loginStreak": currentStreak,
        });
      } catch (error) {
        console.error("Failed to sync streak telemetry:", error);
      }
    };

    if (userData && !userLoading) {
      updateStreak();
    }
  }, [userData, userLoading]);

  // --- 2. THE GLOBAL DATA ENGINE (Rank, Percentile, Assets) ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userData?.id) return;

      try {
        // A. Calculate Rank & Percentile
        const usersSnap = await getDocs(collection(db, "users"));
        let allScores = [];
        usersSnap.forEach((doc) => {
          allScores.push(doc.data().discotiveScore || 0);
        });

        // Sort descending
        allScores.sort((a, b) => b - a);
        const myScore = userData?.discotiveScore || 0;
        const myRank = allScores.findIndex((score) => score <= myScore) + 1;
        const totalUsers = allScores.length || 1;

        // Calculate Top % (Ceil to avoid "Top 0%")
        const myPercentile = Math.max(
          1,
          Math.ceil((myRank / totalUsers) * 100),
        );

        setGlobalMetrics({
          totalUsers,
          rank: myRank,
          percentile: myPercentile,
        });

        // B. Fetch Recent Vault Assets (Limit 3)
        const vaultRef = collection(db, "users", userData.id, "vault");
        const q = query(vaultRef, orderBy("createdAt", "desc"), limit(3));
        const vaultSnap = await getDocs(q);

        const assets = [];
        vaultSnap.forEach((doc) => {
          assets.push({ id: doc.id, ...doc.data() });
        });
        setRecentAssets(assets);
      } catch (error) {
        console.error("Dashboard Data Engine Failed:", error);
      } finally {
        setIsEngineLoading(false);
      }
    };

    if (userData && !userLoading) {
      fetchDashboardData();
    }
  }, [userData, userLoading]);

  // --- FORMATTING HELPERS ---
  const currentStreak = userData?.telemetry?.loginStreak || 1;
  const myScore = userData?.discotiveScore; // Can be undefined/0 initially

  // Date Formatting for Header
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const todayFormatted = new Date().toLocaleDateString("en-US", dateOptions);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#444] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#030303] min-h-screen w-full overflow-x-hidden text-white selection:bg-white selection:text-black pb-24 md:pb-12">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto px-4 md:px-10 pt-8 md:pt-12 relative z-10 space-y-8 md:space-y-10">
        {/* ========================================================= */}
        {/* HEADER SECTION (Minimal & Professional)                     */}
        {/* ========================================================= */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#222]">
          <div>
            <div className="flex items-center gap-2 text-[#888] mb-2 md:mb-3">
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm font-medium">
                {todayFormatted}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, {userData?.identity?.firstName || "Operator"}.
            </h1>
            <p className="text-[#666] text-sm md:text-base mt-1 md:mt-2 font-medium">
              Your command center is synced and ready for execution.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* The Streak Badge */}
            <div className="flex items-center gap-3 bg-[#0a0a0a] border border-[#222] px-4 md:px-5 py-2.5 md:py-3 rounded-2xl shadow-sm">
              <div
                className={cn(
                  "p-2 rounded-xl",
                  currentStreak > 3
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-[#111] text-[#888]",
                )}
              >
                <Flame className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-widest">
                  Active Streak
                </p>
                <p className="text-sm md:text-base font-extrabold">
                  {currentStreak} {currentStreak === 1 ? "Day" : "Days"}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* KEY METRICS GRID (Data Dense, No Gimmicks)                  */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* 1. DISCOTIVE SCORE & RANK */}
          <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 hover:border-[#444] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                  Discotive Score
                </span>
                <span className="text-2xl md:text-3xl font-extrabold text-white">
                  {myScore === undefined || myScore === 0 ? "--" : myScore}
                </span>
              </div>
            </div>
            <div>
              {isEngineLoading ? (
                <Skeleton className="h-4 w-3/4 bg-[#222]" />
              ) : myScore > 0 ? (
                <p className="text-sm text-[#888] font-medium leading-relaxed">
                  You are currently in the{" "}
                  <strong className="text-white">
                    Top {globalMetrics.percentile}%
                  </strong>{" "}
                  of the global arena (Rank #{globalMetrics.rank}).
                </p>
              ) : (
                <p className="text-sm text-[#888] font-medium leading-relaxed">
                  Start verifying assets or logging executions to establish your
                  baseline score.
                </p>
              )}
            </div>
          </div>

          {/* 2. NETWORK ALLIANCE */}
          <Link
            to="/app/network"
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 hover:border-[#444] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                  Active Allies
                </span>
                <span className="text-2xl md:text-3xl font-extrabold text-white">
                  {userData?.allies?.length || 0}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <p className="text-sm text-[#888] font-medium">
                {userData?.inboundRequests?.length > 0 ? (
                  <span className="text-white font-bold">
                    {userData.inboundRequests.length} Pending Requests
                  </span>
                ) : (
                  "Expand your professional network."
                )}
              </p>
              <ArrowRight className="w-4 h-4 text-[#444] group-hover:text-white transition-colors" />
            </div>
          </Link>

          {/* 3. ASSET VAULT */}
          <Link
            to="/app/vault"
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 hover:border-[#444] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-green-500/5 rounded-xl border border-green-500/10">
                <FolderLock className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                  Verified Assets
                </span>
                <span className="text-2xl md:text-3xl font-extrabold text-white">
                  {isEngineLoading
                    ? "--"
                    : recentAssets.filter((a) => a.status === "Verified")
                        .length}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <p className="text-sm text-[#888] font-medium">
                Cryptographic proof of your execution.
              </p>
              <ArrowRight className="w-4 h-4 text-[#444] group-hover:text-white transition-colors" />
            </div>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* SECONDARY GRID: ROADMAP & LEDGER                          */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* --- ACTIVE ROADMAP SNAPSHOT --- */}
          <div className="xl:col-span-2 bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col justify-between group hover:border-[#444] transition-all duration-300">
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#888]" /> Active
                  Trajectory
                </p>
              </div>
              <h3 className="text-xl md:text-3xl font-extrabold text-white mb-3 md:mb-4 tracking-tight">
                {userData?.vision?.goal3Months ||
                  "Establish your baseline protocol."}
              </h3>
              <p className="text-[#888] text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                {userData?.vision?.goal3Months
                  ? "Execute your daily tasks in the Roadmap to inch closer to this milestone. Every verified action permanently increases your Discotive Score."
                  : "Head to your Roadmap to define your 90-day goal, map your capabilities, and start logging daily executions."}
              </p>
            </div>

            <div className="mt-8 pt-6 md:pt-8 border-t border-[#222]">
              <Link
                to="/app/roadmap"
                className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white text-black text-xs md:text-sm font-extrabold rounded-full hover:bg-[#ccc] transition-colors"
              >
                Access Roadmap <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* --- RECENT VAULT ACTIVITY --- */}
          <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col group hover:border-[#444] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#888]" /> Recent Syncs
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2">
              {isEngineLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-14 bg-[#111] rounded-xl animate-pulse"
                  />
                ))
              ) : recentAssets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                  <FolderLock className="w-8 h-8 text-[#333] mb-3" />
                  <p className="text-xs text-[#666] font-medium">
                    No assets synced yet.
                  </p>
                </div>
              ) : (
                recentAssets.map((asset) => (
                  <Link
                    to="/app/vault"
                    key={asset.id}
                    className="flex items-center justify-between group/item p-3 -mx-3 rounded-xl hover:bg-[#111] transition-colors"
                  >
                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                      <div
                        className={cn(
                          "p-2 rounded-xl shrink-0 transition-colors",
                          asset.status === "Verified"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                        )}
                      >
                        {asset.status === "Verified" ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-xs md:text-sm font-bold text-[#ccc] group-hover/item:text-white truncate transition-colors">
                          {asset.title}
                        </p>
                        <p className="text-[9px] md:text-[10px] text-[#666] font-mono mt-0.5 uppercase tracking-wider">
                          {asset.category}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#444] group-hover/item:text-white shrink-0 transition-colors ml-2" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
