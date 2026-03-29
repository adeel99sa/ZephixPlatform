/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        /* Adaptive Context — z-* token namespace */
        z: {
          bg: {
            base: "var(--z-bg-base)",
            elevated: "var(--z-bg-elevated)",
            sunken: "var(--z-bg-sunken)",
            hover: "var(--z-bg-hover)",
            active: "var(--z-bg-active)",
            selected: "var(--z-bg-selected)",
          },
          text: {
            primary: "var(--z-text-primary)",
            secondary: "var(--z-text-secondary)",
            tertiary: "var(--z-text-tertiary)",
            inverse: "var(--z-text-inverse)",
            brand: "var(--z-text-brand)",
          },
          border: {
            DEFAULT: "var(--z-border-default)",
            strong: "var(--z-border-strong)",
            brand: "var(--z-border-brand)",
          },
          sidebar: {
            bg: "var(--z-sidebar-bg)",
            border: "var(--z-sidebar-border)",
          },
          blue: {
            500: "var(--z-blue-500)",
            600: "var(--z-blue-600)",
          },
        },
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
        sm: "var(--z-shadow-sm)",
        md: "var(--z-shadow-md)",
        lg: "var(--z-shadow-lg)",
      },
      borderRadius: {
        md: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      transitionTimingFunction: {
        spring: "var(--z-easing-spring)",
      },
      transitionDuration: {
        "z-fast": "var(--z-duration-fast)",
        "z-normal": "var(--z-duration-normal)",
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
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