/**
 * @fileoverview Discotive OS — Admin Command Center v3.0
 * @description Complete MAANG-grade rewrite. Sidebar nav, dark cinematic theme,
 * modular panels, full user management, score control, connector approvals.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, Outlet, useLocation } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
  deleteField,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { deleteUser } from "firebase/auth";
import {
  LayoutDashboard,
  Users,
  Crown,
  Zap,
  Database,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Ticket,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserPlus,
  Award,
  FileText,
  Code2,
  Briefcase,
  Link as LinkIcon,
  TrendingUp,
  Shield,
  Monitor,
  Video as VideoIcon,
  PlusCircle,
  X,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Pencil,
  Check,
  ChevronDown,
  ChevronRight,
  Settings,
  LogOut,
  Menu,
  BarChart3,
  MessageSquare,
  Flag,
  Star,
  Globe,
  Youtube,
  Github,
  Loader2,
  ArrowUpRight,
  Eye,
  Hash,
  Layers,
  Sliders,
  BookOpen,
  Flame,
  Target,
  DollarSign,
  Play,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  Bell,
  Sidebar,
  ChevronLeft,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ── Design tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dim: "rgba(191,162,100,0.08)",
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso?.toDate?.() || iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── NAV CONFIG ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ key: "overview", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Platform",
    items: [
      { key: "users", label: "User Management", icon: Users },
      { key: "vault", label: "Vault Verification", icon: Shield },
      { key: "connectors", label: "Connector Approvals", icon: LinkIcon },
      { key: "scoring", label: "Scoring Engine", icon: Zap },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "learn", label: "Learn Database", icon: BookOpen },
      { key: "colists", label: "Colists Curation", icon: Layers },
      { key: "opportunities", label: "Opportunities", icon: Target },
    ],
  },
  {
    label: "Moderation",
    items: [
      { key: "tickets", label: "Support Tickets", icon: Ticket },
      { key: "reports", label: "Reports", icon: Flag },
      { key: "feedback", label: "Feedback", icon: MessageSquare },
    ],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const AdminSidebar = memo(
  ({ activePanel, setActivePanel, collapsed, setCollapsed, stats }) => {
    const allItems = NAV_SECTIONS.flatMap((s) => s.items);
    const badgeMap = {
      vault: stats.pendingVault,
      tickets: stats.openTickets,
      reports: stats.pendingReports,
      connectors: stats.pendingConnectors,
    };

    return (
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="h-screen flex flex-col overflow-hidden shrink-0 border-r"
        style={{ background: V.depth, borderColor: "rgba(255,255,255,0.05)" }}
      >
        {/* Logo */}
        <div
          className="h-16 flex items-center px-4 border-b shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0 hover:bg-white/5 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" style={{ color: T.dim }} />
            ) : (
              <ChevronLeft className="w-4 h-4" style={{ color: T.dim }} />
            )}
          </button>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <span
                className="text-xs font-black tracking-[0.2em] uppercase"
                style={{ color: G.bright }}
              >
                DISCOTIVE
              </span>
              <span
                className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
              >
                ADMIN
              </span>
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              {!collapsed && (
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] px-4 mb-1.5">
                  {section.label}
                </p>
              )}
              {section.items.map(({ key, label, icon: Icon }) => {
                const active = activePanel === key;
                const badge = badgeMap[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActivePanel(key)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-all relative group",
                      active
                        ? "text-white"
                        : "text-white/40 hover:text-white/70",
                    )}
                    title={collapsed ? label : undefined}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNavBg"
                        className="absolute inset-0 rounded-lg mx-2"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                        transition={{
                          type: "spring",
                          damping: 26,
                          stiffness: 300,
                        }}
                      />
                    )}
                    <div className="relative z-10 shrink-0">
                      <Icon
                        className="w-4 h-4"
                        style={{ color: active ? G.bright : "currentColor" }}
                      />
                      {collapsed && badge > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-[6px] font-black text-white">
                            {badge > 9 ? "9+" : badge}
                          </span>
                        </div>
                      )}
                    </div>
                    {!collapsed && (
                      <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
                        <span className="text-[11px] font-bold truncate">
                          {label}
                        </span>
                        {badge > 0 && (
                          <span
                            className="text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0 ml-2"
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#f87171",
                            }}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* User */}
        <div
          className="p-3 border-t shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Shield className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-white/60 truncate">
                  {auth.currentUser?.email}
                </p>
                <p className="text-[8px] text-red-400 font-black uppercase tracking-widest">
                  Sector Omega
                </p>
              </div>
              <Link
                to="/app"
                className="text-white/20 hover:text-white/60 transition-colors"
                title="Back to App"
              >
                <LogOut className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-red-400" />
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    );
  },
);

// ══════════════════════════════════════════════════════════════════════════════
// STAT CARD
// ══════════════════════════════════════════════════════════════════════════════
const StatCard = memo(
  ({ label, value, icon: Icon, color = T.primary, sub, trend }) => (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{
        background: V.surface,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em]"
          style={{ color: T.dim }}
        >
          {label}
        </span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-3xl font-black font-mono" style={{ color }}>
          {value ?? "—"}
        </p>
        {sub && (
          <p className="text-[9px] mt-1" style={{ color: T.dim }}>
            {sub}
          </p>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          <TrendingUp
            className="w-3 h-3"
            style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}
          />
          <span
            className="text-[9px] font-bold"
            style={{ color: trend >= 0 ? "#4ade80" : "#f87171" }}
          >
            {trend >= 0 ? "+" : ""}
            {trend} this week
          </span>
        </div>
      )}
    </div>
  ),
);

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW PANEL
// ══════════════════════════════════════════════════════════════════════════════
const OverviewPanel = memo(({ stats, recentUsers, refreshing }) => {
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Operators"
          value={stats.total}
          icon={Users}
          color={T.primary}
          sub="All registered users"
          trend={stats.newThisWeek}
        />
        <StatCard
          label="Pro Tier"
          value={stats.pro}
          icon={Crown}
          color={G.bright}
          sub={`${stats.total > 0 ? ((stats.pro / stats.total) * 100).toFixed(1) : 0}% of network`}
        />
        <StatCard
          label="Vault Pending"
          value={stats.pendingVault}
          icon={Clock}
          color="#f59e0b"
          sub="Assets awaiting review"
        />
        <StatCard
          label="Open Tickets"
          value={stats.openTickets}
          icon={Ticket}
          color="#38bdf8"
          sub="Support requests"
        />
      </div>

      {/* Activity breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribution */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: V.surface,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: T.dim }}
          >
            Tier Distribution
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Essential",
                value: stats.total - stats.pro,
                color: "rgba(255,255,255,0.2)",
              },
              { label: "Pro", value: stats.pro, color: G.bright },
            ].map(({ label, value, color }) => {
              const pct = stats.total > 0 ? (value / stats.total) * 100 : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span
                      className="text-xs font-bold"
                      style={{ color: T.secondary }}
                    >
                      {label}
                    </span>
                    <span
                      className="text-xs font-black font-mono"
                      style={{ color }}
                    >
                      {value}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-5 pt-4 border-t flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="text-[9px]" style={{ color: T.dim }}>
              Total Network
            </span>
            <span
              className="text-lg font-black font-mono"
              style={{ color: T.primary }}
            >
              {stats.total}
            </span>
          </div>
        </div>

        {/* Recent users */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: V.surface,
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <h3
            className="text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ color: T.dim }}
          >
            Recent Registrations
          </h3>
          {refreshing ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: T.dim }}>
              No recent registrations
            </p>
          ) : (
            <div className="space-y-1.5">
              {recentUsers.slice(0, 6).map((user) => {
                const name =
                  `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                  user.identity?.username ||
                  "Unknown";
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: T.secondary,
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold truncate"
                        style={{ color: T.primary }}
                      >
                        {name}
                      </p>
                      <p
                        className="text-[9px] font-mono truncate"
                        style={{ color: T.dim }}
                      >
                        @{user.identity?.username} ·
                        {user.identity?.domain || "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "text-[8px] font-black uppercase tracking-widest",
                          user.tier === "PRO"
                            ? "text-amber-400"
                            : "text-white/20",
                        )}
                      >
                        {user.tier || "ESSENTIAL"}
                      </p>
                      <p
                        className="text-[9px] font-mono"
                        style={{ color: T.dim }}
                      >
                        {timeAgo(user.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick action row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Connector Approvals",
            value: stats.pendingConnectors,
            color: "#a855f7",
            icon: LinkIcon,
          },
          {
            label: "Pending Reports",
            value: stats.pendingReports,
            color: "#f97316",
            icon: Flag,
          },
          {
            label: "YouTube Channels",
            value: stats.pendingYT,
            color: "#ef4444",
            icon: Youtube,
          },
          {
            label: "GitHub Repos",
            value: stats.pendingGithub,
            color: "#e6edf3",
            icon: Github,
          },
        ].map(({ label, value, color, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: V.elevated,
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `${color}15`,
                border: `1px solid ${color}25`,
              }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-black font-mono" style={{ color }}>
                {value ?? 0}
              </p>
              <p className="text-[9px]" style={{ color: T.dim }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// USERS PANEL
// ══════════════════════════════════════════════════════════════════════════════
const UsersPanel = memo(() => {
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const [byUsername, byEmail] = await Promise.all([
        getDocs(
          query(
            collection(db, "users"),
            where("identity.username", "==", searchQ.trim()),
            limit(5),
          ),
        ),
        getDocs(
          query(
            collection(db, "users"),
            where("email", "==", searchQ.trim()),
            limit(5),
          ),
        ),
      ]);
      const seen = new Set();
      const combined = [...byUsername.docs, ...byEmail.docs].filter((d) => {
        if (seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });
      setResults(combined.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user) => {
    const username = user.identity?.username || user.id;
    if (
      !window.confirm(
        `PERMANENT DELETE: Wipe @${username} from Firestore? This cannot be undone.`,
      )
    )
      return;
    const typed = window.prompt(
      `Type "${username}" to confirm permanent deletion:`,
    );
    if (typed !== username) {
      alert("Username mismatch. Cancelled.");
      return;
    }
    setDeleting(user.id);
    try {
      // Delete subcollections via known paths
      const subcols = [
        "execution_map",
        "journal_entries",
        "score_log",
        "verification_requests",
      ];
      for (const col of subcols) {
        const snap = await getDocs(collection(db, "users", user.id, col));
        for (const d of snap.docs) await deleteDoc(d.ref);
      }
      await deleteDoc(doc(db, "users", user.id));
      setResults((p) => p.filter((u) => u.id !== user.id));
      alert(
        `@${username} permanently deleted from Firestore. Remove from Firebase Auth manually or via Cloud Function.`,
      );
    } catch (e) {
      alert("Delete failed: " + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleTierChange = async (userId, newTier) => {
    await updateDoc(doc(db, "users", userId), { tier: newTier });
    setResults((p) =>
      p.map((u) => (u.id === userId ? { ...u, tier: newTier } : u)),
    );
  };

  const handleScoreAdjust = async (userId, amount, reason) => {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const current = snap.data().discotiveScore?.current || 0;
    const newScore = Math.max(0, current + amount);
    await updateDoc(userRef, {
      "discotiveScore.current": newScore,
      "discotiveScore.lastAmount": amount,
      "discotiveScore.lastReason": reason || "Admin Adjustment",
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
    });
    setResults((p) =>
      p.map((u) =>
        u.id === userId
          ? { ...u, discotiveScore: { ...u.discotiveScore, current: newScore } }
          : u,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: T.dim }}
          />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by @username or email..."
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-colors"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.08)",
              color: T.primary,
            }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
          style={{
            background: G.dim,
            border: `1px solid ${G.border}`,
            color: G.bright,
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Find
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((user) => {
            const name =
              `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
              "Unknown";
            const score = user.discotiveScore?.current || 0;
            return (
              <div
                key={user.id}
                className="rounded-2xl p-5"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-black"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: T.secondary,
                      }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p
                        className="text-sm font-black"
                        style={{ color: T.primary }}
                      >
                        {name}
                      </p>
                      <p
                        className="text-[10px] font-mono"
                        style={{ color: T.dim }}
                      >
                        @{user.identity?.username} · {user.id.slice(0, 12)}...
                      </p>
                      <p className="text-[10px]" style={{ color: T.dim }}>
                        {user.identity?.domain || "—"} · Score:
                        {score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Tier change */}
                    <select
                      value={user.tier || "ESSENTIAL"}
                      onChange={(e) =>
                        handleTierChange(user.id, e.target.value)
                      }
                      className="text-[9px] font-black uppercase tracking-widest rounded-lg px-2 py-1.5 border focus:outline-none"
                      style={{
                        background: V.elevated,
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: user.tier === "PRO" ? G.bright : T.dim,
                      }}
                    >
                      <option value="ESSENTIAL">Essential</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={deleting === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171",
                      }}
                    >
                      {deleting === user.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
                {/* Score adjust */}
                <div
                  className="flex items-center gap-2 flex-wrap pt-3 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    Score Adjustment:
                  </span>
                  {[
                    { label: "+50", amount: 50, color: "#4ade80" },
                    { label: "+100", amount: 100, color: "#4ade80" },
                    { label: "-50", amount: -50, color: "#f87171" },
                    { label: "-100", amount: -100, color: "#f87171" },
                  ].map(({ label, amount, color }) => (
                    <button
                      key={label}
                      onClick={() =>
                        handleScoreAdjust(
                          user.id,
                          amount,
                          `Admin Manual ${label}`,
                        )
                      }
                      className="px-2.5 py-1 rounded-lg text-[9px] font-black transition-all border"
                      style={{
                        background: `${color}10`,
                        border: `1px solid ${color}25`,
                        color,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && !loading && searchQ && (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No users found for "{searchQ}"
        </p>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTOR APPROVALS PANEL
// ══════════════════════════════════════════════════════════════════════════════
const ConnectorPanel = memo(() => {
  const [ytChannels, setYtChannels] = useState([]);
  const [githubRepos, setGithubRepos] = useState([]);
  const [appVerifs, setAppVerifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("youtube");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // YouTube pending channels
        const usersSnap = await getDocs(
          query(collection(db, "users"), limit(100)),
        );
        const yt = [],
          gh = [];
        usersSnap.docs.forEach((d) => {
          const data = d.data();
          const ytC = data.connectors?.youtube;
          if (ytC?.channelUrl && !ytC.verified) {
            yt.push({
              userId: d.id,
              userName:
                `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
                "Unknown",
              userUsername: data.identity?.username || "unknown",
              ...ytC,
            });
          }
          // GitHub pending vault assets from github connector
          (data.vault || [])
            .filter(
              (a) => a.connectorSource === "github" && a.status === "PENDING",
            )
            .forEach((a) => {
              gh.push({
                ...a,
                userId: d.id,
                userUsername: data.identity?.username || "unknown",
              });
            });
        });
        setYtChannels(yt);
        setGithubRepos(gh);

        // App verifications
        try {
          const avSnap = await getDocs(
            query(
              collection(db, "app_verifications"),
              where("status", "==", "PENDING"),
              limit(50),
            ),
          );
          setAppVerifs(avSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch {
          setAppVerifs([]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const approveYT = async (ch) => {
    await updateDoc(doc(db, "users", ch.userId), {
      "connectors.youtube.verified": true,
      "connectors.youtube.verifiedAt": new Date().toISOString(),
      "connectors.youtube.verifiedBy": auth.currentUser?.uid || "admin",
    });
    setYtChannels((p) => p.filter((c) => c.userId !== ch.userId));
  };

  const rejectYT = async (ch) => {
    if (!window.confirm("Reject this YouTube channel?")) return;
    await updateDoc(doc(db, "users", ch.userId), {
      "connectors.youtube": null,
    });
    setYtChannels((p) => p.filter((c) => c.userId !== ch.userId));
  };

  const approveGithub = async (repo) => {
    const userRef = doc(db, "users", repo.userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const vault = snap.data().vault || [];
    const updated = vault.map((a) =>
      a.id === repo.id
        ? {
            ...a,
            status: "VERIFIED",
            strength: "Medium",
            verifiedAt: new Date().toISOString(),
            verifiedBy: auth.currentUser?.uid || "admin",
          }
        : a,
    );
    await updateDoc(userRef, { vault: updated });
    setGithubRepos((p) =>
      p.filter((r) => !(r.id === repo.id && r.userId === repo.userId)),
    );
  };

  const approveApp = async (v) => {
    await updateDoc(doc(db, "app_verifications", v.id), {
      status: "APPROVED",
      reviewedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", v.userId), {
      verifiedApps: arrayUnion({
        appId: v.appId,
        appName: v.appName,
        appIconUrl: v.appIconUrl,
        verifiedAt: new Date().toISOString(),
      }),
      [`pendingAppVerifications.${v.appId}`]: deleteField(),
    });
    setAppVerifs((p) => p.filter((a) => a.id !== v.id));
  };

  const tabs = [
    {
      key: "youtube",
      label: "YouTube",
      count: ytChannels.length,
      icon: Youtube,
    },
    {
      key: "github",
      label: "GitHub Repos",
      count: githubRepos.length,
      icon: Github,
    },
    {
      key: "apps",
      label: "App Proficiency",
      count: appVerifs.length,
      icon: Monitor,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
              activeTab === key
                ? "bg-white text-black border-white"
                : "border-white/[0.06] text-white/40 hover:text-white",
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count > 0 && (
              <span className="font-mono opacity-70">({count})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "youtube" &&
            (ytChannels.length === 0 ? (
              <p className="text-center text-sm py-12" style={{ color: T.dim }}>
                No pending YouTube channel approvals.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ytChannels.map((ch) => (
                  <div
                    key={ch.userId}
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        <Youtube className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-black"
                          style={{ color: T.primary }}
                        >
                          {ch.handle ? `@${ch.handle}` : "YouTube Channel"}
                        </p>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: T.dim }}
                        >
                          Submitted by @{ch.userUsername}
                        </p>
                      </div>
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/8 border-amber-500/20">
                        Pending
                      </span>
                    </div>
                    <a
                      href={ch.channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:underline truncate"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {ch.channelUrl}
                    </a>
                    {ch.description && (
                      <p
                        className="text-xs rounded-xl p-3"
                        style={{ color: T.secondary, background: V.elevated }}
                      >
                        {ch.description}
                      </p>
                    )}
                    <div
                      className="flex gap-2 pt-1 border-t"
                      style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    >
                      <button
                        onClick={() => approveYT(ch)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 transition-all"
                      >
                        <ThumbsUp className="w-3 h-3" /> Approve
                      </button>
                      <button
                        onClick={() => rejectYT(ch)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/15 transition-all"
                      >
                        <ThumbsDown className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          {activeTab === "github" &&
            (githubRepos.length === 0 ? (
              <p className="text-center text-sm py-12" style={{ color: T.dim }}>
                No pending GitHub repository approvals.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {githubRepos.map((repo) => (
                  <div
                    key={`${repo.userId}-${repo.id}`}
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "#0d1117",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Github className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-black truncate"
                          style={{ color: T.primary }}
                        >
                          {repo.title}
                        </p>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: T.dim }}
                        >
                          @{repo.userUsername} ·
                          {repo.credentials?.language || "—"}
                        </p>
                      </div>
                    </div>
                    {repo.url && (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        {repo.url}
                      </a>
                    )}
                    <button
                      onClick={() => approveGithub(repo)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 transition-all"
                    >
                      <Check className="w-3 h-3" /> Verify Repo (+25 pts)
                    </button>
                  </div>
                ))}
              </div>
            ))}
          {activeTab === "apps" &&
            (appVerifs.length === 0 ? (
              <p className="text-center text-sm py-12" style={{ color: T.dim }}>
                No pending app verifications.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appVerifs.map((v) => (
                  <div
                    key={v.id}
                    className="rounded-2xl p-5 space-y-3"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ background: V.elevated }}
                      >
                        {v.appIconUrl ? (
                          <img
                            src={v.appIconUrl}
                            alt={v.appName}
                            className="w-5 h-5 object-contain"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          <Monitor className="w-4 h-4 text-violet-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-black truncate"
                          style={{ color: T.primary }}
                        >
                          {v.appName}
                        </p>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: T.dim }}
                        >
                          @{v.userUsername}
                        </p>
                      </div>
                    </div>
                    {v.profileUrl && (
                      <a
                        href={v.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        Profile: {v.profileUrl}
                      </a>
                    )}
                    {v.proofUrl && (
                      <a
                        href={v.proofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:underline truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        Proof: {v.proofUrl}
                      </a>
                    )}
                    <button
                      onClick={() => approveApp(v)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/15 transition-all"
                    >
                      <CheckCircle className="w-3 h-3" /> Approve (+25 pts)
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SCORING ENGINE PANEL
// ══════════════════════════════════════════════════════════════════════════════
const SCORE_DEFAULTS = {
  vaultVerifiedStrong: 30,
  vaultVerifiedMedium: 20,
  vaultVerifiedWeak: 10,
  allianceForged: 15,
  allianceRequestSent: 5,
  taskCompleted: 5,
  taskReverted: -15,
  nodeCoreCompleted: 30,
  nodeBranchCompleted: 15,
  videoWatchFull: 10,
  appVerified: 25,
  githubRepoVerified: 25,
  onboardingBonus: 50,
};

const SCORE_LABELS = {
  vaultVerifiedStrong: "Vault — Strong Asset Verified",
  vaultVerifiedMedium: "Vault — Medium Asset Verified",
  vaultVerifiedWeak: "Vault — Weak Asset Verified",
  allianceForged: "Network — Alliance Forged",
  allianceRequestSent: "Network — Request Sent (Daily Cap: 5)",
  taskCompleted: "Execution — Task Completed",
  taskReverted: "Execution — Task Reverted (Penalty)",
  nodeCoreCompleted: "Execution — Core Node Verified",
  nodeBranchCompleted: "Execution — Branch Node Verified",
  videoWatchFull: "Learn — Video Watched (Full)",
  appVerified: "Connector — App Proficiency Verified",
  githubRepoVerified: "Connector — GitHub Repo Verified",
  onboardingBonus: "One-Time — Onboarding Complete",
};

const ScoringPanel = memo(() => {
  const [scores, setScores] = useState(SCORE_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "system", "scoring_config"));
        if (snap.exists()) setScores({ ...SCORE_DEFAULTS, ...snap.data() });
      } catch {}
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "system", "scoring_config"), {
        ...scores,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const groups = [
    {
      label: "Asset Vault",
      keys: ["vaultVerifiedStrong", "vaultVerifiedMedium", "vaultVerifiedWeak"],
    },
    { label: "Network", keys: ["allianceForged", "allianceRequestSent"] },
    {
      label: "Execution Map",
      keys: [
        "taskCompleted",
        "taskReverted",
        "nodeCoreCompleted",
        "nodeBranchCompleted",
      ],
    },
    { label: "Learning", keys: ["videoWatchFull"] },
    { label: "Connectors", keys: ["appVerified", "githubRepoVerified"] },
    { label: "One-Time Bonuses", keys: ["onboardingBonus"] },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black" style={{ color: T.primary }}>
            Scoring Engine Config
          </h2>
          <p className="text-xs mt-0.5" style={{ color: T.dim }}>
            All point values. Changes persist immediately to Firestore. Daily
            login points removed.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          style={{
            background: saved ? "rgba(74,222,128,0.15)" : G.dim,
            border: `1px solid ${saved ? "rgba(74,222,128,0.3)" : G.border}`,
            color: saved ? "#4ade80" : G.bright,
          }}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Config"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map(({ label, keys }) => (
          <div
            key={label}
            className="rounded-2xl p-5"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <h3
              className="text-[9px] font-black uppercase tracking-[0.15em] mb-4"
              style={{ color: T.dim }}
            >
              {label}
            </h3>
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <span
                    className="text-xs font-medium flex-1 min-w-0 truncate"
                    style={{ color: T.secondary }}
                  >
                    {SCORE_LABELS[key]}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        setScores((p) => ({
                          ...p,
                          [key]: Math.max(
                            scores[key] < 0 ? -500 : 0,
                            p[key] - 5,
                          ),
                        }))
                      }
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:bg-white/10"
                      style={{ background: V.elevated, color: T.dim }}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={scores[key] ?? 0}
                      onChange={(e) =>
                        setScores((p) => ({
                          ...p,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-16 text-center text-sm font-black rounded-lg py-1 focus:outline-none"
                      style={{
                        background: V.elevated,
                        border: `1px solid ${scores[key] < 0 ? "rgba(248,113,113,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: scores[key] < 0 ? "#f87171" : G.bright,
                      }}
                    />
                    <button
                      onClick={() =>
                        setScores((p) => ({ ...p, [key]: p[key] + 5 }))
                      }
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-all hover:bg-white/10"
                      style={{ background: V.elevated, color: T.dim }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// VAULT PANEL (Minimal, links to full page)
// ══════════════════════════════════════════════════════════════════════════════
const VaultPanel = memo(() => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(80)));
        const list = [];
        snap.docs.forEach((d) => {
          const data = d.data();
          (data.vault || []).forEach((a) => {
            list.push({
              ...a,
              userId: d.id,
              userUsername: data.identity?.username || "unknown",
              userName:
                `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim(),
            });
          });
        });
        setAssets(list);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleMark = async (asset, strength) => {
    const isVerified = strength !== "Fake";
    const newStatus = isVerified ? "VERIFIED" : "REJECTED";
    setAssets((p) =>
      p.map((a) =>
        a.id === asset.id && a.userId === asset.userId
          ? { ...a, status: newStatus, strength: isVerified ? strength : null }
          : a,
      ),
    );
    const userRef = doc(db, "users", asset.userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const vault = snap.data().vault || [];
    const updated = vault.map((v) =>
      v.id === asset.id
        ? {
            ...v,
            status: newStatus,
            strength: isVerified ? strength : null,
            verifiedAt: new Date().toISOString(),
            verifiedBy: auth.currentUser?.uid || "admin",
          }
        : v,
    );
    await updateDoc(userRef, { vault: updated });
  };

  const filtered = assets.filter((a) => {
    if (filter === "PENDING") return !a.status || a.status === "PENDING";
    if (filter === "VERIFIED") return a.status === "VERIFIED";
    if (filter === "REPORTED") return a.status === "REPORTED";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {["PENDING", "VERIFIED", "REPORTED", "ALL"].map((f) => {
          const count = assets.filter((a) =>
            f === "ALL"
              ? true
              : f === "PENDING"
                ? !a.status || a.status === "PENDING"
                : a.status === f,
          ).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                filter === f
                  ? "bg-white text-black border-white"
                  : "border-white/[0.06] text-white/40 hover:text-white",
              )}
            >
              {f} <span className="font-mono opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-40 rounded-2xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-12" style={{ color: T.dim }}>
          No assets match filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.slice(0, 20).map((asset) => {
            const statusColor =
              {
                VERIFIED: "#4ade80",
                PENDING: "#f59e0b",
                REPORTED: "#f87171",
                REJECTED: "rgba(255,255,255,0.2)",
              }[asset.status] || "#f59e0b";
            return (
              <div
                key={`${asset.userId}-${asset.id}`}
                className="rounded-2xl p-4 space-y-3"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: `${statusColor}15`,
                      border: `1px solid ${statusColor}25`,
                    }}
                  >
                    <Award
                      className="w-3.5 h-3.5"
                      style={{ color: statusColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-black truncate"
                      style={{ color: T.primary }}
                    >
                      {asset.title || "Untitled"}
                    </p>
                    <p
                      className="text-[10px] font-mono"
                      style={{ color: T.dim }}
                    >
                      @{asset.userUsername} · {asset.category || "—"} ·
                      {timeAgo(asset.uploadedAt)}
                    </p>
                  </div>
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0"
                    style={{
                      color: statusColor,
                      background: `${statusColor}12`,
                      borderColor: `${statusColor}25`,
                    }}
                  >
                    {asset.status || "PENDING"}
                  </span>
                </div>
                {asset.url && (
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:underline truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {asset.url}
                  </a>
                )}
                {(!asset.status || asset.status === "PENDING") && (
                  <div
                    className="flex gap-1.5 pt-1 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    {["Strong", "Medium", "Weak", "Fake"].map((s) => {
                      const c = {
                        Strong: "#4ade80",
                        Medium: G.bright,
                        Weak: "#f97316",
                        Fake: "#f87171",
                      }[s];
                      return (
                        <button
                          key={s}
                          onClick={() => handleMark(asset, s)}
                          className="flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all"
                          style={{
                            color: c,
                            background: `${c}10`,
                            borderColor: `${c}20`,
                          }}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// LEARN DATABASE PANEL
// ══════════════════════════════════════════════════════════════════════════════
const LearnPanel = memo(() => {
  const [tab, setTab] = useState("certs");
  const [certs, setCerts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingVideo, setAddingVideo] = useState(false);
  const [addingCert, setAddingCert] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: "", url: "" });
  const [certForm, setCertForm] = useState({
    title: "",
    link: "",
    provider: "",
    strength: "Medium",
  });

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [cs, vs] = await Promise.all([
          getDocs(
            query(
              collection(db, "discotive_certificates"),
              orderBy("createdAt", "desc"),
              limit(50),
            ),
          ),
          getDocs(
            query(
              collection(db, "discotive_videos"),
              orderBy("createdAt", "desc"),
              limit(50),
            ),
          ),
        ]);
        setCerts(cs.docs.map((d) => ({ id: d.id, ...d.data() })));
        setVideos(vs.docs.map((d) => ({ id: d.id, ...d.data() })));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const addVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.url.trim()) return;
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const ytId =
      videoForm.url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/i,
      )?.[1] || videoForm.url;
    const ref = await addDoc(collection(db, "discotive_videos"), {
      title: videoForm.title,
      youtubeId: ytId,
      thumbnailUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
      discotiveLearnId: `discotive_video_${suffix}`,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email,
      category: "educational",
      scoreReward: 10,
    });
    setVideos((p) => [
      {
        id: ref.id,
        title: videoForm.title,
        youtubeId: ytId,
        discotiveLearnId: `discotive_video_${suffix}`,
      },
      ...p,
    ]);
    setVideoForm({ title: "", url: "" });
    setAddingVideo(false);
  };

  const addCert = async () => {
    if (!certForm.title.trim() || !certForm.link.trim()) return;
    const suffix = Math.floor(100000 + Math.random() * 900000);
    const ref = await addDoc(collection(db, "discotive_certificates"), {
      ...certForm,
      discotiveLearnId: `discotive_certificate_${suffix}`,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.email,
      scoreReward:
        certForm.strength === "Strong"
          ? 30
          : certForm.strength === "Medium"
            ? 20
            : 10,
    });
    setCerts((p) => [
      {
        id: ref.id,
        ...certForm,
        discotiveLearnId: `discotive_certificate_${suffix}`,
      },
      ...p,
    ]);
    setCertForm({ title: "", link: "", provider: "", strength: "Medium" });
    setAddingCert(false);
  };

  const deleteResource = async (id, col) => {
    if (!window.confirm("Permanently delete this resource?")) return;
    await deleteDoc(doc(db, col, id));
    if (col === "discotive_certificates")
      setCerts((p) => p.filter((c) => c.id !== id));
    else setVideos((p) => p.filter((v) => v.id !== id));
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors placeholder-white/20";
  const inputStyle = {
    background: V.elevated,
    border: "1px solid rgba(255,255,255,0.08)",
    color: T.primary,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { key: "certs", label: "Certificates", count: certs.length },
            { key: "videos", label: "Videos", count: videos.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                tab === key
                  ? "bg-white text-black border-white"
                  : "border-white/[0.06] text-white/40 hover:text-white",
              )}
            >
              {label}
              <span className="font-mono opacity-60 ml-1">({count})</span>
            </button>
          ))}
        </div>
        <button
          onClick={() =>
            tab === "certs" ? setAddingCert(true) : setAddingVideo(true)
          }
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
          style={{
            background: G.dim,
            border: `1px solid ${G.border}`,
            color: G.bright,
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add
          {tab === "certs" ? "Certificate" : "Video"}
        </button>
      </div>

      {/* Quick Add Forms */}
      <AnimatePresence>
        {addingVideo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-5 space-y-3 overflow-hidden"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3 className="text-sm font-black" style={{ color: T.primary }}>
              Add YouTube Video
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={videoForm.url}
                onChange={(e) =>
                  setVideoForm((p) => ({ ...p, url: e.target.value }))
                }
                placeholder="YouTube URL or ID"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={videoForm.title}
                onChange={(e) =>
                  setVideoForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Video Title"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addVideo}
                className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: G.dim,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }}
              >
                Add Video
              </button>
              <button
                onClick={() => setAddingVideo(false)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{ background: V.elevated, color: T.dim }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
        {addingCert && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-5 space-y-3 overflow-hidden"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3 className="text-sm font-black" style={{ color: T.primary }}>
              Add Certificate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={certForm.title}
                onChange={(e) =>
                  setCertForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Certificate Title"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={certForm.provider}
                onChange={(e) =>
                  setCertForm((p) => ({ ...p, provider: e.target.value }))
                }
                placeholder="Provider (e.g. Coursera)"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={certForm.link}
                onChange={(e) =>
                  setCertForm((p) => ({ ...p, link: e.target.value }))
                }
                placeholder="Enrollment URL"
                type="url"
                className={inputCls}
                style={inputStyle}
              />
              <select
                value={certForm.strength}
                onChange={(e) =>
                  setCertForm((p) => ({ ...p, strength: e.target.value }))
                }
                className={cn(inputCls, "appearance-none")}
                style={inputStyle}
              >
                <option value="Weak">Weak</option>
                <option value="Medium">Medium</option>
                <option value="Strong">Strong</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addCert}
                className="px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: G.dim,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }}
              >
                Add Certificate
              </button>
              <button
                onClick={() => setAddingCert(false)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{ background: V.elevated, color: T.dim }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(tab === "certs" ? certs : videos).map((item) => {
            const isVideo = tab === "videos";
            const ytId = item.youtubeId;
            return (
              <div
                key={item.id}
                className="group rounded-2xl overflow-hidden relative"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {isVideo && ytId && (
                  <div className="relative" style={{ aspectRatio: "16/9" }}>
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={item.title}
                      className="w-full h-full object-cover opacity-70"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p
                      className="text-xs font-bold line-clamp-2"
                      style={{ color: T.primary }}
                    >
                      {item.title}
                    </p>
                    <button
                      onClick={() =>
                        deleteResource(
                          item.id,
                          isVideo
                            ? "discotive_videos"
                            : "discotive_certificates",
                        )
                      }
                      className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {!isVideo && (
                    <p className="text-[9px]" style={{ color: T.dim }}>
                      {item.provider}
                    </p>
                  )}
                  {item.discotiveLearnId && (
                    <p
                      className="text-[8px] font-mono mt-1"
                      style={{ color: isVideo ? "#38bdf8" : "#f59e0b" }}
                    >
                      {item.discotiveLearnId}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// COLISTS CURATION PANEL
// ══════════════════════════════════════════════════════════════════════════════
const ColistsPanel = memo(() => {
  const [colists, setColists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(
      query(
        collection(db, "colists"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    ).then((snap) => {
      setColists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const handleVerify = async (id, tier) => {
    await updateDoc(doc(db, "colists", id), { verificationTier: tier });
    setColists((prev) =>
      prev.map((c) => (c.id === id ? { ...c, verificationTier: tier } : c)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: T.dim }}>
          {colists.length} published colists
        </p>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : colists.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No colists found.
        </p>
      ) : (
        <div className="space-y-3">
          {colists.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl p-5"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <a
                    href={`/colists/${c.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-black hover:underline flex items-center gap-1.5"
                    style={{ color: T.primary }}
                  >
                    {c.title} <ExternalLink size={12} className="opacity-50" />
                  </a>
                  <p
                    className="text-[10px] font-mono mt-1"
                    style={{ color: T.dim }}
                  >
                    @{c.authorUsername} · Resonance: {c.colistScore || 0} ·
                    Views: {c.viewCount || 0}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end max-w-[280px]">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest mr-2"
                    style={{ color: T.dim }}
                  >
                    Verify:
                  </span>
                  {["original", "strong", "medium", "weak"].map((tier) => {
                    const active = c.verificationTier === tier;
                    return (
                      <button
                        key={tier}
                        onClick={() => handleVerify(c.id, tier)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                          active
                            ? "opacity-100"
                            : "opacity-40 hover:opacity-100",
                        )}
                        style={{
                          background: active ? G.dim : "transparent",
                          color: active ? G.bright : T.secondary,
                          borderColor: active
                            ? G.border
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        {tier}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// OPPORTUNITIES PANEL
// ══════════════════════════════════════════════════════════════════════════════
const OpportunitiesPanel = memo(() => {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "job",
    provider: "",
    applyUrl: "",
    workMode: "Remote",
    closingDate: "",
    description: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(
      query(
        collection(db, "opportunities"),
        orderBy("createdAt", "desc"),
        limit(50),
      ),
    )
      .then((s) => setOpps(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (opp) => {
    setEditItem(opp);
    setForm({
      title: opp.title || "",
      type: opp.type || "job",
      provider: opp.provider || "",
      applyUrl: opp.applyUrl || "",
      workMode: opp.workMode || "Remote",
      closingDate: opp.closingDate || "",
      description: opp.description || "",
      isActive: opp.isActive ?? true,
    });
    setShowForm(true);
  };
  const openNew = () => {
    setEditItem(null);
    setForm({
      title: "",
      type: "job",
      provider: "",
      applyUrl: "",
      workMode: "Remote",
      closingDate: "",
      description: "",
      isActive: true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (editItem?.id) {
        await updateDoc(doc(db, "opportunities", editItem.id), payload);
        setOpps((p) =>
          p.map((o) => (o.id === editItem.id ? { ...o, ...payload } : o)),
        );
      } else {
        const ref = await addDoc(collection(db, "opportunities"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setOpps((p) => [{ id: ref.id, ...payload }, ...p]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteOpp = async (id) => {
    if (!window.confirm("Delete this opportunity?")) return;
    await deleteDoc(doc(db, "opportunities", id));
    setOpps((p) => p.filter((o) => o.id !== id));
  };

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-colors";
  const inputStyle = {
    background: V.elevated,
    border: "1px solid rgba(255,255,255,0.08)",
    color: T.primary,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: T.dim }}>
          {opps.length} total opportunities
        </p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
          style={{
            background: G.dim,
            border: `1px solid ${G.border}`,
            color: G.bright,
          }}
        >
          <Plus className="w-3.5 h-3.5" /> New Opportunity
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl p-5 space-y-4 overflow-hidden"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h3 className="text-sm font-black" style={{ color: T.primary }}>
              {editItem ? "Edit" : "New"} Opportunity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="Title *"
                className={inputCls}
                style={inputStyle}
              />
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value }))
                }
                className={cn(inputCls, "appearance-none")}
                style={inputStyle}
              >
                {[
                  "job",
                  "internship",
                  "freelance",
                  "hackathon",
                  "fellowship",
                  "competition",
                  "grant",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={form.provider}
                onChange={(e) =>
                  setForm((p) => ({ ...p, provider: e.target.value }))
                }
                placeholder="Company/Provider"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={form.applyUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, applyUrl: e.target.value }))
                }
                placeholder="Apply URL"
                type="url"
                className={inputCls}
                style={inputStyle}
              />
              <select
                value={form.workMode}
                onChange={(e) =>
                  setForm((p) => ({ ...p, workMode: e.target.value }))
                }
                className={cn(inputCls, "appearance-none")}
                style={inputStyle}
              >
                {["Remote", "In-Person", "Hybrid", "Global"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={form.closingDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, closingDate: e.target.value }))
                }
                type="date"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Description"
              className={cn(inputCls, "resize-none")}
              style={inputStyle}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{
                  background: G.dim,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }}
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                style={{ background: V.elevated, color: T.dim }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : opps.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No opportunities posted yet.
        </p>
      ) : (
        <div className="space-y-2">
          {opps.map((opp) => (
            <div
              key={opp.id}
              className="flex items-center gap-3 p-4 rounded-xl group transition-colors hover:bg-white/[0.01]"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  opp.isActive ? "bg-emerald-400" : "bg-white/20",
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: T.primary }}
                >
                  {opp.title}
                </p>
                <p className="text-[10px]" style={{ color: T.dim }}>
                  {opp.provider} · {opp.type} · {opp.workMode}
                </p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(opp)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                  style={{ color: T.dim }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteOpp(opp.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    color: "#f87171",
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// TICKETS PANEL
// ══════════════════════════════════════════════════════════════════════════════
const TicketsPanel = memo(() => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getDocs(
      query(
        collection(db, "support_tickets"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    )
      .then((s) => setTickets(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (ticket) => {
    const newStatus = ticket.status === "open" ? "closed" : "open";
    await updateDoc(doc(db, "support_tickets", ticket.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    setTickets((p) =>
      p.map((t) => (t.id === ticket.id ? { ...t, status: newStatus } : t)),
    );
  };

  const filtered = tickets.filter((t) =>
    filter === "all" ? true : t.status === filter,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { k: "open", l: "Open" },
          { k: "closed", l: "Closed" },
          { k: "all", l: "All" },
        ].map(({ k, l }) => {
          const count = tickets.filter((t) =>
            k === "all" ? true : t.status === k,
          ).length;
          return (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                filter === k
                  ? "bg-white text-black border-white"
                  : "border-white/[0.06] text-white/40 hover:text-white",
              )}
            >
              {l} <span className="font-mono opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No tickets found.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    t.status === "open" ? "bg-emerald-400" : "bg-white/20",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: T.primary }}
                  >
                    {t.subject || "No subject"}
                  </p>
                  <p className="text-[10px]" style={{ color: T.dim }}>
                    {t.category} · {timeAgo(t.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(t);
                  }}
                  className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all"
                  style={{
                    color: t.status === "open" ? "#f87171" : "#4ade80",
                    background:
                      t.status === "open"
                        ? "rgba(248,113,113,0.08)"
                        : "rgba(74,222,128,0.08)",
                    borderColor:
                      t.status === "open"
                        ? "rgba(248,113,113,0.2)"
                        : "rgba(74,222,128,0.2)",
                  }}
                >
                  {t.status === "open" ? "Close" : "Reopen"}
                </button>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform shrink-0",
                    expanded === t.id && "rotate-180",
                  )}
                  style={{ color: T.dim }}
                />
              </div>
              {expanded === t.id && (
                <div
                  className="px-4 pb-4 pt-0 border-t"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}
                >
                  <p
                    className="text-sm leading-relaxed mt-3"
                    style={{ color: T.secondary }}
                  >
                    {t.message}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// REPORTS PANEL
// ══════════════════════════════════════════════════════════════════════════════
const ReportsPanel = memo(() => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    getDocs(
      query(
        collection(db, "reports"),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    )
      .then((s) => setReports(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await updateDoc(doc(db, "reports", id), {
      status,
      updatedAt: serverTimestamp(),
    });
    setReports((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const filtered = reports.filter((r) =>
    filter === "all" ? true : r.status === filter,
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["pending", "reviewed", "resolved", "dismissed", "all"].map((f) => {
          const count = reports.filter((r) =>
            f === "all" ? true : r.status === f,
          ).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                filter === f
                  ? "bg-white text-black border-white"
                  : "border-white/[0.06] text-white/40 hover:text-white",
              )}
            >
              {f} <span className="font-mono opacity-60 ml-1">({count})</span>
            </button>
          );
        })}
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No reports found.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-xl p-4 space-y-3"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: T.primary }}
                  >
                    {r.reason}
                  </p>
                  <p className="text-[10px]" style={{ color: T.dim }}>
                    {r.targetType} · @{r.reporterUsername || "anon"} ·
                    {timeAgo(r.createdAt)}
                  </p>
                </div>
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(249,115,22,0.1)",
                    color: "#f97316",
                  }}
                >
                  {r.status}
                </span>
              </div>
              {r.description && (
                <p className="text-xs" style={{ color: T.secondary }}>
                  {r.description}
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {["reviewed", "resolved", "dismissed"].map((action) => (
                  <button
                    key={action}
                    onClick={() => updateStatus(r.id, action)}
                    disabled={r.status === action}
                    className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all disabled:opacity-30"
                    style={{
                      color:
                        action === "resolved"
                          ? "#4ade80"
                          : action === "dismissed"
                            ? T.dim
                            : "#38bdf8",
                      background: `${action === "resolved" ? "rgba(74,222,128,0.1)" : action === "dismissed" ? "rgba(255,255,255,0.04)" : "rgba(56,189,248,0.1)"}`,
                      borderColor:
                        action === "resolved"
                          ? "rgba(74,222,128,0.2)"
                          : action === "dismissed"
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(56,189,248,0.2)",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// FEEDBACK PANEL
// ══════════════════════════════════════════════════════════════════════════════
const FeedbackViewPanel = memo(() => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getDocs(collection(db, "feedback"))
      .then((s) => setFeedbacks(s.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false));
  }, []);

  const totalRating = feedbacks.reduce((s, f) => s + (f.rating || 0), 0);
  const avgRating =
    feedbacks.length > 0 ? (totalRating / feedbacks.length).toFixed(1) : "—";

  const recCounts = { game_changer: 0, powerful: 0, average: 0, a_drag: 0 };
  feedbacks.forEach((f) => {
    if (f.recommendation && recCounts[f.recommendation] !== undefined)
      recCounts[f.recommendation]++;
  });

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Responses"
          value={feedbacks.length}
          icon={MessageSquare}
          color={T.primary}
        />
        <StatCard
          label="Avg Rating"
          value={`${avgRating} ★`}
          icon={Star}
          color="#f59e0b"
        />
        <StatCard
          label="Game-Changers"
          value={recCounts.game_changer}
          icon={Flame}
          color="#a855f7"
        />
        <StatCard
          label="A Drag"
          value={recCounts.a_drag}
          icon={AlertTriangle}
          color="#f87171"
        />
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl"
              style={{ background: V.surface }}
            />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <p className="text-center text-sm py-8" style={{ color: T.dim }}>
          No feedback yet.
        </p>
      ) : (
        <div className="space-y-2">
          {feedbacks.map((f) => {
            const recColor =
              {
                game_changer: "#a855f7",
                powerful: "#4ade80",
                average: "#f59e0b",
                a_drag: "#f87171",
              }[f.recommendation] || T.dim;
            return (
              <div
                key={f.id}
                className="rounded-xl overflow-hidden"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                >
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="w-3 h-3"
                        style={{
                          color:
                            f.rating >= s ? "#f59e0b" : "rgba(255,255,255,0.1)",
                          fill: f.rating >= s ? "#f59e0b" : "none",
                        }}
                      />
                    ))}
                  </div>
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ color: recColor, background: `${recColor}15` }}
                  >
                    {f.recommendation?.replace("_", " ")}
                  </span>
                  <span
                    className="text-[10px] font-mono flex-1 truncate"
                    style={{ color: T.dim }}
                  >
                    {f.uid?.slice(0, 16)}...
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform shrink-0",
                      expanded === f.id && "rotate-180",
                    )}
                    style={{ color: T.dim }}
                  />
                </div>
                {expanded === f.id && f.comments && (
                  <div
                    className="px-4 pb-4 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                  >
                    <p
                      className="text-sm leading-relaxed mt-3"
                      style={{ color: T.secondary }}
                    >
                      {f.comments}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const AdminDashboard = () => {
  const [activePanel, setActivePanel] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pro: 0,
    essential: 0,
    newThisWeek: 0,
    pendingVault: 0,
    openTickets: 0,
    pendingReports: 0,
    pendingConnectors: 0,
    pendingYT: 0,
    pendingGithub: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const PANEL_TITLES = {
    overview: "Command Center",
    users: "User Management",
    vault: "Vault Verification",
    connectors: "Connector Approvals",
    scoring: "Scoring Engine",
    learn: "Learn Database",
    colists: "Colists Curation",
    opportunities: "Opportunities",
    tickets: "Support Tickets",
    reports: "User Reports",
    feedback: "Platform Feedback",
  };

  const fetchStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const [totalSnap, proSnap] = await Promise.all([
        getCountFromServer(query(collection(db, "users"))),
        getCountFromServer(
          query(collection(db, "users"), where("tier", "==", "PRO")),
        ),
      ]);
      const total = totalSnap.data().count;
      const pro = proSnap.data().count;

      let newThisWeek = 0;
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const ws = await getCountFromServer(
          query(
            collection(db, "users"),
            where("createdAt", ">=", weekAgo.toISOString()),
          ),
        );
        newThisWeek = ws.data().count;
      } catch {}

      // Count pending vault, YT, github
      const usersSnap = await getDocs(
        query(collection(db, "users"), limit(100)),
      );
      let pendingVault = 0,
        pendingYT = 0,
        pendingGithub = 0;
      usersSnap.docs.forEach((d) => {
        const data = d.data();
        (data.vault || []).forEach((a) => {
          if (!a.status || a.status === "PENDING") {
            pendingVault++;
            if (a.connectorSource === "github") pendingGithub++;
          }
        });
        if (
          data.connectors?.youtube?.channelUrl &&
          !data.connectors?.youtube?.verified
        )
          pendingYT++;
      });

      let openTickets = 0,
        pendingReports = 0,
        pendingAppVerifs = 0;
      try {
        const ts = await getCountFromServer(
          query(
            collection(db, "support_tickets"),
            where("status", "==", "open"),
          ),
        );
        openTickets = ts.data().count;
      } catch {}
      try {
        const rs = await getCountFromServer(
          query(collection(db, "reports"), where("status", "==", "pending")),
        );
        pendingReports = rs.data().count;
      } catch {}
      try {
        const as = await getCountFromServer(
          query(
            collection(db, "app_verifications"),
            where("status", "==", "PENDING"),
          ),
        );
        pendingAppVerifs = as.data().count;
      } catch {}

      setStats({
        total,
        pro,
        essential: total - pro,
        newThisWeek,
        pendingVault,
        openTickets,
        pendingReports,
        pendingConnectors: pendingYT + pendingGithub + pendingAppVerifs,
        pendingYT,
        pendingGithub,
      });

      try {
        const ru = await getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(8),
          ),
        );
        setRecentUsers(ru.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {}

      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const renderPanel = () => {
    switch (activePanel) {
      case "overview":
        return (
          <OverviewPanel
            stats={stats}
            recentUsers={recentUsers}
            refreshing={refreshing}
          />
        );
      case "users":
        return <UsersPanel />;
      case "vault":
        return <VaultPanel />;
      case "connectors":
        return <ConnectorPanel />;
      case "scoring":
        return <ScoringPanel />;
      case "learn":
        return <LearnPanel />;
      case "colists":
        return <ColistsPanel />;
      case "opportunities":
        return <OpportunitiesPanel />;
      case "tickets":
        return <TicketsPanel />;
      case "reports":
        return <ReportsPanel />;
      case "feedback":
        return <FeedbackViewPanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: V.bg, color: T.primary }}
    >
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <AdminSidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          stats={stats}
        />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] md:hidden"
              style={{
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(8px)",
              }}
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-[101] md:hidden w-[240px]"
              style={{ background: V.depth }}
            >
              <AdminSidebar
                activePanel={activePanel}
                setActivePanel={(k) => {
                  setActivePanel(k);
                  setMobileSidebarOpen(false);
                }}
                collapsed={false}
                setCollapsed={() => setMobileSidebarOpen(false)}
                stats={stats}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <div
          className="h-16 flex items-center px-4 md:px-6 gap-4 border-b shrink-0"
          style={{ background: V.depth, borderColor: "rgba(255,255,255,0.05)" }}
        >
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center"
            onClick={() => setMobileSidebarOpen(true)}
            style={{ color: T.dim }}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black" style={{ color: T.primary }}>
              {PANEL_TITLES[activePanel]}
            </h1>
            {lastRefresh && (
              <p className="text-[9px]" style={{ color: T.dim }}>
                Synced {timeAgo(lastRefresh)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171",
              }}
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              SECTOR OMEGA
            </div>
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{ color: T.dim }}
            >
              <RefreshCw
                className={cn("w-4 h-4", refreshing && "animate-spin")}
              />
            </button>
            <Link
              to="/app"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-all"
              style={{ color: T.dim }}
            >
              <LogOut className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
