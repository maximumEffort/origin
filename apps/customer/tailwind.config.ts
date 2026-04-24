import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#163478', // Origin deep navy
          dark: '#0E2356',
          light: '#E6EEF8',
        },
        gold: {
          DEFAULT: '#C8920A', // Origin gold — swoosh accent
          bright: '#F5C200', // Origin sun yellow
          light: '#FDF3DC',
          text: '#966A07', // WCAG AA on white (4.8:1) — use for text on light backgrounds
        },
        hero: {
          DEFAULT: '#060B14', // Deep dark hero background
        },
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          900: '#111111',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-noto-arabic)', 'system-ui', 'sans-serif'],
        chinese: [
          'PingFang SC',
          'Noto Sans SC',
          'Microsoft YaHei',
          'WenQuanYi Micro Hei',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  // RTL utilities (ms-, me-, ps-, pe-, start-, end-, rtl:, ltr:) are native
  // in Tailwind CSS 3.3+. The tailwindcss-rtl plugin has been removed as it
  // uses the deprecated Tailwind v2 variants() API and is no longer needed.
  plugins: [],
};

export default config;
