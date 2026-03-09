import { motion } from "framer-motion";
import {
  MapPin,
  Navigation,
  Users,
  Zap,
  Radio,
  Coffee,
  Lock,
  Wifi,
  Mic,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Activity,
  Terminal,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

// --- MOCK LIVE HUB DATA ---
const localHub = {
  id: "hub-jaipur-01",
  name: "Discotive Hub: Jaipur",
  status: "High Energy",
  capacity: 82,
  distance: "3.2 km away",
  activeBuilders: 41,
  vcScouts: 2,
  amenities: [
    "Gigabit Protocol",
    "Podcast Studio",
    "War Rooms",
    "Caffeine Line",
  ],
  liveActivity:
    "3 pods currently executing sprints for the Smart India Hackathon.",
};

const networkHubs = [
  {
    id: "hub-blr-01",
    city: "Bangalore",
    area: "Indiranagar",
    status: "Waitlisted",
    capacity: 100,
  },
  {
    id: "hub-del-01",
    city: "Delhi NCR",
    area: "Gurugram",
    status: "Open",
    capacity: 45,
  },
  {
    id: "hub-pun-01",
    city: "Pune",
    area: "Koregaon Park",
    status: "Open",
    capacity: 60,
  },
];

const Hubs = () => {
  const { loading } = useUserData();

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
              <MapPin className="w-4 h-4" /> Physical Infrastructure
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
            >
              Deployment Zones.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#888] font-medium text-lg md:text-xl tracking-tight max-w-2xl"
            >
              Live workspaces engineered for high-velocity cohort execution.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 bg-[#0a0a0a] border border-[#333] text-white px-8 py-4 rounded-full font-extrabold text-sm hover:bg-[#111] hover:border-[#555] transition-colors shadow-2xl shrink-0 group"
          >
            <Navigation className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />{" "}
            View Global Map
          </motion.button>
        </div>

        {/* --- HERO: LOCAL LIVE HUB (JAIPUR) --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative bg-[#0a0a0a] border border-[#222] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row"
        >
          {/* Subtle Radar Ping Background */}
          <div className="absolute -left-32 -top-32 w-96 h-96 border border-[#222] rounded-full opacity-20 pointer-events-none" />
          <div className="absolute -left-48 -top-48 w-[500px] h-[500px] border border-[#111] rounded-full opacity-20 pointer-events-none animate-[spin_10s_linear_infinite]" />

          {/* Left: Hub Live Stats */}
          <div className="p-8 md:p-12 flex-1 relative z-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#222]">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="px-3 py-1.5 rounded-full bg-[#030303] border border-red-500/30 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                  </span>
                  <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-[0.2em]">
                    Live Pulse
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-[#666] flex items-center gap-1.5 bg-[#050505] px-3 py-1.5 rounded border border-[#111]">
                  <Navigation className="w-3.5 h-3.5" /> {localHub.distance}
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter mb-4">
                {localHub.name}
              </h2>
              <div className="flex items-start gap-3 mb-10">
                <Terminal className="w-5 h-5 text-[#444] shrink-0 mt-0.5" />
                <p className="text-[#888] font-medium text-sm md:text-base leading-relaxed max-w-lg">
                  {localHub.liveActivity}
                </p>
              </div>

              {/* Brutalist Live Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-[#888]" /> Load
                  </p>
                  <p className="text-3xl font-extrabold text-white tracking-tighter">
                    {localHub.capacity}
                    <span className="text-xl text-[#666]">%</span>
                  </p>
                </div>
                <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hover:border-[#444] transition-colors">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-[#888]" /> Builders
                  </p>
                  <p className="text-3xl font-extrabold text-white tracking-tighter">
                    {localHub.activeBuilders}
                  </p>
                </div>
                <div className="bg-[#050505] border border-[#222] rounded-2xl p-5 hidden md:block hover:border-green-500/30 transition-colors group">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5 group-hover:text-green-500 transition-colors">
                    <ShieldCheck className="w-3 h-3 text-[#888] group-hover:text-green-500" />{" "}
                    Scouts
                  </p>
                  <p className="text-3xl font-extrabold text-white tracking-tighter group-hover:text-green-400">
                    {localHub.vcScouts}
                  </p>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-2 bg-[#050505] border border-[#222] rounded text-[10px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" /> {localHub.amenities[0]}
                </span>
                <span className="px-3 py-2 bg-[#050505] border border-[#222] rounded text-[10px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" /> {localHub.amenities[1]}
                </span>
                <span className="px-3 py-2 bg-[#050505] border border-[#222] rounded text-[10px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5" /> {localHub.amenities[3]}
                </span>
              </div>
            </div>
          </div>

          {/* Right: The Booking Engine (Monetization Hook) */}
          <div className="w-full lg:w-[400px] bg-[#050505] p-8 md:p-12 flex flex-col justify-center relative z-10">
            <h3 className="text-xs font-bold text-[#888] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <Radio className="w-4 h-4 text-white" /> Access Protocol
            </h3>

            <div className="space-y-4">
              <button className="w-full bg-white text-black font-extrabold text-sm px-6 py-5 rounded-full flex items-center justify-between hover:bg-[#ccc] transition-colors group">
                <span>Book Deployment (₹499)</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button className="w-full bg-[#0a0a0a] text-white border border-[#333] font-bold text-sm px-6 py-5 rounded-full flex items-center justify-between hover:border-[#555] transition-colors group">
                <span>Engage Premium Pass</span>
                <span className="text-[10px] font-mono bg-[#222] px-2 py-1 rounded text-[#888]">
                  1 AVAIL
                </span>
              </button>

              <div className="pt-6 border-t border-[#222] mt-6">
                <button className="w-full flex items-center justify-between bg-transparent border border-amber-500/30 text-amber-500 px-6 py-4 rounded-2xl font-bold text-sm hover:bg-amber-500/10 hover:border-amber-500/50 transition-colors group">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-sm tracking-tight mb-0.5">
                        VIP Founder Intro
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-amber-500/60 block">
                        Ping Hub Manager
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            <p className="text-center text-[10px] font-mono text-[#444] mt-8 uppercase tracking-[0.2em]">
              Operating 24/7 • Secure
            </p>
          </div>
        </motion.div>

        {/* --- GRID: NETWORK EXPANSION --- */}
        <div className="pt-8">
          <div className="flex items-center justify-between mb-8 border-b border-[#222] pb-6">
            <h3 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Global Network{" "}
              <span className="text-xs font-mono text-[#666] bg-[#111] px-3 py-1 rounded-full border border-[#222]">
                3 HUBS
              </span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {networkHubs.map((hub, idx) => (
              <motion.div
                key={hub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#444] transition-all cursor-pointer group flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="font-extrabold text-white text-xl tracking-tight mb-1 group-hover:text-white transition-colors">
                      {hub.city}
                    </h4>
                    <p className="text-xs font-mono text-[#666]">{hub.area}</p>
                  </div>
                  {/* Brutalist Status Badge */}
                  <div
                    className={cn(
                      "px-2.5 py-1.5 rounded border text-[9px] font-extrabold uppercase tracking-[0.2em]",
                      hub.status === "Open"
                        ? "bg-[#030303] text-green-500 border-green-500/30"
                        : "bg-[#030303] text-amber-500 border-amber-500/30",
                    )}
                  >
                    {hub.status}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-[#222] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[#888] uppercase tracking-[0.2em]">
                    <Activity className="w-3.5 h-3.5 text-[#444]" /> Load:{" "}
                    {hub.capacity}%
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

export default Hubs;
