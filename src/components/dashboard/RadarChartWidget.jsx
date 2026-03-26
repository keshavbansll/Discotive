/**
 * @fileoverview Tactical Radar Chart Widget
 * @description
 * Visualizes multi-vector competency and skill alignment.
 * Inherits deep dark-mode UI and strictly prevents mock-data rendering.
 */

import React, { useMemo } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Crosshair, Activity } from "lucide-react";

// Custom OS-Themed Tooltip
const RadarTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a0a0a] text-white text-[10px] font-bold px-4 py-3 border border-[#333] shadow-2xl font-mono uppercase tracking-widest">
        <span className="text-[#888] mr-3">{payload[0].payload.metric}:</span>
        <span className="text-amber-500">{payload[0].value} LVL</span>
      </div>
    );
  }
  return null;
};

const RadarChartWidget = ({ rawSkills = [], alignedSkills = [] }) => {
  // Aggregate and format data for the Recharts engine
  const chartData = useMemo(() => {
    // If telemetry exists, map it. Otherwise, return empty to trigger the fallback UI.
    if (rawSkills.length === 0 && alignedSkills.length === 0) return [];

    // Example mapping assuming rawSkills is an array of { name: "React", level: 85 }
    // Adapt this mapping to your actual Firestore data structure
    return rawSkills
      .map((skill) => ({
        metric: skill.name || "UNKNOWN",
        score: skill.level || 0,
        fullMark: 100,
      }))
      .slice(0, 6); // Keep radar legible (max 6 axes)
  }, [rawSkills, alignedSkills]);

  // ============================================================================
  // EMPTY STATE FALLBACK (Zero Telemetry)
  // ============================================================================
  if (chartData.length < 3) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-10 text-center rounded-xl border border-dashed border-[#222] m-2">
        <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#333] animate-[ping_3s_ease-in-out_infinite]" />
          <Crosshair className="w-6 h-6 text-[#444]" />
        </div>
        <span className="text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
          Calibrating Sensors
        </span>
        <span className="text-[9px] text-[#444] mt-2 max-w-[200px] leading-relaxed uppercase tracking-widest">
          Insufficient skill telemetry. Complete technical nodes to map your
          vector.
        </span>
      </div>
    );
  }

  // ============================================================================
  // CHART RENDER ENGINE
  // ============================================================================
  return (
    <div className="w-full h-full absolute inset-0 pb-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
          {/* Brutalist Grid Lines */}
          <PolarGrid stroke="#222" strokeOpacity={0.8} />

          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fill: "#666",
              fontSize: 9,
              fontWeight: 800,
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          />

          <Tooltip content={<RadarTooltip />} cursor={false} />

          <Radar
            name="Operator Vector"
            dataKey="score"
            stroke="#f59e0b" // Amber 500
            strokeWidth={2}
            fill="#f59e0b"
            fillOpacity={0.15}
            dot={{ r: 3, fill: "#000", strokeWidth: 2, stroke: "#f59e0b" }}
            activeDot={{
              r: 5,
              fill: "#f59e0b",
              strokeWidth: 0,
              className: "animate-pulse",
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChartWidget;
