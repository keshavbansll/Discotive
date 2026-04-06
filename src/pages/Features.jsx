import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import { cn } from "../lib/cn";

// ─── Shared gold gradient text style ──────────────────────────────────────
const goldText = {
  background:
    "linear-gradient(135deg, #8B6914 0%, #B8960C 20%, #D4AF37 35%, #F5E07A 50%, #D4AF37 65%, #B8960C 80%, #7A5C0A 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ─── Score Mutation Tick ───────────────────────────────────────────────────
const ScoreTick = ({ amount, color, y }) => (
  <motion.div
    className="absolute right-2 top-0 text-xs font-black pointer-events-none"
    style={{ color }}
    initial={{ opacity: 1, y: y || 0 }}
    animate={{ opacity: 0, y: (y || 0) - 30 }}
    transition={{ duration: 1.2, ease: "easeOut" }}
  >
    {amount > 0 ? `+${amount}` : amount}
  </motion.div>
);

// ─── Live Score Engine Widget ──────────────────────────────────────────────
const ScoreEngineWidget = () => {
  const events = [
    {
      id: 1,
      label: "Task Executed",
      points: 15,
      color: "#10b981",
      reason: "executionNode",
    },
    {
      id: 2,
      label: "Daily Login",
      points: 10,
      color: "#3b82f6",
      reason: "daily",
    },
    {
      id: 3,
      label: "Vault Verified",
      points: 30,
      color: "#a855f7",
      reason: "vault_strong",
    },
    {
      id: 4,
      label: "Alliance Forged",
      points: 15,
      color: "#f59e0b",
      reason: "alliance",
    },
    {
      id: 5,
      label: "Missed Day",
      points: -15,
      color: "#ef4444",
      reason: "penalty",
    },
  ];
  const [score, setScore] = useState(4200);
  const [ticks, setTicks] = useState([]);
  const [log, setLog] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);

  const fireEvent = (event) => {
    if (activeEvent) return;
    setActiveEvent(event.id);
    const newScore = Math.max(0, score + event.points);
    setScore(newScore);
    const tickId = Date.now();
    setTicks((t) => [
      ...t.slice(-4),
      { id: tickId, amount: event.points, color: event.color },
    ]);
    setLog((l) => [
      {
        id: tickId,
        label: event.label,
        points: event.points,
        color: event.color,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
      ...l.slice(0, 5),
    ]);
    setTimeout(() => {
      setTicks((t) => t.filter((x) => x.id !== tickId));
      setActiveEvent(null);
    }, 1300);
  };

  return (
    <div
      className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden"
      style={{ background: "#070707" }}
    >
      {/* Score display */}
      <div
        className="relative p-5 border-b border-white/[0.04]"
        style={{
          background:
            "linear-gradient(135deg, rgba(212,175,55,0.05), transparent)",
        }}
      >
        {ticks.map((t) => (
          <ScoreTick key={t.id} amount={t.amount} color={t.color} />
        ))}
        <div className="text-[8px] font-black text-[#D4AF37]/50 uppercase tracking-widest mb-1">
          Discotive Score
        </div>
        <motion.div
          key={score}
          className="text-3xl font-black font-mono"
          style={goldText}
        >
          {score.toLocaleString()}
        </motion.div>
        <div className="mt-2 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #D4AF37, #F5E07A)",
              width: `${Math.min(100, (score / 10000) * 100)}%`,
            }}
            animate={{ width: `${Math.min(100, (score / 10000) * 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      {/* Event buttons */}
      <div className="p-4 grid grid-cols-2 gap-2">
        {events.map((ev) => (
          <motion.button
            key={ev.id}
            onClick={() => fireEvent(ev)}
            whileTap={{ scale: 0.95 }}
            disabled={!!activeEvent}
            className="px-3 py-2.5 rounded-xl text-[10px] font-black text-left transition-all border disabled:opacity-40"
            style={{
              background: `${ev.color}0d`,
              borderColor: `${ev.color}30`,
              color: ev.color,
            }}
          >
            {ev.label}
            <span className="ml-1.5 text-[9px] opacity-60">
              {ev.points > 0 ? `+${ev.points}` : ev.points}
            </span>
          </motion.button>
        ))}
      </div>
      {/* Log */}
      {log.length > 0 && (
        <div className="px-4 pb-4 space-y-1.5">
          <div className="text-[7px] font-black text-white/20 uppercase tracking-widest mb-2">
            Transaction Log
          </div>
          <AnimatePresence mode="popLayout">
            {log.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between rounded-lg px-3 py-1.5 border border-white/[0.04]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <span
                  className="text-[9px] font-bold"
                  style={{ color: entry.color }}
                >
                  {entry.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] font-mono text-white/20">
                    {entry.time}
                  </span>
                  <span
                    className="text-[9px] font-black font-mono"
                    style={{ color: entry.color }}
                  >
                    {entry.points > 0 ? `+${entry.points}` : entry.points}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ─── Vault Asset Widget ────────────────────────────────────────────────────
const VaultWidget = () => {
  const [assets, setAssets] = useState([
    {
      id: 1,
      title: "Google Cloud Certificate",
      category: "Certificate",
      status: "VERIFIED",
      strength: "Strong",
      hash: "a1b2c3d4",
      score: 30,
    },
    {
      id: 2,
      title: "GitHub Portfolio",
      category: "Project",
      status: "VERIFIED",
      strength: "Medium",
      hash: "e5f6a7b8",
      score: 20,
    },
    {
      id: 3,
      title: "Internship Letter",
      category: "Employment",
      status: "PENDING",
      strength: null,
      hash: "c9d0e1f2",
      score: null,
    },
  ]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  const runAnalysis = () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalyzeProgress(0);
    const steps = [20, 45, 68, 89, 100];
    let i = 0;
    const iv = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(iv);
        setAnalyzing(false);
        setAssets((a) =>
          a.map((x) =>
            x.id === 3
              ? { ...x, status: "VERIFIED", strength: "Medium", score: 20 }
              : x,
          ),
        );
      } else {
        setAnalyzeProgress(steps[i++]);
      }
    }, 400);
  };

  const strengthColor = {
    Strong: "#10b981",
    Medium: "#f59e0b",
    Weak: "#3b82f6",
  };

  return (
    <div
      className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden"
      style={{ background: "#070707" }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div>
          <div className="text-[8px] font-black text-[#D4AF37]/50 uppercase tracking-widest">
            Asset Vault
          </div>
          <div className="text-xs font-bold text-white/60 mt-0.5">
            {assets.filter((a) => a.status === "VERIFIED").length} Verified
          </div>
        </div>
        <motion.button
          onClick={runAnalysis}
          disabled={analyzing}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
          style={{
            background: analyzing
              ? "rgba(16,185,129,0.1)"
              : "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.2)",
            color: analyzing ? "#10b981" : "#D4AF37",
          }}
        >
          {analyzing ? `Hashing ${analyzeProgress}%` : "Run SHA-256"}
        </motion.button>
      </div>
      <div className="p-4 space-y-2">
        {assets.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
              style={{
                background:
                  a.status === "VERIFIED"
                    ? `${strengthColor[a.strength]}15`
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${a.status === "VERIFIED" ? strengthColor[a.strength] + "40" : "rgba(255,255,255,0.08)"}`,
                color:
                  a.status === "VERIFIED"
                    ? strengthColor[a.strength]
                    : "rgba(255,255,255,0.3)",
              }}
            >
              {a.category.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-white/70 truncate">
                {a.title}
              </div>
              <div className="text-[8px] font-mono text-white/25 mt-0.5">
                {a.status === "VERIFIED"
                  ? `#${a.hash}...`
                  : analyzing && a.id === 3
                    ? `Computing SHA-256 [${analyzeProgress}%]`
                    : "Awaiting verification"}
              </div>
            </div>
            {a.status === "VERIFIED" ? (
              <div
                className="text-[9px] font-black"
                style={{ color: strengthColor[a.strength] }}
              >
                +{a.score}pts
              </div>
            ) : (
              <div className="text-[8px] font-bold text-white/25 uppercase tracking-wider">
                Pending
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Neural Engine Widget ──────────────────────────────────────────────────
const NeuralEngineWidget = () => {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const steps = [
    {
      label: "Initialize adjacency list",
      detail: "Building edge map O(V+E)",
      status: "ok",
    },
    {
      label: "Compute in-degrees",
      detail: "Source node detection",
      status: "ok",
    },
    {
      label: "Kahn's topological sort",
      detail: "BFS queue traversal",
      status: "ok",
    },
    {
      label: "State machine evaluation",
      detail: "LOCKED → ACTIVE → VERIFIED",
      status: "ok",
    },
    {
      label: "Cycle detection",
      detail: "Zero cycles detected ✓",
      status: "ok",
    },
    {
      label: "Hydrate React Flow nodes",
      detail: "Injecting _computed states",
      status: "ok",
    },
  ];

  const runSort = () => {
    if (running) return;
    setRunning(true);
    setStep(0);
    let i = 0;
    const iv = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(iv);
        setRunning(false);
      } else setStep(++i);
    }, 380);
  };

  return (
    <div
      className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden font-mono"
      style={{ background: "#060606" }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: running ? "#D4AF37" : "#10b981",
              boxShadow: `0 0 6px ${running ? "#D4AF37" : "#10b981"}`,
            }}
          />
          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
            Neural Engine · Kahn's Algorithm
          </span>
        </div>
        <motion.button
          onClick={runSort}
          disabled={running}
          whileTap={{ scale: 0.95 }}
          className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all"
          style={{
            background: "rgba(212,175,55,0.1)",
            border: "1px solid rgba(212,175,55,0.2)",
            color: "#D4AF37",
            opacity: running ? 0.5 : 1,
          }}
        >
          {running ? "Running..." : "Execute Sort"}
        </motion.button>
      </div>
      <div className="p-4 space-y-2">
        {steps.map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300",
              i < step ? "opacity-100" : "opacity-20",
            )}
          >
            <div
              className="w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5"
              style={{
                background:
                  i < step ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${i < step ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              {i < step && (
                <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500" />
              )}
            </div>
            <div>
              <div className="text-[9px] font-bold text-white/60">
                {s.label}
              </div>
              <div className="text-[8px] text-white/25 mt-0.5">{s.detail}</div>
            </div>
            {i === step - 1 && running && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="ml-auto text-[8px] text-[#D4AF37]"
              >
                ▶
              </motion.div>
            )}
          </div>
        ))}
        {step >= steps.length && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-xl border border-emerald-500/20 text-[8px] font-black text-emerald-400 uppercase tracking-widest"
            style={{ background: "rgba(16,185,129,0.06)" }}
          >
            ✓ Graph compiled · O(V+E) · Zero cycles detected
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Grace AI Widget ───────────────────────────────────────────────────────
const GraceWidget = () => {
  const [messages, setMessages] = useState([
    {
      role: "grace",
      text: "Hey Keshav 👋 Your Discotive Score is up 340pts this week. Top 4% globally. Keep it up.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const canned = [
    "How do I improve my score?",
    "What should I focus on?",
    "How does vault verification work?",
  ];

  const cannedResponses = {
    "How do I improve my score?":
      "Complete your pending execution nodes, maintain your daily login streak, and upload verified assets to your vault. Streak multipliers compound significantly after day 7.",
    "What should I focus on?":
      "Based on your profile, your execution map has 3 uncompleted core nodes. Complete those first — they yield +30pts each. Your vault also has 2 pending assets awaiting verification.",
    "How does vault verification work?":
      "Upload your asset (PDF, image, or link). Our admin team reviews it and assigns Weak (+10), Medium (+20), or Strong (+30) strength. Verification usually takes 2–5 days.",
  };

  const sendMessage = (text) => {
    if (loading || !text.trim()) return;
    const userMsg = text.trim();
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setTimeout(() => {
      const reply =
        cannedResponses[userMsg] ||
        "That's a great question. I'd recommend checking your Dashboard for real-time telemetry. Your execution map and vault status are the two biggest score levers.";
      setMessages((m) => [...m, { role: "grace", text: reply }]);
      setLoading(false);
    }, 900);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className="rounded-[1.5rem] border border-white/[0.06] overflow-hidden flex flex-col h-[380px]"
      style={{ background: "#070707" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]"
        style={{ background: "rgba(12,12,12,0.9)" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #D4AF37, #F5E07A)",
            boxShadow: "0 0 12px rgba(212,175,55,0.4)",
          }}
        >
          <span className="text-black text-xs font-black">G</span>
        </div>
        <div>
          <div className="text-xs font-black text-white">Grace</div>
          <div className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-widest">
            Online · Gemini 2.5 Flash
          </div>
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed"
              style={
                m.role === "user"
                  ? {
                      background: "rgba(212,175,55,0.12)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      color: "rgba(255,255,255,0.8)",
                      borderTopRightRadius: 4,
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.65)",
                      borderTopLeftRadius: 4,
                    }
              }
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl border border-white/[0.06]"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderTopLeftRadius: 4,
              }}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      delay: i * 0.18,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div
        className="px-4 pb-2 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {canned.map((c) => (
          <button
            key={c}
            onClick={() => sendMessage(c)}
            className="shrink-0 px-3 py-1.5 rounded-full text-[8px] font-bold text-white/30 hover:text-white/60 transition-colors border border-white/[0.06] hover:border-[#D4AF37]/30 whitespace-nowrap"
          >
            {c}
          </button>
        ))}
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask Grace anything..."
          className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37]/30 transition-colors"
        />
        <motion.button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: input.trim()
              ? "linear-gradient(135deg, #D4AF37, #F5E07A)"
              : "rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-black text-xs">→</span>
        </motion.button>
      </div>
    </div>
  );
};

// ─── Feature module card ───────────────────────────────────────────────────
const FeatureModule = ({
  num,
  title,
  subtitle,
  description,
  bullets,
  widget,
  reversed = false,
}) => (
  <motion.section
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.6 }}
    className="py-28 px-6 border-b border-white/[0.04] max-w-7xl mx-auto"
  >
    <div
      className={cn(
        "flex flex-col gap-16 items-center",
        reversed ? "lg:flex-row-reverse" : "lg:flex-row",
      )}
    >
      {/* Text */}
      <div className="flex-1">
        <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
          <div className="h-[1px] w-8 bg-[#D4AF37]/40" />
          {num} // {subtitle}
        </div>
        <h2 className="text-4xl md:text-5xl font-black tracking-[-0.03em] mb-4 leading-tight">
          {title}
        </h2>
        <p className="text-white/40 leading-relaxed mb-8 max-w-lg">
          {description}
        </p>
        <div className="space-y-3">
          {bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-4 h-4 rounded-md mt-0.5 shrink-0 flex items-center justify-center"
                style={{
                  background: "rgba(212,175,55,0.08)",
                  border: "1px solid rgba(212,175,55,0.2)",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
              </div>
              <span className="text-sm text-white/50">{b}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Widget */}
      <div className="flex-1 w-full max-w-lg">{widget}</div>
    </div>
  </motion.section>
);

// ─── Bento grid for all 6 modules ─────────────────────────────────────────
const BentoGrid = () => {
  const modules = [
    {
      title: "Execution Map",
      desc: "AI-generated ReactFlow DAG with dependency resolution",
      icon: "◈",
      color: "#D4AF37",
    },
    {
      title: "Score Engine",
      desc: "Atomic Firestore transactions across 10+ event types",
      icon: "⚡",
      color: "#10b981",
    },
    {
      title: "Asset Vault",
      desc: "Zero-trust SHA-256 credential storage with admin pipeline",
      icon: "🔒",
      color: "#a855f7",
    },
    {
      title: "Global Arena",
      desc: "Cursor-paginated leaderboard with multi-dimensional filtering",
      icon: "🏆",
      color: "#f59e0b",
    },
    {
      title: "Grace AI",
      desc: "Gemini 2.5 Flash embedded career assistant",
      icon: "✦",
      color: "#38bdf8",
    },
    {
      title: "Neural Engine",
      desc: "Pure functional DAG compiler using Kahn's topological sort",
      icon: "⬡",
      color: "#fb7185",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
      {modules.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06 }}
          className="p-6 rounded-[1.5rem] border transition-all hover:scale-[1.02] group"
          style={{
            background: "rgba(8,8,8,0.95)",
            borderColor: `${m.color}20`,
            boxShadow: `0 0 30px ${m.color}06`,
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className="text-2xl"
              style={{ filter: `drop-shadow(0 0 8px ${m.color}60)` }}
            >
              {m.icon}
            </div>
            <div
              className="w-1.5 h-1.5 rounded-full opacity-40 group-hover:opacity-100 transition-opacity"
              style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }}
            />
          </div>
          <h3 className="text-sm font-black text-white/80 mb-2">{m.title}</h3>
          <p className="text-[11px] text-white/35 leading-relaxed">{m.desc}</p>
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <div
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: m.color + "80" }}
            >
              Live ↗
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ─── Features Page ─────────────────────────────────────────────────────────
const FeaturesPage = () => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden selection:bg-[#D4AF37]/30">
      {/* Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Navbar */}
      <nav
        className="fixed top-0 w-full z-50 border-b border-white/[0.04]"
        style={{ background: "rgba(3,3,3,0.9)", backdropFilter: "blur(24px)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Discotive"
              className="w-9 h-9 object-contain"
            />
            <span className="text-lg font-black tracking-tighter">
              DISCOTIVE
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="hidden md:block text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest"
            >
              Sign In
            </Link>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/auth")}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, #B8960C, #D4AF37, #F5E07A, #D4AF37, #9A7B0A)",
                boxShadow: "0 0 20px rgba(212,175,55,0.25)",
              }}
            >
              Boot OS
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative pt-40 pb-24 px-6 text-center z-10">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(212,175,55,0.05) 0%, transparent 60%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <div
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#D4AF37]/20 mb-8"
            style={{ background: "rgba(212,175,55,0.05)" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"
              style={{ boxShadow: "0 0 6px #D4AF37" }}
            />
            <span className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em]">
              The Arsenal · 6 Core Modules
            </span>
          </div>
          <h1
            className="font-black tracking-[-0.04em] leading-[0.9] mb-6"
            style={{ fontSize: "clamp(48px, 9vw, 100px)" }}
          >
            <span className="block text-white/90">The Engine Room.</span>
          </h1>
          <p className="text-lg text-white/35 max-w-2xl mx-auto leading-relaxed">
            Six battle-tested modules forged for operators who build rather than
            browse. Test them live below.
          </p>
        </motion.div>
      </div>

      {/* Bento overview */}
      <div className="max-w-7xl mx-auto px-6 z-10 relative">
        <BentoGrid />
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent mb-4" />
        <div className="text-center mb-4">
          <span className="text-[9px] font-black text-[#D4AF37]/40 uppercase tracking-[0.3em]">
            Live Interactive Modules Below
          </span>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
      </div>

      {/* Module 1: Score Engine */}
      <div className="z-10 relative">
        <FeatureModule
          num="01"
          subtitle="Score Engine"
          title={
            <>
              <span className="text-white/90">Atomic score</span>
              <br />
              <span style={goldText}>mutations, live.</span>
            </>
          }
          description="The Discotive Score tracks 10+ event types using atomic Firestore transactions. Streaks, tasks, vault verifications, alliances — every action compounds. Click events below to see it respond."
          bullets={[
            "Daily login bonuses with IST timezone enforcement",
            "Task completion at +5 to +30 based on node type",
            "Missed day penalties enforced by server-side CRON",
            "Vault verification yields Weak/Medium/Strong multipliers",
          ]}
          widget={<ScoreEngineWidget />}
        />

        {/* Module 2: Asset Vault */}
        <FeatureModule
          num="02"
          subtitle="Asset Vault"
          reversed
          title={
            <>
              <span className="text-white/90">SHA-256 proof</span>
              <br />
              <span style={goldText}>of work.</span>
            </>
          }
          description="Zero-trust credential storage. Every asset is hashed, reviewed by an admin, and assigned a verified strength rating that directly impacts your Discotive Score and public profile."
          bullets={[
            "Firebase Storage with SHA-256 integrity verification",
            "Admin review pipeline: Weak / Medium / Strong strength",
            "Verified assets appear on public profile permanently",
            "Supports PDF, PNG, JPG, DOCX, ZIP up to 25MB",
          ]}
          widget={<VaultWidget />}
        />

        {/* Module 3: Neural Engine */}
        <FeatureModule
          num="03"
          subtitle="Neural Engine"
          title={
            <>
              <span className="text-white/90">Kahn's algorithm.</span>
              <br />
              <span style={goldText}>O(V+E) execution.</span>
            </>
          }
          description="The DAG compiler is a pure functional state machine. It traverses your execution graph using Kahn's topological sort, computing every node's state in O(V+E) time with zero server round-trips."
          bullets={[
            "Kahn's BFS topological traversal — zero circular dependencies",
            "6-state machine: LOCKED → ACTIVE → IN_PROGRESS → VERIFIED",
            "Exponential backoff penalties for failed proof submissions",
            "Ghost states for free tier with 24h artificial delay",
          ]}
          widget={<NeuralEngineWidget />}
        />

        {/* Module 4: Grace AI */}
        <FeatureModule
          num="04"
          subtitle="Grace AI"
          reversed
          title={
            <>
              <span className="text-white/90">Your career AI,</span>
              <br />
              <span style={goldText}>always on.</span>
            </>
          }
          description="Grace is powered by Gemini 2.5 Flash and deployed through secure Cloud Functions. She knows your score, your nodes, your vault — and gives you direct, actionable career intelligence."
          bullets={[
            "Structured Q&A flows for common career scenarios",
            "Free-form Gemini 2.5 Flash integration via Cloud Functions",
            "Contextual map generation and expansion assistance",
            "Zero API keys on client — fully server-gated",
          ]}
          widget={<GraceWidget />}
        />
      </div>

      {/* Final CTA */}
      <section className="py-36 px-6 text-center relative z-10">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.04) 0%, transparent 70%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <h2 className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-6 leading-tight">
            The engine is ready.
            <br />
            <span style={goldText}>Are you?</span>
          </h2>
          <p className="text-white/30 mb-10">
            Boot Discotive OS and generate your first execution map in under 3
            minutes.
          </p>
          <motion.button
            whileHover={{
              scale: 1.04,
              boxShadow: "0 0 50px rgba(212,175,55,0.4)",
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/auth")}
            className="px-12 py-4 text-sm font-black uppercase tracking-widest text-black rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, #B8960C, #D4AF37, #F5E07A, #D4AF37, #9A7B0A)",
              boxShadow: "0 0 30px rgba(212,175,55,0.3)",
            }}
          >
            Start Free
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-white/[0.04] py-10 px-6 relative z-10"
        style={{ background: "rgba(5,5,5,0.9)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Discotive"
              className="w-7 h-7 object-contain"
            />
            <span className="text-sm font-black tracking-tighter text-white/60">
              DISCOTIVE
            </span>
          </div>
          <p className="text-[9px] font-mono text-white/20">
            © 2026 Discotive. The Unified Career Engine.
          </p>
          <div className="flex items-center gap-5">
            {["Privacy", "About", "Contact"].map((l) => (
              <Link
                key={l}
                to={`/${l.toLowerCase()}`}
                className="text-[9px] font-black text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;
