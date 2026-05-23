/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2f6b3f',
          dark: '#234f30',
          light: '#e7f1ea',
        },
      },
    },
  },
  plugins: [],
};
