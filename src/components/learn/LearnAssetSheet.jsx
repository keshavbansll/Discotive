/**
 * @fileoverview LearnAssetSheet.jsx — Discotive Learn Detail Overlay v4.0
 * Full redesign: Dashboard-native, vault sync flow, dynamic URLs,
 * completion status management, premium gates.
 *
 * VAULT SYNC FLOW:
 * 1. User marks as completed manually
 * 2. "Sync to Vault" strips non-essential data
 * 3. Admin receives sanitized cert info to verify
 * 4. Score awarded ONLY after admin verification
 */

import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X,
  Play,
  ExternalLink,
  CheckCircle2,
  Clock,
  Zap,
  Lock,
  Crown,
  Award,
  FolderLock,
  Tag,
  AlertTriangle,
  ChevronRight,
  Shield,
  Edit3,
  Copy,
  Check,
  ArrowUpRight,
  Upload,
  Info,
  Loader2,
  Youtube,
} from "lucide-react";
import { TYPE_CONFIG, getYouTubeThumbnail } from "../../lib/discotiveLearn";
import {
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../../firebase";

const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── YouTube embed ────────────────────────────────────────────────────────────
const YouTubeEmbed = memo(({ youtubeId, onTrackProgress, item }) => {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!youtubeId || !onTrackProgress) return;
    const t = setInterval(() => {
      onTrackProgress(
        item.discotiveLearnId,
        Math.min(100, (item._playPct || 0) + 10),
        10,
      );
    }, 10000);
    return () => clearInterval(t);
  }, [youtubeId]);

  return (
    <div className="absolute inset-0" style={{ background: "#000" }}>
      <motion.iframe
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.6 }}
        onLoad={() => setLoaded(true)}
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
        title="Video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%" }}
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
});

// ─── Vault Sync Panel ─────────────────────────────────────────────────────────
const VaultSyncPanel = memo(({ item, uid, onClose, onSynced }) => {
  const [credId, setCredId] = useState("");
  const [certUrl, setCertUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSync = async () => {
    if (!credId.trim() && !certUrl.trim()) {
      setError("Please provide a certificate URL or credential ID.");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      // Add to vault with stripped data - only cert info remains
      const vaultEntry = {
        name: item.title,
        type: "Certificate",
        provider: item.provider || item.channelName || "",
        discotiveLearnId: item.discotiveLearnId,
        credentialId: credId.trim() || null,
        certificateUrl: certUrl.trim() || null,
        platform: item.platform || "",
        status: "PENDING",
        source: "learn_sync",
        syncedAt: serverTimestamp(),
        // Stripped fields: no description, tags, etc. — only what admin needs to verify
      };

      // Write to user vault subcollection
      await addDoc(collection(db, "users", uid, "verification_requests"), {
        payload: JSON.stringify({
          learnId: item.discotiveLearnId,
          credentialId: credId,
          certUrl,
        }),
        status: "PENDING",
        assetName: item.title,
        assetType: "learn_certificate",
        discotiveLearnId: item.discotiveLearnId,
        scoreReward: item.scoreReward || 0,
        createdAt: serverTimestamp(),
      });

      // Also update user vault array
      const { updateDoc, arrayUnion } = await import("firebase/firestore");
      await updateDoc(doc(db, "users", uid), {
        vault: arrayUnion({
          id: `vault_${Date.now()}`,
          name: item.title,
          type: "Certificate",
          discotiveLearnId: item.discotiveLearnId,
          provider: item.provider || "",
          status: "PENDING",
          credentialId: credId.trim() || null,
          certificateUrl: certUrl.trim() || null,
          uploadedAt: new Date().toISOString(),
        }),
      });

      setDone(true);
      setTimeout(() => {
        onSynced?.();
        onClose();
      }, 1800);
    } catch (e) {
      setError("Sync failed. Please try again.");
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: V.elevated,
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {done ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <CheckCircle2
            className="w-10 h-10 mb-2"
            style={{ color: "#4ADE80" }}
          />
          <p className="text-sm font-black text-white">Synced to Vault!</p>
          <p className="text-xs mt-1" style={{ color: T.dim }}>
            Admin will verify within 2–5 days.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-4 h-4" style={{ color: G.bright }} />
            <p className="text-sm font-black text-white">
              Sync Certificate to Vault
            </p>
          </div>
          <div
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
          >
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p
              className="text-[10px] leading-relaxed"
              style={{ color: "rgba(245,158,11,0.8)" }}
            >
              Syncing strips course details. Only your certificate info is sent
              for admin verification. Score rewarded only after admin approves —
              not automatically.
            </p>
          </div>

          <div>
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
              Certificate URL or Screenshot Link
            </label>
            <input
              value={certUrl}
              onChange={(e) => setCertUrl(e.target.value)}
              placeholder="https://coursera.org/verify/... or Google Drive link"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none"
              style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
              Credential / Certificate ID{" "}
              <span className="text-white/20">(if applicable)</span>
            </label>
            <input
              value={credId}
              onChange={(e) => setCredId(e.target.value)}
              placeholder="e.g. ABCD-1234-EFGH or certificate serial number"
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none"
              style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 p-2.5 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-[10px] text-red-400 font-bold">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: T.dim,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
                color: "#030303",
              }}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {syncing ? "Syncing..." : "Sync to Vault"}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
});

// ─── MAIN SHEET COMPONENT ─────────────────────────────────────────────────────
const LearnAssetSheet = ({
  item,
  completion,
  progress,
  onClose,
  onTrackProgress,
  onAddToPortfolio,
  userData,
  isPremium,
  isMobile,
  isAdmin,
  onAdminEdit,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVaultSync, setShowVaultSync] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manuallyCompleted, setManuallyCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  useEffect(() => {
    // Update URL for deep linking without navigation
    const original = window.location.pathname;
    if (item?.discotiveLearnId) {
      window.history.pushState({}, "", `/app/learn/${item.discotiveLearnId}`);
    }
    return () => window.history.pushState({}, "", original);
  }, [item?.discotiveLearnId]);

  if (!item) return null;

  const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;
  const isVerified = completion?.verified;
  const isPending = completion?.pending;
  const progressPct = progress?.progressPct || 0;
  const isVideo = item.type === "video" && item.youtubeId;
  const isCourse = item.type === "course";
  const uid = userData?.uid;

  const durationText = item.estimatedHours
    ? `${item.estimatedHours} Hours`
    : item.durationMinutes
      ? `${Math.floor(item.durationMinutes / 60) > 0 ? `${Math.floor(item.durationMinutes / 60)}h ` : ""}${item.durationMinutes % 60}m`
      : null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(item.discotiveLearnId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handlePrimary = () => {
    if (isVideo) {
      setIsPlaying(true);
      if (progressPct === 0) onTrackProgress?.(item.discotiveLearnId, 5, 0);
    } else if (item.link || item.platformUrl) {
      onTrackProgress?.(item.discotiveLearnId, 10, 0);
      window.open(
        item.link || item.platformUrl,
        "_blank",
        "noopener,noreferrer",
      );
    }
  };

  const handleMarkComplete = () => {
    setManuallyCompleted(true);
    onTrackProgress?.(item.discotiveLearnId, 100, 0);
  };

  // Sheet wrapper style
  const overlayStyle = isMobile
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      };

  const sheetStyle = isMobile
    ? {
        background: V.depth,
        borderRadius: "2rem 2rem 0 0",
        maxHeight: "92vh",
        overflowY: "auto",
        border: "1px solid rgba(255,255,255,0.07)",
      }
    : {
        background: V.depth,
        borderRadius: "2rem",
        maxWidth: 680,
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
      };

  return (
    <AnimatePresence>
      <div style={overlayStyle}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            zIndex: -1,
          }}
        />

        {/* Sheet */}
        <motion.div
          initial={
            isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 16 }
          }
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
          exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
          style={sheetStyle}
          className="custom-scrollbar"
        >
          {/* Mobile handle */}
          {isMobile && (
            <div className="flex justify-center pt-3 pb-1">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
            </div>
          )}

          {/* Media area */}
          <div
            className="relative"
            style={{ aspectRatio: "16/9", background: V.bg }}
          >
            {isPlaying && isVideo ? (
              <YouTubeEmbed
                youtubeId={item.youtubeId}
                onTrackProgress={onTrackProgress}
                item={item}
              />
            ) : (
              <>
                {item.thumbnailUrl || item.youtubeId ? (
                  <img
                    src={
                      item.thumbnailUrl ||
                      `https://img.youtube.com/vi/${item.youtubeId}/maxresdefault.jpg`
                    }
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: `${tc.color}08` }}
                  >
                    <Award
                      className="w-16 h-16"
                      style={{ color: `${tc.color}30` }}
                    />
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.3) 40%, transparent 100%)",
                  }}
                />

                {/* Play button overlay */}
                {isVideo && (
                  <button
                    onClick={handlePrimary}
                    className="absolute inset-0 flex items-center justify-center group"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <Play className="w-7 h-7 text-white fill-current ml-1" />
                    </div>
                  </button>
                )}
              </>
            )}

            {/* Close btn */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10"
              style={{
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>

            {/* Admin edit */}
            {isAdmin && (
              <button
                onClick={() => onAdminEdit?.(item)}
                className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>

          {/* Progress bar */}
          {progressPct > 0 && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)" }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: tc.color,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest"
                  style={{
                    background: `${tc.color}18`,
                    border: `1px solid ${tc.color}40`,
                    color: tc.color,
                  }}
                >
                  {tc.label}
                </span>
                {item.difficulty && (
                  <span
                    className="text-[9px] font-bold"
                    style={{ color: T.dim }}
                  >
                    {item.difficulty}
                  </span>
                )}
                {isVerified && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(74,222,128,0.08)",
                      border: "1px solid rgba(74,222,128,0.25)",
                    }}
                  >
                    <CheckCircle2
                      className="w-3 h-3"
                      style={{ color: "#4ADE80" }}
                    />
                    <span className="text-[8px] font-black text-green-400">
                      Verified
                    </span>
                  </div>
                )}
                {isPending && !isVerified && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    <span className="text-[8px] font-black text-amber-400">
                      Pending Review
                    </span>
                  </div>
                )}
              </div>

              <h2
                className="text-xl font-black text-white mb-1.5"
                style={{ letterSpacing: "-0.02em" }}
              >
                {item.title}
              </h2>

              {(item.provider || item.channelName || item.podcastName) && (
                <p
                  className="text-sm font-medium"
                  style={{ color: T.secondary }}
                >
                  {item.provider || item.channelName || item.podcastName}
                </p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-4">
              {durationText && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" style={{ color: T.dim }} />
                  <span
                    className="text-xs font-bold"
                    style={{ color: T.secondary }}
                  >
                    {durationText}
                  </span>
                </div>
              )}
              {item.type === "course" &&
                (() => {
                  const score =
                    item.scoreReward != null
                      ? item.scoreReward
                      : item.difficulty === "Advanced" ||
                          item.difficulty === "Expert"
                        ? 25
                        : item.difficulty === "Intermediate"
                          ? 15
                          : 5;
                  return (
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{
                        background: G.dimBg,
                        border: `1px solid ${G.border}`,
                      }}
                    >
                      <Zap className="w-3 h-3" style={{ color: G.bright }} />
                      <span
                        className="text-[10px] font-black"
                        style={{ color: G.bright }}
                      >
                        +{score} pts
                      </span>
                      <span className="text-[9px]" style={{ color: T.dim }}>
                        on verification
                      </span>
                    </div>
                  );
                })()}
              {item.type === "video" && (
                <div className="flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-red-400" />
                  <span
                    className="text-xs font-bold"
                    style={{ color: T.secondary }}
                  >
                    YouTube · No score
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <p
                className="text-sm leading-relaxed"
                style={{ color: T.secondary }}
              >
                {item.description}
              </p>
            )}

            {/* Skills/tags */}
            {(item.skillsGained?.length > 0 || item.tags?.length > 0) && (
              <div>
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-2"
                  style={{ color: T.dim }}
                >
                  Skills / Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...(item.skillsGained || []), ...(item.tags || [])]
                    .slice(0, 10)
                    .map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.07)",
                          color: T.secondary,
                        }}
                      >
                        {s}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Learn ID */}
            {item.discotiveLearnId && (
              <button
                onClick={handleCopyId}
                className="flex items-center gap-2 px-3 py-2 rounded-xl w-full transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Learn ID
                </span>
                <span
                  className="font-mono text-[10px] flex-1 text-left"
                  style={{ color: T.secondary }}
                >
                  {item.discotiveLearnId}
                </span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                ) : (
                  <Copy
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: T.dim }}
                  />
                )}
              </button>
            )}

            {/* Vault sync panel */}
            <AnimatePresence>
              {showVaultSync && (
                <VaultSyncPanel
                  item={item}
                  uid={uid}
                  onClose={() => setShowVaultSync(false)}
                  onSynced={() => setShowVaultSync(false)}
                />
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* Primary: open video / course link */}
              {!isPlaying && (item.link || item.platformUrl || isVideo) && (
                <button
                  onClick={handlePrimary}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: T.primary, color: V.bg }}
                >
                  {isVideo ? (
                    <>
                      <Play className="w-4 h-4 fill-current" /> Watch Video
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" /> Open Course
                    </>
                  )}
                </button>
              )}

              {/* Mark complete (courses only, not already verified) */}
              {isCourse && !isVerified && !isPending && !manuallyCompleted && (
                <button
                  onClick={handleMarkComplete}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    color: "#4ADE80",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                </button>
              )}
              {manuallyCompleted && !isPending && !isVerified && (
                <div
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.25)",
                    color: "#4ADE80",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Marked Complete
                </div>
              )}

              {/* Sync to vault (courses only, not already pending/verified) */}
              {isCourse && !isVerified && !isPending && (
                <button
                  onClick={() => setShowVaultSync((p) => !p)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: showVaultSync
                      ? G.dimBg
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${showVaultSync ? G.border : "rgba(255,255,255,0.07)"}`,
                    color: showVaultSync ? G.bright : T.secondary,
                  }}
                >
                  <Upload className="w-4 h-4" />
                  {showVaultSync
                    ? "Cancel Sync"
                    : "Sync to Vault for Verification"}
                </button>
              )}

              {/* Pending state */}
              {isPending && !isVerified && (
                <div
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    color: "#F59E0B",
                  }}
                >
                  <Shield className="w-4 h-4" /> Under Admin Review · Score
                  Pending
                </div>
              )}

              {/* Verified state */}
              {isVerified && (
                <div
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest"
                  style={{
                    background: "rgba(74,222,128,0.06)",
                    border: "1px solid rgba(74,222,128,0.2)",
                    color: "#4ADE80",
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Verified · Score Awarded
                </div>
              )}

              {/* Add to portfolio (premium) */}
              {isPremium ? (
                <button
                  onClick={() => onAddToPortfolio?.(item)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: T.dim,
                  }}
                >
                  <FolderLock className="w-3.5 h-3.5" /> Add to Portfolio
                </button>
              ) : (
                <button
                  onClick={() => navigate("/premium")}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: T.dim,
                  }}
                >
                  <Lock className="w-3 h-3" /> Portfolio · Pro Feature
                  <Crown className="w-3 h-3" style={{ color: G.bright }} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LearnAssetSheet;
