/**
 * @fileoverview Discotive Execution Worker (The Agentic Brain)
 * * Off-thread DAG compilation to prevent UI micro-stutters.
 * * Handles O(V+E) graph traversal and state transitions.
 */

import { compileExecutionGraph } from "./graphEngine.js";

self.onmessage = (e) => {
  const { nodes, edges, serverTimeMs, userVault } = e.data;

  try {
    // 1. Run the pure DAG mathematical engine
    const hydratedNodes = compileExecutionGraph(
      nodes,
      edges,
      serverTimeMs,
      userVault,
    );

    // 2. Calculate the NEXT critical event time (Optimization for useAgenticScheduler)
    // We find the smallest timeRemaining > 0 to tell the main thread when to wake up.
    let nextEventMs = null;
    hydratedNodes.forEach((node) => {
      const tr = node._computed?.timeRemaining;
      if (tr && tr > 0) {
        const eventTime = serverTimeMs + tr;
        if (!nextEventMs || eventTime < nextEventMs) {
          nextEventMs = eventTime;
        }
      }
    });

    // 3. Return the hydrated graph and the next event timestamp
    self.postMessage({
      success: true,
      nodes: hydratedNodes,
      nextEventMs,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    });
  }
};
