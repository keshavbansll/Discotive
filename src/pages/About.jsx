// src/pages/About.jsx
// DISCOTIVE — MAANG-Grade About Page / Manifesto
// Architecture: Cinematic Scroll, Typography-driven, Hyper-Minimalist

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";

// ─── GLOBAL CSS (Scoped to About) ─────────────────────────────────────────────
const ABOUT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Poppins:wght@300;400;500;600;700&display=swap');

.ab-root {
  --void: #030303;
  --depth: #0A0A0A;
  --surface: #0F0F0F;
  --gold-1: #BFA264;
  --gold-2: #D4AF78;
  --gold-3: #8B7240;
  --gold-4: #E8D5A3;
  --gold-dim: rgba(191,162,100,0.08);
  --border: rgba(255,255,255,0.07);
  --text-primary: #F5F0E8;
  --text-secondary: rgba(245,240,232,0.60);
  --text-dim: rgba(245,240,232,0.28);
  --font-display: 'Montserrat', sans-serif;
  --font-body: 'Poppins', sans-serif;
  --nav-h: 68px;
}

.ab-root *, .ab-root *::before, .ab-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

.ab-root {
  min-height: 100svh;
  background: var(--void);
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* CURSOR (Mirrored from Landing for continuity) */
.ab-cursor-dot, .ab-cursor-ring {
  position: fixed; pointer-events: none; z-index: 99999; display: none; border-radius: 50%;
}
@media (min-width: 900px) {
  .ab-cursor-dot, .ab-cursor-ring { display: block; }
  .ab-root { cursor: none; }
  .ab-root a, .ab-root button, .ab-root [role="button"] { cursor: none; }
}
.ab-cursor-dot {
  width: 6px; height: 6px; background: var(--gold-4);
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px var(--gold-2), 0 0 20px rgba(191,162,100,0.4);
  transition: width 0.2s, height 0.2s, background 0.2s;
}
.ab-cursor-dot.hovering { width: 10px; height: 10px; background: var(--gold-2); box-shadow: 0 0 20px var(--gold-2); }
.ab-cursor-ring {
  width: 36px; height: 36px; border: 1.5px solid rgba(191,162,100,0.6);
  transform: translate(-50%, -50%); background: rgba(191,162,100,0.03);
  transition: width 0.3s cubic-bezier(0.23,1,0.32,1), height 0.3s cubic-bezier(0.23,1,0.32,1), border-color 0.3s;
}
.ab-cursor-ring.hovering { width: 56px; height: 56px; border-color: var(--gold-2); background: rgba(191,162,100,0.08); }

/* NAV */
.ab-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000; height: var(--nav-h);
  display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
  transition: background 0.4s, backdrop-filter 0.4s, border-color 0.4s;
  border-bottom: 0.5px solid transparent;
}
.ab-nav.scrolled {
  background: rgba(3,3,3,0.88); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 0.5px solid var(--border);
}
@media (min-width: 900px) { .ab-nav { padding: 0 48px; } }

.ab-nav-logo img { height: 28px; width: auto; object-fit: contain; cursor: pointer; }
@media (min-width: 900px) { .ab-nav-logo img { height: 34px; } }

.ab-nav-right { display: flex; align-items: center; gap: 24px; }
.ab-nav-back {
  font-family: var(--font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--text-secondary); text-decoration: none;
  background: none; border: none; display: flex; align-items: center; gap: 8px;
  transition: color 0.2s;
}
.ab-nav-back:hover { color: var(--gold-2); }

/* SECTIONS */
.ab-section { padding: 120px 20px; position: relative; }
@media (min-width: 640px) { .ab-section { padding: 160px 32px; } }
@media (min-width: 900px) { .ab-section { padding: 200px 48px; } }

.ab-container { max-width: 1000px; margin: 0 auto; width: 100%; }

/* HERO */
.ab-hero {
  min-height: 100svh; display: flex; flex-direction: column; justify-content: center;
  padding: 0 20px; position: relative; overflow: hidden;
}
.ab-hero-bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(circle at 50% 0%, rgba(139,114,64,0.15) 0%, var(--void) 60%);
}
.ab-hero-content { position: relative; z-index: 10; max-width: 1200px; margin: 0 auto; width: 100%; }

.ab-label {
  font-size: 10px; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--gold-3); font-family: var(--font-body); font-weight: 700;
  margin-bottom: 24px; display: flex; align-items: center; gap: 12px;
}
.ab-label::before { content: ''; display: block; width: 32px; height: 1px; background: var(--gold-3); }

.ab-title {
  font-family: var(--font-display); font-size: clamp(40px, 8vw, 100px);
  font-weight: 900; letter-spacing: -0.04em; line-height: 1.05; color: var(--text-primary);
  margin-bottom: 32px;
}
.ab-gold-text {
  background: linear-gradient(135deg, #BFA264 0%, #D4AF78 35%, #E8D5A3 55%, #BFA264 75%, #8B7240 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.ab-subtitle {
  font-family: var(--font-body); font-size: clamp(16px, 2vw, 24px);
  font-weight: 300; color: var(--text-secondary); line-height: 1.6; max-width: 680px;
}

/* MANIFESTO GRID */
.ab-grid { display: grid; grid-template-columns: 1fr; gap: 64px; margin-top: 80px; }
@media (min-width: 900px) {
  .ab-grid { grid-template-columns: 1fr 1fr; gap: 120px; align-items: center; }
  .ab-grid-reverse { direction: rtl; }
  .ab-grid-reverse > * { direction: ltr; }
}

.ab-metric-card {
  background: var(--surface); border: 0.5px solid var(--border);
  padding: 48px; border-radius: 4px; position: relative; overflow: hidden;
}
.ab-metric-number {
  font-family: var(--font-display); font-size: clamp(60px, 8vw, 120px);
  font-weight: 900; color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,0.05);
  position: absolute; top: -10px; right: -10px; line-height: 1; user-select: none;
}
.ab-metric-title { font-family: var(--font-display); font-size: 24px; font-weight: 700; margin-bottom: 16px; color: var(--gold-2); }
.ab-metric-desc { font-family: var(--font-body); font-size: 15px; color: var(--text-secondary); line-height: 1.8; font-weight: 300; }

/* GRAIN */
.ab-grain {
  position: fixed; inset: -50%; width: 200%; height: 200%; opacity: 0.015; pointer-events: none; z-index: 9998;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: ab-grain 0.4s steps(1) infinite;
}
@keyframes ab-grain {
  0%,100% { transform: translate(0,0); }
  20% { transform: translate(3%,2%); }
  40% { transform: translate(-3%,-2%); }
  60% { transform: translate(2%,-4%); }
  80% { transform: translate(-2%,3%); }
}

/* FOOTER (Mirrored) */
.ab-footer { border-top: 0.5px solid var(--border); padding: 52px 20px 32px; margin-top: 80px; }
@media (min-width: 640px) { .ab-footer { padding: 64px 32px 36px; } }
@media (min-width: 900px) { .ab-footer { padding: 64px 48px 36px; } }
`;

// ─── CUSTOM CURSOR ────────────────────────────────────────────────────────────
function Cursor() {
  const dotRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);
  const springConf = { damping: 22, stiffness: 280, mass: 0.5 };
  const ringX = useSpring(mouseX, springConf);
  const ringY = useSpring(mouseY, springConf);

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 900) return;
    const onMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (dotRef.current) {
        dotRef.current.style.left = e.clientX + "px";
        dotRef.current.style.top = e.clientY + "px";
      }
    };
    const onOver = (e) => {
      if (e.target.closest("a, button, [role='button']")) setHovering(true);
    };
    const onOut = (e) => {
      if (e.target.closest("a, button, [role='button']")) setHovering(false);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className={`ab-cursor-dot${hovering ? " hovering" : ""}`}
      />
      <motion.div
        className={`ab-cursor-ring${hovering ? " hovering" : ""}`}
        style={{ left: ringX, top: ringY, position: "fixed" }}
      />
    </>
  );
}

// ─── ANIMATED REVEAL WRAPPER ──────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 30 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── MAIN ABOUT PAGE ──────────────────────────────────────────────────────────
export default function About() {
  const navigate = useNavigate();
  const [navScrolled, setNavScrolled] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  useEffect(() => {
    const el = document.createElement("style");
    el.id = "ab-styles";
    el.textContent = ABOUT_CSS;
    document.head.appendChild(el);
    document.title = "About | Discotive — The Execution Engine";
    return () => {
      document.getElementById("ab-styles")?.remove();
    };
  }, []);

  useEffect(() => {
    return scrollY.on("change", (v) => setNavScrolled(v > 40));
  }, [scrollY]);

  return (
    <div className="ab-root">
      <div className="ab-grain" />
      <Cursor />

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <nav className={`ab-nav${navScrolled ? " scrolled" : ""}`}>
        <div className="ab-nav-logo" onClick={() => navigate("/")}>
          <img src="/Logo with Title.png" alt="Discotive" />
        </div>
        <div className="ab-nav-right">
          <button className="ab-nav-back" onClick={() => navigate("/")}>
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Return to Protocol
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="ab-hero">
        <motion.div
          className="ab-hero-bg"
          style={{ y: heroY, opacity: heroOpacity }}
        />
        <div className="ab-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="ab-label">The Discotive Manifesto</div>
            <h1 className="ab-title">
              We built an engine.
              <br />
              <span className="ab-gold-text">Not a network.</span>
            </h1>
            <p className="ab-subtitle">
              The resume is a relic. Social networks prioritize consumption over
              creation. We looked at the infrastructure of human potential and
              found it fundamentally broken. So we engineered a replacement.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── THE PROBLEM ────────────────────────────────────────────────────── */}
      <section
        className="ab-section"
        style={{ background: "rgba(255,255,255,0.005)" }}
      >
        <div className="ab-container">
          <Reveal>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 800,
                marginBottom: 24,
              }}
            >
              Consumption is a trap.
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                maxWidth: 800,
                fontWeight: 300,
              }}
            >
              The current landscape rewards those who talk about building,
              rather than those who build. Profiles are padded with unverified
              claims. Applications disappear into the void. The system isn't
              designed to map your trajectory—it's designed to keep you
              endlessly scrolling. We reject this paradigm.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── THE ARCHITECTURE ───────────────────────────────────────────────── */}
      <section className="ab-section">
        <div className="ab-container">
          <Reveal>
            <div className="ab-label">System Architecture</div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 64px)",
                fontWeight: 900,
                marginBottom: 16,
              }}
            >
              Zero Trust. Absolute Proof.
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                maxWidth: 600,
                fontWeight: 300,
              }}
            >
              Discotive operates on a mathematical absolute: if you didn't
              execute it, it doesn't exist. Our architecture converts your
              professional output into verifiable data points.
            </p>
          </Reveal>

          <div className="ab-grid">
            <Reveal delay={0.1}>
              <div className="ab-metric-card">
                <div className="ab-metric-number">01</div>
                <h3 className="ab-metric-title">Cryptographic Vault</h3>
                <p className="ab-metric-desc">
                  Every asset, project, and certification you upload is
                  processed through a SHA-256 pipeline. Your portfolio isn't
                  just a gallery; it is an immutable proof of work that cannot
                  be falsified. Granular privacy controls ensure you dictate
                  exactly who sees what.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ padding: "0 20px" }}>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                    fontSize: 24,
                    marginBottom: 12,
                  }}
                >
                  Engineered for Reality
                </h4>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    fontSize: 14,
                    fontWeight: 300,
                  }}
                >
                  We don't care about your "summary." We parse your code, your
                  designs, your business models. Our verification layer
                  separates the operators from the spectators.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="ab-grid ab-grid-reverse">
            <Reveal delay={0.1}>
              <div className="ab-metric-card">
                <div className="ab-metric-number">02</div>
                <h3 className="ab-metric-title">The Global Ledger</h3>
                <p className="ab-metric-desc">
                  Your Discotive Score is a live, dynamic variable. It
                  calculates node execution, streak retention, and verified peer
                  alliances. It powers a real-time leaderboard across 180+
                  countries. Rank is earned entirely through execution.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ padding: "0 20px" }}>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                    fontSize: 24,
                    marginBottom: 12,
                  }}
                >
                  Unforgiving Meritocracy
                </h4>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    fontSize: 14,
                    fontWeight: 300,
                  }}
                >
                  Endorsements are easily traded. Mathematical execution is not.
                  The leaderboard creates massive, constructive tension—pushing
                  you to optimize your daily output.
                </p>
              </div>
            </Reveal>
          </div>

          <div className="ab-grid">
            <Reveal delay={0.1}>
              <div className="ab-metric-card">
                <div className="ab-metric-number">03</div>
                <h3 className="ab-metric-title">AI-Directed DAG Maps</h3>
                <p className="ab-metric-desc">
                  Career paths are no longer linear; they are Directed Acyclic
                  Graphs (DAG). Provide your end-state objective, and our
                  intelligence engine generates the exact nodes you must conquer
                  to reach it. No fog. Only execution steps.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ padding: "0 20px" }}>
                <h4
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--text-primary)",
                    fontSize: 24,
                    marginBottom: 12,
                  }}
                >
                  Algorithmic Certainty
                </h4>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                    fontSize: 14,
                    fontWeight: 300,
                  }}
                >
                  The machine learns from the trajectories of top operators. It
                  identifies the optimal path, anticipates bottlenecks, and
                  dynamically re-routes your map when the industry pivots.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── THE ORIGIN ─────────────────────────────────────────────────────── */}
      <section
        className="ab-section"
        style={{
          background: "rgba(255,255,255,0.01)",
          borderTop: "0.5px solid var(--border)",
        }}
      >
        <div className="ab-container" style={{ textAlign: "center" }}>
          <Reveal>
            <div className="ab-label" style={{ justifyContent: "center" }}>
              Origin
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(24px, 4vw, 42px)",
                fontWeight: 800,
                marginBottom: 24,
              }}
            >
              Compiled in Jaipur. Executed Globally.
            </h2>
            <p
              style={{
                fontSize: "16px",
                color: "var(--text-secondary)",
                lineHeight: 1.8,
                maxWidth: 700,
                margin: "0 auto",
                fontWeight: 300,
              }}
            >
              Discotive wasn't built in Silicon Valley. It was architected by
              operators who understood that talent is uniformly distributed, but
              the infrastructure to prove it is not. We built the platform we
              needed to bypass the gatekeepers. Now, we are open-sourcing that
              capability to the world.
            </p>
            <div style={{ marginTop: 48 }}>
              <button
                onClick={() => navigate("/auth")}
                style={{
                  background: "var(--text-primary)",
                  color: "var(--void)",
                  border: "none",
                  padding: "16px 32px",
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  borderRadius: "99px",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.02)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Join the Network
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER (Streamlined for About Page) ────────────────────────────── */}
      <footer className="ab-footer">
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img
              src="/Logo with Title.png"
              alt="Discotive"
              style={{ height: 20 }}
            />
            <span style={{ color: "var(--text-dim)", fontSize: 12 }}>|</span>
            <span
              style={{
                color: "var(--text-dim)",
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              The Execution Protocol
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
            © 2026 Discotive. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
