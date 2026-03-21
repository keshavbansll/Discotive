import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Layout,
  Activity,
  MapPin,
  Target,
  Code,
  Video,
  Briefcase,
  Paintbrush,
  Instagram,
  Linkedin,
  Youtube,
  Zap,
  Terminal,
  Crosshair,
  Globe,
} from "lucide-react";
import GlobalLoader from "../components/GlobalLoader";
import AnimatedButton from "../components/AnimatedButton";

// --- BACKGROUND ANIMATION ---
const ParticleBackground = () => {
  const particles = Array.from({ length: 30 });
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          initial={{
            x:
              Math.random() *
              (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: Math.random() * -1000,
            opacity: Math.random() * 0.5 + 0.2,
            scale: Math.random() * 2,
          }}
          animate={{
            y: [
              null,
              typeof window !== "undefined" ? window.innerHeight + 100 : 1000,
            ],
          }}
          transition={{
            duration: Math.random() * 10 + 15,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 20,
          }}
        />
      ))}
    </div>
  );
};

const About = () => {
  const [isLoaded, setIsLoaded] = useState(() => {
    return sessionStorage.getItem("discotive_booted") === "true";
  });

  const handleLoadComplete = () => {
    sessionStorage.setItem("discotive_booted", "true");
    setIsLoaded(true);
  };
  const [activeMenu, setActiveMenu] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const menuContent = {
    features: [
      {
        icon: Layout,
        title: "Career Engine",
        desc: "Your deterministic execution roadmap.",
      },
      {
        icon: Activity,
        title: "Discotive Score",
        desc: "The universal career credibility metric.",
      },
      {
        icon: Target,
        title: "AI Matchmaking",
        desc: "Get paired with the right internships.",
      },
      {
        icon: MapPin,
        title: "Campus Hubs",
        desc: "Offline co-working and mentorship.",
      },
    ],
    careers: [
      {
        icon: Code,
        title: "Engineering & Tech",
        desc: "Full-stack, AI, DevOps, Data.",
      },
      {
        icon: Video,
        title: "Filmmaking & Media",
        desc: "Directors, Editors, Producers.",
      },
      {
        icon: Paintbrush,
        title: "Design & Art",
        desc: "UI/UX, 3D Artists, Illustrators.",
      },
      {
        icon: Briefcase,
        title: "Business & Strategy",
        desc: "Founders, PMs, Sales, Ops.",
      },
    ],
  };

  return (
    <>
      {!isLoaded && <GlobalLoader onComplete={handleLoadComplete} />}

      <div
        className={`min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black transition-opacity duration-1000 overflow-hidden relative ${isLoaded ? "opacity-100" : "opacity-0"}`}
      >
        <ParticleBackground />

        {/* CUSTOM TRAILING CURSOR */}
        <motion.div
          className="fixed top-0 left-0 w-6 h-6 bg-white rounded-full pointer-events-none z-[10000] mix-blend-difference hidden md:block"
          animate={{
            x: mousePosition.x - 12,
            y: mousePosition.y - 12,
            scale: isHoveringCard ? 3 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 150,
            damping: 15,
            mass: 0.1,
          }}
        />

        {/* ANIMATED NAVBAR */}
        <nav
          className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10"
          onMouseLeave={() => setActiveMenu(null)}
        >
          <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-0">
              <Link to="/">
                <img
                  src="/logo-no-bg-white.png"
                  alt="Discotive Logo"
                  className="h-8 md:h-10 w-auto object-contain hover:scale-105 transition-transform duration-300"
                />
              </Link>
              <Link
                to="/"
                className="text-2xl font-extrabold tracking-tighter mr-10 cursor-none"
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              ></Link>

              <div className="hidden md:flex items-center gap-2">
                <AnimatedButton
                  variant="nav"
                  className="bg-white/5 border border-white/10 hover:border-white/20 px-5 cursor-none"
                  onMouseEnter={() => setActiveMenu("features")}
                >
                  Features
                </AnimatedButton>
                <AnimatedButton
                  variant="nav"
                  className="bg-white/5 border border-white/10 hover:border-white/20 px-5 cursor-none"
                  onMouseEnter={() => setActiveMenu("careers")}
                >
                  Careers
                </AnimatedButton>
                <AnimatedButton
                  variant="nav"
                  className="bg-white/5 border border-white/10 hover:border-white/20 px-5 cursor-none"
                  href="/#hubs"
                  onMouseEnter={() => setActiveMenu(null)}
                >
                  Campus Hubs
                </AnimatedButton>
                <AnimatedButton
                  variant="nav"
                  className="bg-white/5 border border-white/10 hover:border-white/20 px-5 cursor-none"
                  href="/#pricing"
                  onMouseEnter={() => setActiveMenu(null)}
                >
                  Pricing
                </AnimatedButton>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <AnimatedButton
                to="/auth"
                variant="outline"
                className="px-6 py-2.5 hidden md:flex cursor-none"
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                Log in
              </AnimatedButton>
              <AnimatedButton
                to="/auth"
                variant="solid"
                className="px-6 py-2.5 cursor-none"
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                Get Started
              </AnimatedButton>
            </div>
          </div>

          {/* DROPDOWN MENU */}
          <AnimatePresence>
            {activeMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-20 left-0 w-full bg-[#0a0a0a] border-b border-white/10 shadow-2xl overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMenu}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[1400px] mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8"
                  >
                    {menuContent[activeMenu].map((item, idx) => (
                      <div
                        key={idx}
                        className="group flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-none"
                        onMouseEnter={() => setIsHoveringCard(true)}
                        onMouseLeave={() => setIsHoveringCard(false)}
                      >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all duration-300 shrink-0">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400">
                            {item.title}
                          </h4>
                          <p className="text-sm text-slate-400">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* --- HERO: THE MANIFESTO --- */}
        <main className="pt-40 pb-20 px-6 max-w-[1400px] mx-auto relative z-10">
          <motion.div
            initial="hidden"
            animate={isLoaded ? "show" : "hidden"}
            transition={{ staggerChildren: 0.1 }}
          >
            {/* TOP TITLE ROW */}
            <div className="mb-20">
              <motion.div
                variants={fadeUp}
                className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mb-8"
              >
                <Terminal className="w-4 h-4" /> System Origin
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="text-6xl md:text-8xl lg:text-[110px] font-extrabold tracking-tighter leading-[0.9]"
              >
                The <span className="text-slate-500">execution</span> <br />{" "}
                layer.
              </motion.h1>
            </div>

            {/* SPLIT CONTENT ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <motion.div variants={fadeUp} className="lg:col-span-5">
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight text-white">
                  The world has enough ideas.
                </h2>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="lg:col-span-7 text-lg text-slate-400 font-medium leading-relaxed pt-2 space-y-6"
              >
                <p>
                  Discotive is a deterministic execution environment built for
                  the top 1% of developers, founders, and creative strategists.
                  We are replacing the static, outdated model of professional
                  networking with a quantifiable, execution-based operating
                  system.
                </p>
                <p>
                  This platform provides the digital and physical infrastructure
                  required to transition raw ambition into verified
                  proof-of-work.
                </p>
                <p>
                  The legacy system relies on subjective resumes and passive
                  applications. We replace that with a live, 256-bit encrypted
                  ledger of continuous execution, automatically routing top-tier
                  talent to high-leverage opportunities. This is not a social
                  network; it is the command center for your professional
                  trajectory.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </main>

        {/* --- THE ARCHITECTS (MEET THE BOARD) --- */}
        <section className="py-32 px-6 relative z-10 border-t border-white/5 overflow-hidden bg-[#050505] mt-10">
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 w-[700px] h-[500px] bg-red-600/10 blur-[150px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="text-center mb-16 relative z-10 max-w-2xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter mb-4 text-white">
              The Architects.
            </h2>
            <p className="text-xl text-slate-400 font-medium">
              Built by outliers, for outliers.
            </p>
          </div>

          {/* Two-Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto relative z-20">
            {/* Card 1: Keshav Bansal */}
            <div
              className="bg-[#f4f4f5] text-black rounded-[2.5rem] p-8 lg:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center sm:items-start gap-8 group transition-transform duration-500 hover:-translate-y-2 cursor-none"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-[1.5rem] overflow-hidden bg-zinc-300 border-4 border-white shadow-xl relative">
                <img
                  src="/stock/Keshav-Bansal.jpeg"
                  alt="Keshav Bansal"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="flex-1 text-center sm:text-left flex flex-col justify-center h-full pt-2">
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mb-1 text-black">
                  Keshav Bansal
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  Founder & CEO
                </p>

                <div className="flex flex-col gap-5 mt-auto">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Social Profiles
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <a
                        href="https://www.instagram.com/keshavbansll/"
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-colors text-black"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a
                        href="https://www.linkedin.com/in/keshavbansll/"
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-colors text-black"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Direct Contact
                    </p>
                    <a
                      href="mailto:officialkeshavbansal@gmail.com"
                      className="text-sm font-bold text-black hover:underline decoration-2 underline-offset-4 break-all"
                    >
                      officialkeshavbansal@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Reshmi Kumari */}
            <div
              className="bg-[#f4f4f5] text-black rounded-[2.5rem] p-8 lg:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center sm:items-start gap-8 group transition-transform duration-500 hover:-translate-y-2 cursor-none"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-[1.5rem] overflow-hidden bg-zinc-300 border-4 border-white shadow-xl relative">
                <img
                  src="/stock/Reshmi-Kumari.jpeg"
                  alt="Reshmi Kumari"
                  onError={(e) => {
                    e.target.src = "/stock/Reshmi Kumari.jpg";
                  }}
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="flex-1 text-center sm:text-left flex flex-col justify-center h-full pt-2">
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tighter mb-1 text-black">
                  Reshmi Kumari
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                  Co-Founder & Digital Marketing Head
                </p>

                <div className="flex flex-col gap-5 mt-auto">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Social Profiles
                    </p>
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      <a
                        href="https://www.linkedin.com/in/reshmi-kumari-330891384"
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black hover:text-white transition-colors text-black"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Direct Contact
                    </p>
                    <a
                      href="mailto:reshmikri227@gmail.com"
                      className="text-sm font-bold text-black hover:underline decoration-2 underline-offset-4 break-all"
                    >
                      reshmikri227@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- GLOBAL SCALE (STATS) --- */}
        <section className="py-20 px-6 max-w-[1400px] mx-auto border-t border-white/5 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-10 flex flex-col justify-center items-center text-center"
            >
              <Crosshair className="w-8 h-8 text-slate-500 mb-6" />
              <h4 className="text-5xl font-extrabold tracking-tighter text-white mb-2">
                1%
              </h4>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Our Target Demographic
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-10 flex flex-col justify-center items-center text-center"
            >
              <MapPin className="w-8 h-8 text-slate-500 mb-6" />
              <h4 className="text-4xl font-extrabold tracking-tighter text-white mb-2">
                Jaipur, IN
              </h4>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Global HQ
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-10 flex flex-col justify-center items-center text-center"
            >
              <Globe className="w-8 h-8 text-slate-500 mb-6" />
              <h4 className="text-4xl font-extrabold tracking-tighter text-white mb-2">
                Infinite
              </h4>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Execution Potential
              </p>
            </motion.div>
          </div>
        </section>

        {/* --- THE FINAL CTA --- */}
        <section className="py-32 px-6 max-w-[1400px] mx-auto flex flex-col items-center text-center relative z-10 border-t border-white/5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold tracking-widest uppercase mb-8">
            <Zap className="w-4 h-4 text-white" /> The Movement
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-8">
            Stop hoping.
            <br />
            Start deploying.
          </h2>

          <div
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
          >
            <AnimatedButton
              to="/auth"
              variant="solid"
              className="px-12 py-5 text-lg shadow-[0_0_40px_rgba(255,255,255,0.2)] cursor-none"
            >
              Initialize Protocol
            </AnimatedButton>
          </div>
        </section>

        {/* --- FOOTER (Same as Landing) --- */}
        <footer className="border-t border-white/10 bg-[#0a0a0a] pt-20 pb-10 px-6 relative z-10">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-20">
              <div>
                <h4 className="font-bold text-white mb-6">Careers</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Software Engineers
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Filmmakers & Directors
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Founders & PMs
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Content Creators
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Features</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      The Career Engine
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Discotive Score
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Algorithmic Matchmaking
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Pricing</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Basic OS is Free
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Discotive Pro
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Campus Hub Passes
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Resources</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      OS Documentation
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Help Center & FAQ
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Company</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <Link
                      to="/about"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/"
                      className="hover:text-white transition-colors cursor-none"
                      onMouseEnter={() => setIsHoveringCard(true)}
                      onMouseLeave={() => setIsHoveringCard(false)}
                    >
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div
              className="flex flex-col lg:flex-row items-center justify-between pt-8 border-t border-white/10 gap-8"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <div className="text-center md:text-left text-xs text-slate-600 font-medium">
                © 2026 Discotive Hubs. Built in Jaipur, Rajasthan.
              </div>

              {/* UPDATED SOCIALS BLOCK */}
              <div className="flex items-center gap-6 text-slate-400">
                <a
                  href="https://www.instagram.com/discotive/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors cursor-none"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.youtube.com/@discotive"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors cursor-none"
                >
                  <Youtube className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/discotive"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors cursor-none"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default About;
