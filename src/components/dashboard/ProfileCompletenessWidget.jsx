/**
 * @fileoverview ProfileCompletenessWidget
 * @description
 * The deferred onboarding engine. Renders a gamified progress bar + checklist
 * on the dashboard. Drives users to complete their profile in micro-sessions
 * rather than a single long onboarding flow.
 *
 * Tracks completeness across 7 deferred modules. Each module is a lightweight
 * bottom-sheet/modal that accepts the same data the old Step3-Step8 collected.
 *
 * Reward: at 100% completeness → "Operator Certified" badge (no score inflation for profile data).
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { evaluateAndAwardBadges } from "../../lib/scoreEngine";
import { cn } from "../../lib/cn";
import {
  MapPin,
  GraduationCap,
  Briefcase,
  Wrench,
  Wallet,
  Globe,
  Heart,
  ChevronRight,
  X,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";

// ─── Module definitions ────────────────────────────────────────────────────
const MODULES = [
  {
    key: "location",
    icon: MapPin,
    label: "Location",
    desc: "State & Country",
    points: 0,
    color: "#10b981",
    fields: ["country", "userState"],
  },
  {
    key: "background",
    icon: GraduationCap,
    label: "Background",
    desc: "Education & status",
    points: 0,
    color: "#8b5cf6",
    fields: ["institution", "course", "currentStatus"],
  },
  {
    key: "professional",
    icon: Briefcase,
    label: "Professional",
    desc: "Bio & experience",
    points: 0,
    color: "#3b82f6",
    fields: ["bio", "niche"],
  },
  {
    key: "skills",
    icon: Wrench,
    label: "Skills",
    desc: "Tech & tools",
    points: 0,
    color: "#f59e0b",
    fields: ["rawSkills"],
  },
  {
    key: "resources",
    icon: Wallet,
    label: "Resources",
    desc: "Investment capacity",
    points: 0,
    color: "#ef4444",
    fields: ["financialLaunchpad", "investmentCapacity"],
  },
  {
    key: "footprint",
    icon: Globe,
    label: "Online Presence",
    desc: "Links & socials",
    points: 10,
    color: "#06b6d4",
    fields: ["linkedin", "github"],
  },
  {
    key: "motivation",
    icon: Heart,
    label: "Motivation",
    desc: "What drives you",
    points: 20,
    color: "#ec4899",
    fields: ["coreMotivation"],
  },
];

const TOTAL_POINTS = MODULES.reduce((s, m) => s + m.points, 0); // 100

// ─── Mini drawer sheet ─────────────────────────────────────────────────────
function CompletionDrawer({ module, userData, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(module.key, form);
    setSaving(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-end md:items-center justify-center p-0 md:p-6 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative w-full md:max-w-lg bg-[#0a0a0a] border border-[#1a1a1a] rounded-t-[2rem] md:rounded-[2rem] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: `${module.color}18`,
                border: `1px solid ${module.color}30`,
              }}
            >
              <module.icon
                className="w-4 h-4"
                style={{ color: module.color }}
              />
            </div>
            <div>
              <p className="text-sm font-black text-white">{module.label}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-widest">
                Required for completion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Minimal form per module */}
        <div className="space-y-4 mb-6">
          {module.key === "location" && (
            <>
              <div>
                <label className="auth-label">Country</label>
                <input
                  className="auth-input"
                  placeholder="e.g. India"
                  value={form.country || userData?.identity?.country || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, country: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="auth-label">State / Province</label>
                <input
                  className="auth-input"
                  placeholder="e.g. Rajasthan"
                  value={form.userState || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, userState: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          {module.key === "background" && (
            <>
              <div>
                <label className="auth-label">Institution / Organisation</label>
                <input
                  className="auth-input"
                  placeholder="e.g. IIT Delhi, Google"
                  value={
                    form.institution || userData?.baseline?.institution || ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({ ...p, institution: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="auth-label">Course / Role</label>
                <input
                  className="auth-input"
                  placeholder="e.g. B.Tech, SWE"
                  value={form.course || userData?.baseline?.course || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, course: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          {module.key === "professional" && (
            <>
              <div>
                <label className="auth-label">Bio (2-3 sentences)</label>
                <textarea
                  className="auth-textarea"
                  placeholder="What do you build and who do you serve?"
                  value={form.bio || userData?.identity?.bio || ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      bio: e.target.value.slice(0, 300),
                    }))
                  }
                />
              </div>
              <div>
                <label className="auth-label">Your Niche / Role Title</label>
                <input
                  className="auth-input"
                  placeholder="e.g. Full-Stack Developer"
                  value={form.niche || userData?.identity?.niche || ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, niche: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          {module.key === "skills" && (
            <div>
              <label className="auth-label">Skills (comma-separated)</label>
              <textarea
                className="auth-textarea"
                placeholder="React, Python, Figma, SQL..."
                value={
                  form.skillsRaw ||
                  (userData?.skills?.rawSkills || []).join(", ") ||
                  ""
                }
                onChange={(e) =>
                  setForm((p) => ({ ...p, skillsRaw: e.target.value }))
                }
              />
            </div>
          )}
          {module.key === "resources" && (
            <>
              <div>
                <label className="auth-label">
                  How are you funding your journey?
                </label>
                <select
                  className="auth-select"
                  value={
                    form.financialLaunchpad ||
                    userData?.resources?.financialLaunchpad ||
                    ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      financialLaunchpad: e.target.value,
                    }))
                  }
                >
                  <option value="">Select…</option>
                  <option value="Bootstrapping">Self-funded</option>
                  <option value="Limited Support">Some family support</option>
                  <option value="Highly Backed">Well funded</option>
                </select>
              </div>
              <div>
                <label className="auth-label">Investment capacity</label>
                <select
                  className="auth-select"
                  value={
                    form.investmentCapacity ||
                    userData?.resources?.investmentCapacity ||
                    ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      investmentCapacity: e.target.value,
                    }))
                  }
                >
                  <option value="">Select…</option>
                  <option value="Minimal">Minimal — free tools</option>
                  <option value="Moderate">Moderate — occasional paid</option>
                  <option value="High">High — premium setup</option>
                </select>
              </div>
            </>
          )}
          {module.key === "footprint" && (
            <>
              <div>
                <label className="auth-label">LinkedIn</label>
                <input
                  className="auth-input"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={
                    form.linkedin ||
                    userData?.footprint?.personal?.linkedin ||
                    ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({ ...p, linkedin: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="auth-label">GitHub</label>
                <input
                  className="auth-input"
                  type="url"
                  placeholder="https://github.com/..."
                  value={
                    form.github || userData?.footprint?.personal?.github || ""
                  }
                  onChange={(e) =>
                    setForm((p) => ({ ...p, github: e.target.value }))
                  }
                />
              </div>
            </>
          )}
          {module.key === "motivation" && (
            <div>
              <label className="auth-label">What truly drives you?</label>
              <textarea
                className="auth-textarea"
                style={{ minHeight: 120 }}
                placeholder="Financial freedom, impact, recognition... be honest."
                value={
                  form.coreMotivation ||
                  userData?.wildcard?.coreMotivation ||
                  ""
                }
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    coreMotivation: e.target.value.slice(0, 600),
                  }))
                }
              />
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-[#8B7240] to-[#D4AF78] text-[#0a0a0a] font-black text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            "Saving…"
          ) : (
            <>
              Save Module <Sparkles className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Widget ───────────────────────────────────────────────────────────
const ProfileCompletenessWidget = ({ userData, onUpdate, compact = false }) => {
  const [activeModule, setActiveModule] = useState(null);

  const deferred = userData?.deferredOnboarding || {};
  const completedModules = MODULES.filter((m) => deferred[m.key] === true);
  const totalEarned = completedModules.reduce((s, m) => s + m.points, 0);
  const pct = Math.round((totalEarned / TOTAL_POINTS) * 100);
  const isComplete = pct >= 100;

  const handleSave = async (moduleKey, formData) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const updates = { [`deferredOnboarding.${moduleKey}`]: true };

    // Map form fields to the correct Firestore paths
    if (moduleKey === "location") {
      if (formData.country) updates["identity.country"] = formData.country;
      if (formData.userState) updates["location.state"] = formData.userState;
      updates["location.displayLocation"] =
        `${formData.userState || ""}, ${formData.country || ""}`
          .trim()
          .replace(/^,\s*/, "");
    } else if (moduleKey === "background") {
      if (formData.institution)
        updates["baseline.institution"] = formData.institution;
      if (formData.course) updates["baseline.course"] = formData.course;
    } else if (moduleKey === "professional") {
      if (formData.bio) {
        updates["identity.bio"] = formData.bio;
        updates["professional.bio"] = formData.bio;
      }
      if (formData.niche) {
        updates["identity.niche"] = formData.niche;
        updates["vision.niche"] = formData.niche;
      }
    } else if (moduleKey === "skills") {
      const parsed = (formData.skillsRaw || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      updates["skills.rawSkills"] = parsed;
    } else if (moduleKey === "resources") {
      if (formData.financialLaunchpad)
        updates["resources.financialLaunchpad"] = formData.financialLaunchpad;
      if (formData.investmentCapacity)
        updates["resources.investmentCapacity"] = formData.investmentCapacity;
    } else if (moduleKey === "footprint") {
      if (formData.linkedin)
        updates["footprint.personal.linkedin"] = formData.linkedin;
      if (formData.github)
        updates["footprint.personal.github"] = formData.github;
    } else if (moduleKey === "motivation") {
      if (formData.coreMotivation)
        updates["wildcard.coreMotivation"] = formData.coreMotivation;
    }

    updates["updatedAt"] = serverTimestamp();
    await updateDoc(userRef, updates);

    // Modules no longer inflate score. They strictly contribute to the 100% completion badge.

    // If now 100% complete, award badge immediately
    const module = MODULES.find((m) => m.key === moduleKey);
    const newTotal = totalEarned + (module?.points || 0);
    if (newTotal >= TOTAL_POINTS) {
      // Trigger badge evaluation when profile reaches 100%
      await evaluateAndAwardBadges(uid, {
        ...(userData || {}),
        profileCompleteness: 100,
      });
    }

    onUpdate?.();
  };

  if (isComplete) return null; // Widget self-destructs at 100%

  const pendingModules = MODULES.filter((m) => !deferred[m.key]);

  return (
    <>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-[1.5rem] p-5 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#BFA264]/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[9px] font-black text-[#BFA264]/60 uppercase tracking-widest mb-1">
              Profile Completeness
            </p>
            <p className="text-2xl font-black text-white font-mono">{pct}%</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-white/30 uppercase tracking-widest mb-1">
              Modules Left
            </p>
            <p className="text-sm font-black text-[#BFA264]">
              {pendingModules.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className={cn(
            "w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden",
            !compact && "mb-4",
          )}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-[#8B7240] to-[#D4AF78]"
          />
        </div>

        {/* Module chips */}
        {!compact && (
          <div className="flex flex-wrap gap-2">
            {pendingModules.slice(0, 4).map((m) => (
              <button
                key={m.key}
                onClick={() => setActiveModule(m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
              >
                <m.icon className="w-3 h-3 text-white/40 group-hover:text-white/70" />
                <span className="text-[10px] font-bold text-white/50 group-hover:text-white/80">
                  {m.label}
                </span>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                  Required
                </span>
                <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-white/50" />
              </button>
            ))}
            {pendingModules.length > 4 && (
              <span className="flex items-center px-3 py-1.5 text-[10px] text-white/30 font-bold">
                +{pendingModules.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeModule && (
          <CompletionDrawer
            module={activeModule}
            userData={userData}
            onSave={handleSave}
            onClose={() => setActiveModule(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfileCompletenessWidget;
