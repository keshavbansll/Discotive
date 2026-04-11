import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  Crown,
  Edit3,
  Share2,
  Check,
  Download,
  ShieldCheck,
  MapPin,
  Award,
  Hash,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/cn";

export const ProfileHeader = ({
  userData,
  onAvatarUpload,
  isUploadingAvatar,
  onExportDCI,
  isExporting,
  onCopyLink,
  copied,
}) => {
  const score = userData?.discotiveScore?.current ?? 0;
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const xp = score % 1000;
  const levelPct = (xp / 1000) * 100;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "?";
  const fullName =
    `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 md:p-7 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#BFA264]/[0.04] to-transparent pointer-events-none" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
        {/* Avatar */}
        <div className="relative shrink-0 group">
          <label
            className={cn(
              "relative flex w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] bg-[#111] border items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden cursor-pointer transition-all",
              isUploadingAvatar
                ? "opacity-50 pointer-events-none border-[#222]"
                : "border-[#222] hover:border-[#BFA264]/50",
            )}
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onAvatarUpload}
              disabled={isUploadingAvatar}
            />
            {userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-[#BFA264] animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </label>
          {isPro && (
            <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-[#030303] flex items-center justify-center z-10 pointer-events-none">
              <Crown className="w-3 h-3 text-black" />
            </div>
          )}
        </div>

        {/* Identity */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              {fullName}
            </h2>
            <span className="px-2.5 py-1 bg-[#111] border border-[#222] rounded-lg text-[10px] font-mono text-[#666]">
              @{userData?.identity?.username || "—"}
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase tracking-widest">
              <ShieldCheck className="w-2.5 h-2.5" /> Verified
            </span>
          </div>
          <p className="text-sm text-[#666] mb-2.5">
            {userData?.identity?.domain ||
              userData?.vision?.passion ||
              "Undeclared"}
            {(userData?.identity?.niche || userData?.vision?.niche) && (
              <span className="text-[#444]">
                {" "}
                · {userData?.identity?.niche || userData?.vision?.niche}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#555] uppercase tracking-widest mb-3">
            {(userData?.footprint?.location || userData?.identity?.country) && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" />
                {userData?.footprint?.location || userData?.identity?.country}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Award className="w-3 h-3 text-[#BFA264]/60" />
              Level {level}
            </span>
            <span className="flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-violet-400/50" />#
              {userData?.discotiveId || "—"}
            </span>
          </div>
          {/* XP bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-[220px] h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelPct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#8B7240] to-[#D4AF78] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.5)]"
              />
            </div>
            <span className="text-[9px] text-[#444] font-mono">
              {(score % 1000).toLocaleString()} / 1000 → Lv{" "}
              {Math.min(level + 1, 10)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-row sm:flex-col items-center gap-2 shrink-0">
          <button
            onClick={onExportDCI}
            disabled={isExporting}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#BFA264]/8 border border-[#BFA264]/25 text-[#BFA264] text-[10px] font-black rounded-xl hover:bg-[#BFA264]/15 disabled:opacity-40 transition-all uppercase tracking-widest"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:block">
              {isExporting ? "Compiling…" : "Export"}
            </span>
          </button>
          <button
            onClick={onCopyLink}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#333] text-[10px] font-black text-[#666] hover:text-white rounded-xl transition-all uppercase tracking-widest"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:block">
              {copied ? "Copied!" : "Share"}
            </span>
          </button>
          <Link
            to="/app/profile/edit"
            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black rounded-xl hover:bg-[#ddd] transition-colors uppercase tracking-widest"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Edit</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
