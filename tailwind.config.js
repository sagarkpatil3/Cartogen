/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#0f172a', sunk: '#020617', raised: '#1e293b' },
        edge: '#1e293b',
        accent: { DEFAULT: '#4f46e5', hover: '#6366f1' },
      },
    },
  },
  plugins: [],
};