// src/pages/Auth/hooks/useAuthFlow.js
// REFACTORED: Zero-friction 3-step onboarding. Full profile deferred to in-app completeness widget.

import { useState, useEffect, useCallback, useReducer } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db, functions } from "../../../firebase";
import { httpsCallable } from "firebase/functions";
import { awardOnboardingComplete } from "../../../lib/scoreEngine";

// ─── MINIMAL INITIAL PROFILE (only what's needed for first launch) ───────────
const initialProfile = {
  // Step 1: Auth
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  avatarUrl: "", // hydrated from Google OAuth

  // Step 2: Handle + one big question
  username: "",
  passion: "", // domain/macro-field — feeds the algorithm immediately
  currentStatus: [], // Student / Professional / Founder / etc. (Array format for multi-select up to 3)
};

function profileReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "HYDRATE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── MAIN HOOK ─────────────────────────────────────────────────────────────────
export default function useAuthFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  // "login" | "signup_auth" | "verify_email" | "signup_intent" | "booting" | "premium_prompt"
  const [step, setStep] = useState(
    location.state?.isLogin === false ? "signup_auth" : "login",
  );
  const [systemStatus, setSystemStatus] = useState({
    loading: false,
    error: "",
    showSetupSequence: false,
  });
  const [profileData, dispatch] = useReducer(profileReducer, initialProfile);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const debouncedUsername = useDebounce(profileData.username, 600);

  const setField = useCallback(
    (field, value) => dispatch({ type: "SET_FIELD", field, value }),
    [],
  );

  const pwScore = (() => {
    const p = profileData.password;
    let s = 0;
    if (p.length > 7) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^a-zA-Z0-9]/.test(p)) s++;
    return s;
  })();

  // Username availability check
  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameAvailable(null);
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("identity.username", "==", debouncedUsername.toLowerCase()),
          ),
        );
        if (active) setUsernameAvailable(snap.empty);
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [debouncedUsername]);

  // Auth state observer — fast-tracks already-authenticated users
  useEffect(() => {
    const guardSteps = [
      "verify_email",
      "signup_intent",
      "booting",
      "premium_prompt",
      "signup_auth",
      "login",
    ];
    if (!guardSteps.includes(step) && typeof step !== "string") return;

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user || systemStatus.loading || systemStatus.showSetupSequence)
        return;
      if (step !== "login" && step !== "signup_auth") return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.onboardingComplete === true) {
            navigate("/app", { replace: true });
          } else {
            // Incomplete ghost — fast-track to intent step
            setIsGoogleUser(true);
            dispatch({
              type: "HYDRATE",
              payload: {
                firstName:
                  data?.identity?.firstName ||
                  user.displayName?.split(" ")[0] ||
                  "",
                lastName:
                  data?.identity?.lastName ||
                  user.displayName?.split(" ").slice(1).join(" ") ||
                  "",
                email: data?.identity?.email || user.email || "",
                username: data?.identity?.username || "",
                avatarUrl: user.photoURL || "",
              },
            });
            setStep("signup_intent");
          }
        }
      } catch {}
    });
    return unsub;
  }, [navigate, step, systemStatus.loading, systemStatus.showSetupSequence]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────

  const handleLogin = async (email, password) => {
    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/app", { replace: true });
    } catch {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: "Incorrect email or password. Please try again.",
      }));
    }
  };

  const handleSocialAuth = async () => {
    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const nameParts = (user.displayName || "Operator").split(" ");

      const existingSnap = await getDoc(doc(db, "users", user.uid));
      if (existingSnap.exists()) {
        const userData = existingSnap.data();
        if (userData?.onboardingComplete === true) {
          navigate("/app", { replace: true });
          return;
        }
        // Incomplete — go to intent
        dispatch({
          type: "HYDRATE",
          payload: {
            firstName: userData?.identity?.firstName || nameParts[0],
            lastName:
              userData?.identity?.lastName || nameParts.slice(1).join(" "),
            email: user.email,
            username:
              userData?.identity?.username ||
              user.email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ""),
            avatarUrl: user.photoURL || "",
          },
        });
        setIsGoogleUser(true);
        setSystemStatus((p) => ({ ...p, loading: false }));
        setStep("signup_intent");
        return;
      }

      // Brand new Google user — create ghost doc and go to intent
      dispatch({
        type: "HYDRATE",
        payload: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: user.email,
          username: user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
          avatarUrl: user.photoURL || "",
        },
      });

      const today = new Date().toISOString().split("T")[0];
      await setDoc(doc(db, "users", user.uid), {
        identity: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: user.email,
          avatarUrl: user.photoURL || "",
          username: "",
        },
        onboardingComplete: false,
        isGhostUser: true,
        createdAt: new Date().toISOString(),
        discotiveScore: {
          current: 0,
          streak: 0,
          lastLoginDate: today,
          lastAmount: 0,
          lastReason: "Ghost — Pending",
          lastUpdatedAt: new Date().toISOString(),
        },
        login_history: [today],
      });

      setIsGoogleUser(true);
      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep("signup_intent");
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  // Step 1 for email/pass: validate → send OTP → verify_email
  const handleEmailSignup = async (e) => {
    e?.preventDefault();
    const { email, password, firstName, lastName } = profileData;
    if (!email || !password || !firstName || !lastName)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please fill in all fields.",
      }));
    if (pwScore < 2)
      return setSystemStatus((p) => ({
        ...p,
        error: "Password too weak. Mix upper/lowercase + numbers.",
      }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return setSystemStatus((p) => ({
        ...p,
        error: "That doesn't look like a valid email.",
      }));

    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      const methods = await import("firebase/auth").then((m) =>
        m.fetchSignInMethodsForEmail(auth, email),
      );
      if (methods?.length > 0)
        return setSystemStatus((p) => ({
          ...p,
          loading: false,
          error: "Account already exists with this email. Sign in instead.",
        }));
      try {
        const sendFn = httpsCallable(functions, "sendVerificationEmail");
        await sendFn({ email, firstName });
      } catch {}
      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep("verify_email");
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error:
          err.code === "auth/invalid-email"
            ? "Invalid email."
            : "Failed. Please try again.",
      }));
    }
  };

  // Step 2 (intent): handle + domain + status → create account → boot
  const handleIntentSubmit = async (e) => {
    e?.preventDefault();
    const {
      username,
      passion,
      currentStatus,
      email,
      password,
      firstName,
      lastName,
      avatarUrl,
    } = profileData;
    if (!username || username.length < 3)
      return setSystemStatus((p) => ({
        ...p,
        error: "Pick a unique username (min 3 chars).",
      }));
    if (usernameAvailable === false)
      return setSystemStatus((p) => ({
        ...p,
        error: "Username taken. Try another.",
      }));
    if (!passion)
      return setSystemStatus((p) => ({
        ...p,
        error: "Select your primary domain.",
      }));
    if (
      !currentStatus ||
      (Array.isArray(currentStatus) && currentStatus.length === 0)
    )
      return setSystemStatus((p) => ({
        ...p,
        error: "Select at least one current situation.",
      }));

    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      let uid;
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        uid = cred.user.uid;
      }

      const today = new Date().toISOString().split("T")[0];

      // Minimal but immediately useful payload — deferred fields filled via dashboard completeness widget
      const payload = {
        identity: {
          firstName,
          lastName,
          email: email || auth.currentUser?.email || "",
          username: username.toLowerCase(),
          avatarUrl: avatarUrl || "",
          domain: passion,
          niche: "",
          country: "",
          bio: "",
        },
        vision: { passion, niche: "" },
        baseline: { currentStatus },
        skills: { rawSkills: [], alignedSkills: [], languages: [] },
        onboardingComplete: true,
        isGhostUser: false,
        profileCompleteness: 20, // Gamification: starts at 20% to create "almost there" tension
        deferredOnboarding: {
          // Tracks which deferred steps are still pending
          location: false,
          background: false,
          professional: false,
          skills: false,
          resources: false,
          footprint: false,
          motivation: false,
        },
        discotiveScore: {
          current: 0,
          last24h: 0,
          lastLoginDate: today,
          streak: 1,
          lastAmount: 0,
          lastReason: "OS Booted",
          lastUpdatedAt: new Date().toISOString(),
        },
        score_history: [{ date: today, score: 0 }],
        consistency_log: [today],
        login_history: [today],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), payload, { merge: true });
      await awardOnboardingComplete(uid);

      setSystemStatus((p) => ({
        ...p,
        loading: false,
        showSetupSequence: true,
      }));
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  return {
    step,
    setStep,
    systemStatus,
    setSystemStatus,
    profileData,
    setField,
    usernameAvailable,
    debouncedUsername,
    pwScore,
    isGoogleUser,
    // Alias for backward compat
    isLogin: step === "login",
    setIsLogin: (v) => setStep(v ? "login" : "signup_auth"),
    handleLogin,
    handleSocialAuth,
    handleEmailSignup,
    handleIntentSubmit,
    // Legacy no-ops (remove once old step components are retired)
    handleStep1: handleEmailSignup,
    handleStep2: () => {},
    handleStep3: () => {},
    handleStep4: () => {},
    handleStep7: () => {},
    handleFinalSubmit: handleIntentSubmit,
  };
}
