import { useState } from "react";
import { motion } from "framer-motion";
import {
  FolderLock,
  UploadCloud,
  ShieldCheck,
  Github,
  Figma,
  Link2,
  FileText,
  ExternalLink,
  Plus,
  Activity,
  Search,
  Filter,
  Terminal,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

// --- SECURITY SCANNER EFFECT (No Grid) ---
const BackgroundScanner = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      initial={{ top: "-10%" }}
      animate={{ top: "110%" }}
      transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      className="absolute left-0 right-0 h-[1px] bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
    />
  </div>
);

// --- MOCK VAULT DATA ---
const vaultStats = {
  totalAssets: 14,
  verifiedProofs: 12,
  networkHits: 1842,
  moatStrength: 88,
};

const assets = [
  {
    id: "v1",
    title: "Discotive Core Engine",
    type: "github",
    date: "Synced 2 hrs ago",
    status: "Verified",
    tech: ["React", "Firebase", "OS"],
    size: "12.4 MB",
    hash: "0x8F2A...9C1",
  },
  {
    id: "v2",
    title: "Global Talent API",
    type: "link",
    date: "Synced yesterday",
    status: "Verified",
    tech: ["Node.js", "GraphQL"],
    size: "Live URL",
    hash: "0x4B1E...7D2",
  },
  {
    id: "v3",
    title: "Narcissus Screenplay Draft",
    type: "document",
    date: "Synced Mar 4",
    status: "Pending",
    tech: ["Creative", "Directing"],
    size: "1.2 MB",
    hash: "Scanning...",
  },
  {
    id: "v4",
    title: "SIH '25 Execution Deck",
    type: "figma",
    date: "Synced Feb 28",
    status: "Verified",
    tech: ["Strategy", "Pitch"],
    size: "24 Artboards",
    hash: "0x9A3C...2F8",
  },
];

// Fixed Icon Function: Passes the hover classes explicitly so it correctly inverts
const getIcon = (type) => {
  const baseClass =
    "w-6 h-6 text-white group-hover:text-black transition-colors duration-300";
  switch (type) {
    case "github":
      return <Github className={baseClass} />;
    case "figma":
      return <Figma className={baseClass} />;
    case "link":
      return <Link2 className={baseClass} />;
    case "document":
      return <FileText className={baseClass} />;
    default:
      return (
        <FileText className="w-6 h-6 text-[#666] group-hover:text-black transition-colors duration-300" />
      );
  }
};

const Vault = () => {
  const { loading } = useUserData();
  const [activeTab, setActiveTab] = useState("All Assets");

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      {/* Background Textures - Pure Void with just Noise and Scanner */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />
      <BackgroundScanner />

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-16">
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4"
            >
              <FolderLock className="w-4 h-4" /> 256-Bit Encrypted
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
            >
              Asset Vault.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#888] font-medium text-lg md:text-xl tracking-tight max-w-2xl"
            >
              Immutable proof of work. Sync your execution ledger.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-extrabold text-sm hover:bg-[#ccc] transition-colors shadow-[0_0_40px_rgba(255,255,255,0.15)] group shrink-0"
          >
            <UploadCloud className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />{" "}
            Sync New Asset
          </motion.button>
        </div>

        {/* --- TELEMETRY STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#444] transition-colors"
          >
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" /> Total Synced
            </p>
            <p className="text-5xl font-extrabold tracking-tighter text-white">
              {vaultStats.totalAssets}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-green-500/30 transition-colors group"
          >
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 group-hover:text-green-500 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" /> Network Verified
            </p>
            <p className="text-5xl font-extrabold tracking-tighter text-white group-hover:text-green-400 transition-colors">
              {vaultStats.verifiedProofs}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#444] transition-colors"
          >
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Ledger Hits
            </p>
            <p className="text-5xl font-extrabold tracking-tighter text-white">
              {vaultStats.networkHits}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white text-black rounded-[2rem] p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" /> Moat Strength
            </p>
            <div>
              <div className="flex items-baseline gap-2 mb-3">
                <p className="text-5xl font-extrabold tracking-tighter">
                  {vaultStats.moatStrength}
                </p>
                <span className="text-xl font-bold tracking-tight">%</span>
              </div>
              <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black"
                  style={{ width: `${vaultStats.moatStrength}%` }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- ASSET GRID & CONTROLS --- */}
        <div className="pt-8">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 border-b border-[#222] pb-6">
            <div className="flex gap-8 text-sm font-bold overflow-x-auto w-full md:w-auto custom-scrollbar pb-2 md:pb-0">
              {["All Assets", "Repositories", "Documents", "Prototypes"].map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-6 -mb-[25px] whitespace-nowrap transition-colors",
                      activeTab === tab
                        ? "text-white border-b-2 border-white"
                        : "text-[#666] hover:text-white",
                    )}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex items-center bg-[#0a0a0a] rounded-full px-4 py-2 border border-[#222] focus-within:border-[#555] transition-colors flex-1 md:w-64 group">
                <Search className="w-4 h-4 text-[#444] group-focus-within:text-white shrink-0" />
                <input
                  type="text"
                  placeholder="Query vault..."
                  className="w-full bg-transparent border-none outline-none text-sm px-3 text-white placeholder-[#444] font-medium"
                />
              </div>
              <button className="p-2.5 bg-[#0a0a0a] border border-[#222] rounded-full hover:bg-[#111] transition-colors">
                <Filter className="w-4 h-4 text-[#888]" />
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {/* Sync Placeholder */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="bg-transparent border-2 border-dashed border-[#222] rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#050505] hover:border-[#444] transition-all group min-h-[280px]"
            >
              <div className="w-16 h-16 rounded-full bg-[#0a0a0a] border border-[#222] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6 text-[#666] group-hover:text-white transition-colors" />
              </div>
              <p className="font-extrabold text-white text-lg mb-2 tracking-tight">
                Sync Proof of Work
              </p>
              <p className="text-sm text-[#666] font-medium">
                Connect Github, Figma, or raw URLs to expand your moat.
              </p>
            </motion.div>

            {/* Asset Cards */}
            {assets.map((asset, idx) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + idx * 0.1 }}
                className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#555] transition-all duration-300 group flex flex-col min-h-[280px] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8)] relative overflow-hidden"
              >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-[#030303] border border-[#222] flex items-center justify-center shadow-lg group-hover:bg-white transition-colors duration-300">
                    {getIcon(asset.type)}
                  </div>

                  {asset.status === "Verified" ? (
                    <div className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5 bg-[#030303] text-green-500 border border-[#222]">
                      <ShieldCheck className="w-3 h-3" /> Verified
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-full text-[9px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-1.5 bg-[#030303] text-amber-500 border border-[#222] animate-pulse">
                      <ShieldAlert className="w-3 h-3" /> Pending Scan
                    </div>
                  )}
                </div>

                {/* Core Info */}
                <div className="mb-6">
                  <h4 className="font-extrabold text-white text-xl tracking-tight group-hover:text-white transition-colors line-clamp-1 mb-2">
                    {asset.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs font-mono text-[#666]">
                    <span>{asset.date}</span>
                    <span className="w-1 h-1 rounded-full bg-[#333]" />
                    <span>{asset.size}</span>
                  </div>
                </div>

                {/* Bottom Section */}
                <div className="mt-auto pt-6 border-t border-[#222] flex flex-col gap-4">
                  <div className="flex gap-2 overflow-hidden">
                    {asset.tech.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-bold text-[#888] uppercase tracking-[0.2em] bg-[#030303] px-2.5 py-1.5 rounded-lg border border-[#222] whitespace-nowrap"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono text-[#444] bg-[#030303] px-2 py-1 rounded border border-[#111]">
                      {asset.hash}
                    </p>
                    <button className="w-10 h-10 shrink-0 rounded-full border border-[#333] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white hover:text-black hover:border-white transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
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

export default Vault;
