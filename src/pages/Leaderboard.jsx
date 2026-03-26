/**
 * @fileoverview Discotive OS - Global Leaderboard Matrix (Gamified & Monolithic)
 * @module Execution/Leaderboard
 * @description
 * High-performance telemetry matrix with Next-Target psychology and dynamic sidebars.
 * Features strict Firebase cursors and container-aware sticky positioning.
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  where,
  endBefore,
  limitToLast,
} from "firebase/firestore";
import { db } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import { TIERS } from "../lib/TierEngine";
import CompareModal from "../components/CompareModal";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from "recharts";

import {
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Crown,
  X,
  Zap,
  Activity,
  ChevronDown,
  ChevronRight,
  MapPin,
  Target,
  Database,
  GraduationCap,
  SlidersHorizontal,
  User,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Minus,
  Crosshair,
  Network,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// 1. TAXONOMY & GAMIFICATION CONFIG
// ============================================================================

const TAXONOMY = {
  DOMAINS: [
    "Engineering & Tech",
    "Design & Creative",
    "Business & Strategy",
    "Marketing & Growth",
    "Product Management",
    "Data & Analytics",
    "Sales & Revenue",
  ],
  NICHES: {
    "Engineering & Tech": [
      "Frontend",
      "Backend",
      "Fullstack",
      "DevOps",
      "AI/ML",
      "Cybersecurity",
      "Mobile iOS",
      "Mobile Android",
      "Web3/Blockchain",
    ],
    "Design & Creative": [
      "UI/UX",
      "Product Design",
      "Graphic Design",
      "Motion Graphics",
      "3D Modeling",
      "Brand Identity",
    ],
    "Business & Strategy": [
      "Operations",
      "Finance",
      "Venture Capital",
      "Consulting",
      "Supply Chain",
    ],
    "Marketing & Growth": [
      "SEO/SEM",
      "Content Marketing",
      "Performance Marketing",
      "Social Media",
      "Email Marketing",
    ],
    "Product Management": [
      "Technical PM",
      "Growth PM",
      "Data PM",
      "Scrum Master",
    ],
    "Data & Analytics": [
      "Data Science",
      "Data Engineering",
      "Business Intelligence",
      "Quantitative Analysis",
    ],
    "Sales & Revenue": [
      "B2B Enterprise",
      "SaaS Sales",
      "Account Management",
      "Customer Success",
    ],
  },
  LEVELS: [
    "L1 - Initiate (0-1 YOE)",
    "L2 - Operator (1-3 YOE)",
    "L3 - Specialist (3-5 YOE)",
    "L4 - Architect (5-8 YOE)",
    "L5 - Principal (8+ YOE)",
  ],
  COUNTRIES: [
    "India",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "Germany",
    "Singapore",
    "United Arab Emirates",
    "Remote/Global",
  ],
  STATES_INDIA: [
    "Rajasthan",
    "Maharashtra",
    "Karnataka",
    "Delhi",
    "Telangana",
    "Tamil Nadu",
    "Gujarat",
    "Haryana",
    "Uttar Pradesh",
    "Kerala",
    "West Bengal",
  ],
};

// CHARACTER ASSET MATRIX
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
    Female: "/Characters/Boy-1.gif",
    Other: "/Characters/Boy-1.gif",
  },
  observer: {
    Male: "/Characters/Observer.gif",
    Female: "/Characters/Observer.gif",
    Other: "/Characters/Observer.gif",
  },
};

const getAvatar = (rankKey, gender) =>
  CHARACTERS[rankKey][gender] || CHARACTERS[rankKey]["Other"];

// Gamified styling based on user level
const getLevelAura = (levelString) => {
  if (!levelString) return "bg-white/5 border-white/10 text-white/50";
  if (levelString.includes("L5"))
    return "bg-red-500/10 border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]";
  if (levelString.includes("L4"))
    return "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
  if (levelString.includes("L3"))
    return "bg-indigo-500/10 border-indigo-500/40 text-indigo-400";
  if (levelString.includes("L2"))
    return "bg-blue-500/10 border-blue-500/30 text-blue-400";
  return "bg-slate-500/10 border-slate-500/30 text-slate-400";
};

// ============================================================================
// 2. HELPER COMPONENTS
// ============================================================================

const CustomSelect = ({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative flex flex-col gap-1.5" ref={ref}>
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#666] ml-1 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#111] border rounded-xl px-4 py-3 flex items-center justify-between transition-colors text-xs font-bold",
          disabled
            ? "opacity-50 cursor-not-allowed border-[#222] text-[#555]"
            : "cursor-pointer hover:border-[#444] text-white",
          isOpen ? "border-amber-500" : "border-[#333]",
        )}
      >
        <span className="truncate">{value || "Any"}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#666] transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-2 bg-[#111] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
          >
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="px-4 py-3 text-xs font-bold text-[#888] hover:bg-[#222] hover:text-white cursor-pointer transition-colors border-b border-[#222]"
            >
              Any
            </div>
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  "px-4 py-3 text-xs font-bold cursor-pointer transition-colors border-b border-[#222]",
                  value === opt
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-[#ccc] hover:bg-[#222] hover:text-white",
                )}
              >
                {opt}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// 3. MAIN LEADERBOARD ARCHITECTURE
// ============================================================================

const Leaderboard = () => {
  const navigate = useNavigate();
  const { userData, loading: userLoading } = useUserData();

  // --- STATE MATRIX ---
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);

  const [firstVisibleDoc, setFirstVisibleDoc] = useState(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreNext, setHasMoreNext] = useState(false);
  const [hasMorePrev, setHasMorePrev] = useState(false);
  const [totalFilteredUsers, setTotalFilteredUsers] = useState(0);

  // --- PSYCHOLOGY ENGINE ---
  const [myExactRank, setMyExactRank] = useState(null);
  const [nextTarget, setNextTarget] = useState(null);

  // --- UI & FILTERS ---
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    domain: "",
    niche: "",
    level: "",
    country: "",
    state: "",
    sortBy: "desc",
    pageSize: 15,
  });

  // --- COMPARE ENGINE ---
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [compareTarget, setCompareTarget] = useState(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // ============================================================================
  // 4. FIREBASE TELEMETRY ENGINE
  // ============================================================================

  const applyFilterConstraints = (constraintsArray) => {
    if (filters.domain)
      constraintsArray.push(where("identity.domain", "==", filters.domain));
    if (filters.niche)
      constraintsArray.push(where("identity.niche", "==", filters.niche));
    if (filters.level)
      constraintsArray.push(where("identity.level", "==", filters.level));
    if (filters.country)
      constraintsArray.push(where("identity.country", "==", filters.country));
    if (filters.state)
      constraintsArray.push(where("identity.state", "==", filters.state));
    return constraintsArray;
  };

  const fetchTelemetryAndTarget = async () => {
    if (!userData?.discotiveScore?.current) return;
    try {
      let baseConstraints = [];
      baseConstraints = applyFilterConstraints(baseConstraints);

      const rankQuery = query(
        collection(db, "users"),
        ...baseConstraints,
        where("discotiveScore.current", ">", userData.discotiveScore.current),
      );
      const rankSnap = await getCountFromServer(rankQuery);
      setMyExactRank(rankSnap.data().count + 1);

      const targetQuery = query(
        collection(db, "users"),
        ...baseConstraints,
        where("discotiveScore.current", ">", userData.discotiveScore.current),
        orderBy("discotiveScore.current", "asc"),
        limit(1),
      );
      const targetSnap = await getDocs(targetQuery);
      if (!targetSnap.empty) {
        setNextTarget({
          id: targetSnap.docs[0].id,
          ...targetSnap.docs[0].data(),
        });
      } else {
        setNextTarget(null);
      }
    } catch (err) {
      console.error("Telemetry Engine Failed. Missing Index?", err);
    }
  };

  const executeFetch = async (direction = "initial") => {
    if (direction === "initial") setIsLoading(true);
    else setIsPaginating(true);

    try {
      let q;

      // --- BRANCH A: THE SEARCH ENGINE ---
      if (filters.search) {
        const searchTerm = filters.search; // Case sensitive prefix search
        q = query(
          collection(db, "users"),
          where("identity.username", ">=", searchTerm),
          where("identity.username", "<=", searchTerm + "\uf8ff"),
          limit(20),
        );
      }
      // --- BRANCH B: THE FILTERED MATRIX ---
      else {
        let constraints = [];
        constraints = applyFilterConstraints(constraints);
        constraints.push(orderBy("discotiveScore.current", filters.sortBy));

        if (direction === "next" && lastVisibleDoc) {
          constraints.push(startAfter(lastVisibleDoc), limit(filters.pageSize));
        } else if (direction === "prev" && firstVisibleDoc) {
          constraints.push(
            endBefore(firstVisibleDoc),
            limitToLast(filters.pageSize),
          );
        } else {
          constraints.push(limit(filters.pageSize));
        }
        q = query(collection(db, "users"), ...constraints);
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docs = snapshot.docs;
        setFirstVisibleDoc(docs[0]);
        setLastVisibleDoc(docs[docs.length - 1]);

        let fetchedPlayers = docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // If we used the Search Branch, we must sort them locally by score
        // since Firebase only allows one inequality filter per query.
        if (filters.search) {
          fetchedPlayers.sort(
            (a, b) =>
              (b.discotiveScore?.current || 0) -
              (a.discotiveScore?.current || 0),
          );
        }

        setPlayers(fetchedPlayers);

        // Pagination State
        if (direction === "initial") {
          setCurrentPage(1);
          setHasMorePrev(false);
          setHasMoreNext(
            docs.length === (filters.search ? 20 : filters.pageSize),
          );
        } else if (direction === "next") {
          setCurrentPage((c) => c + 1);
          setHasMorePrev(true);
          setHasMoreNext(docs.length === filters.pageSize);
        } else if (direction === "prev") {
          setCurrentPage((c) => c - 1);
          setHasMoreNext(true);
          setHasMorePrev(currentPage - 1 > 1);
        }
      } else {
        if (direction === "initial") setPlayers([]);
        setHasMoreNext(false);
      }
    } catch (err) {
      // 🔴 CRITICAL CTO LOG: This will print the exact link you need to click to fix the filters.
      console.error(
        "FIREBASE INDEX REQUIRED. Open this link in your browser to fix the filter:",
        err.message,
      );
      alert(
        "Database index building required for this filter. Please check browser console.",
      );
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  };

  useEffect(() => {
    if (!userLoading) {
      executeFetch("initial");
      fetchTelemetryAndTarget();

      const fetchCount = async () => {
        try {
          let constraints = [];
          constraints = applyFilterConstraints(constraints);
          const countSnap = await getCountFromServer(
            query(collection(db, "users"), ...constraints),
          );
          setTotalFilteredUsers(countSnap.data().count);
        } catch (e) {}
      };
      fetchCount();
    }
  }, [
    filters.domain,
    filters.niche,
    filters.level,
    filters.country,
    filters.state,
    filters.sortBy,
    filters.pageSize,
    userLoading,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!userLoading) executeFetch("initial");
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // ============================================================================
  // 5. EVENT HANDLERS
  // ============================================================================

  const handleUserClick = (user) => {
    setIsFilterOpen(false);
    setSelectedUserProfile(user);
  };

  const triggerCompare = (e, targetUser) => {
    e.stopPropagation();
    if (!userData) return navigate("/auth");
    if (targetUser.id === userData?.uid) return;

    if (userData.tier !== "PRO" && userData.tier !== "ENTERPRISE") {
      setIsUpsellOpen(true);
      return;
    }

    setCompareTarget(targetUser);
    setIsCompareOpen(true);
  };

  const toggleFilters = () => {
    setSelectedUserProfile(null);
    setIsFilterOpen(!isFilterOpen);
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      domain: "",
      niche: "",
      level: "",
      country: "",
      state: "",
      sortBy: "desc",
      pageSize: 15,
    });
  };

  // ============================================================================
  // 6. RENDER PIPELINE
  // ============================================================================

  if (userLoading || (isLoading && players.length === 0 && !filters.search)) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <Activity className="w-8 h-8 text-white/20 animate-spin" />
          <span className="text-[10px] font-medium text-white/50 uppercase tracking-[0.2em]">
            Syncing Matrix...
          </span>
        </div>
      </div>
    );
  }

  const isFirstPage = currentPage === 1;
  const top3 = isFirstPage ? players.slice(0, 3) : [];
  const isMeInTop3 = top3.some(
    (p) =>
      p &&
      (p.id === userData?.uid ||
        p.id === userData?.id ||
        p.identity?.username === userData?.identity?.username),
  );
  const isSidebarActive = isFilterOpen || selectedUserProfile !== null;

  return (
    <div className="flex flex-col h-screen bg-[#000000] text-[#f5f5f7] font-sans overflow-hidden selection:bg-white/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none z-0" />

      {/* ==================== HEADER ==================== */}
      <header className="px-6 py-5 border-b border-white/[0.05] bg-[#000000]/80 backdrop-blur-2xl z-20 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
            <Database className="w-5 h-5 text-white/40" />
            Discotive Arena
          </h1>
          <p className="text-xs text-white/40 mt-1 font-medium tracking-wide">
            Real-time telemetry of top operators.{" "}
            {totalFilteredUsers > 0
              ? `${totalFilteredUsers} records found.`
              : "Indexing..."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white transition-colors" />
            <input
              type="text"
              placeholder="Search by operator..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full bg-white/[0.03] border border-white/[0.05] text-white pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm placeholder:text-white/30"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={toggleFilters}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shrink-0 border",
              isFilterOpen
                ? "bg-white text-black border-white"
                : "bg-white/[0.03] border-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white",
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
        </div>
      </header>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* CENTER MATRIX (Adjusts width when sidebar opens) */}
        <main className="flex-1 overflow-y-auto custom-scrollbar transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10">
          <div className="max-w-[1200px] mx-auto p-4 md:p-8 relative min-h-full pb-48">
            {/* --- GAMIFIED PODIUM --- */}
            {top3.length > 0 && (
              <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-4 pt-4 md:pt-6 mb-12 px-2">
                <div className="flex justify-center items-end gap-2 md:gap-4 h-[180px] md:h-[320px]">
                  {/* Rank 2 */}
                  {top3[1] && (
                    <div className="flex flex-col items-center justify-end w-[85px] md:w-48 h-full shrink-0">
                      <div className="w-16 h-16 md:w-32 md:h-32 mb-[-8px] md:mb-[-15px] z-10 flex items-end justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        <img
                          src={getAvatar("rank2", top3[1].identity?.gender)}
                          alt="Rank 2"
                          className="w-full h-full object-contain select-none pointer-events-none"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                      <div className="w-full bg-gradient-to-t from-[#1a1c23] to-[#12141a] border border-slate-700/30 rounded-t-xl h-24 md:h-44 flex flex-col items-center pt-3 md:pt-6 relative z-0 shadow-lg">
                        <h3 className="font-extrabold text-white text-[10px] md:text-sm truncate w-full text-center px-1 md:px-2">
                          {top3[1].identity?.fullName?.split(" ")[0] ||
                            top3[1].fullName?.split(" ")[0] ||
                            top3[1].identity?.username ||
                            "Operator"}
                        </h3>
                        <p className="text-[8px] text-white/50 truncate w-full text-center px-1 md:px-2 mt-0.5">
                          @
                          {top3[1].identity?.username ||
                            top3[1].username ||
                            "unknown"}
                        </p>
                        <p className="text-[6px] md:text-[8px] font-bold uppercase tracking-widest text-slate-400 truncate w-full text-center px-1 md:px-2 mt-0.5 md:mt-1">
                          {top3[1].identity?.niche ||
                            top3[1].niche ||
                            "General"}
                        </p>
                        <div className="mt-auto pb-2 md:pb-4 font-black text-xl md:text-4xl text-slate-400/20">
                          02
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 (Tallest) */}
                  {top3[0] && (
                    <div className="flex flex-col items-center justify-end w-[90px] md:w-56 h-full shrink-0">
                      <div className="w-20 h-20 md:w-44 md:h-44 mb-[-10px] md:mb-[-20px] z-10 flex items-end justify-center drop-shadow-[0_0_20px_rgba(245,158,11,0.5)] relative">
                        {/* Crown Icon */}
                        <Crown className="absolute -top-6 text-amber-500 w-6 h-6 animate-bounce drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                        <img
                          src={getAvatar("rank1", top3[0].identity?.gender)}
                          alt="Rank 1"
                          className="w-full h-full object-contain select-none pointer-events-none"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                      <div className="w-full bg-gradient-to-t from-[#221705] to-[#1a1205] border border-amber-900/50 rounded-t-xl h-32 md:h-60 flex flex-col items-center pt-4 md:pt-8 shadow-[0_-20px_50px_rgba(245,158,11,0.15)] relative z-0">
                        <h3 className="font-extrabold text-white text-[10px] md:text-base truncate w-full text-center px-1 md:px-2">
                          {top3[0].identity?.fullName?.split(" ")[0] ||
                            top3[0].fullName?.split(" ")[0] ||
                            top3[0].identity?.username ||
                            "Operator"}
                        </h3>
                        <p className="text-[9px] text-white/50 truncate w-full text-center px-1 md:px-2 mt-0.5">
                          @
                          {top3[0].identity?.username ||
                            top3[0].username ||
                            "unknown"}
                        </p>
                        <p className="text-[6px] md:text-[9px] font-bold uppercase tracking-widest text-amber-500 truncate w-full text-center px-1 md:px-2 mt-0.5 md:mt-1">
                          {top3[0].identity?.niche ||
                            top3[0].niche ||
                            "General"}
                        </p>
                        <div className="mt-auto pb-2 md:pb-4 font-black text-2xl md:text-5xl text-amber-500/20">
                          01
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 */}
                  {top3[2] && (
                    <div className="flex flex-col items-center justify-end w-[85px] md:w-44 h-full shrink-0">
                      <div className="w-14 h-14 md:w-28 md:h-28 mb-[-5px] md:mb-[-10px] z-10 flex items-end justify-center drop-shadow-[0_0_10px_rgba(234,88,12,0.3)]">
                        <img
                          src={getAvatar("rank3", top3[2].identity?.gender)}
                          alt="Rank 3"
                          className="w-full h-full object-contain select-none pointer-events-none"
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      </div>
                      <div className="w-full bg-gradient-to-t from-[#1a0f05] to-[#120a02] border border-orange-900/30 rounded-t-xl h-20 md:h-36 flex flex-col items-center pt-2 md:pt-5 relative z-0 shadow-lg">
                        <h3 className="font-extrabold text-[#ccc] text-[9px] md:text-sm truncate w-full text-center px-1 md:px-2">
                          {top3[2].identity?.fullName?.split(" ")[0] ||
                            top3[2].fullName?.split(" ")[0] ||
                            top3[2].identity?.username ||
                            "Operator"}
                        </h3>
                        <p className="text-[8px] text-white/50 truncate w-full text-center px-1 md:px-2 mt-0.5">
                          @
                          {top3[2].identity?.username ||
                            top3[2].username ||
                            "unknown"}
                        </p>
                        <p className="text-[5px] md:text-[8px] font-bold uppercase tracking-widest text-orange-500/60 truncate w-full text-center px-1 md:px-2 mt-0.5 md:mt-1">
                          {top3[2].identity?.niche ||
                            top3[2].niche ||
                            "General"}
                        </p>
                        <div className="mt-auto pb-1.5 md:pb-4 font-black text-lg md:text-3xl text-orange-500/10">
                          03
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rank 4: THE OBSERVER */}
                {!isMeInTop3 && userData && (
                  <div className="flex flex-col items-center justify-end w-[100px] md:w-32 h-[100px] md:h-[320px] shrink-0 opacity-80 md:pl-6 md:border-l border-[#222]">
                    <div className="w-12 h-12 md:w-20 md:h-20 mb-[-5px] z-10 flex items-end justify-center drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                      <img
                        src={getAvatar("observer", userData.identity?.gender)}
                        alt="You"
                        className="w-full h-full object-contain grayscale brightness-75 opacity-70 select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>
                    <div className="w-full bg-gradient-to-t from-[#111] to-[#0a0a0a] border border-[#222] rounded-t-xl h-12 md:h-20 flex flex-col items-center pt-2 md:pt-3 relative z-0">
                      <h3 className="font-bold text-[#888] text-[9px] md:text-xs truncate w-full text-center px-2">
                        You
                      </h3>
                      <div className="mt-auto pb-1 md:pb-2 font-mono text-[8px] md:text-[10px] text-[#555]">
                        #{myExactRank || "?"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- MATRIX LIST --- */}
            <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="bg-[#0a0a0c] border border-white/[0.05] rounded-3xl shadow-2xl relative pb-24 overflow-x-auto custom-scrollbar">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-[50px_1.5fr_1fr_1fr_80px_100px] gap-4 p-5 border-b border-white/[0.05] bg-white/[0.02] text-[10px] font-semibold uppercase tracking-widest text-white/40">
                    <div className="text-center">#</div>
                    <div>Operator</div>
                    <div>Domain / Niche</div>
                    <div>Level</div>
                    <div className="text-center" title="Vault Strength">
                      Vault
                    </div>
                    <div className="text-right">Score</div>
                  </div>

                  <div className="flex flex-col">
                    <AnimatePresence>
                      {players.length === 0 ? (
                        <div className="p-12 text-center text-white/30 text-sm">
                          No operators found matching the active parameters.
                        </div>
                      ) : (
                        players.map((player, idx) => {
                          const rank = isFirstPage
                            ? idx + 1
                            : (currentPage - 1) * filters.pageSize + idx + 1;
                          const score = player.discotiveScore?.current || 0;
                          const last24 =
                            player.discotiveScore?.last24h || score;
                          const delta = score - last24;
                          const vaultCount = player.vault?.length || 0;

                          // Check both root and identity object for real database compatibility
                          const userDomain =
                            player.domain || player.identity?.domain || "--";
                          const userNiche =
                            player.niche || player.identity?.niche || "--";
                          const userLevel =
                            player.level || player.identity?.level || "L1";

                          const initial = player.identity?.fullName
                            ? player.identity.fullName.charAt(0).toUpperCase()
                            : player.identity?.username
                              ? player.identity.username.charAt(0).toUpperCase()
                              : "?";
                          const auraClass = getLevelAura(userLevel);

                          return (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              key={player.id}
                              onClick={() => handleUserClick(player)}
                              className={cn(
                                "grid grid-cols-[50px_1.5fr_1fr_1fr_80px_100px] gap-4 p-5 border-b border-white/[0.02] cursor-pointer transition-colors items-center group relative overflow-hidden",
                                rank === 1
                                  ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:from-amber-500/20"
                                  : "hover:bg-white/[0.02]",
                              )}
                            >
                              {rank === 1 && (
                                <motion.div
                                  animate={{ x: ["-100%", "200%"] }}
                                  transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                  className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent pointer-events-none transform -skew-x-12"
                                />
                              )}

                              <div
                                className={cn(
                                  "text-center text-xs font-mono group-hover:text-white/70 transition-colors",
                                  rank === 1
                                    ? "text-amber-500 font-bold"
                                    : "text-white/30",
                                )}
                              >
                                {rank}
                              </div>

                              {/* OPERATOR COLUMN: Name & Username */}
                              <div className="flex items-center gap-3 min-w-0 z-10">
                                <div
                                  className={cn(
                                    "w-8 h-8 rounded-full border shrink-0 flex items-center justify-center overflow-hidden font-bold text-xs transition-all",
                                    auraClass,
                                  )}
                                >
                                  {initial}
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "text-sm font-bold truncate transition-colors",
                                        rank === 1
                                          ? "text-amber-400 group-hover:text-amber-300"
                                          : "text-white/90 group-hover:text-white",
                                      )}
                                    >
                                      {player.identity?.fullName ||
                                        player.fullName ||
                                        "Operator"}
                                    </span>
                                    {player.tier === "PRO" && (
                                      <img
                                        src="/discotive-pro.png"
                                        alt="Pro"
                                        className="w-3 h-3 object-contain"
                                      />
                                    )}
                                  </div>
                                  <span className="text-[10px] text-white/50 truncate">
                                    @
                                    {player.identity?.username ||
                                      player.username ||
                                      "unknown"}
                                  </span>
                                  <span className="text-[10px] text-white/40 truncate md:hidden mt-0.5">
                                    {player.identity?.niche ||
                                      player.niche ||
                                      "General"}
                                  </span>
                                </div>
                              </div>

                              {/* DOMAIN / NICHE COLUMN */}
                              <div className="hidden md:flex flex-col min-w-0 z-10">
                                <span className="text-xs text-white/70 truncate">
                                  {player.identity?.domain ||
                                    player.domain ||
                                    "Unassigned Sector"}
                                </span>
                                <span className="text-[10px] text-white/30 truncate">
                                  {player.identity?.niche ||
                                    player.niche ||
                                    "General"}
                                </span>
                              </div>

                              {/* LEVEL COLUMN */}
                              <div className="hidden lg:flex items-center z-10">
                                <span
                                  className={cn(
                                    "px-2 py-1 rounded text-[9px] font-medium truncate border",
                                    auraClass,
                                  )}
                                >
                                  {
                                    (
                                      player.identity?.level ||
                                      player.level ||
                                      "L1 - Initiate"
                                    ).split(" - ")[0]
                                  }
                                </span>
                              </div>

                              <div className="text-center flex justify-center z-10">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.02] border border-white/5">
                                  <Database className="w-3 h-3 text-emerald-500/70" />
                                  <span className="text-xs font-mono text-white/60">
                                    {vaultCount}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right flex flex-col items-end justify-center z-10">
                                <span
                                  className={cn(
                                    "font-mono text-sm font-semibold",
                                    rank === 1
                                      ? "text-amber-400"
                                      : "text-white/90",
                                  )}
                                >
                                  {score}
                                </span>
                                <div className="flex items-center justify-end gap-1 text-[10px] font-bold mt-0.5">
                                  {delta > 0 ? (
                                    <span className="text-green-400 flex items-center">
                                      <TrendingUp className="w-3 h-3 mr-0.5" />
                                      {delta}
                                    </span>
                                  ) : delta < 0 ? (
                                    <span className="text-red-400 flex items-center">
                                      <TrendingDown className="w-3 h-3 mr-0.5" />
                                      {Math.abs(delta)}
                                    </span>
                                  ) : (
                                    <span className="text-white/30 flex items-center">
                                      <Minus className="w-3 h-3 mr-0.5" />0
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block z-20">
                                <button
                                  onClick={(e) => triggerCompare(e, player)}
                                  className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5"
                                >
                                  <Crosshair className="w-3 h-3" /> Compare
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Pagination... leave existing code alone */}
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-white/[0.05] bg-white/[0.01] flex items-center justify-between">
                <div className="text-[10px] font-medium text-white/40 uppercase tracking-widest">
                  Page {currentPage}{" "}
                  {totalFilteredUsers > 0 &&
                    `of ${Math.ceil(totalFilteredUsers / filters.pageSize)}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (hasMorePrev) executeFetch("prev");
                    }}
                    disabled={!hasMorePrev || isPaginating}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (hasMoreNext) executeFetch("next");
                    }}
                    disabled={!hasMoreNext || isPaginating}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================================
                WHERE AM I? (Nested Sticky Container for Flawless Alignment)
            ============================================================================ */}
            <div className="sticky bottom-4 z-40 pointer-events-none mt-8">
              <div className="bg-[#111113]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-lg font-semibold text-white/90 font-mono">
                      #{myExactRank || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Current Identity
                    </p>
                    <p className="text-sm font-medium text-white truncate">
                      {userData?.identity?.fullName ||
                        `@${userData?.identity?.username}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-white/5 md:border-none pt-4 md:pt-0">
                  {/* THE PSYCHOLOGY ENGINE: NEXT TARGET */}
                  <div className="text-left md:text-right flex items-center gap-3">
                    <div className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 border border-red-500/30 text-red-500">
                      <Target className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-0.5">
                        Next Target
                      </p>
                      <p className="text-xs font-medium text-white/70 truncate max-w-[150px]">
                        {nextTarget
                          ? `@${nextTarget.identity?.username} (${nextTarget.discotiveScore?.current - (userData?.discotiveScore?.current || 0)} pts)`
                          : "Rank #1 Secured"}
                      </p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-white/10 hidden md:block" />

                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-0.5">
                      Your Score
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-white font-mono leading-none">
                        {userData?.discotiveScore?.current || 0}
                      </p>
                      <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-1.5 py-0.5 rounded flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5" /> +
                        {(userData?.discotiveScore?.current || 0) -
                          (userData?.discotiveScore?.last24h || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ==================== RIGHT SIDEBARS (Responsive Slide-in) ==================== */}
        <AnimatePresence>
          {/* FILTERS SIDEBAR */}
          {isFilterOpen && (
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-[76px] bottom-0 w-full md:w-[450px] bg-[#050505] border-l border-white/[0.05] z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center shrink-0 bg-white/[0.02]">
                <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-white/50" />{" "}
                  Database Filters
                </h2>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                <CustomSelect
                  label="Macro Domain"
                  icon={Network}
                  value={filters.domain}
                  options={TAXONOMY.DOMAINS}
                  onChange={(val) =>
                    setFilters((p) => ({ ...p, domain: val, niche: "" }))
                  }
                />
                <CustomSelect
                  label="Specific Niche"
                  icon={Target}
                  value={filters.niche}
                  options={
                    filters.domain ? TAXONOMY.NICHES[filters.domain] : []
                  }
                  onChange={(val) => setFilters((p) => ({ ...p, niche: val }))}
                  disabled={!filters.domain}
                />
                <CustomSelect
                  label="Experience Level"
                  icon={GraduationCap}
                  value={filters.level}
                  options={TAXONOMY.LEVELS}
                  onChange={(val) => setFilters((p) => ({ ...p, level: val }))}
                />
                <div className="h-px bg-white/[0.05] w-full" />
                <CustomSelect
                  label="Country"
                  icon={MapPin}
                  value={filters.country}
                  options={TAXONOMY.COUNTRIES}
                  onChange={(val) =>
                    setFilters((p) => ({ ...p, country: val, state: "" }))
                  }
                />
                <CustomSelect
                  label="State/Region (India)"
                  icon={MapPin}
                  value={filters.state}
                  options={TAXONOMY.STATES_INDIA}
                  onChange={(val) => setFilters((p) => ({ ...p, state: val }))}
                  disabled={filters.country !== "India"}
                />
                <div className="h-px bg-white/[0.05] w-full" />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#666] ml-1 mb-1.5 block">
                      Sort
                    </label>
                    <div className="flex bg-[#111] border border-[#222] p-1 rounded-xl">
                      <button
                        onClick={() =>
                          setFilters((p) => ({ ...p, sortBy: "desc" }))
                        }
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-colors",
                          filters.sortBy === "desc"
                            ? "bg-white/10 text-white"
                            : "text-[#666] hover:text-white",
                        )}
                      >
                        Highest
                      </button>
                      <button
                        onClick={() =>
                          setFilters((p) => ({ ...p, sortBy: "asc" }))
                        }
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-lg transition-colors",
                          filters.sortBy === "asc"
                            ? "bg-white/10 text-white"
                            : "text-[#666] hover:text-white",
                        )}
                      >
                        Lowest
                      </button>
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#666] ml-1 mb-1.5 block">
                      Show
                    </label>
                    <select
                      value={filters.pageSize}
                      onChange={(e) =>
                        setFilters((p) => ({
                          ...p,
                          pageSize: Number(e.target.value),
                        }))
                      }
                      className="w-full bg-[#111] border border-[#222] text-white px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 appearance-none"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/[0.05] bg-[#000000] shrink-0">
                <button
                  onClick={clearFilters}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Reset Parameters
                </button>
              </div>
            </motion.aside>
          )}

          {/* PUBLIC PROFILE SIDEBAR (Upgraded Aesthetic Preview) */}
          {selectedUserProfile && !isFilterOpen && (
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute md:relative right-0 top-0 bottom-0 w-full md:w-[450px] bg-[#050505] border-l border-white/[0.05] z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/[0.05] flex justify-between items-center shrink-0 bg-white/[0.02]">
                <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                  <User className="w-4 h-4 text-white/50" /> Operator Preview
                </h2>
                <button
                  onClick={() => setSelectedUserProfile(null)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center mb-8">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-full border-2 flex items-center justify-center mb-3 overflow-hidden relative text-2xl font-black shadow-[0_0_20px_rgba(255,255,255,0.05)]",
                      getLevelAura(
                        selectedUserProfile.identity?.level ||
                          selectedUserProfile.level,
                      ),
                    )}
                  >
                    {selectedUserProfile.identity?.fullName
                      ? selectedUserProfile.identity.fullName
                          .charAt(0)
                          .toUpperCase()
                      : selectedUserProfile.fullName
                        ? selectedUserProfile.fullName.charAt(0).toUpperCase()
                        : "?"}
                    {selectedUserProfile.tier === "PRO" && (
                      <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 backdrop-blur-md py-0.5 text-[7px] font-bold text-black uppercase tracking-widest">
                        PRO
                      </div>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedUserProfile.identity?.fullName ||
                      selectedUserProfile.fullName ||
                      "Operator"}
                  </h2>
                  <p className="text-xs text-white/50 mb-3">
                    @
                    {selectedUserProfile.identity?.username ||
                      selectedUserProfile.username ||
                      "unknown"}
                  </p>

                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-white/70 border border-white/5">
                      {selectedUserProfile.identity?.domain ||
                        selectedUserProfile.domain ||
                        "Unassigned Sector"}
                    </span>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-medium text-white/70 border border-white/5">
                      {selectedUserProfile.identity?.niche ||
                        selectedUserProfile.niche ||
                        "General"}
                    </span>
                  </div>
                </div>

                {/* Score & Vault Mini-Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center">
                    <Activity className="w-5 h-5 text-white/20 mb-1" />
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      Score
                    </p>
                    <p className="text-lg font-mono font-semibold text-white">
                      {selectedUserProfile.discotiveScore?.current || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center">
                    <Database className="w-5 h-5 text-emerald-500/30 mb-1" />
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      Assets
                    </p>
                    <p className="text-lg font-mono font-semibold text-emerald-400">
                      {selectedUserProfile.vault?.length || 0}
                    </p>
                  </div>
                </div>

                {/* RADAR CHART: Competency Matrix */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 mb-6">
                  <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-4 text-center">
                    Execution Telemetry
                  </h4>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="70%"
                        data={[
                          {
                            metric: "Execution",
                            val: Math.min(
                              100,
                              (selectedUserProfile.discotiveScore?.current ||
                                0) / 10,
                            ),
                          },
                          {
                            metric: "Vault",
                            val: Math.min(
                              100,
                              (selectedUserProfile.vault?.length || 0) * 10,
                            ),
                          },
                          {
                            metric: "Network",
                            val: Math.min(
                              100,
                              (selectedUserProfile.allies?.length || 0) * 5,
                            ),
                          },
                          {
                            metric: "Consistency",
                            val:
                              selectedUserProfile.discotiveScore?.last24h <
                              selectedUserProfile.discotiveScore?.current
                                ? 85
                                : 40,
                          },
                          {
                            metric: "Level",
                            val:
                              parseInt(
                                selectedUserProfile.identity?.level?.match(
                                  /\d+/,
                                )?.[0] || 1,
                              ) * 20,
                          },
                        ]}
                      >
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                        />
                        <Radar
                          name="Operator"
                          dataKey="val"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.2}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PIE CHART: Asset Distribution */}
                <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">
                      Vault Matrix
                    </h4>
                    <p className="text-xs text-white/60">
                      Asset classification breakdown.
                    </p>
                  </div>
                  <div className="h-[60px] w-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Verified",
                              value:
                                selectedUserProfile.vault?.filter(
                                  (v) => v.status === "VERIFIED",
                                ).length || 1,
                            },
                            {
                              name: "Pending",
                              value:
                                selectedUserProfile.vault?.filter(
                                  (v) => v.status === "PENDING",
                                ).length || 1,
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={30}
                          stroke="none"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" /> {/* Emerald for Verified */}
                          <Cell fill="#f59e0b" /> {/* Amber for Pending */}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-white/[0.05] bg-[#000000] shrink-0 flex flex-col gap-3">
                <button
                  onClick={(e) => triggerCompare(e, selectedUserProfile)}
                  className="w-full py-3 bg-[#111] border border-[#333] hover:bg-[#222] text-white text-xs font-bold rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <Crosshair className="w-4 h-4" /> Initialize X-Ray
                </button>
                <button
                  onClick={() =>
                    navigate(`/${selectedUserProfile.identity?.username}`)
                  }
                  className="w-full py-3 bg-white text-black text-xs font-extrabold rounded-xl hover:bg-[#ccc] transition-transform active:scale-95 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  <User className="w-4 h-4" /> View Full Profile
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isUpsellOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0a0a0c] border border-[#222] rounded-[2rem] shadow-2xl p-8 text-center relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Crown className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">
                Protocol Locked
              </h3>
              <p className="text-xs text-[#888] font-medium leading-relaxed mb-8">
                The Competitor X-Ray engine is classified telemetry. Upgrade to
                Discotive Pro to unlock deep-dive operator analytics.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsUpsellOpen(false)}
                  className="flex-1 py-3 bg-[#111] border border-[#333] text-white rounded-xl text-xs font-bold hover:bg-[#222]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate("/premium")}
                  className="flex-1 py-3 bg-amber-500 text-black rounded-xl text-xs font-extrabold uppercase tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400"
                >
                  Upgrade
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER THE ISOLATED COMPARE ENGINE */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        currentUser={userData}
        targetUser={compareTarget}
      />
    </div>
  );
};

export default Leaderboard;
