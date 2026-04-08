import { Handle, Position } from "reactflow";

import { BookOpen, PenLine } from "lucide-react";
import React, { memo } from "react";

export const JournalNode = memo(({ data, selected }) => {
  const borderColor = selected
    ? "rgba(139,92,246,0.5)"
    : "rgba(255,255,255,0.07)";

  return (
    <div
      className="relative flex flex-col overflow-hidden transition-all duration-200"
      style={{
        width: 250,
        borderRadius: 12,
        background: "#0d0d12",
        border: `1px solid ${borderColor}`,
        boxShadow: selected
          ? "0 4px 20px rgba(0,0,0,0.75)"
          : "0 1px 6px rgba(0,0,0,0.5)",
        transform: selected ? "scale(1.012)" : "scale(1)",
      }}
      role="article"
      aria-label={`Journal${data.date ? ` — ${data.date}` : ""}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{ ...HANDLE_S, borderColor: "rgba(139,92,246,0.5)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...HANDLE_S, borderColor: "rgba(139,92,246,0.5)" }}
      />

      {/* Accent bar */}
      <div
        style={{
          height: 2,
          background: "#8b5cf6",
          opacity: selected ? 0.9 : 0.5,
        }}
      />

      <div style={{ padding: "10px 12px 12px" }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.2)",
              flexShrink: 0,
            }}
          >
            <BookOpen style={{ width: 12, height: 12, color: "#8b5cf6" }} />
          </div>
          <div>
            <p
              className="font-black uppercase tracking-widest"
              style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}
            >
              Execution Log
            </p>
            {data.date && (
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>
                {new Date(data.date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Entry */}
        {data.entry ? (
          <p
            className="leading-relaxed line-clamp-4"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.50)" }}
          >
            {data.entry}
          </p>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-1.5 py-3"
            style={{
              border: "1px dashed rgba(255,255,255,0.08)",
              borderRadius: 8,
            }}
          >
            <PenLine
              style={{ width: 14, height: 14, color: "rgba(255,255,255,0.2)" }}
            />
            <p
              className="font-bold uppercase tracking-widest"
              style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}
            >
              No entry recorded
            </p>
          </div>
        )}

        {data.mood && (
          <div
            className="flex items-center gap-1.5 mt-2.5 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.25)",
                fontWeight: 600,
              }}
            >
              State:
            </span>
            <span style={{ fontSize: 11 }}>{data.mood}</span>
          </div>
        )}
      </div>
    </div>
  );
});
JournalNode.displayName = "JournalNode";
