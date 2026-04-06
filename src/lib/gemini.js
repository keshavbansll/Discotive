/**
 * @fileoverview gemini.js v3.1 — SECURE AI GATEWAY ROUTER
 * All prompt construction and API key management has been moved to Cloud Functions.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const aiGateway = httpsCallable(functions, "discotiveAIGateway");

export const generateCalibrationQuestions = async (userData) => {
  try {
    const res = await aiGateway({ action: "CALIBRATE", payload: { userData } });
    return res.data;
  } catch (err) {
    console.error("[Gemini] Calibration questions failed:", err);
    throw new Error("Calibration failed.");
  }
};

export const generateExecutionMap = async (
  userData,
  qaAnswers,
  subscriptionTier = "free",
  learnInventory = { videos: [], certificates: [] },
  mapRange = null,
) => {
  try {
    const res = await aiGateway({
      action: "GENERATE_MAP",
      payload: {
        userData,
        qaAnswers,
        subscriptionTier,
        learnInventory,
        mapRange,
      },
    });
    return res.data;
  } catch (err) {
    console.error("[Gemini] Map generation failed:", err);
    throw new Error("Execution Map Synthesis failed.");
  }
};

export const generateExpansionQuestions = async (
  userData,
  existingNodes = [],
) => {
  try {
    const res = await aiGateway({
      action: "EXPANSION_QUESTIONS",
      payload: { userData, existingNodes },
    });
    return res.data;
  } catch (err) {
    console.error("[Gemini] Expansion questions failed:", err);
    throw new Error("Expansion question generation failed.");
  }
};

export const expandExecutionMap = async (payloadArgs) => {
  try {
    const res = await aiGateway({
      action: "EXPAND",
      payload: payloadArgs,
    });
    return res.data;
  } catch (err) {
    console.error("[Gemini] Map expansion failed:", err);
    throw new Error("Map expansion failed.");
  }
};

export const regenerateExecutionMap = async (payloadArgs) => {
  try {
    const res = await aiGateway({
      action: "REGENERATE",
      payload: payloadArgs,
    });
    return res.data;
  } catch (err) {
    console.error("[Gemini] Map regeneration failed:", err);
    throw new Error("Map regeneration failed.");
  }
};
