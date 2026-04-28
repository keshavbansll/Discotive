/**
 * @fileoverview Learn.jsx — Discotive Learn Engine Orchestrator v2.0
 *
 * ARCHITECTURE LAW:
 * This file contains ZERO UI. It is a pure data/state orchestrator.
 * All rendering is delegated to LearnPCLayout or LearnMobileLayout
 * based on ResizeObserver-detected viewport paradigm.
 *
 * State owned here:
 *  - isMobile (ResizeObserver, not CSS media query)
 *  - isAdmin (one-shot Firestore read, cached)
 *  - selectedItem / selectedType → drives LearnAssetSheet
 *  - adminForm state → drives LearnAdminModal
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { useLearnEngine, buildCompletionMap } from "../hooks/useLearnEngine";

// ── Layout Primitives (Code-split) ────────────────────────────────────────────
import LearnPCLayout from "../layouts/learn/LearnPCLayout";
const LearnMobileLayout = lazy(() => import("../layouts/learn/LearnMobileLayout"));

// ── Overlay Primitives (Code-split) ──────────────────────────────────────────
const LearnAssetSheet = lazy(
  () => import("../components/learn/LearnAssetSheet"),
);
const LearnAdminModal = lazy(
  () => import("../components/learn/LearnAdminModal"),
);

// ── Breakpoint: PC starts at 1024px ──────────────────────────────────────────
const MOBILE_BREAKPOINT = 1024;

// ── Null fallback while lazy chunks load ──────────────────────────────────────
const NullFallback = () => null;

// =============================================================================
// LEARN PAGE
// =============================================================================
const Learn = () => {
  const { currentUser } = useAuth();
  const { userData } = useUserData();

  // ── Viewport paradigm (ResizeObserver — not CSS) ──────────────────────────
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  // ── Admin gate (one-shot Firestore, cached in module scope) ──────────────
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    const check = async () => {
      try {
        const snap = await getDoc(doc(db, "admins", currentUser.uid));
        if (!cancelled) setIsAdmin(snap.exists());
      } catch (_) {}
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // ── Data engine ───────────────────────────────────────────────────────────
  const {
    certs,
    videos,
    rawCerts,
    rawVideos,
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
    loadMoreCerts,
    loadMoreVideos,
    refetch,
  } = useLearnEngine();

  // ── Completion map (zero extra Firestore reads) ───────────────────────────
  const completionMap = useMemo(
    () => buildCompletionMap(userData?.vault || []),
    [userData?.vault],
  );

  // ── Tier flags ────────────────────────────────────────────────────────────
  const isPremium = useMemo(
    () => ["PRO", "ENTERPRISE"].includes(userData?.tier),
    [userData?.tier],
  );

  // ── Selected item sheet ───────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState("cert"); // 'cert' | 'video'

  const handleSelect = useCallback((item, type) => {
    setSelectedItem(item);
    setSelectedType(type || "cert");
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // ── Admin form state ──────────────────────────────────────────────────────
  const [adminForm, setAdminForm] = useState({
    open: false,
    type: "cert",
    item: null,
  });

  const handleAdminAdd = useCallback((type) => {
    setAdminForm({ open: true, type, item: null });
  }, []);

  const handleAdminEdit = useCallback((item) => {
    setAdminForm({ open: true, type: item._type || "cert", item });
  }, []);

  const handleAdminSaved = useCallback(() => {
    setAdminForm({ open: false, type: "cert", item: null });
    refetch();
  }, [refetch]);

  const handleAdminClose = useCallback(() => {
    setAdminForm({ open: false, type: "cert", item: null });
  }, []);

  // ── Shared layout props ───────────────────────────────────────────────────
  const sharedProps = {
    certs,
    videos,
    rawCerts,
    rawVideos,
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
    loadMoreCerts,
    loadMoreVideos,
    completionMap,
    onSelect: handleSelect,
    isAdmin,
    onAdminAdd: handleAdminAdd,
    onAdminEdit: handleAdminEdit,
    userData,
    isPremium,
  };

  return (
    <>
      {/* ── LAYOUT RENDERING — full DOM divergence, not CSS stacking ───── */}
      {isMobile ? (
        <Suspense fallback={<NullFallback />}>
          <LearnMobileLayout {...sharedProps} isMobile={true} />
        </Suspense>
      ) : (
        <LearnPCLayout {...sharedProps} isMobile={false} />
      )}

      {/* ── OVERLAYS (shared across paradigms) ─────────────────────────── */}
      <Suspense fallback={null}>
        {selectedItem && (
          <LearnAssetSheet
            item={selectedItem}
            type={selectedType}
            completion={completionMap[selectedItem?.discotiveLearnId]}
            onClose={handleCloseSheet}
            userData={userData}
            isPremium={isPremium}
            isMobile={isMobile}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {adminForm.open && (
          <LearnAdminModal
            type={adminForm.type}
            item={adminForm.item}
            onClose={handleAdminClose}
            onSaved={handleAdminSaved}
            adminEmail={currentUser?.email}
          />
        )}
      </Suspense>
    </>
  );
};

export default Learn;
