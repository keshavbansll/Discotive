import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Target,
  Zap,
  LayoutDashboard,
} from "lucide-react";

// Reusable animation variants for staggered loading
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark text-slate-900 dark:text-white overflow-hidden selection:bg-primary-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-dark/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              D
            </div>
            <span className="text-2xl font-extrabold tracking-tight">
              Discotive
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden md:block px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/app"
              className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              Open App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Background Glowing Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-600/20 dark:bg-primary-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800/50 text-primary-600 dark:text-primary-400 text-sm font-bold shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>The Infrastructure Layer for Global Career Development</span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] mb-6">
              Stop Guessing. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-blue-400">
                Start Executing.
              </span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.div variants={itemVariants}>
            <p className="text-lg md:text-2xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10 font-medium leading-relaxed">
              Discotive is the AI-powered operating system that converts your
              confusing career future into a clear, visual, step-by-step master
              plan.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link
              to="/app"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white text-lg font-bold rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              <LayoutDashboard className="w-5 h-5" />
              Enter Dashboard
            </Link>
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-900 dark:text-white text-lg font-bold rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full relative z-10"
        >
          <motion.div
            variants={itemVariants}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-left hover:border-primary-500/50 transition-colors group"
          >
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Target className="w-7 h-7 text-amber-600 dark:text-amber-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Discotive Score</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Your universal career credibility metric. Know exactly where your
              profile stands globally.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-left hover:border-primary-500/50 transition-colors group"
          >
            <div className="w-14 h-14 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7 text-primary-600 dark:text-primary-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Timeline Engine</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              A deterministic execution plan showing exactly what to do, when to
              do it, and how.
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-left hover:border-primary-500/50 transition-colors group"
          >
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-emerald-600 dark:text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-3">Placement Probability</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Real-time predictive analytics showing your exact percentage
              chance of placement success.
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default Landing;
