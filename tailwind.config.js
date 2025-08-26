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
        myOrange: {
          DEFAULT: '#FF3403',
          50: '#FFF5F3',
          100: '#FFE8E3',
          200: '#FFD1C7',
          300: '#FFB3A3',
          400: '#FF8A6B',
          500: '#FF3403',
          600: '#E62E00',
          700: '#BF2600',
          800: '#991E00',
          900: '#7D1900',
        },
      },
    },
  },
  plugins: [],
}
