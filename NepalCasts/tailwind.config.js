/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'nc-dark': '#0a0a0a',
        'nc-darker': '#050505',
        'nc-surface': '#111111',
        'nc-card': '#1a1a1a',
        'nc-border': '#222222',
        'nc-accent': '#00BFFF',
        'nc-pro': '#FFD700',
        'nc-blue': '#00BFFF',
        'nc-text': '#FFFFFF',
        'nc-secondary': '#CCCCCC',
        'nc-muted': '#666666',
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
        display: ['Outfit', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
