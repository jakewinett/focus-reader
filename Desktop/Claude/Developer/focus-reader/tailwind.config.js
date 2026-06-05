/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
        brand: ['Quicksand', 'sans-serif'],    // wordmark / display
      },
      colors: {
        // Slate Ink — brand neutral, replaces warm gray
        ink: {
          50:  '#f4f6fa',
          100: '#e6ebf3',
          200: '#cdd7e6',
          300: '#adb9ce',
          400: '#8698b3',
          500: '#637895',
          600: '#4d6179',
          700: '#3a4d5f',
          800: '#283a50',
          900: '#1F2E45',   // brand Slate Ink
        },
        // Calm Teal → Focus Blue — brand primary accent
        focus: {
          50:  '#f0faf9',
          100: '#ccefee',
          200: '#99dedc',
          300: '#5cc8c5',
          400: '#25aeab',
          500: '#0E8C8C',   // brand Calm Teal
          600: '#0c7272',   // primary buttons
          700: '#0a5d5d',   // hover
          800: '#084848',
          900: '#053232',
        },
        // Sage — retained for success/calibration states
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
        'fade-in':     'fadeIn 0.3s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'slide-down':  'slideDown 0.25s ease-out',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-100%)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
