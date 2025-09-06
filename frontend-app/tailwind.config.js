/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Rutas que tu proyecto SÍ necesita, basadas en tu código original
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',

    // Rutas explícitas a tus paquetes - más específicas para evitar node_modules
    './packages/desktop/components/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/desktop/store/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/desktop/apps/**/*.{js,ts,jsx,tsx,mdx}',
    './packages/three-react/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Main theme colors
        'dark-bg': '#0a0a0a',
        'primary-text': '#f5f5f5',
        'secondary-text': '#b3b3b3',
        'muted-text': '#666666',
        // Accent colors for futuristic OS theme
        'accent-cyan': '#00f2ff',
        'accent-magenta': '#ff00aa',
        'accent-purple': '#8b5cf6',
        'accent-blue': '#0070f3',
        'accent-green': '#00ff88',
        // Glass morphism colors
        'glass-bg': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
        'glass-dark': 'rgba(0, 0, 0, 0.2)',
        // Surface colors
        'surface-dark': '#161616',
        'surface-medium': '#262626',
        'surface-light': '#404040',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}