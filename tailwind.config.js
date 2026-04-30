/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          main: 'var(--bg-main)',
          glass: 'var(--bg-glass)',
          overlay: 'var(--modal-overlay)',
          progress: 'var(--progress-bg)'
        },
        brand: {
          accent: 'var(--accent)',
          accentHover: 'var(--accent-hover)',
          danger: 'var(--danger)',
          dangerHover: 'var(--danger-hover)',
          success: 'var(--success)'
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)'
        },
        border: {
          glass: 'var(--border-glass)',
          input: 'var(--input-border)'
        },
        btn: {
          secondary: 'var(--btn-secondary-bg)',
          secondaryHover: 'var(--btn-secondary-hover)'
        }
      },
      fontFamily: {
        main: ['Space Grotesk', 'sans-serif'],
        heading: ['Crimson Pro', 'serif']
      },
      boxShadow: {
        glass: '0 4px 30px var(--glass-shadow)',
        cardHover: '0 10px 25px var(--card-shadow-hover)',
        btn: '0 4px 14px rgba(201, 122, 90, 0.25)'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at top right, var(--bg-gradient-1), var(--bg-main) 50%)'
      }
    },
  },
  plugins: [],
}
