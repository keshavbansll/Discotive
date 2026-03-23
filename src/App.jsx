import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import Leaderboard from "./pages/Leaderboard";
import Opportunities from "./pages/Opportunities";
import Vault from "./pages/Vault";
import Hubs from "./pages/Hubs";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Network from "./pages/Network";
import PublicProfile from "./pages/PublicProfile";
import Premium from "./pages/Premium";
import Checkout from "./pages/Checkout";
import VerifyAsset from "./pages/VerifyAsset";
import PageTracker from "./components/PageTracker";
import EditProfile from "./pages/EditProfile";

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <PageTracker />
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Landing />
              </PublicRoute>
            }
          />
          <Route path="/auth" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/verify-asset" element={<VerifyAsset />} />

          {/* PUBLIC PROFILE ROUTE (Accessible to anyone, but uses /app/ prefix) */}
          <Route path="/app/:username" element={<PublicProfile />} />

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
            <Route path="profile/edit" element={<EditProfile />} />{" "}
            {/* NEW ROUTE */}
            <Route path="settings" element={<Settings />} />
            <Route
              path="finance"
              element={<ComingSoon title="Financial Ledger" />}
            />
            <Route path="network" element={<Network />} />
            <Route path="learn" element={<ComingSoon title="learn" />} />
            <Route
              path="podcasts"
              element={<ComingSoon title="Podcasts & Media" />}
            />
            <Route
              path="assessments"
              element={<ComingSoon title="Workshops & Assessments" />}
            />
            <Route path="discover" element={<ComingSoon title="Discover" />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
