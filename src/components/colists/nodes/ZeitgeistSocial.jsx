/**
 * @fileoverview ZeitgeistSocial — External Social Proof Node
 * @description
 * Psychological Hook: Grounding internal intelligence with real-world validation.
 * Scrapes OG metadata via /api/scrape-og Vercel edge function.
 * Timeout: 2.5s hard abort → elegantly styled fallback state.
 * Re-renders natively in Discotive Gold/Void design system — no third-party iframes.
 * Cached at CDN layer (s-maxage=86400) — zero repeat fetch cost.
 */

import React, { useState, useEffect, memo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

/* ─── Constants ────────────────────────────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  border: "rgba(191,162,100,0.25)",
  dimBg: "rgba(191,162,100,0.08)",
};
const T = {
  primary: "#F5F0E8",
  dim: "rgba(245,240,232,0.28)",
  secondary: "rgba(245,240,232,0.6)",
};
const V = { surface: "#0F0F0F", elevated: "#141414" };

/* ─── Platform icon map ─────────────────────────────────────────────────── */
const PlatformIcon = memo(({ platform, size = 16 }) => {
  const icons = {
    twitter: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
      </svg>
    ),
    linkedin: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    github: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    external: (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
    ),
  };
  return icons[platform] || icons.external;
});

const platformColors = {
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  github: "#E6EDF3",
  youtube: "#FF0000",
  instagram: "#E1306C",
  external: G.bright,
};

/* ─── Skeleton loader ───────────────────────────────────────────────────── */
const SkeletonPulse = memo(
  ({ width = "100%", height = 14, className = "" }) => (
    <motion.div
      animate={{ opacity: [0.3, 0.65, 0.3] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className={`rounded-lg ${className}`}
      style={{ width, height, background: "rgba(255,255,255,0.06)" }}
    />
  ),
);

/* ─── Signal Lost fallback ──────────────────────────────────────────────── */
const SignalLost = memo(({ url, platform }) => (
  <div
    className="flex flex-col items-center justify-center py-10 px-8 text-center rounded-2xl"
    style={{
      background: "rgba(191,162,100,0.05)",
      border: `1px solid rgba(191,162,100,0.15)`,
      minHeight: 140,
    }}
  >
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center mb-4 opacity-40"
      style={{ background: G.dimBg }}
    >
      <PlatformIcon platform={platform || "external"} size={18} />
    </div>
    <p
      className="text-xs font-black uppercase tracking-widest mb-1.5"
      style={{ color: `${G.base}80` }}
    >
      External Signal Lost
    </p>
    <p className="text-[10px] font-mono" style={{ color: T.dim }}>
      Proceeding with internal data
    </p>
    {url && (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 text-[9px] font-bold underline underline-offset-2"
        style={{ color: `${G.bright}60` }}
        onClick={(e) => e.stopPropagation()}
      >
        Open original link ↗
      </a>
    )}
  </div>
));

/* ─── Main Component ───────────────────────────────────────────────────── */
const ZeitgeistSocial = ({ block, textColor }) => {
  const { url, caption, label } = block;
  const tc = textColor || T.primary;

  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState(url ? "loading" : "error"); // "loading" | "loaded" | "error" | "timeout"
  const [prevUrl, setPrevUrl] = useState(url);

  // MAANG STANDARD: Derive state during render for prop changes using state, avoiding ref mutations in render phase
  if (url !== prevUrl) {
    setPrevUrl(url);
    setStatus(url ? "loading" : "error");
    setMeta(null);
  }

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
      if (!cancelled) setStatus("timeout");
    }, 2500);

    const fetchMeta = async () => {
      try {
        const res = await fetch(
          `/api/scrape-og?url=${encodeURIComponent(url)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("upstream_error");
        const data = await res.json();
        if (cancelled) return;
        if (data.error && !data.title) {
          setStatus("error");
          return;
        }
        setMeta(data);
        setStatus("loaded");
      } catch (err) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (err.name === "AbortError") {
          setStatus("timeout");
        } else {
          setStatus("error");
        }
      }
    };

    fetchMeta();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [url]);

  const platform =
    meta?.platform ||
    (() => {
      try {
        const host = new URL(url || "").hostname.replace("www.", "");
        if (host.includes("twitter.com") || host.includes("x.com"))
          return "twitter";
        if (host.includes("linkedin")) return "linkedin";
        if (host.includes("github")) return "github";
        if (host.includes("youtube") || host.includes("youtu.be"))
          return "youtube";
        if (host.includes("instagram")) return "instagram";
        return "external";
      } catch {
        return "external";
      }
    })();

  const platformColor = platformColors[platform] || G.bright;

  return (
    <div
      className="h-full flex flex-col justify-center px-7 md:px-11 py-10"
      style={{ touchAction: "pan-y" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${platformColor}15`,
            border: `1px solid ${platformColor}30`,
            color: platformColor,
          }}
        >
          <PlatformIcon platform={platform} size={13} />
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-[0.25em]"
          style={{ color: G.base }}
        >
          {label || "External Signal"}
        </span>
        <div
          className="flex-1 h-px"
          style={{
            background: `linear-gradient(to right, rgba(191,162,100,0.2), transparent)`,
          }}
        />
      </div>

      {/* Card body */}
      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: V.elevated,
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-start gap-3">
              <SkeletonPulse
                width={40}
                height={40}
                className="shrink-0 rounded-xl"
              />
              <div className="flex-1 space-y-2">
                <SkeletonPulse width="75%" height={14} />
                <SkeletonPulse width="50%" height={11} />
              </div>
            </div>
            <SkeletonPulse width="90%" height={11} />
            <SkeletonPulse width="65%" height={11} />
          </motion.div>
        )}

        {(status === "error" || status === "timeout") && (
          <motion.div
            key="fallback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <SignalLost url={url} platform={platform} />
          </motion.div>
        )}

        {status === "loaded" && meta && (
          <motion.a
            key="card"
            href={url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.015, transition: { duration: 0.2 } }}
            className="block rounded-2xl overflow-hidden cursor-pointer"
            style={{
              background: V.elevated,
              border: `1px solid rgba(255,255,255,0.06)`,
              textDecoration: "none",
              boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
            }}
          >
            {/* OG Image */}
            {meta.image && (
              <div
                className="relative w-full overflow-hidden"
                style={{ maxHeight: 180 }}
              >
                <img
                  src={meta.image}
                  alt=""
                  className="w-full object-cover"
                  style={{ maxHeight: 180 }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                {/* Gradient scrim */}
                <div
                  className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(20,20,20,0.95), transparent)",
                  }}
                />
                {/* Platform pill over image */}
                <div
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(8px)",
                    border: `1px solid ${platformColor}40`,
                    color: platformColor,
                  }}
                >
                  <PlatformIcon platform={platform} size={10} />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    {meta.siteName || platform}
                  </span>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              {/* No image — show platform pill inline */}
              {!meta.image && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-3"
                  style={{
                    background: `${platformColor}12`,
                    border: `1px solid ${platformColor}30`,
                    color: platformColor,
                  }}
                >
                  <PlatformIcon platform={platform} size={10} />
                  <span className="text-[8px] font-black uppercase tracking-widest">
                    {meta.siteName || platform}
                  </span>
                </div>
              )}

              {meta.twitterCreator && (
                <p
                  className="text-[9px] font-black font-mono mb-1.5"
                  style={{ color: platformColor }}
                >
                  {meta.twitterCreator}
                </p>
              )}

              {meta.title && (
                <h3
                  className="font-display font-black leading-snug mb-2"
                  style={{
                    fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
                    color: T.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {meta.title.length > 100
                    ? `${meta.title.slice(0, 100)}…`
                    : meta.title}
                </h3>
              )}

              {meta.description && (
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: T.secondary }}
                >
                  {meta.description.length > 200
                    ? `${meta.description.slice(0, 200)}…`
                    : meta.description}
                </p>
              )}

              {/* URL footer */}
              <div
                className="mt-3 pt-3 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <span className="text-[9px] font-mono" style={{ color: T.dim }}>
                  {(() => {
                    try {
                      return new URL(url).hostname.replace("www.", "");
                    } catch {
                      return url;
                    }
                  })()}
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: platformColor, opacity: 0.7 }}
                >
                  Open ↗
                </span>
              </div>
            </div>
          </motion.a>
        )}
      </AnimatePresence>

      {/* Caption / context */}
      {caption && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-xs leading-relaxed italic"
          style={{ color: `${tc}70` }}
        >
          {caption}
        </motion.p>
      )}
    </div>
  );
};

export default memo(ZeitgeistSocial);
