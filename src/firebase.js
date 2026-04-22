import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { getFunctions } from "firebase/functions";
import {
  getMessaging,
  isSupported as isMessagingSupported,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 1. Configure the Debug Token BEFORE initializing App Check
if (import.meta.env.DEV) {
  // Uses a specific token if defined in .env.local, otherwise generates a random one in the console.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

// 2. Initialize Core Firebase Services
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// MAANG-GRADE TRANSPORT OVERRIDE:
// Force long-polling to bypass aggressive client-side ad-blockers (Brave, uBlock)
// that blackhole Firestore WebChannel streams as tracking pixels.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  ignoreUndefinedProperties: true, // Drops undefined fields silently instead of crashing
});
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const rtdb = getDatabase(app);

// 3. Initialize App Check Universally (Dev and Prod)
if (import.meta.env.VITE_RECAPTCHA_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_RECAPTCHA_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
} else {
  console.error(
    "[Security] Firebase App Check failed to initialize. Missing VITE_RECAPTCHA_KEY in environment variables.",
  );
}

// 4. Initialize Analytics conditionally (client-side only)
export let analytics;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export let messaging = null;
isMessagingSupported().then((supported) => {
  if (supported) {
    try {
      messaging = getMessaging(app);
    } catch (_) {}
  }
});
