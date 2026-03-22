import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { deleteUser, sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../firebase";
import { useUserData } from "../hooks/useUserData";
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
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

const TABS = [
  { id: "account", label: "Account Overview", icon: User },
  { id: "privacy", label: "Privacy & Data", icon: Database },
  { id: "security", label: "Security & Access", icon: Shield },
  { id: "preferences", label: "Preferences", icon: Bell },
  { id: "billing", label: "Subscription", icon: CreditCard },
];

const Settings = () => {
  const navigate = useNavigate();
  const { userData, loading, refreshUserData } = useUserData();

  const [activeTab, setActiveTab] = useState("account");
  const [toast, setToast] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isResettingPass, setIsResettingPass] = useState(false);

  const [sessionInfo, setSessionInfo] = useState({
    os: "Unknown",
    browser: "Unknown",
  });

  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    let os = "Unknown OS";
    if (ua.includes("Win")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("like Mac")) os = "iOS";

    setSessionInfo({ os, browser });
  }, []);

  const showToast = (message, type = "default") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleSetting = async (field, currentValue) => {
    if (!userData?.id) return;
    try {
      const userRef = doc(db, "users", userData.id);
      await updateDoc(userRef, { [field]: !currentValue });
      await refreshUserData();
      showToast("Protocol updated.", "green");
    } catch (error) {
      console.error("Setting update failed:", error);
      showToast("Update failed.", "red");
    }
  };

  const handlePasswordReset = async () => {
    if (!auth.currentUser?.email) return;
    setIsResettingPass(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      showToast("Password reset link dispatched to your email.", "green");
    } catch (error) {
      console.error(error);
      showToast("Failed to dispatch reset link.", "red");
    } finally {
      setIsResettingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      showToast("Confirmation code incorrect.", "red");
      return;
    }
    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No authenticated user.");
      if (userData?.id) await deleteDoc(doc(db, "users", userData.id));
      await deleteUser(user);
      navigate("/");
    } catch (error) {
      console.error("Account deletion failed:", error);
      if (error.code === "auth/requires-recent-login") {
        showToast(
          "Security protocol requires a fresh login. Please log out and back in.",
          "red",
        );
      } else {
        showToast("Termination failed. Contact support.", "red");
      }
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#444] animate-spin" />
      </div>
    );
  }

  const isPro = userData.subscription?.tier === "pro";
  const aiConsent = userData.settings?.aiTrainingConsent ?? true;
  const emailNotifs = userData.settings?.emailNotifications ?? true;
  const newsletter = userData.settings?.newsletter ?? false;

  return (
    <div className="bg-[#030303] min-h-screen w-full overflow-x-hidden text-white selection:bg-white selection:text-black pb-32 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      {/* INCREASED MAX-WIDTH FOR PC (1400px instead of 1200px) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-12 relative z-10 pt-8 md:pt-16">
        {/* UPSCALED HEADER */}
        <div className="mb-10 md:mb-16">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-3 md:mb-4">
            System Settings
          </h1>
          <p className="text-[#888] text-sm md:text-lg lg:text-xl font-medium">
            Configure your Discotive OS preferences and security protocols.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-16">
          {/* UPSCALED SIDEBAR (Wider on PC, larger text) */}
          <div className="md:w-72 lg:w-80 shrink-0">
            <div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-4 md:pb-0 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0 sticky top-28">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 lg:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-base lg:text-lg transition-all whitespace-nowrap md:whitespace-normal shrink-0 border",
                      isActive
                        ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                        : "bg-[#0a0a0a] border-[#222] text-[#888] hover:bg-[#111] hover:text-white hover:border-[#333]",
                    )}
                  >
                    <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 w-full min-h-[600px]">
            <AnimatePresence mode="wait">
              {/* --- ACCOUNT OVERVIEW --- */}
              {activeTab === "account" && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 md:space-y-10 w-full"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white border-l-4 border-white pl-4">
                    Account Overview
                  </h2>

                  <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                      <div className="bg-[#111] border border-[#222] p-6 lg:p-8 rounded-2xl lg:rounded-3xl">
                        <p className="text-[10px] lg:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                          Operator Designation
                        </p>
                        <p className="text-lg md:text-xl lg:text-2xl font-extrabold text-white">
                          {userData.identity?.firstName}{" "}
                          {userData.identity?.lastName}
                        </p>
                      </div>

                      <div className="bg-[#111] border border-[#222] p-6 lg:p-8 rounded-2xl lg:rounded-3xl">
                        <p className="text-[10px] lg:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                          Primary Comm-Link
                        </p>
                        <p className="text-lg md:text-xl lg:text-2xl font-medium text-[#ccc] truncate">
                          {userData.identity?.email}
                        </p>
                      </div>

                      <div className="md:col-span-2 bg-[#111] border border-[#222] p-6 lg:p-8 rounded-2xl lg:rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 lg:gap-10">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] lg:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                            Discotive ID
                          </p>
                          <p className="text-sm md:text-base lg:text-lg font-mono text-[#888] select-all truncate">
                            {userData.id}
                          </p>
                        </div>
                        <Link
                          to="/app/profile/edit"
                          className="inline-flex items-center justify-center gap-2 text-xs lg:text-sm font-bold uppercase tracking-widest text-black hover:bg-[#ccc] transition-colors px-6 lg:px-8 py-3 lg:py-4 bg-white rounded-xl shrink-0"
                        >
                          Edit Full Profile <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- PRIVACY & DATA --- */}
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 md:space-y-10 w-full"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white border-l-4 border-white pl-4">
                    Privacy & Data
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {/* AI Training Consent */}
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 flex flex-col justify-between">
                      <div>
                        <p className="text-lg lg:text-xl font-bold text-white mb-3 flex items-center gap-3">
                          Machine Learning Consent
                          {isPro ? (
                            <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
                          ) : (
                            <Lock className="w-5 h-5 lg:w-6 lg:h-6 text-amber-500" />
                          )}
                        </p>
                        <p className="text-sm lg:text-base text-[#888] leading-relaxed mb-8">
                          Allow Discotive to securely utilize your anonymized
                          execution data, roadmap telemetry, and networking
                          behavior to train and improve our global AI alignment
                          engine.
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-6 border-t border-[#222]">
                        {!isPro ? (
                          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <p className="text-[10px] lg:text-xs font-bold text-amber-500 uppercase tracking-widest">
                              Pro Only
                            </p>
                          </div>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() =>
                            isPro &&
                            handleToggleSetting(
                              "settings.aiTrainingConsent",
                              aiConsent,
                            )
                          }
                          disabled={!isPro}
                          className={cn(
                            "relative w-16 lg:w-20 h-8 lg:h-10 rounded-full transition-colors shrink-0 outline-none",
                            aiConsent ? "bg-green-500" : "bg-[#333]",
                            !isPro && "opacity-50 cursor-not-allowed",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1 left-1 bg-white w-6 lg:w-8 h-6 lg:h-8 rounded-full transition-transform shadow-md",
                              aiConsent
                                ? "translate-x-8 lg:translate-x-10"
                                : "translate-x-0",
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Newsletter Toggle */}
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 flex flex-col justify-between">
                      <div>
                        <p className="text-lg lg:text-xl font-bold text-white mb-3">
                          Discotive Dispatch
                        </p>
                        <p className="text-sm lg:text-base text-[#888] leading-relaxed mb-8">
                          Receive our highly-curated weekly newsletter featuring
                          platform updates, top operator strategies, and
                          algorithmic insights directly to your inbox.
                        </p>
                      </div>
                      <div className="flex justify-end mt-auto pt-6 border-t border-[#222]">
                        <button
                          onClick={() =>
                            handleToggleSetting(
                              "settings.newsletter",
                              newsletter,
                            )
                          }
                          className={cn(
                            "relative w-16 lg:w-20 h-8 lg:h-10 rounded-full transition-colors shrink-0 outline-none",
                            newsletter ? "bg-white" : "bg-[#333]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-1 left-1 w-6 lg:w-8 h-6 lg:h-8 rounded-full transition-transform shadow-md",
                              newsletter
                                ? "translate-x-8 lg:translate-x-10 bg-black"
                                : "translate-x-0 bg-[#888]",
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- SECURITY & ACCESS --- */}
              {activeTab === "security" && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 md:space-y-10 w-full"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white border-l-4 border-white pl-4">
                    Security & Access
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {/* Password Reset */}
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 flex flex-col justify-between">
                      <div>
                        <p className="text-lg lg:text-xl font-bold text-white mb-3 flex items-center gap-3">
                          <Lock className="w-5 h-5 lg:w-6 lg:h-6" />{" "}
                          Authentication
                        </p>
                        <p className="text-sm lg:text-base text-[#888] mb-8">
                          Request a secure link to reset your cryptographic key
                          (password).
                        </p>
                      </div>
                      <button
                        onClick={handlePasswordReset}
                        disabled={isResettingPass}
                        className="w-full px-6 py-4 bg-[#111] border border-[#333] hover:border-white text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-3 mt-auto"
                      >
                        {isResettingPass ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Mail className="w-5 h-5" />
                        )}{" "}
                        Send Reset Link
                      </button>
                    </div>

                    {/* Active Sessions */}
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 flex flex-col justify-between">
                      <div>
                        <p className="text-lg lg:text-xl font-bold text-white mb-5 flex items-center gap-3">
                          <Activity className="w-5 h-5 lg:w-6 lg:h-6" /> Active
                          Session
                        </p>
                        <div className="flex items-center gap-5 p-5 lg:p-6 bg-[#111] border border-[#333] rounded-2xl mb-4">
                          <div className="p-3 bg-[#222] rounded-xl shrink-0">
                            {sessionInfo.os === "iOS" ||
                            sessionInfo.os === "Android" ? (
                              <Smartphone className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                            ) : (
                              <Laptop className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm lg:text-lg font-bold text-white">
                              {sessionInfo.os} • {sessionInfo.browser}
                            </p>
                            <p className="text-[10px] lg:text-xs text-green-500 font-extrabold tracking-[0.2em] uppercase mt-1.5 flex items-center gap-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />{" "}
                              Live Now
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DANGER ZONE (Spans both columns) */}
                    <div className="md:col-span-2 bg-red-500/5 border border-red-900/30 rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 lg:gap-12">
                      <div className="flex-1">
                        <p className="text-lg lg:text-2xl font-bold text-red-500 mb-3 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 lg:w-7 lg:h-7" />{" "}
                          Danger Zone
                        </p>
                        <p className="text-sm lg:text-base text-[#888] max-w-2xl leading-relaxed">
                          Permanently terminate your account and erase all
                          footprint data from our servers. This action is
                          irreversible.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-8 py-4 lg:py-5 bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-sm lg:text-base font-extrabold rounded-xl lg:rounded-2xl transition-colors flex items-center justify-center gap-3 shrink-0"
                      >
                        <Trash2 className="w-5 h-5 lg:w-6 lg:h-6" /> Terminate
                        Protocol
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- PREFERENCES --- */}
              {activeTab === "preferences" && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 md:space-y-10 w-full"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white border-l-4 border-white pl-4">
                    Preferences
                  </h2>

                  <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-6 md:p-10 lg:p-12">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                      <div className="flex-1">
                        <p className="text-lg lg:text-xl font-bold text-white mb-3">
                          Push & Email Notifications
                        </p>
                        <p className="text-sm lg:text-base text-[#888] leading-relaxed max-w-2xl">
                          Receive vital alerts regarding Alliance Requests,
                          Vault verifications, and Leaderboard ranking shifts
                          directly to your devices.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          handleToggleSetting(
                            "settings.emailNotifications",
                            emailNotifs,
                          )
                        }
                        className={cn(
                          "relative w-16 lg:w-20 h-8 lg:h-10 rounded-full transition-colors shrink-0 outline-none",
                          emailNotifs ? "bg-white" : "bg-[#333]",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 left-1 w-6 lg:w-8 h-6 lg:h-8 rounded-full transition-transform shadow-md",
                            emailNotifs
                              ? "translate-x-8 lg:translate-x-10 bg-black"
                              : "translate-x-0 bg-[#888]",
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* --- BILLING & SUBSCRIPTION --- */}
              {activeTab === "billing" && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 md:space-y-10 w-full"
                >
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white border-l-4 border-white pl-4">
                    Subscription Details
                  </h2>

                  <div className="bg-gradient-to-br from-[#111] to-[#050505] border border-[#222] rounded-2xl md:rounded-[2.5rem] p-8 md:p-12 lg:p-16 relative overflow-hidden">
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 p-8 md:p-12 opacity-5">
                      <CreditCard className="w-64 h-64 lg:w-96 lg:h-96" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                      <div>
                        <p className="text-[10px] lg:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-3">
                          Current Clearance
                        </p>
                        <h3 className="text-4xl lg:text-5xl font-extrabold text-white flex items-center gap-4 mb-6">
                          {isPro ? "Discotive Pro" : "Free Tier"}
                          {isPro && (
                            <Sparkles className="w-10 h-10 lg:w-12 lg:h-12 text-amber-500" />
                          )}
                        </h3>

                        <div className="space-y-3 lg:space-y-4">
                          <p className="text-sm lg:text-lg text-[#888] flex items-center gap-3">
                            <Check className="w-5 h-5 lg:w-6 lg:h-6 text-green-500 shrink-0" />
                            {isPro
                              ? "Unlimited AI comparisons & analytics."
                              : "Limited to 1 AI comparison per day."}
                          </p>
                          <p className="text-sm lg:text-lg text-[#888] flex items-center gap-3">
                            <Check className="w-5 h-5 lg:w-6 lg:h-6 text-green-500 shrink-0" />
                            {isPro
                              ? "Full cryptographic opt-out for AI training."
                              : "Standard database telemetry features."}
                          </p>
                        </div>
                      </div>

                      {!isPro && (
                        <Link
                          to="/premium"
                          className="w-full md:w-auto px-10 py-5 bg-white text-black text-base lg:text-lg font-extrabold rounded-xl lg:rounded-2xl hover:bg-[#ccc] transition-colors text-center shadow-[0_0_50px_rgba(255,255,255,0.15)] shrink-0"
                        >
                          Upgrade to Pro
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* THE DANGER ZONE MODAL (Account Deletion)                          */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#050505] border border-red-900/50 rounded-2xl md:rounded-[2rem] p-6 md:p-10 shadow-[0_0_100px_rgba(220,38,38,0.15)] overflow-hidden"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 lg:mb-8">
                <AlertTriangle className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
              </div>

              <h3 className="text-2xl lg:text-3xl font-extrabold text-white mb-3">
                Terminate Protocol?
              </h3>
              <p className="text-[#888] text-sm lg:text-base mb-8 leading-relaxed">
                This will permanently delete your Discotive ID, wipe all
                verified assets, sever all alliances, and drop your score to
                zero.{" "}
                <strong className="text-red-400">This cannot be undone.</strong>
              </p>

              <div className="mb-8 lg:mb-10">
                <label className="block text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-3">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full bg-[#111] border border-[#333] rounded-xl lg:rounded-2xl px-5 py-4 text-base text-white focus:outline-none focus:border-red-500 transition-colors placeholder:text-[#444]"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-[#111] border border-[#333] text-white text-sm lg:text-base font-bold rounded-xl lg:rounded-2xl hover:bg-[#222] transition-colors disabled:opacity-50"
                >
                  Abort
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmation !== "DELETE"}
                  className="flex-1 py-4 bg-red-500 text-white text-sm lg:text-base font-extrabold rounded-xl lg:rounded-2xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-red-500/30 disabled:text-red-200"
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" /> Terminate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOAST NOTIFICATION (Bottom Left) --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: -20 }}
            className={cn(
              "fixed bottom-6 md:bottom-10 left-4 md:left-10 z-[700] border px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl shadow-2xl flex items-center gap-3",
              toast.type === "green"
                ? "bg-[#052e16] border-green-500/30 text-green-400"
                : "bg-[#450a0a] border-red-500/30 text-red-400",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-5 h-5 lg:w-6 lg:h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" />
            )}
            <span className="text-xs lg:text-sm font-mono uppercase tracking-widest">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
