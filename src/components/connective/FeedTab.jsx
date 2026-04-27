/**
 * @fileoverview FeedTab v5.0 — LinkedIn-grade 3-Column Execution Feed
 * @description
 * Complete architectural overhaul. FeedTab now owns its 3-column page layout.
 *
 * PC: Left (profile/nav) · Center (composer + feed) · Right (trending/suggested)
 * Mobile: Single-column, native-feel edge-to-edge cards, bottom-sheet comments.
 *
 * SECURITY: All mutations are backend-only intents (onLike, onPost, etc.).
 * No client-side count mutations. likedBy array cannot be self-mutated.
 *
 * PERFORMANCE: Virtualized feed. Memoized AST. Trending computed from
 * existing posts array (zero extra Firestore reads).
 *
 * BACKWARD COMPAT: New props are all optional with safe defaults.
 * Existing Connective.jsx prop contract remains unbroken.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageSquare,
  Share2,
  Bold,
  Italic,
  Link2,
  Hash,
  AtSign,
  Zap,
  Loader2,
  AlertTriangle,
  Crown,
  Send,
  Check,
  MoreHorizontal,
  Trash2,
  Flag,
  X,
  Database,
  FileText,
  Code2,
  Video,
  Award,
  ExternalLink,
  DollarSign,
  Flame,
  Keyboard,
  Users,
  TrendingUp,
  Crosshair,
  MessageCircle,
  RefreshCw,
  CornerDownRight,
  Plus,
  BarChart2,
  Target,
  Trophy,
  Activity,
  Radio,
  ArrowUpRight,
  Settings,
  ChevronRight,
  Bookmark,
  Bell,
  Star,
  Globe,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ── DESIGN TOKENS (synchronized with Dashboard v9) ─────────────────────────
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
  muted: "rgba(245,240,232,0.18)",
};

// ── UTILITIES ──────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Memoized rich-text AST compiler — called ONCE per unique string
const parseRichText = (text) => {
  if (!text) return null;
  return text.split("\n").map((line, lineIdx) => {
    if (!line.trim()) return <br key={lineIdx} />;
    const allTokens = [];
    const patterns = [
      { re: /\*\*(.+?)\*\*/g, type: "bold" },
      { re: /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, type: "italic" },
      { re: /\[(.+?)\]\((.+?)\)/g, type: "link" },
      { re: /@([\w.]+)/g, type: "mention" },
      { re: /#([\w]+)/g, type: "hashtag" },
    ];
    for (const { re, type } of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const noOverlap = !allTokens.some(
          (t) => m.index < t.end && re.lastIndex > t.start,
        );
        if (noOverlap)
          allTokens.push({ start: m.index, end: re.lastIndex, type, m });
      }
    }
    allTokens.sort((a, b) => a.start - b.start);
    const rendered = [];
    let cursor = 0;
    allTokens.forEach((token, i) => {
      if (cursor < token.start)
        rendered.push(
          <span key={`t-${lineIdx}-${i}`}>
            {line.slice(cursor, token.start)}
          </span>,
        );
      const { type, m } = token;
      if (type === "bold")
        rendered.push(
          <strong
            key={`b-${lineIdx}-${i}`}
            className="font-black text-[#F5F0E8]"
          >
            {m[1]}
          </strong>,
        );
      else if (type === "italic")
        rendered.push(
          <em
            key={`i-${lineIdx}-${i}`}
            className="italic text-[rgba(245,240,232,0.72)]"
          >
            {m[1]}
          </em>,
        );
      else if (type === "link")
        rendered.push(
          <a
            key={`l-${lineIdx}-${i}`}
            href={m[2]}
            target="_blank"
            rel="noreferrer"
            className="text-[#BFA264] hover:text-[#D4AF78] underline underline-offset-2 transition-colors"
          >
            {m[1]}
          </a>,
        );
      else if (type === "mention")
        rendered.push(
          <span
            key={`at-${lineIdx}-${i}`}
            className="text-[#BFA264] font-semibold cursor-pointer hover:underline"
          >
            @{m[1]}
          </span>,
        );
      else if (type === "hashtag")
        rendered.push(
          <span
            key={`ht-${lineIdx}-${i}`}
            className="text-sky-400 font-semibold cursor-pointer hover:underline"
          >
            #{m[1]}
          </span>,
        );
      cursor = token.end;
    });
    if (cursor < line.length)
      rendered.push(<span key={`tail-${lineIdx}`}>{line.slice(cursor)}</span>);
    return (
      <p
        key={lineIdx}
        className="text-[rgba(245,240,232,0.82)] text-[0.8125rem] leading-[1.65]"
        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400 }}
      >
        {rendered.length ? rendered : line}
      </p>
    );
  });
};

// ── ASSET INJECTION CARD ───────────────────────────────────────────────────
const ASSET_CONFIGS = {
  Certificate: {
    icon: Award,
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    border: "rgba(191,162,100,0.22)",
    label: "Certificate",
    glow: "rgba(191,162,100,0.15)",
  },
  Project: {
    icon: Code2,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.22)",
    label: "Project",
    glow: "rgba(139,92,246,0.12)",
  },
  Resume: {
    icon: FileText,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.22)",
    label: "Resume",
    glow: "rgba(56,189,248,0.12)",
  },
  Video: {
    icon: Video,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.22)",
    label: "Video",
    glow: "rgba(239,68,68,0.12)",
  },
  default: {
    icon: Database,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.18)",
    label: "Asset",
    glow: "rgba(107,114,128,0.08)",
  },
};

const AssetInjectionCard = memo(({ asset }) => {
  const config = ASSET_CONFIGS[asset?.category] || ASSET_CONFIGS.default;
  const Icon = config.icon;
  return (
    <div
      className="relative rounded-xl border overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-lg"
      style={{
        borderColor: config.border,
        background: `linear-gradient(135deg, ${config.bg}, rgba(0,0,0,0))`,
        boxShadow: `0 4px 24px ${config.glow}`,
      }}
      onClick={() => asset?.url && window.open(asset.url, "_blank")}
    >
      <div className="relative z-10 p-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
          style={{
            background: `${config.color}14`,
            borderColor: `${config.color}28`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
              style={{
                color: config.color,
                background: `${config.color}14`,
                borderColor: `${config.color}22`,
              }}
            >
              {config.label}
            </span>
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
              ✓ Verified
            </span>
          </div>
          <p className="text-[0.8125rem] font-bold text-[#F5F0E8] truncate">
            {asset?.title || asset?.name || "Untitled Asset"}
          </p>
          {asset?.credentials?.issuer && (
            <p className="text-[10px] mt-0.5 text-[rgba(245,240,232,0.38)]">
              {asset.credentials.issuer}
            </p>
          )}
        </div>
        {asset?.url && (
          <ExternalLink
            className="w-4 h-4 opacity-30 group-hover:opacity-70 transition-opacity shrink-0"
            style={{ color: config.color }}
          />
        )}
      </div>
    </div>
  );
});

// ── BOUNTY BADGE ───────────────────────────────────────────────────────────
const BountyBadge = memo(({ bounty }) => {
  if (!bounty || bounty <= 0) return null;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border"
      style={{
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.04))",
        borderColor: "rgba(245,158,11,0.22)",
      }}
    >
      <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <div>
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
          {bounty} pt Bounty
        </span>
        <span className="text-[9px] text-amber-400/50 ml-1.5">
          · Best reply wins
        </span>
      </div>
      <Flame className="w-3 h-3 text-amber-500/60 ml-auto" />
    </div>
  );
});

// ── COMMENT ROW ────────────────────────────────────────────────────────────
const CommentRow = memo(
  ({ comment, uid, isAdmin, depth = 0, onReply, onDelete }) => {
    const isNested = depth > 0;
    const isOwn = comment.authorId === uid;
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={cn("flex items-start gap-2.5 group", isNested && "ml-7")}
      >
        <div className="w-7 h-7 rounded-full bg-[#111] border border-[#BFA264]/20 flex items-center justify-center text-[10px] font-black text-[#BFA264] shrink-0 mt-0.5 overflow-hidden">
          {comment.authorAvatar ? (
            <img
              src={comment.authorAvatar}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            comment.authorName?.charAt(0)?.toUpperCase() || "O"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="rounded-xl rounded-tl-sm px-3 py-2.5 border transition-colors group-hover:border-[rgba(255,255,255,0.08)]"
            style={{
              background: "#0C0C0C",
              borderColor: "rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="text-[11px] font-bold text-[#F5F0E8]"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                {comment.authorName}
                {comment.authorUsername && (
                  <span className="text-[rgba(245,240,232,0.28)] font-normal ml-1">
                    @{comment.authorUsername}
                  </span>
                )}
              </span>
              <span className="text-[9px] text-[rgba(245,240,232,0.28)]">
                {timeAgo(comment.timestamp)}
              </span>
            </div>
            <p className="text-xs text-[rgba(245,240,232,0.70)] leading-[1.6]">
              {comment.textContent}
            </p>
          </div>
          <div className="flex items-center gap-3 mt-1 px-1">
            {!isNested && (
              <button
                onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-[9px] font-bold text-[rgba(245,240,232,0.22)] hover:text-[#BFA264] transition-colors uppercase tracking-widest"
              >
                <CornerDownRight className="w-3 h-3" /> Reply
              </button>
            )}
            {(isOwn || isAdmin) && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-[9px] font-bold text-[rgba(245,240,232,0.18)] hover:text-red-400 transition-colors uppercase tracking-widest"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  },
);

// ── COMMENT SECTION ────────────────────────────────────────────────────────
const CommentSection = memo(
  ({
    isAdmin,
    postId,
    uid,
    userData,
    onFetchComments,
    onAddComment,
    onDeleteComment,
  }) => {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const inputRef = useRef(null);

    const loadComments = useCallback(
      async (reset = false) => {
        setLoading(true);
        const { comments: fetched, lastDoc: ld } = await onFetchComments(
          postId,
          reset ? null : lastDoc,
        );
        if (reset) setComments(fetched);
        else setComments((prev) => [...prev, ...fetched]);
        setLastDoc(ld);
        setHasMore(fetched.length === 10);
        setLoaded(true);
        setLoading(false);
      },
      [postId, lastDoc, onFetchComments],
    );

    useEffect(() => {
      if (!loaded) loadComments(true);
    }, [loaded, loadComments]);

    const handleSubmit = async () => {
      if (!newComment.trim() || isSubmitting) return;
      setIsSubmitting(true);
      const commentId = await onAddComment(
        postId,
        newComment,
        replyingTo?.id || null,
      );
      if (commentId) {
        const authorName =
          `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
          "Operator";
        setComments((prev) => [
          {
            id: commentId,
            authorId: uid,
            authorName,
            authorUsername: userData?.identity?.username || "",
            authorAvatar: userData?.identity?.avatarUrl || null,
            textContent: newComment.trim(),
            parentCommentId: replyingTo?.id || null,
            timestamp: new Date(),
          },
          ...prev,
        ]);
        setNewComment("");
        setReplyingTo(null);
      }
      setIsSubmitting(false);
    };

    const handleDelete = async (commentId) => {
      await onDeleteComment(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    const handleReply = (comment) => {
      setReplyingTo(comment);
      setNewComment(`@${comment.authorUsername || comment.authorName} `);
      setTimeout(() => inputRef.current?.focus(), 80);
    };

    const topLevel = useMemo(
      () => comments.filter((c) => !c.parentCommentId),
      [comments],
    );
    const getReplies = useCallback(
      (parentId) => comments.filter((c) => c.parentCommentId === parentId),
      [comments],
    );

    return (
      <div className="pt-3 space-y-3">
        {/* Comment input */}
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#111] border border-[#BFA264]/20 flex items-center justify-center text-[10px] font-black text-[#BFA264] shrink-0 overflow-hidden">
            {userData?.identity?.avatarUrl ? (
              <img
                src={userData.identity.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              (userData?.identity?.firstName?.charAt(0) || "U").toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <div
              className={cn(
                "flex items-center rounded-xl px-3 py-2 border transition-all",
                replyingTo
                  ? "border-[rgba(191,162,100,0.32)]"
                  : "border-[rgba(255,255,255,0.07)]",
              )}
              style={{ background: V.depth }}
            >
              {replyingTo && (
                <div className="flex items-center gap-1.5 mr-2 shrink-0">
                  <CornerDownRight className="w-3 h-3 text-[#BFA264]/60" />
                  <span className="text-[10px] text-[#BFA264]/80 font-bold truncate max-w-[70px]">
                    @{replyingTo.authorUsername || replyingTo.authorName}
                  </span>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setNewComment("");
                    }}
                    className="text-[rgba(245,240,232,0.28)] hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && handleSubmit()
                }
                placeholder={replyingTo ? "Write a reply…" : "Add a comment…"}
                className="flex-1 bg-transparent text-xs text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
              newComment.trim() && !isSubmitting
                ? "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78]"
                : "bg-[#111] text-[rgba(245,240,232,0.18)] cursor-not-allowed",
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Thread list */}
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-[rgba(191,162,100,0.4)]" />
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {topLevel.map((comment) => (
                <div key={comment.id} className="relative">
                  <CommentRow
                    comment={comment}
                    uid={uid}
                    isAdmin={isAdmin}
                    depth={0}
                    onReply={handleReply}
                    onDelete={handleDelete}
                  />
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="relative mt-2">
                      <CommentRow
                        comment={reply}
                        uid={uid}
                        isAdmin={isAdmin}
                        depth={1}
                        onReply={handleReply}
                        onDelete={handleDelete}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </AnimatePresence>
            {hasMore && comments.length >= 10 && (
              <button
                onClick={() => loadComments(false)}
                disabled={loading}
                className="w-full text-center text-[9px] font-black text-[rgba(245,240,232,0.22)] hover:text-[#BFA264] transition-colors uppercase tracking-widest py-1"
              >
                {loading ? "Loading…" : "Load more comments"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

// ── MOBILE BOTTOM SHEET COMMENTS ───────────────────────────────────────────
const MobileCommentSheet = memo(
  ({ isOpen, onClose, postId, post, ...commentProps }) => (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[998]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 z-[999] rounded-t-[2rem] overflow-hidden"
            style={{
              background: "#0C0C0C",
              border: "1px solid rgba(255,255,255,0.07)",
              paddingBottom: "env(safe-area-inset-bottom)",
              maxHeight: "75vh",
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-[rgba(255,255,255,0.12)]" />
            </div>
            <div className="px-5 pb-2 flex items-center justify-between border-b border-[rgba(255,255,255,0.05)]">
              <p className="text-xs font-black text-[#F5F0E8] uppercase tracking-widest">
                Comments{" "}
                {post?.replyCount > 0 && (
                  <span className="text-[rgba(245,240,232,0.35)]">
                    ({post.replyCount})
                  </span>
                )}
              </p>
              <button
                onClick={onClose}
                className="text-[rgba(245,240,232,0.30)] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="overflow-y-auto px-4 py-3"
              style={{ maxHeight: "calc(75vh - 80px)" }}
            >
              <CommentSection postId={postId} {...commentProps} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  ),
);

// ── POST TYPE CONFIG ───────────────────────────────────────────────────────
const POST_TYPE_CONFIG = {
  update: {
    label: "Update",
    color: G.base,
    bg: G.dimBg,
    border: G.border,
    emoji: "⚡",
  },
  win: {
    label: "Win",
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.22)",
    emoji: "🏆",
  },
  question: {
    label: "Q&A",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.22)",
    emoji: "💡",
  },
};

// ── POST CARD (LinkedIn-grade redesign) ────────────────────────────────────
const PostCard = memo(
  ({
    isAdmin,
    post,
    uid,
    userData,
    onLike,
    onDelete,
    onFetchComments,
    onAddComment,
    onDeleteComment,
    onPeekOperator,
    onSendRequest,
    getConnectionStatus,
    isMobile = false,
  }) => {
    const TRUNCATE_CHARS = 240;
    const [expanded, setExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showMobileComments, setShowMobileComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const optionsRef = useRef(null);

    const isLiked = (post.likedBy || []).includes(uid);
    const isAuthor = post.authorId === uid;
    const isPro = post.authorTier === "PRO" || post.authorTier === "ENTERPRISE";
    const initials = post.authorName?.charAt(0)?.toUpperCase() || "O";
    const typeConfig = POST_TYPE_CONFIG[post.postType] || null;

    const connectionStatus = getConnectionStatus
      ? getConnectionStatus(post.authorId)
      : null;
    const isConnected = connectionStatus === "allied";
    const isPending = connectionStatus === "outbound_pending";

    const needsTruncation = (post.textContent || "").length > TRUNCATE_CHARS;
    const displayText =
      needsTruncation && !expanded
        ? post.textContent.slice(0, TRUNCATE_CHARS)
        : post.textContent;

    const parsedContent = useMemo(
      () => parseRichText(displayText),
      [displayText],
    );

    useEffect(() => {
      const fn = (e) => {
        if (optionsRef.current && !optionsRef.current.contains(e.target))
          setShowOptions(false);
      };
      document.addEventListener("mousedown", fn);
      return () => document.removeEventListener("mousedown", fn);
    }, []);

    const handleShare = async () => {
      const url = `${window.location.origin}/@${post.authorUsername || "operator"}`;
      try {
        await navigator.clipboard.writeText(url);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      } catch (_) {}
    };

    const handleLike = () => {
      setLikeAnimating(true);
      onLike(post.id);
      setTimeout(() => setLikeAnimating(false), 400);
    };

    return (
      <>
        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={cn(
            "relative overflow-hidden transition-all duration-200 group/card",
            isMobile
              ? "border-b border-[rgba(255,255,255,0.04)] bg-[#0A0A0A]"
              : "rounded-2xl border bg-[#0A0A0A] hover:border-[rgba(191,162,100,0.18)] hover:shadow-[0_2px_20px_rgba(0,0,0,0.5)]",
            !isMobile && isPro
              ? "border-[rgba(191,162,100,0.14)]"
              : !isMobile
                ? "border-[rgba(255,255,255,0.06)]"
                : "",
            post._optimistic && "opacity-60",
          )}
        >
          {/* PRO shimmer top line */}
          {isPro && !isMobile && (
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#BFA264]/50 to-transparent" />
          )}

          {/* Delete confirm overlay */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#030303]/92 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-2xl"
              >
                <p className="text-sm font-black text-white">
                  Delete this post?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await onDelete(post.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="px-5 py-2.5 bg-red-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-400 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.08)] text-[rgba(245,240,232,0.60)] text-[11px] font-black uppercase tracking-widest rounded-xl hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* CARD BODY */}
          <div
            className={cn(
              "relative z-10",
              isMobile ? "px-4 pt-4 pb-0" : "p-5 pb-0",
            )}
          >
            {/* ── HEADER ── */}
            <div className="flex items-start gap-3 mb-3.5">
              {/* Avatar */}
              <button
                className="relative shrink-0"
                onClick={() =>
                  onPeekOperator?.({
                    id: post.authorId,
                    identity: {
                      firstName: post.authorName?.split(" ")[0] || "",
                      lastName:
                        post.authorName?.split(" ").slice(1).join(" ") || "",
                      username: post.authorUsername,
                      domain: post.authorDomain,
                      avatarUrl: post.authorAvatar,
                    },
                  })
                }
              >
                <div className="w-11 h-11 rounded-full bg-[#181818] border-2 border-[#BFA264]/20 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden hover:border-[#BFA264]/50 transition-all duration-200">
                  {post.authorAvatar ? (
                    <img
                      src={post.authorAvatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                {isPro && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
                    <Crown className="w-2 h-2 text-black" />
                  </div>
                )}
              </button>

              {/* Author meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[13.5px] font-bold text-[#F5F0E8] leading-tight cursor-pointer hover:underline"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                    onClick={() =>
                      onPeekOperator?.({
                        id: post.authorId,
                        identity: {
                          firstName: post.authorName?.split(" ")[0] || "",
                          lastName:
                            post.authorName?.split(" ").slice(1).join(" ") ||
                            "",
                          username: post.authorUsername,
                          domain: post.authorDomain,
                          avatarUrl: post.authorAvatar,
                        },
                      })
                    }
                  >
                    {post.authorName}
                  </span>
                  {isPro && (
                    <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-widest">
                      PRO
                    </span>
                  )}
                  {typeConfig && (
                    <span
                      className="text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border"
                      style={{
                        color: typeConfig.color,
                        background: typeConfig.bg,
                        borderColor: typeConfig.border,
                      }}
                    >
                      {typeConfig.emoji} {typeConfig.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {post.authorDomain && (
                    <span className="text-[11px] text-[rgba(245,240,232,0.45)] font-medium">
                      {post.authorDomain}
                    </span>
                  )}
                  {post.authorUsername && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.14)" }}>·</span>
                      <span className="text-[10px] font-mono text-[rgba(245,240,232,0.28)]">
                        @{post.authorUsername}
                      </span>
                    </>
                  )}
                  <span style={{ color: "rgba(255,255,255,0.14)" }}>·</span>
                  <span className="text-[10px] font-mono text-[rgba(245,240,232,0.22)]">
                    {timeAgo(post.timestamp)}
                  </span>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Connect button — only non-authors, non-connected */}
                {!isAuthor && !isConnected && !isPending && onSendRequest && (
                  <button
                    onClick={() =>
                      onSendRequest({
                        id: post.authorId,
                        identity: {
                          firstName: post.authorName?.split(" ")[0],
                          lastName: post.authorName
                            ?.split(" ")
                            .slice(1)
                            .join(" "),
                          username: post.authorUsername,
                          domain: post.authorDomain,
                          avatarUrl: post.authorAvatar,
                        },
                      })
                    }
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all"
                    style={{
                      borderColor: G.border,
                      color: G.base,
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = G.dimBg;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Connect
                  </button>
                )}
                {!isAuthor && isConnected && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-emerald-400/70 uppercase tracking-wider">
                    <Check className="w-3 h-3" /> Allied
                  </span>
                )}
                {!isAuthor && isPending && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-[rgba(245,240,232,0.28)] uppercase tracking-wider">
                    Pending
                  </span>
                )}

                {/* Options */}
                <div className="relative" ref={optionsRef}>
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="w-8 h-8 flex items-center justify-center text-[rgba(245,240,232,0.22)] hover:text-[#BFA264] transition-colors rounded-lg hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showOptions && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-1 w-44 rounded-xl shadow-2xl z-50 overflow-hidden py-1 border"
                        style={{
                          background: V.surface,
                          borderColor: "rgba(255,255,255,0.08)",
                        }}
                      >
                        {(isAuthor || isAdmin) && (
                          <button
                            onClick={() => {
                              setShowOptions(false);
                              setShowDeleteConfirm(true);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-red-500/10 hover:text-red-400 transition-all text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Post
                          </button>
                        )}
                        {!isAuthor && (
                          <button
                            onClick={() => setShowOptions(false)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-[rgba(255,255,255,0.04)] hover:text-red-400 transition-all text-left"
                          >
                            <Flag className="w-3.5 h-3.5" /> Report
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="mb-3.5 space-y-1.5">
              {parsedContent}
              {needsTruncation && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-[13px] font-semibold hover:underline"
                  style={{ color: G.base }}
                >
                  {expanded ? "…see less" : "…see more"}
                </button>
              )}
            </div>

            {/* ── ASSET EMBED ── */}
            {post.linkedAsset && (
              <div className="mb-3.5">
                <AssetInjectionCard asset={post.linkedAsset} />
              </div>
            )}

            {/* ── BOUNTY ── */}
            {post.bounty > 0 && (
              <div className="mb-3.5">
                <BountyBadge bounty={post.bounty} />
              </div>
            )}

            {/* ── HASHTAGS ── */}
            {post.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-sky-400 border border-sky-500/20 bg-sky-500/8 cursor-pointer hover:bg-sky-500/15 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* ── ENGAGEMENT STATS LINE (LinkedIn-style) ── */}
            {(post.likesCount > 0 || post.replyCount > 0) && (
              <div className="flex items-center gap-4 py-2 border-b border-[rgba(255,255,255,0.04)]">
                {post.likesCount > 0 && (
                  <span className="text-[11.5px] text-[rgba(245,240,232,0.32)] hover:text-[rgba(245,240,232,0.55)] cursor-pointer transition-colors">
                    <span className="font-semibold text-[rgba(245,240,232,0.50)]">
                      {post.likesCount}
                    </span>{" "}
                    reaction{post.likesCount !== 1 ? "s" : ""}
                  </span>
                )}
                {post.replyCount > 0 && (
                  <button
                    onClick={() =>
                      isMobile
                        ? setShowMobileComments(true)
                        : setShowComments((v) => !v)
                    }
                    className="text-[11.5px] text-[rgba(245,240,232,0.32)] hover:text-[rgba(245,240,232,0.55)] cursor-pointer transition-colors"
                  >
                    <span className="font-semibold text-[rgba(245,240,232,0.50)]">
                      {post.replyCount}
                    </span>{" "}
                    comment{post.replyCount !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── ACTION BAR (LinkedIn-style 3-button row) ── */}
          <div
            className={cn(
              "flex items-center",
              isMobile ? "px-2 pb-1 pt-0.5" : "px-3 pb-3 pt-0.5",
            )}
          >
            {/* React */}
            <button
              onClick={handleLike}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150",
                isLiked
                  ? "text-red-500 bg-red-500/8"
                  : "text-[rgba(245,240,232,0.42)] hover:text-red-400 hover:bg-red-500/8",
              )}
            >
              <motion.div
                animate={likeAnimating ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 14 }}
              >
                <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
              </motion.div>
              <span>React</span>
            </button>

            {/* Comment */}
            <button
              onClick={() =>
                isMobile
                  ? setShowMobileComments(true)
                  : setShowComments((v) => !v)
              }
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150",
                showComments
                  ? "text-[#BFA264] bg-[rgba(191,162,100,0.08)]"
                  : "text-[rgba(245,240,232,0.42)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)]",
              )}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Comment</span>
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all duration-150 relative",
                isCopied
                  ? "text-emerald-400"
                  : "text-[rgba(245,240,232,0.42)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)]",
              )}
            >
              {isCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>{isCopied ? "Copied!" : "Share"}</span>
              <AnimatePresence>
                {isCopied && (
                  <motion.span
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute -top-8 right-2 text-[8px] font-black text-emerald-400 bg-[#0A0A0A] border border-emerald-500/20 px-2 py-1 rounded-md whitespace-nowrap"
                  >
                    Profile link copied!
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Desktop inline comments */}
          <AnimatePresence>
            {showComments && !isMobile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-5 pb-4 border-t border-[rgba(255,255,255,0.04)]">
                  <CommentSection
                    isAdmin={isAdmin}
                    postId={post.id}
                    uid={uid}
                    userData={userData}
                    onFetchComments={onFetchComments}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Optimistic overlay */}
          {post._optimistic && (
            <div className="absolute inset-0 bg-[#0A0A0A]/50 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-2xl">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#BFA264]/28 rounded-full shadow-xl">
                <Loader2 className="w-3 h-3 animate-spin text-[#BFA264]" />
                <span className="text-[10px] font-black text-[#BFA264] uppercase tracking-widest">
                  Transmitting…
                </span>
              </div>
            </div>
          )}
        </motion.article>

        {/* Mobile comments */}
        {isMobile && (
          <MobileCommentSheet
            isOpen={showMobileComments}
            onClose={() => setShowMobileComments(false)}
            postId={post.id}
            post={post}
            isAdmin={isAdmin}
            uid={uid}
            userData={userData}
            onFetchComments={onFetchComments}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
          />
        )}
      </>
    );
  },
);

// ── POST COMPOSER (full redesign — collapsed default, expand on focus) ─────
const POST_TYPES = [
  {
    id: "update",
    label: "Update",
    emoji: "⚡",
    desc: "Share execution progress",
  },
  { id: "win", label: "Win", emoji: "🏆", desc: "Celebrate a milestone" },
  { id: "question", label: "Q&A", emoji: "💡", desc: "Ask the network" },
];

const PostComposer = memo(
  ({ userData, onPost, isPosting, isMobile = false }) => {
    const [text, setText] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [postType, setPostType] = useState("update");
    const [bounty, setBounty] = useState(0);
    const [showBountyInput, setShowBountyInput] = useState(false);
    const textareaRef = useRef(null);
    const MAX = 1000;

    const isExpanded = isFocused || text.length > 0;

    const handleFormat = (syntax) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: e } = ta;
      const sel = text.slice(s, e);
      const map = {
        bold: `**${sel || "bold text"}**`,
        italic: `*${sel || "italic text"}*`,
        link: `[${sel || "link text"}](https://)`,
        mention: "@",
        hashtag: "#",
      };
      const ins = map[syntax] || "";
      const next = text.slice(0, s) + ins + text.slice(e);
      setText(next);
      setTimeout(() => {
        ta.focus();
        const p = s + ins.length;
        ta.setSelectionRange(p, p);
      }, 0);
    };

    const extractMeta = (t) => {
      const hashtags = [...t.matchAll(/#([\w]+)/g)].map((m) =>
        m[1].toLowerCase(),
      );
      const mentions = [...t.matchAll(/@([\w.]+)/g)].map((m) =>
        m[1].toLowerCase(),
      );
      return {
        hashtags: [...new Set(hashtags)],
        mentions: [...new Set(mentions)],
      };
    };

    const handleSubmit = async () => {
      if (!text.trim() || isPosting) return;
      const { hashtags, mentions } = extractMeta(text);
      const result = await onPost(text, {
        hashtags,
        mentions,
        bounty: bounty > 0 ? bounty : 0,
        postType,
      });
      if (result !== null) {
        setText("");
        setBounty(0);
        setShowBountyInput(false);
        setIsFocused(false);
      }
    };

    const avatarUrl = userData?.identity?.avatarUrl;
    const initials =
      `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U";
    const displayName =
      `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
      "Operator";
    const domain = userData?.identity?.domain || "";

    const TOOLBAR = [
      { icon: Bold, action: "bold", title: "Bold" },
      { icon: Italic, action: "italic", title: "Italic" },
      { icon: Link2, action: "link", title: "Link" },
      { icon: AtSign, action: "mention", title: "Mention" },
      { icon: Hash, action: "hashtag", title: "Hashtag" },
    ];

    return (
      <motion.div
        layout
        className={cn(
          "relative border transition-all duration-300 overflow-hidden",
          isMobile ? "rounded-none border-x-0 border-t-0" : "rounded-2xl",
          isExpanded
            ? "border-[rgba(191,162,100,0.30)] shadow-[0_0_40px_rgba(191,162,100,0.07)]"
            : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(191,162,100,0.14)]",
        )}
        style={{ background: V.surface }}
      >
        {/* Post type selector — only when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-4 pt-4 pb-2"
            >
              {POST_TYPES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  onClick={() => setPostType(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all",
                    postType === id
                      ? id === "win"
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : id === "question"
                          ? "bg-violet-500/15 border-violet-500/30 text-violet-400"
                          : "border-[rgba(191,162,100,0.35)] text-[#BFA264]"
                      : "border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.35)] hover:border-[rgba(255,255,255,0.12)]",
                  )}
                  style={
                    postType === id && id === "update"
                      ? { background: G.dimBg }
                      : {}
                  }
                >
                  <span>{emoji}</span> {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-[#181818] border-2 border-[#BFA264]/25 flex items-center justify-center text-sm font-black text-[#BFA264] shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            {!isExpanded && (
              <div
                onClick={() => {
                  setIsFocused(true);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }}
                className="cursor-text py-2.5 text-[13px] text-[rgba(245,240,232,0.30)] font-medium select-none"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Share an execution signal, @mention allies, use #hashtags…
              </div>
            )}
            {isExpanded && (
              <textarea
                ref={textareaRef}
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  if (!text) setIsFocused(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  postType === "win"
                    ? "What did you achieve? Share your win with the network…"
                    : postType === "question"
                      ? "What do you want to know? Ask the Discotive network…"
                      : "Share an execution signal, @mention allies, use #hashtags…"
                }
                rows={4}
                className="w-full bg-transparent text-[rgba(245,240,232,0.82)] placeholder-[rgba(245,240,232,0.22)] text-[0.8125rem] font-medium resize-none border-none outline-none leading-[1.65]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              />
            )}
          </div>
        </div>

        {/* Expanded toolbar */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              {/* Bounty input */}
              <AnimatePresence>
                {showBountyInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div
                      className="mx-4 mb-3 flex items-center gap-3 px-4 py-3 rounded-xl border"
                      style={{
                        background: "rgba(245,158,11,0.05)",
                        borderColor: "rgba(245,158,11,0.18)",
                      }}
                    >
                      <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-0.5">
                          Stake a Bounty
                        </p>
                        <p className="text-[9px] text-amber-400/55">
                          Offer Discotive pts. Best reply wins.
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={bounty}
                        onChange={(e) =>
                          setBounty(
                            Math.max(
                              0,
                              Math.min(500, parseInt(e.target.value) || 0),
                            ),
                          )
                        }
                        className="w-16 bg-[#0A0A0A] border border-amber-500/22 rounded-lg px-2 py-1 text-[11px] font-black text-amber-400 text-center outline-none"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom toolbar */}
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}
              >
                <div className="flex items-center gap-0.5">
                  {TOOLBAR.map(({ icon: Icon, action, title }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleFormat(action)}
                      title={title}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(245,240,232,0.28)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  <div className="w-px h-4 bg-[rgba(255,255,255,0.07)] mx-1" />
                  <button
                    type="button"
                    title="Stake Bounty"
                    onClick={() => setShowBountyInput((v) => !v)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                      showBountyInput
                        ? "bg-amber-500/14 text-amber-400"
                        : "text-[rgba(245,240,232,0.28)] hover:text-amber-400 hover:bg-amber-500/8",
                    )}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[10px] font-mono font-bold transition-colors",
                      text.length > 900
                        ? "text-amber-400"
                        : "text-[rgba(245,240,232,0.18)]",
                    )}
                  >
                    {text.length}/{MAX}
                  </span>
                  {bounty > 0 && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-amber-400 px-2 py-1 bg-amber-500/10 border border-amber-500/18 rounded-lg">
                      <DollarSign className="w-3 h-3" />
                      {bounty}pt
                    </span>
                  )}
                  {!isMobile && (
                    <span className="hidden md:flex items-center gap-1 text-[9px] text-[rgba(245,240,232,0.18)] font-mono">
                      <Keyboard className="w-3 h-3" /> ⌘↵
                    </span>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isPosting}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                      text.trim() && !isPosting
                        ? "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78] shadow-[0_0_20px_rgba(191,162,100,0.22)]"
                        : "bg-[#111] border border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.18)] cursor-not-allowed",
                    )}
                  >
                    {isPosting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isPosting ? "Posting…" : "Post"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

// ── FEED FILTER TABS ───────────────────────────────────────────────────────
const FeedFilterTabs = memo(
  ({ activeFilter, setActiveFilter, followingCount }) => (
    <div
      className="flex items-center border-b border-[rgba(255,255,255,0.05)]"
      style={{ background: V.surface, borderRadius: "16px 16px 0 0" }}
    >
      {[
        { id: "foryou", label: "For You" },
        { id: "following", label: "Following", badge: followingCount },
      ].map(({ id, label, badge }) => (
        <button
          key={id}
          onClick={() => setActiveFilter(id)}
          className={cn(
            "flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 text-[12px] font-black uppercase tracking-widest transition-all relative",
            activeFilter === id
              ? "text-[#F5F0E8]"
              : "text-[rgba(245,240,232,0.35)] hover:text-[rgba(245,240,232,0.65)]",
          )}
        >
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[rgba(191,162,100,0.12)] text-[#BFA264] border border-[rgba(191,162,100,0.20)]">
              {badge}
            </span>
          )}
          {activeFilter === id && (
            <motion.div
              layoutId="feedTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{ background: G.base }}
            />
          )}
        </button>
      ))}
    </div>
  ),
);

// ── POST SKELETON ──────────────────────────────────────────────────────────
const PostSkeleton = ({ isMobile = false }) => (
  <div
    className={cn(
      "border animate-pulse",
      isMobile
        ? "border-b border-x-0 border-t-0 px-4 pt-4 pb-3 bg-[#0A0A0A]"
        : "rounded-2xl border-[rgba(255,255,255,0.04)] p-5",
    )}
    style={{ background: isMobile ? undefined : V.surface }}
  >
    <div className="flex items-start gap-3 mb-4">
      <div className="w-11 h-11 rounded-full bg-[#181818] shrink-0" />
      <div className="flex-1">
        <div className="h-3.5 bg-[#181818] rounded-full w-32 mb-2" />
        <div className="h-2.5 bg-[#161616] rounded-full w-24" />
      </div>
      <div className="w-20 h-7 bg-[#181818] rounded-full" />
    </div>
    <div className="space-y-2 mb-4 pl-1">
      <div className="h-[13px] bg-[#161616] rounded-full w-full" />
      <div className="h-[13px] bg-[#161616] rounded-full w-[85%]" />
      <div className="h-[13px] bg-[#161616] rounded-full w-[60%]" />
    </div>
    <div className="flex gap-1 border-t border-[rgba(255,255,255,0.03)] pt-3">
      <div className="flex-1 h-8 bg-[#161616] rounded-xl" />
      <div className="flex-1 h-8 bg-[#161616] rounded-xl" />
      <div className="flex-1 h-8 bg-[#161616] rounded-xl" />
    </div>
  </div>
);

// ── EMPTY / ERROR ──────────────────────────────────────────────────────────
const EmptyFeed = ({ isFollowing }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 text-center"
  >
    <div
      className="w-20 h-20 rounded-[2rem] flex items-center justify-center mb-6 border"
      style={{
        background: "rgba(191,162,100,0.05)",
        borderColor: "rgba(191,162,100,0.14)",
      }}
    >
      {isFollowing ? (
        <Users className="w-9 h-9 text-[rgba(191,162,100,0.38)]" />
      ) : (
        <Zap className="w-9 h-9 text-[rgba(191,162,100,0.38)]" />
      )}
    </div>
    <h3
      className="text-xl text-[#F5F0E8] mb-2.5 tracking-tight"
      style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}
    >
      {isFollowing ? "No Ally Posts Yet" : "Feed is Empty"}
    </h3>
    <p className="text-sm text-[rgba(245,240,232,0.38)] max-w-[260px] leading-relaxed">
      {isFollowing
        ? "Form alliances with operators to see their execution signals here."
        : "Be the first to transmit an execution signal to the network."}
    </p>
  </motion.div>
);

const FeedError = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border"
      style={{
        background: "rgba(239,68,68,0.07)",
        borderColor: "rgba(239,68,68,0.18)",
      }}
    >
      <AlertTriangle className="w-7 h-7 text-red-400/65" />
    </div>
    <p className="text-base font-black text-red-400/75 mb-1">
      Transmission Lost
    </p>
    <p className="text-sm text-[rgba(245,240,232,0.28)] mb-5">
      Could not reach the network.
    </p>
    <button
      onClick={onRetry}
      className="px-6 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] text-sm font-bold text-[rgba(245,240,232,0.55)] hover:text-[#F5F0E8] rounded-xl transition-all"
    >
      Retry
    </button>
  </div>
);

// ── LEFT SIDEBAR ───────────────────────────────────────────────────────────
const LeftSidebar = memo(({ userData, networkStats = {}, uid }) => {
  const avatarUrl = userData?.identity?.avatarUrl;
  const firstName = userData?.identity?.firstName || "";
  const lastName = userData?.identity?.lastName || "";
  const displayName = `${firstName} ${lastName}`.trim() || "Operator";
  const domain = userData?.identity?.domain || "General";
  const username = userData?.identity?.username || "";
  const score = userData?.score || 0;
  const rank = userData?.rank || null;
  const tier = userData?.tier || "ESSENTIAL";
  const isPro = tier === "PRO" || tier === "ENTERPRISE";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "O";

  const NAV_LINKS = [
    { label: "Dashboard", to: "/app", icon: BarChart2 },
    { label: "Leaderboard", to: "/app/leaderboard", icon: Trophy },
    { label: "Vault", to: "/app/vault", icon: Database },
    { label: "Agenda", to: "/app/agenda", icon: Target },
    { label: "Settings", to: "/app/settings", icon: Settings },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Profile Card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: V.surface, borderColor: "rgba(255,255,255,0.06)" }}
      >
        {/* Cover banner */}
        <div className="h-16 bg-gradient-to-br from-[rgba(191,162,100,0.15)] to-[rgba(191,162,100,0.03)] relative border-b border-[rgba(255,255,255,0.04)]">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 50%, rgba(191,162,100,0.4) 0%, transparent 60%)",
            }}
          />
        </div>

        <div className="px-4 pb-4">
          {/* Avatar overlapping banner */}
          <div className="relative -mt-7 mb-3 flex items-end justify-between">
            <div className="w-14 h-14 rounded-full bg-[#181818] border-2 border-[#0F0F0F] flex items-center justify-center text-lg font-black text-[#BFA264] overflow-hidden shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {isPro && (
              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full uppercase tracking-widest">
                {tier}
              </span>
            )}
          </div>

          <p
            className="text-[14px] font-black text-[#F5F0E8] leading-tight mb-0.5"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {displayName}
          </p>
          <p className="text-[11px] text-[rgba(245,240,232,0.45)] mb-1">
            {domain}
          </p>
          {username && (
            <p className="text-[10px] font-mono text-[rgba(245,240,232,0.25)]">
              @{username}
            </p>
          )}

          {/* Score */}
          <div
            className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl border"
            style={{ background: G.dimBg, borderColor: G.border }}
          >
            <div>
              <p className="text-[9px] font-black text-[#BFA264] uppercase tracking-widest">
                Score
              </p>
              <p className="text-[15px] font-black font-mono text-[#F5F0E8] leading-tight">
                {score.toLocaleString()}
              </p>
            </div>
            {rank && (
              <div className="text-right">
                <p className="text-[9px] font-black text-[rgba(245,240,232,0.30)] uppercase tracking-widest">
                  Rank
                </p>
                <p className="text-[15px] font-black font-mono text-[#BFA264] leading-tight">
                  #{rank}
                </p>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              {
                label: "Alliances",
                val: networkStats.alliances ?? 0,
                color: "text-emerald-400",
              },
              {
                label: "Competitors",
                val: networkStats.competitors ?? 0,
                color: "text-red-400",
              },
            ].map(({ label, val, color }) => (
              <div
                key={label}
                className="text-center px-2 py-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
              >
                <p className={cn("text-[15px] font-black font-mono", color)}>
                  {val}
                </p>
                <p className="text-[9px] text-[rgba(245,240,232,0.28)] uppercase tracking-widest mt-0.5">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <Link
            to="/app/profile"
            className="mt-3 flex w-full items-center justify-center gap-2 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all"
            style={{
              borderColor: G.border,
              color: G.base,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = G.dimBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            View Profile <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Nav Links */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: V.surface, borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="p-2">
          {NAV_LINKS.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-[rgba(245,240,232,0.50)] hover:text-[#F5F0E8] hover:bg-[rgba(255,255,255,0.04)] transition-all"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
});

// ── RIGHT SIDEBAR ──────────────────────────────────────────────────────────
const RightSidebar = memo(
  ({
    trendingHashtags,
    suggestedUsers = [],
    networkStats = {},
    onSendRequest,
    getConnectionStatus,
    uid,
    onOpenDM,
    unreadDmCount = 0,
  }) => {
    return (
      <div className="flex flex-col gap-3">
        {/* DM Quick Access */}
        {onOpenDM && (
          <button
            onClick={onOpenDM}
            className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:border-[rgba(191,162,100,0.28)] hover:shadow-[0_0_20px_rgba(191,162,100,0.06)]"
            style={{
              background: V.surface,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-[#BFA264]" />
              {unreadDmCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#BFA264] rounded-full border-2 border-[#0F0F0F] flex items-center justify-center text-[7px] font-black text-[#030303]">
                  {Math.min(unreadDmCount, 9)}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-[12px] font-black text-[#F5F0E8]">
                Direct Messages
              </p>
              <p className="text-[10px] text-[rgba(245,240,232,0.35)]">
                {unreadDmCount > 0
                  ? `${unreadDmCount} unread`
                  : "No unread messages"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[rgba(245,240,232,0.25)]" />
          </button>
        )}

        {/* Trending Hashtags */}
        {trendingHashtags.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: V.surface,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#BFA264]" />
              <p className="text-[10px] font-black text-[rgba(245,240,232,0.35)] uppercase tracking-widest">
                Trending in Network
              </p>
            </div>
            <div className="px-2 pb-3">
              {trendingHashtags.map(({ tag, count }, idx) => (
                <div
                  key={tag}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-[rgba(245,240,232,0.22)] w-4 text-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-[12px] font-semibold text-[rgba(245,240,232,0.75)] group-hover:text-[#F5F0E8] transition-colors">
                        #{tag}
                      </p>
                      <p className="text-[9px] text-[rgba(245,240,232,0.25)]">
                        {count} post{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[rgba(245,240,232,0.20)] group-hover:text-[#BFA264] opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Operators */}
        {suggestedUsers.length > 0 && (
          <div
            className="rounded-2xl border overflow-hidden"
            style={{
              background: V.surface,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#BFA264]" />
                <p className="text-[10px] font-black text-[rgba(245,240,232,0.35)] uppercase tracking-widest">
                  Suggested Allies
                </p>
              </div>
              <Link
                to="/app/connective/network"
                className="text-[10px] font-black text-[#BFA264] hover:text-[#D4AF78] transition-colors flex items-center gap-1"
              >
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="px-2 pb-3 space-y-1">
              {suggestedUsers.slice(0, 4).map((user) => {
                const name =
                  `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                  user.identity?.username ||
                  "Operator";
                const uAvatar = user.identity?.avatarUrl;
                const uInitial = name.charAt(0).toUpperCase();
                const status = getConnectionStatus
                  ? getConnectionStatus(user.id)
                  : null;
                const isConnected = status === "allied";
                const isPending = status === "outbound_pending";
                const rateLimit =
                  networkStats.dailyRequestCount >=
                  networkStats.dailyRequestLimit;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(255,255,255,0.03)] transition-colors group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#181818] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-sm font-black text-[#BFA264] shrink-0 overflow-hidden">
                      {uAvatar ? (
                        <img
                          src={uAvatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        uInitial
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[rgba(245,240,232,0.80)] truncate">
                        {name}
                      </p>
                      <p className="text-[9px] text-[rgba(245,240,232,0.28)] truncate">
                        {user.identity?.domain || "General"}
                      </p>
                    </div>
                    {isConnected ? (
                      <span className="text-[9px] font-black text-emerald-400/70 uppercase tracking-wider shrink-0">
                        Allied
                      </span>
                    ) : isPending ? (
                      <span className="text-[9px] font-black text-[rgba(245,240,232,0.28)] uppercase tracking-wider shrink-0">
                        Sent
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          !rateLimit && onSendRequest?.(user);
                        }}
                        disabled={rateLimit}
                        className={cn(
                          "w-7 h-7 flex items-center justify-center border rounded-xl transition-all shrink-0",
                          rateLimit
                            ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.20)] cursor-not-allowed"
                            : "bg-[rgba(191,162,100,0.08)] border-[rgba(191,162,100,0.20)] text-[#BFA264] hover:bg-[rgba(191,162,100,0.18)]",
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Network Activity pulse */}
        <div
          className="rounded-2xl border px-4 py-3.5 flex items-center gap-3"
          style={{
            background: V.surface,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        >
          <div className="relative">
            <Radio className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] font-black text-[rgba(245,240,232,0.65)]">
              Network Active
            </p>
            <p className="text-[9px] text-[rgba(245,240,232,0.28)]">
              {networkStats.alliances ?? 0} allies connected
            </p>
          </div>
        </div>
      </div>
    );
  },
);

// ── VIRTUALIZED FEED CONTAINER ─────────────────────────────────────────────
const VirtualizedFeedContainer = ({
  posts,
  isAdmin,
  uid,
  userData,
  hasMorePosts,
  feedLoading,
  onLoadMore,
  onLike,
  onDelete,
  onFetchComments,
  onAddComment,
  onDeleteComment,
  onPeekOperator,
  onSendRequest,
  getConnectionStatus,
  isMobile,
}) => {
  const parentRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: hasMorePosts ? posts.length + 1 : posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? 180 : 280),
    overscan: 4,
  });

  useEffect(() => {
    const items = virtualizer.getVirtualItems();
    if (!items.length) return;
    const last = items[items.length - 1];
    if (last.index >= posts.length - 1 && hasMorePosts && !feedLoading)
      onLoadMore();
  }, [
    virtualizer.getVirtualItems(),
    hasMorePosts,
    feedLoading,
    onLoadMore,
    posts.length,
  ]);

  return (
    <div
      ref={parentRef}
      className={cn(
        "overflow-y-auto hide-scrollbar pb-12 w-full",
        !isMobile && "custom-scrollbar",
      )}
      style={{
        maxHeight: isMobile ? "calc(100dvh - 200px)" : "calc(100vh - 240px)",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const isLoader = vItem.index >= posts.length;
          const post = isLoader ? null : posts[vItem.index];
          return (
            <div
              key={isLoader ? "loader" : post?.id}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vItem.start}px)`,
                paddingBottom: isMobile ? 0 : "10px",
              }}
            >
              {isLoader ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-[rgba(191,162,100,0.38)]" />
                </div>
              ) : (
                <PostCard
                  isAdmin={isAdmin}
                  post={post}
                  uid={uid}
                  userData={userData}
                  onLike={onLike}
                  onDelete={onDelete}
                  onFetchComments={onFetchComments}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  onPeekOperator={onPeekOperator}
                  onSendRequest={onSendRequest}
                  getConnectionStatus={getConnectionStatus}
                  isMobile={isMobile}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── KEYBOARD NAV HOOK ──────────────────────────────────────────────────────
const useKeyboardNav = ({ posts, onLoadMore, hasMorePosts }) => {
  const [focusedIdx, setFocusedIdx] = useState(-1);
  useEffect(() => {
    const handler = (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      )
        return;
      if (e.key === "j" || e.key === "J") {
        setFocusedIdx((i) => {
          const n = Math.min(i + 1, posts.length - 1);
          if (n === posts.length - 2 && hasMorePosts) onLoadMore();
          return n;
        });
      } else if (e.key === "k" || e.key === "K") {
        setFocusedIdx((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [posts.length, hasMorePosts, onLoadMore]);
  return { focusedIdx };
};

// ═══════════════════════════════════════════════════════════════════════════
// FEED TAB v5.0 — Main Export
// Props contract: backward-compatible. New props all have safe defaults.
// ═══════════════════════════════════════════════════════════════════════════
const FeedTab = ({
  // Core (existing — unchanged)
  isAdmin,
  uid,
  userData,
  posts,
  feedLoading,
  feedError,
  hasMorePosts,
  isPosting,
  onPost,
  onLike,
  onLoadMore,
  onDelete,
  onFetchComments,
  onAddComment,
  onDeleteComment,
  onPeekOperator,
  // New (optional — safe defaults)
  onRefresh = null,
  allianceIds = [],
  suggestedUsers = [],
  networkStats = {},
  onOpenDM = null,
  unreadDmCount = 0,
  onSendRequest = null,
  getConnectionStatus = null,
}) => {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [activeFilter, setActiveFilter] = useState("foryou");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Keyboard nav (desktop only)
  useKeyboardNav({ posts, onLoadMore, hasMorePosts });

  // ── TRENDING HASHTAGS: computed from posts (zero extra Firestore reads) ──
  const trendingHashtags = useMemo(() => {
    const counts = {};
    (posts || []).forEach((p) =>
      (p.hashtags || []).forEach((h) => {
        counts[h] = (counts[h] || 0) + 1;
      }),
    );
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([tag, count]) => ({ tag, count }));
  }, [posts]);

  // ── FOLLOWING FILTER: client-side filter of already-fetched posts ────────
  const allianceIdSet = useMemo(
    () => new Set(allianceIds || []),
    [allianceIds],
  );
  const filteredPosts = useMemo(() => {
    if (activeFilter === "foryou") return posts;
    return (posts || []).filter(
      (p) => p.authorId === uid || allianceIdSet.has(p.authorId),
    );
  }, [posts, activeFilter, allianceIdSet, uid]);

  const followingPostCount = useMemo(
    () =>
      (posts || []).filter(
        (p) => p.authorId === uid || allianceIdSet.has(p.authorId),
      ).length,
    [posts, allianceIdSet, uid],
  );

  // Scroll sentinel for mobile fallback
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasMorePosts && !feedLoading) onLoadMore();
  }, [inView, hasMorePosts, feedLoading, onLoadMore]);

  const showSkeletons = feedLoading && posts.length === 0;
  const showEmpty = !feedLoading && !feedError && filteredPosts.length === 0;

  // ── CENTER FEED CONTENT ────────────────────────────────────────────────
  const feedContent = (
    <div className={cn("flex flex-col", isMobile ? "gap-0" : "gap-0")}>
      {/* Composer */}
      <PostComposer
        userData={userData}
        onPost={onPost}
        isPosting={isPosting}
        isMobile={isMobile}
      />

      {/* Feed filter tabs — sticky below composer */}
      <div className={cn("sticky z-30", isMobile ? "top-0" : "top-[56px]")}>
        <div
          className="flex items-center justify-between"
          style={{
            background: "rgba(3,3,3,0.95)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <FeedFilterTabs
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            followingCount={followingPostCount}
          />
          {/* Refresh button */}
          {onRefresh && (
            <div className="pr-3">
              <RefreshButton onRefresh={onRefresh} />
            </div>
          )}
        </div>
      </div>

      {/* Feed body */}
      {feedError ? (
        <FeedError onRetry={onLoadMore} />
      ) : showSkeletons ? (
        <div
          className={cn(
            isMobile
              ? "divide-y divide-[rgba(255,255,255,0.04)]"
              : "space-y-2.5 pt-2.5",
          )}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <PostSkeleton key={i} isMobile={isMobile} />
          ))}
        </div>
      ) : showEmpty ? (
        <EmptyFeed isFollowing={activeFilter === "following"} />
      ) : (
        <>
          <div className={cn(!isMobile && "pt-2.5")}>
            <VirtualizedFeedContainer
              posts={filteredPosts}
              isAdmin={isAdmin}
              uid={uid}
              userData={userData}
              hasMorePosts={hasMorePosts}
              feedLoading={feedLoading}
              onLoadMore={onLoadMore}
              onLike={onLike}
              onDelete={onDelete}
              onFetchComments={onFetchComments}
              onAddComment={onAddComment}
              onDeleteComment={onDeleteComment}
              onPeekOperator={onPeekOperator}
              onSendRequest={onSendRequest}
              getConnectionStatus={getConnectionStatus}
              isMobile={isMobile}
            />
          </div>
          <div ref={loadMoreRef} className="h-1" />
        </>
      )}
    </div>
  );

  // ── MOBILE: single column ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="w-full flex flex-col min-h-screen"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          background: V.bg,
        }}
      >
        {feedContent}
      </div>
    );
  }

  // ── DESKTOP: 3-column layout ──────────────────────────────────────────
  return (
    <div className="grid grid-cols-[280px_1fr] xl:grid-cols-[280px_1fr_300px] 2xl:grid-cols-[300px_1fr_320px] gap-5 w-full items-start">
      {/* LEFT SIDEBAR — sticky */}
      <aside className="sticky top-[72px] self-start max-h-[calc(100vh-80px)] overflow-y-auto hide-scrollbar">
        <LeftSidebar
          userData={userData}
          networkStats={networkStats}
          uid={uid}
        />
      </aside>

      {/* CENTER FEED */}
      <main className="min-w-0">{feedContent}</main>

      {/* RIGHT SIDEBAR — sticky, xl+ only */}
      <aside className="hidden xl:block sticky top-[72px] self-start max-h-[calc(100vh-80px)] overflow-y-auto hide-scrollbar">
        <RightSidebar
          trendingHashtags={trendingHashtags}
          suggestedUsers={suggestedUsers}
          networkStats={networkStats}
          onSendRequest={onSendRequest}
          getConnectionStatus={getConnectionStatus}
          uid={uid}
          onOpenDM={onOpenDM}
          unreadDmCount={unreadDmCount}
        />
      </aside>
    </div>
  );
};

// ── REFRESH BUTTON (inline helper) ────────────────────────────────────────
const RefreshButton = ({ onRefresh }) => {
  const [spinning, setSpinning] = useState(false);
  const handle = async () => {
    if (spinning || !onRefresh) return;
    setSpinning(true);
    await onRefresh();
    setSpinning(false);
  };
  return (
    <button
      onClick={handle}
      disabled={spinning}
      className={cn(
        "w-7 h-7 flex items-center justify-center rounded-xl border transition-all",
        "bg-[rgba(191,162,100,0.06)] border-[rgba(191,162,100,0.18)] text-[#BFA264]/70",
        "hover:text-[#D4AF78] hover:bg-[rgba(191,162,100,0.12)] hover:border-[rgba(191,162,100,0.30)]",
        spinning && "opacity-60 cursor-not-allowed",
      )}
    >
      <RefreshCw className={cn("w-3 h-3", spinning && "animate-spin")} />
    </button>
  );
};

export default FeedTab;
