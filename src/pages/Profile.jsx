/**
 * @fileoverview Discotive OS — Operator Dossier v9.0
 * @description The cinematic career identity page. LinkedIn killer.
 *
 * ARCHITECTURE:
 * — PC: Asymmetric sticky layout. Right column = locked Identity Pillar.
 *        Left column = scrolling Proof Ledger (vault, skills, network, telemetry).
 * — Mobile: Single-column cinematic narrative flow with bottom sheet modals.
 *
 * DESIGN PHILOSOPHY:
 * — Zero bento cards. Continuous narrative. Vast negative space.
 * — Proof of Work > Self-declaration. Every claim is verified.
 * — Focus-dimming micro-interactions on vault asset hover.
 * — Frosted-glass empty states. Never a broken screen.
 * — PRO tier = irresistible status symbol with premium borders & analytics.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import { useUserData, useOnboardingGate } from "../hooks/useUserData";
import { useScoreHistory } from "../hooks/useDashboardData";
import { cn } from "../lib/cn";
import {
  Activity,
  Award,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Crown,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  FolderLock,
  Github,
  Globe,
  Hash,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  Monitor,
  Plus,
  Share2,
  ShieldCheck,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Twitter,
  Users,
  Video,
  Youtube,
  Zap,
  ArrowUpRight,
  Briefcase,
  Sparkles,
  Lock,
  X,
  Download,
  LinkIcon,
  MessageSquare,
  Crosshair,
  Terminal,
  BarChart3,
  AlignLeft,
  Search,
} from "lucide-react";

// ─── Score formatter ──────────────────────────────────────────────────────────
const fmtScore = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0);

const calcVSS = (vault = []) => {
  const verified = vault.filter((a) => a.status === "VERIFIED");
  if (!verified.length) return 0;
  const pts = verified.reduce(
    (s, a) =>
      s + (a.strength === "Strong" ? 30 : a.strength === "Medium" ? 20 : 10),
    0,
  );
  return Math.min(Math.round((pts / (verified.length * 30)) * 100), 100);
};

const getLevel = (score) => Math.min(Math.floor((score ?? 0) / 1000) + 1, 10);

// ─── Toast system ─────────────────────────────────────────────────────────────
const useToast = () => {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = "grey") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, showToast: show };
};

// ─── Vault Asset Card ─────────────────────────────────────────────────────────
const ASSET_TYPE_CONFIG = {
  Certificate: {
    icon: Award,
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    label: "Certificate",
  },
  Project: {
    icon: Code2,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    label: "Project",
  },
  Resume: {
    icon: FileText,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.10)",
    label: "Resume",
  },
  Video: {
    icon: Video,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    label: "Video",
  },
  default: {
    icon: Database,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.10)",
    label: "Asset",
  },
};

const VaultAssetCard = ({ asset, isFocused, onFocus, onBlur }) => {
  const cfg = ASSET_TYPE_CONFIG[asset?.category] || ASSET_TYPE_CONFIG.default;
  const Icon = cfg.icon;
  const isVerified = asset?.status === "VERIFIED";
  const isPending = asset?.status === "PENDING";

  return (
    <motion.div
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
      animate={{
        opacity: isFocused === false ? 0.3 : 1,
        scale: isFocused === true ? 1.01 : 1,
      }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative group rounded-[1.5rem] border transition-all duration-300 overflow-hidden cursor-default",
        isVerified
          ? "bg-[#0a0a0a] border-[rgba(255,255,255,0.06)] hover:border-[rgba(191,162,100,0.30)]"
          : "bg-[#080808] border-[rgba(255,255,255,0.04)]",
      )}
    >
      {/* Ambient glow on verified */}
      {isVerified && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${cfg.color}08 0%, transparent 70%)`,
          }}
        />
      )}

      <div className="p-4 flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border"
          style={{ background: cfg.bg, borderColor: `${cfg.color}25` }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-[11px] font-black text-white/50 uppercase tracking-widest">
              {cfg.label}
            </p>
            {isVerified && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">
                  Verified
                </span>
              </div>
            )}
            {isPending && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[7px] font-black text-amber-400 uppercase tracking-widest">
                  Pending
                </span>
              </div>
            )}
          </div>
          <p className="text-sm font-bold text-[#F5F0E8] truncate mb-0.5">
            {asset?.title || asset?.name || "Untitled"}
          </p>
          {asset?.credentials?.issuer && (
            <p className="text-[10px] text-white/30">
              {asset.credentials.issuer}
            </p>
          )}
          {asset?.scoreYield > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Zap className="w-2.5 h-2.5 text-[#BFA264]" />
              <span className="text-[9px] font-black text-[#BFA264]">
                +{asset.scoreYield} pts
              </span>
            </div>
          )}
        </div>

        {/* External link */}
        {asset?.url && (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.08] text-white/25 hover:text-white transition-all shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Strength bar (verified only) */}
      {isVerified && asset?.strength && (
        <div className="px-4 pb-3">
          <div className="h-0.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:
                  asset.strength === "Strong"
                    ? "100%"
                    : asset.strength === "Medium"
                      ? "66%"
                      : "33%",
                background:
                  asset.strength === "Strong"
                    ? "#4ADE80"
                    : asset.strength === "Medium"
                      ? "#BFA264"
                      : "#F87171",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[7px] text-white/20 uppercase tracking-widest">
              Signal Strength
            </span>
            <span
              className="text-[7px] font-black uppercase tracking-widest"
              style={{
                color:
                  asset.strength === "Strong"
                    ? "#4ADE80"
                    : asset.strength === "Medium"
                      ? "#BFA264"
                      : "#F87171",
              }}
            >
              {asset.strength}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ─── Empty state (frosted glass) ──────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, subtitle, action, onAction }) => (
  <div className="relative rounded-[2rem] border border-dashed border-white/[0.06] p-8 flex flex-col items-center text-center overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
    <div className="w-14 h-14 rounded-[1.25rem] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4 backdrop-blur-sm">
      <Icon className="w-6 h-6 text-white/15" />
    </div>
    <p className="text-sm font-black text-white/25 mb-1">{title}</p>
    <p className="text-[11px] text-white/15 leading-relaxed max-w-[200px]">
      {subtitle}
    </p>
    {action && (
      <button
        onClick={onAction}
        className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#BFA264]/10 border border-[#BFA264]/20 rounded-xl text-[9px] font-black text-[#BFA264] uppercase tracking-widest hover:bg-[#BFA264]/15 transition-all"
      >
        <Plus className="w-3 h-3" /> {action}
      </button>
    )}
  </div>
);

// ─── Score sparkline tooltip ──────────────────────────────────────────────────
const ScoreTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-[#BFA264]/20 rounded-xl px-3 py-2 shadow-2xl pointer-events-none">
      <p className="text-[8px] text-white/30 uppercase tracking-widest">
        {label}
      </p>
      <p className="text-base font-black text-white font-mono">
        {(payload[0].value ?? 0).toLocaleString()}
      </p>
    </div>
  );
};

// ─── Alliance Force mini-card ─────────────────────────────────────────────────
const AllianceForceCard = ({ allies = [] }) => {
  if (!allies.length) return null;
  const topAllies = allies.slice(0, 5);
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {topAllies.map((ally, i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-full bg-[#111] border-2 border-[#030303] flex items-center justify-center text-[9px] font-black text-[#BFA264] overflow-hidden"
            style={{ zIndex: topAllies.length - i }}
          >
            {ally?.avatarUrl ? (
              <img
                src={ally.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (ally?.name || ally?.username || "A").charAt(0).toUpperCase()
            )}
          </div>
        ))}
      </div>
      <span className="text-[10px] font-bold text-white/30">
        {allies.length} {allies.length === 1 ? "Ally" : "Allies"}
      </span>
    </div>
  );
};

// ─── PRO gate overlay ─────────────────────────────────────────────────────────
const ProGate = ({ feature }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#030303]/80 backdrop-blur-sm rounded-[2rem] z-10">
    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
      <Crown className="w-5 h-5 text-amber-400" />
    </div>
    <div className="text-center">
      <p className="text-xs font-black text-white mb-0.5">{feature}</p>
      <p className="text-[9px] text-white/30">Requires Pro Clearance</p>
    </div>
    <Link
      to="/premium"
      className="px-4 py-2 bg-amber-500 text-black text-[9px] font-black rounded-xl uppercase tracking-widest hover:bg-amber-400 transition-all"
    >
      Upgrade
    </Link>
  </div>
);

// ─── Section label ────────────────────────────────────────────────────────────
const SLabel = ({
  children,
  icon: Icon,
  iconColor = "text-[#BFA264]",
  className,
}) => (
  <div className={cn("flex items-center gap-2 mb-5", className)}>
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />}
    <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">
      {children}
    </span>
    <div className="flex-1 h-px bg-white/[0.04]" />
  </div>
);

// ─── Link chip ────────────────────────────────────────────────────────────────
const LINK_CONFIGS = {
  linkedin: { icon: Linkedin, label: "LinkedIn", color: "#0A66C2" },
  github: { icon: Github, label: "GitHub", color: "#c9d1d9" },
  twitter: { icon: Twitter, label: "X / Twitter", color: "#1DA1F2" },
  youtube: { icon: Youtube, label: "YouTube", color: "#FF0000" },
  instagram: { icon: Instagram, label: "Instagram", color: "#E1306C" },
  website: { icon: Globe, label: "Website", color: "#BFA264" },
};

const LinkChip = ({ type, url }) => {
  const cfg = LINK_CONFIGS[type] || LINK_CONFIGS.website;
  const Icon = cfg.icon;
  if (!url) return null;
  return (
    <a
      href={url.startsWith("http") ? url : `https://${url}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.07] hover:border-white/[0.12] transition-all group"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
      <span className="text-[10px] font-bold text-white/50 group-hover:text-white/80 transition-colors">
        {cfg.label}
      </span>
      <ExternalLink className="w-2.5 h-2.5 text-white/15 group-hover:text-white/40 transition-colors ml-auto" />
    </a>
  );
};

// ─── Inline bio editor ────────────────────────────────────────────────────────
const InlineBioEdit = ({ userData, uid, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(
    userData?.footprint?.bio || userData?.professional?.bio || "",
  );
  const [saving, setSaving] = useState(false);
  const taRef = useRef(null);

  useEffect(() => {
    if (editing) setTimeout(() => taRef.current?.focus(), 50);
  }, [editing]);

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        "footprint.bio": bio.trim(),
        "professional.bio": bio.trim(),
      });
      await onSaved?.();
      setEditing(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (editing)
    return (
      <div className="space-y-2">
        <textarea
          ref={taRef}
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 300))}
          className="w-full bg-[#050505] border border-[#BFA264]/30 focus:border-[#BFA264]/60 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none min-h-[80px] transition-colors"
          placeholder="2–3 sentences about what you build and who you serve…"
        />
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-white/20 font-mono">
            {bio.length}/300
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-[10px] font-black text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 bg-[#BFA264] text-black text-[10px] font-black rounded-xl hover:bg-[#D4AF78] disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="group relative">
      {bio ? (
        <p
          className="text-sm text-white/50 leading-relaxed cursor-text"
          onClick={() => setEditing(true)}
        >
          {bio}
        </p>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center gap-2 py-4 border border-dashed border-white/[0.07] rounded-xl text-[10px] font-bold text-white/20 hover:text-white/40 hover:border-white/[0.12] transition-all justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Add your operator bio
        </button>
      )}
      {bio && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[8px] font-black text-[#BFA264]/50 hover:text-[#BFA264] uppercase tracking-widest transition-all"
        >
          <Edit3 className="w-2.5 h-2.5" /> Edit
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY PILLAR (sticky right column on PC)
// ═══════════════════════════════════════════════════════════════════════════════
const IdentityPillar = ({
  userData,
  uid,
  score,
  level,
  isPro,
  streak,
  vss,
  vault,
  allies,
  onAvatarUpload,
  isUploadingAvatar,
  onCopyLink,
  copied,
  refreshUserData,
  showToast,
}) => {
  const navigate = useNavigate();
  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "?";
  const fullName =
    `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
    "Operator";
  const xp = (score ?? 0) % 1000;
  const levelPct = (xp / 1000) * 100;

  return (
    <div className="flex flex-col gap-5">
      {/* Hero card */}
      <div
        className={cn(
          "relative rounded-[2rem] overflow-hidden border",
          isPro
            ? "border-[rgba(191,162,100,0.35)] shadow-[0_0_60px_rgba(191,162,100,0.08)]"
            : "border-[rgba(255,255,255,0.07)]",
        )}
      >
        {/* PRO shimmer top border */}
        {isPro && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFA264] to-transparent" />
        )}

        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F] to-[#090909]" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#BFA264]/[0.04] to-transparent pointer-events-none" />

        <div className="relative z-10 p-6">
          {/* Avatar + Upload */}
          <div className="flex items-start justify-between mb-6">
            <label
              className={cn(
                "relative flex w-20 h-20 rounded-[1.5rem] items-center justify-center text-2xl font-black text-[#BFA264] cursor-pointer overflow-hidden transition-all group",
                "bg-[#111] border-2",
                isPro
                  ? "border-[#BFA264]/60 shadow-[0_0_20px_rgba(191,162,100,0.15)]"
                  : "border-[rgba(255,255,255,0.10)]",
                isUploadingAvatar && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onAvatarUpload}
                disabled={isUploadingAvatar}
              />
              {userData?.identity?.avatarUrl ? (
                <img
                  src={userData.identity.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-[#BFA264] animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </label>

            <div className="flex flex-col items-end gap-2">
              {isPro && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-[#8B7240]/20 to-[#D4AF78]/15 border border-[#BFA264]/35 rounded-full">
                  <Crown className="w-3 h-3 text-[#D4AF78]" />
                  <span className="text-[8px] font-black text-[#D4AF78] uppercase tracking-[0.2em]">
                    Pro
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Name + handle */}
          <h1 className="text-2xl font-black text-[#F5F0E8] tracking-tight leading-tight mb-1">
            {fullName}
          </h1>
          <p className="text-[11px] font-mono text-white/25 mb-3">
            @{userData?.identity?.username || "—"}
            {userData?.discotiveId && (
              <span className="ml-2 text-[#BFA264]/40">
                #{userData.discotiveId}
              </span>
            )}
          </p>

          {/* Domain + niche */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(userData?.identity?.domain || userData?.vision?.passion) && (
              <span className="px-2.5 py-1 bg-[#BFA264]/8 border border-[#BFA264]/20 rounded-full text-[9px] font-bold text-[#D4AF78]">
                {userData?.identity?.domain || userData?.vision?.passion}
              </span>
            )}
            {(userData?.identity?.niche || userData?.vision?.niche) && (
              <span className="px-2.5 py-1 bg-white/[0.04] border border-white/[0.07] rounded-full text-[9px] font-bold text-white/40">
                {userData?.identity?.niche || userData?.vision?.niche}
              </span>
            )}
          </div>

          {/* Location */}
          {(userData?.identity?.country || userData?.footprint?.location) && (
            <div className="flex items-center gap-1.5 mb-5">
              <MapPin className="w-3 h-3 text-white/20" />
              <span className="text-[10px] text-white/30">
                {userData?.footprint?.location || userData?.identity?.country}
              </span>
            </div>
          )}

          {/* Score — the crown jewel */}
          <div className="bg-[#030303] border border-[rgba(191,162,100,0.15)] rounded-[1.5rem] p-4 mb-4">
            <div className="flex items-end justify-between mb-1">
              <div>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-0.5">
                  Discotive Score
                </p>
                <p className="text-4xl font-black text-[#D4AF78] font-mono leading-none tracking-tighter">
                  {(score ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-white/20 uppercase tracking-widest mb-0.5">
                  Level
                </p>
                <p className="text-2xl font-black text-white/60 font-mono">
                  {level}
                </p>
              </div>
            </div>
            {/* XP bar */}
            <div className="mt-3">
              <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #8B7240, #D4AF78)",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[8px] text-white/15 font-mono">
                  {(score % 1000).toLocaleString()} / 1000 XP
                </span>
                <span className="text-[8px] text-white/15">
                  Lv {Math.min(level + 1, 10)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              {
                label: "Vault",
                value: vault.filter((a) => a.status === "VERIFIED").length,
                icon: FolderLock,
                color: "text-emerald-400",
              },
              {
                label: "Streak",
                value: `${streak}d`,
                icon: Flame,
                color: "text-orange-400",
              },
              {
                label: "Allies",
                value: allies.length,
                icon: Users,
                color: "text-violet-400",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-[#080808] border border-white/[0.05] rounded-xl p-2.5 text-center"
              >
                <Icon className={cn("w-3.5 h-3.5 mx-auto mb-1", color)} />
                <p className="text-sm font-black text-white font-mono">
                  {value}
                </p>
                <p className="text-[7px] text-white/20 uppercase tracking-widest">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Alliance force */}
          {allies.length > 0 && (
            <div className="mb-4 p-3 bg-[#080808] border border-white/[0.05] rounded-xl">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">
                Alliance Force
              </p>
              <AllianceForceCard allies={allies} />
            </div>
          )}

          {/* VSS bar */}
          {vss > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">
                  Vault Signal Score
                </span>
                <span className="text-[9px] font-black text-[#BFA264] font-mono">
                  {vss}%
                </span>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${vss}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{
                    background:
                      vss >= 75 ? "#4ADE80" : vss >= 50 ? "#BFA264" : "#F87171",
                  }}
                />
              </div>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-col gap-2.5">
            <Link
              to="/app/profile/edit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#e8e8e8] transition-colors uppercase tracking-widest"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
            <div className="flex gap-2">
              <button
                onClick={onCopyLink}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/[0.04] border border-white/[0.07] text-[10px] font-black text-white/40 hover:text-white rounded-xl transition-all uppercase tracking-widest"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Share"}
              </button>
              <Link
                to={`/@${userData?.identity?.username || ""}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#BFA264]/10 border border-[#BFA264]/25 text-[10px] font-black text-[#BFA264] hover:bg-[#BFA264]/15 rounded-xl transition-all uppercase tracking-widest"
              >
                <Eye className="w-3 h-3" /> Public
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      {(() => {
        const links = userData?.links || userData?.footprint?.personal || {};
        const activeLinkTypes = Object.entries(LINK_CONFIGS).filter(
          ([key]) => links[key],
        );
        if (!activeLinkTypes.length) return null;
        return (
          <div className="rounded-[1.5rem] border border-white/[0.05] bg-[#0a0a0a] p-5">
            <SLabel icon={LinkIcon} iconColor="text-sky-400">
              Online Presence
            </SLabel>
            <div className="flex flex-col gap-2">
              {activeLinkTypes.map(([key]) => (
                <LinkChip key={key} type={key} url={links[key]} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF LEDGER (scrolling left column on PC)
// ═══════════════════════════════════════════════════════════════════════════════
const ProofLedger = ({
  userData,
  uid,
  score,
  isPro,
  vault,
  allies,
  refreshUserData,
  showToast,
  navigate,
}) => {
  const [hoveredAssetIdx, setHoveredAssetIdx] = useState(null);
  const { data: scoreHistory = [] } = useScoreHistory("1M");

  const chartData = useMemo(() => {
    return scoreHistory.map((e) => ({
      day: new Date(e.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: e.score,
    }));
  }, [scoreHistory]);

  const verifiedVault = useMemo(
    () => vault.filter((a) => a.status === "VERIFIED"),
    [vault],
  );
  const pendingVault = useMemo(
    () => vault.filter((a) => a.status === "PENDING"),
    [vault],
  );
  const allSkills = useMemo(
    () =>
      [
        ...(userData?.skills?.alignedSkills || []),
        ...(userData?.skills?.rawSkills || []),
      ]
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 20),
    [userData],
  );

  const radarData = useMemo(
    () => [
      { metric: "Execution", score: Math.min((score / 5000) * 100, 100) },
      { metric: "Skills", score: Math.min((allSkills.length / 10) * 100, 100) },
      { metric: "Network", score: Math.min((allies.length / 20) * 100, 100) },
      {
        metric: "Vault",
        score: Math.min((verifiedVault.length / 10) * 100, 100),
      },
      {
        metric: "Reach",
        score: Math.min(((userData?.profileViews || 0) / 100) * 100, 100),
      },
    ],
    [score, allSkills, allies, verifiedVault, userData],
  );

  const chartMin = chartData.length
    ? Math.max(0, Math.min(...chartData.map((d) => d.score)) - 50)
    : 0;
  const GRAD_ID = "ledgerGrad";

  return (
    <div className="flex flex-col gap-8">
      {/* ── ABOUT SECTION ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <SLabel icon={AlignLeft} iconColor="text-[#BFA264]">
          About
        </SLabel>
        <InlineBioEdit
          userData={userData}
          uid={uid}
          onSaved={refreshUserData}
        />
      </motion.section>

      {/* ── SCORE TRAJECTORY ── */}
      {chartData.length >= 3 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <SLabel icon={Activity} iconColor="text-[#BFA264]">
            Score Trajectory
          </SLabel>
          <div className="rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] overflow-hidden">
            <div className="flex items-end justify-between px-6 pt-5 pb-3">
              <div>
                <p className="text-3xl font-black text-[#D4AF78] font-mono leading-none">
                  {(score ?? 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-white/20 uppercase tracking-widest mt-1">
                  Discotive Score · 30d
                </p>
              </div>
              {chartData.length >= 2 &&
                (() => {
                  const first = chartData[0]?.score ?? 0;
                  const last = chartData[chartData.length - 1]?.score ?? 0;
                  const delta = last - first;
                  return (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black font-mono border",
                        delta >= 0
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400",
                      )}
                    >
                      {delta >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {delta >= 0 ? "+" : ""}
                      {delta.toLocaleString()}
                    </div>
                  );
                })()}
            </div>
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#BFA264"
                        stopOpacity={0.35}
                      />
                      <stop offset="100%" stopColor="#BFA264" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={[chartMin, "auto"]} hide />
                  <ReTooltip
                    content={<ScoreTooltip />}
                    cursor={{
                      stroke: "rgba(191,162,100,0.15)",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#BFA264"
                    strokeWidth={2}
                    fill={`url(#${GRAD_ID})`}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#BFA264",
                      stroke: "#000",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.section>
      )}

      {/* ── PROOF OF WORK — VAULT ASSETS ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-5">
          <FolderLock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">
            Proof of Work · Asset Vault
          </span>
          <div className="flex-1 h-px bg-white/[0.04]" />
          {verifiedVault.length > 0 && (
            <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {verifiedVault.length} Verified
            </span>
          )}
          <Link
            to="/app/vault"
            className="flex items-center gap-1 text-[9px] font-black text-[#BFA264]/40 hover:text-[#BFA264] uppercase tracking-widest transition-colors"
          >
            View All <ArrowUpRight className="w-2.5 h-2.5" />
          </Link>
        </div>

        {vault.length === 0 ? (
          <EmptyState
            icon={FolderLock}
            title="No proof of work yet"
            subtitle="Upload certificates, projects, and achievements to verify your execution."
            action="Upload to Vault"
            onAction={() => navigate("/app/vault")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* Verified assets first */}
            {verifiedVault.slice(0, 6).map((asset, i) => (
              <VaultAssetCard
                key={asset.id || i}
                asset={asset}
                isFocused={
                  hoveredAssetIdx === null
                    ? null
                    : hoveredAssetIdx === i
                      ? true
                      : false
                }
                onFocus={() => setHoveredAssetIdx(i)}
                onBlur={() => setHoveredAssetIdx(null)}
              />
            ))}
            {/* Pending assets (muted) */}
            {pendingVault.slice(0, 2).map((asset, i) => (
              <VaultAssetCard
                key={`p-${asset.id || i}`}
                asset={asset}
                isFocused={null}
                onFocus={() => {}}
                onBlur={() => {}}
              />
            ))}
            {vault.length > 8 && (
              <Link
                to="/app/vault"
                className="flex items-center justify-center gap-2 py-3 border border-dashed border-white/[0.06] rounded-2xl text-[9px] font-black text-white/20 hover:text-white/40 hover:border-white/[0.12] transition-all"
              >
                +{vault.length - 8} more assets in vault
                <ArrowUpRight className="w-2.5 h-2.5" />
              </Link>
            )}
          </div>
        )}
      </motion.section>

      {/* ── OPERATOR RADAR ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13 }}
      >
        <SLabel icon={Target} iconColor="text-[#BFA264]">
          Operator Radar
        </SLabel>
        <div className="rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{
                    fill: "rgba(255,255,255,0.25)",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                />
                <Radar
                  dataKey="score"
                  stroke="#BFA264"
                  strokeWidth={2}
                  fill="#BFA264"
                  fillOpacity={0.12}
                  dot={{ r: 2.5, fill: "#BFA264", strokeWidth: 0 }}
                  animationDuration={800}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5">
            {radarData.map((d) => (
              <div key={d.metric} className="flex items-center gap-3">
                <span className="text-[9px] text-white/25 font-bold w-16 uppercase tracking-widest shrink-0">
                  {d.metric}
                </span>
                <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-full rounded-full bg-[#BFA264]/60"
                  />
                </div>
                <span className="text-[9px] font-black font-mono text-white/30 w-7 text-right">
                  {Math.round(d.score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── SKILLS & CAPABILITIES ── */}
      {allSkills.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <SLabel icon={Zap} iconColor="text-amber-400">
            Skills & Capabilities
          </SLabel>
          <div className="flex flex-wrap gap-2">
            {allSkills.map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-[#0a0a0a] border border-white/[0.07] rounded-full text-[10px] font-bold text-white/50 hover:border-[#BFA264]/30 hover:text-white/80 transition-all cursor-default"
              >
                {skill}
              </span>
            ))}
            <Link
              to="/app/profile/edit"
              className="px-3 py-1.5 border border-dashed border-white/[0.07] rounded-full text-[10px] font-bold text-white/20 hover:text-white/40 hover:border-white/[0.12] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-2.5 h-2.5" /> Add Skills
            </Link>
          </div>
        </motion.section>
      )}

      {/* ── PROFESSIONAL BACKGROUND ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
      >
        <SLabel icon={Briefcase} iconColor="text-[#BFA264]">
          Professional Background
        </SLabel>

        <div className="space-y-3">
          {/* Work experience */}
          {userData?.professional?.workExperience?.role ? (
            <div className="group flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/[0.05] hover:border-[#BFA264]/20 rounded-[1.5rem] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#BFA264]/10 border border-[#BFA264]/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-4.5 h-4.5 text-[#BFA264]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">
                  {userData.professional.workExperience.role}
                </p>
                <p className="text-[10px] text-white/35 truncate">
                  {userData.professional.workExperience.company || ""}
                  {userData.professional.workExperience.type
                    ? ` · ${userData.professional.workExperience.type}`
                    : ""}
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-white/10 shrink-0" />
            </div>
          ) : null}

          {/* Education */}
          {userData?.baseline?.institution ? (
            <div className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/[0.05] hover:border-violet-500/20 rounded-[1.5rem] transition-all">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Award className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate">
                  {userData.baseline.institution}
                </p>
                <p className="text-[10px] text-white/35 truncate">
                  {userData.baseline.course || ""}
                  {userData.baseline.graduationYear
                    ? ` · ${userData.baseline.graduationYear}`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}

          {/* If nothing, show empty state */}
          {!userData?.professional?.workExperience?.role &&
            !userData?.baseline?.institution && (
              <EmptyState
                icon={Briefcase}
                title="No experience added"
                subtitle="Add your work history and education to build credibility."
                action="Add Experience"
                onAction={() => navigate("/app/profile/edit")}
              />
            )}

          <Link
            to="/app/profile/edit"
            className="flex items-center gap-1.5 text-[9px] font-black text-[#BFA264]/30 hover:text-[#BFA264] uppercase tracking-widest transition-colors"
          >
            <Edit3 className="w-2.5 h-2.5" /> Edit Experience
          </Link>
        </div>
      </motion.section>

      {/* ── PRO: ADVANCED ANALYTICS ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.19 }}
      >
        <SLabel icon={BarChart3} iconColor="text-sky-400">
          Advanced Analytics
        </SLabel>
        <div className="relative rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] p-5 overflow-hidden">
          {/* Blurred preview content */}
          <div
            className={cn(
              !isPro && "blur-[3px] pointer-events-none select-none",
            )}
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Profile Views (30d)",
                  value: (userData?.profileViews || 0).toLocaleString(),
                  icon: Eye,
                  color: "text-sky-400",
                },
                {
                  label: "Search Appearances",
                  value: "—",
                  icon: Search,
                  color: "text-violet-400",
                },
                {
                  label: "Score Percentile",
                  value: userData?.precomputed?.globalPercentile
                    ? `Top ${userData.precomputed.globalPercentile}%`
                    : "—",
                  icon: BarChart3,
                  color: "text-[#BFA264]",
                },
                {
                  label: "Global Rank",
                  value: userData?.precomputed?.globalRank
                    ? `#${userData.precomputed.globalRank}`
                    : "—",
                  icon: Target,
                  color: "text-emerald-400",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="p-3 bg-[#080808] border border-white/[0.04] rounded-xl"
                >
                  <Icon className={cn("w-4 h-4 mb-2", color)} />
                  <p className="text-lg font-black text-white font-mono leading-none mb-1">
                    {value}
                  </p>
                  <p className="text-[8px] text-white/25 uppercase tracking-widest leading-tight">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {!isPro && <ProGate feature="Advanced Analytics" />}
        </div>
      </motion.section>

      {/* ── PUBLIC PROFILE CTA ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.21 }}
      >
        <div className="rounded-[2rem] bg-gradient-to-r from-[#BFA264]/[0.08] via-transparent to-transparent border border-[#BFA264]/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-full bg-gradient-to-r from-[#BFA264]/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">
                Your Live Resume
              </p>
              <h3 className="text-lg font-black text-white">
                Public Operator Profile
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                discotive.in/@
                <span className="text-[#BFA264]/60">
                  {userData?.identity?.username || "handle"}
                </span>
                — visible to the world.
              </p>
            </div>
            <Link
              to={`/@${userData?.identity?.username || ""}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#ddd] transition-colors uppercase tracking-widest whitespace-nowrap"
            >
              View Public Profile <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE LAYOUT — Single column cinematic narrative
// ═══════════════════════════════════════════════════════════════════════════════
const MobileProfile = ({
  userData,
  uid,
  score,
  level,
  isPro,
  streak,
  vss,
  vault,
  allies,
  onAvatarUpload,
  isUploadingAvatar,
  onCopyLink,
  copied,
  refreshUserData,
  showToast,
  navigate,
}) => {
  const [tab, setTab] = useState("about");
  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "?";
  const fullName =
    `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
    "Operator";
  const xp = (score ?? 0) % 1000;
  const levelPct = (xp / 1000) * 100;
  const allSkills = [
    ...(userData?.skills?.alignedSkills || []),
    ...(userData?.skills?.rawSkills || []),
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);
  const verifiedVault = vault.filter((a) => a.status === "VERIFIED");
  const [hoveredAssetIdx, setHoveredAssetIdx] = useState(null);

  const TABS = [
    { id: "about", label: "About", icon: AlignLeft },
    { id: "vault", label: "Vault", icon: FolderLock },
    { id: "skills", label: "Skills", icon: Zap },
    { id: "analytics", label: "Stats", icon: BarChart3 },
  ];

  return (
    <div className="flex flex-col gap-0">
      {/* ── Mobile Hero Banner ── */}
      <div
        className={cn(
          "relative mx-0 rounded-none overflow-hidden border-b",
          isPro ? "border-[#BFA264]/20" : "border-white/[0.06]",
        )}
      >
        {isPro && (
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFA264] to-transparent" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F] via-[#090909] to-[#030303]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#BFA264]/[0.03] to-transparent" />

        <div className="relative z-10 px-5 pt-6 pb-5">
          {/* Top: avatar + actions */}
          <div className="flex items-start justify-between mb-5">
            <label
              className={cn(
                "relative w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-2xl font-black text-[#BFA264] cursor-pointer overflow-hidden transition-all",
                "bg-[#111] border-2",
                isPro ? "border-[#BFA264]/60" : "border-white/10",
                isUploadingAvatar && "pointer-events-none opacity-60",
              )}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onAvatarUpload}
                disabled={isUploadingAvatar}
              />
              {userData?.identity?.avatarUrl ? (
                <img
                  src={userData.identity.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 active:opacity-100 flex items-center justify-center">
                {isUploadingAvatar ? (
                  <Loader2 className="w-5 h-5 text-[#BFA264] animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
            </label>
            <div className="flex flex-col items-end gap-2">
              {isPro && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-[#8B7240]/20 to-[#D4AF78]/15 border border-[#BFA264]/35 rounded-full">
                  <Crown className="w-3 h-3 text-[#D4AF78]" />
                  <span className="text-[8px] font-black text-[#D4AF78] uppercase tracking-[0.2em]">
                    Pro
                  </span>
                </div>
              )}
              <button
                onClick={onCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/[0.10] text-[9px] font-black text-white/50 rounded-xl uppercase tracking-widest active:bg-white/[0.10] transition-all min-h-[44px]"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-black text-[#F5F0E8] tracking-tight leading-tight mb-0.5">
            {fullName}
          </h1>
          <p className="text-[11px] font-mono text-white/25 mb-3">
            @{userData?.identity?.username || "—"}
          </p>

          {/* Domain tags */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {(userData?.identity?.domain || userData?.vision?.passion) && (
              <span className="px-2.5 py-1 bg-[#BFA264]/8 border border-[#BFA264]/20 rounded-full text-[9px] font-bold text-[#D4AF78]">
                {userData?.identity?.domain || userData?.vision?.passion}
              </span>
            )}
            {userData?.identity?.country && (
              <span className="flex items-center gap-1 text-[9px] text-white/25">
                <MapPin className="w-2.5 h-2.5" />
                {userData.identity.country}
              </span>
            )}
          </div>

          {/* Score pill */}
          <div className="flex items-center gap-3 p-3 bg-[#030303] border border-[#BFA264]/15 rounded-[1.25rem] mb-4">
            <div>
              <p className="text-[8px] text-white/20 uppercase tracking-widest">
                Score
              </p>
              <p className="text-2xl font-black text-[#D4AF78] font-mono leading-none">
                {(score ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="flex-1">
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${levelPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #8B7240, #D4AF78)",
                  }}
                />
              </div>
              <p className="text-[8px] text-white/20 text-right">
                {xp} / 1000 XP · Lv {level}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] text-white/20 uppercase tracking-widest">
                Level
              </p>
              <p className="text-xl font-black text-white/50 font-mono">
                {level}
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              {
                label: "Verified",
                value: verifiedVault.length,
                icon: FolderLock,
                color: "text-emerald-400",
              },
              {
                label: "Streak",
                value: `${streak}d`,
                icon: Flame,
                color: "text-orange-400",
              },
              {
                label: "Allies",
                value: allies.length,
                icon: Users,
                color: "text-violet-400",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-[#080808] border border-white/[0.05] rounded-xl p-2.5 text-center"
              >
                <Icon className={cn("w-3.5 h-3.5 mx-auto mb-1", color)} />
                <p className="text-sm font-black text-white font-mono">
                  {value}
                </p>
                <p className="text-[7px] text-white/20 uppercase tracking-widest">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <Link
              to="/app/profile/edit"
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white text-black text-[10px] font-black rounded-xl transition-colors uppercase tracking-widest min-h-[44px]"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
            <Link
              to={`/@${userData?.identity?.username || ""}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#BFA264]/10 border border-[#BFA264]/25 text-[10px] font-black text-[#BFA264] rounded-xl transition-all uppercase tracking-widest min-h-[44px]"
            >
              <Eye className="w-3.5 h-3.5" /> View Public
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="sticky top-0 z-30 bg-[#030303]/90 backdrop-blur-xl border-b border-white/[0.05] px-4 py-2">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all min-h-[44px] shrink-0",
                tab === id
                  ? "bg-[#BFA264]/15 border border-[#BFA264]/30 text-[#D4AF78]"
                  : "text-white/30 border border-transparent hover:text-white/60",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden xs:block">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 py-5 space-y-6">
        <AnimatePresence mode="wait">
          {tab === "about" && (
            <motion.div
              key="about"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              <div>
                <SLabel icon={AlignLeft} iconColor="text-[#BFA264]">
                  Bio
                </SLabel>
                <InlineBioEdit
                  userData={userData}
                  uid={uid}
                  onSaved={refreshUserData}
                />
              </div>
              <div>
                <SLabel icon={Briefcase} iconColor="text-[#BFA264]">
                  Background
                </SLabel>
                <div className="space-y-2.5">
                  {userData?.professional?.workExperience?.role && (
                    <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-white/[0.05] rounded-[1.5rem]">
                      <div className="w-10 h-10 rounded-xl bg-[#BFA264]/10 border border-[#BFA264]/20 flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-[#BFA264]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">
                          {userData.professional.workExperience.role}
                        </p>
                        <p className="text-[10px] text-white/35">
                          {userData.professional.workExperience.company || ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {userData?.baseline?.institution && (
                    <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-white/[0.05] rounded-[1.5rem]">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">
                          {userData.baseline.institution}
                        </p>
                        <p className="text-[10px] text-white/35">
                          {userData.baseline.course || ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {!userData?.professional?.workExperience?.role &&
                    !userData?.baseline?.institution && (
                      <EmptyState
                        icon={Briefcase}
                        title="No background added"
                        subtitle="Add experience to build your operator dossier."
                        action="Add Now"
                        onAction={() => navigate("/app/profile/edit")}
                      />
                    )}
                </div>
              </div>
              {/* Links */}
              {(() => {
                const links =
                  userData?.links || userData?.footprint?.personal || {};
                const active = Object.entries(LINK_CONFIGS).filter(
                  ([key]) => links[key],
                );
                if (!active.length) return null;
                return (
                  <div>
                    <SLabel icon={LinkIcon} iconColor="text-sky-400">
                      Online Presence
                    </SLabel>
                    <div className="flex flex-col gap-2">
                      {active.map(([key]) => (
                        <LinkChip key={key} type={key} url={links[key]} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {tab === "vault" && (
            <motion.div
              key="vault"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] font-black text-white/25 uppercase tracking-[0.2em]">
                    Proof of Work
                  </span>
                </div>
                {verifiedVault.length > 0 && (
                  <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {verifiedVault.length} Verified
                  </span>
                )}
              </div>
              {vault.length === 0 ? (
                <EmptyState
                  icon={FolderLock}
                  title="No proof of work yet"
                  subtitle="Upload achievements to verify your execution on-chain."
                  action="Upload to Vault"
                  onAction={() => navigate("/app/vault")}
                />
              ) : (
                <div className="space-y-3">
                  {vault.slice(0, 10).map((asset, i) => (
                    <VaultAssetCard
                      key={asset.id || i}
                      asset={asset}
                      isFocused={null}
                      onFocus={() => {}}
                      onBlur={() => {}}
                    />
                  ))}
                  {vault.length > 10 && (
                    <Link
                      to="/app/vault"
                      className="flex items-center justify-center gap-2 py-3 border border-dashed border-white/[0.06] rounded-2xl text-[9px] font-black text-white/20 hover:text-white/40 transition-all"
                    >
                      +{vault.length - 10} more in vault
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {tab === "skills" && (
            <motion.div
              key="skills"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SLabel icon={Zap} iconColor="text-amber-400">
                Skills & Capabilities
              </SLabel>
              {allSkills.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  title="No skills added"
                  subtitle="Add your technical stack and capabilities."
                  action="Add Skills"
                  onAction={() => navigate("/app/profile/edit")}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-2 bg-[#0a0a0a] border border-white/[0.07] rounded-full text-[10px] font-bold text-white/50 min-h-[44px] flex items-center"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              {/* Radar */}
              <div className="mt-5 rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] p-4">
                <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">
                  Operator Vector
                </p>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.05)" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{
                          fill: "rgba(255,255,255,0.25)",
                          fontSize: 8,
                          fontWeight: 700,
                        }}
                      />
                      <Radar
                        dataKey="score"
                        stroke="#BFA264"
                        strokeWidth={2}
                        fill="#BFA264"
                        fillOpacity={0.12}
                        animationDuration={800}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {tab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SLabel icon={BarChart3} iconColor="text-sky-400">
                Analytics
              </SLabel>
              <div className="relative rounded-[2rem] border border-white/[0.05] bg-[#0a0a0a] p-5 overflow-hidden">
                <div
                  className={cn(
                    !isPro && "blur-[3px] pointer-events-none select-none",
                  )}
                >
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Profile Views",
                        value: (userData?.profileViews || 0).toLocaleString(),
                        icon: Eye,
                        color: "text-sky-400",
                      },
                      {
                        label: "Score Percentile",
                        value: userData?.precomputed?.globalPercentile
                          ? `Top ${userData.precomputed.globalPercentile}%`
                          : "—",
                        icon: BarChart3,
                        color: "text-[#BFA264]",
                      },
                      {
                        label: "Global Rank",
                        value: userData?.precomputed?.globalRank
                          ? `#${userData.precomputed.globalRank}`
                          : "—",
                        icon: Target,
                        color: "text-emerald-400",
                      },
                      {
                        label: "Verified Assets",
                        value: verifiedVault.length,
                        icon: ShieldCheck,
                        color: "text-violet-400",
                      },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div
                        key={label}
                        className="p-3 bg-[#080808] border border-white/[0.04] rounded-xl"
                      >
                        <Icon className={cn("w-4 h-4 mb-2", color)} />
                        <p className="text-lg font-black text-white font-mono leading-none mb-1">
                          {value}
                        </p>
                        <p className="text-[8px] text-white/25 uppercase tracking-widest leading-tight">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {!isPro && <ProGate feature="Analytics Unlocked at Pro" />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PROFILE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const navigate = useNavigate();
  const { userData, loading, patchLocalData, refreshUserData } = useUserData();
  const { requireOnboarding } = useOnboardingGate();
  const { toast, showToast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const uid = auth.currentUser?.uid;

  // ── Derived data ──────────────────────────────────────────────────────────
  const score = userData?.discotiveScore?.current ?? 0;
  const level = getLevel(score);
  const streak = userData?.discotiveScore?.streak ?? 0;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const vault = useMemo(() => userData?.vault || [], [userData]);
  const vss = useMemo(() => calcVSS(vault), [vault]);
  const allies = useMemo(() => userData?.allies || [], [userData]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file || !uid || !requireOnboarding("avatar")) return;
      if (file.size > 2 * 1024 * 1024) {
        showToast("Max 2MB for avatar", "red");
        return;
      }
      setIsUploadingAvatar(true);
      try {
        const storageRef = ref(storage, `avatars/${uid}/${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "users", uid), { "identity.avatarUrl": url });
        patchLocalData({ identity: { ...userData?.identity, avatarUrl: url } });
        showToast("Avatar updated", "green");
      } catch (err) {
        showToast("Upload failed", "red");
      } finally {
        setIsUploadingAvatar(false);
      }
    },
    [uid, userData, patchLocalData, requireOnboarding, showToast],
  );

  // ── Copy profile link ─────────────────────────────────────────────────────
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/@${userData?.identity?.username || ""}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      showToast("Profile link copied!", "green");
      setTimeout(() => setCopiedLink(false), 2500);
    });
  }, [userData, showToast]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-2 border-[#BFA264]/30 border-t-[#BFA264] rounded-full"
          />
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">
            Loading Dossier
          </p>
        </div>
      </div>
    );

  if (!userData)
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <Users className="w-7 h-7 text-white/15" />
        </div>
        <p className="text-white/40 text-sm font-bold">
          No operator data found.
        </p>
        <Link
          to="/auth"
          className="px-5 py-2.5 bg-[#BFA264] text-black text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-[#D4AF78] transition-all"
        >
          Authenticate
        </Link>
      </div>
    );

  const pillarProps = {
    userData,
    uid,
    score,
    level,
    isPro,
    streak,
    vss,
    vault,
    allies,
    onAvatarUpload: handleAvatarUpload,
    isUploadingAvatar,
    onCopyLink: handleCopyLink,
    copied: copiedLink,
    refreshUserData,
    showToast,
  };

  const ledgerProps = {
    userData,
    uid,
    score,
    isPro,
    vault,
    allies,
    refreshUserData,
    showToast,
    navigate,
  };

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* ── PC Layout: Asymmetric sticky ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 max-w-[1400px] mx-auto px-6 py-6">
        {/* Left: Scrolling Proof Ledger */}
        <div>
          <ProofLedger {...ledgerProps} />
        </div>
        {/* Right: Sticky Identity Pillar */}
        <div className="relative">
          <div className="sticky top-6">
            <IdentityPillar {...pillarProps} />
          </div>
        </div>
      </div>

      {/* ── Mobile Layout: Tab-based narrative ── */}
      <div className="lg:hidden">
        <MobileProfile {...pillarProps} navigate={navigate} />
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: -16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              "fixed bottom-6 left-4 md:left-8 z-[600] border px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest",
              toast.type === "green"
                ? "bg-[#052e16] border-emerald-500/30 text-emerald-400"
                : toast.type === "red"
                  ? "bg-[#1a0505] border-rose-500/30 text-rose-400"
                  : "bg-[#0a0a0a] border-[#222] text-[#888]",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
