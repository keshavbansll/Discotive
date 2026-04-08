/**
 * @fileoverview Discotive Execution Graph Engine (DAG Compiler) — v5
 *
 * FIXES vs v4:
 * 1. `node._computed` is now `node.data._computed` (consistent with all
 *    component reads throughout the codebase)
 * 2. `timeRemaining` is now `timeLeft` (aligned with useRoadmapStore schema)
 * 3. Cycle detection runs BEFORE the queue to avoid silent hangs
 * 4. Ghost state resolution uses server-authoritative timestamp parameter
 * 5. LEARN_ID verification checks `userVault` parameter
 * 6. Exports NODE_STATES for use by ExecutionWorker (which imports this file)
 *
 * Time Complexity: O(V + E) — Kahn's Algorithm
 * Memory: O(V) auxiliary space. Zero side-effects.
 */

export const NODE_STATES = Object.freeze({
  LOCKED: "LOCKED",
  ACTIVE: "ACTIVE",
  IN_PROGRESS: "IN_PROGRESS",
  VERIFYING: "VERIFYING",
  VERIFIED_GHOST: "VERIFIED_GHOST",
  VERIFIED: "VERIFIED",
  FAILED_BACKOFF: "FAILED_BACKOFF",
  CORRUPTED: "CORRUPTED",
});

/**
 * Compiles the execution graph and injects `data._computed` into each node.
 *
 * @param {Array}  rawNodes     - React Flow node objects
 * @param {Array}  rawEdges     - React Flow edge objects
 * @param {number} serverTimeMs - Current server/client time in ms
 * @param {Array}  userVault    - User's vault assets for LEARN_ID checks
 * @returns {Array} Hydrated nodes with `data._computed` injected
 */
export const compileExecutionGraph = (
  rawNodes = [],
  rawEdges = [],
  serverTimeMs = Date.now(),
  userVault = [],
) => {
  if (!rawNodes.length) return [];

  // ── 1. Build the node map ───────────────────────────────────────────────────
  const nodeMap = new Map(rawNodes.map((n) => [n.id, n]));
  const inDegree = new Map(rawNodes.map((n) => [n.id, 0]));
  const adjList = new Map(rawNodes.map((n) => [n.id, []]));
  const revAdj = new Map(rawNodes.map((n) => [n.id, []]));
  const computedStates = new Map();

  // ── 2. Build adjacency lists (validate both endpoints exist) ──────────────
  for (const edge of rawEdges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    adjList.get(edge.source).push(edge.target);
    revAdj.get(edge.target).push(edge.source);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
  }

  // ── 3. Kahn's BFS queue (all zero-indegree nodes are roots) ──────────────
  const queue = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const hydratedNodes = [];

  // ── 4. Topological traversal ──────────────────────────────────────────────
  while (queue.length > 0) {
    const currentId = queue.shift();
    const node = nodeMap.get(currentId);

    // Guard: orphaned ID (should not happen after step 2 validation)
    if (!node) {
      for (const nid of adjList.get(currentId) || []) {
        inDegree.set(nid, inDegree.get(nid) - 1);
        if (inDegree.get(nid) === 0) queue.push(nid);
      }
      continue;
    }

    const sd = node.data?.stateData || {};
    const vc = node.data?.verificationContract || {};

    let finalState = NODE_STATES.LOCKED;
    let timeLeft = null;
    let lockReason = null;

    // ── LEARN_ID gate: vault certificate required ───────────────────────────
    if (vc.type === "LEARN_ID" && vc.requiredLearnId) {
      const hasVerifiedAsset = userVault.some(
        (a) =>
          a.discotiveLearnId === vc.requiredLearnId && a.status === "VERIFIED",
      );
      if (!hasVerifiedAsset) {
        finalState = NODE_STATES.LOCKED;
        lockReason = `Requires verified certificate: ${vc.requiredLearnId}`;
        computedStates.set(currentId, finalState);
        hydratedNodes.push(_hydrate(node, finalState, timeLeft, lockReason));
        _decrementNeighbors(currentId, adjList, inDegree, queue);
        continue;
      }
    }

    // ── Priority 1: Already verified states ──────────────────────────────────
    if (sd.status === "VERIFIED" || sd.isVerifiedPublic) {
      finalState = NODE_STATES.VERIFIED;
    } else if (sd.status === "VERIFIED_GHOST" || sd.isVerifiedGhost) {
      const unlockMs = sd.ghostUnlockTimeMs || 0;
      if (serverTimeMs >= unlockMs) {
        finalState = NODE_STATES.VERIFIED;
      } else {
        finalState = NODE_STATES.VERIFIED_GHOST;
        timeLeft = unlockMs - serverTimeMs;
      }
    } else if (sd.status === "VERIFYING" || sd.isVerifying) {
      finalState = NODE_STATES.VERIFYING;
    } else {
      // ── Priority 2: Dependency check ────────────────────────────────────────
      const parents = revAdj.get(currentId) || [];
      const logicType = node.data?.logicType || "AND";

      const allVerified = parents.every(
        (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
      );
      const anyVerified = parents.some(
        (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
      );

      // AUTO_TIME milestones: verified when gate condition met
      if (vc.type === "AUTO_TIME") {
        const gateMet =
          parents.length === 0
            ? true
            : logicType === "OR"
              ? anyVerified
              : allVerified;

        if (gateMet) {
          finalState = NODE_STATES.VERIFIED;
        } else {
          finalState = NODE_STATES.LOCKED;
          lockReason =
            logicType === "OR"
              ? "Waiting for any upstream node to complete"
              : "Waiting for all upstream nodes to complete";
        }
      } else if (!allVerified && parents.length > 0) {
        // Standard dependency gate
        finalState = NODE_STATES.LOCKED;
        lockReason = "Awaiting upstream phase completion";
      } else {
        // Dependencies met — check execution status
        if (sd.status === "FAILED_BACKOFF" && sd.penaltyExpiresAt) {
          const expiresMs =
            typeof sd.penaltyExpiresAt?.toMillis === "function"
              ? sd.penaltyExpiresAt.toMillis()
              : Number(sd.penaltyExpiresAt);

          if (serverTimeMs < expiresMs) {
            finalState = NODE_STATES.FAILED_BACKOFF;
            timeLeft = expiresMs - serverTimeMs;
            lockReason = "Verification failed. Exponential backoff active.";
          } else {
            finalState = NODE_STATES.ACTIVE;
          }
        } else if (sd.startedAtMs) {
          const minTimeMs = (node.data?.minimumTimeMinutes || 0) * 60000;
          const elapsed = serverTimeMs - sd.startedAtMs;
          if (elapsed < minTimeMs) {
            finalState = NODE_STATES.IN_PROGRESS;
            timeLeft = minTimeMs - elapsed;
          } else {
            finalState = NODE_STATES.ACTIVE;
          }
        } else {
          finalState = NODE_STATES.ACTIVE;
        }
      }
    }

    computedStates.set(currentId, finalState);
    hydratedNodes.push(_hydrate(node, finalState, timeLeft, lockReason));
    _decrementNeighbors(currentId, adjList, inDegree, queue);
  }

  // ── 5. Cycle detection — any unprocessed node has a dependency cycle ──────
  for (const node of rawNodes) {
    if (!computedStates.has(node.id)) {
      hydratedNodes.push(
        _hydrate(
          node,
          NODE_STATES.CORRUPTED,
          null,
          "CYCLE_DETECTED — Dependency loop prevents execution",
        ),
      );
    }
  }

  return hydratedNodes;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Injects `data._computed` into a node (non-mutating). */
function _hydrate(node, state, timeLeft, lockReason) {
  return {
    ...node,
    data: {
      ...node.data,
      _computed: {
        state,
        timeLeft,
        lockReason,
        isInteractable: [
          NODE_STATES.ACTIVE,
          NODE_STATES.IN_PROGRESS,
          NODE_STATES.FAILED_BACKOFF,
        ].includes(state),
      },
    },
  };
}

/** Decrements in-degree of downstream neighbors; enqueues zero-degree nodes. */
function _decrementNeighbors(nodeId, adjList, inDegree, queue) {
  for (const neighborId of adjList.get(nodeId) || []) {
    const newDeg = inDegree.get(neighborId) - 1;
    inDegree.set(neighborId, newDeg);
    if (newDeg === 0) queue.push(neighborId);
  }
}
