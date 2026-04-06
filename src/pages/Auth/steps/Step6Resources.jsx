import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  CustomSearchSelect,
  inputClass,
  labelClass,
} from "../components/FormControls";
import { MACRO_DOMAINS } from "../constants/taxonomy";

export default function Step6Resources({
  profileData,
  setField,
  setSystemStatus,
  setStep,
}) {
  const handleStep6Submit = (e) => {
    e.preventDefault();
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(7);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 6</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        Resource Map.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        Tailoring your realistic scholarship & tool paths.
      </p>

      <form onSubmit={handleStep6Submit} className="space-y-5">
        <div>
          <label className={labelClass}>
            Primary Guardian's Profession (Optional)
          </label>
          <CustomSearchSelect
            options={MACRO_DOMAINS}
            value={profileData.guardianProfession}
            onChange={(v) => setField("guardianProfession", v)}
            placeholder="Search profession..."
            allowCustom={true}
          />
        </div>
        <div>
          <label className={labelClass}>
            Household Income Bracket (Optional)
          </label>
          <select
            value={profileData.incomeBracket}
            onChange={(e) => setField("incomeBracket", e.target.value)}
            className={inputClass}
          >
            <option value="">Select bracket...</option>
            <option value="< 5L">Less than ₹5 Lakhs</option>
            <option value="5L - 10L">₹5 Lakhs - ₹10 Lakhs</option>
            <option value="> 10L">More than ₹10 Lakhs</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Financial Launchpad (Required)</label>
          <select
            value={profileData.financialLaunchpad}
            onChange={(e) => setField("financialLaunchpad", e.target.value)}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select backing level...
            </option>
            <option value="Bootstrapping">Bootstrapping / Self-funded</option>
            <option value="Limited Support">Limited Support</option>
            <option value="Highly Backed">Highly Backed</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Career Investment Capacity (Required)
          </label>
          <select
            value={profileData.investmentCapacity}
            onChange={(e) => setField("investmentCapacity", e.target.value)}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select capacity...
            </option>
            <option value="Minimal">Minimal (Free tools only)</option>
            <option value="Moderate">Moderate (Basic courses/tools)</option>
            <option value="High">High (Premium gear/setups)</option>
          </select>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(5)}
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
