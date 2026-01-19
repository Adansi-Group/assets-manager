/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        adansi: {
          green: "#0a7a55",
          dark: "#064e3b",
        },
      },
    },
  },
  plugins: [],
};




