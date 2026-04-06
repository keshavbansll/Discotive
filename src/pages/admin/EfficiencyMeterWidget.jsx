/**
 * @fileoverview Discotive OS — Efficiency Meter (DEM Index)
 * @module Admin/Widgets/EfficiencyMeter
 * @description
 * Semi-circular SVG gauge that aggregates user feedback from the root
 * `feedback` Firestore collection and renders a weighted efficiency score.
 *
 * DATA CONTRACT (reads from Firestore: feedback/{uid}):
 *   recommendation  string  — "a_drag" | "average" | "powerful" | "game_changer"
 *
 * WEIGHT SYSTEM:
 *   a_drag       → 0%   weight (worst)
 *   average      → 33%  weight
 *   powerful     → 67%  weight
 *   game_changer → 100% weight (best)
 *
 * The overall score = sum(count × weight) / totalFeedback, expressed as a
 * percentage. A score of 100% means every respondent said "Game-Changer".
 *
 * FIX LOG:
 *   1. Vote display label changed from "{n} / {n} Votes" (redundant) to
 *      "{n} Response(s)" — correctly communicates unique respondents since
 *      each user has exactly one document (anti-spam by UID-keyed setDoc).
 *   2. Added an ErrorBoundary wrapper so SVG math failures (0-division,
 *      corrupted data) do not crash the entire AdminDashboard.
 *   3. All division operations are guarded with totalFeedback === 0 checks
 *      already present in useMemo — confirmed and annotated.
 *   4. `collectionGroup` import removed (was imported but unused, causing
 *      a misleading lint warning).
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  Component,
} from "react";
import { createPortal } from "react-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Loader2,
  Share2,
  ImageIcon,
  Smartphone,
  Download,
  X,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { toPng } from "html-to-image";
import { cn } from "../../lib/cn";
// ── DEM Schema ────────────────────────────────────────────────────────────────
// weight: the efficiency score contribution (0–100) for each recommendation.
// id values MUST match the `recommendation` field values written by FeedbackModal.
const DEM_SCHEMA = [
  { id: "a_drag", label: "A Drag", color: "#fb7185", weight: 0 },
  { id: "average", label: "Average", color: "#f59e0b", weight: 33.33 },
  { id: "powerful", label: "Powerful", color: "#10b981", weight: 66.66 },
  { id: "game_changer", label: "Game-Changer", color: "#a855f7", weight: 100 },
];

// ── SVG Geometry Constants ────────────────────────────────────────────────────
const CX = 100;
const CY = 100;
const R = 88;
const STROKE_WIDTH = 12;

const polarToCartesian = (angleInDegrees) => {
  const rad = ((180 - angleInDegrees) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
};

const describeArc = (startAngle, endAngle) => {
  const start = polarToCartesian(startAngle);
  const end = polarToCartesian(endAngle);
  return `M ${start.x} ${start.y} A ${R} ${R} 0 0 1 ${end.x} ${end.y}`;
};

// ── Error Boundary ────────────────────────────────────────────────────────────
// Wraps the widget so that if SVG math or any render throws, only this
// widget shows a fallback — the AdminDashboard keeps rendering normally.
class DEMErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[DEM Index] Render error caught by boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#0a0a0a] border border-[#222222] rounded-[2rem] p-6 flex flex-col items-center justify-center min-h-[280px] gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500/50" />
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">
            DEM Index Unavailable
          </p>
          <p className="text-[9px] text-white/10 font-mono text-center max-w-[180px]">
            {this.state.error?.message || "Unknown render error"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Inner Widget ──────────────────────────────────────────────────────────────
const EfficiencyMeterWidgetInner = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState("square");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const squareRef = useRef(null);
  const portraitRef = useRef(null);

  // ── Firestore fetch ─────────────────────────────────────────────────────────
  const fetchFeedbackData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    setFetchError(null);
    try {
      // PRO UX TRICK: If manual refresh, enforce a minimum 600ms visual delay
      // concurrent with the fetch so the skeleton and spin animation actually register.
      const fetchPromise = getDocs(collection(db, "feedback"));
      const delayPromise = isManualRefresh
        ? new Promise((res) => setTimeout(res, 600))
        : Promise.resolve();

      const [querySnapshot] = await Promise.all([fetchPromise, delayPromise]);

      const rawCounts = Object.fromEntries(DEM_SCHEMA.map((s) => [s.id, 0]));

      querySnapshot.forEach((doc) => {
        const rec = doc.data().recommendation;
        if (rec !== undefined && rawCounts[rec] !== undefined) {
          rawCounts[rec] += 1;
        }
      });

      setData(DEM_SCHEMA.map((s) => ({ ...s, value: rawCounts[s.id] })));
    } catch (error) {
      console.error("[DEM Index] Telemetry fetch error:", error);
      setFetchError(error.message || "Failed to fetch feedback data.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbackData(false);
  }, [fetchFeedbackData]);

  // ── Derived metrics ─────────────────────────────────────────────────────────

  const totalFeedback = useMemo(
    () => data.reduce((acc, curr) => acc + curr.value, 0),
    [data],
  );

  const overallEfficiencyScore = useMemo(() => {
    if (totalFeedback === 0) return 0;
    const totalWeight = data.reduce(
      (acc, curr) => acc + curr.value * curr.weight,
      0,
    );
    return Math.round(totalWeight / totalFeedback);
  }, [data, totalFeedback]);

  const enrichedData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        percentage:
          totalFeedback > 0
            ? Math.round((item.value / totalFeedback) * 100)
            : 0,
      })),
    [data, totalFeedback],
  );

  // The colour of the category with the most votes drives the score display
  const dominantColor = useMemo(() => {
    if (totalFeedback === 0) return "#ffffff";
    return enrichedData.reduce((prev, curr) =>
      curr.value > prev.value ? curr : prev,
    ).color;
  }, [enrichedData, totalFeedback]);

  const arcData = useMemo(() => {
    if (totalFeedback === 0) return [];
    const gapDegrees = 3.5;
    const validData = enrichedData.filter((d) => d.value > 0);
    const availableDegrees =
      180 - (validData.length > 1 ? validData.length - 1 : 0) * gapDegrees;

    let currentAngle = 0;
    return validData.map((d) => {
      const segmentDegrees = (d.value / totalFeedback) * availableDegrees;
      const start = currentAngle;
      const end = currentAngle + segmentDegrees;
      currentAngle = end + gapDegrees;
      return { ...d, path: describeArc(start, end) };
    });
  }, [enrichedData, totalFeedback]);

  // ── Export preview generation ──────────────────────────────────────────────
  useEffect(() => {
    if (!shareModalOpen) return;

    const generatePreviewImage = async () => {
      setIsGenerating(true);
      setPreviewUrl(null);
      try {
        const artificialDelay = new Promise((resolve) =>
          setTimeout(resolve, 3000),
        );
        await new Promise((resolve) => setTimeout(resolve, 50));

        const targetRef =
          exportFormat === "square" ? squareRef.current : portraitRef.current;
        if (!targetRef) return;

        const dataUrlPromise = toPng(targetRef, {
          cacheBust: true,
          pixelRatio: 1,
        });

        const [dataUrl] = await Promise.all([dataUrlPromise, artificialDelay]);
        setPreviewUrl(dataUrl);
      } catch (err) {
        console.error("[DEM Index] Export generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    };

    generatePreviewImage();
  }, [shareModalOpen, exportFormat, enrichedData]);

  const triggerDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `DEM_Index_${exportFormat}_${Date.now()}.png`;
    a.click();
    setShareModalOpen(false);
  };

  // ── Reusable sub-components for the hidden 1080p export targets ────────────
  const StaticExportGauge = ({ widthClass, pctSizeClass, voteSizeClass }) => (
    <div className={`relative mx-auto ${widthClass}`}>
      <svg
        viewBox="0 0 200 110"
        className="w-full h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
      >
        {totalFeedback === 0 ? (
          <path
            d={describeArc(0, 180)}
            fill="none"
            stroke="#222222"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
        ) : (
          arcData.map((arc) => (
            <path
              key={arc.id}
              d={arc.path}
              fill="none"
              stroke={arc.color}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
            />
          ))
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-[7%]">
        <span
          className={`${pctSizeClass} font-black leading-none tracking-tight drop-shadow-xl`}
          style={{ color: dominantColor }}
        >
          {overallEfficiencyScore}%
        </span>
        <span
          className={`${voteSizeClass} font-bold text-white/50 mt-4 uppercase tracking-widest`}
        >
          {totalFeedback} Response{totalFeedback !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );

  const StaticExportLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 w-full mt-10 pt-10 border-t border-white/10 px-8">
      {enrichedData.map((item) => (
        <div key={item.id} className="flex items-center gap-3">
          <span
            className="w-5 h-5 rounded-full"
            style={{
              backgroundColor: item.color,
              boxShadow: `0 0 20px ${item.color}60`,
            }}
          />
          <span className="text-[22px] font-bold text-white/60 tracking-widest uppercase">
            {item.label}
          </span>
          <span className="text-[26px] font-black text-white">
            {item.percentage}%
          </span>
        </div>
      ))}
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── VISIBLE DASHBOARD WIDGET ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-[#0a0a0a] border border-[#222222] rounded-[2rem] p-6 flex flex-col justify-between h-full min-h-[280px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between z-10 shrink-0 mb-4">
          <h2 className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#f59e0b]" />
            DEM INDEX
          </h2>

          {/* Control Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchFeedbackData(true)}
              disabled={loading || isRefreshing}
              className="w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.05] disabled:opacity-30"
              title="Refresh DEM Index"
            >
              <RefreshCw
                className={cn(
                  "w-3.5 h-3.5 text-white/40 hover:text-white",
                  isRefreshing && "animate-spin text-[#f59e0b]",
                )}
              />
            </button>
            <button
              onClick={() => navigate("/admin/feedbacks")}
              className="w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.05]"
              title="View All Feedback"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40 hover:text-white" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-0.5" /> {/* Divider */}
            <button
              onClick={() => setShareModalOpen(true)}
              disabled={loading || isRefreshing || totalFeedback === 0}
              className="w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors border border-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export DEM Index"
            >
              <Share2 className="w-3.5 h-3.5 text-white/40 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Body: skeleton / error / data states */}
        {loading || isRefreshing ? (
          <div className="flex-1 flex flex-col justify-end w-full animate-pulse">
            {/* Gauge Skeleton */}
            <div className="relative w-full max-w-[260px] mx-auto mt-auto flex flex-col items-center justify-end pb-[7%] h-[110px]">
              <svg
                viewBox="0 0 200 110"
                className="absolute inset-0 w-full h-auto overflow-visible"
              >
                <path
                  d="M 12 100 A 88 88 0 0 1 188 100"
                  fill="none"
                  stroke="#1a1a1a"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                />
              </svg>
              {/* Score text placeholder */}
              <div className="w-20 h-10 bg-[#1a1a1a] rounded-lg mb-2 z-10" />
              {/* Responses text placeholder */}
              <div className="w-24 h-2.5 bg-[#1a1a1a] rounded z-10" />
            </div>

            {/* Legend Skeleton */}
            <div className="flex flex-row items-center justify-between w-full mt-8 shrink-0 pt-4 border-t border-[#222222]">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#1a1a1a] shrink-0" />
                  <div className="w-10 h-2.5 rounded bg-[#1a1a1a] hidden sm:block" />
                  <div className="w-5 h-3 rounded bg-[#1a1a1a]" />
                </div>
              ))}
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
            <AlertTriangle className="w-5 h-5 text-amber-500/40" />
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
              Data unavailable
            </p>
            <p className="text-[9px] text-white/10 font-mono">{fetchError}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-end w-full">
            {/* Gauge SVG */}
            <div className="relative w-full max-w-[260px] mx-auto mt-auto">
              <svg
                viewBox="0 0 200 110"
                className="w-full h-auto overflow-visible drop-shadow-xl"
              >
                {totalFeedback === 0 ? (
                  <path
                    d={describeArc(0, 180)}
                    fill="none"
                    stroke="#111111"
                    strokeWidth={STROKE_WIDTH}
                    strokeLinecap="round"
                  />
                ) : (
                  arcData.map((arc, i) => (
                    <motion.path
                      key={arc.id}
                      d={arc.path}
                      fill="none"
                      stroke={arc.color}
                      strokeWidth={STROKE_WIDTH}
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: 1.2,
                        delay: i * 0.1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  ))
                )}
              </svg>

              {/* Score overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-[7%] pointer-events-none">
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="text-4xl font-black leading-none tracking-tight"
                  style={{ color: dominantColor }}
                >
                  {overallEfficiencyScore}%
                </motion.span>
                <span className="text-[10px] font-bold text-white/40 mt-1.5 uppercase tracking-widest">
                  {totalFeedback === 0
                    ? "No responses yet"
                    : `${totalFeedback} Response${totalFeedback !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-row items-center justify-between w-full mt-8 shrink-0 pt-4 border-t border-[#222222]">
              {enrichedData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}50`,
                    }}
                  />
                  <span className="text-[9px] font-bold text-white/40 hidden sm:inline-block">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-black text-white">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── HIDDEN HIGH-RES RENDER TARGETS (for html-to-image export) ── */}
      <div className="fixed top-[-9999px] left-[-9999px] opacity-0 pointer-events-none flex z-[-1]">
        {/* 1. Square (1080 × 1080) */}
        <div
          ref={squareRef}
          className="w-[1080px] h-[1080px] relative flex flex-col justify-end overflow-hidden bg-[#030303]"
        >
          <img
            src="/DEM square.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
            crossOrigin="anonymous"
          />
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
            <h2 className="text-[40px] font-black text-white tracking-[0.25em] flex items-center gap-4 uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              <Activity className="w-10 h-10 text-[#f59e0b]" /> DEM INDEX
            </h2>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[700px] bg-gradient-to-t from-[#f59e0b]/30 via-[#111111]/95 to-transparent z-10" />
          <div className="relative z-20 w-full px-16 pb-16 flex flex-col items-center">
            <StaticExportGauge
              widthClass="w-[750px]"
              pctSizeClass="text-[120px]"
              voteSizeClass="text-2xl"
            />
            <StaticExportLegend />
          </div>
        </div>

        {/* 2. Portrait (1080 × 1920) */}
        <div
          ref={portraitRef}
          className="w-[1080px] h-[1920px] relative flex flex-col justify-end overflow-hidden bg-[#030303]"
        >
          <img
            src="/DEM portrait.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover z-0"
            crossOrigin="anonymous"
          />
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
            <h2 className="text-[44px] font-black text-white tracking-[0.25em] flex items-center gap-4 uppercase drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              <Activity className="w-12 h-12 text-[#f59e0b]" /> DEM INDEX
            </h2>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[800px] bg-gradient-to-t from-[#f59e0b]/30 via-[#111111]/95 to-transparent z-10" />
          <div className="relative z-20 w-full px-16 pb-24 flex flex-col items-center">
            <StaticExportGauge
              widthClass="w-[850px]"
              pctSizeClass="text-[140px]"
              voteSizeClass="text-3xl"
            />
            <StaticExportLegend />
          </div>
        </div>
      </div>

      {/* ── SHARE / EXPORT MODAL ── */}
      {shareModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShareModalOpen(false)}
              className="absolute inset-0 bg-[#030303]/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-4xl bg-[#0a0a0a] border border-[#222222] rounded-[2rem] shadow-2xl flex flex-col md:flex-row overflow-hidden"
            >
              {/* Preview area */}
              <div className="w-full md:w-[60%] bg-[#050505] p-6 flex flex-col items-center justify-center min-h-[400px] relative border-b md:border-b-0 md:border-r border-[#222222]">
                {isGenerating || !previewUrl ? (
                  <div className="flex flex-col items-center text-center">
                    <Loader2 className="w-10 h-10 text-[#f59e0b] animate-spin mb-4" />
                    <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest animate-pulse">
                      Rendering Frame...
                    </p>
                    <p className="text-[9px] font-mono text-[#666] mt-2">
                      Compiling High-Fidelity Asset
                    </p>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "relative rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-all",
                      exportFormat === "square"
                        ? "w-full max-w-[340px] aspect-square"
                        : "h-full max-h-[500px] aspect-[9/16]",
                    )}
                  >
                    <img
                      src={previewUrl}
                      alt="Export Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="w-full md:w-[40%] p-8 flex flex-col justify-between bg-[#0a0a0a]">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-white">
                      Export Asset
                    </h3>
                    <button
                      onClick={() => setShareModalOpen(false)}
                      className="text-white/40 hover:text-white transition-colors bg-[#111111] p-2 rounded-full border border-[#222222]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-8">
                    <p className="text-[10px] font-bold text-[#666] uppercase tracking-widest">
                      Select Format
                    </p>

                    <button
                      onClick={() => setExportFormat("square")}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left",
                        exportFormat === "square"
                          ? "bg-[#111111] border-[#f59e0b]/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "bg-[#050505] border-[#222222] text-white/50 hover:bg-[#111111]",
                      )}
                    >
                      <ImageIcon
                        className={cn(
                          "w-5 h-5",
                          exportFormat === "square" ? "text-[#f59e0b]" : "",
                        )}
                      />
                      <div>
                        <p className="text-sm font-bold">Square (Feed)</p>
                        <p className="text-[10px] font-mono mt-0.5 opacity-60">
                          1080 x 1080 px
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportFormat("portrait")}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left",
                        exportFormat === "portrait"
                          ? "bg-[#111111] border-[#f59e0b]/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                          : "bg-[#050505] border-[#222222] text-white/50 hover:bg-[#111111]",
                      )}
                    >
                      <Smartphone
                        className={cn(
                          "w-5 h-5",
                          exportFormat === "portrait" ? "text-[#f59e0b]" : "",
                        )}
                      />
                      <div>
                        <p className="text-sm font-bold">Portrait (Story)</p>
                        <p className="text-[10px] font-mono mt-0.5 opacity-60">
                          1080 x 1920 px
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <button
                  onClick={triggerDownload}
                  disabled={isGenerating || !previewUrl}
                  className="w-full py-4 bg-[#f59e0b] hover:bg-[#D4AF37] text-black text-sm font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                >
                  <Download className="w-4 h-4" /> Save to Device
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
};

// ── Public export: wraps the inner widget in the Error Boundary ───────────────
const EfficiencyMeterWidget = (props) => (
  <DEMErrorBoundary>
    <EfficiencyMeterWidgetInner {...props} />
  </DEMErrorBoundary>
);

export default EfficiencyMeterWidget;
