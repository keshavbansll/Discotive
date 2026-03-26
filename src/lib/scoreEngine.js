import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";

export const mutateScore = async (userId, amount, reason) => {
  if (!userId || amount === 0) return;
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      "discotiveScore.current": increment(amount),
      "discotiveScore.lastAmount": amount,
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
    });
  } catch (error) {
    console.error("Mutation Failed:", error);
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
    const payload = {
      "discotiveScore.current": currentScore,
      "discotiveScore.lastLoginDate": todayStr,
      "discotiveScore.streak": newStreak,
      "discotiveScore.lastAmount": pointChange,
      "discotiveScore.lastReason": reason,
      "discotiveScore.lastUpdatedAt": new Date().toISOString(),
      score_history: arrayUnion({ date: todayStr, score: currentScore }),
    };
    if (lastLogin !== todayStr)
      payload["discotiveScore.last24h"] = data.discotiveScore?.current || 0;
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
