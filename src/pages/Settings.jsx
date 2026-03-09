import { useState } from "react";
import { motion } from "framer-motion";
import {
  Terminal,
  Shield,
  Bell,
  Link2,
  Monitor,
  Smartphone,
  Github,
  Figma,
  Trash2,
  Zap,
  Radio,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// --- BRUTALIST TERMINAL TOGGLE ---
const TerminalToggle = ({ active, onClick, label, desc }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-[#222] last:border-0 gap-4 group">
    <div>
      <p className="font-bold text-white text-sm mb-1">{label}</p>
      <p className="text-xs text-[#666] font-medium">{desc}</p>
    </div>
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.2em] transition-all duration-300 w-32 shrink-0 text-center border",
        active
          ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          : "bg-transparent text-[#666] border-[#333] hover:border-[#666] hover:text-white",
      )}
    >
      {active ? "Active" : "Offline"}
    </button>
  </div>
);

const Settings = () => {
  const [toggles, setToggles] = useState({
    cohortPulse: true,
    dailyDigest: false,
    publicDossier: true,
    radarPing: true,
  });

  const handleToggle = (key) =>
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 relative z-10 pt-12 space-y-12">
        {/* --- HEADER --- */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-xs font-bold text-[#666] uppercase tracking-[0.3em] mb-4"
          >
            <Terminal className="w-4 h-4" /> System Configuration
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
          >
            OS Protocols.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#888] font-medium text-lg tracking-tight"
          >
            Manage your integrations, security, and algorithmic behavior.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN: Main Protocols List */}
          <div className="lg:col-span-2 space-y-8">
            {/* Section: Alert Protocols */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] overflow-hidden hover:border-[#333] transition-colors"
            >
              <div className="p-8 border-b border-[#222] bg-[#050505] flex items-center gap-3">
                <Bell className="w-5 h-5 text-white" />
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  Telemetry & Alerts
                </h2>
              </div>
              <div className="px-8 py-2">
                <TerminalToggle
                  label="Cohort Pulse Notifications"
                  desc="Receive live updates on your immediate network's execution velocity."
                  active={toggles.cohortPulse}
                  onClick={() => handleToggle("cohortPulse")}
                />
                <TerminalToggle
                  label="Algorithmic Daily Digest"
                  desc="Daily terminal readout of missed opportunities and required gap bridges."
                  active={toggles.dailyDigest}
                  onClick={() => handleToggle("dailyDigest")}
                />
                <TerminalToggle
                  label="Physical Radar Ping"
                  desc="Broadcast your status when entering a Discotive Career Hub."
                  active={toggles.radarPing}
                  onClick={() => handleToggle("radarPing")}
                />
              </div>
            </motion.div>

            {/* Section: External Nodes (Integrations) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] overflow-hidden hover:border-[#333] transition-colors"
            >
              <div className="p-8 border-b border-[#222] bg-[#050505] flex items-center gap-3">
                <Link2 className="w-5 h-5 text-white" />
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  External Nodes
                </h2>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-[#050505] border border-[#222] rounded-2xl gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                      <Github className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">
                        GitHub Ecosystem
                      </p>
                      <p className="text-xs font-mono text-green-500 mt-1">
                        Status: SYNCHRONIZED
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-[#666] hover:text-white border border-[#333] hover:border-[#666] px-4 py-2.5 rounded-lg transition-colors w-full sm:w-auto text-center">
                    Sever Node
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-[#050505] border border-[#222] rounded-2xl gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-[#111] border border-[#333] text-white flex items-center justify-center shrink-0">
                      <Figma className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">
                        Figma Workspaces
                      </p>
                      <p className="text-xs font-mono text-[#666] mt-1">
                        Status: OFFLINE
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-bold bg-white text-black px-6 py-2.5 rounded-lg hover:bg-[#ccc] transition-colors w-full sm:w-auto text-center">
                    Initialize Sync
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Section: Security */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] overflow-hidden hover:border-[#333] transition-colors"
            >
              <div className="p-8 border-b border-[#222] bg-[#050505] flex items-center gap-3">
                <Shield className="w-5 h-5 text-white" />
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  Security & Access
                </h2>
              </div>
              <div className="px-8 py-2 border-b border-[#222]">
                <TerminalToggle
                  label="Public Dossier Access"
                  desc="Allow verified VC scouts and recruiters to view your proof of work."
                  active={toggles.publicDossier}
                  onClick={() => handleToggle("publicDossier")}
                />
              </div>
              <div className="p-8 flex flex-col sm:flex-row gap-4">
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#111] border border-[#333] rounded-xl text-xs font-extrabold uppercase tracking-widest text-white hover:bg-white hover:text-black hover:border-white transition-colors">
                  Rotate Keys
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#030303] border border-red-500/30 rounded-xl text-xs font-extrabold uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                  <Trash2 className="w-4 h-4" /> Terminate Instance
                </button>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: System Status & Pro */}
          <div className="space-y-8">
            {/* PRO PLAN UPSELL */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-[#0a0a0a] border border-amber-500/30 rounded-[2rem] p-8 relative overflow-hidden group hover:border-amber-500/60 transition-colors"
            >
              <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-colors" />

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  Discotive Pro Protocol
                </h2>
              </div>

              <p className="text-sm text-[#888] leading-relaxed mb-8 relative z-10 font-medium">
                Current clearance level:{" "}
                <strong className="text-white">Alpha Base</strong>. Upgrade to
                unlock Predictive AI Routing and VIP Career Hub Access.
              </p>

              <button className="w-full bg-amber-500 text-black font-extrabold text-sm px-6 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors relative z-10 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                Upgrade System Limits
              </button>
            </motion.div>

            {/* ACTIVE SESSIONS */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 hover:border-[#333] transition-colors"
            >
              <h2 className="text-sm font-bold text-[#888] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                <Monitor className="w-4 h-4 text-white" /> Active Instances
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#111] border border-[#333] rounded-xl shrink-0">
                    <Monitor className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">
                      Windows PC • Chrome
                    </p>
                    <p className="text-[10px] text-green-500 font-extrabold tracking-[0.2em] uppercase flex items-center gap-1.5">
                      <Radio className="w-3 h-3" /> Current Session
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 opacity-50">
                  <div className="p-3 bg-[#050505] border border-[#222] rounded-xl shrink-0">
                    <Smartphone className="w-5 h-5 text-[#888]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">
                      iPhone 14 • Safari
                    </p>
                    <p className="text-[10px] text-[#666] font-mono uppercase tracking-widest">
                      Jaipur • 2 hrs ago
                    </p>
                  </div>
                </div>
              </div>
              <button className="w-full mt-8 pt-6 border-t border-[#222] text-[10px] font-extrabold text-[#666] uppercase tracking-[0.2em] hover:text-white transition-colors">
                Kill All Remote Sessions
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
