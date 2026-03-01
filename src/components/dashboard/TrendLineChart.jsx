import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

// Production-grade historical mock data
const trendData = [
  { month: "Jan", readiness: 42 },
  { month: "Feb", readiness: 51 },
  { month: "Mar", readiness: 61 },
  { month: "Apr", readiness: 70 },
  { month: "May", readiness: 78 },
];

// Custom Tooltip for that premium dark-mode feel
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 dark:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl border border-slate-700">
        <p className="text-slate-400 mb-1">{label}</p>
        <p className="text-emerald-400">Readiness: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const TrendLineChart = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm h-full flex flex-col hover:border-primary-500/30 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Placement Readiness Trend
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Historical trajectory over 5 months
          </p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            {/* Clean, subtle grid lines */}
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#64748b"
              strokeOpacity={0.15}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              domain={[0, 100]}
              dx={-10}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#64748b",
                strokeWidth: 1,
                strokeDasharray: "3 3",
              }}
            />
            <Line
              type="monotone"
              dataKey="readiness"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 6, fill: "#60a5fa", strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TrendLineChart;
