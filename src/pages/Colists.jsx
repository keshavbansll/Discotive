/**
 * @fileoverview Discotive Colists v2 — "The Knowledge Carousel"
 * @description Paradigm-shifted Colist experience:
 *   1. Paginated Fluid Canvas — one block per page, swipe/crossfade
 *   2. Game-Like Save States — resume from last page
 *   3. Dual-Ledger System — Colist Resonance Ring → Discotive Score
 *   4. Admin Verification Matrix — Original / Strong / Medium / Weak badges
 *   5. Forking Engine — Pro users fork Strong-rated lists
 *   6. Page-Level Applause — double-tap gold burst per page
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import {
  useParams,
  useNavigate,
  Link,
  useOutletContext,
} from "react-router-dom";
import { Helmet } from "react-helmet-async";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Cropper from "react-easy-crop";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  Crown,
  Plus,
  Search,
  Eye,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  ArrowLeft,
  Clock,
  Link2,
  Code,
  Quote,
  Minus,
  Share2,
  ChevronRight,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  X,
  Zap,
  Lock,
  Globe,
  LayoutGrid,
  List,
  Play,
  BookOpen,
  Hash,
  Sparkles,
  TrendingUp,
  FileText,
  User,
  MoreHorizontal,
  ChevronDown,
  AlertTriangle,
  GripVertical,
  LogOut,
  LayoutDashboard,
  Filter,
  Home,
  GitFork,
  Shield,
  Star,
  Award,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Heart,
  Flame,
  BarChart2,
  RefreshCw,
  Trophy,
  ArrowUpRight,
  Undo,
  Redo,
  Save,
  Cloud,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote as QuoteIcon,
  ListOrdered,
  Code as CodeIcon,
  Headphones,
  Image as ImageIcon,
  UploadCloud,
  Crop,
} from "lucide-react";
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { HexColorPicker } from "react-colorful";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import ColistsProfile from "../components/colists/ColistsProfile";

/* ─── Design Tokens ─────────────────────────────────────────────────────── */
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

/* ─── PAGE Registry ─────────────────────────────────────────────────────── */

const THEME_TEXT_COLORS = [
  "#000000", // 0: Gold -> Black Text
  "#F5F0E8", // 1: Dark Blue/Purple -> Light Text
  "#F5F0E8", // 2: Dark Gray/Black -> Light Text
  "#F5F0E8", // 3: Teal/Dark Blue -> Light Text
  "#F5F0E8", // 4: Dark Red/Purple -> Light Text
  "#F5F0E8", // 5: Dark Green -> Light Text
  "#F5F0E8", // 6: Dark Purple -> Light Text
  "#F5F0E8", // 7: Dark Navy/Purple -> Light Text
];

const PRESET_COLORS = [
  "#ffffff",
  "#F5F0E8",
  "#000000",
  "#BFA264",
  "#F87171",
  "#38bdf8",
  "#4ADE80",
  "#A855F7",
  "#FBBF24",
  "#FB7185",
  "#818CF8",
  "#C084FC",
];

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#8B7240 0%,#D4AF78 60%,#E8D5A3 100%)",
  "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
  "linear-gradient(135deg,#0a0a0a 0%,#1c1c1c 50%,#2d2d2d 100%)",
  "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)",
  "linear-gradient(135deg,#200122 0%,#6f0000 100%)",
  "linear-gradient(135deg,#004d00 0%,#006600 50%,#00a000 100%)",
  "linear-gradient(135deg,#1a0533 0%,#6b21a8 100%)",
  "linear-gradient(135deg,#16213e 0%,#0f3460 50%,#533483 100%)",
];

/* ─── Verification Tiers ─────────────────────────────────────────────────── */
const VERIFICATION_TIERS = {
  original: {
    label: "Discotive Original",
    color: G.bright,
    border: G.border,
    bg: G.dimBg,
    glow: "0 0 20px rgba(191,162,100,0.4)",
    icon: Star,
    scoreMultiplier: 2,
    desc: "Curated & verified by Discotive",
  },
  strong: {
    label: "Strong",
    color: "#4ADE80",
    border: "rgba(74,222,128,0.3)",
    bg: "rgba(74,222,128,0.08)",
    glow: "0 0 12px rgba(74,222,128,0.2)",
    icon: Award,
    scoreMultiplier: 1,
    desc: "High-signal, verified",
  },
  medium: {
    label: "Medium",
    color: T.secondary,
    border: "rgba(255,255,255,0.1)",
    bg: V.surface,
    glow: "none",
    icon: Shield,
    scoreMultiplier: 0.5,
    desc: "Reviewed, moderate signal",
  },
  weak: {
    label: "Weak",
    color: T.dim,
    border: "rgba(255,255,255,0.05)",
    bg: "transparent",
    glow: "none",
    icon: null,
    scoreMultiplier: 0,
    desc: "Low signal, no score payout",
  },
};

/* ─── Resonance Milestones ───────────────────────────────────────────────── */
// When colistScore hits these thresholds → award global Discotive pts
const RESONANCE_MILESTONES = [
  { threshold: 50, globalPts: 5 },
  { threshold: 100, globalPts: 10 },
  { threshold: 250, globalPts: 20 },
  { threshold: 500, globalPts: 35 },
  { threshold: 1000, globalPts: 50 },
];

const getNextMilestone = (score) => {
  return RESONANCE_MILESTONES.find((m) => m.threshold > (score || 0)) || null;
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  return `${base}-${Date.now().toString(36)}`;
};

const estimateReadTime = (blocks = []) => {
  const words = blocks.reduce((acc, b) => {
    const text = [b.content, b.title, b.description].filter(Boolean).join(" ");
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.ceil(words / 200));
};

const createBlockId = () =>
  `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

/* ─── Canvas Cropping Utility ────────────────────────────────────────────── */
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Exact 1280x720 Target Size
  canvas.width = 1280;
  canvas.height = 720;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    1280,
    720,
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      "image/jpeg",
      0.85, // High quality compression
    );
  });
};

/* ─── Progress Tracking (localStorage) ─────────────────────────────────── */
const PROGRESS_KEY = (uid, colistId) => `colist_progress_${uid}_${colistId}`;

const getProgress = (uid, colistId) => {
  if (!uid || !colistId) return { pageIndex: 0, pagesRead: [] };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(uid, colistId));
    return raw ? JSON.parse(raw) : { pageIndex: 0, pagesRead: [] };
  } catch {
    return { pageIndex: 0, pagesRead: [] };
  }
};

const saveProgress = (uid, colistId, pageIndex, pagesRead) => {
  if (!uid || !colistId) return;
  try {
    localStorage.setItem(
      PROGRESS_KEY(uid, colistId),
      JSON.stringify({ pageIndex, pagesRead, ts: Date.now() }),
    );
  } catch {
    // silently fail
  }
};

/* ─── Resonance Ring ─────────────────────────────────────────────────────── */
const ResonanceRing = memo(
  ({ colistScore = 0, size = 48, showLabel = false, onClick }) => {
    const next = getNextMilestone(colistScore);

    const prevMilestone = RESONANCE_MILESTONES.slice()
      .reverse()
      .find((m) => m.threshold <= (colistScore || 0));
    const pct = next
      ? Math.min(
          100,
          ((colistScore - (prevMilestone?.threshold || 0)) /
            (next.threshold - (prevMilestone?.threshold || 0))) *
            100,
        )
      : 100;

    const r = (size - 5) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - pct / 100);

    return (
      <motion.div
        whileHover={onClick ? { scale: 1.08 } : {}}
        onClick={onClick}
        className={cn(
          "relative flex flex-col items-center gap-1",
          onClick && "cursor-pointer",
        )}
      >
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(191,162,100,0.12)"
              strokeWidth={4.5}
            />
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={G.bright}
              strokeWidth={4.5}
              strokeDasharray={circ}
              strokeLinecap="round"
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: `drop-shadow(0 0 4px ${G.bright})` }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[9px] font-black font-mono"
              style={{ color: G.bright }}
            >
              {colistScore >= 1000
                ? `${(colistScore / 1000).toFixed(1)}K`
                : colistScore}
            </span>
          </div>
        </div>
        {showLabel && (
          <div className="text-center">
            <p
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: G.base }}
            >
              Resonance
            </p>
            {next && (
              <p className="text-[7px] font-mono" style={{ color: T.dim }}>
                {next.threshold - colistScore} → +{next.globalPts}pts
              </p>
            )}
          </div>
        )}
      </motion.div>
    );
  },
);

/* ─── Verification Badge ─────────────────────────────────────────────────── */
const VerificationBadge = memo(({ tier, compact = false }) => {
  if (!tier || !VERIFICATION_TIERS[tier]) return null;
  const {
    label,
    color,
    border,
    bg,
    glow,
    icon: Icon,
  } = VERIFICATION_TIERS[tier];
  if (tier === "weak") return null;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border"
        title={label}
        style={{ background: bg, borderColor: border, boxShadow: glow }}
      >
        {Icon && <Icon size={8} style={{ color }} />}
        <span
          className="text-[7px] font-black uppercase tracking-wider"
          style={{ color }}
        >
          {tier === "original" ? "Original" : label}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
      style={{ background: bg, borderColor: border, boxShadow: glow }}
    >
      {Icon && <Icon size={11} style={{ color }} />}
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
});

/* ─── Gold Burst Applause Animation ──────────────────────────────────────── */
const GoldBurst = memo(({ x, y, onDone }) => {
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      angle: (i / 12) * 360,
      distance: 30 + Math.random() * 40,
      size: 3 + Math.random() * 4,
    })),
  );

  useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        zIndex: 99999,
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 60, y: 60, scale: 1, opacity: 1 }}
          animate={{
            x: 60 + Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: 60 + Math.sin((p.angle * Math.PI) / 180) * p.distance,
            scale: 0,
            opacity: 0,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: G.bright,
          }}
        />
      ))}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "absolute",
          left: 44,
          top: 44,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `2px solid ${G.bright}`,
        }}
      />
    </div>
  );
});

/* ─── Block Renderers ─────────────────────────────────────────────────────── */
const InsightBlock = memo(({ block }) => (
  <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
    <div className="flex items-center gap-2 mb-6">
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center"
        style={{ background: G.dimBg }}
      >
        <Zap size={12} style={{ color: G.bright }} />
      </div>
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: G.base }}
      >
        Insight
      </span>
    </div>
    {block.title && (
      <h2
        className="font-display font-black leading-tight mb-6"
        style={{
          fontSize: "clamp(1.6rem,4vw,3rem)",
          color: T.primary,
          letterSpacing: "-0.03em",
        }}
      >
        {block.title}
      </h2>
    )}
    <div
      className="text-lg md:text-xl leading-relaxed font-light max-w-3xl prose-invert"
      style={{ color: T.secondary }}
      dangerouslySetInnerHTML={{ __html: block.content }}
    />
  </div>
));

const QuoteBlock = memo(({ block }) => (
  <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
    <div className="flex items-center gap-2 mb-6">
      <Quote size={12} style={{ color: "#a855f7" }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "#a855f7" }}
      >
        Quote
      </span>
    </div>
    <div style={{ borderLeft: `3px solid #a855f7`, paddingLeft: 32 }}>
      <blockquote
        className="font-display font-black leading-tight mb-6"
        style={{
          fontSize: "clamp(1.8rem,4.5vw,3.5rem)",
          color: T.primary,
          letterSpacing: "-0.04em",
          fontStyle: "italic",
        }}
      >
        "{block.content}"
      </blockquote>
      {block.author && (
        <p
          className="text-sm font-bold uppercase tracking-widest"
          style={{ color: "#a855f7" }}
        >
          — {block.author}
        </p>
      )}
    </div>
  </div>
));

const LinkBlock = memo(({ block }) => {
  const hostname = useMemo(() => {
    try {
      return new URL(block.url || "").hostname.replace("www.", "");
    } catch {
      return block.url || "";
    }
  }, [block.url]);
  return (
    <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6">
        <Link2 size={12} style={{ color: "#38bdf8" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#38bdf8" }}
        >
          Resource
        </span>
      </div>
      <div
        className="max-w-2xl p-8 rounded-3xl border"
        style={{
          background: "rgba(56,189,248,0.05)",
          borderColor: "rgba(56,189,248,0.2)",
        }}
      >
        <div className="flex items-start gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(56,189,248,0.12)" }}
          >
            <Link2 size={22} style={{ color: "#38bdf8" }} />
          </div>
          <div className="flex-1 min-w-0">
            {block.title && (
              <h3
                className="text-xl font-black mb-2"
                style={{ color: T.primary }}
              >
                {block.title}
              </h3>
            )}
            {hostname && (
              <p className="text-xs font-mono mb-3" style={{ color: T.dim }}>
                {hostname}
              </p>
            )}
            {block.description && (
              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: T.secondary }}
              >
                {block.description}
              </p>
            )}
            {block.url && (
              <a
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full"
                style={{
                  background: "rgba(56,189,248,0.12)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56,189,248,0.25)",
                }}
              >
                Open <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const CodeBlock = memo(({ block }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [block.content]);

  return (
    <div className="h-full flex flex-col justify-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6">
        <Code size={12} style={{ color: "#4ADE80" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#4ADE80" }}
        >
          Code
        </span>
      </div>
      <div
        className="max-w-3xl rounded-2xl overflow-hidden"
        style={{
          background: "#0d1117",
          border: "1px solid rgba(74,222,128,0.2)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{
            background: "rgba(74,222,128,0.06)",
            borderBottom: "1px solid rgba(74,222,128,0.12)",
          }}
        >
          <div className="flex items-center gap-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{
                  background:
                    i === 0 ? "#F87171" : i === 1 ? "#FBBF24" : "#4ADE80",
                  opacity: 0.7,
                }}
              />
            ))}
            <span
              className="text-[9px] font-black uppercase tracking-widest ml-2"
              style={{ color: "#4ADE80" }}
            >
              {block.language || "code"}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
            style={{ color: copied ? "#4ADE80" : "rgba(255,255,255,0.3)" }}
          >
            {copied ? (
              <>
                <Check size={10} /> Copied
              </>
            ) : (
              <>
                <Copy size={10} /> Copy
              </>
            )}
          </button>
        </div>
        <pre
          className="p-5 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar"
          style={{ color: "#e6edf3", margin: 0, maxHeight: "50vh" }}
        >
          <code>{block.content}</code>
        </pre>
      </div>
    </div>
  );
});

const VideoBlock = memo(({ block }) => {
  const [playing, setPlaying] = useState(false);
  const ytId =
    block.youtubeId || block.url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];

  if (!ytId) return null;
  return (
    <div className="h-full flex flex-col justify-center items-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6 self-start">
        <Youtube size={12} style={{ color: "#F87171" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#F87171" }}
        >
          Video
        </span>
      </div>
      {block.title && (
        <h3
          className="text-base font-bold mb-6 self-start max-w-2xl"
          style={{ color: "var(--editor-text-color, inherit)" }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{
          aspectRatio: "16/9",
          border: "1px solid rgba(248,113,113,0.2)",
        }}
      >
        {!playing ? (
          <div
            className="relative w-full h-full cursor-pointer group/vid"
            onClick={() => setPlaying(true)}
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute top-4 right-4 bg-black rounded-lg p-2 z-20 group-hover/vid:opacity-0 transition-opacity duration-300 shadow-lg border border-white/5 pointer-events-none">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient
                    id="gold-grad-vid"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#8B7240" />
                    <stop offset="50%" stopColor="#D4AF78" />
                    <stop offset="100%" stopColor="#E8D5A3" />
                  </linearGradient>
                </defs>
                <path
                  d="M21.582 6.186a2.665 2.665 0 0 0-1.876-1.886C18.05 3.843 12 3.843 12 3.843s-6.05 0-7.706.457A2.665 2.665 0 0 0 2.418 6.186C1.961 7.843 1.961 12 1.961 12s0 4.157.457 5.814a2.665 2.665 0 0 0 1.876 1.886C5.95 20.157 12 20.157 12 20.157s6.05 0 7.706-.457a2.665 2.665 0 0 0 1.876-1.886c.457-1.657.457-5.814.457-5.814s0-4.157-.457-5.814Z"
                  fill="url(#gold-grad-vid)"
                />
                <path
                  d="M9.98 15.502v-7.004l6.236 3.502-6.236 3.502Z"
                  fill="#000"
                />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-30">
              <motion.div
                whileHover={{ scale: 1.12 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(248,113,113,0.9)",
                  boxShadow: "0 0 50px rgba(248,113,113,0.5)",
                }}
              >
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-2" />
              </motion.div>
            </div>
          </div>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0`}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
          />
        )}
      </div>
    </div>
  );
});

const DividerBlock = memo(() => (
  <div className="h-full flex flex-col items-center justify-center gap-4">
    <div className="flex items-center gap-4">
      <div
        className="w-32 h-px"
        style={{
          background:
            "linear-gradient(to right,transparent,rgba(191,162,100,0.3),transparent)",
        }}
      />
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: G.base, opacity: 0.6 }}
      />
      <div
        className="w-32 h-px"
        style={{
          background:
            "linear-gradient(to left,transparent,rgba(191,162,100,0.3),transparent)",
        }}
      />
    </div>
    <p
      className="text-xs font-bold uppercase tracking-widest"
      style={{ color: T.dim }}
    >
      Section Break
    </p>
  </div>
));

const PodcastBlock = memo(({ block }) => {
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let parsed = rawUrl;

    // If it's already an embed format, return it directly
    if (parsed.includes("/embed/")) return parsed;

    // Convert standard Spotify link to embed
    if (parsed.includes("open.spotify.com")) {
      parsed = parsed.replace("open.spotify.com/", "open.spotify.com/embed/");
    }
    // Convert standard Apple link to embed
    if (
      parsed.includes("podcasts.apple.com") &&
      !parsed.includes("embed.podcasts.apple.com")
    ) {
      parsed = parsed.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    }
    return parsed;
  };

  const embedUrl = getEmbedUrl(block.url);
  if (!embedUrl) return null;

  const isSpotify = embedUrl.includes("spotify");

  return (
    <div className="h-full flex flex-col justify-center items-center px-8 md:px-16 py-12">
      <div className="flex items-center gap-2 mb-6 self-start">
        <Headphones size={12} style={{ color: "#A855F7" }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#A855F7" }}
        >
          Podcast Episode
        </span>
      </div>
      {block.title && (
        <h3
          className="text-base font-bold mb-6 self-start max-w-2xl"
          style={{ color: "var(--editor-text-color, inherit)" }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(168,85,247,0.2)" }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height={isSpotify ? "152" : "175"}
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          style={{ background: "transparent" }}
        />
      </div>
    </div>
  );
});

const PodcastNodeView = ({ node, updateAttributes, deleteNode }) => {
  const [editingLink, setEditingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [playing, setPlaying] = useState(false);
  const { url, title } = node.attrs;

  const handleUpdate = () => {
    if (!newLink.trim()) return setEditingLink(false);

    // If user pasted an iframe, extract just the src
    let finalUrl = newLink.trim();
    const iframeMatch = finalUrl.match(/<iframe.*?src=["'](.*?)["']/i);
    if (iframeMatch) {
      finalUrl = iframeMatch[1];
    }

    updateAttributes({ url: finalUrl });
    setEditingLink(false);
  };

  const isSpotify = url?.includes("spotify");

  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let parsed = rawUrl;
    if (parsed.includes("/embed/")) return parsed;
    if (parsed.includes("open.spotify.com")) {
      parsed = parsed.replace("open.spotify.com/", "open.spotify.com/embed/");
    }
    if (
      parsed.includes("podcasts.apple.com") &&
      !parsed.includes("embed.podcasts.apple.com")
    ) {
      parsed = parsed.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    }
    return parsed;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <NodeViewWrapper className="my-8" data-drag-handle>
      <div
        className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden group border border-white/10 shadow-2xl bg-[#0A0A0A] p-4"
        onMouseLeave={() => setPlaying(false)}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            width="100%"
            height={isSpotify ? "152" : "175"}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        ) : (
          <div className="w-full h-[152px] bg-[#111] flex flex-col items-center justify-center gap-3 text-white/50">
            <Headphones size={32} className="opacity-50" />
            <span className="text-xs font-bold uppercase tracking-widest">
              No Podcast Linked
            </span>
          </div>
        )}

        {!playing && (
          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm z-30">
            <button
              onClick={deleteNode}
              className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30 shadow-lg"
            >
              <X size={20} />
            </button>

            {embedUrl && (
              <button
                onClick={() => setPlaying(true)}
                className="w-16 h-16 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] flex items-center justify-center hover:bg-[#4ADE80] hover:text-black transition-all border border-[#4ADE80]/30 hover:scale-110 shadow-[0_0_30px_rgba(74,222,128,0.3)]"
              >
                <Play size={28} className="ml-1" fill="currentColor" />
              </button>
            )}

            <button
              onClick={() => {
                setEditingLink(true);
                setNewLink(url || "");
              }}
              className="w-12 h-12 rounded-full bg-[#A855F7]/20 text-[#A855F7] flex items-center justify-center hover:bg-[#A855F7] hover:text-white transition-all border border-[#A855F7]/30 shadow-lg"
            >
              <Link2 size={20} />
            </button>
          </div>
        )}

        <AnimatePresence>
          {editingLink && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 flex items-center gap-3"
            >
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Paste Spotify or Apple Podcast link..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
              />
              <button
                onClick={handleUpdate}
                className="px-6 py-3 rounded-xl text-xs font-black text-black bg-[#A855F7]"
              >
                Update
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <textarea
        value={title}
        onChange={(e) => updateAttributes({ title: e.target.value })}
        placeholder="Episode Takeaway..."
        className="mt-3 text-center font-bold text-sm bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-white/30 outline-none transition-all px-4 py-1 w-full resize-none overflow-hidden"
        style={{ color: "var(--editor-text-color)" }}
        rows={1}
      />
    </NodeViewWrapper>
  );
};

const EnhancedPodcast = Node.create({
  name: "enhancedPodcast",
  group: "block",
  atom: true,
  addAttributes() {
    return { url: { default: "" }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-podcast-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-podcast-embed": "" }, HTMLAttributes),
      HTMLAttributes.title,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PodcastNodeView);
  },
});

const PageBlockRenderer = memo(({ block }) => {
  switch (block.type) {
    case "insight":
      return <InsightBlock block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "link":
      return <LinkBlock block={block} />;
    case "code":
      return <CodeBlock block={block} />;
    case "video":
      return <VideoBlock block={block} />;
    case "podcast":
      return <PodcastBlock block={block} />;
    case "divider":
      return <DividerBlock />;
    default:
      return null;
  }
});

/* ─── Full-Screen Paginated Reader ───────────────────────────────────────── */
const ColistReader = memo(({ colist, onBack, currentUser }) => {
  const uid = currentUser?.uid;
  const blocks = useMemo(
    () =>
      (colist.blocks || []).filter(
        (b) => b.type !== "divider" || colist.blocks.indexOf(b) > 0,
      ),
    [colist.blocks],
  );
  const totalPages = blocks.length;

  const initProgress = useMemo(
    () => getProgress(uid, colist.id),
    [uid, colist.id],
  );
  const [pageIndex, setPageIndex] = useState(initProgress.pageIndex || 0);
  const [pagesRead, setPagesRead] = useState(() => {
    const initial = initProgress.pagesRead || [];
    const startIdx = initProgress.pageIndex || 0;
    return initial.includes(startIdx) ? initial : [...initial, startIdx];
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(1);
  const [bursts, setBursts] = useState([]);
  const [applauseCounts, setApplauseCounts] = useState(
    colist.pageApplause || {},
  );
  const [hasApplauded, setHasApplauded] = useState({});
  const [shareToast, setShareToast] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const localScoreRef = useRef(colist.colistScore || 0);
  const lastTapRef = useRef(0);
  const containerRef = useRef(null);

  // Swipe gesture tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const safePage = Math.min(Math.max(0, pageIndex), totalPages - 1);
  const block = blocks[safePage];

  const markPageRead = useCallback(
    (idx) => {
      setPagesRead((prev) => {
        if (prev.includes(idx)) return prev;
        const next = [...prev, idx];
        saveProgress(uid, colist.id, idx, next);
        return next;
      });
    },
    [uid, colist.id],
  );

  // Fire view increment on mount
  useEffect(() => {
    updateDoc(doc(db, "colists", colist.id), { viewCount: increment(1) }).catch(
      () => {},
    );
  }, [colist.id]);

  // Persist progress on every page change
  useEffect(() => {
    saveProgress(uid, colist.id, safePage, pagesRead);
  }, [safePage, pagesRead, uid, colist.id]);

  const goTo = useCallback(
    (idx, dir = 1) => {
      if (idx < 0 || idx >= totalPages) return;
      setDirection(dir);
      setPageIndex(idx);
      markPageRead(idx);
    },
    [totalPages, markPageRead],
  );

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (dy > 60 || Math.abs(dx) < 50) return; // vertical scroll win
    if (dx < -50) goTo(safePage + 1, 1);
    if (dx > 50) goTo(safePage - 1, -1);
  };

  // Double-tap applause
  const handleDoubleTap = useCallback(
    (e) => {
      const now = Date.now();
      if (now - lastTapRef.current < 350) {
        if (hasApplauded[safePage]) return;
        const { clientX, clientY } = e.touches?.[0] || e;
        setBursts((prev) => [
          ...prev,
          { id: Date.now(), x: clientX, y: clientY },
        ]);
        setHasApplauded((prev) => ({ ...prev, [safePage]: true }));
        setApplauseCounts((prev) => ({
          ...prev,
          [safePage]: (prev[safePage] || 0) + 1,
        }));
        localScoreRef.current += 1;
        const claimedMilestone = colist.colistScoreMilestone || 0;
        const crossedMilestone = RESONANCE_MILESTONES.find(
          (m) =>
            m.threshold > claimedMilestone &&
            localScoreRef.current >= m.threshold,
        );
        updateDoc(doc(db, "colists", colist.id), {
          [`pageApplause.${safePage}`]: increment(1),
          colistScore: increment(1),
          ...(crossedMilestone
            ? { colistScoreMilestone: crossedMilestone.threshold }
            : {}),
        }).catch(() => {});
        if (crossedMilestone) {
          setMilestoneToast(
            `🏆 Milestone ${crossedMilestone.threshold} reached! +${crossedMilestone.globalPts} pts → Discotive Score`,
          );
          setTimeout(() => setMilestoneToast(null), 4000);
        }
      }
      lastTapRef.current = now;
    },
    [safePage, hasApplauded, colist.id, colist.colistScoreMilestone],
  );

  const handleShare = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/colists/${colist.slug}`)
      .catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2200);
  };

  const handleAudio = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    if (!block) return;
    const text = [
      block.title,
      block.content,
      block.author ? `— ${block.author}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [block, isSpeaking]);

  const handleSave = async () => {
    if (!currentUser || isSaved) return;
    setIsSaved(true);
    try {
      const entry = {
        id: `colist_${colist.id}_${Date.now().toString(36)}`,
        type: "Colist",
        name: colist.title,
        status: "VERIFIED",
        source: "colist",
        colistId: colist.id,
        savedAt: new Date().toISOString(),
        pinnedPage: safePage,
        pinnedColistId: colist.id,
      };
      await updateDoc(doc(db, "users", currentUser.uid), {
        vault: arrayUnion(entry),
      });
      // Award resonance to author
      if (colist.authorId !== currentUser.uid) {
        await updateDoc(doc(db, "colists", colist.id), {
          colistScore: increment(3),
          saveCount: increment(1),
        });
      }
    } catch {
      setIsSaved(false);
    }
  };

  const variants = {
    enter: (d) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d) => ({ x: d < 0 ? "100%" : "-100%", opacity: 0 }),
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 flex flex-col",
        isFullscreen ? "z-[9999]" : "z-[500]",
      )}
      style={{ background: V.bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient Background per block type */}
      <div className="absolute inset-0 pointer-events-none">
        {block?.type === "insight" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 20% 50%, rgba(191,162,100,0.08) 0%, transparent 65%)`,
            }}
          />
        )}
        {block?.type === "quote" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 80% 30%, rgba(168,85,247,0.08) 0%, transparent 65%)`,
            }}
          />
        )}
        {block?.type === "link" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 60% 60%, rgba(56,189,248,0.06) 0%, transparent 65%)`,
            }}
          />
        )}
        {block?.type === "video" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 50% 40%, rgba(248,113,113,0.06) 0%, transparent 65%)`,
            }}
          />
        )}
        {block?.type === "code" && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 70%, rgba(74,222,128,0.05) 0%, transparent 65%)`,
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, ${V.bg}80 0%, transparent 30%, transparent 70%, ${V.bg} 100%)`,
          }}
        />
      </div>

      {/* Top Bar */}
      <div
        className="relative z-20 flex items-center justify-between px-5 md:px-8 py-4 shrink-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `${V.bg}CC`,
          backdropFilter: "blur(20px)",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: T.dim,
          }}
        >
          <ArrowLeft size={11} /> Back
        </motion.button>

        <div className="flex flex-col items-center">
          <span className="text-[11px] font-black" style={{ color: T.primary }}>
            {colist.title}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            {colist.verificationTier && colist.verificationTier !== "weak" && (
              <VerificationBadge tier={colist.verificationTier} compact />
            )}
            <span className="text-[9px] font-mono" style={{ color: T.dim }}>
              @{colist.authorUsername}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="p-2 rounded-full transition-all"
            style={{
              background: isSaved
                ? "rgba(74,222,128,0.12)"
                : "rgba(255,255,255,0.05)",
              color: isSaved ? "#4ADE80" : T.dim,
            }}
          >
            {isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-full transition-all"
            style={{
              background: shareToast
                ? "rgba(74,222,128,0.12)"
                : "rgba(255,255,255,0.05)",
              color: shareToast ? "#4ADE80" : T.dim,
            }}
          >
            {shareToast ? <Check size={15} /> : <Share2 size={15} />}
          </button>
          {"speechSynthesis" in window && (
            <button
              onClick={handleAudio}
              className="p-2 rounded-full transition-all"
              title={isSpeaking ? "Stop narration" : "Listen to this page"}
              style={{
                background: isSpeaking
                  ? "rgba(74,222,128,0.12)"
                  : "rgba(255,255,255,0.05)",
                color: isSpeaking ? "#4ADE80" : T.dim,
              }}
            >
              <Play
                size={15}
                style={{ fill: isSpeaking ? "#4ADE80" : "none" }}
              />
            </button>
          )}
          {colist.authorId === uid && (
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className="p-2 rounded-full transition-all"
              title="Page analytics"
              style={{
                background: showAnalytics ? G.dimBg : "rgba(255,255,255,0.05)",
                color: showAnalytics ? G.bright : T.dim,
              }}
            >
              <BarChart2 size={15} />
            </button>
          )}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-2 rounded-full transition-all hidden md:block"
            style={{ background: "rgba(255,255,255,0.05)", color: T.dim }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Page Area */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={handleDoubleTap}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={safePage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "tween",
              ease: [0.22, 1, 0.36, 1],
              duration: 0.38,
            }}
            className="absolute inset-0 flex flex-col"
          >
            {block && <PageBlockRenderer block={block} />}
          </motion.div>
        </AnimatePresence>

        {/* Desktop Navigation Arrows */}
        <button
          onClick={() => goTo(safePage - 1, -1)}
          disabled={safePage === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border hidden md:flex items-center justify-center transition-all disabled:opacity-20"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
            color: T.dim,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => goTo(safePage + 1, 1)}
          disabled={safePage === totalPages - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border hidden md:flex items-center justify-center transition-all disabled:opacity-20"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: "rgba(255,255,255,0.08)",
            color: T.dim,
          }}
        >
          <ChevronRight size={20} />
        </button>

        {/* Applause indicator */}
        {(applauseCounts[safePage] || 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
          >
            <Heart size={10} style={{ color: G.bright }} />
            <span
              className="text-[10px] font-black"
              style={{ color: G.bright }}
            >
              {applauseCounts[safePage]}
            </span>
          </motion.div>
        )}

        {/* Double tap hint (first 2 pages only) */}
        {safePage < 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 2 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-center md:hidden"
            style={{ color: T.dim }}
          >
            Double-tap to applaud this page
          </motion.div>
        )}
      </div>

      {/* Bottom Progress Bar */}
      <div
        className="relative z-20 px-5 md:px-8 pb-6 pt-3 shrink-0"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: `${V.bg}CC`,
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 flex items-center gap-1">
            {blocks.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i, i > safePage ? 1 : -1)}
                className="flex-1 rounded-full transition-all"
                style={{
                  height: i === safePage ? 4 : 2,
                  background: pagesRead.includes(i)
                    ? G.bright
                    : i === safePage
                      ? G.base
                      : "rgba(255,255,255,0.1)",
                  opacity: i === safePage ? 1 : 0.7,
                }}
              />
            ))}
          </div>
          <span
            className="text-[9px] font-black font-mono shrink-0"
            style={{ color: T.dim }}
          >
            {safePage + 1}/{totalPages}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              {pagesRead.length}/{totalPages} Read
            </span>
            {pagesRead.length === totalPages && (
              <span
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(74,222,128,0.12)",
                  color: "#4ADE80",
                  border: "1px solid rgba(74,222,128,0.25)",
                }}
              >
                Complete
              </span>
            )}
          </div>

          {/* Swipe hint on mobile */}
          <p
            className="text-[9px] font-mono md:hidden"
            style={{ color: T.dim }}
          >
            ← swipe →
          </p>
        </div>
      </div>

      {/* Gold Bursts */}
      {bursts.map((b) => (
        <GoldBurst
          key={b.id}
          x={b.x}
          y={b.y}
          onDone={() => setBursts((prev) => prev.filter((p) => p.id !== b.id))}
        />
      ))}

      {/* Milestone Toast */}
      <AnimatePresence>
        {milestoneToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[99998] px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
            style={{
              background: V.elevated,
              border: `1px solid ${G.border}`,
              boxShadow: `0 0 30px rgba(191,162,100,0.3)`,
              backdropFilter: "blur(20px)",
            }}
          >
            <Zap size={14} style={{ color: G.bright, flexShrink: 0 }} />
            <span className="text-xs font-black" style={{ color: T.primary }}>
              {milestoneToast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Creator Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && colist.authorId === uid && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed bottom-0 left-0 right-0 z-[9990] rounded-t-3xl p-6"
            style={{
              background: V.depth,
              border: "1px solid rgba(255,255,255,0.06)",
              maxHeight: "50vh",
              backdropFilter: "blur(30px)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={14} style={{ color: G.bright }} />
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: T.primary }}
                >
                  Page Analytics
                </span>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="p-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: T.dim }}
              >
                <X size={13} />
              </button>
            </div>
            <p
              className="text-[9px] font-bold uppercase tracking-widest mb-4"
              style={{ color: T.dim }}
            >
              Applause per page — drop-off signal
            </p>
            <div className="flex items-end gap-1.5 overflow-x-auto hide-scrollbar pb-2">
              {blocks.map((_, i) => {
                const count =
                  (colist.pageApplause || {})[i] || applauseCounts[i] || 0;
                const maxCount = Math.max(
                  1,
                  ...blocks.map((__, j) => (colist.pageApplause || {})[j] || 0),
                );
                const pct = Math.max(4, (count / maxCount) * 100);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1 shrink-0"
                    style={{ minWidth: 28 }}
                  >
                    <span
                      className="text-[7px] font-mono"
                      style={{ color: T.dim }}
                    >
                      {count}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      className="w-5 rounded-t-sm"
                      style={{
                        background: i === safePage ? G.bright : `${G.base}60`,
                        minHeight: 4,
                        maxHeight: 80,
                        height: `${pct}%`,
                      }}
                    />
                    <span
                      className="text-[7px] font-mono"
                      style={{ color: i === safePage ? G.bright : T.dim }}
                    >
                      P{i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              className="mt-4 flex items-center gap-4 pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div>
                <p
                  className="text-[8px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Total Resonance
                </p>
                <p className="text-lg font-black" style={{ color: G.bright }}>
                  {colist.colistScore || 0}
                </p>
              </div>
              <div>
                <p
                  className="text-[8px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Views
                </p>
                <p className="text-lg font-black" style={{ color: T.primary }}>
                  {colist.viewCount || 0}
                </p>
              </div>
              <div>
                <p
                  className="text-[8px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Saves
                </p>
                <p className="text-lg font-black" style={{ color: T.primary }}>
                  {colist.saveCount || 0}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ─── Colist Card (Feed) ─────────────────────────────────────────────────── */
const ColistCard = memo(({ colist, view, onRead, progress }) => {
  const blockCount = (colist.blocks || []).filter(
    (b) => b.type !== "divider",
  ).length;
  const mins = estimateReadTime(colist.blocks || []);
  const resumeIndex = progress?.pageIndex || 0;
  const pagesRead = progress?.pagesRead || [];
  const hasProgress = pagesRead.length > 0 && pagesRead.length < blockCount;
  const isComplete = pagesRead.length >= blockCount && blockCount > 0;
  const progressPct =
    blockCount > 0 ? (pagesRead.length / blockCount) * 100 : 0;

  const isOriginal = colist.verificationTier === "original";

  if (view === "list") {
    return (
      <motion.div
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => onRead(colist)}
        className="group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all relative overflow-hidden"
        style={{
          background: V.surface,
          border: `1px solid ${isOriginal ? G.border : "rgba(255,255,255,0.05)"}`,
          boxShadow: isOriginal ? `0 0 20px rgba(191,162,100,0.08)` : "none",
        }}
      >
        {isOriginal && (
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 0% 50%, rgba(191,162,100,0.08) 0%, transparent 70%)",
            }}
          />
        )}
        <div
          className="shrink-0 rounded-xl w-14 h-14 flex items-center justify-center overflow-hidden relative"
          style={{
            background: colist.coverUrl
              ? "#111"
              : colist.coverGradient || COVER_GRADIENTS[0],
          }}
        >
          {colist.coverUrl && (
            <img
              src={colist.coverUrl}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              alt=""
            />
          )}
          <BookOpen
            size={18}
            className="relative z-10"
            style={{ color: "rgba(255,255,255,0.6)" }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3
              className="text-sm font-black truncate"
              style={{ color: T.primary }}
            >
              {colist.title}
            </h3>
            {colist.verificationTier && colist.verificationTier !== "weak" && (
              <VerificationBadge tier={colist.verificationTier} compact />
            )}
          </div>
          <p className="text-xs truncate mb-1.5" style={{ color: T.secondary }}>
            {colist.description}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono" style={{ color: T.dim }}>
              @{colist.authorUsername}
            </span>
            <span
              className="text-[9px] font-mono flex items-center gap-1"
              style={{ color: T.dim }}
            >
              <Clock size={8} /> {mins}m
            </span>
            <span
              className="text-[9px] font-mono flex items-center gap-1"
              style={{ color: T.dim }}
            >
              <Eye size={8} /> {colist.viewCount || 0}
            </span>
          </div>
          {/* Progress bar */}
          {(hasProgress || isComplete) && (
            <div className="mt-2 flex items-center gap-2">
              <div
                className="flex-1 h-1 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    background: isComplete ? "#4ADE80" : G.bright,
                  }}
                />
              </div>
              <span
                className="text-[8px] font-black"
                style={{ color: isComplete ? "#4ADE80" : G.bright }}
              >
                {isComplete ? "✓ Done" : `Pg ${resumeIndex + 1}`}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <ResonanceRing colistScore={colist.colistScore || 0} size={36} />
          <span
            className="text-[7px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Resonance
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onRead(colist)}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer relative"
      style={{
        background: V.surface,
        border: `1px solid ${isOriginal ? G.border : "rgba(255,255,255,0.05)"}`,
        boxShadow: isOriginal ? `0 0 30px rgba(191,162,100,0.1)` : "none",
      }}
    >
      {/* Cover */}
      <div
        className="relative h-28 shrink-0 flex items-end justify-between p-3 overflow-hidden"
        style={{
          background: colist.coverUrl
            ? "#111"
            : colist.coverGradient || COVER_GRADIENTS[0],
        }}
      >
        {colist.coverUrl && (
          <img
            src={colist.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen"
          />
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[1]"
          style={{ background: "rgba(0,0,0,0.4)" }}
        />
        {isOriginal && (
          <motion.div
            animate={{ opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              backgroundImage:
                "url(https://grainy-gradients.vercel.app/noise.svg)",
              mixBlendMode: "overlay",
            }}
          />
        )}
        {isOriginal && (
          <motion.div
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none z-[1] rounded-t-2xl"
            style={{
              border: `1px solid ${G.bright}`,
              boxShadow: `inset 0 0 20px rgba(212,175,120,0.2)`,
            }}
          />
        )}
        <div className="relative z-10 flex flex-wrap gap-1">
          {(colist.tags || []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,0,0,0.45)",
                color: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(4px)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div
          className="relative z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold"
          style={{
            background: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
          }}
        >
          <BookOpen size={8} /> {blockCount}
        </div>
        {/* Progress overlay */}
        {(hasProgress || isComplete) && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-none"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${progressPct}%`,
                background: isComplete ? "#4ADE80" : G.bright,
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-black leading-snug line-clamp-2 flex-1"
            style={{ color: T.primary }}
          >
            {colist.title}
          </h3>
          <ResonanceRing colistScore={colist.colistScore || 0} size={32} />
        </div>

        {colist.verificationTier && colist.verificationTier !== "weak" && (
          <VerificationBadge tier={colist.verificationTier} compact />
        )}

        {colist.description && (
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: T.secondary }}
          >
            {colist.description}
          </p>
        )}

        <div
          className="flex items-center justify-between mt-auto pt-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[7px] font-black"
              style={{
                background: G.dimBg,
                border: `1px solid ${(colist.colistScore || 0) >= 100 ? G.bright : G.border}`,
                color: G.base,
                boxShadow:
                  (colist.colistScore || 0) >= 100
                    ? `0 0 5px ${G.bright}`
                    : "none",
              }}
            >
              {colist.authorAvatar ? (
                <img
                  src={colist.authorAvatar}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                colist.authorName?.charAt(0) || "O"
              )}
            </div>
            <span
              className="text-[9px] font-bold truncate max-w-[70px]"
              style={{ color: T.dim }}
            >
              @{colist.authorUsername || "operator"}
            </span>
            {(colist.colistScore || 0) >= 100 && (
              <span
                className="shrink-0 text-[6px] font-black uppercase tracking-widest px-1 py-0.5 rounded"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                Top Voice
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className="flex items-center gap-0.5 text-[8px] font-mono"
              style={{ color: T.dim }}
            >
              <Eye size={8} /> {colist.viewCount || 0}
            </span>
            <span
              className="flex items-center gap-0.5 text-[8px] font-mono"
              style={{ color: T.dim }}
            >
              <Clock size={8} /> {mins}m
            </span>
          </div>
        </div>

        {/* Resume / Start CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="mt-2 w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
          style={{
            background: isComplete
              ? "rgba(74,222,128,0.08)"
              : hasProgress
                ? G.dimBg
                : "rgba(255,255,255,0.04)",
            color: isComplete ? "#4ADE80" : hasProgress ? G.bright : T.dim,
            border: `1px solid ${isComplete ? "rgba(74,222,128,0.2)" : hasProgress ? G.border : "rgba(255,255,255,0.06)"}`,
          }}
        >
          {isComplete ? (
            <>
              <Check size={10} /> Read Again
            </>
          ) : hasProgress ? (
            <>
              <Play size={10} /> Resume — Page {resumeIndex + 1}
            </>
          ) : (
            <>
              <Play size={10} /> Read Now
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
});

/* ─── Fork Modal ─────────────────────────────────────────────────────────── */
const ForkModal = memo(
  ({ colist, onClose, userData, currentUser, onForked }) => {
    const [forking, setForking] = useState(false);
    const [done, setDone] = useState(false);
    const [newSlug, setNewSlug] = useState("");

    const handleFork = async () => {
      const finalUid = currentUser?.uid || userData?.uid;
      if (!finalUid) return;
      setForking(true);
      try {
        const slug = generateSlug(`fork-${colist.title}`);
        await addDoc(collection(db, "colists"), {
          title: `${colist.title} (Fork)`,
          slug,
          description: colist.description || "",
          tags: colist.tags || [],
          coverGradient: colist.coverGradient || COVER_GRADIENTS[0],
          blocks: (colist.blocks || []).map((b) => ({
            ...b,
            id: createBlockId(),
          })),
          authorId: finalUid,
          authorUsername: userData.identity?.username || "operator",
          authorName:
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator",
          authorAvatar: userData.identity?.avatarUrl || null,
          isPublic: true,
          viewCount: 0,
          saveCount: 0,
          colistScore: 0,
          forkOf: {
            colistId: colist.id,
            authorUsername: colist.authorUsername,
            title: colist.title,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setNewSlug(slug);
        setDone(true);
        onForked?.(slug);
      } catch (err) {
        console.error(err);
      } finally {
        setForking(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {done ? (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.3)",
                  }}
                >
                  <GitFork size={28} style={{ color: "#4ADE80" }} />
                </motion.div>
                <h3 className="text-xl font-black text-white mb-2">
                  Fork Created!
                </h3>
                <p className="text-xs mb-5" style={{ color: T.secondary }}>
                  Your fork is live with attribution to @{colist.authorUsername}
                  .
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{
                      background: V.surface,
                      color: T.dim,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    Close
                  </button>
                  <a
                    href={`/colists/${newSlug}`}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                      color: "#000",
                    }}
                  >
                    Open Fork <ArrowRight size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <GitFork size={18} style={{ color: G.bright }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Fork this Colist
                    </h3>
                    <p className="text-[10px]" style={{ color: T.dim }}>
                      Create your own editable copy
                    </p>
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl mb-5"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <p
                    className="text-xs font-bold mb-1"
                    style={{ color: G.bright }}
                  >
                    Attribution Note
                  </p>
                  <p className="text-[11px]" style={{ color: T.secondary }}>
                    Your fork will permanently credit
                    <span className="font-black text-white">
                      @{colist.authorUsername}
                    </span>
                    . This is permanent and cannot be removed.
                  </p>
                </div>

                <div
                  className="text-[10px] mb-5 space-y-1.5"
                  style={{ color: T.dim }}
                >
                  <p>
                    ✓ All {(colist.blocks || []).length} pages copied to your
                    editor
                  </p>
                  <p>✓ Attribution tag attached to your colist</p>
                  <p>✓ Independent colist score tracking</p>
                  <p>✓ Full edit access — customize freely</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest"
                    style={{
                      background: V.surface,
                      color: T.dim,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleFork}
                    disabled={forking}
                    className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                      color: "#000",
                      opacity: forking ? 0.7 : 1,
                    }}
                  >
                    {forking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <GitFork size={11} /> Fork Now
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

/* ─── Premium + Auth Modals ───────────────────────────────────────────────── */
const PremiumModal = memo(({ onClose, navigate }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)" }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.92, y: 24, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: V.depth, border: `1px solid ${G.border}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-8 text-center">
        <div
          className="w-20 h-20 rounded-[2rem] mx-auto mb-5 flex items-center justify-center"
          style={{
            background: G.dimBg,
            border: `1px solid ${G.border}`,
            boxShadow: `0 0 50px rgba(191,162,100,0.2)`,
          }}
        >
          <Crown size={38} style={{ color: G.bright }} />
        </div>
        <p
          className="text-[9px] font-black uppercase tracking-[0.35em] mb-2"
          style={{ color: G.base }}
        >
          Pro Clearance Required
        </p>
        <h2
          className="text-3xl font-black mb-3 leading-tight"
          style={{ color: T.primary, letterSpacing: "-0.03em" }}
        >
          Create a Colist
        </h2>
        <p
          className="text-sm leading-relaxed mb-7 max-w-xs mx-auto"
          style={{ color: T.secondary }}
        >
          Colists are a Pro-exclusive publishing tool. Build your reputation as
          a curator — every save adds to your Resonance score.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onClose();
            navigate("/premium");
          }}
          className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-2xl mb-2"
          style={{
            background: "linear-gradient(135deg,#8B7240,#D4AF78)",
            color: "#000",
            boxShadow: "0 0 40px rgba(191,162,100,0.3)",
          }}
        >
          Upgrade to Pro — ₹139/mo
        </motion.button>
        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold"
          style={{ color: T.dim }}
        >
          Maybe later
        </button>
      </div>
    </motion.div>
  </motion.div>
));

/* ─── Custom YouTube Node Extension ──────────────────────────────────────── */
const YouTubeNodeView = ({ node, updateAttributes, deleteNode }) => {
  const [editingLink, setEditingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [playing, setPlaying] = useState(false);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);

  const { src, videoId, title, customTitle } = node.attrs;

  const extractId = (url) => {
    const match = url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchTitle = async () => {
      if (!src || title || customTitle) return;
      try {
        setIsFetchingTitle(true);
        const res = await fetch(
          `https://noembed.com/embed?dataType=json&url=${encodeURIComponent(src)}`,
        );
        const data = await res.json();
        if (isMounted && data && data.title) {
          updateAttributes({ title: data.title });
        }
      } catch {
        if (isMounted) updateAttributes({ title: "YouTube Video" });
      } finally {
        if (isMounted) setIsFetchingTitle(false);
      }
    };
    fetchTitle();
    return () => {
      isMounted = false;
    };
  }, [src, title, customTitle, updateAttributes]);

  const handleUpdateLink = async () => {
    if (!newLink.trim()) {
      setEditingLink(false);
      return;
    }
    const id = extractId(newLink);
    if (!id) {
      setEditingLink(false);
      return;
    }

    const updates = { src: newLink, videoId: id, playing: false };

    if (!customTitle) {
      updateAttributes({ ...updates, title: "Extracting title..." });
      try {
        const res = await fetch(
          `https://noembed.com/embed?dataType=json&url=${encodeURIComponent(newLink)}`,
        );
        const data = await res.json();
        if (data && data.title) {
          updates.title = data.title;
        } else {
          updates.title = "YouTube Video";
        }
      } catch {
        updates.title = "YouTube Video";
      }
    } else {
      updateAttributes(updates);
    }
    setEditingLink(false);
  };

  return (
    <NodeViewWrapper className="my-8" data-drag-handle>
      <div
        className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden group border border-white/10 shadow-2xl bg-[#0A0A0A]"
        style={{ aspectRatio: "16/9" }}
      >
        {!playing ? (
          <>
            {videoId ? (
              <>
                <img
                  src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                  className="w-full h-full object-cover transition-all duration-500 opacity-90 group-hover:opacity-40"
                  alt="Thumbnail"
                />
                <div className="absolute top-4 right-4 bg-black rounded-lg p-2 z-20 group-hover:opacity-0 transition-opacity duration-300 shadow-lg border border-white/5 pointer-events-none">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="gold-grad-yt"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#8B7240" />
                        <stop offset="50%" stopColor="#D4AF78" />
                        <stop offset="100%" stopColor="#E8D5A3" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M21.582 6.186a2.665 2.665 0 0 0-1.876-1.886C18.05 3.843 12 3.843 12 3.843s-6.05 0-7.706.457A2.665 2.665 0 0 0 2.418 6.186C1.961 7.843 1.961 12 1.961 12s0 4.157.457 5.814a2.665 2.665 0 0 0 1.876 1.886C5.95 20.157 12 20.157 12 20.157s6.05 0 7.706-.457a2.665 2.665 0 0 0 1.876-1.886c.457-1.657.457-5.814.457-5.814s0-4.157-.457-5.814Z"
                      fill="url(#gold-grad-yt)"
                    />
                    <path
                      d="M9.98 15.502v-7.004l6.236 3.502-6.236 3.502Z"
                      fill="#000"
                    />
                  </svg>
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-[#111] flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-white/50" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 backdrop-blur-sm z-30">
              <button
                onClick={deleteNode}
                className="w-14 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-500/30 hover:scale-110 shadow-lg"
              >
                <X size={24} />
              </button>
              <button
                onClick={() => setPlaying(true)}
                className="w-20 h-20 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] flex items-center justify-center hover:bg-[#4ADE80] hover:text-black transition-all border border-[#4ADE80]/30 hover:scale-110 shadow-[0_0_30px_rgba(74,222,128,0.3)]"
              >
                <Play size={32} className="ml-1.5" fill="currentColor" />
              </button>
              <button
                onClick={() => {
                  setEditingLink(true);
                  setNewLink(src || "");
                }}
                className="w-14 h-14 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center hover:bg-[#38bdf8] hover:text-white transition-all border border-[#38bdf8]/30 hover:scale-110 shadow-lg"
              >
                <Link2 size={24} />
              </button>
            </div>
          </>
        ) : (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
            className="w-full h-full absolute inset-0"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
          />
        )}

        <AnimatePresence>
          {editingLink && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-2xl border-t border-white/10 z-30 flex items-center gap-3"
            >
              <Link2 size={18} className="text-[#38bdf8] ml-2 shrink-0" />
              <input
                type="url"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                placeholder="Paste new YouTube link..."
                className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#BFA264]/50 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateLink();
                }}
              />
              <button
                onClick={handleUpdateLink}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all hover:opacity-90 shadow-[0_0_20px_rgba(191,162,100,0.2)] shrink-0"
                style={{
                  background: "linear-gradient(135deg, #8B7240, #D4AF78)",
                }}
              >
                Update
              </button>
              <button
                onClick={() => setEditingLink(false)}
                className="p-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all shrink-0"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-2 group/title relative w-full max-w-[90%] mx-auto">
        <textarea
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          value={isFetchingTitle ? "Extracting title..." : title}
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
            updateAttributes({ title: e.target.value, customTitle: true });
          }}
          disabled={isFetchingTitle}
          rows={1}
          className={cn(
            "text-center font-bold text-base bg-transparent border-b-2 border-transparent hover:border-white/10 focus:border-white/30 outline-none transition-all px-4 py-1 w-full resize-none overflow-hidden leading-relaxed",
            isFetchingTitle ? "animate-pulse opacity-40" : "",
          )}
          style={{ color: "var(--editor-text-color)" }}
          placeholder="Video Title"
        />
        <div className="opacity-0 group-hover/title:opacity-100 transition-opacity text-white/30 pointer-events-none flex items-center justify-center shrink-0 absolute top-2 -right-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

const EnhancedYouTube = Node.create({
  name: "enhancedYoutube",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      videoId: { default: null },
      title: { default: "" },
      customTitle: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-youtube-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-youtube-embed": "" }, HTMLAttributes),
      [
        "iframe",
        {
          src: `https://www.youtube.com/embed/${HTMLAttributes.videoId}`,
          style: "width: 100%; aspect-ratio: 16/9; border-radius: 1rem;",
          frameborder: "0",
          allowfullscreen: "true",
        },
      ],
      [
        "h3",
        {
          style:
            "text-align: center; font-weight: bold; margin-top: 1.5rem; font-size: 1rem; line-height: 1.5; color: var(--editor-text-color, inherit); word-wrap: break-word; white-space: normal;",
        },
        HTMLAttributes.title,
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YouTubeNodeView);
  },
});

/* ─── Rich Text Toolbar & Connectors ──────────────────────────────────────── */
const EditorToolbar = memo(({ editor }) => {
  const [showHeadings, setShowHeadings] = useState(false);

  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 mb-4 bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10 w-max overflow-visible relative z-[100]">
      {/* Headings Extension */}
      <div className="relative" onMouseLeave={() => setShowHeadings(false)}>
        <button
          onMouseEnter={() => setShowHeadings(true)}
          className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1"
        >
          <Heading1 size={16} />
        </button>
        <AnimatePresence>
          {showHeadings && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full top-0 ml-1 flex items-center gap-1 bg-black/90 border border-white/10 rounded-xl p-1 shadow-2xl"
            >
              {[1, 2, 3].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    editor.chain().focus().toggleHeading({ level }).run()
                  }
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    editor.isActive("heading", { level })
                      ? "bg-[#BFA264]/20 text-[#BFA264]"
                      : "text-white/50 hover:text-white hover:bg-white/10",
                  )}
                >
                  {level === 1 ? (
                    <Heading1 size={14} />
                  ) : level === 2 ? (
                    <Heading2 size={14} />
                  ) : (
                    <Heading3 size={14} />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Formatting */}
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("bold")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("italic")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Italic size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("strike")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <Strikethrough size={16} />
      </button>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* Extensions */}
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("blockquote")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <QuoteIcon size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("bulletList")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-2 rounded-xl transition-all",
          editor.isActive("orderedList")
            ? "bg-[#BFA264]/20 text-[#BFA264]"
            : "text-white/50 hover:bg-white/10",
        )}
      >
        <ListOrdered size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className="p-2 rounded-xl text-white/50 hover:bg-white/10 transition-all"
      >
        <Minus size={16} />
      </button>
    </div>
  );
});

/* ─── Paginated TipTap Page ──────────────────────────────────────────────── */

// Recursively count plain-text length of a ProseMirror JSON node
const getNodeTextLength = (node) => {
  if (!node) return 0;
  if (node.type === "text") return (node.text || "").length;
  return (node.content || []).reduce(
    (sum, child) => sum + getNodeTextLength(child),
    0,
  );
};

const TipTapPageEditor = memo(
  ({
    block,
    idx,
    total,
    onUpdate,
    onDelete,
    onMove,
    textColor,
    onAdvancePage,
    onBulkPaste,
    setActiveEditor,
    shouldFocus,
    onFocusConsumed,
  }) => {
    // ── Stable refs — prevent stale closures inside ProseMirror callbacks ──
    const onUpdateRef = useRef(onUpdate);
    const onAdvancePageRef = useRef(onAdvancePage);
    const onBulkPasteRef = useRef(onBulkPaste);
    const idxRef = useRef(idx);
    const blockRef = useRef(block);
    const onFocusConsumedRef = useRef(onFocusConsumed);
    useEffect(() => {
      onUpdateRef.current = onUpdate;
    }, [onUpdate]);
    useEffect(() => {
      onAdvancePageRef.current = onAdvancePage;
    }, [onAdvancePage]);
    useEffect(() => {
      onBulkPasteRef.current = onBulkPaste;
    }, [onBulkPaste]);
    useEffect(() => {
      idxRef.current = idx;
    }, [idx]);
    useEffect(() => {
      blockRef.current = block;
    }, [block]);
    useEffect(() => {
      onFocusConsumedRef.current = onFocusConsumed;
    }, [onFocusConsumed]);

    // Guards against recursive splits triggered by editor.commands.setContent calls
    const isSplitting = useRef(false);

    // Max plain-text characters per slide before auto-splitting
    const MAX_SLIDE_CHARS = 600;

    const editor = useEditor({
      extensions: [
        StarterKit,
        LinkExtension.configure({ openOnClick: false }),
        EnhancedYouTube,
        EnhancedPodcast,
        Placeholder.configure({ placeholder: "Start typing..." }),
      ],
      // _initialJSON is set by handleAdvancePage/handleBulkPaste for overflow content.
      // It is only consumed at mount time (TipTap ignores content changes post-init),
      // so new slides always get a fresh TipTap instance via their unique block.id key.
      content: block._initialJSON || block.content || "",
      editorProps: {
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData("text/plain")?.trim();
          if (!text) return false;

          // ── Extract URL if user pasted an raw iframe ──
          let extractedUrl = text;
          const iframeMatch = text.match(/<iframe.*?src=["'](.*?)["']/i);
          if (iframeMatch) extractedUrl = iframeMatch[1];

          // ── Apple/Spotify Podcast shortcut ──
          const isPodcast =
            /^(https?:\/\/)?(open\.spotify\.com|podcasts\.apple\.com)\/.+$/.test(
              extractedUrl,
            ) ||
            extractedUrl.includes("spotify.com/embed") ||
            extractedUrl.includes("embed.podcasts.apple.com");

          if (isPodcast) {
            event.preventDefault();
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.enhancedPodcast.create({
                  url: extractedUrl,
                  title: "",
                }),
              ),
            );
            return true;
          }

          // ── YouTube shortcut: embed node ──
          const isYoutube =
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(
              extractedUrl,
            ) || extractedUrl.includes("youtube.com/embed/");

          if (isYoutube) {
            const videoId = extractedUrl.match(
              /(?:v=|youtu\.be\/|embed\/)([^&\s?]+)/,
            )?.[1];
            if (videoId) {
              event.preventDefault();
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.enhancedYoutube.create({
                    src: text,
                    videoId,
                    title: "",
                    customTitle: false,
                  }),
                ),
              );
              return true;
            }
          }

          // ── Large paste: split into slides at paragraph boundaries ──
          // We let TipTap parse the rich clipboard HTML first (preserving all
          // formatting), then in onUpdate we detect overflow and split at the
          // ProseMirror node level. Only fall back to paragraph splitting when
          // the paste is overwhelmingly large (>3000 chars) to batch-create
          // slides upfront instead of triggering multiple sequential onUpdate
          // overflow checks.
          if (text.length > 3000) {
            event.preventDefault();
            const paragraphs = text
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean);

            const CHARS_PER_SLIDE = MAX_SLIDE_CHARS;
            const chunkNodeArrays = [];
            let currentNodes = [];
            let currentLen = 0;

            for (const para of paragraphs) {
              const paraLen = para.length;
              if (
                currentLen + paraLen > CHARS_PER_SLIDE &&
                currentNodes.length > 0
              ) {
                chunkNodeArrays.push(currentNodes);
                currentNodes = [];
                currentLen = 0;
              }
              currentNodes.push({
                type: "paragraph",
                content: [{ type: "text", text: para }],
              });
              currentLen += paraLen;
            }
            if (currentNodes.length > 0) chunkNodeArrays.push(currentNodes);

            if (chunkNodeArrays.length > 1 && onBulkPasteRef.current) {
              onBulkPasteRef.current(idxRef.current, chunkNodeArrays);
              return true;
            }
            // Single chunk — fall through to default paste handling
          }

          return false; // Let TipTap handle it (preserves bold, links, etc.)
        },
      },
      onUpdate: ({ editor }) => {
        if (isSplitting.current) return;

        const json = editor.getJSON();
        const nodes = json.content || [];

        // Sync current (possibly pre-split) content to React state
        onUpdateRef.current(idxRef.current, {
          ...blockRef.current,
          content: editor.getHTML(),
          _initialJSON: null, // CRITICAL: Firestore rejects undefined
        });

        // ── Character-count split: enforced at the ProseMirror data layer ──
        const totalChars = nodes.reduce(
          (sum, node) => sum + getNodeTextLength(node),
          0,
        );
        if (totalChars <= MAX_SLIDE_CHARS) return;

        // Find the last complete node boundary that keeps us at or under the limit
        let charCount = 0;
        let splitIdx = nodes.length; // default: keep all (no split found)

        for (let i = 0; i < nodes.length; i++) {
          const nodeLen = getNodeTextLength(nodes[i]);
          if (charCount + nodeLen > MAX_SLIDE_CHARS && i >= 1) {
            splitIdx = i;
            break;
          }
          charCount += nodeLen;
        }

        // Nothing to split (single giant node — e.g. huge heading)
        if (splitIdx >= nodes.length) return;

        const keepNodes = nodes.slice(0, splitIdx);
        const overflowNodes = nodes.slice(splitIdx);
        if (overflowNodes.length === 0) return;

        isSplitting.current = true;

        // Trim current editor to only the kept nodes — preserves all formatting
        editor.commands.setContent({ type: "doc", content: keepNodes }, false);

        // Sync trimmed content to React state
        onUpdateRef.current(idxRef.current, {
          ...blockRef.current,
          content: editor.getHTML(),
          _initialJSON: null, // CRITICAL: Firestore rejects undefined
        });

        // Advance to next slide, passing overflow as rich ProseMirror JSON
        onAdvancePageRef.current(idxRef.current, {
          type: "doc",
          content: overflowNodes,
        });

        // Release guard after ProseMirror has settled (one animation frame is enough)
        requestAnimationFrame(() => {
          isSplitting.current = false;
        });
      },
      onFocus: ({ editor }) => setActiveEditor(editor),
    });

    // ── Focus management: uses TipTap's own command, not window.getSelection ──
    // Fires only when the parent signals this slide should receive focus.
    // requestAnimationFrame ensures React has committed the DOM and TipTap
    // has finished its internal transaction queue before we call focus.
    useEffect(() => {
      if (shouldFocus && editor) {
        requestAnimationFrame(() => {
          if (!editor.isDestroyed) {
            editor.commands.focus("end");
            onFocusConsumedRef.current?.();
          }
        });
      }
    }, [shouldFocus, editor]);

    return (
      <div className="flex flex-col h-full relative z-10 w-full">
        <span
          className="text-[10px] font-black font-mono tracking-widest mb-4"
          style={{ color: textColor, opacity: 0.5 }}
        >
          PAGE {String(idx + 1).padStart(2, "0")}
        </span>

        <div
          className="flex-1 overflow-hidden tip-tap-container"
          style={{
            color: textColor,
            "--tt-color": textColor,
            // Overflow is intentionally hidden — content is split at the data
            // layer (MAX_SLIDE_CHARS) before it ever reaches this boundary.
            // This div is a visual constraint only, not a trigger.
            maxHeight: "460px",
          }}
        >
          <EditorContent
            editor={editor}
            className="h-full prose-invert w-full outline-none"
          />
        </div>

        {/* Cover page delete protection handled via disabled prop on the delete button */}

        {/* Bottom Action Bar */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-2xl p-1.5 rounded-[1.2rem] border border-white/10 z-20 shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          {idx > 0 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Move Left"
              onClick={() => onMove(idx, -1)}
              className="p-2.5 rounded-xl transition-colors hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <ArrowLeft size={14} />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="p-2.5 rounded-xl transition-colors hover:bg-white/15 disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <Undo size={14} />
          </motion.button>

          <div className="w-px h-4 bg-white/12 mx-0.5" />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Delete Page"
            onClick={() => onDelete(idx)}
            disabled={idx === 0}
            className="p-2.5 rounded-xl transition-colors hover:bg-red-500/20 disabled:opacity-20"
            style={{ color: idx === 0 ? "rgba(255,255,255,0.3)" : "#F87171" }}
          >
            <X size={14} />
          </motion.button>

          <div className="w-px h-4 bg-white/12 mx-0.5" />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="p-2.5 rounded-xl transition-colors hover:bg-white/15 disabled:opacity-25"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <Redo size={14} />
          </motion.button>

          {idx < total - 1 && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Move Right"
              onClick={() => onMove(idx, 1)}
              className="p-2.5 rounded-xl transition-colors hover:bg-white/15"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <ArrowRight size={14} />
            </motion.button>
          )}
        </div>
      </div>
    );
  },
);

/* ─── Colist Editor (Horizontal Deck Architecture) ────────────────────────── */
const ColistEditor = memo(
  ({
    onClose,
    userData,
    currentUser,
    onPublish,
    initialColist = null,
    forkOf = null,
  }) => {
    const [coverUrl, setCoverUrl] = useState(
      initialColist ? initialColist.coverUrl || "" : forkOf?.coverUrl || "",
    );
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onFileChange = async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const imageDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
        setImageSrc(imageDataUrl);
        setCropModalOpen(true);
      }
    };

    const handleUploadCroppedImage = async () => {
      try {
        setIsUploadingCover(true);
        const croppedImageBlob = await getCroppedImg(
          imageSrc,
          croppedAreaPixels,
        );

        if (croppedImageBlob.size > 1 * 1024 * 1024) {
          setError(
            "Cropped image exceeds 1MB limit. Please choose a smaller image.",
          );
          setIsUploadingCover(false);
          setCropModalOpen(false);
          return;
        }

        const fileName = `cover_${createBlockId()}.jpg`;
        const storageRef = ref(
          storage,
          `colist_covers/${currentUser.uid}/${fileName}`,
        );
        await uploadBytes(storageRef, croppedImageBlob);
        const downloadUrl = await getDownloadURL(storageRef);

        setCoverUrl(downloadUrl);
        setCropModalOpen(false);
      } catch (e) {
        console.error(e);
        setError("Cover upload failed.");
      } finally {
        setIsUploadingCover(false);
      }
    };
    const [title, setTitle] = useState(
      initialColist
        ? initialColist.title
        : forkOf
          ? `${forkOf.title} (Fork)`
          : "",
    );
    const [subtext, setSubtext] = useState(
      initialColist ? initialColist.subtext || "" : forkOf?.subtext || "",
    );
    const [description, setDescription] = useState(
      initialColist ? initialColist.description || "" : "",
    );
    const [tags, setTags] = useState(
      initialColist ? initialColist.tags || [] : [],
    );
    const [tagInput, setTagInput] = useState("");

    const initialCoverIdx = initialColist
      ? Math.max(0, COVER_GRADIENTS.indexOf(initialColist.coverGradient))
      : 0;
    const [coverIdx, setCoverIdx] = useState(initialCoverIdx);
    const [textColor, setTextColor] = useState(
      initialColist
        ? initialColist.textColor || THEME_TEXT_COLORS[initialCoverIdx]
        : THEME_TEXT_COLORS[0],
    );
    const [showThemeDropdown, setShowThemeDropdown] = useState(false);
    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [colorMode, setColorMode] = useState("presets"); // "presets" | "custom"
    const [activeEditor, setActiveEditor] = useState(null);
    const [error, setError] = useState("");
    // Signals which slide index should steal focus after React commits a new slide
    const [focusNextIdx, setFocusNextIdx] = useState(null);

    const initialBlocks =
      initialColist?.blocks?.length > 0
        ? initialColist.blocks
        : forkOf?.blocks?.length > 0
          ? forkOf.blocks
          : [
              {
                id: createBlockId(),
                type: "insight",
                content: "",
                title: "",
                description: "",
                url: "",
                language: "",
                author: "",
                youtubeId: "",
              },
            ];

    const [blocks, setBlocks] = useState(initialBlocks);

    // ── Auto-Advance Engine: data-model-first, no DOM polling ──
    // overflowJSON: { type:"doc", content: ProseMirrorNodeArray } — the text
    // that overflowed the current slide, pre-formatted as rich TipTap JSON.
    const handleAdvancePage = useCallback((currentIdx, overflowJSON = null) => {
      const nextIdx = currentIdx + 1;

      setBlocks((prev) => {
        const isLastPage = currentIdx === prev.length - 1;
        const newBlock = {
          id: createBlockId(),
          type: "insight",
          // _initialJSON is consumed once by TipTap useEditor({content:…}) on mount
          _initialJSON: overflowJSON || null,
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        };

        if (isLastPage) {
          return [...prev, newBlock];
        }

        // If the next slide is already blank, inject overflow into it
        const next = [...prev];
        if (overflowJSON && !next[nextIdx]?.content?.trim()) {
          next[nextIdx] = { ...next[nextIdx], _initialJSON: overflowJSON };
        }
        return next;
      });

      // Signal focus target — consumed by TipTapPageEditor shouldFocus prop
      setFocusNextIdx(nextIdx);

      // Scroll using stable data attribute, not fragile child index arithmetic
      requestAnimationFrame(() => {
        const el = document.getElementById("editor-scroll-area");
        if (!el) return;
        const target = el.querySelector(`[data-slide-idx="${nextIdx}"]`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });
    }, []);

    // ── Bulk Paste Engine: accepts ProseMirror JSON node arrays, preserves formatting ──
    // chunkNodeArrays: ProseMirrorNode[][] — each inner array is one slide's content
    const handleBulkPaste = useCallback((startIdx, chunkNodeArrays) => {
      if (!chunkNodeArrays?.length) return;
      const finalIdx = startIdx + chunkNodeArrays.length - 1;

      setBlocks((prev) => {
        const next = [...prev];
        // First chunk replaces content of the current slide
        next[startIdx] = {
          ...next[startIdx],
          _initialJSON: { type: "doc", content: chunkNodeArrays[0] },
          content: "",
        };
        // Remaining chunks become brand-new slides, injected after startIdx
        const newSlides = chunkNodeArrays.slice(1).map((nodeArr) => ({
          id: createBlockId(),
          type: "insight",
          _initialJSON: { type: "doc", content: nodeArr },
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        }));
        next.splice(startIdx + 1, 0, ...newSlides);
        return next;
      });

      setFocusNextIdx(finalIdx);

      requestAnimationFrame(() => {
        const el = document.getElementById("editor-scroll-area");
        if (!el) return;
        const target = el.querySelector(`[data-slide-idx="${finalIdx}"]`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
      });
    }, []);

    const validBlocks = useMemo(
      () =>
        blocks
          .filter(
            (b) =>
              b.type === "divider" ||
              b.content?.trim() ||
              b.url?.trim() ||
              b.title?.trim(),
          )
          .map((b) => {
            // MAANG-GRADE FIX: Firestore violently rejects 'undefined' values.
            // We must scrub the block payload completely before passing to db.
            const cleanBlock = { ...b };
            Object.keys(cleanBlock).forEach((key) => {
              if (cleanBlock[key] === undefined) {
                cleanBlock[key] = null;
              }
            });
            return cleanBlock;
          }),
      [blocks],
    );

    const canPublish = title.trim().length >= 3 && validBlocks.length >= 2;

    // Cloud Save Engine
    const [saveState, setSaveState] = useState("saved"); // saved | unsaved | saving
    const [draftId, setDraftId] = useState(
      initialColist ? initialColist.id : null,
    );
    const isInitialRender = useRef(true);

    const isDraftEmptyAndNew = useCallback(() => {
      if (draftId) return false; // Existing draft in DB
      if (title.trim() !== "") return false;
      if (subtext.trim() !== "") return false;
      if (description.trim() !== "") return false;
      if (tags.length > 0) return false;
      if (blocks.length > 1) return false;

      // Deep verification of the single initial block
      if (blocks.length === 1) {
        const b = blocks[0];
        if (
          b.title?.trim() ||
          b.url?.trim() ||
          b.youtubeId?.trim() ||
          b.author?.trim()
        )
          return false;
        // TipTap normalizes empty strings to <p></p>, so we explicitly ignore it
        if (
          b.content &&
          b.content.trim() !== "" &&
          b.content.trim() !== "<p></p>"
        )
          return false;
      }
      return true;
    }, [draftId, title, subtext, description, tags, blocks]);

    useEffect(() => {
      const handleBeforeUnload = (e) => {
        if (saveState !== "saved" && !isDraftEmptyAndNew()) {
          e.preventDefault();
          e.returnValue = "";
        }
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [saveState, isDraftEmptyAndNew]);

    const handleCloseClick = useCallback(() => {
      if (saveState !== "saved" && !isDraftEmptyAndNew()) {
        if (
          !window.confirm(
            "You have unsaved changes. Are you sure you want to exit?",
          )
        ) {
          return;
        }
      }
      onClose();
    }, [saveState, onClose, isDraftEmptyAndNew]);

    useEffect(() => {
      if (isInitialRender.current) {
        isInitialRender.current = false;
        return;
      }
      const timer = setTimeout(() => {
        setSaveState((prev) => (prev !== "unsaved" ? "unsaved" : prev));
      }, 0);
      return () => clearTimeout(timer);
    }, [
      title,
      subtext,
      description,
      tags,
      coverIdx,
      coverUrl,
      textColor,
      blocks,
    ]);

    // Utility to generate the specific draft slug format
    const generateDraftSlug = useCallback((baseTitle) => {
      const base = baseTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45); // Leave room for the random 6 digits
      const random6 = Math.floor(100000 + Math.random() * 900000).toString();
      return `${base || "draft"}-${random6}`;
    }, []);

    const performSave = useCallback(async () => {
      // Condition 1: MUST have a title to auto-save
      if (!title.trim() || title.trim().length < 3) return;

      setSaveState("saving");
      try {
        const finalTags = tags.slice(0, 5);
        const isInitialSave = !draftId;

        // If it's the first save, generate the slug. Otherwise, keep the existing one.
        const currentSlug = isInitialSave
          ? generateDraftSlug(title.trim())
          : undefined;

        const isActuallyAdmin =
          userData?.role === "admin" ||
          String(userData?.tier).toUpperCase() === "ADMIN";

        const payload = {
          title: title.trim(),
          subtext: subtext.trim(),
          description: description.trim(),
          tags: finalTags,
          coverGradient: COVER_GRADIENTS[coverIdx],
          coverUrl: coverUrl || null,
          textColor,
          blocks: validBlocks,
          // CRITICAL FIX: Removed isPublic: true to prevent auto-save from leaking drafts
          ...(isActuallyAdmin
            ? { verificationTier: "original", colistScore: 100 }
            : {}), // Admin Auto-mint Original
          updatedAt: serverTimestamp(),
        };

        if (isInitialSave) {
          payload.slug = currentSlug;
        }

        if (draftId) {
          await updateDoc(doc(db, "colists", draftId), payload);
        } else {
          payload.authorId = currentUser?.uid || userData?.uid;
          payload.authorUsername = userData.identity?.username || "operator";
          payload.authorName =
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator";
          payload.authorAvatar = userData.identity?.avatarUrl || null;
          payload.isPublic = false;
          payload.viewCount = 0;
          payload.saveCount = 0;
          payload.colistScore = 0;
          payload.colistScoreMilestone = 0;
          payload.createdAt = serverTimestamp();

          const docRef = await addDoc(collection(db, "colists"), payload);
          setDraftId(docRef.id);

          // Silently update the URL to /colists/[slug]/unpublished
          window.history.replaceState(
            window.history.state || { modal: "editor" },
            "",
            `/colists/${currentSlug}/unpublished`,
          );
        }
        setSaveState("saved");
      } catch (e) {
        console.error("Save failure:", e);
        setSaveState("unsaved");
      }
    }, [
      title,
      subtext,
      description,
      tags,
      coverIdx,
      coverUrl,
      textColor,
      validBlocks,
      draftId,
      userData,
      currentUser,
      generateDraftSlug,
    ]);

    useEffect(() => {
      if (saveState === "unsaved") {
        const timer = setTimeout(() => {
          // Enforce title rule in the timeout as well
          if (title.trim().length >= 3) {
            performSave();
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    }, [saveState, performSave, title]);

    const addSlide = useCallback(() => {
      setBlocks((prev) => [
        ...prev,
        {
          id: createBlockId(),
          type: "insight",
          content: "",
          title: "",
          description: "",
          url: "",
          language: "",
          author: "",
          youtubeId: "",
        },
      ]);
      setTimeout(() => {
        const el = document.getElementById("editor-scroll-area");
        if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      }, 50);
    }, []);

    const updateBlock = useCallback(
      (idx, updated) =>
        setBlocks((prev) => prev.map((b, i) => (i === idx ? updated : b))),
      [],
    );
    const deleteBlock = useCallback(
      (idx) => setBlocks((prev) => prev.filter((_, i) => i !== idx)),
      [],
    );

    const moveBlock = useCallback((idx, dir) => {
      setBlocks((prev) => {
        const n = [...prev];
        if (idx + dir < 0 || idx + dir >= n.length) return n;
        [n[idx], n[idx + dir]] = [n[idx + dir], n[idx]];
        return n;
      });
    }, []);

    const handleTagChange = useCallback(
      (e) => {
        const val = e.target.value;
        if (val.endsWith(", ") || val.endsWith(",")) {
          const newTag = val.replace(/,\s*$/, "").trim();
          if (newTag && tags.length < 10 && !tags.includes(newTag))
            setTags((prev) => [...prev, newTag]);
          setTagInput("");
        } else setTagInput(val);
      },
      [tags, setTags, setTagInput],
    );

    const handlePublish = async () => {
      if (!canPublish) {
        setError(
          validBlocks.length < 2
            ? "Minimum 2 pages required (Cover + 1 Content)."
            : "Title must be at least 3 characters.",
        );
        return;
      }
      setSaveState("saving");
      setError("");
      try {
        const finalTags = tags.slice(0, 5);
        const isInitialSave = !draftId;
        const currentSlug = isInitialSave
          ? generateDraftSlug(title.trim())
          : undefined;

        // Elevate Admin payloads instantly to Discotive Original
        const isAdmin =
          userData?.role === "admin" ||
          String(userData?.tier).toUpperCase() === "ADMIN";

        const payload = {
          title: title.trim(),
          subtext: subtext.trim(),
          description: description.trim(),
          tags: finalTags,
          coverGradient: COVER_GRADIENTS[coverIdx],
          coverUrl: coverUrl || null, // CRITICAL FIX: Prevent cover wipe on publish
          textColor,
          blocks: validBlocks,
          isPublic: true,
          ...(isAdmin ? { verificationTier: "original" } : {}),
          updatedAt: serverTimestamp(),
        };

        if (isInitialSave) {
          payload.slug = currentSlug;
        }

        if (draftId) {
          await updateDoc(doc(db, "colists", draftId), payload);
          // We do not know the exact slug if we didn't just generate it,
          // so we fetch it or we can trigger the callback which relies on the slug param.
          // Assuming we rely on a full navigation from the parent component, we just close.
          onPublish?.(currentSlug || "published"); // The parent handles the navigation
        } else {
          payload.authorId = currentUser?.uid || userData?.uid;
          payload.authorUsername = userData.identity?.username || "operator";
          payload.authorName =
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator";
          payload.authorAvatar = userData.identity?.avatarUrl || null;
          payload.viewCount = 0;
          payload.saveCount = 0;
          payload.colistScore = 0;
          payload.colistScoreMilestone = 0;
          payload.createdAt = serverTimestamp();

          await addDoc(collection(db, "colists"), payload);
          onPublish?.(currentSlug);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to publish. Please try again.");
        setSaveState("unsaved");
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: "3%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "3%" }}
        transition={{ type: "spring", damping: 32, stiffness: 220 }}
        className="fixed inset-0 z-[500] flex flex-col overflow-hidden bg-[#030303]"
        style={{ "--editor-text-color": textColor }}
        onClick={() => {
          setShowThemeDropdown(false);
          setShowColorDropdown(false);
        }}
      >
        <style>{`
            .colored-placeholder::placeholder {
              color: var(--editor-text-color) !important;
              opacity: 0.4 !important;
            }
            .tip-tap-container {
              font-family: var(--font-body), 'Poppins', sans-serif !important;
            }
            .tip-tap-container hr {
              border: none;
              border-top: 1px solid var(--editor-text-color) !important;
              opacity: 0.3 !important;
              margin: 2rem 0 !important;
            }
            .tip-tap-container div[data-youtube-video] {
              margin: 2rem 0 1rem 0 !important;
            }
            .tip-tap-container h1 { font-size: 2.2em !important; font-weight: 900 !important; line-height: 1.1 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
            .tip-tap-container h2 { font-size: 1.8em !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
            .tip-tap-container h3 { font-size: 1.4em !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
            .tip-tap-container ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
            .tip-tap-container ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
            .tip-tap-container li { display: list-item !important; }
            .tip-tap-container blockquote { border-left: 3px solid var(--editor-text-color) !important; padding-left: 1rem !important; font-style: italic !important; opacity: 0.9 !important; margin: 1rem 0 !important; }
            .tip-tap-container p { margin-bottom: 0.5em !important; min-height: 1.5em !important; }
          `}</style>

        {/* Absolute Floating Header */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 py-4 bg-black/40 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseClick}
              title="Close Editor"
              className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
            >
              <X size={18} />
            </button>
            {forkOf && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                <GitFork size={12} className="text-[#D4AF78]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF78]">
                  Fork of @{forkOf.authorUsername}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30 mr-2">
              <span>Meta</span>
              <ArrowRight size={10} />
              <span>
                {validBlocks.length} Page{validBlocks.length !== 1 && "s"}
              </span>
            </div>

            <button
              title={
                saveState === "saved"
                  ? "Saved to Cloud"
                  : saveState === "saving"
                    ? "Saving..."
                    : "Unsaved Changes (Click to save)"
              }
              onClick={() => saveState === "unsaved" && performSave()}
              className="p-2 rounded-full transition-colors text-white/50 hover:text-white flex items-center justify-center"
            >
              {saveState === "saving" && (
                <Loader2 size={16} className="animate-spin text-[#D4AF78]" />
              )}
              {saveState === "saved" && (
                <Cloud size={16} className="text-[#4ADE80]" />
              )}
              {saveState === "unsaved" && <Save size={16} />}
            </button>

            {error && (
              <p className="text-[10px] text-red-400 font-bold hidden md:block max-w-[150px] truncate">
                {error}
              </p>
            )}
            <motion.button
              whileHover={canPublish ? { scale: 1.04 } : {}}
              whileTap={canPublish ? { scale: 0.96 } : {}}
              onClick={handlePublish}
              disabled={saveState === "saving" || !canPublish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest disabled:opacity-30 transition-opacity"
              style={{
                background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                color: "#000",
              }}
            >
              <Globe size={14} /> Publish
            </motion.button>
          </div>
        </div>

        {/* Horizontal Scroll Deck */}
        <div
          id="editor-scroll-area"
          className="flex-1 w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar snap-x snap-mandatory flex items-center px-[5vw] md:px-[15vw] pt-20 pb-8 gap-4 md:gap-8"
        >
          {/* Card 1: Meta Configuration */}
          <div
            className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] p-6 md:p-8 flex flex-col relative overflow-visible shadow-2xl transition-all border border-white/10"
            style={{ background: COVER_GRADIENTS[coverIdx] }}
            onClick={() => {
              setShowThemeDropdown(false);
              setShowColorDropdown(false);
            }}
          >
            {coverUrl && (
              <img
                src={coverUrl}
                alt="Cover"
                className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-overlay pointer-events-none"
              />
            )}

            {/* Cropper Modal */}
            <AnimatePresence>
              {cropModalOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-10"
                >
                  <div className="w-full max-w-4xl bg-[#0A0A0A] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    <div className="p-5 border-b border-white/5 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">
                          Crop Cover Image
                        </h3>
                        <p className="text-[10px] text-white/40 mt-1">
                          Aspect Ratio Fixed at 16:9 (Output: 1280x720px) • Max
                          1MB
                        </p>
                      </div>
                      <button
                        onClick={() => setCropModalOpen(false)}
                        className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="relative w-full h-[50vh] bg-[#111]">
                      <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1280 / 720}
                        onCropChange={setCrop}
                        onCropComplete={(p, px) => setCroppedAreaPixels(px)}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="p-6 bg-[#0A0A0A] flex items-center justify-between">
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        className="w-1/3 accent-[#D4AF78]"
                      />
                      <button
                        onClick={handleUploadCroppedImage}
                        disabled={isUploadingCover}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-50"
                        style={{
                          background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                          color: "#000",
                        }}
                      >
                        {isUploadingCover ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />{" "}
                            Processing...
                          </>
                        ) : (
                          <>
                            <Crop size={14} /> Confirm & Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mb-4 relative z-[60]">
              <span
                className="text-[10px] font-black font-mono tracking-widest"
                style={{ color: textColor, opacity: 0.6 }}
              >
                COVER & META
              </span>

              <div className="flex items-center gap-2 relative">
                {/* Theme Dropdown Toggle */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Canvas Theme"
                    onClick={() => {
                      setShowThemeDropdown(!showThemeDropdown);
                      setShowColorDropdown(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-white shadow-xl hover:scale-110 transition-transform"
                    style={{ background: COVER_GRADIENTS[coverIdx] }}
                  />
                  <AnimatePresence>
                    {showThemeDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-8 right-0 bg-[#111] border border-white/10 p-3 rounded-2xl shadow-2xl w-[200px] z-[100]"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3">
                          Themes
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {COVER_GRADIENTS.map((g, i) => (
                            <button
                              key={i}
                              title={`Theme ${i + 1}`}
                              onClick={() => {
                                setCoverIdx(i);
                                setTextColor(THEME_TEXT_COLORS[i]);
                                setShowThemeDropdown(false);
                              }}
                              className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                              style={{
                                background: g,
                                borderColor:
                                  coverIdx === i ? "#fff" : "transparent",
                              }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Text Color Dropdown Toggle */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    title="Text Color"
                    onClick={() => {
                      setShowColorDropdown(!showColorDropdown);
                      setShowThemeDropdown(false);
                    }}
                    className="w-6 h-6 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                    style={{ background: textColor }}
                  >
                    <span
                      className="text-[10px] font-bold mix-blend-difference"
                      style={{
                        color: textColor === "#ffffff" ? "#000" : "#fff",
                      }}
                    >
                      A
                    </span>
                  </button>
                  <AnimatePresence>
                    {showColorDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-8 right-0 bg-[#111] border border-white/10 p-3 rounded-2xl shadow-2xl w-[240px] z-[100] overflow-hidden"
                      >
                        <AnimatePresence mode="wait">
                          {colorMode === "presets" ? (
                            <motion.div
                              key="presets"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ duration: 0.15 }}
                            >
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-3">
                                Default Colors
                              </p>
                              <div className="flex flex-wrap gap-2.5">
                                {/* Canva-style Rainbow Plus Button */}
                                <button
                                  title="Add Custom Color"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setColorMode("custom");
                                  }}
                                  className="w-[26px] h-[26px] rounded-full border border-white/10 shadow-md flex items-center justify-center hover:scale-110 transition-transform overflow-hidden relative"
                                >
                                  <div
                                    className="absolute inset-0"
                                    style={{
                                      background:
                                        "conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                                    }}
                                  />
                                  <div className="relative z-10 w-full h-full bg-black/20 flex items-center justify-center backdrop-blur-[1px]">
                                    <Plus
                                      size={14}
                                      color="white"
                                      className="drop-shadow-md"
                                    />
                                  </div>
                                </button>
                                {PRESET_COLORS.map((c) => (
                                  <button
                                    key={c}
                                    title={c}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTextColor(c);
                                    }}
                                    className="w-[26px] h-[26px] rounded-full border-2 hover:scale-110 transition-all shadow-sm"
                                    style={{
                                      background: c,
                                      borderColor:
                                        textColor.toLowerCase() ===
                                        c.toLowerCase()
                                          ? "#BFA264"
                                          : "rgba(255,255,255,0.15)",
                                    }}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="custom"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.15 }}
                              className="flex flex-col gap-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setColorMode("presets");
                                  }}
                                  className="p-1 rounded-md hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/50">
                                  Custom Color
                                </p>
                              </div>

                              <div
                                className="custom-color-picker-wrapper w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <HexColorPicker
                                  color={textColor}
                                  onChange={setTextColor}
                                  style={{ width: "100%", height: "140px" }}
                                />
                              </div>

                              <div
                                className="flex items-center gap-2 bg-black/50 p-2 rounded-lg border border-white/5 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  className="w-5 h-5 rounded shadow-inner shrink-0"
                                  style={{
                                    background: textColor,
                                    border: "1px solid rgba(255,255,255,0.2)",
                                  }}
                                />
                                <span className="text-[#888] text-xs font-mono">
                                  #
                                </span>
                                <input
                                  type="text"
                                  title="Hex Code"
                                  value={textColor.replace("#", "")}
                                  onChange={(e) =>
                                    setTextColor(`#${e.target.value}`)
                                  }
                                  className="flex-1 bg-transparent text-xs font-mono text-white outline-none uppercase"
                                  maxLength={6}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* New Full Width Cover Image Uploader */}
            <label
              className="w-full relative z-[60] flex flex-col items-center justify-center py-4 mb-6 rounded-xl border-2 border-dashed transition-all cursor-pointer group hover:bg-black/40"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.2)",
                color: textColor,
              }}
            >
              <div className="flex items-center gap-2 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <ImageIcon size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {coverUrl ? "Change Cover Image" : "Upload Cover Image"}
                </span>
              </div>
              <span className="text-[8px] font-mono opacity-40">
                1280 x 720px (Max 1MB)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="hidden"
              />
            </label>

            <textarea
              value={title}
              onChange={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
                setTitle(e.target.value);
              }}
              placeholder="Title..."
              className="colored-placeholder font-display font-black text-4xl leading-tight resize-none overflow-hidden bg-transparent border-none outline-none mb-2"
              style={{ color: textColor }}
              rows={1}
              maxLength={70}
            />

            <input
              value={subtext}
              onChange={(e) => setSubtext(e.target.value)}
              placeholder="Subtext..."
              className="colored-placeholder font-display font-bold text-lg md:text-xl bg-transparent border-none outline-none mb-6 w-full"
              style={{ color: textColor, opacity: 0.8 }}
              maxLength={20}
            />

            <textarea
              value={description}
              onChange={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
                setDescription(e.target.value);
              }}
              placeholder="Brief description..."
              className="colored-placeholder text-base md:text-lg leading-relaxed resize-none overflow-hidden bg-transparent border-none outline-none w-full mb-6"
              style={{ color: textColor, opacity: 0.9 }}
              maxLength={200}
              rows={2}
            />

            <div className="mt-auto space-y-4 md:space-y-6">
              {/* Tag Manager */}
              <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/5">
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="bg-white/10 text-white border border-white/10 rounded-full px-2 py-1 text-[10px] flex items-center gap-1 font-black tracking-widest uppercase"
                    >
                      {t}
                      <X
                        size={10}
                        className="cursor-pointer hover:text-red-400"
                        onClick={() =>
                          setTags((prev) => prev.filter((tag) => tag !== t))
                        }
                      />
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={handleTagChange}
                  placeholder={
                    tags.length < 10
                      ? "Add tag (type ',')"
                      : "Max 10 tags reached"
                  }
                  disabled={tags.length >= 10}
                  className="text-xs bg-transparent border-none outline-none text-white placeholder-white/30 w-full font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2...N: Execution Blocks */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[150]">
            <EditorToolbar editor={activeEditor} />
          </div>

          <AnimatePresence>
            {blocks.map((block, idx) => (
              <motion.div
                key={block.id}
                layout
                // Stable query target — replaces raw el.children[idx+2] indexing
                data-slide-idx={idx}
                initial={{ opacity: 0, scale: 0.88, x: 60 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  transition: { type: "spring", damping: 24, stiffness: 220 },
                }}
                exit={{
                  opacity: 0,
                  y: -72,
                  scale: 0.82,
                  filter: "blur(8px)",
                  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
                }}
                className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] p-6 md:p-8 flex flex-col relative shadow-2xl border border-white/10"
                style={{ background: COVER_GRADIENTS[coverIdx] }}
              >
                <TipTapPageEditor
                  block={block}
                  idx={idx}
                  total={blocks.length}
                  onUpdate={updateBlock}
                  onDelete={deleteBlock}
                  onMove={moveBlock}
                  textColor={textColor}
                  onAdvancePage={handleAdvancePage}
                  onBulkPaste={handleBulkPaste}
                  setActiveEditor={setActiveEditor}
                  shouldFocus={focusNextIdx === idx}
                  onFocusConsumed={() => setFocusNextIdx(null)}
                />
              </motion.div>
            ))}{" "}
          </AnimatePresence>

          {/* Card N+1: Add Slide Action */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={addSlide}
            className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer group transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "2px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 group-hover:scale-110 transition-all">
              <Plus
                size={28}
                className="text-white/40 group-hover:text-white transition-colors"
              />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/80 transition-colors">
              Add New Page
            </span>
          </motion.div>

          {/* Dummy spacer to ensure right-padding on mobile scroll */}
          <div className="shrink-0 w-[5vw] md:w-[15vw] h-1" />
        </div>
      </motion.div>
    );
  },
);

/* ─── Tag Pill ────────────────────────────────────────────────────────────── */
const TagPill = memo(({ active, onClick, label }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="shrink-0 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all"
    style={{
      background: active ? G.dimBg : "transparent",
      color: active ? G.bright : T.dim,
      borderColor: active ? G.border : "rgba(255,255,255,0.06)",
    }}
  >
    {label}
  </motion.button>
));

/* ─── Skeletons ──────────────────────────────────────────────────────────── */
const PulseBox = memo(({ className, style }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.65, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    className={cn("rounded-xl", className)}
    style={{
      background: `linear-gradient(90deg,${V.surface},${V.elevated},${V.surface})`,
      ...style,
    }}
  />
));

const ColistCardSkeleton = () => (
  <div
    className="flex flex-col rounded-2xl overflow-hidden"
    style={{
      background: V.surface,
      border: "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <PulseBox style={{ height: 112 }} className="rounded-none" />
    <div className="p-4 space-y-2.5">
      <PulseBox style={{ height: 18, width: "72%" }} />
      <PulseBox style={{ height: 13, width: "100%" }} />
      <PulseBox style={{ height: 13, width: "60%" }} />
    </div>
  </div>
);

/* ─── Feed View ───────────────────────────────────────────────────────────── */
const ColistFeed = memo(({ onOpenReader, currentUser }) => {
  const uid = currentUser?.uid;
  const [colists, setColists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [activeVerification, setActiveVerification] = useState(null);
  const [view, setView] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;
  const fetchedRef = useRef(false);

  // User progress for all colists
  const progressMap = useMemo(() => {
    if (!uid || !colists.length) return {};
    const map = {};
    colists.forEach((c) => {
      map[c.id] = getProgress(uid, c.id);
    });
    return map;
  }, [uid, colists]);

  const fetchColists = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
        setLastDoc(null);
      } else setLoadingMore(true);
      try {
        const constraints = [
          where("isPublic", "==", true),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE),
        ];
        if (!reset && lastDoc) constraints.push(startAfter(lastDoc));
        const snap = await getDocs(
          query(collection(db, "colists"), ...constraints),
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setColists((prev) => (reset ? items : [...prev, ...items]));
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [lastDoc],
  );

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchColists(true);
  }, [fetchColists]);

  const allTags = useMemo(() => {
    const s = new Set();
    colists.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return [...s].slice(0, 10);
  }, [colists]);

  const filtered = useMemo(() => {
    let list = colists;
    if (activeTag)
      list = list.filter((c) => (c.tags || []).includes(activeTag));
    if (activeVerification)
      list = list.filter((c) => c.verificationTier === activeVerification);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          (c.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          c.authorUsername?.toLowerCase().includes(q),
      );
    }
    // Sort: originals first, then by colistScore
    return [...list].sort((a, b) => {
      if (
        a.verificationTier === "original" &&
        b.verificationTier !== "original"
      )
        return -1;
      if (
        b.verificationTier === "original" &&
        a.verificationTier !== "original"
      )
        return 1;
      return (b.colistScore || 0) - (a.colistScore || 0);
    });
  }, [colists, activeTag, activeVerification, search]);

  return (
    <div className="min-h-screen" style={{ background: V.bg }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%,rgba(191,162,100,0.15) 0%,transparent 60%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 pt-10 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={11} style={{ color: G.base }} />
              <span
                className="text-[9px] font-black uppercase tracking-[0.3em]"
                style={{ color: G.base }}
              >
                Knowledge Carousel
              </span>
            </div>
            <h1
              className="font-display font-black leading-none mb-3"
              style={{
                fontSize: "clamp(2rem,6vw,3.5rem)",
                letterSpacing: "-0.04em",
                color: T.primary,
              }}
            >
              Discotive Colists.
            </h1>
            <p
              className="text-sm md:text-base max-w-lg leading-relaxed"
              style={{ color: T.secondary }}
            >
              Curated execution intelligence from top operators.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-50 py-3 px-5 md:px-10"
        style={{
          background: `${V.bg}E8`,
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#888" }}
              />
              <input
                type="text"
                placeholder="Search colists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium outline-none transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: T.primary,
                }}
              />
            </div>
            <div
              className="relative flex items-center p-1 rounded-xl border w-[80px]"
              style={{ background: "#111", borderColor: "#222" }}
            >
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg"
                animate={{
                  left: view === "grid" ? "4px" : "calc(50% + 2px)",
                  width: "calc(50% - 6px)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                style={{
                  background: "linear-gradient(135deg, #8B7240, #D4AF78)",
                }}
              />
              {[
                { id: "grid", I: LayoutGrid },
                { id: "list", I: List },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className="relative flex-1 py-1.5 rounded-lg z-10 flex items-center justify-center"
                  style={{ color: view === v.id ? "#000" : "#555" }}
                >
                  <v.I size={13} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="relative flex items-center justify-center w-[42px] h-[38px] rounded-xl border transition-all"
              style={{
                background: showFilters ? G.dimBg : "#111",
                borderColor: showFilters ? G.border : "#222",
                color: showFilters ? G.bright : "#888",
              }}
            >
              <Filter size={15} />
              {(activeVerification || activeTag) && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#4ADE80] rounded-full shadow-[0_0_5px_#4ADE80]" />
              )}
            </button>
          </div>

          {/* Desktop Expanding Filter Bar */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, marginTop: 0 }}
                animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                exit={{ height: 0, opacity: 0, marginTop: 0 }}
                className="hidden md:flex overflow-hidden"
              >
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5 items-center w-full">
                  <TagPill
                    active={!activeVerification && !activeTag}
                    onClick={() => {
                      setActiveVerification(null);
                      setActiveTag(null);
                    }}
                    label="All"
                  />
                  <div
                    className="w-px h-4 mx-1"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                  {["original", "strong", "medium"].map((tier) => (
                    <motion.button
                      key={tier}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setActiveVerification(
                          activeVerification === tier ? null : tier,
                        )
                      }
                      className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all"
                      style={{
                        background:
                          activeVerification === tier
                            ? VERIFICATION_TIERS[tier].bg
                            : "transparent",
                        color:
                          activeVerification === tier
                            ? VERIFICATION_TIERS[tier].color
                            : T.dim,
                        borderColor:
                          activeVerification === tier
                            ? VERIFICATION_TIERS[tier].border
                            : "rgba(255,255,255,0.06)",
                        boxShadow:
                          activeVerification === tier
                            ? VERIFICATION_TIERS[tier].glow
                            : "none",
                      }}
                    >
                      {tier === "original" ? (
                        <>
                          <Star size={8} /> Original
                        </>
                      ) : tier === "strong" ? (
                        <>
                          <Award size={8} /> Strong
                        </>
                      ) : (
                        tier
                      )}
                    </motion.button>
                  ))}
                  <div
                    className="w-px h-4 mx-1"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                  />
                  {allTags.map((tag) => (
                    <TagPill
                      key={tag}
                      active={activeTag === tag}
                      onClick={() =>
                        setActiveTag(activeTag === tag ? null : tag)
                      }
                      label={tag}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Right Sidebar Filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div key="mobile-filter-sidebar" className="md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-[85vw] max-w-[320px] bg-[#0A0A0A] border-l border-white/5 shadow-2xl z-[9999] flex flex-col py-6"
            >
              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/5 shrink-0">
                <span className="font-extrabold text-sm tracking-widest text-[#F5F0E8] uppercase">
                  Filters
                </span>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-[#F5F0E8] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Status */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#555]">
                    Verification
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <TagPill
                      active={!activeVerification}
                      onClick={() => setActiveVerification(null)}
                      label="All"
                    />
                    {["original", "strong", "medium"].map((tier) => (
                      <motion.button
                        key={tier}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          setActiveVerification(
                            activeVerification === tier ? null : tier,
                          )
                        }
                        className="shrink-0 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all"
                        style={{
                          background:
                            activeVerification === tier
                              ? VERIFICATION_TIERS[tier].bg
                              : "transparent",
                          color:
                            activeVerification === tier
                              ? VERIFICATION_TIERS[tier].color
                              : T.dim,
                          borderColor:
                            activeVerification === tier
                              ? VERIFICATION_TIERS[tier].border
                              : "rgba(255,255,255,0.06)",
                          boxShadow:
                            activeVerification === tier
                              ? VERIFICATION_TIERS[tier].glow
                              : "none",
                        }}
                      >
                        {tier === "original" ? (
                          <>
                            <Star size={8} /> Original
                          </>
                        ) : tier === "strong" ? (
                          <>
                            <Award size={8} /> Strong
                          </>
                        ) : (
                          tier
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div className="space-y-3 border-t border-white/5 pt-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#555]">
                    Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <TagPill
                      active={!activeTag}
                      onClick={() => setActiveTag(null)}
                      label="All Topics"
                    />
                    {allTags.map((tag) => (
                      <TagPill
                        key={tag}
                        active={activeTag === tag}
                        onClick={() =>
                          setActiveTag(activeTag === tag ? null : tag)
                        }
                        label={tag}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowFilters(false)}
                  className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-[#000]"
                  style={{
                    background: "linear-gradient(135deg, #8B7240, #D4AF78)",
                  }}
                >
                  Apply Filters
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid / List */}
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-6">
        {loading ? (
          <div
            className={cn(
              "gap-4",
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col",
            )}
          >
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <ColistCardSkeleton key={i} />
              ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <BookOpen
              size={48}
              className="mx-auto mb-5 opacity-10"
              style={{ color: T.primary }}
            />
            <p
              className="text-lg font-black mb-2"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              No colists found.
            </p>
            <p className="text-xs mb-6" style={{ color: T.dim }}>
              {search
                ? `No results for "${search}"`
                : "Be the first to publish one."}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "gap-4",
              view === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "flex flex-col",
            )}
          >
            {filtered.map((c) => (
              <ColistCard
                key={c.id}
                colist={c}
                view={view}
                onRead={onOpenReader}
                progress={progressMap[c.id]}
              />
            ))}
          </div>
        )}
        {hasMore && !loading && filtered.length > 0 && (
          <div className="flex justify-center mt-10">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fetchColists(false)}
              disabled={loadingMore}
              className="flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest"
              style={{
                background: V.surface,
                color: T.secondary,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={11} className="animate-spin" /> Loading...
                </>
              ) : (
                <>
                  Load More <ChevronRight size={11} />
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
});

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const Colists = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userData } = useUserData();
  const outletContext = useOutletContext();
  const showBottomNav = outletContext?.showBottomNav ?? true;

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeColist, setActiveColist] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editColistTarget, setEditColistTarget] = useState(null);
  const [forkTarget, setForkTarget] = useState(null);
  const [showForkModal, setShowForkModal] = useState(false);

  // Expand clearance to include Admin entities
  const isPro =
    userData?.tier === "PRO" ||
    userData?.tier === "ENTERPRISE" ||
    userData?.tier === "ADMIN" ||
    userData?.role === "admin";

  // Auto-load colist from slug
  useEffect(() => {
    if (!slug || slug === "new" || slug === "profile") {
      setTimeout(() => setActiveColist(null), 0);
      return;
    }
    const loadColist = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "colists"),
            where("slug", "==", slug),
            where("isPublic", "==", true),
            limit(1),
          ),
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          setActiveColist({ id: d.id, ...d.data() });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadColist();
  }, [slug]);

  // Handle /colists/new & /colists/profile gates
  useEffect(() => {
    if (slug === "profile") {
      if (!currentUser) {
        navigate("/auth");
      }
      return;
    }
    if (slug !== "new") return;
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    if (userData && !isPro) {
      setTimeout(() => setShowPremiumModal(true), 0);
      navigate("/colists", { replace: true });
    } else if (isPro) {
      setTimeout(() => setShowEditor(true), 0);
    }
  }, [slug, currentUser, userData, isPro, navigate]);

  const handleCreateClick = useCallback(() => {
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    navigate("/colists/new");
  }, [currentUser, isPro, navigate]);

  const handleOpenReader = useCallback(
    (colist) => {
      setActiveColist(colist);
      navigate(`/colists/${colist.slug}`, { replace: false });
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    setActiveColist(null);
    navigate("/colists", { replace: true });
  }, [navigate]);

  const handleEdit = useCallback((colist) => {
    setEditColistTarget(colist);
    setShowEditor(true);
    // Elevate UX: Update the URL to reflect the draft without unmounting the profile backdrop
    window.history.pushState(
      { modal: "editor" },
      "",
      `/colists/${colist.slug || colist.id}/unpublished`,
    );
  }, []);

  // Architect Grade: Ensure browser back button elegantly closes the editor modal
  useEffect(() => {
    const handlePopState = () => {
      if (showEditor && !window.location.pathname.includes("/unpublished")) {
        setShowEditor(false);
        setEditColistTarget(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showEditor]);

  return (
    <>
      <Helmet>
        <title>
          {slug === "profile"
            ? "My Profile — Discotive Colists"
            : activeColist
              ? `${activeColist.title} — Discotive Colists`
              : "Discotive Colists | Knowledge Carousel"}
        </title>
        <meta
          name="description"
          content={
            activeColist?.description ||
            "Curated execution intelligence from top operators on Discotive."
          }
        />
        {activeColist?.slug && (
          <link
            rel="canonical"
            href={`https://discotive.in/colists/${activeColist.slug}`}
          />
        )}
      </Helmet>

      {slug === "profile" ? (
        <ColistsProfile onRead={handleOpenReader} onEdit={handleEdit} />
      ) : activeColist ? (
        <ColistReader
          colist={activeColist}
          onBack={handleBack}
          currentUser={currentUser}
        />
      ) : (
        <ColistFeed onOpenReader={handleOpenReader} currentUser={currentUser} />
      )}

      {/* Create FAB */}
      {!activeColist && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            y: showBottomNav
              ? 0
              : typeof window !== "undefined" && window.innerWidth < 768
                ? 60
                : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          onClick={handleCreateClick}
          className="fixed right-5 md:right-10 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-10 w-14 h-14 md:w-[68px] md:h-[68px] rounded-full md:rounded-[24px] flex items-center justify-center shadow-2xl z-[90]"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #D4AF78)",
            color: "#000",
            boxShadow: "0 10px 40px rgba(191,162,100,0.3)",
          }}
        >
          <Plus strokeWidth={2.5} className="w-7 h-7 md:w-8 md:h-8" />
        </motion.button>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && isPro && (
          <ColistEditor
            initialColist={editColistTarget}
            onClose={() => {
              setShowEditor(false);
              setEditColistTarget(null);
              if (slug === "new") {
                navigate("/colists");
              } else if (window.location.pathname.includes("/unpublished")) {
                // Intelligent cleanup: revert URL to profile seamlessly
                if (window.history.state?.modal === "editor") {
                  window.history.back();
                } else {
                  window.history.replaceState(null, "", "/colists/profile");
                }
              }
            }}
            userData={userData}
            currentUser={currentUser}
            onPublish={(newSlugStr) => {
              setShowEditor(false);
              // If it was an existing draft, newSlugStr might be "published".
              // We grab the actual slug from the current URL to ensure a clean redirect.
              const currentPath = window.location.pathname;
              let finalSlug = newSlugStr;

              if (newSlugStr === "published") {
                // Extract the true slug from /colists/the-actual-slug/unpublished
                const pathParts = currentPath.split("/");
                // e.g. ["", "colists", "my-slug-123456", "unpublished"]
                finalSlug = pathParts[2];
              }

              navigate(`/colists/${finalSlug}`);
            }}
            forkOf={null}
          />
        )}
      </AnimatePresence>

      {/* Fork Modal */}
      <AnimatePresence>
        {showForkModal && forkTarget && (
          <ForkModal
            colist={forkTarget}
            onClose={() => {
              setShowForkModal(false);
              setForkTarget(null);
            }}
            userData={userData}
            currentUser={currentUser}
            onForked={(s) => {
              setShowForkModal(false);
              setForkTarget(null);
              navigate(`/colists/${s}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <PremiumModal
            onClose={() => setShowPremiumModal(false)}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Colists;
