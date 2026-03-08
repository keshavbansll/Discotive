import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// Dummy data to match your screenshot
const topThree = [
  {
    rank: 2,
    name: "Sarah Chen",
    score: 892,
    initials: "SC",
    color: "from-slate-400 to-slate-600",
    ring: "ring-slate-400",
  },
  {
    rank: 1,
    name: "Alex Kumar",
    score: 915,
    initials: "AK",
    color: "from-amber-300 to-yellow-600",
    ring: "ring-yellow-500",
    isKing: true,
  },
  {
    rank: 3,
    name: "Priya Sharma",
    score: 878,
    initials: "PS",
    color: "from-amber-700 to-orange-900",
    ring: "ring-orange-700",
  },
];

const leaderboardData = [
  {
    rank: 4,
    name: "Rahul Singh",
    institution: "VIT Vellore",
    score: 865,
    initials: "RS",
    trend: "down",
  },
  {
    rank: 5,
    name: "Anita Desai",
    institution: "Manipal University",
    score: 850,
    initials: "AD",
    trend: "up",
  },
  {
    rank: 6,
    name: "Vikram Patel",
    institution: "SRM Institute",
    score: 842,
    initials: "VP",
    trend: "same",
  },
  {
    rank: 7,
    name: "Neha Gupta",
    institution: "JECRC Foundation",
    score: 831,
    initials: "NG",
    trend: "down",
  },
];

const Leaderboard = () => {
  return (
    <div className="max-w-[1000px] mx-auto space-y-16 pt-10">
      {/* HEADER */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/20"
        >
          <Trophy className="w-8 h-8 text-yellow-500" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-white"
        >
          Global Leaderboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-400 font-medium text-lg"
        >
          See how your Discotive Score stacks up against top engineering talent.
        </motion.p>
      </div>

      {/* THE PODIUM */}
      <div className="flex justify-center items-end gap-4 md:gap-6 h-64 mt-20">
        {topThree.map((user, idx) => (
          <motion.div
            key={user.rank}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.2 + idx * 0.1,
              type: "spring",
              stiffness: 100,
            }}
            className={cn(
              "relative flex flex-col items-center w-32 md:w-40",
              user.rank === 1 ? "z-20 -translate-y-8" : "z-10",
            )}
          >
            {/* Avatar Circle */}
            <div
              className={cn(
                "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl font-extrabold shadow-2xl z-20 absolute -top-10",
                `bg-gradient-to-br ${user.color} ring-4 ring-[#0a0a0a]`,
                user.isKing
                  ? "text-black drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                  : "text-white",
              )}
            >
              {user.initials}
              {user.isKing && (
                <span className="absolute -top-6 text-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-bounce">
                  👑
                </span>
              )}
            </div>

            {/* Podium Base */}
            <div
              className={cn(
                "w-full rounded-t-3xl border-t border-x bg-[#121212] flex flex-col items-center justify-end pb-6 pt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
                user.rank === 1
                  ? "h-48 border-yellow-500/30"
                  : "h-40 border-white/5",
                user.rank === 2 && "border-slate-400/30",
                user.rank === 3 && "border-orange-700/30",
              )}
            >
              <Trophy
                className={cn(
                  "w-6 h-6 mb-2",
                  user.rank === 1
                    ? "text-yellow-500"
                    : user.rank === 2
                      ? "text-slate-400"
                      : "text-orange-600",
                )}
              />
              <h3 className="font-bold text-white text-sm whitespace-nowrap">
                {user.name}
              </h3>
              <p className="font-extrabold text-xl mt-1 tracking-tight text-white">
                {user.score}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* THE TABLE */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 bg-[#1a1a1a] text-xs font-bold text-slate-500 uppercase tracking-widest">
          <div className="col-span-2 md:col-span-1">Rank</div>
          <div className="col-span-7 md:col-span-5">Student</div>
          <div className="hidden md:block md:col-span-4">Institution</div>
          <div className="col-span-3 md:col-span-2 text-right">Score</div>
        </div>

        <div className="divide-y divide-white/5">
          {leaderboardData.map((user, idx) => (
            <div
              key={user.rank}
              className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-white/5 transition-colors group"
            >
              <div className="col-span-2 md:col-span-1 font-bold text-slate-400 group-hover:text-white transition-colors">
                #{user.rank}
              </div>

              <div className="col-span-7 md:col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#222] border border-white/10 flex items-center justify-center text-xs font-bold shrink-0 text-slate-300 group-hover:border-white/30 transition-colors">
                  {user.initials}
                </div>
                <span className="font-bold text-sm text-white">
                  {user.name}
                </span>
              </div>

              <div className="hidden md:block md:col-span-4 text-sm text-slate-400">
                {user.institution}
              </div>

              <div className="col-span-3 md:col-span-2 flex items-center justify-end gap-2">
                {user.trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                )}
                {user.trend === "down" && (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                {user.trend === "same" && (
                  <Minus className="w-4 h-4 text-slate-600" />
                )}
                <span className="font-extrabold text-white">{user.score}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* STICKY BOTTOM USER BAR */}
      <div className="fixed bottom-0 left-0 md:left-20 lg:left-72 right-0 bg-white border-t border-slate-200 p-4 md:p-6 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-extrabold shadow-inner">
            JD
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Your Current Standing
            </p>
            <p className="font-bold text-black text-lg">John Doe</p>
          </div>
        </div>
        <div className="flex items-center gap-8 text-right">
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Global Rank
            </p>
            <p className="font-extrabold text-slate-300 text-2xl">#421</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Discotive Score
            </p>
            <p className="font-extrabold text-black text-2xl flex items-center gap-2">
              742 <TrendingUp className="w-5 h-5 text-green-500" />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
