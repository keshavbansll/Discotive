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
      fontFamily: {
        display: ["Montserrat", "sans-serif"],
        body: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: [],
};
