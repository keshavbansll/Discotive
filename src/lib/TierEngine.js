/**
 * @fileoverview Discotive OS - Monetization & Limit Engine
 * @description Single source of truth for all tier-based restrictions.
 */

export const TIERS = Object.freeze({
  ESSENTIAL: "ESSENTIAL",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
});

export const TIER_LIMITS = Object.freeze({
  [TIERS.ESSENTIAL]: {
    maxNodes: 15,
    maxVaultAssets: 5,
    maxStorageBytes: 15 * 1024 * 1024, // 15MB
    canUseJournal: false,
    canXRayLeaderboard: false,
    hasProBadge: false,
  },
  [TIERS.PRO]: {
    maxNodes: Infinity,
    maxVaultAssets: 50,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    canUseJournal: true,
    canXRayLeaderboard: true,
    hasProBadge: true,
  },
  [TIERS.ENTERPRISE]: {
    maxNodes: Infinity,
    maxVaultAssets: Infinity,
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    canUseJournal: true,
    canXRayLeaderboard: true,
    hasProBadge: true,
  },
});

/**
 * Evaluates if a user's current tier satisfies the required feature limit.
 * @param {string} userTier - The user's current tier (e.g., "ESSENTIAL")
 * @param {string} featureKey - The limit key to check (e.g., "canUseJournal")
 * @returns {boolean}
 */
export const checkAccess = (userTier = TIERS.ESSENTIAL, featureKey) => {
  const normalizedTier = userTier.toUpperCase();
  const limits = TIER_LIMITS[normalizedTier] || TIER_LIMITS[TIERS.ESSENTIAL];

  if (typeof limits[featureKey] === "boolean") {
    return limits[featureKey];
  }
  return false;
};

/**
 * Evaluates if a user has hit a numerical hardware limit.
 */
export const checkLimit = (
  userTier = TIERS.ESSENTIAL,
  limitKey,
  currentValue,
) => {
  const normalizedTier = userTier.toUpperCase();
  const limits = TIER_LIMITS[normalizedTier] || TIER_LIMITS[TIERS.ESSENTIAL];

  return currentValue < limits[limitKey];
};
