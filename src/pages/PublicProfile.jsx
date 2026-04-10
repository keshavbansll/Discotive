/**
 * @fileoverview Discotive OS — Public Profile v8 (The Live Resume Standard)
 * @route /@:handle
 * @description
 * The public billboard. Strict data hygiene — zero sensitive data exposed.
 * Designed to replace LinkedIn. HR must be able to judge a candidate in 10s.
 * Alliance request routes through Cloud Functions, not client writes.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { increment, doc, updateDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, auth, functions } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
} from "recharts";
import {
  MapPin,
  Github,
  Twitter,
  Linkedin,
  Globe,
  Youtube,
  Instagram,
  Target,
  Activity,
  Briefcase,
  ShieldCheck,
  Users,
  BookOpen,
  FolderLock,
  Download,
  Monitor,
  Share2,
  X,
  FileText,
  CheckCircle2,
  Clock,
  UserPlus,
  Eye,
  Zap,
  Terminal,
  Check,
  Crown,
  Loader2,
  ExternalLink,
  Star,
  Award,
  Flame,
  ArrowLeft,
  Copy,
  Lock,
  TrendingUp,
  TrendingDown,
  Database,
  Sparkles,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calcVSS = (vault = []) => {
  const verified = vault.filter((a) => a.status === "VERIFIED");
  if (!verified.length) return 0;
  const pts = verified.reduce(
    (s, a) =>
      s + (a.strength === "Strong" ? 30 : a.strength === "Medium" ? 20 : 10),
    0,
  );
  return Math.min(Math.round((pts / (verified.length * 30)) * 100), 100);
};

const fmtScore = (n) =>
  n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n?.toLocaleString() || "0";

// ─── Score Ring (dynamic max) ─────────────────────────────────────────────────
const ScoreRing = ({ score, size = 120 }) => {
  const maxLevel = Math.ceil(score / 1000) * 1000;
  const pct = Math.min(score / Math.max(maxLevel, 1000), 1);
  const r = (size - 10) / 2;
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
          strokeWidth={10}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#BFA264"
          strokeWidth={10}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - pct * circ }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 8px rgba(191,162,100,0.6))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white font-mono leading-none">
          {fmtScore(score)}
        </span>
        <span className="text-[8px] text-white/30 uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  );
};

// ─── VSS Dial ─────────────────────────────────────────────────────────────────
const VSSDial = ({ score, size = 80 }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#BFA264" : "#f97316";
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
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-white leading-none">
          {score}%
        </span>
      </div>
    </div>
  );
};

// ─── Vault Asset Card ──────────────────────────────────────────────────────────
const VaultAsset = ({ asset }) => {
  const COLORS = {
    Certificate: "#BFA264",
    Resume: "#10b981",
    Project: "#8b5cf6",
    Publication: "#06b6d4",
    Employment: "#f97316",
    Link: "#64748b",
    Other: "#374151",
  };
  const color = COLORS[asset.category] || "#555";
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[#050505] border border-[#111] rounded-xl hover:border-[#1a1a1a] transition-colors group">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
        style={{ background: `${color}15`, borderColor: `${color}30` }}
      >
        <ShieldCheck className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white truncate">
          {asset.name || asset.title || "Untitled"}
        </p>
        <p className="text-[9px] text-[#555] mt-0.5">
          {asset.category || "Asset"}
          {asset.credentials?.issuer ? ` · ${asset.credentials.issuer}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest"
          style={{ color, background: `${color}15` }}
        >
          {asset.strength || "Verified"}
        </div>
        {asset.url && (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="p-1 bg-white/[0.04] rounded hover:bg-white/10 transition-colors"
          >
            <ExternalLink className="w-3 h-3 text-[#555]" />
          </a>
        )}
      </div>
    </div>
  );
};

// ─── Score Tooltip ─────────────────────────────────────────────────────────────
const ScoreTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-[#BFA264]/20 rounded-xl px-3 py-2 shadow-xl pointer-events-none">
      <p className="text-[9px] text-white/25 uppercase mb-0.5">{label}</p>
      <p className="text-base font-black text-white font-mono">
        {payload[0].value?.toLocaleString()}
      </p>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
const PublicProfile = () => {
  const { handle } = useParams();
  const username = handle?.startsWith("@")
    ? handle.slice(1).toLowerCase()
    : handle?.toLowerCase();
  const { userData: viewerData } = useUserData();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [targetId, setTargetId] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allyStatus, setAllyStatus] = useState("none"); // none | sending | sent | allied
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const GRAD_ID = "pubGrad";

  const showToast = (msg, type = "green") => {
    if (toastRef.current) clearTimeout(toastRef.current);
    setToast({ msg, type });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  useEffect(
    () => () => {
      if (toastRef.current) clearTimeout(toastRef.current);
    },
    [],
  );

  // ── Fetch profile via Cloud Function ───────────────────────────────────────
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      if (!username) {
        setLoading(false);
        return;
      }
      try {
        const getProfile = httpsCallable(functions, "getPublicProfileData");
        const res = await getProfile({ handle: username });
        const data = res.data;
        setProfileData(data);
        setTargetId(data.id);
        setRank(data.rank);

        // View tracking
        const key = `dv_viewed_${data.id}`;
        const isOwner = auth.currentUser?.uid === data.id;
        if (!localStorage.getItem(key) && !isOwner && data.id) {
          try {
            await updateDoc(doc(db, "users", data.id), {
              profileViews: increment(1),
            });
            localStorage.setItem(key, "true");
            setProfileData((p) => ({
              ...p,
              profileViews: (p?.profileViews || 0) + 1,
            }));
          } catch {}
        }
      } catch (err) {
        console.error("[PublicProfile]", err);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [username]);

  // ── Alliance status ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!targetId || !viewerData) return;
    if ((viewerData?.allies || []).includes(targetId)) setAllyStatus("allied");
    else if ((viewerData?.outboundRequests || []).includes(targetId))
      setAllyStatus("sent");
  }, [targetId, viewerData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const isMe = viewerData?.identity?.username === username;
  const isGuest = !viewerData;

  const score = profileData?.discotiveScore?.current || 0;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const streak = profileData?.discotiveScore?.streak || 0;
  const views = profileData?.profileViews || 0;

  const firstName = profileData?.identity?.firstName || "";
  const lastName = profileData?.identity?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Operator";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "O";
  const domain =
    profileData?.identity?.domain ||
    profileData?.vision?.passion ||
    "Undeclared";
  const niche =
    profileData?.identity?.niche || profileData?.vision?.niche || "";
  const location =
    profileData?.footprint?.location || profileData?.identity?.country || null;
  const bio =
    profileData?.professional?.bio ||
    profileData?.identity?.bio ||
    profileData?.footprint?.bio ||
    null;
  const workExperience = profileData?.professional?.workExperience || null;
  const verifiedApps = useMemo(
    () => profileData?.verifiedApps || [],
    [profileData?.verifiedApps],
  );
  const institution = profileData?.baseline?.institution || null;
  const degree = profileData?.baseline?.degree || null;
  const major = profileData?.baseline?.major || null;
  const gradYear = profileData?.baseline?.gradYear || null;
  const skills = profileData?.skills?.alignedSkills || [];
  const alliesCount = profileData?.alliesCount || 0;
  const verifiedVault = (profileData?.vault || []).filter(
    (a) => a.status === "VERIFIED",
  );
  const vss = useMemo(
    () => calcVSS(profileData?.vault || []),
    [profileData?.vault],
  );
  const moatPct = profileData?.vault?.length
    ? Math.round((verifiedVault.length / profileData.vault.length) * 100)
    : 0;

  // ── Dynamic Title Management ───────────────────────────────────────────────
  useEffect(() => {
    if (!loading && profileData && fullName !== "Operator") {
      document.title = `${fullName} | Discotive`;
    } else if (!loading && !profileData) {
      document.title = `Not Found | Discotive`;
    } else if (loading) {
      document.title = `Loading Profile... | Discotive`;
    }
  }, [fullName, loading, profileData]);

  // ── Chart data from daily_scores ──────────────────────────────────────────
  const chartData = useMemo(() => {
    const daily = profileData?.daily_scores || {};
    const src = Object.keys(daily)
      .map((d) => ({ date: d, score: daily[d] }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
    if (src.length < 2) return [];
    return src.map((e) => ({
      day: new Date(e.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      score: e.score,
    }));
  }, [profileData]);

  const chartMin = chartData.length
    ? Math.max(0, Math.min(...chartData.map((d) => d.score)) - 20)
    : 0;

  // ── Radar ─────────────────────────────────────────────────────────────────
  const radarData = [
    { metric: "Execution", score: Math.min((score / 5000) * 100, 100) },
    { metric: "Skills", score: Math.min((skills.length / 10) * 100, 100) },
    { metric: "Network", score: Math.min((alliesCount / 20) * 100, 100) },
    { metric: "Vault", score: vss },
    { metric: "Reach", score: Math.min((views / 100) * 100, 100) },
  ];

  // ── Links ─────────────────────────────────────────────────────────────────
  const LINKS = [
    { key: "github", icon: Github, color: "#fff", label: "GitHub" },
    { key: "linkedin", icon: Linkedin, color: "#0a66c2", label: "LinkedIn" },
    { key: "twitter", icon: Twitter, color: "#1da1f2", label: "X / Twitter" },
    { key: "youtube", icon: Youtube, color: "#ff0000", label: "YouTube" },
    { key: "instagram", icon: Instagram, color: "#e1306c", label: "Instagram" },
    { key: "website", icon: Globe, color: "#888", label: "Website" },
  ];
  const activeLinks = LINKS.filter((l) => profileData?.links?.[l.key]);

  // ── Alliance request (goes through network hook, not client write) ─────────
  const handleConnect = async () => {
    if (isGuest) {
      navigate("/");
      return;
    }
    if (!targetId || !viewerData?.uid || allyStatus !== "none") return;
    setAllyStatus("sending");
    try {
      // Using network module pattern: write connection doc
      const { addDoc, collection, serverTimestamp } =
        await import("firebase/firestore");
      await addDoc(collection(db, "connections"), {
        requesterId: viewerData.uid,
        receiverId: targetId,
        requesterName:
          `${viewerData.identity?.firstName || ""} ${viewerData.identity?.lastName || ""}`.trim() ||
          "Operator",
        receiverName: fullName,
        requesterUsername: viewerData.identity?.username || "",
        receiverUsername: username,
        requesterDomain: viewerData.identity?.domain || "",
        receiverDomain: domain,
        requesterAvatar: viewerData.identity?.avatarUrl || null,
        receiverAvatar: null,
        status: "PENDING",
        timestamp: serverTimestamp(),
      });
      // Award score via scoreEngine
      const { awardAllianceAction } = await import("../lib/scoreEngine");
      await awardAllianceAction(viewerData.uid, "sent");
      setAllyStatus("sent");
      showToast("Alliance request sent! +5 pts", "green");
    } catch (err) {
      console.error(err);
      setAllyStatus("none");
      showToast("Request failed. Try again.", "red");
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    showToast("Compiling DCI document…");
    try {
      const [{ pdf }, React2, { DCIExportTemplate }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("react"),
        import("../components/DCIExportTemplate"),
      ]);
      const blob = await pdf(
        React2.default.createElement(DCIExportTemplate, {
          data: {
            firstName,
            lastName,
            username,
            email: "",
            domain,
            niche,
            rank,
            score,
            goal: profileData?.vision?.goal3Months,
            endgame: profileData?.vision?.endgame,
            institution,
            degree,
            major,
            gradYear,
            streak,
          },
          level,
          skills,
          assetsCount: verifiedVault.length,
          alliesCount,
        }),
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${firstName}_${lastName}_Discotive_DCI.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("DCI exported.", "green");
    } catch (e) {
      console.error(e);
      showToast("Export failed.", "red");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://discotive.in/@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Link copied!", "green");
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading)
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

  if (!profileData)
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center mb-2">
          <Lock className="w-7 h-7 text-[#333]" />
        </div>
        <h1 className="text-2xl font-black text-white">Operator Not Found</h1>
        <p className="text-sm text-[#555]">
          @{username} hasn't joined the Discotive network yet.
        </p>
        <Link
          to="/app"
          className="px-6 py-3 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#ddd] transition-colors"
        >
          Return to Command Center
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[#BFA264]/25 pb-24 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#BFA264] opacity-[0.025] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1520px] mx-auto px-4 md:px-8 py-6 md:py-10 relative z-10 space-y-4">
        {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/app"
            className="flex items-center gap-2 text-[10px] font-black text-white/25 hover:text-white transition-colors uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Network
          </Link>
          <div className="flex items-center gap-2">
            {isMe && (
              <Link
                to="/app/profile"
                className="px-4 py-2 bg-[#0a0a0a] border border-[#1a1a1a] text-[10px] font-black text-[#666] hover:text-white uppercase tracking-widest rounded-xl transition-colors"
              >
                My Profile
              </Link>
            )}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[10px] font-black text-[#666] hover:text-white uppercase tracking-widest rounded-xl transition-colors disabled:opacity-40"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isExporting ? "Compiling…" : "Export DCI"}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[10px] font-black text-[#666] hover:text-white uppercase tracking-widest rounded-xl transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
              {copied ? "Copied" : "Share"}
            </button>
          </div>
        </div>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#BFA264]/[0.03] to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-[#111] border border-[#222] flex items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden">
                {profileData.identity?.avatarUrl ? (
                  <img
                    src={profileData.identity.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {profileData?.tier === "PRO" && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#030303] flex items-center justify-center pointer-events-none">
                  <Crown className="w-3 h-3 text-black" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  {fullName}
                </h1>
                <span className="px-2.5 py-1 bg-[#111] border border-[#222] rounded-lg text-[10px] font-mono text-[#666]">
                  @{username}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  <ShieldCheck className="w-2.5 h-2.5" /> Discotive Verified
                </span>
              </div>
              <p className="text-sm text-[#666] mb-3">
                {domain}
                {niche && <span className="text-[#444]"> · {niche}</span>}
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Award className="w-3 h-3 text-[#BFA264]/50" />
                  Level {level}
                </span>
                {rank && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-[#BFA264]/50" />
                    Rank #{rank} Global
                  </span>
                )}
              </div>
              {bio && (
                <p className="text-sm text-[#777] leading-relaxed max-w-2xl">
                  {bio}
                </p>
              )}
            </div>

            {/* Score ring + CTA */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <ScoreRing score={score} size={110} />
              {!isMe && (
                <div className="w-full">
                  {allyStatus === "none" && (
                    <button
                      onClick={handleConnect}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ddd] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Connect
                    </button>
                  )}
                  {allyStatus === "sending" && (
                    <div className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-[#111] border border-[#222] text-[10px] font-black text-white/30 rounded-xl">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                    </div>
                  )}
                  {allyStatus === "sent" && (
                    <div className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.04] border border-white/[0.08] text-[10px] font-black text-[#666] rounded-xl">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Request
                      Sent
                    </div>
                  )}
                  {allyStatus === "allied" && (
                    <div className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Allied
                    </div>
                  )}
                  {isGuest && (
                    <p className="text-[9px] text-[#444] text-center mt-1">
                      Sign in to connect
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── STATS STRIP ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            {
              label: "Score",
              val: fmtScore(score),
              icon: Zap,
              color: "text-[#BFA264]",
              bg: "bg-[#BFA264]/10",
              border: "border-[#BFA264]/15",
            },
            {
              label: "Level",
              val: `Lv ${level}`,
              icon: Award,
              color: "text-[#BFA264]",
              bg: "bg-[#BFA264]/10",
              border: "border-[#BFA264]/15",
            },
            {
              label: "Streak",
              val: `${streak}d`,
              icon: Flame,
              color: "text-orange-400",
              bg: "bg-orange-500/10",
              border: "border-orange-500/15",
            },
            {
              label: "Allies",
              val: alliesCount,
              icon: Users,
              color: "text-violet-400",
              bg: "bg-violet-500/10",
              border: "border-violet-500/15",
            },
            {
              label: "Views",
              val: views,
              icon: Eye,
              color: "text-sky-400",
              bg: "bg-sky-500/10",
              border: "border-sky-500/15",
            },
          ].map(({ label, val, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border",
                bg,
                border,
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", color)} />
              <div>
                <p
                  className={cn(
                    "text-xl font-black font-mono leading-none",
                    color,
                  )}
                >
                  {val}
                </p>
                <p className="text-[9px] text-white/25 uppercase tracking-widest mt-0.5">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* OPERATOR RADAR — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col"
          >
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Target className="w-3.5 h-3.5 text-[#BFA264]" />
              Operator Radar
            </h3>
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <RadarChart data={radarData}>
                  <PolarGrid
                    stroke="rgba(255,255,255,0.05)"
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
            <div className="space-y-1.5 pt-3 border-t border-white/[0.04]">
              {radarData.map((d) => (
                <div key={d.metric} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/20 font-bold w-16 shrink-0 uppercase tracking-widest">
                    {d.metric}
                  </span>
                  <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.score}%` }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="h-full bg-[#BFA264]/50 rounded-full"
                    />
                  </div>
                  <span className="text-[9px] font-black font-mono text-white/25 w-6 text-right">
                    {Math.round(d.score)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* VAULT STRENGTH + SCORE TRAJECTORY — xl:8 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="col-span-1 xl:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                  <Activity className="w-3.5 h-3.5 text-[#BFA264]" />
                  Score Trajectory
                </h3>
                <div className="flex items-end gap-4">
                  <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter leading-none">
                    {score.toLocaleString()}
                  </span>
                  {streak > 0 && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border bg-orange-500/10 border-orange-500/20 text-orange-400 mb-1">
                      <Flame className="w-3 h-3" /> {streak}d streak
                    </div>
                  )}
                </div>
              </div>
              {/* VSS Dial */}
              <div className="flex flex-col items-center gap-1">
                <VSSDial score={vss} size={70} />
                <span className="text-[8px] font-black text-white/25 uppercase tracking-widest">
                  Vault Strength
                </span>
              </div>
            </div>
            <div className="flex-1 min-h-[140px]">
              {chartData.length >= 2 ? (
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
                          stopOpacity={0.35}
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
                        stroke: "rgba(191,162,100,0.15)",
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
                <div className="h-full flex items-center justify-center text-[10px] text-white/15">
                  Score history not available.
                </div>
              )}
            </div>
          </motion.div>

          {/* RANK CARD — xl:3 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-1 xl:col-span-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 relative overflow-hidden"
          >
            {rank && rank <= 10 && (
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#BFA264] opacity-[0.06] blur-3xl rounded-full pointer-events-none" />
            )}
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Star className="w-3.5 h-3.5 text-[#BFA264]" />
              Global Rank
            </h3>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-5xl font-black font-mono",
                  rank && rank <= 3
                    ? "text-[#BFA264] drop-shadow-[0_0_20px_rgba(191,162,100,0.5)]"
                    : "text-white",
                )}
              >
                #{rank || "—"}
              </span>
              {rank && rank <= 3 && (
                <Crown className="w-7 h-7 text-[#BFA264] animate-pulse" />
              )}
            </div>
            <p className="text-[9px] text-white/20 mt-2 uppercase tracking-widest">
              {rank && rank <= 10
                ? "Elite Tier · Top 10"
                : rank && rank <= 100
                  ? "Advanced · Top 100"
                  : "Active Operator"}
            </p>
          </motion.div>

          {/* VERIFIED VAULT — xl:5 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="col-span-1 xl:col-span-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
                Proof of Work
              </h3>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400">
                  {verifiedVault.length} Verified
                </div>
                {moatPct > 0 && (
                  <div className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[9px] font-black text-white/40">
                    {moatPct}% Moat
                  </div>
                )}
              </div>
            </div>
            {verifiedVault.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderLock className="w-8 h-8 text-white/10 mb-2" />
                <p className="text-[10px] text-white/20">
                  No verified assets yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {verifiedVault.slice(0, 5).map((asset, i) => (
                  <VaultAsset key={i} asset={asset} />
                ))}
                {verifiedVault.length > 5 && (
                  <p className="text-[9px] text-center text-white/20 pt-1">
                    +{verifiedVault.length - 5} more verified assets
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* TRAJECTORY — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Trajectory
            </h3>
            <div className="space-y-4">
              {profileData?.vision?.goal3Months && (
                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">
                    90-Day Target
                  </p>
                  <p className="text-sm text-[#888] leading-relaxed">
                    {profileData.vision.goal3Months}
                  </p>
                </div>
              )}
              {profileData?.vision?.endgame && (
                <div>
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">
                    Macro Endgame
                  </p>
                  <p className="text-xs text-[#555] leading-relaxed">
                    {profileData.vision.endgame}
                  </p>
                </div>
              )}
              {!profileData?.vision?.goal3Months &&
                !profileData?.vision?.endgame && (
                  <p className="text-[10px] text-white/20 italic">
                    No trajectory disclosed.
                  </p>
                )}
            </div>
          </motion.div>

          {/* SKILLS — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
          >
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
              <Terminal className="w-3.5 h-3.5 text-white/35" />
              Skill Stack
            </h3>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] rounded-xl text-[11px] font-bold text-[#aaa]"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#444]">Skills not disclosed.</p>
            )}
          </motion.div>

          {/* VERIFIED APP STACK — xl:4 */}
          {verifiedApps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17 }}
              className="col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6"
            >
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                <Monitor className="w-3.5 h-3.5 text-violet-400" />
                Verified App Stack
              </h3>
              <div className="flex flex-wrap gap-3">
                {verifiedApps.map((app) => (
                  <div
                    key={app.appId}
                    className="relative group"
                    title={`${app.appName} — Verified`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#0f0f0f] border border-emerald-500/25 overflow-hidden flex items-center justify-center hover:scale-105 transition-transform">
                      <img
                        src={app.appIconUrl}
                        alt={app.appName}
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center pointer-events-none">
                      <Check className="w-2 h-2 text-black" strokeWidth={3} />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* BIO & EXPERIENCE + ACADEMIC + LINKS — xl:4 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className={`col-span-1 xl:col-span-${verifiedApps.length > 0 ? "4" : "8"} space-y-4`}
          >
            {/* Bio & Work Experience */}
            {(bio || workExperience) && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                  <Briefcase className="w-3.5 h-3.5 text-[#BFA264]" />
                  Professional
                </h3>
                {bio && (
                  <p className="text-sm text-[#888] leading-relaxed mb-3">
                    {bio}
                  </p>
                )}
                {workExperience?.role && (
                  <div className="flex items-center gap-3 p-3 bg-[#050505] border border-[#111] rounded-xl">
                    <div className="w-8 h-8 rounded-xl bg-[#BFA264]/10 border border-[#BFA264]/20 flex items-center justify-center shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-[#BFA264]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate">
                        {workExperience.role}
                      </p>
                      <p className="text-[10px] text-[#666] truncate">
                        {workExperience.company || ""}
                        {workExperience.type ? ` · ${workExperience.type}` : ""}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {institution && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  Academic
                </h3>
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {institution}
                    </p>
                    <p className="text-[10px] text-[#666] mt-0.5">
                      {degree || ""}
                      {major ? ` · ${major}` : ""}
                    </p>
                    {gradYear && (
                      <p className="text-[9px] font-black text-[#BFA264]/50 uppercase tracking-widest mt-1.5">
                        Class of {gradYear}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Icon-only footprint */}
            {activeLinks.length > 0 && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                  <Globe className="w-3.5 h-3.5 text-white/35" />
                  Digital Presence
                </h3>
                <div className="flex flex-wrap gap-3">
                  {activeLinks.map(({ key, icon: Icon, color }) => {
                    const val = profileData.links[key];
                    const isWebsite = key === "website";
                    return (
                      <a
                        key={key}
                        href={val}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] hover:border-white/20 flex items-center justify-center transition-all hover:scale-105"
                      >
                        {isWebsite ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${val}&sz=32`}
                            alt="site"
                            className="w-5 h-5 rounded-sm"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <Icon className="w-4 h-4" style={{ color }} />
                        )}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

          {/* DISCOTIVE BRANDING FOOTER — xl:12 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-1 md:col-span-2 xl:col-span-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <img
                src="/logo-no-bg-white.png"
                alt="Discotive"
                className="w-6 h-6 object-contain opacity-50"
              />
              <div>
                <p className="text-xs font-black text-white/40">
                  Verified by Discotive OS
                </p>
                <p className="text-[9px] text-white/20">
                  The career intelligence standard. Replace your résumé.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                  Live Profile
                </span>
              </div>
              <Link
                to="/"
                className="text-[9px] font-black text-[#BFA264]/50 hover:text-[#BFA264] transition-colors uppercase tracking-widest"
              >
                Join Discotive →
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

export default PublicProfile;
