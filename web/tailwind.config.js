/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0714',
          900: '#0F0B1F',
          850: '#15102A',
          800: '#1A1333',
          700: '#241A47',
          600: '#332560',
        },
        violet: {
          50:  '#F5F2FF',
          100: '#EBE4FF',
          200: '#D4C5FF',
          300: '#B794F6',
          400: '#9B72F2',
          500: '#7C5CFF',
          600: '#6845E8',
          700: '#5333C7',
          800: '#3F2699',
          900: '#2D1B6E',
        },
        mist: {
          50:  '#FDFCFF',
          100: '#F7F5FC',
          200: '#ECE8F7',
          300: '#D9D3EC',
          400: '#A89FC4',
          500: '#7A7196',
          600: '#5C5577',
        },
        gold: {
          400: '#F0C674',
          500: '#E0AD4F',
        },
        success: { 50: '#EEFBF3', 500: '#2DD4A0', 600: '#16A876' },
        warning: { 50: '#FEF8EC', 500: '#E0AD4F', 600: '#C18E2E' },
        danger:  { 50: '#FDF0F2', 500: '#EF5D78', 600: '#D43E5C' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        sans:    ['var(--font-sans)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        xl:  '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        glass:    '0 8px 32px rgba(15, 11, 31, 0.08)',
        'glass-lg': '0 24px 64px rgba(15, 11, 31, 0.16)',
        violet:   '0 8px 24px rgba(124, 92, 255, 0.25)',
        'violet-lg': '0 16px 48px rgba(124, 92, 255, 0.35)',
        glow:     '0 0 40px rgba(124, 92, 255, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};