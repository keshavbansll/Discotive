/**
 * @fileoverview LearnPCLayout.jsx — Desktop Orchestrator for Learn Engine
 * @description
 * Implements the Netflix-style fluid UI for the Discotive Learn Engine.
 * Features:
 * - Cinematic Auto-rotating Hero Billboard
 * - Dynamic Z-Indexed horizontal carousels (prevents dropdown clipping)
 * - Infinite Canvas gradients (V.bg blending)
 * - Glassmorphism sticky headers
 */

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Info,
  FolderLock,
  Plus,
  Zap,
  Lock,
  Crown,
} from "lucide-react";
import LearnCard from "../../components/learn/LearnCard";
import { TYPE_CONFIG } from "../../lib/discotiveLearn";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
  border: "rgba(255,255,255,0.06)",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Hero Banner Component (The Billboard) ───────────────────────────────────
const LearnHero = memo(({ items, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items]);

  if (!items || items.length === 0) return null;

  const current = items[currentIndex];
  const typeConfig = TYPE_CONFIG[current.type] || TYPE_CONFIG.course;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "75vh", // Taller for cinematic feel
        minHeight: 500,
        backgroundColor: V.bg,
        overflow: "hidden",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${current.thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
          }}
        />
      </AnimatePresence>

      {/* Cinematic Overlays */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(3,3,3,0.95) 0%, rgba(3,3,3,0.5) 40%, transparent 100%)",
        }}
      />
      {/* Bottom fade into V.bg for infinite scroll illusion */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, ${V.bg} 0%, rgba(3,3,3,0.8) 10%, transparent 40%)`,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          left: "5%",
          maxWidth: "45%",
          zIndex: 10,
        }}
      >
        <motion.div
          key={`content-${current.id}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: typeConfig.color,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
                background: typeConfig.dimBg,
                padding: "6px 12px",
                borderRadius: 4,
                border: `1px solid ${typeConfig.border}`,
                boxShadow: `0 0 15px ${typeConfig.dimBg}`,
              }}
            >
              {current.isFeatured ? "Featured" : typeConfig.label}
            </span>
            {current.isNew && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#4ADE80",
                  letterSpacing: "0.1em",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                NEW RELEASE
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: T.primary,
              fontFamily: "'Montserrat', sans-serif",
              lineHeight: 1.1,
              marginBottom: 20,
              textShadow: "0 10px 30px rgba(0,0,0,0.9)",
              letterSpacing: "-0.02em",
            }}
          >
            {current.title}
          </h1>

          <p
            style={{
              fontSize: 16,
              color: T.secondary,
              fontFamily: "'Poppins', sans-serif",
              lineHeight: 1.6,
              marginBottom: 32,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 2px 10px rgba(0,0,0,0.8)",
            }}
          >
            {current.description}
          </p>

          <div style={{ display: "flex", gap: 16 }}>
            <button
              onClick={() => onSelect(current)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: T.primary,
                color: "#000",
                border: "none",
                padding: "14px 32px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "'Montserrat', sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.filter = "brightness(0.9)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.filter = "brightness(1)")
              }
            >
              <Play fill="#000" size={20} /> Watch Now
            </button>
            <button
              onClick={() => onSelect(current)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                color: T.primary,
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "14px 32px",
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.25)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
              }
            >
              <Info size={20} /> More Info
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hero Indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          right: "5%",
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        {items.map((_, idx) => (
          <div
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: idx === currentIndex ? 24 : 8,
              height: 4,
              borderRadius: 2,
              background:
                idx === currentIndex ? T.primary : "rgba(255,255,255,0.3)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Carousel Row Component ──────────────────────────────────────────────────
const CarouselRow = memo(
  ({
    title,
    items,
    progressMap,
    completionMap,
    onSelect,
    compact = false,
    showMatch = false,
  }) => {
    const rowRef = useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const handleScroll = () => {
      if (!rowRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const scroll = (dir) => {
      if (rowRef.current) {
        const { clientWidth } = rowRef.current;
        const scrollAmount =
          dir === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
        rowRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    };

    useEffect(() => {
      handleScroll();
      window.addEventListener("resize", handleScroll);
      return () => window.removeEventListener("resize", handleScroll);
    }, [items]);

    if (!items || items.length === 0) return null;

    // The Z-Index Dance: Rows must stack properly so dropdowns fall *over* the row beneath them.
    return (
      <div
        style={{
          position: "relative",
          marginBottom: 30,
          zIndex: isHovered ? 40 : 1,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: T.primary,
            fontFamily: "'Montserrat', sans-serif",
            marginLeft: "5%",
            marginBottom: 16,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h2>

        <div style={{ position: "relative" }}>
          {/* Left Nav Gradient Fade */}
          <AnimatePresence>
            {showLeft && isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("left")}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 220,
                  width: "5%",
                  background: `linear-gradient(to right, ${V.bg} 20%, transparent)`,
                  zIndex: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft
                  size={42}
                  color={T.primary}
                  style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))" }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scroll Container */}
          {/* MAGIC CSS: paddingBottom/marginBottom trick prevents overflow clipping of the absolute hover cards */}
          <div
            ref={rowRef}
            onScroll={handleScroll}
            style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              overflowY: "visible",
              padding: "0 5%",
              paddingBottom: 220,
              marginBottom: -220,
              scrollBehavior: "smooth",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
            className="hide-scrollbar"
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                style={{ flex: "0 0 auto", width: compact ? 240 : 300 }}
              >
                <LearnCard
                  item={item}
                  progress={progressMap[item.discotiveLearnId]}
                  completion={completionMap[item.discotiveLearnId]}
                  onSelect={onSelect}
                  isMobile={false}
                  compact={compact}
                  index={index}
                  algoScore={item.algoScore}
                  showMatchScore={showMatch}
                />
              </div>
            ))}
          </div>

          {/* Right Nav Gradient Fade */}
          <AnimatePresence>
            {showRight && isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => scroll("right")}
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 220,
                  width: "5%",
                  background: `linear-gradient(to left, ${V.bg} 20%, transparent)`,
                  zIndex: 30,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ChevronRight
                  size={42}
                  color={T.primary}
                  style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.8))" }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

// ─── Pro Gated Row (The Tease) ───────────────────────────────────────────────
const ProGatedRow = ({ title }) => (
  <div style={{ marginBottom: 50, padding: "0 5%" }}>
    <h2
      style={{
        fontSize: 20,
        fontWeight: 800,
        color: T.primary,
        fontFamily: "'Montserrat', sans-serif",
        marginBottom: 16,
      }}
    >
      {title}{" "}
      <Lock
        size={16}
        color={G.base}
        style={{ marginLeft: 6, display: "inline" }}
      />
    </h2>
    <motion.div
      whileHover={{ scale: 1.01, borderColor: G.base }}
      style={{
        width: "100%",
        height: 180,
        background: `linear-gradient(135deg, ${V.surface} 0%, rgba(191,162,100,0.05) 100%)`,
        border: `1px dashed rgba(191,162,100,0.3)`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={() => (window.location.href = "/premium")}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at center, rgba(191,162,100,0.1) 0%, transparent 60%)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: G.dimBg,
          border: `1px solid ${G.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          zIndex: 1,
        }}
      >
        <Crown size={24} color={G.bright} />
      </div>
      <span
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: T.primary,
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: "0.05em",
          zIndex: 1,
        }}
      >
        UNLOCK PERSONALIZED TOP PICKS
      </span>
      <span
        style={{
          fontSize: 13,
          color: T.secondary,
          fontFamily: "'Poppins', sans-serif",
          marginTop: 6,
          zIndex: 1,
        }}
      >
        Upgrade to Pro to see the best courses and videos matched exactly to
        your skills.
      </span>
    </motion.div>
  </div>
);

// ─── Browse Grid (Search Results) ────────────────────────────────────────────
const BrowseGrid = ({
  items,
  hasMore,
  loadMore,
  progressMap,
  completionMap,
  onSelect,
  isPaging,
}) => {
  return (
    <div style={{ padding: "40px 5%", minHeight: "80vh" }}>
      <h2
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: T.primary,
          fontFamily: "'Montserrat', sans-serif",
          marginBottom: 32,
        }}
      >
        Search Results
      </h2>

      {items.length === 0 && !isPaging ? (
        <div
          style={{
            textAlign: "center",
            padding: "120px 0",
            color: T.secondary,
            fontSize: 16,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          No content matches your specific criteria.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "40px 20px",
            paddingBottom: 250,
          }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id}
              style={{ position: "relative", zIndex: 100 - idx }}
            >
              <LearnCard
                item={item}
                progress={progressMap[item.discotiveLearnId]}
                completion={completionMap[item.discotiveLearnId]}
                onSelect={onSelect}
                isMobile={false}
                index={idx}
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 20, paddingBottom: 100 }}>
          <button
            onClick={loadMore}
            disabled={isPaging}
            style={{
              background: "transparent",
              border: `1px solid ${V.border}`,
              color: T.primary,
              padding: "14px 40px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "'Montserrat', sans-serif",
              cursor: isPaging ? "wait" : "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              !isPaging &&
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseLeave={(e) =>
              !isPaging && (e.currentTarget.style.background = "transparent")
            }
          >
            {isPaging ? "Analyzing..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN LAYOUT
// ═════════════════════════════════════════════════════════════════════════════
const LearnPCLayout = (props) => {
  const {
    heroItems,
    algoFeed,
    continueItems,
    trendingDomain,
    newCourses,
    topVideos,
    podcasts,
    resources,
    browseMode,
    browseItems,
    hasMore,
    filters,
    applyFilters,
    setSearch,
    enterBrowse,
    exitBrowse,
    loadMore,
    isPaging,
    progressMap,
    completionMap,
    onSelect,
    onOpenPortfolio,
    isAdmin,
    onAdminAdd,
    isPremium,
    userData,
  } = props;

  const [localSearch, setLocalSearch] = useState(filters.search || "");

  // Debounce search intent
  useEffect(() => {
    const timer = setTimeout(() => setSearch(localSearch), 400);
    return () => clearTimeout(timer);
  }, [localSearch, setSearch]);

  const navTypes = [
    { id: "all", label: "Home" },
    { id: "course", label: "Courses" },
    { id: "video", label: "Masterclasses" },
    { id: "podcast", label: "Podcasts" },
    { id: "resource", label: "Resources" },
  ];

  return (
    <div style={{ background: V.bg, minHeight: "100%", overflowX: "hidden" }}>
      {/* CSS fix for hide-scrollbar */}
      <style>{` .hide-scrollbar::-webkit-scrollbar { display: none; } `}</style>

      {/* ─── The Glassmorphism Navigation Bar ──────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 900,
          background: `linear-gradient(to bottom, ${V.bg} 0%, rgba(3,3,3,0.8) 60%, transparent 100%)`,
          padding: "24px 5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          pointerEvents: "none", // Let clicks pass through the gradient fade at the bottom
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            {navTypes.map((t) => {
              const active = browseMode
                ? filters.type === t.id
                : t.id === "all";
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    t.id === "all" ? exitBrowse() : enterBrowse(t.id)
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: active ? T.primary : T.secondary,
                    fontSize: 14,
                    fontWeight: active ? 800 : 500,
                    fontFamily: "'Montserrat', sans-serif",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textShadow: active
                      ? "0 0 10px rgba(255,255,255,0.3)"
                      : "none",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            pointerEvents: "auto",
          }}
        >
          {/* Search Bar */}
          <div style={{ position: "relative", width: 280 }}>
            <Search
              size={16}
              color={T.dim}
              style={{ position: "absolute", left: 16, top: 12 }}
            />
            <input
              type="text"
              placeholder="Titles, skills, creators..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              style={{
                width: "100%",
                height: 40,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${V.border}`,
                borderRadius: 20,
                padding: "0 16px 0 44px",
                color: T.primary,
                fontSize: 13,
                fontFamily: "'Poppins', sans-serif",
                outline: "none",
                transition: "all 0.2s",
              }}
              onFocus={(e) => (
                (e.target.style.border = `1px solid rgba(255,255,255,0.2)`),
                (e.target.style.background = "rgba(0,0,0,0.8)")
              )}
              onBlur={(e) => (
                (e.target.style.border = `1px solid ${V.border}`),
                (e.target.style.background = "rgba(0,0,0,0.6)")
              )}
            />
          </div>

          {/* Portfolio Hook */}
          <button
            onClick={onOpenPortfolio}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              border: `1px solid ${isPremium ? G.border : V.border}`,
              color: isPremium ? G.bright : T.primary,
              height: 40,
              padding: "0 20px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "'Montserrat', sans-serif",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.6)")
            }
          >
            <FolderLock size={16} color={isPremium ? G.base : T.dim} />{" "}
            Portfolio
          </button>

          {/* Admin Tool */}
          {isAdmin && (
            <button
              onClick={() => onAdminAdd("course")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: G.dimBg,
                border: `1px solid ${G.border}`,
                color: G.base,
                height: 40,
                width: 40,
                borderRadius: "50%",
                cursor: "pointer",
              }}
              title="Ingest Asset"
            >
              <Plus size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Page Body ───────────────────────────────────────────────────────── */}
      {browseMode ? (
        <BrowseGrid
          items={browseItems}
          hasMore={hasMore}
          loadMore={loadMore}
          progressMap={progressMap}
          completionMap={completionMap}
          onSelect={onSelect}
          isPaging={isPaging}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <LearnHero items={heroItems} onSelect={onSelect} />

          {/* Overlapping Content Rows (Pulls up over the Hero gradient fade) */}
          <div style={{ marginTop: -120, position: "relative", zIndex: 10 }}>
            <CarouselRow
              title="Continue Learning"
              items={continueItems}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
            />

            {isPremium ? (
              <CarouselRow
                title="Top Picks for You"
                items={algoFeed}
                progressMap={progressMap}
                completionMap={completionMap}
                onSelect={onSelect}
                showMatch={true}
              />
            ) : (
              <ProGatedRow title="Top Picks for You" />
            )}

            <CarouselRow
              title={
                userData?.identity?.domain
                  ? `Trending in ${userData.identity.domain}`
                  : "Trending Now"
              }
              items={trendingDomain}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
            />
            <CarouselRow
              title="New Releases"
              items={newCourses}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
            />
            <CarouselRow
              title="Must-Watch Masterclasses"
              items={topVideos}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
            />
            <CarouselRow
              title="Operator Podcasts"
              items={podcasts}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={true}
            />
            <CarouselRow
              title="Technical Resources"
              items={resources}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={true}
            />

            {/* Bottom Padding explicitly for the final row's drop downs */}
            <div style={{ height: 100 }} />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LearnPCLayout;
