/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // THIS IS THE FIX: Tells Tailwind to listen to our theme toggle
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#2563eb",
          900: "#1e3a8a",
        },
        dark: {
          DEFAULT: "#121212",
          lighter: "#1e1e1e",
        },
        slate: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#27272a",
          800: "#1e1e1e",
          900: "#121212",
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
