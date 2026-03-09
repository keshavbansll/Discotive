import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  MapPin,
  Briefcase,
  ChevronDown,
  ArrowRight,
  Zap,
  Search,
  Eye,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../components/ui/BentoCard";

// --- ADVANCED SHOOTING STAR ENGINE ---
const ShootingStars = () => {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    const generateStar = () => ({
      id: Math.random(),
      top: `${Math.random() * 40}%`, // Occur in top half
      left: `${Math.random() * 80 + 20}%`, // Start mid-to-right
      delay: Math.random() * 8, // Rare
      duration: Math.random() * 2 + 2, // Slight, slow stretch
    });

    setStars(Array.from({ length: 3 }, generateStar)); // Fewer stars

    const interval = setInterval(() => {
      setStars(Array.from({ length: 3 }, generateStar));
    }, 10000); // Rare bursts

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          initial={{ opacity: 0, x: 0, y: 0, width: 0 }}
          animate={{
            opacity: [0, 0.15, 0], // Faint
            x: -600,
            y: 600, // Long diagonal
            width: [0, 150, 0], // Stretch and shrink
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            ease: "easeInOut",
          }}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-white to-transparent"
          style={{
            top: star.top,
            left: star.left,
            transform: "rotate(-45deg)",
          }}
        />
      ))}
    </div>
  );
};

// --- BRUTALIST DROPDOWN COMPONENT ---
const LedgerDropdown = ({ label, options, current, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full sm:w-auto">
      <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 px-1">
        {label}
      </p>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-56 flex items-center justify-between gap-3 bg-[#0a0a0a] border border-[#222] px-5 py-3.5 rounded-full font-bold text-sm text-white hover:border-[#444] transition-colors"
      >
        <span className="truncate">{current}</span>{" "}
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#666] transition-transform",
            isOpen ? "rotate-180" : "",
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-[calc(100%+8px)] left-0 w-full sm:w-64 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#222] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-30"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onSelect(opt);
                  setIsOpen(false);
                }}
                className="w-full text-left px-5 py-3.5 text-sm font-bold text-[#888] hover:text-white hover:bg-[#111] transition-colors"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- MOCK DATA ---
const topThree = [
  {
    rank: 2,
    name: "Sarah Chen",
    username: "sarah_chen",
    career: "AI Architecture",
    location: "San Francisco, US",
    score: 892,
    initials: "SC",
    accent: "border-slate-400",
    fill: "group-hover:bg-slate-400",
    text: "text-slate-400",
  },
  {
    rank: 1,
    name: "Alex Kumar",
    username: "alex_k",
    career: "Fullstack OS",
    location: "Bangalore, IN",
    score: 915,
    initials: "AK",
    isKing: true,
    accent: "border-amber-500",
    fill: "group-hover:bg-amber-500",
    text: "text-amber-500",
  },
  {
    rank: 3,
    name: "Priya Sharma",
    username: "psharma",
    career: "Product Strategy",
    location: "London, UK",
    score: 878,
    initials: "PS",
    accent: "border-orange-700",
    fill: "group-hover:bg-orange-700",
    text: "text-orange-700",
  },
];

const leaderboardData = [
  {
    rank: 4,
    name: "Rahul Singh",
    username: "rsingh",
    career: "Backend Systems",
    location: "Delhi, IN",
    score: 865,
    initials: "RS",
    trend: "down",
  },
  {
    rank: 5,
    name: "Anita Desai",
    username: "adesai",
    career: "UI/UX Engineering",
    location: "Pune, IN",
    score: 850,
    initials: "AD",
    trend: "up",
  },
  {
    rank: 6,
    name: "Vikram Patel",
    username: "vpatel",
    career: "Protocol Dev",
    location: "Chennai, IN",
    score: 842,
    initials: "VP",
    trend: "same",
  },
  {
    rank: 7,
    name: "Neha Gupta",
    username: "ngupta",
    career: "Frontend Dynamics",
    location: "Jaipur, IN",
    score: 831,
    initials: "NG",
    trend: "down",
  },
  {
    rank: 8,
    name: "Arjun Reddy",
    username: "areddy",
    career: "Machine Learning",
    location: "Hyderabad, IN",
    score: 812,
    initials: "AR",
    trend: "up",
  },
];

// Dropdown filter options
const filterConfigs = {
  Scope: [
    "Global Standings",
    "Local University",
    "Career Hub Jaipur",
    "Hackathon Cohort",
  ],
  Domain: [
    "All Domains",
    "Engineering",
    "Product & Strategy",
    "Design & UI/UX",
    "Growth & Marketing",
  ],
  Chronos: ["All-Time Ledger", "Monthly Execution", "Last Sprint"],
};

const Leaderboard = () => {
  const { userData, loading } = useUserData();
  const [activeFilters, setActiveFilters] = useState({
    Scope: "Global Standings",
    Domain: "All Domains",
    Chronos: "All-Time Ledger",
  });

  const firstName = userData?.identity?.firstName || "Builder";
  const lastName = userData?.identity?.lastName || "";
  const initials =
    `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();
  const userScore = userData?.discotiveScore || 742;

  const updateFilter = (key, value) =>
    setActiveFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      {/* Subtle grainy overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
      <ShootingStars />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white opacity-[0.015] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-16">
        {/* --- HEADER --- */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center items-center gap-3 text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4"
          >
            <Search className="w-3 h-3" /> Protocol Access Verified
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
            Real-time execution dossier rankings. Verified Proof of Work on the
            Discotive Chain.
          </motion.p>
        </div>

        {/* --- THE BRUTALIST PODIUM --- */}
        <div className="flex justify-center items-end gap-2 md:gap-6 h-72 pt-10">
          {topThree.map((user, idx) => (
            <Link
              key={user.rank}
              to={`/app/profile/${user.username}`}
              className="block group"
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: idx * 0.1,
                  type: "spring",
                  stiffness: 100,
                }}
                className={cn(
                  "relative flex flex-col items-center w-[110px] sm:w-36 md:w-56",
                  user.rank === 1 ? "z-20 -translate-y-12" : "z-10",
                )}
              >
                {/* Avatar Circle */}
                <div
                  className={cn(
                    "w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-xl md:text-3xl font-extrabold shadow-2xl z-20 absolute -top-10 sm:-top-14 transition-all duration-500 group-hover:scale-110",
                    "bg-[#050505] border-2 group-hover:bg-white group-hover:text-black",
                    user.accent,
                    user.text,
                  )}
                >
                  {user.initials}
                  {user.isKing && (
                    <span className="absolute -top-7 text-3xl animate-pulse">
                      👑
                    </span>
                  )}
                </div>

                {/* Obsidian Base */}
                <div
                  className={cn(
                    "w-full rounded-t-[2rem] border-x border-t bg-[#0a0a0a] flex flex-col items-center justify-end pb-8 pt-20 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-colors duration-500 group-hover:shadow-[0_-20px_80px_rgba(255,255,255,0.05)]",
                    user.rank === 1
                      ? "h-64 border-[#333] group-hover:border-[#555]"
                      : "h-52 border-[#222] group-hover:border-[#333]",
                  )}
                >
                  <div className="absolute top-4 right-4 p-2 rounded-full border border-[#222] opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-4 h-4 text-[#888]" />
                  </div>
                  <h3 className="font-bold text-white text-xs md:text-sm whitespace-nowrap truncate w-full text-center px-4 mb-1 group-hover:scale-105 transition-transform">
                    {user.name}
                  </h3>
                  <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-widest mt-1 mb-3 truncate px-2">
                    {user.career}
                  </p>

                  {/* The Dynamic Score Box: Hollow -> Filled */}
                  <div
                    className={cn(
                      "px-5 py-2 rounded-full border bg-[#050505] transition-all duration-300 group-hover:text-black",
                      user.accent,
                      user.fill,
                    )}
                  >
                    <p className="font-extrabold text-sm md:text-2xl tracking-tighter">
                      {user.score}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {/* --- GLOBAL LEDGER QUERY ENGINE (Dropdowns) --- */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0a0a0a] border border-[#222] p-8 md:p-10 rounded-[2rem] shadow-2xl relative z-20"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em] flex items-center gap-2">
              <Filter className="w-4 h-4" /> Ledger Query
            </h3>
            <div className="w-full md:w-auto flex items-center bg-[#111] rounded-full px-5 py-3 border border-[#222] focus-within:border-[#555] transition-colors flex-1 max-w-sm group">
              <Search className="w-4 h-4 text-[#444] group-focus-within:text-white shrink-0" />
              <input
                type="text"
                placeholder="Query builder dossier..."
                className="w-full bg-transparent border-none outline-none text-sm px-3 text-white placeholder-[#444] font-medium"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 flex-wrap">
            {Object.keys(filterConfigs).map((key) => (
              <LedgerDropdown
                key={key}
                label={key}
                options={filterConfigs[key]}
                current={activeFilters[key]}
                onSelect={(val) => updateFilter(key, val)}
              />
            ))}
            <button className="text-xs font-bold text-[#666] hover:text-white transition-colors mt-2 sm:mt-6">
              Clear Protocol
            </button>
          </div>
        </motion.div>

        {/* --- THE LEDGER TABLE --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] overflow-hidden shadow-2xl relative z-10"
        >
          <div className="grid grid-cols-12 gap-4 px-6 md:px-10 py-5 border-b border-[#222] bg-[#050505] text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
            <div className="col-span-2 md:col-span-1">Rank</div>
            <div className="col-span-6 md:col-span-4">Builder Dossier</div>
            <div className="hidden md:block md:col-span-3">
              Execution Domain
            </div>
            <div className="hidden md:col-span-2 md:flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </div>
            <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-1">
              <Zap className="w-3 h-3" /> Score
            </div>
          </div>

          <div className="divide-y divide-[#111]">
            {leaderboardData.map((user) => (
              <div
                key={user.rank}
                className="grid grid-cols-12 gap-4 px-6 md:px-10 py-6 items-center bg-[#0a0a0a] hover:bg-white hover:text-black hover:scale-[1.01] transition-all duration-300 cursor-pointer group"
              >
                <div className="col-span-2 md:col-span-1 font-mono font-bold text-[#666] group-hover:text-black/70 transition-colors">
                  {String(user.rank).padStart(2, "0")}
                </div>

                <div className="col-span-6 md:col-span-4 flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-xs font-bold shrink-0 text-[#888] group-hover:border-black group-hover:text-black transition-colors">
                    {user.initials}
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-white group-hover:text-black truncate">
                      {user.name}
                    </span>
                    <p className="text-[10px] font-mono text-[#555] group-hover:text-black/60 tracking-wider">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="hidden md:flex md:col-span-3 items-center gap-3 text-sm font-bold text-[#888] group-hover:text-black/80">
                  <Briefcase className="w-4 h-4 text-[#444] group-hover:text-black/60" />
                  <span className="truncate">{user.career}</span>
                </div>

                <div className="hidden md:block md:col-span-2 text-sm font-medium text-[#666] truncate group-hover:text-black/70">
                  {user.location}
                </div>

                <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-5">
                  <div className="flex items-center gap-2">
                    {user.trend === "up" && (
                      <TrendingUp className="w-4 h-4 text-green-500 shrink-0 group-hover:text-black" />
                    )}
                    {user.trend === "down" && (
                      <TrendingDown className="w-4 h-4 text-red-500 shrink-0 group-hover:text-black" />
                    )}
                    {user.trend === "same" && (
                      <Minus className="w-4 h-4 text-[#666] shrink-0 group-hover:text-black/60" />
                    )}
                    <span className="font-extrabold text-white text-xl tracking-tighter group-hover:text-black">
                      {user.score}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-[#333] group-hover:border-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:bg-black group-hover:text-white transition-all -mr-2">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* --- STICKY BOTTOM USER BAR --- */}
      <div className="fixed bottom-0 left-0 md:left-20 right-0 bg-[#000]/90 backdrop-blur-2xl border-t border-[#222] p-4 md:p-6 flex items-center justify-between z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-4 md:ml-4">
          {loading ? (
            <Skeleton className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-black text-sm font-extrabold shadow-[0_0_30px_rgba(255,255,255,0.2)] shrink-0">
              {initials}
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Your Standing
            </p>
            {loading ? (
              <Skeleton className="w-32 h-6" />
            ) : (
              <p className="font-extrabold text-white text-sm md:text-lg tracking-tight truncate">
                {firstName} {lastName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-12 md:mr-4 text-right">
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Global Rank
            </p>
            <p className="font-extrabold text-[#888] text-xl md:text-3xl tracking-tighter">
              #421
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Execution Momentum
            </p>
            {loading ? (
              <Skeleton className="w-20 h-8" />
            ) : (
              <p className="font-extrabold text-white text-xl md:text-3xl tracking-tighter flex items-center justify-end gap-2">
                {userScore} <TrendingUp className="w-5 h-5 text-green-500" />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
