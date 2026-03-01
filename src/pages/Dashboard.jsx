import { Activity, Target, Trophy } from "lucide-react";
import HorizontalTimeline from "../components/dashboard/HorizontalTimeline";
import RadarChartWidget from "../components/dashboard/RadarChartWidget";
import TrendLineChart from "../components/dashboard/TrendLineChart";

const Dashboard = () => {
  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Command Center
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 md:mt-2 text-sm md:text-lg">
            Your global career intelligence overview.
          </p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all w-full sm:w-auto">
          Update Profile
        </button>
      </div>

      {/* 1. Horizontal Timeline (Full Width) */}
      <HorizontalTimeline />

      {/* 2. Core Metrics Grid (3 columns on PC, 1 on Mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Discotive Score */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Discotive Score
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-md">
              Top 12%
            </span>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-none">
              742
            </span>
          </div>
        </div>

        {/* Placement Probability */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Placement Probability
            </h3>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-none text-emerald-500">
              78%
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-4 font-medium">
            Based on your current profile
          </p>
        </div>

        {/* Global Rank */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Global Rank
            </h3>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <span className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-none">
              #421
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-4 font-medium">
            Among 1st Year CSE Students
          </p>
        </div>
      </div>

      {/* 3. Analytical Charts Grid (2 columns on PC, 1 on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
        <TrendLineChart />
        <RadarChartWidget />
      </div>
    </div>
  );
};

export default Dashboard;
