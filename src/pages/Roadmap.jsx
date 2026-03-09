import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  Calendar as CalendarIcon,
  GitBranch,
  ChevronDown,
  Clock,
  Edit3,
  GitCommit,
  BookOpen,
  Briefcase,
  Activity,
  ArrowRight,
  CheckCircle2,
  Circle,
  Plus,
  X,
  AlignLeft,
  Maximize,
  Minimize,
  List,
  Hash,
  ShieldCheck,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

// --- INITIAL SPREAD OUT STATE DATA ---
const initialNodes = [
  {
    id: "n1",
    x: 400,
    y: 500,
    type: "core",
    status: "completed",
    title: "Boot OS Foundation",
    date: "Mar 1 - Mar 5",
    deadline: "Mar 5",
    desc: "Establish baseline React architecture.",
    progress: 100,
  },
  {
    id: "n2",
    x: 900,
    y: 500,
    type: "core",
    status: "active",
    title: "Database Infrastructure",
    date: "Mar 6 - Mar 12",
    deadline: "Mar 12",
    desc: "Configure Firestore and user schemas.",
    progress: 65,
  },
  {
    id: "n3",
    x: 650,
    y: 150,
    type: "branch",
    status: "completed",
    title: "Authentication Pipeline",
    date: "Mar 6 - Mar 8",
    deadline: "Mar 8",
    desc: "Implement Google Auth.",
    progress: 100,
  },
  {
    id: "n4",
    x: 1400,
    y: 500,
    type: "core",
    status: "pending",
    title: "Dynamic Canvas UI",
    date: "Mar 13 - Mar 18",
    deadline: "Mar 18",
    desc: "Build the F1-style timeline canvas.",
    progress: 0,
  },
  {
    id: "n5",
    x: 1150,
    y: 850,
    type: "branch",
    status: "pending",
    title: "Jaipur Hub Integration",
    date: "Mar 15 - Mar 16",
    deadline: "Mar 16",
    desc: "Sync live local capacity data.",
    progress: 0,
  },
  {
    id: "n6",
    x: 1900,
    y: 500,
    type: "core",
    status: "locked",
    title: "Alpha Testing Phase",
    date: "Mar 20 - Apr 5",
    deadline: "Apr 5",
    desc: "Onboard first 50 users.",
    progress: 0,
  },
  {
    id: "n7",
    x: 2400,
    y: 500,
    type: "core",
    status: "locked",
    title: "Pre-Seed Pitch",
    date: "Apr 10 - Apr 15",
    deadline: "Apr 15",
    desc: "Finalize metrics for VCs.",
    progress: 0,
  },
];

const connections = [
  { from: "n1", to: "n2", status: "active" },
  { from: "n1", to: "n3", status: "completed" },
  { from: "n3", to: "n4", status: "pending" },
  { from: "n2", to: "n4", status: "pending" },
  { from: "n2", to: "n5", status: "pending" },
  { from: "n5", to: "n6", status: "locked" },
  { from: "n4", to: "n6", status: "locked" },
  { from: "n6", to: "n7", status: "locked" },
];

const staticChartData = [
  20, 25, 40, 30, 65, 50, 80, 55, 60, 45, 70, 85, 90, 60, 50, 40, 75, 80, 95,
  100, 85, 70, 65, 50, 40, 30, 45, 60, 80, 90,
];

const pastDiaryLogs = [
  {
    id: 1,
    date: "Mar 8, 2026",
    preview:
      "Successfully linked Google Auth. Ran into an issue with session persistence but resolved it via local DB.",
  },
  {
    id: 2,
    date: "Mar 7, 2026",
    preview:
      "Drafted the schema for the Discotive User object. Realized we need to separate Baseline from Vision data.",
  },
  {
    id: 3,
    date: "Mar 5, 2026",
    preview:
      "Booted the React Vite project. Set up Tailwind and the brutalist color palette. Momentum feels good.",
  },
];

const Roadmap = () => {
  const { userData } = useUserData();

  // --- UI STATES ---
  const [viewMode, setViewMode] = useState("timeline");
  const [timeframe, setTimeframe] = useState("3 Months Trajectory");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- CANVAS ENGINE STATES ---
  const [nodes, setNodes] = useState(initialNodes);
  const [scale, setScale] = useState(1);
  const [canvasKey, setCanvasKey] = useState(0); // Used to force reset the map pan
  const mapContainerRef = useRef(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // --- DIARY STATES ---
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);
  const [isDiaryFullscreen, setIsDiaryFullscreen] = useState(false);
  const [diaryText, setDiaryText] = useState("");
  const DIARY_LIMIT = 1000;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      setScale((prev) =>
        Math.min(Math.max(prev - e.deltaY * 0.0015, 0.3), 2.5),
      );
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [viewMode, canvasKey]);

  // The fix for perfectly dragging nodes
  const handleNodePan = (nodeId, info) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            x: n.x + info.delta.x / scale,
            y: n.y + info.delta.y / scale,
          };
        }
        return n;
      }),
    );
  };

  const resetMap = () => {
    setScale(1);
    setNodes(initialNodes);
    setCanvasKey((prev) => prev + 1); // Remounts the canvas to center it instantly
  };

  const renderPaths = () => {
    return connections.map((conn, idx) => {
      const fromNode = nodes.find((n) => n.id === conn.from);
      const toNode = nodes.find((n) => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const startX = fromNode.x + 320;
      const startY = fromNode.y + 120;
      const endX = toNode.x;
      const endY = toNode.y + 120;

      const controlDist = Math.max(Math.abs(endX - startX) / 2, 50);
      const path = `M ${startX} ${startY} C ${startX + controlDist} ${startY}, ${endX - controlDist} ${endY}, ${endX} ${endY}`;

      return (
        <path
          key={idx}
          d={path}
          stroke={
            conn.status === "active" || conn.status === "completed"
              ? "#444"
              : "#222"
          }
          strokeWidth="3"
          fill="none"
          strokeDasharray={
            conn.status === "pending" || conn.status === "locked" ? "8 8" : "0"
          }
          className="transition-all duration-75"
        />
      );
    });
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-20">
      {/* --- HEADER --- */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-20">
        <div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none">
            Execution Map.
          </h1>
          <p className="text-lg md:text-xl text-[#888] font-medium tracking-tight">
            The neural pathway of your career deployment.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto relative">
          <div className="relative w-full md:w-64">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-4 bg-[#0a0a0a] border border-[#222] px-6 py-4 rounded-full font-bold text-sm text-white hover:border-[#444] transition-colors"
            >
              <span className="truncate">{timeframe}</span>{" "}
              <ChevronDown className="w-4 h-4 text-[#666] shrink-0" />
            </button>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 w-full bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden z-50"
                >
                  {[
                    "1 Month Sprint",
                    "3 Months Trajectory",
                    "12 Months Arc",
                    "Macro Vision",
                  ].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTimeframe(t);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full text-left px-6 py-4 text-sm font-bold text-[#888] hover:text-white hover:bg-[#111] transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex bg-[#0a0a0a] border border-[#222] rounded-full p-1 shrink-0">
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "p-3 rounded-full transition-all",
                viewMode === "timeline"
                  ? "bg-[#222] text-white"
                  : "text-[#666] hover:text-white",
              )}
            >
              <GitBranch className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "p-3 rounded-full transition-all",
                viewMode === "calendar"
                  ? "bg-[#222] text-white"
                  : "text-[#666] hover:text-white",
              )}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* --- THE CANVAS ENGINE --- */}
      <div
        className={cn(
          "bg-[#050505] relative overflow-hidden group transition-all duration-500",
          isMapFullscreen
            ? "fixed inset-0 z-50 bg-[#030303]"
            : "w-full border-y border-[#111] h-[700px]",
        )}
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="absolute top-6 right-6 z-40 flex gap-2">
          <button
            onClick={resetMap}
            className="w-10 h-10 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl group/btn"
            title="Recalibrate Map"
          >
            <RefreshCw className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={() => setIsMapFullscreen(!isMapFullscreen)}
            className="w-10 h-10 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
          >
            {isMapFullscreen ? (
              <Minimize className="w-4 h-4" />
            ) : (
              <Maximize className="w-4 h-4" />
            )}
          </button>
        </div>

        {viewMode === "timeline" ? (
          <div
            key={canvasKey}
            ref={mapContainerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing relative"
          >
            <motion.div
              drag
              dragMomentum={false}
              className="absolute w-[10000px] h-[10000px] origin-top-left"
              style={{ scale, left: -1000, top: -500 }}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                {renderPaths()}
              </svg>

              {nodes.map((node) => (
                <motion.div
                  key={node.id}
                  onPan={(e, info) => handleNodePan(node.id, info)}
                  onPointerDown={(e) => e.stopPropagation()} // Isolates drag to just the node
                  style={{
                    position: "absolute",
                    left: node.x,
                    top: node.y,
                    touchAction: "none",
                  }}
                  className={cn(
                    "w-[320px] rounded-[24px] p-6 relative z-10 transition-colors duration-300 border cursor-grab active:cursor-grabbing",
                    node.status === "active"
                      ? "bg-[#0a0a0a] border-white/30 shadow-[0_0_50px_rgba(255,255,255,0.05)] hover:border-white/50"
                      : node.status === "completed"
                        ? "bg-[#050505] border-[#333] hover:border-[#555]"
                        : "bg-[#030303] border-[#111] opacity-70 hover:opacity-100",
                  )}
                >
                  <div className="flex justify-between items-start mb-6 pointer-events-none">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
                        {node.type}
                      </span>
                      <span className="text-xs font-mono text-[#888]">
                        {node.date}
                      </span>
                    </div>
                    {node.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-[#888]" />
                    ) : node.status === "active" ? (
                      <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_10px_white] mt-1" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#333]" />
                    )}
                  </div>

                  <h3
                    className={cn(
                      "text-xl font-bold tracking-tight mb-2 pointer-events-none",
                      node.status === "locked" ? "text-[#666]" : "text-white",
                    )}
                  >
                    {node.title}
                  </h3>
                  <p className="text-[#888] text-sm leading-relaxed mb-6 pointer-events-none">
                    {node.desc}
                  </p>

                  <div className="flex items-end justify-between pt-4 border-t border-[#222]">
                    <div className="pointer-events-none">
                      <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
                        Deadline
                      </p>
                      <p className="text-xs font-mono text-white">
                        {node.deadline}
                      </p>
                    </div>
                    {node.status !== "locked" && (
                      <button
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                          node.status === "active"
                            ? "bg-white text-black hover:scale-110"
                            : "bg-[#111] text-[#888] hover:bg-[#222] hover:text-white",
                        )}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {node.status !== "locked" && node.status !== "pending" && (
                    <div className="absolute bottom-0 left-6 right-6 h-[2px] bg-[#111] rounded-full overflow-hidden translate-y-[1px] pointer-events-none">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${node.progress}%` }}
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto custom-scrollbar p-12">
            <div className="max-w-[1200px] mx-auto">
              <h2 className="text-3xl font-extrabold text-white mb-8">
                March 2026
              </h2>
              <div className="grid grid-cols-7 gap-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-xs font-bold text-[#666] uppercase pb-4"
                  >
                    {d}
                  </div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-32 rounded-2xl p-4 border flex flex-col transition-colors",
                      i === 11
                        ? "bg-white/5 border-white/20"
                        : "bg-[#0a0a0a] border-[#111] hover:bg-[#111]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-bold font-mono",
                        i === 11 ? "text-white" : "text-[#666]",
                      )}
                    >
                      {i + 1}
                    </span>
                    {i === 4 && (
                      <div className="mt-auto text-[10px] font-bold text-[#888] bg-[#222] px-2 py-1.5 rounded truncate">
                        Boot OS
                      </div>
                    )}
                    {i === 11 && (
                      <div className="mt-auto text-[10px] font-bold text-black bg-white px-2 py-1.5 rounded truncate">
                        DB Deploy Deadline
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- DEPLOYMENT BAR --- */}
      <div className="sticky top-0 z-30 bg-[#000]/80 backdrop-blur-2xl border-b border-[#222] py-4 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-bold text-[#888] tracking-tight">
            <CalendarIcon className="w-4 h-4" /> {formattedDate}
          </div>

          <button
            onClick={() => setIsDiaryOpen(true)}
            className="flex-1 max-w-lg w-full bg-[#111] border border-[#333] hover:border-white transition-all rounded-full py-3 px-6 flex items-center justify-center gap-3 group"
          >
            <Edit3 className="w-4 h-4 text-[#888] group-hover:text-white transition-colors" />
            <span className="text-sm font-bold text-[#ccc] group-hover:text-white transition-colors">
              Log Career Deployments
            </span>
          </button>

          <div className="flex items-center gap-2 text-sm font-mono text-white tracking-widest">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* --- TELEMETRY --- */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-20">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Real-time Telemetry.
          </h2>
          <p className="text-[#888] font-medium">
            Tracking verified data on the Discotive Chain.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 md:p-12 hover:border-[#333] transition-colors">
            <div className="flex justify-between items-start mb-12">
              <div>
                <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                  Execution Volume
                </p>
                <p className="text-5xl font-extrabold text-white tracking-tighter">
                  142
                </p>
                <p className="text-[#888] mt-2">
                  Discotive Vault Deployments (30 Days)
                </p>
              </div>
              <Activity className="w-8 h-8 text-[#444]" />
            </div>

            <div className="flex items-end gap-1.5 h-32 w-full mt-auto">
              {staticChartData.map((height, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t-sm transition-all duration-500 hover:opacity-80",
                    height > 70 ? "bg-white" : "bg-[#222]",
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-8 flex flex-col">
            <div className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 flex flex-col justify-center hover:border-[#333] transition-colors">
              <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Network Velocity
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold tracking-tighter text-white">
                  +2.4
                </span>
                <span className="text-[#888] font-medium">x</span>
              </div>
              <p className="text-[#666] text-sm mt-4">
                Growth in profile impressions.
              </p>
            </div>

            <div className="flex-1 bg-white text-black rounded-[2rem] p-8 flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer">
              <div className="flex justify-between items-start">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em]">
                  Live Priority
                </p>
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight mb-2">
                  Configure Firestore Rules
                </h3>
                <p className="text-xs font-bold opacity-70 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Due Today
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 flex flex-col h-full overflow-hidden hover:border-[#333] transition-colors">
            <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <List className="w-4 h-4" /> Recent Ledger
            </p>
            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {[
                { action: "Vault Sync", item: "schema.js", time: "2 hrs ago" },
                {
                  action: "Node Complete",
                  item: "Auth Pipeline",
                  time: "Yesterday",
                },
                { action: "Hub Access", item: "Jaipur Infra", time: "Mar 7" },
                {
                  action: "Profile Edit",
                  item: "Vision Updated",
                  time: "Mar 5",
                },
              ].map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-[#111] border border-[#222] flex items-center justify-center shrink-0 mt-0.5">
                    <Hash className="w-3 h-3 text-[#666]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-0.5">
                      {log.action}
                    </p>
                    <p className="text-xs text-[#888] font-medium">
                      {log.item}
                    </p>
                  </div>
                  <div className="ml-auto text-[10px] font-mono text-[#666]">
                    {log.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- DIARY OS MODAL --- */}
      <AnimatePresence>
        {isDiaryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDiaryOpen(false)}
              className="absolute inset-0 bg-[#000]/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative bg-[#0a0a0a] border border-[#222] shadow-2xl flex flex-col transition-all duration-300",
                isDiaryFullscreen
                  ? "w-full h-full rounded-none"
                  : "w-full max-w-6xl h-[80vh] rounded-[2rem]",
              )}
            >
              <div className="flex justify-between items-center p-6 md:p-8 border-b border-[#222] shrink-0">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                    Deployment Log.
                  </h2>
                  <p className="text-[#666] font-mono text-xs">
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDiaryFullscreen(!isDiaryFullscreen)}
                    className="p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    {isDiaryFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsDiaryOpen(false)}
                    className="p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#222] p-6 overflow-y-auto custom-scrollbar bg-[#050505]">
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Archive
                  </p>
                  <div className="space-y-4">
                    {pastDiaryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 bg-[#111] border border-[#222] rounded-2xl cursor-pointer hover:border-[#444] transition-colors"
                      >
                        <p className="text-xs font-mono text-[#888] mb-2">
                          {log.date}
                        </p>
                        <p className="text-sm text-[#ccc] line-clamp-3 leading-relaxed">
                          {log.preview}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-6 md:p-10 relative">
                  <div className="flex items-center gap-4 mb-6 opacity-50">
                    <AlignLeft className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-[#888]">
                      Drafting new entry...
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    maxLength={DIARY_LIMIT}
                    value={diaryText}
                    onChange={(e) => setDiaryText(e.target.value)}
                    placeholder="Document the reality of today's execution..."
                    className="flex-1 w-full bg-transparent text-lg md:text-xl font-medium text-white placeholder-[#444] focus:outline-none resize-none leading-relaxed custom-scrollbar"
                  />
                  <div className="flex items-center justify-between pt-6 border-t border-[#222] mt-auto">
                    <p
                      className={cn(
                        "text-xs font-mono font-bold",
                        diaryText.length >= DIARY_LIMIT
                          ? "text-red-500"
                          : "text-[#666]",
                      )}
                    >
                      {diaryText.length} / {DIARY_LIMIT}
                    </p>
                    <button className="px-8 py-3.5 font-extrabold text-black bg-white hover:bg-[#ccc] rounded-full transition-colors text-sm">
                      Commit to Chain
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Roadmap;
