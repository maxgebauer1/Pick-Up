/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Turf palette — warm, social, clean
        bg: '#f4f6f3',
        surface: '#ffffff',
        ink: '#1b241f',
        muted: '#6d7a71',
        faint: '#98a49b',
        line: '#e4eae4',
        green: {
          DEFAULT: '#1f7a4d',
          deep: '#186640',
          soft: '#e7f3ec',
        },
        // skill-level hues (semantic, separate from the brand accent)
        skill: {
          casual: '#2f9e6a',
          intermediate: '#3f6bd6',
          competitive: '#d9822b',
          all: '#98a49b',
        },
        amber: {
          DEFAULT: '#d9822b',
          soft: '#fbeede',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
        field: '12px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(20, 40, 30, 0.05)',
        lift: '0 8px 24px -12px rgba(20, 40, 30, 0.25)',
        nav: '0 -1px 0 #e4eae4',
      },
    },
  },
  plugins: [],
}
