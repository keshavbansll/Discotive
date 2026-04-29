import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { X, Zap, CheckCircle2, Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/cn";

/**
 * @fileoverview PremiumPaywall
 * MAANG-grade conversion module.
 * PC: Full-viewport 100% width, borderless, dark faded glassmorphism. Left info, Right split (Top Image fading down, Bottom large normal typography).
 * Mobile: Non-scrollable vertical stack with top safe-area padding. Interactive physics-based Swipe-to-Upgrade button.
 */

// --- Interactive Mobile Swipe Button ---
const SwipeToUpgrade = ({ onComplete }) => {
  const [isCompleted, setIsCompleted] = useState(false);
  const containerRef = useRef(null);
  const x = useMotionValue(0);

  const handleDragEnd = (event, info) => {
    const containerWidth = containerRef.current?.offsetWidth || 300;
    const knobWidth = 56; // 14 * 4
    const maxDrag = containerWidth - knobWidth - 8; // padding account
    const threshold = maxDrag * 0.65; // 65% drag threshold to unlock

    if (info.offset.x >= threshold || x.get() >= threshold) {
      setIsCompleted(true);
      // Snap to end smoothly
      animate(x, maxDrag, {
        type: "spring",
        stiffness: 400,
        damping: 25,
      });
      setTimeout(() => {
        onComplete();
      }, 350);
    } else {
      // Snap back to start if threshold isn't met
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  };

  // Dynamic fill width based on drag position
  const fillWidth = useTransform(x, (value) => `calc(${value}px + 3.5rem)`);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-16 bg-[#111]/60 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 flex items-center shadow-inner"
    >
      {/* Expanding Gradient Fill */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#E8D5A3] via-[#D4AF78] to-[#BFA264]"
        style={{ width: isCompleted ? "100%" : fillWidth }}
        transition={{ duration: 0.3 }}
      />

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <span
          className={cn(
            "text-xs font-bold uppercase tracking-[0.2em] transition-colors duration-300 font-sans",
            isCompleted ? "text-[#030303]" : "text-white/60",
          )}
        >
          {isCompleted ? "Unlocked" : "Swipe to Upgrade"}
        </span>
      </div>

      {/* Draggable Knob */}
      <motion.div
        drag={isCompleted ? false : "x"}
        dragConstraints={containerRef}
        dragElastic={0.05}
        dragSnapToOrigin={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="absolute left-1 w-14 h-14 bg-[#030303] rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 z-20"
      >
        {isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-[#BFA264]" />
        ) : (
          <ChevronRight className="w-6 h-6 text-[#BFA264]/70" />
        )}
      </motion.div>
    </div>
  );
};

// --- Main Paywall Component ---
const PremiumPaywall = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Strict scroll-lock at the OS level when active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // Prevent iOS bounce
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen]);

  const handleUpgrade = () => {
    onClose();
    navigate("/premium");
  };

  const features = [
    "Advanced metrices",
    "Priority Verifications",
    "Deep X-Ray Analytics",
    "AI Suggestions",
    "Agenda Unlocked",
  ];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{
            type: "spring",
            damping: 32,
            stiffness: 240,
            mass: 0.8,
          }}
          className="fixed inset-0 z-[999999] flex flex-col md:flex-row w-full h-[100dvh] overflow-hidden bg-[#030303]/90 backdrop-blur-3xl border-0"
        >
          {/* Universal Top-Right Close Button */}
          <button
            onClick={onClose}
            title="Close Premium Environment"
            className="absolute top-6 right-6 md:top-8 md:right-8 z-50 p-2 text-[#888] hover:text-white transition-colors active:scale-95 bg-transparent border-0 outline-none"
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>

          {/* ========================================= */}
          {/* MOBILE LAYOUT (Native App Stack)          */}
          {/* ========================================= */}
          <div className="md:hidden flex flex-col w-full h-[100dvh] relative bg-[#030303]/60">
            {/* Background Image anchored bottom, fading up & down for seamless blend */}
            <div className="absolute inset-x-0 bottom-0 h-[60%] z-0 flex flex-col justify-end pointer-events-none">
              <div className="relative w-full h-full">
                <img
                  src="/pro-promo.jpg"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent" />
                {/* Seamless native fade to blend the harsh top edge of the image */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#030303] to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Top Area: Safe padding (pt-24) to prevent browser tab blockage, Black fade, Features */}
            <div className="flex-1 px-6 relative z-10 flex flex-col pt-24">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#BFA264]/30 bg-[#141414]/80 backdrop-blur-md mb-6 w-max shadow-[0_0_15px_rgba(191,162,100,0.05)]">
                <Shield className="w-3.5 h-3.5 text-[#D4AF78]" />
                <span className="font-sans text-[9px] font-black text-[#BFA264] uppercase tracking-[0.2em]">
                  Premium Access
                </span>
              </div>

              <h2 className="font-sans font-normal text-4xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-3 leading-tight">
                Discipline engineered.
                <br />
                Execution unlocked.
              </h2>

              <p className="font-sans font-normal text-sm text-[#888] tracking-wide mb-8">
                Elevate your discipline instantly.
              </p>

              <div className="space-y-4">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-[#BFA264]/10 border border-[#BFA264]/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-[#D4AF78]" />
                    </div>
                    <span className="font-sans font-normal text-sm text-[#ccc] tracking-wide">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Area: Pricing & Interactive Swipe Button */}
            <div className="relative z-20 shrink-0 flex flex-col justify-end px-6 pb-12 pt-6">
              <div className="flex flex-col w-full text-center">
                <span className="font-sans text-[10px] font-black uppercase tracking-[0.2em] mb-1 text-transparent bg-clip-text bg-gradient-to-r from-[#E8D5A3] to-[#BFA264]">
                  Limited Offer
                </span>
                <div className="flex items-baseline justify-center gap-2 mb-8">
                  <span className="font-sans text-lg font-normal text-[#666] line-through decoration-[#F87171]/50">
                    ₹139
                  </span>
                  <span className="font-sans text-5xl font-normal text-white tracking-tight">
                    ₹99
                  </span>
                  <span className="font-sans text-sm font-normal text-[#666] ml-1">
                    /mo
                  </span>
                </div>

                <SwipeToUpgrade onComplete={handleUpgrade} />
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* PC LAYOUT (Full Screen Split View)        */}
          {/* ========================================= */}
          <div className="hidden md:flex w-full h-full relative z-10 bg-transparent">
            {/* Left Side: Analytical Information */}
            <div className="w-1/2 h-full flex flex-col justify-center px-12 lg:px-24 xl:px-32 relative z-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#BFA264]/30 bg-[#141414]/60 backdrop-blur-md mb-8 w-max shadow-[0_0_15px_rgba(191,162,100,0.05)]">
                <Shield className="w-3.5 h-3.5 text-[#D4AF78]" />
                <span className="font-sans text-[10px] font-black text-[#BFA264] uppercase tracking-[0.2em]">
                  Premium Access
                </span>
              </div>

              <h2 className="font-sans font-normal text-5xl lg:text-7xl tracking-tighter text-white mb-4 leading-none">
                Unlock the full <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8D5A3] to-[#BFA264]">
                  Career Engine.
                </span>
              </h2>

              <p className="font-sans font-normal text-base lg:text-lg text-[#888] tracking-wide mb-12 leading-relaxed">
                Elevate your discipline instantly.
              </p>

              <div className="space-y-5">
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#BFA264]/10 border border-[#BFA264]/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF78]" />
                    </div>
                    <span className="font-sans font-normal text-base text-[#ccc] tracking-wide">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Visual & Conversion (Image Top -> Fades to Black -> Large Typography Bottom) */}
            <div className="w-1/2 h-full flex flex-col relative z-20 bg-[#030303]">
              {/* Seamless Blend Gradient removing the hard border */}
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#030303]/90 via-[#030303]/40 to-transparent pointer-events-none z-30" />

              {/* Top Half: Faded Down Image */}
              <div className="h-[55%] relative w-full overflow-hidden">
                <img
                  src="/pro-promo.jpg"
                  alt="Pro Background"
                  className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030303]/60 to-[#030303]" />
              </div>

              {/* Bottom Half: Normal Poppins Typography & Action */}
              <div className="h-[45%] w-full flex flex-col justify-center px-12 lg:px-24 pb-12 relative z-10 bg-[#030303]">
                <h3 className="font-sans font-normal text-3xl lg:text-4xl xl:text-5xl tracking-tight mb-12 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 leading-[1.1]">
                  Discipline engineered. <br />
                  Execution unlocked.
                </h3>

                <div className="flex items-center justify-between gap-6 w-full">
                  <div className="flex flex-col">
                    <span className="font-sans text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#E8D5A3] to-[#BFA264]">
                      Limited Offer
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-sans text-xl lg:text-2xl font-normal text-[#666] line-through decoration-[#F87171]/50">
                        ₹139
                      </span>
                      <span className="font-sans text-4xl lg:text-5xl font-normal text-white tracking-tight">
                        ₹99
                      </span>
                      <span className="font-sans text-sm font-normal text-[#666] ml-1">
                        /mo
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleUpgrade}
                    className="px-8 lg:px-12 py-5 bg-gradient-to-r from-[#E8D5A3] via-[#D4AF78] to-[#BFA264] text-[#030303] rounded-2xl font-extrabold text-sm uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(191,162,100,0.25)] hover:scale-[1.02] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3 shrink-0 font-sans"
                  >
                    <Zap className="w-5 h-5 fill-current" /> Upgrade
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PremiumPaywall;
