/**
 * @fileoverview Battlefield.jsx — Kinetic Battlefield v1.0
 * @description
 * Full-screen, draggable multi-column competitive intelligence system.
 * PC: 3-column layout with draggable dividers, scroll-snap war room.
 * Mobile: Horizontal scroll-snap carousel with sticky roster.
 *
 * Architecture:
 * - Column 1: Target Roster (fixed sidebar)
 * - Column 2+: War Room (dynamically injected comparators)
 * - Draggable vertical dividers between every column
 * - Mobile: scroll-snap-type: x mandatory carousel
 */

import React, {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Tooltip as ReTooltip,
  CartesianGrid,
} from "recharts";
import {
  X,
  Minimize2,
  Crosshair,
  Zap,
  Database,
  Flame,
  Crown,
  Users,
  Globe,
  MapPin,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Activity,
  GraduationCap,
  Award,
  Target,
  Plus,
  Check,
  Star,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Color palette tokens ─────────────────────────────────────────────────────
const GOLD = "#BFA264";
const GOLD_BRIGHT = "#D4AF78";
const VOID = "#030303";

// ─── Draggable Divider ─────────────────────────────────────────────────────────
export const DraggableDivider = memo(
  ({ onDrag, minLeft = 180, minRight = 220, containerRef }) => {
    const isDragging = useRef(false);
    const startX = useRef(0);
    const [active, setActive] = useState(false);

    const handlePointerDown = useCallback(
      (e) => {
        e.preventDefault();
        isDragging.current = true;
        startX.current = e.clientX;
        setActive(true);

        const handleMove = (ev) => {
          if (!isDragging.current) return;
          const dx = ev.clientX - startX.current;
          startX.current = ev.clientX;
          onDrag(dx);
        };

        const handleUp = () => {
          isDragging.current = false;
          setActive(false);
          window.removeEventListener("pointermove", handleMove);
          window.removeEventListener("pointerup", handleUp);
        };

        window.addEventListener("pointermove", handleMove, { passive: false });
        window.addEventListener("pointerup", handleUp);
      },
      [onDrag],
    );

    return (
      <div
        onPointerDown={handlePointerDown}
        className={cn(
          "relative flex-shrink-0 w-[6px] cursor-col-resize select-none group transition-colors",
          active ? "bg-transparent" : "bg-transparent",
        )}
        style={{ zIndex: 10 }}
      >
        {/* Visual track */}
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-all duration-150",
            active
              ? "w-[2px] bg-[#BFA264] shadow-[0_0_8px_rgba(191,162,100,0.6)]"
              : "bg-[rgba(255,255,255,0.07)] group-hover:bg-[rgba(191,162,100,0.4)] group-hover:w-[2px]",
          )}
        />
        {/* Drag handle pill */}
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 transition-all duration-150",
            active
              ? "opacity-100 scale-110"
              : "opacity-0 group-hover:opacity-100",
          )}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#BFA264]" />
          ))}
        </div>
      </div>
    );
  },
);

// ─── Rank pill switcher ───────────────────────────────────────────────────────
const RankSwitcher = memo(({ rank }) => {
  const [view, setView] = useState(0);
  const modes = ["Global", "Domain", "Streak"];
  const values = [
    rank?.global ?? "—",
    rank?.domain ?? "—",
    rank?.streak ?? "—",
  ];
  const colors = ["text-[#BFA264]", "text-emerald-400", "text-orange-400"];

  return (
    <div className="flex items-center gap-1.5 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-xl p-1">
      <button
        onClick={() => setView((v) => (v - 1 + modes.length) % modes.length)}
        className="w-5 h-5 flex items-center justify-center text-[rgba(245,240,232,0.30)] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
      </button>
      <div className="flex flex-col items-center min-w-[60px]">
        <span
          className={cn(
            "text-base font-black font-mono leading-none",
            colors[view],
          )}
        >
          {values[view] === "—" ? "—" : `#${values[view]}`}
        </span>
        <span className="text-[8px] text-[rgba(245,240,232,0.25)] uppercase tracking-widest mt-0.5">
          {modes[view]}
        </span>
      </div>
      <button
        onClick={() => setView((v) => (v + 1) % modes.length)}
        className="w-5 h-5 flex items-center justify-center text-[rgba(245,240,232,0.30)] hover:text-white transition-colors"
      >
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
});

// ─── Micro Radar ─────────────────────────────────────────────────────────────
const MicroRadar = memo(({ data, color = GOLD, size = 120 }) => (
  <div style={{ width: size, height: size }}>
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{
            fill: "rgba(245,240,232,0.25)",
            fontSize: 7,
            fontWeight: 700,
          }}
        />
        <Radar
          dataKey="score"
          stroke={color}
          strokeWidth={1.5}
          fill={color}
          fillOpacity={0.15}
          dot={false}
          animationDuration={600}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
));

// ─── Micro Sparkline ──────────────────────────────────────────────────────────
const MicroSparkline = memo(({ data, color = GOLD, height = 48 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data.map((d) => d.score)) - 10;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 2, left: -40, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`sg-${color.replace("#", "")}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[min, "auto"]} hide />
          <Area
            type="monotone"
            dataKey="score"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#sg-${color.replace("#", "")})`}
            dot={false}
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── Stat Row ─────────────────────────────────────────────────────────────────
const StatBar = memo(({ label, val, max, color }) => {
  const pct = max > 0 ? Math.min((val / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[rgba(245,240,232,0.30)] font-bold uppercase tracking-widest w-14 shrink-0">
        {label}
      </span>
      <div className="flex-1 h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}50` }}
        />
      </div>
      <span
        className="text-[9px] font-black font-mono w-8 text-right"
        style={{ color }}
      >
        {val}
      </span>
    </div>
  );
});

// ─── Combatant Card (single column in war room) ───────────────────────────────
const CombatantCard = memo(
  ({
    operator,
    isUser = false,
    allOperators = [],
    isCompact = false,
    onRemove,
  }) => {
    const score = operator?.discotiveScore?.current || 0;
    const last24h = operator?.discotiveScore?.last24h || score;
    const delta = score - last24h;
    const streak = operator?.discotiveScore?.streak || 0;
    const vault = operator?.vault || [];
    const verifiedVault = vault.filter((a) => a.status === "VERIFIED");
    const allies =
      operator?.alliesCount || (operator?.allies || []).length || 0;
    const skills = operator?.skills?.alignedSkills || [];
    const level = Math.min(Math.floor(score / 1000) + 1, 10);
    const views = operator?.profileViews || 0;

    const name =
      `${operator?.identity?.firstName || ""} ${operator?.identity?.lastName || ""}`.trim() ||
      operator?.targetName ||
      "Operator";
    const username =
      operator?.identity?.username || operator?.targetUsername || "—";
    const domain =
      operator?.identity?.domain || operator?.targetDomain || "General";
    const initials = name.charAt(0).toUpperCase() || "O";
    const isPro = operator?.tier === "PRO" || operator?.tier === "ENTERPRISE";

    // Radar data
    const maxScore = Math.max(
      ...allOperators.map((o) => o?.discotiveScore?.current || 0),
      1000,
    );
    const radarData = [
      { metric: "Score", score: Math.min((score / maxScore) * 100, 100) },
      {
        metric: "Vault",
        score: Math.min((verifiedVault.length / 10) * 100, 100),
      },
      { metric: "Network", score: Math.min((allies / 20) * 100, 100) },
      { metric: "Skills", score: Math.min((skills.length / 10) * 100, 100) },
      { metric: "Streak", score: Math.min((streak / 30) * 100, 100) },
    ];

    // Sparkline placeholder — in production wire to daily_scores
    const sparkData = useMemo(() => {
      const base = score > 0 ? score - 200 : 0;
      return Array.from({ length: 14 }, (_, i) => ({
        score: Math.max(
          0,
          base +
            Math.round(((score - base) / 13) * i + (Math.random() - 0.5) * 20),
        ),
      }));
    }, [score]);

    const color = isUser ? GOLD : "#ef4444";
    const borderClass = isUser
      ? "border-[rgba(191,162,100,0.25)]"
      : "border-[rgba(239,68,68,0.20)]";

    return (
      <div
        className={cn(
          "flex flex-col h-full relative",
          isCompact ? "px-3 py-3" : "px-5 py-5",
        )}
      >
        {/* Remove button (non-user) */}
        {!isUser && onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] flex items-center justify-center text-red-400 hover:bg-[rgba(239,68,68,0.20)] transition-all z-10"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl border flex items-center justify-center text-base font-black overflow-hidden",
                isUser
                  ? "border-[#BFA264]/40 bg-[#111] text-[#BFA264]"
                  : "border-red-500/30 bg-[#111] text-red-400",
              )}
            >
              {operator?.identity?.avatarUrl || operator?.targetAvatar ? (
                <img
                  src={operator?.identity?.avatarUrl || operator?.targetAvatar}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {isPro && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
                <Crown className="w-2.5 h-2.5 text-black" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                  isUser
                    ? "text-[#BFA264] bg-[rgba(191,162,100,0.10)] border-[rgba(191,162,100,0.20)]"
                    : "text-red-400 bg-red-500/10 border-red-500/20",
                )}
              >
                {isUser ? "You" : "Target"}
              </span>
            </div>
            <p className="text-sm font-black text-[#F5F0E8] mt-0.5 truncate">
              {name}
            </p>
            <p className="text-[10px] font-mono text-[rgba(245,240,232,0.30)]">
              @{username}
            </p>
            <p className="text-[9px] text-[rgba(245,240,232,0.30)] mt-0.5 truncate">
              {domain}
            </p>
          </div>
        </div>

        {/* Score + delta */}
        <div className="mb-3">
          <div className="flex items-end gap-2 mb-1">
            <span
              className={cn(
                "text-3xl font-black font-mono leading-none",
                isUser ? "text-[#BFA264]" : "text-white",
              )}
            >
              {score.toLocaleString()}
            </span>
            {delta !== 0 && (
              <div
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-black font-mono mb-0.5",
                  delta > 0 ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {delta > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {delta > 0 ? `+${delta}` : delta}
              </div>
            )}
          </div>
          <MicroSparkline data={sparkData} color={color} height={40} />
        </div>

        {/* Rank Switcher */}
        <div className="mb-4">
          <RankSwitcher
            rank={{
              global: operator?.precomputed?.globalRank || null,
              domain: null,
              streak: streak > 0 ? streak : null,
            }}
          />
        </div>

        {/* Stat bars */}
        <div className="space-y-1.5 mb-4">
          <StatBar
            label="Vault"
            val={verifiedVault.length}
            max={20}
            color="#10b981"
          />
          <StatBar label="Allies" val={allies} max={50} color="#8b5cf6" />
          <StatBar label="Streak" val={streak} max={30} color="#f97316" />
          <StatBar label="Level" val={level} max={10} color={color} />
        </div>

        {/* Radar */}
        {!isCompact && (
          <div className="flex justify-center mb-3">
            <MicroRadar data={radarData} color={color} size={130} />
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && !isCompact && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.slice(0, 5).map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-[8px] font-bold text-[rgba(245,240,232,0.40)]"
              >
                {s}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="text-[8px] text-[rgba(245,240,232,0.20)] self-center">
                +{skills.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Footer: Profile views */}
        <div className="mt-auto pt-2 border-t border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between text-[9px] text-[rgba(245,240,232,0.25)]">
            <span className="flex items-center gap-1">
              <Activity className="w-2.5 h-2.5" /> {views} views
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-orange-400" /> {streak}d streak
            </span>
          </div>
        </div>
      </div>
    );
  },
);

// ─── Roster Item ──────────────────────────────────────────────────────────────
const RosterItem = memo(({ target, isActive, isUser, onClick }) => {
  const name =
    `${target?.identity?.firstName || ""}`.trim() ||
    target?.targetName?.split(" ")[0] ||
    "Operator";
  const score = target?.discotiveScore?.current || target?.targetScore || 0;
  const initials = name.charAt(0).toUpperCase();
  const isOnTarget = isActive && !isUser;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left group border",
        isUser
          ? "bg-[rgba(191,162,100,0.06)] border-[rgba(191,162,100,0.20)]"
          : isOnTarget
            ? "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.25)]"
            : "bg-transparent border-transparent hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.07)]",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black overflow-hidden shrink-0 border",
          isUser
            ? "border-[#BFA264]/30 text-[#BFA264]"
            : "border-red-500/20 text-red-400",
          "bg-[#111]",
        )}
      >
        {target?.identity?.avatarUrl || target?.targetAvatar ? (
          <img
            src={target?.identity?.avatarUrl || target?.targetAvatar}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-[#F5F0E8] truncate">{name}</p>
        <p
          className={cn(
            "text-[9px] font-mono",
            isUser ? "text-[#BFA264]" : "text-[rgba(245,240,232,0.30)]",
          )}
        >
          {score.toLocaleString()}
        </p>
      </div>
      {isOnTarget && (
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
      )}
      {isUser && (
        <div className="w-1.5 h-1.5 rounded-full bg-[#BFA264] shrink-0" />
      )}
    </button>
  );
});

// ─── MOBILE CAROUSEL VIEW ─────────────────────────────────────────────────────
const MobileCarousel = memo(
  ({
    userData,
    activeTargets,
    onAddTarget,
    allTargets,
    onRemoveFromWarRoom,
  }) => {
    const scrollRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const cards = useMemo(() => {
      return [{ ...userData, _isUser: true }, ...activeTargets];
    }, [userData, activeTargets]);

    const handleScroll = useCallback(() => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(index);
    }, []);

    return (
      <div className="flex flex-col h-full">
        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 flex overflow-x-auto"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {cards.map((op, i) => (
            <div
              key={op?.id || op?.targetId || i}
              className="flex-shrink-0 w-full overflow-y-auto custom-scrollbar"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="h-full bg-[#0A0A0A] border-r border-[rgba(255,255,255,0.05)]">
                <CombatantCard
                  operator={op}
                  isUser={!!op._isUser}
                  allOperators={cards}
                  isCompact={false}
                  onRemove={
                    !op._isUser
                      ? () => onRemoveFromWarRoom(op?.targetId || op?.id)
                      : undefined
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Sticky dot nav + roster */}
        <div className="shrink-0 bg-[#050505] border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                      left: i * scrollRef.current.clientWidth,
                      behavior: "smooth",
                    });
                  }
                }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  activeIndex === i
                    ? "w-5 h-1.5 bg-[#BFA264]"
                    : "w-1.5 h-1.5 bg-[rgba(255,255,255,0.15)]",
                )}
              />
            ))}
          </div>

          {/* Horizontal compact roster */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {allTargets.slice(0, 8).map((t) => {
              const inWarRoom = activeTargets.some(
                (a) => (a?.targetId || a?.id) === (t?.targetId || t?.id),
              );
              return (
                <button
                  key={t?.targetId || t?.id}
                  onClick={() => !inWarRoom && onAddTarget(t)}
                  disabled={inWarRoom}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl border transition-all shrink-0",
                    inWarRoom
                      ? "border-red-500/25 bg-red-500/8"
                      : "border-[rgba(255,255,255,0.06)] bg-[#0A0A0A] hover:border-[rgba(191,162,100,0.25)]",
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#111] border border-red-500/20 flex items-center justify-center text-[10px] font-black text-red-400 overflow-hidden">
                    {t?.targetAvatar ? (
                      <img
                        src={t.targetAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (t?.targetName?.charAt(0) || "T").toUpperCase()
                    )}
                  </div>
                  {inWarRoom && <Check className="w-3 h-3 text-red-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Battlefield = ({ userData, competitors, onCollapse }) => {
  // War room state: which targets are in the split view (max 4 for usability)
  const [warRoomTargets, setWarRoomTargets] = useState(() =>
    competitors.slice(0, 1).map((c) => ({ ...c, _isTarget: true })),
  );

  // Column widths (percentages, must sum constraints respected)
  const [rosterWidth, setRosterWidth] = useState(220); // px fixed
  const [colWidths, setColWidths] = useState(() => {
    // Each war room column gets equal share
    return []; // managed dynamically
  });

  const containerRef = useRef(null);
  const isMobile = useRef(false);
  const [_mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 1024;
      isMobile.current = m;
      setMobile(m);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sync targets from props
  useEffect(() => {
    setWarRoomTargets(
      competitors.slice(0, 1).map((c) => ({ ...c, _isTarget: true })),
    );
  }, [competitors]);

  const allComparators = useMemo(
    () => [{ ...userData, _isUser: true }, ...warRoomTargets],
    [userData, warRoomTargets],
  );

  // Roster divider drag
  const handleRosterDrag = useCallback((dx) => {
    setRosterWidth((w) => Math.max(160, Math.min(320, w + dx)));
  }, []);

  // War room column divider drag: column index between col[i] and col[i+1]
  const handleColDividerDrag = useCallback((colIndex, dx) => {
    // We don't manage individual col widths — instead the flex-grow handles it.
    // For a true resizable implementation we track flex-basis per column.
    setColWidths((prev) => {
      const next = [...prev];
      const minW = 200;
      if (!next[colIndex]) next[colIndex] = 300;
      if (!next[colIndex + 1]) next[colIndex + 1] = 300;
      const proposed0 = next[colIndex] + dx;
      const proposed1 = next[colIndex + 1] - dx;
      if (proposed0 >= minW && proposed1 >= minW) {
        next[colIndex] = proposed0;
        next[colIndex + 1] = proposed1;
      }
      return next;
    });
  }, []);

  const addToWarRoom = useCallback((target) => {
    setWarRoomTargets((prev) => {
      if (prev.length >= 4) return prev;
      const alreadyIn = prev.some(
        (t) => (t?.targetId || t?.id) === (target?.targetId || target?.id),
      );
      if (alreadyIn) return prev;
      return [...prev, { ...target, _isTarget: true }];
    });
  }, []);

  const removeFromWarRoom = useCallback((id) => {
    setWarRoomTargets((prev) =>
      prev.filter((t) => (t?.targetId || t?.id) !== id),
    );
  }, []);

  const isCompact = allComparators.length > 3;

  return (
    <motion.div
      key="battlefield"
      layout
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", damping: 26, stiffness: 240 }}
      ref={containerRef}
      className="flex flex-col w-full bg-[#050505] border border-[rgba(255,255,255,0.07)] rounded-[1.5rem] overflow-hidden"
      style={{ height: "80vh" }}
    >
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[#030303]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#F5F0E8] uppercase tracking-wider">
              Battlefield
            </h2>
            <p className="text-[9px] text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
              {allComparators.length} combatants · live telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add target prompt */}
          {warRoomTargets.length < 4 &&
            competitors.length > warRoomTargets.length && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)] rounded-xl">
                <Plus className="w-3 h-3 text-red-400" />
                <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                  Click roster to inject
                </span>
              </div>
            )}
          <button
            onClick={onCollapse}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.40)] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-all"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* ── MOBILE: carousel ── */}
        {_mobile ? (
          <MobileCarousel
            userData={userData}
            activeTargets={warRoomTargets}
            allTargets={competitors}
            onAddTarget={addToWarRoom}
            onRemoveFromWarRoom={removeFromWarRoom}
          />
        ) : (
          <>
            {/* ── PC: Column 1 — Roster ── */}
            <div
              className="shrink-0 flex flex-col bg-[#0A0A0A] border-r border-[rgba(255,255,255,0.05)] overflow-y-auto custom-scrollbar"
              style={{ width: rosterWidth }}
            >
              <div className="px-3 pt-3 pb-2 shrink-0">
                <p className="text-[8px] font-black text-[rgba(245,240,232,0.25)] uppercase tracking-widest">
                  Roster · {competitors.length + 1}
                </p>
              </div>

              {/* User always first */}
              <div className="px-2 mb-1">
                <RosterItem
                  target={userData}
                  isActive={true}
                  isUser={true}
                  onClick={() => {}}
                />
              </div>

              {competitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-3 text-center">
                  <Crosshair className="w-6 h-6 text-[rgba(245,240,232,0.10)] mb-2" />
                  <p className="text-[9px] text-[rgba(245,240,232,0.25)]">
                    No targets tracked
                  </p>
                </div>
              ) : (
                <div className="px-2 space-y-1 pb-3">
                  {competitors.map((target) => {
                    const inWarRoom = warRoomTargets.some(
                      (t) =>
                        (t?.targetId || t?.id) ===
                        (target?.targetId || target?.id),
                    );
                    return (
                      <div
                        key={target?.targetId || target?.id}
                        className="relative"
                      >
                        <RosterItem
                          target={target}
                          isActive={inWarRoom}
                          isUser={false}
                          onClick={() => {
                            if (inWarRoom) {
                              removeFromWarRoom(target?.targetId || target?.id);
                            } else {
                              addToWarRoom(target);
                            }
                          }}
                        />
                        {!inWarRoom && warRoomTargets.length < 4 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none">
                            <Plus className="w-3 h-3 text-[rgba(245,240,232,0.25)]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Roster / War Room divider */}
            <DraggableDivider
              onDrag={handleRosterDrag}
              minLeft={160}
              minRight={200}
            />

            {/* ── PC: War Room columns ── */}
            <div className="flex-1 flex min-w-0 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {allComparators.map((op, colIdx) => {
                  const id = op?._isUser
                    ? "user"
                    : op?.targetId || op?.id || colIdx;
                  const flexBasis = colWidths[colIdx]
                    ? `${colWidths[colIdx]}px`
                    : undefined;
                  const isLast = colIdx === allComparators.length - 1;

                  return (
                    <React.Fragment key={id}>
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, width: 0 }}
                        transition={{
                          type: "spring",
                          damping: 22,
                          stiffness: 220,
                        }}
                        className="flex flex-col min-w-0 overflow-y-auto custom-scrollbar border-r border-[rgba(255,255,255,0.05)] last:border-r-0"
                        style={{
                          flex: flexBasis ? `0 0 ${flexBasis}` : "1 1 0",
                          minWidth: 200,
                        }}
                      >
                        <CombatantCard
                          operator={op}
                          isUser={!!op._isUser}
                          allOperators={allComparators}
                          isCompact={isCompact}
                          onRemove={
                            !op._isUser
                              ? () => removeFromWarRoom(op?.targetId || op?.id)
                              : undefined
                          }
                        />
                      </motion.div>

                      {/* Column divider (not after last) */}
                      {!isLast && (
                        <DraggableDivider
                          onDrag={(dx) => handleColDividerDrag(colIdx, dx)}
                          minLeft={200}
                          minRight={200}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>

              {/* Empty state when no targets in war room */}
              {warRoomTargets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-2xl bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.15)] flex items-center justify-center">
                    <Target className="w-8 h-8 text-red-400/40" />
                  </div>
                  <div>
                    <p className="text-base font-black text-[#F5F0E8] mb-1">
                      No Targets Injected
                    </p>
                    <p className="text-sm text-[rgba(245,240,232,0.35)] max-w-[240px] leading-relaxed">
                      Click a target from the roster to inject them into the war
                      room for live comparison.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Battlefield;
