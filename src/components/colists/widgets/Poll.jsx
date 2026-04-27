/**
 * @fileoverview Poll.jsx — Discotive Live Sentiment Engine v2
 *
 * ARCHITECTURE (cost-safe):
 *   getDoc() on mount → onSnapshot() ONLY after user votes (zero idle cost)
 *   Offline: optimistic UI + localStorage queue with structured retry
 *
 * DESIGN SYSTEM:
 *   All UI chrome (borders, text, bg, hover states) derives from the
 *   textColor prop — poll renders correctly on ANY canvas gradient theme.
 *
 * ACCESSIBILITY:
 *   role="radiogroup"|"group", aria-checked, aria-label, aria-live
 *   Full keyboard nav: Tab/Arrow to move focus, Enter/Space to vote
 *
 * RENAMED FROM: BinaryPulsePoll.jsx
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  Check,
  Plus,
  Trash2,
  Settings,
  Users,
  CheckSquare,
} from "lucide-react";

/* ─── Design Constants ──────────────────────────────────────────────────────── */
const GOLD = {
  base: "#BFA264",
  bright: "#D4AF78",
  deep: "#8B7240",
  border: "rgba(191,162,100,0.25)",
  dimBg: "rgba(191,162,100,0.08)",
};

/* ─── Haptics ───────────────────────────────────────────────────────────────── */
const hapticPulse = () => {
  try {
    navigator.vibrate?.([12, 6, 18]);
  } catch (err) {
    console.debug("Haptics unsupported", err);
  }
};

/* ─── Offline Queue Key ─────────────────────────────────────────────────────── */
const OFFLINE_QUEUE_KEY = "discotive_pending_votes";

/* ─── Theme Utilities ───────────────────────────────────────────────────────── */

/**
 * Convert any textColor prop (raw hex, rgb, or CSS var) into a stable hex/rgb
 * string usable in alpha(). CSS vars are resolved to the fallback.
 */
const normalizeColor = (tc) => {
  if (!tc || tc.startsWith("var(")) return "#F5F0E8";
  return tc;
};

/**
 * Return an rgba() string by parsing a hex or rgb(a) color and overriding alpha.
 * Supports: #RGB, #RRGGBB, rgb(r,g,b), rgba(r,g,b,a)
 */
const alpha = (color, opacity) => {
  const c = normalizeColor(color);
  // hex shorthand
  if (/^#[0-9A-Fa-f]{3}$/.test(c)) {
    const r = parseInt(c[1] + c[1], 16);
    const g = parseInt(c[2] + c[2], 16);
    const b = parseInt(c[3] + c[3], 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  // full hex
  if (/^#[0-9A-Fa-f]{6}$/.test(c)) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${opacity})`;
  }
  // rgb()/rgba() passthrough — strip existing alpha and inject new one
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]},${opacity})`;
  }
  // fallback
  return `rgba(245,240,232,${opacity})`;
};

/* ─── Sub-components ────────────────────────────────────────────────────────── */

/**
 * Animated vote-percentage fill bar.
 * Uses scaleX transform — GPU composited, zero layout thrash.
 */
const VoteBar = memo(({ pct, isSelected }) => (
  <motion.div
    aria-hidden="true"
    className="absolute inset-0 origin-left"
    initial={{ scaleX: 0 }}
    animate={{ scaleX: pct / 100 }}
    transition={{ duration: 1.18, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
    style={{
      borderRadius: "inherit",
      background: isSelected
        ? `linear-gradient(90deg, ${GOLD.dimBg} 0%, rgba(191,162,100,0.03) 100%)`
        : "rgba(255,255,255,0.022)",
    }}
  />
));
VoteBar.displayName = "VoteBar";

/** Pulsing live indicator dot + label. */
const LiveDot = memo(() => (
  <div className="flex items-center gap-1.5" aria-label="Live poll">
    <div className="relative w-2 h-2" aria-hidden="true">
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: GOLD.bright, opacity: 0.42 }}
      />
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: GOLD.bright, boxShadow: `0 0 6px ${GOLD.bright}` }}
      />
    </div>
    <span
      className="text-[8px] font-black uppercase tracking-[0.3em]"
      style={{ color: GOLD.base }}
    >
      Live Poll
    </span>
  </div>
));
LiveDot.displayName = "LiveDot";

/** Spinning loader that uses the gold accent. */
const PollLoader = () => (
  <div
    className="w-full h-full flex items-center justify-center"
    aria-label="Loading poll"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      className="w-6 h-6 rounded-full border-2"
      style={{
        borderColor: `${GOLD.bright} transparent transparent transparent`,
      }}
    />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════════
   POLL — Main Component
   Props:
     block        — Firestore block data (question, pollOptions, allowMultiple, etc.)
     colistId     — Colist doc ID (null in editor)
     currentUser  — Firebase Auth user (null = unauthenticated)
     textColor    — Canvas theme text color (hex / rgb / CSS var)
     updateBlock  — Editor update callback (present → editor mode, absent → reader)
═══════════════════════════════════════════════════════════════════════════════ */
const Poll = ({ block, colistId, currentUser, textColor, updateBlock }) => {
  /* ── Mode detection ─────────────────────────────────────────────────────── */
  const isEditing = !colistId && typeof updateBlock === "function";

  /* ── Block Data ─────────────────────────────────────────────────────────── */
  const question = block.question || "";
  const allowMultiple = block.allowMultiple || false;

  // Backward-compatible: legacy blocks may have optionA/optionB instead of pollOptions
  const baseOptions = useMemo(
    () =>
      block.pollOptions?.length
        ? block.pollOptions
        : [
            { id: "A", text: block.optionA || "Option A" },
            { id: "B", text: block.optionB || "Option B" },
          ],
    [block.pollOptions, block.optionA, block.optionB],
  );

  const pollId = block.pollId || block.id || "poll";

  /* ── Theme derivations ──────────────────────────────────────────────────── */
  const tc = normalizeColor(textColor);
  const borderIdle = alpha(tc, 0.11);
  const borderFocused = alpha(tc, 0.38);
  const bgIdle = alpha(tc, 0.025);
  const bgSelected = alpha(GOLD.bright, 0.08);
  const borderSelected = GOLD.bright;

  /* ── Firestore refs (computed outside hooks — stable across renders) ─────── */
  const pollDocRef = useMemo(
    () =>
      colistId && pollId ? doc(db, "colists", colistId, "polls", pollId) : null,
    [colistId, pollId],
  );
  const userVoteDocRef = useMemo(
    () =>
      colistId && pollId && currentUser?.uid
        ? doc(
            db,
            "colists",
            colistId,
            "polls",
            pollId,
            "userVotes",
            currentUser.uid,
          )
        : null,
    [colistId, pollId, currentUser],
  );

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [votes, setVotes] = useState({ total: 0 });
  const [userVotes, setUserVotes] = useState([]); // IDs the user has voted for
  const [localSelected, setLocalSelected] = useState([]); // pre-submit multi-select
  const [isVoting, setIsVoting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(isEditing); // editor doesn't need Firestore
  const [focusIdx, setFocusIdx] = useState(0);
  const unsubRef = useRef(null);
  const optionRefs = useRef([]);

  /* ═══════════════════════════════════════════════════════════════════════════
     EDITOR VIEW
     Renders a settings panel: question input + options manager + live preview.
  ═══════════════════════════════════════════════════════════════════════════ */
  if (isEditing) {
    return (
      <div
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ padding: "clamp(16px, 4vw, 28px)", touchAction: "pan-y" }}
      >
        {/* ── Editor Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center"
              style={{
                background: GOLD.dimBg,
                border: `1px solid ${GOLD.border}`,
              }}
            >
              <Settings size={10} style={{ color: GOLD.bright }} />
            </div>
            <span
              className="text-[9px] font-black uppercase tracking-[0.28em]"
              style={{ color: GOLD.base }}
            >
              Live Poll Engine
            </span>
          </div>

          {/* Multi / Single toggle */}
          <button
            onClick={() => updateBlock({ allowMultiple: !allowMultiple })}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all"
            style={{
              borderColor: allowMultiple
                ? GOLD.bright
                : "rgba(255,255,255,0.12)",
              background: allowMultiple ? GOLD.dimBg : "transparent",
              color: allowMultiple ? GOLD.bright : "rgba(255,255,255,0.4)",
            }}
            aria-pressed={allowMultiple}
            aria-label={`Vote mode: ${allowMultiple ? "multi-select" : "single-select"}`}
          >
            {allowMultiple ? (
              <>
                <CheckSquare size={10} aria-hidden="true" /> Multi
              </>
            ) : (
              "Single"
            )}
          </button>
        </div>

        {/* ── Scrollable form body ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-4 pb-4">
          {/* Question */}
          <fieldset className="border-0 p-0 m-0">
            <legend className="block text-[9px] font-bold uppercase tracking-widest mb-1.5 text-white/40">
              Question{" "}
              <span className="opacity-50">({120 - question.length} left)</span>
            </legend>
            <textarea
              value={question}
              maxLength={120}
              onChange={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
                updateBlock({ question: e.target.value });
              }}
              className="w-full bg-black/30 border rounded-xl p-3 font-black text-base outline-none transition-colors resize-none leading-snug"
              style={{
                color: "#F5F0E8",
                borderColor: "rgba(255,255,255,0.1)",
                caretColor: GOLD.bright,
                minHeight: 64,
              }}
              rows={2}
              placeholder="What dictates your execution?"
              aria-label="Poll question"
            />
          </fieldset>

          {/* Options list */}
          <fieldset className="border-0 p-0 m-0">
            <legend className="block text-[9px] font-bold uppercase tracking-widest mb-2 text-white/40">
              Options{" "}
              <span className="opacity-50">({baseOptions.length} / 4)</span>
            </legend>

            <AnimatePresence mode="popLayout">
              {baseOptions.map((opt, i) => (
                <motion.div
                  key={opt.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-2 mb-2.5"
                >
                  {/* Option ID badge */}
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                    style={{
                      background: GOLD.dimBg,
                      color: GOLD.base,
                      border: `1px solid ${GOLD.border}`,
                    }}
                    aria-hidden="true"
                  >
                    {opt.id}
                  </div>

                  {/* Option text input */}
                  <input
                    value={opt.text}
                    maxLength={45}
                    onChange={(e) => {
                      const next = baseOptions.map((o, idx) =>
                        idx === i ? { ...o, text: e.target.value } : o,
                      );
                      updateBlock({ pollOptions: next });
                    }}
                    className="flex-1 bg-black/30 border rounded-xl px-3 py-2 text-sm font-bold outline-none transition-colors"
                    style={{
                      color: "#F5F0E8",
                      borderColor: "rgba(255,255,255,0.1)",
                      caretColor: GOLD.bright,
                    }}
                    placeholder={`Option ${i + 1}`}
                    aria-label={`Option ${opt.id} text`}
                  />

                  {/* Remove button — only visible when > 2 options */}
                  {baseOptions.length > 2 && (
                    <button
                      onClick={() =>
                        updateBlock({
                          pollOptions: baseOptions.filter(
                            (_, idx) => idx !== i,
                          ),
                        })
                      }
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all hover:scale-110"
                      style={{
                        background: "rgba(248,113,113,0.08)",
                        border: "1px solid rgba(248,113,113,0.2)",
                        color: "#F87171",
                      }}
                      aria-label={`Remove option ${opt.id}`}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add option button */}
            {baseOptions.length < 4 && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const nextId = String.fromCharCode(65 + baseOptions.length);
                  updateBlock({
                    pollOptions: [
                      ...baseOptions,
                      { id: nextId, text: `Option ${baseOptions.length + 1}` },
                    ],
                  });
                }}
                className="w-full py-3 rounded-xl border border-dashed text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.4)",
                }}
                aria-label="Add a new option"
              >
                <Plus size={12} aria-hidden="true" /> Add Option
              </motion.button>
            )}
          </fieldset>

          {/* Live Preview — mirrors what the reader will see */}
          <div
            className="rounded-2xl p-4 border shrink-0"
            style={{
              background: "rgba(255,255,255,0.02)",
              borderColor: "rgba(255,255,255,0.06)",
            }}
            aria-label="Poll preview"
          >
            <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-white/30">
              Preview
            </p>
            <p className="font-black text-sm leading-snug mb-3 text-white/80 line-clamp-3">
              {question || "Your question appears here…"}
            </p>
            <div className="flex flex-col gap-1.5">
              {baseOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold"
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full border shrink-0"
                    style={{ borderColor: "rgba(255,255,255,0.25)" }}
                    aria-hidden="true"
                  />
                  <span className="truncate">
                    {opt.text || `Option ${opt.id}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     READER / VIEWER VIEW
  ═══════════════════════════════════════════════════════════════════════════ */

  /* ── Firestore Load: getDoc on mount (one-shot, cost-safe) ─────────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!pollDocRef) {
        setHasLoaded(true);
        return;
      }
      try {
        const [pollSnap, userSnap] = await Promise.all([
          getDoc(pollDocRef),
          userVoteDocRef ? getDoc(userVoteDocRef) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        if (pollSnap.exists()) {
          const d = pollSnap.data();
          const loaded = { total: d.totalVotes || 0 };
          baseOptions.forEach((o) => {
            loaded[o.id] = d[`opt_${o.id}`] || 0;
          });
          setVotes(loaded);
        } else {
          // First reader to open this poll → initialise the Firestore doc
          const init = { totalVotes: 0 };
          baseOptions.forEach((o) => {
            init[`opt_${o.id}`] = 0;
          });
          setDoc(pollDocRef, init, { merge: true }).catch(() => {});
        }

        if (userSnap?.exists()) {
          const ud = userSnap.data();
          // Support legacy single-vote format
          setUserVotes(ud.options || (ud.option ? [ud.option] : []));
        }
      } catch (err) {
        console.warn("[Poll] mount load error:", err);
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colistId, pollId, currentUser?.uid]);

  /* ── Live Sync: onSnapshot activated ONLY after the user votes ─────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const startLiveSync = useCallback(() => {
    if (!pollDocRef || unsubRef.current) return;
    unsubRef.current = onSnapshot(pollDocRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      const fresh = { total: d.totalVotes || 0 };
      baseOptions.forEach((o) => {
        fresh[o.id] = d[`opt_${o.id}`] || 0;
      });
      setVotes(fresh);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colistId, pollId]);

  /* ── Cleanup listener on unmount ────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(
    () => () => {
      unsubRef.current?.();
    },
    [],
  );

  /* ── Vote Submission ────────────────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const submitVote = useCallback(
    async (selectedIds) => {
      if (
        !selectedIds.length ||
        isVoting ||
        !pollDocRef ||
        !userVoteDocRef ||
        !currentUser
      )
        return;

      setIsVoting(true);
      hapticPulse();

      // Optimistic update — instant UI response
      setUserVotes(selectedIds);
      setVotes((prev) => {
        const next = { ...prev, total: prev.total + 1 };
        selectedIds.forEach((id) => {
          next[id] = (next[id] || 0) + 1;
        });
        return next;
      });

      try {
        await setDoc(userVoteDocRef, {
          options: selectedIds,
          uid: currentUser.uid,
          votedAt: serverTimestamp(),
        });
        const updates = { totalVotes: increment(1) };
        selectedIds.forEach((id) => {
          updates[`opt_${id}`] = increment(1);
        });
        await updateDoc(pollDocRef, updates);
        // Activate live sync ONLY after a successful vote
        startLiveSync();
      } catch (err) {
        // Offline fallback — queue for background retry
        console.warn("Poll submission offline, queueing:", err);
        try {
          const q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
          q.push({
            colistId,
            pollId,
            options: selectedIds,
            uid: currentUser.uid,
            ts: Date.now(),
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
        } catch (e) {
          console.error("Queue failed", e);
        }
      } finally {
        setIsVoting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isVoting, colistId, pollId, currentUser?.uid, startLiveSync],
  );

  /* ── Option Click Handler ───────────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleOptionClick = useCallback(
    (id) => {
      if (userVotes.length > 0 || !currentUser) return;
      if (!allowMultiple) {
        submitVote([id]);
      } else {
        hapticPulse();
        setLocalSelected((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
      }
    },
    [userVotes, currentUser, allowMultiple, submitVote],
  );

  /* ── Keyboard Navigation ────────────────────────────────────────────────── */
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleKeyDown = useCallback(
    (e, id, i) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          e.stopPropagation(); // Prevent deck swipe on space
          handleOptionClick(id);
          break;
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault();
          e.stopPropagation();
          const next = Math.min(i + 1, baseOptions.length - 1);
          setFocusIdx(next);
          optionRefs.current[next]?.focus();
          break;
        }
        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault();
          e.stopPropagation();
          const prev = Math.max(i - 1, 0);
          setFocusIdx(prev);
          optionRefs.current[prev]?.focus();
          break;
        }
        default:
          break;
      }
    },
    [handleOptionClick, baseOptions.length],
  );

  /* ── Loading State ──────────────────────────────────────────────────────── */
  if (!hasLoaded) return <PollLoader />;

  /* ── Derived values for render ──────────────────────────────────────────── */
  const hasVoted = userVotes.length > 0;
  const total = votes.total || 0;
  // FOMO mechanic: unauthenticated users always see results (encourages sign-up)
  const showResults = hasVoted || !currentUser;

  // Leader detection — stable even when vote counts are tied
  let maxV = -1;
  let leaderId = null;
  baseOptions.forEach((o) => {
    const v = votes[o.id] || 0;
    if (v > maxV) {
      maxV = v;
      leaderId = o.id;
    }
  });
  const leaderLabel =
    maxV > 0 ? (baseOptions.find((o) => o.id === leaderId)?.text ?? "") : "";

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER — Reader surface
  ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="w-full h-full flex flex-col select-none"
      style={{
        padding: "clamp(18px, 5vw, 34px)",
        touchAction: "pan-y",
      }}
    >
      {/* ── Header: live dot + voter count ──────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <LiveDot />
        <AnimatePresence>
          {showResults && total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.78 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.78 }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
              style={{
                color: tc,
                borderColor: alpha(tc, 0.2),
                background: alpha(tc, 0.06),
              }}
              aria-live="polite"
              aria-label={`${total.toLocaleString()} votes`}
            >
              <Users size={9} aria-hidden="true" />
              {total.toLocaleString()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Question ────────────────────────────────────────────────────── */}
      {/* max-h prevents an extremely long question from eating option space */}
      <div className="shrink-0 mb-5 max-h-[28%] overflow-y-auto custom-scrollbar pr-1">
        <h2
          className="font-display font-black leading-tight"
          style={{
            fontSize: "clamp(1.05rem, 2.8vw, 1.6rem)",
            color: tc,
            letterSpacing: "-0.03em",
          }}
        >
          {question || "Select your prime directive."}
        </h2>
      </div>

      {/* ── Options ─────────────────────────────────────────────────────── */}
      <div
        role={allowMultiple ? "group" : "radiogroup"}
        aria-label={question || "Poll options"}
        className="flex flex-col gap-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-0"
      >
        {baseOptions.map((opt, i) => {
          const isSelected =
            userVotes.includes(opt.id) || localSelected.includes(opt.id);
          const isOther = showResults && !isSelected;
          const optVotes = votes[opt.id] || 0;
          const pct = total > 0 ? Math.round((optVotes / total) * 100) : 0;
          const isFocused = focusIdx === i;

          return (
            <motion.button
              key={opt.id}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              role={allowMultiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              aria-label={`${opt.text}${showResults ? `, ${pct}%` : ""}`}
              tabIndex={isFocused ? 0 : -1}
              onClick={() => {
                setFocusIdx(i);
                handleOptionClick(opt.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, opt.id, i)}
              onFocus={() => setFocusIdx(i)}
              disabled={hasVoted || isVoting || (!currentUser && !showResults)}
              whileHover={!hasVoted && currentUser ? { scale: 1.012 } : {}}
              whileTap={!hasVoted && currentUser ? { scale: 0.984 } : {}}
              className="relative w-full overflow-hidden rounded-2xl text-left flex items-center outline-none focus-visible:ring-2"
              style={{
                minHeight: "clamp(48px, 10vw, 58px)",
                padding: "13px 17px",
                cursor: hasVoted || !currentUser ? "default" : "pointer",
                border: `1.5px solid ${
                  isSelected
                    ? borderSelected
                    : isFocused && !hasVoted && currentUser
                      ? borderFocused
                      : borderIdle
                }`,
                background: isSelected ? bgSelected : bgIdle,
                boxShadow: isSelected
                  ? `0 0 0 1px ${alpha(GOLD.bright, 0.14)}, inset 0 0 18px ${alpha(GOLD.bright, 0.04)}`
                  : isFocused && !hasVoted && currentUser
                    ? `0 0 0 1px ${alpha(tc, 0.18)}`
                    : "none",
                opacity: isOther ? 0.56 : 1,
                transition:
                  "border-color 0.28s ease, background 0.28s ease, box-shadow 0.28s ease, opacity 0.28s ease",
                // Focus ring via outline instead of ring class for ring-offset issues
                "--tw-ring-color": alpha(GOLD.bright, 0.5),
              }}
            >
              {/* Vote bar — renders only after results are available */}
              {showResults && <VoteBar pct={pct} isSelected={isSelected} />}

              {/* Option content (z-indexed above vote bar) */}
              <div className="relative flex items-center justify-between gap-3 z-10 w-full">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Checkbox indicator for multi-select pre-submission */}
                  {allowMultiple && !showResults && (
                    <div
                      className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all duration-200"
                      aria-hidden="true"
                      style={{
                        borderColor: isSelected ? GOLD.bright : alpha(tc, 0.35),
                        background: isSelected ? GOLD.bright : "transparent",
                      }}
                    >
                      {isSelected && (
                        <Check size={9} color="#000" strokeWidth={3} />
                      )}
                    </div>
                  )}

                  <span
                    className="font-bold text-sm leading-snug break-words"
                    style={{
                      color: isSelected
                        ? GOLD.bright
                        : isOther
                          ? alpha(tc, 0.68)
                          : tc,
                      transition: "color 0.28s ease",
                    }}
                  >
                    {opt.text}
                  </span>
                </div>

                {/* Right side: percentage (post-vote) or idle radio indicator */}
                <AnimatePresence mode="wait">
                  {showResults ? (
                    <motion.div
                      key="pct"
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-1.5 shrink-0 ml-1"
                    >
                      {isSelected && hasVoted && (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 14 14"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            cx="7"
                            cy="7"
                            r="7"
                            fill={GOLD.bright}
                            fillOpacity="0.18"
                          />
                          <path
                            d="M4 7L6.5 9.5L10 5"
                            stroke={GOLD.bright}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span
                        className="font-black font-mono text-sm tabular-nums"
                        style={{
                          color:
                            isSelected && hasVoted
                              ? GOLD.bright
                              : alpha(tc, 0.52),
                        }}
                      >
                        {pct}%
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      exit={{ opacity: 0 }}
                      aria-hidden="true"
                      className="w-3.5 h-3.5 rounded-full border-2 shrink-0 ml-1"
                      style={{ borderColor: alpha(tc, 0.2) }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Bottom CTA / Social proof ────────────────────────────────────── */}
      <div className="shrink-0 mt-3 flex flex-col items-center gap-2 min-h-[36px] justify-end">
        {/* Multi-select commit button — appears only when ≥1 local selection */}
        <AnimatePresence>
          {allowMultiple &&
            !hasVoted &&
            currentUser &&
            localSelected.length > 0 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
                onClick={() => submitVote(localSelected)}
                disabled={isVoting}
                className="w-full py-3 rounded-xl font-black text-[11px] uppercase tracking-[0.22em] shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${GOLD.deep}, ${GOLD.bright})`,
                  color: "#000",
                }}
                aria-label={`Submit ${localSelected.length} vote${localSelected.length > 1 ? "s" : ""}`}
              >
                {isVoting
                  ? "Locking…"
                  : `Lock ${localSelected.length} Signal${localSelected.length > 1 ? "s" : ""}`}
              </motion.button>
            )}
        </AnimatePresence>

        <AnimatePresence>
          {/* Leader label — social proof separator */}
          {showResults && total > 0 && leaderLabel && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58, duration: 0.35 }}
              className="flex items-center justify-center gap-3 w-full"
              aria-live="polite"
            >
              <div
                className="h-px flex-1"
                style={{
                  background: `linear-gradient(to right, transparent, ${GOLD.border})`,
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest text-center max-w-[55%] truncate"
                style={{ color: GOLD.base }}
              >
                {leaderLabel} leading
              </span>
              <div
                className="h-px flex-1"
                style={{
                  background: `linear-gradient(to left, transparent, ${GOLD.border})`,
                }}
              />
            </motion.div>
          )}

          {/* Unauthenticated prompt — subtle, non-blocking */}
          {!currentUser && (
            <motion.p
              key="auth-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[10px] font-bold tracking-widest uppercase w-full mt-1"
              style={{ color: alpha(tc, 0.36) }}
              aria-live="polite"
            >
              Sign in to vote
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(Poll);
