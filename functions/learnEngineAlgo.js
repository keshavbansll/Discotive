/**
 * @fileoverview learnEngineAlgo.js — Career Calibration & Matching Algorithm v3.0
 * @description
 * High-performance, Node-native recommendation engine.
 * Calculates vector-inspired resonance scores between user profiles and learning assets.
 * Implements a strict 6-hour TTL cache via Firestore to minimize read operations.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Cache TTL: 6 hours
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// Collections
const COLLECTIONS = [
  "discotive_courses",
  "discotive_videos",
  "discotive_podcasts",
];

/**
 * Calculates a 0-99 similarity score based on overlapping taxonomy matrices.
 */
const calculateResonanceScore = (item, userProfile) => {
  let score = 0;
  const maxScore = 100;

  // 1. Domain Matching (Highest Weight: 35%)
  if (item.domains && Array.isArray(item.domains) && userProfile.domain) {
    if (item.domains.includes(userProfile.domain)) {
      score += 35;
    }
  }

  // 2. Skills Intersection (Weight: 30%)
  if (
    item.skillsGained &&
    Array.isArray(item.skillsGained) &&
    userProfile.skills
  ) {
    const matchedSkills = item.skillsGained.filter((skill) =>
      userProfile.skills.includes(skill),
    );
    if (matchedSkills.length > 0) {
      // Award up to 30 points based on ratio of matched skills
      const skillScore = Math.min(
        30,
        (matchedSkills.length / Math.max(1, userProfile.skills.length)) * 30,
      );
      score += skillScore;
    }
  }

  // 3. Niche / Tag Matching (Weight: 20%)
  if (item.tags && Array.isArray(item.tags) && userProfile.niche) {
    const normalizedNiche = userProfile.niche.toLowerCase();
    const hasNicheTag = item.tags.some(
      (tag) =>
        tag.toLowerCase().includes(normalizedNiche) ||
        normalizedNiche.includes(tag.toLowerCase()),
    );
    if (hasNicheTag) score += 20;
  }

  // 4. Industry Relevance Booster (Weight: 15%)
  if (item.industryRelevance === "Strong") score += 15;
  else if (item.industryRelevance === "Medium") score += 7;

  // 5. Difficulty Penalty/Bonus (Optional fine-tuning)
  // If user has low score, recommend beginner; if high score, recommend advanced.
  if (userProfile.currentScore < 100 && item.difficulty === "Advanced") {
    score -= 10;
  } else if (userProfile.currentScore > 500 && item.difficulty === "Beginner") {
    score -= 10;
  }

  // Normalize 0-99
  return Math.max(0, Math.min(99, Math.round(score)));
};

exports.computeLearnAlgorithm = onCall(
  { memory: "512MiB", timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Algorithm access requires authentication.",
      );
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
      // ── 1. Enforce PRO Tier & Cache Check ────────────────────────────────────
      const userRef = db.collection("users").doc(uid);
      const cacheRef = db.collection("learn_algo_cache").doc(uid);

      const [userDoc, cacheDoc] = await Promise.all([
        userRef.get(),
        cacheRef.get(),
      ]);

      if (!userDoc.exists)
        throw new HttpsError("not-found", "User ledger missing.");

      const userData = userDoc.data();
      const tier = userData.tier || "ESSENTIAL";

      if (
        tier !== "PRO" &&
        tier !== "ENTERPRISE" &&
        userData.role !== "admin"
      ) {
        throw new HttpsError(
          "permission-denied",
          "Algorithm Engine requires PRO tier.",
        );
      }

      // Return valid cache if within TTL
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        const ageMs = Date.now() - (cacheData.updatedAt?.toMillis() || 0);
        if (ageMs < CACHE_TTL_MS && cacheData.picks?.length > 0) {
          return { picks: cacheData.picks, source: "cache" };
        }
      }

      // ── 2. Construct Vector Profile ──────────────────────────────────────────
      const userProfile = {
        domain: userData.identity?.domain || "",
        niche: userData.identity?.niche || userData.vision?.passion || "",
        skills: userData.skills?.alignedSkills || [],
        currentScore: userData.discotiveScore?.current || 0,
      };

      // ── 3. Fetch Candidate Pool ──────────────────────────────────────────────
      // To prevent OOM errors, we don't fetch the whole DB. We fetch the top 100 recent/featured items per collection.
      const candidatePromises = COLLECTIONS.map((colName) =>
        db.collection(colName).orderBy("createdAt", "desc").limit(100).get(),
      );

      const querySnaps = await Promise.allSettled(candidatePromises);
      let candidates = [];

      querySnaps.forEach((snapResult) => {
        if (snapResult.status === "fulfilled" && !snapResult.value.empty) {
          snapResult.value.forEach((doc) => {
            candidates.push({ id: doc.id, ...doc.data() });
          });
        }
      });

      if (candidates.length === 0) {
        return { picks: [], source: "compute_empty" };
      }

      // ── 4. Vector Scoring & Sorting ──────────────────────────────────────────
      const scoredItems = candidates.map((item) => ({
        ...item,
        algoScore: calculateResonanceScore(item, userProfile),
      }));

      // Sort by score descending, filter out low-relevance noise (< 40%)
      const topPicks = scoredItems
        .filter((item) => item.algoScore >= 40)
        .sort((a, b) => b.algoScore - a.algoScore)
        .slice(0, 15); // Top 15 recommendations

      // ── 5. Save to Cache & Return ────────────────────────────────────────────
      await cacheRef.set({
        uid,
        picks: topPicks,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { picks: topPicks, source: "compute" };
    } catch (error) {
      console.error("[AlgoEngine Fault]", error);
      throw new HttpsError("internal", "Neural Engine compute failed.");
    }
  },
);
