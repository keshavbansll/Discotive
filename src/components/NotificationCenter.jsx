/**
 * @fileoverview NotificationCenter.jsx — Discotive OS
 * @description
 * Universal, cinematic notification system.
 * - Desktop: Dropdown from navbar bell icon
 * - Mobile: Native bottom sheet with swipe-to-delete gestures (L/R)
 * - First-delete confirmation with "don't show again" checkbox
 * - Paginated (20/page), routes notifications to their source page
 * - Hard-deletes from Firestore on swipe/button delete
 *
 * USAGE:
 *   import { NotificationBell } from './NotificationCenter';
 *   <NotificationBell userData={userData} patchLocalData={patchLocalData} />
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import {
  Bell,
  BellOff,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  Users,
  Shield,
  Trophy,
  FolderOpen,
  BookOpen,
  MessageCircle,
  Settings,
  ArrowRight,
  Target,
  Star,
  MoreHorizontal,
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

const PAGE_SIZE = 20;

// ─── Notification Route Map ───────────────────────────────────────────────────
const getNotificationRoute = (notif) => {
  const msg = (notif.message || "").toLowerCase();
  const type = (notif.type || "").toLowerCase();

  if (type === "alliance_request" || type === "alliance_accepted")
    return "/app/connective?tab=network";
  if (type === "dm" || type === "message") return "/app/connective?dm=menu";
  if (type === "competitor_tracked") return "/app/leaderboard";
  if (type === "mention") return "/app/connective/feed";
  if (type === "comment") return "/app/connective/feed";
  if (
    type === "vault" ||
    msg.includes("vault") ||
    msg.includes("asset") ||
    msg.includes("verified")
  )
    return "/app/vault";
  if (msg.includes("score") || msg.includes("pts") || msg.includes("rank"))
    return "/app/leaderboard";
  if (
    msg.includes("learn") ||
    msg.includes("certificate") ||
    msg.includes("video")
  )
    return "/app/learn";
  if (msg.includes("alliance") || msg.includes("network"))
    return "/app/connective?tab=network";
  if (msg.includes("settings")) return "/app/settings";
  if (msg.includes("profile")) return "/app/profile";
  return null;
};

const getNotificationIcon = (notif) => {
  const type = (notif.type || "").toLowerCase();
  const msg = (notif.message || "").toLowerCase();

  if (type === "alliance_request" || type === "alliance_accepted")
    return { Icon: Users, color: "#8b5cf6" };
  if (type === "dm" || type === "message")
    return { Icon: MessageCircle, color: "#38bdf8" };
  if (type === "competitor_tracked") return { Icon: Target, color: "#F87171" };
  if (type === "mention") return { Icon: Zap, color: G.bright };
  if (type === "comment") return { Icon: MessageCircle, color: "#10b981" };
  if (
    msg.includes("vault") ||
    msg.includes("asset") ||
    msg.includes("verified")
  )
    return { Icon: FolderOpen, color: "#4ADE80" };
  if (msg.includes("score") || msg.includes("pts"))
    return { Icon: Trophy, color: G.bright };
  if (msg.includes("pro") || msg.includes("tier"))
    return { Icon: Shield, color: G.bright };
  if (msg.includes("learn")) return { Icon: BookOpen, color: "#a78bfa" };
  if (msg.includes("settings")) return { Icon: Settings, color: T.dim };
  return { Icon: Bell, color: G.base };
};

// ─── Undo Snackbar Component ──────────────────────────────────────────────────
const UndoSnackbar = memo(({ onUndo, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(), 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center justify-between w-[90%] max-w-[340px] px-5 py-3.5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      style={{
        background: "#1A1A1A",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span className="text-[13px] font-medium text-white">Moved to Trash</span>
      <button
        onClick={onUndo}
        className="text-[12px] font-black uppercase tracking-wider text-[#D4AF78] hover:text-white transition-colors"
      >
        Undo
      </button>
    </motion.div>
  );
});

// ─── Single Mobile Notification Row (Swipeable) ───────────────────────────────
const SwipeableNotifRow = memo(({ notif, index, onDelete, onNavigate }) => {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const [now] = useState(() => Date.now());
  const rowRef = useRef(null);

  const { Icon, color } = getNotificationIcon(notif);
  const route = getNotificationRoute(notif);
  const timeStr =
    notif.time || notif.createdAt
      ? new Date(notif.createdAt || now).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now";

  const handleDragEnd = useCallback(
    (_, info) => {
      setIsDragging(false);
      const threshold = 80;
      // Only allow deletion via right-to-left swipe (negative x)
      if (info.offset.x < -threshold) {
        onDelete(index);
      }
    },
    [index, onDelete],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, overflow: "hidden" }} // Ensures fluid layout collapse
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      className="relative"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
    >
      {/* Destructive Red Background Reveal Layer */}
      <div className="absolute inset-0 bg-[#EF4444] flex items-center justify-end pr-6 pointer-events-none">
        <Trash2 className="w-5 h-5 text-white" />
      </div>

      <motion.div
        ref={rowRef}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.8, right: 0 }} // Snap elasticity explicitly designed for L-swipe
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        whileDrag={{ cursor: "grabbing" }}
        className="relative flex items-start gap-3 px-4 py-4 select-none z-10 w-full"
        style={{ x, background: V.depth, cursor: "grab" }}
        onClick={() => !isDragging && route && onNavigate(route)}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className="text-xs leading-relaxed font-medium"
            style={{ color: T.primary }}
          >
            {notif.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[10px] font-mono uppercase tracking-widest"
              style={{ color: T.dim }}
            >
              {timeStr}
            </span>
            {route && (
              <div
                className="flex items-center gap-1"
                style={{ color: G.base }}
              >
                <ArrowRight className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  View
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Unread dot */}
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
          style={{ background: G.base, boxShadow: `0 0 6px ${G.base}` }}
        />
      </motion.div>
    </motion.div>
  );
});

// ─── Desktop Notification Row ─────────────────────────────────────────────────
const DesktopNotifRow = memo(({ notif, index, onDelete, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { Icon, color } = getNotificationIcon(notif);
  const route = getNotificationRoute(notif);
  const timeStr =
    notif.time ||
    (notif.createdAt
      ? new Date(notif.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now");

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex items-start gap-3 px-4 py-3.5 group cursor-pointer transition-all"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => route && onNavigate(route)}
    >
      {/* Hover bg */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isHovered ? 1 : 0 }}
        style={{ background: "rgba(191,162,100,0.03)" }}
      />

      {/* Icon */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10 pr-7">
        <p className="text-[11px] leading-relaxed" style={{ color: T.primary }}>
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[9px] font-mono uppercase tracking-widest"
            style={{ color: T.dim }}
          >
            {timeStr}
          </span>
          {route && (
            <motion.div
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="flex items-center gap-1"
              style={{ color: G.base }}
            >
              <ArrowRight className="w-2.5 h-2.5" />
              <span className="text-[8px] font-black uppercase tracking-wider">
                Go
              </span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete button */}
      <motion.button
        animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.7 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
        className="absolute right-3 top-3 p-1.5 rounded-lg transition-all z-10"
        style={{ background: "rgba(248,113,113,0.08)", color: "#F87171" }}
      >
        <Trash2 className="w-3 h-3" />
      </motion.button>

      {/* Unread dot */}
      <div
        className="absolute right-3 bottom-3 w-1.5 h-1.5 rounded-full"
        style={{
          background: G.base,
          boxShadow: `0 0 5px ${G.base}`,
          opacity: isHovered ? 0 : 1,
        }}
      />
    </motion.div>
  );
});

// ─── Pagination Controls ──────────────────────────────────────────────────────
const Pagination = memo(({ page, totalPages, onPrev, onNext }) => (
  <div
    className="flex items-center justify-between px-5 py-3"
    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
  >
    <button
      disabled={page === 0}
      onClick={onPrev}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
      style={{
        background: page === 0 ? "transparent" : G.dimBg,
        color: page === 0 ? T.dim : G.bright,
        border: `1px solid ${page === 0 ? "transparent" : G.border}`,
      }}
    >
      <ChevronLeft className="w-3 h-3" /> Prev
    </button>
    <span className="text-[9px] font-mono" style={{ color: T.dim }}>
      {page + 1} / {totalPages}
    </span>
    <button
      disabled={page >= totalPages - 1}
      onClick={onNext}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
      style={{
        background: page >= totalPages - 1 ? "transparent" : G.dimBg,
        color: page >= totalPages - 1 ? T.dim : G.bright,
        border: `1px solid ${page >= totalPages - 1 ? "transparent" : G.border}`,
      }}
    >
      Next <ChevronRight className="w-3 h-3" />
    </button>
  </div>
));

// ─── Empty State ──────────────────────────────────────────────────────────────
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <BellOff className="w-7 h-7" style={{ color: "rgba(255,255,255,0.1)" }} />
      <div
        className="absolute inset-0 rounded-2xl animate-ping opacity-20"
        style={{ border: `1px solid ${G.base}` }}
      />
    </motion.div>
    <p
      className="text-sm font-black mb-2"
      style={{ color: "rgba(255,255,255,0.3)" }}
    >
      All clear, Operator.
    </p>
    <p
      className="text-[11px] leading-relaxed max-w-[200px]"
      style={{ color: T.dim }}
    >
      System events, alliance requests, and protocol updates will appear here.
    </p>
  </div>
));

// ─── Desktop Notification Panel ───────────────────────────────────────────────
const DesktopPanel = memo(
  ({
    notifications,
    page,
    totalPages,
    onPrev,
    onNext,
    onDelete,
    onDeleteAll,
    onNavigate,
    onClose,
  }) => {
    const paginated = notifications.slice(
      page * PAGE_SIZE,
      (page + 1) * PAGE_SIZE,
    );

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-0 top-full mt-3 w-[380px] rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.95)] z-[9999] flex flex-col"
        style={{
          background: V.depth,
          border: "1px solid rgba(255,255,255,0.06)",
          maxHeight: "80vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: V.surface,
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: G.dimBg }}
            >
              <Bell className="w-3 h-3" style={{ color: G.bright }} />
            </div>
            <span className="font-black text-sm" style={{ color: T.primary }}>
              Notifications
            </span>
            {notifications.length > 0 && (
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: G.dimBg,
                  color: G.bright,
                  border: `1px solid ${G.border}`,
                }}
              >
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onDeleteAll}
                className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all"
                style={{
                  color: "#F87171",
                  background: "rgba(248,113,113,0.08)",
                }}
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: T.dim, background: "rgba(255,255,255,0.04)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <AnimatePresence>
              {paginated.map((notif, idx) => (
                <DesktopNotifRow
                  key={`${page}-${idx}`}
                  notif={notif}
                  index={page * PAGE_SIZE + idx}
                  onDelete={onDelete}
                  onNavigate={onNavigate}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={onPrev}
            onNext={onNext}
          />
        )}

        {/* View All Button */}
        <div
          className="p-3 flex-shrink-0 flex flex-col"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.04)",
            background: V.surface,
          }}
        >
          <button
            onClick={() => {
              onClose();
              onNavigate("/app/notifications");
            }}
            className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl transition-all bg-transparent hover:bg-white/[0.03] text-[#D4AF78] text-[10px] font-black uppercase tracking-widest"
          >
            View All Notifications <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    );
  },
);

// ─── Mobile Bottom Sheet ──────────────────────────────────────────────────────
const MobileSheet = memo(
  ({
    notifications,
    page,
    totalPages,
    onPrev,
    onNext,
    onDelete,
    onDeleteAll,
    onNavigate,
    onClose,
  }) => {
    const sheetRef = useRef(null);
    const paginated = notifications.slice(
      page * PAGE_SIZE,
      (page + 1) * PAGE_SIZE,
    );

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998]"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
          }}
          onClick={onClose}
        />
        <motion.div
          ref={sheetRef}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col rounded-t-[2rem] overflow-hidden"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.07)",
            maxHeight: "90dvh",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-pointer flex-shrink-0"
            onClick={onClose}
          >
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: G.bright }} />
              <span className="font-black text-sm" style={{ color: T.primary }}>
                Notifications
              </span>
              {notifications.length > 0 && (
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{
                    background: G.dimBg,
                    color: G.bright,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onDeleteAll}
                className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all"
                style={{
                  color: "#F87171",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.2)",
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Swipe hint */}
          {notifications.length > 0 && (
            <div
              className="flex items-center justify-center gap-2 py-2 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="h-0.5 w-6 rounded-full"
                  style={{ background: "rgba(248,113,113,0.4)" }}
                />
                <span
                  className="text-[9px] font-mono uppercase tracking-widest"
                  style={{ color: T.dim }}
                >
                  Swipe left to delete
                </span>
                <div
                  className="h-0.5 w-6 rounded-full"
                  style={{ background: "rgba(248,113,113,0.4)" }}
                />
              </div>
            </div>
          )}

          {/* Notifications list */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {notifications.length === 0 ? (
              <EmptyState />
            ) : (
              paginated.map((notif, idx) => (
                <SwipeableNotifRow
                  key={`${page}-${idx}`}
                  notif={notif}
                  index={page * PAGE_SIZE + idx}
                  onDelete={onDelete}
                  onNavigate={(route) => {
                    onClose();
                    onNavigate(route);
                  }}
                  isFirst={idx === 0 && page === 0}
                />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-shrink-0">
              <Pagination
                page={page}
                totalPages={totalPages}
                onPrev={onPrev}
                onNext={onNext}
              />
            </div>
          )}

          {/* View All Button */}
          <div
            className="p-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
          >
            <button
              onClick={() => {
                onClose();
                onNavigate("/app/notifications");
              }}
              className="w-full py-3 flex items-center justify-center gap-2 rounded-xl transition-all text-[#D4AF78] text-[10px] font-black uppercase tracking-widest bg-[rgba(191,162,100,0.08)] hover:bg-[rgba(191,162,100,0.15)]"
            >
              View All Notifications <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  },
);

// ─── Main Export: NotificationBell ────────────────────────────────────────────
/**
 * @param {object} props
 * @param {object} props.userData - Full user document from Firestore
 * @param {function} props.patchLocalData - Local state patch function from useUserData()
 * @param {object} [props.db] - Firestore db instance (pass if not imported internally)
 */
export const NotificationBell = ({ userData, patchLocalData, db: dbProp }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [snackbar, setSnackbar] = useState(null);

  const containerRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const notifications = useMemo(
    () => userData?.notifications || [],
    [userData?.notifications],
  );
  const unreadCount = notifications.length;
  const hasUnread = userData?.hasUnreadNotifications ?? unreadCount > 0;
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));

  // Mark read on open
  useEffect(() => {
    if (!isOpen || !hasUnread || !userData?.uid) return;
    patchLocalData({ hasUnreadNotifications: false });
    // NOTE: Pass your db instance as prop or import directly
    // updateDoc(doc(db, "users", userData.uid), { hasUnreadNotifications: false }).catch(() => {});
  }, [isOpen, hasUnread, userData?.uid, patchLocalData]);

  // Close on outside click (desktop)
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isMobile]);

  // Reset page when notifications change (Deferred to prevent cascading renders)
  useEffect(() => {
    const timer = setTimeout(() => setPage(0), 0);
    return () => clearTimeout(timer);
  }, [notifications.length]);

  const handleNavigate = useCallback(
    (route) => {
      setIsOpen(false);
      navigate(route);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (idx) => {
      if (!userData?.uid) return;
      const itemToDelete = notifications[idx];
      const updated = [...notifications];
      updated.splice(idx, 1);

      // Optimistic Delete Update
      patchLocalData({ notifications: updated, hasUnreadNotifications: false });
      setSnackbar({ item: itemToDelete, index: idx });

      // Future Firestore write:
      // try { await updateDoc(doc(db, "users", userData.uid), { notifications: updated }); } catch {}
    },
    [notifications, userData?.uid, patchLocalData],
  );

  const handleUndo = useCallback(() => {
    if (!snackbar || !userData?.uid) return;
    const updated = [...notifications];
    updated.splice(snackbar.index, 0, snackbar.item); // Restore at exact original index

    // Optimistic Restore Update
    patchLocalData({ notifications: updated });
    setSnackbar(null);

    // Future Firestore write:
    // try { await updateDoc(doc(db, "users", userData.uid), { notifications: updated }); } catch {}
  }, [notifications, snackbar, userData?.uid, patchLocalData]);

  const handleDeleteAll = useCallback(async () => {
    if (!userData?.uid) return;
    patchLocalData({ notifications: [], hasUnreadNotifications: false });
    setIsOpen(false);
    try {
      // await updateDoc(doc(db, "users", userData.uid), { notifications: [], hasUnreadNotifications: false });
    } catch {}
  }, [userData?.uid, patchLocalData]);

  const sharedProps = {
    notifications,
    page,
    totalPages,
    onPrev: () => setPage((p) => Math.max(0, p - 1)),
    onNext: () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    onDelete: handleDelete,
    onDeleteAll: handleDeleteAll,
    onNavigate: handleNavigate,
    onClose: () => setIsOpen(false),
  };

  return (
    <>
      {/* Bell Trigger */}
      <div ref={containerRef} className="relative flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            if (isMobile) {
              navigate("/app/notifications");
            } else {
              setIsOpen((v) => !v);
            }
          }}
          className="relative p-2 md:p-2.5 rounded-full transition-all border"
          style={{
            background: isOpen ? "rgba(191,162,100,0.12)" : V.depth,
            borderColor: isOpen ? G.border : "rgba(255,255,255,0.07)",
            boxShadow: isOpen ? `0 0 20px rgba(191,162,100,0.12)` : "none",
            color: isOpen ? G.bright : "rgba(245,240,232,0.5)",
          }}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="w-4 h-4 md:w-5 md:h-5" />

          {/* Unread badge */}
          <AnimatePresence>
            {hasUnread && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{
                  background: "#EF4444",
                  borderColor: V.bg,
                  boxShadow: "0 0 8px rgba(239,68,68,0.6)",
                }}
              />
            )}
          </AnimatePresence>
        </motion.button>

        {/* Desktop Dropdown */}
        {!isMobile && (
          <AnimatePresence>
            {isOpen && <DesktopPanel {...sharedProps} />}
          </AnimatePresence>
        )}
      </div>

      {/* Mobile Bottom Sheet logic completely removed. Intercepted above to route natively to standalone page. */}

      {/* Undo Snackbar Overlay */}
      <AnimatePresence>
        {snackbar && (
          <UndoSnackbar
            item={snackbar.item}
            onUndo={handleUndo}
            onDismiss={() => setSnackbar(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Standalone Notification Page (full page view, any route) ─────────────────
export const NotificationPage = ({ userData, patchLocalData }) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [snackbar, setSnackbar] = useState(null);

  const notifications = useMemo(
    () => userData?.notifications || [],
    [userData?.notifications],
  );
  const totalPages = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const paginated = notifications.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const handleDelete = useCallback(
    (idx) => {
      if (!userData?.uid) return;
      const itemToDelete = notifications[idx];
      const updated = [...notifications];
      updated.splice(idx, 1);

      patchLocalData({ notifications: updated, hasUnreadNotifications: false });
      setSnackbar({ item: itemToDelete, index: idx });
    },
    [notifications, userData?.uid, patchLocalData],
  );

  const handleUndo = useCallback(() => {
    if (!snackbar || !userData?.uid) return;
    const updated = [...notifications];
    updated.splice(snackbar.index, 0, snackbar.item);

    patchLocalData({ notifications: updated });
    setSnackbar(null);
  }, [notifications, snackbar, userData?.uid, patchLocalData]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDeleteAll = useCallback(async () => {
    if (!userData?.uid) return;
    patchLocalData({ notifications: [], hasUnreadNotifications: false });
    setIsMenuOpen(false);
    // await updateDoc(doc(db, "users", userData.uid), { notifications: [], hasUnreadNotifications: false });
  }, [userData?.uid, patchLocalData]);

  const handleMarkAllRead = useCallback(async () => {
    if (!userData?.uid) return;
    patchLocalData({ hasUnreadNotifications: false });
    setIsMenuOpen(false);
    // await updateDoc(doc(db, "users", userData.uid), { hasUnreadNotifications: false });
  }, [userData?.uid, patchLocalData]);

  const handleNavigate = useCallback((route) => navigate(route), [navigate]);

  return (
    <div
      className="min-h-screen px-4 md:px-8 py-8 max-w-2xl mx-auto"
      style={{ background: V.bg }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8 relative z-50"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: G.dimBg, border: `1px solid ${G.border}` }}
            >
              <Bell className="w-3.5 h-3.5" style={{ color: G.bright }} />
            </div>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ color: T.primary, letterSpacing: "-0.02em" }}
            >
              Notifications
            </h1>
          </div>
          <p className="text-xs" style={{ color: T.dim }}>
            {notifications.length} total ·
            {isMobile ? "Swipe left to delete" : "Hover to delete"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 3-Dot Options Menu */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 rounded-xl transition-all hover:bg-white/5"
              style={{
                color: T.primary,
                background: isMenuOpen
                  ? "rgba(255,255,255,0.05)"
                  : "transparent",
              }}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[90]"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100]"
                    style={{
                      background: V.elevated,
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <button
                      onClick={handleMarkAllRead}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-bold transition-all hover:bg-white/5"
                      style={{ color: T.primary }}
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5"
                        style={{ color: "#4ADE80" }}
                      />
                      Mark all as read
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={handleDeleteAll}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-[11px] font-bold transition-all hover:bg-red-500/10"
                        style={{
                          color: "#F87171",
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete all
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Dynamic Close/Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-xl transition-all hover:bg-white/10"
            style={{
              color: T.primary,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>

      {/* Divider */}
      <div
        className="mb-6"
        style={{ height: 1, background: "rgba(255,255,255,0.05)" }}
      />

      {/* Notifications */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: "1px solid rgba(255,255,255,0.06)",
          background: V.depth,
        }}
      >
        {notifications.length === 0 ? (
          <EmptyState />
        ) : isMobile ? (
          <AnimatePresence mode="popLayout">
            {paginated.map((notif, idx) => (
              <SwipeableNotifRow
                key={
                  notif.id ||
                  `notif-${page}-${idx}-${(notif.message || "").slice(0, 15)}`
                }
                notif={notif}
                index={page * PAGE_SIZE + idx}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
                isFirst={idx === 0 && page === 0}
              />
            ))}
          </AnimatePresence>
        ) : (
          <AnimatePresence mode="popLayout">
            {paginated.map((notif, idx) => (
              <DesktopNotifRow
                key={`page${page}-${idx}`}
                notif={notif}
                index={page * PAGE_SIZE + idx}
                onDelete={handleDelete}
                onNavigate={handleNavigate}
              />
            ))}
          </AnimatePresence>
        )}

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          />
        )}
      </div>

      {/* Undo Snackbar Overlay */}
      <AnimatePresence>
        {snackbar && (
          <UndoSnackbar
            item={snackbar.item}
            onUndo={handleUndo}
            onDismiss={() => setSnackbar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
