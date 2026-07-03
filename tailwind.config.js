export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core brand palette ──────────────────────────────────
        ink: '#101820',       // primary dark
        cream: '#fbf6f3',     // off-white background

        // ── Override stone to warm neutrals (light end) → ink (dark end) ──
        stone: {
          50:  '#fbf6f3',   // cream — app background
          100: '#f0ebe7',   // light panels
          200: '#e2d9d2',   // borders
          300: '#c8bcb4',   // muted borders
          400: '#a0918a',   // placeholder / disabled text
          500: '#7a6e68',   // secondary text
          600: '#5a5048',   // body text muted
          700: '#3c3430',   // body text
          800: '#252220',   // near-dark
          900: '#181614',   // deep
          950: '#101820',   // = ink
        },

        // ── Brand accent: ink-dark (CTAs, active states) ──
        brand: {
          50:  '#f0f2f4',
          100: '#d8dde4',
          200: '#b5bec8',
          300: '#8896a6',
          400: '#586878',   // focus rings / subtle accents
          500: '#101820',   // primary CTA / active
          600: '#0e151e',
          700: '#101820',   // same as 500 — used for text accents
          800: '#0a0e14',
          900: '#070a0e',
          950: '#040608',
        },
      },

      fontFamily: {
        serif: ['NyghtSerif', 'Georgia', 'serif'],
        sans:  ['Aeonik', 'system-ui', '-apple-system', 'sans-serif'],
      },

      fontWeight: {
        // Aeonik weights available
        normal:  '400',
        medium:  '500',
        black:   '900',
      },
    },
  },
  plugins: [],
}
