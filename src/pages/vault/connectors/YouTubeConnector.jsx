/**
 * @fileoverview Discotive OS — YouTube Creator Hub v2.0 (PRODUCTION)
 * @module Vault/Connectors/YouTube
 *
 * ARCHITECTURE:
 * YouTube Data API v3 requires an API key and OAuth for private data.
 * For creator verification, we use a manual-submission + admin-approval flow:
 *
 * FLOW:
 * 1. Creator submits their channel URL + handle + description
 * 2. Firestore write: users/{uid}.connectors.youtube = { ...channelData, verified: false }
 * 3. Admin sees pending request in AdminDashboard → VaultVerification panel
 * 4. Admin approves → sets connectors.youtube.verified = true
 * 5. After verification: creator adds video URLs manually
 * 6. Each video card renders with thumbnail (from YouTube's public image CDN)
 * 7. Videos can be submitted to Vault with strength rating for admin scoring
 *
 * YOUTUBE THUMBNAIL TRICK:
 * youtube.com image CDN is public and requires no API key:
 * https://img.youtube.com/vi/{VIDEO_ID}/maxresdefault.jpg
 * This gives us real thumbnails without hitting the quota.
 */

import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Play,
  Eye,
  ThumbsUp,
  Clock,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  ExternalLink,
  Loader2,
  Check,
  Film,
  ChevronLeft,
  ChevronRight,
  Zap,
  BarChart2,
  Info,
  Link2,
  Trash2,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../contexts/AuthContext";

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
const YT = "#ef4444";

// ─── Utility: Extract YouTube Video ID ───────────────────────────────────────
const extractYTId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// ─── Utility: Format view count ──────────────────────────────────────────────
const formatViews = (n) => {
  if (!n && n !== 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// ─── Hero Carousel (Netflix-style) ──────────────────────────────────────────
const HeroCarousel = memo(({ videos, onDelete }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    if (playing) return;
    const t = setInterval(() => {
      setActiveIdx((p) => (p + 1) % videos.length);
    }, 6000);
    return () => clearInterval(t);
  }, [videos.length, playing]);

  if (!videos.length) return null;
  const active = videos[activeIdx];
  const ytId = active?.ytId;

  const prev = (e) => {
    e.stopPropagation();
    setActiveIdx((p) => (p - 1 + videos.length) % videos.length);
    setPlaying(false);
  };
  const next = (e) => {
    e.stopPropagation();
    setActiveIdx((p) => (p + 1) % videos.length);
    setPlaying(false);
  };

  const strengthStyle = {
    Strong: { bg: "rgba(16,185,129,0.15)", color: "#10b981" },
    Medium: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
    Light: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  }[active?.strength] || { bg: "rgba(255,255,255,0.08)", color: T.dim };

  return (
    <div
      className="relative w-full overflow-hidden rounded-[1.5rem] mb-6 group"
      style={{ aspectRatio: "16/7", minHeight: 220 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {playing && ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
              allow="autoplay; fullscreen"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-[1.5rem]"
              style={{ border: "none" }}
            />
          ) : (
            <>
              <img
                src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                alt={active.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // MAANG Fix: Nullify the handler to prevent an infinite loop if the fallback also 404s
                  e.target.onerror = null;
                  e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to right, rgba(3,3,3,0.9) 0%, rgba(3,3,3,0.35) 50%, transparent 100%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(3,3,3,0.85) 0%, transparent 55%)",
                }}
              />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Content overlay */}
      {!playing && (
        <div className="absolute inset-0 flex flex-col justify-end p-6 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Youtube className="w-4 h-4" style={{ color: YT }} />
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: YT }}
                >
                  Creator
                </span>
                {active.strength && (
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                    style={strengthStyle}
                  >
                    {active.strength}
                  </span>
                )}
                {active.vaultStatus && (
                  <span
                    className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
                    style={
                      active.vaultStatus === "VERIFIED"
                        ? {
                            background: "rgba(16,185,129,0.15)",
                            color: "#10b981",
                          }
                        : active.vaultStatus === "PENDING"
                          ? {
                              background: "rgba(245,158,11,0.12)",
                              color: "#f59e0b",
                            }
                          : {
                              background: "rgba(255,255,255,0.06)",
                              color: T.dim,
                            }
                    }
                  >
                    {active.vaultStatus}
                  </span>
                )}
              </div>
              <h2
                className="text-2xl font-black leading-tight mb-2 max-w-lg"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  color: T.primary,
                }}
              >
                {active.title}
              </h2>
              {active.description && (
                <p
                  className="text-sm mb-4 max-w-md line-clamp-2"
                  style={{ color: T.secondary }}
                >
                  {active.description}
                </p>
              )}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPlaying(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest"
                  style={{ background: YT, color: "#fff" }}
                >
                  <Play className="w-4 h-4" /> Play Now
                </motion.button>
                <a
                  href={`https://youtube.com/watch?v=${ytId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: T.primary,
                  }}
                >
                  <ExternalLink className="w-4 h-4" /> Open on YouTube
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Nav arrows */}
      {videos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronLeft className="w-4 h-4" style={{ color: T.primary }} />
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ChevronRight className="w-4 h-4" style={{ color: T.primary }} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 right-4 z-20 flex gap-1.5">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveIdx(i);
                setPlaying(false);
              }}
              className="rounded-full transition-all"
              style={{
                width: i === activeIdx ? 20 : 6,
                height: 6,
                background: i === activeIdx ? YT : "rgba(255,255,255,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Video Thumbnail Card ─────────────────────────────────────────────────────
const VideoCard = memo(({ video, onDelete }) => {
  const ytId = video.ytId;
  const [thumbError, setThumbError] = useState(false);

  const strengthStyle =
    {
      Strong: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
      Medium: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
      Light: { bg: "rgba(249,115,22,0.1)", color: "#f97316" },
    }[video.strength] || {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative rounded-[1.25rem] overflow-hidden"
      style={{
        background: V.surface,
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {!thumbError ? (
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setThumbError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <Youtube
              className="w-8 h-8"
              style={{ color: "rgba(239,68,68,0.3)" }}
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(3,3,3,0.8) 0%, transparent 50%)",
          }}
        />

        {/* Play button overlay */}
        <a
          href={`https://youtube.com/watch?v=${ytId}`}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.9)" }}
          >
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </a>

        {/* Vault status badge */}
        {video.vaultStatus && (
          <div className="absolute top-2 left-2">
            <span
              className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
              style={
                video.vaultStatus === "VERIFIED"
                  ? { background: "rgba(16,185,129,0.8)", color: "#fff" }
                  : video.vaultStatus === "PENDING"
                    ? { background: "rgba(245,158,11,0.8)", color: "#fff" }
                    : { background: "rgba(0,0,0,0.7)", color: T.dim }
              }
            >
              {video.vaultStatus}
            </span>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={() => onDelete(video.id)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(239,68,68,0.8)" }}
          title="Remove video"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="text-xs font-bold line-clamp-2 mb-2"
          style={{ color: T.primary }}
        >
          {video.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {video.strength && (
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md"
              style={strengthStyle}
            >
              {video.strength}
            </span>
          )}
          {video.views != null && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" style={{ color: T.dim }} />
              <span className="text-[9px] font-mono" style={{ color: T.dim }}>
                {formatViews(video.views)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ─── Add Video Modal ──────────────────────────────────────────────────────────
const AddVideoModal = memo(({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    url: "",
    title: "",
    description: "",
    strength: "Medium",
    views: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const ytId = extractYTId(form.url);

  const handleAdd = async () => {
    if (!form.url.trim() || !form.title.trim()) {
      setError("Video URL and title are required.");
      return;
    }
    if (!ytId) {
      setError(
        "Invalid YouTube URL. Please paste a valid youtube.com or youtu.be link.",
      );
      return;
    }
    setLoading(true);
    await onAdd({
      ytId,
      url: form.url.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      strength: form.strength,
      views: form.views ? parseInt(form.views.replace(/,/g, "")) || null : null,
    });
    setLoading(false);
    onClose();
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none transition-all";
  const inputStyle = {
    background: V.surface,
    border: "1px solid rgba(255,255,255,0.07)",
    color: T.primary,
  };
  const focusStyle = {};

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="relative w-full max-w-lg"
        style={{
          background: V.elevated,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "1.5rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div>
            <h3 className="text-base font-black" style={{ color: T.primary }}>
              Add Video
            </h3>
            <p className="text-[10px] mt-0.5" style={{ color: T.dim }}>
              Paste a YouTube URL to add to your creator vault
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <X className="w-4 h-4" style={{ color: T.dim }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Thumbnail preview */}
          {ytId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full overflow-hidden rounded-xl"
              style={{ aspectRatio: "16/9" }}
            >
              <img
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div
                className="absolute inset-0 flex items-end p-3"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
                }}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="w-4 h-4"
                    style={{ color: "#10b981" }}
                  />
                  <span className="text-[10px] font-bold text-white">
                    Valid YouTube video detected
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0"
                style={{ color: "#f87171" }}
              />
              <p className="text-xs font-bold" style={{ color: "#f87171" }}>
                {error}
              </p>
            </div>
          )}

          {/* URL */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              YouTube URL *
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => {
                setForm((p) => ({ ...p, url: e.target.value }));
                setError(null);
              }}
              placeholder="https://youtube.com/watch?v=..."
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Title */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              Video Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="My awesome tutorial"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="What is this video about?"
              className={inputCls}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* Strength + Views row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
                style={{ color: T.dim }}
              >
                Content Strength
              </label>
              <select
                value={form.strength}
                onChange={(e) =>
                  setForm((p) => ({ ...p, strength: e.target.value }))
                }
                className={inputCls}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="Light">Light</option>
                <option value="Medium">Medium</option>
                <option value="Strong">Strong</option>
              </select>
            </div>
            <div>
              <label
                className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
                style={{ color: T.dim }}
              >
                View Count (Optional)
              </label>
              <input
                type="text"
                value={form.views}
                onChange={(e) =>
                  setForm((p) => ({ ...p, views: e.target.value }))
                }
                placeholder="e.g. 12500"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAdd}
            disabled={loading || !form.url.trim() || !form.title.trim()}
            className="w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: `linear-gradient(135deg, #c0392b, ${YT})`,
              color: "#fff",
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Youtube className="w-4 h-4" />
            )}
            {loading ? "Adding..." : "Add Video"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const YouTubeConnector = ({ userData, onVaultAssetAdded, addToast }) => {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const existing = userData?.connectors?.youtube;
  const [form, setForm] = useState({
    channelUrl: existing?.channelUrl || "",
    handle: existing?.handle || "",
    description: existing?.description || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [addVideoOpen, setAddVideoOpen] = useState(false);
  const [videos, setVideos] = useState(existing?.videos || []);

  // Sync videos from userData if it changes externally
  useEffect(() => {
    setVideos(existing?.videos || []);
  }, [existing?.videos]);

  // Phase detection
  const phase = !existing
    ? "unsubmitted"
    : !existing.verified
      ? "pending"
      : "verified";

  // ── Submit channel for verification ──────────────────────────────────────
  const handleSubmitForVerification = useCallback(async () => {
    if (!uid || !form.channelUrl.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const channelData = {
        channelUrl: form.channelUrl.trim(),
        handle: form.handle.trim().replace(/^@/, ""),
        description: form.description.trim(),
        verified: false,
        submittedAt: new Date().toISOString(),
        videos: [],
      };
      await updateDoc(doc(db, "users", uid), {
        "connectors.youtube": channelData,
      });
      addToast?.(
        "Channel submitted for admin verification. You'll be notified within 24–48 hours.",
        "green",
      );
    } catch (err) {
      console.error("[YouTubeConnector] Submit failed:", err);
      addToast?.("Submission failed. Please try again.", "red");
    } finally {
      setSubmitting(false);
    }
  }, [uid, form, addToast]);

  // ── Add video ─────────────────────────────────────────────────────────────
  const handleAddVideo = useCallback(
    async (videoData) => {
      if (!uid) return;
      const newVideo = {
        id: `yt_${videoData.ytId}_${Date.now()}`,
        ...videoData,
        addedAt: new Date().toISOString(),
        vaultStatus: null, // Not yet submitted to vault
      };

      const updatedVideos = [...videos, newVideo];
      setVideos(updatedVideos);

      try {
        await updateDoc(doc(db, "users", uid), {
          "connectors.youtube.videos": updatedVideos,
        });
        addToast?.(`"${videoData.title}" added to your Creator Hub.`, "green");
      } catch (err) {
        console.error("[YouTubeConnector] Add video failed:", err);
        setVideos(videos); // Rollback
        addToast?.("Failed to save video. Please try again.", "red");
      }
    },
    [uid, videos, addToast],
  );

  // ── Delete video ──────────────────────────────────────────────────────────
  const handleDeleteVideo = useCallback(
    async (videoId) => {
      const updatedVideos = videos.filter((v) => v.id !== videoId);
      setVideos(updatedVideos);
      try {
        await updateDoc(doc(db, "users", uid), {
          "connectors.youtube.videos": updatedVideos,
        });
        addToast?.("Video removed.", "grey");
      } catch (err) {
        setVideos(videos); // Rollback
        addToast?.("Failed to remove video.", "red");
      }
    },
    [uid, videos, addToast],
  );

  // ── Submit video to Vault ─────────────────────────────────────────────────
  const handleSyncVideoToVault = useCallback(
    async (video) => {
      if (
        !uid ||
        video.vaultStatus === "PENDING" ||
        video.vaultStatus === "VERIFIED"
      )
        return;
      try {
        const newAsset = {
          id: `vault_yt_${video.ytId}_${Date.now()}`,
          title: video.title,
          subtitle: video.description || "",
          category: "Content",
          type: "youtube_video",
          url: `https://youtube.com/watch?v=${video.ytId}`,
          thumbnail: `https://img.youtube.com/vi/${video.ytId}/mqdefault.jpg`,
          isPublic: true,
          pinned: false,
          status: "PENDING",
          strength: video.strength || "Medium",
          scoreYield: 0,
          connectorSource: "youtube",
          connectorVideoId: video.ytId,
          credentials: {
            videoUrl: `https://youtube.com/watch?v=${video.ytId}`,
            title: video.title,
            strength: video.strength,
            views: video.views || 0,
            channelUrl: existing?.channelUrl || "",
            channelHandle: existing?.handle || "",
          },
          uploadedAt: new Date().toISOString(),
          uploadedBy: uid,
          hash: `yt_${video.ytId}`,
          size: 0,
        };

        const currentVault = userData?.vault || [];
        const alreadyExists = currentVault.some(
          (a) => a.connectorVideoId === video.ytId,
        );
        if (alreadyExists) {
          addToast?.("Already in Vault.", "grey");
          return;
        }

        const updatedVault = [...currentVault, newAsset];
        const updatedVideos = videos.map((v) =>
          v.id === video.id ? { ...v, vaultStatus: "PENDING" } : v,
        );
        setVideos(updatedVideos);

        await updateDoc(doc(db, "users", uid), {
          vault: updatedVault,
          vault_count: updatedVault.length,
          "connectors.youtube.videos": updatedVideos,
        });

        onVaultAssetAdded?.(newAsset, updatedVault);
        addToast?.(
          `"${video.title}" submitted to Vault — pending admin verification.`,
          "green",
        );
      } catch (err) {
        console.error("[YouTubeConnector] Vault sync failed:", err);
        addToast?.("Vault sync failed. Try again.", "red");
      }
    },
    [uid, userData, videos, existing, onVaultAssetAdded, addToast],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: UNSUBMITTED
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "unsubmitted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[420px] max-w-md mx-auto px-4"
      >
        <motion.div
          className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
          animate={{
            boxShadow: [
              "0 0 0px rgba(239,68,68,0)",
              "0 0 30px rgba(239,68,68,0.1)",
              "0 0 0px rgba(239,68,68,0)",
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Youtube className="w-10 h-10" style={{ color: YT }} />
        </motion.div>

        <h2
          className="text-2xl font-black mb-2 text-center"
          style={{ fontFamily: "'Montserrat', sans-serif", color: T.primary }}
        >
          Connect YouTube Channel
        </h2>
        <p
          className="text-sm mb-8 max-w-sm leading-relaxed text-center"
          style={{ color: T.secondary }}
        >
          Submit your channel for Discotive verification. Once approved, you can
          showcase your videos as verified proof of work.
        </p>

        <div className="w-full space-y-4">
          {/* Channel URL */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              Channel URL *
            </label>
            <input
              type="url"
              value={form.channelUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, channelUrl: e.target.value }))
              }
              placeholder="https://youtube.com/@yourchannel"
              className="w-full px-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.07)",
                color: T.primary,
              }}
            />
          </div>

          {/* Handle */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              Channel Handle (Optional)
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold select-none"
                style={{ color: T.dim }}
              >
                @
              </span>
              <input
                type="text"
                value={form.handle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, handle: e.target.value }))
                }
                placeholder="yourchannel"
                className="w-full pl-8 pr-4 py-3.5 rounded-xl text-sm focus:outline-none transition-all"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: T.primary,
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              className="text-[9px] font-black uppercase tracking-widest mb-1.5 block"
              style={{ color: T.dim }}
            >
              Channel Description *
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Describe your content, niche, and target audience..."
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none transition-all"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.07)",
                color: T.primary,
              }}
            />
          </div>

          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.15)",
            }}
          >
            <Info
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: "#f59e0b" }}
            />
            <p
              className="text-[10px]"
              style={{ color: "rgba(245,158,11,0.8)" }}
            >
              Admin verification typically takes 24–48 hours. Once approved,
              you'll be able to add and showcase your videos.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmitForVerification}
            disabled={
              submitting || !form.channelUrl.trim() || !form.description.trim()
            }
            className="w-full py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
            style={{
              background: `linear-gradient(135deg, #c0392b, ${YT})`,
              color: "#fff",
            }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Youtube className="w-4 h-4" />
            )}
            {submitting ? "Submitting..." : "Submit for Verification"}
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: PENDING VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[400px] text-center px-6"
      >
        <motion.div
          className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Clock className="w-10 h-10" style={{ color: "#f59e0b" }} />
        </motion.div>
        <h2
          className="text-2xl font-black mb-2"
          style={{ fontFamily: "'Montserrat', sans-serif", color: T.primary }}
        >
          Verification Pending
        </h2>
        <p
          className="text-sm mb-6 max-w-sm leading-relaxed"
          style={{ color: T.secondary }}
        >
          Your channel
          <strong style={{ color: T.primary }}>
            {existing?.handle ? `@${existing.handle}` : existing?.channelUrl}
          </strong>
          is under review. You'll be notified once verified.
        </p>
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl max-w-sm w-full"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <AlertTriangle
            className="w-4 h-4 shrink-0"
            style={{ color: "#f59e0b" }}
          />
          <p className="text-xs font-bold" style={{ color: "#f59e0b" }}>
            Typically verified within 24–48 hours.
          </p>
        </div>

        <a
          href={existing?.channelUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 mt-4 text-[10px] font-bold hover:underline"
          style={{ color: T.dim }}
        >
          <ExternalLink className="w-3.5 h-3.5" /> View your channel
        </a>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER: VERIFIED — Full Creator Hub
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-0"
    >
      {/* Channel Banner */}
      <div
        className="flex items-center justify-between mb-5 p-4 rounded-[1.25rem]"
        style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.12)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.12)" }}
          >
            <Youtube className="w-5 h-5" style={{ color: YT }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black" style={{ color: T.primary }}>
                {existing?.handle ? `@${existing.handle}` : "Your Channel"}
              </p>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}
              >
                <CheckCircle2
                  className="w-3 h-3"
                  style={{ color: "#10b981" }}
                />
                <span
                  className="text-[8px] font-black uppercase tracking-widest"
                  style={{ color: "#10b981" }}
                >
                  Verified
                </span>
              </div>
            </div>
            <a
              href={existing?.channelUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-mono hover:underline"
              style={{ color: T.dim }}
            >
              {existing?.channelUrl}
            </a>
          </div>
        </div>
        <button
          onClick={() => setAddVideoOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-red-500/15"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: YT,
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Video
        </button>
      </div>

      {/* Hero Carousel + Grid */}
      {videos.length > 0 ? (
        <>
          <HeroCarousel videos={videos} onDelete={handleDeleteVideo} />

          <div>
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: T.dim }}
              >
                All Videos ({videos.length})
              </p>
              <span className="text-[9px] font-mono" style={{ color: T.dim }}>
                {videos.filter((v) => v.vaultStatus === "VERIFIED").length}
                verified
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((v) => (
                <div key={v.id} className="flex flex-col gap-2">
                  <VideoCard video={v} onDelete={handleDeleteVideo} />
                  {/* Vault sync CTA */}
                  {!v.vaultStatus && (
                    <button
                      onClick={() => handleSyncVideoToVault(v)}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                      style={{
                        background: G.dimBg,
                        border: `1px solid ${G.border}`,
                        color: G.bright,
                      }}
                    >
                      <Upload className="w-3 h-3" /> Sync to Vault
                    </button>
                  )}
                  {v.vaultStatus === "PENDING" && (
                    <div
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        color: "#f59e0b",
                      }}
                    >
                      <Loader2 className="w-3 h-3 animate-spin" /> Pending
                      verification
                    </div>
                  )}
                  {v.vaultStatus === "VERIFIED" && (
                    <div
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        color: "#10b981",
                      }}
                    >
                      <Check className="w-3 h-3" /> Vault Verified
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <motion.div
          className="flex flex-col items-center justify-center py-20 text-center rounded-[1.5rem]"
          style={{ border: "1px dashed rgba(239,68,68,0.15)" }}
        >
          <Film
            className="w-12 h-12 mb-4"
            style={{ color: "rgba(239,68,68,0.2)" }}
          />
          <h3
            className="text-xl font-black mb-2"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            No videos yet.
          </h3>
          <p className="text-sm max-w-xs mb-6" style={{ color: T.dim }}>
            Add your YouTube videos to showcase your content in your Vault.
          </p>
          <button
            onClick={() => setAddVideoOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all hover:bg-red-500/15"
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: YT,
            }}
          >
            <Plus className="w-4 h-4" /> Add First Video
          </button>
        </motion.div>
      )}

      {/* Add Video Modal */}
      <AnimatePresence>
        {addVideoOpen && (
          <AddVideoModal
            onClose={() => setAddVideoOpen(false)}
            onAdd={handleAddVideo}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default YouTubeConnector;
