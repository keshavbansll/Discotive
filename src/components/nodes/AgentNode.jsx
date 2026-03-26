/**
 * @fileoverview Agent Node Architecture
 * @module components/nodes/AgentNode
 * @description A high-performance, strictly memoized node representing an AI Agent.
 */

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { motion } from "framer-motion";

const AgentNode = ({ data, selected, isConnectable }) => {
  // Compute active state based on selection or upstream active flow
  const isActive = selected || data.isInActivePath;
  const opacity = data.isFaded ? 0.3 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity, scale: 1 }}
      className={`relative w-[280px] rounded-xl border bg-[#0d0d0d] p-4 transition-all duration-300 ${
        isActive
          ? "border-amber-500 shadow-[0_0_20px_rgba(202,138,4,0.15)]"
          : "border-[#1e1e1e] hover:border-[#333]"
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="h-3 w-3 border-2 border-[#0d0d0d] bg-amber-500"
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            {/* Brain/Agent Icon SVG Path here */}
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white tracking-tight">
            {data.label || "Universal Agent"}
          </h3>
          <p className="text-[10px] text-[#666] uppercase tracking-wider">
            {data.model || "Gemini 3.1 Pro"}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-[#111] p-2">
        <p className="text-xs text-[#888] line-clamp-2 leading-relaxed">
          {data.systemPrompt || "No system prompt configured."}
        </p>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="h-3 w-3 border-2 border-[#0d0d0d] bg-amber-500"
      />
    </motion.div>
  );
};

// Strict memoization: Only re-render if data payload, selection, or fade state changes.
export default memo(AgentNode, (prevProps, nextProps) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.isFaded === nextProps.data.isFaded &&
    prevProps.data.isInActivePath === nextProps.data.isInActivePath &&
    prevProps.data.label === nextProps.data.label &&
    prevProps.data.systemPrompt === nextProps.data.systemPrompt
  );
});
