/**
 * @fileoverview Discotive OS — Admin Command Center
 * @module Admin/Dashboard
 * @description
 * Platform analytics hub for Discotive administrators.
 * All Firestore reads use getCountFromServer (for aggregates) or getDocs with
 * explicit limits to stay well within the free tier budget.
 * No onSnapshot listeners. Data is fetched once on mount with a manual refresh option.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import {
  Users,
  Crown,
  Zap,
  Database,
  ShieldCheck,
  ShieldAlert,
  Activity,
  MessageSquare,
  Ticket,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  UserPlus,
  ChevronRight,
  Award,
  FileText,
  Link as LinkIcon,
  Code2,
  Briefcase,
  BookOpen,
  TrendingUp,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "../../components/ui/BentoCard";

// ============================================================================
// HELPERS
// ============================================================================

const getAssetCategoryIcon = (cat) => {
  const map = {
    Certificate: <Award className="w-3.5 h-3.5" />,
    Resume: <FileText className="w-3.5 h-3.5" />,
    Project: <Code2 className="w-3.5 h-3.5" />,
    Publication: <BookOpen className="w-3.5 h-3.5" />,
    Employment: <Briefcase className="w-3.5 h-3.5" />,
    Link: <LinkIcon className="w-3.5 h-3.5" />,
  };
  return map[cat] || <Database className="w-3.5 h-3.5" />;
};

const timeAgo = (isoDate) => {
  if (!isoDate) return "—";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatCard = ({ label, value, icon: Icon, color, subtext, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="bg-[#0a0a0c] border border-white/[0.05] rounded-[1.5rem] p-6 flex flex-col justify-between min-h-[120px]"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
        {label}
      </span>
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center",
          `bg-current/10`,
        )}
      >
        <Icon className={cn("w-4 h-4", color)} />
      </div>
    </div>
    <div>
      <div
        className={cn("text-4xl font-black font-mono tracking-tight", color)}
      >
        {value}
      </div>
      {subtext && (
        <p className="text-[9px] text-white/25 mt-1 font-medium">{subtext}</p>
      )}
    </div>
  </motion.div>
);

const CustomPieTooltip = ({ active, payload, totalUsers }) => {
  if (active && payload && payload.length) {
    const d = payload[0];
    return (
      <div className="bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">
          {d.name}
        </p>
        <p
          className="text-2xl font-black font-mono"
          style={{ color: d.payload.color }}
        >
          {d.value}
        </p>
        <p className="text-[9px] text-white/30 mt-0.5">
          {totalUsers > 0
            ? `${((d.value / totalUsers) * 100).toFixed(1)}% of all operators`
            : "0% of all operators"}
        </p>
      </div>
    );
  }
  return null;
};

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Icon className="w-7 h-7 text-white/10 mb-3" />
    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
      {message}
    </p>
  </div>
);

// ============================================================================
// MAIN ADMIN DASHBOARD
// ============================================================================

const AdminDashboard = () => {
  const navigate = useNavigate();

  // — Data State —
  const [stats, setStats] = useState({
    total: 0,
    pro: 0,
    essential: 0,
    newThisWeek: 0,
  });
  const [pendingVault, setPendingVault] = useState([]);
  const [reportedVault, setReportedVault] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [reports, setReports] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  // — UI State —
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState(null);

  // ── DATA FETCHER ──────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setError(null);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoIso = weekAgo.toISOString();

      // ── 1. AGGREGATE STATS (getCountFromServer = minimal read cost) ──
      const [totalSnap, proSnap] = await Promise.all([
        getCountFromServer(query(collection(db, "users"))),
        getCountFromServer(
          query(collection(db, "users"), where("tier", "==", "PRO")),
        ),
      ]);

      let weeklyNewCount = 0;
      try {
        const weekSnap = await getCountFromServer(
          query(collection(db, "users"), where("createdAt", ">=", weekAgoIso)),
        );
        weeklyNewCount = weekSnap.data().count;
      } catch (_) {
        // createdAt index may not exist yet — fail gracefully
      }

      const total = totalSnap.data().count;
      const pro = proSnap.data().count;
      const essential = total - pro;

      setStats({ total, pro, essential, newThisWeek: weeklyNewCount });

      // ── 2. VAULT ASSETS (batch read 50 users, extract vault arrays) ──
      // Reading embedded arrays requires user doc fetches. Limit to 50 docs
      // for dashboard preview. Full list is on /admin/users/verifyvault.
      const vaultBatch = await getDocs(
        query(collection(db, "users"), limit(50)),
      );
      const pending = [];
      const reported = [];
      vaultBatch.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const vault = data.vault || [];
        vault.forEach((asset) => {
          const enriched = {
            ...asset,
            userId: userDoc.id,
            userName:
              `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
              "Unknown",
            userUsername: data.identity?.username || "unknown",
          };
          if (asset.status === "PENDING" || !asset.status)
            pending.push(enriched);
          if (asset.status === "REPORTED") reported.push(enriched);
        });
      });
      setPendingVault(pending);
      setReportedVault(reported);

      // ── 3. FEEDBACK (from feedback collection, limit 5) ──
      try {
        const fbSnap = await getDocs(
          query(
            collection(db, "feedback"),
            orderBy("createdAt", "desc"),
            limit(5),
          ),
        );
        setFeedback(fbSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setFeedback([]);
      }

      // ── 4. SUPPORT TICKETS ──
      try {
        const tkSnap = await getDocs(
          query(
            collection(db, "support_tickets"),
            orderBy("createdAt", "desc"),
            limit(5),
          ),
        );
        setTickets(tkSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setTickets([]);
      }

      // ── 5. USER REPORTS ──
      try {
        const rpSnap = await getDocs(
          query(
            collection(db, "reports"),
            orderBy("createdAt", "desc"),
            limit(5),
          ),
        );
        setReports(rpSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setReports([]);
      }

      // ── 6. RECENT USERS (for activity feed) ──
      try {
        const ruSnap = await getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(8),
          ),
        );
        setRecentUsers(ruSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        // fallback without ordering
        const ruSnap = await getDocs(query(collection(db, "users"), limit(8)));
        setRecentUsers(ruSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("[AdminDashboard] Fetch failed:", err);
      setError("Failed to load dashboard data. Check Firestore permissions.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchAllData();
      setLoading(false);
    };
    init();
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  // ── PIE DATA ──────────────────────────────────────────────────────────────
  const pieData = [
    { name: "Essential", value: stats.essential, color: "#2a2a2a" },
    { name: "Pro", value: stats.pro, color: "#f59e0b" },
  ];

  // ── SKELETON ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
                className="w-1 h-5 bg-amber-500 rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            Syncing platform telemetry...
          </p>
        </div>
      </div>
    );
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 font-sans selection:bg-amber-500/30">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10">
        {/* ── HEADER ── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="px-3 py-1.5 rounded-full bg-[#111] border border-amber-500/20 text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Sector Omega — Live
              </div>
              <div className="px-3 py-1.5 rounded-full bg-[#111] border border-[#222] text-[9px] font-bold text-white/30 uppercase tracking-widest">
                {auth.currentUser?.email}
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white">
              Admin Command Center
            </h1>
            <p className="text-white/30 text-sm mt-1 font-medium">
              {lastRefresh
                ? `Last synced ${timeAgo(lastRefresh.toISOString())}`
                : "Syncing..."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              User Dashboard
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-4 h-4", refreshing && "animate-spin")}
              />
              {refreshing ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </motion.header>

        {/* ── ERROR BANNER ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl flex items-center gap-3"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-400">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Operators"
            value={stats.total}
            icon={Users}
            color="text-white"
            subtext="All registered users"
            delay={0.05}
          />
          <StatCard
            label="Pro Tier"
            value={stats.pro}
            icon={Crown}
            color="text-amber-500"
            subtext={`${stats.total > 0 ? ((stats.pro / stats.total) * 100).toFixed(1) : 0}% of all users`}
            delay={0.1}
          />
          <StatCard
            label="Essential Tier"
            value={stats.essential}
            icon={Zap}
            color="text-sky-400"
            subtext={`${stats.total > 0 ? ((stats.essential / stats.total) * 100).toFixed(1) : 0}% of all users`}
            delay={0.15}
          />
          <StatCard
            label="New This Week"
            value={stats.newThisWeek}
            icon={UserPlus}
            color="text-emerald-400"
            subtext="User growth (7 days)"
            delay={0.2}
          />
        </div>

        {/* ── MAIN GRID: PIE CHART + ACTIVITY FEED ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
          {/* PIE CHART — col-span 5 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="col-span-1 md:col-span-5 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Users className="w-4 h-4 text-amber-500" /> User Distribution
            </h2>

            {stats.total === 0 ? (
              <EmptyState icon={Users} message="No users registered yet" />
            ) : (
              <>
                <div className="relative flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={115}
                        dataKey="value"
                        strokeWidth={0}
                        paddingAngle={3}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomPieTooltip totalUsers={stats.total} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Total */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-5xl font-black text-white font-mono leading-none">
                        {stats.total}
                      </div>
                      <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1.5">
                        Total Operators
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <div>
                      <p className="text-xs font-black text-white">
                        {stats.pro}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        Pro
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
                    <div>
                      <p className="text-xs font-black text-white">
                        {stats.essential}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        Essential
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <div>
                      <p className="text-xs font-black text-emerald-400">
                        +{stats.newThisWeek}
                      </p>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">
                        This Week
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* RECENT SIGNUPS FEED — col-span 7 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="col-span-1 md:col-span-7 bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-sky-400" /> Recent Operator
              Registrations
            </h2>

            {recentUsers.length === 0 ? (
              <EmptyState icon={Users} message="No recent signups" />
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {recentUsers.map((user, i) => {
                  const name =
                    `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                    user.identity?.username ||
                    "Unknown";
                  const username =
                    user.identity?.username || user.id.slice(0, 8);
                  const tier = user.tier || "ESSENTIAL";
                  const domain =
                    user.identity?.domain ||
                    user.vision?.passion ||
                    "Uncategorized";

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#111] border border-white/[0.06] flex items-center justify-center text-sm font-black text-white/60 shrink-0">
                        {name.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white truncate">
                            {name}
                          </p>
                          {tier === "PRO" && (
                            <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <p className="text-[10px] text-white/30 font-mono truncate">
                          @{username} · {domain}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                          {timeAgo(user.createdAt)}
                        </p>
                        <p
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest mt-0.5",
                            tier === "PRO" ? "text-amber-500" : "text-white/20",
                          )}
                        >
                          {tier}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── VAULT VERIFICATION WIDGET (Full Width, Horizontal) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 mb-4"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" /> Vault Operations
              Center
            </h2>
            <Link
              to="/app/admin/users/verifyvault"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/15 transition-all"
            >
              Open Full Vault Manager
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PENDING VERIFICATIONS */}
            <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-black text-white">
                    Pending Verification
                  </span>
                </div>
                <span className="text-3xl font-black text-amber-500 font-mono">
                  {pendingVault.length}
                  {pendingVault.length >= 50 && (
                    <span className="text-[10px] text-amber-500/50 ml-1">
                      +
                    </span>
                  )}
                </span>
              </div>

              {pendingVault.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  message="All assets verified — queue clear"
                />
              ) : (
                <div className="space-y-2">
                  {pendingVault.slice(0, 4).map((asset, i) => (
                    <div
                      key={`${asset.userId}-${asset.id}`}
                      className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                        {getAssetCategoryIcon(asset.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">
                          {asset.title || "Untitled Asset"}
                        </p>
                        <p className="text-[9px] text-white/30 font-mono truncate">
                          @{asset.userUsername} · {asset.category || "Unknown"}
                        </p>
                      </div>
                      <p className="text-[9px] text-white/20 shrink-0">
                        {timeAgo(asset.uploadedAt)}
                      </p>
                    </div>
                  ))}
                  {pendingVault.length > 4 && (
                    <Link
                      to="/app/admin/users/verifyvault"
                      className="block text-center text-[9px] font-black text-amber-500/60 hover:text-amber-500 transition-colors pt-1 uppercase tracking-widest"
                    >
                      +{pendingVault.length - 4} more pending →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* REPORTED ASSETS */}
            <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-black text-white">
                    Reported Assets
                  </span>
                </div>
                <span className="text-3xl font-black text-red-400 font-mono">
                  {reportedVault.length}
                  {reportedVault.length >= 50 && (
                    <span className="text-[10px] text-red-400/50 ml-1">+</span>
                  )}
                </span>
              </div>

              {reportedVault.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  message="No reported assets — platform clean"
                />
              ) : (
                <div className="space-y-2">
                  {reportedVault.slice(0, 4).map((asset, i) => (
                    <div
                      key={`${asset.userId}-${asset.id}`}
                      className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] border border-red-500/10 rounded-xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                        {getAssetCategoryIcon(asset.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">
                          {asset.title || "Untitled Asset"}
                        </p>
                        <p className="text-[9px] text-white/30 font-mono truncate">
                          @{asset.userUsername} · {asset.category || "Unknown"}
                        </p>
                      </div>
                      <div className="shrink-0 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-400 uppercase">
                        Reported
                      </div>
                    </div>
                  ))}
                  {reportedVault.length > 4 && (
                    <Link
                      to="/app/admin/users/verifyvault?filter=REPORTED"
                      className="block text-center text-[9px] font-black text-red-400/60 hover:text-red-400 transition-colors pt-1 uppercase tracking-widest"
                    >
                      +{reportedVault.length - 4} more reported →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── BOTTOM ROW: FEEDBACK, TICKETS, REPORTS ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FEEDBACK */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" /> Recent
                Feedback
              </h2>
              <span className="text-[9px] font-bold text-white/20 uppercase">
                {feedback.length} entries
              </span>
            </div>

            {feedback.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                message="No feedback submitted yet"
              />
            ) : (
              <div className="space-y-2 flex-1">
                {feedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl"
                  >
                    <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                      {fb.message || "No message"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                        {fb.category || "General"}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {timeAgo(fb.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* SUPPORT TICKETS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Ticket className="w-4 h-4 text-sky-400" /> Support Tickets
              </h2>
              <span className="text-[9px] font-bold text-white/20 uppercase">
                {tickets.length} open
              </span>
            </div>

            {tickets.length === 0 ? (
              <EmptyState icon={Ticket} message="No open support tickets" />
            ) : (
              <div className="space-y-2 flex-1">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl"
                  >
                    <p className="text-[11px] font-bold text-white truncate">
                      {ticket.subject || "No subject"}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
                      {ticket.message || "No message"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                          ticket.status === "open"
                            ? "bg-sky-500/10 text-sky-400"
                            : "bg-white/5 text-white/30",
                        )}
                      >
                        {ticket.status || "open"}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {timeAgo(ticket.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* USER REPORTS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> User
                Reports
              </h2>
              <span className="text-[9px] font-bold text-white/20 uppercase">
                {reports.length} reports
              </span>
            </div>

            {reports.length === 0 ? (
              <EmptyState icon={Shield} message="No user reports on file" />
            ) : (
              <div className="space-y-2 flex-1">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl"
                  >
                    <p className="text-[11px] font-bold text-white truncate">
                      {report.reason || "No reason specified"}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">
                      {report.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[8px] font-bold text-orange-400/60 uppercase tracking-widest">
                        {report.targetType || "user"}
                      </span>
                      <span className="text-[8px] text-white/20">
                        {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
