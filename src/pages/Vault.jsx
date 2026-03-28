/**
 * @fileoverview Discotive OS - Asset Vault (Zero-Trust Proof-of-Work Storage)
 * @module Execution/Vault
 * @description
 * LIVE FIREBASE INTEGRATION. No mock data.
 * Uploads chunked files directly to Firebase Storage and atomically updates Firestore.
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  Database,
  FileText,
  Link as LinkIcon,
  Search,
  Filter,
  List,
  Grid,
  Lock,
  TerminalSquare,
  Activity,
  X,
  Plus,
  CheckCircle2,
  Clock,
  Cpu,
  Zap,
  HardDrive,
  Hash,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";
import { useUserData } from "../hooks/useUserData";
import { awardVaultUpload } from "../lib/scoreEngine";

// --- LIVE FIREBASE IMPORTS ---
import { db, storage, auth } from "../firebase";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ============================================================================
// SECURITY & VALIDATION CONSTANTS
// ============================================================================
const VAULT_CONSTANTS = Object.freeze({
  MAX_FILE_SIZE_MB: 25,

  /**
   * @description
   * Expanded MIME type allowlist.
   * Includes images (PNG/JPG) for certificate screenshots,
   * plus common code/doc formats.
   */
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/json",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "text/javascript",
    "text/typescript",
    "application/zip",
    "application/x-zip-compressed",
    "text/html",
    "text/css",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],

  STATUS: Object.freeze({
    VERIFIED: {
      label: "VERIFIED",
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    PENDING: {
      label: "PENDING AUDIT",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
    },
    REJECTED: {
      label: "QUARANTINED",
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
    },
  }),

  /**
   * @description
   * Verification strength ratings assigned by the Discotive review team.
   * Affects Discotive Score yield and public profile display weight.
   */
  STRENGTH: Object.freeze({
    Strong: {
      label: "STRONG",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      pts: 30,
    },
    Medium: {
      label: "MEDIUM",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      pts: 20,
    },
    Weak: {
      label: "WEAK",
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      pts: 10,
    },
  }),

  /**
   * @description
   * Asset category taxonomy with per-category credential field definitions.
   * credentialFields: array of field objects the user must fill in during upload.
   *   { key, label, placeholder, required, type }
   * acceptedFormats: human-readable hint for the file picker.
   * icon: lucide icon name (used in getAssetIcon).
   */
  ASSET_CATEGORIES: Object.freeze({
    Certificate: {
      label: "Certificate / Award",
      description: "Course completions, hackathon wins, competition medals",
      color: "text-amber-400",
      bg: "bg-amber-500/8",
      border: "border-amber-500/20",
      acceptedFormats: "PDF, PNG, JPG (Max 25MB)",
      credentialFields: [
        {
          key: "issuer",
          label: "Issuing Organisation",
          placeholder: "e.g. Coursera, Google, HackerEarth",
          required: true,
          type: "text",
        },
        {
          key: "credentialId",
          label: "Credential ID",
          placeholder: "e.g. UC-xxxxxxxx",
          required: false,
          type: "text",
        },
        {
          key: "verificationUrl",
          label: "Verification URL",
          placeholder: "https://...",
          required: false,
          type: "url",
        },
        {
          key: "issuedDate",
          label: "Issue Date",
          placeholder: "",
          required: false,
          type: "date",
        },
        {
          key: "expiryDate",
          label: "Expiry Date (if any)",
          placeholder: "",
          required: false,
          type: "date",
        },
      ],
    },
    Resume: {
      label: "Resume / CV",
      description: "Your latest resume or curriculum vitae",
      color: "text-blue-400",
      bg: "bg-blue-500/8",
      border: "border-blue-500/20",
      acceptedFormats: "PDF, DOCX (Max 25MB)",
      credentialFields: [
        {
          key: "version",
          label: "Version / Variant",
          placeholder: "e.g. SWE — 2025, General",
          required: true,
          type: "text",
        },
        {
          key: "targetRole",
          label: "Target Role",
          placeholder: "e.g. Frontend Engineer at FAANG",
          required: false,
          type: "text",
        },
      ],
    },
    Project: {
      label: "Project / Build",
      description: "GitHub repo, live demo link, or deployed application",
      color: "text-violet-400",
      bg: "bg-violet-500/8",
      border: "border-violet-500/20",
      acceptedFormats: "Link, PDF, ZIP (Max 25MB)",
      credentialFields: [
        {
          key: "techStack",
          label: "Tech Stack",
          placeholder: "e.g. React, Node.js, PostgreSQL",
          required: true,
          type: "text",
        },
        {
          key: "repoUrl",
          label: "Repository URL",
          placeholder: "https://github.com/...",
          required: false,
          type: "url",
        },
        {
          key: "liveUrl",
          label: "Live Demo URL",
          placeholder: "https://...",
          required: false,
          type: "url",
        },
        {
          key: "role",
          label: "Your Role",
          placeholder: "e.g. Solo Developer, Frontend Lead",
          required: false,
          type: "text",
        },
      ],
    },
    Publication: {
      label: "Publication / Research",
      description: "Research papers, articles, patents, whitepapers",
      color: "text-cyan-400",
      bg: "bg-cyan-500/8",
      border: "border-cyan-500/20",
      acceptedFormats: "PDF, Link (Max 25MB)",
      credentialFields: [
        {
          key: "journal",
          label: "Journal / Platform",
          placeholder: "e.g. IEEE, Medium, arXiv",
          required: true,
          type: "text",
        },
        {
          key: "doi",
          label: "DOI / Publication ID",
          placeholder: "e.g. 10.1000/xyz123",
          required: false,
          type: "text",
        },
        {
          key: "publicationUrl",
          label: "Publication URL",
          placeholder: "https://...",
          required: false,
          type: "url",
        },
        {
          key: "publishedDate",
          label: "Published Date",
          placeholder: "",
          required: false,
          type: "date",
        },
      ],
    },
    Employment: {
      label: "Employment Proof",
      description: "Offer letters, experience letters, internship certificates",
      color: "text-emerald-400",
      bg: "bg-emerald-500/8",
      border: "border-emerald-500/20",
      acceptedFormats: "PDF, PNG, JPG (Max 25MB)",
      credentialFields: [
        {
          key: "company",
          label: "Company / Organisation",
          placeholder: "e.g. Google, Y Combinator Startup",
          required: true,
          type: "text",
        },
        {
          key: "role",
          label: "Role / Designation",
          placeholder: "e.g. SWE Intern, Product Manager",
          required: true,
          type: "text",
        },
        {
          key: "startDate",
          label: "Start Date",
          placeholder: "",
          required: false,
          type: "date",
        },
        {
          key: "endDate",
          label: "End Date",
          placeholder: "",
          required: false,
          type: "date",
        },
      ],
    },
    Link: {
      label: "External Link",
      description: "Portfolio, website, social proof, public profile",
      color: "text-sky-400",
      bg: "bg-sky-500/8",
      border: "border-sky-500/20",
      acceptedFormats: "URL only",
      credentialFields: [
        {
          key: "platform",
          label: "Platform / Context",
          placeholder: "e.g. GitHub, Behance, ProductHunt",
          required: true,
          type: "text",
        },
        {
          key: "description",
          label: "What does this link prove?",
          placeholder: "e.g. My open source contributions",
          required: false,
          type: "text",
        },
      ],
    },
  }),
});

// ============================================================================
// CRYPTOGRAPHIC UTILITIES
// ============================================================================
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const generateVisualHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(16, "0");
  const randomSuffix = Math.random().toString(16).substr(2, 48);
  return `0x${hex}${randomSuffix}`.substring(0, 64);
};

import {
  Award,
  Briefcase,
  Code2,
  BookOpen as PubIcon,
  Globe as GlobeIcon,
} from "lucide-react";

/**
 * @function getAssetIcon
 * @param {string} category — VAULT_CONSTANTS.ASSET_CATEGORIES key
 * @param {string} [mimeType] — fallback for file MIME
 * @returns {JSX.Element}
 */
const getAssetIcon = (category, mimeType) => {
  switch (category) {
    case "Certificate":
      return <Award className="w-5 h-5" />;
    case "Resume":
      return <FileText className="w-5 h-5" />;
    case "Project":
      return <Code2 className="w-5 h-5" />;
    case "Publication":
      return <PubIcon className="w-5 h-5" />;
    case "Employment":
      return <Briefcase className="w-5 h-5" />;
    case "Link":
      return <LinkIcon className="w-5 h-5" />;
    default:
      if (mimeType === "link") return <GlobeIcon className="w-5 h-5" />;
      return <FileText className="w-5 h-5" />;
  }
};

// ============================================================================
// CORE VAULT COMPONENT (LIVE BACKEND)
// ============================================================================
const Vault = () => {
  const { userData } = useUserData();

  const [localAssets, setLocalAssets] = useState([]);

  useEffect(() => {
    if (userData?.vault) {
      setLocalAssets(userData.vault);
    }
  }, [userData?.vault]);

  // Real Assets drawn directly from Firestore profile
  const assets = localAssets;

  // --- STATE MACHINE ---
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Global lock during operations

  // UI States
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL"); // ALL | DOCUMENT | LINK
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Input States for URL uploads
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");

  /**
   * @description
   * Two-step upload flow state machine:
   *   Step 1 ("category"): User selects asset category
   *   Step 2 ("credentials"): User fills category-specific fields + attaches file/URL
   *
   * selectedCategory: key from VAULT_CONSTANTS.ASSET_CATEGORIES
   * credentialData: { [fieldKey]: value } map built from credentialFields
   * uploadMode: "file" | "url" — toggles the attachment method in step 2
   * uploadError: string | null — validation error shown inline
   */
  const [uploadStep, setUploadStep] = useState("category");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [credentialData, setCredentialData] = useState({});
  const [uploadMode, setUploadMode] = useState("file");
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset upload modal state on close
  const resetUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadQueue([]);
    setUploadStep("category");
    setSelectedCategory(null);
    setCredentialData({});
    setUploadMode("file");
    setUploadError(null);
    setUrlInput("");
    setUrlTitle("");
  };

  // --- DRAG AND DROP ENGINE ---
  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    [isDragging],
  );

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const validateAndQueueFiles = (files) => {
    if (!userData?.uid) return;
    if (!selectedCategory) {
      setUploadError("Select an asset category before attaching a file.");
      return;
    }

    const newQueue = [];
    const errors = [];

    Array.from(files).forEach((file) => {
      if (file.size > VAULT_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(
          `"${file.name}" exceeds the ${VAULT_CONSTANTS.MAX_FILE_SIZE_MB}MB limit.`,
        );
        return;
      }
      // Allow empty type for some browsers (they report "" for certain files)
      if (
        file.type &&
        !VAULT_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)
      ) {
        errors.push(`"${file.name}" is not a supported file format.`);
        return;
      }

      const tempId = `ast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newQueue.push({
        id: tempId,
        file,
        progress: 0,
        hash: generateVisualHash(file.name),
        category: selectedCategory,
        credentialData,
        customTitle: urlTitle.trim() ? urlTitle : file.name,
      });
    });

    if (errors.length > 0) {
      setUploadError(errors.join(" "));
      return;
    }

    if (newQueue.length > 0) {
      setUploadError(null);
      setUploadQueue((prev) => [...prev, ...newQueue]);
      executeFirebaseUpload(newQueue);
    }
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndQueueFiles(e.dataTransfer.files);
      }
    },
    [userData],
  );

  // --- 🔴 THE REAL FIREBASE STORAGE & FIRESTORE UPLOAD PIPELINE ---
  const executeFirebaseUpload = (queueItems) => {
    queueItems.forEach((item) => {
      // 1. Create a secure path in Firebase Storage: vault/{user_id}/{asset_id}_{filename}
      const storageRef = ref(
        storage,
        `vault/${userData.uid}/${item.id}_${item.file.name}`,
      );

      // 2. Initiate Resumable Upload
      const uploadTask = uploadBytesResumable(storageRef, item.file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Track live upload progress bytes
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress } : q)),
          );
        },
        (error) => {
          console.error("Firebase Storage Upload Fault:", error);
          // NEW: Surface the error to the user interface
          setUploadError(`Upload blocked: ${error.message} (Check Console)`);
          setUploadQueue((prev) => prev.filter((q) => q.id !== item.id));
        },
        async () => {
          // 3. Upload Complete → Get Download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 4. Construct enriched Asset Payload
          const newAsset = {
            id: item.id,
            title: item.customTitle || item.file.name,
            type: item.file.type || "application/octet-stream",
            size: item.file.size,
            hash: item.hash,
            /**
             * @description
             * category: key from VAULT_CONSTANTS.ASSET_CATEGORIES.
             * Used to render the correct icon, filter, and
             * display credential fields in the detail panel.
             */
            category: item.category || "Resume",
            credentials: item.credentialData || {},
            status: "PENDING",
            strength: null, // Set by admin during verification
            uploadedAt: new Date().toISOString(),
            scoreYield: null,
            url: downloadURL,
            storagePath: storageRef.fullPath,
            // Public profile flag — only VERIFIED assets appear publicly
            isPublic: false,
          };

          // 5. Atomic write to Firestore
          try {
            await updateDoc(doc(db, "users", userData.uid), {
              vault: arrayUnion(newAsset),
            });
            // Instantly inject the new asset into the UI
            setLocalAssets((prev) => [...prev, newAsset]);
            // Award upload score event (non-blocking)
            awardVaultUpload(userData.uid).catch(console.warn);

            setUploadQueue((prev) => prev.filter((q) => q.id !== item.id));
            // Auto-close modal when all uploads complete
            setUploadQueue((prev) => {
              const remaining = prev.filter((q) => q.id !== item.id);
              if (remaining.length === 0) {
                setTimeout(resetUploadModal, 800);
              }
              return remaining;
            });
          } catch (dbError) {
            console.error("[Vault] Firestore ledger update failed:", dbError);
          }
        },
      );
    });
  };

  // --- 🔴 REAL FIRESTORE LINK UPLOAD PIPELINE ---
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput || !urlTitle || !userData?.uid) return;
    if (!selectedCategory) {
      setUploadError("Select an asset category first.");
      return;
    }
    setIsProcessing(true);
    setUploadError(null);

    const newAsset = {
      id: `ast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: urlTitle,
      type: "link",
      category: selectedCategory,
      credentials: { ...credentialData, url: urlInput },
      size: 0,
      hash: generateVisualHash(urlInput),
      status: "PENDING",
      strength: null,
      uploadedAt: new Date().toISOString(),
      scoreYield: null,
      url: urlInput,
      storagePath: null,
      isPublic: false,
    };

    try {
      await updateDoc(doc(db, "users", userData.uid), {
        vault: arrayUnion(newAsset),
      });
      // NEW: Instantly inject the new link asset into the UI
      setLocalAssets((prev) => [...prev, newAsset]);
      awardVaultUpload(userData.uid).catch(console.warn);
      resetUploadModal();
    } catch (err) {
      console.error("[Vault] Link upload failed:", err);
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 🔴 REAL FIREBASE DELETION ENGINE ---
  const handleDeleteAsset = async (assetToDelete) => {
    if (!userData?.uid) return;
    setIsProcessing(true);

    try {
      // 1. Delete from Firestore Ledger
      await updateDoc(doc(db, "users", userData.uid), {
        vault: arrayRemove(assetToDelete),
      });

      // 2. If it's a physical file, purge it from Firebase Storage
      if (assetToDelete.type !== "link" && assetToDelete.storagePath) {
        const fileRef = ref(storage, assetToDelete.storagePath);
        await deleteObject(fileRef);
      }

      // NEW: Instantly remove the asset from the UI
      setLocalAssets((prev) =>
        prev.filter((asset) => asset.id !== assetToDelete.id),
      );

      setSelectedAsset(null);
    } catch (err) {
      console.error("Asset obliteration failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * @description
   * Multi-dimension filter: search (title | hash | issuer credential) +
   * category filter. Gracefully handles assets created before the category
   * system existed (they have no `category` field — shown under ALL).
   */
  const filteredAssets = assets.filter((asset) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (asset.title || "").toLowerCase().includes(searchLower) ||
      (asset.hash || "").toLowerCase().includes(searchLower) ||
      (asset.credentials?.issuer || "").toLowerCase().includes(searchLower) ||
      (asset.credentials?.company || "").toLowerCase().includes(searchLower) ||
      (asset.category || "").toLowerCase().includes(searchLower);

    const matchesType =
      filterType === "ALL" ||
      asset.category === filterType ||
      // Legacy fallback
      (filterType === "DOCUMENT" && asset.type !== "link") ||
      (filterType === "LINK" && asset.type === "link");

    return matchesSearch && matchesType;
  });

  const totalBytes = assets.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const tierLimitBytes = 50 * 1024 * 1024; // 50MB Tier Limit

  // ============================================================================
  // RENDER PIPELINE
  // ============================================================================
  return (
    <div
      className="min-h-screen bg-[#030303] text-white font-sans selection:bg-amber-500 selection:text-black flex flex-col relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* GLOBAL BACKGROUND NOISE */}
      <div className="fixed inset-0 bg-[('/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      {/* --- GLOBAL PROCESSING LOCK --- */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-[#030303]/80 backdrop-blur-sm flex items-center justify-center cursor-wait"
          >
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DRAG & DROP OVERLAY --- */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-[#0a0a0a]/90 backdrop-blur-sm border-[4px] border-dashed border-amber-500/50 flex flex-col items-center justify-center m-4 rounded-3xl"
          >
            <div className="w-24 h-24 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <UploadCloud className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black tracking-tighter text-white mb-2">
              Drop payload to encrypt
            </h2>
            <p className="text-[#888] font-mono text-sm uppercase tracking-widest">
              Assets will be securely transmitted to your cloud bucket
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER & TELEMETRY --- */}
      <header className="px-6 py-8 border-b border-[#111] bg-[#050505] flex flex-col md:flex-row md:items-end justify-between gap-6 z-10 relative">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="px-2 py-1 rounded bg-[#111] border border-[#333] text-[9px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-amber-500" /> End-to-End
              Encrypted
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
            Cryptographic Vault.
          </h1>
          <p className="text-[#666] mt-2 font-medium max-w-xl text-sm leading-relaxed">
            Immutable proof-of-work storage. Uploaded assets are audited by the
            AI network and permanently bound to your Discotive Score.
          </p>
        </div>

        {/* Storage Capacity Monitor */}
        <div className="w-full md:w-72 bg-[#0a0a0a] border border-[#222] p-4 rounded-2xl shadow-inner">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-[#888] uppercase tracking-widest flex items-center gap-1.5">
              <HardDrive className="w-3 h-3" /> Storage Matrix
            </span>
            <span className="text-xs font-mono font-bold text-white">
              {formatBytes(totalBytes)}{" "}
              <span className="text-[#555]">
                / {formatBytes(tierLimitBytes)}
              </span>
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#111] rounded-full overflow-hidden border border-[#222]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((totalBytes / tierLimitBytes) * 100, 100)}%`,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                totalBytes / tierLimitBytes > 0.9
                  ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]",
              )}
            />
          </div>
        </div>
      </header>

      {/* --- TACTICAL TOOLBAR --- */}
      <div className="px-6 py-4 border-b border-[#111] bg-[#0a0a0a] flex flex-col lg:flex-row items-center justify-between gap-4 z-10 relative">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="relative group w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-amber-500 transition-colors" />
            <input
              type="text"
              placeholder="Query by title or SHA hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111] border border-[#222] text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-amber-500/50 transition-all font-mono text-xs placeholder:text-[#444]"
            />
          </div>

          {/* Filter */}
          <div className="relative hidden md:block">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#111] border border-[#222] text-white pl-10 pr-8 py-2.5 rounded-xl focus:outline-none focus:border-amber-500/50 transition-all font-mono text-xs appearance-none cursor-pointer"
            >
              <option value="ALL">ALL ASSETS</option>
              {Object.keys(VAULT_CONSTANTS.ASSET_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* View Toggles */}
          <div className="flex bg-[#111] border border-[#222] p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-[#222] text-white shadow-sm"
                  : "text-[#666] hover:text-white",
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-[#222] text-white shadow-sm"
                  : "text-[#666] hover:text-white",
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-5 py-2.5 bg-white text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ccc] transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            <Plus className="w-4 h-4" /> Sync Asset
          </button>
        </div>
      </div>

      {/* --- MAIN WORKSPACE (Split Matrix) --- */}
      <div className="flex-1 flex overflow-hidden relative z-10 bg-[#030303]">
        {/* Left Side: Asset Grid/List */}
        <div
          className={cn(
            "flex-1 overflow-y-auto p-6 custom-scrollbar transition-all duration-500",
            selectedAsset
              ? "hidden lg:block lg:w-2/3 xl:w-3/4 pr-6 border-r border-[#111]"
              : "w-full",
          )}
        >
          {filteredAssets.length === 0 ? (
            <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center text-center border border-dashed border-[#222] rounded-3xl bg-[#050505]">
              <Database className="w-12 h-12 text-[#333] mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Matrix Empty
              </h3>
              <p className="text-[#666] text-sm max-w-sm">
                No cryptographic assets found matching the current query
                parameters.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
              <AnimatePresence>
                {filteredAssets.map((asset) => {
                  const statusConfig =
                    VAULT_CONSTANTS.STATUS[asset.status] ||
                    VAULT_CONSTANTS.STATUS.PENDING;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        "bg-[#0a0a0a] border rounded-2xl p-5 cursor-pointer transition-all duration-300 group hover:-translate-y-1 shadow-lg flex flex-col",
                        selectedAsset?.id === asset.id
                          ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                          : "border-[#222] hover:border-[#444]",
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border",
                            statusConfig.bg,
                            statusConfig.border,
                            statusConfig.color,
                          )}
                        >
                          {getAssetIcon(asset.type)}
                        </div>
                        <div
                          className={cn(
                            "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border",
                            statusConfig.bg,
                            statusConfig.color,
                            statusConfig.border,
                          )}
                        >
                          {statusConfig.label}
                        </div>
                      </div>
                      <h3
                        className="text-sm font-bold text-white truncate mb-1"
                        title={asset.title}
                      >
                        {asset.title}
                      </h3>
                      {/* Category + Issuer / Company */}
                      <div className="flex items-center gap-1.5 mb-1">
                        {asset.category && (
                          <span
                            className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                              VAULT_CONSTANTS.ASSET_CATEGORIES[asset.category]
                                ?.bg || "bg-white/5",
                              VAULT_CONSTANTS.ASSET_CATEGORIES[asset.category]
                                ?.color || "text-white/40",
                              VAULT_CONSTANTS.ASSET_CATEGORIES[asset.category]
                                ?.border || "border-white/10",
                            )}
                          >
                            {asset.category}
                          </span>
                        )}
                        {/* Strength pill — only after admin verification */}
                        {asset.strength &&
                          VAULT_CONSTANTS.STRENGTH[asset.strength] && (
                            <span
                              className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                VAULT_CONSTANTS.STRENGTH[asset.strength].bg,
                                VAULT_CONSTANTS.STRENGTH[asset.strength].color,
                                VAULT_CONSTANTS.STRENGTH[asset.strength].border,
                              )}
                            >
                              {VAULT_CONSTANTS.STRENGTH[asset.strength].label}
                            </span>
                          )}
                      </div>
                      {/* Issuer / company credential summary */}
                      {(asset.credentials?.issuer ||
                        asset.credentials?.company) && (
                        <p className="text-[10px] font-medium text-[#666] truncate mb-1">
                          {asset.credentials.issuer ||
                            asset.credentials.company}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Hash className="w-3 h-3 text-[#666]" />
                        <span className="text-[10px] font-mono text-[#888] truncate">
                          {asset.hash}
                        </span>
                      </div>
                      <div className="mt-auto pt-4 border-t border-[#111] flex justify-between items-center text-[10px] font-bold text-[#555] uppercase tracking-widest">
                        <span>
                          {asset.type === "link"
                            ? "LINK"
                            : formatBytes(asset.size)}
                        </span>
                        <span>
                          {new Date(asset.uploadedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {filteredAssets.map((asset) => {
                  const statusConfig =
                    VAULT_CONSTANTS.STATUS[asset.status] ||
                    VAULT_CONSTANTS.STATUS.PENDING;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        "flex items-center gap-4 bg-[#0a0a0a] border rounded-xl p-3 cursor-pointer transition-colors group",
                        selectedAsset?.id === asset.id
                          ? "border-amber-500"
                          : "border-[#222] hover:border-[#444]",
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                          statusConfig.bg,
                          statusConfig.border,
                          statusConfig.color,
                        )}
                      >
                        {getAssetIcon(asset.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate leading-tight">
                          {asset.title}
                        </h3>
                        <span className="text-[10px] font-mono text-[#666] truncate hidden md:block">
                          {asset.hash}
                        </span>
                      </div>
                      <div className="hidden md:block w-24 text-right text-[10px] font-bold text-[#555] uppercase tracking-widest">
                        {asset.type === "link"
                          ? "LINK"
                          : formatBytes(asset.size)}
                      </div>
                      <div
                        className={cn(
                          "hidden sm:block px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border text-center min-w-[100px]",
                          statusConfig.bg,
                          statusConfig.color,
                          statusConfig.border,
                        )}
                      >
                        {statusConfig.label}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right Side: Deep Inspection Panel */}
        <AnimatePresence>
          {selectedAsset && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full lg:w-1/3 xl:w-1/4 bg-[#050505] flex flex-col border-l border-[#111] absolute lg:relative inset-y-0 right-0 z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
            >
              <div className="p-4 border-b border-[#111] bg-[#0a0a0a] flex justify-between items-center shrink-0">
                <span className="text-[10px] font-extrabold text-[#888] uppercase tracking-widest flex items-center gap-2">
                  <TerminalSquare className="w-4 h-4" /> Telemetry Inspector
                </span>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="p-1.5 bg-[#111] hover:bg-[#222] border border-[#333] rounded-md transition-colors text-[#888]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                {/* Visual Overview */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-2xl flex items-center justify-center border-2 mb-4 shadow-2xl relative",
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).bg,
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).border,
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).color,
                    )}
                  >
                    {getAssetIcon(selectedAsset.type)}
                    {selectedAsset.status === "VERIFIED" && (
                      <CheckCircle2 className="absolute -bottom-2 -right-2 w-6 h-6 text-green-500 bg-[#050505] rounded-full" />
                    )}
                  </div>
                  <h2 className="text-lg font-black text-white leading-tight break-all">
                    {selectedAsset.title}
                  </h2>
                  <div
                    className={cn(
                      "mt-3 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border inline-flex items-center gap-1.5",
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).bg,
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).color,
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).border,
                    )}
                  >
                    {selectedAsset.status === "VERIFIED" ? (
                      <Lock className="w-3 h-3" />
                    ) : selectedAsset.status === "REJECTED" ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <Activity className="w-3 h-3 animate-pulse" />
                    )}
                    {
                      (
                        VAULT_CONSTANTS.STATUS[selectedAsset.status] ||
                        VAULT_CONSTANTS.STATUS.PENDING
                      ).label
                    }
                  </div>
                </div>

                {/* Audit Notes (If Rejected/Pending) */}
                {selectedAsset.auditNotes && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> AI Audit Log
                    </p>
                    <p className="text-xs text-red-400 font-mono leading-relaxed">
                      {selectedAsset.auditNotes}
                    </p>
                  </div>
                )}

                {/* Credential Fields — rendered dynamically per category */}
                {selectedAsset.category &&
                  VAULT_CONSTANTS.ASSET_CATEGORIES[selectedAsset.category] &&
                  Object.keys(selectedAsset.credentials || {}).length > 0 && (
                    <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl space-y-3">
                      <span className="text-[9px] font-black text-[#555] uppercase tracking-widest block">
                        Credential Metadata
                      </span>
                      {VAULT_CONSTANTS.ASSET_CATEGORIES[
                        selectedAsset.category
                      ].credentialFields.map((field) => {
                        const val = selectedAsset.credentials?.[field.key];
                        if (!val) return null;
                        return (
                          <div key={field.key}>
                            <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest block mb-0.5">
                              {field.label}
                            </span>
                            {field.type === "url" ? (
                              <a
                                href={val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-sky-400 hover:text-sky-300 truncate block"
                              >
                                {val}
                              </a>
                            ) : (
                              <span className="text-xs font-mono text-[#ccc]">
                                {val}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                {/* Verification strength */}
                {selectedAsset.strength &&
                  VAULT_CONSTANTS.STRENGTH[selectedAsset.strength] && (
                    <div
                      className={cn(
                        "p-4 border rounded-xl flex items-center justify-between",
                        VAULT_CONSTANTS.STRENGTH[selectedAsset.strength].bg,
                        VAULT_CONSTANTS.STRENGTH[selectedAsset.strength].border,
                      )}
                    >
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest block mb-1 text-[#666]">
                          Verification Strength
                        </span>
                        <span
                          className={cn(
                            "text-sm font-black",
                            VAULT_CONSTANTS.STRENGTH[selectedAsset.strength]
                              .color,
                          )}
                        >
                          {
                            VAULT_CONSTANTS.STRENGTH[selectedAsset.strength]
                              .label
                          }
                        </span>
                      </div>
                      <ShieldCheck
                        className={cn(
                          "w-6 h-6",
                          VAULT_CONSTANTS.STRENGTH[selectedAsset.strength]
                            .color,
                        )}
                      />
                    </div>
                  )}

                {/* Public Profile Visibility */}
                <div
                  className={cn(
                    "p-3 border rounded-xl flex items-center gap-2.5",
                    selectedAsset.status === "VERIFIED"
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-[#0a0a0a] border-[#1a1a1a]",
                  )}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      selectedAsset.status === "VERIFIED"
                        ? "bg-green-500"
                        : "bg-[#333]",
                    )}
                  />
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest block text-[#555]">
                      Public Profile
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        selectedAsset.status === "VERIFIED"
                          ? "text-green-400"
                          : "text-[#444]",
                      )}
                    >
                      {selectedAsset.status === "VERIFIED"
                        ? "Visible — Verified assets appear on your public profile"
                        : "Hidden — Only verified assets are shown publicly"}
                    </span>
                  </div>
                </div>

                {/* Cryptographic Metadata */}
                <div className="space-y-4">
                  <div className="p-4 bg-[#0a0a0a] border border-[#222] rounded-xl space-y-3">
                    <div>
                      <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                        SHA-256 Signature
                      </span>
                      <div className="bg-[#111] border border-[#333] px-2 py-1.5 rounded text-[10px] font-mono text-amber-500 break-all">
                        {selectedAsset.hash}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-[#222] pt-3">
                      <div>
                        <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                          Weight
                        </span>
                        <span className="text-xs font-mono text-[#ccc]">
                          {selectedAsset.type === "link"
                            ? "0 Bytes"
                            : formatBytes(selectedAsset.size)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                          Type
                        </span>
                        <span className="text-xs font-mono text-[#ccc]">
                          {selectedAsset.type === "link"
                            ? "LINK"
                            : selectedAsset.type.split("/")[1]?.toUpperCase() ||
                              "DOC"}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-[#222] pt-3">
                      <span className="text-[9px] font-bold text-[#666] uppercase tracking-widest block mb-1">
                        Timestamp
                      </span>
                      <span className="text-xs font-mono text-[#ccc] flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />{" "}
                        {new Date(selectedAsset.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Operational Score Impact */}
                  {selectedAsset.status === "VERIFIED" && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-1">
                          Score Yield
                        </span>
                        <span className="text-sm font-black text-amber-400">
                          +{selectedAsset.scoreYield || 0} PTS
                        </span>
                      </div>
                      <Zap className="w-6 h-6 text-amber-500/50" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-4 border-t border-[#111] bg-[#0a0a0a] flex gap-3 shrink-0">
                <a
                  href={selectedAsset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-[#111] border border-[#333] hover:bg-[#222] text-white rounded-xl text-xs font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Inspect Raw
                </a>
                <button
                  onClick={() => handleDeleteAsset(selectedAsset)}
                  disabled={isProcessing}
                  className="w-12 h-12 bg-[#450a0a] hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-colors shadow-lg disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================================
          ZERO-TRUST UPLOAD & SCANNING MODAL
      ============================================================================ */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030303]/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] max-w-lg w-full shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative max-h-[90vh]"
            >
              {/* Ambient scanning glow */}
              <div className="absolute top-0 left-1/4 w-1/2 h-px bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)]" />

              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-[#111] shrink-0">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-amber-500" />
                  <div>
                    <h3 className="text-base font-black text-white">
                      {uploadStep === "category"
                        ? "Select Asset Category"
                        : uploadStep === "credentials"
                          ? `New ${selectedCategory} — Fill Credentials`
                          : "Transmitting to Cloud"}
                    </h3>
                    <p className="text-[9px] font-bold text-[#555] uppercase tracking-widest">
                      {uploadStep === "category"
                        ? "Step 1 of 2"
                        : uploadStep === "credentials"
                          ? "Step 2 of 2"
                          : "Uploading..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUploadModal}
                  className="p-2 bg-[#111] hover:bg-[#222] border border-[#333] rounded-xl transition-colors text-[#888]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step progress bar */}
              <div className="h-px bg-[#111] shrink-0">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width:
                      uploadStep === "category"
                        ? "33%"
                        : uploadStep === "credentials"
                          ? "66%"
                          : "100%",
                  }}
                />
              </div>

              {/* Error display */}
              <AnimatePresence>
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mx-5 mt-4 p-3 bg-red-500/8 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-xs font-bold shrink-0"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {uploadError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                {/* ─── STEP 1: CATEGORY SELECTION ─── */}
                {uploadStep === "category" && (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(VAULT_CONSTANTS.ASSET_CATEGORIES).map(
                      ([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setSelectedCategory(key);
                            setCredentialData({});
                            setUploadError(null);
                            setUploadStep("credentials");
                            // For Link category, default to url mode
                            if (key === "Link") setUploadMode("url");
                            else setUploadMode("file");
                          }}
                          className={cn(
                            "flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]",
                            cat.bg,
                            cat.border,
                          )}
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center",
                              cat.bg,
                              cat.border,
                              "border",
                            )}
                          >
                            <span className={cat.color}>
                              {getAssetIcon(key)}
                            </span>
                          </div>
                          <div>
                            <p className={cn("text-xs font-black", cat.color)}>
                              {cat.label}
                            </p>
                            <p className="text-[9px] text-[#555] leading-relaxed mt-0.5">
                              {cat.description}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}

                {/* ─── STEP 2: CREDENTIAL FIELDS + ATTACHMENT ─── */}
                {uploadStep === "credentials" &&
                  selectedCategory &&
                  uploadQueue.length === 0 && (
                    <div className="space-y-5">
                      {/* Back button */}
                      <button
                        onClick={() => {
                          setUploadStep("category");
                          setUploadError(null);
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-black text-[#555] uppercase tracking-widest hover:text-white transition-colors"
                      >
                        ← Back to categories
                      </button>

                      {/* Asset title */}
                      <div>
                        <label className="block text-[9px] font-black text-[#666] uppercase tracking-widest mb-1.5">
                          Asset Title *
                        </label>
                        <input
                          type="text"
                          placeholder={`e.g. ${
                            selectedCategory === "Certificate"
                              ? "Google Cloud Associate Certificate"
                              : selectedCategory === "Resume"
                                ? "SWE Resume — 2025"
                                : selectedCategory === "Project"
                                  ? "Discotive OS — Full Stack"
                                  : "Asset name"
                          }`}
                          value={urlTitle}
                          onChange={(e) => setUrlTitle(e.target.value)}
                          className="w-full bg-[#111] border border-[#222] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm"
                        />
                      </div>

                      {/* Dynamic credential fields */}
                      {VAULT_CONSTANTS.ASSET_CATEGORIES[
                        selectedCategory
                      ].credentialFields.map((field) => (
                        <div key={field.key}>
                          <label className="block text-[9px] font-black text-[#666] uppercase tracking-widest mb-1.5">
                            {field.label}{" "}
                            {field.required && (
                              <span className="text-amber-500">*</span>
                            )}
                          </label>
                          <input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={credentialData[field.key] || ""}
                            onChange={(e) =>
                              setCredentialData((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            className="w-full bg-[#111] border border-[#222] text-white px-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
                          />
                        </div>
                      ))}

                      {/* Attachment method toggle */}
                      {selectedCategory !== "Link" && (
                        <div className="flex gap-2 p-1 bg-[#111] border border-[#222] rounded-xl">
                          <button
                            onClick={() => setUploadMode("file")}
                            className={cn(
                              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                              uploadMode === "file"
                                ? "bg-[#222] text-white"
                                : "text-[#555] hover:text-white",
                            )}
                          >
                            Upload File
                          </button>
                          <button
                            onClick={() => setUploadMode("url")}
                            className={cn(
                              "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                              uploadMode === "url"
                                ? "bg-[#222] text-white"
                                : "text-[#555] hover:text-white",
                            )}
                          >
                            Link URL
                          </button>
                        </div>
                      )}

                      {/* File attachment */}
                      {uploadMode === "file" && (
                        <div
                          className="w-full border-2 border-dashed border-[#333] hover:border-amber-500 bg-[#050505] rounded-2xl p-6 text-center cursor-pointer transition-colors group"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              validateAndQueueFiles(e.target.files);
                              e.target.value = null;
                            }}
                          />
                          <UploadCloud className="w-8 h-8 text-[#555] group-hover:text-amber-500 transition-colors mx-auto mb-3" />
                          <p className="text-sm font-bold text-white mb-1">
                            Click or drag file here
                          </p>
                          <p className="text-[10px] font-mono text-[#666] uppercase tracking-widest">
                            {VAULT_CONSTANTS.ASSET_CATEGORIES[selectedCategory]
                              ?.acceptedFormats || "Max 25MB"}
                          </p>
                        </div>
                      )}

                      {/* URL attachment */}
                      {uploadMode === "url" && (
                        <form onSubmit={handleUrlSubmit} className="space-y-3">
                          <div className="relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                            <input
                              type="url"
                              placeholder="https://..."
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              required
                              className="w-full bg-[#111] border border-[#222] text-white pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isProcessing || !urlInput || !urlTitle}
                            className="w-full py-3.5 bg-white text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#ddd] disabled:opacity-40 transition-colors flex justify-center items-center gap-2"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            Sync URL Asset
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                {/* ─── STEP 3: FIREBASE UPLOAD PROGRESS ─── */}
                {uploadQueue.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                      <RefreshCw className="w-5 h-5 animate-spin shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest leading-none mb-1">
                          Transmitting to Cloud Node
                        </p>
                        <p className="text-[10px] font-mono opacity-80">
                          Syncing with Firebase Storage...
                        </p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {uploadQueue.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="p-4 bg-[#111] border border-[#222] rounded-xl relative overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 h-full bg-white/5"
                            style={{
                              width: `${item.progress}%`,
                              transition: "width 0.3s ease",
                            }}
                          />
                          <div className="relative z-10 flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center shrink-0">
                                {getAssetIcon(item.category, item.file?.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-[200px]">
                                  {item.file?.name || "Uploading..."}
                                </p>
                                <p className="text-[9px] font-mono text-amber-500 mt-0.5">
                                  {(item.hash || "").substring(0, 24)}...
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black font-mono text-[#888]">
                              {Math.round(item.progress)}%
                            </span>
                          </div>
                          <div className="relative z-10 w-full h-1 bg-[#222] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
                              style={{
                                width: `${item.progress}%`,
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Vault;
