import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1B5299', // Origin navy blue
          dark:    '#0F3A72',
          light:   '#E6EEF8',
        },
        gold: {
          DEFAULT: '#C8920A', // Origin gold
          light:   '#FDF3DC',
        },
      },
    },
  },
  plugins: [],
};

export default config;
