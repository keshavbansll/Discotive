import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { cn } from "../lib/cn";

const goldText = {
  background:
    "linear-gradient(135deg, #8B6914 0%, #B8960C 20%, #D4AF37 35%, #F5E07A 50%, #D4AF37 65%, #B8960C 80%, #7A5C0A 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ─── Stat Counter ──────────────────────────────────────────────────────────
const AnimatedStat = ({ value, label, delay = 0 }) => {
  const [count, setCount] = useState(0);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.5 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const numericValue = parseInt(value.replace(/[^0-9]/g, ""));
    let start = 0;
    const timer = setTimeout(() => {
      const iv = setInterval(() => {
        start += Math.ceil(numericValue / 60);
        if (start >= numericValue) {
          setCount(numericValue);
          clearInterval(iv);
        } else setCount(start);
      }, 20);
    }, delay);
    return () => clearTimeout(timer);
  }, [inView, value, delay]);

  const suffix = value.replace(/[0-9]/g, "");
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black mb-2" style={goldText}>
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[9px] font-black text-white/25 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
};

// ─── Tech stack item ───────────────────────────────────────────────────────
const TechItem = ({ name, desc, color, badge }) => (
  <motion.div
    initial={{ opacity: 0, x: -16 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.04] hover:border-[#D4AF37]/20 transition-all group"
    style={{ background: "rgba(8,8,8,0.9)" }}
  >
    <div
      className="w-2 h-2 rounded-full mt-1.5 shrink-0 group-hover:scale-125 transition-transform"
      style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-black text-white/70">{name}</span>
        {badge && (
          <span
            className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest"
            style={{
              background: `${color}15`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <p className="text-[10px] text-white/30 leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

// ─── Team member card ──────────────────────────────────────────────────────
const TeamCard = ({ name, role, initials, color, bio, socials }) => {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="relative w-full"
      style={{ perspective: "1000px", height: "320px" }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 180,
          damping: 22,
        }}
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-6 rounded-[2rem] border text-center"
          style={{
            background: "rgba(8,8,8,0.95)",
            borderColor: `${color}25`,
            backfaceVisibility: "hidden",
            boxShadow: `0 0 40px ${color}08`,
          }}
        >
          <div
            className="w-20 h-20 rounded-[1.2rem] border-2 flex items-center justify-center text-2xl font-black mb-4"
            style={{
              background: `${color}10`,
              borderColor: `${color}40`,
              color,
            }}
          >
            {initials}
          </div>
          <h3 className="text-lg font-black text-white/90 mb-1">{name}</h3>
          <p
            className="text-[9px] font-black uppercase tracking-widest mb-3"
            style={{ color: color + "80" }}
          >
            {role}
          </p>
          <div className="mt-auto text-[8px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1.5">
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: color }}
            />
            Hover to Inspect
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col p-6 rounded-[2rem] border"
          style={{
            background: `linear-gradient(135deg, ${color}08, rgba(8,8,8,0.98))`,
            borderColor: `${color}40`,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            boxShadow: `0 0 30px ${color}15`,
          }}
        >
          <p className="text-xs text-white/50 leading-relaxed flex-1 mb-4">
            {bio}
          </p>
          <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/[0.06]">
            {socials.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all hover:scale-105"
                style={{
                  color: color + "80",
                  borderColor: color + "30",
                  background: color + "08",
                }}
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Timeline item ─────────────────────────────────────────────────────────
const TimelineItem = ({ year, title, desc, active = false }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    className="flex gap-5 pb-10 relative"
  >
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div
        className="w-3 h-3 rounded-full z-10"
        style={{
          background: active ? "#D4AF37" : "rgba(255,255,255,0.15)",
          boxShadow: active ? "0 0 12px #D4AF37" : "none",
        }}
      />
      <div
        className="w-[1px] flex-1"
        style={{
          background: active
            ? "rgba(212,175,55,0.3)"
            : "rgba(255,255,255,0.06)",
        }}
      />
    </div>
    <div className="pt-0 pb-8">
      <div
        className="text-[8px] font-black uppercase tracking-widest mb-2"
        style={{ color: active ? "#D4AF37" : "rgba(255,255,255,0.2)" }}
      >
        {year}
      </div>
      <h4 className="text-sm font-black text-white/70 mb-1.5">{title}</h4>
      <p className="text-xs text-white/30 leading-relaxed max-w-sm">{desc}</p>
    </div>
  </motion.div>
);

// ─── About Page ────────────────────────────────────────────────────────────
const AboutPage = () => {
  const navigate = useNavigate();

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

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(ellipse, #D4AF37 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

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

      {/* ════ HERO / MANIFESTO ════ */}
      <section className="relative pt-44 pb-28 px-6 z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="h-[1px] w-8 bg-[#D4AF37]/40" />
              Our Manifesto
            </div>
            <h1
              className="font-black tracking-[-0.04em] leading-[0.88] mb-10"
              style={{ fontSize: "clamp(44px, 8vw, 96px)" }}
            >
              <span className="block text-white/90">Death to the</span>
              <span className="block relative" style={goldText}>
                resume.
                <span className="absolute inset-0 flex items-center pointer-events-none">
                  <span
                    className="w-full h-[3px] opacity-60"
                    style={{
                      background:
                        "linear-gradient(90deg, #D4AF37, transparent)",
                      marginTop: "0.6em",
                      display: "block",
                    }}
                  />
                </span>
              </span>
            </h1>
            <div className="max-w-2xl space-y-5 text-lg text-white/45 leading-relaxed">
              <p>
                The global career development market is broken. Students waste
                2–3 years in an information fog — consuming content without a
                clear execution roadmap, unable to verify their credibility,
                competing blind on platforms that prioritize keywords over real
                capability.
              </p>
              <p>
                We are building the antidote.{" "}
                <span className="text-white/70 font-bold">
                  Discotive converts a confusing professional future into a
                  deterministic, verifiable, scored execution system.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ════ THE PROBLEM ════ */}
      <section
        className="py-24 px-6 z-10 relative border-y border-white/[0.04]"
        style={{ background: "rgba(6,6,6,0.95)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-4">
              The Contrast
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em]">
              Broken Market vs. Deterministic Future
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Broken side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-[1.5rem] border border-[#ef4444]/15"
              style={{ background: "rgba(239,68,68,0.04)" }}
            >
              <div className="text-[8px] font-black text-[#ef4444]/60 uppercase tracking-widest mb-5">
                The Broken Market
              </div>
              {[
                "Resume inflation: 200+ applicants, keywords over capability",
                "2–3 year information fog with no execution roadmap",
                "Unverifiable credentials — anyone can lie",
                "Generic job boards with zero career infrastructure",
                "No way to measure or prove execution velocity",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <span className="text-[#ef4444]/60 text-sm shrink-0 mt-0.5">
                    ✕
                  </span>
                  <p className="text-xs text-white/40 leading-relaxed">{p}</p>
                </div>
              ))}
            </motion.div>
            {/* Discotive side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-[1.5rem] border border-[#D4AF37]/15"
              style={{ background: "rgba(212,175,55,0.04)" }}
            >
              <div className="text-[8px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-5">
                The Discotive Future
              </div>
              {[
                "Verifiable Proof-of-Work DAG — execution is on-chain",
                "AI-generated 30-day execution map with dependency resolution",
                "SHA-256 hashed credentials with admin verification pipeline",
                "Global Arena with mathematical Discotive Score ranking",
                "Every completed node becomes a permanent career artifact",
              ].map((p, i) => (
                <div key={i} className="flex items-start gap-3 mb-3">
                  <span className="text-[#D4AF37]/70 text-sm shrink-0 mt-0.5">
                    ◆
                  </span>
                  <p className="text-xs text-white/50 leading-relaxed">{p}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════ STATS ════ */}
      <section className="py-24 px-6 z-10 relative">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <AnimatedStat value="41000+" label="Registered Operators" delay={0} />
          <AnimatedStat value="3200000+" label="Execution Nodes" delay={100} />
          <AnimatedStat value="74%" label="DEM Efficiency Score" delay={200} />
          <AnimatedStat value="99%" label="Uptime SLA" delay={300} />
        </div>
      </section>

      {/* ════ TEAM ════ */}
      <section
        className="py-24 px-6 z-10 relative border-y border-white/[0.04]"
        style={{ background: "rgba(6,6,6,0.95)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-4">
              The Syndicate
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-4">
              Operators building
              <br />
              <span style={goldText}>for operators.</span>
            </h2>
            <p className="text-white/30 text-sm max-w-sm mx-auto">
              Hover each card to inspect the dossier.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <TeamCard
              name="Keshav Bansll"
              role="Co-Founder & Chief Architect"
              initials="KB"
              color="#D4AF37"
              bio="The visionary behind the Discotive protocol. Engineering the algorithmic death of the traditional resume. Former competitive programmer, now building infrastructure for the next generation of elite operators. Forged in Jaipur."
              socials={[
                {
                  label: "LinkedIn",
                  url: "https://linkedin.com/in/keshavbansll",
                },
                { label: "Twitter", url: "https://twitter.com/keshavbansll" },
              ]}
            />
            <TeamCard
              name="Reshmi Kumari"
              role="Co-Founder & CMO"
              initials="RK"
              color="#C0C0C0"
              bio="Architecting the narrative and expanding the syndicate. Forging global alliances to scale the Discotive ecosystem. Expert in growth strategy and community-led product development."
              socials={[
                { label: "LinkedIn", url: "https://linkedin.com/in/reshmikri" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* ════ ORIGIN ════ */}
      <section className="py-24 px-6 z-10 relative">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
              <div className="h-[1px] w-8 bg-[#D4AF37]/40" />
              Protocol Origin
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-6 leading-tight">
              Forged in
              <br />
              <span style={goldText}>Jaipur, Rajasthan.</span>
            </h2>
            <p className="text-white/40 leading-relaxed mb-8">
              The Discotive protocol is being architected, engineered, and
              scaled from Jaipur, India. We are proving that elite global
              infrastructure can be built from anywhere. The execution map
              doesn't care about your zip code.
            </p>
            <div
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-[#D4AF37]/20"
              style={{ background: "rgba(212,175,55,0.05)" }}
            >
              <span
                className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"
                style={{ boxShadow: "0 0 8px #D4AF37" }}
              />
              <span className="text-[8px] font-black text-[#D4AF37]/70 uppercase tracking-widest">
                📍 Jaipur, Rajasthan · India
              </span>
            </div>
          </div>
          {/* Timeline */}
          <div className="pt-2">
            <TimelineItem
              year="2024"
              title="The Idea"
              desc="Frustrated by resume culture, Keshav and Reshmi begin designing a proof-of-work career system."
            />
            <TimelineItem
              year="Q1 2025"
              title="Core Engine Built"
              desc="Neural Engine using Kahn's topological sort. Score Engine with atomic Firestore transactions. Vault infrastructure."
            />
            <TimelineItem
              year="Q3 2025"
              title="Closed Beta Launch"
              desc="First 500 operators onboarded. 40K+ execution nodes deployed. DEM index validated."
            />
            <TimelineItem
              year="2026"
              title="Global Open Launch"
              active
              desc="Full public launch. Gemini 2.5 Flash integration. Global Arena with multi-dimensional leaderboard."
            />
          </div>
        </div>
      </section>

      {/* ════ TECH STACK ════ */}
      <section
        className="py-24 px-6 z-10 relative border-y border-white/[0.04]"
        style={{ background: "rgba(6,6,6,0.95)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-4">
              The Stack
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-3">
              Built for <span style={goldText}>technical trust.</span>
            </h2>
            <p className="text-white/30 text-sm">
              Every architectural decision is intentional and documented.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TechItem
              name="React 19 + Vite 7"
              desc="Parallel server components, improved hydration. Code-split lazy routes for sub-50ms initial loads."
              color="#61DAFB"
              badge="Frontend"
            />
            <TechItem
              name="Firebase Gen 2 (Node 22)"
              desc="Cloud Functions v2 with secrets management. Firestore multi-region composite indexes."
              color="#FFCA28"
              badge="Backend"
            />
            <TechItem
              name="Kahn's Topological Sort"
              desc="Pure functional DAG compiler. O(V+E) state evaluation. Zero server round-trips for node state."
              color="#D4AF37"
              badge="Neural Engine"
            />
            <TechItem
              name="Gemini 2.5 Flash"
              desc="Structured JSON output mode for map generation. Grace AI career assistant via Cloud Function proxy."
              color="#4285F4"
              badge="AI Layer"
            />
            <TechItem
              name="Razorpay Subscriptions"
              desc="Webhook-verified tier upgrades. HMAC-SHA256 signature validation. No client-side tier escalation."
              color="#3395FF"
              badge="Payments"
            />
            <TechItem
              name="Firebase App Check"
              desc="reCAPTCHA Enterprise provider. Every API call is cryptographically authenticated."
              color="#FF6F00"
              badge="Security"
            />
          </div>
        </div>
      </section>

      {/* ════ PHILOSOPHY ════ */}
      <section className="py-28 px-6 z-10 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-6">
            Core Directive
          </div>
          <blockquote className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-tight mb-8">
            <span className="text-white/20">"</span>
            <span style={goldText}>Execution is worth millions.</span>
            <span className="text-white/70"> Ideas are cheap multipliers.</span>
            <span className="text-white/20">"</span>
          </blockquote>
          <p className="text-white/30 text-sm">
            — Discotive Operator Directive #001
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative z-10 border-t border-white/[0.04]">
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
          className="relative z-10 max-w-xl mx-auto"
        >
          <h2 className="text-4xl font-black tracking-[-0.04em] mb-5">
            Join the Syndicate.
          </h2>
          <p className="text-white/30 mb-10 leading-relaxed">
            41,000+ operators have already booted the OS. The leaderboard is
            live. The execution map is ready.
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
            Initialize Protocol
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
            © 2026 Discotive. Forged in Jaipur, India.
          </p>
          <div className="flex items-center gap-5">
            {["Features", "Contact", "Privacy"].map((l) => (
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

export default AboutPage;
