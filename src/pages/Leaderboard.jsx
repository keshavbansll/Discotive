import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import {
  Filter,
  ChevronDown,
  X,
  Target,
  Activity,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// --- THE RESTRICTED NIGHT SKY ---
const StaticStars = () => {
  const [stars, setStars] = useState([]);
  useEffect(() => {
    setStars(
      Array.from({ length: 60 }, () => ({
        id: Math.random(),
        top: `${Math.random() * 40}%`,
        left: `${Math.random() * 100}%`,
        opacity: Math.random() * 0.3 + 0.1,
        size: Math.random() * 1.5 + 0.5,
      })),
    );
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 mask-image:linear-gradient(to_bottom,black,transparent)">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            top: star.top,
            left: star.left,
            opacity: star.opacity,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// CHARACTER ASSET MATRIX
// ============================================================================
// Change these filenames as you download the rest of your gifs.
const CHARACTERS = {
  rank1: {
    Male: "/Characters/Boy-1.gif",
    Female: "/Characters/Girl-1.gif",
    Other: "/Characters/Others-1.gif",
  },
  rank2: {
    Male: "/Characters/Boy-2.gif",
    Female: "/Characters/Girl-2.gif",
    Other: "/Characters/Others-1.gif",
  },
  rank3: {
    Male: "/Characters/Boy-3.gif",
    Female: "/Characters/Girl-3.gif",
    Other: "/Characters/Others-1.gif",
  },
  observer: {
    Male: "/Characters/Observer.gif",
    Female: "/Characters/Observer.gif",
    Other: "/Characters/Observer.gif",
  },
};
const getAvatar = (rankKey, gender) =>
  CHARACTERS[rankKey][gender] || CHARACTERS[rankKey]["Other"];

// ============================================================================
// THE COMPARE MODAL (AI TERMINAL)
// ============================================================================
const CompareTerminal = ({
  isOpen,
  onClose,
  targetUser,
  currentUser,
  isPro,
  queriesUsed,
  maxQueries,
  onQueryUsed,
}) => {
  const [stage, setStage] = useState("idle"); // "idle" | "typing" | "streaming" | "done"
  const [displayedText, setDisplayedText] = useState("");
  const navigate = useNavigate();

  const mockResponse = `ANALYSIS COMPLETE. \n\nOperator @${currentUser?._username} vs Operator @${targetUser?._username}\n\n1. TRAJECTORY: You are trailing by ${targetUser?._score - currentUser?._score} points. @${targetUser?._username} has a higher completion rate in the 'Backend' sub-branch.\n2. VANTAGE POINT: You have a stronger consistency streak (14 days vs 6 days).\n3. TACTICAL ADVICE: Focus on closing 3 outstanding core milestones this week to overtake their position.`;

  useEffect(() => {
    if (isOpen && targetUser) {
      if (queriesUsed >= maxQueries) {
        setStage("done");
        return;
      }

      setStage("typing");
      setDisplayedText("");

      const thinkTimer = setTimeout(() => {
        setStage("streaming");
        let i = 0;
        const streamInterval = setInterval(() => {
          setDisplayedText(mockResponse.substring(0, i));
          i++;
          if (i > mockResponse.length) {
            clearInterval(streamInterval);
            setStage("done");
            onQueryUsed(); // Deduct query
          }
        }, 15);
        return () => clearInterval(streamInterval);
      }, 2000);

      return () => clearTimeout(thinkTimer);
    }
  }, [isOpen, targetUser, currentUser]);

  if (!isOpen) return null;

  const queriesRemaining = Math.max(0, maxQueries - queriesUsed);

  return (
    <div className="fixed inset-0 z-[500] flex justify-center items-end sm:items-center p-0 sm:p-6 pl-0 md:pl-64">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-4xl h-[85vh] sm:h-[80vh] bg-[#050505] border border-[#222] sm:rounded-[2rem] rounded-t-[2rem] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-[#222] bg-[#0a0a0a] shrink-0">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-extrabold tracking-widest uppercase text-white">
              Discotive AI Engine
            </h2>
            <span
              className={cn(
                "px-2 py-0.5 text-[9px] font-bold rounded uppercase ml-2",
                queriesRemaining === 0
                  ? "bg-red-500/20 text-red-500"
                  : "bg-white text-black",
              )}
            >
              {queriesRemaining} / {maxQueries} Daily Queries
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#111] rounded-full text-[#666] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed text-[#ccc]">
          {queriesUsed >= maxQueries &&
          stage === "done" &&
          displayedText === "" ? (
            <div className="text-red-500 font-bold mb-4">
              Error: Daily comparison limit exceeded.
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center gap-3 text-white">
                <span className="text-amber-500">{">"}</span>
                <span>Compare my profile with @{targetUser?._username}</span>
              </div>

              {stage === "typing" && (
                <div className="flex items-center gap-2 text-[#666]">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Analyzing Discotive Chains...</span>
                </div>
              )}

              {(stage === "streaming" || stage === "done") && (
                <div className="whitespace-pre-wrap">
                  {displayedText}
                  {stage === "streaming" && (
                    <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {!isPro && queriesRemaining === 0 && (
          <div className="p-6 bg-[#111] border-t border-[#222] text-center shrink-0">
            <p className="text-xs text-[#888] mb-3">
              Daily comparison limit reached. Unlock 10 queries/day with Pro.
            </p>
            <button
              onClick={() => navigate("/premium")}
              className="px-8 py-3 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-[#ccc]"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ============================================================================
// MAIN LEADERBOARD COMPONENT
// ============================================================================
const Leaderboard = () => {
  const { userData, loading: userLoading } = useUserData();
  const navigate = useNavigate();

  const [dbUsers, setDbUsers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);

  // Compare Tracking State
  const [compareTarget, setCompareTarget] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [queriesUsed, setQueriesUsed] = useState(0);

  const [filters, setFilters] = useState({
    scope: "Global Standings",
    domain: "All Domains",
    chronos: "All-Time Ledger",
  });

  // Load Compare Usage from Local Cache
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const usage = JSON.parse(
      localStorage.getItem("discotive_compare_usage") || "{}",
    );
    if (usage.date === todayStr) {
      setQueriesUsed(usage.count);
    } else {
      setQueriesUsed(0);
      localStorage.setItem(
        "discotive_compare_usage",
        JSON.stringify({ date: todayStr, count: 0 }),
      );
    }
  }, []);

  const handleQueryUsed = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newCount = queriesUsed + 1;
    setQueriesUsed(newCount);
    localStorage.setItem(
      "discotive_compare_usage",
      JSON.stringify({ date: todayStr, count: newCount }),
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = auth.currentUser?.uid || userData?.id;
        if (uid) {
          const subRef = doc(db, "users", uid, "subscription", "current");
          const subSnap = await getDoc(subRef);
          if (subSnap.exists())
            setSubscriptionTier(subSnap.data().tier || "free");
        }

        const querySnapshot = await getDocs(collection(db, "users"));
        const rawUsers = [];
        querySnapshot.forEach((doc) => {
          rawUsers.push({ id: doc.id, ...doc.data() });
        });

        const sorted = rawUsers
          .sort((a, b) => (b.discotiveScore || 0) - (a.discotiveScore || 0))
          .map((u, index) => {
            const fName = u.identity?.firstName || "Unknown";
            const lName = u.identity?.lastName || "";
            // Mock Velocity Data for UI demonstration
            const mockVelocity = Math.floor(Math.random() * 15) - 5;

            return {
              ...u,
              _globalRank: index + 1,
              _firstName: fName,
              _lastName: lName,
              _email: u.identity?.email || "",
              _username: u.identity?.username || "user",
              _gender: u.identity?.gender || "Other", // Sourced from Auth Onboarding
              _domain: u.vision?.passion || "Uncategorized",
              _niche: u.vision?.niche || "Unspecified",
              _location: u.footprint?.location || null,
              _score: u.discotiveScore || 0,
              _velocity: mockVelocity,
            };
          });

        setDbUsers(sorted);
      } catch (error) {
        console.error("Sync Failed:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, [userData?.id]);

  const filteredLedger = useMemo(() => {
    return dbUsers.filter((u) => {
      if (filters.domain !== "All Domains" && u._domain !== filters.domain)
        return false;
      return true;
    });
  }, [dbUsers, filters]);

  const paginatedLedger = filteredLedger.slice(
    (page - 1) * limit,
    page * limit,
  );
  const currentUserObj = dbUsers.find(
    (u) => u._email === userData?.identity?.email,
  );
  const currentUserGlobalRank = currentUserObj
    ? currentUserObj._globalRank
    : -1;

  // Linear Podium Logic
  const top3 = [filteredLedger[0], filteredLedger[1], filteredLedger[2]];
  const isMeInTop3 = currentUserGlobalRank > 0 && currentUserGlobalRank <= 3;
  const maxQueries = subscriptionTier === "free" ? 1 : 10;

  if (isFetching || userLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#666] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-20 relative overflow-hidden">
      <StaticStars />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white opacity-[0.01] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-16">
        {/* HEADER */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center gap-3 text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4"
          >
            <ShieldCheck className="w-4 h-4 text-[#888]" /> Protocol Access
            Verified
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white leading-none"
          >
            The Discotive Arena.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#888] font-medium text-lg md:text-xl tracking-tight max-w-2xl mx-auto"
          >
            Cryptographic Proof of Work on the Discotive Chain.
          </motion.p>
        </div>

        {/* --- THE OSCAR PODIUM (LINEAR + HIGH DIFFERENTIAL) --- */}
        <div className="flex justify-center items-end gap-2 md:gap-4 h-[450px] md:h-[500px] pt-10 overflow-x-auto custom-scrollbar px-4">
          {/* Rank 1 (Tallest) */}
          {top3[0] && (
            <div className="flex flex-col items-center justify-end w-[110px] md:w-56 h-full shrink-0">
              <div className="w-32 h-32 md:w-44 md:h-44 mb-[-20px] z-10 flex items-end justify-center drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]">
                <img
                  src={getAvatar("rank1", top3[0]._gender)}
                  alt="Rank 1"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full bg-gradient-to-t from-[#221705] to-[#1a1205] border border-amber-900/50 rounded-t-xl h-64 md:h-80 flex flex-col items-center pt-8 shadow-[0_-20px_50px_rgba(245,158,11,0.15)] relative z-0">
                <h3 className="font-extrabold text-white text-sm md:text-lg truncate w-full text-center px-2">
                  {top3[0]._firstName}
                </h3>
                <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-amber-500 truncate w-full text-center px-2 mt-1">
                  {top3[0]._niche}
                </p>
                <div className="mt-auto pb-4 font-black text-5xl text-amber-500/20">
                  01
                </div>
              </div>
            </div>
          )}
          {/* Rank 2 (Medium) */}
          {top3[1] && (
            <div className="flex flex-col items-center justify-end w-[110px] md:w-48 h-full shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 mb-[-15px] z-10 flex items-end justify-center drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                <img
                  src={getAvatar("rank2", top3[1]._gender)}
                  alt="Rank 2"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full bg-gradient-to-t from-[#1a1205] to-[#140e05] border border-amber-900/30 rounded-t-xl h-44 md:h-56 flex flex-col items-center pt-6 relative z-0">
                <h3 className="font-extrabold text-white text-sm md:text-base truncate w-full text-center px-2">
                  {top3[1]._firstName}
                </h3>
                <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500/70 truncate w-full text-center px-2 mt-1">
                  {top3[1]._niche}
                </p>
                <div className="mt-auto pb-4 font-black text-4xl text-amber-500/10">
                  02
                </div>
              </div>
            </div>
          )}
          {/* Rank 3 (Shortest Golden) */}
          {top3[2] && (
            <div className="flex flex-col items-center justify-end w-[110px] md:w-44 h-full shrink-0">
              <div className="w-20 h-20 md:w-28 md:h-28 mb-[-10px] z-10 flex items-end justify-center drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <img
                  src={getAvatar("rank3", top3[2]._gender)}
                  alt="Rank 3"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full bg-gradient-to-t from-[#140e05] to-[#0a0702] border border-amber-900/20 rounded-t-xl h-28 md:h-36 flex flex-col items-center pt-5 relative z-0">
                <h3 className="font-extrabold text-[#ccc] text-sm truncate w-full text-center px-2">
                  {top3[2]._firstName}
                </h3>
                <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500/50 truncate w-full text-center px-2 mt-1">
                  {top3[2]._niche}
                </p>
                <div className="mt-auto pb-4 font-black text-3xl text-amber-500/5">
                  03
                </div>
              </div>
            </div>
          )}
          {/* Rank 4: THE OBSERVER (Current User if not in Top 3) */}
          {!isMeInTop3 && currentUserObj && (
            <div className="flex flex-col items-center justify-end w-[110px] md:w-40 h-full shrink-0 opacity-80 pl-4 md:pl-8 border-l border-[#222]">
              <div className="w-16 h-16 md:w-24 md:h-24 mb-[-5px] z-10 flex items-end justify-center drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                <img
                  src={getAvatar("observer", currentUserObj._gender)}
                  alt="You"
                  className="w-full h-full object-contain grayscale brightness-75 opacity-70"
                />
              </div>
              <div className="w-full bg-gradient-to-t from-[#111] to-[#050505] border border-[#222] rounded-t-xl h-16 md:h-20 flex flex-col items-center pt-3 relative z-0">
                <h3 className="font-bold text-[#888] text-xs truncate w-full text-center px-2">
                  You
                </h3>
                <div className="mt-auto pb-2 font-mono text-[10px] text-[#555]">
                  #{currentUserGlobalRank}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- CASCADING QUERY ENGINE & PRO LOCKS --- */}
        <motion.div className="bg-[#0a0a0a] border border-[#222] p-6 md:p-8 rounded-[2rem] shadow-2xl relative z-30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-[#222] pb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <Filter className="w-4 h-4" /> Ledger Engine
              </h3>
              <div className="px-3 py-1 bg-[#111] rounded border border-[#333] text-[10px] font-mono text-[#888]">
                {filteredLedger.length} Operators
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
            {/* DOMAIN (Free) */}
            <div className="relative w-full sm:w-56">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                Macro Domain
              </p>
              <button
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "domain" ? null : "domain",
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white hover:border-[#444] transition-colors"
              >
                <span className="truncate">{filters.domain}</span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "domain" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl overflow-hidden"
                  >
                    {[
                      "All Domains",
                      "Engineer",
                      "Designer",
                      "Filmmaker",
                      "Founder / CEO",
                    ].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setFilters({ ...filters, domain: d });
                          setActiveDropdown(null);
                          setPage(1);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] truncate"
                      >
                        {d}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CHRONOS (Pro Lock) */}
            <div className="relative w-full sm:w-56">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2">
                Chronos <Lock className="w-3 h-3 text-[#444]" />
              </p>
              <button
                onClick={() =>
                  subscriptionTier === "free"
                    ? navigate("/premium")
                    : setActiveDropdown("chronos")
                }
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 border rounded-xl text-sm font-bold transition-colors",
                  subscriptionTier === "free"
                    ? "bg-[#111] border-[#222] text-[#666] cursor-pointer"
                    : "bg-[#050505] border-[#222] text-white hover:border-[#444]",
                )}
              >
                {filters.chronos}{" "}
                {subscriptionTier === "free" ? (
                  <Lock className="w-4 h-4 text-[#444]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                )}
              </button>
            </div>

            {/* MICRO NICHE (Pro Lock) */}
            <div className="relative w-full sm:w-56">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-2">
                Micro Niche <Lock className="w-3 h-3 text-[#444]" />
              </p>
              <button
                onClick={() => navigate("/premium")}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#111] border border-[#222] rounded-xl text-sm font-bold text-[#666]"
              >
                All Niches <Lock className="w-4 h-4 text-[#444]" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* --- THE LEADERBOARD TABLE --- */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] shadow-2xl relative z-10 w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[1000px]">
            <div className="sticky top-0 z-20 grid grid-cols-12 gap-4 px-8 py-4 border-b border-[#222] bg-[#050505]/80 backdrop-blur-xl text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Identity</div>
              <div className="col-span-3">Domain & Velocity</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            <div className="divide-y divide-[#111]">
              {paginatedLedger.length === 0 ? (
                <div className="py-20 text-center text-[#555] font-mono text-sm uppercase tracking-widest">
                  [ NULL RESULT ]
                </div>
              ) : (
                paginatedLedger.map((user, idx) => {
                  const rank = (page - 1) * limit + idx + 1;
                  const isGhostTarget =
                    user._globalRank === currentUserGlobalRank - 1;
                  const isMe = user._email === userData?.identity?.email;
                  const isTopGainer = user._velocity > 10;

                  return (
                    <div
                      key={user.id}
                      className={cn(
                        "grid grid-cols-12 gap-4 px-8 py-5 items-center bg-[#0a0a0a] transition-all duration-300 group relative border-l-2 border-transparent",
                        "hover:bg-[#111] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:z-10 hover:border-white",
                        isMe && "bg-[#111] border-white",
                        isGhostTarget &&
                          "border-red-500/50 bg-red-950/10 hover:border-red-500",
                        isTopGainer &&
                          !isMe &&
                          !isGhostTarget &&
                          "border-green-500/30 hover:border-green-500",
                      )}
                    >
                      {/* Rank & Momentum */}
                      <div className="col-span-1 font-mono font-bold flex flex-col items-start justify-center">
                        <div className="flex items-center gap-2">
                          <span className="text-[#666] text-sm group-hover:text-white transition-colors">
                            {String(rank).padStart(2, "0")}
                          </span>
                          {isGhostTarget && (
                            <Target
                              className="w-3.5 h-3.5 text-red-500 animate-pulse"
                              title="Direct Target"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {user._velocity > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : user._velocity < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          ) : (
                            <Minus className="w-3 h-3 text-[#444]" />
                          )}
                          <span
                            className={cn(
                              "text-[9px] font-bold",
                              user._velocity > 0
                                ? "text-green-500"
                                : user._velocity < 0
                                  ? "text-red-500"
                                  : "text-[#444]",
                            )}
                          >
                            {Math.abs(user._velocity)}
                          </span>
                        </div>
                      </div>

                      {/* Identity */}
                      <div className="col-span-4 flex items-center gap-4">
                        <Link
                          to={`/user/${user._username}`}
                          className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-xs font-bold text-[#888] group-hover:border-white group-hover:text-white transition-colors shrink-0"
                        >
                          {user._firstName.charAt(0)}
                          {user._lastName ? user._lastName.charAt(0) : ""}
                        </Link>
                        <div className="truncate">
                          <Link
                            to={`/user/${user._username}`}
                            className="font-extrabold text-sm text-white truncate flex items-center gap-2 hover:underline"
                          >
                            {user._firstName} {user._lastName}
                            {isMe && (
                              <span className="text-[8px] bg-white text-black px-1.5 rounded uppercase tracking-wider font-bold">
                                You
                              </span>
                            )}
                          </Link>
                          <p className="text-[10px] font-mono text-[#555] group-hover:text-[#888] tracking-wider truncate">
                            @{user._username}
                          </p>
                        </div>
                      </div>

                      {/* Domain & Niche */}
                      <div className="col-span-3 truncate pr-4">
                        <p className="text-sm font-bold text-[#ccc] group-hover:text-white truncate">
                          {user._domain}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] group-hover:text-[#888] truncate">
                          {user._niche}
                        </p>
                      </div>

                      {/* Location */}
                      <div className="col-span-2 flex items-center gap-2 text-sm font-medium">
                        {user._location ? (
                          <>
                            <MapPin className="w-3 h-3 text-[#555]" />
                            <span className="text-[#888] truncate group-hover:text-white transition-colors text-xs">
                              {user._location}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono text-[10px] text-[#444] tracking-[0.2em]">
                            [ UNMAPPED ]
                          </span>
                        )}
                      </div>

                      {/* Actions (Score + Deep Recon / Compare) */}
                      <div className="col-span-2 flex items-center justify-end gap-4">
                        {!isMe && (
                          <button
                            onClick={() => {
                              setCompareTarget(user);
                              setIsCompareOpen(true);
                            }}
                            className="px-3 py-1.5 bg-[#111] border border-[#333] hover:border-amber-500 rounded-full text-[10px] font-bold text-[#888] hover:text-amber-500 transition-colors uppercase tracking-widest flex items-center gap-1.5 group/btn"
                          >
                            VS{" "}
                            <Sparkles className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </button>
                        )}
                        <div className="flex flex-col items-end justify-center w-16">
                          <span className="font-extrabold text-white text-lg tracking-tighter">
                            - -
                          </span>
                          <span className="font-mono text-[8px] text-[#444] tracking-widest">
                            [ PENDING ]
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* TABLE PAGINATION */}
          <div className="bg-[#050505] border-t border-[#222] px-8 py-4 flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#666] tracking-widest">
              PAGE {page}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARE TERMINAL MODAL */}
      <AnimatePresence>
        {isCompareOpen && (
          <CompareTerminal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            targetUser={compareTarget}
            currentUser={currentUserObj}
            isPro={subscriptionTier === "pro"}
            queriesUsed={queriesUsed}
            maxQueries={maxQueries}
            onQueryUsed={handleQueryUsed}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;
