/**
 * @fileoverview LearnCard.jsx — The Addiction Engine Card
 * @description
 * High-performance, borderless, Netflix-style content card.
 * Features intent-delayed hover expansions, DOM-safe scaling,
 * cinematic thumbnail zooms, and the Zeigarnik-glow progress bar.
 */

import React, { useState, useCallback, useRef, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TYPE_CONFIG,
  VERIFICATION_TIERS,
  getYouTubeThumbnail,
} from "../../lib/discotiveLearn";

// ─── Custom Premium SVG Library (Zero External Dep Issues) ───────────────
const SvgPlay = ({
  size = 16,
  color = "currentColor",
  fill = "none",
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <polygon
      points="6 3 20 12 6 21 6 3"
      fill={fill === "currentColor" ? color : fill}
    ></polygon>
  </svg>
);
const SvgCourse = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
  </svg>
);
const SvgPodcast = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
  </svg>
);
const SvgResource = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);
const SvgCheckCircle = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      fill="rgba(74,222,128,0.1)"
    ></path>
    <path d="M9 12l2 2 4-4" stroke="#000"></path>
  </svg>
);
const SvgClock = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
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
const SvgArrowRight = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);
const SvgBarChart = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);
const SvgGlobe = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);
const SvgLayers = ({ size = 16, color = "currentColor" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>
);

const BrandVectors = {
  youtube: (
    <svg viewBox="0 0 24 24" fill="#FF0000" width="100%" height="100%">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  coursera: (
    <svg viewBox="0 0 24 24" fill="#0056D2" width="100%" height="100%">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.32 14.46c-1.07.67-2.31 1.02-3.57 1.02-3.44 0-6.1-2.61-6.1-5.98s2.66-5.98 6.1-5.98c1.26 0 2.5.35 3.57 1.02l-1.32 2.1c-.69-.4-1.47-.6-2.25-.6-2.07 0-3.7 1.58-3.7 3.46s1.63 3.46 3.7 3.46c.78 0 1.56-.2 2.25-.6l1.32 2.1z" />
    </svg>
  ),
  udemy: (
    <svg viewBox="0 0 24 24" fill="#A435F0" width="100%" height="100%">
      <path d="M12.02 16.71c-3.15 0-5.3-2.02-5.3-5.59V4.68h3.33v6.41c0 1.76 1.05 2.53 2.12 2.53 1.08 0 2.13-.77 2.13-2.53V4.68h3.33v6.44c0 3.57-2.15 5.59-5.61 5.59z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="#0A66C2" width="100%" height="100%">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" fill="#1DB954" width="100%" height="100%">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.45 17.334a.754.754 0 0 1-1.036.249c-2.836-1.73-6.403-2.12-10.612-1.161a.754.754 0 1 1-.335-1.47c4.591-1.045 8.536-.598 11.734 1.346a.754.754 0 0 1 .249 1.036zm1.464-3.26c-.19.31-.6.411-.91.22-3.242-1.996-8.214-2.585-12.183-1.415a.965.965 0 0 1-1.205-.662.964.964 0 0 1 .662-1.204c4.544-1.34 10.024-.674 13.856 1.77a.964.964 0 0 1 .38 1.291zm.12-3.39c-3.882-2.304-10.286-2.518-13.987-1.393a1.155 1.155 0 1 1-.685-2.209c4.275-1.326 11.353-1.077 15.86 1.626a1.155 1.155 0 0 1-1.188 1.976z" />
    </svg>
  ),
};

const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
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

const PlatformLogo = memo(({ platform, size = 16 }) => {
  const vector = BrandVectors[platform];
  if (vector)
    return (
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {vector}
      </div>
    );
  return (
    <div
      style={{
        width: size,
        height: size,
        background: "#333",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.55,
        fontWeight: 900,
        color: "#fff",
        fontFamily: "'Montserrat', sans-serif",
        flexShrink: 0,
      }}
    >
      ?
    </div>
  );
});

const TypeIcon = memo(({ type, size = 14, color }) => {
  const icons = {
    course: SvgCourse,
    video: SvgPlay,
    podcast: SvgPodcast,
    resource: SvgResource,
  };
  const Icon = icons[type] || SvgCourse;
  return (
    <Icon size={size} color={color || TYPE_CONFIG[type]?.color || G.base} />
  );
});

// The Zeigarnik Effect glowing progress bar
const ProgressBar = memo(({ pct, color }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      background: "rgba(0,0,0,0.6)",
      zIndex: 20,
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${Math.min(100, pct)}%`,
        background: color || G.base,
        boxShadow: `0 0 12px ${color || G.base}`,
        transition: "width 0.3s ease",
      }}
    />
  </div>
));

const VerifBadge = memo(({ tier }) => {
  const config = VERIFICATION_TIERS[tier];
  if (!config || tier === "Weak") return null;
  return (
    <div
      style={{
        padding: "2px 6px",
        background: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        fontSize: 8,
        fontWeight: 800,
        letterSpacing: "0.1em",
        fontFamily: "'Montserrat', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {tier === "Original"
        ? "✦ ORIGINAL"
        : tier === "Strong"
          ? "✓ STRONG"
          : tier}
    </div>
  );
});

const MatchScore = memo(({ score }) => {
  if (!score) return null;
  const pct = Math.min(99, Math.round(score));
  const color = pct > 85 ? "#4ADE80" : pct > 65 ? G.bright : T.secondary;
  return (
    <span
      style={{
        color,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {pct}% Match
    </span>
  );
});

const Thumbnail = memo(
  ({ item, aspectRatio = "16/9", overlay = false, hovered = false }) => {
    const [imgError, setImgError] = useState(false);
    const src =
      item.thumbnailUrl ||
      (item.type === "video" && item.youtubeId
        ? getYouTubeThumbnail(item.youtubeId)
        : item.type === "podcast" && item.youtubeId
          ? getYouTubeThumbnail(item.youtubeId)
          : null);
    const typeColor = TYPE_CONFIG[item.type]?.color || G.base;

    if (!src || imgError) {
      return (
        <div
          style={{
            width: "100%",
            aspectRatio,
            background: `linear-gradient(135deg, ${V.surface} 0%, ${V.elevated} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <TypeIcon type={item.type} size={32} color={`${typeColor}40`} />
        </div>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          aspectRatio,
          position: "relative",
          overflow: "hidden",
          background: V.depth,
        }}
      >
        {/* Cinematic Scale on Hover */}
        <motion.img
          src={src}
          alt={item.title}
          onError={() => setImgError(true)}
          initial={{ scale: 1 }}
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          loading="lazy"
        />
        {overlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(3,3,3,0.9) 0%, rgba(3,3,3,0.3) 50%, transparent 100%)",
            }}
          />
        )}

        {/* Video Overlay */}
        {item.type === "video" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
            >
              <SvgPlay
                size={16}
                fill="white"
                color="white"
                style={{ marginLeft: 2 }}
              />
            </div>
          </div>
        )}
      </div>
    );
  },
);

const LearnCard = memo(
  ({
    item,
    completion,
    progress,
    onSelect,
    isMobile = false,
    algoScore = null,
    showMatchScore = false,
    compact = false,
    index = 0,
  }) => {
    const [hovered, setHovered] = useState(false);
    const hoverTimer = useRef(null);

    const typeConfig = TYPE_CONFIG[item?.type] || TYPE_CONFIG.course;
    const progressPct = progress?.progressPct || 0;
    const isCompleted = completion?.verified;

    // The Netflix Intent Delay: Prevent chaotic reflows during fast mouse swipes
    const handleMouseEnter = useCallback(() => {
      if (isMobile) return;
      hoverTimer.current = setTimeout(() => setHovered(true), 350);
    }, [isMobile]);

    const handleMouseLeave = useCallback(() => {
      if (isMobile) return;
      clearTimeout(hoverTimer.current);
      setHovered(false);
    }, [isMobile]);

    useEffect(() => {
      return () => clearTimeout(hoverTimer.current);
    }, []);

    const handleClick = useCallback(() => {
      onSelect?.(item);
    }, [onSelect, item]);

    if (!item) return null;

    const durationText = item.estimatedHours
      ? `${item.estimatedHours}h`
      : item.durationMinutes
        ? item.durationMinutes >= 60
          ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`
          : `${item.durationMinutes}m`
        : null;
    const subLine =
      item.provider ||
      item.channelName ||
      item.podcastName ||
      item.category ||
      "";

    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          position: "relative",
          cursor: "pointer",
          zIndex: hovered ? 50 : 1, // Leap over siblings
          perspective: 1000,
          width: "100%",
          height: "100%",
        }}
      >
        {/* This is the actual scalable card layer. 
        It sits perfectly inside the parent flex/grid cell until hovered, 
        at which point it scales up safely without breaking the page layout.
      */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={
            hovered && !isMobile
              ? {
                  opacity: 1,
                  scale: 1.08,
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.9)",
                }
              : { opacity: 1, scale: 1, y: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" }
          }
          transition={{
            opacity: { duration: 0.25, delay: Math.min(index * 0.03, 0.3) },
            scale: { type: "spring", damping: 20, stiffness: 300 },
            y: { type: "spring", damping: 20, stiffness: 300 },
          }}
          style={{
            background: hovered ? V.elevated : V.surface,
            borderRadius: 8,
            overflow: hovered ? "visible" : "hidden",
            width: "100%",
            position: hovered && !isMobile ? "absolute" : "relative", // Detach from flow when hovered
            top: 0,
            left: 0,
          }}
          whileTap={{ scale: isMobile ? 0.96 : 0.98 }}
        >
          <div
            style={{
              position: "relative",
              borderRadius: "8px 8px 0 0",
              overflow: "hidden",
            }}
          >
            <Thumbnail
              item={item}
              aspectRatio={compact ? "4/3" : "16/9"}
              hovered={hovered}
            />

            {progressPct > 0 && !isCompleted && (
              <ProgressBar pct={progressPct} color={typeConfig.color} />
            )}

            {/* Overlays */}
            {isCompleted && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  background: "rgba(74,222,128,0.2)",
                  border: "1px solid rgba(74,222,128,0.4)",
                  borderRadius: 2,
                  padding: "2px 6px",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  backdropFilter: "blur(4px)",
                }}
              >
                <SvgCheckCircle size={10} color="#4ADE80" />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#4ADE80",
                    fontFamily: "'Montserrat', sans-serif",
                    letterSpacing: "0.1em",
                  }}
                >
                  DONE
                </span>
              </div>
            )}
            {item.isNew && !isCompleted && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: typeConfig.dimBg,
                  border: `1px solid ${typeConfig.border}`,
                  padding: "2px 5px",
                  backdropFilter: "blur(4px)",
                }}
              >
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 900,
                    color: typeConfig.color,
                    fontFamily: "'Montserrat', sans-serif",
                    letterSpacing: "0.12em",
                  }}
                >
                  NEW
                </span>
              </div>
            )}
          </div>

          {/* Base Content (Always visible) */}
          <div
            style={{
              padding: compact ? "10px" : "12px",
              background: hovered ? V.elevated : V.surface,
              borderRadius: "0 0 8px 8px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
                gap: 6,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  minWidth: 0,
                }}
              >
                <TypeIcon type={item.type} size={11} />
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    color: typeConfig.color,
                    fontFamily: "'Montserrat', sans-serif",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.category || typeConfig.label}
                </span>
              </div>
              <VerifBadge tier={item.verificationTier} />
            </div>

            <p
              style={{
                fontSize: compact ? 11 : 13,
                fontWeight: 600,
                color: T.primary,
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.4,
                margin: 0,
                marginBottom: 6,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {item.title}
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: T.dim,
                  fontFamily: "'Poppins', sans-serif",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {subLine}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                {durationText && (
                  <span
                    style={{
                      fontSize: 9,
                      color: T.dim,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <SvgClock size={10} color={T.dim} /> {durationText}
                  </span>
                )}
                {showMatchScore && algoScore && (
                  <MatchScore score={algoScore} />
                )}
              </div>
            </div>
          </div>

          {/* PC Hover Dropdown Panel - The Dopamine Injector */}
          <AnimatePresence>
            {hovered && !isMobile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{
                  width: "100%",
                  background: V.elevated,
                  borderTop: `1px solid ${V.border}`,
                  padding: "12px",
                  borderRadius: "0 0 8px 8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {(item.platform || item.type === "video") && (
                    <PlatformLogo
                      platform={
                        item.platform ||
                        (item.type === "video" ? "youtube" : "other")
                      }
                      size={16}
                    />
                  )}
                  {item.difficulty && (
                    <span
                      style={{
                        fontSize: 9,
                        color: T.secondary,
                        fontFamily: "'Poppins', sans-serif",
                        background: "rgba(255,255,255,0.05)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      {item.difficulty}
                    </span>
                  )}
                  {item.type === "course" && item.scoreReward > 0 && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 900,
                        color: G.bright,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        fontFamily: "'Montserrat', sans-serif",
                        textShadow: `0 0 10px ${G.dimBg}`,
                        marginLeft: "auto",
                      }}
                    >
                      <SvgZap size={10} color={G.bright} />+{item.scoreReward}{" "}
                      pts
                    </span>
                  )}
                </div>

                {item.description && (
                  <p
                    style={{
                      fontSize: 10,
                      color: T.secondary,
                      lineHeight: 1.5,
                      fontFamily: "'Poppins', sans-serif",
                      margin: 0,
                      marginBottom: 12,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.description}
                  </p>
                )}

                {item.tags?.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginBottom: 12,
                    }}
                  >
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 8,
                          color: T.dim,
                          border: `1px solid ${V.border}`,
                          padding: "2px 6px",
                          fontFamily: "'Poppins', sans-serif",
                          borderRadius: 4,
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevents double firing if clicking the button vs the card
                    handleClick();
                  }}
                  style={{
                    width: "100%",
                    height: 36,
                    background: typeConfig.color,
                    color: "#000",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.12em",
                    fontFamily: "'Montserrat', sans-serif",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "filter 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.filter = "brightness(1.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.filter = "brightness(1)")
                  }
                >
                  {item.type === "course"
                    ? "View Course"
                    : item.type === "video"
                      ? "Watch Masterclass"
                      : item.type === "podcast"
                        ? "Listen Now"
                        : "Explore Resource"}
                  <SvgArrowRight size={14} color="#000" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  },
);

LearnCard.displayName = "LearnCard";
export default LearnCard;
