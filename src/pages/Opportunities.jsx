import { motion } from "framer-motion";
import {
  Briefcase,
  Crosshair,
  Building2,
  MapPin,
  DollarSign,
  ArrowRight,
  Lock,
  Target,
  Zap,
  Activity,
  Terminal,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

// --- MOCK AI OPPORTUNITIES DATA ---
const topMatch = {
  role: "Founding Engineer Intern",
  company: "HyperScale Analytics",
  location: "Remote / Async",
  stipend: "$2,000/mo",
  matchScore: 88,
  analysis:
    "Your recent execution velocity in React and Firebase architecture strongly aligns with their Q3 MVP roadmap.",
  gap: "Requires fundamental execution proof in Next.js SSR.",
};

const openOpportunities = [
  {
    id: "op1",
    role: "Frontend Architecture",
    company: "Stripe",
    location: "Remote",
    stipend: "$3,500/mo",
    match: 74,
    tags: ["React", "UI/UX", "API"],
  },
  {
    id: "op2",
    role: "Technical Product Intern",
    company: "RG Ventures",
    location: "Jaipur, IN",
    stipend: "₹25,000/mo",
    match: 81,
    tags: ["Strategy", "Firebase", "Management"],
  },
  {
    id: "op3",
    role: "Fullstack Protocol Dev",
    company: "Vercel",
    location: "Remote",
    stipend: "$4,000/mo",
    match: 62,
    tags: ["Next.js", "Node", "DB"],
  },
  {
    id: "op4",
    role: "UI/UX Systems Designer",
    company: "Discord",
    location: "Remote",
    stipend: "$2,800/mo",
    match: 55,
    tags: ["Figma", "Design Systems", "Dark Mode"],
  },
];

const Opportunities = () => {
  const { userData } = useUserData();

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      {/* Pure Void Texture (No Grid) */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-16">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4"
            >
              <Crosshair className="w-4 h-4" /> Algorithmic Matchmaking
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
            >
              Predictive Routing.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#888] font-medium text-lg md:text-xl tracking-tight max-w-2xl"
            >
              High-leverage deployments curated directly from your execution
              ledger.
            </motion.p>
          </div>
        </div>

        {/* --- HERO: TOP AI MATCH --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-[#0a0a0a] border border-[#333] rounded-[2rem] p-8 md:p-12 shadow-2xl group"
        >
          <div className="flex flex-col lg:flex-row gap-12 relative z-10">
            {/* Left: Role Details */}
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-2 inline-flex bg-white text-black px-4 py-2 rounded-full mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-[0.2em]">
                  Primary Target Acquired
                </span>
              </div>

              <div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-4">
                  {topMatch.role}
                </h2>
                <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-[#888]">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#555]" />{" "}
                    {topMatch.company}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#555]" />{" "}
                    {topMatch.location}
                  </span>
                  <span className="flex items-center gap-2 text-green-500">
                    <DollarSign className="w-4 h-4" /> {topMatch.stipend}
                  </span>
                </div>
              </div>

              <div className="bg-[#050505] border border-[#222] rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#333]" />
                <div className="flex items-start gap-4 mb-6">
                  <Activity className="w-5 h-5 text-[#666] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                      Ledger Analysis
                    </p>
                    <p className="text-sm text-[#ccc] leading-relaxed font-medium">
                      {topMatch.analysis}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pt-6 border-t border-[#111]">
                  <Terminal className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-[0.2em] mb-2">
                      Execution Gap Identified
                    </p>
                    <p className="text-sm font-bold text-white">
                      {topMatch.gap}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: The Hook & Action */}
            <div className="w-full lg:w-96 flex flex-col justify-center space-y-6 bg-[#030303] border border-[#222] rounded-[2rem] p-8 md:p-10 shrink-0 relative overflow-hidden">
              <div className="text-center relative z-10 mb-4">
                <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                  Alignment Probability
                </p>
                <div className="text-7xl font-extrabold text-white tracking-tighter flex items-center justify-center gap-1">
                  {topMatch.matchScore}
                  <span className="text-4xl text-[#444]">%</span>
                </div>
              </div>

              <div className="space-y-4 relative z-10 mt-auto">
                <button className="w-full flex items-center justify-center gap-3 bg-white text-black px-4 py-4 rounded-full font-extrabold text-sm hover:bg-[#ccc] transition-colors">
                  Initiate Protocol <ArrowRight className="w-4 h-4" />
                </button>

                {/* Premium Upsell */}
                <button className="w-full flex items-center justify-between bg-transparent border border-amber-500/30 text-amber-500 px-6 py-4 rounded-full font-bold text-sm hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors group">
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Auto-Bridge Gap
                  </span>
                  <Lock className="w-4 h-4 text-amber-600 group-hover:text-amber-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- GRID: ALL OPPORTUNITIES --- */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-8 border-b border-[#222] pb-6">
            <h3 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Global Ledger{" "}
              <span className="text-xs font-mono text-[#666] bg-[#111] px-3 py-1 rounded-full border border-[#222]">
                4 ACTIVE
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {openOpportunities.map((job, idx) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#444] transition-all cursor-pointer group flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-extrabold text-white text-xl tracking-tight mb-2 group-hover:text-white transition-colors">
                      {job.role}
                    </h4>
                    <p className="text-sm font-bold text-[#888] flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#555]" />{" "}
                      {job.company}
                    </p>
                  </div>
                  {/* Brutalist Match Badge */}
                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 border tracking-[0.1em]",
                      job.match >= 80
                        ? "bg-[#030303] text-green-500 border-green-500/30"
                        : job.match >= 60
                          ? "bg-[#030303] text-amber-500 border-amber-500/30"
                          : "bg-[#030303] text-[#666] border-[#222]",
                    )}
                  >
                    {job.match}% MATCH
                  </div>
                </div>

                <div className="flex items-center gap-5 text-xs font-bold text-[#666] mb-8 font-mono">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#444]" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1.5 text-white">
                    <DollarSign className="w-4 h-4 text-[#444]" /> {job.stipend}
                  </span>
                </div>

                <div className="mt-auto pt-6 border-t border-[#222] flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    {job.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-bold text-[#888] uppercase tracking-[0.2em] bg-[#030303] px-2.5 py-1.5 rounded-lg border border-[#222]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="w-10 h-10 rounded-full border border-[#333] flex items-center justify-center group-hover:bg-white group-hover:text-black group-hover:border-white transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Opportunities;
