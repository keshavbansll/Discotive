/**
 * @fileoverview LearnMobileLayout.jsx — Discotive Learn Mobile-Native Interface
 * @module Layouts/LearnMobileLayout
 *
 * MOBILE ARCHITECTURE MANDATE — STRUCTURAL DIVERGENCE:
 * This is NOT a stacked version of the PC layout.
 * It is a completely separate DOM tree with mobile-native paradigms:
 *
 * DOM STRUCTURE (thumb-reachability prioritized):
 * ┌─────────────────────────────────┐
 * │  STICKY HEADER: Logo + Search   │
 * ├─────────────────────────────────┤
 * │  STICKY TAB ROW: Certs|Videos   │  44px touch targets
 * ├─────────────────────────────────┤
 * │  DOMAIN SNAP STRIP (scroll-x)   │  snap mandatory
 * ├─────────────────────────────────┤
 * │  PREMIUM ALGO FEED (horiz)      │  locked silhouette for free
 * ├─────────────────────────────────┤
 * │  2-COL BORDERLESS CARD GRID     │
 * │  (vertically scrollable body)   │
 * ├─────────────────────────────────┤
 * │  LOAD MORE BUTTON               │
 * └─────────────────────────────────┘
 * └── FILTER FAB (bottom-right) ────┘  thumb zone
 * └── FILTER BOTTOM SHEET ──────────┘  slides from bottom
 *
 * Rules:
 * - ALL touch targets ≥ 44×44px
 * - Horizontal domain strip: scroll-snap-type: x mandatory
 * - Filter sheet: Framer Motion bottom sheet, swipe-to-dismiss
 * - No hover states (touch paradigm)
 * - Stagger entry animations on card grid
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
} from "framer-motion";
import {
  Search,
  X,
  SlidersHorizontal,
  BookOpen,
  Video,
  Plus,
  Loader2,
  ChevronDown,
  Check,
  Play,
  Award,
  Zap,
  Clock,
} from "lucide-react";

import BorderlessAssetCard from "../../components/learn/BorderlessAssetCard";
import PremiumAlgoFeed from "../../components/learn/PremiumAlgoFeed";
import {
  DOMAINS,
  CERTIFICATE_CATEGORIES,
  VIDEO_CATEGORIES,
  DIFFICULTY_LEVELS,
} from "../../lib/discotiveLearn";

// ── Design Tokens (Strict per SKILL.md) ──────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ── Domain Snap Chip ──────────────────────────────────────────────────────────
const DomainChip = memo(({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="shrink-0 flex items-center px-4 h-11 text-[10px] font-black uppercase tracking-[0.15em] transition-all select-none"
    style={{
      scrollSnapAlign: "start",
      background: active ? G.dimBg : "transparent",
      color: active ? G.bright : T.dim,
      borderBottom: active ? `2px solid ${G.bright}` : "2px solid transparent",
      fontFamily: "'Montserrat', sans-serif",
      minWidth: 44,
    }}
  >
    {label}
  </button>
));

// ── Filter Bottom Sheet ───────────────────────────────────────────────────────
const FilterSheet = memo(
  ({ open, onClose, filters, applyFilters, resetFilters, activeTab }) => {
    const y = useMotionValue(0);

    const [localFilters, setLocalFilters] = useState(filters);

    useEffect(() => {
      if (open) setLocalFilters(filters);
    }, [open, filters]);

    const patch = (key, value) =>
      setLocalFilters((p) => ({ ...p, [key]: value }));

    const handleApply = () => {
      applyFilters(localFilters);
      onClose();
    };

    const handleReset = () => {
      resetFilters();
      onClose();
    };

    const categoryOptions =
      activeTab === "certs"
        ? CERTIFICATE_CATEGORIES.slice(0, 10)
        : VIDEO_CATEGORIES.map((c) => c.label);

    // Active filter count
    const activeCount = useMemo(() => {
      let n = 0;
      if (localFilters.difficulty) n++;
      if (localFilters.isPaid !== "any") n++;
      if (localFilters.industryRelevance) n++;
      if (localFilters.sort !== "newest") n++;
      if (localFilters.category) n++;
      return n;
    }, [localFilters]);

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[300]"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
              }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) onClose();
              }}
              className="fixed bottom-0 left-0 right-0 z-[301] flex flex-col"
              style={{
                background: V.depth,
                maxHeight: "80vh",
                borderTop: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span
                  className="text-[11px] font-black uppercase tracking-[0.2em]"
                  style={{
                    color: G.bright,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Filters
                  {activeCount > 0 && (
                    <span
                      className="ml-2 px-1.5 py-0.5 text-[8px]"
                      style={{
                        background: G.dimBg,
                        border: `1px solid ${G.border}`,
                        color: G.bright,
                      }}
                    >
                      {activeCount}
                    </span>
                  )}
                </span>
                <button
                  onClick={handleReset}
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Reset
                </button>
              </div>

              {/* Scrollable filter body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* Sort */}
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
                    style={{ color: T.dim }}
                  >
                    Sort By
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "newest", l: "Newest" },
                      { v: "score", l: "Score" },
                      { v: "title", l: "A–Z" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => patch("sort", opt.v)}
                        className="h-11 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
                        style={{
                          background:
                            localFilters.sort === opt.v ? G.dimBg : V.surface,
                          color: localFilters.sort === opt.v ? G.bright : T.dim,
                          border: `1px solid ${localFilters.sort === opt.v ? G.border : "rgba(255,255,255,0.04)"}`,
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
                    style={{ color: T.dim }}
                  >
                    Difficulty
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Any", ...DIFFICULTY_LEVELS].map((d) => {
                      const v = d === "Any" ? "" : d;
                      const active = localFilters.difficulty === v;
                      return (
                        <button
                          key={d}
                          onClick={() => patch("difficulty", v)}
                          className="h-11 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
                          style={{
                            background: active ? G.dimBg : V.surface,
                            color: active ? G.bright : T.dim,
                            border: `1px solid ${active ? G.border : "rgba(255,255,255,0.04)"}`,
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Access */}
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
                    style={{ color: T.dim }}
                  >
                    Access
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: "any", l: "All" },
                      { v: "free", l: "Free" },
                      { v: "paid", l: "Paid" },
                    ].map((opt) => (
                      <button
                        key={opt.v}
                        onClick={() => patch("isPaid", opt.v)}
                        className="h-11 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
                        style={{
                          background:
                            localFilters.isPaid === opt.v ? G.dimBg : V.surface,
                          color:
                            localFilters.isPaid === opt.v ? G.bright : T.dim,
                          border: `1px solid ${localFilters.isPaid === opt.v ? G.border : "rgba(255,255,255,0.04)"}`,
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry Relevance */}
                <div>
                  <p
                    className="text-[9px] font-black uppercase tracking-[0.2em] mb-3"
                    style={{ color: T.dim }}
                  >
                    Industry Relevance
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Any", "Strong", "Medium", "Weak"].map((r) => {
                      const v = r === "Any" ? "" : r;
                      const active = localFilters.industryRelevance === v;
                      const color =
                        r === "Strong"
                          ? "#4ADE80"
                          : r === "Medium"
                            ? G.bright
                            : T.dim;
                      return (
                        <button
                          key={r}
                          onClick={() => patch("industryRelevance", v)}
                          className="h-11 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
                          style={{
                            background: active ? `${color}10` : V.surface,
                            color: active ? color : T.dim,
                            border: `1px solid ${active ? `${color}30` : "rgba(255,255,255,0.04)"}`,
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom padding for safe area */}
                <div className="h-4" />
              </div>

              {/* Apply CTA — bottom, thumb-reachable */}
              <div
                className="shrink-0 px-5 pb-8 pt-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <button
                  onClick={handleApply}
                  className="w-full h-14 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                  style={{
                    background: G.base,
                    color: "#030303",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  Apply Filters
                  {activeCount > 0 && ` (${activeCount})`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  },
);

// ── Mobile Skeleton Cards ─────────────────────────────────────────────────────
const MobileSkeleton = memo(({ count = 8 }) => (
  <div className="grid grid-cols-2 gap-0">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="animate-pulse"
        style={{
          aspectRatio: "9/14",
          background: i % 2 === 0 ? V.depth : V.surface,
        }}
      />
    ))}
  </div>
));

// ── Empty State ───────────────────────────────────────────────────────────────
const MobileEmpty = memo(({ activeTab, isAdmin, onAdminAdd }) => (
  <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
    <div
      className="w-16 h-16 flex items-center justify-center mb-5"
      style={{
        background: V.depth,
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {activeTab === "videos" ? (
        <Video
          className="w-7 h-7"
          style={{ color: "rgba(255,255,255,0.05)" }}
        />
      ) : (
        <BookOpen
          className="w-7 h-7"
          style={{ color: "rgba(255,255,255,0.05)" }}
        />
      )}
    </div>
    <p
      className="text-lg font-black mb-2"
      style={{ color: T.primary, fontFamily: "'Montserrat', sans-serif" }}
    >
      Nothing Found
    </p>
    <p className="text-xs mb-6 leading-relaxed" style={{ color: T.dim }}>
      {isAdmin
        ? "Add the first item to the library."
        : "Try adjusting your filters."}
    </p>
    {isAdmin && (
      <button
        onClick={() => onAdminAdd(activeTab === "certs" ? "cert" : "video")}
        className="flex items-center gap-2 h-12 px-6 text-[9px] font-black uppercase tracking-widest"
        style={{
          background: G.dimBg,
          color: G.bright,
          border: `1px solid ${G.border}`,
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add {activeTab === "certs" ? "Course" : "Video"}
      </button>
    )}
  </div>
));

// =============================================================================
// LEARN MOBILE LAYOUT
// =============================================================================
const LearnMobileLayout = ({
  certs,
  videos,
  rawCerts,
  rawVideos,
  loadingCerts,
  loadingVideos,
  isPaging,
  hasMoreCerts,
  hasMoreVideos,
  error,
  filters,
  applyFilters,
  resetFilters,
  setSearch,
  loadMoreCerts,
  loadMoreVideos,
  completionMap,
  onSelect,
  isAdmin,
  onAdminAdd,
  userData,
  isPremium,
}) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const activeTab = filters.activeTab || "certs";
  const displayItems = activeTab === "certs" ? certs : videos;
  const isLoading = activeTab === "certs" ? loadingCerts : loadingVideos;
  const hasMore = activeTab === "certs" ? hasMoreCerts : hasMoreVideos;
  const loadMore = activeTab === "certs" ? loadMoreCerts : loadMoreVideos;

  // Domain strip: "All" + DOMAINS
  const domainOptions = useMemo(() => ["All", ...DOMAINS], []);

  const handleDomainTap = useCallback(
    (d) => {
      applyFilters({ domain: d === "All" ? "" : d });
    },
    [applyFilters],
  );

  const handleTabSwitch = useCallback(
    (tab) => {
      applyFilters({ activeTab: tab });
    },
    [applyFilters],
  );

  // Active filter badge count (excludes domain/search/tab)
  const filterBadgeCount = useMemo(() => {
    let n = 0;
    if (filters.difficulty) n++;
    if (filters.isPaid !== "any") n++;
    if (filters.industryRelevance) n++;
    if (filters.sort !== "newest") n++;
    if (filters.category) n++;
    return n;
  }, [filters]);

  return (
    <div
      className="flex flex-col"
      style={{
        background: V.bg,
        minHeight: "100dvh",
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {/* ── STICKY HEADER ──────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 shrink-0"
        style={{
          background: V.bg,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Search bar row */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Search input — full width */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: searchFocused ? G.base : T.dim }}
            />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              autoCapitalize="none"
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search courses, videos, tags…"
              className="w-full h-11 pl-10 pr-9 text-[12px] outline-none transition-all"
              style={{
                background: V.depth,
                border: `1px solid ${searchFocused ? G.border : "rgba(255,255,255,0.06)"}`,
                color: T.primary,
                borderRadius: 0,
              }}
            />
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center"
                style={{ color: T.dim }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Admin Add button */}
          {isAdmin && (
            <button
              onClick={() =>
                onAdminAdd(activeTab === "certs" ? "cert" : "video")
              }
              className="w-11 h-11 flex items-center justify-center shrink-0 transition-all"
              style={{
                background: G.dimBg,
                border: `1px solid ${G.border}`,
                color: G.bright,
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab row — Certs | Videos, 44px touch targets */}
        <div
          className="flex"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          {[
            { id: "certs", icon: BookOpen, label: "Courses" },
            { id: "videos", icon: Video, label: "Videos" },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id)}
                className="flex-1 h-11 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all select-none"
                style={{
                  background: active ? G.dimBg : "transparent",
                  color: active ? G.bright : T.dim,
                  borderBottom: active
                    ? `2px solid ${G.bright}`
                    : "2px solid transparent",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {active && displayItems.length > 0 && (
                  <span className="text-[8px] opacity-60">
                    ({displayItems.length})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DOMAIN SNAP STRIP ─────────────────────────────────────────────── */}
      <div
        className="flex overflow-x-auto hide-scrollbar shrink-0"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          background: V.depth,
        }}
      >
        {domainOptions.map((domain) => {
          const val = domain === "All" ? "" : domain;
          return (
            <DomainChip
              key={domain}
              label={domain === "All" ? "All" : domain.split(" ")[0]}
              active={filters.domain === val}
              onClick={() => handleDomainTap(domain)}
            />
          );
        })}
        {/* Right padding ghost element */}
        <div className="shrink-0 w-4" />
      </div>

      {/* ── PREMIUM ALGO FEED ─────────────────────────────────────────────── */}
      {!filters.search && (
        <PremiumAlgoFeed
          rawCerts={rawCerts}
          rawVideos={rawVideos}
          userData={userData}
          completionMap={completionMap}
          onSelect={onSelect}
          isPremium={isPremium}
          isMobile={true}
        />
      )}

      {/* ── CONTENT GRID ──────────────────────────────────────────────────── */}
      <div className="flex-1">
        {isLoading ? (
          <MobileSkeleton count={8} />
        ) : displayItems.length === 0 ? (
          <MobileEmpty
            activeTab={activeTab}
            isAdmin={isAdmin}
            onAdminAdd={onAdminAdd}
          />
        ) : (
          <>
            {/* 2-col borderless grid */}
            <div className="grid grid-cols-2 gap-0">
              {displayItems.map((item, idx) => (
                <BorderlessAssetCard
                  key={item.id}
                  item={item}
                  type={activeTab === "certs" ? "cert" : "video"}
                  completion={completionMap[item.discotiveLearnId]}
                  onSelect={onSelect}
                  isMobile={true}
                  index={idx}
                />
              ))}
            </div>

            {/* Load more — full-width, 56px touch target */}
            {hasMore && !filters.search && (
              <button
                onClick={loadMore}
                disabled={isPaging}
                className="w-full h-14 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] transition-all"
                style={{
                  background: V.depth,
                  color: isPaging ? T.dim : T.secondary,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  fontFamily: "'Montserrat', sans-serif",
                }}
              >
                {isPaging ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {isPaging ? "Loading…" : "Load More"}
              </button>
            )}

            {/* Bottom safe area for FAB */}
            <div className="h-24" />
          </>
        )}
      </div>

      {/* ── FILTER FAB — thumb zone, bottom-right ─────────────────────────── */}
      <div className="fixed bottom-20 right-4 z-[200]">
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => setFilterOpen(true)}
          className="w-14 h-14 flex items-center justify-center relative"
          style={{
            background: G.base,
            color: "#030303",
            boxShadow: `0 8px 32px rgba(191,162,100,0.35)`,
          }}
        >
          <SlidersHorizontal className="w-5 h-5" />
          {filterBadgeCount > 0 && (
            <div
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[8px] font-black"
              style={{
                background: "#030303",
                color: G.bright,
                border: `1px solid ${G.border}`,
              }}
            >
              {filterBadgeCount}
            </div>
          )}
        </motion.button>
      </div>

      {/* ── FILTER BOTTOM SHEET ───────────────────────────────────────────── */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        applyFilters={applyFilters}
        resetFilters={resetFilters}
        activeTab={activeTab}
      />
    </div>
  );
};

LearnMobileLayout.displayName = "LearnMobileLayout";
export default LearnMobileLayout;
