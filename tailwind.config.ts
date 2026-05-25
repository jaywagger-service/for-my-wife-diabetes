import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#faf7f1",
        "bg-soft": "#ede4d3",
        card: "#ffffff",
        ink: "#2a2622",
        "ink-soft": "#6e655a",
        "ink-faint": "#9d9a92",
        line: "#e0d9cc",
        accent: "#5e7a6b",
        "accent-deep": "#3f5448",
        warn: "#b76e5f",
        "warn-bg": "#f4e3df",
        good: "#6e8d72",
        "good-bg": "#e3ecde",
        gold: "#b59563",
      },
      borderRadius: {
        sm: "10px",
        DEFAULT: "16px",
        lg: "24px",
        full: "100px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-top": "env(safe-area-inset-top)",
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "sans-serif",
        ],
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "150": "150ms",
        "250": "250ms",
        "400": "400ms",
      },
    },
  },
  plugins: [],
};

export default config;
