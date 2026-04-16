import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        textPrimary: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        bgPrimary: "var(--bg-primary)",
        bgSecondary: "var(--bg-secondary)",
        sidebarBg: "var(--sidebar-bg)"
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        lg: "var(--radius-lg)",
        md: "var(--radius)"
      }
    }
  },
  plugins: []
};

export default config;