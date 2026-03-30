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
  Activity,
  MapPin,
  Target,
  Code,
  Briefcase,
  Globe,
  Instagram,
  Linkedin,
  Youtube,
  Zap,
  Lock,
  Search,
  CheckCircle2,
  GitBranch,
  Trophy,
  Crown,
  ArrowRight,
  Mail,
  FolderOpen,
  Users,
  ShieldCheck,
  Eye,
  Plus,
  RefreshCw,
} from "lucide-react";
import GlobalLoader from "../components/GlobalLoader";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// 1. BACKGROUND & NAVBAR
// ============================================================================
const ParticleBackground = () => {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    setParticles(Array.from({ length: 40 }));
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-20 mask-image:linear-gradient(to_bottom,black,transparent)">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-amber-500 rounded-full"
          initial={{
            x:
              Math.random() *
              (typeof window !== "undefined" ? window.innerWidth : 1000),
            y:
              Math.random() *
              (typeof window !== "undefined" ? window.innerHeight : 1000),
            opacity: Math.random() * 0.5,
          }}
          animate={{
            y: [null, Math.random() * -100 - 50],
            opacity: [0, Math.random() * 0.5 + 0.2, 0],
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

const FeaturesNavbar = ({ setIsHoveringCard }) => {
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
// 2. SANDBOX COMPONENTS (Defined safely outside main render)
// ============================================================================
const FeatureExecutionNode = ({ data, selected }) => {
  const isActive = data.status === "ACTIVE";
  const isCompleted = data.status === "COMPLETED";
  return (
    <div
      className={cn(
        "w-[260px] bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl p-4 relative overflow-hidden transition-all duration-300 cursor-pointer",
        isActive &&
          "border border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)] scale-105 z-10",
        isCompleted && "border border-green-500/30 opacity-80",
        !isActive && !isCompleted && "border border-[#222]",
        selected && "border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.1)]",
      )}
    >
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
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
              "text-sm font-extrabold tracking-tight",
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
            <CheckCircle2 className="w-3 h-3" />
          ) : isActive ? (
            <Activity className="w-3 h-3 animate-pulse" />
          ) : (
            <Lock className="w-3 h-3" />
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-2 h-2 bg-[#222] border border-[#444]"
      />
    </div>
  );
};

const initialFeatureNodes = [
  {
    id: "1",
    type: "executionNode",
    position: { x: 50, y: 100 },
    data: { title: "Define Protocol", date: "Phase 1", status: "COMPLETED" },
  },
  {
    id: "2",
    type: "executionNode",
    position: { x: 380, y: 100 },
    data: { title: "Build Architecture", date: "Phase 2", status: "ACTIVE" },
  },
];
const initialFeatureEdges = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    animated: true,
    style: { stroke: "#f59e0b", strokeWidth: 2 },
  },
];

const FeatureRoadmapSandbox = ({ setIsHoveringCard }) => {
  const [nodes, setNodes] = useState(initialFeatureNodes);
  const [edges, setEdges] = useState(initialFeatureEdges);
  const nodeTypes = useMemo(
    () => ({ executionNode: FeatureExecutionNode }),
    [],
  );

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const deployNode = () => {
    const newNodeId = (nodes.length + 1).toString();
    const lastNode = nodes[nodes.length - 1];
    setNodes((nds) =>
      nds.map((n) =>
        n.id === lastNode.id
          ? { ...n, data: { ...n.data, status: "COMPLETED" } }
          : n,
      ),
    );
    const newNode = {
      id: newNodeId,
      type: "executionNode",
      position: { x: lastNode.position.x + 330, y: 100 },
      data: {
        title: `Scale Systems v${newNodeId}`,
        date: `Phase ${newNodeId}`,
        status: "ACTIVE",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds.map((e) => ({
        ...e,
        style: { stroke: "#22c55e", strokeWidth: 2 },
      })),
      {
        id: `e${lastNode.id}-${newNodeId}`,
        source: lastNode.id,
        target: newNodeId,
        animated: true,
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      },
    ]);
  };

  return (
    <div className="w-full h-[500px] bg-[#050505] rounded-[2rem] border border-[#222] overflow-hidden relative shadow-2xl flex flex-col">
      <div className="absolute top-6 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-[#111] border border-[#333] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg pointer-events-auto">
          <GitBranch className="w-4 h-4 text-[#ccc]" />
          <span className="text-xs font-bold text-white uppercase tracking-widest">
            Execution Sandbox
          </span>
        </div>
        <button
          onClick={deployNode}
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-transform active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <Plus className="w-3 h-3" /> Deploy Node
        </button>
      </div>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#030303]"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#222" gap={30} size={1.5} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};

// ============================================================================
// 3. MORE INTERACTIVE MODULES
// ============================================================================
const initialLeaderboard = [
  {
    id: 1,
    name: "Keshav Bansal",
    handle: "@keshav",
    score: 8450,
    initials: "KB",
    color: "text-[#D4AF37]",
    border: "border-[#D4AF37]",
    bg: "bg-[#D4AF37]",
  },
  {
    id: 2,
    name: "Marcus Webb",
    handle: "@marcusw",
    score: 8200,
    initials: "MW",
    color: "text-[#C0C0C0]",
    border: "border-[#C0C0C0]",
    bg: "bg-[#C0C0C0]",
  },
  {
    id: 3,
    name: "Elena Rostova",
    handle: "@elena",
    score: 7900,
    initials: "ER",
    color: "text-[#CD7F32]",
    border: "border-[#CD7F32]",
    bg: "bg-[#CD7F32]",
  },
  {
    id: 4,
    name: "You (Guest)",
    handle: "@guest",
    score: 7850,
    initials: "GU",
    color: "text-white",
    border: "border-[#444]",
    bg: "bg-[#444]",
  },
];

const FeatureLeaderboardSimulator = ({ setIsHoveringCard }) => {
  const [leaders, setLeaders] = useState(initialLeaderboard);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateExecution = () => {
    setIsSimulating(true);
    const updatedLeaders = leaders.map((leader) => {
      if (leader.id === 4)
        return {
          ...leader,
          score: leader.score + Math.floor(Math.random() * 500) + 100,
        };
      return {
        ...leader,
        score: leader.score + Math.floor(Math.random() * 200),
      };
    });
    updatedLeaders.sort((a, b) => b.score - a.score);
    setLeaders(updatedLeaders);
    setTimeout(() => setIsSimulating(false), 500);
  };

  return (
    <div className="w-full bg-[#050505] rounded-[2rem] border border-[#222] p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500 opacity-[0.03] blur-[80px] rounded-full pointer-events-none" />
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-500" /> Apex Alpha Rank
        </h3>
        <button
          onClick={simulateExecution}
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
          disabled={isSimulating}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#333] hover:bg-[#222] hover:border-amber-500/50 transition-all rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
        >
          <RefreshCw
            className={cn(
              "w-3 h-3 text-amber-500",
              isSimulating && "animate-spin",
            )}
          />{" "}
          Inject Score
        </button>
      </div>
      <div className="flex flex-col gap-3 relative z-10">
        <AnimatePresence>
          {leaders.map((user, index) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-colors",
                user.id === 4
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-[#0a0a0a] border-[#222]",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "text-lg font-extrabold w-6 text-center",
                    user.color,
                  )}
                >
                  {index + 1}
                </div>
                <div className="relative">
                  {index === 0 && (
                    <Crown
                      className={cn(
                        "w-4 h-4 absolute -top-3 -right-2 rotate-12",
                        user.color,
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-md bg-[#000] border flex items-center justify-center font-bold",
                      user.border,
                      user.color,
                    )}
                  >
                    {user.initials}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{user.name}</p>
                  <p className="text-[10px] text-[#888] font-mono">
                    {user.handle}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <motion.p
                  key={user.score}
                  initial={{ scale: 1.2, color: "#f59e0b" }}
                  animate={{
                    scale: 1,
                    color: user.id === 4 ? "#f59e0b" : "#ffffff",
                  }}
                  className="text-base font-extrabold"
                >
                  {user.score.toLocaleString()}
                </motion.p>
                <p className="text-[8px] text-[#666] uppercase tracking-widest">
                  Score
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const NetworkFlipCard = ({ user, setIsHoveringCard }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div
      className="w-full h-[220px] cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => {
        setIsFlipped(true);
        setIsHoveringCard(true);
      }}
      onMouseLeave={() => {
        setIsFlipped(false);
        setIsHoveringCard(false);
      }}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className="absolute inset-0 bg-[#0a0a0a] border border-[#222] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-16 h-16 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-xl font-extrabold text-[#666] mb-4">
            {user.initials}
          </div>
          <h4 className="font-bold text-white text-lg">{user.name}</h4>
          <p className="text-xs text-[#888] font-mono tracking-widest uppercase mt-1">
            {user.role}
          </p>
          <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
            <Eye className="w-3 h-3" /> Hover to Inspect
          </div>
        </div>
        <div
          className="absolute inset-0 bg-[#111] border border-amber-500/30 rounded-2xl p-6 flex flex-col items-start justify-center shadow-[0_0_30px_rgba(245,158,11,0.1)]"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="w-full flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#666] uppercase tracking-widest">
                Global Rank
              </p>
              <p className="text-lg font-extrabold text-white">#{user.rank}</p>
            </div>
          </div>
          <div className="space-y-2 w-full">
            <div className="flex justify-between text-xs">
              <span className="text-[#888]">Execution Score:</span>
              <span className="font-bold text-white">{user.score}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#888]">Nodes Deployed:</span>
              <span className="font-bold text-white">{user.nodes}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#888]">Status:</span>
              <span className="font-bold text-green-500 animate-pulse">
                Online
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const VaultSimulatorCore = ({ setIsHoveringCard }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verified, setVerified] = useState(false);

  const handleUpload = () => {
    setAnalyzing(true);
    setVerified(false);
    setProgress(0);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 15) + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setAnalyzing(false);
          setVerified(true);
        }, 400);
      }
      setProgress(currentProgress);
    }, 200);
  };

  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full">
        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-2">
          <ShieldCheck className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-xl font-extrabold text-white">Asset Verified</h3>
        <p className="text-xs text-[#888] font-mono mb-4 text-center max-w-xs">
          Cryptographic proof generated. Execution score updated globally.
        </p>
        <button
          onClick={() => setVerified(false)}
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
          className="text-xs font-bold text-[#666] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-3 h-3" /> Deploy Another
        </button>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full max-w-xs mx-auto">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-[#111] stroke-current"
              strokeWidth="4"
              cx="50"
              cy="50"
              r="46"
              fill="transparent"
            />
            <circle
              className="text-amber-500 stroke-current transition-all duration-200"
              strokeWidth="4"
              strokeLinecap="round"
              cx="50"
              cy="50"
              r="46"
              fill="transparent"
              strokeDasharray="289"
              strokeDashoffset={289 - (289 * progress) / 100}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-extrabold text-white">
              {progress}%
            </span>
          </div>
        </div>
        <p className="text-xs font-mono text-amber-500 uppercase tracking-widest animate-pulse">
          Running DCI Analysis...
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={handleUpload}
      onMouseEnter={() => setIsHoveringCard(true)}
      onMouseLeave={() => setIsHoveringCard(false)}
      className="w-full h-full min-h-[250px] border-2 border-dashed border-[#333] hover:border-amber-500/50 hover:bg-[#111] rounded-xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all p-8 group"
    >
      <div className="w-16 h-16 rounded-full bg-[#111] group-hover:bg-amber-500/10 transition-colors flex items-center justify-center">
        <FolderOpen className="w-6 h-6 text-[#666] group-hover:text-amber-500 transition-colors" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white mb-1 group-hover:text-amber-500 transition-colors">
          Deploy Asset for Verification
        </p>
        <p className="text-xs text-[#666]">
          Click to simulate DCI cryptographic analysis
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN FEATURES PAGE COMPONENT
// ============================================================================
const Features = () => {
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
        <FeaturesNavbar setIsHoveringCard={setIsHoveringCard} />

        {/* HERO */}
        <div className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 max-w-4xl mx-auto w-full"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 shadow-2xl">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold tracking-[0.2em] text-[#ccc] uppercase">
                Interactive Exhibition
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-[90px] font-extrabold tracking-tight leading-[0.9] mb-8">
              The Engine Room.
            </h1>
            <p className="text-lg md:text-xl text-[#888] font-medium max-w-2xl mx-auto mb-12 leading-relaxed tracking-wide">
              Test the systems. Build nodes, flip network cards, and analyze the
              leaderboard. Experience the monopoly before you boot the OS.
            </p>
          </motion.div>
        </div>

        {/* FEATURE 01: ROADMAP */}
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative">
          <div className="absolute top-0 left-10 w-[1px] h-full bg-gradient-to-b from-amber-500/50 via-white/5 to-transparent hidden md:block" />
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 md:pl-20"
            >
              <div className="text-[10px] font-extrabold tracking-[0.3em] text-amber-500 uppercase mb-4">
                01 // The Trajectory
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                Execution Roadmap
              </h2>
              <p className="text-[#888] text-lg leading-relaxed mb-8">
                Your goals are useless without a deployed architecture.
                Discotive maps your ambition into verifiable, sequential nodes.
                Connect the dots, execute the tasks, and generate cryptographic
                Proof of Work.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Visual Deployment Graph",
                  "Task-level execution tracking",
                  "Automated momentum calculation",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm font-bold text-[#ccc]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/app/roadmap")}
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
                className="group flex items-center gap-3 text-white font-extrabold text-xs uppercase tracking-widest hover:text-amber-500 transition-colors"
              >
                Access Roadmap Module{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 w-full"
            >
              <FeatureRoadmapSandbox setIsHoveringCard={setIsHoveringCard} />
            </motion.div>
          </div>
        </section>

        {/* FEATURE 02: LEADERBOARD */}
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative bg-[#030303]">
          <div className="absolute top-0 right-10 w-[1px] h-full bg-gradient-to-b from-amber-500/50 via-white/5 to-transparent hidden md:block" />
          <div className="flex flex-col-reverse lg:flex-row gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 w-full"
            >
              <FeatureLeaderboardSimulator
                setIsHoveringCard={setIsHoveringCard}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 md:pr-20 lg:text-right"
            >
              <div className="flex lg:justify-end">
                <div className="text-[10px] font-extrabold tracking-[0.3em] text-amber-500 uppercase mb-4">
                  02 // The Arena
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                Global Leaderboard
              </h2>
              <p className="text-[#888] text-lg leading-relaxed mb-8">
                Execution is measurable. Discotive dynamically calculates your
                momentum based on roadmap completions, asset verification, and
                daily protocol compliance. Outwork the competition.
              </p>
              <ul className="space-y-4 mb-10 inline-block text-left">
                {[
                  "Algorithmic Score Calculation",
                  "Live Rank Adjustments",
                  "Top 1% Global Positioning",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm font-bold text-[#ccc]"
                  >
                    <Trophy className="w-4 h-4 text-amber-500" /> {item}
                  </li>
                ))}
              </ul>
              <div className="flex lg:justify-end">
                <button
                  onClick={() => navigate("/app/leaderboard")}
                  onMouseEnter={() => setIsHoveringCard(true)}
                  onMouseLeave={() => setIsHoveringCard(false)}
                  className="group flex items-center gap-3 text-white font-extrabold text-xs uppercase tracking-widest hover:text-amber-500 transition-colors"
                >
                  Enter Leaderboard{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FEATURE 03: NETWORK */}
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative">
          <div className="absolute top-0 left-10 w-[1px] h-full bg-gradient-to-b from-amber-500/50 via-white/5 to-transparent hidden md:block" />
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 md:pl-20"
            >
              <div className="text-[10px] font-extrabold tracking-[0.3em] text-amber-500 uppercase mb-4">
                03 // The Syndicate
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                High-Signal Networking
              </h2>
              <p className="text-[#888] text-lg leading-relaxed mb-8">
                Stop connecting with noise. Access a verified directory of
                founders, engineers, and creators. View their execution scores
                instantly. If they aren't building, they aren't here.
              </p>
              <button
                onClick={() => navigate("/app/network")}
                onMouseEnter={() => setIsHoveringCard(true)}
                onMouseLeave={() => setIsHoveringCard(false)}
                className="group flex items-center gap-3 text-white font-extrabold text-xs uppercase tracking-widest hover:text-amber-500 transition-colors"
              >
                Access Network Hub{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 w-full grid grid-cols-2 gap-4 md:gap-6"
            >
              <NetworkFlipCard
                setIsHoveringCard={setIsHoveringCard}
                user={{
                  initials: "JD",
                  name: "Jayden Dior",
                  role: "AI Architect",
                  rank: 14,
                  score: 6200,
                  nodes: 42,
                }}
              />
              <NetworkFlipCard
                setIsHoveringCard={setIsHoveringCard}
                user={{
                  initials: "SV",
                  name: "Sanya V.",
                  role: "Founder",
                  rank: 8,
                  score: 7150,
                  nodes: 56,
                }}
              />
            </motion.div>
          </div>
        </section>

        {/* FEATURE 04: VAULT */}
        <section className="py-24 px-6 max-w-7xl mx-auto border-t border-white/5 relative bg-[#030303]">
          <div className="absolute top-0 right-10 w-[1px] h-full bg-gradient-to-b from-amber-500/50 via-white/5 to-transparent hidden md:block" />
          <div className="flex flex-col-reverse lg:flex-row gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 w-full"
            >
              <div className="w-full bg-[#0a0a0a] rounded-[2rem] border border-[#222] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[350px]">
                <VaultSimulatorCore setIsHoveringCard={setIsHoveringCard} />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="flex-1 md:pr-20 lg:text-right"
            >
              <div className="flex lg:justify-end">
                <div className="text-[10px] font-extrabold tracking-[0.3em] text-amber-500 uppercase mb-4">
                  04 // The Proof
                </div>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
                Asset Vault & DCI
              </h2>
              <p className="text-[#888] text-lg leading-relaxed mb-8">
                Talk is cheap. The Discotive Career Index (DCI) requires
                cryptographic proof of execution. Upload your GitHub commits,
                deployed links, and certificates. Our engine verifies your
                claims and generates an immutable portfolio.
              </p>
              <ul className="space-y-4 mb-10 inline-block text-left">
                {[
                  "Tamper-proof Asset Verification",
                  "Automated PDF/CSV Exporting",
                  "Recruiter-Ready Dossiers",
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm font-bold text-[#ccc]"
                  >
                    <ShieldCheck className="w-4 h-4 text-green-500" /> {item}
                  </li>
                ))}
              </ul>
              <div className="flex lg:justify-end">
                <button
                  onClick={() => navigate("/app/vault")}
                  onMouseEnter={() => setIsHoveringCard(true)}
                  onMouseLeave={() => setIsHoveringCard(false)}
                  className="group flex items-center gap-3 text-white font-extrabold text-xs uppercase tracking-widest hover:text-amber-500 transition-colors"
                >
                  Access The Vault{" "}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 relative border-t border-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] to-[#030303] z-0" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-amber-500 opacity-[0.02] blur-[120px] rounded-full pointer-events-none z-0" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#333] flex items-center justify-center mb-8">
              <img
                src="/logo.png"
                alt="Discotive"
                className="w-8 h-8 opacity-80"
              />
            </div>
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
              Stop consuming. <br />{" "}
              <span className="text-amber-500">Start executing.</span>
            </h2>
            <p className="text-[#888] text-lg max-w-xl mx-auto mb-12">
              The tools are built. The leaderboard is live. The only thing
              missing from the protocol is you.
            </p>
            <button
              onClick={() => navigate("/auth")}
              onMouseEnter={() => setIsHoveringCard(true)}
              onMouseLeave={() => setIsHoveringCard(false)}
              className="px-10 py-5 bg-white text-black text-sm font-extrabold rounded-xl uppercase tracking-widest hover:bg-[#e5e5e5] hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              Boot The OS
            </button>
          </motion.div>
        </section>

        {/* FOOTER */}
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
                      className="text-sm font-medium text-white transition-colors"
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

export default Features;
