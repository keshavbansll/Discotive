import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { CustomMultiSelect, labelClass } from "../components/FormControls";
import { RAW_SKILLS, LANGUAGES } from "../constants/taxonomy";

export default function Step5Arsenal({
  profileData,
  setField,
  systemStatus,
  setSystemStatus,
  setStep,
}) {
  const handleStep5Submit = (e) => {
    e.preventDefault();
    if (profileData.languages.length === 0)
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Protocol constraint: Select at least one base language.",
      }));
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(6);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 5</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        The Arsenal.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        What utilities and protocols do you possess?
      </p>

      {systemStatus.error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-6">
          {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleStep5Submit} className="space-y-5">
        <div>
          <label className={labelClass}>Raw Inventory (Capabilities)</label>
          <CustomMultiSelect
            options={RAW_SKILLS}
            selected={profileData.rawSkills}
            onChange={(v) => setField("rawSkills", v)}
            placeholder="Search and add skills..."
            allowCustom={true}
          />
        </div>
        <div>
          <label className={labelClass}>Alignment Filter (Core Focus)</label>
          <CustomMultiSelect
            options={profileData.rawSkills}
            selected={profileData.alignedSkills}
            onChange={(v) => setField("alignedSkills", v)}
            placeholder={
              profileData.rawSkills.length === 0
                ? "Select raw skills first"
                : "Which matter most?"
            }
            allowCustom={false}
          />
        </div>
        <div>
          <label className={labelClass}>Linguistic Protocols (Required)</label>
          <CustomMultiSelect
            options={LANGUAGES}
            selected={profileData.languages}
            onChange={(v) => setField("languages", v)}
            placeholder="Select languages..."
            allowCustom={true}
          />
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group"
          >
            <span className="text-sm">Continue</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
