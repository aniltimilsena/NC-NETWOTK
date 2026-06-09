/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'nc-dark': '#0A0A0F',
        'nc-darker': '#050507',
        'nc-surface': '#12121A',
        'nc-card': '#1A1A26',
        'nc-border': '#2A2A3A',
        'nc-accent': '#38BDF8',
        'nc-pro': '#FACC15',
        'nc-blue': '#4A90D9',
        'nc-text': '#FFFFFF',
        'nc-secondary': '#B0B0C3',
        'nc-muted': '#6B6B80',
        // Admin Dashboard Semantic Colors
        'admin-primary': '#38BDF8',
        'admin-secondary': '#E0F2FE', // Very light sky blue/white
        'admin-success': '#10B981',
        'admin-warning': '#F59E0B',
        'admin-error': '#EF4444',
        'admin-bg': '#050507',
        'admin-surface': '#0F1117',
        'admin-surface-light': '#1A1D25',
        'admin-border': '#262A33',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
