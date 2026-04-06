import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Lock, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  CustomSearchSelect,
  inputClass,
  labelClass,
} from "../components/FormControls";
import { COUNTRY_CODES } from "../constants/taxonomy";

export function LockedProtocol({
  profileData,
  setField,
  handleAccessRequest,
  setStep,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
            Protocol Locked.
          </h2>
          <p className="text-xs text-[#888] font-bold uppercase tracking-widest">
            Closed Beta Architecture
          </p>
        </div>
      </div>
      <p className="text-sm text-[#ccc] leading-relaxed mb-6">
        Discotive is currently under invite-only testing phase. Your coordinate{" "}
        <strong className="text-white">({profileData.email})</strong> is not
        verified on the chain.
      </p>
      <form onSubmit={handleAccessRequest} className="flex flex-col gap-4 mt-6">
        <div>
          <label className={labelClass}>Contact Number</label>
          <div className="flex gap-3">
            <div className="w-[140px] shrink-0">
              <CustomSearchSelect
                options={COUNTRY_CODES}
                value={profileData.countryCode}
                onChange={(v) => setField("countryCode", v)}
                placeholder="+91"
                allowCustom={false}
                required={true}
              />
            </div>
            <div className="flex-1">
              <input
                type="tel"
                required
                value={profileData.mobileNumber}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  if (val.startsWith("0")) val = val.slice(1);
                  setField("mobileNumber", val);
                }}
                className={inputClass}
                placeholder="98765 43210"
              />
            </div>
          </div>
        </div>
        <div>
          <label className={labelClass}>Transmission (Optional)</label>
          <textarea
            value={profileData.requestMessage}
            onChange={(e) => setField("requestMessage", e.target.value)}
            rows="3"
            className={`${inputClass} resize-y max-h-40 custom-scrollbar`}
            placeholder="Why should you be granted access?"
          />
        </div>
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="px-6 py-4 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-4 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
          >
            Request Clearance <Lock className="w-4 h-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function RequestedProtocol() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 text-center py-10"
    >
      <div className="flex justify-center mb-6">
        <CheckCircle2 className="w-20 h-20 text-green-500" />
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
        Transmission Logged.
      </h2>
      <p className="text-[#888] font-medium leading-relaxed max-w-sm mx-auto">
        Your coordinates have been sent to the Discotive routing engine. You
        will be notified via email or phone if clearance is granted.
      </p>
      <div className="pt-8">
        <Link
          to="/"
          className="text-sm font-bold text-white hover:text-[#888] uppercase tracking-widest transition-colors border-b border-white pb-1"
        >
          Return to Surface
        </Link>
      </div>
    </motion.div>
  );
}
