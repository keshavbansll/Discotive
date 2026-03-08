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
            path="/auth"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="roadmap"
              element={<ComingSoon title="Execution Timeline" />}
            />
            <Route
              path="leaderboard"
              element={<ComingSoon title="Global Leaderboard" />}
            />
            <Route
              path="finance"
              element={<ComingSoon title="Financial Ledger" />}
            />
            <Route path="network" element={<ComingSoon title="Network" />} />
            <Route path="hubs" element={<ComingSoon title="Career Hubs" />} />
            <Route
              path="opportunities"
              element={<ComingSoon title="Opportunities" />}
            />
            <Route path="vault" element={<ComingSoon title="Asset Vault" />} />
            <Route
              path="podcasts"
              element={<ComingSoon title="Podcasts & Media" />}
            />
            <Route
              path="assessments"
              element={<ComingSoon title="Workshops & Assessments" />}
            />
            <Route path="discover" element={<ComingSoon title="Discover" />} />
            <Route
              path="profile"
              element={<ComingSoon title="User Profile" />}
            />
            <Route
              path="settings"
              element={<ComingSoon title="OS Settings" />}
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
