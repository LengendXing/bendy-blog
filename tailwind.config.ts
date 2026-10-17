import type { Config } from "tailwindcss"

/**
 * Palette values live once, as RGB channel tokens in styles/globals.css.
 * Tailwind only maps utility names onto those tokens.
 */
const pixelColor = (token: string) => `rgb(var(--pixel-${token}) / <alpha-value>)`

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
          black: pixelColor("black"),
          white: pixelColor("white"),
          gray: {
            100: pixelColor("gray-100"),
            200: pixelColor("gray-200"),
            300: pixelColor("gray-300"),
            400: pixelColor("gray-400"),
            500: pixelColor("gray-500"),
            600: pixelColor("gray-600"),
            700: pixelColor("gray-700"),
            800: pixelColor("gray-800"),
            900: pixelColor("gray-900"),
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
