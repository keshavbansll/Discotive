// src/pages/Auth/index.jsx
// Complete rebuild — 8-step Discotive Onboarding Engine
// Requires: npm install zustand framer-motion (already in project)

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { httpsCallable } from "firebase/functions";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { auth, db, functions } from "../../firebase";
import { createPortal } from "react-dom";
import { awardOnboardingComplete } from "../../lib/scoreEngine";
import { useOnboardingStore } from "../../stores/useOnboardingStore";

// ─────────────────────────────────────────────────────────────────────────────
// DATA STORES
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_MAIN = [
  {
    value: "Engineering & Tech",
    label: "Engineering",
    img: "/onboarding/engineering.png",
  },
  {
    value: "Design & Creative",
    label: "Design",
    img: "/onboarding/design.png",
  },
  {
    value: "Business / Operations",
    label: "Business",
    img: "/onboarding/business.png",
  },
  { value: "Marketing", label: "Marketing", img: "/onboarding/marketing.png" },
  {
    value: "Finance & Accounting",
    label: "Finance",
    img: "/onboarding/finance.png",
  },
  {
    value: "Content Creation",
    label: "Content",
    img: "/onboarding/content.png",
  },
  {
    value: "Healthcare",
    label: "Healthcare",
    img: "/onboarding/healthcare.png",
  },
];

const DOMAIN_MORE = [
  {
    value: "Product Management",
    label: "Product",
    img: "/onboarding/product.png",
  },
  { value: "Data & Analytics", label: "Data", img: "/onboarding/data.png" },
  { value: "Sales", label: "Sales", img: "/onboarding/sales.png" },
  { value: "Legal & Policy", label: "Legal", img: "/onboarding/legal.png" },
  { value: "Human Resources", label: "HR", img: "/onboarding/hr.png" },
  { value: "Education", label: "Education", img: "/onboarding/education.png" },
  {
    value: "Real Estate",
    label: "Real Estate",
    img: "/onboarding/realestate.png",
  },
  { value: "Other", label: "Other", img: "/onboarding/other.png" },
];

const BASELINE_OPTIONS = [
  { value: "Student", label: "Student", img: "/onboarding/student.png" },
  {
    value: "Working Professional",
    label: "Professional",
    img: "/onboarding/professional.png",
  },
  {
    value: "Freelancer",
    label: "Freelancer",
    img: "/onboarding/freelancer.png",
  },
  {
    value: "Entrepreneur",
    label: "Entrepreneur",
    img: "/onboarding/entrepreneur.png",
  },
  { value: "Creator", label: "Creator", img: "/onboarding/creator.png" },
  { value: "Other", label: "Other", img: "/onboarding/other.png" },
  { value: "None", label: "None", img: "/onboarding/none.png" },
];

const MOTIVATION_CARDS = [
  { id: "Internship", label: "Internship", img: "/onboarding/internship.png" },
  { id: "Startup", label: "Startup", img: "/onboarding/startup.png" },
  { id: "Placement", label: "Placement", img: "/onboarding/placement.png" },
  { id: "Freelancing", label: "Freelancing", img: "/onboarding/freelance.png" },
  {
    id: "Personal Branding",
    label: "Personal Branding",
    img: "/onboarding/branding.png",
  },
  {
    id: "Skill Improvement",
    label: "Skill Improvement",
    img: "/onboarding/skills.png",
  },
  { id: "Other", label: "Other", img: "/onboarding/other.png" },
];

const QUOTES = [
  { text: "Everything's got a price.", author: "John Wick" },
  { text: "We can't win if we don't try.", author: "Sonny Hayes" },
  { text: "The future is real. The past is all made up.", author: "Logan Roy" },
  {
    text: "I want you to deal with your problems by becoming rich!",
    author: "Jordan Belfort",
  },
  { text: "It's all a Fugazzi.", author: "Mark Hanna" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSS — injected globally at mount
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Poppins:wght@300;400;500;600;700&display=swap');

.ob-root {
  --void: #030303;
  --depth: #0a0a0a;
  --surface: #111111;
  --elevated: #161616;
  --border: rgba(255,255,255,0.07);
  --border-gold: rgba(191,162,100,0.28);
  --gold-1: #BFA264;
  --gold-2: #D4AF78;
  --gold-3: #8B7240;
  --gold-4: #E8D5A3;
  --gold-dim: rgba(191,162,100,0.08);
  --text-primary: #F5F0E8;
  --text-secondary: rgba(245,240,232,0.6);
  --text-dim: rgba(245,240,232,0.28);
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Poppins', sans-serif;
  --r: 18px;
  --r-sm: 12px;
}

/* Strictly scoped reset to prevent main dashboard layout destruction */
.ob-root, .ob-root * { box-sizing: border-box; }
.ob-root p, .ob-root h1, .ob-root h2, .ob-root h3, .ob-root div, .ob-root span, .ob-root button, .ob-root input { margin: 0; padding: 0; }

.ob-root {
  min-height: 100svh;
  background: var(--void);
  color: var(--text-primary);
  font-family: var(--font-body);
  display: flex;
  position: relative;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.ob-mobile-only-logo { display: block; height: 22px; opacity: 0.9; }
@media (min-width: 900px) { .ob-mobile-only-logo { display: none; } }

/* LEFT PANEL */
.ob-left {
  display: none;
  width: 42%;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background: var(--depth);
  border-right: 0.5px solid rgba(255,255,255,0.04);
  flex-direction: column;
  box-shadow: 20px 0 60px rgba(0,0,0,0.5);
  z-index: 10;
}
@media (min-width: 900px) { .ob-left { display: flex; } }

/* RIGHT PANEL */
.ob-right {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  padding: 24px 20px;
  background: radial-gradient(circle at 50% -20%, rgba(191,162,100,0.07) 0%, var(--void) 65%), var(--void);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}
@media (min-width: 640px) { .ob-right { padding: 40px 32px; } }
.ob-right::-webkit-scrollbar { width: 4px; }
.ob-right::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

.ob-form-wrap {
  width: 100%;
  max-width: 440px;
  padding: 28px 0 80px;
}

 /* INPUTS */
.ob-input-group {
  position: relative;
  width: 100%;
}
.ob-input {
  width: 100%;
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--r-sm);
  padding: 28px 16px 8px 16px;
  height: 64px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  -webkit-appearance: none;
}
.ob-input::placeholder { color: transparent; }
.ob-input:focus {
  border-color: rgba(191,162,100,0.5);
  background: var(--elevated);
  box-shadow: 0 0 0 3px rgba(191,162,100,0.06);
}

.ob-floating-label {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-dim);
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.23, 1, 0.32, 1);
  font-family: var(--font-body);
}
.ob-input:focus ~ .ob-floating-label,
.ob-input:not(:placeholder-shown) ~ .ob-floating-label {
  top: 16px;
  transform: translateY(0);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold-2);
}

/* BUTTONS */
.ob-btn-primary {
  width: 100%;
  padding: 15px 24px;
  background: linear-gradient(135deg, #8B7240 0%, #BFA264 40%, #D4AF78 60%, #BFA264 80%, #6B5530 100%);
  color: #0a0a0a;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  border: none;
  border-radius: var(--r-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
}
.ob-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 12px 32px rgba(191,162,100,0.22);
}
.ob-btn-primary:active:not(:disabled) { transform: scale(0.98); }
.ob-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.ob-btn-ghost {
  background: transparent;
  border: 0.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.2s, border-color 0.2s;
}
.ob-btn-ghost:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }

.ob-oauth-btn {
  width: 100%;
  padding: 14px 20px;
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s, border-color 0.2s;
}
.ob-oauth-btn:hover:not(:disabled) { background: var(--elevated); border-color: rgba(255,255,255,0.14); }
.ob-oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* PROGRESS BAR */
.ob-progress {
  display: flex;
  gap: 5px;
  margin-bottom: 32px;
}
.ob-progress-seg {
  height: 3px;
  border-radius: 2px;
  flex: 1;
  background: var(--border);
  transition: background 0.4s;
}
.ob-progress-seg[data-done="true"] { background: rgba(191,162,100,0.4); }
.ob-progress-seg[data-active="true"] { background: var(--gold-2); }

/* DIVIDER */
.ob-divider {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 18px 0;
}
.ob-divider-line { flex: 1; height: 0.5px; background: var(--border); }
.ob-divider span {
  font-size: 10px; font-weight: 700; color: var(--text-dim);
  letter-spacing: 0.2em; font-family: var(--font-body);
}

/* ERROR */
.ob-error {
  padding: 12px 16px;
  background: rgba(239,68,68,0.08);
  border: 0.5px solid rgba(239,68,68,0.2);
  border-radius: var(--r-sm);
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #F87171;
  font-family: var(--font-body);
  margin-bottom: 20px;
}

/* PASSWORD STRENGTH */
.pw-bar { height: 3px; border-radius: 2px; transition: background 0.3s; background: var(--elevated); }

/* STATUS CARD */
.ob-status-card {
  padding: 16px 14px;
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  transition: all 0.15s;
  text-align: center;
  min-height: 80px;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.ob-status-card[data-active="true"] {
  background: rgba(191,162,100,0.1);
  border-color: rgba(191,162,100,0.5);
}

/* DOMAIN CARD */
.ob-domain-card {
  padding: 14px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.15s;
  text-align: center;
  border: 1px solid transparent;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

/* WHY-HERE TAG */
.ob-tag {
  padding: 9px 14px;
  border-radius: 99px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-body);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  white-space: nowrap;
}
.ob-tag[data-active="true"] {
  background: rgba(191,162,100,0.1);
  border-color: rgba(191,162,100,0.45);
  color: var(--gold-2);
}

/* SEED CARD */
.ob-seed-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.ob-seed-card[data-active="true"] {
  background: rgba(191,162,100,0.06);
  border-color: rgba(191,162,100,0.3);
}

/* CONNECTOR INPUT */
.ob-connector {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--r-sm);
  transition: border-color 0.2s;
}
.ob-connector:focus-within {
  border-color: rgba(191,162,100,0.4);
}
.ob-connector input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 13px;
  flex: 1;
}
.ob-connector input::placeholder { color: var(--text-dim); }

/* OTP */
.ob-otp {
  width: 48px; height: 56px;
  text-align: center;
  font-size: 22px; font-weight: 800;
  font-family: var(--font-display);
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--r-sm);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  caret-color: var(--gold-2);
}
.ob-otp:focus {
  border-color: rgba(191,162,100,0.6);
  box-shadow: 0 0 0 3px rgba(191,162,100,0.08);
}
.ob-otp[data-filled="true"] { border-color: rgba(191,162,100,0.4); color: var(--gold-2); }

/* GRAIN OVERLAY */
.ob-grain {
  position: absolute; inset: -50%;
  width: 200%; height: 200%;
  opacity: 0.015;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  pointer-events: none;
}

/* ANIMATIONS */
@keyframes ob-spin { to { transform: rotate(360deg); } }
@keyframes ob-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes ob-count { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform:translateY(0); } }

/* SCORE POP */
.score-pop {
  animation: ob-count 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

/* MOBILE BOTTOM SAFE AREA */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .ob-form-wrap { padding-bottom: calc(80px + env(safe-area-inset-bottom)); }
}

/* NAV PC/MOBILE LOGIC */
.nav-mobile {
  position: absolute; top: 24px; left: 20px; z-index: 50;
  display: flex; align-items: center; gap: 16px;
}
@media (min-width: 640px) {
  .nav-mobile { top: 28px; left: 28px; }
}
@media (min-width: 900px) {
  .nav-mobile { display: none; }
}

.logo-pc {
  display: none;
}
@media (min-width: 900px) {
  .logo-pc {
    display: flex;
    justify-content: center;
    margin-bottom: 32px;
  }
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width={18} height={18} style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Spinner = ({ size = 16, color = "var(--gold-2)" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: "ob-spin 0.8s linear infinite", flexShrink: 0 }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
      strokeOpacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CheckIcon = ({ size = 16, color = "#22C55E" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ size = 16, color = "#F87171" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronRight = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ErrorBox = ({ msg }) => {
  if (!msg) return null;
  return (
    <div className="ob-error">
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#F87171"
        strokeWidth="2"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  );
};

const ProgressBar = ({ current, total = 8 }) => (
  <div className="ob-progress">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="ob-progress-seg"
        data-done={i + 1 < current ? "true" : "false"}
        data-active={i + 1 === current ? "true" : "false"}
      />
    ))}
  </div>
);

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function LeftPanel({ stepIndex, onBack }) {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [vis, setVis] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setVis(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % QUOTES.length);
        setVis(true);
      }, 400);
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  const STEP_LABELS = [
    "Gateway",
    "Auth",
    "Identity",
    "Baseline",
    "Intent",
    "Motivation",
    "Premium",
    "Launch",
  ];

  return (
    <div className="ob-left">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(191,162,100,0.07) 0%, transparent 65%), radial-gradient(ellipse at 70% 80%, rgba(139,114,64,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div className="ob-grain" />
      {[0.2, 0.5, 0.8].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${p * 100}%`,
            width: "0.5px",
            background:
              "linear-gradient(180deg, transparent, rgba(191,162,100,0.06) 30%, rgba(191,162,100,0.06) 70%, transparent)",
            pointerEvents: "none",
          }}
        />
      ))}

      <div style={{ padding: "32px 40px", position: "relative", zIndex: 1 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-primary)",
            opacity: 0.8,
            transition: "opacity 0.2s",
            padding: 0,
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
          onMouseOut={(e) => (e.currentTarget.style.opacity = 0.8)}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ position: "relative", width: 240, height: 240 }}>
          {[
            { inset: 0, duration: 40 },
            { inset: 40, duration: 25, reverse: true },
            { inset: 80, duration: 15 },
          ].map((ring, i) => (
            <motion.div
              key={i}
              animate={{ rotate: ring.reverse ? -360 : 360 }}
              transition={{
                duration: ring.duration,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                position: "absolute",
                inset: ring.inset,
                borderRadius: "50%",
                border:
                  i === 0
                    ? "0.5px solid rgba(191,162,100,0.12)"
                    : i === 1
                      ? "0.5px solid rgba(191,162,100,0.22)"
                      : "0.5px solid rgba(191,162,100,0.3)",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--gold-2)",
                boxShadow: "0 0 16px var(--gold-2)",
              }}
            />
          </div>
          {stepIndex > 0 && (
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: "50%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(191,162,100,0.08)",
                  border: "0.5px solid var(--border-gold)",
                  borderRadius: 99,
                  padding: "3px 12px",
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  color: "var(--gold-2)",
                  fontFamily: "var(--font-body)",
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {STEP_LABELS[stepIndex] || "Setup"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "0 40px 48px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            height: "0.5px",
            background:
              "linear-gradient(90deg, transparent, var(--border-gold), transparent)",
            marginBottom: 24,
          }}
        />
        <AnimatePresence mode="wait">
          {vis && (
            <motion.div
              key={quoteIdx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
            >
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                  marginBottom: 10,
                }}
              >
                "{QUOTES[quoteIdx].text}"
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "var(--gold-3)",
                }}
              >
                — {QUOTES[quoteIdx].author}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP HEADER
// ─────────────────────────────────────────────────────────────────────────────
function StepHeader({ step, total = 8, title }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <ProgressBar current={step} total={total} />
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(26px, 5vw, 33px)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

const STEP_VARIANTS = {
  initial: { opacity: 0, y: 15, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 30, mass: 0.8 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.2 },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1A — LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function StepLogin({ onSubmit, onOAuth, onSwitch, loading, error }) {
  const store = useOnboardingStore();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(28px, 6vw, 36px)",
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Welcome back.
        </h2>
      </div>

      <ErrorBox msg={error} />

      <button
        type="button"
        className="ob-oauth-btn"
        onClick={onOAuth}
        disabled={loading}
        style={{ marginBottom: 20 }}
      >
        {loading ? <Spinner /> : <GoogleIcon />}
        Sign in with Google
      </button>

      <div className="ob-divider">
        <div className="ob-divider-line" />
        <span>or</span>
        <div className="ob-divider-line" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(store.email, password);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div className="ob-input-group">
          <input
            className="ob-input"
            type="email"
            value={store.email}
            onChange={(e) => store.setField("email", e.target.value)}
            placeholder=" "
            required
          />
          <label className="ob-floating-label">Email address</label>
        </div>

        <div className="ob-input-group">
          <input
            className="ob-input"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            required
            style={{ paddingRight: 48 }}
          />
          <label className="ob-floating-label">Password</label>
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-dim)",
              padding: 0,
            }}
          >
            {showPw ? (
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
              </svg>
            ) : (
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <button
          type="submit"
          className="ob-btn-primary"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? <Spinner size={14} color="#0a0a0a" /> : "Sign In"}
          {!loading && <ChevronRight />}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Don't have an account?{" "}
          <button
            onClick={onSwitch}
            style={{
              background: "none",
              border: "none",
              color: "var(--gold-2)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              padding: 0,
            }}
          >
            Sign up
          </button>
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1B — SIGN UP AUTH (new user)
// ─────────────────────────────────────────────────────────────────────────────
function StepAuth({ onSubmit, onOAuth, onSwitch, loading, error }) {
  const store = useOnboardingStore();
  const { setField } = store;
  const [showPw, setShowPw] = useState(false);
  const pwColors = ["#EF4444", "#EF4444", "#F59E0B", "#22C55E", "#22C55E"];

  const pwScore = (() => {
    const p = store.password;
    let s = 0;
    if (p.length > 7) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <StepHeader
        step={1}
        overline="Step 1 of 8"
        title="Create identity."
        subtitle="Who are you? This is the foundation."
      />

      <ErrorBox msg={error} />

      <button
        type="button"
        className="ob-oauth-btn"
        onClick={onOAuth}
        disabled={loading}
        style={{ marginBottom: 20 }}
      >
        {loading ? <Spinner /> : <GoogleIcon />}
        Sign up with Google
      </button>

      <div className="ob-divider">
        <div className="ob-divider-line" />
        <span>or</span>
        <div className="ob-divider-line" />
      </div>

      <form
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div className="ob-input-group">
            <input
              className="ob-input"
              type="text"
              value={store.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder=" "
              required
              maxLength={50}
            />
            <label className="ob-floating-label">First name</label>
          </div>
          <div className="ob-input-group">
            <input
              className="ob-input"
              type="text"
              value={store.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder=" "
              required
              maxLength={50}
            />
            <label className="ob-floating-label">Last name</label>
          </div>
        </div>

        <div className="ob-input-group">
          <input
            className="ob-input"
            type="email"
            value={store.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder=" "
            required
            maxLength={120}
          />
          <label className="ob-floating-label">Email address</label>
        </div>

        <div>
          <div className="ob-input-group">
            <input
              className="ob-input"
              type={showPw ? "text" : "password"}
              value={store.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder=" "
              required
              minLength={8}
              style={{ paddingRight: 48 }}
            />
            <label className="ob-floating-label">Password</label>
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-dim)",
                padding: 0,
              }}
            >
              {showPw ? (
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                </svg>
              ) : (
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className="pw-bar"
                style={{
                  flex: 1,
                  background:
                    store.password.length > 0 && pwScore >= l
                      ? pwColors[pwScore]
                      : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="ob-btn-primary"
          disabled={loading}
          style={{ marginTop: 4 }}
        >
          {loading ? <Spinner size={14} color="#0a0a0a" /> : "Continue"}{" "}
          {!loading && <ChevronRight />}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Already an operator?{" "}
          <button
            type="button"
            onClick={onSwitch}
            style={{
              background: "none",
              border: "none",
              color: "var(--gold-2)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              padding: 0,
            }}
          >
            Log in
          </button>
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1.5 — EMAIL OTP VERIFY
// ─────────────────────────────────────────────────────────────────────────────
function StepVerifyEmail({ email, firstName, onVerified, onBack }) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const verify = async (code) => {
    setVerifying(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "verifyEmailOTP");
      await fn({ otp: code, email });
      setSuccess(true);
      setTimeout(() => onVerified(), 1400);
    } catch (err) {
      setError(err.message || "Incorrect code. Try again.");
      setOtp(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    setError("");
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every((d) => d) && i === 5) verify(next.join(""));
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      const arr = pasted.split("");
      setOtp(arr);
      refs.current[5]?.focus();
      verify(pasted);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "sendVerificationEmail");
      await fn({ email, firstName });
      setCooldown(60);
    } catch {
      setError("Couldn't resend. Try again shortly.");
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "40px 0",
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.08)",
            border: "0.5px solid rgba(34,197,94,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg
            width={36}
            height={36}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22C55E"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </motion.div>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 24,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Identity confirmed.
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          Booting your OS…
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(26px, 5vw, 32px)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          Check your inbox.
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            lineHeight: 1.65,
          }}
        >
          6-digit code sent to{" "}
          <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
        </p>
      </div>

      <ErrorBox msg={error} />

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "center",
          marginBottom: 28,
        }}
        onPaste={handlePaste}
      >
        {otp.map((d, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            className="ob-otp"
            data-filled={d ? "true" : "false"}
          />
        ))}
      </div>

      <button
        className="ob-btn-primary"
        onClick={() => verify(otp.join(""))}
        disabled={verifying || otp.some((d) => !d)}
        style={{ marginBottom: 16 }}
      >
        {verifying ? <Spinner size={14} color="#0a0a0a" /> : "Verify Code"}
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={resend}
          disabled={resending || cooldown > 0}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
            opacity: cooldown > 0 ? 0.5 : 1,
          }}
        >
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : resending
              ? "Sending…"
              : "Resend code"}
        </button>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
          }}
        >
          Wrong email?
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — IDENTITY (username)
// ─────────────────────────────────────────────────────────────────────────────
function StepIdentity({ onSubmit, onBack, loading, error }) {
  const { username, setField } = useOnboardingStore();
  const [available, setAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const debouncedUN = useDebounce(username, 600);

  useEffect(() => {
    if (debouncedUN.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("identity.username", "==", debouncedUN.toLowerCase()),
          ),
        );
        if (active) setAvailable(snap.empty);
      } catch {
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedUN]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || username.length < 3) return;
    if (available === false) return;
    onSubmit(available);
  };

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <StepHeader
        step={2}
        overline="Step 2 of 8"
        title="Your handle."
        subtitle="How will operators find you on the global arena?"
      />

      <ErrorBox msg={error} />

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div>
          <div className="ob-input-group">
            <span
              style={{
                position: "absolute",
                left: 16,
                top: 26,
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
                fontSize: 12,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              @
            </span>
            <input
              className="ob-input"
              style={{ paddingLeft: 34, paddingRight: 44 }}
              type="text"
              value={username}
              onChange={(e) =>
                setField(
                  "username",
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                )
              }
              placeholder=" "
              required
              maxLength={30}
            />
            <label className="ob-floating-label" style={{ left: 34 }}>
              Unique username
            </label>
            <div
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {checking && <Spinner size={14} />}
              {!checking && available === false && username.length >= 3 && (
                <XIcon size={14} />
              )}
            </div>
          </div>
          {available === false && (
            <p
              style={{
                fontSize: 11,
                color: "#F87171",
                fontFamily: "var(--font-body)",
                marginTop: 4,
              }}
            >
              This handle is taken. Try another.
            </p>
          )}
          {available === true && (
            <p
              style={{
                fontSize: 11,
                color: "#22C55E",
                fontFamily: "var(--font-body)",
                marginTop: 4,
              }}
            >
              That handle is available!
            </p>
          )}
          <p
            style={{
              fontSize: 11,
              color: "var(--text-dim)",
              fontFamily: "var(--font-body)",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            Letters, numbers, underscores only. Min 3 characters. This cannot be
            changed easily.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="ob-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            className="ob-btn-primary"
            style={{ flex: 1 }}
            disabled={
              loading || checking || username.length < 3 || available === false
            }
          >
            {loading ? <Spinner size={14} color="#0a0a0a" /> : "Continue"}{" "}
            {!loading && <ChevronRight />}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — BASELINE (Cinematic selection architecture)
// ─────────────────────────────────────────────────────────────────────────────
const BaselineCard = ({ item, active, onClick, index }) => (
  <motion.div
    initial={{ opacity: 0, x: 40 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{
      duration: 0.6,
      delay: index * 0.06,
      ease: [0.23, 1, 0.32, 1],
    }}
    whileTap={{ scale: 0.96 }}
    onClick={() => onClick(item.value)}
    style={{
      position: "relative",
      width: 140,
      height: 190,
      borderRadius: 12,
      overflow: "hidden",
      cursor: "pointer",
      background: "var(--depth)",
      border: active
        ? "1.5px solid var(--gold-2)"
        : "1px solid rgba(255,255,255,0.06)",
      boxShadow: active ? "0 0 24px rgba(191,162,100,0.15)" : "none",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
      flexShrink: 0,
      scrollSnapAlign: "start",
    }}
  >
    <img
      src={item.img}
      alt={item.label}
      loading="lazy"
      onError={(e) => (e.currentTarget.style.opacity = 0)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: active ? 0.8 : 0.35,
        transition: "transform 0.8s ease-out, opacity 0.4s",
        transform: active ? "scale(1.08)" : "scale(1)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: active
          ? "linear-gradient(to top, rgba(3,3,3,0.95) 0%, rgba(191,162,100,0.2) 100%)"
          : "linear-gradient(to top, rgba(3,3,3,0.98) 0%, rgba(3,3,3,0.4) 60%, transparent 100%)",
        transition: "background 0.4s",
      }}
    />
    <span
      style={{
        position: "absolute",
        bottom: 14,
        left: 14,
        right: 14,
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "-0.01em",
        color: active ? "var(--gold-2)" : "var(--text-primary)",
        zIndex: 2,
        transition: "color 0.3s",
        textShadow: "0 2px 10px rgba(0,0,0,0.9)",
      }}
    >
      {item.label}
    </span>
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
        >
          <CheckIcon size={16} color="var(--gold-2)" />
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

function StepBaseline({ onSubmit, onBack, loading, error }) {
  const { currentStatus, setField } = useOnboardingStore();

  const handleToggle = (val) => {
    let next = [...currentStatus];

    if (val === "None") {
      next = next.includes("None") ? [] : ["None"];
    } else {
      next = next.filter((s) => s !== "None");

      const selfEmployed = ["Entrepreneur", "Freelancer", "Creator"];

      if (next.includes(val)) {
        next = next.filter((s) => s !== val);
      } else {
        if (val === "Working Professional") {
          next = next.filter((s) => !selfEmployed.includes(s));
        } else if (selfEmployed.includes(val)) {
          next = next.filter((s) => s !== "Working Professional");
        }
        if (next.length < 3) next.push(val);
      }
    }
    setField("currentStatus", next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentStatus.length) return;
    onSubmit();
  };

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div style={{ marginBottom: 32 }}>
        <ProgressBar current={3} total={9} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(26px, 5vw, 33px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Your situation.
          </h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--gold-2)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            Enter Max: 3
          </span>
        </div>
      </div>

      <ErrorBox msg={error} />

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            gap: 12,
            paddingBottom: 16,
            margin: "0 -20px",
            paddingLeft: 20,
            paddingRight: 20,
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`.ob-right ::-webkit-scrollbar { display: none; }`}</style>

          {BASELINE_OPTIONS.map((item, i) => (
            <BaselineCard
              key={item.value}
              item={item}
              index={i}
              active={currentStatus.includes(item.value)}
              onClick={handleToggle}
            />
          ))}
        </div>

        <AnimatePresence>
          {currentStatus.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                overflow: "hidden",
              }}
            >
              {currentStatus.map((s) => (
                <motion.span
                  key={s}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  style={{
                    padding: "5px 14px",
                    background: "rgba(191,162,100,0.1)",
                    border: "0.5px solid rgba(191,162,100,0.25)",
                    borderRadius: 99,
                    fontSize: 11,
                    color: "var(--gold-2)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                  }}
                >
                  {s}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="ob-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            className="ob-btn-primary"
            style={{ flex: 1 }}
            disabled={!currentStatus.length || loading}
          >
            {loading ? <Spinner size={14} color="#0a0a0a" /> : "Continue"}{" "}
            {!loading && <ChevronRight />}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — INTENT & DOMAIN
// ─────────────────────────────────────────────────────────────────────────────
const DomainCard = ({ item, active, onClick, isMore }) => (
  <motion.div
    whileTap={{ scale: 0.96 }}
    onClick={() => onClick(item.value)}
    style={{
      position: "relative",
      height: 90, // Cinematic horizontal poster card
      borderRadius: 12,
      overflow: "hidden",
      cursor: "pointer",
      background: "var(--surface)",
      border: active
        ? "1.5px solid var(--gold-2)"
        : "1px solid rgba(255,255,255,0.06)",
      boxShadow: active ? "0 0 20px rgba(191,162,100,0.15)" : "none",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
    }}
  >
    <img
      src={item.img}
      alt={item.label}
      loading="lazy"
      onError={(e) => (e.currentTarget.style.opacity = 0)}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        opacity: active || isMore ? 0.8 : 0.35, // Ensures "More" button remains highly visible
        transition: "transform 0.6s ease-out, opacity 0.3s",
        transform: active ? "scale(1.08)" : "scale(1)",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: active
          ? "linear-gradient(to right, rgba(3,3,3,0.95) 0%, rgba(191,162,100,0.2) 100%)"
          : "linear-gradient(to right, rgba(3,3,3,0.98) 0%, rgba(3,3,3,0.3) 70%, transparent 100%)",
        transition: "background 0.3s",
      }}
    />
    <span
      style={{
        position: "absolute",
        top: "50%",
        left: 16,
        transform: "translateY(-50%)",
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: "-0.01em",
        color: "#FFFFFF", // Absolute pure white forced for contrast
        zIndex: 2,
        transition: "color 0.3s",
        textShadow: "0 2px 8px rgba(0,0,0,0.9)",
      }}
    >
      {item.label}
    </span>
    <AnimatePresence>
      {active && !isMore && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: "absolute",
            top: "50%",
            right: 14,
            transform: "translateY(-50%)",
            zIndex: 2,
            background: "rgba(3,3,3,0.5)",
            backdropFilter: "blur(4px)",
            borderRadius: "50%",
            padding: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <XIcon size={12} color="var(--gold-2)" />
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

function StepIntent({ onSubmit, onBack, loading, error }) {
  const { passion, setField } = useOnboardingStore();
  const [showMore, setShowMore] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!passion) return;
    onSubmit();
  };

  // Compile visual grid: If the active passion is inside DOMAIN_MORE, explicitly inject it before the "More" trigger
  const selectedMoreOption = DOMAIN_MORE.find((d) => d.value === passion);
  const visibleDomains = [...DOMAIN_MAIN];

  if (selectedMoreOption) {
    visibleDomains.push(selectedMoreOption);
  }

  visibleDomains.push({
    value: "MORE_TRIGGER",
    label: "More",
    img: "/onboarding/more.png",
  });

  const handleDomainClick = (val) => {
    if (val === "MORE_TRIGGER") {
      setShowMore(true);
    } else if (passion === val) {
      setField("passion", ""); // Deselect
    } else {
      setField("passion", val); // Select
    }
  };

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <StepHeader
        step={4}
        total={7}
        overline="Step 4 of 7"
        title="Your domain."
        subtitle="Where does your ambition live? This powers your execution map."
      />

      <ErrorBox msg={error} />

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 28 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {visibleDomains.map((d) => (
            <DomainCard
              key={d.value}
              item={d}
              active={passion === d.value}
              isMore={d.value === "MORE_TRIGGER"}
              onClick={handleDomainClick}
            />
          ))}
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="ob-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            className="ob-btn-primary"
            style={{ flex: 1 }}
            disabled={!passion || loading}
          >
            {loading ? <Spinner size={14} color="#0a0a0a" /> : "Continue"}{" "}
            {!loading && <ChevronRight />}
          </button>
        </div>
      </form>

      {/* Floating Domain Modal */}
      {createPortal(
        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 99999,
                background: "rgba(0,0,0,0.8)",
                backdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
              }}
              onClick={() => setShowMore(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  maxWidth: 440,
                  background: "var(--depth)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "28px 24px",
                  boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 24,
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 800,
                      fontSize: 22,
                      margin: 0,
                      color: "#FFFFFF",
                    }}
                  >
                    Extended Domains
                  </h3>
                  <button
                    onClick={() => setShowMore(false)}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "none",
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.12)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.06)")
                    }
                  >
                    <XIcon size={16} />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}
                >
                  {DOMAIN_MORE.map((d) => (
                    <DomainCard
                      key={d.value}
                      item={d}
                      active={passion === d.value}
                      isMore={false}
                      onClick={() => {
                        setField("passion", passion === d.value ? "" : d.value);
                        setShowMore(false);
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — MOTIVATION (Cinematic Image Stack)
// ─────────────────────────────────────────────────────────────────────────────
function StepMotivation({ onSubmit, onBack, loading, error }) {
  const { whyHere, setField } = useOnboardingStore();

  // Safely extract array in case legacy data is present
  const selected = Array.isArray(whyHere) ? whyHere : whyHere?.selected || [];

  const toggleCard = (id) => {
    let next = [...selected];
    if (next.includes(id)) {
      next = next.filter((x) => x !== id);
    } else {
      next.push(id);
    }
    setField("whyHere", next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selected.length === 0) return;
    onSubmit();
  };

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <div style={{ marginBottom: 32 }}>
        <ProgressBar current={5} total={7} />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "clamp(26px, 5vw, 33px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Your drive.
          </h2>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--gold-2)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            Select all that apply
          </span>
        </div>
      </div>

      <ErrorBox msg={error} />

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOTIVATION_CARDS.map((card, i) => {
            const active = selected.includes(card.id);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => toggleCard(card.id)}
                style={{
                  height: 76,
                  position: "relative",
                  borderRadius: 14,
                  overflow: "hidden",
                  cursor: "pointer",
                  background: "var(--elevated)",
                  border: active
                    ? "1.5px solid var(--gold-2)"
                    : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: active
                    ? "0 0 24px rgba(191,162,100,0.12)"
                    : "none",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <img
                  src={card.img}
                  alt={card.label}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.opacity = 0)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: active ? 0.7 : 0.3,
                    transition: "opacity 0.3s, transform 0.6s",
                    transform: active ? "scale(1.05)" : "scale(1)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to right, rgba(3,3,3,0.96) 0%, rgba(3,3,3,0.4) 100%)",
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0 24px",
                    height: "100%",
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
                      color: active ? "var(--gold-2)" : "#FFFFFF",
                      transition: "color 0.2s",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {card.label}
                  </span>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: active
                        ? "none"
                        : "1.5px solid rgba(255,255,255,0.2)",
                      background: active ? "var(--gold-2)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    {active && (
                      <svg
                        width={14}
                        height={14}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button type="button" className="ob-btn-ghost" onClick={onBack}>
            Back
          </button>
          <button
            type="submit"
            className="ob-btn-primary"
            style={{ flex: 1 }}
            disabled={selected.length === 0 || loading}
          >
            {loading ? <Spinner size={14} color="#0a0a0a" /> : "Continue"}{" "}
            {!loading && <ChevronRight />}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — PREMIUM GATE
// ─────────────────────────────────────────────────────────────────────────────
function StepPremium({ firstName, onUpgrade, onSkip, loading }) {
  const features = [
    {
      label: "Unlimited execution nodes",
      sub: "No 15-node cap on your roadmap",
    },
    { label: "100MB asset vault", sub: "50 verified assets vs 5 on Essential" },
    { label: "Competitor X-Ray", sub: "See who is tracking you on the arena" },
    {
      label: "Daily execution journal",
      sub: "Pro-only reflection and tracking system",
    },
    {
      label: "Priority asset verification",
      sub: "48h vs standard 7-day queue",
    },
  ];

  return (
    <motion.div
      variants={STEP_VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <ProgressBar current={6} total={7} />

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #8B7240, #D4AF78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 28px rgba(191,162,100,0.2)",
          }}
        >
          <img
            src="/logo-premium.png"
            alt="Discotive Premium"
            loading="lazy"
            style={{
              width: 32,
              height: 32,
              objectFit: "contain",
            }}
          />
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 12px",
            background: "rgba(191,162,100,0.08)",
            border: "0.5px solid rgba(191,162,100,0.2)",
            borderRadius: 99,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--gold-2)",
              animation: "ob-pulse 2s infinite",
            }}
          />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "var(--gold-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
            }}
          >
            Launch pricing
          </span>
        </div>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(24px, 5vw, 30px)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Welcome, {firstName || "Operator"}.
        </h2>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 18,
            color: "var(--gold-2)",
            marginBottom: 18,
          }}
        >
          Build without limits.
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            lineHeight: 1.7,
            maxWidth: 360,
            margin: "0 auto",
          }}
        >
          You're on{" "}
          <strong style={{ color: "var(--text-primary)" }}>Essential</strong>.
          Upgrade to Pro for{" "}
          <strong style={{ color: "var(--gold-2)" }}>₹139/month</strong> and
          unlock the full OS.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {features.map(({ label, sub }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: "var(--r-sm)",
            }}
          >
            <CheckIcon size={14} />
            <div>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <button
        className="ob-btn-primary"
        onClick={onUpgrade}
        disabled={loading}
        style={{ marginBottom: 10 }}
      >
        {loading ? (
          <Spinner size={14} color="#0a0a0a" />
        ) : (
          "Upgrade to Pro — ₹139/month"
        )}
      </button>
      <button
        onClick={onSkip}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          color: "var(--text-dim)",
          fontFamily: "var(--font-body)",
          padding: "10px",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        Continue with Essential <ChevronRight size={12} />
      </button>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.13)",
          fontFamily: "var(--font-body)",
          marginTop: 14,
          textAlign: "center",
        }}
      >
        Cancel anytime · Indian pricing · No hidden fees.
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 — EXECUTION SEQUENCE (Final boot animation + Firestore write)
// ─────────────────────────────────────────────────────────────────────────────
function StepExecution({ uid, onComplete }) {
  const [phase, setPhase] = useState("tasks"); // tasks | bonus | done
  const [taskIdx, setTaskIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [toasts, setToasts] = useState([]);

  const tasks = [
    "Initializing command center",
    "Compiling your execution map",
    "Connecting to the global arena",
    "Seeding your operator network",
    "Securing your asset vault",
    "All systems operational",
  ];

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4200);
  }, []);

  const animScore = useCallback((from, to, ms = 30) => {
    let cur = from;
    const iv = setInterval(() => {
      cur += 1;
      setScore(cur);
      if (cur >= to) clearInterval(iv);
    }, ms);
  }, []);

  useEffect(() => {
    if (phase !== "tasks") return;
    if (taskIdx < tasks.length) {
      const t = setTimeout(
        () => {
          setTaskIdx((i) => i + 1);
        },
        taskIdx === 0 ? 2000 : 900,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("bonus"), 300);
    return () => clearTimeout(t);
  }, [taskIdx, phase, tasks.length]);

  useEffect(() => {
    if (phase === "bonus") {
      addToast("Initialization bonus: +50 pts", "green");
      animScore(0, 50, 20);
      const t = setTimeout(() => setPhase("done"), 2600);
      return () => clearTimeout(t);
    }
  }, [phase, animScore, addToast]);

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(), 800);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#030303",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 480,
          height: 480,
          background:
            "radial-gradient(ellipse, rgba(191,162,100,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.p
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{
          position: "absolute",
          top: 40,
          fontSize: 10,
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: "rgba(191,162,100,0.4)",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
        }}
      >
        DISCOTIVE OS
      </motion.p>

      <div
        style={{
          width: "100%",
          maxWidth: 720,
          display: "grid",
          gridTemplateColumns: window.innerWidth > 640 ? "1fr 1fr" : "1fr",
          gap: 48,
          alignItems: "center",
        }}
      >
        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {tasks.map((task, i) => {
            if (i > taskIdx) return null;
            const done = i < taskIdx || phase !== "tasks";
            const active = i === taskIdx && phase === "tasks";
            return (
              <motion.div
                key={task}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {active && <Spinner />}
                  {done && <CheckIcon size={18} />}
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: done ? 400 : 600,
                    color: done
                      ? "rgba(245,240,232,0.3)"
                      : "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    transition: "color 0.4s",
                  }}
                >
                  {task}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Score counter */}
        {window.innerWidth > 640 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderLeft: "0.5px solid rgba(255,255,255,0.06)",
              paddingLeft: 40,
            }}
          >
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                marginBottom: 14,
              }}
            >
              Discotive Score
            </p>
            <motion.span
              key={score}
              className="score-pop"
              style={{
                fontSize: "clamp(64px, 14vw, 100px)",
                fontWeight: 900,
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                display: "block",
                color:
                  phase === "bonus" ? "var(--gold-2)" : "var(--text-primary)",
                transition: "color 0.5s",
              }}
            >
              {score}
            </motion.span>
            <AnimatePresence>
              {phase === "bonus" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: 16,
                    padding: "5px 14px",
                    background: "rgba(191,162,100,0.1)",
                    border: "0.5px solid rgba(191,162,100,0.3)",
                    borderRadius: 99,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--gold-2)",
                      animation: "ob-pulse 1.5s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--gold-2)",
                      textTransform: "uppercase",
                      letterSpacing: "0.2em",
                    }}
                  >
                    Initialization Bonus
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {createPortal(
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: 20,
            right: 20,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
            maxWidth: 360,
          }}
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
                style={{
                  padding: "11px 16px",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  pointerEvents: "auto",
                  ...(t.type === "green"
                    ? {
                        background: "rgba(4,31,16,0.95)",
                        border: "0.5px solid rgba(34,197,94,0.3)",
                        color: "#4ADE80",
                      }
                    : {
                        background: "rgba(22,22,22,0.95)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                        color: "var(--text-secondary)",
                      }),
                }}
              >
                {t.type === "green" && <CheckIcon size={13} />}
                {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
export default function AuthOrchestrator() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useOnboardingStore();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showExecution, setShowExecution] = useState(false);

  // CSS injected natively via React's Virtual DOM to guarantee synchronous cleanup

  // Initialize from Landing Page payload
  useEffect(() => {
    // 1. Process Router Payload Injection
    if (location.state?.isLogin !== undefined || location.state?.email) {
      if (location.state.email) {
        store.setField("email", location.state.email);
      }
      store.setStep(location.state.isLogin ? "login" : "auth");

      // MAANG Standard: Clear React Router state natively to break the infinite read loop
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    // 2. Fallback execution boundary
    if (store.step === "gateway") {
      store.setStep("auth");
    }

    // Strict Dep Guard: Do NOT include 'store' here. Zustand mutations will cause infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location.state?.isLogin,
    location.state?.email,
    location.pathname,
    navigate,
  ]);

  // Guard: if already authed + onboarded, redirect
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data()?.onboarding_status === "completed") {
          navigate("/app", { replace: true });
        }
      } catch {}
    });
    return unsub;
  }, [navigate]);

  const setErr = (msg) => setLocalError(msg);
  const clearErr = () => setLocalError("");

  // ── HANDLER: Google OAuth ────────────────────────────────────────────────
  const handleOAuth = async () => {
    setLocalLoading(true);
    clearErr();
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const nameParts = (user.displayName || "Operator").split(" ");

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data()?.onboarding_status === "completed") {
        navigate("/app", { replace: true });
        return;
      }

      store.setField("uid", user.uid);
      store.setField("isGoogleUser", true);
      store.setField("email", user.email);
      store.setField(
        "firstName",
        snap.data()?.identity?.firstName || nameParts[0],
      );
      store.setField(
        "lastName",
        snap.data()?.identity?.lastName || nameParts.slice(1).join(" "),
      );
      store.setField("avatarUrl", user.photoURL || "");
      store.setField(
        "username",
        snap.data()?.identity?.username ||
          user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
      );

      // Create ghost doc if new
      if (!snap.exists()) {
        const today = new Date().toISOString().split("T")[0];
        await setDoc(doc(db, "users", user.uid), {
          identity: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            email: user.email,
            avatarUrl: user.photoURL || "",
            username: "",
          },
          onboarding_status: "pending",
          isGhostUser: true,
          createdAt: new Date().toISOString(),
          discotiveScore: {
            current: 0,
            streak: 0,
            lastLoginDate: today,
            lastAmount: 0,
            lastReason: "Ghost — Pending",
            lastUpdatedAt: new Date().toISOString(),
          },
          login_history: [today],
        });
      }

      store.setStep("identity");
    } catch (err) {
      setErr(err.message.replace("Firebase: ", ""));
    } finally {
      setLocalLoading(false);
    }
  };

  // ── HANDLER: Login ────────────────────────────────────────────────────────
  const handleLogin = async (email, password) => {
    setLocalLoading(true);
    clearErr();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app", { replace: true });
    } catch {
      setErr("Incorrect email or password. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  // ── HANDLER: Email/pass signup → send OTP ────────────────────────────────
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const { firstName, lastName, email, password } = store;
    if (!firstName || !lastName) return setErr("Please fill in all fields.");
    if (password.length < 8)
      return setErr("Password must be at least 8 characters.");
    const pwScore = (() => {
      let s = 0;
      if (password.length > 7) s++;
      if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
      if (/\d/.test(password)) s++;
      if (/[^a-zA-Z0-9]/.test(password)) s++;
      return s;
    })();
    if (pwScore < 2)
      return setErr(
        "Password too weak. Mix uppercase, lowercase, and numbers.",
      );

    setLocalLoading(true);
    clearErr();
    try {
      // Pre-flight check: Does this operator already exist?
      const normalizedEmail = email.trim().toLowerCase();
      let exists = false;

      try {
        const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
        if (methods && methods.length > 0) {
          exists = true;
        }
      } catch (err) {
        console.warn(
          "[AuthEngine] Enumeration protection active or network failure:",
          err,
        );
      }

      if (exists) {
        // Email already registered. Reroute seamlessly to login.
        store.setStep("login");
        setLocalLoading(false);
        return;
      }

      // Safe to proceed for new operator
      const sendFn = httpsCallable(functions, "sendVerificationEmail");
      await sendFn({ email, firstName });
      store.setStep("verify");
    } catch (err) {
      setErr("Failed to send verification email. Please try again.");
    } finally {
      // Ensure loading drops if we didn't early return
      if (store.step !== "login") {
        setLocalLoading(false);
      }
    }
  };

  // ── HANDLER: OTP verified → create Firebase auth account ─────────────────
  const handleOTPVerified = async () => {
    const { email, password } = store;
    setLocalLoading(true);
    clearErr();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      store.setField("uid", cred.user.uid);
      store.setStep("identity");
    } catch (err) {
      setErr(err.message.replace("Firebase: ", ""));
    } finally {
      setLocalLoading(false);
    }
  };

  // ── HANDLER: Identity → next ──────────────────────────────────────────────
  const handleIdentitySubmit = (available) => {
    if (!available && available !== null) return setErr("Username is taken.");
    clearErr();
    store.setStep("baseline");
  };

  // ── HANDLER: Baseline → next ──────────────────────────────────────────────
  const handleBaselineSubmit = () => {
    clearErr();
    store.setStep("intent");
  };

  // ── HANDLER: Intent → next ────────────────────────────────────────────────
  const handleIntentSubmit = () => {
    clearErr();
    store.setStep("motivation");
  };

  // ── HANDLER: Motivation → next ────────────────────────────────────────────
  const handleMotivationSubmit = () => {
    clearErr();
    store.setStep("premium");
  };

  // ── HANDLER: Premium skip/upgrade ────────────────────────────────────────
  const handlePremiumSkip = () => {
    clearErr();
    triggerExecution();
  };

  const handlePremiumUpgrade = () => {
    navigate("/premium");
  };

  // ── FINAL: Batch Firestore write ──────────────────────────────────────────
  const triggerExecution = async () => {
    const uid = store.uid || auth.currentUser?.uid;
    if (!uid) return;
    setShowExecution(true);

    const {
      firstName,
      lastName,
      email,
      username,
      passion,
      whyHere,
      currentStatus,
      github,
      twitter,
      instagram,
      youtube,
      avatarUrl,
      followedSeeds,
    } = store;

    const today = new Date().toISOString().split("T")[0];

    try {
      // 1. Core user doc (users/{uid})
      await setDoc(
        doc(db, "users", uid),
        {
          identity: {
            firstName,
            lastName,
            email: email || auth.currentUser?.email || "",
            username: username.toLowerCase(),
            avatarUrl: avatarUrl || "",
            domain: passion,
            niche: "",
          },
          vision: { passion }, // whyHere heavily offloaded to dedicated opportunities structure
          baseline: { currentStatus },
          skills: { rawSkills: [], alignedSkills: [], languages: [] },
          onboarding_status: "completed",
          onboardingComplete: true,
          onboardingScoreAwarded: true,
          isGhostUser: false,
          profileCompleteness: 25,
          deferredOnboarding: {
            location: false,
            background: false,
            professional: false,
            skills: false,
            resources: false,
            footprint: false,
            motivation: false,
          },
          discotiveScore: {
            current: 50,
            last24h: 0,
            lastLoginDate: today,
            streak: 1,
            lastAmount: 50,
            lastReason: "OS Booted",
            lastUpdatedAt: new Date().toISOString(),
          },
          score_history: [{ date: today, score: 50 }],
          consistency_log: [today],
          login_history: [today],
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // 2. Public profile doc (profiles/{uid})
      await setDoc(
        doc(db, "profiles", uid),
        {
          identity: {
            firstName,
            lastName,
            username: username.toLowerCase(),
            domain: passion,
            avatarUrl: avatarUrl || "",
          },
          baseline: { currentStatus },
          vision: { passion },
          links: { github, twitter, instagram, youtube },
          followedSeeds: followedSeeds || [],
          tier: "ESSENTIAL",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // 2.5 MAANG-Grade Opportunity Preferences Store
      // Writes strictly to: users/{uid}/opportunities/preferences
      const safeWhyHere = Array.isArray(whyHere)
        ? whyHere
        : whyHere?.selected || [];

      await setDoc(
        doc(db, "users", uid, "opportunities", "preferences"),
        {
          motivations: safeWhyHere,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      // 3. Metrics doc (user_metrics/{uid})
      await setDoc(
        doc(db, "user_metrics", uid),
        {
          discotiveScore: { current: 50, streak: 1, lastLoginDate: today },
          consistency_log: [today],
          login_history: [today],
          daily_scores: { [today]: 50 },
          monthly_scores: { [today.substring(0, 7)]: 50 },
        },
        { merge: true },
      );

      // (Initialization bonus hardcoded into sync payload to eliminate race conditions)
      store.setField("onboardingComplete", true);
    } catch (err) {
      console.error("[Onboarding] Final write failed:", err);
    }
  };

  const handleExecutionComplete = () => {
    store.reset();
    navigate("/app", { replace: true });
  };

  const handleGlobalBack = () => {
    if (store.step === "auth" || store.step === "login") {
      navigate("/");
    } else {
      const prev = {
        verify: "auth",
        identity: store.isGoogleUser ? "login" : "auth",
        baseline: "identity",
        intent: "baseline",
        motivation: "intent",
        premium: "motivation",
      }[store.step];
      if (prev) store.setStep(prev);
    }
  };

  // ── Step → left panel index ───────────────────────────────────────────────
  const leftIdx =
    {
      gateway: 0,
      login: 0,
      auth: 1,
      verify: 1,
      identity: 2,
      baseline: 3,
      intent: 4,
      motivation: 5,
      premium: 6,
    }[store.step] ?? 0;

  return (
    <div className="ob-root">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
            <LeftPanel stepIndex={leftIdx} onBack={handleGlobalBack} />
      <div className="ob-right" style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <button
            onClick={handleGlobalBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              padding: 0,
              opacity: 0.8,
              transition: "opacity 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = 1)}
            onMouseOut={(e) => (e.currentTarget.style.opacity = 0.8)}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <img
            src="/Logo with Title.png"
            alt="Discotive"
            style={{ height: 22, opacity: 0.9 }}
          />
        </div>
        <div className="ob-form-wrap" style={{ marginTop: 24 }}>
          <AnimatePresence mode="wait">
            {store.step === "login" && (
              <StepLogin
                key="login"
                onOAuth={handleOAuth}
                onSwitch={() => store.setStep("auth")}
                onSubmit={handleLogin}
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "auth" && (
              <StepAuth
                key="auth"
                onOAuth={handleOAuth}
                onSwitch={() => store.setStep("login")}
                onSubmit={handleAuthSubmit}
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "verify" && (
              <StepVerifyEmail
                key="verify"
                email={store.email}
                firstName={store.firstName}
                onVerified={handleOTPVerified}
                onBack={() => store.setStep("auth")}
              />
            )}
            {store.step === "identity" && (
              <StepIdentity
                key="identity"
                onSubmit={handleIdentitySubmit}
                onBack={() =>
                  store.setStep(store.isGoogleUser ? "gateway" : "auth")
                }
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "baseline" && (
              <StepBaseline
                key="baseline"
                onSubmit={handleBaselineSubmit}
                onBack={() => store.setStep("identity")}
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "intent" && (
              <StepIntent
                key="intent"
                onSubmit={handleIntentSubmit}
                onBack={() => store.setStep("baseline")}
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "motivation" && (
              <StepMotivation
                key="motivation"
                onSubmit={handleMotivationSubmit}
                onBack={() => store.setStep("intent")}
                loading={localLoading}
                error={localError}
              />
            )}
            {store.step === "premium" && (
              <StepPremium
                key="premium"
                firstName={store.firstName}
                onUpgrade={handlePremiumUpgrade}
                onSkip={handlePremiumSkip}
                loading={localLoading}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {showExecution && (
          <StepExecution
            uid={store.uid || auth.currentUser?.uid}
            onComplete={handleExecutionComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
