/**
 * @fileoverview useNetwork — The Networking Data Engine
 * @description
 * Zero onSnapshot. Zero real-time listeners. Aggressive local caching.
 * Cursor-based pagination. Optimistic UI mutations for instant feedback.
 *
 * Firestore Schema:
 *   posts/{id}: { authorId, authorName, authorUsername, authorTier, textContent,
 *                 timestamp, likesCount, replyCount, likedBy:[] }
 *   connections/{id}: { requesterId, receiverId, status:'PENDING'|'ALLIANCE'|'DECLINED',
 *                       timestamp, requesterName, receiverName }
 *   competitors/{id}: { trackerId, targetId, timestamp }
 */

import { useState, useCallback, useRef, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
  documentId,
} from "firebase/firestore";
import { db } from "../firebase";
import { awardAllianceAction } from "../lib/scoreEngine";

const FEED_PAGE_SIZE = 12;
const NETWORK_PAGE_SIZE = 20;

// ─── Session-scoped caches (Memory Layer) ────────────────────────────────────
// Prevents quota bleed on tab switching.
const MEMORY_CACHE = {
  feed: null,
  lastDoc: null,
  network: null,
  timestamp: 0,
};
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// ─── Identity Hydration Engine (Cost-Optimized) ──────────────────────────
// Caches live avatars per session to prevent N+1 query exhaustion.
const PROFILE_CACHE = new Map(); // uid -> { avatarUrl }

const hydrateProfiles = async (uids) => {
  // 1. Filter out duplicates and already cached UIDs
  const uniqueUids = [...new Set(uids)].filter(
    (id) => id && !PROFILE_CACHE.has(id),
  );
  if (uniqueUids.length === 0) return;

  // 2. Firestore 'in' queries have a maximum of 30 items per batch
  const chunks = [];
  for (let i = 0; i < uniqueUids.length; i += 30) {
    chunks.push(uniqueUids.slice(i, i + 30));
  }

  // 3. Fetch all chunks in parallel
  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const q = query(
          collection(db, "users"),
          where(documentId(), "in", chunk),
        );
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          PROFILE_CACHE.set(docSnap.id, {
            avatarUrl: data.identity?.avatarUrl || null,
          });
        });
      } catch (err) {
        console.error("[Hydration Error]:", err);
      }
    }),
  );

  // 4. Mark missed profiles as null to prevent infinite refetching
  uniqueUids.forEach((id) => {
    if (!PROFILE_CACHE.has(id)) PROFILE_CACHE.set(id, null);
  });
};

// ─── Score mutation stub (real impl in scoreEngine.js) ──────────────────────
const updateDiscotiveScore = async (userId, points, reason) => {
  try {
    await awardAllianceAction(userId, points > 0 ? "accepted" : "reverted");
    console.log(`[NetworkScore] +${points} pts → ${reason}`);
  } catch (err) {
    console.error("[NetworkScore] Mutation failed:", err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useNetwork = (currentUser, userData) => {
  const uid = currentUser?.uid;

  // ── Feed state ───────────────────────────────────────────────────────────
  const [posts, setPosts] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const lastPostDocRef = useRef(null);

  // ── Network state ────────────────────────────────────────────────────────
  const [alliances, setAlliances] = useState([]);
  const [pendingInbound, setPendingInbound] = useState([]);
  const [pendingOutbound, setPendingOutbound] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);

  // ── Composer state ───────────────────────────────────────────────────────
  const [isPosting, setIsPosting] = useState(false);

  // ─── FEED OPERATIONS ─────────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (reset = false) => {
      if (!uid) return;
      setFeedLoading(true);
      setFeedError(null);

      try {
        let q;
        const now = Date.now();
        const isInitialLoad = reset || !lastPostDocRef.current;

        // Quota Protection: Serve from memory cache if valid
        if (
          isInitialLoad &&
          MEMORY_CACHE.feed &&
          now - MEMORY_CACHE.timestamp < CACHE_TTL
        ) {
          setPosts(MEMORY_CACHE.feed);
          lastPostDocRef.current = MEMORY_CACHE.lastDoc;
          setFeedLoading(false);
          // Background sync omitted for strict read minimization on free tier
          return;
        }

        if (isInitialLoad) {
          q = query(
            collection(db, "posts"),
            orderBy("timestamp", "desc"),
            limit(FEED_PAGE_SIZE),
          );
          lastPostDocRef.current = null;
        } else {
          q = query(
            collection(db, "posts"),
            orderBy("timestamp", "desc"),
            startAfter(lastPostDocRef.current),
            limit(FEED_PAGE_SIZE),
          );
        }

        const snap = await getDocs(q);

        if (snap.docs.length < FEED_PAGE_SIZE) {
          setHasMorePosts(false);
        } else {
          setHasMorePosts(true);
        }

        lastPostDocRef.current = snap.docs[snap.docs.length - 1] || null;

        const fetched = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          timestamp: d.data().timestamp?.toDate?.() || new Date(),
          likedBy: d.data().likedBy || [],
        }));

        // === HYDRATION INJECTION ===
        // Fetch live avatars for these specific 12 posts before rendering
        await hydrateProfiles(fetched.map((p) => p.authorId));

        const hydratedPosts = fetched.map((p) => {
          const liveProfile = PROFILE_CACHE.get(p.authorId);
          return {
            ...p,
            authorAvatar:
              liveProfile?.avatarUrl !== undefined
                ? liveProfile.avatarUrl
                : p.authorAvatar,
          };
        });

        setPosts((prev) => {
          const newPosts = reset ? hydratedPosts : [...prev, ...hydratedPosts];
          // Update Cache
          if (reset) {
            MEMORY_CACHE.feed = newPosts;
            MEMORY_CACHE.lastDoc = lastPostDocRef.current;
            MEMORY_CACHE.timestamp = Date.now();
          }
          return newPosts;
        });
      } catch (err) {
        console.error("[useNetwork] fetchFeed failed:", err);
        setFeedError("Transmission lost. Reconnecting to the network...");
      } finally {
        setFeedLoading(false);
      }
    },
    [uid],
  );

  const createPost = useCallback(
    async (textContent) => {
      if (!uid || !textContent.trim() || isPosting) return null;

      // Optimistic insert
      const optimisticPost = {
        id: `optimistic_${Date.now()}`,
        authorId: uid,
        authorName:
          `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim() ||
          "Operator",
        authorUsername: userData?.identity?.username || "unknown",
        authorTier: userData?.tier || "ESSENTIAL",
        authorDomain:
          userData?.identity?.domain || userData?.vision?.passion || "General",
        authorNiche: userData?.identity?.niche || "",
        textContent: textContent.trim(),
        timestamp: new Date(),
        likesCount: 0,
        replyCount: 0,
        likedBy: [],
        _optimistic: true,
      };

      setPosts((prev) => [optimisticPost, ...prev]);
      setIsPosting(true);

      try {
        const docRef = await addDoc(collection(db, "posts"), {
          authorId: uid,
          authorName: optimisticPost.authorName,
          authorUsername: optimisticPost.authorUsername,
          authorTier: optimisticPost.authorTier,
          authorDomain: optimisticPost.authorDomain,
          authorNiche: optimisticPost.authorNiche,
          textContent: textContent.trim(),
          timestamp: serverTimestamp(),
          likesCount: 0,
          replyCount: 0,
          likedBy: [],
        });

        // Replace optimistic with real
        setPosts((prev) =>
          prev.map((p) =>
            p.id === optimisticPost.id
              ? { ...optimisticPost, id: docRef.id, _optimistic: false }
              : p,
          ),
        );

        return docRef.id;
      } catch (err) {
        console.error("[useNetwork] createPost failed:", err);
        // Rollback optimistic insert
        setPosts((prev) => prev.filter((p) => p.id !== optimisticPost.id));
        return null;
      } finally {
        setIsPosting(false);
      }
    },
    [uid, userData, isPosting],
  );

  const toggleLike = useCallback(
    async (postId) => {
      if (!uid) return;

      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const isLiked = (post.likedBy || []).includes(uid);

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedBy: isLiked
                  ? p.likedBy.filter((id) => id !== uid)
                  : [...p.likedBy, uid],
                likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1,
              }
            : p,
        ),
      );

      try {
        await updateDoc(doc(db, "posts", postId), {
          likedBy: isLiked ? arrayRemove(uid) : arrayUnion(uid),
          likesCount: increment(isLiked ? -1 : 1),
        });
      } catch (err) {
        console.error("[useNetwork] toggleLike failed:", err);
        // Rollback
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likedBy: isLiked
                    ? [...p.likedBy, uid]
                    : p.likedBy.filter((id) => id !== uid),
                  likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1,
                }
              : p,
          ),
        );
      }
    },
    [uid, posts],
  );

  // ─── NETWORK OPERATIONS ───────────────────────────────────────────────────

  const fetchNetworkData = useCallback(async () => {
    if (!uid) return;
    setNetworkLoading(true);

    try {
      // Fetch connections where user is involved
      const [sentSnap, receivedSnap, competitorsSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, "connections"),
            where("requesterId", "==", uid),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "connections"),
            where("receiverId", "==", uid),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "competitors"),
            where("trackerId", "==", uid),
            limit(50),
          ),
        ),
      ]);

      const allConnections = [
        ...sentSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...receivedSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];

      // Deduplicate
      const seen = new Set();
      const unique = allConnections.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const allianceList = unique.filter((c) => c.status === "ALLIANCE");
      const inboundList = unique.filter(
        (c) => c.status === "PENDING" && c.receiverId === uid,
      );
      const outboundList = unique.filter(
        (c) => c.status === "PENDING" && c.requesterId === uid,
      );
      const compList = competitorsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // === HYDRATION INJECTION ===
      // Extract all UIDs currently visible in the network views
      const uidsToHydrate = [
        ...unique.map((c) => c.requesterId),
        ...unique.map((c) => c.receiverId),
        ...compList.map((c) => c.targetId),
      ];
      await hydrateProfiles(uidsToHydrate);

      // Hydration mapping helper
      const applyLiveAvatar = (c) => {
        const partnerId = c.requesterId === uid ? c.receiverId : c.requesterId;
        const liveProfile = PROFILE_CACHE.get(partnerId);
        if (!liveProfile) return c;
        return {
          ...c,
          requesterAvatar:
            c.requesterId === uid
              ? userData?.identity?.avatarUrl
              : liveProfile.avatarUrl,
          receiverAvatar:
            c.receiverId === uid
              ? userData?.identity?.avatarUrl
              : liveProfile.avatarUrl,
        };
      };

      setAlliances(allianceList.map(applyLiveAvatar));
      setPendingInbound(inboundList.map(applyLiveAvatar));
      setPendingOutbound(outboundList.map(applyLiveAvatar));

      setCompetitors(
        compList.map((c) => {
          const liveProfile = PROFILE_CACHE.get(c.targetId);
          return {
            ...c,
            targetAvatar:
              liveProfile?.avatarUrl !== undefined
                ? liveProfile.avatarUrl
                : c.targetAvatar,
          };
        }),
      );

      // Fetch suggested users (simple: recent onboarded users, excluding existing connections)
      const existingIds = new Set([
        uid,
        ...allianceList.map((c) =>
          c.requesterId === uid ? c.receiverId : c.requesterId,
        ),
      ]);

      const suggestedSnap = await getDocs(
        query(
          collection(db, "users"),
          where("onboardingComplete", "==", true),
          orderBy("discotiveScore.current", "desc"),
          limit(30),
        ),
      );

      const suggested = suggestedSnap.docs
        .filter((d) => !existingIds.has(d.id))
        .slice(0, 12)
        .map((d) => ({ id: d.id, ...d.data() }));

      setSuggestedUsers(suggested);
    } catch (err) {
      console.error("[useNetwork] fetchNetworkData failed:", err);
    } finally {
      setNetworkLoading(false);
    }
  }, [uid]);

  const sendAllianceRequest = useCallback(
    async (targetUser) => {
      if (!uid || !targetUser?.id) return;

      // Optimistic add to outbound
      const optimisticConn = {
        id: `opt_${Date.now()}`,
        requesterId: uid,
        receiverId: targetUser.id,
        requesterName:
          `${userData?.identity?.firstName || ""} ${userData?.identity?.lastName || ""}`.trim(),
        receiverName:
          `${targetUser.identity?.firstName || ""} ${targetUser.identity?.lastName || ""}`.trim() ||
          targetUser.identity?.username ||
          "Operator",
        status: "PENDING",
        timestamp: new Date(),
        _optimistic: true,
      };

      setPendingOutbound((prev) => [...prev, optimisticConn]);
      setSuggestedUsers((prev) => prev.filter((u) => u.id !== targetUser.id));

      try {
        const docRef = await addDoc(collection(db, "connections"), {
          requesterId: uid,
          receiverId: targetUser.id,
          requesterName: optimisticConn.requesterName,
          receiverName: optimisticConn.receiverName,
          requesterUsername: userData?.identity?.username || "",
          receiverUsername: targetUser.identity?.username || "",
          requesterDomain:
            userData?.identity?.domain ||
            userData?.vision?.passion ||
            "General",
          receiverDomain:
            targetUser.identity?.domain ||
            targetUser.vision?.passion ||
            "General",
          status: "PENDING",
          timestamp: serverTimestamp(),
        });

        setPendingOutbound((prev) =>
          prev.map((c) =>
            c.id === optimisticConn.id
              ? { ...optimisticConn, id: docRef.id, _optimistic: false }
              : c,
          ),
        );

        // Score for sending
        await awardAllianceAction(uid, "sent");
      } catch (err) {
        console.error("[useNetwork] sendAllianceRequest failed:", err);
        // Rollback
        setPendingOutbound((prev) =>
          prev.filter((c) => c.id !== optimisticConn.id),
        );
        setSuggestedUsers((prev) => [...prev, targetUser]);
      }
    },
    [uid, userData],
  );

  const acceptAllianceRequest = useCallback(
    async (connectionId, requesterId) => {
      if (!uid || !connectionId) return;

      const connection = pendingInbound.find((c) => c.id === connectionId);
      if (!connection) return;

      // Optimistic update
      setPendingInbound((prev) => prev.filter((c) => c.id !== connectionId));
      setAlliances((prev) => [...prev, { ...connection, status: "ALLIANCE" }]);

      try {
        await updateDoc(doc(db, "connections", connectionId), {
          status: "ALLIANCE",
          acceptedAt: serverTimestamp(),
        });

        // Award score to both parties
        await Promise.all([
          updateDiscotiveScore(uid, 15, "Alliance Formed"),
          updateDiscotiveScore(requesterId, 15, "Alliance Formed"),
        ]);

        // Add alliance to user's allies array (both sides)
        const [myRef, theirRef] = [
          doc(db, "users", uid),
          doc(db, "users", requesterId),
        ];
        await Promise.all([
          updateDoc(myRef, { allies: arrayUnion(requesterId) }),
          updateDoc(theirRef, { allies: arrayUnion(uid) }),
        ]);
      } catch (err) {
        console.error("[useNetwork] acceptAllianceRequest failed:", err);
        // Rollback
        setPendingInbound((prev) => [...prev, connection]);
        setAlliances((prev) => prev.filter((c) => c.id !== connectionId));
      }
    },
    [uid, pendingInbound],
  );

  const declineAllianceRequest = useCallback(
    async (connectionId) => {
      if (!uid || !connectionId) return;

      const connection = pendingInbound.find((c) => c.id === connectionId);
      if (!connection) return;

      // Optimistic remove
      setPendingInbound((prev) => prev.filter((c) => c.id !== connectionId));

      try {
        await updateDoc(doc(db, "connections", connectionId), {
          status: "DECLINED",
          declinedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("[useNetwork] declineAllianceRequest failed:", err);
        setPendingInbound((prev) => [...prev, connection]);
      }
    },
    [uid, pendingInbound],
  );

  const removeAlliance = useCallback(
    async (connectionId, partnerId) => {
      if (!uid || !connectionId) return;

      const connection = alliances.find((c) => c.id === connectionId);
      if (!connection) return;

      setAlliances((prev) => prev.filter((c) => c.id !== connectionId));

      try {
        await deleteDoc(doc(db, "connections", connectionId));

        // Remove from allies arrays
        const [myRef, theirRef] = [
          doc(db, "users", uid),
          doc(db, "users", partnerId),
        ];
        await Promise.all([
          updateDoc(myRef, { allies: arrayRemove(partnerId) }),
          updateDoc(theirRef, { allies: arrayRemove(uid) }),
        ]);
      } catch (err) {
        console.error("[useNetwork] removeAlliance failed:", err);
        setAlliances((prev) => [...prev, connection]);
      }
    },
    [uid, alliances],
  );

  const markAsCompetitor = useCallback(
    async (targetUser) => {
      if (!uid || !targetUser?.id) return;

      const isAlreadyTracking = competitors.some(
        (c) => c.targetId === targetUser.id,
      );

      if (isAlreadyTracking) {
        // Untrack
        const existing = competitors.find((c) => c.targetId === targetUser.id);
        setCompetitors((prev) =>
          prev.filter((c) => c.targetId !== targetUser.id),
        );
        try {
          await deleteDoc(doc(db, "competitors", existing.id));
        } catch (err) {
          setCompetitors((prev) => [...prev, existing]);
        }
        return;
      }

      const optimistic = {
        id: `opt_comp_${Date.now()}`,
        trackerId: uid,
        targetId: targetUser.id,
        targetName:
          `${targetUser.identity?.firstName || ""} ${targetUser.identity?.lastName || ""}`.trim() ||
          targetUser.identity?.username ||
          "Operator",
        targetScore: targetUser.discotiveScore?.current || 0,
        timestamp: new Date(),
        _optimistic: true,
      };

      setCompetitors((prev) => [...prev, optimistic]);

      try {
        const docRef = await addDoc(collection(db, "competitors"), {
          trackerId: uid,
          targetId: targetUser.id,
          targetName: optimistic.targetName,
          targetUsername: targetUser.identity?.username || "",
          targetScore: optimistic.targetScore,
          timestamp: serverTimestamp(),
        });

        setCompetitors((prev) =>
          prev.map((c) =>
            c.id === optimistic.id
              ? { ...optimistic, id: docRef.id, _optimistic: false }
              : c,
          ),
        );
      } catch (err) {
        console.error("[useNetwork] markAsCompetitor failed:", err);
        setCompetitors((prev) => prev.filter((c) => c.id !== optimistic.id));
      }
    },
    [uid, competitors],
  );

  const cancelOutboundRequest = useCallback(
    async (connectionId) => {
      if (!uid || !connectionId) return;

      const connection = pendingOutbound.find((c) => c.id === connectionId);
      if (!connection) return;

      setPendingOutbound((prev) => prev.filter((c) => c.id !== connectionId));

      try {
        await deleteDoc(doc(db, "connections", connectionId));
      } catch (err) {
        console.error("[useNetwork] cancelOutboundRequest failed:", err);
        setPendingOutbound((prev) => [...prev, connection]);
      }
    },
    [uid, pendingOutbound],
  );

  // ─── Derived State ────────────────────────────────────────────────────────

  const getConnectionStatus = useCallback(
    (targetId) => {
      if (
        alliances.some(
          (c) =>
            (c.requesterId === uid && c.receiverId === targetId) ||
            (c.receiverId === uid && c.requesterId === targetId),
        )
      )
        return "ALLIANCE";

      if (pendingOutbound.some((c) => c.receiverId === targetId))
        return "PENDING_SENT";

      if (pendingInbound.some((c) => c.requesterId === targetId))
        return "PENDING_RECEIVED";

      if (competitors.some((c) => c.targetId === targetId)) return "COMPETITOR";

      return "NONE";
    },
    [uid, alliances, pendingOutbound, pendingInbound, competitors],
  );

  const networkStats = useMemo(
    () => ({
      alliances: alliances.length,
      pendingInbound: pendingInbound.length,
      pendingOutbound: pendingOutbound.length,
      competitors: competitors.length,
    }),
    [alliances, pendingInbound, pendingOutbound, competitors],
  );

  return {
    // Feed
    posts,
    feedLoading,
    feedError,
    hasMorePosts,
    isPosting,
    fetchFeed,
    createPost,
    toggleLike,

    // Network
    alliances,
    pendingInbound,
    pendingOutbound,
    competitors,
    suggestedUsers,
    networkLoading,
    networkStats,
    fetchNetworkData,
    sendAllianceRequest,
    acceptAllianceRequest,
    declineAllianceRequest,
    removeAlliance,
    markAsCompetitor,
    cancelOutboundRequest,
    getConnectionStatus,
  };
};
