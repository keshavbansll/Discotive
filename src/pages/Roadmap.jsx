import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import "reactflow/dist/style.css";
import {
  Calendar as CalendarIcon,
  Wand2,
  ChevronRight as ChevronRightIcon,
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
  Lock,
  Download,
  Image as ImageIcon,
  FileText,
  Edit2,
  Minus,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../components/ui/BentoCard";
import { db, auth } from "../firebase";
import AILoader from "../components/AILoader";
import {
  generateCalibrationQuestions,
  generateExecutionMap,
} from "../lib/gemini";

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
// 1. CUSTOM EXECUTION NODE (Deep Dark Glassmorphism)
// ============================================================================
const ExecutionNode = ({ data, selected }) => {
  // Map actual database priority logic to 4 distinct visual states
  const isActive = data.priorityStatus === "READY" && !data.isCompleted;
  const isNext = data.priorityStatus === "NEXT" && !data.isCompleted;
  const isFuture = data.priorityStatus === "FUTURE" && !data.isCompleted;
  const isCompleted = data.isCompleted;

  return (
    <div
      className={cn(
        "w-[320px] bg-[#0a0a0a]/90 backdrop-blur-xl rounded-[24px] p-6 relative overflow-hidden transition-all duration-500",
        // Golden highlight for active node
        isActive &&
          "border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]",
        // Silver highlight for immediate next nodes
        isNext &&
          "border border-slate-300/30 shadow-[0_0_30px_rgba(203,213,225,0.1)]",
        // Faded grey for distant future nodes
        (isCompleted || isFuture) && "border border-white/5",
        isFuture && "opacity-50 grayscale",

        selected && "border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.1)]",
      )}
    >
      {/* Top Glowing Accent Lines */}
      {isActive && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_15px_rgba(245,158,11,1)]" />
      )}
      {isNext && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent shadow-[0_0_15px_rgba(203,213,225,0.8)]" />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-[#222] border-2 border-[#444]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="w-3 h-3 bg-[#222] border-2 border-[#444]"
      />

      <div className="flex justify-between items-start mb-4 pointer-events-none">
        <div>
          <p className="text-[10px] font-mono text-[#666] uppercase tracking-widest mb-1">
            {data.deadline
              ? new Date(data.deadline).toLocaleDateString()
              : "TBD"}
          </p>
          <h3
            className={cn(
              "text-lg font-extrabold tracking-tight",
              isActive
                ? "text-amber-500"
                : isNext
                  ? "text-slate-200"
                  : "text-white",
            )}
          >
            {data.title || "Untitled Milestone"}
          </h3>
          {data.subtitle && (
            <p className="text-[10px] font-bold text-[#666] uppercase tracking-widest mt-1">
              {data.subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            "p-2 rounded-xl shrink-0",
            isActive
              ? "bg-amber-500/10 text-amber-500"
              : isNext
                ? "bg-slate-300/10 text-slate-300"
                : isCompleted
                  ? "bg-green-500/10 text-green-500"
                  : "bg-[#111] text-[#555]",
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isActive || isNext ? (
            <Activity className={cn("w-5 h-5", isActive && "animate-pulse")} />
          ) : (
            <Lock className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2 mt-4">
        {(data.tasks || []).map((task, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 p-2.5 bg-[#111] border border-[#222] rounded-xl hover:border-[#333] transition-colors"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                  task.completed
                    ? "bg-green-500/20 border-green-500/50 text-green-500"
                    : "bg-[#050505] border-[#444]",
                )}
              >
                {task.completed && <Check className="w-3 h-3" />}
              </div>
              <p
                className={cn(
                  "text-xs font-medium leading-relaxed",
                  task.completed ? "text-[#666] line-through" : "text-[#ccc]",
                )}
              >
                {task.text || task.title}
              </p>
            </div>
            {/* Rollover Badge */}
            {task.isRollover && !task.completed && (
              <span className="ml-7 text-[8px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded w-max">
                Rolled Over
              </span>
            )}
          </div>
        ))}
        {(!data.tasks || data.tasks.length === 0) && (
          <p className="text-xs text-[#555] font-mono italic">
            No tasks defined.
          </p>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-[#222] border-2 border-[#444]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="w-3 h-3 bg-[#222] border-2 border-[#444]"
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
  subscriptionTier,
  totalNodesCount,
  onLimitReached,
  isFirstTime, // <--- ADD THIS
  handleStartCalibration, // <--- ADD THIS
}) => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  // --- MENUS & STATES ---
  const [paneMenu, setPaneMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const downloadRef = useRef(null);

  // --- MOBILE RESPONSIVE STATES ---
  const [isMobileEditMode, setIsMobileEditMode] = useState(false);
  const [selectedMobileElement, setSelectedMobileElement] = useState(null); // { type: 'node' | 'edge', id }

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadRef.current && !downloadRef.current.contains(event.target)) {
        setIsDownloadOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // --- NODE DEPLOYMENT LOGIC ---
  const addNode = (type, mobilePos = null) => {
    if (!paneMenu && !mobilePos) return;
    if (subscriptionTier === "free" && totalNodesCount >= 10) {
      onLimitReached();
      setPaneMenu(null);
      return;
    }

    // Support for both desktop right-click position and mobile center-screen position
    const position =
      mobilePos || screenToFlowPosition({ x: paneMenu.left, y: paneMenu.top });

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

  const deleteNode = (overrideId = null) => {
    const targetId = overrideId || nodeMenu?.node?.id;
    if (!targetId) return;
    setNodes((nds) => nds.filter((n) => n.id !== targetId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== targetId && e.target !== targetId),
    );
    setHasUnsavedChanges(true);
    addToast("Node obliterated.", "red");
    setNodeMenu(null);
    setSelectedMobileElement(null);
  };

  const deleteEdge = (overrideId = null) => {
    const targetId = overrideId || edgeMenu?.edge?.id;
    if (!targetId) return;
    setEdges((eds) => eds.filter((e) => e.id !== targetId));
    setHasUnsavedChanges(true);
    addToast("Connection severed.", "grey");
    setEdgeMenu(null);
    setSelectedMobileElement(null);
  };

  // --- DOWNLOAD ENGINE (PNG/PDF) ---
  const handleDownload = async (format) => {
    setIsDownloadOpen(false);
    addToast("Processing export...", "grey");

    // 1. Re-center and fit map
    fitView({ duration: 800, padding: 0.2 });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for animation

    const flowElement = document.querySelector(".react-flow");
    if (!flowElement) return;

    try {
      // 2. Inject temporary Watermark
      const watermark = document.createElement("img");
      watermark.src = "/logox.png";
      watermark.id = "discotive-export-watermark";
      watermark.style.cssText =
        "position: absolute; bottom: 20px; right: 20px; width: 60px; height: 60px; object-fit: contain; opacity: 0.7; z-index: 9999;";
      flowElement.appendChild(watermark);

      // Hide UI controls temporarily
      const controls = document.querySelectorAll(
        ".react-flow__controls, .absolute.z-\\[70\\]",
      );
      controls.forEach((el) => (el.style.display = "none"));

      // 3. Generate Image
      const dataUrl = await toPng(flowElement, {
        backgroundColor: "#030303",
        quality: 1,
        pixelRatio: 2, // High Res
      });

      // Restore UI & Remove Watermark
      controls.forEach((el) => (el.style.display = "flex"));
      const wm = document.getElementById("discotive-export-watermark");
      if (wm) wm.remove();

      // 4. Trigger Download based on format
      if (format === "png") {
        const link = document.createElement("a");
        link.download = `Discotive-Execution-Map-${new Date().toISOString().split("T")[0]}.png`;
        link.href = dataUrl;
        link.click();
        addToast("PNG Exported successfully.", "green");
      } else if (format === "pdf") {
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: [flowElement.clientWidth, flowElement.clientHeight],
        });
        pdf.addImage(
          dataUrl,
          "PNG",
          0,
          0,
          flowElement.clientWidth,
          flowElement.clientHeight,
        );
        pdf.save(
          `Discotive-Execution-Map-${new Date().toISOString().split("T")[0]}.pdf`,
        );
        addToast("PDF Exported successfully.", "green");
      }
    } catch (err) {
      console.error(err);
      addToast("Export failed.", "red");
    }
  };

  // --- MOBILE FULLSCREEN ORIENTATION ---
  const toggleFullscreen = async () => {
    const newFsState = !isMapFullscreen;
    setIsMapFullscreen(newFsState);

    // Attempt to lock screen to landscape if going fullscreen on mobile
    if (newFsState && window.innerWidth <= 768) {
      try {
        if (screen.orientation && screen.orientation.lock) {
          await document.documentElement.requestFullscreen();
          await screen.orientation.lock("landscape");
        }
      } catch (err) {
        console.warn("Orientation lock not supported or failed", err);
      }
    } else if (!newFsState) {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        if (screen.orientation && screen.orientation.unlock) {
          screen.orientation.unlock();
        }
      } catch (err) {
        console.warn("Exit fullscreen failed", err);
      }
      setIsMobileEditMode(false);
    }
  };

  const memoizedNodeTypes = useMemo(
    () => ({ executionNode: ExecutionNode }),
    [],
  );

  const mappedNodes = useMemo(() => {
    return filteredNodes.map((n) => ({
      ...n,
      style: {
        ...n.style,
        boxShadow:
          isMobileEditMode && selectedMobileElement?.id === n.id
            ? "0 0 0 2px white"
            : "none",
        borderRadius: "24px",
      },
    }));
  }, [filteredNodes, isMobileEditMode, selectedMobileElement]);

  const mappedEdges = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      style: {
        ...e.style,
        stroke:
          isMobileEditMode && selectedMobileElement?.id === e.id
            ? "white"
            : e.style?.stroke || "#666",
        strokeWidth:
          isMobileEditMode && selectedMobileElement?.id === e.id ? 4 : 2,
      },
    }));
  }, [edges, isMobileEditMode, selectedMobileElement]);

  return (
    <div
      className={cn(
        "relative transition-all duration-500 overflow-hidden",
        isMapFullscreen
          ? "fixed inset-0 z-[60] bg-[#030303]"
          : "w-full h-[350px] md:h-[700px] border-y border-[#111]",
      )}
    >
      {/* DESKTOP / DEFAULT TOP CONTROLS */}
      <div
        className={cn(
          "absolute top-4 left-4 md:top-6 md:left-6 z-[70] flex items-center gap-2 md:gap-3 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] p-1.5 md:p-2 rounded-full shadow-2xl transition-opacity",
          isMapFullscreen && window.innerWidth <= 768
            ? "opacity-0 pointer-events-none"
            : "opacity-100",
        )}
      >
        {/* NEW REGENERATE BUTTON */}
        <button
          onClick={() => {
            // Need to trigger the parent's handleStartCalibration.
            // *Ensure you pass handleStartCalibration down as a prop to FlowCanvas!*
            handleStartCalibration();
          }}
          className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-[#111] border border-[#333] hover:border-amber-500 rounded-full text-[#888] hover:text-amber-500 transition-colors relative group"
        >
          <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
          {subscriptionTier === "free" && !isFirstTime && (
            <Lock className="w-3 h-3 absolute -bottom-1 -right-1 text-red-500 bg-[#0a0a0a] rounded-full" />
          )}
        </button>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#666] ml-2 mr-2">
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
        {/* Mobile Simplified Indicator */}
        <div className="flex md:hidden items-center justify-center w-8 h-8 rounded-full bg-[#111]">
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          ) : hasUnsavedChanges ? (
            <CloudOff className="w-4 h-4 text-amber-500" />
          ) : (
            <Cloud className="w-4 h-4 text-green-500" />
          )}
        </div>
        <button
          onClick={handleCloudSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="bg-white text-black px-3 md:px-5 py-1.5 md:py-2 rounded-full font-bold text-xs hover:bg-[#ccc] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <span className="hidden md:inline">Save to Cloud</span>
          <Cloud className="w-4 h-4 md:hidden" />
        </button>
      </div>

      {/* TOP RIGHT CONTROLS (Target, Download, Fullscreen) */}
      <div
        className={cn(
          "absolute top-4 right-4 md:top-6 md:right-6 z-[70] flex gap-2",
          isMapFullscreen && window.innerWidth <= 768
            ? "opacity-0 pointer-events-none"
            : "opacity-100",
        )}
      >
        <button
          onClick={() => fitView({ duration: 800, padding: 0.2 })}
          className="w-9 h-9 md:w-10 md:h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
        >
          <Target className="w-4 h-4" />
        </button>

        {/* DOWNLOAD DROPDOWN ENGINE */}
        <div className="relative" ref={downloadRef}>
          <button
            onClick={() => setIsDownloadOpen(!isDownloadOpen)}
            className="w-9 h-9 md:w-10 md:h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
          >
            <Download className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isDownloadOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-2 w-40 bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden flex flex-col z-[100]"
              >
                <button
                  onClick={() => handleDownload("png")}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-white hover:bg-[#111] border-b border-[#222]"
                >
                  <ImageIcon className="w-4 h-4 text-[#888]" /> Save as PNG
                </button>
                <button
                  onClick={() => handleDownload("pdf")}
                  className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-white hover:bg-[#111]"
                >
                  <FileText className="w-4 h-4 text-[#888]" /> Save as PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={toggleFullscreen}
          className="w-9 h-9 md:w-10 md:h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-[#222] transition-colors shadow-2xl"
        >
          {isMapFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* MOBILE EDIT CONTROLS (Always visible on mobile) */}
      <div
        className={cn(
          "md:hidden flex flex-col-reverse gap-3 items-end z-[9999]",
          isMapFullscreen
            ? "fixed bottom-8 right-8"
            : "absolute bottom-4 right-4",
        )}
      >
        <button
          onClick={() => {
            setIsMobileEditMode(!isMobileEditMode);
            setSelectedMobileElement(null);
          }}
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-2xl border transition-colors",
            isMobileEditMode
              ? "bg-white text-black border-white"
              : "bg-[#0a0a0a]/90 backdrop-blur-xl text-[#888] border-[#222]",
          )}
        >
          <Edit2 className="w-5 h-5" />
        </button>

        <AnimatePresence>
          {isMobileEditMode && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="flex flex-col gap-3 mb-2"
            >
              <button
                onClick={() => {
                  fitView();
                  setTimeout(() => addNode("core", { x: 250, y: 250 }), 500);
                }}
                className="w-10 h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-white shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  fitView();
                  setTimeout(() => addNode("branch", { x: 250, y: 250 }), 500);
                }}
                className="w-10 h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-white shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
              >
                <GitBranch className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  selectedMobileElement?.type === "node"
                    ? deleteNode(selectedMobileElement.id)
                    : deleteEdge(selectedMobileElement.id)
                }
                disabled={!selectedMobileElement}
                className="w-10 h-10 bg-[#450a0a]/90 backdrop-blur-xl border border-red-500/30 rounded-full flex items-center justify-center text-red-500 disabled:opacity-30 shadow-[0_10px_20px_rgba(0,0,0,0.8)] transition-opacity"
              >
                <Minus className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE FULLSCREEN EXIT CONTROLS */}
      {isMapFullscreen && (
        <div className="md:hidden absolute top-4 right-4 z-[80]">
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 bg-[#0a0a0a]/90 backdrop-blur-xl border border-[#222] rounded-full flex items-center justify-center text-white shadow-2xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <ReactFlow
        nodes={mappedNodes}
        edges={mappedEdges}
        nodeTypes={memoizedNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneContextMenu={(e) => {
          e.preventDefault();
          setNodeMenu(null);
          setEdgeMenu(null);
          setPaneMenu({ top: e.clientY, left: e.clientX });
        }}
        onNodeContextMenu={(e, node) => {
          e.preventDefault();
          setPaneMenu(null);
          setEdgeMenu(null);
          setNodeMenu({ top: e.clientY, left: e.clientX, node });
        }}
        onEdgeContextMenu={(e, edge) => {
          e.preventDefault();
          setPaneMenu(null);
          setNodeMenu(null);
          setEdgeMenu({ top: e.clientY, left: e.clientX, edge });
        }}
        onNodeClick={(e, node) => {
          e.preventDefault();
          e.stopPropagation();
          if (isMobileEditMode) {
            setSelectedMobileElement({ type: "node", id: node.id });
          } else {
            setActiveEditNodeId(node.id);
          }
        }}
        onEdgeClick={(e, edge) => {
          if (isMobileEditMode) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedMobileElement({ type: "edge", id: edge.id });
          }
        }}
        onPaneClick={() => {
          setPaneMenu(null);
          setNodeMenu(null);
          setEdgeMenu(null);
          if (isMobileEditMode) setSelectedMobileElement(null);
        }}
        fitView
        className="bg-[#030303]"
        minZoom={0.1}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#222" gap={24} size={2} />
        {/* Hide default controls on Mobile so custom mobile controls take over */}
        <Controls
          showInteractive={false}
          className="!bg-transparent !border-none shadow-2xl [&_.react-flow__controls-button]:bg-[#0a0a0a] [&_.react-flow__controls-button]:border-[#222] [&_.react-flow__controls-button]:fill-[#888] hover:[&_.react-flow__controls-button]:fill-white hover:[&_.react-flow__controls-button]:bg-[#222] [&_.react-flow__controls-button]:transition-colors overflow-hidden rounded-xl border border-[#222] z-30 hidden md:flex"
        />
      </ReactFlow>

      <AnimatePresence>
        {/* Invisible Backdrop to close menus when clicking anywhere else */}
        {(paneMenu || nodeMenu || edgeMenu) && (
          <div
            className="fixed inset-0 z-[90] hidden md:block"
            onClick={() => {
              setPaneMenu(null);
              setNodeMenu(null);
              setEdgeMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setPaneMenu(null);
              setNodeMenu(null);
              setEdgeMenu(null);
            }}
          />
        )}

        {paneMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: paneMenu.top, left: paneMenu.left }}
            className="fixed z-[100] bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[220px] hidden md:block"
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
            className="fixed z-[100] bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[200px] hidden md:block"
          >
            <button
              onClick={() => deleteNode()}
              className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-[#111] flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" /> Delete Milestone
            </button>
          </motion.div>
        )}
        {edgeMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: edgeMenu.top, left: edgeMenu.left }}
            className="fixed z-[100] bg-[#0a0a0a] border border-[#222] rounded-xl shadow-2xl overflow-hidden min-w-[200px] hidden md:block"
          >
            <button
              onClick={() => deleteEdge()}
              className="w-full px-4 py-3 text-left text-sm font-bold text-red-500 hover:bg-[#111] flex items-center gap-3"
            >
              <Trash2 className="w-4 h-4" /> Sever Connection
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// MATHEMATICAL LAYOUT ENGINE (Spine & Branch Neural Web)
// ============================================================================
const generateWebLayout = (nodes) => {
  const SPINE_X = 0; // Center spine
  const Y_SPACING = 350; // Vertical distance
  const BRANCH_OFFSET = 450; // Horizontal distance for side branches

  return nodes.map((node, index) => {
    let xPos = SPINE_X;
    let yPos = index * Y_SPACING;

    // Create a sprawling zig-zag or branching effect
    // Main phases stay on the spine. Sub-tasks branch left/right.
    if (node.data?.isBranch) {
      // Alternate left and right for branches
      xPos = index % 2 === 0 ? BRANCH_OFFSET : -BRANCH_OFFSET;
      yPos = (index - 1) * Y_SPACING + Y_SPACING / 2; // Offset vertically between spine nodes
    } else {
      // Slight stagger on the spine to make it look organic
      xPos = index % 2 === 0 ? 50 : -50;
    }

    return {
      ...node,
      position: { x: xPos, y: yPos },
    };
  });
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

  // --- 1. SUBSCRIPTION STATE (MUST BE DECLARED FIRST) ---
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalReason, setProModalReason] = useState("journal");

  // --- 2. AI GENERATION STATES ---
  const [aiPhase, setAiPhase] = useState("idle");
  const [aiQuestions, setAiQuestions] = useState([]);
  const [aiAnswers, setAiAnswers] = useState({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Check if it's a completely empty/new roadmap
  const isFirstTime = nodes.length <= 1 && nodes[0]?.id === "init_1";

  // --- 3. PRO LIMIT CALCULATIONS (Safely uses subscriptionTier now) ---
  const lastGenDate = userData?.telemetry?.lastRoadmapGen;
  const daysSinceLastGen = lastGenDate
    ? (new Date() - new Date(lastGenDate)) / (1000 * 60 * 60 * 24)
    : 999;
  const canRegenerate = subscriptionTier === "pro" && daysSinceLastGen >= 14;

  // dailyStats now tracks detailed counts per node type
  const [dailyStats, setDailyStats] = useState({});
  const [viewMode, setViewMode] = useState("timeline");
  const [timeframe, setTimeframe] = useState("Macro Vision");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const [activeEditNodeId, setActiveEditNodeId] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

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

  // --- AI HANDLERS (Live Gemini Integration) ---
  const handleStartCalibration = async () => {
    if (subscriptionTier === "free" && !isFirstTime) {
      setProModalReason("regenerate");
      setIsProModalOpen(true);
      return;
    }
    if (subscriptionTier === "pro" && !canRegenerate && !isFirstTime) {
      addToast(
        `Regeneration locked. Try again in ${Math.ceil(14 - daysSinceLastGen)} days.`,
        "red",
      );
      return;
    }

    setAiPhase("loading_questions");
    setAiAnswers({});
    setCurrentQuestionIdx(0);

    try {
      // 1. Call Gemini to generate personalized questions
      const questions = await generateCalibrationQuestions(userData);
      setAiQuestions(questions);
      setAiPhase("questions");
    } catch (err) {
      addToast("Failed to initialize AI neural link. Try again.", "red");
      setAiPhase("idle");
    }
  };

  const handleGenerateRoadmap = async () => {
    setAiPhase("loading_roadmap");

    try {
      // 1. Send Answers to Gemini to build the JSON map
      const aiData = await generateExecutionMap(
        userData,
        aiAnswers,
        subscriptionTier,
      );

      // 2. Parse Gemini's simple JSON into React Flow's complex Math UI
      const newNodes = [];
      const newEdges = [];

      // Calculate realistic deadlines starting from today
      let currentDate = new Date();

      aiData.phases.forEach((phase, index) => {
        const nodeId = `node_ai_${Date.now()}_${index}`;

        // Add 14 days for each phase to create rolling deadlines
        currentDate.setDate(currentDate.getDate() + 14);

        newNodes.push({
          id: nodeId,
          type: "executionNode",
          position: { x: 0, y: 0 }, // Math layout will override this
          data: {
            title: phase.title,
            subtitle: phase.subtitle,
            desc: phase.desc,
            nodeType: phase.nodeType || "core",
            deadline: currentDate.toISOString().split("T")[0],
            isCompleted: false,
            priorityStatus: index === 0 ? "READY" : "FUTURE",
            tasks: phase.tasks.map((t, i) => ({
              id: `${nodeId}_t${i}`,
              text: t,
              completed: false,
            })),
          },
        });

        // Connect this node to the previous one
        if (index > 0) {
          const prevNodeId = newNodes[index - 1].id;
          newEdges.push({
            id: `edge_${prevNodeId}-${nodeId}`,
            source: prevNodeId,
            target: nodeId,
            animated: phase.nodeType === "branch",
            style: {
              stroke: "#666",
              strokeWidth: 2,
              strokeDasharray: phase.nodeType === "branch" ? "5,5" : "none",
            },
          });
        }
      });

      // 3. Apply the mathematical Sprawling Web Layout
      const layoutedNodes = generateWebLayout(newNodes);

      // 4. Update the Canvas
      setNodes(layoutedNodes);
      setEdges(newEdges);
      setHasUnsavedChanges(true); // Triggers the Cloud Save button to appear

      // 5. Update the backend timestamp to enforce the 14-day rule
      const uid = auth.currentUser?.uid || userData?.id;
      if (uid) {
        await updateDoc(doc(db, "users", uid), {
          "telemetry.lastRoadmapGen": new Date().toISOString(),
        });
      }

      setAiPhase("idle");
      addToast("Neural Map successfully deployed.", "green");
      addLedgerEntry("Generated new AI Execution Map");
    } catch (err) {
      console.error(err);
      addToast("Synthesis failed. Neural link severed.", "red");
      setAiPhase("idle");
    }
  };

  // ============================================================================
  // TASK OVERFLOW ENGINE (Rollover past-due tasks)
  // ============================================================================
  useEffect(() => {
    // Only run this if we have nodes and haven't already processed them today
    if (nodes.length === 0) return;

    const today = new Date();
    let hasChanges = false;
    let pendingRolloverTasks = [];

    // Deep clone nodes to avoid mutating state directly
    let processedNodes = JSON.parse(JSON.stringify(nodes));

    for (let i = 0; i < processedNodes.length; i++) {
      let node = processedNodes[i];
      let nodeDeadline = new Date(node.data.deadline);

      // 1. If this node's deadline is in the past
      if (nodeDeadline < today && node.data.status !== "Completed") {
        const unfinishedTasks = node.data.tasks.filter((t) => !t.completed);

        if (unfinishedTasks.length > 0) {
          // Tag them as rollover and add to queue
          pendingRolloverTasks.push(
            ...unfinishedTasks.map((t) => ({ ...t, isRollover: true })),
          );

          // Remove them from the old node, mark old node as completed
          node.data.tasks = node.data.tasks.filter((t) => t.completed);
          node.data.status = "Completed";
          hasChanges = true;
        }
      }
      // 2. Dump the rollover queue into the FIRST active/future node we find
      else if (nodeDeadline >= today && pendingRolloverTasks.length > 0) {
        node.data.tasks = [...pendingRolloverTasks, ...node.data.tasks];
        pendingRolloverTasks = []; // Clear the queue
        hasChanges = true;
      }
    }

    // If the engine detected and moved tasks, update the UI & Database
    if (hasChanges) {
      // Apply the mathematical layout before setting state
      const layoutedNodes = generateWebLayout(processedNodes);
      setNodes(layoutedNodes);

      // TODO: When API is connected, we will also fire an updateDoc here
      // to permanently save the rolled-over state to Firebase!
    }
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FIREBASE FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      const uid = auth.currentUser?.uid || userData?.id;
      if (!uid) return;
      try {
        const docRef = doc(db, "users", uid, "execution_map", "current");
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

        const subRef = doc(db, "users", uid, "subscription", "current");
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
          setSubscriptionTier(subSnap.data().tier || "free");
        } else {
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

  // --- FIREBASE SAVE ---
  const handleCloudSave = useCallback(async () => {
    const uid = auth.currentUser?.uid || userData?.id;
    if (!hasUnsavedChanges || !uid) return;

    setIsSaving(true);
    try {
      await setDoc(
        doc(db, "users", uid, "execution_map", "current"),
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
      logDailyStat("task", 1);
      addLedgerEntry(`Executed sub-task in: ${activeNode.data.title}`);
    }
  };

  const handleCompleteAll = () => {
    if (window.confirm("Mark node and all tasks as completed?")) {
      const incompleteTasksCount = (activeNode.data.tasks || []).filter(
        (t) => !t.completed,
      ).length;

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

      // Log the Node itself
      logDailyStat(activeNode.data.nodeType, 1);

      // Log all unfinished tasks nested inside it
      if (incompleteTasksCount > 0) {
        logDailyStat("task", incompleteTasksCount);
      }

      addToast(`Milestone Secured: ${activeNode.data.title}`, "green");
      addLedgerEntry(`Completed Milestone: ${activeNode.data.title}`);
    }
  };

  // Upgraded Ledger Counter for Multi-Layer Gradients
  const logDailyStat = (type, count = 1) => {
    // 1. Get exact local date string (prevents UTC shift bugs)
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    const todayStr = new Date(d.getTime() - offset).toISOString().split("T")[0];

    setDailyStats((prev) => {
      // 2. Safely capture old schema data if it exists
      const current = prev[todayStr] || {
        total: prev[todayStr]?.count || 0,
        subTasks: 0,
        branches: prev[todayStr]?.hasBranch ? 1 : 0,
        cores: prev[todayStr]?.hasCore ? 1 : 0,
      };
      return {
        ...prev,
        [todayStr]: {
          total: current.total + count,
          subTasks: current.subTasks + (type === "task" ? count : 0),
          branches: current.branches + (type === "branch" ? count : 0),
          cores: current.cores + (type === "core" ? count : 0),
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

  // --- UPGRADED ADVANCED INSIGHTS TRACKER CHART ---
  const InsightsChart = () => {
    const chartRef = useRef(null);
    let isDown = false;
    let startX;
    let scrollLeft;

    // 1. Define handlers
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

    // 2. Safely memoize the data generation to prevent ReferenceErrors
    const chartDays = useMemo(() => {
      return Array.from({ length: 31 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (15 - i));

        const offset = d.getTimezoneOffset() * 60000;
        const ds = new Date(d.getTime() - offset).toISOString().split("T")[0];

        const rawStat = dailyStats[ds] || {};

        return {
          date: d,
          ds,
          stat: {
            total: rawStat.total || rawStat.count || 0,
            subTasks: rawStat.subTasks || 0,
            branches: rawStat.branches || (rawStat.hasBranch ? 1 : 0),
            cores: rawStat.cores || (rawStat.hasCore ? 1 : 0),
          },
        };
      });
    }, [dailyStats]);

    // 3. Auto-scroll center
    useEffect(() => {
      if (chartRef.current) {
        const container = chartRef.current;
        const childWidth = container.scrollWidth / 31;
        const middleOffset =
          15 * childWidth - container.clientWidth / 2 + childWidth / 2;
        container.scrollLeft = middleOffset;
      }
    }, [chartDays]);

    return (
      <div
        ref={chartRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="flex items-end gap-1.5 h-full w-full mt-auto overflow-x-auto custom-scrollbar cursor-grab active:cursor-grabbing pb-2 pt-24 group/chart"
      >
        {chartDays.map(({ date, ds, stat }, i) => {
          const isToday = isSameDay(date, new Date());

          let bgClass = "bg-[#222]";
          if (stat.total > 0) {
            if (stat.cores > 0 && stat.branches > 0) {
              bgClass =
                "bg-gradient-to-b from-[#052e16] via-[#15803d] to-[#4ade80]";
            } else if (stat.cores > 0) {
              bgClass = "bg-gradient-to-b from-[#14532d] to-[#4ade80]";
            } else if (stat.branches > 0) {
              bgClass = "bg-gradient-to-b from-[#16a34a] to-[#86efac]";
            } else {
              bgClass = "bg-[#4ade80]";
            }
          }

          return (
            <div
              key={i}
              className="relative group flex-1 min-w-[14px] flex flex-col justify-end items-center h-full hover:z-50 transition-opacity duration-300 group-hover/chart:opacity-50 hover:!opacity-100"
            >
              <div
                className={cn("w-full rounded-sm transition-all", bgClass)}
                style={{
                  height: `${Math.max(5, Math.min(75, stat.total * 15))}%`,
                }}
              />
              {isToday && (
                <div className="w-full h-1 bg-white mt-1 rounded-full shrink-0" />
              )}

              <div className="absolute bottom-[calc(100%+12px)] opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-white text-xs px-4 py-3 rounded-xl pointer-events-none whitespace-nowrap z-[100] flex flex-col gap-1.5 transition-all duration-300">
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0a0a0a] border-b border-r border-[#222] rotate-45" />

                <span className="font-extrabold border-b border-[#333] pb-1.5 mb-1 text-center tracking-wide">
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="text-[#888] flex justify-between gap-6">
                  <span>Sub-Tasks</span>{" "}
                  <span className="text-[#4ade80] font-extrabold">
                    {stat.subTasks}
                  </span>
                </span>
                <span className="text-[#888] flex justify-between gap-6">
                  <span>Branches</span>{" "}
                  <span className="text-[#16a34a] font-extrabold">
                    {stat.branches}
                  </span>
                </span>
                <span className="text-[#888] flex justify-between gap-6">
                  <span>Cores</span>{" "}
                  <span className="text-[#14532d] font-extrabold">
                    {stat.cores}
                  </span>
                </span>
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
    const uid = auth.currentUser?.uid || userData?.id;
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
            if (isSelected) dayClass = "bg-white text-black font-extrabold";
            else if (isToday)
              dayClass = "border border-white text-white font-bold";

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
    <div className="bg-[#030303] min-h-screen w-full max-w-full overflow-x-hidden text-white selection:bg-white selection:text-black pb-20 relative">
      {/* HEADER */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 pt-10 md:pt-12 pb-6 md:pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8 relative z-20">
        <div>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none">
            Execution Plan.
          </h1>
          <p className="text-sm md:text-xl text-[#888] font-medium tracking-tight">
            The algorithmic blueprint of your monopoly.
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto relative">
          {/* Changed w-full to flex-1 min-w-0 to perfectly share the row without stretching */}
          <div className="relative flex-1 min-w-0 md:w-64" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 bg-[#0a0a0a] border border-[#222] px-4 md:px-6 py-3 md:py-4 rounded-full font-bold text-xs md:text-sm text-white hover:border-[#444] transition-colors"
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
                      className="w-full text-left px-6 py-4 text-xs md:text-sm font-bold text-[#888] hover:text-white hover:bg-[#111] transition-colors"
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
                "p-2 md:p-3 rounded-full transition-all",
                viewMode === "timeline"
                  ? "bg-[#222] text-white"
                  : "text-[#666] hover:text-white",
              )}
            >
              <GitBranch className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "p-2 md:p-3 rounded-full transition-all",
                viewMode === "calendar"
                  ? "bg-[#222] text-white"
                  : "text-[#666] hover:text-white",
              )}
            >
              <CalendarIcon className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW ENGINE */}
      <div className="relative overflow-x-hidden">
        {viewMode === "timeline" ? (
          <div className="relative h-full w-full">
            {/* FIRST TIME BLUR OVERLAY */}
            {isFirstTime && aiPhase === "idle" && (
              <div className="absolute inset-0 z-[80] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">
                  Initialize Your Trajectory
                </h2>
                <p className="text-[#888] max-w-lg mb-8 leading-relaxed">
                  Your Execution Map is empty. Deploy the Discotive AI to
                  analyze your operator profile and synthesize a
                  hyper-personalized, mathematical career roadmap.
                </p>
                <button
                  onClick={handleStartCalibration}
                  className="px-8 py-4 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-3"
                >
                  <Wand2 className="w-5 h-5" /> Generate Career Roadmap
                </button>
              </div>
            )}

            {/* AI GENERATION FULL-PAGE MODAL */}
            <AnimatePresence>
              {aiPhase !== "idle" && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-2xl bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-12 shadow-2xl flex flex-col min-h-[400px] justify-center"
                  >
                    {(aiPhase === "loading_questions" ||
                      aiPhase === "loading_roadmap") && (
                      <AILoader
                        phase={
                          aiPhase === "loading_questions"
                            ? "questions"
                            : "roadmap"
                        }
                      />
                    )}

                    {aiPhase === "questions" && aiQuestions.length > 0 && (
                      <div className="flex flex-col h-full">
                        <div className="mb-8">
                          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">
                            Calibration {currentQuestionIdx + 1} of{" "}
                            {aiQuestions.length}
                          </p>
                          <h3 className="text-xl md:text-2xl font-extrabold text-white">
                            {aiQuestions[currentQuestionIdx].question}
                          </h3>
                        </div>

                        <div className="flex-1">
                          {aiQuestions[currentQuestionIdx].type === "text" ? (
                            <textarea
                              autoFocus
                              value={
                                aiAnswers[aiQuestions[currentQuestionIdx].id] ||
                                ""
                              }
                              onChange={(e) =>
                                setAiAnswers({
                                  ...aiAnswers,
                                  [aiQuestions[currentQuestionIdx].id]:
                                    e.target.value,
                                })
                              }
                              placeholder="Type your response..."
                              className="w-full h-32 bg-[#111] border border-[#333] rounded-xl p-4 text-white focus:border-amber-500 outline-none resize-none custom-scrollbar"
                            />
                          ) : (
                            <div className="space-y-3">
                              {aiQuestions[currentQuestionIdx].options.map(
                                (opt) => (
                                  <button
                                    key={opt}
                                    onClick={() =>
                                      setAiAnswers({
                                        ...aiAnswers,
                                        [aiQuestions[currentQuestionIdx].id]:
                                          opt,
                                      })
                                    }
                                    className={cn(
                                      "w-full text-left px-5 py-4 border rounded-xl font-bold transition-all text-sm",
                                      aiAnswers[
                                        aiQuestions[currentQuestionIdx].id
                                      ] === opt
                                        ? "bg-amber-500/10 border-amber-500 text-amber-500"
                                        : "bg-[#111] border-[#333] text-[#888] hover:bg-[#222] hover:text-white",
                                    )}
                                  >
                                    {opt}
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-8 flex justify-end pt-6 border-t border-[#222]">
                          <button
                            onClick={() => {
                              if (currentQuestionIdx < aiQuestions.length - 1) {
                                setCurrentQuestionIdx((prev) => prev + 1);
                              } else {
                                handleGenerateRoadmap();
                              }
                            }}
                            disabled={
                              !aiAnswers[aiQuestions[currentQuestionIdx].id]
                            }
                            className="px-8 py-3 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] disabled:opacity-30 flex items-center gap-2"
                          >
                            {currentQuestionIdx < aiQuestions.length - 1
                              ? "Next"
                              : "Synthesize Roadmap"}{" "}
                            <ChevronRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

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
                subscriptionTier={subscriptionTier}
                totalNodesCount={nodes.length}
                onLimitReached={() => {
                  setProModalReason("nodes");
                  setIsProModalOpen(true);
                }}
                isFirstTime={isFirstTime}
                handleStartCalibration={handleStartCalibration}
              />
            </ReactFlowProvider>
          </div>
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
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                onClick={(e) => e.stopPropagation()}
                className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0a0a0a] border-l border-[#222] shadow-[auto_0_100px_rgba(0,0,0,0.9)] z-[110] flex flex-col"
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
      <div className="bg-[#050505] border-b border-[#222] py-4 md:py-5 shadow-lg relative z-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-[#888] tracking-tight">
            <CalendarIcon className="w-4 h-4" /> {formattedDate}
          </div>

          <button
            onClick={() => {
              if (subscriptionTier === "free") {
                setProModalReason("journal");
                setIsProModalOpen(true);
              } else {
                setIsJournalOpen(true);
              }
            }}
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

          <div className="flex items-center gap-2 text-xs md:text-sm font-mono text-white tracking-widest">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* PROGRESS INSIGHTS (TELEMETRY) */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 py-12 md:py-20 relative z-20">
        <div className="mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1 md:mb-2">
            Progress Insights.
          </h2>
          <p className="text-xs md:text-sm text-[#888] font-medium">
            Tracking verified execution data.
          </p>
        </div>

        {/* RESTRICTED HEIGHT GRID TO PREVENT STRETCHING BUG */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 h-auto lg:h-[400px]">
          <div className="lg:col-span-2 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-12 hover:border-[#333] transition-colors flex flex-col h-[300px] lg:h-full">
            <div className="flex justify-between items-start mb-4 md:mb-8">
              <div>
                <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-2">
                  Milestones Completed
                </p>
                <p className="text-4xl md:text-5xl font-extrabold text-white tracking-tighter">
                  {nodesWithPriority.filter((n) => n.data.isCompleted).length}
                </p>
                <p className="text-xs md:text-sm text-[#888] mt-2">
                  Roadmap completions (All Time)
                </p>
              </div>
              <Activity className="w-6 h-6 md:w-8 md:h-8 text-[#444]" />
            </div>
            <div className="flex-1 min-h-[100px] min-w-0 overflow-hidden w-full relative">
              <InsightsChart />
            </div>
          </div>

          <div className="flex flex-col gap-6 md:gap-8 h-full">
            <div className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-8 flex flex-col justify-center hover:border-[#333] transition-colors min-h-0">
              <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.2em] mb-3 md:mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Profile Reach
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl md:text-6xl font-extrabold tracking-tighter text-white">
                  0
                </span>
                <span className="text-xs md:text-sm text-[#888] font-medium">
                  views
                </span>
              </div>
              <p className="text-xs md:text-sm text-[#666] mt-2">
                Public visibility over 7 days.
              </p>
            </div>

            <div className="flex-1 bg-white text-black rounded-[2rem] p-6 md:p-8 flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer min-h-0">
              <div className="flex justify-between items-start">
                <p className="text-[10px] md:text-xs font-extrabold uppercase tracking-[0.2em]">
                  Current Focus
                </p>
                <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-extrabold tracking-tight mb-1 truncate">
                  {nodesWithPriority.find(
                    (n) => n.data.priorityStatus === "READY",
                  )?.data.title || "Awaiting Assignment"}
                </h3>
                <p className="text-[10px] md:text-xs font-bold opacity-70 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Deploy node to start
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-8 flex flex-col h-[300px] lg:h-full overflow-hidden hover:border-[#333] transition-colors">
            <div className="flex justify-between items-center mb-4 md:mb-6 shrink-0">
              <p className="text-[10px] md:text-xs font-bold text-[#666] uppercase tracking-[0.2em] flex items-center gap-2">
                <List className="w-4 h-4" /> System Ledger
              </p>
              <span className="text-[8px] md:text-[9px] font-mono text-[#444] uppercase">
                24H Cache
              </span>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {systemLedger.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50">
                  <Hash className="w-6 h-6 md:w-8 md:h-8 text-[#444] mb-3" />
                  <p className="text-[10px] md:text-xs font-bold text-[#888]">
                    No activity logged yet.
                  </p>
                </div>
              ) : (
                systemLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-[#333] pl-3 py-1 shrink-0"
                  >
                    <p className="text-[10px] md:text-xs font-bold text-[#ccc] truncate">
                      {entry.action}
                    </p>
                    <p className="text-[8px] md:text-[9px] font-mono text-[#666]">
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
      {createPortal(
        <div className="fixed bottom-4 md:bottom-6 left-4 right-4 md:left-6 md:right-auto z-[9999] flex flex-col gap-2 pointer-events-none">
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
                {t.type === "green" && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Activity className="w-4 h-4 text-[#888] shrink-0" />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}

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
              className="relative w-full max-w-md bg-[#0a0a0a] border border-[#222] rounded-[2rem] p-6 md:p-8 text-center shadow-2xl"
            >
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <Lock className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
              </div>
              <h3 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                Protocol Locked
              </h3>
              <p className="text-[#888] text-xs md:text-sm mb-6 md:mb-8 leading-relaxed">
                {proModalReason === "nodes"
                  ? "The Free tier is strictly limited to 10 active execution nodes. Delete previous nodes or upgrade your clearance to deploy an unlimited map."
                  : "The Execution Journal and historical ledger are Discotive Pro features. Do you wish to upgrade your clearance?"}
              </p>
              <div className="flex gap-3 md:gap-4">
                <button
                  onClick={() => setIsProModalOpen(false)}
                  className="flex-1 py-2.5 md:py-3 bg-[#111] border border-[#333] text-white text-xs md:text-sm font-bold rounded-xl hover:bg-[#222] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate("/premium")}
                  className="flex-1 py-2.5 md:py-3 bg-white text-black text-xs md:text-sm font-extrabold rounded-xl hover:bg-[#ccc] transition-colors"
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
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-8">
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
                  : "w-full h-full md:h-[80vh] md:max-w-6xl rounded-none md:rounded-[2rem]",
              )}
            >
              <div className="flex justify-between items-center p-4 md:p-8 border-b border-[#222] shrink-0">
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white mb-1">
                    Execution Journal.
                  </h2>
                  <p className="text-[#666] font-mono text-[10px] md:text-xs">
                    {formattedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsJournalFullscreen(!isJournalFullscreen)}
                    className="hidden md:block p-2 md:p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    {isJournalFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsJournalOpen(false)}
                    className="p-2 md:p-3 text-[#888] hover:text-white bg-[#111] hover:bg-[#222] rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Mobile: Mini Tracker shifts to top */}
                <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#222] p-4 md:p-6 overflow-y-auto custom-scrollbar bg-[#050505] flex flex-col shrink-0 md:shrink">
                  <div className="mb-4 md:mb-8">
                    <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-3 md:mb-4 flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> Tracker
                    </p>
                    <div className="bg-[#111] border border-[#222] rounded-xl p-3 md:p-4">
                      {generateMiniCalendar()}
                    </div>
                  </div>
                  <p className="hidden md:flex text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-4 items-center gap-2">
                    <Clock className="w-3 h-3" /> Archive
                  </p>
                  <div className="hidden md:flex space-y-4 flex-1">
                    <div className="flex flex-col items-center justify-center py-10 opacity-50 w-full">
                      <p className="text-xs font-bold text-[#666]">
                        No previous entries.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-4 md:p-10 relative bg-[#0a0a0a]">
                  <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 opacity-50">
                    <AlignLeft className="w-4 h-4 md:w-5 md:h-5 text-[#888]" />
                    <span className="text-xs md:text-sm font-bold text-[#888]">
                      Drafting new entry...
                    </span>
                  </div>
                  <textarea
                    autoFocus
                    maxLength={JOURNAL_LIMIT}
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Document the reality of today's execution..."
                    className="flex-1 w-full bg-transparent text-base md:text-xl font-medium text-white placeholder-[#444] focus:outline-none resize-none leading-relaxed custom-scrollbar"
                  />
                  <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-[#222] mt-auto shrink-0">
                    <p
                      className={cn(
                        "text-[10px] md:text-xs font-mono font-bold",
                        journalText.length >= JOURNAL_LIMIT
                          ? "text-red-500"
                          : "text-[#666]",
                      )}
                    >
                      {journalText.length} / {JOURNAL_LIMIT}
                    </p>
                    <button
                      onClick={handleSaveJournal}
                      className="px-6 md:px-8 py-2.5 md:py-3.5 font-extrabold text-black bg-white hover:bg-[#ccc] rounded-full transition-colors text-xs md:text-sm"
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
