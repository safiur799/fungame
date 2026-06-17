import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080a12",
        panel: "#101522",
        neon: "#31f6c8",
        hot: "#ff4fd8",
        gold: "#ffd166"
      },
      boxShadow: {
        glow: "0 0 32px rgba(49, 246, 200, 0.24)",
        hot: "0 0 28px rgba(255, 79, 216, 0.22)"
      },
      animation: {
        pulseGlow: "pulseGlow 2.2s ease-in-out infinite",
        ticker: "ticker 0.65s cubic-bezier(.2,.8,.2,1)"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 22px rgba(49, 246, 200, 0.18)" },
          "50%": { boxShadow: "0 0 42px rgba(255, 79, 216, 0.28)" }
        },
        ticker: {
          "0%": { transform: "translateY(8px) scale(.98)", opacity: ".2" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" }
        }
      }
    }
  },
  plugins: []
};

export default config;
