/**
 * @fileoverview NetworkTab v4.0 — Kinetic Battlefield Update
 * CHANGELOG vs v3:
 *  ✅ "Arena" → "Battlefield" nomenclature across all labels
 *  ✅ Battlefield expanded view — in-place morphing layout (no modal)
 *  ✅ Data hydration fix: userData.discotiveScore.current properly bound
 *  ✅ competitors.targetScore properly mapped and displayed
 *  ✅ Animated expand: NetworkTab swipes LEFT, Battlefield slides in RIGHT
 *  ✅ All existing sub-panels preserved unchanged
 */

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  Check,
  X,
  UserPlus,
  Crown,
  Zap,
  Shield,
  Search,
  Crosshair,
  Link2Off,
  Globe,
  Loader2,
  Send,
  Bell,
  AlertTriangle,
  MessageCircle,
  Info,
  GraduationCap,
  Building2,
  Heart,
  Target,
  TrendingUp,
  TrendingDown,
  Database,
  ChevronDown,
  Minus,
  Maximize2,
  Flame,
} from "lucide-react";
import { cn } from "../../lib/cn";
import Battlefield from "./Battlefield";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// ─── Sub-tab Button ───────────────────────────────────────────────────────────
const SubTab = ({ id, label, icon: Icon, count, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={cn(
      "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300",
      active
        ? "bg-[#0A0A0A] text-[#D4AF78] border border-[#BFA264] shadow-[0_0_12px_rgba(191,162,100,0.15)]"
        : "text-[rgba(245,240,232,0.35)] border border-transparent hover:text-[rgba(245,240,232,0.70)] hover:bg-[rgba(255,255,255,0.04)]",
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    <span className="hidden sm:block">{label}</span>
    {count > 0 && (
      <span
        className={cn(
          "min-w-[18px] h-4 px-1 rounded-full text-[8px] flex items-center justify-center font-black",
          active
            ? "bg-[#BFA264] text-[#030303]"
            : "bg-[rgba(255,255,255,0.08)] text-[rgba(245,240,232,0.50)]",
        )}
      >
        {count > 99 ? "99+" : count}
      </span>
    )}
  </button>
);

// ─── Confirm Action ───────────────────────────────────────────────────────────
const ConfirmAction = ({
  message,
  onConfirm,
  onCancel,
  destructive = true,
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="flex items-center gap-3 p-3 bg-[#111] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-xl"
  >
    <AlertTriangle
      className={cn(
        "w-4 h-4 shrink-0",
        destructive ? "text-red-400" : "text-amber-400",
      )}
    />
    <p className="text-[11px] font-bold text-[rgba(245,240,232,0.70)] flex-1">
      {message}
    </p>
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={onConfirm}
        className={cn(
          "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all",
          destructive
            ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
            : "bg-[#BFA264]/10 border-[#BFA264]/25 text-[#BFA264] hover:bg-[#BFA264]/20",
        )}
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] text-[rgba(245,240,232,0.40)] hover:text-white transition-all"
      >
        Cancel
      </button>
    </div>
  </motion.div>
);

// ─── Rate Limit Bar ───────────────────────────────────────────────────────────
const RateLimitBar = ({ count, limit, tier }) => {
  const pct = Math.min((count / limit) * 100, 100);
  const isNearLimit = pct >= 80;
  const isAtLimit = count >= limit;
  return (
    <div className="flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[rgba(255,255,255,0.05)] rounded-xl">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
            Alliance Requests Today
          </span>
          <span
            className={cn(
              "text-[9px] font-black font-mono",
              isAtLimit
                ? "text-red-400"
                : isNearLimit
                  ? "text-amber-400"
                  : "text-[rgba(245,240,232,0.40)]",
            )}
          >
            {count} / {limit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              isAtLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-amber-500"
                  : "bg-[#BFA264]",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      {isAtLimit && tier === "ESSENTIAL" && (
        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer hover:bg-amber-500/15 transition-colors shrink-0">
          <Crown className="w-3 h-3 text-amber-500" />
          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
            Upgrade
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Operator Card ─────────────────────────────────────────────────────────────
const OperatorCard = ({
  user,
  actions,
  badgeText,
  badgeColor = "amber",
  onPeek,
}) => {
  const name =
    `${user?.identity?.firstName || ""} ${user?.identity?.lastName || ""}`.trim() ||
    user?.identity?.username ||
    "Operator";
  const initials = name.charAt(0).toUpperCase() || "O";
  const score = user?.discotiveScore?.current || 0;
  const domain = user?.identity?.domain || user?.vision?.passion || "General";

  const badgeClasses = {
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  };

  return (
    <div
      className="flex items-center gap-3.5 p-3.5 rounded-[1.25rem] border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] hover:border-[rgba(191,162,100,0.25)] transition-all duration-300 group cursor-pointer"
      onClick={() => onPeek?.(user)}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#111] border border-[#BFA264]/40 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden">
          {user?.identity?.avatarUrl || user?.avatarUrl ? (
            <img
              src={user?.identity?.avatarUrl || user?.avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {user?.tier === "PRO" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
            <Crown className="w-2 h-2 text-black" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-bold text-[#F5F0E8] truncate">{name}</p>
          {badgeText && (
            <span
              className={cn(
                "shrink-0 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                badgeClasses[badgeColor] || badgeClasses.amber,
              )}
            >
              {badgeText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[rgba(245,240,232,0.30)]">
          {user?.identity?.username && (
            <span className="font-mono">@{user.identity.username}</span>
          )}
          {domain && (
            <>
              <span className="text-[rgba(255,255,255,0.15)]">·</span>
              <span>{domain}</span>
            </>
          )}
          {score > 0 && (
            <>
              <span className="text-[rgba(255,255,255,0.15)]">·</span>
              <span className="text-[#BFA264] font-bold font-mono">
                {score.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
      {actions && (
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

// ─── Alliances Panel ──────────────────────────────────────────────────────────
const AlliancesPanel = ({
  alliances,
  uid,
  onRemove,
  onMarkCompetitor,
  competitors,
  onDM,
  onPeek,
}) => {
  const [search, setSearch] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return alliances;
    const q = search.toLowerCase();
    return alliances.filter((c) => {
      const name = c.requesterId === uid ? c.receiverName : c.requesterName;
      return name?.toLowerCase().includes(q);
    });
  }, [alliances, uid, search]);

  if (alliances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.15)] flex items-center justify-center mb-4">
          <Users className="w-7 h-7 text-[rgba(191,162,100,0.4)]" />
        </div>
        <p className="text-base font-black text-[#F5F0E8] mb-1.5">
          No Alliances Forged
        </p>
        <p className="text-sm text-[rgba(245,240,232,0.30)] max-w-[240px] leading-relaxed">
          Use the Radar tab to discover operators and send Alliance requests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(245,240,232,0.20)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search alliances..."
          className="w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[rgba(191,162,100,0.30)] transition-all"
        />
      </div>

      <AnimatePresence>
        {confirmRemove && (
          <ConfirmAction
            message="Severing this Alliance removes you from each other's network."
            onConfirm={() => {
              onRemove(confirmRemove.id, confirmRemove.partnerId);
              setConfirmRemove(null);
            }}
            onCancel={() => setConfirmRemove(null)}
            destructive
          />
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-[rgba(245,240,232,0.25)] py-8">
          No alliances match your search.
        </p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((conn) => {
            const isRequester = conn.requesterId === uid;
            const partnerName = isRequester
              ? conn.receiverName
              : conn.requesterName;
            const partnerId = isRequester ? conn.receiverId : conn.requesterId;
            const isCompetitor = competitors?.some(
              (c) => c.targetId === partnerId,
            );
            const partnerObj = {
              id: partnerId,
              identity: {
                firstName: partnerName?.split(" ")[0] || partnerName,
                lastName: partnerName?.split(" ").slice(1).join(" ") || "",
                username: isRequester
                  ? conn.receiverUsername
                  : conn.requesterUsername,
                domain: isRequester
                  ? conn.receiverDomain
                  : conn.requesterDomain,
                avatarUrl: isRequester
                  ? conn.receiverAvatar
                  : conn.requesterAvatar,
              },
              discotiveScore: { current: 0 },
            };
            return (
              <OperatorCard
                key={conn.id}
                user={partnerObj}
                badgeText="Alliance"
                badgeColor="emerald"
                onPeek={onPeek}
                actions={
                  <div className="flex items-center gap-1.5">
                    {onDM && (
                      <button
                        onClick={() => onDM(partnerId, partnerObj)}
                        title="Message"
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        onMarkCompetitor({
                          id: partnerId,
                          identity: partnerObj.identity,
                        })
                      }
                      title={
                        isCompetitor
                          ? "Remove from Battlefield"
                          : "Add to Battlefield"
                      }
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all border",
                        isCompetitor
                          ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          : "bg-[#111] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8",
                      )}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmRemove({ id: conn.id, partnerId })
                      }
                      title="Remove Alliance"
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 transition-all"
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Requests Panel ───────────────────────────────────────────────────────────
const RequestsPanel = ({
  pendingInbound,
  pendingOutbound,
  uid,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const [view, setView] = useState("inbound");
  const [confirmDecline, setConfirmDecline] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [accepting, setAccepting] = useState(null);

  const handleAccept = async (connectionId, requesterId) => {
    setAccepting(connectionId);
    await onAccept(connectionId, requesterId);
    setAccepting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          {
            id: "inbound",
            label: "Inbound",
            icon: Bell,
            count: pendingInbound.length,
          },
          {
            id: "outbound",
            label: "Sent",
            icon: Send,
            count: pendingOutbound.length,
          },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
              view === id
                ? "bg-[#BFA264] text-[#030303] border-[#BFA264] shadow-[0_2px_10px_rgba(191,162,100,0.2)]"
                : "bg-[#0A0A0A] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.70)]",
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-black",
                  view === id
                    ? "bg-[#030303] text-[#BFA264]"
                    : "bg-[#BFA264] text-[#030303]",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {confirmDecline && (
          <ConfirmAction
            message="Reject this alliance request?"
            onConfirm={() => {
              onDecline(confirmDecline);
              setConfirmDecline(null);
            }}
            onCancel={() => setConfirmDecline(null)}
            destructive
          />
        )}
        {confirmCancel && (
          <ConfirmAction
            message="Withdraw this alliance request?"
            onConfirm={() => {
              onCancel(confirmCancel);
              setConfirmCancel(null);
            }}
            onCancel={() => setConfirmCancel(null)}
            destructive={false}
          />
        )}
      </AnimatePresence>

      {view === "inbound" &&
        (pendingInbound.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Bell className="w-8 h-8 text-[rgba(245,240,232,0.10)] mb-3" />
            <p className="text-sm font-black text-[rgba(245,240,232,0.35)]">
              No pending requests
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingInbound.map((conn) => {
              const senderObj = {
                id: conn.requesterId,
                identity: {
                  firstName:
                    conn.requesterName?.split(" ")[0] || conn.requesterName,
                  lastName:
                    conn.requesterName?.split(" ").slice(1).join(" ") || "",
                  username: conn.requesterUsername,
                  domain: conn.requesterDomain,
                  avatarUrl: conn.requesterAvatar,
                },
              };
              return (
                <OperatorCard
                  key={conn.id}
                  user={senderObj}
                  badgeText="Wants Alliance"
                  badgeColor="amber"
                  actions={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAccept(conn.id, conn.requesterId)}
                        disabled={accepting === conn.id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest disabled:opacity-50"
                      >
                        {accepting === conn.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span className="hidden sm:block">Accept</span>
                      </button>
                      <button
                        onClick={() => setConfirmDecline(conn.id)}
                        className="w-8 h-8 flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        ))}

      {view === "outbound" &&
        (pendingOutbound.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Send className="w-8 h-8 text-[rgba(245,240,232,0.10)] mb-3" />
            <p className="text-sm font-black text-[rgba(245,240,232,0.35)]">
              No sent requests
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingOutbound.map((conn) => {
              const receiverObj = {
                id: conn.receiverId,
                identity: {
                  firstName:
                    conn.receiverName?.split(" ")[0] || conn.receiverName,
                  lastName:
                    conn.receiverName?.split(" ").slice(1).join(" ") || "",
                  username: conn.receiverUsername,
                  domain: conn.receiverDomain,
                  avatarUrl: conn.receiverAvatar,
                },
              };
              return (
                <OperatorCard
                  key={conn.id}
                  user={receiverObj}
                  badgeText="Pending"
                  badgeColor="sky"
                  actions={
                    <button
                      onClick={() => setConfirmCancel(conn.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.40)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 text-[10px] font-black rounded-xl transition-all"
                    >
                      <X className="w-3 h-3" />
                      <span className="hidden sm:block">Withdraw</span>
                    </button>
                  }
                />
              );
            })}
          </div>
        ))}
    </div>
  );
};

// ─── BATTLEFIELD PANEL (compact tab view) ────────────────────────────────────
// This is the COLLAPSED view within the sub-tabs.
// It shows a summary and has the "Expand Battlefield" button.
const BattlefieldPanel = ({ competitors, userData, onExpand }) => {
  // FIX: Correctly read userData.discotiveScore.current
  const myScore = userData?.discotiveScore?.current || 0;
  const myStreak = userData?.discotiveScore?.streak || 0;

  const sortedCompetitors = useMemo(
    () =>
      [...competitors].sort(
        (a, b) => (b.targetScore || 0) - (a.targetScore || 0),
      ),
    [competitors],
  );

  // FIX: Properly find the closest target using real targetScore values
  const arenaTarget = useMemo(() => {
    if (sortedCompetitors.length === 0) return null;
    const above = sortedCompetitors
      .filter((c) => (c.targetScore || 0) > myScore)
      .reverse();
    if (above.length > 0) return above[0];
    return sortedCompetitors[0];
  }, [sortedCompetitors, myScore]);

  return (
    <div className="space-y-4">
      {/* Expand Button — primary CTA */}
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border border-[rgba(239,68,68,0.25)] bg-gradient-to-r from-[rgba(239,68,68,0.08)] to-transparent hover:from-[rgba(239,68,68,0.14)] hover:border-[rgba(239,68,68,0.40)] transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-[#F5F0E8]">
              Open Battlefield
            </p>
            <p className="text-[9px] text-[rgba(245,240,232,0.35)]">
              Full war room · draggable columns · live telemetry
            </p>
          </div>
        </div>
        <Maximize2 className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* Compact comparison header */}
      <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.04)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Crosshair className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-xs font-black text-[#F5F0E8] uppercase tracking-wider">
              Battlefield
            </span>
          </div>
          <span className="text-[9px] font-bold text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
            {competitors.length}/10 Active
          </span>
        </div>

        {!arenaTarget ? (
          <div className="p-8 text-center">
            <Target className="w-10 h-10 text-[rgba(245,240,232,0.08)] mx-auto mb-3" />
            <p className="text-sm font-black text-[rgba(245,240,232,0.40)]">
              No Targets Set
            </p>
            <p className="text-xs text-[rgba(245,240,232,0.25)] mt-1.5 max-w-[220px] mx-auto">
              Mark competitors from the Global tab to activate live telemetry.
            </p>
          </div>
        ) : (
          <div>
            {/* Compact 1-on-1 */}
            <div className="flex items-center justify-between p-5 bg-[#0F0F0F] relative overflow-hidden border-b border-[rgba(255,255,255,0.04)]">
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(191,162,100,0.05)] to-[rgba(239,68,68,0.05)] pointer-events-none" />

              {/* User — FIX: use myScore correctly */}
              <div className="flex flex-col items-start z-10 w-1/3">
                <span className="text-[10px] font-black text-[#BFA264] uppercase tracking-widest mb-1.5">
                  You
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white leading-none">
                  {myScore.toLocaleString()}
                </span>
                <span className="text-[9px] text-[rgba(245,240,232,0.40)] uppercase tracking-widest mt-1.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" /> {myStreak}d
                </span>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center z-10 shrink-0 px-2">
                <div className="w-8 h-8 rounded-full bg-[#111] border border-[rgba(255,255,255,0.08)] flex items-center justify-center shadow-lg">
                  <Crosshair className="w-3.5 h-3.5 text-red-400/50" />
                </div>
              </div>

              {/* Target — FIX: use targetScore properly */}
              <div className="flex flex-col items-end z-10 w-1/3">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1.5 truncate w-full text-right">
                  @
                  {arenaTarget.targetUsername ||
                    arenaTarget.targetName?.split(" ")[0]}
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white leading-none">
                  {(arenaTarget.targetScore || 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-[rgba(245,240,232,0.40)] uppercase tracking-widest mt-1.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-400" />
                  {arenaTarget.targetStreak || 0}d
                </span>
              </div>
            </div>

            {/* Score delta callout */}
            <div className="px-5 py-3">
              {(() => {
                const diff = (arenaTarget.targetScore || 0) - myScore;
                const isWinning = diff <= 0;
                return (
                  <div
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-xl border text-xs font-black",
                      isWinning
                        ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/8 border-red-500/20 text-red-400",
                    )}
                  >
                    {isWinning ? (
                      <TrendingUp className="w-4 h-4 shrink-0" />
                    ) : (
                      <TrendingDown className="w-4 h-4 shrink-0" />
                    )}
                    {isWinning
                      ? `You lead by ${Math.abs(diff).toLocaleString()} pts. Defend the position.`
                      : `${Math.abs(diff).toLocaleString()} pts behind. Accelerate execution.`}
                  </div>
                );
              })()}
            </div>

            {/* Other targets compact list */}
            {sortedCompetitors.length > 1 && (
              <div className="px-4 pb-4">
                <p className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest mb-2">
                  All Targets
                </p>
                <div className="space-y-1.5">
                  {sortedCompetitors.map((target) => {
                    const targetScore = target.targetScore || 0;
                    const isLosing = targetScore <= myScore;
                    const diff = Math.abs(myScore - targetScore);
                    return (
                      <div
                        key={target.targetId}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#0a0a0a]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-[#111] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[9px] font-black text-white/50 overflow-hidden shrink-0">
                            {target.targetAvatar ? (
                              <img
                                src={target.targetAvatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (
                                target.targetName?.charAt(0) || "T"
                              ).toUpperCase()
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-[#F5F0E8] truncate">
                            {target.targetName || "Operator"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono font-black text-white/50">
                            {targetScore.toLocaleString()}
                          </span>
                          <div
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                              isLosing
                                ? "bg-red-500/10 text-red-400"
                                : "bg-emerald-500/10 text-emerald-400",
                            )}
                          >
                            {isLosing ? "↓" : "↑"} {diff.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Alumni Panel ─────────────────────────────────────────────────────────────
const MOCK_INSTITUTIONS = [
  { id: 1, name: "IIT Delhi", type: "university", count: 7, logo: null },
  { id: 2, name: "Google", type: "company", count: 3, logo: null },
  { id: 3, name: "IIM Bangalore", type: "university", count: 4, logo: null },
  { id: 4, name: "Razorpay", type: "company", count: 2, logo: null },
  { id: 5, name: "GirlScript Foundation", type: "dao", count: 5, logo: null },
  { id: 6, name: "NSRCEL", type: "dao", count: 3, logo: null },
];

const AlumniPanel = () => {
  const [alumniTab, setAlumniTab] = useState("institutions");
  const filtered = MOCK_INSTITUTIONS.filter((i) => {
    if (alumniTab === "institutions") return i.type === "university";
    if (alumniTab === "companies") return i.type === "company";
    if (alumniTab === "daos") return i.type === "dao";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "institutions", label: "Institutions", icon: GraduationCap },
          { id: "companies", label: "Companies", icon: Building2 },
          { id: "daos", label: "DAOs", icon: Heart },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setAlumniTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
              alumniTab === id
                ? "bg-[rgba(191,162,100,0.15)] border-[rgba(191,162,100,0.30)] text-[#D4AF78]"
                : "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.70)]",
            )}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((entity) => (
          <motion.div
            key={entity.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3.5 p-4 rounded-[1.25rem] border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] hover:border-[rgba(191,162,100,0.25)] transition-all duration-300 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-[#111] border border-[rgba(255,255,255,0.07)] flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-[rgba(255,255,255,0.25)]">
                {entity.name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#F5F0E8] truncate">
                {entity.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Users className="w-3 h-3 text-[#BFA264]/60" />
                <span className="text-[10px] font-bold text-[#BFA264]/80">
                  {entity.count} Operator{entity.count !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="py-6 text-center border border-dashed border-[rgba(255,255,255,0.06)] rounded-2xl">
        <p className="text-[10px] font-black text-[rgba(245,240,232,0.25)] uppercase tracking-widest">
          Alumni clustering live data coming soon
        </p>
      </div>
    </div>
  );
};

// ─── Global Panel ─────────────────────────────────────────────────────────────
const GlobalPanel = ({
  competitors,
  suggestedUsers,
  loading,
  onSendRequest,
  onMarkCompetitor,
  getConnectionStatus,
  networkStats,
  userTier,
  onPeek,
}) => {
  const [search, setSearch] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const isRL = networkStats.dailyRequestCount >= networkStats.dailyRequestLimit;

  const handleSend = async (user) => {
    setSendingTo(user.id);
    await onSendRequest(user);
    setSendingTo(null);
  };

  const filteredSuggested = useMemo(() => {
    if (!search.trim()) return suggestedUsers;
    const q = search.toLowerCase();
    return suggestedUsers.filter((u) => {
      const name =
        `${u.identity?.firstName || ""} ${u.identity?.lastName || ""}`.trim();
      return (
        name.toLowerCase().includes(q) ||
        (u.identity?.username || "").toLowerCase().includes(q)
      );
    });
  }, [suggestedUsers, search]);

  return (
    <div className="space-y-5">
      <RateLimitBar
        count={networkStats.dailyRequestCount}
        limit={networkStats.dailyRequestLimit}
        tier={userTier}
      />

      {competitors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-red-400" />
            <h3 className="text-[10px] font-black text-[rgba(245,240,232,0.40)] uppercase tracking-widest">
              Active Targets ({Math.min(competitors.length, 10)})
            </h3>
          </div>
          <div className="space-y-2">
            {competitors.slice(0, 10).map((comp) => {
              const compObj = {
                id: comp.targetId,
                identity: {
                  firstName: comp.targetName?.split(" ")[0] || comp.targetName,
                  lastName:
                    comp.targetName?.split(" ").slice(1).join(" ") || "",
                  username: comp.targetUsername || "",
                  avatarUrl: comp.targetAvatar || null,
                },
                // FIX: Use targetScore from competitor doc
                discotiveScore: { current: comp.targetScore || 0 },
              };
              return (
                <OperatorCard
                  key={comp.id}
                  user={compObj}
                  badgeText="Target"
                  badgeColor="red"
                  onPeek={onPeek}
                  actions={
                    <button
                      onClick={() =>
                        onMarkCompetitor({
                          id: comp.targetId,
                          identity: compObj.identity,
                        })
                      }
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Remove from Battlefield"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  }
                />
              );
            })}
          </div>
          <div className="h-px bg-[rgba(255,255,255,0.04)] my-5" />
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-[#BFA264]" />
          <h3 className="text-[10px] font-black text-[rgba(245,240,232,0.40)] uppercase tracking-widest">
            Discover Operators
          </h3>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(245,240,232,0.20)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or handle..."
            className="w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[rgba(191,162,100,0.30)] transition-all"
          />
        </div>
        {isRL && (
          <div className="flex items-start gap-2.5 p-3 mb-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-400">
              {userTier === "ESSENTIAL"
                ? "Daily limit reached. Upgrade to PRO for 50/day."
                : "All requests used today. Resets at midnight."}
            </p>
          </div>
        )}
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[68px] rounded-[1.25rem] bg-[#0A0A0A] border border-[rgba(255,255,255,0.04)] animate-pulse"
              />
            ))}
          </div>
        ) : filteredSuggested.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="w-10 h-10 text-[rgba(245,240,232,0.10)] mb-3" />
            <p className="text-sm font-black text-[rgba(245,240,232,0.25)]">
              No operators found
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredSuggested.map((user) => {
              const status = getConnectionStatus(user.id);
              return (
                <OperatorCard
                  key={user.id}
                  user={user}
                  onPeek={onPeek}
                  actions={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onMarkCompetitor(user)}
                        title="Add to Battlefield"
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 transition-all"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                      {status === "NONE" ? (
                        <button
                          onClick={() => !isRL && handleSend(user)}
                          disabled={isRL || sendingTo === user.id}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest",
                            isRL
                              ? "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.20)] cursor-not-allowed"
                              : "bg-[#BFA264] border border-transparent text-[#030303] hover:bg-[#D4AF78]",
                          )}
                        >
                          {sendingTo === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          <span className="hidden sm:block">Ally</span>
                        </button>
                      ) : status === "PENDING_SENT" ? (
                        <span className="flex items-center gap-1 px-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] text-[10px] font-black rounded-xl uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          <span className="hidden sm:block">Sent</span>
                        </span>
                      ) : status === "ALLIANCE" ? (
                        <span className="flex items-center gap-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-xl uppercase tracking-widest">
                          <Check className="w-3 h-3" />
                          <span className="hidden sm:block">Allied</span>
                        </span>
                      ) : null}
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTIONS TAB V4 — Main Export
// ═══════════════════════════════════════════════════════════════════════════════
const NetworkTab = ({
  uid,
  userData,
  alliances,
  pendingInbound,
  pendingOutbound,
  competitors,
  suggestedUsers,
  networkLoading,
  networkStats,
  userTier = "ESSENTIAL",
  onAccept,
  onDecline,
  onRemove,
  onCancel,
  onSendRequest,
  onMarkCompetitor,
  getConnectionStatus,
  onDM,
  onPeekOperator,
  onExpandBattlefield,
  isBattlefieldExpanded,
}) => {
  const [activeSubTab, setActiveSubTab] = useState("battlefield");
  const navigate = useNavigate();

  const handleToggleBattlefield = (isExpanded) => {
    if (isExpanded) {
      navigate("/app/connective/network/battlefield");
    } else {
      navigate("/app/connective/network");
    }
    if (onExpandBattlefield) onExpandBattlefield(isExpanded);
  };

  const subTabs = [
    {
      id: "battlefield",
      label: "Battlefield",
      icon: Crosshair,
      count: networkStats.competitors,
    },
    {
      id: "alliances",
      label: "Alliances",
      icon: Users,
      count: networkStats.alliances,
    },
    {
      id: "requests",
      label: "Requests",
      icon: Bell,
      count: networkStats.pendingInbound,
    },
    { id: "alumni", label: "Alumni", icon: GraduationCap, count: 0 },
    { id: "global", label: "Global", icon: Globe, count: 0 },
  ];

  return (
    <div className="w-full">
      {/* Sub-tab nav stays visible so the user can easily collapse the view by clicking another tab */}
      <motion.div
        layout
        className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1"
      >
        {subTabs.map((tab) => (
          <SubTab
            key={tab.id}
            {...tab}
            active={activeSubTab === tab.id}
            onClick={(id) => {
              setActiveSubTab(id);
              if (id !== "battlefield") handleToggleBattlefield(false);
            }}
          />
        ))}
      </motion.div>

      {/* Content area: Render panels ONLY if the battlefield is not expanded */}
      <AnimatePresence>
        {!isBattlefieldExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSubTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeSubTab === "battlefield" && (
                  <BattlefieldPanel
                    competitors={competitors}
                    userData={userData}
                    onExpand={() => handleToggleBattlefield(true)}
                  />
                )}
                {activeSubTab === "alliances" && (
                  <AlliancesPanel
                    alliances={alliances}
                    uid={uid}
                    competitors={competitors}
                    onRemove={onRemove}
                    onMarkCompetitor={onMarkCompetitor}
                    onDM={onDM}
                    onPeek={onPeekOperator}
                  />
                )}
                {activeSubTab === "requests" && (
                  <RequestsPanel
                    pendingInbound={pendingInbound}
                    pendingOutbound={pendingOutbound}
                    uid={uid}
                    onAccept={onAccept}
                    onDecline={onDecline}
                    onCancel={onCancel}
                  />
                )}
                {activeSubTab === "alumni" && <AlumniPanel />}
                {activeSubTab === "global" && (
                  <GlobalPanel
                    competitors={competitors}
                    suggestedUsers={suggestedUsers}
                    loading={networkLoading}
                    onSendRequest={onSendRequest}
                    onMarkCompetitor={onMarkCompetitor}
                    getConnectionStatus={getConnectionStatus}
                    networkStats={networkStats}
                    userTier={userTier}
                    onPeek={onPeekOperator}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NetworkTab;
