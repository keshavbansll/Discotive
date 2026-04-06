import React from "react";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { inputClass, labelClass } from "../components/FormControls";

export default function Step8FinalCanvas({
  profileData,
  setField,
  systemStatus,
  handleFinalSubmit,
  setStep,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Final Step</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        The Open Canvas.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        Give the engine its final context.
      </p>

      {systemStatus.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" /> {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleFinalSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>Core Motivation (Required)</label>
          <textarea
            value={profileData.coreMotivation}
            onChange={(e) => setField("coreMotivation", e.target.value)}
            className={`${inputClass} resize-y max-h-48 min-h-[100px] custom-scrollbar`}
            placeholder="Why are you building this? What drives you?"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Wildcard Variables (Optional)</label>
          <textarea
            value={profileData.wildcardInfo}
            onChange={(e) => setField("wildcardInfo", e.target.value)}
            className={`${inputClass} resize-y max-h-48 min-h-[100px] custom-scrollbar`}
            placeholder="Unique constraints, mentors admired, or facts we should know."
          />
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(7)}
            className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors focus:outline-none"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={systemStatus.isBooting}
            className="flex-1 px-6 py-4 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            {systemStatus.isBooting ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              "Boot Discotive OS"
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
