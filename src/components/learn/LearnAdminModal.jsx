/**
 * @fileoverview LearnAdminModal.jsx — Discotive Learn Admin CMS Modal v3.0
 * @module Components/Learn/LearnAdminModal
 *
 * Full create / edit form for courses and videos.
 * Admin-only. Uses v3.0 unified Discotive Learn API.
 */

import React, { useState, useCallback, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
  Loader2,
  Plus,
  ChevronDown,
  Award,
  Video,
  Info,
  AlertTriangle,
} from "lucide-react";

import { cn } from "../../lib/cn";
import {
  createCourse,
  createVideo,
  updateLearnItem,
  LEARN_COLLECTIONS,
} from "../../lib/discotiveLearn";

import {
  MACRO_DOMAINS,
  MICRO_NICHES,
  LANGUAGES,
  RAW_SKILLS,
} from "../../pages/Auth/constants/taxonomy";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
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
// FIELD PRIMITIVES & FLOATING LABELS
// ─────────────────────────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label
    className="block text-[10px] font-black uppercase tracking-[0.1em] mb-2 px-1"
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

const FloatingInput = ({
  label,
  required,
  value,
  onChange,
  type = "text",
  min,
  max,
  monospace,
  placeholder = " ",
}) => (
  <div className="relative w-full">
    <input
      type={type}
      value={value}
      onChange={(e) => {
        if (type === "url") {
          let val = e.target.value;
          if (
            val &&
            !val.startsWith("http://") &&
            !val.startsWith("https://")
          ) {
            val = "https://" + val;
          }
          onChange(val);
        } else {
          onChange(
            type === "number"
              ? Math.max(0, Number(e.target.value))
              : e.target.value,
          );
        }
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-full bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 pt-6 pb-2 text-[13px] text-[#F5F0E8] outline-none transition-all peer focus:border-[rgba(191,162,100,0.5)] focus:bg-[#1a1a1a]"
      style={{
        fontFamily: monospace ? "monospace" : "'Poppins', sans-serif",
      }}
      required={required}
    />
    <label className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[rgba(245,240,232,0.28)] pointer-events-none transition-all peer-focus:top-3 peer-focus:text-[9px] peer-focus:font-bold peer-focus:tracking-widest peer-focus:uppercase peer-focus:text-[#D4AF78] peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:text-[#D4AF78]">
      {label} {required && "*"}
    </label>
  </div>
);

const FloatingTextarea = ({ label, value, onChange, maxLength }) => (
  <div className="relative w-full">
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
      placeholder=" "
      rows={4}
      className="w-full bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 pt-6 pb-2 text-[13px] text-[#F5F0E8] outline-none resize-none transition-all custom-scrollbar peer focus:border-[rgba(191,162,100,0.5)] focus:bg-[#1a1a1a]"
      style={{
        fontFamily: "'Poppins', sans-serif",
      }}
    />
    <label className="absolute left-4 top-4 text-xs text-[rgba(245,240,232,0.28)] pointer-events-none transition-all peer-focus:top-3 peer-focus:text-[9px] peer-focus:font-bold peer-focus:tracking-widest peer-focus:uppercase peer-focus:text-[#D4AF78] peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:text-[#D4AF78]">
      {label}
    </label>
    {maxLength && (
      <span className="absolute right-3 bottom-2 text-[9px] text-[#666]">
        {value.length} / {maxLength}
      </span>
    )}
  </div>
);

const AutocompleteInput = ({
  label,
  value,
  onChange,
  options = [],
  creatable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes((search || "").toLowerCase()),
  );
  if (creatable && search && !options.includes(search))
    filtered.push(`Add "${search}"`);

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={open ? search : value}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder=" "
          className="w-full bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 pt-6 pb-2 text-[13px] text-[#F5F0E8] outline-none transition-all peer focus:border-[rgba(191,162,100,0.5)] focus:bg-[#1a1a1a]"
        />
        <label className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[rgba(245,240,232,0.28)] pointer-events-none transition-all peer-focus:top-3 peer-focus:text-[9px] peer-focus:font-bold peer-focus:tracking-widest peer-focus:uppercase peer-focus:text-[#D4AF78] peer-not-placeholder-shown:top-3 peer-not-placeholder-shown:text-[9px] peer-not-placeholder-shown:font-bold peer-not-placeholder-shown:tracking-widest peer-not-placeholder-shown:uppercase peer-not-placeholder-shown:text-[#D4AF78]">
          {label}
        </label>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none" />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full max-h-48 overflow-y-auto bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl z-[100] custom-scrollbar p-1">
          {filtered.map((opt, i) => (
            <div
              key={i}
              onMouseDown={() => {
                if (opt.startsWith('Add "')) {
                  onChange(search);
                } else {
                  onChange(opt);
                }
                setOpen(false);
              }}
              className="px-3 py-2.5 text-xs text-[#ccc] hover:text-white hover:bg-[rgba(191,162,100,0.1)] rounded-lg cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StrengthRadio = ({ value, onChange }) => {
  const levels = [
    { id: "Weak", color: "#EF4444" },
    { id: "Medium", color: "#F59E0B" },
    { id: "Strong", color: "#22C55E" },
  ];
  return (
    <div className="flex items-center gap-3 bg-[#141414] p-1.5 rounded-xl border border-[rgba(255,255,255,0.07)]">
      {levels.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onChange(l.id)}
          className="flex-1 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
          style={{
            background: value === l.id ? `${l.color}15` : "transparent",
            color: value === l.id ? l.color : "#666",
            border: `1px solid ${value === l.id ? `${l.color}40` : "transparent"}`,
          }}
        >
          {value === l.id && <Check className="w-3 h-3" />}
          {l.id}
        </button>
      ))}
    </div>
  );
};

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between p-3 bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl">
    <span className="text-[12px] font-medium text-[#ccc]">{label}</span>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-all"
      style={{
        background: checked ? G.base : "rgba(255,255,255,0.06)",
      }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-[2px] w-4 h-4 rounded-full bg-black"
      />
    </button>
  </div>
);

const MultiTagInput = ({ label, tags, onChange, options = [], limit = 12 }) => {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = options.filter(
    (o) => o.toLowerCase().includes(input.toLowerCase()) && !tags.includes(o),
  );
  if (input && !options.includes(input) && !tags.includes(input))
    filtered.push(`Add "${input}"`);

  const addTag = (val) => {
    let t = val
      .replace(/^Add "/, "")
      .replace(/"$/, "")
      .trim();
    if (t && !tags.includes(t) && tags.length < limit) onChange([...tags, t]);
    setInput("");
    setOpen(false);
  };

  const removeTag = (t) => onChange(tags.filter((x) => x !== t));

  return (
    <div className="relative w-full bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl p-3 pt-5 focus-within:border-[rgba(191,162,100,0.5)] transition-all">
      <label className="absolute left-4 top-2 text-[9px] font-bold tracking-widest uppercase text-[#D4AF78]">
        {label} {tags.length}/{limit}
      </label>
      <div className="flex flex-wrap gap-2 mt-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[11px] text-[#eee]"
          >
            {t}
            <button
              type="button"
              onClick={() => removeTag(t)}
              className="text-[#888] hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
            if (e.key === "Backspace" && !input && tags.length)
              removeTag(tags[tags.length - 1]);
          }}
          disabled={tags.length >= limit}
          placeholder={tags.length < limit ? "Type to add..." : ""}
          className="flex-1 min-w-[120px] bg-transparent text-[12px] text-[#F5F0E8] outline-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full max-h-48 overflow-y-auto bg-[#1A1A1A] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl z-[100] custom-scrollbar p-1">
          {filtered.map((opt, i) => (
            <div
              key={i}
              onMouseDown={() => addTag(opt)}
              className="px-3 py-2.5 text-xs text-[#ccc] hover:text-white hover:bg-[rgba(191,162,100,0.1)] rounded-lg cursor-pointer transition-colors"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// COURSE FORM
// ─────────────────────────────────────────────────────────────────────────────
const CourseForm = memo(({ form, patch }) => (
  <div className="flex flex-col gap-4">
    <FloatingInput
      label="Title"
      required
      value={form.title}
      onChange={(v) => patch("title", v)}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AutocompleteInput
        label="Provider / Platform"
        required
        value={form.provider}
        onChange={(v) => patch("provider", v)}
        options={[]}
        creatable
      />

      <div className="relative w-full bg-[#141414] border border-[rgba(255,255,255,0.07)] rounded-xl focus-within:border-[rgba(191,162,100,0.5)] transition-all">
        <div className="absolute left-4 top-2 flex items-center gap-2 z-10">
          <span className="text-[9px] font-bold tracking-widest uppercase text-[#D4AF78]">
            Estimated
          </span>
          <div className="flex bg-[#0a0a0a] rounded border border-white/5 overflow-hidden">
            {["Hours", "Days", "Weeks"].map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => patch("estimatedUnit", unit)}
                className={cn(
                  "px-2 py-0.5 text-[8px] font-bold uppercase",
                  form.estimatedUnit === unit
                    ? "bg-[#BFA264] text-black"
                    : "text-[#666] hover:text-[#ccc]",
                )}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
        <input
          type="number"
          min="0"
          value={form.estimatedHours || ""}
          onChange={(e) =>
            patch("estimatedHours", Math.max(0, Number(e.target.value)))
          }
          placeholder=" "
          className="w-full bg-transparent px-4 pt-8 pb-2 text-[13px] text-[#F5F0E8] outline-none"
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AutocompleteInput
        label="Domain"
        required
        value={form.category}
        onChange={(v) => patch("category", v)}
        options={MACRO_DOMAINS}
      />
      <AutocompleteInput
        label="Niche"
        value={form.niche}
        onChange={(v) => patch("niche", v)}
        options={MICRO_NICHES}
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AutocompleteInput
        label="Language"
        required
        value={form.language}
        onChange={(v) => patch("language", v)}
        options={LANGUAGES}
      />
      <FloatingInput
        label="Score Reward (pts)"
        type="number"
        min="0"
        value={form.scoreReward}
        onChange={(v) => patch("scoreReward", v)}
      />
    </div>

    <div>
      <Label>Strength</Label>
      <StrengthRadio
        value={form.strength}
        onChange={(v) => patch("strength", v)}
      />
    </div>

    <div>
      <Label>Target Audience</Label>
      <div className="flex items-center gap-3 bg-[#141414] p-1.5 rounded-xl border border-[rgba(255,255,255,0.07)]">
        {["Students", "Professionals", "Any"].map((aud) => (
          <button
            key={aud}
            type="button"
            onClick={() => patch("targetAudience", aud)}
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5",
              form.targetAudience === aud
                ? "bg-[rgba(191,162,100,0.15)] text-[#D4AF78] border border-[rgba(191,162,100,0.3)]"
                : "text-[#666] border border-transparent",
            )}
          >
            {form.targetAudience === aud && <Check className="w-3 h-3" />}
            {aud}
          </button>
        ))}
      </div>
    </div>

    <FloatingInput
      label="Course Link"
      required
      type="url"
      value={form.link}
      onChange={(v) => patch("link", v)}
    />
    <FloatingInput
      label="Thumbnail URL"
      type="url"
      value={form.thumbnailUrl}
      onChange={(v) => patch("thumbnailUrl", v)}
    />

    {form.thumbnailUrl && (
      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)]">
        <img
          src={form.thumbnailUrl}
          alt="preview"
          className="w-full object-cover"
          style={{ aspectRatio: "16/7", maxHeight: 160 }}
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>
    )}

    <FloatingTextarea
      label="Overview"
      value={form.description}
      onChange={(v) => patch("description", v)}
      maxLength={1000}
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <MultiTagInput
        label="Tags"
        tags={form.tags}
        onChange={(v) => patch("tags", v)}
      />
      <MultiTagInput
        label="Skills Gained"
        tags={form.skillsGained}
        onChange={(v) => patch("skillsGained", v)}
        options={RAW_SKILLS}
      />
    </div>

    <div className="flex flex-col gap-2 p-1 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)]">
      <Toggle
        label="Paid Course"
        checked={form.isPaid}
        onChange={(v) => patch("isPaid", v)}
      />
      <Toggle
        label="Paid Certificate"
        checked={form.isCertificatePaid}
        onChange={(v) => patch("isCertificatePaid", v)}
      />
      <Toggle
        label="Featured Item"
        checked={form.isFeatured}
        onChange={(v) => patch("isFeatured", v)}
      />
    </div>
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
    <div className="flex flex-col gap-4">
      <FloatingInput
        label="Title"
        required
        value={form.title}
        onChange={(v) => patch("title", v)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="YouTube Video ID"
          required
          value={form.youtubeId}
          onChange={(v) => patch("youtubeId", v.trim())}
          monospace
        />
        <FloatingInput
          label="Channel Name"
          value={form.channelName}
          onChange={(v) => patch("channelName", v)}
        />
      </div>

      {thumbnailUrl && (
        <div
          className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.1)] relative"
          style={{ aspectRatio: "16/9" }}
        >
          <img
            src={thumbnailUrl}
            alt="YouTube thumbnail"
            className="w-full h-full object-cover opacity-80"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 flex items-center justify-center bg-[#D4AF78] rounded-full pl-1">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AutocompleteInput
          label="Domain"
          required
          value={form.category}
          onChange={(v) => patch("category", v)}
          options={MACRO_DOMAINS}
        />
        <AutocompleteInput
          label="Niche"
          value={form.niche}
          onChange={(v) => patch("niche", v)}
          options={MICRO_NICHES}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingInput
          label="Duration (minutes)"
          type="number"
          min="0"
          value={form.durationMinutes}
          onChange={(v) => patch("durationMinutes", v)}
        />
        <AutocompleteInput
          label="Language"
          required
          value={form.language}
          onChange={(v) => patch("language", v)}
          options={LANGUAGES}
        />
      </div>

      <div>
        <Label>Strength</Label>
        <StrengthRadio
          value={form.strength}
          onChange={(v) => patch("strength", v)}
        />
      </div>

      <div>
        <Label>Target Audience</Label>
        <div className="flex items-center gap-3 bg-[#141414] p-1.5 rounded-xl border border-[rgba(255,255,255,0.07)]">
          {["Students", "Professionals", "Any"].map((aud) => (
            <button
              key={aud}
              type="button"
              onClick={() => patch("targetAudience", aud)}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5",
                form.targetAudience === aud
                  ? "bg-[rgba(191,162,100,0.15)] text-[#D4AF78] border border-[rgba(191,162,100,0.3)]"
                  : "text-[#666] border border-transparent",
              )}
            >
              {form.targetAudience === aud && <Check className="w-3 h-3" />}
              {aud}
            </button>
          ))}
        </div>
      </div>

      <FloatingTextarea
        label="Overview"
        value={form.description}
        onChange={(v) => patch("description", v)}
        maxLength={1000}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MultiTagInput
          label="Tags"
          tags={form.tags}
          onChange={(v) => patch("tags", v)}
        />
        <MultiTagInput
          label="Skills Gained"
          tags={form.skillsGained}
          onChange={(v) => patch("skillsGained", v)}
          options={RAW_SKILLS}
        />
      </div>

      <div className="flex flex-col gap-2 p-1 bg-[#0A0A0A] rounded-xl border border-[rgba(255,255,255,0.04)]">
        <Toggle
          label="Featured Item"
          checked={form.isFeatured}
          onChange={(v) => patch("isFeatured", v)}
        />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT FORM STATES
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_COURSE = {
  title: "",
  provider: "",
  category: "",
  niche: "",
  language: "English",
  link: "",
  estimatedHours: "",
  estimatedUnit: "Hours",
  strength: "Medium",
  targetAudience: "Any",
  tags: [],
  scoreReward: 5,
  thumbnailUrl: "",
  description: "",
  isPaid: false,
  isCertificatePaid: false,
  isFeatured: false,
  skillsGained: [],
};
const DEFAULT_VIDEO = {
  title: "",
  youtubeId: "",
  channelName: "",
  category: "",
  niche: "",
  language: "English",
  durationMinutes: 0,
  strength: "Medium",
  targetAudience: "Any",
  tags: [],
  description: "",
  isFeatured: false,
  skillsGained: [],
};

// =============================================================================
// MODAL COMPONENT
// =============================================================================
const LearnAdminModal = ({
  type = "course",
  item,
  onClose,
  onSaved,
  adminEmail,
}) => {
  const isCourse = type === "course";
  const isEdit = !!item;

  const [form, setForm] = useState(() => {
    if (isEdit)
      return { ...(isCourse ? DEFAULT_COURSE : DEFAULT_VIDEO), ...item };
    return isCourse ? { ...DEFAULT_COURSE } : { ...DEFAULT_VIDEO };
  });

  const patch = useCallback(
    (key, value) => setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState(null);

  const isValid = useMemo(() => {
    if (!form.title?.trim()) return false;
    if (isCourse)
      return !!(form.provider?.trim() && form.category && form.link?.trim());
    return !!(form.youtubeId?.trim() && form.category);
  }, [form, isCourse]);

  const handleSave = useCallback(async () => {
    if (!isValid || saving) return;
    setSaving(true);
    setError("");

    try {
      let id;
      const colName = isCourse
        ? LEARN_COLLECTIONS.courses
        : LEARN_COLLECTIONS.videos;

      if (isEdit) {
        await updateLearnItem(colName, item.id, form, adminEmail);
        id = item.discotiveLearnId;
      } else {
        id = isCourse
          ? await createCourse(form, adminEmail)
          : await createVideo(form, adminEmail);
      }

      setSavedId(id);
      setTimeout(() => onSaved(), 1400);
    } catch (err) {
      console.error("[LearnAdminModal] Save failed:", err);
      setError(err?.message || "Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  }, [form, isCourse, isEdit, isValid, saving, item, adminEmail, onSaved]);

  return (
    <AnimatePresence>
      {/* Highest possible z-index to break entirely out of the MainLayout layering */}
      <div className="fixed inset-0 z-[999999] flex p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 28, stiffness: 380 }}
          className="relative m-auto flex flex-col overflow-hidden w-full rounded-[24px] shadow-2xl"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.08)",
            maxWidth: 680,
            maxHeight: "92vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/5">
            <div className="flex items-center gap-3">
              {isCourse ? (
                <Award className="w-4 h-4 text-[#D4AF78]" />
              ) : (
                <Video className="w-4 h-4 text-[#D4AF78]" />
              )}
              <div>
                <h2 className="text-[13px] font-black text-[#F5F0E8] font-['Montserrat']">
                  {isEdit ? "Edit" : "Add"} {isCourse ? "Course" : "Video"}
                </h2>
                {isEdit && item.discotiveLearnId && (
                  <p className="text-[8px] font-mono mt-0.5 text-white/30">
                    {item.discotiveLearnId}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center border border-white/10 text-white/30 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success State */}
          <AnimatePresence>
            {savedId && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0A0A0A]"
              >
                <div className="w-16 h-16 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-[15px] font-black mb-1 text-[#F5F0E8] font-['Montserrat']">
                    {isEdit ? "Updated" : "Created"}
                  </p>
                  <p className="text-[9px] font-mono text-white/30">
                    {savedId}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5">
            {isCourse ? (
              <CourseForm form={form} patch={patch} />
            ) : (
              <VideoForm form={form} patch={patch} />
            )}
            {error && (
              <div className="flex items-center gap-2 mt-4 px-4 py-3 bg-red-500/5 border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <p className="text-[10px] text-red-400">{error}</p>
              </div>
            )}
            {form.domains?.length === 0 && (
              <div
                className="flex items-center gap-2 mt-4 px-4 py-3"
                style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
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

          {/* Footer */}
          <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-t border-white/5">
            <button
              onClick={onClose}
              className="h-12 px-6 flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-white/30 border border-white/10 font-['Montserrat']"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid || saving}
              className="flex-1 h-12 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] font-['Montserrat'] transition-all"
              style={{
                background:
                  isValid && !saving ? G.base : "rgba(191,162,100,0.25)",
                color: isValid && !saving ? "#030303" : T.dim,
                cursor: isValid && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />{" "}
                  {isEdit
                    ? "Save Changes"
                    : `Create ${isCourse ? "Course" : "Video"}`}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LearnAdminModal;
