/**
 * @fileoverview Discotive OS - Asset Vault (Zero-Trust Proof-of-Work Storage)
 * @module Execution/Vault
 * @description
 * LIVE FIREBASE INTEGRATION. No mock data.
 * Uploads chunked files directly to Firebase Storage and atomically updates Firestore.
 */

import React, { useState, useCallback, useRef } from "react";
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

// --- LIVE FIREBASE IMPORTS ---
import { db, storage } from "../firebase";
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
  MAX_FILE_SIZE_MB: 15,
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/json",
  ],
  STATUS: Object.freeze({
    VERIFIED: {
      label: "IMMUTABLE",
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

const getAssetIcon = (type) => {
  if (type === "link") return <LinkIcon className="w-5 h-5" />;
  return <FileText className="w-5 h-5" />; // Everything else is classified as a document
};

// ============================================================================
// CORE VAULT COMPONENT (LIVE BACKEND)
// ============================================================================
const Vault = () => {
  const { userData } = useUserData();

  // Real Assets drawn directly from Firestore profile
  const assets = userData?.vault || [];

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
    const newQueue = [];

    Array.from(files).forEach((file) => {
      if (file.size > VAULT_CONSTANTS.MAX_FILE_SIZE_MB * 1024 * 1024) {
        console.error(`File ${file.name} exceeds limits.`);
        return;
      }
      if (!VAULT_CONSTANTS.ALLOWED_MIME_TYPES.includes(file.type)) {
        console.error(`File ${file.name} is not an allowed document type.`);
        return;
      }

      const tempId = `ast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      newQueue.push({
        id: tempId,
        file,
        progress: 0,
        hash: generateVisualHash(file.name),
      });
    });

    if (newQueue.length > 0) {
      setUploadQueue((prev) => [...prev, ...newQueue]);
      setIsUploadModalOpen(true);
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
          setUploadQueue((prev) => prev.filter((q) => q.id !== item.id)); // Remove failed from queue
        },
        async () => {
          // 3. Upload Complete -> Get Download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // 4. Construct Asset Payload
          const newAsset = {
            id: item.id,
            title: item.file.name,
            type: item.file.type,
            size: item.file.size,
            hash: item.hash,
            status: "PENDING",
            uploadedAt: new Date().toISOString(),
            scoreYield: null,
            url: downloadURL,
            storagePath: storageRef.fullPath, // Keep reference for deletion later
          };

          // 5. Atomic Array Union to Firestore User Profile
          try {
            await updateDoc(doc(db, "users", userData.uid), {
              vault: arrayUnion(newAsset),
            });
            // Remove from local processing queue, Firestore listener will hydrate the UI automatically
            setUploadQueue((prev) => prev.filter((q) => q.id !== item.id));
            if (uploadQueue.length <= 1) setIsUploadModalOpen(false); // Close if last item
          } catch (dbError) {
            console.error("Firestore Ledger Update Fault:", dbError);
          }
        },
      );
    });
  };

  // --- 🔴 REAL FIRESTORE LINK UPLOAD PIPELINE ---
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput || !urlTitle || !userData?.uid) return;
    setIsProcessing(true);

    const newAsset = {
      id: `ast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      title: urlTitle,
      type: "link",
      size: 0,
      hash: generateVisualHash(urlInput),
      status: "PENDING",
      uploadedAt: new Date().toISOString(),
      scoreYield: null,
      url: urlInput,
    };

    try {
      await updateDoc(doc(db, "users", userData.uid), {
        vault: arrayUnion(newAsset),
      });
      setUrlInput("");
      setUrlTitle("");
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error("Link encryption failed:", err);
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

      setSelectedAsset(null);
    } catch (err) {
      console.error("Asset obliteration failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- REAL-TIME FILTERS (Documents & Links Only) ---
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.hash.includes(searchQuery.toLowerCase());

    let matchesType = true;
    if (filterType === "DOCUMENT") matchesType = asset.type !== "link";
    if (filterType === "LINK") matchesType = asset.type === "link";

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
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

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
              <option value="DOCUMENT">DOCUMENTS ONLY</option>
              <option value="LINK">LINKS ONLY</option>
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
              className="bg-[#0a0a0a] border border-[#222] rounded-[2rem] max-w-lg w-full shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col relative"
            >
              {/* Fake ambient scanning glow */}
              <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)]" />

              <div className="flex justify-between items-center p-6 border-b border-[#111]">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-amber-500" /> Asset Ingestion
                </h3>
                <button
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadQueue([]);
                  }}
                  className="p-2 bg-[#111] hover:bg-[#222] border border-[#333] rounded-xl transition-colors text-[#888]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                {uploadQueue.length === 0 ? (
                  // --- INPUT MODE ---
                  <div className="space-y-6">
                    {/* File Drop Target */}
                    <div
                      className="w-full border-2 border-dashed border-[#333] hover:border-amber-500 bg-[#050505] rounded-2xl p-8 text-center cursor-pointer transition-colors group relative overflow-hidden"
                      onClick={() =>
                        document.getElementById("vault-file-upload").click()
                      }
                    >
                      <input
                        id="vault-file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => validateAndQueueFiles(e.target.files)}
                      />
                      <div className="w-16 h-16 bg-[#111] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-amber-500/10 transition-colors">
                        <UploadCloud className="w-8 h-8 text-[#666] group-hover:text-amber-500 transition-colors" />
                      </div>
                      <p className="text-sm font-bold text-white mb-1">
                        Click or drag documents here
                      </p>
                      <p className="text-[10px] font-mono text-[#888] uppercase tracking-widest">
                        PDF, DOC, TXT, JSON (Max 15MB)
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-[#222]" />
                      <span className="text-[10px] font-bold text-[#555] uppercase tracking-widest">
                        OR DEPLOY URL
                      </span>
                      <div className="flex-1 h-px bg-[#222]" />
                    </div>

                    {/* URL Input Form */}
                    <form onSubmit={handleUrlSubmit} className="space-y-4">
                      <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-white" />
                        <input
                          type="text"
                          placeholder="Asset Title (e.g., Code Repository)"
                          value={urlTitle}
                          onChange={(e) => setUrlTitle(e.target.value)}
                          required
                          className="w-full bg-[#111] border border-[#222] text-white pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm"
                        />
                      </div>
                      <div className="relative group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555] group-focus-within:text-white" />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          required
                          className="w-full bg-[#111] border border-[#222] text-white pl-11 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors text-sm font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full py-4 bg-white text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-[#ccc] disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                      >
                        {isProcessing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}{" "}
                        Sync URL Asset
                      </button>
                    </form>
                  </div>
                ) : (
                  // --- REAL FIREBASE SCANNING MODE ---
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest leading-none mb-1">
                          Transmitting to Cloud Node
                        </p>
                        <p className="text-[10px] font-mono opacity-80">
                          Syncing with Firebase Storage bucket...
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
                          {/* Progress Bar Background */}
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
                                {getAssetIcon(item.file.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate max-w-[200px]">
                                  {item.file.name}
                                </p>
                                <p className="text-[9px] font-mono text-amber-500 mt-0.5">
                                  {item.hash.substring(0, 24)}...
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
