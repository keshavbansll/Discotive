import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkBoundary from "./components/NetworkBoundary";

import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });

// ─────────────────────────────────────────────────────────────────────────────
// SECURE TELEMETRY INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // Automatically tags 'development' or 'production'
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false, // Set to true if you need strict PII scrubbing on screen recordings
        blockAllMedia: false,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0, // Capture 20% of transactions in prod
    // Session Replay
    replaysSessionSampleRate: 0.1, // Record 10% of healthy sessions for UX analysis
    replaysOnErrorSampleRate: 1.0, // ALWAYS record the session if an error is thrown
  });
} else if (import.meta.env.PROD) {
  console.warn(
    "[Telemetry] VITE_SENTRY_DSN is missing. Production error tracking is offline.",
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NetworkBoundary>
        <App />
        <SpeedInsights />
        <Analytics />
      </NetworkBoundary>
    </ErrorBoundary>
  </React.StrictMode>,
);
