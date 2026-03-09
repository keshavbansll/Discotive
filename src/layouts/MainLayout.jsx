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
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// --- UPDATED SIDEBAR ROUTES ---
const topNavItems = [
  { icon: LayoutDashboard, label: "Command Center", path: "/app" },
  { icon: Target, label: "Execution Timeline", path: "/app/roadmap" },
  { icon: Trophy, label: "Leaderboard", path: "/app/leaderboard" },
  { icon: Briefcase, label: "Opportunities", path: "/app/opportunities" },
];

const middleNavItems = [
  { icon: FolderOpen, label: "Asset Vault", path: "/app/vault" },
  { icon: MapPin, label: "Career Hubs", path: "/app/hubs" },
  { icon: Users, label: "Network", path: "/app/network" },
  { icon: LineChart, label: "Financial Ledger", path: "/app/finance" },
];

const contentNavItems = [
  { icon: BookOpen, label: "Learn", path: "/app/learn" },
  { icon: Mic, label: "Podcasts", path: "/app/podcasts" },
  { icon: FileText, label: "Assessments & Live", path: "/app/assessments" },
];

const bottomNavItems = [
  { icon: User, label: "Profile", path: "/app/profile" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchRef = useRef(null);

  const { userData } = useUserData();

  // --- UI STATES ---
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // --- DYNAMIC NOTIFICATION ENGINE ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("discotive_notifications");
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 1,
        title: "System Online",
        message:
          "Welcome to Discotive OS. Your baseline profile has been synced.",
        time: "Just now",
        read: false,
        type: "system",
      },
    ];
  });

  // Save to browser memory instantly whenever a change happens
  useEffect(() => {
    localStorage.setItem(
      "discotive_notifications",
      JSON.stringify(notifications),
    );
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () =>
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  const toggleReadStatus = (id) =>
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: !n.read } : n)),
    );
  const deleteNotification = (id) =>
    setNotifications(notifications.filter((n) => n.id !== id));

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const isExpanded = isSidebarHovered;

  const firstName = userData?.identity?.firstName || "B";
  const lastName = userData?.identity?.lastName || "";
  const initials =
    `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();

  const NavItem = ({ item }) => {
    const active =
      location.pathname === item.path ||
      (item.path !== "/app" && location.pathname.startsWith(item.path));
    return (
      <Link
        to={item.path}
        onClick={() => setIsMobileMoreOpen(false)}
        className={cn(
          "flex items-center space-x-3 px-3 py-3 rounded-2xl transition-all duration-300 font-bold text-sm group relative overflow-hidden",
          active
            ? "text-white bg-white/10"
            : "text-slate-500 hover:text-white hover:bg-white/5",
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full shadow-[0_0_10px_white]" />
        )}
        <item.icon
          className={cn(
            "w-5 h-5 shrink-0 transition-transform duration-300",
            active ? "scale-110 text-white" : "group-hover:scale-110",
          )}
        />
        <span
          className={cn(
            "whitespace-nowrap transition-opacity duration-300",
            isExpanded ? "opacity-100" : "opacity-0 md:hidden",
          )}
        >
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden selection:bg-white selection:text-black font-sans">
      {/* --- PC SIDEBAR --- */}
      <div className="hidden md:block shrink-0 w-20" />

      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={cn(
          "hidden md:flex fixed top-0 left-0 h-full bg-[#0a0a0a] border-r border-white/5 flex-col z-50 transition-all duration-300 ease-in-out",
          isExpanded ? "w-72 shadow-[20px_0_50px_rgba(0,0,0,0.5)]" : "w-20",
        )}
      >
        <div className="p-5 flex items-center justify-between">
          <Link
            to="/app"
            className="flex items-center gap-3 overflow-hidden whitespace-nowrap group"
          >
            <div className="w-10 h-10 shrink-0 bg-white rounded-xl flex items-center justify-center text-black font-extrabold text-xl shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform">
              D
            </div>
            <div
              className={cn(
                "transition-opacity duration-300",
                isExpanded ? "opacity-100" : "opacity-0",
              )}
            >
              <h1 className="text-xl font-extrabold tracking-tighter leading-tight">
                DISCOTIVE
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                Operating System
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {topNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
          <div className="space-y-1 border-t border-white/5 pt-4">
            <p
              className={cn(
                "px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 transition-opacity",
                isExpanded ? "opacity-100" : "opacity-0",
              )}
            >
              Career Hub
            </p>
            {middleNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
          <div className="space-y-1 border-t border-white/5 pt-4">
            <p
              className={cn(
                "px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 transition-opacity",
                isExpanded ? "opacity-100" : "opacity-0",
              )}
            >
              Media & Tests
            </p>
            {contentNavItems.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
          </div>
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-[#0a0a0a]">
        {/* --- NAVBAR --- */}
        <header className="h-16 md:h-20 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
          <div className="md:hidden">
            <Link
              to="/app/discover"
              className="p-2 text-slate-500 hover:text-white transition-colors block"
            >
              <Compass className="w-6 h-6" />
            </Link>
          </div>
          <div className="hidden md:flex items-center">
            <Link
              to="/app/discover"
              className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-colors group"
            >
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
              <span>Discover</span>
            </Link>
          </div>

          <div className="flex-1 max-w-md mx-4 md:mx-8">
            <div className="flex items-center bg-[#121212] rounded-full px-4 py-2.5 w-full border border-white/10 focus-within:border-white/40 focus-within:bg-white/5 transition-all group">
              <Search className="w-4 h-4 text-slate-500 group-focus-within:text-white transition-colors shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search ledger..."
                className="bg-transparent border-none outline-none ml-3 w-full text-sm placeholder-slate-600 text-white font-medium"
              />
              <div className="hidden md:flex items-center gap-1 opacity-40">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold">
                  ⌘/Ctrl
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold">
                  Alt
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold">
                  K
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-6">
            {/* --- ALIVE NOTIFICATION ENGINE --- */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsProfileOpen(false);
                }}
                className="relative p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
              >
                <Bell className="w-5 h-5 md:w-6 md:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border-2 border-[#0a0a0a] flex items-center justify-center text-[8px] font-extrabold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 md:-right-4 top-full mt-4 w-[320px] sm:w-[380px] bg-[#121212] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col max-h-[80vh]"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#1a1a1a]/50">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          Notifications{" "}
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300">
                              {unreadCount}
                            </span>
                          )}
                        </h3>
                        {notifications.length > 0 && unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List or Empty State */}
                      <div className="overflow-y-auto custom-scrollbar flex-1">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                              <BellOff className="w-8 h-8 text-slate-600" />
                            </div>
                            <p className="font-bold text-white mb-1">
                              No unread messages
                            </p>
                            <p className="text-xs text-slate-500">
                              You're all caught up on your ledger.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-white/5">
                            {notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={cn(
                                  "p-4 flex gap-4 group transition-colors hover:bg-white/5",
                                  !notif.read ? "bg-blue-500/5" : "",
                                )}
                              >
                                <div className="mt-1 shrink-0">
                                  {!notif.read ? (
                                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                  ) : (
                                    <div className="w-2.5 h-2.5 bg-slate-600 rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm mb-1",
                                      !notif.read
                                        ? "font-bold text-white"
                                        : "font-medium text-slate-300",
                                    )}
                                  >
                                    {notif.title}
                                  </p>
                                  <p className="text-xs text-slate-400 leading-relaxed mb-2">
                                    {notif.message}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                    {notif.time}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => toggleReadStatus(notif.id)}
                                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                    title={
                                      notif.read
                                        ? "Mark as unread"
                                        : "Mark as read"
                                    }
                                  >
                                    {notif.read ? (
                                      <Circle className="w-4 h-4" />
                                    ) : (
                                      <CheckCircle2 className="w-4 h-4" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deleteNotification(notif.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* --- MINIMAL PROFILE TRIGGER --- */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotificationsOpen(false);
                }}
                className="flex items-center pl-2 md:pl-6 md:border-l border-white/10 focus:outline-none group"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1a1a1a] border border-white/20 flex items-center justify-center text-white text-xs md:text-sm font-extrabold group-hover:border-white/50 group-hover:bg-white group-hover:text-black transition-all duration-300 shadow-xl">
                  {initials}
                </div>
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-4 w-72 bg-[#121212] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-white/5 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-extrabold text-lg shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">
                            {firstName} {lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate mb-2">
                            @{firstName.toLowerCase()}_
                            {userData?.vision?.passion
                              ?.toLowerCase()
                              ?.replace(/\s+/g, "") || "builder"}
                          </p>
                          <Link
                            to="/app/profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Go to Account
                          </Link>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="py-2">
                        <div className="px-2 pb-2 mb-2 border-b border-white/5">
                          <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                              <Zap className="w-4 h-4 text-amber-400" />{" "}
                              Discotive Pro
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                          </button>
                        </div>
                        <div className="px-2 pb-2 mb-2 border-b border-white/5">
                          <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                              <Globe className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />{" "}
                              Language: English
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                          </button>
                          <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />{" "}
                              Location: India
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                          </button>
                        </div>
                        <div className="px-2 pb-2 mb-2 border-b border-white/5">
                          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
                            <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />{" "}
                            Help & Support
                          </button>
                          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors group">
                            <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />{" "}
                            Send Feedback
                          </button>
                        </div>
                        <div className="px-2">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* --- PAGE CONTENT --- */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 md:pb-10 custom-scrollbar relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none -z-10" />
          <Outlet />
        </main>
      </div>

      {/* --- MOBILE BOTTOM NAVBAR --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/10 z-50 px-6 py-4 pb-safe flex justify-between items-center">
        <Link
          to="/app"
          className={cn(
            "p-2 rounded-xl transition-colors",
            location.pathname === "/app"
              ? "text-white bg-white/10"
              : "text-slate-500 hover:text-white",
          )}
        >
          <LayoutDashboard className="w-6 h-6" />
        </Link>
        <Link
          to="/app/roadmap"
          className={cn(
            "p-2 rounded-xl transition-colors",
            location.pathname === "/app/roadmap"
              ? "text-white bg-white/10"
              : "text-slate-500 hover:text-white",
          )}
        >
          <Target className="w-6 h-6" />
        </Link>
        <Link
          to="/app/discover"
          className={cn(
            "p-2 rounded-xl transition-colors",
            location.pathname === "/app/discover"
              ? "text-white bg-white/10"
              : "text-slate-500 hover:text-white",
          )}
        >
          <Compass className="w-6 h-6" />
        </Link>
        <Link
          to="/app/vault"
          className={cn(
            "p-2 rounded-xl transition-colors",
            location.pathname === "/app/vault"
              ? "text-white bg-white/10"
              : "text-slate-500 hover:text-white",
          )}
        >
          <FolderOpen className="w-6 h-6" />
        </Link>
        <button
          onClick={() => setIsMobileMoreOpen(true)}
          className="p-2 text-slate-500 hover:text-white transition-colors rounded-xl"
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* --- MOBILE BOTTOM SHEET --- */}
      <AnimatePresence>
        {isMobileMoreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMoreOpen(false)}
              className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed bottom-0 left-0 w-full bg-[#121212] border-t border-white/10 rounded-t-[2.5rem] z-[70] p-6 pb-12 max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8 shrink-0" />
              <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Full Ledger
                </h2>
                <button
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-6 flex-1">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    Core OS
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {topNavItems.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    Career Hub
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {middleNavItems.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    Media & Tests
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {contentNavItems.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">
                    Account
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {bottomNavItems.map((item) => (
                      <NavItem key={item.path} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
