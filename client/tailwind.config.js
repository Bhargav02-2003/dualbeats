/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f0f',
        bgSecondary: '#161616',
        card: '#1a1a1a',
        cardHover: '#242424',
        border: '#2a2a2a',
        // YouTube Music red
        accent: '#ff0000',
        accentLight: '#ff4444',
        accentDark: '#cc0000',
        accentMuted: 'rgba(255,0,0,0.12)',
        text: {
          primary: '#ffffff',
          secondary: '#aaaaaa',
          muted: '#717171',
        },
        success: '#00b894',
        error: '#ff4444',
        warning: '#fdcb6e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 1.5s linear infinite',
        'bounce-bar': 'bounceBar 1s ease-in-out infinite alternate',
        'equalizer': 'equalizer 0.8s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceBar: {
          '0%': { transform: 'scaleY(0.4)' },
          '100%': { transform: 'scaleY(1)' },
        },
        equalizer: {
          '0%': { height: '4px' },
          '100%': { height: '16px' },
        },
      },
    },
  },
  plugins: [],
}
