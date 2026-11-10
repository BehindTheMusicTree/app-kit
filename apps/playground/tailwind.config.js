import brandPreset from "@behindthemusictree/brand/tailwind-preset";

/** @type {import('tailwindcss').Config} */
export default {
  // Same setup as the consuming apps: the brand preset defines layout utilities (e.g. `pt-search-clear`)
  // that the published ui and genre-tree-view components rely on.
  presets: [brandPreset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "../../packages/app-kit-ui/src/**/*.{ts,tsx}",
    "./node_modules/@behindthemusictree/{ui,genre-tree-view}/dist/**/*.{js,cjs}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
