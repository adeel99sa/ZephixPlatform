/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "var(--primary-50)",
          600: "var(--primary-600)",
          hover: "var(--primary-hover)",
          pressed: "var(--primary-pressed)",
        },
        link: "var(--link)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        surface: "var(--surface)",
        alt: "var(--alt-surface)",
        border: "var(--border)",
        hero: "var(--hero)",
        footer: "var(--footer)",
        success: { 600: "var(--success-600)" },
        warning: { 600: "var(--warning-600)" },
        danger: { 600: "var(--danger-600)" },
        info: { 600: "var(--info-600)" },
      },
      boxShadow: {
        focusBrand: "0 0 0 2px var(--ring-brand)",
        focusLight: "0 0 0 2px var(--ring-light)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
} 