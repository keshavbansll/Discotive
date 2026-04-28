/**
 * @fileoverview LearnAdminModal.jsx — Discotive Learn Admin CMS Modal
 * @module Components/Learn/LearnAdminModal
 *
 * Full create / edit form for certificates and videos.
 * Admin-only. Uses createCertificate / createVideo / updateCertificate / updateVideo
 * from discotiveLearn.js.
 *
 * CERT fields:
 *   title, provider, category, link, duration, difficulty,
 *   domains (multi), tags (chip input), scoreReward, thumbnailUrl,
 *   description, isPaid, industryRelevance, skillsRequired, skillsGained,
 *   expiresAt
 *
 * VIDEO fields:
 *   title, youtubeId (live thumbnail preview), category, durationMinutes,
 *   domains (multi), tags (chip input), scoreReward, description,
 *   isPaid, industryRelevance, skillsRequired, skillsGained
 *
 * DESIGN: Discotive Borderless Standard (no rounded cards, gold palette)
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Eye,
  Award,
  Video,
  Globe,
  Tag,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";

import {
  createCertificate,
  updateCertificate,
  createVideo,
  updateVideo,
  CERTIFICATE_CATEGORIES,
  VIDEO_CATEGORIES,
  DIFFICULTY_LEVELS,
  DOMAINS,
} from "../../lib/discotiveLearn";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─────────────────────────────────────────────────────────────────────────────
// FIELD PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label
    className="block text-[8px] font-black uppercase tracking-[0.2em] mb-1.5"
    style={{ color: T.dim }}
  >
    {children}
    {required && (
      <span className="ml-1" style={{ color: G.bright }}>
        *
      </span>
    )}
  </label>
);

const TextInput = ({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  monospace,
}) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-3 text-[12px] outline-none transition-all"
      style={{
        background: V.depth,
        border: "1px solid rgba(255,255,255,0.07)",
        color: T.primary,
        fontFamily: monospace ? "monospace" : "'Poppins', sans-serif",
        "::placeholder": { color: T.dim },
      }}
    />
  </div>
);

const TextareaInput = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    {label && <Label>{label}</Label>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 text-[12px] outline-none resize-none transition-all custom-scrollbar"
      style={{
        background: V.depth,
        border: "1px solid rgba(255,255,255,0.07)",
        color: T.primary,
        fontFamily: "'Poppins', sans-serif",
      }}
    />
  </div>
);

const SelectInput = ({ label, required, value, onChange, options }) => (
  <div>
    {label && <Label required={required}>{label}</Label>}
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 pr-9 text-[12px] outline-none appearance-none transition-all"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.07)",
          color: value ? T.primary : T.dim,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <option value="" style={{ background: V.depth, color: T.dim }}>
          Select…
        </option>
        {options.map((opt) => {
          const val = typeof opt === "string" ? opt : opt.value || opt.key;
          const lab = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={val} value={val} style={{ background: V.depth }}>
              {lab}
            </option>
          );
        })}
      </select>
      <ChevronDown
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
        style={{ color: T.dim }}
      />
    </div>
  </div>
);

// Toggle switch
const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[11px]" style={{ color: T.secondary }}>
      {label}
    </span>
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 transition-all"
      style={{
        background: checked ? G.base : "rgba(255,255,255,0.06)",
        border: `1px solid ${checked ? G.border : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <motion.div
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 w-4 h-4"
        style={{ background: checked ? "#030303" : "rgba(255,255,255,0.2)" }}
      />
    </button>
  </div>
);

// ── Domain multi-select ───────────────────────────────────────────────────────
const DomainMultiSelect = memo(({ selected, onChange }) => {
  const toggle = (d) => {
    const next = selected.includes(d)
      ? selected.filter((x) => x !== d)
      : [...selected, d];
    onChange(next);
  };

  return (
    <div>
      <Label>Domains</Label>
      <div className="flex flex-wrap gap-1.5">
        {DOMAINS.map((d) => {
          const active = selected.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggle(d)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-widest transition-all"
              style={{
                background: active ? G.dimBg : V.surface,
                color: active ? G.bright : T.dim,
                border: `1px solid ${active ? G.border : "rgba(255,255,255,0.05)"}`,
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ── Tag chip input ────────────────────────────────────────────────────────────
const TagInput = memo(({ tags, onChange }) => {
  const [input, setInput] = useState("");

  const addTag = useCallback(
    (raw) => {
      const tag = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "");
      if (tag && !tags.includes(tag) && tags.length < 12) {
        onChange([...tags, tag]);
      }
      setInput("");
    },
    [tags, onChange],
  );

  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      <Label>Tags (max 12)</Label>
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-11"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: T.secondary,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            #{t}
            <button
              onClick={() => removeTag(t)}
              className="opacity-50 hover:opacity-100"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && addTag(input)}
          placeholder={
            tags.length < 12 ? "Type tag, press Enter…" : "Max reached"
          }
          disabled={tags.length >= 12}
          className="flex-1 min-w-20 bg-transparent text-[11px] outline-none"
          style={{ color: T.primary }}
        />
      </div>
    </div>
  );
});

// ── Skills list input ─────────────────────────────────────────────────────────
const SkillsInput = memo(({ label, skills, onChange }) => {
  const [input, setInput] = useState("");

  const add = () => {
    const s = input.trim();
    if (s && !skills.includes(s)) onChange([...skills, s]);
    setInput("");
  };

  const remove = (s) => onChange(skills.filter((x) => x !== s));

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Add skill, press Enter"
          className="flex-1 h-9 px-3 text-[11px] outline-none"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.07)",
            color: T.primary,
          }}
        />
        <button
          onClick={add}
          className="w-9 h-9 flex items-center justify-center"
          style={{
            background: G.dimBg,
            border: `1px solid ${G.border}`,
            color: G.bright,
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s) => (
          <span
            key={s}
            className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold"
            style={{
              color: "#4ADE80",
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.15)",
            }}
          >
            {s}
            <button
              onClick={() => remove(s)}
              className="opacity-60 hover:opacity-100"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CERT FORM
// ─────────────────────────────────────────────────────────────────────────────
const CertForm = memo(({ form, patch }) => (
  <div className="flex flex-col gap-5">
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <TextInput
          label="Title"
          required
          value={form.title}
          onChange={(v) => patch("title", v)}
          placeholder="e.g. Full Stack Web Development"
        />
      </div>
      <TextInput
        label="Provider / Platform"
        required
        value={form.provider}
        onChange={(v) => patch("provider", v)}
        placeholder="e.g. Coursera, Udemy"
      />
      <TextInput
        label="Duration"
        value={form.duration}
        onChange={(v) => patch("duration", v)}
        placeholder="e.g. 40h, 6 weeks"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <SelectInput
        label="Category"
        required
        value={form.category}
        onChange={(v) => patch("category", v)}
        options={CERTIFICATE_CATEGORIES}
      />
      <SelectInput
        label="Difficulty"
        value={form.difficulty}
        onChange={(v) => patch("difficulty", v)}
        options={DIFFICULTY_LEVELS}
      />
    </div>

    <TextInput
      label="Course Link"
      required
      value={form.link}
      onChange={(v) => patch("link", v)}
      placeholder="https://coursera.org/..."
      type="url"
    />

    <TextInput
      label="Thumbnail URL"
      value={form.thumbnailUrl}
      onChange={(v) => patch("thumbnailUrl", v)}
      placeholder="https://..."
      type="url"
    />

    {form.thumbnailUrl && (
      <div>
        <Label>Thumbnail Preview</Label>
        <img
          src={form.thumbnailUrl}
          alt="preview"
          className="w-full object-cover"
          style={{ aspectRatio: "16/7", maxHeight: 160 }}
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>
    )}

    <TextareaInput
      label="Description"
      value={form.description}
      onChange={(v) => patch("description", v)}
      placeholder="What will learners gain from this course?"
      rows={3}
    />

    <DomainMultiSelect
      selected={form.domains}
      onChange={(v) => patch("domains", v)}
    />

    <div className="grid grid-cols-2 gap-4">
      <SelectInput
        label="Industry Relevance"
        value={form.industryRelevance}
        onChange={(v) => patch("industryRelevance", v)}
        options={["Strong", "Medium", "Weak"]}
      />
      <div>
        <Label>Score Reward (pts)</Label>
        <input
          type="number"
          value={form.scoreReward}
          onChange={(e) => patch("scoreReward", Number(e.target.value))}
          min={0}
          max={500}
          className="w-full h-11 px-3 text-[12px] outline-none"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.07)",
            color: T.primary,
          }}
        />
      </div>
    </div>

    <div
      className="px-4 py-3"
      style={{
        background: V.surface,
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <Toggle
        label="Paid course"
        checked={form.isPaid}
        onChange={(v) => patch("isPaid", v)}
      />
    </div>

    <TagInput tags={form.tags} onChange={(v) => patch("tags", v)} />

    <SkillsInput
      label="Skills Gained"
      skills={form.skillsGained}
      onChange={(v) => patch("skillsGained", v)}
    />
    <SkillsInput
      label="Prerequisites / Skills Required"
      skills={form.skillsRequired}
      onChange={(v) => patch("skillsRequired", v)}
    />

    <TextInput
      label="Expiry Date (optional)"
      value={form.expiresAt}
      onChange={(v) => patch("expiresAt", v)}
      placeholder="YYYY-MM-DD"
      type="date"
    />
  </div>
));

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO FORM
// ─────────────────────────────────────────────────────────────────────────────
const VideoForm = memo(({ form, patch }) => {
  const thumbnailUrl = form.youtubeId
    ? `https://img.youtube.com/vi/${form.youtubeId}/maxresdefault.jpg`
    : null;

  return (
    <div className="flex flex-col gap-5">
      <TextInput
        label="Title"
        required
        value={form.title}
        onChange={(v) => patch("title", v)}
        placeholder="e.g. The Feynman Technique Explained"
      />

      <div>
        <TextInput
          label="YouTube Video ID"
          required
          value={form.youtubeId}
          onChange={(v) => patch("youtubeId", v.trim())}
          placeholder="dQw4w9WgXcQ"
          monospace
        />
        <p className="text-[8px] mt-1" style={{ color: T.dim }}>
          Extract from: youtube.com/watch?v=<strong>[THIS PART]</strong>
        </p>
      </div>

      {/* Live thumbnail preview */}
      {thumbnailUrl && (
        <div>
          <Label>Thumbnail Preview</Label>
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <img
              src={thumbnailUrl}
              alt="YouTube thumbnail"
              className="w-full h-full object-cover"
              style={{ opacity: 0.8 }}
              onError={(e) => {
                e.target.src = "";
              }}
            />
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.3)" }}
            >
              <div
                className="w-12 h-12 flex items-center justify-center"
                style={{ background: "rgba(191,162,100,0.85)" }}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-black">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Category"
          required
          value={form.category}
          onChange={(v) => patch("category", v)}
          options={VIDEO_CATEGORIES}
        />
        <div>
          <Label>Duration (minutes)</Label>
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => patch("durationMinutes", Number(e.target.value))}
            min={0}
            max={10000}
            placeholder="e.g. 45"
            className="w-full h-11 px-3 text-[12px] outline-none"
            style={{
              background: V.depth,
              border: "1px solid rgba(255,255,255,0.07)",
              color: T.primary,
            }}
          />
        </div>
      </div>

      <TextareaInput
        label="Description"
        value={form.description}
        onChange={(v) => patch("description", v)}
        placeholder="What is this video about?"
        rows={3}
      />

      <DomainMultiSelect
        selected={form.domains}
        onChange={(v) => patch("domains", v)}
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectInput
          label="Industry Relevance"
          value={form.industryRelevance}
          onChange={(v) => patch("industryRelevance", v)}
          options={["Strong", "Medium", "Weak"]}
        />
        <div>
          <Label>Score Reward (pts, max 10)</Label>
          <input
            type="number"
            value={form.scoreReward}
            onChange={(e) =>
              patch("scoreReward", Math.min(10, Number(e.target.value)))
            }
            min={0}
            max={10}
            className="w-full h-11 px-3 text-[12px] outline-none"
            style={{
              background: V.depth,
              border: "1px solid rgba(255,255,255,0.07)",
              color: T.primary,
            }}
          />
        </div>
      </div>

      <div
        className="px-4 py-3"
        style={{
          background: V.surface,
          border: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <Toggle
          label="Behind a paywall"
          checked={form.isPaid}
          onChange={(v) => patch("isPaid", v)}
        />
      </div>

      <TagInput tags={form.tags} onChange={(v) => patch("tags", v)} />

      <SkillsInput
        label="Skills Gained"
        skills={form.skillsGained}
        onChange={(v) => patch("skillsGained", v)}
      />
      <SkillsInput
        label="Prerequisites"
        skills={form.skillsRequired}
        onChange={(v) => patch("skillsRequired", v)}
      />
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FORM STATES
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CERT = {
  title: "",
  provider: "",
  category: "",
  link: "",
  duration: "",
  difficulty: "Intermediate",
  domains: [],
  tags: [],
  scoreReward: 50,
  thumbnailUrl: "",
  description: "",
  isPaid: false,
  industryRelevance: "Medium",
  skillsGained: [],
  skillsRequired: [],
  expiresAt: "",
};

const DEFAULT_VIDEO = {
  title: "",
  youtubeId: "",
  category: "",
  durationMinutes: 0,
  domains: [],
  tags: [],
  scoreReward: 10,
  description: "",
  isPaid: false,
  industryRelevance: "Medium",
  skillsGained: [],
  skillsRequired: [],
};

// =============================================================================
// LEARN ADMIN MODAL
// =============================================================================
const LearnAdminModal = ({ type, item, onClose, onSaved, adminEmail }) => {
  const isCert = type === "cert";
  const isEdit = !!item;

  // ── Form state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(() => {
    if (isEdit) {
      return { ...(isCert ? DEFAULT_CERT : DEFAULT_VIDEO), ...item };
    }
    return isCert ? { ...DEFAULT_CERT } : { ...DEFAULT_VIDEO };
  });

  const patch = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Submit state ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState(null);

  // ── Validation ────────────────────────────────────────────────────────────
  const isValid = useMemo(() => {
    if (!form.title?.trim()) return false;
    if (isCert) {
      return !!(form.provider?.trim() && form.category && form.link?.trim());
    } else {
      return !!(form.youtubeId?.trim() && form.category);
    }
  }, [form, isCert]);

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError("");

    try {
      let id;
      if (isCert) {
        if (isEdit) {
          await updateCertificate(item.id, form, adminEmail);
          id = item.discotiveLearnId;
        } else {
          id = await createCertificate(form, adminEmail);
        }
      } else {
        if (isEdit) {
          await updateVideo(item.id, form, adminEmail);
          id = item.discotiveLearnId;
        } else {
          id = await createVideo(form, adminEmail);
        }
      }
      setSavedId(id);
      setTimeout(() => {
        onSaved();
      }, 1400);
    } catch (err) {
      console.error("[LearnAdminModal] Save failed:", err);
      setError(err?.message || "Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  }, [form, isCert, isEdit, isValid, saving, item, adminEmail, onSaved]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.9)",
            backdropFilter: "blur(16px)",
          }}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className="relative m-auto flex flex-col overflow-hidden w-full"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.07)",
            maxWidth: 640,
            maxHeight: "90vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── HEADER ──────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              {isCert ? (
                <Award className="w-4 h-4" style={{ color: G.bright }} />
              ) : (
                <Video className="w-4 h-4" style={{ color: G.bright }} />
              )}
              <div>
                <h2
                  className="text-[13px] font-black"
                  style={{
                    color: T.primary,
                    fontFamily: "'Montserrat', sans-serif",
                  }}
                >
                  {isEdit ? "Edit" : "Add"}{" "}
                  {isCert ? "Certificate / Course" : "Video"}
                </h2>
                {isEdit && item.discotiveLearnId && (
                  <p
                    className="text-[8px] font-mono mt-0.5"
                    style={{ color: T.dim }}
                  >
                    {item.discotiveLearnId}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center transition-all"
              style={{
                color: T.dim,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── SUCCESS STATE ────────────────────────────────────────────── */}
          <AnimatePresence>
            {savedId && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4"
                style={{ background: V.depth }}
              >
                <div
                  className="w-16 h-16 flex items-center justify-center"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.3)",
                    boxShadow: "0 0 40px rgba(16,185,129,0.2)",
                  }}
                >
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p
                    className="text-[15px] font-black mb-1"
                    style={{
                      color: T.primary,
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  >
                    {isEdit ? "Updated" : "Created"}
                  </p>
                  <p className="text-[9px] font-mono" style={{ color: T.dim }}>
                    {savedId}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── FORM BODY ────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
            {isCert ? (
              <CertForm form={form} patch={patch} />
            ) : (
              <VideoForm form={form} patch={patch} />
            )}

            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 mt-4 px-4 py-3"
                style={{
                  background: "rgba(248,113,113,0.06)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-400">{error}</p>
              </div>
            )}

            {/* Domains required notice */}
            {form.domains?.length === 0 && (
              <div
                className="flex items-center gap-2 mt-4 px-4 py-3"
                style={{
                  background: G.dimBg,
                  border: `1px solid ${G.border}`,
                }}
              >
                <Info
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: G.bright }}
                />
                <p className="text-[9px]" style={{ color: T.dim }}>
                  Selecting at least one domain improves discoverability in the
                  Algorithmic Feed.
                </p>
              </div>
            )}

            <div className="h-4" />
          </div>

          {/* ── FOOTER ───────────────────────────────────────────────────── */}
          <div
            className="shrink-0 flex items-center gap-3 px-6 py-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <button
              onClick={onClose}
              className="h-12 px-6 flex items-center justify-center text-[9px] font-black uppercase tracking-widest transition-all"
              style={{
                background: "transparent",
                color: T.dim,
                border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="flex-1 h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all"
              style={{
                background:
                  isValid && !saving ? G.base : "rgba(191,162,100,0.25)",
                color: isValid && !saving ? "#030303" : T.dim,
                fontFamily: "'Montserrat', sans-serif",
                cursor: isValid && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEdit
                    ? "Save Changes"
                    : `Create ${isCert ? "Course" : "Video"}`}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

LearnAdminModal.displayName = "LearnAdminModal";
export default LearnAdminModal;
