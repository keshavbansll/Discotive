/**
 * @fileoverview Discotive Agenda — Premium Daily Intelligence Engine
 * Route: /app/agenda
 *
 * Firestore schema:
 *   users/{uid}/agenda/{YYYY-MM-DD}:
 *     content        string       — raw text (3000 char max)
 *     richContent    string       — HTML with rich text
 *     mood           string
 *     widgets        object[]     — embedded widgets config
 *     visibility     "private"|"public"
 *     sharedWith     {uid,username,email}[]
 *     template       string
 *     attachedStats  object       — score, streak, rank snapshot
 *     tags           string[]
 *     savedAt        timestamp
 *     createdAt      timestamp
 *
 * Rules:
 *   - Pro/Enterprise only (TierGate)
 *   - Current day: full read/write/delete
 *   - Past days: read-only
 *   - Future days: blocked
 *   - Max 5 public entries
 *   - 3000 char content limit
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  Globe,
  BookOpen,
  Plus,
  Trash2,
  Share2,
  Download,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
  Youtube,
  Zap,
  Trophy,
  Flame,
  TrendingUp,
  BarChart2,
  Users,
  Crown,
  Check,
  X,
  Grid,
  List,
  Tag,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  AlertTriangle,
  Sparkles,
  Layout,
  AtSign,
  MoreHorizontal,
  Save,
  Clock,
  Star,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Search,
  User,
  Cloud,
} from "lucide-react";

/* ─── Design Tokens ─────────────────────────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
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

const MAX_CHARS = 3000;
const MAX_PUBLIC = 5;
const AUTOSAVE_MS = 800;

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const toDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const todayStr = () => toDateStr(new Date());
const fmtDisplay = (ds) =>
  new Date(ds + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const fmtShort = (ds) =>
  new Date(ds + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const wordCount = (t = "") => t.trim().split(/\s+/).filter(Boolean).length;
const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

/* ─── Templates ─────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: "blank",
    label: "Blank Canvas",
    icon: FileText,
    color: G.base,
    bg: G.dimBg,
    border: G.border,
    prompt: "",
  },
  {
    id: "executive",
    label: "Executive Brief",
    icon: Crown,
    color: "#D4AF78",
    bg: "rgba(191,162,100,0.08)",
    border: "rgba(191,162,100,0.25)",
    prompt: `<p><strong>🎯 Today's Prime Objective</strong></p><p></p><p><strong>⚡ Key Decisions Made</strong></p><p></p><p><strong>📊 Metrics That Matter</strong></p><p></p><p><strong>🚀 Tomorrow's Directive</strong></p><p></p>`,
  },
  {
    id: "founder",
    label: "Founder Log",
    icon: Zap,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    prompt: `<p><strong>🔥 What I Shipped Today</strong></p><p></p><p><strong>💡 Insights & Learnings</strong></p><p></p><p><strong>🧱 Blockers & How I Crushed Them</strong></p><p></p><p><strong>📈 Traction Update</strong></p><p></p><p><strong>🌙 End-of-Day Reflection</strong></p><p></p>`,
  },
  {
    id: "deep_work",
    label: "Deep Work",
    icon: BarChart2,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    border: "rgba(56,189,248,0.25)",
    prompt: `<p><strong>🎯 Deep Work Block</strong></p><p>Duration: &nbsp;&nbsp;&nbsp; Focus Level: /10</p><p></p><p><strong>📝 What I Was Working On</strong></p><p></p><p><strong>🧠 Thoughts & Breakthroughs</strong></p><p></p><p><strong>⏭️ Next Session Plan</strong></p><p></p>`,
  },
  {
    id: "gratitude",
    label: "Gratitude & Growth",
    icon: Star,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.25)",
    prompt: `<p><strong>✨ Three Things I'm Grateful For</strong></p><p>1. </p><p>2. </p><p>3. </p><p></p><p><strong>📚 What I Learned Today</strong></p><p></p><p><strong>🌱 How I Grew</strong></p><p></p><p><strong>💫 Affirmation for Tomorrow</strong></p><p></p>`,
  },
];

/* ─── Widget Definitions ─────────────────────────────────────────────────── */
const WIDGET_TYPES = [
  { id: "score", label: "Discotive Score", icon: Zap, color: G.bright },
  { id: "rank", label: "Leaderboard Rank", icon: Trophy, color: G.base },
  { id: "streak", label: "Streak", icon: Flame, color: T.primary },
  { id: "velocity", label: "Score Velocity", icon: TrendingUp, color: G.light },
  {
    id: "position",
    label: "Position Matrix",
    icon: BarChart2,
    color: T.secondary,
  },
  { id: "tag", label: "User Tag", icon: AtSign, color: G.bright },
];

/* ─── Inline Widget Renderer ─────────────────────────────────────────────── */
const InlineWidget = memo(({ type, userData, value }) => {
  const score = userData?.discotiveScore?.current ?? 0;
  const streak = userData?.discotiveScore?.streak ?? 0;
  const rank = userData?.precomputed?.globalRank ?? "—";

  const configs = {
    score: {
      label: "Discotive Score",
      value: score.toLocaleString(),
      sub: "pts",
      color: G.bright,
      icon: Zap,
    },
    rank: {
      label: "Global Rank",
      value: rank === "—" ? "—" : `#${rank}`,
      sub: "position",
      color: "#f59e0b",
      icon: Trophy,
    },
    streak: {
      label: "Streak",
      value: `${streak}d`,
      sub: "consecutive",
      color: "#f97316",
      icon: Flame,
    },
    velocity: {
      label: "24h Delta",
      value: `+${userData?.discotiveScore?.lastAmount || 0}`,
      sub: "pts today",
      color: "#10b981",
      icon: TrendingUp,
    },
    position: {
      label: "Top %",
      value: userData?.precomputed?.globalPercentile
        ? `${userData.precomputed.globalPercentile}%`
        : "—",
      sub: "global",
      color: "#38bdf8",
      icon: BarChart2,
    },
    tag: {
      label: value || "@operator",
      value: null,
      sub: null,
      color: "#a855f7",
      icon: AtSign,
    },
  };

  const cfg = configs[type] || configs.score;
  const Icon = cfg.icon;

  if (type === "tag") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mx-0.5"
        style={{
          background: "rgba(168,85,247,0.15)",
          border: "1px solid rgba(168,85,247,0.3)",
          color: "#a855f7",
        }}
      >
        <Icon size={10} /> {cfg.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mx-1 text-xs font-bold select-none"
      style={{
        background: `${cfg.color}12`,
        border: `1px solid ${cfg.color}25`,
        color: cfg.color,
        verticalAlign: "middle",
      }}
    >
      <Icon size={11} />
      <span className="font-black font-mono">{cfg.value}</span>
      <span style={{ color: T.dim, fontWeight: 400 }}>{cfg.sub}</span>
    </span>
  );
});

/* ─── Save Status ────────────────────────────────────────────────────────── */
const SaveStatus = memo(({ status, isMobile }) => (
  <AnimatePresence mode="wait">
    {status === "saving" && (
      <motion.div
        key="saving"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          "flex items-center justify-center",
          isMobile
            ? ""
            : "gap-1.5 text-[10px] font-black uppercase tracking-widest",
        )}
        style={{ color: "#f59e0b" }}
      >
        <Loader2 size={isMobile ? 18 : 10} className="animate-spin" />
        {!isMobile && "Saving"}
      </motion.div>
    )}
    {status === "saved" && (
      <motion.div
        key="saved"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={cn(
          "flex items-center justify-center",
          isMobile
            ? ""
            : "gap-1.5 text-[10px] font-black uppercase tracking-widest",
        )}
        style={{ color: "#4ADE80" }}
      >
        <Check size={isMobile ? 18 : 10} /> {!isMobile && "Saved"}
      </motion.div>
    )}
  </AnimatePresence>
));

/* ─── Modern Floating Editor Overlay ─────────────────────────────────────── */
const FloatingEditorOverlay = memo(({ editorRef, userData }) => {
  const [bubble, setBubble] = useState(null);
  const [slash, setSlash] = useState(null);
  const [mention, setMention] = useState(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkData, setLinkData] = useState({ title: "", url: "" });
  const savedRange = useRef(null);

  const restoreSelection = useCallback(() => {
    if (savedRange.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }, []);

  const exec = useCallback(
    (cmd, val = null) => {
      restoreSelection();
      document.execCommand(cmd, false, val);
      editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [editorRef, restoreSelection],
  );

  const insertHtml = useCallback(
    (html, offsetBack = 0) => {
      restoreSelection();
      const sel = window.getSelection();
      if (offsetBack > 0 && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        try {
          range.setStart(
            range.anchorNode,
            Math.max(0, range.anchorOffset - offsetBack),
          );
          range.deleteContents();
        } catch (e) {}
      }
      document.execCommand("insertHTML", false, html);
      editorRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [editorRef, restoreSelection],
  );

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      if (
        !sel ||
        !sel.rangeCount ||
        sel.isCollapsed ||
        !editorRef.current?.contains(sel.anchorNode)
      ) {
        setBubble(null);
        setLinkMode(false);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      savedRange.current = sel.getRangeAt(0).cloneRange();
      const isMob = window.innerWidth < 768;
      setBubble({
        top: Math.max(isMob ? 90 : 10, rect.top - 54),
        left: Math.max(
          80,
          Math.min(window.innerWidth - 80, rect.left + rect.width / 2),
        ),
      });
      setLinkData((p) => ({ ...p, title: sel.toString() }));
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [editorRef]);

  useEffect(() => {
    const handleKeys = () => {
      const sel = window.getSelection();
      if (
        !sel ||
        !sel.rangeCount ||
        !editorRef.current?.contains(sel.anchorNode)
      )
        return;
      const node = sel.anchorNode;
      const text = node.textContent?.slice(0, sel.anchorOffset) || "";

      const sMatch = text.match(/(?:\s|^)\/$/);
      if (sMatch) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        savedRange.current = sel.getRangeAt(0).cloneRange();
        setSlash({
          top: Math.min(window.innerHeight - 250, rect.bottom + 8),
          left: Math.max(10, Math.min(window.innerWidth - 200, rect.left)),
        });
      } else setSlash(null);

      const mMatch = text.match(/(?:\s|^)@([a-zA-Z0-9_]*)$/);
      if (mMatch) {
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        savedRange.current = sel.getRangeAt(0).cloneRange();
        setMention({
          top: Math.min(window.innerHeight - 250, rect.bottom + 8),
          left: Math.max(10, Math.min(window.innerWidth - 240, rect.left)),
          query: mMatch[1],
        });
      } else setMention(null);
    };
    const el = editorRef.current;
    if (el) {
      el.addEventListener("keyup", handleKeys);
      el.addEventListener("mouseup", handleKeys);
    }
    return () => {
      if (el) {
        el.removeEventListener("keyup", handleKeys);
        el.removeEventListener("mouseup", handleKeys);
      }
    };
  }, [editorRef]);

  const connectors = useMemo(() => {
    const c = [];
    if (userData?.connectors?.github?.username)
      c.push({
        id: "github",
        label: "GitHub",
        icon: "🐙",
        url: `https://github.com/${userData.connectors.github.username}`,
      });
    if (userData?.connectors?.youtube?.channelUrl)
      c.push({
        id: "youtube",
        label: "YouTube",
        icon: "▶️",
        url: userData.connectors.youtube.channelUrl,
      });
    return c;
  }, [userData]);

  return (
    <>
      <AnimatePresence>
        {bubble && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[9999] -translate-x-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl backdrop-blur-xl border"
            style={{
              top: bubble.top,
              left: bubble.left,
              background: "rgba(10,10,10,0.85)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {linkMode ? (
              <div className="flex items-center gap-2 px-1">
                <input
                  value={linkData.title}
                  onChange={(e) =>
                    setLinkData((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="Text"
                  className="bg-transparent text-xs text-white outline-none w-20 border-b border-white/20 pb-0.5"
                />
                <input
                  value={linkData.url}
                  onChange={(e) =>
                    setLinkData((p) => ({ ...p, url: e.target.value }))
                  }
                  placeholder="https://"
                  className="bg-transparent text-xs text-white outline-none w-24 border-b border-[#BFA264]/50 pb-0.5"
                  autoFocus
                />
                <button
                  onClick={() => {
                    insertHtml(
                      `<a href="${linkData.url}" target="_blank" style="color:#BFA264;text-decoration:underline;">${linkData.title || linkData.url}</a>`,
                    );
                    setLinkMode(false);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-[#4ADE80]"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setLinkMode(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                {[
                  { t: "Bold", i: Bold, c: "bold" },
                  { t: "Italic", i: Italic, c: "italic" },
                  { t: "Underline", i: UnderlineIcon, c: "underline" },
                ].map((b) => (
                  <button
                    key={b.t}
                    onClick={() => exec(b.c)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  >
                    <b.i size={14} />
                  </button>
                ))}
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => setLinkMode(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                  <Link2 size={14} />
                </button>
              </>
            )}
          </motion.div>
        )}

        {slash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] flex flex-col p-1.5 rounded-2xl shadow-2xl backdrop-blur-2xl border w-48"
            style={{
              top: slash.top,
              left: slash.left,
              background: "rgba(10,10,10,0.9)",
              borderColor: "rgba(191,162,100,0.2)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2 py-1.5">
              Insert Widget
            </span>
            {WIDGET_TYPES.filter((w) =>
              ["score", "rank", "streak", "velocity"].includes(w.id),
            ).map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  insertHtml(
                    `&nbsp;<span data-widget="${w.id}" contenteditable="false" class="inline-widget">📊 [${w.id}]</span>&nbsp;`,
                    1,
                  );
                  setSlash(null);
                }}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 text-left text-xs font-bold text-white/80 transition-colors"
              >
                <w.icon size={14} style={{ color: "#BFA264" }} /> {w.label}
              </button>
            ))}
          </motion.div>
        )}

        {mention && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] flex flex-col p-1.5 rounded-2xl shadow-2xl backdrop-blur-2xl border w-56"
            style={{
              top: mention.top,
              left: mention.left,
              background: "rgba(10,10,10,0.9)",
              borderColor: "rgba(191,162,100,0.2)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40 px-2 py-1.5">
              Connect & Mention
            </span>
            {connectors.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  insertHtml(
                    `&nbsp;<a href="${c.url}" target="_blank" contenteditable="false" style="color:#BFA264; font-weight:900; text-decoration:none; background:rgba(191,162,100,0.1); padding:2px 6px; border-radius:6px;">${c.icon} ${c.label}</a>&nbsp;`,
                    (mention.query?.length || 0) + 1,
                  );
                  setMention(null);
                }}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 text-left text-xs font-bold text-white/80 transition-colors"
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
            <button
              onClick={() => {
                insertHtml(
                  `&nbsp;<a href="/@${mention.query || "operator"}" contenteditable="false" style="color:#8b5cf6; font-weight:900; text-decoration:none; background:rgba(139,92,246,0.1); padding:2px 6px; border-radius:6px;">@${mention.query || "operator"}</a>&nbsp;`,
                  (mention.query?.length || 0) + 1,
                );
                setMention(null);
              }}
              className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 text-left text-xs font-bold text-white/80 transition-colors mt-1 border-t border-white/5"
            >
              <User size={14} style={{ color: "#8b5cf6" }} /> Mention @
              {mention.query || "..."}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

/* ─── Widget Picker Modal ────────────────────────────────────────────────── */
const WidgetPickerModal = memo(({ onSelect, onClose, userData }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[600] flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, y: 10 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 10 }}
      className="w-full max-w-sm rounded-2xl p-5 shadow-2xl"
      style={{
        background: V.elevated,
        border: `1px solid rgba(255,255,255,0.08)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-black" style={{ color: T.primary }}>
          Embed Widget
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5"
          style={{ color: T.dim }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {WIDGET_TYPES.map((w) => {
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              onClick={() => onSelect(w.id)}
              className="flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:scale-[1.02]"
              style={{
                background: `${w.color}10`,
                border: `1px solid ${w.color}25`,
              }}
            >
              <Icon size={14} style={{ color: w.color }} />
              <span
                className="text-[11px] font-bold"
                style={{ color: T.primary }}
              >
                {w.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  </motion.div>
));

/* ─── Template Picker ────────────────────────────────────────────────────── */
const TemplatePicker = memo(({ onSelect, onClose, current }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[600] flex items-end md:items-center justify-center"
    style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
    onClick={onClose}
  >
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      className="w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl"
      style={{
        background: V.elevated,
        border: `1px solid rgba(255,255,255,0.08)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-5">
        <p className="text-base font-black" style={{ color: T.primary }}>
          Choose Template
        </p>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5"
          style={{ color: T.dim }}
        >
          <X size={14} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="flex items-center gap-4 p-4 rounded-2xl border text-left transition-all"
              style={{
                background: current === t.id ? t.bg : "rgba(255,255,255,0.02)",
                border: `1px solid ${current === t.id ? t.border : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: t.bg, border: `1px solid ${t.border}` }}
              >
                <Icon size={16} style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: T.primary }}>
                  {t.label}
                </p>
                {t.prompt && (
                  <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
                    Pre-structured prompt included
                  </p>
                )}
              </div>
              {current === t.id && (
                <Check
                  size={14}
                  style={{ color: t.color, marginLeft: "auto" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  </motion.div>
));

/* ─── Share Modal ────────────────────────────────────────────────────────── */
const ShareModal = memo(({ entry, onClose, onUpdate, uid }) => {
  const [input, setInput] = useState("");
  const [sharedWith, setSharedWith] = useState(entry?.sharedWith || []);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!input.trim()) return;
    setSearching(true);
    setError("");
    try {
      const isEmail = input.includes("@") && input.includes(".");
      const field = isEmail ? "identity.email" : "identity.username";
      const snap = await getDocs(
        query(
          collection(db, "users"),
          where(field, "==", input.toLowerCase().trim()),
          limit(1),
        ),
      );
      if (snap.empty) {
        setError("No operator found.");
        setSearchResult(null);
      } else {
        const d = snap.docs[0];
        if (d.id === uid) {
          setError("That's you!");
          setSearchResult(null);
        } else
          setSearchResult({
            uid: d.id,
            username: d.data().identity?.username,
            email: d.data().identity?.email,
            firstName: d.data().identity?.firstName,
          });
      }
    } catch {
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const addUser = () => {
    if (!searchResult || sharedWith.find((u) => u.uid === searchResult.uid))
      return;
    const next = [...sharedWith, searchResult];
    setSharedWith(next);
    setSearchResult(null);
    setInput("");
    onUpdate({ sharedWith: next });
  };

  const removeUser = (targetUid) => {
    const next = sharedWith.filter((u) => u.uid !== targetUid);
    setSharedWith(next);
    onUpdate({ sharedWith: next });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="w-full max-w-md rounded-2xl shadow-2xl"
        style={{
          background: V.elevated,
          border: `1px solid rgba(255,255,255,0.08)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between p-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2.5">
            <Share2 size={16} style={{ color: G.bright }} />
            <p className="text-sm font-black" style={{ color: T.primary }}>
              Share Entry
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5"
            style={{ color: T.dim }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: T.dim }}
            >
              Share by username or email
            </p>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="@username or email"
                className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#BFA264]/40 transition-colors"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                style={{
                  background: G.dimBg,
                  border: `1px solid ${G.border}`,
                  color: G.bright,
                }}
              >
                {searching ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Search size={12} />
                )}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 mt-1.5">{error}</p>
            )}
            {searchResult && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mt-2 p-3 rounded-xl"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <div>
                  <p className="text-sm font-bold" style={{ color: T.primary }}>
                    {searchResult.firstName || searchResult.username}
                  </p>
                  <p className="text-[10px]" style={{ color: T.dim }}>
                    @{searchResult.username}
                  </p>
                </div>
                <button
                  onClick={addUser}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  Add
                </button>
              </motion.div>
            )}
          </div>
          {sharedWith.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: T.dim }}
              >
                Shared with
              </p>
              <div className="space-y-1.5">
                {sharedWith.map((u) => (
                  <div
                    key={u.uid}
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p
                      className="text-sm font-bold"
                      style={{ color: T.primary }}
                    >
                      @{u.username}
                    </p>
                    <button
                      onClick={() => removeUser(u.uid)}
                      className="p-1.5 hover:bg-white/5 rounded-lg"
                      style={{ color: T.dim }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});

/* ─── Calendar Mini ──────────────────────────────────────────────────────── */
const CalendarMini = memo(({ selectedDate, onSelect, entryDates, today }) => {
  const [viewDate, setViewDate] = useState(
    new Date(selectedDate + "T12:00:00"),
  );
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today;

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => {
    const nextDate = new Date(year, month + 1, 1);
    if (nextDate <= new Date()) setViewDate(nextDate);
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isFuture = ds > todayDate;
    days.push({ d, ds, isFuture });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-black" style={{ color: T.primary }}>
          {monthName}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
            style={{ color: T.dim }}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={next}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-all disabled:opacity-30"
            style={{ color: T.dim }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-bold py-1"
            style={{ color: T.dim }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={i} />;
          const { d, ds, isFuture } = day;
          const isSelected = ds === selectedDate;
          const isToday = ds === todayDate;
          const hasEntry = entryDates.has(ds);
          return (
            <button
              key={ds}
              onClick={() => !isFuture && onSelect(ds)}
              disabled={isFuture}
              className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-bold transition-all disabled:opacity-25"
              style={{
                background: isSelected ? G.bright : "transparent",
                color: isSelected ? "#000" : isToday ? T.primary : T.dim,
                borderRadius: "50%",
              }}
            >
              {d}
              {hasEntry && (
                <div
                  className="absolute bottom-0.5 w-1 h-1 rounded-full"
                  style={{ background: G.bright }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

/* ─── Swipeable Entry Card (Mobile) ────────────────────────────────────── */
const SwipeableEntryCard = memo(({ entry, onDelete, onSelect, isToday }) => {
  const x = useMotionValue(0);
  const bg = useTransform(
    x,
    [-120, -60, 0],
    ["rgba(239,68,68,0.9)", "rgba(239,68,68,0.4)", "rgba(255,255,255,0.0)"],
  );
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-2xl mb-2">
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl pointer-events-none z-0"
        style={{ background: bg }}
      >
        <Trash2 size={18} style={{ color: "white" }} />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.7, right: 0 }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(_, info) => {
          setIsDragging(false);
          if (info.offset.x < -80) onDelete(entry.dateStr);
        }}
        onClick={() => !isDragging && onSelect(entry.dateStr)}
        className="relative z-10 py-5 px-1 cursor-pointer"
        style={{
          x,
          background: V.bg,
          borderBottom: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center gap-5">
          <div className="shrink-0 text-center w-12">
            <p
              className="text-xl font-black font-display tracking-tighter leading-none"
              style={{ color: isToday ? G.bright : T.primary }}
            >
              {new Date(entry.dateStr + "T12:00:00").getDate()}
            </p>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mt-1"
              style={{ color: T.dim }}
            >
              {new Date(entry.dateStr + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short" },
              )}
            </p>
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-0.5">
              {entry.visibility === "public" ? (
                <Globe size={9} style={{ color: G.base }} />
              ) : (
                <Lock size={9} style={{ color: T.dim }} />
              )}
              {isToday && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  Today
                </span>
              )}
            </div>
            <p
              className="text-sm font-bold leading-snug line-clamp-2"
              style={{ color: T.primary }}
            >
              {stripHtml(entry.richContent || entry.content || "").slice(
                0,
                100,
              ) || "Empty entry"}
            </p>
            <p className="text-[10px] mt-1" style={{ color: T.dim }}>
              {wordCount(stripHtml(entry.richContent || ""))} words
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

/* ─── Desktop Entry Card ─────────────────────────────────────────────────── */
const DesktopEntryCard = memo(
  ({ entry, onDelete, onSelect, isToday, view }) => {
    const [hovered, setHovered] = useState(false);
    const plain = stripHtml(entry.richContent || entry.content || "");

    if (view === "grid") {
      return (
        <motion.div
          whileHover={{ scale: 1.02 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => onSelect(entry.dateStr)}
          className="relative cursor-pointer rounded-3xl p-5 overflow-hidden transition-colors"
          style={{
            background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
            minHeight: 140,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              {fmtShort(entry.dateStr)}
            </span>
            {entry.visibility === "public" ? (
              <Globe size={9} style={{ color: G.base }} />
            ) : (
              <Lock size={9} style={{ color: T.dim }} />
            )}
            {isToday && (
              <span
                className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                Today
              </span>
            )}
          </div>
          <p
            className="text-xs leading-relaxed line-clamp-4"
            style={{ color: T.secondary }}
          >
            {plain.slice(0, 160) || "No content yet"}
          </p>
          {hovered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.dateStr);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full transition-all backdrop-blur-md"
              style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
            >
              <Trash2 size={12} />
            </button>
          )}
        </motion.div>
      );
    }

    return (
      <motion.div
        whileHover={{ x: 4 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex items-center gap-4 py-4 px-5 cursor-pointer rounded-[20px] transition-colors"
        style={{
          background: hovered ? "rgba(255,255,255,0.03)" : "transparent",
        }}
      >
        <button
          onClick={() => onSelect(entry.dateStr)}
          className="flex-1 flex items-center gap-5 min-w-0 text-left outline-none"
        >
          <div className="shrink-0 text-center w-14">
            <p
              className="text-2xl font-black font-display leading-none tracking-tight"
              style={{ color: isToday ? G.bright : T.primary }}
            >
              {new Date(entry.dateStr + "T12:00:00").getDate()}
            </p>
            <p
              className="text-[9px] font-bold uppercase tracking-widest mt-1"
              style={{ color: T.dim }}
            >
              {new Date(entry.dateStr + "T12:00:00").toLocaleDateString(
                "en-US",
                { month: "short" },
              )}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {entry.visibility === "public" ? (
                <Globe size={9} style={{ color: G.base }} />
              ) : (
                <Lock size={9} style={{ color: T.dim }} />
              )}
              {isToday && (
                <span
                  className="text-[8px] font-black uppercase tracking-widest px-1.5 rounded-full"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  Today
                </span>
              )}
            </div>
            <p
              className="text-sm font-medium truncate"
              style={{ color: T.secondary }}
            >
              {plain.slice(0, 90) || "Empty entry"}
            </p>
          </div>
          <p
            className="text-[10px] shrink-0 font-mono tracking-widest uppercase"
            style={{ color: T.dim }}
          >
            {wordCount(plain)}w
          </p>
        </button>
        {hovered && (
          <button
            onClick={() => onDelete(entry.dateStr)}
            className="shrink-0 p-2 rounded-full backdrop-blur-md transition-all"
            style={{ background: "rgba(239,68,68,0.15)", color: "#F87171" }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </motion.div>
    );
  },
);

/* ─── Undo Toast ─────────────────────────────────────────────────────────── */
const UndoToast = memo(({ onUndo, onDismiss, itemDate }) => {
  const [timeLeft, setTimeLeft] = useState(25);
  useEffect(() => {
    const t = setInterval(
      () =>
        setTimeLeft((p) => {
          if (p <= 1) {
            clearInterval(t);
            onDismiss();
            return 0;
          }
          return p - 1;
        }),
      1000,
    );
    return () => clearInterval(t);
  }, [onDismiss]);
  const pct = (timeLeft / 25) * 100;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: V.elevated,
        border: "1px solid rgba(255,255,255,0.1)",
        minWidth: 280,
      }}
    >
      <div className="relative w-8 h-8">
        <svg width="32" height="32" className="-rotate-90">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2.5"
          />
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="#F87171"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 13}`}
            style={{
              strokeDashoffset: 2 * Math.PI * 13 * (1 - pct / 100),
              transition: "stroke-dashoffset 1s linear",
            }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-[9px] font-black"
          style={{ color: "#F87171" }}
        >
          {timeLeft}
        </span>
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold" style={{ color: T.primary }}>
          Entry deleted
        </p>
        <p className="text-[10px]" style={{ color: T.dim }}>
          {itemDate}
        </p>
      </div>
      <button
        onClick={onUndo}
        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
        style={{
          background: G.dimBg,
          border: `1px solid ${G.border}`,
          color: G.bright,
        }}
      >
        Undo
      </button>
    </motion.div>
  );
});

/* ─── PDF Export ─────────────────────────────────────────────────────────── */
const exportToPDF = async (entry, userData) => {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    // Header bar
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, W, 35, "F");

    // Gold accent line
    doc.setFillColor(191, 162, 100);
    doc.rect(0, 33, W, 2, "F");

    // Logo
    doc.setTextColor(191, 162, 100);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DISCOTIVE", margin, 22);

    // Header right
    doc.setTextColor(160, 150, 140);
    doc.setFontSize(9);
    doc.text("AGENDA — PERSONAL INTELLIGENCE LOG", W - margin, 22, {
      align: "right",
    });

    y = 50;

    // Date
    doc.setTextColor(191, 162, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(fmtDisplay(entry.dateStr).toUpperCase(), margin, y);
    y += 8;

    // Operator info
    const operatorName =
      `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim();
    doc.setTextColor(120, 110, 100);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Operator: ${operatorName} · Score: ${userData?.discotiveScore?.current?.toLocaleString() || "—"} · Streak: ${userData?.discotiveScore?.streak || 0} days`,
      margin,
      y,
    );
    y += 3;

    // Divider
    doc.setDrawColor(50, 45, 40);
    doc.setLineWidth(0.5);
    doc.line(margin, y, W - margin, y);
    y += 10;

    // Content
    const plainText = stripHtml(
      entry.richContent || entry.content || "No content recorded.",
    );
    doc.setTextColor(240, 235, 228);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(plainText, W - margin * 2);
    const lineH = 6;
    lines.forEach((line) => {
      if (y + lineH > H - 30) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += lineH;
    });

    // Footer
    doc.setFillColor(10, 10, 10);
    doc.rect(0, H - 20, W, 20, "F");
    doc.setTextColor(80, 75, 65);
    doc.setFontSize(7);
    doc.text(
      "DISCOTIVE OS · PERSONAL AGENDA EXPORT · CONFIDENTIAL",
      margin,
      H - 8,
    );
    doc.text(new Date().toLocaleString(), W - margin, H - 8, {
      align: "right",
    });

    doc.save(`discotive-agenda-${entry.dateStr}.pdf`);
  } catch (err) {
    console.error("[Agenda] PDF export failed:", err);
  }
};

/* ─── Main Agenda Editor Panel ───────────────────────────────────────────── */
const AgendaEditor = memo(
  ({ dateStr, userData, isToday, isPast, isDesktopOverlay }) => {
    const uid = userData?.uid;
    const [entry, setEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState("idle");
    const [showWidgetPicker, setShowWidgetPicker] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [publicCount, setPublicCount] = useState(0);
    const [richContent, setRichContent] = useState("");
    const [entryTitle, setEntryTitle] = useState("");
    const [charCount, setCharCount] = useState(0);
    const [activeTemplate, setActiveTemplate] = useState("blank");
    const [isExporting, setIsExporting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const editorRef = useRef(null);
    const autosaveRef = useRef(null);
    const isMobileView = window.innerWidth < 768 || isDesktopOverlay;

    // Load entry
    useEffect(() => {
      if (!uid || !dateStr) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      const fetchEntry = async () => {
        try {
          const snap = await getDoc(doc(db, "users", uid, "agenda", dateStr));
          if (snap.exists()) {
            const data = snap.data();
            setEntry(data);
            setRichContent(data.richContent || data.content || "");
            setEntryTitle(data.title || "");
            setIsPublic(data.visibility === "public");
            setActiveTemplate(data.template || "blank");
            if (editorRef.current && isToday) {
              editorRef.current.innerHTML =
                data.richContent || data.content || "";
            }
          } else {
            setEntry(null);
            setRichContent("");
            setEntryTitle("");
            setIsPublic(false);
            if (editorRef.current) editorRef.current.innerHTML = "";
          }
          // Count public entries
          const pubSnap = await getDocs(
            query(
              collection(db, "users", uid, "agenda"),
              where("visibility", "==", "public"),
            ),
          );
          setPublicCount(pubSnap.size);
        } catch (err) {
          console.error("[Agenda] fetchEntry:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchEntry();
    }, [uid, dateStr, isToday]);

    const persist = useCallback(
      async (html) => {
        if (!uid || !isToday) return;
        setSaveStatus("saving");
        try {
          const plain = stripHtml(html);
          await setDoc(
            doc(db, "users", uid, "agenda", dateStr),
            {
              title: entryTitle,
              richContent: html,
              content: plain,
              visibility: isPublic ? "public" : "private",
              template: activeTemplate,
              attachedStats: {
                score: userData?.discotiveScore?.current || 0,
                streak: userData?.discotiveScore?.streak || 0,
                rank: userData?.precomputed?.globalRank || null,
              },
              savedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2500);
        } catch (err) {
          console.error("[Agenda] persist:", err);
          setSaveStatus("idle");
        }
      },
      [uid, dateStr, isToday, isPublic, activeTemplate, userData, entryTitle],
    );

    const handleTitleChange = useCallback(
      (e) => {
        setEntryTitle(e.target.value);
        if (autosaveRef.current) clearTimeout(autosaveRef.current);
        setSaveStatus("saving");
        autosaveRef.current = setTimeout(
          () => persist(editorRef.current?.innerHTML || richContent),
          AUTOSAVE_MS,
        );
      },
      [persist, richContent],
    );

    const handleInput = useCallback(() => {
      if (!editorRef.current || !isToday) return;
      const html = editorRef.current.innerHTML;
      const plain = stripHtml(html);
      if (plain.length > MAX_CHARS) {
        editorRef.current.innerHTML = richContent;
        return;
      }
      setRichContent(html);
      setCharCount(plain.length);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      setSaveStatus("saving");
      autosaveRef.current = setTimeout(() => persist(html), AUTOSAVE_MS);
    }, [isToday, richContent, persist]);

    // Ctrl+S
    useEffect(() => {
      const handler = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s" && isToday) {
          e.preventDefault();
          if (autosaveRef.current) clearTimeout(autosaveRef.current);
          persist(editorRef.current?.innerHTML || richContent);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [isToday, richContent, persist]);

    const handleInsertWidget = (widgetId) => {
      setShowWidgetPicker(false);
      if (!editorRef.current) return;
      const widgetHtml = `<span data-widget="${widgetId}" contenteditable="false" class="inline-widget">📊 [${widgetId}]</span>&nbsp;`;
      document.execCommand("insertHTML", false, widgetHtml);
      handleInput();
    };

    const handleInsertLink = () => {
      const url = window.prompt("Enter URL:");
      if (url) {
        const text = window.prompt("Link text:", url);
        document.execCommand(
          "insertHTML",
          false,
          `<a href="${url}" target="_blank" style="color:#BFA264;text-decoration:underline;">${text || url}</a>`,
        );
        handleInput();
      }
    };

    const handleInsertYoutube = () => {
      const url = window.prompt("YouTube URL:");
      if (!url) return;
      const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
      if (!match) return;
      const id = match[1];
      document.execCommand(
        "insertHTML",
        false,
        `<div style="margin:12px 0;border-radius:12px;overflow:hidden;border:1px solid rgba(191,162,100,0.25);background:#0A0A0A;padding:8px;">` +
          `<p style="font-size:10px;color:#888;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.1em;">▶ YOUTUBE EMBED</p>` +
          `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen style="border-radius:8px;display:block;"></iframe></div>`,
      );
      handleInput();
    };

    const handleTemplateSelect = (template) => {
      setActiveTemplate(template.id);
      setShowTemplatePicker(false);
      if (!editorRef.current || !isToday) return;
      if (template.prompt) {
        editorRef.current.innerHTML = template.prompt;
        handleInput();
      }
    };

    const handleVisibilityToggle = async () => {
      if (
        !isPublic &&
        publicCount >= MAX_PUBLIC &&
        !entry?.visibility === "public"
      ) {
        alert(`Maximum ${MAX_PUBLIC} public entries allowed.`);
        return;
      }
      const next = !isPublic;
      setIsPublic(next);
      if (uid && dateStr) {
        await setDoc(
          doc(db, "users", uid, "agenda", dateStr),
          {
            visibility: next ? "public" : "private",
            savedAt: serverTimestamp(),
          },
          { merge: true },
        );
        if (next) setPublicCount((p) => p + 1);
        else setPublicCount((p) => Math.max(0, p - 1));
      }
    };

    const handleExport = async () => {
      setIsExporting(true);
      await exportToPDF(
        { dateStr, richContent, content: stripHtml(richContent) },
        userData,
      );
      setIsExporting(false);
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: G.base }}
          />
        </div>
      );
    }

    return (
      <>
        <AnimatePresence>
          {showWidgetPicker && (
            <WidgetPickerModal
              key="wp"
              onSelect={handleInsertWidget}
              onClose={() => setShowWidgetPicker(false)}
              userData={userData}
            />
          )}
          {showTemplatePicker && (
            <TemplatePicker
              key="tp"
              onSelect={handleTemplateSelect}
              onClose={() => setShowTemplatePicker(false)}
              current={activeTemplate}
            />
          )}
          {showShareModal && (
            <ShareModal
              key="sm"
              entry={entry}
              onClose={() => setShowShareModal(false)}
              onUpdate={(fields) =>
                setDoc(
                  doc(db, "users", uid, "agenda", dateStr),
                  { ...fields, savedAt: serverTimestamp() },
                  { merge: true },
                )
              }
              uid={uid}
            />
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex flex-col h-full overflow-hidden flex-1",
            isFullscreen && "fixed inset-4 z-[500]",
          )}
          style={{
            background: "transparent",
            border: "none",
            boxShadow: "none",
            willChange: "transform, opacity",
          }}
        >
          {/* Header */}
          {isMobileView ? (
            <div className="flex flex-col px-6 pt-8 pb-5 shrink-0 relative z-10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#BFA264]">
                  Today's Entry
                </span>
                <SaveStatus status={saveStatus} isMobile={true} />
              </div>
              <h2 className="text-3xl font-black font-display text-white tracking-tight leading-none mb-1">
                {new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                })}
              </h2>
              <p className="text-xs font-bold text-white/50 tracking-wider uppercase">
                {new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                })}
              </p>
            </div>
          ) : (
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: V.surface,
              }}
            >
              <div>
                <p
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  {isPast
                    ? "Read Only"
                    : isToday
                      ? "Today's Entry"
                      : "Future locked"}
                </p>
                <p className="text-sm font-black" style={{ color: T.primary }}>
                  {fmtDisplay(dateStr)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SaveStatus status={saveStatus} />
                {isToday && (
                  <div className="hidden md:flex items-center gap-2">
                    <button
                      onClick={() => setShowTemplatePicker(true)}
                      title="Templates"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5"
                      style={{
                        color: T.dim,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Layout size={11} /> Templates
                    </button>
                    <button
                      onClick={handleVisibilityToggle}
                      title={isPublic ? "Make Private" : "Make Public"}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      style={{
                        background: isPublic
                          ? G.dimBg
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isPublic ? G.border : "rgba(255,255,255,0.06)"}`,
                        color: isPublic ? G.bright : T.dim,
                      }}
                    >
                      {isPublic ? <Globe size={11} /> : <Lock size={11} />}
                      {isPublic ? "Public" : "Private"}
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      title="Share"
                      className="p-2 rounded-lg hover:bg-white/5 transition-all"
                      style={{
                        color: T.dim,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Share2 size={13} />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  title="Export PDF"
                  className="hidden md:block p-2 rounded-lg hover:bg-white/5 transition-all"
                  style={{
                    color: T.dim,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {isExporting ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                </button>
                <button
                  onClick={() => setIsFullscreen((v) => !v)}
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  className="p-2 rounded-lg hover:bg-white/5 transition-all hidden md:block"
                  style={{
                    color: T.dim,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {isFullscreen ? (
                    <Minimize2 size={13} />
                  ) : (
                    <Maximize2 size={13} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stats bar (Hidden on mobile) */}
          {!isMobileView && (
            <div
              className="flex items-center gap-4 px-4 py-2 flex-wrap shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              {[
                {
                  icon: Zap,
                  value:
                    userData?.discotiveScore?.current?.toLocaleString() || "0",
                  label: "Score",
                  color: G.bright,
                },
                {
                  icon: Flame,
                  value: `${userData?.discotiveScore?.streak || 0}d`,
                  label: "Streak",
                  color: "#f97316",
                },
                {
                  icon: Trophy,
                  value: userData?.precomputed?.globalRank
                    ? `#${userData.precomputed.globalRank}`
                    : "—",
                  label: "Rank",
                  color: "#f59e0b",
                },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <s.icon size={10} style={{ color: s.color }} />
                  <span
                    className="text-[10px] font-black font-mono"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </span>
                  <span className="text-[9px]" style={{ color: T.dim }}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Editor Area */}
          <div
            className={cn(
              "relative flex-1 flex flex-col min-h-0",
              isMobileView ? "rounded-t-[32px]" : "",
            )}
            style={{
              background:
                isMobileView && !isDesktopOverlay
                  ? "radial-gradient(120% 120% at 50% -10%, #151515 0%, #030303 100%)"
                  : "transparent",
              borderTop:
                isMobileView && !isDesktopOverlay
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "none",
              boxShadow:
                isMobileView && !isDesktopOverlay
                  ? "0 -20px 40px rgba(0,0,0,0.5)"
                  : "none",
            }}
          >
            {isToday && (
              <FloatingEditorOverlay
                editorRef={editorRef}
                userData={userData}
              />
            )}

            {isToday && (
              <div className="shrink-0 pt-7 px-6 pb-2">
                <input
                  type="text"
                  value={entryTitle}
                  onChange={handleTitleChange}
                  placeholder="Entry Title..."
                  className="w-full bg-transparent outline-none text-2xl font-black font-display text-white placeholder-white/20 transition-all"
                  style={{ caretColor: G.bright }}
                />
                <div className="w-8 h-[3px] mt-4 rounded-full bg-[#BFA264]/40" />
              </div>
            )}

            {isPast ? (
              <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {entryTitle && (
                  <h3 className="text-2xl font-black font-display text-white mb-4 leading-tight">
                    {entryTitle}
                  </h3>
                )}
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      richContent ||
                      `<p style="color:rgba(245,240,232,0.28);font-style:italic;">No entry for this day.</p>`,
                  }}
                />
              </div>
            ) : (
              <div className="relative flex-1 overflow-y-auto custom-scrollbar">
                <div
                  ref={editorRef}
                  contentEditable={isToday}
                  onInput={handleInput}
                  suppressContentEditableWarning
                  className="px-6 py-4 outline-none min-h-full text-[15px] leading-relaxed"
                  style={{
                    color: T.primary,
                    caretColor: G.bright,
                    paddingBottom: "120px",
                  }}
                />
                {isToday && !richContent && (
                  <div
                    className="absolute top-4 left-6 pointer-events-none text-[15px] font-medium"
                    style={{ color: "rgba(255,255,255,0.15)" }}
                  >
                    What's the agenda?
                  </div>
                )}
              </div>
            )}

            <div
              className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full z-10 backdrop-blur-md shadow-lg"
              style={{
                background: "rgba(10,10,10,0.8)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: charCount > MAX_CHARS * 0.9 ? "#f59e0b" : T.dim,
              }}
            >
              <span className="text-[10px] font-bold font-mono tracking-widest">
                {charCount}
              </span>
              <span className="text-[9px] font-bold tracking-widest">
                / {MAX_CHARS}
              </span>
            </div>
          </div>
        </motion.div>
      </>
    );
  },
);

/* ─── Tier Gate Upsell ───────────────────────────────────────────────────── */
const AgendaTierGate = memo(({ navigate }) => (
  <div
    className="h-full min-h-full flex flex-col items-center justify-center p-6"
    style={{ background: V.bg }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg text-center"
    >
      <div className="relative mb-8">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: "blur(60px)" }}
        >
          <div
            className="w-48 h-48 rounded-full"
            style={{
              background: `radial-gradient(circle,${G.dimBg} 0%,transparent 70%)`,
            }}
          />
        </div>
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center mx-auto border"
          style={{
            background: G.dimBg,
            border: `1px solid ${G.border}`,
            boxShadow: `0 0 60px rgba(191,162,100,0.2)`,
          }}
        >
          <BookOpen size={36} style={{ color: G.bright }} />
          <div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg,#8B7240,#D4AF78)",
              border: `2px solid ${V.bg}`,
            }}
          >
            <Crown size={14} style={{ color: "#000" }} />
          </div>
        </div>
      </div>
      <p
        className="text-[10px] font-black uppercase tracking-[0.3em] mb-3"
        style={{ color: G.base }}
      >
        Pro Feature
      </p>
      <h1
        className="text-4xl font-black mb-4 leading-tight"
        style={{ color: T.primary, letterSpacing: "-0.03em" }}
      >
        Discotive Agenda
      </h1>
      <p
        className="text-base leading-relaxed mb-8 max-w-md mx-auto"
        style={{ color: T.secondary }}
      >
        Your personal intelligence engine. Log daily execution, embed live
        stats, track your journey, and export cinematic PDF reports. Only the
        elite operate with this level of self-awareness.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-8 text-left">
        {[
          {
            icon: BookOpen,
            label: "Daily Execution Log",
            sub: "3000-char rich text diary",
            color: G.bright,
          },
          {
            icon: Zap,
            label: "Live Stats Widgets",
            sub: "Embed score, rank & streak",
            color: "#f59e0b",
          },
          {
            icon: Calendar,
            label: "Calendar Engine",
            sub: "Navigate your entire history",
            color: "#38bdf8",
          },
          {
            icon: Download,
            label: "ATS PDF Export",
            sub: "Cinematic, selectable reports",
            color: "#10b981",
          },
          {
            icon: Share2,
            label: "Private Sharing",
            sub: "Google Drive-style permissions",
            color: "#a855f7",
          },
          {
            icon: Layout,
            label: "5 Premium Templates",
            sub: "Executive, Founder & more",
            color: G.base,
          },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <f.icon size={14} style={{ color: f.color, marginTop: 2 }} />
            <div>
              <p className="text-xs font-bold" style={{ color: T.primary }}>
                {f.label}
              </p>
              <p className="text-[10px]" style={{ color: T.dim }}>
                {f.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/premium")}
        className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02]"
        style={{
          background: "linear-gradient(135deg,#8B7240,#D4AF78)",
          color: "#000",
          boxShadow: `0 0 40px rgba(191,162,100,0.3)`,
        }}
      >
        Upgrade to Pro — Unlock Agenda
      </button>
      <button
        onClick={() => navigate("/app")}
        className="w-full py-3 mt-3 text-sm font-bold transition-all"
        style={{ color: T.dim }}
      >
        ← Back to Dashboard
      </button>
    </motion.div>
  </div>
));

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const AgendaPage = () => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();
  const today = todayStr();

  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entryDates, setEntryDates] = useState(new Set());
  const [view, setView] = useState("list"); // list | grid
  const [undoState, setUndoState] = useState(null); // { dateStr, data }
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [selectedEntryDate, setSelectedEntryDate] = useState(null);
  const [isDesktopEditorOpen, setIsDesktopEditorOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const uid = userData?.uid;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  // Fetch all entries (light — just metadata)
  const fetchEntries = useCallback(async () => {
    if (!uid) return;
    setEntriesLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "users", uid, "agenda"),
          orderBy("savedAt", "desc"),
          limit(100),
        ),
      );
      const items = snap.docs.map((d) => ({ dateStr: d.id, ...d.data() }));
      setEntries(items);
      setEntryDates(new Set(items.map((e) => e.dateStr)));
    } catch (err) {
      console.error("[Agenda] fetchEntries:", err);
    } finally {
      setEntriesLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = useCallback(
    async (dateStr) => {
      if (!uid) return;
      const target = entries.find((e) => e.dateStr === dateStr);
      if (!target) return;

      // Optimistic remove
      setEntries((prev) => prev.filter((e) => e.dateStr !== dateStr));
      setEntryDates((prev) => {
        const next = new Set(prev);
        next.delete(dateStr);
        return next;
      });
      setUndoState({ dateStr, data: target });

      await deleteDoc(doc(db, "users", uid, "agenda", dateStr));
      if (selectedDate === dateStr) setSelectedDate(today);
    },
    [uid, entries, selectedDate, today],
  );

  const handleDesktopDelete = useCallback(
    async (ds) => {
      if (selectedEntryDate === ds) setSelectedEntryDate(null);
      if (selectedDate === ds) setSelectedDate(today);
      await handleDelete(ds);
    },
    [selectedEntryDate, selectedDate, today, handleDelete],
  );

  const handleUndo = useCallback(async () => {
    if (!uid || !undoState) return;
    const { dateStr, data } = undoState;
    await setDoc(doc(db, "users", uid, "agenda", dateStr), data);
    setEntries((prev) =>
      [data, ...prev.filter((e) => e.dateStr !== dateStr)].sort(
        (a, b) => (b.savedAt?.seconds || 0) - (a.savedAt?.seconds || 0),
      ),
    );
    setEntryDates((prev) => new Set([...prev, dateStr]));
    setUndoState(null);
  }, [uid, undoState]);

  if (loading) {
    return (
      <div
        className="h-full min-h-full flex flex-col items-center justify-center"
        style={{ background: V.bg }}
      >
        <Loader2 size={24} className="animate-spin" style={{ color: G.base }} />
      </div>
    );
  }

  if (!isPro) return <AgendaTierGate navigate={navigate} />;

  const isToday = selectedDate === today;
  const isFuture = selectedDate > today;
  const isPast = selectedDate < today;

  /* ── MOBILE LAYOUT ── */
  if (isMobile) {
    const todayDateObj = new Date(selectedDate + "T12:00:00");
    const displayDay = todayDateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const displayDate = todayDateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <div
        className="h-full min-h-full flex flex-col pb-24 select-none relative overflow-y-auto custom-scrollbar"
        style={{ background: V.bg }}
      >
        {/* Background noise and animated ambient gradients */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(191,162,100,0.15) 0%, transparent 70%)",
            }}
          />
        </div>
        {!showMobileEditor && (
          <>
            {/* Header */}
            <div className="relative z-10 px-5 pt-8 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <motion.h1
                    layout
                    className="text-2xl font-black font-display tracking-tight"
                    style={{ color: T.primary }}
                  >
                    {displayDate}
                  </motion.h1>
                  <motion.p
                    layout
                    className="text-sm font-medium mt-0.5"
                    style={{ color: T.dim }}
                  >
                    {displayDay}
                  </motion.p>
                </div>
                <button
                  onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                  className="p-3 rounded-full transition-all"
                  style={{
                    background: isCalendarExpanded
                      ? G.dimBg
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isCalendarExpanded ? G.border : "rgba(255,255,255,0.08)"}`,
                    color: isCalendarExpanded ? G.bright : T.primary,
                  }}
                >
                  <Calendar size={20} />
                </button>
              </div>
            </div>
            {/* Calendar (collapsible) */}
            <AnimatePresence initial={false}>
              {isCalendarExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="px-2 overflow-hidden relative z-10"
                  style={{ background: "transparent" }}
                >
                  <div className="pb-6">
                    <CalendarMini
                      selectedDate={selectedDate}
                      onSelect={(ds) => {
                        setSelectedDate(ds);
                        setIsCalendarExpanded(false);
                      }}
                      entryDates={entryDates}
                      today={today}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Sliding Tabs */}
            <div className="px-5 mb-6 relative z-10">
              <div
                className="flex p-1 rounded-2xl relative"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {[
                  { id: "list", label: "List View", icon: List },
                  { id: "grid", label: "Thumbnails", icon: Grid },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className="relative flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2 z-10 transition-colors duration-300"
                    style={{ color: view === t.id ? "#000" : T.dim }}
                  >
                    {view === t.id && (
                      <motion.div
                        layoutId="mobileTabIndicator"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: G.bright }}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.5,
                        }}
                      />
                    )}
                    <t.icon size={14} className="relative z-20" />
                    <span className="relative z-20">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Entry list */}
            <div className="px-5 relative z-10">
              {entriesLoading ? (
                <div
                  className={
                    view === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"
                  }
                >
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-3xl animate-pulse ${view === "grid" ? "aspect-square" : "h-24"}`}
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      />
                    ))}
                </div>
              ) : entries.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  >
                    <BookOpen
                      size={24}
                      style={{ color: "rgba(255,255,255,0.2)" }}
                    />
                  </div>
                  <p
                    className="text-sm font-black"
                    style={{ color: T.primary }}
                  >
                    No entries yet.
                  </p>
                  <p className="text-[11px] mt-1.5" style={{ color: T.dim }}>
                    Tap + to log your execution.
                  </p>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-2 gap-3">
                  {entries.map((entry) => (
                    <DesktopEntryCard
                      key={entry.dateStr}
                      entry={entry}
                      view="grid"
                      onDelete={handleDelete}
                      onSelect={(ds) => {
                        setSelectedDate(ds);
                        setShowMobileEditor(true);
                      }}
                      isToday={entry.dateStr === today}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <SwipeableEntryCard
                      key={entry.dateStr}
                      entry={entry}
                      onDelete={handleDelete}
                      onSelect={(ds) => {
                        setSelectedDate(ds);
                        setShowMobileEditor(true);
                      }}
                      isToday={entry.dateStr === today}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {/* Huge Plus FAB */}
        {!showMobileEditor && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedDate(today);
              setShowMobileEditor(true);
            }}
            className="fixed bottom-24 right-6 w-16 h-16 rounded-[24px] flex items-center justify-center shadow-2xl z-40"
            style={{
              background: `linear-gradient(135deg, ${G.light}, ${G.bright})`,
              color: "#000",
              boxShadow: "0 10px 30px rgba(191,162,100,0.3)",
            }}
          >
            <Plus size={32} strokeWidth={2.5} />
          </motion.button>
        )}
        {/* Full Screen Mobile Editor Modal (Viewport Optimized) */}
        <AnimatePresence>
          {showMobileEditor && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="relative z-50 flex-1 flex flex-col w-full h-full min-h-full"
            >
              <button
                onClick={() => setShowMobileEditor(false)}
                className="absolute top-6 right-5 z-[2000] p-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-2xl transition-transform active:scale-90"
              >
                <X size={18} />
              </button>
              <div className="flex-1 overflow-hidden h-full flex flex-col">
                {isFuture ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <AlertTriangle
                      size={32}
                      style={{ color: "#f59e0b", marginBottom: 16 }}
                    />
                    <p
                      className="text-lg font-black"
                      style={{ color: T.primary }}
                    >
                      Future Locked
                    </p>
                    <p className="text-sm mt-2" style={{ color: T.dim }}>
                      Cannot log executions in the future.
                    </p>
                  </div>
                ) : (
                  <AgendaEditor
                    dateStr={selectedDate}
                    userData={userData}
                    isToday={isToday}
                    isPast={isPast}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Undo Toast */}
        <AnimatePresence>
          {undoState && (
            <UndoToast
              key="undo"
              onUndo={handleUndo}
              onDismiss={() => setUndoState(null)}
              itemDate={fmtShort(undoState.dateStr)}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  /* ── DESKTOP LAYOUT ── */
  return (
    <div
      className="absolute inset-0 w-full h-full flex flex-col overflow-hidden"
      style={{ background: V.bg }}
    >
      {/* Columns Wrapper */}
      <motion.div
        animate={{
          y: isDesktopEditorOpen ? "100%" : 0,
          opacity: isDesktopEditorOpen ? 0 : 1,
          scale: isDesktopEditorOpen ? 0.95 : 1,
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-row flex-1 w-full h-full p-8 gap-8 overflow-hidden bg-transparent"
      >
        {/* COL 1: Entries */}
        <motion.div
          layout
          className={cn(
            "flex flex-col h-full transition-all duration-300",
            selectedEntryDate ? "w-[420px] shrink-0" : "flex-1 min-w-0 w-full",
          )}
        >
          {/* Header: Tabs + Calendar Btn */}
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div
              className="flex relative p-1 rounded-2xl w-[220px]"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {[
                { id: "list", label: "List", icon: List },
                { id: "grid", label: "Grid", icon: Grid },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className="relative flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 z-10 transition-colors"
                  style={{ color: view === t.id ? "#000" : T.dim }}
                >
                  {view === t.id && (
                    <motion.div
                      layoutId="desktopTabIndicator"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: G.bright }}
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.5,
                      }}
                    />
                  )}
                  <t.icon size={14} className="relative z-20" />
                  <span className="relative z-20">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
              className="p-3.5 rounded-full transition-all active:scale-95"
              style={{
                color: isCalendarExpanded ? G.bright : T.primary,
                background: isCalendarExpanded ? G.dimBg : "transparent",
              }}
            >
              <Calendar size={18} />
            </button>
          </div>

          {/* Entry List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            {entriesLoading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-2xl mb-3 animate-pulse"
                    style={{ background: "rgba(255,255,255,0.02)" }}
                  />
                ))
            ) : entries.length === 0 ? (
              <div className="py-16 text-center px-4 flex flex-col items-center justify-center h-full">
                <BookOpen
                  size={32}
                  style={{ color: "rgba(255,255,255,0.1)", marginBottom: 16 }}
                />
                <p className="text-sm font-bold text-white/40">
                  No execution logs found.
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 p-1">
                {entries.map((entry) => (
                  <DesktopEntryCard
                    key={entry.dateStr}
                    entry={entry}
                    view="grid"
                    onDelete={handleDesktopDelete}
                    onSelect={(ds) => {
                      setSelectedEntryDate(ds);
                    }}
                    isToday={entry.dateStr === today}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 p-1">
                {entries.map((entry) => (
                  <DesktopEntryCard
                    key={entry.dateStr}
                    entry={entry}
                    view="list"
                    onDelete={handleDesktopDelete}
                    onSelect={(ds) => {
                      setSelectedEntryDate(ds);
                    }}
                    isToday={entry.dateStr === today}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* COL 2: Preview */}
        <AnimatePresence>
          {selectedEntryDate && (
            <motion.div
              layout
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="flex-[2] flex flex-col h-full min-w-[400px]"
            >
              <div className="flex items-center justify-between mb-4 px-4 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#BFA264]">
                  Entry Preview
                </span>
                <button
                  onClick={() => setSelectedEntryDate(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <AgendaEditor
                  dateStr={selectedEntryDate}
                  userData={userData}
                  isToday={selectedEntryDate === today}
                  isPast={selectedEntryDate < today}
                  isDesktopOverlay={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* COL 3: Calendar */}
        <AnimatePresence>
          {isCalendarExpanded && (
            <motion.div
              layout
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: 340, scale: 1 }}
              exit={{
                opacity: 0,
                width: 0,
                scale: 0.95,
                transition: { duration: 0.2 },
              }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="h-full shrink-0 overflow-hidden"
            >
              <div className="w-[340px] h-full overflow-y-auto custom-scrollbar">
                <CalendarMini
                  selectedDate={selectedEntryDate || selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setSelectedEntryDate(d);
                  }}
                  entryDates={entryDates}
                  today={today}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: isDesktopEditorOpen ? 150 : 0,
          opacity: isDesktopEditorOpen ? 0 : 1,
          scale: isDesktopEditorOpen ? 0.8 : 1,
        }}
        transition={{ duration: 0.4 }}
        onClick={() => {
          setSelectedDate(today);
          setIsDesktopEditorOpen(true);
        }}
        className="fixed bottom-10 right-10 w-[68px] h-[68px] rounded-[24px] flex items-center justify-center shadow-2xl z-[9000] cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${G.light}, ${G.bright})`,
          color: "#000",
          boxShadow: "0 10px 40px rgba(191,162,100,0.3)",
        }}
      >
        <Plus size={32} strokeWidth={2.5} />
      </motion.button>

      {/* FULL SCREEN EDITOR OVERLAY */}
      <AnimatePresence>
        {isDesktopEditorOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="absolute inset-0 z-[50] flex flex-col w-full h-full overflow-hidden"
            style={{
              background:
                "radial-gradient(120% 120% at 50% -10%, #151515 0%, #030303 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            <button
              onClick={() => setIsDesktopEditorOpen(false)}
              className="absolute top-8 right-8 z-[60] p-3.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-2xl transition-transform hover:bg-white/10 hover:scale-105 active:scale-95"
            >
              <X size={20} />
            </button>

            <div className="flex-1 w-full max-w-[1400px] mx-auto px-6 lg:px-12 h-full flex flex-col relative z-10 pt-4">
              {isFuture ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <AlertTriangle
                    size={56}
                    style={{ color: "#f59e0b", marginBottom: 24 }}
                  />
                  <p className="text-4xl font-black font-display text-white tracking-tight mb-4">
                    Future Locked
                  </p>
                  <p className="text-lg text-white/50 max-w-sm">
                    You cannot log executions in the future.
                  </p>
                </div>
              ) : (
                <AgendaEditor
                  dateStr={selectedDate}
                  userData={userData}
                  isToday={selectedDate === today}
                  isPast={selectedDate < today}
                  isDesktopOverlay={true}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Toast */}
      <AnimatePresence>
        {undoState && (
          <UndoToast
            key="undo"
            onUndo={handleUndo}
            onDismiss={() => setUndoState(null)}
            itemDate={fmtShort(undoState.dateStr)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgendaPage;
