/**
 * @fileoverview Grace — Discotive's Embedded AI Career Assistant
 * @description
 * Floating circular trigger that opens a structured Q&A mini-panel.
 * Gemini-powered free-form fallback. Zero onSnapshot. Zero cost on idle.
 *
 * Flow: Topics → Sub-questions → Answer + CTA links
 * Free-form: "Ask Grace anything" → Gemini 2.5 Flash
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import FeedbackModal from "../components/FeedbackModal";
import { auth } from "../firebase";

import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Send,
  ExternalLink,
  RotateCcw,
  Loader2,
  Map,
  Zap,
  FolderLock,
  Crown,
  Bug,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cn } from "./ui/BentoCard";

// ─── Flow data ────────────────────────────────────────────────────────────────
const TOPICS = [
  {
    id: "roadmap",
    emoji: "🗺️",
    label: "Execution Map",
    icon: Map,
    color: "amber",
  },
  {
    id: "score",
    emoji: "⚡",
    label: "My Score / Streak",
    icon: Zap,
    color: "emerald",
  },
  {
    id: "vault",
    emoji: "🔒",
    label: "Vault & Verification",
    icon: FolderLock,
    color: "violet",
  },
  {
    id: "pro",
    emoji: "👑",
    label: "Pro Features",
    icon: Crown,
    color: "sky",
  },
  {
    id: "bug",
    emoji: "🐛",
    label: "Report / Feedback",
    icon: Bug,
    color: "rose",
  },
];

const FLOWS = {
  roadmap: {
    q: "What's the issue with your Execution Map?",
    opts: [
      { id: "gen", label: "Map won't generate" },
      { id: "lost", label: "My nodes disappeared" },
      { id: "save", label: "Changes not saving" },
      { id: "mobile", label: "Mobile view problems" },
    ],
    ans: {
      gen: {
        text: "AI generation needs at least 3 calibration answers and a valid Gemini API key. Click the ✨ wand icon on the canvas to restart calibration. Make sure your profile domain and niche are set.",
        links: [{ label: "Open Roadmap", to: "/app/roadmap" }],
      },
      lost: {
        text: "Nodes are saved to both Firebase Cloud and IndexedDB locally. If a conflict dialog appeared, you may have chosen the older version. Refresh the page — a restore prompt will appear if local data is newer.",
        links: [{ label: "Open Roadmap", to: "/app/roadmap" }],
      },
      save: {
        text: "The amber 'Unsaved' dot means changes are queued for auto-save (10s). Press Ctrl+S to force-sync immediately. Check your internet connection if it stays stuck.",
        links: [],
      },
      mobile: {
        text: "Tap any node to open the edit sheet from the bottom. The canvas supports pinch-to-zoom. For the best mobile experience, use landscape mode or the desktop version for heavy editing.",
        links: [],
      },
    },
  },
  score: {
    q: "What do you want to understand about your score?",
    opts: [
      { id: "calc", label: "How is it calculated?" },
      { id: "drop", label: "My score dropped" },
      { id: "streak", label: "Streak & consistency" },
      { id: "rank", label: "Leaderboard ranking" },
    ],
    ans: {
      calc: {
        text: "Score = Daily login (+10), task completion (+5-30), vault verification (+10-30), alliances (+15), node completion (+15-30), profile views (+1). Missed days deduct -15 pts each.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      drop: {
        text: "Missing login days apply -15 pts per missed day. Unchecking a completed task also reverts its points. Your last mutation reason is shown on the Dashboard under Real-Time Telemetry.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      streak: {
        text: "Your streak increments on every consecutive login day. Missing one day resets it to 1. The Consistency Engine heatmap on your Dashboard shows every active day.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      rank: {
        text: "Rank updates live as other operators' scores change relative to yours. Complete tasks, verify assets, and maintain streaks to climb. X-Ray competitor analysis is Pro-exclusive.",
        links: [{ label: "Leaderboard", to: "/app/leaderboard" }],
      },
    },
  },
  vault: {
    q: "What do you need help with in your Vault?",
    opts: [
      { id: "pending", label: "Asset stuck in Pending" },
      { id: "rejected", label: "Asset was rejected" },
      { id: "upload", label: "Upload is failing" },
      { id: "how", label: "How verification works" },
    ],
    ans: {
      pending: {
        text: "Vault assets are reviewed by Discotive admins within 2–5 business days. During beta, reviews may take slightly longer. You'll see your asset status update automatically.",
        links: [{ label: "View Vault", to: "/app/vault" }],
      },
      rejected: {
        text: "Assets are rejected if they appear forged, can't be verified, or contain inappropriate content. Upload a higher quality version or a direct credential link for the same achievement.",
        links: [{ label: "View Vault", to: "/app/vault" }],
      },
      upload: {
        text: "Ensure your file is under 25MB and a supported format (PDF, PNG, JPG, DOCX, ZIP). Check your internet connection. If the error persists, try signing out and back in.",
        links: [],
      },
      how: {
        text: "Admins review each asset and assign Weak (+10), Medium (+20), or Strong (+30) strength. Verified assets appear on your public profile and are linked to your Discotive Score.",
        links: [{ label: "Open Vault", to: "/app/vault" }],
      },
    },
  },
  pro: {
    q: "What would you like to know about Pro?",
    opts: [
      { id: "includes", label: "What Pro includes" },
      { id: "price", label: "Pricing & billing" },
      { id: "upgrade", label: "Upgrade now" },
      { id: "cancel", label: "Cancel subscription" },
    ],
    ans: {
      includes: {
        text: "Pro includes: Unlimited execution map nodes, Daily Execution Journal, X-Ray competitor analysis (leaderboard), 100MB vault storage, priority verification, and ML data opt-out.",
        links: [{ label: "See Pro Plans", to: "/premium" }],
      },
      price: {
        text: "₹99/month (India) · $1.99/month (Global). Annual saves 16%: ₹999/year · $19.99/year. Powered by Razorpay. Cancel anytime — features stay active until billing cycle ends.",
        links: [{ label: "Pricing Page", to: "/premium" }],
      },
      upgrade: {
        text: "Upgrade in seconds from the Premium page. Your score, vault, and all existing data are fully preserved. Pro features activate immediately after payment.",
        links: [{ label: "Upgrade to Pro →", to: "/premium" }],
      },
      cancel: {
        text: "Manage your subscription through your Razorpay customer portal or email us at discotive@gmail.com. Your Pro features stay active until the end of your current billing period.",
        links: [
          { label: "Settings", to: "/app/settings" },
          { label: "Email Support", href: "mailto:discotive@gmail.com" },
        ],
      },
    },
  },
  bug: {
    q: "How can I help you?",
    opts: [
      { id: "report", label: "Report a bug" },
      { id: "feedback", label: "Share feedback" },
      { id: "contact", label: "Contact support" },
      { id: "feature", label: "Request a feature" },
    ],
    ans: {
      report: {
        text: "Please include: what you were doing, what happened, and what you expected. Note your browser (Chrome/Safari) and device type. Our team triages daily.",
        links: [{ label: "Report Bug →", action: "OPEN_FEEDBACK" }],
      },
      feedback: {
        text: "We read every piece of feedback — your input directly shapes Discotive's product roadmap. Be as specific as possible for maximum impact.",
        links: [{ label: "Send Feedback →", action: "OPEN_FEEDBACK" }],
      },
      contact: {
        text: "For urgent issues: discotive@gmail.com. For non-urgent queries, the feedback form is checked daily by our team. Average response time is 24–48 hours during beta.",
        links: [
          { label: "Feedback Form", action: "OPEN_FEEDBACK" },
          { label: "Email Us", href: "mailto:discotive@gmail.com" },
        ],
      },
      feature: {
        text: "Feature requests go directly to our product backlog. The most-requested ideas get built first. Describe your use case clearly — not just the feature, but why you need it.",
        links: [{ label: "Request Feature →", action: "OPEN_FEEDBACK" }],
      },
    },
  },
};

// ─── Color maps ───────────────────────────────────────────────────────────────
const COLOR = {
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
  },
  sky: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-400",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.3)]",
  },
  rose: {
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-400",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.3)]",
  },
};

// ─── Typing animation ─────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        className="w-1.5 h-1.5 rounded-full bg-amber-500"
      />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Grace = ({ userData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("topics"); // topics | flow | answer | freeform
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeAnswer, setActiveAnswer] = useState(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Free-form AI state
  const [freeInput, setFreeInput] = useState("");
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const hasUnread = false; // future: badge count from notifications

  const name = userData?.identity?.firstName || "Operator";

  const reset = useCallback(() => {
    setStep("topics");
    setActiveTopic(null);
    setActiveAnswer(null);
    setFreeInput("");
    setAiMessages([]);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(reset, 350);
  }, [reset]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages, step, activeAnswer]);

  // Focus input on freeform
  useEffect(() => {
    if (step === "freeform" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [step]);

  // ── Gemini free-form handler ────────────────────────────────────────────
  const handleFreeformSend = useCallback(async () => {
    const text = freeInput.trim();
    if (!text || isAiLoading) return;

    const userMsg = { role: "user", text };
    setAiMessages((prev) => [...prev, userMsg]);
    setFreeInput("");
    setIsAiLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const systemContext = `You are Grace, Discotive's AI career assistant. Discotive is a unified career engine for students and young professionals — it has an Execution Map (ReactFlow DAG), a Vault for credential proof-of-work, a Leaderboard with scoring, and a Pro tier.

User: ${name}
Domain: ${userData?.identity?.domain || userData?.vision?.passion || "Not set"}
Niche: ${userData?.identity?.niche || userData?.vision?.niche || "Not set"}
Score: ${userData?.discotiveScore?.current || 0}

Answer concisely (max 3 sentences). Be direct, helpful, and encouraging. Don't make up features that don't exist. If unsure, suggest contacting support at discotive@gmail.com.`;

      const result = await model.generateContent(
        `${systemContext}\n\nUser question: ${text}`,
      );
      const responseText = result.response.text();
      setAiMessages((prev) => [...prev, { role: "grace", text: responseText }]);
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        {
          role: "grace",
          text: "I'm having trouble connecting right now. Try again shortly, or email us at discotive@gmail.com for immediate help.",
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }, [freeInput, isAiLoading, name, userData]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFreeformSend();
    }
  };

  // ── Render panel content ────────────────────────────────────────────────
  const renderContent = () => {
    // Topics list
    if (step === "topics") {
      return (
        <motion.div
          key="topics"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="flex flex-col h-full"
        >
          <div className="px-5 pt-5 pb-3">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">
              How can I help?
            </p>
            <h4 className="text-base font-black text-white">
              Hi {name}! I'm Grace 👋
            </h4>
            <p className="text-xs text-white/40 mt-0.5 leading-relaxed">
              Your Discotive career assistant. Pick a topic below or ask me
              anything.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 space-y-2 pb-2">
            {TOPICS.map((topic) => {
              const c = COLOR[topic.color];
              return (
                <button
                  key={topic.id}
                  onClick={() => {
                    setActiveTopic(topic);
                    setStep("flow");
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.99]",
                    c.bg,
                    c.border,
                  )}
                >
                  <span className="text-2xl leading-none">{topic.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold", c.text)}>
                      {topic.label}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn("w-4 h-4 shrink-0 opacity-50", c.text)}
                  />
                </button>
              );
            })}
          </div>

          {/* Free-form CTA */}
          <div className="px-5 py-4 border-t border-white/[0.05]">
            <button
              onClick={() => setStep("freeform")}
              className="w-full flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-xs font-bold text-white/50 hover:text-white hover:bg-white/[0.07] transition-all"
            >
              <MessageCircle className="w-4 h-4 text-amber-500/60 shrink-0" />
              Ask Grace anything...
              <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
            </button>
          </div>
        </motion.div>
      );
    }

    // Sub-questions
    if (step === "flow" && activeTopic) {
      const flow = FLOWS[activeTopic.id];
      const c = COLOR[activeTopic.color];
      return (
        <motion.div
          key="flow"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="flex flex-col h-full"
        >
          <div className="px-5 pt-5 pb-3">
            <button
              onClick={() => setStep("topics")}
              className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-3 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-2xl">{activeTopic.emoji}</span>
              <span
                className={cn(
                  "text-sm font-black uppercase tracking-wide",
                  c.text,
                )}
              >
                {activeTopic.label}
              </span>
            </div>
            <p className="text-sm font-bold text-white">{flow.q}</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 space-y-2 pb-5">
            {flow.opts.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setActiveAnswer(flow.ans[opt.id]);
                  setStep("answer");
                }}
                className="w-full flex items-center justify-between gap-3 p-3.5 bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.12] hover:bg-white/[0.05] rounded-xl text-sm font-bold text-white/70 hover:text-white transition-all text-left"
              >
                {opt.label}
                <ChevronRight className="w-4 h-4 shrink-0 text-white/20" />
              </button>
            ))}
          </div>
        </motion.div>
      );
    }

    // Answer screen
    if (step === "answer" && activeAnswer) {
      const c = activeTopic ? COLOR[activeTopic.color] : COLOR.amber;
      return (
        <motion.div
          key="answer"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="flex flex-col h-full"
        >
          <div className="px-5 pt-5 pb-2">
            <button
              onClick={() => setStep("flow")}
              className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-5 space-y-4">
            {/* Grace avatar + answer bubble */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1 bg-[#111] border border-white/[0.06] rounded-2xl rounded-tl-sm p-4">
                <p className="text-sm text-white/80 leading-relaxed">
                  {activeAnswer.text}
                </p>
              </div>
            </div>

            {/* CTA Links */}
            {activeAnswer.links && activeAnswer.links.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-11">
                {activeAnswer.links.map((link, i) => {
                  const linkClasses = cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                    c.bg,
                    c.border,
                    c.text,
                  );

                  // 1. Intercept Action Triggers
                  if (link.action === "OPEN_FEEDBACK") {
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setIsFeedbackModalOpen(true);
                          close(); // Dismiss Grace gracefully
                        }}
                        className={linkClasses}
                      >
                        {link.label}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  }

                  // 2. Standard Internal Route
                  if (link.to) {
                    return (
                      <Link
                        key={i}
                        to={link.to}
                        onClick={close}
                        className={linkClasses}
                      >
                        {link.label}
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    );
                  }

                  // 3. Standard External Link
                  return (
                    <a
                      key={i}
                      href={link.href}
                      target={
                        link.href?.startsWith("mailto") ? "_self" : "_blank"
                      }
                      rel="noreferrer"
                      className={linkClasses}
                    >
                      {link.label}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Not helpful? */}
            <div className="pl-11 pt-2">
              <button
                onClick={() => setStep("freeform")}
                className="text-[10px] font-bold text-white/25 hover:text-white/60 transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-3 h-3" />
                This didn't help — ask Grace directly
              </button>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-white/[0.05]">
            <button
              onClick={reset}
              className="w-full py-2.5 flex items-center justify-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-xl text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Back to topics
            </button>
          </div>
        </motion.div>
      );
    }

    // Free-form Gemini chat
    if (step === "freeform") {
      return (
        <motion.div
          key="freeform"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          className="flex flex-col h-full"
        >
          <div className="px-5 pt-5 pb-3">
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-3 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                <Sparkles className="w-3.5 h-3.5 text-black" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Ask Grace</p>
                <p className="text-[9px] text-white/30">
                  Powered by Gemini 2.5 Flash
                </p>
              </div>
            </div>
          </div>

          {/* Chat messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-3 space-y-3"
          >
            {aiMessages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <div className="flex-1 bg-[#111] border border-white/[0.06] rounded-2xl rounded-tl-sm p-3.5">
                  <p className="text-sm text-white/70 leading-relaxed">
                    I can answer questions about your score, execution map,
                    vault, Pro features, or anything else on Discotive. What
                    would you like to know?
                  </p>
                </div>
              </div>
            )}

            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "",
                )}
              >
                {msg.role === "grace" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-amber-500/15 border border-amber-500/25 text-white rounded-tr-sm"
                      : "bg-[#111] border border-white/[0.06] text-white/80 rounded-tl-sm",
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-black" />
                </div>
                <div className="bg-[#111] border border-white/[0.06] rounded-2xl rounded-tl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 bg-[#111] border border-white/[0.08] rounded-2xl px-4 py-2.5 focus-within:border-amber-500/40 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
                disabled={isAiLoading}
              />
              <button
                onClick={handleFreeformSend}
                disabled={!freeInput.trim() || isAiLoading}
                className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center disabled:opacity-30 hover:bg-amber-400 transition-all shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-black animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-black" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <>
      {/* ── Feedback Modal ── */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        user={auth.currentUser}
      />
      {/* ── Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop (mobile only) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[490] md:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className={cn(
                "fixed z-[500] bg-[#0a0a0c] border border-white/[0.08] rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col",
                // Desktop: bottom-right above buttons
                "bottom-20 right-5 w-[360px] h-[500px]",
                // Mobile: full-width bottom sheet
                "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full max-md:rounded-b-none max-md:h-[70vh]",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#050505]/60 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_14px_rgba(245,158,11,0.5)]">
                    <Sparkles className="w-4 h-4 text-black" />
                    {/* Live pulse */}
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0c] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Grace</p>
                    <p className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest">
                      Online · Discotive AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Close Grace"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Content with transition */}
              <div className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Floating Trigger Button ── */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={
          isOpen ? "Close Grace" : "Open Grace — Discotive AI Assistant"
        }
        className={cn(
          "fixed bottom-20 right-16 z-[500] w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none",
          "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600",
          "shadow-[0_0_0_4px_rgba(245,158,11,0.15),0_8px_32px_rgba(245,158,11,0.35)]",
          isOpen &&
            "shadow-[0_0_0_4px_rgba(245,158,11,0.25),0_8px_32px_rgba(245,158,11,0.5)]",
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-5 h-5 text-black" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="w-5 h-5 text-black" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outer pulse ring */}
        {!isOpen && (
          <motion.span
            animate={{
              scale: [1, 1.6, 1.6],
              opacity: [0.5, 0, 0],
            }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full bg-amber-500/30 pointer-events-none"
          />
        )}
      </motion.button>
    </>
  );
};

export default Grace;
