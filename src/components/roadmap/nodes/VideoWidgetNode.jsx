import React, { useState, memo } from "react";
import { Handle, Position } from "reactflow";
import { Video, Check, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "../../ui/BentoCard";
import { useRoadmap } from "../../../contexts/RoadmapContext.jsx";
import { useYouTubePlayer } from "../../../hooks/useYouTubePlayer";

export const VideoWidgetNode = memo(({ id, data, selected }) => {
  const { openVideoModal, markVideoWatched } = useRoadmap();
  const [showIntercept, setShowIntercept] = useState(false);

  const { containerRef, isReady, progress } = useYouTubePlayer(data.youtubeId);
  const watchPct = progress?.percentage || 0;
  const isWatched = !!data.isWatched;

  const bc = selected
    ? "#38bdf8"
    : isWatched
      ? "rgba(56,189,248,0.3)"
      : "rgba(255,255,255,0.05)";
  const bs = selected
    ? "0 0 50px rgba(56,189,248,0.2)"
    : "0 20px 40px rgba(0,0,0,0.4)";

  const handleMarkComplete = (e) => {
    e.stopPropagation();
    if (watchPct < 90 && !isWatched) setShowIntercept(true);
    else executeCompletion();
  };

  const executeCompletion = () => {
    setShowIntercept(false);
    // Passing the proportional percentage to context to adjust base score
    markVideoWatched(id, watchPct);
  };

  return (
    <div
      className={cn(
        "w-[320px] sm:w-[350px] bg-[#0a0a0c]/95 backdrop-blur-2xl border rounded-[1.5rem] p-3 relative transition-all duration-300 overflow-hidden",
        selected ? "scale-[1.03] z-50" : "scale-100 z-10",
      )}
      style={{ borderColor: bc, boxShadow: bs }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-[#111] !border-2 !border-sky-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-[#111] !border-2 !border-sky-400"
      />

      {/* Intercept Overlay */}
      {showIntercept && (
        <div className="absolute inset-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center rounded-[1.5rem] border border-sky-500/30">
          <ShieldAlert className="w-10 h-10 text-amber-500 mb-4 animate-pulse" />
          <h4 className="text-white font-black text-sm mb-2 uppercase tracking-wide">
            Incomplete Watch Data
          </h4>
          <p className="text-white/50 text-[10px] mb-6 leading-relaxed">
            Platform analytics show{" "}
            <span className="text-amber-500 font-bold">
              {Math.floor(watchPct)}%
            </span>{" "}
            completion. Marking complete now yields mathematically penalized
            career scores.
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowIntercept(false);
              }}
              className="flex-1 py-2.5 bg-[#111] border border-white/[0.05] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10"
            >
              Resume
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                executeCompletion();
              }}
              className="flex-1 py-2.5 bg-sky-500 text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            >
              Accept Penalty
            </button>
          </div>
        </div>
      )}

      {/* Video Embed */}
      {data.youtubeId ? (
        <div className="w-full h-[180px] rounded-xl overflow-hidden relative bg-[#000] border border-white/[0.05]">
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full pointer-events-auto"
          />
          <div className="absolute bottom-0 left-0 h-1.5 bg-white/10 w-full z-10 pointer-events-none">
            <div
              className="h-full bg-sky-500 transition-all duration-1000 shadow-[0_0_10px_rgba(56,189,248,0.8)]"
              style={{ width: `${watchPct}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-[180px] rounded-xl bg-[#0a0a0c] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
          <Video className="w-8 h-8 text-white/20" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              openVideoModal(id);
            }}
            className="px-6 py-2.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-sky-500/20 transition-all"
          >
            Link Media
          </button>
        </div>
      )}

      {/* Meta Footer */}
      <div className="pt-3 pb-1 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h4
            className={cn(
              "text-xs font-black truncate",
              isWatched ? "text-white/40 line-through" : "text-white",
            )}
          >
            {data.title || "External Feed"}
          </h4>
          <p className="text-[8px] font-mono text-white/30 mt-1 flex gap-2">
            <span className="text-sky-400">{data.platform || "YOUTUBE"}</span>
            {data.learnId && <span>// {data.learnId}</span>}
          </p>
        </div>
        {data.youtubeId && (
          <button
            onClick={handleMarkComplete}
            disabled={isWatched}
            className={cn(
              "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all",
              isWatched
                ? "bg-sky-500/10 border-sky-500/30 text-sky-400"
                : "bg-[#111] border-white/10 text-white/20 hover:border-sky-400 hover:text-sky-400",
            )}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
