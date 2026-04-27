/**
 * @fileoverview Grace — Discotive's Embedded AI Career Assistant
 * @description
 * Floating circular trigger that opens a structured Q&A mini-panel.
 * Gemini-powered free-form fallback. Zero onSnapshot. Zero cost on idle.
 *
 * Flow: Topics → Sub-questions → Answer + CTA links
 * Free-form: "Ask Grace anything" → Gemini 2.5 Flash
 *
 * Modules covered: Score, Vault, Network/Connective, Learn, Opportunities,
 * Agenda, Colists, Pro Features, Support/Feedback.
 * NOTE: Execution Map / Roadmap has been removed from this platform.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useAnimation,
} from "framer-motion";
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
  Zap,
  FolderLock,
  Crown,
  Bug,
  MessageCircle,
  Trophy,
  BookOpen,
  Briefcase,
  Users,
  NotebookPen,
  Layers,
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import { cn } from "../lib/cn";

// ─── Flow data ────────────────────────────────────────────────────────────────
const TOPICS = [
  {
    id: "score",
    emoji: "⚡",
    label: "My Score & Rank",
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
    id: "network",
    emoji: "🤝",
    label: "Network & Alliances",
    icon: Users,
    color: "sky",
  },
  {
    id: "learn",
    emoji: "📚",
    label: "Learn & Certificates",
    icon: BookOpen,
    color: "amber",
  },
  {
    id: "opportunities",
    emoji: "🎯",
    label: "Opportunities",
    icon: Briefcase,
    color: "rose",
  },
  {
    id: "colists",
    emoji: "🃏",
    label: "Colists",
    icon: Layers,
    color: "gold",
  },
  {
    id: "agenda",
    emoji: "📓",
    label: "Agenda / Diary",
    icon: NotebookPen,
    color: "teal",
  },
  {
    id: "pro",
    emoji: "👑",
    label: "Pro Features",
    icon: Crown,
    color: "gold",
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
  score: {
    q: "What do you want to understand about your score?",
    opts: [
      { id: "calc", label: "How is it calculated?" },
      { id: "drop", label: "My score dropped unexpectedly" },
      { id: "streak", label: "Streak & consistency" },
      { id: "rank", label: "My position matrix & percentile" },
    ],
    ans: {
      calc: {
        text: "Your Discotive Score is built from: daily login (+10), task completion (+5–30), vault asset verification (+10–30 based on strength), alliance actions (+5 sent / +15 forged), and profile views (+1 unique). Missing a login day deducts -15 pts via our IST CRON at 23:59.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      drop: {
        text: "The most common cause is a missed login day (-15 pts, applied automatically at 23:59 IST). Check the 'Last Mutation' field on your Dashboard under Real-Time Telemetry — it shows the exact reason and amount of your last score change.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      streak: {
        text: "Your streak increments on every consecutive login day (IST calendar). Miss a single day and your streak resets to 1 — and you lose 15 pts. The Consistency Engine heatmap on your Dashboard shows every active day in your history.",
        links: [{ label: "Dashboard", to: "/app" }],
      },
      rank: {
        text: "Your Position Matrix shows your exact percentile rank in four dimensions: Global (all operators), Domain (your field), Niche (your specialization), and Network (among your allies). This updates live as scores shift across the platform. Pro users get X-Ray competitor breakdown.",
        links: [
          { label: "Leaderboard", to: "/app/leaderboard" },
          { label: "Dashboard", to: "/app" },
        ],
      },
    },
  },

  vault: {
    q: "What do you need help with in your Vault?",
    opts: [
      { id: "pending", label: "Asset stuck in Pending" },
      { id: "rejected", label: "My asset was rejected" },
      { id: "upload", label: "Upload is failing" },
      { id: "how", label: "How verification works" },
    ],
    ans: {
      pending: {
        text: "Vault assets are reviewed by Discotive admins. During beta, reviews can take 2–5 business days. Your asset status updates automatically in the Vault — you don't need to resubmit. Pro users get priority review.",
        links: [{ label: "View Vault", to: "/app/vault" }],
      },
      rejected: {
        text: "Assets are rejected if they appear forged, can't be independently verified, or contain inappropriate content. You can re-upload a higher-quality version, a clearer scan, or a direct URL to the credential. The same slot can be resubmitted.",
        links: [{ label: "View Vault", to: "/app/vault" }],
      },
      upload: {
        text: "Ensure your file is under 25MB and a supported format (PDF, PNG, JPG, DOCX, ZIP). If the upload hangs, check your internet connection. Try signing out and back in — this refreshes your Firebase Storage token.",
        links: [],
      },
      how: {
        text: "Admins review each asset manually and assign a strength: Weak (+10 pts), Medium (+20 pts), or Strong (+30 pts). Verified assets appear on your public profile as proof of work and are permanently linked to your Discotive identity. You can also connect external apps via App Connectors.",
        links: [
          { label: "Open Vault", to: "/app/vault" },
          { label: "App Connectors", to: "/app/vault" },
        ],
      },
    },
  },

  network: {
    q: "What do you need help with in Connective?",
    opts: [
      { id: "alliance", label: "How alliances work" },
      { id: "competitor", label: "The Competitor Radar" },
      { id: "feed", label: "The Execution Feed" },
      { id: "dms", label: "Direct Messages" },
    ],
    ans: {
      alliance: {
        text: "An Alliance is a mutual connection. Send a request (+5 pts), and when accepted, both you and your ally each earn +15 pts. Alliance requests are rate-limited to 5/day on Essential and 50/day on Pro. Alliances and Competitors are mutually exclusive — you can't track an ally as a competitor.",
        links: [{ label: "Connective", to: "/app/connective" }],
      },
      competitor: {
        text: "Add any operator to your Competitor Radar to track their score. They get notified that someone is tracking them (anonymously on Essential, your identity revealed on Pro). You can have up to 50 tracked competitors. Competitors and allies are mutually exclusive.",
        links: [
          { label: "Leaderboard", to: "/app/leaderboard" },
          { label: "Connective", to: "/app/connective" },
        ],
      },
      feed: {
        text: "The Execution Feed is your secure professional social space. Share achievements, discoveries, and project updates. Mention operators with @username, use #hashtags. Like, comment, and engage. The feed is visible only to authenticated users — no public noise.",
        links: [{ label: "Feed", to: "/app/connective/feed" }],
      },
      dms: {
        text: "Direct Messages use a hybrid Firebase Firestore + RTDB architecture. Typing indicators are real-time via RTDB. Messages are end-to-end stored securely in Firestore. You can only DM operators who are in your network. Messages can be edited and deleted.",
        links: [{ label: "Connective", to: "/app/connective" }],
      },
    },
  },

  learn: {
    q: "What do you need help with in Learn?",
    opts: [
      { id: "certs", label: "Finding courses & certificates" },
      { id: "videos", label: "Curated videos & playlists" },
      { id: "verify", label: "Verifying a completed course" },
      { id: "score", label: "How learning affects my score" },
    ],
    ans: {
      certs: {
        text: "The Learn Engine has a curated database of courses and certificates, each tagged by domain, difficulty, and category. Every item has a unique Discotive Learn ID. Filter by your domain or search by keyword. Click any course to see its Learn ID and verification instructions.",
        links: [{ label: "Learn", to: "/app/learn" }],
      },
      videos: {
        text: "Curated playlists and individual videos are available in the Learn section, tagged by domain and category. Videos track your actual watch time — you earn points proportionally based on how much you watched (up to +10 pts for 95%+ completion).",
        links: [{ label: "Learn", to: "/app/learn" }],
      },
      verify: {
        text: "After completing a course: upload your certificate to the Vault and include the Discotive Learn ID in the submission. Our admin team cross-references the ID with the Learn database and verifies authenticity before awarding score points.",
        links: [
          { label: "Learn", to: "/app/learn" },
          { label: "Vault", to: "/app/vault" },
        ],
      },
      score: {
        text: "Completing a verified course awards points based on admin-assigned strength (Weak/Medium/Strong). Video watch time awards up to +10 pts proportionally. Consistent learning activity also feeds into your streak and daily score.",
        links: [{ label: "Learn", to: "/app/learn" }],
      },
    },
  },

  opportunities: {
    q: "What do you need help with in Opportunities?",
    opts: [
      { id: "find", label: "Finding relevant opportunities" },
      { id: "types", label: "What types are available?" },
      { id: "selection", label: "What is the selection %?" },
      { id: "apply", label: "How to apply" },
    ],
    ans: {
      find: {
        text: "Filter opportunities by type (Job, Internship, Freelance, Hackathon, College Fest, Mentorship), domain, location, and deadline. The Opportunities Engine surfaces matches based on your profile domain and niche automatically when you first open the page.",
        links: [{ label: "Opportunities", to: "/app/opportunities" }],
      },
      types: {
        text: "Discotive lists: full-time jobs, internships, freelance projects, hackathons, college fests, mentorship programs, and community grants — across every domain. All listings are admin-curated and verified before going live.",
        links: [{ label: "Opportunities", to: "/app/opportunities" }],
      },
      selection: {
        text: "Each opportunity shows an estimated Selection % — calculated based on the number of applicants relative to seats, your Discotive Score percentile in the relevant domain, and your profile completeness. Higher score + more complete profile = higher shown selection probability.",
        links: [{ label: "Opportunities", to: "/app/opportunities" }],
      },
      apply: {
        text: "Click any opportunity to see the full details including deadline, requirements, and the direct application link. Applications happen on the opportunity's external platform — Discotive surfaces the opportunity and gives you context, you apply directly.",
        links: [{ label: "Opportunities", to: "/app/opportunities" }],
      },
    },
  },

  colists: {
    q: "What would you like to know about Colists?",
    opts: [
      { id: "what", label: "What is a Colist?" },
      { id: "create", label: "How do I create one?" },
      { id: "score", label: "Colist Resonance & Score" },
      { id: "fork", label: "Forking a Colist" },
    ],
    ans: {
      what: {
        text: "A Colist is a carousel-format knowledge piece — like a visual essay, one idea per page. It replaces the outdated blog format with an immersive, paginated reading experience. Each Colist has a Resonance Score that grows with views, saves, and page applause. Your reading progress is saved automatically.",
        links: [{ label: "Browse Colists", to: "/colists" }],
      },
      create: {
        text: "Creating Colists requires a Pro or Enterprise account. Go to Colists and tap the + button to open the Colist creator. Add blocks (text, image, quote, embed, poll), set a cover, choose a gradient, and publish. Your Colist gets a unique shareable URL.",
        links: [
          { label: "Browse Colists", to: "/colists" },
          { label: "Upgrade to Pro", to: "/premium" },
        ],
      },
      score: {
        text: "Every Colist has a Resonance Score. It grows when readers view, save, and applaud your pages. Hit milestones at 50, 100, 250, 500, and 1000 resonance — both the author and readers who engaged get rewarded. Page Applause (double-tap any page) tracks per-page engagement.",
        links: [{ label: "Browse Colists", to: "/colists" }],
      },
      fork: {
        text: "Pro users can Fork any Colist graded 'Strong' by Discotive admins. Forking creates your own editable copy that you can build on. A fork credit is shown on your version pointing back to the original author.",
        links: [
          { label: "Browse Colists", to: "/colists" },
          { label: "Upgrade to Pro", to: "/premium" },
        ],
      },
    },
  },

  agenda: {
    q: "What do you need help with in your Agenda?",
    opts: [
      { id: "what", label: "What is the Agenda?" },
      { id: "access", label: "How do I access it?" },
      { id: "privacy", label: "Is it private?" },
      { id: "features", label: "What can I write in it?" },
    ],
    ans: {
      what: {
        text: "The Agenda is your private, in-built diary and planning tool. It's a rich-text editor for daily reviews, goal setting, strategy notes, and personal logs — directly inside Discotive. No separate app needed. Your execution journal lives next to your score.",
        links: [{ label: "Agenda", to: "/app/agenda" }],
      },
      access: {
        text: "The Agenda is a Pro and Enterprise exclusive feature. If you're on Essential, you'll see an upgrade prompt. Once on Pro, access it from the left sidebar or bottom navigation under Agenda.",
        links: [
          { label: "Upgrade to Pro", to: "/premium" },
          { label: "Agenda", to: "/app/agenda" },
        ],
      },
      privacy: {
        text: "100% private. Your Agenda entries are stored in a Firestore subcollection that only you can read or write. Not even Discotive admins have read access to your journal. Zero admin visibility — it's your private execution log.",
        links: [],
      },
      features: {
        text: "The Agenda uses a TipTap rich-text editor. Write with headings, bold, italic, links, bullet lists, and quotes. Attach stats from your dashboard. Use templates for daily reviews, weekly planning, or free-form journaling. All entries are saved with a timestamp.",
        links: [{ label: "Agenda", to: "/app/agenda" }],
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
        text: "Pro includes: Agenda (private diary), X-Ray competitor analysis on the leaderboard, ability to create and fork Colists, 100MB vault storage (50 assets), 50 alliance requests/day, priority vault verification, daily comparisons (3/day), and ML data opt-out.",
        links: [{ label: "See Pro Plans", to: "/premium" }],
      },
      price: {
        text: "₹99/month (India) · $1.99/month (Global). Annual saves ~16%: ₹999/year · $19.99/year. Powered by Razorpay. Cancel anytime — your Pro features stay active until the end of your current billing cycle.",
        links: [{ label: "Pricing Page", to: "/premium" }],
      },
      upgrade: {
        text: "Upgrade in seconds from the Premium page. Your score, vault, network, and all existing data are fully preserved. Pro features activate immediately after payment confirmation via our Razorpay webhook.",
        links: [{ label: "Upgrade to Pro →", to: "/premium" }],
      },
      cancel: {
        text: "Manage your subscription through your Razorpay customer portal or email us at discotive@gmail.com. Your Pro features stay active until the end of your current billing period — no immediate cutoff.",
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
        text: "Please include: what you were doing, what happened, and what you expected. Note your browser (Chrome/Safari) and device type. Our team triages daily during beta.",
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
        text: "Feature requests go directly to our product backlog. The most-requested ideas get built first. Describe your use case clearly — not just the feature, but why you need it and what problem it solves.",
        links: [{ label: "Request Feature →", action: "OPEN_FEEDBACK" }],
      },
    },
  },
};

// ─── Color maps ───────────────────────────────────────────────────────────────
const COLOR = {
  gold: {
    bg: "bg-[rgba(191,162,100,0.08)]",
    border: "border-[rgba(191,162,100,0.25)]",
    text: "text-[#D4AF78]",
    glow: "shadow-[0_0_15px_rgba(191,162,100,0.15)]",
  },
  emerald: {
    bg: "bg-[#22C55E]/10",
    border: "border-[#22C55E]/20",
    text: "text-[#4ADE80]",
    glow: "shadow-[0_0_12px_rgba(74,222,128,0.15)]",
  },
  violet: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    text: "text-violet-400",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.15)]",
  },
  sky: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-400",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.15)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-400",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  },
  rose: {
    bg: "bg-[#EF4444]/10",
    border: "border-[#EF4444]/20",
    text: "text-[#F87171]",
    glow: "shadow-[0_0_12px_rgba(248,113,113,0.15)]",
  },
  teal: {
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    text: "text-teal-400",
    glow: "shadow-[0_0_12px_rgba(20,184,166,0.15)]",
  },
};

// ─── Typing animation ─────────────────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex items-center gap-1.5 px-3 py-2.5">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        className="w-1.5 h-1.5 rounded-full bg-[#BFA264]"
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

  const name = userData?.identity?.firstName || "Operator";

  // ─── PHYSICS & IDLE ENGINE (Edge Snapping) ───
  const PADDING = 16;
  const BALL_SIZE = 56;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();

  const [isIdle, setIsIdle] = useState(false);
  const [side, setSide] = useState("right");
  const idleTimeoutRef = useRef(null);
  const isDragging = useRef(false);

  const startIdleTimer = useCallback(() => {
    clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      if (!isOpen) setIsIdle(true);
    }, 3000);
  }, [isOpen]);

  const wakeUp = useCallback(() => {
    setIsIdle(false);
    startIdleTimer();
  }, [startIdleTimer]);

  useEffect(() => {
    const initX = window.innerWidth - BALL_SIZE - PADDING;
    const initY = window.innerHeight - BALL_SIZE - 96;
    x.set(initX);
    y.set(initY);
    controls.set({ x: initX, y: initY });
    startIdleTimer();
    return () => clearTimeout(idleTimeoutRef.current);
  }, [controls, startIdleTimer, x, y]);

  useEffect(() => {
    if (isOpen) {
      setIsIdle(false);
      clearTimeout(idleTimeoutRef.current);
      controls.start({
        x: side === "left" ? PADDING : window.innerWidth - BALL_SIZE - PADDING,
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 },
      });
      return;
    }

    if (isIdle) {
      const targetX =
        side === "left"
          ? -(BALL_SIZE * 0.4)
          : window.innerWidth - BALL_SIZE + BALL_SIZE * 0.4;
      controls.start({
        x: targetX,
        opacity: 0.5,
        scale: 0.9,
        transition: { duration: 0.4, ease: "easeOut" },
      });
    } else {
      const targetX =
        side === "left" ? PADDING : window.innerWidth - BALL_SIZE - PADDING;
      controls.start({
        x: targetX,
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 25 },
      });
      startIdleTimer();
    }
  }, [isIdle, isOpen, side, controls, startIdleTimer]);

  const handleDragStart = () => {
    isDragging.current = true;
    setIsIdle(false);
    clearTimeout(idleTimeoutRef.current);
    controls.start({ scale: 1.1, opacity: 0.85 });
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      isDragging.current = false;
    }, 150);

    const currentX = x.get();
    const currentY = y.get();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const isLeft = currentX + BALL_SIZE / 2 < screenWidth / 2;
    setSide(isLeft ? "left" : "right");

    const targetX = isLeft ? PADDING : screenWidth - BALL_SIZE - PADDING;
    const targetY = Math.max(
      PADDING,
      Math.min(currentY, screenHeight - BALL_SIZE - PADDING),
    );

    controls.start({
      x: targetX,
      y: targetY,
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.8 },
    });

    startIdleTimer();
  };

  const handleTriggerClick = () => {
    if (isDragging.current) return;
    if (isIdle) {
      wakeUp();
      return;
    }
    setIsOpen((v) => !v);
  };

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [aiMessages, step, activeAnswer, isAiLoading]);

  useEffect(() => {
    if (step === "freeform" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [step]);

  // ── Gemini free-form handler (Secured via Cloud Functions) ──
  const handleFreeformSend = useCallback(async () => {
    const text = freeInput.trim();
    if (!text || isAiLoading) return;

    const userMsg = { role: "user", text };
    setAiMessages((prev) => [...prev, userMsg]);
    setFreeInput("");
    setIsAiLoading(true);

    try {
      const aiGateway = httpsCallable(functions, "discotiveAIGateway");
      const response = await aiGateway({
        action: "GRACE_CHAT",
        payload: { name, userData, text },
      });

      setAiMessages((prev) => [
        ...prev,
        { role: "grace", text: response.data.text },
      ]);
    } catch (err) {
      console.error("[Grace] AI connection failed:", err);
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
              const c = COLOR[topic.color] || COLOR.gold;
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
      const c = COLOR[activeTopic.color] || COLOR.gold;
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
      const c = activeTopic
        ? COLOR[activeTopic.color] || COLOR.gold
        : COLOR.gold;
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

                  if (link.action === "OPEN_FEEDBACK") {
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setIsFeedbackModalOpen(true);
                          close();
                        }}
                        className={linkClasses}
                      >
                        {link.label}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    );
                  }

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
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF78] to-[#8B7240] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(191,162,100,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-[#030303]" />
                </div>
                <div className="flex-1 bg-[#0F0F0F] border border-white/5 rounded-2xl rounded-tl-sm p-3.5 shadow-sm">
                  <p className="text-sm text-[#F5F0E8]/80 leading-relaxed font-medium">
                    I can answer questions about your score, vault, network,
                    learning, opportunities, agenda, colists, or anything else
                    on Discotive. What would you like to know?
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF78] to-[#8B7240] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(191,162,100,0.2)]">
                    <Sparkles className="w-3.5 h-3.5 text-[#030303]" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed font-medium",
                    msg.role === "user"
                      ? "bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.25)] text-[#D4AF78] rounded-tr-sm shadow-[0_4px_15px_rgba(191,162,100,0.05)]"
                      : "bg-[#0F0F0F] border border-white/5 text-[#F5F0E8]/80 rounded-tl-sm shadow-sm",
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF78] to-[#8B7240] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(191,162,100,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-[#030303]" />
                </div>
                <div className="bg-[#0F0F0F] border border-white/5 rounded-2xl rounded-tl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[rgba(191,162,100,0.2)] rounded-2xl px-4 py-2.5 focus-within:border-[#D4AF78] focus-within:shadow-[0_0_15px_rgba(191,162,100,0.1)] transition-all">
              <input
                ref={inputRef}
                type="text"
                value={freeInput}
                onChange={(e) => setFreeInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-sm text-[#F5F0E8] placeholder-[#F5F0E8]/40 focus:outline-none font-medium"
                disabled={isAiLoading}
              />
              <button
                onClick={handleFreeformSend}
                disabled={!freeInput.trim() || isAiLoading}
                className="w-8 h-8 rounded-xl bg-[#BFA264] flex items-center justify-center disabled:opacity-30 hover:bg-[#D4AF78] transition-all shrink-0 shadow-[0_0_10px_rgba(191,162,100,0.3)]"
              >
                {isAiLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#030303] animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-[#030303]" />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998] md:hidden"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className={cn(
                "fixed z-[9999] bg-[#0A0A0A] border border-white/5 rounded-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col",
                "bottom-24 w-[380px] h-[580px]",
                side === "left" ? "left-6" : "right-6 md:right-8",
                "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:w-full max-md:rounded-b-none max-md:h-[82vh]",
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF78] to-[#8B7240] flex items-center justify-center shadow-[0_0_14px_rgba(191,162,100,0.3)]">
                    <Sparkles className="w-4 h-4 text-[#030303]" />
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#4ADE80] rounded-full border-2 border-[#0A0A0A] shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#F5F0E8]">Grace</p>
                    <p className="text-[9px] text-[#4ADE80]/80 font-bold uppercase tracking-widest">
                      Online · Discotive AI
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#F5F0E8]/40 hover:text-[#F5F0E8] hover:bg-white/10 transition-all"
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

      {/* ── Edge-Snapping Floating Assistive Ball ── */}
      <motion.button
        style={{ x, y }}
        animate={controls}
        drag
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleTriggerClick}
        whileHover={{ scale: isIdle || isOpen ? 1 : 1.08 }}
        whileTap={{ scale: isIdle || isOpen ? 1 : 0.95 }}
        aria-label={
          isOpen ? "Close Grace" : "Open Grace — Discotive AI Assistant"
        }
        className={cn(
          "fixed top-0 left-0 z-[9999] w-14 h-14 rounded-full flex items-center justify-center focus-visible:ring-2 focus-visible:ring-[#BFA264] focus-visible:outline-none touch-none",
          "bg-gradient-to-br from-[#E8D5A3] via-[#D4AF78] to-[#8B7240]",
          "shadow-[0_0_0_4px_rgba(191,162,100,0.15),0_8px_32px_rgba(191,162,100,0.35)]",
          isOpen &&
            "shadow-[0_0_0_4px_rgba(191,162,100,0.25),0_8px_32px_rgba(191,162,100,0.5)]",
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
              <X className="w-5 h-5 text-[#030303]" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="w-5 h-5 text-[#030303]" />
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
            className="absolute inset-0 rounded-full bg-[#BFA264]/30 pointer-events-none"
          />
        )}
      </motion.button>
    </>
  );
};

export default Grace;
