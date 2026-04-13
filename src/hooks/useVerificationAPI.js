/**
 * @fileoverview useVerificationAPI
 * MAANG-Grade API Hook for Neural Node Verification.
 * Strictly interfaces with the `submitNodeVerification` Cloud Function.
 */

import { useState, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase"; // Adjust path to your firebase init file

export const useVerificationAPI = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const { addToast, forceEvaluate } = useRoadmap();
  const functions = getFunctions(app);

  const submitPayload = useCallback(
    async (nodeId, mapId, payload) => {
      if (!nodeId || !payload) {
        addToast("Invalid submission payload.", "red");
        return null;
      }

      setIsVerifying(true);
      const verifyNode = httpsCallable(functions, "submitNodeVerification");

      try {
        // 1. Execute the secure backend call
        const response = await verifyNode({ nodeId, mapId, payload });
        const { status, penaltyMinutes, message } = response.data;

        // 2. Handle the Backend's Verdict
        switch (status) {
          case NODE_STATES.VERIFIED:
            addToast(message || "Payload verified successfully.", "green");
            break;
          case NODE_STATES.VERIFIED_GHOST:
            // Free tier success — UI plays it cool
            addToast("Payload verified. System propagating...", "green");
            break;
          case NODE_STATES.FAILED_BACKOFF:
            // Strict penalty applied
            addToast(
              `Verification failed. Lockout active for ${penaltyMinutes}m.`,
              "red",
            );
            break;
          default:
            addToast("Verification processed.", "grey");
        }

        // 3. Force the DAG Engine to recalculate the map based on the new DB state
        // (Assuming you have a Firestore real-time listener active that just updated the local nodes)
        forceEvaluate();

        return status;
      } catch (error) {
        console.error("[VERIFICATION_API_FAULT]", error);
        // Catch network errors, unauthenticated errors, or backend crashes
        addToast(error.message || "System error during verification.", "red");
        return null;
      } finally {
        setIsVerifying(false);
      }
    },
    [functions, addToast, forceEvaluate],
  );

  return { submitPayload, isVerifying };
};
