/**
 * @fileoverview Admin Report Manager
 * @description Review and action user reports. No onSnapshot.
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
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Search,
  X,
  ChevronDown,
  Shield,
  CheckCircle2,
  Ban,
  Eye,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../components/ui/BentoCard";

const STATUS_META = {
  pending: {
    color: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  reviewed: {
    color: "text-sky-400",
    bg: "bg-sky-500/8",
    border: "border-sky-500/20",
    dot: "bg-sky-400",
  },
  resolved: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
    dot: "bg-emerald-400",
  },
  dismissed: {
    color: "text-white/30",
    bg: "bg-white/4",
    border: "border-white/10",
    dot: "bg-white/20",
  },
};

const ACTIONS = ["reviewed", "resolved", "dismissed"];

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

const ReportSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="h-24 bg-white/[0.02] border border-white/[0.03] rounded-2xl"
      />
    ))}
  </div>
);

const ReportRow = ({ report, onUpdateStatus, expanded, onExpand }) => {
  const meta = STATUS_META[report.status] || STATUS_META.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-[#1a1a1a] bg-[#080808] rounded-2xl overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
        onClick={() => onExpand(report.id)}
      >
        <div className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-bold text-white truncate">
              {report.reason}
            </p>
            <span
              className={cn(
                "shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                meta.color,
                meta.bg,
                meta.border,
              )}
            >
              {report.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 font-mono">
              {report.targetType}{" "}
              {report.targetUsername ? `· @${report.targetUsername}` : ""}
            </span>
            <span className="text-[10px] text-white/20">
              · {timeAgo(report.createdAt)}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-white/20 transition-transform shrink-0",
            expanded && "rotate-180",
          )}
        />
      </div>

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
              {report.description && (
                <div>
                  <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">
                    Description
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {report.description}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-[#111]">
                {[
                  {
                    label: "Reporter",
                    value: `@${report.reporterUsername || "anon"}`,
                  },
                  {
                    label: "Reporter Email",
                    value: report.reporterEmail || "—",
                  },
                  {
                    label: "Target ID",
                    value: report.targetId?.slice(0, 14) + "..." || "—",
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
              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mr-1">
                  Update:
                </span>
                {ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => onUpdateStatus(report, action)}
                    disabled={report.status === action}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed",
                      action === "resolved"
                        ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                        : action === "dismissed"
                          ? "border-white/10 text-white/40 hover:bg-white/5"
                          : "border-sky-500/20 text-sky-400 hover:bg-sky-500/10",
                    )}
                  >
                    {action}
                  </button>
                ))}
                {report.targetUsername && (
                  <a
                    href={`/${report.targetUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/[0.05] text-[9px] font-bold text-white/40 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View Profile
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ReportManager = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "reports"),
          orderBy("createdAt", "desc"),
          limit(100),
        ),
      );
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("[ReportManager] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUpdateStatus = useCallback(async (report, newStatus) => {
    try {
      await updateDoc(doc(db, "reports", report.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: newStatus } : r)),
      );
    } catch (err) {
      console.error("[ReportManager] Status update failed:", err);
    }
  }, []);

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const statusMatch = statusFilter === "all" || r.status === statusFilter;
        const s = searchQuery.toLowerCase();
        const searchMatch =
          !searchQuery ||
          (r.reason || "").toLowerCase().includes(s) ||
          (r.targetUsername || "").toLowerCase().includes(s) ||
          (r.reporterUsername || "").toLowerCase().includes(s);
        return statusMatch && searchMatch;
      }),
    [reports, statusFilter, searchQuery],
  );

  const counts = useMemo(
    () => ({
      pending: reports.filter((r) => r.status === "pending").length,
      reviewed: reports.filter((r) => r.status === "reviewed").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      all: reports.length,
    }),
    [reports],
  );

  return (
    <div className="min-h-screen bg-[#000] text-white pb-24">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <Link
            to="/app/admin"
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Admin Dashboard
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">User Reports</h1>
              <p className="text-white/30 text-sm mt-1">
                {counts.pending} pending · {counts.resolved} resolved
              </p>
            </div>
            <button
              onClick={() => fetchReports(true)}
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
          <div className="flex gap-1 flex-wrap">
            {[
              { key: "pending", count: counts.pending },
              { key: "reviewed", count: counts.reviewed },
              {
                key: "resolved",
                count: reports.filter((r) => r.status === "resolved").length,
              },
              { key: "all", count: counts.all },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statusFilter === f.key
                    ? "bg-white text-black border-white"
                    : "bg-[#0a0a0c] border-white/[0.05] text-white/40 hover:text-white",
                )}
              >
                {f.key}{" "}
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
              placeholder="Search reports..."
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

        {loading || refreshing ? (
          <ReportSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
            <Shield className="w-10 h-10 text-white/10 mb-4" />
            <p className="text-sm font-black text-white/20">No reports found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onUpdateStatus={handleUpdateStatus}
                expanded={expandedId === report.id}
                onExpand={(id) =>
                  setExpandedId((prev) => (prev === id ? null : id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportManager;
