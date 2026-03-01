import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Map,
  Target,
  Briefcase,
  Trophy,
  Settings,
  Bell,
  Search,
  CheckCircle2,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/app" },
  { icon: Map, label: "Roadmap", path: "/app/roadmap" },
  { icon: Target, label: "Score", path: "/app/score" },
  { icon: Briefcase, label: "Opportunities", path: "/app/opportunities" },
  { icon: Trophy, label: "Leaderboard", path: "/app/leaderboard" },
];

const MainLayout = () => {
  const location = useLocation();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden transition-colors duration-200 text-slate-900 dark:text-white">
      {/* PC SIDEBAR */}
      <aside className="hidden md:flex w-72 bg-white dark:bg-[#121212] border-r border-slate-200 dark:border-slate-800 flex-col transition-colors duration-200 z-20">
        <div className="p-8 pb-6 flex items-center gap-3">
          {/* Using the physical logo.png from the public folder */}
          <img
            src="/logo.png"
            alt="Discotive Logo"
            className="w-10 h-10 object-contain rounded-xl shadow-sm bg-primary-600 p-1"
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          {/* Fallback if logo.png is missing or broken */}
          <div className="hidden w-10 h-10 bg-primary-600 rounded-xl items-center justify-center text-white font-bold text-xl shadow-lg">
            D
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Discotive
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-widest font-bold">
              OS
            </p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-2 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path !== "/app" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium",
                  active
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-bold"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/app/settings"
            className={cn(
              "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium",
              location.pathname.startsWith("/app/settings")
                ? "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* TOP NAVIGATION BAR */}
        <header className="h-16 md:h-20 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-10 transition-colors duration-200 z-30 sticky top-0">
          <div className="md:hidden flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-8 h-8 object-contain rounded-lg shadow-sm bg-primary-600 p-0.5"
            />
            <h1 className="text-xl font-extrabold tracking-tight">Discotive</h1>
          </div>

          <div className="hidden md:flex items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-5 py-2.5 w-[24rem] lg:w-[28rem] shadow-inner border border-slate-200 dark:border-slate-800 focus-within:border-primary-500 transition-all">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search skills, roadmap..."
              className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-slate-400"
            />
          </div>

          <div className="flex items-center space-x-4 md:space-x-8">
            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Bell className="w-5 h-5 md:w-6 md:h-6" />
                <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-2 h-2 md:w-2.5 md:h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#121212]"></span>
              </button>

              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotifOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#121212]">
                      <h4 className="font-bold text-sm">Notifications</h4>
                      <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold cursor-pointer">
                        Mark all read
                      </span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                      <div className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex gap-3">
                        <div className="mt-0.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            Profile Strength increased!
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Your score went up by 12 points after adding the
                            React project.
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            2 hours ago
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#121212]">
                      <span className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                        View All Activity
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right Side Icons & Profile */}
            <div className="flex items-center space-x-3 md:space-x-4 md:border-l border-slate-300 dark:border-slate-700 pl-2 md:pl-8">
              {/* CLICKABLE PROFILE LINK */}
              <Link
                to="/app/profile"
                className="flex items-center gap-3 md:gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-bold">John Doe</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    B.Tech CSE
                  </p>
                </div>
                <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-gradient-to-tr from-primary-600 to-blue-400 flex items-center justify-center text-white text-sm md:text-base font-bold shadow-md hover:shadow-lg transition-shadow border-2 border-white dark:border-[#121212]">
                  JD
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 md:pb-10 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM NAVBAR */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-50 px-2 pb-5 pt-2 flex items-center justify-around">
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== "/app" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center w-16 h-14 relative group"
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full transition-all duration-300",
                  active
                    ? "text-primary-600 dark:text-primary-400 transform -translate-y-1"
                    : "text-slate-500 dark:text-slate-400",
                )}
              >
                <item.icon
                  className={cn(
                    "w-6 h-6 mb-1 transition-all duration-300",
                    active && "stroke-[2.5px]",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] transition-all duration-300",
                    active ? "font-bold opacity-100" : "font-medium opacity-70",
                  )}
                >
                  {item.label}
                </span>
              </div>
              {active && (
                <div className="absolute top-0 w-8 h-1 bg-primary-600 dark:bg-primary-500 rounded-b-full shadow-[0_2px_10px_rgba(37,99,235,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MainLayout;
