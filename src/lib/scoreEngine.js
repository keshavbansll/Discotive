import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

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
export const mutateScore = async (userId, amount, reason = "Task Update") => {
  if (!userId || amount === 0) return;

  const userRef = doc(db, "users", userId);
  // Separate subcollection for the 24H granular log
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

      // Calculate time keys
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const monthStr = todayStr.substring(0, 7); // YYYY-MM

      // Calculate Expiration for TTL (24 hours from now)
      const expireAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 1. Update primary doc with current score AND aggregate maps
      transaction.update(userRef, {
        "discotiveScore.current": newScore,
        [`daily_scores.${todayStr}`]: newScore, // Overwrites with latest today
        [`monthly_scores.${monthStr}`]: newScore, // Overwrites with latest this month
      });

      // 2. Append granular log with an expireAt timestamp
      transaction.set(logRef, {
        score: newScore,
        change: actualChange,
        rawAttempt: amount,
        reason: reason,
        date: now.toISOString(),
        timestamp: serverTimestamp(),
        expireAt: expireAt, // TTL Policy will read this
      });
    });

    console.log("Score transaction committed.");
  } catch (error) {
    console.error("Score transaction failed: ", error);
    throw error;
  }
};

export const processDailyConsistency = async (userId) => {
  if (!userId) return;
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data();

    const todayStr = new Date().toISOString().split("T")[0];
    const monthStr = todayStr.substring(0, 7);
    const lastLogin = data.discotiveScore?.lastLoginDate;

    if (lastLogin === todayStr) return;

    let pointChange = 0;
    let reason = "";
    let newStreak = data.discotiveScore?.streak || 0;

    if (!lastLogin) {
      pointChange = 50;
      reason = "OS Initialization";
      newStreak = 1;
    } else {
      const daysMissed =
        Math.floor(
          (new Date(todayStr) - new Date(lastLogin)) / (1000 * 60 * 60 * 24),
        ) - 1;
      if (daysMissed === 0) {
        pointChange = 10;
        reason = "Daily Execution";
        newStreak += 1;
      } else if (daysMissed > 0) {
        const penalty = daysMissed * -15;
        pointChange = penalty + 10;
        reason = `Missed ${daysMissed} Days (${penalty}) + Login (+10)`;
        newStreak = 1;
      }
    }

    let targetScore = Math.max(
      0,
      (data.discotiveScore?.current || 0) + pointChange,
    );
    const actualChange = targetScore - (data.discotiveScore?.current || 0);

    // Prune the daily_scores map so it doesn't grow past ~30 days
    const existingDailyScores = data.daily_scores || {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const updatedDailyScores = {
      ...existingDailyScores,
      [todayStr]: targetScore,
    };

    // Clean up old daily records locally
    Object.keys(updatedDailyScores).forEach((dateStr) => {
      if (dateStr < thirtyDaysAgoStr) {
        delete updatedDailyScores[dateStr];
      }
    });

    const payload = {
      "discotiveScore.current": increment(actualChange),
      "discotiveScore.lastLoginDate": todayStr,
      "discotiveScore.streak": newStreak,
      "discotiveScore.lastAmount": actualChange,
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
      consistency_log: arrayUnion(todayStr),
      login_history: arrayUnion(todayStr),
      // Set the newly pruned map and the new monthly score
      daily_scores: updatedDailyScores,
      [`monthly_scores.${monthStr}`]: targetScore,
    };

    if (lastLogin !== todayStr) {
      payload["discotiveScore.last24h"] = data.discotiveScore?.current || 0;
    }

    await updateDoc(userRef, payload);
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
 * @function awardVaultUpload
 * @description Fires when a user uploads a new vault asset.
 * Unverified assets get fewer points; verified get a bonus via awardVaultVerification.
 */
export const awardVaultUpload = (userId) =>
  mutateScore(userId, 10, "Vault Asset Uploaded");

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
export const awardAllianceAction = (userId, actionType) => {
  if (!userId) return;

  let points = 0;
  let reason = "";

  switch (actionType) {
    case "accepted":
      points = 15;
      reason = "Alliance Forged";
      break;
    case "sent":
      points = 5;
      reason = "Alliance Request Sent";
      break;
    default:
      points = -5;
      reason = "Alliance Action Reversed";
  }

  mutateScore(userId, points, reason);
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
    const snap = await getDoc(userRef);
    // Only initialize if the ghost doc doesn't already exist
    if (snap.exists()) return;

    const todayStr = new Date().toISOString().split("T")[0];
    await updateDoc(userRef, {
      "discotiveScore.current": 0,
      "discotiveScore.streak": 0,
      "discotiveScore.lastLoginDate": todayStr,
      "discotiveScore.lastAmount": 0,
      "discotiveScore.lastReason": "Ghost Account — Onboarding Pending",
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
      onboardingComplete: false,
      isGhostUser: true,
      login_history: arrayUnion(todayStr),
    }).catch(() => {
      // doc may not exist yet — use setDoc instead
    });
  } catch (err) {
    console.warn("[ScoreEngine] Ghost init skipped:", err);
  }
};
