/**
 * @fileoverview Discotive Colists — Curated Execution Playlists
 * @description
 * "A Playlist for Execution" — block-based, high-signal content sequences.
 * Directly competes with LinkedIn Articles, but distilled for operators.
 *
 * Routes handled:
 *   /colists         → Feed (public, no auth)
 *   /colists/new     → Create (premium gate)
 *   /colists/:slug   → Reader (public, no auth)
 *
 * Firestore schema — colists/{colistId}:
 *   title, slug, description, tags[], coverGradient
 *   authorId, authorUsername, authorName, authorAvatar
 *   blocks: Block[]
 *   isPublic: boolean
 *   viewCount: number   (incrementable by anyone)
 *   saveCount: number   (incrementable by authenticated users)
 *   createdAt, updatedAt: timestamp
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
} from "lucide-react";

/* ─── Design Tokens (strict Discotive palette) ───────────────────────── */
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

/* ─── Block Registry ─────────────────────────────────────────────────── */
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

/* ─── Helpers ─────────────────────────────────────────────────────────── */
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

/* ─── Skeletons ───────────────────────────────────────────────────────── */
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

const ColistCardSkeleton = memo(() => (
  <div
    className="flex flex-col rounded-2xl overflow-hidden"
    style={{
      background: V.surface,
      border: "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <PulseBox style={{ height: 128 }} className="rounded-none" />
    <div className="p-4 space-y-2.5">
      <PulseBox style={{ height: 18, width: "72%" }} />
      <PulseBox style={{ height: 13, width: "100%" }} />
      <PulseBox style={{ height: 13, width: "60%" }} />
      <div className="flex gap-2 pt-1">
        <PulseBox style={{ height: 20, width: 56, borderRadius: 999 }} />
        <PulseBox style={{ height: 20, width: 64, borderRadius: 999 }} />
      </div>
    </div>
  </div>
));

const ReaderSkeleton = memo(() => (
  <div className="space-y-4">
    {[130, 80, 110, 90].map((h, i) => (
      <div
        key={i}
        className="p-5 rounded-2xl"
        style={{
          background: V.surface,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <PulseBox style={{ height: 10, width: 60, marginBottom: 12 }} />
        <PulseBox style={{ height: 16, width: "100%", marginBottom: 8 }} />
        <PulseBox style={{ height: 14, width: `${h}%` }} />
      </div>
    ))}
  </div>
));

/* ─── Premium Upsell Modal ─────────────────────────────────────────────── */
const PremiumUpsellModal = memo(({ onClose, navigate }) => (
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
      className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.95)]"
      style={{ background: V.depth, border: `1px solid ${G.border}` }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle,rgba(191,162,100,0.18) 0%,transparent 70%)",
        }}
      />
      <div className="relative z-10 p-8 text-center">
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
          style={{
            color: T.primary,
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.03em",
          }}
        >
          Create a Colist
        </h2>
        <p
          className="text-sm leading-relaxed mb-7 max-w-xs mx-auto"
          style={{ color: T.secondary }}
        >
          Colists are premium-exclusive creation tools. Share distilled
          execution intelligence with the world — and earn +15 pts every time
          someone saves your blocks.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-7 text-left">
          {[
            {
              icon: Globe,
              c: G.base,
              l: "SEO Indexed",
              s: "Public discovery worldwide",
            },
            {
              icon: Zap,
              c: "#f59e0b",
              l: "Score Rewards",
              s: "+15 pts per vault save",
            },
            {
              icon: BookOpen,
              c: "#8b5cf6",
              l: "Rich Blocks",
              s: "Links, code, video & more",
            },
            {
              icon: TrendingUp,
              c: "#10b981",
              l: "Analytics",
              s: "Views & saves tracked",
            },
          ].map((f) => (
            <div
              key={f.l}
              className="flex items-start gap-2.5 p-3 rounded-xl"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <f.icon size={12} style={{ color: f.c, marginTop: 2 }} />
              <div>
                <p
                  className="text-[11px] font-bold"
                  style={{ color: T.primary }}
                >
                  {f.l}
                </p>
                <p className="text-[9px]" style={{ color: T.dim }}>
                  {f.s}
                </p>
              </div>
            </div>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onClose();
            navigate("/premium");
          }}
          className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-2xl"
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
          className="w-full py-3 mt-1.5 text-sm font-bold"
          style={{ color: T.dim }}
        >
          Maybe later
        </button>
      </div>
    </motion.div>
  </motion.div>
));

/* ─── Auth Prompt Modal ────────────────────────────────────────────────── */
const AuthPromptModal = memo(
  ({ onClose, navigate, action = "save this block" }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
          >
            <Bookmark size={24} style={{ color: G.bright }} />
          </div>
          <h3 className="text-lg font-black mb-2" style={{ color: T.primary }}>
            Sign in to {action}
          </h3>
          <p
            className="text-xs leading-relaxed mb-5"
            style={{ color: T.secondary }}
          >
            Join Discotive to save assets to your Vault, track execution score,
            and connect with top operators globally.
          </p>
          <div className="flex gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                onClose();
                navigate("/auth");
              }}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                color: "#000",
              }}
            >
              Sign In
            </motion.button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
              style={{
                background: V.surface,
                color: T.dim,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  ),
);

/* ─── Block Renderers ─────────────────────────────────────────────────── */

const SaveButton = memo(({ onSave, isSaved }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onSave}
    className="mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all"
    style={{ color: isSaved ? "#4ADE80" : T.dim }}
  >
    {isSaved ? (
      <>
        <BookmarkCheck size={11} /> Saved to Vault
      </>
    ) : (
      <>
        <Bookmark size={11} /> Save to Vault
      </>
    )}
  </motion.button>
));

const InsightBlock = memo(({ block, idx, onSave, isSaved }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      delay: Math.min(idx * 0.06, 0.4),
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    }}
    className="p-5 rounded-2xl"
    style={{
      background: "rgba(191,162,100,0.07)",
      border: `1px solid ${G.border}`,
    }}
  >
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-5 h-5 rounded-lg flex items-center justify-center"
        style={{ background: G.dimBg }}
      >
        <Zap size={10} style={{ color: G.bright }} />
      </div>
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: G.base }}
      >
        Insight
      </span>
    </div>
    {block.title && (
      <h4
        className="text-base font-black mb-2 leading-snug"
        style={{ color: T.primary }}
      >
        {block.title}
      </h4>
    )}
    <p
      className="text-sm leading-relaxed"
      style={{ color: T.secondary, whiteSpace: "pre-wrap" }}
    >
      {block.content}
    </p>
    {onSave && <SaveButton onSave={() => onSave(block)} isSaved={isSaved} />}
  </motion.div>
));

const QuoteBlock = memo(({ block, idx }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
    className="pl-5 py-2 pr-4"
    style={{ borderLeft: "2px solid #a855f7" }}
  >
    <div className="flex items-center gap-1.5 mb-2">
      <Quote size={9} style={{ color: "#a855f7" }} />
      <span
        className="text-[9px] font-black uppercase tracking-widest"
        style={{ color: "#a855f7" }}
      >
        Quote
      </span>
    </div>
    <blockquote
      className="text-base md:text-lg font-medium italic leading-relaxed mb-2"
      style={{ color: T.primary }}
    >
      "{block.content}"
    </blockquote>
    {block.author && (
      <p className="text-[10px] font-bold" style={{ color: T.dim }}>
        — {block.author}
      </p>
    )}
  </motion.div>
));

const LinkBlock = memo(({ block, idx, onSave, isSaved }) => {
  const hostname = useMemo(() => {
    try {
      return new URL(block.url || "").hostname.replace("www.", "");
    } catch {
      return block.url || "";
    }
  }, [block.url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
      className="p-4 rounded-2xl"
      style={{
        background: "rgba(56,189,248,0.05)",
        border: "1px solid rgba(56,189,248,0.18)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(56,189,248,0.1)" }}
        >
          <Link2 size={14} style={{ color: "#38bdf8" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: "#38bdf8" }}
            >
              Link
            </span>
            {hostname && (
              <span
                className="text-[9px] font-mono truncate max-w-[120px]"
                style={{ color: T.dim }}
              >
                {hostname}
              </span>
            )}
          </div>
          {block.title && (
            <h4
              className="text-sm font-bold mb-1 leading-snug"
              style={{ color: T.primary }}
            >
              {block.title}
            </h4>
          )}
          {block.description && (
            <p
              className="text-xs leading-relaxed"
              style={{ color: T.secondary }}
            >
              {block.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3">
            {block.url && (
              <a
                href={block.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                style={{ color: "#38bdf8" }}
              >
                Open <ExternalLink size={9} />
              </a>
            )}
            {onSave && (
              <SaveButton onSave={() => onSave(block)} isSaved={isSaved} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const CodeBlock = memo(({ block, idx }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(block.content || "").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [block.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#0d1117",
        border: "1px solid rgba(74,222,128,0.18)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: "rgba(74,222,128,0.05)",
          borderBottom: "1px solid rgba(74,222,128,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <Code size={10} style={{ color: "#4ADE80" }} />
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: "#4ADE80" }}
          >
            {block.language || "Code"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all"
          style={{ color: copied ? "#4ADE80" : "rgba(255,255,255,0.25)" }}
        >
          {copied ? (
            <>
              <Check size={9} /> Copied
            </>
          ) : (
            <>
              <Copy size={9} /> Copy
            </>
          )}
        </button>
      </div>
      <pre
        className="p-4 overflow-x-auto text-xs font-mono leading-relaxed custom-scrollbar"
        style={{ color: "#e6edf3", margin: 0 }}
      >
        <code>{block.content}</code>
      </pre>
    </motion.div>
  );
});

const VideoBlock = memo(({ block, idx }) => {
  const [playing, setPlaying] = useState(false);
  const ytId =
    block.youtubeId || block.url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];

  if (!ytId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(idx * 0.06, 0.4), duration: 0.4 }}
      className="relative rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "16/9",
        background: "#000",
        border: "1px solid rgba(248,113,113,0.18)",
      }}
    >
      {!playing ? (
        <div
          className="absolute inset-0 cursor-pointer group"
          onClick={() => setPlaying(true)}
        >
          <img
            src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
            alt={block.title || "Video"}
            className="w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: 0.65 }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.target.style.opacity = "0.65")}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(248,113,113,0.9)",
                boxShadow: "0 0 40px rgba(248,113,113,0.5)",
              }}
            >
              <Play
                size={26}
                fill="white"
                style={{ color: "white", marginLeft: 3 }}
              />
            </motion.div>
          </div>
          {block.title && (
            <div
              className="absolute bottom-0 left-0 right-0 p-4"
              style={{
                background:
                  "linear-gradient(to top,rgba(0,0,0,0.9),transparent)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Youtube size={9} style={{ color: "#F87171" }} />
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: "#F87171" }}
                >
                  Video
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-snug">
                {block.title}
              </p>
            </div>
          )}
        </div>
      ) : (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1&rel=0&playsinline=1`}
          className="w-full h-full"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
          title={block.title || "Video"}
        />
      )}
    </motion.div>
  );
});

const DividerBlock = memo(({ idx }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: Math.min(idx * 0.06, 0.4) }}
    className="flex items-center gap-4 py-2"
  >
    <div
      className="flex-1 h-px"
      style={{
        background:
          "linear-gradient(to right,transparent,rgba(255,255,255,0.07),transparent)",
      }}
    />
    <div
      className="w-1 h-1 rounded-full"
      style={{ background: G.base, opacity: 0.5 }}
    />
    <div
      className="flex-1 h-px"
      style={{
        background:
          "linear-gradient(to left,transparent,rgba(255,255,255,0.07),transparent)",
      }}
    />
  </motion.div>
));

const BlockRenderer = memo(({ block, idx, onSave, savedIds }) => {
  const isSaved = savedIds?.has(block.id);
  switch (block.type) {
    case "insight":
      return (
        <InsightBlock
          block={block}
          idx={idx}
          onSave={onSave}
          isSaved={isSaved}
        />
      );
    case "quote":
      return <QuoteBlock block={block} idx={idx} />;
    case "link":
      return (
        <LinkBlock block={block} idx={idx} onSave={onSave} isSaved={isSaved} />
      );
    case "code":
      return <CodeBlock block={block} idx={idx} />;
    case "video":
      return <VideoBlock block={block} idx={idx} />;
    case "divider":
      return <DividerBlock idx={idx} />;
    default:
      return null;
  }
});

/* ─── Colist Card ─────────────────────────────────────────────────────── */
const ColistCard = memo(({ colist, view, onClick }) => {
  const mins = estimateReadTime(colist.blocks || []);
  const blockCount = (colist.blocks || []).filter(
    (b) => b.type !== "divider",
  ).length;

  if (view === "list") {
    return (
      <motion.div
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className="group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all"
        style={{
          background: V.surface,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="shrink-0 rounded-xl w-16 h-16 flex items-center justify-center"
          style={{ background: colist.coverGradient || COVER_GRADIENTS[0] }}
        >
          <BookOpen size={20} style={{ color: "rgba(255,255,255,0.6)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-black leading-snug mb-1 truncate"
            style={{ color: T.primary }}
          >
            {colist.title}
          </h3>
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
        </div>
        <ChevronRight
          size={14}
          style={{ color: T.dim }}
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: V.surface,
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Cover */}
      <div
        className="relative h-28 flex-shrink-0 flex items-end justify-between p-3"
        style={{ background: colist.coverGradient || COVER_GRADIENTS[0] }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: "rgba(0,0,0,0.15)" }}
        />
        <div className="relative z-10 flex flex-wrap gap-1.5">
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
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3
          className="text-sm font-black leading-snug line-clamp-2"
          style={{ color: T.primary }}
        >
          {colist.title}
        </h3>
        {colist.description && (
          <p
            className="text-xs leading-relaxed line-clamp-2 flex-1"
            style={{ color: T.secondary }}
          >
            {colist.description}
          </p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-2 pt-2.5"
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
      </div>
    </motion.div>
  );
});

/* ─── Feed View ───────────────────────────────────────────────────────── */
const ColistFeed = memo(({ onNavigate, onCreateClick }) => {
  const [colists, setColists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [view, setView] = useState("grid");
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;
  const fetchedRef = useRef(false);

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
        console.error("[Colists] fetch:", err);
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
  }, []);

  const allTags = useMemo(() => {
    const s = new Set();
    colists.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return [...s].slice(0, 12);
  }, [colists]);

  const filtered = useMemo(() => {
    let list = colists;
    if (activeTag)
      list = list.filter((c) => (c.tags || []).includes(activeTag));
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
    return list;
  }, [colists, activeTag, search]);

  return (
    <div className="min-h-screen" style={{ background: V.bg }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at 50% -20%,rgba(191,162,100,0.18) 0%,transparent 65%)",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-10 pt-12 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={11} style={{ color: G.base }} />
              <span
                className="text-[9px] font-black uppercase tracking-[0.3em]"
                style={{ color: G.base }}
              >
                Discotive Colists
              </span>
            </div>
            <h1
              className="font-display font-black leading-none mb-3"
              style={{
                fontSize: "clamp(2rem,6vw,3.8rem)",
                letterSpacing: "-0.04em",
                color: T.primary,
              }}
            >
              Curated Execution Playlists.
            </h1>
            <p
              className="text-sm md:text-base max-w-lg leading-relaxed mb-6"
              style={{ color: T.secondary }}
            >
              High-signal sequences by top operators. No noise, no filler — just
              distilled execution intelligence worth saving.
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onCreateClick}
              className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                color: "#000",
                boxShadow: "0 0 30px rgba(191,162,100,0.25)",
              }}
            >
              <Plus size={14} strokeWidth={3} /> Create a Colist
              <Crown size={10} />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {/* Sticky Toolbar */}
      <div
        className="sticky top-0 z-50 py-3 px-5 md:px-10"
        style={{
          background: `${V.bg}E8`,
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "#555" }}
              />
              <input
                type="text"
                placeholder="Search colists..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2 rounded-xl text-xs font-medium outline-none transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: T.primary,
                }}
              />
            </div>
            <div
              className="flex items-center gap-1 p-0.5 rounded-xl border"
              style={{ background: "#111", borderColor: "#222" }}
            >
              {[
                { id: "grid", Icon: LayoutGrid },
                { id: "list", Icon: List },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className="p-2 rounded-lg transition-all"
                  style={{
                    background: view === v.id ? G.dimBg : "transparent",
                    color: view === v.id ? G.bright : "#555",
                  }}
                >
                  <v.Icon size={13} />
                </button>
              ))}
            </div>
          </div>

          {/* Tag pills */}
          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              <TagPill
                active={!activeTag}
                onClick={() => setActiveTag(null)}
                label="All"
              />
              {allTags.map((tag) => (
                <TagPill
                  key={tag}
                  active={activeTag === tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  label={tag}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid / List */}
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-8">
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
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest"
              style={{
                background: G.dimBg,
                color: G.bright,
                border: `1px solid ${G.border}`,
              }}
            >
              <Plus size={11} /> Create First Colist
            </button>
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
                onClick={() => onNavigate(c.slug)}
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

/* ─── Reader View ─────────────────────────────────────────────────────── */
const ColistReader = memo(({ slug, onBack, onSaveBlock, savedIds }) => {
  const [colist, setColist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    if (!slug || slug === "new") return;
    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "colists"),
            where("slug", "==", slug),
            where("isPublic", "==", true),
            limit(1),
          ),
        );
        if (snap.empty) {
          if (alive) setNotFound(true);
          return;
        }
        const d = snap.docs[0];
        if (alive) setColist({ id: d.id, ...d.data() });
        // Fire-and-forget view increment
        updateDoc(d.ref, { viewCount: increment(1) }).catch(() => {});
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2200);
  }, []);

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: V.bg }}>
        <div className="max-w-2xl mx-auto px-5 py-10 space-y-6">
          <PulseBox style={{ height: 48, width: 200, borderRadius: 999 }} />
          <PulseBox style={{ height: 220, borderRadius: 24 }} />
          <PulseBox style={{ height: 36, width: "70%" }} />
          <PulseBox style={{ height: 20, width: "50%" }} />
          <ReaderSkeleton />
        </div>
      </div>
    );

  if (notFound || !colist)
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: V.bg }}
      >
        <AlertTriangle
          size={48}
          className="mb-4 opacity-20"
          style={{ color: T.primary }}
        />
        <p
          className="text-xl font-black mb-3"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Colist not found.
        </p>
        <button
          onClick={onBack}
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: G.base }}
        >
          ← Back to Feed
        </button>
      </div>
    );

  const mins = estimateReadTime(colist.blocks || []);

  return (
    <>
      <Helmet>
        <title>{colist.title} — Discotive Colists</title>
        <meta
          name="description"
          content={
            colist.description ||
            `A curated execution playlist by @${colist.authorUsername} on Discotive.`
          }
        />
        <meta property="og:title" content={`${colist.title} — Discotive`} />
        <meta property="og:description" content={colist.description || ""} />
        <meta property="og:type" content="article" />
        <meta
          property="og:url"
          content={`https://discotive.in/colists/${colist.slug}`}
        />
        <meta property="twitter:title" content={colist.title} />
        <meta
          property="twitter:description"
          content={colist.description || ""}
        />
        <link
          rel="canonical"
          href={`https://discotive.in/colists/${colist.slug}`}
        />
      </Helmet>

      <div className="min-h-screen" style={{ background: V.bg }}>
        {/* Cover Hero */}
        <div
          className="relative h-52 md:h-68"
          style={{
            background: colist.coverGradient || COVER_GRADIENTS[0],
            height: "clamp(200px, 30vw, 280px)",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(3,3,3,0.92) 100%)",
            }}
          />
          {/* Nav row */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 md:p-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(8px)",
              }}
            >
              <ArrowLeft size={11} /> All Colists
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: `1px solid ${shareToast ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.15)"}`,
                color: shareToast ? "#4ADE80" : "rgba(255,255,255,0.8)",
                backdropFilter: "blur(8px)",
              }}
            >
              {shareToast ? (
                <>
                  <Check size={11} /> Copied
                </>
              ) : (
                <>
                  <Share2 size={11} /> Share
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-5 -mt-14 relative z-10 pb-24">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(colist.tags || []).map((tag) => (
              <span
                key={tag}
                className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{
                  background: G.dimBg,
                  color: G.base,
                  border: `1px solid ${G.border}`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h1
            className="font-display font-black mb-3 leading-tight"
            style={{
              fontSize: "clamp(1.6rem, 5vw, 2.8rem)",
              letterSpacing: "-0.03em",
              color: T.primary,
            }}
          >
            {colist.title}
          </h1>
          {colist.description && (
            <p
              className="text-sm md:text-base leading-relaxed mb-5"
              style={{ color: T.secondary }}
            >
              {colist.description}
            </p>
          )}

          {/* Meta bar */}
          <div
            className="flex items-center flex-wrap gap-4 py-5 mb-8"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <Link
              to={colist.authorUsername ? `/@${colist.authorUsername}` : "#"}
              className="flex items-center gap-2 group"
            >
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-black"
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
                className="text-xs font-bold group-hover:text-white transition-colors"
                style={{ color: T.secondary }}
              >
                @{colist.authorUsername}
              </span>
            </Link>
            <span
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: T.dim }}
            >
              <Clock size={10} /> {mins} min
            </span>
            <span
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: T.dim }}
            >
              <Eye size={10} /> {(colist.viewCount || 1).toLocaleString()} views
            </span>
            <span
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: T.dim }}
            >
              <Bookmark size={10} /> {colist.saveCount || 0} saves
            </span>
          </div>

          {/* Blocks */}
          <div className="space-y-4">
            {(colist.blocks || []).map((block, idx) => (
              <BlockRenderer
                key={block.id}
                block={block}
                idx={idx}
                onSave={onSaveBlock}
                savedIds={savedIds}
              />
            ))}
          </div>

          {/* Footer */}
          <div
            className="mt-14 pt-8 flex flex-col items-center text-center"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div
              className="w-10 h-10 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <BookOpen size={18} style={{ color: G.bright }} />
            </div>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: T.dim }}
            >
              Published on Discotive · The Career Engine
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest"
              style={{
                background: G.dimBg,
                color: G.bright,
                border: `1px solid ${G.border}`,
              }}
            >
              ← More Colists
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
});

/* ─── Editor Block Row ────────────────────────────────────────────────── */
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
                className="p-1.5 rounded-lg text-[11px] hover:bg-white/5 transition-colors"
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
                className="p-1.5 rounded-lg text-[11px] hover:bg-white/5 transition-colors"
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
              className="p-1.5 rounded-lg ml-1 hover:bg-red-500/10 transition-colors"
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
                        placeholder="Insight title (optional)"
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
                          ? "Your insight or signal..."
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
                        placeholder="Attribution — Name, Company (optional)"
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
                      placeholder="Brief description (optional)"
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
                      placeholder="Language (js, python, bash, sql...)"
                      style={fieldStyle}
                    />
                    <textarea
                      value={block.content || ""}
                      onChange={(e) =>
                        onUpdate(idx, { ...block, content: e.target.value })
                      }
                      placeholder="// Your code here..."
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
                      placeholder="YouTube URL (e.g. https://youtube.com/watch?v=...)"
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
                    Visual section separator — no content needed.
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

/* ─── Editor View ─────────────────────────────────────────────────────── */
const ColistEditor = memo(({ onClose, userData, onPublish }) => {
  const [step, setStep] = useState("meta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [coverIdx, setCoverIdx] = useState(0);
  const [blocks, setBlocks] = useState([]);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const updateBlock = useCallback((idx, updated) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? updated : b)));
  }, []);

  const deleteBlock = useCallback((idx) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveUp = useCallback((idx) => {
    if (idx === 0) return;
    setBlocks((prev) => {
      const n = [...prev];
      [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
      return n;
    });
  }, []);

  const moveDown = useCallback((idx) => {
    setBlocks((prev) => {
      if (idx >= prev.length - 1) return prev;
      const n = [...prev];
      [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
      return n;
    });
  }, []);

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

  const handlePublish = async () => {
    if (!canPublish) {
      setError(
        validBlocks.length === 0
          ? "Add at least 1 block."
          : "Title must be at least 3 characters.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      const slug = generateSlug(title.trim());
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5);

      await addDoc(collection(db, "colists"), {
        title: title.trim(),
        slug,
        description: description.trim(),
        tags,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onPublish?.(slug);
    } catch (err) {
      console.error("[ColistEditor]", err);
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
      {/* Editor Header */}
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
          <div
            className="flex gap-0.5 p-0.5 rounded-xl border"
            style={{ background: "#111", borderColor: "#222" }}
          >
            {[
              { id: "meta", label: "Details" },
              { id: "blocks", label: `Blocks (${validBlocks.length})` },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStep(s.id)}
                className="px-4 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: step === s.id ? G.dimBg : "transparent",
                  color: step === s.id ? G.bright : "#555",
                }}
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all disabled:opacity-35"
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

      {/* Editor Body */}
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

                {/* Preview */}
                <div
                  className="w-full h-20 rounded-2xl flex items-end p-4"
                  style={{ background: COVER_GRADIENTS[coverIdx] }}
                >
                  <span
                    className="text-sm font-black leading-tight"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {title || "Your Colist Title"}
                  </span>
                </div>

                <div>
                  <label
                    className="block text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ color: T.dim }}
                  >
                    Title <span style={{ color: G.base }}>*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Your execution playlist title..."
                    maxLength={100}
                    style={{ ...inputBase, fontSize: 16, fontWeight: 800 }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ color: T.dim }}
                  >
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will operators gain from this colist?"
                    rows={3}
                    maxLength={300}
                    style={{ ...inputBase, resize: "none" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-[10px] font-black uppercase tracking-widest mb-2"
                    style={{ color: T.dim }}
                  >
                    Tags{" "}
                    <span style={{ color: T.dim }}>
                      (comma-separated, max 5)
                    </span>
                  </label>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="productivity, startups, frontend, growth"
                    style={inputBase}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep("blocks")}
                  className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest mt-2"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  Next: Add Blocks →
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
                    {validBlocks.length} valid block
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
                    <Plus size={11} strokeWidth={3} /> Add Block
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showBlockPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
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
                            className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all"
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
                      No blocks yet.
                    </p>
                    <p className="text-xs" style={{ color: T.dim }}>
                      Add insights, links, code, videos, and more.
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

/* ─── Main Page Component ─────────────────────────────────────────────── */
const Colists = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userData } = useUserData();

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  // Handle /colists/new gate
  useEffect(() => {
    if (slug !== "new") return;
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    if (userData && !isPro) {
      setShowPremiumModal(true);
    }
  }, [slug, currentUser, userData, isPro, navigate]);

  const handleCreateClick = useCallback(() => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    navigate("/colists/new");
  }, [currentUser, isPro, navigate]);

  const handleSaveBlock = useCallback(
    async (block) => {
      if (!currentUser) {
        setShowAuthModal(true);
        return;
      }
      if (savedIds.has(block.id)) return;

      // Optimistic
      setSavedIds((prev) => new Set([...prev, block.id]));

      try {
        const entry = {
          id: `colist_${block.id}_${Date.now().toString(36)}`,
          type: "Colist Block",
          name:
            block.title || (block.content || "").slice(0, 60) || "Colist Asset",
          status: "VERIFIED",
          source: "colist",
          blockType: block.type,
          content: block.content || block.url || "",
          savedAt: new Date().toISOString(),
        };
        await updateDoc(doc(db, "users", currentUser.uid), {
          vault: arrayUnion(entry),
        });
      } catch (err) {
        console.error("[Colists] saveBlock:", err);
        setSavedIds((prev) => {
          const n = new Set(prev);
          n.delete(block.id);
          return n;
        });
      }
    },
    [currentUser, savedIds],
  );

  const handleEditorPublish = useCallback(
    (newSlug) => {
      navigate(`/colists/${newSlug}`);
    },
    [navigate],
  );

  // Render editor for /colists/new
  if (slug === "new") {
    if (!currentUser || !userData) return null;
    if (!isPro)
      return (
        <div style={{ background: V.bg, minHeight: "100vh" }}>
          <AnimatePresence>
            <PremiumUpsellModal
              onClose={() => navigate("/colists")}
              navigate={navigate}
            />
          </AnimatePresence>
        </div>
      );
    return (
      <AnimatePresence>
        <ColistEditor
          onClose={() => navigate("/colists")}
          userData={userData}
          onPublish={handleEditorPublish}
        />
      </AnimatePresence>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {slug
            ? "Colist — Discotive"
            : "Colists | Curated Execution Playlists — Discotive"}
        </title>
        <meta
          name="description"
          content="High-signal execution sequences by top operators on Discotive. Save blocks directly to your Vault."
        />
        <meta
          property="og:title"
          content="Discotive Colists — Curated Execution Playlists"
        />
        <meta
          property="og:description"
          content="Distilled intelligence from top operators. No noise, no filler."
        />
      </Helmet>

      <AnimatePresence>
        {showPremiumModal && (
          <PremiumUpsellModal
            onClose={() => setShowPremiumModal(false)}
            navigate={navigate}
          />
        )}
        {showAuthModal && (
          <AuthPromptModal
            onClose={() => setShowAuthModal(false)}
            navigate={navigate}
            action="save this block"
          />
        )}
      </AnimatePresence>

      {!slug ? (
        <ColistFeed
          onNavigate={(s) => navigate(`/colists/${s}`)}
          onCreateClick={handleCreateClick}
        />
      ) : (
        <ColistReader
          slug={slug}
          onBack={() => navigate("/colists")}
          onSaveBlock={handleSaveBlock}
          savedIds={savedIds}
        />
      )}
    </>
  );
};

export default Colists;
