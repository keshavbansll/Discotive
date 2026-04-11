import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";
import { Activity, Target, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { useScoreHistory } from "../../hooks/useDashboardData";

const ScoreTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-[#BFA264]/25 rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none">
      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-0.5">
        {label}
      </p>
      <p className="text-xl font-black text-white font-mono">
        {payload[0].value?.toLocaleString()}
      </p>
    </div>
  );
};

export const TelemetryEngine = ({ userData }) => {
  const [chartTf, setChartTf] = useState("1M");
  const { data: rawHistory = [], isLoading } = useScoreHistory(chartTf);
  const GRAD_ID = "telemetryGrad";

  const score = userData?.discotiveScore?.current ?? 0;
  const last24h = userData?.discotiveScore?.last24h ?? score;
  const delta = score - last24h;
  const skills = userData?.skills?.alignedSkills || [];
  const allies = (userData?.allies || []).length;
  const views = userData?.profileViews || 0;
  const vault = userData?.vault || [];
  const vss = (() => {
    const v = vault.filter((a) => a.status === "VERIFIED");
    if (!v.length) return 0;
    const pts = v.reduce(
      (s, a) =>
        s + (a.strength === "Strong" ? 30 : a.strength === "Medium" ? 20 : 10),
      0,
    );
    return Math.min(Math.round((pts / (v.length * 30)) * 100), 100);
  })();

  const radarData = [
    { metric: "Execution", score: Math.min((score / 5000) * 100, 100) },
    { metric: "Skills", score: Math.min((skills.length / 10) * 100, 100) },
    { metric: "Network", score: Math.min((allies / 20) * 100, 100) },
    { metric: "Vault", score: vss },
    { metric: "Reach", score: Math.min((views / 100) * 100, 100) },
  ];

  const chartData = rawHistory.map((e, i) => ({
    day: new Date(e.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    score: e.score,
    prev: i > 0 ? rawHistory[i - 1].score : null,
  }));
  const chartMin = chartData.length
    ? Math.max(0, Math.min(...chartData.map((d) => d.score)) - 30)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Score chart */}
      <div className="xl:col-span-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 flex flex-col min-h-[280px]">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-[#BFA264]" />
              Score Trajectory
            </h3>
            <div className="flex items-end gap-3">
              <span className="text-4xl font-black text-white font-mono tracking-tighter leading-none">
                {score.toLocaleString()}
              </span>
              {delta !== 0 && (
                <div
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black font-mono mb-1 border",
                    delta > 0
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/20 text-rose-400",
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {delta > 0 ? `+${delta}` : delta} today
                </div>
              )}
            </div>
          </div>
          <div className="flex bg-[#050505] border border-[#1a1a1a] rounded-xl p-1 gap-0.5">
            {["1W", "1M", "ALL"].map((t) => (
              <button
                key={t}
                onClick={() => setChartTf(t)}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                  chartTf === t
                    ? "bg-[#BFA264]/15 text-[#BFA264]"
                    : "text-white/25 hover:text-white/60",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-h-[140px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#BFA264]/30 animate-pulse" />
            </div>
          ) : chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height="100%" minHeight={140}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -32, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={GRAD_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#BFA264" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#BFA264" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  hide={chartData.length > 14}
                  tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis domain={[chartMin, "auto"]} hide />
                <RechartsTooltip
                  content={<ScoreTooltip />}
                  cursor={{
                    stroke: "rgba(191,162,100,0.2)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#BFA264"
                  strokeWidth={2.5}
                  fill={`url(#${GRAD_ID})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#BFA264",
                    stroke: "#000",
                    strokeWidth: 2,
                  }}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[10px] text-white/15">
              Execute tasks to build score history.
            </div>
          )}
        </div>
      </div>

      {/* Radar */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-5 flex flex-col">
        <h3 className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
          <Target className="w-3.5 h-3.5 text-[#BFA264]" />
          Operator Radar
        </h3>
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={160}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{
                  fill: "rgba(255,255,255,0.3)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
              <Radar
                dataKey="score"
                stroke="#BFA264"
                strokeWidth={2}
                fill="#BFA264"
                fillOpacity={0.15}
                dot={{ r: 2.5, fill: "#BFA264", strokeWidth: 0 }}
                animationDuration={800}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5 pt-3 border-t border-white/[0.04]">
          {radarData.map((d) => (
            <div key={d.metric} className="flex items-center gap-2">
              <span className="text-[9px] text-white/25 font-bold w-16 shrink-0 uppercase tracking-widest">
                {d.metric}
              </span>
              <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${d.score}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-[#BFA264]/60 rounded-full"
                />
              </div>
              <span className="text-[9px] font-black font-mono text-white/30 w-7 text-right">
                {Math.round(d.score)}
              </span>
            </div>
          ))}
        </div>
        {/* Actionable CTA */}
        <div className="mt-3 p-2.5 bg-[#BFA264]/5 border border-[#BFA264]/15 rounded-xl text-center">
          <p className="text-[9px] font-bold text-[#BFA264]/60">
            {vss < 50
              ? "Verify assets to boost Vault score →"
              : skills.length < 5
                ? "Add skills to widen your radar →"
                : "Network to grow your Reach score →"}
          </p>
        </div>
      </div>
    </div>
  );
};
