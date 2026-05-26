/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f5f4f2',
          100: '#e8e6e1',
          200: '#d1cec6',
          300: '#b3afa4',
          400: '#8e8a7e',
          500: '#6e6a5f',
          600: '#55524a',
          700: '#3e3c36',
          800: '#28261f',
          900: '#161510',
        },
        focus: {
          50:  '#eef6ff',
          100: '#daeaff',
          200: '#bed9ff',
          300: '#91c0ff',
          400: '#609cff',
          500: '#3b77fc',
          600: '#2256f1',
          700: '#1a42de',
          800: '#1c37b4',
          900: '#1c328e',
        },
        sage: {
          50:  '#f2f7f4',
          100: '#e0ede6',
          200: '#c2dacc',
          300: '#97bfa8',
          400: '#679f80',
          500: '#448262',
          600: '#33684e',
          700: '#28533f',
          800: '#214232',
          900: '#1b3629',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
