import { Trophy, Medal, TrendingUp, Minus, ChevronUp } from "lucide-react";

const Leaderboard = () => {
  // Production-grade mock data for the ranking engine
  const topThree = [
    {
      rank: 2,
      name: "Sarah Chen",
      university: "BITS Pilani",
      score: 892,
      change: "up",
      avatar: "SC",
    },
    {
      rank: 1,
      name: "Alex Kumar",
      university: "IIT Delhi",
      score: 915,
      change: "same",
      avatar: "AK",
    },
    {
      rank: 3,
      name: "Priya Sharma",
      university: "JECRC Foundation",
      score: 878,
      change: "up",
      avatar: "PS",
    },
  ];

  const peerRankings = [
    {
      rank: 4,
      name: "Rahul Singh",
      university: "VIT Vellore",
      score: 865,
      change: "down",
      avatar: "RS",
    },
    {
      rank: 5,
      name: "Anita Desai",
      university: "Manipal University",
      score: 850,
      change: "up",
      avatar: "AD",
    },
    {
      rank: 6,
      name: "Vikram Patel",
      university: "SRM Institute",
      score: 842,
      change: "same",
      avatar: "VP",
    },
    {
      rank: 7,
      name: "Neha Gupta",
      university: "JECRC Foundation",
      score: 831,
      change: "down",
      avatar: "NG",
    },
  ];

  // Utility to render the trend icon
  const renderTrend = (change) => {
    if (change === "up")
      return <ChevronUp className="w-4 h-4 text-emerald-500" />;
    if (change === "down")
      return <ChevronUp className="w-4 h-4 text-rose-500 rotate-180" />;
    return <Minus className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          Global Leaderboard
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          See how your Discotive Score stacks up against top engineering talent.
        </p>
      </div>

      {/* The Podium (Top 3) */}
      <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 h-64 mt-10">
        {/* Rank 2 */}
        <div className="flex flex-col items-center w-28 md:w-36">
          <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-300 shadow-lg border-4 border-slate-300 dark:border-slate-600 mb-3 z-10">
            {topThree[0].avatar}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800/80 rounded-t-2xl h-32 flex flex-col items-center pt-4 border-t border-x border-slate-300 dark:border-slate-700 shadow-inner">
            <Medal className="w-6 h-6 text-slate-400 mb-1" />
            <span className="font-bold text-slate-900 dark:text-white truncate w-full text-center px-2">
              {topThree[0].name}
            </span>
            <span className="text-primary-600 dark:text-primary-400 font-extrabold mt-1">
              {topThree[0].score}
            </span>
          </div>
        </div>

        {/* Rank 1 */}
        <div className="flex flex-col items-center w-32 md:w-44">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center text-2xl font-bold text-amber-900 shadow-xl border-4 border-amber-300 mb-3 z-10 relative">
            <div className="absolute -top-3">👑</div>
            {topThree[1].avatar}
          </div>
          <div className="w-full bg-gradient-to-t from-amber-500/10 to-amber-500/20 dark:from-amber-500/5 dark:to-amber-500/10 rounded-t-2xl h-40 flex flex-col items-center pt-4 border-t border-x border-amber-500/30 shadow-inner">
            <Trophy className="w-8 h-8 text-amber-500 mb-1" />
            <span className="font-bold text-slate-900 dark:text-white truncate w-full text-center px-2">
              {topThree[1].name}
            </span>
            <span className="text-amber-600 dark:text-amber-500 font-extrabold mt-1 text-lg">
              {topThree[1].score}
            </span>
          </div>
        </div>

        {/* Rank 3 */}
        <div className="flex flex-col items-center w-28 md:w-36">
          <div className="w-16 h-16 rounded-full bg-amber-700/20 flex items-center justify-center text-xl font-bold text-amber-700 dark:text-amber-600 shadow-lg border-4 border-amber-700/30 mb-3 z-10">
            {topThree[2].avatar}
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800/80 rounded-t-2xl h-24 flex flex-col items-center pt-3 border-t border-x border-slate-300 dark:border-slate-700 shadow-inner">
            <Medal className="w-6 h-6 text-amber-700 dark:text-amber-600 mb-1" />
            <span className="font-bold text-slate-900 dark:text-white truncate w-full text-center px-2">
              {topThree[2].name}
            </span>
            <span className="text-primary-600 dark:text-primary-400 font-extrabold mt-1">
              {topThree[2].score}
            </span>
          </div>
        </div>
      </div>

      {/* List Rankings */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="col-span-2 md:col-span-1 text-center">Rank</div>
          <div className="col-span-6 md:col-span-5">Student</div>
          <div className="col-span-hidden md:col-span-4 hidden md:block">
            Institution
          </div>
          <div className="col-span-4 md:col-span-2 text-right pr-4">Score</div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {peerRankings.map((user) => (
            <div
              key={user.rank}
              className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="col-span-2 md:col-span-1 flex items-center justify-center gap-1">
                <span className="font-bold text-slate-500 dark:text-slate-400">
                  #{user.rank}
                </span>
              </div>

              <div className="col-span-6 md:col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                  {user.avatar}
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 md:hidden truncate">
                    {user.university}
                  </p>
                </div>
              </div>

              <div className="col-span-hidden md:col-span-4 hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400">
                {user.university}
              </div>

              <div className="col-span-4 md:col-span-2 flex items-center justify-end gap-3 pr-4">
                {renderTrend(user.change)}
                <span className="font-bold text-primary-600 dark:text-primary-400">
                  {user.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current User Sticky Bar */}
      <div className="fixed bottom-0 left-0 md:left-72 right-0 bg-primary-600 text-white p-4 shadow-[0_-10px_40px_rgba(37,99,235,0.2)] z-20 flex justify-between items-center px-8 backdrop-blur-md bg-opacity-95 border-t border-primary-500">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
            JD
          </div>
          <div>
            <p className="text-xs text-primary-200 font-medium uppercase tracking-wider">
              Your Current Standing
            </p>
            <p className="font-bold text-lg">John Doe</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-primary-200 font-medium uppercase tracking-wider">
              Global Rank
            </p>
            <p className="font-extrabold text-2xl">#421</p>
          </div>
          <div className="hidden md:block w-px h-8 bg-primary-500"></div>
          <div className="hidden md:block text-right">
            <p className="text-xs text-primary-200 font-medium uppercase tracking-wider">
              Discotive Score
            </p>
            <p className="font-extrabold text-2xl flex items-center gap-2">
              742 <TrendingUp className="w-5 h-5 text-emerald-300" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
