import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Charter", "'Bitstream Charter'", "'Iowan Old Style'", "'Sitka Text'", "Cambria", "Georgia", "serif"],
        sans: ["system-ui", "-apple-system", "'Segoe UI'", "Roboto", "'Helvetica Neue'", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "'Liberation Mono'", "monospace"],
      },
      colors: {
        // Theme tokens live in app/globals.css as RGB triplets (light + dark).
        ink: Object.fromEntries(
          ["950", "900", "850", "800", "700", "600", "400", "300", "200", "100"].map((k) => [k, `rgb(var(--ink-${k}) / <alpha-value>)`]),
        ),
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", dim: "rgb(var(--accent-dim) / <alpha-value>)" },
        good: "rgb(var(--good) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        nav: "rgb(var(--nav) / <alpha-value>)",
      },
    },
  },
  plugins: [typography],
};
export default config;
