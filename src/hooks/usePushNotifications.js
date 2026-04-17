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

    const setup = async () => {
      // Only ask once per browser
      const alreadyAsked = localStorage.getItem(PUSH_ASKED_KEY);
      if (alreadyAsked) {
        if (Notification.permission === "granted") await registerToken(uid);
        return;
      }

      // Ask after 30s on first visit to reduce permission fatigue
      const timer = setTimeout(async () => {
        localStorage.setItem(PUSH_ASKED_KEY, "1");
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") await registerToken(uid);
        } catch (_) {}
      }, 30000);

      return () => clearTimeout(timer);
    };

    setup();
  }, [uid]);
};

const registerToken = async (uid) => {
  if (!import.meta.env.VITE_VAPID_KEY) return;
  try {
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
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
