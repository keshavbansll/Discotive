import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BentoCard from "../components/ui/BentoCard";
import { Skeleton } from "../components/ui/Skeleton";
import {
  ChevronRight,
  TrendingUp,
  Clock,
  Target,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useUserData } from "../hooks/useUserData"; // <-- Import the engine

const Dashboard = () => {
  const [greeting, setGreeting] = useState("");
  const { userData, loading } = useUserData(); // <-- Pull real data from Firebase

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{" "}
            System Online
          </p>
          {loading ? (
            <Skeleton className="w-80 h-12 mt-2 mb-4" />
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tighter"
            >
              {greeting},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-500">
                {userData?.identity?.firstName || "Builder"}.
              </span>
            </motion.h1>
          )}
          {loading ? (
            <Skeleton className="w-64 h-6" />
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400 font-medium mt-2"
            >
              You are <span className="text-white font-bold">14 days</span> into
              your execution streak.
            </motion.p>
          )}
        </div>
        {!loading && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 w-fit"
          >
            Log Daily Execution <ArrowUpRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* THE BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* CARD 1: Priority Execution */}
        <BentoCard className="md:col-span-2 lg:col-span-2 bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-400" /> Today's Imperatives
            </h2>
            {!loading && (
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">
                3 Remaining
              </span>
            )}
          </div>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {loading ? (
              <>
                <Skeleton className="w-full h-16 rounded-2xl" />
                <Skeleton className="w-full h-16 rounded-2xl" />
              </>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#121212] border border-white/5 hover:border-white/20 transition-colors cursor-pointer group"
                >
                  <div className="mt-0.5">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-slate-300 transition-colors">
                      Setup {userData?.vision?.passion || "Career"} Blueprint
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Est. 2 hours
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#121212] border border-white/5 hover:border-white/20 transition-colors cursor-pointer group"
                >
                  <div className="mt-0.5">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-600 group-hover:border-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-slate-300 transition-colors">
                      Review 3-Month Goal:{" "}
                      {userData?.vision?.goal3Months || "Secure Internship"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500" /> High
                      Priority
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </BentoCard>

        {/* CARD 2: The Discotive Score */}
        <BentoCard className="bg-gradient-to-br from-[#121212] to-[#0a0a0a]">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
            Global Score
          </h2>
          {loading ? (
            <Skeleton className="w-32 h-16 mb-6" />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-end gap-3 mb-6"
            >
              <span className="text-6xl font-extrabold tracking-tighter text-white">
                {userData?.discotiveScore || 500}
              </span>
              <span className="text-sm font-bold text-green-400 flex items-center mb-2">
                <TrendingUp className="w-4 h-4 mr-1" /> +12
              </span>
            </motion.div>
          )}
          {loading ? (
            <Skeleton className="w-full h-2 mb-4 rounded-full" />
          ) : (
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${(userData?.discotiveScore || 500) / 10}%`,
                }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-white rounded-full"
              />
            </div>
          )}
        </BentoCard>

        {/* CARD 3: Financial Pulse */}
        <BentoCard>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
            Net Capital
          </h2>
          {loading ? (
            <Skeleton className="w-32 h-10 mb-6" />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-4xl font-extrabold tracking-tighter mb-6"
            >
              ₹0.0k
            </motion.div>
          )}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="w-full h-5" />
              <Skeleton className="w-full h-5" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 text-center py-2"
            >
              <span className="text-sm font-medium text-slate-500">
                Connect a financial account to start tracking.
              </span>
            </motion.div>
          )}
        </BentoCard>
      </div>
    </div>
  );
};

export default Dashboard;
