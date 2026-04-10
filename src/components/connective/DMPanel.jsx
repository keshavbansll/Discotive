/**
 * @fileoverview DMPanel.jsx — Discotive Direct Messaging Interface
 * @description
 * Full DM panel with conversation list + message thread.
 * Optimistic messages. Professional aesthetic.
 * Accessible as a slide-in panel from the Network page.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Send,
  X,
  ArrowLeft,
  Loader2,
  Search,
  Crown,
  Check,
  CheckCheck,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "../../lib/cn";

// ─── Time formatter ────────────────────────────────────────────────────────────
const timeAgo = (date) => {
  if (!date) return "";
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// ─── Conversation Item ─────────────────────────────────────────────────────────
const ConversationItem = ({ conversation, uid, isActive, onClick }) => {
  const partnerId = conversation.participantIds?.find((id) => id !== uid);
  const partnerData = conversation.participants?.[partnerId] || {};
  const partnerName = partnerData.name || "Operator";
  const initials = partnerName.charAt(0).toUpperCase();
  const unreadCount = conversation.unreadCounts?.[uid] || 0;
  const isLastSenderMe = conversation.lastSenderId === uid;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all text-left hover:bg-[rgba(255,255,255,0.03)]",
        isActive
          ? "bg-[rgba(191,162,100,0.06)] border-l-2 border-[#BFA264]"
          : "border-l-2 border-transparent",
      )}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden">
          {partnerData.avatarUrl ? (
            <img
              src={partnerData.avatarUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        {unreadCount > 0 && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#BFA264] rounded-full border-2 border-[#0A0A0A] flex items-center justify-center">
            <span className="text-[7px] font-black text-[#030303]">
              {Math.min(unreadCount, 9)}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p
            className={cn(
              "text-sm font-bold truncate",
              unreadCount > 0
                ? "text-[#F5F0E8]"
                : "text-[rgba(245,240,232,0.70)]",
            )}
          >
            {partnerName}
          </p>
          <span className="text-[9px] text-[rgba(245,240,232,0.25)] shrink-0 ml-2">
            {timeAgo(conversation.lastMessageAt)}
          </span>
        </div>
        <p
          className={cn(
            "text-[11px] truncate",
            unreadCount > 0
              ? "text-[rgba(245,240,232,0.60)] font-medium"
              : "text-[rgba(245,240,232,0.30)]",
          )}
        >
          {isLastSenderMe && <span className="mr-1">You: </span>}
          {conversation.lastMessage || "Start a conversation"}
        </p>
      </div>
    </button>
  );
};

// ─── Format Link Parser ────────────────────────────────────────────────────────
const formatMessageContent = (htmlContent) => {
  if (!htmlContent) return { __html: "" };
  const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<]+)/g;
  const processed = htmlContent.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline cursor-pointer" oncontextmenu="event.preventDefault(); navigator.clipboard.writeText('${url}'); alert('Link copied!');">${url}</a>`;
  });
  return { __html: processed };
};

// ─── Typing Indicator Component ──────────────────────────────────────────────
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-end gap-2 max-w-[80%] mb-2"
  >
    <div className="px-4 py-3 rounded-2xl bg-[#0F0F0F] border border-[rgba(255,255,255,0.05)] rounded-bl-sm flex items-center gap-1.5 w-fit shadow-sm">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
        className="w-1.5 h-1.5 rounded-full bg-[rgba(245,240,232,0.4)]"
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
        className="w-1.5 h-1.5 rounded-full bg-[rgba(245,240,232,0.4)]"
      />
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
        className="w-1.5 h-1.5 rounded-full bg-[rgba(245,240,232,0.4)]"
      />
    </div>
  </motion.div>
);

// ─── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn, onDelete, onEdit }) => {
  const [menuPos, setMenuPos] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.textContent);
  const holdTimer = useRef(null);

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    holdTimer.current = setTimeout(() => {
      setMenuPos({ x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(holdTimer.current);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.textContent) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
    setMenuPos(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex items-end gap-2 max-w-[80%] relative group",
        isOwn ? "ml-auto flex-row-reverse" : "",
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div
        className={cn(
          "px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-medium shadow-sm transition-all select-text",
          message._optimistic ? "opacity-60" : "",
          isOwn
            ? "bg-[rgba(191,162,100,0.15)] border border-[rgba(191,162,100,0.25)] text-[#D4AF78] rounded-br-sm"
            : "bg-[#0F0F0F] border border-[rgba(255,255,255,0.05)] text-[rgba(245,240,232,0.80)] rounded-bl-sm",
          menuPos ? "ring-2 ring-[#BFA264]" : "",
        )}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[240px] md:min-w-[300px] mt-1 mb-1">
            <div
              contentEditable
              className="bg-[#050505] border border-[rgba(191,162,100,0.20)] focus:border-[#D4AF78] focus:shadow-[0_0_12px_rgba(191,162,100,0.15)] rounded-xl px-3 py-2 text-sm text-[rgba(245,240,232,0.9)] outline-none transition-all max-h-[150px] overflow-y-auto custom-scrollbar"
              onInput={(e) => setEditText(e.currentTarget.innerHTML)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
              dangerouslySetInnerHTML={{ __html: message.textContent }}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[8px] text-[rgba(245,240,232,0.25)] font-mono">
                Enter to save · Shift+Enter for newline
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-[10px] text-[rgba(245,240,232,0.4)] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="text-[10px] text-[#030303] bg-[#BFA264] hover:bg-[#D4AF78] px-2.5 py-1 rounded-md font-bold transition-colors shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            dangerouslySetInnerHTML={formatMessageContent(message.textContent)}
          />
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isOwn ? "justify-end" : "justify-start",
          )}
        >
          <span className="text-[8px] opacity-40">
            {message.timestamp instanceof Date
              ? message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
            {message.isEdited && " (edited)"}
          </span>
          {isOwn && !message._optimistic && (
            <CheckCheck className="w-3 h-3 opacity-40" />
          )}
          {isOwn && message._optimistic && (
            <Check className="w-3 h-3 opacity-40" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {menuPos && (
          <div
            className="fixed inset-0 z-[99999]"
            onClick={(e) => {
              e.stopPropagation();
              setMenuPos(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuPos(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{
                top: Math.min(menuPos.y, window.innerHeight - 180),
                left: Math.min(menuPos.x, window.innerWidth - 160),
              }}
              className="fixed bg-[#0A0A0A] border border-[rgba(191,162,100,0.20)] rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[100000] min-w-[140px] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {isOwn && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setMenuPos(null);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-xs font-bold hover:bg-[rgba(191,162,100,0.1)] text-[#D4AF78] w-full transition-colors border-b border-[rgba(255,255,255,0.04)]"
                >
                  Edit Signal
                </button>
              )}
              {isOwn && (
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setMenuPos(null);
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-xs font-bold hover:bg-[rgba(239,68,68,0.1)] text-red-400 w-full transition-colors border-b border-[rgba(255,255,255,0.04)]"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setMenuPos(null)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-bold hover:bg-[rgba(255,255,255,0.03)] text-[rgba(245,240,232,0.40)] w-full transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Message Input ─────────────────────────────────────────────────────────────
const MessageInput = ({ onSend, disabled, onTyping }) => {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSend = () => {
    const cleanText = text.replace(/<[^>]*>?/gm, "").trim();
    if (!cleanText && !text.includes("<img")) return;
    if (disabled) return;
    onSend(text);
    setText("");
    if (inputRef.current) {
      inputRef.current.innerHTML = "";
      inputRef.current.focus();
    }
  };

  const handleInput = (e) => {
    setText(e.currentTarget.innerHTML);

    // Throttle RTDB typing signals to prevent spamming the database
    if (onTyping && !typingTimeoutRef.current) {
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000); // Only fire typing signal every 2 seconds max
    }
  };

  return (
    <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-[#050505]">
      <div
        className={cn(
          "flex items-center gap-2 bg-[#0A0A0A] border rounded-2xl px-4 py-2.5 transition-all",
          "border-[rgba(191,162,100,0.20)] focus-within:border-[#D4AF78] focus-within:shadow-[0_0_15px_rgba(191,162,100,0.1)]",
        )}
      >
        <div
          ref={inputRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
              e.currentTarget.innerHTML = "";
            }
          }}
          data-placeholder="... "
          className="flex-1 bg-transparent text-sm text-[rgba(245,240,232,0.80)] outline-none font-medium min-h-[20px] max-h-[150px] overflow-y-auto custom-scrollbar empty:before:content-[attr(data-placeholder)] empty:before:text-[rgba(245,240,232,0.25)]"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0",
            text.trim() && !disabled
              ? "bg-[#BFA264] text-[#030303] hover:bg-[#D4AF78] shadow-[0_0_10px_rgba(191,162,100,0.3)]"
              : "bg-[#111] text-[rgba(245,240,232,0.20)] cursor-not-allowed",
          )}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[9px] text-center text-[rgba(245,240,232,0.15)] mt-2">
        Press Enter to send · End-to-end encrypted
      </p>
    </div>
  );
};

// ─── Empty conversation state ──────────────────────────────────────────────────
const EmptyConversation = ({ partner, onSend }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
    <div className="w-16 h-16 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-xl font-black text-[#BFA264]">
      {partner?.identity?.firstName?.charAt(0)?.toUpperCase() || "O"}
    </div>
    <div>
      <p className="text-sm font-black text-[#F5F0E8] mb-1">
        {`${partner?.identity?.firstName || ""} ${partner?.identity?.lastName || ""}`.trim() ||
          "Operator"}
      </p>
      <p className="text-xs text-[rgba(245,240,232,0.35)] max-w-[200px] leading-relaxed">
        Start a conversation. Messages are visible only to you and this
        operator.
      </p>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// DM PANEL (Main Export)
// ═══════════════════════════════════════════════════════════════════════════════
const DMPanel = ({
  isOpen,
  onClose,
  urlConvoId, // Passed from URL
  uid,
  userData,
  conversations,
  messages,
  messagesLoading,
  dmLoading,
  activeConversation,
  setActiveConversation,
  onFetchConversations,
  onFetchMessages,
  onSendMessage,
  onMarkRead,
  onDeleteMessage = () => {},
  onEditMessage = () => {},
  onTyping = () => {},
  isPartnerTyping = false,
  // For opening a new DM directly to a user
  initialTargetUser = null,
  onClearInitialTarget,
}) => {
  const [search, setSearch] = useState("");
  const [activePartner, setActivePartner] = useState(null);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const lastMsgDocRef = useRef(null);

  // Sync URL state to internal conversation state
  useEffect(() => {
    if (urlConvoId && urlConvoId !== "menu" && isOpen) {
      const existing = conversations.find((c) => c.id === urlConvoId);
      if (existing && activeConversation !== urlConvoId) {
        handleSelectConversation(existing);
      }
    }
  }, [urlConvoId, conversations, isOpen]);

  useEffect(() => {
    if (initialTargetUser && isOpen) {
      setActivePartner(initialTargetUser);
      setActiveConversation(null);
      // Find existing conversation
      const existing = conversations.find((c) =>
        c.participantIds?.includes(initialTargetUser.id),
      );
      if (existing) {
        handleSelectConversation(existing);
      }
    }
  }, [initialTargetUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      onFetchConversations();
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSelectConversation = async (conversation) => {
    setLoadingConvo(true);
    setActiveConversation(conversation.id);
    lastMsgDocRef.current = null;

    // Identify partner
    const partnerId = conversation.participantIds?.find((id) => id !== uid);
    const partnerData = conversation.participants?.[partnerId] || {};
    setActivePartner({
      id: partnerId,
      identity: {
        firstName: partnerData.name?.split(" ")[0] || "",
        lastName: partnerData.name?.split(" ").slice(1).join(" ") || "",
        username: partnerData.username || "",
        avatarUrl: partnerData.avatarUrl || null,
      },
    });

    await onFetchMessages(conversation.id);
    await onMarkRead(conversation.id);
    setLoadingConvo(false);
  };

  const handleSend = async (text) => {
    const targetId = activePartner?.id;
    if (!text.trim()) return;
    await onSendMessage(activeConversation, targetId, text);
    if (onClearInitialTarget) onClearInitialTarget();
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search.trim()) return true;
    const partnerId = c.participantIds?.find((id) => id !== uid);
    const partnerData = c.participants?.[partnerId] || {};
    return partnerData.name?.toLowerCase().includes(search.toLowerCase());
  });

  const partnerDisplayName =
    `${activePartner?.identity?.firstName || ""} ${activePartner?.identity?.lastName || ""}`.trim() ||
    activePartner?.identity?.username ||
    "Operator";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[400] flex items-end md:items-center justify-end md:justify-end p-0 md:pb-6 md:pr-6 md:pl-6 md:pt-[6.5rem] bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className={cn(
              "bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-t-[2rem] md:rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.95)] flex overflow-hidden transition-all duration-300",
              isExpanded
                ? "w-full md:w-[85vw] h-[95vh] md:h-[80vh]"
                : "w-full md:w-[780px] h-[90vh] md:h-[680px] md:max-h-[80vh]",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT: Conversation List */}
            <div
              className={cn(
                "flex flex-col border-r border-[rgba(255,255,255,0.05)] transition-all",
                activeConversation || activePartner
                  ? "hidden md:flex md:w-64 xl:w-72 shrink-0"
                  : "flex-1 md:w-64 xl:w-72 md:flex-none",
              )}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#BFA264]" />
                  <h3 className="text-sm font-black text-[#F5F0E8]">
                    Messages
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] hidden md:flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                  >
                    {isExpanded ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.04)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(245,240,232,0.20)]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[rgba(245,240,232,0.70)] placeholder-[rgba(245,240,232,0.20)] pl-8 pr-3 py-2 rounded-xl outline-none focus:border-[rgba(191,162,100,0.30)] transition-all"
                  />
                </div>
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {dmLoading ? (
                  <div className="space-y-1 p-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-14 bg-[rgba(255,255,255,0.02)] rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                    <MessageCircle className="w-10 h-10 text-[rgba(245,240,232,0.08)] mb-3" />
                    <p className="text-xs font-bold text-[rgba(245,240,232,0.25)]">
                      No messages yet
                    </p>
                    <p className="text-[10px] text-[rgba(245,240,232,0.15)] mt-1">
                      Message allies from their profile
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((convo) => (
                    <ConversationItem
                      key={convo.id}
                      conversation={convo}
                      uid={uid}
                      isActive={activeConversation === convo.id}
                      onClick={() => handleSelectConversation(convo)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* RIGHT: Message Thread */}
            <div
              className={cn(
                "flex-1 flex flex-col min-w-0",
                !activeConversation && !activePartner
                  ? "hidden md:flex"
                  : "flex",
              )}
            >
              {activeConversation || activePartner ? (
                <>
                  {/* Thread header */}
                  <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.05)] flex items-center gap-3 shrink-0 bg-[#050505]">
                    <button
                      onClick={() => {
                        setActiveConversation(null);
                        setActivePartner(null);
                      }}
                      className="md:hidden w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-[#111] border border-[#BFA264]/30 flex items-center justify-center text-sm font-black text-[#BFA264] overflow-hidden">
                      {activePartner?.identity?.avatarUrl ? (
                        <img
                          src={activePartner.identity.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        partnerDisplayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#F5F0E8]">
                        {partnerDisplayName}
                      </p>
                      {activePartner?.identity?.username && (
                        <p className="text-[10px] text-[rgba(245,240,232,0.30)] font-mono">
                          @{activePartner.identity.username}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto hidden md:flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (
                            window.confirm("Delete this conversation entirely?")
                          ) {
                            setActiveConversation(null);
                            setActivePartner(null);
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-[rgba(255,50,50,0.1)] flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Delete DM"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                      >
                        {isExpanded ? (
                          <Minimize2 className="w-3.5 h-3.5" />
                        ) : (
                          <Maximize2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {loadingConvo || messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin text-[rgba(191,162,100,0.4)]" />
                      </div>
                    ) : messages.length === 0 ? (
                      <EmptyConversation partner={activePartner} />
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <MessageBubble
                            key={msg.id}
                            message={msg}
                            isOwn={msg.senderId === uid}
                            onDelete={(msgId) =>
                              onDeleteMessage(activeConversation, msgId)
                            }
                            onEdit={(msgId, newText) =>
                              onEditMessage(activeConversation, msgId, newText)
                            }
                          />
                        ))}
                        <AnimatePresence>
                          {isPartnerTyping && (
                            <TypingIndicator key="typing-indicator" />
                          )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  <MessageInput
                    onSend={handleSend}
                    disabled={loadingConvo}
                    onTyping={() => onTyping(activeConversation)}
                  />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-[rgba(191,162,100,0.06)] border border-[rgba(191,162,100,0.15)] flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-[rgba(191,162,100,0.4)]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#F5F0E8] mb-1">
                      Select a Conversation
                    </p>
                    <p className="text-xs text-[rgba(245,240,232,0.35)]">
                      Choose from your conversations or start a new one via an
                      operator's profile.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default DMPanel;
