import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useUserData } from "../hooks/useUserData";
import {
  LayoutDashboard,
  Target,
  Trophy,
  LineChart,
  Users,
  MapPin,
  Briefcase,
  FolderOpen,
  Mic,
  FileText,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  Compass,
  Globe,
  HelpCircle,
  MessageSquare,
  Zap,
  ChevronRight as ChevronRightIcon,
  BellOff,
  CheckCircle2,
  Circle,
  Trash2,
  BookOpen,
  Keyboard,
  Shield,
  Languages,
  Moon,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";
import { processDailyConsistency } from "../lib/scoreEngine";

// --- NAVIGATION GROUPS ---
const topNavItems = [
  { icon: LayoutDashboard, label: "Command Center", path: "/app" },
  { icon: Target, label: "Execution Timeline", path: "/app/roadmap" },
  { icon: Trophy, label: "Leaderboard", path: "/app/leaderboard" },
  { icon: Briefcase, label: "Opportunities", path: "/app/opportunities" },
];

const middleNavItems = [
  { icon: FolderOpen, label: "Asset Vault", path: "/app/vault" },
  { icon: Users, label: "Networking", path: "/app/network" },
  { icon: Compass, label: "Discover Hubs", path: "/app/hubs" },
];

const contentNavItems = [
  { icon: BookOpen, label: "Learn", path: "/app/learn" },
  { icon: Mic, label: "Podcasts", path: "/app/podcasts" },
  { icon: FileText, label: "Assessments", path: "/app/assessments" },
];

const bottomNavItems = [
  { icon: LineChart, label: "Financial Ledger", path: "/app/finance" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

// --- MAIN LAYOUT COMPONENT ---
const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Dropdown States
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { userData, loading } = useUserData();

  // --- THE GHOST USER BOUNCER ---
  useEffect(() => {
    if (!loading && !userData) {
      navigate("/");
    }
  }, [loading, userData, navigate]);

  // --- TRIGGER DAILY SCORE ENGINE ---
  useEffect(() => {
    if (userData?.uid) {
      processDailyConsistency(userData.uid);
    }
  }, [userData?.uid]);

  // --- STRICT CLICK-OUTSIDE REFS ---
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close profile menu if clicked outside
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
        setShowLanguageMenu(false); // Reset nested menu
      }
      // Close notification menu if clicked outside
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target)
      ) {
        setShowNotifMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const NavItem = ({ item, isCollapsed }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
          isActive
            ? "bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            : "text-[#888] hover:bg-[#111] hover:text-white font-medium",
        )}
        title={isCollapsed ? item.label : undefined}
      >
        <Icon
          className={cn(
            "w-5 h-5 shrink-0",
            isActive ? "text-black" : "text-[#888] group-hover:text-white",
          )}
        />
        {!isCollapsed && (
          <span className="truncate text-sm tracking-wide">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#030303] overflow-hidden text-white selection:bg-white selection:text-black">
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (Strict z-[100] to overlay content)       */}
      {/* ========================================================= */}
      <motion.aside
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="hidden md:flex flex-col bg-[#050505] border-r border-[#222] h-full z-[100] relative shadow-[10px_0_50px_rgba(0,0,0,0.5)]"
      >
        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-[#111]">
          <Link to="/app" className="flex items-center gap-3 overflow-hidden">
            {/* Swapped the 'D' block for your custom PNG logo */}
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img
                src="/logo-no-bg-white.png"
                alt="Discotive Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="font-extrabold text-lg tracking-tight whitespace-nowrap"
                >
                  DISCOTIVE
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-8">
          <div className="space-y-1">
            {isSidebarOpen && (
              <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2">
                Primary
              </p>
            )}
            {topNavItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isCollapsed={!isSidebarOpen}
              />
            ))}
          </div>
          <div className="space-y-1">
            {isSidebarOpen && (
              <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2">
                Career Hub
              </p>
            )}
            {middleNavItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isCollapsed={!isSidebarOpen}
              />
            ))}
          </div>
          <div className="space-y-1">
            {isSidebarOpen && (
              <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2">
                Media & Tests
              </p>
            )}
            {contentNavItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isCollapsed={!isSidebarOpen}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section (Settings & Toggle) */}
        <div className="p-3 border-t border-[#111] bg-[#050505] shrink-0 space-y-1">
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} item={item} isCollapsed={!isSidebarOpen} />
          ))}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center py-3 text-[#666] hover:text-white hover:bg-[#111] rounded-xl transition-colors mt-2"
          >
            {isSidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.aside>

      {/* ========================================================= */}
      {/* MAIN CONTENT WRAPPER                                      */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* TOPBAR (Strict z-[90] to sit above pages but below dropdowns) */}
        <header className="h-16 md:h-20 bg-[#030303]/80 backdrop-blur-xl border-b border-[#222] flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-[90]">
          <div className="flex items-center gap-4">
            <span className="md:hidden font-extrabold text-xl tracking-tight text-white">
              DISCOTIVE
            </span>
            <div className="hidden md:flex items-center bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-2.5 focus-within:border-[#555] transition-colors w-72 lg:w-96 group">
              <Search className="w-4 h-4 text-[#555] group-focus-within:text-white shrink-0" />
              <input
                type="text"
                placeholder="Search operators, vaults, assets..."
                className="w-full bg-transparent border-none outline-none text-xs px-3 text-white placeholder-[#555] font-medium"
              />
              <div className="px-1.5 py-0.5 rounded border border-[#333] bg-[#111] text-[10px] text-[#666] font-mono shrink-0">
                ⌘K
              </div>
            </div>
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                <Zap className="w-3 h-3 fill-current" />
                Install App
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            {/* NOTIFICATIONS DROPDOWN */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={cn(
                  "p-2 md:p-2.5 rounded-full transition-all relative border",
                  showNotifMenu
                    ? "bg-white text-black border-white"
                    : "bg-[#0a0a0a] border-[#222] text-[#888] hover:text-white hover:border-[#444]",
                )}
              >
                <Bell className="w-4 h-4 md:w-5 md:h-5" />
                {/* Only show the red dot if there are actual notifications */}
                {userData?.notifications?.length > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#030303] rounded-full" />
                )}
              </button>
              {/* --- NOTIFICATIONS DROPDOWN CONTENT --- */}
              <AnimatePresence>
                {showNotifMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-[320px] md:w-[380px] bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[120] flex flex-col max-h-[80vh]"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-[#222] bg-[#050505] shrink-0">
                      <h3 className="font-extrabold text-white text-sm md:text-base">
                        Notifications
                      </h3>
                      <button
                        className="p-1.5 hover:bg-[#111] rounded-lg transition-colors"
                        title="Settings"
                      >
                        <Settings className="w-4 h-4 text-[#888]" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {/* Using real data: if no notifications exist in DB, show this premium empty state */}
                      {!userData?.notifications ||
                      userData.notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                          <BellOff className="w-10 h-10 text-[#222] mb-4" />
                          <p className="text-sm font-bold text-white mb-1">
                            You're all caught up
                          </p>
                          <p className="text-xs text-[#666] leading-relaxed">
                            System alerts, alliance requests, and protocol
                            updates will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#111]">
                          {userData.notifications.map((notif, i) => (
                            <div
                              key={i}
                              className="p-4 hover:bg-[#111] transition-colors cursor-pointer flex gap-3"
                            >
                              <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                              <div>
                                <p className="text-xs md:text-sm text-[#ccc] leading-relaxed">
                                  {notif.message}
                                </p>
                                <p className="text-[10px] text-[#666] font-mono mt-2 uppercase">
                                  {notif.time || "Just now"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* --- PROFILE DROPDOWN ENGINE --- */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowLanguageMenu(false);
                }}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-[10px] md:text-xs font-bold text-[#888] hover:text-white hover:border-white transition-colors shrink-0"
              >
                {userData?.identity?.firstName?.charAt(0) || "U"}
              </button>

              <AnimatePresence mode="wait">
                {/* 1. MAIN PROFILE MENU */}
                {showProfileMenu && !showLanguageMenu && (
                  <motion.div
                    key="main-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-[280px] md:w-[320px] bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[120] flex flex-col py-2"
                  >
                    {/* Header: User Info */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-sm font-bold text-[#666] shrink-0">
                        {userData?.identity?.firstName?.charAt(0) || "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-white truncate">
                          {userData?.identity?.firstName}{" "}
                          {userData?.identity?.lastName}
                        </p>
                        <p className="text-[10px] md:text-xs text-[#888] font-mono truncate">
                          @{userData?.identity?.username}
                        </p>
                      </div>
                    </div>

                    <div className="px-4 pb-2 border-b border-[#222]">
                      <Link
                        to="/app/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors"
                      >
                        View full profile
                      </Link>
                    </div>

                    {/* Section 1: Localization */}
                    <div className="py-2 border-b border-[#222]">
                      <div className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] text-xs md:text-sm pointer-events-none">
                        <MapPin className="w-4 h-4 text-[#888]" />
                        <span>
                          Location:{" "}
                          {userData?.footprint?.location || "Unmapped"}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowLanguageMenu(true)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Languages className="w-4 h-4 text-[#888]" />
                          <span>Language: English</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-[#666]" />
                      </button>
                    </div>

                    {/* Section 2: Account Controls */}
                    <div className="py-2 border-b border-[#222]">
                      <Link
                        to="/app/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
                      >
                        <Settings className="w-4 h-4 text-[#888]" /> Settings
                      </Link>
                      <Link
                        to="/premium"
                        onClick={() => setShowProfileMenu(false)}
                        className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
                      >
                        <Shield className="w-4 h-4 text-[#888]" /> Discotive Pro
                      </Link>
                      <button className="w-full px-4 py-2.5 flex items-center justify-between text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left">
                        <div className="flex items-center gap-3">
                          <Moon className="w-4 h-4 text-[#888]" /> Appearance:
                          Dark
                        </div>
                      </button>
                    </div>

                    {/* Section 3: Support */}
                    <div className="py-2 border-b border-[#222]">
                      <Link
                        to="/support"
                        onClick={() => setShowProfileMenu(false)}
                        className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
                      >
                        <HelpCircle className="w-4 h-4 text-[#888]" /> Help &
                        Support
                      </Link>
                      <Link
                        to="/feedback"
                        onClick={() => setShowProfileMenu(false)}
                        className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
                      >
                        <MessageSquare className="w-4 h-4 text-[#888]" /> Send
                        Feedback
                      </Link>
                    </div>

                    {/* Section 4: Sign Out */}
                    <div className="py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
                      >
                        <LogOut className="w-4 h-4 text-[#888]" /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 2. NESTED LANGUAGE MENU */}
                {showProfileMenu && showLanguageMenu && (
                  <motion.div
                    key="language-menu"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 w-[280px] md:w-[320px] bg-[#0a0a0a] border border-[#222] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden z-[120] flex flex-col py-2"
                  >
                    <div className="flex items-center gap-2 px-2 pb-2 border-b border-[#222]">
                      <button
                        onClick={() => setShowLanguageMenu(false)}
                        className="p-2 hover:bg-[#111] rounded-full transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-white" />
                      </button>
                      <span className="font-bold text-sm text-white">
                        Choose Language
                      </span>
                    </div>

                    <div className="py-2">
                      <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
                        <span className="text-sm text-white font-medium">
                          English (US)
                        </span>
                        <Check className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="px-4 py-6 text-center border-t border-[#222]">
                      <Globe className="w-8 h-8 text-[#333] mx-auto mb-3" />
                      <p className="text-xs font-bold text-[#888] uppercase tracking-widest">
                        More languages coming soon
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* --- MAIN PAGE CONTENT OUTLET (Behind dropdowns, above background) --- */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Strictly 5 Icons)           */}
      {/* ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#050505]/95 backdrop-blur-2xl border-t border-[#222] z-[100] flex items-center justify-around px-2 safe-area-pb">
        {[
          { icon: LayoutDashboard, path: "/app", label: "Dashboard" },
          { icon: Target, path: "/app/roadmap", label: "Roadmap" },
          { icon: Trophy, path: "/app/leaderboard", label: "Leaderboard" },
          { icon: Users, path: "/app/network", label: "Network" },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors relative",
                isActive ? "text-white" : "text-[#666] hover:text-[#aaa]",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute top-0 w-8 h-0.5 bg-white rounded-b-full shadow-[0_2px_10px_rgba(255,255,255,0.5)]"
                />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* The Hamburger Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center w-14 h-full gap-1 transition-colors",
            isMobileMenuOpen ? "text-white" : "text-[#666] hover:text-[#aaa]",
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wider">Menu</span>
        </button>
      </nav>

      {/* ========================================================= */}
      {/* MOBILE HAMBURGER OVERLAY MENU                             */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="md:hidden fixed inset-0 bg-[#050505] z-[200] flex flex-col"
          >
            {/* Overlay Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-[#222] shrink-0 bg-[#0a0a0a]">
              <span className="font-extrabold text-lg tracking-widest text-white">
                DISCOTIVE OS
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-[#111] border border-[#333] rounded-full text-[#888] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Overlay Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-8 space-y-8 pb-24">
              {/* User Snapshot */}
              <div className="flex items-center gap-4 p-4 bg-[#111] border border-[#222] rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[#222] border border-[#444] flex items-center justify-center text-lg font-bold text-[#888]">
                  {userData?.identity?.firstName?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-extrabold text-white">
                    {userData?.identity?.firstName}{" "}
                    {userData?.identity?.lastName}
                  </p>
                  {/* --- FIX: Safely extract .current for the Math calculation --- */}
                  <p className="text-[10px] text-[#888] font-mono tracking-widest uppercase">
                    Lvl{" "}
                    {Math.min(
                      Math.floor(
                        (userData?.discotiveScore?.current ?? 0) / 1000,
                      ) + 1,
                      10,
                    )}{" "}
                    Operator
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-3">
                  Career Hub
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/app/vault"
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-[#0a0a0a] border border-[#222] rounded-2xl active:bg-[#111]"
                  >
                    <FolderOpen className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold text-[#ccc]">
                      Asset Vault
                    </span>
                  </Link>
                  <Link
                    to="/app/hubs"
                    className="flex flex-col items-center justify-center gap-2 p-4 bg-[#0a0a0a] border border-[#222] rounded-2xl active:bg-[#111]"
                  >
                    <Compass className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold text-[#ccc]">
                      Discover Hubs
                    </span>
                  </Link>
                  <Link
                    to="/app/opportunities"
                    className="col-span-2 flex flex-col items-center justify-center gap-2 p-4 bg-[#0a0a0a] border border-[#222] rounded-2xl active:bg-[#111]"
                  >
                    <Briefcase className="w-5 h-5 text-white" />
                    <span className="text-xs font-bold text-[#ccc]">
                      Opportunities
                    </span>
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-3">
                  Media & Assessment
                </p>
                <div className="space-y-2">
                  <Link
                    to="/app/learn"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <BookOpen className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Learning Center
                    </span>
                  </Link>
                  <Link
                    to="/app/podcasts"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <Mic className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Podcasts & Media
                    </span>
                  </Link>
                  <Link
                    to="/app/assessments"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <FileText className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Assessments
                    </span>
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-3">
                  System & Account
                </p>
                <div className="space-y-2">
                  <Link
                    to="/app/profile"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <User className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Operator Profile
                    </span>
                  </Link>
                  <Link
                    to="/app/finance"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <LineChart className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Financial Ledger
                    </span>
                  </Link>
                  <Link
                    to="/app/settings"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <Settings className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Settings
                    </span>
                  </Link>
                  <Link
                    to="/premium"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl active:bg-amber-500/20"
                  >
                    <div className="flex items-center gap-4">
                      <Shield className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-bold text-amber-500">
                        Discotive Pro
                      </span>
                    </div>
                    <Zap className="w-4 h-4 text-amber-500" />
                  </Link>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-3">
                  Support
                </p>
                <div className="space-y-2">
                  <Link
                    to="/support"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <HelpCircle className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Help Center
                    </span>
                  </Link>
                  <Link
                    to="/feedback"
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-[#222] rounded-xl active:bg-[#111]"
                  >
                    <MessageSquare className="w-5 h-5 text-[#888]" />
                    <span className="text-sm font-bold text-white">
                      Send Feedback
                    </span>
                  </Link>
                  {isInstallable && (
                    <div className="py-2">
                      <button
                        onClick={handleInstallClick}
                        className="w-full flex items-center justify-between p-4 bg-amber-500 text-black rounded-xl font-extrabold"
                      >
                        <div className="flex items-center gap-4">
                          <Zap className="w-5 h-5 fill-current" />
                          <span className="text-sm">Install Discotive App</span>
                        </div>
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl active:bg-red-500/20"
                  >
                    <LogOut className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-bold text-red-500">
                      Sign Out
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
