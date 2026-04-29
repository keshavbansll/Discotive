/**
 * @fileoverview LearnPCLayout.jsx — Discotive Learn Engine Desktop v4.0
 * REDESIGNED: Dashboard-native aesthetic, OTT psychology, zero borders.
 * Tabs: All | Courses | Videos | My Learning (enrolled/completed/ongoing)
 * Suggest button for all users. Premium algo feed gate.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Lock,
  Crown,
  Lightbulb,
  BookOpen,
  Layers,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  Zap,
  Filter,
  X,
  Award,
  FolderOpen,
  BarChart2,
  Sparkles,
  Radio,
  FileText,
  RefreshCw,
  Plus,
} from "lucide-react";
import LearnCard from "../../components/learn/LearnCard";
import { TYPE_CONFIG, DOMAINS } from "../../lib/discotiveLearn";

// ─── Design tokens (exact Dashboard match) ───────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
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

// ─── Horizontal scroll row (Netflix-style) ───────────────────────────────────
const ContentRow = memo(
  ({
    title,
    items,
    onSelect,
    icon: Icon,
    accent,
    badge,
    emptyMsg,
    isAdmin,
    onAdminAdd,
    completionMap,
    progressMap,
  }) => {
    const rowRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const scroll = (dir) => {
      const el = rowRef.current;
      if (!el) return;
      el.scrollBy({ left: dir * 320, behavior: "smooth" });
    };

    const checkScroll = () => {
      const el = rowRef.current;
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
      const el = rowRef.current;
      if (!el) return;
      el.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => el.removeEventListener("scroll", checkScroll);
    }, [items]);

    if (!items || items.length === 0) {
      return (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {Icon && (
              <Icon className="w-4 h-4" style={{ color: accent || G.bright }} />
            )}
            <h3 className="text-sm font-black text-white/70 uppercase tracking-widest">
              {title}
            </h3>
            {badge && (
              <span
                className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-white/20">
            {emptyMsg || "Nothing here yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="mb-8 group/row">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon className="w-4 h-4" style={{ color: accent || G.bright }} />
            )}
            <h3 className="text-sm font-black text-white/80 uppercase tracking-widest">
              {title}
            </h3>
            {badge && (
              <span
                className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                {badge}
              </span>
            )}
            <span className="text-[10px] text-white/20 font-mono">
              ({items.length})
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
            {canScrollLeft && (
              <button
                onClick={() => scroll(-1)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll(1)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <ChevronRight className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>
        </div>
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto hide-scrollbar pb-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{ scrollSnapAlign: "start", flexShrink: 0 }}
            >
              <LearnCard
                item={item}
                onClick={() => onSelect(item)}
                completion={completionMap?.[item.discotiveLearnId]}
                progress={progressMap?.[item.discotiveLearnId]}
              />
            </div>
          ))}
        </div>
      </div>
    );
  },
);

// ─── Hero Banner ──────────────────────────────────────────────────────────────
const LearnHero = memo(({ items, onSelect, userData }) => {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % items.length), 9000);
    return () => clearInterval(t);
  }, [items?.length]);

  if (!items?.length) return null;
  const item = items[idx];
  const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: 320, background: V.bg }}
    >
      {/* BG image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0"
          style={{
            backgroundImage: item.thumbnailUrl
              ? `url(${item.thumbnailUrl})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
            backgroundColor: V.depth,
          }}
        />
      </AnimatePresence>

      {/* Overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(3,3,3,0.97) 0%, rgba(3,3,3,0.6) 45%, rgba(3,3,3,0.15) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(3,3,3,1) 0%, transparent 40%)",
        }}
      />

      {/* Content */}
      <div
        className="absolute inset-0 flex flex-col justify-center px-8 pb-8"
        style={{ maxWidth: 540 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${item.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest"
                style={{
                  background: `${tc.color}18`,
                  border: `1px solid ${tc.color}40`,
                  color: tc.color,
                }}
              >
                {tc.label}
              </span>
              {item.difficulty && (
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  {item.difficulty}
                </span>
              )}
              {item.isFeatured && (
                <span
                  className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  Featured
                </span>
              )}
            </div>

            <h2
              className="text-2xl font-black text-white mb-2 leading-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              {item.title}
            </h2>
            <p className="text-sm text-white/50 mb-5 leading-relaxed line-clamp-2">
              {item.description || item.provider || ""}
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelect(item)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95"
                style={{ background: T.primary, color: V.bg }}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Explore
              </button>
              {item.scoreReward > 0 && (
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                    color: G.bright,
                  }}
                >
                  <Zap className="w-3 h-3" />+{item.scoreReward} pts
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
          {items.slice(0, 6).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                background: i === idx ? G.bright : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "all", label: "For You", icon: Sparkles },
  { key: "courses", label: "Courses", icon: Award },
  { key: "videos", label: "Videos", icon: Play },
  { key: "resources", label: "Resources", icon: FileText },
  { key: "mylearning", label: "My Learning", icon: BookOpen },
];

// ─── My Learning status tabs ──────────────────────────────────────────────────
const MY_TABS = [
  { key: "all", label: "All" },
  { key: "enrolled", label: "Enrolled" },
  { key: "ongoing", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

// ─── Suggest Modal ────────────────────────────────────────────────────────────
const SuggestModal = memo(({ onClose, uid, userData }) => {
  const [form, setForm] = useState({
    title: "",
    url: "",
    type: "course",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSubmitting(true);
    try {
      const { addDoc, collection, serverTimestamp } =
        await import("firebase/firestore");
      const { db } = await import("../../firebase");
      await addDoc(collection(db, "learn_suggestions"), {
        title: form.title.trim(),
        url: form.url.trim(),
        type: form.type,
        note: form.note.trim(),
        submittedBy: uid,
        submitterDomain: userData?.identity?.domain || "",
        status: "PENDING",
        createdAt: serverTimestamp(),
      });
      setDone(true);
      setTimeout(onClose, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: V.surface,
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: G.bright }} />
            </div>
            <h3 className="text-sm font-black text-white">Suggest Content</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2
                className="w-10 h-10 mb-3"
                style={{ color: "#4ADE80" }}
              />
              <p className="text-sm font-black text-white">
                Suggestion Submitted!
              </p>
              <p className="text-xs text-white/40 mt-1">
                Our team reviews all submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                  Content Title <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Harvard CS50 – Intro to Computer Science"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                  style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                  onFocus={(e) => (e.target.style.borderColor = G.border)}
                  onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                  URL <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, url: e.target.value }))
                  }
                  placeholder="https://..."
                  type="url"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-colors"
                  style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                  onFocus={(e) => (e.target.style.borderColor = G.border)}
                  onBlur={(e) => (e.target.style.borderColor = "#1e1e1e")}
                />
              </div>
              <div>
                <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                  Type
                </label>
                <div className="flex gap-2">
                  {["course", "video", "resource"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setForm((p) => ({ ...p, type: t }))}
                      className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{
                        background:
                          form.type === t ? G.dimBg : "rgba(255,255,255,0.03)",
                        border: `1px solid ${form.type === t ? G.border : "rgba(255,255,255,0.06)"}`,
                        color: form.type === t ? G.bright : T.dim,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                  Why this? <span className="text-white/20">(optional)</span>
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, note: e.target.value }))
                  }
                  rows={2}
                  placeholder="Why should Discotive feature this?"
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 resize-none focus:outline-none"
                  style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.title.trim() || !form.url.trim()}
                className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
                  color: "#030303",
                }}
              >
                {submitting ? "Submitting..." : "Submit Suggestion"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = memo(({ filters, onChange, activeTab }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        style={{
          background: open ? G.dimBg : "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? G.border : "rgba(255,255,255,0.07)"}`,
          color: open ? G.bright : T.dim,
        }}
      >
        <Filter className="w-3.5 h-3.5" />
        Filter
        {(filters.domain || filters.difficulty || filters.isPaid !== "any") && (
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
            style={{ background: G.bright, color: "#030303" }}
          >
            !
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 top-full mt-2 z-50 rounded-2xl p-4 shadow-2xl"
            style={{
              background: V.elevated,
              border: "1px solid rgba(255,255,255,0.07)",
              width: 220,
              minWidth: 200,
            }}
          >
            <div className="space-y-3">
              {activeTab === "courses" && (
                <div>
                  <label className="block text-[8px] font-black text-white/25 uppercase tracking-widest mb-1.5">
                    Difficulty
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {["any", "Beginner", "Intermediate", "Advanced"].map(
                      (d) => (
                        <button
                          key={d}
                          onClick={() =>
                            onChange({ difficulty: d === "any" ? "" : d })
                          }
                          className="px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
                          style={{
                            background:
                              (filters.difficulty || "any") === d
                                ? G.dimBg
                                : "rgba(255,255,255,0.03)",
                            border: `1px solid ${(filters.difficulty || "any") === d ? G.border : "rgba(255,255,255,0.06)"}`,
                            color:
                              (filters.difficulty || "any") === d
                                ? G.bright
                                : T.dim,
                          }}
                        >
                          {d}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[8px] font-black text-white/25 uppercase tracking-widest mb-1.5">
                  Domain
                </label>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {["", ...DOMAINS.slice(0, 8)].map((d) => (
                    <button
                      key={d}
                      onClick={() => onChange({ domain: d })}
                      className="px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all"
                      style={{
                        background:
                          filters.domain === d
                            ? G.dimBg
                            : "rgba(255,255,255,0.03)",
                        border: `1px solid ${filters.domain === d ? G.border : "rgba(255,255,255,0.06)"}`,
                        color: filters.domain === d ? G.bright : T.dim,
                      }}
                    >
                      {d || "All"}
                    </button>
                  ))}
                </div>
              </div>
              {activeTab === "courses" && (
                <div>
                  <label className="block text-[8px] font-black text-white/25 uppercase tracking-widest mb-1.5">
                    Pricing
                  </label>
                  <div className="flex gap-1">
                    {[
                      ["any", "Any"],
                      ["free", "Free"],
                      ["paid", "Paid"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => onChange({ isPaid: v })}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all"
                        style={{
                          background:
                            filters.isPaid === v
                              ? G.dimBg
                              : "rgba(255,255,255,0.03)",
                          border: `1px solid ${filters.isPaid === v ? G.border : "rgba(255,255,255,0.06)"}`,
                          color: filters.isPaid === v ? G.bright : T.dim,
                        }}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(filters.domain ||
                filters.difficulty ||
                filters.isPaid !== "any") && (
                <button
                  onClick={() => {
                    onChange({ domain: "", difficulty: "", isPaid: "any" });
                    setOpen(false);
                  }}
                  className="w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─── My Learning Pane ─────────────────────────────────────────────────────────
const MyLearningPane = memo(
  ({
    userData,
    completionMap,
    progressMap,
    onSelect,
    continueItems,
    newCourses,
    topVideos,
  }) => {
    const [myTab, setMyTab] = useState("all");
    const vault = userData?.vault || [];

    const enrolledIds = useMemo(() => {
      return Object.entries(progressMap || {})
        .filter(([, v]) => v.progressPct > 0)
        .map(([id]) => id);
    }, [progressMap]);

    const completedIds = useMemo(() => {
      return Object.keys(completionMap || {}).filter(
        (id) => completionMap[id]?.verified,
      );
    }, [completionMap]);

    const ongoingIds = useMemo(() => {
      return Object.entries(progressMap || {})
        .filter(([, v]) => v.progressPct > 0 && v.progressPct < 100)
        .map(([id]) => id);
    }, [progressMap]);

    // items to show (combine continue + newCourses for the pool)
    const allPoolItems = useMemo(() => {
      const pool = [
        ...(continueItems || []),
        ...(newCourses || []),
        ...(topVideos || []),
      ];
      const seen = new Set();
      return pool.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    }, [continueItems, newCourses, topVideos]);

    const filterItems = (items) => {
      if (myTab === "all") return items;
      if (myTab === "enrolled")
        return items.filter((i) => enrolledIds.includes(i.discotiveLearnId));
      if (myTab === "ongoing")
        return items.filter((i) => ongoingIds.includes(i.discotiveLearnId));
      if (myTab === "completed")
        return items.filter((i) => completedIds.includes(i.discotiveLearnId));
      return items;
    };

    const filtered = filterItems(allPoolItems);

    return (
      <div>
        {/* Sub-tabs */}
        <div
          className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{ background: "rgba(255,255,255,0.03)", width: "fit-content" }}
        >
          {MY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setMyTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background:
                  myTab === t.key ? "rgba(255,255,255,0.08)" : "transparent",
                color: myTab === t.key ? T.primary : T.dim,
              }}
            >
              {t.label}
              {t.key === "ongoing" && ongoingIds.length > 0 && (
                <span
                  className="ml-1.5 w-4 h-4 inline-flex items-center justify-center rounded-full text-[8px] font-black"
                  style={{ background: G.bright, color: "#030303" }}
                >
                  {ongoingIds.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Enrolled", val: enrolledIds.length, color: "#60A5FA" },
            { label: "In Progress", val: ongoingIds.length, color: G.bright },
            { label: "Completed", val: completedIds.length, color: "#4ADE80" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{
                background: V.depth,
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <p
                className="text-2xl font-black font-mono mb-0.5"
                style={{ color: s.color }}
              >
                {s.val}
              </p>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen
              className="w-10 h-10 mb-3"
              style={{ color: "rgba(255,255,255,0.08)" }}
            />
            <p className="text-sm font-black" style={{ color: T.dim }}>
              {myTab === "all"
                ? "Start exploring to build your learning history"
                : `No ${myTab} content yet`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div key={item.id}>
                <LearnCard
                  item={item}
                  onClick={() => onSelect(item)}
                  completion={completionMap?.[item.discotiveLearnId]}
                  progress={progressMap?.[item.discotiveLearnId]}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

// ─── Browse Grid ──────────────────────────────────────────────────────────────
const BrowseGrid = memo(
  ({
    items,
    onSelect,
    completionMap,
    progressMap,
    loading,
    hasMore,
    onLoadMore,
  }) => {
    if (loading && !items.length) {
      return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl animate-pulse"
              style={{ height: 200, background: "rgba(255,255,255,0.03)" }}
            />
          ))}
        </div>
      );
    }

    if (!items.length) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search
            className="w-10 h-10 mb-3"
            style={{ color: "rgba(255,255,255,0.08)" }}
          />
          <p className="text-sm font-black" style={{ color: T.dim }}>
            No results match your filters.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {items.map((item, i) => (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
            >
              <LearnCard
                item={item}
                onClick={() => onSelect(item)}
                completion={completionMap?.[item.discotiveLearnId]}
                progress={progressMap?.[item.discotiveLearnId]}
              />
            </motion.div>
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
              style={{
                background: G.dimBg,
                border: `1px solid ${G.border}`,
                color: G.bright,
              }}
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </div>
    );
  },
);

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────
const LearnPCLayout = ({
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
  loadingHero,
  loadingRows,
  loadingAlgo,
  loadingBrowse,
  isPaging,
  progressMap,
  filters,
  completionMap,
  isAdmin,
  isPremium,
  isMobile,
  userData,
  currentUser,
  onSelect,
  onAdminAdd,
  onAdminEdit,
  onOpenPortfolio,
  applyFilters,
  resetFilters,
  setSearch,
  enterBrowse,
  exitBrowse,
  loadMore,
  refetch,
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchVal, setSearchVal] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchVal("");
    if (tab === "courses") {
      applyFilters({ type: "course" });
    } else if (tab === "videos") {
      applyFilters({ type: "video" });
    } else if (tab === "resources") {
      applyFilters({ type: "resource" });
    } else if (tab === "mylearning") {
      exitBrowse();
    } else {
      exitBrowse();
    }
  };

  const handleSearchChange = (val) => {
    setSearchVal(val);
    setSearch(val);
    if (val.trim() && activeTab !== "mylearning") {
      setActiveTab("all");
    }
  };

  const isBrowseTab =
    activeTab === "courses" ||
    activeTab === "videos" ||
    activeTab === "resources" ||
    (activeTab === "all" && browseMode);

  const domain = userData?.identity?.domain || userData?.vision?.passion || "";

  return (
    <div className="min-h-full" style={{ background: V.bg }}>
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-40 px-6 py-3 flex items-center gap-4"
        style={{
          background: "rgba(3,3,3,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background:
                    activeTab === tab.key
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color: activeTab === tab.key ? T.primary : T.dim,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div className="relative" style={{ width: 220 }}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: T.dim }}
          />
          <input
            ref={searchRef}
            value={searchVal}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-8 py-2 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = G.border)}
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")
            }
          />
          {searchVal && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-2.5 h-2.5 text-white/60" />
            </button>
          )}
        </div>

        {/* Filter (only in browse mode) */}
        {isBrowseTab && (
          <FilterBar
            filters={filters}
            onChange={applyFilters}
            activeTab={activeTab}
          />
        )}

        {/* Suggest */}
        <button
          onClick={() => setShowSuggest(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          style={{
            background: G.dimBg,
            border: `1px solid ${G.border}`,
            color: G.bright,
          }}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Suggest</span>
        </button>

        {/* Portfolio */}
        <button
          onClick={onOpenPortfolio}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: T.dim,
          }}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Portfolio</span>
        </button>

        {/* Admin add */}
        {isAdmin && (
          <button
            onClick={() => onAdminAdd("course")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
              color: "#F59E0B",
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Add</span>
          </button>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────── */}
      <div>
        {/* ALL tab: hero + rows */}
        {activeTab === "all" && !browseMode && !searchVal && (
          <>
            {/* Hero */}
            {!loadingHero && heroItems.length > 0 && (
              <LearnHero
                items={heroItems}
                onSelect={onSelect}
                userData={userData}
              />
            )}
            {loadingHero && (
              <div
                className="animate-pulse"
                style={{ height: 320, background: "rgba(255,255,255,0.02)" }}
              />
            )}

            <div className="px-6 py-6">
              {/* Algo feed for PRO */}
              {isPremium && algoFeed.length > 0 && (
                <ContentRow
                  title="Matched For You"
                  items={algoFeed}
                  onSelect={onSelect}
                  icon={Sparkles}
                  accent={G.bright}
                  badge="AI"
                  completionMap={completionMap}
                  progressMap={progressMap}
                />
              )}
              {!isPremium && (
                <div
                  className="mb-8 rounded-2xl p-5 flex items-center gap-4"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(191,162,100,0.12)",
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: G.bright }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-white mb-0.5">
                      AI-Matched Learning Feed
                    </p>
                    <p className="text-xs" style={{ color: T.secondary }}>
                      Upgrade to Pro for personalised content recommendations.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/premium")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
                      color: "#030303",
                    }}
                  >
                    <Crown className="w-3.5 h-3.5" /> Pro
                  </button>
                </div>
              )}

              {loadingRows ? (
                <div className="space-y-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <div
                        className="h-4 w-32 rounded animate-pulse mb-4"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      />
                      <div className="flex gap-3">
                        {[1, 2, 3, 4].map((j) => (
                          <div
                            key={j}
                            className="rounded-2xl animate-pulse shrink-0"
                            style={{
                              width: 200,
                              height: 150,
                              background: "rgba(255,255,255,0.03)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {continueItems.length > 0 && (
                    <ContentRow
                      title="Continue Learning"
                      items={continueItems}
                      onSelect={onSelect}
                      icon={Clock}
                      accent="#60A5FA"
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                  {trendingDomain.length > 0 && (
                    <ContentRow
                      title={`Trending in ${domain || "Your Domain"}`}
                      items={trendingDomain}
                      onSelect={onSelect}
                      icon={TrendingUp}
                      accent="#4ADE80"
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                  {newCourses.length > 0 && (
                    <ContentRow
                      title="New Courses"
                      items={newCourses}
                      onSelect={onSelect}
                      icon={Award}
                      accent={G.bright}
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                  {topVideos.length > 0 && (
                    <ContentRow
                      title="Curated Videos"
                      items={topVideos}
                      onSelect={onSelect}
                      icon={Play}
                      accent="#EF4444"
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                  {podcasts.length > 0 && (
                    <ContentRow
                      title="Podcasts & Audio"
                      items={podcasts}
                      onSelect={onSelect}
                      icon={Radio}
                      accent="#8B5CF6"
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                  {resources.length > 0 && (
                    <ContentRow
                      title="Resources & Guides"
                      items={resources}
                      onSelect={onSelect}
                      icon={FileText}
                      accent="#60A5FA"
                      completionMap={completionMap}
                      progressMap={progressMap}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* Browse / search / filter mode */}
        {(isBrowseTab || (activeTab === "all" && (browseMode || searchVal))) &&
          activeTab !== "mylearning" && (
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-white mb-1">
                    {activeTab === "courses"
                      ? "Courses"
                      : activeTab === "videos"
                        ? "Videos"
                        : activeTab === "resources"
                          ? "Resources"
                          : searchVal
                            ? `Results for "${searchVal}"`
                            : "Browse All"}
                  </h2>
                  {browseItems.length > 0 && (
                    <p className="text-xs" style={{ color: T.dim }}>
                      {browseItems.length} items
                    </p>
                  )}
                </div>
                {(browseMode || searchVal) && (
                  <button
                    onClick={() => {
                      exitBrowse();
                      setSearchVal("");
                      handleSearchChange("");
                      setActiveTab("all");
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors"
                    style={{ color: T.dim }}
                  >
                    <X className="w-3.5 h-3.5" /> Back
                  </button>
                )}
              </div>
              <BrowseGrid
                items={browseItems}
                onSelect={onSelect}
                completionMap={completionMap}
                progressMap={progressMap}
                loading={loadingBrowse}
                hasMore={hasMore}
                onLoadMore={loadMore}
              />
            </div>
          )}

        {/* My Learning tab */}
        {activeTab === "mylearning" && (
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">My Learning</h2>
              <button
                onClick={onOpenPortfolio}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: G.dimBg,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Portfolio
              </button>
            </div>
            <MyLearningPane
              userData={userData}
              completionMap={completionMap}
              progressMap={progressMap}
              onSelect={onSelect}
              continueItems={continueItems}
              newCourses={newCourses}
              topVideos={topVideos}
            />
          </div>
        )}
      </div>

      {/* Suggest modal */}
      <AnimatePresence>
        {showSuggest && (
          <SuggestModal
            onClose={() => setShowSuggest(false)}
            uid={currentUser?.uid}
            userData={userData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LearnPCLayout;
