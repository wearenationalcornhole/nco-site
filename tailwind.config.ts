import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        usaRed: '#B31942',
        usaWhite: '#FFFFFF',
        usaBlue: '#0A3161',
        ncoGray: '#F3F4F6'
      },
      borderRadius: { '2xl': '1.25rem' },
      boxShadow: { soft: '0 8px 30px rgba(0,0,0,0.08)' }
    },
  },
  plugins: [],
} satisfies Config
