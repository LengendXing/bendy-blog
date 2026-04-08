import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Press Start 2P"', "monospace"],
        body: ['"IBM Plex Mono"', "monospace"],
      },
      colors: {
        pixel: {
          black: "#0a0a0a",
          white: "#fafafa",
          gray: {
            100: "#f0f0f0",
            200: "#e0e0e0",
            300: "#c0c0c0",
            400: "#a0a0a0",
            500: "#808080",
            600: "#606060",
            700: "#404040",
            800: "#202020",
            900: "#141414",
          },
        },
      },
      keyframes: {
        "blink-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "blink-cursor": "blink-cursor 1s step-end infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
