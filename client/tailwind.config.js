/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hostile: '#ef4444',
        diplomatic: '#3b82f6',
        mercantile: '#eab308',
        scientific: '#10b981',
      }
    },
  },
  plugins: [],
}
