/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a5f',
          950: '#1e293b',
        },
        secondary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#78350f',
        },
        tertiary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          base: '#f8fafc',
          containerLowest: '#ffffff',
          containerLow: '#f1f5f9',
          container: '#e2e8f0',
          containerHigh: '#cbd5e1',
          containerHighest: '#94a3b8',
        },
        background: '#f1f5f9',
        onSurface: {
          base: '#0f172a',
          variant: '#64748b',
        },
        outline: {
          base: '#cbd5e1',
          variant: '#e2e8f0',
        },
        error: {
          base: '#dc2626',
          container: '#fee2e2',
          onBase: '#ffffff',
          onContainer: '#991b1b',
        },
        success: {
          base: '#16a34a',
          container: '#dcfce7',
          onBase: '#ffffff',
          onContainer: '#15803d',
        },
        warning: {
          base: '#ea580c',
          container: '#fff7ed',
          onBase: '#ffffff',
          onContainer: '#c2410c',
        },
      },
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        label: ['DM Sans', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        title: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(30, 41, 59, 0.08)',
        'medium': '0 4px 12px -3px rgba(30, 41, 59, 0.08)',
        'strong': '0 8px 25px -5px rgba(30, 41, 59, 0.08)',
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
        'fade-in-up-delay': 'fade-in-up 0.6s ease-out 0.15s forwards',
        'slide-in-left': 'slideInLeft 0.3s ease-out forwards',
      },
      keyframes: {
        'fade-in-up': {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideInLeft': {
          'from': { transform: 'translateX(-100%)' },
          'to': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
