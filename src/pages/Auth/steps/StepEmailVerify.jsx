import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../firebase";
import { auth } from "../../../firebase";

export default function StepEmailVerify({
  email,
  firstName,
  onVerified,
  onSkip,
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== "") && index === 5) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code) => {
    setIsVerifying(true);
    setError("");
    try {
      const verifyFn = httpsCallable(functions, "verifyEmailOTP");
      await verifyFn({ otp: code });
      setSuccess(true);
      setTimeout(() => onVerified(), 1200);
    } catch (err) {
      setError(err.message || "Invalid code. Try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");
    try {
      const sendFn = httpsCallable(functions, "sendVerificationEmail");
      await sendFn({ email, firstName });
      setResendCooldown(60);
    } catch (err) {
      setError("Failed to resend. Try again shortly.");
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-12"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Verified.</h2>
        <p className="text-sm text-[#888]">
          Identity confirmed. Continuing initialization...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="text-[10px] font-bold text-[#888] uppercase tracking-[0.3em] mb-6">
        <span className="text-white">Email Verification</span>
      </div>
      <h2 className="text-4xl font-extrabold tracking-tighter mb-2">
        Check your inbox.
      </h2>
      <p className="text-[#888] font-medium mb-2">
        We sent a 6-digit code to{" "}
        <span className="text-white font-bold">{email}</span>
      </p>
      <p className="text-[#555] text-xs mb-8">
        Check spam if you don't see it within a minute.
      </p>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl mb-5">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-center mb-8" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-14 text-center text-xl font-black bg-[#111] border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        ))}
      </div>

      <button
        onClick={() => handleVerify(otp.join(""))}
        disabled={isVerifying || otp.some((d) => d === "")}
        className="w-full py-4 mb-4 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#ddd] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isVerifying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Verify Code"
        )}
      </button>

      <div className="flex items-center justify-between">
        <button
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="flex items-center gap-1.5 text-xs font-bold text-[#666] hover:text-white transition-colors disabled:opacity-40"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : isResending
              ? "Sending..."
              : "Resend Code"}
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 text-xs font-bold text-[#444] hover:text-[#666] transition-colors"
        >
          Skip for now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
