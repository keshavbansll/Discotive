/**
 * @fileoverview Discotive OS — Personal Profile (Career Command View)
 * @module Profile
 * @description
 * The operator's private career dashboard — every data point, visual, and
 * metric compiled into a single career-summary view.
 *
 * Features:
 *  - SVG Radar chart (5 axes: Execution, Skills, Network, Vault, Reach)
 *  - SVG Score sparkline (last 30 mutations)
 *  - SVG Vault category donut chart
 *  - Bio, academic baseline, vision/goals
 *  - Digital footprint links with live connected state
 *  - Streak heatmap (28-day)
 *  - Alliance network count + journal entries count
 *  - Share public profile link
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import { db, auth, storage } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  MapPin,
  Terminal,
  Briefcase,
  Copy,
  ExternalLink,
  Award,
  Activity,
  Edit3,
  Check,
  GraduationCap,
  Link2,
  Github,
  Twitter,
  Linkedin,
  ShieldCheck,
  FolderLock,
  Users,
  Globe,
  Zap,
  Eye,
  Flame,
  BookOpen,
  Target,
  ArrowUpRight,
  Share2,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Youtube,
  Instagram,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Camera,
  Loader2,
} from "lucide-react";

// ─── Radar chart ──────────────────────────────────────────────────────────────
const RadarChart = ({ data, labels, colors }) => {
  const N = data.length;
  const cx = 50;
  const cy = 50;
  const maxR = 38;
  const gridLevels = [0.25, 0.5, 0.75, 1];

  const toXY = (val, i, r = maxR) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
    };
  };

  const gridPts = (level) =>
    Array.from({ length: N }, (_, i) => toXY(level, i))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");

  const dataPoints = data.map((v, i) => toXY(Math.min(v / 100, 1), i));
  const polyPts = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const labelPos = labels.map((_, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    const r = maxR + 10;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      style={{ overflow: "visible" }}
    >
      {/* Grid rings */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={gridPts(level)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.4"
        />
      ))}
      {/* Axis lines */}
      {Array.from({ length: N }, (_, i) => {
        const p = toXY(1, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.4"
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={polyPts}
        fill="rgba(245,158,11,0.15)"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill="#f59e0b"
          stroke="#000"
          strokeWidth="1"
        />
      ))}
      {/* Labels */}
      {labels.map((label, i) => (
        <text
          key={i}
          x={labelPos[i].x}
          y={labelPos[i].y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="4"
          fontWeight="700"
          fontFamily="system-ui"
          style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          {label}
        </text>
      ))}
    </svg>
  );
};

// ─── Donut chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ segments, size = 120 }) => {
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  const arcs = segments.reduce((acc, seg, index) => {
    const dash = (seg.value / total) * circumference;
    const offset =
      index === 0 ? 0 : acc[index - 1].offset + acc[index - 1].dash;

    acc.push({ color: seg.color, dash, offset });
    return acc;
  }, []);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="transform -rotate-90"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#0f0f0f"
        strokeWidth="18"
      />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth="18"
          strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
          strokeDashoffset={-arc.offset}
        />
      ))}
      <circle cx={cx} cy={cy} r={r - 12} fill="#030303" />
    </svg>
  );
};

// ─── Score mini-sparkline ─────────────────────────────────────────────────────
const Sparkline = ({
  history,
  color = "#f59e0b",
  width = 200,
  height = 50,
}) => {
  if (!history || history.length < 2) return null;
  const vals = history.map((h) => h.score);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = history
    .map((h, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((h.score - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─── Stat badge ───────────────────────────────────────────────────────────────
const StatBadge = ({ icon: Icon, iconColor, label, value, bg, border }) => (
  <div className={cn("flex flex-col gap-2 p-4 rounded-2xl border", bg, border)}>
    <div
      className={cn("w-8 h-8 rounded-xl flex items-center justify-center", bg)}
    >
      <Icon className={cn("w-4 h-4", iconColor)} />
    </div>
    <div>
      <p className={cn("text-2xl font-black font-mono", iconColor)}>{value}</p>
      <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
        {label}
      </p>
    </div>
  </div>
);

// ─── Section label ────────────────────────────────────────────────────────────
const SLabel = ({ icon: Icon, iconColor, children }) => (
  <h3 className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2 mb-4">
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", iconColor)} />}
    {children}
  </h3>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Profile = () => {
  const { userData, loading } = useUserData();
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // ── Avatar Upload Engine ─────────────────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 2MB Limit Enforcement
    if (file.size > 2 * 1024 * 1024) {
      showToast("Transmission rejected. Image exceeds 2MB limit.", "red");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uid = auth.currentUser.uid;
      // Isolate cache by appending timestamp to filename
      const fileRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`);

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Mutate the Global Ledger
      await updateDoc(doc(db, "users", uid), {
        "identity.avatarUrl": url,
      });

      showToast("Operator identity updated.", "green");
    } catch (err) {
      console.error("[Avatar Upload Error]:", err);
      showToast("Identity transmission failed.", "red");
    } finally {
      setIsUploadingAvatar(false);
      // Clear the input so the same file can be selected again if needed
      e.target.value = null;
    }
  };

  // ── Month Navigation State ───────────────────────────────────────────────
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const handlePrevMonth = React.useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = React.useCallback(() => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const activeDates = useMemo(() => {
    const s = new Set();
    if (!userData) return s;

    // Aggregate from all valid chronological sources
    (userData.journal_ledger || []).forEach(
      (e) => e?.date && s.add(e.date.split("T")[0]),
    );
    (userData.consistency_log || []).forEach((d) => s.add(d));
    Object.keys(userData.daily_scores || {}).forEach((d) => s.add(d));

    const last = userData.discotiveScore?.lastLoginDate;
    if (last) s.add(last.split("T")[0]);

    return s;
  }, [userData]);

  const history = useMemo(() => {
    if (!userData) return [];

    const daily = userData.daily_scores || {};
    let mapped = Object.keys(daily).map((date) => ({
      date,
      score: daily[date],
    }));

    // Fallback to legacy array only if the new map hasn't populated enough points yet
    if (mapped.length < 2) {
      mapped = (userData.score_history || []).filter(
        (e) => e?.date && typeof e.score === "number",
      );
    }

    return mapped
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);
  }, [userData]);

  const showToast = (msg, type = "green") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setToast({ msg, type });

    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // ── Dynamic Heatmap ─────────────────────────────────────────────────────
  const heatmap = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const monthStr = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const str = `${d.getFullYear()}-${monthStr}-${dayStr}`;

      return { str, active: activeDates.has(str) };
    });
  }, [viewDate, activeDates]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportDCI = async () => {
    try {
      setIsExporting(true);
      showToast("Initializing DCI Export...", "green"); // Give immediate UI feedback

      // 1. Dynamically import the heavy PDF renderer ONLY when clicked
      const { pdf } = await import("@react-pdf/renderer");

      // 2. Dynamically import your specific template
      // Ensure the path is correct based on your folder structure
      const { DCIExportTemplate } =
        await import("../components/DCIExportTemplate");

      // 3. Construct the document with the flattened data schema
      const pdfDocument = (
        <DCIExportTemplate
          data={{
            firstName: userData.identity?.firstName || "Operator",
            lastName: userData.identity?.lastName || "",
            username: userData.identity?.username || "",
            email: userData.email || "",
            domain:
              userData.identity?.domain ||
              userData.vision?.passion ||
              "Undeclared",
            niche: userData.identity?.niche || userData.vision?.niche || "—",
            rank: userData.rank || null,
            score: score,
            goal: userData.vision?.goal3Months || "",
            endgame: userData.vision?.endgame || "",
            institution: userData.baseline?.institution || "",
            degree: userData.baseline?.degree || "",
            major: userData.baseline?.major || "",
            gradYear: userData.baseline?.gradYear || "",
            streak: streak,
          }}
          level={level}
          skills={skills}
          assetsCount={vault.length}
          alliesCount={allies.length}
        />
      );

      // 4. Generate the blob
      const blob = await pdf(pdfDocument).toBlob();

      // 5. Trigger the native browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${userData.identity?.firstName || "Operator"}_DCI_Profile.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("DCI Export Complete", "green");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showToast("Export failed. Please try again.", "red");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPublicLink = () => {
    const url = `https://discotive.in/@${userData?.identity?.username || ""}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    showToast("Public profile link copied!", "green");
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#444] animate-spin" />
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────
  const score = userData.discotiveScore?.current ?? 0;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const levelPct = (score % 1000) / 10;
  const streak = userData.discotiveScore?.streak ?? 0;
  const last24h = userData.discotiveScore?.last24h ?? score;
  const delta = score - last24h;
  const vault = userData.vault || [];
  const allies = userData.allies || [];
  const views = userData.profileViews || 0;
  const skills = userData.skills?.alignedSkills || [];
  const journals = userData.journal_ledger || [];

  const initials =
    `${userData.identity?.firstName?.charAt(0) || ""}${userData.identity?.lastName?.charAt(0) || ""}`.toUpperCase();

  // ── Radar data ──────────────────────────────────────────────────────────
  const radarData = [
    Math.min((score / 5000) * 100, 100),
    Math.min((skills.length / 10) * 100, 100),
    Math.min((allies.length / 20) * 100, 100),
    Math.min((vault.length / 10) * 100, 100),
    Math.min((views / 100) * 100, 100),
  ];
  const radarLabels = ["Execution", "Skills", "Network", "Vault", "Reach"];

  // ── Vault donut data ────────────────────────────────────────────────────
  const VAULT_COLORS = {
    Certificate: "#f59e0b",
    Resume: "#10b981",
    Project: "#8b5cf6",
    Publication: "#06b6d4",
    Employment: "#f97316",
    Link: "#64748b",
    Other: "#374151",
  };
  const vaultCats = vault.reduce((acc, item) => {
    const cat = item.category || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const vaultSegments = Object.entries(vaultCats).map(([cat, count]) => ({
    label: cat,
    value: count,
    color: VAULT_COLORS[cat] || "#444",
  }));

  // ── Links ───────────────────────────────────────────────────────────────
  const LINK_DEFS = [
    { key: "github", label: "GitHub", icon: Github, color: "#fff" },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0a66c2" },
    { key: "twitter", label: "X/Twitter", icon: Twitter, color: "#1da1f2" },
    { key: "youtube", label: "YouTube", icon: Youtube, color: "#ff0000" },
    { key: "instagram", label: "Instagram", icon: Instagram, color: "#e1306c" },
    { key: "website", label: "Website", icon: Globe, color: "#888" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white/20 pb-28 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

      <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-6 md:py-8 relative z-10 space-y-4">
        {/* ── Header controls ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] mb-1">
              Operator File
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Career Profile
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* NEW EXPORT BUTTON */}
            <button
              onClick={handleExportDCI}
              disabled={isExporting}
              className={cn(
                "flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest",
                isExporting
                  ? "opacity-50 cursor-not-allowed text-white/40"
                  : "text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/10",
              )}
            >
              {isExporting ? (
                <Activity className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderLock className="w-3.5 h-3.5" />
              )}
              {isExporting ? "Compiling..." : "Export DCI"}
            </button>

            <button
              onClick={handleCopyPublicLink}
              className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] rounded-xl text-[10px] font-bold text-[#666] hover:text-white transition-all"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {copiedLink ? "Copied!" : "Share Profile"}
            </button>

            <Link
              to="/app/profile/edit"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#ddd] transition-colors uppercase tracking-widest"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </Link>
          </div>
        </div>

        {/* ── Hero identity card ───────────────────────────────────────── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-7 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500 opacity-[0.04] blur-3xl rounded-full pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-7 relative z-10">
            {/* Operator Avatar (Interactive) */}
            <div className="relative shrink-0 group">
              <label
                className={cn(
                  "relative flex w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-[#111] border border-[#222] items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden cursor-pointer transition-all duration-300",
                  isUploadingAvatar
                    ? "opacity-50 pointer-events-none"
                    : "hover:border-[#BFA264] hover:shadow-[0_0_20px_rgba(191,162,100,0.15)]",
                )}
              >
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />

                {userData.identity?.avatarUrl ? (
                  <img
                    src={userData.identity.avatarUrl}
                    alt="Operator"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}

                {/* Tactical Hover Overlay */}
                <div className="absolute inset-0 bg-[#030303]/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 backdrop-blur-sm">
                  {isUploadingAvatar ? (
                    <Loader2 className="w-6 h-6 text-[#BFA264] animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-[#F5F0E8]" />
                  )}
                </div>
              </label>

              {userData?.tier === "PRO" && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#030303] flex items-center justify-center shadow-lg pointer-events-none z-10">
                  <Crown className="w-3 h-3 text-[#030303]" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-black tracking-tight">
                  {userData.identity?.firstName} {userData.identity?.lastName}
                </h2>
                <span className="px-2.5 py-1 bg-[#111] border border-[#222] rounded-lg text-[10px] font-mono text-[#666]">
                  @{userData.identity?.username || "—"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  <ShieldCheck className="w-2.5 h-2.5" /> Verified
                </span>
              </div>
              <p className="text-sm text-[#666] font-medium mb-3">
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

              {/* Meta tags */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[#555]">
                {(userData.footprint?.location ||
                  userData.identity?.country) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />{" "}
                    {userData.footprint?.location || userData.identity?.country}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Star className="w-3 h-3 text-amber-500/60" /> Level {level}{" "}
                  Operator
                </span>
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-violet-400/60" /> #
                  {userData.discotiveId || "—"}
                </span>
              </div>

              {/* Level progress */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 max-w-[200px] h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  />
                </div>
                <span className="text-[9px] text-[#444] font-mono">
                  {score % 1000} / 1000 to Lv {Math.min(level + 1, 10)}
                </span>
              </div>
            </div>

            {/* Discotive ID */}
            <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                Discotive ID
              </p>
              <p className="text-lg font-black font-mono text-white/60 tracking-[0.2em]">
                #{userData.discotiveId || "——"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatBadge
            icon={Zap}
            iconColor="text-amber-400"
            label="Score"
            value={score.toLocaleString()}
            bg="bg-amber-500/10"
            border="border-amber-500/15"
          />
          <StatBadge
            icon={Award}
            iconColor="text-amber-400"
            label="Level"
            value={`Lv ${level}`}
            bg="bg-amber-500/10"
            border="border-amber-500/15"
          />
          <StatBadge
            icon={Flame}
            iconColor="text-orange-400"
            label="Streak"
            value={`${streak}d`}
            bg="bg-orange-500/10"
            border="border-orange-500/15"
          />
          <StatBadge
            icon={FolderLock}
            iconColor="text-emerald-400"
            label="Vault"
            value={vault.length}
            bg="bg-emerald-500/10"
            border="border-emerald-500/15"
          />
          <StatBadge
            icon={Users}
            iconColor="text-violet-400"
            label="Allies"
            value={allies.length}
            bg="bg-violet-500/10"
            border="border-violet-500/15"
          />
          <StatBadge
            icon={Eye}
            iconColor="text-sky-400"
            label="Views"
            value={views}
            bg="bg-sky-500/10"
            border="border-sky-500/15"
          />
        </div>

        {/* ── Main bento grid ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* Radar chart — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col">
            <SLabel icon={Target} iconColor="text-amber-400">
              Operator Radar
            </SLabel>
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-[220px] aspect-square mx-auto">
                <RadarChart data={radarData} labels={radarLabels} />
              </div>
              {/* Legend */}
              <div className="grid grid-cols-1 gap-1.5 w-full">
                {radarLabels.map((label, i) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[9px] text-[#555] font-bold uppercase tracking-widest">
                      {label}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500/60 rounded-full"
                          style={{ width: `${radarData[i]}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-black font-mono text-white/40 w-8 text-right">
                        {Math.round(radarData[i])}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Score sparkline + delta — xl:col-span-5 */}
          <div className="md:col-span-1 xl:col-span-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col">
            <SLabel icon={Activity} iconColor="text-amber-400">
              Score Trajectory
            </SLabel>
            <div className="flex items-end gap-4 mb-4">
              <span className="text-4xl font-black text-white font-mono">
                {score.toLocaleString()}
              </span>
              {delta !== 0 && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black mb-1 border",
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
            <div className="flex-1 min-h-[80px]">
              {history.length >= 2 ? (
                <Sparkline history={history} height={80} />
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-white/20">
                  No history yet — start executing tasks.
                </div>
              )}
            </div>
            {/* Recent mutations */}
            {history.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-1">
                {history
                  .slice(-3)
                  .reverse()
                  .map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-[10px]"
                    >
                      <span className="text-white/20 font-mono">
                        {new Date(e.date).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="font-black text-white/50">
                        {e.score.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Vault donut — xl:col-span-3 */}
          <div className="md:col-span-2 xl:col-span-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col">
            <SLabel icon={FolderLock} iconColor="text-emerald-400">
              Vault Breakdown
            </SLabel>
            {vault.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center py-4">
                <FolderLock className="w-8 h-8 text-white/10" />
                <p className="text-[10px] text-white/20">
                  No vault assets. Add credentials to build your proof-of-work.
                </p>
                <Link
                  to="/app/vault"
                  className="text-[9px] font-black text-emerald-400/60 hover:text-emerald-400 transition-colors uppercase tracking-widest"
                >
                  Open Vault →
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <DonutChart
                    segments={
                      vaultSegments.length > 0
                        ? vaultSegments
                        : [{ value: 1, color: "#1a1a1a" }]
                    }
                    size={110}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-xl font-black text-white font-mono">
                        {vault.length}
                      </p>
                      <p className="text-[7px] text-white/20 uppercase tracking-widest">
                        Assets
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-full space-y-1.5">
                  {vaultSegments.map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ background: seg.color }}
                        />
                        <span className="text-[9px] text-white/40 font-bold">
                          {seg.label}
                        </span>
                      </div>
                      <span className="text-[9px] font-black font-mono text-white/50">
                        {seg.value}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/app/vault"
                  className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 uppercase tracking-widest text-center hover:bg-emerald-500/20 transition-colors"
                >
                  Manage Vault
                </Link>
              </div>
            )}
          </div>

          {/* Bio + skills — xl:col-span-8 */}
          <div className="md:col-span-2 xl:col-span-8 space-y-4">
            {/* Bio */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
              <SLabel icon={Terminal} iconColor="text-white/40">
                Operator Bio
              </SLabel>
              <p className="text-sm text-[#888] leading-relaxed">
                {userData.footprint?.bio || (
                  <span className="text-[#444] italic">
                    No biography. Add one in Profile Editor.
                  </span>
                )}
              </p>
            </div>

            {/* Skills cloud */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
              <SLabel icon={Zap} iconColor="text-amber-400">
                Skill Stack
              </SLabel>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-3 py-1.5 bg-[#111] border border-[#222] hover:border-amber-500/30 rounded-xl text-[11px] font-bold text-[#ccc] cursor-default transition-colors"
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#444]">
                  No skills added. Update your profile to list your
                  capabilities.
                </p>
              )}
            </div>
          </div>

          {/* Digital footprint — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
            <SLabel icon={Link2} iconColor="text-sky-400">
              Digital Footprint
            </SLabel>
            <div className="space-y-2">
              {LINK_DEFS.map(({ key, label, icon: Icon, color }) => {
                const val = userData.links?.[key] || "";
                return (
                  <a
                    key={key}
                    href={val || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      val
                        ? "bg-[#0f0f0f] border-[#1a1a1a] hover:border-[#333] cursor-pointer group"
                        : "bg-transparent border-[#0f0f0f] text-[#333] pointer-events-none opacity-40",
                    )}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color: val ? color : undefined }}
                    />
                    <span className="text-xs font-bold text-[#888] group-hover:text-white transition-colors flex-1">
                      {val ? label : `${label} not linked`}
                    </span>
                    {val && (
                      <ExternalLink className="w-3 h-3 text-[#444] group-hover:text-[#888] transition-colors shrink-0" />
                    )}
                  </a>
                );
              })}
              <Link
                to="/app/settings?tab=connectors"
                className="flex items-center justify-center gap-1.5 py-2 text-[9px] font-black text-sky-400/50 hover:text-sky-400 transition-colors uppercase tracking-widest"
              >
                Manage Connectors <ArrowUpRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          {/* Academic baseline — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
            <SLabel icon={GraduationCap} iconColor="text-sky-400">
              Academic Baseline
            </SLabel>
            {userData.baseline?.institution ? (
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white mb-0.5">
                    {userData.baseline.institution}
                  </h4>
                  <p className="text-xs text-[#666]">
                    {userData.baseline.degree || ""}
                    {userData.baseline.major
                      ? ` · ${userData.baseline.major}`
                      : ""}
                  </p>
                  {userData.baseline.gradYear && (
                    <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest mt-2">
                      CLASS OF {userData.baseline.gradYear}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <GraduationCap className="w-8 h-8 text-white/10 mb-2" />
                <p className="text-[10px] text-white/20">
                  No academic info. Add in Profile Editor.
                </p>
              </div>
            )}
          </div>

          {/* Vision & trajectory — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
            <SLabel icon={Target} iconColor="text-indigo-400">
              Vision & Trajectory
            </SLabel>
            <div className="space-y-4">
              <div>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">
                  90-Day Target
                </p>
                <p className="text-sm text-[#888] leading-relaxed">
                  {userData.vision?.goal3Months || (
                    <span className="text-[#444] italic">No target set.</span>
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
            </div>
          </div>

          {/* Consistency heatmap — xl:col-span-6 */}
          <div className="md:col-span-2 xl:col-span-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <SLabel icon={Flame} iconColor="text-orange-400">
                Consistency Engine
              </SLabel>
              <span className="text-2xl font-black text-white font-mono leading-none">
                {streak}
                <span className="text-sm text-white/30 font-sans ml-1">
                  days
                </span>
              </span>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center justify-center gap-4 mt-1 mb-5">
              <button
                onClick={handlePrevMonth}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.03] border border-[#1a1a1a] text-[#888] hover:text-white hover:bg-white/[0.08] transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10px] font-black uppercase tracking-widest text-[#888] w-24 text-center select-none">
                {viewDate.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>

              <button
                onClick={handleNextMonth}
                disabled={
                  viewDate.getMonth() === new Date().getMonth() &&
                  viewDate.getFullYear() === new Date().getFullYear()
                }
                className="w-6 h-6 flex items-center justify-center rounded-md bg-white/[0.03] border border-[#1a1a1a] text-[#888] hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dynamic timeline (Vertical Pill bars) */}
            <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-2 h-8 sm:h-10">
              {heatmap.map((day, i) => (
                <div
                  key={i}
                  title={day.str}
                  className={cn(
                    "flex-1 h-full max-w-[10px] sm:max-w-[12px] rounded-full border transition-all",
                    day.active
                      ? "bg-amber-500 border-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                      : "bg-white/[0.04] border-white/[0.02]",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Journal & Allies summary — xl:col-span-6 */}
          <div className="md:col-span-2 xl:col-span-6 grid grid-cols-2 gap-4">
            {[
              {
                icon: BookOpen,
                iconColor: "text-violet-400",
                label: "Journal Entries",
                val: journals.length,
                sub: "Total ledger logs",
                bg: "bg-violet-500/10",
                border: "border-violet-500/15",
                to: "/app",
              },
              {
                icon: Users,
                iconColor: "text-indigo-400",
                label: "Alliance Network",
                val: allies.length,
                sub: "Active connections",
                bg: "bg-indigo-500/10",
                border: "border-indigo-500/15",
                to: "/app/network",
              },
            ].map(
              ({ icon: Icon, iconColor, label, val, sub, bg, border, to }) => (
                <Link
                  key={label}
                  to={to}
                  className={cn(
                    "flex flex-col justify-between p-5 rounded-[2rem] border hover:border-white/10 transition-all group",
                    bg,
                    border,
                  )}
                >
                  <Icon className={cn("w-5 h-5 mb-4", iconColor)} />
                  <div>
                    <p
                      className={cn("text-3xl font-black font-mono", iconColor)}
                    >
                      {val}
                    </p>
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">
                      {label}
                    </p>
                    <p className="text-[9px] text-white/15 mt-0.5">{sub}</p>
                  </div>
                </Link>
              ),
            )}
          </div>

          {/* Public profile CTA — xl:col-span-12 */}
          <div className="md:col-span-2 xl:col-span-12 bg-gradient-to-r from-[#0a0a0a] via-[#0c0c0e] to-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">
                Your Live Resume
              </p>
              <h3 className="text-lg font-black text-white">Public Profile</h3>
              <p className="text-xs text-[#555] mt-1">
                discotive.in/
                <span className="text-amber-400/70">
                  @{userData.identity?.username || "handle"}
                </span>{" "}
                — visible to recruiters, allies, and the world.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyPublicLink}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-[#888] rounded-xl hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
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
          </div>
        </div>
        {/* end bento grid */}
      </div>

      {/* ─── Toast ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: -16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 16, x: -16 }}
            className={cn(
              "fixed bottom-6 left-4 md:left-8 z-[600] border px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest",
              toast.type === "green"
                ? "bg-[#052e16] border-emerald-500/30 text-emerald-400"
                : "bg-[#1a0505] border-rose-500/30 text-rose-400",
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

// Missing import needed
const Hash = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

export default Profile;
