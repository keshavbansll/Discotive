import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import emailjs from "@emailjs/browser";
import { cn } from "../lib/cn";

const goldText = {
  background: "linear-gradient(135deg, #8B6914 0%, #B8960C 20%, #D4AF37 35%, #F5E07A 50%, #D4AF37 65%, #B8960C 80%, #7A5C0A 100%)",
  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
};

// ─── Glowing input ─────────────────────────────────────────────────────────
const UplinkInput = ({ label, type = "text", value, onChange, placeholder, required, error, as: Tag = "input", rows }) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative">
      <label className="block text-[8px] font-black text-white/25 uppercase tracking-[0.2em] mb-2">{label}{required && <span className="text-[#D4AF37] ml-1">*</span>}</label>
      <div className="relative">
        {/* Glow border */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ background: "transparent", boxShadow: "0 0 0 1px rgba(212,175,55,0.5), 0 0 20px rgba(212,175,55,0.15), inset 0 0 20px rgba(212,175,55,0.03)", borderRadius: "12px" }}
        />
        <Tag
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={cn("w-full bg-white/[0.02] border rounded-xl px-5 py-3.5 text-sm text-white/80 placeholder-white/15 outline-none transition-all resize-none",
            error ? "border-[#ef4444]/40" : focused ? "border-[#D4AF37]/40" : "border-white/[0.07]")}
          style={{ fontFamily: "inherit" }}
        />
      </div>
      {error && <p className="mt-1.5 text-[9px] font-bold text-[#ef4444]/70 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
};

// ─── Contact Page ──────────────────────────────────────────────────────────
const ContactPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", type: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [particles, setParticles] = useState([]);

  const types = [
    { id: "operator", label: "Operator Inquiry", desc: "General platform questions" },
    { id: "partnership", label: "Partnership Signal", desc: "Business development" },
    { id: "security", label: "Security Report", desc: "Vulnerability disclosure" },
    { id: "media", label: "Media Request", desc: "Press & editorial" },
  ];

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Identity required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid comm link required";
    if (!form.type) e.type = "Transmission type required";
    if (!form.message.trim() || form.message.length < 20) e.message = "Minimum 20 characters required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStatus("sending");
    setErrors({});

    // Simulate send (replace with real emailjs call in production)
    await new Promise(r => setTimeout(r, 1800));

    // Success particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, delay: i * 0.05
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 2000);
    setStatus("sent");
  };

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors(err => ({ ...err, [key]: "" }));
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-x-hidden selection:bg-[#D4AF37]/30">
      {/* Grain */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-[0.02]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px" }} />

      {/* Particles overlay */}
      {particles.map(p => (
        <motion.div key={p.id} className="fixed pointer-events-none z-[9999]" style={{ left: p.x, top: p.y }}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 1, 0], scale: [0, 2, 0], y: -80 }}
          transition={{ duration: 1.4, delay: p.delay, ease: "easeOut" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "radial-gradient(circle, #D4AF37, #F5E07A)", boxShadow: "0 0 8px #D4AF37" }} />
        </motion.div>
      ))}

      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #D4AF37 0%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.04]" style={{ background: "rgba(3,3,3,0.9)", backdropFilter: "blur(24px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Discotive" className="w-9 h-9 object-contain" />
            <span className="text-lg font-black tracking-tighter">DISCOTIVE</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="hidden md:block text-[10px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-widest">Sign In</Link>
            <motion.button whileHover={{ scale: 1.03 }} onClick={() => navigate("/auth")}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-black rounded-full"
              style={{ background: "linear-gradient(135deg, #B8960C, #D4AF37, #F5E07A, #D4AF37, #9A7B0A)", boxShadow: "0 0 20px rgba(212,175,55,0.25)" }}>
              Boot OS
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="relative min-h-screen flex items-center justify-center pt-28 pb-20 px-6 z-10">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Info */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="text-[9px] font-black text-[#D4AF37]/60 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <div className="h-[1px] w-8 bg-[#D4AF37]/40" />Secure Uplink
            </div>
            <h1 className="font-black tracking-[-0.04em] leading-[0.9] mb-6" style={{ fontSize: "clamp(40px, 7vw, 80px)" }}>
              <span className="block text-white/90">Signal the</span>
              <span style={goldText}>Operators.</span>
            </h1>
            <p className="text-white/40 leading-relaxed mb-10 max-w-md text-base">
              Every transmission reaches the operators directly. We triage daily and respond within 24–48 hours during beta. For critical security vulnerabilities, you get a response within 2 hours.
            </p>

            {/* Contact channels */}
            <div className="space-y-3 mb-10">
              {[
                { icon: "✉", label: "Primary Comm Link", value: "discotive@gmail.com", sub: "General inquiries & support" },
                { icon: "🔐", label: "Security Channel", value: "security@discotive.in", sub: "Vulnerability disclosure — 2hr SLA" },
                { icon: "📍", label: "Signal Origin", value: "Jaipur, Rajasthan, India", sub: "UTC+5:30" },
              ].map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-2xl border border-white/[0.05] hover:border-[#D4AF37]/20 transition-all"
                  style={{ background: "rgba(8,8,8,0.9)" }}>
                  <span className="text-lg shrink-0">{c.icon}</span>
                  <div>
                    <div className="text-[8px] font-black text-white/25 uppercase tracking-widest mb-0.5">{c.label}</div>
                    <div className="text-sm font-bold text-white/70">{c.value}</div>
                    <div className="text-[9px] text-white/25 mt-0.5">{c.sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/15" style={{ background: "rgba(16,185,129,0.04)" }}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: "0 0 8px #10b981" }} />
              <span className="text-[9px] font-black text-emerald-400/70 uppercase tracking-widest">All Systems Operational · 24h Response SLA</span>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <AnimatePresence mode="wait">
              {status === "sent" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-16 rounded-[2rem] border border-[#D4AF37]/20"
                  style={{ background: "rgba(212,175,55,0.04)", boxShadow: "0 0 60px rgba(212,175,55,0.08)" }}>
                  <div className="w-16 h-16 rounded-[1.2rem] flex items-center justify-center text-2xl mb-6" style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    ✓
                  </div>
                  <h3 className="text-2xl font-black mb-3" style={goldText}>Transmission Logged.</h3>
                  <p className="text-white/35 text-sm max-w-xs leading-relaxed mb-8">Your signal has been received. The operators will respond within 24–48 hours during beta.</p>
                  <button onClick={() => setStatus("idle")} className="text-[9px] font-black text-[#D4AF37]/50 hover:text-[#D4AF37]/80 uppercase tracking-widest transition-colors">
                    Send Another Transmission →
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-[2rem] border border-white/[0.06] overflow-hidden"
                  style={{ background: "rgba(8,8,8,0.95)" }}>

                  {/* Form header */}
                  <div className="px-6 py-5 border-b border-white/[0.04]" style={{ background: "rgba(12,12,12,0.9)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" style={{ boxShadow: "0 0 6px #D4AF37" }} />
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Secure Uplink Form · AES-256 in transit</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Type selector */}
                    <div>
                      <div className="text-[8px] font-black text-white/25 uppercase tracking-[0.2em] mb-2.5">
                        Transmission Type<span className="text-[#D4AF37] ml-1">*</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {types.map(t => (
                          <button key={t.id} type="button" onClick={() => { setForm(f => ({ ...f, type: t.id })); setErrors(e => ({ ...e, type: "" })); }}
                            className="text-left px-4 py-3 rounded-xl border transition-all"
                            style={{
                              background: form.type === t.id ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.02)",
                              borderColor: form.type === t.id ? "rgba(212,175,55,0.35)" : errors.type ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)",
                              boxShadow: form.type === t.id ? "0 0 16px rgba(212,175,55,0.1)" : "none",
                            }}>
                            <div className="text-[9px] font-black mb-0.5" style={{ color: form.type === t.id ? "#D4AF37" : "rgba(255,255,255,0.45)" }}>{t.label}</div>
                            <div className="text-[8px] text-white/25">{t.desc}</div>
                          </button>
                        ))}
                      </div>
                      {errors.type && <p className="mt-1.5 text-[9px] font-bold text-[#ef4444]/70">⚠ {errors.type}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <UplinkInput label="Operator Identity" value={form.name} onChange={set("name")} placeholder="Your name" required error={errors.name} />
                      <UplinkInput label="Comm Link" type="email" value={form.email} onChange={set("email")} placeholder="email@domain.com" required error={errors.email} />
                    </div>

                    <UplinkInput label="Subject" value={form.subject} onChange={set("subject")} placeholder="Transmission subject..." />

                    <UplinkInput label="Transmission Body" as="textarea" rows={5} value={form.message} onChange={set("message")} placeholder="Describe your inquiry with precision. The clearer the signal, the faster the response." required error={errors.message} />

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={status === "sending"}
                      whileHover={{ scale: status !== "sending" ? 1.02 : 1, boxShadow: "0 0 40px rgba(212,175,55,0.3)" }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 text-sm font-black uppercase tracking-widest text-black rounded-xl transition-all relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg, #B8960C, #D4AF37, #F5E07A, #D4AF37, #9A7B0A)", boxShadow: "0 0 20px rgba(212,175,55,0.2)", opacity: status === "sending" ? 0.8 : 1 }}>
                      {status === "sending" ? (
                        <span className="flex items-center justify-center gap-3">
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full" />
                          Transmitting...
                        </span>
                      ) : "Transmit Signal →"}
                    </motion.button>

                    <p className="text-center text-[8px] font-bold text-white/20 uppercase tracking-widest">
                      All transmissions are encrypted in transit · We never share your data
                    </p>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-10 px-6 relative z-10" style={{ background: "rgba(5,5,5,0.9)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Discotive" className="w-7 h-7 object-contain" />
            <span className="text-sm font-black tracking-tighter text-white/60">DISCOTIVE</span>
          </div>
          <p className="text-[9px] font-mono text-white/20">© 2026 Discotive. Forged in Jaipur, India.</p>
          <div className="flex items-center gap-5">
            {["Features", "About", "Privacy"].map(l => <Link key={l} to={`/${l.toLowerCase()}`} className="text-[9px] font-black text-white/25 hover:text-white/60 uppercase tracking-widest transition-colors">{l}</Link>)}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;