/**
 * @fileoverview Discotive Learn — Content Database & Knowledge Engine
 * @module Pages/LearnDatabase
 *
 * @description
 * Browse verified certificates, courses, and curated videos from the
 * Discotive Learn Database. Tracks completion state against the user's vault,
 * surfaces contextual score rewards, and provides deep-link to roadmap nodes.
 *
 * Architecture:
 * - Zero onSnapshot. All reads via getDocs (one-shot, paginated).
 * - Completion state diffed from user's vault (no extra reads).
 * - Admin CMS inline — create/edit/delete certs & videos without leaving page.
 * - Full mobile bottom-sheet UI for item detail.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Video,
  Award,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Plus,
  Check,
  ShieldCheck,
  Clock,
  Zap,
  Star,
  Globe,
  Tag,
  ExternalLink,
  Play,
  Loader2,
  RefreshCw,
  Upload,
  Pencil,
  Trash2,
  Link2,
  GraduationCap,
  BarChart2,
  Flame,
  Target,
  Lock,
  Eye,
  AlertTriangle,
  Database,
  Layers,
  TrendingUp,
} from "lucide-react";

import { cn } from "../lib/cn";
import { useUserData } from "../hooks/useUserData";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  fetchCertificates,
  fetchVideos,
  createCertificate,
  updateCertificate,
  createVideo,
  updateVideo,
  VIDEO_CATEGORIES,
  CERTIFICATE_CATEGORIES,
  DIFFICULTY_LEVELS,
  DOMAINS,
  calculateVideoScore,
  verifyLearnCompletion,
} from "../lib/discotiveLearn";

// ─── Constants ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 18;

const DIFF_COLORS = {
  Beginner: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  Intermediate: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Advanced: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
  },
  Expert: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

const CAT_COLORS = [
  "#BFA264",
  "#10b981",
  "#8b5cf6",
  "#38bdf8",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatDuration = (d) => {
  if (!d) return null;
  if (typeof d === "number") {
    const h = Math.floor(d / 60);
    const m = d % 60;
    return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
  }
  return d;
};

const getYtThumb = (id) =>
  id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;

// ─── Sub-components ─────────────────────────────────────────────────────────

const Pill = ({ active, onClick, children, color = "amber" }) => {
  const C = {
    amber: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    emerald: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    violet: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  };
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all shrink-0",
        active
          ? C[color] || C.amber
          : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/70 hover:bg-white/[0.05]",
      )}
    >
      {children}
    </button>
  );
};

const DiffBadge = ({ level }) => {
  const c = DIFF_COLORS[level] || DIFF_COLORS.Beginner;
  return (
    <span
      className={cn(
        "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
        c.text,
        c.bg,
        c.border,
      )}
    >
      {level}
    </span>
  );
};

const CompletionRing = ({ pct = 0, size = 32, stroke = 3 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 95 ? "#10b981" : "#BFA264"}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
};

// ─── Certificate Card ────────────────────────────────────────────────────────
const CertCard = ({ cert, completion, onSelect, isAdmin, onEdit }) => {
  const isCompleted = completion?.verified;
  const isPending = completion?.pending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onSelect(cert)}
      className={cn(
        "group relative flex flex-col cursor-pointer rounded-[1.25rem] border transition-all duration-200 overflow-hidden",
        isCompleted
          ? "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40"
          : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333] hover:bg-[#0f0f0f]",
      )}
    >
      {/* Thumbnail or placeholder */}
      <div className="relative aspect-[16/7] bg-[#050505] overflow-hidden">
        {cert.thumbnailUrl ? (
          <img
            src={cert.thumbnailUrl}
            alt={cert.title}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Award className="w-10 h-10 text-[#BFA264]/20" />
          </div>
        )}
        {/* Completion overlay */}
        {isCompleted && (
          <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Check className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
        {isPending && !isCompleted && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[8px] font-black text-amber-400 uppercase tracking-widest">
            Pending
          </div>
        )}
        {/* Score badge */}
        {cert.scoreReward > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-lg border border-[#BFA264]/30">
            <Zap className="w-2.5 h-2.5 text-[#BFA264]" />
            <span className="text-[9px] font-black text-[#BFA264]">
              +{cert.scoreReward}
            </span>
          </div>
        )}
        {/* Admin edit */}
        {isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cert);
            }}
            className="absolute top-2 left-2 w-6 h-6 bg-black/70 border border-white/10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 flex-1">
            {cert.title}
          </h3>
        </div>
        <p className="text-[10px] text-[#666] font-medium">{cert.provider}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
          {cert.difficulty && <DiffBadge level={cert.difficulty} />}
          {cert.duration && (
            <span className="flex items-center gap-1 text-[8px] font-bold text-[#555] uppercase tracking-widest">
              <Clock className="w-2.5 h-2.5" /> {cert.duration}
            </span>
          )}
          {cert.category && (
            <span className="text-[8px] font-bold text-[#555] truncate">
              {cert.category}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Video Card ──────────────────────────────────────────────────────────────
const VideoCard = ({ video, completion, onSelect, isAdmin, onEdit }) => {
  const isCompleted = completion?.verified;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onSelect(video)}
      className={cn(
        "group relative flex flex-col cursor-pointer rounded-[1.25rem] border transition-all duration-200 overflow-hidden",
        isCompleted
          ? "bg-emerald-500/[0.04] border-emerald-500/25 hover:border-emerald-500/40"
          : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333] hover:bg-[#0f0f0f]",
      )}
    >
      <div className="relative aspect-video bg-[#050505] overflow-hidden">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0d0d0d]">
            <Play className="w-10 h-10 text-[#BFA264]/20" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
          {isCompleted ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#BFA264] flex items-center justify-center shadow-[0_0_20px_rgba(191,162,100,0.4)]">
              <Play className="w-5 h-5 text-black ml-0.5" />
            </div>
          )}
        </div>

        {/* Duration badge */}
        {video.durationMinutes && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] font-mono font-bold text-white">
            {formatDuration(video.durationMinutes)}
          </div>
        )}

        {/* Score */}
        {video.scoreReward > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded border border-[#BFA264]/30">
            <Zap className="w-2.5 h-2.5 text-[#BFA264]" />
            <span className="text-[8px] font-black text-[#BFA264]">
              +{video.scoreReward}
            </span>
          </div>
        )}

        {/* Category tag */}
        {video.category && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[8px] font-bold text-sky-400 border border-sky-500/20">
            {video.category}
          </div>
        )}

        {isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(video);
            }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/70 border border-white/10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="w-3 h-3 text-white" />
          </button>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1">
        <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">
          {video.title}
        </h3>
      </div>
    </motion.div>
  );
};

// ─── Detail Sheet ────────────────────────────────────────────────────────────
const DetailSheet = ({
  item,
  type,
  completion,
  onClose,
  onComplete,
  userData,
}) => {
  const [isLinking, setIsLinking] = useState(false);

  if (!item) return null;

  const isCompleted = completion?.verified;
  const isPending = completion?.pending;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center md:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="relative w-full md:max-w-2xl bg-[#080808] border border-[#1e1e1e] rounded-t-[2rem] md:rounded-[2rem] flex flex-col max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-1 shrink-0 md:hidden"
            aria-hidden
          >
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          {/* Media preview */}
          {type === "video" && item.youtubeId ? (
            <div className="aspect-video bg-black shrink-0">
              <iframe
                src={`https://www.youtube.com/embed/${item.youtubeId}?rel=0&modestbranding=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={item.title}
              />
            </div>
          ) : type === "cert" && item.thumbnailUrl ? (
            <div className="aspect-[16/6] bg-[#050505] shrink-0 relative">
              <img
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Award className="w-16 h-16 text-[#BFA264]/30" />
              </div>
            </div>
          ) : null}

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-black text-white leading-tight mb-1">
                  {item.title}
                </h2>
                {item.provider && (
                  <p className="text-sm text-[#888]">{item.provider}</p>
                )}
                {/* Learn ID */}
                {item.discotiveLearnId && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-1 bg-[#BFA264]/8 border border-[#BFA264]/20 rounded-lg">
                    <Database className="w-3 h-3 text-[#BFA264]" />
                    <span className="text-[9px] font-mono text-[#BFA264]">
                      {item.discotiveLearnId}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#666] hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              {item.difficulty && <DiffBadge level={item.difficulty} />}
              {item.category && (
                <span className="text-[9px] font-bold text-[#888] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                  {item.category}
                </span>
              )}
              {(item.duration || item.durationMinutes) && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-[#888] px-2 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg">
                  <Clock className="w-3 h-3" />
                  {formatDuration(item.duration || item.durationMinutes)}
                </span>
              )}
              {item.scoreReward > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-black text-[#BFA264] px-2 py-1 bg-[#BFA264]/8 border border-[#BFA264]/20 rounded-lg">
                  <Zap className="w-3 h-3" /> +{item.scoreReward} pts
                </span>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-[#888] leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Tags */}
            {item.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded-lg text-[9px] font-bold text-[#555]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Domains */}
            {item.domains?.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-[#444] uppercase tracking-widest mb-2">
                  Relevant Domains
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.domains.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-1 bg-[#BFA264]/5 border border-[#BFA264]/15 rounded-lg text-[9px] font-bold text-[#BFA264]/70"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Completion status */}
            {isCompleted && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-400">
                    Verified & Complete
                  </p>
                  <p className="text-[10px] text-emerald-400/60">
                    This asset is verified in your vault and linked to your
                    score.
                  </p>
                </div>
              </div>
            )}

            {isPending && !isCompleted && (
              <div className="flex items-center gap-3 p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-black text-amber-400">
                    Pending Audit
                  </p>
                  <p className="text-[10px] text-amber-400/60">
                    Submitted to vault. Awaiting admin verification.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="p-4 md:p-5 border-t border-[#1a1a1a] bg-[#050505] shrink-0 flex flex-col sm:flex-row gap-2.5">
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#BFA264] hover:bg-[#D4AF78] text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(191,162,100,0.2)]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {type === "cert" ? "Enroll Now" : "Watch on YouTube"}
              </a>
            )}
            {!isCompleted && !isPending && (
              <button
                onClick={() => {
                  if (!requireOnboarding("learn_upload")) return;
                  navigate("/app/vault");
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#111] border border-[#222] hover:bg-[#1a1a1a] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload to Vault
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ─── Admin Form Modal ────────────────────────────────────────────────────────
const AdminFormModal = ({ type, item, onClose, onSaved, adminEmail }) => {
  const isCert = type === "cert";
  const isEdit = !!item?.id;

  const [form, setForm] = useState(
    isCert
      ? {
          title: item?.title || "",
          provider: item?.provider || "",
          category: item?.category || "",
          link: item?.link || "",
          duration: item?.duration || "",
          difficulty: item?.difficulty || "Intermediate",
          scoreReward: item?.scoreReward || 50,
          thumbnailUrl: item?.thumbnailUrl || "",
          description: item?.description || "",
          tags: (item?.tags || []).join(", "),
          domains: (item?.domains || []).join(", "),
        }
      : {
          title: item?.title || "",
          youtubeId: item?.youtubeId || "",
          category: item?.category || "educational",
          durationMinutes: item?.durationMinutes || "",
          scoreReward: item?.scoreReward || 25,
          description: item?.description || "",
          tags: (item?.tags || []).join(", "),
          domains: (item?.domains || []).join(", "),
        },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const fieldCls =
    "w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white placeholder-[#333] focus:outline-none focus:border-[#BFA264]/40 transition-colors";

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Title required.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        scoreReward: Number(form.scoreReward) || 0,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        domains: form.domains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
      };
      if (!isCert)
        payload.durationMinutes = payload.durationMinutes
          ? Number(payload.durationMinutes)
          : null;

      if (isEdit) {
        if (isCert) await updateCertificate(item.id, payload, adminEmail);
        else await updateVideo(item.id, payload, adminEmail);
      } else {
        if (isCert) await createCertificate(payload, adminEmail);
        else await createVideo(payload, adminEmail);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative w-full max-w-lg bg-[#080808] border border-[#1e1e1e] rounded-[2rem] flex flex-col max-h-[90vh] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-[#050505] rounded-t-[2rem] shrink-0">
          <h3 className="text-sm font-black text-white">
            {isEdit ? "Edit" : "Create"} {isCert ? "Certificate" : "Video"}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 bg-white/[0.05] border border-white/10 rounded-full flex items-center justify-center text-[#888] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
            </div>
          )}

          <div>
            <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className={fieldCls}
            />
          </div>

          {isCert ? (
            <>
              <div>
                <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                  Provider
                </label>
                <input
                  type="text"
                  value={form.provider}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, provider: e.target.value }))
                  }
                  className={fieldCls}
                  placeholder="e.g. Coursera, Google, AWS"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className={cn(fieldCls, "appearance-none")}
                  >
                    <option value="">Select...</option>
                    {CERTIFICATE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, difficulty: e.target.value }))
                    }
                    className={cn(fieldCls, "appearance-none")}
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: e.target.value }))
                    }
                    className={fieldCls}
                    placeholder="e.g. 8 hours"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Score Reward
                  </label>
                  <input
                    type="number"
                    value={form.scoreReward}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, scoreReward: e.target.value }))
                    }
                    className={fieldCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                  Enrollment Link
                </label>
                <input
                  type="url"
                  value={form.link}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, link: e.target.value }))
                  }
                  className={fieldCls}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))
                  }
                  className={fieldCls}
                  placeholder="https://..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    YouTube ID
                  </label>
                  <input
                    type="text"
                    value={form.youtubeId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, youtubeId: e.target.value }))
                    }
                    className={fieldCls}
                    placeholder="dQw4w9WgXcQ"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className={cn(fieldCls, "appearance-none")}
                  >
                    {VIDEO_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationMinutes: e.target.value,
                      }))
                    }
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                    Score Reward
                  </label>
                  <input
                    type="number"
                    value={form.scoreReward}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, scoreReward: e.target.value }))
                    }
                    className={fieldCls}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={cn(fieldCls, "resize-none")}
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className={fieldCls}
              placeholder="React, JavaScript, Frontend"
            />
          </div>
          <div>
            <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
              Domains (comma-separated)
            </label>
            <input
              type="text"
              value={form.domains}
              onChange={(e) =>
                setForm((f) => ({ ...f, domains: e.target.value }))
              }
              className={fieldCls}
              placeholder="Engineering & Tech, Design & Creative"
            />
          </div>
        </div>

        <div className="p-5 border-t border-[#1a1a1a] bg-[#050505] rounded-b-[2rem] shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 bg-[#BFA264] hover:bg-[#D4AF78] disabled:opacity-40 text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {isSaving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LearnDatabase = () => {
  const { userData, loading: userLoading } = useUserData();
  const { requireOnboarding } = useOnboardingGate();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ── View state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("certs"); // certs | videos
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Data state ──────────────────────────────────────────────────────────
  const [certs, setCerts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [certLastDoc, setCertLastDoc] = useState(null);
  const [videoLastDoc, setVideoLastDoc] = useState(null);
  const [hasMoreCerts, setHasMoreCerts] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaging, setIsPaging] = useState(false);

  // ── UI state ────────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [adminFormOpen, setAdminFormOpen] = useState(false);
  const [adminFormType, setAdminFormType] = useState("cert");
  const [adminEditItem, setAdminEditItem] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // ── Completion map (vault cross-reference) ──────────────────────────────
  const completionMap = useMemo(() => {
    const map = {};
    (userData?.vault || []).forEach((a) => {
      if (a.discotiveLearnId) {
        map[a.discotiveLearnId] = {
          verified: a.status === "VERIFIED",
          pending: a.status === "PENDING",
        };
      }
    });
    return map;
  }, [userData?.vault]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const verifiedIds = new Set(
      (userData?.vault || [])
        .filter((a) => a.status === "VERIFIED" && a.discotiveLearnId)
        .map((a) => a.discotiveLearnId),
    );
    return {
      completedCerts: certs.filter((c) => verifiedIds.has(c.discotiveLearnId))
        .length,
      completedVideos: videos.filter((v) => verifiedIds.has(v.discotiveLearnId))
        .length,
      totalScore: [...certs, ...videos]
        .filter((i) => verifiedIds.has(i.discotiveLearnId))
        .reduce((s, i) => s + (i.scoreReward || 0), 0),
    };
  }, [certs, videos, userData?.vault]);

  // ── Admin check ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    getDoc(doc(db, "admins", currentUser.uid))
      .then((snap) => setIsAdmin(snap.exists()))
      .catch(() => {});
  }, [currentUser?.uid]);

  // ── Initial fetch ────────────────────────────────────────────────────────
  const loadCerts = useCallback(
    async (reset = false) => {
      if (!hasMoreCerts && !reset) return;
      if (reset) setIsLoading(true);
      else setIsPaging(true);
      try {
        const res = await fetchCertificates({
          domain: domain || null,
          category: category || null,
          lastDocument: reset ? null : certLastDoc,
          pageSize: PAGE_SIZE,
        });
        setCerts((prev) => (reset ? res.items : [...prev, ...res.items]));
        setCertLastDoc(res.lastDocument);
        setHasMoreCerts(res.hasMore);
      } catch (e) {
        console.error("[LearnDatabase] certs:", e);
      } finally {
        setIsLoading(false);
        setIsPaging(false);
      }
    },
    [domain, category, certLastDoc, hasMoreCerts],
  );

  const loadVideos = useCallback(
    async (reset = false) => {
      if (!hasMoreVideos && !reset) return;
      if (reset) setIsLoading(true);
      else setIsPaging(true);
      try {
        const res = await fetchVideos({
          domain: domain || null,
          category: category || null,
          lastDocument: reset ? null : videoLastDoc,
          pageSize: PAGE_SIZE,
        });
        setVideos((prev) => (reset ? res.items : [...prev, ...res.items]));
        setVideoLastDoc(res.lastDocument);
        setHasMoreVideos(res.hasMore);
      } catch (e) {
        console.error("[LearnDatabase] videos:", e);
      } finally {
        setIsLoading(false);
        setIsPaging(false);
      }
    },
    [domain, category, videoLastDoc, hasMoreVideos],
  );

  // Reset + refetch on filter change
  useEffect(() => {
    setCerts([]);
    setVideos([]);
    setCertLastDoc(null);
    setVideoLastDoc(null);
    setHasMoreCerts(true);
    setHasMoreVideos(true);
    if (activeTab === "certs") loadCerts(true);
    else loadVideos(true);
    // eslint-disable-next-line
  }, [domain, category, activeTab]);

  // ── Client-side search filter ───────────────────────────────────────────
  const filteredCerts = useMemo(() => {
    if (!searchQ) return certs;
    const q = searchQ.toLowerCase();
    return certs.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.provider?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.discotiveLearnId?.toLowerCase().includes(q),
    );
  }, [certs, searchQ]);

  const filteredVideos = useMemo(() => {
    if (!searchQ) return videos;
    const q = searchQ.toLowerCase();
    return videos.filter(
      (v) =>
        v.title?.toLowerCase().includes(q) ||
        v.category?.toLowerCase().includes(q) ||
        v.discotiveLearnId?.toLowerCase().includes(q),
    );
  }, [videos, searchQ]);

  const handleAdminEdit = (item) => {
    setAdminEditItem(item);
    setAdminFormType(activeTab === "certs" ? "cert" : "video");
    setAdminFormOpen(true);
  };

  const handleAdminCreate = (type) => {
    setAdminEditItem(null);
    setAdminFormType(type);
    setAdminFormOpen(true);
  };

  const handleFormSaved = () => {
    if (activeTab === "certs") loadCerts(true);
    else loadVideos(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-[#BFA264]/20 pb-28 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[#111] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-[#BFA264]" />
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  Discotive Learn
                </h1>
              </div>
              <p className="text-sm text-[#555] font-medium">
                Verified credentials, curated courses, and knowledge assets that
                compound your Discotive Score.
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 shrink-0">
              {[
                {
                  label: "Completed",
                  val: stats.completedCerts + stats.completedVideos,
                  color: "text-emerald-400",
                },
                {
                  label: "Score Earned",
                  val: `+${stats.totalScore}`,
                  color: "text-[#BFA264]",
                },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center">
                  <p className={cn("text-xl font-black font-mono", color)}>
                    {val}
                  </p>
                  <p className="text-[9px] font-bold text-[#444] uppercase tracking-widest">
                    {label}
                  </p>
                </div>
              ))}
              {isAdmin && (
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleAdminCreate("cert")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#BFA264]/10 border border-[#BFA264]/20 text-[#BFA264] text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-[#BFA264]/20 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Cert
                  </button>
                  <button
                    onClick={() => handleAdminCreate("video")}
                    className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-sky-500/20 transition-all"
                  >
                    <Plus className="w-3 h-3" /> Video
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tab bar + controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-5">
            {/* Tabs */}
            <div className="flex bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-1 shrink-0">
              {[
                { id: "certs", label: "Certificates", icon: Award },
                { id: "videos", label: "Video Hub", icon: Video },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === id
                      ? "bg-white text-black shadow-sm"
                      : "text-[#555] hover:text-white",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search by title, provider, Learn ID..."
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-[#BFA264]/40 text-sm transition-colors placeholder:text-[#444]"
              />
              {searchQ && (
                <button
                  onClick={() => setSearchQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                showFilters || domain || category
                  ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264]"
                  : "bg-[#0a0a0a] border-[#1a1a1a] text-[#555] hover:text-white hover:border-[#333]",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
              {(domain || category) && (
                <span className="w-4 h-4 rounded-full bg-[#BFA264] text-black text-[8px] font-black flex items-center justify-center">
                  {(domain ? 1 : 0) + (category ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 flex flex-wrap gap-3">
                  {/* Domain filter */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                      Domain
                    </label>
                    <div className="relative">
                      <select
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#BFA264]/40 appearance-none"
                      >
                        <option value="">All Domains</option>
                        {DOMAINS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
                    </div>
                  </div>

                  {/* Category filter — certs only */}
                  {activeTab === "certs" && (
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                        Category
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#BFA264]/40 appearance-none"
                        >
                          <option value="">All Categories</option>
                          {CERTIFICATE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {/* Video category filter */}
                  {activeTab === "videos" && (
                    <div className="flex-1 min-w-[180px]">
                      <label className="block text-[9px] font-black text-[#444] uppercase tracking-widest mb-1.5">
                        Video Type
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#BFA264]/40 appearance-none"
                        >
                          <option value="">All Types</option>
                          {VIDEO_CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555] pointer-events-none" />
                      </div>
                    </div>
                  )}

                  {(domain || category) && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setDomain("");
                          setCategory("");
                        }}
                        className="px-4 py-2.5 bg-red-500/8 border border-red-500/15 text-red-400 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-500/15 transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10">
        {/* Loading skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[1.25rem] bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden animate-pulse"
              >
                <div className="aspect-video bg-[#111]" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 bg-[#111] rounded-lg w-3/4" />
                  <div className="h-3 bg-[#111] rounded-lg w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* CERTS TAB */}
            {activeTab === "certs" && (
              <>
                {filteredCerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Award className="w-16 h-16 text-[#1a1a1a] mb-4" />
                    <h3 className="text-xl font-black text-white mb-2">
                      No Certificates Yet
                    </h3>
                    <p className="text-sm text-[#555] max-w-sm">
                      {isAdmin
                        ? "Add the first certificate to the database using the + Cert button above."
                        : "Certificates will appear here once they're added to the Discotive database."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <AnimatePresence>
                      {filteredCerts.map((cert) => (
                        <CertCard
                          key={cert.id}
                          cert={cert}
                          completion={completionMap[cert.discotiveLearnId]}
                          onSelect={(c) => {
                            setSelectedItem(c);
                            setSelectedType("cert");
                          }}
                          isAdmin={isAdmin}
                          onEdit={handleAdminEdit}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Load more */}
                {hasMoreCerts && !searchQ && filteredCerts.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => loadCerts(false)}
                      disabled={isPaging}
                      className="flex items-center gap-2 px-8 py-3.5 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[#888] hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                      {isPaging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {isPaging ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* VIDEOS TAB */}
            {activeTab === "videos" && (
              <>
                {filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Video className="w-16 h-16 text-[#1a1a1a] mb-4" />
                    <h3 className="text-xl font-black text-white mb-2">
                      No Videos Yet
                    </h3>
                    <p className="text-sm text-[#555] max-w-sm">
                      {isAdmin
                        ? "Add the first video using the + Video button above."
                        : "Curated videos will appear here once added."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <AnimatePresence>
                      {filteredVideos.map((video) => (
                        <VideoCard
                          key={video.id}
                          video={video}
                          completion={completionMap[video.discotiveLearnId]}
                          onSelect={(v) => {
                            setSelectedItem(v);
                            setSelectedType("video");
                          }}
                          isAdmin={isAdmin}
                          onEdit={handleAdminEdit}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                {/* Load more */}
                {hasMoreVideos && !searchQ && filteredVideos.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => loadVideos(false)}
                      disabled={isPaging}
                      className="flex items-center gap-2 px-8 py-3.5 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[#888] hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                    >
                      {isPaging ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {isPaging ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* ── Detail Sheet ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedItem && (
          <DetailSheet
            item={selectedItem}
            type={selectedType}
            completion={completionMap[selectedItem.discotiveLearnId]}
            onClose={() => setSelectedItem(null)}
            userData={userData}
          />
        )}
      </AnimatePresence>

      {/* ── Admin Form Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {adminFormOpen && (
          <AdminFormModal
            type={adminFormType}
            item={adminEditItem}
            onClose={() => {
              setAdminFormOpen(false);
              setAdminEditItem(null);
            }}
            onSaved={handleFormSaved}
            adminEmail={currentUser?.email}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearnDatabase;
