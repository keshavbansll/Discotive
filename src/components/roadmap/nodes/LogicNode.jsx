/**
 * @fileoverview LogicNode — Mathematical Gate (AND / OR)
 * * Purely structural node used to converge multiple branches.
 */

import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import { NODE_STATES } from "../../../lib/roadmap/constants";

export const LogicNode = memo(({ data, selected }) => {
  const computedState = data._computed?.state || NODE_STATES.LOCKED;
  const isVerified = computedState === NODE_STATES.VERIFIED;
  const logicType = data.logicType || "AND";

  const statusColor = isVerified ? "#10b981" : "rgba(255,255,255,0.15)";
  const bgOpacity = isVerified ? "0.15" : "0.02";

  return (
    <div
      className="relative flex items-center justify-center transition-all duration-300"
      style={{
        width: 48,
        height: 48,
        transform: `rotate(45deg) ${selected ? "scale(1.1)" : "scale(1)"}`,
        background: `rgba(${isVerified ? "16,185,129" : "255,255,255"}, ${bgOpacity})`,
        border: `1px solid ${selected ? statusColor : `${statusColor}80`}`,
        borderRadius: 8,
        boxShadow: isVerified ? `0 0 15px ${statusColor}40` : "none",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          ...HANDLE_S,
          transform: "rotate(-45deg)",
          borderColor: statusColor,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          ...HANDLE_S,
          transform: "rotate(-45deg)",
          borderColor: statusColor,
        }}
      />

      <div
        style={{ transform: "rotate(-45deg)" }}
        className="text-[9px] font-black tracking-widest text-white/70"
      >
        {logicType}
      </div>
    </div>
  );
});

LogicNode.displayName = "LogicNode";
