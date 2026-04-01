import { useRoadmap } from "../../../contexts/RoadmapContext";
import { Handle, Position } from "reactflow";
import { HANDLE_S } from "../../../lib/roadmap/layout";

import {
  Database,
  ShieldAlert as ShieldAlertIcon,
  ShieldCheck as ShieldCheckIcon,
  Eye,
  Link as LinkIcon,
} from "lucide-react";
import React, { memo } from "react";
export { Database, ShieldAlertIcon, ShieldCheckIcon };

export const AssetWidgetNode = memo(({ id, data, selected }) => {
  const { openExplorerModal } = useRoadmap();

  const requiresSpecific = !!data.requiredLearnId;
  const isVerifiedMatch =
    data.assetId &&
    data.status === "VERIFIED" &&
    (!requiresSpecific || data.learnId === data.requiredLearnId);
  const isMismatched =
    data.assetId && requiresSpecific && data.learnId !== data.requiredLearnId;

  const accentColor = isVerifiedMatch
    ? "#10b981"
    : isMismatched
      ? "#ef4444"
      : "#f59e0b";

  const borderColor = selected ? `${accentColor}50` : "rgba(255,255,255,0.07)";

  const handleAccess = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      openExplorerModal?.(id, "vault_certificate", data.requiredLearnId);
    }
  };

  const statusLabel = !data.assetId
    ? "Unlinked"
    : isVerifiedMatch
      ? "Verified"
      : isMismatched
        ? "ID Mismatch"
        : "Pending Audit";

  return (
    <div
      className="relative flex flex-col overflow-hidden transition-all duration-200"
      style={{
        width: 230,
        borderRadius: 12,
        background: "#0d0d12",
        border: `1px solid ${borderColor}`,
        boxShadow: selected
          ? "0 4px 20px rgba(0,0,0,0.75)"
          : "0 1px 6px rgba(0,0,0,0.5)",
        transform: selected ? "scale(1.012)" : "scale(1)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ ...HANDLE_S, borderColor: `${accentColor}60` }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ ...HANDLE_S, borderColor: `${accentColor}60` }}
      />

      {/* Accent bar */}
      <div
        style={{
          height: 2,
          background: accentColor,
          opacity: selected ? 0.9 : 0.55,
        }}
      />

      <div style={{ padding: "10px 12px 12px" }}>
        {/* Icon + status */}
        <div className="flex items-start gap-2.5 mb-3">
          <div
            className="flex items-center justify-center shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${accentColor}12`,
              border: `1px solid ${accentColor}25`,
            }}
          >
            {isMismatched ? (
              <ShieldAlertIcon
                style={{ width: 15, height: 15, color: accentColor }}
              />
            ) : (
              <Database
                style={{
                  width: 15,
                  height: 15,
                  color: isVerifiedMatch ? "#10b981" : "rgba(255,255,255,0.35)",
                }}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="font-bold leading-snug"
              style={{ fontSize: 12, color: "rgba(255,255,255,0.88)" }}
            >
              {data.label || "Vault Target"}
            </p>

            {requiresSpecific && (
              <p
                className="font-mono truncate mt-0.5"
                style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}
              >
                REQ: {data.requiredLearnId}
              </p>
            )}

            <div className="flex items-center gap-1 mt-1">
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: accentColor,
                  flexShrink: 0,
                }}
              />
              <span
                className="font-black uppercase tracking-widest"
                style={{ fontSize: 8, color: `${accentColor}80` }}
              >
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleAccess}
          onPointerDown={(e) => e.stopPropagation()}
          className="nodrag pointer-events-auto w-full flex items-center justify-center gap-1.5 rounded-lg transition-all"
          style={{
            padding: "6px 10px",
            fontSize: 9,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: data.assetId
              ? "rgba(255,255,255,0.04)"
              : `${accentColor}15`,
            border: `1px solid ${data.assetId ? "rgba(255,255,255,0.07)" : `${accentColor}30`}`,
            color: data.assetId ? "rgba(255,255,255,0.5)" : accentColor,
            cursor: "pointer",
          }}
        >
          {data.assetId ? (
            <>
              <Eye style={{ width: 10, height: 10 }} /> View Asset
            </>
          ) : (
            <>
              <LinkIcon style={{ width: 10, height: 10 }} /> Sync Vault
            </>
          )}
        </button>
      </div>
    </div>
  );
});
AssetWidgetNode.displayName = "AssetWidgetNode";
