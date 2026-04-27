/**
 * @fileoverview FeedTab v8.0 — Cryptic-Standard Execution Feed
 * @description
 * Complete rewrite to exactly match Cryptic's premium feed layout:
 * - Composer at top with toolbar (bullish/bearish style type selectors)
 * - Posts below: avatar + name + badge + time + follow btn + text + action bar
 * - Right sidebar: Pro upgrade card + Network Targets + Trending Topics
 * - No bento cards, no floating containers — clean editorial flow
 *
 * BUG FIX: Post redirect issue resolved — requireOnboarding gate is now
 * bypassed if the user document exists (existing users who predate the
 * onboardingComplete flag are not blocked).
 *
 * SEO/GEO/AEO: Structured data, semantic HTML, aria-labels throughout.
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
  Plus,
  ArrowUpRight,
  Trophy,
  RefreshCw,
  CornerDownRight,
  Bookmark,
  ImageIcon,
  Smile,
  BarChart2,
  Grid,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Helmet } from "react-helmet-async";

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  light: "#E8D5A3",
  dimBg: "rgba(191,162,100,0.08)",
  border: "rgba(191,162,100,0.25)",
};

// ── UTILITIES ──────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

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
            className="font-bold text-[#F5F0E8]"
          >
            {m[1]}
          </strong>,
        );
      else if (type === "italic")
        rendered.push(
          <em
            key={`i-${lineIdx}-${i}`}
            className="italic text-[rgba(245,240,232,0.75)]"
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
            className="text-sky-400 cursor-pointer hover:underline"
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
        className="text-[rgba(245,240,232,0.85)] text-[0.9375rem] leading-[1.75]"
      >
        {rendered.length ? rendered : line}
      </p>
    );
  });
};

// ── ASSET CONFIGS ──────────────────────────────────────────────────────────
const ASSET_CONFIGS = {
  Certificate: {
    icon: Award,
    color: "#BFA264",
    bg: "rgba(191,162,100,0.10)",
    border: "rgba(191,162,100,0.22)",
    label: "Certificate",
  },
  Project: {
    icon: Code2,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.22)",
    label: "Project",
  },
  Resume: {
    icon: FileText,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.22)",
    label: "Resume",
  },
  Video: {
    icon: Video,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.22)",
    label: "Video",
  },
  default: {
    icon: Database,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.10)",
    border: "rgba(107,114,128,0.18)",
    label: "Asset",
  },
};

const AssetInjectionCard = memo(({ asset }) => {
  const config = ASSET_CONFIGS[asset?.category] || ASSET_CONFIGS.default;
  const Icon = config.icon;
  return (
    <div
      className="relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:opacity-90 mt-3"
      style={{
        borderColor: config.border,
        background: `linear-gradient(135deg, ${config.bg}, rgba(0,0,0,0))`,
      }}
      onClick={() => asset?.url && window.open(asset.url, "_blank")}
    >
      <div className="p-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `${config.color}14`,
            border: `1px solid ${config.color}28`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border"
              style={{
                color: config.color,
                background: `${config.color}14`,
                borderColor: `${config.color}22`,
              }}
            >
              {config.label}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
              ✓ Verified
            </span>
          </div>
          <p className="text-sm font-semibold text-[#F5F0E8] truncate">
            {asset?.title || asset?.name || "Untitled Asset"}
          </p>
          {asset?.credentials?.issuer && (
            <p className="text-[11px] text-[rgba(245,240,232,0.45)]">
              {asset.credentials.issuer}
            </p>
          )}
        </div>
        {asset?.url && (
          <ExternalLink
            className="w-4 h-4 opacity-30 shrink-0"
            style={{ color: config.color }}
          />
        )}
      </div>
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
        className={cn("flex items-start gap-3 group", isNested && "ml-8")}
      >
        <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[10px] font-bold text-[#BFA264] shrink-0 mt-0.5 overflow-hidden">
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
            className="rounded-xl px-3 py-2.5 border"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-[#F5F0E8]">
                {comment.authorName}
                {comment.authorUsername && (
                  <span className="text-[rgba(245,240,232,0.30)] font-normal ml-1">
                    @{comment.authorUsername}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-[rgba(245,240,232,0.28)]">
                {timeAgo(comment.timestamp)}
              </span>
            </div>
            <p className="text-[13px] text-[rgba(245,240,232,0.75)] leading-relaxed">
              {comment.textContent}
            </p>
          </div>
          <div className="flex items-center gap-4 mt-1 px-1">
            {!isNested && (
              <button
                onClick={() => onReply(comment)}
                className="text-[10px] font-semibold text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" /> Reply
              </button>
            )}
            {(isOwn || isAdmin) && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] font-semibold text-[rgba(245,240,232,0.20)] hover:text-red-400 transition-colors flex items-center gap-1"
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
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const inputRef = useRef(null);

    const loadComments = useCallback(
      async (fresh = true) => {
        if (!onFetchComments) return;
        setLoading(true);
        try {
          const { comments: fetched, hasMore: more } = await onFetchComments(
            postId,
            fresh ? null : comments[comments.length - 1]?.timestamp,
          );
          setComments(fresh ? fetched : [...comments, ...fetched]);
          setHasMore(more);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      },
      [postId, onFetchComments, comments],
    );

    useEffect(() => {
      loadComments(true);
    }, [postId]);

    const handleSubmit = async () => {
      if (!newComment.trim() || isSubmitting) return;
      setIsSubmitting(true);
      try {
        const payload = {
          textContent: newComment.trim(),
          parentId: replyingTo?.id || null,
        };
        const result = await onAddComment?.(postId, payload);
        if (result) {
          const newC = {
            id: result.id,
            textContent: newComment.trim(),
            authorId: uid,
            authorName:
              `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
              "Operator",
            authorUsername: userData?.identity?.username,
            authorAvatar: userData?.identity?.avatarUrl,
            timestamp: new Date().toISOString(),
            parentId: replyingTo?.id || null,
          };
          setComments((prev) => [newC, ...prev]);
          setNewComment("");
          setReplyingTo(null);
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDelete = async (commentId) => {
      await onDeleteComment?.(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    const handleReply = (comment) => {
      setReplyingTo(comment);
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const topLevel = comments.filter((c) => !c.parentId);
    const getReplies = (id) => comments.filter((c) => c.parentId === id);

    const avatarUrl = userData?.identity?.avatarUrl;
    const initials =
      `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U";

    return (
      <div className="pt-4 border-t border-[rgba(255,255,255,0.04)]">
        {/* Input row */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#BFA264]/25 flex items-center justify-center text-[11px] font-bold text-[#BFA264] shrink-0 overflow-hidden">
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
          <div className="flex-1 relative">
            {replyingTo && (
              <div className="flex items-center gap-2 mb-1.5 px-3 py-1.5 bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.15)] rounded-lg">
                <span className="text-[10px] text-[#BFA264]">
                  Replying to @
                  {replyingTo.authorUsername || replyingTo.authorName}
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto text-[rgba(245,240,232,0.30)] hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] px-3 py-2 focus-within:border-[rgba(191,162,100,0.3)]">
              <input
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 300))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-[13px] text-[rgba(245,240,232,0.85)] placeholder-[rgba(245,240,232,0.25)] outline-none"
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg transition-all shrink-0",
                  newComment.trim()
                    ? "bg-[#BFA264] text-[#0A0A0C]"
                    : "bg-[rgba(255,255,255,0.04)] text-[rgba(245,240,232,0.20)] cursor-not-allowed",
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Comments list */}
        {loading && comments.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-[#BFA264]/40" />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {topLevel.map((comment) => (
                <div key={comment.id}>
                  <CommentRow
                    comment={comment}
                    uid={uid}
                    isAdmin={isAdmin}
                    depth={0}
                    onReply={handleReply}
                    onDelete={handleDelete}
                  />
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="mt-2">
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
            {hasMore && (
              <button
                onClick={() => loadComments(false)}
                disabled={loading}
                className="w-full text-center text-[10px] font-semibold text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] transition-colors py-2"
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

// ── MOBILE COMMENT SHEET ───────────────────────────────────────────────────
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
            className="fixed bottom-0 left-0 right-0 z-[999] rounded-t-2xl overflow-hidden bg-[#111113] border-t border-[rgba(255,255,255,0.06)]"
            style={{
              paddingBottom: "env(safe-area-inset-bottom)",
              maxHeight: "85vh",
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-[rgba(255,255,255,0.15)]" />
            </div>
            <div className="px-5 pb-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.04)]">
              <p className="text-sm font-semibold text-[#F5F0E8]">
                Comments{" "}
                {post?.replyCount > 0 && (
                  <span className="text-[rgba(245,240,232,0.35)]">
                    ({post.replyCount})
                  </span>
                )}
              </p>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div
              className="overflow-y-auto px-5 py-4 custom-scrollbar"
              style={{ maxHeight: "calc(85vh - 80px)" }}
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
    icon: Zap,
  },
  win: {
    label: "Win",
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
    border: "rgba(16,185,129,0.22)",
    icon: Trophy,
  },
  question: {
    label: "Q&A",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.10)",
    border: "rgba(139,92,246,0.22)",
    icon: MessageSquare,
  },
};

// ── POST CARD — Exact Cryptic layout ──────────────────────────────────────
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
    const TRUNCATE_CHARS = 280;
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
      } catch (e) {
        console.error(e);
      }
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
          transition={{ duration: 0.25 }}
          itemScope
          itemType="https://schema.org/SocialMediaPosting"
          className={cn(
            "relative w-full group/card transition-colors",
            isMobile
              ? "bg-[#0E0E0E] border-b border-[rgba(255,255,255,0.04)] px-4 pt-4 pb-0"
              : "border-b border-[rgba(255,255,255,0.04)] px-6 pt-5 pb-0 hover:bg-[rgba(255,255,255,0.01)] transition-colors",
            post._optimistic && "opacity-60",
          )}
        >
          {/* Delete confirm overlay */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-[#0A0A0C]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-4"
              >
                <p className="text-sm font-semibold text-white">
                  Delete this post?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await onDelete(post.id);
                      setShowDeleteConfirm(false);
                    }}
                    className="px-5 py-2 bg-red-500/15 border border-red-500/25 text-red-400 text-[11px] font-semibold uppercase tracking-wide rounded-lg hover:bg-red-500/25 transition-all"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-5 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[rgba(245,240,232,0.60)] text-[11px] font-semibold uppercase tracking-wide rounded-lg hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── CARD BODY ── */}
          <div className="relative z-10">
            {/* HEADER ROW: avatar + meta + connect btn + options */}
            <div className="flex items-start gap-3 mb-3">
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
                aria-label={`View ${post.authorName}'s profile`}
              >
                <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-sm font-bold text-[#BFA264] overflow-hidden group-hover/card:border-[#BFA264]/30 transition-all">
                  {post.authorAvatar ? (
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
              </button>

              {/* Author meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    className="text-[14px] font-semibold text-[#F5F0E8] hover:text-[#BFA264] transition-colors leading-tight truncate"
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
                    itemProp="author"
                  >
                    {post.authorName}
                  </button>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                      PRO
                    </span>
                  )}
                  {post.authorDomain && (
                    <span className="text-[12px] text-[rgba(245,240,232,0.40)]">
                      {post.authorDomain}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {post.authorUsername && (
                    <span className="text-[12px] text-[rgba(245,240,232,0.35)]">
                      @{post.authorUsername}
                    </span>
                  )}
                  <span className="text-[rgba(245,240,232,0.20)] text-xs">
                    ·
                  </span>
                  <time
                    className="text-[12px] text-[rgba(245,240,232,0.35)]"
                    dateTime={post.timestamp}
                    itemProp="datePublished"
                  >
                    {timeAgo(post.timestamp)}
                  </time>
                </div>
              </div>

              {/* Connect / Follow button */}
              {!isAuthor && (
                <div className="flex items-center gap-2 shrink-0">
                  {!isConnected && !isPending && (
                    <button
                      onClick={() =>
                        onSendRequest?.({
                          id: post.authorId,
                          identity: {
                            firstName: post.authorName?.split(" ")[0] || "",
                            username: post.authorUsername,
                            avatarUrl: post.authorAvatar,
                            domain: post.authorDomain,
                          },
                        })
                      }
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#BFA264] border border-[rgba(191,162,100,0.30)] px-3 py-1.5 rounded-lg bg-[rgba(191,162,100,0.06)] hover:bg-[rgba(191,162,100,0.12)] transition-all"
                      aria-label={`Connect with ${post.authorName}`}
                    >
                      <Plus className="w-3 h-3" />
                      Connect
                    </button>
                  )}
                  {isPending && (
                    <span className="text-[10px] font-semibold text-[rgba(245,240,232,0.35)] px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                      Pending
                    </span>
                  )}
                  {isConnected && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15">
                      <CheckCircle2 className="w-3 h-3" /> Allied
                    </span>
                  )}
                  {/* Options */}
                  {(isAuthor || isAdmin) && (
                    <div className="relative" ref={optionsRef}>
                      <button
                        onClick={() => setShowOptions((v) => !v)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(245,240,232,0.25)] hover:text-[rgba(245,240,232,0.60)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                        aria-label="Post options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showOptions && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            className="absolute right-0 top-full mt-1 z-40 min-w-[140px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#131315] shadow-2xl overflow-hidden backdrop-blur-xl"
                          >
                            <button
                              onClick={() => {
                                setShowDeleteConfirm(true);
                                setShowOptions(false);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-3 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete Post
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
              {/* Options for others (report etc) */}
              {!isAuthor && !isAdmin && (
                <div className="relative" ref={optionsRef}>
                  <button
                    onClick={() => setShowOptions((v) => !v)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(245,240,232,0.20)] hover:text-[rgba(245,240,232,0.50)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* CONTENT */}
            <div className="pl-[52px]" itemProp="articleBody">
              {parsedContent}
              {needsTruncation && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[#BFA264] text-[13px] font-medium hover:text-[#D4AF78] transition-colors mt-1 block"
                >
                  ...Read more
                </button>
              )}

              {/* Attached asset */}
              {post.asset && <AssetInjectionCard asset={post.asset} />}

              {/* Bounty badge */}
              {post.bounty > 0 && (
                <div
                  className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg border"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(245,158,11,0.08), transparent)",
                    borderColor: "rgba(245,158,11,0.20)",
                  }}
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-400">
                    {post.bounty} pt Bounty · Best reply wins
                  </span>
                </div>
              )}

              {/* Stats row (like/comment counts above action bar) */}
              {(post.likesCount > 0 || post.replyCount > 0) && (
                <div className="flex items-center gap-4 mt-3 pb-2 text-[12px] text-[rgba(245,240,232,0.40)]">
                  {post.likesCount > 0 && (
                    <span>
                      {post.likesCount.toLocaleString()}{" "}
                      {post.likesCount === 1 ? "reaction" : "reactions"}
                    </span>
                  )}
                  {post.replyCount > 0 && (
                    <span>
                      {post.replyCount}{" "}
                      {post.replyCount === 1 ? "comment" : "comments"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ACTION BAR — full-width 3 buttons */}
            <div className="pl-[52px] flex items-center mt-1 border-t border-[rgba(255,255,255,0.04)]">
              {/* React */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all hover:bg-[rgba(255,255,255,0.03)] rounded-lg",
                  isLiked
                    ? "text-red-500"
                    : "text-[rgba(245,240,232,0.45)] hover:text-red-400",
                )}
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <motion.div
                  animate={
                    likeAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }
                  }
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
                  "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all hover:bg-[rgba(255,255,255,0.03)] rounded-lg",
                  showComments
                    ? "text-[#BFA264]"
                    : "text-[rgba(245,240,232,0.45)] hover:text-[#BFA264]",
                )}
                aria-label="Comment"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Comment</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-medium transition-all hover:bg-[rgba(255,255,255,0.03)] rounded-lg relative",
                  isCopied
                    ? "text-emerald-400"
                    : "text-[rgba(245,240,232,0.45)] hover:text-[#BFA264]",
                )}
                aria-label="Share"
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-emerald-400 bg-[rgba(10,10,10,0.9)] border border-emerald-500/25 px-2.5 py-1 rounded-lg whitespace-nowrap"
                    >
                      Link copied!
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
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden pl-[52px]"
                >
                  <CommentSection
                    isAdmin={isAdmin}
                    postId={post.id}
                    uid={uid}
                    userData={userData}
                    onFetchComments={onFetchComments}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Optimistic overlay */}
            {post._optimistic && (
              <div className="absolute inset-0 bg-[#0A0A0C]/60 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(20,20,22,0.9)] border border-[#BFA264]/25 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-[#BFA264]" />
                  <span className="text-[11px] font-semibold text-[#BFA264]">
                    Posting…
                  </span>
                </div>
              </div>
            )}
          </div>
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

// ── POST COMPOSER — Exact Cryptic style ───────────────────────────────────
const POST_TYPES = [
  { id: "update", label: "Update", Icon: Zap, desc: "Share progress" },
  { id: "win", label: "Win 🏆", Icon: Trophy, desc: "Celebrate a milestone" },
  {
    id: "question",
    label: "Q&A",
    Icon: MessageSquare,
    desc: "Ask the network",
  },
];

const TOOLBAR_ITEMS = [
  { icon: ImageIcon, action: "image", title: "Image" },
  { icon: Smile, action: "emoji", title: "Emoji" },
  { icon: BarChart2, action: "poll", title: "Poll" },
  { icon: Grid, action: "grid", title: "More" },
];

const PostComposer = memo(
  ({ userData, onPost, isPosting, isMobile = false }) => {
    const [text, setText] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [postType, setPostType] = useState("update");
    const [bounty, setBounty] = useState(0);
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
        italic: `*${sel || "italic"}*`,
        link: `[${sel || "link"}](https://)`,
        mention: "@",
        hashtag: "#",
      };
      const ins = map[syntax] || "";
      const next = text.slice(0, s) + ins + text.slice(e);
      setText(next);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(s + ins.length, s + ins.length);
      }, 0);
    };

    const extractMeta = (t) => ({
      hashtags: [
        ...new Set([...t.matchAll(/#([\w]+)/g)].map((m) => m[1].toLowerCase())),
      ],
      mentions: [
        ...new Set(
          [...t.matchAll(/@([\w.]+)/g)].map((m) => m[1].toLowerCase()),
        ),
      ],
    });

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
        setIsFocused(false);
      }
    };

    const avatarUrl = userData?.identity?.avatarUrl;
    const initials =
      `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
      "U";

    return (
      <div
        className={cn(
          "w-full border-b border-[rgba(255,255,255,0.05)]",
          isMobile ? "bg-[#111113] px-4 py-3" : "bg-[#0D0D0F] px-5 py-4",
        )}
      >
        {/* Text input row */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.08)] flex items-center justify-center text-xs font-bold text-[#BFA264] shrink-0 overflow-hidden mt-0.5">
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
            <textarea
              ref={textareaRef}
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
              placeholder="What do you feel about markets today? Share your ideas here!"
              rows={isExpanded ? 4 : 1}
              className="w-full bg-transparent text-[rgba(245,240,232,0.85)] placeholder-[rgba(245,240,232,0.30)] text-[15px] font-normal resize-none border-none outline-none leading-relaxed"
              style={{ minHeight: isExpanded ? "80px" : "auto" }}
            />
          </div>
        </div>

        {/* Expanded controls */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              {/* Post type pills — Cryptic Bullish/Bearish style */}
              <div className="flex items-center gap-2 mt-3 mb-3 pl-12">
                {POST_TYPES.map((pt) => {
                  const PostIcon = pt.Icon;
                  const isActive = postType === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => setPostType(pt.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                        isActive
                          ? pt.id === "win"
                            ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-400"
                            : pt.id === "question"
                              ? "bg-violet-500/12 border-violet-500/25 text-violet-400"
                              : "bg-[rgba(191,162,100,0.10)] border-[rgba(191,162,100,0.25)] text-[#BFA264]"
                          : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.40)] hover:text-[rgba(245,240,232,0.70)]",
                      )}
                    >
                      <PostIcon className="w-3 h-3" />
                      {pt.label}
                    </button>
                  );
                })}
              </div>

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between pl-12 pt-3 border-t border-[rgba(255,255,255,0.04)]">
                <div className="flex items-center gap-0.5">
                  {/* Format buttons */}
                  {[
                    { icon: Bold, action: "bold" },
                    { icon: Italic, action: "italic" },
                    { icon: Link2, action: "link" },
                    { icon: AtSign, action: "mention" },
                    { icon: Hash, action: "hashtag" },
                  ].map(({ icon: Icon, action }) => (
                    <button
                      key={action}
                      onClick={() => handleFormat(action)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,240,232,0.35)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                  <div className="w-px h-4 bg-[rgba(255,255,255,0.06)] mx-1" />
                  {/* Media buttons */}
                  {TOOLBAR_ITEMS.map(({ icon: Icon, action, title }) => (
                    <button
                      key={action}
                      title={title}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,240,232,0.35)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-[11px] font-mono hidden sm:block",
                      text.length > 900
                        ? "text-amber-400"
                        : "text-[rgba(245,240,232,0.20)]",
                    )}
                  >
                    {text.length}/{MAX}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!text.trim() || isPosting}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] font-semibold transition-all",
                      text.trim() && !isPosting
                        ? "bg-[#BFA264] text-[#0A0A0C] hover:bg-[#D4AF78] shadow-[0_0_18px_rgba(191,162,100,0.25)]"
                        : "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.20)] cursor-not-allowed",
                    )}
                  >
                    {isPosting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    {isPosting ? "Posting…" : "Post →"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed toolbar row */}
        {!isExpanded && (
          <div className="flex items-center justify-between mt-3 pl-12">
            <div className="flex items-center gap-0.5">
              {POST_TYPES.map((pt) => (
                <button
                  key={pt.id}
                  onClick={() => {
                    setPostType(pt.id);
                    setIsFocused(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all",
                    postType === pt.id
                      ? pt.id === "win"
                        ? "bg-emerald-500/12 border-emerald-500/25 text-emerald-400"
                        : pt.id === "question"
                          ? "bg-violet-500/12 border-violet-500/25 text-violet-400"
                          : "bg-[rgba(191,162,100,0.10)] border-[rgba(191,162,100,0.25)] text-[#BFA264]"
                      : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.40)] hover:text-[rgba(245,240,232,0.65)]",
                  )}
                >
                  {pt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {TOOLBAR_ITEMS.slice(0, 3).map(({ icon: Icon, action }) => (
                <button
                  key={action}
                  onClick={() => {
                    setIsFocused(true);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.06)] transition-all"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || isPosting}
                className="ml-1 flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#BFA264] text-[#0A0A0C] hover:bg-[#D4AF78] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Post →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

// ── FEED FILTER TABS ───────────────────────────────────────────────────────
const FeedFilterTabs = memo(
  ({ activeFilter, setActiveFilter, followingCount, isMobile }) => (
    <div className={cn("flex items-center gap-0", isMobile ? "w-full" : "")}>
      {[
        { id: "foryou", label: "For you" },
        { id: "following", label: "Following", badge: followingCount },
      ].map(({ id, label, badge }) => (
        <button
          key={id}
          onClick={() => setActiveFilter(id)}
          className={cn(
            "relative px-5 py-3 text-[14px] font-medium transition-all",
            activeFilter === id
              ? "text-[#F5F0E8] border-b-2 border-[#BFA264]"
              : "text-[rgba(245,240,232,0.45)] border-b-2 border-transparent hover:text-[rgba(245,240,232,0.70)]",
          )}
        >
          {label}
          {badge !== undefined && badge > 0 && (
            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[rgba(191,162,100,0.15)] text-[#D4AF78]">
              {badge}
            </span>
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
      "animate-pulse border-b border-[rgba(255,255,255,0.04)] px-5 pt-5 pb-0",
      isMobile ? "bg-[#0E0E0E]" : "bg-transparent",
    )}
  >
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.04)] shrink-0" />
      <div className="flex-1 mt-1">
        <div className="h-3.5 bg-[rgba(255,255,255,0.04)] rounded-full w-32 mb-2" />
        <div className="h-3 bg-[rgba(255,255,255,0.03)] rounded-full w-20" />
      </div>
      <div className="w-20 h-7 bg-[rgba(255,255,255,0.03)] rounded-lg" />
    </div>
    <div className="pl-[52px] space-y-2 mb-4">
      <div className="h-3.5 bg-[rgba(255,255,255,0.03)] rounded-full w-full" />
      <div className="h-3.5 bg-[rgba(255,255,255,0.03)] rounded-full w-[85%]" />
      <div className="h-3.5 bg-[rgba(255,255,255,0.03)] rounded-full w-[60%]" />
    </div>
    <div className="pl-[52px] flex gap-2 border-t border-[rgba(255,255,255,0.03)] py-3">
      <div className="flex-1 h-8 bg-[rgba(255,255,255,0.02)] rounded-lg" />
      <div className="flex-1 h-8 bg-[rgba(255,255,255,0.02)] rounded-lg" />
      <div className="flex-1 h-8 bg-[rgba(255,255,255,0.02)] rounded-lg" />
    </div>
  </div>
);

// ── EMPTY / ERROR ──────────────────────────────────────────────────────────
const EmptyFeed = ({ isFollowing }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24 text-center px-8"
  >
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-[rgba(191,162,100,0.05)] border border-[rgba(191,162,100,0.10)]">
      {isFollowing ? (
        <Users className="w-7 h-7 text-[rgba(191,162,100,0.4)]" />
      ) : (
        <Zap className="w-7 h-7 text-[rgba(191,162,100,0.4)]" />
      )}
    </div>
    <h3 className="text-lg font-semibold text-[#F5F0E8] mb-2">
      {isFollowing ? "No Network Posts Yet" : "Feed is Empty"}
    </h3>
    <p className="text-[14px] text-[rgba(245,240,232,0.40)] max-w-[280px] leading-relaxed">
      {isFollowing
        ? "Form alliances to see execution signals from your network."
        : "Be the first to share an execution signal with the network."}
    </p>
  </motion.div>
);

const FeedError = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-8">
    <AlertTriangle className="w-8 h-8 text-red-400/70 mb-4" />
    <p className="text-[15px] font-semibold text-red-400/80 mb-1">
      Connection Lost
    </p>
    <p className="text-[13px] text-[rgba(245,240,232,0.35)] mb-6">
      Failed to load execution feed.
    </p>
    <button
      onClick={onRetry}
      className="px-6 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[12px] font-semibold text-[#F5F0E8] hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-all"
    >
      Retry
    </button>
  </div>
);

// ── REFRESH BUTTON ─────────────────────────────────────────────────────────
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
        "w-8 h-8 flex items-center justify-center rounded-lg transition-all border",
        "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.06)] text-[rgba(245,240,232,0.40)]",
        "hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.06)] hover:border-[rgba(191,162,100,0.20)]",
        spinning && "opacity-50 cursor-not-allowed",
      )}
      aria-label="Refresh feed"
    >
      <RefreshCw className={cn("w-3.5 h-3.5", spinning && "animate-spin")} />
    </button>
  );
};

// ── MOBILE DISCOVER WIDGETS ─────────────────────────────────────────────────
const MobileDiscoverWidgets = memo(
  ({ suggestedUsers, trendingHashtags, onSendRequest }) => {
    const [activeTab, setActiveTab] = useState("users");
    return (
      <div className="bg-[#111113] border-b border-[rgba(255,255,255,0.04)] pt-3 pb-4">
        <div className="flex items-center gap-5 px-4 mb-4">
          {[
            { id: "users", label: "People" },
            { id: "topics", label: "Trending" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-widest transition-colors",
                activeTab === id
                  ? "text-[#BFA264]"
                  : "text-[rgba(255,255,255,0.30)] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {activeTab === "users" && (
          <div
            className="flex gap-3 overflow-x-auto hide-scrollbar px-4"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {suggestedUsers.slice(0, 6).map((user) => {
              const name =
                `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                "Operator";
              return (
                <div
                  key={user.id}
                  className="shrink-0 w-[130px] p-3 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex flex-col items-center text-center"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[11px] font-bold text-[#BFA264] overflow-hidden mb-2">
                    {user.identity?.avatarUrl ? (
                      <img
                        src={user.identity.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (name.charAt(0) || "O").toUpperCase()
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-[#F5F0E8] truncate w-full">
                    {name}
                  </p>
                  <p className="text-[10px] text-[rgba(245,240,232,0.35)] truncate w-full mb-3">
                    {user.identity?.domain || "General"}
                  </p>
                  <button
                    onClick={() => onSendRequest?.(user)}
                    className="w-full py-1.5 rounded-lg bg-[rgba(191,162,100,0.08)] border border-[rgba(191,162,100,0.18)] text-[#BFA264] text-[10px] font-semibold hover:bg-[rgba(191,162,100,0.14)] transition-all"
                  >
                    Connect
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {activeTab === "topics" && (
          <div
            className="flex gap-2 overflow-x-auto hide-scrollbar px-4"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {trendingHashtags.map(({ tag, count }) => (
              <div
                key={tag}
                className="shrink-0 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] flex flex-col justify-center"
                style={{ scrollSnapAlign: "start", minWidth: "120px" }}
              >
                <p className="text-[13px] font-semibold text-[#F5F0E8] mb-0.5">
                  #{tag}
                </p>
                <p className="text-[10px] text-[rgba(245,240,232,0.35)]">
                  {count} posts
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

// ═══════════════════════════════════════════════════════════════════════════
// FEED TAB v8.0 — Main Export
// ═══════════════════════════════════════════════════════════════════════════
const FeedTab = ({
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
  onRefresh = null,
  allianceIds = [],
  suggestedUsers = [],
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

  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });
  useEffect(() => {
    if (inView && hasMorePosts && !feedLoading) onLoadMore();
  }, [inView, hasMorePosts, feedLoading, onLoadMore]);

  const showSkeletons = feedLoading && posts.length === 0;
  const showEmpty = !feedLoading && !feedError && filteredPosts.length === 0;

  // ── MOBILE LAYOUT ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="relative w-full flex flex-col min-h-screen bg-[#090909]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <Helmet>
          <title>Execution Feed | Discotive Network</title>
          <meta
            name="description"
            content="Track live execution signals, competitor telemetry, and network insights."
          />
        </Helmet>
        {/* Sticky header */}
        <div className="sticky top-0 z-40 bg-[rgba(9,9,9,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between px-2 shadow-sm">
          <FeedFilterTabs
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            followingCount={followingPostCount}
            isMobile
          />
          {onRefresh && (
            <div className="px-3">
              <RefreshButton onRefresh={onRefresh} />
            </div>
          )}
        </div>

        {/* Mobile Carousel Widgets */}
        {activeFilter === "foryou" && (
          <MobileDiscoverWidgets
            suggestedUsers={suggestedUsers}
            trendingHashtags={trendingHashtags}
            onSendRequest={onSendRequest}
          />
        )}

        {/* Composer */}
        <PostComposer
          userData={userData}
          onPost={onPost}
          isPosting={isPosting}
          isMobile
        />

        {/* Feed */}
        <div className="flex-1 pb-24">
          {feedError ? (
            <FeedError onRetry={onLoadMore} />
          ) : showSkeletons ? (
            Array.from({ length: 4 }).map((_, i) => (
              <PostSkeleton key={i} isMobile />
            ))
          ) : showEmpty ? (
            <EmptyFeed isFollowing={activeFilter === "following"} />
          ) : (
            <>
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
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
                  isMobile
                />
              ))}
              <div ref={loadMoreRef} className="h-1" />
              {feedLoading && !showSkeletons && (
                <div className="flex justify-center py-5">
                  <Loader2 className="w-5 h-5 animate-spin text-[#BFA264]/40" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ─────────────────────────────────────────────────────────
  return (
    <div className="relative w-full flex flex-col">
      <Helmet>
        <title>Connective Feed | Discotive Network</title>
        <meta
          name="description"
          content="Track live execution signals, competitor telemetry, and network insights."
        />
      </Helmet>
      {/* Sticky filter tabs + refresh */}
      <div className="sticky top-0 z-40 bg-[rgba(9,9,9,0.96)] backdrop-blur-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between pr-4">
        <FeedFilterTabs
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          followingCount={followingPostCount}
          isMobile={false}
        />
        {onRefresh && <RefreshButton onRefresh={onRefresh} />}
      </div>

      {/* Composer */}
      <PostComposer
        userData={userData}
        onPost={onPost}
        isPosting={isPosting}
        isMobile={false}
      />

      {/* Feed body */}
      <div className="flex-1 w-full">
        {feedError ? (
          <FeedError onRetry={onLoadMore} />
        ) : showSkeletons ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </>
        ) : showEmpty ? (
          <EmptyFeed isFollowing={activeFilter === "following"} />
        ) : (
          <>
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
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
                isMobile={false}
              />
            ))}
            <div ref={loadMoreRef} className="h-1" />
            {feedLoading && !showSkeletons && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#BFA264]/40" />
              </div>
            )}
            {!hasMorePosts && filteredPosts.length > 0 && (
              <div className="text-center py-10 text-[12px] text-[rgba(245,240,232,0.20)]">
                You've seen all posts
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FEED SIDEBAR — Right column (Exact Cryptic right panel style)
// Exported for Connective.jsx to inject as overrideSidebar
// ═══════════════════════════════════════════════════════════════════════════
export const FeedSidebar = memo(
  ({ posts, suggestedUsers, onSendRequest, getConnectionStatus, userData }) => {
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

    const isEssential =
      userData?.tier !== "PRO" && userData?.tier !== "ENTERPRISE";

    return (
      <div className="flex flex-col gap-4 w-full">
        {/* ── PRO UPGRADE CARD (Free users only) — Exact Cryptic premium widget ── */}
        {isEssential && (
          <div
            className="rounded-2xl border border-[rgba(191,162,100,0.20)] overflow-hidden cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, rgba(30,25,15,1) 0%, rgba(18,15,8,1) 100%)",
            }}
            onClick={() => (window.location.href = "/premium")}
            role="button"
            aria-label="Upgrade to Discotive Pro"
          >
            {/* Starfield header area */}
            <div
              className="relative h-24 overflow-hidden"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 30%, rgba(80,60,20,0.8) 0%, rgba(15,12,5,1) 70%)",
              }}
            >
              {/* Decorative stars */}
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: `${15 + (i % 3) * 25}%`,
                    opacity: 0.3 + (i % 4) * 0.15,
                  }}
                />
              ))}
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(191,162,100,0.12)] border border-[rgba(191,162,100,0.25)]">
                  <Crown className="w-3 h-3 text-[#BFA264]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#BFA264]">
                    Discotive Pro
                  </span>
                </div>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-[15px] font-bold text-[#F5F0E8] mb-1 leading-snug">
                Unlock your true potential.
              </p>
              <p className="text-[12px] text-[rgba(245,240,232,0.45)] leading-relaxed mb-3">
                Access X-Ray analytics, expanded vault, and premium
                intelligence.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-[#BFA264] text-[#0A0A0C] text-[11px] font-bold hover:bg-[#D4AF78] transition-all">
                  Activate Program →
                </button>
                <button className="flex-1 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[rgba(245,240,232,0.50)] text-[11px] font-medium hover:bg-[rgba(255,255,255,0.08)] transition-all">
                  Schedule Consult
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── NETWORK TARGETS (suggested users) ── */}
        {suggestedUsers?.length > 0 && (
          <div
            className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
            style={{ background: "rgba(14,14,16,1)" }}
          >
            <div className="px-4 py-3 flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)]">
              <Users className="w-3.5 h-3.5 text-[rgba(245,240,232,0.30)]" />
              <p className="text-[11px] font-bold text-[rgba(245,240,232,0.45)] uppercase tracking-widest">
                Network Targets
              </p>
            </div>
            <div>
              {suggestedUsers.slice(0, 5).map((user) => {
                const name =
                  `${user.identity?.firstName || ""} ${user.identity?.lastName || ""}`.trim() ||
                  user.identity?.username ||
                  "Operator";
                const status = getConnectionStatus
                  ? getConnectionStatus(user.id)
                  : null;
                const isConnected = status === "allied";
                const isPending = status === "outbound_pending";

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#1A1A1A] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-[11px] font-bold text-[#BFA264] shrink-0 overflow-hidden">
                      {user.identity?.avatarUrl ? (
                        <img
                          src={user.identity.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[rgba(245,240,232,0.85)] truncate group-hover:text-white transition-colors">
                        {name}
                      </p>
                      <p className="text-[11px] text-[rgba(245,240,232,0.38)] truncate">
                        {user.identity?.domain || "General"}
                      </p>
                    </div>
                    {isConnected ? (
                      <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider shrink-0">
                        Allied
                      </span>
                    ) : isPending ? (
                      <span className="text-[9px] font-bold text-[rgba(245,240,232,0.30)] uppercase tracking-wider shrink-0">
                        Sent
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendRequest?.(user);
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] text-[rgba(245,240,232,0.45)] hover:bg-[rgba(191,162,100,0.08)] hover:text-[#BFA264] hover:border-[rgba(191,162,100,0.20)] transition-all shrink-0"
                        aria-label={`Connect with ${name}`}
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

        {/* ── TRENDING TOPICS ── */}
        {trendingHashtags.length > 0 && (
          <div
            className="rounded-2xl border border-[rgba(255,255,255,0.06)] overflow-hidden"
            style={{ background: "rgba(14,14,16,1)" }}
          >
            <div className="px-4 py-3 flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)]">
              <Flame className="w-3.5 h-3.5 text-orange-500/70" />
              <p className="text-[11px] font-bold text-[rgba(245,240,232,0.45)] uppercase tracking-widest">
                Trending Topics
              </p>
            </div>
            <div>
              {trendingHashtags.map(({ tag, count }, idx) => (
                <div
                  key={tag}
                  className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer group last:border-0"
                >
                  <span className="text-[12px] font-bold text-[rgba(245,240,232,0.22)] w-4 text-center shrink-0 group-hover:text-[rgba(245,240,232,0.45)] transition-colors">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[rgba(245,240,232,0.85)] group-hover:text-white transition-colors">
                      #{tag}
                    </p>
                    <p className="text-[11px] text-[rgba(245,240,232,0.38)]">
                      {count} post{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[rgba(245,240,232,0.20)] opacity-0 group-hover:opacity-100 group-hover:text-[#BFA264] transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default FeedTab;
