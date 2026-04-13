/**
 * @fileoverview Discotive OS — Command Center v8 "Cinematic Engine"
 * @architecture 75/25 Stage/HUD split on PC. Swipeable carousel + snap swimlanes on mobile.
 * @author Principal Engineer, Discotive
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
  useId,
} from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData, useOnboardingGate } from "../hooks/useUserData";
import {
  useDashboardCore,
  useScoreHistory,
  usePercentiles,
} from "../hooks/useDashboardData";
import { useTelemetryStream } from "../hooks/useTelemetryStream";
import TierGate from "../components/TierGate";
import DailyExecutionLedger from "../components/DailyExecutionLedger";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import {
  Activity,
  Database,
  Zap,
  Target,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Crown,
  Loader2,
  Eye,
  Flame,
  ChevronLeft,
  ChevronRight,
  Users,
  Sparkles,
  CheckCircle2,
  Shield,
  AlertTriangle,
  Crosshair,
  Award,
  FileText,
  Lock,
  Upload,
  Briefcase,
  Star,
  BarChart2,
  Radio,
  Network,
} from "lucide-react";
import { cn } from "../lib/cn";

// ─── Design tokens (never deviate) ───────────────────────────────────────────
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

// ─── Motion presets ───────────────────────────────────────────────────────────
const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay },
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS — all memo'd to prevent cascade re-renders
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Skeleton loader atom ─────────────────────────────────────────────────────
const Skeleton = memo(({ className }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    className={cn("rounded-lg", className)}
    style={{
      background: `linear-gradient(90deg, ${V.surface}, ${V.elevated}, ${V.surface})`,
    }}
  />
));

// ─── Section micro-label ─────────────────────────────────────────────────────
const SectionLabel = memo(({ icon: Icon, color = G.base, children }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon style={{ color, width: 13, height: 13 }} />}
    <span
      className="text-[9px] font-bold uppercase tracking-[0.2em]"
      style={{ color: T.dim }}
    >
      {children}
    </span>
  </div>
));

// ─── Orbital Ring Chart (SVG, Apple Watch-style) ─────────────────────────────
const OrbitalRings = memo(({ score, lastScore = 0, globalPct, domainPct }) => {
  const shouldReduce = useReducedMotion();
  const outerR = 70;
  const innerR = 52;
  const stroke = 7;
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;

  // Psychological Hack: Start count-up from their last known score, not zero.
  // If lastScore > score (penalty), start at lastScore and tick down.
  const [displayScore, setDisplayScore] = useState(lastScore);
  useEffect(() => {
    let startTime;
    const duration = 800; // 800ms for a satisfying climb
    const diff = score - lastScore;

    // If no change, or first load with no last score, just show current
    if (diff === 0 || lastScore === 0) {
      setDisplayScore(score);
      return;
    }

    const animate = (time) => {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayScore(Math.floor(lastScore + diff * easeProgress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score, lastScore]);

  const buildArc = (r, pct) => {
    const circ = 2 * Math.PI * r;
    const filled = Math.max(0, Math.min(1, (100 - pct) / 100));
    return { circ, offset: circ - filled * circ };
  };

  const outer = buildArc(outerR, globalPct);
  const inner = buildArc(innerR, domainPct);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <motion.svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
        animate={{ rotate: [-90, 270] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {/* Track rings */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={stroke}
        />

        {/* Global ring (outer) */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke={G.bright}
          strokeWidth={stroke}
          strokeDasharray={outer.circ}
          strokeDashoffset={shouldReduce ? outer.offset : outer.circ}
          strokeLinecap="round"
          style={
            !shouldReduce
              ? {
                  transition:
                    "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s",
                  strokeDashoffset: outer.offset,
                }
              : {}
          }
        />
        {/* Domain ring (inner) */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="rgba(245,240,232,0.45)"
          strokeWidth={stroke}
          strokeDasharray={inner.circ}
          strokeDashoffset={shouldReduce ? inner.offset : inner.circ}
          strokeLinecap="round"
          style={
            !shouldReduce
              ? {
                  transition:
                    "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.6s",
                  strokeDashoffset: inner.offset,
                }
              : {}
          }
        />
      </motion.svg>

      {/* Center score */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="font-display font-black leading-none text-[28px]"
          style={{
            color: T.primary,
            letterSpacing: "-0.03em",
            textShadow: "0 0 20px rgba(191,162,100,0.4)",
          }}
        >
          {displayScore >= 1000
            ? `${(displayScore / 1000).toFixed(1)}K`
            : displayScore.toLocaleString()}
        </span>
        <span
          className="text-[8px] font-bold uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Score
        </span>
      </div>
    </div>
  );
});

// ─── Consistency LED matrix ───────────────────────────────────────────────────
const ConsistencyMatrix = memo(({ userData }) => {
  const [hoveredPill, setHoveredPill] = useState(null);

  const pills = useMemo(() => {
    const active = new Set();
    (userData?.consistency_log || []).forEach((s) => {
      if (typeof s === "string") active.add(s.split("T")[0]);
    });
    (userData?.login_history || []).forEach((s) => {
      if (typeof s === "string") active.add(s.split("T")[0]);
    });
    const last = userData?.discotiveScore?.lastLoginDate;
    if (last) active.add(last.split("T")[0]);

    const now = new Date();
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (27 - i));
      const str = d.toISOString().split("T")[0];
      // Generate a deterministic random duration for breathing effect
      const breatheDuration = 2 + (Math.sin(i) * 0.5 + 0.5) * 2;
      return { str, on: active.has(str), breatheDuration, id: i };
    });
  }, [userData]);

  return (
    <div>
      <SectionLabel icon={BarChart2} color={G.base}>
        Consistency Engine
      </SectionLabel>
      <div className="flex items-center justify-between">
        {pills.map((p) => (
          <div
            key={p.id}
            className="relative flex justify-center cursor-crosshair"
            style={{ padding: "0 4px" }} // Wider padding for easier target acquisition
            onMouseEnter={() => setHoveredPill(p.id)}
            onMouseLeave={() => setHoveredPill(null)}
          >
            {/* Cinematic Hover Tooltip (Framer Motion driven) */}
            <AnimatePresence>
              {hoveredPill === p.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full mb-2 bg-[#050505] border border-[#BFA264]/40 text-[#BFA264] text-[10px] font-mono font-bold px-2.5 py-1 rounded shadow-[0_10px_30px_rgba(0,0,0,0.9)] pointer-events-none whitespace-nowrap z-50"
                >
                  {new Date(p.str).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              className="rounded-full"
              animate={
                p.on
                  ? {
                      opacity: [0.6, 1, 0.6],
                      boxShadow: [
                        `0 0 4px ${G.base}`,
                        `0 0 12px ${G.bright}`,
                        `0 0 4px ${G.base}`,
                      ],
                    }
                  : {}
              }
              transition={{
                duration: p.breatheDuration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: "4px",
                height: p.on ? "24px" : "12px",
                background: p.on ? G.bright : "rgba(255,255,255,0.06)",
                opacity: p.on ? 1 : 0.3,
              }}
              aria-label={`${p.str}: ${p.on ? "active" : "inactive"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Global ticker (vertical scroll) ─────────────────────────────────────────
const GlobalTicker = memo(({ events }) => {
  const items =
    events.length > 0
      ? events
      : [{ id: "init", text: "⚡ Awaiting live arena signal…" }];

  return (
    <div>
      <SectionLabel icon={Radio} color={G.base}>
        Live Signal
      </SectionLabel>
      <div className="overflow-hidden" style={{ height: 120 }}>
        <motion.div
          animate={{ y: ["0%", `-${(items.length - 3) * 33.33}%`] }}
          transition={{
            duration: items.length * 3,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          {[...items, ...items].map((e, i) => (
            <div key={`${e.id}_${i}`} className="flex items-start gap-2 py-1.5">
              <div
                className="mt-1.5 rounded-full shrink-0"
                style={{
                  width: 5,
                  height: 5,
                  background: G.base,
                  opacity: 0.7,
                }}
              />
              <span
                className="text-[10px] font-mono leading-snug"
                style={{ color: T.dim }}
              >
                {e.text}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
});

// ─── HUD Metric pill ─────────────────────────────────────────────────────────
const HUDMetric = memo(({ label, value, sub, accent }) => (
  <div className="w-full flex flex-col items-center justify-center text-center gap-1 bg-[#080808] border border-[#1a1a1a] rounded-xl p-3 shadow-inner">
    <span
      className="text-[8px] font-black uppercase tracking-[0.2em]"
      style={{ color: "#666" }}
    >
      {label}
    </span>
    <span
      className="font-display font-black text-2xl leading-none"
      style={{ color: accent || T.primary }}
    >
      {value}
    </span>
    {sub && (
      <span
        className="text-[7px] font-bold uppercase tracking-widest mt-0.5"
        style={{ color: "#555" }}
      >
        {sub}
      </span>
    )}
  </div>
));

// ─── Sparkline Chart Component ────────────────────────────────────────────────
const SparklineChart = memo(({ tf, setTf, chartData, chartMin }) => (
  <div className="flex flex-col gap-2 p-4 bg-[#080808] border border-[#1a1a1a] rounded-2xl relative overflow-hidden shadow-inner">
    <div className="flex items-center justify-between relative z-10">
      <span className="text-[9px] font-black uppercase tracking-widest text-[#666]">
        Score Velocity
      </span>
      <div className="flex gap-1 bg-[#111] p-1 rounded-lg border border-[#222]">
        {["24H", "1W", "1M", "ALL"].map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={cn(
              "text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all",
              tf === t
                ? "bg-[#BFA264]/15 text-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.2)]"
                : "text-[#555] hover:text-[#888]",
            )}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
    {/* Expanded height + internal chart margin to prevent stroke clipping */}
    <div
      className="w-full mt-4"
      style={{ height: "128px", minHeight: "128px" }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, bottom: 8, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#BFA264" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#BFA264" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[chartMin, "auto"]} hide />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#BFA264"
            strokeWidth={2}
            fill="url(#sparkGradient)"
            isAnimationActive={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
));

// ─── Mini Radial Ring (for Position Matrix) ───────────────────────────────────
const MiniRadialRing = memo(
  ({ pct = 100, size = 48, stroke = 4, color = "#BFA264", label }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const fillFraction = Math.max(0, Math.min(1, (100 - pct) / 100));
    const offset = circ - fillFraction * circ;

    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={pct <= 100 ? color : "rgba(255,255,255,0.1)"}
              strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[8px] font-black text-white leading-none">
              {pct === 100 ? "–" : `${pct}%`}
            </span>
          </div>
        </div>
        <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest text-center leading-tight max-w-[50px]">
          {label}
        </p>
      </div>
    );
  },
);

// ─── HUD Panel (fixed right 25%) ──────────────────────────────────────────────
const HUDPanel = memo(
  ({
    score,
    lastScore, // Injected to feed OrbitalRings
    globalPct,
    domainPct,
    streak,
    level,
    levelPct,
    ptsToNext,
    isPro,
    delta,
    lbRank,
    lbFilter,
    telemetryEvents,
    userData,
    chartTf,
    setChartTf,
    chartData,
    chartMin,
  }) => {
    // Derive Percentiles for Position Matrix
    const percentiles = {
      global: globalPct,
      domain: domainPct,
      niche: userData?.precomputed?.nichePercentile || 100, // Fallback if missing
      parallel: userData?.precomputed?.parallelPercentile || 100,
    };

    return (
      <div
        className="h-full flex flex-col gap-6 overflow-y-auto custom-scrollbar"
        style={{ padding: "32px 24px 120px" }}
        aria-label="Metrics HUD"
      >
        {/* Orbital rings */}
        <div className="flex flex-col items-center gap-3">
          <OrbitalRings
            score={score}
            lastScore={lastScore}
            globalPct={globalPct}
            domainPct={domainPct}
          />

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{ width: 6, height: 6, background: G.bright }}
              />
              <span className="text-[9px]" style={{ color: T.dim }}>
                Global Top {globalPct === 100 ? "—" : `${globalPct}%`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "rgba(245,240,232,0.45)",
                }}
              />
              <span className="text-[9px]" style={{ color: T.dim }}>
                Domain Top {domainPct === 100 ? "—" : `${domainPct}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Sparkline Score Chart (Replaces 24H Delta) */}
        <SparklineChart
          tf={chartTf}
          setTf={setChartTf}
          chartData={chartData}
          chartMin={chartMin}
        />

        {/* Position Matrix (Mini Radials) */}
        <div>
          <SectionLabel icon={Target} color="#38bdf8">
            Position Matrix
          </SectionLabel>
          <div className="flex items-center justify-between px-2">
            <MiniRadialRing
              pct={percentiles.global}
              label="Global"
              color="#BFA264"
            />
            <MiniRadialRing
              pct={percentiles.domain}
              label="Domain"
              color="#10b981"
            />
            <MiniRadialRing
              pct={percentiles.niche}
              label="Niche"
              color="#38bdf8"
            />
            <MiniRadialRing
              pct={percentiles.parallel}
              label="Path"
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 mt-2">
          <HUDMetric
            label="Rank"
            value={lbRank === "?" ? "—" : `#${lbRank}`}
            sub={lbFilter}
            accent={G.bright}
          />
          <HUDMetric
            label="Streak"
            value={streak}
            sub="days"
            accent={streak >= 7 ? G.bright : T.secondary}
          />
          <HUDMetric label="Level" value={level} sub="Current" />
        </div>

        {/* Level bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              Level Progress
            </span>
            <span
              className="text-[9px] font-black font-mono"
              style={{ color: G.base }}
            >
              {Math.round(levelPct)}%
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 3, background: "rgba(255,255,255,0.05)" }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelPct}%` }}
              transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${G.deep}, ${G.bright})`,
                boxShadow: `0 0 8px rgba(191,162,100,0.5)`,
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Consistency matrix */}
        <ConsistencyMatrix userData={userData} />

        {/* Streak Milestones (Added below Consistency) */}
        <div className="grid grid-cols-3 gap-2 mt-[-8px]">
          {[
            { target: 7, icon: "⚡", label: "7D Lock", color: "amber" },
            { target: 14, icon: "🔥", label: "14D Blaze", color: "orange" },
            { target: 30, icon: "💎", label: "30D Elite", color: "sky" },
          ].map(({ target, icon, label, color }) => {
            const hit = streak >= target;
            return (
              <div
                key={target}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all",
                  hit
                    ? color === "amber"
                      ? "bg-[#BFA264]/10 border-[#BFA264]/25"
                      : color === "orange"
                        ? "bg-orange-500/10 border-orange-500/25"
                        : "bg-sky-500/10 border-sky-500/25"
                    : "bg-white/[0.02] border-white/[0.04]",
                )}
              >
                <span className="text-lg leading-none mb-1 opacity-80">
                  {hit ? icon : "🔒"}
                </span>
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    hit
                      ? color === "amber"
                        ? "text-[#BFA264]"
                        : color === "orange"
                          ? "text-orange-400"
                          : "text-sky-400"
                      : "text-white/20",
                  )}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        {/* Global ticker anchored to bottom of HUD */}
        <GlobalTicker events={telemetryEvents} />
      </div>
    );
  },
);

// ─── Hero Directive Banner (Kinetic Carousel) ──────────────────────────────────
const HeroDirective = memo(({ userData, vaultCount, isPro, navigate }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const score = userData?.discotiveScore?.current ?? 0;
  const last24h = userData?.discotiveScore?.last24h ?? score;
  const rankDropped = score < last24h && last24h - score > 5;
  const hasVault = vaultCount > 0;

  const slides = useMemo(() => {
    const s = [];
    // Slide 1: Primary Directive
    if (rankDropped) {
      s.push({
        id: "threat",
        label: "THREAT DETECTED",
        headline: "DEFEND YOUR RANK",
        sub: `Your score dropped ${last24h - score} pts in the last 24h. Rivals are closing in.`,
        cta: "Reclaim Position",
        ctaFn: () => navigate("/app/arena"),
        accent: "#F87171",
        glow: "rgba(248,113,113,0.15)",
        icon: AlertTriangle,
      });
    } else if (!hasVault) {
      s.push({
        id: "vault",
        label: "VAULT EMPTY",
        headline: "ESTABLISH PROOF",
        sub: "Your proof-of-work archive is empty. Upload credentials to build an unbreakable foundation.",
        cta: "Upload Proof",
        ctaFn: () => navigate("/app/vault"),
        accent: G.bright,
        glow: "rgba(191,162,100,0.12)",
        icon: Shield,
      });
    } else {
      s.push({
        id: "exec",
        label: "EXECUTING",
        headline: "MAINTAIN VELOCITY",
        sub: `Current score: ${score.toLocaleString()} pts. Consistent execution is the only path.`,
        cta: "View Arena",
        ctaFn: () => navigate("/app/arena"),
        accent: G.bright,
        glow: "rgba(191,162,100,0.12)",
        icon: Zap,
      });
    }

    // Slide 2: Network Intelligence
    s.push({
      id: "network",
      label: "NETWORK INTEL",
      headline: "EXPAND SYNDICATE",
      sub: "New elite operators have entered your domain. Form alliances to strengthen your network graph.",
      cta: "Scan Radar",
      ctaFn: () => navigate("/app/connective"),
      accent: "#38bdf8",
      glow: "rgba(56,189,248,0.12)",
      icon: Network,
    });

    return s;
  }, [rankDropped, hasVault, score, last24h, navigate]);

  const activeSlide = slides[activeIdx];
  const Icon = activeSlide.icon;

  useEffect(() => {
    const t = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, 8000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <motion.div
      className="relative flex flex-col justify-end w-full overflow-hidden"
      style={{ minHeight: "55vh", padding: "0 0 50px 0" }}
      role="banner"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          {/* Volumetric background mesh */}
          <div
            className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] opacity-50 mix-blend-screen blur-[100px]"
            style={{
              background: `radial-gradient(circle at 30% 40%, ${activeSlide.glow}, transparent 50%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, ${V.bg} 90%)`,
            }}
          />
          <Icon
            className="absolute -right-10 top-10 opacity-[0.03] transform rotate-12"
            size={500}
            style={{ color: activeSlide.accent }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 w-full pl-8 md:pl-12 flex items-end justify-between pr-8 md:pr-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <Icon size={12} style={{ color: activeSlide.accent }} />
              <span
                className="text-[10px] font-black uppercase tracking-[0.3em]"
                style={{ color: activeSlide.accent }}
              >
                {activeSlide.label}
              </span>
            </div>

            <h1
              className="font-display font-black leading-none mb-4"
              style={{
                fontSize: "clamp(2rem, 5vw, 4rem)",
                letterSpacing: "-0.03em",
                color: T.primary,
                textShadow: "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {activeSlide.headline}
            </h1>

            <p
              className="text-sm md:text-base leading-relaxed mb-8 max-w-lg font-light"
              style={{ color: T.secondary }}
            >
              {activeSlide.sub}
            </p>

            <button
              onClick={activeSlide.ctaFn}
              className="inline-flex items-center justify-center gap-3 font-black text-xs px-8 py-3.5 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                background: T.primary,
                color: V.bg,
                boxShadow: `0 0 30px rgba(255,255,255,0.1)`,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {activeSlide.cta}
              <ArrowUpRight size={14} strokeWidth={3} />
            </button>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Controls */}
        <div className="hidden md:flex gap-2">
          <button
            onClick={() =>
              setActiveIdx((p) => (p === 0 ? slides.length - 1 : p - 1))
            }
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setActiveIdx((p) => (p + 1) % slides.length)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Vault Arsenal card (Netflix poster style) ────────────────────────────────
const VaultCard = memo(({ asset, idx }) => {
  const categoryIcons = {
    resume: FileText,
    certificate: Award,
    project: Briefcase,
    github: Target,
    linkedin: Network,
    default: Database,
  };
  const Icon =
    categoryIcons[asset.category?.toLowerCase()] || categoryIcons.default;
  const isVerified = asset.verificationStatus === "verified";

  return (
    <motion.div
      {...FADE_UP(idx * 0.06)}
      className="shrink-0 relative cursor-pointer group"
      style={{
        width: 180,
        height: 280, // Taller, cinematic aspect ratio
        scrollSnapAlign: "start",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Vault asset: ${asset.title || asset.category}`}
    >
      {/* Edge-to-edge Gradient Background (No Border, No Radius) */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, ${V.depth} 40%, ${V.elevated} 100%)`,
          opacity: 0.6,
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-500 opacity-0 group-hover:opacity-100"
        style={{
          background: isVerified
            ? "linear-gradient(to top, rgba(74,222,128,0.15) 0%, transparent 100%)"
            : `linear-gradient(to top, ${G.dimBg} 0%, transparent 100%)`,
        }}
      />

      {/* Verified badge */}
      {isVerified && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(74,222,128,0.15)",
            border: "1px solid rgba(74,222,128,0.3)",
          }}
        >
          <CheckCircle2 size={8} style={{ color: "#4ADE80" }} />
          <span
            className="text-[7px] font-black uppercase tracking-wider"
            style={{ color: "#4ADE80" }}
          >
            Verified
          </span>
        </div>
      )}

      {/* Massive Watermark Icon */}
      <div className="absolute -right-4 -bottom-4 opacity-[0.07] group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none">
        <Icon size={160} style={{ color: G.base }} />
      </div>

      {/* Bottom metadata */}
      <div
        className="absolute bottom-0 left-0 right-0 p-5"
        style={{
          background:
            "linear-gradient(0deg, rgba(3,3,3,1) 0%, rgba(3,3,3,0.8) 40%, transparent 100%)",
        }}
      >
        <p
          className="text-xs font-black leading-tight line-clamp-2"
          style={{ color: T.primary }}
        >
          {asset.title || asset.category || "Asset"}
        </p>
        <p
          className="text-[9px] mt-2 font-bold uppercase tracking-[0.2em]"
          style={{ color: G.base }}
        >
          {asset.category || "Credential"}
        </p>
      </div>
    </motion.div>
  );
});

// ─── Rival card ───────────────────────────────────────────────────────────────
const RivalCard = memo(({ rival, userScore, idx }) => {
  const isAbove = rival.score > userScore;
  const diff = Math.abs(rival.score - userScore);

  return (
    <motion.div
      {...FADE_UP(idx * 0.07)}
      className="shrink-0 relative cursor-pointer group"
      style={{
        width: 220,
        height: 320, // Monumental scale
        background: V.depth, // Raw background
        scrollSnapAlign: "start",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={`Rival: ${rival.username || "Operator"}`}
    >
      {/* Hover illumination bleed */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${isAbove ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)"} 0%, transparent 100%)`,
        }}
      />
      {/* Giant rank watermark */}
      <span
        className="absolute -bottom-4 -right-2 font-display font-black select-none pointer-events-none leading-none"
        style={{
          fontSize: 96,
          color: "rgba(255,255,255,0.03)",
          letterSpacing: "-0.05em",
        }}
      >
        {rival.rank}
      </span>

      <div className="relative z-10 p-4 flex flex-col h-full">
        {/* Status indicator */}
        <div
          className="self-start flex items-center gap-1.5 px-2 py-0.5 rounded-full mb-3"
          style={{
            background: isAbove
              ? "rgba(248,113,113,0.1)"
              : "rgba(74,222,128,0.1)",
            border: `1px solid ${isAbove ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
          }}
        >
          {isAbove ? (
            <TrendingDown size={8} style={{ color: "#F87171" }} />
          ) : (
            <TrendingUp size={8} style={{ color: "#4ADE80" }} />
          )}
          <span
            className="text-[7px] font-black uppercase tracking-wider"
            style={{ color: isAbove ? "#F87171" : "#4ADE80" }}
          >
            {isAbove ? "Above" : "Below"} you
          </span>
        </div>

        {/* Rank */}
        <span
          className="font-display font-black text-3xl leading-none mb-1"
          style={{ color: G.bright, letterSpacing: "-0.04em" }}
        >
          #{rival.rank}
        </span>

        {/* Username */}
        <span
          className="text-sm font-bold truncate leading-tight mb-1"
          style={{ color: T.primary }}
        >
          {rival.username || "Operator"}
        </span>

        <span className="text-[9px]" style={{ color: T.dim }}>
          {rival.domain || "General"}
        </span>

        <div className="mt-auto">
          <span
            className="text-[10px] font-black font-mono"
            style={{ color: isAbove ? "#F87171" : "#4ADE80" }}
          >
            {isAbove ? "-" : "+"}
            {diff.toLocaleString()} pts
          </span>
        </div>
      </div>
    </motion.div>
  );
});

// ─── Horizontal swimlane wrapper ──────────────────────────────────────────────
const Swimlane = memo(
  ({
    label,
    icon: Icon,
    iconColor,
    cta,
    ctaLink,
    children,
    isEmpty,
    emptyTitle,
    emptySub,
    emptyCtaLabel,
    emptyCtaLink,
  }) => {
    const scrollRef = useRef(null);

    const scroll = useCallback((dir) => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollBy({ left: dir * 300, behavior: "smooth" });
    }, []);

    const handleKeyDown = useCallback(
      (e) => {
        if (e.key === "ArrowRight") scroll(1);
        if (e.key === "ArrowLeft") scroll(-1);
      },
      [scroll],
    );

    return (
      <section
        className="relative"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        aria-label={label}
      >
        {/* Lane header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={13} style={{ color: iconColor || G.base }} />}
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: T.dim }}
            >
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isEmpty && (
              <>
                <button
                  onClick={() => scroll(-1)}
                  className="p-1.5 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: T.dim }}
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => scroll(1)}
                  className="p-1.5 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: T.dim }}
                  aria-label="Scroll right"
                >
                  <ChevronRight size={13} />
                </button>
              </>
            )}
            {cta && ctaLink && (
              <Link
                to={ctaLink}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all"
                style={{ color: G.base }}
                aria-label={`${cta} — ${label}`}
              >
                {cta} <ArrowUpRight size={10} />
              </Link>
            )}
          </div>
        </div>

        {isEmpty ? (
          // Ghosted Wireframe Empty State
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full overflow-hidden py-4"
          >
            <div className="flex gap-4 opacity-30 pointer-events-none select-none mask-image-fade-right">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shrink-0 border border-dashed rounded-[1rem] flex items-center justify-center"
                  style={{
                    width: 180,
                    height: 280,
                    borderColor: "rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                    <span className="text-white/20 font-black">+</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex flex-col items-start justify-center pl-8 z-10 bg-gradient-to-r from-[#030303] via-[#030303]/80 to-transparent">
              <span
                className="font-display font-black text-3xl leading-tight mb-2"
                style={{ color: T.primary, letterSpacing: "-0.02em" }}
              >
                {emptyTitle}
              </span>
              <p
                className="text-xs leading-relaxed max-w-sm mb-6"
                style={{ color: T.secondary }}
              >
                {emptySub}
              </p>
              {emptyCtaLink && emptyCtaLabel && (
                <Link
                  to={emptyCtaLink}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all px-5 py-2.5 rounded-full"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                  aria-label={emptyCtaLabel}
                >
                  {emptyCtaLabel} <ArrowUpRight size={12} />
                </Link>
              )}
            </div>
          </motion.div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-3 overflow-x-auto hide-scrollbar pb-1"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
            role="list"
            aria-label={`${label} items`}
          >
            {children}
          </div>
        )}
      </section>
    );
  },
);

// ─── Opportunity row ──────────────────────────────────────────────────────────
const OpportunityRow = memo(({ opp, idx }) => (
  <motion.div
    {...FADE_UP(idx * 0.04)}
    className="flex items-center justify-between py-4 cursor-pointer group"
    style={{
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}
    whileHover={{ x: 4 }}
    role="listitem"
    aria-label={`Opportunity: ${opp.title}`}
  >
    <div className="flex items-center gap-4 flex-1 min-w-0">
      {/* Match score pill */}
      <div
        className="shrink-0 rounded-full flex items-center justify-center font-display font-black text-[11px]"
        style={{
          width: 40,
          height: 40,
          background: `conic-gradient(${G.bright} ${opp.match}%, rgba(255,255,255,0.05) 0%)`,
          color: T.primary,
        }}
      >
        {opp.match}
      </div>

      <div className="min-w-0">
        <p
          className="font-bold text-sm truncate leading-tight"
          style={{ color: T.primary }}
        >
          {opp.title}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
          {opp.company || opp.domain} · {opp.type || "Opportunity"}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-3 shrink-0 ml-4">
      {opp.pointValue && (
        <span
          className="text-[10px] font-black font-mono"
          style={{ color: G.base }}
        >
          +{opp.pointValue} pts
        </span>
      )}
      <ArrowUpRight
        size={14}
        style={{ color: T.dim }}
        className="group-hover:opacity-100 opacity-30 transition-opacity"
      />
    </div>
  </motion.div>
));

// ─── Mobile HUD carousel slide ────────────────────────────────────────────────
const MobileHUDSlide = memo(({ children, label }) => (
  <div
    className="shrink-0 w-full"
    style={{ scrollSnapAlign: "start" }}
    role="tabpanel"
    aria-label={label}
  >
    {children}
  </div>
));

// ─── Skeleton screens ─────────────────────────────────────────────────────────
const DashboardSkeleton = memo(() => (
  <div className="min-h-screen" style={{ background: V.bg }}>
    <div className="flex h-screen">
      <div className="flex-1 p-8 space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 w-36 shrink-0" />
          ))}
        </div>
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-52 w-44 shrink-0" />
          ))}
        </div>
      </div>
      <div
        className="hidden lg:flex flex-col w-80 p-8 gap-6"
        style={{
          background: V.depth,
          borderLeft: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Skeleton className="h-44 w-44 rounded-full mx-auto" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  </div>
));

// ─── Addiction hook banner ────────────────────────────────────────────────────
const StreakRiskBanner = memo(({ streak, lastLoginDate }) => {
  const todayStr = new Date().toISOString().split("T")[0];
  const hasLoggedToday = lastLoginDate === todayStr;
  if (hasLoggedToday || streak === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between gap-4 px-5 py-3.5"
      style={{
        background: "rgba(248,113,113,0.07)",
        borderBottom: "1px solid rgba(248,113,113,0.2)",
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3">
        <Flame
          size={16}
          style={{ color: "#F87171" }}
          className="shrink-0 animate-pulse"
        />
        <span className="text-[11px] font-bold" style={{ color: T.secondary }}>
          Your{" "}
          <span className="font-black" style={{ color: "#F87171" }}>
            {streak}-day streak
          </span>{" "}
          expires at midnight. Log in to prevent a{" "}
          <span style={{ color: "#F87171" }}>−15 pt</span> penalty.
        </span>
      </div>
      <span
        className="text-[9px] font-black uppercase tracking-widest shrink-0 px-2.5 py-1 rounded-full"
        style={{
          background: "rgba(248,113,113,0.12)",
          border: "1px solid rgba(248,113,113,0.25)",
          color: "#F87171",
        }}
      >
        At Risk
      </span>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA LAYER — Rivals fetch (one-shot, not onSnapshot)
// ═══════════════════════════════════════════════════════════════════════════════
const useRivals = (userData, score) => {
  const [rivals, setRivals] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userData?.uid || score == null || fetchedRef.current) return;
    fetchedRef.current = true;

    const domain = userData?.identity?.domain || null;
    if (!domain) return;

    setLoading(true);
    const run = async () => {
      try {
        const ref = collection(db, "users");
        const constraints = [
          where("identity.domain", "==", domain),
          where("onboardingComplete", "==", true),
          orderBy("discotiveScore.current", "desc"),
          limit(20),
        ];
        const snap = await getDocs(query(ref, ...constraints));
        const all = snap.docs.map((d, i) => ({
          uid: d.id,
          rank: i + 1,
          score: d.data().discotiveScore?.current ?? 0,
          username: d.data().identity?.username || "Operator",
          domain: d.data().identity?.domain || domain,
        }));
        // Find user's rough position, grab 2 above and 2 below
        const userIdx = all.findIndex((r) => r.uid === userData.uid);
        const start = Math.max(0, userIdx - 2);
        const end = Math.min(all.length, userIdx + 3);
        const slice = all
          .slice(start, end)
          .filter((r) => r.uid !== userData.uid);
        setRivals(slice);
      } catch (e) {
        console.error("[useRivals]", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userData?.uid, score, userData?.identity?.domain]);

  return { rivals, loading };
};

// ─── Opportunities fetch (cached, one-shot) ───────────────────────────────────
const useOpportunities = (userData) => {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!userData?.uid || fetchedRef.current) return;
    fetchedRef.current = true;

    const domain = userData?.identity?.domain || null;
    if (!domain) return;

    setLoading(true);
    const run = async () => {
      try {
        const q = query(
          collection(db, "bounties"),
          where("domain", "==", domain),
          orderBy("createdAt", "desc"),
          limit(8),
        );
        const snap = await getDocs(q);
        setOpps(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            match: Math.floor(Math.random() * 25 + 75), // TODO: ML-driven match score
          })),
        );
      } catch {
        // Opportunities are non-critical
        setOpps([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userData?.uid, userData?.identity?.domain]);

  return { opps, loading };
};

// ─── Leaderboard rank ─────────────────────────────────────────────────────────
const useLbRank = (userData, score) => {
  const [rank, setRank] = useState("?");
  const [filter, setFilter] = useState("Global");

  useEffect(() => {
    if (!userData?.uid || score == null) return;
    let stale = false;
    const run = async () => {
      try {
        const domain = userData?.identity?.domain;
        const constraints = [where("discotiveScore.current", ">", score)];
        if (domain) {
          constraints.push(where("identity.domain", "==", domain));
          setFilter(domain.length > 16 ? domain.slice(0, 16) + "…" : domain);
        } else {
          setFilter("Global");
        }
        const snap = await getCountFromServer(
          query(collection(db, "users"), ...constraints),
        );
        if (!stale) setRank(snap.data().count + 1);
      } catch {
        if (!stale) setRank("—");
      }
    };
    run();
    return () => {
      stale = true;
    };
  }, [userData?.uid, score, userData?.identity?.domain]);

  return { rank, filter };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const { userData, loading: userLoading } = useUserData();
  const { requireOnboarding } = useOnboardingGate();
  const navigate = useNavigate();

  const telemetryEvents = useTelemetryStream(userData);

  // ── Core derived metrics ─────────────────────────────────────────────────
  const score = userData?.discotiveScore?.current ?? 0;
  const last24h = userData?.discotiveScore?.last24h ?? score;
  const delta = score - last24h;
  const streak = (() => {
    const s = userData?.discotiveScore?.streak || 0;
    const last = userData?.discotiveScore?.lastLoginDate;
    const today = new Date().toISOString().split("T")[0];
    return s === 0 && last === today ? 1 : s;
  })();
  const vaultAssets = userData?.vault || [];
  const vaultCount = vaultAssets.length;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const levelProgress = score % 1000;
  const levelPct = (levelProgress / 1000) * 100;
  const ptsToNext = 1000 - levelProgress;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const operatorName =
    userData?.identity?.firstName ||
    userData?.identity?.fullName?.split(" ")[0] ||
    "Operator";

  // ── Remote data ──────────────────────────────────────────────────────────
  const { data: percentilesData } = usePercentiles(score, userData);
  const globalPct = percentilesData?.global ?? 100;
  const domainPct = percentilesData?.domain ?? 100;

  const { rivals, loading: rivalsLoading } = useRivals(userData, score);
  const { opps, loading: oppsLoading } = useOpportunities(userData);
  const { rank: lbRank, filter: lbFilter } = useLbRank(userData, score);

  // ── Chart State ───────────────────────────────────────────────────────────
  const [chartTf, setChartTf] = useState("1W");
  const { data: rawHistory = [] } = useScoreHistory(chartTf);
  const chartData = useMemo(() => {
    return rawHistory.map((e) => ({ day: e.date, score: e.score }));
  }, [rawHistory]);
  const chartMin = useMemo(() => {
    if (!chartData.length) return 0;
    const vals = chartData.map((d) => d.score);
    const min = Math.min(...vals);
    return Math.max(0, min - Math.ceil((Math.max(...vals) - min) * 0.2 + 5));
  }, [chartData]);

  // ── HUD Toggle State ──────────────────────────────────────────────────────
  const [isHudOpen, setIsHudOpen] = useState(true);

  // ── Mobile HUD carousel index ─────────────────────────────────────────────
  const mobileHudRef = useRef(null);
  const [hudPage, setHudPage] = useState(0);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (userLoading) return <DashboardSkeleton />;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <Helmet>
        <title>
          {userData
            ? `${operatorName} | Command Center — Discotive`
            : "Command Center | Discotive"}
        </title>
        <meta
          name="description"
          content={`${operatorName}'s Discotive Command Center — Score ${score.toLocaleString()}, Level ${level}.`}
        />
        <meta
          property="og:title"
          content={`${operatorName} | Level ${level} Operator — Discotive`}
        />
        <meta
          property="og:description"
          content={`Discotive Score: ${score.toLocaleString()}. Global Top ${globalPct}%.`}
        />
      </Helmet>

      <div
        className="min-h-screen text-[#F5F0E8] font-body selection:bg-[rgba(191,162,100,0.3)] overflow-x-hidden"
        style={{ background: V.bg }}
      >
        {/* Streak risk banner */}
        <StreakRiskBanner
          streak={streak}
          lastLoginDate={userData?.discotiveScore?.lastLoginDate}
        />

        {/* ── MOBILE LAYOUT (< lg) ────────────────────────────────────────── */}
        <div className="lg:hidden flex flex-col">
          {/* Mobile HUD carousel */}
          <div
            className="px-4 pt-6 pb-2"
            style={{
              background: V.depth,
              borderBottom: `1px solid rgba(255,255,255,0.04)`,
            }}
          >
            {/* Orbital rings — always visible */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div>
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  {isPro && (
                    <Crown
                      size={9}
                      style={{
                        display: "inline",
                        color: G.base,
                        marginRight: 4,
                      }}
                    />
                  )}
                  Level {level} Operator
                </span>
                <h2
                  className="font-display font-black text-2xl leading-tight mt-0.5"
                  style={{ color: T.primary, letterSpacing: "-0.03em" }}
                >
                  {operatorName}
                </h2>
              </div>
              <OrbitalRings
                score={score}
                lastScore={last24h}
                globalPct={globalPct}
                domainPct={domainPct}
              />
            </div>

            {/* Swipeable metrics row */}
            <div
              ref={mobileHudRef}
              className="flex overflow-x-auto hide-scrollbar gap-5 pb-4"
              style={{ scrollSnapType: "x mandatory" }}
              role="region"
              aria-label="Key metrics"
            >
              {[
                {
                  label: "Rank",
                  value: lbRank === "?" ? "—" : `#${lbRank}`,
                  sub: lbFilter,
                  accent: G.bright,
                },
                {
                  label: "Streak",
                  value: `${streak}d`,
                  accent: streak >= 7 ? G.bright : T.secondary,
                },
                { label: "Vault", value: vaultCount, sub: "assets" },
                {
                  label: "Global",
                  value: globalPct === 100 ? "—" : `Top ${globalPct}%`,
                  accent: G.bright,
                },
              ].map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 flex flex-col gap-0.5"
                  style={{ scrollSnapAlign: "start", minWidth: 80 }}
                >
                  <span
                    className="text-[8px] font-bold uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    {m.label}
                  </span>
                  <span
                    className="font-display font-black text-2xl leading-none"
                    style={{ color: m.accent || T.primary }}
                  >
                    {m.value}
                  </span>
                  {m.sub && (
                    <span className="text-[9px]" style={{ color: T.dim }}>
                      {m.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile stage */}
          <div className="flex flex-col gap-10 px-4 pt-8 pb-32">
            <HeroDirective
              userData={userData}
              vaultCount={vaultCount}
              isPro={isPro}
              navigate={navigate}
            />

            <div>
              <SectionLabel icon={Star} color={G.base}>
                Latest Opportunities
              </SectionLabel>
              {opps.length === 0 ? (
                <div
                  className="py-8 pl-5"
                  style={{ borderLeft: "2px solid rgba(255,255,255,0.05)" }}
                >
                  <p
                    className="font-display font-black text-xl leading-tight"
                    style={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    No opportunities cached.
                  </p>
                  <p className="text-[11px] mt-2" style={{ color: T.dim }}>
                    Bounties matching your domain will surface here.
                  </p>
                </div>
              ) : (
                <div role="list" aria-label="Opportunities">
                  {opps.map((o, i) => (
                    <OpportunityRow key={o.id || i} opp={o} idx={i} />
                  ))}
                </div>
              )}
            </div>

            <Swimlane
              label="Domain Rivals"
              icon={Crosshair}
              iconColor="#F87171"
              cta="Arena"
              ctaLink="/app/arena"
              isEmpty={rivals.length === 0}
              emptyTitle="No rival signal detected."
              emptySub="Elevate your score to surface operators in your domain ranked directly above and below you."
              emptyCtaLabel="View Leaderboard"
              emptyCtaLink="/app/arena"
            >
              {rivals.map((r, i) => (
                <RivalCard key={r.uid} rival={r} userScore={score} idx={i} />
              ))}
            </Swimlane>

            <Swimlane
              label="Calibration"
              icon={Radio}
              iconColor="#a855f7"
              cta="Course Database"
              ctaLink="/app/learn"
              isEmpty={false}
            >
              {[
                {
                  title: "System Design for Operators",
                  img: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=500&q=80",
                  time: "45m left",
                },
                {
                  title: "Advanced Framer Motion",
                  img: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=500&q=80",
                  time: "1h 20m left",
                },
                {
                  title: "PostgreSQL Indexing",
                  img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=500&q=80",
                  time: "Start",
                },
              ].map((course, i) => (
                <div
                  key={i}
                  className="shrink-0 relative rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ width: 260, height: 150, scrollSnapAlign: "start" }}
                >
                  <img
                    src={course.img}
                    alt={course.title}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs font-black text-white leading-tight mb-1">
                      {course.title}
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#a855f7]">
                      {course.time}
                    </p>
                  </div>
                </div>
              ))}
            </Swimlane>

            <Swimlane
              label="Vault Arsenal"
              icon={Database}
              iconColor={G.base}
              cta="Full Vault"
              ctaLink="/app/vault"
              isEmpty={vaultCount === 0}
              emptyTitle="Vault Empty."
              emptySub="Upload an asset to establish proof of work."
              emptyCtaLabel="Upload Now"
              emptyCtaLink="/app/vault"
            >
              {vaultAssets.map((a, i) => (
                <VaultCard key={a.id || i} asset={a} idx={i} />
              ))}
            </Swimlane>

            {/* Daily Ledger (mobile) */}
            <TierGate
              featureKey="canUseJournal"
              fallbackType="blur"
              upsellMessage="Daily Execution Ledger requires Pro clearance."
            >
              <DailyExecutionLedger userData={userData} isPro={isPro} compact />
            </TierGate>
          </div>
        </div>

        {/* ── DESKTOP LAYOUT (lg+) — 75/25 split ───────────────────────── */}
        <div className="hidden lg:flex h-screen overflow-hidden relative">
          {/* HUD Toggle Button (Floats when HUD is closed) */}
          <AnimatePresence>
            {!isHudOpen && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => setIsHudOpen(true)}
                className="fixed top-32 right-6 z-[9999] flex items-center justify-center text-white/40 hover:text-[#BFA264] transition-all group p-2 bg-[#050505]/80 backdrop-blur-xl rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                title="Deploy Telemetry HUD"
              >
                <div className="flex items-center -space-x-2 group-hover:space-x-[-4px] transition-all duration-300">
                  <ChevronLeft size={20} className="opacity-100" />
                  <ChevronLeft size={20} className="opacity-70" />
                  <ChevronLeft size={20} className="opacity-40" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── STAGE (75%) — infinite vertical scroll ─────────────────── */}
          <main
            className="flex-1 overflow-y-auto hide-scrollbar relative z-0 transition-all duration-500"
            style={{
              scrollBehavior: "smooth",
              marginRight: isHudOpen ? "25vw" : "0",
            }}
            aria-label="Main execution stage"
          >
            {/* Subtle noise texture overlay */}
            <div
              className="fixed inset-0 pointer-events-none"
              style={{
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
                zIndex: 0,
              }}
            />

            {/* BORDERLESS, EDGE-TO-EDGE CONTAINER */}
            <div className="relative z-10 w-full pb-32">
              {/* Hero Directive (Spans full width of stage) */}
              <HeroDirective
                userData={userData}
                vaultCount={vaultCount}
                isPro={isPro}
                navigate={navigate}
              />

              {/* Swimlane 1: Latest Opportunities */}
              <motion.section
                {...FADE_UP(0.1)}
                className="pt-8 pb-16 pr-12 pl-8 md:pl-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Star size={13} style={{ color: G.base }} />
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: T.dim }}
                    >
                      Latest Opportunities
                    </span>
                  </div>
                  <Link
                    to="/app/bounties"
                    className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                    style={{ color: G.base }}
                  >
                    All Bounties <ArrowUpRight size={10} />
                  </Link>
                </div>

                {opps.length === 0 ? (
                  <div
                    className="py-10 pl-5"
                    style={{ borderLeft: "2px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="font-display font-black text-2xl leading-tight block"
                      style={{
                        color: "rgba(255,255,255,0.10)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      No opportunities cached.
                    </span>
                    <p
                      className="text-[11px] mt-3 max-w-xs"
                      style={{ color: T.dim }}
                    >
                      Domain-matched bounties, gigs, and collaborations will
                      appear here as they are posted.
                    </p>
                  </div>
                ) : (
                  <div role="list" aria-label="Opportunity list">
                    {opps.map((o, i) => (
                      <OpportunityRow key={o.id || i} opp={o} idx={i} />
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Swimlane 2: Domain Rivals */}
              <motion.section
                {...FADE_UP(0.16)}
                className="pb-16 pl-8 md:pl-12"
              >
                <Swimlane
                  label="Domain Rivals"
                  icon={Crosshair}
                  iconColor="#F87171"
                  cta="Enter Arena"
                  ctaLink="/app/arena"
                  isEmpty={rivals.length === 0}
                  emptyTitle="No rival signal detected."
                  emptySub="Elevate your score to surface operators in your domain ranked directly above and below you."
                  emptyCtaLabel="View Leaderboard"
                  emptyCtaLink="/app/arena"
                >
                  {rivals.map((r, i) => (
                    <RivalCard
                      key={r.uid}
                      rival={r}
                      userScore={score}
                      idx={i}
                    />
                  ))}
                </Swimlane>
              </motion.section>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Swimlane 3: Calibration (Learn DB) */}
              <motion.section {...FADE_UP(0.2)} className="pb-16 pl-8 md:pl-12">
                <Swimlane
                  label="Calibration"
                  icon={Radio}
                  iconColor="#a855f7"
                  cta="Course Database"
                  ctaLink="/app/learn"
                  isEmpty={false}
                >
                  {/* Cinematic Video Cards */}
                  {[
                    {
                      title: "System Design for Operators",
                      img: "https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=500&q=80",
                      time: "45m left",
                    },
                    {
                      title: "Advanced Framer Motion",
                      img: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=500&q=80",
                      time: "1h 20m left",
                    },
                    {
                      title: "PostgreSQL Indexing",
                      img: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=500&q=80",
                      time: "Start",
                    },
                  ].map((course, i) => (
                    <div
                      key={i}
                      className="shrink-0 relative rounded-2xl overflow-hidden cursor-pointer group"
                      style={{
                        width: 260,
                        height: 150,
                        scrollSnapAlign: "start",
                      }}
                    >
                      <img
                        src={course.img}
                        alt={course.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-black text-white leading-tight mb-1">
                          {course.title}
                        </p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-[#a855f7]">
                          {course.time}
                        </p>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
                        </div>
                      </div>
                    </div>
                  ))}
                </Swimlane>
              </motion.section>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Swimlane 4: Vault Arsenal */}
              <motion.section
                {...FADE_UP(0.22)}
                className="pb-16 pl-8 md:pl-12"
              >
                <Swimlane
                  label="Vault Arsenal"
                  icon={Database}
                  iconColor={G.base}
                  cta="Full Vault"
                  ctaLink="/app/vault"
                  isEmpty={vaultCount === 0}
                  emptyTitle="Vault Empty. Upload an asset to establish proof of work."
                  emptySub="Your credentials, certificates, and projects live here — verified on-chain for the arena."
                  emptyCtaLabel="Upload First Asset"
                  emptyCtaLink="/app/vault"
                >
                  {vaultAssets.map((a, i) => (
                    <VaultCard key={a.id || i} asset={a} idx={i} />
                  ))}
                </Swimlane>
              </motion.section>

              {/* Divider */}
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Daily Execution Ledger */}
              <motion.section
                {...FADE_UP(0.28)}
                className="pb-32 pr-12 pl-8 md:pl-12"
              >
                <TierGate
                  featureKey="canUseJournal"
                  fallbackType="blur"
                  upsellMessage="Daily Execution Ledger requires Pro clearance. Log reality, track momentum, share proof of execution."
                >
                  <DailyExecutionLedger
                    userData={userData}
                    isPro={isPro}
                    compact
                  />
                </TierGate>
              </motion.section>
            </div>
          </main>

          {/* ── HUD (25%) — fixed right pane ────────────────────────────── */}
          <AnimatePresence>
            {isHudOpen && (
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 hidden lg:flex flex-col z-[100]"
                style={{
                  width: "25vw",
                  minWidth: 320,
                  // Seamless gradient fade instead of a hard border
                  background: `linear-gradient(90deg, transparent 0%, rgba(3, 3, 3, 0.75) 15%, rgba(3, 3, 3, 0.85) 100%)`,
                  backdropFilter: "blur(40px) saturate(150%)",
                  WebkitBackdropFilter: "blur(40px) saturate(150%)",
                  borderLeft: "none",
                }}
                aria-label="Metrics HUD"
              >
                {/* HUD Close Button (Tactical >>>) */}
                <button
                  onClick={() => setIsHudOpen(false)}
                  className="fixed top-32 right-6 z-[9999] flex items-center justify-center text-white/30 hover:text-white transition-all group bg-[#050505]/80 backdrop-blur-xl p-2 rounded-full border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                  title="Hide HUD"
                >
                  <div className="flex items-center -space-x-2 group-hover:space-x-[-4px] transition-all duration-300">
                    <ChevronRight size={16} className="opacity-40" />
                    <ChevronRight size={16} className="opacity-70" />
                    <ChevronRight size={16} className="opacity-100" />
                  </div>
                </button>

                {/* Faint gold glow top-right */}
                <div
                  className="absolute top-0 right-0 w-56 h-56 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${G.dimBg} 0%, transparent 70%)`,
                    zIndex: 0,
                  }}
                />

                {/* Pro / Level badge */}
                <div
                  className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <div>
                    <span
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: T.dim }}
                    >
                      {isPro ? "Pro Clearance" : "Essential Tier"}
                    </span>
                    <p
                      className="text-sm font-black leading-tight mt-0.5"
                      style={{ color: T.primary }}
                    >
                      {operatorName}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: isPro ? G.dimBg : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isPro ? G.border : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {isPro ? (
                      <Crown size={10} style={{ color: G.bright }} />
                    ) : (
                      <Shield size={10} style={{ color: T.dim }} />
                    )}
                    <span
                      className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: isPro ? G.bright : T.dim }}
                    >
                      Lv {level}
                    </span>
                  </div>
                </div>

                {/* Scrollable HUD body */}
                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                  <HUDPanel
                    score={score}
                    lastScore={last24h}
                    globalPct={globalPct}
                    domainPct={domainPct}
                    streak={streak}
                    level={level}
                    levelPct={levelPct}
                    ptsToNext={ptsToNext}
                    isPro={isPro}
                    lbRank={lbRank}
                    lbFilter={lbFilter}
                    telemetryEvents={telemetryEvents}
                    userData={userData}
                    chartTf={chartTf}
                    setChartTf={setChartTf}
                    chartData={chartData}
                    chartMin={chartMin}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
