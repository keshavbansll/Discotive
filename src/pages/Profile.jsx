/**
 * @fileoverview Discotive OS — Private Command Center v8
 * @description The operator's personal career intelligence dashboard.
 * Redesigned for addiction, density, and professional excellence.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  Activity,
  Award,
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Database,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Flame,
  FolderLock,
  Github,
  Globe,
  Hash,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Twitter,
  Users,
  Youtube,
  Zap,
  ArrowUpRight,
  Sparkles,
  Crosshair,
  Lock,
  Terminal,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtScore = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Vault Strength Score: weighted average of verified asset strengths → 0-100 */
const calcVSS = (vault = []) => {
  const verified = vault.filter((a) => a.status === "VERIFIED");
  if (!verified.length) return 0;
  const pts = verified.reduce((s, a) => {
    if (a.strength === "Strong") return s + 30;
    if (a.strength === "Medium") return s + 20;
    return s + 10; // Weak or null
  }, 0);
  return Math.min(Math.round((pts / (verified.length * 30)) * 100), 100);
};

/** Execution velocity: pts gained last 7d vs prior 7d */
const calcVelocity = (dailyScores = {}) => {
  const today = new Date();
  let last7 = 0,
    prior7 = 0;
  const dates = Object.keys(dailyScores).sort();
  if (dates.length < 2) return { delta: 0, pct: 0 };
  const latestScore = dailyScores[dates[dates.length - 1]] || 0;
  const score7dAgo = (() => {
    const d7 = new Date(today);
    d7.setDate(d7.getDate() - 7);
    const key = toDateStr(d7);
    const older = dates.filter((d) => d <= key);
    return older.length ? dailyScores[older[older.length - 1]] || 0 : 0;
  })();
  const score14dAgo = (() => {
    const d14 = new Date(today);
    d14.setDate(d14.getDate() - 14);
    const key = toDateStr(d14);
    const older = dates.filter((d) => d <= key);
    return older.length ? dailyScores[older[older.length - 1]] || 0 : 0;
  })();
  last7 = latestScore - score7dAgo;
  prior7 = score7dAgo - score14dAgo;
  const pct = prior7 > 0 ? Math.round(((last7 - prior7) / prior7) * 100) : 0;
  return { delta: last7, pct };
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const ScoreTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-[#BFA264]/25 rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none">
      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-lg font-black text-white font-mono">
        {payload[0].value?.toLocaleString()}
      </p>
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  color,
  bg,
  border,
  label,
  value,
  sub,
  onClick,
}) => (
  <motion.div
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      "flex flex-col gap-2 p-4 rounded-2xl border transition-all",
      bg,
      border,
      onClick && "cursor-pointer hover:brightness-110",
    )}
  >
    <div
      className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center",
        bg,
        border,
        "border",
      )}
    >
      <Icon className={cn("w-4 h-4", color)} />
    </div>
    <div>
      <p className={cn("text-2xl font-black font-mono leading-none", color)}>
        {value}
      </p>
      <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mt-1">
        {label}
      </p>
      {sub && <p className="text-[9px] text-white/15 mt-0.5">{sub}</p>}
    </div>
  </motion.div>
);

const SLabel = ({ icon: Icon, iconColor, children }) => (
  <h3 className="text-[9px] font-black text-white/35 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />}
    {children}
  </h3>
);

// ─── Animated Heatmap Pill ────────────────────────────────────────────────────
const HeatPill = ({ active, dateStr }) => {
  const [show, setShow] = useState(false);
  const label = dateStr
    ? new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  return (
    <div
      className="relative flex-1 min-w-0"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <div
        className={cn(
          "w-full h-8 rounded-md border transition-all duration-200",
          active
            ? "bg-[#BFA264] border-[#D4AF78] shadow-[0_0_8px_rgba(191,162,100,0.5)]"
            : "bg-white/[0.03] border-white/[0.04] hover:bg-white/[0.06]",
        )}
      />
      <AnimatePresence>
        {show && dateStr && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none"
          >
            <div className="bg-[#0a0a0a] border border-[#BFA264]/20 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap">
              <p className="text-[9px] font-bold text-[#BFA264]">{label}</p>
              {active && <p className="text-[8px] text-white/30">Active</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Level XP Ring ─────────────────────────────────────────────────────────────
const LevelRing = ({ score, size = 88 }) => {
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const xp = score % 1000;
  const pct = xp / 1000;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#0f0f0f"
          strokeWidth={8}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#BFA264"
          strokeWidth={8}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - pct * circ }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px rgba(191,162,100,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white leading-none">
          {level}
        </span>
        <span className="text-[7px] text-white/30 uppercase tracking-widest">
          LVL
        </span>
      </div>
    </div>
  );
};

// ─── Vault Strength Bar ────────────────────────────────────────────────────────
const VSSBar = ({ score }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
        Vault Strength
      </span>
      <span className="text-[9px] font-black text-[#BFA264] font-mono">
        {score}%
      </span>
    </div>
    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        className="h-full bg-gradient-to-r from-[#8B7240] to-[#D4AF78] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.5)]"
      />
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const { userData, loading, refreshUserData } = useUserData();
  const navigate = useNavigate();

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [chartTf, setChartTf] = useState("1M");
  const [chartData, setChartData] = useState([]);
  const [isChartLoading, setChartLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const GRAD_ID = "profileGrad";

  const showToast = useCallback((msg, type = "green") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(
    () => () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    },
    [],
  );

  // ── Derived values ──────────────────────────────────────────────────────────
  const score = userData?.discotiveScore?.current ?? 0;
  const last24h = userData?.discotiveScore?.last24h ?? score;
  const delta = score - last24h;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const streak = userData?.discotiveScore?.streak ?? 0;
  const vault = useMemo(() => userData?.vault || [], [userData]);
  const allies = userData?.allies || [];
  const views = userData?.profileViews || 0;
  const skills = userData?.skills?.alignedSkills || [];
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const vss = useMemo(() => calcVSS(vault), [vault]);
  const velocity = useMemo(
    () => calcVelocity(userData?.daily_scores || {}),
    [userData],
  );
  const verifiedCount = vault.filter((a) => a.status === "VERIFIED").length;
  const moatPct = vault.length
    ? Math.round((verifiedCount / vault.length) * 100)
    : 0;
  const ptsToNext = 1000 - (score % 1000);

  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "?";

  // ── Chart data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const build = async () => {
      if (!userData?.uid) return;
      setChartLoading(true);
      try {
        const daily = userData.daily_scores || {};
        let src = Object.keys(daily)
          .map((d) => ({ date: d, score: daily[d] }))
          .sort((a, b) => a.date.localeCompare(b.date));
        if (chartTf === "1W") {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          src = src.filter((e) => new Date(e.date) >= cutoff);
        } else if (chartTf === "1M") {
          const cutoff = new Date();
          cutoff.setMonth(cutoff.getMonth() - 1);
          src = src.filter((e) => new Date(e.date) >= cutoff);
        }
        if (src.length < 2) {
          src = [
            {
              date: new Date(Date.now() - 7 * 86400000)
                .toISOString()
                .split("T")[0],
              score: Math.max(0, score - 50),
            },
            { date: new Date().toISOString().split("T")[0], score },
          ];
        }
        setChartData(
          src.map((e) => ({
            day: new Date(e.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            score: e.score,
          })),
        );
      } catch (e) {
        console.error(e);
      } finally {
        setChartLoading(false);
      }
    };
    build();
  }, [userData, chartTf, score]);

  // ── Heatmap ─────────────────────────────────────────────────────────────────
  const activeDates = useMemo(() => {
    const s = new Set();
    (userData?.consistency_log || []).forEach((d) =>
      s.add(String(d).split("T")[0]),
    );
    (userData?.login_history || []).forEach((d) =>
      s.add(String(d).split("T")[0]),
    );
    const last = userData?.discotiveScore?.lastLoginDate;
    if (last) s.add(String(last).split("T")[0]);
    return s;
  }, [userData]);

  const heatmap = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const ms = String(d.getMonth() + 1).padStart(2, "0");
      const ds = String(d.getDate()).padStart(2, "0");
      const str = `${d.getFullYear()}-${ms}-${ds}`;
      return { str, active: activeDates.has(str) };
    });
  }, [viewDate, activeDates]);

  // ── Radar data ──────────────────────────────────────────────────────────────
  const radarData = [
    { metric: "Execution", score: Math.min((score / 5000) * 100, 100) },
    { metric: "Skills", score: Math.min((skills.length / 10) * 100, 100) },
    { metric: "Network", score: Math.min((allies.length / 20) * 100, 100) },
    { metric: "Vault", score: vss },
    { metric: "Reach", score: Math.min((views / 100) * 100, 100) },
  ];

  // ── Vault donut data ────────────────────────────────────────────────────────
  const VAULT_COLORS = {
    Certificate: "#BFA264",
    Resume: "#10b981",
    Project: "#8b5cf6",
    Publication: "#06b6d4",
    Employment: "#f97316",
    Link: "#64748b",
    Other: "#374151",
  };
  const vaultCats = vault.reduce((acc, a) => {
    const c = a.category || "Other";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});
  const vaultSegs = Object.entries(vaultCats).map(([cat, count]) => ({
    label: cat,
    value: count,
    color: VAULT_COLORS[cat] || "#444",
  }));

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image exceeds 2MB limit.", "red");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const uid = auth.currentUser.uid;
      const fileRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "users", uid), { "identity.avatarUrl": url });
      await refreshUserData?.();
      showToast("Avatar updated.", "green");
    } catch {
      showToast("Upload failed.", "red");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = null;
    }
  };

  // ── Export DCI ─────────────────────────────────────────────────────────────
  const handleExportDCI = async () => {
    setIsExporting(true);
    showToast("Compiling DCI...", "default");
    try {
      const [{ pdf }, { DCIExportTemplate }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../components/DCIExportTemplate"),
      ]);
      const el = React.createElement(DCIExportTemplate, {
        data: {
          firstName: userData.identity?.firstName || "Operator",
          lastName: userData.identity?.lastName || "",
          email: userData.email || auth.currentUser?.email || "",
          domain: userData.identity?.domain || userData.vision?.passion || "—",
          niche: userData.identity?.niche || "—",
          rank: null,
          score,
          goal: userData.vision?.goal3Months || "",
          endgame: userData.vision?.endgame || "",
          institution: userData.baseline?.institution || "",
          degree: userData.baseline?.degree || "",
          major: userData.baseline?.major || "",
          gradYear: userData.baseline?.gradYear || "",
          streak,
        },
        level,
        skills,
        assetsCount: vault.length,
        alliesCount: allies.length,
      });
      const blob = await pdf(el).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${userData.identity?.firstName || "Operator"}_DCI.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("DCI exported.", "green");
    } catch (err) {
      console.error(err);
      showToast("Export failed.", "red");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://discotive.in/@${userData?.identity?.username || ""}`,
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast("Profile link copied!", "green");
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12 }}
              className="w-1 h-6 bg-[#BFA264] rounded-full origin-bottom"
            />
          ))}
        </div>
      </div>
    );
  }

  const LINKS = [
    { key: "github", label: "GitHub", icon: Github, color: "#fff" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0a66c2" },
    { key: "twitter", label: "X", icon: Twitter, color: "#1da1f2" },
    { key: "youtube", label: "YouTube", icon: Youtube, color: "#ff0000" },
    { key: "instagram", label: "Instagram", icon: Instagram, color: "#e1306c" },
    { key: "website", label: "Site", icon: Globe, color: "#888" },
  ];
  const activeLinks = LINKS.filter((l) => userData?.links?.[l.key]);

  const chartMin = chartData.length
    ? Math.max(0, Math.min(...chartData.map((d) => d.score)) - 30)
    : 0;

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-[#BFA264]/25 pb-28 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.025] pointer-events-none z-0" />

      <div className="max-w-[1520px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10 space-y-4">
        {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.3em] mb-1">
              Private Command Center
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Career Index
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportDCI}
              disabled={isExporting}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                isExporting
                  ? "bg-[#0a0a0a] border-[#1a1a1a] text-white/30 cursor-not-allowed"
                  : "bg-[#BFA264]/8 border-[#BFA264]/25 text-[#BFA264] hover:bg-[#BFA264]/15",
              )}
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderLock className="w-3.5 h-3.5" />
              )}
              {isExporting ? "Compiling…" : "Export DCI"}
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] rounded-xl text-[10px] font-black text-[#666] hover:text-white transition-all uppercase tracking-widest"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {copiedLink ? "Copied!" : "Share"}
            </button>
            <Link
              to="/app/profile/edit"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#ddd] transition-colors uppercase tracking-widest"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
          </div>
        </div>

        {/* ── HERO IDENTITY CARD ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-7 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#BFA264]/[0.04] to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#BFA264] opacity-[0.03] blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {/* Avatar upload */}
            <div className="relative shrink-0 group">
              <label
                className={cn(
                  "relative flex w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-[#111] border items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden cursor-pointer transition-all",
                  isUploadingAvatar
                    ? "opacity-50 pointer-events-none border-[#222]"
                    : "border-[#222] hover:border-[#BFA264]/50 hover:shadow-[0_0_20px_rgba(191,162,100,0.15)]",
                )}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
                {userData.identity?.avatarUrl ? (
                  <img
                    src={userData.identity.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-[#BFA264] animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </label>
              {isPro && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#030303] flex items-center justify-center z-10 pointer-events-none">
                  <Crown className="w-3 h-3 text-black" />
                </div>
              )}
            </div>

            {/* Identity text */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  {userData.identity?.firstName} {userData.identity?.lastName}
                </h2>
                <span className="px-2.5 py-1 bg-[#111] border border-[#222] rounded-lg text-[10px] font-mono text-[#666]">
                  @{userData.identity?.username || "—"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <p className="text-sm text-[#666] mb-2.5">
                {userData.identity?.domain ||
                  userData.vision?.passion ||
                  "Undeclared Domain"}
                {(userData.identity?.niche || userData.vision?.niche) && (
                  <span className="text-[#444]">
                    {" "}
                    · {userData.identity?.niche || userData.vision?.niche}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">
                {(userData.footprint?.location ||
                  userData.identity?.country) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {userData.footprint?.location || userData.identity?.country}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-[#BFA264]/60" />
                  Level {level}
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-violet-400/50" />#
                  {userData.discotiveId || "—"}
                </span>
              </div>
              {/* XP bar */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 max-w-[220px] h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((score % 1000) / 1000) * 100}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#8B7240] to-[#D4AF78] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.5)]"
                  />
                </div>
                <span className="text-[9px] text-[#444] font-mono">
                  {(score % 1000).toLocaleString()} / 1000 → Lv{" "}
                  {Math.min(level + 1, 10)}
                </span>
              </div>
            </div>

            {/* Right: Level ring + quick actions */}
            <div className="hidden md:flex flex-col items-end gap-3 shrink-0">
              <LevelRing score={score} />
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-[8px] text-white/20 uppercase tracking-widest">
                    Next Level
                  </p>
                  <p className="text-xs font-black text-[#BFA264]/70 font-mono">
                    +{ptsToNext.toLocaleString()} pts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard
            icon={Zap}
            color="text-[#BFA264]"
            bg="bg-[#BFA264]/10"
            border="border-[#BFA264]/15"
            label="Score"
            value={fmtScore(score)}
            sub={
              delta > 0
                ? `+${delta} today`
                : delta < 0
                  ? `${delta} today`
                  : "No change"
            }
          />
          <StatCard
            icon={Award}
            color="text-[#BFA264]"
            bg="bg-[#BFA264]/10"
            border="border-[#BFA264]/15"
            label="Level"
            value={`Lv ${level}`}
            sub={`${ptsToNext.toLocaleString()} to next`}
          />
          <StatCard
            icon={Flame}
            color="text-orange-400"
            bg="bg-orange-500/10"
            border="border-orange-500/15"
            label="Streak"
            value={`${streak}d`}
            sub={streak >= 7 ? "🔥 On fire" : "Keep going"}
          />
          <StatCard
            icon={FolderLock}
            color="text-emerald-400"
            bg="bg-emerald-500/10"
            border="border-emerald-500/15"
            label="Vault"
            value={vault.length}
            sub={`${verifiedCount} verified`}
            onClick={() => navigate("/app/vault")}
          />
          <StatCard
            icon={Users}
            color="text-violet-400"
            bg="bg-violet-500/10"
            border="border-violet-500/15"
            label="Allies"
            value={allies.length}
            sub="Network size"
            onClick={() => navigate("/app/network")}
          />
          <StatCard
            icon={Eye}
            color="text-sky-400"
            bg="bg-sky-500/10"
            border="border-sky-500/15"
            label="Views"
            value={views}
            sub="Total impressions"
          />
        </div>

        {/* ── VELOCITY BANNER ─────────────────────────────────────────────── */}
        {velocity.delta !== 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl border",
              velocity.delta > 0
                ? "bg-emerald-500/[0.05] border-emerald-500/20"
                : "bg-rose-500/[0.05] border-rose-500/20",
            )}
          >
            {velocity.delta > 0 ? (
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <p
                className={cn(
                  "text-sm font-black",
                  velocity.delta > 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {velocity.delta > 0 ? "+" : ""}
                {velocity.delta.toLocaleString()} pts this week
                {velocity.pct !== 0 && (
                  <span className="ml-2 text-[10px] font-mono opacity-70">
                    ({velocity.pct > 0 ? "+" : ""}
                    {velocity.pct}% vs last week)
                  </span>
                )}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">
                Execution velocity — keep the momentum going.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* SCORE TELEMETRY — xl:8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-1 md:col-span-2 xl:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col relative overflow-hidden min-h-[280px]"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <SLabel icon={Activity} iconColor="text-[#BFA264]">
                  Score Trajectory
                </SLabel>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter leading-none">
                    {score.toLocaleString()}
                  </span>
                  {delta !== 0 && (
                    <div
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono mb-1 border",
                        delta > 0
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400",
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {delta > 0 ? `+${delta}` : delta} today
                    </div>
                  )}
                </div>
              </div>
              <div className="flex bg-[#050505] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
                {["1W", "1M", "ALL"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartTf(t)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                      chartTf === t
                        ? "bg-[#BFA264]/15 text-[#BFA264]"
                        : "text-white/25 hover:text-white/60",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-[140px]">
              {isChartLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-[#BFA264]/30 animate-spin" />
                </div>
              ) : chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={140}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: -32, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#BFA264"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#BFA264"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke="rgba(255,255,255,0.03)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      hide={chartData.length > 14}
                      tick={{
                        fill: "rgba(255,255,255,0.2)",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                      axisLine={false}
                      tickLine={false}
                      dy={6}
                    />
                    <YAxis domain={[chartMin, "auto"]} hide />
                    <ReTooltip
                      content={<ScoreTooltip />}
                      cursor={{
                        stroke: "rgba(191,162,100,0.2)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#BFA264"
                      strokeWidth={2.5}
                      fill={`url(#${GRAD_ID})`}
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: "#BFA264",
                        stroke: "#000",
                        strokeWidth: 2,
                      }}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] text-white/20">
                  No history yet — start executing.
                </div>
              )}
            </div>
          </motion.div>

          {/* OPERATOR RADAR — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col"
          >
            <SLabel icon={Target} iconColor="text-[#BFA264]">
              Operator Radar
            </SLabel>
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={180}>
                <RadarChart data={radarData}>
                  <PolarGrid
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.5}
                  />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{
                      fill: "rgba(255,255,255,0.3)",
                      fontSize: 9,
                      fontWeight: 700,
                    }}
                  />
                  <Radar
                    dataKey="score"
                    stroke="#BFA264"
                    strokeWidth={2}
                    fill="#BFA264"
                    fillOpacity={0.15}
                    dot={{ r: 2.5, fill: "#BFA264", strokeWidth: 0 }}
                    animationDuration={800}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 pt-3 border-t border-white/[0.04] mt-2">
              {radarData.map((d) => (
                <div key={d.metric} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/25 font-bold w-16 shrink-0 uppercase tracking-widest">
                    {d.metric}
                  </span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.score}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-[#BFA264]/60 rounded-full"
                    />
                  </div>
                  <span className="text-[9px] font-black font-mono text-white/30 w-7 text-right">
                    {Math.round(d.score)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* VAULT INTELLIGENCE — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col"
          >
            <SLabel icon={FolderLock} iconColor="text-emerald-400">
              Vault Intelligence
            </SLabel>
            {vault.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
                <FolderLock className="w-8 h-8 text-white/10 mb-1" />
                <p className="text-[10px] text-white/20">
                  No assets. Add credentials.
                </p>
                <Link
                  to="/app/vault"
                  className="text-[9px] font-black text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                >
                  Open Vault →
                </Link>
              </div>
            ) : (
              <div className="flex-1 space-y-4">
                <VSSBar score={vss} />
                {/* Moat bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                      Verified Moat
                    </span>
                    <span className="text-[9px] font-black text-emerald-400 font-mono">
                      {moatPct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${moatPct}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                      className="h-full bg-emerald-500/60 rounded-full"
                    />
                  </div>
                </div>
                {/* Category breakdown */}
                <div className="space-y-1.5">
                  {vaultSegs.slice(0, 5).map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-sm"
                          style={{ background: seg.color }}
                        />
                        <span className="text-[10px] text-white/35 font-bold">
                          {seg.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-black font-mono text-white/40">
                        {seg.value}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/app/vault"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl text-[9px] font-black text-emerald-400 hover:bg-emerald-500/15 transition-all uppercase tracking-widest"
                >
                  Manage Vault <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </motion.div>

          {/* SKILLS — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <SLabel icon={Zap} iconColor="text-[#BFA264]">
              Skill Stack
            </SLabel>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] hover:border-[#BFA264]/25 rounded-xl text-[11px] font-bold text-[#ccc] cursor-default transition-colors"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                <Zap className="w-7 h-7 text-white/10" />
                <p className="text-[10px] text-white/20">
                  No skills. Add them in Profile Editor.
                </p>
                <Link
                  to="/app/profile/edit"
                  className="text-[9px] font-black text-[#BFA264]/50 hover:text-[#BFA264] transition-colors"
                >
                  Edit Profile →
                </Link>
              </div>
            )}
          </motion.div>

          {/* CONSISTENCY HEATMAP — xl:8 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 md:col-span-2 xl:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <SLabel icon={Flame} iconColor="text-orange-400">
                Consistency Engine
              </SLabel>
              <span className="text-2xl font-black text-white font-mono leading-none">
                {streak}
                <span className="text-sm text-white/25 font-sans ml-1">
                  days
                </span>
              </span>
            </div>
            {/* Month nav */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() =>
                  setViewDate(
                    (p) => new Date(p.getFullYear(), p.getMonth() - 1, 1),
                  )
                }
                className="w-6 h-6 bg-white/[0.03] border border-white/[0.05] rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 w-24 text-center select-none">
                {viewDate.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={() =>
                  setViewDate(
                    (p) => new Date(p.getFullYear(), p.getMonth() + 1, 1),
                  )
                }
                disabled={
                  viewDate.getMonth() === new Date().getMonth() &&
                  viewDate.getFullYear() === new Date().getFullYear()
                }
                className="w-6 h-6 bg-white/[0.03] border border-white/[0.05] rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1 h-8">
              {heatmap.map((day, i) => (
                <HeatPill key={i} active={day.active} dateStr={day.str} />
              ))}
            </div>
            {/* Streak milestones */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.04]">
              {[
                { target: 7, icon: "⚡", label: "7-Day Lock", color: "amber" },
                {
                  target: 14,
                  icon: "🔥",
                  label: "14-Day Blaze",
                  color: "orange",
                },
                { target: 30, icon: "💎", label: "30-Day Elite", color: "sky" },
              ].map(({ target, icon, label, color }) => {
                const hit = streak >= target;
                return (
                  <div
                    key={target}
                    className={cn(
                      "flex flex-col items-center p-2.5 rounded-xl border text-center",
                      hit
                        ? color === "amber"
                          ? "bg-[#BFA264]/10 border-[#BFA264]/25"
                          : color === "orange"
                            ? "bg-orange-500/10 border-orange-500/25"
                            : "bg-sky-500/10 border-sky-500/25"
                        : "bg-white/[0.02] border-white/[0.04]",
                    )}
                  >
                    <span className="text-lg mb-1">{hit ? icon : "🔒"}</span>
                    <span
                      className={cn(
                        "text-[8px] font-black uppercase tracking-widest",
                        hit
                          ? color === "amber"
                            ? "text-[#BFA264]"
                            : color === "orange"
                              ? "text-orange-400"
                              : "text-sky-400"
                          : "text-white/15",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* BIO + ACADEMIC — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="col-span-1 xl:col-span-4 space-y-4"
          >
            {/* Bio */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5">
              <SLabel icon={Terminal} iconColor="text-white/35">
                Bio
              </SLabel>
              <p className="text-sm text-[#777] leading-relaxed">
                {userData.footprint?.bio || (
                  <span className="text-[#333] italic">
                    No biography. Add one in Profile Editor.
                  </span>
                )}
              </p>
            </div>
            {/* Academic */}
            {userData.baseline?.institution && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5">
                <SLabel icon={BookOpen} iconColor="text-sky-400">
                  Academic
                </SLabel>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {userData.baseline.institution}
                    </p>
                    <p className="text-[10px] text-[#666] mt-0.5">
                      {userData.baseline.degree || ""}
                      {userData.baseline.major
                        ? ` · ${userData.baseline.major}`
                        : ""}
                    </p>
                    {userData.baseline.gradYear && (
                      <p className="text-[9px] font-black text-[#BFA264]/50 uppercase tracking-widest mt-1.5">
                        Class of {userData.baseline.gradYear}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* DIGITAL FOOTPRINT — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <SLabel icon={Crosshair} iconColor="text-sky-400">
              Digital Footprint
            </SLabel>
            <div className="space-y-2">
              {LINKS.map(({ key, label, icon: Icon, color }) => {
                const val = userData.links?.[key] || "";
                return (
                  <a
                    key={key}
                    href={val || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      val
                        ? "bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#2a2a2a] cursor-pointer group"
                        : "bg-transparent border-[#0a0a0a] opacity-30 pointer-events-none",
                    )}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color: val ? color : "#333" }}
                    />
                    <span className="text-xs font-bold text-[#777] group-hover:text-white transition-colors flex-1">
                      {val ? label : `${label} not linked`}
                    </span>
                    {val && (
                      <ExternalLink className="w-3 h-3 text-[#333] group-hover:text-[#666] transition-colors shrink-0" />
                    )}
                  </a>
                );
              })}
              <Link
                to="/app/settings?tab=connectors"
                className="flex items-center justify-center gap-1.5 py-2 text-[9px] font-black text-sky-400/40 hover:text-sky-400 transition-colors uppercase tracking-widest"
              >
                Manage Connectors <ArrowUpRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </motion.div>

          {/* VISION — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <SLabel icon={Sparkles} iconColor="text-violet-400">
              Vision & Trajectory
            </SLabel>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">
                  90-Day Target
                </p>
                <p className="text-sm text-[#888] leading-relaxed">
                  {userData.vision?.goal3Months || (
                    <span className="text-[#333] italic">No target set.</span>
                  )}
                </p>
              </div>
              {userData.vision?.endgame && (
                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">
                    Macro Endgame
                  </p>
                  <p className="text-xs text-[#555] leading-relaxed">
                    {userData.vision.endgame}
                  </p>
                </div>
              )}
              <Link
                to="/app/profile/edit"
                className="flex items-center gap-1.5 text-[9px] font-black text-violet-400/50 hover:text-violet-400 transition-colors uppercase tracking-widest"
              >
                Edit Vision <ArrowUpRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </motion.div>

          {/* PUBLIC PROFILE CTA — xl:12 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="col-span-1 md:col-span-2 xl:col-span-12 bg-gradient-to-r from-[#BFA264]/[0.07] via-[#0a0a0a] to-[#0a0a0a] border border-[#BFA264]/20 rounded-[2rem] p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-48 h-full bg-gradient-to-r from-[#BFA264]/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-1">
                Your Live Resume
              </p>
              <h3 className="text-lg font-black text-white">Public Profile</h3>
              <p className="text-xs text-[#555] mt-1">
                discotive.in/@
                <span className="text-[#BFA264]/70">
                  {userData.identity?.username || "handle"}
                </span>{" "}
                — visible to recruiters worldwide.
              </p>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] text-[10px] font-black text-[#888] rounded-xl hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                Copy Link
              </button>
              <Link
                to={`/@${userData.identity?.username || ""}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#ddd] transition-colors uppercase tracking-widest"
              >
                View Public Profile <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: -16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={cn(
              "fixed bottom-6 left-4 md:left-8 z-[600] border px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest",
              toast.type === "green"
                ? "bg-[#052e16] border-emerald-500/30 text-emerald-400"
                : toast.type === "red"
                  ? "bg-[#1a0505] border-rose-500/30 text-rose-400"
                  : "bg-[#0a0a0a] border-[#222] text-[#888]",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
