import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
  Zap,
  Terminal,
  Crosshair,
  ShieldAlert,
  Fingerprint,
  Cpu,
  Mail,
  ArrowRight,
  Eye,
} from "lucide-react";
import GlobalLoader from "../components/GlobalLoader";
import { cn } from "../lib/cn";
import emailjs from "@emailjs/browser";

// ============================================================================
// 1. DATA & CONFIG
// ============================================================================
const BOARD_MEMBERS = [
  {
    id: "kb",
    name: "Keshav Bansll",
    title: "Co-Founder & Chief Architect",
    image: "/Keshav-Bansal.jpeg",
    bio: "The visionary behind the Discotive protocol. Engineering the algorithmic death of the traditional resume.",
    socials: {
      linkedin: "https://www.linkedin.com/in/keshavbansll/", // Update with your actual link
      instagram: "https://instagram.com/keshavbansll", // Update with your actual link
    },
    color: "text-[#D4AF37]",
    border: "border-[#D4AF37]/30",
    bg: "bg-[#D4AF37]/5",
  },
  {
    id: "rk",
    name: "Reshmi Kumari",
    title: "Co-Founder & CMO",
    image: "/Reshmi-Kumari.jpg",
    bio: "Architecting the narrative and expanding the syndicate. Forging global alliances to scale the Discotive ecosystem.",
    socials: {
      linkedin: "https://www.linkedin.com/in/reshmikri/", // Update with her actual link
    },
    color: "text-[#C0C0C0]",
    border: "border-[#C0C0C0]/30",
    bg: "bg-[#C0C0C0]/5",
  },
];

// ============================================================================
// 2. BACKGROUND & NAVBAR
// ============================================================================
const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    setParticles(Array.from({ length: 30 }));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20 mask-image:linear-gradient(to_bottom,black,transparent)">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          initial={{
            x:
              Math.random() *
              (typeof window !== "undefined" ? window.innerWidth : 1000),
            y:
              Math.random() *
              (typeof window !== "undefined" ? window.innerHeight : 1000),
            opacity: Math.random() * 0.3,
            scale: Math.random() * 2,
          }}
          animate={{
            y: [null, Math.random() * -200 - 50],
            opacity: [0, Math.random() * 0.5 + 0.1, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 7,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
};

const AboutNavbar = ({ setIsHoveringCard }) => {
  const navigate = useNavigate();
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="fixed top-0 w-full z-50 bg-[#030303]/80 backdrop-blur-2xl border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 group"
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
        >
          <img
            src="/logo.png"
            alt="Discotive Logo"
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          />
          <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">
            Discotive
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/features"
            className="hidden md:block text-[11px] font-extrabold text-[#888] hover:text-white transition-colors uppercase tracking-[0.2em] mr-4"
          >
            Platform
          </Link>
          <Link
            to="/auth"
            className="text-[11px] font-extrabold text-white hover:text-[#ccc] transition-colors uppercase tracking-[0.2em]"
          >
            Sign In
          </Link>
          <button
            onClick={() => navigate("/auth")}
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={() => setIsHoveringCard(false)}
            className="px-6 py-2.5 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-full hover:bg-[#e5e5e5] transition-transform hover:scale-105"
          >
            Boot OS
          </button>
        </div>
      </div>
    </motion.nav>
  );
};

// ============================================================================
// 3. INTERACTIVE MODULES
// ============================================================================
const PhilosophyCard = ({
  icon: Icon,
  title,
  desc,
  delay,
  setIsHoveringCard,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setIsHoveringCard(true)}
      onMouseLeave={() => setIsHoveringCard(false)}
      className="group relative p-8 bg-[#0a0a0a] border border-[#222] rounded-[2rem] hover:border-amber-500/30 transition-colors overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
      <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#333] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-[#888] group-hover:text-amber-500 transition-colors" />
      </div>
      <h3 className="text-xl font-extrabold text-white mb-3 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[#666] leading-relaxed font-medium">{desc}</p>
    </motion.div>
  );
};

const BoardMemberCard = ({ member, setIsHoveringCard }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      onMouseEnter={() => setIsHoveringCard(true)}
      onMouseLeave={() => setIsHoveringCard(false)}
      className={cn(
        "relative group p-6 rounded-[2rem] bg-[#0a0a0a] border overflow-hidden flex flex-col items-center text-center transition-all duration-500 hover:-translate-y-2",
        member.border,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          member.bg,
        )}
      />

      {/* UPDATED: Renders actual image with a sleek grayscale filter that reveals color on hover */}
      <div
        className={cn(
          "w-24 h-24 rounded-full border-2 overflow-hidden mb-6 shadow-2xl relative z-10 transition-transform duration-500 group-hover:scale-110",
          member.border,
          member.bg,
        )}
      >
        <img
          src={member.image}
          alt={member.name}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
        />
      </div>

      <h3 className="text-xl font-extrabold text-white mb-1 relative z-10">
        {member.name}
      </h3>
      <p
        className={cn(
          "text-[10px] font-mono uppercase tracking-widest mb-4 relative z-10",
          member.color,
        )}
      >
        {member.title}
      </p>

      <p className="text-xs text-[#888] leading-relaxed mb-6 relative z-10 px-4">
        {member.bio}
      </p>

      {/* UPDATED: Dynamic Social Links based on the data provided */}
      <div className="mt-auto flex items-center gap-4 relative z-10">
        {member.socials.linkedin && (
          <a
            href={member.socials.linkedin}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-[#111] border border-[#333] rounded-full text-[#888] hover:text-[#0077B5] hover:border-[#0077b5]/50 transition-all"
            title="LinkedIn"
          >
            <Linkedin className="w-4 h-4" />
          </a>
        )}
        {member.socials.instagram && (
          <a
            href={member.socials.instagram}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-[#111] border border-[#333] rounded-full text-[#888] hover:text-[#E1306C] hover:border-[#E1306C]/50 transition-all"
            title="Instagram"
          >
            <Instagram className="w-4 h-4" />
          </a>
        )}
      </div>
    </motion.div>
  );
};

const PulseOrigin = () => (
  <div className="relative w-4 h-4 flex items-center justify-center">
    <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-75" />
    <div className="relative w-2 h-2 bg-amber-500 rounded-full" />
  </div>
);

// ============================================================================
// 4. MAIN ABOUT COMPONENT
// ============================================================================
const About = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e) =>
      setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) return <GlobalLoader onComplete={() => {}} />;

  return (
    <>
      {/* CUSTOM CURSOR */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[10000] mix-blend-difference hidden md:block border-2 border-white"
        animate={{
          x: mousePosition.x - 16,
          y: mousePosition.y - 16,
          scale: isHoveringCard ? 2.5 : 1,
          backgroundColor: isHoveringCard ? "#ffffff" : "transparent",
        }}
        transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      />

      <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black font-sans overflow-x-hidden">
        <ParticleBackground />
        <AboutNavbar setIsHoveringCard={setIsHoveringCard} />

        {/* --- THE MANIFESTO (HERO) --- */}
        <div className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 max-w-5xl mx-auto w-full"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 shadow-2xl">
              <Fingerprint className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold tracking-[0.2em] text-[#ccc] uppercase">
                Our Identity
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-[100px] font-extrabold tracking-tight leading-[0.9] mb-8">
              Death to the <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#666] to-[#333] line-through decoration-amber-500 decoration-8">
                resume.
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-[#888] font-medium max-w-3xl mx-auto mb-12 leading-relaxed tracking-wide">
              We are a collective of engineers and operators building the
              infrastructure for a meritocratic future. We believe that what you
              build matters infinitely more than what you say.
            </p>
          </motion.div>
        </div>

        {/* --- THE PHILOSOPHY (CORE TENETS) --- */}
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative">
          <div className="text-center mb-16">
            <h2 className="text-[10px] font-extrabold tracking-[0.3em] text-amber-500 uppercase mb-4">
              The Discotive Philosophy
            </h2>
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Built on three core directives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PhilosophyCard
              setIsHoveringCard={setIsHoveringCard}
              delay={0}
              icon={Crosshair}
              title="Ruthless Execution"
              desc="Ideas are cheap multipliers. Execution is worth millions. We build systems that incentivize, track, and reward continuous deployment of effort."
            />
            <PhilosophyCard
              setIsHoveringCard={setIsHoveringCard}
              delay={0.2}
              icon={ShieldAlert}
              title="Cryptographic Truth"
              desc="Trust is a vulnerability. The Discotive Career Index relies entirely on verifiable proof of work, eliminating bias and credential inflation."
            />
            <PhilosophyCard
              setIsHoveringCard={setIsHoveringCard}
              delay={0.4}
              icon={Cpu}
              title="Algorithmic Merit"
              desc="The global leaderboard doesn't care about your background, zip code, or pedigree. It only respects the math of your momentum."
            />
          </div>
        </section>

        {/* --- MEET THE BOARD (THE SYNDICATE) --- */}
        <section className="py-32 px-6 bg-[#050505] border-y border-white/5 relative">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-[10px] font-extrabold tracking-[0.3em] text-[#666] uppercase mb-4">
                The Syndicate
              </h2>
              <p className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                Meet The Board.
              </p>
              <p className="text-[#888] mt-4 max-w-xl mx-auto text-sm">
                The architects designing the engine. We are operators building
                for operators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {BOARD_MEMBERS.map((member) => (
                <BoardMemberCard
                  key={member.id}
                  member={member}
                  setIsHoveringCard={setIsHoveringCard}
                />
              ))}
            </div>
          </div>
        </section>

        {/* --- THE ORIGIN (FORGED IN JAIPUR) --- */}
        <section className="py-32 px-6 max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center p-12 rounded-[3rem] bg-gradient-to-b from-[#111] to-[#030303] border border-[#222]"
          >
            <div className="flex items-center gap-4 px-4 py-2 bg-[#000] border border-[#333] rounded-full mb-8">
              <PulseOrigin />
              <span className="text-xs font-mono font-bold text-[#ccc] uppercase tracking-widest">
                Protocol Origin
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
              Forged in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                Jaipur.
              </span>
            </h2>
            <p className="text-[#888] leading-relaxed max-w-lg mx-auto mb-8">
              The Discotive protocol is being architected, engineered, and
              scaled from Jaipur, Rajasthan. We are proving that elite global
              infrastructure can be built from anywhere.
            </p>
            <MapPin className="w-10 h-10 text-[#444] opacity-50" />
          </motion.div>
        </section>

        {/* --- THE MONOPOLY FOOTER --- */}
        <footer
          className="border-t border-white/5 bg-[#030303] pt-24 pb-12 px-6 relative overflow-hidden"
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
        >
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-12 mb-20">
              <div className="col-span-2 md:col-span-2 flex flex-col items-start text-left">
                <Link to="/" className="flex items-center gap-3 mb-6">
                  <img
                    src="/logo.png"
                    alt="Discotive Logo"
                    className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                  />
                  <span className="text-xl font-extrabold tracking-tight text-white">
                    Discotive
                  </span>
                </Link>
                <p className="text-sm text-[#666] leading-relaxed max-w-[280px]">
                  The execution protocol for elite operators. Replace your
                  resume. Build your monopoly.
                </p>
              </div>

              <div className="col-span-1 flex flex-col items-start text-left">
                <h4 className="text-white font-extrabold text-[10px] sm:text-xs mb-6 uppercase tracking-widest">
                  Platform
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      to="/features"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/session"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors"
                    >
                      Connective
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/premium"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors"
                    >
                      Pricing
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="col-span-1 flex flex-col items-start text-left">
                <h4 className="text-white font-extrabold text-[10px] sm:text-xs mb-6 uppercase tracking-widest">
                  Resources
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      to="/about"
                      className="text-sm font-medium text-white transition-colors"
                    >
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/privacy"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors"
                    >
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="col-span-2 md:col-span-1 flex flex-col items-start text-left mt-2 md:mt-0">
                <h4 className="text-white font-extrabold text-[10px] sm:text-xs mb-6 uppercase tracking-widest">
                  Contact
                </h4>
                <ul className="space-y-4">
                  <li>
                    <a
                      href="mailto:discotive@gmail.com"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-[#555]" />{" "}
                      discotive@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-8 border-t border-white/5 gap-6">
              <p className="text-xs text-[#555] font-medium tracking-wide">
                © 2026 Discotive. India.
              </p>
              <div className="flex items-center gap-6">
                <a
                  href="https://www.instagram.com/discotive/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#666] hover:text-white transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://www.youtube.com/@discotive"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#666] hover:text-white transition-colors"
                >
                  <Youtube className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/discotive"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#666] hover:text-white transition-colors"
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
