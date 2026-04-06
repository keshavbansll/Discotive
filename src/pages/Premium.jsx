/**
 * @fileoverview Discotive OS - Premium Upgrade Gateway & Pricing Matrix
 * @module Billing/Premium
 * @description
 * MAANG-Grade psychological pricing terminal.
 * * CORE SYSTEMS:
 * 1. IP-Based Dynamic Localization (INR vs USD).
 * 2. Subscription State Routing (Auto-detects active tiers).
 * 3. FOMO UI Architecture (Strikethrough denial states for free tiers).
 */
import { initiateProUpgrade } from "../lib/razorpay";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "../firebase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Activity,
  Network,
  Database,
  Eye,
  TerminalSquare,
  Lock,
  Target,
  Calendar,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";

const Premium = () => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' | 'yearly'
  const [currency, setCurrency] = useState("USD"); // Default to USD
  const [isLocating, setIsLocating] = useState(true);

  // --- GEOLOCATION ENGINE ---
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (data.country_code === "IN") {
          setCurrency("INR");
        }
      } catch (error) {
        console.warn("Geolocation failed. Defaulting to USD.", error);
      } finally {
        setIsLocating(false);
      }
    };
    detectLocation();
  }, []);

  // --- PRICING DATA MATRIX ---
  const PRICING = {
    INR: {
      monthly: { current: "99", crossed: "139", symbol: "₹" },
      yearly: { current: "999", crossed: "1,499", symbol: "₹" },
    },
    USD: {
      monthly: { current: "1.99", crossed: "2.99", symbol: "$" },
      yearly: { current: "19.99", crossed: "29.99", symbol: "$" },
    },
  };

  const currentPricing = PRICING[currency][billingCycle];

  // --- CHECKOUT ROUTING ---
  const handleProAction = async () => {
    if (!userData) return navigate("/auth");
    if (userData.tier === "PRO") return navigate("/app");

    setIsCheckingOut(true);
    try {
      // 1. HARD VERIFICATION: Ensure the deep auth session exists
      if (!auth.currentUser) {
        alert(
          "System Fault: Auth session desynchronized. Please log out and log back in.",
        );
        setIsCheckingOut(false);
        return;
      }

      // 2. EXTRACT RAW CRYPTOGRAPHIC TOKEN (Force refresh to ensure it's valid)
      const token = await auth.currentUser.getIdToken(true);

      // 3. DIRECT API STRIKE (Bypassing Firebase SDK routing bugs)
      // We use your exact Cloud Run container URL, not the legacy .net proxy
      const response = await fetch(
        "https://createprosubscription-c4wsj73agq-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Manually inject the identity
          },
          body: JSON.stringify({ data: {} }), // Firebase onCall requires this exact payload structure
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend Rejection:", errorText);
        throw new Error(`API Gateway Rejected: ${response.status}`);
      }

      // 4. PARSE THE CALLABLE PROTOCOL RESPONSE
      const jsonResponse = await response.json();
      const subscriptionId = jsonResponse.result.subscriptionId;

      // 5. BOOT THE GATEWAY
      await initiateProUpgrade(userData, subscriptionId);
    } catch (error) {
      console.error("Checkout failed to initialize:", error);
      alert("Failed to connect to the payment gateway. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleEssentialAction = () => {
    if (!userData) return navigate("/auth");
    navigate("/app");
  };

  if (loading || isLocating) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  const isPro = userData?.tier === "PRO";

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-amber-500 selection:text-black pb-32 font-sans relative overflow-hidden">
      {/* OS Background Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-24 md:pt-32 pb-16 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#333] bg-[#111] mb-6 shadow-2xl">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-extrabold text-[#ccc] uppercase tracking-[0.2em]">
              Clearance Level Upgrade
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 leading-tight">
            Unlock God-Mode.
          </h1>
          <p className="text-sm md:text-base text-[#888] font-medium tracking-wide max-w-2xl mx-auto leading-relaxed">
            The Essential tier proves you exist. Discotive Pro gives you the
            algorithmic intelligence, competitive X-Ray vision, and unlimited
            execution bandwidth to dominate the global leaderboard.
          </p>
        </motion.div>

        {/* BILLING TOGGLE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12 flex items-center justify-center gap-4"
        >
          <span
            className={cn(
              "text-xs font-bold uppercase tracking-widest transition-colors",
              billingCycle === "monthly" ? "text-white" : "text-[#666]",
            )}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBillingCycle((b) => (b === "monthly" ? "yearly" : "monthly"))
            }
            className="w-14 h-7 bg-[#111] border border-[#333] rounded-full p-1 relative transition-colors focus:outline-none"
          >
            <motion.div
              className="w-5 h-5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              animate={{ x: billingCycle === "yearly" ? 26 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors",
                billingCycle === "yearly" ? "text-white" : "text-[#666]",
              )}
            >
              Annually
            </span>
            <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[8px] font-black uppercase tracking-widest rounded">
              Save 16%
            </span>
          </div>
        </motion.div>
      </div>

      {/* PRICING MATRIX */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* TIER 1: ESSENTIAL (FREE) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#050505] border border-[#222] rounded-[2rem] p-8 flex flex-col h-[700px] opacity-80 hover:opacity-100 transition-opacity"
          >
            <div className="mb-8 border-b border-[#222] pb-8">
              <h2 className="text-xl font-black tracking-tighter text-white mb-2 uppercase">
                Essential
              </h2>
              <p className="text-xs text-[#666] font-medium h-8 leading-relaxed">
                Baseline deployment for early-stage operators.
              </p>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-black tracking-tighter text-white">
                  {PRICING[currency].monthly.symbol}0
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <FeatureItem icon={Target} title="Career Command Engine" />
              <FeatureItem
                icon={Network}
                title="Execution Plan"
                value="Max 15 Nodes"
              />
              <FeatureItem
                icon={TerminalSquare}
                title="Daily Journal"
                isStrikethrough
              />
              <FeatureItem
                icon={Activity}
                title="Competitor Dashboard"
                isStrikethrough
              />
              <FeatureItem
                icon={Eye}
                title="Leaderboard Comparison"
                isStrikethrough
              />
              <FeatureItem
                icon={Database}
                title="Asset Vault"
                value="5 Assets / 15MB"
              />
              <FeatureItem
                icon={Calendar}
                title="Calendar Roadmap"
                isStrikethrough
              />
            </div>

            <button
              onClick={handleEssentialAction}
              disabled={isPro}
              className={cn(
                "w-full py-4 mt-8 rounded-xl font-extrabold text-xs uppercase tracking-widest text-center transition-colors",
                isPro
                  ? "border border-[#333] bg-[#111] text-[#666] cursor-not-allowed"
                  : "bg-white text-black hover:bg-[#ccc]",
              )}
            >
              {isPro ? "Already on Pro" : "Dashboard"}
            </button>
          </motion.div>

          {/* TIER 2: DISCOTIVE PRO (THE APEX) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-amber-500/50 rounded-[2.5rem] p-10 flex flex-col h-[750px] shadow-[0_0_50px_rgba(245,158,11,0.1)] relative z-20 scale-105"
          >
            <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            <div className="mb-8 border-b border-[#222] pb-8">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-3xl font-black tracking-tighter text-white uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  Discotive Pro
                </h2>
                {isPro && (
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[8px] font-black uppercase tracking-widest rounded">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-[#888] font-medium h-8 leading-relaxed">
                Unrestricted bandwidth, competitive intel, and God-Mode metrics.
              </p>

              <div className="mt-4 flex items-end gap-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {currentPricing.symbol}
                    {currentPricing.current}
                  </span>
                  <span className="text-[#666] font-bold text-xs uppercase tracking-widest">
                    / {billingCycle === "monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <span className="text-lg font-bold text-[#444] line-through mb-1">
                  {currentPricing.symbol}
                  {currentPricing.crossed}
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-5">
              <FeatureItem icon={Target} title="Advanced Command Engine" pro />
              <FeatureItem
                icon={Network}
                title="Execution Plan"
                value="Unlimited Nodes"
                pro
              />
              <FeatureItem icon={TerminalSquare} title="Daily Journal" pro />
              <FeatureItem icon={Activity} title="Competitor Dashboard" pro />
              <FeatureItem icon={Eye} title="Leaderboard Comparison" pro />
              <FeatureItem
                icon={Database}
                title="Asset Vault"
                value="Unlimited Assets"
                pro
              />
              <FeatureItem icon={Calendar} title="Calendar Roadmap" pro />
            </div>

            <button
              onClick={handleProAction}
              disabled={isCheckingOut}
              className={cn(
                "w-full py-4 mt-8 rounded-xl font-extrabold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-2xl",
                isPro
                  ? "bg-white text-black hover:bg-[#ccc]"
                  : "bg-amber-500 text-black hover:bg-amber-400 hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] active:scale-[0.98] disabled:opacity-50",
              )}
            >
              {isPro ? (
                "Dashboard"
              ) : isCheckingOut ? (
                <Activity className="w-4 h-4 animate-spin" />
              ) : (
                "Initialize Upgrade"
              )}
            </button>
          </motion.div>

          {/* TIER 3: ENTERPRISE (THE VOID) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-[#050505] border border-[#1a1a1a] rounded-[2rem] p-8 flex flex-col h-[700px] relative overflow-hidden items-center justify-center"
          >
            {/* Cinematic Scanning Effect */}
            <motion.div
              animate={{ top: ["-10%", "110%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-white/5 to-transparent pointer-events-none z-0"
            />

            <div className="relative z-10 flex flex-col items-center text-center opacity-40">
              <Lock className="w-12 h-12 text-[#333] mb-6" />
              <h2 className="text-2xl font-black tracking-widest text-[#555] mb-2 uppercase">
                Enterprise
              </h2>
              <div className="px-3 py-1 bg-[#111] border border-[#222] text-[#444] text-[10px] font-mono tracking-[0.3em] uppercase rounded-md mb-8">
                Deployment Pending
              </div>
              <Activity className="w-6 h-6 text-[#222] animate-pulse" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT FOR FEATURE ROWS ---
const FeatureItem = ({ icon: Icon, title, value, pro, isStrikethrough }) => (
  <div
    className={cn(
      "flex items-center gap-4",
      isStrikethrough ? "opacity-30" : "opacity-100",
    )}
  >
    <div
      className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
        pro
          ? "bg-amber-500/10 border-amber-500/30"
          : isStrikethrough
            ? "bg-red-500/5 border-red-500/10"
            : "bg-[#111] border-[#333]",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4",
          pro
            ? "text-amber-500"
            : isStrikethrough
              ? "text-red-500/50"
              : "text-[#888]",
        )}
      />
    </div>
    <div className="flex flex-col">
      <span
        className={cn(
          "text-xs font-bold tracking-wide",
          pro
            ? "text-white"
            : isStrikethrough
              ? "text-[#666] line-through decoration-red-500/50"
              : "text-[#ccc]",
        )}
      >
        {title}
      </span>
      {value && (
        <span
          className={cn(
            "text-[9px] font-mono uppercase tracking-widest",
            pro ? "text-amber-500/80" : "text-[#666]",
          )}
        >
          {value}
        </span>
      )}
    </div>
  </div>
);

export default Premium;
