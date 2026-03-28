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
        base: '#080c10',
        'base-light': '#0d1117',
        'base-mid': '#111820',
        border: '#1e2832',
        'border-bright': '#2a3540',
        text: '#e8e8e8',
        'text-dim': '#8a9bb0',
        'text-muted': '#4a5568',
        red: '#e63946',
        'red-dim': '#7a1c23',
        green: '#00ff88',
        'green-dim': '#005e32',
        amber: '#f4a261',
        'amber-dim': '#7a4f2e',
        cyan: '#00d4ff',
        'cyan-dim': '#005e72',
      },
      fontFamily: {
        mono: ['"Syne Mono"', '"JetBrains Mono"', 'Courier New', 'monospace'],
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'pulse-red': 'pulse-red 1s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-down': 'slide-down 0.3s ease forwards',
        'flicker': 'flicker 0.15s infinite',
        'glow-green': 'glow-green 2s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-red': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 8px #e63946' },
          '50%': { opacity: '0.6', boxShadow: '0 0 20px #e63946' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'glow-green': {
          '0%, 100%': { boxShadow: '0 0 4px #00ff88, 0 0 8px #00ff8840' },
          '50%': { boxShadow: '0 0 12px #00ff88, 0 0 24px #00ff8870' },
        },
      },
    },
  },
  plugins: [],
}
