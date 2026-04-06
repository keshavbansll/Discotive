import React, { useState, memo } from "react";
import { Handle, Position } from "reactflow";
import {
  Video,
  Check,
  ShieldAlert,
  Play,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "../../../lib/cn";
import { useRoadmap } from "../../../contexts/RoadmapContext.jsx";
import { useYouTubePlayer } from "../../../hooks/useYouTubePlayer";

const HANDLE_S = {
  width: 9,
  height: 9,
  background: "#1a1a20",
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderRadius: "50%",
};

export const VideoWidgetNode = memo(({ id, data, selected }) => {
  const { openVideoModal, markVideoWatched } = useRoadmap();
  const [showIntercept, setShowIntercept] = useState(false);
  const { containerRef, isReady, progress } = useYouTubePlayer(data.youtubeId);
  const watchPct = progress?.percentage || 0;
  const isWatched = !!data.isWatched;

  const borderColor = selected
    ? "rgba(56,189,248,0.45)"
    : "rgba(255,255,255,0.07)";

  const handleMark = (e) => {
    e.stopPropagation();
    if (watchPct < 90 && !isWatched) setShowIntercept(true);
    else {
      markVideoWatched(id, { earned: 10, message: "+10 pts — video logged" });
    }
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden transition-all duration-200"
      style={{
        width: 260,
        borderRadius: 12,
        background: "#0d0d12",
        border: `1px solid ${borderColor}`,
        boxShadow: selected
          ? "0 4px 20px rgba(0,0,0,0.75)"
          : "0 1px 6px rgba(0,0,0,0.5)",
        transform: selected ? "scale(1.012)" : "scale(1)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...HANDLE_S, borderColor: "rgba(56,189,248,0.5)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_S, borderColor: "rgba(56,189,248,0.5)" }}
      />

      {/* Accent bar */}
      <div
        style={{
          height: 2,
          background: "#38bdf8",
          opacity: selected ? 0.9 : 0.5,
        }}
      />

      {/* Intercept overlay */}
      {showIntercept && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center p-4 text-center"
          style={{ background: "rgba(13,13,18,0.97)", borderRadius: 11 }}
        >
          <ShieldAlert
            style={{ width: 28, height: 28, color: "#f59e0b", marginBottom: 8 }}
          />
          <p className="text-white font-bold text-xs mb-1">Incomplete Watch</p>
          <p className="text-white/40 text-[10px] mb-4 leading-relaxed">
            {Math.floor(watchPct)}% watched — score will be proportional.
          </p>
          <div className="flex gap-2 w-full">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowIntercept(false);
              }}
              className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white/50 hover:text-white transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Resume
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowIntercept(false);
                markVideoWatched(id, {
                  earned: Math.round((watchPct / 100) * 10),
                  message: `+${Math.round((watchPct / 100) * 10)} pts`,
                });
              }}
              className="flex-1 py-2 rounded-lg text-[10px] font-black text-black transition-colors"
              style={{ background: "#38bdf8" }}
            >
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Video area */}
      {data.youtubeId ? (
        <div
          className="relative"
          style={{ aspectRatio: "16/9", background: "#000" }}
        >
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: "auto" }}
          />
          {/* Watch progress */}
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 2, background: "rgba(255,255,255,0.08)" }}
          >
            <div
              style={{
                height: "100%",
                width: `${watchPct}%`,
                background: "#38bdf8",
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3"
          style={{
            aspectRatio: "16/9",
            background: "rgba(56,189,248,0.04)",
            border: "1px dashed rgba(56,189,248,0.2)",
            margin: "8px",
            borderRadius: 8,
          }}
        >
          <Video
            style={{ width: 24, height: 24, color: "rgba(255,255,255,0.2)" }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              openVideoModal(id);
            }}
            className="pointer-events-auto px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-black transition-all"
            style={{ background: "#38bdf8" }}
          >
            Link Video
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p
            className="font-bold truncate"
            style={{
              fontSize: 11,
              color: isWatched
                ? "rgba(255,255,255,0.3)"
                : "rgba(255,255,255,0.85)",
              textDecoration: isWatched ? "line-through" : "none",
            }}
          >
            {data.title || "Video"}
          </p>
          {data.learnId && (
            <p className="text-[9px] font-mono text-white/25 truncate mt-0.5">
              {data.learnId.split("_").slice(-1)[0]}
            </p>
          )}
        </div>

        {data.youtubeId && (
          <button
            onClick={handleMark}
            disabled={isWatched}
            className="pointer-events-auto ml-2 flex items-center justify-center rounded-lg transition-all"
            style={{
              width: 26,
              height: 26,
              background: isWatched
                ? "rgba(56,189,248,0.1)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${isWatched ? "rgba(56,189,248,0.3)" : "rgba(255,255,255,0.08)"}`,
              cursor: isWatched ? "default" : "pointer",
            }}
          >
            <Check
              style={{
                width: 12,
                height: 12,
                color: isWatched ? "#38bdf8" : "rgba(255,255,255,0.25)",
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
});
VideoWidgetNode.displayName = "VideoWidgetNode";
