/**
 * Tailwind config KHUSUS build library.
 *
 * Bedanya dengan tailwind.config.js:
 * 1. `content` dibatasi hanya file yang dipakai floating chat, jadi CSS
 *    dashboard (Dokumen / Kelola DB) tidak ikut ke dist/style.css.
 * 2. `preflight` dimatikan supaya reset CSS tidak merusak website user.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: "class",
  corePlugins: {
    preflight: false,
  },
  content: [
    "./src/lib.ts",
    "./src/styles/widget.css",
    "./src/features/chat/**/*.{ts,tsx}",
    "./src/components/ui/**/*.{ts,tsx}",
    "./src/components/TopicPicker.tsx",
    "./src/components/StatusBadge.tsx",
    "./src/contexts/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: "#033006",
          900: "#115614",
          800: "#126915",
          700: "#108513",
          600: "#10AF13",
          DEFAULT: "#10AF13",
          500: "#1ACD1D",
          400: "#43E545",
          300: "#81F4B3",
          200: "#B8FAB8",
          100: "#DBFDDB",
          50: "#F0FFF0",
        },
        night: {
          950: "#05170A",
          900: "#0B240F",
          800: "#123317",
          700: "#1B4522",
          600: "#245C2D",
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
        sunglow: { DEFAULT: "#FFD43C", 500: "#FFD43C", 50: "#FFF8D9" },
        blush: {
          DEFAULT: "#FF5D5D",
          500: "#FF5D5D",
          400: "#FFA0A0",
          50: "#FFE5E5",
        },
        dream: { DEFAULT: "#D66AFF", 500: "#D66AFF", 50: "#F7E6FF" },
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
