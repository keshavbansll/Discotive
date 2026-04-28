/**
 * @fileoverview Discotive OS — Command Center v9 "Addiction Engine"
 * Desktop: 75/25 Stage/HUD animated split
 * Mobile: Native-app scroll with snap sections, 44px touch targets
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, Link, useOutletContext } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  documentId,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData, useOnboardingGate } from "../hooks/useUserData";
import { useScoreHistory, usePercentiles } from "../hooks/useDashboardData";
import { useTelemetryStream } from "../hooks/useTelemetryStream";
import TierGate from "../components/TierGate";
import OnboardingTutorial, {
  TUTORIAL_KEY,
} from "../components/OnboardingTutorial";
import { usePushNotifications } from "../hooks/usePushNotifications";
import ProfileCompletenessWidget from "../components/dashboard/ProfileCompletenessWidget";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip as ReTooltip,
} from "recharts";
import {
  Database,
  Zap,
  Target,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Crown,
  Flame,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  AlertTriangle,
  Crosshair,
  Award,
  FileText,
  Upload,
  Briefcase,
  Star,
  BarChart2,
  Radio,
  Calendar,
  Network,
  Play,
  Clock,
  ArrowRight,
  Check,
  GraduationCap,
  Trophy,
  Eye,
  Users,
  Map,
  Compass,
  Settings,
  Bookmark,
  Bell,
  MessageCircle,
  Lock,
  Activity,
  Plus,
  User,
  Book,
  Newspaper,
  BookOpen,
} from "lucide-react";
import { cn } from "../lib/cn";

/* ─── Design tokens ─────────────────────────────────────────────────────── */
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

const FADE_UP = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay },
});

/* ═══════════════════════════════════════════════════════════════════════════
   DATA HOOKS
══════════════════════════════════════════════════════════════════════════ */

export const useScoreLog = (uid) => {
  const [logs, setLogs] = useState([]);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    getDocs(
      query(
        collection(db, "users", uid, "score_log"),
        orderBy("timestamp", "desc"),
        limit(40),
      ),
    )
      .then((snap) =>
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(() => {});
  }, [uid]);
  return logs;
};

const useLearnPreview = (domain) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true); // Default to true
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const constraints = [limit(6)];
    if (domain) constraints.unshift(where("domains", "array-contains", domain));
    getDocs(query(collection(db, "discotive_videos"), ...constraints))
      .then((snap) =>
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [domain]);
  return { items, loading };
};

const useAlliances = (allyIds) => {
  const [allies, setAllies] = useState([]);
  const [loading, setLoading] = useState(false);
  const prevIds = useRef("");

  useEffect(() => {
    const idsString = (allyIds || []).join(",");
    if (!allyIds || !allyIds.length || idsString === prevIds.current) return;
    prevIds.current = idsString;

    const fetchAllies = async () => {
      setLoading(true);
      try {
        const top20Ids = allyIds.slice(0, 20);
        const chunks = [];
        for (let i = 0; i < top20Ids.length; i += 10) {
          chunks.push(top20Ids.slice(i, i + 10));
        }
        const results = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "users"),
            where(documentId(), "in", chunk),
          );
          const snap = await getDocs(q);
          snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
        }
        results.sort(
          (a, b) =>
            (b.discotiveScore?.current || 0) - (a.discotiveScore?.current || 0),
        );
        setAllies(results);
      } catch (e) {
        console.error("[useAlliances] fetch failed:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllies();
  }, [allyIds]);
  return { allies, loading };
};

const useTrackedRivals = (uid) => {
  const [rivals, setRivals] = useState([]);
  const [loading, setLoading] = useState(true); // Default to true
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    getDocs(
      query(
        collection(db, "competitors"),
        where("trackerId", "==", uid),
        limit(10),
      ),
    )
      .then((snap) =>
        setRivals(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);
  return { rivals, loading };
};

const useOpportunities = (uid, domain) => {
  const [opps, setOpps] = useState([]);
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    if (!domain) return;
    getDocs(
      query(
        collection(db, "bounties"),
        where("domain", "==", domain),
        orderBy("createdAt", "desc"),
        limit(8),
      ),
    )
      .then((snap) =>
        setOpps(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      )
      .catch(() => {});
  }, [uid, domain]);
  return opps;
};

export const useLbRank = (uid, score, domain) => {
  const [rank, setRank] = useState("?");
  const [filter, setFilter] = useState("Global");
  useEffect(() => {
    if (!uid || score == null) return;
    let stale = false;
    const run = async () => {
      try {
        const c = [where("discotiveScore.current", ">", score)];
        if (domain) {
          c.push(where("identity.domain", "==", domain));
          setFilter(domain.length > 16 ? domain.slice(0, 16) + "…" : domain);
        } else setFilter("Global");
        const snap = await getCountFromServer(
          query(collection(db, "users"), ...c),
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
  }, [uid, score, domain]);
  return { rank, filter };
};

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED ATOMS
══════════════════════════════════════════════════════════════════════════ */

const Skeleton = memo(({ className }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.7, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    className={cn("rounded-lg", className)}
    style={{
      background: `linear-gradient(90deg,${V.surface},${V.elevated},${V.surface})`,
    }}
  />
));

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

/* ─── Orbital Ring (Apple Watch style) ──────────────────────────────────── */
const OrbitalRings = memo(({ score, lastScore = 0, size = 180 }) => {
  const shouldReduce = useReducedMotion();
  const outerR = size * 0.39,
    innerR = size * 0.29,
    stroke = size * 0.039;
  const cx = size / 2,
    cy = size / 2;

  const [displayScore, setDisplayScore] = useState(lastScore || score);
  useEffect(() => {
    const diff = score - (lastScore || 0);
    if (diff === 0 || !lastScore) {
      const timer = setTimeout(() => setDisplayScore(score), 0);
      return () => clearTimeout(timer);
    }
    let start;
    const dur = 900;
    const animate = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      const e = 1 - Math.pow(2, -10 * p);
      setDisplayScore(Math.floor((lastScore || 0) + diff * e));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score, lastScore]);

  // Inner circle logic: 0-1000 points
  const innerPct = Math.min(100, (displayScore / 1000) * 100);

  const arc = (r, pct) => {
    const circ = 2 * Math.PI * r;
    const clampedPct = Math.max(0, Math.min(100, pct));
    // SVG offset works in reverse: 0 offset = 100% visible.
    const offset = circ * ((100 - clampedPct) / 100);
    return { circ, offset };
  };

  const inner = arc(innerR, innerPct);
  const outerCirc = 2 * Math.PI * outerR;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Subtle Outer Track */}
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(255,255,255,0.02)"
          strokeWidth={stroke}
        />
        {/* Inner Track */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={stroke}
        />
        {/* Inner Fill (Score Engine) */}
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="none"
          stroke={G.bright}
          strokeWidth={stroke}
          strokeDasharray={inner.circ}
          strokeLinecap="round"
          style={{
            transition:
              "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 0.4s",
            strokeDashoffset: inner.offset,
          }}
        />
        {/* Rotating Outer Directive Arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(191,162,100,0.15)"
          strokeWidth={stroke}
          strokeDasharray={`${outerCirc * 0.25} ${outerCirc * 0.75}`}
          strokeLinecap="round"
          animate={shouldReduce ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
          style={{ originX: "50%", originY: "50%" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span
          className="font-display font-black leading-none"
          style={{
            fontSize: size * 0.155,
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

/* ─── Consistency Matrix ─────────────────────────────────────────────────── */
const ConsistencyMatrix = memo(({ userData, horizontal = false }) => {
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
      return {
        str,
        on: active.has(str),
        breath: 2 + (Math.sin(i) * 0.5 + 0.5) * 2,
        id: i,
      };
    });
  }, [userData]);

  if (horizontal) {
    return (
      <div>
        <SectionLabel icon={BarChart2} color={G.base}>
          28-Day Consistency
        </SectionLabel>
        <div
          className="overflow-x-auto hide-scrollbar pb-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="flex items-end gap-1.5 px-1"
            style={{ minWidth: "max-content" }}
          >
            {pills.map((p) => (
              <div
                key={p.id}
                className="relative flex justify-center"
                style={{
                  minWidth: 44,
                  height: 44,
                  alignItems: "flex-end",
                  display: "flex",
                }}
                onTouchStart={() => setHoveredPill(p.id)}
                onTouchEnd={() => setHoveredPill(null)}
                onMouseEnter={() => setHoveredPill(p.id)}
                onMouseLeave={() => setHoveredPill(null)}
              >
                <AnimatePresence>
                  {hoveredPill === p.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-full mb-1 bg-[#050505] border border-[#BFA264]/40 text-[#BFA264] text-[9px] font-mono font-bold px-2 py-0.5 rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-50"
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
                    duration: p.breath,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: 4,
                    height: p.on ? 24 : 12,
                    background: p.on ? G.bright : "rgba(255,255,255,0.06)",
                    opacity: p.on ? 1 : 0.3,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionLabel icon={BarChart2} color={G.base}>
        Consistency Engine
      </SectionLabel>
      <div className="flex items-center justify-between">
        {pills.map((p) => (
          <div
            key={p.id}
            className="relative flex justify-center"
            style={{ padding: "0 4px" }}
            onMouseEnter={() => setHoveredPill(p.id)}
            onMouseLeave={() => setHoveredPill(null)}
          >
            <AnimatePresence>
              {hoveredPill === p.id && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-full mb-2 bg-[#050505] border border-[#BFA264]/40 text-[#BFA264] text-[10px] font-mono font-bold px-2.5 py-1 rounded shadow-2xl pointer-events-none whitespace-nowrap z-50"
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
                duration: p.breath,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                width: 4,
                height: p.on ? 24 : 12,
                background: p.on ? G.bright : "rgba(255,255,255,0.06)",
                opacity: p.on ? 1 : 0.3,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

/* ─── Global Ticker ──────────────────────────────────────────────────────── */
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
      <div className="overflow-hidden" style={{ height: 100 }}>
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

/* ─── Locked Mini Ring (Pro gate) ───────────────────────────────────────── */
const LockedMiniRing = memo(({ label, color, size = 48, navigate }) => (
  <motion.div
    className="flex flex-col items-center gap-1.5 cursor-pointer group"
    whileHover={{ scale: 1.06 }}
    onClick={() => navigate?.("/premium")}
    title="Upgrade to Pro"
  >
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={4}
          strokeDasharray={`${Math.PI * (size - 8) * 0.25} ${Math.PI * (size - 8) * 0.75}`}
          strokeLinecap="round"
          style={{ filter: "blur(1px)" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
        style={{ background: "rgba(191,162,100,0.06)" }}
      >
        <Lock size={10} style={{ color: "rgba(191,162,100,0.4)" }} />
      </div>
    </div>
    <p
      className="text-[7px] font-bold uppercase tracking-widest text-center leading-tight max-w-[50px]"
      style={{ color: "rgba(191,162,100,0.35)" }}
    >
      {label}
    </p>
  </motion.div>
));

/* ─── Consistency Badges ─────────────────────────────────────────────────── */
const BADGE_DEFS = [
  { days: 7, emoji: "🌅", label: "Week One" },
  { days: 15, emoji: "⚡", label: "15 Days" },
  { days: 30, emoji: "🔥", label: "Monthly" },
  { days: 90, emoji: "💎", label: "90 Days" },
  { days: 180, emoji: "👑", label: "6 Months" },
  { days: 365, emoji: "🌟", label: "Annual" },
];

const ConsistencyBadges = memo(({ streak }) => (
  <div>
    <SectionLabel icon={Flame} color="#f97316">
      Consistency Badges
    </SectionLabel>
    <div className="grid grid-cols-3 gap-2">
      {BADGE_DEFS.map((b) => {
        const earned = streak >= b.days;
        return (
          <motion.div
            key={b.days}
            whileHover={{ scale: 1.04 }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all"
            style={{
              background: earned
                ? "rgba(249,115,22,0.07)"
                : "rgba(255,255,255,0.02)",
              borderColor: earned
                ? "rgba(249,115,22,0.22)"
                : "rgba(255,255,255,0.04)",
              opacity: earned ? 1 : 0.4,
            }}
            title={
              earned
                ? `Earned at ${b.days} day streak`
                : `${b.days - streak} days to go`
            }
          >
            <span className="text-lg leading-none mb-1">
              {earned ? b.emoji : "🔒"}
            </span>
            <span
              className="text-[7px] font-black uppercase tracking-widest"
              style={{ color: earned ? "#f97316" : T.dim }}
            >
              {b.label}
            </span>
            <span
              className="text-[7px] font-mono mt-0.5"
              style={{ color: T.dim }}
            >
              {b.days}d
            </span>
          </motion.div>
        );
      })}
    </div>
  </div>
));

/* ─── HUD Metric Pill ────────────────────────────────────────────────────── */
const HUDMetric = memo(({ label, value, sub, accent }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    className="w-full flex flex-col items-center justify-center text-center gap-1 bg-[#080808] border border-[#1a1a1a] rounded-xl p-3 shadow-inner cursor-default"
  >
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
  </motion.div>
));

/* ─── Score Chart Tooltip ────────────────────────────────────────────────── */
const ScoreTooltip = memo(({ active, payload, label, scoreLogs }) => {
  if (!active || !payload?.length) return null;
  const dayLogs = (scoreLogs || []).filter((l) => {
    const d = l.date
      ? l.date.split("T")[0]
      : (l.timestamp?.toDate?.()?.toISOString() || "").split("T")[0];
    return d === label;
  });
  const totalChange = dayLogs.reduce((s, l) => s + (l.change || 0), 0);
  const reasons = [
    ...new Set(dayLogs.map((l) => l.reason).filter(Boolean)),
  ].slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#080808] border border-[#BFA264]/30 rounded-xl px-4 py-3 shadow-2xl text-xs font-mono max-w-[180px]"
    >
      <p className="text-[#888] mb-1 text-[9px]">{label}</p>
      <p className="font-black text-sm" style={{ color: G.bright }}>
        {payload[0].value?.toLocaleString()} pts
      </p>
      {totalChange !== 0 && (
        <p
          className={cn(
            "text-[10px] font-bold mt-1",
            totalChange > 0 ? "text-emerald-400" : "text-red-400",
          )}
        >
          {totalChange > 0 ? `+${totalChange}` : totalChange} today
        </p>
      )}
      {reasons.map((r, i) => (
        <p key={i} className="text-[9px] text-white/40 mt-0.5 truncate">
          • {r}
        </p>
      ))}
    </motion.div>
  );
});

/* ─── Sparkline Chart (FIXED — full visibility + tooltip) ──────────────── */
const SparklineChart = memo(({ tf, setTf, chartData, chartMin, scoreLogs }) => (
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
    <div className="w-full" style={{ height: 110, minHeight: 110 }}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={1}
        minHeight={1}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 10, bottom: 10, left: 0, right: 0 }}
        >
          <defs>
            <linearGradient id="sparkG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#BFA264" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#BFA264" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[chartMin, "auto"]} hide />
          <ReTooltip
            content={<ScoreTooltip scoreLogs={scoreLogs} />}
            cursor={{
              stroke: "rgba(191,162,100,0.3)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#BFA264"
            strokeWidth={2}
            fill="url(#sparkG)"
            isAnimationActive={true}
            dot={false}
            activeDot={{
              r: 4,
              fill: "#BFA264",
              stroke: "#030303",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
));

/* ─── Mini Radial Ring ───────────────────────────────────────────────────── */
const MiniRadialRing = memo(
  ({ pct = 100, size = 48, stroke = 4, color = G.base, label }) => {
    const r = (size - stroke * 2) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - Math.max(0, Math.min(1, (100 - pct) / 100)) * circ;
    return (
      <motion.div
        className="flex flex-col items-center gap-1.5"
        whileHover={{ scale: 1.06 }}
      >
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
      </motion.div>
    );
  },
);

/* ─── HUD Panel (Desktop right rail — animated) ──────────────────────────── */
export const HUDPanel = memo(
  ({
    score,
    lastScore,
    globalPct,
    domainPct,
    streak,
    level,
    levelPct,
    isPro,
    lbRank,
    lbFilter,
    telemetryEvents,
    userData,
    chartTf,
    setChartTf,
    chartData,
    chartMin,
    scoreLogs,
    navigate,
  }) => {
    const percentiles = {
      global: globalPct,
      domain: domainPct,
      niche: userData?.precomputed?.nichePercentile || 100,
      parallel: userData?.precomputed?.parallelPercentile || 100,
    };
    return (
      <div
        className="h-full flex flex-col gap-5 overflow-y-auto custom-scrollbar"
        style={{ padding: "28px 20px 120px" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-center gap-3"
        >
          <OrbitalRings
            score={score}
            lastScore={lastScore}
            globalPct={globalPct}
            domainPct={domainPct}
          />
          <div className="flex items-center gap-5">
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
        </motion.div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="tut-velocity"
        >
          <SparklineChart
            tf={chartTf}
            setTf={setChartTf}
            chartData={chartData}
            chartMin={chartMin}
            scoreLogs={scoreLogs}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="tut-position"
        >
          <SectionLabel icon={Compass} color={G.base}>
            Position Matrix
            {!isPro && (
              <span
                className="ml-2 text-[8px] font-black px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(191,162,100,0.08)",
                  color: "rgba(191,162,100,0.5)",
                  border: "1px solid rgba(191,162,100,0.15)",
                }}
              >
                Pro
              </span>
            )}
          </SectionLabel>
          <div className="flex items-center justify-between px-2">
            {[
              {
                pct: percentiles.global,
                label: "Global",
                color: G.base,
                free: true,
              },
              {
                pct: percentiles.domain,
                label: "Domain",
                color: "#10b981",
                free: false,
              },
              {
                pct: percentiles.niche,
                label: "Niche",
                color: "#38bdf8",
                free: false,
              },
              {
                pct: percentiles.parallel,
                label: "Path",
                color: "#8b5cf6",
                free: false,
              },
            ].map((m) =>
              m.free || isPro ? (
                <MiniRadialRing key={m.label} {...m} />
              ) : (
                <LockedMiniRing
                  key={m.label}
                  label={m.label}
                  color={m.color}
                  navigate={navigate}
                />
              ),
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="grid grid-cols-3 gap-2">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
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
                background: `linear-gradient(90deg,${G.deep},${G.bright})`,
                boxShadow: `0 0 8px rgba(191,162,100,0.5)`,
              }}
            />
          </div>
        </motion.div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="tut-consistency"
        >
          <ConsistencyMatrix userData={userData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="tut-streak-milestones"
        >
          <div className="grid grid-cols-3 gap-2 mt-[-8px]">
            {[
              { target: 7, label: "7D", color: G.bright },
              { target: 14, label: "2W", color: "#f97316" },
              { target: 30, label: "1M", color: "#38bdf8" },
            ].map((m) => {
              const hit = streak >= m.target;
              const pct = Math.min(100, (streak / m.target) * 100);
              return (
                <div key={m.target} className="relative group cursor-default">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all overflow-hidden relative",
                      hit
                        ? "bg-white/[0.05] border-white/10"
                        : "bg-white/[0.02] border-white/[0.04]",
                    )}
                  >
                    <span
                      className="text-base font-black font-display leading-none mb-1.5 z-10"
                      style={{ color: hit ? m.color : T.dim }}
                    >
                      {m.label}
                    </span>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden z-10">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${pct}%`, background: m.color }}
                      />
                    </div>
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <span
                        className="text-[8px] font-black uppercase tracking-wider"
                        style={{ color: hit ? m.color : T.dim }}
                      >
                        {hit ? "Unlocked" : `${m.target - streak} Days Left`}
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.52 }}
        >
          <ConsistencyBadges streak={streak} />
        </motion.div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="tut-live-signal"
        >
          <GlobalTicker events={telemetryEvents} />
        </motion.div>
      </div>
    );
  },
);

/* ─── Streak Risk Banner (FIXED — timezone, parsing & dismissal) ───────────────────── */
const StreakRiskBanner = memo(({ streak, lastLoginDate, createdAt }) => {
  // Robust Local YYYY-MM-DD Generation to avoid UTC timezone offset mismatch
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Safely strip time from ISO string for an exact date match
  const lastLoginStr = lastLoginDate?.split("T")[0];
  const hasLoggedToday = lastLoginStr === todayStr;

  const [now] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("discotive_streak_dismiss") === todayStr;
  });

  const handleDismiss = () => {
    localStorage.setItem("discotive_streak_dismiss", todayStr);
    setDismissed(true);
  };

  const accountAgeDays = useMemo(() => {
    if (!createdAt) return 999;
    const ts = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    return (now - ts.getTime()) / (1000 * 60 * 60 * 24);
  }, [createdAt, now]);

  const shouldShow =
    !hasLoggedToday && streak > 0 && accountAgeDays >= 3 && !dismissed;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center justify-between gap-4 px-5 overflow-hidden border-b"
          style={{
            background: "rgba(248,113,113,0.07)",
            borderColor: "rgba(248,113,113,0.2)",
          }}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-3 py-3.5 pr-2">
            <Flame
              size={16}
              style={{ color: "#F87171" }}
              className="shrink-0 animate-pulse"
            />
            <span
              className="text-[11px] font-bold"
              style={{ color: T.secondary }}
            >
              Your
              <span className="font-black" style={{ color: "#F87171" }}>
                {streak}-day streak
              </span>
              expires at midnight. Execute a task to maintain momentum.
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 py-3.5">
            <span
              className="text-[9px] font-black uppercase tracking-widest shrink-0 px-2.5 py-1 rounded-full hidden sm:inline-block"
              style={{
                background: "rgba(248,113,113,0.12)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
              }}
            >
              At Risk
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-md text-[#F87171]/60 hover:bg-[#F87171]/10 hover:text-[#F87171] transition-colors"
              aria-label="Dismiss alert"
            >
              {/* Native embedded SVG to prevent import failures across different lucide-react versions */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

/* ─── Hero Directive (5 slides, gradient mesh backgrounds) ─────────────── */
const HERO_BG = [
  "radial-gradient(ellipse at 20% 50%, rgba(191,162,100,0.25) 0%, transparent 60%)",
  "radial-gradient(ellipse at 80% 30%, rgba(56,189,248,0.2) 0%, transparent 60%)",
  "radial-gradient(ellipse at 50% 70%, rgba(239,68,68,0.18) 0%, transparent 60%)",
  "radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.2) 0%, transparent 60%)",
  "radial-gradient(ellipse at 70% 60%, rgba(16,185,129,0.2) 0%, transparent 60%)",
];

const HeroDirective = memo(
  ({ userData, vaultCount, isPro, navigate, score, last24h }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const delta = score - (last24h || score);
    const rankDropped = delta < -5;

    const slides = useMemo(() => {
      const s = [];
      if (rankDropped) {
        s.push({
          id: "threat",
          label: "Threat Detected",
          headline: "Defend Your Rank.",
          sub: `Score dropped ${Math.abs(delta)} pts in 24h. Rivals are closing in.`,
          cta: "Reclaim Ground",
          ctaFn: () => navigate("/app/leaderboard"),
          accent: "#F87171",
          icon: AlertTriangle,
        });
      } else {
        s.push({
          id: "exec",
          label: "Executing",
          headline: "Maintain Velocity.",
          sub: `Current score: ${score.toLocaleString()} pts. Consistent execution is the only path to elite status.`,
          cta: "Enter Arena",
          ctaFn: () => navigate("/app/leaderboard"),
          accent: G.bright,
          icon: Zap,
        });
      }
      if (!vaultCount) {
        s.push({
          id: "vault",
          label: "Vault Empty",
          headline: "Establish Proof.",
          sub: "Your proof-of-work archive is empty. Upload credentials to build an unbreakable foundation.",
          cta: "Upload Proof",
          ctaFn: () => navigate("/app/vault"),
          accent: "#4ADE80",
          icon: Shield,
        });
      }
      s.push({
        id: "network",
        label: "Network Intel",
        headline: "Expand Syndicate.",
        sub: "New operators have entered your domain. Form alliances to grow your execution network graph.",
        cta: "Scan Network",
        ctaFn: () => navigate("/app/connective"),
        accent: "#38bdf8",
        icon: Network,
      });
      s.push({
        id: "learn",
        label: "Knowledge Engine",
        headline: "Calibrate Edge.",
        sub: "New verified courses, certificates, and learning resources available in your domain. Each completion yields Discotive Score.",
        cta: "Open Learning",
        ctaFn: () => navigate("/app/learn"),
        accent: "#8b5cf6",
        icon: GraduationCap,
      });
      if (isPro) {
        s.push({
          id: "pro",
          label: "Pro Clearance",
          headline: "Elite Status Active.",
          sub: "You have Pro clearance. Access your Daily Execution Agenda, competitor X-Ray tracking, and expanded asset vault.",
          cta: "Open Agenda",
          ctaFn: () => navigate("/app/agenda"),
          accent: G.bright,
          icon: Crown,
        });
      } else {
        s.push({
          id: "upgrade",
          label: "Operator Upgrade",
          headline: "Go Pro Today.",
          sub: "Unlock the Daily Execution Agenda, competitor X-Ray tracking, and a 100MB verified asset vault.",
          cta: "Upgrade to Pro",
          ctaFn: () => navigate("/premium"),
          accent: G.bright,
          icon: Crown,
        });
      }
      return s;
    }, [rankDropped, vaultCount, isPro, score, delta, navigate]);

    const activeSlide = slides[activeIdx];
    const Icon = activeSlide.icon;

    useEffect(() => {
      const t = setInterval(
        () => setActiveIdx((p) => (p + 1) % slides.length),
        9000,
      );
      return () => clearInterval(t);
    }, [slides.length]);

    return (
      <motion.div
        className="relative flex flex-col justify-end w-full overflow-hidden"
        style={{ minHeight: "50vh", padding: "0 0 48px 0" }}
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
            <div
              className="absolute inset-0"
              style={{ background: HERO_BG[activeIdx % HERO_BG.length] }}
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${V.bg} 88%)`,
              }}
            />
            <Icon
              className="absolute -right-10 top-10 opacity-[0.04] transform rotate-12"
              size={480}
              style={{ color: activeSlide.accent }}
            />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 w-full pl-8 md:pl-12 flex items-end justify-between pr-8 md:pr-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon size={12} style={{ color: activeSlide.accent }} />
                <span
                  className="text-[10px] font-black tracking-[0.2em]"
                  style={{ color: activeSlide.accent }}
                >
                  {activeSlide.label}
                </span>
              </div>
              <h1
                className="font-display font-black leading-none mb-4"
                style={{
                  fontSize: "clamp(2rem,5vw,3.8rem)",
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
              <div className="flex items-center gap-4">
                <motion.button
                  onClick={activeSlide.ctaFn}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-3 font-black text-xs px-8 py-3.5 rounded-full transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
                    color: "#000",
                    boxShadow: "0 0 30px rgba(191,162,100,0.2)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {activeSlide.cta} <ArrowUpRight size={14} strokeWidth={3} />
                </motion.button>
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        i === activeIdx
                          ? "w-6 h-2 bg-white"
                          : "w-2 h-2 bg-white/20 hover:bg-white/40",
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
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
  },
);

/* ─── Vault Card ─────────────────────────────────────────────────────────── */
const VaultCard = memo(({ asset, idx }) => {
  const categoryIcons = {
    resume: FileText,
    certificate: Award,
    project: Briefcase,
    default: Database,
  };
  const Icon =
    categoryIcons[asset.category?.toLowerCase()] || categoryIcons.default;
  const isVerified = asset.status === "VERIFIED";
  return (
    <motion.div
      {...FADE_UP(idx * 0.06)}
      className="shrink-0 relative cursor-pointer group rounded-xl overflow-hidden"
      style={{ width: 160, height: 240, scrollSnapAlign: "start" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom,transparent 0%,${V.depth} 40%,${V.elevated} 100%)`,
          opacity: 0.7,
        }}
      />
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isVerified
            ? "linear-gradient(to top,rgba(74,222,128,0.12) 0%,transparent 100%)"
            : `linear-gradient(to top,${G.dimBg} 0%,transparent 100%)`,
        }}
      />
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
      <div className="absolute -right-4 -bottom-4 opacity-[0.07] group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none">
        <Icon size={140} style={{ color: G.base }} />
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 p-4"
        style={{
          background:
            "linear-gradient(0deg,rgba(3,3,3,1) 0%,rgba(3,3,3,0.8) 40%,transparent 100%)",
        }}
      >
        <p
          className="text-xs font-black leading-tight line-clamp-2"
          style={{ color: T.primary }}
        >
          {asset.title || asset.category || "Asset"}
        </p>
        <p
          className="text-[9px] mt-1.5 font-bold uppercase tracking-[0.2em]"
          style={{ color: G.base }}
        >
          {asset.category || "Credential"}
        </p>
      </div>
    </motion.div>
  );
});

/* ─── Rival Card ─────────────────────────────────────────────────────────── */
const RivalCard = memo(({ rival, userScore, idx }) => {
  const score = rival.targetScore || rival.discotiveScore?.current || 0;
  const isAbove = score > userScore;
  const diff = Math.abs(score - userScore);
  const name =
    rival.targetName ||
    `${rival.identity?.firstName || ""} ${rival.identity?.lastName || ""}`.trim() ||
    "Operator";
  const username = rival.targetUsername || rival.identity?.username || "—";
  const avatarUrl =
    rival.targetAvatar ||
    rival.identity?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A0A0A&color=BFA264`;

  return (
    <motion.div
      {...FADE_UP(idx * 0.07)}
      className="shrink-0 relative cursor-pointer group rounded-xl overflow-hidden"
      style={{
        width: 180,
        height: 270,
        background: V.depth,
        scrollSnapAlign: "start",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Subtle Background Avatar */}
      <div className="absolute inset-0 z-0">
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover opacity-[0.25] group-hover:opacity-10 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(to top,${isAbove ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"} 0%,transparent 100%)`,
          }}
        />
      </div>

      {/* Above/Below Tag (Always Visible) */}
      <div className="absolute top-4 left-4 z-20">
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{
            background: isAbove
              ? "rgba(248,113,113,0.15)"
              : "rgba(74,222,128,0.15)",
            border: `1px solid ${isAbove ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`,
            backdropFilter: "blur(4px)",
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
            {isAbove ? "Above" : "Below"}
          </span>
        </div>
      </div>

      {/* Hover Details */}
      <div className="relative z-10 p-4 flex flex-col h-full justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
        <span
          className="font-display font-black text-3xl leading-none mb-1"
          style={{ color: G.bright, letterSpacing: "-0.04em" }}
        >
          {score.toLocaleString()}
        </span>
        <span
          className="text-sm font-bold truncate leading-tight mb-0.5"
          style={{ color: T.primary }}
        >
          {name}
        </span>
        <span
          className="text-[9px] font-mono truncate mb-2"
          style={{ color: T.dim }}
        >
          @{username}
        </span>
        <span
          className="text-[10px] font-black font-mono mt-1"
          style={{ color: isAbove ? "#F87171" : "#4ADE80" }}
        >
          {isAbove ? "-" : "+"}
          {diff.toLocaleString()} pts
        </span>
      </div>
    </motion.div>
  );
});

/* ─── Alliance Card ──────────────────────────────────────────────────────── */
const AllianceCard = memo(({ ally, idx }) => {
  const score = ally.discotiveScore?.current || 0;
  const name =
    `${ally.identity?.firstName || ""} ${ally.identity?.lastName || ""}`.trim() ||
    "Operator";
  const username = ally.identity?.username || "—";
  const avatarUrl =
    ally.identity?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0A0A0A&color=8B5CF6`;

  return (
    <motion.div
      {...FADE_UP(idx * 0.07)}
      className="shrink-0 relative cursor-pointer group rounded-xl overflow-hidden"
      style={{
        width: 180,
        height: 270,
        background: V.depth,
        scrollSnapAlign: "start",
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute inset-0 z-0">
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover opacity-[0.25] group-hover:opacity-10 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `linear-gradient(to top,rgba(139,92,246,0.15) 0%,transparent 100%)`,
          }}
        />
      </div>

      <div className="absolute top-4 left-4 z-20">
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(139,92,246,0.15)",
            border: "1px solid rgba(139,92,246,0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          <Users size={8} style={{ color: "#8b5cf6" }} />
          <span
            className="text-[7px] font-black uppercase tracking-wider"
            style={{ color: "#8b5cf6" }}
          >
            Alliance
          </span>
        </div>
      </div>

      <div className="relative z-10 p-4 flex flex-col h-full justify-end opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
        <span
          className="font-display font-black text-3xl leading-none mb-1"
          style={{ color: G.bright, letterSpacing: "-0.04em" }}
        >
          {score.toLocaleString()}
        </span>
        <span
          className="text-sm font-bold truncate leading-tight mb-0.5"
          style={{ color: T.primary }}
        >
          {name}
        </span>
        <span
          className="text-[9px] font-mono truncate mb-2"
          style={{ color: T.dim }}
        >
          @{username}
        </span>
        <span
          className="text-[10px] font-black font-mono mt-1"
          style={{ color: "#8b5cf6" }}
        >
          {ally.identity?.domain || "General"}
        </span>
      </div>
    </motion.div>
  );
});

/* ─── Learn Video Card ───────────────────────────────────────────────────── */
const LearnCard = memo(({ video, idx }) => {
  const thumb =
    video.thumbnailUrl ||
    (video.youtubeId
      ? `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`
      : null);
  const dur = video.durationMinutes
    ? `${Math.floor(video.durationMinutes / 60) > 0 ? `${Math.floor(video.durationMinutes / 60)}h ` : ""}${video.durationMinutes % 60}m`
    : null;
  return (
    <motion.div
      {...FADE_UP(idx * 0.06)}
      className="shrink-0 relative rounded-xl overflow-hidden cursor-pointer group"
      style={{ width: 240, height: 145, scrollSnapAlign: "start" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={video.title}
          className="w-full h-full object-cover opacity-65 group-hover:opacity-90 transition-opacity duration-500"
        />
      ) : (
        <div className="w-full h-full bg-[#111] flex items-center justify-center">
          <Play size={32} style={{ color: G.base + "40" }} />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-white border-b-[6px] border-b-transparent ml-1" />
        </div>
      </div>
      {video.scoreReward > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded-lg border border-[#BFA264]/30">
          <Zap size={8} style={{ color: G.base }} />
          <span className="text-[8px] font-black" style={{ color: G.base }}>
            +{video.scoreReward}
          </span>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-xs font-black text-white leading-tight line-clamp-2 mb-1">
          {video.title}
        </p>
        {dur && (
          <p
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: "#a855f7" }}
          >
            {dur}
          </p>
        )}
      </div>
    </motion.div>
  );
});

/* ─── Swimlane Wrapper ───────────────────────────────────────────────────── */
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
    const scroll = useCallback(
      (dir) =>
        scrollRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" }),
      [],
    );
    return (
      <section className="relative" aria-label={label}>
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
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => scroll(1)}
                  className="p-1.5 rounded-full transition-all"
                  style={{ background: "rgba(255,255,255,0.04)", color: T.dim }}
                >
                  <ChevronRight size={13} />
                </button>
              </>
            )}
            {cta && ctaLink && (
              <Link
                to={ctaLink}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                style={{ color: G.base }}
              >
                {cta} <ArrowUpRight size={10} />
              </Link>
            )}
          </div>
        </div>
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full overflow-hidden py-4"
          >
            <div className="flex gap-4 opacity-50 pointer-events-none select-none">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shrink-0 border border-dashed rounded-[1rem] flex items-center justify-center"
                  style={{
                    width: 180,
                    height: 250,
                    borderColor: "rgba(255,255,255,0.25)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="w-12 h-12 rounded-full border border-dashed border-white/30 flex items-center justify-center">
                    <span className="text-white/30 font-black">+</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col items-start justify-center pl-8 z-10 bg-gradient-to-r from-[#030303] via-[#030303]/85 to-transparent">
              <span
                className="font-display font-black text-2xl leading-tight mb-2"
                style={{ color: T.primary, letterSpacing: "-0.02em" }}
              >
                {emptyTitle}
              </span>
              <p
                className="text-xs leading-relaxed max-w-sm mb-5"
                style={{ color: T.secondary }}
              >
                {emptySub}
              </p>
              {emptyCtaLink && emptyCtaLabel && (
                <Link
                  to={emptyCtaLink}
                  className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
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
          >
            {children}
          </div>
        )}
      </section>
    );
  },
);

/* ─── Opportunity Row ────────────────────────────────────────────────────── */
const OpportunityRow = memo(({ opp, idx }) => (
  <motion.div
    {...FADE_UP(idx * 0.04)}
    className="flex items-center justify-between py-4 cursor-pointer group"
    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    whileHover={{ x: 4 }}
    role="listitem"
  >
    <div className="flex items-center gap-4 flex-1 min-w-0">
      <div
        className="shrink-0 rounded-full flex items-center justify-center font-display font-black text-[11px]"
        style={{
          width: 40,
          height: 40,
          background: `conic-gradient(${G.bright} ${opp.match || 80}%, rgba(255,255,255,0.05) 0%)`,
          color: T.primary,
        }}
      >
        {opp.match || 80}
      </div>
      <div className="min-w-0">
        <p
          className="font-bold text-sm truncate leading-tight"
          style={{ color: T.primary }}
        >
          {opp.title || "Opportunity"}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
          {opp.company || opp.domain || "General"} · {opp.type || "Bounty"}
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

/* ─── Command Actions Strip ──────────────────────────────────────────────── */
const CommandActions = memo(({ navigate, isPro }) => {
  const actions = [
    {
      label: "Learn",
      icon: GraduationCap,
      href: "/app/learn",
      color: "#8b5cf6",
    },
    {
      label: "Opps",
      icon: Briefcase,
      href: "/app/opportunities",
      color: "#f59e0b",
    },
    {
      label: "CoLists",
      icon: BookOpen,
      href: "/colists",
      color: "#38bdf8",
    },
    {
      label: "Profile",
      icon: User,
      href: "/app/profile",
      color: "#10b981",
    },
    {
      label: "Agenda",
      icon: Calendar,
      href: "/app/agenda",
      color: G.base,
      locked: !isPro, // MAANG FIX: Cryptographically link the quick action to the Pro tier
    },
  ];
  return (
    <div
      className="flex gap-2 overflow-x-auto hide-scrollbar pb-1"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.button
            key={a.label}
            onClick={() => !a.locked && navigate(a.href)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={!a.locked ? { scale: 1.04 } : {}}
            whileTap={!a.locked ? { scale: 0.95 } : {}}
            className={cn(
              "relative shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border transition-all",
              a.locked ? "opacity-60 cursor-not-allowed" : "",
            )}
            style={{
              minWidth: 68,
              height: 68,
              background: "rgba(255,255,255,0.03)",
              borderColor: `${a.color}25`,
            }}
          >
            {a.locked && (
              <div className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-[#030303]/80 border border-white/10 backdrop-blur-md">
                <Lock size={8} style={{ color: T.dim }} />
              </div>
            )}
            <Icon size={18} style={{ color: a.color }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              {a.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
});

/* ─── Profile Stats Bar ──────────────────────────────────────────────────── */
const ProfileStatsBar = memo(({ userData, score }) => {
  const views = userData?.profileViews || 0;
  const alliesCount = (userData?.allies || []).length;
  const vaultCount = (userData?.vault || []).length;
  const streak = userData?.discotiveScore?.streak || 0;

  // Synthesize metrics scaling 0-100%
  const velocityPct = Math.min(100, Math.round(streak * 5 + views / 10) || 15);
  const networkPct = Math.min(100, Math.round(alliesCount * 15) || 10);
  const vaultPct = Math.min(100, Math.round(vaultCount * 25) || 5);

  const getStrengthData = (pct) => {
    if (pct >= 70)
      return {
        label: "Strong",
        color: "#4ADE80",
        rgb: "74,222,128",
        trend: "up",
      };
    if (pct >= 40)
      return {
        label: "Medium",
        color: "#FBBF24",
        rgb: "251,191,36",
        trend: "up",
      };
    return {
      label: "Weak",
      color: "#F87171",
      rgb: "248,113,113",
      trend: "down",
    };
  };

  const blocks = [
    {
      title: "Velocity",
      sub: "Profile",
      pct: velocityPct,
      ...getStrengthData(velocityPct),
    },
    {
      title: "Coverage",
      sub: "Network",
      pct: networkPct,
      ...getStrengthData(networkPct),
    },
    {
      title: "Strength",
      sub: "Vault",
      pct: vaultPct,
      ...getStrengthData(vaultPct),
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {blocks.map((b, i) => (
        <motion.div
          key={b.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative group overflow-hidden p-4 rounded-xl border flex flex-col justify-between transition-all duration-300 cursor-default"
          style={{
            height: 90,
            background: `linear-gradient(135deg, ${V.surface} 0%, rgba(${b.rgb},0.05) 100%)`,
            borderColor: `rgba(${b.rgb},0.15)`,
          }}
        >
          {/* ... */}
          {/* Hover State Data */}
          <div
            className="absolute inset-0 z-20 flex items-center justify-between px-5 opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{
              background: `linear-gradient(135deg, rgba(${b.rgb},0.08) 0%, rgba(${b.rgb},0.15) 100%)`,
              backdropFilter: "blur(2px)",
            }}
          >
            <div className="flex flex-col">
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: b.color }}
              >
                {b.label}
              </span>
            </div>
            <span
              className="font-display font-black text-3xl"
              style={{ color: b.color }}
            >
              {b.pct}%
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

/* ─── Latest Activity Status (Universal Connector) ───────────────────────── */
const LatestActivityStatus = memo(({ log }) => {
  if (!log) return null;
  const isPositive = (log.change || 0) > 0;
  const isNegative = (log.change || 0) < 0;
  const color = isPositive ? "#4ADE80" : isNegative ? "#F87171" : T.secondary;
  const sign = isPositive ? "+" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between w-full"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative flex items-center justify-center shrink-0">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full animate-ping opacity-40"
            style={{ background: color }}
          />
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em] shrink-0"
          style={{ color: T.dim }}
        >
          Latest Activity
        </span>
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: T.primary }}
        >
          {log.reason || "System Synchronization"}
        </span>
      </div>
      {log.change !== 0 && log.change !== undefined && (
        <div className="shrink-0 ml-3">
          <span
            className="text-[10px] font-black font-mono tracking-wide"
            style={{ color }}
          >
            {sign}
            {log.change} pts
          </span>
        </div>
      )}
    </motion.div>
  );
});

/* ─── Agenda Preview Widget ────────────────────────────────────────────── */
const AgendaPreview = memo(({ userData, isPro, navigate }) => {
  const [latestEntry, setLatestEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;
    let isMounted = true;
    const fetchLatest = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users", userData.uid, "agenda"),
            orderBy(documentId(), "desc"),
            limit(1),
          ),
        );
        if (!snap.empty && isMounted) {
          setLatestEntry({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      } catch (e) {
        console.error("[AgendaPreview] fetch failed:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchLatest();
    return () => {
      isMounted = false;
    };
  }, [userData?.uid]);

  return (
    <div
      className="relative w-full group cursor-pointer"
      onClick={() => navigate(isPro ? "/app/agenda" : "/premium")}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <SectionLabel icon={Calendar} color={G.base}>
          Agenda
        </SectionLabel>
        {!isPro && <Lock size={12} style={{ color: "#f59e0b" }} />}
      </div>

      <motion.div
        whileHover={{ x: 6 }}
        className="relative flex flex-col justify-center overflow-hidden transition-all duration-500 rounded-r-2xl"
        style={{
          minHeight: 100,
          padding: "16px 20px",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)",
          borderLeft: `2px solid ${isPro ? G.bright : "rgba(255,255,255,0.1)"}`,
        }}
      >
        {loading ? (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="w-1/2 h-5 bg-white/5 rounded" />
            <div className="w-1/3 h-3 bg-white/5 rounded" />
          </div>
        ) : latestEntry ? (
          <>
            <h3
              className="font-display font-black text-2xl md:text-3xl text-white tracking-tight mb-2 truncate pr-10"
              style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
            >
              {latestEntry.title || "Untitled Entry"}
            </h3>
            <div className="flex items-center gap-3">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: G.bright }}
              >
                {new Date(latestEntry.id + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
              </p>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <p
                className="text-[9px] font-mono tracking-widest uppercase"
                style={{ color: T.dim }}
              >
                {
                  (latestEntry.content || "").split(/\s+/).filter(Boolean)
                    .length
                }
                words
              </p>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-display font-black text-xl md:text-2xl text-white/40 tracking-tight mb-2">
              No entries logged.
            </h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              Awaiting execution data.
            </p>
          </>
        )}

        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
          <ArrowRight size={18} style={{ color: isPro ? G.bright : T.dim }} />
        </div>
      </motion.div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE NATIVE DASHBOARD
   Completely independent layout — not stacked desktop
══════════════════════════════════════════════════════════════════════════ */
const MobileDashboard = ({
  userData,
  score,
  lastScore,
  streak,
  level,
  levelPct,
  globalPct,
  domainPct,
  vaultAssets,
  rivals,
  allies,
  learnItems,
  opps,
  telemetryEvents,
  lbRank,
  lbFilter,
  chartTf,
  setChartTf,
  chartData,
  chartMin,
  scoreLogs,
  isPro,
  navigate,
}) => {
  const [activeSection, setActiveSection] = useState(0);
  const vaultCount = vaultAssets.length;
  const alliesCount = (userData?.allies || []).length;
  const profileViews = userData?.profileViews || 0;
  const operatorName = userData?.identity?.firstName || "Operator";

  return (
    <div
      className="min-h-screen pb-32 select-none"
      style={{ background: V.bg }}
    >
      {/* ── MOBILE HERO CARD ── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(180deg, rgba(191,162,100,0.12) 0%, ${V.bg} 100%)`,
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px]"
            style={{ background: "rgba(191,162,100,0.12)" }}
          />
        </div>

        <div className="relative z-10 px-5 pt-5 pb-6">
          {/* Top row: name + badges */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isPro && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                      color: G.bright,
                    }}
                  >
                    <Crown size={8} /> PRO
                  </div>
                )}
                <span
                  className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Level {level} Operator
                </span>
              </div>
              <h1
                className="font-display font-black text-2xl leading-tight"
                style={{ color: T.primary, letterSpacing: "-0.02em" }}
              >
                {operatorName}
              </h1>
              <p
                className="text-[10px] mt-0.5 font-mono"
                style={{ color: T.dim }}
              >
                {userData?.identity?.domain || "General"}
              </p>
            </div>
            <OrbitalRings
              score={score}
              lastScore={lastScore}
              globalPct={globalPct}
              domainPct={domainPct}
              size={90}
            />
          </div>

          {/* Level progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-bold" style={{ color: T.dim }}>
                Level {level} → {level + 1}
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
              style={{ height: 2.5, background: "rgba(255,255,255,0.06)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg,${G.deep},${G.bright})`,
                  boxShadow: `0 0 6px rgba(191,162,100,0.5)`,
                }}
              />
            </div>
          </div>

          {/* Quick stats row (horizontal scroll) */}
          <div
            className="overflow-x-auto hide-scrollbar -mx-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="flex gap-2 px-1 pb-1"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {[
                {
                  label: "Rank",
                  value: lbRank === "?" ? "—" : `#${lbRank}`,
                  color: G.bright,
                  sub: lbFilter,
                },
                {
                  label: "Streak",
                  value: `${streak}d`,
                  color: streak >= 7 ? "#f97316" : T.secondary,
                },
                {
                  label: "Top",
                  value: globalPct === 100 ? "—" : `${globalPct}%`,
                  color: "#10b981",
                  sub: "Global",
                },
                { label: "Vault", value: vaultCount, color: "#38bdf8" },
                { label: "Allies", value: alliesCount, color: "#8b5cf6" },
                { label: "Views", value: profileViews, color: G.base },
              ].map((s, i) => (
                <div
                  key={i}
                  className="shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-xl border px-4 py-3 text-center"
                  style={{
                    minWidth: 70,
                    minHeight: 64,
                    scrollSnapAlign: "start",
                    background: "rgba(255,255,255,0.03)",
                    borderColor: `${s.color}25`,
                  }}
                >
                  <span
                    className="font-display font-black text-lg leading-none"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="text-[7px] font-bold uppercase tracking-widest mt-0.5"
                    style={{ color: T.dim }}
                  >
                    {s.sub || s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CHART (compact, full width) ── */}
      <div className="px-4 mt-2 mb-3 tut-velocity">
        <div className="flex items-center justify-between mb-2 px-1">
          <span
            className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Score Velocity
          </span>
          <div className="flex gap-1 bg-[#111] p-0.5 rounded-lg border border-[#222]">
            {["24H", "1W", "1M", "ALL"].map((t) => (
              <button
                key={t}
                onClick={() => setChartTf(t)}
                className={cn(
                  "text-[8px] font-black uppercase px-2 py-1 rounded-md transition-all",
                  chartTf === t
                    ? "bg-[#BFA264]/15 text-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.2)]"
                    : "text-[#555] hover:text-[#888]",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 72 }}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={1}
            minHeight={1}
          >
            <AreaChart
              data={chartData}
              margin={{ top: 4, bottom: 4, left: 0, right: 0 }}
            >
              <defs>
                <linearGradient id="mobileSparkG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#BFA264" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#BFA264" stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={[chartMin, "auto"]} hide />
              <ReTooltip
                content={<ScoreTooltip scoreLogs={scoreLogs} />}
                cursor={{ stroke: "rgba(191,162,100,0.3)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#BFA264"
                strokeWidth={1.5}
                fill="url(#mobileSparkG)"
                dot={false}
                activeDot={{
                  r: 3,
                  fill: "#BFA264",
                  stroke: "#030303",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── LATEST ACTIVITY (Minimalist Space Integration) ── */}
      <div className="px-5 mb-5 mt-1">
        <LatestActivityStatus log={scoreLogs?.[0]} />
      </div>

      {/* ── COMMAND ACTIONS ── */}
      <div className="px-4 mb-5 tut-quick-actions">
        <p
          className="text-[9px] font-black uppercase tracking-widest mb-3"
          style={{ color: T.dim }}
        >
          Quick Actions
        </p>
        <CommandActions navigate={navigate} isPro={isPro} />
      </div>

      {/* ── CONNECTED APPS ── */}
      <div className="px-4 mb-5">
        <ConnectedAppsStrip userData={userData} navigate={navigate} />
      </div>

      {/* ── HERO DIRECTIVE (mobile compact) ── */}
      <div className="px-4 mb-5">
        <HeroDirective
          userData={userData}
          vaultCount={vaultCount}
          isPro={isPro}
          navigate={navigate}
          score={score}
          last24h={lastScore}
        />
      </div>

      {/* ── PROFILE COMPLETION WIDGET ── */}
      {!userData?.deferredOnboardingComplete && (
        <div className="px-4 mb-5">
          <ProfileCompletenessWidget userData={userData} />
        </div>
      )}

      {/* ── OPPORTUNITIES ── */}
      <div className="px-4 mb-6 tut-opportunities">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={12} style={{ color: G.base }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              Latest Opportunities
            </span>
          </div>
          <Link
            to="/app/connective"
            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: G.base }}
          >
            All <ArrowUpRight size={9} />
          </Link>
        </div>
        {opps.length === 0 ? (
          <div
            className="py-6 pl-4 border-l-2"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          >
            <p
              className="text-xs font-black"
              style={{ color: "rgba(255,255,255,0.15)" }}
            >
              No opportunities yet.
            </p>
            <p className="text-[10px] mt-1" style={{ color: T.dim }}>
              Domain-matched bounties will appear here.
            </p>
          </div>
        ) : (
          <div>
            {opps.map((o, i) => (
              <OpportunityRow key={o.id || i} opp={o} idx={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── POSITION MATRIX ── */}
      <div className="px-4 mb-6 tut-position">
        <SectionLabel icon={Compass} color={G.base}>
          Position Matrix
        </SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {[
            { pct: globalPct, label: "Global", color: G.base, free: true },
            { pct: domainPct, label: "Domain", color: "#10b981", free: false },
            {
              pct: userData?.precomputed?.nichePercentile || 100,
              label: "Niche",
              color: "#38bdf8",
              free: false,
            },
            {
              pct: userData?.precomputed?.parallelPercentile || 100,
              label: "Path",
              color: "#8b5cf6",
              free: false,
            },
          ].map((m) =>
            m.free || isPro ? (
              <MiniRadialRing key={m.label} {...m} size={64} />
            ) : (
              <LockedMiniRing
                key={m.label}
                label={m.label}
                color={m.color}
                size={64}
                navigate={navigate}
              />
            ),
          )}
        </div>
      </div>

      {/* ── RIVALS (horizontal scroll) ── */}
      <div className="mb-6 tut-rivals">
        <div className="flex items-center justify-between mb-3 px-4">
          <div className="flex items-center gap-2">
            <Crosshair size={12} style={{ color: "#F87171" }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              Rivals
            </span>
          </div>
          <Link
            to="/app/connective"
            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: G.base }}
          >
            Network <ArrowUpRight size={9} />
          </Link>
        </div>
        {rivals.length === 0 ? (
          <div
            className="px-4 py-5 mx-4 rounded-xl border border-dashed text-center"
            style={{
              borderColor: "rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.04)",
            }}
          >
            <Crosshair
              size={24}
              style={{ color: "rgba(239,68,68,0.3)", margin: "0 auto 8px" }}
            />
            <p
              className="text-xs font-black"
              style={{ color: "rgba(239,68,68,0.5)" }}
            >
              No rivals tracked yet.
            </p>
            <button
              onClick={() => navigate("/app/connective")}
              className="mt-3 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.1)",
                color: "#F87171",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              Add Rivals →
            </button>
          </div>
        ) : (
          <div
            className="overflow-x-auto hide-scrollbar px-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="flex gap-3"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {rivals.map((r, i) => (
                <RivalCard key={r.id} rival={r} userScore={score} idx={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ALLIANCES (horizontal scroll) ── */}
      <div className="mb-6 tut-alliances">
        <div className="flex items-center justify-between mb-3 px-4">
          <div className="flex items-center gap-2">
            <Users size={12} style={{ color: "#8b5cf6" }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              Alliances
            </span>
          </div>
          <Link
            to="/app/connective"
            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: G.base }}
          >
            Network <ArrowUpRight size={9} />
          </Link>
        </div>
        {allies.length === 0 ? (
          <div
            className="px-4 py-5 mx-4 rounded-xl border border-dashed text-center"
            style={{
              borderColor: "rgba(139,92,246,0.2)",
              background: "rgba(139,92,246,0.04)",
            }}
          >
            <Users
              size={24}
              style={{ color: "rgba(139,92,246,0.3)", margin: "0 auto 8px" }}
            />
            <p
              className="text-xs font-black"
              style={{ color: "rgba(139,92,246,0.5)" }}
            >
              No alliances forged.
            </p>
            <button
              onClick={() => navigate("/app/connective")}
              className="mt-3 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg"
              style={{
                background: "rgba(139,92,246,0.1)",
                color: "#8b5cf6",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              Find Allies →
            </button>
          </div>
        ) : (
          <div
            className="overflow-x-auto hide-scrollbar px-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="flex gap-3"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {allies.map((a, i) => (
                <AllianceCard key={a.id} ally={a} idx={i} />
              ))}
              {(userData?.allies?.length || 0) > 20 && (
                <div
                  onClick={() => navigate("/app/connective")}
                  className="shrink-0 flex items-center justify-center cursor-pointer group rounded-xl border border-dashed border-[#8b5cf6]/30 bg-[#8b5cf6]/5 hover:bg-[#8b5cf6]/10 transition-colors"
                  style={{ width: 180, height: 270, scrollSnapAlign: "start" }}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border border-[#8b5cf6]/50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <ArrowRight size={20} style={{ color: "#8b5cf6" }} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]">
                      See All {userData?.allies?.length || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CONSISTENCY (horizontal scroll, 44px touch) ── */}
      <div className="px-4 mb-6 tut-consistency">
        <ConsistencyMatrix userData={userData} horizontal={true} />
      </div>

      {/* ── STREAK MILESTONES ── */}
      <div className="px-4 mb-6 tut-streak-milestones">
        <SectionLabel icon={Flame} color="#f97316">
          Streak Milestones
        </SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { target: 7, label: "7D", color: G.bright },
            { target: 14, label: "2W", color: "#f97316" },
            { target: 30, label: "1M", color: "#38bdf8" },
          ].map((m) => {
            const hit = streak >= m.target;
            const pct = Math.min(100, (streak / m.target) * 100);
            return (
              <div key={m.target} className="relative group cursor-default">
                <motion.div
                  whileHover={{ scale: 1.04 }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all overflow-hidden relative",
                    hit
                      ? "bg-white/[0.05] border-white/10"
                      : "bg-white/[0.02] border-white/[0.04]",
                  )}
                  style={{ minHeight: 72 }}
                >
                  <span
                    className="text-lg font-black font-display leading-none mb-1.5 z-10"
                    style={{ color: hit ? m.color : T.dim }}
                  >
                    {m.label}
                  </span>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden z-10">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: m.color }}
                    />
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                    <span
                      className="text-[9px] font-black uppercase tracking-wider"
                      style={{ color: hit ? m.color : T.dim }}
                    >
                      {hit ? "Unlocked" : `${m.target - streak} Days Left`}
                    </span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONSISTENCY BADGES ── */}
      <div className="px-4 mb-6">
        <ConsistencyBadges streak={streak} />
      </div>

      {/* ── VAULT (horizontal scroll) ── */}
      {vaultAssets.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-4">
            <div className="flex items-center gap-2">
              <Database size={12} style={{ color: G.base }} />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                Vault Arsenal
              </span>
            </div>
            <Link
              to="/app/vault"
              className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
              style={{ color: G.base }}
            >
              Full Vault <ArrowUpRight size={9} />
            </Link>
          </div>
          <div
            className="overflow-x-auto hide-scrollbar px-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="flex gap-3"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {vaultAssets.map((a, i) => (
                <VaultCard key={a.id || i} asset={a} idx={i} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LEARN (horizontal scroll) ── */}
      <div className="mb-6 tut-learn">
        <div className="flex items-center justify-between mb-3 px-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={12} style={{ color: "#8b5cf6" }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              Discotive Learn
            </span>
          </div>
          <Link
            to="/app/learn"
            className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: G.base }}
          >
            All <ArrowUpRight size={9} />
          </Link>
        </div>
        {learnItems.length === 0 ? (
          <div
            className="px-4 py-5 mx-4 rounded-xl text-center"
            style={{
              background: "rgba(139,92,246,0.05)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <GraduationCap
              size={24}
              style={{ color: "rgba(139,92,246,0.4)", margin: "0 auto 8px" }}
            />
            <p
              className="text-xs font-black"
              style={{ color: "rgba(139,92,246,0.5)" }}
            >
              No learning resources in your domain yet.
            </p>
            <button
              onClick={() => navigate("/app/learn")}
              className="mt-3 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg"
              style={{
                background: "rgba(139,92,246,0.1)",
                color: "#8b5cf6",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              Browse All →
            </button>
          </div>
        ) : (
          <div
            className="overflow-x-auto hide-scrollbar px-4"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div
              className="flex gap-3"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {learnItems.map((v, i) => (
                <LearnCard key={v.id} video={v} idx={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── LIVE SIGNAL ── */}
      <div className="px-4 mb-6 tut-live-signal">
        <GlobalTicker events={telemetryEvents} />
      </div>

      {/* ── AGENDA PREVIEW (mobile) ── */}
      <div className="px-4 mb-6 tut-agenda">
        <AgendaPreview userData={userData} isPro={isPro} navigate={navigate} />
      </div>
    </div>
  );
};

/* ─── Connected Apps Strip ───────────────────────────────────────────────── */
const CONNECTOR_META = {
  github: {
    label: "GitHub",
    color: "#e6edf3",
    bg: "#0d1117",
    border: "rgba(230,237,243,0.15)",
    glow: "rgba(230,237,243,0.08)",
    Icon: ({ ...p }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  youtube: {
    label: "YouTube",
    color: "#ff4e45",
    bg: "#0f0000",
    border: "rgba(255,78,69,0.2)",
    glow: "rgba(255,78,69,0.08)",
    Icon: ({ ...p }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
};

const isConnected = (key, userData) => {
  const c = userData?.connectors?.[key];
  if (!c) return false;
  if (key === "github") return !!c.username;
  if (key === "youtube") return !!c.channelUrl;
  return false;
};

const ConnectedAppsStrip = memo(({ userData, navigate }) => {
  const connected = Object.entries(CONNECTOR_META).filter(([key]) =>
    isConnected(key, userData),
  );

  if (connected.length === 0) return null;

  return (
    <div>
      <SectionLabel icon={Zap} color={G.base}>
        Connected Apps
      </SectionLabel>
      <div
        className="flex gap-5 overflow-x-auto hide-scrollbar pt-2 pb-4 px-1"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {connected.map(([key, meta]) => {
          const { Icon } = meta;
          const connData = userData?.connectors?.[key];
          const sub =
            key === "github"
              ? `@${connData?.username}`
              : key === "youtube"
                ? connData?.handle
                  ? `@${connData.handle}`
                  : "Connected"
                : "Connected";

          return (
            <div
              key={key}
              className="flex flex-col items-center gap-2.5 shrink-0"
            >
              <motion.button
                whileHover="hover"
                whileTap="tap"
                onClick={() => navigate(`/app/vault/connectors/${key}`)}
                className="relative w-[68px] h-[68px] rounded-full flex items-center justify-center overflow-hidden shrink-0 group"
                style={{
                  background: meta.bg,
                  border: `1px solid ${meta.border}`, // Sleek transparent app-specific border, no harsh gold.
                  boxShadow: `0 4px 20px ${meta.glow}`,
                }}
                variants={{
                  hover: { scale: 1.05 },
                  tap: { scale: 0.95 },
                }}
              >
                {/* Base App Logo */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  variants={{
                    hover: { opacity: 0, scale: 0.7, filter: "blur(4px)" },
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Icon className="w-8 h-8" style={{ color: meta.color }} />
                </motion.div>

                {/* Animated Redirect Arrow */}
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.5, y: 12, rotate: -15 }}
                  variants={{
                    hover: { opacity: 1, scale: 1, y: 0, rotate: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ArrowUpRight
                    className="w-7 h-7"
                    style={{ color: meta.color }}
                  />
                </motion.div>
              </motion.button>

              {/* Profile/Sub Text Data Underneath */}
              <div className="flex flex-col items-center text-center">
                <span
                  className="text-[10px] font-black leading-tight"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                <span
                  className="text-[8px] font-mono mt-0.5 truncate max-w-[70px]"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {sub}
                </span>
              </div>
            </div>
          );
        })}

        {/* Add more connector CTA (Story Aesthetic) */}
        <div className="flex flex-col items-center gap-2.5 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05, background: "rgba(255,255,255,0.06)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/app/vault")}
            className="w-[68px] h-[68px] rounded-full flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.15)",
            }}
          >
            <Plus className="w-6 h-6" style={{ color: T.dim }} />
          </motion.button>
          <div className="flex flex-col items-center text-center mt-[1px]">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
              Add New
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();
  const telemetryEvents = useTelemetryStream(userData);

  /* ── Core metrics ── */
  const score = userData?.discotiveScore?.current ?? 0;
  const lastScore = userData?.discotiveScore?.last24h ?? score;
  const streak = (() => {
    const s = userData?.discotiveScore?.streak || 0;
    const last = userData?.discotiveScore?.lastLoginDate;
    const today = new Date().toISOString().split("T")[0];
    return s === 0 && last === today ? 1 : s;
  })();
  const vaultAssets = userData?.vault || [];
  const vaultCount = vaultAssets.length;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const levelPct = ((score % 1000) / 1000) * 100;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const operatorName =
    userData?.identity?.firstName ||
    userData?.identity?.fullName?.split(" ")[0] ||
    "Operator";
  const domain = userData?.identity?.domain || null;

  /* ── Remote data ── */
  const { data: percentilesData } = usePercentiles(score, userData);
  const globalPct = percentilesData?.global ?? 100;
  const domainPct = percentilesData?.domain ?? 100;
  const { rivals: rawRivals, loading: rivalsLoading } = useTrackedRivals(
    userData?.uid,
  );
  const { allies, loading: alliesLoading } = useAlliances(userData?.allies);

  // Filter out allies from rivals just in case they bled over
  const rivals = useMemo(() => {
    const allyIds = new Set(userData?.allies || []);
    return rawRivals.filter((r) => !allyIds.has(r.targetId));
  }, [rawRivals, userData?.allies]);

  const { items: learnItems } = useLearnPreview(domain);
  const opps = useOpportunities(userData?.uid, domain);
  const scoreLogs = useScoreLog(userData?.uid);
  const { rank: lbRank, filter: lbFilter } = useLbRank(
    userData?.uid,
    score,
    domain,
  );

  /* ── Chart ── */
  const [chartTf, setChartTf] = useState("1W");
  const { data: rawHistory = [] } = useScoreHistory(chartTf);
  const chartData = useMemo(
    () => rawHistory.map((e) => ({ day: e.date, score: e.score })),
    [rawHistory],
  );
  const chartMin = useMemo(() => {
    if (!chartData.length) return 0;
    const vals = chartData.map((d) => d.score);
    const min = Math.min(...vals);
    return Math.max(0, min - Math.ceil((Math.max(...vals) - min) * 0.2 + 5));
  }, [chartData]);

  /* ── HUD toggle ── */
  const [isHudOpen, setIsHudOpen] = useState(true);

  // Push notifications
  usePushNotifications(userData?.uid);

  // Tutorial gate — checks database directly, triggers spotlight sequence
  const [showTutorial, setShowTutorial] = useState(false);
  useEffect(() => {
    if (!userData?.uid || userLoading) return;
    const hasSeen =
      userData.meta?.tutorialSeen || localStorage.getItem(TUTORIAL_KEY);
    const t = setTimeout(() => {
      if (!hasSeen) setShowTutorial(true);
    }, 1200);
    return () => clearTimeout(t);
  }, [userData, userLoading]);

  if (userLoading) return <DashboardSkeleton />;

  /* ── Shared props for both layouts ── */
  const sharedProps = {
    userData,
    score,
    lastScore,
    streak,
    level,
    levelPct,
    globalPct,
    domainPct,
    vaultAssets,
    rivals,
    allies,
    learnItems,
    opps,
    telemetryEvents,
    lbRank,
    lbFilter,
    chartTf,
    setChartTf,
    chartData,
    chartMin,
    scoreLogs,
    isPro,
    navigate,
  };

  return (
    <>
      <AnimatePresence>
        {showTutorial && (
          <OnboardingTutorial
            uid={userData?.uid}
            onDismiss={() => setShowTutorial(false)}
          />
        )}
      </AnimatePresence>
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
      </Helmet>

      <div
        className="text-[#F5F0E8] font-body selection:bg-[rgba(191,162,100,0.3)]"
        style={{ background: V.bg }}
      >
        {/* Streak banner */}
        <StreakRiskBanner
          streak={streak}
          lastLoginDate={userData?.discotiveScore?.lastLoginDate}
          createdAt={userData?.createdAt}
        />

        {/* ── MOBILE LAYOUT (< lg) ── */}
        <div className="lg:hidden">
          <MobileDashboard {...sharedProps} />
        </div>

        {/* ── DESKTOP LAYOUT (lg+) ── */}
        <div className="hidden lg:flex h-screen overflow-hidden relative">
          {/* HUD toggle when closed */}
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
                <div className="flex items-center -space-x-2">
                  <ChevronLeft size={20} className="opacity-100" />
                  <ChevronLeft size={20} className="opacity-70" />
                  <ChevronLeft size={20} className="opacity-40" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── STAGE (75%) ── */}
          <main
            className="flex-1 overflow-y-auto hide-scrollbar relative z-0 transition-all duration-500"
            style={{
              scrollBehavior: "smooth",
              marginRight: isHudOpen ? "25vw" : "0",
            }}
          >
            <div className="relative z-10 w-full pb-32">
              <HeroDirective
                userData={userData}
                vaultCount={vaultCount}
                isPro={isPro}
                navigate={navigate}
                score={score}
                last24h={lastScore}
              />

              {/* Profile Completeness */}
              {!userData?.deferredOnboardingComplete && (
                <motion.section
                  {...FADE_UP(0.07)}
                  className="px-8 md:px-12 pb-6"
                >
                  <ProfileCompletenessWidget userData={userData} />
                </motion.section>
              )}

              {/* Profile Stats */}
              <motion.section {...FADE_UP(0.08)} className="px-8 md:px-12 pb-8">
                <SectionLabel icon={Activity} color={G.base}>
                  Operator Stats
                </SectionLabel>
                <ProfileStatsBar userData={userData} score={score} />
              </motion.section>

              {/* Latest Activity Connector */}
              <motion.section
                {...FADE_UP(0.085)}
                className="px-8 md:px-12 pb-8"
              >
                <div className="px-5 py-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                  <LatestActivityStatus log={scoreLogs?.[0]} />
                </div>
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Connected Apps */}
              <motion.section
                {...FADE_UP(0.09)}
                className="pb-8 pr-12 pl-8 md:pl-12"
              >
                <ConnectedAppsStrip userData={userData} navigate={navigate} />
              </motion.section>

              {/* Opportunities */}
              <motion.section
                {...FADE_UP(0.1)}
                className="pt-4 pb-14 pr-12 pl-8 md:pl-12 tut-opportunities"
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
                    to="/app/connective"
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
                      Domain-matched bounties will appear here as they are
                      posted.
                    </p>
                  </div>
                ) : (
                  <div role="list">
                    {opps.map((o, i) => (
                      <OpportunityRow key={o.id || i} opp={o} idx={i} />
                    ))}
                  </div>
                )}
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Rivals */}
              <motion.section
                {...FADE_UP(0.16)}
                className="pb-14 pl-8 md:pl-12 tut-rivals"
              >
                <Swimlane
                  label="Rivals"
                  icon={Crosshair}
                  iconColor="#F87171"
                  cta="Network"
                  ctaLink="/app/connective"
                  isEmpty={rivals.length === 0}
                  emptyTitle="No rivals tracked yet."
                  emptySub="Go to Connective → Network to mark operators as rivals and track their momentum here in real-time."
                  emptyCtaLabel="Connective"
                  emptyCtaLink="/app/connective"
                >
                  {rivals.map((r, i) => (
                    <RivalCard key={r.id} rival={r} userScore={score} idx={i} />
                  ))}
                </Swimlane>
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Alliances */}
              <motion.section
                {...FADE_UP(0.18)}
                className="pb-14 pl-8 md:pl-12 tut-alliances"
              >
                <Swimlane
                  label="Alliances"
                  icon={Users}
                  iconColor="#8b5cf6"
                  cta="Network"
                  ctaLink="/app/connective"
                  isEmpty={allies.length === 0}
                  emptyTitle="No alliances forged."
                  emptySub="Connect with top operators in your domain to track their velocity and build your syndicate."
                  emptyCtaLabel="Find Allies"
                  emptyCtaLink="/app/connective"
                >
                  {allies.map((a, i) => (
                    <AllianceCard key={a.id} ally={a} idx={i} />
                  ))}
                  {(userData?.allies?.length || 0) > 20 && (
                    <div
                      onClick={() => navigate("/app/connective")}
                      className="shrink-0 flex items-center justify-center cursor-pointer group rounded-xl border border-dashed border-[#8b5cf6]/30 bg-[#8b5cf6]/5 hover:bg-[#8b5cf6]/10 transition-colors"
                      style={{
                        width: 180,
                        height: 270,
                        scrollSnapAlign: "start",
                      }}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full border border-[#8b5cf6]/50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <ArrowRight size={20} style={{ color: "#8b5cf6" }} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#8b5cf6]">
                          See All {userData?.allies?.length || 0}
                        </p>
                      </div>
                    </div>
                  )}
                </Swimlane>
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Learn */}
              <motion.section
                {...FADE_UP(0.2)}
                className="pb-14 pl-8 md:pl-12 tut-learn"
              >
                <Swimlane
                  label="Discotive Learn"
                  icon={GraduationCap}
                  iconColor="#8b5cf6"
                  cta="Learn Database"
                  ctaLink="/app/learn"
                  isEmpty={learnItems.length === 0}
                  emptyTitle="No learning resources in your domain yet."
                  emptySub="The Discotive team is adding verified courses, certificates, and videos to your domain. Check back soon or browse all."
                  emptyCtaLabel="Browse All"
                  emptyCtaLink="/app/learn"
                >
                  {learnItems.map((v, i) => (
                    <LearnCard key={v.id} video={v} idx={i} />
                  ))}
                </Swimlane>
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Vault */}
              <motion.section
                {...FADE_UP(0.22)}
                className="pb-14 pl-8 md:pl-12"
              >
                <Swimlane
                  label="Vault Arsenal"
                  icon={Database}
                  iconColor={G.base}
                  cta="Full Vault"
                  ctaLink="/app/vault"
                  isEmpty={vaultCount === 0}
                  emptyTitle="Vault Empty. Establish proof of work."
                  emptySub="Upload your credentials, certificates, and projects. Each verified asset earns Discotive Score."
                  emptyCtaLabel="Upload First Asset"
                  emptyCtaLink="/app/vault"
                >
                  {vaultAssets.map((a, i) => (
                    <VaultCard key={a.id || i} asset={a} idx={i} />
                  ))}
                </Swimlane>
              </motion.section>

              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.03)",
                  marginBottom: 40,
                }}
              />

              {/* Agenda Preview */}
              <motion.section
                {...FADE_UP(0.28)}
                className="pb-32 pr-12 pl-8 md:pl-12 tut-agenda"
              >
                <AgendaPreview
                  userData={userData}
                  isPro={isPro}
                  navigate={navigate}
                />
              </motion.section>
            </div>
          </main>

          {/* ── HUD (25%) ── */}
          <AnimatePresence>
            {isHudOpen && (
              <motion.aside
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 hidden lg:flex flex-col z-[100]"
                style={{
                  width: "25vw",
                  minWidth: 320,
                  background:
                    "linear-gradient(90deg,transparent 0%,rgba(3,3,3,0.78) 15%,rgba(3,3,3,0.88) 100%)",
                  backdropFilter: "blur(40px) saturate(150%)",
                  WebkitBackdropFilter: "blur(40px) saturate(150%)",
                }}
              >
                <button
                  onClick={() => setIsHudOpen(false)}
                  className="fixed top-32 right-6 z-[9999] flex items-center justify-center text-white/30 hover:text-white transition-all group bg-[#050505]/80 backdrop-blur-xl p-2 rounded-full border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.8)]"
                  title="Hide HUD"
                >
                  <div className="flex items-center -space-x-2">
                    <ChevronRight size={16} className="opacity-40" />
                    <ChevronRight size={16} className="opacity-70" />
                    <ChevronRight size={16} className="opacity-100" />
                  </div>
                </button>

                <div
                  className="absolute top-0 right-0 w-56 h-56 pointer-events-none z-0"
                  style={{
                    background: `radial-gradient(circle,${G.dimBg} 0%,transparent 70%)`,
                  }}
                />

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

                <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                  <HUDPanel
                    score={score}
                    lastScore={lastScore}
                    globalPct={globalPct}
                    domainPct={domainPct}
                    streak={streak}
                    level={level}
                    levelPct={levelPct}
                    isPro={isPro}
                    lbRank={lbRank}
                    lbFilter={lbFilter}
                    telemetryEvents={telemetryEvents}
                    userData={userData}
                    chartTf={chartTf}
                    setChartTf={setChartTf}
                    chartData={chartData}
                    chartMin={chartMin}
                    scoreLogs={scoreLogs}
                    navigate={navigate}
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
