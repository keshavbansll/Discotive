/**
 * @fileoverview Discotive OS — Admin Vault Verification Manager v2.0 (PRODUCTION)
 * @module Admin/VaultVerification
 *
 * ENHANCEMENTS v2.0:
 * - Added "YouTube Channels" tab: shows all pending connector.youtube verifications
 * - Admin can approve (sets verified: true) or reject (clears connector.youtube)
 *   with one click, triggering Firestore write + local optimistic state update
 * - All existing asset verification logic preserved and hardened
 * - awardVaultVerification import made resilient with try/catch
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
  where,
  orderBy,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
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
  Youtube,
  Check,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "../../lib/cn";
import CertificateExplorerModal from "./CertificateExplorerModal";

// ── Safe import of awardVaultVerification ────────────────────────────────────
let awardVaultVerification = null;
try {
  const scoreEngine = await import("../../lib/scoreEngine.js");
  awardVaultVerification = scoreEngine.awardVaultVerification;
} catch (_) {
  console.warn(
    "[VaultVerification] scoreEngine not available. Score awards will be skipped.",
  );
}

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
  { key: "youtube_channels", label: "YouTube Channels", special: true },
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
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB"];
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
              placeholder="Provide additional context..."
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/30 text-sm resize-none custom-scrollbar transition-colors placeholder-white/20"
            />
          </div>
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
// ASSET THREE-DOT MENU
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
            {/* Mark As with cascading submenu */}
            <div
              className="relative"
              onMouseEnter={() => {
                clearTimeout(markAsTimerRef.current);
                setShowMarkAs(true);
              }}
              onMouseLeave={() => {
                markAsTimerRef.current = setTimeout(
                  () => setShowMarkAs(false),
                  180,
                );
              }}
            >
              <button className="w-full px-4 py-3 text-left text-xs font-bold text-white hover:bg-[#1a1a1a] flex items-center justify-between border-b border-[#1a1a1a] transition-colors">
                <span className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  Mark As
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/30" />
              </button>
              <AnimatePresence>
                {showMarkAs && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-full top-0 mr-1.5 w-48 bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-[201] overflow-hidden"
                    onMouseEnter={() => clearTimeout(markAsTimerRef.current)}
                    onMouseLeave={() => {
                      markAsTimerRef.current = setTimeout(
                        () => setShowMarkAs(false),
                        180,
                      );
                    }}
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
      cls: "text-emerald-400 bg-emerald-500/8 border-emerald-500/20",
    },
    PENDING: {
      label: "Pending",
      cls: "text-amber-400 bg-amber-500/8 border-amber-500/20",
    },
    REPORTED: {
      label: "Reported",
      cls: "text-red-400 bg-red-500/8 border-red-500/20",
    },
    REJECTED: {
      label: "Rejected",
      cls: "text-white/30 bg-white/4 border-white/10",
    },
  }[asset.status] || {
    label: asset.status || "Unknown",
    cls: "text-white/30 bg-white/4 border-white/10",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 p-5 bg-[#080808] border border-[#141414] rounded-2xl hover:border-[#222] transition-all"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
            catColor.bg,
            catColor.border,
            catColor.text,
          )}
        >
          {catIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-black text-white truncate">
              {asset.title || "Untitled Asset"}
            </p>
            <span
              className={cn(
                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0",
                statusBadge.cls,
              )}
            >
              {statusBadge.label}
            </span>
            {asset.strength && (
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border shrink-0",
                  asset.strength === "Strong"
                    ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400"
                    : asset.strength === "Medium"
                      ? "bg-amber-500/8 border-amber-500/20 text-amber-400"
                      : "bg-orange-500/8 border-orange-500/20 text-orange-400",
                )}
              >
                {asset.strength}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 font-mono">
              @{asset.userUsername || "unknown"}
            </span>
            <span className="text-[10px] text-white/20">
              · {timeAgo(asset.uploadedAt)}
            </span>
            {asset.size > 0 && (
              <span className="text-[10px] text-white/15 font-mono">
                {formatBytes(asset.size)}
              </span>
            )}
          </div>
        </div>
        <AssetThreeDotMenu
          asset={asset}
          onMarkAs={onMarkAs}
          onReport={onReport}
          onViewUser={() => {}}
        />
      </div>

      {/* Credentials */}
      {asset.credentials && Object.keys(asset.credentials).length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {Object.entries(asset.credentials)
            .filter(([, v]) => v && String(v).trim())
            .slice(0, 6)
            .map(([k, v]) => (
              <div key={k} className="overflow-hidden">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest truncate">
                  {k.replace(/([A-Z])/g, " $1").trim()}
                </p>
                <p className="text-[10px] text-white/50 font-mono truncate">
                  {String(v)}
                </p>
              </div>
            ))}
        </div>
      )}

      {/* Asset URL */}
      {asset.url && (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[10px] font-bold text-sky-400 hover:underline truncate"
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{asset.url}</span>
        </a>
      )}

      {/* Quick action buttons */}
      {(asset.status === "PENDING" || !asset.status) && (
        <div className="flex gap-2 pt-1 border-t border-[#111]">
          {["Strong", "Medium", "Weak"].map((strength) => {
            const opts = MARK_AS_OPTIONS.find((o) => o.key === strength);
            return (
              <button
                key={strength}
                onClick={() => onMarkAs(asset, strength)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                  opts.color,
                  opts.bg,
                  opts.border,
                )}
              >
                {strength}
              </button>
            );
          })}
          <button
            onClick={() => onMarkAs(asset, "Fake")}
            className="px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all text-red-500 bg-red-500/10 border-red-500/20"
          >
            Fake
          </button>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// YOUTUBE CHANNEL VERIFICATION CARD
// ============================================================================

const YouTubeChannelCard = ({ channel, onApprove, onReject }) => {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    await onApprove(channel);
    setApproving(false);
  };

  const handleReject = async () => {
    if (
      !window.confirm(
        `Reject @${channel.userUsername}'s YouTube channel verification? This will remove their pending submission.`,
      )
    )
      return;
    setRejecting(true);
    await onReject(channel);
    setRejecting(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 p-5 bg-[#080808] border border-[#141414] rounded-2xl hover:border-[#222] transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-red-500/8 border-red-500/20 shrink-0">
          <Youtube className="w-4 h-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <p className="text-sm font-black text-white truncate">
              {channel.handle ? `@${channel.handle}` : "YouTube Channel"}
            </p>
            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border text-amber-400 bg-amber-500/8 border-amber-500/20">
              Pending
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30 font-mono">
              @{channel.userUsername}
            </span>
            <span className="text-[10px] text-white/20">
              · {timeAgo(channel.submittedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Channel URL */}
      <a
        href={channel.channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[10px] font-bold text-red-400 hover:underline truncate"
      >
        <ExternalLink className="w-3 h-3 shrink-0" />
        <span className="truncate">{channel.channelUrl}</span>
      </a>

      {/* Description */}
      {channel.description && (
        <div
          className="p-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">
            Channel Description
          </p>
          <p className="text-xs text-white/60 leading-relaxed">
            {channel.description}
          </p>
        </div>
      )}

      {/* User meta */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-0.5">
            Submitted By
          </p>
          <a
            href={`/${channel.userUsername}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-sky-400 hover:underline font-mono"
          >
            @{channel.userUsername}
          </a>
        </div>
        <div>
          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-0.5">
            User Name
          </p>
          <p className="text-[10px] text-white/50">{channel.userName || "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1 border-t border-[#111]">
        <button
          onClick={handleApprove}
          disabled={approving || rejecting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {approving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsUp className="w-3.5 h-3.5" />
          )}
          {approving ? "Approving..." : "Approve"}
        </button>
        <button
          onClick={handleReject}
          disabled={approving || rejecting}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 disabled:opacity-40"
        >
          {rejecting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ThumbsDown className="w-3.5 h-3.5" />
          )}
          {rejecting ? "Rejecting..." : "Reject"}
        </button>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN VAULT VERIFICATION COMPONENT
// ============================================================================

const VaultVerification = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "All";

  // ── State ────────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState([]);
  const [ytPendingChannels, setYtPendingChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [reportingAsset, setReportingAsset] = useState(null);
  const [certExplorerOpen, setCertExplorerOpen] = useState(false);
  const [certTargetAsset, setCertTargetAsset] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 30;

  // ── Fetch all data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const snap = await getDocs(
        query(collection(db, "users"), limit(PAGE_SIZE)),
      );

      const assetList = [];
      snap.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const vault = data.vault || [];
        vault.forEach((asset) => {
          assetList.push({
            ...asset,
            userId: userDoc.id,
            userName:
              `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
              "Unknown",
            userUsername: data.identity?.username || "unknown",
          });
        });
      });

      setAssets(assetList);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);

      // Fetch pending YouTube channel verifications
      const ytPending = [];
      snap.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const ytConnector = data.connectors?.youtube;
        if (ytConnector?.channelUrl && !ytConnector.verified) {
          ytPending.push({
            userId: userDoc.id,
            userName:
              `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
              "Unknown",
            userUsername: data.identity?.username || "unknown",
            ...ytConnector,
          });
        }
      });
      setYtPendingChannels(ytPending);
    } catch (err) {
      console.error("[VaultVerification] Fetch failed:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(
        query(collection(db, "users"), startAfter(lastDoc), limit(PAGE_SIZE)),
      );
      const more = [];
      snap.docs.forEach((userDoc) => {
        const data = userDoc.data();
        (data.vault || []).forEach((asset) => {
          more.push({
            ...asset,
            userId: userDoc.id,
            userName:
              `${data.identity?.firstName || ""} ${data.identity?.lastName || ""}`.trim() ||
              "Unknown",
            userUsername: data.identity?.username || "unknown",
          });
        });
      });
      setAssets((prev) => [...prev, ...more]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, hasMore, loadingMore]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Mark Asset ────────────────────────────────────────────────────────────
  const handleMarkAs = useCallback(async (asset, strength) => {
    const isVerified = strength !== "Fake";
    const newStatus = isVerified ? "VERIFIED" : "REJECTED";

    // Optimistic update
    setAssets((prev) =>
      prev.map((a) =>
        a.id === asset.id && a.userId === asset.userId
          ? { ...a, status: newStatus, strength: isVerified ? strength : null }
          : a,
      ),
    );

    try {
      const userRef = doc(db, "users", asset.userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const vault = userSnap.data().vault || [];
      const updatedVault = vault.map((v) =>
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

      await updateDoc(userRef, { vault: updatedVault });

      // Award score points if verified
      if (isVerified && awardVaultVerification) {
        const pts = MARK_AS_OPTIONS.find((o) => o.key === strength)?.pts || 0;
        if (pts > 0) {
          try {
            await awardVaultVerification(
              asset.userId,
              pts,
              strength,
              asset.title,
            );
          } catch (scoreErr) {
            console.warn("[VaultVerification] Score award failed:", scoreErr);
          }
        }
      }
    } catch (err) {
      console.error("[VaultVerification] Mark as failed:", err);
      // Rollback
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id && a.userId === asset.userId
            ? { ...a, status: asset.status, strength: asset.strength }
            : a,
        ),
      );
    }
  }, []);

  // ── Report Asset ──────────────────────────────────────────────────────────
  const handleReport = useCallback(async (asset, reason, description) => {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === asset.id && a.userId === asset.userId
          ? { ...a, status: "REPORTED" }
          : a,
      ),
    );
    try {
      const userRef = doc(db, "users", asset.userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const vault = userSnap.data().vault || [];
      const updatedVault = vault.map((v) =>
        v.id === asset.id ? { ...v, status: "REPORTED" } : v,
      );
      await updateDoc(userRef, { vault: updatedVault });

      await addDoc(collection(db, "vault_reports"), {
        assetId: asset.id,
        userId: asset.userId,
        userUsername: asset.userUsername,
        assetTitle: asset.title,
        reason,
        description,
        reportedAt: new Date().toISOString(),
        reportedBy: auth.currentUser?.uid || "admin",
      });
    } catch (err) {
      console.error("[VaultVerification] Report failed:", err);
    }
  }, []);

  // ── YouTube Channel Approval ──────────────────────────────────────────────
  const handleApproveYouTubeChannel = useCallback(async (channel) => {
    try {
      await updateDoc(doc(db, "users", channel.userId), {
        "connectors.youtube.verified": true,
        "connectors.youtube.verifiedAt": new Date().toISOString(),
        "connectors.youtube.verifiedBy": auth.currentUser?.uid || "admin",
      });
      setYtPendingChannels((prev) =>
        prev.filter((c) => c.userId !== channel.userId),
      );
    } catch (err) {
      console.error("[VaultVerification] YouTube approval failed:", err);
      alert("Approval failed: " + err.message);
    }
  }, []);

  const handleRejectYouTubeChannel = useCallback(async (channel) => {
    try {
      await updateDoc(doc(db, "users", channel.userId), {
        "connectors.youtube": null,
      });
      setYtPendingChannels((prev) =>
        prev.filter((c) => c.userId !== channel.userId),
      );
    } catch (err) {
      console.error("[VaultVerification] YouTube rejection failed:", err);
      alert("Rejection failed: " + err.message);
    }
  }, []);

  // ── Filtered assets ───────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const tabMatch = activeTab === "All" || a.category === activeTab;
      const statusMatch =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING" && (!a.status || a.status === "PENDING")) ||
        (statusFilter === "REPORTED" && a.status === "REPORTED");
      const s = searchQuery.toLowerCase();
      const searchMatch =
        !searchQuery ||
        (a.title || "").toLowerCase().includes(s) ||
        (a.userUsername || "").toLowerCase().includes(s) ||
        (a.userName || "").toLowerCase().includes(s);
      return tabMatch && statusMatch && searchMatch;
    });
  }, [assets, activeTab, statusFilter, searchQuery]);

  const pendingCount = useMemo(
    () => assets.filter((a) => !a.status || a.status === "PENDING").length,
    [assets],
  );
  const ytPendingCount = ytPendingChannels.length;

  const isYtTab = activeTab === "youtube_channels";

  return (
    <div className="min-h-screen bg-[#000] text-white pb-24">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/app/admin"
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Admin Dashboard
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-white">
                Vault Verification
              </h1>
              <p className="text-white/30 text-sm mt-1">
                {pendingCount} assets pending · {ytPendingCount} YouTube channel
                {ytPendingCount !== 1 ? "s" : ""} awaiting approval
              </p>
            </div>
            <button
              onClick={() => fetchData(true)}
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

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap mb-6 p-1 rounded-xl bg-[#0a0a0c] border border-white/[0.05]">
          {TABS.map((tab) => {
            const count =
              tab.key === "youtube_channels"
                ? ytPendingCount
                : tab.key === "All"
                  ? filteredAssets.length
                  : assets.filter(
                      (a) =>
                        a.category === tab.key &&
                        (!a.status || a.status === "PENDING"),
                    ).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                  activeTab === tab.key
                    ? tab.special
                      ? "bg-red-500/15 text-red-400 border-red-500/20"
                      : "bg-white text-black border-white"
                    : "bg-transparent border-transparent text-white/40 hover:text-white",
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className="ml-1.5 font-mono text-[8px] opacity-60">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters (only for asset tabs) */}
        {!isYtTab && (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 mb-6">
            <div className="flex gap-1 flex-wrap">
              {STATUS_FILTERS.map((f) => (
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
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="text"
                placeholder="Search assets or users..."
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
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-44 bg-white/[0.02] border border-white/[0.03] rounded-2xl"
              />
            ))}
          </div>
        ) : isYtTab ? (
          ytPendingChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-red-500/[0.1] rounded-3xl">
              <Youtube className="w-10 h-10 text-red-500/20 mb-4" />
              <p className="text-sm font-black text-white/20">
                No pending YouTube channel verifications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ytPendingChannels.map((channel) => (
                <YouTubeChannelCard
                  key={channel.userId}
                  channel={channel}
                  onApprove={handleApproveYouTubeChannel}
                  onReject={handleRejectYouTubeChannel}
                />
              ))}
            </div>
          )
        ) : filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
            <Shield className="w-10 h-10 text-white/10 mb-4" />
            <p className="text-sm font-black text-white/20">
              No assets match the current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={`${asset.userId}-${asset.id}`}
                  asset={asset}
                  onMarkAs={handleMarkAs}
                  onReport={(a) => setReportingAsset(a)}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 bg-[#0a0a0c] border border-white/[0.05] text-white/60 hover:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : null}
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportingAsset && (
          <ReportModal
            asset={reportingAsset}
            onClose={() => setReportingAsset(null)}
            onSubmit={handleReport}
          />
        )}
      </AnimatePresence>

      {/* Certificate Explorer Modal */}
      <CertificateExplorerModal
        isOpen={certExplorerOpen}
        onClose={() => {
          setCertExplorerOpen(false);
          setCertTargetAsset(null);
        }}
        onSelect={(cert) => {
          setCertExplorerOpen(false);
          setCertTargetAsset(null);
        }}
      />
    </div>
  );
};

export default VaultVerification;
