// src/pages/Auth/hooks/useAuthFlow.js

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

// ─────────────────────────────────────────────────────────────────────────────
// STATE & REDUCERS
// ─────────────────────────────────────────────────────────────────────────────
const initialProfile = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  username: "",
  gender: "",
  userState: "",
  country: "",
  countryCode: "+91 🇮🇳",
  mobileNumber: "",
  currentStatus: "",
  institution: "",
  course: "",
  specialization: "",
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  passion: "",
  niche: "",
  parallelPath: "",
  bio: "",
  workExperienceRole: "",
  workExperienceCompany: "",
  workExperienceType: "",
  rawSkills: [],
  alignedSkills: [],
  languages: [],
  guardianProfession: "",
  incomeBracket: "",
  financialLaunchpad: "",
  investmentCapacity: "",
  personalFootprint: {
    linkedin: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linktree: "",
    website: "",
  },
  commercialFootprint: {
    linkedinCompany: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    linktree: "",
    website: "",
  },
  wildcardInfo: "",
  coreMotivation: "",
};

function profileReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_NESTED":
      return {
        ...state,
        [action.parent]: {
          ...state[action.parent],
          [action.field]: action.value,
        },
      };
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────
export default function useAuthFlow() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.state?.isLogin !== false);
  const [step, setStep] = useState(1);
  const [systemStatus, setSystemStatus] = useState({
    loading: false,
    error: "",
    success: "",
    isBooting: false,
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
  const setNestedField = useCallback(
    (parent, field, value) =>
      dispatch({ type: "SET_NESTED", parent, field, value }),
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
    setUsernameAvailable(null); // Immediately reset to trigger loader while fetching
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

  // Auth state observer
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (
        !user ||
        systemStatus.isBooting ||
        systemStatus.showSetupSequence ||
        step === "premium_prompt" ||
        step === "verify_email" ||
        (typeof step === "number" && step > 1)
      )
        return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (
            data?.onboardingComplete === false ||
            data?.isGhostUser === true
          ) {
            setIsLogin(false);
            setIsGoogleUser(
              !!user.providerData?.find((p) => p.providerId === "google.com"),
            );
            dispatch({
              type: "HYDRATE",
              payload: {
                firstName: data?.identity?.firstName || "",
                lastName: data?.identity?.lastName || "",
                email: data?.identity?.email || user.email || "",
                username: data?.identity?.username || "",
              },
            });
            setStep(2);
            return;
          }
          navigate("/app", { replace: true });
        } else {
          setIsLogin(false);
          setStep(2);
        }
      } catch {}
    });
    return unsub;
  }, [navigate, systemStatus.isBooting, systemStatus.showSetupSequence, step]);

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
      const safeEmail = user.email;
      const existingSnap = await getDoc(doc(db, "users", user.uid));
      if (existingSnap.exists()) {
        const userData = existingSnap.data();
        if (
          userData?.onboardingComplete === false ||
          userData?.isGhostUser === true
        ) {
          setIsGoogleUser(true);
          setIsLogin(false);
          setSystemStatus((p) => ({ ...p, loading: false }));
          setStep(2);
          return;
        }
        setSystemStatus((p) => ({ ...p, loading: false }));
        navigate("/app", { replace: true });
        return;
      }
      const nameParts = (user.displayName || "Operator").split(" ");
      dispatch({
        type: "HYDRATE",
        payload: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
          email: safeEmail,
          username: safeEmail
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""),
        },
      });
      const today = new Date().toISOString().split("T")[0];
      await setDoc(doc(db, "users", user.uid), {
        identity: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" "),
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
          lastLoginDate: today,
          lastAmount: 0,
          lastReason: "Ghost — Pending",
          lastUpdatedAt: new Date().toISOString(),
        },
        login_history: [today],
      });
      setIsGoogleUser(true);
      setIsLogin(false);
      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep(2);
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    if (
      !profileData.email ||
      !profileData.password ||
      !profileData.firstName ||
      !profileData.lastName
    )
      return setSystemStatus((p) => ({
        ...p,
        error: "Please fill in all fields before continuing.",
      }));
    if (pwScore < 2)
      return setSystemStatus((p) => ({
        ...p,
        error:
          "Your password is too weak. Add numbers and a mix of upper/lowercase.",
      }));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email))
      return setSystemStatus((p) => ({
        ...p,
        error: "That doesn't look like a valid email address.",
      }));

    setSystemStatus((p) => ({ ...p, loading: true, error: "" }));
    try {
      const methods = await import("firebase/auth").then((m) =>
        m.fetchSignInMethodsForEmail(auth, profileData.email),
      );
      if (methods && methods.length > 0)
        return setSystemStatus((p) => ({
          ...p,
          loading: false,
          error: "An account with this email already exists. Sign in instead.",
        }));

      try {
        const sendFn = httpsCallable(functions, "sendVerificationEmail");
        await sendFn({
          email: profileData.email,
          firstName: profileData.firstName,
        });
      } catch {}

      setSystemStatus((p) => ({ ...p, loading: false }));
      setStep("verify_email");
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        loading: false,
        error:
          err.code === "auth/invalid-email"
            ? "Invalid email format."
            : "Verification failed. Please try again.",
      }));
    }
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    if (
      !profileData.username ||
      !profileData.userState ||
      !profileData.country ||
      !profileData.gender
    )
      return setSystemStatus((p) => ({
        ...p,
        error: "Please fill in all required fields.",
      }));
    if (usernameAvailable === false)
      return setSystemStatus((p) => ({
        ...p,
        error: "That username is already taken. Please choose another.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(3);
  };

  const handleStep3 = (e) => {
    e.preventDefault();
    if (profileData.startMonth && !profileData.startYear)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please add a start year too.",
      }));
    if (profileData.endMonth && !profileData.endYear)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please add an end year too.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(4);
  };

  const handleStep4 = (e) => {
    e.preventDefault();
    if (!profileData.passion)
      return setSystemStatus((p) => ({
        ...p,
        error: "Please select your main field.",
      }));
    if (!profileData.bio || profileData.bio.trim().length < 20)
      return setSystemStatus((p) => ({
        ...p,
        error:
          "Please write a short professional bio (at least 20 characters).",
      }));
    if (profileData.passion === profileData.parallelPath)
      return setSystemStatus((p) => ({
        ...p,
        error: "Your main field and side pursuit cannot be the same.",
      }));
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(5);
  };

  const handleStep7 = (e) => {
    e.preventDefault();
    setSystemStatus((p) => ({ ...p, error: "" }));
    setStep(8);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!profileData.coreMotivation.trim())
      return setSystemStatus((p) => ({
        ...p,
        error:
          "Please share your motivation — it helps us personalise your journey.",
      }));

    setSystemStatus((p) => ({ ...p, isBooting: true, error: "" }));
    try {
      let uid;
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          profileData.email,
          profileData.password,
        );
        uid = cred.user.uid;
      }

      const today = new Date().toISOString().split("T")[0];
      const payload = {
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
          bio: profileData.bio,
        },
        onboardingComplete: true,
        isGhostUser: false,
        location: {
          state: profileData.userState,
          country: profileData.country,
          displayLocation: `${profileData.userState}, ${profileData.country}`,
        },
        baseline: {
          currentStatus: profileData.currentStatus,
          institution: profileData.institution,
          course: profileData.course,
          specialization: profileData.specialization,
          startMonth: profileData.startMonth,
          startYear: profileData.startYear,
          endMonth: profileData.endMonth,
          endYear: profileData.endYear,
        },
        professional: {
          bio: profileData.bio,
          workExperience: profileData.workExperienceRole
            ? {
                role: profileData.workExperienceRole,
                company: profileData.workExperienceCompany,
                type: profileData.workExperienceType,
              }
            : null,
        },
        vision: {
          passion: profileData.passion,
          niche: profileData.niche,
          parallelPath: profileData.parallelPath,
        },
        skills: {
          rawSkills: profileData.rawSkills,
          alignedSkills: profileData.alignedSkills,
          languages: profileData.languages,
        },
        verifiedApps: [],
        resources: {
          guardianProfession: profileData.guardianProfession,
          incomeBracket: profileData.incomeBracket,
          financialLaunchpad: profileData.financialLaunchpad,
          investmentCapacity: profileData.investmentCapacity,
        },
        footprint: {
          personal: profileData.personalFootprint,
          commercial: profileData.commercialFootprint,
          location: `${profileData.userState}, ${profileData.country}`,
        },
        wildcard: {
          wildcardInfo: profileData.wildcardInfo,
          coreMotivation: profileData.coreMotivation,
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
        isBooting: false,
        showSetupSequence: true,
      }));
    } catch (err) {
      setSystemStatus((p) => ({
        ...p,
        isBooting: false,
        error: err.message.replace("Firebase: ", ""),
      }));
    }
  };

  return {
    isLogin,
    setIsLogin,
    step,
    setStep,
    systemStatus,
    setSystemStatus,
    profileData,
    dispatch,
    setField,
    setNestedField,
    usernameAvailable,
    debouncedUsername,
    pwScore,
    isGoogleUser,
    handleLogin,
    handleSocialAuth,
    handleStep1,
    handleStep2,
    handleStep3,
    handleStep4,
    handleStep7,
    handleFinalSubmit,
  };
}
