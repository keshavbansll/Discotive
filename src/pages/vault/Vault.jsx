/**
 * @fileoverview Vault.jsx — Discotive Asset Vault v3.0 "Proof of Work Engine"
 *
 * ARCHITECTURE:
 * - PC: 20/80 split — sidebar (storage, pending reviews, connectors) + main drive
 * - Mobile: Native-app scroll with snap sections, 44px touch targets
 * - Mac-style ExplorerModel for full-screen file browsing
 * - Onboarding tutorial on first visit
 * - Score engine connected: app connect/disconnect, vault verify events
 * - Tier gates: storage limit 20MB free / 50MB pro, pending reviews 5 free / 10 pro
 * - No Execution Map references (purged)
 * - SEO + structured data via Helmet
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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  runTransaction,
  increment,
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
import { awardAppConnection } from "../../lib/scoreEngine";
import { evaluateAndAwardBadges } from "../../lib/scoreEngine";
import { TIER_LIMITS, TIERS } from "../../lib/TierEngine";
import ExplorerModel from "../../components/ExplorerModel";
import PremiumPaywall from "../../components/PremiumPaywall";
import OnboardingTutorial, {
  PAGE_TUTORIAL_KEY,
  PAGE_TUTORIALS,
} from "../../components/OnboardingTutorial";
import { cn } from "../../lib/cn";

/* ── Design tokens (identical to Dashboard) ──────────────────────────────── */
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

/* ── SVG icons (custom, no lucide dependency) ─────────────────────────────── */
const IconShield = ({ size = 16, color = G.bright }) => (
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
const IconUpload = ({ size = 16, color = G.bright }) => (
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
const IconDatabase = ({ size = 16, color = G.bright }) => (
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
const IconLink = ({ size = 14, color = G.bright }) => (
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
const IconArrowRight = ({ size = 14, color = T.secondary }) => (
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
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const IconCheck = ({ size = 12, color = "#4ADE80" }) => (
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
const IconClock = ({ size = 12, color = "#F59E0B" }) => (
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
const IconX = ({ size = 12, color = T.dim }) => (
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
const IconPlus = ({ size = 14, color = G.bright }) => (
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
const IconFolder = ({ size = 20, color = G.bright }) => (
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
const IconGithub = ({ size = 18, color = "#e6edf3" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);
const IconYoutube = ({ size = 18, color = "#ff4e45" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const IconLock = ({ size = 12, color = "rgba(191,162,100,0.4)" }) => (
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
const IconExplorer = ({ size = 14, color = G.bright }) => (
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
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
const IconSparkle = ({ size = 14, color = G.bright }) => (
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
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);
const IconCrown = ({ size = 12, color = G.bright }) => (
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

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
const Skeleton = memo(({ className }) => (
  <motion.div
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    className={cn("rounded-xl", className)}
    style={{
      background: `linear-gradient(90deg,${V.surface},${V.elevated},${V.surface})`,
    }}
  />
));

/* ── Storage arc ─────────────────────────────────────────────────────────── */
const StorageRing = memo(({ usedBytes, maxBytes, isPro }) => {
  const pct = maxBytes > 0 ? Math.min(100, (usedBytes / maxBytes) * 100) : 0;
  const size = 80;
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const isCritical = pct > 85;
  const color = isCritical ? "#F87171" : G.bright;

  const fmt = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={6}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)",
              filter: `drop-shadow(0 0 4px ${color}80)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[11px] font-black leading-none"
            style={{ color: isCritical ? "#F87171" : T.primary }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <p
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Storage
        </p>
        <p
          className="text-[10px] font-black mt-0.5"
          style={{ color: isCritical ? "#F87171" : T.primary }}
        >
          {fmt(usedBytes)}{" "}
          <span style={{ color: T.dim }}>/ {fmt(maxBytes)}</span>
        </p>
      </div>
      {!isPro && (
        <div
          className="text-[8px] font-bold text-center"
          style={{ color: "rgba(191,162,100,0.5)" }}
        >
          Upgrade for 50MB
        </div>
      )}
    </div>
  );
});

/* ── Vault Strength meter ─────────────────────────────────────────────────── */
const VaultStrengthMeter = memo(({ assets }) => {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Vault Strength
        </span>
        <span className="text-[10px] font-black" style={{ color }}>
          {label}
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 3, background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${strength}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}80, ${color})`,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono" style={{ color: T.dim }}>
          {verifiedCount}/{total} verified
        </span>
        <span className="text-[9px] font-black" style={{ color }}>
          {strength}%
        </span>
      </div>
    </div>
  );
});

/* ── Pending Reviews Carousel ────────────────────────────────────────────── */
const PendingReviewsCarousel = memo(({ assets, isPro, onUpgradeClick }) => {
  const pending = assets.filter((a) => a.status === "PENDING");
  const maxPending = isPro ? 10 : 5;
  const scrollRef = useRef(null);

  if (pending.length === 0) {
    return (
      <div>
        <p
          className="text-[9px] font-black uppercase tracking-widest mb-2"
          style={{ color: T.dim }}
        >
          Pending Review
        </p>
        <div
          className="flex items-center gap-2 py-3 px-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
          }}
        >
          <span className="text-[10px]" style={{ color: T.dim }}>
            No items pending
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          Pending Review
        </p>
        <span
          className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
          style={{
            background: "rgba(245,158,11,0.12)",
            color: "#F59E0B",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          {pending.length}/{maxPending}
        </span>
      </div>
      {pending.length >= maxPending && !isPro && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 py-2 px-3 rounded-xl mb-2 cursor-pointer"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
          onClick={onUpgradeClick}
        >
          <IconLock size={10} color="#F87171" />
          <span className="text-[9px] font-bold" style={{ color: "#F87171" }}>
            Limit reached. Upgrade for 10 slots.
          </span>
        </motion.div>
      )}
      <div
        ref={scrollRef}
        className="flex flex-col gap-1.5 overflow-y-auto hide-scrollbar"
        style={{ maxHeight: 160 }}
      >
        {pending.map((asset, i) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.12)",
            }}
          >
            <IconClock size={11} color="#F59E0B" />
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold truncate"
                style={{ color: T.primary }}
              >
                {asset.title || asset.category || "Asset"}
              </p>
              <p
                className="text-[8px] uppercase tracking-wider mt-0.5"
                style={{ color: "#F59E0B" }}
              >
                Under review
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
});

/* ── Connected Apps Mini Strip ─────────────────────────────────────────────── */
const ConnectorsStrip = memo(({ userData, navigate }) => {
  const connectors = [
    {
      key: "github",
      label: "GitHub",
      Icon: <IconGithub size={18} />,
      isConnected: !!userData?.connectors?.github?.username,
      href: "/app/vault/connectors/github",
      bg: "#0d1117",
      border: "rgba(230,237,243,0.15)",
    },
    {
      key: "youtube",
      label: "YouTube",
      Icon: <IconYoutube size={18} />,
      isConnected: !!userData?.connectors?.youtube?.channelUrl,
      href: "/app/vault/connectors/youtube",
      bg: "#0f0000",
      border: "rgba(255,78,69,0.2)",
    },
  ];

  return (
    <div>
      <p
        className="text-[9px] font-black uppercase tracking-widest mb-2"
        style={{ color: T.dim }}
      >
        Connected Apps
      </p>
      <div className="flex flex-col gap-1.5">
        {connectors.map((c) => (
          <motion.button
            key={c.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(c.href)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all text-left"
            style={{
              background: c.isConnected ? c.bg : "rgba(255,255,255,0.02)",
              border: `1px solid ${c.isConnected ? c.border : "rgba(255,255,255,0.06)"}`,
            }}
            title={`${c.isConnected ? "Manage" : "Connect"} ${c.label}`}
          >
            {c.Icon}
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold"
                style={{ color: c.isConnected ? T.primary : T.dim }}
              >
                {c.label}
              </p>
              <p
                className="text-[8px] uppercase tracking-wider"
                style={{ color: c.isConnected ? "#4ADE80" : T.dim }}
              >
                {c.isConnected ? "Connected +2pts" : "Connect for +2pts"}
              </p>
            </div>
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: c.isConnected ? "#4ADE80" : "rgba(255,255,255,0.1)",
                boxShadow: c.isConnected ? "0 0 6px #4ADE80" : "none",
              }}
            />
          </motion.button>
        ))}
      </div>
      <Link
        to="/app/vault/connectors/github"
        className="block mt-2 text-[8px] font-bold text-center py-2 rounded-xl transition-all hover:bg-white/[0.03]"
        style={{ color: G.base }}
      >
        Manage all connectors →
      </Link>
    </div>
  );
});

/* ── Asset Card (Drive-style) ─────────────────────────────────────────────── */
const AssetCard = memo(({ asset, idx, onDelete, isMobile }) => {
  const [hovered, setHovered] = useState(false);
  const isVerified = asset.status === "VERIFIED";
  const isPending = asset.status === "PENDING";

  const CAT_COLORS = {
    resume: { color: "#BFA264", icon: "📄" },
    certificate: { color: "#8B5CF6", icon: "🏆" },
    project: { color: "#38bdf8", icon: "💼" },
    github: { color: "#e6edf3", icon: "⚡" },
    default: { color: T.dim, icon: "📎" },
  };
  const cat =
    CAT_COLORS[(asset.category || "").toLowerCase()] || CAT_COLORS.default;

  if (isMobile) {
    return (
      <motion.div
        {...FADE_UP(idx * 0.05)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="shrink-0 relative overflow-hidden rounded-2xl cursor-pointer"
        style={{
          width: 150,
          height: 220,
          scrollSnapAlign: "start",
          background: V.depth,
        }}
      >
        {/* Ambient color glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at bottom, ${cat.color}15 0%, transparent 70%)`,
          }}
        />

        {/* Status badge */}
        <div className="absolute top-3 right-3 z-10">
          {isVerified && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(74,222,128,0.15)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <IconCheck size={7} color="#4ADE80" />
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
              <IconClock size={7} color="#F59E0B" />
              <span
                className="text-[7px] font-black uppercase"
                style={{ color: "#F59E0B" }}
              >
                Review
              </span>
            </div>
          )}
        </div>

        {/* Big emoji */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-4xl pointer-events-none opacity-30">
          {cat.icon}
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
            {asset.title || asset.category || "Asset"}
          </p>
          <p
            className="text-[8px] mt-1 font-bold uppercase tracking-widest"
            style={{ color: cat.color }}
          >
            {asset.category || "Document"}
          </p>
        </div>
      </motion.div>
    );
  }

  // Desktop card (drive-tile style)
  return (
    <motion.div
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
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${cat.color}12 0%, transparent 60%)`,
        }}
      />

      {/* Thumbnail area */}
      <div
        className="relative aspect-[4/3] flex items-center justify-center overflow-hidden"
        style={{ background: `${cat.color}08` }}
      >
        <span className="text-5xl opacity-25 group-hover:opacity-40 transition-opacity duration-300 select-none">
          {cat.icon}
        </span>

        {/* Status overlay */}
        <div className="absolute top-2.5 left-2.5">
          {isVerified && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm"
              style={{
                background: "rgba(74,222,128,0.15)",
                border: "1px solid rgba(74,222,128,0.3)",
              }}
            >
              <IconCheck size={8} color="#4ADE80" />
              <span
                className="text-[8px] font-black uppercase tracking-wider"
                style={{ color: "#4ADE80" }}
              >
                Verified
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
              <IconClock size={8} color="#F59E0B" />
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

        {/* Delete on hover */}
        <motion.button
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.8 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(asset.id);
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg transition-all"
          style={{
            background: "rgba(248,113,113,0.15)",
            border: "1px solid rgba(248,113,113,0.3)",
          }}
          title="Delete asset"
        >
          <IconX size={10} color="#F87171" />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="text-[11px] font-black leading-tight line-clamp-2 mb-1"
          style={{ color: T.primary }}
        >
          {asset.title || asset.category || "Asset"}
        </p>
        <p
          className="text-[9px] font-bold uppercase tracking-widest"
          style={{ color: cat.color }}
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
});

/* ── Upload Modal ─────────────────────────────────────────────────────────── */
const UploadModal = memo(
  ({ isOpen, onClose, onUpload, isPro, currentCount, usedBytes }) => {
    const [file, setFile] = useState(null);
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Certificate");
    const [learnId, setLearnId] = useState("");
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

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
      const dropped = e.dataTransfer.files[0];
      if (dropped) setFile(dropped);
    };

    const handleUpload = async () => {
      if (!file || !title.trim() || uploading) return;
      if (usedBytes + file.size > maxStorageBytes) {
        alert(`Storage limit reached. Upgrade to Pro for more space.`);
        return;
      }
      setUploading(true);
      try {
        await onUpload(
          { file, title: title.trim(), category, learnId: learnId.trim() },
          (pct) => setProgress(pct),
        );
        setFile(null);
        setTitle("");
        setCategory("Certificate");
        setLearnId("");
        setProgress(0);
        onClose();
      } catch (err) {
        console.error("[Vault] Upload failed:", err);
      } finally {
        setUploading(false);
      }
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
                  <IconUpload size={13} color={G.bright} />
                </div>
                <div>
                  <h3
                    className="text-sm font-black"
                    style={{ color: T.primary }}
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
                <IconX size={13} color={T.dim} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 relative z-10">
              {atCapacity ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                  <IconLock size={28} color="rgba(191,162,100,0.4)" />
                  <p
                    className="text-sm font-black"
                    style={{ color: T.primary }}
                  >
                    Asset limit reached
                  </p>
                  <p className="text-[11px]" style={{ color: T.secondary }}>
                    {isPro
                      ? "You've reached the maximum asset limit."
                      : `Free tier: ${maxAssets} assets. Upgrade to Pro for unlimited.`}
                  </p>
                </div>
              ) : (
                <>
                  {/* Drop zone */}
                  <motion.div
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
                      onChange={(e) => setFile(e.target.files[0])}
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
                        <IconUpload
                          size={22}
                          color={dragOver ? G.bright : "rgba(191,162,100,0.4)"}
                        />
                        <p
                          className="text-[10px] font-black uppercase tracking-wider"
                          style={{ color: dragOver ? G.bright : T.dim }}
                        >
                          {dragOver
                            ? "Drop it"
                            : "Drop file or click to browse"}
                        </p>
                        <p className="text-[8px]" style={{ color: T.dim }}>
                          PDF, PNG, JPG, DOC, ZIP up to {isPro ? "50" : "20"} MB
                        </p>
                      </div>
                    )}
                  </motion.div>

                  {/* Title */}
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
                      }}
                    />
                  </div>

                  {/* Category */}
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

                  {/* Learn ID */}
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
                      Linking a course ID auto-verifies upon admin approval
                    </p>
                  </div>

                  {/* Upload progress */}
                  {uploading && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: T.dim }}
                        >
                          Uploading...
                        </span>
                        <span
                          className="text-[10px] font-black font-mono"
                          style={{ color: G.bright }}
                        >
                          {progress}%
                        </span>
                      </div>
                      <div
                        className="w-full rounded-full overflow-hidden"
                        style={{
                          height: 3,
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        <motion.div
                          animate={{ width: `${progress}%` }}
                          className="h-full rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${G.deep}, ${G.bright})`,
                            boxShadow: `0 0 6px ${G.base}`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!atCapacity && (
              <div className="px-5 pb-5 relative z-10">
                <motion.button
                  onClick={handleUpload}
                  disabled={!file || !title.trim() || uploading}
                  whileHover={
                    !uploading && file && title.trim() ? { scale: 1.02 } : {}
                  }
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background:
                      file && title.trim() && !uploading
                        ? `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`
                        : "rgba(255,255,255,0.06)",
                    color: file && title.trim() && !uploading ? "#000" : T.dim,
                    boxShadow:
                      file && title.trim() && !uploading
                        ? "0 0 20px rgba(191,162,100,0.2)"
                        : "none",
                  }}
                >
                  {uploading ? `Uploading ${progress}%` : "Sync to Vault"}
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

/* ── Empty State ──────────────────────────────────────────────────────────── */
const VaultEmptyState = memo(({ onUpload }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-20 text-center px-6"
  >
    <div className="relative mb-6">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
      >
        <IconDatabase size={32} color={G.bright} />
      </div>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 rounded-3xl"
        style={{ border: `1px solid ${G.border}` }}
      />
    </div>
    <h3
      className="text-xl font-black mb-2"
      style={{ color: T.primary, letterSpacing: "-0.02em" }}
    >
      Vault is empty.
    </h3>
    <p
      className="text-sm leading-relaxed max-w-xs mb-6"
      style={{ color: T.secondary }}
    >
      Upload credentials, certificates, and projects. Every verified asset
      strengthens your profile and earns Discotive Score.
    </p>
    <motion.button
      onClick={onUpload}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-2 px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest"
      style={{
        background: `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
        color: "#000",
        boxShadow: "0 0 24px rgba(191,162,100,0.2)",
      }}
    >
      <IconUpload size={14} color="#000" />
      Upload First Asset
    </motion.button>
  </motion.div>
));

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN VAULT PAGE
══════════════════════════════════════════════════════════════════════════════ */
const Vault = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userData, loading: userLoading, patchLocalData } = useUserData();
  const shouldReduce = useReducedMotion();

  const [assets, setAssets] = useState([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const fetchedRef = useRef(false);

  const uid = currentUser?.uid;
  const isPro = userData?.tier === "PRO";
  const maxStorageBytes = isPro
    ? TIER_LIMITS[TIERS.PRO].maxStorageBytes
    : TIER_LIMITS[TIERS.ESSENTIAL].maxStorageBytes;
  const maxPendingSlots = isPro ? 10 : 5;

  /* ── Fetch assets ─────────────────────────────────────────────────────── */
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
    const hasSeen = localStorage.getItem(key);
    if (!hasSeen) {
      const t = setTimeout(() => {
        localStorage.setItem(key, "1");
        setShowTutorial(true);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [uid, userLoading]);

  /* ── Computed values ──────────────────────────────────────────────────── */
  const pendingCount = useMemo(
    () => assets.filter((a) => a.status === "PENDING").length,
    [assets],
  );
  const canUpload = useMemo(
    () => pendingCount < maxPendingSlots,
    [pendingCount, maxPendingSlots],
  );

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
    return list;
  }, [assets, activeFilter, searchQuery]);

  const FILTERS = useMemo(() => {
    const cats = [
      "All",
      ...new Set(assets.map((a) => a.category).filter(Boolean)),
    ];
    return cats.slice(0, 6);
  }, [assets]);

  /* ── Upload handler ───────────────────────────────────────────────────── */
  const handleUpload = useCallback(
    async ({ file, title, category, learnId }, onProgress) => {
      if (!uid) return;

      const assetId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const path = `vault/${uid}/${assetId}_${file.name}`;
      const ref = storageRef(storage, path);
      const uploadTask = uploadBytesResumable(ref, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => {
            const pct = Math.round(
              (snap.bytesTransferred / snap.totalBytes) * 100,
            );
            onProgress?.(pct);
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
      patchLocalData({ vault: updatedVault, vault_count: updatedVault.length });

      // Check for vault badges
      await evaluateAndAwardBadges(uid, {
        ...userData,
        vault: updatedVault,
        vault_count: updatedVault.length,
      });

      // Push notification to user's notification array
      const notif = {
        message: `"${title}" has been submitted for review.`,
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
    },
    [uid, userData, patchLocalData],
  );

  /* ── Delete handler ───────────────────────────────────────────────────── */
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
          /* File may not exist */
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

  /* ── Render skeleton ─────────────────────────────────────────────────── */
  if (userLoading) {
    return (
      <div className="min-h-screen flex" style={{ background: V.bg }}>
        <div
          className="w-56 hidden lg:flex flex-col p-5 gap-4"
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
     DESKTOP LAYOUT
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Helmet>
        <title>
          {userData
            ? `${userData?.identity?.firstName || "Operator"}'s Vault | Discotive`
            : "Asset Vault | Discotive"}
        </title>
        <meta
          name="description"
          content="Upload, verify, and manage your professional credentials in the Discotive Asset Vault. Every verified asset builds your Discotive Score."
        />
        <meta property="og:title" content="Discotive Asset Vault" />
        <meta
          property="og:description"
          content="Proof of work, verified. Upload credentials, certificates, and projects to build your verifiable career profile."
        />
        <link rel="canonical" href="https://www.discotive.in/app/vault" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Discotive Asset Vault",
            description: "Upload and verify professional credentials.",
            url: "https://www.discotive.in/app/vault",
          })}
        </script>
      </Helmet>

      {/* Tutorial */}
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

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleUpload}
        isPro={isPro}
        currentCount={assets.length}
        usedBytes={totalStorageBytes}
      />

      <ExplorerModel
        isOpen={showExplorer}
        onClose={() => setShowExplorer(false)}
        assets={assets}
        folders={[]}
        onUpload={(files) => {
          if (files && files.length > 0) {
            setShowExplorer(false);
            setShowUpload(true);
          }
        }}
        onDelete={handleDelete}
      />

      {/* ── MOBILE LAYOUT ───────────────────────────────────────────────── */}
      <div
        className="lg:hidden min-h-screen pb-32 select-none"
        style={{ background: V.bg }}
      >
        {/* Hero */}
        <div
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(180deg, rgba(191,162,100,0.08) 0%, ${V.bg} 100%)`,
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px]"
              style={{ background: "rgba(191,162,100,0.10)" }}
            />
          </div>

          <div className="relative z-10 px-5 pt-5 pb-6">
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
                      <IconCrown size={8} color={G.bright} /> PRO
                    </div>
                  )}
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    Asset Vault
                  </span>
                </div>
                <h1
                  className="font-black text-2xl leading-tight"
                  style={{ color: T.primary, letterSpacing: "-0.02em" }}
                >
                  Proof of Work
                </h1>
                <p
                  className="text-[11px] mt-0.5 font-mono"
                  style={{ color: T.dim }}
                >
                  {assets.filter((a) => a.status === "VERIFIED").length}{" "}
                  verified · {assets.length} total
                </p>
              </div>

              {/* Storage ring */}
              <StorageRing
                usedBytes={totalStorageBytes}
                maxBytes={maxStorageBytes}
                isPro={isPro}
              />
            </div>

            {/* Vault strength */}
            <VaultStrengthMeter assets={assets} />

            {/* Action buttons */}
            <div className="flex gap-3 mt-4">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  canUpload ? setShowUpload(true) : setShowPremium(true)
                }
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest"
                style={{
                  background: `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
                  color: "#000",
                  boxShadow: "0 0 20px rgba(191,162,100,0.2)",
                }}
                title={
                  canUpload
                    ? "Upload a new asset to your vault"
                    : "Upgrade to upload more assets"
                }
              >
                <IconUpload size={14} color="#000" />
                Sync Asset
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowExplorer(true)}
                className="px-4 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
                title="Open file explorer"
              >
                <IconExplorer size={14} color={G.bright} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Pending reviews */}
        <div className="px-4 mb-5 tut-vault-verify">
          <PendingReviewsCarousel
            assets={assets}
            isPro={isPro}
            onUpgradeClick={() => setShowPremium(true)}
          />
        </div>

        {/* Filter pills */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                style={{
                  background:
                    activeFilter === f ? G.dimBg : "rgba(255,255,255,0.04)",
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
        </div>

        {/* Asset horizontal scroll */}
        <div className="tut-vault-upload">
          {assetsLoading ? (
            <div className="flex gap-3 px-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton
                  key={i}
                  style={{ width: 150, height: 220, shrink: 0 }}
                />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <VaultEmptyState onUpload={() => setShowUpload(true)} />
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
                    isMobile
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connectors */}
        <div className="px-4 mt-6 tut-vault-connectors">
          <ConnectorsStrip userData={userData} navigate={navigate} />
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ──────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex h-screen overflow-hidden"
        style={{ background: V.bg }}
      >
        {/* ── LEFT SIDEBAR (20%) ─────────────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-[220px] shrink-0 flex flex-col overflow-y-auto custom-scrollbar"
          style={{
            borderRight: "1px solid rgba(255,255,255,0.04)",
            background: V.depth,
          }}
        >
          {/* Ambient top */}
          <div
            className="absolute top-0 left-0 w-56 h-48 rounded-full blur-[80px] pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse, rgba(191,162,100,0.06) 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col gap-6 p-5 flex-1">
            {/* Vault title */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
              >
                <IconDatabase size={15} color={G.bright} />
              </div>
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Asset Vault
                </p>
                {isPro && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <IconCrown size={8} color={G.bright} />
                    <span
                      className="text-[8px] font-black uppercase tracking-widest"
                      style={{ color: G.bright }}
                    >
                      Pro
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Storage ring */}
            <StorageRing
              usedBytes={totalStorageBytes}
              maxBytes={maxStorageBytes}
              isPro={isPro}
            />

            {/* Vault strength */}
            <VaultStrengthMeter assets={assets} />

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

            {/* Pending reviews */}
            <div className="tut-vault-verify">
              <PendingReviewsCarousel
                assets={assets}
                isPro={isPro}
                onUpgradeClick={() => setShowPremium(true)}
              />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.04)" }} />

            {/* Connectors */}
            <div className="tut-vault-connectors">
              <ConnectorsStrip userData={userData} navigate={navigate} />
            </div>

            {/* Spacer + upgrade button for free users */}
            {!isPro && (
              <div className="mt-auto">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPremium(true)}
                  className="w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                  title="Upgrade to Discotive Pro"
                >
                  <IconCrown size={10} color={G.bright} />
                  <span className="ml-2">Upgrade to Pro</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.aside>

        {/* ── MAIN (80%) ─────────────────────────────────────────────────── */}
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
              <h1
                className="font-black text-3xl leading-tight"
                style={{ color: T.primary, letterSpacing: "-0.02em" }}
              >
                {userData?.identity?.firstName || "Operator"}'s Vault
              </h1>
              <p className="text-sm mt-0.5 font-mono" style={{ color: T.dim }}>
                {assets.filter((a) => a.status === "VERIFIED").length} verified
                · {assets.length} total ·{" "}
                {assets.filter((a) => a.status === "PENDING").length} pending
                review
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Explorer button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExplorer(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: T.secondary,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                title="Open file explorer"
              >
                <IconExplorer size={13} color={T.secondary} />
                Explorer
              </motion.button>

              {/* Upload button */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  canUpload ? setShowUpload(true) : setShowPremium(true)
                }
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all tut-vault-upload"
                style={{
                  background: `linear-gradient(135deg, ${G.light} 0%, ${G.bright} 100%)`,
                  color: "#000",
                  boxShadow: "0 0 24px rgba(191,162,100,0.2)",
                }}
                title={
                  canUpload
                    ? "Upload a new asset to your vault"
                    : "Pending review slots full. Clear reviews to upload more."
                }
              >
                <IconUpload size={13} color="#000" />
                Sync Asset
              </motion.button>
            </div>
          </div>

          {/* Search + filters bar */}
          <div className="relative z-10 flex items-center gap-4 px-8 pb-4">
            {/* Search */}
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl flex-1 max-w-sm"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke={T.dim}
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vault..."
                className="flex-1 bg-transparent text-[11px] outline-none"
                style={{ color: T.primary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <IconX size={11} color={T.dim} />
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2">
              {FILTERS.map((f) => (
                <motion.button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background:
                      activeFilter === f ? G.dimBg : "rgba(255,255,255,0.03)",
                    color: activeFilter === f ? G.bright : T.dim,
                    border:
                      activeFilter === f
                        ? `1px solid ${G.border}`
                        : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {f}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Asset grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-8 pb-8">
            {assetsLoading ? (
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/3] w-full" />
                ))}
              </div>
            ) : filteredAssets.length === 0 ? (
              <VaultEmptyState onUpload={() => setShowUpload(true)} />
            ) : (
              <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredAssets.map((asset, i) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      idx={i}
                      onDelete={handleDelete}
                      isMobile={false}
                    />
                  ))}
                </AnimatePresence>

                {/* Upload tile */}
                <motion.div
                  {...FADE_UP(filteredAssets.length * 0.04)}
                  onClick={() =>
                    canUpload ? setShowUpload(true) : setShowPremium(true)
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="aspect-[4/3] flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all border-2 border-dashed"
                  style={{
                    borderColor: "rgba(191,162,100,0.2)",
                    background: "rgba(191,162,100,0.02)",
                  }}
                  title={canUpload ? "Add new asset" : "Upgrade for more slots"}
                >
                  {canUpload ? (
                    <>
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: G.dimBg }}
                      >
                        <IconPlus size={16} color={G.bright} />
                      </div>
                      <span
                        className="text-[9px] font-black uppercase tracking-widest"
                        style={{ color: G.base }}
                      >
                        Add Asset
                      </span>
                    </>
                  ) : (
                    <>
                      <IconLock size={18} color="rgba(191,162,100,0.4)" />
                      <span
                        className="text-[9px] font-black uppercase tracking-widest text-center px-3"
                        style={{ color: "rgba(191,162,100,0.4)" }}
                      >
                        {isPro ? "10 pending max" : "5 pending max"}
                      </span>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Vault;
