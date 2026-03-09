import { motion } from "framer-motion";
import {
  ShieldCheck,
  MapPin,
  Terminal,
  Briefcase,
  Zap,
  Target,
  Crosshair,
  GitCommit,
  Share2,
  Copy,
  ExternalLink,
  Award,
  Camera,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../components/ui/BentoCard";

const Profile = () => {
  const { userData, loading } = useUserData();

  // Simulated Authentic Data based on your profile
  const firstName = userData?.identity?.firstName || "Keshav";
  const lastName = userData?.identity?.lastName || "Bansal";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = "KB";

  const institution = userData?.baseline?.institution || "JECRC Foundation";
  const course = userData?.baseline?.course || "B.Tech CSE (Section D)";
  const year = userData?.baseline?.year || "1st Year";

  const primaryRole = "Founder & Systems Architect";
  const secondaryRole = "Technical BD Intern @ RG Consultancy";
  const score = userData?.discotiveScore || 742;

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-12">
        {/* --- TOP ACTIONS --- */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-green-500/30 bg-[#050505]">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-[10px] font-extrabold text-green-500 uppercase tracking-[0.2em]">
              Level 3 Clearance • Verified
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-6 py-3 bg-[#0a0a0a] border border-[#333] text-white font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black hover:border-white transition-colors group">
              <Copy className="w-4 h-4" /> Copy ID
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-white text-black font-extrabold text-xs uppercase tracking-widest hover:bg-[#ccc] transition-colors">
              <Share2 className="w-4 h-4" /> Share Dossier
            </button>
          </div>
        </div>

        {/* --- HERO: THE IDENTITY CARD --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row gap-10 items-center md:items-start group hover:border-[#444] transition-colors"
        >
          {/* Avatar Base */}
          <div className="relative shrink-0">
            <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-[#030303] border-4 border-[#222] flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 relative group-hover:border-white group-hover:bg-white group-hover:text-black transition-all duration-500">
              <span className="text-5xl md:text-6xl font-extrabold tracking-tighter">
                {initials}
              </span>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-extrabold uppercase tracking-[0.2em] px-5 py-2 rounded-full border-4 border-[#0a0a0a] whitespace-nowrap z-20">
              Top 1% Builder
            </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 text-center md:text-left z-10 w-full mt-4 md:mt-0 flex flex-col justify-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tighter mb-4 leading-none">
              {fullName}
            </h1>

            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-sm font-bold text-[#888] mb-8">
              <span className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#555]" /> {primaryRole}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#555]" /> Jaipur, India
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Momentum
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tighter">
                  {score}
                </p>
              </div>
              <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-blue-500" /> Global Rank
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tighter">
                  #421
                </p>
              </div>
              <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors hidden md:block">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-green-500" /> Vault
                  Nodes
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tighter">
                  14
                </p>
              </div>
              <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors hidden md:block">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-purple-500" /> Startups
                </p>
                <p className="text-2xl font-extrabold text-white tracking-tighter">
                  2
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- BOTTOM GRID: VISION & BASELINE --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Baseline & Domains (Left Column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-8"
          >
            <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 md:p-10 hover:border-[#333] transition-colors h-full flex flex-col">
              <h3 className="text-xs font-bold text-[#888] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white" /> Execution Baseline
              </h3>

              <div className="space-y-6 flex-1">
                <div className="p-6 bg-[#050505] rounded-2xl border border-[#222] group hover:border-[#444] transition-colors">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                    Current Institution
                  </p>
                  <p className="font-extrabold text-white text-xl tracking-tight mb-1">
                    {institution}
                  </p>
                  <p className="text-xs font-mono text-[#888]">
                    {course} • {year}
                  </p>
                </div>

                <div className="p-6 bg-[#050505] rounded-2xl border border-[#222] group hover:border-[#444] transition-colors">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                    Active Deployment
                  </p>
                  <p className="font-extrabold text-white text-lg tracking-tight mb-1">
                    {secondaryRole}
                  </p>
                  <p className="text-xs font-mono text-[#888]">
                    Technical Stack • B2B Protocol
                  </p>
                </div>

                <div className="pt-4">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4">
                    Core Competencies
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "React.js",
                      "Firebase",
                      "UI/UX Systems",
                      "AI Workflows",
                      "Cinematic Filmmaking",
                    ].map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-xs font-bold text-[#ccc] hover:bg-white hover:text-black hover:border-white transition-colors cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* The Ledger & Vision (Right Column) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-8"
          >
            <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 md:p-10 hover:border-[#333] transition-colors h-full flex flex-col">
              <h3 className="text-xs font-bold text-[#888] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-white" /> Immutable Ledger
              </h3>

              <div className="space-y-8 flex-1">
                <div className="relative pl-6 border-l-2 border-[#222]">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050505] border-2 border-[#444]" />
                  <p className="text-[10px] font-mono text-[#666] mb-1">
                    Mar 2026
                  </p>
                  <p className="font-bold text-white text-lg tracking-tight mb-1">
                    Architecting Discotive Core
                  </p>
                  <p className="text-sm text-[#888] leading-relaxed">
                    Building the OS for the next generation of founders and
                    builders. Heavy focus on brutalist UI and Firebase
                    architecture.
                  </p>
                </div>

                <div className="relative pl-6 border-l-2 border-[#222]">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050505] border-2 border-[#444]" />
                  <p className="text-[10px] font-mono text-[#666] mb-1">
                    Feb 2026
                  </p>
                  <p className="font-bold text-white text-lg tracking-tight mb-1">
                    RG Consultancy Deployment
                  </p>
                  <p className="text-sm text-[#888] leading-relaxed">
                    Cleared technical rounds and commenced BD infrastructure
                    tasks.
                  </p>
                </div>

                <div className="relative pl-6 border-l-2 border-transparent">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#050505] border-2 border-[#444]" />
                  <p className="text-[10px] font-mono text-[#666] mb-1">
                    Oct 2025
                  </p>
                  <p className="font-bold text-white text-lg tracking-tight mb-1 flex items-center gap-2">
                    Smart India Hackathon{" "}
                    <Award className="w-4 h-4 text-amber-500" />
                  </p>
                  <p className="text-sm text-[#888] leading-relaxed">
                    Ranked 6th out of 250+ teams alongside senior cohort.
                    Executed 36-hour continuous sprint.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
