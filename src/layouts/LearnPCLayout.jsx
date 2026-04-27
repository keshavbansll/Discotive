/**
 * @fileoverview LearnPCLayout — Discotive Learn PC-Native Interface
 * @module Components/Learn/LearnPCLayout
 *
 * DOM STRUCTURE:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  TOP BAR: Search · Sort · Tab (Certs | Videos) · Admin actions  │
 * ├────────────────┬─────────────────────────────────────────────────┤
 * │                │  PremiumAlgoFeed strip                          │
 * │  FILTER PANEL  │  ─────────────────────────────────────────────  │
 * │  (260px fixed) │  Content grid — BorderlessAssetCard             │
 * │  Domain        │  (5-col XL, 4-col LG, 3-col MD)                │
 * │  Category      │                                                 │
 * │  Difficulty    │  Load more (cursor paginated)                   │
 * │  Free/Paid     │                                                 │
 * │  Relevance     │                                                 │
 * └────────────────┴─────────────────────────────────────────────────┘
 *
 * PC-NATIVE FEATURES:
 * - Keyboard: '/' focuses search · 'Esc' clears · arrow keys navigate grid
 * - Hover: Expansion metadata panel via BorderlessAssetCard
 * - Sidebar: Sticky filter column with collapsible sections
 * - Grid: Truly borderless — depth only via background contrast
 * - Stagger: Entry animation with 40ms delay between items
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
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  Plus,
  RefreshCw,
  Loader2,
  BarChart2,
  Database,
  Check,
  Filter,
} from "lucide-react";

import BorderlessAssetCard from "./BorderlessAssetCard";
import PremiumAlgoFeed from "./PremiumAlgoFeed";
import {
  DOMAINS,
  CERTIFICATE_CATEGORIES,
  DIFFICULTY_LEVELS,
  VIDEO_CATEGORIES,
} from "../../lib/discotiveLearn";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
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

// ── Filter Section (collapsible) ──────────────────────────────────────────────
const FilterSection = memo(({ title, open, onToggle, children }) => (
  <div className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 px-4 text-left transition-all hover:bg-white/[0.02]"
    >
      <span
        className="text-[9px] font-black uppercase tracking-[0.18em]"
        style={{ color: open ? G.bright : T.dim }}
      >
        {title}
      </span>
      {open ? (
        <ChevronUp className="w-3 h-3" style={{ color: T.dim }} />
      ) : (
        <ChevronDown className="w-3 h-3" style={{ color: T.dim }} />
      )}
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-3 flex flex-col gap-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

// ── Filter Option Row ─────────────────────────────────────────────────────────
const FilterOpt = memo(({ label, active, onClick, color }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-1.5 px-2 rounded transition-all text-left group"
    style={{
      background: active ? G.dimBg : "transparent",
    }}
  >
    <span
      className="text-[10px] font-medium transition-colors"
      style={{
        color: active ? color || G.bright : T.secondary,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {label}
    </span>
    {active && (
      <div
        className="w-3.5 h-3.5 flex items-center justify-center rounded-sm"
        style={{ background: G.base }}
      >
        <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
      </div>
    )}
  </button>
));

// ── Loading skeleton grid ─────────────────────────────────────────────────────
const SkeletonGrid = memo(({ count = 12 }) => (
  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="animate-pulse"
        style={{ aspectRatio: "16/9", background: V.depth }}
      >
        <div className="w-full h-full bg-white/[0.02]" />
      </div>
    ))}
  </div>
));

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = memo(({ type, isAdmin, onAdminAdd }) => (
  <div className="flex flex-col items-center justify-center py-32 text-center col-span-full">
    <div
      className="w-20 h-20 flex items-center justify-center mb-6"
      style={{
        background: V.depth,
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {type === "videos" ? (
        <Video
          className="w-8 h-8"
          style={{ color: "rgba(255,255,255,0.06)" }}
        />
      ) : (
        <BookOpen
          className="w-8 h-8"
          style={{ color: "rgba(255,255,255,0.06)" }}
        />
      )}
    </div>
    <p
      className="text-xl font-black mb-2"
      style={{ color: T.primary, fontFamily: "'Montserrat', sans-serif" }}
    >
      No {type === "videos" ? "Videos" : "Courses"} Found
    </p>
    <p className="text-sm mb-6" style={{ color: T.dim }}>
      {isAdmin
        ? `Add the first ${type === "videos" ? "video" : "course"} to the library.`
        : "Try adjusting your filters."}
    </p>
    {isAdmin && (
      <button
        onClick={onAdminAdd}
        className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest"
        style={{
          background: G.dimBg,
          color: G.bright,
          border: `1px solid ${G.border}`,
        }}
      >
        <Plus className="w-3 h-3" /> Add{" "}
        {type === "videos" ? "Video" : "Course"}
      </button>
    )}
  </div>
));

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const LearnPCLayout = ({
  // Data
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
  // Filters
  filters,
  applyFilters,
  resetFilters,
  setSearch,
  // Pagination
  loadMoreCerts,
  loadMoreVideos,
  // Interaction
  completionMap,
  onSelect,
  // Admin
  isAdmin,
  onAdminAdd,
  onAdminEdit,
  // User
  userData,
  isPremium,
}) => {
  const searchRef = useRef(null);

  // ── Local UI state ────────────────────────────────────────────────────────
  const [sectionOpen, setSectionOpen] = useState({
    domain: true,
    category: true,
    difficulty: false,
    paid: false,
    relevance: false,
    sort: false,
  });

  const activeTab = filters.activeTab || "certs";

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        searchRef.current?.blur();
        setSearch("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSearch]);

  const toggleSection = useCallback((key) => {
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Active filter count (for indicator) ───────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.domain) count++;
    if (filters.category) count++;
    if (filters.difficulty) count++;
    if (filters.isPaid !== "any") count++;
    if (filters.industryRelevance) count++;
    if (filters.sort !== "newest") count++;
    return count;
  }, [filters]);

  const displayItems = activeTab === "certs" ? certs : videos;
  const isLoading = activeTab === "certs" ? loadingCerts : loadingVideos;
  const hasMore = activeTab === "certs" ? hasMoreCerts : hasMoreVideos;
  const loadMore = activeTab === "certs" ? loadMoreCerts : loadMoreVideos;

  const categoryOptions =
    activeTab === "certs"
      ? CERTIFICATE_CATEGORIES
      : VIDEO_CATEGORIES.map((c) => c.label);

  return (
    <div
      className="flex h-full min-h-screen"
      style={{ background: V.bg, fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ── FILTER SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col sticky top-0 h-screen overflow-y-auto custom-scrollbar"
        style={{
          width: 220,
          background: V.depth,
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Sidebar header */}
        <div
          className="flex items-center justify-between px-4 py-4 sticky top-0 z-10"
          style={{
            background: V.depth,
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <Filter className="w-3 h-3" style={{ color: G.base }} />
            <span
              className="text-[9px] font-black uppercase tracking-[0.18em]"
              style={{
                color: G.bright,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Filters
            </span>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest transition-colors"
              style={{ color: T.dim }}
            >
              <X className="w-2.5 h-2.5" /> Clear ({activeFilterCount})
            </button>
          )}
        </div>

        {/* Sort */}
        <FilterSection
          title="Sort By"
          open={sectionOpen.sort}
          onToggle={() => toggleSection("sort")}
        >
          {[
            { value: "newest", label: "Newest First" },
            { value: "score", label: "Score Reward" },
            { value: "title", label: "A → Z" },
          ].map((opt) => (
            <FilterOpt
              key={opt.value}
              label={opt.label}
              active={filters.sort === opt.value}
              onClick={() => applyFilters({ sort: opt.value })}
            />
          ))}
        </FilterSection>

        {/* Domain */}
        <FilterSection
          title="Domain"
          open={sectionOpen.domain}
          onToggle={() => toggleSection("domain")}
        >
          <FilterOpt
            label="All Domains"
            active={!filters.domain}
            onClick={() => applyFilters({ domain: "" })}
          />
          {DOMAINS.map((d) => (
            <FilterOpt
              key={d}
              label={d}
              active={filters.domain === d}
              onClick={() =>
                applyFilters({ domain: filters.domain === d ? "" : d })
              }
            />
          ))}
        </FilterSection>

        {/* Category */}
        <FilterSection
          title="Category"
          open={sectionOpen.category}
          onToggle={() => toggleSection("category")}
        >
          <FilterOpt
            label="All Categories"
            active={!filters.category}
            onClick={() => applyFilters({ category: "" })}
          />
          {categoryOptions.slice(0, 10).map((cat) => (
            <FilterOpt
              key={cat}
              label={cat}
              active={filters.category === cat}
              onClick={() =>
                applyFilters({ category: filters.category === cat ? "" : cat })
              }
            />
          ))}
        </FilterSection>

        {/* Difficulty */}
        <FilterSection
          title="Difficulty"
          open={sectionOpen.difficulty}
          onToggle={() => toggleSection("difficulty")}
        >
          <FilterOpt
            label="Any Level"
            active={!filters.difficulty}
            onClick={() => applyFilters({ difficulty: "" })}
          />
          {DIFFICULTY_LEVELS.map((d) => (
            <FilterOpt
              key={d}
              label={d}
              active={filters.difficulty === d}
              onClick={() =>
                applyFilters({
                  difficulty: filters.difficulty === d ? "" : d,
                })
              }
            />
          ))}
        </FilterSection>

        {/* Paid / Free */}
        <FilterSection
          title="Access"
          open={sectionOpen.paid}
          onToggle={() => toggleSection("paid")}
        >
          {[
            { value: "any", label: "All" },
            { value: "free", label: "Free Only" },
            { value: "paid", label: "Paid Only" },
          ].map((opt) => (
            <FilterOpt
              key={opt.value}
              label={opt.label}
              active={filters.isPaid === opt.value}
              onClick={() => applyFilters({ isPaid: opt.value })}
            />
          ))}
        </FilterSection>

        {/* Industry Relevance */}
        <FilterSection
          title="Industry Relevance"
          open={sectionOpen.relevance}
          onToggle={() => toggleSection("relevance")}
        >
          <FilterOpt
            label="Any"
            active={!filters.industryRelevance}
            onClick={() => applyFilters({ industryRelevance: "" })}
          />
          {["Strong", "Medium", "Weak"].map((r) => (
            <FilterOpt
              key={r}
              label={r}
              active={filters.industryRelevance === r}
              onClick={() =>
                applyFilters({
                  industryRelevance: filters.industryRelevance === r ? "" : r,
                })
              }
              color={
                r === "Strong" ? "#4ADE80" : r === "Medium" ? G.bright : T.dim
              }
            />
          ))}
        </FilterSection>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom keyboard hint */}
        <div
          className="px-4 py-3 flex items-center gap-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <kbd
            className="text-[8px] font-mono px-1.5 py-0.5"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: T.dim,
            }}
          >
            /
          </kbd>
          <span className="text-[8px]" style={{ color: T.dim }}>
            to search
          </span>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-4 px-6 py-3 sticky top-0 z-20"
          style={{
            background: V.bg,
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex items-center"
            style={{
              background: V.depth,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
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
                  onClick={() => applyFilters({ activeTab: tab.id })}
                  className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: active ? G.dimBg : "transparent",
                    color: active ? G.bright : T.dim,
                    borderRight:
                      tab.id === "certs"
                        ? "1px solid rgba(255,255,255,0.04)"
                        : "none",
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  {tab.id === "certs" && certs.length > 0 && (
                    <span
                      style={{
                        color: T.dim,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {certs.length}
                    </span>
                  )}
                  {tab.id === "videos" && videos.length > 0 && (
                    <span
                      style={{
                        color: T.dim,
                        fontFamily: "'Poppins', sans-serif",
                      }}
                    >
                      {videos.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex-1 relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: T.dim }}
            />
            <input
              ref={searchRef}
              type="text"
              value={filters.search || ""}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, providers, tags…"
              className="w-full pl-9 pr-9 py-2 text-[11px] outline-none transition-all"
              style={{
                background: V.depth,
                border: "1px solid rgba(255,255,255,0.06)",
                color: T.primary,
                fontFamily: "'Poppins', sans-serif",
                "::placeholder": { color: T.dim },
              }}
            />
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: T.dim }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  onAdminAdd(activeTab === "certs" ? "cert" : "video")
                }
                className="flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                <Plus className="w-3 h-3" />
                Add {activeTab === "certs" ? "Course" : "Video"}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-8 h-8 flex items-center justify-center transition-all"
                style={{
                  background: V.depth,
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: T.dim,
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <span className="text-[10px]" style={{ color: "#F87171" }}>
              {error}
            </span>
          )}
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
            isMobile={false}
          />
        )}

        {/* ── CONTENT GRID ─────────────────────────────────────────────────── */}
        <div className="flex-1">
          {isLoading ? (
            <SkeletonGrid count={16} />
          ) : displayItems.length === 0 ? (
            <EmptyState
              type={activeTab}
              isAdmin={isAdmin}
              onAdminAdd={() =>
                onAdminAdd(activeTab === "certs" ? "cert" : "video")
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-0">
                <AnimatePresence mode="popLayout">
                  {displayItems.map((item, idx) => (
                    <BorderlessAssetCard
                      key={item.id}
                      item={item}
                      type={activeTab === "certs" ? "cert" : "video"}
                      completion={completionMap[item.discotiveLearnId]}
                      onSelect={onSelect}
                      isMobile={false}
                      index={idx}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Load more */}
              {hasMore && !filters.search && (
                <div
                  className="flex justify-center py-8"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}
                >
                  <button
                    onClick={loadMore}
                    disabled={isPaging}
                    className="flex items-center gap-2 px-8 py-3 text-[9px] font-black uppercase tracking-[0.18em] transition-all"
                    style={{
                      background: V.depth,
                      color: isPaging ? T.dim : T.secondary,
                      border: "1px solid rgba(255,255,255,0.06)",
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {isPaging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {isPaging ? "Loading…" : "Load More"}
                  </button>
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-12" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

LearnPCLayout.displayName = "LearnPCLayout";
export default LearnPCLayout;
