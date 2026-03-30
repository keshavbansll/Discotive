import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ChevronRight,
  ChevronLeft,
  Layout,
  Activity,
  MapPin,
  Target,
  Code,
  Briefcase,
  Paintbrush,
  Globe,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Zap,
  Lock,
  Search,
  CheckCircle2,
  GitBranch,
  Plus,
  Trash2,
  Trophy,
  Crown,
  ArrowRight,
  Mail,
} from "lucide-react";
import GlobalLoader from "../components/GlobalLoader";
import AnimatedButton from "../components/AnimatedButton";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// CORE DATA (MARQUEES)
// ============================================================================
const COLLEGES = [
  "JECRC Foundation",
  "IIT Bombay",
  "BITS Pilani",
  "Stanford University",
  "VIT Vellore",
  "NIT Trichy",
  "MIT",
  "Harvard University",
  "Delhi University",
  "SRM IST",
];

const CAREERS = [
  "AI Research Scientist",
  "Founder & CEO",
  "Quantitative Analyst",
  "Venture Capitalist",
  "Product Manager",
  "Principal Engineer",
  "UI/UX Architect",
  "Protocol Developer",
];

// ============================================================================
// THE BACKGROUND ANIMATION
// ============================================================================
const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    setParticles(Array.from({ length: 30 }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30 mask-image:linear-gradient(to_bottom,black,transparent)">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full"
          initial={{
            x:
              Math.random() *
              (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: -10,
            opacity: Math.random() * 0.5 + 0.1,
          }}
          animate={{
            y: typeof window !== "undefined" ? window.innerHeight : 1000,
            opacity: [0, 0.5, 0],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
};

// ============================================================================
// THE MOCK EXECUTION NODE (For Landing Page Sandbox)
// ============================================================================
const MockExecutionNode = ({ data, selected }) => {
  const isActive = data.status === "ACTIVE";
  const isNext = data.status === "NEXT";
  const isCompleted = data.status === "COMPLETED";

  return (
    <div
      className={cn(
        "w-[280px] bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl p-5 relative overflow-hidden transition-all duration-300",
        isActive &&
          "border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]",
        isNext && "border border-white/20",
        isCompleted && "border border-green-500/30 opacity-70",
        !isActive && !isNext && !isCompleted && "border border-[#222]",
        selected && "border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)]",
      )}
    >
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="w-2 h-2 bg-[#222] border border-[#444]"
      />

      <div className="flex justify-between items-start mb-3 pointer-events-none">
        <div>
          <p className="text-[9px] font-mono text-[#666] uppercase tracking-widest mb-1">
            {data.date}
          </p>
          <h3
            className={cn(
              "text-base font-extrabold tracking-tight",
              isActive ? "text-amber-500" : "text-white",
            )}
          >
            {data.title}
          </h3>
        </div>
        <div
          className={cn(
            "p-1.5 rounded-lg shrink-0",
            isActive
              ? "bg-amber-500/10 text-amber-500"
              : isCompleted
                ? "bg-green-500/10 text-green-500"
                : "bg-[#111] text-[#555]",
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : isActive ? (
            <Activity className="w-4 h-4 animate-pulse" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </div>
      </div>

      <div className="space-y-1.5 mt-3 pointer-events-none">
        {(data.tasks || []).map((task, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2 bg-[#111] border border-[#222] rounded-lg"
          >
            <div
              className={cn(
                "w-3 h-3 rounded-sm border flex items-center justify-center shrink-0",
                task.completed
                  ? "bg-green-500/20 border-green-500/50 text-green-500"
                  : "bg-[#050505] border-[#444]",
              )}
            >
              {task.completed && <CheckCircle2 className="w-2 h-2" />}
            </div>
            <p
              className={cn(
                "text-[10px] font-medium truncate",
                task.completed ? "text-[#666] line-through" : "text-[#ccc]",
              )}
            >
              {task.text}
            </p>
          </div>
        ))}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-[#222] border border-[#444]"
      />
    </div>
  );
};
const mockNodeTypes = { executionNode: MockExecutionNode };

// ============================================================================
// 2. THE INTERACTIVE SANDBOX (Mock React Flow for Landing Page)
// ============================================================================
const initialNodes = [
  {
    id: "1",
    type: "executionNode",
    position: { x: 50, y: 50 },
    data: {
      title: "Initialize Architecture",
      date: "Phase 1",
      status: "COMPLETED",
      tasks: [
        { text: "Design SaaS Schema", completed: true },
        { text: "Deploy Authentication", completed: true },
      ],
    },
  },
  {
    id: "2",
    type: "executionNode",
    position: { x: 400, y: 50 },
    data: {
      title: "Core Development",
      date: "Phase 2",
      status: "ACTIVE",
      tasks: [
        { text: "Build React Frontend", completed: true },
        { text: "Integrate Database", completed: false },
      ],
    },
  },
  {
    id: "3",
    type: "executionNode",
    position: { x: 750, y: 50 },
    data: {
      title: "Alpha Deployment",
      date: "Phase 3",
      status: "NEXT",
      tasks: [
        { text: "Beta Testing", completed: false },
        { text: "Public Launch", completed: false },
      ],
    },
  },
];

const initialEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#f59e0b", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "2",
    target: "3",
    animated: true,
    style: { stroke: "#333", strokeWidth: 2 },
  },
];

const InteractiveTimelineSandbox = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const nodeTypes = useMemo(() => ({ executionNode: MockExecutionNode }), []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#fff", strokeWidth: 2 },
          },
          eds,
        ),
      ),
    [],
  );

  return (
    <div className="w-full h-[400px] md:h-[500px] bg-[#050505] rounded-[2rem] border border-[#222] overflow-hidden relative group shadow-2xl">
      <div className="absolute top-6 left-6 z-10 bg-[#111] border border-[#333] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
        <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
        <span className="text-xs font-bold text-white uppercase tracking-widest">
          Live Sandbox (Interactive)
        </span>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#030303]"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#222" gap={30} size={1.5} />
          <Controls
            className="hidden md:flex shadow-2xl border border-[#333] rounded-md overflow-hidden"
            buttonStyle={{
              backgroundColor: "#111",
              borderBottom: "1px solid #333",
              fill: "#ffffff",
            }}
          />
        </ReactFlow>
        {/* Force hide watermark if proOptions fails */}
        <style>{`.react-flow__attribution { display: none !important; }`}</style>
      </ReactFlowProvider>
    </div>
  );
};

// ============================================================================
// 3. THE NAVBAR (Apple-Tier Sleekness)
// ============================================================================
const Navbar = ({ setIsHoveringCard, isInstallable, handleInstallClick }) => {
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

        {/* Optimized PC-First Navbar Links */}
        <div className="hidden lg:flex items-center gap-8 bg-[#0a0a0a] px-8 py-3 rounded-full border border-white/10 shadow-lg">
          <Link
            to="/features"
            className="text-[11px] font-extrabold text-[#888] hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Features
          </Link>
          <Link
            to="/session"
            className="text-[11px] font-extrabold text-[#888] hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Discotive Edge
          </Link>
          <Link
            to="/premium"
            className="text-[11px] font-extrabold text-[#888] hover:text-white transition-colors uppercase tracking-[0.2em]"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* THE INSTALL BUTTON (Now responsive for mobile) */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] whitespace-nowrap"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span className="hidden sm:block">Install App</span>
              <span className="block sm:hidden">Install</span>
            </button>
          )}
          <Link
            to="/auth"
            state={{ isLogin: true }}
            className="hidden md:flex text-[11px] font-extrabold text-white hover:text-[#ccc] transition-colors uppercase tracking-[0.2em]"
          >
            Sign In
          </Link>
          <AnimatedButton
            onClick={() => navigate("/auth", { state: { isLogin: false } })}
            className="scale-90 sm:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.1)] whitespace-nowrap"
          >
            <span className="hidden sm:block">Initialize Protocol</span>
            <span className="block sm:hidden">Boot OS</span>
          </AnimatedButton>
        </div>
      </div>
    </motion.nav>
  );
};

// ============================================================================
// 4. MAIN LANDING COMPONENT (Engine Start)
// ============================================================================
const Landing = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const navigate = useNavigate();

  // --- ADD THIS PWA LOGIC ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  useEffect(() => {
    const handleMouseMove = (e) =>
      setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouseMove);
    const timer = setTimeout(() => setIsLoading(false), 2500);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) return <GlobalLoader onComplete={() => {}} />;

  return (
    <>
      {/* CUSTOM TRAILING CURSOR (Hollow Ring -> Solid Fill) */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full pointer-events-none z-[10000] mix-blend-difference hidden md:block border-2 border-white"
        animate={{
          x: mousePosition.x - 16, // Centers the 32px (w-8) circle perfectly
          y: mousePosition.y - 16,
          scale: isHoveringCard ? 2.5 : 1,
          backgroundColor: isHoveringCard ? "#ffffff" : "transparent",
        }}
        transition={{
          type: "spring",
          stiffness: 150,
          damping: 15,
          mass: 0.1,
        }}
      />

      <div className="min-h-screen bg-[#030303] text-white selection:bg-white selection:text-black font-sans overflow-x-hidden">
        <ParticleBackground />
        <Navbar
          setIsHoveringCard={setIsHoveringCard}
          isInstallable={isInstallable}
          handleInstallClick={handleInstallClick}
        />

        {/* --- HERO SECTION --- */}
        <div className="relative pt-40 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center justify-center text-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative z-10 max-w-5xl mx-auto w-full"
          >
            {/* Minimalist Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-bold tracking-[0.2em] text-[#ccc] uppercase">
                The Ultimate Career Engine
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-[110px] font-extrabold tracking-tight leading-[0.9] mb-8 mix-blend-difference">
              Build your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-[#333]">
                Monopoly.
              </span>
            </h1>

            <p className="text-lg md:text-2xl text-[#888] font-medium max-w-2xl mx-auto mb-12 leading-relaxed tracking-wide">
              The operating system for the next generation of builders. Map your
              trajectory, prove your execution, and dominate the global
              leaderboard.
            </p>

            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
            >
              <AnimatedButton
                onClick={() => navigate("/auth", { state: { isLogin: false } })}
                variant="solid"
                className="px-10 py-4 text-lg w-full sm:w-auto cursor-none"
              >
                Boot the OS
              </AnimatedButton>
              <AnimatedButton
                to="/features"
                variant="outline"
                className="px-10 py-4 text-lg w-full sm:w-auto cursor-none"
              >
                Explore Features
              </AnimatedButton>
            </div>
          </motion.div>
        </div>

        {/* --- DUAL INFINITE MARQUEES (Colleges & Careers) --- */}
        <div className="py-10 border-b border-white/5 bg-[#030303] overflow-hidden relative flex flex-col gap-4">
          {/* Fading Edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#030303] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#030303] to-transparent z-10 pointer-events-none" />

          {/* Marquee 1: Colleges (Left to Right) */}
          <div className="flex whitespace-nowrap overflow-hidden">
            <motion.div
              className="flex items-center gap-12 shrink-0"
              animate={{ x: [0, -1000] }}
              transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
            >
              {[...COLLEGES, ...COLLEGES, ...COLLEGES].map((item, i) => (
                <span
                  key={`col1-${i}`}
                  className="text-sm md:text-base font-extrabold text-[#444] uppercase tracking-widest"
                >
                  {item}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Marquee 2: Careers (Right to Left) */}
          <div className="flex whitespace-nowrap overflow-hidden">
            <motion.div
              className="flex items-center gap-12 shrink-0"
              animate={{ x: [-1000, 0] }}
              transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
            >
              {[...CAREERS, ...CAREERS, ...CAREERS].map((item, i) => (
                <span
                  key={`car1-${i}`}
                  className="text-sm md:text-base font-extrabold text-[#333] uppercase tracking-widest flex items-center gap-2"
                >
                  <Activity className="w-4 h-4 text-amber-500/50" /> {item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* --- MAIN CHARACTER ENERGY: FEATURES REDIRECT BAR --- */}
        <Link
          to="/features"
          className="group block border-b border-white/5 bg-[#050505] hover:bg-[#0a0a0a] transition-colors cursor-none"
        >
          <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Zap className="w-6 h-6 text-white group-hover:text-amber-500 transition-colors" />
              <h3 className="text-xl md:text-2xl font-extrabold tracking-tight">
                Ecosystem Architecture
              </h3>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 md:gap-6 flex-1">
              {[
                "Discotive Career Index",
                "Execution Vault",
                "AI Comparison",
                "Network Watchlist",
              ].map((feature, i) => (
                <span
                  key={i}
                  className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-widest bg-[#111] px-3 py-1.5 rounded-md border border-[#222]"
                >
                  {feature}
                </span>
              ))}
              <ChevronRight className="w-5 h-5 text-[#444] group-hover:text-white group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </Link>

        {/* --- SECTION 1: EXECUTION TIMELINE SANDBOX --- */}
        <div className="py-24 md:py-40 px-6 max-w-7xl mx-auto border-b border-white/5">
          <div className="flex flex-col lg:flex-row items-center gap-16 md:gap-24">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 mb-6 shadow-sm">
                <GitBranch className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-extrabold tracking-widest text-[#ccc] uppercase">
                  Execution Mapping
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                Map your trajectory. <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#555]">
                  Execute ruthlessly.
                </span>
              </h2>
              <p className="text-[#888] text-base md:text-lg mb-8 leading-relaxed max-w-xl">
                Replace to-do lists with a military-grade execution sandbox.
                Connect nodes, deploy assets, and build momentum that recruiters
                cannot ignore.
              </p>

              <div className="space-y-5 mb-10 text-left w-full max-w-md mx-auto lg:mx-0">
                {[
                  {
                    title: "Node-Based Architecture",
                    desc: "Visualize your path as interconnected deployment nodes.",
                  },
                  {
                    title: "Verifiable Progress",
                    desc: "Every completed node builds your public Proof of Work.",
                  },
                  {
                    title: "Compound Momentum",
                    desc: "Maintain execution streaks to boost your global ranking.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-md bg-[#111] border border-[#333] flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#666] leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
                to="/features"
                className="px-8 py-3 bg-white text-black text-xs font-extrabold rounded-md uppercase tracking-widest hover:bg-[#e5e5e5] transition-colors flex items-center gap-2"
              >
                Explore Timeline <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Visual: The Sleek Tablet Sandbox */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
              whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 w-full max-w-2xl perspective-1000"
            >
              <div className="p-3 md:p-4 bg-[#0a0a0a] rounded-[2rem] border border-[#222] shadow-[0_0_50px_rgba(255,255,255,0.03)] transform-gpu hover:scale-[1.02] transition-transform duration-500">
                <InteractiveTimelineSandbox />
              </div>
            </motion.div>
          </div>
        </div>

        {/* --- SECTION 2: GLOBAL LEADERBOARD SHOWCASE --- */}
        <div className="py-24 md:py-40 px-6 max-w-7xl mx-auto border-b border-white/5">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16 md:gap-24">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 mb-6 shadow-sm">
                <Trophy className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-extrabold tracking-widest text-[#ccc] uppercase">
                  Global Leaderboard
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                Outwork the globe. <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#555]">
                  Claim your crown.
                </span>
              </h2>
              <p className="text-[#888] text-base md:text-lg mb-8 leading-relaxed max-w-xl">
                The Discotive Score is a mathematical representation of your
                execution velocity. Compete against elite operators worldwide
                and claim the Apex Alpha Crown.
              </p>

              <Link
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
                to="/auth"
                state={{ isLogin: false }}
                className="px-8 py-3 bg-[#111] border border-[#333] text-white text-xs font-extrabold rounded-md uppercase tracking-widest hover:bg-[#222] hover:border-[#444] transition-all flex items-center gap-2"
              >
                Enter The Arena <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="flex-1 w-full max-w-md mx-auto"
            >
              {/* Mock Leaderboard UI */}
              <div className="bg-[#050505] border border-[#222] rounded-[2rem] p-6 shadow-[0_0_50px_rgba(255,255,255,0.02)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37] opacity-[0.03] blur-[80px] rounded-full pointer-events-none" />

                <div className="flex flex-col gap-4 relative z-10">
                  {/* Rank 1: Apex Alpha */}
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#D4AF37] rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.05)] transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-extrabold text-[#D4AF37] w-6 text-center">
                        1
                      </div>
                      <div className="relative">
                        <Crown className="w-4 h-4 text-[#D4AF37] absolute -top-3 -right-2 rotate-12" />
                        <div className="w-10 h-10 rounded-md bg-[#000] border border-[#D4AF37] flex items-center justify-center font-bold text-[#D4AF37]">
                          KB
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Keshav Bansal
                        </p>
                        <p className="text-[10px] text-[#888] font-mono">
                          @keshav
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-[#D4AF37]">
                        8,450
                      </p>
                      <p className="text-[8px] text-[#666] uppercase tracking-widest">
                        Score
                      </p>
                    </div>
                  </div>

                  {/* Rank 2: Apex Beta */}
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#C0C0C0] rounded-xl transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold text-[#C0C0C0] w-6 text-center">
                        2
                      </div>
                      <div className="relative">
                        <Crown className="w-3.5 h-3.5 text-[#C0C0C0] absolute -top-2 -right-1 rotate-12" />
                        <div className="w-10 h-10 rounded-md bg-[#111] border border-[#C0C0C0] flex items-center justify-center font-bold text-[#C0C0C0]">
                          JD
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">John Doe</p>
                        <p className="text-[10px] text-[#666] font-mono">
                          @johndoe
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#C0C0C0]">
                        7,210
                      </p>
                    </div>
                  </div>

                  {/* Rank 3: Apex Gamma */}
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#CD7F32] rounded-xl transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-bold text-[#CD7F32] w-6 text-center">
                        3
                      </div>
                      <div className="relative">
                        <Crown className="w-3.5 h-3.5 text-[#CD7F32] absolute -top-2 -right-1 rotate-12" />
                        <div className="w-10 h-10 rounded-md bg-[#111] border border-[#CD7F32] flex items-center justify-center font-bold text-[#CD7F32]">
                          AS
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Alice Smith
                        </p>
                        <p className="text-[10px] text-[#666] font-mono">
                          @alice
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-[#CD7F32]">
                        6,900
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ============================================================================
            THE MONOPOLY FOOTER (Apple-Tier Minimalism)
        ============================================================================ */}
        <footer
          className="border-t border-white/5 bg-[#030303] pt-24 pb-12 px-6 relative overflow-hidden"
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
        >
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white opacity-[0.01] blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-7xl mx-auto relative z-10">
            {/* Main Links Grid (Left-Aligned, 2-Column on Mobile) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-12 mb-20">
              {/* Brand Column (Spans full width on mobile) */}
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

              {/* Platform Column */}
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

              {/* Resources Column */}
              <div className="col-span-1 flex flex-col items-start text-left">
                <h4 className="text-white font-extrabold text-[10px] sm:text-xs mb-6 uppercase tracking-widest">
                  Resources
                </h4>
                <ul className="space-y-4">
                  <li>
                    <Link
                      to="/about"
                      className="text-sm font-medium text-[#888] hover:text-white transition-colors"
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

              {/* Contact Column (Spans full width on mobile) */}
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
                      <Mail className="w-4 h-4 text-[#555]" />
                      discotive@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar (Responsive Stacking) */}
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

export default Landing;
