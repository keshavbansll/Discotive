import { useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  where,
} from "firebase/firestore";
import { db } from "../firebase"; // Adjust path if your firebase.js is located elsewhere
import { Link, useNavigate } from "react-router-dom";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

// ─── CSS INJECTION ───────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..800;1,300..800&family=Poppins:ital,wght@0,300..700;1,300..700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --void: #030303;
    --depth: #0a0a0a;
    --surface: #0f0f0f;
    --elevated: #141414;
    --border: rgba(255,255,255,0.06);
    --border-gold: rgba(191,162,100,0.25);
    --gold-1: #BFA264;
    --gold-2: #D4AF78;
    --gold-3: #8B7240;
    --gold-4: #E8D5A3;
    --gold-dim: rgba(191,162,100,0.08);
    --text-primary: #F5F0E8;
    --text-secondary: rgba(245,240,232,0.55);
    --text-dim: rgba(245,240,232,0.25);
    --font-display: 'Montserrat', sans-serif;
    --font-body: 'Poppins', sans-serif;
  }

  h1, h2, h3, .font-display {
    letter-spacing: -0.05em !important; /* Forces the tight, packed look */
  }

  html { scroll-behavior: smooth; overflow-x: hidden; }

  body {
    background: var(--void);
    color: var(--text-primary);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
    cursor: none;
  }

  ::selection { background: rgba(191,162,100,0.2); color: var(--text-primary); }

  ::-webkit-scrollbar { width: 2px; }
  ::-webkit-scrollbar-track { background: var(--void); }
  ::-webkit-scrollbar-thumb { background: var(--gold-3); border-radius: 2px; }

  .font-display { font-family: var(--font-display); }
  .font-body { font-family: var(--font-body); }

  .gold-text {
    background: linear-gradient(135deg, #BFA264 0%, #D4AF78 35%, #E8D5A3 55%, #BFA264 75%, #8B7240 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .gold-gradient {
    background: linear-gradient(135deg, #8B7240 0%, #BFA264 40%, #D4AF78 60%, #BFA264 80%, #6B5530 100%);
  }

  .glass {
    background: rgba(255,255,255,0.02);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 0.5px solid var(--border);
  }

  .glass-gold {
    background: rgba(191,162,100,0.04);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 0.5px solid var(--border-gold);
  }

  @keyframes grain {
    0%, 100% { transform: translate(0,0); }
    10% { transform: translate(-2%,-3%); }
    20% { transform: translate(3%,2%); }
    30% { transform: translate(-1%,4%); }
    40% { transform: translate(4%,-1%); }
    50% { transform: translate(-3%,3%); }
    60% { transform: translate(1%,-4%); }
    70% { transform: translate(-4%,1%); }
    80% { transform: translate(2%,3%); }
    90% { transform: translate(3%,-2%); }
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33% { transform: translateY(-8px) rotate(0.5deg); }
    66% { transform: translateY(4px) rotate(-0.3deg); }
  }

  @keyframes pulse-gold {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }

  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes counter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

.grain-overlay {
    position: fixed;
    inset: -50%;
    width: 200%;
    height: 200%;
    pointer-events: none;
    opacity: 0.008;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    animation: grain 0.4s steps(1) infinite;
    z-index: 9999;
  }

  .scanline-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 9998;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.015) 2px,
      rgba(0,0,0,0.015) 4px
    );
  }

  .nav-blur {
    background: rgba(3,3,3,0.85);
    backdrop-filter: blur(32px) saturate(180%);
    -webkit-backdrop-filter: blur(32px) saturate(180%);
    border-bottom: 0.5px solid var(--border);
  }

  .btn-primary {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 36px;
    background: linear-gradient(135deg, #8B7240 0%, #BFA264 40%, #D4AF78 60%, #BFA264 80%, #6B5530 100%);
    color: #0a0a0a;
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: none;
    border-radius: 9999px; /* Pill shape */
    cursor: none;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
  }

  .btn-primary:hover::after {
    animation: shimmer 0.6s ease;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 48px rgba(191,162,100,0.3), 0 4px 16px rgba(191,162,100,0.2);
  }

  .btn-outline {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 36px;
    background: transparent;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: 0.5px solid rgba(245,240,232,0.2);
    border-radius: 9999px; /* Pill shape */
    cursor: none;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .btn-outline:hover {
    border-color: var(--gold-1);
    color: var(--gold-2);
    background: var(--gold-dim);
  }

  .stat-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%);
    border: 0.5px solid rgba(255,255,255,0.06);
    transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .stat-card:hover {
    border-color: var(--border-gold);
    background: rgba(191,162,100,0.04);
    transform: translateY(-4px);
  }

  .feature-card {
    background: linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%);
    border: 0.5px solid rgba(255,255,255,0.06);
    transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
    position: relative;
    overflow: hidden;
  }

  .feature-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(191,162,100,0.06) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.5s;
  }

  .feature-card:hover::before { opacity: 1; }

  .feature-card:hover {
    border-color: rgba(191,162,100,0.4);
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(191,162,100,0.3);
  }

  .node-card {
    background: rgba(10,10,10,0.9);
    border: 0.5px solid rgba(255,255,255,0.08);
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .node-card.active {
    border-color: rgba(191,162,100,0.5);
    background: rgba(191,162,100,0.04);
    box-shadow: 0 0 40px rgba(191,162,100,0.1), inset 0 0 20px rgba(191,162,100,0.03);
  }

  .ticker-track {
    display: flex;
    gap: 80px;
    animation: ticker 30s linear infinite;
    white-space: nowrap;
  }

  .ticker-track-slow {
    animation-duration: 50s;
    animation-direction: reverse;
  }

  .divider-gold {
    height: 0.5px;
    background: linear-gradient(90deg, transparent 0%, var(--gold-3) 20%, var(--gold-1) 50%, var(--gold-3) 80%, transparent 100%);
  }

  .vline {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0.5px;
    background: linear-gradient(180deg, transparent 0%, var(--border-gold) 30%, var(--border-gold) 70%, transparent 100%);
  }

  .hline {
    height: 0.5px;
    background: linear-gradient(90deg, transparent 0%, var(--border-gold) 30%, var(--border-gold) 70%, transparent 100%);
  }

  .score-ring {
    transform: rotate(-90deg);
  }

  .score-ring-track {
    fill: none;
    stroke: rgba(255,255,255,0.06);
    stroke-width: 3;
  }

  .score-ring-fill {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke: url(#goldGrad);
    transition: stroke-dashoffset 2s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .custom-cursor {
    position: fixed;
    pointer-events: none;
    z-index: 99999;
    mix-blend-mode: difference;
  }

  .cursor-dot {
    width: 6px;
    height: 6px;
    background: var(--gold-2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .cursor-ring {
    width: 36px;
    height: 36px;
    border: 1px solid rgba(191,162,100,0.5);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), background-color 0.3s ease;
  }
  
  .cursor-ring.active {
    transform: translate(-50%, -50%) scale(1.8) !important;
    background-color: rgba(191,162,100,0.1);
    border-color: rgba(191,162,100,0.8);
  }

  .marquee-container {
    overflow: hidden;
    display: flex;
    gap: 80px;
  }

  .timeline-connector {
    position: absolute;
    left: 50%;
    width: 0.5px;
    background: linear-gradient(180deg, var(--border-gold) 0%, transparent 100%);
  }

  @keyframes borderGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(191,162,100,0.1); }
    50% { box-shadow: 0 0 40px rgba(191,162,100,0.25), 0 0 80px rgba(191,162,100,0.08); }
  }

  .glow-card { animation: borderGlow 4s ease-in-out infinite; }

  @keyframes verticalScroll {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }

  .vertical-scroll { animation: verticalScroll 15s linear infinite; }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    background: rgba(191,162,100,0.08);
    border: 0.5px solid rgba(191,162,100,0.2);
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold-2);
    font-family: var(--font-body);
  }

  .underline-gold {
    position: relative;
    display: inline-block;
  }

  .underline-gold::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 0.5px;
    background: linear-gradient(90deg, transparent, var(--gold-1), transparent);
  }

  .hero-number {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes lineExpand {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  .luxury-input {
    background: rgba(255,255,255,0.02);
    border: 0.5px solid rgba(255,255,255,0.08);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 14px 18px;
    outline: none;
    transition: border-color 0.3s;
    width: 100%;
  }

  .luxury-input:focus {
    border-color: var(--gold-1);
    box-shadow: 0 0 0 1px rgba(191,162,100,0.1), 0 0 32px rgba(191,162,100,0.06);
  }

  .luxury-input::placeholder { color: var(--text-dim); }

  @keyframes spin { to { transform: rotate(360deg); } }

/* ── MOBILE-FIRST RESPONSIVE ── */
  @media (max-width: 768px) {
    body { cursor: auto; }
    .cursor-dot, .cursor-ring { display: none !important; }
    h1, h2 { letter-spacing: -0.04em !important; }
    .btn-primary, .btn-outline { cursor: pointer; }
    .grain-overlay { opacity: 0.015; }
    /* Grid overrides */
    .responsive-grid-2 { grid-template-columns: 1fr !important; gap: 40px !important; }
    .responsive-grid-3 { grid-template-columns: 1fr !important; gap: 24px !important; }
    .responsive-footer { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; }
    .responsive-footer > div { align-items: center; justify-content: center; display: flex; flex-direction: column; }
  }

  .horizontal-scroll-container {
    display: flex;
    overflow-x: auto;
    gap: 16px;
    padding-bottom: 12px;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .horizontal-scroll-container::-webkit-scrollbar { display: none; }
  .horizontal-scroll-item {
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  .mobile-hero-text {
    font-size: clamp(40px, 11vw, 108px) !important;
  }

  /* Intersection Observer fade-up utility */
  .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1); }
  .reveal.visible { opacity: 1; transform: translateY(0); }
`;

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────
function Cursor() {
  const dotRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const mouse = { x: useMotionValue(0), y: useMotionValue(0) };
  const springConfig = { damping: 22, stiffness: 280, mass: 0.4 };
  const ringX = useSpring(mouse.x, springConfig);
  const ringY = useSpring(mouse.y, springConfig);

  useEffect(() => {
    // Prevent JS event binding on mobile to save main thread cycles
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    const onMove = (e) => {
      mouse.x.set(e.clientX);
      mouse.y.set(e.clientY);
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top = e.clientY + "px";
      }
    };

    const onHover = (e) => {
      if (
        e.target.closest(
          "button, a, input, .node-card, .feature-card, .stat-card",
        )
      )
        setIsHovering(true);
    };
    const onLeave = (e) => {
      if (
        e.target.closest(
          "button, a, input, .node-card, .feature-card, .stat-card",
        )
      )
        setIsHovering(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onHover);
    window.addEventListener("mouseout", onLeave);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onHover);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="custom-cursor cursor-dot" />
      <motion.div
        className={`custom-cursor cursor-ring ${isHovering ? "active" : ""}`}
        style={{ left: ringX, top: ringY }}
      />
    </>
  );
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 2, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── NOISE BACKGROUND ─────────────────────────────────────────────────────────
function NoiseBackground() {
  return (
    <>
      <div className="grain-overlay" />
      <div className="scanline-overlay" />
    </>
  );
}

// ─── LIVE SCORE ──────────────────────────────────────────────────────────────
function LiveScoreWidget() {
  const [score, setScore] = useState(4872);
  const [delta, setDelta] = useState(null);
  const [events, setEvents] = useState([
    { label: "Task Executed", pts: "+15", time: "2s ago" },
    { label: "Streak Milestone", pts: "+30", time: "1m ago" },
    { label: "Alliance Forged", pts: "+15", time: "3m ago" },
    { label: "Vault Verified", pts: "+20", time: "5m ago" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const gains = [5, 10, 15, 20, 30];
      const labels = [
        "Task Executed",
        "Node Completed",
        "Asset Verified",
        "Daily Login",
        "Alliance Forged",
      ];
      const gain = gains[Math.floor(Math.random() * gains.length)];
      const label = labels[Math.floor(Math.random() * labels.length)];
      setScore((s) => s + gain);
      setDelta(`+${gain}`);
      setEvents((prev) => [
        { label, pts: `+${gain}`, time: "just now" },
        ...prev.slice(0, 3),
      ]);
      setTimeout(() => setDelta(null), 1500);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const circumference = 2 * Math.PI * 44;
  const progress = Math.min((score % 5000) / 5000, 1);
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.6 }}
      className="glow-card"
      style={{
        background: "rgba(10,10,10,0.95)",
        border: "0.5px solid rgba(191,162,100,0.2)",
        borderRadius: 24,
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 340,
      }}
    >
      {/* Top line accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, var(--gold-1), transparent)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--gold-2)",
            fontFamily: "var(--font-body)",
          }}
        >
          ● Live Telemetry
        </span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
          }}
        >
          Discotive Score
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 20,
        }}
      >
        {/* Ring */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="100" height="100" className="score-ring">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B7240" />
                <stop offset="40%" stopColor="#BFA264" />
                <stop offset="60%" stopColor="#D4AF78" />
                <stop offset="100%" stopColor="#8B7240" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" className="score-ring-track" />
            <circle
              cx="50"
              cy="50"
              r="44"
              className="score-ring-fill"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnimatePresence mode="wait">
              {delta ? (
                <motion.span
                  key="delta"
                  initial={{ opacity: 0, scale: 0.6, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: -5 }}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--gold-2)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {delta}
                </motion.span>
              ) : (
                <motion.span
                  key="score"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {score.toLocaleString()}
                </motion.span>
              )}
            </AnimatePresence>
            <span
              style={{
                fontSize: 8,
                letterSpacing: "0.15em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
              }}
            >
              pts
            </span>
          </div>
        </div>

        {/* Events */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <AnimatePresence>
            {events.map((ev, i) => (
              <motion.div
                key={ev.label + i}
                initial={i === 0 ? { opacity: 0, x: 10 } : {}}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  borderBottom: "0.5px solid rgba(255,255,255,0.04)",
                  opacity: 1 - i * 0.2,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {ev.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: "var(--gold-2)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                  }}
                >
                  {ev.pts}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ display: "flex", gap: 8 }}>
        {["Rank #14", "Top 1%", "Streak 47d"].map((tag) => (
          <div
            key={tag}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 4px",
              background: "rgba(191,162,100,0.06)",
              border: "0.5px solid rgba(191,162,100,0.15)",
              fontSize: 8,
              letterSpacing: "0.15em",
              color: "var(--gold-1)",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── EXECUTION NODE ───────────────────────────────────────────────────────────
function ExecutionNode({
  title,
  date,
  status,
  tasks = [],
  delay = 0,
  isActive = false,
}) {
  const statusConfig = {
    VERIFIED: {
      label: "VERIFIED",
      color: "#4ADE80",
      bg: "rgba(74,222,128,0.06)",
    },
    ACTIVE: {
      label: "IN PROGRESS",
      color: "var(--gold-2)",
      bg: "rgba(191,162,100,0.06)",
    },
    LOCKED: {
      label: "LOCKED",
      color: "rgba(255,255,255,0.25)",
      bg: "rgba(255,255,255,0.02)",
    },
  };
  const cfg = statusConfig[status] || statusConfig.LOCKED;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      className={`node-card ${isActive ? "active" : ""}`}
      style={{
        borderRadius: 2,
        padding: "16px",
        width: 260,
        flexShrink: 0,
        position: "relative",
      }}
    >
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, var(--gold-1), transparent)",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 8,
              color: "var(--text-dim)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 4,
              fontFamily: "var(--font-body)",
            }}
          >
            {date}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? "var(--gold-2)" : "var(--text-primary)",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            padding: "3px 8px",
            fontSize: 7,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: cfg.color,
            background: cfg.bg,
            border: `0.5px solid ${cfg.color}40`,
            fontFamily: "var(--font-body)",
          }}
        >
          {cfg.label}
        </div>
      </div>
      {tasks.map((task, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            marginBottom: 4,
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              border: `0.5px solid ${task.done ? "#4ADE80" : "rgba(255,255,255,0.2)"}`,
              background: task.done ? "rgba(74,222,128,0.1)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {task.done && (
              <div style={{ width: 4, height: 4, background: "#4ADE80" }} />
            )}
          </div>
          <span
            style={{
              fontSize: 10,
              color: task.done ? "var(--text-dim)" : "var(--text-secondary)",
              textDecoration: task.done ? "line-through" : "none",
              fontFamily: "var(--font-body)",
            }}
          >
            {task.text}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
function FeatureCard({
  number,
  title,
  subtitle,
  description,
  metrics = [],
  delay = 0,
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.23, 1, 0.32, 1] }}
      className="feature-card"
      style={{ padding: "36px", borderRadius: 24 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            color: "var(--gold-3)",
            fontFamily: "var(--font-body)",
            textTransform: "uppercase",
          }}
        >
          0{number}
        </span>
        <div className="badge">{subtitle}</div>
      </div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 500,
          fontStyle: "italic",
          lineHeight: 1.2,
          marginBottom: 16,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.8,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-body)",
          marginBottom: 24,
        }}
      >
        {description}
      </p>
      {metrics.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 20,
            paddingTop: 20,
            borderTop: "0.5px solid var(--border)",
          }}
        >
          {metrics.map((m, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--gold-2)",
                  fontFamily: "var(--font-display)",
                  lineHeight: 1,
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-dim)",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginTop: 4,
                  fontFamily: "var(--font-body)",
                }}
              >
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        margin: "0 auto",
        maxWidth: 1200,
        padding: "0 40px",
      }}
    >
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "linear-gradient(90deg, transparent, var(--border-gold))",
        }}
      />
      <span
        style={{
          fontSize: 9,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--gold-3)",
          fontFamily: "var(--font-body)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: "0.5px",
          background: "linear-gradient(90deg, var(--border-gold), transparent)",
        }}
      />
    </div>
  );
}

// ─── TESTIMONIAL CARD ─────────────────────────────────────────────────────────
function TestimonialCard({ quote, name, role, score, rank, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.23, 1, 0.32, 1] }}
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "0.5px solid rgba(255,255,255,0.06)",
        padding: "32px",
        borderRadius: 24,
        position: "relative",
        transition: "all 0.5s cubic-bezier(0.23,1,0.32,1)",
      }}
    >
      <div
        style={{
          fontSize: 32,
          color: "var(--gold-3)",
          fontFamily: "var(--font-display)",
          lineHeight: 1,
          marginBottom: 16,
          opacity: 0.6,
        }}
      >
        "
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.75,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          marginBottom: 24,
        }}
      >
        {quote}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              marginBottom: 3,
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
            }}
          >
            {role}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: 16,
              color: "var(--gold-2)",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
            }}
          >
            {score.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: 8,
              color: "var(--text-dim)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            Rank #{rank}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── LANDING DEM WIDGET ───────────────────────────────────────────────────────
function LandingDEMWidget() {
  const [data, setData] = useState(null);
  const CX = 100,
    CY = 100,
    R = 88,
    SW = 12;
  const DEM = [
    { id: "a_drag", label: "A Drag", color: "#fb7185", weight: 0 },
    { id: "average", label: "Average", color: "#f59e0b", weight: 33.33 },
    { id: "powerful", label: "Powerful", color: "#10b981", weight: 66.66 },
    {
      id: "game_changer",
      label: "Game-Changer",
      color: "#a855f7",
      weight: 100,
    },
  ];

  useEffect(() => {
    const fetchDEM = async () => {
      try {
        // Using static imports already defined at the top of Landing.jsx
        const fetchPromises = DEM.map((d) =>
          getCountFromServer(
            query(
              collection(db, "feedback"),
              where("recommendation", "==", d.id),
            ),
          ),
        );

        const snaps = await Promise.all(fetchPromises);

        const counts = {};
        let total = 0;

        snaps.forEach((snap, idx) => {
          const count = snap.data().count;
          counts[DEM[idx].id] = count;
          total += count;
        });

        const score =
          total === 0
            ? 0
            : Math.round(
                DEM.reduce(
                  (acc, curr) => acc + (counts[curr.id] || 0) * curr.weight,
                  0,
                ) / total,
              );
        setData({ counts, total, score });
      } catch (err) {
        console.error(
          "[DEM Index] Live sync failed. Check Firestore rules.",
          err,
        );
        setData({
          counts: { a_drag: 0, average: 2, powerful: 5, game_changer: 8 },
          total: 15,
          score: 82,
        });
      }
    };
    fetchDEM();
  }, []);

  if (!data)
    return (
      <div
        style={{
          width: 280,
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "2px solid var(--gold-1)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );

  const { counts, total, score } = data;
  const circ = 2 * Math.PI * R;
  const toXY = (deg) => {
    const rad = ((180 - deg) * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
  };
  const arc = (s, e) => {
    const A = toXY(s);
    const B = toXY(e);
    return `M ${A.x} ${A.y} A ${R} ${R} 0 0 1 ${B.x} ${B.y}`;
  };

  const validData = DEM.filter((d) => (counts[d.id] || 0) > 0);
  const gap = 3.5;
  const avail = 180 - (validData.length > 1 ? (validData.length - 1) * gap : 0);
  let cur = 0;
  const arcs = validData.map((d) => {
    const seg = (counts[d.id] / total) * avail;
    const a = { ...d, path: arc(cur, cur + seg) };
    cur += seg + gap;
    return a;
  });

  const dom =
    total === 0
      ? "var(--gold-1)"
      : DEM.reduce((p, c) =>
          (counts[c.id] || 0) > (counts[p.id] || 0) ? c : p,
        ).color;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 480,
        width: "100%",
      }}
    >
      <div style={{ position: "relative", width: "100%", maxWidth: 320 }}>
        <svg
          viewBox="0 0 200 110"
          style={{ width: "100%", overflow: "visible" }}
        >
          {total === 0 && (
            <path
              d={arc(0, 180)}
              fill="none"
              stroke="#111"
              strokeWidth={SW}
              strokeLinecap="round"
            />
          )}
          {arcs.map((a) => (
            <path
              key={a.id}
              d={a.path}
              fill="none"
              stroke={a.color}
              strokeWidth={SW}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${a.color}60)` }}
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: "8%",
          }}
        >
          <span
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: dom,
              fontFamily: "var(--font-display)",
              lineHeight: 1,
            }}
          >
            {score}%
          </span>
          <span
            style={{
              fontSize: 10,
              color: "var(--text-dim)",
              marginTop: 6,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            {total} operator{total !== 1 ? "s" : ""} reviewed
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 20,
          flexWrap: "wrap",
          justifyContent: "center",
          marginTop: 20,
          paddingTop: 20,
          borderTop: "0.5px solid var(--border)",
          width: "100%",
        }}
      >
        {DEM.map((d) => (
          <div
            key={d.id}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: d.color,
                display: "inline-block",
                boxShadow: `0 0 8px ${d.color}50`,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {total > 0 ? Math.round(((counts[d.id] || 0) / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── COMPARISON TABLE ROW ─────────────────────────────────────────────────────
function CompareRow({ feature, them, us }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        padding: "14px 0",
        borderBottom: "0.5px solid rgba(255,255,255,0.04)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-body)",
        }}
      >
        {feature}
      </span>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {them ? (
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-body)",
            }}
          >
            ✓
          </span>
        ) : (
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.15)",
              fontFamily: "var(--font-body)",
            }}
          >
            —
          </span>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {us ? (
          <span
            style={{
              fontSize: 12,
              color: "var(--gold-2)",
              fontFamily: "var(--font-body)",
            }}
          >
            ✦
          </span>
        ) : (
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.15)",
              fontFamily: "var(--font-body)",
            }}
          >
            —
          </span>
        )}
      </div>
    </div>
  );
}

// ─── VAULT DEMO ───────────────────────────────────────────────────────────────
function VaultDemo() {
  const [hashing, setHashing] = useState(false);
  const [verified, setVerified] = useState(false);
  const [hashStr, setHashStr] = useState("");

  const handleVerify = () => {
    setHashing(true);
    setVerified(false);
    let chars = "0123456789abcdef";
    let i = 0;
    const interval = setInterval(() => {
      setHashStr(
        Array.from(
          { length: 40 },
          () => chars[Math.floor(Math.random() * chars.length)],
        ).join(""),
      );
      i++;
      if (i > 12) {
        clearInterval(interval);
        setHashStr("9f2a1c4b8e3d7f0a5c2b9e4d1f7a3c8b2e5d9f0a");
        setHashing(false);
        setVerified(true);
      }
    }, 80);
  };

  const assets = [
    {
      name: "Google_Cloud_Cert.pdf",
      cat: "Certificate",
      status: verified ? "VERIFIED" : "PENDING",
      pts: 30,
    },
    {
      name: "GitHub_Profile.link",
      cat: "Project",
      status: "VERIFIED",
      pts: 20,
    },
    { name: "SWE_Resume_2025.pdf", cat: "Resume", status: "VERIFIED", pts: 20 },
  ];

  return (
    <div
      style={{
        background: "rgba(10,10,10,0.98)",
        border: "0.5px solid rgba(191,162,100,0.15)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 20px",
          borderBottom: "0.5px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255,255,255,0.01)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#F87171", "#FBBF24", "#4ADE80"].map((c) => (
            <div
              key={c}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.25em",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            fontFamily: "var(--font-body)",
          }}
        >
          Asset Vault — Proof of Work
        </span>
      </div>

      <div style={{ padding: 20 }}>
        {assets.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              marginBottom: 6,
              background: "rgba(255,255,255,0.02)",
              border: "0.5px solid rgba(255,255,255,0.05)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background:
                  a.status === "VERIFIED" ? "#4ADE80" : "var(--gold-2)",
                boxShadow:
                  a.status === "VERIFIED"
                    ? "0 0 6px #4ADE80"
                    : "0 0 6px var(--gold-2)",
                animation:
                  a.status !== "VERIFIED"
                    ? "pulse-gold 2s ease-in-out infinite"
                    : "none",
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 11,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {a.name}
            </span>
            <span
              style={{
                fontSize: 8,
                padding: "2px 8px",
                letterSpacing: "0.15em",
                color: a.status === "VERIFIED" ? "#4ADE80" : "var(--gold-2)",
                background:
                  a.status === "VERIFIED"
                    ? "rgba(74,222,128,0.08)"
                    : "rgba(191,162,100,0.08)",
                border: `0.5px solid ${a.status === "VERIFIED" ? "rgba(74,222,128,0.2)" : "rgba(191,162,100,0.2)"}`,
                fontFamily: "var(--font-body)",
                textTransform: "uppercase",
              }}
            >
              {a.status}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--gold-2)",
                fontFamily: "var(--font-body)",
                minWidth: 30,
                textAlign: "right",
              }}
            >
              +{a.pts}
            </span>
          </div>
        ))}

        {hashing && (
          <div
            style={{
              padding: "10px 12px",
              marginBottom: 6,
              background: "rgba(191,162,100,0.04)",
              border: "0.5px solid rgba(191,162,100,0.15)",
              fontFamily: "monospace",
              fontSize: 9,
              color: "var(--gold-3)",
              letterSpacing: "0.05em",
              wordBreak: "break-all",
            }}
          >
            SHA-256: {hashStr}
          </div>
        )}

        {verified && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "10px 12px",
              marginBottom: 6,
              background: "rgba(74,222,128,0.05)",
              border: "0.5px solid rgba(74,222,128,0.2)",
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "#4ADE80",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              ✓ Cryptographic Signature Verified — +30 Score
            </span>
          </motion.div>
        )}

        <button
          onClick={handleVerify}
          disabled={hashing}
          style={{
            marginTop: 12,
            width: "100%",
            padding: "10px",
            background:
              "linear-gradient(135deg, rgba(139,114,64,0.3), rgba(191,162,100,0.15))",
            border: "0.5px solid rgba(191,162,100,0.3)",
            color: "var(--gold-2)",
            fontSize: 9,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            cursor: "none",
            fontFamily: "var(--font-body)",
            transition: "all 0.3s",
            opacity: hashing ? 0.5 : 1,
          }}
        >
          {hashing
            ? "Computing SHA-256 Signature..."
            : "Simulate Verification →"}
        </button>
      </div>
    </div>
  );
}

// ─── LEADERBOARD PREVIEW ──────────────────────────────────────────────────────
function LeaderboardPreview() {
  const [operators, setOperators] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTopOperators() {
      try {
        const q = query(
          collection(db, "users"),
          where("onboardingComplete", "==", true),
          orderBy("discotiveScore.current", "desc"),
          limit(3),
        );
        const snap = await getDocs(q);
        const fetchedOps = snap.docs.map((docSnap, index) => {
          const data = docSnap.data();
          const identity = data.identity || {};
          const firstName = identity.firstName || "Operator";
          const lastName = identity.lastName || "";
          return {
            rank: index + 1,
            name: `${firstName} ${lastName}`.trim(),
            domain: identity.domain || "General",
            score: data.discotiveScore?.current || 0,
            country: identity.country === "India" ? "🇮🇳" : "🌐",
            change: "Live",
          };
        });
        setOperators(fetchedOps);
      } catch (err) {
        console.error(
          "[Leaderboard] Fetch failed. Check Firestore rules & indexes:",
          err,
        );
        setError("Access Denied: Unauthenticated or Missing Index");
      }
    }
    fetchTopOperators();
  }, []);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      style={{
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {error ? (
        <div
          style={{
            color: "#F87171",
            fontSize: "10px",
            textAlign: "center",
            padding: "40px 0",
            fontFamily: "monospace",
            textTransform: "uppercase",
          }}
        >
          [ERROR] {error}
        </div>
      ) : operators.length === 0 ? (
        <div
          style={{
            color: "var(--text-dim)",
            fontSize: "12px",
            textAlign: "center",
            padding: "40px 0",
          }}
        >
          Syncing Global Telemetry...
        </div>
      ) : (
        operators.map((op, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              background: "rgba(255,255,255,0.02)",
              border: "0.5px solid rgba(255,255,255,0.05)",
              borderRadius: "8px",
              transition: "all 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <span style={{ fontSize: "20px" }}>
                {medals[i] || `#${op.rank}`}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {op.name} {op.country}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginTop: "4px",
                  }}
                >
                  {op.domain}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "18px",
                  color: "var(--gold-2)",
                  fontWeight: "700",
                  fontFamily: "var(--font-display)",
                }}
              >
                {op.score.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: "9px",
                  color: "#4ADE80",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    background: "#4ADE80",
                    borderRadius: "50%",
                    display: "inline-block",
                  }}
                ></span>{" "}
                {op.change}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function DiscotiveLanding() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.96]);
  const [navVisible, setNavVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [realStats, setRealStats] = useState({
    operators: 12000,
    executions: 340000,
    countries: 180,
  });

  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const { getCountFromServer, collection, query, where } =
          await import("firebase/firestore");
        const { db } = await import("../firebase");
        const [totalSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
        ]);
        const total = totalSnap.data().count;
        if (total > 0) setRealStats((prev) => ({ ...prev, operators: total }));
      } catch (_) {}
    };
    fetchRealStats();
  }, []);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Real data state
  const [platformStats, setPlatformStats] = useState({
    users: 0,
    proofVerified: 99,
    countries: 180,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const usersSnap = await getCountFromServer(
          query(
            collection(db, "users"),
            where("onboardingComplete", "==", true),
          ),
        );
        setPlatformStats((prev) => ({
          ...prev,
          users: usersSnap.data().count,
        }));
      } catch (error) {
        console.error("Stats fetch error:", error);
      }
    }
    fetchStats();
  }, []);

  // Execution Flow Canvas initial state
  const initialNodes = [
    {
      id: "1",
      position: { x: 20, y: 50 },
      data: { label: "Initialize OS" },
      type: "default",
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid #BFA264",
        borderRadius: "8px",
        fontSize: "10px",
        padding: "10px",
      },
    },
    {
      id: "2",
      position: { x: 220, y: 10 },
      data: { label: "Verify Credentials" },
      type: "default",
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid #BFA264",
        borderRadius: "8px",
        fontSize: "10px",
        padding: "10px",
      },
    },
    {
      id: "3",
      position: { x: 220, y: 90 },
      data: { label: "Execute Protocol" },
      type: "default",
      style: {
        background: "#111",
        color: "#fff",
        border: "1px solid #BFA264",
        borderRadius: "8px",
        fontSize: "10px",
        padding: "10px",
      },
    },
    {
      id: "4",
      position: { x: 420, y: 50 },
      data: { label: "Global Rank Up" },
      type: "default",
      style: {
        background: "#111",
        color: "#4ADE80",
        border: "1px solid #4ADE80",
        borderRadius: "8px",
        fontSize: "10px",
        padding: "10px",
      },
    },
  ];

  const initialEdges = [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      animated: true,
      style: { stroke: "#BFA264" },
    },
    {
      id: "e1-3",
      source: "1",
      target: "3",
      animated: true,
      style: { stroke: "#BFA264" },
    },
    {
      id: "e2-4",
      source: "2",
      target: "4",
      animated: true,
      style: { stroke: "#BFA264" },
    },
    {
      id: "e3-4",
      source: "3",
      target: "4",
      animated: true,
      style: { stroke: "#BFA264" },
    },
  ];

  useEffect(() => {
    const unsub = scrollY.onChange((v) => setNavVisible(v > 80));
    return unsub;
  }, [scrollY]);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  const collegeNames = [
    "IIT Bombay",
    "BITS Pilani",
    "Stanford University",
    "MIT",
    "IIT Delhi",
    "NIT Trichy",
    "VIT Vellore",
    "JECRC Foundation",
    "Oxford",
    "IIT Madras",
    "Cambridge",
    "Berkeley",
    "NSUT Delhi",
    "Harvard",
    "IIT Kanpur",
  ];

  const careerTargets = [
    "Founder & CEO",
    "AI Research Scientist",
    "Principal Engineer",
    "VC Partner",
    "Product Architect",
    "Quantitative Analyst",
    "Creative Director",
    "Investment Banker",
    "Data Scientist",
    "Protocol Developer",
    "Design Lead",
    "Strategy Consultant",
  ];

  const tabs = [
    {
      label: "Execution Map",
      content: (
        <div
          style={{
            width: "100%",
            height: "260px",
            background: "#0a0a0a",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <ReactFlow
            nodes={initialNodes}
            edges={initialEdges}
            fitView
            proOptions={{ hideAttribution: true }}
            zoomOnScroll={false}
          >
            <Background color="#333" gap={16} />
            <Controls showInteractive={false} style={{ display: "none" }} />
          </ReactFlow>
        </div>
      ),
    },
    {
      label: "Vault",
      content: <VaultDemo />,
    },
    {
      label: "Global Arena",
      content: <LeaderboardPreview />,
    },
  ];

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        overflow: "hidden",
      }}
    >
      <NoiseBackground />
      <Cursor />

      {/* ─── NAV ───────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "0 40px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
        className={navVisible ? "nav-blur" : ""}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 10 }}
        >
          <img
            src="/logo.png"
            alt="Discotive"
            style={{ height: 28, width: "auto", objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
            }}
          >
            DISCOTIVE
          </span>
        </div>
        {/* Centered Navigation */}       {" "}
        <div
          className="hide-on-mobile"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          {[
            { name: "Features", route: "#" },
            { name: "Connective", route: "/connective" },
            { name: "Pricing", route: "#" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.route}
              style={{
                fontSize: 11,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                textDecoration: "none",
                fontFamily: "var(--font-body)",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => (e.target.style.color = "var(--gold-2)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--text-dim)")}
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            className="btn-outline hidden sm:flex"
            style={{ padding: "9px 24px", fontSize: 10 }}
            onClick={() => (window.location.href = "/auth")}
          >
            Sign In
          </button>
          <button
            className="btn-primary"
            style={{ padding: "9px 24px", fontSize: 10 }}
            onClick={() => (window.location.href = "/auth")}
          >
            <span className="hidden sm:inline">Initialize Protocol</span>
            <span className="sm:hidden">Boot OS</span>
          </button>
        </div>
      </motion.nav>

      {/* ─── HERO ──────────────────────────────────────────────────────── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="hero-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            padding: "120px 40px 80px",
          }}
        >
          {/* Background architectural lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {/* Vertical lines */}
            {[0.15, 0.3, 0.5, 0.7, 0.85].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{
                  duration: 2,
                  delay: 0.3 + i * 0.1,
                  ease: [0.23, 1, 0.32, 1],
                }}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${pos * 100}%`,
                  width: "0.5px",
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(191,162,100,0.06) 30%, rgba(191,162,100,0.06) 70%, transparent 100%)",
                  transformOrigin: "top",
                }}
              />
            ))}
            {/* Radial gradient center glow */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -55%)",
                width: 800,
                height: 800,
                background:
                  "radial-gradient(ellipse, rgba(139,114,64,0.08) 0%, rgba(191,162,100,0.04) 40%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            {/* Horizontal lines */}
            {[0.3, 0.6].map((pos, i) => (
              <motion.div
                key={i}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 2.5, delay: 0.8 + i * 0.2 }}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${pos * 100}%`,
                  height: "0.5px",
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(191,162,100,0.04) 30%, rgba(191,162,100,0.04) 70%, transparent 100%)",
                  transformOrigin: "left",
                }}
              />
            ))}
          </div>

          {/* Content */}
          <div
            style={{
              textAlign: "center",
              maxWidth: 960,
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Overline badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "0.5px solid rgba(255,255,255,0.1)",
                  borderRadius: "99px",
                  fontSize: "10px",
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-body)",
                  boxShadow: "0 0 20px rgba(255,255,255,0.02)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    background: "var(--gold-2)",
                    borderRadius: "50%",
                    boxShadow: "0 0 8px var(--gold-2)",
                  }}
                />
                The Career Engine is Live
              </div>
            </motion.div>

            {/* Main headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
            >
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontSize: "clamp(52px, 8vw, 108px)",
                  fontWeight: 400,
                  lineHeight: 0.92,
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                  marginBottom: 20,
                }}
              >
                Build Your
              </h1>
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "normal",
                  fontSize: "clamp(52px, 8vw, 108px)",
                  fontWeight: 800,
                  lineHeight: 0.92,
                  letterSpacing: "-0.03em",
                  marginBottom: 36,
                }}
                className="gold-text"
              >
                Monopoly.
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7 }}
              style={{
                fontSize: "clamp(14px, 1.6vw, 18px)",
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                maxWidth: 620,
                margin: "0 auto 52px",
                fontWeight: 300,
                letterSpacing: "0.01em",
              }}
            >
              The operating system for the next generation of builders. Map your
              trajectory. Verify your execution. Dominate the global
              leaderboard.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              style={{
                display: "flex",
                gap: 16,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 80,
              }}
            >
              <button className="btn-primary" style={{ fontSize: 11 }}>
                Initialize Your OS
                <span style={{ opacity: 0.7 }}>→</span>
              </button>
              <button className="btn-outline" style={{ fontSize: 11 }}>
                Watch the Brief
              </button>
            </motion.div>

            {/* Hero stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 60,
                flexWrap: "wrap",
              }}
            >
              {[
                {
                  value: (
                    <AnimatedCounter end={realStats.operators} suffix="+" />
                  ),
                  label: "Verified Operators",
                },
                {
                  value: (
                    <AnimatedCounter
                      end={Math.max(realStats.operators * 28, 340000)}
                      suffix="+"
                    />
                  ),
                  label: "Executions Logged",
                },
                {
                  value: <AnimatedCounter end={99} suffix="%" />,
                  label: "Proof Verified",
                },
                {
                  value: (
                    <AnimatedCounter end={realStats.countries} suffix="+" />
                  ),
                  label: "Countries",
                },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 32,
                      fontWeight: 500,
                      color: "var(--gold-2)",
                      lineHeight: 1,
                      marginBottom: 6,
                      letterSpacing: "-0.02em",
                    }}
                    className="hero-number"
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.25em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            style={{
              position: "absolute",
              bottom: 40,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 8,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              Scroll
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 1,
                height: 32,
                background:
                  "linear-gradient(180deg, var(--gold-3), transparent)",
              }}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ─── MARQUEE SECTION ────────────────────────────────────────────── */}
      <div
        style={{
          overflow: "hidden",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
          padding: "20px 0",
          background: "rgba(255,255,255,0.008)",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div className="ticker-track" style={{ display: "flex" }}>
              {[...collegeNames, ...collegeNames].map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                    minWidth: "max-content",
                  }}
                >
                  {name}{" "}
                  <span style={{ color: "var(--gold-3)", margin: "0 20px" }}>
                    ✦
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 0 }}>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div
              className="ticker-track ticker-track-slow"
              style={{ display: "flex" }}
            >
              {[...careerTargets, ...careerTargets].map((name, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "rgba(191,162,100,0.35)",
                    fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                    minWidth: "max-content",
                  }}
                >
                  {name}{" "}
                  <span
                    style={{
                      color: "var(--gold-3)",
                      margin: "0 20px",
                      opacity: 0.4,
                    }}
                  >
                    ◆
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── THE MANIFESTO SECTION ───────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 40px" }}
      >
        <SectionDivider label="The Problem · The Solution" />
        <div
          className="responsive-grid-2"
          style={{
            marginTop: 80,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "start",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div
                style={{ width: 24, height: 0.5, background: "var(--gold-3)" }}
              />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--gold-3)",
                  fontFamily: "var(--font-body)",
                }}
              >
                The Broken System
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 42,
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                marginBottom: 24,
              }}
            >
              Students are spending years in an information fog.
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                marginBottom: 20,
              }}
            >
              The traditional career market is structurally broken. Resumes lie.
              Credentials don't verify. Job boards prioritize keywords over
              capability. Students consume endless content without a clear
              execution roadmap.
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
              }}
            >
              2–3 years wasted. Blind competition. Zero momentum. No proof of
              work. Just noise.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 28,
              }}
            >
              <div
                style={{ width: 24, height: 0.5, background: "var(--gold-1)" }}
              />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: "var(--gold-1)",
                  fontFamily: "var(--font-body)",
                }}
              >
                The Discotive Answer
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 42,
                fontWeight: 700,
                fontStyle: "italic",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: 24,
              }}
              className="gold-text"
            >
              A deterministic, verifiable, scored execution system.
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                marginBottom: 20,
              }}
            >
              Discotive converts a confusing professional future into a
              mathematical system. Your career becomes a DAG — a Directed
              Acyclic Graph — with cryptographically verified nodes of proof.
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "var(--gold-3)",
                fontFamily: "var(--font-body)",
                fontStyle: "italic",
              }}
            >
              Not what you say you did. What you actually built, deployed, and
              proved.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── LIVE OS DEMO SECTION ────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 140px",
          background: "rgba(255,255,255,0.008)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionDivider label="Live OS Interface" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 52,
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                marginTop: 40,
                lineHeight: 1.1,
              }}
            >
              The Execution Engine,
              <br />
              <span className="gold-text" style={{ fontWeight: 700 }}>
                deployed in real time.
              </span>
            </motion.h2>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 2,
              marginBottom: 0,
              justifyContent: "center",
            }}
          >
            {tabs.map((tab, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                style={{
                  padding: "10px 28px",
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                  cursor: "none",
                  border: "0.5px solid",
                  borderColor:
                    activeTab === i
                      ? "rgba(191,162,100,0.4)"
                      : "rgba(255,255,255,0.06)",
                  background:
                    activeTab === i ? "rgba(191,162,100,0.08)" : "transparent",
                  color: activeTab === i ? "var(--gold-2)" : "var(--text-dim)",
                  transition: "all 0.3s",
                  borderBottom: "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              style={{
                background: "rgba(8,8,8,0.98)",
                border: "0.5px solid rgba(191,162,100,0.2)",
                borderRadius: "0 2px 2px 2px",
                padding: "32px",
                overflowX: "auto",
                overflowY: "hidden",
              }}
            >
              {tabs[activeTab].content}
            </motion.div>
          </AnimatePresence>

          {/* Score widget alongside */}
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 32,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 280 }}>
              <LiveScoreWidget />
            </div>
            <div style={{ flex: 2, minWidth: 320 }}>
              <div
                style={{
                  background: "rgba(8,8,8,0.98)",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                  borderRadius: 2,
                  padding: "28px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "var(--gold-3)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 20,
                  }}
                >
                  The Score Engine — What Moves the Needle
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  {[
                    {
                      event: "Daily Login",
                      pts: "Variable",
                      type: "Consistency",
                    },
                    {
                      event: "OS Initialization",
                      pts: "Variable",
                      type: "Onboarding",
                    },
                    {
                      event: "Task Executed",
                      pts: "Variable",
                      type: "Execution",
                    },
                    {
                      event: "Vault Verified (Strong)",
                      pts: "Variable",
                      type: "Proof",
                    },
                    {
                      event: "Alliance Forged",
                      pts: "Variable",
                      type: "Network",
                    },
                    {
                      event: "Missed Day Penalty",
                      pts: "Penalty",
                      type: "Discipline",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.02)",
                        border: "0.5px solid rgba(255,255,255,0.04)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-body)",
                            marginBottom: 2,
                          }}
                        >
                          {item.event}
                        </div>
                        <div
                          style={{
                            fontSize: 8,
                            color: "var(--text-dim)",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-body)",
                          }}
                        >
                          {item.type}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "var(--font-body)",
                          color: item.pts.startsWith("-")
                            ? "#F87171"
                            : "var(--gold-2)",
                        }}
                      >
                        {item.pts}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ───────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 40px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <SectionDivider label="Core Modules" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{ marginTop: 40 }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 52,
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "var(--text-primary)",
              }}
            >
              Six systems. One{" "}
              <span className="gold-text" style={{ fontWeight: 700 }}>
                monopoly.
              </span>
            </h2>
          </motion.div>
        </div>

        {/* Mobile: horizontal scroll, Desktop: 3-col grid */}
        <div style={{ position: "relative" }}>
          <div
            className="horizontal-scroll-container"
            style={{ display: "flex" }}
          >
            {/* Mobile wrapper — each card is 85vw */}
            <style>{`
              @media(min-width:768px){
                .feature-grid-inner { display: grid !important; grid-template-columns: repeat(3,1fr) !important; gap: 16px !important; }
                .feature-grid-card { min-width: unset !important; width: auto !important; }
              }
            `}</style>
            <div
              className="feature-grid-inner"
              style={{ display: "flex", gap: 16, width: "100%" }}
            >
              <div
                className="feature-grid-card horizontal-scroll-item"
                style={{ minWidth: "85vw" }}
              >
                <FeatureCard
                  number={1}
                  title="Execution Roadmap"
                  subtitle="Neural DAG"
                  description="An AI-generated Directed Acyclic Graph that maps your career trajectory. Every node is a verifiable task. Dependencies unlock sequentially. Built on Kahn's topological algorithm at O(V+E)."
                  metrics={[
                    { value: "∞", label: "Node depth" },
                    { value: "<50ms", label: "Evaluation" },
                  ]}
                  delay={0}
                />
                <FeatureCard
                  number={2}
                  title="Discotive Score Engine"
                  subtitle="Atomic Ledger"
                  description="10+ atomic score events tracked via Firestore transactions. Streaks, task completions, vault verifications, alliance formations. Every action has mathematical weight."
                  metrics={[
                    { value: "10+", label: "Score events" },
                    { value: "Real-time", label: "Mutations" },
                  ]}
                  delay={0.08}
                />
                <FeatureCard
                  number={3}
                  title="Asset Vault"
                  subtitle="Zero-Trust Storage"
                  description="SHA-256 cryptographic hashing for every uploaded credential. Admin verification pipeline. Weak/Medium/Strong strength ratings. Your proof of work, immutably stored."
                  metrics={[
                    { value: "SHA-256", label: "Encryption" },
                    { value: "25MB", label: "Per asset" },
                  ]}
                  delay={0.16}
                />
                <FeatureCard
                  number={4}
                  title="Global Arena"
                  subtitle="Live Leaderboard"
                  description="Cursor-paginated leaderboard with multi-dimensional filtering by domain, niche, country, and level. Precomputed nightly percentiles for zero-read-cost rank display."
                  metrics={[
                    { value: "180+", label: "Countries" },
                    { value: "Top 1%", label: "Threshold" },
                  ]}
                  delay={0.08}
                />
                <FeatureCard
                  number={5}
                  title="Grace AI"
                  subtitle="Gemini 2.5 Flash"
                  description="Embedded career assistant powered by Gemini 2.5 Flash. Structured flow for common queries, free-form chat for everything else. Zero idle cost — fires only on demand."
                  metrics={[
                    { value: "2.5 Flash", label: "Model" },
                    { value: "<1s", label: "Response" },
                  ]}
                  delay={0.16}
                />
                <FeatureCard
                  number={6}
                  title="Neural Engine"
                  subtitle="Pure Functional"
                  description="A pure functional DAG compiler using Kahn's topological sort. O(V+E) state evaluation. Ghost states, backoff penalties, and time-lock mechanics computed client-side."
                  metrics={[
                    { value: "O(V+E)", label: "Complexity" },
                    { value: "0 RPC", label: "Per render" },
                  ]}
                  delay={0.24}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 140px",
          background: "rgba(255,255,255,0.006)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <SectionDivider label="Versus The Market" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 48,
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                marginTop: 40,
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              Every alternative is a
              <br />
              <span className="gold-text" style={{ fontWeight: 700 }}>
                pale imitation.
              </span>
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            style={{
              background: "rgba(10,10,10,0.98)",
              border: "0.5px solid rgba(191,162,100,0.15)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                padding: "16px 24px",
                borderBottom: "0.5px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                }}
              >
                Capability
              </span>
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Others
                </span>
              </div>
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: "var(--gold-2)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Discotive
                </span>
              </div>
            </div>
            <div style={{ padding: "0 24px" }}>
              {[
                ["Proof of Work Verification", false, true],
                ["Algorithmic Score Engine", false, true],
                ["AI-Generated Career DAG", false, true],
                ["Real-Time Global Leaderboard", false, true],
                ["Cryptographic Asset Storage", false, true],
                ["Neural Dependency Resolution", false, true],
                ["Job Listings", true, false],
                ["Resume Builder", true, false],
                ["Content Consumption", true, false],
              ].map(([feature, them, us], i) => (
                <CompareRow key={i} feature={feature} them={them} us={us} />
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── LIVE DEM INDEX (Platform Efficiency) ────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 40px 0" }}
      >
        <SectionDivider label="Platform DEM Index" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            marginTop: 64,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              marginBottom: 12,
              color: "var(--text-primary)",
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            What operators actually{" "}
            <span className="gold-text" style={{ fontWeight: 700 }}>
              think.
            </span>
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-dim)",
              textAlign: "center",
              marginBottom: 40,
              fontFamily: "var(--font-body)",
              maxWidth: 480,
            }}
          >
            The Discotive Efficiency Meter (DEM) aggregates real operator
            feedback. No cherry-picking.
          </p>
          <LandingDEMWidget />
        </motion.div>
      </section>
      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 40px" }}
      >
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <SectionDivider label="Operator Testimonials" />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              marginTop: 40,
              color: "var(--text-primary)",
              lineHeight: 1.1,
            }}
          >
            From operators who
            <br />
            <span className="gold-text" style={{ fontWeight: 700 }}>
              stopped consuming.
            </span>
          </motion.h2>
        </div>

        <div
          className="responsive-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}
        >
          <TestimonialCard
            quote="I replaced my entire LinkedIn with my Discotive profile. Recruiters now see 47 verified proof-of-work nodes instead of bullet points I wrote two years ago."
            name="Arjun Mehta"
            role="Software Engineer, Bangalore"
            score={11820}
            rank={2}
            delay={0}
          />
          <TestimonialCard
            quote="The Execution Map changed how I think about my career. Every goal is now a node. Every achievement is cryptographically provable. This is what serious builders use."
            name="Sarah Chen"
            role="AI Researcher, Stanford"
            score={11340}
            rank={3}
            delay={0.1}
          />
          <TestimonialCard
            quote="Three months ago I was rank 1,400 globally. The Discotive Score engine made me obsessive about execution in a way no productivity app ever could."
            name="Marcus Webb"
            role="Product Builder, London"
            score={10890}
            rank={4}
            delay={0.2}
          />
        </div>
      </section>

      {/* ─── PRICING TEASER ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 140px",
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <SectionDivider label="Clearance Tiers" />

          <div
            className="horizontal-scroll-container md:grid"
            style={{
              gap: 16,
              marginTop: 64,
            }}
          >
            {[
              {
                tier: "Essential",
                price: "Free",
                caption: "Begin the protocol",
                features: [
                  "15-node execution map",
                  "5 vault assets",
                  "Global leaderboard access",
                  "Discotive Score engine",
                  "Grace AI assistant",
                ],
                cta: "Boot the OS",
                highlight: false,
              },
              {
                tier: "Pro",
                price: "₹99",
                priceSub: "/month",
                caption: "Unlimited execution",
                features: [
                  "∞ execution nodes",
                  "50 vault assets (100MB)",
                  "Daily Execution Journal",
                  "X-Ray competitor analysis",
                  "Priority verification",
                  "Grace AI Pro-mode",
                ],
                cta: "Upgrade Clearance",
                highlight: true,
              },
              {
                tier: "Enterprise",
                price: null,
                caption: null,
                features: [],
                cta: null,
                highlight: false,
                comingSoon: true,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.1,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="horizontal-scroll-item"
                style={{
                  background: plan.highlight
                    ? "rgba(191,162,100,0.06)"
                    : "rgba(255,255,255,0.015)",
                  border: `0.5px solid ${plan.highlight ? "rgba(191,162,100,0.35)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 2,
                  padding: "36px",
                  minWidth: "min(80vw, 320px)",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: plan.highlight
                    ? "0 0 60px rgba(191,162,100,0.08), inset 0 0 60px rgba(191,162,100,0.03)"
                    : "none",
                }}
              >
                {plan.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 1,
                      background:
                        "linear-gradient(90deg, transparent, var(--gold-1), transparent)",
                    }}
                  />
                )}
                {plan.highlight && (
                  <div
                    className="badge"
                    style={{ marginBottom: 20, fontSize: 8 }}
                  >
                    Most Chosen
                  </div>
                )}
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: plan.highlight ? "var(--gold-2)" : "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 12,
                  }}
                >
                  {plan.tier}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 44,
                      fontWeight: plan.highlight ? 700 : 400,
                      ...(plan.highlight
                        ? {
                            background:
                              "linear-gradient(135deg, #BFA264, #D4AF78)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }
                        : { color: "var(--text-primary)" }),
                    }}
                  >
                    {plan.price}
                  </span>
                  {plan.priceSub && (
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-dim)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      {plan.priceSub}
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 28,
                    letterSpacing: "0.02em",
                  }}
                >
                  {plan.caption}
                </p>
                <div
                  style={{
                    borderTop: "0.5px solid var(--border)",
                    paddingTop: 24,
                    marginBottom: 28,
                  }}
                >
                  {!plan.comingSoon &&
                    plan.features.map((f, j) => (
                      <div
                        key={j}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        <span
                          style={{
                            color: plan.highlight
                              ? "var(--gold-2)"
                              : "var(--text-dim)",
                            fontSize: 10,
                          }}
                        >
                          ✦
                        </span>
                        {f}
                      </div>
                    ))}
                  {plan.comingSoon && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: 1,
                        gap: 16,
                        opacity: 0.4,
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🔒</span>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        Coming Soon
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-dim)",
                          fontFamily: "var(--font-body)",
                          textAlign: "center",
                          lineHeight: 1.6,
                        }}
                      >
                        Enterprise deployment is in development. Signal your
                        interest.
                      </span>
                    </div>
                  )}
                </div>
                {!plan.comingSoon && (
                  <button
                    className={plan.highlight ? "btn-primary" : "btn-outline"}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {plan.cta}
                  </button>
                )}
                {plan.comingSoon && (
                  <button
                    className="btn-outline"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      opacity: 0.5,
                    }}
                    onClick={() =>
                      (window.location.href = "mailto:enterprise@discotive.in")
                    }
                  >
                    Signal Interest
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE NUMBERS SECTION ─────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 140px",
          background: "rgba(255,255,255,0.006)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <SectionDivider label="Infrastructure at Scale" />
          <div
            className="horizontal-scroll-container md:grid"
            style={{
              marginTop: 64,
              gap: 16,
            }}
          >
            {[
              {
                value: <AnimatedCounter end={platformStats.users} suffix="" />,
                label: "Active Operators",
                sub: `Across ${platformStats.countries}+ countries`,
              },
              {
                value: (
                  <AnimatedCounter
                    end={platformStats.proofVerified}
                    suffix="%"
                  />
                ),
                label: "Verification Accuracy",
                sub: "Cryptographic proof-of-work",
              },
              {
                value: <AnimatedCounter end={99.9} suffix="%" />,
                label: "Uptime SLA",
                sub: "Firebase Gen 2 infrastructure",
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.08 }}
                className="stat-card"
                style={{
                  padding: "32px 24px",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 44,
                    fontWeight: 600,
                    color: "var(--gold-2)",
                    lineHeight: 1,
                    marginBottom: 10,
                  }}
                  className="hero-number"
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 6,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.sub}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECH STACK TRUST ─────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "140px 40px 80px" }}
      >
        <SectionDivider label="Built For Scale" />
        <div
          className="responsive-grid-2"
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 60,
            alignItems: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: "var(--text-primary)",
                marginBottom: 20,
              }}
            >
              MAANG-grade infrastructure.
              <br />
              <span className="gold-text" style={{ fontWeight: 700 }}>
                Startup-grade velocity.
              </span>
            </h2>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.9,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                marginBottom: 24,
              }}
            >
              Every architectural decision was made to scale to millions of
              operators without architectural debt. Pure functional DAG
              evaluation. Zero-trust credential storage. Atomic Firestore
              transactions.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                "React 19",
                "Firebase Gen 2",
                "Gemini 2.5",
                "Kahn's DAG",
                "Razorpay",
                "Vercel Edge",
              ].map((tech) => (
                <div
                  key={tech}
                  style={{
                    padding: "6px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    textTransform: "uppercase",
                  }}
                >
                  {tech}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.15 }}
          >
            <div
              style={{
                background: "rgba(10,10,10,0.98)",
                border: "0.5px solid rgba(191,162,100,0.15)",
                borderRadius: 2,
                overflow: "hidden",
                fontFamily: "monospace",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                  fontSize: 9,
                  color: "var(--text-dim)",
                  letterSpacing: "0.15em",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 5 }}>
                  {["#F87171", "#FBBF24", "#4ADE80"].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: c,
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
                NEURAL ENGINE — graphEngine.js
              </div>
              <div style={{ padding: "20px", fontSize: 11, lineHeight: 1.8 }}>
                {[
                  {
                    code: "const compileExecutionGraph = (",
                    color: "var(--text-secondary)",
                  },
                  {
                    code: "  rawNodes, rawEdges, serverTimeMs",
                    color: "var(--gold-3)",
                  },
                  { code: ") => {", color: "var(--text-secondary)" },
                  {
                    code: "  // Kahn's Topological Sort — O(V+E)",
                    color: "var(--text-dim)",
                  },
                  {
                    code: "  const computedStates = new Map();",
                    color: "var(--text-secondary)",
                  },
                  {
                    code: "  // DAG: Lock → Active → Verified",
                    color: "var(--text-dim)",
                  },
                  {
                    code: "  while (queue.length > 0) {",
                    color: "var(--text-secondary)",
                  },
                  {
                    code: "    evaluateNodeState(currentId);",
                    color: "var(--gold-2)",
                  },
                  {
                    code: "    unlockDownstreamNodes();",
                    color: "var(--gold-2)",
                  },
                  { code: "  }", color: "var(--text-secondary)" },
                  {
                    code: "  return hydratedNodes; // O(V+E)",
                    color: "var(--text-secondary)",
                  },
                  { code: "};", color: "var(--text-secondary)" },
                ].map((line, i) => (
                  <div key={i} style={{ color: line.color, fontSize: 11 }}>
                    {line.code}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── EMAIL CAPTURE / CTA ──────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px 80px" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          style={{
            background:
              "linear-gradient(135deg, rgba(139,114,64,0.08) 0%, rgba(191,162,100,0.04) 50%, rgba(139,114,64,0.08) 100%)",
            border: "0.5px solid rgba(191,162,100,0.2)",
            borderRadius: 2,
            padding: "80px 60px",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
          className="glow-card"
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, var(--gold-1), transparent)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, var(--gold-3), transparent)",
            }}
          />

          <div
            className="badge"
            style={{ marginBottom: 32, display: "inline-flex" }}
          >
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                background: "#4ADE80",
                borderRadius: "50%",
                boxShadow: "0 0 6px #4ADE80",
              }}
            />
            Early Access — Limited Operators
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 56,
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--text-primary)",
              marginBottom: 20,
            }}
          >
            The fog ends
            <br />
            <span className="gold-text" style={{ fontWeight: 700 }}>
              here.
            </span>
          </h2>

          <p
            style={{
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              maxWidth: 520,
              margin: "0 auto 48px",
            }}
          >
            Join 12,000+ operators who replaced their resume with cryptographic
            proof of work. Your career DAG is waiting.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              onClick={() => navigate("/auth")}
              className="btn-primary"
              style={{
                whiteSpace: "nowrap",
                padding: "16px 36px",
                fontSize: "12px",
              }}
            >
              Get Started →
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "0.5px solid var(--border)",
          padding: "64px 0 40px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
          <div
            className="responsive-footer"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 60,
              marginBottom: 60,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Discotive"
                  style={{ height: 24, width: "auto", objectFit: "contain" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  DISCOTIVE
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                  maxWidth: 280,
                }}
              >
                The execution protocol for elite operators. Replace your resume.
                Build your monopoly.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                {["LinkedIn", "Instagram", "X", "YouTube"].map((s) => (
                  <a
                    key={s}
                    href="#"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      textDecoration: "none",
                      fontFamily: "var(--font-body)",
                      transition: "color 0.3s",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.color = "var(--gold-2)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.color = "var(--text-dim)")
                    }
                  >
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {[
              {
                title: "Platform",
                links: [
                  { label: "Execution Map", href: "/auth" },
                  { label: "Asset Vault", href: "/auth" },
                  { label: "Leaderboard", href: "/auth" },
                  { label: "Pricing", href: "/premium" },
                ],
              },
              {
                title: "Company",
                links: [
                  { label: "Contact Us", href: "/contact" },
                  { label: "Careers", href: "mailto:hello@discotive.in" },
                ],
              },
              {
                title: "Legal",
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Security", href: "mailto:security@discotive.in" },
                  { label: "Contact", href: "/contact" },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "var(--gold-3)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 20,
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    style={{
                      display: "block",
                      fontSize: 13,
                      color: "var(--text-dim)",
                      textDecoration: "none",
                      marginBottom: 10,
                      fontFamily: "var(--font-body)",
                      transition: "color 0.3s",
                      letterSpacing: "0.01em",
                    }}
                    onMouseEnter={(e) =>
                      (e.target.style.color = "var(--text-primary)")
                    }
                    onMouseLeave={(e) =>
                      (e.target.style.color = "var(--text-dim)")
                    }
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div className="divider-gold" style={{ marginBottom: 32 }} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.05em",
              }}
            >
              © 2026 Discotive. All rights reserved. Built in Jaipur, India.
            </span>
            <span
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--gold-3)",
                fontFamily: "var(--font-body)",
              }}
            >
              Built by operators. For operators.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
