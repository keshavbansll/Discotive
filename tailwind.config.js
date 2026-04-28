/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // THE GOLD & VOID PROTOCOL
        gold: {
          base: "#BFA264",
          bright: "#D4AF78",
          deep: "#8B7240",
          light: "#E8D5A3",
          dim: "rgba(191, 162, 100, 0.08)",
          border: "rgba(191, 162, 100, 0.25)",
        },
        void: {
          DEFAULT: "#030303", // Absolute Background
          depth: "#0A0A0A", // Underlays
          surface: "#0F0F0F", // Cards
          elevated: "#141414", // Modals
        },
        text: {
          primary: "#F5F0E8",
          secondary: "rgba(245, 240, 232, 0.60)",
          dim: "rgba(245, 240, 232, 0.28)",
        },
        status: {
          success: "#4ADE80",
          error: "#F87171",
          warning: "#F59E0B",
          border: "rgba(255, 255, 255, 0.07)",
        },
      },
      boxShadow: {
        // Psychological depth: Ambient glows instead of harsh Web 2.0 drop shadows
        "gold-glow": "0 0 20px rgba(191, 162, 100, 0.15)",
        "gold-glow-intense": "0 0 30px rgba(212, 175, 120, 0.3)",
        "void-elevation": "0 10px 40px -10px rgba(0,0,0,0.8)",
      },
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
      animation: {
        // 60fps GPU accelerated fluid animations
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(15px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
