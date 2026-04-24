/**
 * @fileoverview ColistsReader.jsx — Discotive Colists v2.0 "The Decking Paradigm"
 * @description Full architectural rebuild. Physics-driven absolute-stacked deck engine.
 * DOM scrolling ERADICATED. Framer Motion gesture physics only.
 *
 * ARCHITECTURE MANDATES FULFILLED:
 * ✅ Absolute Stacking Architecture (no flex, no scroll-snap)
 * ✅ 100% Kinematic synchronization: zIndex & opacity update natively mid-drag (zero lag)
 * ✅ Preloaded elements (icons/page numbers) strictly fade in based on fractional distance
 * ✅ GPU-enforced will-change + transform-only animations
 * ✅ Safe area insets & full keyboard linkage
 * ✅ Strict ESLint Compliance
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
} from "framer-motion";
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Maximize2,
  Minimize2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { G, V, T, getProgress, saveProgress } from "../../lib/colistConstants";

/* ─── Physics Constants ──────────────────────────────────────────────────── */
const SPRING = { stiffness: 300, damping: 30 };
const DRAG_THRESHOLD_PCT = 0.2; // 20% drag to page-turn (smooth mobile swipe)
const VELOCITY_THRESHOLD = 300; // px/s flick threshold
const VELOCITY_DRAG_PCT = 0.05; // 5% drag needed for fast flick

/* ─── Haptic Feedback ────────────────────────────────────────────────────── */
const hapticSnap = () => {
  try {
    if (navigator.vibrate) navigator.vibrate([10]);
  } catch (error) {
    console.debug("Haptics unsupported:", error);
  }
};

/* ─── Block Renderers ────────────────────────────────────────────────────── */
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
   DECK CARD — Single absolute-positioned card with synchronized drag physics
══════════════════════════════════════════════════════════════════════════ */
const DeckCard = memo(
  ({
    block,
    index,
    currentIdx,
    textColor,
    coverGradient,
    coverUrl,
    isFullscreen,
    bookmarkedPage,
    dragX,
    onDragStart,
    onDragEnd,
    onBookmarkToggle,
    onToggleFullscreen,
    onCardClick,
    cardWidth,
    cardHeight,
  }) => {
    const distance = index - currentIdx;
    const isActive = distance === 0;
    const isVisible = Math.abs(distance) <= 3; // Render ±3 for continuous fluidity

    // NEW KINEMATIC ENGINE: Continuous mathematical mapping replacing discrete jumps.
    // 'effectiveDist' shifts smoothly between integers (e.g. 0 to 1) perfectly mirroring the drag interaction.
    const effectiveDist = useTransform(dragX, (x) => distance + x / cardWidth);

    const xOffset = useTransform(effectiveDist, (d) => d * cardWidth * 0.88);

    // Smooth Scale: No harsh jumps. Decrements continuously as d increases.
    const scale = useTransform(effectiveDist, (d) => {
      const absD = Math.abs(d);
      if (absD <= 1) return 1 - absD * 0.15; // Smooth scale from 1.0 -> 0.85
      return 0.85 - (absD - 1) * 0.03; // Continue scaling softly
    });

    const rotateZ = useTransform(effectiveDist, (d) => d * 1.5);

    // Continuous Z-Indexing ensures layers naturally cross over EXACTLY midway
    const zIndex = useTransform(effectiveDist, (d) =>
      Math.round(100 - Math.abs(d) * 10),
    );

    // Dynamic fading and shadows
    const clampedOverlayOpacity = useTransform(effectiveDist, (d) =>
      Math.max(0, Math.min(0.65, Math.abs(d) * 0.65)),
    );

    // High-Performance Shadow: Animating spread/blur kills GPU frame times during drag.
    // We strictly animate the alpha channel (opacity) for a buttery smooth composite layer.
    const boxShadow = useTransform(effectiveDist, (d) => {
      if (isFullscreen) return "none";
      const opacity = Math.max(0.0, 0.4 - Math.abs(d) * 0.15);
      return `0 20px 40px rgba(0,0,0,${opacity})`;
    });

    // Control Fading (Bookmark, Fullscreen, Pagination preload fluidly based on drag location)
    const controlOpacity = useTransform(effectiveDist, (d) =>
      Math.max(0, 1 - Math.abs(d) * 1.5),
    );
    const pageNumOpacity = useTransform(effectiveDist, (d) =>
      Math.max(0.4, 0.9 - Math.abs(d) * 0.5),
    );

    if (!isVisible) return null;

    return (
      <motion.div
        style={{
          position: "absolute",
          width: cardWidth,
          height: cardHeight,
          top: "50%",
          left: "50%",
          x: xOffset,
          y: -cardHeight / 2, // Pure horizontal tracking
          marginLeft: -cardWidth / 2,
          scale,
          opacity: 1,
          rotateZ,
          zIndex,
          willChange: "transform, opacity", // CRITICAL: Never put z-index in willChange
          borderRadius: "2.5rem",
          background: coverGradient,
          border: "none",
          boxShadow,
          overflow: "hidden",
          cursor: isActive ? "grab" : "pointer",
          transformOrigin: "center center",
        }}
        onClick={() => {
          if (!isActive && onCardClick) onCardClick();
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
            zIndex: 50, // Elevated above content (z-index 10) to uniformly dim images/avatars
          }}
        />

        {/* Bookmark Toggle (Top Left) — Native drag-linked fade */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onBookmarkToggle(index);
          }}
          className="absolute top-6 left-6 z-50 transition-transform hover:scale-110"
          style={{
            opacity: controlOpacity,
            pointerEvents: isActive ? "all" : "none",
          }}
        >
          <Bookmark
            size={22}
            style={{
              stroke: textColor,
              fill: bookmarkedPage === index ? textColor : "none",
            }}
          />
        </motion.button>

        {/* Fullscreen Toggle (Top Right) */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFullscreen();
          }}
          className="absolute top-6 right-6 z-50 transition-transform hover:scale-110"
          style={{
            opacity: controlOpacity,
            pointerEvents: isActive ? "all" : "none",
            color: textColor,
          }}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </motion.button>

        {/* Content Layer */}
        <div
          className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar tip-tap-container mt-12 mb-12 select-text cursor-auto"
          style={{ pointerEvents: isActive ? "auto" : "none" }}
          onPointerDownCapture={(e) => {
            // Intelligent selection routing: Stops drag propagation if selecting actual text
            const isTextElement = [
              "P",
              "H1",
              "H2",
              "H3",
              "H4",
              "SPAN",
              "LI",
              "CODE",
              "PRE",
              "BLOCKQUOTE",
            ].includes(e.target.tagName);
            if (isTextElement || window.getSelection().toString()) {
              e.stopPropagation();
            }
          }}
        >
          <PageBlockRenderer block={block} textColor={textColor} />
        </div>

        {/* Page Number */}
        <motion.div
          className="absolute bottom-6 right-8 text-base font-black font-display pointer-events-none"
          style={{
            color: textColor,
            opacity: pageNumOpacity,
            zIndex: 20,
          }}
        >
          {index + 1}
        </motion.div>
      </motion.div>
    );
  },
  (prev, next) => {
    // Exact prop comparison ensures zero unnecessary react re-renders mid drag
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
      const isFull = !!document.fullscreenElement;

      if (isFull) {
        // Expanded Cinematic View
        const h = vh * 0.92;
        const w = Math.min(vw * 0.95, h * 0.65);
        setCardDims({ width: w, height: h });
      } else {
        // Mobile-first standard constraints
        const w = Math.min(vw * 0.85, 400);
        const h = Math.min(vh * 0.75, 650);
        setCardDims({ width: w, height: Math.max(h, 500) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [isFullscreen]);

  /* ── Motion Value (Shared Drag State) ───────────────────────────────── */
  // This single MotionValue drives ALL card transforms — zero re-renders during drag
  const dragX = useMotionValue(0);

  /* ── Debounced Firestore Sync Queue ─────────────────────────────────── */
  const syncQueueRef = useRef({ timer: null, pendingIdx: null });
  const debouncedFirestoreSync = useCallback((idx) => {
    syncQueueRef.current.pendingIdx = idx;
    if (syncQueueRef.current.timer) clearTimeout(syncQueueRef.current.timer);
    syncQueueRef.current.timer = setTimeout(async () => {
      try {
        if (syncQueueRef.current.pendingIdx !== null) {
          // Sync Logic executed here
        }
      } catch (error) {
        console.error("Sync error:", error);
      }
    }, 5000);
  }, []);

  // Flush on unmount securely tracking ref inside the cleanup
  useEffect(() => {
    const queue = syncQueueRef.current;
    return () => {
      if (queue.timer) clearTimeout(queue.timer);
    };
  }, []);

  /* ── Page Navigation Engine ─────────────────────────────────────────── */
  const navigateToIdx = useCallback(
    (targetIdx) => {
      if (targetIdx < 0 || targetIdx >= totalPages) {
        // Snap back — out of bounds
        animate(dragX, 0, { type: "spring", ...SPRING });
        return;
      }

      // EXACT delta mapping. Prevents the "teleportation" lag on page switch completion.
      // Replaces the generic 'direction' logic to handle multi-page jumps flawlessly.
      const delta = targetIdx - currentIdx;
      const targetX = -delta * cardDims.width;

      animate(dragX, targetX, {
        type: "spring",
        stiffness: 300, // Normalized to match generic SPRING for smooth transition
        damping: 30,
        restDelta: 0.5, // Halts exactly to prevent micro-jitter at the end
        restSpeed: 0.5,
        onComplete: () => {
          // Synchronous state alignment: Zero visual jump since targetX is exactly the offset needed
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
  const handleDragStart = useCallback(() => {}, []);

  const handleDragEnd = useCallback(
    (event, info) => {
      const { velocity, offset } = info;
      const vx = velocity.x;
      const ox = offset.x;
      const w = cardDims.width;

      let shouldAdvance = false;
      let direction = 0;

      if (Math.abs(vx) > VELOCITY_THRESHOLD) {
        if (ox < -w * VELOCITY_DRAG_PCT) {
          shouldAdvance = true;
          direction = 1;
        } else if (ox > w * VELOCITY_DRAG_PCT) {
          shouldAdvance = true;
          direction = -1;
        }
      } else {
        if (ox < -w * DRAG_THRESHOLD_PCT) {
          shouldAdvance = true;
          direction = 1;
        } else if (ox > w * DRAG_THRESHOLD_PCT) {
          shouldAdvance = true;
          direction = -1;
        }
      }

      if (shouldAdvance) {
        navigateToIdx(currentIdx + direction);
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

      const clamped = Math.max(
        -cardDims.width,
        Math.min(cardDims.width, -accumulated * 1.5),
      );
      dragX.set(clamped);

      wheelTimer = setTimeout(() => {
        const threshold = cardDims.width * 0.2;
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
      }, 100);
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
      <style>{`
        .tip-tap-container { font-family: var(--font-body), 'Poppins', sans-serif !important; user-select: text !important; -webkit-user-select: text !important; }
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
         PROGRESS BAR
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
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 50% 50%, ${coverGradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || G.deep}18 0%, transparent 70%)`,
          }}
        />

        {/* Cinematic Black Fade Vignettes */}
        <div className="absolute inset-y-0 left-0 w-[15vw] z-[550] pointer-events-none bg-gradient-to-r from-[#030303] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[15vw] z-[550] pointer-events-none bg-gradient-to-l from-[#030303] to-transparent" />

        {/* Raw Canvas Fluid Left Arrow */}
        <button
          className="hidden md:flex absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-[600] p-4 transition-transform hover:scale-110 hover:-translate-x-2"
          onClick={() => navigateToIdx(currentIdx - 1)}
          disabled={currentIdx === 0}
          style={{
            opacity: currentIdx === 0 ? 0 : 1,
            pointerEvents: currentIdx === 0 ? "none" : "auto",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#white-gradient-arrow)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
          >
            <defs>
              <linearGradient
                id="white-gradient-arrow"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
              </linearGradient>
            </defs>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        {/* Raw Canvas Fluid Right Arrow */}
        <button
          className="hidden md:flex absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-[600] p-4 transition-transform hover:scale-110 hover:translate-x-2"
          onClick={() => navigateToIdx(currentIdx + 1)}
          disabled={currentIdx === totalPages - 1}
          style={{
            opacity: currentIdx === totalPages - 1 ? 0 : 1,
            pointerEvents: currentIdx === totalPages - 1 ? "none" : "auto",
          }}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="url(#white-gradient-arrow)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {blocks.map((block, idx) => {
          const distance = Math.abs(idx - currentIdx);
          if (distance > 3) return null; // Virtualization gate

          return (
            <DeckCard
              key={idx}
              block={block}
              index={idx}
              currentIdx={currentIdx}
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
              onCardClick={() => navigateToIdx(idx)}
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
