import React, { memo } from "react";
import { Handle, Position } from "reactflow";
import {
  Database,
  Eye,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "../../ui/BentoCard";
import { useRoadmap } from "../../../contexts/RoadmapContext.jsx";

export const AssetWidgetNode = memo(({ id, data, selected }) => {
  const { openVaultModal } = useRoadmap();

  // The strict credibility check:
  const requiresSpecificAsset = !!data.requiredLearnId;
  const isVerifiedMatch =
    data.assetId &&
    data.status === "VERIFIED" &&
    (!requiresSpecificAsset || data.learnId === data.requiredLearnId);
  const isMismatched =
    data.assetId &&
    requiresSpecificAsset &&
    data.learnId !== data.requiredLearnId;

  const handleAccess = (e) => {
    e.stopPropagation();
    if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    else openVaultModal(id, "sync", data.requiredLearnId);
  };

  const bc = selected
    ? "#10b981"
    : isVerifiedMatch
      ? "rgba(16,185,129,0.5)"
      : isMismatched
        ? "rgba(239,68,68,0.5)"
        : "rgba(255,255,255,0.05)";
  const bs = selected
    ? "0 0 40px rgba(16,185,129,0.2)"
    : isVerifiedMatch
      ? "0 0 20px rgba(16,185,129,0.1)"
      : "0 20px 40px rgba(0,0,0,0.4)";

  return (
    <div
      className="w-[280px] bg-[#0a0a0c]/95 backdrop-blur-2xl rounded-[1.5rem] p-5 relative transition-all duration-300 border"
      style={{
        borderColor: bc,
        boxShadow: bs,
        transform: selected ? "scale(1.04)" : "scale(1)",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#111] !border-2 !border-emerald-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-[#111] !border-2 !border-emerald-500"
      />

      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border",
            isVerifiedMatch
              ? "bg-emerald-500/10 border-emerald-500/30"
              : isMismatched
                ? "bg-red-500/10 border-red-500/30"
                : "bg-[#111] border-white/[0.05]",
          )}
        >
          {isMismatched ? (
            <ShieldAlert className="w-5 h-5 text-red-500" />
          ) : (
            <Database
              className={cn(
                "w-5 h-5",
                isVerifiedMatch ? "text-emerald-400" : "text-white/40",
              )}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-black text-white mb-1 leading-tight truncate">
            {data.label || "Awaiting Verification"}
          </h4>

          <div className="flex flex-col gap-1 mt-2">
            {requiresSpecificAsset && (
              <p className="text-[8px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded truncate">
                REQ: {data.requiredLearnId}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  isVerifiedMatch
                    ? "bg-emerald-500"
                    : isMismatched
                      ? "bg-red-500"
                      : data.assetId
                        ? "bg-amber-500"
                        : "bg-white/20",
                )}
              />
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  isVerifiedMatch
                    ? "text-emerald-400"
                    : isMismatched
                      ? "text-red-500"
                      : data.assetId
                        ? "text-amber-500"
                        : "text-white/40",
                )}
              >
                {!data.assetId
                  ? "UNLINKED"
                  : isVerifiedMatch
                    ? "PoW VERIFIED"
                    : isMismatched
                      ? "ID MISMATCH"
                      : "PENDING AUDIT"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={handleAccess}
          className={cn(
            "flex-1 py-2.5 border text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5",
            data.assetId
              ? "border-white/10 bg-[#111] text-white hover:bg-white/10"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
          )}
        >
          {data.assetId ? (
            <>
              <Eye className="w-3 h-3" /> Inspect
            </>
          ) : (
            <>
              <LinkIcon className="w-3 h-3" /> Sync Vault
            </>
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            openVaultModal(id, "new", data.requiredLearnId);
          }}
          className="flex-1 py-2.5 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <Plus className="w-3 h-3" /> Upload
        </button>
      </div>
    </div>
  );
});
