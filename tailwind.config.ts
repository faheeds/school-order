import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5fbf8",
          100: "#dff1e8",
          200: "#bfe3d1",
          300: "#93cfb2",
          400: "#5fb187",
          500: "#3a9567",
          600: "#2b7952",
          700: "#245f42",
          800: "#214c36",
          900: "#1d3f2e"
        },
        ink: "#12212f",
        paper: "#fffdfa",
        accent: "#f59e0b",
        danger: "#b42318"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(18, 33, 47, 0.12)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

export default config;
