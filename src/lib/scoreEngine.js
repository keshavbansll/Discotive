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
    // We read the current score first to get an accurate history value.
    if (!silent) {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const currentScore =
          (snap.data()?.discotiveScore?.current || 0) + amount;
        updatePayload.score_history = arrayUnion({
          date: todayStr,
          score: Math.max(0, currentScore),
        });
        // Also keep consistency_log active for this date
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
    const currentScore = (data.discotiveScore?.current || 0) + pointChange;
    /**
     * @description
     * Atomic payload written to Firestore on each daily login.
     * Multi-source activity arrays power the Dashboard heatmap:
     *  - score_history: { date, score } objects for the sparkline chart
     *  - consistency_log: ISO date strings for heatmap source 2
     *  - login_history: ISO date strings for heatmap source 3
     *
     * score_history is bounded to 365 entries client-side via a
     * pre-read slice to prevent unbounded array growth on the document.
     * arrayUnion naturally deduplicates on the Firebase side for the
     * string arrays; for the object array we check before writing.
     */
    const existingHistory = data.score_history || [];
    // Only add a new score_history entry if this date doesn't already exist
    const alreadyHasToday = existingHistory.some((e) => e?.date === todayStr);

    const payload = {
      "discotiveScore.current": currentScore,
      "discotiveScore.lastLoginDate": todayStr,
      "discotiveScore.streak": newStreak,
      "discotiveScore.lastAmount": pointChange,
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
      // Source 2: ISO date string array — used by Dashboard heatmap
      consistency_log: arrayUnion(todayStr),
      // Source 3: ISO date string array — used by Dashboard heatmap
      login_history: arrayUnion(todayStr),
    };

    // Only append score_history if this date is new (prevents duplicate sparkline points)
    if (!alreadyHasToday) {
      payload.score_history = arrayUnion({
        date: todayStr,
        score: currentScore,
      });
    }

    // Snapshot last24h only when transitioning to a new day
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
