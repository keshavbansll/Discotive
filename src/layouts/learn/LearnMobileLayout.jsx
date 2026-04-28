/**
 * @fileoverview LearnMobileLayout.jsx — Mobile-Native Orchestrator for Learn Engine
 * @description
 * Implements a strictly mobile-optimized Netflix-style fluid UI.
 * Features: Native momentum scrolling, strict scroll-snap carousels, 48px tap targets,
 * thumb-friendly ergonomics, and deep immersive gradients.
 */

import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Play,
  Info,
  FolderLock,
  Plus,
  Zap,
  Lock,
  X,
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

// ─── Native Scrollbar Hiding & Snapping ────────────────────────────────────────
const HideScrollbarStyles = () => (
  <style>{`
    .mobile-scroll-row::-webkit-scrollbar { display: none; }
    .mobile-scroll-row {
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-snap-type: x mandatory;
      scroll-padding-left: 20px;
      scroll-padding-right: 20px;
      -webkit-overflow-scrolling: touch;
    }
    .snap-item { scroll-snap-align: start; }
  `}</style>
);

// ─── Mobile Hero Component (The Billboard) ───────────────────────────────────
const MobileHero = memo(({ items, onSelect }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 7000);
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
        height: "70vh", // Deep cinematic mobile aspect
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
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${current.thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
          }}
        />
      </AnimatePresence>

      {/* Deep gradients for text legibility and seamless background blending */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, #030303 0%, rgba(3,3,3,0.8) 25%, transparent 65%)",
        }}
      />

      {/* Content pinned to bottom */}
      <div
        style={{
          position: "absolute",
          bottom: "10%", // Leaves room for the overlap
          left: 0,
          right: 0,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <motion.div
          key={`content-${current.id}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ width: "100%" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: typeConfig.color,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontFamily: "'Montserrat', sans-serif",
                background: typeConfig.dimBg,
                padding: "4px 10px",
                border: `1px solid ${typeConfig.border}`,
                borderRadius: 4,
              }}
            >
              {current.isFeatured ? "Featured" : typeConfig.label}
            </span>
            {current.isNew && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#4ADE80",
                  letterSpacing: "0.1em",
                  fontFamily: "'Montserrat', sans-serif",
                  background: "rgba(74,222,128,0.1)",
                  padding: "4px 10px",
                  border: "1px solid rgba(74,222,128,0.25)",
                  borderRadius: 4,
                }}
              >
                NEW
              </span>
            )}
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: T.primary,
              fontFamily: "'Montserrat', sans-serif",
              lineHeight: 1.1,
              marginBottom: 12,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 4px 20px rgba(0,0,0,0.8)",
            }}
          >
            {current.title}
          </h1>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 20,
              width: "100%",
            }}
          >
            <button
              onClick={() => onSelect(current)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: T.primary,
                color: "#000",
                border: "none",
                height: 48,
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "'Montserrat', sans-serif",
                boxShadow: "0 0 20px rgba(245,240,232,0.15)",
              }}
            >
              <Play fill="#000" size={18} /> Play
            </button>
            <button
              onClick={() => onSelect(current)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
                color: T.primary,
                border: `1px solid rgba(255,255,255,0.2)`,
                height: 48,
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <Info size={18} /> Info
            </button>
          </div>
        </motion.div>
      </div>

      {/* Hero Indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "5%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 6,
          zIndex: 10,
        }}
      >
        {items.map((_, idx) => (
          <div
            key={idx}
            style={{
              width: idx === currentIndex ? 20 : 6,
              height: 4,
              borderRadius: 2,
              background:
                idx === currentIndex ? T.primary : "rgba(255,255,255,0.3)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Mobile Carousel Row ──────────────────────────────────────────────────────
const MobileCarouselRow = memo(
  ({
    title,
    items,
    progressMap,
    completionMap,
    onSelect,
    compact = true,
    showMatch = false,
  }) => {
    if (!items || items.length === 0) return null;

    return (
      <div style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: T.primary,
            fontFamily: "'Montserrat', sans-serif",
            marginLeft: 20,
            marginBottom: 14,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h2>

        <div
          className="mobile-scroll-row"
          style={{
            display: "flex",
            gap: 14,
            overflowX: "auto",
            padding: "0 20px",
            paddingBottom: 12,
          }}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              className="snap-item"
              style={{ flex: "0 0 auto", width: compact ? 160 : 260 }}
            >
              <LearnCard
                item={item}
                progress={progressMap[item.discotiveLearnId]}
                completion={completionMap[item.discotiveLearnId]}
                onSelect={onSelect}
                isMobile={true}
                compact={compact}
                index={index}
                algoScore={item.algoScore}
                showMatchScore={showMatch}
              />
            </div>
          ))}
          {/* Spacer to allow full scroll of last item */}
          <div className="snap-item" style={{ flex: "0 0 1px" }} />
        </div>
      </div>
    );
  },
);

// ─── Mobile Pro Gated Row ───────────────────────────────────────────────────
const MobileProGatedRow = ({ title }) => (
  <div style={{ marginBottom: 36, padding: "0 20px" }}>
    <h2
      style={{
        fontSize: 18,
        fontWeight: 800,
        color: T.primary,
        fontFamily: "'Montserrat', sans-serif",
        marginBottom: 14,
      }}
    >
      {title}{" "}
      <Lock
        size={14}
        color={G.base}
        style={{ marginLeft: 4, display: "inline" }}
      />
    </h2>
    <div
      style={{
        width: "100%",
        height: 140,
        background: `linear-gradient(135deg, ${V.surface}, rgba(191,162,100,0.05))`,
        border: `1px dashed ${G.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 16,
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
        }}
      />
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: G.dimBg,
          border: `1px solid ${G.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
          zIndex: 1,
        }}
      >
        <Crown size={20} color={G.bright} />
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: T.primary,
          fontFamily: "'Montserrat', sans-serif",
          zIndex: 1,
        }}
      >
        Unlock Top Picks
      </span>
      <span
        style={{
          fontSize: 11,
          color: T.secondary,
          fontFamily: "'Poppins', sans-serif",
          marginTop: 4,
          zIndex: 1,
        }}
      >
        Get personalized recommendations
      </span>
    </div>
  </div>
);

// ─── Mobile Browse Grid ──────────────────────────────────────────────────────
const MobileBrowseGrid = ({
  items,
  hasMore,
  loadMore,
  progressMap,
  completionMap,
  onSelect,
  isPaging,
}) => {
  return (
    <div
      style={{ padding: "20px 20px", minHeight: "80vh", paddingBottom: 120 }}
    >
      {items.length === 0 && !isPaging ? (
        <div
          style={{
            textAlign: "center",
            padding: "100px 0",
            color: T.secondary,
            fontSize: 14,
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          No content matches your search.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
          {items.map((item, idx) => (
            <LearnCard
              key={item.id}
              item={item}
              progress={progressMap[item.discotiveLearnId]}
              completion={completionMap[item.discotiveLearnId]}
              onSelect={onSelect}
              isMobile={true}
              index={idx}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={loadMore}
            disabled={isPaging}
            style={{
              background: V.surface,
              border: `1px solid ${V.border}`,
              color: T.primary,
              height: 48,
              width: "100%",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 800,
              fontFamily: "'Montserrat', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
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
const LearnMobileLayout = (props) => {
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
  const [showSearch, setShowSearch] = useState(false);

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
      <HideScrollbarStyles />

      {/* ─── Mobile Sticky Top Bar (Glassmorphism) ─────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 900,
          background: "rgba(3,3,3,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${showSearch ? V.border : "transparent"}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            height: 64,
          }}
        >
          {showSearch ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                gap: 12,
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <Search
                  size={16}
                  color={T.dim}
                  style={{ position: "absolute", left: 16, top: 12 }}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  autoFocus
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  style={{
                    width: "100%",
                    height: 40,
                    background: "rgba(0,0,0,0.5)",
                    border: `1px solid ${V.border}`,
                    borderRadius: 20,
                    padding: "0 16px 0 40px",
                    color: T.primary,
                    fontSize: 14,
                    fontFamily: "'Poppins', sans-serif",
                    outline: "none",
                  }}
                />
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setLocalSearch("");
                  setSearch("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: T.secondary,
                  padding: 8,
                }}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: T.primary,
                  fontFamily: "'Montserrat', sans-serif",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Learn
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  onClick={() => setShowSearch(true)}
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    color: T.primary,
                  }}
                >
                  <Search size={22} />
                </button>
                <button
                  onClick={onOpenPortfolio}
                  style={{
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.5)",
                    border: `1px solid ${isPremium ? G.border : V.border}`,
                    borderRadius: "50%",
                    color: isPremium ? G.bright : T.dim,
                  }}
                >
                  <FolderLock size={18} />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onAdminAdd("course")}
                    style={{
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                      borderRadius: "50%",
                      color: G.base,
                    }}
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scrollable Navigation Pills */}
        {!showSearch && (
          <div
            className="mobile-scroll-row"
            style={{
              display: "flex",
              gap: 10,
              padding: "0 20px 14px 20px",
              overflowX: "auto",
            }}
          >
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
                  className="snap-item"
                  style={{
                    whiteSpace: "nowrap",
                    padding: "8px 18px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: active ? 800 : 500,
                    fontFamily: "'Montserrat', sans-serif",
                    background: active ? T.primary : "rgba(255,255,255,0.05)",
                    color: active ? "#000" : T.secondary,
                    border: `1px solid ${active ? "transparent" : V.border}`,
                    transition: "all 0.2s",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Main Content Area ─────────────────────────────────────────────── */}
      {browseMode || showSearch ? (
        <MobileBrowseGrid
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
          transition={{ duration: 0.4 }}
          style={{ paddingBottom: 100 }}
        >
          {/* Hero Banner shifts up behind header for immersion */}
          <div style={{ marginTop: -110 }}>
            <MobileHero items={heroItems} onSelect={onSelect} />
          </div>

          {/* Overlapping Content Rows */}
          <div style={{ marginTop: -60, position: "relative", zIndex: 10 }}>
            <MobileCarouselRow
              title="Continue Learning"
              items={continueItems}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={false}
            />

            {isPremium ? (
              <MobileCarouselRow
                title="Top Picks for You"
                items={algoFeed}
                progressMap={progressMap}
                completionMap={completionMap}
                onSelect={onSelect}
                compact={false}
                showMatch={true}
              />
            ) : (
              <MobileProGatedRow title="Top Picks for You" />
            )}

            <MobileCarouselRow
              title={
                userData?.identity?.domain
                  ? `Trending in ${userData.identity.domain}`
                  : "Trending Now"
              }
              items={trendingDomain}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={false}
            />
            <MobileCarouselRow
              title="New Releases"
              items={newCourses}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={true}
            />
            <MobileCarouselRow
              title="Must-Watch Masterclasses"
              items={topVideos}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={false}
            />
            <MobileCarouselRow
              title="Operator Podcasts"
              items={podcasts}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={true}
            />
            <MobileCarouselRow
              title="Technical Resources"
              items={resources}
              progressMap={progressMap}
              completionMap={completionMap}
              onSelect={onSelect}
              compact={true}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LearnMobileLayout;
