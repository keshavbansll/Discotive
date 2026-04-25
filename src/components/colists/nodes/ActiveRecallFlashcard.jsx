/**
 * @fileoverview ActiveRecallFlashcard — The Tension Block
 * @description
 * Psychological Hook: Variable reward + active cognitive engagement.
 * Press-and-hold reveals the answer with swelling animation + haptic buildup.
 * Mobile-first: touch-action pan-y, 44x44px min hit areas.
 * canvas-confetti dopamine burst on successful reveal.
 */

import React, { useState, useRef, useCallback, useEffect, memo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";

/* ─── Constants ────────────────────────────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  border: "rgba(191,162,100,0.25)",
  dimBg: "rgba(191,162,100,0.08)",
};
const T = {
  primary: "#F5F0E8",
  dim: "rgba(245,240,232,0.28)",
  secondary: "rgba(245,240,232,0.6)",
};

const hapticBuild = (progress) => {
  try {
    if (progress > 0.3 && progress < 0.35) navigator.vibrate?.([8]);
    if (progress > 0.6 && progress < 0.65) navigator.vibrate?.([12]);
    if (progress > 0.9 && progress < 0.95) navigator.vibrate?.([18]);
  } catch {}
};

const hapticReveal = () => {
  try {
    navigator.vibrate?.([25, 10, 35]);
  } catch {}
};

/* ─── Confetti burst ────────────────────────────────────────────────────── */
const fireConfetti = async () => {
  try {
    const confetti = (await import("canvas-confetti")).default;
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.6 },
      colors: ["#D4AF78", "#BFA264", "#E8D5A3", "#8B7240", "#ffffff"],
      ticks: 150,
      gravity: 1.2,
      scalar: 0.85,
    });
  } catch {
    // confetti not available — graceful degradation
  }
};

/* ─── Hold Progress Ring ───────────────────────────────────────────────── */
const HoldRing = memo(({ progress }) => {
  const size = 56;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(191,162,100,0.12)"
          strokeWidth={3.5}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={G.bright}
          strokeWidth={3.5}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${G.bright})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          animate={{ scale: 0.8 + progress * 0.4 }}
          className="font-black font-mono"
          style={{ fontSize: 10, color: G.bright }}
        >
          {Math.round(progress * 100)}%
        </motion.span>
      </div>
    </div>
  );
});

/* ─── Main Component ───────────────────────────────────────────────────── */
const ActiveRecallFlashcard = ({ block, textColor }) => {
  const { prompt, answer, hint, difficulty = "medium" } = block;
  const tc = textColor || T.primary;

  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [flipState, setFlipState] = useState("front"); // "front" | "flipping" | "back"

  const holdTimer = useRef(null);
  const holdStart = useRef(null);
  const animFrame = useRef(null);
  const HOLD_DURATION = 1200; // ms

  const difficultyConfig = {
    easy: { label: "Easy", color: "#4ADE80", bg: "rgba(74,222,128,0.08)" },
    medium: { label: "Medium", color: G.bright, bg: G.dimBg },
    hard: { label: "Hard", color: "#F87171", bg: "rgba(248,113,113,0.08)" },
  };
  const diff = difficultyConfig[difficulty] || difficultyConfig.medium;

  const startHold = useCallback(() => {
    if (revealed) return;
    setHolding(true);
    holdStart.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - holdStart.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);
      hapticBuild(progress);

      if (progress >= 1) {
        // Reveal!
        hapticReveal();
        setRevealed(true);
        setHolding(false);
        setFlipState("flipping");
        setTimeout(() => setFlipState("back"), 300);
        fireConfetti();
        return;
      }
      animFrame.current = requestAnimationFrame(tick);
    };
    animFrame.current = requestAnimationFrame(tick);
  }, [revealed]);

  const stopHold = useCallback(() => {
    if (revealed) return;
    setHolding(false);
    cancelAnimationFrame(animFrame.current);
    // Elastic spring back
    const start = holdProgress;
    const startTime = Date.now();
    const springBack = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / 300, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setHoldProgress(start * (1 - eased));
      if (t < 1) requestAnimationFrame(springBack);
      else setHoldProgress(0);
    };
    requestAnimationFrame(springBack);
  }, [revealed, holdProgress]);

  useEffect(
    () => () => {
      cancelAnimationFrame(animFrame.current);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setRevealed(false);
    setHoldProgress(0);
    setFlipState("front");
  }, []);

  return (
    <div
      className="h-full flex flex-col justify-center px-7 md:px-11 py-10 select-none"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* Brain icon */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C9.5 2 7.5 3.5 7 5.5C5 6 3.5 7.8 3.5 10C3.5 11.5 4.2 12.8 5.3 13.7C5.1 14.1 5 14.5 5 15C5 16.7 6.3 18 8 18H9V20C9 21.1 9.9 22 11 22H13C14.1 22 15 21.1 15 20V18H16C17.7 18 19 16.7 19 15C19 14.5 18.9 14.1 18.7 13.7C19.8 12.8 20.5 11.5 20.5 10C20.5 7.8 19 6 17 5.5C16.5 3.5 14.5 2 12 2Z"
                fill={G.bright}
                opacity="0.8"
              />
            </svg>
          </div>
          <span
            className="text-[9px] font-black uppercase tracking-[0.25em]"
            style={{ color: G.base }}
          >
            Active Recall
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
          style={{ background: diff.bg, borderColor: `${diff.color}40` }}
        >
          <span
            className="text-[8px] font-black uppercase tracking-wider"
            style={{ color: diff.color }}
          >
            {diff.label}
          </span>
        </div>
      </div>

      {/* Card flip container */}
      <div
        className="relative mx-auto w-full max-w-md"
        style={{ perspective: 1000, minHeight: 180 }}
      >
        <motion.div
          animate={{
            rotateY:
              flipState === "back" ? 180 : flipState === "flipping" ? 90 : 0,
            scale: holding ? 1.02 : 1,
          }}
          transition={{
            rotateY: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 0.15 },
          }}
          style={{
            transformStyle: "preserve-3d",
            position: "relative",
            minHeight: 180,
          }}
        >
          {/* FRONT — Prompt */}
          <div
            className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between"
            style={{
              backfaceVisibility: "hidden",
              background: holding
                ? `linear-gradient(135deg, rgba(191,162,100,0.12), rgba(191,162,100,0.04))`
                : "rgba(255,255,255,0.03)",
              border: holding
                ? `1.5px solid ${G.bright}`
                : "1.5px solid rgba(255,255,255,0.08)",
              boxShadow: holding
                ? `0 0 0 1px rgba(191,162,100,0.2), 0 8px 40px rgba(191,162,100,0.15), inset 0 0 30px rgba(191,162,100,0.06)`
                : "none",
              transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
              minHeight: 180,
            }}
          >
            {!revealed && (
              <>
                <div>
                  <p
                    className="font-display font-black leading-snug"
                    style={{
                      fontSize: "clamp(1rem, 2.8vw, 1.4rem)",
                      color: tc,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {prompt ||
                      "What is the primary psychological hook of this node?"}
                  </p>
                  {hint && (
                    <p
                      className="mt-3 text-xs font-medium italic"
                      style={{ color: `${tc}55` }}
                    >
                      Hint: {hint}
                    </p>
                  )}
                </div>

                {/* Blur overlay for answer preview */}
                <div
                  className="mt-4 rounded-xl px-4 py-3 relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <p
                    className="text-sm font-medium leading-relaxed"
                    style={{
                      color: tc,
                      filter: "blur(6px)",
                      userSelect: "none",
                    }}
                  >
                    {answer ||
                      "The answer is hidden. Hold to reveal the insight."}
                  </p>
                  <div
                    className="absolute inset-0 flex items-center justify-center rounded-xl"
                    style={{ backdropFilter: "blur(2px)" }}
                  >
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: `${tc}50` }}
                    >
                      Answer hidden
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* BACK — Answer */}
          <div
            className="absolute inset-0 rounded-2xl p-6 flex flex-col justify-between"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "linear-gradient(135deg, rgba(191,162,100,0.1), rgba(191,162,100,0.03))",
              border: `1.5px solid ${G.bright}`,
              boxShadow: `0 0 0 1px rgba(191,162,100,0.2), 0 8px 40px rgba(191,162,100,0.12)`,
              minHeight: 180,
            }}
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle
                    cx="8"
                    cy="8"
                    r="8"
                    fill={G.bright}
                    fillOpacity="0.2"
                  />
                  <path
                    d="M5 8L7.5 10.5L11 6"
                    stroke={G.bright}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className="text-[9px] font-black uppercase tracking-widest"
                  style={{ color: G.base }}
                >
                  Revealed
                </span>
              </div>
              <p
                className="font-medium leading-relaxed"
                style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)", color: tc }}
              >
                {answer ||
                  "Variable reward mechanisms drive 3x higher retention than passive reading."}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleReset}
              className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: T.dim,
                cursor: "pointer",
              }}
            >
              ↺ Practice again
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Hold CTA — hidden once revealed */}
      {!revealed && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <motion.button
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            whileTap={{ scale: 0.97 }}
            className="relative flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-pointer select-none"
            style={{
              background: holding ? G.dimBg : "rgba(255,255,255,0.04)",
              border: `1.5px solid ${holding ? G.bright : "rgba(255,255,255,0.08)"}`,
              transition: "border-color 0.2s, background 0.2s",
              minHeight: 52,
              touchAction: "none",
            }}
          >
            <HoldRing progress={holdProgress} />
            <div className="flex flex-col items-start">
              <span
                className="font-black text-sm"
                style={{
                  color: holding ? G.bright : tc,
                  transition: "color 0.2s",
                }}
              >
                {holding ? "Keep holding…" : "Hold to reveal"}
              </span>
              <span
                className="text-[9px] font-mono mt-0.5"
                style={{ color: T.dim }}
              >
                {holding
                  ? `${Math.round(holdProgress * 100)}% charged`
                  : "Press & hold the card"}
              </span>
            </div>
          </motion.button>

          {/* Swipe guard hint */}
          <p
            className="text-[8px] font-mono text-center"
            style={{ color: `${tc}25` }}
          >
            Swipe left/right to navigate · Hold above to unlock
          </p>
        </div>
      )}
    </div>
  );
};

export default memo(ActiveRecallFlashcard);
