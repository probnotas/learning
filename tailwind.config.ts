import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Charter", "'Bitstream Charter'", "'Iowan Old Style'", "'Sitka Text'", "Cambria", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "'Liberation Mono'", "monospace"],
      },
      colors: {
        ink: {
          950: "#0e1116",
          900: "#141922",
          850: "#1a202b",
          800: "#212836",
          700: "#2e3747",
          600: "#43506a",
          400: "#8a96ab",
          300: "#b3bccb",
          200: "#d5dbe5",
          100: "#eef1f6",
        },
        accent: { DEFAULT: "#7cc4ff", dim: "#3d6f99" },
        good: "#7ad3a0",
        warn: "#f0c674",
        bad: "#f08a8a",
      },
    },
  },
  plugins: [typography],
};
export default config;
