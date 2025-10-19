import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ─── Core Brand Palette ─────────────────────────────
        usaBlue: '#002868',      // Deep Navy – brand primary
        usaRed: '#BF0A30',       // Bold Red – alerts/destructive
        usaGold: '#FFD700',      // Gold – premium accent
        usaGray: '#F3F4F6',      // Neutral background gray
        usaDark: '#1F2937',      // Deep gray for dark text
        usaLight: '#E5E7EB',     // Light gray for borders/bg

        // ─── Semantic Tokens (recommended for UI use) ───────
        brand: {
          DEFAULT: '#002868',     // Primary brand blue
          hover: '#003B8E',
          light: '#E6EEF8',
          dark: '#00193F',
        },
        accent: {
          DEFAULT: '#FFD700',     // Gold accent
          hover: '#F2C400',
          light: '#FFF6CC',
          dark: '#CCAA00',
        },
        danger: {
          DEFAULT: '#BF0A30',     // Red – destructive
          hover: '#D61A3F',
          light: '#FDE8EC',
          dark: '#7A001D',
        },
        neutral: {
          DEFAULT: '#6B7280',     // Mid gray for text/icons
          light: '#F9FAFB',
          dark: '#111827',
        },
        success: {
          DEFAULT: '#16A34A',
          hover: '#15803D',
          light: '#DCFCE7',
          dark: '#166534',
        },
        info: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#DBEAFE',
          dark: '#1E3A8A',
        },
      },

      // Optional font styling tweaks for consistency
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}

export default config