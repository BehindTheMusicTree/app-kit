import { defineConfig } from "tsup";

const entry = {
  index: "src/index.ts",
  "popup/index": "src/popup/index.ts",
  "auth/index": "src/auth/index.ts",
  "genre-tree/index": "src/genre-tree/index.ts",
};

const external = [
  "react",
  "react-dom",
  "@tanstack/react-query",
  "next",
  "@behindthemusictree/app-kit",
  "@behindthemusictree/ui",
];

/**
 * Same ESM-with-splitting + CJS pass as app-kit: subpaths share modules (e.g. `popup`'s BasePopup is
 * used by `genre-tree`), and splitting keeps one instance of each. app-kit stays external so its
 * contexts (Session, Player, Popup) are never duplicated in this package's bundle.
 */
export default defineConfig([
  {
    entry,
    format: ["esm"],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    external,
  },
  {
    entry,
    format: ["cjs"],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    external,
  },
]);
