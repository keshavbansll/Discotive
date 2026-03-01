import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import Score from "./pages/Score";
import Opportunities from "./pages/Opportunities";
import Leaderboard from "./pages/Leaderboard";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import CampusCentres from "./pages/CampusCentres";
import Upgrade from "./pages/Upgrade";

function App() {
  // Enforce Dark Mode as the absolute default on first load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const root = window.document.documentElement;

    // If no theme is saved, or it's explicitly set to dark, force dark mode
    if (!savedTheme || savedTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else if (savedTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="score" element={<Score />} />
          <Route path="opportunities" element={<Opportunities />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="campus-centres" element={<CampusCentres />} />
          <Route path="upgrade" element={<Upgrade />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
