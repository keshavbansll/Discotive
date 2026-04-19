import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../lib/cn";

const goldText = {
  background:
    "linear-gradient(135deg, #8B6914 0%, #B8960C 20%, #D4AF37 35%, #F5E07A 50%, #D4AF37 65%, #B8960C 80%, #7A5C0A 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

// ─── Section anchor ────────────────────────────────────────────────────────
const Section = ({ id, title, children, accent = false }) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    className="mb-14 scroll-mt-28"
  >
    <h2
      className={cn(
        "text-xl md:text-2xl font-black tracking-[-0.02em] mb-5 pb-4 border-b border-white/[0.06]",
        accent ? "" : "text-white/80",
      )}
    >
      {accent ? <span style={goldText}>{title}</span> : title}
    </h2>
    <div className="space-y-4 text-sm text-white/45 leading-relaxed">
      {children}
    </div>
  </motion.div>
);

const P = ({ children }) => <p className="leading-[1.8]">{children}</p>;

const Callout = ({ icon, title, body, color = "#D4AF37" }) => (
  <div
    className="flex items-start gap-4 p-5 rounded-2xl border my-5"
    style={{ background: `${color}06`, borderColor: `${color}20` }}
  >
    <span className="text-xl shrink-0">{icon}</span>
    <div>
      <div className="text-sm font-black mb-1.5" style={{ color }}>
        {title}
      </div>
      <p className="text-xs text-white/40 leading-relaxed">{body}</p>
    </div>
  </div>
);

const TechDetail = ({ title, items }) => (
  <div
    className="my-4 p-5 rounded-2xl border border-white/[0.05]"
    style={{ background: "rgba(8,8,8,0.9)" }}
  >
    <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-3">
      {title}
    </div>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-xs text-white/40">
          <span className="text-[#D4AF37]/50 shrink-0 mt-0.5">◆</span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

// ─── Privacy Policy Page ───────────────────────────────────────────────────
const PrivacyPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "data-collected", label: "Data Collected" },
    { id: "vault-security", label: "Vault Security" },
    { id: "score-engine", label: "Score Engine" },
    { id: "ai-data", label: "AI & Gemini" },
    { id: "data-rights", label: "Your Rights" },
    { id: "cookies", label: "Cookies" },
    { id: "contact", label: "Contact" },
  ];

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSection(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden selection:bg-[#D4AF37]/30">
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

      {/* Hero */}
      <div
        className="relative pt-40 pb-16 px-6 z-10 border-b border-white/[0.04]"
        style={{ background: "rgba(5,5,5,0.95)" }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
              <div className="h-[1px] w-8 bg-[#D4AF37]/40" />
              Trust Layer
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-5 leading-tight">
              <span className="text-white/90">Privacy</span>{" "}
              <span style={goldText}>Protocol.</span>
            </h1>
            <p className="text-white/35 max-w-2xl leading-relaxed mb-6">
              Discotive is built on a zero-trust architecture. Every piece of
              data you share is handled with military-grade encryption, minimal
              collection, and complete operator control. This document explains
              exactly what we do and why.
            </p>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Last Updated: January 2026
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                Version 3.1
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-white/25">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                GDPR Compliant
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body layout: ToC + Content */}
      <div className="max-w-7xl mx-auto px-6 py-16 z-10 relative flex flex-col lg:flex-row gap-12">
        {/* ToC sticky sidebar */}
        <aside className="lg:w-[240px] shrink-0">
          <div className="sticky top-28">
            <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-4">
              Contents
            </div>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold transition-all",
                    activeSection === s.id
                      ? "text-[#D4AF37]"
                      : "text-white/25 hover:text-white/50",
                  )}
                  style={
                    activeSection === s.id
                      ? { background: "rgba(212,175,55,0.08)" }
                      : undefined
                  }
                >
                  <div
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{
                      background:
                        activeSection === s.id
                          ? "#D4AF37"
                          : "rgba(255,255,255,0.15)",
                    }}
                  />
                  {s.label}
                </a>
              ))}
            </nav>
            <div
              className="mt-8 p-4 rounded-2xl border border-[#D4AF37]/15"
              style={{ background: "rgba(212,175,55,0.04)" }}
            >
              <div className="text-[8px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-2">
                Questions?
              </div>
              <p className="text-[9px] text-white/30 leading-relaxed mb-3">
                Our operators respond within 24hrs during beta.
              </p>
              <Link
                to="/contact"
                className="text-[9px] font-black text-[#D4AF37]/70 hover:text-[#D4AF37] uppercase tracking-widest transition-colors"
              >
                Contact Us →
              </Link>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-2xl">
          <Section id="overview" title="Overview" accent>
            <P>
              This Privacy Policy applies to all services provided by Discotive
              ("Discotive," "we," "us," or "our"), accessible at discotive.in
              and through our mobile applications. We operate under the
              principle of minimal data collection — we collect only what is
              necessary to operate the Career Engine, and nothing more.
            </P>
            <Callout
              icon="🔐"
              title="Zero-Trust Architecture"
              color="#D4AF37"
              body="Every service-to-service call within Discotive is authenticated using Firebase App Check with reCAPTCHA Enterprise v3. No unauthenticated requests can reach our Cloud Functions or Firestore database."
            />
            <P>
              By using Discotive, you agree to the terms described in this
              document. This policy is effective as of January 1, 2026.
            </P>
          </Section>

          <Section id="data-collected" title="Data We Collect">
            <P>
              We collect three categories of data: information you provide
              directly, information generated by your usage of the platform, and
              technical metadata required for security and performance.
            </P>
            <TechDetail
              title="Identity & Profile Data"
              items={[
                "Name, email address, username — required for account creation",
                "Country, state, educational institution — used for leaderboard segmentation",
                "Domain, niche, career goals — used to generate personalized execution maps",
                "Profile photo, bio, social links — optional, displayed publicly",
              ]}
            />
            <TechDetail
              title="Execution & Telemetry Data"
              items={[
                "Execution map nodes, edges, and task completion status",
                "Discotive Score mutations with timestamps and reasons",
                "Daily login dates for consistency engine calculations (IST timezone)",
                "Vault asset metadata (not file contents — only title, category, hash)",
              ]}
            />
            <TechDetail
              title="Technical Metadata"
              items={[
                "Firebase Analytics page views and session data (anonymized)",
                "Sentry error reports — no PII is included in error payloads",
                "Vercel Speed Insights — aggregate performance metrics only",
                "App Check tokens — not stored, validated in-flight only",
              ]}
            />
          </Section>

          <Section id="vault-security" title="Asset Vault Security" accent>
            <P>
              The Asset Vault is the most sensitive component of Discotive. It
              stores credential files, certificates, and proof-of-work documents
              that operators upload for verification. We apply enterprise-grade
              security at every layer.
            </P>
            <Callout
              icon="🛡️"
              title="SHA-256 Integrity Verification"
              color="#10b981"
              body="Every file uploaded to the Asset Vault is hashed using SHA-256 before storage. The hash is stored permanently in Firestore alongside the asset metadata, providing tamper-proof integrity verification."
            />
            <TechDetail
              title="Vault Security Specification"
              items={[
                "Files stored in Firebase Storage with role-based access control (RBAC)",
                "Client uploads go directly to Firebase Storage — files never transit our servers",
                "SHA-256 hash computed client-side and verified server-side on upload",
                "Admin verification is required before any asset achieves VERIFIED status",
                "Firestore security rules prevent cross-user vault access at the rule level",
                "Deleted files are purged from both Firebase Storage and Firestore simultaneously",
              ]}
            />
            <P>
              We never access vault file contents for any purpose other than
              admin verification. Files are not indexed, scanned, or used for
              machine learning without explicit opt-in (available in Pro tier
              settings).
            </P>
            <Callout
              icon="⚠️"
              title="Important Note on Pro Tier"
              color="#f59e0b"
              body="Pro tier users can opt-in to allow their anonymized execution data to improve Discotive's AI models. This is opt-in only and can be revoked at any time in Settings → Privacy."
            />
          </Section>

          <Section id="score-engine" title="Score Engine & Transactions">
            <P>
              The Discotive Score is computed using atomic Firestore
              transactions. Every score mutation — whether positive or negative
              — is logged to a tamper-evident score_log subcollection.
            </P>
            <TechDetail
              title="Score Audit Trail"
              items={[
                "Every mutation is recorded with: score amount, reason, timestamp, and resulting score",
                "Score log entries are write-once — operators can read but never modify their own log",
                "Score mutations require valid Firebase Auth tokens and App Check verification",
                "Server-side CRON (Firebase Cloud Scheduler) handles daily penalty calculations",
                "All penalty logic runs server-side — client cannot influence CRON execution",
              ]}
            />
            <P>
              Operators have the right to export their full score log at any
              time via the GDPR Data Export function in Settings. This export
              includes every score mutation since account creation.
            </P>
          </Section>

          <Section id="ai-data" title="AI & Gemini Integration">
            <P>
              Discotive uses Google Gemini 2.5 Flash for the Grace AI assistant,
              execution map generation, and node verification. All AI requests
              are proxied through Firebase Cloud Functions — your API keys are
              never exposed to the client.
            </P>
            <TechDetail
              title="AI Data Handling"
              items={[
                "Gemini API calls include only the minimum context needed for each request",
                "For map generation: domain, niche, and calibration answers are sent — no PII",
                "For Grace AI: name, score, and domain are sent — no passwords or sensitive data",
                "For node verification: node context and user-submitted payload text only",
                "No AI conversation history is stored on Discotive servers",
                "Google processes Gemini requests per Google's Cloud AI Platform privacy policy",
              ]}
            />
            <Callout
              icon="🤖"
              title="No Training on Your Data"
              color="#a855f7"
              body="By default, your execution data and vault assets are NEVER used to train AI models — not ours, not Google's. The opt-in ML Data Contribution setting (Pro only) must be explicitly enabled in Settings."
            />
          </Section>

          <Section id="data-rights" title="Your Rights (GDPR & Beyond)" accent>
            <P>
              Every Discotive operator has full control over their data. These
              rights apply regardless of your country of residence.
            </P>
            {[
              {
                right: "Right to Access",
                desc: "Export all your data at any time via Settings → Privacy → Export Data. This includes your profile, execution map, vault metadata, score log, and all stored preferences.",
                color: "#10b981",
              },
              {
                right: "Right to Deletion",
                desc: "Delete your account permanently from Settings → Privacy → Delete Account. All user data is purged from Firestore, Firebase Storage, and Analytics within 30 days.",
                color: "#3b82f6",
              },
              {
                right: "Right to Correction",
                desc: "Edit your profile, execution data, and preferences at any time from your Profile and Settings pages.",
                color: "#f59e0b",
              },
              {
                right: "Right to Restriction",
                desc: "You may set your profile to private at any time, removing it from public leaderboards and search. Only you and admins can view private profiles.",
                color: "#a855f7",
              },
            ].map((r, i) => (
              <Callout
                key={i}
                icon="◈"
                title={r.right}
                body={r.desc}
                color={r.color}
              />
            ))}
            <P>
              To exercise any of these rights, use the in-app controls in
              Settings → Privacy, or email privacy@discotive.in. We respond to
              all rights requests within 72 hours.
            </P>
          </Section>

          <Section id="cookies" title="Cookies & Tracking">
            <P>
              Discotive uses a minimal set of cookies required for platform
              operation. We do not use third-party advertising cookies or
              behavioral tracking pixels.
            </P>
            <TechDetail
              title="Cookie Registry"
              items={[
                "Firebase Auth session token — required for authentication, session-scoped",
                "Firebase App Check token — security validation, auto-refreshed every hour",
                "Vercel Analytics — privacy-preserving aggregate only, no individual tracking",
                "Umami Analytics — self-hosted, no cross-site tracking, GDPR compliant",
              ]}
            />
            <P>
              We do not use Google Analytics, Meta Pixel, or any third-party
              advertising SDKs. Our analytics infrastructure (Umami) is
              self-hosted and stores no PII.
            </P>
          </Section>

          <Section id="contact" title="Contact & Disputes">
            <P>
              For privacy-related inquiries, data access requests, or to report
              a potential data breach, contact our security team directly.
            </P>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-5">
              {[
                {
                  label: "Privacy Inquiries",
                  value: "privacy@discotive.in",
                  sub: "72hr response SLA",
                },
                {
                  label: "Security Reports",
                  value: "security@discotive.in",
                  sub: "2hr response for critical issues",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-white/[0.05]"
                  style={{ background: "rgba(8,8,8,0.9)" }}
                >
                  <div className="text-[8px] font-black text-[#D4AF37]/50 uppercase tracking-widest mb-1">
                    {c.label}
                  </div>
                  <div className="text-sm font-bold text-white/60">
                    {c.value}
                  </div>
                  <div className="text-[9px] text-white/25 mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>
            <P>
              Discotive is operated by Discotive Hubs, Jaipur, Rajasthan, India.
              This Privacy Policy is governed by Indian law (IT Act 2000 and
              DPDP Act 2023) and is GDPR-aligned for international operators.
            </P>
          </Section>

          {/* Footer note */}
          <div className="mt-16 pt-8 border-t border-white/[0.05] text-center">
            <p className="text-[9px] font-mono text-white/20 mb-3">
              Privacy Policy v3.1 · Effective January 1, 2026
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/contact"
                className="text-[9px] font-black text-[#D4AF37]/50 hover:text-[#D4AF37]/80 uppercase tracking-widest transition-colors"
              >
                Contact Us
              </Link>
              <span className="text-white/10">·</span>
              <Link
                to="/auth"
                className="text-[9px] font-black text-[#D4AF37]/50 hover:text-[#D4AF37]/80 uppercase tracking-widest transition-colors"
              >
                Boot the OS
              </Link>
            </div>
          </div>
        </main>
      </div>

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
            {["Features", "About", "Contact"].map((l) => (
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

export default PrivacyPage;
