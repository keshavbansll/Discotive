import { Activity, Target, Trophy } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, John!
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Here is your career intelligence overview for today.
          </p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow transition-all">
          Update Profile
        </button>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Discotive Score */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Discotive Score
            </h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">
              742
            </span>
            <span className="text-sm font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
              +12 this week
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-5 overflow-hidden">
            <div
              className="bg-primary-600 h-full rounded-full relative"
              style={{ width: "74%" }}
            >
              <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Placement Probability */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Placement Readiness
            </h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">
              78%
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Target: 90%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full relative"
              style={{ width: "78%" }}
            ></div>
          </div>
        </div>

        {/* Global Rank */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Global Rank
            </h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-slate-900 dark:text-white">
              #421
            </span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-md">
              Top 5%
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-5">
            Among 1st Year CSE Students
          </p>
        </div>
      </div>

      {/* We will add the active Roadmap Timeline here in the future */}
    </div>
  );
};

export default Dashboard;
