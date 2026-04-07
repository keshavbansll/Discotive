/**
 * DISCOTIVE — Auth Orchestrator (Redesigned)
 *
 * Key improvements:
 * - Email verification moved to after Step 1 (before coordinates)
 * - Left panel with animated quotes + imagery — working
 * - Apple-inspired dark aesthetic matching Landing page (Montserrat + Poppins, gold accents)
 * - Step 2 dropdowns fully visible with correct z-index layering
 * - Username availability check working with debounce
 * - Character limits on all text areas
 * - Plain language throughout — no jargon barriers
 * - SetupSequence animation on-theme with gold score reveal
 * - Smooth, MAANG-grade micro-interactions throughout
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useRef,
} from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "../../firebase";
import { awardOnboardingComplete } from "../../lib/scoreEngine";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import {
  ChevronRight,
  CheckCircle2,
  X,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Instagram,
  Youtube,
  Link as LinkIcon,
  Crown,
  Zap,
  Database,
  BarChart2,
  Check,
  Sparkles,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { createPortal } from "react-dom";

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — matches Landing page exactly
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Poppins:wght@300;400;500;600;700&display=swap');

  .auth-root {
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
    --radius: 18px;
    --radius-sm: 12px;
  }

  .auth-root * { box-sizing: border-box; }

  .auth-root {
    min-height: 100svh;
    background: var(--void);
    color: var(--text-primary);
    font-family: var(--font-body);
    display: flex;
    position: relative;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .auth-left {
    display: none;
    width: 42%;
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
    background: var(--depth);
    border-right: 0.5px solid var(--border);
  }
  @media (min-width: 900px) { .auth-left { display: flex; flex-direction: column; } }

  .auth-left-bg {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 30% 40%, rgba(191,162,100,0.07) 0%, transparent 65%),
                radial-gradient(ellipse at 70% 80%, rgba(139,114,64,0.05) 0%, transparent 55%);
    pointer-events: none;
  }

  .auth-left-lines {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .auth-left-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0.5px;
    background: linear-gradient(180deg, transparent 0%, rgba(191,162,100,0.06) 30%, rgba(191,162,100,0.06) 70%, transparent 100%);
  }

  /* ── RIGHT PANEL ── */
  .auth-right {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    padding: 24px 20px;
    background: var(--void);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }
  @media (min-width: 640px) { .auth-right { padding: 40px 32px; } }

  .auth-right::-webkit-scrollbar { width: 4px; }
  .auth-right::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

  .auth-form-container {
    width: 100%;
    max-width: 440px;
    padding: 28px 0 60px;
  }

  /* ── INPUTS ── */
  .auth-input {
    width: 100%;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 400;
    outline: none;
    transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
    -webkit-appearance: none;
  }

  .auth-input::placeholder { color: var(--text-dim); }

  .auth-input:focus {
    border-color: rgba(191,162,100,0.5);
    background: var(--elevated);
    box-shadow: 0 0 0 3px rgba(191,162,100,0.06);
  }

  .auth-input:focus-visible { outline: none; }

  .auth-label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 8px;
    font-family: var(--font-body);
  }

  .auth-select {
    width: 100%;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(245,240,232,0.3)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .auth-select:focus {
    border-color: rgba(191,162,100,0.5);
    box-shadow: 0 0 0 3px rgba(191,162,100,0.06);
  }

  /* ── BUTTONS ── */
  .auth-btn-primary {
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
    border-radius: var(--radius-sm);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .auth-btn-primary:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(191,162,100,0.25);
  }

  .auth-btn-primary:active:not(:disabled) { transform: scale(0.98); }
  .auth-btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

  .auth-btn-secondary {
    padding: 14px 20px;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .auth-btn-secondary:hover { background: var(--elevated); border-color: rgba(255,255,255,0.12); }

  .auth-btn-ghost {
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
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

  .auth-btn-ghost:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }

  /* ── OAUTH BUTTON ── */
  .auth-oauth-btn {
    width: 100%;
    padding: 14px 20px;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
  }

  .auth-oauth-btn:hover:not(:disabled) { background: var(--elevated); border-color: rgba(255,255,255,0.15); }
  .auth-oauth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── CUSTOM DROPDOWN ── */
  .auth-dropdown-wrap {
    position: relative;
  }

  .auth-dropdown-trigger {
    width: 100%;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: border-color 0.25s, box-shadow 0.25s;
    text-align: left;
  }

  .auth-dropdown-trigger[data-open="true"] {
    border-color: rgba(191,162,100,0.5);
    box-shadow: 0 0 0 3px rgba(191,162,100,0.06);
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  }

  .auth-dropdown-trigger span.placeholder { color: var(--text-dim); }

  .auth-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--elevated);
    border: 0.5px solid rgba(191,162,100,0.3);
    border-top: none;
    border-radius: 0 0 var(--radius-sm) var(--radius-sm);
    max-height: 220px;
    overflow-y: auto;
    z-index: 9999;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
    box-shadow: 0 24px 48px rgba(0,0,0,0.6);
  }

  .auth-dropdown-search {
    width: 100%;
    padding: 10px 14px;
    background: var(--surface);
    border: none;
    border-bottom: 0.5px solid var(--border);
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 13px;
    outline: none;
  }

  .auth-dropdown-search::placeholder { color: var(--text-dim); }

  .auth-dropdown-item {
    padding: 11px 14px;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .auth-dropdown-item:hover, .auth-dropdown-item[data-selected="true"] {
    background: rgba(191,162,100,0.08);
    color: var(--gold-2);
  }

  /* ── MULTI SELECT ── */
  .auth-multi-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }

  .auth-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: rgba(191,162,100,0.1);
    border: 0.5px solid rgba(191,162,100,0.25);
    border-radius: 99px;
    font-size: 11px;
    color: var(--gold-2);
    font-family: var(--font-body);
    font-weight: 500;
  }

  .auth-tag button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--gold-3);
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
  }

  /* ── ERROR / STATUS ── */
  .auth-error {
    padding: 12px 16px;
    background: rgba(239,68,68,0.08);
    border: 0.5px solid rgba(239,68,68,0.2);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: #F87171;
    font-family: var(--font-body);
  }

  /* ── STEP INDICATOR ── */
  .auth-step-dots {
    display: flex;
    gap: 6px;
    margin-bottom: 32px;
  }

  .auth-step-dot {
    height: 3px;
    border-radius: 2px;
    background: var(--border);
    transition: background 0.3s, width 0.3s;
    flex: 1;
  }

  .auth-step-dot[data-active="true"] { background: var(--gold-2); }
  .auth-step-dot[data-done="true"] { background: rgba(191,162,100,0.4); }

  /* ── DIVIDER ── */
  .auth-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 20px 0;
  }

  .auth-divider-line {
    flex: 1;
    height: 0.5px;
    background: var(--border);
  }

  .auth-divider span {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-dim);
    letter-spacing: 0.2em;
    font-family: var(--font-body);
  }

  /* ── PW STRENGTH ── */
  .pw-bar { height: 3px; border-radius: 2px; transition: background 0.3s; background: var(--elevated); }

  /* ── CHAR COUNT ── */
  .char-count {
    font-size: 10px;
    color: var(--text-dim);
    font-family: var(--font-body);
    text-align: right;
    margin-top: 4px;
  }

  /* ── SETUP SEQUENCE ── */
  @keyframes auth-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes auth-count-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes auth-glow-pulse { 0%, 100% { text-shadow: 0 0 30px rgba(191,162,100,0.4); } 50% { text-shadow: 0 0 60px rgba(212,175,120,0.7), 0 0 100px rgba(191,162,100,0.3); } }

  /* OTP inputs */
  .otp-input {
    width: 48px;
    height: 56px;
    text-align: center;
    font-size: 22px;
    font-weight: 800;
    font-family: var(--font-display);
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    -webkit-appearance: none;
    caret-color: var(--gold-2);
  }

  .otp-input:focus {
    border-color: rgba(191,162,100,0.6);
    background: var(--elevated);
    box-shadow: 0 0 0 3px rgba(191,162,100,0.08);
  }

  .otp-input[data-filled="true"] {
    border-color: rgba(191,162,100,0.4);
    color: var(--gold-2);
  }

  /* ── TEXTAREA ── */
  .auth-textarea {
    width: 100%;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    color: var(--text-primary);
    font-family: var(--font-body);
    font-size: 14px;
    outline: none;
    resize: vertical;
    min-height: 96px;
    max-height: 200px;
    transition: border-color 0.25s, box-shadow 0.25s;
    line-height: 1.6;
  }

  .auth-textarea::placeholder { color: var(--text-dim); }

  .auth-textarea:focus {
    border-color: rgba(191,162,100,0.5);
    box-shadow: 0 0 0 3px rgba(191,162,100,0.06);
  }

  /* ── LEFT PANEL QUOTE SLIDER ── */
  @keyframes slide-quote { 0% { opacity: 0; transform: translateY(12px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-12px); } }

  .grain-auth {
    position: absolute;
    inset: -50%;
    width: 200%;
    height: 200%;
    opacity: 0.015;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// TAXONOMY DATA (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const START_YEARS = Array.from({ length: 16 }, (_, i) =>
  (currentYear - 15 + i).toString(),
).reverse();
const END_YEARS = Array.from({ length: 16 }, (_, i) =>
  (currentYear + i).toString(),
);

const COUNTRIES = [
  "India",
  "United States of America",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "Germany",
  "France",
  "United Arab Emirates",
  "Japan",
  "South Korea",
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Armenia",
  "Austria",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Bulgaria",
  "Chile",
  "China",
  "Colombia",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czechia",
  "Denmark",
  "Egypt",
  "Estonia",
  "Fiji",
  "Finland",
  "Georgia",
  "Ghana",
  "Greece",
  "Hungary",
  "Iceland",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kuwait",
  "Lebanon",
  "Malaysia",
  "Maldives",
  "Mauritius",
  "Mexico",
  "Morocco",
  "Myanmar",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Oman",
  "Pakistan",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Thailand",
  "Turkey",
  "Ukraine",
  "Vietnam",
  "Zambia",
  "Zimbabwe",
].sort();

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const INSTITUTIONS = [
  "IIT Bombay",
  "IIT Delhi",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Kharagpur",
  "IIT Roorkee",
  "IIT Guwahati",
  "IIT Hyderabad",
  "IIT Indore",
  "BITS Pilani",
  "VIT Vellore",
  "SRM University",
  "Manipal University",
  "DTU Delhi",
  "NSUT Delhi",
  "IIIT Hyderabad",
  "IIIT Delhi",
  "NIT Trichy",
  "NIT Warangal",
  "NIT Surathkal",
  "NIT Calicut",
  "MNIT Jaipur",
  "JECRC Foundation",
  "JECRC University",
  "LNMIIT Jaipur",
  "Manipal University Jaipur",
  "Poornima College of Engineering",
  "Amity University",
  "Master's Union",
  "Scaler School of Technology",
].sort();

const COURSES = [
  "B.Tech",
  "B.E.",
  "BCA",
  "B.Sc",
  "BBA",
  "B.Com",
  "B.A.",
  "B.Des",
  "B.Arch",
  "MBBS",
  "LLB",
  "M.Tech",
  "MCA",
  "M.Sc",
  "MBA",
  "PGDM",
  "M.Com",
  "MD",
  "Ph.D",
  "Diploma",
  "Bootcamp",
  "Self-Taught",
].sort();

const SPECIALIZATIONS = [
  "Computer Science (CSE)",
  "Information Technology",
  "Artificial Intelligence & Machine Learning",
  "Data Science",
  "Cybersecurity",
  "Software Engineering",
  "Electronics & Communication (ECE)",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Finance",
  "Marketing",
  "Human Resources",
  "Business Analytics",
  "UI/UX Design",
  "Graphic Design",
  "Product Design",
  "Physics",
  "Mathematics",
  "Economics",
  "Psychology",
  "Corporate Law",
  "General Medicine",
].sort();

const MACRO_DOMAINS = [
  "Engineering",
  "Design",
  "Business / Operations",
  "Marketing",
  "Sales",
  "Science",
  "Healthcare",
  "Arts & Humanities",
  "Legal",
  "Finance & Accounting",
  "Content Creation",
  "Education",
  "Architecture",
  "Government & Policy",
  "Filmmaking",
].sort();

const MICRO_NICHES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "AI / ML Engineer",
  "Data Scientist",
  "Data Analyst",
  "DevOps Engineer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "3D Artist",
  "Director / Filmmaker",
  "Video Editor",
  "Founder / CEO",
  "Product Manager",
  "Venture Capitalist",
  "Investment Banker",
  "Financial Analyst",
  "Growth Marketer",
  "Digital Marketer",
  "SEO Specialist",
  "B2B Sales",
  "Copywriter",
  "Journalist",
  "Physician",
  "Researcher",
  "Professor",
  "Corporate Lawyer",
].sort();

const RAW_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "React.js",
  "Next.js",
  "Node.js",
  "Django",
  "Flask",
  "Java",
  "C++",
  "Go",
  "Rust",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "Firebase",
  "AWS",
  "Google Cloud",
  "Azure",
  "Docker",
  "Kubernetes",
  "Git",
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "Computer Vision",
  "NLP",
  "Figma",
  "Adobe XD",
  "Photoshop",
  "Illustrator",
  "Premiere Pro",
  "After Effects",
  "Blender",
  "Unity",
  "Unreal Engine",
  "SEO",
  "SEM",
  "Google Analytics",
  "Copywriting",
  "B2B Sales",
  "Public Speaking",
  "Financial Modeling",
  "Project Management",
  "Agile",
  "Tableau",
  "Power BI",
  "Blockchain",
].sort();

const LANGUAGES = [
  "English",
  "Hindi",
  "Mandarin",
  "Spanish",
  "French",
  "Arabic",
  "Bengali",
  "Portuguese",
  "German",
  "Japanese",
  "Korean",
  "Tamil",
  "Telugu",
  "Marathi",
  "Turkish",
  "Urdu",
  "Indonesian",
  "Russian",
  "Persian",
];

const CURRENT_STATUSES = [
  "School Student",
  "Undergraduate Student",
  "Postgraduate Student",
  "Working Professional",
  "Content Creator / Influencer",
  "Freelancer",
  "Dropped Out",
  "Building My Own Thing",
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const COUNTRY_CODES = [
  "+91 🇮🇳",
  "+1 🇺🇸",
  "+44 🇬🇧",
  "+61 🇦🇺",
  "+65 🇸🇬",
  "+971 🇦🇪",
  "+81 🇯🇵",
];

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const initialProfile = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  username: "",
  gender: "",
  userState: "",
  country: "",
  countryCode: "+91 🇮🇳",
  mobileNumber: "",
  currentStatus: "",
  institution: "",
  course: "",
  specialization: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  passion: "",
  niche: "",
  parallelPath: "",
  goal3Months: "",
  longTermGoal: "",
  rawSkills: [],
  alignedSkills: [],
  languages: [],
  guardianProfession: "",
  incomeBracket: "",
  financialLaunchpad: "",
  investmentCapacity: "",
  personalFootprint: {
    linkedin: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linktree: "",
    website: "",
  },
  commercialFootprint: {
    linkedinCompany: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linktree: "",
    website: "",
  },
  wildcardInfo: "",
  coreMotivation: "",
};

function profileReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_NESTED":
      return {
        ...state,
        [action.parent]: {
          ...state[action.parent],
          [action.field]: action.value,
        },
      };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, flexShrink: 0 }}>
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

function StepDots({ current, total = 9 }) {
  return (
    <div className="auth-step-dots">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="auth-step-dot"
          data-active={i + 1 === current ? "true" : "false"}
          data-done={i + 1 < current ? "true" : "false"}
        />
      ))}
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="auth-error" style={{ marginBottom: 20 }}>
      <AlertCircle size={15} style={{ flexShrink: 0 }} />
      <span>{msg}</span>
    </div>
  );
}

function CharCount({ value, max }) {
  const len = (value || "").length;
  const warn = len > max * 0.85;
  return (
    <div
      className="char-count"
      style={{
        color: len > max ? "#F87171" : warn ? "var(--gold-3)" : undefined,
      }}
    >
      {len}/{max}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM SEARCH SELECT (dropdown with search, fully visible)
// ─────────────────────────────────────────────────────────────────────────────
function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  allowCustom = false,
  required = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options
    .filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 60);

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={ref} className="auth-dropdown-wrap">
      <button
        type="button"
        className="auth-dropdown-trigger"
        data-open={open ? "true" : "false"}
        onClick={() => setOpen((o) => !o)}
      >
        {value ? (
          <span style={{ color: "var(--text-primary)", fontSize: 14 }}>
            {value}
          </span>
        ) : (
          <span className="placeholder">{placeholder}</span>
        )}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: "var(--text-dim)",
            flexShrink: 0,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="auth-dropdown-menu"
          >
            <input
              autoFocus
              className="auth-dropdown-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && allowCustom && search) {
                  handleSelect(search);
                }
              }}
            />
            {filtered.length === 0 && allowCustom && search && (
              <div
                className="auth-dropdown-item"
                onClick={() => handleSelect(search)}
              >
                + Use "<strong>{search}</strong>"
              </div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt}
                className="auth-dropdown-item"
                data-selected={value === opt ? "true" : "false"}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI SELECT
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Add…",
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options
    .filter(
      (o) =>
        !selected.includes(o) && o.toLowerCase().includes(search.toLowerCase()),
    )
    .slice(0, 50);

  const add = (opt) => {
    onChange([...selected, opt]);
    setSearch("");
  };
  const remove = (opt) => onChange(selected.filter((s) => s !== opt));

  return (
    <div ref={ref} className="auth-dropdown-wrap">
      <button
        type="button"
        className="auth-dropdown-trigger"
        data-open={open ? "true" : "false"}
        onClick={() => setOpen((o) => !o)}
        style={{ minHeight: 48 }}
      >
        <span
          className="placeholder"
          style={{
            color: selected.length
              ? "var(--text-secondary)"
              : "var(--text-dim)",
          }}
        >
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--text-dim)", flexShrink: 0 }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="auth-dropdown-menu"
          >
            <input
              autoFocus
              className="auth-dropdown-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search) {
                  if (allowCustom || options.includes(search)) add(search);
                }
              }}
            />
            {allowCustom && search && !options.includes(search) && (
              <div className="auth-dropdown-item" onClick={() => add(search)}>
                + Add "<strong>{search}</strong>"
              </div>
            )}
            {filtered.map((opt) => (
              <div
                key={opt}
                className="auth-dropdown-item"
                onClick={() => add(opt)}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {selected.length > 0 && (
        <div className="auth-multi-tags">
          {selected.map((s) => (
            <span key={s} className="auth-tag">
              {s}
              <button type="button" onClick={() => remove(s)}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL — animated quote carousel + architectural lines
// ─────────────────────────────────────────────────────────────────────────────
const QUOTES = [
  {
    text: "Everything's got a price.",
    author: "John Wick",
  },
  {
    text: "We can’t win if We can’t if we don’t try.",
    author: "Sonny Hayes",
  },
  {
    text: "The future is real. The past is all made up.",
    author: "Logan Roy",
  },
  {
    text: "I want you to deal with your problems by becoming rich!",
    author: "Jordan Belfort",
  },
  {
    text: "it's all a Fugazzi",
    author: "Mark Hanna",
  },
];

function LeftPanel({ step }) {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const stepLabels = [
    "Identity",
    "Email",
    "Location",
    "Background",
    "Vision",
    "Skills",
    "Resources",
    "Footprint",
    "Canvas",
  ];

  return (
    <div className="auth-left">
      <div className="auth-left-bg" />
      <div className="grain-auth" />
      <div className="auth-left-lines">
        {[0.2, 0.5, 0.8].map((pos, i) => (
          <div
            key={i}
            className="auth-left-line"
            style={{ left: `${pos * 100}%` }}
          />
        ))}
      </div>

      {/* Top logo */}
      <div style={{ padding: "32px 40px", position: "relative", zIndex: 1 }}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.png"
            alt="Discotive"
            style={{ height: 28, objectFit: "contain" }}
          />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 17,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            DISCOTIVE
          </span>
        </Link>
      </div>

      {/* Visual art — geometric gold rings */}
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
        <div style={{ position: "relative", width: 260, height: 260 }}>
          {/* Outer ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "0.5px solid rgba(191,162,100,0.15)",
            }}
          />
          {/* Mid ring */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 40,
              borderRadius: "50%",
              border: "0.5px solid rgba(191,162,100,0.25)",
              borderTopColor: "var(--gold-2)",
            }}
          />
          {/* Inner ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              inset: 80,
              borderRadius: "50%",
              border: "1px solid rgba(191,162,100,0.35)",
              borderTopColor: "transparent",
              borderRightColor: "transparent",
            }}
          />
          {/* Center dot */}
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
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--gold-2)",
                boxShadow: "0 0 20px var(--gold-2)",
              }}
            />
          </div>
          {/* Step indicator on ring */}
          {step >= 1 && step <= 9 && (
            <div
              style={{
                position: "absolute",
                inset: -24,
                borderRadius: "50%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(191,162,100,0.1)",
                  border: "0.5px solid var(--border-gold)",
                  borderRadius: 99,
                  padding: "4px 14px",
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  color: "var(--gold-2)",
                  fontFamily: "var(--font-body)",
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                {stepLabels[step - 1] || "Setup"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quote */}
      <div style={{ padding: "0 40px 48px", position: "relative", zIndex: 1 }}>
        <div
          style={{
            height: 0.5,
            background:
              "linear-gradient(90deg, transparent, var(--border-gold), transparent)",
            marginBottom: 28,
          }}
        />
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              key={quoteIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
            >
              <p
                style={{
                  fontFamily: "var(--font-display)",
                  fontStyle: "italic",
                  fontWeight: 300,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                  marginBottom: 12,
                }}
              >
                "{QUOTES[quoteIdx].text}"
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  letterSpacing: "0.2em",
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
// STEP WRAPPER — consistent heading + step dots
// ─────────────────────────────────────────────────────────────────────────────
function StepWrapper({ step, total = 9, label, title, subtitle, children }) {
  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      <StepDots current={step} total={total} />
      {label && (
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--gold-3)",
            fontFamily: "var(--font-body)",
            marginBottom: 10,
          }}
        >
          {label}
        </p>
      )}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: "clamp(26px, 5vw, 34px)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          marginBottom: 6,
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
            marginBottom: 28,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      )}
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 0 — LOGIN
// ─────────────────────────────────────────────────────────────────────────────
function Step0Login({
  onSubmit,
  onOAuth,
  goToSignup,
  authError,
  isProcessing,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div style={{ marginBottom: 36 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--gold-3)",
            fontFamily: "var(--font-body)",
            marginBottom: 10,
          }}
        >
          Welcome Back
        </p>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "clamp(28px, 5vw, 36px)",
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Sign In
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          Pick up where you left off.
        </p>
      </div>

      <ErrorBox msg={authError} />

      <button
        type="button"
        className="auth-oauth-btn"
        onClick={onOAuth}
        disabled={isProcessing}
        style={{ marginBottom: 16 }}
      >
        {isProcessing ? (
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="auth-divider">
        <div className="auth-divider-line" />
        <span>or</span>
        <div className="auth-divider-line" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email, password);
        }}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">Email address</label>
          <input
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="auth-label">Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ paddingRight: 48 }}
            />
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
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="auth-btn-primary"
          disabled={isProcessing}
          style={{ marginTop: 8 }}
        >
          {isProcessing ? (
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-dim)",
          fontFamily: "var(--font-body)",
        }}
      >
        Don't have an account?{" "}
        <button
          type="button"
          onClick={goToSignup}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--gold-2)",
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "var(--font-body)",
          }}
        >
          Create one
        </button>
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — IDENTITY
// ─────────────────────────────────────────────────────────────────────────────
function Step1Identity({
  profileData,
  setField,
  systemStatus,
  handleSubmit,
  handleOAuth,
  setIsLogin,
  pwScore,
}) {
  const [showPw, setShowPw] = useState(false);
  const pwColors = ["#EF4444", "#EF4444", "#F59E0B", "#22C55E", "#22C55E"];

  return (
    <StepWrapper
      step={1}
      label="Step 1 of 9"
      title="Create your identity."
      subtitle="Tell us who you are. This is the foundation of your profile."
    >
      <ErrorBox msg={systemStatus.error} />

      <button
        type="button"
        className="auth-oauth-btn"
        onClick={handleOAuth}
        disabled={systemStatus.loading}
        style={{ marginBottom: 16 }}
      >
        {systemStatus.loading ? (
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="auth-divider">
        <div className="auth-divider-line" />
        <span>or</span>
        <div className="auth-divider-line" />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
        noValidate
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label className="auth-label">First name</label>
            <input
              className="auth-input"
              type="text"
              value={profileData.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder="Alex"
              required
              maxLength={50}
            />
          </div>
          <div>
            <label className="auth-label">Last name</label>
            <input
              className="auth-input"
              type="text"
              value={profileData.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder="Chen"
              required
              maxLength={50}
            />
          </div>
        </div>
        <div>
          <label className="auth-label">Email address</label>
          <input
            className="auth-input"
            type="email"
            value={profileData.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="you@example.com"
            required
            maxLength={120}
          />
        </div>
        <div>
          <label className="auth-label">Password</label>
          <div style={{ position: "relative" }}>
            <input
              className="auth-input"
              type={showPw ? "text" : "password"}
              value={profileData.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              style={{ paddingRight: 48 }}
            />
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
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4].map((l) => (
              <div
                key={l}
                className="pw-bar"
                style={{
                  flex: 1,
                  background: pwScore >= l ? pwColors[pwScore] : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="auth-btn-primary"
          disabled={systemStatus.loading}
          style={{ marginTop: 8 }}
        >
          {systemStatus.loading ? (
            <Loader2
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
            />
          ) : (
            <>
              <span>Continue</span>
              <ChevronRight size={15} />
            </>
          )}
        </button>
      </form>

      <p
        style={{
          marginTop: 24,
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-dim)",
          fontFamily: "var(--font-body)",
        }}
      >
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--gold-2)",
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "var(--font-body)",
          }}
        >
          Sign in
        </button>
      </p>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1.5 — EMAIL VERIFICATION (after Step 1, before Step 2)
// ─────────────────────────────────────────────────────────────────────────────
function StepEmailVerify({ email, firstName, onVerified, onChangeEmail }) {
  // <-- Added onChangeEmail
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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

  const verify = async (code) => {
    setVerifying(true);
    setError("");
    try {
      const fn = httpsCallable(functions, "verifyEmailOTP");
      await fn({ otp: code, email: email });
      setSuccess(true);
      setTimeout(() => onVerified(), 1400);
    } catch (err) {
      setError(err.message || "That code is incorrect. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setVerifying(false);
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
            background: "rgba(34,197,94,0.1)",
            border: "0.5px solid rgba(34,197,94,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <ShieldCheck size={36} style={{ color: "#22C55E" }} />
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
          Email verified.
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-body)",
          }}
        >
          Identity confirmed. Moving forward…
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--gold-3)",
            fontFamily: "var(--font-body)",
            marginBottom: 10,
          }}
        >
          Email Verification
        </p>
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
            lineHeight: 1.6,
          }}
        >
          We sent a 6-digit code to{" "}
          <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
        </p>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
            marginTop: 6,
          }}
        >
          Check your spam folder if you don't see it within a minute.
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
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            className="otp-input"
            data-filled={digit ? "true" : "false"}
          />
        ))}
      </div>

      <button
        type="button"
        className="auth-btn-primary"
        onClick={() => verify(otp.join(""))}
        disabled={verifying || otp.some((d) => !d)}
        style={{ marginBottom: 16 }}
      >
        {verifying ? (
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          "Verify Code"
        )}
      </button>

      {/* RE-ADDED SPACE-BETWEEN FOR THE TWO BUTTONS */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={resend}
          disabled={resending || cooldown > 0}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: resending || cooldown > 0 ? 0.5 : 1,
            transition: "opacity 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-dim)")
          }
        >
          <RefreshCw size={13} />
          {cooldown > 0
            ? `Resend in ${cooldown}s`
            : resending
              ? "Sending…"
              : "Resend code"}
        </button>

        {/* NEW WRONG EMAIL BUTTON */}
        <button
          type="button"
          onClick={onChangeEmail}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text-dim)",
            fontFamily: "var(--font-body)",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-dim)")
          }
        >
          Wrong email?
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — COORDINATES (username, gender, location)
// ─────────────────────────────────────────────────────────────────────────────
function Step2Coordinates({
  profileData,
  setField,
  systemStatus,
  handleSubmit,
  setStep,
  usernameAvailable,
  debouncedUsername,
}) {
  return (
    <StepWrapper
      step={2}
      label="Step 2 of 9"
      title="Your coordinates."
      subtitle="Where are you based, and what should people call you?"
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">Your unique username (handle)</label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
              }}
            >
              @
            </span>
            <input
              className="auth-input"
              style={{ paddingLeft: 30, paddingRight: 44 }}
              type="text"
              value={profileData.username}
              onChange={(e) =>
                setField(
                  "username",
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                )
              }
              placeholder="yourname"
              required
              maxLength={30}
            />
            <div
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              {usernameAvailable === true && (
                <CheckCircle2 size={16} style={{ color: "#22C55E" }} />
              )}
              {usernameAvailable === false && (
                <X size={16} style={{ color: "#EF4444" }} />
              )}
              {usernameAvailable === null && debouncedUsername.length > 2 && (
                <Loader2
                  size={16}
                  style={{
                    color: "var(--text-dim)",
                    animation: "spin 1s linear infinite",
                  }}
                />
              )}
            </div>
          </div>
          {usernameAvailable === false && (
            <p
              style={{
                fontSize: 11,
                color: "#EF4444",
                fontFamily: "var(--font-body)",
                marginTop: 4,
              }}
            >
              This username is taken. Try another one.
            </p>
          )}
          {usernameAvailable === true && (
            <p
              style={{
                fontSize: 11,
                color: "#22C55E",
                fontFamily: "var(--font-body)",
                marginTop: 4,
              }}
            >
              Great, that's available!
            </p>
          )}
        </div>

        <div>
          <label className="auth-label">How do you identify?</label>
          <select
            className="auth-select"
            value={profileData.gender}
            onChange={(e) => setField("gender", e.target.value)}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Non-binary / Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label className="auth-label">State / Province</label>
            <SearchSelect
              options={INDIAN_STATES}
              value={profileData.userState}
              onChange={(v) => setField("userState", v)}
              placeholder="e.g. Rajasthan"
              allowCustom
            />
          </div>
          <div>
            <label className="auth-label">Country</label>
            <SearchSelect
              options={COUNTRIES}
              value={profileData.country}
              onChange={(v) => setField("country", v)}
              placeholder="e.g. India"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(1)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — BACKGROUND
// ─────────────────────────────────────────────────────────────────────────────
function Step3Background({
  profileData,
  setField,
  systemStatus,
  handleSubmit,
  setStep,
}) {
  return (
    <StepWrapper
      step={3}
      label="Step 3 of 9"
      title="Your background."
      subtitle="Tell us where you're starting from — school, college, or work."
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">Current situation</label>
          <SearchSelect
            options={CURRENT_STATUSES}
            value={profileData.currentStatus}
            onChange={(v) => setField("currentStatus", v)}
            placeholder="Pick the one that fits you"
            required
          />
        </div>
        <div>
          <label className="auth-label">
            College / University / Organisation (optional)
          </label>
          <SearchSelect
            options={INSTITUTIONS}
            value={profileData.institution}
            onChange={(v) => setField("institution", v)}
            placeholder="Search or type yours…"
            allowCustom
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label className="auth-label">Degree / Course (optional)</label>
            <SearchSelect
              options={COURSES}
              value={profileData.course}
              onChange={(v) => setField("course", v)}
              placeholder="e.g. B.Tech"
              allowCustom
            />
          </div>
          <div>
            <label className="auth-label">Specialisation (optional)</label>
            <SearchSelect
              options={SPECIALIZATIONS}
              value={profileData.specialization}
              onChange={(v) => setField("specialization", v)}
              placeholder="e.g. Computer Science"
              allowCustom
            />
          </div>
        </div>

        <div style={{ paddingTop: 8, borderTop: "0.5px solid var(--border)" }}>
          <label className="auth-label" style={{ marginBottom: 12 }}>
            Study period (optional)
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Start month
              </p>
              <SearchSelect
                options={MONTHS}
                value={profileData.startMonth}
                onChange={(v) => setField("startMonth", v)}
                placeholder="Month"
              />
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Start year
              </p>
              <SearchSelect
                options={START_YEARS}
                value={profileData.startYear}
                onChange={(v) => setField("startYear", v)}
                placeholder="Year"
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                End / graduation month
              </p>
              <SearchSelect
                options={MONTHS}
                value={profileData.endMonth}
                onChange={(v) => setField("endMonth", v)}
                placeholder="Month"
              />
            </div>
            <div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-dim)",
                  marginBottom: 6,
                  fontFamily: "var(--font-body)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                End / graduation year
              </p>
              <SearchSelect
                options={END_YEARS}
                value={profileData.endYear}
                onChange={(v) => setField("endYear", v)}
                placeholder="Year"
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(2)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — VISION
// ─────────────────────────────────────────────────────────────────────────────
function Step4Vision({
  profileData,
  setField,
  systemStatus,
  handleSubmit,
  setStep,
}) {
  return (
    <StepWrapper
      step={4}
      label="Step 4 of 9"
      title="Your vision."
      subtitle="What field are you building a career in, and what's your big goal?"
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">Your main field / domain</label>
          <SearchSelect
            options={MACRO_DOMAINS}
            value={profileData.passion}
            onChange={(v) => setField("passion", v)}
            placeholder="e.g. Engineering, Design, Business…"
            allowCustom
            required
          />
        </div>
        <div>
          <label className="auth-label">
            Your specific role / title (optional)
          </label>
          <SearchSelect
            options={MICRO_NICHES}
            value={profileData.niche}
            onChange={(v) => setField("niche", v)}
            placeholder="e.g. Full-Stack Developer, Product Manager…"
            allowCustom
          />
        </div>
        <div>
          <label className="auth-label">
            Are you pursuing anything else on the side? (optional)
          </label>
          <SearchSelect
            options={MACRO_DOMAINS}
            value={profileData.parallelPath}
            onChange={(v) => setField("parallelPath", v)}
            placeholder="e.g. a startup alongside your degree"
            allowCustom
          />
        </div>
        <div>
          <label className="auth-label">
            What do you want to achieve in the next 3 months?
          </label>
          <textarea
            className="auth-textarea"
            value={profileData.goal3Months}
            onChange={(e) =>
              setField("goal3Months", e.target.value.slice(0, 300))
            }
            placeholder="Be specific — a milestone, a skill, a project…"
            required
          />
          <CharCount value={profileData.goal3Months} max={300} />
        </div>
        <div>
          <label className="auth-label">
            What does long-term success look like for you?
          </label>
          <textarea
            className="auth-textarea"
            value={profileData.longTermGoal}
            onChange={(e) =>
              setField("longTermGoal", e.target.value.slice(0, 400))
            }
            placeholder="Paint the big picture — your 5-year endgame."
            required
          />
          <CharCount value={profileData.longTermGoal} max={400} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(3)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — SKILLS
// ─────────────────────────────────────────────────────────────────────────────
function Step5Skills({
  profileData,
  setField,
  systemStatus,
  setSystemStatus,
  setStep,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (profileData.languages.length === 0)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please add at least one language you speak.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(6);
  };

  return (
    <StepWrapper
      step={5}
      label="Step 5 of 9"
      title="Your skills."
      subtitle="What do you know? Add tools, technologies, and languages you use."
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">Skills & tools (optional)</label>
          <MultiSelect
            options={RAW_SKILLS}
            selected={profileData.rawSkills}
            onChange={(v) => setField("rawSkills", v)}
            placeholder="Search and add skills…"
            allowCustom
          />
        </div>
        {profileData.rawSkills.length > 0 && (
          <div>
            <label className="auth-label">
              Which of these are your strongest? (optional)
            </label>
            <MultiSelect
              options={profileData.rawSkills}
              selected={profileData.alignedSkills}
              onChange={(v) => setField("alignedSkills", v)}
              placeholder="Pick your top skills…"
            />
          </div>
        )}
        <div>
          <label className="auth-label">Languages you speak (required)</label>
          <MultiSelect
            options={LANGUAGES}
            selected={profileData.languages}
            onChange={(v) => setField("languages", v)}
            placeholder="Add languages…"
            allowCustom
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(4)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — RESOURCES
// ─────────────────────────────────────────────────────────────────────────────
function Step6Resources({ profileData, setField, setSystemStatus, setStep }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(7);
  };

  return (
    <StepWrapper
      step={6}
      label="Step 6 of 9"
      title="Your resources."
      subtitle="We use this to suggest the most realistic paths and tools for you."
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">
            What's your parent's / guardian's profession? (optional)
          </label>
          <SearchSelect
            options={MACRO_DOMAINS}
            value={profileData.guardianProfession}
            onChange={(v) => setField("guardianProfession", v)}
            placeholder="e.g. Business, Healthcare…"
            allowCustom
          />
        </div>
        <div>
          <label className="auth-label">
            Approximate household income bracket (optional)
          </label>
          <select
            className="auth-select"
            value={profileData.incomeBracket}
            onChange={(e) => setField("incomeBracket", e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="< 5L">Less than ₹5 Lakhs / year</option>
            <option value="5L - 10L">₹5L – ₹10L / year</option>
            <option value="> 10L">More than ₹10L / year</option>
          </select>
        </div>
        <div>
          <label className="auth-label">
            How are you funding your journey?
          </label>
          <select
            className="auth-select"
            value={profileData.financialLaunchpad}
            onChange={(e) => setField("financialLaunchpad", e.target.value)}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="Bootstrapping">Self-funded / Bootstrapping</option>
            <option value="Limited Support">Some family support</option>
            <option value="Highly Backed">
              Well funded / Highly supported
            </option>
          </select>
        </div>
        <div>
          <label className="auth-label">
            How much can you invest in your career? (tools, courses, gear)
          </label>
          <select
            className="auth-select"
            value={profileData.investmentCapacity}
            onChange={(e) => setField("investmentCapacity", e.target.value)}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="Minimal">Minimal — free tools only</option>
            <option value="Moderate">
              Moderate — occasional paid tools / courses
            </option>
            <option value="High">
              High — premium setups, mentors, subscriptions
            </option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(5)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7 — DIGITAL FOOTPRINT
// ─────────────────────────────────────────────────────────────────────────────
function Step7Footprint({
  profileData,
  setNestedField,
  systemStatus,
  handleSubmit,
  setStep,
}) {
  const fields = [
    { key: "website", icon: Globe, label: "Website" },
    { key: "linkedin", icon: Linkedin, label: "LinkedIn" },
    { key: "github", icon: Github, label: "GitHub" },
    { key: "twitter", icon: Twitter, label: "X / Twitter" },
    { key: "instagram", icon: Instagram, label: "Instagram" },
    { key: "youtube", icon: Youtube, label: "YouTube" },
    { key: "linktree", icon: LinkIcon, label: "Linktree" },
  ];

  return (
    <StepWrapper
      step={7}
      label="Step 7 of 9"
      title="Your online presence."
      subtitle="Add your links so others can find you. Everything here is optional."
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              marginBottom: 12,
            }}
          >
            Personal
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fields.map(({ key, icon: Icon, label }) => (
              <div key={key} style={{ position: "relative" }}>
                <Icon
                  size={15}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  type="url"
                  className="auth-input"
                  style={{ paddingLeft: 40, fontSize: 13 }}
                  value={profileData.personalFootprint[key] || ""}
                  onChange={(e) =>
                    setNestedField("personalFootprint", key, e.target.value)
                  }
                  placeholder={label}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-dim)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "var(--font-body)",
              marginBottom: 12,
            }}
          >
            Professional / Brand
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fields.map(({ key, icon: Icon, label }) => {
              const commKey = key === "linkedin" ? "linkedinCompany" : key;
              return (
                <div key={commKey} style={{ position: "relative" }}>
                  <Icon
                    size={15}
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-dim)",
                    }}
                  />
                  <input
                    type="url"
                    className="auth-input"
                    style={{ paddingLeft: 40, fontSize: 13 }}
                    value={profileData.commercialFootprint[commKey] || ""}
                    onChange={(e) =>
                      setNestedField(
                        "commercialFootprint",
                        commKey,
                        e.target.value,
                      )
                    }
                    placeholder={
                      label +
                      (key === "linkedin" ? " Company" : " (brand / business)")
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(6)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            style={{ flex: 1 }}
          >
            Continue <ChevronRight size={15} />
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 — FINAL CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function Step8Canvas({
  profileData,
  setField,
  systemStatus,
  handleSubmit,
  setStep,
}) {
  return (
    <StepWrapper
      step={8}
      label="Last step"
      title="One final thing."
      subtitle="Let us understand what truly drives you — and anything we should know."
    >
      <ErrorBox msg={systemStatus.error} />
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label className="auth-label">
            What's your biggest motivation? Why are you building this?
            (required)
          </label>
          <textarea
            className="auth-textarea"
            value={profileData.coreMotivation}
            onChange={(e) =>
              setField("coreMotivation", e.target.value.slice(0, 600))
            }
            placeholder="Be honest — is it financial freedom, impact, recognition, passion? Whatever it is, write it here."
            required
            style={{ minHeight: 120 }}
          />
          <CharCount value={profileData.coreMotivation} max={600} />
        </div>
        <div>
          <label className="auth-label">
            Anything else we should know about you? (optional)
          </label>
          <textarea
            className="auth-textarea"
            value={profileData.wildcardInfo}
            onChange={(e) =>
              setField("wildcardInfo", e.target.value.slice(0, 1000))
            }
            placeholder="Unique challenges you're facing, mentors you admire, unconventional things about your path…"
          />
          <CharCount value={profileData.wildcardInfo} max={1000} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button
            type="button"
            className="auth-btn-ghost"
            onClick={() => setStep(7)}
          >
            Back
          </button>
          <button
            type="submit"
            className="auth-btn-primary"
            disabled={systemStatus.isBooting}
            style={{ flex: 1, position: "relative" }}
          >
            {systemStatus.isBooting ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Setting up…
              </>
            ) : (
              "Launch My OS"
            )}
          </button>
        </div>
      </form>
    </StepWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SEQUENCE — on-theme MAANG-grade animation
// ─────────────────────────────────────────────────────────────────────────────
function SetupSequence({ onComplete }) {
  const [taskIndex, setTaskIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("tasks");
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const tasks = [
    "Initializing your command center",
    "Building your execution timeline",
    "Connecting to the global leaderboard",
    "Securing your asset vault",
    "Creating your operator profile",
    "Everything's ready",
  ];

  const animateScore = useCallback((start, end, ms = 30) => {
    let cur = start;
    const interval = setInterval(() => {
      cur += 1;
      setScore(cur);
      if (cur >= end) clearInterval(interval);
    }, ms);
  }, []);

  useEffect(() => {
    if (phase !== "tasks") return;
    if (taskIndex < tasks.length) {
      const t = setTimeout(
        () => {
          if (taskIndex === 0) animateScore(0, 20, 50);
          setTaskIndex((i) => i + 1);
        },
        taskIndex === 0 ? 2200 : 1100,
      );
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase("bonus"), 400);
      return () => clearTimeout(t);
    }
  }, [taskIndex, phase, tasks.length, animateScore]);

  useEffect(() => {
    if (phase === "bonus") {
      addToast("Initialization bonus credited", "green");
      const t1 = setTimeout(() => {
        animateScore(20, 70, 25);
        const t2 = setTimeout(() => setPhase("done"), 2800);
        return () => clearTimeout(t2);
      }, 1200);
      return () => clearTimeout(t1);
    }
  }, [phase, animateScore, addToast]);

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6 }}
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
      {/* Background orb */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500,
          height: 500,
          background:
            "radial-gradient(ellipse, rgba(191,162,100,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ position: "absolute", top: 40, textAlign: "center" }}
      >
        <p
          style={{
            fontSize: 10,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "rgba(191,162,100,0.5)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
          }}
        >
          DISCOTIVE OS
        </p>
      </motion.div>

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 48,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: window.innerWidth > 640 ? "1fr 1fr" : "1fr",
            gap: 40,
            alignItems: "center",
          }}
        >
          {/* Task list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {tasks.map((task, i) => {
              if (i > taskIndex) return null;
              const isDone = i < taskIndex || phase !== "tasks";
              const isActive = i === taskIndex && phase === "tasks";
              return (
                <motion.div
                  key={task}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isActive && (
                      <Loader2
                        size={18}
                        style={{
                          color: "var(--gold-2)",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                    )}
                    {isDone && (
                      <CheckCircle2 size={18} style={{ color: "#22C55E" }} />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: isDone ? 400 : 600,
                      color: isDone
                        ? "rgba(245,240,232,0.35)"
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

          {/* Score display */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderLeft:
                window.innerWidth > 640
                  ? "0.5px solid rgba(255,255,255,0.06)"
                  : "none",
              paddingLeft: window.innerWidth > 640 ? 40 : 0,
            }}
          >
            <p
              style={{
                fontSize: 9,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
                marginBottom: 16,
              }}
            >
              Discotive Score
            </p>
            <motion.div style={{ position: "relative" }}>
              <motion.span
                key={score}
                style={{
                  fontSize: "clamp(72px, 14vw, 110px)",
                  fontWeight: 900,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                  display: "block",
                  color:
                    phase === "bonus" ? "var(--gold-2)" : "var(--text-primary)",
                  transition: "color 0.6s",
                  textShadow:
                    phase === "bonus"
                      ? "0 0 40px rgba(212,175,120,0.4)"
                      : "none",
                }}
              >
                {score}
              </motion.span>
              <AnimatePresence>
                {phase === "bonus" && (
                  <motion.span
                    initial={{ opacity: 0, y: 16, x: 16, scale: 0.7 }}
                    animate={{ opacity: 1, y: -32, x: 32, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, type: "spring" }}
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      fontSize: 28,
                      fontWeight: 900,
                      color: "var(--gold-2)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    +50
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>

            <AnimatePresence>
              {phase === "bonus" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 16,
                    padding: "6px 16px",
                    background: "rgba(191,162,100,0.1)",
                    border: "0.5px solid rgba(191,162,100,0.3)",
                    borderRadius: 99,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Sparkles size={13} style={{ color: "var(--gold-2)" }} />
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
        </div>
      </div>

      {/* Toast stack */}
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
                initial={{ opacity: 0, y: 10, x: -8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ type: "spring", damping: 22, stiffness: 280 }}
                style={{
                  padding: "12px 16px",
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
                    : t.type === "red"
                      ? {
                          background: "rgba(26,5,5,0.95)",
                          border: "0.5px solid rgba(239,68,68,0.3)",
                          color: "#F87171",
                        }
                      : {
                          background: "rgba(22,22,22,0.95)",
                          border: "0.5px solid rgba(255,255,255,0.08)",
                          color: "var(--text-secondary)",
                        }),
                }}
              >
                {t.type === "green" && <CheckCircle2 size={14} />}
                {t.type === "red" && <AlertTriangle size={14} />}
                {t.type === "grey" && (
                  <Activity
                    size={14}
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  />
                )}
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
// PREMIUM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function PremiumPrompt({ firstName, onUpgrade, onContinue }) {
  const features = [
    { icon: Zap, label: "Unlimited execution nodes", sub: "No 15-node cap" },
    {
      icon: Database,
      label: "100MB asset vault",
      sub: "Up to 50 verified assets",
    },
    {
      icon: BarChart2,
      label: "Competitor insights",
      sub: "See what top-ranked operators do differently",
    },
    {
      icon: Crown,
      label: "Daily execution journal",
      sub: "Pro-only reflection system",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{ textAlign: "center" }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: "linear-gradient(135deg, #8B7240, #D4AF78)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 0 32px rgba(191,162,100,0.25)",
        }}
      >
        <Crown size={28} style={{ color: "#0a0a0a" }} />
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 14px",
          background: "rgba(191,162,100,0.08)",
          border: "0.5px solid rgba(191,162,100,0.25)",
          borderRadius: 99,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--gold-2)",
            animation: "pulse 2s infinite",
          }}
        />
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--gold-3)",
            letterSpacing: "0.2em",
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
        Welcome, {firstName}.
      </h2>
      <p
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 20,
          color: "var(--gold-2)",
          marginBottom: 24,
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
          margin: "0 auto 28px",
        }}
      >
        You're on the Essential plan. Upgrade to Pro for{" "}
        <strong style={{ color: "var(--text-primary)" }}>₹99/month</strong> to
        unlock the full career engine.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 28,
          textAlign: "left",
        }}
      >
        {features.map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "var(--surface)",
              border: "0.5px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(191,162,100,0.1)",
                border: "0.5px solid rgba(191,162,100,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} style={{ color: "var(--gold-2)" }} />
            </div>
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
            <Check
              size={14}
              style={{
                color: "var(--gold-3)",
                marginLeft: "auto",
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="auth-btn-primary"
        onClick={onUpgrade}
        style={{ marginBottom: 10 }}
      >
        <Crown size={15} /> Upgrade to Pro — ₹99/month
      </button>
      <button
        type="button"
        onClick={onContinue}
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
        Continue with Essential <ArrowRight size={13} />
      </button>
      <p
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.15)",
          fontFamily: "var(--font-body)",
          marginTop: 16,
        }}
      >
        Cancel anytime. Indian pricing — ₹99/month. No hidden fees.
      </p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────
export default function AuthOrchestrator() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.state?.isLogin !== false);
  const [step, setStep] = useState(1);
  const [systemStatus, setSystemStatus] = useState({
    loading: false,
    error: "",
    success: "",
    isBooting: false,
    showSetupSequence: false,
  });
  const [profileData, dispatch] = useReducer(profileReducer, initialProfile);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const debouncedUsername = useDebounce(profileData.username, 600);
  const setField = useCallback(
    (field, value) => dispatch({ type: "SET_FIELD", field, value }),
    [],
  );
  const setNestedField = useCallback(
    (parent, field, value) =>
      dispatch({ type: "SET_NESTED", parent, field, value }),
    [],
  );

  // CSS injection
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // spin keyframe
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // Username availability check
  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("identity.username", "==", debouncedUsername.toLowerCase()),
          ),
        );
        if (active) setUsernameAvailable(snap.empty);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [debouncedUsername]);

  // Auth state observer
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (
        !user ||
        systemStatus.isBooting ||
        systemStatus.showSetupSequence ||
        step === "premium_prompt"
      )
        return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (
            data?.onboardingComplete === false ||
            data?.isGhostUser === true
          ) {
            setIsLogin(false);
            setIsGoogleUser(
              !!user.providerData?.find((p) => p.providerId === "google.com"),
            );
            dispatch({
              type: "HYDRATE",
              payload: {
                firstName: data?.identity?.firstName || "",
                lastName: data?.identity?.lastName || "",
                email: data?.identity?.email || user.email || "",
                username: data?.identity?.username || "",
              },
            });
            setStep(2);
            return;
          }
          navigate("/app", { replace: true });
        } else {
          setIsLogin(false);
          setStep(2);
        }
      } catch {}
    });
    return unsub;
  }, [navigate, systemStatus.isBooting, systemStatus.showSetupSequence, step]);

  const pwScore = (() => {
    const p = profileData.password;
    let s = 0;
    if (p.length > 7) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  // ── HANDLERS ──
  const handleLogin = async (email, password) => {
    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app", { replace: true });
    } catch {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: "Incorrect email or password. Please try again.",
      }));
    }
  };

  const handleSocialAuth = async () => {
    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const safeEmail = user.email;
      const existingSnap = await getDoc(doc(db, "users", user.uid));
      if (existingSnap.exists()) {
        const userData = existingSnap.data();
        if (
          userData?.onboardingComplete === false ||
          userData?.isGhostUser === true
        ) {
          setIsGoogleUser(true);
          setIsLogin(false);
          setSystemStatus((p) => ({ ...p, loading: false }));
          setStep(2);
          return;
        }
        setSystemStatus((p) => ({ ...p, loading: false }));
        navigate("/app", { replace: true });
        return;
      }
      const nameParts = (user.displayName || "Operator").split(" ");
      dispatch({
        type: "HYDRATE",
        payload: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: safeEmail,
          username: safeEmail
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
        },
      });
      const today = new Date().toISOString().split("T")[0];
      await setDoc(doc(db, "users", user.uid), {
        identity: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: safeEmail,
          username: "",
          gender: "",
        },
        onboardingComplete: false,
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
      setIsGoogleUser(true);
      setIsLogin(false);
      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep(2);
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  // Step 1 — validate and move to email verify
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (
      !profileData.email ||
      !profileData.password ||
      !profileData.firstName ||
      !profileData.lastName
    )
      return setSystemStatus((p) => ({
        ...p,
        error: "Please fill in all fields before continuing.",
      }));
    if (pwScore < 2)
      return setSystemStatus((p) => ({
        ...p,
        error:
          "Your password is too weak. Add numbers and a mix of upper/lowercase.",
      }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email))
      return setSystemStatus((p) => ({
        ...p,
        error: "That doesn't look like a valid email address.",
      }));

    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      const methods = await import("firebase/auth").then((m) =>
        m.fetchSignInMethodsForEmail(auth, profileData.email),
      );
      if (methods && methods.length > 0)
        return setSystemStatus((p) => ({
          ...p,
          loading: false,
          error: "An account with this email already exists. Sign in instead.",
        }));

      // Send verification email before moving to email verify step
      try {
        const sendFn = httpsCallable(functions, "sendVerificationEmail");
        await sendFn({
          email: profileData.email,
          firstName: profileData.firstName,
        });
      } catch {}

      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep("verify_email");
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error:
          err.code === "auth/invalid-email"
            ? "Invalid email format."
            : "Verification failed. Please try again.",
      }));
    }
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    if (
      !profileData.username ||
      !profileData.userState ||
      !profileData.country ||
      !profileData.gender
    )
      return setSystemStatus((p) => ({
        ...p,
        error: "Please fill in all required fields.",
      }));
    if (usernameAvailable === false)
      return setSystemStatus((p) => ({
        ...p,
        error: "That username is already taken. Please choose another.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(3);
  };

  const handleStep3 = (e) => {
    e.preventDefault();
    if (profileData.startMonth && !profileData.startYear)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please add a start year too.",
      }));
    if (profileData.endMonth && !profileData.endYear)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please add an end year too.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(4);
  };

  const handleStep4 = (e) => {
    e.preventDefault();
    if (!profileData.passion)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please select your main field.",
      }));
    if (profileData.passion === profileData.parallelPath)
      return setSystemStatus((p) => ({
        ...p,
        error: "Your main field and side pursuit cannot be the same.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(5);
  };

  const handleStep7 = (e) => {
    e.preventDefault();
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(8);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.coreMotivation.trim())
      return setSystemStatus((p) => ({
        ...p,
        error:
          "Please share your motivation — it helps us personalise your journey.",
      }));

    setSystemStatus((p) => ({ ...p, isBooting: true, error: "" }));
    try {
      let uid;
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          profileData.email,
          profileData.password,
        );
        uid = cred.user.uid;
      }

      const today = new Date().toISOString().split("T")[0];
      const payload = {
        identity: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          username: profileData.username.toLowerCase(),
          gender: profileData.gender,
          domain: profileData.passion,
          niche: profileData.niche,
          parallelGoal: profileData.parallelPath,
          country: profileData.country,
        },
        onboardingComplete: true,
        isGhostUser: false,
        location: {
          state: profileData.userState,
          country: profileData.country,
          displayLocation: `${profileData.userState}, ${profileData.country}`,
        },
        baseline: {
          currentStatus: profileData.currentStatus,
          institution: profileData.institution,
          course: profileData.course,
          specialization: profileData.specialization,
          startMonth: profileData.startMonth,
          startYear: profileData.startYear,
          endMonth: profileData.endMonth,
          endYear: profileData.endYear,
        },
        vision: {
          passion: profileData.passion,
          niche: profileData.niche,
          parallelPath: profileData.parallelPath,
          goal3Months: profileData.goal3Months,
          longTermGoal: profileData.longTermGoal,
        },
        skills: {
          rawSkills: profileData.rawSkills,
          alignedSkills: profileData.alignedSkills,
          languages: profileData.languages,
        },
        resources: {
          guardianProfession: profileData.guardianProfession,
          incomeBracket: profileData.incomeBracket,
          financialLaunchpad: profileData.financialLaunchpad,
          investmentCapacity: profileData.investmentCapacity,
        },
        footprint: {
          personal: profileData.personalFootprint,
          commercial: profileData.commercialFootprint,
          location: `${profileData.userState}, ${profileData.country}`,
        },
        wildcard: {
          wildcardInfo: profileData.wildcardInfo,
          coreMotivation: profileData.coreMotivation,
        },
        discotiveScore: {
          current: 0,
          last24h: 0,
          lastLoginDate: today,
          streak: 1,
          lastAmount: 0,
          lastReason: "OS Booted",
          lastUpdatedAt: new Date().toISOString(),
        },
        score_history: [{ date: today, score: 0 }],
        consistency_log: [today],
        login_history: [today],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), payload, { merge: true });
      await awardOnboardingComplete(uid);

      setSystemStatus((p) => ({
        ...p,
        isBooting: false,
        showSetupSequence: true,
      }));
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        isBooting: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  // ── RENDER ──
  const numericStep = typeof step === "number" ? step : 0;

  return (
    <div className="auth-root">
      <LeftPanel step={numericStep} />

      <div className="auth-right">
        <div className="auth-form-container">
          <AnimatePresence mode="wait">
            {isLogin && (
              <Step0Login
                key="login"
                onSubmit={handleLogin}
                onOAuth={handleSocialAuth}
                goToSignup={() => {
                  setIsLogin(false);
                  setStep(1);
                }}
                authError={systemStatus.error}
                isProcessing={systemStatus.loading}
              />
            )}
            {!isLogin && step === 1 && (
              <Step1Identity
                key="s1"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSubmit={handleStep1}
                handleOAuth={handleSocialAuth}
                setIsLogin={setIsLogin}
                pwScore={pwScore}
              />
            )}
            {!isLogin && step === "verify_email" && (
              <StepEmailVerify
                key="verify"
                email={profileData.email}
                firstName={profileData.firstName}
                onVerified={() => setStep(2)}
                onChangeEmail={() => setStep(1)}
              />
            )}
            {!isLogin && step === 2 && (
              <Step2Coordinates
                key="s2"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSubmit={handleStep2}
                setStep={setStep}
                usernameAvailable={usernameAvailable}
                debouncedUsername={debouncedUsername}
              />
            )}
            {!isLogin && step === 3 && (
              <Step3Background
                key="s3"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSubmit={handleStep3}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 4 && (
              <Step4Vision
                key="s4"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSubmit={handleStep4}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 5 && (
              <Step5Skills
                key="s5"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                setSystemStatus={setSystemStatus}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 6 && (
              <Step6Resources
                key="s6"
                profileData={profileData}
                setField={setField}
                setSystemStatus={setSystemStatus}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 7 && (
              <Step7Footprint
                key="s7"
                profileData={profileData}
                setNestedField={setNestedField}
                systemStatus={systemStatus}
                handleSubmit={handleStep7}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 8 && (
              <Step8Canvas
                key="s8"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSubmit={handleFinalSubmit}
                setStep={setStep}
              />
            )}
            {step === "premium_prompt" && (
              <PremiumPrompt
                key="premium"
                firstName={
                  profileData.firstName ||
                  auth.currentUser?.displayName?.split(" ")[0] ||
                  "Operator"
                }
                onUpgrade={() => navigate("/premium")}
                onContinue={() => navigate("/app", { replace: true })}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {systemStatus.showSetupSequence && (
          <SetupSequence
            onComplete={() => {
              setSystemStatus((p) => ({ ...p, showSetupSequence: false }));
              setStep("premium_prompt");
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
