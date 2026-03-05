import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f9f7',
          100: '#d5ebe2',
          200: '#b7ddce',
          300: '#88c5ae',
          400: '#56ab8c',
          500: '#2f8f71',
          600: '#206d54',
          700: '#164f3d',
          800: '#103c2e',
          900: '#0a291f'
        }
      },
      boxShadow: {
        soft: '0 10px 35px rgba(16, 44, 37, 0.12)'
      }
    }
  },
  plugins: [],
};

export default config;
