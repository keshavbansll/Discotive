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
import { db } from "../firebase";
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
  Youtube,
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
} from "lucide-react";

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

/* ─── Block Registry ─────────────────────────────────────────────────────── */
const BLOCK_TYPES = [
  {
    id: "insight",
    label: "Insight",
    icon: Zap,
    color: "#D4AF78",
    desc: "Key takeaway or signal",
  },
  {
    id: "quote",
    label: "Quote",
    icon: Quote,
    color: "#a855f7",
    desc: "Pull quote or citation",
  },
  {
    id: "link",
    label: "Link",
    icon: Link2,
    color: "#38bdf8",
    desc: "External resource card",
  },
  {
    id: "code",
    label: "Code",
    icon: Code,
    color: "#4ADE80",
    desc: "Code snippet",
  },
  {
    id: "video",
    label: "Video",
    icon: Youtube,
    color: "#F87171",
    desc: "YouTube embed",
  },
  {
    id: "divider",
    label: "Divider",
    icon: Minus,
    color: "#444",
    desc: "Section separator",
  },
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
  } catch (e) {
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
    <p
      className="text-lg md:text-xl leading-relaxed font-light max-w-2xl"
      style={{ color: T.secondary, whiteSpace: "pre-wrap" }}
    >
      {block.content}
    </p>
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
          className="text-2xl font-black mb-6 self-start max-w-2xl"
          style={{ color: T.primary }}
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
            className="relative w-full h-full cursor-pointer"
            onClick={() => setPlaying(true)}
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex items-center justify-center">
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
      (e) => {},
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
        updateDoc(doc(db, "colists", colist.id), {
          [`pageApplause.${safePage}`]: increment(1),
          colistScore: increment(1),
        }).catch(() => {});
      }
      lastTapRef.current = now;
    },
    [safePage, hasApplauded, colist.id],
  );

  const handleShare = () => {
    navigator.clipboard
      .writeText(`${window.location.origin}/colists/${colist.slug}`)
      .catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2200);
  };

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
          className="shrink-0 rounded-xl w-14 h-14 flex items-center justify-center"
          style={{ background: colist.coverGradient || COVER_GRADIENTS[0] }}
        >
          <BookOpen size={18} style={{ color: "rgba(255,255,255,0.6)" }} />
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
        className="relative h-28 shrink-0 flex items-end justify-between p-3"
        style={{ background: colist.coverGradient || COVER_GRADIENTS[0] }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "rgba(0,0,0,0.2)" }}
        />
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
                border: `1px solid ${G.border}`,
                color: G.base,
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
const ForkModal = memo(({ colist, onClose, userData, onForked }) => {
  const [forking, setForking] = useState(false);
  const [done, setDone] = useState(false);
  const [newSlug, setNewSlug] = useState("");

  const handleFork = async () => {
    if (!userData?.uid) return;
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
        authorId: userData.uid,
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
                Your fork is live with attribution to @{colist.authorUsername}.
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
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <p
                  className="text-xs font-bold mb-1"
                  style={{ color: G.bright }}
                >
                  Attribution Note
                </p>
                <p className="text-[11px]" style={{ color: T.secondary }}>
                  Your fork will permanently credit{" "}
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
});

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

/* ─── Block Editor Row ────────────────────────────────────────────────────── */
const BlockEditorRow = memo(
  ({ block, idx, total, onUpdate, onDelete, onMoveUp, onMoveDown }) => {
    const [open, setOpen] = useState(true);
    const meta = BLOCK_TYPES.find((t) => t.id === block.type);
    const Icon = meta?.icon || Zap;
    const fieldStyle = {
      background: V.depth,
      border: "1px solid rgba(255,255,255,0.07)",
      color: T.primary,
      borderRadius: 12,
      padding: "10px 14px",
      width: "100%",
      outline: "none",
      fontSize: 13,
      fontFamily: "Poppins, sans-serif",
      transition: "border-color 0.2s",
    };
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: V.surface,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
          style={{ background: V.elevated }}
          onClick={() => setOpen((o) => !o)}
        >
          <GripVertical size={12} style={{ color: "#333", cursor: "grab" }} />
          <Icon size={12} style={{ color: meta?.color || G.base }} />
          <span
            className="text-[10px] font-black uppercase tracking-widest flex-1"
            style={{ color: meta?.color || T.dim }}
          >
            {meta?.label || block.type}
          </span>
          <div className="flex items-center gap-0.5">
            {idx > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(idx);
                }}
                className="p-1.5 rounded-lg text-[11px] hover:bg-white/5"
                style={{ color: T.dim }}
              >
                ↑
              </button>
            )}
            {idx < total - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(idx);
                }}
                className="p-1.5 rounded-lg text-[11px] hover:bg-white/5"
                style={{ color: T.dim }}
              >
                ↓
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(idx);
              }}
              className="p-1.5 rounded-lg ml-1 hover:bg-red-500/10"
              style={{ color: "#F87171" }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2.5">
                {(block.type === "insight" || block.type === "quote") && (
                  <>
                    {block.type === "insight" && (
                      <input
                        value={block.title || ""}
                        onChange={(e) =>
                          onUpdate(idx, { ...block, title: e.target.value })
                        }
                        placeholder="Title (optional)"
                        style={fieldStyle}
                      />
                    )}
                    <textarea
                      value={block.content || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, content: e.target.value })
                      }
                      placeholder={
                        block.type === "insight"
                          ? "Your insight..."
                          : "Quote text..."
                      }
                      rows={3}
                      style={{ ...fieldStyle, resize: "none" }}
                    />
                    {block.type === "quote" && (
                      <input
                        value={block.author || ""}
                        onChange={(e) =>
                          onUpdate(idx, { ...block, author: e.target.value })
                        }
                        placeholder="Attribution (optional)"
                        style={fieldStyle}
                      />
                    )}
                  </>
                )}
                {block.type === "link" && (
                  <>
                    <input
                      value={block.url || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, url: e.target.value })
                      }
                      placeholder="https://..."
                      style={fieldStyle}
                    />
                    <input
                      value={block.title || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, title: e.target.value })
                      }
                      placeholder="Link title"
                      style={fieldStyle}
                    />
                    <input
                      value={block.description || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, description: e.target.value })
                      }
                      placeholder="Description (optional)"
                      style={fieldStyle}
                    />
                  </>
                )}
                {block.type === "code" && (
                  <>
                    <input
                      value={block.language || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, language: e.target.value })
                      }
                      placeholder="Language"
                      style={fieldStyle}
                    />
                    <textarea
                      value={block.content || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, content: e.target.value })
                      }
                      placeholder="// Code here..."
                      rows={7}
                      style={{
                        ...fieldStyle,
                        background: "#0d1117",
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#e6edf3",
                        border: "1px solid rgba(74,222,128,0.2)",
                        resize: "none",
                      }}
                    />
                  </>
                )}
                {block.type === "video" && (
                  <>
                    <input
                      value={block.url || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, url: e.target.value })
                      }
                      placeholder="YouTube URL"
                      style={fieldStyle}
                    />
                    <input
                      value={block.title || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, title: e.target.value })
                      }
                      placeholder="Video title (optional)"
                      style={fieldStyle}
                    />
                  </>
                )}
                {block.type === "divider" && (
                  <p
                    className="text-xs py-2 text-center"
                    style={{ color: T.dim }}
                  >
                    Section separator — no content needed.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

/* ─── Colist Editor ───────────────────────────────────────────────────────── */
const ColistEditor = memo(({ onClose, userData, onPublish, forkOf = null }) => {
  const [step, setStep] = useState("meta");
  const [title, setTitle] = useState(forkOf ? `${forkOf.title} (Fork)` : "");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [coverIdx, setCoverIdx] = useState(0);
  const [blocks, setBlocks] = useState(forkOf?.blocks || []);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validBlocks = useMemo(
    () =>
      blocks.filter(
        (b) =>
          b.type === "divider" ||
          b.content?.trim() ||
          b.url?.trim() ||
          b.title?.trim(),
      ),
    [blocks],
  );
  const canPublish = title.trim().length >= 3 && validBlocks.length >= 1;

  const addBlock = useCallback((type) => {
    setBlocks((prev) => [
      ...prev,
      {
        id: createBlockId(),
        type,
        content: "",
        title: "",
        description: "",
        url: "",
        language: "",
        author: "",
        youtubeId: "",
      },
    ]);
    setShowBlockPicker(false);
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
  const moveUp = useCallback((idx) => {
    if (idx === 0) return;
    setBlocks((prev) => {
      const n = [...prev];
      [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
      return n;
    });
  }, []);
  const moveDown = useCallback(
    (idx) =>
      setBlocks((prev) => {
        if (idx >= prev.length - 1) return prev;
        const n = [...prev];
        [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
        return n;
      }),
    [],
  );

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
    [tags],
  );

  const handleDescChange = useCallback((e) => {
    setDescription(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  }, []);

  const handlePublish = async () => {
    if (!canPublish) {
      setError(
        validBlocks.length === 0
          ? "Add at least 1 page."
          : "Title must be at least 3 characters.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const slug = generateSlug(title.trim());
      const finalTags = [...tags, tagInput]
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5);
      await addDoc(collection(db, "colists"), {
        title: title.trim(),
        slug,
        description: description.trim(),
        tags: finalTags,
        coverGradient: COVER_GRADIENTS[coverIdx],
        blocks: validBlocks,
        authorId: userData.uid,
        authorUsername: userData.identity?.username || "operator",
        authorName:
          `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
          "Operator",
        authorAvatar: userData.identity?.avatarUrl || null,
        isPublic: true,
        viewCount: 0,
        saveCount: 0,
        colistScore: 0,
        colistScoreMilestone: 0,
        ...(forkOf ? { forkOf } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onPublish?.(slug);
    } catch (err) {
      console.error(err);
      setError("Failed to publish. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase = {
    background: V.surface,
    border: "1px solid rgba(255,255,255,0.07)",
    color: T.primary,
    borderRadius: 14,
    padding: "12px 16px",
    width: "100%",
    outline: "none",
    fontFamily: "Poppins, sans-serif",
    transition: "border-color 0.2s",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "3%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "3%" }}
      transition={{ type: "spring", damping: 32, stiffness: 220 }}
      className="fixed inset-0 z-[500] flex flex-col overflow-hidden"
      style={{ background: V.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 md:px-8 py-4 shrink-0"
        style={{
          background: V.depth,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
            style={{ color: T.dim }}
          >
            <X size={16} />
          </button>
          {forkOf && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <GitFork size={10} style={{ color: G.bright }} />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: G.bright }}
              >
                Fork of @{forkOf.authorUsername}
              </span>
            </div>
          )}
          <div
            className="relative flex items-center p-1 rounded-xl border w-[160px]"
            style={{ background: "#111", borderColor: "#222" }}
          >
            <motion.div
              className="absolute top-1 bottom-1 rounded-lg"
              animate={{
                left: step === "meta" ? "4px" : "calc(50% + 2px)",
                width: "calc(50% - 6px)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              style={{ background: "linear-gradient(135deg,#8B7240,#D4AF78)" }}
            />
            {[
              { id: "meta", label: "Details" },
              { id: "blocks", label: `Pages (${validBlocks.length})` },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className="relative flex-1 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all z-10 flex items-center justify-center"
                style={{ color: step === s.id ? "#000" : "#555" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <p className="text-[10px] text-red-400 font-bold hidden md:block">
              {error}
            </p>
          )}
          <motion.button
            whileHover={canPublish ? { scale: 1.04 } : {}}
            whileTap={canPublish ? { scale: 0.96 } : {}}
            onClick={handlePublish}
            disabled={saving || !canPublish}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest disabled:opacity-35"
            style={{
              background: "linear-gradient(135deg,#8B7240,#D4AF78)",
              color: "#000",
            }}
          >
            {saving ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Globe size={12} />
            )}
            Publish
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto px-5 py-8">
          <AnimatePresence mode="wait">
            {step === "meta" ? (
              <motion.div
                key="meta"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                {/* Cover picker */}
                <div>
                  <label
                    className="block text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ color: T.dim }}
                  >
                    Cover Style
                  </label>
                  <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
                    {COVER_GRADIENTS.map((g, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCoverIdx(i)}
                        className="shrink-0 rounded-xl transition-all"
                        style={{
                          width: 60,
                          height: 36,
                          background: g,
                          border:
                            coverIdx === i
                              ? `2px solid ${G.bright}`
                              : "2px solid transparent",
                          boxShadow:
                            coverIdx === i
                              ? `0 0 14px rgba(191,162,100,0.4)`
                              : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="w-full h-20 rounded-2xl flex items-end p-4"
                  style={{ background: COVER_GRADIENTS[coverIdx] }}
                >
                  <span
                    className="text-sm font-black leading-tight truncate"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {title || "Your Colist Title"}
                  </span>
                </div>
                <style>{`
                  .netflix-input-group { position: relative; width: 100%; }
                  .netflix-input {
                    width: 100%; background: #0F0F0F; border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 14px; padding: 26px 16px 8px 16px; color: #F5F0E8;
                    font-family: 'Poppins', sans-serif; outline: none; transition: all 0.2s;
                  }
                  .netflix-input::placeholder { color: transparent; }
                  .netflix-input:focus { border-color: rgba(191,162,100,0.5); background: #141414; }
                  .netflix-floating-label {
                    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                    font-size: 14px; color: rgba(245,240,232,0.28); pointer-events: none;
                    transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1); font-family: 'Poppins', sans-serif;
                  }
                  .netflix-input-group textarea.netflix-input ~ .netflix-floating-label { top: 24px; }
                  .netflix-input:focus ~ .netflix-floating-label,
                  .netflix-input:not(:placeholder-shown) ~ .netflix-floating-label {
                    top: 14px; transform: translateY(0); font-size: 9px; font-weight: 700;
                    letter-spacing: 0.15em; text-transform: uppercase; color: #D4AF78;
                  }
                  .netflix-input-group textarea.netflix-input:focus ~ .netflix-floating-label,
                  .netflix-input-group textarea.netflix-input:not(:placeholder-shown) ~ .netflix-floating-label {
                    top: 14px;
                  }
                `}</style>
                <div className="netflix-input-group">
                  <input
                    className="netflix-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder=" "
                    maxLength={100}
                    style={{ fontSize: 16, fontWeight: 800, height: 60 }}
                  />
                  <label className="netflix-floating-label">Title *</label>
                  <span
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 18,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    {title.length}/100
                  </span>
                </div>
                <div className="netflix-input-group">
                  <textarea
                    className="netflix-input custom-scrollbar"
                    value={description}
                    onChange={handleDescChange}
                    placeholder=" "
                    maxLength={200}
                    rows={1}
                    style={{ resize: "none", overflowY: "auto", minHeight: 60 }}
                  />
                  <label className="netflix-floating-label">Description</label>
                  <span
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 18,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    {description.length}/200
                  </span>
                </div>
                <div
                  className="netflix-input-group"
                  style={{
                    background: "#0F0F0F",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: "26px 16px 8px 16px",
                    minHeight: 60,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    {tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          background: G.dimBg,
                          color: G.bright,
                          border: `1px solid ${G.border}`,
                          borderRadius: 99,
                          padding: "2px 8px",
                          fontSize: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          zIndex: 2,
                        }}
                      >
                        {t}{" "}
                        <X
                          size={10}
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            setTags((prev) => prev.filter((tag) => tag !== t))
                          }
                        />
                      </span>
                    ))}
                    <input
                      value={tagInput}
                      onChange={handleTagChange}
                      placeholder=" "
                      style={{
                        flex: 1,
                        minWidth: 100,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: T.primary,
                        fontSize: 13,
                        padding: 0,
                      }}
                    />
                  </div>
                  <label
                    className="netflix-floating-label"
                    style={{
                      top: tags.length > 0 || tagInput ? 14 : "50%",
                      fontSize: tags.length > 0 || tagInput ? 9 : 14,
                      fontWeight: tags.length > 0 || tagInput ? 700 : 400,
                      color:
                        tags.length > 0 || tagInput
                          ? "#D4AF78"
                          : "rgba(245,240,232,0.28)",
                      textTransform:
                        tags.length > 0 || tagInput ? "uppercase" : "none",
                      letterSpacing:
                        tags.length > 0 || tagInput ? "0.15em" : "normal",
                    }}
                  >
                    Tags (Max 10, add ',')
                  </label>
                  <span
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 14,
                      fontSize: 10,
                      color: "rgba(255,255,255,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    {tags.length}/10
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("blocks")}
                  className="w-full py-4 rounded-2xl flex items-center justify-center mt-2"
                  style={{
                    background:
                      "linear-gradient(to right, #848484, #c2c2c2, #d8d8d8, #ffffff)",
                    color: "#000",
                    border: "none",
                  }}
                >
                  <ArrowRight size={24} strokeWidth={2.5} />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="blocks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    {validBlocks.length} valid page
                    {validBlocks.length !== 1 ? "s" : ""}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBlockPicker((p) => !p)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
                    style={{
                      background: showBlockPicker ? G.dimBg : V.surface,
                      color: G.bright,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <Plus size={11} strokeWidth={3} /> Add Page
                  </motion.button>
                </div>
                <AnimatePresence>
                  {showBlockPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="grid grid-cols-2 gap-2 p-4 rounded-2xl mb-2"
                      style={{
                        background: V.elevated,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {BLOCK_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <motion.button
                            key={t.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => addBlock(t.id)}
                            className="flex items-center gap-2.5 p-3 rounded-xl text-left"
                            style={{
                              background: V.surface,
                              border: `1px solid ${t.color}22`,
                            }}
                          >
                            <Icon size={14} style={{ color: t.color }} />
                            <div>
                              <p
                                className="text-xs font-bold"
                                style={{ color: T.primary }}
                              >
                                {t.label}
                              </p>
                              <p
                                className="text-[9px]"
                                style={{ color: T.dim }}
                              >
                                {t.desc}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
                {error && (
                  <div
                    className="px-4 py-3 rounded-xl text-[11px] font-bold"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.2)",
                      color: "#F87171",
                    }}
                  >
                    {error}
                  </div>
                )}
                {blocks.length === 0 ? (
                  <div
                    className="py-16 text-center rounded-2xl border-2 border-dashed"
                    style={{ borderColor: "rgba(255,255,255,0.07)" }}
                  >
                    <Plus
                      size={32}
                      className="mx-auto mb-3 opacity-15"
                      style={{ color: T.primary }}
                    />
                    <p
                      className="text-sm font-black mb-1"
                      style={{ color: "rgba(255,255,255,0.18)" }}
                    >
                      No pages yet.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {blocks.map((block, idx) => (
                      <motion.div
                        key={block.id}
                        layout
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, height: 0 }}
                      >
                        <BlockEditorRow
                          block={block}
                          idx={idx}
                          total={blocks.length}
                          onUpdate={updateBlock}
                          onDelete={deleteBlock}
                          onMoveUp={moveUp}
                          onMoveDown={moveDown}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

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
const ColistFeed = memo(({ onOpenReader, onCreateClick, currentUser }) => {
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
  const [forkTarget, setForkTarget] = useState(null);
  const [showForkModal, setShowForkModal] = useState(false);

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  // Auto-load colist from slug
  useEffect(() => {
    if (!slug || slug === "new") {
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

  // Handle /colists/new gate
  useEffect(() => {
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

  return (
    <>
      <Helmet>
        <title>
          {activeColist
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

      {activeColist ? (
        <ColistReader
          colist={activeColist}
          onBack={handleBack}
          currentUser={currentUser}
        />
      ) : (
        <ColistFeed
          onOpenReader={handleOpenReader}
          onCreateClick={handleCreateClick}
          currentUser={currentUser}
        />
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
            onClose={() => {
              setShowEditor(false);
              if (slug === "new") navigate("/colists");
            }}
            userData={userData}
            onPublish={(s) => {
              setShowEditor(false);
              navigate(`/colists/${s}`);
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
