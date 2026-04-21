/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        candy: {
          pink: '#FFB7C5',
          pinkDark: '#FF8FA8',
          blue: '#A8DEFF',
          cream: '#FFF6F8',
          dark: '#2B1B24',
          gray: '#6B5560',
          soft: '#FBEEF1',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        candy: '0 8px 0 #FF8FA8',
        candyHover: '0 4px 0 #FF8FA8',
        soft: '0 10px 30px rgba(255,143,168,0.18)',
      },
    },
  },
  plugins: [],
}
