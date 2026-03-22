import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUserData } from "../hooks/useUserData";
import {
  MapPin,
  Terminal,
  Briefcase,
  Copy,
  ExternalLink,
  Award,
  Activity,
  Edit3,
  Check,
  GraduationCap,
  Link2,
  Github,
  Twitter,
  Linkedin,
  ShieldCheck,
  FolderLock,
  Users,
  Globe,
  Zap,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

const Profile = () => {
  const { userData, loading } = useUserData();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "default") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyId = () => {
    if (userData?.id) {
      navigator.clipboard.writeText(userData.id);
      showToast("Discotive ID copied to clipboard", "green");
    }
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#444] animate-spin" />
      </div>
    );
  }

  const level = Math.min(
    Math.floor((userData.discotiveScore || 0) / 1000) + 1,
    10,
  );
  const initials = `${userData.identity?.firstName?.charAt(0) || ""}${userData.identity?.lastName?.charAt(0) || ""}`;

  return (
    <div className="bg-[#030303] min-h-screen w-full overflow-x-hidden text-white selection:bg-white selection:text-black pb-24 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="max-w-[1000px] mx-auto px-4 md:px-8 relative z-10 pt-8 md:pt-12 space-y-6 md:space-y-8">
        {/* --- HEADER CONTROLS --- */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Operator Profile
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyId}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#111] border border-[#222] hover:border-[#444] rounded-lg text-[10px] md:text-xs font-mono text-[#888] hover:text-white transition-all group"
            >
              <span className="truncate max-w-[100px] md:max-w-none">
                {userData.id}
              </span>
              <Copy className="w-3 h-3 group-hover:scale-110 transition-transform" />
            </button>
            <Link
              to="/app/profile/edit"
              className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-extrabold rounded-lg hover:bg-[#ccc] transition-colors uppercase tracking-widest"
            >
              <Edit3 className="w-4 h-4" /> Edit Protocol
            </Link>
          </div>
        </div>

        {/* --- HERO IDENTITY CARD --- */}
        <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8 relative">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-3xl md:text-4xl font-extrabold text-[#666] shrink-0 shadow-xl">
              {initials}
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
                  {userData.identity?.firstName} {userData.identity?.lastName}
                </h2>
                <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-[#111] border border-[#333] rounded-md text-[10px] font-mono text-[#888]">
                  @{userData.identity?.username}
                </span>
              </div>
              <p className="text-sm md:text-lg font-bold text-[#888] mb-4">
                {userData.vision?.passion || "Undeclared Domain"} •{" "}
                {userData.vision?.niche || "Unspecified Niche"}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-6 text-[10px] md:text-xs font-bold uppercase tracking-widest text-[#666]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />{" "}
                  {userData.footprint?.location || "Unmapped"}
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Account
                  Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* --- METRICS ROW --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-5 rounded-xl md:rounded-2xl">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Clearance Level
            </p>
            <p className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-500" /> {level}
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-5 rounded-xl md:rounded-2xl">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Discotive Score
            </p>
            <p className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />{" "}
              {userData.discotiveScore || 0}
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-5 rounded-xl md:rounded-2xl">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Active Allies
            </p>
            <p className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />{" "}
              {userData.allies?.length || 0}
            </p>
          </div>
          <div className="bg-[#0a0a0a] border border-[#222] p-4 md:p-5 rounded-xl md:rounded-2xl">
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
              Secured Assets
            </p>
            <p className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <FolderLock className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> [
              LIVE ]
            </p>
          </div>
        </div>

        {/* --- TWO COLUMN LAYOUT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8">
              <h3 className="text-xs md:text-sm font-bold text-[#666] uppercase tracking-widest flex items-center gap-2 mb-4 md:mb-6">
                <Terminal className="w-4 h-4" /> Operator Bio
              </h3>
              <p className="text-sm md:text-base text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {userData.footprint?.bio ||
                  "No biography provided. Update your protocol."}
              </p>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8">
              <h3 className="text-xs md:text-sm font-bold text-[#666] uppercase tracking-widest flex items-center gap-2 mb-4 md:mb-6">
                <Briefcase className="w-4 h-4" /> Academic Baseline
              </h3>
              <div className="flex gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#111] border border-[#333] flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-[#888]" />
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-extrabold text-white">
                    {userData.baseline?.institution ||
                      "Unspecified Institution"}
                  </h4>
                  <p className="text-xs md:text-sm font-medium text-[#888] mt-0.5">
                    {userData.baseline?.degree || "Unspecified Degree"}
                  </p>
                  <p className="text-[10px] md:text-xs font-mono text-[#555] mt-2 tracking-widest">
                    CLASS OF {userData.baseline?.gradYear || "----"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8">
              <h3 className="text-xs md:text-sm font-bold text-[#666] uppercase tracking-widest flex items-center gap-2 mb-4 md:mb-6">
                <Zap className="w-4 h-4" /> Core Arsenal (Skills)
              </h3>
              <div className="flex flex-wrap gap-2">
                {userData.skills?.alignedSkills?.map((skill, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-[#111] border border-[#333] rounded-lg text-xs font-bold text-[#ccc]"
                  >
                    {skill}
                  </span>
                )) || (
                  <span className="text-sm text-[#555] font-mono">
                    [ No skills deployed ]
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-1 space-y-6 md:space-y-8">
            <div className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-6 md:p-8">
              <h3 className="text-xs md:text-sm font-bold text-[#666] uppercase tracking-widest flex items-center gap-2 mb-4 md:mb-6">
                <Link2 className="w-4 h-4" /> Digital Footprint
              </h3>
              <div className="space-y-3">
                <a
                  href={userData.links?.github || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-colors",
                    userData.links?.github
                      ? "bg-[#111] border-[#333] hover:border-white text-white"
                      : "bg-[#050505] border-[#222] text-[#444] pointer-events-none",
                  )}
                >
                  <Github className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span className="text-xs md:text-sm font-medium truncate">
                    {userData.links?.github ? "GitHub Profile" : "Not Linked"}
                  </span>
                  {userData.links?.github && (
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  )}
                </a>
                <a
                  href={userData.links?.linkedin || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-colors",
                    userData.links?.linkedin
                      ? "bg-[#111] border-[#333] hover:border-[#0a66c2] hover:text-[#0a66c2] text-white"
                      : "bg-[#050505] border-[#222] text-[#444] pointer-events-none",
                  )}
                >
                  <Linkedin className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span className="text-xs md:text-sm font-medium truncate">
                    {userData.links?.linkedin
                      ? "LinkedIn Profile"
                      : "Not Linked"}
                  </span>
                  {userData.links?.linkedin && (
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  )}
                </a>
                <a
                  href={userData.links?.twitter || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-colors",
                    userData.links?.twitter
                      ? "bg-[#111] border-[#333] hover:border-[#1da1f2] hover:text-[#1da1f2] text-white"
                      : "bg-[#050505] border-[#222] text-[#444] pointer-events-none",
                  )}
                >
                  <Twitter className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span className="text-xs md:text-sm font-medium truncate">
                    {userData.links?.twitter ? "X (Twitter)" : "Not Linked"}
                  </span>
                  {userData.links?.twitter && (
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  )}
                </a>
                <a
                  href={userData.links?.website || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-colors",
                    userData.links?.website
                      ? "bg-[#111] border-[#333] hover:border-white text-white"
                      : "bg-[#050505] border-[#222] text-[#444] pointer-events-none",
                  )}
                >
                  <Globe className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  <span className="text-xs md:text-sm font-medium truncate">
                    {userData.links?.website
                      ? "Personal Website"
                      : "Not Linked"}
                  </span>
                  {userData.links?.website && (
                    <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                  )}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- TOAST NOTIFICATION (Bottom Left) --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, x: -20 }}
            className={cn(
              "fixed bottom-6 md:bottom-8 left-4 md:left-8 z-[600] border px-4 md:px-5 py-2.5 md:py-3 rounded-xl shadow-2xl flex items-center gap-2.5",
              toast.type === "green"
                ? "bg-[#052e16] border-green-500/30 text-green-400"
                : "bg-[#111] border-[#333] text-white",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Activity className="w-4 h-4 text-[#888]" />
            )}
            <span className="text-[10px] md:text-xs font-mono uppercase tracking-widest">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
