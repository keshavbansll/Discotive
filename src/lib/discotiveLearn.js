/**
 * @fileoverview Discotive Learn Engine — Constants, Schema, and Utilities v3.0
 * @description
 * Single source of truth for the unified Learn Engine.
 * Covers 4 content verticals: Courses · Videos · Podcasts · Resources
 *
 * Score Integrity Law: ONLY courses award Discotive Score.
 * Videos, Podcasts, Resources add to learn portfolio, not the ledger.
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Collections ──────────────────────────────────────────────────────────────
export const LEARN_COLLECTIONS = Object.freeze({
  courses: "discotive_courses",
  videos: "discotive_videos",
  podcasts: "discotive_podcasts",
  resources: "discotive_resources",
  algoCache: "learn_algo_cache",
});

// ─── Content Types ─────────────────────────────────────────────────────────────
export const CONTENT_TYPE = Object.freeze({
  COURSE: "course",
  VIDEO: "video",
  PODCAST: "podcast",
  RESOURCE: "resource",
});

// ─── Type Config (color, accent, collection mapping) ──────────────────────────
export const TYPE_CONFIG = {
  course: {
    label: "Course",
    plural: "Courses",
    collection: LEARN_COLLECTIONS.courses,
    color: "#BFA264",
    dimBg: "rgba(191,162,100,0.12)",
    border: "rgba(191,162,100,0.3)",
    scoreLabel: "Score Reward",
    awardsScore: true,
  },
  video: {
    label: "Video",
    plural: "Videos",
    collection: LEARN_COLLECTIONS.videos,
    color: "#EF4444",
    dimBg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    scoreLabel: null,
    awardsScore: false,
  },
  podcast: {
    label: "Podcast",
    plural: "Podcasts",
    collection: LEARN_COLLECTIONS.podcasts,
    color: "#8B5CF6",
    dimBg: "rgba(139,92,246,0.12)",
    border: "rgba(139,92,246,0.3)",
    scoreLabel: null,
    awardsScore: false,
  },
  resource: {
    label: "Resource",
    plural: "Resources",
    collection: LEARN_COLLECTIONS.resources,
    color: "#60A5FA",
    dimBg: "rgba(96,165,250,0.12)",
    border: "rgba(96,165,250,0.3)",
    scoreLabel: null,
    awardsScore: false,
  },
};

// ─── Platforms ────────────────────────────────────────────────────────────────
export const COURSE_PLATFORMS = [
  { id: "coursera", label: "Coursera", color: "#0056D2" },
  { id: "udemy", label: "Udemy", color: "#A435F0" },
  { id: "edx", label: "edX", color: "#02262B" },
  { id: "linkedin", label: "LinkedIn Learning", color: "#0A66C2" },
  { id: "skillshare", label: "Skillshare", color: "#00AC2E" },
  { id: "pluralsight", label: "Pluralsight", color: "#F15B2A" },
  { id: "alison", label: "Alison", color: "#8BC34A" },
  { id: "nptel", label: "NPTEL", color: "#FF6B35" },
  { id: "swayam", label: "SWAYAM", color: "#0099FF" },
  { id: "google", label: "Google Career", color: "#4285F4" },
  { id: "microsoft", label: "Microsoft Learn", color: "#00A4EF" },
  { id: "aws", label: "AWS Training", color: "#FF9900" },
  { id: "meta", label: "Meta Certificates", color: "#0081FB" },
  { id: "ibm", label: "IBM SkillsBuild", color: "#006699" },
  { id: "discotive", label: "Discotive", color: "#BFA264" },
  { id: "other", label: "Other", color: "#6B7280" },
];

export const VIDEO_PLATFORMS = [
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "vimeo", label: "Vimeo", color: "#1AB7EA" },
];

export const PODCAST_PLATFORMS = [
  { id: "spotify", label: "Spotify", color: "#1DB954" },
  { id: "youtube", label: "YouTube", color: "#FF0000" },
  { id: "applepodcasts", label: "Apple Podcasts", color: "#B150E2" },
  { id: "googlepodcasts", label: "Google Podcasts", color: "#4285F4" },
  { id: "other", label: "Other", color: "#6B7280" },
];

export const RESOURCE_TYPES = [
  { id: "documentation", label: "Documentation", icon: "📄" },
  { id: "guide", label: "Guide", icon: "🗺️" },
  { id: "cheatsheet", label: "Cheat Sheet", icon: "⚡" },
  { id: "repo", label: "Repository", icon: "🔧" },
  { id: "toolkit", label: "Toolkit", icon: "🛠️" },
  { id: "template", label: "Template", icon: "📐" },
  { id: "roadmap", label: "Roadmap", icon: "🚀" },
  { id: "reference", label: "Reference", icon: "📚" },
  { id: "other", label: "Other", icon: "📌" },
];

// ─── Taxonomy ──────────────────────────────────────────────────────────────────
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

export const COURSE_CATEGORIES = [
  "Web Development",
  "Data Science & AI",
  "Cloud Computing",
  "Cybersecurity",
  "Mobile Development",
  "DevOps & Infrastructure",
  "Product Management",
  "UI/UX Design",
  "Graphic Design",
  "Digital Marketing",
  "Content Creation",
  "Finance & Accounting",
  "Business Strategy",
  "Entrepreneurship",
  "Filmmaking & Media",
  "Engineering",
  "Healthcare",
  "Legal & Compliance",
  "Music & Arts",
  "Language Learning",
  "Personal Development",
  "Other",
];

export const VIDEO_CATEGORIES = [
  { key: "tutorial", label: "Tutorial", color: "#3B82F6" },
  { key: "lecture", label: "Lecture", color: "#06B6D4" },
  { key: "documentary", label: "Documentary", color: "#EF4444" },
  { key: "interview", label: "Interview", color: "#F59E0B" },
  { key: "walkthrough", label: "Walkthrough", color: "#10B981" },
  { key: "keynote", label: "Keynote / Talk", color: "#8B5CF6" },
  { key: "vlog", label: "Day in Life", color: "#EC4899" },
  { key: "playlist", label: "Playlist", color: "#BFA264" },
  { key: "other", label: "Other", color: "#6B7280" },
];

export const PODCAST_CATEGORIES = [
  "Tech & Programming",
  "Entrepreneurship",
  "Product & Design",
  "Marketing",
  "Finance & Investing",
  "Career & Productivity",
  "Science & Research",
  "Health & Wellness",
  "Creative & Arts",
  "News & Analysis",
  "Other",
];

export const DIFFICULTY_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

export const TARGET_AUDIENCES = [
  { id: "student", label: "Students" },
  { id: "professional", label: "Professionals" },
  { id: "any", label: "Everyone" },
];

export const INDUSTRY_RELEVANCE = [
  {
    id: "Strong",
    label: "Strong",
    color: "#4ADE80",
    desc: "Highly valued by employers",
  },
  {
    id: "Medium",
    label: "Medium",
    color: "#BFA264",
    desc: "Moderately valued",
  },
  {
    id: "Weak",
    label: "Weak",
    color: "rgba(245,240,232,0.28)",
    desc: "Low market signal",
  },
];

export const VERIFICATION_TIERS = {
  Original: {
    label: "Discotive Original",
    color: "#BFA264",
    bg: "rgba(191,162,100,0.12)",
    border: "rgba(191,162,100,0.3)",
  },
  Strong: {
    label: "Verified Strong",
    color: "#4ADE80",
    bg: "rgba(74,222,128,0.1)",
    border: "rgba(74,222,128,0.25)",
  },
  Medium: {
    label: "Verified Medium",
    color: "rgba(245,240,232,0.60)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.12)",
  },
  Weak: {
    label: "Listed",
    color: "rgba(245,240,232,0.28)",
    bg: "transparent",
    border: "rgba(255,255,255,0.06)",
  },
};

// ─── ID Generation ─────────────────────────────────────────────────────────────
export const LEARN_ID_PREFIXES = Object.freeze({
  course: "disc_course_",
  video: "disc_video_",
  podcast: "disc_podcast_",
  resource: "disc_resource_",
});

export const generateLearnId = async (type) => {
  const prefix = LEARN_ID_PREFIXES[type];
  if (!prefix) throw new Error(`Unknown learn type: ${type}`);
  const colName = LEARN_COLLECTIONS[type + "s"] || LEARN_COLLECTIONS.courses;

  let attempts = 0;
  while (attempts < 15) {
    const suffix = String(Math.floor(100000 + Math.random() * 900000));
    const id = `${prefix}${suffix}`;
    const snap = await getDocs(
      query(
        collection(db, colName),
        where("discotiveLearnId", "==", id),
        limit(1),
      ),
    );
    if (snap.empty) return id;
    attempts++;
  }
  throw new Error("Failed to generate unique Discotive Learn ID.");
};

// ─── Thumbnail helpers ─────────────────────────────────────────────────────────
export const getYouTubeThumbnail = (youtubeId, quality = "maxresdefault") =>
  `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;

export const getYouTubeFallbackThumbnail = (youtubeId) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

// ─── Score reward (courses only) ──────────────────────────────────────────────
export const calculateVideoWatchScore = (watchedPct) => {
  // Videos do NOT award Discotive Score — only portfolio credit
  return { earned: 0, tier: "none", pct: watchedPct };
};

// ─── Completion map from vault ─────────────────────────────────────────────────
export const buildCompletionMap = (vault = []) => {
  const map = {};
  for (const asset of vault) {
    if (!asset.discotiveLearnId) continue;
    if (asset.status === "VERIFIED") {
      map[asset.discotiveLearnId] = { verified: true, pending: false };
    } else if (
      asset.status === "PENDING" &&
      !map[asset.discotiveLearnId]?.verified
    ) {
      map[asset.discotiveLearnId] = { verified: false, pending: true };
    }
  }
  return map;
};

// ─── Admin CRUD Operations ─────────────────────────────────────────────────────
export const createCourse = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("course");
  await addDoc(collection(db, LEARN_COLLECTIONS.courses), {
    discotiveLearnId,
    type: "course",
    title: data.title || "",
    description: data.description || "",
    thumbnailUrl: data.thumbnailUrl || "",
    platform: data.platform || "other",
    platformUrl: data.platformUrl || "",
    link: data.link || "",
    provider: data.provider || "",
    category: data.category || "Other",
    domains: data.domains || [],
    tags: data.tags || [],
    difficulty: data.difficulty || "Intermediate",
    estimatedHours: Number(data.estimatedHours) || 0,
    isPaid: !!data.isPaid,
    price: data.isPaid ? Number(data.price) || 0 : 0,
    skillsGained: data.skillsGained || [],
    skillsRequired: data.skillsRequired || [],
    targetAudience: data.targetAudience || "any",
    eligibility: data.eligibility || "",
    industryRelevance: data.industryRelevance || "Medium",
    verificationTier: data.verificationTier || "Medium",
    scoreReward: Number(data.scoreReward) || 50,
    enrollmentCount: 0,
    rating: Number(data.rating) || 0,
    isFeatured: !!data.isFeatured,
    isNew: true,
    expiryDate: data.expiryDate || null,
    note: data.note || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminEmail,
  });
  return discotiveLearnId;
};

export const createVideo = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("video");
  const thumbnailUrl = data.isDiscotivePlaylist
    ? data.thumbnailUrl || ""
    : getYouTubeThumbnail(data.youtubeId);

  await addDoc(collection(db, LEARN_COLLECTIONS.videos), {
    discotiveLearnId,
    type: "video",
    title: data.title || "",
    description: data.description || "",
    thumbnailUrl,
    youtubeId: data.youtubeId || "",
    channelName: data.channelName || "",
    channelId: data.channelId || "",
    durationMinutes: Number(data.durationMinutes) || 0,
    domains: data.domains || [],
    tags: data.tags || [],
    difficulty: data.difficulty || "Beginner",
    category: data.category || "tutorial",
    targetAudience: data.targetAudience || "any",
    industryRelevance: data.industryRelevance || "Medium",
    isDiscotivePlaylist: !!data.isDiscotivePlaylist,
    playlistVideos: data.playlistVideos || [],
    isFeatured: !!data.isFeatured,
    viewCount: 0,
    scoreReward: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminEmail,
  });
  return discotiveLearnId;
};

export const createPodcast = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("podcast");
  await addDoc(collection(db, LEARN_COLLECTIONS.podcasts), {
    discotiveLearnId,
    type: "podcast",
    title: data.title || "",
    podcastName: data.podcastName || "",
    description: data.description || "",
    thumbnailUrl:
      data.thumbnailUrl ||
      (data.youtubeId ? getYouTubeThumbnail(data.youtubeId) : ""),
    youtubeId: data.youtubeId || "",
    platform: data.platform || "spotify",
    link: data.link || "",
    durationMinutes: Number(data.durationMinutes) || 0,
    hostName: data.hostName || "",
    guestNames: data.guestNames || [],
    domains: data.domains || [],
    tags: data.tags || [],
    category: data.category || "Tech & Programming",
    industryRelevance: data.industryRelevance || "Medium",
    isFeatured: !!data.isFeatured,
    episodeNumber: Number(data.episodeNumber) || 0,
    scoreReward: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminEmail,
  });
  return discotiveLearnId;
};

export const createResource = async (data, adminEmail) => {
  const discotiveLearnId = await generateLearnId("resource");
  await addDoc(collection(db, LEARN_COLLECTIONS.resources), {
    discotiveLearnId,
    type: "resource",
    title: data.title || "",
    description: data.description || "",
    thumbnailUrl: data.thumbnailUrl || "",
    category: data.category || "Other",
    resourceType: data.resourceType || "guide",
    domains: data.domains || [],
    tags: data.tags || [],
    difficulty: data.difficulty || "Beginner",
    skillsGained: data.skillsGained || [],
    industryRelevance: data.industryRelevance || "Medium",
    content: {
      links: data.content?.links || [],
      pdfs: data.content?.pdfs || [],
      repos: data.content?.repos || [],
      tools: data.content?.tools || [],
      text: data.content?.text || "",
    },
    isFeatured: !!data.isFeatured,
    viewCount: 0,
    scoreReward: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminEmail,
  });
  return discotiveLearnId;
};

export const updateLearnItem = async (colName, docId, updates, adminEmail) => {
  // eslint-disable-next-line no-unused-vars
  const { discotiveLearnId, createdAt, createdBy, id, ...safe } = updates;
  if (safe.youtubeId && colName === LEARN_COLLECTIONS.videos) {
    safe.thumbnailUrl = getYouTubeThumbnail(safe.youtubeId);
  }
  await updateDoc(doc(db, colName, docId), {
    ...safe,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
};

// ─── Read helpers ─────────────────────────────────────────────────────────────
export const fetchFeaturedItems = async (limitCount = 6) => {
  const results = [];
  const colNames = [
    LEARN_COLLECTIONS.courses,
    LEARN_COLLECTIONS.videos,
    LEARN_COLLECTIONS.podcasts,
    LEARN_COLLECTIONS.resources,
  ];
  await Promise.allSettled(
    colNames.map(async (col) => {
      try {
        const snap = await getDocs(
          query(
            collection(db, col),
            where("isFeatured", "==", true),
            orderBy("createdAt", "desc"),
            limit(3),
          ),
        );
        snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.error(`[fetchFeaturedItems] Failed for ${col}:`, err);
      }
    }),
  );

  // Sort globally by newest before slicing to ensure true cross-vertical freshness
  results.sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
  return results.slice(0, limitCount);
};
