/**
 * @fileoverview Discotive OS — Support Ticket Modal
 * @description
 * MAANG-grade support flow. Step 1: Grace pre-check (stops 80% of tickets).
 * Step 2: Structured ticket form. No onSnapshot. One addDoc write.
 *
 * Firestore schema (support_tickets/{ticketId}):
 *   uid, email, username, category, subject, message, priority,
 *   status: "open", createdAt, updatedAt, closedAt: null,
 *   deleteAt: null  ← set by admin when closing; CRON deletes after 48h
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Ticket,
  ChevronRight,
  ChevronLeft,
  Send,
  ShieldCheck,
  HelpCircle,
  Zap,
  Map,
  FolderLock,
  Crown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { cn } from "./ui/BentoCard";

// ── Grace Quick-Answers (mirrors Grace.jsx flows) ────────────────────────────
const GRACE_QUICK = {
  Technical: {
    q: "What's the technical issue?",
    opts: [
      {
        id: "map",
        label: "Execution Map won't load / generate",
        ans: "Map generation needs at least 3 calibration answers. Click the ✨ wand on the canvas to restart. If nodes disappeared, refresh — a restore prompt will appear.",
      },
      {
        id: "score",
        label: "My score dropped unexpectedly",
        ans: "Missing a login day deducts -10 pts (server CRON at 11:59 PM IST). Check the 'Last Mutation' field on your Dashboard under Real-Time Telemetry.",
      },
      {
        id: "vault",
        label: "Vault upload failing",
        ans: "File must be under 25MB. Supported: PDF, PNG, JPG, DOCX, ZIP. Try signing out and back in. If the error persists after that, submit a ticket.",
      },
      { id: "other", label: "Something else entirely", ans: null },
    ],
  },
  Billing: {
    q: "What's the billing issue?",
    opts: [
      {
        id: "charged",
        label: "Charged but no Pro access",
        ans: "Pro activates via webhook (Razorpay → our server). This can take up to 5 minutes. If it's been over 10 minutes, submit a ticket with your Razorpay payment ID.",
      },
      {
        id: "cancel",
        label: "How do I cancel?",
        ans: "Email discotive@gmail.com or manage via your Razorpay customer portal. Pro features stay active until the billing cycle ends.",
      },
      { id: "refund", label: "Requesting a refund", ans: null }, // Force ticket
      { id: "other", label: "Other billing issue", ans: null },
    ],
  },
  Account: {
    q: "What's the account issue?",
    opts: [
      { id: "delete", label: "I want to delete my account", ans: null },
      { id: "data", label: "Data export / privacy request", ans: null },
      {
        id: "locked",
        label: "Account seems locked",
        ans: "If you see a ghost/onboarding screen, your profile setup is incomplete. Navigate to Auth and complete onboarding. That unlocks all modules.",
      },
      { id: "other", label: "Other account issue", ans: null },
    ],
  },
  "Feature Request": {
    q: "Describe your feature idea (we read every one)",
    opts: null, // Skip to form directly
  },
  Other: {
    q: null,
    opts: null,
  },
};

const CATEGORIES = [
  "Technical",
  "Billing",
  "Account",
  "Feature Request",
  "Other",
];
const PRIORITIES = [
  { key: "Low", color: "text-white/50", desc: "Nice to have, no urgency" },
  { key: "Medium", color: "text-amber-400", desc: "Affects my workflow" },
  { key: "High", color: "text-orange-400", desc: "Blocking core feature" },
  { key: "Critical", color: "text-red-400", desc: "Data loss / payment issue" },
];

const SupportTicketModal = ({ isOpen, onClose, user, userData }) => {
  const [step, setStep] = useState("grace"); // grace | form | success
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [graceAnswer, setGraceAnswer] = useState(null); // { text, wasHelpful }
  const [selectedOpt, setSelectedOpt] = useState(null);

  const [form, setForm] = useState({
    category: "",
    subject: "",
    message: "",
    priority: "Medium",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStep("grace");
      setSelectedCategory(null);
      setGraceAnswer(null);
      setSelectedOpt(null);
      setForm({ category: "", subject: "", message: "", priority: "Medium" });
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setForm((f) => ({ ...f, category: cat }));
    const flow = GRACE_QUICK[cat];
    // If no quick-answers for this category, go straight to form
    if (!flow?.opts) {
      setStep("form");
    } else {
      setStep("grace_opts");
    }
  };

  const handleOptSelect = (opt) => {
    setSelectedOpt(opt);
    if (opt.ans) {
      setGraceAnswer(opt.ans);
      setStep("grace_answer");
    } else {
      // This path forces a ticket (no Grace answer available)
      setStep("form");
    }
  };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    if (!user?.uid) {
      setSubmitError("Auth error. Please sign out and back in.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      await addDoc(collection(db, "support_tickets"), {
        uid: user.uid,
        email: user.email || null,
        username: userData?.identity?.username || null,
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
        priority: form.priority,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        closedAt: null,
        deleteAt: null, // Set by admin/CRON when status → closed
        // Context that helps admins
        tier: userData?.tier || "ESSENTIAL",
        graceChecked: step === "grace_answer" || selectedOpt !== null,
      });
      setStep("success");
    } catch (err) {
      console.error("[SupportTicket] Submit failed:", err);
      setSubmitError("Submission failed. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#030303]/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-[#0a0a0a] rounded-3xl border border-[#222] shadow-2xl flex flex-col my-auto"
        >
          {/* HEADER */}
          <div className="px-5 py-4 flex justify-between items-center border-b border-[#222] bg-[#050505] rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#111] border border-[#222] flex items-center justify-center">
                <Ticket className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {step === "success" ? "Ticket Submitted" : "Support"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#111] hover:bg-[#222] rounded-full transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
            <AnimatePresence mode="wait">
              {/* ── STEP: CATEGORY SELECT (initial Grace check) ── */}
              {step === "grace" && (
                <motion.div
                  key="grace"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
                      Step 1 of 2
                    </p>
                    <h4 className="text-base font-bold text-white mb-1">
                      What's this about?
                    </h4>
                    <p className="text-xs text-white/40 leading-relaxed">
                      We'll check if Grace can resolve this instantly before
                      creating a ticket.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategorySelect(cat)}
                        className="flex items-center justify-between gap-2 p-3.5 bg-[#050505] border border-[#1a1a1a] hover:border-sky-500/30 hover:bg-sky-500/5 rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all text-left"
                      >
                        {cat}
                        <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep("form")}
                    className="w-full text-center text-[10px] font-bold text-white/25 hover:text-white/50 transition-colors pt-1"
                  >
                    Skip straight to ticket form →
                  </button>
                </motion.div>
              )}

              {/* ── STEP: GRACE QUICK OPTIONS ── */}
              {step === "grace_opts" && selectedCategory && (
                <motion.div
                  key="grace_opts"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  <button
                    onClick={() => setStep("grace")}
                    className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
                      {selectedCategory} · Grace Check
                    </p>
                    <h4 className="text-sm font-bold text-white">
                      {GRACE_QUICK[selectedCategory]?.q}
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {GRACE_QUICK[selectedCategory]?.opts?.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleOptSelect(opt)}
                        className="w-full flex items-center justify-between gap-2 p-3.5 bg-[#050505] border border-[#1a1a1a] hover:border-white/10 hover:bg-white/[0.02] rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all text-left"
                      >
                        {opt.label}
                        <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── STEP: GRACE ANSWER ── */}
              {step === "grace_answer" && graceAnswer && (
                <motion.div
                  key="grace_answer"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-5"
                >
                  <button
                    onClick={() => setStep("grace_opts")}
                    className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                      <Zap className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex-1 bg-[#111] border border-white/[0.06] rounded-2xl rounded-tl-sm p-4">
                      <p className="text-sm text-white/80 leading-relaxed">
                        {graceAnswer}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#111]">
                    <p className="text-xs font-bold text-white/40 mb-3">
                      Did this resolve your issue?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yes, resolved
                      </button>
                      <button
                        onClick={() => setStep("form")}
                        className="flex-1 py-3 bg-[#111] border border-[#222] text-white/60 text-[10px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-all"
                      >
                        No, I still need help
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP: TICKET FORM ── */}
              {step === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  className="space-y-4"
                >
                  {selectedCategory && (
                    <button
                      onClick={() =>
                        setStep(
                          GRACE_QUICK[selectedCategory]?.opts
                            ? "grace_opts"
                            : "grace",
                        )
                      }
                      className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  )}
                  <div>
                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
                      {selectedCategory ? `${selectedCategory} · ` : ""}Ticket
                      Details
                    </p>
                    <h4 className="text-sm font-bold text-white">
                      Tell us exactly what's wrong.
                    </h4>
                  </div>

                  {/* Category (if not already selected) */}
                  {!selectedCategory && (
                    <div>
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                        Category <span className="text-sky-400">*</span>
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, category: e.target.value }))
                        }
                        className="w-full bg-[#050505] border border-[#1a1a1a] text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-sky-500/40 transition-colors"
                      >
                        <option value="">Select category...</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Priority */}
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                      Priority
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PRIORITIES.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, priority: p.key }))
                          }
                          className={cn(
                            "px-3 py-2.5 rounded-xl border text-left transition-all",
                            form.priority === p.key
                              ? "bg-white/5 border-white/20"
                              : "bg-[#050505] border-[#1a1a1a] hover:border-white/10",
                          )}
                        >
                          <p className={cn("text-xs font-black", p.color)}>
                            {p.key}
                          </p>
                          <p className="text-[9px] text-white/30 mt-0.5">
                            {p.desc}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Subject <span className="text-sky-400">*</span>
                      </label>
                      <span
                        className={cn(
                          "text-[9px] font-mono",
                          form.subject.length > 90
                            ? "text-amber-500"
                            : "text-white/20",
                        )}
                      >
                        {form.subject.length}/100
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={100}
                      value={form.subject}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, subject: e.target.value }))
                      }
                      placeholder="One-line summary of the issue..."
                      className="w-full bg-[#050505] border border-[#1a1a1a] focus:border-sky-500/40 text-white rounded-xl px-4 py-2.5 text-xs placeholder-white/20 outline-none transition-colors"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        Description <span className="text-sky-400">*</span>
                      </label>
                      <span
                        className={cn(
                          "text-[9px] font-mono",
                          form.message.length > 900
                            ? "text-amber-500"
                            : "text-white/20",
                        )}
                      >
                        {form.message.length}/1000
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={1000}
                      value={form.message}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, message: e.target.value }))
                      }
                      placeholder="Steps to reproduce, what you expected, what happened..."
                      className="w-full bg-[#050505] border border-[#1a1a1a] focus:border-sky-500/40 text-white rounded-xl px-4 py-3 text-xs placeholder-white/20 outline-none resize-none transition-colors custom-scrollbar"
                    />
                  </div>

                  {submitError && (
                    <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 text-center">
                      {submitError}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP: SUCCESS ── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-14 h-14 bg-sky-500/10 border border-sky-500/20 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheck className="w-7 h-7 text-sky-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1.5">
                    Ticket Logged.
                  </h3>
                  <p className="text-white/40 text-xs max-w-[240px] leading-relaxed">
                    Our team reviews every ticket. Average response time is
                    24–48 hours during beta. Check Settings for status updates.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FOOTER */}
          {step === "form" && (
            <div className="p-4 bg-[#050505] border-t border-[#222] rounded-b-3xl">
              <button
                onClick={handleSubmit}
                disabled={
                  !form.subject.trim() ||
                  !form.message.trim() ||
                  submitting ||
                  (!form.category && !selectedCategory)
                }
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                  form.subject.trim() &&
                    form.message.trim() &&
                    (form.category || selectedCategory) &&
                    !submitting
                    ? "bg-sky-500 text-black hover:bg-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)]"
                    : "bg-[#111] text-white/20 cursor-not-allowed border border-[#222]",
                )}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3 h-3" /> Submit Ticket
                  </>
                )}
              </button>
            </div>
          )}
          {step === "success" && (
            <div className="p-4 bg-[#050505] border-t border-[#222] rounded-b-3xl">
              <button
                onClick={onClose}
                className="w-full py-3 bg-white text-black text-[11px] font-black uppercase tracking-wider rounded-full"
              >
                Done
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SupportTicketModal;
