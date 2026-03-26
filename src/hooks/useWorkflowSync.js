/**
 * @fileoverview Workflow Synchronization Engine
 * @module hooks/useWorkflowSync
 * @description Handles bi-directional sync between React Flow and Firestore.
 * Implements strict initialization gates to prevent overwrite race conditions
 * and ruthless serialization to prevent Firestore schema rejection.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
// Assuming standard firebase imports are available in your project
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

const SAVE_DEBOUNCE_MS = 3000;

/**
 * Strips all ReactFlow internal ephemeral state (circular refs, measured dims)
 * and sanitizes all string inputs to prevent XSS.
 */
const sanitizeForCloud = (nodes, edges) => {
  const cleanNodes = nodes.map((n) => {
    // Deep clone data to avoid mutating React state
    const cleanData = { ...n.data };

    // Purify all string values in the data payload
    Object.keys(cleanData).forEach((key) => {
      if (typeof cleanData[key] === "string") {
        cleanData[key] = DOMPurify.sanitize(cleanData[key]);
      }
    });

    return {
      id: n.id,
      type: n.type,
      position: { x: n.position.x, y: n.position.y },
      data: cleanData,
    };
  });

  const cleanEdges = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle || null,
    targetHandle: e.targetHandle || null,
    animated: !!e.animated,
  }));

  return { nodes: cleanNodes, edges: cleanEdges };
};

export const useWorkflowSync = (workflowId, userId) => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | error

  const timeoutRef = useRef(null);
  const isFirstRender = useRef(true);

  // 1. Initial Load (The Gatekeeper)
  useEffect(() => {
    if (!workflowId || !userId) return;

    const loadWorkflow = async () => {
      try {
        const ref = doc(db, `users/${userId}/workflows`, workflowId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
        }
        setIsInitialized(true);
      } catch (error) {
        console.error("[WorkflowSync] Initialization failed:", error);
        setSyncState("error");
      }
    };

    loadWorkflow();
  }, [workflowId, userId]);

  // 2. Debounced Cloud Save
  const persistToCloud = useCallback(
    async (currentNodes, currentEdges) => {
      if (!isInitialized || !workflowId || !userId) return;

      setSyncState("syncing");

      try {
        const { nodes: safeNodes, edges: safeEdges } = sanitizeForCloud(
          currentNodes,
          currentEdges,
        );
        const batch = writeBatch(db);
        const ref = doc(db, `users/${userId}/workflows`, workflowId);

        batch.set(
          ref,
          {
            nodes: safeNodes,
            edges: safeEdges,
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        await batch.commit();
        setSyncState("idle");
      } catch (error) {
        console.error("[WorkflowSync] Cloud persistence failed:", error);
        setSyncState("error");
      }
    },
    [isInitialized, workflowId, userId],
  );

  // 3. Mutation Observer
  useEffect(() => {
    // Prevent save on initial mount/load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Prevent saving if we haven't loaded cloud data yet
    if (!isInitialized) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      persistToCloud(nodes, edges);
    }, SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutRef.current);
  }, [nodes, edges, isInitialized, persistToCloud]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    isInitialized,
    syncState,
  };
};
