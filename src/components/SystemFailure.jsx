import React, { useState, useEffect } from "react";

const SystemFailure = ({
  errorType = "Execution Interrupted",
  errorMessage,
  resetBoundary,
}) => {
  const [reloading, setReloading] = useState(false);

  // MAANG-Grade UX: Automatically clear error state if user navigates away via browser back/forward buttons.
  useEffect(() => {
    const handlePopState = () => {
      if (resetBoundary) {
        resetBoundary();
      }
    };

    // The popstate event is fired when the active history entry changes (e.g., User clicks browser Back button).
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [resetBoundary]);

  const handleRestore = () => {
    setReloading(true);
    // Short, elegant delay to feel deliberate
    setTimeout(() => {
      if (resetBoundary) {
        // If wrapped in the boundary, clear the error state
        resetBoundary();
      } else {
        // Hard refresh the browser to clear bad memory/states
        window.location.reload();
      }
    }, 800);
  };

  const handleGoBack = () => {
    // Clear the boundary first so React is ready to render the uncorrupted route
    if (resetBoundary) {
      resetBoundary();
    }
    // Traverse back in the history stack natively
    window.history.back();
  };

  return (
    <div className="min-h-[100ddvh] bg-[#030303] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden selection:bg-[#BFA264] selection:text-black w-full">
      {/* Extremely subtle, premium ambient light (Gold/Amber) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-b from-[#111111] to-transparent rounded-full blur-[120px] pointer-events-none opacity-50"></div>

      <div className="z-10 max-w-sm w-full text-center flex flex-col items-center space-y-10">
        {/* Minimalist Icon / Indicator */}
        <div className="w-12 h-12 border border-white/10 bg-[#0A0A0A] rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] relative group">
          <div className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-md group-hover:bg-rose-500/20 transition-all"></div>
          <svg
            className="w-5 h-5 text-rose-500 relative z-10"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Succession / Corporate Copy */}
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#f5f5f7]">
            {errorType === "404_SECTOR_NOT_FOUND"
              ? "Trajectory Unknown"
              : errorType}
          </h1>
          <p className="text-[#a1a1aa] font-light leading-relaxed text-sm md:text-base max-w-[280px] mx-auto">
            {errorType === "404_SECTOR_NOT_FOUND"
              ? "This sector does not exist in the current execution map. Realign your coordinates."
              : "Momentum has been temporarily paused. A structural anomaly was detected in the current module."}
          </p>

          {/* Extremely subtle technical detail, barely visible */}
          {errorMessage && (
            <div className="mt-8 px-4 py-2 bg-white/5 border border-white/5 rounded-lg inline-block">
              <p className="text-[#666] text-[10px] tracking-wider uppercase font-mono max-w-[250px] truncate">
                {String(errorMessage).split("\n")[0]}
              </p>
            </div>
          )}
        </div>

        {/* Tactical Interaction Cluster */}
        <div className="flex flex-col items-center w-full gap-3 pt-4">
          <button
            onClick={handleRestore}
            disabled={reloading}
            className="w-full max-w-[240px] group relative inline-flex items-center justify-center px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-black bg-[#f5f5f7] rounded-xl transition-all duration-300 hover:scale-[1.02] hover:bg-white active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            {reloading ? "Realigning..." : "Resume Execution"}
          </button>

          <button
            onClick={handleGoBack}
            className="w-full max-w-[240px] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#888] bg-transparent hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Return to Safety
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemFailure;
