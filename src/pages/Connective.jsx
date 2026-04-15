/**
 * @fileoverview Connective.jsx v3.0 — The Kinetic Vanguard
 * @description
 * V3 complete rewrite. Intelligence Hub left sidebar (Target Telemetry + Quick Profile Peek).
 * Granular refresh architecture — no auto-fetch on tab switches (Firebase quota protection).
 * Arena split-screen. Alumni clustering. Proof-of-Work feed integration.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Users,
  RadioTower,
  Crown,
  Bell,
  TrendingUp,
  Crosshair,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Activity,
  Database,
  Globe,
  Cpu,
  ArrowUpRight,
  Eye,
  Flame,
  Shield,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useAuth } from "../contexts/AuthContext";
import { useUserData, useOnboardingGate } from "../hooks/useUserData";
import { useNetwork } from "../hooks/useNetwork";
import { useConnectiveStore } from "../stores/useConnectiveStore";
import { useRTDBPresence } from "../hooks/useRTDBPresence";
import FeedTab from "../components/connective/FeedTab";
import NetworkTab from "../components/connective/NetworkTab";
import Battlefield from "../components/connective/Battlefield";
import DMPanel from "../components/connective/DMPanel";

// ─── Reusable Refresh Button ──────────────────────────────────────────────────
const RefreshButton = ({ onRefresh, label, size = "icon" }) => {
  const [spinning, setSpinning] = useState(false);
  const handle = async () => {
    if (spinning) return;
    setSpinning(true);
    await onRefresh();
    setSpinning(false);
  };
  return (
    <button
      onClick={handle}
      disabled={spinning}
      title={label || "Refresh"}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border transition-all shrink-0",
        size === "icon" ? "w-7 h-7 justify-center" : "px-3 py-1.5",
        "bg-[rgba(191,162,100,0.06)] border-[rgba(191,162,100,0.18)] text-[#BFA264]/70",
        "hover:text-[#D4AF78] hover:bg-[rgba(191,162,100,0.12)] hover:border-[rgba(191,162,100,0.30)]",
        spinning && "opacity-60 cursor-not-allowed",
      )}
    >
      <RefreshCw className={cn("w-3 h-3", spinning && "animate-spin")} />
      {size !== "icon" && label && (
        <span className="text-[9px] font-black uppercase tracking-widest">
          {label}
        </span>
      )}
    </button>
  );
};

// ─── Toast System ─────────────────────────────────────────────────────────────
const TOAST_STYLES = {
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
  refresh: {
    bg: "bg-[#050505]",
    border: "border-[rgba(191,162,100,0.25)]",
    icon: <RefreshCw className="w-4 h-4 text-[#BFA264] shrink-0" />,
    text: "text-[#BFA264]",
  },
  rate_limited: {
    bg: "bg-[#1a0e00]",
    border: "border-amber-500/25",
    icon: <Crown className="w-4 h-4 text-amber-400 shrink-0" />,
    text: "text-amber-400",
  },
};

const ToastItem = ({ toast, onDismiss }) => {
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 22, stiffness: 280 }}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-[1.25rem] border shadow-2xl max-w-[340px] pointer-events-auto",
        s.bg,
        s.border,
      )}
    >
      {s.icon}
      <p className={cn("text-xs font-bold flex-1", s.text)}>{toast.message}</p>
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
  <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[9999] flex flex-col items-end gap-2 pointer-events-none">
    <AnimatePresence>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
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
  const dismissToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  );
  return { toasts, addToast, dismissToast };
};

// ─── Intelligence Hub ─────────────────────────────────────────────────────────
const IntelligenceHub = ({
  peekUser,
  competitors,
  onRefreshTargets,
  isCollapsed = false,
}) => {
  const [view, setView] = useState("telemetry");
  const [prevPeekUser, setPrevPeekUser] = useState(peekUser);
  const [isScanning, setIsScanning] = useState(false);
  const { liveEvents, onlineCount } = useConnectiveStore();

  // 1. Automatically switch to Profile Peek (Render Phase Update)
  if (peekUser !== prevPeekUser) {
    setPrevPeekUser(peekUser);
    if (peekUser) setView("peek");
  }

  // 2. Terminal Ambient Log Generator integrating Global RTDB Telemetry
  const logs = useMemo(() => {
    const newLogs = [];
    const now = new Date();

    if (liveEvents?.length > 0) {
      liveEvents.forEach((evt, idx) => {
        newLogs.push({
          text: `[GLOBAL] @${evt.username || "operator"} connected.`,
          type: "green",
          timeOffset: -10 - idx,
        });
      });
    }

    if (competitors && competitors.length > 0) {
      competitors.forEach((c, idx) => {
        const name =
          c.targetUsername || c.targetName?.split(" ")[0] || "Operator";
        const score = c.targetScore || 0;
        const streak = c.targetStreak || 0;
        const vault = c.targetVault || 0;

        newLogs.push({
          text: `@${name} currently at ${score.toLocaleString()} pts.`,
          type: "dim",
          timeOffset: idx * 5,
        });

        if (streak > 0) {
          newLogs.push({
            text: `@${name} maintains a ${streak}d execution streak.`,
            type: "red",
            timeOffset: idx * 5 + 2,
          });
        } else {
          newLogs.push({
            text: `@${name} broke consistency. Streak reset to 0.`,
            type: "green",
            timeOffset: idx * 5 + 2,
          });
        }

        if (vault > 0) {
          newLogs.push({
            text: `@${name} secured ${vault} asset(s) in Vault.`,
            type: "red",
            timeOffset: idx * 5 + 4,
          });
        }
      });
    }
    newLogs.sort((a, b) => a.timeOffset - b.timeOffset);

    const finalLogs = newLogs.map((l, i) => {
      const d = new Date(now.getTime() - (newLogs.length - i) * 15000);
      const timeStr = d.toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return {
        text: `[${timeStr}] ${l.text}`,
        type: l.type,
      };
    });

    return finalLogs.slice(-15);
  }, [liveEvents, competitors]);

  const handleRefresh = async () => {
    setIsScanning(true);
    await onRefreshTargets();
    setTimeout(() => setIsScanning(false), 1500);
  };

  return (
    <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden flex flex-col h-full flex-1">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#BFA264]" />
          <span className="text-[9px] font-black text-[rgba(245,240,232,0.50)] uppercase tracking-widest">
            Intelligence Hub
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: "telemetry", icon: Activity, label: "Target Telemetry" },
            { id: "peek", icon: Eye, label: "Profile Peek" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              title={label}
              className={cn(
                "w-6 h-6 rounded-lg flex items-center justify-center transition-all",
                view === id
                  ? "bg-[rgba(191,162,100,0.15)] text-[#BFA264]"
                  : "text-[rgba(245,240,232,0.25)] hover:text-white",
              )}
            >
              <Icon className="w-3 h-3" />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-1 overflow-y-auto custom-scrollbar flex flex-col"
          >
            <AnimatePresence mode="wait">
              {view === "telemetry" && (
                <motion.div
                  key="tel"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="p-4 flex flex-col h-full min-h-[400px]"
                >
                  <div className="flex items-center justify-between shrink-0 mb-4">
                    <p className="text-[8px] font-black text-[rgba(245,240,232,0.25)] uppercase tracking-widest flex items-center gap-2">
                      <span>
                        Target Feed · {Math.min(competitors.length, 10)}/10
                        Slots
                      </span>
                      <span className="text-[#BFA264] flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                        {onlineCount} ONLINE
                      </span>
                    </p>
                    <RefreshButton onRefresh={handleRefresh} />
                  </div>

                  {/* Active Target Roster */}
                  {competitors.length > 0 && (
                    <div
                      className={cn(
                        "space-y-1.5 mb-4 shrink-0 transition-opacity",
                        isScanning && "opacity-50",
                      )}
                    >
                      {competitors.slice(0, 4).map((target) => (
                        <div
                          key={target.targetId}
                          className="flex items-center justify-between px-3 py-2 rounded-[1rem] bg-gradient-to-r from-[rgba(255,255,255,0.02)] to-transparent border border-[rgba(255,255,255,0.03)]"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-[10px] font-black text-[#BFA264] overflow-hidden shrink-0">
                              {target.targetAvatar ? (
                                <img
                                  src={target.targetAvatar}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (
                                  target.targetName?.charAt(0) || "O"
                                ).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-[#F5F0E8] truncate max-w-[100px]">
                                {target.targetName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black font-mono text-[rgba(245,240,232,0.6)]">
                              {target.targetScore?.toLocaleString() || 0}
                            </span>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse" />
                          </div>
                        </div>
                      ))}
                      {competitors.length > 4 && (
                        <p className="text-[8px] text-[rgba(245,240,232,0.20)] text-center font-black tracking-widest uppercase pt-1">
                          + {competitors.length - 4} More Tracked
                        </p>
                      )}
                    </div>
                  )}

                  {/* Live Terminal Log */}
                  <div className="flex-1 flex flex-col bg-[#030303] rounded-xl border border-[rgba(255,255,255,0.04)] p-3 relative overflow-hidden min-h-[140px] shadow-inner">
                    <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-[#030303] to-transparent z-10 pointer-events-none" />
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-end gap-1.5 pt-4 pb-1">
                      {logs.map((log, i) => (
                        <p
                          key={i}
                          className={cn(
                            "text-[9px] font-mono leading-relaxed",
                            log.type === "red"
                              ? "text-red-400"
                              : log.type === "green"
                                ? "text-emerald-400"
                                : "text-[rgba(245,240,232,0.30)]",
                          )}
                        >
                          {log.text}
                        </p>
                      ))}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-mono text-[#BFA264] animate-pulse">
                          _
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Intelligence */}
                  {competitors.length > 0 ? (
                    <div className="mt-4 p-3.5 rounded-[1.25rem] bg-gradient-to-b from-[rgba(191,162,100,0.08)] to-[rgba(191,162,100,0.02)] border border-[rgba(191,162,100,0.15)] shrink-0">
                      <div className="flex items-start gap-2.5">
                        <Activity className="w-3.5 h-3.5 text-[#BFA264] mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black text-[#D4AF78] uppercase tracking-widest mb-1.5">
                            Algorithmic Insight
                          </p>
                          <p className="text-[10px] text-[rgba(245,240,232,0.60)] leading-relaxed">
                            Radar locked on {competitors.length} node
                            {competitors.length !== 1 ? "s" : ""}. Targets show
                            consistent velocity. Maintain execution streaks to
                            outpace network averages.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 p-4 rounded-[1.25rem] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] text-center shrink-0">
                      <p className="text-[10px] text-[rgba(245,240,232,0.30)] leading-relaxed">
                        Radar empty. Mark targets in the Global tab to populate
                        live telemetry feeds.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {view === "peek" && (
                <motion.div
                  key="peek"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="p-4 flex flex-col h-full min-h-[400px]"
                >
                  {!peekUser ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                      <Eye className="w-10 h-10 text-[rgba(245,240,232,0.06)] mx-auto mb-3" />
                      <p className="text-[11px] font-black text-[rgba(245,240,232,0.30)]">
                        Operator Inspector
                      </p>
                      <p className="text-[9px] text-[rgba(245,240,232,0.18)] mt-1.5 leading-relaxed max-w-[180px] mx-auto">
                        Click any operator card to inspect their profile here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#111] border border-[#BFA264]/40 flex items-center justify-center text-base font-black text-[#BFA264] overflow-hidden shrink-0">
                          {peekUser?.identity?.avatarUrl ? (
                            <img
                              src={peekUser.identity.avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            peekUser?.identity?.firstName
                              ?.charAt(0)
                              ?.toUpperCase() || "O"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#F5F0E8] truncate">
                            {`${peekUser?.identity?.firstName || ""} ${peekUser?.identity?.lastName || ""}`.trim() ||
                              "Operator"}
                          </p>
                          {peekUser?.identity?.username && (
                            <p className="text-[10px] text-[rgba(245,240,232,0.35)] font-mono">
                              @{peekUser.identity.username}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          {
                            label: "Score",
                            val: (
                              peekUser?.discotiveScore?.current || 0
                            ).toLocaleString(),
                            color: "text-[#BFA264]",
                          },
                          {
                            label: "Assets",
                            val: peekUser?.vault?.length || 0,
                            color: "text-emerald-400",
                          },
                          {
                            label: "Streak",
                            val: `${peekUser?.discotiveScore?.streak || 0}d`,
                            color: "text-orange-400",
                          },
                        ].map(({ label, val, color }) => (
                          <div
                            key={label}
                            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl p-2 text-center"
                          >
                            <p
                              className={cn(
                                "text-sm font-black font-mono",
                                color,
                              )}
                            >
                              {val}
                            </p>
                            <p className="text-[8px] text-[rgba(245,240,232,0.25)] uppercase tracking-widest mt-0.5">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {peekUser?.identity?.domain && (
                        <p className="text-[10px] text-[rgba(245,240,232,0.40)] px-1">
                          {peekUser.identity.domain}
                          {peekUser?.identity?.niche
                            ? ` · ${peekUser.identity.niche}`
                            : ""}
                        </p>
                      )}

                      {peekUser?.skills?.alignedSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {peekUser.skills.alignedSkills
                            .slice(0, 4)
                            .map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-[8px] font-bold text-[rgba(245,240,232,0.45)]"
                              >
                                {s}
                              </span>
                            ))}
                        </div>
                      )}

                      <a
                        href={`/@${peekUser?.identity?.username || ""}`}
                        className="flex items-center justify-center gap-1.5 w-full py-2 bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.20)] text-[#BFA264] text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[rgba(191,162,100,0.14)] transition-all"
                      >
                        View Full Profile <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Network Stats Widget ─────────────────────────────────────────────────────
const NetworkStatsWidget = ({
  stats,
  userData,
  onOpenDM,
  unreadDmCount,
  onRefresh,
  isCollapsed = false,
}) => {
  const score = userData?.discotiveScore?.current || 0;
  const streak = userData?.discotiveScore?.streak || 0;
  return (
    <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
      <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest mb-1">
            Operator Stats
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
            {streak > 0 && `🔥 ${streak}d streak · `}
            {userData?.tier === "PRO" ? "PRO" : "Essential"}
          </p>
        </div>
        <RefreshButton onRefresh={onRefresh} />
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col"
          >
            <div className="p-4 space-y-2">
              {[
                {
                  label: "Alliances",
                  val: stats.alliances,
                  icon: Users,
                  color: "text-emerald-400",
                },
                {
                  label: "Competitors",
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
                  <span className={cn("font-black font-mono", color)}>
                    {val}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-4 pb-3">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Shared Side Layout ───────────────────────────────────────────────────────
const SideLayout = ({
  children,
  rightChildren,
  peekUser,
  competitors,
  onRefreshTargets,
  networkStats,
  userData,
  onOpenDM,
  unreadDmCount,
  onRefreshNetwork,
  isExpanded = false,
  expandedContent = null,
}) => (
  <div className="flex flex-col gap-4 xl:gap-5 w-full max-w-[1600px] mx-auto">
    {/* TOP COMMAND ROW */}
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] xl:grid-cols-[340px_1fr_360px] 2xl:grid-cols-[380px_1fr_360px] gap-4 xl:gap-5">
      <aside className="hidden lg:flex flex-col sticky top-24 self-start w-full z-20">
        <IntelligenceHub
          peekUser={peekUser}
          competitors={competitors}
          onRefreshTargets={onRefreshTargets}
          isCollapsed={isExpanded}
        />
      </aside>

      <div className="min-w-0 flex flex-col z-20 w-full h-full">{children}</div>

      <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start w-full z-20">
        <NetworkStatsWidget
          stats={networkStats}
          userData={userData}
          onOpenDM={onOpenDM}
          unreadDmCount={unreadDmCount}
          onRefresh={onRefreshNetwork}
          isCollapsed={isExpanded}
        />
        <AnimatePresence>
          {!isExpanded && rightChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {rightChildren}
            </motion.div>
          )}
        </AnimatePresence>
      </aside>
    </div>

    {/* BOTTOM EXECUTION ROW (Full Width) */}
    <AnimatePresence>
      {isExpanded && expandedContent && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{
            opacity: 1,
            y: 0,
            height: "80vh",
            transition: {
              delay: 0.35,
              type: "spring",
              damping: 24,
              stiffness: 220,
            },
          }}
          exit={{
            opacity: 0,
            y: -20,
            height: 0,
            transition: { type: "spring", damping: 24, stiffness: 220 },
          }}
          className="w-full z-10"
        >
          {expandedContent}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN NETWORK PAGE V3
// ═══════════════════════════════════════════════════════════════════════════════
const Connective = () => {
  const { currentUser } = useAuth();
  const { userData } = useUserData();
  const { requireOnboarding } = useOnboardingGate();

  // ── SYSTEM TELEMETRY INIT ──
  useRTDBPresence(userData);
  const { toasts, addToast, dismissToast } = useToasts();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive active tab directly from URL. Defaults to 'feed' if not /network
  const activeTab = location.pathname.includes("/network") ? "network" : "feed";

  // Tab change handler that preserves existing query parameters (like ?dm=123)
  const handleTabChange = (tabId) => {
    navigate(`/app/connective/${tabId}${location.search}`);
  };

  const [peekUser, setPeekUser] = useState(null);
  const [isBattlefieldExpanded, setIsBattlefieldExpanded] = useState(false);

  const dmConvoId = searchParams.get("dm");
  const newDmUserId = searchParams.get("new_dm");
  const isDMOpen = dmConvoId !== null || newDmUserId !== null;
  const dmInitialTarget = newDmUserId ? { id: newDmUserId } : null;

  const {
    isAdmin,
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
    deleteMessage,
    editMessage,
    emitTyping,
    isPartnerTyping,
  } = useNetwork(currentUser, userData);

  // ── GRANULAR refresh handlers (manual only — no auto-fetch on tab change) ──
  const handleRefreshFeed = useCallback(async () => {
    await fetchFeed(true);
    addToast("Feed synced.", "refresh", 2500);
  }, [fetchFeed, addToast]);

  const handleRefreshNetwork = useCallback(async () => {
    await fetchNetworkData();
    addToast("Network synced.", "refresh", 2500);
  }, [fetchNetworkData, addToast]);

  const handleRefreshTargets = useCallback(async () => {
    addToast("Target feed refreshed.", "refresh", 2500);
  }, [addToast]);

  // Initial mount — one fetch only
  useEffect(() => {
    fetchFeed(true);
    fetchNetworkData();
  }, []); // eslint-disable-line

  const handlePost = async (text, meta) => {
    if (!requireOnboarding("network_post")) return null;
    const id = await createPost(text, meta);
    if (id) addToast("Signal transmitted.", "success");
    else addToast("Transmission failed.", "error");
    return id;
  };

  const handleDeletePost = async (postId) => {
    const ok = await deletePost(postId);
    if (ok) addToast("Post removed.", "info");
    else addToast("Delete failed.", "error");
  };

  const handleAccept = async (connectionId, requesterId) => {
    if (!requireOnboarding("network_accept")) return;
    await acceptAllianceRequest(connectionId, requesterId);
    addToast("+15 pts: Alliance Formed! ⚡", "success");
  };

  const handleSendRequest = async (targetUser) => {
    if (!requireOnboarding("network_connect")) return;
    const result = await sendAllianceRequest(targetUser);
    if (result.success) {
      addToast(
        `Request sent to ${targetUser.identity?.firstName || "Operator"}.`,
        "info",
      );
    } else if (result.error === "rate_limited") {
      addToast(
        `Daily limit (${result.limit}). ${result.tier === "ESSENTIAL" ? "Upgrade for 50/day." : "Resets midnight."}`,
        "rate_limited",
        6000,
      );
    } else if (result.error === "already_allied") {
      addToast("Already allied.", "warning");
    } else if (result.error !== "in_flight") {
      addToast("Request failed.", "error");
    }
  };

  const handleMarkCompetitor = async (targetUser) => {
    if (!requireOnboarding("network_competitor")) return;
    const result = await markAsCompetitor(targetUser);
    if (result?.error) addToast(result.error, "warning");
    else if (result?.untracked) addToast("Removed from Radar.", "info");
    else if (result?.tracked) addToast("⚡ Target Acquired.", "warning");
  };

  const handleOpenDM = (targetId = null, targetUser = null) => {
    if (!requireOnboarding("network_dm")) return;
    if (targetUser) setSearchParams({ new_dm: targetUser.id });
    else setSearchParams({ dm: "menu" });
  };

  const handleCloseDM = () => {
    searchParams.delete("dm");
    searchParams.delete("new_dm");
    setSearchParams(searchParams);
  };

  const handlePeekOperator = useCallback((user) => setPeekUser(user), []);

  const uid = currentUser?.uid;
  const userTier = userData?.tier || "ESSENTIAL";

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[rgba(191,162,100,0.30)] selection:text-[#F5F0E8]">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] pointer-events-none z-0" />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-[rgba(3,3,3,0.92)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <RadioTower className="w-5 h-5 text-[#BFA264]" />
                <h1
                  className="text-base font-black tracking-tight text-[#F5F0E8] hidden sm:block uppercase"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Connective / {activeTab === "network" ? "Network" : "Feed"}
                </h1>

                {/* Mobile Tabs */}
                <div className="flex sm:hidden items-center bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-0.5 ml-1">
                  <button
                    onClick={() => handleTabChange("feed")}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === "feed"
                        ? "bg-[rgba(191,162,100,0.15)] text-[#BFA264] shadow-[0_0_10px_rgba(191,162,100,0.1)]"
                        : "text-[rgba(245,240,232,0.40)] hover:text-white",
                    )}
                  >
                    Feed
                  </button>
                  <button
                    onClick={() => handleTabChange("network")}
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      activeTab === "network"
                        ? "bg-[rgba(191,162,100,0.15)] text-[#BFA264] shadow-[0_0_10px_rgba(191,162,100,0.1)]"
                        : "text-[rgba(245,240,232,0.40)] hover:text-white",
                    )}
                  >
                    Network
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-6">
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

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5 md:py-8 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "feed" && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SideLayout
                peekUser={peekUser}
                competitors={competitors}
                onRefreshTargets={handleRefreshTargets}
                networkStats={networkStats}
                userData={userData}
                onOpenDM={() => handleOpenDM()}
                unreadDmCount={unreadDmCount}
                onRefreshNetwork={handleRefreshNetwork}
                rightChildren={
                  suggestedUsers.slice(0, 3).length > 0 && (
                    <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
                      <div className="p-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
                        <p className="text-[9px] font-black text-[rgba(245,240,232,0.35)] uppercase tracking-widest">
                          Suggested
                        </p>
                        <button
                          onClick={() => handleTabChange("network")}
                          className="hidden md:flex text-[9px] font-black text-[#BFA264] hover:text-[#D4AF78] uppercase tracking-widest items-center gap-1"
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
                          const isRL =
                            networkStats.dailyRequestCount >=
                            networkStats.dailyRequestLimit;
                          return (
                            <div
                              key={user.id}
                              className="flex items-center gap-2.5 px-1 py-1.5 cursor-pointer hover:bg-[rgba(255,255,255,0.02)] rounded-xl transition-colors"
                              onClick={() => handlePeekOperator(user)}
                            >
                              <div className="w-8 h-8 rounded-full bg-[#111] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-sm font-black text-[#BFA264] shrink-0">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-[rgba(245,240,232,0.75)] truncate">
                                  {name}
                                </p>
                                <p className="text-[9px] text-[rgba(245,240,232,0.25)] truncate">
                                  {user.identity?.domain || "General"}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  !isRL && handleSendRequest(user);
                                }}
                                disabled={isRL}
                                className={cn(
                                  "w-7 h-7 flex items-center justify-center border rounded-xl transition-all",
                                  isRL
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
                  )
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
                    Execution Feed
                  </p>
                  <RefreshButton
                    onRefresh={handleRefreshFeed}
                    label="Refresh"
                    size="md"
                  />
                </div>
                <FeedTab
                  isAdmin={isAdmin}
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
                  onPeekOperator={handlePeekOperator}
                />
              </SideLayout>
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div
              key="network"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <SideLayout
                peekUser={peekUser}
                competitors={competitors}
                onRefreshTargets={handleRefreshTargets}
                networkStats={networkStats}
                userData={userData}
                onOpenDM={() => handleOpenDM()}
                unreadDmCount={unreadDmCount}
                onRefreshNetwork={handleRefreshNetwork}
                isExpanded={isBattlefieldExpanded}
                expandedContent={
                  <Battlefield
                    userData={userData}
                    competitors={competitors}
                    onCollapse={() => setIsBattlefieldExpanded(false)}
                  />
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
                    Kinetic Battlefield
                  </p>
                  <RefreshButton
                    onRefresh={handleRefreshNetwork}
                    label="Refresh"
                    size="md"
                  />
                </div>
                <NetworkTab
                  uid={uid}
                  userData={userData}
                  alliances={alliances}
                  pendingInbound={pendingInbound}
                  pendingOutbound={pendingOutbound}
                  competitors={competitors}
                  suggestedUsers={suggestedUsers}
                  networkLoading={networkLoading}
                  networkStats={networkStats}
                  userTier={userTier}
                  onAccept={handleAccept}
                  onDecline={declineAllianceRequest}
                  onRemove={removeAlliance}
                  onCancel={cancelOutboundRequest}
                  onSendRequest={handleSendRequest}
                  onMarkCompetitor={handleMarkCompetitor}
                  getConnectionStatus={getConnectionStatus}
                  onDM={(partnerId, partnerObj) =>
                    handleOpenDM(partnerId, partnerObj)
                  }
                  onPeekOperator={handlePeekOperator}
                  onExpandBattlefield={setIsBattlefieldExpanded}
                  isBattlefieldExpanded={isBattlefieldExpanded}
                />
              </SideLayout>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
        onDeleteMessage={deleteMessage}
        onEditMessage={editMessage}
        onTyping={emitTyping}
        isPartnerTyping={isPartnerTyping}
        initialTargetUser={dmInitialTarget}
        onClearInitialTarget={() => {}}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default Connective;
