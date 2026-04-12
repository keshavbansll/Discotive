/**
 * @fileoverview VaultVerificationNode — Premium Asset Gate
 * @description
 * Locks a downstream execution path until a specific Discotive vault asset
 * (matched by discotiveLearnId) is VERIFIED. The most "premium feel" node
 * in the canvas — represents real proof of work.
 *
 * Visual language:
 * - Gold-tinted header with vault lock icon
 * - Asset preview (title + category badge) when linked
 * - Emerald unlock state with VERIFIED glow
 * - Upload CTA when no asset linked
 */

import React, { memo, useCallback } from "react";
import { Handle, Position } from "reactflow";
import {
  FolderLock,
  ShieldCheck,
  Award,
  Link2,
  Zap,
  Lock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Code2,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";
import { NODE_STATES } from "../../../stores/useRoadmapStore";
import { useRoadmapStore } from "../../../stores/useRoadmapStore";

const NODE_W = 220;

const CAT_ICONS = {
  Certificate: Award,
  Project: Code2,
  Resume: FileText,
  Employment: Briefcase,
  default: FolderLock,
};

const STATE_VISUAL = {
  [NODE_STATES.VERIFIED]: {
    border: "rgba(74,222,128,0.4)",
    bg: "rgba(74,222,128,0.06)",
    bar: "#4ADE80",
    label: "VERIFIED",
    glow: "0 0 14px rgba(74,222,128,0.25)",
  },
  [NODE_STATES.ACTIVE]: {
    border: "rgba(191,162,100,0.35)",
    bg: "rgba(191,162,100,0.04)",
    bar: "#BFA264",
    label: "AWAITING",
    glow: "none",
  },
  [NODE_STATES.LOCKED]: {
    border: "rgba(255,255,255,0.06)",
    bg: "rgba(0,0,0,0.0)",
    bar: "#2A2A35",
    label: "LOCKED",
    glow: "none",
  },
  [NODE_STATES.VERIFYING]: {
    border: "rgba(167,139,250,0.4)",
    bg: "rgba(167,139,250,0.06)",
    bar: "#A78BFA",
    label: "VERIFYING",
    glow: "0 0 14px rgba(167,139,250,0.2)",
  },
};
const DEFAULT_VIS = STATE_VISUAL[NODE_STATES.LOCKED];

const HANDLE_S = {
  width: 8,
  height: 8,
  background: "#0D0D12",
  border: "1.5px solid rgba(74,222,128,0.3)",
  borderRadius: "50%",
};

export const VaultVerificationNode = memo(({ id, data, selected }) => {
  const selectNode = useRoadmapStore((s) => s.selectNode);
  const openExplorer = useRoadmapStore((s) => s.openExplorer);

  const state = data._computed?.state || NODE_STATES.LOCKED;
  const vis = STATE_VISUAL[state] || DEFAULT_VIS;

  const isVerified = state === NODE_STATES.VERIFIED;
  const isLocked = state === NODE_STATES.LOCKED;
  const isActive = state === NODE_STATES.ACTIVE;

  const hasAsset = !!(data.assetId || data.assetTitle);
  const CatIcon = CAT_ICONS[data.category] || CAT_ICONS.default;
  const reqLearnId = data.requiredLearnId;

  const handleLink = useCallback(
    (e) => {
      e.stopPropagation();
      openExplorer(id, "vault_certificate", reqLearnId || null);
    },
    [id, openExplorer, reqLearnId],
  );

  return (
    <div
      onClick={() => selectNode(id)}
      role="article"
      aria-label={`Vault gate: ${data.label || "Vault Target"} — ${vis.label}`}
      style={{
        width: NODE_W,
        minWidth: 180,
        borderRadius: 8,
        background: `linear-gradient(135deg, #0D0D12 0%, ${vis.bg} 100%)`,
        border: `1px solid ${selected ? "rgba(74,222,128,0.6)" : vis.border}`,
        boxShadow: selected
          ? `0 0 0 1px rgba(74,222,128,0.3), ${vis.glow || "0 8px 24px rgba(0,0,0,0.6)"}`
          : vis.glow || "0 2px 8px rgba(0,0,0,0.5)",
        opacity: isLocked ? 0.5 : 1,
        overflow: "hidden",
        cursor: "pointer",
        userSelect: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      {/* Left bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: vis.bar,
          boxShadow: isVerified ? "2px 0 8px rgba(74,222,128,0.4)" : "none",
        }}
      />

      {/* Handles */}
      {["top", "bottom", "left", "right"].map((pos) => (
        <Handle
          key={pos}
          type={["top", "left"].includes(pos) ? "target" : "source"}
          position={Position[pos.charAt(0).toUpperCase() + pos.slice(1)]}
          id={pos}
          style={{ ...HANDLE_S, borderColor: `${vis.bar}50` }}
        />
      ))}

      <div
        style={{
          paddingLeft: 11,
          paddingRight: 10,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginBottom: 7,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 5,
              background: isVerified
                ? "rgba(74,222,128,0.12)"
                : "rgba(191,162,100,0.08)",
              border: `1px solid ${isVerified ? "rgba(74,222,128,0.25)" : "rgba(191,162,100,0.2)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isVerified ? (
              <ShieldCheck
                style={{ width: 13, height: 13, color: "#4ADE80" }}
              />
            ) : (
              <FolderLock style={{ width: 13, height: 13, color: "#BFA264" }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(245,240,232,0.88)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontFamily: "'Poppins', sans-serif",
                lineHeight: 1.2,
              }}
            >
              {data.label || "Vault Verification"}
            </p>
            <p
              style={{
                fontSize: 8,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: `${vis.bar}90`,
                marginTop: 1,
              }}
            >
              {vis.label}
            </p>
          </div>
        </div>

        {/* Required Learn ID badge */}
        {reqLearnId && (
          <div
            style={{
              fontSize: 8,
              fontFamily: "monospace",
              fontWeight: 700,
              color: "rgba(74,222,128,0.7)",
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.15)",
              borderRadius: 4,
              padding: "2px 6px",
              marginBottom: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            🔗 {reqLearnId.split("_").pop()}
          </div>
        )}

        {/* Asset preview OR CTA */}
        {hasAsset ? (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 5,
              padding: "6px 8px",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                flexShrink: 0,
                background: isVerified
                  ? "rgba(74,222,128,0.10)"
                  : "rgba(191,162,100,0.08)",
                border: `1px solid ${isVerified ? "rgba(74,222,128,0.2)" : "rgba(191,162,100,0.15)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CatIcon
                style={{
                  width: 11,
                  height: 11,
                  color: isVerified ? "#4ADE80" : "#BFA264",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(245,240,232,0.70)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                {data.assetTitle || "Linked Asset"}
              </p>
              {data.category && (
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "rgba(245,240,232,0.28)",
                  }}
                >
                  {data.category}
                </span>
              )}
            </div>
            {isVerified && (
              <CheckCircle2
                style={{
                  width: 12,
                  height: 12,
                  color: "#4ADE80",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        ) : isActive ? (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleLink}
            style={{
              width: "100%",
              padding: "6px 10px",
              borderRadius: 5,
              background: "rgba(191,162,100,0.08)",
              border: "1px dashed rgba(191,162,100,0.3)",
              color: "rgba(191,162,100,0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 9,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              transition: "all 0.2s",
              fontFamily: "'Poppins', sans-serif",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(191,162,100,0.14)";
              e.target.style.borderColor = "rgba(191,162,100,0.5)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(191,162,100,0.08)";
              e.target.style.borderColor = "rgba(191,162,100,0.3)";
            }}
          >
            <Link2 style={{ width: 10, height: 10 }} /> Link Vault Asset
          </button>
        ) : (
          <div
            style={{
              padding: "5px 8px",
              borderRadius: 5,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Lock
              style={{
                width: 9,
                height: 9,
                color: "rgba(245,240,232,0.2)",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 9,
                color: "rgba(245,240,232,0.25)",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
              }}
            >
              Unlock upstream first
            </span>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            paddingTop: 5,
            marginTop: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Zap
              style={{ width: 8, height: 8, color: "rgba(191,162,100,0.45)" }}
            />
            <span
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: "rgba(191,162,100,0.45)",
              }}
            >
              +{data.verificationContract?.scoreReward || 50}
            </span>
          </div>
          <span
            style={{
              fontSize: 7,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(245,240,232,0.18)",
              background: "rgba(255,255,255,0.03)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            LEARN_ID
          </span>
        </div>
      </div>
    </div>
  );
});

VaultVerificationNode.displayName = "VaultVerificationNode";
