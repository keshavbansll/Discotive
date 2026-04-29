/**
 * @fileoverview LearnPortfolio.jsx — Discotive Learn Portfolio v5.0
 * Mac-style file explorer UI, premium gate, dynamic shareable URLs,
 * visibility toggling, grouping by type. Zero onSnapshot.
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import {
  X,
  Share2,
  Lock,
  Trash2,
  Globe,
  EyeOff,
  Play,
  BookOpen,
  Headphones,
  FileText,
  Star,
  Award,
  ChevronRight,
  ChevronDown,
  Crown,
  FolderOpen,
  Folder,
  CheckCircle2,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Grid,
  List,
} from "lucide-react";
import { TYPE_CONFIG } from "../../lib/discotiveLearn";
import { useNavigate } from "react-router-dom";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.2)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
  border: "rgba(255,255,255,0.06)",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

// ─── Icon map ─────────────────────────────────────────────────────────────────
const TYPE_ICON = {
  course: BookOpen,
  video: Play,
  podcast: Headphones,
  resource: FileText,
};

// ─── Mac-style Sidebar Tree Item ─────────────────────────────────────────────
const SidebarItem = ({
  label,
  count,
  icon: Icon,
  color,
  active,
  onClick,
  isGroup,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left"
    style={{
      background: active ? "rgba(255,255,255,0.07)" : "transparent",
      color: active ? T.primary : T.secondary,
    }}
  >
    {isGroup && (
      <ChevronRight
        className="w-3 h-3 shrink-0"
        style={{ color: T.dim, transform: "rotate(90deg)" }}
      />
    )}
    {Icon && (
      <Icon
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: active ? color : T.dim }}
      />
    )}
    <span className="text-xs font-semibold flex-1 truncate">{label}</span>
    {count !== undefined && (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", color: T.dim }}
      >
        {count}
      </span>
    )}
  </button>
);

// ─── File Explorer Row ────────────────────────────────────────────────────────
const FileRow = ({ item, selected, onClick, onDelete, onToggleVisibility }) => {
  const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.course;
  const Icon = TYPE_ICON[item.type] || BookOpen;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all select-none"
      style={{
        background: selected
          ? "rgba(191,162,100,0.08)"
          : hovered
            ? "rgba(255,255,255,0.03)"
            : "transparent",
        borderLeft: selected ? `2px solid ${G.base}` : "2px solid transparent",
      }}
    >
      {/* File icon */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: `${tc.color}18`,
          border: `1px solid ${tc.color}30`,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: tc.color }} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold truncate"
          style={{ color: T.primary }}
        >
          {item.title}
        </p>
        <p className="text-[9px] truncate" style={{ color: T.dim }}>
          {item.platform || tc.label} ·{" "}
          {new Date(
            item.addedAt?.toDate?.() || item.addedAt || Date.now(),
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Visibility */}
      <div
        className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility(item.id, !item.isPublic);
          }}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.05)" }}
          title={item.isPublic ? "Make Private" : "Make Public"}
        >
          {item.isPublic ? (
            <Globe className="w-3 h-3 text-green-400" />
          ) : (
            <EyeOff className="w-3 h-3" style={{ color: T.dim }} />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="w-6 h-6 rounded-md flex items-center justify-center transition-all"
          style={{ background: "rgba(248,113,113,0.06)" }}
          title="Remove"
        >
          <Trash2 className="w-3 h-3 text-red-400" />
        </button>
      </div>

      {/* Public badge */}
      {!hovered && item.isPublic && (
        <Globe className="w-3 h-3 shrink-0 text-green-400/60" />
      )}
    </motion.div>
  );
};

// ─── Detail Preview ───────────────────────────────────────────────────────────
const DetailPreview = ({ item, onDelete, onToggleVisibility }) => {
  const [copied, setCopied] = useState(false);
  const tc = TYPE_CONFIG[item?.type] || TYPE_CONFIG.course;
  const Icon = TYPE_ICON[item?.type] || BookOpen;

  if (!item) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3"
        style={{ color: T.dim }}
      >
        <FolderOpen className="w-12 h-12 opacity-20" />
        <p className="text-xs font-semibold">Select an item to preview</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(item.discotiveLearnId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
      {/* Thumbnail */}
      <div
        className="relative w-full"
        style={{ height: 160, background: V.depth, flexShrink: 0 }}
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon
              className="w-12 h-12 opacity-10"
              style={{ color: tc.color }}
            />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(3,3,3,0.9), transparent)",
          }}
        />
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span
            className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest"
            style={{
              background: `${tc.color}22`,
              border: `1px solid ${tc.color}40`,
              color: tc.color,
            }}
          >
            {tc.label}
          </span>
        </div>
        {/* Visibility */}
        <div className="absolute top-3 right-3">
          {item.isPublic ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-bold"
              style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80" }}
            >
              <Globe className="w-2.5 h-2.5" /> Public
            </span>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-bold"
              style={{ background: "rgba(255,255,255,0.06)", color: T.dim }}
            >
              <EyeOff className="w-2.5 h-2.5" /> Private
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3 flex-1">
        <h3
          className="text-sm font-black leading-snug"
          style={{ color: T.primary }}
        >
          {item.title}
        </h3>

        {item.platform && (
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            {item.platform}
          </p>
        )}

        {/* Learn ID */}
        {item.discotiveLearnId && (
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span
              className="text-[8px] font-black uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              ID
            </span>
            <span
              className="font-mono text-[9px] flex-1 text-left truncate"
              style={{ color: T.secondary }}
            >
              {item.discotiveLearnId}
            </span>
            {copied ? (
              <Check className="w-3 h-3 text-green-400 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 shrink-0" style={{ color: T.dim }} />
            )}
          </button>
        )}

        {/* Added date */}
        <div className="flex items-center gap-2" style={{ color: T.dim }}>
          <Clock className="w-3 h-3" />
          <span className="text-[10px]">
            Added{" "}
            {new Date(
              item.addedAt?.toDate?.() || item.addedAt || Date.now(),
            ).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => onToggleVisibility(item.id, !item.isPublic)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              background: item.isPublic
                ? "rgba(248,113,113,0.06)"
                : "rgba(74,222,128,0.07)",
              border: item.isPublic
                ? "1px solid rgba(248,113,113,0.15)"
                : "1px solid rgba(74,222,128,0.2)",
              color: item.isPublic ? "#F87171" : "#4ADE80",
            }}
          >
            {item.isPublic ? (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Make Private
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" /> Make Public
              </>
            )}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              background: "rgba(248,113,113,0.06)",
              border: "1px solid rgba(248,113,113,0.12)",
              color: "#F87171",
            }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Premium Gate ─────────────────────────────────────────────────────────────
const PremiumGate = ({ onClose }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
      style={{ background: "rgba(3,3,3,0.96)", backdropFilter: "blur(16px)" }}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: V.surface,
          border: `1px solid ${V.border}`,
          color: T.primary,
        }}
      >
        <X className="w-4 h-4" />
      </button>
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative max-w-md w-full rounded-3xl overflow-hidden p-8 text-center"
        style={{ background: V.elevated, border: `1px solid ${G.border}` }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${G.dimBg}, transparent 60%)`,
          }}
        />
        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: `linear-gradient(135deg, ${G.deep}, ${G.bright})`,
            }}
          >
            <Crown className="w-8 h-8" style={{ color: "#000" }} />
          </div>
          <h2 className="text-2xl font-black mb-3" style={{ color: T.primary }}>
            PRO PORTFOLIO
          </h2>
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: T.secondary }}
          >
            Curate and share a verifiable learning portfolio. Showcase completed
            courses, masterclasses, and technical resources with a public link.
            Stop telling people what you know. Show them.
          </p>
          <button
            onClick={() => navigate("/premium")}
            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest"
            style={{
              background: `linear-gradient(135deg, ${G.base}, ${G.bright})`,
              color: "#000",
            }}
          >
            Upgrade to Pro
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LearnPortfolio = ({ uid, userData, isPremium, onClose, isMobile }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected item ID
  const [activeGroup, setActiveGroup] = useState("all");
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" | "grid"

  // Fetch portfolio
  useEffect(() => {
    if (!uid || !isPremium) {
      setLoading(false);
      return;
    }
    const fetch = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users", uid, "learn_portfolio"),
            orderBy("addedAt", "desc"),
          ),
        );
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("[LearnPortfolio] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [uid, isPremium]);

  const grouped = useMemo(() => {
    const g = { course: [], video: [], podcast: [], resource: [] };
    items.forEach((item) => {
      if (g[item.type]) g[item.type].push(item);
    });
    return g;
  }, [items]);

  const displayItems = useMemo(() => {
    if (activeGroup === "all") return items;
    return grouped[activeGroup] || [];
  }, [activeGroup, items, grouped]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selected),
    [items, selected],
  );

  const handleDelete = useCallback(
    async (docId) => {
      if (!uid) return;
      setItems((prev) => prev.filter((i) => i.id !== docId));
      if (selected === docId) setSelected(null);
      try {
        await deleteDoc(doc(db, "users", uid, "learn_portfolio", docId));
      } catch (err) {
        console.error(err);
      }
    },
    [uid, selected],
  );

  const handleToggleVisibility = useCallback(
    async (docId, newStatus) => {
      if (!uid) return;
      setItems((prev) =>
        prev.map((i) => (i.id === docId ? { ...i, isPublic: newStatus } : i)),
      );
      try {
        await updateDoc(doc(db, "users", uid, "learn_portfolio", docId), {
          isPublic: newStatus,
        });
      } catch (err) {
        console.error(err);
      }
    },
    [uid],
  );

  const handleCopyLink = () => {
    const handle = userData?.identity?.username || userData?.handle || uid;
    navigator.clipboard.writeText(
      `${window.location.origin}/@${handle}/learning`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isPremium) return <PremiumGate onClose={onClose} />;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: V.bg }}
    >
      {/* Mac-style Title Bar */}
      <div
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 52,
          background: V.surface,
          borderBottom: `1px solid ${V.border}`,
        }}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full transition-all hover:brightness-110"
            style={{ background: "#FF5F57" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#FEBC2E" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#28C840" }}
          />
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[11px] font-semibold"
            style={{ color: T.secondary }}
          >
            Learn Portfolio
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: T.dim }}
          >
            {viewMode === "list" ? (
              <Grid className="w-3.5 h-3.5" />
            ) : (
              <List className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
            style={{
              background: G.dimBg,
              border: `1px solid ${G.border}`,
              color: G.bright,
            }}
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Share2 className="w-3 h-3" />
            )}
            {!isMobile && (copied ? "Copied" : "Share")}
          </button>
        </div>
      </div>

      {/* Body: sidebar + file list + preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!isMobile && (
          <div
            className="flex flex-col gap-0.5 p-2 shrink-0 overflow-y-auto custom-scrollbar"
            style={{
              width: 180,
              borderRight: `1px solid ${V.border}`,
              background: V.depth,
            }}
          >
            <p
              className="text-[8px] font-black uppercase tracking-widest px-3 py-2"
              style={{ color: T.dim }}
            >
              My Library
            </p>
            <SidebarItem
              label="All Items"
              count={items.length}
              icon={FolderOpen}
              color={G.bright}
              active={activeGroup === "all"}
              onClick={() => setActiveGroup("all")}
            />
            <div className="h-px my-1" style={{ background: V.border }} />
            {Object.entries(grouped).map(([type, typeItems]) => {
              if (!typeItems.length) return null;
              const Icon = TYPE_ICON[type] || BookOpen;
              const tc = TYPE_CONFIG[type] || TYPE_CONFIG.course;
              return (
                <SidebarItem
                  key={type}
                  label={tc.plural}
                  count={typeItems.length}
                  icon={Icon}
                  color={tc.color}
                  active={activeGroup === type}
                  onClick={() => setActiveGroup(type)}
                  isGroup
                />
              );
            })}
          </div>
        )}

        {/* File list */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            flex: isMobile ? 1 : "0 0 320px",
            borderRight: isMobile ? "none" : `1px solid ${V.border}`,
          }}
        >
          {/* Column headers (Mac Finder style) */}
          <div
            className="flex items-center gap-3 px-4 py-2 shrink-0"
            style={{
              borderBottom: `1px solid ${V.border}`,
              background: V.elevated,
            }}
          >
            <span
              className="text-[8px] font-black uppercase tracking-widest flex-1"
              style={{ color: T.dim }}
            >
              Name
            </span>
            <span
              className="text-[8px] font-black uppercase tracking-widest w-20 text-right"
              style={{ color: T.dim }}
            >
              Date Added
            </span>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex flex-col gap-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 rounded-lg animate-pulse"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  />
                ))}
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <Folder
                  className="w-10 h-10 opacity-20"
                  style={{ color: T.dim }}
                />
                <p className="text-xs font-semibold" style={{ color: T.dim }}>
                  {activeGroup === "all"
                    ? "No items yet"
                    : `No ${activeGroup}s yet`}
                </p>
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "rgba(245,240,232,0.15)" }}
                >
                  Complete content and add it to your portfolio from the detail
                  sheet.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {displayItems.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    selected={selected === item.id}
                    onClick={() =>
                      setSelected(item.id === selected ? null : item.id)
                    }
                    onDelete={handleDelete}
                    onToggleVisibility={handleToggleVisibility}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Status bar */}
          <div
            className="flex items-center px-4 py-1.5 shrink-0"
            style={{
              borderTop: `1px solid ${V.border}`,
              background: V.elevated,
            }}
          >
            <span className="text-[9px] font-mono" style={{ color: T.dim }}>
              {displayItems.length} item{displayItems.length !== 1 ? "s" : ""}
              {selectedItem ? " · 1 selected" : ""}
            </span>
          </div>
        </div>

        {/* Detail preview (desktop only) */}
        {!isMobile && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <DetailPreview
              item={selectedItem}
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LearnPortfolio;
