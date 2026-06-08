import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#0A0A0B',
        surface: '#1A1A1B',
        surface2: '#2A2A2B',
        lime: '#DEFF9A',
        warning: '#FFB444',
        critical: '#FF4444',
        muted: '#6A6A6B',
        ok: '#DEFF9A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
