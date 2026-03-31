/**
 * @fileoverview Discotive Learn — Database & Verification Engine
 * @description
 * Central utility for:
 *  - Managing Discotive Learn certificates & videos database
 *  - Generating unique, immutable Discotive Learn IDs
 *  - Verifying task completion against the learn database
 *  - Calculating proportional video watch scores
 *
 * ID Format:
 *   discotive_certificate_XXXXXX  (6-digit suffix, auto-generated, immutable)
 *   discotive_video_XXXXXX        (6-digit suffix, auto-generated, immutable)
 *
 * Firebase quota protection:
 *   ALL reads use getDocs (one-shot) — ZERO onSnapshot listeners.
 *   Paginated with limit() to stay within free tier.
 *   Gemini helpers fetch max 15 items each.
 */

import {
  collection,
  getDocs,
  query,
  where,
  limit,
  orderBy,
  startAfter,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ── Collection Names ───────────────────────────────────────────────────────

export const LEARN_COLLECTIONS = Object.freeze({
  certificates: "discotive_certificates",
  videos: "discotive_videos",
});

export const LEARN_ID_PREFIXES = Object.freeze({
  certificate: "discotive_certificate_",
  video: "discotive_video_",
});

// ── Taxonomy ───────────────────────────────────────────────────────────────

export const VIDEO_CATEGORIES = [
  { key: "educational", label: "Educational", color: "#10b981" },
  { key: "tutorial", label: "Tutorial", color: "#3b82f6" },
  { key: "podcast", label: "Podcast", color: "#8b5cf6" },
  { key: "interview", label: "Career Interview", color: "#f59e0b" },
  { key: "lecture", label: "Lecture", color: "#06b6d4" },
  { key: "documentary", label: "Documentary", color: "#f43f5e" },
  { key: "entertainment", label: "Entertainment", color: "#ec4899" },
  { key: "other", label: "Other", color: "#6b7280" },
];

export const CERTIFICATE_CATEGORIES = [
  "Web Development",
  "Data Science & AI",
  "Cloud Computing",
  "Cybersecurity",
  "Product Management",
  "UI/UX Design",
  "Digital Marketing",
  "Finance & Accounting",
  "Filmmaking & Media",
  "Business Strategy",
  "Engineering",
  "Healthcare",
  "Legal & Compliance",
  "Music & Arts",
  "Other",
];

export const DIFFICULTY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

export const DOMAINS = [
  "Engineering & Tech",
  "Design & Creative",
  "Business & Strategy",
  "Marketing & Growth",
  "Product Management",
  "Data & Analytics",
  "Filmmaking & Media",
  "Finance",
  "Healthcare",
  "Legal",
  "Science",
  "Other",
];

// ── ID Generation ──────────────────────────────────────────────────────────

/**
 * Generate a unique, immutable Discotive Learn ID.
 * Collision-checks against the DB before returning.
 * @param {'certificate' | 'video'} type
 * @returns {Promise<string>}
 */
export const generateLearnId = async (type) => {
  const prefix = LEARN_ID_PREFIXES[type];
  if (!prefix) throw new Error(`Unknown learn type: ${type}`);

  const col =
    type === "certificate"
      ? LEARN_COLLECTIONS.certificates
      : LEARN_COLLECTIONS.videos;

  let id;
  let attempts = 0;

  while (attempts < 15) {
    const suffix = String(Math.floor(100000 + Math.random() * 900000));
    id = `${prefix}${suffix}`;

    const snap = await getDocs(
      query(collection(db, col), where("discotiveLearnId", "==", id), limit(1)),
    );

    if (snap.empty) return id;
    attempts++;
  }

  throw new Error(
    "Failed to generate unique Discotive Learn ID after 15 attempts.",
  );
};

// ── Certificate Queries ────────────────────────────────────────────────────

/**
 * Fetch certificates (paginated, one-shot, no snapshot).
 */
export const fetchCertificates = async ({
  domain = null,
  category = null,
  lastDocument = null,
  pageSize = 20,
} = {}) => {
  try {
    const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
    if (domain) constraints.push(where("domains", "array-contains", domain));
    if (category) constraints.push(where("category", "==", category));
    if (lastDocument) constraints.push(startAfter(lastDocument));

    const snap = await getDocs(
      query(collection(db, LEARN_COLLECTIONS.certificates), ...constraints),
    );

    return {
      items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      lastDocument: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  } catch (err) {
    console.error("[discotiveLearn] fetchCertificates:", err);
    return { items: [], lastDocument: null, hasMore: false };
  }
};

/**
 * Fetch certificates for Gemini prompt injection.
 * Lightweight: max 15 items, domain-filtered.
 */
export const fetchCertificatesForGemini = async (domain) => {
  try {
    const constraints = [limit(15), orderBy("scoreReward", "desc")];
    if (domain) constraints.push(where("domains", "array-contains", domain));

    const snap = await getDocs(
      query(collection(db, LEARN_COLLECTIONS.certificates), ...constraints),
    );

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        discotiveLearnId: data.discotiveLearnId,
        title: data.title,
        provider: data.provider,
        category: data.category,
        link: data.link,
        duration: data.duration || "—",
        difficulty: data.difficulty || "Intermediate",
        scoreReward: data.scoreReward || 50,
        tags: data.tags || [],
        domains: data.domains || [],
      };
    });
  } catch {
    return [];
  }
};

// ── Video Queries ──────────────────────────────────────────────────────────

/**
 * Fetch videos (paginated, one-shot, no snapshot).
 */
export const fetchVideos = async ({
  domain = null,
  category = null,
  lastDocument = null,
  pageSize = 20,
} = {}) => {
  try {
    const constraints = [orderBy("createdAt", "desc"), limit(pageSize)];
    if (domain) constraints.push(where("domains", "array-contains", domain));
    if (category) constraints.push(where("category", "==", category));
    if (lastDocument) constraints.push(startAfter(lastDocument));

    const snap = await getDocs(
      query(collection(db, LEARN_COLLECTIONS.videos), ...constraints),
    );

    return {
      items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      lastDocument: snap.docs[snap.docs.length - 1] || null,
      hasMore: snap.docs.length === pageSize,
    };
  } catch (err) {
    console.error("[discotiveLearn] fetchVideos:", err);
    return { items: [], lastDocument: null, hasMore: false };
  }
};

/**
 * Fetch videos for Gemini prompt injection.
 */
export const fetchVideosForGemini = async (domain) => {
  try {
    const constraints = [limit(10)];
    if (domain) constraints.push(where("domains", "array-contains", domain));

    const snap = await getDocs(
      query(collection(db, LEARN_COLLECTIONS.videos), ...constraints),
    );

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        discotiveLearnId: data.discotiveLearnId,
        title: data.title,
        youtubeId: data.youtubeId,
        thumbnailUrl: `https://img.youtube.com/vi/${data.youtubeId}/maxresdefault.jpg`,
        category: data.category,
        durationMinutes: data.durationMinutes || null,
        scoreReward: data.scoreReward || 25,
        domains: data.domains || [],
      };
    });
  } catch {
    return [];
  }
};

// ── Admin Write Operations ─────────────────────────────────────────────────

/**
 * Create a new certificate in the learn database.
 * Generates an immutable Discotive Learn ID automatically.
 */
export const createCertificate = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("certificate");

  await addDoc(collection(db, LEARN_COLLECTIONS.certificates), {
    discotiveLearnId,
    title: data.title,
    provider: data.provider,
    category: data.category,
    link: data.link,
    duration: data.duration || "",
    difficulty: data.difficulty || "Intermediate",
    tags: data.tags || [],
    domains: data.domains || [],
    scoreReward: Number(data.scoreReward) || 50,
    thumbnailUrl: data.thumbnailUrl || "",
    description: data.description || "",
    createdAt: serverTimestamp(),
    createdBy: adminEmail,
    updatedAt: serverTimestamp(),
  });

  return discotiveLearnId;
};

/**
 * Create a new video in the learn database.
 */
export const createVideo = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("video");
  const thumbnailUrl = `https://img.youtube.com/vi/${data.youtubeId}/maxresdefault.jpg`;

  await addDoc(collection(db, LEARN_COLLECTIONS.videos), {
    discotiveLearnId,
    title: data.title,
    youtubeId: data.youtubeId,
    thumbnailUrl,
    category: data.category,
    durationMinutes: Number(data.durationMinutes) || null,
    tags: data.tags || [],
    domains: data.domains || [],
    scoreReward: Number(data.scoreReward) || 25,
    description: data.description || "",
    createdAt: serverTimestamp(),
    createdBy: adminEmail,
    updatedAt: serverTimestamp(),
  });

  return discotiveLearnId;
};

/**
 * Update a certificate (cannot change discotiveLearnId).
 */
export const updateCertificate = async (docId, updates, adminEmail) => {
  const { discotiveLearnId, createdAt, createdBy, ...safeUpdates } = updates;
  await updateDoc(doc(db, LEARN_COLLECTIONS.certificates, docId), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
};

/**
 * Update a video (cannot change discotiveLearnId).
 */
export const updateVideo = async (docId, updates, adminEmail) => {
  const { discotiveLearnId, createdAt, createdBy, ...safeUpdates } = updates;
  // Auto-update thumbnail if youtubeId changed
  if (safeUpdates.youtubeId) {
    safeUpdates.thumbnailUrl = `https://img.youtube.com/vi/${safeUpdates.youtubeId}/maxresdefault.jpg`;
  }
  await updateDoc(doc(db, LEARN_COLLECTIONS.videos, docId), {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
};

// ── Verification Engine ────────────────────────────────────────────────────

/**
 * Verify if a user's vault contains a VERIFIED asset with a matching
 * Discotive Learn ID. Uses pre-loaded vault when available to avoid
 * extra Firestore reads.
 *
 * @param {string} userId
 * @param {string} discotiveLearnId
 * @param {object[]} [vaultCache] — Pre-loaded vault array
 * @returns {Promise<{verified: boolean, asset: object|null}>}
 */
export const verifyLearnCompletion = async (
  userId,
  discotiveLearnId,
  vaultCache = null,
) => {
  if (!userId || !discotiveLearnId) return { verified: false, asset: null };

  try {
    let vault = vaultCache;

    if (!vault) {
      const snap = await getDoc(doc(db, "users", userId));
      if (!snap.exists()) return { verified: false, asset: null };
      vault = snap.data().vault || [];
    }

    const matchingAsset = vault.find(
      (a) => a.discotiveLearnId === discotiveLearnId && a.status === "VERIFIED",
    );

    return { verified: !!matchingAsset, asset: matchingAsset || null };
  } catch {
    return { verified: false, asset: null };
  }
};

/**
 * Check vault for pending (unverified) asset with matching learn ID.
 * Used to show "uploaded but awaiting verification" state.
 */
export const checkPendingLearnAsset = (vault = [], discotiveLearnId) => {
  if (!discotiveLearnId) return null;
  return (
    vault.find(
      (a) => a.discotiveLearnId === discotiveLearnId && a.status === "PENDING",
    ) || null
  );
};

// ── Score Calculation ──────────────────────────────────────────────────────

/**
 * Calculate earned score based on video watch percentage.
 * Tier breakdown:
 *   ≥ 95% → full score
 *   ≥ 75% → 75% of score
 *   ≥ 50% → 50% of score
 *   ≥ 25% → 25% of score
 *   < 25% → 0 pts
 */
export const calculateVideoScore = (baseScore, watchedPct) => {
  const pct = Math.max(0, Math.min(100, watchedPct || 0));

  if (pct >= 95) {
    return {
      earned: baseScore,
      tier: "full",
      pct,
      message: `Video completed! Full +${baseScore} pts awarded.`,
    };
  }
  if (pct >= 75) {
    const earned = Math.floor(baseScore * 0.75);
    return {
      earned,
      tier: "high",
      pct,
      message: `${Math.floor(pct)}% watched — +${earned} pts (75% of max). Watch to completion for full score.`,
    };
  }
  if (pct >= 50) {
    const earned = Math.floor(baseScore * 0.5);
    return {
      earned,
      tier: "mid",
      pct,
      message: `${Math.floor(pct)}% watched — +${earned} pts (50% of max). Keep watching!`,
    };
  }
  if (pct >= 25) {
    const earned = Math.floor(baseScore * 0.25);
    return {
      earned,
      tier: "low",
      pct,
      message: `${Math.floor(pct)}% watched — only +${earned} pts (25% of max).`,
    };
  }
  return {
    earned: 0,
    tier: "none",
    pct,
    message: `Watch at least 25% to earn any score. Currently at ${Math.floor(pct)}%.`,
  };
};
