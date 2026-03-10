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
  Globe,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Zap,
  MessageSquare,
  TrendingUp,
  Lock,
  Search,
} from "lucide-react";
import GlobalLoader from "../components/GlobalLoader";
import AnimatedButton from "../components/AnimatedButton";

// ----------------------------------------------------------------------
// THE BACKGROUND ANIMATIONS (Falling Stars / The "Paths")
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// MAIN PAGE COMPONENT
// ----------------------------------------------------------------------
const Landing = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  // Custom Cursor State
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
      {!isLoaded && <GlobalLoader onComplete={() => setIsLoaded(true)} />}

      <div
        className={`min-h-screen bg-[#0a0a0a] text-white selection:bg-white selection:text-black transition-opacity duration-1000 overflow-hidden relative ${isLoaded ? "opacity-100" : "opacity-0"}`}
      >
        <ParticleBackground />

        {/* CUSTOM TRAILING CURSOR (Difference Blending) */}
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
              <img
                src="/logo.png"
                alt="Discotive Logo"
                className="h-8 md:h-10 w-auto object-contain hover:scale-105 transition-transform duration-300"
              />
              <span className="text-2xl font-extrabold tracking-tighter mr-10">
                DISCOTIVE
              </span>

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
                  href="#hubs"
                  onMouseEnter={() => setActiveMenu(null)}
                >
                  Campus Hubs
                </AnimatedButton>
                <AnimatedButton
                  variant="nav"
                  className="bg-white/5 border border-white/10 hover:border-white/20 px-5 cursor-none"
                  href="#pricing"
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
                      <a
                        href="#feature"
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
                      </a>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* HERO SECTION */}
        <main className="pt-40 pb-20 px-6 max-w-[1400px] mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div
            initial="hidden"
            animate={isLoaded ? "show" : "hidden"}
            transition={{ staggerChildren: 0.1 }}
            className="max-w-5xl"
          >
            <motion.h1
              variants={fadeUp}
              className="text-6xl md:text-8xl lg:text-[110px] font-extrabold tracking-tighter leading-[0.9] mb-8"
            >
              Where <span className="text-slate-500">careers</span> <br />{" "}
              actually happen.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg md:text-2xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-12"
            >
              The operating system for the next generation of builders. Not just
              engineers. Filmmakers, founders, artists, and strategists.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <div
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                <AnimatedButton
                  to="/auth"
                  variant="solid"
                  className="px-10 py-4 text-lg w-full sm:w-auto cursor-none"
                >
                  Boot the OS
                </AnimatedButton>
              </div>
              <div
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                <AnimatedButton
                  variant="outline"
                  className="px-10 py-4 text-lg w-full sm:w-auto cursor-none"
                >
                  Explore features
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>

          {/* INFINITE CULTURE MARQUEE */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isLoaded ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.8 }}
            className="w-full overflow-hidden mt-20 border-y border-white/10 bg-white/5 py-3 relative flex items-center"
          >
            <div className="absolute left-0 w-20 h-full bg-gradient-to-r from-[#0a0a0a] to-transparent z-10" />
            <div className="absolute right-0 w-20 h-full bg-gradient-to-l from-[#0a0a0a] to-transparent z-10" />
            <motion.div
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="flex items-center gap-8 whitespace-nowrap text-sm font-bold tracking-widest uppercase text-slate-400"
            >
              <span>✦ YC Founder</span>
              <span>✦ Indie Hacker</span>
              <span>✦ VTuber</span>
              <span>✦ AI Prompt Engineer</span>
              <span>✦ Cinematic Colorist</span>
              <span>✦ Product Strategist</span>
              <span>✦ Creative Director</span>
              <span>✦ Protocol Dev</span>
              <span>✦ YC Founder</span>
              <span>✦ Indie Hacker</span>
              <span>✦ VTuber</span>
              <span>✦ AI Prompt Engineer</span>
            </motion.div>
          </motion.div>

          {/* Cinematic Video Cards Grid (Lighter contrast bg) */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={isLoaded ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.4 }}
            className="w-full mt-24 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div
              className="aspect-[4/5] rounded-3xl bg-[#1a1a1a] border border-white/10 overflow-hidden relative group cursor-none shadow-2xl"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity duration-700"
              >
                <source src="/stock/Filmmaking.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent p-8 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-full">
                    Filmmaker
                  </span>
                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] group-hover:scale-150 transition-transform" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-left text-white drop-shadow-lg group-hover:-translate-y-2 transition-transform duration-500">
                  "Discotive gave me the exact timeline to direct my first indie
                  short."
                </h3>
              </div>
            </div>
            <div
              className="aspect-[4/5] rounded-3xl bg-[#1a1a1a] border border-white/10 overflow-hidden relative group cursor-none md:-translate-y-12 shadow-2xl"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity duration-700"
              >
                <source src="/stock/Startup.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent p-8 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-full">
                    Engineer
                  </span>
                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] group-hover:scale-150 transition-transform" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-left text-white drop-shadow-lg group-hover:-translate-y-2 transition-transform duration-500">
                  "Secured my startup internship exactly when the OS predicted I
                  would."
                </h3>
              </div>
            </div>
            <div
              className="aspect-[4/5] rounded-3xl bg-[#1a1a1a] border border-white/10 overflow-hidden relative group cursor-none shadow-2xl"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-opacity duration-700"
              >
                <source src="/stock/Interview.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent p-8 flex flex-col justify-between z-10">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300 backdrop-blur-md bg-black/30 px-3 py-1.5 rounded-full">
                    Founder
                  </span>
                  <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white] group-hover:scale-150 transition-transform" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-left text-white drop-shadow-lg group-hover:-translate-y-2 transition-transform duration-500">
                  "The daily planner built my discipline. The offline hub built
                  my team."
                </h3>
              </div>
            </div>
          </motion.div>
        </main>

        {/* SOCIAL & COMMUNITY SECTION */}
        <section className="py-32 px-6 max-w-[1400px] mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-6">
                Connect. <br />
                Collaborate. <br />
                Conquer.
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed mb-8">
                Discotive is a social ledger. Keep your profile private, or go
                public to connect with a global network of ambitious builders.
                Chat, exchange ideas, and track the progress of people in your
                exact field.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-lg font-bold">
                  <Search className="w-5 h-5 text-slate-500" /> Discover public
                  talent profiles.
                </li>
                <li className="flex items-center gap-3 text-lg font-bold">
                  <MessageSquare className="w-5 h-5 text-slate-500" /> Direct
                  real-time encrypted chat.
                </li>
                <li className="flex items-center gap-3 text-lg font-bold">
                  <Lock className="w-5 h-5 text-slate-500" /> Complete privacy
                  control.
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative mx-auto w-full max-w-[320px] aspect-[1/2] bg-[#1a1a1a] border-[8px] border-[#222] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 inset-x-0 h-6 bg-[#222] rounded-b-3xl w-1/2 mx-auto z-20" />
              <div className="flex-1 p-4 pt-10 flex flex-col gap-4 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold">
                    JD
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">John Doe</h4>
                    <p className="text-[10px] text-slate-400">Founder Track</p>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#2a2a2a] self-start p-3 rounded-2xl rounded-tl-sm text-sm w-3/4"
                >
                  How did you secure that UI/UX internship?
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="bg-white text-black self-end p-3 rounded-2xl rounded-tr-sm text-sm w-3/4"
                >
                  Followed the exact Discotive Roadmap. Happy to share my
                  portfolio!
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9 }}
                  className="bg-[#2a2a2a] self-start p-3 rounded-2xl rounded-tl-sm text-sm w-3/4 flex items-center gap-2"
                >
                  <Layout className="w-4 h-4" /> Attached: Execution Plan
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FINANCE TRACKER SECTION */}
        <section className="py-32 px-6 max-w-[1400px] mx-auto relative z-10 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center flex-col-reverse lg:flex-row-reverse">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-6">
                Track your wealth.
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed mb-8">
                Execution leads to earnings. Discotive features a built-in
                financial operating system. Track your salary, freelance gigs,
                expenses, and overall net worth right next to your career
                timeline.
              </p>
              <div
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
                className="inline-block cursor-none"
              >
                <AnimatedButton
                  variant="solid"
                  className="px-8 py-3 text-lg cursor-none"
                >
                  Explore Finance Hub
                </AnimatedButton>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8">
                <TrendingUp className="w-10 h-10 text-white/20" />
              </div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                Net Earnings
              </h4>
              <div className="text-5xl font-extrabold mb-8">₹12,40,500</div>

              <div className="w-full h-40 border-b border-l border-white/10 relative">
                <svg
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <motion.path
                    d="M0 100 L20 80 L40 85 L60 40 L80 50 L100 10"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M0 100 L20 80 L40 85 L60 40 L80 50 L100 10 L100 100 Z"
                    fill="url(#gradient)"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 0.2 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 0.5 }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="white" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </motion.div>
          </div>
        </section>

        {/* MAIN CHARACTER ENERGY */}
        <section className="py-32 bg-[#050505] text-white px-6 border-y border-white/5 relative z-10 overflow-hidden">
          <div className="absolute top-1/2 left-1/4 w-[800px] h-[800px] bg-red-600/10 blur-[150px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none animate-pulse" />

          <div className="max-w-[1400px] mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-20 max-w-3xl"
            >
              <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-red-100">
                Main character
                <br />
                energy.
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Everything you need to stop consuming content and start
                executing on your legacy. Built specifically for ambitious
                outliers ready to assume the coordinate.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Link
                to="/auth"
                className="bg-[#1a1a1a] rounded-3xl p-10 border border-white/10 group hover:border-white/20 hover:shadow-[0_0_50px_rgba(255,255,255,0.05)] transition-all duration-500 relative overflow-hidden block cursor-none"
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-8 group-hover:bg-white group-hover:text-black group-hover:rotate-6 transition-all duration-300">
                    <Layout className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 tracking-tight transition-all duration-300">
                    The Career Engine
                  </h3>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    Turn your raw ambition into a day-by-day execution timeline.
                    Whether you're in a degree, dropping out to build a startup,
                    or grinding as a self-taught creator.
                  </p>
                  <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                    Boot the timeline <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>

              <Link
                to="/auth"
                className="bg-[#1a1a1a] rounded-3xl p-10 border border-white/10 group hover:border-white/20 hover:shadow-[0_0_50px_rgba(255,255,255,0.05)] transition-all duration-500 relative overflow-hidden block cursor-none"
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-8 group-hover:bg-white group-hover:text-black group-hover:-rotate-6 transition-all duration-300">
                    <Activity className="w-7 h-7" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 tracking-tight transition-all duration-300">
                    The Discotive Score
                  </h3>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    A proprietary algorithm that calculates your exact placement
                    readiness based on skills, consistency, and network. Let our
                    AI match you with the opportunities you deserve.
                  </p>
                  <div className="inline-flex items-center gap-2 text-white font-bold group-hover:gap-4 transition-all">
                    Calculate your score <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* CINEMATIC QUOTE */}
        <section
          className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden z-10"
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
        >
          <div className="absolute inset-0 bg-black z-10 opacity-40"></div>
          <motion.img
            initial={{ scale: 1 }}
            whileInView={{ scale: 1.05 }}
            transition={{ duration: 10, ease: "linear" }}
            src="/stock/succession-series-season-4-4k-wallpaper.jpg"
            alt="Massive Opportunities"
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          <div className="relative z-20 max-w-4xl mx-auto px-6 text-center mt-32 md:mt-48">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight text-white drop-shadow-2xl mb-8">
              "The game is to act like you’re relaxed while your hand is closing
              around something unseen."
            </h2>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-tight text-slate-300 drop-shadow-2xl">
              ~ Logan Roy
            </h2>
          </div>
        </section>

        {/* MEET THE BOARD */}
        <section className="py-24 px-6 relative z-10 border-t border-white/5 overflow-hidden bg-[#050505]">
          {/* Ambient Background Glow */}
          <div className="absolute top-1/2 left-1/2 w-[700px] h-[500px] bg-blue-600/10 blur-[150px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div
            className="text-center mb-16 relative z-10 max-w-2xl mx-auto"
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
          >
            <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter mb-4 text-white">
              Meet the board.
            </h2>
            <p className="text-xl text-slate-400 font-medium">
              The architects building the Discotive ecosystem.
            </p>
          </div>

          {/* Two-Card Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto relative z-20"
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
          >
            {/* Card 1: Keshav Bansal */}
            <div className="bg-[#f4f4f5] text-black rounded-[2.5rem] p-8 lg:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center sm:items-start gap-8 group transition-transform duration-500 hover:-translate-y-2 cursor-none">
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
            <div className="bg-[#f4f4f5] text-black rounded-[2.5rem] p-8 lg:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row items-center sm:items-start gap-8 group transition-transform duration-500 hover:-translate-y-2 cursor-none">
              <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-[1.5rem] overflow-hidden bg-zinc-300 border-4 border-white shadow-xl relative">
                {/* Replace src with Reshmi's actual photo path if you have one */}
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

        {/* FREEMIUM / UPGRADE TEASER */}
        <section className="py-20 px-6 max-w-[1400px] mx-auto flex flex-col items-center text-center relative z-10 border-t border-white/5">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold tracking-widest uppercase mb-8 mt-12">
            <Zap className="w-4 h-4 text-white" /> Discotive Pro
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight mb-8">
            For those who refuse
            <br />
            to leave it to chance.
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed mb-12">
            The basic OS gets you started for free. Discotive Pro unlocks
            predictive placement AI, unlimited roadmap dependencies, and VIP
            access to physical Campus Hubs.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4"
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
          >
            <AnimatedButton
              to="/auth"
              variant="solid"
              className="px-10 py-5 text-lg shadow-[0_0_40px_rgba(255,255,255,0.2)] cursor-none"
            >
              Get Started Free
            </AnimatedButton>
            <AnimatedButton
              to="/auth"
              variant="outline"
              className="px-10 py-5 text-lg cursor-none text-slate-300 border-slate-700 hover:text-white hover:border-white"
            >
              Upgrade to Pro — ₹199/mo
            </AnimatedButton>
          </div>
        </section>

        {/* THE PATREON-STYLE MEGA FOOTER */}
        <footer className="border-t border-white/10 bg-[#0a0a0a] pt-20 pb-10 px-6 relative z-10">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-20">
              <div>
                <h4 className="font-bold text-white mb-6">Careers</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Software Engineers
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Filmmakers & Directors
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Founders & PMs
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Content Creators
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      UI/UX Designers
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Features</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      The Career Engine
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Discotive Score
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Algorithmic Matchmaking
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Execution Journal
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Pricing</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Basic OS is Free
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Discotive Pro
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Campus Hub Passes
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Resources</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      OS Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Help Center & FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-6">Company</h4>
                <ul className="space-y-4 text-sm text-slate-400 font-medium">
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-white transition-colors cursor-none"
                    >
                      Privacy Policy
                    </a>
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
              <div className="flex items-center gap-6 text-slate-400">
                <a
                  href="https://www.instagram.com/discotive/"
                  className="hover:text-white transition-colors cursor-none"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.youtube.com/@discotive"
                  className="hover:text-white transition-colors cursor-none"
                >
                  <Youtube className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/discotive"
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

export default Landing;
