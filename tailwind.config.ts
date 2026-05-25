import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light-themed Stag Beetle Colors
        surface: {
          DEFAULT: "#FCFAF6", // Warm white background
          dim: "#F5F1E9",
          bright: "#ffffff",
          container: {
            lowest: "#ffffff",
            low: "#F9F6F0",
            DEFAULT: "#F1ECE1",
            high: "#E8E1CE",
            highest: "#DDD4BC",
          }
        },
        "on-surface": "#0C111A", // Dark charcoal for readability
        "on-surface-variant": "#4A525D",
        primary: {
          DEFAULT: "#0D1B2A", // Beetle Navy
          container: "#F0F4F8",
        },
        secondary: {
          DEFAULT: "#AF8D11", // Gold Leaf Accent
          container: "#FCF6DF",
        },
        "gold-leaf": "#C5A059",
        "beetle-navy": "#0D1B2A",
        "champagne-marble": "#E0D7C6",
        "obsidian-charcoal": "#080C11",
        "iridescent-silver": "#D1D5DB",
        outline: "#8E9196",
        "outline-variant": "#C4C6CC",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Playfair Display", "serif"],
        body: ["var(--font-hanken)", "Hanken Grotesk", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "9999px",
      },
      spacing: {
        unit: "8px",
        gutter: "24px",
        "margin-desktop": "80px",
        "margin-mobile": "20px",
        "container-max": "1440px",
      },
    },
  },
  plugins: [],
};
export default config;
