import { useState, useEffect, useMemo, useRef } from "react";
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
// THE COMPARE MODAL (WHATSAPP-STYLE AI TERMINAL)
// ============================================================================
const CompareTerminal = ({ isOpen, onClose, targetUser, currentUser }) => {
  if (!isOpen) return null;

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
        className="relative w-full max-w-2xl h-[85vh] sm:h-[75vh] bg-[#0a0a0a] border border-[#222] sm:rounded-[2rem] rounded-t-[2rem] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-[#222] bg-[#111] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white">
                Discotive AI
              </h2>
              <p className="text-[10px] text-amber-500 font-medium">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-[#222] rounded-full text-[#888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#050505] flex flex-col gap-6">
          {/* User Message Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className="self-end max-w-[80%] bg-[#222] border border-[#333] text-white px-5 py-3 rounded-2xl rounded-tr-sm shadow-md"
          >
            <p className="text-sm font-medium leading-relaxed">
              Compare my profile with{" "}
              <span className="font-bold text-amber-500">
                @{targetUser?._username}
              </span>
            </p>
            <div className="text-[9px] text-[#888] text-right mt-1 font-mono">
              Just now
            </div>
          </motion.div>

          {/* AI Typing Indicator Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="self-start max-w-[80%] bg-[#111] border border-[#222] px-5 py-4 rounded-2xl rounded-tl-sm shadow-md flex items-center gap-1.5"
          >
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-2 h-2 bg-[#555] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </motion.div>
        </div>

        {/* Fake Input Area */}
        <div className="p-4 bg-[#111] border-t border-[#222] shrink-0">
          <div className="w-full bg-[#050505] border border-[#333] rounded-full px-5 py-3 text-sm text-[#444] font-medium flex justify-between items-center">
            <span>Awaiting engine response...</span>
            <Activity className="w-4 h-4 text-[#444] animate-pulse" />
          </div>
        </div>
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

  // Click-Outside Ref for Dropdowns
  const filterBarRef = useRef(null);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination & Filters State
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    domain: "All",
    niche: "All",
    location: "All",
    timeframe: "All-Time",
    limit: 15,
  });

  // Compare Tracking State
  const [compareTarget, setCompareTarget] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        filterBarRef.current &&
        !filterBarRef.current.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
            const mockVelocity = Math.floor(Math.random() * 15) - 5;

            return {
              ...u,
              _globalRank: index + 1,
              _firstName: fName,
              _lastName: lName,
              _email: u.identity?.email || "",
              _username: u.identity?.username || "user",
              _gender: u.identity?.gender || "Other",
              _domain: u.vision?.passion || "Uncategorized",
              _niche: u.vision?.niche || "Unspecified",
              _location: u.footprint?.location || "Unknown",
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
  }, []);

  // --- DYNAMIC DATABASE OPTIONS ---
  const uniqueDomains = useMemo(
    () => ["All", ...new Set(dbUsers.map((u) => u._domain))],
    [dbUsers],
  );
  const uniqueNiches = useMemo(
    () => ["All", ...new Set(dbUsers.map((u) => u._niche))],
    [dbUsers],
  );
  const uniqueLocations = useMemo(
    () => ["All", ...new Set(dbUsers.map((u) => u._location))],
    [dbUsers],
  );

  // --- FILTERING LOGIC ---
  const filteredLedger = useMemo(() => {
    return dbUsers.filter((u) => {
      if (filters.domain !== "All" && u._domain !== filters.domain)
        return false;
      if (filters.niche !== "All" && u._niche !== filters.niche) return false;
      if (filters.location !== "All" && u._location !== filters.location)
        return false;
      return true;
    });
  }, [dbUsers, filters]);

  const paginatedLedger = filteredLedger.slice(
    (page - 1) * filters.limit,
    page * filters.limit,
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

        {/* --- THE OSCAR PODIUM --- */}
        <div className="flex justify-center items-end gap-2 md:gap-4 h-[450px] md:h-[500px] pt-10 overflow-x-auto custom-scrollbar px-4">
          {/* Rank 1 */}
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
          {/* Rank 2 */}
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
          {/* Rank 3 */}
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
          {/* Rank 4: THE OBSERVER */}
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

        {/* --- DYNAMIC QUERY ENGINE --- */}
        <motion.div
          ref={filterBarRef}
          className="bg-[#0a0a0a] border border-[#222] p-6 md:p-8 rounded-[2rem] shadow-2xl relative z-30"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-[#222] pb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <Filter className="w-4 h-4" /> Ledger Engine
              </h3>
              <div className="px-3 py-1 bg-[#111] rounded border border-[#333] text-[10px] font-mono text-[#888]">
                {filteredLedger.length} Operators found
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* DOMAIN FILTER */}
            <div className="relative flex-1 min-w-[200px]">
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
                <span className="truncate">
                  {filters.domain === "All" ? "Global" : filters.domain}
                </span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "domain" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {uniqueDomains.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setFilters({ ...filters, domain: d });
                          setActiveDropdown(null);
                          setPage(1);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] truncate border-b border-[#111]"
                      >
                        {d === "All" ? "Global (All Domains)" : d}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* NICHE FILTER */}
            <div className="relative flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                Micro Niche
              </p>
              <button
                onClick={() =>
                  setActiveDropdown(activeDropdown === "niche" ? null : "niche")
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white hover:border-[#444] transition-colors"
              >
                <span className="truncate">
                  {filters.niche === "All" ? "Any Niche" : filters.niche}
                </span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "niche" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {uniqueNiches.map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setFilters({ ...filters, niche: n });
                          setActiveDropdown(null);
                          setPage(1);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] truncate border-b border-[#111]"
                      >
                        {n === "All" ? "Any Niche" : n}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* LOCATION FILTER */}
            <div className="relative flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                State / Country
              </p>
              <button
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "location" ? null : "location",
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white hover:border-[#444] transition-colors"
              >
                <span className="truncate">
                  {filters.location === "All" ? "Worldwide" : filters.location}
                </span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "location" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {uniqueLocations.map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setFilters({ ...filters, location: l });
                          setActiveDropdown(null);
                          setPage(1);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] truncate border-b border-[#111]"
                      >
                        {l === "All" ? "Worldwide" : l}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* TIMEFRAME FILTER */}
            <div className="relative w-32">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                Timeframe
              </p>
              <button
                onClick={() =>
                  setActiveDropdown(
                    activeDropdown === "timeframe" ? null : "timeframe",
                  )
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white hover:border-[#444] transition-colors"
              >
                <span className="truncate">{filters.timeframe}</span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "timeframe" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {["All-Time", "This Year", "This Month", "Today"].map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setFilters({ ...filters, timeframe: t });
                            setActiveDropdown(null);
                            setPage(1);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] truncate border-b border-[#111]"
                        >
                          {t}
                        </button>
                      ),
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ROWS PER PAGE FILTER */}
            <div className="relative w-24">
              <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                Display
              </p>
              <button
                onClick={() =>
                  setActiveDropdown(activeDropdown === "limit" ? null : "limit")
                }
                className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white hover:border-[#444] transition-colors"
              >
                <span className="truncate">{filters.limit}</span>{" "}
                <ChevronDown className="w-4 h-4 text-[#666]" />
              </button>
              <AnimatePresence>
                {activeDropdown === "limit" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {[5, 10, 15, 20].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setFilters({ ...filters, limit: l });
                          setActiveDropdown(null);
                          setPage(1);
                        }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111] border-b border-[#111]"
                      >
                        {l}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
                  const rank = (page - 1) * filters.limit + idx + 1;
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
                        {user._location && user._location !== "Unknown" ? (
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

                      {/* Actions */}
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

      {/* WHATSAPP STYLE AI TERMINAL */}
      <AnimatePresence>
        {isCompareOpen && (
          <CompareTerminal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            targetUser={compareTarget}
            currentUser={currentUserObj}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Leaderboard;
