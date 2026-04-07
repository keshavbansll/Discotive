import { useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  useMotionTemplate,
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
import { db } from "../firebase";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
    --px: 16px;
    --px-md: 24px;
    --px-lg: 40px;
  }

  h1, h2, h3, .font-display {
    letter-spacing: -0.05em !important;
  }

  html { scroll-behavior: smooth; overflow-x: hidden; }

  body {
    background: var(--void);
    color: var(--text-primary);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  @media (min-width: 768px) {
    body { cursor: none; }
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

  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @keyframes shimmerPulse {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
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

  /* ── CURSOR (desktop only) ── */
  .custom-cursor {
    position: fixed;
    pointer-events: none;
    z-index: 99999;
    display: none;
  }

  @media (min-width: 768px) {
    .custom-cursor { display: block; }
  }

  .cursor-dot {
    width: 5px;
    height: 5px;
    background: var(--gold-4);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 8px var(--gold-2), 0 0 16px rgba(191,162,100,0.4);
  }

  .cursor-ring {
    width: 32px;
    height: 32px;
    border: 1.5px solid var(--gold-2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.25s ease, height 0.25s ease, border-color 0.25s ease, background 0.25s ease;
    background: rgba(191,162,100,0.04);
  }

  .cursor-ring.active {
    width: 48px;
    height: 48px;
    background: rgba(191,162,100,0.1);
    border-color: var(--gold-4);
  }

  /* ── BUTTONS ── */
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
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: none;
    border-radius: 9999px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  @media (min-width: 768px) {
    .btn-primary { cursor: none; }
  }

  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
    transform: translateX(-100%);
  }

  .btn-primary:hover::after { animation: shimmer 0.6s ease; }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 48px rgba(191,162,100,0.3), 0 4px 16px rgba(191,162,100,0.2);
  }

  .btn-primary:active { transform: scale(0.97); }

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
    border-radius: 9999px;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  @media (min-width: 768px) {
    .btn-outline { cursor: none; }
  }

  .btn-outline:hover {
    border-color: var(--gold-1);
    color: var(--gold-2);
    background: var(--gold-dim);
  }

  .btn-outline:active { transform: scale(0.97); }

  /* ── CARDS ── */
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
    transform: translateY(-6px) scale(1.015);
    box-shadow: 0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(191,162,100,0.25);
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

  /* ── TICKER ── */
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

  /* ── DIVIDERS ── */
  .divider-gold {
    height: 0.5px;
    background: linear-gradient(90deg, transparent 0%, var(--gold-3) 20%, var(--gold-1) 50%, var(--gold-3) 80%, transparent 100%);
  }

  /* ── SCORE RING ── */
  .score-ring { transform: rotate(-90deg); }
  .score-ring-track { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 3; }
  .score-ring-fill {
    fill: none;
    stroke-width: 3;
    stroke-linecap: round;
    stroke: url(#goldGrad);
    transition: stroke-dashoffset 2s cubic-bezier(0.23, 1, 0.32, 1);
  }

  /* ── BADGE ── */
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

  /* ── GLOW CARD ── */
  @keyframes borderGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(191,162,100,0.1); }
    50% { box-shadow: 0 0 40px rgba(191,162,100,0.25), 0 0 80px rgba(191,162,100,0.08); }
  }
  .glow-card { animation: borderGlow 4s ease-in-out infinite; }

  /* ── SECTION PADDING ── */
  .section-px {
    padding-left: var(--px);
    padding-right: var(--px);
  }
  @media (min-width: 640px) {
    .section-px { padding-left: var(--px-md); padding-right: var(--px-md); }
  }
  @media (min-width: 1024px) {
    .section-px { padding-left: var(--px-lg); padding-right: var(--px-lg); }
  }

  /* ── RESPONSIVE GRIDS (these actually work because no inline override) ── */
  .grid-2col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
  }
  @media (min-width: 768px) {
    .grid-2col { grid-template-columns: 1fr 1fr; gap: 60px; }
  }

  .grid-3col {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 640px) {
    .grid-3col { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .grid-3col { grid-template-columns: repeat(3, 1fr); }
  }

  .grid-4col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (min-width: 1024px) {
    .grid-4col { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px; }
  }

  .grid-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (min-width: 768px) {
    .grid-stats { grid-template-columns: repeat(4, 1fr); gap: 60px; }
  }

  .grid-numbers {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 640px) {
    .grid-numbers { grid-template-columns: repeat(3, 1fr); }
  }

  /* ── HIDE ON MOBILE / DESKTOP ── */
  .hide-on-mobile { display: none !important; }
  @media (min-width: 768px) {
    .hide-on-mobile { display: flex !important; }
  }

  .hide-on-desktop { display: flex !important; }
  @media (min-width: 768px) {
    .hide-on-desktop { display: none !important; }
  }

  /* ── NAV ── */
  .nav-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 var(--px);
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
  }
  @media (min-width: 640px) {
    .nav-inner { padding: 0 var(--px-md); height: 64px; }
  }
  @media (min-width: 1024px) {
    .nav-inner { padding: 0 var(--px-lg); }
  }

  /* ── HERO ── */
  .hero-padding {
    padding: 90px var(--px) 60px;
  }
  @media (min-width: 640px) {
    .hero-padding { padding: 100px var(--px-md) 80px; }
  }
  @media (min-width: 1024px) {
    .hero-padding { padding: 120px var(--px-lg) 100px; }
  }

  /* ── SECTION SPACING ── */
  .section-py {
    padding-top: 72px;
    padding-bottom: 72px;
  }
  @media (min-width: 768px) {
    .section-py { padding-top: 120px; padding-bottom: 120px; }
  }
  @media (min-width: 1024px) {
    .section-py { padding-top: 140px; padding-bottom: 140px; }
  }

  /* ── TABS ── */
  .tabs-row {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding-bottom: 2px;
  }
  .tabs-row::-webkit-scrollbar { display: none; }

  .tab-btn {
    padding: 10px 20px;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    font-family: var(--font-body);
    font-weight: 700;
    border: 0.5px solid;
    border-bottom: none;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.3s;
  }
  @media (min-width: 768px) {
    .tab-btn { cursor: none; padding: 10px 28px; }
  }

  /* ── COMPARISON TABLE ── */
  .compare-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .compare-grid {
    display: grid;
    grid-template-columns: 1fr 80px 80px;
    padding: 14px 0;
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
    min-width: 280px;
  }
  @media (min-width: 480px) {
    .compare-grid { grid-template-columns: 1fr 1fr 1fr; }
  }

  /* ── PRICING CARDS ── */
  .pricing-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 640px) {
    .pricing-row { grid-template-columns: repeat(3, 1fr); }
  }

  /* ── HORIZONTAL SCROLL ── */
  .h-scroll {
    display: flex;
    overflow-x: auto;
    gap: 16px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
    padding-bottom: 8px;
  }
  .h-scroll::-webkit-scrollbar { display: none; }
  .h-scroll-item {
    flex-shrink: 0;
    scroll-snap-align: start;
  }

  /* ── FEATURE GRID RESPONSIVE ── */
  .feature-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  @media (min-width: 640px) {
    .feature-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 1024px) {
    .feature-grid { grid-template-columns: repeat(3, 1fr); }
  }

  /* ── SCORE ENGINE GRID ── */
  .score-engine-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  /* ── SCORE + DEMO LAYOUT ── */
  .score-demo-layout {
    display: flex;
    flex-direction: column;
    gap: 24px;
    margin-top: 32px;
  }
  @media (min-width: 1024px) {
    .score-demo-layout { flex-direction: row; align-items: flex-start; gap: 32px; }
  }

  /* ── MANIFESTO GRID ── */
  .manifesto-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 40px;
    margin-top: 56px;
  }
  @media (min-width: 768px) {
    .manifesto-grid { grid-template-columns: 1fr 1fr; gap: 80px; }
  }

  /* ── TECH GRID ── */
  .tech-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 48px;
    align-items: center;
  }
  @media (min-width: 768px) {
    .tech-grid { grid-template-columns: 1fr 1fr; gap: 60px; }
  }

  /* ── SKELETON LOADER ── */
  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.04) 100%
    );
    background-size: 200% 100%;
    animation: shimmerPulse 1.6s infinite;
    border-radius: 8px;
  }

  /* ── PREMIUM BANNER ── */
  .premium-banner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 40px;
  }
  @media (min-width: 768px) {
    .premium-banner {
      flex-direction: row;
      text-align: left;
      justify-content: space-between;
    }
  }

  /* ── HERO NUMBER ── */
  .hero-number {
    font-variant-numeric: tabular-nums;
    font-feature-settings: 'tnum';
  }

  /* ── TOUCH TARGETS ── */
  @media (max-width: 767px) {
    button, a, [role="button"] {
      min-height: 44px;
      -webkit-tap-highlight-color: transparent;
    }

    
  }
`;

// ─── CUSTOM CURSOR (desktop only) ────────────────────────────────────────────
function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const mouse = { x: useMotionValue(-100), y: useMotionValue(-100) };
  const springConfig = { damping: 20, stiffness: 300, mass: 0.35 };
  const ringX = useSpring(mouse.x, springConfig);
  const ringY = useSpring(mouse.y, springConfig);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 768) return;

    const onMove = (e) => {
      mouse.x.set(e.clientX);
      mouse.y.set(e.clientY);
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top = e.clientY + "px";
      }
    };
    const onOver = (e) => {
      if (
        e.target.closest(
          "button, a, input, select, textarea, [role='button'], .node-card, .feature-card, .stat-card, .tab-btn",
        )
      )
        setIsHovering(true);
    };
    const onOut = (e) => {
      if (
        e.target.closest(
          "button, a, input, select, textarea, [role='button'], .node-card, .feature-card, .stat-card, .tab-btn",
        )
      )
        setIsHovering(false);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="custom-cursor cursor-dot"
        style={{ position: "fixed" }}
      />
      <motion.div
        ref={ringRef}
        className={`custom-cursor cursor-ring ${isHovering ? "active" : ""}`}
        style={{ left: ringX, top: ringY, position: "fixed" }}
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

// ─── LIVE SCORE WIDGET ────────────────────────────────────────────────────────
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
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        width: "100%",
      }}
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", flexShrink: 0 }}>
          <svg width="90" height="90" className="score-ring">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B7240" />
                <stop offset="40%" stopColor="#BFA264" />
                <stop offset="60%" stopColor="#D4AF78" />
                <stop offset="100%" stopColor="#8B7240" />
              </linearGradient>
            </defs>
            <circle cx="45" cy="45" r="40" className="score-ring-track" />
            <circle
              cx="45"
              cy="45"
              r="40"
              className="score-ring-fill"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={circumference * (1 - progress)}
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
                    fontSize: 15,
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
                    fontSize: 14,
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
                fontSize: 7,
                letterSpacing: "0.15em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
              }}
            >
              pts
            </span>
          </div>
        </div>
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
                  padding: "4px 0",
                  borderBottom: "0.5px solid rgba(255,255,255,0.04)",
                  opacity: 1 - i * 0.2,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {ev.label}
                </span>
                <span
                  style={{
                    fontSize: 9,
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
      <div style={{ display: "flex", gap: 6 }}>
        {["Rank #14", "Top 1%", "Streak 47d"].map((tag) => (
          <div
            key={tag}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "5px 2px",
              background: "rgba(191,162,100,0.06)",
              border: "0.5px solid rgba(191,162,100,0.15)",
              fontSize: 7,
              letterSpacing: "0.12em",
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
          padding: "12px 16px",
          borderBottom: "0.5px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.01)",
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
      <div style={{ padding: 16 }}>
        {assets.map((a, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              marginBottom: 5,
              background: "rgba(255,255,255,0.02)",
              border: "0.5px solid rgba(255,255,255,0.05)",
              transition: "all 0.3s",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
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
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 10,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.name}
            </span>
            <span
              style={{
                fontSize: 7,
                padding: "2px 6px",
                letterSpacing: "0.12em",
                color: a.status === "VERIFIED" ? "#4ADE80" : "var(--gold-2)",
                background:
                  a.status === "VERIFIED"
                    ? "rgba(74,222,128,0.08)"
                    : "rgba(191,162,100,0.08)",
                border: `0.5px solid ${a.status === "VERIFIED" ? "rgba(74,222,128,0.2)" : "rgba(191,162,100,0.2)"}`,
                fontFamily: "var(--font-body)",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {a.status}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--gold-2)",
                fontFamily: "var(--font-body)",
                flexShrink: 0,
              }}
            >
              +{a.pts}
            </span>
          </div>
        ))}
        {hashing && (
          <div
            style={{
              padding: "8px 10px",
              marginBottom: 5,
              background: "rgba(191,162,100,0.04)",
              border: "0.5px solid rgba(191,162,100,0.15)",
              fontFamily: "monospace",
              fontSize: 8,
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
              padding: "8px 10px",
              marginBottom: 5,
              background: "rgba(74,222,128,0.05)",
              border: "0.5px solid rgba(74,222,128,0.2)",
            }}
          >
            <span
              style={{
                fontSize: 8,
                color: "#4ADE80",
                fontFamily: "var(--font-body)",
                letterSpacing: "0.12em",
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
            marginTop: 10,
            width: "100%",
            padding: "10px",
            background:
              "linear-gradient(135deg, rgba(139,114,64,0.3), rgba(191,162,100,0.15))",
            border: "0.5px solid rgba(191,162,100,0.3)",
            color: "var(--gold-2)",
            fontSize: 8,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            fontFamily: "var(--font-body)",
            transition: "all 0.3s",
            opacity: hashing ? 0.5 : 1,
            borderRadius: 8,
            minHeight: 44,
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

// ─── LEADERBOARD SKELETON ─────────────────────────────────────────────────────
function LeaderboardSkeleton() {
  return (
    <div
      style={{
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.04)",
            borderRadius: 10,
            opacity: 1 - i * 0.15,
          }}
        >
          <div
            className="skeleton"
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              className="skeleton"
              style={{ height: 12, width: "55%", borderRadius: 4 }}
            />
            <div
              className="skeleton"
              style={{ height: 9, width: "35%", borderRadius: 4 }}
            />
          </div>
          <div
            style={{
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              className="skeleton"
              style={{ height: 16, width: 64, borderRadius: 4 }}
            />
            <div
              className="skeleton"
              style={{
                height: 8,
                width: 40,
                borderRadius: 4,
                alignSelf: "flex-end",
              }}
            />
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <span
          style={{
            fontSize: 9,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Syncing Arena Matrix…
        </span>
      </div>
    </div>
  );
}

// ─── LEADERBOARD PREVIEW (lazy: only fetches when isActive becomes true) ──────
function LeaderboardPreview({ isActive }) {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Guard: only fetch once, only when this tab is actually visible
    if (!isActive || hasFetched.current) return;
    hasFetched.current = true;

    async function fetchTopOperators() {
      setLoading(true);
      setError(null);
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
            streak: data.discotiveScore?.streak || 0,
          };
        });
        setOperators(fetchedOps);
      } catch (err) {
        console.error("[Leaderboard] Fetch failed:", err);
        setError("Could not load rankings.");
      } finally {
        setLoading(false);
      }
    }

    fetchTopOperators();
  }, [isActive]);

  if (!isActive && !hasFetched.current) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <span
          style={{
            color: "var(--text-dim)",
            fontSize: 12,
            fontFamily: "var(--font-body)",
          }}
        >
          Tap to load rankings
        </span>
      </div>
    );
  }

  if (loading) return <LeaderboardSkeleton />;

  if (error) {
    return (
      <div
        style={{
          color: "#F87171",
          fontSize: 10,
          textAlign: "center",
          padding: "40px 0",
          fontFamily: "monospace",
          textTransform: "uppercase",
        }}
      >
        [ERROR] {error}
      </div>
    );
  }

  if (operators.length === 0) {
    return (
      <div
        style={{
          color: "var(--text-dim)",
          fontSize: 12,
          textAlign: "center",
          padding: "40px 0",
        }}
      >
        No operators ranked yet.
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div
      style={{
        padding: "8px 0",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {operators.map((op, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.05)",
            borderRadius: 10,
            transition: "all 0.3s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {medals[i] || `#${op.rank}`}
            </span>
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-primary)",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                }}
              >
                {op.name} {op.country}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginTop: 3,
                }}
              >
                {op.domain}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 16,
                color: "var(--gold-2)",
                fontWeight: 700,
                fontFamily: "var(--font-display)",
              }}
            >
              {op.score.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "#4ADE80",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginTop: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 3,
              }}
            >
              <span
                style={{
                  width: 4,
                  height: 4,
                  background: "#4ADE80",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              Live
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DEM WIDGET ───────────────────────────────────────────────────────────────
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
          width: "100%",
          maxWidth: 320,
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
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
          gap: 16,
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
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
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

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────
function SectionDivider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
      style={{ padding: "28px", borderRadius: 20 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
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
          fontSize: 22,
          fontWeight: 500,
          fontStyle: "italic",
          lineHeight: 1.2,
          marginBottom: 14,
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
          marginBottom: 20,
        }}
      >
        {description}
      </p>
      {metrics.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 20,
            paddingTop: 16,
            borderTop: "0.5px solid var(--border)",
          }}
        >
          {metrics.map((m, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 18,
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
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginTop: 3,
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
        padding: "28px",
        borderRadius: 20,
      }}
    >
      <div
        style={{
          fontSize: 28,
          color: "var(--gold-3)",
          fontFamily: "var(--font-display)",
          lineHeight: 1,
          marginBottom: 14,
          opacity: 0.6,
        }}
      >
        "
      </div>
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.75,
          color: "var(--text-secondary)",
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          marginBottom: 20,
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
              fontSize: 14,
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
        padding: "14px",
        width: 240,
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
          marginBottom: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 7,
              color: "var(--text-dim)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: 3,
              fontFamily: "var(--font-body)",
            }}
          >
            {date}
          </div>
          <div
            style={{
              fontSize: 12,
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
            padding: "2px 7px",
            fontSize: 6,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: cfg.color,
            background: cfg.bg,
            border: `0.5px solid ${cfg.color}40`,
            fontFamily: "var(--font-body)",
            flexShrink: 0,
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
            gap: 7,
            padding: "5px 7px",
            marginBottom: 3,
            background: "rgba(255,255,255,0.02)",
            border: "0.5px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 11,
              height: 11,
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
              fontSize: 9,
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

// ─── INTERACTIVE HEADLINE (3D Parallax Tilt) ─────────────────────────────────
function InteractiveHeadline() {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for the buttery Apple-like rotation
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse coordinates (-0.5 to 0.5) to rotation angles (max 12 degrees)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [12, -12]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-12, 12]);

  // Create a dynamic drop-shadow that moves away from the cursor
  const shadowX = useTransform(mouseXSpring, [-0.5, 0.5], [20, -20]);
  const shadowY = useTransform(mouseYSpring, [-0.5, 0.5], [20, -20]);
  const textShadow = useMotionTemplate`drop-shadow(${shadowX}px ${shadowY}px 25px rgba(191,162,100,0.25))`;

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: 1200, display: "inline-block", zIndex: 10 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          filter: textShadow,
          cursor: "default",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontSize: "clamp(44px, 10vw, 108px)",
            fontWeight: 400,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            marginBottom: 16,
            transform: "translateZ(30px)", // Pops off the screen slightly
          }}
        >
          Build Your
        </h1>
        <h1
          className="gold-text"
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "normal",
            fontSize: "clamp(44px, 10vw, 108px)",
            fontWeight: 800,
            lineHeight: 0.92,
            letterSpacing: "-0.03em",
            marginBottom: 28,
            transform: "translateZ(60px)", // Pops off the screen even more
          }}
        >
          Monopoly.
        </h1>
      </motion.div>
    </div>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function DiscotiveLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 0.97]);
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
        const { getCountFromServer, collection } =
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
      } catch (_) {}
    }
    fetchStats();
  }, []);

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
    const unsub = scrollY.on("change", (v) => setNavVisible(v > 80));
    return unsub;
  }, [scrollY]);

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

  // Tab content rendered separately so LeaderboardPreview only mounts when needed
  const TAB_LABELS = ["Execution Map", "Vault", "Global Arena"];

  // Add this near your other state declarations
  const premiumFeatures = [
    "Infinite Execution Nodes",
    "X-Ray Competitor Analysis",
    "Priority Vault Verification",
    "Daily Execution Journal",
    "Grace AI Pro-Mode",
    "Advanced Network Telemetry",
  ];
  const [premiumIndex, setPremiumIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPremiumIndex((prev) => (prev + 1) % premiumFeatures.length);
    }, 2500); // Cycles every 2.5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--void)",
        overflowX: "hidden",
      }}
    >
      <NoiseBackground />
      <Cursor />

      {/* ─── NAV ─────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000 }}
        className={navVisible ? "nav-blur" : ""}
      >
        <div className="nav-inner">
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src="/logo.png"
              alt="Discotive"
              style={{ height: 26, width: "auto", objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: "var(--text-primary)",
              }}
            >
              DISCOTIVE
            </span>
          </div>

          {/* Center Nav (desktop only) */}
          <div
            className="hide-on-mobile"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              alignItems: "center",
              gap: 40,
            }}
          >
            {[
              { name: "Features", route: "/about#features" },
              { name: "Connective", route: "/connective" },
              { name: "Pricing", route: "/about#premium" },
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

          {/* CTA */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn-outline hide-on-mobile"
              style={{ padding: "8px 20px", fontSize: 10 }}
              onClick={() => navigate("/auth", { state: { isLogin: true } })}
            >
              Sign In
            </button>
            <button
              className="btn-primary"
              style={{
                padding: "9px 20px",
                fontSize: 10,
                whiteSpace: "nowrap",
              }}
              onClick={() => navigate("/auth", { state: { isLogin: false } })}
            >
              <span className="hide-on-mobile" style={{ display: "inline" }}>
                Initialize Protocol
              </span>
              <span className="hide-on-desktop" style={{ display: "inline" }}>
                Boot OS
              </span>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <motion.section style={{ opacity: heroOpacity, scale: heroScale }}>
        <div
          className="hero-padding"
          style={{
            minHeight: "100svh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Architectural lines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
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
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -55%)",
                width: 600,
                height: 600,
                background:
                  "radial-gradient(ellipse, rgba(139,114,64,0.08) 0%, rgba(191,162,100,0.04) 40%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Content */}
          <div
            style={{
              textAlign: "center",
              maxWidth: 900,
              position: "relative",
              zIndex: 1,
              width: "100%",
            }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 32,
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

            {/* Headline - Replaced with Interactive 3D Component */}
            <InteractiveHeadline />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.7 }}
              style={{
                fontSize: "clamp(14px, 1.6vw, 17px)",
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                maxWidth: 560,
                margin: "0 auto 40px",
                fontWeight: 300,
              }}
            >
              The operating system for the next generation of builders. Map your
              trajectory. Verify your execution. Dominate the global
              leaderboard.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.85 }}
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap",
                marginBottom: 56,
              }}
            >
              <button
                className="btn-primary"
                style={{ fontSize: 11 }}
                onClick={() => navigate("/auth", { state: { isLogin: false } })}
              >
                Initialize Your OS <span style={{ opacity: 0.7 }}>→</span>
              </button>
              <button className="btn-outline" style={{ fontSize: 11 }}>
                Watch the Brief
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="grid-stats"
              style={{ maxWidth: 600, margin: "0 auto" }}
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
                      fontSize: "clamp(22px, 4vw, 32px)",
                      fontWeight: 500,
                      color: "var(--gold-2)",
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                    className="hero-number"
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
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
              bottom: 32,
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
                height: 28,
                background:
                  "linear-gradient(180deg, var(--gold-3), transparent)",
              }}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ─── MARQUEE ──────────────────────────────────────────────────────── */}
      <div
        style={{
          overflow: "hidden",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
          padding: "18px 0",
          background: "rgba(255,255,255,0.008)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="ticker-track" style={{ display: "flex" }}>
            {[...collegeNames, ...collegeNames].map((name, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                  whiteSpace: "nowrap",
                  minWidth: "max-content",
                }}
              >
                {name}{" "}
                <span style={{ color: "var(--gold-3)", margin: "0 16px" }}>
                  ✦
                </span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 12, overflow: "hidden" }}>
          <div
            className="ticker-track ticker-track-slow"
            style={{ display: "flex" }}
          >
            {[...careerTargets, ...careerTargets].map((name, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
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
                    margin: "0 16px",
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

      {/* ─── MANIFESTO ────────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto" }}
        className="section-py section-px"
      >
        <SectionDivider label="The Problem · The Solution" />
        <div className="manifesto-grid">
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
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{ width: 20, height: 0.5, background: "var(--gold-3)" }}
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
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 400,
                fontStyle: "italic",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                marginBottom: 20,
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
                marginBottom: 16,
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
                gap: 14,
                marginBottom: 24,
              }}
            >
              <div
                style={{ width: 20, height: 0.5, background: "var(--gold-1)" }}
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
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 700,
                fontStyle: "italic",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: 20,
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
                marginBottom: 16,
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

      {/* ─── LIVE OS DEMO ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 120px",
          background: "rgba(255,255,255,0.008)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto" }}
          className="section-px"
        >
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionDivider label="Live OS Interface" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                marginTop: 32,
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
          <div className="tabs-row" style={{ justifyContent: "flex-start" }}>
            {TAB_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className="tab-btn"
                style={{
                  borderColor:
                    activeTab === i
                      ? "rgba(191,162,100,0.4)"
                      : "rgba(255,255,255,0.06)",
                  background:
                    activeTab === i ? "rgba(191,162,100,0.08)" : "transparent",
                  color: activeTab === i ? "var(--gold-2)" : "var(--text-dim)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              style={{
                background: "rgba(8,8,8,0.98)",
                border: "0.5px solid rgba(191,162,100,0.2)",
                borderRadius: "0 4px 4px 4px",
                padding: "24px",
                overflowX: "auto",
              }}
            >
              {activeTab === 0 && (
                <div
                  style={{
                    width: "100%",
                    height: "240px",
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
                    <Controls
                      showInteractive={false}
                      style={{ display: "none" }}
                    />
                  </ReactFlow>
                </div>
              )}
              {activeTab === 1 && <VaultDemo />}
              {activeTab === 2 && (
                <LeaderboardPreview isActive={activeTab === 2} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Score + Engine */}
          <div className="score-demo-layout">
            <div style={{ flexShrink: 0, width: "100%", maxWidth: 320 }}>
              <LiveScoreWidget />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  background: "rgba(8,8,8,0.98)",
                  border: "0.5px solid rgba(255,255,255,0.06)",
                  borderRadius: 2,
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.25em",
                    textTransform: "uppercase",
                    color: "var(--gold-3)",
                    fontFamily: "var(--font-body)",
                    marginBottom: 16,
                  }}
                >
                  The Score Engine — What Moves the Needle
                </div>
                <div className="score-engine-grid">
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
                    { event: "Vault Verified", pts: "Variable", type: "Proof" },
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
                        padding: "9px 12px",
                        background: "rgba(255,255,255,0.02)",
                        border: "0.5px solid rgba(255,255,255,0.04)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: 6,
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
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: "var(--font-body)",
                          color:
                            item.pts === "Penalty"
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

      {/* ─── FEATURES GRID ────────────────────────────────────────────────── */}
      <section
        id="features"
        style={{ maxWidth: 1200, margin: "0 auto" }}
        className="section-py section-px"
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionDivider label="Core Modules" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{ marginTop: 32 }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 52px)",
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
        <div className="feature-grid">
          {[
            {
              number: 1,
              title: "Execution Roadmap",
              subtitle: "Neural DAG",
              description:
                "An AI-generated Directed Acyclic Graph that maps your career trajectory. Every node is a verifiable task. Dependencies unlock sequentially. Built on Kahn's topological algorithm at O(V+E).",
              metrics: [
                { value: "∞", label: "Node depth" },
                { value: "<50ms", label: "Evaluation" },
              ],
            },
            {
              number: 2,
              title: "Discotive Score Engine",
              subtitle: "Atomic Ledger",
              description:
                "10+ atomic score events tracked via Firestore transactions. Streaks, task completions, vault verifications, alliance formations. Every action has mathematical weight.",
              metrics: [
                { value: "10+", label: "Score events" },
                { value: "Real-time", label: "Mutations" },
              ],
            },
            {
              number: 3,
              title: "Asset Vault",
              subtitle: "Zero-Trust Storage",
              description:
                "SHA-256 cryptographic hashing for every uploaded credential. Admin verification pipeline. Weak/Medium/Strong strength ratings. Your proof of work, immutably stored.",
              metrics: [
                { value: "SHA-256", label: "Encryption" },
                { value: "25MB", label: "Per asset" },
              ],
            },
            {
              number: 4,
              title: "Global Arena",
              subtitle: "Live Leaderboard",
              description:
                "Cursor-paginated leaderboard with multi-dimensional filtering by domain, niche, country, and level. Precomputed nightly percentiles for zero-read-cost rank display.",
              metrics: [
                { value: "180+", label: "Countries" },
                { value: "Top 1%", label: "Threshold" },
              ],
            },
            {
              number: 5,
              title: "Grace AI",
              subtitle: "AI Assistant",
              description:
                "Embedded career assistant powered by AI. Structured flow for common queries, free-form chat for everything else. Zero idle cost — fires only on demand.",
              metrics: [
                { value: "2.5", label: "Model" },
                { value: "<1s", label: "Response" },
              ],
            },
            {
              number: 6,
              title: "Neural Engine",
              subtitle: "Pure Functional",
              description:
                "A pure functional DAG compiler using Kahn's topological sort. O(V+E) state evaluation. Ghost states, backoff penalties, and time-lock mechanics computed client-side.",
              metrics: [
                { value: "O(V+E)", label: "Complexity" },
                { value: "0 RPC", label: "Per render" },
              ],
            },
          ].map((card, i) => (
            <FeatureCard key={i} {...card} delay={i * 0.05} />
          ))}
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 120px",
          background: "rgba(255,255,255,0.006)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }} className="section-px">
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionDivider label="Versus The Market" />
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 5vw, 48px)",
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                marginTop: 32,
                color: "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              Every alternative is a<br />
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
            <div className="compare-table">
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "0.5px solid rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  className="compare-grid"
                  style={{ padding: 0, borderBottom: "none" }}
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
              </div>
              <div style={{ padding: "0 20px" }}>
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
                  <div key={i} className="compare-grid">
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
                          }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.15)",
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {us ? (
                        <span style={{ fontSize: 12, color: "var(--gold-2)" }}>
                          ✦
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "rgba(255,255,255,0.15)",
                          }}
                        >
                          —
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── DEM INDEX ────────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", paddingTop: 80 }}
        className="section-px"
      >
        <SectionDivider label="Platform DEM Index" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{
            marginTop: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 5vw, 48px)",
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
              fontSize: 13,
              color: "var(--text-dim)",
              textAlign: "center",
              marginBottom: 36,
              fontFamily: "var(--font-body)",
              maxWidth: 440,
              lineHeight: 1.7,
            }}
          >
            The Discotive Efficiency Meter (DEM) aggregates real operator
            feedback. No cherry-picking.
          </p>
          <LandingDEMWidget />
        </motion.div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto" }}
        className="section-py section-px"
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <SectionDivider label="Operator Testimonials" />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              marginTop: 32,
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
        <div className="grid-3col">
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

      {/* ─── PREMIUM BANNER ────────────────────────────────────────────────── */}
      <section
        id="premium"
        style={{
          padding: "80px 0 120px",
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <div
          style={{ maxWidth: 1000, margin: "0 auto" }}
          className="section-px"
        >
          <SectionDivider label="Clearance Upgrade" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="premium-banner glow-card"
            style={{
              marginTop: 52,
              background:
                "linear-gradient(135deg, rgba(10,10,10,0.95) 0%, rgba(191,162,100,0.06) 50%, rgba(10,10,10,0.95) 100%)",
              border: "0.5px solid rgba(191,162,100,0.3)",
              borderRadius: 16,
              padding: "48px 40px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Left: Text & Animated Features */}
            <div style={{ flex: 1, minWidth: 260 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-3)",
                  fontFamily: "var(--font-body)",
                  marginBottom: 16,
                }}
              >
                Unlock Discotive Pro
              </div>
              <div style={{ height: 40, position: "relative" }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={premiumIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      position: "absolute",
                      width: "100%",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(20px, 4vw, 28px)",
                      fontWeight: 400,
                      fontStyle: "italic",
                      color: "var(--text-primary)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {premiumFeatures[premiumIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Center: Premium Visual Matrix */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
                minWidth: 150,
              }}
            >
              <div style={{ position: "relative", width: 70, height: 70 }}>
                {/* Outer Dashed Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    border: "1px dashed var(--gold-3)",
                    borderRadius: "50%",
                    opacity: 0.5,
                  }}
                />
                {/* Inner Pulsing Ring */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{
                    position: "absolute",
                    inset: 12,
                    border: "1.5px solid var(--gold-1)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(191,162,100,0.1)",
                    boxShadow: "0 0 20px rgba(191,162,100,0.2)",
                  }}
                >
                  <span style={{ fontSize: 18, color: "var(--gold-2)" }}>
                    ✦
                  </span>
                </motion.div>
              </div>
            </div>

            {/* Right: CTA Button */}
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center", // Centered on mobile
                minWidth: 200,
              }}
              // Inline override for desktop right-alignment
              ref={(el) => {
                if (el && window.innerWidth >= 768) {
                  el.style.justifyContent = "flex-end";
                }
              }}
            >
              <button
                className="btn-primary"
                onClick={() => navigate("/premium")}
                style={{
                  padding: "16px 36px",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                }}
              >
                Explore Premium
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── NUMBERS ──────────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 0 120px",
          background: "rgba(255,255,255,0.006)",
          borderTop: "0.5px solid var(--border)",
          borderBottom: "0.5px solid var(--border)",
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto" }}
          className="section-px"
        >
          <SectionDivider label="Infrastructure at Scale" />
          <div className="grid-numbers" style={{ marginTop: 52 }}>
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
                  padding: "28px 20px",
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(32px, 5vw, 44px)",
                    fontWeight: 600,
                    color: "var(--gold-2)",
                    lineHeight: 1,
                    marginBottom: 8,
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
                    marginBottom: 5,
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  {stat.sub}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ───────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto" }}
        className="section-py section-px"
      >
        <SectionDivider label="Built For Scale" />
        <div className="tech-grid" style={{ marginTop: 52 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                fontStyle: "italic",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: "var(--text-primary)",
                marginBottom: 18,
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
                fontSize: 13,
                lineHeight: 1.9,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
                marginBottom: 20,
              }}
            >
              Every architectural decision was made to scale to millions of
              operators without architectural debt. Pure functional DAG
              evaluation. Zero-trust credential storage. Atomic Firestore
              transactions.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                    padding: "5px 12px",
                    background: "rgba(255,255,255,0.02)",
                    border: "0.5px solid rgba(255,255,255,0.08)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: "var(--text-dim)",
                    fontFamily: "var(--font-body)",
                    textTransform: "uppercase",
                    borderRadius: 4,
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
                  padding: "10px 14px",
                  borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                  fontSize: 8,
                  color: "var(--text-dim)",
                  letterSpacing: "0.12em",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", gap: 4 }}>
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
              <div
                style={{
                  padding: "18px",
                  fontSize: 11,
                  lineHeight: 1.8,
                  overflowX: "auto",
                }}
              >
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
                  <div
                    key={i}
                    style={{ color: line.color, whiteSpace: "nowrap" }}
                  >
                    {line.code}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section
        style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 80 }}
        className="section-px"
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
            borderRadius: 4,
            padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 60px)",
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
            className="badge"
            style={{ marginBottom: 28, display: "inline-flex" }}
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
              fontSize: "clamp(36px, 6vw, 56px)",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "var(--text-primary)",
              marginBottom: 18,
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
              fontSize: "clamp(14px, 2vw, 16px)",
              lineHeight: 1.7,
              color: "var(--text-secondary)",
              fontFamily: "var(--font-body)",
              maxWidth: 480,
              margin: "0 auto 40px",
            }}
          >
            Join 12,000+ operators who replaced their resume with cryptographic
            proof of work. Your career DAG is waiting.
          </p>
          <button
            onClick={() => navigate("/auth", { state: { isLogin: false } })}
            className="btn-primary"
            style={{ padding: "16px 40px", fontSize: "12px" }}
          >
            Get Started →
          </button>
        </motion.div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "0.5px solid var(--border)",
          padding: "52px 0 32px",
        }}
      >
        <div
          style={{ maxWidth: 1200, margin: "0 auto" }}
          className="section-px"
        >
          <div className="grid-4col" style={{ marginBottom: 48 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <img
                  src="/logo.png"
                  alt="Discotive"
                  style={{ height: 22, width: "auto", objectFit: "contain" }}
                />
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  DISCOTIVE
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.7,
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                  maxWidth: 260,
                }}
              >
                The execution protocol for elite operators. Replace your resume.
                Build your monopoly.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 18,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {[
                  {
                    name: "Instagram",
                    url: "https://instagram.com/discotive",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="currentColor"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ),
                  },
                  {
                    name: "LinkedIn",
                    url: "https://linkedin.com/company/discotive",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="currentColor"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    ),
                  },
                  {
                    name: "YouTube",
                    url: "https://youtube.com/@discotive",
                    icon: (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="currentColor"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.015 3.015 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ),
                  },
                ].map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-dim)",
                      transition: "color 0.3s, transform 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--gold-2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-dim)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {social.icon}
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
                  { label: "Pricing", href: "#premium" },
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
                    marginBottom: 16,
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
                      fontSize: 12,
                      color: "var(--text-dim)",
                      textDecoration: "none",
                      marginBottom: 9,
                      fontFamily: "var(--font-body)",
                      transition: "color 0.3s",
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
          <div className="divider-gold" style={{ marginBottom: 24 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
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
