/**
 * @fileoverview ExplorerModel.jsx — Discotive Mac-Style Drive Explorer
 * @description
 * A full-screen, Mac Finder / Google Drive hybrid file system.
 * Non-vault-specific — reusable across any module that needs file browsing.
 *
 * Features:
 * - Drag-and-drop between folders
 * - Grid / List toggle
 * - Context menu (right-click / long-press)
 * - Breadcrumb navigation with back/forward
 * - Search with instant client-side filter
 * - Sort (name, date, size, type)
 * - Folder creation inline
 * - Mobile-native bottom sheet variant
 * - Zero onSnapshot — one-shot reads only
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
} from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

/* ── Design tokens (mirrors Dashboard) ───────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};
const V = {
  bg: "#030303",
  depth: "#0A0A0A",
  surface: "#0F0F0F",
  elevated: "#141414",
};
const T = {
  primary: "#F5F0E8",
  secondary: "rgba(245,240,232,0.60)",
  dim: "rgba(245,240,232,0.28)",
};

/* ── File type config ─────────────────────────────────────────────────────── */
const FILE_TYPE_MAP = {
  pdf: { color: "#EF4444", label: "PDF" },
  png: { color: "#8B5CF6", label: "Image" },
  jpg: { color: "#8B5CF6", label: "Image" },
  jpeg: { color: "#8B5CF6", label: "Image" },
  webp: { color: "#8B5CF6", label: "Image" },
  mp4: { color: "#F59E0B", label: "Video" },
  mp3: { color: "#10B981", label: "Audio" },
  doc: { color: "#3B82F6", label: "Document" },
  docx: { color: "#3B82F6", label: "Document" },
  zip: { color: "#F97316", label: "Archive" },
  folder: { color: G.bright, label: "Folder" },
};

const getFileType = (name = "", isFolder = false) => {
  if (isFolder) return FILE_TYPE_MAP.folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return (
    FILE_TYPE_MAP[ext] || { color: T.dim, label: ext.toUpperCase() || "File" }
  );
};

/* ── SVG Icon set (custom, no lucide) ─────────────────────────────────────── */
const IconGrid = ({ size = 14, color = T.dim }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="7" height="7" rx="1.5" fill={color} />
    <rect x="14" y="3" width="7" height="7" rx="1.5" fill={color} />
    <rect x="3" y="14" width="7" height="7" rx="1.5" fill={color} />
    <rect x="14" y="14" width="7" height="7" rx="1.5" fill={color} />
  </svg>
);
const IconList = ({ size = 14, color = T.dim }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="2.5" rx="1.25" fill={color} />
    <rect x="3" y="10.75" width="18" height="2.5" rx="1.25" fill={color} />
    <rect x="3" y="17.5" width="18" height="2.5" rx="1.25" fill={color} />
  </svg>
);
const IconSearch = ({ size = 13, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);
const IconFolder = ({ size = 32, color = G.bright }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M3 7a2 2 0 012-2h4.586a1 1 0 01.707.293L11.707 6.7A1 1 0 0012.414 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="1.4"
    />
    <path d="M3 10h18" stroke={color} strokeWidth="1.2" strokeOpacity="0.5" />
  </svg>
);
const IconFile = ({ size = 28, color = T.dim }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      fill={color}
      fillOpacity="0.15"
      stroke={color}
      strokeWidth="1.4"
    />
    <path
      d="M14 2v6h6"
      stroke={color}
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M8 13h8M8 17h5"
      stroke={color}
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);
const IconChevronRight = ({ size = 12, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IconClose = ({ size = 14, color = T.secondary }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);
const IconPlus = ({ size = 13, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const IconSort = ({ size = 13, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
  >
    <path d="M3 6h18M6 12h12M10 18h4" />
  </svg>
);
const IconTrash = ({ size = 13, color = "#F87171" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);
const IconUpload = ({ size = 20, color = G.bright }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
);
const IconBack = ({ size = 13, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconForward = ({ size = 13, color = T.dim }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const IconCheck = ({ size = 11, color = "#4ADE80" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/* ── Context Menu ─────────────────────────────────────────────────────────── */
const ContextMenu = memo(
  ({ x, y, item, onRename, onDelete, onMove, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
      const handler = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
      };
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler);
      return () => {
        document.removeEventListener("mousedown", handler);
        document.removeEventListener("touchstart", handler);
      };
    }, [onClose]);

    const menuItems = [
      { label: "Rename", action: onRename, color: T.primary },
      { label: "Move to", action: onMove, color: T.primary },
      {
        label: "Delete",
        action: onDelete,
        color: "#F87171",
        icon: <IconTrash size={11} />,
      },
    ];

    // Adjust position so menu doesn't overflow
    const adjustedX = Math.min(x, window.innerWidth - 160);
    const adjustedY = Math.min(y, window.innerHeight - 140);

    return createPortal(
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="fixed z-[99999] w-40 rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        style={{
          left: adjustedX,
          top: adjustedY,
          background: V.elevated,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="px-3 py-2 border-b"
          style={{ borderColor: "rgba(255,255,255,0.05)" }}
        >
          <p
            className="text-[9px] font-black uppercase tracking-widest truncate"
            style={{ color: T.dim }}
          >
            {item?.name || "Item"}
          </p>
        </div>
        {menuItems.map((m) => (
          <button
            key={m.label}
            onClick={() => {
              m.action?.();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-bold transition-all hover:bg-white/[0.04] text-left"
            style={{ color: m.color }}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </motion.div>,
      document.body,
    );
  },
);

/* ── Single file / folder item ───────────────────────────────────────────── */
const ExplorerItem = memo(
  ({
    item,
    viewMode,
    isSelected,
    onSelect,
    onOpen,
    onContextMenu,
    isDragOver,
  }) => {
    const fileType = getFileType(item.name, item.isFolder);
    const longPressRef = useRef(null);

    const handleTouchStart = (e) => {
      longPressRef.current = setTimeout(() => {
        onContextMenu(e.touches[0].clientX, e.touches[0].clientY, item);
      }, 500);
    };
    const handleTouchEnd = () => {
      if (longPressRef.current) clearTimeout(longPressRef.current);
    };

    if (viewMode === "list") {
      return (
        <motion.div
          layout
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "flex items-center gap-3 px-4 py-3 cursor-pointer group transition-all select-none",
            isSelected && "bg-[rgba(191,162,100,0.06)]",
            isDragOver && "bg-[rgba(191,162,100,0.1)]",
          )}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
          onClick={() => onSelect(item.id)}
          onDoubleClick={() => onOpen(item)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e.clientX, e.clientY, item);
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Selection indicator */}
          <div
            className={cn(
              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
              isSelected
                ? "border-[#BFA264] bg-[#BFA264]/20"
                : "border-white/10",
            )}
          >
            {isSelected && <IconCheck size={8} />}
          </div>

          {/* Icon */}
          <div className="shrink-0">
            {item.isFolder ? (
              <IconFolder size={18} color={fileType.color} />
            ) : (
              <IconFile size={16} color={fileType.color} />
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p
              className="text-[12px] font-semibold truncate"
              style={{ color: T.primary }}
            >
              {item.name}
            </p>
            {item.status && (
              <p
                className="text-[9px] font-bold uppercase tracking-wider mt-0.5"
                style={{
                  color:
                    item.status === "VERIFIED"
                      ? "#4ADE80"
                      : item.status === "PENDING"
                        ? "#F59E0B"
                        : T.dim,
                }}
              >
                {item.status}
              </p>
            )}
          </div>

          {/* Type */}
          <div
            className="hidden sm:block w-20 text-[9px] font-bold uppercase tracking-wider text-right"
            style={{ color: fileType.color }}
          >
            {fileType.label}
          </div>

          {/* Date */}
          <div
            className="hidden md:block w-28 text-[9px] font-mono text-right"
            style={{ color: T.dim }}
          >
            {item.date || "—"}
          </div>

          {/* Size */}
          <div
            className="w-16 text-[9px] font-mono text-right"
            style={{ color: T.dim }}
          >
            {item.size || "—"}
          </div>
        </motion.div>
      );
    }

    // Grid view
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        className={cn(
          "relative flex flex-col items-center gap-2.5 p-3 rounded-xl cursor-pointer group select-none transition-all",
          isSelected ? "bg-[rgba(191,162,100,0.08)]" : "hover:bg-white/[0.03]",
          isDragOver && "ring-1 ring-[#BFA264]/50 bg-[rgba(191,162,100,0.06)]",
        )}
        onClick={() => onSelect(item.id)}
        onDoubleClick={() => onOpen(item)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, item);
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ minWidth: 80, maxWidth: 100 }}
      >
        {/* Selection ring */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#BFA264] flex items-center justify-center z-10">
            <IconCheck size={8} color="#000" />
          </div>
        )}

        {/* Status dot */}
        {item.status && (
          <div
            className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full z-10"
            style={{
              background:
                item.status === "VERIFIED"
                  ? "#4ADE80"
                  : item.status === "PENDING"
                    ? "#F59E0B"
                    : "transparent",
              boxShadow:
                item.status === "VERIFIED"
                  ? "0 0 6px #4ADE80"
                  : "0 0 6px #F59E0B",
            }}
          />
        )}

        {/* Icon */}
        <div
          className="flex items-center justify-center w-14 h-14 rounded-2xl transition-all group-hover:scale-105"
          style={{ background: `${fileType.color}15` }}
        >
          {item.isFolder ? (
            <IconFolder size={32} color={fileType.color} />
          ) : (
            <IconFile size={28} color={fileType.color} />
          )}
        </div>

        {/* Name */}
        <p
          className="text-[9px] font-bold text-center leading-tight w-full truncate px-1"
          style={{ color: T.secondary }}
        >
          {item.name}
        </p>
      </motion.div>
    );
  },
);

/* ── Drop Zone ────────────────────────────────────────────────────────────── */
const DropZone = memo(({ onUpload }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  return (
    <motion.div
      className={cn(
        "w-full flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
        isDragOver
          ? "border-[#BFA264]/60 bg-[rgba(191,162,100,0.05)]"
          : "border-white/10 hover:border-[#BFA264]/30 hover:bg-white/[0.02]",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onUpload?.(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      whileHover={{ scale: 1.005 }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => onUpload?.(e.target.files)}
      />
      <motion.div
        animate={isDragOver ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <IconUpload
          size={28}
          color={isDragOver ? G.bright : "rgba(191,162,100,0.4)"}
        />
      </motion.div>
      <p
        className="text-[11px] font-black mt-3 tracking-widest uppercase"
        style={{ color: isDragOver ? G.bright : "rgba(191,162,100,0.5)" }}
      >
        {isDragOver ? "Drop to upload" : "Drop files here"}
      </p>
      <p className="text-[9px] font-mono mt-1" style={{ color: T.dim }}>
        or click to browse
      </p>
    </motion.div>
  );
});

/* ── Sidebar folder tree ──────────────────────────────────────────────────── */
const SidebarItem = memo(({ folder, isActive, depth = 0, onClick }) => (
  <motion.button
    onClick={() => onClick(folder)}
    whileHover={{ x: 2 }}
    className={cn(
      "w-full flex items-center gap-2.5 py-2 rounded-xl text-left transition-all",
      depth > 0 ? "pl-6" : "px-2",
      isActive ? "bg-[rgba(191,162,100,0.08)]" : "hover:bg-white/[0.03]",
    )}
  >
    <IconFolder
      size={14}
      color={isActive ? G.bright : "rgba(191,162,100,0.5)"}
    />
    <span
      className="text-[11px] font-bold truncate"
      style={{ color: isActive ? G.bright : T.secondary }}
    >
      {folder.name}
    </span>
    {folder.count > 0 && (
      <span
        className="ml-auto text-[9px] font-black shrink-0"
        style={{ color: T.dim }}
      >
        {folder.count}
      </span>
    )}
  </motion.button>
));

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {Array} assets - Array of vault asset objects from Firestore
 * @param {Array} folders - Array of folder objects {id, name, parentId}
 * @param {function} onUpload - Called with FileList when user drops/selects files
 * @param {function} onDelete - Called with item id
 * @param {function} onRename - Called with (id, newName)
 * @param {function} onCreateFolder - Called with (name, parentId)
 * @param {function} onMoveItem - Called with (itemId, targetFolderId)
 */
const ExplorerModel = ({
  isOpen,
  onClose,
  assets = [],
  folders = [],
  onUpload,
  onDelete,
  onRename,
  onCreateFolder,
  onMoveItem,
}) => {
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date"); // "name" | "date" | "size" | "type"
  const [sortDir, setSortDir] = useState("desc");
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = root
  const [historyStack, setHistoryStack] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null); // { x, y, item }
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [isMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  const sortMenuRef = useRef(null);
  const renameInputRef = useRef(null);

  // Build folder tree
  const rootFolders = useMemo(
    () => folders.filter((f) => !f.parentId || f.parentId === null),
    [folders],
  );

  const sidebarFolders = useMemo(
    () => [
      { id: null, name: "All Files", count: assets.length },
      ...rootFolders.map((f) => ({
        ...f,
        count: assets.filter((a) => a.folderId === f.id).length,
      })),
    ],
    [rootFolders, assets],
  );

  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return "All Files";
    return folders.find((f) => f.id === currentFolderId)?.name || "Folder";
  }, [currentFolderId, folders]);

  // Filter + sort items
  const displayItems = useMemo(() => {
    let items = assets
      .filter((a) => {
        if (currentFolderId !== null && a.folderId !== currentFolderId)
          return false;
        if (currentFolderId === null && !searchQuery && a.folderId)
          return false; // only root items when no search
        if (searchQuery)
          return (a.name || a.title || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        return true;
      })
      .map((a) => ({
        ...a,
        name: a.title || a.name || a.category || "Asset",
        isFolder: false,
        date: a.uploadedAt
          ? new Date(a.uploadedAt).toLocaleDateString()
          : a.createdAt
            ? new Date(a.createdAt?.seconds * 1000).toLocaleDateString()
            : null,
      }));

    // Add sub-folders of current dir when not searching
    if (!searchQuery) {
      const subFolders = folders.filter((f) => f.parentId === currentFolderId);
      items = [
        ...subFolders.map((f) => ({
          ...f,
          isFolder: true,
          name: f.name,
          date: f.createdAt
            ? new Date(f.createdAt?.seconds * 1000).toLocaleDateString()
            : null,
        })),
        ...items,
      ];
    }

    // Sort
    items.sort((a, b) => {
      // Folders always first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let compare = 0;
      if (sortBy === "name")
        compare = (a.name || "").localeCompare(b.name || "");
      else if (sortBy === "type")
        compare = (a.category || "").localeCompare(b.category || "");
      else compare = (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);

      return sortDir === "asc" ? compare : -compare;
    });

    return items;
  }, [assets, folders, currentFolderId, searchQuery, sortBy, sortDir]);

  const navigateTo = useCallback(
    (folderId) => {
      setHistoryStack((prev) => [...prev, currentFolderId]);
      setCurrentFolderId(folderId);
      setSelectedIds(new Set());
    },
    [currentFolderId],
  );

  const navigateBack = useCallback(() => {
    if (!historyStack.length) return;
    const prev = historyStack[historyStack.length - 1];
    setHistoryStack((s) => s.slice(0, -1));
    setCurrentFolderId(prev);
    setSelectedIds(new Set());
  }, [historyStack]);

  const handleOpen = useCallback(
    (item) => {
      if (item.isFolder) navigateTo(item.id);
    },
    [navigateTo],
  );

  const handleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((x, y, item) => {
    setContextMenu({ x, y, item });
  }, []);

  const handleRenameStart = useCallback((item) => {
    setRenamingId(item.id);
    setRenameValue(item.name);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }, []);

  const handleRenameCommit = useCallback(() => {
    if (renameValue.trim() && renamingId) {
      onRename?.(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renameValue, renamingId, onRename]);

  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim()) {
      onCreateFolder?.(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
    }
    setIsCreatingFolder(false);
  }, [newFolderName, currentFolderId, onCreateFolder]);

  const handleDeleteSelected = useCallback(() => {
    selectedIds.forEach((id) => onDelete?.(id));
    setSelectedIds(new Set());
  }, [selectedIds, onDelete]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!showSortMenu) return;
    const handler = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target))
        setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSortMenu]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const SORT_OPTIONS = [
    { key: "date", label: "Date Modified" },
    { key: "name", label: "Name" },
    { key: "type", label: "Type" },
  ];

  // ── MOBILE BOTTOM SHEET ──────────────────────────────────────────────────
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-[99999] flex flex-col rounded-t-[2rem] overflow-hidden"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.07)",
            maxHeight: "92dvh",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-pointer shrink-0"
            onClick={onClose}
          >
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-3">
              {historyStack.length > 0 && (
                <button
                  onClick={navigateBack}
                  className="p-1.5 rounded-lg"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <IconBack size={14} color={T.secondary} />
                </button>
              )}
              <span className="font-black text-sm" style={{ color: T.primary }}>
                {currentFolderName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setViewMode((v) => (v === "grid" ? "list" : "grid"))
                }
                className="p-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                {viewMode === "grid" ? (
                  <IconList size={14} color={T.secondary} />
                ) : (
                  <IconGrid size={14} color={T.secondary} />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <IconClose size={14} color={T.secondary} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-4 py-3 shrink-0">
            <div
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
              style={{
                background: V.surface,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <IconSearch size={13} color={T.dim} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files..."
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: T.primary }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <IconClose size={11} color={T.dim} />
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p
                  className="text-[11px] font-black uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Empty
                </p>
                <p
                  className="text-[10px] mt-1"
                  style={{ color: "rgba(255,255,255,0.12)" }}
                >
                  No files here yet
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-4 gap-2 pt-2">
                {displayItems.map((item) => (
                  <ExplorerItem
                    key={item.id}
                    item={item}
                    viewMode="grid"
                    isSelected={selectedIds.has(item.id)}
                    onSelect={handleSelect}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    isDragOver={dragOverId === item.id}
                  />
                ))}
              </div>
            ) : (
              <div className="pt-1">
                {displayItems.map((item) => (
                  <ExplorerItem
                    key={item.id}
                    item={item}
                    viewMode="list"
                    isSelected={selectedIds.has(item.id)}
                    onSelect={handleSelect}
                    onOpen={handleOpen}
                    onContextMenu={handleContextMenu}
                    isDragOver={dragOverId === item.id}
                  />
                ))}
              </div>
            )}
            <div className="mt-4">
              <DropZone onUpload={onUpload} />
            </div>
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body,
    );
  }

  // ── DESKTOP FULLSCREEN ───────────────────────────────────────────────────
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-6 xl:inset-12 z-[9999] flex flex-col rounded-3xl overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.9)]"
        style={{
          background: V.bg,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient top glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full blur-[80px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse, rgba(191,162,100,0.06) 0%, transparent 70%)",
          }}
        />

        {/* ── WINDOW CHROME ── */}
        <div
          className="flex items-center gap-4 px-5 py-3.5 shrink-0 relative z-10"
          style={{
            background: V.depth,
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all"
              title="Close"
            />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>

          {/* Back / Forward */}
          <div className="flex items-center gap-1">
            <button
              onClick={navigateBack}
              disabled={!historyStack.length}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.04)" }}
              title="Go back"
            >
              <IconBack size={12} color={T.secondary} />
            </button>
            <button
              disabled
              className="p-1.5 rounded-lg opacity-20"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <IconForward size={12} color={T.secondary} />
            </button>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setHistoryStack([]);
              }}
              className="text-[10px] font-bold transition-colors hover:text-white"
              style={{ color: T.dim }}
            >
              Vault
            </button>
            {currentFolderId && (
              <>
                <IconChevronRight size={10} color={T.dim} />
                <span
                  className="text-[10px] font-bold truncate"
                  style={{ color: T.primary }}
                >
                  {currentFolderName}
                </span>
              </>
            )}
          </div>

          {/* Search bar */}
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl w-56"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <IconSearch size={12} color={T.dim} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="flex-1 bg-transparent text-[11px] outline-none"
              style={{ color: T.primary }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <IconClose size={10} color={T.dim} />
              </button>
            )}
          </div>

          {/* Sort button */}
          <div ref={sortMenuRef} className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{
                background: showSortMenu ? G.dimBg : "rgba(255,255,255,0.04)",
                color: showSortMenu ? G.bright : T.dim,
                border: showSortMenu
                  ? `1px solid ${G.border}`
                  : "1px solid rgba(255,255,255,0.06)",
              }}
              title="Sort files"
            >
              <IconSort size={12} color={showSortMenu ? G.bright : T.dim} />
              Sort
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.8)] z-50"
                  style={{
                    background: V.elevated,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setSortBy(opt.key);
                        setSortDir((d) =>
                          opt.key === sortBy
                            ? d === "asc"
                              ? "desc"
                              : "asc"
                            : "desc",
                        );
                        setShowSortMenu(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 text-[11px] font-bold transition-all hover:bg-white/[0.04]"
                      style={{
                        color: sortBy === opt.key ? G.bright : T.secondary,
                      }}
                    >
                      {opt.label}
                      {sortBy === opt.key && (
                        <span
                          className="text-[9px]"
                          style={{ color: G.bright }}
                        >
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div
            className="flex items-center rounded-xl overflow-hidden p-0.5"
            style={{
              background: V.surface,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "grid"
                  ? "bg-[rgba(191,162,100,0.12)]"
                  : "opacity-40 hover:opacity-70",
              )}
              title="Grid view"
            >
              <IconGrid
                size={13}
                color={viewMode === "grid" ? G.bright : T.dim}
              />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === "list"
                  ? "bg-[rgba(191,162,100,0.12)]"
                  : "opacity-40 hover:opacity-70",
              )}
              title="List view"
            >
              <IconList
                size={13}
                color={viewMode === "list" ? G.bright : T.dim}
              />
            </button>
          </div>
        </div>

        {/* ── BODY: Sidebar + Content ── */}
        <div className="flex flex-1 min-h-0 relative z-10">
          {/* Sidebar */}
          <div
            className="w-52 shrink-0 flex flex-col p-3 overflow-y-auto custom-scrollbar"
            style={{
              background: V.depth,
              borderRight: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p
              className="text-[8px] font-black uppercase tracking-[0.25em] px-2 mb-2"
              style={{ color: T.dim }}
            >
              Locations
            </p>
            {sidebarFolders.map((folder) => (
              <SidebarItem
                key={folder.id ?? "__root__"}
                folder={folder}
                isActive={currentFolderId === folder.id}
                onClick={(f) => {
                  if (f.id !== currentFolderId) {
                    navigateTo(f.id);
                  }
                }}
              />
            ))}

            {/* New folder button */}
            <div
              className="mt-auto pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              {isCreatingFolder ? (
                <div className="flex flex-col gap-2 px-2">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateFolder();
                      if (e.key === "Escape") setIsCreatingFolder(false);
                    }}
                    placeholder="Folder name"
                    className="w-full bg-transparent border rounded-lg px-2 py-1.5 text-[10px] outline-none"
                    style={{ borderColor: G.border, color: T.primary }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreateFolder}
                      className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg"
                      style={{ background: G.dimBg, color: G.bright }}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingFolder(false)}
                      className="flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: T.dim,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[10px] font-bold transition-all hover:bg-white/[0.03]"
                  style={{ color: T.dim }}
                  title="Create new folder"
                >
                  <IconPlus size={11} color={T.dim} />
                  New Folder
                </button>
              )}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Action bar */}
            <div
              className="flex items-center justify-between px-5 py-2.5 shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold"
                  style={{ color: T.dim }}
                >
                  {displayItems.length} item
                  {displayItems.length !== 1 ? "s" : ""}
                </span>
                {selectedIds.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: G.bright }}
                    >
                      {selectedIds.size} selected
                    </span>
                    <button
                      onClick={handleDeleteSelected}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      style={{
                        background: "rgba(248,113,113,0.1)",
                        color: "#F87171",
                        border: "1px solid rgba(248,113,113,0.2)",
                      }}
                      title="Delete selected"
                    >
                      <IconTrash size={9} color="#F87171" />
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className="text-[9px] font-bold transition-all"
                      style={{ color: T.dim }}
                    >
                      Clear
                    </button>
                  </motion.div>
                )}
              </div>

              <button
                onClick={() =>
                  document.querySelector("#explorer-file-input")?.click()
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
                title="Upload files"
              >
                <IconUpload size={11} color={G.bright} />
                Upload
              </button>
              <input
                id="explorer-file-input"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => onUpload?.(e.target.files)}
              />
            </div>

            {/* Files area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
              {displayItems.length === 0 && !searchQuery ? (
                <DropZone onUpload={onUpload} />
              ) : displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p
                    className="text-[11px] font-black uppercase tracking-widest"
                    style={{ color: T.dim }}
                  >
                    No results
                  </p>
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: "rgba(255,255,255,0.12)" }}
                  >
                    Try a different search
                  </p>
                </div>
              ) : viewMode === "list" ? (
                <div>
                  {/* List header */}
                  <div
                    className="flex items-center px-4 py-2 mb-1"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div className="w-4 mr-3" />
                    <div className="w-5 mr-3" />
                    <div
                      className="flex-1 text-[8px] font-black uppercase tracking-[0.2em]"
                      style={{ color: T.dim }}
                    >
                      Name
                    </div>
                    <div
                      className="hidden sm:block w-20 text-[8px] font-black uppercase tracking-[0.2em] text-right"
                      style={{ color: T.dim }}
                    >
                      Type
                    </div>
                    <div
                      className="hidden md:block w-28 text-[8px] font-black uppercase tracking-[0.2em] text-right"
                      style={{ color: T.dim }}
                    >
                      Date
                    </div>
                    <div
                      className="w-16 text-[8px] font-black uppercase tracking-[0.2em] text-right"
                      style={{ color: T.dim }}
                    >
                      Size
                    </div>
                  </div>
                  {displayItems.map((item) =>
                    renamingId === item.id ? (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCommit();
                            if (e.key === "Escape") {
                              setRenamingId(null);
                            }
                          }}
                          onBlur={handleRenameCommit}
                          className="flex-1 bg-transparent border rounded-lg px-2 py-1 text-xs outline-none"
                          style={{ borderColor: G.border, color: T.primary }}
                        />
                      </div>
                    ) : (
                      <ExplorerItem
                        key={item.id}
                        item={item}
                        viewMode="list"
                        isSelected={selectedIds.has(item.id)}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onContextMenu={handleContextMenu}
                        isDragOver={dragOverId === item.id}
                      />
                    ),
                  )}
                </div>
              ) : (
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
                  }}
                >
                  {displayItems.map((item) =>
                    renamingId === item.id ? (
                      <div
                        key={item.id}
                        className="flex flex-col items-center gap-1 p-2"
                      >
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameCommit();
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onBlur={handleRenameCommit}
                          className="w-full bg-transparent border rounded-lg px-2 py-1 text-[9px] outline-none text-center"
                          style={{ borderColor: G.border, color: T.primary }}
                        />
                      </div>
                    ) : (
                      <ExplorerItem
                        key={item.id}
                        item={item}
                        viewMode="grid"
                        isSelected={selectedIds.has(item.id)}
                        onSelect={handleSelect}
                        onOpen={handleOpen}
                        onContextMenu={handleContextMenu}
                        isDragOver={dragOverId === item.id}
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Drop zone at bottom if items exist */}
            {displayItems.length > 0 && (
              <div className="px-5 pb-4 shrink-0">
                <DropZone onUpload={onUpload} />
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 py-2 shrink-0 relative z-10"
          style={{
            background: V.depth,
            borderTop: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <span className="text-[9px] font-mono" style={{ color: T.dim }}>
            {displayItems.filter((i) => !i.isFolder).length} file
            {displayItems.filter((i) => !i.isFolder).length !== 1 ? "s" : ""}
            {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
          </span>
          <span
            className="text-[9px] font-mono"
            style={{ color: "rgba(191,162,100,0.4)" }}
          >
            Discotive Vault
          </span>
        </div>
      </motion.div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            item={contextMenu.item}
            onRename={() => handleRenameStart(contextMenu.item)}
            onDelete={() => {
              onDelete?.(contextMenu.item.id);
            }}
            onMove={() => {
              /* TODO: Show folder picker */
            }}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </AnimatePresence>,
    document.body,
  );
};

export default ExplorerModel;
