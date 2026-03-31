import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const VelocityTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const color = payload[0].stroke || "#fff";
    return (
      <div className="bg-[#0a0a0a] text-white text-[10px] font-bold px-4 py-3 border border-[#333] shadow-2xl font-mono uppercase tracking-widest">
        <p className="text-[#666] mb-2">{label}</p>
        <p style={{ color }}>Velocity Output: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

const TrendLineChart = ({
  data = [],
  color = "#10b981",
  xKey = "name",
  yKey = "value",
}) => {
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    const sanitizedData = [];

    data.forEach((item) => {
      if (!item) return;

      // 1. Safely extract date
      const rawDate = item[xKey] || item.date || item.month;
      if (!rawDate) return;

      const timestamp = new Date(rawDate).getTime();
      if (isNaN(timestamp)) return; // Drop entries with unparseable dates

      // 2. Safely extract value
      const rawVal =
        item[yKey] !== undefined
          ? item[yKey]
          : item.score !== undefined
            ? item.score
            : item.velocity;
      const numVal = Number(rawVal);

      // 3. CRITICAL: Drop NaN entries completely so the line doesn't break
      if (isNaN(numVal)) return;

      sanitizedData.push({
        timestamp,
        value: Math.max(0, numVal), // Ensure we don't chart negative values visually
      });
    });

    // 4. Sort chronologically to prevent zig-zags
    sanitizedData.sort((a, b) => a.timestamp - b.timestamp);

    // 5. Format X-Axis for clean UI presentation
    return sanitizedData.map((item) => ({
      name: new Date(item.timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      value: item.value,
    }));
  }, [data, xKey, yKey]);

  return (
    <div className="w-full h-full absolute inset-0 pt-4 pb-2 pr-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            vertical={false}
            stroke="#222"
            strokeOpacity={0.8}
          />

          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#555",
              fontSize: 9,
              fontWeight: 800,
              fontFamily: "monospace",
            }}
            dy={10}
          />

          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "#444",
              fontSize: 9,
              fontWeight: 800,
              fontFamily: "monospace",
            }}
            dx={-10}
          />

          <Tooltip
            content={<VelocityTooltip />}
            cursor={{
              stroke: "#333",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#000", strokeWidth: 2, stroke: color }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendLineChart;
