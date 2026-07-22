import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Semantic status palette used across the application board.
        status: {
          saved: "#64748b",
          applied: "#2563eb",
          interview: "#7c3aed",
          offer: "#16a34a",
          rejected: "#dc2626",
          accepted: "#059669",
        },
      },
    },
  },
  plugins: [],
};

export default config;
