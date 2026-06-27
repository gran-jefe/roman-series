import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-crimson)', 'Georgia', 'serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: "#0D1B2A",
        forest: "#1A7A4A",
        ember: "#C4522A",
        "deep-blue": "#0D1B2A",
        rose: "#C45C87",
        blush: "#F7F9FC",
        gold: "#F59E0B",
        cream: "#FFFBF5",
        biology: "#1A7A4A",
        government: "#1E3A5F",
        chemistry: "#8B2252",
        literature: "#C4522A",
        crs: "#D97B20",
        irs: "#B0287A",
        english: "#2166B2",
        physics: "#7B4F1A",
        music: "#6D28D9",
        yoruba: "#0F766E",
        commerce: "#B45309",
        economics: "#0369A1",
        mathematics: "#1D4ED8",
        accounting: "#7C3AED",
      },
    },
  },
  plugins: [],
};
export default config;
