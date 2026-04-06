/**
 * @fileoverview Discotive OS - Executive Feedback Module
 * @module Components/FeedbackModal
 * @description
 * High-fidelity, mobile-responsive feedback modal.
 *
 * SCHEMA (Firestore: feedback/{uid}):
 *   uid           string   — User's Firebase Auth UID
 *   email         string   — User's email for admin tracking
 *   rating        number   — Half-star rating 0.5–5
 *   recommendation string  — One of: "a_drag" | "average" | "powerful" | "game_changer"
 *   comments      string   — Optional free-text (max 1000 chars)
 *   updatedAt     timestamp — Firestore server timestamp (always overwritten)
 *
 * ANTI-SPAM: Uses setDoc({ merge: true }) with the user's UID as the document
 * ID. A user can only ever have ONE feedback document. Resubmitting overwrites
 * the previous entry — it never creates a new document.
 *
 * FIX LOG:
 *   1. Removed stray top-level JSX expression that was crashing the module
 *      at import time and preventing any submission from ever firing.
 *   2. Confirmed field names match the Firestore schema read by
 *      EfficiencyMeterWidget (uses `recommendation`) and AdminDashboard
 *      (now corrected to use `recommendation` and `comments`).
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Send, ShieldCheck, MessageSquare } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { db } from "../firebase";
import { cn } from "./../lib/cn";

// ── Recommendation option definitions ────────────────────────────────────────
// id values MUST match the keys tallied in EfficiencyMeterWidget's DEM_SCHEMA.
const RECOMMEND_OPTIONS = [
  {
    id: "a_drag",
    label: "A Drag",
    hoverBorder: "hover:border-[#fb7185]",
    activeStyle: "bg-[#fb7185]/10 border-[#fb7185] text-[#fb7185]",
  },
  {
    id: "average",
    label: "Average",
    hoverBorder: "hover:border-[#f59e0b]",
    activeStyle: "bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]",
  },
  {
    id: "powerful",
    label: "Powerful",
    hoverBorder: "hover:border-[#10b981]",
    activeStyle: "bg-[#10b981]/10 border-[#10b981] text-[#10b981]",
  },
  {
    id: "game_changer",
    label: "A Game-Changer",
    hoverBorder: "hover:border-[#a855f7]",
    activeStyle:
      "bg-[#a855f7] border-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
const FeedbackModal = ({ isOpen, onClose, user }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Reset all fields every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setRecommendation("");
      setComments("");
      setIsSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const isFormValid = rating > 0 && recommendation !== "";

  const handleSubmit = async () => {
    if (!isFormValid || isSubmitting) return;

    // Guard: user object must exist with a uid. If it doesn't, surface the
    // error instead of silently failing inside the catch block.
    if (!user?.uid) {
      setSubmitError("Authentication error. Please sign out and sign back in.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitFeedback = httpsCallable(functions, "submitFeedback");

      await submitFeedback({
        rating,
        recommendation,
        comments: comments.trim(),
      });

      setIsSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (error) {
      console.error("[FeedbackModal] Cloud Function submission failed:", error);
      setSubmitError("Submission failed. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Half-star rating renderer (WCAG Compliant) ──────────────────────────────
  const renderStars = () => {
    return (
      <div
        className="flex items-center justify-center gap-1.5 mb-4"
        role="radiogroup"
        aria-label="Rate the efficiency of Discotive from 0.5 to 5 stars"
      >
        {[1, 2, 3, 4, 5].map((index) => {
          const activeRating = hoverRating > 0 ? hoverRating : rating;
          const isFull = activeRating >= index;
          const isHalf = activeRating >= index - 0.5 && activeRating < index;

          return (
            <div
              key={index}
              className="relative w-8 h-8 md:w-9 md:h-9 touch-manipulation transition-transform hover:scale-110"
            >
              {/* Accessible hit zones — left half sets half-star, right half sets full */}
              <div className="absolute inset-0 z-20 flex">
                <div
                  className="w-1/2 h-full outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset"
                  onClick={() => setRating(index - 0.5)}
                  onMouseEnter={() => setHoverRating(index - 0.5)}
                  onMouseLeave={() => setHoverRating(0)}
                  role="radio"
                  aria-checked={rating === index - 0.5}
                  tabIndex={0}
                  aria-label={`${index - 0.5} stars`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRating(index - 0.5);
                    }
                  }}
                />
                <div
                  className="w-1/2 h-full outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-inset"
                  onClick={() => setRating(index)}
                  onMouseEnter={() => setHoverRating(index)}
                  onMouseLeave={() => setHoverRating(0)}
                  role="radio"
                  aria-checked={rating === index}
                  tabIndex={0}
                  aria-label={`${index} stars`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setRating(index);
                    }
                  }}
                />
              </div>

              {/* Empty star (background layer) */}
              <Star
                className="absolute inset-0 w-full h-full text-[#333]"
                strokeWidth={1.5}
              />

              {/* Half-star fill */}
              {isHalf && (
                <div className="absolute inset-0 w-1/2 overflow-hidden z-10 pointer-events-none">
                  <Star
                    className="w-8 h-8 md:w-9 md:h-9 text-[#D4AF37] fill-[#D4AF37]"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Full-star fill */}
              {isFull && (
                <Star
                  className="absolute inset-0 w-full h-full text-[#D4AF37] fill-[#D4AF37] z-10 pointer-events-none"
                  strokeWidth={1.5}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#030303]/80 backdrop-blur-md overflow-y-auto custom-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm md:max-w-md bg-[#0a0a0a] rounded-3xl border border-[#222222] shadow-2xl flex flex-col my-auto"
        >
          {/* ── HEADER ── */}
          <div className="px-4 py-3.5 md:px-5 md:py-4 flex justify-between items-center border-b border-[#222222] bg-[#050505] rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#111111] border border-[#222222] flex items-center justify-center">
                <MessageSquare className="w-3.5 h-3.5 text-[#D4AF37]" />
              </div>
              <h3 className="text-sm font-semibold text-white tracking-tight font-serif">
                DEM Report
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting || isSuccess}
              className="p-1.5 bg-[#111111] hover:bg-[#222222] rounded-full transition-colors text-slate-400 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── BODY ── */}
          <div className="p-4 md:p-6 flex-1 overflow-y-auto">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center h-full"
              >
                <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-full flex items-center justify-center mb-4 border border-[#D4AF37]/20">
                  <ShieldCheck className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-serif text-white mb-1.5">
                  Report Logged.
                </h3>
                <p className="text-slate-400 text-xs max-w-[240px] leading-relaxed">
                  Your intelligence has been integrated. We refine our execution
                  based on operator feedback.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col space-y-5 md:space-y-6">
                {/* ── 1. STAR RATING ── */}
                <div className="text-center">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                    Protocol Rating <span className="text-[#f59e0b]">*</span>
                  </h4>
                  {renderStars()}
                </div>

                <div className="w-full h-px bg-[#111111]" />

                {/* ── 2. RECOMMENDATION SELECTOR ── */}
                <div>
                  <h4 className="text-[13px] md:text-sm font-medium text-white mb-3 leading-tight">
                    How would you rate the efficiency of Discotive?{" "}
                    <span className="text-[#f59e0b]">*</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {RECOMMEND_OPTIONS.map((opt) => {
                      const isActive = recommendation === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setRecommendation(opt.id)}
                          className={cn(
                            "px-2 py-3 min-h-[44px] flex items-center justify-center rounded-xl border text-[11px] font-semibold transition-all duration-200 text-center leading-tight",
                            isActive
                              ? opt.activeStyle
                              : `bg-[#050505] border-[#222222] text-slate-400 ${opt.hoverBorder} hover:bg-[#111111]`,
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── 3. OPTIONAL FREE TEXT ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[12px] md:text-xs font-medium text-white shrink-0">
                      Additional Intelligence
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider shrink-0 ml-2">
                      Optional
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      value={comments}
                      onChange={(e) =>
                        setComments(e.target.value.slice(0, 1000))
                      }
                      placeholder="Elaborate on specific vectors, bottlenecks, or features..."
                      className="w-full h-20 md:h-24 bg-[#050505] border border-[#222222] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] rounded-xl p-3 text-[13px] text-white placeholder:text-slate-600 resize-none transition-colors outline-none custom-scrollbar"
                    />
                    <div className="absolute bottom-2 right-2 text-[9px] text-slate-500 font-mono">
                      {comments.length} / 1000
                    </div>
                  </div>
                </div>

                {/* ── ERROR BANNER (shown only when submission fails) ── */}
                {submitError && (
                  <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 text-center">
                    {submitError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          {!isSuccess && (
            <div className="p-4 bg-[#050505] border-t border-[#222222] rounded-b-3xl flex items-center justify-between">
              <p className="text-[9px] text-slate-500 max-w-[150px] leading-tight hidden md:block uppercase tracking-wider">
                Encrypted in transit.
              </p>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className={cn(
                  "ml-auto w-full md:w-auto flex justify-center items-center gap-2 px-5 py-3 md:py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all",
                  isFormValid && !isSubmitting
                    ? "bg-white text-black hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                    : "bg-[#111111] text-slate-500 cursor-not-allowed border border-[#222222]",
                )}
              >
                {isSubmitting ? (
                  <div className="w-3.5 h-3.5 border-[1.5px] border-slate-500 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Transmit
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FeedbackModal;
