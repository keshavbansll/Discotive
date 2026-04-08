/**
 * @fileoverview AppConnectorNode.jsx — External Service Integration Hub
 * @description
 * Models App Connector nodes in the agentic workflow. These nodes verify
 * completion by checking an external webhook payload (GitHub commit, LinkedIn
 * connection, Calendly booking, etc.).
 *
 * Integration UX:
 * - Shows connection status (connected / disconnected / pending webhook)
 * - Clicking "Configure" opens the integration panel
 * - Displays last webhook received + payload summary
 * - Locked visually until verificationContract.type === "APP_WEBHOOK" fires
 *
 * Real integrations are handled server-side by Cloud Functions webhooks.
 * The UI here shows status and triggers the submit flow.
 */

import React, { memo, useState, useCallback } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  ChevronRight,
  Link2,
  GitBranch,
  Linkedin,
  Calendar,
  Chrome,
  Slack,
  Twitter,
  Github,
  Activity,
  Webhook,
} from "lucide-react";
import { APP_CONNECTORS } from "../../../lib/roadmap/constants.js";
import { NODE_STATES } from "../../../contexts/AgenticExecutionEngine.jsx";

const HANDLE_S = {
  width: 10,
  height: 10,
  background: "#111",
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderRadius: "50%",
};

// ── Supported integrations with their visual configs ──────────────────────────
const INTEGRATION_CONFIGS = {
  GitHub: {
    icon: Github,
    color: "#e6edf3",
    bg: "rgba(230,237,243,0.06)",
    border: "rgba(230,237,243,0.15)",
    verifyLabel: "Push a commit or PR merge",
    category: "Code Deployment",
    webhookHint: "Fires on push / pull_request events",
  },
  LinkedIn: {
    icon: Linkedin,
    color: "#0a66c2",
    bg: "rgba(10,102,194,0.08)",
    border: "rgba(10,102,194,0.25)",
    verifyLabel: "Connect with a new contact or post",
    category: "Professional Network",
    webhookHint: "Manual confirmation via proof link",
  },
  Calendly: {
    icon: Calendar,
    color: "#006bff",
    bg: "rgba(0,107,255,0.08)",
    border: "rgba(0,107,255,0.2)",
    verifyLabel: "Book or complete a meeting",
    category: "Meeting Scheduled",
    webhookHint: "Fires on invitee.created events",
  },
  Slack: {
    icon: Slack,
    color: "#e01e5a",
    bg: "rgba(224,30,90,0.08)",
    border: "rgba(224,30,90,0.2)",
    verifyLabel: "Post in a channel or DM",
    category: "Team Communication",
    webhookHint: "Fires on message events",
  },
  Custom: {
    icon: Webhook,
    color: "#BFA264",
    bg: "rgba(191,162,100,0.08)",
    border: "rgba(191,162,100,0.2)",
    verifyLabel: "Trigger the custom webhook",
    category: "Custom Integration",
    webhookHint: "Configure your own POST endpoint",
  },
};

const DEFAULT_INTEGRATION = INTEGRATION_CONFIGS.Custom;

// ── Status indicator ──────────────────────────────────────────────────────────
const StatusDot = ({ state }) => {
  const cfg = {
    [NODE_STATES.VERIFIED]: {
      color: "#10b981",
      anim: false,
      label: "Verified",
    },
    [NODE_STATES.ACTIVE]: {
      color: "#BFA264",
      anim: true,
      label: "Awaiting webhook",
    },
    [NODE_STATES.IN_PROGRESS]: {
      color: "#BFA264",
      anim: true,
      label: "Listening…",
    },
    [NODE_STATES.VERIFYING]: {
      color: "#8b5cf6",
      anim: true,
      label: "Evaluating",
    },
    [NODE_STATES.LOCKED]: { color: "#333", anim: false, label: "Locked" },
    [NODE_STATES.FAILED_BACKOFF]: {
      color: "#ef4444",
      anim: false,
      label: "Failed",
    },
  }[state] ?? { color: "#333", anim: false, label: "Unknown" };

  return (
    <div className="flex items-center gap-1.5">
      <div style={{ position: "relative", width: 8, height: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: cfg.color,
          }}
        />
        {cfg.anim && (
          <motion.div
            animate={{ scale: [1, 2], opacity: [0.6, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: cfg.color,
            }}
          />
        )}
      </div>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: cfg.color,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
};

export const AppConnectorNode = memo(
  ({ id, data, selected, style: nodeStyle }) => {
    const [showWebhookPanel, setShowWebhookPanel] = useState(false);

    const appName = data.app || "Custom";
    const intCfg = INTEGRATION_CONFIGS[appName] || DEFAULT_INTEGRATION;
    const Icon = intCfg.icon;
    const vc = data.verificationContract || {};

    const computedState = data._computed?.state || NODE_STATES.LOCKED;
    const isVerified = computedState === NODE_STATES.VERIFIED;
    const isActive =
      computedState === NODE_STATES.ACTIVE ||
      computedState === NODE_STATES.IN_PROGRESS;
    const isLocked = computedState === NODE_STATES.LOCKED;

    const borderColor = selected
      ? `${intCfg.color}60`
      : isVerified
        ? `${intCfg.color}40`
        : isLocked
          ? "rgba(255,255,255,0.05)"
          : intCfg.border;

    const nodeShadow = selected
      ? `0 4px 24px rgba(0,0,0,0.85), 0 0 0 1px ${intCfg.color}20`
      : isVerified
        ? `0 0 12px ${intCfg.color}15`
        : "0 2px 8px rgba(0,0,0,0.5)";

    const nodeW = nodeStyle?.width ?? 240;

    const handleOpenWebhook = useCallback(
      (e) => {
        e.stopPropagation();
        if (!isLocked) setShowWebhookPanel((v) => !v);
      },
      [isLocked],
    );

    return (
      <div
        style={{
          width: nodeW,
          minWidth: 200,
          borderRadius: 14,
          background: "#0d0d12",
          border: `1px solid ${borderColor}`,
          boxShadow: nodeShadow,
          overflow: "hidden",
          transition: "border-color 0.25s, box-shadow 0.25s",
          filter: isLocked ? "grayscale(0.7) opacity(0.4)" : "none",
        }}
        role="article"
        aria-label={`${appName} connector — ${computedState}`}
      >
        <NodeResizer
          minWidth={200}
          minHeight={120}
          isVisible={selected}
          lineStyle={{ border: `1px dashed ${intCfg.border}` }}
          handleStyle={{
            backgroundColor: intCfg.color,
            width: 7,
            height: 7,
            borderRadius: 2,
            border: "2px solid #0d0d12",
          }}
        />

        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ ...HANDLE_S, borderColor: `${intCfg.color}50` }}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ ...HANDLE_S, borderColor: `${intCfg.color}50` }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ ...HANDLE_S, borderColor: `${intCfg.color}50` }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ ...HANDLE_S, borderColor: `${intCfg.color}50` }}
        />

        {/* ── Accent bar ── */}
        <div
          style={{
            height: 2.5,
            background: isVerified ? "#10b981" : intCfg.color,
            opacity: selected ? 1 : 0.6,
            flexShrink: 0,
          }}
        />

        {/* ── Content ── */}
        <div style={{ padding: "10px 12px 12px" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              marginBottom: 10,
            }}
          >
            {/* App icon */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: intCfg.bg,
                border: `1px solid ${intCfg.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon style={{ width: 18, height: 18, color: intCfg.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 900,
                  color: intCfg.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  lineHeight: 1.2,
                }}
              >
                {appName}
              </p>
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: 2,
                }}
              >
                {intCfg.category}
              </p>
            </div>
            <StatusDot state={computedState} />
          </div>

          {/* Action label */}
          <div
            style={{
              padding: "6px 10px",
              background: `${intCfg.color}0d`,
              border: `1px solid ${intCfg.color}25`,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "rgba(255,255,255,0.65)",
                lineHeight: 1.4,
              }}
            >
              {data.action || intCfg.verifyLabel}
            </p>
          </div>

          {/* Webhook hint */}
          {isActive && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <Activity
                style={{ width: 10, height: 10, color: intCfg.color }}
              />
              <span
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: `${intCfg.color}70`,
                  fontFamily: "monospace",
                }}
              >
                {intCfg.webhookHint}
              </span>
            </div>
          )}

          {/* Score reward */}
          {vc.scoreReward > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 6,
              }}
            >
              <Zap style={{ width: 9, height: 9, color: "#BFA264" }} />
              <span style={{ fontSize: 8, fontWeight: 800, color: "#BFA264" }}>
                +{vc.scoreReward} pts on verify
              </span>
            </div>
          )}

          {/* Webhook configure button (only when not locked) */}
          {!isLocked && !isVerified && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleOpenWebhook}
              className="nodrag pointer-events-auto w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-all"
              style={{
                background: showWebhookPanel
                  ? `${intCfg.color}18`
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${showWebhookPanel ? intCfg.border : "rgba(255,255,255,0.07)"}`,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  color: showWebhookPanel
                    ? intCfg.color
                    : "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Configure Integration
              </span>
              <ChevronRight
                style={{
                  width: 11,
                  height: 11,
                  color: showWebhookPanel
                    ? intCfg.color
                    : "rgba(255,255,255,0.2)",
                  transform: showWebhookPanel ? "rotate(90deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
          )}

          {/* Verified state */}
          {isVerified && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 8,
              }}
            >
              <CheckCircle
                style={{
                  width: 14,
                  height: 14,
                  color: "#10b981",
                  flexShrink: 0,
                }}
              />
              <div>
                <p
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: "#10b981",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Webhook Confirmed
                </p>
                {data.lastWebhookAt && (
                  <p
                    style={{
                      fontSize: 7,
                      color: "rgba(16,185,129,0.6)",
                      fontFamily: "monospace",
                      marginTop: 1,
                    }}
                  >
                    {new Date(data.lastWebhookAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Collapsible webhook panel ── */}
        <AnimatePresence>
          {showWebhookPanel && !isLocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                overflow: "hidden",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ padding: "10px 12px" }}>
                <p
                  style={{
                    fontSize: 8,
                    fontWeight: 900,
                    color: "#555",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    marginBottom: 8,
                  }}
                >
                  Webhook Configuration
                </p>
                {/* Webhook URL display */}
                <div
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    marginBottom: 8,
                  }}
                >
                  <p
                    style={{
                      fontSize: 7,
                      fontWeight: 700,
                      color: "#555",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      marginBottom: 3,
                    }}
                  >
                    Discotive Webhook Endpoint
                  </p>
                  <p
                    style={{
                      fontSize: 8,
                      fontFamily: "monospace",
                      color: `${intCfg.color}80`,
                      wordBreak: "break-all",
                      lineHeight: 1.4,
                    }}
                  >
                    {`https://us-central1-discotivehub.cloudfunctions.net/agenticWebhook?node=${id}`}
                  </p>
                </div>
                {/* Instructions */}
                <p
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.3)",
                    lineHeight: 1.5,
                  }}
                >
                  Configure {appName} to POST to the endpoint above. The Cloud
                  Function will verify the payload and unlock this node
                  automatically.
                </p>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(
                      `https://docs.discotive.in/integrations/${appName.toLowerCase()}`,
                      "_blank",
                    );
                  }}
                  className="nodrag pointer-events-auto"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 8,
                    fontSize: 8,
                    fontWeight: 800,
                    color: intCfg.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <ExternalLink style={{ width: 9, height: 9 }} />
                  Integration Docs
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

AppConnectorNode.displayName = "AppConnectorNode";
