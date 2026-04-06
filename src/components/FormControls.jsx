import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, X, Loader2 } from "lucide-react";

export const inputClass =
  "w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/40 transition-all placeholder-[#555] text-sm";
export const labelClass =
  "block text-[10px] font-bold text-[#888] uppercase tracking-[0.2em] mb-2 px-1";

export const CustomSearchSelect = React.memo(
  ({
    options = [],
    value,
    onChange,
    placeholder,
    allowCustom = true,
    required = false,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value || "");
    const wrapperRef = useRef(null);

    useEffect(() => {
      setQuery(value || "");
    }, [value]);

    useEffect(() => {
      const handler = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target))
          setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = useMemo(
      () =>
        options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
      [options, query],
    );

    return (
      <div ref={wrapperRef} className="relative w-full">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              if (allowCustom) onChange(e.target.value);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            required={required}
            className={inputClass}
          />
          <ChevronDown
            className={`absolute right-3 w-4 h-4 text-[#555] pointer-events-none transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
            >
              {filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setQuery(opt);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-[#ccc] hover:text-white truncate"
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 && allowCustom && query.trim() && (
                <div
                  onClick={() => {
                    onChange(query);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-emerald-400 font-bold"
                >
                  + Use "{query}"
                </div>
              )}
              {filtered.length === 0 && !allowCustom && (
                <div className="px-4 py-3 text-xs text-[#555] text-center">
                  No matches found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export const CustomMultiSelect = React.memo(
  ({
    options = [],
    selected = [],
    onChange,
    placeholder,
    allowCustom = true,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const wrapperRef = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target))
          setIsOpen(false);
      };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (val) => {
      if (selected.includes(val)) onChange(selected.filter((i) => i !== val));
      else onChange([...selected, val]);
      setQuery("");
    };

    const filtered = useMemo(
      () =>
        options.filter(
          (o) =>
            o.toLowerCase().includes(query.toLowerCase()) &&
            !selected.includes(o),
        ),
      [options, query, selected],
    );

    return (
      <div ref={wrapperRef} className="relative w-full">
        <div
          className="min-h-[46px] w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 focus-within:border-white/40 transition-all flex flex-wrap gap-2 items-center cursor-text"
          onClick={() => setIsOpen(true)}
        >
          {selected.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1 px-2.5 py-1 bg-white/10 border border-white/10 rounded-lg text-[11px] font-bold text-white"
            >
              {item}
              <X
                className="w-3 h-3 cursor-pointer hover:text-red-400 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(item);
                }}
              />
            </span>
          ))}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-white placeholder-[#555] py-0.5"
          />
        </div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-[calc(100%+4px)] left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar"
            >
              {filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => toggle(opt)}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-[#ccc] hover:text-white truncate"
                >
                  {opt}
                </div>
              ))}
              {filtered.length === 0 && allowCustom && query.trim() && (
                <div
                  onClick={() => toggle(query)}
                  className="px-4 py-2.5 text-sm hover:bg-[#222] cursor-pointer text-emerald-400 font-bold"
                >
                  + Add "{query}"
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

export const OAuthButton = React.memo(
  ({ provider, icon, label, onClick, disabled }) => (
    <button
      type="button"
      onClick={() => onClick(provider)}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#121212] border border-white/10 text-white font-bold rounded-xl hover:bg-[#1a1a1a] hover:border-white/20 transition-all shadow-sm disabled:opacity-50 text-sm"
    >
      {disabled ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#888]" />
      ) : (
        icon
      )}
      {disabled ? "Authenticating..." : `Continue with ${label}`}
    </button>
  ),
);

export const GoogleIcon = (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);
