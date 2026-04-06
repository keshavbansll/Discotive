/**
 * @fileoverview Discotive OS — Admin Vault Verification Manager
 * @module Admin/VaultVerification
 * @description
 * Full-featured vault asset verification interface for Discotive admins.
 * Fetches users in batches, extracts vault assets, and provides granular
 * controls per asset: Mark As (Weak/Medium/Strong/Fake) and Report.
 * All mutations write directly to Firestore and update local state optimistically.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  limit,
  startAfter,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { awardVaultVerification } from "../../lib/scoreEngine";
import {
  Award,
  FileText,
  Code2,
  BookOpen,
  Briefcase,
  Link as LinkIcon,
  Database,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Clock,
  ExternalLink,
  MoreHorizontal,
  ChevronRight,
  X,
  RefreshCw,
  ArrowLeft,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronDown,
  Hash,
  User,
  Ban,
} from "lucide-react";
import { cn } from "../../lib/cn";
import CertificateExplorerModal from "./CertificateExplorerModal";

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS = [
  { key: "All", label: "All Assets" },
  { key: "Certificate", label: "Certificates" },
  { key: "Resume", label: "Resumes" },
  { key: "Project", label: "Projects" },
  { key: "Publication", label: "Publications" },
  { key: "Employment", label: "Employment" },
  { key: "Link", label: "Links" },
];

const STATUS_FILTERS = [
  { key: "PENDING", label: "Pending", color: "text-amber-500" },
  { key: "REPORTED", label: "Reported", color: "text-red-400" },
  { key: "ALL", label: "All", color: "text-white/60" },
];

const MARK_AS_OPTIONS = [
  {
    key: "Strong",
    label: "Strong",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    pts: 30,
  },
  {
    key: "Medium",
    label: "Medium",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    pts: 20,
  },
  {
    key: "Weak",
    label: "Weak",
    icon: ShieldAlert,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    pts: 10,
  },
  {
    key: "Fake",
    label: "Fake / Forged",
    icon: Ban,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    pts: 0,
  },
];

const REPORT_REASONS = [
  "Can't Be Verified",
  "Illegal Content",
  "Sexual / Graphic Content",
  "Bot / Spam Asset",
  "Duplicate Submission",
  "Forged / Fake Document",
  "Misleading Information",
  "Copyright Violation",
  "Others",
];

const CATEGORY_ICON = {
  Certificate: <Award className="w-4 h-4" />,
  Resume: <FileText className="w-4 h-4" />,
  Project: <Code2 className="w-4 h-4" />,
  Publication: <BookOpen className="w-4 h-4" />,
  Employment: <Briefcase className="w-4 h-4" />,
  Link: <LinkIcon className="w-4 h-4" />,
};

const CATEGORY_COLOR = {
  Certificate: {
    text: "text-amber-400",
    bg: "bg-amber-500/8",
    border: "border-amber-500/20",
  },
  Resume: {
    text: "text-blue-400",
    bg: "bg-blue-500/8",
    border: "border-blue-500/20",
  },
  Project: {
    text: "text-violet-400",
    bg: "bg-violet-500/8",
    border: "border-violet-500/20",
  },
  Publication: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/8",
    border: "border-cyan-500/20",
  },
  Employment: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/20",
  },
  Link: {
    text: "text-sky-400",
    bg: "bg-sky-500/8",
    border: "border-sky-500/20",
  },
};

const DEFAULT_CAT_COLOR = {
  text: "text-white/60",
  bg: "bg-white/5",
  border: "border-white/10",
};

const formatBytes = (bytes = 0) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const timeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ============================================================================
// REPORT MODAL
// ============================================================================

const ReportModal = ({ asset, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    await onSubmit(asset, reason, description);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-lg"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="relative w-full max-w-md bg-[#080808] border border-[#1e1e1e] rounded-[2rem] p-7 shadow-[0_60px_120px_rgba(0,0,0,0.95)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Report Asset</h3>
              <p className="text-[9px] text-white/30 font-mono truncate max-w-[200px]">
                {asset?.title || "Unknown"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#111] border border-[#1e1e1e] rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason Select */}
          <div>
            <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">
              Reason <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/40 text-sm font-bold appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled>
                  Select a reason...
                </option>
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                Additional Details (Optional)
              </label>
              <span
                className={cn(
                  "text-[9px] font-mono",
                  description.length > 900 ? "text-amber-500" : "text-white/20",
                )}
              >
                {description.length}/1000
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Provide additional context about why this asset is being reported..."
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/30 text-sm resize-none custom-scrollbar transition-colors placeholder-white/20"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#0d0d0d] border border-[#1e1e1e] text-white/60 text-xs font-bold rounded-xl hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="flex-1 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-30 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Submit Report
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ============================================================================
// 3-DOT MENU WITH CASCADING MARK-AS
// ============================================================================

const AssetThreeDotMenu = ({ asset, onMarkAs, onReport, onViewUser }) => {
  const [open, setOpen] = useState(false);
  const [showMarkAs, setShowMarkAs] = useState(false);
  const menuRef = useRef(null);
  const markAsTimerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
        setShowMarkAs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAsEnter = () => {
    clearTimeout(markAsTimerRef.current);
    setShowMarkAs(true);
  };
  const handleMarkAsLeave = () => {
    markAsTimerRef.current = setTimeout(() => setShowMarkAs(false), 180);
  };
  const handleSubmenuEnter = () => clearTimeout(markAsTimerRef.current);
  const handleSubmenuLeave = () => {
    markAsTimerRef.current = setTimeout(() => setShowMarkAs(false), 180);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          setOpen(!open);
          setShowMarkAs(false);
        }}
        className="w-8 h-8 bg-[#111] border border-[#1e1e1e] rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-[#1a1a1a] transition-all"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-1.5 w-52 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-[200] overflow-visible"
          >
            {/* Mark As */}
            <div
              className="relative"
              onMouseEnter={handleMarkAsEnter}
              onMouseLeave={handleMarkAsLeave}
            >
              <button className="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-[#1a1a1a] flex items-center justify-between border-b border-[#1a1a1a] transition-colors">
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  Mark As
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              </button>

              {/* Cascading Submenu */}
              <AnimatePresence>
                {showMarkAs && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-full top-0 mr-1.5 w-48 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-[201] overflow-hidden"
                    onMouseEnter={handleSubmenuEnter}
                    onMouseLeave={handleSubmenuLeave}
                  >
                    {MARK_AS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => {
                            onMarkAs(asset, opt.key);
                            setOpen(false);
                            setShowMarkAs(false);
                          }}
                          className={cn(
                            "w-full px-4 py-3 text-left text-xs font-bold hover:bg-[#1a1a1a] flex items-center gap-2.5 border-b border-[#1a1a1a] last:border-0 transition-colors",
                            opt.color,
                          )}
                        >
                          <div
                            className={cn(
                              "w-6 h-6 rounded-lg flex items-center justify-center border",
                              opt.bg,
                              opt.border,
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="block">{opt.label}</span>
                            {opt.pts > 0 && (
                              <span className="text-[8px] text-white/30 font-medium block">
                                +{opt.pts} pts to user
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Report */}
            <button
              onClick={() => {
                onReport(asset);
                setOpen(false);
              }}
              className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:bg-[#1a1a1a] flex items-center gap-2 border-b border-[#1a1a1a] transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report Asset
            </button>

            {/* View User Profile */}
            <a
              href={`/${asset.userUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full px-4 py-3 text-left text-xs font-bold text-white/60 hover:text-white hover:bg-[#1a1a1a] flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                View User Profile
              </span>
              <ExternalLink className="w-3 h-3 text-white/20" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// ASSET CARD
// ============================================================================

const AssetCard = ({ asset, onMarkAs, onReport }) => {
  const catColor = CATEGORY_COLOR[asset.category] || DEFAULT_CAT_COLOR;
  const catIcon = CATEGORY_ICON[asset.category] || (
    <Database className="w-4 h-4" />
  );

  const statusBadge = {
    VERIFIED: {
      label: "Verified",
      color: "text-emerald-400",
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/20",
      icon: <ShieldCheck className="w-3 h-3" />,
    },
    PENDING: {
      label: "Pending",
      color: "text-amber-400",
      bg: "bg-amber-500/8",
      border: "border-amber-500/20",
      icon: <Clock className="w-3 h-3" />,
    },
    REPORTED: {
      label: "Reported",
      color: "text-red-400",
      bg: "bg-red-500/8",
      border: "border-red-500/20",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
    REJECTED: {
      label: "Rejected",
      color: "text-red-500",
      bg: "bg-red-500/8",
      border: "border-red-500/20",
      icon: <X className="w-3 h-3" />,
    },
  };
  const badge = statusBadge[asset.status] || statusBadge.PENDING;

  const credentials = asset.credentials || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-[#080808] border border-[#1a1a1a] rounded-2xl p-5 hover:border-[#2a2a2a] transition-all group relative overflow-visible"
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Category Icon */}
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
              catColor.bg,
              catColor.border,
              catColor.text,
            )}
          >
            {catIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="text-sm font-black text-white leading-tight truncate"
              title={asset.title}
            >
              {asset.title || "Untitled Asset"}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                  catColor.bg,
                  catColor.border,
                  catColor.text,
                )}
              >
                {asset.category || "Unknown"}
              </span>
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border flex items-center gap-1",
                  badge.bg,
                  badge.border,
                  badge.color,
                )}
              >
                {badge.icon}
                {badge.label}
              </span>
              {asset.strength && (
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                    asset.strength === "Strong"
                      ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                      : asset.strength === "Medium"
                        ? "bg-amber-500/8 border-amber-500/20 text-amber-400"
                        : asset.strength === "Weak"
                          ? "bg-orange-500/8 border-orange-500/20 text-orange-400"
                          : "bg-red-500/8 border-red-500/20 text-red-400",
                  )}
                >
                  {asset.strength}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3-Dot Menu */}
        <div className="shrink-0 ml-2 relative z-50">
          <AssetThreeDotMenu
            asset={asset}
            onMarkAs={onMarkAs}
            onReport={onReport}
          />
        </div>
      </div>

      {/* Uploaded By */}
      <div className="flex items-center gap-2 mb-4 p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[10px] font-black text-white/50 shrink-0">
          {asset.userName?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-white/70 truncate">
            {asset.userName || "Unknown"}
          </p>
          <p className="text-[9px] text-white/30 font-mono truncate">
            @{asset.userUsername}
          </p>
        </div>
        <p className="text-[9px] text-white/20 shrink-0 font-mono">
          {timeAgo(asset.uploadedAt)}
        </p>
      </div>

      {/* Credential Fields */}
      {Object.keys(credentials).filter((k) => credentials[k]).length > 0 && (
        <div className="grid grid-cols-1 gap-2 mb-4">
          {Object.entries(credentials)
            .filter(([, v]) => v)
            .slice(0, 4)
            .map(([key, value]) => {
              const isUrl =
                typeof value === "string" && value.startsWith("http");
              return (
                <div
                  key={key}
                  className="flex items-start gap-2 p-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg"
                >
                  <span className="text-[8px] font-black uppercase tracking-widest text-white/25 min-w-[70px] pt-0.5 capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  {isUrl ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-mono text-sky-400 hover:text-sky-300 truncate flex-1 flex items-center gap-1"
                    >
                      {value.length > 45 ? value.slice(0, 45) + "..." : value}
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-[10px] font-mono text-white/60 truncate flex-1">
                      {String(value)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Hash + Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Hash className="w-3 h-3 text-white/20 shrink-0" />
          <span className="text-[9px] font-mono text-white/20 truncate">
            {asset.hash?.slice(0, 24) || "no-hash"}...
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] text-white/20 font-mono">
            {asset.type === "link" ? "URL" : formatBytes(asset.size)}
          </span>
          {asset.url && (
            <a
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/8 rounded-lg text-[9px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <Eye className="w-3 h-3" />
              Preview
            </a>
          )}
        </div>
      </div>

      {/* Strength reward indicator */}
      {asset.scoreYield && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
            Score Awarded
          </span>
          <span className="text-[10px] font-black text-emerald-400 font-mono">
            +{asset.scoreYield} pts
          </span>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// MAIN VAULT VERIFICATION PAGE
// ============================================================================

const VaultVerification = () => {
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "PENDING";

  // ── Pending Verification State (MOVED INSIDE HOOK BODY) ──
  const [pendingVerification, setPendingVerification] = useState(null);

  // ── Data State ──
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [totalFetched, setTotalFetched] = useState(0);

  // ── UI State ──
  const [activeTab, setActiveTab] = useState("All");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [reportTarget, setReportTarget] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now();
    setToasts((prev) => [...prev.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  // ── FETCH VAULT ASSETS (batch user reads) ──
  const fetchVaultAssets = useCallback(
    async (loadMore = false) => {
      if (!loadMore) setLoading(true);
      else setFetching(true);

      try {
        let q = query(collection(db, "users"), limit(30));
        if (loadMore && lastDoc) {
          q = query(collection(db, "users"), startAfter(lastDoc), limit(30));
        }

        const snap = await getDocs(q);
        if (snap.docs.length < 30) setHasMore(false);
        if (snap.docs.length > 0) setLastDoc(snap.docs[snap.docs.length - 1]);

        setTotalFetched((p) => p + snap.docs.length);

        const extracted = [];
        snap.docs.forEach((userDoc) => {
          const data = userDoc.data();
          const vault = data.vault || [];
          vault.forEach((asset) => {
            extracted.push({
              ...asset,
              _key: `${userDoc.id}_${asset.id}`,
              userId: userDoc.id,
              userName:
                `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
                "Unknown",
              userEmail: data.identity?.email || "",
              userUsername: data.identity?.username || "unknown",
            });
          });
        });

        if (loadMore) {
          setAllAssets((prev) => {
            // Deduplicate by _key
            const existing = new Set(prev.map((a) => a._key));
            return [...prev, ...extracted.filter((a) => !existing.has(a._key))];
          });
        } else {
          setAllAssets(extracted);
        }
      } catch (err) {
        console.error("[VaultVerification] Fetch error:", err);
        addToast("Failed to load assets. Check Firestore permissions.", "red");
      } finally {
        setLoading(false);
        setFetching(false);
      }
    },
    [lastDoc, addToast],
  );

  useEffect(() => {
    fetchVaultAssets(false);
  }, []); // eslint-disable-line

  // ── MARK AS ──────────────────────────────────────────────────────────────
  // 1. Intercepts the click. Opens modal if verified, bypasses if Fake.
  const handleMarkAsInitiate = useCallback((asset, strength) => {
    const isVerified = ["Weak", "Medium", "Strong"].includes(strength);
    if (isVerified) {
      setPendingVerification({ asset, strength });
    } else {
      handleMarkAsConfirm(asset, strength, null); // Fake doesn't need a certificate
    }
  }, []);

  // 2. The actual database mutation logic
  const handleMarkAsConfirm = useCallback(
    async (asset, strength, learnId) => {
      const isVerified = ["Weak", "Medium", "Strong"].includes(strength);
      const pts = strength === "Strong" ? 30 : strength === "Medium" ? 20 : 10;

      try {
        const userRef = doc(db, "users", asset.userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          addToast("User document not found.", "red");
          return;
        }

        const userVault = userSnap.data().vault || [];
        const updatedVault = userVault.map((a) =>
          a.id === asset.id
            ? {
                ...a,
                status: isVerified ? "VERIFIED" : "REJECTED",
                strength: strength,
                verifiedAt: new Date().toISOString(),
                verifiedBy: auth.currentUser?.email,
                isPublic: isVerified,
                scoreYield: isVerified ? pts : 0,
                ...(learnId && { discotiveLearnId: learnId }), // Inject Learn ID invisibly
              }
            : a,
        );

        await updateDoc(userRef, { vault: updatedVault });

        if (isVerified) {
          awardVaultVerification(asset.userId, strength).catch(console.warn);
        }

        setAllAssets((prev) =>
          prev.map((a) =>
            a._key === asset._key
              ? {
                  ...a,
                  status: isVerified ? "VERIFIED" : "REJECTED",
                  strength,
                  scoreYield: isVerified ? pts : 0,
                  isPublic: isVerified,
                }
              : a,
          ),
        );

        addToast(
          isVerified
            ? `Asset marked ${strength} & Aligned. +${pts} pts to @${asset.userUsername}.`
            : `Asset marked as Fake/Rejected.`,
          isVerified ? "green" : "grey",
        );
      } catch (err) {
        console.error("[VaultVerification] Mark As failed:", err);
        addToast("Failed to update asset. Try again.", "red");
      } finally {
        setPendingVerification(null); // Cleanup
      }
    },
    [addToast],
  );

  // ── REPORT ───────────────────────────────────────────────────────────────
  const handleReport = useCallback(
    async (asset, reason, description) => {
      try {
        // 1. Write to vault_reports collection
        await addDoc(collection(db, "vault_reports"), {
          assetId: asset.id,
          assetTitle: asset.title,
          assetCategory: asset.category,
          userId: asset.userId,
          userName: asset.userName,
          userEmail: asset.userEmail,
          reason,
          description: description || "",
          reportedBy: auth.currentUser?.email || "unknown",
          reportedAt: new Date().toISOString(),
          status: "open",
        });

        // 2. Update asset status to REPORTED in user's vault
        const userRef = doc(db, "users", asset.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userVault = userSnap.data().vault || [];
          const updatedVault = userVault.map((a) =>
            a.id === asset.id
              ? {
                  ...a,
                  status: "REPORTED",
                  reportedAt: new Date().toISOString(),
                  reportReason: reason,
                }
              : a,
          );
          await updateDoc(userRef, { vault: updatedVault });
        }

        // 3. Local update
        setAllAssets((prev) =>
          prev.map((a) =>
            a._key === asset._key ? { ...a, status: "REPORTED" } : a,
          ),
        );

        addToast(`Asset reported. Case logged in vault_reports.`, "grey");
      } catch (err) {
        console.error("[VaultVerification] Report failed:", err);
        addToast("Report submission failed. Check console.", "red");
      }
    },
    [addToast],
  );

  // ── FILTERED ASSETS ──────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      const tabMatch = activeTab === "All" || asset.category === activeTab;

      let statusMatch = true;
      if (statusFilter === "PENDING")
        statusMatch = asset.status === "PENDING" || !asset.status;
      if (statusFilter === "REPORTED")
        statusMatch = asset.status === "REPORTED";

      const searchLower = searchQuery.toLowerCase();
      const searchMatch =
        !searchQuery ||
        (asset.title || "").toLowerCase().includes(searchLower) ||
        (asset.userName || "").toLowerCase().includes(searchLower) ||
        (asset.userUsername || "").toLowerCase().includes(searchLower) ||
        (asset.credentials?.issuer || "").toLowerCase().includes(searchLower) ||
        (asset.credentials?.company || "")
          .toLowerCase()
          .includes(searchLower) ||
        (asset.hash || "").toLowerCase().includes(searchLower);

      return tabMatch && statusMatch && searchMatch;
    });
  }, [allAssets, activeTab, statusFilter, searchQuery]);

  // ── TAB COUNTS ──────────────────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts = { All: 0 };
    TABS.forEach((t) => {
      counts[t.key] = 0;
    });
    allAssets.forEach((a) => {
      if (statusFilter === "PENDING" && a.status !== "PENDING" && a.status)
        return;
      if (statusFilter === "REPORTED" && a.status !== "REPORTED") return;
      counts["All"] = (counts["All"] || 0) + 1;
      if (a.category) counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [allAssets, statusFilter]);

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
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
                className="w-1 h-5 bg-emerald-500 rounded-full"
              />
            ))}
          </div>
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
            Loading vault assets...
          </p>
        </div>
      </div>
    );
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000000] text-white pb-32 font-sans selection:bg-emerald-500/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      <div className="max-w-[1600px] mx-auto p-4 md:p-8 relative z-10">
        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8"
        >
          <div>
            <Link
              to="/app/admin"
              className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              Vault Verification Manager
            </h1>
            <p className="text-white/30 text-sm mt-1.5">
              {allAssets.length} total assets from {totalFetched} users scanned
              {hasMore && " (more available)"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf.key}
                onClick={() => setStatusFilter(sf.key)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statusFilter === sf.key
                    ? `${sf.color} bg-white/5 border-current`
                    : "text-white/30 border-white/[0.05] hover:text-white",
                )}
              >
                {sf.label}
                <span className="ml-1.5 font-mono text-[8px]">
                  (
                  {sf.key === "PENDING"
                    ? allAssets.filter(
                        (a) => a.status === "PENDING" || !a.status,
                      ).length
                    : sf.key === "REPORTED"
                      ? allAssets.filter((a) => a.status === "REPORTED").length
                      : allAssets.length}
                  )
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── SEARCH + TABS ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              type="text"
              placeholder="Search by title, user, issuer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/[0.05] text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-white/20 text-xs placeholder-white/20 transition-all"
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

          {/* Category Tabs */}
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  activeTab === tab.key
                    ? "bg-white text-black border-white"
                    : "bg-[#0a0a0c] border-white/[0.05] text-white/40 hover:text-white",
                )}
              >
                {tab.label}
                {tabCounts[tab.key] !== undefined && (
                  <span className="ml-1.5 font-mono text-[8px] opacity-60">
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── RESULTS COUNT ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
            Showing {filteredAssets.length} assets
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {hasMore && (
            <button
              onClick={() => fetchVaultAssets(true)}
              disabled={fetching}
              className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-3 h-3", fetching && "animate-spin")}
              />
              {fetching ? "Loading..." : "Load More Users"}
            </button>
          )}
        </div>

        {/* ── ASSET GRID ── */}
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-white/[0.05] rounded-3xl">
            <Database className="w-12 h-12 text-white/10 mb-4" />
            <h3 className="text-lg font-black text-white/30 mb-1">
              No assets found
            </h3>
            <p className="text-[10px] font-bold text-white/15 uppercase tracking-widest">
              {statusFilter === "PENDING"
                ? "All pending assets have been reviewed"
                : statusFilter === "REPORTED"
                  ? "No reported assets on file"
                  : "No assets match the current filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset._key}
                  asset={asset}
                  onMarkAs={handleMarkAsInitiate}
                  onReport={(a) => setReportTarget(a)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── LOAD MORE BUTTON ── */}
        {hasMore && filteredAssets.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => fetchVaultAssets(true)}
              disabled={fetching}
              className="px-8 py-3.5 bg-[#0a0a0c] border border-white/[0.05] text-white/60 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 disabled:opacity-40"
            >
              <RefreshCw
                className={cn("w-4 h-4", fetching && "animate-spin")}
              />
              {fetching ? "Scanning more users..." : "Load More Users"}
            </button>
          </div>
        )}
      </div>

      {/* ── REPORT MODAL ── */}
      <AnimatePresence>
        {reportTarget && (
          <ReportModal
            asset={reportTarget}
            onClose={() => setReportTarget(null)}
            onSubmit={handleReport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingVerification && (
          <CertificateExplorerModal
            isOpen={!!pendingVerification}
            onClose={() => setPendingVerification(null)}
            onSelect={(selectedCert) => {
              handleMarkAsConfirm(
                pendingVerification.asset,
                pendingVerification.strength,
                selectedCert.discotiveLearnId,
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* ── TOAST NOTIFICATIONS ── */}
      <div className="fixed bottom-5 left-4 md:left-8 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -16, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-bold max-w-[340px] pointer-events-auto",
                t.type === "green"
                  ? "bg-[#041f10] border-emerald-500/25 text-emerald-400"
                  : t.type === "red"
                    ? "bg-[#1a0505] border-red-500/25 text-red-400"
                    : "bg-[#0d0d0d] border-[#1e1e1e] text-white",
              )}
            >
              {t.type === "green" && (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              {t.type === "red" && (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              {t.type === "grey" && (
                <Shield className="w-4 h-4 text-white/40 shrink-0" />
              )}
              <span className="truncate">{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VaultVerification;
