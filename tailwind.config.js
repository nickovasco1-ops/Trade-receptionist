/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0A0E1A",
          surface: "#111827",
          card: "#1A2235",
          accent: "#3B82F6",
          "accent-light": "#60A5FA",
          muted: "#6B7280",
          border: "#1E2D45",
          white: "#FFFFFF",
          offwhite: "#E5E7EB",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["72px", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["56px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "display-md": ["40px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "display-sm": ["32px", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        "body-lg": ["20px", { lineHeight: "1.6" }],
        "body-md": ["16px", { lineHeight: "1.6" }],
        "label": ["14px", { lineHeight: "1.4", letterSpacing: "0.08em" }],
      },
    },
  },
  plugins: [],
};
