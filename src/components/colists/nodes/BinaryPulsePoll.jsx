/**
 * @fileoverview BinaryPulsePoll — Live Sentiment Engine
 * @description
 * Psychological Hook: Social validation + FOMO.
 * Architecture (cost-safe): getDoc() on mount → onSnapshot() only AFTER user votes.
 * Offline: optimistic UI + localStorage queue.
 * Haptics: navigator.vibrate micro-pulse on vote commit.
 */

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
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

/* ─── Constants ────────────────────────────────────────────────────────── */
const G = {
  base: "#BFA264",
  bright: "#D4AF78",
  border: "rgba(191,162,100,0.25)",
};
const T = { primary: "#F5F0E8", dim: "rgba(245,240,232,0.28)" };
const V = { surface: "#0F0F0F", elevated: "#141414" };

const hapticPulse = () => {
  try {
    navigator.vibrate?.([15, 8, 20]);
  } catch {}
};

const OFFLINE_QUEUE_KEY = "discotive_pending_votes";

/* ─── Poll Vote Bar ────────────────────────────────────────────────────── */
const VoteBar = memo(({ pct, isSelected, tc }) => (
  <motion.div
    className="absolute inset-0 origin-left rounded-2xl"
    initial={{ scaleX: 0 }}
    animate={{ scaleX: pct / 100 }}
    transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
    style={{
      background: isSelected
        ? `linear-gradient(90deg, rgba(191,162,100,0.22) 0%, rgba(191,162,100,0.06) 100%)`
        : `rgba(255,255,255,0.025)`,
    }}
  />
));

/* ─── Live Pulse Indicator ─────────────────────────────────────────────── */
const LivePulse = () => (
  <div className="flex items-center gap-1.5">
    <div className="relative w-2 h-2">
      <div
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: G.bright, opacity: 0.4 }}
      />
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: G.bright, boxShadow: `0 0 6px ${G.bright}` }}
      />
    </div>
    <span
      className="text-[8px] font-black uppercase tracking-[0.3em]"
      style={{ color: G.base }}
    >
      Live Poll
    </span>
  </div>
);

/* ─── Main Component ───────────────────────────────────────────────────── */
const BinaryPulsePoll = ({ block, colistId, currentUser, textColor }) => {
  const { question, optionA, optionB, pollId } = block;
  const tc = textColor || T.primary;

  const [votes, setVotes] = useState({ a: 0, b: 0, total: 0 });
  const [userVote, setUserVote] = useState(null); // 'A' | 'B' | null
  const [isVoting, setIsVoting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const unsubRef = useRef(null);

  /* ── Firestore refs ── */
  const pollDocRef =
    colistId && pollId ? doc(db, "colists", colistId, "polls", pollId) : null;

  const userVoteDocRef =
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
      : null;

  /* ── Mount: single getDoc (quota-safe) ── */
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
          setVotes({
            a: d.optionA || 0,
            b: d.optionB || 0,
            total: d.totalVotes || 0,
          });
        } else {
          // Initialize empty poll document lazily
          setDoc(
            pollDocRef,
            { optionA: 0, optionB: 0, totalVotes: 0 },
            { merge: true },
          ).catch(() => {});
        }

        if (userSnap?.exists()) {
          setUserVote(userSnap.data().option);
        }
      } catch (err) {
        console.warn("[BinaryPulsePoll] load error:", err);
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

  /* ── Start live listener ONLY after user votes ── */
  const startLiveSync = useCallback(() => {
    if (!pollDocRef || unsubRef.current) return;
    setIsLive(true);
    unsubRef.current = onSnapshot(pollDocRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setVotes({
          a: d.optionA || 0,
          b: d.optionB || 0,
          total: d.totalVotes || 0,
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () => () => {
      unsubRef.current?.();
    },
    [],
  );

  /* ── Vote handler ── */
  const handleVote = useCallback(
    async (option) => {
      if (
        !currentUser ||
        userVote ||
        isVoting ||
        !pollDocRef ||
        !userVoteDocRef
      )
        return;

      setIsVoting(true);
      hapticPulse();

      // Optimistic update
      setUserVote(option);
      setVotes((prev) => ({
        a: prev.a + (option === "A" ? 1 : 0),
        b: prev.b + (option === "B" ? 1 : 0),
        total: prev.total + 1,
      }));

      try {
        // Anti-double-vote: create userVote record first
        await setDoc(userVoteDocRef, {
          option,
          uid: currentUser.uid,
          votedAt: serverTimestamp(),
        });
        // Atomic increment — never direct assignment
        await updateDoc(pollDocRef, {
          [`option${option}`]: increment(1),
          totalVotes: increment(1),
        });
        startLiveSync();
      } catch (err) {
        // Offline resilience: queue for sync
        try {
          const queue = JSON.parse(
            localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]",
          );
          queue.push({
            colistId,
            pollId,
            option,
            uid: currentUser.uid,
            ts: Date.now(),
          });
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        } catch {}
        // Keep optimistic UI — user experience preserved
      } finally {
        setIsVoting(false);
      }
    },
    [currentUser, userVote, isVoting, colistId, pollId, startLiveSync], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ── Derived ── */
  const total = votes.total;
  const pctA = total > 0 ? Math.round((votes.a / total) * 100) : 50;
  const pctB = 100 - pctA;
  const hasVoted = !!userVote;
  const leading = pctA >= pctB ? "A" : "B";

  /* ── Loading ── */
  if (!hasLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: `${G.bright} transparent transparent transparent`,
          }}
        />
      </div>
    );
  }

  const options = [
    { key: "A", label: optionA || "Execute Fast", pct: pctA },
    { key: "B", label: optionB || "Execute Precise", pct: pctB },
  ];

  return (
    <div
      className="h-full flex flex-col justify-center px-7 md:px-11 py-10 select-none"
      style={{ touchAction: "pan-y" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <LivePulse />
        {total > 0 && (
          <AnimatePresence>
            {hasVoted && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-mono text-[9px]"
                style={{ color: T.dim }}
              >
                {total.toLocaleString()} votes
              </motion.span>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Question */}
      <h2
        className="font-display font-black leading-tight mb-9"
        style={{
          fontSize: "clamp(1.25rem, 3.2vw, 1.9rem)",
          color: tc,
          letterSpacing: "-0.03em",
        }}
      >
        {question || "Which path do you execute on?"}
      </h2>

      {/* Options */}
      <div className="space-y-3.5">
        {options.map(({ key, label, pct }) => {
          const isSelected = userVote === key;
          const isOther = hasVoted && userVote !== key;

          return (
            <motion.button
              key={key}
              onClick={() => handleVote(key)}
              disabled={hasVoted || isVoting || !currentUser}
              whileHover={!hasVoted && currentUser ? { scale: 1.012 } : {}}
              whileTap={!hasVoted && currentUser ? { scale: 0.988 } : {}}
              className="relative w-full overflow-hidden rounded-2xl text-left"
              style={{
                padding: "17px 20px",
                cursor: hasVoted || !currentUser ? "default" : "pointer",
                border: isSelected
                  ? `1.5px solid ${G.bright}`
                  : isOther
                    ? "1.5px solid rgba(255,255,255,0.04)"
                    : "1.5px solid rgba(255,255,255,0.08)",
                background: isSelected
                  ? "rgba(191,162,100,0.06)"
                  : "rgba(255,255,255,0.025)",
                boxShadow: isSelected
                  ? `0 0 0 1px rgba(191,162,100,0.15), 0 4px 24px rgba(191,162,100,0.08), inset 0 0 20px rgba(191,162,100,0.04)`
                  : "none",
                transition:
                  "border-color 0.35s, background 0.35s, box-shadow 0.35s, opacity 0.35s",
                opacity: isOther ? 0.55 : 1,
                minHeight: 56,
              }}
            >
              {hasVoted && (
                <VoteBar pct={pct} isSelected={isSelected} tc={tc} />
              )}

              <div className="relative flex items-center justify-between gap-4 z-10">
                <span
                  className="font-bold text-sm leading-snug"
                  style={{
                    color: isSelected ? G.bright : isOther ? `${tc}60` : tc,
                    transition: "color 0.35s",
                  }}
                >
                  {label}
                </span>

                <AnimatePresence mode="wait">
                  {hasVoted ? (
                    <motion.div
                      key="pct"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 shrink-0"
                    >
                      {isSelected && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <circle
                            cx="7"
                            cy="7"
                            r="7"
                            fill={G.bright}
                            fillOpacity="0.2"
                          />
                          <path
                            d="M4 7L6.5 9.5L10 5"
                            stroke={G.bright}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <span
                        className="font-black font-mono text-sm"
                        style={{ color: isSelected ? G.bright : `${tc}45` }}
                      >
                        {pct}%
                      </span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      exit={{ opacity: 0 }}
                      className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: "rgba(255,255,255,0.14)" }}
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Post-vote insight */}
      <div className="mt-5 min-h-[24px]">
        <AnimatePresence>
          {hasVoted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex items-center justify-center gap-2"
            >
              <div
                className="h-px flex-1"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(191,162,100,0.3))`,
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{ color: G.base }}
              >
                {leading === "A" ? optionA : optionB} is leading
              </span>
              <div
                className="h-px flex-1"
                style={{
                  background: `linear-gradient(to left, transparent, rgba(191,162,100,0.3))`,
                }}
              />
            </motion.div>
          )}
          {!currentUser && !hasVoted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[10px]"
              style={{ color: `${tc}35` }}
            >
              Sign in to cast your signal
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default memo(BinaryPulsePoll);
