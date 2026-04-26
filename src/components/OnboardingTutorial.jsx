import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const TUTORIAL_KEY = "disc_tut_v3_spotlight";

const STEPS = [
  {
    id: "tut-consistency",
    title: "Consistency Chart",
    body: "This matrix tracks your daily execution. Show up consistently to maintain your velocity. Miss a day, lose points.",
  },
  {
    id: "tut-streak-milestones",
    title: "Streak Milestones",
    body: "Hit these milestones to unlock permanent profile badges and score multipliers.",
  },
  {
    id: "tut-live-signal",
    title: "Live Signal",
    body: "Real-time updates from the network. System syncs, score changes, and alerts drop here.",
  },
  {
    id: "tut-agenda",
    title: "Command Agenda",
    body: "Your latest execution logs and plans. Document your daily moves to keep yourself accountable.",
  },
  {
    id: "tut-learn",
    title: "Discotive Learn",
    body: "Verified courses and tactical resources specific to your domain. Complete them to earn score.",
  },
  {
    id: "tut-alliances",
    title: "Alliances",
    body: "Your trusted network. Monitor the score velocity of your allies.",
  },
  {
    id: "tut-rivals",
    title: "Rivals",
    body: "Keep your enemies closer. Track top operators to benchmark your performance against theirs.",
  },
  {
    id: "tut-opportunities",
    title: "Latest Opportunities",
    body: "Domain-matched gigs, bounties, and exclusive roles directly from the Discotive network.",
  },
  {
    id: "tut-velocity",
    title: "Score Velocity",
    body: "Your momentum mapped over time. An upward trajectory proves you are executing.",
  },
  {
    id: "tut-position",
    title: "Position Matrix",
    body: "Your exact rank across the Global, Domain, and Path axes.",
  },
  {
    id: "tut-quick-actions",
    title: "Quick Actions",
    body: "Fast-travel to core modules. Everything is one tap away.",
  },
  {
    id: "tut-nav",
    title: "Discotive OS",
    body: "Navigate the full operating system. Your execution engine is ready. Let's build.",
  },
];

const PADDING = 12;

const OnboardingTutorial = ({ uid, onDismiss }) => {
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // O(1) DOM caching refs to prevent layout thrashing on mobile
  const activeElementRef = useRef(null);
  const trackingRafRef = useRef(null);

  const current = STEPS[step];

  const dismiss = useCallback(async () => {
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
  }, [uid, onDismiss]);

  const updateSpotlight = useCallback(() => {
    // Only query the DOM once per step change
    const elements = document.querySelectorAll(
      `.${current.id}, #${current.id}`,
    );
    let found = null;
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (
        rect.width > 0 &&
        rect.height > 0 &&
        window.getComputedStyle(el).display !== "none"
      ) {
        found = el;
        break;
      }
    }

    if (found) {
      activeElementRef.current = found;
      found.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      // Frame-perfect tracking via cached ref (Zero querySelector overhead)
      const start = Date.now();
      const track = () => {
        if (activeElementRef.current) {
          const rect = activeElementRef.current.getBoundingClientRect();
          setTargetRect({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
        }
        // Track fluidly during the standard 850ms browser smooth scroll window
        if (Date.now() - start < 850) {
          trackingRafRef.current = requestAnimationFrame(track);
        }
      };

      if (trackingRafRef.current) cancelAnimationFrame(trackingRafRef.current);
      trackingRafRef.current = requestAnimationFrame(track);
    } else {
      // Graceful fallback: If an element is totally hidden on this device size, skip it automatically
      if (step < STEPS.length - 1) setStep((s) => s + 1);
      else dismiss();
    }
  }, [current.id, step, dismiss]);

  useEffect(() => {
    updateSpotlight();

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateSpotlight();
    };

    // Hardware-accelerated passive scroll throttle
    let scrollRaf = null;
    const handleScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        if (activeElementRef.current) {
          const rect = activeElementRef.current.getBoundingClientRect();
          if (rect.width > 0) {
            setTargetRect({
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            });
          }
        }
        scrollRaf = null;
      });
    };

    window.addEventListener("resize", handleResize, { passive: true });
    // Capture phase true to catch nested scrollable divs, passive true for 60fps scrolling
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (trackingRafRef.current) cancelAnimationFrame(trackingRafRef.current);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
    };
  }, [updateSpotlight]);

  if (!targetRect)
    return createPortal(
      <div className="fixed inset-0 z-[99999] bg-[#030303]/95" />,
      document.body,
    );

  const TOOLTIP_W = 300;
  const TOOLTIP_EST_H = 280;

  let tooltipX = targetRect.x + targetRect.width / 2 - TOOLTIP_W / 2;
  if (tooltipX < 20) tooltipX = 20;
  if (tooltipX + TOOLTIP_W > windowSize.width - 20)
    tooltipX = windowSize.width - TOOLTIP_W - 20;

  let tooltipY = targetRect.y + targetRect.height + PADDING + 24;
  if (tooltipY + TOOLTIP_EST_H > windowSize.height) {
    tooltipY = targetRect.y - PADDING - TOOLTIP_EST_H - 24;
  }
  if (tooltipY < 20) {
    tooltipY = windowSize.height - TOOLTIP_EST_H - 20;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] pointer-events-auto overflow-hidden">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              animate={{
                x: targetRect.x - PADDING,
                y: targetRect.y - PADDING,
                width: targetRect.width + PADDING * 2,
                height: targetRect.height + PADDING * 2,
              }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              rx={16}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(3,3,3,0.92)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      <motion.div
        className="absolute pointer-events-none rounded-2xl border border-white/60 shadow-[0_0_40px_rgba(255,255,255,0.15)]"
        animate={{
          x: targetRect.x - PADDING,
          y: targetRect.y - PADDING,
          width: targetRect.width + PADDING * 2,
          height: targetRect.height + PADDING * 2,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ willChange: "transform" }}
      />

      <motion.div
        className="absolute bg-white rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[300px] flex flex-col pointer-events-auto"
        animate={{ x: tooltipX, y: tooltipY }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ willChange: "transform" }}
      >
        <div className="flex items-center justify-between mb-3">
          {/* COLOR FIX: Changed to text-black */}
          <span className="text-[10px] font-black uppercase tracking-widest text-black">
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={dismiss}
            className="w-6 h-6 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black/40 hover:text-black transition-colors"
          >
            <X size={12} />
          </button>
        </div>
        <h3 className="font-display font-black text-xl text-black leading-tight mb-2 tracking-tight">
          {current.title}
        </h3>
        <p className="text-xs text-[#555] font-body leading-relaxed mb-6">
          {current.body}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <button
            onClick={() => step > 0 && setStep((s) => s - 1)}
            className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step > 0 ? "text-[#888] hover:text-black" : "text-transparent pointer-events-none"}`}
          >
            Back
          </button>
          <button
            onClick={() => {
              if (step < STEPS.length - 1) setStep((s) => s + 1);
              else dismiss();
            }}
            className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            {step < STEPS.length - 1 ? "Next" : "Finish"}{" "}
            <ArrowRight size={12} />
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default OnboardingTutorial;
