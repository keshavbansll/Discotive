import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../firebase";
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  Clock,
  Edit3,
  List,
  Hash,
  ShieldCheck,
  Activity,
  X,
  AlignLeft,
  Maximize,
  Minimize,
  CheckCircle2,
  Circle,
  Cloud,
  CloudOff,
  RefreshCw,
  GitBranch,
  Trash2,
  Target,
  Settings2,
  Type,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  Check,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";

// ============================================================================
// UTILITIES
// ============================================================================
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();
const parseDate = (dateStr) => (dateStr ? new Date(dateStr) : null);

// ============================================================================
// 1. CUSTOM EXECUTION NODE
// ============================================================================
const ExecutionNode = ({ data, selected }) => {
  const tasks = data.tasks || [];
  const progress =
    tasks.length > 0
      ? Math.round(
          (tasks.filter((t) => t.completed).length / tasks.length) * 100,
        )
      : data.isCompleted
        ? 100
        : 0;
  const isComplete = progress === 100;
  const isBranch = data.nodeType === "branch";
  const priorityStatus = data.priorityStatus || "FUTURE";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = parseDate(data.deadline);
  const isOverdue = !isComplete && deadlineDate && deadlineDate < today;

  let containerClass = "border-[#222] bg-[#0a0a0a]";
  let glow = "";
  let icon = <Circle className="w-5 h-5 text-[#444]" />;

  if (isOverdue) {
    containerClass = "border-red-500 bg-[#1a0505]";
    icon = <AlertOctagon className="w-5 h-5 text-red-500" />;
  } else if (isComplete) {
    containerClass = "border-green-500/30 bg-[#050a05] opacity-80";
    icon = <CheckCircle2 className="w-5 h-5 text-green-500" />;
  } else if (priorityStatus === "READY") {
    containerClass = "border-white bg-[#111]";
    glow = "shadow-[0_0_30px_rgba(255,255,255,0.1)]";
    icon = <Circle className="w-5 h-5 text-white" />;
  } else if (priorityStatus === "NEXT") {
    containerClass = "border-[#444] bg-[#0a0a0a]";
  } else if (priorityStatus === "FUTURE") {
    containerClass = "border-[#111] bg-[#050505] opacity-50 hover:opacity-100";
  }

  if (selected) glow = "shadow-[0_0_40px_rgba(255,255,255,0.2)] border-white";

  const barColor = isOverdue
    ? "bg-[#450a0a]"
    : isComplete
      ? "bg-[#052e16]"
      : "bg-[#222]";
  const barFill = isOverdue
    ? "bg-red-500"
    : isComplete
      ? "bg-green-500"
      : "bg-white";

  return (
    <div
      className={cn(
        "w-[320px] rounded-[24px] p-6 relative z-10 transition-all duration-500 border",
        containerClass,
        glow,
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-4 h-4 bg-[#111] border-2 border-[#333] transition-all -ml-2"
      />

      <div className="flex justify-between items-start mb-4 pointer-events-none">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
            {isBranch ? "Sub-Branch" : "Core Milestone"}
            {priorityStatus === "READY" && !isOverdue && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
            {isOverdue && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </span>
        </div>
        {icon}
      </div>

      <h3 className="text-xl font-extrabold tracking-tight text-white mb-1 pointer-events-none">
        {data.title || "Untitled Milestone"}
      </h3>
      {data.subtitle && (
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest mb-3 pointer-events-none",
            isOverdue
              ? "text-red-400"
              : priorityStatus === "READY"
                ? "text-[#ccc]"
                : "text-[#666]",
          )}
        >
          {data.subtitle}
        </p>
      )}

      <p className="text-[#888] text-sm leading-relaxed mb-6 pointer-events-none line-clamp-2">
        {data.desc || "No parameters defined."}
      </p>

      <div className="flex items-end justify-between pt-4 border-t border-[#222]">
        <div className="pointer-events-none">
          <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1">
            Target
          </p>
          <p
            className={cn(
              "text-xs font-mono",
              isOverdue ? "text-red-500 font-bold" : "text-white",
            )}
          >
            {data.deadline || "TBD"}
          </p>
        </div>
        <p className="text-[10px] font-mono text-[#666]">{progress}%</p>
      </div>

      <div
        className={cn(
          "absolute bottom-0 left-6 right-6 h-[3px] rounded-t-lg overflow-hidden translate-y-[1px] pointer-events-none",
          barColor,
        )}
      >
        <div
          className={cn("h-full transition-all duration-500", barFill)}
          style={{ width: `${progress}%` }}
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-4 h-4 bg-[#111] border-2 border-[#333] transition-all -mr-2"
      />
    </div>
  );
};
const nodeTypes = { executionNode: ExecutionNode };

// ============================================================================
// 2. ISOLATED FLOW CANVAS COMPONENT
// ============================================================================
const FlowCanvas = ({
  filteredNodes,
  edges,
  setNodes,
  setEdges,
  hasUnsavedChanges,
  setHasUnsavedChanges,
  isSaving,
  handleCloudSave,
  isMapFullscreen,
  setIsMapFullscreen,
  setActiveEditNodeId,
  addToast,
  addLedgerEntry,
}) => {
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);

  const onNodesChange = useCallback(
    (c) => {
      setNodes((nds) => applyNodeChanges(c, nds));
      setHasUnsavedChanges(true);
    },
    [setNodes, setHasUnsavedChanges],
  );
  const onEdgesChange = useCallback(
    (c) => {
      setEdges((eds) => applyEdgeChanges(c, eds));
      setHasUnsavedChanges(true);
    },
    [setEdges, setHasUnsavedChanges],
  );

  const onConnect = useCallback(
    (params) => {
      const targetNode = filteredNodes.find((n) => n.id === params.target);
      const isBranch = targetNode?.data?.nodeType === "branch";
      const newEdge = {
        ...params,
        animated: isBranch,
        style: {
          stroke: "#666",
          strokeWidth: 2,
          strokeDasharray: isBranch ? "5,5" : "none",
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
      setHasUnsavedChanges(true);
    },
    [filteredNodes, setEdges, setHasUnsavedChanges],
  );

  const addNode = (type) => {
    if (!paneMenu) return;
    const position = screenToFlowPosition({
      x: paneMenu.left,
      y: paneMenu.top,
    });
    const newNode = {
      id: `node_${Date.now()}`,
      type: "executionNode",
      position,
      data: {
        title: type === "core" ? "Core Milestone" : "Sub-Branch",
        subtitle: "",
        desc: "",
        deadline: "",
        tasks: [],
        isCompleted: false,
        nodeType: type,
        priorityStatus: "FUTURE",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setHasUnsavedChanges(true);
    addToast(
      `${type === "core" ? "Core Milestone" : "Branch"} deployed.`,
      "grey",
    );
    addLedgerEntry(`Deployed new ${type} node`);
    setPaneMenu(null);
  };

  const deleteNode = () => {
    if (!nodeMenu) return;
    setNodes((nds) => nds.filter((n) => n.id !== nodeMenu.node.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== nodeMenu.node.id && e.target !== nodeMenu.node.id,
      ),
    );
    setHasUnsavedChanges(true);
    addToast("Node obliterated.", "red");
    addLedgerEntry(`Deleted node: ${nodeMenu.node.data.title}`);
    setNodeMenu(null);
  };

  return (
    <div
      className={cn(
        "relative transition-all duration-500 overflow-hidden",
        isMapFullscreen
          ? "fixed inset-0 z-[60] bg-[#030303]"
          : "w-full h-[700px] border-y border-[#111]",
      )}
    >
      <div className="absolute top-6 left-6 z-[70] flex items-center gap-3 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] p-2 rounded-full shadow-2xl">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#666] ml-2 mr-2">
          {isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />{" "}
              Committing...
            </>
          ) : hasUnsavedChanges ? (
            <>
              <CloudOff className="w-3 h-3 text-amber-500" /> Unsaved Draft
            </>
          ) : (
            <>
              <Cloud className="w-3 h-3 text-green-500" /> Synced to Chain
            </>
          )}
        </div>
        <button
          onClick={handleCloudSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="bg-white text-black px-5 py-2 rounded-full font-bold text-xs hover:bg-[#ccc] transition-colors disabled:opacity-50"
        >
          Save to Cloud
        </button>
      </div>

      <div className="absolute top-6 right-6 z-[70] flex gap-2">
        <button
          onClick={() => fitView({ duration: 800, padding: 0.2 })}
          className="w-10 h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
        >
          <Target className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsMapFullscreen(!isMapFullscreen)}
          className="w-10 h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
        >
          {isMapFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>

      <ReactFlow
        nodes={filteredNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setNodeMenu(null);
          setPaneMenu({ top: e.clientY, left: e.clientX });
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setPaneMenu(null);
          setNodeMenu({ top: e.clientY, left: e.clientX, node });
        }}
        onNodeClick={(e, node) => {
          e.preventDefault();
          e.stopPropagation();
          setActiveEditNodeId(node.id);
        }}
        onPaneClick={() => {
          setPaneMenu(null);
          setNodeMenu(null);
        }}
        fitView
        className="bg-[#030303]"
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222" gap={24} size={2} />
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-none shadow-2xl [&_.react-flow__controls-button]:bg-[#0a0a0a] [&_.react-flow__controls-button]:border-[#222] [&_.react-flow__controls-button]:fill-[#888] hover:[&_.react-flow__controls-button]:fill-white hover:[&_.react-flow__controls-button]:bg-[#222] [&_.react-flow__controls-button]:transition-colors overflow-hidden rounded-xl border border-[#222] z-30"
        />
      </ReactFlow>

      <AnimatePresence>
        {paneMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: paneMenu.top, left: paneMenu.left }}
            className="fixed z-[100] bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[220px]"
          >
            <button
              onClick={() => addNode("core")}
              className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-[#111] flex items-center gap-3 border-b border-[#111]"
            >
              <Target className="w-4 h-4 text-[#888]" /> Deploy Core Milestone
            </button>
            <button
              onClick={() => addNode("branch")}
              className="w-full px-4 py-3 text-left text-sm font-bold text-white hover:bg-[#111] flex items-center gap-3"
            >
              <GitBranch className="w-4 h-4 text-[#888]" /> Deploy Sub-Branch
            </button>
          </motion.div>
        )}
        {nodeMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: nodeMenu.top, left: nodeMenu.left }}
            className="fixed z-[100] bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[200px]"
          >
            <button
              onClick={deleteNode}
              className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-[#111] flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" /> Delete Milestone
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// 3. MAIN ROADMAP COMPONENT
// ============================================================================
const Roadmap = () => {
  const { userData } = useUserData();
  const navigate = useNavigate();

  // --- CORE STATES ---
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [dailyStats, setDailyStats] = useState({});

  const [viewMode, setViewMode] = useState("timeline");
  const [timeframe, setTimeframe] = useState("Macro Vision");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [activeEditNodeId, setActiveEditNodeId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // --- SUBSCRIPTION STATE ---
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  // --- TELEMETRY & TOASTS ---
  const [systemLedger, setSystemLedger] = useState([]);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const addLedgerEntry = useCallback((action) => {
    const entry = { id: Date.now(), action, time: new Date().toISOString() };
    setSystemLedger((prev) => {
      const updated = [entry, ...prev].filter(
        (e) => Date.now() - new Date(e.time).getTime() < 86400000,
      );
      localStorage.setItem("discotive_ledger", JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("discotive_ledger");
    if (saved) {
      const parsed = JSON.parse(saved);
      setSystemLedger(
        parsed.filter(
          (e) => Date.now() - new Date(e.time).getTime() < 86400000,
        ),
      );
    }
  }, []);

  // --- FIREBASE FETCH (ROADMAP + SUBSCRIPTION) ---
  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.id) return;
      try {
        // 1. Fetch Roadmap
        const docRef = doc(
          db,
          "users",
          userData.id,
          "execution_map",
          "current",
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const rm = docSnap.data();
          setNodes(rm.nodes || []);
          setEdges(rm.edges || []);
          setDailyStats(rm.dailyStats || {});
        } else {
          setNodes([
            {
              id: "init_1",
              type: "executionNode",
              position: { x: 250, y: 250 },
              data: {
                title: "Phase 1 Initialization",
                desc: "First deployment.",
                tasks: [],
                isCompleted: false,
                nodeType: "core",
              },
            },
          ]);
        }

        // 2. Fetch Subscription
        const subRef = doc(db, "users", userData.id, "subscription", "current");
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          setSubscriptionTier(subSnap.data().tier || "free");
        } else {
          // Auto-initialize free tier for new users
          await setDoc(subRef, {
            tier: "free",
            status: "active",
            createdAt: new Date().toISOString(),
          });
          setSubscriptionTier("free");
        }
      } catch (e) {
        console.error("Failed to load databank.", e);
      }
    };
    fetchData();
  }, [userData?.id]);

  // --- FIREBASE SAVE (ROADMAP) ---
  const handleCloudSave = useCallback(async () => {
    if (!hasUnsavedChanges || !userData?.id) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "users", userData.id, "execution_map", "current"),
        {
          nodes,
          edges,
          dailyStats,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true },
      );
      setHasUnsavedChanges(false);
      addToast("Successfully synced to chain.", "green");
    } catch (e) {
      console.error("Failed to save to chain", e);
      addToast("Sync failed.", "red");
    } finally {
      setIsSaving(false);
    }
  }, [hasUnsavedChanges, userData?.id, nodes, edges, dailyStats, addToast]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => handleCloudSave(), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, handleCloudSave]);

  // --- TASK AUTO-MIGRATION ALGORITHM (Overdue handling) ---
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let mutationsOccurred = false;
    const updatedNodes = JSON.parse(JSON.stringify(nodes));

    updatedNodes.forEach((node) => {
      if (
        !node.data.deadline ||
        node.data.isCompleted ||
        node.data.tasksMigrated
      )
        return;

      const dDate = new Date(node.data.deadline);
      dDate.setHours(0, 0, 0, 0);

      if (dDate < today) {
        const incompleteTasks = (node.data.tasks || []).filter(
          (t) => !t.completed,
        );

        if (incompleteTasks.length > 0) {
          let nextCore = null;
          const visited = new Set();
          const queue = [node.id];

          while (queue.length > 0 && !nextCore) {
            const currId = queue.shift();
            visited.add(currId);
            const outgoingEdges = edges.filter((e) => e.source === currId);

            for (const edge of outgoingEdges) {
              const targetNode = updatedNodes.find((x) => x.id === edge.target);
              if (targetNode) {
                if (
                  targetNode.data.nodeType === "core" &&
                  targetNode.id !== node.id
                ) {
                  nextCore = targetNode;
                  break;
                }
                if (!visited.has(targetNode.id)) queue.push(targetNode.id);
              }
            }
          }

          if (!nextCore) {
            nextCore = updatedNodes.find(
              (x) =>
                x.id !== node.id &&
                x.data.nodeType === "core" &&
                x.data.deadline &&
                new Date(x.data.deadline) >= today,
            );
          }

          if (nextCore) {
            const clonedTasks = incompleteTasks.map((t) => ({
              ...t,
              id: Date.now() + Math.random(),
            }));
            nextCore.data.tasks = [
              ...(nextCore.data.tasks || []),
              ...clonedTasks,
            ];
            node.data.tasks = (node.data.tasks || []).filter(
              (t) => t.completed,
            );

            addToast(
              `Tasks migrated from ${node.data.title} to ${nextCore.data.title}`,
              "grey",
            );
            addLedgerEntry(
              `Auto-migrated overdue tasks to ${nextCore.data.title}`,
            );
          }
        }

        node.data.tasksMigrated = true;
        mutationsOccurred = true;
      }
    });

    if (mutationsOccurred) {
      setNodes(updatedNodes);
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges, addToast, addLedgerEntry]);

  // --- GLOBAL NOTIFICATIONS ENGINE ---
  useEffect(() => {
    const checkDeadlines = () => {
      const storedNots = JSON.parse(
        localStorage.getItem("discotive_notifications") || "[]",
      );
      let newNots = [...storedNots];
      let added = false;
      const today = new Date();

      nodes.forEach((n) => {
        if (!n.data.deadline || n.data.isCompleted) return;
        const dDate = new Date(n.data.deadline);
        const diffHours = (dDate - today) / (1000 * 60 * 60);

        const checkAndAdd = (idSuffix, msg) => {
          const notifId = `dl_${n.id}_${idSuffix}`;
          if (!newNots.find((x) => x.id === notifId)) {
            newNots.push({
              id: notifId,
              msg,
              date: new Date().toISOString(),
              read: false,
              link: "/app/roadmap",
            });
            added = true;
          }
        };

        if (diffHours > 0 && diffHours <= 24)
          checkAndAdd("24h", `Deadline Approaching (24h): ${n.data.title}`);
        else if (diffHours > 0 && diffHours <= 24 * 7)
          checkAndAdd("7d", `Deadline Approaching (7 days): ${n.data.title}`);
      });

      newNots = newNots.filter(
        (n) => new Date() - new Date(n.date) < 7 * 24 * 60 * 60 * 1000,
      );
      if (added)
        localStorage.setItem(
          "discotive_notifications",
          JSON.stringify(newNots),
        );
    };
    checkDeadlines();
  }, [nodes]);

  // --- ALGORITHMIC PRIORITY CALCULATOR ---
  const nodesWithPriority = useMemo(() => {
    const statusMap = {};
    const updatedNodes = nodes.map((n) => {
      const tasks = n.data.tasks || [];
      const prog =
        tasks.length > 0
          ? Math.round(
              (tasks.filter((t) => t.completed).length / tasks.length) * 100,
            )
          : n.data.isCompleted
            ? 100
            : 0;
      if (prog === 100) statusMap[n.id] = "COMPLETED";
      return {
        ...n,
        data: { ...n.data, progress: prog, isCompleted: prog === 100 },
      };
    });

    const readyNodes = updatedNodes.filter((n) => {
      if (statusMap[n.id] === "COMPLETED") return false;
      const incoming = edges.filter((e) => e.target === n.id);
      return incoming.every((e) => statusMap[e.source] === "COMPLETED");
    });
    readyNodes.forEach((n) => (statusMap[n.id] = "READY"));

    edges.forEach((e) => {
      if (statusMap[e.source] === "READY" && !statusMap[e.target])
        statusMap[e.target] = "NEXT";
    });
    updatedNodes.forEach((n) => {
      if (!statusMap[n.id]) statusMap[n.id] = "FUTURE";
    });

    return updatedNodes.map((n) => ({
      ...n,
      data: { ...n.data, priorityStatus: statusMap[n.id] },
    }));
  }, [nodes, edges]);

  // --- TIMEFRAME FILTER ---
  const filteredNodes = useMemo(() => {
    if (timeframe === "Macro Vision") return nodesWithPriority;
    const days =
      timeframe === "1 Month Sprint"
        ? 30
        : timeframe === "3 Months Trajectory"
          ? 90
          : 365;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return nodesWithPriority.filter((n) => {
      if (!n.data.deadline) return true;
      return new Date(n.data.deadline) <= cutoff;
    });
  }, [nodesWithPriority, timeframe]);

  const handleAutoAdjustFilter = (dateStr) => {
    if (!dateStr || timeframe === "Macro Vision") return;
    const dDate = new Date(dateStr);
    const today = new Date();
    const diffDays = (dDate - today) / (1000 * 60 * 60 * 24);

    if (timeframe === "1 Month Sprint" && diffDays > 30) {
      setTimeframe(
        diffDays <= 90
          ? "3 Months Trajectory"
          : diffDays <= 365
            ? "12 Months Arc"
            : "Macro Vision",
      );
      addToast("Filter auto-adjusted to fit deadline.", "grey");
    } else if (timeframe === "3 Months Trajectory" && diffDays > 90) {
      setTimeframe(diffDays <= 365 ? "12 Months Arc" : "Macro Vision");
      addToast("Filter auto-adjusted to fit deadline.", "grey");
    } else if (timeframe === "12 Months Arc" && diffDays > 365) {
      setTimeframe("Macro Vision");
      addToast("Filter auto-adjusted to fit deadline.", "grey");
    }
  };

  // --- NODE EDITOR HANDLERS ---
  const activeNode = nodesWithPriority.find((n) => n.id === activeEditNodeId);

  const updateActiveNode = (key, value) => {
    if (key === "deadline") handleAutoAdjustFilter(value);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === activeEditNodeId
          ? { ...n, data: { ...n.data, [key]: value } }
          : n,
      ),
    );
    setHasUnsavedChanges(true);
  };

  const handleSubtaskToggle = (taskId) => {
    const tasks = activeNode.data.tasks || [];
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    updateActiveNode("tasks", updatedTasks);

    const wasCompleted = !tasks.find((t) => t.id === taskId).completed;
    if (wasCompleted) {
      addToast("Task sequence executed.", "grey");
      logDailyStat(activeNode.data.nodeType);
      addLedgerEntry(`Executed sub-task in: ${activeNode.data.title}`);
    }
  };

  const handleCompleteAll = () => {
    if (window.confirm("Mark node and all tasks as completed?")) {
      const tasks = (activeNode.data.tasks || []).map((t) => ({
        ...t,
        completed: true,
      }));
      setNodes((nds) =>
        nds.map((n) =>
          n.id === activeEditNodeId
            ? { ...n, data: { ...n.data, tasks, isCompleted: true } }
            : n,
        ),
      );
      setHasUnsavedChanges(true);
      logDailyStat(activeNode.data.nodeType);
      addToast(`Milestone Secured: ${activeNode.data.title}`, "green");
      addLedgerEntry(`Completed Milestone: ${activeNode.data.title}`);
    }
  };

  const logDailyStat = (nodeType) => {
    const todayStr = new Date().toISOString().split("T")[0];
    setDailyStats((prev) => {
      const current = prev[todayStr] || {
        count: 0,
        hasCore: false,
        hasBranch: false,
      };
      return {
        ...prev,
        [todayStr]: {
          count: current.count + 1,
          hasCore: current.hasCore || nodeType === "core",
          hasBranch: current.hasBranch || nodeType === "branch",
        },
      };
    });
    setHasUnsavedChanges(true);
  };

  // --- CALENDAR VIEW ---
  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
    );
    const firstDay = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      1,
    ).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth(),
        i + 1,
      );
      const dayNodes = filteredNodes.filter(
        (n) => n.data.deadline && isSameDay(new Date(n.data.deadline), d),
      );
      return { date: d, day: i + 1, nodes: dayNodes };
    });

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div className="w-full border-y border-[#111] h-[700px] overflow-y-auto custom-scrollbar p-6 md:p-12 bg-[#050505]">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-extrabold text-white">
              {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() - 1,
                      1,
                    ),
                  )
                }
                className="p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCalendarDate(
                    new Date(
                      calendarDate.getFullYear(),
                      calendarDate.getMonth() + 1,
                      1,
                    ),
                  )
                }
                className="p-2 bg-[#111] border border-[#333] rounded-lg text-white hover:bg-[#222] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] md:text-xs font-bold text-[#666] uppercase pb-4"
              >
                {d}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="h-24 md:h-32 rounded-2xl bg-transparent"
              />
            ))}

            {days.map(({ day, date, nodes }) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={day}
                  className={cn(
                    "h-24 md:h-32 rounded-2xl p-2 md:p-4 border flex flex-col transition-colors overflow-hidden",
                    isToday
                      ? "bg-white/5 border-white/20"
                      : "bg-[#0a0a0a] border-[#111]",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs md:text-sm font-bold font-mono mb-2",
                      isToday ? "text-white" : "text-[#666]",
                    )}
                  >
                    {day}
                  </span>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                    {nodes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => setActiveEditNodeId(n.id)}
                        className={cn(
                          "text-[8px] md:text-[10px] font-bold px-2 py-1 rounded cursor-pointer truncate",
                          n.data.nodeType === "core"
                            ? "bg-white text-black"
                            : "bg-[#222] text-[#ccc] hover:bg-[#333]",
                        )}
                      >
                        {n.data.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // --- DRAGGABLE INSIGHTS CHART ---
  const InsightsChart = () => {
    const chartRef = useRef(null);
    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDown = true;
      startX = e.pageX - chartRef.current.offsetLeft;
      scrollLeft = chartRef.current.scrollLeft;
    };
    const handleMouseLeave = () => {
      isDown = false;
    };
    const handleMouseUp = () => {
      isDown = false;
    };
    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - chartRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      chartRef.current.scrollLeft = scrollLeft - walk;
    };

    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toISOString().split("T")[0];
      return {
        date: d,
        ds,
        stat: dailyStats[ds] || { count: 0, hasCore: false, hasBranch: false },
      };
    });

    return (
      <div
        ref={chartRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex items-end gap-1.5 h-full w-full mt-auto overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing pb-2"
      >
        {days.map(({ date, ds, stat }, i) => {
          const isToday = isSameDay(date, new Date());
          let bgColor = "bg-[#222]";
          if (stat.count > 0)
            bgColor = stat.hasCore ? "bg-green-500" : "bg-[#114020]";
          if (stat.count > 0 && !stat.hasCore && !stat.hasBranch)
            bgColor = "bg-white";

          return (
            <div
              key={i}
              className="relative group flex-1 min-w-[12px] flex flex-col justify-end items-center h-full"
            >
              <div
                className={cn("w-full rounded-sm transition-all", bgColor)}
                style={{
                  height: `${Math.max(5, Math.min(100, stat.count * 20))}%`,
                }}
              />
              {isToday && (
                <div className="w-full h-1 bg-white mt-1 rounded-full shrink-0" />
              )}

              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-black text-white text-[10px] font-bold px-2 py-1 rounded pointer-events-none whitespace-nowrap z-50">
                {stat.count} tasks •{" "}
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- CLOCK & JOURNAL LOGIC ---
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isJournalFullscreen, setIsJournalFullscreen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [journalCalDate, setJournalCalDate] = useState(new Date());
  const [selectedJournalDate, setSelectedJournalDate] = useState(new Date());
  const JOURNAL_LIMIT = 1000;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
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

  const handleSaveJournal = async () => {
    const uid = userData?.id;
    if (!journalText.trim() || !uid) return;
    try {
      await addDoc(collection(db, "users", uid, "journal_entries"), {
        timestamp: new Date().toISOString(),
        content: journalText,
      });
      setJournalText("");
      addToast("Journal entry secured to databank.", "green");
      addLedgerEntry("Logged execution journal entry");
    } catch (e) {
      console.error(e);
      addToast("Failed to secure journal entry.", "red");
    }
  };

  const generateMiniCalendar = () => {
    const daysInMonth = getDaysInMonth(
      journalCalDate.getFullYear(),
      journalCalDate.getMonth(),
    );
    const firstDay = new Date(
      journalCalDate.getFullYear(),
      journalCalDate.getMonth(),
      1,
    ).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-white">
            {monthNames[journalCalDate.getMonth()]}{" "}
            {journalCalDate.getFullYear()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setJournalCalDate(
                  new Date(
                    journalCalDate.getFullYear(),
                    journalCalDate.getMonth() - 1,
                    1,
                  ),
                )
              }
              className="p-1 hover:bg-[#222] rounded transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() =>
                setJournalCalDate(
                  new Date(
                    journalCalDate.getFullYear(),
                    journalCalDate.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="p-1 hover:bg-[#222] rounded transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div
              key={Math.random()}
              className="text-[9px] text-[#666] font-bold text-center mb-2"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map((day) => {
            const d = new Date(
              journalCalDate.getFullYear(),
              journalCalDate.getMonth(),
              day,
            );
            const isToday = isSameDay(d, new Date());
            const isSelected = isSameDay(d, selectedJournalDate);

            let dayClass = "text-[#444] hover:bg-[#222] hover:text-white";
            if (isSelected) {
              dayClass = "bg-white text-black font-extrabold";
            } else if (isToday) {
              dayClass = "border border-white text-white font-bold";
            }

            return (
              <div
                key={day}
                onClick={() => setSelectedJournalDate(d)}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-full text-xs font-mono relative transition-colors cursor-pointer",
                  dayClass,
                )}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-20">
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-20">
        <div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none">
            Execution Plan.
          </h1>
          <p className="text-lg md:text-xl text-[#888] font-medium tracking-tight">
            The algorithmic blueprint of your monopoly.
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

      {/* VIEW ENGINE */}
      <div className="relative">
        {viewMode === "timeline" ? (
          <ReactFlowProvider>
            <FlowCanvas
              filteredNodes={filteredNodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              hasUnsavedChanges={hasUnsavedChanges}
              setHasUnsavedChanges={setHasUnsavedChanges}
              isSaving={isSaving}
              handleCloudSave={handleCloudSave}
              isMapFullscreen={isMapFullscreen}
              setIsMapFullscreen={setIsMapFullscreen}
              setActiveEditNodeId={setActiveEditNodeId}
              addToast={addToast}
              addLedgerEntry={addLedgerEntry}
            />
          </ReactFlowProvider>
        ) : (
          renderCalendarView()
        )}

        {/* PARAMETER DRAWER */}
        <AnimatePresence>
          {activeEditNodeId && activeNode && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveEditNodeId(null)}
                className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-0 right-0 h-full w-full sm:w-[450px] bg-[#0a0a0a] border-l border-[#222] shadow-[auto_0_100px_rgba(0,0,0,0.9)] z-[110] flex flex-col"
              >
                <div className="flex justify-between items-center p-6 border-b border-[#222] shrink-0 bg-[#050505]">
                  <div className="flex items-center gap-3">
                    <Settings2 className="w-5 h-5 text-[#888]" />
                    <h2 className="text-sm font-extrabold tracking-widest uppercase text-white">
                      Node Parameters
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveEditNodeId(null)}
                    className="p-2 bg-[#111] rounded-full text-[#666] hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3">
                      Milestone Designation
                    </label>
                    <input
                      type="text"
                      value={activeNode.data.title || ""}
                      onChange={(e) =>
                        updateActiveNode("title", e.target.value)
                      }
                      placeholder="e.g. Boot OS Foundation"
                      className="w-full bg-transparent text-2xl font-extrabold text-white placeholder-[#333] border-b border-[#222] focus:border-white focus:outline-none pb-2 mb-4 transition-colors"
                    />

                    <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 mt-4 flex items-center gap-2">
                      <Type className="w-3 h-3" /> Sub-Classification
                    </label>
                    <input
                      type="text"
                      value={activeNode.data.subtitle || ""}
                      onChange={(e) =>
                        updateActiveNode("subtitle", e.target.value)
                      }
                      placeholder="e.g. Phase 1, UI/UX, Backend..."
                      className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <AlignLeft className="w-3 h-3" /> Execution Notes
                    </label>
                    <textarea
                      value={activeNode.data.desc || ""}
                      onChange={(e) => updateActiveNode("desc", e.target.value)}
                      placeholder="Define execution parameters and tactical approach..."
                      rows="4"
                      className="w-full bg-[#111] border border-[#222] rounded-xl p-4 text-sm text-white placeholder-[#444] focus:border-[#555] focus:outline-none resize-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#666] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> Target Deadline
                    </label>
                    <input
                      type="date"
                      value={activeNode.data.deadline || ""}
                      onChange={(e) =>
                        updateActiveNode("deadline", e.target.value)
                      }
                      className="w-full bg-[#111] border border-[#222] rounded-xl px-4 py-3 text-sm text-white focus:border-[#555] focus:outline-none transition-colors [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50 hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 border-t border-[#222]">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-[10px] font-bold text-[#666] uppercase tracking-widest flex items-center gap-2">
                        Completion Status
                      </label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white bg-[#111] px-3 py-1.5 rounded-lg border border-[#333]">
                          {activeNode.data.progress || 0}%
                        </span>
                        <button
                          onClick={handleCompleteAll}
                          disabled={activeNode.data.isCompleted}
                          className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center hover:bg-green-500/30 transition-colors disabled:opacity-30"
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      {(activeNode.data.tasks || []).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 bg-[#111] border border-[#222] p-3 rounded-xl group"
                        >
                          <button
                            onClick={() => handleSubtaskToggle(task.id)}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors",
                              task.completed
                                ? "bg-white border-white text-black"
                                : "bg-[#222] border-[#444] hover:border-white",
                            )}
                          >
                            {task.completed && <Check className="w-3 h-3" />}
                          </button>
                          <input
                            type="text"
                            value={task.text}
                            onChange={(e) => {
                              const ut = activeNode.data.tasks.map((t) =>
                                t.id === task.id
                                  ? { ...t, text: e.target.value }
                                  : t,
                              );
                              updateActiveNode("tasks", ut);
                            }}
                            className={cn(
                              "flex-1 bg-transparent border-none outline-none text-sm transition-colors",
                              task.completed
                                ? "text-[#666] line-through"
                                : "text-white",
                            )}
                          />
                          <button
                            onClick={() => {
                              const ut = activeNode.data.tasks.filter(
                                (t) => t.id !== task.id,
                              );
                              updateActiveNode("tasks", ut);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[#666] hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        const newTask = {
                          id: Date.now(),
                          text: "",
                          completed: false,
                        };
                        updateActiveNode("tasks", [
                          ...(activeNode.data.tasks || []),
                          newTask,
                        ]);
                      }}
                      className="w-full py-3 border border-dashed border-[#333] rounded-xl text-[#666] text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Execution Task
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* DATE/TIME/JOURNAL BAR */}
      <div className="bg-[#050505] border-b border-[#222] py-5 shadow-lg relative z-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm font-bold text-[#888] tracking-tight">
            <CalendarIcon className="w-4 h-4" /> {formattedDate}
          </div>

          <button
            onClick={() =>
              subscriptionTier === "free"
                ? setIsProModalOpen(true)
                : setIsJournalOpen(true)
            }
            className={cn(
              "flex-1 max-w-lg w-full transition-all rounded-full py-3 px-6 flex items-center justify-center gap-3 group border",
              subscriptionTier === "free"
                ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-500"
                : "bg-[#111] border-[#333] hover:border-white text-[#ccc] hover:text-white",
            )}
          >
            {subscriptionTier === "free" ? (
              <>
                <Lock className="w-4 h-4" />
                <span className="text-sm font-bold">
                  Open Execution Journal
                </span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-[#888] group-hover:text-white transition-colors" />
                <span className="text-sm font-bold text-[#ccc] group-hover:text-white transition-colors">
                  Open Execution Journal
                </span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-sm font-mono text-white tracking-widest">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* PROGRESS INSIGHTS (TELEMETRY) */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-20 relative z-20">
        <div className="mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Progress Insights.
          </h2>
          <p className="text-[#888] font-medium">
            Tracking verified execution data.
          </p>
        </div>

        {/* RESTRICTED HEIGHT GRID TO PREVENT STRETCHING BUG */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-auto lg:h-[400px]">
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 md:p-12 hover:border-[#333] transition-colors flex flex-col h-full">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                  Milestones Completed
                </p>
                <p className="text-5xl font-extrabold text-white tracking-tighter">
                  {nodes.filter((n) => Number(n.data.progress) === 100).length}
                </p>
                <p className="text-[#888] mt-2">
                  Roadmap completions (All Time)
                </p>
              </div>
              <Activity className="w-8 h-8 text-[#444]" />
            </div>
            <div className="flex-1 min-h-[100px]">
              <InsightsChart />
            </div>
          </div>

          <div className="flex flex-col gap-8 h-full">
            <div className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 flex flex-col justify-center hover:border-[#333] transition-colors min-h-0">
              <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Profile Reach
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white">
                  0
                </span>
                <span className="text-[#888] font-medium">views</span>
              </div>
              <p className="text-[#666] text-sm mt-2">
                Public visibility over 7 days.
              </p>
            </div>

            <div className="flex-1 bg-white text-black rounded-[2rem] p-8 flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer min-h-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em]">
                  Current Focus
                </p>
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight mb-1 truncate">
                  {nodesWithPriority.find(
                    (n) => n.data.priorityStatus === "READY",
                  )?.data.title || "Awaiting Assignment"}
                </h3>
                <p className="text-xs font-bold opacity-70 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Deploy node to start
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 flex flex-col h-full overflow-hidden hover:border-[#333] transition-colors">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <p className="text-xs font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
                <List className="w-4 h-4" /> System Ledger
              </p>
              <span className="text-[9px] font-mono text-[#444] uppercase">
                24H Cache
              </span>
            </div>
            {/* Scrollable Ledger Box */}
            <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {systemLedger.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Hash className="w-8 h-8 text-[#444] mb-3" />
                  <p className="text-xs font-bold text-[#888]">
                    No activity logged yet.
                  </p>
                </div>
              ) : (
                systemLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-[#333] pl-3 py-1 shrink-0"
                  >
                    <p className="text-xs font-bold text-[#ccc] truncate">
                      {entry.action}
                    </p>
                    <p className="text-[9px] font-mono text-[#666]">
                      {new Date(entry.time).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM (Bottom Left Pop-ups) */}
      <div className="fixed bottom-6 left-6 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-xs font-bold tracking-wide pointer-events-auto",
                t.type === "green"
                  ? "bg-[#052e16] border-green-500/30 text-green-400"
                  : t.type === "red"
                    ? "bg-[#450a0a] border-red-500/30 text-red-400"
                    : "bg-[#111] border-[#333] text-white",
              )}
            >
              {t.type === "green" && <CheckCircle2 className="w-4 h-4" />}
              {t.type === "red" && <AlertOctagon className="w-4 h-4" />}
              {t.type === "grey" && (
                <Activity className="w-4 h-4 text-[#888]" />
              )}
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* PRO UPGRADE MODAL */}
      <AnimatePresence>
        {isProModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-8 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2">
                Protocol Locked
              </h3>
              <p className="text-[#888] text-sm mb-8 leading-relaxed">
                The Execution Journal and historical ledger are Discotive Pro
                features. Do you wish to upgrade your clearance?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="flex-1 py-3 bg-[#111] border border-[#333] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate("/premium")}
                  className="flex-1 py-3 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors"
                >
                  Upgrade to Pro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EXECUTION JOURNAL MODAL */}
      <AnimatePresence>
        {isJournalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsJournalOpen(false)}
              className="absolute inset-0 bg-[#000]/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative bg-[#0a0a0a] border border-[#222] shadow-2xl flex flex-col transition-all duration-300",
                isJournalFullscreen
                  ? "w-full h-full rounded-none"
                  : "w-full max-w-6xl h-[80vh] rounded-[2rem]",
              )}
            >
              <div className="flex justify-between items-center p-6 md:p-8 border-b border-[#222] shrink-0">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                    Execution Journal.
                  </h2>
                  <p className="text-[#666] font-mono text-xs">
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsJournalFullscreen(!isJournalFullscreen)}
                    className="p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    {isJournalFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsJournalOpen(false)}
                    className="p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#222] p-6 overflow-y-auto custom-scrollbar bg-[#050505] flex flex-col">
                  <div className="mb-8">
                    <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> Tracker
                    </p>
                    <div className="bg-[#111] border border-[#222] rounded-xl p-4">
                      {generateMiniCalendar()}
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Archive
                  </p>
                  <div className="space-y-4 flex-1">
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                      <p className="text-xs font-bold text-[#666]">
                        No previous entries.
                      </p>
                    </div>
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
                    maxLength={JOURNAL_LIMIT}
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Document the reality of today's execution..."
                    className="flex-1 w-full bg-transparent text-lg md:text-xl font-medium text-white placeholder-[#444] focus:outline-none resize-none leading-relaxed custom-scrollbar"
                  />
                  <div className="flex items-center justify-between pt-6 border-t border-[#222] mt-auto shrink-0">
                    <p
                      className={cn(
                        "text-xs font-mono font-bold",
                        journalText.length >= JOURNAL_LIMIT
                          ? "text-red-500"
                          : "text-[#666]",
                      )}
                    >
                      {journalText.length} / {JOURNAL_LIMIT}
                    </p>
                    <button
                      onClick={handleSaveJournal}
                      className="px-8 py-3.5 font-extrabold text-black bg-white hover:bg-[#ccc] rounded-full transition-colors text-sm"
                    >
                      Save Entry
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
