/**
 * @fileoverview VaultSyncModal — Vault File Explorer for Execution Map
 * @description
 * Presents verified vault assets in a file-explorer UI.
 * Supports: category tabs, search, asset selection, "+New" inline upload.
 *
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   onSync       — ({ assetId, assetTitle, discotiveLearnId, category }) => void
 *   userId       — string
 *   vault        — Asset[] (pre-loaded from userData)
 *   expectedLearnId — string | null (highlights matching asset if set)
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Database,
  ShieldCheck,
  Clock,
  Plus,
  UploadCloud,
  FileText,
  Award,
  Code2,
  BookOpen,
  Briefcase,
  Link2,
  RefreshCw,
  Check,
  ChevronLeft,
  AlertTriangle,
  Loader2,
  FolderLock,
  ExternalLink,
  Hash,
  Zap,
  Star,
} from "lucide-react";
import { cn } from "../ui/BentoCard";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../firebase";
import { awardVaultUpload } from "../../lib/scoreEngine";

// ── Category config ────────────────────────────────────────────────────────

const VAULT_TABS = [
  { key: "All", label: "All" },
  { key: "Certificate", label: "Certificates" },
  { key: "Project", label: "Projects" },
  { key: "Resume", label: "Resumes" },
  { key: "Employment", label: "Employment" },
  { key: "Publication", label: "Publications" },
  { key: "Link", label: "Links" },
];

const CAT = {
  Certificate: {
    Icon: Award,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
  },
  Resume: {
    Icon: FileText,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "",
  },
  Project: {
    Icon: Code2,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "",
  },
  Publication: {
    Icon: BookOpen,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    glow: "",
  },
  Employment: {
    Icon: Briefcase,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "",
  },
  Link: {
    Icon: Link2,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    glow: "",
  },
};
const DEFAULT_CAT = {
  Icon: Database,
  color: "text-white/40",
  bg: "bg-white/5",
  border: "border-white/10",
  glow: "",
};
const getCat = (c) => CAT[c] || DEFAULT_CAT;

// ── Asset Card ─────────────────────────────────────────────────────────────

const AssetCard = ({ asset, isSelected, isExpected, onSelect }) => {
  const cat = getCat(asset.category);
  const { Icon } = cat;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={() => onSelect(asset)}
      className={cn(
        "w-full text-left p-3.5 rounded-2xl border transition-all duration-200 group relative overflow-hidden",
        isSelected
          ? "border-amber-500 bg-amber-500/8 shadow-[0_0_16px_rgba(245,158,11,0.2)]"
          : isExpected
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]",
      )}
    >
      {isExpected && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-[7px] font-black text-emerald-400 uppercase tracking-widest">
          <Star className="w-2 h-2" /> Required
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border shrink-0",
            cat.bg,
            cat.border,
          )}
        >
          <Icon className={cn("w-4 h-4", cat.color)} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate pr-2">
            {asset.title || "Untitled"}
          </p>
          {(asset.credentials?.issuer || asset.credentials?.company) && (
            <p className="text-[10px] text-[#666] truncate">
              {asset.credentials.issuer || asset.credentials.company}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={cn(
                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                cat.bg,
                cat.border,
                cat.color,
              )}
            >
              {asset.category || "Asset"}
            </span>
            {asset.discotiveLearnId && (
              <span className="text-[8px] font-mono text-[#555] truncate max-w-[120px]">
                {asset.discotiveLearnId}
              </span>
            )}
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
          <Check className="w-3 h-3 text-black" />
        </div>
      )}
    </motion.button>
  );
};

// ── Upload Panel (inline mini-upload) ─────────────────────────────────────

const MAX_SIZE_MB = 25;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
];

const UploadPanel = ({ userId, onClose, onUploaded }) => {
  const [category, setCategory] = useState("Certificate");
  const [title, setTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    setError(null);
    if (!title.trim()) {
      setError("Asset title is required.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("File type not supported.");
      return;
    }

    setIsUploading(true);
    const assetId = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sRef = storageRef(storage, `vault/${userId}/${assetId}_${file.name}`);
    const task = uploadBytesResumable(sRef, file);

    task.on(
      "state_changed",
      (snap) =>
        setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
      (err) => {
        setError(err.message);
        setIsUploading(false);
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const newAsset = {
          id: assetId,
          title: title.trim(),
          type: file.type,
          category,
          credentials: {},
          size: file.size,
          hash: Math.abs(
            Array.from(file.name).reduce(
              (h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0,
              0,
            ),
          )
            .toString(16)
            .padStart(8, "0"),
          status: "PENDING",
          strength: null,
          uploadedAt: new Date().toISOString(),
          scoreYield: null,
          url,
          storagePath: sRef.fullPath,
          isPublic: false,
          discotiveLearnId: null,
        };

        await updateDoc(doc(db, "users", userId), {
          vault: arrayUnion(newAsset),
        });
        awardVaultUpload(userId).catch(() => {});
        onUploaded(newAsset);
        setIsUploading(false);
      },
    );
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/[0.06] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-white/40" />
        </button>
        <h3 className="text-sm font-black text-white">Upload New Asset</h3>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs font-bold text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      <div>
        <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
          Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Certificate",
            "Project",
            "Resume",
            "Employment",
            "Publication",
            "Link",
          ].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                category === c
                  ? `${getCat(c).bg} ${getCat(c).border} ${getCat(c).color}`
                  : "bg-[#0d0d0d] border-[#1a1a1a] text-[#555]",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
          Asset Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Google Cloud Certificate 2025"
          className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-colors placeholder-[#333]"
        />
      </div>

      {uploadProgress !== null ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#888]">
            <span>Uploading to vault...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      ) : (
        <div
          onClick={() => !isUploading && fileRef.current?.click()}
          className="border-2 border-dashed border-[#333] hover:border-amber-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all group"
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.zip"
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
          <UploadCloud className="w-8 h-8 text-[#555] group-hover:text-amber-500 transition-colors mx-auto mb-2" />
          <p className="text-xs font-bold text-[#888] group-hover:text-white transition-colors">
            Click to choose file
          </p>
          <p className="text-[9px] text-[#444] mt-1 uppercase tracking-widest">
            PDF, PNG, JPG, DOCX — Max {MAX_SIZE_MB}MB
          </p>
        </div>
      )}

      <p className="text-[9px] text-[#444] text-center">
        Asset will be sent for verification. Once verified, it can be synced to
        map nodes.
      </p>
    </div>
  );
};

// ── Main Modal ─────────────────────────────────────────────────────────────

const VaultSyncModal = ({
  isOpen,
  onClose,
  onSync,
  userId,
  vault = [],
  expectedLearnId = null,
}) => {
  const [activeTab, setActiveTab] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [localVault, setLocalVault] = useState(vault);

  // Sync vault prop changes
  useEffect(() => setLocalVault(vault), [vault]);

  // Only VERIFIED assets
  const verifiedAssets = useMemo(
    () => localVault.filter((a) => a.status === "VERIFIED"),
    [localVault],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return verifiedAssets.filter((a) => {
      const tabMatch = activeTab === "All" || a.category === activeTab;
      const searchMatch =
        !q ||
        (a.title || "").toLowerCase().includes(q) ||
        (a.credentials?.issuer || "").toLowerCase().includes(q) ||
        (a.discotiveLearnId || "").toLowerCase().includes(q);
      return tabMatch && searchMatch;
    });
  }, [verifiedAssets, activeTab, search]);

  const handleSync = () => {
    if (!selected) return;
    onSync({
      assetId: selected.id,
      assetTitle: selected.title,
      discotiveLearnId: selected.discotiveLearnId || null,
      category: selected.category,
      url: selected.url,
    });
    onClose();
  };

  const handleNewAssetUploaded = (newAsset) => {
    setLocalVault((prev) => [...prev, newAsset]);
    setShowUpload(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center sm:p-4 pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Sync vault asset"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-xl"
        />

        {/* Panel — bottom sheet on mobile, modal on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 280 }}
          className={cn(
            "relative w-full bg-[#060606] border border-[#1e1e1e] shadow-[0_60px_120px_rgba(0,0,0,0.95)] flex flex-col z-10",
            "rounded-t-[2rem] sm:rounded-[2rem]",
            "max-h-[92vh] sm:max-w-2xl sm:max-h-[85vh]",
          )}
        >
          {/* Drag handle (mobile) */}
          <div
            className="flex justify-center pt-3 pb-1 shrink-0 sm:hidden"
            aria-hidden
          >
            <div className="w-10 h-1 bg-[#333] rounded-full" />
          </div>

          <AnimatePresence mode="wait">
            {showUpload ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-y-auto custom-scrollbar"
              >
                <UploadPanel
                  userId={userId}
                  onClose={() => setShowUpload(false)}
                  onUploaded={handleNewAssetUploaded}
                />
              </motion.div>
            ) : (
              <motion.div
                key="explorer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] bg-[#050505] shrink-0 rounded-t-[2rem]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <FolderLock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">
                        Vault Sync
                      </h2>
                      <p className="text-[9px] text-[#555] uppercase tracking-widest">
                        {verifiedAssets.length} verified asset
                        {verifiedAssets.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-[#222] text-[10px] font-black text-[#888] hover:text-white hover:border-[#444] rounded-xl transition-all uppercase tracking-widest"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload New
                    </button>
                    <button
                      onClick={onClose}
                      className="w-9 h-9 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#666] hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="px-5 py-3 border-b border-[#111] shrink-0">
                  <div className="flex items-center bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-3 py-2.5 gap-2 focus-within:border-amber-500/40 transition-colors">
                    <Search className="w-4 h-4 text-[#555]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by title, issuer, or Learn ID..."
                      className="flex-1 bg-transparent text-sm text-white placeholder-[#333] focus:outline-none"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="text-[#444] hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-[#111] overflow-x-auto shrink-0 hide-scrollbar">
                  {VAULT_TABS.map((tab) => {
                    const count =
                      tab.key === "All"
                        ? verifiedAssets.length
                        : verifiedAssets.filter((a) => a.category === tab.key)
                            .length;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 -mb-px transition-all",
                          activeTab === tab.key
                            ? "border-amber-500 text-amber-400"
                            : "border-transparent text-[#555] hover:text-[#888]",
                        )}
                      >
                        {tab.label}
                        <span className="text-[8px] font-mono opacity-60">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Expected notice */}
                {expectedLearnId && (
                  <div className="mx-4 mt-3 p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl flex items-center gap-2 shrink-0">
                    <Star className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-[10px] font-bold text-emerald-400">
                      Assets marked{" "}
                      <span className="text-emerald-300">Required</span> match
                      the expected Learn ID for this node.
                    </p>
                  </div>
                )}

                {/* Asset Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ShieldCheck className="w-10 h-10 text-[#1a1a1a] mb-3" />
                      <p className="text-sm font-bold text-[#555]">
                        No verified assets found
                      </p>
                      <p className="text-[10px] text-[#333] mt-1 uppercase tracking-widest">
                        {verifiedAssets.length === 0
                          ? "Upload & verify assets in your vault"
                          : "Try a different search or category"}
                      </p>
                      <button
                        onClick={() => setShowUpload(true)}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/15 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Upload First Asset
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <AnimatePresence>
                        {filtered.map((asset) => (
                          <AssetCard
                            key={asset.id}
                            asset={asset}
                            isSelected={selected?.id === asset.id}
                            isExpected={
                              expectedLearnId &&
                              asset.discotiveLearnId === expectedLearnId
                            }
                            onSelect={setSelected}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3.5 border-t border-[#1a1a1a] bg-[#050505] shrink-0 flex items-center gap-3">
                  {selected && (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center border shrink-0",
                          getCat(selected.category).bg,
                          getCat(selected.category).border,
                        )}
                      >
                        {React.createElement(getCat(selected.category).Icon, {
                          className: cn(
                            "w-3 h-3",
                            getCat(selected.category).color,
                          ),
                        })}
                      </div>
                      <p className="text-xs font-bold text-white truncate">
                        {selected.title}
                      </p>
                    </div>
                  )}
                  {!selected && (
                    <p className="flex-1 text-[10px] text-[#555] uppercase tracking-widest">
                      Select an asset to sync
                    </p>
                  )}
                  <button
                    onClick={handleSync}
                    disabled={!selected}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" /> Sync to Node
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

export default VaultSyncModal;
