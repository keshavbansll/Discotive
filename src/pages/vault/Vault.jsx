/**
 * @fileoverview Vault.jsx — Discotive Asset Vault v4.0 "Sector Archive"
 *
 * ARCHITECTURE:
 * - PC: 30/70 cinematic split — sidebar + main drive
 * - Mobile: Native-app scroll with snap sections, 44px touch targets
 * - Folder-based navigation with dynamic URLs
 * - Fluid cylinder storage indicator with wave animation
 * - Mouse-tracking glare on asset cards
 * - Unified + FAB with morphing pill expansion
 * - Admin verification chain connected
 * - Score engine connected: vault verify events, app connect/disconnect
 * - Tier gates: 20MB free / 50MB pro
 * - SEO + structured data via Helmet
 * - No Execution Map references (purged)
 * - No Enterprise tier references (purged)
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useUserData } from "../../hooks/useUserData";
import { evaluateAndAwardBadges } from "../../lib/scoreEngine";
import { FolderOpen } from "lucide-react";
import { TIER_LIMITS, TIERS } from "../../lib/TierEngine";
import PremiumPaywall from "../../components/PremiumPaywall";
import OnboardingTutorial, {
  PAGE_TUTORIAL_KEY,
} from "../../components/OnboardingTutorial";
import { cn } from "../../lib/cn";

/* ── Design Tokens — identical to Dashboard ──────────────────────────────── */
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
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay },
});

/* ══════════════════════════════════════════════════════════════════════════
   CUSTOM SVG ICONS — Zero lucide dependency
══════════════════════════════════════════════════════════════════════════ */

const IcoShield = ({ size = 16, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IcoUpload = ({ size = 16, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);
const IcoDatabase = ({ size = 16, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const IcoX = ({ size = 12, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IcoPlus = ({ size = 14, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IcoCheck = ({ size = 12, color = "#4ADE80" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const IcoClock = ({ size = 12, color = "#F59E0B" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);
const IcoFolder = ({ size = 20, color = G.bright }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 7a2 2 0 012-2h4.586a1 1 0 01.707.293L11.707 6.7A1 1 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      fill={color}
      fillOpacity="0.18"
      stroke={color}
      strokeWidth="1.4"
    />
  </svg>
);
const IcoCrown = ({ size = 12, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 20h20M5 20L3 8l6 4 3-7 3 7 6-4-2 12" />
  </svg>
);
const IcoLock = ({ size = 12, color = "rgba(191,162,100,0.4)" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const IcoSearch = ({ size = 14, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const IcoFilter = ({ size = 14, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);
const IcoSort = ({ size = 14, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18M6 12h12M10 18h4" />
  </svg>
);
const IcoArrowLeft = ({ size = 14, color = T.dim }) => (
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
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);
const IcoChevronRight = ({ size = 12, color = T.dim }) => (
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
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IcoTrash = ({ size = 13, color = "#F87171" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);
const IcoShare = ({ size = 13, color = T.secondary }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
  </svg>
);
const IcoDots = ({ size = 14, color = T.dim }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);
const IcoEye = ({ size = 13, color = T.secondary }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IcoLink = ({ size = 13, color = T.secondary }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);
const IcoNewFile = ({ size = 16, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
    <path d="M14 2v6h6M12 18v-6M9 15h6" />
  </svg>
);
const IcoNewFolder = ({ size = 16, color = T.secondary }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 7a2 2 0 012-2h4.586a1 1 0 01.707.293L11.707 6.7A1 1 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    <path d="M12 11v6M9 14h6" />
  </svg>
);

/* File type icons with type-based colors */
const FILE_TYPE_CONFIGS = {
  pdf: {
    color: "#EF4444",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#EF4444"
          fillOpacity="0.15"
          stroke="#EF4444"
          strokeWidth="1.4"
        />
        <path
          d="M7 8h4M7 12h6M7 16h4"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <text
          x="12"
          y="9.5"
          textAnchor="middle"
          fontSize="5"
          fontWeight="800"
          fill="#EF4444"
          fontFamily="monospace"
        >
          PDF
        </text>
      </svg>
    ),
  },
  doc: {
    color: "#3B82F6",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#3B82F6"
          fillOpacity="0.15"
          stroke="#3B82F6"
          strokeWidth="1.4"
        />
        <path
          d="M7 8h10M7 12h8M7 16h6"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  docx: {
    color: "#3B82F6",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#3B82F6"
          fillOpacity="0.15"
          stroke="#3B82F6"
          strokeWidth="1.4"
        />
        <path
          d="M7 8h10M7 12h8M7 16h6"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  png: {
    color: "#8B5CF6",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#8B5CF6"
          fillOpacity="0.15"
          stroke="#8B5CF6"
          strokeWidth="1.4"
        />
        <circle cx="9" cy="9" r="2" fill="#8B5CF6" fillOpacity="0.5" />
        <path
          d="M3 16l5-5 4 4 3-3 6 6"
          stroke="#8B5CF6"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  jpg: {
    color: "#8B5CF6",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#8B5CF6"
          fillOpacity="0.15"
          stroke="#8B5CF6"
          strokeWidth="1.4"
        />
        <circle cx="9" cy="9" r="2" fill="#8B5CF6" fillOpacity="0.5" />
        <path
          d="M3 16l5-5 4 4 3-3 6 6"
          stroke="#8B5CF6"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  jpeg: {
    color: "#8B5CF6",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#8B5CF6"
          fillOpacity="0.15"
          stroke="#8B5CF6"
          strokeWidth="1.4"
        />
        <circle cx="9" cy="9" r="2" fill="#8B5CF6" fillOpacity="0.5" />
        <path
          d="M3 16l5-5 4 4 3-3 6 6"
          stroke="#8B5CF6"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  mp4: {
    color: "#F59E0B",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#F59E0B"
          fillOpacity="0.15"
          stroke="#F59E0B"
          strokeWidth="1.4"
        />
        <polygon points="10,8 17,12 10,16" fill="#F59E0B" />
      </svg>
    ),
  },
  zip: {
    color: "#F97316",
    icon: ({ size = 28 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect
          x="3"
          y="2"
          width="18"
          height="20"
          rx="2"
          fill="#F97316"
          fillOpacity="0.15"
          stroke="#F97316"
          strokeWidth="1.4"
        />
        <path
          d="M11 2v6h2V2h-2zM11 10v2h2v-2h-2zM11 14v2h2v-2h-2zM11 18v2h2v-2h-2z"
          fill="#F97316"
        />
      </svg>
    ),
  },
};

const STRENGTH_COLORS = {
  VERIFIED_Strong: "#4ADE80",
  VERIFIED_Medium: "#F59E0B",
  VERIFIED_Weak: "#EF4444",
  PENDING: "#F59E0B",
  REJECTED: "#6B7280",
};

const getFileConfig = (filename = "", strength, status) => {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  const base = FILE_TYPE_CONFIGS[ext] || FILE_TYPE_CONFIGS.doc;
  if (status === "VERIFIED" && strength) {
    const sc =
      { Strong: "#4ADE80", Medium: "#F59E0B", Weak: "#EF4444" }[strength] ||
      base.color;
    return { ...base, color: sc };
  }
  return base;
};

/* ── Utilities ───────────────────────────────────────────────────────────── */
const formatBytes = (bytes = 0) => {
  if (bytes === 0) return "0 B";
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/* ══════════════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════════════ */
const Skeleton = memo(({ className, style }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    className={cn("rounded-xl", className)}
    style={{
      background: `linear-gradient(90deg,${V.surface},${V.elevated},${V.surface})`,
      ...style,
    }}
  />
));

/* ══════════════════════════════════════════════════════════════════════════
   FLUID CYLINDER — Storage indicator with wave animation
══════════════════════════════════════════════════════════════════════════ */
const FluidCylinder = memo(({ usedBytes, maxBytes, isUploading, compact }) => {
  const pct = maxBytes > 0 ? Math.min(100, (usedBytes / maxBytes) * 100) : 0;
  const isCritical = pct > 85;
  const color = isCritical ? "#EF4444" : G.bright;
  const [animPct, setAnimPct] = useState(pct);
  const clipId = useMemo(
    () => "cylinder-clip-" + Math.random().toString(36).substr(2, 9),
    [],
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimPct(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  const w = compact ? 130 : 340;
  const h = compact ? 100 : 180;
  // Constant liquid baseline
  const fillH = Math.max(12, (animPct / 100) * (h - 16));
  const fillY = h - 8 - fillH;

  const waveSpeed = isUploading ? 0.6 : 2.5;

  return (
    <div className="flex flex-col items-center gap-3 w-full relative">
      <div
        className={cn(
          "relative flex justify-center overflow-hidden w-full",
          compact ? "max-w-[130px]" : "max-w-[380px]",
        )}
        style={{
          height: h,
          maskImage:
            "radial-gradient(ellipse 95% 95% at center, black 50%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 95% 95% at center, black 50%, transparent 100%)",
        }}
      >
        <div className="absolute inset-0 z-0 pointer-events-none" />

        <svg
          width="100%"
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="relative z-10 overflow-hidden"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={w} height={h} rx="20" />
            </clipPath>
            <linearGradient id="glassGlare" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>

          {/* Fluid fill layer inside clip path */}
          <g clipPath={`url(#${clipId})`}>
            <motion.rect
              x="0"
              width={w}
              y={fillY + 8}
              height={fillH + 20}
              fill={color}
              fillOpacity="0.15"
              animate={{ y: fillY + 8, height: fillH + 20 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d={`M0,${fillY + 8} Q${w * 0.25},${fillY + 2} ${w * 0.5},${fillY + 8} Q${w * 0.75},${fillY + 14} ${w},${fillY + 8} L${w},${h + 20} L0,${h + 20} Z`}
              fill={color}
              fillOpacity="0.45"
              animate={{
                d: [
                  `M0,${fillY + 8} Q${w * 0.25},${fillY + 0} ${w * 0.5},${fillY + 8} Q${w * 0.75},${fillY + 16} ${w},${fillY + 8} L${w},${h + 20} L0,${h + 20} Z`,
                  `M0,${fillY + 12} Q${w * 0.25},${fillY + 4} ${w * 0.5},${fillY + 10} Q${w * 0.75},${fillY + 6} ${w},${fillY + 12} L${w},${h + 20} L0,${h + 20} Z`,
                  `M0,${fillY + 8} Q${w * 0.25},${fillY + 0} ${w * 0.5},${fillY + 8} Q${w * 0.75},${fillY + 16} ${w},${fillY + 8} L${w},${h + 20} L0,${h + 20} Z`,
                ],
              }}
              transition={{
                duration: waveSpeed,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>

          <rect
            x="0"
            y="0"
            width={w}
            height={h}
            rx="20"
            fill="url(#glassGlare)"
            pointerEvents="none"
          />

          {/* Req 4: Storage data injected inside the cylinder */}
          <text
            x={w / 2}
            y={h / 2 - (compact ? 0 : 2)}
            textAnchor="middle"
            fontSize={compact ? "24" : "42"}
            fontWeight="900"
            fill={isCritical ? "#EF4444" : T.primary}
            fontFamily="Montserrat, sans-serif"
            style={{ textShadow: "0 6px 20px rgba(0,0,0,0.9)" }}
          >
            {Math.round(pct)}%
          </text>
          <text
            x={w / 2}
            y={h / 2 + (compact ? 16 : 22)}
            textAnchor="middle"
            fontSize={compact ? "8" : "12"}
            fontWeight="800"
            fill={isCritical ? "#EF4444" : T.dim}
            fontFamily="Montserrat, sans-serif"
            style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
          >
            {formatBytes(usedBytes)} / {formatBytes(maxBytes)}
          </text>
        </svg>

        {isUploading &&
          [0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full z-20 pointer-events-none"
              style={{
                width: 6 + i * 3,
                height: 6 + i * 3,
                background: color,
                opacity: 0.8,
                left: 30 + i * 40,
                bottom: 20,
                filter: "blur(2px)",
              }}
              animate={{
                y: [-4, -30, -4],
                opacity: [0.8, 0, 0.8],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 0.8 + i * 0.2,
                repeat: Infinity,
                delay: i * 0.25,
              }}
            />
          ))}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   VAULT STRENGTH — Vertical bar
══════════════════════════════════════════════════════════════════════════ */
const VaultStrengthBar = memo(({ assets }) => {
  const verifiedCount = assets.filter((a) => a.status === "VERIFIED").length;
  const total = assets.length;
  const strength =
    total === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (verifiedCount / Math.max(total, 1)) * 60 + (total / 20) * 40,
          ),
        );

  const getLabel = () => {
    if (strength >= 80) return { label: "Strong", color: "#4ADE80" };
    if (strength >= 50) return { label: "Building", color: G.bright };
    if (strength >= 20) return { label: "Weak", color: "#F59E0B" };
    return { label: "Empty", color: T.dim };
  };
  const { label, color } = getLabel();

  // Widen and raise the baseline to eliminate bottom clipping
  const w = 300;
  const h = 150;
  const r = 120;
  const cx = w / 2;
  const cy = h - 30;
  const dashArray = Math.PI * r;
  const dashOffset = dashArray - (dashArray * strength) / 100;
  const angle = (strength / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-1 mt-6 relative w-full">
      <div
        className="relative flex justify-center w-full"
        style={{ height: h }}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="overflow-visible"
        >
          {/* Background Arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="18"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <motion.path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={dashArray}
            initial={{ strokeDashoffset: dashArray }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}
          />
          {/* Needle Base */}
          <circle cx={cx} cy={cy} r="6" fill={T.primary} />
          {/* Needle Polygon (Overlapping Inner Pin) */}
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: angle }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <polygon
              points={`${cx - 5},${cy + 4} ${cx + 5},${cy + 4} ${cx},${cy - r + 18}`}
              fill={T.primary}
            />
          </motion.g>
          {/* Inner Pin / Top Cap */}
          <circle cx={cx} cy={cy} r="2.5" fill={V.bg} />
        </svg>

        <div className="absolute bottom-[0px] text-center w-full flex flex-col items-center">
          <span
            className="block text-[32px] font-black leading-none font-display"
            style={{ color }}
          >
            {strength}%
          </span>
          <div className="flex items-center justify-center mt-1.5">
            <span
              className="text-[11px] font-black uppercase tracking-widest cursor-help"
              style={{ color }}
              title="Vault Strength Meter"
            >
              VSM ({label})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   CONNECTOR STORY — Instagram-style circular icons
══════════════════════════════════════════════════════════════════════════ */
const CONNECTOR_DEFS = [
  {
    key: "github",
    label: "GitHub",
    bg: "#000",
    border: "rgba(255,255,255,0.15)",
    icon: ({ size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
    href: "/app/vault/connectors/github",
    isConnected: (u) => !!u?.connectors?.github?.username,
  },
  {
    key: "youtube",
    label: "YouTube",
    bg: "#ef4444",
    border: "rgba(239,68,68,0.3)",
    icon: ({ size = 20 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    href: "/app/vault/connectors/youtube",
    isConnected: (u) => !!u?.connectors?.youtube?.channelUrl,
  },
];

const ConnectorStory = memo(({ userData, navigate }) => {
  return (
    <div className="mt-4">
      <p
        className="text-sm font-black uppercase tracking-widest mb-4"
        style={{ color: T.dim }}
      >
        Connected Apps
      </p>
      <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">
        {CONNECTOR_DEFS.map((c) => {
          const connected = c.isConnected(userData);
          const Icon = c.icon;
          if (!connected) return null;
          return (
            <button
              key={c.key}
              onClick={() => navigate(c.href)}
              className="relative shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-[#111] hover:scale-105 transition-transform"
              title={c.label}
            >
              <Icon size={24} />
            </button>
          );
        })}
        {/* Req 10: Fluid fill grey background to pitch black with liquid animation */}
        <motion.button
          onClick={() => navigate("/app/vault/connectors/github")}
          className="shrink-0 relative overflow-hidden flex items-center justify-center w-14 h-14 rounded-full group"
          style={{ background: "rgba(255,255,255,0.05)" }}
          title="Add more connections"
          initial="rest"
          whileHover="hover"
          whileTap={{ scale: 0.95 }}
        >
          <motion.div
            className="absolute inset-0 z-0 bg-[#000000]"
            variants={{
              rest: { y: "101%", borderRadius: "100% 100% 0 0" },
              hover: { y: "0%", borderRadius: "0% 0% 0 0" },
            }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div className="relative z-10">
            <IcoPlus size={22} color="rgba(255,255,255,0.5)" />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   PENDING REVIEWS PANEL
══════════════════════════════════════════════════════════════════════════ */
const PendingPanel = memo(({ assets, isPro }) => {
  const [open, setOpen] = useState(true);
  const pending = assets.filter((a) => a.status === "PENDING");

  return (
    <div className="w-full mt-4">
      <button
        onClick={() => setOpen(!open)}
        title="Toggle pending reviews"
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <IcoClock size={16} color="#F59E0B" />
          <span
            className="text-sm font-black uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            Under Review
          </span>
        </div>
        <span className="text-lg font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF78] to-[#8B7240]">
          {pending.length}
        </span>
      </button>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 relative">
                {/* Pure text instruction above folders */}
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center"
                  style={{ color: "rgba(245,240,232,0.3)" }}
                >
                  No Pending Assets
                </p>

                {/* Horizontal Stacked folder SVGs, dark faded */}
                <div className="flex items-center justify-center gap-3 opacity-30">
                  <IcoFolder size={36} color={G.bright} />
                  <IcoFolder size={36} color={G.bright} />
                  <IcoFolder size={36} color={G.bright} />
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {pending.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.12)",
                    }}
                  >
                    <IcoClock size={14} color="#F59E0B" />
                    <p
                      className="text-xs font-bold truncate flex-1"
                      style={{ color: T.primary }}
                    >
                      {a.title || "Asset"}
                    </p>
                    <span
                      className="text-[10px] uppercase tracking-widest font-black"
                      style={{ color: "#F59E0B" }}
                    >
                      Review
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   ASSET CARD — with mouse-tracking glare + strength-colored icons
══════════════════════════════════════════════════════════════════════════ */
const AssetCard = memo(
  ({ asset, idx, onDelete, onShare, onPreview, isMobile }) => {
    const cardRef = useRef(null);
    const [glare, setGlare] = useState({ x: 50, y: 50 });
    const [hovered, setHovered] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const shouldReduce = useReducedMotion();

    const fileConfig = getFileConfig(
      asset.title || "",
      asset.strength,
      asset.status,
    );
    const FileIcon = fileConfig.icon;
    const isVerified = asset.status === "VERIFIED";
    const isPending = asset.status === "PENDING";

    const handleMouseMove = useCallback(
      (e) => {
        if (!cardRef.current || shouldReduce) return;
        const rect = cardRef.current.getBoundingClientRect();
        setGlare({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        });
      },
      [shouldReduce],
    );

    if (isMobile) {
      return (
        <motion.div
          {...FADE_UP(idx * 0.04)}
          className="shrink-0 relative overflow-hidden rounded-2xl cursor-pointer"
          style={{
            width: 150,
            height: 210,
            scrollSnapAlign: "start",
            background: V.depth,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onTap={() => onPreview?.(asset)}
        >
          {/* Folder-colored bg */}
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ background: `${fileConfig.color}10` }}
          />
          {/* Status badge */}
          <div className="absolute top-2.5 right-2.5 z-10">
            {isVerified && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(74,222,128,0.15)",
                  border: "1px solid rgba(74,222,128,0.3)",
                }}
              >
                <IcoCheck size={7} color="#4ADE80" />
                <span
                  className="text-[7px] font-black uppercase"
                  style={{ color: "#4ADE80" }}
                >
                  Verified
                </span>
              </div>
            )}
            {isPending && (
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <IcoClock size={7} color="#F59E0B" />
              </div>
            )}
          </div>
          {/* File icon center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] opacity-70">
            <FileIcon size={48} />
          </div>
          {/* Bottom info */}
          <div
            className="absolute bottom-0 left-0 right-0 p-3"
            style={{
              background:
                "linear-gradient(0deg,rgba(3,3,3,0.95) 0%,rgba(3,3,3,0.6) 60%,transparent 100%)",
            }}
          >
            <p
              className="text-[10px] font-black leading-tight line-clamp-2"
              style={{ color: T.primary }}
            >
              {asset.title || "Asset"}
            </p>
            <p
              className="text-[8px] mt-1 font-bold uppercase tracking-widest"
              style={{ color: fileConfig.color }}
            >
              {asset.category || "File"}
            </p>
          </div>
        </motion.div>
      );
    }

    // Desktop card
    return (
      <motion.div
        ref={cardRef}
        {...FADE_UP(idx * 0.04)}
        className="relative group cursor-pointer rounded-2xl overflow-hidden transition-all"
        style={{
          background: hovered ? V.elevated : V.surface,
          border: hovered
            ? `1px solid ${G.border}`
            : "1px solid rgba(255,255,255,0.04)",
          boxShadow: hovered
            ? `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${G.border}`
            : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false);
          setMenuOpen(false);
        }}
        onMouseMove={handleMouseMove}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onDoubleClick={() => onPreview?.(asset)}
        title="Double-click to preview"
      >
        {/* Mouse-tracking glare */}
        {hovered && !shouldReduce && (
          <div
            className="absolute inset-0 pointer-events-none z-20 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
            }}
          />
        )}
        {/* Ambient color glow from file type */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${fileConfig.color}08 0%, transparent 70%)`,
          }}
        />

        {/* Thumbnail */}
        <div
          className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
          style={{ background: `${fileConfig.color}06` }}
        >
          <div className="opacity-30 group-hover:opacity-50 transition-opacity duration-300 select-none">
            <FileIcon size={56} />
          </div>
          {/* Status badge */}
          <div className="absolute top-2.5 left-2.5">
            {isVerified && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{
                  background: "rgba(74,222,128,0.15)",
                  border: "1px solid rgba(74,222,128,0.3)",
                }}
              >
                <IcoCheck size={8} color="#4ADE80" />
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: "#4ADE80" }}
                >
                  {asset.strength || "Verified"}
                </span>
              </div>
            )}
            {isPending && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <IcoClock size={8} color="#F59E0B" />
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: "#F59E0B" }}
                >
                  Under Review
                </span>
              </div>
            )}
            {!isVerified && !isPending && (
              <div
                className="px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <span
                  className="text-[8px] font-black uppercase tracking-wider"
                  style={{ color: T.dim }}
                >
                  Unverified
                </span>
              </div>
            )}
          </div>
          {/* 3-dot menu button */}
          <div className="absolute top-2.5 right-2.5 z-30">
            <motion.button
              animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              title="Options"
            >
              <IcoDots size={12} color={T.secondary} />
            </motion.button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50"
                  style={{
                    background: V.elevated,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview?.(asset);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-bold transition-all hover:bg-white/[0.04]"
                    style={{
                      color: T.primary,
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <IcoEye size={12} color={T.dim} /> Preview
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare?.(asset, "public");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-bold transition-all hover:bg-white/[0.04]"
                    style={{
                      color: T.primary,
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <IcoLink size={12} color={T.dim} /> Copy Public Link
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare?.(asset, "email");
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-bold transition-all hover:bg-white/[0.04]"
                    style={{
                      color: T.primary,
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <IcoShare size={12} color={T.dim} /> Share with Email
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(asset.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-bold transition-all hover:bg-red-500/10"
                    style={{ color: "#F87171" }}
                  >
                    <IcoTrash size={12} color="#F87171" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-[11px] font-black leading-tight line-clamp-2 mb-1"
            style={{ color: T.primary }}
          >
            {asset.title || "Asset"}
          </p>
          <p
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: fileConfig.color }}
          >
            {asset.category || "Document"}
          </p>
          {asset.discotiveLearnId && (
            <p
              className="text-[8px] font-mono mt-1 truncate"
              style={{ color: T.dim }}
            >
              ID: {asset.discotiveLearnId}
            </p>
          )}
        </div>
      </motion.div>
    );
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   SCANNING OVERLAY — shown during upload verification
══════════════════════════════════════════════════════════════════════════ */
const ScanningOverlay = memo(({ filename, progress }) => {
  const [hash, setHash] = useState("0x8F9A");
  const chars = "0123456789ABCDEF";
  useEffect(() => {
    const t = setInterval(() => {
      setHash(
        "0x" +
          Array.from(
            { length: 4 },
            () => chars[Math.floor(Math.random() * 16)],
          ).join(""),
      );
    }, 80);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{ background: "rgba(3,3,3,0.92)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex flex-col items-center gap-5 max-w-xs w-full px-8">
        {/* Scanning animation */}
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: G.bright }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border"
            style={{ borderColor: "rgba(191,162,100,0.3)" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <IcoShield size={32} color={G.bright} />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p
            className="text-[10px] font-black uppercase tracking-[0.3em]"
            style={{ color: G.bright }}
          >
            Scanning Asset
          </p>
          <p className="text-[9px] font-mono" style={{ color: T.dim }}>
            Decrypting... {hash} →{" "}
            <span style={{ color: "#4ADE80" }}>Verified</span>
          </p>
          <p
            className="text-[9px] truncate max-w-[200px] font-mono"
            style={{ color: T.secondary }}
          >
            {filename}
          </p>
        </div>
        <div className="w-full">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-bold" style={{ color: T.dim }}>
              Uploading
            </span>
            <span
              className="text-[9px] font-black font-mono"
              style={{ color: G.bright }}
            >
              {progress}%
            </span>
          </div>
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 3, background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${G.deep}, ${G.bright})`,
                boxShadow: `0 0 8px ${G.base}`,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   UPLOAD FORM — opens after file drop/select
══════════════════════════════════════════════════════════════════════════ */
const UploadForm = memo(
  ({ isOpen, onClose, onUpload, isPro, currentCount, usedBytes, preFile }) => {
    const [file, setFile] = useState(preFile || null);
    const [title, setTitle] = useState(
      preFile?.name?.replace(/\.[^.]+$/, "") || "",
    );
    const [category, setCategory] = useState("Certificate");
    const [learnId, setLearnId] = useState("");
    const inputRef = useRef(null);
    const dropRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
      if (preFile) {
        setFile(preFile);
        setTitle(preFile.name.replace(/\.[^.]+$/, ""));
      }
    }, [preFile]);

    const maxAssets = isPro
      ? TIER_LIMITS[TIERS.PRO].maxVaultAssets
      : TIER_LIMITS[TIERS.ESSENTIAL].maxVaultAssets;
    const maxStorageBytes = isPro
      ? TIER_LIMITS[TIERS.PRO].maxStorageBytes
      : TIER_LIMITS[TIERS.ESSENTIAL].maxStorageBytes;
    const atCapacity = currentCount >= maxAssets;

    const CATEGORIES = [
      "Certificate",
      "Resume",
      "Project",
      "GitHub Repo",
      "Award",
      "Publication",
      "Other",
    ];

    const handleDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) {
        setFile(f);
        setTitle(f.name.replace(/\.[^.]+$/, ""));
      }
    };

    const handleSubmit = async () => {
      if (!file || !title.trim()) return;
      if (usedBytes + file.size > maxStorageBytes) return;
      await onUpload({
        file,
        title: title.trim(),
        category,
        learnId: learnId.trim(),
      });
      setFile(null);
      setTitle("");
      setCategory("Certificate");
      setLearnId("");
    };

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md relative"
            style={{
              background: V.depth,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-[60px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(191,162,100,0.08) 0%, transparent 70%)",
              }}
            />
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 relative z-10"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <IcoUpload size={13} color={G.bright} />
                </div>
                <div>
                  <h3
                    className="text-sm font-black"
                    style={{
                      color: T.primary,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Sync Asset
                  </h3>
                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    {currentCount}/{maxAssets} slots used
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)" }}
                title="Close"
              >
                <IcoX size={13} color={T.dim} />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 flex flex-col gap-4 relative z-10">
              {atCapacity ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <IcoLock size={28} color="rgba(191,162,100,0.4)" />
                  <p
                    className="text-sm font-black"
                    style={{ color: T.primary }}
                  >
                    Asset limit reached
                  </p>
                  <p className="text-[11px]" style={{ color: T.secondary }}>
                    {isPro
                      ? "You've reached the maximum asset limit."
                      : `Free tier: ${maxAssets} assets.`}
                  </p>
                </div>
              ) : (
                <>
                  <motion.div
                    ref={dropRef}
                    className={cn(
                      "relative w-full flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                      dragOver
                        ? "border-[#BFA264]/60 bg-[rgba(191,162,100,0.05)]"
                        : file
                          ? "border-[#4ADE80]/50 bg-[rgba(74,222,128,0.04)]"
                          : "border-white/10 hover:border-[#BFA264]/30",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && inputRef.current?.click()}
                    whileHover={{ scale: file ? 1 : 1.005 }}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          setFile(f);
                          setTitle(f.name.replace(/\.[^.]+$/, ""));
                        }
                      }}
                    />
                    {file ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl">📎</span>
                        <p
                          className="text-[11px] font-black"
                          style={{ color: "#4ADE80" }}
                        >
                          {file.name}
                        </p>
                        <p className="text-[9px]" style={{ color: T.dim }}>
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="text-[9px] font-bold mt-1"
                          style={{ color: "#F87171" }}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <IcoUpload
                          size={22}
                          color={dragOver ? G.bright : "rgba(191,162,100,0.4)"}
                        />
                        <p
                          className="text-[10px] font-black uppercase tracking-wider"
                          style={{ color: dragOver ? G.bright : T.dim }}
                        >
                          Drop file or click to browse
                        </p>
                        <p className="text-[8px]" style={{ color: T.dim }}>
                          PDF, PNG, JPG, DOC, ZIP up to {isPro ? "50" : "20"} MB
                        </p>
                      </div>
                    )}
                  </motion.div>
                  <div>
                    <label
                      className="block text-[9px] font-black uppercase tracking-widest mb-1.5 px-1"
                      style={{ color: T.dim }}
                    >
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. AWS Solutions Architect Certificate"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      style={{
                        background: V.surface,
                        border: title
                          ? `1px solid ${G.border}`
                          : "1px solid rgba(255,255,255,0.08)",
                        color: T.primary,
                        fontFamily: "Poppins, sans-serif",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-[9px] font-black uppercase tracking-widest mb-1.5 px-1"
                      style={{ color: T.dim }}
                    >
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className="py-2 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                          style={{
                            background:
                              category === cat
                                ? G.dimBg
                                : "rgba(255,255,255,0.03)",
                            border:
                              category === cat
                                ? `1px solid ${G.border}`
                                : "1px solid rgba(255,255,255,0.06)",
                            color: category === cat ? G.bright : T.dim,
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label
                      className="block text-[9px] font-black uppercase tracking-widest mb-1.5 px-1"
                      style={{ color: T.dim }}
                    >
                      Discotive Learn ID{" "}
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={learnId}
                      onChange={(e) => setLearnId(e.target.value)}
                      placeholder="disc_course_XXXXXXX"
                      className="w-full px-4 py-2.5 rounded-xl text-[11px] font-mono outline-none transition-all"
                      style={{
                        background: V.surface,
                        border: learnId
                          ? `1px solid ${G.border}`
                          : "1px solid rgba(255,255,255,0.08)",
                        color: T.primary,
                      }}
                    />
                    <p
                      className="text-[8px] mt-1 px-1"
                      style={{ color: T.dim }}
                    >
                      Linking a Learn ID enables auto-verification on approval
                    </p>
                  </div>
                </>
              )}
            </div>
            {!atCapacity && (
              <div className="px-5 pb-5 relative z-10">
                <motion.button
                  onClick={handleSubmit}
                  disabled={!file || !title.trim()}
                  whileHover={file && title.trim() ? { scale: 1.02 } : {}}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background:
                      file && title.trim()
                        ? `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`
                        : "rgba(255,255,255,0.06)",
                    color: file && title.trim() ? "#000" : T.dim,
                    boxShadow:
                      file && title.trim()
                        ? "0 0 20px rgba(191,162,100,0.2)"
                        : "none",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Sync to Vault
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

/* ══════════════════════════════════════════════════════════════════════════
   ASSET PREVIEW MODAL
══════════════════════════════════════════════════════════════════════════ */
const AssetPreview = memo(({ asset, onClose }) => {
  if (!asset) return null;
  const ext = (asset.title || "").split(".").pop().toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-4xl flex flex-col"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
            maxHeight: "90vh",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <p
                className="text-sm font-black"
                style={{
                  color: T.primary,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {asset.title}
              </p>
              <p
                className="text-[9px] uppercase tracking-widest mt-0.5"
                style={{ color: T.dim }}
              >
                {asset.category} · {asset.status}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors"
              title="Close preview"
            >
              <IcoX size={14} color={T.secondary} />
            </button>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-6"
            style={{ minHeight: 300 }}
          >
            {asset.fileUrl ? (
              isImage ? (
                <img
                  src={asset.fileUrl}
                  alt={asset.title}
                  className="max-w-full max-h-full rounded-xl object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={`${asset.fileUrl}#toolbar=0`}
                  className="w-full h-full rounded-xl"
                  style={{ minHeight: 500 }}
                  title={asset.title}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <FolderOpen size={48} color={G.bright} strokeWidth={1} />
                  <p className="text-sm" style={{ color: T.secondary }}>
                    Preview not available for this file type.
                  </p>
                  <a
                    href={asset.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    style={{
                      background: G.dimBg,
                      color: G.bright,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    Open File
                  </a>
                </div>
              )
            ) : (
              <p className="text-sm text-center" style={{ color: T.dim }}>
                File not available. Contact support.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   SHARE MODAL — public link & email-restricted share
══════════════════════════════════════════════════════════════════════════ */
const ShareModal = memo(({ asset, mode, onClose }) => {
  const [email, setEmail] = useState("");
  const [emails, setEmails] = useState([]);
  const [copied, setCopied] = useState(false);

  const publicLink = asset?.fileUrl
    ? `${window.location.origin}/verify-asset?uid=${encodeURIComponent(asset.userId || "")}&assetId=${encodeURIComponent(asset.id || "")}`
    : "";

  const copyLink = () => {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const addEmail = () => {
    if (email.trim() && !emails.includes(email.trim())) {
      setEmails([...emails, email.trim()]);
      setEmail("");
    }
  };

  if (!asset) return null;
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p
              className="text-sm font-black"
              style={{ color: T.primary, fontFamily: "Montserrat, sans-serif" }}
            >
              {mode === "public" ? "Public Link" : "Share with Email"}
            </p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)" }}
              title="Close"
            >
              <IcoX size={13} color={T.dim} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            {mode === "public" ? (
              <div>
                <p className="text-[10px] mb-3" style={{ color: T.secondary }}>
                  Anyone with this link can view the asset's verification page.
                  The actual file is not exposed.
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={publicLink}
                    className="flex-1 px-3 py-2.5 rounded-xl text-[10px] font-mono outline-none"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: T.dim,
                    }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={copyLink}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{
                      background: copied ? "rgba(74,222,128,0.15)" : G.dimBg,
                      color: copied ? "#4ADE80" : G.bright,
                      border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : G.border}`,
                    }}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px]" style={{ color: T.secondary }}>
                  Only users with these emails can access the shared asset. They
                  must be signed in to Discotive.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addEmail()}
                    placeholder="Add email address"
                    className="flex-1 px-3 py-2.5 rounded-xl text-[11px] outline-none"
                    style={{
                      background: V.surface,
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: T.primary,
                    }}
                  />
                  <button
                    onClick={addEmail}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black"
                    style={{
                      background: G.dimBg,
                      color: G.bright,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    Add
                  </button>
                </div>
                {emails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {emails.map((e) => (
                      <div
                        key={e}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: T.secondary,
                        }}
                      >
                        {e}
                        <button
                          onClick={() =>
                            setEmails(emails.filter((x) => x !== e))
                          }
                        >
                          <IcoX size={9} color={T.dim} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[8px]" style={{ color: T.dim }}>
                  Note: Actual private link sharing via email is coming soon.
                  This records the intended recipients.
                </p>
              </div>
            )}
          </div>
          <div className="px-5 pb-5">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: T.secondary,
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   FAB — Morphing + button
══════════════════════════════════════════════════════════════════════════ */
const FloatingFAB = memo(({ onNewFile, onNewFolder, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-12 right-12 md:bottom-16 md:right-16 z-[200] flex flex-col items-end gap-2">
      <AnimatePresence>
        {expanded && (
          <>
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ delay: 0.06, duration: 0.18 }}
              onClick={() => {
                setExpanded(false);
                onNewFolder?.();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl font-black text-[10px] uppercase tracking-widest"
              style={{
                background: V.elevated,
                border: "1px solid rgba(255,255,255,0.1)",
                color: T.secondary,
              }}
              title="Create new folder"
            >
              <IcoNewFolder size={15} color={T.secondary} /> New Sector
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ delay: 0.02, duration: 0.18 }}
              onClick={() => {
                setExpanded(false);
                onNewFile?.();
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl font-black text-[10px] uppercase tracking-widest"
              style={{
                background: `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
                color: "#000",
              }}
              title="Upload new file to vault"
            >
              <IcoNewFile size={15} color="#000" /> New File
            </motion.button>
          </>
        )}
      </AnimatePresence>
      <motion.button
        onClick={() => !disabled && setExpanded(!expanded)}
        whileHover={!disabled ? { scale: 1.08 } : {}}
        whileTap={!disabled ? { scale: 0.94 } : {}}
        animate={{
          borderRadius: expanded ? "24px" : "50%",
          width: expanded ? "auto" : 56,
          height: expanded ? "auto" : 56,
        }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="flex items-center justify-center shadow-[0_0_30px_rgba(191,162,100,0.3)]"
        style={{
          background: disabled
            ? "rgba(255,255,255,0.06)"
            : `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
          minWidth: 56,
          minHeight: 56,
          paddingLeft: expanded ? 20 : 0,
          paddingRight: expanded ? 20 : 0,
        }}
        title={
          disabled ? "Pending slots full — upgrade to Pro" : "Add to vault"
        }
      >
        <motion.div
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <IcoPlus size={22} color={disabled ? T.dim : "#000"} />
        </motion.div>
        {expanded && (
          <span className="ml-2 text-[11px] font-black uppercase tracking-widest text-black">
            Close
          </span>
        )}
      </motion.button>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════════════════════════════════════ */
const VaultEmptyState = memo(({ onUpload }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center relative w-full h-[60vh] overflow-hidden"
  >
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
      <svg
        width="480"
        height="480"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          opacity: 0.02,
          transform: "rotate(-10deg) scale(1.5)",
          color: "#FFFFFF",
        }}
      >
        <path
          d="M3 7a2 2 0 012-2h4.586a1 1 0 01.707.293L11.707 6.7A1 1 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="4 2"
        />
        <path
          d="M12 10L16 14M16 10L12 14"
          stroke="currentColor"
          strokeWidth="0.5"
        />
      </svg>
    </div>
    <h3
      className="text-3xl md:text-5xl font-black relative z-10 uppercase tracking-widest text-center"
      style={{
        color: "rgba(255,255,255,0.08)",
        fontFamily: "Montserrat, sans-serif",
        letterSpacing: "0.2em",
      }}
    >
      Vault is empty
    </h3>
  </motion.div>
));

/* ══════════════════════════════════════════════════════════════════════════
   EDITABLE VAULT TITLE
══════════════════════════════════════════════════════════════════════════ */
const EditableVaultTitle = memo(({ defaultName, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(defaultName);
  const inputRef = useRef(null);

  useEffect(() => {
    setValue(defaultName);
  }, [defaultName]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = value.trim().slice(0, 40) || defaultName;
    setValue(trimmed);
    setEditing(false);
    if (trimmed !== defaultName) onSave?.(trimmed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-3 w-full max-w-[600px]">
        <input
          ref={inputRef}
          value={value}
          maxLength={40}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setValue(defaultName);
              setEditing(false);
            }
          }}
          className="font-black text-3xl outline-none bg-transparent border-b-2 w-full min-w-[320px]"
          style={{
            color: T.primary,
            letterSpacing: "-0.02em",
            borderColor: G.bright,
            fontFamily: "Montserrat, sans-serif",
          }}
          title="Press Enter to save, Escape to cancel"
        />
        <span
          className="text-[9px] font-mono shrink-0"
          style={{ color: T.dim }}
        >
          {value.length}/40
        </span>
      </div>
    );
  }

  return (
    <div
      className="group relative cursor-pointer inline-block"
      onClick={() => setEditing(true)}
      title="Click to rename your vault"
    >
      <h1
        className="font-black text-3xl leading-tight transition-colors group-hover:text-[#D4AF78]"
        style={{
          color: T.primary,
          letterSpacing: "-0.02em",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {value}
      </h1>
      <div
        className="absolute bottom-0 left-0 right-0 h-[1px] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
        style={{ background: G.bright }}
      />
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   MAIN VAULT COMPONENT
══════════════════════════════════════════════════════════════════════════ */
const Vault = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { userData, loading: userLoading, patchLocalData } = useUserData();
  const shouldReduce = useReducedMotion();

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [preDropFile, setPreDropFile] = useState(null);
  const [showPremium, setShowPremium] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [scanningFile, setScanningFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [shareAsset, setShareAsset] = useState(null);
  const [shareMode, setShareMode] = useState("public");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const [vaultName, setVaultName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fetchedRef = useRef(false);

  const uid = currentUser?.uid;
  const isPro = userData?.tier === "PRO";
  const maxStorageBytes = isPro
    ? TIER_LIMITS[TIERS.PRO].maxStorageBytes
    : TIER_LIMITS[TIERS.ESSENTIAL].maxStorageBytes;
  const maxPendingSlots = isPro ? 10 : 5;

  // Set vault name from user data
  useEffect(() => {
    const name =
      userData?.vaultName ||
      `${userData?.identity?.firstName || "Operator"}'s Vault`;
    setVaultName(name);
  }, [userData]);

  /* ── Fetch assets from Firestore ──────────────────────────────────────── */
  useEffect(() => {
    if (!uid || fetchedRef.current) return;
    fetchedRef.current = true;
    const vaultAssets = userData?.vault || [];
    setAssets(vaultAssets);
    const totalBytes = vaultAssets.reduce((s, a) => s + (a.sizeBytes || 0), 0);
    setTotalStorageBytes(totalBytes);
    setAssetsLoading(false);
  }, [uid, userData]);

  /* ── Tutorial gate ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!uid || userLoading) return;
    const key = PAGE_TUTORIAL_KEY("/app/vault");
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => {
        localStorage.setItem(key, "1");
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [uid, userLoading]);

  const pendingCount = useMemo(
    () => assets.filter((a) => a.status === "PENDING").length,
    [assets],
  );
  const canUpload = pendingCount < maxPendingSlots;

  /* ── Sort & filter ───────────────────────────────────────────────────── */
  const filteredAssets = useMemo(() => {
    let list = assets;
    if (activeFilter !== "All")
      list = list.filter(
        (a) => (a.category || "").toLowerCase() === activeFilter.toLowerCase(),
      );
    if (searchQuery)
      list = list.filter((a) =>
        (a.title || a.category || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
      );
    if (sortBy === "date")
      list = [...list].sort(
        (a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0),
      );
    if (sortBy === "name")
      list = [...list].sort((a, b) =>
        (a.title || "").localeCompare(b.title || ""),
      );
    if (sortBy === "strength") {
      const order = { VERIFIED: 0, PENDING: 1, REJECTED: 2 };
      list = [...list].sort(
        (a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3),
      );
    }
    return list;
  }, [assets, activeFilter, searchQuery, sortBy]);

  const FILTERS = useMemo(
    () =>
      ["All", ...new Set(assets.map((a) => a.category).filter(Boolean))].slice(
        0,
        7,
      ),
    [assets],
  );

  /* ── Save vault name ─────────────────────────────────────────────────── */
  const handleSaveVaultName = useCallback(
    async (newName) => {
      if (!uid) return;
      setVaultName(newName);
      patchLocalData({ vaultName: newName });
      try {
        await updateDoc(doc(db, "users", uid), { vaultName: newName });
      } catch (err) {
        console.error("[Vault] Name save failed:", err);
      }
    },
    [uid, patchLocalData],
  );

  /* ── Upload handler ──────────────────────────────────────────────────── */
  const handleUpload = useCallback(
    async ({ file, title, category, learnId }) => {
      if (!uid) return;
      setScanningFile(file.name);
      setIsUploading(true);
      setShowUpload(false);
      setPreDropFile(null);

      const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `vault/${uid}/${assetId}_${file.name}`;
      const ref = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(ref, file);

      try {
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100,
              );
              setUploadProgress(pct);
            },
            reject,
            resolve,
          );
        });

        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        const newAsset = {
          id: assetId,
          title,
          category,
          status: "PENDING",
          fileUrl: downloadURL,
          storagePath: path,
          sizeBytes: file.size,
          discotiveLearnId: learnId || null,
          uploadedAt: new Date().toISOString(),
        };

        const userRef = doc(db, "users", uid);
        const currentVault = userData?.vault || [];
        const updatedVault = [...currentVault, newAsset];

        await updateDoc(userRef, {
          vault: updatedVault,
          vault_count: updatedVault.length,
        });

        setAssets(updatedVault);
        setTotalStorageBytes((prev) => prev + file.size);
        patchLocalData({
          vault: updatedVault,
          vault_count: updatedVault.length,
        });

        await evaluateAndAwardBadges(uid, {
          ...userData,
          vault: updatedVault,
          vault_count: updatedVault.length,
        });

        // Push notification
        const notif = {
          message: `"${title}" submitted for review.`,
          type: "vault",
          createdAt: new Date().toISOString(),
        };
        await updateDoc(userRef, {
          notifications: [...(userData?.notifications || []), notif],
          hasUnreadNotifications: true,
        });
        patchLocalData({
          notifications: [...(userData?.notifications || []), notif],
          hasUnreadNotifications: true,
        });
      } catch (err) {
        console.error("[Vault] Upload failed:", err);
      } finally {
        setScanningFile(null);
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [uid, userData, patchLocalData],
  );

  /* ── Delete handler ──────────────────────────────────────────────────── */
  const handleDelete = useCallback(
    async (assetId) => {
      if (!uid) return;
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;

      const updatedVault = assets.filter((a) => a.id !== assetId);
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        vault: updatedVault,
        vault_count: updatedVault.length,
      });

      if (asset.storagePath) {
        try {
          await deleteObject(storageRef(storage, asset.storagePath));
        } catch (_) {
          /* silent */
        }
      }

      setAssets(updatedVault);
      setTotalStorageBytes((prev) =>
        Math.max(0, prev - (asset.sizeBytes || 0)),
      );
      patchLocalData({ vault: updatedVault, vault_count: updatedVault.length });
    },
    [uid, assets, patchLocalData],
  );

  /* ── Share handler ───────────────────────────────────────────────────── */
  const handleShare = useCallback(
    (asset, mode) => {
      setShareAsset({ ...asset, userId: uid });
      setShareMode(mode);
    },
    [uid],
  );

  /* ── Drop-to-upload on main area ─────────────────────────────────────── */
  const handleMainDrop = useCallback(
    (e) => {
      e.preventDefault();
      if (!canUpload) return;
      const f = e.dataTransfer.files[0];
      if (f) {
        setPreDropFile(f);
        setShowUpload(true);
      }
    },
    [canUpload],
  );

  /* ── Skeleton ──────────────────────────────────────────────────────────── */
  if (userLoading) {
    return (
      <div className="min-h-screen flex" style={{ background: V.bg }}>
        <div
          className="w-[30%] hidden lg:flex flex-col p-5 gap-4"
          style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}
        >
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="flex-1 p-8 grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    );
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  /* ══════════════════════════════════════════════════════════════════════
     MOBILE LAYOUT
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Helmet>
        <title>{vaultName} | Discotive Asset Vault</title>
        <meta
          name="description"
          content={`${userData?.identity?.firstName || "Operator"}'s verified credential vault on Discotive. Proof of work, verified by admin.`}
        />
        <meta property="og:title" content={`${vaultName} | Discotive`} />
        <link rel="canonical" href="https://www.discotive.in/app/vault" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: vaultName,
            description: "Upload and verify professional credentials.",
            url: "https://www.discotive.in/app/vault",
          })}
        </script>
      </Helmet>

      <AnimatePresence>
        {showTutorial && (
          <OnboardingTutorial
            uid={uid}
            onDismiss={() => setShowTutorial(false)}
          />
        )}
      </AnimatePresence>

      <PremiumPaywall
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
      />

      <UploadForm
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false);
          setPreDropFile(null);
        }}
        onUpload={handleUpload}
        isPro={isPro}
        currentCount={assets.length}
        usedBytes={totalStorageBytes}
        preFile={preDropFile}
      />

      <AnimatePresence>
        {scanningFile && (
          <ScanningOverlay filename={scanningFile} progress={uploadProgress} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewAsset && (
          <AssetPreview
            asset={previewAsset}
            onClose={() => setPreviewAsset(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {shareAsset && (
          <ShareModal
            asset={shareAsset}
            mode={shareMode}
            onClose={() => setShareAsset(null)}
          />
        )}
      </AnimatePresence>

      {/* ── MOBILE ────────────────────────────────────────────────────── */}
      <div
        className="lg:hidden min-h-screen pb-32 select-none"
        style={{ background: V.bg }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleMainDrop}
      >
        {/* Hero */}
        <div
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, rgba(191,162,100,0.08) 0%, ${V.bg} 100%)`,
          }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
            style={{ background: "rgba(191,162,100,0.10)" }}
          />
          <div className="relative z-10 px-5 pt-5 pb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 pr-4">
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
                      <IcoCrown size={8} color={G.bright} /> PRO
                    </div>
                  )}
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    Asset Vault
                  </span>
                </div>
                <EditableVaultTitle
                  defaultName={vaultName}
                  onSave={handleSaveVaultName}
                />
                <div className="flex flex-col gap-0.5 mt-2">
                  <p
                    className="text-[10px] font-mono tracking-widest uppercase"
                    style={{ color: T.dim }}
                  >
                    Verified{" "}
                    <span className="text-white ml-1">
                      {assets.filter((a) => a.status === "VERIFIED").length}
                    </span>
                  </p>
                  <p
                    className="text-[10px] font-mono tracking-widest uppercase"
                    style={{ color: T.dim }}
                  >
                    Total{" "}
                    <span className="text-white ml-1">{assets.length}</span>
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <FluidCylinder
                  compact={true}
                  usedBytes={totalStorageBytes}
                  maxBytes={maxStorageBytes}
                  isPro={isPro}
                  isUploading={isUploading}
                />
              </div>
            </div>
            <VaultStrengthBar assets={assets} />
          </div>
        </div>

        {/* Connector stories */}
        <div className="px-4 mb-5">
          <ConnectorStory userData={userData} navigate={navigate} />
        </div>

        {/* Pending reviews */}
        <div className="px-4 mb-5">
          <PendingPanel assets={assets} isPro={isPro} />
        </div>

        {/* Search + Sort + Filter (Mobile) */}
        <div className="px-4 mb-6 mt-2 relative z-20">
          <div className="flex items-center gap-2.5 w-full">
            {/* Search */}
            <div
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl flex-1 transition-all duration-300 focus-within:bg-[#141414]"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <IcoSearch size={14} color={T.dim} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: T.primary, fontFamily: "Poppins, sans-serif" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} title="Clear search">
                  <IcoX size={12} color={T.dim} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div
              className="relative flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl transition-all active:scale-95"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <IcoSort size={15} color={T.dim} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="date">By Date</option>
                <option value="name">By Name</option>
                <option value="strength">By Strength</option>
              </select>
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilterSidebar(!showFilterSidebar)}
              className="flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl transition-all"
              style={{
                background: showFilterSidebar ? V.elevated : V.surface,
                border: showFilterSidebar
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <IcoFilter
                size={15}
                color={showFilterSidebar ? T.primary : T.dim}
              />
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilterSidebar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-3">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                      style={{
                        background: activeFilter === f ? G.dimBg : V.surface,
                        color: activeFilter === f ? G.bright : T.dim,
                        border:
                          activeFilter === f
                            ? `1px solid ${G.border}`
                            : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Assets */}
        <div className="tut-vault-upload">
          {assetsLoading ? (
            <div className="flex gap-3 px-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  style={{ width: 150, height: 210, flexShrink: 0 }}
                />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <VaultEmptyState
              onUpload={() =>
                canUpload ? setShowUpload(true) : setShowPremium(true)
              }
            />
          ) : (
            <div
              className="overflow-x-auto hide-scrollbar px-4"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div
                className="flex gap-3"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {filteredAssets.map((asset, i) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    idx={i}
                    onDelete={handleDelete}
                    onShare={handleShare}
                    onPreview={setPreviewAsset}
                    isMobile
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP ───────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex h-screen overflow-hidden"
        style={{ background: V.bg }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleMainDrop}
      >
        {/* ── LEFT SIDEBAR (35%) ──────────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-[35%] min-w-[340px] max-w-[480px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar relative z-20"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.08)",
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.6) 0%, rgba(5,5,5,0.9) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: "10px 0 40px rgba(0,0,0,0.6)",
          }}
        >
          {/* Ambient glow & 3D Glass Effects */}
          <div
            className="absolute top-[-10%] left-[-20%] w-80 h-64 rounded-full blur-[100px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(191,162,100,0.12) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute bottom-[-10%] right-[-20%] w-64 h-64 rounded-full blur-[90px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(191,162,100,0.08) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col gap-8 p-8 flex-1 mt-6">
            {isPro && (
              <div className="flex items-center gap-1.5 opacity-80 absolute top-6 right-8">
                <IcoCrown size={12} color={G.bright} />
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ color: G.bright }}
                >
                  Pro
                </span>
              </div>
            )}

            {/* Fluid cylinder storage */}
            <div className="flex flex-col items-center justify-center">
              <FluidCylinder
                usedBytes={totalStorageBytes}
                maxBytes={maxStorageBytes}
                isUploading={isUploading}
              />
              <p
                className="mt-5 text-xs font-black uppercase tracking-[0.25em]"
                style={{ color: T.dim, fontFamily: "Montserrat, sans-serif" }}
              >
                Storage Index
              </p>
            </div>

            {/* Aesthetic Seperator Line */}
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.05)",
                width: "100%",
                margin: "4px 0",
              }}
            />

            {/* Vault strength */}
            <VaultStrengthBar assets={assets} />

            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

            {/* Pending reviews */}
            <div className="tut-vault-verify">
              <PendingPanel assets={assets} isPro={isPro} />
            </div>

            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

            {/* Connectors */}
            <div className="tut-vault-connectors">
              <ConnectorStory userData={userData} navigate={navigate} />
            </div>

            {/* Upgrade CTA Purged Per Directive */}
          </div>
        </motion.aside>

        {/* ── MAIN (70%) ──────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Volumetric glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none z-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(191,162,100,0.05) 0%, transparent 70%)",
            }}
          />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <p
                className="text-xs md:text-sm font-black uppercase tracking-[0.2em] mb-1.5"
                style={{
                  color: T.secondary,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Asset Vault
              </p>
              <EditableVaultTitle
                defaultName={vaultName}
                onSave={handleSaveVaultName}
              />
              <p className="text-sm mt-0.5 font-mono" style={{ color: T.dim }}>
                {assets.filter((a) => a.status === "VERIFIED").length} verified
                · {assets.length} total ·{" "}
                {assets.filter((a) => a.status === "PENDING").length} pending
              </p>
            </div>
            {/* No sync/explorer buttons here — FAB handles this */}
          </div>

          {/* Search + Sort + Filter bar */}
          <div className="relative z-10 flex items-center justify-center gap-3 px-8 pb-8 pt-4 w-full max-w-4xl mx-auto">
            {/* Search */}
            <div
              className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl flex-1 transition-all duration-300 focus-within:bg-[#141414] hover:bg-[#141414]"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <IcoSearch size={14} color={T.dim} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: T.primary, fontFamily: "Poppins, sans-serif" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} title="Clear search">
                  <IcoX size={12} color={T.dim} />
                </button>
              )}
            </div>

            {/* Sort dropdown (desktop, left of filter) */}
            <div
              className="relative flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl transition-all hover:bg-[#141414]"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              title="Sort assets"
            >
              <IcoSort size={15} color={T.dim} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              >
                <option value="date">By Date</option>
                <option value="name">By Name</option>
                <option value="strength">By Strength</option>
              </select>
            </div>

            {/* Filter button */}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowFilterSidebar(!showFilterSidebar)}
              className="flex items-center justify-center shrink-0 w-12 h-12 rounded-2xl transition-all"
              style={{
                background: showFilterSidebar ? V.elevated : V.surface,
                border: showFilterSidebar
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(255,255,255,0.06)",
              }}
              title="Toggle filter panel"
            >
              <IcoFilter
                size={15}
                color={showFilterSidebar ? T.primary : T.dim}
              />
            </motion.button>
          </div>

          {/* Filter sidebar (slides in from right) */}
          <AnimatePresence>
            {showFilterSidebar && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-[100px] bottom-0 w-56 z-50 flex flex-col p-4 gap-3 overflow-y-auto custom-scrollbar"
                style={{
                  background: V.depth,
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Filter by Type
                </p>
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className="w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    style={{
                      background: activeFilter === f ? G.dimBg : "transparent",
                      color: activeFilter === f ? G.bright : T.dim,
                      border:
                        activeFilter === f
                          ? `1px solid ${G.border}`
                          : "1px solid transparent",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Asset grid */}
          <div
            className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-8 pb-24"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleMainDrop}
          >
            {assetsLoading ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full" />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <VaultEmptyState
                onUpload={() =>
                  canUpload ? setShowUpload(true) : setShowPremium(true)
                }
              />
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredAssets.map((asset, i) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      idx={i}
                      onDelete={handleDelete}
                      onShare={handleShare}
                      onPreview={setPreviewAsset}
                      isMobile={false}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FAB — shown on both mobile and desktop */}
      <FloatingFAB
        onNewFile={() =>
          canUpload ? setShowUpload(true) : setShowPremium(true)
        }
        onNewFolder={() => {
          // Future: folder creation flow
        }}
        disabled={!canUpload}
      />
    </>
  );
};

export default Vault;
