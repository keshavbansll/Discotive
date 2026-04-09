/**
 * @fileoverview Network.jsx v2.0 — Discotive Alliance & Social Engine
 * @description
 * Complete rewrite. Orchestrates Feed, Connections, and DM panels.
 * Rate limit enforcement UI. Mutual exclusion toasts. Full DM integration.
 * Mobile-first with proper bottom nav awareness.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageCircle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { useNetwork } from "../hooks/useNetwork";
import FeedTab from "../components/network/FeedTab";
import ConnectionsTab from "../components/network/ConnectionsTab";
import DMPanel from "../components/network/DMPanel";

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
    rate_limited: {
      bg: "bg-[#1a0e00]",
      border: "border-amber-500/25",
      icon: <Crown className="w-4 h-4 text-amber-400 shrink-0" />,
      text: "text-amber-400",
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

const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info", duration = 4500) => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      duration,
    );
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, addToast, dismissToast };
};

// ─── Tab button ───────────────────────────────────────────────────────────────
const MainTabButton = ({ id, label, icon: Icon, badge, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "relative flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 shrink-0",
      active
        ? "bg-gradient-to-r from-[#BFA264] to-[#D4AF78] text-[#030303] shadow-[0_4px_24px_rgba(191,162,100,0.35)] border border-transparent"
        : "text-[rgba(245,240,232,0.40)] hover:text-[rgba(245,240,232,0.75)] hover:bg-[rgba(255,255,255,0.04)] border border-transparent",
    )}
  >
    <Icon className="w-4 h-4" />
    <span className="hidden sm:block">{label}</span>
    {badge > 0 && (
      <span
        className={cn(
          "min-w-[16px] h-4 px-1 rounded-full text-[8px] font-black flex items-center justify-center transition-colors duration-300",
          active
            ? "bg-[#030303] text-[#BFA264] shadow-inner"
            : "bg-[#BFA264] text-[#030303]",
        )}
      >
        {badge}
      </span>
    )}
  </button>
);

// ─── Sidebar widgets ──────────────────────────────────────────────────────────
const NetworkStatsWidget = ({ stats, userData, onOpenDM, unreadDmCount }) => {
  const score = userData?.discotiveScore?.current || 0;
  const streak = userData?.discotiveScore?.streak || 0;

  return (
    <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
      <div className="p-4 border-b border-[rgba(255,255,255,0.04)]">
        <p className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest mb-2">
          Your Operator Stats
        </p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black font-mono text-[#BFA264] leading-none drop-shadow-[0_0_16px_rgba(191,162,100,0.4)]">
            {score.toLocaleString()}
          </span>
          <span className="text-[10px] text-[rgba(245,240,232,0.35)] mb-0.5">
            pts
          </span>
        </div>
        <p className="text-[10px] text-[rgba(245,240,232,0.30)] mt-1">
          {streak > 0 && `🔥 ${streak}-day streak · `}
          {userData?.tier === "PRO" ? "PRO Operator" : "Essential Tier"}
        </p>
      </div>

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

      {/* Rate limit indicator */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-[rgba(245,240,232,0.25)] uppercase tracking-widest font-bold">
            Requests Today
          </span>
          <span
            className={cn(
              "text-[9px] font-black font-mono",
              stats.dailyRequestCount >= stats.dailyRequestLimit
                ? "text-red-400"
                : "text-[rgba(245,240,232,0.40)]",
            )}
          >
            {stats.dailyRequestCount}/{stats.dailyRequestLimit}
          </span>
        </div>
        <div className="w-full h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              stats.dailyRequestCount >= stats.dailyRequestLimit
                ? "bg-red-500"
                : "bg-[#BFA264]",
            )}
            style={{
              width: `${Math.min((stats.dailyRequestCount / stats.dailyRequestLimit) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* DM button */}
      {onOpenDM && (
        <div className="px-4 pb-4">
          <button
            onClick={onOpenDM}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.20)] rounded-xl hover:bg-[rgba(191,162,100,0.10)] transition-all"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#BFA264]" />
              <span className="text-[11px] font-bold text-[#D4AF78]">
                Messages
              </span>
            </div>
            {unreadDmCount > 0 && (
              <span className="px-1.5 py-0.5 bg-[#BFA264] text-[#030303] text-[8px] font-black rounded-full">
                {unreadDmCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

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

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("feed");

  // URL-driven DM State
  const dmConvoId = searchParams.get("dm");
  const newDmUserId = searchParams.get("new_dm");
  const isDMOpen = dmConvoId !== null || newDmUserId !== null;

  // Automatically pass target user to hook if URL specifies it
  const dmInitialTarget = newDmUserId ? { id: newDmUserId } : null;

  const {
    posts,
    feedLoading,
    feedError,
    hasMorePosts,
    isPosting,
    fetchFeed,
    createPost,
    deletePost,
    toggleLike,
    fetchComments,
    addComment,
    deleteComment,
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
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    messagesLoading,
    dmLoading,
    unreadDmCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markConversationRead,
  } = useNetwork(currentUser, userData);

  useEffect(() => {
    fetchFeed(true);
    fetchNetworkData();
  }, []);

  const handleTabChange = (tab) => setActiveTab(tab);

  // ── Action wrappers ───────────────────────────────────────────────────────

  const handlePost = async (text, meta) => {
    const id = await createPost(text, meta);
    if (id) addToast("Signal transmitted to your network.", "success");
    else addToast("Transmission failed. Try again.", "error");
    return id;
  };

  const handleDeletePost = async (postId) => {
    const ok = await deletePost(postId);
    if (ok) addToast("Post removed.", "info");
    else addToast("Delete failed.", "error");
  };

  const handleAccept = async (connectionId, requesterId) => {
    await acceptAllianceRequest(connectionId, requesterId);
    addToast("+15 Discotive Score: Alliance Formed! ⚡", "success");
  };

  const handleDecline = async (connectionId) => {
    await declineAllianceRequest(connectionId);
  };

  const handleRemove = async (connectionId, partnerId) => {
    await removeAlliance(connectionId, partnerId);
    addToast("Alliance severed.", "warning");
  };

  const handleSendRequest = async (targetUser) => {
    const result = await sendAllianceRequest(targetUser);
    if (result.success) {
      addToast(
        `Alliance request transmitted to ${targetUser.identity?.firstName || "Operator"}.`,
        "info",
      );
    } else if (result.error === "rate_limited") {
      addToast(
        `Daily limit reached (${result.limit} requests). ${result.tier === "ESSENTIAL" ? "Upgrade to PRO for 50/day." : "Resets at midnight."}`,
        "rate_limited",
        6000,
      );
    } else if (result.error === "already_allied") {
      addToast("You're already allied with this operator.", "warning");
    } else if (result.error === "in_flight") {
      // Silent — request already in progress
    } else {
      addToast("Request failed. Check your connection.", "error");
    }
  };

  const handleMarkCompetitor = async (targetUser) => {
    const result = await markAsCompetitor(targetUser);
    if (result?.error) {
      addToast(result.error, "warning");
    } else if (result?.untracked) {
      addToast(`Removed from Competitor Radar.`, "info");
    } else if (result?.tracked) {
      addToast(`⚡ Target Acquired. Competitor multiplier active.`, "warning");
    }
  };

  const handleCancel = async (connectionId) => {
    await cancelOutboundRequest(connectionId);
  };

  const handleOpenDM = (targetId = null, targetUser = null) => {
    if (targetUser) {
      setSearchParams({ new_dm: targetUser.id });
    } else {
      setSearchParams({ dm: "menu" }); // Open empty DM panel
    }
  };

  const handleCloseDM = () => {
    searchParams.delete("dm");
    searchParams.delete("new_dm");
    setSearchParams(searchParams);
  };

  const mainTabs = [
    { id: "feed", label: "Feed", icon: RadioTower, badge: 0 },
    {
      id: "network",
      label: "Network",
      icon: Users,
      badge: networkStats.pendingInbound,
    },
  ];

  const uid = currentUser?.uid;
  const userTier = userData?.tier || "ESSENTIAL";

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[rgba(191,162,100,0.30)] selection:text-[#F5F0E8]">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] pointer-events-none z-0" />

      {/* Page Header */}
      <div className="sticky top-0 z-50 bg-[rgba(3,3,3,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
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

            <div className="flex items-center gap-3 md:gap-6">
              {/* Mobile stats strip */}
              <div className="flex items-center gap-3 md:hidden">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-black text-emerald-400">
                    {networkStats.alliances}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[11px] font-black text-red-400">
                    {networkStats.competitors}
                  </span>
                </div>
              </div>

              {/* Desktop stats */}
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

              {/* DM button */}
              <button
                onClick={() => handleOpenDM()}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
                  isDMOpen
                    ? "bg-[rgba(191,162,100,0.10)] border-[rgba(191,162,100,0.30)] text-[#D4AF78]"
                    : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.40)] hover:text-[#BFA264] hover:border-[rgba(191,162,100,0.20)]",
                )}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:block text-[11px] font-black uppercase tracking-widest">
                  DM
                </span>
                {unreadDmCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#BFA264] rounded-full border-2 border-[#030303] flex items-center justify-center text-[7px] font-black text-[#030303]">
                    {Math.min(unreadDmCount, 9)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5 md:py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 xl:gap-8"
            >
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
                  onDelete={handleDeletePost}
                  onFetchComments={fetchComments}
                  onAddComment={addComment}
                  onDeleteComment={deleteComment}
                />
              </div>

              <aside className="hidden lg:flex flex-col gap-4 sticky top-24 h-fit">
                <NetworkStatsWidget
                  stats={networkStats}
                  userData={userData}
                  onOpenDM={() => handleOpenDM()}
                  unreadDmCount={unreadDmCount}
                />
                <CompetitorWidget competitors={competitors} />

                {/* Suggested alliances sidebar */}
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
                        const isRateLimited =
                          networkStats.dailyRequestCount >=
                          networkStats.dailyRequestLimit;
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
                              onClick={() =>
                                !isRateLimited && handleSendRequest(user)
                              }
                              disabled={isRateLimited}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center border rounded-xl transition-all",
                                isRateLimited
                                  ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.20)] cursor-not-allowed"
                                  : "bg-[rgba(191,162,100,0.08)] border-[rgba(191,162,100,0.20)] text-[#BFA264] hover:bg-[rgba(191,162,100,0.18)]",
                              )}
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
                  userTier={userTier}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onRemove={handleRemove}
                  onCancel={handleCancel}
                  onSendRequest={handleSendRequest}
                  onMarkCompetitor={handleMarkCompetitor}
                  getConnectionStatus={getConnectionStatus}
                  onDM={(partnerId, partnerObj) =>
                    handleOpenDM(partnerId, partnerObj)
                  }
                />
              </div>

              <aside className="hidden lg:flex flex-col gap-4 sticky top-24 h-fit">
                <NetworkStatsWidget
                  stats={networkStats}
                  userData={userData}
                  onOpenDM={() => handleOpenDM()}
                  unreadDmCount={unreadDmCount}
                />
                {competitors.length > 0 && (
                  <CompetitorWidget competitors={competitors} />
                )}
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DM Panel */}
      <DMPanel
        isOpen={isDMOpen}
        onClose={handleCloseDM}
        urlConvoId={dmConvoId === "menu" ? null : dmConvoId}
        uid={uid}
        userData={userData}
        conversations={conversations}
        messages={messages}
        messagesLoading={messagesLoading}
        dmLoading={dmLoading}
        activeConversation={activeConversation}
        setActiveConversation={setActiveConversation}
        onFetchConversations={fetchConversations}
        onFetchMessages={fetchMessages}
        onSendMessage={sendMessage}
        onMarkRead={markConversationRead}
        initialTargetUser={dmInitialTarget}
        onClearInitialTarget={() => setDmInitialTarget(null)}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Network;
