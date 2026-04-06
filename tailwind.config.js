/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // True minimalist palette
        primary: {
          DEFAULT: "#ffffff", // Primary CTA is now stark white
          50: "#fafa",
          100: "#f4f4f5",
          600: "#ffffff",
          900: "#27272a",
        },
        dark: {
          DEFAULT: "#0a0a0a", // Deep aesthetic black
          lighter: "#121212", // Slightly elevated black for cards
        },
        slate: {
          // Overriding default slate to be neutral zinc/greys
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#27272a",
          800: "#18181b",
          900: "#0a0a0a",
          950: "#000000",
        },
      },
      fontFamily: {
        // Inter is great, but we will use tight tracking in the code to make it look premium
        sans: ["Inter", "sans-serif"],
        serif: ["Georgia", "serif"], // For aesthetic accents
      },
    },
  },
  plugins: [],
};
