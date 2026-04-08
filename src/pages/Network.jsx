/**
 * @fileoverview Network.jsx — The Discotive Alliance & Social Engine
 * @description
 * Full-featured networking hub: social feed, alliance management,
 * competitor radar. Zero onSnapshot. Optimistic UI throughout.
 * Dual-rendering: dense PC layout vs. native-feeling mobile experience.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  Zap,
  Users,
  RadioTower,
  Target,
  Crown,
  Bell,
  TrendingUp,
  Crosshair,
  ChevronRight,
  X,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { useNetwork } from "../hooks/useNetwork";
import FeedTab from "../components/network/FeedTab";
import ConnectionsTab from "../components/network/ConnectionsTab";

// ─── Toast System ─────────────────────────────────────────────────────────────
const Toast = ({ toast, onDismiss }) => {
  const colorMap = {
    success: {
      bg: "bg-[#041f10]",
      border: "border-emerald-500/25",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      text: "text-emerald-400",
    },
    error: {
      bg: "bg-[#1a0505]",
      border: "border-red-500/25",
      icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
      text: "text-red-400",
    },
    warning: {
      bg: "bg-[#1a0e00]",
      border: "border-amber-500/25",
      icon: <Zap className="w-4 h-4 text-amber-400 shrink-0" />,
      text: "text-amber-400",
    },
    info: {
      bg: "bg-[#0a0a0c]",
      border: "border-[rgba(191,162,100,0.25)]",
      icon: <Zap className="w-4 h-4 text-[#BFA264] shrink-0" />,
      text: "text-[#BFA264]",
    },
  };

  const style = colorMap[toast.type] || colorMap.info;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[1.25rem] border shadow-2xl max-w-[340px] pointer-events-auto",
        style.bg,
        style.border,
      )}
    >
      {style.icon}
      <p className={cn("text-xs font-bold flex-1", style.text)}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[rgba(245,240,232,0.25)] hover:text-[rgba(245,240,232,0.60)] transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-24 md:bottom-8 left-4 md:left-6 z-[9999] flex flex-col gap-2 pointer-events-none">
    <AnimatePresence>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </AnimatePresence>
  </div>
);

// ─── Toast Hook ───────────────────────────────────────────────────────────────
const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
};

// ─── Main Tab Button ──────────────────────────────────────────────────────────
const MainTabButton = ({ id, label, icon: Icon, badge, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0",
      active
        ? "bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.08)]"
        : "text-[rgba(245,240,232,0.40)] hover:text-[rgba(245,240,232,0.75)] hover:bg-[rgba(255,255,255,0.04)]",
    )}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:block">{label}</span>
    {badge > 0 && (
      <span
        className={cn(
          "min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center",
          active ? "bg-black text-white" : "bg-[#BFA264] text-[#030303]",
        )}
      >
        {badge}
      </span>
    )}
  </button>
);

// ─── Score Ledger Animator ────────────────────────────────────────────────────
const AnimatedScore = ({ value }) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 15 });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = Intl.NumberFormat("en-US").format(
          Math.floor(latest),
        );
      }
    });
  }, [springValue]);

  return (
    <motion.span
      ref={ref}
      className="text-3xl font-black font-mono text-[#BFA264] leading-none drop-shadow-[0_0_16px_rgba(191,162,100,0.4)]"
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      {value}
    </motion.span>
  );
};

// ─── Sidebar Widget: Network Stats ────────────────────────────────────────────
const NetworkStatsWidget = ({ stats, userData }) => {
  const score = userData?.discotiveScore?.current || 0;
  const streak = userData?.discotiveScore?.streak || 0;

  return (
    <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
      {/* Score header */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
        <p className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest mb-2">
          Your Operator Stats
        </p>
        <div className="flex items-end gap-2">
          <AnimatedScore value={score} />
          <span className="text-[10px] text-[rgba(245,240,232,0.35)] mb-0.5">
            pts
          </span>
        </div>
        <p className="text-[10px] text-[rgba(245,240,232,0.30)] mt-1">
          {streak > 0 && `🔥 ${streak}-day streak · `}
          {userData?.tier === "PRO" ? "PRO Operator" : "Essential Tier"}
        </p>
      </div>

      {/* Network breakdown */}
      <div className="p-4 space-y-2">
        {[
          {
            label: "Alliances",
            val: stats.alliances,
            icon: Users,
            color: "text-emerald-400",
          },
          {
            label: "Competitors Tracked",
            val: stats.competitors,
            icon: Crosshair,
            color: "text-red-400",
          },
          {
            label: "Pending Requests",
            val: stats.pendingInbound,
            icon: Bell,
            color: "text-amber-400",
          },
        ].map(({ label, val, icon: Icon, color }) => (
          <div
            key={label}
            className="flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-2 text-[rgba(245,240,232,0.40)]">
              <Icon className={cn("w-3.5 h-3.5", color)} />
              <span>{label}</span>
            </div>
            <span className={cn("font-black font-mono", color)}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Sidebar Widget: Top Competitors ─────────────────────────────────────────
const CompetitorWidget = ({ competitors }) => {
  if (competitors.length === 0) return null;

  return (
    <div className="rounded-[1.5rem] border border-[rgba(239,68,68,0.15)] bg-[#0A0A0A] overflow-hidden">
      <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center gap-2">
        <Crosshair className="w-4 h-4 text-red-400" />
        <p className="text-[9px] font-black text-[rgba(245,240,232,0.40)] uppercase tracking-widest">
          Competitor Radar
        </p>
      </div>
      <div className="p-3 space-y-2">
        {competitors.slice(0, 3).map((comp) => (
          <div key={comp.id} className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 rounded-full bg-[#111] border border-red-500/15 flex items-center justify-center text-xs font-black text-red-400">
              {comp.targetName?.charAt(0)?.toUpperCase() || "O"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-[rgba(245,240,232,0.70)] truncate">
                {comp.targetName}
              </p>
              {comp.targetScore > 0 && (
                <p className="text-[9px] font-mono text-red-400">
                  {comp.targetScore.toLocaleString()} pts
                </p>
              )}
            </div>
            <TrendingUp className="w-3 h-3 text-red-400/60 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN NETWORK PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Network = () => {
  const { currentUser } = useAuth();
  const { userData } = useUserData();
  const { toasts, addToast, dismissToast } = useToasts();

  const [activeTab, setActiveTab] = useState("feed");

  const {
    // Feed
    posts,
    feedLoading,
    feedError,
    hasMorePosts,
    isPosting,
    fetchFeed,
    createPost,
    toggleLike,

    // Network
    alliances,
    pendingInbound,
    pendingOutbound,
    competitors,
    suggestedUsers,
    networkLoading,
    networkStats,
    fetchNetworkData,
    sendAllianceRequest,
    acceptAllianceRequest,
    declineAllianceRequest,
    removeAlliance,
    markAsCompetitor,
    cancelOutboundRequest,
    getConnectionStatus,
  } = useNetwork(currentUser, userData);

  // ── Initial data fetch ───────────────────────────────────────────────────
  useEffect(() => {
    fetchFeed(true);
    fetchNetworkData();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // ── Action wrappers with toast feedback ──────────────────────────────────
  const handlePost = async (text) => {
    const id = await createPost(text);
    if (id) {
      addToast("Signal transmitted to your network.", "success");
    } else {
      addToast("Transmission failed. Try again.", "error");
    }
    return id;
  };

  const handleAccept = async (connectionId, requesterId) => {
    await acceptAllianceRequest(connectionId, requesterId);
    addToast("+15 Discotive Score: Alliance Formed!", "success");
  };

  const handleDecline = async (connectionId) => {
    await declineAllianceRequest(connectionId);
  };

  const handleRemove = async (connectionId, partnerId) => {
    await removeAlliance(connectionId, partnerId);
    addToast("Alliance severed.", "warning");
  };

  const handleSendRequest = async (targetUser) => {
    await sendAllianceRequest(targetUser);
    addToast(
      `Alliance request transmitted to ${
        targetUser.identity?.firstName || "Operator"
      }.`,
      "info",
    );
  };

  const handleMarkCompetitor = async (targetUser) => {
    const isTracking = competitors.some((c) => c.targetId === targetUser.id);
    await markAsCompetitor(targetUser);
    if (!isTracking) {
      addToast(`⚡ Target Acquired. Competitor multiplier active.`, "warning");
    }
  };

  const handleCancel = async (connectionId) => {
    await cancelOutboundRequest(connectionId);
  };

  const mainTabs = [
    {
      id: "feed",
      label: "Feed",
      icon: RadioTower,
      badge: 0,
    },
    {
      id: "network",
      label: "Network",
      icon: Users,
      badge: networkStats.pendingInbound,
    },
  ];

  const uid = currentUser?.uid;

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[rgba(191,162,100,0.30)] selection:text-[#F5F0E8]">
      {/* Grain overlay */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] pointer-events-none z-0" />

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-[rgba(3,3,3,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Brand + Tabs */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <RadioTower className="w-5 h-5 text-[#BFA264]" />
                <h1
                  className="text-base font-black tracking-tight text-[#F5F0E8] hidden sm:block"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  NETWORK
                </h1>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1">
                {mainTabs.map((tab) => (
                  <MainTabButton
                    key={tab.id}
                    {...tab}
                    active={activeTab === tab.id}
                    onClick={handleTabChange}
                  />
                ))}
              </div>
            </div>

            {/* Stats quick-view */}
            <div className="hidden md:flex items-center gap-4">
              {[
                {
                  label: "Alliances",
                  val: networkStats.alliances,
                  color: "text-emerald-400",
                },
                {
                  label: "Competitors",
                  val: networkStats.competitors,
                  color: "text-red-400",
                },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-right">
                  <p
                    className={cn(
                      "text-lg font-black font-mono leading-none",
                      color,
                    )}
                  >
                    {val}
                  </p>
                  <p className="text-[9px] text-[rgba(245,240,232,0.25)] uppercase tracking-widest mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ─────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5 md:py-8 relative z-10">
        <AnimatePresence mode="wait">
          {/* FEED TAB */}
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 xl:gap-8"
            >
              {/* Feed column */}
              <div>
                <FeedTab
                  uid={uid}
                  userData={userData}
                  posts={posts}
                  feedLoading={feedLoading}
                  feedError={feedError}
                  hasMorePosts={hasMorePosts}
                  isPosting={isPosting}
                  onPost={handlePost}
                  onLike={toggleLike}
                  onLoadMore={() => fetchFeed(false)}
                />
              </div>

              {/* Right sidebar — hidden on mobile */}
              <aside className="hidden lg:flex flex-col gap-4 sticky top-24 h-fit">
                <NetworkStatsWidget stats={networkStats} userData={userData} />
                <CompetitorWidget competitors={competitors} />

                {/* Suggested quick-connect */}
                {suggestedUsers.slice(0, 3).length > 0 && (
                  <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
                    <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                      <p className="text-[9px] font-black text-[rgba(245,240,232,0.35)] uppercase tracking-widest">
                        Suggested Alliances
                      </p>
                      <button
                        onClick={() => setActiveTab("network")}
                        className="text-[9px] font-black text-[#BFA264] hover:text-[#D4AF78] uppercase tracking-widest flex items-center gap-1 transition-colors"
                      >
                        See All <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-3 space-y-2">
                      {suggestedUsers.slice(0, 3).map((user) => {
                        const name =
                          `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                          user.identity?.username ||
                          "Operator";

                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-2.5 px-1 py-1.5"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#111] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-sm font-black text-[#BFA264] shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-[rgba(245,240,232,0.75)] truncate">
                                {name}
                              </p>
                              <p className="text-[9px] text-[rgba(245,240,232,0.25)] truncate">
                                {user.identity?.domain ||
                                  user.vision?.passion ||
                                  "General"}
                              </p>
                            </div>
                            <button
                              onClick={() => handleSendRequest(user)}
                              className="w-7 h-7 flex items-center justify-center bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.20)] text-[#BFA264] hover:bg-[rgba(191,162,100,0.18)] rounded-xl transition-all"
                            >
                              <Users className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </aside>
            </motion.div>
          )}

          {/* NETWORK TAB */}
          {activeTab === "network" && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 xl:gap-8"
            >
              <div>
                <ConnectionsTab
                  uid={uid}
                  alliances={alliances}
                  pendingInbound={pendingInbound}
                  pendingOutbound={pendingOutbound}
                  competitors={competitors}
                  suggestedUsers={suggestedUsers}
                  networkLoading={networkLoading}
                  networkStats={networkStats}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onRemove={handleRemove}
                  onCancel={handleCancel}
                  onSendRequest={handleSendRequest}
                  onMarkCompetitor={handleMarkCompetitor}
                  getConnectionStatus={getConnectionStatus}
                />
              </div>

              {/* Sidebar */}
              <aside className="hidden lg:flex flex-col gap-4 sticky top-24 h-fit">
                <NetworkStatsWidget stats={networkStats} userData={userData} />
                {competitors.length > 0 && (
                  <CompetitorWidget competitors={competitors} />
                )}
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── TOAST NOTIFICATIONS ───────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Network;
