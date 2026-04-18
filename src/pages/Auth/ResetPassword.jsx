// src/pages/Auth/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "../../firebase";
import { motion, AnimatePresence } from "framer-motion";

const Spinner = ({ size = 16, color = "var(--gold-2)" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ animation: "ob-spin 0.8s linear infinite", flexShrink: 0 }}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth="2"
      strokeOpacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  const [status, setStatus] = useState("verifying"); // verifying, ready, loading, success, error
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (!oobCode || mode !== "resetPassword") {
      setStatus("error");
      setErrorMsg("Invalid or missing security token.");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setStatus("ready");
      })
      .catch((err) => {
        setStatus("error");
        setErrorMsg("This link has expired or has already been used.");
      });
  }, [oobCode, mode]);

  const pwScore = (() => {
    let s = 0;
    if (newPassword.length > 7) s++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) s++;
    if (/\d/.test(newPassword)) s++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const pwColors = ["#EF4444", "#EF4444", "#F59E0B", "#22C55E", "#22C55E"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pwScore < 2) {
      setErrorMsg(
        "Password is too weak. Mix characters, numbers, and symbols.",
      );
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");
      setTimeout(() => {
        navigate("/auth", { state: { isLogin: true, email } });
      }, 2500);
    } catch (err) {
      setStatus("ready");
      setErrorMsg(err.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="min-h-[100svh] w-full flex items-center justify-center bg-[#030303] text-[#F5F0E8] font-['Poppins'] p-6 relative overflow-hidden">
      {/* Background Noise & Grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 0%, rgba(191,162,100,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-[420px] bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 relative z-10 shadow-[0_32px_80px_rgba(0,0,0,0.8)]"
      >
        <div className="flex justify-center mb-8">
          <img
            src="/Logo with Title.png"
            alt="Discotive"
            className="h-6 opacity-90"
          />
        </div>

        <h2 className="text-2xl md:text-3xl font-black font-['Montserrat'] tracking-tight mb-2 text-center">
          Reclaim Access.
        </h2>

        {status === "verifying" && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Spinner size={24} color="#D4AF78" />
            <p className="text-sm text-white/40 tracking-widest uppercase text-center">
              Verifying Token...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <p className="text-sm text-red-400">{errorMsg}</p>
            <Link
              to="/auth"
              className="mt-4 text-[#D4AF78] text-sm font-semibold hover:text-white transition-colors"
            >
              Return to Gateway
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>
            <p className="text-green-400 font-semibold tracking-wide mt-2">
              Credentials Updated
            </p>
            <p className="text-xs text-white/40">Rerouting to login...</p>
          </div>
        )}

        {(status === "ready" || status === "loading") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-6">
            <p className="text-sm text-white/60 text-center mb-2">
              Updating credentials for{" "}
              <strong className="text-white">{email}</strong>
            </p>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {errorMsg}
              </div>
            )}

            <div className="relative w-full group">
              <input
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 pt-6 pb-2 h-16 text-white text-sm outline-none transition-all focus:border-[#D4AF78]/50 focus:bg-[#161616] peer"
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder=" "
                required
                minLength={8}
                style={{ paddingRight: 48 }}
              />
              <label className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/30 pointer-events-none transition-all peer-focus:top-4 peer-focus:-translate-y-0 peer-focus:text-[9px] peer-focus:font-bold peer-focus:tracking-widest peer-focus:uppercase peer-focus:text-[#D4AF78] peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:tracking-widest peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:text-[#D4AF78]">
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPw ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  className="h-1 rounded-full transition-colors duration-300 flex-1 bg-[#161616]"
                  style={{
                    background:
                      newPassword.length > 0 && pwScore >= l
                        ? pwColors[pwScore]
                        : undefined,
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full mt-4 h-14 rounded-xl flex items-center justify-center gap-2 text-[#0A0A0A] font-bold text-xs tracking-widest uppercase transition-all bg-gradient-to-br from-[#8B7240] via-[#D4AF78] to-[#BFA264] hover:shadow-[0_12px_32px_rgba(191,162,100,0.22)] hover:-translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? (
                <Spinner color="#0A0A0A" />
              ) : (
                "Confirm Update"
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
