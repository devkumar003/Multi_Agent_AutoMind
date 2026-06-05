/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        inverse: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        panel: 'var(--bg-panel)',
        'panel-hover': 'var(--bg-panel-hover)',
        
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        
        'border-light': 'var(--border-light)',
        'border-medium': 'var(--border-medium)',
        'border-focus': 'var(--border-focus)',
        
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-success': 'var(--accent-success)',
        'accent-warning': 'var(--accent-warning)',
        'accent-danger': 'var(--accent-danger)',
      },
      animation: {
        glow: 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px var(--accent-primary)' },
          '100%': { boxShadow: '0 0 20px var(--accent-secondary), 0 0 30px var(--accent-primary)' }
        }
      }
    },
  },
  plugins: [],
}
