/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        auth: 'var(--color-bg-auth)',
        dashboard: 'var(--color-bg-dashboard)',
        surface: 'var(--color-surface)',
        primary: 'var(--color-primary)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        error: 'var(--color-error)',
        success: 'var(--color-success)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-display)'],
        display: ['var(--font-display)'],
      },
      boxShadow: {
        card: '0 10px 30px rgb(17 24 39 / 12%)',
      },
    },
  },
  plugins: [],
}
