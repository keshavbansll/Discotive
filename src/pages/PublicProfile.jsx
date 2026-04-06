/**
 * @fileoverview Discotive OS — Public Profile (The Live Resume Standard)
 * @module PublicProfile
 * @route /@:handle
 *
 * @description
 * The public-facing career card for any Discotive operator.
 * Accessible by anyone with the link — zero sensitive data exposed.
 *
 * Philosophy:
 * "People today share LinkedIn URLs, GitHub handles, résumé PDFs.
 * The Discotive Public Profile replaces all three: it is a living,
 * verifiable, scored career document that updates in real-time."
 *
 * Features:
 * - SVG Radar chart (Execution, Skills, Network, Vault, Reach)
 * - SVG Donut — Moat distribution (skills × effort allocation)
 * - Verified vault assets only (status === 'VERIFIED')
 * - Global rank + percentile display
 * - Profile view tracking (+1 score for owner on each unique visit)
 * - Export DCI PDF (via DCIExportTemplate)
 * - Alliance / Connect CTA for authenticated visitors
 * - Discotive branding footer ("Verified by Discotive OS")
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  updateDoc,
  writeBatch,
  arrayUnion,
  increment,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, auth, functions } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { mutateScore } from "../lib/scoreEngine";
import { pdf } from "@react-pdf/renderer";
import { DCIExportTemplate } from "../components/DCIExportTemplate";
import { cn } from "../lib/cn";
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
  ShieldCheck,
  Users,
  GraduationCap,
  FolderLock,
  PieChart,
  Download,
  Share2,
  X,
  FileText,
  CheckCircle2,
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
  MessageCircle,
  Lock,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

// ─── SVG Radar ───────────────────────────────────────────────────────────────
const RadarChart = ({ data, labels, accentColor = "#f59e0b" }) => {
  const N = data.length;
  const cx = 50;
  const cy = 50;
  const maxR = 36;

  const toXY = (val, i, r = maxR) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
    };
  };

  const gridPts = (lv) =>
    Array.from({ length: N }, (_, i) => toXY(lv, i))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  const dataPoints = data.map((v, i) => toXY(Math.min(v / 100, 1), i));
  const polyPts = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const labelPos = labels.map((_, i) => {
    const angle = (Math.PI * 2 * i) / N - Math.PI / 2;
    return {
      x: cx + (maxR + 11) * Math.cos(angle),
      y: cy + (maxR + 11) * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full"
      style={{ overflow: "visible" }}
    >
      {[0.25, 0.5, 0.75, 1].map((lv) => (
        <polygon
          key={lv}
          points={gridPts(lv)}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="0.4"
        />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const p = toXY(1, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.4"
          />
        );
      })}
      <polygon
        points={polyPts}
        fill={`${accentColor}20`}
        stroke={accentColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="2.5"
          fill={accentColor}
          stroke="#030303"
          strokeWidth="1"
        />
      ))}
      {labels.map((label, i) => (
        <text
          key={i}
          x={labelPos[i].x}
          y={labelPos[i].y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="3.5"
          fontWeight="700"
        >
          {label}
        </text>
      ))}
    </svg>
  );
};

// ─── SVG Donut ────────────────────────────────────────────────────────────────
const DonutChart = ({ segments, centerLabel, centerSub, size = 130 }) => {
  const r = 40;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;

  const arcs = segments.map((seg, index) => {
    const dash = (seg.value / total) * circ;
    const offset = segments
      .slice(0, index)
      .reduce((acc, s) => acc + (s.value / total) * circ, 0);
    return { ...seg, dash, offset };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
          strokeWidth="16"
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth="16"
            strokeDasharray={`${arc.dash} ${circ - arc.dash}`}
            strokeDashoffset={-arc.offset}
          />
        ))}
        <circle cx={cx} cy={cy} r={r - 10} fill="#030303" />
      </svg>
      {(centerLabel || centerSub) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && (
            <span className="text-lg font-black text-white font-mono">
              {centerLabel}
            </span>
          )}
          {centerSub && (
            <span className="text-[8px] text-white/30 uppercase tracking-widest">
              {centerSub}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Vault asset card ─────────────────────────────────────────────────────────
const VaultAsset = ({ asset }) => {
  const CAT_COLOR = {
    Certificate: "#f59e0b",
    Resume: "#10b981",
    Project: "#8b5cf6",
    Publication: "#06b6d4",
    Employment: "#f97316",
    Link: "#64748b",
    Other: "#374151",
  };
  const color = CAT_COLOR[asset.category] || "#555";
  return (
    <div className="flex items-start gap-3 p-3.5 bg-[#050505] border border-[#111] rounded-xl hover:border-[#1a1a1a] transition-colors">
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
          {asset.issuer ? ` · ${asset.issuer}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
          style={{ color, background: `${color}15` }}
        >
          Verified
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

// ─── Score ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({
  score,
  max = 5000,
  accentColor = "#f59e0b",
  size = 120,
}) => {
  const pct = Math.min(score / max, 1);
  const r = 42;
  const cx = 50;
  const cy = 50;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="-rotate-90"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#0f0f0f"
          strokeWidth="10"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={accentColor}
          strokeWidth="10"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${accentColor}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white font-mono">
          {score.toLocaleString()}
        </span>
        <span className="text-[8px] text-white/30 uppercase tracking-widest">
          Score
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenu, setExportMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [allyStatus, setAllyStatus] = useState("none"); // none | sent | allied
  const [copied, setCopied] = useState(false);

  const exportMenuRef = useRef(null);

  const showToast = (msg, type = "green") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Click-outside export menu
  useEffect(() => {
    const fn = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target))
        setExportMenu(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Profile fetch + view tracking ────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        const getProfile = httpsCallable(functions, "getPublicProfileData");
        const response = await getProfile({ handle: username });
        const data = response.data;

        setProfileData(data);
        setTargetId(data.id);
        setRank(data.rank);

        // View tracking (unique per device per profile)
        const viewKey = `dv_viewed_${data.id}`;
        const isOwner = auth.currentUser?.uid === data.id;

        if (!localStorage.getItem(viewKey) && !isOwner) {
          try {
            // Safe increment: Protected by the +1 mathematical constraint in firestore.rules
            await updateDoc(doc(db, "users", data.id), {
              profileViews: increment(1),
            });

            // MAANG FIX: Removed client-side mutateScore.
            // Score awards for views must be handled server-side inside getPublicProfileData.

            localStorage.setItem(viewKey, "true");
            setProfileData((prev) => ({
              ...prev,
              profileViews: (prev?.profileViews || 0) + 1,
            }));
          } catch (telemetryErr) {
            // Fails gracefully if rules block rapid spamming
            console.warn("[Telemetry] View count rejected by security gate.");
          }
        }
      } catch (err) {
        console.error("[PublicProfile] fetch failed:", err);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  // ── Alliance status sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (!targetId || !viewerData) return;
    if (viewerData?.allies?.includes(targetId)) {
      setAllyStatus("allied");
    } else if (viewerData?.outboundRequests?.includes(targetId)) {
      setAllyStatus("sent");
    }
  }, [targetId, viewerData]);

  // ── Data extraction ───────────────────────────────────────────────────────
  const isMe = viewerData?.identity?.username === username;
  const isGuest = !viewerData;

  const score = profileData?.discotiveScore?.current || 0;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const streak =
    profileData?.discotiveScore?.streak ||
    profileData?.telemetry?.loginStreak ||
    0;
  const views = profileData?.profileViews || 0;

  const firstName = profileData?.identity?.firstName || "Unknown";
  const lastName = profileData?.identity?.lastName || "";
  const initials =
    `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
  const fullName = `${firstName} ${lastName}`.trim();
  const domain =
    profileData?.identity?.domain ||
    profileData?.vision?.passion ||
    "Undeclared";
  const niche =
    profileData?.identity?.niche || profileData?.vision?.niche || "—";
  const location =
    profileData?.footprint?.location || profileData?.identity?.country || null;
  const bio = profileData?.footprint?.bio || null;

  const institution = profileData?.baseline?.institution || null;
  const degree = profileData?.baseline?.degree || null;
  const major = profileData?.baseline?.major || null;
  const gradYear = profileData?.baseline?.gradYear || null;

  const skills = profileData?.skills?.alignedSkills || [];
  const alliesCount = profileData?.alliesCount || 0;

  // Only verified public vault assets
  const verifiedVault = (profileData?.vault || []).filter(
    (a) => a.status === "VERIFIED",
  );

  // ── Radar data ────────────────────────────────────────────────────────────
  const radarData = [
    Math.min((score / 5000) * 100, 100),
    Math.min((skills.length / 10) * 100, 100),
    Math.min((alliesCount / 20) * 100, 100),
    Math.min((verifiedVault.length / 5) * 100, 100),
    Math.min((views / 100) * 100, 100),
  ];
  const radarLabels = ["Execution", "Skills", "Network", "Vault", "Reach"];

  // ── Moat donut ────────────────────────────────────────────────────────────
  const moatSegments = useMemo(() => {
    const sl = skills.length;
    if (sl === 0) return [{ value: 1, color: "#1a1a1a" }];
    const tech = Math.min(40 + sl * 5, 60);
    const strat = Math.min(30 + sl * 2, 30);
    const exec = Math.max(100 - tech - strat, 10);
    return [
      { label: "Core Capabilities", value: tech, color: "#3b82f6" },
      { label: "Strategy", value: strat, color: "#f59e0b" },
      { label: "Execution", value: exec, color: "#10b981" },
    ];
  }, [skills.length]);

  // ── Links ─────────────────────────────────────────────────────────────────
  const LINKS = [
    { key: "github", icon: Github, color: "#fff", label: "GitHub" },
    { key: "linkedin", icon: Linkedin, color: "#0a66c2", label: "LinkedIn" },
    { key: "twitter", icon: Twitter, color: "#1da1f2", label: "Twitter" },
    { key: "youtube", icon: Youtube, color: "#ff0000", label: "YouTube" },
    { key: "instagram", icon: Instagram, color: "#e1306c", label: "Instagram" },
    { key: "website", icon: Globe, color: "#888", label: "Website" },
  ];
  const activeLinks = LINKS.filter((l) => profileData?.links?.[l.key]);

  // ── Alliance action ───────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (isGuest) {
      navigate("/");
      return;
    }
    if (!targetId || !viewerData?.uid) return;
    try {
      const myRef = doc(db, "users", viewerData.uid);
      const targetRef = doc(db, "users", targetId);
      const batch = writeBatch(db);
      batch.update(myRef, { outboundRequests: arrayUnion(targetId) });
      batch.update(targetRef, { inboundRequests: arrayUnion(viewerData.uid) });
      await batch.commit();
      setAllyStatus("sent");
      showToast("Alliance request sent!", "green");
    } catch (error) {
      console.error("[PublicProfile] Alliance request failed:", error);
      showToast("Request failed.", "red");
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportMenu(false);
    showToast("Compiling DCI document…", "default");
    try {
      const blob = await pdf(
        <DCIExportTemplate
          data={{
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
          }}
          initials={initials}
          level={level}
          skills={skills}
          assetsCount={verifiedVault.length}
          alliesCount={alliesCount}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${firstName}_${lastName}_Discotive_DCI.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("DCI PDF ready.", "green");
    } catch (e) {
      console.error(e);
      showToast("Export failed.", "red");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(`https://discotive.com/@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast("Profile link copied!", "green");
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.4, 1, 0.4] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
              className="w-1 h-6 bg-amber-500 rounded-full origin-bottom"
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

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-amber-500/30 pb-24 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500 opacity-[0.03] blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-6 md:py-10 relative z-10 space-y-4">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/app"
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white transition-colors uppercase tracking-widest"
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
            {/* Export menu */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenu((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[10px] font-black text-[#666] hover:text-white uppercase tracking-widest rounded-xl transition-colors"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Export
              </button>
              <AnimatePresence>
                {exportMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 top-[calc(100%+8px)] w-48 bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden p-2"
                  >
                    <button
                      onClick={handleExportPDF}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-white hover:bg-[#111] rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4 text-amber-500" /> Download
                      DCI{" "}
                      <span className="ml-auto text-[9px] text-[#555]">
                        .PDF
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Share */}
            <button
              onClick={handleShareLink}
              className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[10px] font-black text-[#666] hover:text-white uppercase tracking-widest rounded-xl transition-colors"
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

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-[#111] border border-[#222] flex items-center justify-center text-3xl font-black text-white shadow-xl">
                {initials}
              </div>
              {profileData?.tier === "PRO" && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 border-2 border-[#030303] flex items-center justify-center">
                  <Crown className="w-3 h-3 text-black" />
                </div>
              )}
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
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
                {niche !== "—" && (
                  <span className="text-[#444]"> · {niche}</span>
                )}
              </p>

              <div className="flex flex-wrap gap-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Award className="w-3 h-3 text-amber-500/50" />
                  Level {level}
                </span>
                {rank && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-500/50" />
                    Rank #{rank} Global
                  </span>
                )}
              </div>

              {bio && (
                <p className="mt-4 text-sm text-[#777] leading-relaxed max-w-2xl">
                  {bio}
                </p>
              )}
            </div>

            {/* Right: score ring + CTA */}
            <div className="flex flex-col items-center gap-4 shrink-0">
              <ScoreRing score={score} size={110} />

              {!isMe && (
                <div className="flex flex-col gap-2 w-full">
                  {allyStatus === "none" && (
                    <button
                      onClick={handleConnect}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ddd] transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Connect
                    </button>
                  )}
                  {allyStatus === "sent" && (
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/[0.08] text-[10px] font-black text-[#666] uppercase tracking-widest rounded-xl">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Request
                      Sent
                    </div>
                  )}
                  {allyStatus === "allied" && (
                    <div className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest rounded-xl">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Allied
                    </div>
                  )}
                  {isGuest && (
                    <Link
                      to="/"
                      className="text-[9px] text-[#444] hover:text-[#666] transition-colors text-center"
                    >
                      Sign in to connect
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats strip ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
          {[
            {
              label: "Score",
              val: score.toLocaleString(),
              icon: Zap,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/15",
            },
            {
              label: "Level",
              val: `Lv ${level}`,
              icon: Award,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "border-amber-500/15",
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
          ].map(({ label, val, icon: IconComp, color, bg, border }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border",
                bg,
                border,
              )}
            >
              <IconComp className={cn("w-4 h-4 shrink-0", color)} />
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

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4">
          {/* Operator Radar — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col">
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-5">
              <Target className="w-3.5 h-3.5 text-amber-400" /> Operator Radar
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-[200px] aspect-square mx-auto mb-4">
                <RadarChart data={radarData} labels={radarLabels} />
              </div>
              <div className="w-full space-y-1.5">
                {radarLabels.map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 w-20 shrink-0 font-bold uppercase tracking-widest">
                      {label}
                    </span>
                    <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500/60 rounded-full"
                        style={{ width: `${radarData[i]}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-black font-mono text-white/30 w-6 text-right">
                      {Math.round(radarData[i])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Moat Distribution — xl:col-span-4 */}
          <div className="md:col-span-1 xl:col-span-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6 flex flex-col">
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-5">
              <PieChart className="w-3.5 h-3.5 text-blue-400" /> Moat
              Distribution
            </h3>
            {skills.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                <PieChart className="w-8 h-8 text-white/10" />
                <p className="text-[10px] text-white/20">
                  Skills not yet declared.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-5">
                <DonutChart
                  segments={moatSegments}
                  centerLabel={skills.length}
                  centerSub="Skills"
                  size={130}
                />
                <div className="space-y-2 w-full">
                  {moatSegments.map((seg) => (
                    <div
                      key={seg.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: seg.color }}
                        />
                        <span className="text-[10px] text-white/40 font-bold">
                          {seg.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-black font-mono text-white/40">
                        {seg.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Trajectory + rank — xl:col-span-4 */}
          <div className="md:col-span-2 xl:col-span-4 flex flex-col gap-4">
            {/* Global rank card */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 relative overflow-hidden flex-1">
              {rank <= 10 && (
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-amber-500 opacity-[0.06] blur-3xl rounded-full pointer-events-none" />
              )}
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Star className="w-3.5 h-3.5 text-amber-400" /> Global Rank
              </h3>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    "text-5xl font-black font-mono",
                    rank <= 3
                      ? "text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                      : "text-white",
                  )}
                >
                  #{rank || "—"}
                </span>
                {rank <= 3 && (
                  <Crown className="w-7 h-7 text-amber-500 animate-pulse" />
                )}
              </div>
              <p className="text-[9px] text-white/20 mt-2 uppercase tracking-widest">
                {rank <= 10
                  ? "Elite Tier · Top 10 globally"
                  : rank <= 100
                    ? "Advanced Tier · Top 100"
                    : "Active Operator"}
              </p>
            </div>

            {/* Trajectory */}
            {(profileData?.vision?.goal3Months ||
              profileData?.vision?.endgame) && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 flex-1">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Target className="w-3.5 h-3.5 text-indigo-400" /> Trajectory
                </h3>
                {profileData?.vision?.goal3Months && (
                  <div className="mb-3">
                    <p className="text-[8px] text-white/20 uppercase tracking-widest mb-1">
                      90-Day Target
                    </p>
                    <p className="text-sm text-[#888] leading-relaxed">
                      {profileData.vision.goal3Months}
                    </p>
                  </div>
                )}
                {profileData?.vision?.endgame && (
                  <div>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest mb-1">
                      Endgame
                    </p>
                    <p className="text-xs text-[#555] leading-relaxed">
                      {profileData.vision.endgame}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Verified Vault — xl:col-span-6 */}
          <div className="md:col-span-2 xl:col-span-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                <FolderLock className="w-3.5 h-3.5 text-emerald-400" /> Proof of
                Work
              </h3>
              <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                {verifiedVault.length} Verified
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
                {verifiedVault.slice(0, 6).map((asset, i) => (
                  <VaultAsset key={i} asset={asset} />
                ))}
                {verifiedVault.length > 6 && (
                  <p className="text-[9px] text-center text-white/20 pt-2">
                    +{verifiedVault.length - 6} more verified assets
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Skills + Academic — xl:col-span-6 */}
          <div className="md:col-span-2 xl:col-span-6 space-y-4">
            {/* Skills */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
              <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-4">
                <Terminal className="w-3.5 h-3.5 text-white/40" /> Capabilities
              </h3>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-[#111] border border-[#1a1a1a] rounded-xl text-[11px] font-bold text-[#aaa] cursor-default"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#444]">Skills not declared.</p>
              )}
            </div>

            {/* Academic */}
            {institution && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <GraduationCap className="w-3.5 h-3.5 text-sky-400" />{" "}
                  Academic Baseline
                </h3>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {institution}
                    </p>
                    <p className="text-xs text-[#666] mt-0.5">
                      {degree || ""}
                      {major ? ` · ${major}` : ""}
                    </p>
                    {gradYear && (
                      <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest mt-2">
                        Class of {gradYear}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Digital footprint */}
            {activeLinks.length > 0 && (
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-6">
                <h3 className="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Globe className="w-3.5 h-3.5 text-white/40" /> Digital
                  Presence
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activeLinks.map(({ key, label, icon: IconComp, color }) => (
                    <a
                      key={key}
                      href={profileData.links[key]}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl hover:border-[#333] transition-colors"
                    >
                      <IconComp className="w-3.5 h-3.5" style={{ color }} />
                      <span className="text-[10px] font-bold text-[#888]">
                        {label}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-[#444]" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Discotive branding footer ────────────────────────────────── */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo-no-bg-white.png"
              alt="Discotive"
              className="w-6 h-6 object-contain opacity-60"
            />
            <div>
              <p className="text-xs font-black text-white/50">
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
              className="text-[9px] font-black text-amber-500/60 hover:text-amber-500 transition-colors uppercase tracking-widest"
            >
              Join Discotive →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Toast ──────────────────────────────────────────────────────── */}
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
