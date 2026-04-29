import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Activity, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { usePercentiles, useScoreHistory } from "../hooks/useDashboardData";
import { useTelemetryStream } from "../hooks/useTelemetryStream";
import { useScoreLog, useLbRank, HUDPanel } from "../pages/Dashboard";
import PremiumPaywall from "../components/PremiumPaywall";
import { cn } from "../lib/cn";

// Isolated data fetcher to allow for clean unmount/remount refreshing
const TelemetryInner = ({ userData, onClose, setShowPremium }) => {
  const navigate = useNavigate();
  const telemetryEvents = useTelemetryStream(userData);

  const score = userData?.discotiveScore?.current ?? 0;
  const lastScore = userData?.discotiveScore?.last24h ?? score;
  const streak = (() => {
    const s = userData?.discotiveScore?.streak || 0;
    const last = userData?.discotiveScore?.lastLoginDate;
    const today = new Date().toISOString().split("T")[0];
    return s === 0 && last === today ? 1 : s;
  })();
  const level = Math.min(Math.floor(score / 1000) + 1, 10);
  const levelPct = ((score % 1000) / 1000) * 100;
  const isPro = userData?.tier === "PRO" || userData?.tier === "ENTERPRISE";
  const domain = userData?.identity?.domain || null;

  const { data: percentilesData } = usePercentiles(score, userData);
  const globalPct = percentilesData?.global ?? 100;
  const domainPct = percentilesData?.domain ?? 100;

  const scoreLogs = useScoreLog(userData?.uid);
  const { rank: lbRank, filter: lbFilter } = useLbRank(
    userData?.uid,
    score,
    domain,
  );

  const [chartTf, setChartTf] = useState("1W");
  const { data: rawHistory = [] } = useScoreHistory(chartTf);
  const chartData = useMemo(
    () => rawHistory.map((e) => ({ day: e.date, score: e.score })),
    [rawHistory],
  );

  const chartMin = useMemo(() => {
    if (!chartData.length) return 0;
    const vals = chartData.map((d) => d.score);
    const min = Math.min(...vals);
    return Math.max(0, min - Math.ceil((Math.max(...vals) - min) * 0.2 + 5));
  }, [chartData]);

  return (
    <HUDPanel
      score={score}
      lastScore={lastScore}
      globalPct={globalPct}
      domainPct={domainPct}
      streak={streak}
      level={level}
      levelPct={levelPct}
      isPro={isPro}
      lbRank={lbRank}
      lbFilter={lbFilter}
      telemetryEvents={telemetryEvents}
      userData={userData}
      chartTf={chartTf}
      setChartTf={setChartTf}
      chartData={chartData}
      chartMin={chartMin}
      scoreLogs={scoreLogs}
      navigate={(path) => {
        onClose();
        navigate(path);
      }}
      setShowPremium={setShowPremium}
    />
  );
};

export default function TelemetryData({ isOpen, onClose, userData }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1); // Forces a remount, resetting data hook refs
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // We maintain mounting integrity if either the sidebar OR the paywall is active.
  if (!isOpen && !showPremium) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="mobile-hud-wrapper"
              className="lg:hidden"
              style={{ position: "fixed", zIndex: 99999 }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-[#030303]/90 z-[9990]"
                onClick={onClose}
              />
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-[85vw] max-w-[320px] bg-[#0A0A0A] border-l border-white/5 shadow-2xl z-[9999] flex flex-col pt-[env(safe-area-inset-top)] overflow-hidden"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 mt-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#BFA264]" />
                    <span className="font-extrabold text-sm tracking-widest text-[#F5F0E8] uppercase">
                      Telemetry
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRefresh}
                      className={cn(
                        "p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-[#BFA264] transition-all",
                        isRefreshing && "animate-spin text-[#BFA264]",
                      )}
                      title="Refresh Telemetry"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 bg-[#111] border border-white/5 rounded-full text-[#888] hover:text-[#F5F0E8] transition-colors active:scale-95"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pb-8">
                  {/* Using refreshKey to force pure unmount/remount data fetching */}
                  <TelemetryInner
                    key={refreshKey}
                    userData={userData}
                    onClose={onClose}
                    setShowPremium={setShowPremium}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <PremiumPaywall
        isOpen={showPremium}
        onClose={() => setShowPremium(false)}
      />
    </>
  );
}
