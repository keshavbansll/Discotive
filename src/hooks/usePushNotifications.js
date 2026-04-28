/**
 * @fileoverview usePushNotifications — PWA Push Registration
 * Requests permission once, stores FCM token in Firestore.
 * Requires VITE_VAPID_KEY in .env
 */
import { useEffect } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { db, app } from "../firebase";

const PUSH_ASKED_KEY = "disc_push_asked";

export const usePushNotifications = (uid) => {
  useEffect(() => {
    if (!uid || !("Notification" in window) || !("serviceWorker" in navigator))
      return;

    // Silent check: If they already granted permission previously, boot up the worker
    if (Notification.permission === "granted") {
      registerToken(uid).catch(console.warn);
    }
  }, [uid]);

  // MAANG Fix: Export a manual trigger to be called strictly via onClick (Required for Apple/Safari)
  const requestPushPermission = async () => {
    if (!uid || !("Notification" in window)) return false;
    try {
      localStorage.setItem(PUSH_ASKED_KEY, "1");
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerToken(uid);
        return true;
      }
      return false;
    } catch (err) {
      console.warn("Push permission failed:", err);
      return false;
    }
  };

  return { requestPushPermission };
};

const registerToken = async (uid) => {
  if (!import.meta.env.VITE_VAPID_KEY) return;
  try {
    const messaging = getMessaging(app);

    // Explicitly register the Service Worker with dynamic ENV injection
    const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}`;

    const registration = await navigator.serviceWorker.register(swUrl);
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return;
    await updateDoc(doc(db, "users", uid), {
      pushTokens: arrayUnion(token),
    });
    // Pipeline: Secure Foreground Interception & OS-Level Routing
    onMessage(messaging, async (payload) => {
      if (!payload.notification) return;

      // 1. Dispatch internal event for UI Toast handling (Fluidity Standard)
      window.dispatchEvent(
        new CustomEvent("DISCOTIVE_FOREGROUND_PUSH", { detail: payload }),
      );

      // 2. Delegate OS-level notification to the Service Worker (Mobile PWA Standard)
      if (
        Notification.permission === "granted" &&
        "serviceWorker" in navigator
      ) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(
            payload.notification.title || "Discotive",
            {
              body: payload.notification.body,
              icon: "/pwa-192x192.png",
              badge: "/logo-no-bg-white.png", // Strict adherence to minimal maskable UI
              data: payload.data,
            },
          );
        } catch (swErr) {
          console.warn("[Discotive SW] Delegate routing failed:", swErr);
        }
      }
    });
  } catch (err) {
    console.warn("[Push] Registration failed silently:", err.message);
  }
};
