import brandPreset from "@behindthemusictree/brand/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [brandPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/app-kit-ui/src/**/*.{ts,tsx}", "./node_modules/@behindthemusictree/*/dist/**/*.{js,cjs}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
