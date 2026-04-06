import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  CustomSearchSelect,
  inputClass,
  labelClass,
} from "../components/FormControls";
import { MACRO_DOMAINS, MICRO_NICHES } from "../constants/taxonomy";

export default function Step4Vision({
  profileData,
  setField,
  systemStatus,
  handleStep4Submit,
  setStep,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 4</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        The Vision.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        What is your ultimate coordinate?
      </p>

      {systemStatus.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
          {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleStep4Submit} className="space-y-5">
        <div>
          <label className={labelClass}>Macro Domain (Primary Identity)</label>
          <CustomSearchSelect
            options={MACRO_DOMAINS}
            value={profileData.passion}
            onChange={(v) => setField("passion", v)}
            placeholder="Search domains..."
            allowCustom={true}
            required={true}
          />
        </div>
        <div>
          <label className={labelClass}>Micro Niche (Optional)</label>
          <CustomSearchSelect
            options={MICRO_NICHES}
            value={profileData.niche}
            onChange={(v) => setField("niche", v)}
            placeholder="e.g. AI Engineer, Director, CEO..."
            allowCustom={true}
          />
        </div>
        <div>
          <label className={labelClass}>Parallel Goal (Optional)</label>
          <CustomSearchSelect
            options={MACRO_DOMAINS}
            value={profileData.parallelPath}
            onChange={(v) => setField("parallelPath", v)}
            placeholder="e.g. Building a Startup alongside degree"
            allowCustom={true}
          />
        </div>
        <div className="pt-4 border-t border-[#222] space-y-5">
          <div>
            <label className={labelClass}>3-Month Execution Target</label>
            <textarea
              value={profileData.goal3Months}
              onChange={(e) => setField("goal3Months", e.target.value)}
              className={`${inputClass} resize-y max-h-48 min-h-[80px] custom-scrollbar`}
              placeholder="What is the immediate milestone?"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Macro Endgame (Long-Term)</label>
            <textarea
              value={profileData.longTermGoal}
              onChange={(e) => setField("longTermGoal", e.target.value)}
              className={`${inputClass} resize-y max-h-48 min-h-[80px] custom-scrollbar`}
              placeholder="What does the monopoly look like?"
              required
            />
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(3)}
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
