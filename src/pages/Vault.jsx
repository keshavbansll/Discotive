import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, auth, storage } from "../firebase";
import { useUserData } from "../hooks/useUserData";
import emailjs from "@emailjs/browser";
import {
  FolderLock,
  UploadCloud,
  ShieldCheck,
  Github,
  FileText,
  Plus,
  Activity,
  Search,
  Filter,
  Terminal,
  ShieldAlert,
  Cpu,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Check,
  X,
  Upload,
  FileImage,
  FileIcon,
  AlertCircle,
  Lock,
  HardDrive,
  Eye,
} from "lucide-react";
import { cn } from "../components/ui/BentoCard";

// --- BACKGROUND ENGINE ---
const BackgroundScanner = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <motion.div
      initial={{ top: "-10%" }}
      animate={{ top: "110%" }}
      transition={{ duration: 8, ease: "linear", repeat: Infinity }}
      className="absolute left-0 right-0 h-[1px] bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
    />
  </div>
);

// --- UTILITIES ---
const getFileIcon = (fileName, className = "w-12 h-12") => {
  if (!fileName)
    return <FileText className={cn(className, "text-slate-500")} />;
  const ext = fileName.split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "svg"].includes(ext))
    return <FileImage className={cn(className, "text-blue-400")} />;
  if (ext === "pdf")
    return <FileIcon className={cn(className, "text-red-500")} />;
  return <FileText className={cn(className, "text-slate-400")} />;
};

const formatBytes = (bytes) => {
  if (!+bytes) return "0 B";
  const k = 1024,
    i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["B", "KB", "MB", "GB"][i]}`;
};

// --- MAIN COMPONENT ---
const Vault = () => {
  const { userData, loading: userLoading } = useUserData();

  // -- Real Data States --
  const [assets, setAssets] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // -- UI States --
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [previewAsset, setPreviewAsset] = useState(null);
  const [menuOpenAssetId, setMenuOpenAssetId] = useState(null);
  const [renamingAsset, setRenamingAsset] = useState(null); // { id, title }
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);

  // -- Deployment Modal State --
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // -- Form Data --
  const [file, setFile] = useState(null);
  const [assetName, setAssetName] = useState("");
  const [assetCategory, setAssetCategory] = useState("");
  const [credentialId, setCredentialId] = useState("");
  const [verificationLink, setVerificationLink] = useState("");
  const [assetNote, setAssetNote] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const FREE_TIER_LIMIT = 5;
  const ASSET_CATEGORIES = [
    "Certificate",
    "Pitch Deck",
    "Resume",
    "Blueprint",
    "Media",
    "Other",
  ];

  // --- 1. REAL-TIME DATABASE SYNC ---
  useEffect(() => {
    const uid = auth.currentUser?.uid || userData?.id;
    if (!uid) return;

    const unsubscribe = onSnapshot(
      collection(db, "users", uid, "vault"),
      (snapshot) => {
        const fetched = [];
        snapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() }));
        // Sort newest first
        setAssets(
          fetched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        );
        setIsFetching(false);
      },
    );

    return () => unsubscribe();
  }, [userData?.id]);

  // --- 2. GLOBAL LISTENERS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (previewAsset) setPreviewAsset(null);
        else if (isUploadModalOpen && uploadStep !== 3) closeModal();
        else {
          setSelectedAssetId(null);
          setMenuOpenAssetId(null);
          setRenamingAsset(null);
        }
      }
    };
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpenAssetId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadModalOpen, uploadStep, previewAsset]);

  const showToast = (message, type = "green") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- 3. DYNAMIC VAULT STRENGTH ENGINE ---
  const calculateVaultStrength = () => {
    if (assets.length === 0)
      return {
        label: "Empty",
        class: "text-[#666] bg-[#111]",
        bar: "w-0 bg-[#333]",
      };
    let score = 0;
    assets.forEach((a) => {
      if (a.status === "Verified") {
        if (a.strength === "Strong") score += 3;
        else if (a.strength === "Medium") score += 2;
        else score += 1; // Weak or default verified
      }
    });

    if (score === 0)
      return {
        label: "Unverified",
        class: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        bar: "w-1/12 bg-amber-500 animate-pulse",
      };
    if (score <= 2)
      return {
        label: "Fragile",
        class: "text-red-400 bg-red-500/10 border-red-500/30",
        bar: "w-1/4 bg-red-400",
      };
    if (score <= 5)
      return {
        label: "Solid",
        class: "text-blue-400 bg-blue-500/10 border-blue-500/30",
        bar: "w-2/4 bg-blue-400",
      };
    if (score <= 9)
      return {
        label: "Formidable",
        class:
          "text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]",
        bar: "w-3/4 bg-purple-400",
      };
    return {
      label: "Ironclad",
      class:
        "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_30px_rgba(251,191,36,0.4)]",
      bar: "w-full bg-amber-400",
    };
  };
  const vaultStrength = calculateVaultStrength();

  // --- 4. UPLOAD & VERIFICATION PIPELINE ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError("");
    const droppedFile = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (!droppedFile) return;
    if (droppedFile.size > MAX_FILE_SIZE)
      return setUploadError(
        `Protocol Rejected: File exceeds 2MB limit. (${formatBytes(droppedFile.size)})`,
      );
    setFile(droppedFile);
    if (!assetName) setAssetName(droppedFile.name.split(".")[0]);
  };

  const startUpload = async () => {
    const uid = auth.currentUser?.uid || userData?.id;
    if (!uid) return setUploadError("Authentication required.");
    if (!file || !assetName || !assetCategory)
      return setUploadError("Asset Name and Category required.");
    if (assets.length >= FREE_TIER_LIMIT)
      return setUploadError(
        `Storage Limit Reached: Free tier max is ${FREE_TIER_LIMIT}. Upgrade to Pro.`,
      );

    setUploadError("");
    setUploadStep(3);

    try {
      // 1. Upload to Firebase Storage
      const fileId = `asset_${Date.now()}`;
      const storageRef = ref(
        storage,
        `users/${uid}/vault/${fileId}_${file.name}`,
      );
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) =>
          setUploadProgress(
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 90),
          ), // Stop at 90% for DB save
        (error) => {
          console.error(error);
          setUploadError("Storage upload failed.");
          setUploadStep(2);
        },
        async () => {
          // 2. Get URL and Save to Firestore
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newDocRef = doc(collection(db, "users", uid, "vault"));

          await setDoc(newDocRef, {
            title: assetName,
            category: assetCategory,
            note: assetNote,
            fileName: file.name,
            fileType: file.type,
            size: file.size,
            fileUrl: downloadURL,
            storagePath: storageRef.fullPath,
            status: "Pending Scan",
            credentialId,
            verificationLink,
            createdAt: new Date().toISOString(),
          });

          setUploadProgress(100);

          // 3. Fire EmailJS Payload to Admin
          emailjs.send(
            "discotive",
            "verifyasset",
            {
              user_name: `${userData?.identity?.firstName} ${userData?.identity?.lastName}`,
              user_handle: `@${userData?.identity?.username}`,
              discotive_id: uid,
              asset_id: newDocRef.id,
              asset_name: assetName,
              asset_category: assetCategory,
              credential_id: credentialId || "N/A",
              verification_link: verificationLink || "N/A",
              execution_note: assetNote || "N/A",
              file_url: downloadURL,
            },
            "tNizhqFNon4v2m6OC", // YOUR PUBLIC KEY
          );

          setTimeout(() => {
            closeModal();
            showToast("Asset deployed & sent for verification.");
          }, 1000);
        },
      );
    } catch (err) {
      console.error(err);
      setUploadError("Fatal error during deployment.");
      setUploadStep(2);
    }
  };

  const closeModal = () => {
    setIsUploadModalOpen(false);
    setTimeout(() => {
      setUploadStep(1);
      setFile(null);
      setUploadError("");
      setAssetName("");
      setAssetNote("");
      setAssetCategory("");
      setCredentialId("");
      setVerificationLink("");
      setUploadProgress(0);
      setIsDragging(false);
    }, 300);
  };

  // --- 5. DRIVE ACTIONS ---
  const handleRenameSubmit = async (e, assetId) => {
    e.preventDefault();
    if (!renamingAsset.title.trim()) return;
    const uid = auth.currentUser?.uid || userData?.id;
    await updateDoc(doc(db, "users", uid, "vault", assetId), {
      title: renamingAsset.title,
    });
    setRenamingAsset(null);
    showToast("Asset renamed.", "grey");
  };

  const handleDeleteAsset = async (asset) => {
    if (!window.confirm(`Obliterate "${asset.title}" permanently?`)) return;
    const uid = auth.currentUser?.uid || userData?.id;
    setMenuOpenAssetId(null);

    try {
      // 1. Delete from Storage
      if (asset.storagePath) {
        await deleteObject(ref(storage, asset.storagePath));
      }
      // 2. Delete from Firestore
      await deleteDoc(doc(db, "users", uid, "vault", asset.id));
      showToast("Asset obliterated.", "red");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete asset.", "red");
    }
  };

  const handleDownload = (asset) => {
    setMenuOpenAssetId(null);
    window.open(asset.fileUrl, "_blank");
    showToast("Download initiated.", "grey");
  };

  // --- RENDER ---
  const totalStorageBytes = assets.reduce(
    (acc, curr) => acc + (curr.size || 0),
    0,
  );

  if (isFetching || userLoading)
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Activity className="w-6 h-6 text-[#666] animate-spin" />
      </div>
    );

  return (
    <div
      className="bg-[#030303] min-h-screen text-white selection:bg-white selection:text-black pb-32 relative font-sans"
      onClick={() => setSelectedAssetId(null)}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />
      <BackgroundScanner />

      <div className="max-w-[1400px] mx-auto px-4 md:px-12 relative z-10 pt-8 md:pt-12 space-y-12 md:space-y-16">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-7xl font-extrabold tracking-tighter text-white mb-2 leading-none"
            >
              Asset Vault.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[#888] font-medium text-sm md:text-xl tracking-tight"
            >
              Immutable proof of work. Sync your execution ledger.
            </motion.p>
          </div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsUploadModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 md:gap-3 bg-white text-black px-6 md:px-8 py-3 md:py-4 rounded-full font-extrabold text-xs md:text-sm hover:bg-[#ccc] transition-colors shadow-[0_0_40px_rgba(255,255,255,0.15)] group shrink-0"
          >
            <UploadCloud className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-y-1 transition-transform" />{" "}
            Sync New Asset
          </motion.button>
        </div>

        {/* TELEMETRY STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-5 md:p-8 hover:border-[#444] transition-colors"
          >
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 md:mb-4">
              Total Assets
            </p>
            <p className="text-3xl md:text-5xl font-extrabold tracking-tighter">
              {assets.length}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-5 md:p-8 hover:border-green-500/30 transition-colors group"
          >
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 md:mb-4 flex items-center gap-1.5 group-hover:text-green-500 transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified
            </p>
            <p className="text-3xl md:text-5xl font-extrabold tracking-tighter group-hover:text-green-400 transition-colors">
              {assets.filter((a) => a.status === "Verified").length}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-5 md:p-8 hover:border-[#444] transition-colors"
          >
            <p className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-2 md:mb-4 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" /> Storage
            </p>
            <p className="text-3xl md:text-5xl font-extrabold tracking-tighter">
              {formatBytes(totalStorageBytes)}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] p-5 md:p-8 relative overflow-hidden flex flex-col justify-between"
          >
            <p className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2 md:mb-4 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Vault Strength
            </p>
            <div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs md:text-sm font-extrabold uppercase tracking-widest mb-3 transition-all",
                  vaultStrength.class,
                )}
              >
                {vaultStrength.label}
              </div>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000",
                    vaultStrength.bar,
                  )}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* DRIVE-STYLE GRID */}
        <div className="pt-8 border-t border-[#222]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-extrabold tracking-tight">
              Verified Archives
            </h3>
            <div className="flex items-center bg-[#0a0a0a] rounded-xl px-4 py-2.5 border border-[#222] focus-within:border-[#555] transition-colors w-full sm:w-72 group">
              <Search className="w-4 h-4 text-[#444] group-focus-within:text-white shrink-0" />
              <input
                type="text"
                placeholder="Search vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs px-3 text-white placeholder-[#444] font-medium"
              />
            </div>
          </div>

          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUploadModalOpen(true);
                }}
                className="bg-transparent border-2 border-dashed border-[#222] rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#050505] hover:border-[#444] transition-all group w-full max-w-md"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#0a0a0a] border border-[#222] flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 md:w-8 md:h-8 text-[#666] group-hover:text-white transition-colors" />
                </div>
                <p className="font-extrabold text-white text-lg md:text-xl mb-2 md:mb-3 tracking-tight">
                  Sync Proof of Work
                </p>
                <p className="text-xs md:text-sm text-[#666] font-medium leading-relaxed">
                  Deposit blueprints, credentials, or pitch decks to establish
                  your baseline.
                </p>
              </motion.div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
              {assets
                .filter((a) =>
                  a.title.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((asset) => {
                  const isSelected = selectedAssetId === asset.id;

                  return (
                    <motion.div
                      key={asset.id}
                      layoutId={asset.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAssetId(asset.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setPreviewAsset(asset);
                      }}
                      className={cn(
                        "bg-[#0a0a0a] border rounded-2xl flex flex-col overflow-hidden transition-all duration-200 cursor-pointer select-none group",
                        isSelected
                          ? "border-white/50 bg-[#111] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                          : "border-[#222] hover:bg-[#111]",
                      )}
                    >
                      {/* Thumbnail Cover */}
                      <div className="h-28 md:h-40 bg-[#050505] border-b border-[#222] flex items-center justify-center relative overflow-hidden">
                        {/* If image, show actual image. Else show big icon. */}
                        {asset.fileType?.startsWith("image/") ? (
                          <img
                            src={asset.fileUrl}
                            alt="Preview"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="transition-transform duration-300 group-hover:scale-110">
                            {getFileIcon(
                              asset.fileName,
                              "w-10 h-10 md:w-12 md:h-12",
                            )}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewAsset(asset);
                            }}
                            className="bg-white/10 backdrop-blur-md p-2 rounded-full text-white hover:bg-white hover:text-black transition-colors"
                          >
                            <Eye className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="p-3 md:p-4 flex flex-col justify-between bg-inherit relative">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <div className="shrink-0">
                              {getFileIcon(
                                asset.fileName,
                                "w-3.5 h-3.5 md:w-4 md:h-4",
                              )}
                            </div>

                            {/* Inline Rename Form or Title */}
                            {renamingAsset?.id === asset.id ? (
                              <form
                                onSubmit={(e) =>
                                  handleRenameSubmit(e, asset.id)
                                }
                                className="flex-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  autoFocus
                                  type="text"
                                  value={renamingAsset.title}
                                  onChange={(e) =>
                                    setRenamingAsset({
                                      ...renamingAsset,
                                      title: e.target.value,
                                    })
                                  }
                                  onBlur={(e) =>
                                    handleRenameSubmit(e, asset.id)
                                  }
                                  className="w-full bg-[#222] text-white text-xs px-2 py-1 rounded outline-none focus:ring-1 ring-white"
                                />
                              </form>
                            ) : (
                              <h4 className="font-bold text-white text-[10px] md:text-sm tracking-tight truncate">
                                {asset.title}
                              </h4>
                            )}
                          </div>

                          {/* Drive 3-Dots Menu */}
                          <div className="relative shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenAssetId(
                                  menuOpenAssetId === asset.id
                                    ? null
                                    : asset.id,
                                );
                              }}
                              className="p-1 md:p-1.5 hover:bg-[#222] rounded-md transition-colors text-[#666] hover:text-white"
                            >
                              <MoreVertical className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <AnimatePresence>
                              {menuOpenAssetId === asset.id && (
                                <motion.div
                                  ref={menuRef}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute top-full right-0 mt-1 w-40 md:w-48 bg-[#111] border border-[#333] shadow-2xl rounded-xl py-1 z-50 overflow-hidden"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewAsset(asset);
                                      setMenuOpenAssetId(null);
                                    }}
                                    className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-[#ccc] hover:bg-[#222] hover:text-white flex items-center gap-2 md:gap-3"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-[#888]" />{" "}
                                    Preview
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(asset);
                                    }}
                                    className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-[#ccc] hover:bg-[#222] hover:text-white flex items-center gap-2 md:gap-3"
                                  >
                                    <Download className="w-3.5 h-3.5 text-[#888]" />{" "}
                                    Download
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRenamingAsset({
                                        id: asset.id,
                                        title: asset.title,
                                      });
                                      setMenuOpenAssetId(null);
                                    }}
                                    className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-[#ccc] hover:bg-[#222] hover:text-white flex items-center gap-2 md:gap-3"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#888]" />{" "}
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(asset.fileUrl, "_blank");
                                      setMenuOpenAssetId(null);
                                    }}
                                    className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-[#ccc] hover:bg-[#222] hover:text-white flex items-center gap-2 md:gap-3"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-[#888]" />{" "}
                                    Open in Tab
                                  </button>
                                  <div className="h-px bg-[#222] my-1" />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAsset(asset);
                                    }}
                                    className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 text-[10px] md:text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 md:gap-3"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                    File
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {asset.status === "Verified" ? (
                            <span className="text-[8px] md:text-[9px] font-extrabold uppercase tracking-widest text-green-500 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5 md:w-3 md:h-3" />{" "}
                              Verified
                            </span>
                          ) : (
                            <span className="text-[8px] md:text-[9px] font-extrabold uppercase tracking-widest text-amber-500 flex items-center gap-1 animate-pulse">
                              <ShieldAlert className="w-2.5 h-2.5 md:w-3 md:h-3" />{" "}
                              Pending
                            </span>
                          )}
                          <span className="text-[8px] md:text-[9px] text-[#666] font-mono">
                            {formatBytes(asset.size)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* --- PREVIEW OVERLAY (Google Drive Style) --- */}
      <AnimatePresence>
        {previewAsset && (
          <div
            className="fixed inset-0 z-[600] flex flex-col bg-black/95 backdrop-blur-2xl"
            onClick={() => setPreviewAsset(null)}
          >
            {/* Toolbar */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-white/10 shrink-0 bg-[#050505]/50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 md:gap-4 text-white overflow-hidden">
                <div className="p-1.5 md:p-2 bg-[#111] rounded-lg border border-[#333] shrink-0">
                  {getFileIcon(previewAsset.fileName, "w-4 h-4 md:w-5 md:h-5")}
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-xs md:text-sm tracking-tight truncate">
                    {previewAsset.title}
                  </h3>
                  <p className="text-[8px] md:text-[10px] text-[#888] font-mono truncate">
                    {previewAsset.fileName} • {formatBytes(previewAsset.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(previewAsset)}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>
            </motion.div>

            {/* Preview Frame */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-hidden relative"
            >
              <div
                className="w-full max-w-5xl h-full flex flex-col items-center justify-center relative"
                onClick={(e) => e.stopPropagation()}
              >
                {previewAsset.fileType?.startsWith("image/") ? (
                  <img
                    src={previewAsset.fileUrl}
                    alt={previewAsset.title}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  />
                ) : previewAsset.fileType === "application/pdf" ? (
                  <iframe
                    src={`${previewAsset.fileUrl}#toolbar=0`}
                    className="w-full h-full rounded-xl bg-white border border-[#222]"
                    title={previewAsset.title}
                  />
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="scale-[2] md:scale-[3] mb-8 opacity-50">
                      {getFileIcon(previewAsset.fileName)}
                    </div>
                    <p className="text-[#888] font-mono text-xs md:text-sm">
                      [ PREVIEW UNAVAILABLE FOR THIS TYPE ]
                    </p>
                    <button
                      onClick={() => handleDownload(previewAsset)}
                      className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-full text-xs"
                    >
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOAST --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={cn(
              "fixed bottom-6 md:bottom-10 left-1/2 z-50 border px-4 md:px-6 py-2.5 md:py-3 rounded-full shadow-2xl flex items-center gap-2 md:gap-3",
              toast.type === "green"
                ? "bg-[#052e16] border-green-500/30 text-green-400"
                : toast.type === "red"
                  ? "bg-[#450a0a] border-red-500/30 text-red-400"
                  : "bg-[#111] border-[#333] text-white",
            )}
          >
            {toast.type === "green" ? (
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
            ) : (
              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#888]" />
            )}
            <span className="text-[8px] md:text-[10px] font-mono uppercase tracking-widest">
              {toast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- UPLOAD PIPELINE MODAL --- */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={uploadStep !== 3 ? closeModal : undefined}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#222] rounded-2xl md:rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] z-10"
            >
              <div className="flex justify-between items-center p-5 md:p-6 border-b border-[#222] shrink-0 bg-[#050505]">
                <h2 className="text-base md:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  {uploadStep === 1
                    ? "Select Asset Type"
                    : uploadStep === 2
                      ? "Asset Details & Verification"
                      : "Deploying..."}
                </h2>
                {uploadStep !== 3 && (
                  <button
                    onClick={closeModal}
                    className="p-1.5 md:p-2 bg-[#111] rounded-full text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                )}
              </div>

              <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5 md:space-y-6">
                {uploadError && (
                  <div className="p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 md:gap-3 text-red-400 text-[10px] md:text-xs font-bold leading-relaxed">
                    <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 mt-0.5" />{" "}
                    {uploadError}
                  </div>
                )}

                {uploadStep === 1 && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setUploadStep(2)}
                      className="w-full flex items-center justify-between p-5 md:p-6 rounded-2xl bg-[#111] border border-[#222] hover:border-white/50 hover:bg-[#1a1a1a] transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#0a0a0a] border border-[#333] flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                          <FileText className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-bold text-white text-sm md:text-base mb-1">
                            Standard Document
                          </h4>
                          <p className="text-[8px] md:text-[10px] text-[#666] uppercase tracking-widest">
                            PDF, DOCX, Images
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-[#444] group-hover:text-white transition-colors" />
                    </button>
                  </div>
                )}

                {uploadStep === 2 && (
                  <>
                    <div
                      className={cn(
                        "w-full h-24 md:h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-200 relative",
                        isDragging
                          ? "border-amber-500 bg-amber-500/10 scale-[1.02]"
                          : file
                            ? "border-green-500/50 bg-green-500/5"
                            : "border-[#333] bg-[#111] hover:border-[#555] hover:bg-[#1a1a1a]",
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileDrop}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      {file ? (
                        <div className="text-center px-4 w-full">
                          <div className="w-8 h-8 md:w-10 md:h-10 mx-auto rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mb-1 md:mb-2">
                            <Check className="w-4 h-4 md:w-5 md:h-5" />
                          </div>
                          <p className="text-xs md:text-sm font-bold text-white truncate max-w-[200px] md:max-w-[250px] mx-auto">
                            {file.name}
                          </p>
                          <p className="text-[8px] md:text-[10px] font-mono text-[#666] mt-1">
                            {formatBytes(file.size)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center px-4 pointer-events-none">
                          <Upload
                            className={cn(
                              "w-5 h-5 md:w-6 md:h-6 mx-auto mb-2 md:mb-3 transition-colors",
                              isDragging ? "text-amber-500" : "text-[#555]",
                            )}
                          />
                          <p
                            className={cn(
                              "text-[10px] md:text-xs font-bold transition-colors",
                              isDragging ? "text-amber-400" : "text-[#888]",
                            )}
                          >
                            {isDragging
                              ? "Drop to secure asset"
                              : "Drag & drop file here"}
                          </p>
                          <p className="text-[8px] md:text-[9px] font-mono text-[#555] uppercase tracking-widest mt-1 md:mt-2">
                            Max Size: 2MB
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <label className="block text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1.5 md:mb-2 px-1">
                          Asset Name
                        </label>
                        <input
                          type="text"
                          value={assetName}
                          onChange={(e) => setAssetName(e.target.value)}
                          placeholder="e.g., Q3 Financial Audit"
                          className="w-full bg-[#111] border border-[#222] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#555] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div>
                          <label className="block text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1.5 md:mb-2 px-1">
                            Category
                          </label>
                          <div className="relative">
                            <select
                              value={assetCategory}
                              onChange={(e) => setAssetCategory(e.target.value)}
                              className="w-full bg-[#111] border border-[#222] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#555] transition-colors appearance-none cursor-pointer"
                            >
                              <option value="" disabled>
                                Select...
                              </option>
                              {ASSET_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-[#666] pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1.5 md:mb-2 px-1">
                            Credential ID (Optional)
                          </label>
                          <input
                            type="text"
                            value={credentialId}
                            onChange={(e) => setCredentialId(e.target.value)}
                            placeholder="e.g., UC-12345"
                            className="w-full bg-[#111] border border-[#222] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#555] transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em] mb-1.5 md:mb-2 px-1 flex items-center justify-between">
                          Verification Link (Optional)
                        </label>
                        <input
                          type="url"
                          value={verificationLink}
                          onChange={(e) => setVerificationLink(e.target.value)}
                          placeholder="https://coursera.org/verify/..."
                          className="w-full bg-[#111] border border-[#222] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#555] transition-colors"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5 md:mb-2 px-1">
                          <label className="text-[9px] md:text-[10px] font-bold text-[#666] uppercase tracking-[0.2em]">
                            Execution Note
                          </label>
                          <span
                            className={cn(
                              "text-[8px] md:text-[9px] font-mono",
                              assetNote.length >= 100
                                ? "text-red-500"
                                : "text-[#555]",
                            )}
                          >
                            {assetNote.length} / 100
                          </span>
                        </div>
                        <textarea
                          value={assetNote}
                          onChange={(e) => setAssetNote(e.target.value)}
                          maxLength={100}
                          rows="2"
                          placeholder="Brief context about this asset..."
                          className="w-full bg-[#111] border border-[#222] rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-white focus:outline-none focus:border-[#555] transition-colors resize-none custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 pt-4 border-t border-[#222] mt-4 shrink-0">
                      <button
                        onClick={() => setUploadStep(1)}
                        className="px-5 md:px-6 py-2.5 md:py-3 bg-[#111] border border-[#222] text-white font-bold rounded-xl hover:bg-[#222] transition-colors text-xs md:text-sm"
                      >
                        Back
                      </button>
                      <button
                        onClick={startUpload}
                        disabled={!file || !assetName || !assetCategory}
                        className="flex-1 px-5 md:px-6 py-2.5 md:py-3 bg-white text-black font-extrabold rounded-xl hover:bg-[#ccc] transition-colors text-xs md:text-sm disabled:opacity-50 flex justify-center items-center shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                      >
                        Submit for Verification
                      </button>
                    </div>
                  </>
                )}

                {uploadStep === 3 && (
                  <div className="py-8 md:py-12 flex flex-col items-center text-center">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8">
                      <svg
                        className="w-full h-full -rotate-90"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          className="text-[#111] stroke-current"
                          strokeWidth="4"
                          cx="50"
                          cy="50"
                          r="46"
                          fill="transparent"
                        />
                        <circle
                          className="text-white stroke-current transition-all duration-300 ease-out"
                          strokeWidth="4"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="46"
                          fill="transparent"
                          strokeDasharray="289.027"
                          strokeDashoffset={
                            289.027 - (289.027 * uploadProgress) / 100
                          }
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-lg md:text-xl font-extrabold">
                          {uploadProgress}%
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg md:text-xl font-extrabold text-white mb-2">
                      Deploying to Vault
                    </h3>
                    <p className="text-[10px] md:text-xs font-mono text-[#666] uppercase tracking-widest animate-pulse">
                      {uploadProgress < 50
                        ? "Encrypting packet..."
                        : uploadProgress < 90
                          ? "Transmitting to node..."
                          : "Notifying Admin..."}
                    </p>
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
