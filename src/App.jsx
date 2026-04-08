import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

// ── EAGER IMPORTS (The Critical Path) ──
// These MUST load immediately. Landing is the entry point. MainLayout is the shell.
import Landing from "./pages/Landing";
import MainLayout from "./layouts/MainLayout";
import GlobalLoader from "./components/GlobalLoader";
import PageTracker from "./components/PageTracker";
import SystemFailure from "./components/SystemFailure";
import AdminRoute from "./components/AdminRoute";

// ── LAZY IMPORTS (Code-Split Chunks) ──
// These are chunked into separate files and downloaded ONLY when the route is hit.
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Roadmap = lazy(() => import("./pages/Roadmap"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Vault = lazy(() => import("./pages/Vault"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Premium = lazy(() => import("./pages/Premium"));
const Checkout = lazy(() => import("./pages/Checkout"));
const VerifyAsset = lazy(() => import("./pages/VerifyAsset"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const LearnDatabase = lazy(() => import("./pages/LearnDatabase"));

// Stubbed/Coming Soon Modules
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Hubs = lazy(() => import("./pages/Hubs"));
const Network = lazy(() => import("./pages/Network"));

// Admin Modules (Heavy tables, graphs, CMS logic - KEEP LAZY)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const VaultVerification = lazy(() => import("./pages/admin/VaultVerification"));
const TicketManager = lazy(() => import("./pages/admin/TicketManager"));
const ReportManager = lazy(() => import("./pages/admin/ReportManager"));
const FeedbackManager = lazy(() => import("./pages/admin/FeedbackManager"));

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/app" replace />;
  return children;
};

// Reusable dummy component for coming soon pages
const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-10 animate-pulse">
    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
      <div className="w-8 h-8 border-2 border-slate-600 rounded-full" />
    </div>
    <h1 className="text-3xl font-extrabold text-white mb-2">{title}</h1>
    <p className="text-slate-500 font-medium">
      This module is currently in development.
    </p>
  </div>
);

const RouteChunkLoader = () => (
  <div className="fixed inset-0 z-[9998] bg-[#030303] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
  </div>
);
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
          <PageTracker />
          <Suspense fallback={<RouteChunkLoader />}>
            <Routes>
              <Route path="/" element={<Navigate to="/about" replace />} />
              <Route
                path="/about"
                element={
                  <PublicRoute>
                    <Landing />
                  </PublicRoute>
                }
              />
              <Route
                path="connective"
                element={<ComingSoon title="connective" />}
              />
              <Route path="/auth" element={<Auth />} />
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
                <Route index element={<Dashboard />} />
                <Route path="roadmap" element={<Roadmap />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route
                  path="opportunities"
                  element={<ComingSoon title="Opportunities" />}
                />
                <Route path="vault" element={<Vault />} />
                <Route path="hubs" element={<ComingSoon title="Hubs" />} />
                {/* PROFILE ROUTES */}
                <Route path="profile" element={<Profile />} />
                <Route path="profile/edit" element={<EditProfile />} />
                <Route path="settings" element={<Settings />} />
                <Route
                  path="finance"
                  element={<ComingSoon title="Financial Ledger" />}
                />
                <Route
                  path="network"
                  element={<ComingSoon title="Network" />}
                />
                <Route path="learn" element={<LearnDatabase />} />
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
                  <Route
                    path="users/verifyvault"
                    element={<VaultVerification />}
                  />
                  <Route path="tickets" element={<TicketManager />} />
                  <Route path="reports" element={<ReportManager />} />
                  <Route path="tickets" element={<TicketManager />} />
                  <Route path="reports" element={<ReportManager />} />
                  <Route path="feedback" element={<FeedbackManager />} />
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
