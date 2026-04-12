// src/stores/useOnboardingStore.js
// Persisted onboarding state machine — survives refreshes, crashes, tab closes

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const STORE_VERSION = 2; // bump to invalidate stale persisted state

const defaultState = {
  // ── Meta ──────────────────────────────────────────────────────────────────
  step: "gateway", // gateway | auth | identity | baseline | intent | connectors | premium | execution
  uid: null,
  isGoogleUser: false,
  onboardingComplete: false,

  // ── Step 0: Gateway ───────────────────────────────────────────────────────
  gatewayEmail: "",
  emailExists: null, // null | true | false

  // ── Step 1: Auth ─────────────────────────────────────────────────────────
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  avatarUrl: "",

  // ── Step 2: Identity ─────────────────────────────────────────────────────
  username: "",
  usernameAvailable: null, // null | true | false

  // ── Step 3: Baseline ─────────────────────────────────────────────────────
  currentStatus: [], // max 3, mutual exclusivity enforced

  // ── Step 4: Intent & Domain ──────────────────────────────────────────────
  passion: "", // primary domain
  whyHere: [], // motivation tags

  // ── Step 5: Network Seeding ───────────────────────────────────────────────
  followedSeeds: [], // min 3 required

  // ── Step 6: Connectors ───────────────────────────────────────────────────
  github: "",
  twitter: "",
  instagram: "",
  youtube: "",

  // ── UI / Loading ──────────────────────────────────────────────────────────
  loading: false,
  error: "",
};

export const useOnboardingStore = create(
  persist(
    (set, get) => ({
      ...defaultState,

      // ── Field setters ──────────────────────────────────────────────────────
      setField: (field, value) => set({ [field]: value }),
      setStep: (step) => set({ step, error: "" }),
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),
      clearError: () => set({ error: "" }),

      // ── Baseline status with mutual exclusivity ────────────────────────────
      toggleStatus: (value) => {
        const { currentStatus } = get();
        const selfEmployed = ["Entrepreneur", "Creator / Freelancer"];

        if (value === "None") {
          set({
            currentStatus: currentStatus.includes("None") ? [] : ["None"],
          });
          return;
        }

        let next = currentStatus.filter((s) => s !== "None");
        if (next.includes(value)) {
          next = next.filter((s) => s !== value);
        } else {
          if (value === "Working Professional") {
            next = next.filter((s) => !selfEmployed.includes(s));
          } else if (selfEmployed.includes(value)) {
            next = next.filter((s) => s !== "Working Professional");
          }
          if (next.length < 3) next.push(value);
        }
        set({ currentStatus: next });
      },

      // ── Why here tags ──────────────────────────────────────────────────────
      toggleWhyHere: (tag) => {
        const { whyHere } = get();
        set({
          whyHere: whyHere.includes(tag)
            ? whyHere.filter((t) => t !== tag)
            : whyHere.length < 5
              ? [...whyHere, tag]
              : whyHere,
        });
      },

      // ── Network seeding ────────────────────────────────────────────────────
      toggleSeed: (id) => {
        const { followedSeeds } = get();
        set({
          followedSeeds: followedSeeds.includes(id)
            ? followedSeeds.filter((s) => s !== id)
            : [...followedSeeds, id],
        });
      },

      // ── Full reset (post-complete or logout) ──────────────────────────────
      reset: () => set(defaultState),
    }),
    {
      name: "discotive-onboarding-v" + STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Never persist sensitive fields
        const { password, loading, error, ...rest } = state;
        return rest;
      },
    },
  ),
);
