/**
 * @fileoverview Discotive Agentic Scheduler (The Nervous System)
 * * Replaces lazy setInterval polling with targeted setTimeout wake-ups.
 * * Manages the ExecutionWorker lifecycle.
 */

import { useState, useEffect, useCallback, useRef } from "react";
// 1. IMPORT THE WORKER EXPLICITLY WITH ?worker SUFFIX

export const useAgenticScheduler = (nodes, edges, setNodes, userVault = []) => {
  const workerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Initialize the Worker
  useEffect(() => {
    // 2. INSTANTIATE THE IMPORTED WORKER directly
    // (Vite handles the module bundling automatically under the hood)
    workerRef.current = new ExecutionWorker();

    workerRef.current.onmessage = (e) => {
      const { success, nodes: hydratedNodes, nextEventMs, error } = e.data;
      setIsProcessing(false);

      if (success) {
        // 2. Diff and Apply Hydrated Nodes
        setNodes((currentNodes) => {
          let requiresUpdate = false;
          const nextNodes = currentNodes.map((currentNode) => {
            const match = hydratedNodes.find((n) => n.id === currentNode.id);
            if (!match) return currentNode;

            const currentComputed = currentNode.data?._computed || {};
            const nextComputed = match._computed || {};

            // Only update if the state changed or timeRemaining drift is significant
            if (
              currentComputed.state !== nextComputed.state ||
              Math.abs(
                (currentComputed.timeRemaining || 0) -
                  (nextComputed.timeRemaining || 0),
              ) > 1000
            ) {
              requiresUpdate = true;
              return {
                ...currentNode,
                data: { ...currentNode.data, _computed: nextComputed },
              };
            }
            return currentNode;
          });
          return requiresUpdate ? nextNodes : currentNodes;
        });

        // 3. Schedule the NEXT wake-up
        if (nextEventMs) {
          const delay = Math.max(0, nextEventMs - Date.now());
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(
            () => triggerEvaluation(),
            delay + 100,
          ); // 100ms buffer
        }
      } else {
        console.error("[AgenticWorker Error]:", error);
      }
    };

    return () => {
      workerRef.current.terminate();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [setNodes]);

  // 4. The Evaluation Trigger
  const triggerEvaluation = useCallback(() => {
    if (!workerRef.current || isProcessing) return;
    setIsProcessing(true);
    workerRef.current.postMessage({
      nodes,
      edges,
      serverTimeMs: Date.now(),
      userVault,
    });
  }, [nodes, edges, userVault, isProcessing]);

  // 5. Reactive Listeners
  useEffect(() => {
    triggerEvaluation();
  }, [edges, userVault, triggerEvaluation]);

  return { triggerEvaluation, isProcessing };
};
