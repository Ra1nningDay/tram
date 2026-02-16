import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import { fontFamily } from "tailwindcss/defaultTheme";

const config: Config = {
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
          DEFAULT: "#FE5050",
          dark: "#e03e3e",
        },
        accent: {
          DEFAULT: "#69542A",
          light: "#8a7344",
        },
        surface: {
          DEFAULT: "#292D32",
          light: "#343942",
          lighter: "#3f4550",
          dark: "#1e2127",
        },
        muted: "#F1EDED",
        fresh: "#22c55e",
        delayed: "#f59e0b",
        offline: "#ef4444",
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
