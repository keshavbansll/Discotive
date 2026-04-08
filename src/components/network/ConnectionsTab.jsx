/**
 * @fileoverview ConnectionsTab — Alliance Engine & Competitor Radar
 * @description
 * Sub-tab controller for Alliances, Requests (Inbound/Outbound), and Radar.
 * Full optimistic UI. Discotive taxonomy throughout.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Target,
  Clock,
  Check,
  X,
  UserPlus,
  Crown,
  Zap,
  Shield,
  ChevronRight,
  Search,
  Crosshair,
  Link2Off,
  ArrowRight,
  TrendingUp,
  Globe,
  Loader2,
  Send,
  Bell,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Time Ago ─────────────────────────────────────────────────────────────────
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
      "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
      active
        ? "bg-[rgba(191,162,100,0.12)] text-[#BFA264] border border-[rgba(191,162,100,0.30)]"
        : "text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.70)] hover:bg-[rgba(255,255,255,0.04)]",
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    <span className="hidden sm:block">{label}</span>
    {count > 0 && (
      <span
        className={cn(
          "w-4.5 h-4 min-w-[18px] px-1 rounded-full text-[8px] flex items-center justify-center font-black",
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

// ─── User Card (Alliance / Competitor) ───────────────────────────────────────
const OperatorCard = ({ user, actions, badgeText, badgeColor = "amber" }) => {
  const name =
    `${user?.identity?.firstName || ""} ${user?.identity?.lastName || ""}`.trim() ||
    user?.identity?.username ||
    "Operator";
  const initials = name.charAt(0).toUpperCase() || "O";
  const score = user?.discotiveScore?.current || 0;
  const domain = user?.identity?.domain || user?.vision?.passion || "General";
  const niche = user?.identity?.niche || "";

  const badgeClasses = {
    amber:
      "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.12)]",
    emerald:
      "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)]",
    red: "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_12px_rgba(239,68,68,0.12)]",
    sky: "text-sky-400 bg-sky-500/10 border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.12)]",
    violet:
      "text-violet-400 bg-violet-500/10 border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.12)]",
  };

  return (
    <div className="flex items-center gap-3.5 p-3.5 rounded-[1.25rem] border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_24px_rgba(191,162,100,0.08),inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:border-[rgba(191,162,100,0.25)] transition-all duration-300 group">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-11 h-11 rounded-full bg-[#111] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[15px] font-black text-[#BFA264]">
          {initials}
        </div>
        {user?.tier === "PRO" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
            <Crown className="w-2 h-2 text-black" />
          </div>
        )}
      </div>

      {/* Info */}
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
                {score.toLocaleString()} pts
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
};

// ─── Alliances Sub-Panel ──────────────────────────────────────────────────────
const AlliancesPanel = ({
  alliances,
  uid,
  onRemove,
  onMarkCompetitor,
  competitors,
}) => {
  const [search, setSearch] = useState("");

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
      {/* Search */}
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

            // Reconstruct a minimal user object from connection data
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
              },
              discotiveScore: { current: 0 },
            };

            return (
              <OperatorCard
                key={conn.id}
                user={partnerObj}
                badgeText="Alliance"
                badgeColor="emerald"
                actions={
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        onMarkCompetitor({
                          id: partnerId,
                          identity: partnerObj.identity,
                        })
                      }
                      title={
                        isCompetitor ? "Remove from Radar" : "Add to Radar"
                      }
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all border text-[11px] font-black",
                        isCompetitor
                          ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          : "bg-[#111] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8",
                      )}
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "WARNING: Severing this Alliance will alter your execution topology. Proceed?",
                          )
                        ) {
                          onRemove(conn.id, partnerId);
                        }
                      }}
                      title="Remove Alliance"
                      className="w-11 h-11 md:w-8 md:h-8 rounded-xl flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 transition-all"
                    >
                      <Link2Off className="w-4 h-4 md:w-3.5 md:h-3.5" />
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

// ─── Requests Sub-Panel ───────────────────────────────────────────────────────
const RequestsPanel = ({
  pendingInbound,
  pendingOutbound,
  uid,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const [view, setView] = useState("inbound");

  return (
    <div className="space-y-4">
      {/* Inbound / Outbound toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("inbound")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
            view === "inbound"
              ? "bg-white text-black border-white"
              : "bg-[#0A0A0A] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.70)]",
          )}
        >
          <Bell className="w-3 h-3" />
          Inbound
          {pendingInbound.length > 0 && (
            <span
              className={cn(
                "w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-black",
                view === "inbound"
                  ? "bg-black text-white"
                  : "bg-[#BFA264] text-black",
              )}
            >
              {pendingInbound.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setView("outbound")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
            view === "outbound"
              ? "bg-white text-black border-white"
              : "bg-[#0A0A0A] border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.70)]",
          )}
        >
          <Send className="w-3 h-3" />
          Sent
          {pendingOutbound.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.08)] text-[8px] flex items-center justify-center font-black text-[rgba(245,240,232,0.50)]">
              {pendingOutbound.length}
            </span>
          )}
        </button>
      </div>

      {/* Inbound requests */}
      {view === "inbound" && (
        <>
          {pendingInbound.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-[rgba(245,240,232,0.15)]" />
              </div>
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
                  },
                  discotiveScore: { current: 0 },
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
                          onClick={() => onAccept(conn.id, conn.requesterId)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest"
                        >
                          <Check className="w-3 h-3" />
                          <span className="hidden sm:block">Accept</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Reject operator request?"))
                              onDecline(conn.id);
                          }}
                          className="w-11 h-11 md:w-8 md:h-8 flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 rounded-xl transition-all"
                        >
                          <X className="w-4 h-4 md:w-3.5 md:h-3.5" />
                        </button>
                      </div>
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Outbound requests */}
      {view === "outbound" && (
        <>
          {pendingOutbound.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center mb-4">
                <Send className="w-6 h-6 text-[rgba(245,240,232,0.15)]" />
              </div>
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
                  },
                  discotiveScore: { current: 0 },
                };

                return (
                  <OperatorCard
                    key={conn.id}
                    user={receiverObj}
                    badgeText="Pending"
                    badgeColor="sky"
                    actions={
                      <button
                        onClick={() => onCancel(conn.id)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.40)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 text-[10px] font-black rounded-xl transition-all"
                      >
                        <X className="w-3 h-3" />
                        <span className="hidden sm:block">Cancel</span>
                      </button>
                    }
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Radar Sub-Panel (Competitor Tracking) ────────────────────────────────────
const RadarPanel = ({
  competitors,
  suggestedUsers,
  loading,
  onSendRequest,
  onMarkCompetitor,
  getConnectionStatus,
}) => {
  const [search, setSearch] = useState("");

  const filteredSuggested = useMemo(() => {
    if (!search.trim()) return suggestedUsers;
    const q = search.toLowerCase();
    return suggestedUsers.filter((u) => {
      const name =
        `${u.identity?.firstName || ""} ${u.identity?.lastName || ""}`.trim();
      const uname = u.identity?.username || "";
      return name.toLowerCase().includes(q) || uname.toLowerCase().includes(q);
    });
  }, [suggestedUsers, search]);

  return (
    <div className="space-y-5">
      {/* Competitors Radar */}
      {competitors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crosshair className="w-4 h-4 text-red-400" />
            <h3 className="text-[10px] font-black text-[rgba(245,240,232,0.40)] uppercase tracking-widest">
              Competitor Radar ({competitors.length})
            </h3>
          </div>
          <div className="space-y-2">
            {competitors.map((comp) => {
              const compObj = {
                id: comp.targetId,
                identity: {
                  firstName: comp.targetName?.split(" ")[0] || comp.targetName,
                  lastName:
                    comp.targetName?.split(" ").slice(1).join(" ") || "",
                  username: comp.targetUsername || "",
                },
                discotiveScore: { current: comp.targetScore || 0 },
              };
              return (
                <OperatorCard
                  key={comp.id}
                  user={compObj}
                  badgeText="Target"
                  badgeColor="red"
                  actions={
                    <button
                      onClick={() =>
                        onMarkCompetitor({
                          id: comp.targetId,
                          identity: compObj.identity,
                        })
                      }
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                      title="Remove from radar"
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

      {/* Discover operators */}
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
              const name =
                `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                "Operator";

              return (
                <OperatorCard
                  key={user.id}
                  user={user}
                  actions={
                    <div className="flex items-center gap-1.5">
                      {/* Competitor */}
                      <button
                        onClick={() => onMarkCompetitor(user)}
                        title="Add to Competitor Radar"
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8 hover:border-red-500/20 transition-all"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>

                      {/* Alliance request */}
                      {status === "NONE" ? (
                        <button
                          onClick={() => onSendRequest(user)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(191,162,100,0.10)] border border-[rgba(191,162,100,0.25)] text-[#BFA264] hover:bg-[rgba(191,162,100,0.18)] text-[10px] font-black rounded-xl transition-all uppercase tracking-widest"
                        >
                          <UserPlus className="w-3 h-3" />
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
// CONNECTIONS TAB (Main Export)
// ═══════════════════════════════════════════════════════════════════════════════
const ConnectionsTab = ({
  uid,
  alliances,
  pendingInbound,
  pendingOutbound,
  competitors,
  suggestedUsers,
  networkLoading,
  networkStats,
  onAccept,
  onDecline,
  onRemove,
  onCancel,
  onSendRequest,
  onMarkCompetitor,
  getConnectionStatus,
}) => {
  const [activeSubTab, setActiveSubTab] = useState("alliances");

  const subTabs = [
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
    {
      id: "radar",
      label: "Radar",
      icon: Crosshair,
      count: networkStats.competitors,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
        {subTabs.map((tab) => (
          <SubTab
            key={tab.id}
            {...tab}
            active={activeSubTab === tab.id}
            onClick={setActiveSubTab}
          />
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeSubTab === "alliances" && (
            <AlliancesPanel
              alliances={alliances}
              uid={uid}
              competitors={competitors}
              onRemove={onRemove}
              onMarkCompetitor={onMarkCompetitor}
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
          {activeSubTab === "radar" && (
            <RadarPanel
              competitors={competitors}
              suggestedUsers={suggestedUsers}
              loading={networkLoading}
              onSendRequest={onSendRequest}
              onMarkCompetitor={onMarkCompetitor}
              getConnectionStatus={getConnectionStatus}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ConnectionsTab;
