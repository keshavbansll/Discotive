import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";
import {
  Send,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

const goldText = {
  background:
    "linear-gradient(135deg,#8B6914 0%,#B8960C 20%,#D4AF37 35%,#F5E07A 50%,#D4AF37 65%,#B8960C 80%,#7A5C0A 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const TOPICS = [
  "General Inquiry",
  "Technical Support",
  "Billing & Subscription",
  "Partnership",
  "Media / Press",
  "Feature Request",
  "Security Report",
  "Enterprise Inquiry",
];

export default function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: "",
    message: "",
    _honey: "", // Bot trap
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Security: Honeypot trap. If a bot fills this hidden field, silently reject.
    if (form._honey !== "") {
      console.warn("[Security] Bot activity detected and neutralized.");
      setSuccess(true); // Fake success to confuse the bot
      return;
    }

    if (!form.name || !form.email || !form.message)
      return setError("Please fill all required fields.");

    setSubmitting(true);
    setError("");
    try {
      const submitTicket = httpsCallable(functions, "submitSupportTicket");
      await submitTicket({
        category: form.topic || "General Inquiry",
        subject: `[Contact] ${form.topic || "General"} — ${form.name}`,
        message: `From: ${form.name} <${form.email}>\n\n${form.message}`,
        priority: "Medium",
      });
      setSuccess(true);
    } catch (err) {
      setError("Submission failed. Email us directly at hello@discotive.in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-void text-text-primary overflow-x-hidden"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <Helmet>
        <title>Contact Command | Discotive</title>
        <meta
          name="description"
          content="Initiate secure communications with the Discotive operations team. Support, security, and enterprise inquiries."
        />
        <meta property="og:title" content="Contact Command | Discotive" />
        <meta
          property="og:description"
          content="Initiate secure communications with the Discotive operations team."
        />
      </Helmet>

      {/* Grain */}
      <div
        className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "200px",
        }}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 w-full z-50 border-b border-white/[0.04]"
        style={{ background: "rgba(3,3,3,0.9)", backdropFilter: "blur(24px)" }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Discotive"
              className="w-8 h-8 object-contain"
            />
            <span className="text-base md:text-lg font-black tracking-tighter">
              DISCOTIVE
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <Link
              to="/auth"
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black rounded-full"
              style={{
                background:
                  "linear-gradient(135deg,#B8960C,#D4AF37,#F5E07A,#D4AF37,#9A7B0A)",
              }}
            >
              Boot OS
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-28 md:pt-40 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-5 flex items-center justify-center gap-3">
            <div className="h-px w-8 bg-[#D4AF37]/40" /> Signal Us{" "}
            <div className="h-px w-8 bg-[#D4AF37]/40" />
          </div>
          <h1
            className="text-4xl md:text-6xl font-black tracking-[-0.04em] mb-4"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            <span className="text-white/90">Get in </span>
            <span style={goldText}>Touch.</span>
          </h1>
          <p className="text-white/35 max-w-xl mx-auto text-sm leading-relaxed">
            Every operator message gets a real response. Average response time
            is 24 hours.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-12 items-start">
          {/* Left — Contact methods */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-5"
          >
            {[
              {
                icon: Mail,
                label: "General",
                value: "hello@discotive.in",
                sub: "General queries and partnerships",
              },
              {
                icon: MessageSquare,
                label: "Support",
                value: "support@discotive.in",
                sub: "Technical issues and billing",
              },
              {
                icon: Mail,
                label: "Security",
                value: "security@discotive.in",
                sub: "Vulnerability reports — 2hr SLA",
              },
            ].map((c, i) => (
              <a
                key={i}
                href={`mailto:${c.value}`}
                className="flex items-start gap-4 p-5 rounded-2xl border border-white/[0.05] hover:border-[#D4AF37]/20 transition-all group"
                style={{ background: "rgba(8,8,8,0.9)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(212,175,55,0.08)",
                    border: "0.5px solid rgba(212,175,55,0.2)",
                  }}
                >
                  <c.icon className="w-4 h-4" style={{ color: "#D4AF37" }} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-1">
                    {c.label}
                  </div>
                  <div className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                    {c.value}
                  </div>
                  <div className="text-[10px] text-white/30 mt-0.5">
                    {c.sub}
                  </div>
                </div>
              </a>
            ))}

            <div
              className="p-5 rounded-2xl border border-white/[0.05]"
              style={{ background: "rgba(8,8,8,0.9)" }}
            >
              <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-widest mb-2">
                Response Time
              </div>
              <div className="space-y-2">
                {[
                  { label: "General inquiries", time: "24–48 hrs" },
                  { label: "Technical support", time: "24 hrs" },
                  { label: "Security reports", time: "2 hrs" },
                  { label: "Enterprise", time: "4 hrs" },
                ].map((r, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-white/30">{r.label}</span>
                    <span className="text-white/60 font-bold">{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div
              className="rounded-2xl border border-white/[0.05] overflow-hidden"
              style={{ background: "rgba(8,8,8,0.9)" }}
            >
              <div
                className="p-6 md:p-8 border-b border-white/[0.04]"
                style={{ background: "rgba(255,255,255,0.01)" }}
              >
                <h2 className="text-lg font-black text-white">
                  Send a Message
                </h2>
                <p className="text-[11px] text-white/30 mt-1">
                  All fields marked * are required.
                </p>
              </div>

              {success ? (
                <div className="p-8 md:p-12 flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
                    style={{
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.2)",
                    }}
                  >
                    <CheckCircle2
                      className="w-8 h-8"
                      style={{ color: "#D4AF37" }}
                    />
                  </div>
                  <h3 className="text-xl font-black text-white mb-2">
                    Transmission Received.
                  </h3>
                  <p className="text-sm text-white/40 max-w-xs leading-relaxed">
                    Our team will respond to {form.email} within 24 hours. We
                    read every message.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
                  {/* Invisible Honeypot Field */}
                  <input
                    type="text"
                    name="_honey"
                    style={{ display: "none" }}
                    tabIndex="-1"
                    autoComplete="off"
                    value={form._honey}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, _honey: e.target.value }))
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, name: e.target.value }))
                        }
                        required
                        className="w-full text-sm text-white placeholder-white/20 focus:outline-none transition-all rounded-xl px-4 py-3"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "0.5px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "rgba(212,175,55,0.4)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            "rgba(255,255,255,0.08)")
                        }
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, email: e.target.value }))
                        }
                        required
                        className="w-full text-sm text-white placeholder-white/20 focus:outline-none transition-all rounded-xl px-4 py-3"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "0.5px solid rgba(255,255,255,0.08)",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "rgba(212,175,55,0.4)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor =
                            "rgba(255,255,255,0.08)")
                        }
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                      Topic
                    </label>
                    <select
                      value={form.topic}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, topic: e.target.value }))
                      }
                      className="w-full text-sm text-white focus:outline-none transition-all rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <option value="">Select a topic...</option>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                        Message *
                      </label>
                      <span
                        className={`text-[9px] font-mono ${form.message.length > 900 ? "text-amber-400" : "text-white/20"}`}
                      >
                        {form.message.length}/1000
                      </span>
                    </div>
                    <textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          message: e.target.value.slice(0, 1000),
                        }))
                      }
                      required
                      rows={5}
                      className="w-full text-sm text-white placeholder-white/20 focus:outline-none resize-none transition-all rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "0.5px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(212,175,55,0.4)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(255,255,255,0.08)")
                      }
                      placeholder="Describe your query in detail..."
                    />
                  </div>
                  {error && (
                    <p className="text-xs font-bold text-red-400">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 font-black text-[11px] uppercase tracking-widest text-black rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg,#B8960C,#D4AF37,#F5E07A,#D4AF37,#9A7B0A)",
                      boxShadow: "0 0 20px rgba(212,175,55,0.2)",
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
            {["Privacy", "Contact"].map((l) => (
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
}
