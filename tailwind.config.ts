import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Refined near-black & off-white (Linear/Vercel-маягтай гунметал)
        black: "#0B0D10",
        white: "#EBEDF0",

        // Semantic tokens
        bg: "#0B0D10",
        surf: "#101317",
        bd: "#1C1F25",
        bd2: "#262A31",
        tx: "#EBEDF0",
        sub: "#8B919C",
        muted: "#5C616B",

        // KPI accents (зөвхөн чухал тоо/өгөгдөлд)
        kpi1: "#8B95FF", // зөөлөн indigo
        kpi2: "#3FCF8E", // эерэг ногоон
        kpi3: "#E5B85C", // amber
        kpi4: "#E07474", // зөөлөн улаан
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      opacity: {
        2: "0.02",
        3: "0.03",
        4: "0.04",
        6: "0.06",
        8: "0.08",
        12: "0.12",
        15: "0.15",
        18: "0.18",
        22: "0.22",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
      },
    },
  },
  plugins: [],
} satisfies Config;
