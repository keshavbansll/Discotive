/**
 * @fileoverview Shared Constants and Data Logic for the Colist Engine
 */
import { Star, Award, Shield } from "lucide-react";

export const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};

export const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};

export const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

export const COVER_GRADIENTS = [
  "linear-gradient(135deg,#8B7240 0%,#D4AF78 60%,#E8D5A3 100%)",
  "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)",
  "linear-gradient(135deg,#0a0a0a 0%,#1c1c1c 50%,#2d2d2d 100%)",
  "linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)",
  "linear-gradient(135deg,#200122 0%,#6f0000 100%)",
  "linear-gradient(135deg,#004d00 0%,#006600 50%,#00a000 100%)",
  "linear-gradient(135deg,#1a0533 0%,#6b21a8 100%)",
  "linear-gradient(135deg,#16213e 0%,#0f3460 50%,#533483 100%)",
];

export const VERIFICATION_TIERS = {
  original: {
    label: "Discotive Original",
    color: G.bright,
    border: G.border,
    bg: G.dimBg,
    glow: "0 0 20px rgba(191,162,100,0.4)",
    icon: Star,
    scoreMultiplier: 2,
    desc: "Curated & verified by Discotive",
  },
  strong: {
    label: "Strong",
    color: "#4ADE80",
    border: "rgba(74,222,128,0.3)",
    bg: "rgba(74,222,128,0.08)",
    glow: "0 0 12px rgba(74,222,128,0.2)",
    icon: Award,
    scoreMultiplier: 1,
    desc: "High-signal, verified",
  },
  medium: {
    label: "Medium",
    color: T.secondary,
    border: "rgba(255,255,255,0.1)",
    bg: V.surface,
    glow: "none",
    icon: Shield,
    scoreMultiplier: 0.5,
    desc: "Reviewed, moderate signal",
  },
  weak: {
    label: "Weak",
    color: T.dim,
    border: "rgba(255,255,255,0.05)",
    bg: "transparent",
    glow: "none",
    icon: null,
    scoreMultiplier: 0,
    desc: "Low signal, no score payout",
  },
};

export const RESONANCE_MILESTONES = [
  { threshold: 50, globalPts: 5 },
  { threshold: 100, globalPts: 10 },
  { threshold: 250, globalPts: 20 },
  { threshold: 500, globalPts: 35 },
  { threshold: 1000, globalPts: 50 },
];

export const getNextMilestone = (score) => {
  return RESONANCE_MILESTONES.find((m) => m.threshold > (score || 0)) || null;
};

export const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  return `${base}-${Date.now().toString(36)}`;
};

export const estimateReadTime = (blocks = []) => {
  const words = blocks.reduce((acc, b) => {
    const text = [b.content, b.title, b.description].filter(Boolean).join(" ");
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  return Math.max(1, Math.ceil(words / 200));
};

export const createBlockId = () =>
  `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

export const PROGRESS_KEY = (uid, colistId) =>
  `colist_progress_${uid}_${colistId}`;

export const getProgress = (uid, colistId) => {
  if (!uid || !colistId) return { pageIndex: 0, pagesRead: [] };
  try {
    const raw = localStorage.getItem(PROGRESS_KEY(uid, colistId));
    return raw ? JSON.parse(raw) : { pageIndex: 0, pagesRead: [] };
  } catch {
    return { pageIndex: 0, pagesRead: [] };
  }
};

export const saveProgress = (uid, colistId, pageIndex, pagesRead) => {
  if (!uid || !colistId) return;
  try {
    localStorage.setItem(
      PROGRESS_KEY(uid, colistId),
      JSON.stringify({ pageIndex, pagesRead, ts: Date.now() }),
    );
  } catch {
    // silently fail
  }
};
