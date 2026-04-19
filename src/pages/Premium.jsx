import { initiateProUpgrade } from "../lib/razorpay";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth } from "../firebase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  Crown,
  Activity,
  Network,
  Eye,
  TerminalSquare,
  Target,
  Calendar,
  CheckCircle2,
  Briefcase,
  Book,
  PieChart,
  Crosshair,
  Zap,
  Info,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";

/* ─── Design tokens ─────────────────────────────────────────────────────── */
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

/* ─── Features Matrix ───────────────────────────────────────────────────── */
const FEATURES = [
  { id: "cmd", title: "Career Command Center", icon: Target, proOnly: false },
  {
    id: "cons",
    title: "Consistency Engine",
    icon: TerminalSquare,
    proOnly: false,
  },
  {
    id: "adv_met",
    title: "Advance position metrices",
    icon: Activity,
    proOnly: true,
  },
  { id: "lb", title: "Global Leaderboard", icon: Crown, proOnly: false },
  { id: "conn", title: "App connectors", icon: Network, proOnly: false },
  {
    id: "verif",
    title: "Priority Verification",
    icon: CheckCircle2,
    proOnly: true,
  },
  { id: "agenda", title: "Discotive Agenda", icon: Calendar, proOnly: true },
  { id: "courses", title: "Personalised courses", icon: Book, proOnly: false },
  {
    id: "sel_pct",
    title: "Selection percentage",
    icon: PieChart,
    proOnly: true,
  },
  { id: "opps", title: "Live opportunities", icon: Briefcase, proOnly: false },
  {
    id: "target_bf",
    title: "Target Battlefield",
    icon: Crosshair,
    proOnly: true,
  },
  { id: "xray", title: "X-ray Analysis", icon: Eye, proOnly: true },
];

/* ─── Sub-Components ────────────────────────────────────────────────────── */
const FeatureItem = ({ icon: Icon, title, pro, isStrikethrough }) => (
  <div
    className={cn(
      "flex items-center gap-4",
      isStrikethrough ? "opacity-30" : "opacity-100",
    )}
  >
    <div
      className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
        pro
          ? "bg-[#BFA264] border-transparent shadow-[0_0_12px_rgba(191,162,100,0.3)]"
          : isStrikethrough
            ? "bg-red-500/5 border border-red-500/10"
            : "bg-[#111] border border-[#333]",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4",
          pro
            ? "text-[#030303]"
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
    </div>
  </div>
);

const HeaderBlock = ({ billingCycle, setBillingCycle }) => (
  <div className="text-center relative z-10 mb-12 lg:mb-16">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#BFA264]/30 bg-[#141414] mb-6 shadow-[0_0_20px_rgba(191,162,100,0.1)]">
        <Crown className="w-4 h-4 text-[#D4AF78]" />
        <span className="text-[10px] font-extrabold text-[#BFA264] uppercase tracking-[0.2em]">
          Premium Access
        </span>
      </div>
      <h1 className="text-4xl lg:text-7xl font-black tracking-tighter text-white mb-6 leading-tight font-display">
        Maximize your potential.
      </h1>
      <p className="text-sm lg:text-base text-[#888] font-medium tracking-wide max-w-2xl mx-auto leading-relaxed px-4">
        The Essential plan builds your foundation. Discotive Pro accelerates
        your growth with deep analytics, priority capabilities, and complete
        access to all platform features.
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="mt-10 flex items-center justify-center gap-4"
    >
      <span
        className={cn(
          "text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-colors",
          billingCycle === "monthly" ? "text-white" : "text-[#666]",
        )}
      >
        Monthly
      </span>
      <button
        onClick={() =>
          setBillingCycle((b) => (b === "monthly" ? "yearly" : "monthly"))
        }
        className="w-14 h-7 bg-[#111] border border-[#333] rounded-full p-1 relative transition-colors focus:outline-none flex-shrink-0"
        aria-label="Toggle billing cycle"
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
            "text-[10px] lg:text-xs font-bold uppercase tracking-widest transition-colors",
            billingCycle === "yearly" ? "text-white" : "text-[#666]",
          )}
        >
          Annually
        </span>
        <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[8px] font-black uppercase tracking-widest rounded whitespace-nowrap">
          Save 16%
        </span>
      </div>
    </motion.div>
  </div>
);

/* ─── Architecture: Native Mobile Layout ────────────────────────────────── */
const MobilePremium = ({
  currentPricing,
  billingCycle,
  isPro,
  handleProAction,
  handleEssentialAction,
  isCheckingOut,
}) => (
  <div className="w-full px-4 pt-20 pb-32">
    <HeaderBlock
      billingCycle={billingCycle}
      setBillingCycle={handleEssentialAction}
    />

    <div
      className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-4 pb-8"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* Essential Card (Mobile) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="shrink-0 w-[85vw] snap-center bg-[#050505] border border-[#222] rounded-[2rem] p-6 flex flex-col"
      >
        <div className="mb-6 border-b border-[#222] pb-6">
          <div className="flex items-center gap-2 mb-2 group relative">
            <h2 className="text-2xl font-black tracking-tighter text-white">
              Essential Plan
            </h2>
            <Info size={16} className="text-[#666] cursor-help" />
            <div className="absolute top-full left-0 mt-2 w-48 p-3 bg-[#111] border border-[#333] text-[#aaa] text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Baseline access for early-stage professionals.
            </div>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-black tracking-tighter text-white">
              {currentPricing.symbol}0
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 mb-6">
          {FEATURES.map((f) => (
            <FeatureItem
              key={`ess-${f.id}`}
              icon={f.icon}
              title={f.title}
              isStrikethrough={f.proOnly}
            />
          ))}
        </div>

        <button
          onClick={handleEssentialAction}
          disabled={isPro}
          className={cn(
            "w-full py-4 min-h-[44px] rounded-xl font-extrabold text-[10px] uppercase tracking-widest text-center transition-colors focus:outline-none",
            isPro
              ? "border border-[#333] bg-[#111] text-[#666] cursor-not-allowed"
              : "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_20px_rgba(191,162,100,0.3)] active:opacity-90",
          )}
        >
          {isPro ? "Already on Pro Plan" : "Dashboard"}
        </button>
      </motion.div>

      {/* Pro Card (Mobile) */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="shrink-0 w-[85vw] snap-center bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-[#BFA264]/40 rounded-[2.5rem] p-6 flex flex-col shadow-[0_0_40px_rgba(191,162,100,0.1)] relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#BFA264] to-transparent" />

        <div className="mb-6 border-b border-[#222] pb-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 group relative">
              <h2 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#E8D5A3] to-[#BFA264]">
                Pro Plan
              </h2>
              <Info size={16} className="text-[#666] cursor-help" />
              <div className="absolute top-full left-0 mt-2 w-48 p-3 bg-[#111] border border-[#333] text-[#aaa] text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Advanced features for individuals serious about their
                professional growth.
              </div>
            </div>
            {isPro && (
              <span className="px-2 py-0.5 bg-[#BFA264] text-[#030303] text-[8px] font-black uppercase tracking-widest rounded">
                Active
              </span>
            )}
          </div>

          <div className="mt-4 flex items-end gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black tracking-tighter text-white">
                {currentPricing.symbol}
                {currentPricing.current}
              </span>
              <span className="text-[#666] font-bold text-[10px] uppercase tracking-widest">
                / {billingCycle === "monthly" ? "mo" : "yr"}
              </span>
            </div>
            <span className="text-sm font-bold text-[#444] line-through mb-1">
              {currentPricing.symbol}
              {currentPricing.crossed}
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 mb-6">
          {FEATURES.map((f) => (
            <FeatureItem
              key={`pro-${f.id}`}
              icon={f.icon}
              title={f.title}
              pro={f.proOnly}
            />
          ))}
        </div>

        <button
          onClick={handleProAction}
          disabled={isCheckingOut}
          className={cn(
            "w-full py-4 min-h-[44px] rounded-xl font-extrabold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl focus:outline-none active:scale-[0.98]",
            isPro
              ? "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_20px_rgba(191,162,100,0.3)] active:opacity-90"
              : "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_20px_rgba(191,162,100,0.3)] disabled:opacity-50",
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
    </div>
  </div>
);

/* ─── Architecture: High-End Desktop Layout ─────────────────────────────── */
const DesktopPremium = ({
  currentPricing,
  billingCycle,
  isPro,
  handleProAction,
  handleEssentialAction,
  isCheckingOut,
}) => (
  <div className="w-full max-w-[1200px] mx-auto px-8 pt-32 pb-32">
    <HeaderBlock
      billingCycle={billingCycle}
      setBillingCycle={handleEssentialAction}
    />

    <div className="grid grid-cols-2 gap-8 items-stretch relative z-10">
      {/* Essential Card (Desktop) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-[#050505] border border-[#222] rounded-[2rem] p-8 flex flex-col opacity-90 hover:opacity-100 transition-opacity"
      >
        <div className="mb-6 border-b border-[#222] pb-6">
          <div className="flex items-center gap-2 mb-2 group relative">
            <h2 className="text-3xl font-black tracking-tighter text-white">
              Essential Plan
            </h2>
            <Info size={18} className="text-[#666] cursor-help" />
            <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-[#111] border border-[#333] text-[#aaa] text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              Baseline access for early-stage professionals.
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tighter text-white">
              {currentPricing.symbol}0
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3.5">
          {FEATURES.map((f) => (
            <FeatureItem
              key={`ess-pc-${f.id}`}
              icon={f.icon}
              title={f.title}
              isStrikethrough={f.proOnly}
            />
          ))}
        </div>

        <button
          onClick={handleEssentialAction}
          disabled={isPro}
          className={cn(
            "w-full py-3.5 mt-8 rounded-xl font-extrabold text-xs uppercase tracking-widest text-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#BFA264]/50",
            isPro
              ? "border border-[#333] bg-[#111] text-[#666] cursor-not-allowed"
              : "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_20px_rgba(191,162,100,0.3)] hover:opacity-90",
          )}
        >
          {isPro ? "Already on Pro Plan" : "Dashboard"}
        </button>
      </motion.div>

      {/* Pro Card (Desktop) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-gradient-to-b from-[#0a0a0a] to-[#050505] border border-[#BFA264]/40 rounded-[2.5rem] p-8 flex flex-col shadow-[0_0_50px_rgba(191,162,100,0.15)] relative z-20 scale-105"
      >
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#BFA264] to-transparent" />

        <div className="mb-6 border-b border-[#222] pb-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 group relative">
              <h2 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#E8D5A3] to-[#BFA264]">
                Pro Plan
              </h2>
              <Info size={18} className="text-[#666] cursor-help" />
              <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-[#111] border border-[#333] text-[#aaa] text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Advanced features for individuals serious about their
                professional growth.
              </div>
            </div>
            {isPro && (
              <span className="px-2.5 py-1 bg-[#BFA264] text-[#030303] text-[8px] font-black uppercase tracking-widest rounded">
                Active
              </span>
            )}
          </div>

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

        <div className="flex-1 space-y-3.5">
          {FEATURES.map((f) => (
            <FeatureItem
              key={`pro-pc-${f.id}`}
              icon={f.icon}
              title={f.title}
              pro={f.proOnly}
            />
          ))}
        </div>

        <button
          onClick={handleProAction}
          disabled={isCheckingOut}
          className={cn(
            "w-full py-3.5 mt-8 rounded-xl font-extrabold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-2xl focus:outline-none focus:ring-2 focus:ring-[#BFA264]/50",
            isPro
              ? "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_20px_rgba(191,162,100,0.3)] hover:opacity-90"
              : "bg-gradient-to-r from-[#D4AF78] to-[#BFA264] text-[#030303] shadow-[0_0_30px_rgba(191,162,100,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50",
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
    </div>
  </div>
);

/* ─── Main Controller ───────────────────────────────────────────────────── */
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
      monthly: { current: "139", crossed: "200", symbol: "₹" },
      yearly: { current: "1499", crossed: "2400", symbol: "₹" },
    },
    USD: {
      monthly: { current: "3", crossed: "5", symbol: "$" },
      yearly: { current: "45", crossed: "60", symbol: "$" },
    },
  };

  const currentPricing = PRICING[currency][billingCycle];

  // --- CHECKOUT ROUTING ---
  const handleProAction = async () => {
    if (!userData) return navigate("/auth");
    if (userData.tier === "PRO") return navigate("/app");

    setIsCheckingOut(true);
    try {
      const functions = getFunctions(app, "us-central1");
      const createSubscription = httpsCallable(
        functions,
        "createProSubscription",
      );
      const result = await createSubscription({});
      const subscriptionId = result.data.result?.subscriptionId;

      if (!subscriptionId) {
        throw new Error("No subscription ID returned from server.");
      }

      await initiateProUpgrade(userData, subscriptionId);
    } catch (error) {
      console.error("[Premium] Checkout failed:", error);
      const msg =
        error.code === "functions/unauthenticated"
          ? "Session expired. Please sign in again."
          : error.code === "functions/unavailable"
            ? "Payment gateway temporarily unavailable. Try again in 30 seconds."
            : "Failed to connect to payment gateway. Please try again.";
      alert(msg);
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: V.bg }}
      >
        <Zap className="w-6 h-6 text-[#BFA264] animate-pulse" />
      </div>
    );
  }

  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";

  const layoutProps = {
    currentPricing,
    billingCycle,
    isPro,
    handleProAction,
    handleEssentialAction,
    isCheckingOut,
    setBillingCycle: handleEssentialAction, // Used to toggle billing if not bound directly, but we map it locally in HeaderBlock
  };

  return (
    <div
      className="min-h-screen text-[#F5F0E8] font-body relative overflow-x-hidden selection:bg-[#BFA264] selection:text-[#030303]"
      style={{ background: V.bg }}
    >
      <Helmet>
        <title>Premium Access | Discotive</title>
        <meta
          name="description"
          content="Unlock advanced competitive intelligence, priority verification, and exclusive career opportunities. Upgrade to Discotive Pro."
        />
        <meta property="og:title" content="Premium Access | Discotive" />
        <meta
          property="og:description"
          content="Upgrade to Discotive Pro to unlock advanced analytics and priority features."
        />
      </Helmet>

      {/* Cinematic Environmental Details */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0 mix-blend-overlay" />
      <div
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] blur-[140px] rounded-full mix-blend-screen pointer-events-none z-0"
        style={{ background: "rgba(191,162,100,0.06)" }}
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] blur-[140px] rounded-full mix-blend-screen pointer-events-none z-0"
        style={{ background: "rgba(212,175,120,0.06)" }}
      />

      {/* Responsive Rendering */}
      <div className="lg:hidden relative z-10">
        {/* Pass state-setter manually to handle billing cycle toggle dynamically */}
        <MobilePremium {...layoutProps} setBillingCycle={setBillingCycle} />
      </div>
      <div className="hidden lg:block relative z-10">
        <DesktopPremium {...layoutProps} setBillingCycle={setBillingCycle} />
      </div>
    </div>
  );
};

export default Premium;
