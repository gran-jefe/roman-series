import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: "#1A0811",
        forest: "#8B2252",
        ember: "#C4522A",
        "deep-blue": "#2A0E1B",
        rose: "#C45C87",
        blush: "#F9F0F4",
        biology: "#1A7A4A",
        government: "#1E3A5F",
        chemistry: "#8B2252",
        literature: "#C4522A",
        crs: "#D97B20",
        irs: "#B0287A",
        english: "#2166B2",
        physics: "#7B4F1A",
      },
    },
  },
  plugins: [],
};
export default config;
