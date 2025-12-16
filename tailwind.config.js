/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'nexryde-yellow': 'rgb(245, 191, 25)',
        'nexryde-yellow-dark': 'rgb(200, 150, 20)',
        'nexryde-yellow-darker': 'rgb(120, 90, 12)',
      },
    },
  },
  plugins: [],
}
