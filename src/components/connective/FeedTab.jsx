/**
 * @fileoverview FeedTab v3.0 — The Proof-of-Work Feed (LinkedIn Killer)
 * @description
 * V3: Native Asset Injection cards in posts. Bounty staking system.
 * onPeekOperator callback on author avatars (no navigation away).
 * Rich text parser with @mentions / #hashtags. Threaded comments.
 * Optimistic UI throughout. No auto-fetch on render.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useVirtualizer } from "@tanstack/react-virtual";
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
  ShieldAlert,
  X,
  CornerDownRight,
  Database,
  FileText,
  Code2,
  Video,
  Award,
  ExternalLink,
  DollarSign,
  Flame,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Time formatter ────────────────────────────────────────────────────────────
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

// ─── Rich text parser ──────────────────────────────────────────────────────────
const parseRichText = (text) => {
  if (!text) return null;
  return text.split("\n").map((line, lineIdx) => {
    if (!line.trim()) return <br key={lineIdx} />;
    const tokens = [];
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
    if (allTokens.length === 0)
      return (
        <p
          key={lineIdx}
          className="text-[rgba(245,240,232,0.75)] leading-relaxed text-sm"
        >
          {line}
        </p>
      );

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
            className="italic text-[rgba(245,240,232,0.7)]"
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
            className="text-[#BFA264] font-bold cursor-pointer hover:underline"
          >
            @{m[1]}
          </span>,
        );
      else if (type === "hashtag")
        rendered.push(
          <span
            key={`ht-${lineIdx}-${i}`}
            className="text-sky-400 font-bold cursor-pointer hover:underline"
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
        className="text-[rgba(245,240,232,0.75)] leading-relaxed text-sm"
      >
        {rendered}
      </p>
    );
  });
};

// ─── Asset Injection Card (Proof-of-Work) ────────────────────────────────────
const ASSET_CONFIGS = {
  Certificate: {
    icon: Award,
    color: "#BFA264",
    bg: "from-[rgba(191,162,100,0.12)] to-[rgba(191,162,100,0.04)]",
    border: "border-[rgba(191,162,100,0.25)]",
    label: "Certificate",
  },
  Project: {
    icon: Code2,
    color: "#8b5cf6",
    bg: "from-[rgba(139,92,246,0.12)] to-[rgba(139,92,246,0.04)]",
    border: "border-violet-500/25",
    label: "Project",
  },
  Resume: {
    icon: FileText,
    color: "#38bdf8",
    bg: "from-[rgba(56,189,248,0.12)] to-[rgba(56,189,248,0.04)]",
    border: "border-sky-500/25",
    label: "Resume",
  },
  Video: {
    icon: Video,
    color: "#ef4444",
    bg: "from-[rgba(239,68,68,0.12)] to-[rgba(239,68,68,0.04)]",
    border: "border-red-500/25",
    label: "Video",
  },
  default: {
    icon: Database,
    color: "#6b7280",
    bg: "from-[rgba(107,114,128,0.12)] to-[rgba(107,114,128,0.04)]",
    border: "border-[rgba(255,255,255,0.10)]",
    label: "Asset",
  },
};

const AssetInjectionCard = ({ asset }) => {
  const config = ASSET_CONFIGS[asset?.category] || ASSET_CONFIGS.default;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-gradient-to-br overflow-hidden",
        config.border,
        config.bg,
      )}
    >
      {/* Decorative background mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl"
          style={{ background: config.color, opacity: 0.08 }}
        />
        <div
          className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full blur-xl"
          style={{ background: config.color, opacity: 0.06 }}
        />
        {/* Abstract code lines */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute h-px bg-current opacity-[0.04]"
            style={{
              top: `${20 + i * 18}%`,
              left: "5%",
              right: `${10 + i * 15}%`,
              color: config.color,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-4 flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center border shrink-0"
          style={{
            background: `${config.color}18`,
            borderColor: `${config.color}30`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border"
              style={{
                color: config.color,
                background: `${config.color}15`,
                borderColor: `${config.color}25`,
              }}
            >
              {config.label}
            </span>
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
              ✓ Verified
            </span>
          </div>
          <p className="text-sm font-bold text-[#F5F0E8] truncate">
            {asset?.title || asset?.name || "Untitled Asset"}
          </p>
          {asset?.credentials?.issuer && (
            <p className="text-[10px] text-[rgba(245,240,232,0.40)] mt-0.5">
              {asset.credentials.issuer}
            </p>
          )}
        </div>
        {asset?.url && (
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[rgba(245,240,232,0.40)] hover:text-white transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Score yield badge if present */}
      {asset?.scoreYield > 0 && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-lg border border-[rgba(191,162,100,0.20)]">
          <Zap className="w-2.5 h-2.5 text-[#BFA264]" />
          <span className="text-[8px] font-black text-[#BFA264]">
            +{asset.scoreYield}pts
          </span>
        </div>
      )}
    </div>
  );
};

// ─── Bounty Badge ─────────────────────────────────────────────────────────────
const BountyBadge = ({ bounty }) => {
  if (!bounty || bounty <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
        {bounty} pt Bounty
      </span>
      <span className="text-[9px] text-amber-400/60">· Help Requested</span>
    </div>
  );
};

// ─── Post Composer ─────────────────────────────────────────────────────────────
const PostComposer = ({ userData, onPost, isPosting }) => {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [bounty, setBounty] = useState(0);
  const [showBountyInput, setShowBountyInput] = useState(false);
  const textareaRef = useRef(null);
  const maxLen = 1000;

  const handleFormat = (syntax) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const selected = text.slice(start, end);
    let insertion = "";
    if (syntax === "bold") insertion = `**${selected || "bold text"}**`;
    else if (syntax === "italic") insertion = `*${selected || "italic text"}*`;
    else if (syntax === "link")
      insertion = `[${selected || "link text"}](https://)`;
    else if (syntax === "mention") insertion = `@`;
    else if (syntax === "hashtag") insertion = `#`;
    const next = text.slice(0, start) + insertion + text.slice(end);
    setText(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
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
    });
    if (result !== null) {
      setText("");
      setBounty(0);
      setShowBountyInput(false);
    }
  };

  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}`.toUpperCase() ||
    "U";

  return (
    <motion.div
      layout
      className={cn(
        "relative rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
        isFocused
          ? "bg-[#0F0F0F] border-[rgba(191,162,100,0.35)] shadow-[0_0_40px_rgba(191,162,100,0.08)]"
          : "bg-[#0A0A0A] border-[rgba(255,255,255,0.07)] hover:border-[rgba(191,162,100,0.15)]",
      )}
    >
      <div className="flex items-start gap-3.5 p-4 md:p-5">
        <div className="w-10 h-10 rounded-full bg-[#111] border border-[#BFA264]/40 flex items-center justify-center text-sm font-black text-[#BFA264] shrink-0 mt-0.5 overflow-hidden">
          {userData?.identity?.avatarUrl ? (
            <img
              src={userData.identity.avatarUrl}
              alt="Avatar"
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
            onChange={(e) => setText(e.target.value.slice(0, maxLen))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Share an execution update, tag @operators, use #hashtags…"
            rows={isFocused || text ? 4 : 2}
            className="w-full bg-transparent text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] text-sm font-medium resize-none border-none outline-none leading-relaxed"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          />
        </div>
      </div>

      <AnimatePresence>
        {(isFocused || text.length > 0) && (
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
                  className="px-4 md:px-5 pb-3"
                >
                  <div className="flex items-center gap-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                    <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">
                        Stake a Bounty
                      </p>
                      <p className="text-[9px] text-amber-400/60">
                        Offer Discotive pts for a reply that helps you.
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={bounty}
                      onChange={(e) =>
                        setBounty(
                          Math.max(0, Math.min(500, Number(e.target.value))),
                        )
                      }
                      className="w-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-center text-sm rounded-lg px-2 py-1 outline-none"
                    />
                    <span className="text-[9px] text-amber-400/60 font-bold">
                      pts
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="border-t border-[rgba(255,255,255,0.04)] px-4 md:px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {[
                  { icon: Bold, syntax: "bold", label: "Bold" },
                  { icon: Italic, syntax: "italic", label: "Italic" },
                  { icon: Link2, syntax: "link", label: "Link" },
                  { icon: AtSign, syntax: "mention", label: "Mention" },
                  { icon: Hash, syntax: "hashtag", label: "Hashtag" },
                ].map(({ icon: Icon, syntax, label }) => (
                  <button
                    key={syntax}
                    type="button"
                    onClick={() => handleFormat(syntax)}
                    title={label}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
                <div className="w-px h-5 bg-[rgba(255,255,255,0.08)] mx-1" />
                <button
                  type="button"
                  onClick={() => setShowBountyInput((v) => !v)}
                  title="Stake Bounty"
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    showBountyInput
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-[rgba(245,240,232,0.30)] hover:text-amber-400 hover:bg-amber-500/8",
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
                      : "text-[rgba(245,240,232,0.20)]",
                  )}
                >
                  {text.length}/{maxLen}
                </span>
                {bounty > 0 && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-amber-400 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <DollarSign className="w-3 h-3" />
                    {bounty}pt
                  </span>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || isPosting}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all",
                    text.trim() && !isPosting
                      ? "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78] shadow-[0_0_20px_rgba(191,162,100,0.25)]"
                      : "bg-[#111] border border-[rgba(255,255,255,0.07)] text-[rgba(245,240,232,0.20)] cursor-not-allowed",
                  )}
                >
                  {isPosting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {isPosting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Comment Section ─────────────────────────────────────────────────────────
const CommentSection = ({
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

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)] space-y-3">
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
        <div className="flex-1 flex items-center gap-2">
          <div
            className={cn(
              "flex-1 flex items-center bg-[#0A0A0A] border rounded-xl px-3 py-2 transition-all",
              replyingTo
                ? "border-[rgba(191,162,100,0.35)]"
                : "border-[rgba(255,255,255,0.07)]",
            )}
          >
            {replyingTo && (
              <div className="flex items-center gap-1.5 mr-2 shrink-0">
                <CornerDownRight className="w-3 h-3 text-[#BFA264]/60" />
                <span className="text-[10px] text-[#BFA264]/80 font-bold truncate max-w-[80px]">
                  @{replyingTo.authorUsername || replyingTo.authorName}
                </span>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment("");
                  }}
                  className="text-[rgba(245,240,232,0.30)] hover:text-white transition-colors"
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
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={
                replyingTo ? "Write a reply..." : "Write a comment..."
              }
              className="flex-1 bg-transparent text-xs text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] outline-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
              newComment.trim() && !isSubmitting
                ? "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78]"
                : "bg-[#111] text-[rgba(245,240,232,0.20)] cursor-not-allowed",
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

      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-[rgba(191,162,100,0.4)]" />
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex items-start gap-2.5",
                  comment.parentCommentId && "ml-6",
                )}
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
                  <div className="bg-[#0F0F0F] border border-[rgba(255,255,255,0.05)] rounded-xl rounded-tl-sm px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-bold text-[#F5F0E8]">
                        {comment.authorName}
                        {comment.authorUsername && (
                          <span className="text-[rgba(245,240,232,0.30)] font-normal ml-1">
                            @{comment.authorUsername}
                          </span>
                        )}
                      </span>
                      <span className="text-[9px] text-[rgba(245,240,232,0.25)] shrink-0">
                        {timeAgo(comment.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[rgba(245,240,232,0.70)] leading-relaxed">
                      {comment.textContent}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    {!comment.parentCommentId && (
                      <button
                        onClick={() => {
                          setReplyingTo(comment);
                          setNewComment(
                            `@${comment.authorUsername || comment.authorName} `,
                          );
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className="flex items-center gap-1 text-[9px] font-bold text-[rgba(245,240,232,0.25)] hover:text-[#BFA264] transition-colors uppercase tracking-widest"
                      >
                        <CornerDownRight className="w-3 h-3" /> Reply
                      </button>
                    )}
                    {(comment.authorId === uid || isAdmin) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="flex items-center gap-1 text-[9px] font-bold text-[rgba(245,240,232,0.20)] hover:text-red-400 transition-colors uppercase tracking-widest"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {hasMore && comments.length >= 10 && (
            <button
              onClick={() => loadComments(false)}
              disabled={loading}
              className="w-full text-center text-[9px] font-black text-[rgba(245,240,232,0.25)] hover:text-[#BFA264] transition-colors uppercase tracking-widest py-1"
            >
              {loading ? "Loading..." : "Load more comments"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Post Card ─────────────────────────────────────────────────────────────────
const PostCard = ({
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
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const optionsRef = useRef(null);

  const isLiked = (post.likedBy || []).includes(uid);
  const isAuthor = post.authorId === uid;
  const initials = post.authorName?.charAt(0)?.toUpperCase() || "O";
  const isPro = post.authorTier === "PRO" || post.authorTier === "ENTERPRISE";

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
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_) {}
  };

  // CTO MANDATE: Memoize the AST compilation. Do NOT run heavy regex on every render cycle.
  const parsedContent = useMemo(
    () => parseRichText(post.textContent),
    [post.textContent],
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      className={cn(
        "relative rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
        post._optimistic
          ? "bg-[#0A0A0A] border-[rgba(191,162,100,0.20)] opacity-70"
          : isPro
            ? "bg-gradient-to-b from-[#0F0F0F] to-[#050505] border-[rgba(191,162,100,0.15)] hover:border-[rgba(191,162,100,0.40)] hover:shadow-[0_8px_32px_rgba(191,162,100,0.08)]"
            : "bg-gradient-to-b from-[#0A0A0A] to-[#030303] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)]",
      )}
    >
      {isPro && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#BFA264] to-transparent opacity-50" />
      )}

      <div className="p-4 md:p-5 relative z-10">
        {/* Delete confirm overlay */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-[#030303]/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-[1.5rem]"
            >
              <p className="text-sm font-black text-white">Delete this post?</p>
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

        {/* Author row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              className="relative focus:outline-none"
              onClick={() =>
                onPeekOperator?.({
                  id: post.authorId,
                  identity: {
                    firstName: post.authorName?.split(" ")[0],
                    lastName: post.authorName?.split(" ").slice(1).join(" "),
                    username: post.authorUsername,
                    domain: post.authorDomain,
                    avatarUrl: post.authorAvatar,
                  },
                })
              }
            >
              <div className="w-10 h-10 rounded-full bg-[#111] border border-[#BFA264]/40 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden hover:border-[#BFA264]/70 transition-colors">
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
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#F5F0E8]">
                  {post.authorName}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {post.authorUsername && (
                  <span className="text-[10px] text-[rgba(245,240,232,0.30)] font-mono">
                    @{post.authorUsername}
                  </span>
                )}
                {post.authorDomain && (
                  <>
                    <span className="text-[rgba(255,255,255,0.15)]">·</span>
                    <span className="text-[10px] text-[rgba(245,240,232,0.40)]">
                      {post.authorDomain}
                    </span>
                  </>
                )}
                <span className="text-[rgba(255,255,255,0.15)]">·</span>
                <span className="text-[9px] text-[rgba(245,240,232,0.20)] font-mono">
                  {timeAgo(post.timestamp)}
                </span>
              </div>
            </div>
          </div>

          <div className="relative" ref={optionsRef}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="text-[rgba(245,240,232,0.25)] hover:text-[#BFA264] transition-colors p-1 -mr-1"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 bg-[#0F0F0F] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 overflow-hidden py-1"
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
                      <Flag className="w-3.5 h-3.5" /> Report Post
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5 mb-4">{parsedContent}</div>

        {/* Asset injection card */}
        {post.linkedAsset && (
          <div className="mb-4">
            <AssetInjectionCard asset={post.linkedAsset} />
          </div>
        )}

        {/* Bounty badge */}
        {post.bounty > 0 && (
          <div className="mb-4">
            <BountyBadge bounty={post.bounty} />
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.hashtags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-full text-[10px] font-bold text-sky-400 cursor-pointer hover:bg-sky-500/20 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onLike(post.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all",
                isLiked
                  ? "text-red-500 bg-red-500/8"
                  : "text-[rgba(245,240,232,0.30)] hover:text-red-400 hover:bg-red-500/8",
              )}
            >
              <Heart
                className={cn(
                  "w-4 h-4 transition-all",
                  isLiked && "fill-current",
                )}
              />
              {post.likesCount > 0 && <span>{post.likesCount}</span>}
            </button>
            <button
              onClick={() => setShowComments((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all",
                showComments
                  ? "text-[#BFA264] bg-[rgba(191,162,100,0.08)]"
                  : "text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)]",
              )}
            >
              <MessageSquare className="w-4 h-4" />
              {post.replyCount > 0 && <span>{post.replyCount}</span>}
            </button>
          </div>

          <button
            onClick={handleShare}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-[11px] font-black relative",
              isCopied
                ? "text-emerald-400"
                : "text-[rgba(245,240,232,0.25)] hover:text-[#BFA264]",
            )}
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <AnimatePresence>
              {isCopied && (
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute -top-7 right-0 text-[8px] font-black text-emerald-400 bg-[#0A0A0A] border border-emerald-500/20 px-2 py-1 rounded-md whitespace-nowrap"
                >
                  Linked!
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
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
      </div>

      {post._optimistic && (
        <div className="absolute inset-0 bg-[#0A0A0A]/40 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-[1.5rem]">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#BFA264]/30 rounded-full shadow-xl">
            <Loader2 className="w-3 h-3 animate-spin text-[#BFA264]" />
            <span className="text-[10px] font-black text-[#BFA264] uppercase tracking-widest">
              Posting...
            </span>
          </div>
        </div>
      )}
    </motion.article>
  );
};

// ─── Skeletons & empty states ──────────────────────────────────────────────────
const PostSkeleton = () => (
  <div className="rounded-[1.5rem] border border-[rgba(255,255,255,0.04)] bg-[#0A0A0A] p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-[#161616]" />
      <div className="flex-1">
        <div className="h-3.5 bg-[#161616] rounded-full w-32 mb-1.5" />
        <div className="h-2.5 bg-[#141414] rounded-full w-20" />
      </div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-[#141414] rounded-full w-full" />
      <div className="h-3 bg-[#141414] rounded-full w-4/5" />
      <div className="h-3 bg-[#141414] rounded-full w-3/5" />
    </div>
    <div className="flex gap-2">
      <div className="h-8 bg-[#141414] rounded-xl w-16" />
      <div className="h-8 bg-[#141414] rounded-xl w-16" />
    </div>
  </div>
);

const EmptyFeed = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="w-20 h-20 rounded-[2rem] bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.15)] flex items-center justify-center mb-6">
      <Zap className="w-9 h-9 text-[rgba(191,162,100,0.4)]" />
    </div>
    <h3 className="text-xl font-black text-[#F5F0E8] mb-2.5 tracking-tight">
      Your Feed is Empty
    </h3>
    <p className="text-sm text-[rgba(245,240,232,0.40)] max-w-[280px] leading-relaxed">
      Form alliances with operators in your domain to populate your execution
      feed with real signal.
    </p>
  </motion.div>
);

const FeedError = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-red-500/8 border border-red-500/20 flex items-center justify-center mb-4">
      <AlertTriangle className="w-7 h-7 text-red-400/70" />
    </div>
    <p className="text-base font-black text-red-400/80 mb-1">
      Transmission Lost
    </p>
    <p className="text-sm text-[rgba(245,240,232,0.30)] mb-5">
      Reconnecting to the network...
    </p>
    <button
      onClick={onRetry}
      className="px-6 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] text-sm font-bold text-[rgba(245,240,232,0.60)] hover:text-[#F5F0E8] rounded-xl transition-all"
    >
      Retry
    </button>
  </div>
);

// ─── Virtualized Feed Engine ──────────────────────────────────────────────────
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
}) => {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: hasMorePosts ? posts.length + 1 : posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Baseline height of a standard post
    overscan: 4, // Keep 4 items cached outside the viewport to prevent flickering
  });

  useEffect(() => {
    const virtualItems = virtualizer.getVirtualItems();
    if (!virtualItems.length) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= posts.length - 1 && hasMorePosts && !feedLoading) {
      onLoadMore();
    }
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
      className="overflow-y-auto custom-scrollbar pr-1 pb-12"
      style={{ maxHeight: "calc(100vh - 200px)" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        <AnimatePresence mode="popLayout">
          {virtualizer.getVirtualItems().map((vItem) => {
            const isLoaderRow = vItem.index >= posts.length;

            return (
              <motion.div
                key={isLoaderRow ? "loader" : posts[vItem.index].id}
                data-index={vItem.index}
                ref={virtualizer.measureElement}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${vItem.start}px)`,
                  paddingBottom: "16px", // Replaces space-y-4
                }}
              >
                {isLoaderRow ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-[rgba(191,162,100,0.4)]" />
                  </div>
                ) : (
                  <PostCard
                    isAdmin={isAdmin}
                    post={posts[vItem.index]}
                    uid={uid}
                    userData={userData}
                    onLike={onLike}
                    onDelete={onDelete}
                    onFetchComments={onFetchComments}
                    onAddComment={onAddComment}
                    onDeleteComment={onDeleteComment}
                    onPeekOperator={onPeekOperator}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEED TAB V3
// ═══════════════════════════════════════════════════════════════════════════════
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
}) => {
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (inView && hasMorePosts && !feedLoading) onLoadMore();
  }, [inView, hasMorePosts, feedLoading, onLoadMore]);

  return (
    <div className="w-full space-y-4 md:space-y-5">
      <PostComposer userData={userData} onPost={onPost} isPosting={isPosting} />

      {feedError ? (
        <FeedError onRetry={onLoadMore} />
      ) : feedLoading && posts.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <VirtualizedFeedContainer
          posts={posts}
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
        />
      )}
    </div>
  );
};

export default FeedTab;
