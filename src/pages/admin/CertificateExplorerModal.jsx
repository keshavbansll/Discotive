import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, X, RefreshCw, Award, Link as LinkIcon } from "lucide-react";
import { cn } from "../../components/ui/BentoCard";
import { fetchCertificates } from "../../lib/discotiveLearn";

const CertificateExplorerModal = ({ isOpen, onClose, onSelect }) => {
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (isOpen && certificates.length === 0) {
      loadCertificates();
    }
    if (!isOpen) setSelectedItem(null);
  }, [isOpen]);

  const loadCertificates = async () => {
    setIsLoading(true);
    const res = await fetchCertificates({ pageSize: 50 });
    setCertificates(res.items || []);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
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
        className="relative w-full max-w-4xl h-[75vh] bg-[#0a0a0c] border border-white/[0.08] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden ring-1 ring-white/[0.02]"
      >
        {/* Header */}
        <div className="h-16 flex items-center px-6 justify-between border-b border-white/[0.05] bg-[#0a0a0c]/50 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#111] border border-white/[0.05] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">
                Discotive Explorer
              </h3>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
                Align Asset with Database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#111] hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Single Tab */}
          <div className="w-48 bg-[#0a0a0c] border-r border-white/[0.05] p-4 flex flex-col gap-2">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest px-2 mb-2 mt-2">
              Databases
            </p>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#111] border border-white/[0.08] text-white shadow-lg transition-all">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Certificates
            </button>
          </div>

          {/* Main View Area */}
          <div
            className="flex-1 bg-[#050505] p-6 overflow-y-auto custom-scrollbar"
            onClick={() => setSelectedItem(null)}
          >
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest animate-pulse">
                  Querying Database...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(cert);
                    }}
                    onDoubleClick={() => onSelect(cert)}
                    className={cn(
                      "flex flex-col gap-2 p-4 rounded-xl cursor-pointer border transition-all duration-300",
                      selectedItem?.id === cert.id
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                        : "bg-[#0a0a0c] border-white/[0.05] hover:border-white/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#111] border border-white/[0.05] flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <h4
                          className="text-xs font-bold text-white truncate"
                          title={cert.title}
                        >
                          {cert.title}
                        </h4>
                        <a
                          href={cert.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-sky-400 hover:underline truncate block mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cert.link}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-20 bg-[#0a0a0c] border-t border-white/[0.05] flex items-center px-6 justify-between">
          <div className="text-[10px] font-mono text-white/30">
            {selectedItem
              ? `Selected: ${selectedItem.title}`
              : "Awaiting alignment selection..."}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white bg-[#111] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedItem && onSelect(selectedItem)}
              disabled={!selectedItem}
              className="px-8 py-2.5 text-[10px] font-black uppercase tracking-widest text-black bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:bg-[#333] disabled:text-white/30 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-none flex items-center gap-2"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Align & Verify
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CertificateExplorerModal;
