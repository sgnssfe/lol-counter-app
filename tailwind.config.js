/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // ゲームっぽいフォント
        display: ["'Cinzel'", "serif"],
        body: ["'Rajdhani'", "sans-serif"],
      },
      colors: {
        // LoL テーマカラー
        gold: {
          DEFAULT: "#C89B3C",
          light: "#F0E6D3",
          dark: "#A07820",
        },
        dark: {
          900: "#0A0E14",
          800: "#0F1419",
          700: "#1A2030",
          600: "#243050",
          500: "#1E2D40",
        },
        blue: {
          lol: "#0BC4E3",
          dark: "#005A82",
        },
      },
      backgroundImage: {
        // 斜線パターンの背景
        "hex-pattern":
          "repeating-linear-gradient(60deg, transparent, transparent 10px, rgba(200,155,60,0.03) 10px, rgba(200,155,60,0.03) 11px)",
      },
      boxShadow: {
        gold: "0 0 20px rgba(200, 155, 60, 0.3)",
        "gold-sm": "0 0 8px rgba(200, 155, 60, 0.2)",
        blue: "0 0 20px rgba(11, 196, 227, 0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
