/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Cool, slightly blue-tinted neutrals used everywhere as `gray-*`.
        gray: {
          50: '#f5f7fb',
          100: '#e9ecf3',
          200: '#d0d6e2',
          300: '#aab3c5',
          400: '#7f8aa0',
          500: '#5e687d',
          600: '#454d5e',
          700: '#2c3240',
          800: '#1d212b',
          900: '#13161d',
          950: '#090b10',
        },
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 10px 30px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(129,140,248,0.35), 0 8px 24px -8px rgba(99,102,241,0.55)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
