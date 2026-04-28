import { useEffect, useRef } from "react";
import {
  ref,
  onValue,
  off,
  set,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";
import { rtdb } from "../firebase";
import { useConnectiveStore } from "../stores/useConnectiveStore";
import { useAuth } from "../contexts/AuthContext";

export const useRTDBPresence = (userData) => {
  const { currentUser } = useAuth();
  const { setOnlineCount, pushLiveEvent, setLiveEvents } = useConnectiveStore();

  // Track mutable data without triggering effect re-runs
  const userMeta = useRef({ username: "operator", domain: "General" });
  useEffect(() => {
    userMeta.current = {
      username: userData?.identity?.username || "operator",
      domain: userData?.identity?.domain || "General",
    };
  }, [userData?.identity?.username, userData?.identity?.domain]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const presenceRef = ref(rtdb, `presence/${currentUser.uid}`);
    const connRef = ref(rtdb, ".info/connected");

    const connHandler = onValue(connRef, (snap) => {
      if (!snap.val()) return;
      set(presenceRef, {
        online: true,
        uid: currentUser.uid,
        username: userMeta.current.username,
        domain: userMeta.current.domain,
        ts: serverTimestamp(),
      });
      // MAANG Fix: Cancel any queued disconnects before setting a new one to prevent server-side memory leaks
      onDisconnect(presenceRef)
        .cancel()
        .then(() => {
          onDisconnect(presenceRef).set({
            online: false,
            ts: serverTimestamp(),
          });
        });
    });

    const presenceListRef = ref(rtdb, "presence");
    const presenceHandler = onValue(presenceListRef, (snap) => {
      const val = snap.val() || {};
      const count = Object.values(val).filter((v) => v?.online).length;
      setOnlineCount(count);
    });

    const telemetryRef = ref(rtdb, "global_telemetry/latest");
    const telemetryHandler = onValue(telemetryRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      const entries = Object.entries(val)
        .sort(([, a], [, b]) => (b?.ts || 0) - (a?.ts || 0))
        .slice(0, 12)
        .map(([id, e]) => ({ id, ...e }));
      setLiveEvents(entries);
    });

    return () => {
      off(connRef, "value", connHandler);
      off(presenceListRef, "value", presenceHandler);
      off(telemetryRef, "value", telemetryHandler);
      set(presenceRef, { online: false, ts: serverTimestamp() });
    };
  }, [setLiveEvents, setOnlineCount, currentUser?.uid]);
};
