// src/hooks/useUserData.js
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// ── MAANG-GRADE FIX: Module-Level Cache ──
// Prevents 10 components from firing 10 identical reads on mount.
// It stores the data in memory for the duration of the session.
let cachedUserData = null;
let fetchPromise = null;

export const useUserData = () => {
  const { currentUser } = useAuth();

  // Initialize state with cache if available to prevent skeleton flashing
  const [userData, setUserData] = useState(cachedUserData);
  const [loading, setLoading] = useState(!cachedUserData);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // 1. If we already have the data in memory, skip the database entirely
      if (cachedUserData?.uid === currentUser.uid) {
        setLoading(false);
        return;
      }

      try {
        // 2. If multiple components mount simultaneously, only the first one
        // triggers the network request. The rest wait for this single promise.
        if (!fetchPromise) {
          const docRef = doc(db, "users", currentUser.uid);
          fetchPromise = getDoc(docRef);
        }

        const docSnap = await fetchPromise;

        if (docSnap.exists()) {
          const data = { uid: docSnap.id, ...docSnap.data() };
          cachedUserData = data; // Save to memory cache
          setUserData(data);
        } else {
          console.log("No user data found in database!");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        // 3. THE FIX: Artificial 800ms delay eradicated.
        setLoading(false);
        fetchPromise = null; // Clear the flight tracker
      }
    };

    fetchUserData();
  }, [currentUser]);

  // Manual state patcher for optimistic UI updates
  const patchLocalData = (newFields) => {
    setUserData((prev) => {
      const updated = { ...prev, ...newFields };
      cachedUserData = updated; // Keep the cache perfectly synced
      return updated;
    });
  };

  return { userData, loading, patchLocalData };
};
