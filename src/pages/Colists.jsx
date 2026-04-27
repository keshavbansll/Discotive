/**
 * @fileoverview Discotive Colists v2 — "The Knowledge Carousel"
 * @description Paradigm-shifted Colist experience:
 *   1. Paginated Fluid Canvas — one block per page, swipe/crossfade
 *   2. Game-Like Save States — resume from last page
 *   3. Dual-Ledger System — Colist Resonance Ring → Discotive Score
 *   4. Admin Verification Matrix — Original / Strong / Medium / Weak badges
 *   5. Forking Engine — Pro users fork Strong-rated lists
 *   6. Page-Level Applause — double-tap gold burst per page
 */

import React, { useState, useEffect, useCallback, memo } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { Helmet } from "react-helmet-async";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  limit,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useUserData } from "../hooks/useUserData";
import { Crown, Plus, ArrowRight, Loader2, GitFork } from "lucide-react";
import ColistsProfile from "../components/colists/ColistsProfile";
import ColistReader from "../components/colists/Reader";
import ColistsHome from "../components/colists/ColistsHome";
import ColistsEditor from "../components/colists/Editor";
import {
  G,
  V,
  T,
  COVER_GRADIENTS,
  generateSlug,
  createBlockId,
} from "../lib/colistConstants";

/* ─── Shared Configurations moved to src/lib/colistConstants.js ─── */

/* ─── Fork Modal ─────────────────────────────────────────────────────────── */
const ForkModal = memo(
  ({ colist, onClose, userData, currentUser, onForked }) => {
    const [forking, setForking] = useState(false);
    const [done, setDone] = useState(false);
    const [newSlug, setNewSlug] = useState("");

    const handleFork = async () => {
      const finalUid = currentUser?.uid || userData?.uid;
      if (!finalUid) return;
      setForking(true);
      try {
        const slug = generateSlug(`fork-${colist.title}`);
        const payload = {
          title: `${colist.title} (Fork)`,
          slug,
          description: colist.description || "",
          tags: colist.tags || [],
          coverGradient: colist.coverGradient || COVER_GRADIENTS[0],
          blocks: (colist.blocks || []).map((b) => ({
            ...b,
            id: createBlockId(),
          })),
          authorId: finalUid,
          authorUsername: userData.identity?.username || "operator",
          authorName:
            `${userData.identity?.firstName || ""} ${userData.identity?.lastName || ""}`.trim() ||
            "Operator",
          authorAvatar: userData.identity?.avatarUrl || null,
          isPublic: true,
          viewCount: 0,
          saveCount: 0,
          colistScore: 0,
          forkOf: {
            colistId: colist.id,
            authorUsername: colist.authorUsername,
            title: colist.title,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // OPTIMISTIC EXECUTION: Bypass adblocker network hang
        const newDocRef = doc(collection(db, "colists"));
        setDoc(newDocRef, payload).catch((err) =>
          console.warn("Background sync delayed:", err),
        );

        setNewSlug(slug);
        setDone(true);
        onForked?.(slug);
      } catch (err) {
        console.error(err);
      } finally {
        setForking(false);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(20px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: V.depth,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            {done ? (
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.3)",
                  }}
                >
                  <GitFork size={28} style={{ color: "#4ADE80" }} />
                </motion.div>
                <h3 className="text-xl font-black text-white mb-2">
                  Fork Created!
                </h3>
                <p className="text-xs mb-5" style={{ color: T.secondary }}>
                  Your fork is live with attribution to @{colist.authorUsername}
                  .
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{
                      background: V.surface,
                      color: T.dim,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    Close
                  </button>
                  <a
                    href={`/colists/${newSlug}`}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                      color: "#000",
                    }}
                  >
                    Open Fork <ArrowRight size={11} />
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: G.dimBg,
                      border: `1px solid ${G.border}`,
                    }}
                  >
                    <GitFork size={18} style={{ color: G.bright }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      Fork this Colist
                    </h3>
                    <p className="text-[10px]" style={{ color: T.dim }}>
                      Create your own editable copy
                    </p>
                  </div>
                </div>

                <div
                  className="p-4 rounded-xl mb-5"
                  style={{
                    background: G.dimBg,
                    border: `1px solid ${G.border}`,
                  }}
                >
                  <p
                    className="text-xs font-bold mb-1"
                    style={{ color: G.bright }}
                  >
                    Attribution Note
                  </p>
                  <p className="text-[11px]" style={{ color: T.secondary }}>
                    Your fork will permanently credit
                    <span className="font-black text-white">
                      @{colist.authorUsername}
                    </span>
                    . This is permanent and cannot be removed.
                  </p>
                </div>

                <div
                  className="text-[10px] mb-5 space-y-1.5"
                  style={{ color: T.dim }}
                >
                  <p>
                    ✓ All {(colist.blocks || []).length} pages copied to your
                    editor
                  </p>
                  <p>✓ Attribution tag attached to your colist</p>
                  <p>✓ Independent colist score tracking</p>
                  <p>✓ Full edit access — customize freely</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest"
                    style={{
                      background: V.surface,
                      color: T.dim,
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleFork}
                    disabled={forking}
                    className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg,#8B7240,#D4AF78)",
                      color: "#000",
                      opacity: forking ? 0.7 : 1,
                    }}
                  >
                    {forking ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <GitFork size={11} /> Fork Now
                      </>
                    )}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

/* ─── Premium + Auth Modals ───────────────────────────────────────────────── */
const PremiumModal = memo(({ onClose, navigate }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[700] flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)" }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.92, y: 24, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.92, y: 24, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      style={{ background: V.depth, border: `1px solid ${G.border}` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-8 text-center">
        <div
          className="w-20 h-20 rounded-[2rem] mx-auto mb-5 flex items-center justify-center"
          style={{
            background: G.dimBg,
            border: `1px solid ${G.border}`,
            boxShadow: `0 0 50px rgba(191,162,100,0.2)`,
          }}
        >
          <Crown size={38} style={{ color: G.bright }} />
        </div>
        <p
          className="text-[9px] font-black uppercase tracking-[0.35em] mb-2"
          style={{ color: G.base }}
        >
          Pro Clearance Required
        </p>
        <h2
          className="text-3xl font-black mb-3 leading-tight"
          style={{ color: T.primary, letterSpacing: "-0.03em" }}
        >
          Create a Colist
        </h2>
        <p
          className="text-sm leading-relaxed mb-7 max-w-xs mx-auto"
          style={{ color: T.secondary }}
        >
          Colists are a Pro-exclusive publishing tool. Build your reputation as
          a curator — every save adds to your Resonance score.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            onClose();
            navigate("/premium");
          }}
          className="w-full py-4 font-black text-sm uppercase tracking-widest rounded-2xl mb-2"
          style={{
            background: "linear-gradient(135deg,#8B7240,#D4AF78)",
            color: "#000",
            boxShadow: "0 0 40px rgba(191,162,100,0.3)",
          }}
        >
          Upgrade to Pro — ₹139/mo
        </motion.button>
        <button
          onClick={onClose}
          className="w-full py-3 text-sm font-bold"
          style={{ color: T.dim }}
        >
          Maybe later
        </button>
      </div>
    </motion.div>
  </motion.div>
));

/* ─── Main Page ───────────────────────────────────────────────────────────── */
const Colists = () => {
  const { slug, "*": subAction } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  // Detect if the current URL intent is to strictly edit a draft
  const isEditorView = subAction?.includes("edit");
  const { userData } = useUserData();
  const outletContext = useOutletContext();
  const showBottomNav = outletContext?.showBottomNav ?? true;
  const setShowBottomNav = outletContext?.setShowBottomNav;

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [activeColist, setActiveColist] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editColistTarget, setEditColistTarget] = useState(null);
  const [forkTarget, setForkTarget] = useState(null);
  const [showForkModal, setShowForkModal] = useState(false);

  // Expand clearance to include Admin entities
  const isPro =
    userData?.tier === "PRO" ||
    userData?.tier === "ENTERPRISE" ||
    userData?.tier === "ADMIN" ||
    userData?.role === "admin";

  // Auto-load colist with strict draft awareness and auth-gating
  useEffect(() => {
    if (authLoading) return; // Prevent premature fetches while auth hydrates

    if (!slug || slug === "new" || slug === "profile") {
      setTimeout(() => setActiveColist(null), 0);
      return;
    }

    const loadColist = async () => {
      try {
        let colistData = null;
        let colistId = null;

        // 1. Try fetching by ID first (Drafts often route by raw ID)
        try {
          const docRef = doc(db, "colists", slug);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            colistData = docSnap.data();
            colistId = docSnap.id;
          }
        } catch (e) {
          // Fallthrough to slug query
        }

        // 2. Try fetching by Slug if ID failed
        if (!colistData) {
          const snap = await getDocs(
            query(
              collection(db, "colists"),
              where("slug", "==", slug),
              limit(1),
            ),
          );
          if (!snap.empty) {
            colistData = snap.docs[0].data();
            colistId = snap.docs[0].id;
          }
        }

        if (colistData) {
          // Absolute Security Gate: Block unauthorized draft access
          if (
            !colistData.isPublic &&
            colistData.authorId !== currentUser?.uid
          ) {
            setActiveColist(null);
            return;
          }

          // Strict URL Taxonomy Enforcer: Force drafts to /unpublished
          if (!colistData.isPublic && !subAction?.includes("unpublished")) {
            navigate(`/colists/${slug || colistId}/unpublished`, {
              replace: true,
            });
            return;
          }

          const colistWithId = { id: colistId, ...colistData };
          setActiveColist(colistWithId);

          // Auto-launch editor ONLY if URL explicitly commands an edit
          if (isEditorView) {
            setEditColistTarget(colistWithId);
            setShowEditor(true);
          }
        } else {
          setActiveColist(null);
        }
      } catch (err) {
        console.error("Colist Load Integrity Failure:", err);
        setActiveColist(null);
      }
    };

    loadColist();
  }, [slug, currentUser, authLoading, isEditorView, subAction, navigate]);

  // Handle /colists/new & /colists/profile gates
  useEffect(() => {
    if (slug === "profile") {
      if (!currentUser) {
        navigate("/auth");
      }
      return;
    }
    if (slug !== "new") return;
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    if (userData && !isPro) {
      setTimeout(() => setShowPremiumModal(true), 0);
      navigate("/colists", { replace: true });
    } else if (isPro) {
      setTimeout(() => setShowEditor(true), 0);
    }
  }, [slug, currentUser, userData, isPro, navigate]);

  const handleCreateClick = useCallback(() => {
    if (!currentUser) {
      navigate("/auth");
      return;
    }
    if (!isPro) {
      setShowPremiumModal(true);
      return;
    }
    navigate("/colists/new");
  }, [currentUser, isPro, navigate]);

  const handleOpenReader = useCallback(
    (colist) => {
      setActiveColist(colist);
      const basePath = `/colists/${colist.slug || colist.id}`;
      // Dynamic routing: Push to /unpublished if it's a draft
      navigate(colist.isPublic ? basePath : `${basePath}/unpublished`);
    },
    [navigate],
  );

  const handleBack = useCallback(() => {
    // Deterministic Routing: Drafts always return to the operator's profile
    if (activeColist && !activeColist.isPublic) {
      navigate("/colists/profile");
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/colists");
    }

    // Defer state clearing slightly to allow smooth unmount animations
    setTimeout(() => setActiveColist(null), 50);
  }, [navigate, activeColist]);

  const handleEdit = useCallback((colist) => {
    setEditColistTarget(colist);
    setShowEditor(true);
    // Elevate UX: Update the URL to reflect the draft without unmounting the profile backdrop
    window.history.pushState(
      { modal: "editor" },
      "",
      `/colists/${colist.slug || colist.id}/unpublished/edit`,
    );
  }, []);

  // Architect Grade: Ensure browser back button elegantly closes the editor modal
  useEffect(() => {
    const handlePopState = () => {
      if (showEditor && !window.location.pathname.includes("/unpublished")) {
        setShowEditor(false);
        setEditColistTarget(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showEditor]);

  return (
    <>
      <Helmet>
        <title>
          {slug === "profile"
            ? "My Profile — Discotive Colists"
            : activeColist
              ? `${activeColist.title} — Discotive Colists`
              : "Discotive Colists | Knowledge Carousel"}
        </title>
        <meta
          name="description"
          content={
            activeColist?.description ||
            "Curated execution intelligence from top operators on Discotive."
          }
        />
        {activeColist?.slug && (
          <link
            rel="canonical"
            href={`https://discotive.in/colists/${activeColist.slug}`}
          />
        )}
      </Helmet>

      {slug === "profile" ? (
        <ColistsProfile onRead={handleOpenReader} onEdit={handleEdit} />
      ) : activeColist ? (
        <ColistReader
          colist={activeColist}
          onBack={handleBack}
          currentUser={currentUser}
          userData={userData}
          setShowBottomNav={setShowBottomNav}
        />
      ) : (
        <ColistsHome
          onOpenReader={handleOpenReader}
          currentUser={currentUser}
        />
      )}

      {/* Create FAB */}
      {!activeColist && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={{
            y: showBottomNav
              ? 0
              : typeof window !== "undefined" && window.innerWidth < 768
                ? 60
                : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          onClick={handleCreateClick}
          className="fixed right-5 md:right-10 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-10 w-14 h-14 md:w-[68px] md:h-[68px] rounded-full md:rounded-[24px] flex items-center justify-center shadow-2xl z-[90]"
          style={{
            background: "linear-gradient(135deg, #E8D5A3, #D4AF78)",
            color: "#000",
            boxShadow: "0 10px 40px rgba(191,162,100,0.3)",
          }}
        >
          <Plus strokeWidth={2.5} className="w-7 h-7 md:w-8 md:h-8" />
        </motion.button>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && isPro && (
          <ColistsEditor
            initialColist={editColistTarget}
            onClose={() => {
              setShowEditor(false);
              setEditColistTarget(null);
              if (slug === "new") {
                navigate("/colists");
              } else if (window.location.pathname.includes("/edit")) {
                // Intelligent cleanup: pop modal state or hard navigate to profile
                if (
                  window.history.state &&
                  window.history.state.modal === "editor"
                ) {
                  window.history.back();
                } else {
                  navigate("/colists/profile", { replace: true });
                }
              }
            }}
            userData={userData}
            currentUser={currentUser}
            onPublish={(newSlugStr) => {
              setShowEditor(false);
              // If it was an existing draft, newSlugStr might be "published".
              // We grab the actual slug from the current URL to ensure a clean redirect.
              const currentPath = window.location.pathname;
              let finalSlug = newSlugStr;

              if (newSlugStr === "published") {
                // Extract the true slug from /colists/the-actual-slug/unpublished
                const pathParts = currentPath.split("/");
                // e.g. ["", "colists", "my-slug-123456", "unpublished"]
                finalSlug = pathParts[2];
              }

              navigate(`/colists/${finalSlug}`);
            }}
            forkOf={null}
          />
        )}
      </AnimatePresence>

      {/* Fork Modal */}
      <AnimatePresence>
        {showForkModal && forkTarget && (
          <ForkModal
            colist={forkTarget}
            onClose={() => {
              setShowForkModal(false);
              setForkTarget(null);
            }}
            userData={userData}
            currentUser={currentUser}
            onForked={(s) => {
              setShowForkModal(false);
              setForkTarget(null);
              navigate(`/colists/${s}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* Premium Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <PremiumModal
            onClose={() => setShowPremiumModal(false)}
            navigate={navigate}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Colists;
