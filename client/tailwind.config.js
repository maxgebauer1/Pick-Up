/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: '#050815',
        surface: '#0B1220',
        'text-primary': '#FFFFFF', // Pure white for main headings
        'text-secondary': '#E5E7EB', // Light grey for body text
        'text-muted': '#FFB366', // Light orange for accents and secondary info (closer to white)
        'accent-primary': '#00F0FF',
        'accent-secondary': '#FFB366', // Light orange (closer to white but still orange)
        success: '#22C55E',
        error: '#F87171',
        'border-subtle': '#1F2937',
        divider: 'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'heading-1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-2': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
      },
      borderRadius: {
        'card': '20px',
        'pill': '9999px',
        'smooth': '16px',
        'round': '24px',
      },
      boxShadow: {
        'sleek': '0 2px 8px rgba(0, 240, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.4)',
        'sleek-hover': '0 4px 16px rgba(0, 240, 255, 0.12), 0 12px 32px rgba(0, 0, 0, 0.5)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 2px 6px rgba(0, 240, 255, 0.1), 0 8px 20px rgba(0, 0, 0, 0.3)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
} 