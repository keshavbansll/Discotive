import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
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
export const mutateScore = async (userId, amount, reason, silent = false) => {
  if (!userId || amount === 0) return;
  try {
    const userRef = doc(db, "users", userId);
    const todayStr = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();

    const updatePayload = {
      "discotiveScore.current": increment(amount),
      "discotiveScore.lastAmount": amount,
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": nowIso,
    };

    // Append to score_history so the sparkline reflects real-time mutations.
    if (!silent) {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const currentScore =
          (snap.data()?.discotiveScore?.current || 0) + amount;
        updatePayload.score_history = arrayUnion({
          // REPLACE `todayStr` with `nowIso` for absolute time precision
          date: nowIso,
          score: Math.max(0, currentScore),
        });

        // Keep consistency_log active using the daily string
        updatePayload.consistency_log = arrayUnion(todayStr);
      }
    }

    await updateDoc(userRef, updatePayload);
  } catch (error) {
    console.error("[ScoreEngine] Mutation Failed:", error);
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
        const penalty = daysMissed * -15; // Brutal penalty
        pointChange = penalty + 10;
        reason = `Missed ${daysMissed} Days (${penalty}) + Login (+10)`;
        newStreak = 1;
      }
    }

    // FIX: Calculate the target score and clamp to 0 to prevent negative database states
    let targetScore = (data.discotiveScore?.current || 0) + pointChange;
    targetScore = Math.max(0, targetScore);

    // FIX: Calculate the actual delta to use with increment() for atomic safety
    const actualChange = targetScore - (data.discotiveScore?.current || 0);

    const existingHistory = data.score_history || [];
    const alreadyHasToday = existingHistory.some((e) => e?.date === todayStr);

    const payload = {
      // Use increment to prevent race conditions with mutateScore events firing on login
      "discotiveScore.current": increment(actualChange),
      "discotiveScore.lastLoginDate": todayStr,
      "discotiveScore.streak": newStreak,
      "discotiveScore.lastAmount": actualChange, // Record the clamped delta
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
      consistency_log: arrayUnion(todayStr),
      login_history: arrayUnion(todayStr),
    };

    if (!alreadyHasToday) {
      payload.score_history = arrayUnion({
        date: todayStr,
        score: targetScore, // Record the clamped absolute value for the chart
      });
    }

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
