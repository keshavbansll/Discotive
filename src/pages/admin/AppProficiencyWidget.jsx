/**
 * @fileoverview App Proficiency Operations Widget
 * @module Admin/AppProficiency
 * @description
 * Segregated widget for handling app catalog management and user app proficiency verification.
 * Built to enforce MAANG-level codebase structure and isolate independent DOM flows.
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Plus,
  Check,
  ExternalLink,
  Clock,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  deleteField,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { cn } from "../../lib/cn";

const APP_CATEGORIES = [
  "Development",
  "Design",
  "Video & Motion",
  "3D & Animation",
  "Audio & Music",
  "Marketing & SEO",
  "Productivity",
  "Social Media",
  "AI & LLMs",
  "Business & Sales",
  "Finance",
  "Cloud & DevOps",
  "Cybersecurity",
  "Data & Analytics",
  "Other",
];

const AppProficiencyWidget = ({
  appVerifications,
  setAppVerifications,
  handleRefresh,
}) => {
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [newApp, setNewApp] = useState({
    appName: "",
    category: "Development",
    iconUrl: "",
  });
  const [appVerifLoading, setAppVerifLoading] = useState(false);
  const [appCatalog, setAppCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const fetchCatalog = async () => {
    setCatalogLoading(true);
    try {
      const { getDocs, collection } = await import("firebase/firestore");
      const snap = await getDocs(collection(db, "app_catalog"));
      setAppCatalog(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setCatalogLoading(false);
  };

  React.useEffect(() => {
    if (isAddAppOpen) fetchCatalog();
  }, [isAddAppOpen]);

  const handleApproveApp = async (verification) => {
    setAppVerifLoading(true);
    try {
      // Update verification doc
      await updateDoc(doc(db, "app_verifications", verification.id), {
        status: "APPROVED",
        reviewedAt: serverTimestamp(),
      });

      // Push to user's verifiedApps and clear pending
      await updateDoc(doc(db, "users", verification.userId), {
        verifiedApps: arrayUnion({
          appId: verification.appId,
          appName: verification.appName,
          appIconUrl: verification.appIconUrl,
          appCategory: verification.appCategory,
          proofUrl: verification.proofUrl || "",
          verifiedAt: new Date().toISOString(),
        }),
        [`pendingAppVerifications.${verification.appId}`]: deleteField(),
      });

      // Award score dynamically
      const { mutateScore } = await import("../../lib/scoreEngine");
      await mutateScore(
        verification.userId,
        25,
        `App Verified: ${verification.appName}`,
      );

      setAppVerifications((prev) =>
        prev.filter((v) => v.id !== verification.id),
      );
    } catch (err) {
      console.error("[AppProficiencyWidget] App approval failed:", err);
    } finally {
      setAppVerifLoading(false);
    }
  };

  const handleRejectApp = async (verification) => {
    try {
      await updateDoc(doc(db, "app_verifications", verification.id), {
        status: "REJECTED",
        reviewedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "users", verification.userId), {
        [`pendingAppVerifications.${verification.appId}`]: deleteField(),
      });

      setAppVerifications((prev) =>
        prev.filter((v) => v.id !== verification.id),
      );
    } catch (err) {
      console.error("[AppProficiencyWidget] App rejection failed:", err);
    }
  };

  const handleAddAppToCatalog = async () => {
    if (!newApp.appName.trim() || !newApp.iconUrl.trim()) return;
    try {
      const { serverTimestamp, addDoc, collection } =
        await import("firebase/firestore");
      const docRef = await addDoc(collection(db, "app_catalog"), {
        ...newApp,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email,
      });
      setAppCatalog((prev) => [{ id: docRef.id, ...newApp }, ...prev]);
      setNewApp({ appName: "", category: "Development", iconUrl: "" });
      handleRefresh();
    } catch (err) {
      console.error("[AppProficiencyWidget] Add app catalog failed:", err);
    }
  };

  const handleDeleteCatalogApp = async (id) => {
    if (
      !window.confirm(
        "Delete this app from the catalog? Users won't be able to select it anymore.",
      )
    )
      return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "app_catalog", id));
      setAppCatalog((prev) => prev.filter((a) => a.id !== id));
      handleRefresh();
    } catch (err) {
      console.error("Failed to delete catalog app:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2rem] p-6 mb-4"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
          <Monitor className="w-4 h-4 text-violet-400" /> App Proficiency
          Verifications
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-violet-400 font-mono">
            {appVerifications.length}
          </span>
          <button
            onClick={() => setIsAddAppOpen(!isAddAppOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-violet-500/15 transition-all"
          >
            <Plus className="w-3 h-3" /> App Catalog
          </button>
        </div>
      </div>

      {/* Add to Catalog Form */}
      {isAddAppOpen && (
        <>
          <div className="mb-5 p-4 bg-[#050505] border border-violet-500/10 rounded-2xl flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1.5">
                App Name
              </label>
              <input
                value={newApp.appName}
                onChange={(e) =>
                  setNewApp((p) => ({ ...p, appName: e.target.value }))
                }
                placeholder="e.g. Cursor"
                className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1.5">
                Category
              </label>
              <select
                value={newApp.category}
                onChange={(e) =>
                  setNewApp((p) => ({ ...p, category: e.target.value }))
                }
                className="bg-[#111] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/40"
              >
                {APP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-1.5">
                Icon URL (SimpleIcons / Direct Link)
              </label>
              <input
                value={newApp.iconUrl}
                onChange={(e) =>
                  setNewApp((p) => ({ ...p, iconUrl: e.target.value }))
                }
                placeholder="https://cdn.simpleicons.org/..."
                className="w-full bg-[#111] border border-white/[0.05] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <button
              onClick={handleAddAppToCatalog}
              disabled={!newApp.appName.trim() || !newApp.iconUrl.trim()}
              className="px-4 py-2 bg-violet-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-violet-400 disabled:opacity-50 transition-colors"
            >
              Add App
            </button>
          </div>

          {/* Existing Catalog Grid */}
          <div className="mb-6 border border-white/[0.05] rounded-2xl bg-[#050505] p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">
              Currently in Catalog ({appCatalog.length})
            </p>
            {catalogLoading ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500/50" />
              </div>
            ) : appCatalog.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-4 font-bold">
                Catalog is empty.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {appCatalog.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between bg-[#111] border border-white/[0.05] p-2 rounded-xl group hover:border-red-500/30 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded flex items-center justify-center shrink-0">
                        <img
                          src={app.iconUrl}
                          alt={app.appName}
                          className="w-4 h-4 object-contain"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white truncate">
                          {app.appName}
                        </p>
                        <p className="text-[8px] text-white/40 truncate">
                          {app.category}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCatalogApp(app.id)}
                      className="w-6 h-6 shrink-0 flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {appVerifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Monitor className="w-8 h-8 text-white/10 mb-3" />
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
            No pending app verifications
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {appVerifications.map((v) => (
            <div
              key={v.id}
              className="flex flex-col gap-3 p-4 bg-[#050505] border border-white/[0.04] rounded-2xl hover:border-violet-500/20 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/[0.06] flex items-center justify-center shrink-0 overflow-hidden">
                  <img
                    src={v.appIconUrl}
                    alt={v.appName}
                    className="w-6 h-6 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white truncate">
                    {v.appName}
                  </p>
                  <p className="text-[9px] text-white/30 font-mono truncate">
                    @{v.userUsername}
                  </p>
                </div>
                <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest shrink-0">
                  Pending
                </span>
              </div>
              {v.proofUrl && (
                <a
                  href={v.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-sky-400 hover:text-sky-300 transition-colors truncate"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{v.proofUrl}</span>
                </a>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveApp(v)}
                  disabled={appVerifLoading}
                  className="flex-1 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500/15 transition-all disabled:opacity-40"
                >
                  ✓ Approve +25pts
                </button>
                <button
                  onClick={() => handleRejectApp(v)}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/15 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AppProficiencyWidget;
