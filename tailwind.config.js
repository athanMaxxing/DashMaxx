/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Saira', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Saira Condensed"', 'Saira', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Near-black neutrals with a slight violet tint, used everywhere as `gray-*`.
        gray: {
          50: '#f6f5fa',
          100: '#efedf7',
          200: '#d9d5e6',
          300: '#b7b1c9',
          400: '#958faa',
          500: '#757090',
          600: '#4d4860',
          700: '#2f2b3d',
          800: '#1d1a28',
          900: '#110f19',
          950: '#07070d',
        },
        /*
         * The brand colour (the logo's pink-violet). Every `indigo-*` class in the
         * app is the brand accent, so remapping it here re-colours the whole app.
         */
        indigo: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
      },
      // Sharp, broadcast-style corners. `full` stays round for dots.
      borderRadius: {
        sm: '1px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '3px',
        '2xl': '4px',
        '3xl': '6px',
      },
      boxShadow: {
        card: '0 10px 30px -14px rgba(0,0,0,0.8)',
        glow: '0 8px 24px -8px rgba(217,70,239,0.6)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out both',
      },
    },
  },
  plugins: [],
}
