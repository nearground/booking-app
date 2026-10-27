/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
    extend: {
      colors: {
        brand: '#2f855a',
        'brand-secondary': '#cbae37',
      },
      fontFamily: {
        sans: ['Jost', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
