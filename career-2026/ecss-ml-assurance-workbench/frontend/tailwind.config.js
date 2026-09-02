/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#060a12",
          900: "#0a101c",
          850: "#0d1524",
          800: "#111a2c",
          700: "#18243a",
          600: "#22314d",
        },
        accent: {
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
        },
        warn: { 400: "#fbbf24", 500: "#f59e0b" },
        danger: { 400: "#f87171", 500: "#ef4444", 600: "#dc2626" },
        ok: { 400: "#4ade80", 500: "#22c55e" },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
