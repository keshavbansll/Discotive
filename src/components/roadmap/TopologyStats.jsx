/**
 * @fileoverview Discotive Roadmap — Topology Stats Bar
 * Live at-a-glance metrics for the current execution map.
 */

import React, { useMemo } from "react";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Flame,
  TrendingUp,
} from "lucide-react";
import { cn } from "../lib/cn";

export const TopologyStats = ({ nodes, edges }) => {
  const stats = useMemo(() => {
    const exec = nodes.filter((n) => n.type === "executionNode");
    const total = exec.length;
    const completed = exec.filter((n) => n.data?.isCompleted).length;
    const overdue = exec.filter(
      (n) =>
        !n.data?.isCompleted &&
        n.data?.deadline &&
        new Date(n.data.deadline) < new Date(),
    ).length;
    const active = exec.filter(
      (n) => n.data?.priorityStatus === "READY" && !n.data?.isCompleted,
    ).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return [
      { label: "Nodes", value: total, icon: Layers, color: "#f59e0b" },
      { label: "Done", value: `${pct}%`, icon: CheckCircle2, color: "#10b981" },
      { label: "Active", value: active, icon: Flame, color: "#f97316" },
      {
        label: "Overdue",
        value: overdue,
        icon: AlertTriangle,
        color: overdue > 0 ? "#ef4444" : "#333",
      },
      {
        label: "Edges",
        value: edges.length,
        icon: GitBranch,
        color: "#38bdf8",
      },
    ];
  }, [nodes, edges]);

  return (
    <div
      className="flex items-center gap-1"
      role="status"
      aria-label="Map statistics"
    >
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0c]/80 border border-[#1a1a1a] rounded-xl backdrop-blur-sm"
            title={s.label}
          >
            <Icon className="w-3 h-3 shrink-0" style={{ color: s.color }} />
            <span
              className="text-[10px] font-black font-mono"
              style={{ color: s.color }}
            >
              {s.value}
            </span>
            <span className="text-[8px] font-bold text-[#444] uppercase tracking-widest hidden lg:inline">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
