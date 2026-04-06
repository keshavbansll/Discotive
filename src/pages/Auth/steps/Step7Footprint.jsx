import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Instagram,
  Youtube,
  Link as LinkIcon,
} from "lucide-react";
import { inputClass } from "../components/FormControls";

export default function Step7Footprint({
  profileData,
  setNestedField,
  systemStatus,
  handleStep7Submit,
  setStep,
}) {
  const footprintFields = useMemo(
    () => [
      { key: "website", icon: Globe, label: "Website" },
      {
        key: "linkedin",
        icon: Linkedin,
        label: "LinkedIn",
        isCommLabel: "LinkedIn (Company)",
        commKey: "linkedinCompany",
      },
      { key: "github", icon: Github, label: "GitHub" },
      { key: "twitter", icon: Twitter, label: "X / Twitter" },
      { key: "instagram", icon: Instagram, label: "Instagram" },
      { key: "youtube", icon: Youtube, label: "YouTube" },
      { key: "figma", icon: LinkIcon, label: "Figma" },
      { key: "reddit", icon: Globe, label: "Reddit" },
      { key: "pinterest", icon: Globe, label: "Pinterest" },
      { key: "linktree", icon: LinkIcon, label: "Linktree" },
    ],
    [],
  );

  const renderFootprintNode = useCallback(
    (fieldDef, isCommercial) => {
      const activeKey =
        isCommercial && fieldDef.commKey ? fieldDef.commKey : fieldDef.key;
      const activeLabel =
        isCommercial && fieldDef.isCommLabel
          ? fieldDef.isCommLabel
          : fieldDef.label;
      const Icon = fieldDef.icon;
      const parentNode = isCommercial
        ? "commercialFootprint"
        : "personalFootprint";

      return (
        <div key={activeKey} className="relative">
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
          <input
            type="url"
            value={profileData[parentNode][activeKey] || ""}
            onChange={(e) =>
              setNestedField(parentNode, activeKey, e.target.value)
            }
            className={`${inputClass} pl-11 text-xs`}
            placeholder={activeLabel}
          />
        </div>
      );
    },
    [profileData, setNestedField],
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 7</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        Digital Footprint.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        Connect your external ledger. (All optional)
      </p>

      {systemStatus.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
          {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleStep7Submit} className="space-y-8">
        <div>
          <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
            Personal Footprint
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {footprintFields.map((field) => renderFootprintNode(field, false))}
          </div>
        </div>
        <div className="pt-4">
          <h3 className="text-xs font-bold text-[#ccc] border-b border-[#222] pb-2 uppercase tracking-widest mb-4">
            Professional / Commercial
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {footprintFields.map((field) => renderFootprintNode(field, true))}
          </div>
        </div>
        <div className="flex gap-4 mt-8 pt-4">
          <button
            type="button"
            onClick={() => setStep(6)}
            className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
          >
            <span className="text-sm">Secure Footprint</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
