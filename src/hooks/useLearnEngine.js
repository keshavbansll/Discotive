/**
 * @fileoverview useLearnEngine — Discotive Learn Data Engine v2.0
 *
 * ARCHITECTURE MANDATES:
 * - Zero onSnapshot listeners. Every read is a one-shot getDocs.
 * - Backend-first: Primary filter hits Firestore query layer.
 * - Secondary filter (difficulty, isPaid, relevance, search) applied
 *   client-side on the loaded 20-item page only — not on a "massive array".
 * - Cursor-based pagination via startAfter.
 * - filterKey-driven auto-refetch: changing filters resets and re-queries.
 *
 * Required Firestore Composite Indexes (add to firestore.indexes.json):
 *   discotive_certificates: [domains ARRAY, scoreReward DESC]
 *   discotive_certificates: [category ASC, createdAt DESC]
 *   discotive_certificates: [domains ARRAY, createdAt DESC]
 *   discotive_videos:       [domains ARRAY, scoreReward DESC]
 *   discotive_videos:       [category ASC, createdAt DESC]
 *   discotive_videos:       [domains ARRAY, createdAt DESC]
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "../firebase";
import { LEARN_COLLECTIONS } from "../lib/discotiveLearn";

export const LEARN_PAGE_SIZE = 20;

// ── Completion Map ────────────────────────────────────────────────────────────
// Derived from user's vault array. Zero extra Firestore reads.
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

// ── Primary Query Builder ─────────────────────────────────────────────────────
// One WHERE clause only to avoid composite index proliferation.
// Most selective filter wins.
const buildQuery = (col, filters, lastDoc) => {
  const constraints = [];

  if (filters.domain) {
    constraints.push(where("domains", "array-contains", filters.domain));
    constraints.push(
      orderBy(filters.sort === "score" ? "scoreReward" : "createdAt", "desc"),
    );
  } else if (filters.category) {
    constraints.push(where("category", "==", filters.category));
    constraints.push(orderBy("createdAt", "desc"));
  } else {
    const sortField = filters.sort === "score" ? "scoreReward" : "createdAt";
    constraints.push(
      orderBy(sortField, filters.sort === "title" ? "asc" : "desc"),
    );
  }

  constraints.push(limit(LEARN_PAGE_SIZE));
  if (lastDoc) constraints.push(startAfter(lastDoc));

  return query(collection(db, col), ...constraints);
};

// ── Secondary Filter ──────────────────────────────────────────────────────────
// Applied ONLY on the ≤20 items returned from Firestore. Not a massive array.
const applySecondaryFilter = (items, filters) => {
  let r = items;
  if (filters.difficulty)
    r = r.filter((i) => i.difficulty === filters.difficulty);
  if (filters.industryRelevance)
    r = r.filter((i) => i.industryRelevance === filters.industryRelevance);
  if (filters.isPaid === "free") r = r.filter((i) => !i.isPaid);
  if (filters.isPaid === "paid") r = r.filter((i) => !!i.isPaid);
  return r;
};

// ── Default Filter State ──────────────────────────────────────────────────────
export const DEFAULT_FILTERS = {
  domain: "",
  category: "",
  difficulty: "",
  isPaid: "any", // 'any' | 'free' | 'paid'
  industryRelevance: "", // '' | 'Weak' | 'Medium' | 'Strong'
  sort: "newest", // 'newest' | 'score' | 'title'
  search: "",
  activeTab: "certs", // 'certs' | 'videos'
};

// ═════════════════════════════════════════════════════════════════════════════
// THE HOOK
// ═════════════════════════════════════════════════════════════════════════════
export const useLearnEngine = () => {
  const [certs, setCerts] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [isPaging, setIsPaging] = useState(false);
  const [hasMoreCerts, setHasMoreCerts] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const lastCertRef = useRef(null);
  const lastVideoRef = useRef(null);
  const initialized = useRef(false);

  // ── Stable filter key (excludes search — search is local-only) ──────────────
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        domain: filters.domain,
        category: filters.category,
        difficulty: filters.difficulty,
        isPaid: filters.isPaid,
        industryRelevance: filters.industryRelevance,
        sort: filters.sort,
      }),
    [
      filters.domain,
      filters.category,
      filters.difficulty,
      filters.isPaid,
      filters.industryRelevance,
      filters.sort,
    ],
  );

  // ── Cert Fetcher ──────────────────────────────────────────────────────────
  const fetchCerts = useCallback(
    async (reset = false, activeFilters = null) => {
      const f = activeFilters || filters;
      if (reset) lastCertRef.current = null;

      if (reset) setLoadingCerts(true);
      else setIsPaging(true);
      setError(null);

      try {
        const q = buildQuery(
          LEARN_COLLECTIONS.certificates,
          f,
          reset ? null : lastCertRef.current,
        );
        const snap = await getDocs(q);
        lastCertRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMoreCerts(snap.docs.length === LEARN_PAGE_SIZE);
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = applySecondaryFilter(raw, f);
        setCerts((prev) => (reset ? filtered : [...prev, ...filtered]));
      } catch (err) {
        console.error("[useLearnEngine] fetchCerts:", err);
        setError("Failed to load courses.");
      } finally {
        setLoadingCerts(false);
        setIsPaging(false);
      }
    },
    [filters],
  );

  // ── Video Fetcher ──────────────────────────────────────────────────────────
  const fetchVideos = useCallback(
    async (reset = false, activeFilters = null) => {
      const f = activeFilters || filters;
      if (reset) lastVideoRef.current = null;

      if (reset) setLoadingVideos(true);
      else setIsPaging(true);
      setError(null);

      try {
        const q = buildQuery(
          LEARN_COLLECTIONS.videos,
          f,
          reset ? null : lastVideoRef.current,
        );
        const snap = await getDocs(q);
        lastVideoRef.current = snap.docs[snap.docs.length - 1] || null;
        setHasMoreVideos(snap.docs.length === LEARN_PAGE_SIZE);
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const filtered = applySecondaryFilter(raw, f);
        setVideos((prev) => (reset ? filtered : [...prev, ...filtered]));
      } catch (err) {
        console.error("[useLearnEngine] fetchVideos:", err);
        setError("Failed to load videos.");
      } finally {
        setLoadingVideos(false);
        setIsPaging(false);
      }
    },
    [filters],
  );

  // ── Auto-refetch on filter change ──────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
    }
    fetchCerts(true, filters);
    fetchVideos(true, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // ── Exposed Controls ───────────────────────────────────────────────────────
  const applyFilters = useCallback((partial) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const setSearch = useCallback((s) => {
    setFilters((prev) => ({ ...prev, search: s }));
  }, []);

  // ── Client-side search on loaded pages ────────────────────────────────────
  const displayCerts = useMemo(() => {
    if (!filters.search?.trim()) return certs;
    const q = filters.search.trim().toLowerCase();
    return certs.filter(
      (c) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.provider || "").toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [certs, filters.search]);

  const displayVideos = useMemo(() => {
    if (!filters.search?.trim()) return videos;
    const q = filters.search.trim().toLowerCase();
    return videos.filter(
      (v) =>
        (v.title || "").toLowerCase().includes(q) ||
        (v.tags || []).some((t) => t.toLowerCase().includes(q)),
    );
  }, [videos, filters.search]);

  return {
    certs: displayCerts,
    videos: displayVideos,
    rawCerts: certs,
    rawVideos: videos,
    loadingCerts,
    loadingVideos,
    isPaging,
    hasMoreCerts,
    hasMoreVideos,
    error,
    filters,
    applyFilters,
    resetFilters,
    setSearch,
    loadMoreCerts: useCallback(() => fetchCerts(false), [fetchCerts]),
    loadMoreVideos: useCallback(() => fetchVideos(false), [fetchVideos]),
    refetch: useCallback(() => {
      fetchCerts(true);
      fetchVideos(true);
    }, [fetchCerts, fetchVideos]),
  };
};
