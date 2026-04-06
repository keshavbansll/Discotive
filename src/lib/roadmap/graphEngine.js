/**
 * @fileoverview Discotive Execution Graph Engine (DAG Compiler)
 * * MAANG-Grade pure functional state evaluator.
 * Traverses the roadmap graph and computes the exact physical and temporal state
 * of every node (Locked, Active, Verifying, Ghost, Backoff, Verified).
 * * Time Complexity: O(V + E) using Kahn's Algorithm / BFS topology traversal.
 * Memory: O(V) auxiliary space. No side-effects.
 */

export const NODE_STATES = {
  LOCKED: "LOCKED", // Dependencies not met
  ACTIVE: "ACTIVE", // Ready to begin
  IN_PROGRESS: "IN_PROGRESS", // User clicked 'Begin', timer running
  VERIFYING: "VERIFYING", // Payload sent to queue/AI
  VERIFIED_GHOST: "VERIFIED_GHOST", // Free tier 24h artificial delay
  VERIFIED: "VERIFIED", // Fully unlocked
  FAILED_BACKOFF: "FAILED_BACKOFF", // Exponential backoff penalty active
  CORRUPTED: "CORRUPTED", // Node data is missing/invalid
};

/**
 * Main Compiler Function
 */
export const compileExecutionGraph = (
  rawNodes = [],
  rawEdges = [],
  serverTimeMs = Date.now(),
) => {
  const hydratedNodes = [];
  const computedStates = new Map();

  // 1. Build the Node Map to guarantee node existence
  const nodeMap = new Map(rawNodes.map((n) => [n.id, n]));
  const inDegree = new Map();
  const adjList = new Map();

  // 2. Initialize degrees ONLY for validated nodes (protects against ghost nodes)
  for (const node of rawNodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }

  // 3. Build Adjacency List (Sanitize Ghost Edges)
  for (const edge of rawEdges) {
    // SECURITY FIX: Only wire edges if BOTH source and target actually exist in the nodeMap
    if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
      adjList.get(edge.source).push(edge.target);
      inDegree.set(edge.target, inDegree.get(edge.target) + 1);
    }
  }

  // 4. Initialize Queue with all InDegree=0 nodes (Includes valid orphans)
  const queue = [];
  for (const [id, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(id);
  }

  // 5. Kahn's Topological Traversal
  while (queue.length > 0) {
    const currentId = queue.shift();
    const node = nodeMap.get(currentId);

    // Failsafe: Should never hit due to step 3, but ensures traversal doesn't halt
    if (!node) {
      for (const neighborId of adjList.get(currentId) || []) {
        const newDegree = inDegree.get(neighborId) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) queue.push(neighborId);
      }
      continue;
    }

    // --- State Computation ---
    const dbState = node.data?.stateData || {};
    let finalState = NODE_STATES.LOCKED;
    let timeRemaining = null;
    let lockReason = null;

    if (dbState.isVerifiedPublic || dbState.status === "VERIFIED") {
      finalState = NODE_STATES.VERIFIED;
    } else if (dbState.isVerifiedGhost || dbState.status === "VERIFIED_GHOST") {
      const unlockMs = dbState.ghostUnlockTimeMs || 0;
      if (serverTimeMs >= unlockMs) {
        finalState = NODE_STATES.VERIFIED;
      } else {
        finalState = NODE_STATES.VERIFIED_GHOST;
        timeRemaining = unlockMs - serverTimeMs;
      }
    } else if (dbState.isVerifying || dbState.status === "VERIFYING") {
      finalState = NODE_STATES.VERIFYING;
    } else {
      // It is not verified. Can it be active? Check dependencies.
      // A node is active if ALL its parents are VERIFIED
      const parents = rawEdges
        .filter((e) => e.target === currentId)
        .map((e) => e.source);

      const allParentsVerified = parents.every(
        (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
      );

      if (!allParentsVerified && parents.length > 0) {
        finalState = NODE_STATES.LOCKED;
        lockReason = "Awaiting previous phase completion.";
      } else {
        // Dependencies met (or it's an orphan/root node). Check execution status.
        if (dbState.status === "FAILED_BACKOFF" && dbState.penaltyExpiresAt) {
          const expireMs =
            typeof dbState.penaltyExpiresAt.toMillis === "function"
              ? dbState.penaltyExpiresAt.toMillis()
              : dbState.penaltyExpiresAt;

          if (serverTimeMs < expireMs) {
            finalState = NODE_STATES.FAILED_BACKOFF;
            timeRemaining = expireMs - serverTimeMs;
            lockReason = "Verification failed. Exponential backoff active.";
          } else {
            finalState = NODE_STATES.ACTIVE;
          }
        } else if (dbState.startedAtMs) {
          const minTimeMs = (node.data?.minimumTimeMinutes || 0) * 60000;
          const elapsed = serverTimeMs - dbState.startedAtMs;
          if (elapsed < minTimeMs) {
            finalState = NODE_STATES.IN_PROGRESS;
            timeRemaining = minTimeMs - elapsed;
          } else {
            finalState = NODE_STATES.ACTIVE;
          }
        } else {
          finalState = NODE_STATES.ACTIVE;
        }
      }
    }

    computedStates.set(currentId, finalState);
    hydratedNodes.push({
      ...node,
      _computed: {
        state: finalState,
        timeRemaining,
        lockReason,
        isInteractable: [
          NODE_STATES.ACTIVE,
          NODE_STATES.IN_PROGRESS,
          NODE_STATES.FAILED_BACKOFF,
        ].includes(finalState),
      },
    });

    // Decrement in-degree for neighbors and enqueue if they become ready
    for (const neighborId of adjList.get(currentId) || []) {
      const newDegree = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newDegree);
      if (newDegree === 0) queue.push(neighborId);
    }
  }

  // 6. Cycle & Corruption Detection
  // Any nodes not processed by Kahn's algorithm fall here.
  for (const node of rawNodes) {
    if (!computedStates.has(node.id)) {
      hydratedNodes.push({
        ...node,
        _computed: {
          state: NODE_STATES.LOCKED,
          lockReason:
            "CYCLE_DETECTED - Graph dependency loop prevented execution.",
          isInteractable: false,
        },
      });
    }
  }

  return hydratedNodes;
};
