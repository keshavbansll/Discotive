/**
 * @fileoverview Discotive OS — SYSTEM CONTROLLER v10.0
 * @description
 * Complete MAANG-grade rebuild. PC-first AND Mobile-first simultaneously.
 *
 * Architecture:
 * — Desktop: Sticky left rail sidebar + AnimatePresence right stage
 * — Mobile:  iOS navigation stack — list view → full-screen overlays (spring)
 * — Global Zustand toast bus — fires even after navigation
 * — Optimistic UI — every toggle reflects instantly, Firebase catches up async
 * — Connector editing via modal (desktop) / bottom sheet (mobile) + URL validation
 * — Neural network SVG in Privacy tab
 * — Subscription tab = highest-converting screen on the platform
 * — Danger Zone — pulsing red bg + 3-second cinematic countdown sequence
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import {
  deleteUser,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";
import { db, auth } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { useAppStore } from "../stores/useAppStore";
import { cn } from "../lib/cn";
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Activity,
  Smartphone,
  Laptop,
  Lock,
  ChevronRight,
  Sparkles,
  Loader2,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Globe,
  Instagram,
  Copy,
  ExternalLink,
  Eye,
  Brain,
  Edit3,
  ArrowUpRight,
  Hash,
  Calendar,
  Fingerprint,
  Link2,
  MessageCircle,
  Monitor,
  Cpu,
  KeyRound,
  Download,
  ShieldCheck,
  Crown,
  Zap,
  ChevronLeft,
  BarChart3,
  HardDrive,
  Rss,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// 0. GLOBAL TOAST STORE (Zustand — platform-wide, survives navigation)
// ─────────────────────────────────────────────────────────────────────────────
const useToastStore = create((set) => ({
  toasts: [],
  push: (msg, type = "green") => {
    const id = `${Date.now()}-${Math.random()}`;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, msg, type }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      3800,
    );
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// 1. DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. TAB REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: "account",
    label: "Account",
    icon: User,
    desc: "Identity & credentials",
  },
  {
    id: "profile",
    label: "Profile",
    icon: Edit3,
    desc: "Public career presence",
  },
  {
    id: "connectors",
    label: "Connectors",
    icon: Link2,
    desc: "Linked external accounts",
  },
  {
    id: "privacy",
    label: "Privacy & AI",
    icon: Brain,
    desc: "Data & model controls",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    desc: "Alert preferences",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    desc: "Auth & session control",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: CreditCard,
    desc: "Plan & billing",
  },
  {
    id: "advanced",
    label: "Advanced",
    icon: Cpu,
    desc: "System & cache controls",
  },
  {
    id: "danger",
    label: "Danger Zone",
    icon: Trash2,
    desc: "Destructive actions",
    danger: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONNECTOR REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
const CONNECTORS = [
  {
    key: "github",
    label: "GitHub",
    icon: Github,
    color: "#e6edf3",
    hint: "https://github.com/username",
    validate: (v) => v.includes("github.com"),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "#0a66c2",
    hint: "https://linkedin.com/in/handle",
    validate: (v) => v.includes("linkedin.com"),
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    icon: Twitter,
    color: "#1da1f2",
    hint: "https://x.com/handle",
    validate: (v) => v.includes("x.com") || v.includes("twitter.com"),
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ff0000",
    hint: "https://youtube.com/@channel",
    validate: (v) => v.includes("youtube.com"),
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "#e1306c",
    hint: "https://instagram.com/handle",
    validate: (v) => v.includes("instagram.com"),
  },
  {
    key: "website",
    label: "Website",
    icon: Globe,
    color: "#BFA264",
    hint: "https://yoursite.com",
    validate: (v) => v.startsWith("http"),
  },
  {
    key: "discord",
    label: "Discord",
    icon: MessageCircle,
    color: "#5865f2",
    hint: "https://discord.gg/server",
    validate: (v) => v.length > 5,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ATOMIC COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Spring-animated optimistic toggle */
const Toggle = memo(
  ({ value, onToggle, loading = false, disabled = false }) => (
    <button
      onClick={onToggle}
      disabled={disabled || loading}
      role="switch"
      aria-checked={value}
      style={{ height: 26, width: 48 }}
      className={cn(
        "relative rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BFA264] shrink-0",
        value
          ? "bg-[#BFA264] shadow-[0_0_12px_rgba(191,162,100,0.35)]"
          : "bg-[#2a2a2a]",
        (disabled || loading) && "opacity-40 cursor-not-allowed",
      )}
    >
      <motion.span
        animate={{ x: value ? 22 : 1 }}
        transition={{ type: "spring", stiffness: 700, damping: 30 }}
        className="absolute top-[3px] left-0 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
      >
        {loading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
            className="w-2.5 h-2.5 border-[1.5px] border-[#aaa] border-t-transparent rounded-full"
          />
        )}
      </motion.span>
    </button>
  ),
);

/** Section card wrapper */
const Card = memo(({ children, className, danger = false }) => (
  <div
    className={cn(
      "rounded-2xl border p-5 md:p-6 relative overflow-hidden",
      danger
        ? "bg-[#090000] border-red-900/25"
        : "bg-[#0a0a0a] border-[#1a1a1a]",
      className,
    )}
  >
    {children}
  </div>
));

/** Standard field row inside a card */
const FieldRow = memo(({ label, sub, children, last = false }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4 py-4 min-h-[60px]",
      !last && "border-b border-[#0f0f0f]",
    )}
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-[#ccc]">{label}</p>
      {sub && (
        <p className="text-[10px] text-[#555] mt-0.5 leading-relaxed">{sub}</p>
      )}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
));

/** Section label strip */
const SLabel = memo(({ icon: Icon, children, color = "text-[#BFA264]" }) => (
  <div className="flex items-center gap-2 mb-4">
    {Icon && <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />}
    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.22em]">
      {children}
    </span>
    <div className="flex-1 h-px bg-white/[0.04]" />
  </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// 5. NEURAL NETWORK SVG (Privacy tab)
// ─────────────────────────────────────────────────────────────────────────────
const NeuralNetworkViz = memo(() => {
  const nodes = [
    { id: "you", x: 55, y: 55, label: "You" },
    { id: "a1", x: 190, y: 25, label: "Anon" },
    { id: "a2", x: 190, y: 85, label: "Train" },
    { id: "model", x: 340, y: 55, label: "AI" },
  ];
  const edges = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 3],
  ];
  return (
    <svg viewBox="0 0 400 110" className="w-full" aria-hidden>
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(191,162,100,0.25)"
          strokeWidth="1"
          strokeDasharray="4 3"
          animate={{ strokeDashoffset: [0, -14] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.3,
          }}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={n.id}>
          <motion.circle
            cx={n.x}
            cy={n.y}
            r="14"
            fill="rgba(191,162,100,0.06)"
            stroke={G.base}
            strokeWidth="1"
            animate={{ r: [14, 16, 14] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }}
          />
          <text
            x={n.x}
            y={n.y + 4}
            textAnchor="middle"
            fill={G.bright}
            fontSize="8"
            fontWeight="700"
            fontFamily="monospace"
          >
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONNECTOR MODAL / BOTTOM SHEET
// ─────────────────────────────────────────────────────────────────────────────
const ConnectorSheet = memo(
  ({ connector, currentValue, onSave, onClose, isMobile }) => {
    const [value, setValue] = useState(currentValue || "");
    const [valid, setValid] = useState(false);
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
      setTimeout(() => inputRef.current?.focus(), 120);
    }, []);

    useEffect(() => {
      if (!value.trim()) {
        setValid(false);
        return;
      }
      const url = value.includes("://") ? value : `https://${value}`;
      setValid(
        connector.validate ? connector.validate(url) : url.startsWith("http"),
      );
    }, [value, connector]);

    const handleSave = async () => {
      if (value && !valid) return;
      setSaving(true);
      const normalized =
        value.trim() && !value.includes("://")
          ? `https://${value.trim()}`
          : value.trim();
      await onSave(connector.key, normalized);
      setSaving(false);
      onClose();
    };

    const pasteFromClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        setValue(text.trim());
        setTouched(true);
      } catch (_) {}
    };

    const Icon = connector.icon;

    const body = (
      <div className="flex flex-col p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                background: `${connector.color}12`,
                borderColor: `${connector.color}22`,
              }}
            >
              <Icon
                className="w-4.5 h-4.5"
                style={{ color: connector.color }}
              />
            </div>
            <div>
              <p className="text-sm font-black text-white">{connector.label}</p>
              <p className="text-[9px] text-white/25 uppercase tracking-widest">
                Link Account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/[0.04] border border-white/[0.07] rounded-full flex items-center justify-center text-white/30 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-[9px] font-black text-white/25 uppercase tracking-widest mb-2">
            Profile URL
          </label>
          <div
            className={cn(
              "relative flex items-center rounded-xl border transition-all",
              touched && value && !valid
                ? "border-red-500/50 bg-red-500/[0.04]"
                : touched && valid
                  ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                  : "border-[#1a1a1a] bg-[#0a0a0a] focus-within:border-[#BFA264]/40",
            )}
          >
            <input
              ref={inputRef}
              type="url"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && valid && handleSave()}
              placeholder={connector.hint}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-white/15 outline-none font-mono"
            />
            {touched && value && (
              <div className="pr-3 shrink-0">
                {valid ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            )}
          </div>
          {touched && value && !valid && (
            <p className="text-[9px] text-red-400 mt-1.5">
              Invalid URL format for {connector.label}
            </p>
          )}
        </div>

        {/* Utility row */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={pasteFromClipboard}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-[9px] font-bold text-white/35 hover:text-white transition-colors min-h-[44px]"
          >
            <Copy className="w-3 h-3" /> Paste
          </button>
          {value && (
            <button
              onClick={() => {
                setValue("");
                setTouched(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-500/8 border border-red-500/15 rounded-xl text-[9px] font-bold text-red-400/60 hover:text-red-400 transition-colors min-h-[44px]"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {currentValue && (
            <button
              onClick={async () => {
                setSaving(true);
                await onSave(connector.key, "");
                setSaving(false);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-red-500/8 border border-red-500/15 rounded-xl text-[9px] font-bold text-red-400/60 hover:text-red-400 transition-colors ml-auto min-h-[44px]"
            >
              Disconnect
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-[#0a0a0a] border border-[#1a1a1a] text-white/30 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#111] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!!value && !valid)}
            className={cn(
              "flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
              (!value || valid) && !saving
                ? "bg-[#BFA264] text-black hover:bg-[#D4AF78] shadow-[0_0_20px_rgba(191,162,100,0.2)]"
                : "bg-[#111] border border-[#1a1a1a] text-white/15 cursor-not-allowed",
            )}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="fixed inset-x-0 bottom-0 z-[700] bg-[#0a0a0a] border-t border-[#1a1a1a] rounded-t-[2rem]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#2a2a2a] rounded-full" />
          </div>
          {body}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] rounded-[1.5rem] shadow-2xl overflow-hidden">
          {body}
        </div>
      </motion.div>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. TAB CONTENT COMPONENTS (all memoised — no cross-tab re-renders)
// ─────────────────────────────────────────────────────────────────────────────

/* ── ACCOUNT ── */
const AccountTab = memo(({ userData }) => {
  const [copiedId, setCopiedId] = useState(false);
  const discotiveId = userData?.discotiveId || "---";
  const joinDate = userData?.createdAt
    ? new Date(
        userData.createdAt?.seconds
          ? userData.createdAt.seconds * 1000
          : userData.createdAt,
      ).toLocaleDateString([], { month: "long", year: "numeric" })
    : "—";

  const copyId = () => {
    navigator.clipboard.writeText(discotiveId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2200);
  };

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  return (
    <div className="space-y-4">
      <Card>
        <SLabel icon={User}>Identity</SLabel>
        <div className="flex items-start gap-4 mb-5 p-4 bg-[#050505] border border-[#151515] rounded-xl">
          <div className="w-14 h-14 rounded-[1.25rem] bg-[#111] border border-[#222] flex items-center justify-center text-lg font-black text-[#BFA264] shrink-0 overflow-hidden">
            {userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
              "?"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-white">
              {userData?.identity?.firstName} {userData?.identity?.lastName}
            </p>
            <p className="text-[10px] font-mono text-[#BFA264]/60">
              @{userData?.identity?.username || "—"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {(userData?.identity?.domain || userData?.vision?.passion) && (
                <span className="px-2 py-0.5 bg-[#BFA264]/8 border border-[#BFA264]/15 rounded-full text-[8px] font-bold text-[#BFA264]/70">
                  {userData?.identity?.domain || userData?.vision?.passion}
                </span>
              )}
              <span
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                  isPro
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : "bg-white/[0.04] border-white/[0.06] text-white/25",
                )}
              >
                {isPro ? (
                  <Crown className="w-2.5 h-2.5" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
                {userData?.tier || "Essential"}
              </span>
            </div>
          </div>
        </div>

        <FieldRow label="Email" sub="Primary authentication address">
          <span className="text-xs font-mono text-[#777]">
            {userData?.identity?.email || auth.currentUser?.email || "—"}
          </span>
        </FieldRow>
        <FieldRow label="Username" sub="Public handle across Discotive">
          <span className="text-xs font-mono text-[#BFA264]">
            @{userData?.identity?.username || "—"}
          </span>
        </FieldRow>
        <FieldRow label="Member Since" last>
          <span className="text-xs text-[#777]">{joinDate}</span>
        </FieldRow>
      </Card>

      <Card>
        <SLabel icon={Fingerprint} color="text-violet-400">
          Discotive ID
        </SLabel>
        <div className="flex items-center justify-between gap-3 p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl">
          <div className="flex items-center gap-3">
            <Hash className="w-4 h-4 text-violet-400/50 shrink-0" />
            <span className="text-3xl font-black font-mono text-white tracking-[0.3em]">
              {discotiveId}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={copyId}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.07] rounded-lg text-[9px] font-black text-white/35 hover:text-white transition-all uppercase tracking-widest min-h-[40px]"
            >
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copiedId ? "Copied!" : "Copy"}
            </button>
            <div className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">
                Immutable
              </span>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-[#444] mt-3 leading-relaxed">
          Your 6-digit operator fingerprint on the Discotive network. Share it
          for verification. It can <em>never</em> be changed or reassigned.
        </p>
      </Card>

      <Card>
        <SLabel icon={Calendar} color="text-sky-400">
          Account Meta
        </SLabel>
        <FieldRow label="Member Since" sub="Your onboarding date">
          <span className="text-xs text-[#777]">{joinDate}</span>
        </FieldRow>
        <FieldRow
          label="Operator Tier"
          sub="Current subscription clearance"
          last
        >
          <span
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest",
              isPro
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-white/[0.04] border-white/[0.07] text-white/25",
            )}
          >
            {isPro ? (
              <Crown className="w-3 h-3" />
            ) : (
              <Lock className="w-3 h-3" />
            )}
            {userData?.tier || "Essential"}
          </span>
        </FieldRow>
      </Card>
    </div>
  );
});

/* ── PROFILE ── */
const ProfileTab = memo(({ userData }) => {
  const [copied, setCopied] = useState(false);
  const username = userData?.identity?.username || "";

  const copyLink = () => {
    navigator.clipboard.writeText(`https://discotive.in/@${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-4">
      <Card>
        <SLabel icon={Edit3} color="text-sky-400">
          Public Presence
        </SLabel>
        <div className="flex items-center gap-4 p-4 bg-[#050505] border border-[#151515] rounded-xl mb-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-[#111] border border-[#222] flex items-center justify-center text-base font-black text-[#BFA264] shrink-0 overflow-hidden">
            {userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white truncate">
              {userData?.identity?.firstName} {userData?.identity?.lastName}
            </p>
            <p className="text-[10px] text-[#666] font-mono">
              @{username || "—"}
            </p>
            <p className="text-[9px] text-[#444] mt-0.5 truncate">
              {userData?.identity?.domain ||
                userData?.vision?.passion ||
                "No domain"}
              ·
              {userData?.identity?.niche ||
                userData?.vision?.niche ||
                "No niche"}
            </p>
          </div>
        </div>
        <Link
          to="/app/profile/edit"
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#eee] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.07)] mb-3"
        >
          <Edit3 className="w-4 h-4" /> Open Profile Editor
        </Link>
        <div className="flex items-center gap-2.5 p-3 bg-sky-500/[0.04] border border-sky-500/15 rounded-xl">
          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-sky-400">
              Public Profile URL
            </p>
            <p className="text-[9px] text-[#555] font-mono truncate">
              discotive.in/@{username || "handle"}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[9px] font-black text-sky-400 hover:bg-sky-500/20 transition-colors uppercase tracking-widest min-h-[40px]"
          >
            {copied ? <Check className="w-3.5 h-3.5 mx-auto" /> : "Copy"}
          </button>
        </div>
      </Card>

      <Card>
        <SLabel icon={User} color="text-white/30">
          Biography
        </SLabel>
        <div className="p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl text-sm text-[#777] leading-relaxed min-h-[80px]">
          {userData?.footprint?.bio || userData?.professional?.bio || (
            <span className="text-[#333] italic text-xs">
              No biography yet. Add one in the Profile Editor.
            </span>
          )}
        </div>
        <Link
          to="/app/profile/edit"
          className="flex items-center gap-1.5 text-[9px] font-bold text-sky-400/50 hover:text-sky-400 transition-colors mt-3"
        >
          Edit in Profile Editor <ArrowUpRight className="w-3 h-3" />
        </Link>
      </Card>
    </div>
  );
});

/* ── CONNECTORS ── */
const ConnectorsTab = memo(({ userData, uid, refreshUserData, isMobile }) => {
  const [active, setActive] = useState(null);
  const { push: toast } = useToastStore();

  const handleSave = async (key, value) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), { [`links.${key}`]: value });
      await refreshUserData?.();
      toast(value ? "Connector linked." : "Connector removed.", "green");
    } catch {
      toast("Save failed. Check your connection.", "red");
    }
  };

  return (
    <>
      <div className="space-y-2.5">
        <p className="text-[10px] text-[#555] leading-relaxed mb-4">
          Linked external profiles appear on your public career page and boost
          your verification signal.
        </p>
        {CONNECTORS.map((connector) => {
          const val = userData?.links?.[connector.key] || "";
          const connected = !!val;
          const Icon = connector.icon;
          return (
            <motion.button
              key={connector.key}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActive(connector)}
              className={cn(
                "w-full flex items-center gap-3.5 p-4 rounded-xl border transition-all text-left min-h-[64px]",
                connected
                  ? "bg-[#060606] border-[#1a1a1a] hover:border-[#2a2a2a]"
                  : "bg-transparent border-[#111] hover:border-[#1d1d1d] hover:bg-[#080808]",
              )}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-all"
                style={{
                  background: connected
                    ? `${connector.color}12`
                    : "rgba(255,255,255,0.02)",
                  borderColor: connected
                    ? `${connector.color}22`
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <Icon
                  className="w-4.5 h-4.5"
                  style={{ color: connected ? connector.color : "#555" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {connector.label}
                </p>
                {connected ? (
                  <p className="text-[9px] font-mono text-[#555] truncate mt-0.5">
                    {val}
                  </p>
                ) : (
                  <p className="text-[9px] text-[#444] mt-0.5">Not connected</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {connected && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">
                      Live
                    </span>
                  </div>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-white/15" />
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {active && (
          <>
            {!isMobile && (
              <div
                className="fixed inset-0 z-[699] bg-black/70 backdrop-blur-md"
                onClick={() => setActive(null)}
              />
            )}
            <ConnectorSheet
              connector={active}
              currentValue={userData?.links?.[active.key] || ""}
              onSave={handleSave}
              onClose={() => setActive(null)}
              isMobile={isMobile}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
});

/* ── PRIVACY & AI ── */
const PrivacyTab = memo(({ userData, uid, refreshUserData }) => {
  const [toggling, setToggling] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const { push: toast } = useToastStore();

  const toggle = async (field, current) => {
    setToggling((s) => new Set([...s, field]));
    // Optimistic local patch via refreshUserData will re-render
    try {
      const fn = httpsCallable(functions, "updateUserSettings");
      await fn({ field, value: !current });
      await refreshUserData?.();
      toast("Preference saved.", "green");
    } catch {
      toast("Save failed.", "red");
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(field);
        return n;
      });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    toast("Compiling data payload…", "default");
    try {
      const fn = httpsCallable(functions, "exportUserData");
      const res = await fn();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discotive_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Data exported successfully.", "green");
    } catch {
      toast("Export failed. Try again.", "red");
    } finally {
      setExporting(false);
    }
  };

  const mlConsent = userData?.settings?.mlConsent ?? true;
  const pubProfile = userData?.settings?.publicProfile ?? true;
  const showScore = userData?.settings?.showScore ?? true;

  return (
    <div className="space-y-4">
      {/* ML Consent — neural network viz */}
      <Card>
        <SLabel icon={Brain} color="text-violet-400">
          AI Training Consent
        </SLabel>
        <div className="p-4 bg-[#050505] border border-violet-500/12 rounded-xl mb-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent pointer-events-none" />
          <p className="text-[8px] font-black text-violet-400/60 uppercase tracking-widest mb-3">
            Your Data Flow
          </p>
          <NeuralNetworkViz />
          <p className="text-[9px] text-[#555] mt-3 leading-relaxed">
            When enabled, anonymised activity patterns train Discotive's AI
            recommendation models. Your vault assets, score, and identity are
            <span className="text-violet-400 font-bold">
              never sold or shared
            </span>
            . Disabling opts you out while keeping all features fully active.
          </p>
        </div>
        <FieldRow
          label="ML Training Consent"
          sub="Anonymised data used for AI model improvement"
        >
          <Toggle
            value={mlConsent}
            onToggle={() => toggle("settings.mlConsent", mlConsent)}
            loading={toggling.has("settings.mlConsent")}
          />
        </FieldRow>
        <FieldRow
          label="Personalised Recommendations"
          sub="AI surfaces content based on your activity patterns"
          last
        >
          <Toggle
            value={mlConsent}
            onToggle={() => toggle("settings.mlConsent", mlConsent)}
            loading={toggling.has("settings.mlConsent")}
          />
        </FieldRow>
      </Card>

      {/* Profile visibility */}
      <Card>
        <SLabel icon={Eye} color="text-sky-400">
          Profile Visibility
        </SLabel>
        <FieldRow
          label="Public Profile"
          sub="Anyone with your URL can view your career profile"
        >
          <Toggle
            value={pubProfile}
            onToggle={() => toggle("settings.publicProfile", pubProfile)}
            loading={toggling.has("settings.publicProfile")}
          />
        </FieldRow>
        <FieldRow
          label="Show Discotive Score"
          sub="Display your score on your public profile"
          last
        >
          <Toggle
            value={showScore}
            onToggle={() => toggle("settings.showScore", showScore)}
            loading={toggling.has("settings.showScore")}
          />
        </FieldRow>
      </Card>

      {/* GDPR export */}
      <Card>
        <SLabel icon={Download} color="text-emerald-400">
          GDPR Data Export
        </SLabel>
        <p className="text-xs text-[#555] mb-4 leading-relaxed">
          Download everything Discotive holds about you as structured JSON —
          identity, vault, scores, and journal entries. GDPR Art. 20 compliant.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-500/20 disabled:opacity-50 transition-all min-h-[48px]"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {exporting ? "Compiling Payload…" : "Export My Data (JSON)"}
        </button>
      </Card>
    </div>
  );
});

/* ── NOTIFICATIONS ── */
const NotificationsTab = memo(({ userData, uid, refreshUserData }) => {
  const [toggling, setToggling] = useState(new Set());
  const { push: toast } = useToastStore();

  const toggle = async (field, current) => {
    setToggling((s) => new Set([...s, field]));
    try {
      const fn = httpsCallable(functions, "updateUserSettings");
      await fn({ field, value: !current });
      await refreshUserData?.();
      toast("Preference saved.", "green");
    } catch {
      toast("Save failed.", "red");
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(field);
        return n;
      });
    }
  };

  const emailNotifs = userData?.settings?.emailNotifications ?? true;
  const weeklyReport = userData?.settings?.weeklyReport ?? false;
  const newsletter = userData?.settings?.newsletter ?? false;

  return (
    <div className="space-y-4">
      <Card>
        <SLabel icon={Mail} color="text-amber-400">
          Email Alerts
        </SLabel>
        <FieldRow
          label="Email Notifications"
          sub="Score changes, alliance requests, vault verifications"
        >
          <Toggle
            value={emailNotifs}
            onToggle={() => toggle("settings.emailNotifications", emailNotifs)}
            loading={toggling.has("settings.emailNotifications")}
          />
        </FieldRow>
        <FieldRow
          label="Weekly Performance Report"
          sub="7-day digest delivered every Monday"
          last
        >
          <Toggle
            value={weeklyReport}
            onToggle={() => toggle("settings.weeklyReport", weeklyReport)}
            loading={toggling.has("settings.weeklyReport")}
          />
        </FieldRow>
      </Card>

      <Card>
        <SLabel icon={Rss} color="text-emerald-400">
          Newsletter
        </SLabel>
        <FieldRow
          label="Discotive Newsletter"
          sub="Bi-weekly product updates — no spam, ever"
          last
        >
          <Toggle
            value={newsletter}
            onToggle={() => toggle("settings.newsletter", newsletter)}
            loading={toggling.has("settings.newsletter")}
          />
        </FieldRow>
        {newsletter && (
          <div className="mt-3 flex items-center gap-2 p-3 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-xl">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="text-[9px] text-emerald-400/70">
              Subscribed · Updates go to
              {userData?.identity?.email || auth.currentUser?.email}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <SLabel icon={Bell} color="text-amber-400">
          Granular Alerts
        </SLabel>
        {[
          {
            key: "settings.notifications.arena",
            label: "Arena & Rank Events",
            sub: "Rank changes, percentile shifts, leaderboard milestones",
          },
          {
            key: "settings.notifications.network",
            label: "Network Events",
            sub: "Alliance requests, DMs, competitor tracking",
          },
          {
            key: "settings.notifications.system",
            label: "System Events",
            sub: "Vault verifications, score mutations, streak warnings",
          },
          {
            key: "settings.notifications.marketing",
            label: "Marketing & Updates",
            sub: "Product announcements, feature releases",
          },
        ].map(({ key, label, sub }, i, arr) => (
          <FieldRow
            key={key}
            label={label}
            sub={sub}
            last={i === arr.length - 1}
          >
            <Toggle
              value={
                userData?.settings?.notifications?.[key.split(".").pop()] ??
                true
              }
              onToggle={() =>
                toggle(
                  key,
                  userData?.settings?.notifications?.[key.split(".").pop()] ??
                    true,
                )
              }
              loading={toggling.has(key)}
            />
          </FieldRow>
        ))}
      </Card>
    </div>
  );
});

/* ── SECURITY ── */
const SecurityTab = memo(({ userData }) => {
  const [resetting, setResetting] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({
    os: "Unknown",
    browser: "Unknown",
  });
  const { push: toast } = useToastStore();

  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = ua.includes("Firefox")
      ? "Firefox"
      : ua.includes("Edg")
        ? "Edge"
        : ua.includes("Chrome")
          ? "Chrome"
          : ua.includes("Safari")
            ? "Safari"
            : "Unknown";
    const os = ua.includes("Win")
      ? "Windows"
      : ua.includes("Mac")
        ? "macOS"
        : ua.includes("Android")
          ? "Android"
          : /iPhone|iPad/.test(ua)
            ? "iOS"
            : ua.includes("Linux")
              ? "Linux"
              : "Unknown";
    setSessionInfo({ os, browser });
  }, []);

  const handleReset = async () => {
    if (!auth.currentUser?.email) return;
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      toast("Reset link dispatched to your email.", "green");
    } catch {
      toast("Failed to send reset email.", "red");
    } finally {
      setResetting(false);
    }
  };

  const securityItems = [
    { label: "Email Verified", done: !!auth.currentUser?.emailVerified },
    {
      label: "Profile Complete",
      done: !!(userData?.identity?.firstName && userData?.identity?.lastName),
    },
    {
      label: "Connector Linked",
      done: Object.values(userData?.links || {}).some(Boolean),
    },
    { label: "Vault Asset", done: !!(userData?.vault?.length > 0) },
  ];
  const secScore = securityItems.filter((s) => s.done).length;

  return (
    <div className="space-y-4">
      <Card>
        <SLabel icon={ShieldCheck} color="text-emerald-400">
          Account Security Score
        </SLabel>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-right shrink-0">
            <span className="text-4xl font-black font-mono text-white">
              {secScore}
            </span>
            <span className="text-sm text-[#444]">/4</span>
          </div>
          <div className="flex-1">
            <div className="w-full h-2 bg-[#111] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(secScore / 4) * 100}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background:
                    secScore >= 3
                      ? "#4ADE80"
                      : secScore >= 2
                        ? "#f59e0b"
                        : "#ef4444",
                }}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {securityItems.map(({ label, done }) => (
            <div
              key={label}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border",
                done
                  ? "bg-emerald-500/[0.05] border-emerald-500/15"
                  : "bg-[#070707] border-[#111]",
              )}
            >
              {done ? (
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-[#2a2a2a] shrink-0" />
              )}
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-widest",
                  done ? "text-emerald-400/70" : "text-[#333]",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SLabel icon={KeyRound} color="text-blue-400">
          Authentication
        </SLabel>
        <FieldRow
          label="Password"
          sub="Send a reset link to your registered email"
        >
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-500/20 disabled:opacity-40 transition-all min-h-[44px]"
          >
            {resetting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Mail className="w-3 h-3" />
            )}
            {resetting ? "Sending…" : "Send Reset Email"}
          </button>
        </FieldRow>
        <FieldRow
          label="Login Email"
          sub="Verified authentication address"
          last
        >
          <span className="text-xs font-mono text-[#666]">
            {auth.currentUser?.email || "—"}
          </span>
        </FieldRow>
      </Card>

      <Card>
        <SLabel icon={Monitor} color="text-sky-400">
          Active Session
        </SLabel>
        <div className="flex items-start justify-between gap-3 p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
              {sessionInfo.os === "Android" || sessionInfo.os === "iOS" ? (
                <Smartphone className="w-4.5 h-4.5 text-[#888]" />
              ) : (
                <Laptop className="w-4.5 h-4.5 text-[#888]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {sessionInfo.os} · {sessionInfo.browser}
              </p>
              <p className="text-[9px] text-[#555] font-mono mt-0.5">
                Current session — This device
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest">
                  Active Now
                </span>
              </div>
            </div>
          </div>
          <div className="px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[8px] font-black text-sky-400 uppercase tracking-widest shrink-0">
            Trusted
          </div>
        </div>
        <p className="text-[9px] text-[#333] mt-3">
          Multi-device session management is a Pro feature. Upgrade to view all
          active sessions and remotely terminate them.
        </p>
      </Card>
    </div>
  );
});

/* ── SUBSCRIPTION ── */
const SubscriptionTab = memo(({ userData }) => {
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  return (
    <div className="space-y-4">
      {/* Plan hero */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-6 md:p-8",
          isPro
            ? "border-[#BFA264]/30 bg-gradient-to-br from-[#BFA264]/[0.09] via-[#0a0a0a] to-[#0a0a0a]"
            : "border-[#1a1a1a] bg-[#0a0a0a]",
        )}
      >
        {isPro && (
          <>
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#BFA264] to-transparent" />
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#BFA264]/[0.05] blur-3xl rounded-full pointer-events-none" />
          </>
        )}

        {/* Animated grid mesh for free tier */}
        {!isPro && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 14 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-px top-0 bottom-0"
                style={{
                  left: `${(i / 13) * 100}%`,
                  background: "rgba(191,162,100,0.04)",
                }}
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  delay: i * 0.18,
                }}
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-px left-0 right-0"
                style={{
                  top: `${(i / 7) * 100}%`,
                  background: "rgba(191,162,100,0.03)",
                }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.22 }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {isPro ? (
                <Crown className="w-4 h-4 text-[#BFA264]" />
              ) : (
                <Lock className="w-4 h-4 text-[#555]" />
              )}
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                Current Plan
              </span>
            </div>
            <h2 className="text-3xl font-black text-white mb-1.5">
              {isPro ? "Discotive Pro" : "Essential"}
            </h2>
            <p className="text-sm text-[#555]">
              {isPro
                ? "Full operator clearance — unlimited execution potential"
                : "Free tier · 1 AI comparison/day · Standard vault"}
            </p>
          </div>
          {!isPro && (
            <Link
              to="/premium"
              className="shrink-0 flex items-center gap-2 px-6 py-3.5 font-black text-[11px] uppercase tracking-widest rounded-xl text-black transition-all hover:opacity-90 shadow-[0_0_30px_rgba(191,162,100,0.2)]"
              style={{
                background: "linear-gradient(135deg, #8B7240, #D4AF78)",
              }}
            >
              <Crown className="w-4 h-4" /> Upgrade to Pro
            </Link>
          )}
          {isPro && (
            <div className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#BFA264]/12 border border-[#BFA264]/25 rounded-xl">
              <Check className="w-4 h-4 text-[#BFA264]" />
              <span className="text-[9px] font-black text-[#BFA264] uppercase tracking-widest">
                Active · Full Clearance
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Feature matrix */}
      <Card>
        <div className="flex items-center justify-end gap-8 mb-1 pr-0.5">
          <span className="text-[9px] font-black text-[#333] uppercase tracking-widest w-20 text-center">
            Essential
          </span>
          <span className="text-[9px] font-black text-[#BFA264] uppercase tracking-widest w-20 text-center">
            Pro
          </span>
        </div>
        {[
          ["Daily Execution Ledger", false, true],
          ["Unlimited AI Maps", false, true],
          ["AI Comparisons", "1/day", "Unlimited"],
          ["Vault Storage", "20MB", "100MB"],
          ["Vault Assets", "5 max", "50 max"],
          ["ML Data Opt-Out", false, true],
          ["X-Ray Analytics", false, true],
          ["Multi-Device Sessions", false, true],
          ["Priority Verification", false, true],
          ["Export DCI PDF", true, true],
          ["Public Profile", true, true],
        ].map(([feature, essential, pro]) => (
          <div
            key={feature}
            className="flex items-center justify-between py-3 border-b border-[#0d0d0d] last:border-0"
          >
            <span className="text-sm text-[#888]">{feature}</span>
            <div className="flex items-center gap-8">
              <span className="text-center w-20 flex items-center justify-center">
                {essential === true ? (
                  <Check className="w-3.5 h-3.5 text-[#444]" />
                ) : essential === false ? (
                  <X className="w-3 h-3 text-[#1f1f1f]" />
                ) : (
                  <span className="text-[10px] text-[#555]">{essential}</span>
                )}
              </span>
              <span className="text-center w-20 flex items-center justify-center">
                {pro === true ? (
                  <Check className="w-3.5 h-3.5 text-[#BFA264]" />
                ) : pro === false ? (
                  <X className="w-3 h-3 text-[#1f1f1f]" />
                ) : (
                  <span className="text-[10px] font-bold text-[#BFA264]">
                    {pro}
                  </span>
                )}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
});

/* ── ADVANCED ── */
const AdvancedTab = memo(({ userData, uid, refreshUserData }) => {
  const { push: toast } = useToastStore();
  const [toggling, setToggling] = useState(new Set());

  const toggle = async (field, current) => {
    setToggling((s) => new Set([...s, field]));
    try {
      const fn = httpsCallable(functions, "updateUserSettings");
      await fn({ field, value: !current });
      await refreshUserData?.();
      toast("Preference saved.", "green");
    } catch {
      toast("Save failed.", "red");
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(field);
        return n;
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <SLabel icon={HardDrive} color="text-violet-400">
          Local Cache
        </SLabel>
        <FieldRow
          label="Execution Cache"
          sub="Clears IndexedDB and session-scoped query cache"
        >
          <button
            onClick={() => {
              useAppStore.getState().flushCache();
              toast("Cache flushed.", "green");
            }}
            className="px-4 py-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-violet-500/20 transition-all min-h-[44px]"
          >
            Flush Cache
          </button>
        </FieldRow>
        <FieldRow
          label="Session Storage"
          sub="Clears session-scoped profile cache"
          last
        >
          <button
            onClick={() => {
              sessionStorage.clear();
              toast("Session storage cleared.", "green");
            }}
            className="px-4 py-2.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-violet-500/20 transition-all min-h-[44px]"
          >
            Clear Session
          </button>
        </FieldRow>
      </Card>

      <Card>
        <SLabel icon={Bell} color="text-amber-400">
          Notification Overrides
        </SLabel>
        {[
          {
            key: "settings.notifications.arena",
            label: "Arena & Rank Events",
            sub: "Rank changes, percentile shifts",
          },
          {
            key: "settings.notifications.network",
            label: "Network Events",
            sub: "Alliance requests, DMs",
          },
          {
            key: "settings.notifications.system",
            label: "System Events",
            sub: "Vault verifications, score mutations",
          },
          {
            key: "settings.notifications.marketing",
            label: "Marketing & Updates",
            sub: "Product announcements",
          },
        ].map(({ key, label, sub }, i, arr) => (
          <FieldRow
            key={key}
            label={label}
            sub={sub}
            last={i === arr.length - 1}
          >
            <Toggle
              value={
                userData?.settings?.notifications?.[key.split(".").pop()] ??
                true
              }
              onToggle={() =>
                toggle(
                  key,
                  userData?.settings?.notifications?.[key.split(".").pop()] ??
                    true,
                )
              }
              loading={toggling.has(key)}
            />
          </FieldRow>
        ))}
      </Card>
    </div>
  );
});

/* ── DANGER ZONE ── */
const DangerZoneTab = memo(({ userData, uid }) => {
  const navigate = useNavigate();
  const { push: toast } = useToastStore();
  const [showModal, setShowModal] = useState(false);
  const [phase, setPhase] = useState("form"); // form | countdown | deleting
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [countdown, setCountdown] = useState(null);
  const authProvider = auth.currentUser?.providerData?.[0]?.providerId;

  const openModal = () => {
    setPhase("form");
    setDeleteConfirm("");
    setPassword("");
    setCountdown(null);
    setShowModal(true);
  };

  const initiateCountdown = () => {
    if (deleteConfirm !== "DELETE") {
      toast("Type DELETE to confirm.", "red");
      return;
    }
    if (authProvider === "password" && !password) {
      toast("Password required.", "red");
      return;
    }
    setPhase("countdown");
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null || phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("deleting");
      executeDelete();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  const executeDelete = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast("No active session.", "red");
      return;
    }
    try {
      if (authProvider === "password") {
        const cred = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, cred);
      } else if (authProvider === "google.com") {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      }
      if (uid) await deleteDoc(doc(db, "users", uid));
      await deleteUser(user);
      navigate("/");
    } catch (e) {
      const msg =
        e.code === "auth/wrong-password"
          ? "Incorrect password."
          : e.code === "auth/popup-closed-by-user"
            ? "Google auth cancelled."
            : "Termination failed. Contact support.";
      toast(msg, "red");
      setPhase("form");
      setCountdown(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <motion.div
          animate={{
            borderColor: [
              "rgba(239,68,68,0.1)",
              "rgba(239,68,68,0.3)",
              "rgba(239,68,68,0.1)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="flex items-start gap-3 p-4 bg-red-500/[0.03] border rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-400 mb-0.5">
              Irreversible Actions
            </p>
            <p className="text-[10px] text-red-400/50 leading-relaxed">
              Everything in this section is
              <strong className="text-red-400">permanent</strong> and cannot be
              undone. Your execution ledger, vault assets, and Discotive Score
              will be permanently destroyed.
            </p>
          </div>
        </motion.div>

        <Card danger>
          <SLabel icon={Trash2} color="text-rose-500">
            Account Termination
          </SLabel>
          <ul className="space-y-2.5 mb-6">
            {[
              "All vault assets and verifications permanently deleted",
              "Discotive Score, streak, and history wiped to zero",
              "All alliances and network connections severed",
              `Discotive ID #${userData?.discotiveId || "---"} retired and never reassigned`,
              "Public profile URL permanently deactivated",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-xs text-[#555]"
              >
                <X className="w-3.5 h-3.5 text-rose-500/60 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-rose-500/18 transition-all min-h-[48px]"
          >
            <Trash2 className="w-4 h-4" /> Initiate Account Termination
          </button>
        </Card>
      </div>

      {/* Deletion modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[800] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => phase === "form" && setShowModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl shadow-[0_0_100px_rgba(220,38,38,0.25)]"
              style={{
                background: "#060000",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {/* Pulsing red ambient */}
              <motion.div
                animate={{ opacity: [0.06, 0.18, 0.06] }}
                transition={{ duration: 2.2, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.2), transparent 70%)",
                }}
              />

              <div className="relative z-10 p-7">
                {phase === "form" && (
                  <>
                    <div className="flex flex-col items-center mb-6">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-rose-500" />
                      </div>
                      <h3 className="text-xl font-black text-white mb-1.5 text-center">
                        Terminate Operator?
                      </h3>
                      <p className="text-xs text-[#666] text-center leading-relaxed">
                        This action is
                        <span className="text-rose-400 font-bold">
                          permanent and irreversible
                        </span>
                        . Your complete operator record will be purged.
                      </p>
                    </div>

                    {authProvider === "password" && (
                      <div className="mb-4">
                        <label className="block text-[9px] font-black text-[#555] uppercase tracking-widest mb-1.5">
                          Verify Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#080000] border border-[#250000] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/40 transition-colors placeholder:text-[#330000]"
                        />
                      </div>
                    )}
                    <div className="mb-5">
                      <label className="block text-[9px] font-black text-[#555] uppercase tracking-widest mb-1.5">
                        Type <span className="text-rose-400">"DELETE"</span> to
                        confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirm}
                        onChange={(e) =>
                          setDeleteConfirm(e.target.value.toUpperCase())
                        }
                        placeholder="DELETE"
                        className="w-full bg-[#080000] border border-[#250000] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500/40 transition-colors font-mono tracking-[0.4em] placeholder:text-[#330000] placeholder:tracking-widest"
                      />
                    </div>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3.5 bg-[#0a0a0a] border border-[#1a1a1a] text-[#777] font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#111] transition-all"
                      >
                        Abort
                      </button>
                      <button
                        onClick={initiateCountdown}
                        disabled={
                          deleteConfirm !== "DELETE" ||
                          (authProvider === "password" && !password)
                        }
                        className={cn(
                          "flex-1 py-3.5 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all",
                          deleteConfirm === "DELETE" &&
                            (authProvider !== "password" || password)
                            ? "bg-rose-600 text-white hover:bg-rose-500"
                            : "bg-[#120000] border border-rose-900/30 text-rose-900/50 cursor-not-allowed",
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Terminate
                      </button>
                    </div>
                  </>
                )}

                {phase === "countdown" && (
                  <div className="flex flex-col items-center py-8">
                    <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
                      <svg
                        className="absolute inset-0 w-full h-full -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="rgba(239,68,68,0.08)"
                          strokeWidth="4"
                        />
                        <motion.circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={276}
                          animate={{ strokeDashoffset: [0, 276] }}
                          transition={{ duration: 3, ease: "linear" }}
                        />
                      </svg>
                      <motion.span
                        key={countdown}
                        initial={{ scale: 1.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 20,
                        }}
                        className="text-6xl font-black text-rose-400 font-mono"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                    <p className="text-base font-black text-rose-400 uppercase tracking-widest mb-1">
                      Terminating In…
                    </p>
                    <p className="text-xs text-[#555] text-center mb-6">
                      Purging operator record in {countdown} second
                      {countdown !== 1 ? "s" : ""}
                    </p>
                    <button
                      onClick={() => {
                        setPhase("form");
                        setCountdown(null);
                      }}
                      className="px-5 py-2.5 bg-[#111] border border-[#222] text-[#888] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#1a1a1a] transition-all min-h-[44px]"
                    >
                      Abort Termination
                    </button>
                  </div>
                )}

                {phase === "deleting" && (
                  <div className="flex flex-col items-center py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-14 h-14 border-2 border-rose-500 border-t-transparent rounded-full mb-5"
                    />
                    <p className="text-sm font-black text-rose-400 uppercase tracking-widest">
                      Purging record…
                    </p>
                    <p className="text-[10px] text-[#444] mt-2">
                      This will complete in a moment.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. TAB CONTENT ROUTER (memoised — switches without re-mounting siblings)
// ─────────────────────────────────────────────────────────────────────────────
const TabContent = memo(({ tab, userData, uid, refreshUserData, isMobile }) => {
  const props = { userData, uid, refreshUserData };
  switch (tab) {
    case "account":
      return <AccountTab {...props} />;
    case "profile":
      return <ProfileTab {...props} />;
    case "connectors":
      return <ConnectorsTab {...props} isMobile={isMobile} />;
    case "privacy":
      return <PrivacyTab {...props} />;
    case "notifications":
      return <NotificationsTab {...props} />;
    case "security":
      return <SecurityTab {...props} />;
    case "subscription":
      return <SubscriptionTab {...props} />;
    case "advanced":
      return <AdvancedTab {...props} />;
    case "danger":
      return <DangerZoneTab {...props} />;
    default:
      return null;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. DESKTOP SETTINGS — sticky sidebar + animated stage
// ─────────────────────────────────────────────────────────────────────────────
const DesktopSettings = memo(
  ({ userData, uid, refreshUserData, activeTab, setActiveTab }) => {
    const activeCfg = TABS.find((t) => t.id === activeTab);

    return (
      <div className="flex gap-6 xl:gap-8">
        {/* Left rail */}
        <aside className="w-56 xl:w-60 shrink-0 sticky top-24 self-start">
          <nav className="flex flex-col gap-1" role="navigation">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold transition-all border",
                    isActive
                      ? "bg-white text-black border-white shadow-[0_2px_20px_rgba(255,255,255,0.08)]"
                      : tab.danger
                        ? "bg-transparent border-transparent text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/[0.05] hover:border-rose-500/10"
                        : "bg-transparent border-transparent text-[#666] hover:text-white hover:bg-white/[0.04] hover:border-white/[0.05]",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive
                        ? "text-black"
                        : tab.danger
                          ? "text-rose-400/50"
                          : "text-[#555]",
                    )}
                  />
                  <span>{tab.label}</span>
                  {tab.danger && !isActive && (
                    <motion.span
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </aside>

        {/* Right stage */}
        <div className="flex-1 min-w-0">
          <div className="mb-5">
            <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.25em] mb-0.5">
              {activeCfg?.desc}
            </p>
            <h2
              className="text-2xl font-black text-white tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {activeCfg?.label}
            </h2>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <TabContent
                tab={activeTab}
                userData={userData}
                uid={uid}
                refreshUserData={refreshUserData}
                isMobile={false}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 10. MOBILE SETTINGS — iOS navigation stack
// ─────────────────────────────────────────────────────────────────────────────
const MobileSettings = memo(({ userData, uid, refreshUserData }) => {
  const [overlay, setOverlay] = useState(null);
  const overlayCfg = TABS.find((t) => t.id === overlay);

  return (
    <div className="pb-24">
      {/* Page header */}
      <div className="px-4 pt-4 pb-5">
        <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.25em] mb-0.5">
          Discotive OS
        </p>
        <h1
          className="text-3xl font-black text-white tracking-tight"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          System Controller
        </h1>
      </div>

      {/* Nav list */}
      <div className="px-4 space-y-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setOverlay(tab.id)}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "w-full flex items-center gap-3.5 px-4 py-4 rounded-[1.25rem] border text-left transition-all min-h-[64px]",
                tab.danger
                  ? "bg-rose-500/[0.03] border-rose-500/12 hover:bg-rose-500/[0.06]"
                  : "bg-[#0a0a0a] border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#0f0f0f]",
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                  tab.danger
                    ? "bg-rose-500/10 border-rose-500/20"
                    : "bg-[#111] border-[#1a1a1a]",
                )}
              >
                <Icon
                  className={cn(
                    "w-4.5 h-4.5",
                    tab.danger ? "text-rose-400" : "text-[#666]",
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-black",
                    tab.danger ? "text-rose-400" : "text-white",
                  )}
                >
                  {tab.label}
                </p>
                <p className="text-[10px] text-[#555] mt-0.5">{tab.desc}</p>
              </div>
              <ChevronRight
                className={cn(
                  "w-4 h-4 shrink-0",
                  tab.danger ? "text-rose-400/30" : "text-[#2a2a2a]",
                )}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Full-screen overlay stack */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-[400] bg-[#030303] overflow-y-auto"
          >
            {/* Overlay sticky header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 bg-[#030303]/90 backdrop-blur-xl border-b border-white/[0.05]">
              <button
                onClick={() => setOverlay(null)}
                className="flex items-center gap-1.5 text-[#BFA264] min-h-[44px] min-w-[44px]"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-bold">Back</span>
              </button>
              <h2 className="text-base font-black text-white">
                {overlayCfg?.label}
              </h2>
              <div className="w-20" />
            </div>

            {/* Overlay content */}
            <div className="px-4 py-5 pb-28">
              <TabContent
                tab={overlay}
                userData={userData}
                uid={uid}
                refreshUserData={refreshUserData}
                isMobile={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. GLOBAL TOAST RENDERER
// ─────────────────────────────────────────────────────────────────────────────
const ToastRenderer = () => {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-6 left-4 md:left-8 z-[900] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -18, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-[10px] font-mono font-bold uppercase tracking-widest pointer-events-auto max-w-[320px]",
              t.type === "green"
                ? "bg-[#041f0e] border-emerald-500/25 text-emerald-400"
                : t.type === "red"
                  ? "bg-[#1a0404] border-rose-500/25 text-rose-400"
                  : "bg-[#0a0a0a] border-[#1a1a1a] text-[#888]",
            )}
          >
            {t.type === "green" ? (
              <Check className="w-3.5 h-3.5 shrink-0" />
            ) : t.type === "red" ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Activity className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="flex-1 truncate">{t.msg}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-40 hover:opacity-100 transition-opacity shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#030303] flex items-center justify-center">
    <div className="flex items-end gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          className="w-1 h-7 bg-[#BFA264]/40 rounded-full"
          style={{ transformOrigin: "bottom" }}
        />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 13. MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
const Settings = () => {
  const { userData, loading, refreshUserData } = useUserData();
  const [activeTab, setActiveTab] = useState("account");
  const [isMobile, setIsMobile] = useState(false);
  const uid = userData?.uid || userData?.id;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-generate Discotive ID if missing
  useEffect(() => {
    const gen = async () => {
      if (!uid || userData?.discotiveId) return;
      const id = String(Math.floor(100000 + Math.random() * 900000));
      try {
        await updateDoc(doc(db, "users", uid), { discotiveId: id });
        await refreshUserData?.();
      } catch {}
    };
    if (userData) gen();
  }, [uid, userData?.discotiveId]);

  if (loading || !userData) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[#BFA264]/20 relative">
      {/* Grain overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.018] pointer-events-none" />

      {/* Desktop page header */}
      {!isMobile && (
        <header className="max-w-[1480px] mx-auto px-6 md:px-8 pt-8 pb-6 relative z-10">
          <p className="text-[9px] font-black text-white/15 uppercase tracking-[0.3em] mb-1">
            Discotive OS
          </p>
          <h1
            className="font-black text-white tracking-tight leading-none"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "Montserrat, sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            System Controller
          </h1>
          <p className="text-sm text-[#444] mt-1.5">
            Manage your identity, security, and platform preferences.
          </p>
        </header>
      )}

      {/* Content */}
      <main
        className="max-w-[1480px] mx-auto px-4 md:px-8 relative z-10"
        style={{ paddingBottom: isMobile ? 0 : "6rem" }}
      >
        {isMobile ? (
          <MobileSettings
            userData={userData}
            uid={uid}
            refreshUserData={refreshUserData}
          />
        ) : (
          <DesktopSettings
            userData={userData}
            uid={uid}
            refreshUserData={refreshUserData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Platform-wide toast bus */}
      <ToastRenderer />
    </div>
  );
};

export default Settings;
