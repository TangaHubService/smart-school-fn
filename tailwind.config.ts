import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'dashboard-blue': '#173C7F',
        'content-bg': '#F0F2F5',
        brand: {
          50: '#EFF4FB',
          100: '#DCE7F7',
          200: '#BFD1EE',
          300: '#93B4DF',
          400: '#5E8FCC',
          500: '#1E5AA8',
          600: '#174A8A',
          700: '#153E73',
          800: '#12325D',
          900: '#0F2748',
          950: '#0A1B33',
        },
        success: {
          50: '#EDF8F1',
          100: '#D3EDDD',
          500: '#1F8A4C',
          600: '#18703E',
          700: '#125832',
        },
        accent: {
          50: '#FEF8E7',
          100: '#FCEFC0',
          500: '#F2C94C',
          600: '#D5AD2B',
        },
        danger: {
          50: '#FEF3F2',
          100: '#FEE4E2',
          500: '#D92D20',
          600: '#B42318',
          700: '#912018',
        }
      },
      boxShadow: {
        soft: '0 12px 28px rgba(30, 90, 168, 0.10)',
      }
    }
  },
  plugins: [],
};

export default config;
