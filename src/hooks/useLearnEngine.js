/**
 * @fileoverview useLearnEngine.js — Discotive Learn Data Engine v3.0
 *
 * ARCHITECTURE:
 * - Zero onSnapshot to minimize read costs. All reads are one-shot `getDocs`.
 * - 4 content verticals: courses · videos · podcasts · resources.
 * - Algorithm feed: Secured Cloud Function call (`computeLearnAlgorithm`), cached server-side.
 * - Row-based data model (Netflix pattern): hero, algo, continue, trending, new, per-type.
 * - Backend-first filtering: Firestore WHERE clauses used strictly over client-side array filters.
 * - Progress tracking: Atomic merges to `users/{uid}/learn_progress/{learnId}`.
 * - Mount-safety: Uses refs to prevent state updates on unmounted components.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { LEARN_COLLECTIONS, buildCompletionMap } from "../lib/discotiveLearn";

export { buildCompletionMap };

export const PAGE_SIZE = 20;

// ─── Default Filter State ──────────────────────────────────────────────────────
export const DEFAULT_FILTERS = {
  type: "all", // 'all' | 'course' | 'video' | 'podcast' | 'resource'
  domain: "",
  category: "",
  difficulty: "",
  isPaid: "any", // 'any' | 'free' | 'paid'
  industryRelevance: "",
  platform: "",
  sort: "newest", // 'newest' | 'popular' | 'score'
  search: "",
};

// ─── Progress Helpers ──────────────────────────────────────────────────────────
const buildProgressQuery = (uid) =>
  collection(db, "users", uid, "learn_progress");

// ─── Firestore Query Builder ───────────────────────────────────────────────────
const buildItemQuery = (colName, filters, lastDoc, extraConstraints = []) => {
  const constraints = [...extraConstraints];

  if (filters.domain)
    constraints.push(where("domains", "array-contains", filters.domain));
  if (filters.category)
    constraints.push(where("category", "==", filters.category));
  if (filters.difficulty)
    constraints.push(where("difficulty", "==", filters.difficulty));
  if (filters.industryRelevance)
    constraints.push(
      where("industryRelevance", "==", filters.industryRelevance),
    );
  if (filters.platform)
    constraints.push(where("platform", "==", filters.platform));

  if (filters.isPaid === "free") constraints.push(where("isPaid", "==", false));
  else if (filters.isPaid === "paid")
    constraints.push(where("isPaid", "==", true));

  // Sort Logic
  if (filters.sort === "newest") {
    constraints.push(orderBy("createdAt", "desc"));
  } else if (filters.sort === "popular") {
    constraints.push(orderBy("enrollmentCount", "desc"));
  } else if (filters.sort === "score") {
    constraints.push(orderBy("scoreReward", "desc"));
  } else {
    constraints.push(orderBy("createdAt", "desc"));
  }

  constraints.push(limit(PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  return query(collection(db, colName), ...constraints);
};

// ─── Client-Side Search (Post-Fetch) ───────────────────────────────────────────
const applySearch = (items, search) => {
  if (!search?.trim()) return items;
  const q = search.trim().toLowerCase();
  return items.filter(
    (item) =>
      (item.title || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q) ||
      (item.provider || item.channelName || item.podcastName || "")
        .toLowerCase()
        .includes(q) ||
      (item.tags || []).some((t) => t.toLowerCase().includes(q)),
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════
export const useLearnEngine = ({ uid, userData, isPremium }) => {
  const isMounted = useRef(true);

  // ── Row Data State ─────────────────────────────────────────────────────────
  const [heroItems, setHeroItems] = useState([]);
  const [algoFeed, setAlgoFeed] = useState([]);
  const [continueItems, setContinueItems] = useState([]);
  const [trendingDomain, setTrendingDomain] = useState([]);
  const [newCourses, setNewCourses] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [podcasts, setPodcasts] = useState([]);
  const [resources, setResources] = useState([]);

  // ── Browse State (Full Page View) ─────────────────────────────────────────
  const [browseItems, setBrowseItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // ── Loading & Meta State ───────────────────────────────────────────────────
  const [loadingHero, setLoadingHero] = useState(true);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingAlgo, setLoadingAlgo] = useState(false);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [isPaging, setIsPaging] = useState(false);
  const [progressMap, setProgressMap] = useState({});
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [browseMode, setBrowseMode] = useState(false);
  const [error, setError] = useState(null);

  // Extract strictly what is needed to avoid re-triggering on score mutations
  const userDomain =
    userData?.identity?.domain || userData?.vision?.passion || "";

  // Pagination cursor
  const lastDocRef = useRef(null);

  // Lifecycle cleanup to prevent memory leaks
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Filter key drives auto-refetching efficiently
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        type: filters.type,
        domain: filters.domain,
        category: filters.category,
        difficulty: filters.difficulty,
        isPaid: filters.isPaid,
        industryRelevance: filters.industryRelevance,
        platform: filters.platform,
        sort: filters.sort,
      }),
    [filters],
  );

  // ── Fetch User Progress ────────────────────────────────────────────────────
  const fetchProgress = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(buildProgressQuery(uid));
      const map = {};
      snap.forEach((d) => {
        map[d.id] = d.data();
      });
      if (isMounted.current) setProgressMap(map);
    } catch (err) {
      console.error("[useLearnEngine] fetchProgress error:", err);
    }
  }, [uid]);

  // ── Fetch Hero Banner Items ────────────────────────────────────────────────
  const fetchHero = useCallback(async () => {
    setLoadingHero(true);
    try {
      const colNames = [
        LEARN_COLLECTIONS.courses,
        LEARN_COLLECTIONS.videos,
        LEARN_COLLECTIONS.podcasts,
        LEARN_COLLECTIONS.resources,
      ];
      const all = [];
      await Promise.allSettled(
        colNames.map(async (col) => {
          const snap = await getDocs(
            query(
              collection(db, col),
              where("isFeatured", "==", true),
              orderBy("createdAt", "desc"),
              limit(3),
            ),
          );
          snap.forEach((d) => all.push({ id: d.id, ...d.data() }));
        }),
      );
      if (isMounted.current) setHeroItems(all.slice(0, 8));
    } catch (err) {
      console.error("[useLearnEngine] fetchHero error:", err);
    } finally {
      if (isMounted.current) setLoadingHero(false);
    }
  }, []);

  // ── Fetch AI Algorithm Feed (PRO Only) ─────────────────────────────────────
  const fetchAlgoFeed = useCallback(async () => {
    if (!uid || !isPremium) return;
    setLoadingAlgo(true);
    try {
      const fn = httpsCallable(functions, "computeLearnAlgorithm");
      const res = await fn({ uid, domain: userDomain });
      if (isMounted.current) setAlgoFeed(res.data?.picks || []);
    } catch (err) {
      console.error("[useLearnEngine] fetchAlgoFeed error:", err);
    } finally {
      if (isMounted.current) setLoadingAlgo(false);
    }
  }, [uid, isPremium, userDomain]);

  // ── Build Continue Learning Row ────────────────────────────────────────────
  const buildContinueItems = useCallback(async () => {
    if (!uid || Object.keys(progressMap).length === 0) return;
    const inProgress = Object.entries(progressMap)
      .filter(([, v]) => v.progressPct > 0 && v.progressPct < 100)
      .sort(([, a], [, b]) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, 12);

    if (!inProgress.length) {
      if (isMounted.current) setContinueItems([]);
      return;
    }

    const results = [];
    await Promise.allSettled(
      inProgress.map(async ([learnId, progress]) => {
        const cols = [
          LEARN_COLLECTIONS.courses,
          LEARN_COLLECTIONS.videos,
          LEARN_COLLECTIONS.podcasts,
          LEARN_COLLECTIONS.resources,
        ];
        for (const col of cols) {
          const snap = await getDocs(
            query(
              collection(db, col),
              where("discotiveLearnId", "==", learnId),
              limit(1),
            ),
          );
          if (!snap.empty) {
            const d = snap.docs[0];
            results.push({ id: d.id, ...d.data(), _progress: progress });
            break;
          }
        }
      }),
    );
    if (isMounted.current) setContinueItems(results);
  }, [uid, progressMap]);

  // ── Fetch Content Rows ─────────────────────────────────────────────────────
  const fetchRows = useCallback(async () => {
    if (!uid) return;
    setLoadingRows(true);

    try {
      const promises = [];

      // 1. Trending in user's domain
      if (userDomain) {
        promises.push(
          getDocs(
            query(
              collection(db, LEARN_COLLECTIONS.courses),
              where("domains", "array-contains", userDomain),
              orderBy("enrollmentCount", "desc"),
              limit(12),
            ),
          ).then((snap) => {
            if (isMounted.current)
              setTrendingDomain(
                snap.docs.map((d) => ({ id: d.id, ...d.data() })),
              );
          }),
        );
      }

      // 2. New Courses
      promises.push(
        getDocs(
          query(
            collection(db, LEARN_COLLECTIONS.courses),
            orderBy("createdAt", "desc"),
            limit(12),
          ),
        ).then((snap) => {
          if (isMounted.current)
            setNewCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }),
      );

      // 3. Top Videos
      promises.push(
        getDocs(
          query(
            collection(db, LEARN_COLLECTIONS.videos),
            orderBy("createdAt", "desc"),
            limit(12),
          ),
        ).then((snap) => {
          if (isMounted.current)
            setTopVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }),
      );

      // 4. Podcasts
      promises.push(
        getDocs(
          query(
            collection(db, LEARN_COLLECTIONS.podcasts),
            orderBy("createdAt", "desc"),
            limit(10),
          ),
        ).then((snap) => {
          if (isMounted.current)
            setPodcasts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }),
      );

      // 5. Resources
      promises.push(
        getDocs(
          query(
            collection(db, LEARN_COLLECTIONS.resources),
            orderBy("createdAt", "desc"),
            limit(10),
          ),
        ).then((snap) => {
          if (isMounted.current)
            setResources(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }),
      );

      await Promise.allSettled(promises);
    } catch (err) {
      console.error("[useLearnEngine] fetchRows error:", err);
      if (isMounted.current)
        setError("Failed to load content. Please try again.");
    } finally {
      if (isMounted.current) setLoadingRows(false);
    }
  }, [uid, userDomain]); // ONLY depend on primitives, never the full mutating userData object

  // ── Browse Mode Fetcher ────────────────────────────────────────────────────
  const fetchBrowse = useCallback(
    async (reset = false) => {
      if (!uid) return;
      if (reset) {
        lastDocRef.current = null;
        setLoadingBrowse(true);
      } else {
        setIsPaging(true);
      }

      try {
        const colMap = {
          course: LEARN_COLLECTIONS.courses,
          video: LEARN_COLLECTIONS.videos,
          podcast: LEARN_COLLECTIONS.podcasts,
          resource: LEARN_COLLECTIONS.resources,
        };

        const cols =
          filters.type === "all"
            ? Object.values(LEARN_COLLECTIONS).filter(
                (c) => c !== LEARN_COLLECTIONS.algoCache,
              )
            : [colMap[filters.type]].filter(Boolean);

        if (!cols.length) {
          if (isMounted.current) {
            setBrowseItems([]);
            setHasMore(false);
          }
          return;
        }

        if (filters.type === "all") {
          const perCol = Math.ceil(PAGE_SIZE / cols.length);
          const allItems = [];
          let anyColHasMore = false;

          await Promise.allSettled(
            cols.map(async (col) => {
              const q = buildItemQuery(col, filters, null, []);
              // Note: For absolute correctness across platforms, we apply the query filters here
              const snap = await getDocs(
                query(
                  collection(db, col),
                  ...(q._queryOptions?.filters || []),
                  orderBy("createdAt", "desc"),
                  limit(perCol),
                ),
              );
              if (snap.docs.length === perCol) anyColHasMore = true;
              snap.forEach((d) => allItems.push({ id: d.id, ...d.data() }));
            }),
          );
          allItems.sort(
            (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
          );

          if (isMounted.current) {
            setBrowseItems(reset ? allItems : (prev) => [...prev, ...allItems]);
            // If any collection hit its pagination limit, there is mathematically more content available
            setHasMore(anyColHasMore);
          }
        } else {
          const col = cols[0];
          const q = buildItemQuery(
            col,
            filters,
            reset ? null : lastDocRef.current,
          );
          const snap = await getDocs(q);
          lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

          if (isMounted.current) {
            setBrowseItems(reset ? items : (prev) => [...prev, ...items]);
            setHasMore(snap.docs.length === PAGE_SIZE);
          }
        }
      } catch (err) {
        console.error("[useLearnEngine] fetchBrowse error:", err);
        if (isMounted.current) setError("Failed to load results.");
      } finally {
        if (isMounted.current) {
          setLoadingBrowse(false);
          setIsPaging(false);
        }
      }
    },
    [uid, filters],
  );

  // ── Lifecycle Orchestration ────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    const initEngine = async () => {
      await Promise.allSettled([
        fetchProgress(),
        fetchHero(),
        fetchRows(),
        fetchAlgoFeed(),
      ]);
    };
    initEngine();
  }, [uid, fetchProgress, fetchHero, fetchRows, fetchAlgoFeed]);

  useEffect(() => {
    if (!uid || Object.keys(progressMap).length === 0) return;
    const initContinue = async () => {
      await buildContinueItems();
    };
    initContinue();
  }, [progressMap, uid, buildContinueItems]);

  useEffect(() => {
    if (!browseMode) return;
    const runBrowse = async () => {
      await fetchBrowse(true);
    };
    runBrowse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, browseMode]);

  // ── Public API Controls ────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (partial) => {
      setFilters((prev) => ({ ...prev, ...partial }));
      if (!browseMode) setBrowseMode(true);
    },
    [browseMode],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setBrowseMode(false);
    setBrowseItems([]);
  }, []);

  const setSearch = useCallback(
    (s) => {
      setFilters((prev) => ({ ...prev, search: s }));
      if (s.trim() && !browseMode) {
        setBrowseMode(true);
      } else if (!s.trim()) {
        const nonSearchFilters = { ...filters, search: "" };
        const isDefault =
          JSON.stringify(nonSearchFilters) ===
          JSON.stringify({ ...DEFAULT_FILTERS, search: "" });
        if (isDefault) setBrowseMode(false);
      }
    },
    [browseMode, filters],
  );

  const enterBrowse = useCallback((initialType = "all") => {
    setFilters((prev) => ({ ...prev, type: initialType }));
    setBrowseMode(true);
  }, []);

  const exitBrowse = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setBrowseMode(false);
    setBrowseItems([]);
  }, []);

  const loadMore = useCallback(() => {
    if (!isPaging && hasMore) fetchBrowse(false);
  }, [fetchBrowse, isPaging, hasMore]);

  const refetch = useCallback(() => {
    fetchHero();
    fetchRows();
    fetchAlgoFeed();
    fetchProgress();
  }, [fetchHero, fetchRows, fetchAlgoFeed, fetchProgress]);

  // ── Mutations: Progress & Portfolio ────────────────────────────────────────
  const trackProgress = useCallback(
    async (discotiveLearnId, progressPct, durationSecs = 0) => {
      if (!uid || !discotiveLearnId) return;
      try {
        const ref = doc(db, "users", uid, "learn_progress", discotiveLearnId);
        const updateData = {
          discotiveLearnId,
          progressPct: Math.min(100, Math.max(0, progressPct)),
          durationSecs,
          lastAccessedAt: Date.now(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(ref, updateData, { merge: true });

        if (isMounted.current) {
          setProgressMap((prev) => ({
            ...prev,
            [discotiveLearnId]: {
              ...(prev[discotiveLearnId] || {}),
              ...updateData,
              lastAccessedAt: Date.now(),
            },
          }));
        }
      } catch (err) {
        console.error("[useLearnEngine] trackProgress error:", err);
      }
    },
    [uid],
  );

  const addToPortfolio = useCallback(
    async (item) => {
      if (!uid) return false;
      try {
        const ref = collection(db, "users", uid, "learn_portfolio");
        await addDoc(ref, {
          discotiveLearnId: item.discotiveLearnId,
          type: item.type,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl || "",
          platform: item.platform || "",
          youtubeId: item.youtubeId || null,
          link: item.link || null,
          addedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          isPublic: true,
        });
        return true;
      } catch (err) {
        console.error("[useLearnEngine] addToPortfolio error:", err);
        return false;
      }
    },
    [uid],
  );

  // Derived search display
  const displayBrowseItems = useMemo(
    () => applySearch(browseItems, filters.search),
    [browseItems, filters.search],
  );

  return {
    heroItems,
    algoFeed,
    continueItems,
    trendingDomain,
    newCourses,
    topVideos,
    podcasts,
    resources,
    browseMode,
    browseItems: displayBrowseItems,
    hasMore,
    loadingHero,
    loadingRows,
    loadingAlgo,
    loadingBrowse,
    isPaging,
    progressMap,
    filters,
    error,
    applyFilters,
    resetFilters,
    setSearch,
    enterBrowse,
    exitBrowse,
    loadMore,
    refetch,
    trackProgress,
    addToPortfolio,
  };
};
