import { useEffect, useState, useRef } from "react";
import { ref, onValue, off } from "firebase/database";
import { rtdb } from "../firebase";

const TELEMETRY_TEMPLATES = [
  (d) => `⚡ @${d.username} gained +${d.pts} pts in ${d.domain}`,
  (d) => `🔥 @${d.username} is on a ${d.streak}-day streak`,
  (d) => `📦 @${d.username} verified a new vault asset`,
  (d) => `🏹 A Level ${d.level} operator entered your domain`,
  (d) => `📈 ${d.domain} domain avg score rose ${d.delta} pts today`,
];

export const useTelemetryStream = (userData) => {
  const [events, setEvents] = useState([]);
  const bufferRef = useRef([]);

  useEffect(() => {
    if (!userData?.uid) return;

    const domain = userData?.identity?.domain || "General";
    const telemetryRef = ref(rtdb, `global_telemetry/latest`);

    const handler = onValue(telemetryRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      const entries = Object.values(val).slice(-8);
      const formatted = entries.map((e, i) => ({
        id: `${Date.now()}_${i}`,
        text: TELEMETRY_TEMPLATES[i % TELEMETRY_TEMPLATES.length]({
          username: e.username || "operator",
          pts: e.pts || Math.floor(Math.random() * 30 + 5),
          domain: e.domain || domain,
          streak: e.streak || Math.floor(Math.random() * 20 + 3),
          level: e.level || Math.floor(Math.random() * 8 + 1),
          delta: e.delta || Math.floor(Math.random() * 15 + 2),
        }),
        ts: e.ts || Date.now(),
        type: e.type || "score",
      }));
      setEvents(formatted.reverse());
    });

    return () => off(telemetryRef, "value", handler);
  }, [userData?.uid, userData?.identity?.domain]);

  return events;
};
