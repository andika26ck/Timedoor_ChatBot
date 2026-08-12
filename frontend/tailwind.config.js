/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * Timedoor Brand Color System
         * Primary = Timedoor Green #10AF13 (>50% usage)
         * Secondary colors ≤30% (accent only)
         * Neutrals for background/text balance
         */
        brand: {
          950: "#033006",
          900: "#115614",
          800: "#126915",
          700: "#108513",
          600: "#10AF13", // Main Color — Timedoor Green
          DEFAULT: "#10AF13",
          500: "#1ACD1D",
          400: "#43E545",
          300: "#81F4B3",
          200: "#B8FAB8",
          100: "#DBFDDB",
          50: "#F0FFF0",
        },

        /**
         * DARK MODE SURFACES
         * Turunan Jet (#353535) + brand-950 (#033006) supaya gelapnya tetap
         * "hijau Timedoor", bukan abu kebiruan generik.
         */
        night: {
          950: "#05170A", // background utama
          900: "#0B240F", // surface / card / header
          800: "#123317", // surface naik (hover, bubble)
          700: "#1B4522", // border
          600: "#245C2D", // border kuat / divider
        },

        navy: {
          DEFAULT: "#1C2F70",
          700: "#1C2F70",
          600: "#243A8A",
          200: "#99C0F9",
          50: "#EEF1F8",
        },
        ocean: {
          DEFAULT: "#43C4FF",
          500: "#43C4FF",
          100: "#D9F2FF",
          50: "#EFF9FF",
        },
        sunglow: {
          DEFAULT: "#FFD43C",
          500: "#FFD43C",
          50: "#FFF8D9",
        },
        blush: {
          DEFAULT: "#FF5D5D",
          500: "#FF5D5D",
          400: "#FFA0A0",
          50: "#FFE5E5",
        },
        dream: {
          DEFAULT: "#D66AFF",
          500: "#D66AFF",
          50: "#F7E6FF",
        },
        jet: {
          DEFAULT: "#353535",
          900: "#000000",
          700: "#353535",
          100: "#F5F5F5",
          50: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
