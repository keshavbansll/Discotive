/**
 * @fileoverview Discotive Onboarding Gate Hook
 * @module hooks/useOnboardingGate
 *
 * @description
 * Enforces the onboarding completion state before allowing users to interact
 * with critical platform mechanics (e.g., uploading assets, joining arenas).
 * Maintains system integrity by ensuring partial profiles cannot interact with the Ledger.
 */

import { useNavigate } from "react-router-dom";
import { useUserData } from "./useUserData";

export const useOnboardingGate = () => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();

  const requireOnboarding = (actionContext = "action") => {
    if (loading) return false; // Prevent race conditions during fetch

    if (userData && userData.onboardingComplete === false) {
      console.warn(
        `[System Gate] Execution blocked (${actionContext}): Profile onboarding incomplete.`,
      );

      // Tactically fallback to routing the user back to the onboarding flow
      // Note: If you have a toast engine implemented (e.g., react-hot-toast), fire an error toast here.
      navigate("/onboarding");

      return false;
    }

    return true; // Gate passed
  };

  return { requireOnboarding };
};
