/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#050505",
        surface: "#111111",
        silver: {
          light: "#E5E7EB",
          DEFAULT: "#D1D5DB",
          dark: "#9CA3AF"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Cinzel', 'serif']
      }
    },
  },
  plugins: [],
}
