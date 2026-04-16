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
  vaultVerifiedStrong: 30,
  vaultVerifiedMedium: 20,
  vaultVerifiedWeak: 10,
  allianceForged: 15,
  allianceRequestSent: 5,
  taskCompleted: 5,
  taskReverted: -15,
  nodeCoreCompleted: 30,
  nodeBranchCompleted: 15,
  videoWatchFull: 10,
  appVerified: 25,
  githubRepoVerified: 25,
  onboardingBonus: 50,
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

export const awardVaultVerification = async (userId, strength) => {
  const config = await getConfig();
  const key =
    strength === "Strong"
      ? "vaultVerifiedStrong"
      : strength === "Medium"
        ? "vaultVerifiedMedium"
        : "vaultVerifiedWeak";
  const pts = config[key] ?? SCORE_DEFAULTS[key];
  return mutateScore(userId, pts, `Vault Asset Verified (${strength})`, true);
};

export const awardAllianceAction = async (userId, actionType) => {
  if (!userId) return;
  const config = await getConfig();

  if (actionType === "sent") {
    const { todayStr } = getISTDateStrings();
    const userRef = doc(db, "users", userId);
    const isAuthorized = await runTransaction(db, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      const dailyLimit = data.dailyAllianceSent || { count: 0, date: "" };
      if (dailyLimit.date === todayStr && dailyLimit.count >= 5) return false;
      const newCount = dailyLimit.date === todayStr ? dailyLimit.count + 1 : 1;
      tx.update(userRef, {
        dailyAllianceSent: { count: newCount, date: todayStr },
      });
      return true;
    });
    if (!isAuthorized) return;
    await mutateScore(
      userId,
      config.allianceRequestSent,
      "Alliance Request Sent",
    );
  } else if (actionType === "accepted") {
    await mutateScore(userId, config.allianceForged, "Alliance Forged");
  } else {
    await mutateScore(userId, -5, "Alliance Action Reversed");
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
