/**
 * @fileoverview Discotive OS — Learn Database Admin v1.0
 * @module Admin/LearnDatabase
 * @description
 * God-mode admin CMS for the entire Discotive Learn ecosystem.
 * Full CRUD for Certificates and Videos. Zero onSnapshot.
 * All reads are one-shot getDocs with manual refresh.
 *
 * Architecture:
 * - Tab view: Certificates | Videos
 * - Full create / edit / delete with inline modal forms
 * - Search, filter by domain / category, sort
 * - Discotive Learn ID display and copy
 * - Score reward management
 * - Tag & domain multi-select
 * - YouTube thumbnail live preview for videos
 * - "Align to Vault" button for admin verification pairing
 *
 * Firestore collections:
 *   discotive_certificates/{id}
 *   discotive_videos/{id}
 *
 * Import paths mirror the AdminDashboard pattern.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  generateLearnId,
  VIDEO_CATEGORIES,
  CERTIFICATE_CATEGORIES,
  DIFFICULTY_LEVELS,
  DOMAINS,
} from "../../lib/discotiveLearn";
import { auth } from "../../firebase";
import {
  Database,
  Award,
  Video,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  X,
  Check,
  ArrowLeft,
  Copy,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Star,
  Tag,
  Globe,
  BookOpen,
  Zap,
  Filter,
  BarChart2,
  Clock,
  Hash,
  ChevronLeft,
  ChevronRight,
  Eye,
  Play,
  Link2,
  GraduationCap,
  Layers,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 24;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const timeAgo = (ts) => {
  if (!ts) return "—";
  const date = ts?.toDate
    ? ts.toDate()
    : new Date(ts.seconds ? ts.seconds * 1000 : ts);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getYtThumb = (id) =>
  id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;

const extractYouTubeId = (url = "") => {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i,
  );
  return match ? match[1] : url.trim().slice(0, 11);
};

// ─── Shared Atoms ─────────────────────────────────────────────────────────────
const InputField = memo(({ label, required, ...props }) => (
  <div>
    <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors placeholder-white/20"
      {...props}
    />
  </div>
));

const SelectField = memo(({ label, children, ...props }) => (
  <div>
    <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
      {label}
    </label>
    <div className="relative">
      <select
        className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors appearance-none"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
    </div>
  </div>
));

// ─── Multi-Select Chip Input ───────────────────────────────────────────────────
const ChipInput = memo(
  ({
    label,
    options = [],
    value = [],
    onChange,
    allowCustom = true,
    placeholder,
  }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef(null);

    useEffect(() => {
      const h = (e) => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(
      () =>
        options.filter(
          (o) =>
            o.toLowerCase().includes(q.toLowerCase()) && !value.includes(o),
        ),
      [options, q, value],
    );

    const toggle = (v) => {
      onChange(
        value.includes(v) ? value.filter((i) => i !== v) : [...value, v],
      );
      setQ("");
    };

    return (
      <div ref={ref} className="relative">
        <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
          {label}
        </label>
        <div
          className="min-h-[44px] w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-2 flex flex-wrap gap-1.5 items-center cursor-text focus-within:border-[#BFA264]/40 transition-colors"
          onClick={() => setOpen(true)}
        >
          {value.map((chip) => (
            <span
              key={chip}
              className="flex items-center gap-1 px-2 py-0.5 bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white"
            >
              {chip}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(chip);
                }}
              >
                <X className="w-2.5 h-2.5 hover:text-red-400" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-white placeholder-white/20"
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
            >
              {filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-[#ccc] hover:text-white"
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 && allowCustom && q.trim() && (
                <div
                  onClick={() => toggle(q.trim())}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-emerald-400 font-bold"
                >
                  + Add "{q}"
                </div>
              )}
              {filtered.length === 0 && !allowCustom && (
                <div className="px-4 py-3 text-xs text-white/30 text-center">
                  No matches
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

// ─── Toast ────────────────────────────────────────────────────────────────────
const useToasts = () => {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "grey") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-3), { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3600);
  }, []);
  return { toasts, add };
};

// ─── Certificate Form Modal ───────────────────────────────────────────────────
const CertFormModal = ({ item, onClose, onSaved, adminEmail }) => {
  const isEdit = !!item?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: item?.title || "",
    provider: item?.provider || "",
    category: item?.category || CERTIFICATE_CATEGORIES[0],
    link: item?.link || "",
    duration: item?.duration || "",
    difficulty: item?.difficulty || "Intermediate",
    scoreReward: item?.scoreReward ?? 50,
    thumbnailUrl: item?.thumbnailUrl || "",
    description: item?.description || "",
    tags: item?.tags || [],
    domains: item?.domains || [],
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.link.trim() || !form.provider.trim()) {
      setError("Title, provider, and link are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        scoreReward: Number(form.scoreReward) || 0,
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail,
      };
      if (isEdit) {
        await updateDoc(doc(db, "discotive_certificates", item.id), payload);
      } else {
        const learnId = await generateLearnId("certificate");
        await addDoc(collection(db, "discotive_certificates"), {
          ...payload,
          discotiveLearnId: learnId,
          createdAt: serverTimestamp(),
          createdBy: adminEmail,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#080808] border border-[#1e1e1e] rounded-[2rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {isEdit ? "Edit Certificate" : "New Certificate"}
              </h3>
              {item?.discotiveLearnId && (
                <p className="text-[9px] font-mono text-amber-500/60">
                  {item.discotiveLearnId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-full">
              <InputField
                label="Certificate Title"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. AWS Solutions Architect – Associate"
              />
            </div>
            <InputField
              label="Provider / Institution"
              required
              value={form.provider}
              onChange={(e) => set("provider", e.target.value)}
              placeholder="e.g. Amazon Web Services, Coursera"
            />
            <InputField
              label="Enrollment Link"
              required
              type="url"
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://aws.amazon.com/certification/..."
            />

            <SelectField
              label="Category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CERTIFICATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Difficulty"
              value={form.difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
            >
              {DIFFICULTY_LEVELS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </SelectField>

            <InputField
              label="Duration"
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="e.g. 40 hours, 3 months"
            />

            <div>
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                Score Reward <span className="text-amber-400">pts</span>
              </label>
              <input
                type="number"
                min={0}
                max={500}
                value={form.scoreReward}
                onChange={(e) => set("scoreReward", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors"
              />
            </div>

            <div className="col-span-full">
              <InputField
                label="Thumbnail URL"
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
              />
              {form.thumbnailUrl && (
                <img
                  src={form.thumbnailUrl}
                  alt="Preview"
                  className="mt-2 h-20 w-full object-cover rounded-xl opacity-60"
                />
              )}
            </div>

            <div className="col-span-full">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What will the learner gain from this certificate?"
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors resize-none placeholder-white/20"
              />
            </div>

            <div className="col-span-full">
              <ChipInput
                label="Tags"
                options={[
                  "React",
                  "Python",
                  "AWS",
                  "Machine Learning",
                  "JavaScript",
                  "TypeScript",
                  "Docker",
                  "Kubernetes",
                  "SQL",
                  "Data Science",
                ]}
                value={form.tags}
                onChange={(v) => set("tags", v)}
                placeholder="Add tags..."
              />
            </div>

            <div className="col-span-full">
              <ChipInput
                label="Domains"
                options={DOMAINS}
                value={form.domains}
                onChange={(v) => set("domains", v)}
                allowCustom={false}
                placeholder="Select target domains..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#0d0d0d] border border-[#1e1e1e] text-white/60 text-[11px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving
                ? "Saving..."
                : isEdit
                  ? "Update Certificate"
                  : "Create Certificate"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

// ─── Video Form Modal ─────────────────────────────────────────────────────────
const VideoFormModal = ({ item, onClose, onSaved, adminEmail }) => {
  const isEdit = !!item?.id;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: item?.title || "",
    youtubeId: item?.youtubeId || "",
    category: item?.category || "educational",
    durationMinutes: item?.durationMinutes || "",
    scoreReward: item?.scoreReward ?? 25,
    description: item?.description || "",
    tags: item?.tags || [],
    domains: item?.domains || [],
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Auto-fetch title from noembed
  const handleYtIdChange = async (val) => {
    const cleaned = extractYouTubeId(val);
    set("youtubeId", cleaned);
    if (cleaned && cleaned.length === 11 && !form.title) {
      try {
        const r = await fetch(
          `https://noembed.com/embed?url=https://youtube.com/watch?v=${cleaned}`,
        );
        const d = await r.json();
        if (d.title) set("title", d.title);
      } catch (_) {}
    }
  };

  const thumb = getYtThumb(form.youtubeId);

  const handleSave = async () => {
    if (!form.title.trim() || !form.youtubeId.trim()) {
      setError("Title and YouTube ID are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        thumbnailUrl: `https://img.youtube.com/vi/${form.youtubeId}/maxresdefault.jpg`,
        durationMinutes: form.durationMinutes
          ? Number(form.durationMinutes)
          : null,
        scoreReward: Number(form.scoreReward) || 0,
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail,
      };
      if (isEdit) {
        await updateDoc(doc(db, "discotive_videos", item.id), payload);
      } else {
        const learnId = await generateLearnId("video");
        await addDoc(collection(db, "discotive_videos"), {
          ...payload,
          discotiveLearnId: learnId,
          createdAt: serverTimestamp(),
          createdBy: adminEmail,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#080808] border border-[#1e1e1e] rounded-[2rem] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {isEdit ? "Edit Video" : "New Video"}
              </h3>
              {item?.discotiveLearnId && (
                <p className="text-[9px] font-mono text-red-500/60">
                  {item.discotiveLearnId}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20 mb-4">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* YouTube Thumbnail Preview */}
            <div className="col-span-full">
              {thumb ? (
                <div
                  className="relative rounded-2xl overflow-hidden mb-4"
                  style={{ aspectRatio: "16/7" }}
                >
                  <img
                    src={thumb}
                    alt="Thumbnail"
                    className="w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-500/80 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
                </div>
              ) : null}
            </div>

            <div className="col-span-full">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                YouTube Video URL or ID <span className="text-red-400">*</span>
              </label>
              <input
                value={form.youtubeId}
                onChange={(e) => handleYtIdChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=xxx or dQw4w9WgXcQ"
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-red-500/40 transition-colors placeholder-white/20"
              />
            </div>

            <div className="col-span-full">
              <InputField
                label="Video Title"
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Auto-filled from YouTube, or enter manually"
              />
            </div>

            <SelectField
              label="Category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {VIDEO_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </SelectField>

            <InputField
              label="Duration (minutes)"
              type="number"
              min={0}
              value={form.durationMinutes}
              onChange={(e) => set("durationMinutes", e.target.value)}
              placeholder="e.g. 45"
            />

            <div>
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                Score Reward <span className="text-amber-400">pts</span>
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={form.scoreReward}
                onChange={(e) => set("scoreReward", e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Brief description of the video content"
                className="w-full bg-[#0d0d0d] border border-[#1e1e1e] text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#BFA264]/40 transition-colors resize-none placeholder-white/20"
              />
            </div>

            <div className="col-span-full">
              <ChipInput
                label="Tags"
                options={[
                  "React",
                  "Python",
                  "Career",
                  "Startup",
                  "Design",
                  "Marketing",
                  "Finance",
                  "Data Science",
                  "AI",
                  "Freelancing",
                ]}
                value={form.tags}
                onChange={(v) => set("tags", v)}
                placeholder="Add tags..."
              />
            </div>

            <div className="col-span-full">
              <ChipInput
                label="Domains"
                options={DOMAINS}
                value={form.domains}
                onChange={(v) => set("domains", v)}
                allowCustom={false}
                placeholder="Select target domains..."
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#1a1a1a] bg-[#050505] shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-[#0d0d0d] border border-[#1e1e1e] text-white/60 text-[11px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saving ? "Saving..." : isEdit ? "Update Video" : "Publish Video"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

// ─── Certificate Row ──────────────────────────────────────────────────────────
const CertRow = memo(
  ({ cert, onEdit, onDelete, onCopyId, expanded, onExpand }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[#1a1a1a] bg-[#080808] rounded-2xl overflow-hidden"
      >
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
          onClick={() => onExpand(cert.id)}
        >
          {/* Thumbnail */}
          <div
            className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-[#111] flex items-center justify-center"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {cert.thumbnailUrl ? (
              <img
                src={cert.thumbnailUrl}
                alt={cert.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Award className="w-4 h-4 text-amber-400/40" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-white truncate">
                {cert.title}
              </p>
              <span className="shrink-0 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border bg-amber-500/8 border-amber-500/20 text-amber-400">
                {cert.difficulty || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-white/40 font-medium">
                {cert.provider}
              </span>
              <span className="text-[9px] text-white/20">·</span>
              <span className="text-[9px] text-white/25">{cert.category}</span>
              {cert.scoreReward > 0 && (
                <>
                  <span className="text-[9px] text-white/20">·</span>
                  <span className="text-[9px] font-black text-amber-500">
                    +{cert.scoreReward} pts
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {cert.discotiveLearnId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyId(cert.discotiveLearnId);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#1e1e1e] text-[8px] font-mono text-white/20 hover:text-white/60 hover:border-white/15 transition-all"
              >
                <Hash className="w-2.5 h-2.5" />
                {cert.discotiveLearnId.slice(-6)}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cert);
              }}
              className="w-7 h-7 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center hover:border-amber-500/30 hover:text-amber-400 transition-all"
            >
              <Pencil className="w-3.5 h-3.5 text-white/40" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-7 h-7 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/40" />
              </button>
            ) : (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onDelete(cert.id)}
                  className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-[9px] font-black text-red-400 uppercase"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] font-black text-white/40 uppercase"
                >
                  Cancel
                </button>
              </div>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-white/20 transition-transform shrink-0",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[#1a1a1a] overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Duration", value: cert.duration || "—" },
                    {
                      label: "Score Reward",
                      value: cert.scoreReward
                        ? `+${cert.scoreReward} pts`
                        : "—",
                    },
                    {
                      label: "Learn ID",
                      value: cert.discotiveLearnId || "Not assigned",
                    },
                    { label: "Created", value: timeAgo(cert.createdAt) },
                    { label: "Updated", value: timeAgo(cert.updatedAt) },
                    { label: "Created By", value: cert.createdBy || "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-0.5">
                        {label}
                      </p>
                      <p className="text-[10px] text-white/60 font-mono truncate">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {cert.description && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    {cert.description}
                  </p>
                )}
                {(cert.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {cert.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-white/[0.04] border border-white/[0.06] text-white/35"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {cert.link && (
                  <a
                    href={cert.link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> {cert.link}
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

// ─── Video Row ────────────────────────────────────────────────────────────────
const VideoRow = memo(
  ({ video, onEdit, onDelete, onCopyId, expanded, onExpand }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const catLabel =
      VIDEO_CATEGORIES.find((c) => c.key === video.category)?.label ||
      video.category ||
      "—";
    const thumb = getYtThumb(video.youtubeId);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-[#1a1a1a] bg-[#080808] rounded-2xl overflow-hidden"
      >
        <div
          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.01] transition-colors"
          onClick={() => onExpand(video.id)}
        >
          <div
            className="w-16 h-9 rounded-lg overflow-hidden shrink-0 bg-[#111] relative"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-4 h-4 text-red-400/40" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="w-5 h-5 rounded-full bg-red-500/80 flex items-center justify-center">
                <Play className="w-2.5 h-2.5 text-white ml-px" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate mb-0.5">
              {video.title}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] text-white/40">{catLabel}</span>
              {video.durationMinutes && (
                <>
                  <span className="text-[9px] text-white/20">·</span>
                  <span className="flex items-center gap-1 text-[9px] text-white/30">
                    <Clock className="w-2.5 h-2.5" />
                    {video.durationMinutes < 60
                      ? `${video.durationMinutes}m`
                      : `${Math.floor(video.durationMinutes / 60)}h ${video.durationMinutes % 60}m`}
                  </span>
                </>
              )}
              {video.scoreReward > 0 && (
                <>
                  <span className="text-[9px] text-white/20">·</span>
                  <span className="text-[9px] font-black text-amber-500">
                    +{video.scoreReward} pts
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {video.discotiveLearnId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyId(video.discotiveLearnId);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#1e1e1e] text-[8px] font-mono text-white/20 hover:text-white/60 hover:border-white/15 transition-all"
              >
                <Hash className="w-2.5 h-2.5" />
                {video.discotiveLearnId.slice(-6)}
              </button>
            )}
            <a
              href={`https://youtube.com/watch?v=${video.youtubeId}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-7 h-7 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center hover:border-red-500/30 hover:text-red-400 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 text-white/40" />
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(video);
              }}
              className="w-7 h-7 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center hover:border-amber-500/30 hover:text-amber-400 transition-all"
            >
              <Pencil className="w-3.5 h-3.5 text-white/40" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-7 h-7 rounded-lg bg-[#111] border border-[#1e1e1e] flex items-center justify-center hover:border-red-500/30 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/40" />
              </button>
            ) : (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onDelete(video.id)}
                  className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-[9px] font-black text-red-400 uppercase"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] font-black text-white/40 uppercase"
                >
                  Cancel
                </button>
              </div>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-white/20 transition-transform shrink-0",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[#1a1a1a] overflow-hidden"
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "YouTube ID", value: video.youtubeId || "—" },
                    {
                      label: "Duration",
                      value: video.durationMinutes
                        ? `${video.durationMinutes}m`
                        : "—",
                    },
                    {
                      label: "Score Reward",
                      value: video.scoreReward
                        ? `+${video.scoreReward} pts`
                        : "—",
                    },
                    {
                      label: "Learn ID",
                      value: video.discotiveLearnId || "Not assigned",
                    },
                    { label: "Created", value: timeAgo(video.createdAt) },
                    { label: "Created By", value: video.createdBy || "—" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-0.5">
                        {label}
                      </p>
                      <p className="text-[10px] text-white/60 font-mono truncate">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                {video.description && (
                  <p className="text-xs text-white/40 leading-relaxed">
                    {video.description}
                  </p>
                )}
                {(video.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {video.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-white/[0.04] border border-white/[0.06] text-white/35"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {(video.domains || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {video.domains.map((d) => (
                      <span
                        key={d}
                        className="px-2 py-0.5 rounded-md text-[8px] font-bold bg-[#BFA264]/8 border border-[#BFA264]/20 text-[#BFA264]/70"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const StatsBar = memo(({ certs, videos }) => {
  const totalPts = [...certs, ...videos].reduce(
    (s, i) => s + (i.scoreReward || 0),
    0,
  );
  const avgPts =
    certs.length + videos.length > 0
      ? Math.round(totalPts / (certs.length + videos.length))
      : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        {
          label: "Certificates",
          value: certs.length,
          icon: Award,
          color: "text-amber-400",
        },
        {
          label: "Videos",
          value: videos.length,
          icon: Play,
          color: "text-red-400",
        },
        {
          label: "Total Items",
          value: certs.length + videos.length,
          icon: Database,
          color: "text-white",
        },
        {
          label: "Avg Score Reward",
          value: `+${avgPts}`,
          icon: Zap,
          color: "text-[#BFA264]",
        },
      ].map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="bg-[#0a0a0c] border border-white/[0.05] rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
              {label}
            </span>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <p className={cn("text-3xl font-black font-mono", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
});

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LearnDatabase = () => {
  const adminEmail = auth.currentUser?.email;

  const [activeTab, setActiveTab] = useState("certs"); // certs | videos
  const [certs, setCerts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modals
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [videoFormOpen, setVideoFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { toasts, add: addToast } = useToasts();

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [certSnap, videoSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "discotive_certificates"),
              orderBy("createdAt", "desc"),
              limit(200),
            ),
          ),
          getDocs(
            query(
              collection(db, "discotive_videos"),
              orderBy("createdAt", "desc"),
              limit(200),
            ),
          ),
        ]);
        setCerts(certSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("[LearnDatabase] Fetch failed:", err);
        addToast("Failed to load database. Check permissions.", "red");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id, type) => {
      try {
        await deleteDoc(
          doc(
            db,
            type === "cert" ? "discotive_certificates" : "discotive_videos",
            id,
          ),
        );
        if (type === "cert") setCerts((p) => p.filter((c) => c.id !== id));
        else setVideos((p) => p.filter((v) => v.id !== id));
        addToast("Item permanently deleted.", "grey");
      } catch (err) {
        addToast("Delete failed.", "red");
      }
    },
    [addToast],
  );

  // ── Copy ID ─────────────────────────────────────────────────────────────────
  const handleCopyId = useCallback(
    (id) => {
      navigator.clipboard.writeText(id);
      addToast(`Copied: ${id}`, "grey");
    },
    [addToast],
  );

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredCerts = useMemo(() => {
    let list = [...certs];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (c) =>
          (c.title || "").toLowerCase().includes(q) ||
          (c.provider || "").toLowerCase().includes(q) ||
          (c.discotiveLearnId || "").toLowerCase().includes(q) ||
          (c.category || "").toLowerCase().includes(q),
      );
    }
    if (domainFilter)
      list = list.filter((c) => (c.domains || []).includes(domainFilter));
    if (categoryFilter)
      list = list.filter((c) => c.category === categoryFilter);
    return list;
  }, [certs, searchQ, domainFilter, categoryFilter]);

  const filteredVideos = useMemo(() => {
    let list = [...videos];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (v) =>
          (v.title || "").toLowerCase().includes(q) ||
          (v.discotiveLearnId || "").toLowerCase().includes(q) ||
          (v.youtubeId || "").toLowerCase().includes(q),
      );
    }
    if (domainFilter)
      list = list.filter((v) => (v.domains || []).includes(domainFilter));
    if (categoryFilter)
      list = list.filter((v) => v.category === categoryFilter);
    return list;
  }, [videos, searchQ, domainFilter, categoryFilter]);

  const Skeleton = () => (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-[68px] bg-white/[0.02] border border-white/[0.03] rounded-2xl"
        />
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#000] text-white pb-24">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/app/admin"
            className="flex items-center gap-2 text-[10px] font-black text-white/30 hover:text-white uppercase tracking-widest mb-4 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Admin Dashboard
          </Link>
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-[#BFA264]/10 border border-[#BFA264]/20 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-[#BFA264]" />
                </div>
                <h1 className="text-3xl font-black text-white">
                  Learn Database
                </h1>
              </div>
              <p className="text-white/30 text-sm">
                {certs.length} certificates · {videos.length} videos · Manage
                all Discotive Learn content
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0c] border border-white/[0.05] rounded-xl text-xs font-bold text-white/60 hover:text-white transition-all disabled:opacity-40"
              >
                <RefreshCw
                  className={cn("w-4 h-4", refreshing && "animate-spin")}
                />
                {refreshing ? "Syncing..." : "Refresh"}
              </button>
              <button
                onClick={() => {
                  setEditItem(null);
                  if (activeTab === "certs") setCertFormOpen(true);
                  else setVideoFormOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                style={{
                  background:
                    activeTab === "certs"
                      ? "linear-gradient(135deg,#8B7240,#D4AF78)"
                      : "linear-gradient(135deg,#b91c1c,#ef4444)",
                  color: activeTab === "certs" ? "#0a0a0a" : "#fff",
                }}
              >
                <Plus className="w-4 h-4" />
                New {activeTab === "certs" ? "Certificate" : "Video"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {!loading && <StatsBar certs={certs} videos={videos} />}

        {/* Tabs + Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Tab switch */}
          <div className="flex p-1 rounded-xl bg-[#0a0a0c] border border-white/[0.05] shrink-0">
            {[
              {
                key: "certs",
                label: "Certificates",
                icon: Award,
                count: filteredCerts.length,
              },
              {
                key: "videos",
                label: "Videos",
                icon: Play,
                count: filteredVideos.length,
              },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setSearchQ("");
                  setCategoryFilter("");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === key
                    ? "bg-white text-black"
                    : "text-white/40 hover:text-white",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <span className="font-mono opacity-60">({count})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder={
                activeTab === "certs"
                  ? "Search by title, provider, category, Learn ID..."
                  : "Search by title, YouTube ID, Learn ID..."
              }
              className="w-full bg-[#0a0a0c] border border-white/[0.05] text-white pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
            />
            {searchQ && (
              <button
                onClick={() => setSearchQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Domain filter */}
          <div className="relative">
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="bg-[#0a0a0c] border border-white/[0.05] text-white/60 pl-3 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none appearance-none"
            >
              <option value="">All Domains</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          </div>

          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-[#0a0a0c] border border-white/[0.05] text-white/60 pl-3 pr-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none appearance-none"
            >
              <option value="">All Categories</option>
              {(activeTab === "certs"
                ? CERTIFICATE_CATEGORIES
                : VIDEO_CATEGORIES.map((v) => v.label)
              ).map((c) => (
                <option
                  key={c}
                  value={
                    activeTab === "certs"
                      ? c
                      : VIDEO_CATEGORIES.find((v) => v.label === c)?.key || c
                  }
                >
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          </div>
        </div>

        {/* Results header */}
        {!loading && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">
              Showing{" "}
              {activeTab === "certs"
                ? filteredCerts.length
                : filteredVideos.length}{" "}
              {activeTab === "certs"
                ? `of ${certs.length} certificates`
                : `of ${videos.length} videos`}
            </p>
            {(searchQ || domainFilter || categoryFilter) && (
              <button
                onClick={() => {
                  setSearchQ("");
                  setDomainFilter("");
                  setCategoryFilter("");
                }}
                className="flex items-center gap-1 text-[9px] font-black text-red-400/60 hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                <X className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Skeleton />
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "certs" && (
              <motion.div
                key="certs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredCerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
                    <Award className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-sm font-black text-white/20">
                      {searchQ
                        ? `No certificates match "${searchQ}"`
                        : "No certificates yet."}
                    </p>
                    {!searchQ && (
                      <button
                        onClick={() => {
                          setEditItem(null);
                          setCertFormOpen(true);
                        }}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Certificate
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredCerts.map((cert) => (
                      <CertRow
                        key={cert.id}
                        cert={cert}
                        onEdit={(c) => {
                          setEditItem(c);
                          setCertFormOpen(true);
                        }}
                        onDelete={(id) => handleDelete(id, "cert")}
                        onCopyId={handleCopyId}
                        expanded={expandedId === cert.id}
                        onExpand={(id) =>
                          setExpandedId((p) => (p === id ? null : id))
                        }
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "videos" && (
              <motion.div
                key="videos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/[0.05] rounded-3xl">
                    <Play className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-sm font-black text-white/20">
                      {searchQ
                        ? `No videos match "${searchQ}"`
                        : "No videos yet."}
                    </p>
                    {!searchQ && (
                      <button
                        onClick={() => {
                          setEditItem(null);
                          setVideoFormOpen(true);
                        }}
                        className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Video
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredVideos.map((video) => (
                      <VideoRow
                        key={video.id}
                        video={video}
                        onEdit={(v) => {
                          setEditItem(v);
                          setVideoFormOpen(true);
                        }}
                        onDelete={(id) => handleDelete(id, "video")}
                        onCopyId={handleCopyId}
                        expanded={expandedId === video.id}
                        onExpand={(id) =>
                          setExpandedId((p) => (p === id ? null : id))
                        }
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {certFormOpen && (
          <CertFormModal
            item={editItem}
            onClose={() => {
              setCertFormOpen(false);
              setEditItem(null);
            }}
            onSaved={() => fetchData(true)}
            adminEmail={adminEmail}
          />
        )}
        {videoFormOpen && (
          <VideoFormModal
            item={editItem}
            onClose={() => {
              setVideoFormOpen(false);
              setEditItem(null);
            }}
            onSaved={() => fetchData(true)}
            adminEmail={adminEmail}
          />
        )}
      </AnimatePresence>

      {/* Toast stack */}
      {createPortal(
        <div
          className="fixed bottom-5 left-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{ maxWidth: 360 }}
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -16, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold pointer-events-auto"
                style={
                  t.type === "green"
                    ? {
                        background: "#041f10",
                        borderColor: "rgba(16,185,129,0.25)",
                        color: "#4ADE80",
                      }
                    : t.type === "red"
                      ? {
                          background: "#1a0505",
                          borderColor: "rgba(239,68,68,0.25)",
                          color: "#f87171",
                        }
                      : {
                          background: "#0d0d0d",
                          borderColor: "rgba(255,255,255,0.07)",
                          color: "rgba(245,240,232,0.6)",
                        }
                }
              >
                {t.type === "green" && (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                )}
                {t.type === "red" && (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                {t.type === "grey" && (
                  <Database className="w-3.5 h-3.5 shrink-0 text-white/30" />
                )}
                <span className="truncate">{t.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default LearnDatabase;
