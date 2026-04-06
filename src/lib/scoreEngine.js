import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * MAANG-Grade Time Enforcement
 * Centralized single source of truth for IST calendar dates.
 */
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

  // Safe 24-hour subtraction (India does not observe DST)
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatter.format(yesterday);

  return { todayStr, monthStr: todayStr.substring(0, 7), yesterdayStr };
};

/**
 * @function mutateScore
 * @param {string} userId
 * @param {number} amount — Points to add (negative = penalty)
 * @param {string} reason — Human-readable mutation label
 * @param {boolean} [silent=false] — If true, skips score_history append
 * @description
 * Atomic score mutation. Uses Firestore `increment` to prevent race
 * conditions on concurrent writes. Also appends to score_history so
 * the Dashboard sparkline reflects intra-day activity, not just
 * daily login snapshots. Reads current score for the history entry
 * via the post-increment value approximation (increment + last known).
 */
export const mutateScore = async (
  userId,
  amount,
  reason = "Task Update",
  silent = false, // FIX: Added missing parameter
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

      // FIX: Synchronized to IST
      const { todayStr, monthStr } = getISTDateStrings();
      const now = new Date();
      const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      transaction.update(userRef, {
        "discotiveScore.current": newScore,
        "discotiveScore.lastAmount": actualChange, // FIX: Synced meta
        "discotiveScore.lastReason": reason, // FIX: Synced meta
        "discotiveScore.lastUpdatedAt": now.toISOString(), // FIX: Synced meta
        [`daily_scores.${todayStr}`]: newScore,
        [`monthly_scores.${monthStr}`]: newScore,
      });

      // FIX: Implemented silent contract
      if (!silent) {
        transaction.set(logRef, {
          score: newScore,
          change: actualChange,
          rawAttempt: amount,
          reason: reason,
          date: now.toISOString(), // Standardized UTC is fine for absolute chronological sorting
          timestamp: serverTimestamp(),
          expireAt: expireAt,
        });
      }
    });

    console.log("Score transaction committed.");
  } catch (error) {
    console.error("Score transaction failed: ", error);
    throw error;
  }
};

export const processDailyConsistency = async (userId) => {
  if (!userId) return;
  const userRef = doc(db, "users", userId);

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) return; // Abort if ghost doc isn't initialized
      const data = snap.data();

      // FIX: Use centralized IST strings for BOTH today and yesterday
      const { todayStr, monthStr, yesterdayStr } = getISTDateStrings();
      const lastLogin = data.discotiveScore?.lastLoginDate;

      if (lastLogin === todayStr) return;

      let pointChange = 0;
      let reason = "";
      let newStreak = data.discotiveScore?.streak || 0;

      if (!lastLogin) {
        pointChange = 70;
        reason = "OS Initialization";
        newStreak = 1;
      } else {
        pointChange = 10;
        reason = "Daily Execution";
        if (lastLogin === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      // Safe against race conditions because it's inside the transaction lock
      const currentScore = data.discotiveScore?.current || 0;
      const targetScore = Math.max(0, currentScore + pointChange);
      const actualChange = targetScore - currentScore;

      const existingDailyScores = data.daily_scores || {};
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      };
      const formatter = new Intl.DateTimeFormat("en-CA", options);
      const thirtyDaysAgoStr = formatter.format(thirtyDaysAgo);

      const updatedDailyScores = {
        ...existingDailyScores,
        [todayStr]: targetScore,
      };

      Object.keys(updatedDailyScores).forEach((dateStr) => {
        if (dateStr < thirtyDaysAgoStr) delete updatedDailyScores[dateStr];
      });

      const payload = {
        "discotiveScore.current": targetScore, // FIX: Use absolute targetScore, avoid increment() mixup
        "discotiveScore.lastLoginDate": todayStr,
        "discotiveScore.streak": newStreak,
        "discotiveScore.lastAmount": actualChange,
        "discotiveScore.lastReason": reason,
        "discotiveScore.lastUpdatedAt": new Date().toISOString(),
        consistency_log: arrayUnion(todayStr),
        login_history: arrayUnion(todayStr),
        daily_scores: updatedDailyScores,
        [`monthly_scores.${monthStr}`]: targetScore,
      };

      if (lastLogin && lastLogin !== todayStr) {
        payload["discotiveScore.last24h"] = currentScore;
      }

      transaction.update(userRef, payload);
    });
  } catch (error) {
    console.error("Consistency Engine Failed:", error);
  }
};

// Granular Roadmap Events
export const awardTaskCompletion = (userId, isCompleted) =>
  mutateScore(
    userId,
    isCompleted ? 5 : -15,
    isCompleted ? "Task Executed" : "Task Reverted Penalty",
  );
export const awardNodeCompletion = (userId, nodeType) => {
  let pts = 0;
  let reason = "";
  if (nodeType === "core") {
    pts = 30;
    reason = "Secured Core Milestone";
  } else if (nodeType === "branch") {
    pts = 15;
    reason = "Secured Sub-Routine";
  } else if (nodeType === "video") {
    pts = 25;
    reason = "Media Analyzed & Verified";
  } else if (nodeType === "asset") {
    pts = 20;
    reason = "Vault Proof Verified";
  }
  mutateScore(userId, pts, reason);
};

/**
 * @function awardVaultVerification
 * @description Fires when an admin marks an asset as Verified.
 * Point value scales with strength rating.
 * @param {string} strength — "Weak" | "Medium" | "Strong"
 */
export const awardVaultVerification = (userId, strength) => {
  const pts = strength === "Strong" ? 30 : strength === "Medium" ? 20 : 10;
  return mutateScore(
    userId,
    pts,
    `Vault Asset Verified (${strength})`,
    true, // silent — no sparkline entry, it's an admin action
  );
};

// --- NETWORK & ALLIANCE EVENTS ---
export const awardAllianceAction = async (userId, actionType) => {
  if (!userId) return;

  let points = 0;
  let reason = "";

  if (actionType === "sent") {
    const { todayStr } = getISTDateStrings();
    const userRef = doc(db, "users", userId);

    try {
      // Security Gate: Verify and lock the rate limit via Transaction
      const isAuthorized = await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) return false;

        const data = snap.data();
        const dailyLimit = data.dailyAllianceSent || { count: 0, date: "" };

        if (dailyLimit.date === todayStr && dailyLimit.count >= 5) {
          return false; // Farm attempt blocked
        }

        const newCount =
          dailyLimit.date === todayStr ? dailyLimit.count + 1 : 1;
        tx.update(userRef, {
          dailyAllianceSent: { count: newCount, date: todayStr },
        });
        return true;
      });

      if (!isAuthorized) {
        console.warn(
          `[ScoreEngine] Anti-farm rate limit enforced for user: ${userId}`,
        );
        return; // Terminate execution immediately
      }

      points = 5;
      reason = "Alliance Request Sent";
    } catch (error) {
      console.error("[ScoreEngine] Rate limit transaction failed:", error);
      return; // Fail closed: Do not award points if the validation DB call fails
    }
  } else if (actionType === "accepted") {
    points = 15;
    reason = "Alliance Forged";
  } else {
    points = -5;
    reason = "Alliance Action Reversed";
  }

  // Await the mutation. Fire-and-forget causes race conditions in rapid UI interactions.
  await mutateScore(userId, points, reason);
};

/**
 * @function awardOnboardingComplete
 * @description One-time bonus for completing the full 8-step onboarding.
 * Guards against double-award via a `onboardingScoreAwarded` flag on the user doc.
 */
export const awardOnboardingComplete = async (userId) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists() || snap.data()?.onboardingScoreAwarded) return;

    await updateDoc(userRef, { onboardingScoreAwarded: true });
    await mutateScore(userId, 50, "Onboarding Complete — OS Initialized");
  } catch (err) {
    console.error("[ScoreEngine] Onboarding award failed:", err);
  }
};

/**
 * @function initGhostUserScore
 * @description Called when a Google/OAuth user lands on the platform without
 * completing onboarding. Sets a minimal score scaffold so the user document
 * exists and percentile queries don't crash.
 */
export const initGhostUserScore = async (userId, displayName, email) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);

    // CRITICAL: Prevent overriding an existing user's ledger
    const snap = await getDoc(userRef);
    if (snap.exists()) return;

    const { todayStr } = getISTDateStrings();

    await setDoc(
      userRef,
      {
        "discotiveScore.current": 0,
        "discotiveScore.streak": 0,
        "discotiveScore.lastLoginDate": todayStr,
        "discotiveScore.lastAmount": 0,
        "discotiveScore.lastReason": "Ghost Account — Onboarding Pending",
        "discotiveScore.lastUpdatedAt": new Date().toISOString(),
        onboardingComplete: false,
        isGhostUser: true,
        login_history: arrayUnion(todayStr),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[ScoreEngine] Ghost init failed:", err);
  }
};
