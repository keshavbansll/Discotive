/**
 * @fileoverview Discotive OS — Asset Vault v4.0 "Drive-Grade"
 * @description
 * Complete architectural overhaul. Netflix-cinematic layout meets Google Drive precision.
 *
 * Architecture:
 * - Tri-state view toggle: Unverified | All | Verified
 * - Vault Strength Analytics Engine (Weak/Medium/Strong pie chart)
 * - Storage enforcement: Essential = 20MB, Pro = 100MB
 * - Connector integrations: GitHub, Figma, Medium, YouTube, Spotify, Devpost, Google Scholar, Stripe, Pitch, Spline
 * - Preview drawer with full Drive-grade mechanics
 * - Granular sharing (email-level access control)
 * - Admin-driven verification protocol
 * - Zero onSnapshot — all getDocs one-shot reads
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
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayRemove,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useUserData } from "../../hooks/useUserData";
import { cn } from "../../lib/cn";
import { createPortal } from "react-dom";
import {
  Database,
  Upload,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Pencil,
  Link,
  Copy,
  Pin,
  PinOff,
  ExternalLink,
  Share2,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Award,
  FileText,
  Code2,
  BookOpen,
  Briefcase,
  Link2,
  Film,
  Music,
  BarChart2,
  Globe,
  Github,
  Figma,
  Youtube,
  Zap,
  Crown,
  Lock,
  Check,
  Search,
  SlidersHorizontal,
  Filter,
  TrendingUp,
  Shield,
  Star,
  MoreHorizontal,
  RefreshCw,
  Hash,
  Loader2,
  HardDrive,
  Layers,
  ImageIcon,
  Play,
  FileCode,
  Box,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ConnectorHub from "./connectors/ConnectorHub";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Tier Storage Limits ──────────────────────────────────────────────────────
const TIER_STORAGE = {
  ESSENTIAL: 20 * 1024 * 1024, // 20 MB
  PRO: 100 * 1024 * 1024, // 100 MB
  ENTERPRISE: 1024 * 1024 * 1024, // 1 GB
};
const TIER_ASSET_LIMITS = {
  ESSENTIAL: 5,
  PRO: 50,
  ENTERPRISE: Infinity,
};

// ─── Asset Categories ─────────────────────────────────────────────────────────
const ASSET_CATEGORIES = [
  { key: "Certificate", label: "Certificate", icon: Award, color: "#f59e0b" },
  { key: "Resume", label: "Resume", icon: FileText, color: "#38bdf8" },
  { key: "Project", label: "Project", icon: Code2, color: "#8b5cf6" },
  {
    key: "Publication",
    label: "Publication",
    icon: BookOpen,
    color: "#06b6d4",
  },
  { key: "Employment", label: "Employment", icon: Briefcase, color: "#10b981" },
  { key: "Link", label: "Link / URL", icon: Link2, color: "#ec4899" },
  { key: "Design", label: "Design Asset", icon: Figma, color: "#a78bfa" },
  { key: "Video", label: "Video", icon: Film, color: "#f97316" },
  { key: "Music", label: "Music / Podcast", icon: Music, color: "#22d3ee" },
  {
    key: "Dataset",
    label: "Dataset / Research",
    icon: BarChart2,
    color: "#84cc16",
  },
];

// ─── Dynamic Asset Schemas ────────────────────────────────────────────────────
const ASSET_SCHEMAS = {
  Certificate: [
    {
      name: "provider",
      label: "Provider *",
      type: "text",
      required: true,
      placeholder: "e.g., AWS, Coursera",
    },
    {
      name: "domain",
      label: "Domain *",
      type: "text",
      required: true,
      placeholder: "e.g., Cloud Computing",
    },
    {
      name: "niche",
      label: "Niche",
      type: "text",
      required: false,
      placeholder: "e.g., Serverless Architecture",
    },
    {
      name: "credentialUrl",
      label: "Credential URL *",
      type: "url",
      required: true,
      placeholder: "https://...",
    },
    {
      name: "certificateLink",
      label: "Certificate Link",
      type: "url",
      required: false,
      placeholder: "https://...",
    },
    {
      name: "completionDate",
      label: "Completed In *",
      type: "month",
      required: true,
    },
    {
      name: "expiryDate",
      label: "Expiry (if any)",
      type: "month",
      required: false,
    },
    {
      name: "skills",
      label: "Skills (max 10, comma-separated)",
      type: "text",
      required: false,
      placeholder: "React, Node.js",
    },
    {
      name: "tags",
      label: "Tags (max 5, comma-separated)",
      type: "text",
      required: false,
      placeholder: "certification, tech",
    },
  ],
  Employment: [
    {
      name: "company",
      label: "Company *",
      type: "text",
      required: true,
      placeholder: "e.g., Google",
    },
    {
      name: "role",
      label: "Role *",
      type: "text",
      required: true,
      placeholder: "e.g., SDE II",
    },
    { name: "startDate", label: "Start Date *", type: "month", required: true },
    { name: "endDate", label: "End Date", type: "month", required: false },
    {
      name: "location",
      label: "Location",
      type: "text",
      required: false,
      placeholder: "Remote / On-site",
    },
  ],
  Resume: [
    {
      name: "version",
      label: "Target Role / Version *",
      type: "text",
      required: true,
      placeholder: "e.g., Frontend Engineer 2024",
    },
  ],
  Publication: [
    {
      name: "publisher",
      label: "Publisher / Journal *",
      type: "text",
      required: true,
      placeholder: "e.g., IEEE",
    },
    {
      name: "publishDate",
      label: "Publish Date *",
      type: "month",
      required: true,
    },
    {
      name: "doi",
      label: "DOI / Link",
      type: "url",
      required: false,
      placeholder: "https://doi.org/...",
    },
  ],
  Link: [
    {
      name: "url",
      label: "URL *",
      type: "url",
      required: true,
      placeholder: "https://...",
    },
    {
      name: "description",
      label: "Short Description",
      type: "text",
      required: false,
      placeholder: "What does this link to?",
    },
  ],
  Default: [],
};

// ─── Connector Integrations ───────────────────────────────────────────────────
const CONNECTORS = [
  {
    key: "github",
    label: "GitHub",
    icon: Github,
    color: "#e2e8f0",
    description: "Repos, PRs, Gists",
  },
  {
    key: "figma",
    label: "Figma",
    icon: Figma,
    color: "#a78bfa",
    description: "Live prototypes",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ef4444",
    description: "Videos & analytics",
  },
  {
    key: "medium",
    label: "Medium",
    icon: FileText,
    color: "#e2e8f0",
    description: "Articles & drafts",
  },
  {
    key: "spotify",
    label: "Spotify",
    icon: Music,
    color: "#22c55e",
    description: "Tracks & episodes",
  },
  {
    key: "devpost",
    label: "Devpost",
    icon: Code2,
    color: "#38bdf8",
    description: "Hackathon wins",
  },
  {
    key: "scholar",
    label: "Scholar",
    icon: BookOpen,
    color: "#fbbf24",
    description: "Papers & citations",
  },
  {
    key: "stripe",
    label: "Stripe",
    icon: BarChart2,
    color: "#7c3aed",
    description: "MRR & volume",
  },
  {
    key: "pitch",
    label: "Pitch",
    icon: Layers,
    color: "#f97316",
    description: "Decks & proposals",
  },
  {
    key: "spline",
    label: "Spline",
    icon: Box,
    color: "#06b6d4",
    description: "3D / WebGL models",
  },
];

// ─── Strength Config ─────────────────────────────────────────────────────────
const STRENGTH_CONFIG = {
  Strong: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.25)",
    pts: 30,
  },
  Medium: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
    border: "rgba(245,158,11,0.25)",
    pts: 20,
  },
  Weak: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.25)",
    pts: 10,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getCategoryConfig = (cat) =>
  ASSET_CATEGORIES.find((c) => c.key === cat) || ASSET_CATEGORIES[0];

// ─── Toast System ─────────────────────────────────────────────────────────────
const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3800);
  }, []);
  return { toasts, add };
};

// ─── Strength Analytics Pie Chart ────────────────────────────────────────────
const StrengthAnalytics = memo(({ assets }) => {
  const verified = assets.filter((a) => a.status === "VERIFIED");
  const data = useMemo(() => {
    const strong = verified.filter((a) => a.strength === "Strong").length;
    const medium = verified.filter((a) => a.strength === "Medium").length;
    const weak = verified.filter((a) => a.strength === "Weak").length;
    return [
      { name: "Strong", value: strong, color: "#10b981" },
      { name: "Medium", value: medium, color: "#f59e0b" },
      { name: "Weak", value: weak, color: "#f97316" },
    ].filter((d) => d.value > 0);
  }, [verified]);

  const totalScore = verified.reduce((s, a) => {
    const cfg = STRENGTH_CONFIG[a.strength];
    return s + (cfg?.pts || 0);
  }, 0);

  const vaultPower =
    verified.length === 0
      ? 0
      : Math.min(100, Math.round((totalScore / (verified.length * 30)) * 100));

  if (verified.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-6">
        <Shield
          className="w-8 h-8 mb-3"
          style={{ color: "rgba(255,255,255,0.08)" }}
        />
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          No verified assets yet
        </p>
        <p
          className="text-[9px] mt-1"
          style={{ color: "rgba(255,255,255,0.12)" }}
        >
          Upload & get reviewed to build Vault Power
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="relative" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={54}
              dataKey="value"
              strokeWidth={0}
              paddingAngle={3}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div
                    className="px-3 py-2 rounded-xl border shadow-xl text-xs"
                    style={{
                      background: V.elevated,
                      borderColor: "rgba(255,255,255,0.08)",
                      color: T.primary,
                    }}
                  >
                    <p
                      style={{ color: d.payload.color }}
                      className="font-black"
                    >
                      {d.name}
                    </p>
                    <p style={{ color: T.secondary }}>
                      {d.value} asset{d.value !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="font-black text-xl leading-none"
            style={{ color: T.primary, fontFamily: "'Montserrat', sans-serif" }}
          >
            {vaultPower}%
          </span>
          <span
            className="text-[8px] font-bold uppercase tracking-widest mt-0.5"
            style={{ color: T.dim }}
          >
            Power
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          {
            label: "Strong",
            color: "#10b981",
            count: data.find((d) => d.name === "Strong")?.value || 0,
          },
          {
            label: "Medium",
            color: "#f59e0b",
            count: data.find((d) => d.name === "Medium")?.value || 0,
          },
          {
            label: "Weak",
            color: "#f97316",
            count: data.find((d) => d.name === "Weak")?.value || 0,
          },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: s.color }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                {s.label}
              </span>
            </div>
            <span
              className="text-[10px] font-black font-mono"
              style={{ color: s.count > 0 ? s.color : T.dim }}
            >
              {s.count}
            </span>
          </div>
        ))}
      </div>
      <div
        className="pt-2 mt-auto border-t"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Score Earned
          </span>
          <span
            className="text-[11px] font-black"
            style={{ color: G.bright, fontFamily: "'Montserrat', sans-serif" }}
          >
            +{totalScore} pts
          </span>
        </div>
      </div>
    </div>
  );
});

// ─── Storage Bar ──────────────────────────────────────────────────────────────
const StorageBar = memo(({ used, limit, tier }) => {
  const pct = Math.min(100, (used / limit) * 100);
  const isWarning = pct > 75;
  const isDanger = pct > 90;
  const color = isDanger ? "#ef4444" : isWarning ? "#f59e0b" : G.bright;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5" style={{ color: G.base }} />
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Storage
          </span>
        </div>
        <span
          className="text-[9px] font-black font-mono"
          style={{ color: isWarning ? color : T.dim }}
        >
          {formatBytes(used)} / {formatBytes(limit)}
        </span>
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${G.deep}, ${color})` }}
        />
      </div>
      {isWarning && (
        <p className="text-[9px] font-bold" style={{ color }}>
          {isDanger
            ? "⚠ Storage critical. Upgrade to Pro for 100MB."
            : `${Math.round(pct)}% used — ${tier === "ESSENTIAL" ? "Upgrade for 100MB" : "approaching limit"}`}
        </p>
      )}
    </div>
  );
});

// ─── Tri-State Toggle ─────────────────────────────────────────────────────────
const TriStateToggle = memo(({ value, onChange }) => {
  const options = [
    { key: "unverified", label: "Unverified", icon: Clock, color: "#f59e0b" },
    { key: "all", label: "All Assets", icon: Layers, color: T.secondary },
    { key: "verified", label: "Verified", icon: ShieldCheck, color: "#10b981" },
  ];

  return (
    <div
      className="flex p-1 rounded-xl"
      style={{
        background: V.depth,
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
            style={{
              background: active ? "rgba(255,255,255,0.06)" : "transparent",
              color: active ? opt.color : T.dim,
              border: active
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid transparent",
            }}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
});

// ─── Connector Card ───────────────────────────────────────────────────────────
const ConnectorCard = memo(({ connector, connected, onClick }) => {
  const Icon = connector.icon;
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center group overflow-hidden"
      style={{
        background: connected ? `${connector.color}0A` : V.surface,
        borderColor: connected
          ? `${connector.color}35`
          : "rgba(255,255,255,0.05)",
        minWidth: 72,
      }}
    >
      {connected && (
        <div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
          style={{ background: "#10b981" }}
        >
          <Check className="w-2 h-2 text-white" />
        </div>
      )}
      <Icon
        className="w-5 h-5"
        style={{ color: connected ? connector.color : T.dim }}
      />
      <span
        className="text-[8px] font-bold uppercase tracking-widest leading-tight"
        style={{ color: connected ? connector.color : T.dim }}
      >
        {connector.label}
      </span>
    </motion.button>
  );
});

// ─── Asset Card ───────────────────────────────────────────────────────────────
const AssetCard = memo(
  ({ asset, onSelect, onPin, onToggleVisibility, isSelected, viewMode }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const catConfig = getCategoryConfig(asset.category);
    const Icon = catConfig.icon;
    const strengthCfg = STRENGTH_CONFIG[asset.strength];
    const isPending = asset.status === "PENDING" || !asset.status;
    const isVerified = asset.status === "VERIFIED";
    const isReported = asset.status === "REPORTED";

    useEffect(() => {
      const handler = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target))
          setMenuOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const statusBadge = isVerified
      ? { label: "Verified", color: "#10b981", bg: "rgba(16,185,129,0.10)" }
      : isReported
        ? { label: "Reported", color: "#ef4444", bg: "rgba(239,68,68,0.10)" }
        : { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.10)" };

    // Grid view card
    if (viewMode === "grid") {
      return (
        <motion.div
          layout
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          onClick={() => onSelect(asset)}
          className="relative flex flex-col rounded-[1.25rem] border cursor-pointer group overflow-hidden transition-all duration-300"
          style={{
            background: isSelected ? "rgba(191,162,100,0.05)" : V.surface,
            borderColor: isSelected ? G.border : "rgba(255,255,255,0.06)",
            boxShadow: isSelected ? `0 0 0 1px ${G.border}` : "none",
          }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Thumbnail area */}
          <div
            className="relative aspect-[16/9] overflow-hidden rounded-t-[1.25rem]"
            style={{ background: `${catConfig.color}10` }}
          >
            {asset.thumbnailUrl ? (
              <img
                src={asset.thumbnailUrl}
                alt={asset.title}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon
                  className="w-10 h-10"
                  style={{ color: `${catConfig.color}30` }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-80" />

            {/* Pin badge */}
            {asset.pinned && (
              <div
                className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <Pin className="w-2.5 h-2.5" style={{ color: G.bright }} />
              </div>
            )}

            {/* Private badge */}
            {!asset.isPublic && (
              <div
                className="absolute top-2 right-8 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{
                  background: "rgba(0,0,0,0.65)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <EyeOff className="w-2.5 h-2.5" style={{ color: T.dim }} />
              </div>
            )}

            {/* 3-dot menu */}
            <div
              className="absolute top-2 right-2"
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "rgba(0,0,0,0.65)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <MoreHorizontal
                  className="w-3.5 h-3.5"
                  style={{ color: T.secondary }}
                />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{
                      background: V.elevated,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {[
                      {
                        label: asset.pinned ? "Unpin" : "Pin to Top",
                        icon: asset.pinned ? PinOff : Pin,
                        action: () => {
                          onPin(asset);
                          setMenuOpen(false);
                        },
                      },
                      {
                        label: asset.isPublic ? "Make Private" : "Make Public",
                        icon: asset.isPublic ? EyeOff : Eye,
                        action: () => {
                          onToggleVisibility(asset);
                          setMenuOpen(false);
                        },
                      },
                    ].map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold transition-colors text-left hover:bg-white/[0.04]"
                          style={{ color: T.secondary }}
                        >
                          <ItemIcon className="w-3.5 h-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div className="p-3.5 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3
                className="text-xs font-black leading-tight line-clamp-2 flex-1"
                style={{
                  color: T.primary,
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {asset.title || "Untitled Asset"}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                style={{
                  background: `${catConfig.color}15`,
                  color: catConfig.color,
                }}
              >
                <Icon className="w-2.5 h-2.5" />
                {catConfig.label}
              </span>
              <span
                className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                style={{ background: statusBadge.bg, color: statusBadge.color }}
              >
                {statusBadge.label}
              </span>
              {asset.strength && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                  style={{
                    background: strengthCfg?.bg,
                    color: strengthCfg?.color,
                  }}
                >
                  {asset.strength}
                </span>
              )}
            </div>

            <div
              className="flex items-center justify-between pt-1"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span className="text-[8px] font-mono" style={{ color: T.dim }}>
                {asset.type === "link" ? "URL" : formatBytes(asset.size || 0)}
              </span>
              <span className="text-[8px]" style={{ color: T.dim }}>
                {timeAgo(asset.uploadedAt)}
              </span>
            </div>
          </div>
        </motion.div>
      );
    }

    // List view row
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        onClick={() => onSelect(asset)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer group transition-all"
        style={{
          background: isSelected ? "rgba(191,162,100,0.05)" : "transparent",
          border: `1px solid ${isSelected ? G.border : "rgba(255,255,255,0.04)"}`,
        }}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${catConfig.color}15`,
            border: `1px solid ${catConfig.color}25`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: catConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold truncate"
            style={{ color: T.primary }}
          >
            {asset.title || "Untitled"}
          </p>
          <p
            className="text-[10px] font-mono truncate"
            style={{ color: T.dim }}
          >
            {asset.credentials?.issuer || catConfig.label} ·{" "}
            {formatBytes(asset.size || 0)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
            style={{ background: statusBadge.bg, color: statusBadge.color }}
          >
            {statusBadge.label}
          </span>
          {asset.pinned && (
            <Pin className="w-3 h-3" style={{ color: G.base }} />
          )}
          {!asset.isPublic && (
            <EyeOff className="w-3 h-3" style={{ color: T.dim }} />
          )}
          <span className="text-[9px]" style={{ color: T.dim }}>
            {timeAgo(asset.uploadedAt)}
          </span>
          <ChevronRight
            className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: T.dim }}
          />
        </div>
      </motion.div>
    );
  },
);

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUpload, usedBytes, tier }) => {
  const limit = TIER_STORAGE[tier?.toUpperCase()] || TIER_STORAGE.ESSENTIAL;
  const remaining = limit - usedBytes;

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "Certificate",
    credentials: {},
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  // Filter out automated connectors (Design, Code/Project, Video, Music) for manual sync
  const SYNC_CATEGORIES = ASSET_CATEGORIES.filter((c) =>
    ["Certificate", "Resume", "Employment", "Publication", "Link"].includes(
      c.key,
    ),
  );

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError("File exceeds 25MB per-file limit.");
      return;
    }
    if (f.size > remaining) {
      setError(
        `Insufficient storage. You have ${formatBytes(remaining)} remaining.`,
      );
      return;
    }
    setError("");
    setFile(f);
    if (!form.title)
      setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") }));

    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDynamicChange = (field, value) => {
    setForm((p) => ({
      ...p,
      credentials: { ...p.credentials, [field]: value },
    }));
  };

  const currentSchema = ASSET_SCHEMAS[form.category] || ASSET_SCHEMAS.Default;

  const handleSubmit = async () => {
    if (!file && form.category !== "Link") {
      setError("Please attach a file.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    for (const field of currentSchema) {
      if (field.required && !form.credentials[field.name]) {
        setError(`${field.label.replace(" *", "")} is required.`);
        return;
      }
    }
    setUploading(true);
    setError("");
    // Architecture mandate: Asset must be private on initial upload
    await onUpload(file, { ...form, isPublic: false }, setProgress);
    setUploading(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    onClose();
  };

  const selectedCat =
    SYNC_CATEGORIES.find((c) => c.key === form.category) || SYNC_CATEGORIES[0];
  const CatIcon = selectedCat.icon;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="w-full sm:w-[900px] h-[85vh] sm:h-[600px] flex flex-col sm:flex-row rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden"
        style={{
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(191, 162, 100, 0.2)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Bar (PC) / Top (Mobile) - File Upload & Preview */}
        <div className="w-full sm:w-[320px] p-6 flex flex-col border-b sm:border-b-0 sm:border-r border-white/5 bg-[#050505]/60 shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" style={{ color: G.base }} />
              <h3
                className="text-sm font-black"
                style={{
                  color: T.primary,
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                Sync Asset
              </h3>
            </div>
            <button
              onClick={onClose}
              className="sm:hidden w-7 h-7 rounded-full flex items-center justify-center bg-white/5"
            >
              <X className="w-3.5 h-3.5" style={{ color: T.secondary }} />
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileRef.current?.click()}
            className="flex-1 relative flex flex-col items-center justify-center gap-3 p-4 rounded-2xl cursor-pointer transition-all overflow-hidden"
            style={{
              background: dragActive
                ? G.dimBg
                : previewUrl
                  ? "#000"
                  : "rgba(255,255,255,0.02)",
              border: `2px dashed ${dragActive ? G.border : file ? "transparent" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.zip,.mp4,.mp3"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
            )}

            <div className="z-10 flex flex-col items-center text-center">
              {file ? (
                <>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xl backdrop-blur-md"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <CatIcon className="w-6 h-6" style={{ color: G.bright }} />
                  </div>
                  <p
                    className="text-sm font-bold truncate max-w-[200px]"
                    style={{ color: T.primary }}
                  >
                    {file.name}
                  </p>
                  <p
                    className="text-[10px] mt-1 font-mono"
                    style={{ color: T.dim }}
                  >
                    {formatBytes(file.size)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="mt-4 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
                    style={{
                      color: "#ef4444",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    Remove File
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 mb-3" style={{ color: T.dim }} />
                  <p className="text-sm font-bold" style={{ color: T.primary }}>
                    Select or Drop File
                  </p>
                  <p
                    className="text-[10px] mt-1.5 leading-relaxed"
                    style={{ color: T.dim }}
                  >
                    PDF, PNG, JPG, DOCX, ZIP
                    <br />
                    Max 25MB · {formatBytes(remaining)} left
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Area - Forms & Categories */}
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {/* Horizontal Scrollable Categories */}
          <div className="p-5 pb-0 shrink-0">
            <div className="flex sm:flex-row flex-col items-stretch sm:items-center gap-2.5 overflow-x-auto hide-scrollbar pb-3">
              {SYNC_CATEGORIES.map((cat) => {
                const CIcon = cat.icon;
                const active = form.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        category: cat.key,
                        credentials: {},
                      }))
                    }
                    className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all shrink-0 justify-start sm:justify-center"
                    style={{
                      background: active ? `${cat.color}15` : V.surface,
                      border: `1px solid ${active ? `${cat.color}40` : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <CIcon
                      className="w-4 h-4"
                      style={{ color: active ? cat.color : T.dim }}
                    />
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: active ? cat.color : T.dim }}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Scrollable Form */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
            {error && (
              <div
                className="flex items-center gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <p className="text-xs font-bold text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label
                className="block text-[9px] font-black uppercase tracking-widest mb-2"
                style={{ color: T.dim }}
              >
                Asset Title *
              </label>
              <input
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder={`e.g. Google Data Analytics Certificate`}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: T.primary,
                }}
              />
            </div>

            {currentSchema.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentSchema.map((field) => (
                  <div
                    key={field.name}
                    className={field.type === "url" ? "sm:col-span-2" : ""}
                  >
                    <label
                      className="block text-[9px] font-black uppercase tracking-widest mb-2"
                      style={{ color: T.dim }}
                    >
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={form.credentials[field.name] || ""}
                      onChange={(e) =>
                        handleDynamicChange(field.name, e.target.value)
                      }
                      placeholder={field.placeholder || ""}
                      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
                      style={{
                        background: V.surface,
                        border: "1px solid rgba(255,255,255,0.08)",
                        color: T.primary,
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: T.dim }}
                  >
                    Encrypting & Uploading...
                  </span>
                  <span
                    className="text-[10px] font-black font-mono"
                    style={{ color: G.bright }}
                  >
                    {progress}%
                  </span>
                </div>
                <div
                  className="w-full h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${progress}%` }}
                    style={{
                      background: `linear-gradient(90deg, ${G.deep}, ${G.bright})`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Footer */}
          <div className="p-5 shrink-0 flex items-center justify-between bg-[#0A0A0A]/90 backdrop-blur-xl border-t border-white/5">
            <div className="hidden sm:flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" style={{ color: T.dim }} />
              <p
                className="text-[9px] font-bold tracking-wide"
                style={{ color: T.dim }}
              >
                Asset is private by default.
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="hidden sm:block px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: T.secondary,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  uploading ||
                  (!file && form.category !== "Link") ||
                  !form.title.trim()
                }
                className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
                  color: "#0a0a0a",
                }}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "Syncing..." : "Sync Asset"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

// ─── Share Modal ──────────────────────────────────────────────────────────────
const ShareModal = ({ asset, onClose }) => {
  const [emails, setEmails] = useState((asset.sharedWith || []).join(", "));
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/app/vault/asset/${asset.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-[1.5rem] overflow-hidden"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <h3
            className="text-sm font-black flex items-center gap-2"
            style={{ color: T.primary }}
          >
            <Share2 className="w-4 h-4" style={{ color: G.base }} /> Share Asset
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <X className="w-3 h-3" style={{ color: T.secondary }} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div
            className="flex items-center gap-2 p-3 rounded-xl"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <Link className="w-4 h-4 shrink-0" style={{ color: T.dim }} />
            <span
              className="text-xs font-mono truncate flex-1"
              style={{ color: T.secondary }}
            >
              {shareUrl}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background: copied ? "rgba(16,185,129,0.15)" : G.dimBg,
                color: copied ? "#10b981" : G.bright,
              }}
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div>
            <label
              className="block text-[9px] font-black uppercase tracking-widest mb-2"
              style={{ color: T.dim }}
            >
              Grant Access (email addresses, comma-separated)
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="user@example.com, colleague@company.com"
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.08)",
                color: T.primary,
              }}
            />
            <p className="text-[9px] mt-1.5" style={{ color: T.dim }}>
              These users will be able to view this private asset via the direct
              link.
            </p>
          </div>
          <button
            className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-widest"
            style={{
              background: G.dimBg,
              border: `1px solid ${G.border}`,
              color: G.bright,
            }}
          >
            Save Access Settings
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

// ─── Asset Preview Drawer ─────────────────────────────────────────────────────
const AssetDrawer = ({
  asset,
  onClose,
  onDelete,
  onRename,
  onToggleVisibility,
  onPin,
  onDownload,
  onShare,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(asset?.title || "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!asset) return null;

  const catConfig = getCategoryConfig(asset.category);
  const CatIcon = catConfig.icon;
  const strengthCfg = STRENGTH_CONFIG[asset.strength];

  const isVerified = asset.status === "VERIFIED";
  const isPending = asset.status === "PENDING" || !asset.status;

  const credentials = asset.credentials || {};
  const credEntries = Object.entries(credentials).filter(([, v]) => v);

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] flex flex-col z-[200] overflow-hidden"
      style={{
        background: V.depth,
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "-20px 0 60px rgba(0,0,0,0.7)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${catConfig.color}15` }}
          >
            <CatIcon className="w-4 h-4" style={{ color: catConfig.color }} />
          </div>
          <div>
            <p
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: catConfig.color }}
            >
              {catConfig.label}
            </p>
            <p className="text-[9px] font-mono" style={{ color: T.dim }}>
              {formatBytes(asset.size)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <X className="w-3.5 h-3.5" style={{ color: T.secondary }} />
        </button>
      </div>

      {/* Preview area */}
      <div
        className="relative shrink-0"
        style={{
          height: 180,
          background: `${catConfig.color}08`,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="w-full h-full object-cover opacity-60"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CatIcon
              className="w-16 h-16"
              style={{ color: `${catConfig.color}20` }}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />

        {/* Status overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isVerified && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                style={{
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.3)",
                }}
              >
                <ShieldCheck className="w-3 h-3" style={{ color: "#10b981" }} />
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "#10b981" }}
                >
                  Verified
                </span>
                {asset.strength && (
                  <span
                    className="text-[9px] font-black"
                    style={{ color: strengthCfg?.color }}
                  >
                    · {asset.strength}
                  </span>
                )}
              </div>
            )}
            {isPending && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <Clock className="w-3 h-3" style={{ color: "#f59e0b" }} />
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "#f59e0b" }}
                >
                  Pending Review
                </span>
              </div>
            )}
          </div>
          {asset.scoreYield && (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <Zap className="w-2.5 h-2.5" style={{ color: G.bright }} />
              <span
                className="text-[9px] font-black"
                style={{ color: G.bright }}
              >
                +{asset.scoreYield} pts
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-5 space-y-5">
          {/* Title / rename */}
          <div>
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
                  style={{
                    background: V.surface,
                    border: `1px solid ${G.border}`,
                    color: T.primary,
                  }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    onRename(asset, newTitle);
                    setRenaming(false);
                  }}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}
                >
                  <Check className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
                </button>
                <button
                  onClick={() => setRenaming(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: V.surface,
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <X className="w-3.5 h-3.5" style={{ color: T.dim }} />
                </button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <h2
                  className="text-lg font-black leading-tight flex-1"
                  style={{
                    color: T.primary,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {asset.title || "Untitled Asset"}
                </h2>
                <button
                  onClick={() => setRenaming(true)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Pencil className="w-3 h-3" style={{ color: T.dim }} />
                </button>
              </div>
            )}
          </div>

          {/* Credential fields */}
          {credEntries.length > 0 && (
            <div className="space-y-2">
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                Details
              </p>
              {credEntries.map(([key, value]) => {
                const isUrl =
                  typeof value === "string" && value.startsWith("http");
                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <span
                      className="text-[8px] font-black uppercase tracking-widest mt-0.5 w-20 shrink-0 capitalize"
                      style={{ color: T.dim }}
                    >
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    {isUrl ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-mono truncate flex-1 flex items-center gap-1 hover:underline"
                        style={{ color: "#38bdf8" }}
                      >
                        {value.length > 40 ? value.slice(0, 40) + "..." : value}
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    ) : (
                      <span
                        className="text-[10px] font-mono truncate flex-1"
                        style={{ color: T.secondary }}
                      >
                        {String(value)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Discotive Learn ID */}
          {asset.discotiveLearnId && (
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <Database
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: G.base }}
              />
              <div>
                <p
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: G.deep }}
                >
                  Learn Database Aligned
                </p>
                <p className="text-[9px] font-mono" style={{ color: G.bright }}>
                  {asset.discotiveLearnId}
                </p>
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Uploaded", value: timeAgo(asset.uploadedAt) },
              {
                label: "Type",
                value:
                  asset.type === "link"
                    ? "URL"
                    : asset.size
                      ? formatBytes(asset.size)
                      : "File",
              },
              {
                label: "Visibility",
                value: asset.isPublic ? "Public" : "Private",
              },
              {
                label: "Hash",
                value: asset.hash ? asset.hash.slice(0, 10) + "..." : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-2.5 rounded-xl"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <p
                  className="text-[8px] font-black uppercase tracking-widest mb-0.5"
                  style={{ color: T.dim }}
                >
                  {label}
                </p>
                <p
                  className="text-[10px] font-mono truncate"
                  style={{ color: T.secondary }}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action strip */}
      <div
        className="p-4 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            {
              icon: Download,
              label: "Download",
              action: () => onDownload(asset),
              color: "#38bdf8",
            },
            {
              icon: Share2,
              label: "Share",
              action: () => onShare(asset),
              color: G.bright,
            },
            {
              icon: asset.pinned ? PinOff : Pin,
              label: asset.pinned ? "Unpin" : "Pin",
              action: () => onPin(asset),
              color: asset.pinned ? G.bright : T.dim,
            },
            {
              icon: asset.isPublic ? EyeOff : Eye,
              label: asset.isPublic ? "Private" : "Public",
              action: () => onToggleVisibility(asset),
              color: asset.isPublic ? "#10b981" : T.dim,
            },
          ].map(({ icon: Icon, label, action, color }) => (
            <button
              key={label}
              onClick={action}
              className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
              <span
                className="text-[8px] font-bold uppercase tracking-wider"
                style={{ color: T.dim }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        {asset.url && (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all mb-2"
            style={{
              background: G.dimBg,
              border: `1px solid ${G.border}`,
              color: G.bright,
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open File
          </a>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.15)",
              color: "#ef4444",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Asset
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.05)",
                color: T.secondary,
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onDelete(asset);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#ef4444", color: "#fff" }}
            >
              Confirm Delete
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
};

// ─── Connector Panel ──────────────────────────────────────────────────────────
const ConnectorPanel = memo(({ connectedApps = [], onConnect }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Connectors
        </p>
        <span className="text-[8px] font-bold" style={{ color: T.dim }}>
          {connectedApps.length}/{CONNECTORS.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CONNECTORS.map((connector) => (
          <ConnectorCard
            key={connector.key}
            connector={connector}
            connected={connectedApps.includes(connector.key)}
            onClick={() => onConnect(connector)}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Connector Modal (coming soon gate) ───────────────────────────────────────
const ConnectorModal = ({ connector, onClose }) => {
  if (!connector) return null;
  const Icon = connector.icon;
  return createPortal(
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full max-w-sm p-7 rounded-[1.5rem] text-center"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{
            background: `${connector.color}15`,
            border: `1px solid ${connector.color}30`,
          }}
        >
          <Icon className="w-7 h-7" style={{ color: connector.color }} />
        </div>
        <h3
          className="text-lg font-black mb-2"
          style={{ color: T.primary, fontFamily: "'Montserrat', sans-serif" }}
        >
          {connector.label} Connector
        </h3>
        <p className="text-sm mb-1" style={{ color: T.secondary }}>
          {connector.description}
        </p>
        <p className="text-xs mb-6" style={{ color: T.dim }}>
          Deep integration coming in the next release. This will sync your{" "}
          {connector.label} assets directly into your Vault.
        </p>
        <div
          className="px-4 py-2.5 rounded-xl mb-3"
          style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
        >
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: G.bright }}
          >
            Notify Me When Live
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[11px] font-bold"
          style={{ color: T.dim }}
        >
          Close
        </button>
      </motion.div>
    </div>,
    document.body,
  );
};

// ─── MAIN VAULT PAGE ──────────────────────────────────────────────────────────
const Vault = () => {
  const { currentUser } = useAuth();
  const { userData, patchLocalData, refreshUserData } = useUserData();
  const { toasts, add: addToast } = useToasts();

  const uid = currentUser?.uid;
  const tier = (userData?.tier || "ESSENTIAL").toUpperCase();
  const storageLimit = TIER_STORAGE[tier] || TIER_STORAGE.ESSENTIAL;
  const assetLimit = TIER_ASSET_LIMITS[tier] || TIER_ASSET_LIMITS.ESSENTIAL;

  // ── State ──────────────────────────────────────────────────────────────────
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [filterState, setFilterState] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [connectorHubOpen, setConnectorHubOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Load vault from Firestore ──────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    const vault = userData?.vault || [];
    setAssets(
      vault.map((a, i) => ({
        ...a,
        _localKey: `${a.id}_${i}`,
      })),
    );
    setLoading(false);
  }, [uid, userData?.vault]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const usedBytes = useMemo(
    () => assets.reduce((s, a) => s + (a.size || 0), 0),
    [assets],
  );

  const storagePercent = Math.min(100, (usedBytes / storageLimit) * 100);

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    let list = [...assets];

    // State filter
    if (filterState === "verified")
      list = list.filter((a) => a.status === "VERIFIED");
    else if (filterState === "unverified")
      list = list.filter((a) => !a.status || a.status === "PENDING");

    // Category filter
    if (selectedCategory !== "All")
      list = list.filter((a) => a.category === selectedCategory);

    // Search
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (a) =>
          (a.title || "").toLowerCase().includes(q) ||
          (a.category || "").toLowerCase().includes(q) ||
          (a.credentials?.issuer || "").toLowerCase().includes(q) ||
          (a.discotiveLearnId || "").toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === "newest")
      list.sort(
        (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0),
      );
    else if (sortBy === "oldest")
      list.sort(
        (a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0),
      );
    else if (sortBy === "strength") {
      const order = { Strong: 3, Medium: 2, Weak: 1 };
      list.sort((a, b) => (order[b.strength] || 0) - (order[a.strength] || 0));
    } else if (sortBy === "size")
      list.sort((a, b) => (b.size || 0) - (a.size || 0));

    // Pinned always first
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return list;
  }, [assets, filterState, selectedCategory, searchQ, sortBy]);

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleUpload = useCallback(
    async (file, form, setProgress) => {
      if (!uid) return;

      // Tier gate: asset count
      if (
        tier === "ESSENTIAL" &&
        assets.filter((a) => !a.isConnector).length >= assetLimit
      ) {
        addToast(
          `Essential plan allows ${assetLimit} assets. Upgrade to Pro.`,
          "red",
        );
        return;
      }

      // Tier gate: storage
      if (usedBytes + file.size > storageLimit) {
        addToast(
          `Insufficient storage. Upgrade to ${tier === "ESSENTIAL" ? "Pro (100MB)" : "Enterprise"}.`,
          "red",
        );
        return;
      }

      try {
        const ext = file.name.split(".").pop();
        const path = `vault/${uid}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) =>
              setProgress(
                Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
              ),
            reject,
            resolve,
          );
        });

        const url = await getDownloadURL(storageRef);

        // Generate SHA256-ish hash (lightweight ID)
        const hashBuf = await crypto.subtle.digest(
          "SHA-256",
          await file.arrayBuffer(),
        );
        const hash = Array.from(new Uint8Array(hashBuf))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .slice(0, 40);

        const newAsset = {
          id: `vault_${Date.now()}`,
          title: form.title.trim(),
          category: form.category,
          type: ext,
          url,
          storagePath: path,
          size: file.size,
          hash,
          isPublic: form.isPublic,
          pinned: false,
          status: "PENDING",
          strength: null,
          scoreYield: 0,
          credentials: form.credentials || {},
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
        };

        const updatedVault = [...(userData?.vault || []), newAsset];
        await updateDoc(doc(db, "users", uid), { vault: updatedVault });

        setAssets((prev) => [
          ...prev,
          { ...newAsset, _localKey: `${newAsset.id}_${prev.length}` },
        ]);
        patchLocalData({ vault: updatedVault });
        addToast("Asset uploaded. Pending admin verification.", "green");
      } catch (err) {
        console.error("[Vault] Upload failed:", err);
        addToast("Upload failed. Check file type and connection.", "red");
      }
    },
    [
      uid,
      userData,
      tier,
      assets,
      usedBytes,
      storageLimit,
      assetLimit,
      addToast,
      patchLocalData,
    ],
  );

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (asset) => {
      if (!uid) return;
      try {
        if (asset.storagePath) {
          try {
            await deleteObject(ref(storage, asset.storagePath));
          } catch (_) {}
        }
        const updatedVault = (userData?.vault || []).filter(
          (a) => a.id !== asset.id,
        );
        await updateDoc(doc(db, "users", uid), { vault: updatedVault });
        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        patchLocalData({ vault: updatedVault });
        if (selectedAsset?.id === asset.id) setSelectedAsset(null);
        addToast("Asset permanently deleted.", "grey");
      } catch (err) {
        addToast("Delete failed.", "red");
      }
    },
    [uid, userData, selectedAsset, addToast, patchLocalData],
  );

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleRename = useCallback(
    async (asset, newTitle) => {
      if (!uid || !newTitle.trim()) return;
      const updatedVault = (userData?.vault || []).map((a) =>
        a.id === asset.id ? { ...a, title: newTitle.trim() } : a,
      );
      await updateDoc(doc(db, "users", uid), { vault: updatedVault });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id ? { ...a, title: newTitle.trim() } : a,
        ),
      );
      setSelectedAsset((prev) =>
        prev?.id === asset.id ? { ...prev, title: newTitle.trim() } : prev,
      );
      patchLocalData({ vault: updatedVault });
      addToast("Asset renamed.", "grey");
    },
    [uid, userData, addToast, patchLocalData],
  );

  // ── Toggle visibility ─────────────────────────────────────────────────────
  const handleToggleVisibility = useCallback(
    async (asset) => {
      if (!uid) return;
      const updatedVault = (userData?.vault || []).map((a) =>
        a.id === asset.id ? { ...a, isPublic: !a.isPublic } : a,
      );
      await updateDoc(doc(db, "users", uid), { vault: updatedVault });
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id ? { ...a, isPublic: !a.isPublic } : a,
        ),
      );
      setSelectedAsset((prev) =>
        prev?.id === asset.id ? { ...prev, isPublic: !prev.isPublic } : prev,
      );
      patchLocalData({ vault: updatedVault });
      addToast(
        `Asset set to ${!asset.isPublic ? "public" : "private"}.`,
        "grey",
      );
    },
    [uid, userData, addToast, patchLocalData],
  );

  // ── Pin ───────────────────────────────────────────────────────────────────
  const handlePin = useCallback(
    async (asset) => {
      if (!uid) return;
      const updatedVault = (userData?.vault || []).map((a) =>
        a.id === asset.id ? { ...a, pinned: !a.pinned } : a,
      );
      await updateDoc(doc(db, "users", uid), { vault: updatedVault });
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, pinned: !a.pinned } : a)),
      );
      setSelectedAsset((prev) =>
        prev?.id === asset.id ? { ...prev, pinned: !prev.pinned } : prev,
      );
      patchLocalData({ vault: updatedVault });
      addToast(asset.pinned ? "Unpinned." : "Pinned to top.", "grey");
    },
    [uid, userData, addToast, patchLocalData],
  );

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = useCallback(
    (asset) => {
      if (!asset.url) {
        addToast("No downloadable file.", "red");
        return;
      }
      const a = document.createElement("a");
      a.href = asset.url;
      a.download = asset.title || "asset";
      a.target = "_blank";
      a.click();
      addToast("Download started.", "grey");
    },
    [addToast],
  );

  // ── Verified count stats ──────────────────────────────────────────────────
  const verifiedCount = assets.filter((a) => a.status === "VERIFIED").length;
  const pendingCount = assets.filter(
    (a) => !a.status || a.status === "PENDING",
  ).length;

  const isPro = tier === "PRO" || tier === "ENTERPRISE";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen pb-24 relative"
      style={{ background: V.bg, color: T.primary }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "rgba(191,162,100,0.03)" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full blur-[100px]"
          style={{ background: "rgba(139,92,246,0.02)" }}
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015]" />
      </div>

      <div className="relative z-10 max-w-[1700px] mx-auto">
        {/* ── HEADER ── */}
        <div className="px-4 md:px-8 pt-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5" style={{ color: G.base }} />
                <h1
                  className="text-3xl font-black tracking-tight"
                  style={{
                    fontFamily: "'Montserrat', sans-serif",
                    letterSpacing: "-0.03em",
                  }}
                >
                  Asset Vault
                </h1>
                {isPro && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <Crown className="w-3 h-3" style={{ color: G.bright }} />
                    <span
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: G.bright }}
                    >
                      Pro
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm" style={{ color: T.secondary }}>
                {assets.length} assets · {verifiedCount} verified ·{" "}
                {pendingCount} pending review
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div
                className="flex p-1 rounded-xl"
                style={{
                  background: V.depth,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {[
                  { key: "grid", icon: Layers },
                  { key: "list", icon: FileText },
                ].map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background:
                        viewMode === key
                          ? "rgba(255,255,255,0.08)"
                          : "transparent",
                      color: viewMode === key ? T.primary : T.dim,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>

              {/* Sidebar toggle on mobile */}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                  color: T.dim,
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {/* Connectors CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setConnectorHubOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: T.secondary,
                }}
              >
                <Link2 className="w-3.5 h-3.5" /> Connectors
              </motion.button>

              {/* Upload CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (!isPro && assets.length >= assetLimit) {
                    addToast(
                      `Upgrade to Pro to upload more than ${assetLimit} assets.`,
                      "red",
                    );
                    return;
                  }
                  setUploadOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                style={{
                  background: `linear-gradient(135deg, ${G.deep} 0%, ${G.bright} 100%)`,
                  color: "#0a0a0a",
                  boxShadow: `0 0 20px rgba(191,162,100,0.15)`,
                }}
              >
                <Upload className="w-4 h-4" /> Upload Asset
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex gap-0 md:gap-6 px-4 md:px-8">
          {/* ── LEFT SIDEBAR ── */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="shrink-0 hidden md:block"
                style={{ minWidth: 260, maxWidth: 280 }}
              >
                <div className="sticky top-6 space-y-4">
                  {/* Storage */}
                  <div
                    className="p-4 rounded-[1.25rem]"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <StorageBar
                      used={usedBytes}
                      limit={storageLimit}
                      tier={tier}
                    />

                    {!isPro && (
                      <div
                        className="mt-4 p-3 rounded-xl"
                        style={{
                          background: G.dimBg,
                          border: `1px solid ${G.border}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Crown
                            className="w-3.5 h-3.5"
                            style={{ color: G.bright }}
                          />
                          <span
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: G.bright }}
                          >
                            Upgrade to Pro
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: T.dim }}>
                          100MB storage, 50 assets, priority verification, and
                          Competitor X-Ray.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Strength Analytics */}
                  <div
                    className="p-4 rounded-[1.25rem]"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp
                        className="w-3.5 h-3.5"
                        style={{ color: G.base }}
                      />
                      <span
                        className="text-[9px] font-black uppercase tracking-widest"
                        style={{ color: T.dim }}
                      >
                        Vault Power
                      </span>
                    </div>
                    <StrengthAnalytics assets={assets} />
                  </div>

                  {/* Connectors */}
                  <div
                    className="p-4 rounded-[1.25rem]"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <ConnectorPanel
                      connectedApps={Object.keys(
                        userData?.connectors || {},
                      ).filter((k) => userData?.connectors?.[k])}
                      onConnect={() => setConnectorHubOpen(true)}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {/* Tri-state toggle */}
              <TriStateToggle value={filterState} onChange={setFilterState} />

              {/* Search */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: T.dim }}
                />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search assets, IDs, issuers..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
                  style={{
                    background: V.depth,
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: T.primary,
                  }}
                />
                {searchQ && (
                  <button
                    onClick={() => setSearchQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-3.5 h-3.5" style={{ color: T.dim }} />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none"
                  style={{
                    background: V.depth,
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: T.secondary,
                  }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="strength">By Strength</option>
                  <option value="size">By Size</option>
                </select>
                <ChevronDown
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                  style={{ color: T.dim }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-3 mb-4">
              {["All", ...ASSET_CATEGORIES.map((c) => c.key)].map((cat) => {
                const config = cat === "All" ? null : getCategoryConfig(cat);
                const CIcon = config?.icon || Layers;
                const active = selectedCategory === cat;
                const count =
                  cat === "All"
                    ? filteredAssets.length
                    : filteredAssets.filter((a) => a.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0"
                    style={{
                      background: active
                        ? config
                          ? `${config.color}15`
                          : "rgba(255,255,255,0.08)"
                        : "transparent",
                      border: `1px solid ${active ? (config ? `${config.color}35` : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.04)"}`,
                      color: active ? config?.color || T.primary : T.dim,
                    }}
                  >
                    {cat !== "All" && <CIcon className="w-3 h-3" />}
                    {cat === "All" ? "All Assets" : config?.label || cat}
                    <span className="font-mono opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Loading skeleton */}
            {loading ? (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                    : "space-y-2",
                )}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-pulse rounded-[1.25rem]",
                      viewMode === "grid" ? "aspect-[4/5]" : "h-16",
                    )}
                    style={{ background: V.surface }}
                  />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              /* Empty state */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
                style={{
                  border: "1px dashed rgba(255,255,255,0.06)",
                  borderRadius: "1.5rem",
                }}
              >
                <Database
                  className="w-16 h-16 mb-4"
                  style={{ color: "rgba(255,255,255,0.06)" }}
                />
                <h3
                  className="text-xl font-black mb-2"
                  style={{
                    color: "rgba(255,255,255,0.15)",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {searchQ
                    ? `No results for "${searchQ}"`
                    : filterState === "verified"
                      ? "No verified assets yet."
                      : "Vault is empty."}
                </h3>
                <p className="text-sm max-w-sm mb-6" style={{ color: T.dim }}>
                  {searchQ
                    ? "Try different keywords or clear the search."
                    : filterState === "verified"
                      ? "Upload assets and submit them for admin verification to build your proof-of-work."
                      : "Your proof-of-work archive is empty. Upload credentials, projects, and certificates to build an unbreakable foundation."}
                </p>
                {!searchQ && (
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                      color: G.bright,
                    }}
                  >
                    <Upload className="w-4 h-4" /> Upload First Asset
                  </button>
                )}
              </motion.div>
            ) : (
              /* Asset grid / list */
              <AnimatePresence>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
                      : "space-y-2",
                  )}
                >
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset._localKey || asset.id}
                      asset={asset}
                      onSelect={setSelectedAsset}
                      onPin={handlePin}
                      onToggleVisibility={handleToggleVisibility}
                      isSelected={selectedAsset?.id === asset.id}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ── ASSET DRAWER ── */}
      <AnimatePresence>
        {selectedAsset && (
          <>
            <motion.div
              key="drawer-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[199]"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
              onClick={() => setSelectedAsset(null)}
            />
            <AssetDrawer
              key="drawer"
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
              onDelete={handleDelete}
              onRename={handleRename}
              onToggleVisibility={handleToggleVisibility}
              onPin={handlePin}
              onDownload={handleDownload}
              onShare={(a) => setShareTarget(a)}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── UPLOAD MODAL ── */}
      <AnimatePresence>
        {uploadOpen && (
          <UploadModal
            onClose={() => setUploadOpen(false)}
            onUpload={handleUpload}
            usedBytes={usedBytes}
            tier={tier}
          />
        )}
      </AnimatePresence>

      {/* ── SHARE MODAL ── */}
      <AnimatePresence>
        {shareTarget && (
          <ShareModal
            asset={shareTarget}
            onClose={() => setShareTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── CONNECTOR HUB ── */}
      <ConnectorHub
        isOpen={connectorHubOpen}
        onClose={() => setConnectorHubOpen(false)}
        userData={userData}
        onVaultAssetAdded={(newAsset, updatedVault) => {
          setAssets((prev) => [
            ...prev,
            { ...newAsset, _localKey: `${newAsset.id}_${prev.length}` },
          ]);
          patchLocalData({ vault: updatedVault });
        }}
        addToast={addToast}
      />

      {/* ── TOAST STACK ── */}
      {createPortal(
        <div
          className="fixed bottom-5 left-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{ maxWidth: 360 }}
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold pointer-events-auto"
                style={
                  t.type === "green"
                    ? {
                        background: "#041f10",
                        borderColor: "rgba(16,185,129,0.25)",
                        color: "#4ADE80",
                      }
                    : t.type === "red"
                      ? {
                          background: "#1a0505",
                          borderColor: "rgba(239,68,68,0.25)",
                          color: "#f87171",
                        }
                      : {
                          background: V.elevated,
                          borderColor: "rgba(255,255,255,0.07)",
                          color: T.secondary,
                        }
                }
              >
                {t.type === "green" && (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Database
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: T.dim }}
                  />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default Vault;
