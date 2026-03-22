/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: '#1A9BA0',
        'teal-light': 'rgba(26,155,160,0.10)',
        gold: '#B8860B',
        'gold-light': 'rgba(184,134,11,0.10)',
      },
      fontFamily: {
        syne:    ['Cormorant Garamond', 'serif'],
        outfit:  ['DM Sans', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
