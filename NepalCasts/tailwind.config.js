/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'nc-dark': '#141414',
        'nc-darker': '#0a0a0a',
        'nc-surface': '#000000',
        'nc-card': '#000000',
        'nc-border': '#222222',
        'nc-accent': '#ffb400',
        'nc-pro': '#ffb400',
        'nc-blue': '#ffb400',
        'nc-text': '#E2E8F0',
        'nc-secondary': '#CCCCCC',
        'nc-muted': '#666666',
        // Admin Dashboard Semantic Colors
        'admin-primary': '#38BDF8',
        'admin-secondary': '#E0F2FE', // Very light sky blue/white
        'admin-success': '#10B981',
        'admin-warning': '#F59E0B',
        'admin-error': '#EF4444',
        'admin-bg': '#141414',
        'admin-surface': '#0F1117',
        'admin-surface-light': '#1A1D25',
        'admin-border': '#262A33',
      },
      fontFamily: {
        sans: ['Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'Roboto', 'sans-serif'],
        apple: ['Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'Roboto', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        display: ['Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'Roboto', 'sans-serif'],
        condensed: ['Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
        outfit: ['Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Inter', 'sans-serif'],
        inter: ['Inter', 'Figtree', '-apple-system', 'sans-serif'],
        body: ['Figtree', '-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '0.02em',
        tight: '0.035em',
        normal: '0.045em',
        wide: '0.065em',
        wider: '0.09em',
        widest: '0.14em',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
