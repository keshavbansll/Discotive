import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Terminal,
  Activity,
  ShieldCheck,
  Target,
  Zap,
  MapPin,
  Trophy,
  GitCommit,
  ArrowRight,
  Clock,
  Database,
  ChevronRight,
  Crosshair,
  Radio,
  Lock,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../components/ui/BentoCard";

// --- LIVE TERMINAL CLOCK ---
const TerminalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="font-mono tracking-widest text-[#888]">
      {time.toLocaleTimeString("en-US", { hour12: false })}{" "}
      <span className="text-[#444]">SYS.TIME</span>
    </span>
  );
};

// --- MOCK COMMAND CENTER DATA ---
const systemData = {
  activeNode: {
    title: "Database Infrastructure",
    deadline: "Due Today",
    module: "Roadmap",
  },
  targetMatch: {
    role: "Founding Engineer",
    company: "HyperScale Analytics",
    match: 88,
  },
  hubStatus: { name: "Jaipur Infra", load: 82, status: "High Energy" },
  vaultSync: { total: 14, latest: "schema.js", hash: "0x8F2A...9C1" },
  ledger: [
    { action: "Auth Pipeline Deployed", time: "2h ago", verify: true },
    { action: "Hub Access Granted", time: "5h ago", verify: true },
    { action: "Profile Query (VC Scout)", time: "1d ago", verify: false },
  ],
};

const Dashboard = () => {
  const { userData, loading } = useUserData();

  const firstName = userData?.identity?.firstName || "Builder";
  const score = userData?.discotiveScore || 742;
  const passion = userData?.vision?.passion || "Systems Architecture";

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      {/* Pure Void Texture */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-8">
        {/* --- HEADER: SYSTEM BOOT --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-[10px] font-bold text-green-500 uppercase tracking-[0.3em] mb-4"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              System Online • Encrypted Connection
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
            >
              Command Center.
            </motion.h1>
            {loading ? (
              <Skeleton className="w-64 h-6 mt-4" />
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[#888] font-medium text-lg md:text-xl tracking-tight"
              >
                Welcome back, <span className="text-white">{firstName}</span>.
                Execution protocols are standing by.
              </motion.p>
            )}
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] px-6 py-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-2xl">
            <Terminal className="w-5 h-5 text-[#666]" />
            <TerminalClock />
          </div>
        </div>

        {/* --- THE ENGINE GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-6 auto-rows-[minmax(180px,auto)]">
          {/* 1. DISCOTIVE SCORE (Top Left) */}
          <Link to="/app/leaderboard" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 h-full flex flex-col justify-between hover:bg-white hover:text-black hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] group-hover:text-black/60">
                  Execution Momentum
                </p>
                <Zap className="w-5 h-5 text-amber-500 group-hover:text-black" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <h2 className="text-6xl font-extrabold tracking-tighter">
                    {score}
                  </h2>
                  <Activity className="w-6 h-6 text-green-500 group-hover:text-black" />
                </div>
                <p className="text-xs font-bold text-[#888] group-hover:text-black/80 flex items-center gap-2">
                  Top 1% of{" "}
                  <span className="uppercase tracking-widest">{passion}</span>
                </p>
              </div>
            </motion.div>
          </Link>

          {/* 2. THE TERMINAL / ACTIVE PROTOCOL (Spans 2 cols, 2 rows) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#050505] border border-[#222] rounded-[2rem] p-8 lg:col-span-2 lg:row-span-2 relative overflow-hidden flex flex-col group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#333] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#111] rounded-lg border border-[#222]">
                  <Terminal className="w-4 h-4 text-white" />
                </div>
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
                  Active Execution Protocol
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest">
                  Live
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center border-l-2 border-[#222] pl-6 ml-2 relative">
              <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-[#444]" />
              <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-[#444]" />

              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-white mb-4 leading-none">
                {systemData.activeNode.title}
              </h3>
              <p className="text-sm font-mono text-[#888] flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#555]" />{" "}
                {systemData.activeNode.deadline}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-[#222] flex items-center justify-between">
              <p className="text-xs font-bold text-[#666] uppercase tracking-[0.1em]">
                Engine: Discotive Timeline
              </p>
              <Link
                to="/app/roadmap"
                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold text-xs hover:bg-[#ccc] transition-colors"
              >
                Resume Deployment <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>

          {/* 3. LEADERBOARD STANDING (Top Right) */}
          <Link to="/app/leaderboard" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 h-full flex flex-col justify-between hover:bg-white hover:text-black hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] group-hover:text-black/60">
                  Global Standing
                </p>
                <Trophy className="w-5 h-5 text-amber-500 group-hover:text-black" />
              </div>
              <div>
                <h2 className="text-6xl font-extrabold tracking-tighter text-white group-hover:text-black mb-2">
                  #421
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-[#111] group-hover:bg-black/10 text-[#888] group-hover:text-black px-2 py-1 rounded border border-[#222] group-hover:border-black/20">
                    +12 Ranks Today
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 4. ASSET VAULT MOAT (Mid Left) */}
          <Link to="/app/vault" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 h-full flex flex-col justify-between hover:bg-white hover:text-black hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] group-hover:text-black/60">
                  Vault Strength
                </p>
                <Database className="w-5 h-5 text-[#666] group-hover:text-black" />
              </div>
              <div>
                <h2 className="text-4xl font-extrabold tracking-tighter text-white group-hover:text-black mb-2">
                  {systemData.vaultSync.total} Assets
                </h2>
                <p className="text-[10px] font-mono text-[#555] group-hover:text-black/60 truncate">
                  Latest: {systemData.vaultSync.hash}
                </p>
              </div>
            </motion.div>
          </Link>

          {/* 5. PHYSICAL INFRASTRUCTURE (Mid Right) */}
          <Link to="/app/hubs" className="block group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-[#222] rounded-[2rem] p-8 h-full flex flex-col justify-between relative overflow-hidden hover:border-[#444] hover:scale-[1.02] transition-all duration-300"
            >
              {/* Radar Ping bg */}
              <div className="absolute -right-10 -bottom-10 w-32 h-32 border border-[#222] rounded-full opacity-50 pointer-events-none group-hover:border-[#444] group-hover:scale-150 transition-all duration-700" />

              <div className="flex justify-between items-start relative z-10">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
                  Live Radar Ping
                </p>
                <Radio className="w-5 h-5 text-blue-500" />
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">
                  {systemData.hubStatus.name}
                </h2>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-[#111] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${systemData.hubStatus.load}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-blue-400">
                    {systemData.hubStatus.load}% LOAD
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 6. ALGORITHMIC ROUTING (Bottom Left, Spans 2 cols) */}
          <Link to="/app/opportunities" className="block lg:col-span-2 group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 h-full flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white hover:text-black transition-all duration-300"
            >
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Crosshair className="w-4 h-4 text-[#666] group-hover:text-black" />
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] group-hover:text-black/60">
                    Primary Target Acquired
                  </p>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-white group-hover:text-black mb-1">
                  {systemData.targetMatch.role}
                </h2>
                <p className="text-sm font-bold text-[#888] group-hover:text-black/80">
                  {systemData.targetMatch.company}
                </p>
              </div>

              <div className="flex items-center gap-6 shrink-0 border-l border-[#222] group-hover:border-black/10 pl-6 w-full md:w-auto">
                <div>
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1 group-hover:text-black/60">
                    Alignment
                  </p>
                  <p className="text-4xl font-extrabold tracking-tighter">
                    {systemData.targetMatch.match}
                    <span className="text-xl text-[#666] group-hover:text-black/60">
                      %
                    </span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full border border-[#333] group-hover:border-black flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </Link>

          {/* 7. EXECUTION LEDGER (Bottom Right, Spans 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-[#050505] border border-[#222] rounded-[2rem] p-8 lg:col-span-2 h-full flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
                <GitCommit className="w-4 h-4" /> System Ledger
              </p>
              <Lock className="w-3 h-3 text-[#444]" />
            </div>

            <div className="flex-1 space-y-4 flex flex-col justify-center">
              {systemData.ledger.map((log, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between group/log border-b border-[#111] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    {log.verify ? (
                      <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <Activity className="w-4 h-4 text-[#444] shrink-0" />
                    )}
                    <span className="text-sm font-bold text-[#ccc] group-hover/log:text-white transition-colors">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#555]">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
