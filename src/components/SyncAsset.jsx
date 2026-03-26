import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, FileText, ChevronRight, X, Search } from "lucide-react";
import { cn } from "./ui/BentoCard";

const SyncAsset = ({ isOpen, onClose, onSelectAsset, userVault = [] }) => {
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = userVault.filter(
    (a) =>
      (filter === "All" || a.type.includes(filter)) &&
      a.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-6 md:p-8 shadow-[0_80px_160px_rgba(0,0,0,0.95)] flex flex-col h-[550px]"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-500" /> Vault
                  Synchronization
                </h3>
                <p className="text-[10px] text-[#666] font-bold uppercase tracking-widest mt-1">
                  Select an asset to wire into the neural map.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-[#111] rounded-full border border-[#222] text-[#666] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-6">
              <div className="flex bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl overflow-hidden p-1">
                {["All", "Document", "Image", "Code"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors",
                      filter === f
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-[#555] hover:text-white",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50 transition-colors">
                <Search className="w-4 h-4 text-[#555] mr-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vault..."
                  className="bg-transparent border-none outline-none text-xs font-bold text-white w-full"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                  className="flex items-center justify-between p-4 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-emerald-500/40 rounded-xl cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#111] rounded-lg flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
                      <FileText className="w-4 h-4 text-[#666] group-hover:text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {asset.name}
                      </p>
                      <p className="text-[9px] text-[#555] font-bold uppercase tracking-widest mt-0.5">
                        {asset.type} • Verified
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#333] group-hover:text-emerald-500" />
                </div>
              ))}
              {filteredAssets.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Database className="w-8 h-8 text-[#222] mb-3" />
                  <p className="text-sm font-bold text-[#666]">
                    No Assets Found
                  </p>
                  <p className="text-[10px] text-[#444] uppercase tracking-widest mt-1">
                    Upload files to your vault to use them here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SyncAsset;
