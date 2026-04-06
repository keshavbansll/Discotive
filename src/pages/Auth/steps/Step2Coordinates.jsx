import React from "react";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, X, Loader2 } from "lucide-react";
import {
  CustomSearchSelect,
  inputClass,
  labelClass,
} from "../components/FormControls";
import { INDIAN_STATES_UTS, COUNTRIES } from "../constants/taxonomy";

export default function Step2Coordinates({
  profileData,
  setField,
  systemStatus,
  handleStep2Submit,
  setStep,
  usernameAvailable,
  debouncedUsername,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 2</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        System Coordinates.
      </h2>
      <p className="text-[#888] font-medium mb-8">Where do you operate from?</p>

      {systemStatus.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold mb-6">
          {systemStatus.error}
        </div>
      )}

      <form onSubmit={handleStep2Submit} className="space-y-5">
        <div>
          <label className={labelClass}>Operator Handle</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#555] font-bold">
              @
            </span>
            <input
              type="text"
              value={profileData.username}
              onChange={(e) =>
                setField(
                  "username",
                  e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase(),
                )
              }
              className={`${inputClass} pl-10`}
              required
              placeholder="johndoe"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {usernameAvailable === true && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              {usernameAvailable === false && (
                <X className="w-4 h-4 text-red-500" />
              )}
              {usernameAvailable === null && debouncedUsername.length > 2 && (
                <Loader2 className="w-4 h-4 text-[#666] animate-spin" />
              )}
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>
            Avatar Identity (For Leaderboard)
          </label>
          <select
            value={profileData.gender}
            onChange={(e) => setField("gender", e.target.value)}
            className={inputClass}
            required
          >
            <option value="" disabled>
              Select identity...
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other / Stealth</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>State / Province</label>
            <CustomSearchSelect
              options={INDIAN_STATES_UTS}
              value={profileData.userState}
              onChange={(v) => setField("userState", v)}
              placeholder="e.g. Rajasthan"
              allowCustom={true}
              required={true}
            />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <CustomSearchSelect
              options={COUNTRIES}
              value={profileData.country}
              onChange={(v) => setField("country", v)}
              placeholder="e.g. India"
              allowCustom={false}
              required={true}
            />
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => setStep(1)}
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
