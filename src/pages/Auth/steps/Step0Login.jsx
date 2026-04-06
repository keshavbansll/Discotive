// src/pages/Auth/steps/Step0Login.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  OAuthButton,
  GoogleIcon,
  inputClass,
  labelClass,
} from "../components/FormControls";

export default function Step0Login({
  onSubmit,
  onOAuth,
  goToSignup,
  authError,
  isProcessing,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) onSubmit(email, password);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] rounded-[2rem] p-8 shadow-2xl relative"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500 opacity-[0.05] blur-3xl rounded-full pointer-events-none" />

      <h2 className="text-3xl font-black text-white tracking-tight mb-2">
        Initialize Session
      </h2>
      <p className="text-sm text-white/40 mb-8">
        Access your execution map and telemetry.
      </p>

      {authError && (
        <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-xs font-bold text-rose-400">{authError}</p>
        </div>
      )}

      <div className="space-y-3">
        <OAuthButton
          provider="google"
          icon={GoogleIcon}
          label="Google"
          onClick={onOAuth}
          disabled={isProcessing}
        />
      </div>

      <div className="relative flex items-center justify-center my-6 opacity-60">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#222]"></div>
        </div>
        <span className="relative bg-[#0a0a0a] px-3 text-[10px] font-black text-white/20 uppercase tracking-widest">
          OR
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className={labelClass}>Email Protocol</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="operator@discotive.in"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Encryption Key</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full py-3.5 mt-2 bg-amber-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Authenticate"
          )}
        </button>
      </form>

      <p className="text-center text-xs text-white/40 font-medium">
        No assigned instance?{" "}
        <button
          onClick={goToSignup}
          className="text-amber-400 font-bold hover:text-amber-300"
        >
          Create Identity
        </button>
      </p>
    </motion.div>
  );
}
