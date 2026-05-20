import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#020609",
        surf: "#07131F",
        surf2: "#0B1B2B",
        bd: "#13293F",
        tx: "#F8FAFC",
        sub: "#7C8CA1",
        blue: "#4F8CFF",
        green: "#32D583",
        amber: "#FFB020",
        red: "#FF5A5A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
