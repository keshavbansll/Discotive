/**
 * @fileoverview scoreEngine.js v2.0 — Config-driven, no daily login points.
 * All point values are loaded from Firestore system/scoring_config.
 * Falls back to hardcoded defaults if config unavailable.
 */

import {
  doc,
  getDoc,
  collection,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// ── Default scoring config (overridden by system/scoring_config) ─────────────
export const SCORE_DEFAULTS = {
  // ── Course completion (vault-verified) ───────────────────────────────────
  courseVerifiedStrong: 25,
  courseVerifiedMedium: 20,
  courseVerifiedWeak: 15,

  // ── Vault assets (non-course) ─────────────────────────────────────────────
  vaultVerifiedStrong: 25,
  vaultVerifiedMedium: 20,
  vaultVerifiedWeak: 15,

  // ── GitHub repo synced (vault-verified) ──────────────────────────────────
  githubRepoExceptional: 100,
  githubRepoStrong: 50,
  githubRepoMedium: 30,
  githubRepoWeak: 15,

  // ── App connections ───────────────────────────────────────────────────────
  appConnected: 2,
  appDisconnected: -2,

  // ── Network ───────────────────────────────────────────────────────────────
  allianceRequestAcceptedSender: 1, // person who sent request
  allianceRequestAcceptedReceiver: 2, // person who accepted request

  // ── Feed resonance ────────────────────────────────────────────────────────
  postReactionsPer100: 2, // +2 per 100 reactions on a post

  // ── Learn suggestion accepted ─────────────────────────────────────────────
  learnSuggestionAccepted: 1,

  // ── Agenda weekly consistency ─────────────────────────────────────────────
  agendaWeeklyStreak: 1,

  // ── Onboarding ────────────────────────────────────────────────────────────
  onboardingBonus: 50,
  profileCompletionBonus: 50,
};

// ── Cached config ─────────────────────────────────────────────────────────────
let _configCache = null;
let _configFetchedAt = 0;
const CONFIG_TTL = 5 * 60 * 1000; // 5 min

const getConfig = async () => {
  const now = Date.now();
  if (_configCache && now - _configFetchedAt < CONFIG_TTL) return _configCache;
  try {
    const snap = await getDoc(doc(db, "system", "scoring_config"));
    _configCache = snap.exists()
      ? { ...SCORE_DEFAULTS, ...snap.data() }
      : SCORE_DEFAULTS;
    _configFetchedAt = now;
  } catch {
    _configCache = SCORE_DEFAULTS;
  }
  return _configCache;
};

// ── IST date helper ───────────────────────────────────────────────────────────
const getISTDateStrings = () => {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  const now = new Date();
  const todayStr = formatter.format(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatter.format(yesterday);
  return { todayStr, monthStr: todayStr.substring(0, 7), yesterdayStr };
};

/**
 * Core score mutation — uses atomic Firestore transaction.
 */
export const mutateScore = async (
  userId,
  amount,
  reason = "Task Update",
  silent = false,
) => {
  if (!userId || amount === 0) return;
  const userRef = doc(db, "users", userId);
  const logRef = doc(collection(userRef, "score_log"));

  try {
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User document does not exist!");

      const userData = userDoc.data();
      const currentScore = userData.discotiveScore?.current || 0;
      const newScore = Math.max(0, currentScore + amount);
      const actualChange = newScore - currentScore;
      if (actualChange === 0 && amount < 0) return;

      const { todayStr, monthStr } = getISTDateStrings();
      const now = new Date();
      const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      transaction.update(userRef, {
        "discotiveScore.current": newScore,
        "discotiveScore.lastAmount": actualChange,
        "discotiveScore.lastReason": reason,
        "discotiveScore.lastUpdatedAt": now.toISOString(),
        [`daily_scores.${todayStr}`]: newScore,
        [`monthly_scores.${monthStr}`]: newScore,
      });

      if (!silent) {
        transaction.set(logRef, {
          score: newScore,
          change: actualChange,
          rawAttempt: amount,
          reason,
          date: now.toISOString(),
          timestamp: serverTimestamp(),
          expireAt,
        });
      }
    });
  } catch (error) {
    console.error("Score transaction failed:", error);
    throw error;
  }
};

/**
 * NOTE: processDailyConsistency is intentionally REMOVED.
 * No daily login points per product decision.
 * Call awardOnboardingComplete on first completion instead.
 */

// ── Config-driven wrappers ────────────────────────────────────────────────────

export const awardTaskCompletion = async (userId, isCompleted) => {
  const config = await getConfig();
  const pts = isCompleted ? config.taskCompleted : config.taskReverted;
  return mutateScore(
    userId,
    pts,
    isCompleted ? "Task Executed" : "Task Reverted Penalty",
  );
};

export const awardNodeCompletion = async (userId, nodeType) => {
  const config = await getConfig();
  const pts =
    nodeType === "core" ? config.nodeCoreCompleted : config.nodeBranchCompleted;
  const reason =
    nodeType === "core" ? "Secured Core Milestone" : "Secured Sub-Routine";
  if (pts) mutateScore(userId, pts, reason);
};

export const awardVaultVerification = async (
  userId,
  strength,
  assetType = "vault",
) => {
  const config = await getConfig();
  let keyPrefix = "vaultVerified";
  if (assetType === "course") keyPrefix = "courseVerified";
  if (assetType === "github") keyPrefix = "githubRepo";

  let key;
  if (assetType === "github") {
    key =
      strength === "Exceptional"
        ? "githubRepoExceptional"
        : strength === "Strong"
          ? "githubRepoStrong"
          : strength === "Medium"
            ? "githubRepoMedium"
            : "githubRepoWeak";
  } else {
    key =
      strength === "Strong"
        ? `${keyPrefix}Strong`
        : strength === "Medium"
          ? `${keyPrefix}Medium`
          : `${keyPrefix}Weak`;
  }

  const pts = config[key] ?? SCORE_DEFAULTS[key] ?? 0;
  if (pts === 0) return;
  return mutateScore(
    userId,
    pts,
    `Asset Verified (${assetType} · ${strength})`,
    true,
  );
};

export const awardAppConnection = async (userId, appName, connected = true) => {
  const config = await getConfig();
  const pts = connected
    ? (config.appConnected ?? SCORE_DEFAULTS.appConnected)
    : (config.appDisconnected ?? SCORE_DEFAULTS.appDisconnected);
  return mutateScore(
    userId,
    pts,
    connected ? `App Connected: ${appName}` : `App Disconnected: ${appName}`,
  );
};

export const awardPostResonance = async (userId, postId, reactionCount) => {
  const config = await getConfig();
  const ptsPerHundred =
    config.postReactionsPer100 ?? SCORE_DEFAULTS.postReactionsPer100;
  const prev = Math.floor((reactionCount - 1) / 100);
  const curr = Math.floor(reactionCount / 100);
  if (curr <= prev) return;
  const pts = (curr - prev) * ptsPerHundred;
  return mutateScore(
    userId,
    pts,
    `Post resonance milestone: ${reactionCount} reactions`,
  );
};

export const awardLearnSuggestionAccepted = async (userId) => {
  const config = await getConfig();
  const pts =
    config.learnSuggestionAccepted ?? SCORE_DEFAULTS.learnSuggestionAccepted;
  return mutateScore(userId, pts, "Learn suggestion accepted by admin");
};

export const awardAgendaWeeklyStreak = async (userId) => {
  const config = await getConfig();
  const pts = config.agendaWeeklyStreak ?? SCORE_DEFAULTS.agendaWeeklyStreak;
  return mutateScore(userId, pts, "7-day Agenda consistency streak");
};

export const awardAllianceAction = async (
  userId,
  actionType,
  userTier = "ESSENTIAL",
) => {
  if (!userId) return;
  const config = await getConfig();
  const dailyMax = userTier === "PRO" ? 20 : 10;

  if (actionType === "sent") {
    const { todayStr } = getISTDateStrings();
    const userRef = doc(db, "users", userId);
    const isAuthorized = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      const dailyLimit = data.dailyAllianceSent || { count: 0, date: "" };
      if (dailyLimit.date === todayStr && dailyLimit.count >= dailyMax)
        return false;
      const newCount = dailyLimit.date === todayStr ? dailyLimit.count + 1 : 1;
      tx.update(userRef, {
        dailyAllianceSent: { count: newCount, date: todayStr },
      });
      return true;
    });
    if (!isAuthorized) return;
    // No points for sending — only for acceptance
  } else if (actionType === "accepted_receiver") {
    const pts =
      config.allianceRequestAcceptedReceiver ??
      SCORE_DEFAULTS.allianceRequestAcceptedReceiver;
    await mutateScore(userId, pts, "Alliance request accepted — you accepted");
  } else if (actionType === "accepted_sender") {
    const pts =
      config.allianceRequestAcceptedSender ??
      SCORE_DEFAULTS.allianceRequestAcceptedSender;
    await mutateScore(userId, pts, "Alliance request accepted — they accepted");
  }
};

export const awardOnboardingComplete = async (userId) => {
  if (!userId) return;
  const config = await getConfig();
  try {
    const userRef = doc(db, "users", userId);
    const isFirst = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists() || snap.data()?.onboardingScoreAwarded) return false;
      tx.update(userRef, { onboardingScoreAwarded: true });
      return true;
    });
    if (isFirst)
      await mutateScore(
        userId,
        config.onboardingBonus,
        "Onboarding Complete - OS Initialized",
      );
  } catch (err) {
    console.error("[ScoreEngine] Onboarding award failed:", err);
  }
};

export const awardAppVerification = async (userId, appName) => {
  const config = await getConfig();
  return mutateScore(
    userId,
    config.appVerified,
    `App Verified: ${appName}`,
    true,
  );
};

export const awardGithubRepoVerification = async (userId, repoName) => {
  const config = await getConfig();
  return mutateScore(
    userId,
    config.githubRepoVerified,
    `GitHub Repo Verified: ${repoName}`,
    true,
  );
};

// ── Badge definitions ─────────────────────────────────────────────────────────
export const BADGE_DEFINITIONS = [
  {
    id: "first_login",
    label: "First Login",
    icon: "🚀",
    condition: (u) => !!u.createdAt,
  },
  {
    id: "streak_7",
    label: "7-Day Streak",
    icon: "🔥",
    condition: (u) => (u.discotiveScore?.streak || 0) >= 7,
  },
  {
    id: "streak_30",
    label: "30-Day Streak",
    icon: "⚡",
    condition: (u) => (u.discotiveScore?.streak || 0) >= 30,
  },
  {
    id: "streak_100",
    label: "Century Consistency",
    icon: "💎",
    condition: (u) => (u.discotiveScore?.streak || 0) >= 100,
  },
  {
    id: "vault_5",
    label: "5 Assets Synced",
    icon: "🗄️",
    condition: (u) => (u.vault_count || 0) >= 5,
  },
  {
    id: "vault_20",
    label: "20 Assets Synced",
    icon: "🏦",
    condition: (u) => (u.vault_count || 0) >= 20,
  },
  {
    id: "vault_50",
    label: "Vault Master",
    icon: "🔐",
    condition: (u) => (u.vault_count || 0) >= 50,
  },
  {
    id: "first_alliance",
    label: "First Alliance",
    icon: "🤝",
    condition: (u) => (u.allies?.length || 0) >= 1,
  },
  {
    id: "alliances_25",
    label: "Network Builder",
    icon: "🌐",
    condition: (u) => (u.allies?.length || 0) >= 25,
  },
  {
    id: "first_target",
    label: "First Target",
    icon: "🎯",
    condition: (u) => (u.competitors_count || 0) >= 1,
  },
  {
    id: "profile_100_views",
    label: "100 Profile Views",
    icon: "👁️",
    condition: (u) => (u.profileViews || 0) >= 100,
  },
  {
    id: "profile_1k_views",
    label: "1K Profile Views",
    icon: "🌟",
    condition: (u) => (u.profileViews || 0) >= 1000,
  },
  {
    id: "global_rank_1",
    label: "Top of the World",
    icon: "🏆",
    condition: (u) => u.precomputed?.globalRank === 1,
  },
  {
    id: "top_1_percent",
    label: "Top 1%",
    icon: "👑",
    condition: (u) => (u.precomputed?.globalPercentile || 100) <= 1,
  },
  {
    id: "top_10_percent",
    label: "Elite Operator",
    icon: "⭐",
    condition: (u) => (u.precomputed?.globalPercentile || 100) <= 10,
  },
  {
    id: "profile_complete",
    label: "Operator Certified",
    icon: "✅",
    condition: (u) => (u.profileCompleteness || 0) >= 100,
  },
  {
    id: "pro_member",
    label: "Pro Member",
    icon: "💫",
    condition: (u) => u.tier === "PRO",
  },
  {
    id: "score_500",
    label: "Rising Operator",
    icon: "📈",
    condition: (u) => (u.discotiveScore?.current || 0) >= 500,
  },
  {
    id: "score_1000",
    label: "Level 1 Operator",
    icon: "🎖️",
    condition: (u) => (u.discotiveScore?.current || 0) >= 1000,
  },
  {
    id: "score_5000",
    label: "Elite Tier",
    icon: "🦅",
    condition: (u) => (u.discotiveScore?.current || 0) >= 5000,
  },
  {
    id: "colists_creator",
    label: "Colist Creator",
    icon: "📰",
    condition: (u) => (u.colists_count || 0) >= 1,
  },
  {
    id: "learn_5",
    label: "Knowledge Seeker",
    icon: "📚",
    condition: (u) => (u.learn_completed_count || 0) >= 5,
  },
];

/**
 * Evaluates which badges a user has earned and writes new ones atomically.
 * Idempotent — never re-awards an already-granted badge.
 */
export const evaluateAndAwardBadges = async (userId, userData) => {
  if (!userId || !userData) return [];
  const existingBadgeIds = new Set((userData.badges || []).map((b) => b.id));
  const newBadges = BADGE_DEFINITIONS.filter(
    (def) => !existingBadgeIds.has(def.id) && def.condition(userData),
  ).map((def) => ({
    id: def.id,
    label: def.label,
    icon: def.icon,
    awardedAt: new Date().toISOString(),
  }));

  if (newBadges.length === 0) return [];

  try {
    const userRef = doc(db, "users", userId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;
      const existing = snap.data().badges || [];
      const existingIds = new Set(existing.map((b) => b.id));
      const toAdd = newBadges.filter((b) => !existingIds.has(b.id));
      if (toAdd.length === 0) return;
      tx.update(userRef, { badges: [...existing, ...toAdd] });
    });
    return newBadges;
  } catch (err) {
    console.error("[ScoreEngine] Badge award failed:", err);
    return [];
  }
};

export const initGhostUserScore = async (userId, displayName, email) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const { todayStr } = getISTDateStrings();
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (snap.exists()) return;
      tx.set(
        userRef,
        {
          "discotiveScore.current": 0,
          "discotiveScore.streak": 0,
          "discotiveScore.lastAmount": 0,
          "discotiveScore.lastReason": "Ghost Account — Onboarding Pending",
          "discotiveScore.lastUpdatedAt": new Date().toISOString(),
          onboardingComplete: false,
          isGhostUser: true,
          login_history: arrayUnion(todayStr),
        },
        { merge: true },
      );
    });
  } catch (err) {
    console.warn("[ScoreEngine] Ghost init failed:", err);
  }
};
