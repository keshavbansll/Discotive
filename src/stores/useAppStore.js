import { create } from "zustand";

export const useAppStore = create((set, get) => ({
  userData: null,
  sessionCache: {},
  notifications: [],
  setUserData: (data) => set({ userData: data }),
  patchUserData: (fields) =>
    set((s) => ({ userData: { ...s.userData, ...fields } })),
  setNotifications: (n) => set({ notifications: n }),
  flushCache: () => {
    try {
      indexedDB.deleteDatabase("discotive-cache");
      localStorage.removeItem("discotive-query-cache");
      // Ensure all persisted Zustand stores are nuked on logout
      localStorage.removeItem("discotive-onboarding-v2");
    } catch (err) {
      console.warn("[System] Cache flush interrupted:", err);
    }
    set({ sessionCache: {} });
  },
}));
