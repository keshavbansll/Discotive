import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import Score from "./pages/Score";
import Opportunities from "./pages/Opportunities";
import Leaderboard from "./pages/Leaderboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* MainLayout wraps all routes inside it */}
        <Route path="/" element={<MainLayout />}>
          {/* Dashboard is the default view */}
          <Route index element={<Dashboard />} />

          {/* Career Roadmap Engine */}
          <Route path="roadmap" element={<Roadmap />} />

          {/* Discotive Score Engine */}
          <Route path="score" element={<Score />} />

          {/* Opportunity Intelligence System */}
          <Route path="opportunities" element={<Opportunities />} />

          {/* Global Leaderboard Engine */}
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
