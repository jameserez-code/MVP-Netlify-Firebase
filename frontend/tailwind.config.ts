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
        'slide-in-right-item': 'slideInRightItem 0.25s ease both',
        'fade-in-up': 'fadeInUp 0.5s ease both',
        'badge-glow': 'badgeGlow 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'counter-pulse': 'counterPulse 2s ease-in-out infinite',
        'star-hover': 'starHover 0.3s ease both',
        'autofocus-ring': 'autofocusRing 0.6s ease-out both',
        'connect-line': 'connectPulse 2s ease-in-out infinite',
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
        fadeOut: {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
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
        slideInRightItem: {
          from: { transform: 'translateX(16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        badgeGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(46,160,67,0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(46,160,67,0.1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(46,160,67,0.15)', boxShadow: '0 0 8px rgba(46,160,67,0.05)' },
          '50%': { borderColor: 'rgba(46,160,67,0.4)', boxShadow: '0 0 16px rgba(46,160,67,0.12)' },
        },
        counterPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(46,160,67,0.3)' },
          '50%': { boxShadow: '0 0 0 4px rgba(46,160,67,0)' },
        },
        starHover: {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.25)' },
        },
        autofocusRing: {
          '0%': { boxShadow: '0 0 0 0px rgba(88,166,255,0.4)' },
          '50%': { boxShadow: '0 0 0 4px rgba(88,166,255,0.1)' },
          '100%': { boxShadow: '0 0 0 0px rgba(88,166,255,0)' },
        },
        connectPulse: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
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
