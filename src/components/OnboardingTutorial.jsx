import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const TUTORIAL_KEY = "disc_tut_v2";

const STEPS = [
  {
    id: "welcome",
    emoji: "⚡",
    color: "#BFA264",
    shadow: "rgba(191,162,100,0.25)",
    title: "Your Command Center.",
    body: "Every career decision, credential, and connection lives here. Discotive converts ambition into a scored, verifiable execution system visible to the world.",
    cta: "Show me around",
  },
  {
    id: "score",
    emoji: "🎯",
    color: "#D4AF78",
    shadow: "rgba(212,175,120,0.25)",
    title: "The Discotive Score.",
    body: "Your global performance index — starting at 50 points. Complete tasks, verify credentials, forge alliances, and maintain streaks. Every action moves the number.",
    cta: "Got it",
  },
  {
    id: "consistency",
    emoji: "🔥",
    color: "#f97316",
    shadow: "rgba(249,115,22,0.25)",
    title: "The Consistency Engine.",
    body: "Log in every day. Miss a day and lose 15 points. The engine exists to reward operators who show up — not those who sprint and disappear.",
    cta: "Understood",
  },
  {
    id: "vault",
    emoji: "🔒",
    color: "#4ADE80",
    shadow: "rgba(74,222,128,0.25)",
    title: "Your Asset Vault.",
    body: "Upload certificates, projects, and credentials. Our team verifies each one. Verified assets earn Score points and appear on your public profile as proof of work.",
    cta: "Continue",
  },
  {
    id: "arena",
    emoji: "🏆",
    color: "#38bdf8",
    shadow: "rgba(56,189,248,0.25)",
    title: "The Global Arena.",
    body: "Compete against operators in your domain. Track rivals, forge alliances, and climb the leaderboard. Your rank updates live as scores shift across the platform.",
    cta: "Launch OS",
    isLast: true,
  },
];

const OnboardingTutorial = ({ uid, onDismiss }) => {
  const [step, setStep] = useState(0);

  const dismiss = useCallback(
    async (completed = false) => {
      localStorage.setItem(TUTORIAL_KEY, "1");
      onDismiss?.();
      if (uid) {
        try {
          await updateDoc(doc(db, "users", uid), {
            "meta.tutorialSeen": true,
            "meta.tutorialCompletedAt": new Date().toISOString(),
          });
        } catch (_) {}
      }
    },
    [uid, onDismiss],
  );

  const current = STEPS[step];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: "rgba(3,3,3,0.93)", backdropFilter: "blur(24px)" }}
    >
      {/* Ambient glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id + "_bg"}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.8 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 45%, ${current.shadow} 0%, transparent 60%)`,
          }}
        />
      </AnimatePresence>

      {/* Skip */}
      <button
        onClick={() => dismiss(false)}
        className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] font-black text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors z-10"
      >
        Skip <X className="w-3 h-3" />
      </button>

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className="relative w-full max-w-sm flex flex-col items-center text-center z-10"
        >
          {/* Icon */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-[100px] h-[100px] rounded-[2rem] flex items-center justify-center text-5xl mb-8 relative"
            style={{
              background: `rgba(${current.color === "#BFA264" ? "191,162,100" : current.color === "#D4AF78" ? "212,175,120" : current.color === "#f97316" ? "249,115,22" : current.color === "#4ADE80" ? "74,222,128" : "56,189,248"},0.08)`,
              border: `1px solid ${current.color}30`,
              boxShadow: `0 0 60px ${current.shadow}`,
            }}
          >
            {current.emoji}
            <motion.div
              className="absolute inset-0 rounded-[2rem]"
              animate={{ opacity: [0, 0.25, 0] }}
              transition={{ duration: 2.8, repeat: Infinity }}
              style={{
                background: `radial-gradient(circle, ${current.color}20, transparent)`,
              }}
            />
          </motion.div>

          <h2
            className="font-black text-[2rem] text-white mb-4 leading-tight"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              letterSpacing: "-0.03em",
            }}
          >
            {current.title}
          </h2>
          <p className="text-[15px] text-white/45 leading-relaxed mb-10 max-w-[300px] font-light">
            {current.body}
          </p>

          <button
            onClick={() => {
              if (current.isLast) dismiss(true);
              else setStep((s) => s + 1);
            }}
            className="flex items-center gap-3 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl"
            style={{
              background: `linear-gradient(135deg, #8B7240, #D4AF78)`,
              color: "#000",
              boxShadow: `0 0 40px ${current.shadow}`,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            {current.cta}
            {!current.isLast && <ArrowRight className="w-4 h-4" />}
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  background:
                    i === step ? current.color : "rgba(255,255,255,0.12)",
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
};

export default OnboardingTutorial;
