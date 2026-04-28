/**
 * @fileoverview gemini.js v3.2 — SECURE AI GATEWAY ROUTER
 * Map generation deprecated. Focus strictly on Calibration & Grace AI.
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

const aiGateway = httpsCallable(functions, "discotiveAIGateway");

export const generateCalibrationQuestions = async (userData) => {
  try {
    const res = await aiGateway({ action: "CALIBRATE", payload: { userData } });
    return res.data;
  } catch (err) {
    console.error("[Grace AI] Calibration questions failed:", err);
    throw new Error("Calibration failed.");
  }
};

// Grace AI Context/Chat hooks can be added here as needed
