/**
 * @fileoverview Discotive Roadmap — Node Action Context
 *
 * Replaces every window.dispatchEvent / window.addEventListener pattern
 * in the original file. Nodes that need to trigger parent actions now
 * consume this context instead of polluting the global event bus.
 *
 * Actions provided:
 * - openExplorerModal(nodeId, defaultTab, requiredLearnId) → Unified modal for Vault & Video Hubs
 * - openVaultModal(nodeId, mode?)      → Legacy alias
 * - openVideoModal(nodeId)             → Legacy alias
 * - markVideoWatched(nodeId)           → replaces VIDEO_WATCHED event
 * - toggleNodeCollapse(nodeId, state)  → replaces NODE_COLLAPSE_TOGGLE event
 * - setActiveEditNodeId(id)            → direct state lift
 * - addToast(msg, type)                → direct state lift
 * - addPendingScore(delta)             → direct state lift
 */

import React, { createContext, useContext } from "react";

export const RoadmapContext = createContext(null);

export const useRoadmap = () => {
  const ctx = useContext(RoadmapContext);
  if (!ctx)
    throw new Error("useRoadmap must be used inside <RoadmapContext.Provider>");
  return ctx;
};
