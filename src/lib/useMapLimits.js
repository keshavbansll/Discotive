/**
 * @fileoverview useMapLimits.js
 *
 * The single source of truth for all roadmap generation business logic.
 * Reads from Firestore ONCE (no onSnapshot). All cooldown math is local.
 *
 * Returns:
 *   limits           — the MAP_LIMITS bucket for the user's tier
 *   mapMeta          — persisted metadata from Firestore (timestamps, saved answers)
 *   metaLoading      — true while fetching mapMeta
 *
 *   canGenerate      — boolean: user has no map yet
 *   canRegenerate    — boolean: cooldown elapsed since lastRegeneratedAt (or generatedAt)
 *   canExpand        — boolean: cooldown elapsed since lastExpandedAt (or generatedAt)
 *
 *   regenCooldownLeft  — days remaining until regen is unlocked (0 = available)
 *   expandCooldownLeft — days remaining until expand is unlocked
 *
 *   autoNodeCount    — count of AI-generated capped nodes in current map
 *   manualNodeCount  — count of manually-added capped nodes in current map
 *   cappedNodeCount  — autoNodeCount + manualNodeCount
 *   canAddManual     — boolean: manualNodeCount < limits.manual_nodes
 *
 *   saveMapMeta      — async fn to persist updated metadata to Firestore
 *   refreshMeta      — async fn to re-fetch mapMeta from Firestore
 */

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns days elapsed since an ISO timestamp. */
const daysSince = (isoDate) => {
  if (!isoDate) return Infinity;
  const diff = Date.now() - new Date(isoDate).getTime();
  return diff / (1000 * 60 * 60 * 24);
};

/** Returns days remaining in a cooldown (0 = available). */
const daysLeft = (isoDate, cooldownDays) => {
  if (!isoDate) return 0;
  const elapsed = daysSince(isoDate);
  const remaining = cooldownDays - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
};

/** Checks if a node type counts toward the auto/manual cap. */
const isCapped = (nodeType) =>
  CAPPED_NODE_TYPES.has(nodeType) && nodeType !== EXPAND_NODE_TYPE;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT MAP META STRUCTURE
// Stored at: users/{uid}/execution_map/current  (merged into the map doc)
// Separate sub-field: mapMeta: { ... }
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_MAP_META = {
  // ISO timestamps
  generatedAt: null, // first time map was AI-generated
  lastRegeneratedAt: null, // last full regeneration
  lastExpandedAt: null, // last expansion/continuation

  // Saved calibration answers (used for "use existing info" during regen)
  // Shape: { q0: "answer text", q1: "option A", q2: "option B" }
  calibrationAnswers: {},

  // Range of the current map (ISO date strings)
  mapRange: {
    from: null, // start of the 30-day window
    to: null, // end of the 30-day window
  },

  // Which nodes were AI-generated (set of node IDs)
  // This lets us know which are "manual" when the user adds more.
  aiGeneratedNodeIds: [],

  // Counter for analytics / future use
  expansionCount: 0,
  regenerationCount: 0,

  // Saved expansion answers (ring buffer of last 3 expansions)
  expansionHistory: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useMapLimits = ({ uid, tier, role, nodes = [] }) => {
  const isAdmin = String(tier).toUpperCase() === "ADMIN" || role === "admin";
  const limits = getMapLimits(tier);

  const [mapMeta, setMapMeta] = useState(DEFAULT_MAP_META);
  const [metaLoading, setMetaLoading] = useState(true);

  // ── Fetch mapMeta from Firestore ────────────────────────────────────────────
  const fetchMeta = useCallback(async () => {
    if (!uid) {
      setMetaLoading(false);
      return;
    }
    try {
      const snap = await getDoc(
        doc(db, "users", uid, "execution_map", "current"),
      );
      if (snap.exists()) {
        const data = snap.data();
        setMapMeta({ ...DEFAULT_MAP_META, ...(data.mapMeta || {}) });
      } else {
        setMapMeta(DEFAULT_MAP_META);
      }
    } catch (err) {
      console.warn("[useMapLimits] fetchMeta failed:", err);
    } finally {
      setMetaLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  // ── Persist mapMeta back to Firestore ───────────────────────────────────────
  const saveMapMeta = useCallback(
    async (partialMeta) => {
      if (!uid) return;
      const merged = { ...mapMeta, ...partialMeta };
      setMapMeta(merged); // optimistic
      try {
        const ref = doc(db, "users", uid, "execution_map", "current");
        await updateDoc(ref, { mapMeta: merged }).catch(async () => {
          // doc may not exist yet
          await setDoc(ref, { mapMeta: merged }, { merge: true });
        });
      } catch (err) {
        console.error("[useMapLimits] saveMapMeta failed:", err);
      }
    },
    [uid, mapMeta],
  );

  const refreshMeta = fetchMeta;

  // ── Node counting ────────────────────────────────────────────────────────────
  // aiGeneratedNodeIds is the set of node IDs that were created by AI.
  // Everything else in CAPPED_NODE_TYPES that was added later = manual.
  const aiIdSet = new Set(mapMeta.aiGeneratedNodeIds || []);

  let autoNodeCount = 0;
  let manualNodeCount = 0;

  for (const node of nodes) {
    if (!isCapped(node.type)) continue;
    if (aiIdSet.has(node.id)) {
      autoNodeCount++;
    } else {
      manualNodeCount++;
    }
  }

  const cappedNodeCount = autoNodeCount + manualNodeCount;
  const canAddManual = manualNodeCount < limits.manual_nodes;

  // ── Cooldown calculations ───────────────────────────────────────────────────

  // Regeneration: measured from lastRegeneratedAt, falling back to generatedAt
  const regenBaseline = mapMeta.lastRegeneratedAt || mapMeta.generatedAt;
  const regenLeft = isAdmin
    ? 0
    : daysLeft(regenBaseline, limits.regen_cooldown_days);
  const canRegenerate = (isAdmin || regenLeft === 0) && !!mapMeta.generatedAt;

  // Expansion: measured from lastExpandedAt, falling back to generatedAt
  const expandBaseline = mapMeta.lastExpandedAt || mapMeta.generatedAt;
  const expandLeft = isAdmin
    ? 0
    : daysLeft(expandBaseline, limits.expand_cooldown_days);
  const canExpand = (isAdmin || expandLeft === 0) && !!mapMeta.generatedAt;

  // Can generate: user has never generated a map
  const canGenerate = !mapMeta.generatedAt;

  // ── Map date range helpers ──────────────────────────────────────────────────

  /**
   * Returns { from: Date, to: Date } for a new 30-day generation window
   * starting from today (or a given base date).
   */
  const getNextMapRange = (baseDate = new Date()) => {
    const from = new Date(baseDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + limits.map_duration_days);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  };

  /**
   * Given the current nodes, returns nodes that should NOT be affected
   * by a regeneration (completed, in-progress with tasks done, has linked assets/videos).
   * These are preserved during map rebuild.
   */
  const getPreservedNodes = useCallback(
    (currentNodes) =>
      currentNodes.filter((node) => {
        if (node.type === EXPAND_NODE_TYPE) return false; // never preserve virtual nodes
        if (UNCAPPED_NODE_TYPES.has(node.type)) {
          // Preserve asset/video widgets only if they have a linked payload
          return !!(node.data?.assetId || node.data?.youtubeId);
        }
        if (!isCapped(node.type)) return false;

        const d = node.data || {};
        // Preserve if: completed, has linked assets, or has completed tasks
        const hasCompletedTasks =
          (d.tasks || []).some((t) => t.completed) &&
          (d.tasks || []).filter((t) => t.completed).length > 0;

        return (
          d.isCompleted ||
          hasCompletedTasks ||
          (d.linkedAssets || []).length > 0
        );
      }),
    [],
  );

  return {
    // Limits config
    limits,

    // Raw meta
    mapMeta,
    metaLoading,

    // Eligibility flags
    canGenerate,
    canRegenerate,
    canExpand,

    // Cooldown days remaining (0 = available now)
    regenCooldownLeft: regenLeft,
    expandCooldownLeft: expandLeft,

    // Node counts
    autoNodeCount,
    manualNodeCount,
    cappedNodeCount,
    canAddManual,

    // Helpers
    getNextMapRange,
    getPreservedNodes,

    // Persistence
    saveMapMeta,
    refreshMeta,
  };
};
