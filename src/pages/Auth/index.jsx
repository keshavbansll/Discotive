import React, {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useMemo,
} from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
// emailjs removed
import { auth, db } from "../../firebase";
import { awardOnboardingComplete } from "../../lib/scoreEngine";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import AuthLoader from "../../components/AuthLoader";

// ── Correctly wired components ──
import SetupSequence from "./components/SetupSequence";
import Step0Login from "./steps/Step0Login";
import Step1InitProfile from "./steps/Step1InitProfile";
import Step2Coordinates from "./steps/Step2Coordinates";
// LockedProtocol removed — site is public
import Step3Baseline from "./steps/Step3Baseline";
import Step4Vision from "./steps/Step4Vision";
import Step5Arsenal from "./steps/Step5Arsenal";
import Step6Resources from "./steps/Step6Resources";
import Step7Footprint from "./steps/Step7Footprint";
import Step8FinalCanvas from "./steps/Step8FinalCanvas";
import StepEmailVerify from "./steps/StepEmailVerify";
import StepPremiumPrompt from "./steps/StepPremiumPrompt";

// ── State Machine ──
const initialProfileState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  username: "",
  gender: "",
  userState: "",
  country: "",
  countryCode: "🇮🇳 +91",
  mobileNumber: "",
  requestMessage: "",
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
  goal3Months: "",
  longTermGoal: "",
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
    reddit: "",
    pinterest: "",
    figma: "",
    linktree: "",
    website: "",
  },
  commercialFootprint: {
    linkedinCompany: "",
    github: "",
    instagram: "",
    twitter: "",
    youtube: "",
    reddit: "",
    pinterest: "",
    figma: "",
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
    case "SET_NESTED_FIELD":
      return {
        ...state,
        [action.parent]: {
          ...state[action.parent],
          [action.field]: action.value,
        },
      };
    case "HYDRATE_OAUTH":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AuthOrchestrator() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(location.state?.isLogin !== false);
  const [step, setStep] = useState(1); // 1-8, "verify_email", "premium_prompt"
  const [systemStatus, setSystemStatus] = useState({
    loading: false,
    error: "",
    success: "",
    isBooting: false,
    authTaskComplete: false,
    showSetupSequence: false,
  });
  const [profileData, dispatch] = useReducer(
    profileReducer,
    initialProfileState,
  );
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  const debouncedUsername = useDebounce(profileData.username, 600);
  const setField = useCallback(
    (field, value) => dispatch({ type: "SET_FIELD", field, value }),
    [],
  );
  const setNestedField = useCallback(
    (parent, field, value) =>
      dispatch({ type: "SET_NESTED_FIELD", parent, field, value }),
    [],
  );

  const getPasswordStrength = useCallback(() => {
    const p = profileData.password;
    let s = 0;
    if (p.length > 7) s += 1;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s += 1;
    if (/\d/.test(p)) s += 1;
    if (/[^a-zA-Z0-9]/.test(p)) s += 1;
    return s;
  }, [profileData.password]);
  const pwScore = getPasswordStrength();

  // ── Handlers ──
  useEffect(() => {
    if (debouncedUsername.length < 3) return setUsernameAvailable(null);
    let isMounted = true;
    const verifyIdentity = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("identity.username", "==", debouncedUsername.toLowerCase()),
          ),
        );
        if (isMounted) setUsernameAvailable(snap.empty);
      } catch (err) {}
    };
    verifyIdentity();
    return () => {
      isMounted = false;
    };
  }, [debouncedUsername]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      // Don't interfere during active onboarding flows
      if (
        !user ||
        systemStatus.isBooting ||
        systemStatus.showSetupSequence ||
        step === "premium_prompt"
      )
        return;
      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (
            data?.onboardingComplete === false ||
            data?.isGhostUser === true
          ) {
            // Incomplete onboarding — resume from where they left off
            setIsLogin(false);
            setIsGoogleUser(
              !!user.providerData?.find((p) => p.providerId === "google.com"),
            );
            dispatch({
              type: "HYDRATE_OAUTH",
              payload: {
                firstName: data?.identity?.firstName || "",
                lastName: data?.identity?.lastName || "",
                email: data?.identity?.email || user.email || "",
                username: data?.identity?.username || "",
              },
            });
            setStep(2); // Resume at coordinates
            return;
          }
          // Fully onboarded — go to app
          navigate("/app", { replace: true });
        } else {
          // New OAuth user with no Firestore doc yet — handled by handleSocialAuth
          // This case shouldn't occur since we create the doc in handleSocialAuth
          setIsLogin(false);
          setStep(2);
        }
      } catch (err) {
        console.error("[Auth] State listener error:", err);
      }
    });
    return unsubscribe;
  }, [navigate, systemStatus.isBooting, systemStatus.showSetupSequence, step]);

  const handleLogin = async (email, password) => {
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
  };

  const handleSocialAuth = async (providerType) => {
    setSystemStatus((prev) => ({
      ...prev,
      loading: true,
      error: "",
      success: "",
    }));
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
          setSystemStatus((prev) => ({ ...prev, loading: false }));
          setStep(2); // Google users skip step 1 (no password needed), go to coordinates
          return;
        }
        setSystemStatus((prev) => ({ ...prev, loading: false }));
        navigate("/app", { replace: true });
        return;
      }

      const nameParts = user.displayName
        ? user.displayName.split(" ")
        : ["Operator", ""];
      dispatch({
        type: "HYDRATE_OAUTH",
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

      const todayStr = new Date().toISOString().split("T")[0];
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
          lastLoginDate: todayStr,
          lastAmount: 0,
          lastReason: "Ghost Account — Pending",
          lastUpdatedAt: new Date().toISOString(),
        },
        login_history: [todayStr],
      });

      setIsGoogleUser(true);
      setIsLogin(false);
      setSystemStatus((prev) => ({ ...prev, loading: false }));
      setStep(2);
    } catch (error) {
      setSystemStatus((prev) => ({
        ...prev,
        loading: false,
        error: error.message.replace("Firebase: ", ""),
      }));
    }
  };

  const handleSignUpStep1 = async (e) => {
    e.preventDefault();
    if (
      !profileData.email ||
      !profileData.password ||
      !profileData.firstName ||
      !profileData.lastName
    )
      return setSystemStatus((prev) => ({
        ...prev,
        error: "All identity fields are required.",
      }));
    if (pwScore < 2)
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Password too weak. Add numbers and special characters.",
      }));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email))
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Invalid email format.",
      }));

    setSystemStatus((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      // Check if email already registered
      const methods = await import("firebase/auth").then((m) =>
        m.fetchSignInMethodsForEmail(auth, profileData.email),
      );
      if (methods && methods.length > 0) {
        return setSystemStatus((prev) => ({
          ...prev,
          loading: false,
          error: "An account with this email already exists. Sign in instead.",
        }));
      }
      setStep(2);
    } catch (err) {
      console.error("Step 1 verification failed:", err);
      setSystemStatus((prev) => ({
        ...prev,
        error:
          err.code === "auth/invalid-email"
            ? "Invalid email format."
            : "Verification failed. Try again.",
      }));
    } finally {
      setSystemStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (
      !profileData.username ||
      !profileData.userState ||
      !profileData.country ||
      !profileData.gender
    )
      return setSystemStatus((prev) => ({
        ...prev,
        error: "System coordinates are mandatory.",
      }));
    if (usernameAvailable === false)
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Handle is claimed.",
      }));
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(3);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    if (profileData.startMonth && !profileData.startYear)
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Start Year required.",
      }));
    if (profileData.endMonth && !profileData.endYear)
      return setSystemStatus((prev) => ({
        ...prev,
        error: "End Year required.",
      }));
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(4);
  };

  const handleStep4Submit = (e) => {
    e.preventDefault();
    if (
      profileData.passion === profileData.parallelPath &&
      profileData.passion !== ""
    )
      return setSystemStatus((prev) => ({
        ...prev,
        error: "Domains cannot be identical.",
      }));
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(5);
  };

  const handleStep7Submit = (e) => {
    e.preventDefault();
    setSystemStatus((prev) => ({ ...prev, error: "" }));
    setStep(8);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setSystemStatus((prev) => ({
      ...prev,
      isBooting: true,
      error: "",
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
        vision: {
          passion: profileData.passion,
          niche: profileData.niche,
          parallelPath: profileData.parallelPath,
          goal3Months: profileData.goal3Months,
          longTermGoal: profileData.longTermGoal,
        },
        "identity.domain": profileData.passion,
        "identity.niche": profileData.niche,
        "identity.parallelGoal": profileData.parallelPath,
        "identity.country": profileData.country,
        skills: {
          rawSkills: profileData.rawSkills,
          alignedSkills: profileData.alignedSkills,
          languages: profileData.languages,
        },
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
          lastLoginDate: new Date().toISOString().split("T")[0],
          streak: 1,
          lastAmount: 0,
          lastReason: "OS Booted",
          lastUpdatedAt: new Date().toISOString(),
        },
        score_history: [
          { date: new Date().toISOString().split("T")[0], score: 0 },
        ],
        consistency_log: [new Date().toISOString().split("T")[0]],
        login_history: [new Date().toISOString().split("T")[0]],
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "users", uid), systemPayload, { merge: true });
      await awardOnboardingComplete(uid);

      // Send verification email (non-blocking)
      try {
        const sendVerification = httpsCallable(
          functions,
          "sendVerificationEmail",
        );
        await sendVerification({
          email: profileData.email,
          firstName: profileData.firstName,
        });
      } catch (verErr) {
        console.warn("[Auth] Verification email failed:", verErr);
      }

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
  };

  // handleAccessRequest removed — site is now public

  if (systemStatus.isBooting)
    return <AuthLoader taskComplete={systemStatus.authTaskComplete} />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans">
      <div className="hidden md:flex md:w-5/12 p-12 flex-col justify-between relative overflow-hidden bg-black border-r border-white/5">
        {/* Simplified left hemisphere background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-0 pointer-events-none" />
        <div className="relative z-10">
          <Link
            to="/"
            className="flex items-center gap-3 mb-16 hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo.png"
              alt="Discotive Logo"
              className="h-10 w-auto object-contain"
            />
            <span className="text-2xl font-extrabold tracking-tighter drop-shadow-lg">
              DISCOTIVE
            </span>
          </Link>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tighter leading-[0.9] mb-6">
            Build your <br /> monopoly.
          </h1>
        </div>
      </div>

      <div className="w-full md:w-7/12 flex items-center justify-center p-4 md:p-12 relative overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
        <div className="w-full max-w-lg py-6 md:py-10">
          <AnimatePresence mode="wait">
            {isLogin && (
              <Step0Login
                key="login"
                onSubmit={handleLogin}
                onOAuth={() => handleSocialAuth("google")}
                goToSignup={() => {
                  setIsLogin(false);
                  setStep(1);
                }}
                authError={systemStatus.error}
                isProcessing={systemStatus.loading}
              />
            )}
            {!isLogin && step === 1 && (
              <Step1InitProfile
                key="step1"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleSignUpStep1={handleSignUpStep1}
                handleSocialAuth={() => handleSocialAuth("google")}
                setIsLogin={setIsLogin}
                pwScore={pwScore}
              />
            )}
            {!isLogin && step === 2 && (
              <Step2Coordinates
                key="step2"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleStep2Submit={handleStep2Submit}
                setStep={setStep}
                usernameAvailable={usernameAvailable}
                debouncedUsername={debouncedUsername}
              />
            )}
            {step === "verify_email" && (
              <StepEmailVerify
                key="verify_email"
                email={profileData.email}
                firstName={profileData.firstName}
                onVerified={() => {
                  setEmailVerified(true);
                  setStep(3);
                }}
                onSkip={() => setStep(3)}
              />
            )}
            {step === "premium_prompt" && (
              <StepPremiumPrompt
                key="premium_prompt"
                firstName={
                  profileData.firstName ||
                  auth.currentUser?.displayName?.split(" ")[0] ||
                  "Operator"
                }
                onUpgrade={() => navigate("/premium")}
                onContinue={() => navigate("/app", { replace: true })}
              />
            )}
            {!isLogin && step === 3 && (
              <Step3Baseline
                key="step3"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleStep3Submit={handleStep3Submit}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 4 && (
              <Step4Vision
                key="step4"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleStep4Submit={handleStep4Submit}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 5 && (
              <Step5Arsenal
                key="step5"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                setSystemStatus={setSystemStatus}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 6 && (
              <Step6Resources
                key="step6"
                profileData={profileData}
                setField={setField}
                setSystemStatus={setSystemStatus}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 7 && (
              <Step7Footprint
                key="step7"
                profileData={profileData}
                setNestedField={setNestedField}
                systemStatus={systemStatus}
                handleStep7Submit={handleStep7Submit}
                setStep={setStep}
              />
            )}
            {!isLogin && step === 8 && (
              <Step8FinalCanvas
                key="step8"
                profileData={profileData}
                setField={setField}
                systemStatus={systemStatus}
                handleFinalSubmit={handleFinalSubmit}
                setStep={setStep}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {systemStatus.showSetupSequence && (
        <SetupSequence
          onComplete={() => {
            // After setup, show premium prompt for new users
            setSystemStatus((prev) => ({ ...prev, showSetupSequence: false }));
            setStep("premium_prompt");
          }}
        />
      )}
    </div>
  );
}
