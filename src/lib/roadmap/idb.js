/**
 * @fileoverview Discotive Roadmap — IndexedDB Layer (Singleton)
 *
 * Architecture Upgrades:
 * - Module-scoped DB Promise (prevents connection thrashing)
 * - Cloud vs. Local timestamp synchronization for conflict resolution
 * - 🔴 MAANG-GRADE FIX: Graceful degradation to sessionStorage if IDB is blocked
 * (e.g., Incognito Mode, Safari ITP, or strict storage quotas).
 */

import { IDB_DB_NAME, IDB_STORE } from "./constants.js";

/** Module-scope singleton promise. Resolves once and reuses forever. */
let _dbPromise = null;

const getDB = () => {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    // If the browser doesn't support IDB at all, reject immediately to trigger fallback
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported in this environment."));
      return;
    }

    const req = window.indexedDB.open(IDB_DB_NAME, 1);

    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: "uid" });
    };

    req.onsuccess = (e) => resolve(e.target.result);

    req.onerror = () => {
      _dbPromise = null; // Allow retry on next call
      reject(req.error);
    };

    req.onblocked = () => {
      console.warn(
        "[IDB] Connection blocked — another tab may have an older version open.",
      );
    };
  });
  return _dbPromise;
};

/**
 * @function idbPut
 * @description Stores the user's execution map locally. Falls back to sessionStorage.
 */
export const idbPut = async (uid, payload, cloudTs) => {
  const fallbackKey = `discotive_map_session_${uid}`;
  const dataToStore = {
    uid,
    nodes: payload.nodes || [],
    edges: payload.edges || [],
    localTs: Date.now(),
    cloudTs: cloudTs ?? null,
  };

  try {
    const db = await getDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(dataToStore);
  } catch (err) {
    console.warn(
      "[IDB] Write rejected. Falling back to sessionStorage:",
      err.message,
    );
    // Graceful Degradation: Fallback to session storage
    try {
      sessionStorage.setItem(fallbackKey, JSON.stringify(dataToStore));
    } catch (sessionErr) {
      console.error(
        "[IDB] FATAL: Session storage fallback also failed (Quota Exceeded?).",
        sessionErr,
      );
    }
  }
};

/**
 * @function idbGet
 * @description Retrieves the user's execution map. Checks IDB first, then sessionStorage.
 */
export const idbGet = async (uid) => {
  const fallbackKey = `discotive_map_session_${uid}`;

  const tryFallback = () => {
    try {
      const cached = sessionStorage.getItem(fallbackKey);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  };

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(uid);

      req.onsuccess = () => {
        // If IDB succeeds but returns nothing, check if we have session data
        if (req.result) {
          resolve(req.result);
        } else {
          resolve(tryFallback());
        }
      };

      req.onerror = () => resolve(tryFallback());
    });
  } catch {
    // If getDB() rejects (e.g., IDB blocked), immediately use fallback
    return tryFallback();
  }
};

/**
 * @function idbClear
 * @description Wipes local execution map data from all fallback layers.
 */
export const idbClear = async (uid) => {
  const fallbackKey = `discotive_map_session_${uid}`;

  // Always clear the fallback layer first
  try {
    sessionStorage.removeItem(fallbackKey);
  } catch (e) {
    // Ignore session clear errors
  }

  try {
    const db = await getDB();
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(uid);
  } catch (err) {
    console.warn("[IDB] Clear operation failed/blocked:", err.message);
  }
};
