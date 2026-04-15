/**
 * @fileoverview Discotive OS — ConnectorHub v2.0 (PRODUCTION)
 * @module Vault/ConnectorHub
 *
 * ARCHITECTURE:
 * - Reads connected state directly from userData.connectors (Firestore-sourced)
 * - Each connector has typed connection checks — GitHub uses .username, YouTube uses .channelUrl
 * - Lazy-loaded connector components keep initial bundle lean
 * - Coming-soon connectors show informative ETAs
 * - addToast passed from Vault parent for system-wide feedback
 */

import React, {
  useState,
  lazy,
  Suspense,
  memo,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  Github,
  Youtube,
  Figma,
  FileText,
  Music,
  Code2,
  BookOpen,
  BarChart2,
  Layers,
  Box,
  X,
  Check,
  ChevronRight,
  Zap,
  Clock,
  Loader2,
  Wrench,
} from "lucide-react";

// Lazy load live connectors
const GitHubConnector = lazy(() => import("./GitHubConnector"));
const YouTubeConnector = lazy(() => import("./YouTubeConnector"));

// ─── Design Tokens ────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Connector Registry ───────────────────────────────────────────────────────
const CONNECTOR_REGISTRY = [
  {
    key: "github",
    label: "GitHub",
    icon: Github,
    color: "#e2e8f0",
    description: "Repos, commit activity, code stats",
    status: "live",
    component: "GitHubConnector",
    connectionPath: "username",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ef4444",
    description: "Creator hub, video portfolio",
    status: "live",
    component: "YouTubeConnector",
    connectionPath: "channelUrl",
  },
  {
    key: "figma",
    label: "Figma",
    icon: Figma,
    color: "#a78bfa",
    description: "Design files, prototypes",
    status: "soon",
    eta: "Q3 2025",
  },
  {
    key: "medium",
    label: "Medium",
    icon: FileText,
    color: "#e2e8f0",
    description: "Articles, publications",
    status: "soon",
    eta: "Q3 2025",
  },
  {
    key: "spotify",
    label: "Spotify",
    icon: Music,
    color: "#22c55e",
    description: "Podcasts, tracks, playlists",
    status: "soon",
    eta: "Q3 2025",
  },
  {
    key: "devpost",
    label: "Devpost",
    icon: Code2,
    color: "#38bdf8",
    description: "Hackathon wins, projects",
    status: "soon",
    eta: "Q4 2025",
  },
  {
    key: "scholar",
    label: "Scholar",
    icon: BookOpen,
    color: "#fbbf24",
    description: "Papers, citations, h-index",
    status: "soon",
    eta: "Q4 2025",
  },
  {
    key: "stripe",
    label: "Stripe",
    icon: BarChart2,
    color: "#7c3aed",
    description: "MRR, revenue, transactions",
    status: "soon",
    eta: "Q4 2025",
  },
  {
    key: "pitch",
    label: "Pitch",
    icon: Layers,
    color: "#f97316",
    description: "Decks, investor proposals",
    status: "soon",
    eta: "2026",
  },
  {
    key: "spline",
    label: "Spline",
    icon: Box,
    color: "#06b6d4",
    description: "3D scenes, WebGL models",
    status: "soon",
    eta: "2026",
  },
];

// ─── Determine if a connector is "connected" from userData ───────────────────
const isConnectorConnected = (connector, userData) => {
  const connectors = userData?.connectors;
  if (!connectors) return false;
  const data = connectors[connector.key];
  if (!data) return false;
  // For YouTube: connected if channelUrl exists (even if pending verification)
  if (connector.key === "youtube") return !!data.channelUrl;
  // For GitHub: connected if username exists
  if (connector.key === "github") return !!data.username;
  return false;
};

// ─── Connector Loader ─────────────────────────────────────────────────────────
const ConnectorLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: G.base }} />
      <p
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: T.dim }}
      >
        Loading connector...
      </p>
    </div>
  </div>
);

// ─── Coming Soon Panel ────────────────────────────────────────────────────────
const ComingSoonContent = memo(({ connector }) => {
  const Icon = connector.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center px-6"
    >
      <motion.div
        className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6"
        style={{
          background: `${connector.color}0A`,
          border: `1px solid ${connector.color}20`,
        }}
        animate={{
          boxShadow: [
            `0 0 0px ${connector.color}00`,
            `0 0 40px ${connector.color}15`,
            `0 0 0px ${connector.color}00`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Icon className="w-10 h-10" style={{ color: connector.color }} />
      </motion.div>

      <div className="flex items-center gap-2 mb-3">
        <Wrench className="w-4 h-4" style={{ color: T.dim }} />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: T.dim }}
        >
          In Development
        </span>
      </div>

      <h2
        className="text-2xl font-black mb-2"
        style={{ fontFamily: "'Montserrat', sans-serif", color: T.primary }}
      >
        {connector.label} Connector
      </h2>
      <p
        className="text-sm mb-4 max-w-sm leading-relaxed"
        style={{ color: T.secondary }}
      >
        {connector.description}. Full native integration is actively being
        built.
      </p>

      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
        style={{
          background: `${connector.color}0A`,
          border: `1px solid ${connector.color}20`,
        }}
      >
        <Clock
          className="w-4 h-4 shrink-0"
          style={{ color: connector.color }}
        />
        <span className="text-xs font-bold" style={{ color: connector.color }}>
          Expected: {connector.eta}
        </span>
      </div>

      <p className="text-[10px] mt-6 max-w-xs" style={{ color: T.dim }}>
        When this connector launches, your {connector.label} data will sync
        directly into your Vault with full admin verification support.
      </p>
    </motion.div>
  );
});

// ─── Sidebar Connector Item ───────────────────────────────────────────────────
const SidebarItem = memo(
  ({ connector, isActive, isConnected, isPending, onClick }) => {
    const Icon = connector.icon;
    const isSoon = connector.status === "soon";

    return (
      <motion.button
        onClick={onClick}
        whileHover={!isSoon ? { x: 2 } : {}}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative"
        style={{
          background: isActive ? "rgba(255,255,255,0.05)" : "transparent",
          border: isActive
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid transparent",
          opacity: isSoon ? 0.55 : 1,
          cursor: isSoon ? "default" : "pointer",
        }}
      >
        {/* Status dot */}
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: isConnected
              ? isPending
                ? "#f59e0b"
                : "#10b981"
              : isSoon
                ? "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.2)",
          }}
        />

        {/* Dynamic App Block Icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
          style={{
            background: isConnected ? "#050505" : "transparent",
            border: isConnected
              ? "1px solid rgba(255,255,255,0.15)"
              : "1px solid transparent",
          }}
        >
          <Icon
            className="w-4 h-4 shrink-0 transition-colors"
            style={{
              color: isConnected ? connector.color : "rgba(255,255,255,0.2)",
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-bold truncate"
            style={{ color: isActive ? T.primary : T.secondary }}
          >
            {connector.label}
          </p>
          {isConnected && !isPending && (
            <p className="text-[8px] font-bold" style={{ color: "#10b981" }}>
              Connected
            </p>
          )}
          {isConnected && isPending && (
            <p className="text-[8px] font-bold" style={{ color: "#f59e0b" }}>
              Pending Verification
            </p>
          )}
          {isSoon && (
            <p className="text-[8px]" style={{ color: T.dim }}>
              {connector.eta}
            </p>
          )}
        </div>

        {isActive && !isSoon && (
          <ChevronRight className="w-3 h-3 shrink-0" style={{ color: T.dim }} />
        )}
      </motion.button>
    );
  },
);

// ─── MAIN CONNECTOR HUB ───────────────────────────────────────────────────────
const ConnectorHub = ({
  isOpen,
  onClose,
  userData,
  onVaultAssetAdded,
  addToast,
}) => {
  const [activeKey, setActiveKey] = useState("github");

  const activeConnector = useMemo(
    () => CONNECTOR_REGISTRY.find((c) => c.key === activeKey),
    [activeKey],
  );

  // Derive connected state for each connector from userData
  const connectorStates = useMemo(() => {
    const states = {};
    CONNECTOR_REGISTRY.forEach((c) => {
      const connData = userData?.connectors?.[c.key];
      states[c.key] = {
        connected: isConnectorConnected(c, userData),
        pending:
          c.key === "youtube"
            ? connData?.channelUrl && !connData?.verified
            : false,
      };
    });
    return states;
  }, [userData]); // Corrected dependency array to satisfy React Compiler constraints

  const connectedCount = useMemo(
    () => Object.values(connectorStates).filter((s) => s.connected).length,
    [connectorStates],
  );

  const renderConnectorContent = useCallback(() => {
    if (!activeConnector) return null;
    if (activeConnector.status === "soon")
      return <ComingSoonContent connector={activeConnector} />;

    const sharedProps = { userData, onVaultAssetAdded, addToast };

    switch (activeKey) {
      case "github":
        return (
          <Suspense fallback={<ConnectorLoader />}>
            <GitHubConnector {...sharedProps} />
          </Suspense>
        );
      case "youtube":
        return (
          <Suspense fallback={<ConnectorLoader />}>
            <YouTubeConnector {...sharedProps} />
          </Suspense>
        );
      default:
        return <ComingSoonContent connector={activeConnector} />;
    }
  }, [activeKey, activeConnector, userData, onVaultAssetAdded, addToast]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[500]"
            style={{
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(12px)",
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 20 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed inset-4 md:inset-8 z-[501] flex overflow-hidden rounded-[2rem]"
            style={{
              background: V.bg,
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
              {activeConnector && (
                <motion.div
                  key={activeKey}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/4 w-[600px] h-[300px] rounded-full blur-[120px]"
                  style={{ background: `${activeConnector.color}05` }}
                />
              )}
            </div>

            {/* ── LEFT SIDEBAR ── */}
            <div
              className="relative z-10 w-60 shrink-0 flex flex-col overflow-y-auto"
              style={{
                borderRight: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(10,10,10,0.5)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-4 shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div>
                  <p
                    className="text-xs font-black"
                    style={{
                      color: T.primary,
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    Connectors
                  </p>
                  <p className="text-[9px]" style={{ color: T.dim }}>
                    {connectedCount} connected
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                  aria-label="Close connectors"
                >
                  <X className="w-3.5 h-3.5" style={{ color: T.dim }} />
                </button>
              </div>

              {/* Live section */}
              <div className="px-3 pt-4 pb-2">
                <p
                  className="text-[8px] font-black uppercase tracking-widest px-2 mb-2"
                  style={{ color: "rgba(16,185,129,0.6)" }}
                >
                  ● Live
                </p>
                {CONNECTOR_REGISTRY.filter((c) => c.status === "live").map(
                  (c) => (
                    <SidebarItem
                      key={c.key}
                      connector={c}
                      isActive={activeKey === c.key}
                      isConnected={connectorStates[c.key]?.connected}
                      isPending={connectorStates[c.key]?.pending}
                      onClick={() => setActiveKey(c.key)}
                    />
                  ),
                )}
              </div>

              {/* Coming soon section */}
              <div className="px-3 pt-2 pb-4">
                <p
                  className="text-[8px] font-black uppercase tracking-widest px-2 mb-2"
                  style={{ color: "rgba(245,158,11,0.5)" }}
                >
                  ◑ Coming Soon
                </p>
                {CONNECTOR_REGISTRY.filter((c) => c.status === "soon").map(
                  (c) => (
                    <SidebarItem
                      key={c.key}
                      connector={c}
                      isActive={activeKey === c.key}
                      isConnected={false}
                      isPending={false}
                      onClick={() => setActiveKey(c.key)}
                    />
                  ),
                )}
              </div>

              {/* Pro note */}
              <div className="mt-auto px-3 pb-4">
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3" style={{ color: G.bright }} />
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: G.bright }}
                    >
                      Pro Perk
                    </span>
                  </div>
                  <p className="text-[9px]" style={{ color: T.dim }}>
                    Pro users get priority verification for synced connector
                    assets.
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT CONTENT ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              {/* Content Header */}
              {activeConnector && (
                <div
                  className="flex items-center gap-3 px-6 py-4 shrink-0"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  {React.createElement(activeConnector.icon, {
                    className: "w-5 h-5",
                    style: { color: activeConnector.color },
                  })}
                  <div>
                    <p
                      className="text-sm font-black"
                      style={{ color: T.primary }}
                    >
                      {activeConnector.label}
                    </p>
                    <p className="text-[10px]" style={{ color: T.dim }}>
                      {activeConnector.description}
                    </p>
                  </div>

                  {/* Connection status badge */}
                  {connectorStates[activeKey]?.connected && (
                    <div
                      className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={
                        connectorStates[activeKey]?.pending
                          ? {
                              background: "rgba(245,158,11,0.1)",
                              border: "1px solid rgba(245,158,11,0.25)",
                            }
                          : {
                              background: "rgba(16,185,129,0.1)",
                              border: "1px solid rgba(16,185,129,0.25)",
                            }
                      }
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{
                          background: connectorStates[activeKey]?.pending
                            ? "#f59e0b"
                            : "#10b981",
                        }}
                      />
                      <span
                        className="text-[9px] font-black uppercase tracking-widest"
                        style={{
                          color: connectorStates[activeKey]?.pending
                            ? "#f59e0b"
                            : "#10b981",
                        }}
                      >
                        {connectorStates[activeKey]?.pending
                          ? "Pending Verification"
                          : "Connected"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeKey}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderConnectorContent()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ConnectorHub;
