/**
 * @fileoverview DMPanel.jsx — Discotive Direct Messaging Interface
 * @description
 * Full DM panel with conversation list + message thread.
 * Optimistic messages. Professional aesthetic.
 * Accessible as a slide-in panel from the Network page.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Message Bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isOwn }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className={cn(
      "flex items-end gap-2 max-w-[80%]",
      isOwn && "ml-auto flex-row-reverse",
    )}
  >
    <div
      className={cn(
        "px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-medium shadow-sm",
        message._optimistic ? "opacity-60" : "",
        isOwn
          ? "bg-[rgba(191,162,100,0.15)] border border-[rgba(191,162,100,0.25)] text-[#D4AF78] rounded-br-sm"
          : "bg-[#0F0F0F] border border-[rgba(255,255,255,0.05)] text-[rgba(245,240,232,0.80)] rounded-bl-sm",
      )}
    >
      <p>{message.textContent}</p>
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
        </span>
        {isOwn && !message._optimistic && (
          <CheckCheck className="w-3 h-3 opacity-40" />
        )}
        {isOwn && message._optimistic && (
          <Check className="w-3 h-3 opacity-40" />
        )}
      </div>
    </div>
  </motion.div>
);

// ─── Message Input ─────────────────────────────────────────────────────────────
const MessageInput = ({ onSend, disabled }) => {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div className="p-4 border-t border-[rgba(255,255,255,0.05)] bg-[#050505]">
      <div
        className={cn(
          "flex items-center gap-2 bg-[#0A0A0A] border rounded-2xl px-4 py-2.5 transition-all",
          "border-[rgba(191,162,100,0.20)] focus-within:border-[#D4AF78] focus-within:shadow-[0_0_15px_rgba(191,162,100,0.1)]",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Write a message..."
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-[rgba(245,240,232,0.80)] placeholder-[rgba(245,240,232,0.25)] outline-none font-medium"
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
  // For opening a new DM directly to a user
  initialTargetUser = null,
  onClearInitialTarget,
}) => {
  const [search, setSearch] = useState("");
  const [activePartner, setActivePartner] = useState(null);
  const [loadingConvo, setLoadingConvo] = useState(false);
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-end md:justify-end p-0 md:p-6 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="w-full md:w-[780px] h-[90vh] md:h-[680px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-t-[2rem] md:rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.95)] flex overflow-hidden"
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
                <h3 className="text-sm font-black text-[#F5F0E8]">Messages</h3>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
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
              !activeConversation && !activePartner ? "hidden md:flex" : "flex",
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
                  <button
                    onClick={onClose}
                    className="ml-auto w-7 h-7 rounded-full bg-[rgba(255,255,255,0.05)] hidden md:flex items-center justify-center text-[rgba(245,240,232,0.40)] hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                <MessageInput onSend={handleSend} disabled={loadingConvo} />
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
    </AnimatePresence>
  );
};

export default DMPanel;
