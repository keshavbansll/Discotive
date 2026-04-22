/**
 * @fileoverview Discotive Roadmap — Keyboard Shortcuts Panel
 * Accessible modal panel shown on `?` key. Focus-trapped.
 */

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

export const ShortcutsPanel = ({ isOpen, onClose }) => {
  const closeRef = useRef(null);

  // Focus the close button when opened for keyboard accessibility
  useEffect(() => {
    if (isOpen) setTimeout(() => closeRef.current?.focus(), 50);
  }, [isOpen]);

  // Trap focus inside the panel
  useEffect(() => {
    if (!isOpen) return;
    const fn = (e) => {
      if (e.key === "Escape") onClose();
      // --- 🔴 MAANG-GRADE FIX: FOCUS TRAP ---
      if (e.key === "Tab") {
        e.preventDefault(); // Prevents focus from bleeding into the background canvas
      }
      // --------------------------------------
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            className="relative w-full max-w-md bg-[#060606] border border-[#1e1e1e] rounded-[2rem] p-7 shadow-[0_60px_120px_rgba(0,0,0,0.95)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-black text-white">
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close shortcuts panel"
                className="w-8 h-8 bg-[#111] border border-[#222] rounded-full flex items-center justify-center text-[#666] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.map(({ keys, description }) => (
                <div
                  key={description}
                  className="flex items-center justify-between gap-4 py-2.5 border-b border-[#0f0f0f] last:border-0"
                >
                  <span className="text-xs text-[#888]">{description}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {keys.map((key, i) => (
                      <React.Fragment key={key}>
                        <kbd className="px-2 py-1 bg-[#111] border border-[#333] rounded-md text-[9px] font-black text-white font-mono">
                          {key}
                        </kbd>
                        {i < keys.length - 1 && (
                          <span className="text-[9px] text-[#444]">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-[#444] mt-5 text-center">
              Press
              <kbd className="px-1.5 py-0.5 bg-[#111] border border-[#333] rounded text-[8px] font-mono">
                ?
              </kbd>
              anytime to toggle this panel.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
