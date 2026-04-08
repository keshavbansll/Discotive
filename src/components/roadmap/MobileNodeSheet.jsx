/**
 * @fileoverview AgenticExecutionEngine.jsx — The Core State Machine
 * @description
 * This is the brain of Discotive. Every node in the execution map has a
 * mathematically computed state driven by this engine.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";

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

export const VERIFICATION_TYPES = Object.freeze({
  HUMAN_PROOF: "HUMAN_PROOF",
  ADMIN_VAULT: "ADMIN_VAULT",
  LEARN_ID: "LEARN_ID",
  APP_WEBHOOK: "APP_WEBHOOK",
  AUTO_TIME: "AUTO_TIME",
  WATCH_VIDEO: "WATCH_VIDEO",
});

export const AgenticEngineContext = createContext(null);

export const useAgenticEngine = () => {
  const ctx = useContext(AgenticEngineContext);
  if (!ctx)
    throw new Error("useAgenticEngine must be inside <AgenticEngineProvider>");
  return ctx;
};

export const compileAgenticGraph = (
  rawNodes = [],
  rawEdges = [],
  serverTimeMs = Date.now(),
  userVault = [],
) => {
  const nodeMap = new Map(rawNodes.map((n) => [n.id, n]));
  const inDegree = new Map();
  const adjList = new Map();
  const revAdjList = new Map();
  const computedStates = new Map();

  for (const node of rawNodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
    revAdjList.set(node.id, []);
  }

  for (const edge of rawEdges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) continue;
    adjList.get(edge.source).push(edge.target);
    revAdjList.get(edge.target).push(edge.source);
    inDegree.set(edge.target, inDegree.get(edge.target) + 1);
  }

  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);
  const hydratedNodes = [];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const node = nodeMap.get(currentId);
    if (!node) continue;

    const sd = node.data?.stateData || {};
    const vc = node.data?.verificationContract || {};
    const logicType = node.data?.logicType || "AND";

    let finalState = NODE_STATES.LOCKED;
    let timeRemaining = null;
    let lockReason = null;
    let learnIdMet = true;

    if (vc.type === VERIFICATION_TYPES.LEARN_ID && vc.requiredLearnId) {
      const vaultMatch = userVault.find(
        (a) =>
          a.discotiveLearnId === vc.requiredLearnId && a.status === "VERIFIED",
      );
      if (!vaultMatch) {
        learnIdMet = false;
        finalState = NODE_STATES.LOCKED;
        lockReason = `Requires vault certificate: ${vc.requiredLearnId}`;
      }
    }

    if (learnIdMet) {
      if (sd.isVerifiedPublic || sd.status === "VERIFIED") {
        finalState = NODE_STATES.VERIFIED;
      } else if (sd.isVerifiedGhost || sd.status === "VERIFIED_GHOST") {
        const unlockMs = sd.ghostUnlockTimeMs || 0;
        if (serverTimeMs >= unlockMs) {
          finalState = NODE_STATES.VERIFIED;
        } else {
          finalState = NODE_STATES.VERIFIED_GHOST;
          timeRemaining = unlockMs - serverTimeMs;
        }
      } else if (sd.isVerifying || sd.status === "VERIFYING") {
        finalState = NODE_STATES.VERIFYING;
      } else {
        const parents = revAdjList.get(currentId) || [];

        if (vc.type === VERIFICATION_TYPES.AUTO_TIME) {
          const allParentsVerified = parents.every(
            (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
          );
          const anyParentVerified = parents.some(
            (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
          );
          const gateConditionMet =
            parents.length === 0
              ? true
              : logicType === "OR"
                ? anyParentVerified
                : allParentsVerified;

          if (gateConditionMet) {
            finalState = NODE_STATES.VERIFIED;
          } else {
            finalState = NODE_STATES.LOCKED;
            lockReason =
              logicType === "OR"
                ? "Waiting for any parent to complete"
                : "Waiting for all parents to complete";
          }
        } else {
          const allParentsVerified = parents.every(
            (pid) => computedStates.get(pid) === NODE_STATES.VERIFIED,
          );

          if (!allParentsVerified && parents.length > 0) {
            finalState = NODE_STATES.LOCKED;
            lockReason = "Awaiting upstream node completion";
          } else {
            if (sd.status === "FAILED_BACKOFF" && sd.penaltyExpiresAt) {
              const expireMs =
                typeof sd.penaltyExpiresAt?.toMillis === "function"
                  ? sd.penaltyExpiresAt.toMillis()
                  : Number(sd.penaltyExpiresAt);
              if (serverTimeMs < expireMs) {
                finalState = NODE_STATES.FAILED_BACKOFF;
                timeRemaining = expireMs - serverTimeMs;
                lockReason = "Verification failed. Backoff active.";
              } else {
                finalState = NODE_STATES.ACTIVE;
              }
            } else if (sd.startedAtMs) {
              const minTimeMs = (node.data?.minimumTimeMinutes || 0) * 60000;
              const elapsed = serverTimeMs - sd.startedAtMs;
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
      }
    }

    computedStates.set(currentId, finalState);
    hydratedNodes.push({
      ...node,
      data: {
        ...node.data,
        _computed: {
          state: finalState,
          timeRemaining,
          lockReason,
          learnIdMet,
          isInteractable: [
            NODE_STATES.ACTIVE,
            NODE_STATES.IN_PROGRESS,
            NODE_STATES.FAILED_BACKOFF,
          ].includes(finalState),
        },
      },
    });

    for (const neighborId of adjList.get(currentId) || []) {
      const newDeg = inDegree.get(neighborId) - 1;
      inDegree.set(neighborId, newDeg);
      if (newDeg === 0) queue.push(neighborId);
    }
  }

  for (const node of rawNodes) {
    if (!computedStates.has(node.id)) {
      hydratedNodes.push({
        ...node,
        data: {
          ...node.data,
          _computed: {
            state: NODE_STATES.CORRUPTED,
            lockReason: "CYCLE_DETECTED — dependency loop",
            isInteractable: false,
          },
        },
      });
    }
  }

  return hydratedNodes;
};

export const AgenticEngineProvider = ({
  uid,
  userVault = [],
  edges,
  setNodes,
  children,
}) => {
  const chronoTickRef = useRef(null);
  const lastEvaluationRef = useRef(0);
  const stateHashRef = useRef("");

  const forceEvaluate = useCallback(() => {
    setNodes((currentNodes) => {
      if (!currentNodes?.length) return currentNodes;
      const serverTimeMs = Date.now();
      const hydratedNodes = compileAgenticGraph(
        currentNodes,
        edges,
        serverTimeMs,
        userVault,
      );

      const newHash = hydratedNodes
        .map(
          (n) =>
            `${n.id}:${n.data?._computed?.state}:${Math.floor((n.data?._computed?.timeRemaining || 0) / 1000)}`,
        )
        .join("|");
      if (newHash === stateHashRef.current) return currentNodes;
      stateHashRef.current = newHash;
      lastEvaluationRef.current = serverTimeMs;

      const nodeStateMap = new Map(
        hydratedNodes.map((n) => [n.id, n.data._computed]),
      );

      return currentNodes.map((node) => {
        const computed = nodeStateMap.get(node.id);
        if (!computed) return node;

        const prev = node.data?._computed;
        if (
          prev?.state === computed.state &&
          Math.abs((prev?.timeRemaining || 0) - (computed.timeRemaining || 0)) <
            1000
        ) {
          return node;
        }

        return { ...node, data: { ...node.data, _computed: computed } };
      });
    });
  }, [edges, setNodes, userVault]);

  useEffect(() => {
    forceEvaluate();
  }, [edges, forceEvaluate]);
  useEffect(() => {
    forceEvaluate();
  }, [userVault, forceEvaluate]);

  useEffect(() => {
    chronoTickRef.current = setInterval(() => {
      forceEvaluate();
    }, 30000);
    return () => clearInterval(chronoTickRef.current);
  }, [forceEvaluate]);

  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const mapRef = doc(db, "users", uid, "execution_map", "current");
    const unsub = onSnapshot(
      mapRef,
      { includeMetadataChanges: false },
      (snap) => {
        if (snap.exists() && !snap.metadata.hasPendingWrites) {
          setMapVersion((v) => v + 1);
          forceEvaluate();
        }
      },
    );
    return () => unsub();
  }, [uid, forceEvaluate]);

  const value = {
    forceEvaluate,
    mapVersion,
    compileAgenticGraph,
    NODE_STATES,
    VERIFICATION_TYPES,
  };
  return (
    <AgenticEngineContext.Provider value={value}>
      {children}
    </AgenticEngineContext.Provider>
  );
};
