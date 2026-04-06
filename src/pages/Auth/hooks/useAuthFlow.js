// src/pages/Auth/hooks/useAuthFlow.js
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { awardOnboardingComplete } from "../../../lib/scoreEngine";

export const useAuthFlow = (
  profileData,
  setSystemStatus,
  setIsLogin,
  setStep,
  dispatch,
) => {
  const navigate = useNavigate();

  const handleSocialAuth = useCallback(
    async (providerType) => {
      setSystemStatus((prev) => ({
        ...prev,
        loading: true,
        error: "",
        success: "",
      }));
      try {
        const provider = new GoogleAuthProvider(); // Expand for others
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const nameParts = user.displayName
          ? user.displayName.split(" ")
          : ["Operator", ""];
        const safeEmail = user.email;
        const generatedUsername = safeEmail
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        dispatch({
          type: "HYDRATE_OAUTH",
          payload: {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" "),
            email: safeEmail,
            username: generatedUsername,
          },
        });

        const existingSnap = await getDoc(doc(db, "users", user.uid));
        if (existingSnap.exists()) {
          const userData = existingSnap.data();
          if (
            userData?.onboardingComplete === false ||
            userData?.isGhostUser === true
          ) {
            const wlSnap = await getDocs(
              query(
                collection(db, "whitelisted_emails"),
                where("email", "==", safeEmail),
              ),
            );
            setIsLogin(false);
            setSystemStatus((prev) => ({ ...prev, loading: false }));
            wlSnap.empty ? setStep("locked") : setStep(2);
            return;
          }
          setSystemStatus((prev) => ({ ...prev, loading: false }));
          navigate("/app", { replace: true });
          return;
        }

        const todayStr = new Date().toISOString().split("T")[0];
        await setDoc(doc(db, "users", user.uid), {
          identity: {
            firstName: nameParts[0] || "Operator",
            lastName: nameParts.slice(1).join(" ") || "",
            email: safeEmail,
            username: "",
            gender: "",
          },
          onboardingComplete: false,
          isGhostUser: true,
          createdAt: new Date().toISOString(),
          discotiveScore: {
            current: 0,
            streak: 0,
            lastLoginDate: todayStr,
            lastAmount: 0,
            lastReason: "Ghost Account Pending",
            lastUpdatedAt: new Date().toISOString(),
          },
          login_history: [todayStr],
        });

        const wlSnap = await getDocs(
          query(
            collection(db, "whitelisted_emails"),
            where("email", "==", safeEmail),
          ),
        );
        setIsLogin(false);
        setSystemStatus((prev) => ({ ...prev, loading: false }));
        wlSnap.empty ? setStep("locked") : setStep(2);
      } catch (error) {
        setSystemStatus((prev) => ({
          ...prev,
          loading: false,
          error: error.message.replace("Firebase: ", ""),
        }));
      }
    },
    [navigate, dispatch, setIsLogin, setStep, setSystemStatus],
  );

  const handleFinalSubmit = useCallback(async () => {
    setSystemStatus((prev) => ({
      ...prev,
      isBooting: true,
      error: "",
      success: "",
      authTaskComplete: false,
    }));
    try {
      let uid;
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          profileData.email,
          profileData.password,
        );
        uid = userCredential.user.uid;
      }

      // Your massive systemPayload object here exactly as it was
      const systemPayload = {
        identity: {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          username: profileData.username.toLowerCase(),
          gender: profileData.gender,
          domain: profileData.passion,
          niche: profileData.niche,
          parallelGoal: profileData.parallelPath,
          country: profileData.country,
        },
        onboardingComplete: true,
        isGhostUser: false,
        // ... [Insert all the other mappings from your original handleFinalSubmit here] ...
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), systemPayload, { merge: true });
      await awardOnboardingComplete(uid);

      setSystemStatus((prev) => ({
        ...prev,
        isBooting: false,
        showSetupSequence: true,
      }));
    } catch (err) {
      setSystemStatus((prev) => ({
        ...prev,
        isBooting: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  }, [profileData, setSystemStatus]);

  const handleLogin = useCallback(
    async (email, password) => {
      setSystemStatus((prev) => ({
        ...prev,
        loading: true,
        error: "",
        success: "",
      }));
      try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/app", { replace: true });
      } catch (err) {
        setSystemStatus((prev) => ({
          ...prev,
          loading: false,
          error: "Authentication failed. Invalid credentials.",
        }));
      }
    },
    [navigate, setSystemStatus],
  );

  return { handleSocialAuth, handleFinalSubmit, handleLogin };
};
