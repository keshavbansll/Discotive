/**
 * @fileoverview FeedTab — The Discotive Social Feed
 * @description
 * Markdown-aware text composer + infinite scroll post cards.
 * Zero real-time listeners. Full optimistic UI. Skeleton-first loading.
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
import {
  Heart,
  MessageSquare,
  Share2,
  Bold,
  Italic,
  Link2,
  Zap,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Crown,
  Send,
  Check,
  MoreHorizontal,
  Trash2,
  Edit3,
  Flag,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Rich Text Parser ────────────────────────────────────────────────────────
// Converts **bold**, *italic*, [text](url) into React elements

const parseRichText = (text) => {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    if (!line.trim()) {
      return <br key={lineIdx} />;
    }

    // Parse inline markdown
    const parts = [];
    let remaining = line;
    let partIdx = 0;

    const patterns = [
      {
        regex: /\*\*(.+?)\*\*/g,
        render: (match, content) => (
          <strong key={`b-${partIdx++}`} className="font-black text-[#F5F0E8]">
            {content}
          </strong>
        ),
      },
      {
        regex: /\*(.+?)\*/g,
        render: (match, content) => (
          <em
            key={`i-${partIdx++}`}
            className="italic text-[rgba(245,240,232,0.70)]"
          >
            {content}
          </em>
        ),
      },
      {
        regex: /\[(.+?)\]\((.+?)\)/g,
        render: (match, text, url) => (
          <a
            key={`l-${partIdx++}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-[#BFA264] hover:text-[#D4AF78] underline underline-offset-2 transition-colors"
          >
            {text}
          </a>
        ),
      },
    ];

    // Simple tokenizer: find all markdown tokens and render them
    const allTokens = [];

    // Bold
    const boldRe = /\*\*(.+?)\*\*/g;
    let m;
    while ((m = boldRe.exec(line)) !== null) {
      allTokens.push({
        start: m.index,
        end: boldRe.lastIndex,
        type: "bold",
        content: m[1],
      });
    }
    // Italic (not bold)
    const italicRe = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
    while ((m = italicRe.exec(line)) !== null) {
      const overlaps = allTokens.some(
        (t) => m.index < t.end && italicRe.lastIndex > t.start,
      );
      if (!overlaps) {
        allTokens.push({
          start: m.index,
          end: italicRe.lastIndex,
          type: "italic",
          content: m[1],
        });
      }
    }
    // Links
    const linkRe = /\[(.+?)\]\((.+?)\)/g;
    while ((m = linkRe.exec(line)) !== null) {
      allTokens.push({
        start: m.index,
        end: linkRe.lastIndex,
        type: "link",
        text: m[1],
        url: m[2],
      });
    }

    allTokens.sort((a, b) => a.start - b.start);

    if (allTokens.length === 0) {
      return (
        <p
          key={lineIdx}
          className="text-[rgba(245,240,232,0.75)] leading-relaxed text-sm md:text-[15px]"
        >
          {line}
        </p>
      );
    }

    const rendered = [];
    let cursor = 0;
    allTokens.forEach((token, i) => {
      if (cursor < token.start) {
        rendered.push(
          <span key={`txt-${lineIdx}-${i}`}>
            {line.slice(cursor, token.start)}
          </span>,
        );
      }
      if (token.type === "bold") {
        rendered.push(
          <strong
            key={`b-${lineIdx}-${i}`}
            className="font-black text-[#F5F0E8]"
          >
            {token.content}
          </strong>,
        );
      } else if (token.type === "italic") {
        rendered.push(
          <em
            key={`it-${lineIdx}-${i}`}
            className="italic text-[rgba(245,240,232,0.70)]"
          >
            {token.content}
          </em>,
        );
      } else if (token.type === "link") {
        rendered.push(
          <a
            key={`lk-${lineIdx}-${i}`}
            href={token.url}
            target="_blank"
            rel="noreferrer"
            className="text-[#BFA264] hover:text-[#D4AF78] underline underline-offset-2 transition-colors"
          >
            {token.text}
          </a>,
        );
      }
      cursor = token.end;
    });
    if (cursor < line.length) {
      rendered.push(<span key={`tail-${lineIdx}`}>{line.slice(cursor)}</span>);
    }

    return (
      <p
        key={lineIdx}
        className="text-[rgba(245,240,232,0.75)] leading-relaxed text-sm md:text-[15px]"
      >
        {rendered}
      </p>
    );
  });
};

// ─── Time Ago ─────────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
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

// ─── Post Composer ────────────────────────────────────────────────────────────
const PostComposer = ({ userData, onPost, isPosting }) => {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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

    const next = text.slice(0, start) + insertion + text.slice(end);
    setText(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + insertion.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!text.trim() || isPosting) return;
    const result = await onPost(text);
    if (result !== null) setText("");
  };

  const initials =
    `${userData?.identity?.firstName?.charAt(0) || ""}${userData?.identity?.lastName?.charAt(0) || ""}` ||
    "U";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
        isFocused
          ? "bg-[#0F0F0F] border-[rgba(191,162,100,0.35)] shadow-[0_0_40px_rgba(191,162,100,0.08)]"
          : "bg-[#0A0A0A] border-[rgba(255,255,255,0.07)] hover:border-[rgba(191,162,100,0.15)]",
      )}
    >
      <div className="flex items-start gap-3.5 p-4 md:p-5">
        {/* Avatar */}
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

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, maxLen))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Share an execution update, milestone, or insight with your network..."
            rows={isFocused || text ? 4 : 2}
            className="w-full bg-transparent text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.20)] text-sm md:text-[15px] font-medium resize-none border-none outline-none leading-relaxed custom-scrollbar transition-all"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          />
        </div>
      </div>

      {/* Toolbar — visible when focused or has content */}
      <AnimatePresence>
        {(isFocused || text.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-[rgba(255,255,255,0.04)] px-4 md:px-5 py-3 flex items-center justify-between gap-3"
          >
            {/* Format buttons */}
            <div className="flex items-center gap-1">
              {[
                { icon: Bold, syntax: "bold", label: "Bold" },
                { icon: Italic, syntax: "italic", label: "Italic" },
                { icon: Link2, syntax: "link", label: "Link" },
              ].map(({ icon: Icon, syntax, label }) => (
                <button
                  key={syntax}
                  type="button"
                  onClick={() => handleFormat(syntax)}
                  title={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(245,240,232,0.35)] hover:text-[#BFA264] hover:bg-[rgba(191,162,100,0.08)] transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {/* Character count */}
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

              {/* Post button */}
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Post Card (Telemetry Node) ───────────────────────────────────────────────
const PostCard = ({ post, uid, onLike, userData }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const optionsRef = useRef(null);

  const isLiked = (post.likedBy || []).includes(uid);
  const isAuthor = post.authorId === uid;
  const initials = `${post.authorName?.charAt(0) || ""}`.toUpperCase() || "O";

  // Click-outside listener to dismiss the tactical menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShare = async () => {
    const url = `${window.location.origin}/@${post.authorUsername || "operator"}/network/post/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link to clipboard");
    }
  };

  // Psychological Hook: Pseudo-algorithmic relevance match based on ID hash
  const matchPrc = useMemo(() => {
    if (!post.id) return 99;
    const charCode = post.id.charCodeAt(post.id.length - 1) || 50;
    return Math.max(72, Math.min(99, charCode));
  }, [post.id]);

  const isPro = post.authorTier === "PRO";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "group relative rounded-[1.5rem] border transition-all duration-300 overflow-hidden",
        post._optimistic
          ? "bg-[#0A0A0A] border-[rgba(191,162,100,0.20)] opacity-70"
          : isPro
            ? "bg-gradient-to-b from-[#0F0F0F] to-[#050505] border-[rgba(191,162,100,0.15)] hover:border-[rgba(191,162,100,0.40)] hover:shadow-[0_8px_32px_rgba(191,162,100,0.08)]"
            : "bg-gradient-to-b from-[#0A0A0A] to-[#030303] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.8)]",
      )}
    >
      {/* Dynamic Pro Glow Bar */}
      {isPro && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#BFA264] to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
      )}

      <div className="p-4 md:p-5 relative z-10">
        {/* Author row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-black shrink-0 transition-transform group-hover:scale-105 overflow-hidden",
                  isPro
                    ? "bg-[#111] border border-[#BFA264]/40 text-[#BFA264] shadow-[inset_0_0_12px_rgba(191,162,100,0.15)]"
                    : "bg-[#111] border border-[#BFA264]/40 text-[#BFA264]",
                )}
              >
                {post.authorAvatar ||
                (isAuthor ? userData?.identity?.avatarUrl : null) ? (
                  <img
                    src={
                      post.authorAvatar ||
                      (isAuthor ? userData?.identity?.avatarUrl : null)
                    }
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {isPro && (
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full border-[2.5px] border-[#0A0A0A] flex items-center justify-center shadow-lg">
                  <Crown className="w-2.5 h-2.5 text-[#030303]" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[#F5F0E8] leading-tight tracking-tight">
                  {post.authorName || "Operator"}
                </p>
                {/* Visual execution badge */}
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.05)] text-[9px] font-black text-[rgba(245,240,232,0.40)] uppercase tracking-widest">
                  <Zap className="w-2.5 h-2.5 text-[#BFA264]" /> ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {post.authorUsername && (
                  <span className="text-[10px] text-[rgba(245,240,232,0.35)] font-mono tracking-tight">
                    @{post.authorUsername}
                  </span>
                )}
                {post.authorDomain && (
                  <>
                    <span className="text-[rgba(245,240,232,0.15)]">/</span>
                    <span className="text-[10px] font-bold text-[rgba(245,240,232,0.50)]">
                      {post.authorDomain}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Telemetry Output & Context Menu */}
          <div className="flex items-start gap-4 shrink-0">
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-[rgba(245,240,232,0.20)] font-mono tracking-widest uppercase">
                SYS.T-{timeAgo(post.timestamp).replace(" ", "")}
              </span>
              <span
                className={cn(
                  "text-[9px] font-black font-mono",
                  matchPrc > 90 ? "text-emerald-400/80" : "text-[#BFA264]/70",
                )}
              >
                {matchPrc}% MATCH
              </span>
            </div>

            {/* Tactical Dropdown Menu */}
            <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] transition-colors p-1 -mr-2 outline-none"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {showOptions && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-44 bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                  >
                    {isAuthor ? (
                      <>
                        <button
                          onClick={() => {
                            alert("Edit feature coming soon.");
                            setShowOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F0E8] transition-all text-left outline-none"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Post
                        </button>
                        <button
                          onClick={() => {
                            alert("Deleting post...");
                            setShowOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-red-500/10 hover:text-red-400 transition-all text-left outline-none"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            alert("Post reported.");
                            setShowOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-[rgba(255,255,255,0.04)] hover:text-red-400 transition-all text-left outline-none"
                        >
                          <Flag className="w-3.5 h-3.5" /> Report Post
                        </button>
                        <button
                          onClick={() => {
                            alert("User blocked.");
                            setShowOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[rgba(245,240,232,0.60)] hover:bg-[rgba(255,255,255,0.04)] hover:text-amber-400 transition-all text-left outline-none"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" /> Block User
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5 mb-5 pl-0 md:pl-[58px]">
          {parseRichText(post.textContent)}
        </div>

        {/* Actions - Minimalist Bare Icons */}
        <div className="flex items-center justify-end gap-2 pl-0 md:pl-[58px] select-none">
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-black tracking-widest uppercase transition-all group/like outline-none",
              isLiked
                ? "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                : "text-[rgba(245,240,232,0.30)] hover:text-red-400",
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all duration-300 group-hover/like:scale-110",
                isLiked ? "fill-current" : "fill-transparent",
              )}
            />
            <span className="w-3 text-left">
              {post.likesCount > 0 ? post.likesCount : ""}
            </span>
          </button>

          <button
            onClick={() => alert("Comments will be available soon.")}
            className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-black tracking-widest uppercase text-[rgba(245,240,232,0.30)] hover:text-[#BFA264] transition-all group/comment outline-none"
          >
            <MessageSquare className="w-4 h-4 transition-transform duration-300 group-hover/comment:scale-110" />
            <span className="w-3 text-left">
              {post.replyCount > 0 ? post.replyCount : ""}
            </span>
          </button>

          <div className="w-px h-3 bg-[rgba(255,255,255,0.1)] mx-1" />

          <button
            onClick={handleShare}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 transition-all group/share outline-none relative",
              isCopied
                ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                : "text-[rgba(245,240,232,0.30)] hover:text-[#BFA264]",
            )}
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4 transition-transform duration-300 group-hover/share:scale-110" />
            )}

            {/* Inline Copy Tooltip */}
            <AnimatePresence>
              {isCopied && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute -top-6 right-0 text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-[#0A0A0A] border border-emerald-500/20 px-2 py-1 rounded-md"
                >
                  Linked
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Optimistic indicator overlay */}
      {post._optimistic && (
        <div className="absolute inset-0 bg-[#0A0A0A]/40 backdrop-blur-[1px] flex items-center justify-center z-20">
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

// ─── Post Skeleton ────────────────────────────────────────────────────────────
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
    <div className="h-px bg-[rgba(255,255,255,0.03)] mb-3.5" />
    <div className="flex gap-2">
      <div className="h-8 bg-[#141414] rounded-xl w-16" />
      <div className="h-8 bg-[#141414] rounded-xl w-16" />
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
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

// ─── Error State ──────────────────────────────────────────────────────────────
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
      className="px-6 py-2.5 bg-[#111] border border-[rgba(255,255,255,0.07)] text-sm font-bold text-[rgba(245,240,232,0.60)] hover:text-[#F5F0E8] hover:border-[rgba(255,255,255,0.12)] rounded-xl transition-all"
    >
      Retry
    </button>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// FEED TAB (Main Export)
// ═══════════════════════════════════════════════════════════════════════════════
const FeedTab = ({
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
}) => {
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1 });

  useEffect(() => {
    if (inView && hasMorePosts && !feedLoading) {
      onLoadMore();
    }
  }, [inView, hasMorePosts, feedLoading, onLoadMore]);

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-5">
      {/* Composer */}
      <PostComposer userData={userData} onPost={onPost} isPosting={isPosting} />

      {/* Feed content */}
      {feedError ? (
        <FeedError onRetry={onLoadMore} />
      ) : feedLoading && posts.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  uid={uid}
                  onLike={onLike}
                  userData={userData}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMorePosts && (
            <div ref={loadMoreRef} className="flex justify-center pt-8 pb-12">
              <Loader2 className="w-6 h-6 animate-spin text-[rgba(191,162,100,0.4)]" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FeedTab;
