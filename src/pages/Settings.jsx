/**
 * @fileoverview Discotive OS — System Settings (The Controller)
 * @module Settings
 * @description
 * The master control panel for every user-facing toggle, connector,
 * identity field, and security protocol on the platform.
 *
 * Tabs:
 * account      → Identity, Discotive ID (6-digit immutable), join date
 * profile      → Edit profile redirect, avatar, bio preview
 * connectors   → App connectors (GitHub, LinkedIn, Twitter, YouTube, etc.)
 * privacy      → ML Consent, data export, visibility controls
 * notifications → Email notifs, newsletter, push preferences
 * security     → Password reset, active session, devices
 * subscription → Current tier, feature comparison, upgrade CTA
 * danger       → Account deletion with typed confirmation
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase"; // Ensure functions is exported from firebase.js
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
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/cn";
import {
  User,
  Shield,
  Bell,
  Database,
  CreditCard,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Activity,
  LogOut,
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
  EyeOff,
  Brain,
  Rss,
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
} from "lucide-react";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "account", label: "Account", icon: User, color: "text-white" },
  { id: "advanced", label: "Advanced", icon: Cpu, color: "text-violet-400" },
  { id: "profile", label: "Profile", icon: Edit3, color: "text-sky-400" },
  {
    id: "connectors",
    label: "Connectors",
    icon: Link2,
    color: "text-emerald-400",
  },
  {
    id: "privacy",
    label: "Privacy & AI",
    icon: Brain,
    color: "text-violet-400",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    color: "text-amber-400",
  },
  { id: "security", label: "Security", icon: Shield, color: "text-blue-400" },
  {
    id: "subscription",
    label: "Subscription",
    icon: CreditCard,
    color: "text-amber-500",
  },
  { id: "danger", label: "Danger Zone", icon: Trash2, color: "text-rose-500" },
];

// ─── Connector definitions ─────────────────────────────────────────────────────
const CONNECTORS = [
  {
    key: "github",
    label: "GitHub",
    icon: Github,
    color: "#fff",
    hint: "github.com/username",
    prefix: "https://github.com/",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "#0a66c2",
    hint: "linkedin.com/in/username",
    prefix: "https://linkedin.com/in/",
  },
  {
    key: "twitter",
    label: "X (Twitter)",
    icon: Twitter,
    color: "#1da1f2",
    hint: "x.com/username",
    prefix: "https://x.com/",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ff0000",
    hint: "youtube.com/@channel",
    prefix: "",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "#e1306c",
    hint: "instagram.com/username",
    prefix: "",
  },
  {
    key: "website",
    label: "Portfolio / Website",
    icon: Globe,
    color: "#888",
    hint: "https://yoursite.com",
    prefix: "",
  },
  {
    key: "discord",
    label: "Discord",
    icon: MessageCircle,
    color: "#5865f2",
    hint: "discord.gg/server",
    prefix: "",
  },
];

// ─── Toggle switch ────────────────────────────────────────────────────────────
const Toggle = ({ value, onToggle, disabled = false }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={cn(
      "relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none shrink-0",
      value
        ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
        : "bg-[#333]",
      disabled && "opacity-40 cursor-not-allowed",
    )}
  >
    <span
      className={cn(
        "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow",
        value ? "translate-x-5" : "translate-x-0",
      )}
    />
  </button>
);

// ─── Section card ─────────────────────────────────────────────────────────────
const Card = ({ children, className }) => (
  <div
    className={cn(
      "bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 md:p-7",
      className,
    )}
  >
    {children}
  </div>
);

const CardHeader = ({ icon: Icon, iconColor, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-6">
    {Icon && (
      <div
        className={cn(
          "w-9 h-9 rounded-xl border border-white/[0.06] flex items-center justify-center shrink-0 bg-white/[0.03]",
        )}
      >
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
    )}
    <div>
      <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-[#555] mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const FieldRow = ({ label, sublabel, children, noBorder = false }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-4 py-4",
      !noBorder && "border-b border-[#111]",
    )}
  >
    <div className="min-w-0">
      <p className="text-sm font-semibold text-[#ccc]">{label}</p>
      {sublabel && <p className="text-[10px] text-[#555] mt-0.5">{sublabel}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const Settings = () => {
  const [isExportingData, setIsExportingData] = useState(false);

  const navigate = useNavigate();
  const { userData, loading, refreshUserData } = useUserData();

  const [activeTab, setActiveTab] = useState("account");
  const [toast, setToast] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);

  // Deletion States
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [password, setPassword] = useState("");

  const [copiedId, setCopiedId] = useState(false);

  // Connector edit state
  const [connectorEdit, setConnectorEdit] = useState(null);
  const [connectorValue, setConnectorValue] = useState("");

  // Session info
  const [sessionInfo, setSessionInfo] = useState({
    os: "Unknown OS",
    browser: "Unknown Browser",
  });

  // Identify auth provider for deletion modal
  const authProvider = auth.currentUser?.providerData[0]?.providerId;

  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = ua.includes("Firefox")
      ? "Firefox"
      : ua.includes("Edg")
        ? "Edge"
        : ua.includes("Chrome")
          ? "Chrome"
          : ua.includes("Safari")
            ? "Safari"
            : "Unknown";
    let os = ua.includes("Win")
      ? "Windows"
      : ua.includes("Mac")
        ? "macOS"
        : ua.includes("Android")
          ? "Android"
          : ua.includes("Linux")
            ? "Linux"
            : /iPhone|iPad/.test(ua)
              ? "iOS"
              : "Unknown";
    setSessionInfo({ os, browser });
  }, []);

  useEffect(() => {
    const ensureDiscotiveId = async () => {
      const uid = userData?.uid || userData?.id;
      if (!uid || userData?.discotiveId) return;
      const id = String(Math.floor(100000 + Math.random() * 900000));
      try {
        await updateDoc(doc(db, "users", uid), { discotiveId: id });
        await refreshUserData?.();
      } catch (e) {
        console.error("Discotive ID gen failed:", e);
      }
    };
    if (userData) ensureDiscotiveId();
  }, [userData?.uid, userData?.id, userData?.discotiveId]);

  const uid = userData?.uid || userData?.id;

  const showToast = (message, type = "green") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const updateField = async (field, value) => {
    if (!uid) return;
    setIsSaving(true);
    try {
      const updateSettings = httpsCallable(functions, "updateUserSettings");
      await updateSettings({ field, value });
      await refreshUserData?.();
      showToast("Saved.", "green");
    } catch (e) {
      showToast("Save failed.", "red");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (field, current) => updateField(field, !current);

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) return;
    setIsResettingPass(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showToast("Reset link dispatched to your email.", "green");
    } catch {
      showToast("Failed. Try again.", "red");
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleSaveConnector = async () => {
    if (!connectorEdit || !uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        [`links.${connectorEdit}`]: connectorValue.trim(),
      });
      await refreshUserData?.();
      showToast("Connector linked.", "green");
      setConnectorEdit(null);
      setConnectorValue("");
    } catch {
      showToast("Save failed.", "red");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async (key) => {
    if (!uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), { [`links.${key}`]: "" });
      await refreshUserData?.();
      showToast("Connector removed.", "green");
    } catch {
      showToast("Failed.", "red");
    } finally {
      setIsSaving(false);
    }
  };

  // ── MAANG-Grade Secure Deletion Handler ──
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      showToast("Type DELETE to confirm.", "red");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      showToast("System error: No active session found.", "red");
      return;
    }

    if (authProvider === "password" && !password) {
      showToast("Password is required for termination.", "red");
      return;
    }

    setIsDeleting(true);
    try {
      // 1. Proactive Re-authentication Gate
      if (authProvider === "password") {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      } else if (authProvider === "google.com") {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }

      // 2. Erase Ledger & Identity
      if (uid) await deleteDoc(doc(db, "users", uid));
      await deleteUser(user);
      navigate("/");
    } catch (e) {
      console.error("[Settings] Account Termination Fault:", e);
      if (e.code === "auth/wrong-password") {
        showToast("Incorrect password.", "red");
      } else if (e.code === "auth/popup-closed-by-user") {
        showToast("Google authentication was cancelled.", "red");
      } else if (e.code === "auth/requires-recent-login") {
        showToast(
          "Critical: Re-auth failed. Please sign out and back in.",
          "red",
        );
      } else {
        showToast("Termination failed. Contact support.", "red");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportData = async () => {
    setIsExportingData(true);
    showToast(
      "Compiling compliance payload. This may take a moment...",
      "default",
    );

    try {
      const exportUserData = httpsCallable(functions, "exportUserData");
      const response = await exportUserData();

      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `discotive_gdpr_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Data exported successfully.", "green");
    } catch (error) {
      console.error("[Settings] Export fault:", error);
      showToast("Export failed. Please check your connection.", "red");
    } finally {
      setIsExportingData(false);
    }
  };
  const copyDiscotiveId = () => {
    const id = userData?.discotiveId || "—";
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              className="w-1 h-4 bg-[#444] rounded-full"
            />
          ))}
        </div>
      </div>
    );
  }

  const isPro =
    userData?.tier === "PRO" || userData?.subscription?.tier === "pro";
  const mlConsent = userData?.settings?.mlConsent ?? true;
  const newsletter = userData?.settings?.newsletter ?? false;
  const emailNotifs = userData?.settings?.emailNotifications ?? true;
  const publicProfile = userData?.settings?.publicProfile ?? true;
  const showScore = userData?.settings?.showScore ?? true;

  const discotiveId = userData?.discotiveId || "Generating…";
  const joinDate = userData?.createdAt
    ? new Date(
        userData.createdAt?.seconds
          ? userData.createdAt.seconds * 1000
          : userData.createdAt,
      ).toLocaleDateString([], { month: "long", year: "numeric" })
    : "—";

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white/20 pb-28 relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />

      <div className="max-w-[1480px] mx-auto px-4 md:px-8 py-6 md:py-10 relative z-10">
        <div className="mb-8 md:mb-10">
          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.25em] mb-2">
            System Controller
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Settings
          </h1>
          <p className="text-sm text-[#555] mt-1">
            Manage your identity, security, and platform preferences.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="md:w-56 shrink-0">
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 md:sticky md:top-24">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-all whitespace-nowrap shrink-0 border text-left",
                      isActive
                        ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        : "bg-[#0a0a0a] border-[#1a1a1a] text-[#666] hover:bg-[#111] hover:text-white hover:border-[#333]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-3.5 h-3.5 shrink-0",
                        isActive ? "text-black" : tab.color,
                      )}
                    />
                    {tab.label}
                    {tab.id === "danger" && !isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* ════════ ACCOUNT ════════ */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Account Overview
                  </h2>

                  <Card>
                    <CardHeader
                      icon={User}
                      iconColor="text-white"
                      title="Identity"
                      subtitle="Your legal operator credentials"
                    />
                    <FieldRow
                      label="Full Name"
                      sublabel="Your verified identity"
                    >
                      <span className="text-sm font-bold text-white">
                        {userData.identity?.firstName}{" "}
                        {userData.identity?.lastName}
                      </span>
                    </FieldRow>
                    <FieldRow
                      label="Username"
                      sublabel="Public handle across Discotive"
                    >
                      <span className="text-sm font-mono text-amber-400">
                        @{userData.identity?.username || "—"}
                      </span>
                    </FieldRow>
                    <FieldRow
                      label="Email"
                      sublabel="Primary authentication address"
                      noBorder
                    >
                      <span className="text-sm text-[#888]">
                        {userData.identity?.email ||
                          auth.currentUser?.email ||
                          "—"}
                      </span>
                    </FieldRow>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Fingerprint}
                      iconColor="text-violet-400"
                      title="Discotive ID"
                      subtitle="Unique 6-digit immutable identifier — cannot be changed"
                    />
                    <div className="flex items-center justify-between gap-4 p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Hash className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="text-2xl font-black font-mono text-white tracking-[0.25em]">
                          {discotiveId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={copyDiscotiveId}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-[10px] font-bold text-[#888] hover:text-white transition-colors"
                        >
                          {copiedId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          {copiedId ? "Copied" : "Copy"}
                        </button>
                        <div className="px-2 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg">
                          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
                            Immutable
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#444] mt-3">
                      This ID uniquely identifies you across the Discotive
                      network. Share it with allies or employers for
                      verification.
                    </p>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Calendar}
                      iconColor="text-sky-400"
                      title="Account Meta"
                    />
                    <FieldRow
                      label="Member Since"
                      sublabel="Your onboarding date"
                    >
                      <span className="text-sm text-[#888]">{joinDate}</span>
                    </FieldRow>
                    <FieldRow
                      label="Operator Tier"
                      sublabel="Current subscription clearance"
                      noBorder
                    >
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-widest",
                          isPro
                            ? "bg-amber-500/10 border-amber-500/25 text-amber-400"
                            : "bg-white/[0.04] border-white/[0.06] text-[#666]",
                        )}
                      >
                        {isPro ? (
                          <Crown className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        {isPro ? "Pro" : "Essential"}
                      </div>
                    </FieldRow>
                  </Card>
                </motion.div>
              )}

              {/* ════════ PROFILE ════════ */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Profile Settings
                  </h2>

                  <Card>
                    <CardHeader
                      icon={Edit3}
                      iconColor="text-sky-400"
                      title="Operator Profile"
                      subtitle="Your career identity card — what the world sees"
                    />

                    <div className="flex items-center gap-4 p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-xl font-black text-white shrink-0">
                        {`${userData.identity?.firstName?.charAt(0) || ""}${userData.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
                          "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {userData.identity?.firstName}{" "}
                          {userData.identity?.lastName}
                        </p>
                        <p className="text-xs text-[#666] font-mono">
                          @{userData.identity?.username || "—"}
                        </p>
                        <p className="text-xs text-[#555] mt-0.5 truncate">
                          {userData.identity?.domain ||
                            userData.vision?.passion ||
                            "No domain set"}{" "}
                          ·{" "}
                          {userData.identity?.niche ||
                            userData.vision?.niche ||
                            "No niche"}
                        </p>
                      </div>
                    </div>

                    <Link
                      to="/app/profile/edit"
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e0e0e0] transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      <Edit3 className="w-4 h-4" /> Open Profile Editor
                    </Link>

                    <div className="mt-4 flex items-center gap-2 p-3 bg-sky-500/5 border border-sky-500/15 rounded-xl">
                      <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-sky-400">
                          Your public profile URL
                        </p>
                        <p className="text-[10px] text-[#555] font-mono truncate">
                          discotive.in/@
                          {userData.identity?.username || "handle"}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `https://discotive.in/@${userData.identity?.username}`,
                          );
                          showToast("Link copied!", "green");
                        }}
                        className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[9px] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/20 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={User}
                      iconColor="text-white/50"
                      title="Biography"
                      subtitle="Shown on your public profile"
                    />
                    <div className="p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl text-sm text-[#888] leading-relaxed min-h-[80px]">
                      {userData.footprint?.bio || (
                        <span className="text-[#444] italic">
                          No biography provided. Add one in the Profile Editor.
                        </span>
                      )}
                    </div>
                    <Link
                      to="/app/profile/edit"
                      className="flex items-center gap-1.5 text-xs font-bold text-sky-400/70 hover:text-sky-400 transition-colors mt-3"
                    >
                      Edit in Profile Editor{" "}
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </Card>
                </motion.div>
              )}

              {/* ════════ CONNECTORS ════════ */}
              {activeTab === "connectors" && (
                <motion.div
                  key="connectors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    App Connectors
                  </h2>
                  <p className="text-xs text-[#555] -mt-2 mb-4">
                    Link your external profiles. Connected accounts appear on
                    your public career profile and boost verification score.
                  </p>

                  <Card>
                    <div className="space-y-2">
                      {CONNECTORS.map(
                        ({ key, label, icon: Icon, color, hint }) => {
                          const val = userData?.links?.[key] || "";
                          const isConnected = !!val;
                          const isEditing = connectorEdit === key;

                          return (
                            <div
                              key={key}
                              className={cn(
                                "flex flex-col gap-3 p-4 rounded-xl border transition-all",
                                isConnected
                                  ? "bg-[#050505] border-[#1a1a1a]"
                                  : "bg-transparent border-[#111]",
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                                    <Icon
                                      className="w-4 h-4"
                                      style={{ color }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-white">
                                      {label}
                                    </p>
                                    {isConnected && !isEditing && (
                                      <p className="text-[10px] text-[#555] font-mono truncate max-w-[200px]">
                                        {val}
                                      </p>
                                    )}
                                    {!isConnected && (
                                      <p className="text-[10px] text-[#444]">
                                        Not connected
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {isConnected && !isEditing && (
                                    <>
                                      <a
                                        href={val}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/10 transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-[#888]" />
                                      </a>
                                      <button
                                        onClick={() => {
                                          setConnectorEdit(key);
                                          setConnectorValue(val);
                                        }}
                                        className="p-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg hover:bg-white/10 transition-colors"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-[#888]" />
                                      </button>
                                      <button
                                        onClick={() => handleDisconnect(key)}
                                        className="p-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
                                      >
                                        <X className="w-3.5 h-3.5 text-rose-400" />
                                      </button>
                                    </>
                                  )}
                                  {!isConnected && !isEditing && (
                                    <button
                                      onClick={() => {
                                        setConnectorEdit(key);
                                        setConnectorValue("");
                                      }}
                                      className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:bg-emerald-500/20 transition-colors"
                                    >
                                      Connect
                                    </button>
                                  )}
                                  {isEditing && (
                                    <button
                                      onClick={() => {
                                        setConnectorEdit(null);
                                        setConnectorValue("");
                                      }}
                                      className="p-1.5 bg-[#1a1a1a] rounded-lg"
                                    >
                                      <X className="w-3.5 h-3.5 text-[#666]" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="flex gap-2"
                                >
                                  <input
                                    autoFocus
                                    type="url"
                                    value={connectorValue}
                                    onChange={(e) =>
                                      setConnectorValue(e.target.value)
                                    }
                                    placeholder={hint}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && handleSaveConnector()
                                    }
                                    className="flex-1 bg-[#111] border border-[#222] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors font-mono"
                                  />
                                  <button
                                    onClick={handleSaveConnector}
                                    disabled={
                                      isSaving || !connectorValue.trim()
                                    }
                                    className="px-4 py-2.5 bg-white text-black text-xs font-black rounded-xl hover:bg-[#ddd] disabled:opacity-40 transition-all flex items-center gap-1.5"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    Save
                                  </button>
                                </motion.div>
                              )}

                              {isConnected && !isEditing && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">
                                    Connected
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ════════ PRIVACY & AI ════════ */}
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Privacy & AI
                  </h2>

                  <Card>
                    <CardHeader
                      icon={Brain}
                      iconColor="text-violet-400"
                      title="Machine Learning Consent"
                      subtitle="Controls whether your anonymised usage data trains future Discotive AI models"
                    />
                    <FieldRow
                      label="AI Training Consent"
                      sublabel="Allow anonymised data for model improvement"
                    >
                      <Toggle
                        value={mlConsent}
                        onToggle={() =>
                          handleToggle("settings.mlConsent", mlConsent)
                        }
                      />
                    </FieldRow>
                    <FieldRow
                      label="Personalised Recommendations"
                      sublabel="AI uses your activity to surface relevant content"
                      noBorder
                    >
                      <Toggle
                        value={mlConsent}
                        onToggle={() =>
                          handleToggle("settings.mlConsent", mlConsent)
                        }
                      />
                    </FieldRow>
                    <div className="mt-4 p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                      <p className="text-[10px] text-[#666] leading-relaxed">
                        Discotive never sells data. Disabling consent opts you
                        out of aggregate model training while keeping all
                        features active. Your vault assets are always stored
                        encrypted.
                      </p>
                    </div>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Eye}
                      iconColor="text-sky-400"
                      title="Profile Visibility"
                      subtitle="Who can see your career data"
                    />
                    <FieldRow
                      label="Public Profile"
                      sublabel="Anyone with your link can view your career profile"
                    >
                      <Toggle
                        value={publicProfile}
                        onToggle={() =>
                          handleToggle("settings.publicProfile", publicProfile)
                        }
                      />
                    </FieldRow>
                    <FieldRow
                      label="Show Discotive Score"
                      sublabel="Display your score on your public profile"
                      noBorder
                    >
                      <Toggle
                        value={showScore}
                        onToggle={() =>
                          handleToggle("settings.showScore", showScore)
                        }
                      />
                    </FieldRow>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Download}
                      iconColor="text-emerald-400"
                      title="Data Export"
                      subtitle="Download everything Discotive holds about you"
                    />
                    <p className="text-xs text-[#555] mb-5">
                      Export your complete dataset as structured JSON — includes
                      identity, vault, scores, and journal entries. Compliant
                      with GDPR Art. 20.
                    </p>
                    <button
                      onClick={handleExportData}
                      disabled={isExportingData}
                      className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                    >
                      {isExportingData ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isExportingData
                        ? "Compiling..."
                        : "Export My Data (JSON)"}
                    </button>
                  </Card>
                </motion.div>
              )}

              {/* ════════ NOTIFICATIONS ════════ */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Notifications
                  </h2>

                  <Card>
                    <CardHeader
                      icon={Mail}
                      iconColor="text-amber-400"
                      title="Email Notifications"
                      subtitle="Activity alerts and system updates delivered to your inbox"
                    />
                    <FieldRow
                      label="Email Notifications"
                      sublabel="Score changes, alliance requests, vault verifications"
                    >
                      <Toggle
                        value={emailNotifs}
                        onToggle={() =>
                          handleToggle(
                            "settings.emailNotifications",
                            emailNotifs,
                          )
                        }
                      />
                    </FieldRow>
                    <FieldRow
                      label="Weekly Report"
                      sublabel="Your 7-day performance digest every Monday"
                      noBorder
                    >
                      <Toggle
                        value={userData?.settings?.weeklyReport ?? false}
                        onToggle={() =>
                          handleToggle(
                            "settings.weeklyReport",
                            userData?.settings?.weeklyReport ?? false,
                          )
                        }
                      />
                    </FieldRow>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Rss}
                      iconColor="text-emerald-400"
                      title="Discotive Newsletter"
                      subtitle="Product updates, feature drops, and platform insights"
                    />
                    <FieldRow
                      label="Subscribe to Newsletter"
                      sublabel="Bi-weekly — no spam, ever. Unsubscribe anytime."
                      noBorder
                    >
                      <Toggle
                        value={newsletter}
                        onToggle={() =>
                          handleToggle("settings.newsletter", newsletter)
                        }
                      />
                    </FieldRow>
                    {newsletter && (
                      <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <p className="text-[10px] text-emerald-400/80">
                          Subscribed. Updates go to{" "}
                          {userData.identity?.email || auth.currentUser?.email}.
                        </p>
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {/* ════════ SECURITY ════════ */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Security & Access
                  </h2>

                  <Card>
                    <CardHeader
                      icon={KeyRound}
                      iconColor="text-blue-400"
                      title="Authentication"
                      subtitle="Password and login security controls"
                    />
                    <FieldRow label="Password" sublabel="Last changed: unknown">
                      <button
                        onClick={handlePasswordReset}
                        disabled={isResettingPass}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-500/20 disabled:opacity-40 transition-all"
                      >
                        {isResettingPass ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                        Send Reset Email
                      </button>
                    </FieldRow>
                    <FieldRow
                      label="Login Email"
                      sublabel="Verified authentication address"
                      noBorder
                    >
                      <span className="text-xs font-mono text-[#666]">
                        {auth.currentUser?.email || "—"}
                      </span>
                    </FieldRow>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Monitor}
                      iconColor="text-sky-400"
                      title="Active Session"
                      subtitle="Your current device and browser"
                    />
                    <div className="p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                            {sessionInfo.os === "Android" ||
                            sessionInfo.os === "iOS" ? (
                              <Smartphone className="w-5 h-5 text-[#888]" />
                            ) : (
                              <Laptop className="w-5 h-5 text-[#888]" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {sessionInfo.os} · {sessionInfo.browser}
                            </p>
                            <p className="text-[10px] text-[#555] font-mono mt-0.5">
                              This device — Current session
                            </p>
                            <div className="flex items-center gap-1.5 mt-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest">
                                Active Now
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="px-2 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg text-[9px] font-black text-sky-400 uppercase tracking-widest shrink-0">
                          Trusted
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#444] mt-3">
                      Multi-device session management is a Pro feature. Upgrade
                      to view all active sessions and remotely terminate them.
                    </p>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={ShieldCheck}
                      iconColor="text-emerald-400"
                      title="Account Security Score"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Email Verified",
                          done: !!auth.currentUser?.emailVerified,
                          color: "emerald",
                        },
                        {
                          label: "Profile Complete",
                          done: !!(
                            userData.identity?.firstName &&
                            userData.identity?.lastName
                          ),
                          color: "amber",
                        },
                        {
                          label: "Connectors Linked",
                          done: Object.values(userData?.links || {}).some(
                            Boolean,
                          ),
                          color: "sky",
                        },
                      ].map(({ label, done, color }) => (
                        <div
                          key={label}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border text-center",
                            done
                              ? color === "emerald"
                                ? "bg-emerald-500/10 border-emerald-500/20"
                                : color === "amber"
                                  ? "bg-amber-500/10 border-amber-500/20"
                                  : "bg-sky-500/10 border-sky-500/20"
                              : "bg-[#050505] border-[#111]",
                          )}
                        >
                          {done ? (
                            <Check
                              className={cn(
                                "w-5 h-5 mb-1.5",
                                color === "emerald"
                                  ? "text-emerald-400"
                                  : color === "amber"
                                    ? "text-amber-400"
                                    : "text-sky-400",
                              )}
                            />
                          ) : (
                            <X className="w-5 h-5 mb-1.5 text-[#444]" />
                          )}
                          <p
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              done
                                ? color === "emerald"
                                  ? "text-emerald-400"
                                  : color === "amber"
                                    ? "text-amber-400"
                                    : "text-sky-400"
                                : "text-[#444]",
                            )}
                          >
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ════════ SUBSCRIPTION ════════ */}
              {activeTab === "subscription" && (
                <motion.div
                  key="subscription"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Subscription
                  </h2>

                  <div
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-6 md:p-8 border",
                      isPro
                        ? "bg-gradient-to-br from-amber-500/10 to-[#0a0a0a] border-amber-500/25"
                        : "bg-[#0a0a0a] border-[#1a1a1a]",
                    )}
                  >
                    {isPro && (
                      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500 opacity-[0.04] blur-3xl rounded-full pointer-events-none" />
                    )}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">
                          Current Plan
                        </p>
                        <h3 className="text-3xl font-black text-white flex items-center gap-3 mb-3">
                          {isPro ? "Discotive Pro" : "Essential"}
                          {isPro && (
                            <Crown className="w-7 h-7 text-amber-500" />
                          )}
                        </h3>
                        <div className="space-y-1.5">
                          {[
                            isPro
                              ? "Unlimited AI comparisons & execution maps"
                              : "1 AI comparison per day",
                            isPro
                              ? "Full ML opt-out controls"
                              : "Standard telemetry features",
                            isPro
                              ? "Daily Execution Ledger (journal)"
                              : "Locked — Pro only",
                            isPro
                              ? "Advanced vault verification priority"
                              : "Standard verification queue",
                          ].map((feat, i) => (
                            <p
                              key={i}
                              className="flex items-center gap-2 text-sm text-[#888]"
                            >
                              <Check
                                className={cn(
                                  "w-4 h-4 shrink-0",
                                  i < 2 || isPro
                                    ? "text-emerald-500"
                                    : "text-[#333]",
                                )}
                              />
                              {feat}
                            </p>
                          ))}
                        </div>
                      </div>
                      {!isPro && (
                        <Link
                          to="/premium"
                          className="shrink-0 px-8 py-4 bg-white text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-[#ddd] transition-colors shadow-[0_0_40px_rgba(255,255,255,0.1)] text-center"
                        >
                          Upgrade to Pro
                        </Link>
                      )}
                      {isPro && (
                        <div className="shrink-0 px-6 py-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                            Pro Active
                          </p>
                          <p className="text-[9px] text-amber-500/50 mt-0.5">
                            Full clearance granted
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <Card>
                    <CardHeader
                      icon={Sparkles}
                      iconColor="text-amber-400"
                      title="Feature Matrix"
                    />
                    <div className="space-y-0">
                      {[
                        ["Daily Execution Ledger", false, true],
                        ["Unlimited Execution Maps", false, true],
                        ["AI Career Comparisons", "1/day", "Unlimited"],
                        ["Vault Verification Priority", false, true],
                        ["ML Data Opt-Out", false, true],
                        ["Multi-Device Sessions", false, true],
                        ["Export DCI PDF", true, true],
                        ["Public Profile", true, true],
                      ].map(([feature, essential, pro]) => (
                        <div
                          key={feature}
                          className="flex items-center justify-between py-3 border-b border-[#0f0f0f] last:border-0"
                        >
                          <span className="text-sm text-[#888]">{feature}</span>
                          <div className="flex items-center gap-8">
                            <span className="text-[10px] text-center w-16 text-[#444]">
                              {essential === true ? (
                                <Check className="w-3.5 h-3.5 text-[#555] mx-auto" />
                              ) : essential === false ? (
                                <X className="w-3 h-3 text-[#333] mx-auto" />
                              ) : (
                                essential
                              )}
                            </span>
                            <span className="text-[10px] text-center w-16">
                              {pro === true ? (
                                <Check className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                              ) : pro === false ? (
                                <X className="w-3 h-3 text-[#333] mx-auto" />
                              ) : (
                                pro
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end mt-3 gap-8 pr-0.5">
                      <span className="text-[9px] font-black text-[#444] uppercase tracking-widest w-16 text-center">
                        Essential
                      </span>
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest w-16 text-center">
                        Pro
                      </span>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* ════════ ADVANCED ════════ */}
              {activeTab === "advanced" && (
                <motion.div
                  key="advanced"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Advanced Controls
                  </h2>

                  <Card>
                    <CardHeader
                      icon={Cpu}
                      iconColor="text-violet-400"
                      title="Local Cache"
                      subtitle="Flush IndexedDB and query cache to force a full data refresh"
                    />
                    <FieldRow
                      label="Execution Cache"
                      sublabel="Clears all locally stored execution map data"
                    >
                      <button
                        onClick={() => {
                          useAppStore.getState().flushCache();
                          showToast("Cache flushed.", "green");
                        }}
                        className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-violet-500/20 transition-all"
                      >
                        Flush Cache
                      </button>
                    </FieldRow>
                    <FieldRow
                      label="Session Storage"
                      sublabel="Clears session-scoped profile cache"
                      noBorder
                    >
                      <button
                        onClick={() => {
                          sessionStorage.clear();
                          showToast("Session cleared.", "green");
                        }}
                        className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-violet-500/20 transition-all"
                      >
                        Clear Session
                      </button>
                    </FieldRow>
                  </Card>

                  <Card>
                    <CardHeader
                      icon={Bell}
                      iconColor="text-amber-400"
                      title="Granular Notifications"
                      subtitle="Control exactly which events trigger notifications"
                    />
                    {[
                      {
                        key: "settings.notifications.arena",
                        label: "Arena & Rank Events",
                        sub: "Rank changes, percentile shifts, leaderboard milestones",
                      },
                      {
                        key: "settings.notifications.network",
                        label: "Network Events",
                        sub: "Alliance requests, competitor tracking, DMs",
                      },
                      {
                        key: "settings.notifications.system",
                        label: "System Events",
                        sub: "Vault verifications, score mutations, streak warnings",
                      },
                      {
                        key: "settings.notifications.marketing",
                        label: "Marketing & Updates",
                        sub: "Product announcements, feature drops",
                      },
                    ].map(({ key, label, sub }, i, arr) => (
                      <FieldRow
                        key={key}
                        label={label}
                        sublabel={sub}
                        noBorder={i === arr.length - 1}
                      >
                        <Toggle
                          value={
                            userData?.settings?.notifications?.[
                              key.split(".").pop()
                            ] ?? true
                          }
                          onToggle={() =>
                            handleToggle(
                              key,
                              userData?.settings?.notifications?.[
                                key.split(".").pop()
                              ] ?? true,
                            )
                          }
                        />
                      </FieldRow>
                    ))}
                  </Card>
                </motion.div>
              )}

              {/* ════════ DANGER ZONE ════════ */}
              {activeTab === "danger" && (
                <motion.div
                  key="danger"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-black text-white mb-4">
                    Danger Zone
                  </h2>

                  <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-400/80 leading-relaxed">
                      Actions in this section are{" "}
                      <strong className="text-rose-400">
                        permanent and irreversible
                      </strong>
                      . Proceed only if you are certain.
                    </p>
                  </div>

                  <Card>
                    <CardHeader
                      icon={Trash2}
                      iconColor="text-rose-500"
                      title="Terminate Account"
                      subtitle="Permanently delete your Discotive identity and all associated data"
                    />
                    <div className="space-y-3 text-sm text-[#666] mb-6">
                      <p className="flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">✕</span> All
                        vault assets and verifications permanently deleted
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">✕</span>{" "}
                        Discotive Score, history, and streak wiped to zero
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">✕</span> All
                        alliances and network connections severed
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">✕</span> Public
                        profile URL permanently deactivated
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-rose-500 mt-0.5">✕</span>{" "}
                        Discotive ID #{discotiveId} retired and never reassigned
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" /> Initiate Account
                      Termination
                    </button>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── Delete account modal ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#050505] border border-rose-900/50 rounded-2xl p-7 shadow-[0_0_80px_rgba(220,38,38,0.15)] overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mb-5">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                Terminate Protocol?
              </h3>
              <p className="text-sm text-[#666] mb-6 leading-relaxed">
                This action is{" "}
                <span className="text-rose-400 font-bold">permanent</span>. Your
                entire operator record will be wiped from the Discotive network.
              </p>

              {authProvider === "password" && (
                <div className="mb-4">
                  <label className="block text-[9px] font-black text-[#555] uppercase tracking-widest mb-2">
                    Verify Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors placeholder:text-[#333]"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-[9px] font-black text-[#555] uppercase tracking-widest mb-2">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors font-mono tracking-widest placeholder:text-[#333]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm("");
                    setPassword("");
                  }}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-[#111] border border-[#222] text-sm font-bold rounded-xl hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
                >
                  Abort
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={
                    isDeleting ||
                    deleteConfirm !== "DELETE" ||
                    (authProvider === "password" && !password)
                  }
                  className="flex-1 py-3 bg-rose-600 text-white text-sm font-black rounded-xl hover:bg-rose-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:bg-rose-900 disabled:text-rose-200"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Terminate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Toast ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: -20 }}
            className={cn(
              "fixed bottom-6 left-4 md:left-8 z-[700] border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-widest",
              toast.type === "green"
                ? "bg-[#052e16] border-emerald-500/30 text-emerald-400"
                : "bg-[#1a0505] border-rose-500/30 text-rose-400",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
