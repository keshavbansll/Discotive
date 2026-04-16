import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export const useOnboardingGate = () => {
  const { userData, loading } = useUserData();
  const navigate = useNavigate();

  const requireOnboarding = useCallback(
    (action) => {
      // Guard: Do not execute route evaluation until the memory state has resolved
      if (loading) return false;

      if (!userData || userData.isGhostUser || !userData.onboardingComplete) {
        navigate("/auth", { state: { isLogin: false, trigger: action } });
        return false;
      }
      return true;
    },
    [userData, loading, navigate],
  );

  return { requireOnboarding, isGhost: !userData?.onboardingComplete, loading };
};

// Session-scoped cache keyed by UID — safe
const SESSION_CACHE = new Map();

import { useAppStore } from "../stores/useAppStore";

export const useUserData = () => {
  const { setUserData: storeSet, patchUserData } = useAppStore();
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  const [userData, setUserData] = useState(() => {
    return uid ? (SESSION_CACHE.get(uid) ?? null) : null;
  });
  const [loading, setLoading] = useState(!SESSION_CACHE.has(uid));

  const fetchUserData = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }

    if (SESSION_CACHE.has(uid)) {
      setUserData(SESSION_CACHE.get(uid));
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { uid: docSnap.id, ...docSnap.data() };
        SESSION_CACHE.set(uid, data);
        setUserData(data);
        storeSet(data);
      }
    } catch (error) {
      console.error("[useUserData] Fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    // Clear cache on user change (logout/login switch)
    if (!uid) {
      SESSION_CACHE.clear();
      setUserData(null);
      setLoading(false);
      return;
    }
    fetchUserData();
  }, [uid, fetchUserData]);

  const patchLocalData = useCallback(
    (newFields) => {
      setUserData((prev) => {
        const updated = { ...prev, ...newFields };
        if (uid) SESSION_CACHE.set(uid, updated);
        return updated;
      });
    },
    [uid],
  );

  const refreshUserData = useCallback(async () => {
    if (!uid) return;
    SESSION_CACHE.delete(uid); // Force fresh fetch
    setLoading(true);
    await fetchUserData();
  }, [uid, fetchUserData]);

  return { userData, loading, patchLocalData, refreshUserData };
};
