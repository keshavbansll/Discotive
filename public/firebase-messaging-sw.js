/* eslint-env serviceworker */
/* global importScripts, firebase, clients, Promise, indexedDB */

/**
 * @fileoverview Discotive Core Push & Telemetry Engine (Service Worker)
 * @version 2.1.0 - Production
 * @architecture MAANG-Grade Web Worker Context
 */

// ============================================================================
// 1. DEPENDENCY INJECTION (CDN PARADIGM FOR ISOLATED WORKERS)
// ============================================================================
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js",
);

// ============================================================================
// 2. SYSTEM CONFIGURATION & INITIALIZATION (DYNAMIC INJECTION)
// ============================================================================
// MAANG-Grade Architecture: API Keys are dynamically injected via URL parameters
// during the Service Worker registration phase to prevent VSC leaks and allow
// seamless environment switching (Staging/Production).
const urlParams = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================================================
// 3. OFFLINE TELEMETRY CACHE (INDEXED-DB)
// ============================================================================
// We cannot rely on fetch() in a background state without risking network drops.
// We queue interactions and sync them to the Global Ledger when connectivity resumes.
const DB_NAME = "DiscotiveTelemetryOS";
const DB_VERSION = 1;
const STORE_NAME = "notification_events";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

async function logTelemetryEvent(eventType, payload) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.add({
      eventType,
      timestamp: Date.now(),
      data: payload,
      synced: false,
    });
    // In a fully scaled system, we trigger a Background Sync API here.
  } catch (error) {
    console.error("[Discotive SW] Telemetry failure:", error);
  }
}

// ============================================================================
// 4. BACKGROUND PAYLOAD INTERCEPTOR
// ============================================================================
messaging.onBackgroundMessage((payload) => {
  console.log("[Discotive SW] Background Payload Received.", payload);

  // Aggressive Data Extraction & Fallbacks
  const notificationTitle =
    payload.notification?.title || "Discotive System Alert";
  const notificationBody =
    payload.notification?.body || "You have new activity in the Arena.";
  const payloadData = payload.data || {};

  // Psychological Hook: If tension is high, alter vibration pattern
  const isHighPriority =
    payloadData.priority === "HIGH" || payloadData.type === "RANK_DROP";
  const vibrationPattern = isHighPriority
    ? [500, 200, 500, 200, 500]
    : [200, 100, 200];

  // Design System Standard Integration
  const notificationOptions = {
    body: notificationBody,
    icon: "/pwa-192x192.png",
    badge: "/logo-no-bg-white.png", // Android Status Bar Minimal Mask
    color: "#BFA264", // Primary Gold Core
    vibrate: vibrationPattern,
    data: {
      route: payloadData.route || "/dashboard",
      clickAction: payloadData.click_action,
      entityId: payloadData.entityId,
      timestamp: Date.now(),
    },
    // Prevent duplicate spam by stacking notifications with the same tag
    tag: payloadData.tag || "discotive-general-update",
    renotify: isHighPriority,
    requireInteraction: isHighPriority,

    // Actionable Micro-Interactions
    actions: [],
  };

  // Inject Contextual Actions
  if (payloadData.type === "ALLIANCE_REQUEST") {
    notificationOptions.actions.push(
      { action: "accept_alliance", title: "Accept" },
      { action: "view_profile", title: "View Profile" },
    );
  } else if (payloadData.type === "ASSET_VERIFIED") {
    notificationOptions.actions.push({
      action: "view_vault",
      title: "Open Vault",
    });
  } else {
    notificationOptions.actions.push({
      action: "open_app",
      title: "Launch Discotive",
    });
  }

  // Telemetry: Log that the device physically received the payload
  logTelemetryEvent("DELIVERED", {
    tag: notificationOptions.tag,
    type: payloadData.type,
  });

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  );
});

// ============================================================================
// 5. INTERACTION ROUTING & WINDOW MANAGEMENT
// ============================================================================
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const targetRoute = event.notification.data?.route || "/dashboard";
  const entityId = event.notification.data?.entityId;

  // Telemetry: Track exact conversion
  logTelemetryEvent("CLICKED", { action, route: targetRoute, entityId });

  // Handle background actions without opening the app if possible
  if (action === "accept_alliance") {
    // Note: Would execute a fetch to our cloud function here to accept silently
    // For now, we route them to the network tab.
    routeUserTo(event, "/connective");
    return;
  }

  routeUserTo(event, targetRoute);
});

self.addEventListener("notificationclose", (event) => {
  // Telemetry: Track ignored/dismissed notifications (Anti-Fatigue Data)
  logTelemetryEvent("DISMISSED", {
    tag: event.notification.tag,
    timeAlive: Date.now() - event.notification.data.timestamp,
  });
});

// ============================================================================
// 6. CLIENT VIRTUALIZATION ROUTER
// ============================================================================
function routeUserTo(event, targetRoute) {
  const fullUrl = new URL(targetRoute, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Phase 1: Attempt to find an open instance of Discotive
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            // Tell the active React Router to navigate seamlessly without a hard refresh
            client.postMessage({
              type: "NAVIGATE_ROUTER",
              payload: { route: targetRoute },
            });
            return;
          }
        }
        // Phase 2: If no window exists, cold-boot the OS to the specific route
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      }),
  );
}

// ============================================================================
// 7. LIFECYCLE OVERRIDES (IMMEDIATE TAKEOVER)
// ============================================================================
self.addEventListener("install", (event) => {
  // Bypass the waiting lifecycle phase. We need immediate control.
  self.skipWaiting();
  console.log("[Discotive SW] Installed and dominating main thread.");
});

self.addEventListener("activate", (event) => {
  // Claim all active clients immediately. Zero downtime.
  event.waitUntil(clients.claim());
  console.log("[Discotive SW] Activated. Global routing engaged.");
});
