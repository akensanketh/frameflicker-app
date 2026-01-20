/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#ff1f1f",   // The FrameFlicker Red
          black: "#000000", // Pure Black
          dark: "#121212",  // Slightly lighter black for cards
        }
      }
    },
  },
  plugins: [],
}