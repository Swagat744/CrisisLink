/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        crisis: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#D97706',
          green: '#16A34A',
          blue: '#1D4ED8',
          dark: '#0F172A',
          panel: '#1E293B',
          border: '#334155',
          muted: '#64748B',
          light: '#F1F5F9',
        }
      }
    },
  },
  plugins: [],
}
