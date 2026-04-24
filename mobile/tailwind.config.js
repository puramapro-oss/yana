/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // YANA palette — mirror de src/lib/theme.ts + web globals.css
        accent: {
          primary: '#F97316',
          secondary: '#0EA5E9',
          tertiary: '#7C3AED',
        },
        'bg-void': '#03040a',
        'bg-deep': '#04120c',
        'bg-nebula': '#080b16',
        'bg-card': 'rgba(255,255,255,0.025)',
        'bg-card-hover': 'rgba(255,255,255,0.05)',
        'text-primary': '#f0f2ff',
        'text-secondary': 'rgba(255,255,255,0.72)',
        'text-muted': 'rgba(255,255,255,0.58)',
        border: 'rgba(255,255,255,0.06)',
      },
      spacing: {
        // Fibonacci tokens — synchronisés avec P6.C4 web globals.css
        'fib-8': 8,
        'fib-13': 13,
        'fib-21': 21,
        'fib-34': 34,
        'fib-55': 55,
        'fib-89': 89,
      },
      borderRadius: {
        fib: 8,
        'fib-13': 13,
        'fib-21': 21,
      },
      aspectRatio: {
        phi: '1.618 / 1',
      },
    },
  },
  plugins: [],
}
