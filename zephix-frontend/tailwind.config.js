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
        // Zephix brand colors
        'zephix-purple': '#6B46C1',
        'zephix-dark': '#0A0118',
        'zephix-blue': '#3B82F6',
      },
      boxShadow: {
        focusBrand: "0 0 0 2px var(--ring-brand)",
        focusLight: "0 0 0 2px var(--ring-light)",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'grid-flow': 'grid-flow 20s linear infinite',
        'pulse': 'pulse 2s ease-in-out infinite',
        'bounce': 'bounce 1s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'float-delayed': 'float 6s ease-in-out infinite 2s',
        'float-slow': 'float 8s ease-in-out infinite 1s',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #6B46C1 0%, #0A0118 100%)',
      },
      backdropFilter: {
        'glass': 'blur(10px) saturate(200%)',
      }
    },
  },
  plugins: [],
} 