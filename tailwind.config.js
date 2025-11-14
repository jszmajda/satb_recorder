/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Voice part colors (VOICE-004)
        soprano: '#ef4444',    // red
        alto: '#3b82f6',       // blue
        tenor: '#22c55e',      // green
        bass: '#a855f7',       // purple
      },
    },
  },
  plugins: [],
}
