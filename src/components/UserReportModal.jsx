/**
 * @fileoverview Discotive OS — User Report Modal
 * @description
 * Report a user, vault asset, or content. One addDoc write.
 *
 * Firestore schema (reports/{reportId}):
 *   reporterUid, reporterEmail, reporterUsername,
 *   targetType, targetId, targetUsername, targetDisplayName,
 *   reason, description, status: "pending",
 *   createdAt, updatedAt
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Send,
  ShieldCheck,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { cn } from "./ui/BentoCard";

const REPORT_REASONS = {
  User: [
    "Harassment / Bullying",
    "Fake / Impersonation",
    "Spam Account",
    "Inappropriate Content",
    "Cheating / Score Manipulation",
    "Hate Speech",
    "Other",
  ],
  "Vault Asset": [
    "Forged / Fake Document",
    "Copyright Violation",
    "Inappropriate Content",
    "Misleading Information",
    "Spam",
    "Other",
  ],
  Content: ["Misinformation", "Inappropriate", "Spam", "Other"],
};

const UserReportModal = ({
  isOpen,
  onClose,
  user, // Firebase auth user
  userData, // Firestore user data
  targetType = "User", // "User" | "Vault Asset" | "Content"
  targetId = "",
  targetUsername = "",
  targetDisplayName = "",
}) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setDescription("");
      setSuccess(false);
      setSubmitError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reason || !user?.uid) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      await addDoc(collection(db, "reports"), {
        reporterUid: user.uid,
        reporterEmail: user.email || null,
        reporterUsername: userData?.identity?.username || null,
        targetType,
        targetId: targetId || null,
        targetUsername: targetUsername || null,
        targetDisplayName: targetDisplayName || null,
        reason,
        description: description.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => onClose(), 2200);
    } catch (err) {
      console.error("[UserReport] Submit failed:", err);
      setSubmitError("Submission failed. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const reasons = REPORT_REASONS[targetType] || REPORT_REASONS.User;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-[#030303]/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md bg-[#0a0a0a] rounded-3xl border border-[#222] shadow-2xl flex flex-col"
        >
          {/* HEADER */}
          <div className="px-5 py-4 flex justify-between items-center border-b border-[#222] bg-[#050505] rounded-t-3xl">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Report {targetType}
                </h3>
                {targetDisplayName && (
                  <p className="text-[10px] text-white/30 font-mono truncate max-w-[200px]">
                    {targetUsername ? `@${targetUsername}` : targetDisplayName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 bg-[#111] hover:bg-[#222] rounded-full text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* BODY */}
          <div className="p-5">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Report Filed.
                </h3>
                <p className="text-xs text-white/40 max-w-[220px] leading-relaxed">
                  Our team reviews all reports within 48 hours. Thank you for
                  keeping Discotive safe.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Reason */}
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">
                    Reason <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full bg-[#050505] border border-[#1a1a1a] text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-red-500/30 appearance-none cursor-pointer transition-colors"
                    >
                      <option value="" disabled>
                        Select a reason...
                      </option>
                      {reasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Details <span className="text-white/20">(Optional)</span>
                    </label>
                    <span
                      className={cn(
                        "text-[9px] font-mono",
                        description.length > 450
                          ? "text-amber-500"
                          : "text-white/20",
                      )}
                    >
                      {description.length}/500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide additional context..."
                    className="w-full bg-[#050505] border border-[#1a1a1a] focus:border-red-500/20 text-white rounded-xl px-4 py-3 text-xs placeholder-white/20 outline-none resize-none transition-colors"
                  />
                </div>

                {submitError && (
                  <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 text-center">
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!reason || submitting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                    reason && !submitting
                      ? "bg-red-500 text-white hover:bg-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                      : "bg-[#111] text-white/20 cursor-not-allowed border border-[#222]",
                  )}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3 h-3" /> Submit Report
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UserReportModal;
