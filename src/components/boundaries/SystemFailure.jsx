import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SystemFailure = ({
  errorType = "Execution Interrupted",
  errorMessage,
  errorStack,
  eventId,
  resetBoundary,
}) => {
  const [reloading, setReloading] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);

  // MAANG-Grade: Listeners for native PC navigation & escape hatches
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && resetBoundary) handleGoBack();
      if (e.key === "Enter" && !reloading) handleRestore();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resetBoundary, reloading]);

  useEffect(() => {
    const handlePopState = () => {
      if (resetBoundary) resetBoundary();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [resetBoundary]);

  const handleRestore = () => {
    setReloading(true);
    setTimeout(() => {
      if (resetBoundary) resetBoundary();
      else window.location.reload();
    }, 800);
  };

  const handleGoBack = () => {
    if (resetBoundary) resetBoundary();
    window.history.back();
  };

  const copyDiagnostics = () => {
    const debugInfo = `Event ID: ${eventId || "N/A"}\nType: ${errorType}\nMessage: ${errorMessage}\n\nStack:\n${errorStack}`;
    navigator.clipboard.writeText(debugInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#030303] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden selection:bg-[#BFA264] selection:text-[#030303] z-[9999]">
      {/* Void Depth & Ambient Gold Core */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[800px] aspect-square bg-gradient-to-b from-[#BFA264]/10 to-transparent rounded-full blur-[100px] md:blur-[140px] pointer-events-none opacity-40"></div>

      {/* Dynamic Grid Overlay for Tech-Aesthetic */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20 pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="z-10 w-full max-w-lg flex flex-col items-center text-center space-y-8"
      >
        {/* Abstract Indicator */}
        <div className="w-14 h-14 md:w-16 md:h-16 border border-white/10 bg-[#0A0A0A] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(0,0,0,0.8)] relative group">
          <div className="absolute inset-0 bg-rose-500/10 rounded-2xl blur-md group-hover:bg-rose-500/20 transition-all duration-500"></div>
          <svg
            className="w-6 h-6 md:w-7 md:h-7 text-rose-500 relative z-10"
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

        {/* Typographic Core */}
        <div className="space-y-3 w-full px-2">
          <h1
            className="text-2xl md:text-3xl font-[800] tracking-tight text-[#F5F0E8] uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {errorType === "404_SECTOR_NOT_FOUND"
              ? "Trajectory Unknown"
              : errorType}
          </h1>
          <p
            className="text-[rgba(245,240,232,0.60)] font-light leading-relaxed text-sm md:text-base max-w-[320px] mx-auto"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {errorType === "404_SECTOR_NOT_FOUND"
              ? "This sector does not exist in the current execution map. Realign your coordinates."
              : "Momentum has been temporarily paused. A structural anomaly was detected in the current module."}
          </p>
        </div>

        {/* Action Controls (Mobile Native: min 44px height) */}
        <div className="flex flex-col items-center w-full gap-4 pt-2">
          <button
            onClick={handleRestore}
            disabled={reloading}
            className="w-full max-w-[280px] min-h-[48px] group relative flex items-center justify-center px-8 text-[13px] font-bold uppercase tracking-[0.2em] text-[#030303] bg-[#BFA264] hover:bg-[#D4AF78] rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(191,162,100,0.15)] overflow-hidden"
          >
            <span className="relative z-10">
              {reloading ? "Realigning..." : "Resume Execution"}
            </span>
            {reloading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            )}
          </button>

          <button
            onClick={handleGoBack}
            className="w-full max-w-[280px] min-h-[44px] text-[12px] font-bold uppercase tracking-[0.15em] text-[rgba(245,240,232,0.60)] hover:text-[#F5F0E8] bg-transparent rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
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

        {/* Diagnostics Terminal (For Devs & Reporting) */}
        {(errorMessage || errorStack) && (
          <div className="w-full max-w-[500px] mt-8 pt-8 border-t border-white/5">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-xs text-[rgba(245,240,232,0.28)] hover:text-[rgba(245,240,232,0.60)] transition-colors py-2 uppercase tracking-widest font-bold"
            >
              <span>View Diagnostics</span>
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${showDiagnostics ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <AnimatePresence>
              {showDiagnostics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-[#0A0A0A] border border-[rgba(255,255,255,0.07)] rounded-xl relative group text-left">
                    <button
                      onClick={copyDiagnostics}
                      className="absolute top-3 right-3 p-1.5 bg-[#141414] hover:bg-[#BFA264] hover:text-[#030303] text-[rgba(245,240,232,0.60)] rounded-md transition-colors"
                      title="Copy Payload"
                    >
                      {copied ? (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                    {eventId && (
                      <p className="text-[10px] text-[#BFA264] font-mono mb-2">
                        EVENT_ID: {eventId}
                      </p>
                    )}
                    {errorMessage && (
                      <p className="text-[11px] text-rose-400 font-mono mb-3 break-words">
                        {String(errorMessage)}
                      </p>
                    )}
                    {errorStack && (
                      <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2">
                        <pre className="text-[10px] text-[rgba(245,240,232,0.60)] font-mono whitespace-pre-wrap break-all leading-relaxed">
                          {String(errorStack)}
                        </pre>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SystemFailure;
