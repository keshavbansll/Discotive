/**
 * @fileoverview Learn.jsx — Discotive Learn Engine Orchestrator v3.0
 *
 * ARCHITECTURE LAW: ZERO UI HERE.
 * Pure state orchestrator. All rendering delegated to LearnPCLayout / LearnMobileLayout.
 * * MAANG Optimizations Applied:
 * - Strict reference memoization (useMemo) for layout props to prevent cascade re-renders.
 * - Error Boundaries added for React.lazy chunk loading failures.
 * - Race-condition safe asynchronous admin verification.
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
import ErrorBoundary from "../components/boundaries/ErrorBoundary"; // Assuming this exists per standard Discotive architecture
import GlobalLoader from "../components/GlobalLoader";

// ── Layouts (code-split) ──────────────────────────────────────────────────────
import LearnPCLayout from "../layouts/learn/LearnPCLayout"; // Fixed import path based on standard layout structure
const LearnMobileLayout = lazy(
  () => import("../layouts/learn/LearnMobileLayout"),
);

// ── Overlays (code-split) ─────────────────────────────────────────────────────
const LearnAssetSheet = lazy(
  () => import("../components/learn/LearnAssetSheet"),
);
const LearnAdminModal = lazy(
  () => import("../components/learn/LearnAdminModal"),
);
const LearnPortfolio = lazy(() => import("../components/learn/LearnPortfolio"));

const MOBILE_BREAKPOINT = 1024;
const NullFallback = () => null;

// =============================================================================
const Learn = () => {
  const { currentUser } = useAuth();
  const { userData } = useUserData();

  // ── Viewport paradigm (Performant ResizeObserver) ─────────────────────────
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth < MOBILE_BREAKPOINT,
  );

  useEffect(() => {
    let frameId;
    const update = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ── Admin gate (Safe async pattern) ───────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;
    let isMounted = true;

    const checkAdmin = async () => {
      try {
        const snap = await getDoc(doc(db, "admins", currentUser.uid));
        if (isMounted) setIsAdmin(snap.exists());
      } catch (error) {
        console.error("Admin verification failed:", error);
      }
    };

    checkAdmin();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // ── Tier ─────────────────────────────────────────────────────────────────
  const isPremium = useMemo(
    () => ["PRO", "ENTERPRISE"].includes(userData?.tier),
    [userData?.tier],
  );

  // ── Learn Engine ──────────────────────────────────────────────────────────
  const engine = useLearnEngine({
    uid: currentUser?.uid,
    userData,
    isPremium,
  });

  // ── Completion map (from vault) ───────────────────────────────────────────
  const completionMap = useMemo(
    () => buildCompletionMap(userData?.vault || []),
    [userData?.vault],
  );

  // ── Selected item sheet ───────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSelect = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // ── Admin form ────────────────────────────────────────────────────────────
  const [adminForm, setAdminForm] = useState({
    open: false,
    type: "course",
    item: null,
  });

  const handleAdminAdd = useCallback((type) => {
    setAdminForm({ open: true, type, item: null });
  }, []);

  const handleAdminEdit = useCallback((item) => {
    setAdminForm({ open: true, type: item.type || "course", item });
  }, []);

  const handleAdminSaved = useCallback(() => {
    setAdminForm({ open: false, type: "course", item: null });
    engine.refetch();
  }, [engine]);

  const handleAdminClose = useCallback(() => {
    setAdminForm({ open: false, type: "course", item: null });
  }, []);

  // ── Portfolio panel ───────────────────────────────────────────────────────
  const [portfolioOpen, setPortfolioOpen] = useState(false);

  // ── Shared props for both layouts (Strictly Memoized) ─────────────────────
  // This prevents cascading re-renders of the heavy Netflix-style rows.
  const sharedProps = useMemo(
    () => ({
      ...engine,
      completionMap,
      isAdmin,
      isPremium,
      isMobile,
      userData,
      currentUser,
      onSelect: handleSelect,
      onAdminAdd: handleAdminAdd,
      onAdminEdit: handleAdminEdit,
      onOpenPortfolio: () => setPortfolioOpen(true),
    }),
    [
      engine,
      completionMap,
      isAdmin,
      isPremium,
      isMobile,
      userData,
      currentUser,
      handleSelect,
      handleAdminAdd,
      handleAdminEdit,
    ],
  );

  return (
    <ErrorBoundary>
      {/* ── Layout rendering ───────────────────────────────────────────── */}
      {isMobile ? (
        <Suspense fallback={<GlobalLoader />}>
          <LearnMobileLayout {...sharedProps} />
        </Suspense>
      ) : (
        <LearnPCLayout {...sharedProps} />
      )}

      {/* ── Item detail sheet ─────────────────────────────────────────── */}
      <Suspense fallback={<NullFallback />}>
        {selectedItem && (
          <LearnAssetSheet
            item={selectedItem}
            completion={completionMap[selectedItem?.discotiveLearnId]}
            progress={engine.progressMap[selectedItem?.discotiveLearnId]}
            onClose={handleCloseSheet}
            onTrackProgress={engine.trackProgress}
            onAddToPortfolio={engine.addToPortfolio}
            userData={userData}
            isPremium={isPremium}
            isMobile={isMobile}
            isAdmin={isAdmin}
            onAdminEdit={handleAdminEdit}
          />
        )}
      </Suspense>

      {/* ── Admin modal ───────────────────────────────────────────────── */}
      <Suspense fallback={<NullFallback />}>
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

      {/* ── Portfolio panel ───────────────────────────────────────────── */}
      <Suspense fallback={<NullFallback />}>
        {portfolioOpen && (
          <LearnPortfolio
            uid={currentUser?.uid}
            userData={userData}
            isPremium={isPremium}
            onClose={() => setPortfolioOpen(false)}
            isMobile={isMobile}
          />
        )}
      </Suspense>
    </ErrorBoundary>
  );
};

export default Learn;
