/**
 * @fileoverview DailyExecutionLedger.jsx — Discotive Proof-of-Work Engine
 * @module Components/DailyExecutionLedger
 *
 * @description
 * A MAANG-grade daily execution logger with:
 *  - Horizontally scrollable native-feeling week picker (zero <input type="date">)
 *  - Debounced autosave to Firestore (300ms, fire-and-forget, no Pending UI)
 *  - Markdown-aware rich text (bold, italic, bullets — typed syntax, rendered live)
 *  - Virality Engine: "Share Execution" generates a beautiful html2canvas PNG card
 *    formatted for Twitter/LinkedIn FOMO screenshots
 *  - Visual Habit Tracking: Gold glow on logged days, punishing void on missed days
 *  - Compact mode (Dashboard Bento card) + Full/Maximized mode
 *  - Journal entries stored at: users/{uid}/journal/{YYYY-MM-DD}
 *
 * Firebase schema (users/{uid}/journal/{dateStr}):
 *   content   string   — raw markdown text (max 5000 chars)
 *   mood      string   — "🔥" | "💪" | "🧠" | "😤" | "😐"
 *   tags      string[] — user-defined tags, max 10
 *   wordCount number   — auto-computed
 *   savedAt   timestamp
 *   createdAt timestamp
 *
 * Zero onSnapshot. getDocs + setDoc with merge. Autosave via debounce.
 * Requires html2canvas (loaded lazily on share, no bundle cost on idle).
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { cn } from "../lib/cn";
import {
  Maximize2,
  Minimize2,
  Share2,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Tag,
  X,
  Flame,
  Brain,
  Dumbbell,
  Zap,
  Minus,
  BookOpen,
  Download,
  Copy,
  AlignLeft,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { key: "🔥", label: "On Fire" },
  { key: "💪", label: "Strong" },
  { key: "🧠", label: "Deep Work" },
  { key: "😤", label: "Grind" },
  { key: "😐", label: "Maintained" },
];

const MAX_CHARS = 5000;
const AUTOSAVE_DEBOUNCE_MS = 800;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Produces "YYYY-MM-DD" in local time — critical for correct date matching */
const toDateStr = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Returns array of Date objects for the week containing `anchor` */
const getWeekDays = (anchor) => {
  const day = anchor.getDay(); // 0=Sun
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - ((day + 6) % 7)); // ISO week: Mon-Sun
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Very lightweight markdown → HTML (handles **bold**, *italic*, - bullets, line breaks) */
const renderMarkdown = (text) => {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      if (/^[-•] /.test(line)) {
        const inner = line
          .replace(/^[-•] /, "")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>");
        return `<li>${inner}</li>`;
      }
      const processed = line
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
      return processed ? `<p>${processed}</p>` : "<br/>";
    })
    .join("")
    .replace(/(<li>.*?<\/li>)+/gs, (m) => `<ul>${m}</ul>`);
};

const wordCount = (text) =>
  (text || "").trim().split(/\s+/).filter(Boolean).length;

/** Format date for display in the share card */
const fmtShareDate = (dateStr) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

// ─── Week Picker ─────────────────────────────────────────────────────────────

const WeekPicker = ({ selectedDate, loggedDates, onSelect }) => {
  const [anchorDate, setAnchorDate] = useState(() => new Date(selectedDate));
  const scrollRef = useRef(null);

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const today = toDateStr(new Date());

  const handlePrev = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  };
  const handleNext = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    if (d <= new Date()) setAnchorDate(d);
  };

  const isNextDisabled = (() => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + 7);
    return next > new Date();
  })();

  const monthLabel = (() => {
    const months = new Set(
      weekDays.map((d) => d.toLocaleDateString("en-US", { month: "short" })),
    );
    const year = weekDays[0].getFullYear();
    return `${[...months].join(" / ")} ${year}`;
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="grid grid-cols-7 gap-1.5">
        {weekDays.map((dayDate, idx) => {
          const ds = toDateStr(dayDate);
          const isSelected = ds === toDateStr(selectedDate);
          const isToday = ds === today;
          const isFuture = ds > today;
          const hasLog = loggedDates.has(ds);

          return (
            <button
              key={ds}
              onClick={() => !isFuture && onSelect(dayDate)}
              disabled={isFuture}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all duration-200",
                isSelected
                  ? "bg-[#BFA264]/15 border-[#BFA264]/50 shadow-[0_0_12px_rgba(191,162,100,0.2)]"
                  : isFuture
                    ? "bg-white/[0.01] border-white/[0.03] opacity-30 cursor-not-allowed"
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]",
              )}
            >
              <span
                className={cn(
                  "text-[8px] font-black uppercase tracking-widest",
                  isSelected ? "text-[#BFA264]" : "text-white/30",
                )}
              >
                {DAY_LABELS[idx]}
              </span>
              <span
                className={cn(
                  "text-sm font-black font-mono",
                  isSelected
                    ? "text-[#D4AF78]"
                    : isToday
                      ? "text-white"
                      : "text-white/50",
                )}
              >
                {dayDate.getDate()}
              </span>
              {/* Habit indicator dot */}
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  hasLog
                    ? "bg-[#BFA264] shadow-[0_0_6px_rgba(191,162,100,0.6)]"
                    : isFuture
                      ? "bg-transparent"
                      : "bg-white/[0.08]",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Share Card (rendered off-screen, captured via html2canvas) ───────────────

const ShareCard = React.forwardRef(
  ({ entry, dateStr, userName, userHandle, userDomain, score }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute -top-[9999px] -left-[9999px] pointer-events-none"
        aria-hidden
      >
        <div
          style={{
            width: 800,
            background: "#030303",
            fontFamily: "'Poppins', sans-serif",
            padding: "48px 52px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient gradient */}
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "rgba(191,162,100,0.06)",
              filter: "blur(80px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -60,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "rgba(74,222,128,0.04)",
              filter: "blur(60px)",
            }}
          />

          {/* Top bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 36,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingBottom: 28,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.25em",
                  color: "#BFA264",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Discotive OS · Daily Execution Log
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: "#F5F0E8",
                  lineHeight: 1.2,
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(245,240,232,0.35)",
                  marginTop: 4,
                  fontFamily: "monospace",
                }}
              >
                @{userHandle} · {userDomain}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  color: "rgba(245,240,232,0.30)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Discotive Score
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: "#D4AF78",
                  fontFamily: "monospace",
                  letterSpacing: "-0.02em",
                }}
              >
                {score?.toLocaleString() || "—"}
              </div>
            </div>
          </div>

          {/* Date badge */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(191,162,100,0.08)",
                border: "1px solid rgba(191,162,100,0.25)",
                borderRadius: 12,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 700,
                color: "#BFA264",
                letterSpacing: "0.05em",
              }}
            >
              {entry?.mood && `${entry.mood}  `}
              {fmtShareDate(dateStr)}
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              fontSize: 15,
              lineHeight: 1.75,
              color: "rgba(245,240,232,0.75)",
              marginBottom: 32,
              borderLeft: "2px solid rgba(191,162,100,0.3)",
              paddingLeft: 20,
              minHeight: 80,
            }}
          >
            {(entry?.content || "")
              .split("\n")
              .slice(0, 8)
              .map((line, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  {line || " "}
                </div>
              ))}
          </div>

          {/* Tags */}
          {entry?.tags?.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 28,
                flexWrap: "wrap",
              }}
            >
              {entry.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 11,
                    color: "rgba(245,240,232,0.40)",
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              paddingTop: 20,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.25em",
                color: "rgba(245,240,232,0.20)",
                textTransform: "uppercase",
              }}
            >
              discotive.in
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(245,240,232,0.15)",
              }}
            >
              {entry?.wordCount || wordCount(entry?.content)} words executed
              today
            </div>
          </div>
        </div>
      </div>
    );
  },
);
ShareCard.displayName = "ShareCard";

// ─── Main Component ───────────────────────────────────────────────────────────

const DailyExecutionLedger = ({ userData, isPro, compact = false }) => {
  const uid = userData?.uid || userData?.id;
  const userName =
    `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
    "Operator";
  const userHandle = userData?.identity?.username || "operator";
  const userDomain =
    userData?.identity?.domain || userData?.vision?.passion || "General";
  const userScore = userData?.discotiveScore?.current || 0;

  // ── State ──────────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Entry state
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [isLoading, setIsLoading] = useState(false);
  const [loggedDates, setLoggedDates] = useState(new Set());

  // Share state
  const [isSharing, setIsSharing] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  // Preview toggle
  const [showPreview, setShowPreview] = useState(false);

  // Refs
  const textareaRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const shareCardRef = useRef(null);
  const currentDateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);
  const today = useMemo(() => toDateStr(new Date()), []);
  const isToday = currentDateStr === today;

  // ── Fetch logged dates (for habit tracking) ───────────────────────────
  useEffect(() => {
    if (!uid) return;
    const fetchDates = async () => {
      try {
        const q = query(
          collection(db, "users", uid, "journal"),
          orderBy("savedAt", "desc"),
          limit(60),
        );
        const snap = await getDocs(q);
        const dates = new Set(snap.docs.map((d) => d.id));
        setLoggedDates(dates);
      } catch (err) {
        console.error("[Ledger] fetchDates:", err);
      }
    };
    fetchDates();
  }, [uid]);

  // ── Load entry for selected date ──────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    setIsLoading(true);
    setSaveStatus("idle");

    const fetchEntry = async () => {
      try {
        const ref = doc(db, "users", uid, "journal", currentDateStr);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setContent(data.content || "");
          setMood(data.mood || "");
          setTags(data.tags || []);
        } else {
          setContent("");
          setMood("");
          setTags([]);
        }
      } catch (err) {
        console.error("[Ledger] fetchEntry:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntry();
  }, [uid, currentDateStr]);

  // ── Autosave engine ───────────────────────────────────────────────────
  const persistEntry = useCallback(
    async (newContent, newMood, newTags) => {
      if (!uid) return;
      setSaveStatus("saving");
      try {
        const ref = doc(db, "users", uid, "journal", currentDateStr);
        const wc = wordCount(newContent);
        await setDoc(
          ref,
          {
            content: newContent,
            mood: newMood,
            tags: newTags,
            wordCount: wc,
            savedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
        // Update logged dates cache
        setLoggedDates((prev) => new Set([...prev, currentDateStr]));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("[Ledger] persistEntry:", err);
        setSaveStatus("error");
      }
    },
    [uid, currentDateStr],
  );

  const triggerAutosave = useCallback(
    (newContent, newMood, newTags) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      setSaveStatus("saving");
      autosaveTimerRef.current = setTimeout(() => {
        persistEntry(newContent, newMood, newTags);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [persistEntry],
  );

  const handleContentChange = (e) => {
    const val = e.target.value.slice(0, MAX_CHARS);
    setContent(val);
    triggerAutosave(val, mood, tags);
  };

  const handleMoodChange = (key) => {
    const next = mood === key ? "" : key;
    setMood(next);
    triggerAutosave(content, next, tags);
  };

  const handleAddTag = (e) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "");
      if (tag && tags.length < 10 && !tags.includes(tag)) {
        const next = [...tags, tag];
        setTags(next);
        triggerAutosave(content, mood, next);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag) => {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    triggerAutosave(content, mood, next);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  // ── Virality Engine — Share ──────────────────────────────────────────

  const handleShare = async (mode) => {
    setIsSharing(true);
    setShareMenuOpen(false);
    try {
      // Lazy-load html2canvas only on first share click
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#030303",
        logging: false,
      });

      if (mode === "download") {
        const link = document.createElement("a");
        link.download = `discotive-execution-${currentDateStr}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else if (mode === "copy") {
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2500);
          } catch {
            // Fallback: download if clipboard API blocked
            const link = document.createElement("a");
            link.download = `discotive-execution-${currentDateStr}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
          }
        });
      } else if (mode === "twitter") {
        const url = `https://discotive.in/@${userHandle}`;
        const text = `Just logged my daily execution on @Discotive 🔥\n\nScore: ${userScore.toLocaleString()} pts\n${url}\n\n#BuildInPublic #Discotive #Execution`;
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
          "_blank",
        );
      } else if (mode === "linkedin") {
        const url = `https://discotive.in/@${userHandle}`;
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          "_blank",
        );
      }
    } catch (err) {
      console.error("[Ledger] Share error:", err);
    } finally {
      setIsSharing(false);
    }
  };

  // ── Keyboard shortcut: Ctrl+S force save ─────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isExpanded) {
        e.preventDefault();
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        persistEntry(content, mood, tags);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [content, mood, tags, persistEntry, isExpanded]);

  const wc = wordCount(content);
  const hasContent = content.trim().length > 0;
  const hasLog = loggedDates.has(currentDateStr);

  // ── COMPACT MODE (Dashboard bento) ───────────────────────────────────

  if (compact && !isExpanded) {
    return (
      <div className="h-full flex flex-col">
        {/* Off-screen share card always rendered for html2canvas */}
        <ShareCard
          ref={shareCardRef}
          entry={{ content, mood, tags, wordCount: wc }}
          dateStr={currentDateStr}
          userName={userName}
          userHandle={userHandle}
          userDomain={userDomain}
          score={userScore}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
              Daily Execution Ledger
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[9px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest"
          >
            <Maximize2 className="w-3 h-3" />
            <span className="hidden sm:block">Expand</span>
          </button>
        </div>

        {/* Today date + habit status */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              hasLog
                ? "bg-[#BFA264] shadow-[0_0_6px_rgba(191,162,100,0.5)]"
                : "bg-white/10",
            )}
          />
          <span className="text-xs font-bold text-white/50">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          {hasLog && (
            <span className="px-2 py-0.5 bg-[#BFA264]/10 border border-[#BFA264]/20 rounded text-[8px] font-black text-[#BFA264] uppercase tracking-widest">
              Logged
            </span>
          )}
        </div>

        {/* Compact preview or CTA */}
        {hasContent ? (
          <div className="flex-1 overflow-hidden relative">
            <div
              className="text-xs text-white/50 leading-relaxed line-clamp-4"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none" />
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-2 cursor-pointer group"
            onClick={() => setIsExpanded(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-500/8 border border-violet-500/15 flex items-center justify-center group-hover:bg-violet-500/15 transition-colors">
              <AlignLeft className="w-4 h-4 text-violet-400/60" />
            </div>
            <p className="text-[10px] font-bold text-white/25">
              No execution logged today
            </p>
            <p className="text-[9px] text-white/15 uppercase tracking-widest">
              Click to open ledger
            </p>
          </div>
        )}

        {/* Footer stats */}
        {hasContent && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[9px] font-bold text-white/25 uppercase tracking-widest">
            <span>{wc} words</span>
            {mood && (
              <span>
                {mood} {MOOD_OPTIONS.find((m) => m.key === mood)?.label}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── EXPANDED / FULL MODE ────────────────────────────────────────────────

  return (
    <>
      {/* Off-screen share card */}
      <ShareCard
        ref={shareCardRef}
        entry={{ content, mood, tags, wordCount: wc }}
        dateStr={currentDateStr}
        userName={userName}
        userHandle={userHandle}
        userDomain={userDomain}
        score={userScore}
      />

      <div className={cn("flex flex-col gap-5", compact && "relative")}>
        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                Daily Execution Ledger
              </h3>
              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
                Proof of Work · Permanently Recorded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Save status indicator */}
            <AnimatePresence mode="wait">
              {saveStatus === "saving" && (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase tracking-widest"
                >
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Saving
                </motion.div>
              )}
              {saveStatus === "saved" && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest"
                >
                  <Check className="w-2.5 h-2.5" />
                  Logged
                </motion.div>
              )}
            </AnimatePresence>

            {/* Preview toggle */}
            <button
              onClick={() => setShowPreview((v) => !v)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                showPreview
                  ? "bg-violet-500/10 border-violet-500/25 text-violet-400"
                  : "bg-white/[0.03] border-white/[0.05] text-white/30 hover:text-white/60",
              )}
            >
              {showPreview ? "Edit" : "Preview"}
            </button>

            {/* Share menu */}
            <div className="relative">
              <button
                onClick={() => setShareMenuOpen((v) => !v)}
                disabled={!hasContent || isSharing}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                  hasContent && !isSharing
                    ? "bg-[#BFA264]/10 border-[#BFA264]/25 text-[#BFA264] hover:bg-[#BFA264]/15"
                    : "bg-white/[0.02] border-white/[0.04] text-white/20 cursor-not-allowed",
                )}
              >
                {isSharing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : shareSuccess ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Share2 className="w-3 h-3" />
                )}
                Share
              </button>

              <AnimatePresence>
                {shareMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-[#0f0f0f] border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1 overflow-hidden"
                  >
                    {[
                      { mode: "copy", icon: Copy, label: "Copy as Image" },
                      {
                        mode: "download",
                        icon: Download,
                        label: "Download PNG",
                      },
                      { mode: "twitter", icon: Share2, label: "Share to X" },
                      {
                        mode: "linkedin",
                        icon: Share2,
                        label: "Share to LinkedIn",
                      },
                    ].map(({ mode, icon: Icon, label }) => (
                      <button
                        key={mode}
                        onClick={() => handleShare(mode)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/[0.04] transition-all text-left"
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse (compact mode) */}
            {compact && (
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/30 hover:text-white transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Week Picker ── */}
        <WeekPicker
          selectedDate={selectedDate}
          loggedDates={loggedDates}
          onSelect={setSelectedDate}
        />

        {/* ── Selected Date Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full shrink-0",
                hasLog
                  ? "bg-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.5)]"
                  : "bg-white/10",
              )}
            />
            <h4 className="text-sm font-black text-white">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h4>
            {isToday && (
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                Today
              </span>
            )}
          </div>
          {hasLog && wc > 0 && (
            <span className="text-[10px] text-white/30 font-mono">
              {wc} words
            </span>
          )}
        </div>

        {/* ── Editor / Preview ── */}
        <div className="relative">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center bg-[#0a0a0a] border border-white/[0.05] rounded-2xl">
              <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
            </div>
          ) : showPreview ? (
            <div
              className={cn(
                "min-h-[200px] p-4 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl",
                "prose prose-invert prose-sm max-w-none",
                "[&_p]:text-white/70 [&_p]:leading-relaxed [&_p]:my-1",
                "[&_strong]:text-white [&_em]:text-white/60",
                "[&_ul]:text-white/70 [&_li]:my-0.5",
                "[&_code]:text-[#BFA264] [&_code]:bg-[#BFA264]/10 [&_code]:px-1 [&_code]:rounded",
              )}
              dangerouslySetInnerHTML={{
                __html: hasContent
                  ? renderMarkdown(content)
                  : "<p class='text-white/20 italic'>Nothing logged yet. Switch to edit mode to start writing.</p>",
              }}
            />
          ) : (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                placeholder={`Log your execution, ${userName.split(" ")[0]}.\n\nWhat did you build today? What milestones did you hit? What barriers did you crush?\n\nSupports **bold**, *italic*, - bullet points, and \`code\`.`}
                className={cn(
                  "w-full min-h-[220px] p-4 bg-[#0a0a0a] border rounded-2xl",
                  "text-sm text-white/80 placeholder-white/15 leading-relaxed resize-none outline-none",
                  "font-mono transition-all",
                  hasLog
                    ? "border-[#BFA264]/20 focus:border-[#BFA264]/40 focus:shadow-[0_0_20px_rgba(191,162,100,0.06)]"
                    : "border-white/[0.05] focus:border-violet-500/30 focus:shadow-[0_0_20px_rgba(139,92,246,0.06)]",
                )}
                spellCheck
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-2">
                <span
                  className={cn(
                    "text-[9px] font-mono",
                    content.length > MAX_CHARS * 0.9
                      ? "text-amber-400"
                      : "text-white/15",
                  )}
                >
                  {content.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Mood Selector ── */}
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
            Execution State
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {MOOD_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleMoodChange(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all",
                  mood === key
                    ? "bg-[#BFA264]/10 border-[#BFA264]/30 text-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.12)]"
                    : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white/70 hover:bg-white/[0.04]",
                )}
              >
                <span>{key}</span>
                <span className="hidden sm:block">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Tags ── */}
        <div>
          <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
            Tags
            <span className="ml-1 text-white/15 font-normal normal-case tracking-normal">
              (Enter or comma to add)
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#0a0a0a] border border-white/[0.05] rounded-xl min-h-[44px]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[10px] font-bold text-white/50"
              >
                #{tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-white/25 hover:text-white/60 transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.slice(0, 30))}
              onKeyDown={handleAddTag}
              placeholder={
                tags.length === 0 ? "coding, strategy, networking..." : ""
              }
              className="flex-1 min-w-[80px] bg-transparent text-xs text-white placeholder-white/15 outline-none"
            />
          </div>
        </div>

        {/* ── Keyboard shortcut hint ── */}
        <p className="text-[9px] text-white/15 text-center">
          Autosaved every {AUTOSAVE_DEBOUNCE_MS / 1000}s ·{" "}
          <kbd className="px-1.5 py-0.5 bg-white/[0.05] border border-white/[0.08] rounded text-[8px] font-mono">
            Ctrl+S
          </kbd>{" "}
          to force save
        </p>
      </div>

      {/* Backdrop for share menu click-away */}
      {shareMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShareMenuOpen(false)}
        />
      )}
    </>
  );
};

export default DailyExecutionLedger;
