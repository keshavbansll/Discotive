/**
 * @fileoverview LearnAssetSheet.jsx — Netflix-Style Detail View Overlay
 * @description
 * High-fidelity immersive overlay for inspecting learning assets.
 * Features: Cinematic gradient overlaps, YouTube embedding, contextual actions,
 * and seamless transitions from the browse view. Adapts to PC (modal) and Mobile (bottom sheet).
 */

import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Play,
  ExternalLink,
  Plus,
  Check,
  Award,
  Clock,
  BarChart2,
  Lock,
  Tag,
  Layers,
  Edit3,
} from "lucide-react";
import { TYPE_CONFIG, getYouTubeThumbnail } from "../../lib/discotiveLearn";

// ─── Custom SVG for exact visual match with Cards ──────────────────────────────
const SvgZap = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="transparent"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>
);

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.3)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
  border: "rgba(255,255,255,0.06)",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
  success: "#4ADE80",
};

// ─── YouTube Embedded Player ───────────────────────────────────────────────────
const YouTubeEmbed = memo(({ youtubeId, onTrackProgress, item }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulated watch-time tracking hook integration.
    const interval = setInterval(() => {
      onTrackProgress?.(item.discotiveLearnId, 10, 10);
    }, 10000);
    return () => clearInterval(interval);
  }, [youtubeId, onTrackProgress, item]);

  return (
    <div
      style={{ position: "absolute", inset: 0, background: "#000", zIndex: 10 }}
    >
      <motion.iframe
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        onLoad={() => setIsLoaded(true)}
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&showinfo=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

// ─── Main Sheet Component ──────────────────────────────────────────────────────
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
  const [isAddingToPortfolio, setIsAddingToPortfolio] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const sheetRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;
  const isVideoOrPodcast =
    (item.type === "video" || item.type === "podcast") && item.youtubeId;
  const hasExternalLink = !!item.link;
  const isCompleted = completion?.verified;
  const progressPct = progress?.progressPct || 0;

  // Formatting
  const durationText = item.estimatedHours
    ? `${item.estimatedHours} Hours`
    : item.durationMinutes
      ? `${Math.floor(item.durationMinutes / 60) > 0 ? `${Math.floor(item.durationMinutes / 60)}h ` : ""}${item.durationMinutes % 60}m`
      : null;

  // Actions
  const handlePrimaryAction = () => {
    if (isVideoOrPodcast) {
      setIsPlaying(true);
      if (progressPct === 0) onTrackProgress(item.discotiveLearnId, 5, 0); // Immediate 5% bump for starting
    } else if (hasExternalLink) {
      onTrackProgress(item.discotiveLearnId, 100, 0); // External courses rely on Vault verification later
      window.open(item.link, "_blank", "noopener,noreferrer");
    }
  };

  const handlePortfolioAdd = async () => {
    if (!isPremium) {
      window.location.href = "/premium";
      return;
    }
    setIsAddingToPortfolio(true);
    const success = await onAddToPortfolio(item);
    setIsAddingToPortfolio(false);
    if (success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    }
  };

  // Viewport-specific animation variants
  const variants = isMobile
    ? {
        hidden: { y: "100%", opacity: 0 },
        visible: {
          y: 0,
          opacity: 1,
          transition: { type: "spring", damping: 25, stiffness: 200 },
        },
        exit: { y: "100%", opacity: 0, transition: { duration: 0.2 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 20 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: "spring", damping: 25, stiffness: 300 },
        },
        exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
      };

  const heroImage =
    item.thumbnailUrl ||
    (item.youtubeId
      ? getYouTubeThumbnail(item.youtubeId, "maxresdefault")
      : "");

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: isMobile ? "flex-end" : "center",
          justifyContent: "center",
        }}
      >
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
            WebkitBackdropFilter: "blur(12px)",
          }}
        />

        {/* Modal/Sheet Container */}
        <motion.div
          ref={sheetRef}
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: "relative",
            width: "100%",
            maxWidth: isMobile ? "100%" : 900,
            maxHeight: isMobile ? "92vh" : "85vh",
            height: isMobile ? "auto" : "auto",
            background: V.surface,
            borderRadius: isMobile ? "24px 24px 0 0" : 16,
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
            border: isMobile ? "none" : `1px solid ${V.border}`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close Button (Floating Glassmorphism) */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 50,
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.8)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(0,0,0,0.5)")
            }
          >
            <X size={20} />
          </button>

          {/* ─── SCROLLABLE CONTENT AREA ─── */}
          <div
            style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
            className="hide-scrollbar"
          >
            {/* ─── CINEMATIC HERO SECTION ─── */}
            <div
              style={{
                position: "relative",
                width: "100%",
                backgroundColor: V.depth,
                aspectRatio: isMobile ? "4/5" : "16/9",
                maxHeight: isMobile ? "55vh" : "500px",
              }}
            >
              {isPlaying && isVideoOrPodcast ? (
                <YouTubeEmbed
                  youtubeId={item.youtubeId}
                  onTrackProgress={onTrackProgress}
                  item={item}
                />
              ) : (
                <>
                  <img
                    src={heroImage}
                    alt={item.title}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.85,
                    }}
                  />

                  {/* The Netflix Overlap Gradients */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `linear-gradient(to top, ${V.surface} 0%, rgba(15,15,15,0.8) 15%, transparent 50%)`,
                    }}
                  />
                  {!isMobile && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to right, rgba(15,15,15,0.9) 0%, rgba(15,15,15,0.4) 40%, transparent 100%)",
                      }}
                    />
                  )}

                  {/* Title and Actions (Floating inside the Hero) */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: isMobile ? "24px 20px" : "40px 48px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      zIndex: 5,
                    }}
                  >
                    {/* Top Meta Row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {item.algoScore && isPremium && (
                        <span
                          style={{
                            color: T.success,
                            fontWeight: 900,
                            fontSize: 14,
                            fontFamily: "'Montserrat', sans-serif",
                            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                          }}
                        >
                          {Math.round(item.algoScore)}% Match
                        </span>
                      )}
                      {item.isNew && (
                        <span
                          style={{
                            color: "#4ADE80",
                            border: "1px solid #4ADE80",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 900,
                            fontFamily: "'Montserrat', sans-serif",
                          }}
                        >
                          NEW
                        </span>
                      )}
                      <span
                        style={{
                          color: T.primary,
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "'Poppins', sans-serif",
                          textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                        }}
                      >
                        {item.platform || typeConfig.label}
                      </span>
                      {durationText && (
                        <span
                          style={{
                            color: T.primary,
                            fontSize: 13,
                            fontWeight: 600,
                            fontFamily: "'Poppins', sans-serif",
                            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                          }}
                        >
                          {durationText}
                        </span>
                      )}
                    </div>

                    {/* Hero Title */}
                    <h1
                      style={{
                        fontSize: isMobile ? 32 : 48,
                        fontWeight: 900,
                        color: T.primary,
                        fontFamily: "'Montserrat', sans-serif",
                        lineHeight: 1.1,
                        marginBottom: 24,
                        textShadow: "0 4px 24px rgba(0,0,0,0.9)",
                        letterSpacing: "-0.02em",
                        maxWidth: isMobile ? "100%" : "70%",
                      }}
                    >
                      {item.title}
                    </h1>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        onClick={handlePrimaryAction}
                        style={{
                          flex: isMobile ? "1 1 100%" : "0 0 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          background: T.primary,
                          color: "#000",
                          border: "none",
                          padding: "12px 32px",
                          borderRadius: 6,
                          fontSize: 15,
                          fontWeight: 800,
                          fontFamily: "'Montserrat', sans-serif",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.filter = "brightness(0.9)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.filter = "brightness(1)")
                        }
                      >
                        {isVideoOrPodcast ? (
                          <>
                            <Play fill="#000" size={18} />{" "}
                            {progressPct > 0 ? "Resume" : "Play"}
                          </>
                        ) : (
                          <>
                            <ExternalLink size={18} /> Open Course
                          </>
                        )}
                      </button>

                      <button
                        onClick={handlePortfolioAdd}
                        disabled={isAddingToPortfolio || addedSuccess}
                        style={{
                          flex: isMobile ? "1 1 100%" : "0 0 auto",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          background: addedSuccess
                            ? "rgba(74,222,128,0.15)"
                            : "rgba(255,255,255,0.15)",
                          backdropFilter: "blur(12px)",
                          color: addedSuccess ? "#4ADE80" : T.primary,
                          border: `1px solid ${addedSuccess ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.2)"}`,
                          padding: "12px 28px",
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "'Montserrat', sans-serif",
                          cursor:
                            isAddingToPortfolio || addedSuccess
                              ? "default"
                              : "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!addedSuccess && !isAddingToPortfolio)
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.25)";
                        }}
                        onMouseLeave={(e) => {
                          if (!addedSuccess && !isAddingToPortfolio)
                            e.currentTarget.style.background =
                              "rgba(255,255,255,0.15)";
                        }}
                      >
                        {addedSuccess ? (
                          <>
                            <Check size={18} /> Added
                          </>
                        ) : isAddingToPortfolio ? (
                          "Adding..."
                        ) : (
                          <>
                            <Plus size={18} /> Portfolio{" "}
                            {!isPremium && (
                              <Lock
                                size={12}
                                color={G.base}
                                style={{ marginLeft: 4 }}
                              />
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* The Zeigarnik Glowing Progress Bar */}
              {progressPct > 0 && !isCompleted && !isPlaying && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    background: "rgba(255,255,255,0.1)",
                    zIndex: 20,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progressPct}%`,
                      background: typeConfig.color,
                      boxShadow: `0 0 12px ${typeConfig.color}`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* ─── DESCRIPTION & METADATA ─── */}
            <div
              style={{
                padding: isMobile ? "24px 20px 40px" : "32px 48px 48px",
                display: "flex",
                flexDirection: isMobile ? "col" : "row",
                flexWrap: "wrap",
                gap: 32,
              }}
            >
              {/* Left Column (Description) */}
              <div style={{ flex: isMobile ? "1 1 100%" : "2 1 0%" }}>
                <p
                  style={{
                    fontSize: 15,
                    color: T.primary,
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: 1.7,
                    opacity: 0.9,
                    margin: 0,
                    marginBottom: 24,
                  }}
                >
                  {item.description ||
                    "No detailed description provided for this asset."}
                </p>

                {/* Dopamine Score Reward (Hyper-Visible) */}
                {item.type === "course" && item.scoreReward > 0 && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      background: `linear-gradient(135deg, ${G.dimBg} 0%, rgba(191,162,100,0.02) 100%)`,
                      border: `1px solid ${G.border}`,
                      borderRadius: 8,
                    }}
                  >
                    <SvgZap size={18} color={G.bright} />
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontSize: 10,
                          fontWeight: 800,
                          color: G.base,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      >
                        Potential Reward
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 16,
                          fontWeight: 900,
                          color: G.bright,
                          fontFamily: "'Montserrat', sans-serif",
                          textShadow: `0 0 12px ${G.dimBg}`,
                        }}
                      >
                        +{item.scoreReward} Discotive Points
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Tags & Details) */}
              <div
                style={{
                  flex: isMobile ? "1 1 100%" : "1 1 0%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                {/* Provider & Difficulty */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "16px 32px",
                  }}
                >
                  {item.provider && (
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.dim,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontFamily: "'Montserrat', sans-serif",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Creator
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: T.primary,
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {item.provider || item.channelName}
                      </span>
                    </div>
                  )}
                  {item.difficulty && (
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          color: T.dim,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          fontFamily: "'Montserrat', sans-serif",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Difficulty
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          color: T.primary,
                          fontFamily: "'Poppins', sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {item.difficulty}
                      </span>
                    </div>
                  )}
                </div>

                {/* Skills Acquired */}
                {item.skillsGained?.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.dim,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "'Montserrat', sans-serif",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Skills Acquired
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.skillsGained.map((skill, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            color: T.secondary,
                            background: "rgba(255,255,255,0.05)",
                            padding: "4px 10px",
                            borderRadius: 4,
                            fontFamily: "'Poppins', sans-serif",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {item.tags?.length > 0 && (
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        color: T.dim,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontFamily: "'Montserrat', sans-serif",
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Tags
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {item.tags.map((tag, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 12,
                            color: T.dim,
                            fontFamily: "'Poppins', sans-serif",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Quick Edit */}
                {isAdmin && (
                  <div style={{ marginTop: "auto", paddingTop: 16 }}>
                    <button
                      onClick={() => {
                        onClose();
                        onAdminEdit(item);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "transparent",
                        color: T.dim,
                        border: "none",
                        fontSize: 12,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <Edit3 size={14} /> Edit Metadata (Admin)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LearnAssetSheet;
