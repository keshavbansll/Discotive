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
import { useParams, useNavigate } from "react-router-dom";
import { useUserData } from "../../../hooks/useUserData";
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
  RefreshCw,
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
    color: "#e6edf3",
    accentBg: "#0d1117",
    accentBorder: "rgba(230,237,243,0.12)",
    description: "Repos, commit activity, code portfolio",
    component: "GitHubConnector",
    earnText: "Up to +120 pts per repo",
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "#ff4e45",
    accentBg: "rgba(255,78,69,0.05)",
    accentBorder: "rgba(255,78,69,0.18)",
    description: "Creator hub, video portfolio",
    component: "YouTubeConnector",
    earnText: "Verify your channel",
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

    let btnBg = isActive ? "rgba(255,255,255,0.05)" : "transparent";
    let btnBorder = isActive
      ? "1px solid rgba(255,255,255,0.06)"
      : "1px solid transparent";
    let iconBlockBg = "transparent";
    let iconColor = "rgba(255,255,255,0.2)";

    if (connector.key === "github") {
      iconBlockBg = "#000000";
      iconColor = "#FFFFFF";
    } else if (connector.key === "youtube") {
      if (isConnected) {
        iconBlockBg = "#ef4444";
        iconColor = "#FFFFFF";
      } else {
        iconBlockBg = "transparent";
        iconColor = "rgba(255,255,255,0.4)";
      }
    }

    return (
      <motion.button
        onClick={onClick}
        whileHover={{ x: 2 }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative"
        style={{ background: btnBg, border: btnBorder, cursor: "pointer" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: isConnected
              ? isPending
                ? "#f59e0b"
                : "#10b981"
              : "rgba(255,255,255,0.2)",
          }}
        />
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
          style={{
            background: iconBlockBg,
            border: isConnected
              ? "1px solid rgba(255,255,255,0.15)"
              : "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Icon
            className="w-4 h-4 shrink-0 transition-colors"
            style={{
              color: iconColor,
              fill: connector.key === "github" ? "#FFFFFF" : "transparent",
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
        </div>
        {isActive && (
          <ChevronRight className="w-3 h-3 shrink-0" style={{ color: T.dim }} />
        )}
      </motion.button>
    );
  },
);

// ─── MAIN CONNECTOR HUB ───────────────────────────────────────────────────────
const ConnectorHub = () => {
  const { connectorId } = useParams();
  const navigate = useNavigate();
  const { userData, patchLocalData } = useUserData();

  const activeKey = connectorId || "github";

  const addToast = useCallback((msg, type) => {
    // Optional: Sync this with your global Toast context if applicable
    console.log(`[Toast ${type}]: ${msg}`);
  }, []);

  const onVaultAssetAdded = useCallback(
    (newAsset, updatedVault) => {
      patchLocalData({ vault: updatedVault });
    },
    [patchLocalData],
  );

  const activeConnector = useMemo(
    () =>
      CONNECTOR_REGISTRY.find((c) => c.key === activeKey) ||
      CONNECTOR_REGISTRY[0],
    [activeKey],
  );

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
  }, [userData]);

  const connectedCount = useMemo(
    () => Object.values(connectorStates).filter((s) => s.connected).length,
    [connectorStates],
  );

  const renderConnectorContent = useCallback(() => {
    if (!activeConnector) return null;
    const sharedProps = { userData, onVaultAssetAdded, addToast };
    switch (activeConnector.key) {
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
        return null;
    }
  }, [activeConnector, userData, onVaultAssetAdded, addToast]);

  return (
    <div
      className="min-h-screen pb-24 relative"
      style={{ background: V.bg, color: T.primary }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {activeConnector && (
          <motion.div
            key={activeConnector.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full blur-[120px]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          />
        )}
      </div>

      <div className="relative z-10 max-w-[1700px] mx-auto">
        {/* ── HEADER ── */}
        <div className="px-4 md:px-8 pt-6 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  activeConnector?.key === "github"
                    ? "#000000"
                    : connectorStates[activeConnector?.key]?.connected
                      ? "#ef4444"
                      : "transparent",
                border:
                  activeConnector?.key === "github"
                    ? "1px solid rgba(255,255,255,0.15)"
                    : connectorStates[activeConnector?.key]?.connected
                      ? "none"
                      : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {activeConnector &&
                React.createElement(activeConnector.icon, {
                  className: "w-6 h-6",
                  style: {
                    color:
                      activeConnector.key === "github"
                        ? "#FFFFFF"
                        : connectorStates[activeConnector.key]?.connected
                          ? "#FFFFFF"
                          : "rgba(255,255,255,0.4)",
                    fill:
                      activeConnector.key === "github"
                        ? "#FFFFFF"
                        : "transparent",
                  },
                })}
            </div>
            <div>
              <h1
                className="text-3xl font-black tracking-tight"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  letterSpacing: "-0.03em",
                }}
              >
                {activeConnector?.label} Integration
              </h1>
              <p className="text-sm mt-1" style={{ color: T.secondary }}>
                {activeConnector?.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {connectorStates[activeKey]?.connected && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("TRIGGER_CONNECTOR_REFRESH"),
                    )
                  }
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                  title="Refresh data"
                >
                  <RefreshCw className="w-4 h-4" style={{ color: T.dim }} />
                </motion.button>

                <motion.div
                  className="relative group cursor-pointer shrink-0"
                  onClick={async () => {
                    if (
                      window.confirm(
                        `Are you sure you want to disconnect ${activeConnector.label}? Discotive score rewarded from this app will be deducted.`,
                      )
                    ) {
                      const { updateDoc, doc } =
                        await import("firebase/firestore");
                      const { db } = await import("../../../firebase");
                      await updateDoc(doc(db, "users", userData.uid), {
                        [`connectors.${activeKey}`]: null,
                      });
                      addToast?.(`${activeConnector.label} disconnected.`);
                    }
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 group-hover:opacity-0"
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
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{
                        color: connectorStates[activeKey]?.pending
                          ? "#f59e0b"
                          : "#10b981",
                      }}
                    >
                      {connectorStates[activeKey]?.pending
                        ? "Pending"
                        : "Connected"}
                    </span>
                  </div>

                  <div
                    className="absolute inset-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                    style={{
                      background: "rgba(248,113,113,0.15)",
                      border: "1px solid rgba(248,113,113,0.4)",
                    }}
                  >
                    <X className="w-3 h-3 text-[#f87171]" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#f87171]">
                      Disconnect
                    </span>
                  </div>
                </motion.div>
              </>
            )}
            <button
              onClick={() => navigate("/app/vault")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-white/5 shrink-0"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.07)",
                color: T.secondary,
              }}
            >
              <X className="w-3.5 h-3.5" /> Back to Vault
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse gap-6 px-4 md:px-8">
          {/* ── RIGHT SIDEBAR (Now positioned as Left Column in DOM, but pushed right via flex-row-reverse) ── */}
          <div className="shrink-0 w-full md:w-[280px]">
            <div className="sticky top-6 space-y-4">
              <div
                className="p-4 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <p
                  className="text-[9px] font-black uppercase tracking-widest mb-4 px-1"
                  style={{ color: T.dim }}
                >
                  Connections ({connectedCount})
                </p>
                <div className="space-y-1">
                  {CONNECTOR_REGISTRY.map((c) => (
                    <SidebarItem
                      key={c.key}
                      connector={c}
                      isActive={activeKey === c.key}
                      isConnected={connectorStates[c.key]?.connected}
                      isPending={connectorStates[c.key]?.pending}
                      onClick={() => navigate(`/app/vault/connectors/${c.key}`)}
                    />
                  ))}
                </div>
              </div>

              <div
                className="p-4 rounded-[1.25rem]"
                style={{
                  background: V.surface,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="p-3 rounded-xl"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="w-3 h-3" style={{ color: G.bright }} />
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: G.bright }}
                    >
                      Pro Perk
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: T.dim }}>
                    Pro users get priority verification for synced connector
                    assets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderConnectorContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectorHub;
