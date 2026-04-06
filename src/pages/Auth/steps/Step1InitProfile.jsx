import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import {
  OAuthButton,
  GoogleIcon,
  inputClass,
  labelClass,
} from "../components/FormControls";

export default function Step1InitProfile({
  profileData,
  setField,
  systemStatus,
  handleSignUpStep1,
  handleSocialAuth,
  setIsLogin,
  pwScore,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Step 1</span>{" "}
        <span className="opacity-30">/ 8</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
        Initialize Profile.
      </h2>
      <p className="text-[#888] font-medium mb-8">Your baseline identity.</p>

      {systemStatus.error && (
        <div
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold mb-6"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0" /> {systemStatus.error}
        </div>
      )}

      <div className="space-y-3">
        <OAuthButton
          provider="google"
          icon={GoogleIcon}
          label="Google"
          onClick={handleSocialAuth}
          disabled={systemStatus.loading}
        />
      </div>

      <div className="flex items-center gap-4 my-6 opacity-60">
        <div className="h-px bg-[#222] flex-1"></div>
        <span className="text-xs text-[#555] font-bold uppercase tracking-widest">
          OR
        </span>
        <div className="h-px bg-[#222] flex-1"></div>
      </div>

      <form onSubmit={handleSignUpStep1} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name</label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Last Name</label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className={inputClass}
              required
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setField("email", e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Secure Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={profileData.password}
              onChange={(e) => setField("password", e.target.value)}
              className={inputClass}
              required
              minLength="8"
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3 px-1" aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`h-1.5 flex-1 rounded-full transition-colors ${pwScore >= level ? (pwScore > 2 ? "bg-green-500" : pwScore === 2 ? "bg-amber-500" : "bg-red-500") : "bg-[#333]"}`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={systemStatus.loading}
          className="w-full mt-8 px-6 py-4 bg-white text-black font-bold rounded-xl hover:bg-[#ccc] transition-colors flex items-center justify-between group disabled:opacity-50"
        >
          {systemStatus.loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-black mx-auto" />
          ) : (
            <>
              <span className="text-sm">Verify Credentials</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-[#888]">
        Already verified?{" "}
        <button
          onClick={() => setIsLogin(true)}
          className="text-white hover:underline font-bold focus:outline-none"
        >
          Log in here
        </button>
      </p>
    </motion.div>
  );
}
