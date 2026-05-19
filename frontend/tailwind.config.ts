import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        passport: {
          green: '#2ea043',
          'green-glow': 'rgba(46,160,67,0.1)',
          'green-dim': 'rgba(46,160,67,0.06)',
          azure: '#58a6ff',
          coral: '#f78166',
          red: '#f85149',
          amber: '#d2991d',
          bg: '#0d1117',
          surface: '#161b22',
          'surface-2': '#21262d',
          border: '#30363d',
          'border-2': '#484f58',
          text: '#c9d1d9',
          muted: '#8b949e',
          dim: '#484f58',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'shimmer': 'shimmer 3s infinite linear',
        'slide-up': 'slideUp 0.4s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
        'count-in': 'countIn 0.6s ease',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
        'toast-in': 'toastIn 0.3s ease both',
        'toast-out': 'toastOut 0.3s ease both',
        'live-pulse': 'livePulse 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        countIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        borderPulse: {
          '0%, 100%': { borderColor: 'rgba(46,160,67,0.15)' },
          '50%': { borderColor: 'rgba(46,160,67,0.35)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        toastOut: {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(100%)' },
        },
        livePulse: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(46,160,67,0.4)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 0 6px rgba(46,160,67,0)' },
        },
      },
      borderRadius: {
        'passport': '6px',
        'passport-lg': '8px',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
    },
  },
  plugins: [],
}

export default config
