import { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
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
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

const topNavItems = [
  { icon: LayoutDashboard, label: "Command Center", path: "/app" },
  { icon: Target, label: "Execution Timeline", path: "/app/roadmap" },
  { icon: Trophy, label: "Leaderboard", path: "/app/leaderboard" },
  { icon: LineChart, label: "Financial Ledger", path: "/app/finance" },
];

const middleNavItems = [
  { icon: Users, label: "Network", path: "/app/network" },
  { icon: MapPin, label: "Career Hubs", path: "/app/hubs" },
  { icon: Briefcase, label: "Opportunities", path: "/app/opportunities" },
  { icon: FolderOpen, label: "Asset Vault", path: "/app/vault" },
];

const contentNavItems = [
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

  // States
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Keyboard Shortcut for Search (Cmd/Ctrl + Alt + K)
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

  // Determine actual visual state of sidebar
  const isExpanded = !isCollapsed || isSidebarHovered;

  // Reusable Sidebar Nav Link Component
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
      {/* --- PC SIDEBAR (Hover-Expandable Architecture) --- */}
      {/* Invisible Spacer to maintain grid layout when sidebar is absolute */}
      <div
        className="hidden md:block transition-all duration-300 ease-in-out shrink-0"
        style={{ width: isCollapsed ? "80px" : "288px" }}
      />

      <aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={cn(
          "hidden md:flex fixed top-0 left-0 h-full bg-[#0a0a0a] border-r border-white/5 flex-col z-50 transition-all duration-300 ease-in-out",
          isExpanded ? "w-72 shadow-[20px_0_50px_rgba(0,0,0,0.5)]" : "w-20",
        )}
      >
        {/* Logo Header */}
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

        {/* Navigation Lists */}
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

        {/* Bottom Actions & Collapse Toggle */}
        <div className="p-3 border-t border-white/5 space-y-1 relative">
          {bottomNavItems.map((item) => (
            <NavItem key={item.path} item={item} />
          ))}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#1a1a1a] border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-50 shadow-lg"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-[#0a0a0a]">
        {/* --- PC & MOBILE NAVBAR --- */}
        <header className="h-16 md:h-20 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-4 md:px-8 z-30 shrink-0">
          {/* Mobile Left: Discover Icon */}
          <div className="md:hidden">
            <Link
              to="/app/discover"
              className="p-2 text-slate-500 hover:text-white transition-colors block"
            >
              <Compass className="w-6 h-6" />
            </Link>
          </div>

          {/* PC Left: Discover Logo/Link */}
          <div className="hidden md:flex items-center">
            <Link
              to="/app/discover"
              className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm transition-colors group"
            >
              <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
              <span>Discover</span>
            </Link>
          </div>

          {/* Center: Universal Search Bar */}
          <div className="flex-1 max-w-md mx-4 md:mx-8">
            <div className="flex items-center bg-[#121212] rounded-full px-4 py-2.5 w-full border border-white/10 focus-within:border-white/40 focus-within:bg-white/5 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all group">
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

          {/* Right: Notifications & Profile */}
          <div className="flex items-center space-x-2 md:space-x-6">
            <button className="relative p-2 text-slate-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white] border-2 border-[#0a0a0a]"></span>
            </button>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 pl-2 md:pl-6 md:border-l border-white/10 focus:outline-none group"
              >
                <div className="hidden lg:block text-right">
                  <p className="text-sm font-bold text-white group-hover:text-slate-300 transition-colors">
                    John Doe
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Founder Track
                  </p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1a1a1a] border border-white/20 flex items-center justify-center text-white text-xs md:text-sm font-extrabold group-hover:border-white/50 group-hover:bg-white group-hover:text-black transition-all duration-300">
                  JD
                </div>
              </button>

              {/* Profile Dropdown Menu */}
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
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-4 w-64 bg-[#121212] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-extrabold text-lg">
                          JD
                        </div>
                        <div>
                          <p className="font-bold text-white">John Doe</p>
                          <p className="text-xs text-slate-400">
                            @johndoe_founder
                          </p>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <Link
                          to="/app/profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                        >
                          <User className="w-4 h-4" /> Account
                        </Link>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <Zap className="w-4 h-4 text-amber-400" /> Pro
                          Membership
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <Globe className="w-4 h-4" /> Language: English
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <MapPin className="w-4 h-4" /> Location: India
                        </button>
                      </div>
                      <div className="p-2 border-t border-white/5 space-y-1">
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <HelpCircle className="w-4 h-4" /> Help & Support
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                          <MessageSquare className="w-4 h-4" /> Send Feedback
                        </button>
                      </div>
                      <div className="p-2 border-t border-white/5">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* --- PAGE CONTENT (Outlet) --- */}
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

      {/* --- MOBILE BOTTOM SHEET (MORE MENU) --- */}
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
