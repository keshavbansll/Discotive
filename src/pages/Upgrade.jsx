import { Check, Star, Zap } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Upgrade = () => {
  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-12 text-center">
      <div className="mb-12">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Upgrade to Discotive Pro
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-2xl mx-auto">
          Unlock the full power of the Career Operating System. Advanced
          analytics, premium timeline access, and VIP matchmaking.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
        {/* Basic Plan */}
        <div className="bg-white dark:bg-[#121212] p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Basic OS
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Essential tools to track your progress.
          </p>
          <div className="mb-8">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              Free
            </span>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              "Basic Dashboard Metrics",
              "Standard Global Leaderboard",
              "Public Opportunities List",
              "Basic Profile Hosting",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-slate-600 dark:text-slate-300 text-sm font-medium"
              >
                <Check className="w-5 h-5 text-slate-400 shrink-0" /> {feature}
              </li>
            ))}
          </ul>
          <button className="w-full py-3.5 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 dark:from-[#1a1a1a] dark:to-black p-8 md:p-10 rounded-3xl border border-primary-500 shadow-2xl relative transform md:-translate-y-4">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Star className="w-3.5 h-3.5 fill-current" /> MOST POPULAR
          </div>
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            Discotive Pro <Zap className="w-5 h-5 text-amber-400" />
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            The ultimate deterministic execution engine.
          </p>
          <div className="mb-8 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">₹499</span>
            <span className="text-slate-400 font-medium">/month</span>
          </div>
          <ul className="space-y-4 mb-8">
            {[
              "Interactive Gantt Timeline & Diary Engine",
              "AI-Powered Resume ATS Optimization",
              "Predictive Placement Probability Chart",
              "Priority Application to Top Companies",
              "1-on-1 Mentor Direct Messaging",
            ].map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-slate-200 text-sm font-medium"
              >
                <Check className="w-5 h-5 text-primary-400 shrink-0" />{" "}
                {feature}
              </li>
            ))}
          </ul>
          <button className="w-full py-3.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02]">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
