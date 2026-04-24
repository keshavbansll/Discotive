import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  startAfter,
} from "firebase/firestore";
import { db } from "../../firebase";
import { cn } from "../../lib/cn";
import {
  BookOpen,
  Clock,
  Eye,
  Check,
  Play,
  Search,
  Filter,
  Star,
  Award,
  ChevronRight,
  Loader2,
  X,
  TrendingUp,
} from "lucide-react";

import {
  G,
  V,
  T,
  COVER_GRADIENTS,
  VERIFICATION_TIERS,
  estimateReadTime,
  getProgress,
} from "../../lib/colistConstants";
import { ResonanceRing, VerificationBadge } from "./ColistShared";

/* ─── Telemetry & Hooks ──────────────────────────────────────────────────── */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

/* ─── Micro-Components ───────────────────────────────────────────────────── */
const TagPill = memo(({ active, onClick, label }) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all"
    style={{
      background: active ? G.dimBg : "transparent",
      color: active ? G.bright : T.dim,
      borderColor: active ? G.border : "rgba(255,255,255,0.06)",
    }}
  >
    {label}
  </motion.button>
));

const ShimmerSkeleton = memo(({ height = 120, className }) => (
  <div
    className={cn("relative overflow-hidden rounded-2xl", className)}
    style={{
      background: V.surface,
      border: "1px solid rgba(255,255,255,0.04)",
      height,
    }}
  >
    <motion.div
      animate={{ x: ["-100%", "200%"] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className="absolute inset-0 z-10"
      style={{
        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)`,
      }}
    />
  </div>
));

/* ─── Architecture: Desktop Card ─────────────────────────────────────────── */
const PCFeedCard = memo(({ colist, onRead, progress }) => {
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

  return (
    <motion.div
      whileHover={{
        y: -4,
        borderColor: isOriginal ? G.bright : "rgba(255,255,255,0.15)",
      }}
      onClick={() => onRead(colist)}
      className="group flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-colors relative"
      style={{
        background: V.surface,
        border: `1px solid ${isOriginal ? G.border : "rgba(255,255,255,0.05)"}`,
        boxShadow: isOriginal ? `0 0 30px rgba(191,162,100,0.05)` : "none",
      }}
    >
      <div
        className="relative h-32 shrink-0 p-4 overflow-hidden flex flex-col justify-between"
        style={{
          background: colist.coverUrl
            ? "#111"
            : colist.coverGradient || COVER_GRADIENTS[0],
        }}
      >
        {colist.coverUrl && (
          <img
            src={colist.coverUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
            alt=""
          />
        )}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1]"
          style={{ background: "rgba(0,0,0,0.6)" }}
        />

        {isOriginal && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-[1]"
            style={{
              backgroundImage: "url(/noise.svg)",
              mixBlendMode: "overlay",
              opacity: 0.3,
            }}
          />
        )}

        <div className="relative z-10 flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {(colist.tags || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  backdropFilter: "blur(4px)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div
            className="px-2 py-1 rounded-lg text-[9px] font-bold"
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              backdropFilter: "blur(8px)",
            }}
          >
            <BookOpen size={10} className="inline mr-1" /> {blockCount} Nodes
          </div>
        </div>
      </div>

      <div
        className="flex flex-col gap-2 p-5 flex-1 relative z-10"
        style={{ background: V.surface }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3
            className="text-base font-black leading-snug line-clamp-2"
            style={{ color: T.primary }}
          >
            {colist.title}
          </h3>
          <ResonanceRing colistScore={colist.colistScore || 0} size={36} />
        </div>

        {colist.verificationTier && colist.verificationTier !== "weak" && (
          <VerificationBadge tier={colist.verificationTier} compact />
        )}

        <p
          className="text-xs leading-relaxed line-clamp-2 mt-1"
          style={{ color: T.secondary }}
        >
          {colist.description}
        </p>

        <div
          className="mt-auto pt-4 flex items-center justify-between border-t"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-black"
              style={{ background: G.dimBg, color: G.base }}
            >
              {colist.authorAvatar ? (
                <img
                  src={colist.authorAvatar}
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                colist.authorName?.charAt(0)
              )}
            </div>
            <span
              className="text-[10px] font-bold truncate max-w-[90px]"
              style={{ color: T.dim }}
            >
              @{colist.authorUsername}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: T.dim }}
            >
              <Eye size={10} /> {colist.viewCount || 0}
            </span>
            <span
              className="flex items-center gap-1 text-[10px] font-mono"
              style={{ color: T.dim }}
            >
              <Clock size={10} /> {mins}m
            </span>
          </div>
        </div>

        {/* Aggressive Hover CTA */}
        <div
          className="absolute bottom-0 left-0 right-0 p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex items-end"
          style={{
            background: `linear-gradient(to top, ${V.surface} 80%, transparent)`,
          }}
        >
          <button
            className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
            style={{
              background: isComplete
                ? "rgba(74,222,128,0.1)"
                : hasProgress
                  ? G.dimBg
                  : "#fff",
              color: isComplete ? "#4ADE80" : hasProgress ? G.bright : "#000",
              boxShadow: hasProgress
                ? `0 0 20px rgba(191,162,100,0.2)`
                : "none",
            }}
          >
            {isComplete ? (
              <>
                <Check size={12} /> Read Again
              </>
            ) : hasProgress ? (
              <>
                <Play size={12} /> Resume Pg {resumeIndex + 1}
              </>
            ) : (
              <>
                <Play size={12} /> Execute Now
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

/* ─── Architecture: Mobile Card ──────────────────────────────────────────── */
const MobileFeedCard = memo(({ colist, onRead, progress }) => {
  const blockCount = (colist.blocks || []).filter(
    (b) => b.type !== "divider",
  ).length;
  const isOriginal = colist.verificationTier === "original";
  const resumeIndex = progress?.pageIndex || 0;
  const hasProgress =
    (progress?.pagesRead?.length || 0) > 0 &&
    (progress?.pagesRead?.length || 0) < blockCount;

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => onRead(colist)}
      className="flex flex-col rounded-[28px] overflow-hidden relative mb-4"
      style={{
        background: V.depth,
        border: `1px solid ${isOriginal ? G.border : "rgba(255,255,255,0.04)"}`,
      }}
    >
      <div
        className="h-40 relative p-5 flex flex-col justify-between"
        style={{
          background: colist.coverUrl
            ? "#111"
            : colist.coverGradient || COVER_GRADIENTS[0],
        }}
      >
        {colist.coverUrl && (
          <img
            src={colist.coverUrl}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            alt=""
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-[1]" />

        <div className="relative z-10 flex justify-between w-full">
          <ResonanceRing colistScore={colist.colistScore || 0} size={32} />
          {colist.verificationTier && colist.verificationTier !== "weak" && (
            <VerificationBadge tier={colist.verificationTier} compact />
          )}
        </div>

        <div className="relative z-10 mt-auto">
          <h3 className="text-xl font-black text-white leading-tight mb-1">
            {colist.title}
          </h3>
          <span className="text-[10px] font-bold text-white/60">
            @{colist.authorUsername} • {estimateReadTime(colist.blocks || [])}{" "}
            min execution
          </span>
        </div>
      </div>

      {hasProgress && (
        <div
          className="w-full p-3 flex items-center justify-between"
          style={{ background: G.dimBg, borderTop: `1px solid ${G.border}` }}
        >
          <span
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: G.bright }}
          >
            In Progress
          </span>
          <span className="text-[10px] font-bold" style={{ color: G.base }}>
            Resume Page {resumeIndex + 1}{" "}
            <ChevronRight size={10} className="inline" />
          </span>
        </div>
      )}
    </motion.div>
  );
});

/* ─── Main Feed Engine ───────────────────────────────────────────────────── */
const ColistsHome = memo(({ onOpenReader, currentUser }) => {
  const uid = currentUser?.uid;
  const isMobile = useIsMobile();

  // Data States
  const [feed, setFeed] = useState([]);
  const [originals, setOriginals] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Engine States
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState(null);
  const [activeVerification, setActiveVerification] = useState(null);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  // Track user progress
  const progressMap = useMemo(() => {
    if (!uid) return {};
    const map = {};
    [...feed, ...originals].forEach((c) => {
      map[c.id] = getProgress(uid, c.id);
    });
    return map;
  }, [uid, feed, originals]);

  // Swimlane Segregation
  const activeExecutionLane = useMemo(() => {
    return feed.filter((c) => {
      const prog = progressMap[c.id];
      return (
        prog &&
        prog.pagesRead?.length > 0 &&
        prog.pagesRead.length <
          (c.blocks?.filter((b) => b.type !== "divider").length || 0)
      );
    });
  }, [feed, progressMap]);

  const fetchOriginals = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(
          collection(db, "colists"),
          where("isPublic", "==", true),
          where("verificationTier", "==", "original"),
          limit(5),
        ),
      );
      setOriginals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Originals fetch failed:", err);
    }
  }, []);

  const fetchFeed = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoadingFeed(true);
        setLastDoc(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const constraints = [where("isPublic", "==", true)];

        // Strict Database-level filtering (Requires Indexes)
        if (activeVerification)
          constraints.push(where("verificationTier", "==", activeVerification));
        if (activeTag)
          constraints.push(where("tags", "array-contains", activeTag));

        constraints.push(orderBy("createdAt", "desc"));
        constraints.push(limit(PAGE_SIZE));
        if (!reset && lastDoc) constraints.push(startAfter(lastDoc));

        const snap = await getDocs(
          query(collection(db, "colists"), ...constraints),
        );
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setFeed((prev) => (reset ? items : [...prev, ...items]));
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err) {
        console.error("Feed fetch failed. Verify indexes.", err);
      } finally {
        setLoadingFeed(false);
        setLoadingMore(false);
      }
    },
    [lastDoc, activeVerification, activeTag],
  );

  // Orchestrator
  useEffect(() => {
    fetchOriginals();
  }, [fetchOriginals]);

  useEffect(() => {
    fetchFeed(true);
  }, [activeVerification, activeTag]); // Re-run feed fetch when DB filters change

  // Local Client-Side Search (since Firebase lacks full-text)
  const filteredFeed = useMemo(() => {
    if (!search.trim()) return feed;
    const q = search.toLowerCase();
    return feed.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.authorUsername?.toLowerCase().includes(q),
    );
  }, [feed, search]);

  const allTags = useMemo(() => {
    const s = new Set();
    feed.forEach((c) => (c.tags || []).forEach((t) => s.add(t)));
    return [...s].slice(0, 12);
  }, [feed]);

  /* ─── Mobile Bottom Sheet Filter ───────────────────────────────────────── */
  const MobileFilterSheet = () => (
    <AnimatePresence>
      {showFiltersMobile && isMobile && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFiltersMobile(false)}
            className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            onDragEnd={(e, { offset }) => {
              if (offset.y > 100) setShowFiltersMobile(false);
            }}
            className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-[#0A0A0A] rounded-t-[40px] border-t border-white/10 shadow-2xl z-[9999] flex flex-col pb-[env(safe-area-inset-bottom)]"
          >
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 shrink-0" />
            <div className="p-8 overflow-y-auto flex-1 space-y-8">
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#555] mb-4">
                  Verification Matrix
                </h4>
                <div className="flex flex-wrap gap-2">
                  <TagPill
                    active={!activeVerification}
                    onClick={() => {
                      setActiveVerification(null);
                      setShowFiltersMobile(false);
                    }}
                    label="Global"
                  />
                  {["original", "strong", "medium"].map((tier) => (
                    <motion.button
                      key={tier}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setActiveVerification(
                          activeVerification === tier ? null : tier,
                        );
                        setShowFiltersMobile(false);
                      }}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all"
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
                        <Star size={10} />
                      ) : tier === "strong" ? (
                        <Award size={10} />
                      ) : null}{" "}
                      {tier}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-widest text-[#555] mb-4">
                  Execution Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  <TagPill
                    active={!activeTag}
                    onClick={() => {
                      setActiveTag(null);
                      setShowFiltersMobile(false);
                    }}
                    label="All Tags"
                  />
                  {allTags.map((tag) => (
                    <TagPill
                      key={tag}
                      active={activeTag === tag}
                      onClick={() => {
                        setActiveTag(activeTag === tag ? null : tag);
                        setShowFiltersMobile(false);
                      }}
                      label={tag}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen relative" style={{ background: V.bg }}>
      {/* Noise Texture layer */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
        style={{ backgroundImage: "url(/noise.svg)", mixBlendMode: "overlay" }}
      />

      {/* Hero Header */}
      <div
        className="relative z-10 pt-12 pb-8 px-5 md:px-10 border-b"
        style={{ borderColor: "rgba(255,255,255,0.03)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1
              className="font-display font-black leading-none mb-2"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                letterSpacing: "-0.04em",
                color: T.primary,
              }}
            >
              Colists.
            </h1>
            <p
              className="text-sm md:text-base max-w-md"
              style={{ color: T.secondary }}
            >
              High-signal knowledge carousels.
            </p>
          </motion.div>

          {/* Main Search Bar */}
          <div className="relative w-full md:w-80">
            <Search
              size={14}
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ color: "#666" }}
            />
            <input
              type="text"
              placeholder="Search loaded nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-xs font-bold outline-none transition-all placeholder:text-[#444]"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
                color: T.primary,
              }}
            />
            {isMobile && (
              <button
                onClick={() => setShowFiltersMobile(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-[#111] border border-white/5"
              >
                <Filter
                  size={12}
                  style={{
                    color: activeTag || activeVerification ? G.bright : "#888",
                  }}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 flex gap-12 relative z-10">
        {/* Desktop Persistent Sidebar */}
        {!isMobile && (
          <div className="hidden md:block w-64 shrink-0 space-y-10 sticky top-[100px] self-start">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-4 flex items-center gap-2">
                <Award size={12} /> Verification Status
              </h4>
              <div className="flex flex-col gap-2">
                <TagPill
                  active={!activeVerification}
                  onClick={() => setActiveVerification(null)}
                  label="Global Network"
                />
                {["original", "strong", "medium"].map((tier) => (
                  <motion.button
                    key={tier}
                    onClick={() =>
                      setActiveVerification(
                        activeVerification === tier ? null : tier,
                      )
                    }
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border transition-all text-left"
                    style={{
                      background:
                        activeVerification === tier
                          ? VERIFICATION_TIERS[tier].bg
                          : "transparent",
                      color:
                        activeVerification === tier
                          ? VERIFICATION_TIERS[tier].color
                          : T.secondary,
                      borderColor:
                        activeVerification === tier
                          ? VERIFICATION_TIERS[tier].border
                          : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {tier === "original" ? (
                      <Star size={10} />
                    ) : tier === "strong" ? (
                      <Award size={10} />
                    ) : null}{" "}
                    {tier}
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[#555] mb-4 flex items-center gap-2">
                <TrendingUp size={12} /> Active Domains
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <TagPill
                    key={tag}
                    active={activeTag === tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    label={tag}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feed Content */}
        <div className="flex-1 min-w-0 space-y-16">
          {/* Swimlane 1: Active Execution (Only shows if there's progress) */}
          {activeExecutionLane.length > 0 && !search && (
            <section>
              <h2
                className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
                style={{ color: G.bright }}
              >
                <Play size={12} /> Active Execution
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeExecutionLane.map((c) =>
                  isMobile ? (
                    <MobileFeedCard
                      key={`act-${c.id}`}
                      colist={c}
                      onRead={onOpenReader}
                      progress={progressMap[c.id]}
                    />
                  ) : (
                    <PCFeedCard
                      key={`act-${c.id}`}
                      colist={c}
                      onRead={onOpenReader}
                      progress={progressMap[c.id]}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          {/* Swimlane 2: The Originals (Horizontal Scroll) */}
          {originals.length > 0 &&
            !search &&
            !activeTag &&
            !activeVerification && (
              <section>
                <h2
                  className="text-[11px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2"
                  style={{ color: T.primary }}
                >
                  <Star size={12} style={{ color: G.bright }} /> The Originals
                </h2>
                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5 md:mx-0 md:px-0 snap-x">
                  {originals.map((c) => (
                    <div
                      key={`orig-${c.id}`}
                      className="w-[85vw] md:w-[400px] shrink-0 snap-center"
                    >
                      {isMobile ? (
                        <MobileFeedCard
                          colist={c}
                          onRead={onOpenReader}
                          progress={progressMap[c.id]}
                        />
                      ) : (
                        <PCFeedCard
                          colist={c}
                          onRead={onOpenReader}
                          progress={progressMap[c.id]}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

          {/* Swimlane 3: Network Resonance (Main Grid) */}
          <section>
            <h2
              className="text-[11px] font-black uppercase tracking-[0.2em] mb-4"
              style={{ color: T.dim }}
            >
              {search
                ? "Search Results"
                : activeVerification
                  ? `${activeVerification} Network`
                  : "Global Network"}
            </h2>

            {loadingFeed ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                  <ShimmerSkeleton key={i} height={isMobile ? 180 : 320} />
                ))}
              </div>
            ) : filteredFeed.length === 0 ? (
              <div
                className="py-20 text-center border border-dashed rounded-3xl"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <BookOpen
                  size={48}
                  className="mx-auto mb-4 opacity-10"
                  style={{ color: T.primary }}
                />
                <h3
                  className="text-lg font-black mb-1"
                  style={{ color: T.primary }}
                >
                  No Colists Found
                </h3>
                <p className="text-xs" style={{ color: T.dim }}>
                  Adjust your filters or query parameters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredFeed.map((c) =>
                  isMobile ? (
                    <MobileFeedCard
                      key={c.id}
                      colist={c}
                      onRead={onOpenReader}
                      progress={progressMap[c.id]}
                    />
                  ) : (
                    <PCFeedCard
                      key={c.id}
                      colist={c}
                      onRead={onOpenReader}
                      progress={progressMap[c.id]}
                    />
                  ),
                )}
              </div>
            )}

            {hasMore && !loadingFeed && filteredFeed.length > 0 && !search && (
              <div className="mt-12 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => fetchFeed(false)}
                  disabled={loadingMore}
                  className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border transition-colors"
                  style={{
                    background: V.surface,
                    color: T.primary,
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Querying
                      Ledger...
                    </>
                  ) : (
                    <>
                      <TrendingUp size={14} /> Load More Nodes
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </section>
        </div>
      </div>

      <MobileFilterSheet />
    </div>
  );
});

export default ColistsHome;
