/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bistro: {
          dark: '#1A1A1A',
          gold: '#D4AF37',
          light: '#F8F9FA'
        }
      }
    },
  },
  plugins: [],
}