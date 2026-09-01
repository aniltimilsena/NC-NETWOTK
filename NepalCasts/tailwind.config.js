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
        'nc-accent': '#522C69',
        'nc-pro': '#522C69',
        'nc-blue': '#522C69',
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
        sans: ['Inter', 'Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        apple: ['Inter', 'Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        display: ['Inter', 'Figtree', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        inter: ['Inter', '-apple-system', 'sans-serif'],
        body: ['Inter', 'Figtree', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        snug: '-0.01em',
        normal: '0em',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
