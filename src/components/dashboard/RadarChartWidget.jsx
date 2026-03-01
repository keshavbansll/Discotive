import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Target } from "lucide-react";

// Production-grade data structure for profile evaluation
const profileData = [
  { metric: "Skills", score: 90, fullMark: 100 },
  { metric: "Projects", score: 85, fullMark: 100 },
  { metric: "Experience", score: 65, fullMark: 100 },
  { metric: "Consistency", score: 95, fullMark: 100 },
  { metric: "Network", score: 70, fullMark: 100 },
];

// Custom Tooltip for a premium SaaS feel
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 dark:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl border border-slate-700">
        <span className="text-slate-400 mr-2">
          {payload[0].payload.metric}:
        </span>
        <span className="text-primary-400">{payload[0].value}%</span>
      </div>
    );
  }
  return null;
};

const RadarChartWidget = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm h-full flex flex-col hover:border-primary-500/30 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Profile Strength
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Multi-vector competency analysis
          </p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[250px] relative -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={profileData}>
            {/* Dark mode compatible grid colors */}
            <PolarGrid stroke="#64748b" strokeOpacity={0.2} />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Student Profile"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.4}
              dot={{ r: 3, fill: "#2563eb", strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 5, fill: "#60a5fa", strokeWidth: 0 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartWidget;
