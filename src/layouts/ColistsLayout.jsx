import React, { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { cn } from "../lib/cn";
import {
  User,
  LogOut,
  LayoutDashboard,
  Settings,
  ChevronRight as ChevronRightIcon,
  X,
  Check,
  Globe,
  Languages,
  MapPin,
  BookOpen,
} from "lucide-react";

const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  border: "rgba(191,162,100,0.25)",
};

const Header = React.memo(
  ({
    currentUser,
    userData,
    navigate,
    showProfileMenu,
    setShowProfileMenu,
    showLanguageMenu,
    setShowLanguageMenu,
  }) => {
    const isGhostUser =
      userData?.isGhostUser === true || userData?.onboardingComplete === false;

    const handleInstantNav = (path, e) => {
      if (e) e.preventDefault();
      setShowProfileMenu(false);
      setShowLanguageMenu(false);
      setTimeout(() => navigate(path), 10);
    };

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
                    {userData?.identity?.firstName}{" "}
                    {userData?.identity?.lastName}
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
                className="text-amber-400 text-xs font-bold hover:text-amber-300 transition-colors"
              >
                Complete Onboarding
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

          <div className="py-2 border-b border-[#222]">
            <div className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] text-xs md:text-sm pointer-events-none">
              <MapPin className="w-4 h-4 text-[#888]" />
              <span>
                Location: {userData?.footprint?.location || "Unmapped"}
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

          <div className="py-2 border-b border-[#222]">
            <button
              onClick={(e) => handleInstantNav("/app", e)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
            >
              <LayoutDashboard className="w-4 h-4 text-[#888]" /> Command Center
            </button>
            <a
              href="/app/settings"
              onClick={(e) => handleInstantNav("/app/settings", e)}
              className="px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm"
            >
              <Settings className="w-4 h-4 text-[#888]" /> Settings
            </a>
          </div>

          <div className="py-2">
            <button
              onClick={async () => {
                const { signOut } = await import("firebase/auth");
                const { auth } = await import("../firebase");
                await signOut(auth);
                navigate("/auth?step=2");
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-[#ccc] hover:bg-[#111] transition-colors text-xs md:text-sm text-left"
            >
              <LogOut className="w-4 h-4 text-[#888]" /> Sign out
            </button>
          </div>
        </div>
      </>
    );

    const renderLanguageMenuContent = (isMobile = false) => (
      <>
        <div className="flex items-center gap-2 px-2 pb-2 border-b border-[#222] shrink-0">
          <button
            onClick={() => setShowLanguageMenu(false)}
            className="p-2 hover:bg-[#111] rounded-full transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-white rotate-180" />
          </button>
          <span className="font-bold text-sm text-white">Choose Language</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
        </div>
      </>
    );

    return (
      <header className="safe-area-pt h-[calc(4rem+env(safe-area-inset-top))] bg-[#0A0A0A]/90 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-[100] border-b border-white/5">
        <button
          onClick={() => navigate(currentUser ? "/app" : "/")}
          className="flex items-center gap-2 group"
        >
          <img
            src="/logo.png"
            alt="Logo"
            className="w-8 h-8 object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-extrabold text-lg tracking-tight hidden md:block text-white">
            DISCOTIVE
          </span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border transition-all overflow-hidden"
            style={{
              background: "#111",
              border: currentUser
                ? `1px solid ${G.border}`
                : "1px solid rgba(255,255,255,0.1)",
              color: currentUser ? G.bright : "rgba(255,255,255,0.5)",
            }}
          >
            {!currentUser ? (
              <User size={18} />
            ) : userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              userData?.identity?.firstName?.charAt(0) || "U"
            )}
          </button>
          <AnimatePresence>
            {showProfileMenu && !showLanguageMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setShowProfileMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-56 md:w-[320px] rounded-2xl shadow-2xl py-2 z-[9999]"
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {!currentUser ? (
                    <button
                      onClick={() => navigate("/auth")}
                      className="w-full px-4 py-3 flex items-center gap-3 text-white hover:bg-[#111] transition-colors text-sm font-bold text-left"
                    >
                      <LogOut className="w-4 h-4 rotate-180" /> Sign In / Sign
                      Up
                    </button>
                  ) : (
                    renderProfileMenuContent(false)
                  )}
                </motion.div>
              </>
            )}
            {showProfileMenu && showLanguageMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[9998]"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLanguageMenu(false);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-56 md:w-[320px] rounded-2xl shadow-2xl py-2 z-[9999]"
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  {renderLanguageMenuContent(false)}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>
    );
  },
);

const ColistsLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userData } = useUserData();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);

  const mainScrollRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const cur = el.scrollTop;
          if (cur <= 15) {
            setShowBottomNav(true);
            lastScrollY.current = cur;
            ticking = false;
            return;
          }
          const delta = cur - lastScrollY.current;
          if (Math.abs(delta) > 12) {
            setShowBottomNav(delta < 0);
            lastScrollY.current = cur;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const isReaderView =
    location.pathname !== "/colists" && location.pathname !== "/colists/new";

  return (
    <div className="flex flex-col h-[100dvh] w-full fixed inset-0 overflow-hidden bg-[#030303]">
      {!isReaderView && (
        <Header
          currentUser={currentUser}
          userData={userData}
          navigate={navigate}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          showLanguageMenu={showLanguageMenu}
          setShowLanguageMenu={setShowLanguageMenu}
        />
      )}

      {/* REFACTOR: Removing relative z-0 fixes mobile filter sidebar stacking context */}
      <main
        ref={mainScrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar"
      >
        <Outlet context={{ showBottomNav, setShowBottomNav }} />
      </main>

      {!isReaderView && (
        <motion.nav
          initial={{ y: 0 }}
          animate={{ y: showBottomNav ? 0 : "100%" }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/5 z-[40] flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1 h-[calc(4rem+env(safe-area-inset-bottom))] shadow-[0_-10px_40px_rgba(0,0,0,0.6)] will-change-transform"
        >
          {[
            { icon: LayoutDashboard, path: "/app", label: "App" },
            {
              icon: BookOpen,
              path: "/colists",
              label: "Colists",
              active: true,
            },
            currentUser && {
              icon: User,
              path: "/app/profile",
              label: "Profile",
            },
          ]
            .filter(Boolean)
            .map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center w-[4.5rem] h-full gap-1 transition-all active:scale-95 duration-150 relative",
                  item.active
                    ? "text-[#BFA264]"
                    : "text-[#F5F0E8]/40 hover:text-white",
                )}
              >
                {item.active && (
                  <motion.div
                    layoutId="colists-mobile-nav"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-[#BFA264] rounded-full z-0"
                  />
                )}
                <div className="relative z-10">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[9px] font-bold tracking-wider relative z-10">
                  {item.label}
                </span>
              </button>
            ))}
        </motion.nav>
      )}
    </div>
  );
};

export default ColistsLayout;
