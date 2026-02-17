import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-poppins)",
          "var(--font-ibm-plex-sans-thai)",
          "ui-sans-serif",
          ...fontFamily.sans,
        ],
        heading: [
          "var(--font-poppins)",
          "var(--font-ibm-plex-sans-thai)",
          "ui-sans-serif",
          ...fontFamily.sans,
        ],
        thai: [
          "var(--font-ibm-plex-sans-thai)",
          "var(--font-poppins)",
          "ui-sans-serif",
          ...fontFamily.sans,
        ],
      },
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          dark: "var(--color-primary-dark)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          light: "var(--color-surface-light)",
          lighter: "var(--color-surface-lighter)",
          dark: "var(--color-surface-dark)",
        },
        muted: "var(--color-text)",
        fresh: "var(--color-fresh)",
        delayed: "var(--color-delayed)",
        offline: "var(--color-offline)",
      },
      animation: {
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        progress: "progress 2s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        progress: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
