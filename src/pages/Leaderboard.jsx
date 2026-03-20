import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path to your firebase config
import { useUserData } from "../hooks/useUserData"; // Your auth hook
import {
  Search,
  Filter,
  ChevronDown,
  X,
  Target,
  Minus,
  Activity,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// --- 1. THE RESTRICTED NIGHT SKY (Top 40%) ---
const StaticStars = () => {
  const [stars, setStars] = useState([]);
  useEffect(() => {
    const generated = Array.from({ length: 60 }, () => ({
      id: Math.random(),
      top: `${Math.random() * 40}%`,
      left: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.3 + 0.1,
      size: Math.random() * 1.5 + 0.5,
    }));
    setStars(generated);
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

// --- 2. CONFIGURATIONS & TAXONOMY ---
const DOMAINS = {
  "Engineering & Tech": [
    "Software Engineering",
    "AI/ML Engineer",
    "Web Development",
    "Protocol Dev",
    "DevOps",
  ],
  "Business & Strategy": [
    "Founder",
    "Product Management",
    "Growth & Marketing",
    "Operations",
  ],
  "Design & Art": [
    "UI/UX Design",
    "Product Design",
    "3D Art",
    "Graphic Design",
  ],
  "Filmmaking & Media": [
    "Director",
    "Cinematic Colorist",
    "Editor",
    "Content Creator",
  ],
};

const SCOPES = ["Global Standings", "Academic Institutions"];
const CHRONOS = [
  "All-Time Ledger",
  "Last Year",
  "Last 6 Months",
  "Last 3 Months",
  "Last Month",
  "Previous Week",
  "Last 24 Hours",
];

// Responsive & Colored Podium Config
const PODIUM_CONFIG = [
  {
    rank: 2,
    height: "h-44 sm:h-52 md:h-56",
    order: 0,
    accent: "border-slate-400",
    fill: "group-hover:bg-slate-400 group-hover:text-black",
    text: "text-slate-400",
  },
  {
    rank: 1,
    height: "h-56 sm:h-64 md:h-72",
    order: 1,
    accent: "border-amber-500",
    fill: "group-hover:bg-amber-500 group-hover:text-black",
    text: "text-amber-500",
    isKing: true,
  },
  {
    rank: 3,
    height: "h-40 sm:h-44 md:h-48",
    order: 2,
    accent: "border-orange-700",
    fill: "group-hover:bg-orange-700 group-hover:text-black",
    text: "text-orange-700",
  },
];

// --- 3. SUB-COMPONENT: MULTI-SELECT DROPDOWN ---
const MultiSelectDropdown = ({
  title,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
  placeholder = "Search...",
}) => {
  const [query, setQuery] = useState("");
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase()),
  );

  const toggleOption = (opt) => {
    if (selected.includes(opt))
      onChange(selected.filter((item) => item !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="relative w-full sm:w-64">
      <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
        {title}
      </p>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between gap-3 bg-[#0a0a0a] border px-4 py-3 rounded-xl font-bold text-sm text-white transition-colors",
          isOpen ? "border-[#555]" : "border-[#222] hover:border-[#444]",
        )}
      >
        <span className="truncate">
          {selected.length > 0 ? `${selected.length} Selected` : "All"}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#666] transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-xl shadow-2xl overflow-hidden z-40"
          >
            <div className="p-2 border-b border-[#222]">
              <div className="flex items-center bg-[#111] rounded-lg px-3 py-2">
                <Search className="w-3 h-3 text-[#666] mr-2" />
                <input
                  type="text"
                  placeholder={placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs text-white w-full placeholder-[#444]"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <p className="text-xs text-[#555] p-2 text-center">
                  No modules found.
                </p>
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => toggleOption(opt)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg hover:bg-[#111] text-[#888] hover:text-white transition-colors text-left"
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {selected.includes(opt) && (
                      <Check className="w-3 h-3 text-white shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- 4. MAIN LEADERBOARD COMPONENT ---
const Leaderboard = () => {
  const { userData, loading: userLoading } = useUserData();

  // -- Real Data State --
  const [dbUsers, setDbUsers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  // -- Engine State --
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [limit, setLimit] = useState(15);
  const [page, setPage] = useState(1);

  // -- Master Filter State --
  const [filters, setFilters] = useState({
    scope: "Global Standings",
    institutions: [],
    domain: "All Domains",
    niches: [],
    locations: [],
    chronos: "All-Time Ledger",
  });

  const isFiltered = useMemo(() => {
    return (
      filters.scope !== "Global Standings" ||
      filters.institutions.length > 0 ||
      filters.domain !== "All Domains" ||
      filters.niches.length > 0 ||
      filters.locations.length > 0 ||
      filters.chronos !== "All-Time Ledger"
    );
  }, [filters]);

  // -- Fetch Real Data from Firestore --
  useEffect(() => {
    const fetchLedger = async () => {
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
            const uname =
              u.identity?.username ||
              u.identity?.email?.split("@")[0] ||
              "user";

            return {
              ...u,
              _globalRank: index + 1,
              _firstName: fName,
              _lastName: lName,
              _email: u.identity?.email || "",
              _username: uname,
              _initials:
                `${fName.charAt(0)}${lName ? lName.charAt(0) : ""}`.toUpperCase(),
              _domain: u.vision?.passion || "Uncategorized",
              _niche: u.vision?.niche || "Unspecified",
              _location: u.footprint?.location || null,
              _institution: u.baseline?.institution || null,
              _score: u.discotiveScore || 0,
            };
          });

        setDbUsers(sorted);
      } catch (error) {
        console.error("Ledger Sync Failed:", error);
      } finally {
        setIsFetching(false);
      }
    };
    fetchLedger();
  }, []);

  // -- The Deterministic Filter Engine --
  const filteredLedger = useMemo(() => {
    return dbUsers.filter((u) => {
      if (
        filters.scope === "Academic Institutions" &&
        filters.institutions.length > 0
      ) {
        if (!u._institution || !filters.institutions.includes(u._institution))
          return false;
      }
      if (filters.domain !== "All Domains") {
        if (filters.niches.length > 0 && !filters.niches.includes(u._niche))
          return false;
      }
      if (filters.locations.length > 0) {
        if (!u._location || !filters.locations.includes(u._location))
          return false;
      }
      return true;
    });
  }, [dbUsers, filters]);

  const totalPages = Math.ceil(filteredLedger.length / limit) || 1;
  const paginatedLedger = filteredLedger.slice(
    (page - 1) * limit,
    page * limit,
  );

  // -- Dynamic Podium Allocation --
  const podiumTop3 = [
    filteredLedger[0] || null,
    filteredLedger[1] || null,
    filteredLedger[2] || null,
  ];

  const handleDropdownToggle = (id) => {
    setActiveDropdown((prev) => (prev === id ? null : id));
  };

  const clearProtocols = () => {
    setFilters({
      scope: "Global Standings",
      institutions: [],
      domain: "All Domains",
      niches: [],
      locations: [],
      chronos: "All-Time Ledger",
    });
    setPage(1);
    setActiveDropdown(null);
  };

  const currentUserObj = dbUsers.find(
    (u) => u._email === userData?.identity?.email,
  );
  const currentUserGlobalRank = currentUserObj
    ? currentUserObj._globalRank
    : -1;

  if (isFetching || userLoading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-20 relative">
      <StaticStars />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white opacity-[0.01] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-16">
        {/* --- HEADER --- */}
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
            Discotive Leaderboard.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#888] font-medium text-lg md:text-xl tracking-tight max-w-2xl mx-auto"
          >
            Real-time execution dossier rankings. Cryptographic Proof of Work on
            the Discotive Chain.
          </motion.p>
        </div>

        {/* --- THE DYNAMIC PRESTIGE PODIUM --- */}
        <div className="flex justify-center items-end gap-2 md:gap-6 h-80 pt-10">
          {PODIUM_CONFIG.map((pos, idx) => {
            const user = podiumTop3[pos.rank - 1];

            return (
              <motion.div
                key={pos.rank}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                className={cn(
                  "relative flex flex-col items-center w-[110px] sm:w-36 md:w-56",
                  pos.rank === 1
                    ? "z-20 -translate-y-8 md:-translate-y-12"
                    : "z-10",
                )}
              >
                {user ? (
                  // POPULATED PODIUM CARD
                  <Link
                    to={`/${user._username}`}
                    className="block group w-full h-full relative flex flex-col items-center"
                  >
                    <div
                      className={cn(
                        "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center text-xl md:text-2xl font-extrabold shadow-2xl absolute -top-10 sm:-top-12 z-20 transition-transform duration-500 group-hover:scale-110",
                        "bg-[#050505] border-2 group-hover:bg-white group-hover:text-black",
                        pos.accent,
                        pos.text,
                      )}
                    >
                      {user._initials}
                      {pos.isKing && (
                        <span className="absolute -top-6 sm:-top-8 text-2xl sm:text-3xl animate-pulse">
                          👑
                        </span>
                      )}
                    </div>

                    <div
                      className={cn(
                        "w-full rounded-t-[2rem] border-x border-t bg-[#0a0a0a] flex flex-col items-center justify-end pb-6 md:pb-8 pt-16 shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-all duration-500",
                        pos.height,
                        pos.accent,
                      )}
                    >
                      <div className="absolute top-4 right-4 p-2 rounded-full border border-[#333] opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                        <Eye className="w-4 h-4 text-[#888]" />
                      </div>
                      <h3 className="font-bold text-white text-xs sm:text-sm whitespace-nowrap truncate w-full text-center px-2 sm:px-4 group-hover:scale-105 transition-transform">
                        {user._firstName} {user._lastName}
                      </h3>
                      <p className="text-[8px] sm:text-[10px] font-bold text-[#666] uppercase tracking-widest mt-1 mb-3 sm:mb-4 truncate px-2">
                        {user._domain}
                      </p>

                      <div
                        className={cn(
                          "px-4 sm:px-5 py-1.5 sm:py-2 rounded-full border transition-colors duration-300",
                          pos.accent,
                          pos.fill,
                          "bg-[#050505]",
                        )}
                      >
                        <p className="font-extrabold text-sm sm:text-xl tracking-tighter">
                          - -
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  // EMPTY AWAITING DEPLOYMENT CARD
                  <div
                    className={cn(
                      "w-full rounded-t-[2rem] border-x border-t bg-[#050505] border-[#111] flex flex-col items-center justify-center relative overflow-hidden group",
                      pos.height,
                    )}
                  >
                    <motion.div
                      className="absolute left-0 right-0 h-[1px] bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    <div className="text-[#333] mb-4">
                      <Activity className="w-5 h-5 md:w-6 md:h-6 opacity-30" />
                    </div>
                    <p className="text-[7px] md:text-[10px] font-mono text-[#444] tracking-[0.3em] uppercase text-center px-1 md:px-2 leading-relaxed">
                      [ Awaiting <br /> Deployment ]
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* --- CASCADING QUERY ENGINE (Filters) --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0a0a0a] border border-[#222] p-6 md:p-8 rounded-[2rem] shadow-2xl relative z-30"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-[#222] pb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <Filter className="w-4 h-4" /> Ledger Engine
              </h3>
              <div className="px-3 py-1 bg-[#111] rounded border border-[#333] text-[10px] font-mono text-[#888]">
                {filteredLedger.length} Operators Found
              </div>
            </div>

            <button
              onClick={clearProtocols}
              className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear Protocols
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {/* ROW 1: Base Categories */}
            <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
              {/* SCOPE */}
              <div className="relative w-full sm:w-56">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                  Scope
                </p>
                <button
                  onClick={() => handleDropdownToggle("scope")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white"
                >
                  {filters.scope}{" "}
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                </button>
                <AnimatePresence>
                  {activeDropdown === "scope" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 overflow-hidden shadow-2xl"
                    >
                      {SCOPES.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setFilters((f) => ({
                              ...f,
                              scope: s,
                              institutions: [],
                            }));
                            setActiveDropdown(null);
                            setPage(1);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111]"
                        >
                          {s}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* DOMAIN */}
              <div className="relative w-full sm:w-56">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                  Macro Domain
                </p>
                <button
                  onClick={() => handleDropdownToggle("domain")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white"
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
                      className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 overflow-hidden shadow-2xl"
                    >
                      {["All Domains", ...Object.keys(DOMAINS)].map((d) => (
                        <button
                          key={d}
                          onClick={() => {
                            setFilters((f) => ({
                              ...f,
                              domain: d,
                              niches: [],
                            }));
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

              {/* CHRONOS */}
              <div className="relative w-full sm:w-48">
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
                  Chronos
                </p>
                <button
                  onClick={() => handleDropdownToggle("chronos")}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#050505] border border-[#222] rounded-xl text-sm font-bold text-white"
                >
                  {filters.chronos}{" "}
                  <ChevronDown className="w-4 h-4 text-[#666]" />
                </button>
                <AnimatePresence>
                  {activeDropdown === "chronos" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-[calc(100%+8px)] left-0 w-full bg-[#0a0a0a] border border-[#333] rounded-xl z-40 overflow-hidden shadow-2xl"
                    >
                      {CHRONOS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setFilters((f) => ({ ...f, chronos: c }));
                            setActiveDropdown(null);
                            setPage(1);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-[#888] hover:text-white hover:bg-[#111]"
                        >
                          {c}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ROW 2: Cascading Multi-Selects (Animated Expansion) */}
            <AnimatePresence>
              {(filters.scope === "Academic Institutions" ||
                filters.domain !== "All Domains") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#111] overflow-hidden"
                >
                  {filters.scope === "Academic Institutions" && (
                    <MultiSelectDropdown
                      title="Select Institutions"
                      options={[
                        "JECRC Foundation",
                        "IIT Bombay",
                        "BITS Pilani",
                        "Stanford",
                        "MIT",
                      ]}
                      selected={filters.institutions}
                      onChange={(arr) => {
                        setFilters((f) => ({ ...f, institutions: arr }));
                        setPage(1);
                      }}
                      isOpen={activeDropdown === "institutions"}
                      onToggle={() => handleDropdownToggle("institutions")}
                      placeholder="Search university..."
                    />
                  )}
                  {filters.domain !== "All Domains" && (
                    <MultiSelectDropdown
                      title="Micro Niche"
                      options={DOMAINS[filters.domain] || []}
                      selected={filters.niches}
                      onChange={(arr) => {
                        setFilters((f) => ({ ...f, niches: arr }));
                        setPage(1);
                      }}
                      isOpen={activeDropdown === "niches"}
                      onToggle={() => handleDropdownToggle("niches")}
                      placeholder="Search niche..."
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* --- LIMIT CONTROLS & TABLE HEADER --- */}
        <div className="flex justify-between items-end mb-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em]">
              Show
            </span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#111] border border-[#333] text-white text-xs font-bold px-2 py-1 rounded outline-none cursor-pointer"
            >
              {[10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* --- THE LEADERBOARD TABLE --- */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] shadow-2xl relative z-10 w-full overflow-x-auto custom-scrollbar">
          <div className="min-w-[900px]">
            {/* Sticky Glassmorphism Header */}
            <div className="sticky top-0 z-20 grid grid-cols-12 gap-4 px-8 py-4 border-b border-[#222] bg-[#050505]/80 backdrop-blur-xl text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
              <div className="col-span-1">Rank</div>
              {isFiltered && (
                <div className="col-span-1 text-[#444]">Global</div>
              )}
              <div className={isFiltered ? "col-span-3" : "col-span-4"}>
                Identity
              </div>
              <div className="col-span-1">Level</div>
              <div className="col-span-3">Domain & Niche</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1 text-right">Score</div>
            </div>

            <div className="divide-y divide-[#111]">
              {paginatedLedger.length === 0 ? (
                <div className="py-20 text-center text-[#555] font-mono text-sm uppercase tracking-widest">
                  [ NULL RESULT : NO OPERATORS IN THIS COORDINATE ]
                </div>
              ) : (
                paginatedLedger.map((user, idx) => {
                  const rank = (page - 1) * limit + idx + 1;
                  const isGhostTarget =
                    user._globalRank === currentUserGlobalRank - 1;
                  const isMe = user._email === userData?.identity?.email;

                  return (
                    <Link
                      to={`/user/${user._username}`}
                      key={user.id}
                      className={cn(
                        "grid grid-cols-12 gap-4 px-8 py-5 items-center bg-[#0a0a0a] transition-all duration-300 group relative",
                        "hover:bg-[#111] hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:z-10 hover:border-l-2 hover:border-white",
                        isMe && "bg-[#111] border-l-2 border-[#555]",
                      )}
                    >
                      {/* 1. Filter Rank */}
                      <div className="col-span-1 font-mono font-bold text-[#666] text-sm group-hover:text-white transition-colors flex items-center gap-2">
                        {String(rank).padStart(2, "0")}
                        {isGhostTarget && (
                          <Target
                            className="w-3 h-3 text-red-500 animate-pulse hidden md:block"
                            title="Next Target"
                          />
                        )}
                      </div>

                      {/* 2. Global Position (Conditional) */}
                      {isFiltered && (
                        <div className="col-span-1 font-mono text-xs text-[#444] group-hover:text-[#888]">
                          #{user._globalRank}
                        </div>
                      )}

                      {/* 3. Identity */}
                      <div
                        className={cn(
                          "flex items-center gap-4",
                          isFiltered ? "col-span-3" : "col-span-4",
                        )}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-xs font-bold text-[#888] group-hover:border-white group-hover:text-white transition-colors shrink-0">
                          {user._initials}
                        </div>
                        <div className="truncate">
                          <span className="font-extrabold text-sm text-white truncate flex items-center gap-2">
                            {user._firstName} {user._lastName}
                            {isMe && (
                              <span className="text-[8px] bg-white text-black px-1.5 rounded uppercase tracking-wider font-bold">
                                You
                              </span>
                            )}
                          </span>
                          <p className="text-[10px] font-mono text-[#555] group-hover:text-[#888] tracking-wider truncate">
                            @{user._username}
                          </p>
                        </div>
                      </div>

                      {/* 4. Level */}
                      <div className="col-span-1 text-xs font-bold text-[#555] group-hover:text-[#888]">
                        Level 1
                      </div>

                      {/* 5. Domain & Niche */}
                      <div className="col-span-3 truncate pr-4">
                        <p className="text-sm font-bold text-[#ccc] group-hover:text-white truncate">
                          {user._domain}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#555] group-hover:text-[#888] truncate">
                          {user._niche}
                        </p>
                      </div>

                      {/* 6. Location */}
                      <div className="col-span-2 flex items-center gap-2 text-sm font-medium">
                        {user._location ? (
                          <>
                            <MapPin className="w-3 h-3 text-[#555]" />
                            <span className="text-[#888] truncate group-hover:text-white transition-colors">
                              {user._location}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono text-[10px] text-[#444] tracking-[0.2em]">
                            [ UNMAPPED ]
                          </span>
                        )}
                      </div>

                      {/* 7. Hardcoded Dev Score Placeholders */}
                      <div className="col-span-1 flex flex-col items-end justify-center">
                        <div className="flex items-center gap-2">
                          <Minus className="w-3 h-3 text-[#444]" />
                          <span className="font-extrabold text-white text-lg tracking-tighter">
                            - -
                          </span>
                        </div>
                        <span className="font-mono text-[8px] text-[#444] tracking-widest">
                          [ PENDING ]
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* TABLE PAGINATION */}
          {totalPages > 1 && (
            <div className="bg-[#050505] border-t border-[#222] px-8 py-4 flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#666] tracking-widest">
                PAGE {page} / {totalPages}
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
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] disabled:opacity-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* --- IN-PAGE USER STATUS WIDGET --- */}
        {currentUserObj && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            {/* Left: User Info */}
            <div className="flex items-center gap-4 md:gap-6 w-full sm:w-auto">
              <div className="w-12 h-12 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-sm font-bold text-[#888] shrink-0">
                {currentUserObj._initials}
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
                  Your Standing
                </p>
                <p className="font-extrabold text-white text-base md:text-lg tracking-tight">
                  {currentUserObj._firstName} {currentUserObj._lastName}
                </p>
              </div>
            </div>

            {/* Right: Stats */}
            <div className="flex items-center justify-between sm:justify-end gap-8 md:gap-16 w-full sm:w-auto border-t sm:border-t-0 border-[#222] pt-4 sm:pt-0 mt-2 sm:mt-0">
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
                  Global Rank
                </p>
                <p className="font-extrabold text-[#888] text-xl md:text-2xl tracking-tighter">
                  #{currentUserGlobalRank}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
                  Discotive Score
                </p>
                <p className="font-extrabold text-white text-xl md:text-2xl tracking-tighter flex items-center justify-end gap-2">
                  - -{" "}
                  <span className="text-[#555] font-mono text-[10px]">
                    LVL 1
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
