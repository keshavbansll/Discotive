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
    } catch {}
    set({ sessionCache: {} });
  },
}));
