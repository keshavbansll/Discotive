/**
 * @fileoverview Main Layout
 * Sidebar and Navbar for PC
 * Mobile: Native-app bottom bar and navbar.
 */

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { useUserData } from "../hooks/useUserData";
import { ShortcutsPanel } from "../components/ShortcutsPanel";
import { useScoreHistory, usePercentiles } from "../hooks/useDashboardData";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import Grace from "../components/Grace";
import {
  LayoutDashboard,
  Target,
  LaptopMinimalCheck,
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
  ChevronDown,
  Search,
  Bell,
  Menu,
  X,
  LogOut,
  Compass,
  Globe,
  HelpCircle,
  MessageSquare,
  MessageCircle,
  Zap,
  ChevronRight as ChevronRightIcon,
  BellOff,
  CheckCircle2,
  Circle,
  Trash2,
  BookOpen,
  BookMarked,
  Keyboard,
  Shield,
  Languages,
  Moon,
  Lock,
  AlertTriangle,
  Check,
  ArrowRight,
  Command,
  Ticket,
  Calendar,
  Newspaper,
  Activity,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Crown,
} from "lucide-react";

import { cn } from "../lib/cn";
import FeedbackModal from "../components/FeedbackModal";
import TelemetryData from "../components/TelemetryData";
import PremiumPaywall from "../components/PremiumPaywall";

import SupportTicketModal from "../components/SupportTicketModal";
import UserReportModal from "../components/UserReportModal";
import { NotificationBell } from "../components/NotificationCenter";

// --- NAVIGATION GROUPS ---

const topNavItems = [
  { icon: LayoutDashboard, label: "Command Center", path: "/app" },
];

const upperMiddleNavItems = [
  { icon: Briefcase, label: "Opportunities", path: "/app/opportunities" },
];

// Transparency section completely purged per architecture mandate.

const upperContentNavItems = [
  { icon: Trophy, label: "Leaderboard", path: "/app/leaderboard" },
  {
    icon: Users,
    label: "Connective",
    path: "/app/connective/network",
    subItems: [
      { label: "Feed", path: "/app/connective/feed" },
      { label: "Network", path: "/app/connective/network" },
    ],
  },
];

const lowerContentNavItems = [
  { icon: FolderOpen, label: "Asset Vault", path: "/app/vault" },
  // { icon: GraduationCap, label: "Learn", path: "/app/learn" },
  { icon: Calendar, label: "Agenda", path: "/app/agenda", proOnly: true },
];

const moreNavItems = [
  { icon: BookOpen, label: "Colists", path: "/colists", external: true },
];

const bottomNavItems = [
  // { icon: LineChart, label: "Financial Ledger", path: "/app/finance" },
  { icon: Settings, label: "Settings", path: "/app/settings" },
];

// --- ACTIVITY WIDGET COMPONENT ---
const ActivityWidget = ({ userData }) => {
  const [expanded, setExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const score = userData?.discotiveScore?.current ?? 0;
  const lastScore = userData?.discotiveScore?.last24h ?? score;
  const delta = score - lastScore;

  const { data: percentilesData } = usePercentiles(score, userData);
  const globalPct = percentilesData?.global ?? 100;

  const { data: rawHistory = [] } = useScoreHistory("1W");
  const chartData = useMemo(
    () => rawHistory.map((e) => ({ day: e.date, score: e.score })),
    [rawHistory],
  );

  const handleRefresh = (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="hidden md:flex items-center ml-1 h-[40px]">
      <motion.div
        animate={{ width: expanded ? 320 : 40 }}
        transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "h-full bg-[#0A0A0A] rounded-full flex items-center overflow-hidden border border-white/5 transition-colors",
          expanded
            ? "shadow-[0_0_15px_rgba(191,162,100,0.1)] border-[rgba(191,162,100,0.3)]"
            : "justify-center cursor-pointer hover:bg-[#111] hover:text-[#BFA264] text-[#F5F0E8]/60 active:scale-95",
        )}
        onClick={() => !expanded && setExpanded(true)}
      >
        {expanded ? (
          <div className="flex items-center w-[320px] px-2 h-full justify-between">
            <button
              onClick={handleRefresh}
              className="p-1.5 hover:bg-white/5 rounded-full transition-colors shrink-0"
            >
              <RefreshCw
                size={14}
                className={cn(
                  "text-[#888]",
                  isRefreshing && "animate-spin text-[#BFA264]",
                )}
              />
            </button>
            <div className="flex flex-col ml-2 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-[#F5F0E8] text-sm leading-none">
                  {score.toLocaleString()}
                </span>
                {delta !== 0 && (
                  <span
                    className={cn(
                      "text-[9px] font-bold flex items-center gap-0.5 leading-none",
                      delta > 0 ? "text-[#4ADE80]" : "text-[#F87171]",
                    )}
                  >
                    {delta > 0 ? (
                      <TrendingUp size={10} />
                    ) : (
                      <TrendingDown size={10} />
                    )}
                    {Math.abs(delta)}
                  </span>
                )}
              </div>
              <span className="text-[8px] font-bold text-[#888] uppercase tracking-widest mt-0.5">
                Global Top {globalPct}%
              </span>
            </div>
            <div className="flex-1 h-6 mx-2 min-w-[60px] relative">
              {/* Only render the heavy SVG chart when fully expanded to prevent ResizeObserver layout thrashing */}
              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.2 }}
                  className="absolute inset-0"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="actSparkG"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#BFA264"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="#BFA264"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#BFA264"
                        strokeWidth={1.5}
                        fill="url(#actSparkG)"
                        dot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
              className="p-1.5 hover:bg-white/5 rounded-full transition-colors shrink-0 border border-white/5"
            >
              <ArrowRight size={14} className="text-[#888]" />
            </button>
          </div>
        ) : (
          <Activity className="w-[18px] h-[18px]" />
        )}
      </motion.div>
    </div>
  );
};

/**
 * @constant GHOST_LOCKED_ROUTES
 * @description Routes that require completed onboarding to access.
 * Ghost users (isGhostUser: true OR onboardingComplete: false) will see
 * a locked overlay with a CTA to complete onboarding instead of the page.
 * Leaderboard is the ONLY module ghost users can preview (read-only).
 */
const GHOST_LOCKED_ROUTES = [
  "/app/vault",
  "/app/connective",
  "/app/finance",
  "/app/opportunities",
  "/app/hubs",
  "/app/learn",
  "/app/podcasts",
  "/app/assessments",
  "/app/settings",
  "/app/profile",
];

// --- MAIN LAYOUT COMPONENT ---
const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    window.innerWidth < 768,
  );

  useEffect(() => {
    const handleResize = () => setIsMobileViewport(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isSupportTicketOpen, setIsSupportTicketOpen] = useState(false);
  const [showPremiumPaywall, setShowPremiumPaywall] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTab, setSearchTab] = useState("users");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDropdownRef = useRef(null);

  // --- SEARCH MEMORY ENGINE ---
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("discotive_recent_searches");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveSearchToHistory = (query) => {
    if (!query || !query.trim()) return;
    setRecentSearches((prev) => {
      // Remove duplicates and push to top
      const filtered = prev.filter(
        (q) => q.toLowerCase() !== query.trim().toLowerCase(),
      );
      const updated = [query.trim(), ...filtered].slice(0, 10);
      localStorage.setItem(
        "discotive_recent_searches",
        JSON.stringify(updated),
      );
      return updated;
    });
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target)
      ) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- SCROLL PHYSICS ENGINE (MOBILE NAV) ---
  const mainScrollRef = useRef(null);
  const lastScrollY = useRef(0);
  const [showBottomNav, setShowBottomNav] = useState(true);

  // --- CORE STATE & ROUTING (Initialized before effects to prevent TDZ) ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { userData, loading, patchLocalData } = useUserData();

  // Search debounce + Firestore query
  useEffect(() => {
    let active = true;

    if (!searchQuery.trim() || searchQuery.length < 2) {
      const resetSearch = setTimeout(() => {
        if (active) {
          setSearchResults([]);
          // MAANG-GRADE FIX: Removed aggressive setIsSearchOpen(false)
          // The menu must remain open to show "Recent Searches" when empty.
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(resetSearch);
      };
    }

    const timer = setTimeout(async () => {
      if (!active) return;
      setIsSearchOpen(true);
      if (searchTab !== "users") return;
      setSearchLoading(true);

      try {
        const q = query(
          collection(db, "users"),
          where("identity.username", ">=", searchQuery.toLowerCase()),
          where(
            "identity.username",
            "<=",
            searchQuery.toLowerCase() + "\uf8ff",
          ),
          limit(6),
        );
        const snap = await getDocs(q);
        if (active)
          setSearchResults(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        // Handle error silently
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, searchTab]);

  // ── Per-page first-visit tutorial trigger ────────────────────────────────
  useEffect(() => {
    if (!userData?.uid) return;
    const path = location.pathname;
    // Import lazily to avoid circular deps
    import("../components/OnboardingTutorial").then(
      ({ PAGE_TUTORIAL_KEY, PAGE_TUTORIALS }) => {
        if (!PAGE_TUTORIALS[path]) return;
        const key = PAGE_TUTORIAL_KEY(path.replace(/\//g, "_"));
        if (!localStorage.getItem(key)) {
          // Set a global event so the page component can pick it up
          window.dispatchEvent(
            new CustomEvent("discotive:page_tutorial", { detail: { path } }),
          );
        }
      },
    );
  }, [location.pathname, userData?.uid]);

  // ── Per-page first-visit tutorial trigger ────────────────────────────────
  useEffect(() => {
    if (!userData?.uid) return;
    const path = location.pathname;
    // Import lazily to avoid circular deps
    import("../components/OnboardingTutorial").then(
      ({ PAGE_TUTORIAL_KEY, PAGE_TUTORIALS }) => {
        if (!PAGE_TUTORIALS[path]) return;
        const key = PAGE_TUTORIAL_KEY(path.replace(/\//g, "_"));
        if (!localStorage.getItem(key)) {
          // Set a global event so the page component can pick it up
          window.dispatchEvent(
            new CustomEvent("discotive:page_tutorial", { detail: { path } }),
          );
        }
      },
    );
  }, [location.pathname, userData?.uid]);

  // --- MAANG-GRADE MOBILE SCROLL PHYSICS ---
  useEffect(() => {
    const scrollElement = mainScrollRef.current;
    if (!scrollElement) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = scrollElement.scrollTop;

          // 1. Absolute top edge-case (iOS rubber-banding prevention)
          if (currentScrollY <= 15) {
            setShowBottomNav(true);
            lastScrollY.current = currentScrollY;
            ticking = false;
            return;
          }

          // 2. Calculate delta and apply strict tolerance threshold (prevents micro-jitters)
          const deltaY = currentScrollY - lastScrollY.current;

          if (Math.abs(deltaY) > 12) {
            // 12px threshold for intent detection
            if (deltaY > 0 && showBottomNav) {
              setShowBottomNav(false); // Scrolling down -> hide
            } else if (deltaY < 0 && !showBottomNav) {
              setShowBottomNav(true); // Scrolling up -> show
            }
            lastScrollY.current = currentScrollY;
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    // Passive listener guarantees 60fps scrolling without main-thread blocking
    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [showBottomNav]);

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

  // Performant render-phase state update (avoids cascading renders)
  const [prevPath, setPrevPath] = useState(location.pathname);
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setIsMobileMenuOpen(false);
    setIsRightSidebarOpen(false);
    setIsSearchOpen(false);
    setIsNavigating(false); // Kill loader exactly when the new chunk finishes downloading
    setShowProfileMenu(false);
    setShowLanguageMenu(false);
  }

  /**
   * @description
   * `isGhostUser`: true when a user authenticated via OAuth but hasn't
   * completed the 8-step onboarding. The ghost doc has `onboardingComplete: false`
   * and `isGhostUser: true`. We check both for resilience.
   *
   * `isRouteLocked`: true when a ghost user tries to access a protected route.
   * The Outlet renders a full-bleed locked overlay instead of the page.
   */
  const isGhostUser =
    userData?.isGhostUser === true || userData?.onboardingComplete === false;

  const isRouteLocked =
    isGhostUser &&
    GHOST_LOCKED_ROUTES.some(
      (route) =>
        location.pathname === route ||
        location.pathname.startsWith(route + "/"),
    );

  // Dashboard is partially visible for ghost users — not locked, but shows banner
  const isCommandCenter = location.pathname === "/app";
  const isPro = userData?.tier === "PRO";

  // Track if DM Panel is currently open via URL query params
  const isDMOpen =
    location.search.includes("dm=") || location.search.includes("new_dm=");

  // --- THE GHOST USER BOUNCER ---
  useEffect(() => {
    if (!loading && !userData) {
      navigate("/auth?step=2");
    }
  }, [loading, userData, navigate]); // Per architectural mandate, daily login points have been removed.
  // Boot sequence no longer triggers processDailyConsistency.

  // ── CORE OS BOOT: Daily Consistency Check [DEPRECATED] ───────────────────

  // MAANG-GRADE FIX: Pre-emptive Navigation State Override
  // React 18 holds Suspense transitions in the background by default, causing
  // the app to look "frozen" on the old page while lazy chunks download.
  // We manually trigger an immediate global loading state to provide instant feedback.
  const handleInstantNav = (path, e) => {
    if (e) e.preventDefault();

    // 1. Immediately drop all overlay UI
    setShowProfileMenu(false);
    setShowLanguageMenu(false);
    setIsMobileMenuOpen(false);

    // 2. Prevent redundant routing
    if (
      location.pathname === path ||
      location.pathname === path.replace("/feed", "")
    )
      return;

    // 3. Trigger immediate fallback UI
    setIsNavigating(true);

    // 4. Push routing to next frame so the loader renders instantly
    setTimeout(() => navigate(path), 10);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/auth?step=2");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Admin check — silent, runs once auth user is known
  useEffect(() => {
    const checkAdmin = async () => {
      if (!auth.currentUser?.email) return;
      try {
        const snap = await getDocs(
          query(
            collection(db, "admins"),
            where("email", "==", auth.currentUser.email),
          ),
        );
        setIsAdmin(!snap.empty);
      } catch {
        /* silent */
      }
    };
    checkAdmin();
  }, [userData?.uid]);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      saveSearchToHistory(searchQuery.trim());
      navigate(`/app/leaderboard?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  const NavItem = ({ item, isCollapsed }) => {
    const Icon = item.icon;

    // Check if the current path matches the parent or any child node
    const isParentActive =
      location.pathname === item.path ||
      (item.subItems &&
        item.subItems.some((sub) => location.pathname.startsWith(sub.path)));

    const [isSubMenuOpen, setIsSubMenuOpen] = useState(isParentActive);

    useEffect(() => {
      if (isParentActive && !isCollapsed) setIsSubMenuOpen(true);
    }, [isParentActive, isCollapsed]);

    const isItemLocked =
      isGhostUser &&
      GHOST_LOCKED_ROUTES.some(
        (r) => r === item.path || item.path.startsWith(r + "/"),
      );

    const isProLocked = !isPro && item.proOnly;

    return (
      <div className="flex flex-col gap-1 w-full">
        <a
          href={item.subItems ? "#" : item.path}
          onClick={
            isItemLocked
              ? (e) => handleInstantNav(item.path, e)
              : isProLocked
                ? (e) => {
                    e.preventDefault();
                    setShowPremiumPaywall(true);
                  }
                : item.subItems
                  ? (e) => {
                      e.preventDefault();
                      if (!isCollapsed) setIsSubMenuOpen(!isSubMenuOpen);
                    }
                  : (e) => handleInstantNav(item.path, e)
          }
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative w-full cursor-pointer",
            isItemLocked
              ? "text-[#444] hover:bg-[#111] font-medium"
              : isProLocked
                ? "text-[#BFA264]/60 hover:bg-[#BFA264]/10 hover:text-[#D4AF78] font-medium"
                : "text-[#F5F0E8]/60 hover:text-white font-medium",
          )}
          title={isCollapsed ? item.label : undefined}
        >
          {isParentActive && !item.subItems && !isItemLocked && (
            <motion.div
              layoutId="desktop-nav-indicator"
              layout="position"
              className="absolute inset-0 bg-[#1A1A1A] border border-white/5 rounded-xl z-0"
              transition={{ type: "tween", ease: "circOut", duration: 0.15 }}
            />
          )}
          <Icon
            className={cn(
              "w-5 h-5 shrink-0 transition-colors relative z-10",
              isParentActive && !isItemLocked
                ? "text-[#BFA264]"
                : isItemLocked
                  ? "text-[#333]"
                  : "text-[#F5F0E8]/40 group-hover:text-white",
            )}
          />
          {!isCollapsed && (
            <span
              className={cn(
                "truncate text-sm tracking-wide flex-1 relative z-10 transition-colors",
                isParentActive && !isItemLocked ? "text-white font-bold" : "",
              )}
            >
              {item.label}
            </span>
          )}
          {!isCollapsed && item.subItems && (
            <ChevronDown
              className={cn(
                "w-3 h-3 text-[#BFA264]/50 transition-transform duration-300",
                isSubMenuOpen && "rotate-180",
              )}
            />
          )}
          {isItemLocked && !isCollapsed && (
            <Lock className="w-3 h-3 text-[#333] shrink-0" />
          )}
          {isItemLocked && isCollapsed && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#333] rounded-full" />
          )}
          {isProLocked && !isCollapsed && (
            <Crown className="w-3.5 h-3.5 text-[#BFA264]/70 shrink-0" />
          )}
          {isProLocked && isCollapsed && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#BFA264] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.8)]" />
          )}
        </a>

        {/* --- DYNAMIC NESTED SUBMENU ENGINE --- */}
        <AnimatePresence>
          {item.subItems && isSubMenuOpen && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-1 pl-10 pr-2 overflow-hidden"
            >
              {item.subItems.map((sub) => {
                // Exact path match or fallback to feed if on root connective
                const isSubActive =
                  location.pathname === sub.path ||
                  (location.pathname === "/app/connective" &&
                    sub.path.endsWith("feed"));

                return (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    className={cn(
                      "relative text-[11px] py-2 px-3 rounded-lg transition-all border border-transparent font-black tracking-widest uppercase",
                      isSubActive
                        ? "text-[#D4AF78]"
                        : "text-[#F5F0E8]/40 hover:text-[#E8D5A3] hover:bg-[rgba(191,162,100,0.04)]",
                    )}
                  >
                    {isSubActive && (
                      <motion.div
                        layoutId="desktop-subnav-indicator"
                        layout="position"
                        className="absolute inset-0 bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.25)] rounded-lg shadow-[0_0_10px_rgba(191,162,100,0.05)] z-0"
                        transition={{
                          type: "tween",
                          ease: "circOut",
                          duration: 0.15,
                        }}
                      />
                    )}
                    <span className="relative z-10">{sub.label}</span>
                  </Link>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Guard: Do not trigger shortcuts if the user is actively typing in an input
      const activeElement = document.activeElement;
      const isTyping =
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable;

      if (isTyping) return;

      // Toggle shortcuts panel on "?"
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const renderProfileMenuContent = (isMobile = false) => (
    <>
      {isMobile && (
        <div className="flex items-center justify-between px-4 pb-4 border-b border-white/5 shrink-0">
          <span className="font-extrabold text-sm tracking-widest text-[#F5F0E8]">
            ACCOUNT
          </span>
          <button
            onClick={() => setShowProfileMenu(false)}
            className="p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-[#F5F0E8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header: User Info — Ghost-aware */}
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden",
              isGhostUser
                ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                : "bg-[#111] border-[#BFA264]/40 text-[#BFA264]",
            )}
          >
            {isGhostUser ? (
              "?"
            ) : userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              userData?.identity?.firstName?.charAt(0) || "U"
            )}
          </div>
          <div className="min-w-0">
            {isGhostUser ? (
              <>
                <p className="font-extrabold text-sm text-amber-400 truncate">
                  Incomplete Profile
                </p>
                <p className="text-[10px] text-[#666] font-mono truncate">
                  Onboarding required
                </p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-sm text-white truncate">
                  {userData?.identity?.firstName} {userData?.identity?.lastName}
                </p>
                <p className="text-[10px] md:text-xs text-[#888] font-mono truncate">
                  @{userData?.identity?.username || "—"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="px-4 pb-2 border-b border-[#222]">
          {isGhostUser ? (
            <button
              onClick={(e) => handleInstantNav("/auth?step=2", e)}
              className="flex items-center gap-1.5 text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              Complete Onboarding to unlock profile
            </button>
          ) : (
            <a
              href="/app/profile"
              onClick={(e) => handleInstantNav("/app/profile", e)}
              className="text-blue-400 text-xs font-bold hover:text-blue-300 transition-colors"
            >
              View full profile
            </a>
          )}
        </div>

        {/* Admin Dashboard — only visible to admins */}
        {isAdmin && (
          <div className="px-4 py-2 border-b border-[#222]">
            <a
              href="/app/admin"
              onClick={(e) => handleInstantNav("/app/admin", e)}
              className="flex items-center gap-2 text-[10px] font-black text-rose-400 hover:text-rose-300 transition-colors uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Admin Dashboard
            </a>
          </div>
        )}

        {/* Section 1: Localization */}
        <div className="py-2 border-b border-[#222]">
          <div className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] text-xs md:text-sm pointer-events-none">
            <MapPin className="w-4 h-4 text-[#888]" />
            <span>Location: {userData?.footprint?.location || "Unmapped"}</span>
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
          <a
            href="/app/settings"
            onClick={(e) => handleInstantNav("/app/settings", e)}
            className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
          >
            <Settings className="w-4 h-4 text-[#888]" /> Settings
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowProfileMenu(false);
              setShowPremiumPaywall(true);
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
          >
            <Shield className="w-4 h-4 text-[#888]" /> Discotive Pro
          </button>
          <button className="w-full px-4 py-2.5 flex items-center justify-between text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left">
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4 text-[#888]" /> Appearance: Dark
            </div>
          </button>
        </div>

        {/* Section 3: Support */}
        <div className="py-2 border-b border-[#222]">
          <button
            onClick={() => {
              setShowProfileMenu(false);
              setIsSupportTicketOpen(true);
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
          >
            <Ticket className="w-4 h-4 text-[#888]" /> Raise a Support Ticket
          </button>
          <button
            onClick={() => {
              setShowProfileMenu(false);
              setIsFeedbackOpen(true);
            }}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
          >
            <MessageSquare className="w-4 h-4 text-[#888]" /> Send Feedback
          </button>
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
      </div>
    </>
  );

  const renderLanguageMenuContent = () => (
    <>
      <div className="flex items-center gap-2 px-2 pb-2 border-b border-[#222] shrink-0">
        <button
          onClick={() => setShowLanguageMenu(false)}
          className="p-2 hover:bg-[#111] rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <span className="font-bold text-sm text-white">Choose Language</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
            <span className="text-sm text-white font-medium">English (US)</span>
            <Check className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="px-4 py-6 text-center border-t border-[#222]">
          <Globe className="w-8 h-8 text-[#333] mx-auto mb-3" />
          <p className="text-xs font-bold text-[#888] uppercase tracking-widest">
            More languages coming soon
          </p>
        </div>
      </div>
    </>
  );

  // --- EDGE SWIPE GESTURE DETECTION ---
  const touchStartRef = useRef(0);

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    // Prevent triggering if a menu is already open
    if (showProfileMenu || isMobileMenuOpen || isRightSidebarOpen) return;

    const touchEnd = e.touches[0].clientX;
    const distance = touchEnd - touchStartRef.current;
    const windowWidth = window.innerWidth;

    // Trigger only if swipe starts near the very left edge (< 40px) and moves right
    if (touchStartRef.current < 40 && distance > 50) {
      setShowProfileMenu(true);
    }

    // Trigger if swipe starts near the very right edge and moves left (Global Mobile)
    if (touchStartRef.current > windowWidth - 40 && distance < -50) {
      setIsRightSidebarOpen(true);
    }
  };

  return (
    <div
      className="flex h-[100dvh] bg-[#030303] overflow-hidden text-white selection:bg-white selection:text-black w-full fixed inset-0"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* ========================================================= */}
      {/* DESKTOP SIDEBAR (Strict z-[100] to overlay content)       */}
      {/* ========================================================= */}
      <div className="hidden md:block relative w-[80px] shrink-0 h-full z-[100]">
        <motion.aside
          onHoverStart={() => setIsSidebarOpen(true)}
          onHoverEnd={() => setIsSidebarOpen(false)}
          animate={{ width: isSidebarOpen ? 260 : 80 }}
          transition={{ type: "spring", bounce: 0, duration: 0.2 }}
          style={{ willChange: "width" }}
          className="absolute top-0 left-0 bottom-0 flex flex-col bg-[#0A0A0A] border-r border-white/5 h-full z-[100] shadow-[10px_0_50px_rgba(0,0,0,0.5)] tut-nav overflow-x-hidden"
        >
          {/* Logo Section */}
          <div className="h-20 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
            <Link to="/app" className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <img
                  src={
                    userData?.tier === "PRO" ? "/logo-premium.png" : "/logo.png"
                  }
                  alt="Discotive Logo"
                  width={32}
                  height={32}
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-contain transition-all duration-300"
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

          {/* Ghost Onboarding Banner — only shown to unboarded users */}
          {isGhostUser && isSidebarOpen && (
            <div className="mx-3 mt-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">
                    Onboarding Required
                  </p>
                  <p className="text-[9px] text-[#666] leading-relaxed mb-2">
                    Complete your profile to unlock all Career Engine modules.
                  </p>
                  <button
                    onClick={() => navigate("/auth?step=2")}
                    className="flex items-center gap-1 text-[9px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest transition-colors"
                  >
                    Start Onboarding <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {isGhostUser && !isSidebarOpen && (
            <div className="mx-3 mt-3 flex items-center justify-center">
              <div
                title="Complete Onboarding to unlock all modules"
                className="w-8 h-8 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => navigate("/auth?step=2")}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
          )}

          {/* Navigation Sections */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-6">
            <div className="space-y-1">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2">
                  Home
                </p>
              ) : (
                <div className="flex justify-center mb-2 px-2">
                  <div className="w-6 h-[1px] bg-white/10 rounded-full" />
                </div>
              )}
              {topNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isCollapsed={!isSidebarOpen}
                />
              ))}
            </div>

            {/* <div className="space-y-1">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 mt-4">
                  Execution
                </p>
              ) : (
                <div className="flex justify-center mb-2 mt-4 px-2">
                  <div className="w-6 h-[1px] bg-white/10 rounded-full" />
                </div>
              )}
              {upperMiddleNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isCollapsed={!isSidebarOpen}
                />
              ))}
            </div> */}

            <div className="space-y-1">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 mt-4">
                  Social
                </p>
              ) : (
                <div className="flex justify-center mb-2 mt-4 px-2">
                  <div className="w-6 h-[1px] bg-white/10 rounded-full" />
                </div>
              )}
              {upperContentNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isCollapsed={!isSidebarOpen}
                />
              ))}
            </div>

            <div className="space-y-1">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 mt-4">
                  Content
                </p>
              ) : (
                <div className="flex justify-center mb-2 mt-4 px-2">
                  <div className="w-6 h-[1px] bg-white/10 rounded-full" />
                </div>
              )}
              {lowerContentNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isCollapsed={!isSidebarOpen}
                />
              ))}
            </div>

            {/* <div className="space-y-1">
              {isSidebarOpen ? (
                <p className="px-3 text-[10px] font-bold text-[#555] uppercase tracking-[0.2em] mb-2 mt-4">
                  More from Discotive
                </p>
              ) : (
                <div className="flex justify-center mb-2 mt-4 px-2">
                  <div className="w-6 h-[1px] bg-white/10 rounded-full" />
                </div>
              )}
              {moreNavItems.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  isCollapsed={!isSidebarOpen}
                />
              ))}
            </div> */}

            {/* Discotive Pro upsell — seamless sidebar integration */}
            {!isPro && isSidebarOpen && (
              <div className="mt-8 mb-6">
                <div
                  className="relative w-full flex flex-col justify-end group cursor-pointer border-none bg-transparent"
                  style={{ minHeight: "160px" }}
                  onClick={() => setShowPremiumPaywall(true)}
                >
                  {/* Fading Image Background merged into Sidebar */}
                  <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none">
                    <img
                      src="/pro-promo.jpg"
                      alt="Premium"
                      className="w-full h-full object-cover object-top"
                      style={{
                        WebkitMaskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
                        maskImage:
                          "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)",
                      }}
                    />
                  </div>

                  {/* Content Stacked Below */}
                  <div className="relative z-10 px-5 flex flex-col pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-[#D4AF78] uppercase tracking-[0.25em]">
                        Discotive Pro
                      </span>
                    </div>
                    <p className="text-[10px] text-[#666] leading-relaxed mb-4 pr-2 font-medium">
                      Agenda, X-Ray, Colists, and the full Career Engine.
                    </p>
                    <div className="flex items-center gap-2 text-[9px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#D4AF78] transition-colors">
                      Upgrade{" "}
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="p-3 border-t border-white/5 bg-[#0A0A0A] shrink-0 space-y-1">
            {/* How it works? */}
            <button
              onClick={(e) => {
                e.preventDefault();
                handleInstantNav("/docs", e);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group border border-transparent w-full cursor-pointer",
                "text-[#F5F0E8]/60 hover:bg-[rgba(191,162,100,0.04)] hover:text-[#E8D5A3] font-medium",
              )}
              title={!isSidebarOpen ? "How it works?" : undefined}
            >
              <HelpCircle className="w-5 h-5 shrink-0 text-[#F5F0E8]/40 group-hover:text-[#BFA264] transition-colors" />
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="truncate text-sm tracking-wide flex-1 text-left"
                  >
                    How it works?
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {bottomNavItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isCollapsed={!isSidebarOpen}
              />
            ))}
          </div>
        </motion.aside>
      </div>

      {/* ========================================================= */}
      {/* MAIN CONTENT WRAPPER                                      */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* TOPBAR (Strict z-[90] to sit above pages but below dropdowns) */}
        <header
          className={cn(
            "safe-area-pt h-[calc(4rem+env(safe-area-inset-top))] md:h-[calc(5rem+env(safe-area-inset-top))] bg-[#0A0A0A]/90 backdrop-blur-xl flex items-center gap-3 md:gap-5 px-4 md:px-8 shrink-0 sticky top-0 z-[90] transition-colors duration-300",
            isSearchOpen
              ? "border-b-0 bg-[#0A0A0A]"
              : "border-b border-white/5",
          )}
        >
          {/* SEARCH BAR & DROPDOWN ENGINE */}
          <div
            className="flex-1 w-full max-w-md order-2 md:order-1"
            ref={searchDropdownRef}
          >
            {/* Input Container */}
            <div
              className={cn(
                "relative bg-[#111]/50 rounded-full md:rounded-xl overflow-hidden border transition-all z-[91]",
                isSearchOpen
                  ? "border-white/10 bg-[#1a1a1a]"
                  : "border-white/5 hover:border-white/10",
              )}
            >
              <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                <Search
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isSearchOpen ? "text-[#F5F0E8]" : "text-[#888]",
                  )}
                />
              </div>
              <input
                type="text"
                placeholder={
                  isMobileViewport ? "Search" : "Search operators, companies..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full bg-transparent border-none text-xs md:text-sm text-[#F5F0E8] placeholder-[#666] focus:outline-none pl-9 md:pl-10 pr-10 py-2.5 font-medium"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(true);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 md:pr-4 flex items-center text-[#888] hover:text-white transition-colors outline-none"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Dropdown & Subtle Backdrop */}
            <AnimatePresence>
              {isSearchOpen && (
                <>
                  {/* Subtle Darkening Backdrop (No Blur) */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setIsSearchOpen(false)}
                    className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top))] md:top-[calc(5rem+env(safe-area-inset-top))] bg-[#000000]/60 z-[80] cursor-default"
                  />

                  {/* Full Navbar-Width Dropdown Menu */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                    className="absolute top-full left-0 right-0 bg-[#0A0A0A] border-b border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden z-[95]"
                  >
                    {/* Taxonomy Tabs */}
                    <div className="flex px-4 md:px-8 pt-4 gap-6 border-b border-white/5 shrink-0 bg-[#0A0A0A]">
                      {["users", "companies"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setSearchTab(tab)}
                          className={cn(
                            "relative pb-3 px-1 text-[11px] font-black uppercase tracking-widest transition-colors",
                            searchTab === tab
                              ? "text-white"
                              : "text-[#888] hover:text-[#ccc]",
                          )}
                        >
                          {searchTab === tab && (
                            <motion.div
                              layoutId="dropdown-search-tab-indicator"
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#BFA264] rounded-t-full shadow-[0_0_8px_rgba(191,162,100,0.6)]"
                              transition={{
                                type: "spring",
                                bounce: 0,
                                duration: 0.2,
                              }}
                            />
                          )}
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Output Area */}
                    <div className="py-2 px-2 md:px-6 max-h-[400px] overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
                      {!searchQuery.trim() ? (
                        /* Module: Recent Searches */
                        <div className="p-2">
                          <h4 className="px-3 pt-2 pb-3 text-[10px] font-bold text-[#555] uppercase tracking-widest">
                            Recent Searches
                          </h4>
                          {recentSearches.length > 0 ? (
                            <div className="space-y-0.5">
                              {recentSearches.map((item, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setSearchQuery(item);
                                    saveSearchToHistory(item);
                                    navigate(
                                      `/app/leaderboard?q=${encodeURIComponent(item)}`,
                                    );
                                    setIsSearchOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between p-3 hover:bg-[rgba(255,255,255,0.03)] rounded-xl transition-colors text-left group"
                                >
                                  <div className="flex items-center gap-3">
                                    <Search className="w-4 h-4 text-[#444] group-hover:text-[#BFA264] transition-colors" />
                                    <span className="text-[13px] font-medium text-[#ccc] group-hover:text-white transition-colors">
                                      {item}
                                    </span>
                                  </div>
                                  <ArrowRight className="w-3.5 h-3.5 text-transparent group-hover:text-[#BFA264]/50 transition-colors" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="px-3 text-xs text-[#444] font-medium pb-2">
                              No recent searches.
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Module: Live Results */
                        <div className="p-1.5">
                          {searchTab === "companies" ? (
                            <div className="px-4 py-8 text-center">
                              <p className="text-[11px] text-[rgba(245,240,232,0.20)] font-bold uppercase tracking-widest">
                                Company search — coming soon
                              </p>
                            </div>
                          ) : searchLoading ? (
                            <div className="flex items-center justify-center py-10">
                              <div className="w-5 h-5 border-2 border-[#BFA264]/20 border-t-[#BFA264] rounded-full animate-spin" />
                            </div>
                          ) : searchResults.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <p className="text-[11px] text-[rgba(245,240,232,0.40)]">
                                No operators found for &quot;{searchQuery}&quot;
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
                              {searchResults.map((user) => (
                                <button
                                  key={user.id}
                                  onClick={() => {
                                    saveSearchToHistory(searchQuery);
                                    navigate(`/@${user.identity?.username}`);
                                    setIsSearchOpen(false);
                                    setSearchQuery("");
                                  }}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-[rgba(255,255,255,0.03)] rounded-xl transition-all text-left"
                                >
                                  <div className="w-10 h-10 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden shrink-0">
                                    {user.identity?.avatarUrl ? (
                                      <img
                                        src={user.identity.avatarUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      user.identity?.firstName?.charAt(0) || "O"
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-[#F5F0E8] truncate">
                                      {user.identity?.firstName}
                                      {user.identity?.lastName}
                                    </p>
                                    <p className="text-[10px] text-[rgba(245,240,232,0.40)] font-mono truncate">
                                      @{user.identity?.username} ·
                                      {user.identity?.domain || "General"}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <span className="text-[10px] font-black text-[#BFA264] font-mono">
                                      {(
                                        user.discotiveScore?.current || 0
                                      ).toLocaleString()}
                                      pts
                                    </span>
                                    <span className="text-[8px] font-bold text-[#555] uppercase tracking-widest mt-0.5">
                                      Lvl
                                      {Math.min(
                                        Math.floor(
                                          (user.discotiveScore?.current || 0) /
                                            1000,
                                        ) + 1,
                                        10,
                                      )}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* INSTALL APP (Desktop Only) */}
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="hidden lg:flex items-center gap-2 px-4 py-2 bg-[#BFA264] text-[#030303] font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#D4AF78] transition-all shadow-[0_0_20px_rgba(191,162,100,0.2)] order-none md:order-2 shrink-0"
            >
              <Zap className="w-3 h-3 fill-current" />
              Install App
            </button>
          )}

          {/* DESKTOP SPACER */}
          <div className="hidden md:block flex-1 order-none md:order-3"></div>

          {/* MESSAGES & NOTIFICATIONS (Mobile: Right, Desktop: Right) */}
          <div className="flex items-center gap-2 order-3 md:order-4 shrink-0">
            {/* MESSAGES BUTTON */}
            <button
              title="DM Panel"
              onClick={() => navigate("/app/connective?dm=menu")}
              className={cn(
                "p-2 md:p-2.5 rounded-full transition-all relative border active:scale-95 duration-150",
                location.pathname === "/app/connective" &&
                  location.search.includes("dm=")
                  ? "bg-[rgba(191,162,100,0.15)] text-[#D4AF78] border-[rgba(191,162,100,0.3)] shadow-[0_0_15px_rgba(191,162,100,0.1)]"
                  : "bg-[#0A0A0A] border-white/5 text-[#F5F0E8]/60 hover:text-[#D4AF78] hover:border-[rgba(191,162,100,0.2)]",
              )}
            >
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
              {/* Shows unread dot if tracked globally in userData */}
              {userData?.unreadDmCount > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#BFA264] border-2 border-[#0A0A0A] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.5)]" />
              )}
            </button>

            {/* NEW COMPONENT-BASED NOTIFICATION BELL */}
            <div title="Notifications">
              <NotificationBell
                userData={userData}
                patchLocalData={patchLocalData}
                db={db}
              />
            </div>

            {/* PC ACTIVITY WIDGET */}
            {!isGhostUser && <ActivityWidget userData={userData} />}

            {/* RIGHT SIDEBAR TOGGLE (Global Mobile) */}
            <button
              onClick={() => setIsRightSidebarOpen(true)}
              className="md:hidden p-2 rounded-full transition-all relative border active:scale-95 duration-150 bg-[#0A0A0A] border-white/5 text-[#F5F0E8]/60 hover:text-[#BFA264] flex items-center justify-center shadow-sm ml-1"
              aria-label="Open Telemetry"
            >
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          {/* --- PROFILE DROPDOWN ENGINE (Mobile: Left, Desktop: Right) --- */}
          <div className="relative order-1 md:order-5 shrink-0">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowLanguageMenu(false);
              }}
              className={cn(
                "group flex items-center transition-all duration-200 outline-none active:scale-95",
                // Mobile: tightly hugs the circle. Desktop: Pill styling with padding and borders.
                "gap-0 lg:gap-2 lg:p-1 lg:pr-3 lg:rounded-full lg:border",
                showProfileMenu
                  ? "lg:bg-[rgba(191,162,100,0.08)] lg:border-[rgba(191,162,100,0.25)] shadow-[0_0_15px_rgba(191,162,100,0.05)]"
                  : "lg:bg-[#0A0A0A] lg:border-white/5 hover:lg:border-[rgba(191,162,100,0.2)]",
              )}
            >
              {/* Avatar circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold tracking-wide shrink-0 transition-all border overflow-hidden",
                  isGhostUser
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    : showProfileMenu
                      ? "bg-[#D4AF78] text-[#030303] border-[rgba(191,162,100,0.5)] shadow-[0_0_10px_rgba(191,162,100,0.2)]"
                      : "bg-[#111] text-[#F5F0E8]/60 border-[#BFA264]/40 group-hover:border-[#D4AF78]/50 group-hover:text-[#D4AF78]",
                )}
              >
                {isGhostUser ? (
                  "?"
                ) : userData?.identity?.avatarUrl ? (
                  <img
                    src={userData.identity.avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}` ||
                  "U"
                )}
              </div>

              {/* Name — desktop only */}
              <span
                className={cn(
                  "hidden lg:block text-xs font-bold tracking-wide max-w-[80px] truncate transition-colors",
                  showProfileMenu
                    ? "text-white"
                    : "text-[#888] group-hover:text-white",
                )}
              >
                {isGhostUser
                  ? "Setup"
                  : userData?.identity?.firstName || "Operator"}
              </span>

              {/* Tier badge */}
              {userData?.tier === "PRO" && !isGhostUser && (
                <div className="hidden lg:flex items-center">
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                    PRO
                  </span>
                </div>
              )}
            </button>
          </div>
        </header>

        {/* --- PROFILE DROPDOWN ENGINE (Rendered at root for absolute z-index priority) --- */}
        <AnimatePresence>
          {/* MOBILE MENU WRAPPERS */}
          {showProfileMenu && !showLanguageMenu && (
            <motion.div key="mobile-main-wrapper" className="md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9990]"
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowLanguageMenu(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[85vw] max-w-[320px] bg-[#0A0A0A] border-r border-white/5 shadow-2xl z-[9999] flex flex-col py-6 overflow-hidden"
              >
                {renderProfileMenuContent(true)}
              </motion.div>
            </motion.div>
          )}

          {showProfileMenu && showLanguageMenu && (
            <motion.div key="mobile-lang-wrapper" className="md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9990]"
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowLanguageMenu(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, x: "-100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-[85vw] max-w-[320px] bg-[#0A0A0A] border-r border-white/5 shadow-2xl z-[9999] flex flex-col py-6 overflow-hidden"
              >
                {renderLanguageMenuContent()}
              </motion.div>
            </motion.div>
          )}

          {/* DESKTOP MENU WRAPPERS */}
          {showProfileMenu && !showLanguageMenu && (
            <motion.div key="desktop-main-wrapper" className="hidden md:block">
              <div
                className="fixed inset-0 z-[9990]"
                onClick={() => setShowProfileMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed right-4 md:right-8 top-[calc(5rem+env(safe-area-inset-top)+12px)] w-[320px] bg-[#0A0A0A] border border-white/5 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.95)] z-[9999] flex-col py-2 max-h-[80vh] overflow-hidden"
              >
                {renderProfileMenuContent(false)}
              </motion.div>
            </motion.div>
          )}

          {showProfileMenu && showLanguageMenu && (
            <motion.div key="desktop-lang-wrapper" className="hidden md:block">
              <div
                className="fixed inset-0 z-[9990]"
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowLanguageMenu(false);
                }}
              />
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="fixed right-4 md:right-8 top-[calc(5rem+env(safe-area-inset-top)+12px)] w-[320px] bg-[#0A0A0A] border border-white/5 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.95)] z-[9999] flex-col py-2 max-h-[80vh] overflow-hidden"
              >
                {renderLanguageMenuContent()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MAIN PAGE CONTENT OUTLET --- */}
        <main
          ref={mainScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative z-0 custom-scrollbar"
        >
          {isRouteLocked ? (
            /**
             * @description
             * Full-bleed locked overlay. Shown when a ghost user navigates to
             * any GHOST_LOCKED_ROUTE. The Outlet is NOT rendered — we show
             * this component instead to prevent the module from partially
             * mounting and crashing on missing userData fields.
             */
            <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-[#030303]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-md w-full"
              >
                {/* Lock icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-[2rem] bg-amber-500/8 border border-amber-500/20 flex items-center justify-center relative">
                  <Lock className="w-9 h-9 text-amber-500/70" />
                  <div className="absolute -inset-3 rounded-[2.5rem] border border-amber-500/8 animate-ping" />
                </div>

                {/* Title */}
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-3 leading-tight">
                  Module Locked.
                </h2>
                <p className="text-[#555] text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                  This module requires a complete operator profile. Finish your
                  8-step onboarding to unlock the full Career Engine — global
                  leaderboard, asset vault, networking, and more.
                </p>

                {/* What they unlock */}
                <div className="mb-8 p-4 bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl text-left space-y-2.5">
                  {[
                    "Asset Vault — credential & proof storage",
                    "Leaderboard — compete in your domain",
                    "Networking — alliances & operator discovery",
                    "Opportunities — curated roles & gigs",
                    "Discotive Learn — verified domain resources",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[11px] font-bold text-[#888]">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate("/auth?step=2")}
                  className="w-full py-4 bg-white text-black font-extrabold rounded-2xl hover:bg-[#e5e5e5] transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                >
                  Complete Onboarding
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => navigate("/app/leaderboard")}
                  className="mt-3 w-full py-3 bg-transparent border border-[#222] text-[#666] hover:text-white hover:border-[#444] font-bold rounded-2xl transition-all text-xs uppercase tracking-widest"
                >
                  Preview Leaderboard (Available to All)
                </button>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Ghost Command Center Banner — shown on dashboard for ghost users */}
              {isGhostUser && isCommandCenter && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 md:mx-8 mt-4 md:mt-6 p-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center gap-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-400 mb-0.5">
                        Onboarding Incomplete — Career Engine Locked
                      </p>
                      <p className="text-xs text-[#666] leading-relaxed">
                        You're signed in but your operator profile is empty.
                        Complete the 8-step setup to activate all modules, enter
                        the leaderboard, and secure your asset vault.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/auth?step=2")}
                    className="shrink-0 px-5 py-2.5 bg-amber-500 text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center gap-2"
                  >
                    Start Onboarding <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {/* MAANG-GRADE UX: Nested Suspense Boundary & Manual Transition Override */}
              <Suspense
                fallback={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full"
                  >
                    <div className="w-10 h-10 border-[3px] border-[rgba(191,162,100,0.1)] border-t-[#BFA264] rounded-full animate-spin drop-shadow-[0_0_15px_rgba(191,162,100,0.4)]" />
                    <span className="mt-5 text-[10px] font-bold text-[#BFA264]/60 uppercase tracking-[0.3em] animate-pulse">
                      Initializing Sector
                    </span>
                  </motion.div>
                }
              >
                {isNavigating ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center min-h-[60vh] w-full"
                  >
                    <div className="w-10 h-10 border-[3px] border-[rgba(191,162,100,0.1)] border-t-[#BFA264] rounded-full animate-spin drop-shadow-[0_0_15px_rgba(191,162,100,0.4)]" />
                    <span className="mt-5 text-[10px] font-bold text-[#BFA264]/60 uppercase tracking-[0.3em] animate-pulse">
                      Initializing Sector
                    </span>
                  </motion.div>
                ) : (
                  <Outlet />
                )}
              </Suspense>
            </>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Strictly 5 Icons)           */}
      {/* ========================================================= */}
      <motion.nav
        initial={{ y: 0 }}
        animate={{ y: showBottomNav ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.8 }}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/5 z-[100] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1 min-h-[calc(4rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.6)] will-change-transform tut-nav"
      >
        {[
          { icon: LayoutDashboard, path: "/app", label: "Dashboard" },
          { icon: Users, path: "/app/connective/feed", label: "Connective" },
          { icon: Trophy, path: "/app/leaderboard", label: "Arena" },
          { icon: FolderOpen, path: "/app/vault", label: "Vault" },
        ].map((item) => {
          const Icon = item.icon;
          // MAANG-Grade: Intelligent route matching for parent-child pathing on mobile
          const isActive =
            item.path === "/app/connective/feed"
              ? location.pathname.startsWith("/app/connective")
              : location.pathname === item.path;

          const isMobileItemLocked =
            isGhostUser &&
            GHOST_LOCKED_ROUTES.some(
              (r) => r === item.path || item.path.startsWith(r + "/"),
            );
          return (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => handleInstantNav(item.path, e)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95 duration-150 relative",
                isMobileItemLocked
                  ? "text-[#444]"
                  : "text-[#F5F0E8]/40 hover:text-white",
              )}
            >
              {isActive && !isMobileItemLocked && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  layout="position"
                  className="absolute -bottom-1 inset-x-0 mx-auto w-10 h-[2px] bg-[#BFA264] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.6)] z-0"
                  transition={{
                    type: "tween",
                    duration: 0.15,
                    ease: "circOut",
                  }}
                />
              )}
              <div className="relative z-10">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive && !isMobileItemLocked ? "text-[#BFA264]" : "",
                  )}
                />
                {isMobileItemLocked && (
                  <Lock className="absolute -top-1 -right-1 w-2.5 h-2.5 text-[#444]" />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-bold tracking-wider relative z-10 transition-colors",
                  isActive && !isMobileItemLocked ? "text-white" : "",
                )}
              >
                {item.label}
              </span>
            </a>
          );
        })}

        {/* The Hamburger Trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
            isMobileMenuOpen
              ? "text-[#D4AF78]"
              : "text-[#F5F0E8]/40 active:text-[#F5F0E8]/80",
          )}
        >
          {isMobileMenuOpen && (
            <motion.div
              layoutId="mobile-nav-indicator"
              layout="position"
              className="absolute -bottom-1 inset-x-0 mx-auto w-10 h-[2px] bg-[#BFA264] rounded-full shadow-[0_0_8px_rgba(191,162,100,0.6)] z-0"
              transition={{
                type: "tween",
                duration: 0.15,
                ease: "circOut",
              }}
            />
          )}
          <Menu className="w-5 h-5 relative z-10" />
          <span className="text-[9px] font-bold tracking-wider relative z-10">
            Menu
          </span>
        </button>
      </motion.nav>

      {/* ========================================================= */}
      {/* MOBILE HAMBURGER OVERLAY MENU (NATIVE BOTTOM SHEET)       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-[#030303]/95 z-[9998]"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{
                type: "tween",
                ease: [0.25, 1, 0.5, 1],
                duration: 0.3,
              }}
              style={{ willChange: "transform" }}
              className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/10 z-[9999] flex flex-col rounded-t-[2rem] overflow-hidden shadow-[0_-20px_60px_rgba(0,0,0,0.9)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              {/* Handle/Pill */}
              <div
                className="w-full flex justify-center pt-3 pb-2 cursor-pointer"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="w-12 h-1.5 bg-[#333] rounded-full" />
              </div>

              {/* Content Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6 max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <span className="font-extrabold text-sm tracking-widest text-[#F5F0E8]">
                    DISCOTIVE OS
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => handleInstantNav("/app/settings", e)}
                      className="p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-[#BFA264] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* User Snapshot (Now acts as Profile Link) */}
                {isGhostUser ? (
                  <div
                    className="flex items-center gap-4 p-4 bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.25)] rounded-2xl cursor-pointer"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      navigate("/auth?step=2");
                    }}
                  >
                    <div className="w-12 h-12 rounded-full bg-[rgba(191,162,100,0.15)] border border-[rgba(191,162,100,0.3)] flex items-center justify-center text-lg font-bold text-[#D4AF78]">
                      ?
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[#D4AF78]">
                        Profile Incomplete
                      </p>
                      <p className="text-[10px] text-[#BFA264] font-mono tracking-widest uppercase truncate">
                        Tap to complete onboarding
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#D4AF78] shrink-0" />
                  </div>
                ) : (
                  <div
                    onClick={(e) => handleInstantNav("/app/profile", e)}
                    className="flex items-center gap-4 p-4 bg-[#0F0F0F] border border-white/5 rounded-2xl cursor-pointer hover:bg-[rgba(255,255,255,0.03)] active:bg-[#111] transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#111] border border-[#BFA264]/40 flex items-center justify-center text-lg font-bold text-[#D4AF78] overflow-hidden shrink-0">
                      {userData?.identity?.avatarUrl ? (
                        <img
                          src={userData.identity.avatarUrl}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        userData?.identity?.firstName?.charAt(0) || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[#F5F0E8] truncate group-hover:text-white transition-colors">
                        {userData?.identity?.firstName}
                        {userData?.identity?.lastName}
                      </p>
                      <p className="text-[10px] text-[#F5F0E8]/60 font-mono tracking-widest uppercase truncate">
                        Lvl
                        {Math.min(
                          Math.floor(
                            (userData?.discotiveScore?.current ?? 0) / 1000,
                          ) + 1,
                          10,
                        )}
                        Operator
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#555] group-hover:text-[#BFA264] transition-colors shrink-0" />
                  </div>
                )}

                {/* Premium & Admin */}
                <div className="space-y-2">
                  {!isPro && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMobileMenuOpen(false);
                        setShowPremiumPaywall(true);
                      }}
                      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[rgba(191,162,100,0.15)] to-transparent border border-[rgba(191,162,100,0.25)] rounded-2xl active:bg-[rgba(191,162,100,0.2)]"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="w-5 h-5 text-[#D4AF78]" />
                        <span className="text-sm font-bold text-[#D4AF78]">
                          Discotive Pro
                        </span>
                      </div>
                      <Zap className="w-4 h-4 text-[#D4AF78]" />
                    </button>
                  )}
                  {isAdmin && (
                    <a
                      href="/app/admin"
                      onClick={(e) => handleInstantNav("/app/admin", e)}
                      className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl active:bg-rose-500/20"
                    >
                      <div className="flex items-center gap-4">
                        <Shield className="w-5 h-5 text-rose-400" />
                        <span className="text-sm font-bold text-rose-400">
                          Admin Dashboard
                        </span>
                      </div>
                    </a>
                  )}
                </div>

                {/* Support & Exit */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSupportTicketOpen(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-[#0F0F0F] border border-white/5 rounded-2xl active:bg-[#111]"
                  >
                    <HelpCircle className="w-5 h-5 text-[#F5F0E8]/60" />
                    <span className="text-sm font-bold text-[#F5F0E8]/80">
                      Raise Ticket
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsFeedbackOpen(true);
                    }}
                    className="w-full flex items-center gap-4 p-4 bg-[#0F0F0F] border border-white/5 rounded-2xl active:bg-[#111]"
                  >
                    <MessageSquare className="w-5 h-5 text-[#F5F0E8]/60" />
                    <span className="text-sm font-bold text-[#F5F0E8]/80">
                      Send Feedback
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl active:bg-red-500/10 mt-4"
                  >
                    <LogOut className="w-5 h-5 text-red-500/80" />
                    <span className="text-sm font-bold text-red-500/80">
                      Sign Out
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GLOBAL GRACE AI */}
      {!isGhostUser && !isDMOpen && <Grace userData={userData} />}

      {/* GLOBAL SHORTCUTS MODAL */}
      <ShortcutsPanel
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        user={auth.currentUser} // Pass user object if you need uid for Firestore
      />

      <SupportTicketModal
        isOpen={isSupportTicketOpen}
        onClose={() => setIsSupportTicketOpen(false)}
        user={auth.currentUser}
        userData={userData}
      />

      <TelemetryData
        isOpen={isRightSidebarOpen}
        onClose={() => setIsRightSidebarOpen(false)}
        userData={userData}
      />

      <PremiumPaywall
        isOpen={showPremiumPaywall}
        onClose={() => setShowPremiumPaywall(false)}
      />
    </div>
  );
};

export default MainLayout;
