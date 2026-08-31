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
        'nc-accent': '#E50914',
        'nc-pro': '#F43F5E',
        'nc-blue': '#E50914',
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
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"SF Pro"', '"Segoe UI"', 'Inter', 'Roboto', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        apple: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"SF Pro"', '"Segoe UI"', 'Inter', 'Roboto', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro"', '"Segoe UI"', 'Inter', 'Roboto', 'sans-serif'],
        condensed: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Inter', 'sans-serif'],
        outfit: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Inter', 'sans-serif'],
        inter: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'sans-serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro"', 'Inter', 'sans-serif'],
      },
      letterSpacing: {
        tighter: '0.015em',
        tight: '0.025em',
        normal: '0.035em',
        wide: '0.05em',
        wider: '0.08em',
        widest: '0.12em',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
