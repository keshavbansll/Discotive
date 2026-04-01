import { Handle, Position } from "reactflow";
import { HANDLE_S } from "../../../lib/roadmap/layout";

import { Trophy, Lock as LockIcon } from "lucide-react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import React, { memo } from "react";

export const MilestoneNode = memo(({ data, selected }) => {
  const isUnlocked = !!data.isUnlocked;

  const accentColor = "#f59e0b";
  const borderColor = selected
    ? `${accentColor}60`
    : isUnlocked
      ? "rgba(245,158,11,0.35)"
      : "rgba(255,255,255,0.07)";

  return (
    <div
      className="relative flex flex-col items-center overflow-hidden transition-all duration-200"
      style={{
        width: 200,
        borderRadius: 12,
        background: "#0d0d12",
        border: `1px solid ${borderColor}`,
        boxShadow: selected
          ? `0 4px 20px rgba(0,0,0,0.75), 0 0 20px ${accentColor}12`
          : isUnlocked
            ? `0 0 12px ${accentColor}08`
            : "0 1px 6px rgba(0,0,0,0.5)",
        transform: selected ? "scale(1.012)" : "scale(1)",
      }}
      role="article"
      aria-label={`Milestone: ${data.title || "Untitled"}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ ...HANDLE_S, borderColor: `${accentColor}50` }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ ...HANDLE_S, borderColor: `${accentColor}50` }}
      />

      {/* Accent bar */}
      <div
        style={{
          height: 2,
          width: "100%",
          background: accentColor,
          opacity: isUnlocked ? (selected ? 0.9 : 0.6) : 0.2,
        }}
      />

      <div
        className="flex flex-col items-center text-center"
        style={{ padding: "14px 16px 14px" }}
      >
        {/* Icon */}
        <div className="relative mb-3">
          {isUnlocked && (
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: 10,
                background: `${accentColor}15`,
                pointerEvents: "none",
              }}
            />
          )}
          <div
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: isUnlocked
                ? `${accentColor}12`
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${isUnlocked ? `${accentColor}30` : "rgba(255,255,255,0.08)"}`,
              position: "relative",
              zIndex: 1,
            }}
          >
            {isUnlocked ? (
              <Trophy style={{ width: 18, height: 18, color: accentColor }} />
            ) : (
              <LockIcon
                style={{
                  width: 16,
                  height: 16,
                  color: "rgba(255,255,255,0.2)",
                }}
              />
            )}
          </div>
        </div>

        <p
          className="font-bold leading-snug mb-0.5"
          style={{ fontSize: 13, color: "rgba(255,255,255,0.88)" }}
        >
          {data.title || "Milestone"}
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>
          {data.subtitle || "Achievement"}
        </p>

        {data.xpReward && (
          <div
            className="flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg"
            style={{
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}20`,
            }}
          >
            <Zap style={{ width: 9, height: 9, color: accentColor }} />
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: `${accentColor}90`,
              }}
            >
              +{data.xpReward} pts on unlock
            </span>
          </div>
        )}
      </div>
    </div>
  );
});
MilestoneNode.displayName = "MilestoneNode";
