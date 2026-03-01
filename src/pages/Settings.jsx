import { useState, useEffect } from "react";
import {
  Moon,
  Sun,
  Monitor,
  Shield,
  Bell,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Settings = () => {
  // Functional Theme Engine
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const tabs = [
    { id: "appearance", label: "Appearance", icon: Sun },
    { id: "account", label: "Account Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Settings
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
          Manage your OS preferences and account settings.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors",
                tab.id === "appearance"
                  ? "bg-white dark:bg-[#121212] text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-slate-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50",
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon className="w-5 h-5" /> {tab.label}
              </div>
              {tab.id === "appearance" && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
            Interface Theme
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Customize how Discotive looks on your device.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all",
                theme === "light"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600"
                  : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700",
              )}
            >
              <Sun className="w-8 h-8 mb-3" />
              <span className="font-bold">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all",
                theme === "dark"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700",
              )}
            >
              <Moon className="w-8 h-8 mb-3" />
              <span className="font-bold">Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all",
                theme === "system"
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700",
              )}
            >
              <Monitor className="w-8 h-8 mb-3" />
              <span className="font-bold">System</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
