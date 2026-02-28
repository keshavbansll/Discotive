/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb", // Core Discotive Blue
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#2563eb",
          900: "#1e3a8a",
        },
        dark: {
          DEFAULT: "#121212", // Premium matte black
          lighter: "#1e1e1e", // Dark grey for cards and surfaces
        },
        // Overwriting 'slate' for a premium matte black/grey aesthetic
        slate: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#27272a",
          800: "#1e1e1e", // Matte dark grey for borders/cards
          900: "#121212", // Matte black for backgrounds/sidebars
          950: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
