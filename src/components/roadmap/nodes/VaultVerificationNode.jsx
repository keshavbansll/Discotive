/**
 * @fileoverview VaultVerificationNode.jsx — The learn_id Lock Mechanism
 * @description
 * This is the core of Discotive's Proof-of-Work verification loop.
 * The node stays LOCKED until a specific `discotiveLearnId` asset in the
 * user's vault reaches `status: "VERIFIED"` by an admin.
 *
 * The full loop:
 * 1. This node specifies `verificationContract.requiredLearnId`
 * 2. AgenticExecutionEngine checks the userVault in real-time
 * 3. If vault has a matching VERIFIED asset → node unlocks to ACTIVE/VERIFIED
 * 4. If vault has a matching PENDING asset → shows "pending audit" state
 * 5. If no matching asset → shows "Upload Required" CTA
 *
 * UI Features:
 * - Cross-hatch pattern overlay when locked (tactile "locked" sensation)
 * - Vault asset preview when linked (thumbnail, title, status badge)
 * - Direct upload CTA that deep-links to Vault page
 * - Admin verification progress bar when in PENDING state
 * - Score reward badge for completion motivation
 */

import React, { memo, useMemo } from "react";
import { Handle, Position, NodeResizer } from "reactflow";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Award,
  Clock,
  Zap,
  Lock,
  Eye,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NODE_STATES } from "../../../contexts/AgenticExecutionEngine.jsx";

const HANDLE_S = {
  width: 10,
  height: 10,
  background: "#111",
  border: "1.5px solid rgba(255,255,255,0.15)",
  borderRadius: "50%",
};
const GOLD = "#BFA264";
const GOLD_DIM = "rgba(191,162,100,0.12)";
const GOLD_BORDER = "rgba(191,162,100,0.28)";

// ── Vault asset status configs ─────────────────────────────────────────────────
const ASSET_STATUS = {
  VERIFIED: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.3)",
    label: "Verified",
    icon: ShieldCheck,
  },
  PENDING: {
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    border: GOLD_BORDER,
    label: "Pending Audit",
    icon: Clock,
  },
  REJECTED: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.3)",
    label: "Rejected",
    icon: ShieldAlert,
  },
};

// ── Cross-hatch SVG pattern for locked state ──────────────────────────────────
const CrossHatch = ({ nodeId, color = GOLD_BORDER }) => (
  <svg
    width="100%"
    height="100%"
    className="absolute inset-0 pointer-events-none z-20 rounded-[13px] overflow-hidden"
    style={{ opacity: 0.4 }}
  >
    <defs>
      <pattern
        id={`hatch-vault-${nodeId}`}
        width="12"
        height="12"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="12" stroke={color} strokeWidth="0.7" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#hatch-vault-${nodeId})`} />
  </svg>
);

export const VaultVerificationNode = memo(
  ({ id, data, selected, style: nodeStyle }) => {
    const navigate = useNavigate();
    const vc = data.verificationContract || {};
    const requiredLearnId = vc.requiredLearnId || data.requiredLearnId;

    const computedState = data._computed?.state || NODE_STATES.LOCKED;
    const learnIdMet = data._computed?.learnIdMet !== false;

    const isVerified =
      computedState === NODE_STATES.VERIFIED ||
      computedState === NODE_STATES.VERIFIED_GHOST;
    const isLocked = computedState === NODE_STATES.LOCKED;
    const isActive = computedState === NODE_STATES.ACTIVE;

    // Find the matching vault asset (passed via data from engine hydration)
    const matchedAsset = data._matchedVaultAsset || null;
    const matchedStatus = matchedAsset?.status;
    const assetCfg = matchedStatus ? ASSET_STATUS[matchedStatus] : null;

    const nodeW = nodeStyle?.width ?? 250;
    const scoreReward = vc.scoreReward || data.xpReward || 50;

    const accentColor = isVerified ? "#10b981" : isActive ? "#10b981" : GOLD;
    const borderColor = selected
      ? `${accentColor}60`
      : isVerified
        ? "rgba(16,185,129,0.35)"
        : learnIdMet
          ? "rgba(255,255,255,0.07)"
          : GOLD_BORDER;

    const nodeShadow = selected
      ? `0 4px 24px rgba(0,0,0,0.85), 0 0 0 1px ${accentColor}22`
      : isVerified
        ? "0 0 16px rgba(16,185,129,0.12)"
        : !learnIdMet
          ? `0 0 8px ${GOLD_DIM}`
          : "0 2px 8px rgba(0,0,0,0.5)";

    const handleUpload = (e) => {
      e.stopPropagation();
      navigate("/app/vault");
    };

    return (
      <div
        style={{
          width: nodeW,
          minWidth: 220,
          borderRadius: 14,
          background: "#0d0d12",
          border: `1px solid ${borderColor}`,
          boxShadow: nodeShadow,
          position: "relative",
          overflow: "visible",
          transition: "border-color 0.3s, box-shadow 0.3s",
          filter:
            isLocked && learnIdMet ? "grayscale(0.5) opacity(0.4)" : "none",
        }}
        role="article"
        aria-label={`Vault Verification — ${requiredLearnId || "any"} — ${computedState}`}
      >
        <NodeResizer
          minWidth={220}
          minHeight={100}
          isVisible={selected}
          lineStyle={{ border: `1px dashed ${GOLD_BORDER}` }}
          handleStyle={{
            backgroundColor: GOLD,
            width: 7,
            height: 7,
            borderRadius: 2,
            border: "2px solid #0d0d12",
          }}
        />

        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ ...HANDLE_S, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ ...HANDLE_S, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ ...HANDLE_S, borderColor: `${accentColor}55` }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ ...HANDLE_S, borderColor: `${accentColor}55` }}
        />

        {/* ── Cross-hatch lock overlay ── */}
        {!learnIdMet && <CrossHatch nodeId={id} />}

        {/* ── Accent bar ── */}
        <div
          style={{
            height: 2.5,
            background: accentColor,
            opacity: selected ? 0.95 : 0.55,
            flexShrink: 0,
            borderRadius: "14px 14px 0 0",
          }}
        />

        {/* ── Content ── */}
        <div
          style={{
            padding: "10px 12px 12px",
            position: "relative",
            zIndex: 25,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isVerified ? "rgba(16,185,129,0.12)" : GOLD_DIM,
                border: `1px solid ${isVerified ? "rgba(16,185,129,0.3)" : GOLD_BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isVerified ? (
                <ShieldCheck
                  style={{ width: 15, height: 15, color: "#10b981" }}
                />
              ) : !learnIdMet ? (
                <Lock style={{ width: 15, height: 15, color: GOLD }} />
              ) : (
                <Database
                  style={{
                    width: 15,
                    height: 15,
                    color: "rgba(255,255,255,0.35)",
                  }}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color:
                    isLocked && learnIdMet
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.9)",
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
              >
                {data.label || data.title || "Vault Verification"}
              </p>
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.25)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: 2,
                }}
              >
                {data.category || "Certificate Required"}
              </p>
            </div>
          </div>

          {/* Required Learn ID badge */}
          {requiredLearnId && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 8px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  color: "#555",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  flexShrink: 0,
                }}
              >
                REQUIRED ID
              </span>
              <span
                style={{
                  fontSize: 8,
                  fontFamily: "monospace",
                  color: `${GOLD}80`,
                  truncate: "true",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                }}
              >
                {requiredLearnId}
              </span>
            </div>
          )}

          {/* Matched asset preview */}
          {matchedAsset && assetCfg && (
            <div
              style={{
                padding: "7px 9px",
                background: assetCfg.bg,
                border: `1px solid ${assetCfg.border}`,
                borderRadius: 9,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <assetCfg.icon
                style={{
                  width: 14,
                  height: 14,
                  color: assetCfg.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.8)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {matchedAsset.title}
                </p>
                <p
                  style={{
                    fontSize: 7,
                    fontWeight: 800,
                    color: assetCfg.color,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginTop: 1,
                  }}
                >
                  {assetCfg.label}
                </p>
              </div>
              {matchedStatus === "PENDING" && (
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: `2px solid ${assetCfg.color}`,
                    borderTopColor: "transparent",
                  }}
                  className="animate-spin"
                />
              )}
            </div>
          )}

          {/* Score reward */}
          {scoreReward > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                marginBottom: 8,
              }}
            >
              <Zap style={{ width: 9, height: 9, color: GOLD }} />
              <span
                style={{ fontSize: 8, fontWeight: 800, color: `${GOLD}80` }}
              >
                +{scoreReward} Discotive Score on verification
              </span>
            </div>
          )}

          {/* CTA: Upload to unlock */}
          {!learnIdMet && !matchedAsset && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleUpload}
              className="nodrag pointer-events-auto w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all"
              style={{
                background: `${GOLD}15`,
                border: `1px solid ${GOLD_BORDER}`,
                cursor: "pointer",
              }}
            >
              <Upload style={{ width: 11, height: 11, color: GOLD }} />
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  color: GOLD,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Upload to Vault to Unlock
              </span>
            </button>
          )}

          {/* CTA: Pending audit message */}
          {matchedStatus === "PENDING" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 10px",
                background: "rgba(191,162,100,0.06)",
                border: `1px solid ${GOLD_BORDER}`,
                borderRadius: 9,
              }}
            >
              <AlertTriangle
                style={{ width: 11, height: 11, color: GOLD, flexShrink: 0 }}
              />
              <p
                style={{
                  fontSize: 8,
                  fontWeight: 600,
                  color: `${GOLD}80`,
                  lineHeight: 1.4,
                }}
              >
                Asset uploaded. Awaiting admin verification. This node unlocks
                automatically upon approval.
              </p>
            </div>
          )}

          {/* Verified complete state */}
          {isVerified && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                background: "rgba(16,185,129,0.08)",
                border: "1px solid rgba(16,185,129,0.25)",
                borderRadius: 9,
              }}
            >
              <ShieldCheck
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
                  Vault Verified
                </p>
                <p
                  style={{
                    fontSize: 7,
                    color: "rgba(16,185,129,0.6)",
                    fontFamily: "monospace",
                    marginTop: 1,
                  }}
                >
                  +{scoreReward} pts awarded
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Learn ID lock badge (corner) ── */}
        {!learnIdMet && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 7px",
              background: GOLD_DIM,
              border: `1px solid ${GOLD_BORDER}`,
              borderRadius: 8,
              zIndex: 30,
            }}
          >
            <Lock style={{ width: 8, height: 8, color: GOLD }} />
            <span
              style={{
                fontSize: 7,
                fontWeight: 900,
                color: GOLD,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Vault Required
            </span>
          </div>
        )}
      </div>
    );
  },
);

VaultVerificationNode.displayName = "VaultVerificationNode";
