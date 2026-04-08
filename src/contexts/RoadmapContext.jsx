/**
 * @fileoverview Discotive Roadmap — Agentic Execution Engine Bridge
 * * Replaces lazy setInterval polling with the event-driven useAgenticScheduler.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAgenticScheduler } from "../hooks/useAgenticScheduler.js";

export const RoadmapContext = createContext(null);

export const useRoadmap = () => {
  const ctx = useContext(RoadmapContext);
  if (!ctx) {
    throw new Error("useRoadmap must be used inside <RoadmapContext.Provider>");
  }
  return ctx;
};

/**
 * @hook useNeuralEngine
 * MAANG-Grade DAG Evaluation Hook.
 * Placed in the parent component that owns the React Flow `nodes` and `edges` state.
 *
 * @param {Array} nodes - The raw React Flow nodes array
 * @param {Array} edges - The raw React Flow edges array
 * @param {Function} setNodes - The React state setter for nodes
 * @param {Array} userVault - The user's verified assets
 * @returns {Object} { forceEvaluate, isProcessing }
 */
export const useNeuralEngine = (nodes, edges, setNodes, userVault = []) => {
  const { triggerEvaluation, isProcessing } = useAgenticScheduler(
    nodes,
    edges,
    setNodes,
    userVault,
  );

  return {
    forceEvaluate: triggerEvaluation,
    isProcessing,
  };
};
