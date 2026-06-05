/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060816',
        panel: '#0B1020',
        primary: '#00D9FF',
        secondary: '#8B5CF6',
        accent: '#00FFA3',
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px #3b82f6' },
          '100%': { boxShadow: '0 0 20px #a855f7, 0 0 30px #06b6d4' }
        }
      }
    },
  },
  plugins: [],
}
