/**
 * @fileoverview ColistsReader.jsx — Discotive Colists Horizontal Carousel Reader
 * @description 1:1 Parity with Editor Canvas. Native snap-x scrolling with dynamic viewport centering.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../firebase";
import {
  ArrowLeft,
  Bookmark,
  Share2,
  Check,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
} from "lucide-react";
import { cn } from "../../lib/cn";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const G = { base: "#BFA264", bright: "#D4AF78", deep: "#8B7240" };
const V = { bg: "#030303", surface: "#0F0F0F", elevated: "#141414" };
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

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

/* ─── Block Renderers (Strict Content-Only Parity) ───────────────────────── */

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
});

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
          “{block.content}”
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
});

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
              style={{
                background: tc,
                color: V.bg,
              }}
            >
              Open Link <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

const CodeBlock = memo(({ block }) => {
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
          className="p-5 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar"
          style={{ color: "#e6edf3", margin: 0, maxHeight: "50vh" }}
        >
          <code>{block.content}</code>
        </pre>
      </div>
    </div>
  );
});

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
});

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
});

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
});

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COLIST READER
══════════════════════════════════════════════════════════════════════════ */
const ColistReader = ({
  colist,
  onBack,
  currentUser,
  userData,
  setShowBottomNav,
}) => {
  const uid = currentUser?.uid;
  const scrollContainerRef = useRef(null);

  /* ── Blocks (filter orphan dividers) ────────────────────────────────── */
  const blocks = useMemo(
    () =>
      (colist.blocks || []).filter(
        (b) => b.type !== "divider" || (colist.blocks || []).indexOf(b) > 0,
      ),
    [colist.blocks],
  );
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
  const [shareToast, setShareToast] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Single Bookmark Logic
  const [bookmarkedPage, setBookmarkedPage] = useState(() => {
    const vaultItem = userData?.vault?.find((v) => v.colistId === colist.id);
    return vaultItem?.pinnedPage ?? null;
  });

  // Automatically jump to the bookmarked page on mount if it exists
  useEffect(() => {
    if (bookmarkedPage !== null && currentIdx === 0) {
      setCurrentIdx(bookmarkedPage);
      setTimeout(() => scrollToIdx(bookmarkedPage), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── View count on mount ─────────────────────────────────────────────── */
  useEffect(() => {
    updateDoc(doc(db, "colists", colist.id), { viewCount: increment(1) }).catch(
      () => {},
    );
  }, [colist.id]);

  /* ── Fullscreen Protocol ─────────────────────────────────────────────── */
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

  /* ── Carousel Scroll Engine ──────────────────────────────────────────── */
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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const idx = Number(entry.target.dataset.idx);
            setCurrentIdx(idx);
            markPageRead(idx);
          }
        });
      },
      { root: container, threshold: 0.5 },
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [blocks, markPageRead]);

  const scrollToIdx = useCallback(
    (idx) => {
      if (idx < 0 || idx >= totalPages) return;
      const child = scrollContainerRef.current?.querySelector(
        `[data-idx="${idx}"]`,
      );
      if (child) child.scrollIntoView({ behavior: "smooth", inline: "center" });
    },
    [totalPages],
  );

  /* ── Keyboard navigation ─────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "ArrowRight" ||
        e.key === "ArrowDown" ||
        (e.key === "Enter" && e.shiftKey)
      ) {
        e.preventDefault();
        scrollToIdx(currentIdx + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIdx(currentIdx - 1);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIdx, totalPages, scrollToIdx, onBack]);

  /* ── Share & Save ────────────────────────────────────────────────────── */
  const handleShare = useCallback(() => {
    navigator.clipboard
      .writeText(`${window.location.origin}/colists/${colist.slug}`)
      .catch(() => {});
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2200);
  }, [colist.slug]);

  const handleBookmarkToggle = useCallback(
    async (idx) => {
      if (!currentUser) return;
      const isCurrentlyBookmarked = bookmarkedPage === idx;
      const newPinnedPage = isCurrentlyBookmarked ? null : idx;

      setBookmarkedPage(newPinnedPage); // Optimistic UI update

      try {
        if (newPinnedPage !== null) {
          // Add to vault (Simplified logic. Assuming the system merges arrays robustly).
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

          // Award score if saving someone else's work
          if (colist.authorId !== currentUser.uid && !isCurrentlyBookmarked) {
            await updateDoc(doc(db, "colists", colist.id), {
              colistScore: increment(3),
              saveCount: increment(1),
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error(e);
        setBookmarkedPage(isCurrentlyBookmarked ? idx : null); // Rollback on fail
      }
    },
    [currentUser, bookmarkedPage, colist],
  );

  /* ── Derived values ──────────────────────────────────────────────────── */
  if (!blocks.length) return null;
  const progressPct =
    totalPages > 0 ? (pagesRead.length / totalPages) * 100 : 0;
  const isComplete = pagesRead.length >= totalPages && totalPages > 0;
  const coverGradient =
    colist.coverGradient ||
    `linear-gradient(135deg,${G.deep} 0%,${G.bright} 100%)`;
  const textColor = colist.textColor || T.primary;

  /* ── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none transition-colors duration-500"
      style={{ background: V.bg, zIndex: isFullscreen ? 9999 : 500 }}
    >
      <style>{`
        .tip-tap-container { font-family: var(--font-body), 'Poppins', sans-serif !important; }
        .tip-tap-container hr { border: none; border-top: 1px solid var(--editor-text-color) !important; opacity: 0.3 !important; margin: 2rem 0 !important; }
        .tip-tap-container h1 { font-size: 2.2em !important; font-weight: 900 !important; line-height: 1.1 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container h2 { font-size: 1.8em !important; font-weight: 800 !important; line-height: 1.2 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container h3 { font-size: 1.4em !important; font-weight: 700 !important; line-height: 1.3 !important; margin-bottom: 0.5em !important; margin-top: 0.5em !important; }
        .tip-tap-container ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
        .tip-tap-container ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em !important; }
        .tip-tap-container li { display: list-item !important; }
        .tip-tap-container blockquote { border-left: 3px solid var(--editor-text-color) !important; padding-left: 1rem !important; font-style: italic !important; opacity: 0.9 !important; margin: 1rem 0 !important; }
        .tip-tap-container p { margin-bottom: 0.5em !important; min-height: 1.5em !important; }
        .tip-tap-container a { color: inherit !important; text-decoration: underline !important; }
      `}</style>

      {/* Solid Bookmark Active Gradient */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <linearGradient id="orange-solid" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="#f97316" offset="0%" />
          <stop stopColor="#ea580c" offset="100%" />
        </linearGradient>
      </svg>

      {/* ════════════════════════════════════════════
          TOP NAV BAR (Hidden in Fullscreen)
      ══════════════════════════════════════════ */}
      {!isFullscreen && (
        <div
          className="flex items-center justify-between px-4 md:px-6 py-4 shrink-0 relative z-30"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: `${V.bg}EE`,
            backdropFilter: "blur(24px)",
          }}
        >
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex flex-col items-center justify-center flex-1 mx-4 pointer-events-none">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-black truncate max-w-[200px] text-[#F5F0E8]">
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

          <div className="flex items-center gap-4">
            <button
              onClick={handleShare}
              className="text-white/60 hover:text-white transition-colors"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          CAROUSEL
      ══════════════════════════════════════════ */}
      <div className="flex-1 relative overflow-hidden">
        {/* Dynamic Contextual Padding to enforce perfect centering of the active card */}
        <div
          ref={scrollContainerRef}
          className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar snap-x snap-mandatory flex items-center gap-4 md:gap-8 relative z-20"
          style={{
            scrollBehavior: "smooth",
            // 42.5vw is half of the 85vw width. 200px is half of the 400px max-width.
            paddingInline: "calc(50vw - min(42.5vw, 200px))",
          }}
        >
          {blocks.map((block, idx) => (
            <div
              key={idx}
              data-idx={idx}
              className="w-[85vw] max-w-[400px] h-[75vh] min-h-[500px] shrink-0 snap-center rounded-[2.5rem] flex flex-col relative transition-all border border-white/10"
              style={{
                background: coverGradient,
                color: textColor,
                boxShadow: isFullscreen
                  ? "none"
                  : "0 20px 50px rgba(0,0,0,0.5)",
              }}
            >
              {colist.coverUrl && (
                <img
                  src={colist.coverUrl}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay pointer-events-none rounded-[2.5rem]"
                  alt=""
                />
              )}

              {/* Bookmark Toggle (Top Left) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmarkToggle(idx);
                }}
                className="absolute top-6 left-6 z-50 transition-transform hover:scale-110"
              >
                <Bookmark
                  size={22}
                  style={{
                    stroke:
                      bookmarkedPage === idx
                        ? "url(#orange-solid)"
                        : "rgba(255,255,255,0.4)",
                    fill:
                      bookmarkedPage === idx ? "url(#orange-solid)" : "none",
                  }}
                />
              </button>

              {/* Fullscreen Toggle (Top Right) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="absolute top-6 right-6 z-50 transition-transform hover:scale-110 text-white/50 hover:text-white"
              >
                {isFullscreen ? (
                  <Minimize2 size={20} />
                ) : (
                  <Maximize2 size={20} />
                )}
              </button>

              {/* Content Render Layer */}
              <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar tip-tap-container mt-12 mb-12">
                <PageBlockRenderer block={block} textColor={textColor} />
              </div>

              {/* Page Number (Bottom Right) */}
              <div
                className="absolute bottom-6 right-8 text-base font-black font-display pointer-events-none"
                style={{ color: textColor, opacity: 0.5 }}
              >
                {idx + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Nav Chevrons (Only visible on larger screens) */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: currentIdx === 0 ? 0 : 1 }}
          onClick={() => scrollToIdx(currentIdx - 1)}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/40 border border-white/10 text-white/50 hover:text-white backdrop-blur-md hidden md:flex transition-all"
        >
          <ChevronLeft size={24} />
        </motion.button>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: currentIdx >= totalPages - 1 ? 0 : 1 }}
          onClick={() => scrollToIdx(currentIdx + 1)}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-black/40 border border-white/10 text-white/50 hover:text-white backdrop-blur-md hidden md:flex transition-all"
        >
          <ChevronRight size={24} />
        </motion.button>
      </div>

      {/* ════════════════════════════════════════════
          BOTTOM CHROME (Hidden in Fullscreen)
      ══════════════════════════════════════════ */}
      {!isFullscreen && (
        <div
          className="shrink-0 px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-3.5 relative z-30 flex flex-col gap-3"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: `${V.bg}EE`,
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex-1 overflow-hidden rounded-full"
              style={{ height: 2.5, background: "rgba(255,255,255,0.07)" }}
            >
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{
                  background: isComplete
                    ? "#4ADE80"
                    : `linear-gradient(90deg,${G.deep},${G.bright})`,
                }}
              />
            </div>
            <span
              className="text-[9px] font-black font-mono shrink-0"
              style={{ color: T.dim }}
            >
              {pagesRead.length}/{totalPages}
              {isComplete && <span style={{ color: "#4ADE80" }}> ✓</span>}
            </span>
          </div>
        </div>
      )}

      {/* ── Share Toast Notification ── */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#4ADE80]/15 border border-[#4ADE80]/30 text-[#4ADE80] px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest z-[9999] backdrop-blur-md flex items-center gap-2 shadow-[0_0_20px_rgba(74,222,128,0.2)]"
          >
            <Check size={14} /> Link Copied
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ColistReader;
