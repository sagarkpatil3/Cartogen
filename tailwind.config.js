/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        surface: { 
          DEFAULT: '#0b0f19', 
          sunk: '#05070d', 
          raised: '#141c2e',
          overlay: '#1a243b',
        },
        edge: 'rgba(255, 255, 255, 0.08)',
        accent: { 
          DEFAULT: '#38bdf8', 
          hover: '#0284c7',
          glow: 'rgba(56, 189, 248, 0.25)',
        },
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 20px -3px rgba(56, 189, 248, 0.3)',
      },
    },
  },
  plugins: [],
};