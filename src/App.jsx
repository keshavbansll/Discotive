import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useUserData } from "./hooks/useUserData"; // <-- Inject this
import { Helmet } from "react-helmet-async";

// ── EAGER IMPORTS (The Critical Path) ──
// These MUST load immediately. Landing is the entry point. MainLayout is the shell.
import Landing from "./pages/Landing"; // The new acquisition engine
import About from "./pages/About"; // The legacy informational view
import MainLayout from "./layouts/MainLayout";
import GlobalLoader from "./components/GlobalLoader";
import PageTracker from "./components/PageTracker";
import SystemFailure from "./components/boundaries/SystemFailure";
import AdminRoute from "./components/AdminRoute";
import ComingSoon from "./components/ComingSoon";

// ── LAZY IMPORTS (Code-Split Chunks) ──
// These are chunked into separate files and downloaded ONLY when the route is hit.
const Auth = lazy(() => import("./pages/Auth"));
const ColistsLayout = lazy(() => import("./layouts/ColistsLayout"));
const Colists = lazy(() => import("./pages/Colists"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const Agenda = lazy(() => import("./pages/Agenda"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Vault = lazy(() => import("./pages/vault/Vault"));
const ConnectorHub = lazy(
  () => import("./pages/vault/connectors/ConnectorHub"),
);
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Premium = lazy(() => import("./pages/Premium"));
const Checkout = lazy(() => import("./pages/Checkout"));
const VerifyAsset = lazy(() => import("./pages/VerifyAsset"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const Learn = lazy(() => import("./pages/Learn"));
const NotificationPageWrapper = lazy(() =>
  import("./components/NotificationCenter").then((m) => ({
    default: m.NotificationPage,
  })),
);

// Stubbed/Coming Soon Modules
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Hubs = lazy(() => import("./pages/Hubs"));
const Connective = lazy(() => import("./pages/Connective"));

// Admin Modules (Heavy tables, graphs, CMS logic - KEEP LAZY)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
};

// Ghost users can browse read-only pages; onboarding modal triggers on action
const GhostAwareRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/app" replace />;
  return children;
};

// --- SMART WRAPPER FOR NOTIFICATIONS ---
const NotificationRouteHandler = () => {
  const { userData, patchLocalData } = useUserData();
  return (
    <NotificationPageWrapper
      userData={userData}
      patchLocalData={patchLocalData}
    />
  );
};

const RouteChunkLoader = () => (
  <div className="fixed inset-0 z-[9998] bg-[#030303] flex items-center justify-center">
    {/* Enforcing the Gold & Void Protocol for micro-interactions */}
    <div className="w-8 h-8 border-2 border-[#BFA264] border-t-transparent rounded-full animate-spin drop-shadow-[0_0_15px_rgba(191,162,100,0.4)]" />
  </div>
);

// ── GLOBAL ROUTE METADATA MANAGER (SEO & LLM OPTIMIZED) ──────────────────────
const RouteMetadataManager = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = "Discotive | Unified Career Engine";
  let description =
    "Build your monopoly. Discotive is the algorithmic career system for people from all domains. Plan execution, track consistency, and verify your compete globally.";

  if (path.startsWith("/app/admin")) {
    title = "Admin Command | Discotive";
  } else if (path.startsWith("/app")) {
    const subPath = path.split("/")[2] || "";
    const appTitles = {
      "": "Dashboard | Discotive",
      agenda: "Discotive Agenda",
      leaderboard: "Global Arena | Discotive",
      vault: "Vault | Discotive",
      connective: path.includes("network")
        ? "Network | Discotive"
        : path.includes("feed")
          ? "Execution Feed | Discotive"
          : "Connective | Discotive",
      learn: "Learn | Discotive",
      settings: "Settings | Discotive",
      profile: path.includes("/edit")
        ? "Edit Profile | Discotive"
        : "Profile | Discotive",
      finance: "Financial Ledger | Discotive",
      opportunities: "Opportunities | Discotive",
      hubs: "Hubs | Discotive",
      roadmap: "Execution Agent | Discotive",
      podcasts: "Podcasts & Media | Discotive",
      assessments: "Workshops & Assessments | Discotive",
      discover: "Discover | Discotive",
    };
    title = appTitles[subPath] || "Command Center | Discotive";
    description =
      "Manage your Discotive Execution Engine, track your score, and sync your assets.";
  } else {
    const staticRoutes = {
      "/about": {
        t: "About | Discotive",
        d: "Learn about the mission behind Discotive, the ultimate career operating system.",
      },
      "/auth": {
        t: "Authenticate | Discotive",
        d: "Log in or register to enter the Discotive global arena.",
      },
      "/premium": {
        t: "Premium | Discotive",
        d: "Upgrade your execution. Unlock advanced AI nodes, granular analytics, and priority asset verification.",
      },
      "/checkout": {
        t: "Checkout | Discotive",
        d: "Secure your Discotive Premium subscription.",
      },
      "/contact": {
        t: "Contact | Discotive",
        d: "Get in touch with the Discotive team for support, business inquiries, or alliance requests.",
      },
      "/privacy": {
        t: "Privacy Policy | Discotive",
        d: "Zero-Trust by Default. Read how Discotive protects and manages your execution data.",
      },
      "/verify-asset": {
        t: "Verify Asset | Discotive",
        d: "Verify the authenticity of a Discotive Digital Credential or Vault Asset.",
      },
    };
    if (staticRoutes[path]) {
      title = staticRoutes[path].t;
      description = staticRoutes[path].d;
    }
  }

  // Skip rendering Helmet here for public profiles; let the PublicProfile component handle its own dynamic SEO.
  const isDynamicProfileRoute =
    !path.startsWith("/app") &&
    ![
      "/",
      "/about",
      "/auth",
      "/premium",
      "/checkout",
      "/contact",
      "/privacy",
      "/verify-asset",
    ].includes(path);

  if (isDynamicProfileRoute) return null;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`https://www.discotive.in${path}`} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <link rel="canonical" href={`https://www.discotive.in${path}`} />
    </Helmet>
  );
};

const AppInitializer = ({ children }) => {
  const { loading } = useAuth();
  const [showBootScreen, setShowBootScreen] = useState(true);

  return (
    <>
      {/* Mount the cursor globally, outside the boot screen conditional */}

      <AnimatePresence>
        {showBootScreen && (
          <GlobalLoader
            isReady={!loading}
            onComplete={() => setShowBootScreen(false)}
          />
        )}
      </AnimatePresence>

      {!showBootScreen && children}
    </>
  );
};

function App() {
  useEffect(() => {
    const injectUmami = () => {
      // Prevent duplicate injections if React strict mode double-fires
      if (
        document.querySelector('script[src="https://cloud.umami.is/script.js"]')
      ) {
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cloud.umami.is/script.js";
      script.dataset.websiteId = "1ff7e483-a629-4cee-93fb-c98c6d68bedc";
      script.async = true; // async is critical here
      document.body.appendChild(script);
    };

    // Wait for the main thread to be completely idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(injectUmami);
    } else {
      // Fallback for Safari (which doesn't support requestIdleCallback natively yet)
      setTimeout(injectUmami, 2500);
    }
  }, []);

  return (
    <AuthProvider>
      <AppInitializer>
        <Router>
          <RouteMetadataManager />
          <PageTracker />
          <Suspense fallback={<RouteChunkLoader />}>
            <Routes>
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <Landing />
                  </PublicRoute>
                }
              />
              <Route
                path="/about"
                element={
                  <PublicRoute>
                    <About />
                  </PublicRoute>
                }
              />
              <Route
                path="connective"
                element={<ComingSoon title="connective" />}
              />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/action" element={<ResetPassword />} />
              <Route path="/colists" element={<ColistsLayout />}>
                <Route index element={<Colists />} />
                <Route path=":slug/*" element={<Colists />} />
              </Route>
              <Route path="/:handle" element={<PublicProfile />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/verify-asset" element={<VerifyAsset />} />

              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="agenda"
                  element={
                    <ProtectedRoute>
                      <Agenda />
                    </ProtectedRoute>
                  }
                />
                <Route index element={<Dashboard />} />
                <Route
                  path="agent"
                  element={<ComingSoon title="Execution Agent" />}
                />
                <Route
                  path="leaderboard"
                  element={
                    <GhostAwareRoute>
                      <Leaderboard />
                    </GhostAwareRoute>
                  }
                />
                <Route path="opportunities" element={<Opportunities />} />
                <Route
                  path="notifications"
                  element={
                    <GhostAwareRoute>
                      <NotificationRouteHandler />
                    </GhostAwareRoute>
                  }
                />
                <Route path="vault" element={<Vault />} />
                <Route
                  path="vault/connectors/:connectorId"
                  element={<ConnectorHub />}
                />
                <Route path="hubs" element={<ComingSoon title="Hubs" />} />
                {/* PROFILE ROUTES */}
                <Route path="profile" element={<Profile />} />
                <Route path="profile/edit" element={<EditProfile />} />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="finance"
                  element={<ComingSoon title="Financial Ledger" />}
                />
                <Route path="connective/*" element={<Connective />} />
                <Route path="learn" element={<Learn />} />
                <Route
                  path="podcasts"
                  element={<ComingSoon title="Podcasts & Media" />}
                />
                <Route
                  path="assessments"
                  element={<ComingSoon title="Workshops & Assessments" />}
                />
                <Route
                  path="discover"
                  element={<ComingSoon title="Discover" />}
                />

                {/* ── ADMIN ROUTES (protected by AdminRoute — checks `admins` Firestore collection) ── */}
                <Route path="admin" element={<AdminRoute />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="*" element={<AdminDashboard />} />
                </Route>
              </Route>
              <Route
                path="*"
                element={
                  <SystemFailure
                    errorType="404_SECTOR_NOT_FOUND"
                    errorMessage="The requested routing directory does not exist in the current execution map."
                  />
                }
              />
            </Routes>
          </Suspense>
        </Router>
      </AppInitializer>
    </AuthProvider>
  );
}

export default App;
