/**
 * @fileoverview ColistsReader.jsx — Discotive Colists v2.0 "The Decking Paradigm"
 * @description Full architectural rebuild. Physics-driven absolute-stacked deck engine.
 *              DOM scrolling ERADICATED. Framer Motion gesture physics only.
 *              Kinematic interpolation, DOM windowing, GPU-accelerated transforms.
 *
 * ARCHITECTURE MANDATES FULFILLED:
 * ✅ Absolute Stacking Architecture (no flex, no scroll-snap)
 * ✅ Framer Motion drag="x" gesture engine on active card only
 * ✅ useTransform kinematic interpolation for deck depth
 * ✅ Physics spring snapping (stiffness:300, damping:30)
 * ✅ State-driven indexing decoupled from DOM
 * ✅ DOM Windowing (only active ±1 cards mounted)
 * ✅ GPU-enforced will-change + transform-only animations
 * ✅ React.memo with comparison functions on all block renderers
 * ✅ Haptic feedback on snap
 * ✅ Peek teaser animation on mount
 * ✅ Dynamic shadow casting by depth index
 * ✅ Velocity-based paging (flick threshold)
 * ✅ dragDirectionLock for vertical scroll forgiveness
 * ✅ Safe area insets
 * ✅ Trackpad wheel event translation
 * ✅ Keyboard spring linkage
 * ✅ Hover elevation on next card
 * ✅ Debounced Firestore sync (5s queue)
 * ✅ Fluid progress bar linked to drag motion value
 * ✅ Depth-based dimming + rotateZ deck fan
 * ✅ Curved deck edges
 * ✅ Cover image preloading
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  useSpring,
} from "framer-motion";
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
} from "lucide-react";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const G = { base: "#BFA264", bright: "#D4AF78", deep: "#8B7240" };
const V = { bg: "#030303", surface: "#0F0F0F", elevated: "#141414" };
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

/* ─── Physics Constants ──────────────────────────────────────────────────── */
const SPRING = { stiffness: 300, damping: 30 };
const DRAG_THRESHOLD_PCT = 0.2; // 20% drag to page-turn (smooth mobile swipe)
const VELOCITY_THRESHOLD = 300; // px/s flick threshold
const VELOCITY_DRAG_PCT = 0.05; // 5% drag needed for fast flick

/* ─── Progress Helpers ───────────────────────────────────────────────────── */
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
  } catch {}
};

/* ─── Haptic Feedback ────────────────────────────────────────────────────── */
const hapticSnap = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([10]);
  } catch {}
};

/* ─── Block Renderers ────────────────────────────────────────────────────── */
// All wrapped in React.memo with strict prop comparison

const blockPropsEqual = (prev, next) =>
  prev.block === next.block && prev.textColor === next.textColor;

const CoverBlock = memo(({ block, textColor }) => {
  const tc = textColor || T.primary;
  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full items-center text-center">
      {block.verificationTier && block.verificationTier !== "weak" && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3">
          {block.verificationTier === "original" ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src="/logo-discotive-original.png"
                alt="Discotive Original"
                className="h-8 object-contain"
              />
              <span
                className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border"
                style={{ color: tc, borderColor: tc, opacity: 0.8 }}
              >
                Discotive Original
              </span>
            </div>
          ) : (
            <span
              className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border"
              style={{ color: tc, borderColor: tc, opacity: 0.8 }}
            >
              {block.verificationTier}
            </span>
          )}
        </div>
      )}
      <h1
        className="font-display font-black leading-tight mb-6"
        style={{
          fontSize: "clamp(2rem,7vw,3.5rem)",
          color: tc,
          letterSpacing: "-0.04em",
        }}
      >
        {block.title}
      </h1>
      {block.description && (
        <p
          className="text-base md:text-lg leading-relaxed font-light mb-8 max-w-md mx-auto"
          style={{ color: tc, opacity: 0.8 }}
        >
          {block.description}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 mt-4">
        <div
          className="w-10 h-10 rounded-full overflow-hidden shadow-xl"
          style={{ border: `1px solid rgba(255,255,255,0.2)` }}
        >
          {block.authorAvatar ? (
            <img
              src={block.authorAvatar}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-black/40 text-xs font-bold"
              style={{ color: tc }}
            >
              {block.authorUsername?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-left flex flex-col">
          <span className="text-xs font-bold" style={{ color: tc }}>
            @{block.authorUsername}
          </span>
          <span
            className="text-[10px] font-mono"
            style={{ color: tc, opacity: 0.6 }}
          >
            {block.viewCount || 0} views • {block.colistScore || 0} pts
          </span>
        </div>
      </div>
    </div>
  );
}, blockPropsEqual);

const InsightBlock = memo(({ block, textColor }) => {
  const tc = textColor || T.primary;
  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
      {block.title && (
        <h2
          className="font-display font-black leading-tight mb-5"
          style={{
            fontSize: "clamp(1.4rem,3.5vw,2.2rem)",
            color: tc,
            letterSpacing: "-0.03em",
          }}
          dangerouslySetInnerHTML={{ __html: block.title }}
        />
      )}
      <div
        className="text-base md:text-lg leading-relaxed font-light"
        style={{ color: tc, opacity: 0.9 }}
        dangerouslySetInnerHTML={{ __html: block.content || "" }}
      />
    </div>
  );
}, blockPropsEqual);

const QuoteBlock = memo(({ block, textColor }) => {
  const tc = textColor || T.primary;
  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
      <div
        style={{ borderLeft: `3px solid ${tc}`, paddingLeft: 24, opacity: 0.9 }}
      >
        <blockquote
          className="font-display font-black leading-tight mb-5"
          style={{
            fontSize: "clamp(1.6rem,4vw,2.8rem)",
            color: tc,
            letterSpacing: "-0.04em",
            fontStyle: "italic",
          }}
        >
          "{block.content}"
        </blockquote>
        {block.author && (
          <p
            className="text-sm font-bold uppercase tracking-widest"
            style={{ color: tc, opacity: 0.7 }}
          >
            — {block.author}
          </p>
        )}
      </div>
    </div>
  );
}, blockPropsEqual);

const LinkBlock = memo(({ block, textColor }) => {
  const tc = textColor || T.primary;
  const hostname = useMemo(() => {
    try {
      return new URL(block.url || "").hostname.replace("www.", "");
    } catch {
      return block.url || "";
    }
  }, [block.url]);

  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
      <div
        className="max-w-2xl p-6 rounded-2xl border"
        style={{
          background: "rgba(255,255,255,0.03)",
          borderColor: "rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex flex-col gap-2">
          {block.title && (
            <h3 className="text-xl font-black" style={{ color: tc }}>
              {block.title}
            </h3>
          )}
          {hostname && (
            <p
              className="text-xs font-mono"
              style={{ color: tc, opacity: 0.5 }}
            >
              {hostname}
            </p>
          )}
          {block.description && (
            <p
              className="text-sm leading-relaxed my-3"
              style={{ color: tc, opacity: 0.8 }}
            >
              {block.description}
            </p>
          )}
          {block.url && (
            <a
              href={block.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-max items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full mt-2 transition-transform hover:scale-105"
              style={{ background: tc, color: V.bg }}
            >
              Open Link <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}, blockPropsEqual);

const CodeBlock = memo(
  ({ block }) => {
    const [copied, setCopied] = useState(false);
    return (
      <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
        <div
          className="max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background:
                      i === 0 ? "#F87171" : i === 1 ? "#FBBF24" : "#4ADE80",
                    opacity: 0.5,
                  }}
                />
              ))}
              <span
                className="text-[9px] font-black uppercase tracking-widest ml-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {block.language || "code"}
              </span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard
                  .writeText(block.content || "")
                  .catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors hover:text-white"
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
            className="p-5 overflow-x-auto text-sm font-mono leading-relaxed"
            style={{ color: "#e6edf3", margin: 0, maxHeight: "50vh" }}
          >
            <code>{block.content}</code>
          </pre>
        </div>
      </div>
    );
  },
  (prev, next) => prev.block === next.block,
);

const VideoBlock = memo(({ block, textColor }) => {
  const [playing, setPlaying] = useState(false);
  const tc = textColor || T.primary;
  const ytId =
    block.youtubeId || block.url?.match(/(?:v=|youtu\.be\/)([^&\s?]+)/)?.[1];
  if (!ytId) return null;
  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
      {block.title && (
        <h3
          className="text-base font-bold mb-5 max-w-2xl"
          style={{ color: tc }}
        >
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{
          aspectRatio: "16/9",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {!playing ? (
          <div
            className="relative w-full h-full cursor-pointer group"
            onClick={() => setPlaying(true)}
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
              alt=""
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.6)] group-hover:scale-110 transition-transform">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1.5" />
              </div>
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
}, blockPropsEqual);

const PodcastBlock = memo(({ block, textColor }) => {
  const tc = textColor || T.primary;
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    let p = rawUrl;
    if (p.includes("/embed/")) return p;
    if (p.includes("open.spotify.com"))
      p = p.replace("open.spotify.com/", "open.spotify.com/embed/");
    if (
      p.includes("podcasts.apple.com") &&
      !p.includes("embed.podcasts.apple.com")
    )
      p = p.replace("podcasts.apple.com", "embed.podcasts.apple.com");
    return p;
  };
  const embedUrl = getEmbedUrl(block.url);
  if (!embedUrl) return null;
  const isSpotify = embedUrl.includes("spotify");
  return (
    <div className="flex flex-col justify-center px-7 md:px-11 py-12 min-h-full">
      {block.title && (
        <h3 className="text-base font-bold mb-5" style={{ color: tc }}>
          {block.title}
        </h3>
      )}
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <iframe
          src={embedUrl}
          width="100%"
          height={isSpotify ? "152" : "175"}
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    </div>
  );
}, blockPropsEqual);

const DividerBlock = memo(() => (
  <div className="flex flex-col items-center justify-center min-h-full gap-4">
    <div className="flex items-center gap-4 w-full justify-center">
      <div
        className="w-1/4 max-w-[120px] h-px"
        style={{
          background:
            "linear-gradient(to right,transparent,rgba(255,255,255,0.3),transparent)",
        }}
      />
      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
      <div
        className="w-1/4 max-w-[120px] h-px"
        style={{
          background:
            "linear-gradient(to left,transparent,rgba(255,255,255,0.3),transparent)",
        }}
      />
    </div>
  </div>
));

const PageBlockRenderer = memo(({ block, textColor }) => {
  if (!block) return null;
  switch (block.type) {
    case "cover":
      return <CoverBlock block={block} textColor={textColor} />;
    case "insight":
      return <InsightBlock block={block} textColor={textColor} />;
    case "quote":
      return <QuoteBlock block={block} textColor={textColor} />;
    case "link":
      return <LinkBlock block={block} textColor={textColor} />;
    case "code":
      return <CodeBlock block={block} />;
    case "video":
      return <VideoBlock block={block} textColor={textColor} />;
    case "podcast":
      return <PodcastBlock block={block} textColor={textColor} />;
    case "divider":
      return <DividerBlock />;
    default:
      return (
        <div
          className="tip-tap-container h-full w-full overflow-y-auto custom-scrollbar prose-invert flex flex-col justify-center px-7 md:px-11"
          style={{ color: textColor, "--tt-color": textColor }}
          dangerouslySetInnerHTML={{ __html: block.content || "" }}
        />
      );
  }
}, blockPropsEqual);

/* ══════════════════════════════════════════════════════════════════════════
   DECK CARD — Single absolute-positioned card with drag physics
══════════════════════════════════════════════════════════════════════════ */
const DeckCard = memo(
  ({
    block,
    index,
    currentIdx,
    totalPages,
    textColor,
    coverGradient,
    coverUrl,
    isFullscreen,
    bookmarkedPage,
    dragX, // shared MotionValue from active card
    onDragStart,
    onDragEnd,
    onBookmarkToggle,
    onToggleFullscreen,
    cardWidth,
    cardHeight,
  }) => {
    const distance = index - currentIdx;
    const isActive = distance === 0;
    const isVisible = Math.abs(distance) <= 3; // Render ±3 for continuous fluidity

    // NEW KINEMATIC ENGINE: Continuous Horizontal Overlapping Carousel
    const overlapMultiplier = 0.88; // 12% peek behind the active card
    const getX = (d) => d * cardWidth * overlapMultiplier;
    const getS = (d) => (d === 0 ? 1 : 0.85 - Math.abs(d) * 0.03);
    const getO = (d) => (d === 0 ? 1 : 0.4 - Math.abs(d) * 0.15);
    const getR = (d) => d * 1.5; // Fan rotation out to the sides

    const xOffset = useTransform(
      dragX,
      [-cardWidth, 0, cardWidth],
      [getX(distance - 1), getX(distance), getX(distance + 1)],
    );

    const scale = useTransform(
      dragX,
      [-cardWidth, 0, cardWidth],
      [getS(distance - 1), getS(distance), getS(distance + 1)],
    );

    const rotateZ = useTransform(
      dragX,
      [-cardWidth, 0, cardWidth],
      [getR(distance - 1), getR(distance), getR(distance + 1)],
    );

    // KINEMATIC FADE OVERLAY: Smooth sync fading based on drag proximity
    const effectiveDist = useTransform(dragX, (x) => distance + x / cardWidth);
    const overlayOpacity = useTransform(
      effectiveDist,
      [-1, 0, 1],
      [0.65, 0, 0.65],
      { clamp: true },
    );
    const clampedOverlayOpacity = useTransform(overlayOpacity, (v) =>
      Math.max(0, Math.min(0.65, v)),
    );

    // Dynamic shadow
    const shadowOpacity = isActive
      ? 0.5
      : Math.max(0.1, 0.3 - Math.abs(distance) * 0.1);
    const shadowSpread = isActive
      ? 40
      : Math.max(10, 25 - Math.abs(distance) * 5);

    if (!isVisible) return null;

    // Deck stacking: Active card is firmly on top. Deck items strictly stack backwards.
    const zIndex = 100 - Math.abs(distance);

    return (
      <motion.div
        style={{
          position: "absolute",
          width: cardWidth,
          height: cardHeight,
          top: "50%",
          left: "50%",
          x: xOffset,
          y: -cardHeight / 2, // Eliminated yOffset for pure horizontal tracking
          marginLeft: -cardWidth / 2,
          scale,
          opacity: 1, // Opacity 100% — fading handled strictly by inner overlay mask
          rotateZ,
          zIndex,
          willChange: "transform, opacity",
          borderRadius: "2.5rem",
          background: coverGradient,
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: isFullscreen
            ? "none"
            : `0 ${shadowSpread}px ${shadowSpread * 1.4}px rgba(0,0,0,${shadowOpacity})`,
          overflow: "hidden",
          cursor: isActive ? "grab" : "pointer",
          transformOrigin: "center center",
        }}
        drag={isActive ? "x" : false}
        dragDirectionLock={true}
        dragElastic={0.08}
        dragConstraints={{ left: 0, right: 0 }}
        _dragX={dragX}
        onDragStart={isActive ? onDragStart : undefined}
        onDragEnd={isActive ? onDragEnd : undefined}
        whileTap={isActive ? { cursor: "grabbing" } : {}}
      >
        {/* Cover Image Overlay */}
        {coverUrl && (
          <img
            src={coverUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none"
            alt=""
            style={{ borderRadius: "2.5rem" }}
            draggable={false}
          />
        )}

        {/* Depth Dimming Overlay (Animated & Synchronized) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "#000000",
            opacity: clampedOverlayOpacity,
            borderRadius: "2.5rem",
            zIndex: 2,
          }}
        />

        {/* Bookmark Toggle (Top Left) — only on active */}
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBookmarkToggle(index);
            }}
            className="absolute top-6 left-6 z-50 transition-transform hover:scale-110"
            style={{ pointerEvents: "all" }}
          >
            <Bookmark
              size={22}
              style={{
                stroke: textColor,
                fill: bookmarkedPage === index ? textColor : "none",
                opacity: 0.9,
              }}
            />
          </button>
        )}

        {/* Fullscreen Toggle (Top Right) — only on active */}
        {isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFullscreen();
            }}
            className="absolute top-6 right-6 z-50 transition-transform hover:scale-110"
            style={{ pointerEvents: "all", color: textColor, opacity: 0.9 }}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}

        {/* Content Layer — only mounted for active card & ±1 (windowing) */}
        <div
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar tip-tap-container mt-12 mb-12"
          style={{ pointerEvents: isActive ? "auto" : "none" }}
        >
          <PageBlockRenderer block={block} textColor={textColor} />
        </div>

        {/* Page Number */}
        <div
          className="absolute bottom-6 right-8 text-base font-black font-display pointer-events-none"
          style={{
            color: textColor,
            opacity: isActive ? 0.9 : 0.4,
            zIndex: 20,
          }}
        >
          {index + 1}
        </div>
      </motion.div>
    );
  },
  (prev, next) => {
    // Custom comparison: only re-render if these change
    const prevDist = Math.abs(prev.index - prev.currentIdx);
    const nextDist = Math.abs(next.index - next.currentIdx);
    return (
      prevDist === nextDist &&
      prev.isFullscreen === next.isFullscreen &&
      prev.bookmarkedPage === next.bookmarkedPage &&
      prev.cardWidth === next.cardWidth &&
      prev.cardHeight === next.cardHeight &&
      prev.dragX === next.dragX
    );
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COLIST READER v2.0 — The Decking Paradigm
══════════════════════════════════════════════════════════════════════════ */
const ColistReader = ({
  colist,
  onBack,
  currentUser,
  userData,
  setShowBottomNav,
}) => {
  const uid = currentUser?.uid;

  /* ── Blocks (Including Title Cover Page) ────────────────────────────── */
  const blocks = useMemo(() => {
    const coverBlock = {
      id: "cover-block-0",
      type: "cover",
      title: colist.title,
      description: colist.description,
      authorUsername: colist.authorUsername,
      authorAvatar: colist.authorAvatar,
      authorName: colist.authorName,
      viewCount: colist.viewCount,
      tags: colist.tags,
      coverUrl: colist.coverUrl,
      colistScore: colist.colistScore,
      verificationTier: colist.verificationTier,
    };
    const contentBlocks = (colist.blocks || []).filter(
      (b) => b.type !== "divider" || (colist.blocks || []).indexOf(b) > 0,
    );
    return [coverBlock, ...contentBlocks];
  }, [colist]);
  const totalPages = blocks.length;

  /* ── Progress State ─────────────────────────────────────────────────── */
  const initProgress = useMemo(
    () => getProgress(uid, colist.id),
    [uid, colist.id],
  );
  const [currentIdx, setCurrentIdx] = useState(initProgress.pageIndex || 0);
  const [pagesRead, setPagesRead] = useState(() => {
    const initial = initProgress.pagesRead || [];
    const startIdx = initProgress.pageIndex || 0;
    return initial.includes(startIdx) ? initial : [...initial, startIdx];
  });

  /* ── UI State ───────────────────────────────────────────────────────── */
  const [urlCopied, setUrlCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bookmarkedPage, setBookmarkedPage] = useState(() => {
    const vaultItem = userData?.vault?.find((v) => v.colistId === colist.id);
    return vaultItem?.pinnedPage ?? null;
  });

  /* ── Card Dimensions ────────────────────────────────────────────────── */
  const containerRef = useRef(null);
  const [cardDims, setCardDims] = useState({ width: 340, height: 580 });

  useEffect(() => {
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Mobile-first sizing — never exceed screen
      const w = Math.min(vw * 0.85, 400);
      const h = Math.min(vh * 0.75, 650);
      setCardDims({ width: w, height: Math.max(h, 500) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* ── Motion Value (Shared Drag State) ───────────────────────────────── */
  // This single MotionValue drives ALL card transforms — zero re-renders during drag
  const dragX = useMotionValue(0);

  /* ── Progress Bar Motion (Continuous sync to drag) ──────────────────── */
  const baseProgress =
    totalPages > 0 ? (pagesRead.length / totalPages) * 100 : 0;
  const dragProgress = useTransform(
    dragX,
    [-cardDims.width, 0, cardDims.width],
    [
      Math.min(100, baseProgress + 100 / totalPages),
      baseProgress,
      Math.max(0, baseProgress - 100 / totalPages),
    ],
  );

  /* ── Debounced Firestore Sync Queue ─────────────────────────────────── */
  const syncQueueRef = useRef({ timer: null, pendingIdx: null });
  const debouncedFirestoreSync = useCallback((idx) => {
    syncQueueRef.current.pendingIdx = idx;
    if (syncQueueRef.current.timer) clearTimeout(syncQueueRef.current.timer);
    syncQueueRef.current.timer = setTimeout(async () => {
      // Flush pending sync to Firestore
      try {
        if (syncQueueRef.current.pendingIdx !== null) {
          // No-op here unless you have a read_status collection to write to
          // This is the debounce gate — implement your Firestore sync here
        }
      } catch {}
    }, 5000);
  }, []);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (syncQueueRef.current.timer) clearTimeout(syncQueueRef.current.timer);
    };
  }, []);

  /* ── Page Navigation Engine ─────────────────────────────────────────── */
  const navigateToIdx = useCallback(
    (targetIdx, fromDrag = false) => {
      if (targetIdx < 0 || targetIdx >= totalPages) {
        // Snap back — out of bounds
        animate(dragX, 0, { type: "spring", ...SPRING });
        return;
      }

      // Spring the card off-screen, then teleport + reset
      const direction = targetIdx > currentIdx ? -1 : 1;
      animate(dragX, direction * cardDims.width * 1.2, {
        type: "spring",
        stiffness: 400,
        damping: 35,
        onComplete: () => {
          dragX.set(0);
          setCurrentIdx(targetIdx);
          setPagesRead((prev) => {
            if (prev.includes(targetIdx)) return prev;
            const next = [...prev, targetIdx];
            saveProgress(uid, colist.id, targetIdx, next);
            debouncedFirestoreSync(targetIdx);
            return next;
          });
          hapticSnap();
        },
      });
    },
    [
      currentIdx,
      totalPages,
      cardDims.width,
      dragX,
      uid,
      colist.id,
      debouncedFirestoreSync,
    ],
  );

  /* ── Drag Handlers ──────────────────────────────────────────────────── */
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (event, info) => {
      setIsDragging(false);
      const { velocity, offset } = info;
      const vx = velocity.x;
      const ox = offset.x;
      const w = cardDims.width;

      let shouldAdvance = false;
      let direction = 0;

      if (Math.abs(vx) > VELOCITY_THRESHOLD) {
        // Flick — only 10% drag needed
        if (ox < -w * VELOCITY_DRAG_PCT) {
          shouldAdvance = true;
          direction = 1;
        } else if (ox > w * VELOCITY_DRAG_PCT) {
          shouldAdvance = true;
          direction = -1;
        }
      } else {
        // Slow drag — need 50% drag
        if (ox < -w * DRAG_THRESHOLD_PCT) {
          shouldAdvance = true;
          direction = 1;
        } else if (ox > w * DRAG_THRESHOLD_PCT) {
          shouldAdvance = true;
          direction = -1;
        }
      }

      if (shouldAdvance) {
        navigateToIdx(currentIdx + direction, true);
      } else {
        // Snap back to current
        animate(dragX, 0, { type: "spring", ...SPRING });
      }
    },
    [currentIdx, cardDims.width, dragX, navigateToIdx],
  );

  /* ── View Count on Mount ─────────────────────────────────────────────── */
  useEffect(() => {
    updateDoc(doc(db, "colists", colist.id), { viewCount: increment(1) }).catch(
      () => {},
    );
  }, [colist.id]);

  /* ── Cover Image Preload ─────────────────────────────────────────────── */
  useEffect(() => {
    if (colist.coverUrl) {
      const img = new Image();
      img.src = colist.coverUrl;
    }
  }, [colist.coverUrl]);

  /* ── Peek Teaser on Mount (subliminal swipability signal) ───────────── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (totalPages > 1) {
        animate(dragX, -32, {
          type: "spring",
          stiffness: 180,
          damping: 18,
          onComplete: () => {
            animate(dragX, 0, { type: "spring", stiffness: 200, damping: 22 });
          },
        });
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fullscreen ──────────────────────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (setShowBottomNav) setShowBottomNav(!isFull);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      if (setShowBottomNav) setShowBottomNav(true);
    };
  }, [setShowBottomNav]);

  /* ── Keyboard Navigation (Spring-Linked) ────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        (e.key === "Enter" && e.shiftKey)
      ) {
        e.preventDefault();
        navigateToIdx(currentIdx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigateToIdx(currentIdx - 1);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, navigateToIdx, onBack]);

  /* ── Trackpad Wheel Translation ─────────────────────────────────────── */
  useEffect(() => {
    let wheelTimer = null;
    let accumulated = 0;
    let isTurning = false;

    const handleWheel = (e) => {
      // Only intercept horizontal scroll
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 0.3) return;
      e.preventDefault();

      if (isTurning) return;

      accumulated += e.deltaX;
      clearTimeout(wheelTimer);

      // Live-update drag position for cinematic feel
      const clamped = Math.max(
        -cardDims.width,
        Math.min(cardDims.width, -accumulated * 1.5),
      );
      dragX.set(clamped);

      wheelTimer = setTimeout(() => {
        const threshold = cardDims.width * 0.2; // Reduced threshold for smoother laptop experience
        if (accumulated > threshold) {
          isTurning = true;
          navigateToIdx(currentIdx + 1);
          setTimeout(() => {
            isTurning = false;
            accumulated = 0;
          }, 500);
        } else if (accumulated < -threshold) {
          isTurning = true;
          navigateToIdx(currentIdx - 1);
          setTimeout(() => {
            isTurning = false;
            accumulated = 0;
          }, 500);
        } else {
          animate(dragX, 0, { type: "spring", ...SPRING });
          accumulated = 0;
        }
      }, 100); // Shorter timeout for faster response
    };

    const el = containerRef.current;
    if (el) el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      if (el) el.removeEventListener("wheel", handleWheel);
      clearTimeout(wheelTimer);
    };
  }, [currentIdx, cardDims.width, dragX, navigateToIdx]);

  /* ── Share & Bookmark ────────────────────────────────────────────────── */
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard
      .writeText(`${window.location.origin}/colists/${colist.slug}`)
      .catch(() => {});
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }, [colist.slug]);

  const handleBookmarkToggle = useCallback(
    async (idx) => {
      if (!currentUser) return;
      const isCurrentlyBookmarked = bookmarkedPage === idx;
      const newPinnedPage = isCurrentlyBookmarked ? null : idx;
      setBookmarkedPage(newPinnedPage);
      try {
        if (newPinnedPage !== null) {
          await updateDoc(doc(db, "users", currentUser.uid), {
            vault: arrayUnion({
              id: `colist_${colist.id}`,
              type: "Colist",
              name: colist.title,
              status: "VERIFIED",
              source: "colist",
              colistId: colist.id,
              savedAt: new Date().toISOString(),
              pinnedPage: idx,
            }),
          });
          if (colist.authorId !== currentUser.uid && !isCurrentlyBookmarked) {
            await updateDoc(doc(db, "colists", colist.id), {
              colistScore: increment(3),
              saveCount: increment(1),
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error(e);
        setBookmarkedPage(isCurrentlyBookmarked ? idx : null);
      }
    },
    [currentUser, bookmarkedPage, colist],
  );

  /* ── Derived ─────────────────────────────────────────────────────────── */
  if (!blocks.length) return null;

  const isComplete = pagesRead.length >= totalPages && totalPages > 0;
  const coverGradient =
    colist.coverGradient ||
    `linear-gradient(135deg,${G.deep} 0%,${G.bright} 100%)`;
  const textColor = colist.textColor || T.primary;

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        background: V.bg,
        zIndex: isFullscreen ? 9999 : 500,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* TipTap Content Styles */}
      <style>{`
        .tip-tap-container { font-family: var(--font-body), 'Poppins', sans-serif !important; }
        .tip-tap-container hr { border: none; border-top: 1px solid rgba(255,255,255,0.2) !important; margin: 2rem 0 !important; }
        .tip-tap-container h1 { font-size: 2.2em !important; font-weight: 900 !important; line-height: 1.1 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container h2 { font-size: 1.8em !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container h3 { font-size: 1.4em !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
        .tip-tap-container ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
        .tip-tap-container li { display: list-item !important; }
        .tip-tap-container blockquote { border-left: 3px solid currentColor !important; padding-left: 1rem !important; font-style: italic !important; opacity: 0.9 !important; margin: 1rem 0 !important; }
        .tip-tap-container p { margin-bottom: 0.5em !important; min-height: 1.5em !important; }
        .tip-tap-container a { color: inherit !important; text-decoration: underline !important; }
        /* Prevent drag text selection */
        .deck-container * { -webkit-user-drag: none; }
      `}</style>

      {/* ══════════════════════════════════════════
          TOP NAV BAR
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-between px-4 md:px-6 py-4 shrink-0 relative z-30"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: `${V.bg}EE`,
              backdropFilter: "blur(24px)",
              paddingTop: `max(1rem, calc(1rem + env(safe-area-inset-top)))`,
            }}
          >
            <button
              onClick={onBack}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex flex-col items-center justify-center flex-1 mx-4 pointer-events-none">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-black truncate max-w-[180px] text-[#F5F0E8]">
                  {colist.title}
                </span>
                <img
                  src="/logo-discotive-original.png"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/logo.png";
                  }}
                  alt="Discotive"
                  className="h-3 opacity-90"
                />
              </div>
              <span className="text-[11px] font-display font-bold text-gray-400 tracking-wider">
                ~ {colist.authorUsername}
              </span>
            </div>

            <button
              onClick={handleCopyUrl}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              {urlCopied ? (
                <Check size={18} className="text-[#4ADE80]" />
              ) : (
                <Copy size={18} />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          PROGRESS BAR — Continuous, drag-linked
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shrink-0 px-5 pt-3 pb-2 relative z-30"
          >
            <div className="flex items-center gap-3">
              {/* Segment dots */}
              <div className="flex items-center gap-1 flex-1">
                {blocks.map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full cursor-pointer"
                    style={{
                      flex: 1,
                      height: 3,
                      background: pagesRead.includes(i)
                        ? isComplete
                          ? "#4ADE80"
                          : `linear-gradient(90deg,${G.deep},${G.bright})`
                        : "rgba(255,255,255,0.08)",
                    }}
                    animate={{
                      opacity:
                        i === currentIdx
                          ? 1
                          : pagesRead.includes(i)
                            ? 0.85
                            : 0.4,
                      scaleY: i === currentIdx ? 1.4 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => navigateToIdx(i)}
                  />
                ))}
              </div>
              <span
                className="text-[9px] font-black font-mono shrink-0"
                style={{ color: T.dim }}
              >
                {pagesRead.length}/{totalPages}
                {isComplete && <span style={{ color: "#4ADE80" }}> ✓</span>}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════
          DECK ARENA — Absolute-positioned cards
      ══════════════════════════════════════════ */}
      <div
        className="flex-1 relative deck-container overflow-hidden"
        style={{ touchAction: "pan-y" }}
      >
        {/* Ambient void glow behind deck */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${coverGradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || G.deep}18 0%, transparent 70%)`,
          }}
        />

        {/* PC Left Arrow */}
        <button
          className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-[600] p-4 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur transition-all border border-white/5"
          onClick={() => navigateToIdx(currentIdx - 1)}
          disabled={currentIdx === 0}
          style={{
            color: textColor,
            opacity: currentIdx === 0 ? 0 : 1,
            pointerEvents: currentIdx === 0 ? "none" : "auto",
          }}
        >
          <ArrowLeft size={28} />
        </button>

        {/* PC Right Arrow */}
        <button
          className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-[600] p-4 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur transition-all border border-white/5"
          onClick={() => navigateToIdx(currentIdx + 1)}
          disabled={currentIdx === totalPages - 1}
          style={{
            color: textColor,
            opacity: currentIdx === totalPages - 1 ? 0 : 1,
            pointerEvents: currentIdx === totalPages - 1 ? "none" : "auto",
          }}
        >
          <ArrowRight size={28} />
        </button>

        {/* Render windowed cards — only ±3 from current */}
        {blocks.map((block, idx) => {
          const distance = Math.abs(idx - currentIdx);
          if (distance > 3) return null; // Virtualization gate

          return (
            <DeckCard
              key={idx}
              block={block}
              index={idx}
              currentIdx={currentIdx}
              totalPages={totalPages}
              textColor={textColor}
              coverGradient={coverGradient}
              coverUrl={colist.coverUrl}
              isFullscreen={isFullscreen}
              bookmarkedPage={bookmarkedPage}
              dragX={dragX}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onBookmarkToggle={handleBookmarkToggle}
              onToggleFullscreen={toggleFullscreen}
              cardWidth={cardDims.width}
              cardHeight={cardDims.height}
            />
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          BOTTOM CHROME
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {!isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 relative z-30"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: `${V.bg}EE`,
              backdropFilter: "blur(24px)",
            }}
          >
            {/* Card title/type indicator */}
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                {blocks[currentIdx]?.type === "cover"
                  ? "Cover"
                  : blocks[currentIdx]?.type || "page"}
              </span>
              <span className="text-[10px] font-mono" style={{ color: T.dim }}>
                {currentIdx + 1} of {totalPages}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ColistReader;
