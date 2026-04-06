import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import {
  CustomSearchSelect,
  inputClass,
  labelClass,
} from "../components/FormControls";
import {
  CURRENT_STATUSES,
  INSTITUTIONS,
  COURSES,
  SPECIALIZATIONS,
  MONTHS,
  START_YEARS,
  END_YEARS,
} from "../constants/taxonomy";

export default function Step3Baseline({
  profileData,
  setField,
  systemStatus,
  handleStep3Submit,
  setStep,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 3</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        The Baseline.
      </h2>
      <p className="text-[#888] font-medium mb-8">
        Where are you starting from?
      </p>

      {systemStatus.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
          {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleStep3Submit} className="space-y-5">
        <div>
          <label className={labelClass}>Current Status</label>
          <CustomSearchSelect
            options={CURRENT_STATUSES}
            value={profileData.currentStatus}
            onChange={(v) => setField("currentStatus", v)}
            placeholder="Select execution state..."
            allowCustom={false}
            required={true}
          />
        </div>
        <div>
          <label className={labelClass}>
            Institution / Organization (Optional)
          </label>
          <CustomSearchSelect
            options={INSTITUTIONS}
            value={profileData.institution}
            onChange={(v) => setField("institution", v)}
            placeholder="Search campus or entity..."
            allowCustom={true}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Course / Degree (Optional)</label>
            <CustomSearchSelect
              options={COURSES}
              value={profileData.course}
              onChange={(v) => setField("course", v)}
              placeholder="Search degree..."
              allowCustom={true}
            />
          </div>
          <div>
            <label className={labelClass}>Specialization (Optional)</label>
            <CustomSearchSelect
              options={SPECIALIZATIONS}
              value={profileData.specialization}
              onChange={(v) => setField("specialization", v)}
              placeholder="Core focus..."
              allowCustom={true}
            />
          </div>
        </div>
        <div className="pt-4 border-t border-[#222]">
          <label className={labelClass}>Timeline / Cohort</label>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                Start Month
              </p>
              <CustomSearchSelect
                options={MONTHS}
                value={profileData.startMonth}
                onChange={(v) => setField("startMonth", v)}
                placeholder="Month"
                allowCustom={false}
              />
            </div>
            <div>
              <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                Start Year
              </p>
              <CustomSearchSelect
                options={START_YEARS}
                value={profileData.startYear}
                onChange={(v) => setField("startYear", v)}
                placeholder="Year"
                allowCustom={false}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                End / Grad Month
              </p>
              <CustomSearchSelect
                options={MONTHS}
                value={profileData.endMonth}
                onChange={(v) => setField("endMonth", v)}
                placeholder="Month"
                allowCustom={false}
              />
            </div>
            <div>
              <p className="text-[9px] text-[#666] mb-1 pl-1 font-bold uppercase">
                End / Grad Year
              </p>
              <CustomSearchSelect
                options={END_YEARS}
                value={profileData.endYear}
                onChange={(v) => setField("endYear", v)}
                placeholder="Year"
                allowCustom={false}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(2)}
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
