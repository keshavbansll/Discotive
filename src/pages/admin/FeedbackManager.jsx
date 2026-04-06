/**
 * @fileoverview Discotive OS — Admin Feedback Manager
 * @module Admin/FeedbackManager
 * @description
 * Reads from feedback/{uid} collection (one doc per user, anti-spam).
 * Zero onSnapshot. getDocs only. Shows rating breakdown, recommendation
 * distribution, and searchable individual feedback entries.
 *
 * Firestore schema (feedback/{uid}):
 *   uid, email, rating (0.5–5), recommendation, comments, updatedAt
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import {
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Search,
  X,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Activity,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/cn";
// ── Constants ─────────────────────────────────────────────────────────────────

const RECOMMENDATION_META = {
  game_changer: {
    label: "Game-Changer",
    color: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
    weight: 100,
  },
  powerful: {
    label: "Powerful",
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    weight: 67,
  },
  average: {
    label: "Average",
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    weight: 33,
  },
  a_drag: {
    label: "A Drag",
    color: "text-rose-400",
    bg: "bg-rose-500/8",
    border: "border-rose-500/20",
    weight: 0,
  },
};

const timeAgo = (ts) => {
  if (!ts) return "—";
  const date = ts?.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const FeedbackSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-24 bg-white/[0.02] rounded-2xl" />
      ))}
    </div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="h-20 bg-white/[0.02] border border-white/[0.03] rounded-2xl"
      />
    ))}
  </div>
);

// ── Star Display ──────────────────────────────────────────────────────────────

const StarDisplay = ({ rating, size = "sm" }) => {
  const sizeClass = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating >= star;
        const half = rating >= star - 0.5 && rating < star;
        return (
          <div key={star} className="relative">
            <Star
              className={cn(sizeClass, "text-[#1a1a1a]")}
              strokeWidth={1.5}
            />
            {(filled || half) && (
              <div
                className={cn(
                  "absolute inset-0 overflow-hidden",
                  half && "w-1/2",
                )}
              >
                <Star
                  className={cn(sizeClass, "text-amber-400 fill-amber-400")}
                  strokeWidth={1.5}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, color = "text-white", icon: Icon }) => (
  <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-2xl p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
        {label}
      </span>
      {Icon && <Icon className={cn("w-4 h-4", color)} />}
    </div>
    <div className={cn("text-3xl font-black font-mono", color)}>{value}</div>
    {sub && <p className="text-[9px] text-white/25 mt-1">{sub}</p>}
  </div>
);

// ── Feedback Row ──────────────────────────────────────────────────────────────

const FeedbackRow = ({ item, expanded, onExpand }) => {
  const rec = RECOMMENDATION_META[item.recommendation] || {
    label: item.recommendation || "—",
    color: "text-white/40",
    bg: "bg-white/4",
    border: "border-white/10",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#1a1a1a] bg-[#080808] rounded-2xl overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
        onClick={() => onExpand(item.id)}
      >
        {/* Rating */}
        <div className="shrink-0">
          <StarDisplay rating={item.rating || 0} />
          <p className="text-[9px] text-white/30 font-mono text-center mt-0.5">
            {item.rating}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                rec.color,
                rec.bg,
                rec.border,
              )}
            >
              {rec.label}
            </span>
          </div>
          <p className="text-[11px] text-white/40 truncate font-mono">
            {item.email || item.uid?.slice(0, 16) + "..."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-white/20">
            {timeAgo(item.updatedAt)}
          </span>
          {item.comments && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-sky-400/60"
              title="Has comments"
            />
          )}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-white/20 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-t border-[#1a1a1a] overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {item.comments ? (
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                    Comments
                  </p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-3">
                    {item.comments}
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-white/20 italic">
                  No additional comments.
                </p>
              )}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#111]">
                {[
                  { label: "UID", value: item.uid?.slice(0, 20) + "..." },
                  { label: "Rating", value: `${item.rating} / 5.0` },
                  { label: "Submitted", value: timeAgo(item.updatedAt) },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-0.5">
                      {label}
                    </p>
                    <p className="text-[10px] text-white/50 font-mono truncate">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────

const FeedbackManager = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [recFilter, setRecFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFeedbacks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // getDocs only — zero onSnapshot, zero ongoing cost
      const snap = await getDocs(collection(db, "feedback"));
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("[FeedbackManager] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (feedbacks.length === 0)
      return { avg: 0, dem: 0, total: 0, withComments: 0 };

    const totalRating = feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0);
    const avg = (totalRating / feedbacks.length).toFixed(1);

    const totalWeight = feedbacks.reduce((acc, f) => {
      const weight = RECOMMENDATION_META[f.recommendation]?.weight ?? 0;
      return acc + weight;
    }, 0);
    const dem = Math.round(totalWeight / feedbacks.length);
    const withComments = feedbacks.filter((f) => f.comments?.trim()).length;

    return { avg, dem, total: feedbacks.length, withComments };
  }, [feedbacks]);

  const recCounts = useMemo(() => {
    const counts = {};
    Object.keys(RECOMMENDATION_META).forEach((k) => {
      counts[k] = 0;
    });
    feedbacks.forEach((f) => {
      if (f.recommendation && counts[f.recommendation] !== undefined) {
        counts[f.recommendation]++;
      }
    });
    return counts;
  }, [feedbacks]);

  const filtered = useMemo(
    () =>
      feedbacks.filter((f) => {
        const recMatch = recFilter === "all" || f.recommendation === recFilter;
        const s = searchQuery.toLowerCase();
        const searchMatch =
          !searchQuery ||
          (f.email || "").toLowerCase().includes(s) ||
          (f.uid || "").toLowerCase().includes(s) ||
          (f.comments || "").toLowerCase().includes(s);
        return recMatch && searchMatch;
      }),
    [feedbacks, recFilter, searchQuery],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
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
              <h1 className="text-3xl font-black text-white">User Feedback</h1>
              <p className="text-white/30 text-sm mt-1">
                {stats.total} total responses · {stats.withComments} with
                comments
              </p>
            </div>
            <button
              onClick={() => fetchFeedbacks(true)}
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

        {loading ? (
          <FeedbackSkeleton />
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {refreshing ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-24 bg-white/[0.02] rounded-2xl animate-pulse"
                    />
                  ))}
                </>
              ) : (
                <>
                  <StatCard
                    label="Total Responses"
                    value={stats.total}
                    icon={Users}
                    color="text-white"
                    sub="Unique users (1 per UID)"
                  />
                  <StatCard
                    label="Avg Rating"
                    value={`${stats.avg} ★`}
                    icon={Star}
                    color="text-amber-400"
                    sub="Out of 5.0 (half-star)"
                  />
                  <StatCard
                    label="DEM Score"
                    value={`${stats.dem}%`}
                    icon={Activity}
                    color="text-violet-400"
                    sub="Weighted efficiency index"
                  />
                  <StatCard
                    label="With Comments"
                    value={stats.withComments}
                    icon={MessageSquare}
                    color="text-sky-400"
                    sub={`${stats.total > 0 ? Math.round((stats.withComments / stats.total) * 100) : 0}% response rate`}
                  />
                </>
              )}
            </div>

            {/* Recommendation breakdown bar */}
            {stats.total > 0 && !refreshing && (
              <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-2xl p-5 mb-6">
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-4">
                  Recommendation Distribution
                </p>
                <div className="space-y-3">
                  {Object.entries(RECOMMENDATION_META).map(([key, meta]) => {
                    const count = recCounts[key] || 0;
                    const pct =
                      stats.total > 0
                        ? Math.round((count / stats.total) * 100)
                        : 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest w-24 shrink-0",
                            meta.color,
                          )}
                        >
                          {meta.label}
                        </span>
                        <div className="flex-1 h-1.5 bg-[#111] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.8,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="h-full rounded-full"
                            style={{
                              backgroundColor: meta.color
                                .replace("text-", "")
                                .includes("violet")
                                ? "#a855f7"
                                : meta.color.includes("emerald")
                                  ? "#10b981"
                                  : meta.color.includes("amber")
                                    ? "#f59e0b"
                                    : "#fb7185",
                            }}
                          />
                        </div>
                        <span className="text-[9px] font-mono text-white/30 w-12 text-right shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-5">
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setRecFilter("all")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    recFilter === "all"
                      ? "bg-white text-black border-white"
                      : "bg-[#0a0a0c] border-white/[0.05] text-white/40 hover:text-white",
                  )}
                >
                  All{" "}
                  <span className="font-mono ml-1 text-[8px] opacity-60">
                    ({stats.total})
                  </span>
                </button>
                {Object.entries(RECOMMENDATION_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setRecFilter(key)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                      recFilter === key
                        ? `${meta.bg} ${meta.border} ${meta.color}`
                        : "bg-[#0a0a0c] border-white/[0.05] text-white/40 hover:text-white",
                    )}
                  >
                    {meta.label}
                    <span className="font-mono ml-1 text-[8px] opacity-60">
                      ({recCounts[key] || 0})
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64 md:ml-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  type="text"
                  placeholder="Search by email, comments..."
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

            {/* Feedback list */}
            {refreshing ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-white/[0.02] rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
                <MessageSquare className="w-10 h-10 text-white/10 mb-4" />
                <p className="text-sm font-black text-white/20">
                  No feedback found
                </p>
                <p className="text-[10px] text-white/10 uppercase tracking-widest mt-1">
                  {recFilter !== "all"
                    ? "Try a different filter"
                    : "No responses yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <FeedbackRow
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onExpand={(id) =>
                      setExpandedId((prev) => (prev === id ? null : id))
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackManager;
