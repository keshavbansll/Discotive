import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Video,
  Headphones,
  Target,
  Database,
  BookOpen,
  ChevronRight,
  Search,
  X,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";
import { fetchVideos } from "../../lib/discotiveLearn";
import { cn } from "../ui/BentoCard";

const CATEGORIES = [
  {
    id: "assets",
    label: "My Vault",
    icon: Database,
    color: "text-emerald-400",
  },
  {
    id: "learn",
    label: "Certificates",
    icon: BookOpen,
    color: "text-fuchsia-400",
  },
  { id: "videos", label: "Video Hub", icon: Video, color: "text-sky-400" },
];

const extractYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i,
  );
  return match ? match[1] : url;
};

export const MediaExplorerModal = ({
  isOpen,
  onClose,
  onSelect,
  requiredLearnId,
}) => {
  const [path, setPath] = useState(["assets"]);
  const [cache, setCache] = useState({ youtube: null, assets: null });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPath(["assets"]);
      setSelectedItem(null);
    }
  }, [isOpen]);

  const handleOpenFolder = async (folderId) => {
    setPath([...path, folderId]);
    if (folderId === "youtube" && !cache.youtube) {
      setIsLoading(true);
      const res = await fetchVideos({ pageSize: 50 });
      setCache((prev) => ({ ...prev, youtube: res.items }));
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;
  const currentLevel = path[path.length - 1];

  return createPortal(
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-[#0a0a0c] border border-white/[0.08] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-white/[0.02]"
      >
        {/* Header - Discotive Branded */}
        <div className="h-16 flex items-center px-6 justify-between border-b border-white/[0.05] bg-[#0a0a0c]/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#111] border border-white/[0.05] flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight">
                  Discotive Explorer
                </h3>
                {requiredLearnId && (
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Matching constraint
                    active
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Search database..."
                className="bg-[#111] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50 transition-colors w-64"
              />
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#111] hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
          {/* Sidebar */}
          <div className="w-full sm:w-56 bg-[#0a0a0c] border-r border-white/[0.05] p-4 flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto hide-scrollbar">
            <p className="hidden sm:block text-[9px] font-black text-white/30 uppercase tracking-widest px-2 mb-2 mt-2">
              Databases
            </p>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = path[0] === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setPath([cat.id]);
                    setSelectedItem(null);
                  }}
                  className={cn(
                    "flex-shrink-0 sm:flex-shrink w-auto sm:w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    isActive
                      ? "bg-[#111] border border-white/[0.08] text-white shadow-lg"
                      : "text-white/40 hover:bg-white/[0.02] hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? cat.color : "text-white/40",
                    )}
                  />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Main View Area */}
          <div
            className="flex-1 bg-[#050505] p-6 overflow-y-auto custom-scrollbar"
            onClick={() => setSelectedItem(null)}
          >
            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 mb-6 text-[10px] font-bold uppercase tracking-widest text-white/30">
              {path.map((p, i) => (
                <React.Fragment key={p}>
                  <span className={i === path.length - 1 ? "text-white" : ""}>
                    {p}
                  </span>
                  {i < path.length - 1 && <ChevronRight className="w-3 h-3" />}
                </React.Fragment>
              ))}
            </div>

            {/* Empty State Logic */}
            {["assets", "learn", "podcasts"].includes(currentLevel) && (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#111] border border-white/[0.05] flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-white/20" />
                </div>
                <p className="text-sm font-black text-white">System Empty</p>
                <p className="text-xs text-white/30 mt-1">
                  No verified records found in this sector.
                </p>
              </div>
            )}

            {/* Folder Navigation */}
            {currentLevel === "videos" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenFolder("youtube");
                  }}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#0a0a0c] border border-white/[0.05] hover:border-sky-500/50 cursor-pointer transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.1)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video className="w-6 h-6 text-sky-400" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                    YouTube DB
                  </span>
                </div>
              </div>
            )}

            {/* YouTube DB Viewer */}
            {currentLevel === "youtube" &&
              (isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                  <p className="text-[10px] font-bold text-sky-500 uppercase tracking-widest animate-pulse">
                    Querying Database...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(cache.youtube || []).map((v) => (
                    <div
                      key={v.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(v);
                      }}
                      onDoubleClick={() => onSelect(v)}
                      className={cn(
                        "flex flex-col gap-3 p-3 rounded-2xl cursor-pointer border transition-all duration-300",
                        selectedItem?.id === v.id
                          ? "bg-sky-500/10 border-sky-500/50 shadow-[0_0_30px_rgba(56,189,248,0.15)]"
                          : "bg-[#0a0a0c] border-white/[0.05] hover:border-white/20",
                      )}
                    >
                      <div className="w-full aspect-video bg-[#000] rounded-xl overflow-hidden relative border border-white/[0.05]">
                        <img
                          src={
                            v.thumbnailUrl ||
                            `https://img.youtube.com/vi/${extractYouTubeId(v.url || v.youtubeId)}/maxresdefault.jpg`
                          }
                          className="w-full h-full object-cover"
                          alt={v.title}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white line-clamp-2 leading-tight">
                          {v.title}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono mt-1 block">
                          ID: {v.learnId || "N/A"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-20 bg-[#0a0a0c] border-t border-white/[0.05] flex items-center px-6 justify-between">
          <div className="hidden sm:block text-[10px] font-mono text-white/30">
            {selectedItem
              ? `Selected: ${selectedItem.id}`
              : "Awaiting selection..."}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white bg-[#111] hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedItem && onSelect(selectedItem)}
              disabled={!selectedItem}
              className="flex-1 sm:flex-none px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:bg-[#333] disabled:text-white/30 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none flex items-center justify-center gap-2"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Link Asset
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};
