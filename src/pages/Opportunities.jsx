/**
 * @fileoverview Discotive OS — Opportunities Engine v1.0
 * @description
 * Career monopoly capture page. Zero mock data architecture.
 * Real-time Firestore reads with pagination. Admin CMS inline.
 * Stack-based filtering, probability percentile scoring against vault.
 * Two modes: Curated (admin/company listings) + Projects Mode (user-hosted).
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/cn";
import {
  Search,
  Filter,
  X,
  Briefcase,
  GraduationCap,
  Laptop,
  Users,
  Star,
  Zap,
  Globe,
  MapPin,
  Clock,
  Calendar,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  BookOpen,
  Trophy,
  Code2,
  Palette,
  Mic,
  Video,
  Music,
  FlaskConical,
  Building2,
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  Layers,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Monitor,
  Cpu,
  Heart,
  Award,
  Loader2,
  AlertTriangle,
  Eye,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Shield,
  Crown,
  Flame,
  ArrowRight,
  ChevronLeft,
  Grid3x3,
  List,
  Plus,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────
const OPP_TYPES = [
  { id: "all", label: "All", icon: Layers },
  { id: "job", label: "Jobs", icon: Briefcase },
  { id: "internship", label: "Internships", icon: GraduationCap },
  { id: "freelance", label: "Freelance", icon: Laptop },
  { id: "hackathon", label: "Hackathons", icon: Zap },
  { id: "competition", label: "Competitions", icon: Trophy },
  { id: "fest", label: "College Fests", icon: Star },
  { id: "mentorship", label: "Mentorship", icon: Users },
  { id: "grant", label: "Grants", icon: DollarSign },
  { id: "research", label: "Research", icon: FlaskConical },
];

const WORK_MODES = ["Remote", "In-Person", "Hybrid"];
const PAY_MODES = ["Paid", "Unpaid", "Equity", "Stipend"];
const EXPERIENCE_LEVELS = ["Fresher", "Beginner", "Intermediate", "Expert"];
const DOMAINS = [
  "Engineering & Tech",
  "Design & Creative",
  "Business / Operations",
  "Marketing",
  "Finance & Accounting",
  "Content Creation",
  "Healthcare",
  "Product Management",
  "Data & Analytics",
  "Sales",
  "Legal & Policy",
  "Education",
  "Other",
];

const TYPE_CONFIG = {
  job: {
    color: "#BFA264",
    bg: "rgba(191,162,100,0.1)",
    border: "rgba(191,162,100,0.25)",
    icon: Briefcase,
  },
  internship: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.25)",
    icon: GraduationCap,
  },
  freelance: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.1)",
    border: "rgba(56,189,248,0.25)",
    icon: Laptop,
  },
  hackathon: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.25)",
    icon: Zap,
  },
  competition: {
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
    border: "rgba(139,92,246,0.25)",
    icon: Trophy,
  },
  fest: {
    color: "#ec4899",
    bg: "rgba(236,72,153,0.1)",
    border: "rgba(236,72,153,0.25)",
    icon: Star,
  },
  mentorship: {
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.1)",
    border: "rgba(6,182,212,0.25)",
    icon: Users,
  },
  grant: {
    color: "#4ade80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
    icon: DollarSign,
  },
  research: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.25)",
    icon: FlaskConical,
  },
};

const PAGE_SIZE = 18;

// ─── Helpers ────────────────────────────────────────────────────────────────
const timeLeft = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  if (diff < 0) return "Closed";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d left";
  if (days < 7) return `${days}d left`;
  if (days < 30) return `${Math.floor(days / 7)}w left`;
  return `${Math.floor(days / 30)}mo left`;
};

const calcProbability = (oppTags = [], vaultAssets = [], userSkills = []) => {
  if (!oppTags || oppTags.length === 0) return null;
  const userTagSet = new Set([
    ...userSkills.map((s) => s.toLowerCase()),
    ...vaultAssets
      .filter((a) => a.status === "VERIFIED")
      .flatMap((a) =>
        (a.credentials?.techStack || "")
          .split(",")
          .map((t) => t.trim().toLowerCase()),
      ),
  ]);
  const matched = oppTags.filter((t) => userTagSet.has(t.toLowerCase())).length;
  const pct = Math.round((matched / oppTags.length) * 100);
  if (pct >= 75)
    return { pct, tier: "strong", color: "#4ade80", label: "Strong" };
  if (pct >= 50)
    return { pct, tier: "medium", color: "#f59e0b", label: "Medium" };
  return { pct, tier: "weak", color: "#F87171", label: "Weak" };
};

// ─── SVG Placeholder ────────────────────────────────────────────────────────
const OppPlaceholder = memo(({ type, title }) => {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.job;
  const Icon = cfg.icon;
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, ${cfg.bg} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 30%, ${cfg.color} 0%, transparent 60%), radial-gradient(circle at 70% 80%, ${cfg.color} 0%, transparent 50%)`,
        }}
      />
      {[0.15, 0.1, 0.06].map((op, i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: `${140 + i * 60}px`,
            height: `${140 + i * 60}px`,
            borderColor: cfg.color,
            opacity: op,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <Icon
          style={{ color: cfg.color, width: 32, height: 32, opacity: 0.7 }}
        />
        <span
          className="text-[9px] font-black uppercase tracking-[0.2em]"
          style={{ color: cfg.color, opacity: 0.6 }}
        >
          {type}
        </span>
      </div>
    </div>
  );
});

// ─── Opportunity Card ────────────────────────────────────────────────────────
const OppCard = memo(
  ({ opp, onSelect, userSkills, vaultAssets, isProjectMode }) => {
    const [hovered, setHovered] = useState(false);
    const cfg = TYPE_CONFIG[opp.type] || TYPE_CONFIG.job;
    const Icon = cfg.icon;
    const prob = calcProbability(
      opp.requiredTags || [],
      vaultAssets,
      userSkills,
    );
    const tl = timeLeft(opp.closingDate);
    const isUrgent = tl && (tl === "Today" || tl === "1d left");
    const isClosed = tl === "Closed";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group relative rounded-[1.25rem] overflow-hidden cursor-pointer border transition-all duration-300",
          isClosed ? "opacity-50 pointer-events-none" : "",
          hovered
            ? "border-[rgba(191,162,100,0.4)] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
            : "border-[rgba(255,255,255,0.06)] bg-[#0a0a0a]",
        )}
        style={{ background: "#0a0a0a" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect(opp)}
        role="button"
        tabIndex={0}
        aria-label={`${opp.title} - ${opp.type}`}
        onKeyDown={(e) => e.key === "Enter" && onSelect(opp)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[16/7] overflow-hidden">
          {opp.thumbnailUrl ? (
            <>
              <img
                src={opp.thumbnailUrl}
                alt={opp.title}
                className="w-full h-full object-cover transition-transform duration-700"
                style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
              <div className="hidden w-full h-full absolute inset-0">
                <OppPlaceholder type={opp.type} title={opp.title} />
              </div>
            </>
          ) : (
            <OppPlaceholder type={opp.type} title={opp.title} />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />

          {/* Hover reveal */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white text-[11px] font-black uppercase tracking-widest">
                  <Eye className="w-3.5 h-3.5" /> View Details
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Type badge */}
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
            style={{
              background: cfg.bg,
              borderColor: cfg.border,
              color: cfg.color,
              backdropFilter: "blur(8px)",
            }}
          >
            <Icon className="w-2.5 h-2.5" /> {opp.type}
          </div>

          {/* Closing date badge */}
          {tl && (
            <div
              className={cn(
                "absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black border",
                isUrgent
                  ? "bg-red-500/20 border-red-500/40 text-red-400"
                  : "bg-black/60 border-white/10 text-white/60",
              )}
              style={{ backdropFilter: "blur(8px)" }}
            >
              <Clock className="w-2.5 h-2.5" /> {tl}
            </div>
          )}

          {/* User-hosted badge */}
          {isProjectMode && opp.hostedByUser && (
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black bg-violet-500/20 border border-violet-500/30 text-violet-300">
              <Users className="w-2.5 h-2.5" /> Community
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3.5">
          {/* Provider row */}
          <div className="flex items-center gap-2 mb-2">
            {opp.providerLogoUrl ? (
              <img
                src={opp.providerLogoUrl}
                alt={opp.provider}
                className="w-5 h-5 rounded object-contain bg-white/5 border border-white/10"
              />
            ) : (
              <div className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-black text-white/40">
                {(opp.provider || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-bold text-white/40 truncate">
              {opp.provider || "Anonymous"}
            </span>
            {opp.isVerified && (
              <Shield className="w-3 h-3 text-[#BFA264] shrink-0" />
            )}
          </div>

          <h3 className="text-sm font-black text-white leading-snug line-clamp-2 mb-2 group-hover:text-[#D4AF78] transition-colors">
            {opp.title}
          </h3>

          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {opp.workMode && (
              <span className="flex items-center gap-1 text-[8px] font-bold text-white/30 uppercase tracking-widest">
                <Globe className="w-2.5 h-2.5" /> {opp.workMode}
              </span>
            )}
            {opp.location && (
              <span className="flex items-center gap-1 text-[8px] font-bold text-white/30 uppercase tracking-widest">
                <MapPin className="w-2.5 h-2.5" /> {opp.location}
              </span>
            )}
            {opp.compensation && (
              <span
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest"
                style={{ color: cfg.color }}
              >
                <DollarSign className="w-2.5 h-2.5" /> {opp.compensation}
              </span>
            )}
          </div>

          {/* Probability percentile */}
          {prob !== null && (
            <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.05]">
              <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${prob.pct}%`, background: prob.color }}
                />
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-widest shrink-0"
                style={{ color: prob.color }}
              >
                {prob.pct}% {prob.label}
              </span>
            </div>
          )}

          {/* Stack tags */}
          {opp.requiredTags && opp.requiredTags.length > 0 && (
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {opp.requiredTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[8px] font-bold px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/30"
                >
                  {tag}
                </span>
              ))}
              {opp.requiredTags.length > 3 && (
                <span className="text-[8px] font-bold text-white/20">
                  +{opp.requiredTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);

// ─── Detail Sidebar ──────────────────────────────────────────────────────────
const DetailSidebar = memo(
  ({ opp, onClose, userSkills, vaultAssets, navigate }) => {
    const [copied, setCopied] = useState(false);
    if (!opp) return null;
    const cfg = TYPE_CONFIG[opp.type] || TYPE_CONFIG.job;
    const Icon = cfg.icon;
    const prob = calcProbability(
      opp.requiredTags || [],
      vaultAssets,
      userSkills,
    );
    const tl = timeLeft(opp.closingDate);

    const handleCopy = () => {
      navigator.clipboard.writeText(
        window.location.origin + `/app/opportunities/${opp.type}/${opp.id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[200] flex justify-end pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="relative w-full max-w-md h-full bg-[#080808] border-l border-white/[0.06] flex flex-col shadow-[-30px_0_80px_rgba(0,0,0,0.8)] pointer-events-auto overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/[0.05] bg-[#050505] shrink-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                    style={{
                      background: cfg.bg,
                      borderColor: cfg.border,
                      color: cfg.color,
                    }}
                  >
                    <Icon className="w-2.5 h-2.5" /> {opp.type}
                  </div>
                  {tl && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black bg-white/5 border border-white/10 text-white/50">
                      <Clock className="w-2.5 h-2.5" /> {tl}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopy}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Provider */}
              <div className="flex items-center gap-2.5 mb-3">
                {opp.providerLogoUrl ? (
                  <img
                    src={opp.providerLogoUrl}
                    alt={opp.provider}
                    className="w-8 h-8 rounded-lg object-contain bg-white/5 border border-white/10 p-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white/40">
                    {(opp.provider || "?").charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white/60">
                    {opp.provider}
                  </p>
                  {opp.isVerified && (
                    <div className="flex items-center gap-1 text-[8px] font-black text-[#BFA264] uppercase tracking-widest">
                      <Shield className="w-2.5 h-2.5" /> Verified
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-black text-white leading-tight mb-2">
                {opp.title}
              </h2>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
              {/* Thumbnail */}
              {opp.thumbnailUrl && (
                <div className="aspect-video rounded-2xl overflow-hidden border border-white/[0.05]">
                  <img
                    src={opp.thumbnailUrl}
                    alt={opp.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Probability */}
              {prob !== null && (
                <div
                  className="p-4 rounded-2xl border"
                  style={{
                    background: `${prob.color}0a`,
                    borderColor: `${prob.color}30`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                      Probability Percentile
                    </span>
                    <span
                      className="text-lg font-black font-mono"
                      style={{ color: prob.color }}
                    >
                      {prob.pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prob.pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: prob.color }}
                    />
                  </div>
                  <p className="text-[10px] text-white/30">
                    {prob.tier === "strong"
                      ? "Your profile strongly matches this opportunity."
                      : prob.tier === "medium"
                        ? "Partial match. Strengthen your stack to improve odds."
                        : "Low match. Verify more aligned assets to boost your percentile."}
                  </p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Globe, label: "Mode", val: opp.workMode },
                  {
                    icon: MapPin,
                    label: "Location",
                    val: opp.location || "Not specified",
                  },
                  {
                    icon: DollarSign,
                    label: "Compensation",
                    val: opp.compensation || "Not specified",
                  },
                  {
                    icon: Calendar,
                    label: "Closing",
                    val: opp.closingDate
                      ? new Date(opp.closingDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Open",
                  },
                  {
                    icon: Target,
                    label: "Experience",
                    val: opp.experienceLevel || "Any",
                  },
                  {
                    icon: Building2,
                    label: "Domain",
                    val: opp.domain || "General",
                  },
                ]
                  .filter((m) => m.val)
                  .map(({ icon: MIcon, label, val }) => (
                    <div
                      key={label}
                      className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <MIcon className="w-3 h-3 text-white/20" />
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                          {label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white/70 truncate">
                        {val}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Description */}
              {opp.description && (
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">
                    About This Opportunity
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {opp.description}
                  </p>
                </div>
              )}

              {/* Required Stack */}
              {opp.requiredTags && opp.requiredTags.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">
                    Required Stack
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {opp.requiredTags.map((tag) => {
                      const userTagSet = new Set([
                        ...userSkills.map((s) => s.toLowerCase()),
                      ]);
                      const hasTag = userTagSet.has(tag.toLowerCase());
                      return (
                        <span
                          key={tag}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                            hasTag
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                              : "bg-white/[0.03] border-white/[0.06] text-white/40",
                          )}
                        >
                          {hasTag && (
                            <Check className="w-2.5 h-2.5 inline mr-1" />
                          )}
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Perks */}
              {opp.perks && opp.perks.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">
                    Perks & Benefits
                  </p>
                  <div className="space-y-1.5">
                    {opp.perks.map((perk) => (
                      <div
                        key={perk}
                        className="flex items-center gap-2.5 text-xs text-white/50"
                      >
                        <Zap className="w-3 h-3 text-[#BFA264] shrink-0" />
                        {perk}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="p-4 bg-[#050505] border-t border-white/[0.05] shrink-0 flex gap-2.5">
              <button
                onClick={() =>
                  navigate(`/app/opportunities/${opp.type}/${opp.id}`)
                }
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#BFA264] hover:bg-[#D4AF78] text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(191,162,100,0.2)]"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Full Page
              </button>
              {opp.applyUrl && (
                <a
                  href={opp.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3.5 bg-white/5 border border-white/10 hover:border-white/20 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                >
                  Apply <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

// ─── Filter Bar ──────────────────────────────────────────────────────────────
const FilterBar = memo(({ filters, setFilters, onClear, allTags }) => {
  const [tagSearch, setTagSearch] = useState("");
  const filteredTags = useMemo(
    () =>
      allTags
        .filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()))
        .slice(0, 30),
    [allTags, tagSearch],
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-[#080808] border border-white/[0.05] rounded-2xl p-5 space-y-5 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Work Mode */}
          <div>
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">
              Work Mode
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WORK_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      workMode: f.workMode === m ? "" : m,
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    filters.workMode === m
                      ? "bg-[#BFA264]/15 border-[#BFA264]/30 text-[#BFA264]"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Pay Mode */}
          <div>
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">
              Compensation
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAY_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      payMode: f.payMode === m ? "" : m,
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    filters.payMode === m
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">
              Experience Level
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EXPERIENCE_LEVELS.map((m) => (
                <button
                  key={m}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      experienceLevel: f.experienceLevel === m ? "" : m,
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    filters.experienceLevel === m
                      ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                      : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Domain */}
          <div>
            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2">
              Domain
            </label>
            <div className="relative">
              <select
                value={filters.domain}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, domain: e.target.value }))
                }
                className="w-full bg-[#0f0f0f] border border-white/[0.06] text-white/60 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#BFA264]/40 appearance-none"
              >
                <option value="">All Domains</option>
                {DOMAINS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stack-based search */}
        <div>
          <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2 flex items-center gap-2">
            <Cpu className="w-3 h-3" /> Stack-Based Filter
          </label>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Search tech, tools, apps..."
              className="w-full bg-[#0f0f0f] border border-white/[0.06] text-white pl-9 pr-3 py-2.5 text-xs rounded-xl focus:outline-none focus:border-[#BFA264]/40 placeholder-white/20"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
            {filteredTags.map((tag) => {
              const active = filters.requiredTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      requiredTags: active
                        ? f.requiredTags.filter((t) => t !== tag)
                        : [...f.requiredTags, tag],
                    }))
                  }
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all",
                    active
                      ? "bg-violet-500/15 border-violet-500/30 text-violet-400"
                      : "bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/60",
                  )}
                >
                  {active && <Check className="w-2.5 h-2.5 inline mr-1" />}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear */}
        <div className="flex justify-end pt-2 border-t border-white/[0.04]">
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 text-[9px] font-black text-white/25 hover:text-red-400 uppercase tracking-widest transition-colors"
          >
            <X className="w-3 h-3" /> Clear All Filters
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Skeleton Card ───────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-[1.25rem] overflow-hidden bg-[#0a0a0a] border border-white/[0.04] animate-pulse">
    <div className="aspect-[16/7] bg-white/[0.04]" />
    <div className="p-3.5 space-y-2.5">
      <div className="h-3 bg-white/[0.04] rounded w-1/3" />
      <div className="h-4 bg-white/[0.04] rounded w-4/5" />
      <div className="h-3 bg-white/[0.04] rounded w-3/5" />
      <div className="h-1 bg-white/[0.04] rounded w-full mt-3" />
    </div>
  </div>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState = ({ isProjectMode, activeType }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="col-span-full flex flex-col items-center justify-center py-24 text-center"
  >
    <div className="w-20 h-20 rounded-[2rem] bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.15)] flex items-center justify-center mb-6">
      <Layers className="w-9 h-9 text-[rgba(191,162,100,0.4)]" />
    </div>
    <h3 className="text-xl font-black text-white mb-2">
      No Opportunities Found
    </h3>
    <p className="text-sm text-white/30 max-w-[280px] leading-relaxed mb-6">
      {isProjectMode
        ? "No community-hosted opportunities yet. Be the first to post one."
        : `No ${activeType === "all" ? "" : activeType} opportunities match your filters.`}
    </p>
    {isProjectMode && (
      <button className="flex items-center gap-2 px-6 py-3 bg-[#BFA264] text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF78] transition-all">
        <Plus className="w-3.5 h-3.5" /> Post Opportunity
      </button>
    )}
  </motion.div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
const Opportunities = () => {
  const { userData } = useUserData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // View state
  const [activeType, setActiveType] = useState(
    searchParams.get("type") || "all",
  );
  const [isProjectMode, setIsProjectMode] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [filters, setFilters] = useState({
    workMode: "",
    payMode: "",
    experienceLevel: "",
    domain: "",
    requiredTags: [],
  });

  // Data state
  const [opps, setOpps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [featuredOpps, setFeaturedOpps] = useState([]);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  const userSkills = userData?.skills?.alignedSkills || [];
  const vaultAssets = userData?.vault || [];

  // Active filter count
  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((v) =>
        Array.isArray(v) ? v.length > 0 : !!v,
      ).length,
    [filters],
  );

  // Client-side search filter
  const filteredOpps = useMemo(() => {
    if (!searchQ) return opps;
    const q = searchQ.toLowerCase();
    return opps.filter(
      (o) =>
        o.title?.toLowerCase().includes(q) ||
        o.provider?.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        (o.requiredTags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [opps, searchQ]);

  // Build Firestore query constraints
  const buildConstraints = useCallback(
    (lastDocument = null) => {
      const constraints = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
      if (activeType !== "all")
        constraints.push(where("type", "==", activeType));
      if (isProjectMode) constraints.push(where("hostedByUser", "==", true));
      else constraints.push(where("hostedByUser", "==", false));
      if (filters.workMode)
        constraints.push(where("workMode", "==", filters.workMode));
      if (filters.payMode)
        constraints.push(where("payMode", "==", filters.payMode));
      if (filters.experienceLevel)
        constraints.push(
          where("experienceLevel", "==", filters.experienceLevel),
        );
      if (filters.domain)
        constraints.push(where("domain", "==", filters.domain));
      if (filters.requiredTags.length > 0)
        constraints.push(
          where(
            "requiredTags",
            "array-contains-any",
            filters.requiredTags.slice(0, 10),
          ),
        );
      if (lastDocument) constraints.push(startAfter(lastDocument));
      return constraints;
    },
    [activeType, isProjectMode, filters],
  );

  const loadOpps = useCallback(
    async (reset = false) => {
      if (reset) setIsLoading(true);
      else setIsPaging(true);
      try {
        const constraints = buildConstraints(reset ? null : lastDoc);
        const snap = await getDocs(
          query(collection(db, "opportunities"), ...constraints),
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOpps((prev) => (reset ? items : [...prev, ...items]));
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(items.length === PAGE_SIZE);
      } catch (err) {
        console.error("[Opportunities] load:", err);
        setOpps([]);
      } finally {
        setIsLoading(false);
        setIsPaging(false);
      }
    },
    [buildConstraints, lastDoc],
  );

  // Fetch featured (pinned) opportunities
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "opportunities"),
            where("featured", "==", true),
            where("hostedByUser", "==", false),
            limit(5),
          ),
        );
        setFeaturedOpps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        setFeaturedOpps([]);
      }
    };
    fetchFeatured();
  }, []);

  // Fetch all tags for stack filter
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "opportunities"), limit(100)),
        );
        const tagSet = new Set();
        snap.docs.forEach((d) =>
          (d.data().requiredTags || []).forEach((t) => tagSet.add(t)),
        );
        setAllTags([...tagSet].sort());
      } catch {
        setAllTags([]);
      }
    };
    fetchTags();
  }, []);

  // Reset + refetch on filter/type change
  useEffect(() => {
    setOpps([]);
    setLastDoc(null);
    setHasMore(true);
    loadOpps(true);
    setSearchParams({ type: activeType });
    // eslint-disable-next-line
  }, [activeType, isProjectMode, filters]);

  // Featured carousel auto-advance
  useEffect(() => {
    if (featuredOpps.length === 0) return;
    const t = setInterval(
      () => setFeaturedIdx((i) => (i + 1) % featuredOpps.length),
      6000,
    );
    return () => clearInterval(t);
  }, [featuredOpps.length]);

  const clearFilters = () =>
    setFilters({
      workMode: "",
      payMode: "",
      experienceLevel: "",
      domain: "",
      requiredTags: [],
    });

  const activeFeatured = featuredOpps[featuredIdx];
  const activeFeaturedCfg = activeFeatured
    ? TYPE_CONFIG[activeFeatured.type] || TYPE_CONFIG.job
    : null;

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-[#BFA264]/20 pb-28 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

      {/* ── FEATURED HERO BANNER ──────────────────────────────────── */}
      {!isLoading && featuredOpps.length > 0 && activeFeatured && (
        <div className="relative overflow-hidden" style={{ minHeight: "46vh" }}>
          {/* BG Image */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeatured.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0"
            >
              {activeFeatured.thumbnailUrl ? (
                <img
                  src={activeFeatured.thumbnailUrl}
                  alt={activeFeatured.title}
                  className="w-full h-full object-cover opacity-30"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `radial-gradient(ellipse at 30% 50%, ${activeFeaturedCfg?.color}20 0%, transparent 60%)`,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-[#030303]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Content */}
          <div
            className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 py-12 md:py-16 flex flex-col justify-end"
            style={{ minHeight: "46vh" }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeatured.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {activeFeaturedCfg && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
                      style={{
                        background: activeFeaturedCfg.bg,
                        borderColor: activeFeaturedCfg.border,
                        color: activeFeaturedCfg.color,
                      }}
                    >
                      <activeFeaturedCfg.icon className="w-2.5 h-2.5" />{" "}
                      {activeFeatured.type}
                    </div>
                  )}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#BFA264]/10 border border-[#BFA264]/20 text-[9px] font-black text-[#BFA264] uppercase tracking-widest">
                    <Sparkles className="w-2.5 h-2.5" /> Featured
                  </div>
                  {timeLeft(activeFeatured.closingDate) && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 border border-white/10 text-[9px] text-white/50">
                      <Clock className="w-2.5 h-2.5" />{" "}
                      {timeLeft(activeFeatured.closingDate)}
                    </div>
                  )}
                </div>
                <h1
                  className="font-display font-black text-3xl md:text-5xl leading-tight tracking-tight mb-3"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {activeFeatured.title}
                </h1>
                <p className="text-sm md:text-base text-white/60 leading-relaxed mb-6 max-w-lg">
                  {activeFeatured.description?.slice(0, 160)}
                  {activeFeatured.description?.length > 160 ? "..." : ""}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => setSelectedOpp(activeFeatured)}
                    className="flex items-center gap-2 px-6 py-3 font-black text-[11px] uppercase tracking-widest rounded-full text-black transition-all"
                    style={{
                      background: `linear-gradient(135deg, #8B7240, #D4AF78)`,
                      boxShadow: "0 0 24px rgba(191,162,100,0.2)",
                    }}
                  >
                    View Details <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-1.5">
                    {featuredOpps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setFeaturedIdx(i)}
                        className={cn(
                          "rounded-full transition-all duration-300",
                          i === featuredIdx
                            ? "w-5 h-2 bg-white"
                            : "w-2 h-2 bg-white/20",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 relative z-10">
        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-1">
              Career Monopoly Engine
            </p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Opportunities.
            </h2>
          </div>

          {/* Projects Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-white/[0.06] rounded-xl">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                Projects Mode
              </span>
              <button
                onClick={() => setIsProjectMode((v) => !v)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  isProjectMode ? "bg-[#BFA264]" : "bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow",
                    isProjectMode ? "translate-x-4" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS ROW */}
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          {/* Type tabs — horizontal scroll on mobile */}
          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex gap-2 pb-1 min-w-max">
              {OPP_TYPES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveType(id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border whitespace-nowrap transition-all shrink-0",
                    activeType === id
                      ? "bg-white text-black border-transparent shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      : "bg-[#0a0a0a] border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.15]",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search + filter controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search opportunities..."
                className="w-full lg:w-64 bg-[#0a0a0a] border border-white/[0.06] text-white pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[#BFA264]/40 placeholder-white/20 transition-colors"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                showFilters || activeFilterCount > 0
                  ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264]"
                  : "bg-[#0a0a0a] border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.15]",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#BFA264] text-black text-[8px] font-black flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="hidden sm:flex bg-[#0a0a0a] border border-white/[0.06] p-1 rounded-xl gap-0.5">
              {[
                { id: "grid", Icon: Grid3x3 },
                { id: "list", Icon: List },
              ].map(({ id, Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === id
                      ? "bg-white/10 text-white"
                      : "text-white/25 hover:text-white",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              onClear={clearFilters}
              allTags={allTags}
            />
          )}
        </AnimatePresence>

        {/* Active filters display */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-2 mt-2 mb-4 flex-wrap">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
              Active:
            </span>
            {filters.workMode && (
              <span className="px-2.5 py-1 rounded-lg bg-[#BFA264]/10 border border-[#BFA264]/20 text-[9px] font-bold text-[#BFA264] flex items-center gap-1">
                {filters.workMode}{" "}
                <button
                  onClick={() => setFilters((f) => ({ ...f, workMode: "" }))}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {filters.payMode && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                {filters.payMode}{" "}
                <button
                  onClick={() => setFilters((f) => ({ ...f, payMode: "" }))}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {filters.requiredTags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-400 flex items-center gap-1"
              >
                {tag}{" "}
                <button
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      requiredTags: f.requiredTags.filter((t) => t !== tag),
                    }))
                  }
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-[9px] font-black text-white/20 hover:text-red-400 uppercase tracking-widest transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Project Mode Banner */}
        {isProjectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-5 p-4 bg-violet-500/8 border border-violet-500/20 rounded-2xl flex items-center justify-between gap-4 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-black text-violet-400">
                  Projects Mode Active
                </p>
                <p className="text-[10px] text-white/30">
                  Showing community-hosted opportunities. Anyone can post here.
                </p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-violet-500/15 border border-violet-500/25 text-violet-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-violet-500/25 transition-all shrink-0">
              <Plus className="w-3 h-3" /> Post Project
            </button>
          </motion.div>
        )}

        {/* Results count */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-white/20">
              {filteredOpps.length}{" "}
              {filteredOpps.length === 1 ? "opportunity" : "opportunities"}{" "}
              {searchQ ? `for "${searchQ}"` : ""}
            </p>
            {!isLoading && (
              <button
                onClick={() => loadOpps(true)}
                className="flex items-center gap-1.5 text-[9px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            )}
          </div>
        )}

        {/* GRID */}
        {isLoading ? (
          <div
            className={cn(
              "grid gap-4",
              viewMode === "grid"
                ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "grid-cols-1 lg:grid-cols-2",
            )}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              viewMode === "grid"
                ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "grid-cols-1 lg:grid-cols-2",
            )}
          >
            <AnimatePresence>
              {filteredOpps.length === 0 ? (
                <EmptyState
                  isProjectMode={isProjectMode}
                  activeType={activeType}
                />
              ) : (
                filteredOpps.map((opp) => (
                  <OppCard
                    key={opp.id}
                    opp={opp}
                    onSelect={setSelectedOpp}
                    userSkills={userSkills}
                    vaultAssets={vaultAssets}
                    isProjectMode={isProjectMode}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Load More */}
        {hasMore && !isLoading && filteredOpps.length > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => loadOpps(false)}
              disabled={isPaging}
              className="flex items-center gap-2 px-8 py-3.5 bg-[#0a0a0a] border border-white/[0.06] hover:border-white/20 text-white/50 hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
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
      </div>

      {/* Detail Sidebar */}
      {selectedOpp && (
        <DetailSidebar
          opp={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          userSkills={userSkills}
          vaultAssets={vaultAssets}
          navigate={navigate}
        />
      )}
    </div>
  );
};

export default Opportunities;
