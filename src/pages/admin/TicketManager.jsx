/**
 * @fileoverview Admin Ticket Manager
 * @description Full support ticket management. No onSnapshot.
 * Closing a ticket sets deleteAt = now + 48h.
 * The CRON in functions/index.js sweeps deleteAt <= now daily.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  Ticket,
  ArrowLeft,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  Shield,
  Zap,
  MessageSquare,
  ExternalLink,
  Eye,
} from "lucide-react";
import { cn } from "../../components/ui/BentoCard";

const PRIORITY_META = {
  Critical: {
    color: "text-red-400",
    bg: "bg-red-500/8",
    border: "border-red-500/20",
  },
  High: {
    color: "text-orange-400",
    bg: "bg-orange-500/8",
    border: "border-orange-500/20",
  },
  Medium: {
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
  },
  Low: { color: "text-white/40", bg: "bg-white/4", border: "border-white/10" },
};

const timeAgo = (ts) => {
  if (!ts) return "—";
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const TicketSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="h-28 bg-white/[0.02] border border-white/[0.03] rounded-2xl"
      />
    ))}
  </div>
);

// ── Ticket Row ────────────────────────────────────────────────────────────────
const TicketRow = ({ ticket, onToggleStatus, onExpand, expanded }) => {
  const priority = PRIORITY_META[ticket.priority] || PRIORITY_META.Medium;
  const isOpen = ticket.status === "open";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "border rounded-2xl overflow-hidden transition-all",
        isOpen
          ? "border-[#1a1a1a] bg-[#080808]"
          : "border-[#111] bg-[#050505] opacity-60",
      )}
    >
      {/* Row Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
        onClick={() => onExpand(ticket.id)}
      >
        {/* Status dot */}
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            isOpen
              ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]"
              : "bg-white/20",
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-white truncate">
              {ticket.subject || "No subject"}
            </p>
            <span
              className={cn(
                "shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                priority.color,
                priority.bg,
                priority.border,
              )}
            >
              {ticket.priority || "Medium"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 font-mono">
              @{ticket.username || "unknown"}
            </span>
            <span className="text-[10px] text-white/20">·</span>
            <span className="text-[10px] text-white/20">{ticket.category}</span>
            <span className="text-[10px] text-white/20">·</span>
            <span className="text-[10px] text-white/20">
              {timeAgo(ticket.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(ticket);
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
              isOpen
                ? "bg-white/5 border-white/10 text-white/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                : "bg-emerald-500/5 border-emerald-500/15 text-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-400",
            )}
          >
            {isOpen ? "Close" : "Reopen"}
          </button>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-white/20 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </div>

      {/* Expanded Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#1a1a1a] overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Message */}
              <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
                  Message
                </p>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {ticket.message}
                </p>
              </div>
              {/* Meta grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#111]">
                {[
                  { label: "UID", value: ticket.uid?.slice(0, 12) + "..." },
                  { label: "Email", value: ticket.email || "—" },
                  { label: "Tier", value: ticket.tier || "ESSENTIAL" },
                  {
                    label: "Grace Checked",
                    value: ticket.graceChecked ? "Yes" : "No",
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-0.5">
                      {label}
                    </p>
                    <p className="text-[11px] text-white/60 font-mono truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              {/* Delete warning for closed tickets */}
              {!isOpen && ticket.deleteAt && (
                <div className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <p className="text-[10px] text-red-400/70 font-bold">
                    Auto-deletes{" "}
                    {timeAgo(
                      ticket.deleteAt?.toDate
                        ? ticket.deleteAt.toDate()
                        : new Date(
                            Date.now() -
                              (Date.now() -
                                (ticket.deleteAt?.seconds * 1000 || 0)),
                          ),
                    )}{" "}
                    — 48h after closing
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const TicketManager = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTickets = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // getDocs only — zero onSnapshot
      const snap = await getDocs(
        query(
          collection(db, "support_tickets"),
          orderBy("createdAt", "desc"),
          limit(100),
        ),
      );
      setTickets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("[TicketManager] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleToggleStatus = useCallback(async (ticket) => {
    const newStatus = ticket.status === "open" ? "closed" : "open";
    const now = new Date();
    const deleteAt =
      newStatus === "closed"
        ? new Date(now.getTime() + 48 * 60 * 60 * 1000) // +48h
        : null;

    try {
      const ref = doc(db, "support_tickets", ticket.id);
      await updateDoc(ref, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        closedAt: newStatus === "closed" ? serverTimestamp() : null,
        deleteAt: deleteAt
          ? { seconds: Math.floor(deleteAt.getTime() / 1000), nanoseconds: 0 }
          : null,
      });
      // Optimistic update
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticket.id
            ? {
                ...t,
                status: newStatus,
                deleteAt: deleteAt ? { toDate: () => deleteAt } : null,
              }
            : t,
        ),
      );
    } catch (err) {
      console.error("[TicketManager] Status toggle failed:", err);
    }
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const statusMatch = statusFilter === "all" || t.status === statusFilter;
      const searchLower = searchQuery.toLowerCase();
      const searchMatch =
        !searchQuery ||
        (t.subject || "").toLowerCase().includes(searchLower) ||
        (t.username || "").toLowerCase().includes(searchLower) ||
        (t.email || "").toLowerCase().includes(searchLower) ||
        (t.category || "").toLowerCase().includes(searchLower);
      return statusMatch && searchMatch;
    });
  }, [tickets, statusFilter, searchQuery]);

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "open").length,
      closed: tickets.filter((t) => t.status === "closed").length,
      all: tickets.length,
    }),
    [tickets],
  );

  return (
    <div className="min-h-screen bg-[#000] text-white pb-24">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/app/admin"
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Admin Dashboard
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                Support Tickets
              </h1>
              <p className="text-white/30 text-sm mt-1">
                {counts.open} open · {counts.closed} closed (auto-delete 48h
                after close)
              </p>
            </div>
            <button
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-4 h-4", refreshing && "animate-spin")}
              />
              {refreshing ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
          <div className="flex gap-1">
            {[
              { key: "open", label: "Open", count: counts.open },
              { key: "closed", label: "Closed", count: counts.closed },
              { key: "all", label: "All", count: counts.all },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statusFilter === f.key
                    ? "bg-white text-black border-white"
                    : "bg-[#0a0a0c] border-white/[0.05] text-white/40 hover:text-white",
                )}
              >
                {f.label}{" "}
                <span className="font-mono ml-1 text-[8px] opacity-60">
                  ({f.count})
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/[0.05] text-white pl-10 pr-4 py-2 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading || refreshing ? (
          <TicketSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
            <Ticket className="w-10 h-10 text-white/10 mb-4" />
            <p className="text-sm font-black text-white/20">No tickets found</p>
            <p className="text-[10px] text-white/10 uppercase tracking-widest mt-1">
              {statusFilter === "open"
                ? "Queue is clear"
                : "No results match filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onToggleStatus={handleToggleStatus}
                onExpand={(id) =>
                  setExpandedId((prev) => (prev === id ? null : id))
                }
                expanded={expandedId === ticket.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManager;
