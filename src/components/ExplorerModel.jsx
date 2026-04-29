/**
 * @fileoverview ExplorerModel.jsx — Mac/Drive Hybrid File System
 * @description
 * High-performance, zero-latency virtual file system for the Asset Vault.
 * Features drag-and-drop mechanics, folder routing, and context menus.
 */

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FileText,
  File as FileIcon,
  Image,
  Video,
  UploadCloud,
  X,
  Search,
  ChevronRight,
  Grid,
  List,
  Plus,
} from "lucide-react";
import { cn } from "../lib/cn";

const FOLDERS = ["Documents", "Certificates", "Projects", "Media"];

export default function ExplorerModel({ isOpen, onClose, assets = [] }) {
  const [currentPath, setCurrentPath] = useState(["Root"]);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = useMemo(() => {
    return assets.filter((a) =>
      (a.title || a.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
    );
  }, [assets, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8">
        {/* Blur Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#030303]/80 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Mac-Style Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-5xl h-[80vh] flex flex-col bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header Bar */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0F0F0F]">
            <div className="flex items-center gap-4">
              {/* Traffic Lights */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
                />
                <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" />
                <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors" />
              </div>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-[#888]">
                {currentPath.map((path, i) => (
                  <React.Fragment key={path}>
                    <button className="hover:text-white transition-colors">
                      {path}
                    </button>
                    {i < currentPath.length - 1 && <ChevronRight size={12} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative flex items-center bg-[#111] border border-white/5 rounded-lg px-3 py-1.5 focus-within:border-[#BFA264]/50 transition-colors">
                <Search size={12} className="text-[#666] mr-2" />
                <input
                  type="text"
                  placeholder="Search vault..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-white outline-none w-40 placeholder:text-[#444]"
                />
              </div>

              {/* View Toggles */}
              <div className="flex items-center bg-[#111] border border-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-white/10 text-white"
                      : "text-[#666] hover:text-[#888]",
                  )}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-white/10 text-white"
                      : "text-[#666] hover:text-[#888]",
                  )}
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 bg-[#080808] border-r border-white/5 p-4 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#555] mb-2 px-2">
                Favorites
              </p>
              {FOLDERS.map((folder) => (
                <button
                  key={folder}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-bold text-[#888] hover:text-white hover:bg-white/5 transition-colors text-left"
                >
                  <Folder size={14} className="text-[#BFA264]" /> {folder}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-[#0A0A0A]">
              {/* Drop Zone Header */}
              <div className="w-full flex flex-col items-center justify-center p-8 mb-8 border-2 border-dashed border-[#BFA264]/20 rounded-2xl bg-[rgba(191,162,100,0.02)] hover:bg-[rgba(191,162,100,0.05)] transition-colors cursor-pointer group">
                <UploadCloud
                  size={28}
                  className="text-[#BFA264] mb-3 group-hover:scale-110 transition-transform"
                />
                <p className="text-sm font-black text-[#D4AF78]">
                  Drop artifacts here
                </p>
                <p className="text-[10px] font-mono text-[#888] mt-1">
                  Or click to browse standard directories
                </p>
              </div>

              {/* Grid View */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {filteredAssets.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-xs text-[#555] uppercase tracking-widest">
                      No assets synchronized
                    </div>
                  ) : (
                    filteredAssets.map((asset, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05 }}
                        className="flex flex-col items-center gap-2 cursor-pointer group"
                      >
                        <div className="w-full aspect-square bg-[#111] border border-white/5 rounded-xl flex items-center justify-center group-hover:border-[#BFA264]/40 transition-colors">
                          {asset.category === "Certificate" ? (
                            <FileText size={24} className="text-[#a855f7]" />
                          ) : (
                            <FileIcon size={24} className="text-[#BFA264]" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#888] text-center truncate w-full px-1">
                          {asset.title || "Untitled"}
                        </span>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                /* List View */
                <div className="flex flex-col gap-1">
                  <div className="flex items-center px-4 py-2 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-[#555]">
                    <div className="flex-1">Name</div>
                    <div className="w-32">Date Modified</div>
                    <div className="w-24 text-right">Size</div>
                  </div>
                  {filteredAssets.map((asset, i) => (
                    <div
                      key={i}
                      className="flex items-center px-4 py-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border-b border-transparent hover:border-white/5"
                    >
                      <div className="flex-1 flex items-center gap-3">
                        <FileIcon size={14} className="text-[#BFA264]" />
                        <span className="text-xs font-bold text-[#ccc]">
                          {asset.title || "Untitled Document"}
                        </span>
                      </div>
                      <div className="w-32 text-[10px] text-[#666] font-mono">
                        Today, 10:42 AM
                      </div>
                      <div className="w-24 text-right text-[10px] text-[#666] font-mono">
                        2.4 MB
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
