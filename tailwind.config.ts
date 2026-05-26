import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Navy-tinted dark base (inspired by dashboard.html)
        black: "#070B1A",
        white: "#E7ECFF",

        // Semantic tokens
        bg: "#0B1020",
        surf: "#121A33",
        surf2: "#18224A",
        bd: "#24305E",
        bd2: "#2A3875",
        tx: "#E7ECFF",
        sub: "#9AA6CF",
        muted: "#6B7390",

        // Brand
        brand: "#6AA6FF",   // sky blue
        brand2: "#8B5CF6",  // violet
        accent: "#22D3EE",  // cyan
        pink: "#F472B6",

        // Semantic states
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#6AA6FF",

        // Tinted state text (lighter readable on dark)
        successInk: "#7BDD9C",
        warningInk: "#FBCF7A",
        dangerInk: "#FF9B9B",
        infoInk: "#9DBFFF",

        // KPI accents
        kpi1: "#6AA6FF", // sky blue
        kpi2: "#22C55E", // green
        kpi3: "#F59E0B", // amber
        kpi4: "#EF4444", // red
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(106,166,255,0.35), 0 0 1px rgba(139,92,246,0.6)",
        "glow-sm": "0 0 12px rgba(106,166,255,0.25)",
        "glow-success": "0 0 18px rgba(34,197,94,0.30)",
        "glow-warning": "0 0 18px rgba(245,158,11,0.30)",
        "glow-danger": "0 0 18px rgba(239,68,68,0.30)",
        card: "0 6px 24px rgba(0,0,0,0.25)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6AA6FF 0%, #8B5CF6 60%, #F472B6 100%)",
        "panel-gradient": "linear-gradient(180deg, #121A33 0%, #18224A 100%)",
        "mesh": "radial-gradient(1200px 600px at 10% -10%, rgba(26,35,80,0.65) 0%, transparent 60%), radial-gradient(900px 500px at 110% 10%, rgba(42,26,85,0.55) 0%, transparent 60%)",
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
