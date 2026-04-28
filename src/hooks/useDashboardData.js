import { useQuery } from "@tanstack/react-query";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const fetchDashboardCore = async (uid) => {
  // MAANG Fix: Execution Map is deprecated. Do not waste a read.
  const userSnap = await getDoc(doc(db, "users", uid));
  const user = userSnap.exists() ? { uid, ...userSnap.data() } : null;
  return {
    user,
    nodesCount: 0, // Deprecated
  };
};

const fetchScoreHistory = async (uid, tf) => {
  const daily = {};
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  const scores =
    tf === "ALL" ? data.monthly_scores || {} : data.daily_scores || {};
  return Object.keys(scores)
    .map((d) => ({ date: d, score: scores[d] }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(tf === "1W" ? -7 : tf === "1M" ? -30 : 0);
};

const fetchPercentiles = async (uid, score, userData) => {
  const ref = collection(db, "users");
  const domain = userData?.identity?.domain || null;
  const niche = userData?.identity?.niche || null;

  const [globalAbove, domainAbove, nicheAbove] = await Promise.all([
    getCountFromServer(query(ref, where("discotiveScore.current", ">", score))),
    domain
      ? getCountFromServer(
          query(
            ref,
            where("identity.domain", "==", domain),
            where("discotiveScore.current", ">", score),
          ),
        )
      : null,
    niche
      ? getCountFromServer(
          query(
            ref,
            where("identity.niche", "==", niche),
            where("discotiveScore.current", ">", score),
          ),
        )
      : null,
  ]);

  const [globalTotal, domainTotal, nicheTotal] = await Promise.all([
    getCountFromServer(query(ref, where("onboardingComplete", "==", true))),
    domain
      ? getCountFromServer(query(ref, where("identity.domain", "==", domain)))
      : null,
    niche
      ? getCountFromServer(query(ref, where("identity.niche", "==", niche)))
      : null,
  ]);

  const pct = (above, total) =>
    total && total.data().count > 0
      ? Math.max(
          1,
          Math.ceil(((above.data().count + 1) / total.data().count) * 100),
        )
      : 100;

  return {
    global: pct(globalAbove, globalTotal),
    domain: domain ? pct(domainAbove, domainTotal) : 100,
    niche: niche ? pct(nicheAbove, nicheTotal) : 100,
    previousGlobal: null, // populated from cached value below
  };
};

export const useDashboardCore = () => {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["dashboard-core", currentUser?.uid],
    queryFn: () => fetchDashboardCore(currentUser.uid),
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 3,
  });
};

export const useScoreHistory = (tf) => {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["score-history", currentUser?.uid, tf],
    queryFn: () => fetchScoreHistory(currentUser.uid, tf),
    enabled: !!currentUser?.uid,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePercentiles = (score, userData) => {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ["percentiles", currentUser?.uid, score],
    queryFn: () => fetchPercentiles(currentUser.uid, score, userData),
    enabled: !!currentUser?.uid && score >= 0,
    // MAANG Fix: Set to 12 hours. Prevents getCountFromServer from destroying our Firebase quota.
    staleTime: 1000 * 60 * 60 * 12,
    gcTime: 1000 * 60 * 60 * 24,
  });
};
