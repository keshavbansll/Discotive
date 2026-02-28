import {
  ShieldCheck,
  Zap,
  Code,
  Briefcase,
  Activity,
  Users,
  TrendingUp,
} from "lucide-react";

const ScoreCard = ({ title, score, maxScore, icon: Icon, colorClass }) => {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${colorClass}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-200">
            {title}
          </h4>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-white">
          {score}
          <span className="text-slate-400 font-normal">/{maxScore}</span>
        </span>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: "currentColor" }}
        ></div>
      </div>
    </div>
  );
};

const Score = () => {
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Discotive Score
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Your universal career credibility and placement readiness metric.
        </p>
      </div>

      {/* Main Score Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-900 dark:to-dark rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden border border-slate-800 mb-8">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-primary-600 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-emerald-500 rounded-full blur-3xl opacity-10"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-8">
            {/* Circular Progress Placeholder */}
            <div className="relative flex items-center justify-center w-40 h-40 bg-slate-800/50 rounded-full border-[6px] border-slate-700">
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                <circle
                  cx="74"
                  cy="74"
                  r="68"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-primary-500"
                  strokeDasharray="427"
                  strokeDashoffset="111"
                />
              </svg>
              <div className="text-center">
                <span className="block text-5xl font-extrabold tracking-tight">
                  742
                </span>
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-1">
                  Excellent
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-primary-400" />
                Highly Competitive Profile
              </h3>
              <p className="text-slate-300 mt-2 max-w-md leading-relaxed">
                You are currently in the top 5% of 1st-year CSE students.
                Increasing your 'Project Quality' will push you into the elite
                bracket.
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 text-center w-full md:w-auto">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-slate-300 font-medium">Weekly Growth</p>
            <p className="text-2xl font-bold text-emerald-400">+12 Points</p>
          </div>
        </div>
      </div>

      {/* Metrics Breakdown Grid */}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        Diagnostic Breakdown
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="text-primary-500">
          <ScoreCard
            title="Technical Skills"
            score={180}
            maxScore={200}
            icon={Code}
            colorClass="text-primary-600 dark:text-primary-400"
          />
        </div>
        <div className="text-indigo-500">
          <ScoreCard
            title="Project Portfolio"
            score={140}
            maxScore={250}
            icon={Activity}
            colorClass="text-indigo-600 dark:text-indigo-400"
          />
        </div>
        <div className="text-emerald-500">
          <ScoreCard
            title="Experience & Internships"
            score={90}
            maxScore={250}
            icon={Briefcase}
            colorClass="text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <div className="text-amber-500">
          <ScoreCard
            title="Consistency Streak"
            score={190}
            maxScore={200}
            icon={Zap}
            colorClass="text-amber-600 dark:text-amber-400"
          />
        </div>
        <div className="text-rose-500">
          <ScoreCard
            title="Professional Network"
            score={142}
            maxScore={100}
            icon={Users}
            colorClass="text-rose-600 dark:text-rose-400"
          />
        </div>
      </div>
    </div>
  );
};

export default Score;
