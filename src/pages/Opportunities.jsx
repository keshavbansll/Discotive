/**
 * @fileoverview Discotive OS — Opportunities Engine v1.0
 * src/pages/Opportunities.jsx
 *
 * Career monopoly page. Jobs, internships, freelance, college fests,
 * mentorships, hackathons, and more. Admin-managed + user projects mode.
 * Zero mock data. Firebase-backed. MAANG-grade. Mobile-native.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  Search,
  SlidersHorizontal,
  Zap,
  Briefcase,
  GraduationCap,
  Code2,
  Trophy,
  Users,
  Globe,
  MapPin,
  Clock,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Star,
  Flame,
  Layers,
  Monitor,
  Cpu,
  Award,
  DollarSign,
  Calendar,
  ArrowUpRight,
  Target,
  RefreshCw,
  AlertTriangle,
  Check,
  BookOpen,
  Rocket,
  Music,
  Activity,
  Plus,
  Eye,
  Hash,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const PAGE_SIZE = 18;

// ─── Opportunity Type Config ──────────────────────────────────────────────────
export const OPP_TYPES = [
  { key: "all", label: "All", icon: Layers, color: "#BFA264" },
  { key: "job", label: "Jobs", icon: Briefcase, color: "#10b981" },
  {
    key: "internship",
    label: "Internships",
    icon: GraduationCap,
    color: "#38bdf8",
  },
  { key: "freelance", label: "Freelance", icon: Code2, color: "#8b5cf6" },
  { key: "hackathon", label: "Hackathons", icon: Trophy, color: "#f59e0b" },
  { key: "fellowship", label: "Fellowships", icon: Award, color: "#ec4899" },
  { key: "mentorship", label: "Mentorships", icon: Users, color: "#06b6d4" },
  {
    key: "college_fest",
    label: "College Fests",
    icon: Music,
    color: "#f97316",
  },
  { key: "competition", label: "Competitions", icon: Target, color: "#ef4444" },
  { key: "grant", label: "Grants", icon: DollarSign, color: "#84cc16" },
  { key: "workshop", label: "Workshops", icon: BookOpen, color: "#a78bfa" },
  { key: "open_source", label: "Open Source", icon: Globe, color: "#34d399" },
];

const WORK_MODES = ["Remote", "In-Person", "Hybrid"];
const PAY_TYPES = ["Paid", "Unpaid", "Equity", "Stipend"];
const EXP_LEVELS = [
  "No Experience",
  "Beginner",
  "Intermediate",
  "Senior",
  "Lead",
];

// ─── Probability Percentile Calculator ────────────────────────────────────────
const calcProbability = (userVault = [], userSkills = [], oppTags = []) => {
  if (!oppTags || oppTags.length === 0) return { pct: 100, tier: "strong" };
  const userTagSet = new Set([
    ...(userSkills || []).map((s) => s.toLowerCase().trim()),
    ...(userVault || [])
      .filter((a) => a.status === "VERIFIED")
      .flatMap((a) => (a.tags || []).map((t) => t.toLowerCase().trim())),
  ]);
  const matchCount = oppTags.filter((t) =>
    userTagSet.has(t.toLowerCase().trim()),
  ).length;
  const pct = Math.round((matchCount / oppTags.length) * 100);
  const tier = pct >= 75 ? "strong" : pct >= 50 ? "medium" : "weak";
  return { pct, tier };
};

const TIER_STYLE = {
  strong: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  medium: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  weak: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
};

// ─── Probability Badge ────────────────────────────────────────────────────────
const ProbabilityBadge = memo(({ pct, tier, compact = false }) => {
  const c = TIER_STYLE[tier] || TIER_STYLE.weak;
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest",
          c.text,
          c.bg,
          c.border,
        )}
      >
        {pct}%
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest",
        c.text,
        c.bg,
        c.border,
      )}
    >
      <Activity className="w-2.5 h-2.5" />
      Probability {pct}%
    </div>
  );
});

// ─── SVG Placeholder ──────────────────────────────────────────────────────────
const OppPlaceholder = memo(({ type, color = "#BFA264" }) => {
  const iconMap = {
    job: Briefcase,
    internship: GraduationCap,
    freelance: Code2,
    hackathon: Trophy,
    fellowship: Award,
    mentorship: Users,
    college_fest: Music,
    competition: Target,
    grant: DollarSign,
    workshop: BookOpen,
    open_source: Globe,
  };
  const Icon = iconMap[type] || Layers;
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(3,3,3,0.97), rgba(18,18,18,1))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${color}15 0%, transparent 70%)`,
        }}
      />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 80 + i * 40,
            height: 80 + i * 40,
            borderColor: `${color}${["25", "15", "08"][i]}`,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
      <Icon className="w-8 h-8 relative z-10" style={{ color: `${color}50` }} />
    </div>
  );
});

// ─── Opportunity Card ─────────────────────────────────────────────────────────
const OppCard = memo(({ opp, userData, onSelect, index }) => {
  const typeConfig = OPP_TYPES.find((t) => t.key === opp.type) || OPP_TYPES[0];
  const Icon = typeConfig.icon;
  const color = typeConfig.color;

  const userSkills = userData?.skills?.alignedSkills || [];
  const userVault = userData?.vault || [];
  const { pct, tier } = calcProbability(userVault, userSkills, opp.tags || []);

  const daysLeft = opp.closingDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(opp.closingDate) - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;
  const isClosingSoon = daysLeft !== null && daysLeft <= 3;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.04, 0.4),
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onSelect(opp)}
      className="group relative cursor-pointer rounded-[1.5rem] border border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all duration-300 overflow-hidden flex flex-col"
      style={{ minHeight: 270 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      aria-label={`View ${opp.title} opportunity`}
      onKeyDown={(e) => e.key === "Enter" && onSelect(opp)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[16/7] overflow-hidden shrink-0">
        {opp.thumbnailUrl ? (
          <img
            src={opp.thumbnailUrl}
            alt={opp.title}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
            loading="lazy"
          />
        ) : (
          <OppPlaceholder type={opp.type} color={color} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />

        {/* Type badge */}
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-lg border backdrop-blur-sm text-[8px] font-black uppercase tracking-widest"
          style={{ color, background: `${color}18`, borderColor: `${color}30` }}
        >
          <Icon className="w-2.5 h-2.5" />
          {typeConfig.label}
        </div>

        {/* Closing soon */}
        {isClosingSoon && daysLeft !== null && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm text-[7px] font-black text-red-400 uppercase tracking-widest">
            <Flame className="w-2 h-2" />
            {daysLeft === 0 ? "Today" : `${daysLeft}d`}
          </div>
        )}

        {/* Probability compact */}
        <div className="absolute bottom-2 right-2">
          <ProbabilityBadge pct={pct} tier={tier} compact />
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          {opp.providerLogo ? (
            <img
              src={opp.providerLogo}
              alt={opp.provider}
              className="w-5 h-5 rounded object-contain bg-[#111] border border-[#222] shrink-0"
            />
          ) : (
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-[7px] font-black border"
              style={{
                background: `${color}15`,
                borderColor: `${color}25`,
                color,
              }}
            >
              {(opp.provider || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <p className="text-[9px] text-white/35 font-medium truncate">
            {opp.provider || "Unknown"}
          </p>
        </div>

        <h3 className="text-xs font-black text-white leading-snug line-clamp-2">
          {opp.title}
        </h3>

        {/* Meta */}
        <div className="flex flex-wrap gap-1 mt-auto">
          {opp.workMode && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded text-[7px] font-bold text-white/30 uppercase tracking-widest">
              <Globe className="w-2 h-2" /> {opp.workMode}
            </span>
          )}
          {opp.payType && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded text-[7px] font-bold text-white/30 uppercase tracking-widest">
              <DollarSign className="w-2 h-2" /> {opp.payType}
            </span>
          )}
        </div>

        {/* Tags */}
        {opp.tags && opp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {opp.tags.slice(0, 3).map((tag) => {
              const has = (userData?.skills?.alignedSkills || []).some(
                (s) => s.toLowerCase() === tag.toLowerCase(),
              );
              return (
                <span
                  key={tag}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[7px] font-bold border",
                    has
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-white/[0.02] border-white/[0.04] text-white/20",
                  )}
                >
                  {tag}
                </span>
              );
            })}
            {opp.tags.length > 3 && (
              <span className="text-[7px] text-white/15 self-center">
                +{opp.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] mt-1">
          <div className="text-[8px] text-white/20 font-mono flex items-center gap-1">
            {daysLeft !== null && !isClosingSoon && (
              <>
                <Clock className="w-2.5 h-2.5" /> {daysLeft}d left
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hover overlay arrow */}
      <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <ChevronRight className="w-3 h-3 text-white" />
      </div>
    </motion.div>
  );
});

// ─── Detail Sidebar ───────────────────────────────────────────────────────────
const DetailSidebar = memo(({ opp, userData, onClose, navigate }) => {
  const typeConfig = OPP_TYPES.find((t) => t.key === opp.type) || OPP_TYPES[0];
  const Icon = typeConfig.icon;
  const color = typeConfig.color;

  const userSkills = userData?.skills?.alignedSkills || [];
  const userVault = userData?.vault || [];
  const { pct, tier } = calcProbability(userVault, userSkills, opp.tags || []);
  const daysLeft = opp.closingDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(opp.closingDate) - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 260 }}
      className="fixed right-0 top-0 bottom-0 w-full md:w-[440px] bg-[#050505] border-l border-[#1a1a1a] z-[201] flex flex-col shadow-[-20px_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
      role="dialog"
      aria-label="Opportunity details"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] bg-[#080808] shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{ background: `${color}15`, borderColor: `${color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <p
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color }}
            >
              {typeConfig.label}
            </p>
            <p className="text-[9px] text-white/30">{opp.provider}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white transition-colors"
          aria-label="Close details"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden shrink-0">
          {opp.thumbnailUrl ? (
            <img
              src={opp.thumbnailUrl}
              alt={opp.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <OppPlaceholder type={opp.type} color={color} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>

        <div className="px-5 py-5 space-y-5">
          <div>
            <h2 className="text-xl font-black text-white leading-tight mb-2.5">
              {opp.title}
            </h2>
            <ProbabilityBadge pct={pct} tier={tier} />
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Globe, label: "Mode", value: opp.workMode || "—" },
              { icon: DollarSign, label: "Pay", value: opp.payType || "—" },
              {
                icon: MapPin,
                label: "Location",
                value: opp.location || "Global",
              },
              {
                icon: Clock,
                label: "Closing",
                value: daysLeft !== null ? `${daysLeft} days` : "Open",
              },
            ].map(({ icon: Ic, label, value }) => (
              <div
                key={label}
                className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Ic className="w-3 h-3 text-[#555]" />
                  <span className="text-[8px] font-black text-[#555] uppercase tracking-widest">
                    {label}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">{value}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {opp.description && (
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
                About
              </p>
              <p className="text-sm text-white/55 leading-relaxed">
                {opp.description}
              </p>
            </div>
          )}

          {/* Required Stack */}
          {opp.tags && opp.tags.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
                Required Stack
              </p>
              <div className="flex flex-wrap gap-2">
                {opp.tags.map((tag) => {
                  const has = userSkills.some(
                    (s) => s.toLowerCase() === tag.toLowerCase(),
                  );
                  return (
                    <div
                      key={tag}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[10px] font-bold",
                        has
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : "bg-red-500/8 border-red-500/20 text-red-400",
                      )}
                    >
                      {has ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <X className="w-2.5 h-2.5" />
                      )}
                      {tag}
                    </div>
                  );
                })}
              </div>
              <p
                className={cn(
                  "text-[9px] mt-2 font-bold",
                  tier === "strong"
                    ? "text-emerald-400"
                    : tier === "medium"
                      ? "text-amber-400"
                      : "text-red-400",
                )}
              >
                {pct}% Probability Percentile —
                {tier === "strong"
                  ? "Strong fit"
                  : tier === "medium"
                    ? "Medium fit"
                    : "Boost vault to improve match"}
              </p>
            </div>
          )}

          {/* Domains */}
          {opp.domains && opp.domains.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
                Domains
              </p>
              <div className="flex flex-wrap gap-1.5">
                {opp.domains.map((d) => (
                  <span
                    key={d}
                    className="px-2 py-0.5 bg-[#BFA264]/8 border border-[#BFA264]/20 rounded-lg text-[9px] font-bold text-[#BFA264]/70"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer CTAs */}
      <div className="p-4 border-t border-[#1a1a1a] bg-[#080808] shrink-0 space-y-2">
        {opp.applyUrl && (
          <a
            href={opp.applyUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#BFA264] hover:bg-[#D4AF78] text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(191,162,100,0.2)]"
            aria-label={`Apply to ${opp.title}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Apply Now
          </a>
        )}
        <button
          onClick={() => navigate(`/app/opportunities/${opp.type}/${opp.id}`)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-colors"
          aria-label="View full opportunity page"
        >
          View Full Page <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});

// ─── Filter Bar ────────────────────────────────────────────────────────────────
const FilterBar = memo(({ filters, setFilters, onClear, userSkills }) => {
  const [showStack, setShowStack] = useState(false);
  const [stackInput, setStackInput] = useState("");
  const activeCount =
    [filters.workMode, filters.payType, filters.experience].filter(Boolean)
      .length + (filters.stackTags?.length || 0);

  return (
    <div className="relative flex flex-wrap gap-2 items-center pt-3">
      {[
        { key: "workMode", label: "All Modes", options: WORK_MODES },
        { key: "payType", label: "All Pay", options: PAY_TYPES },
        { key: "experience", label: "Any Level", options: EXP_LEVELS },
      ].map(({ key, label, options }) => (
        <div className="relative" key={key}>
          <select
            value={filters[key] || ""}
            onChange={(e) =>
              setFilters((p) => ({ ...p, [key]: e.target.value }))
            }
            className="bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-2 pr-8 rounded-xl appearance-none outline-none focus:border-[#BFA264]/40 transition-colors cursor-pointer"
            aria-label={`Filter by ${key}`}
          >
            <option value="">{label}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555] pointer-events-none" />
        </div>
      ))}

      {/* Stack filter */}
      <button
        onClick={() => setShowStack((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
          showStack || filters.stackTags?.length
            ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264]"
            : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333] text-white/40",
        )}
        aria-label="Filter by tech stack"
      >
        <Cpu className="w-3 h-3" />
        Stack
        {!!filters.stackTags?.length && (
          <span className="w-4 h-4 bg-[#BFA264] text-black text-[8px] font-black rounded-full flex items-center justify-center">
            {filters.stackTags.length}
          </span>
        )}
      </button>

      {activeCount > 0 && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 px-3 py-2 bg-red-500/8 border border-red-500/15 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/15 transition-all"
          aria-label="Clear all filters"
        >
          <X className="w-3 h-3" /> Clear {activeCount}
        </button>
      )}

      {/* Stack dropdown */}
      <AnimatePresence>
        {showStack && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 mt-2 w-72 bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl shadow-2xl z-50 p-4"
          >
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
              App / Tech Stack Filter
            </p>
            <input
              type="text"
              value={stackInput}
              onChange={(e) => setStackInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && stackInput.trim()) {
                  setFilters((p) => ({
                    ...p,
                    stackTags: [...(p.stackTags || []), stackInput.trim()],
                  }));
                  setStackInput("");
                }
              }}
              placeholder="Type & press Enter..."
              className="w-full bg-[#050505] border border-[#222] text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-[#BFA264]/40 transition-colors placeholder:text-white/20"
              aria-label="Add stack tag filter"
            />
            {userSkills.length > 0 && (
              <div className="mt-3">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5">
                  Your Skills (quick add)
                </p>
                <div className="flex flex-wrap gap-1">
                  {userSkills.slice(0, 10).map((s) => {
                    const active = (filters.stackTags || []).includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            stackTags: active
                              ? (p.stackTags || []).filter((t) => t !== s)
                              : [...(p.stackTags || []), s],
                          }))
                        }
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all",
                          active
                            ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264]"
                            : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/70",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {filters.stackTags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {filters.stackTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#BFA264]/10 border border-[#BFA264]/25 rounded-lg text-[9px] font-bold text-[#BFA264]"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          stackTags: p.stackTags.filter((t) => t !== tag),
                        }))
                      }
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = memo(({ type, count, onViewAll }) => {
  const config = OPP_TYPES.find((t) => t.key === type) || OPP_TYPES[0];
  const Icon = config.icon;
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center border"
          style={{
            background: `${config.color}15`,
            borderColor: `${config.color}25`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div>
          <h2 className="text-sm font-black text-white">{config.label}</h2>
          {count > 0 && (
            <p className="text-[9px] text-white/30">{count} available</p>
          )}
        </div>
      </div>
      {count > 0 && (
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-[9px] font-black text-[#BFA264]/50 hover:text-[#BFA264] transition-colors uppercase tracking-widest"
        >
          View All <ArrowUpRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = memo(({ project, userData, onSelect, index }) => {
  const userSkills = userData?.skills?.alignedSkills || [];
  const userVault = userData?.vault || [];
  const { pct, tier } = calcProbability(
    userVault,
    userSkills,
    project.tags || [],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      onClick={() => onSelect(project)}
      className="group cursor-pointer rounded-[1.25rem] border border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a] transition-all duration-300 p-4 flex flex-col gap-3"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      role="button"
      tabIndex={0}
      aria-label={`View project: ${project.title}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect(project)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {project.authorAvatar ? (
            <img
              src={project.authorAvatar}
              alt={project.authorName}
              className="w-8 h-8 rounded-full border border-[#BFA264]/30 object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-[#BFA264] font-black text-xs shrink-0">
              {(project.authorName || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">
              {project.authorName || "Operator"}
            </p>
            <p className="text-[9px] text-white/30 font-mono">
              @{project.authorUsername || "—"}
            </p>
          </div>
        </div>
        <ProbabilityBadge pct={pct} tier={tier} compact />
      </div>

      <div>
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest mb-1.5"
          style={{
            color: "#8b5cf6",
            background: "rgba(139,92,246,0.1)",
            borderColor: "rgba(139,92,246,0.2)",
          }}
        >
          <Code2 className="w-2.5 h-2.5" />
          {project.projectType || "Project"}
        </div>
        <h3 className="text-sm font-black text-white leading-snug">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-[10px] text-white/40 leading-relaxed mt-1 line-clamp-2">
            {project.description}
          </p>
        )}
      </div>

      {project.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-white/[0.03] border border-white/[0.05] rounded text-[8px] font-bold text-white/25"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-widest",
            project.payType === "Paid" ? "text-emerald-400" : "text-white/25",
          )}
        >
          {project.payType || "Unpaid"}
        </span>
        <span className="flex items-center gap-1 text-[9px] font-black text-white/20 uppercase tracking-widest">
          View <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
});

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const OppSkeleton = () => (
  <div className="rounded-[1.5rem] bg-[#0a0a0a] border border-[#1a1a1a] overflow-hidden animate-pulse">
    <div className="aspect-[16/7] bg-[#111]" />
    <div className="p-4 space-y-2.5">
      <div className="h-3 bg-[#111] rounded w-3/4" />
      <div className="h-2.5 bg-[#111] rounded w-1/2" />
      <div className="flex gap-1.5">
        <div className="h-4 bg-[#111] rounded w-14" />
        <div className="h-4 bg-[#111] rounded w-14" />
      </div>
    </div>
  </div>
);

// ─── Empty State ────────────────────────────────────────────────────────────────
const EmptyState = ({ activeTab, isProjectsMode }) => {
  const config = OPP_TYPES.find((t) => t.key === activeTab) || OPP_TYPES[0];
  const Icon = config.icon;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center col-span-full">
      <div
        className="w-20 h-20 rounded-[2rem] flex items-center justify-center border mb-5"
        style={{
          background: `${config.color}08`,
          borderColor: `${config.color}15`,
        }}
      >
        <Icon className="w-9 h-9" style={{ color: `${config.color}35` }} />
      </div>
      <h3 className="text-xl font-black text-white mb-2">
        {isProjectsMode
          ? "No Community Projects Yet"
          : `No ${config.label} Yet`}
      </h3>
      <p className="text-sm text-white/30 max-w-[260px] leading-relaxed">
        {isProjectsMode
          ? "Operators haven't posted projects yet. Be first."
          : "Curated opportunities coming soon. Check back shortly."}
      </p>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Opportunities = () => {
  const { userData } = useUserData();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("type") || "all");
  const [isProjectsMode, setIsProjectsMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);

  const [oppsByType, setOppsByType] = useState({});
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projLoading, setProjLoading] = useState(false);
  const [lastDocs, setLastDocs] = useState({});
  const [hasMore, setHasMore] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Fetch admin opportunities ────────────────────────────────────────────
  const fetchOpps = useCallback(
    async (reset = false) => {
      if (isProjectsMode) return;
      if (reset) {
        setLoading(true);
      }

      const typesToFetch =
        activeTab === "all"
          ? OPP_TYPES.filter((t) => t.key !== "all").map((t) => t.key)
          : [activeTab];

      const results = {};
      const newLastDocs = {};
      const newHasMore = {};

      await Promise.all(
        typesToFetch.map(async (type) => {
          try {
            const constraints = [
              where("type", "==", type),
              where("isActive", "==", true),
              orderBy("createdAt", "desc"),
              limit(PAGE_SIZE),
            ];
            if (filters.workMode)
              constraints.splice(
                -1,
                0,
                where("workMode", "==", filters.workMode),
              );
            if (filters.payType)
              constraints.splice(
                -1,
                0,
                where("payType", "==", filters.payType),
              );
            if (filters.experience)
              constraints.splice(
                -1,
                0,
                where("experienceLevel", "==", filters.experience),
              );
            if (!reset && lastDocs[type])
              constraints.splice(-1, 0, startAfter(lastDocs[type]));

            const snap = await getDocs(
              query(collection(db, "opportunities"), ...constraints),
            );
            let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

            // Client-side filters (search + stackTags)
            if (search) {
              const q = search.toLowerCase();
              items = items.filter(
                (o) =>
                  o.title?.toLowerCase().includes(q) ||
                  o.provider?.toLowerCase().includes(q) ||
                  o.description?.toLowerCase().includes(q),
              );
            }
            if (filters.stackTags?.length) {
              const ft = filters.stackTags.map((t) => t.toLowerCase());
              items = items.filter((o) => {
                const ot = new Set((o.tags || []).map((t) => t.toLowerCase()));
                return ft.some((t) => ot.has(t));
              });
            }

            results[type] = reset
              ? items
              : [...(oppsByType[type] || []), ...items];
            newLastDocs[type] = snap.docs[snap.docs.length - 1] || null;
            newHasMore[type] = snap.docs.length === PAGE_SIZE;
          } catch {
            results[type] = oppsByType[type] || [];
          }
        }),
      );

      setOppsByType((prev) => (reset ? results : { ...prev, ...results }));
      setLastDocs((prev) => ({ ...prev, ...newLastDocs }));
      setHasMore((prev) => ({ ...prev, ...newHasMore }));
      setLoading(false);
      setLoadingMore(false);
    },
    [activeTab, filters, search, isProjectsMode],
  );

  // ── Fetch user projects ──────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    setProjLoading(true);
    try {
      const constraints = [
        where("isActive", "==", true),
        orderBy("createdAt", "desc"),
        limit(30),
      ];
      if (activeTab !== "all")
        constraints.splice(-1, 0, where("projectType", "==", activeTab));
      const snap = await getDocs(
        query(collection(db, "user_projects"), ...constraints),
      );
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      setProjects([]);
    } finally {
      setProjLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (isProjectsMode) fetchProjects();
    else fetchOpps(true);
  }, [activeTab, filters, search, isProjectsMode]);

  useEffect(() => {
    setSearchParams(activeTab !== "all" ? { type: activeTab } : {});
  }, [activeTab]);

  const renderedTypes = useMemo(
    () =>
      activeTab !== "all"
        ? [activeTab]
        : OPP_TYPES.filter((t) => t.key !== "all").map((t) => t.key),
    [activeTab],
  );

  const totalCount = useMemo(
    () => renderedTypes.reduce((s, t) => s + (oppsByType[t] || []).length, 0),
    [renderedTypes, oppsByType],
  );

  const anyHasMore = useMemo(
    () => renderedTypes.some((t) => hasMore[t]),
    [renderedTypes, hasMore],
  );

  const userSkills = userData?.skills?.alignedSkills || [];

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchOpps(false);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[#BFA264]/20 pb-32 relative overflow-x-hidden">
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#BFA264]/[0.03] blur-[120px] rounded-full" />
        <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-violet-500/[0.02] blur-[100px] rounded-full" />
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="relative z-20 border-b border-[#111] bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-5 pb-0">
          {/* Top row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  Live Opportunities
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Opportunities
                {totalCount > 0 && (
                  <span className="text-[10px] font-black text-white/15 uppercase tracking-widest">
                    {totalCount}+ listings
                  </span>
                )}
              </h1>
              <p className="text-sm text-white/35 font-medium mt-1 hidden md:block">
                Jobs, internships, freelance, grants, college fests — curated
                for your domain.
              </p>
            </div>

            {/* Projects Mode Toggle */}
            <div
              onClick={() => setIsProjectsMode((v) => !v)}
              role="switch"
              aria-checked={isProjectsMode}
              tabIndex={0}
              onKeyDown={(e) =>
                e.key === "Enter" && setIsProjectsMode((v) => !v)
              }
              aria-label="Toggle projects mode"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none shrink-0",
                isProjectsMode
                  ? "bg-violet-500/10 border-violet-500/25"
                  : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333]",
              )}
            >
              <div
                className={cn(
                  "w-8 h-4 rounded-full relative transition-all",
                  isProjectsMode ? "bg-violet-500" : "bg-[#333]",
                )}
              >
                <div
                  className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200",
                    isProjectsMode ? "left-4" : "left-0.5",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isProjectsMode ? "text-violet-400" : "text-white/35",
                )}
              >
                Projects Mode
              </span>
              <Rocket
                className={cn(
                  "w-3.5 h-3.5",
                  isProjectsMode ? "text-violet-400" : "text-white/20",
                )}
              />
            </div>
          </div>

          {/* Search + filter toggle */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search opportunities, companies, skills..."
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] focus:border-[#BFA264]/40 text-white pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none transition-colors placeholder:text-white/20"
                aria-label="Search opportunities"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                showFilters
                  ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264]"
                  : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#333] text-white/45",
              )}
              aria-label="Toggle filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>

          {/* Filter bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-visible relative"
              >
                <FilterBar
                  filters={filters}
                  setFilters={setFilters}
                  onClear={() => {
                    setFilters({});
                    setSearch("");
                  }}
                  userSkills={userSkills}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TYPE TABS ── */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div
            className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-4"
            role="tablist"
            aria-label="Opportunity categories"
          >
            {OPP_TYPES.map((type) => {
              const Icon = type.icon;
              const active = activeTab === type.key;
              return (
                <button
                  key={type.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(type.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 border min-h-[36px]",
                    active
                      ? ""
                      : "bg-[#0a0a0a] border-transparent text-white/30 hover:text-white/60 hover:bg-[#111]",
                  )}
                  style={
                    active
                      ? {
                          background: `${type.color}15`,
                          borderColor: `${type.color}35`,
                          color: type.color,
                        }
                      : {}
                  }
                  aria-label={`Show ${type.label}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10">
        {isProjectsMode ? (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">
                  Community Projects
                </h2>
                <p className="text-[9px] text-white/30">
                  Opportunities hosted by operators & indie builders
                </p>
              </div>
            </div>

            {projLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <OppSkeleton key={i} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState activeTab={activeTab} isProjectsMode />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {projects.map((p, i) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    userData={userData}
                    onSelect={setSelectedOpp}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <OppSkeleton key={i} />
            ))}
          </div>
        ) : activeTab === "all" ? (
          /* ── ALL MODE — sectioned ── */
          <div className="space-y-12">
            {renderedTypes.map((type) => {
              const items = oppsByType[type] || [];
              if (items.length === 0) return null;
              return (
                <section key={type} aria-labelledby={`section-${type}`}>
                  <SectionHeader
                    type={type}
                    count={items.length}
                    onViewAll={() => setActiveTab(type)}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {items.map((opp, i) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        userData={userData}
                        onSelect={setSelectedOpp}
                        index={i}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {totalCount === 0 && <EmptyState activeTab="all" />}
          </div>
        ) : (
          /* ── SINGLE TYPE MODE ── */
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {(oppsByType[activeTab] || []).map((opp, i) => (
                <OppCard
                  key={opp.id}
                  opp={opp}
                  userData={userData}
                  onSelect={setSelectedOpp}
                  index={i}
                />
              ))}
              {(!oppsByType[activeTab] ||
                oppsByType[activeTab].length === 0) && (
                <EmptyState activeTab={activeTab} />
              )}
            </div>
            {hasMore[activeTab] && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-8 py-3.5 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-white/55 hover:text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                  aria-label="Load more opportunities"
                >
                  {loadingMore ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── DETAIL SIDEBAR ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOpp && (
          <>
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              onClick={() => setSelectedOpp(null)}
            />
            <DetailSidebar
              key="sidebar"
              opp={selectedOpp}
              userData={userData}
              onClose={() => setSelectedOpp(null)}
              navigate={navigate}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Opportunities;
