import { defineConfig } from "tsup";

const entry = {
  index: "src/index.ts",
  "transport/index": "src/transport/index.ts",
  "auth/index": "src/auth/index.ts",
  "popup/index": "src/popup/index.ts",
  "ui/index": "src/ui/index.ts",
  "player/index": "src/player/index.ts",
  "genre-tree/index": "src/genre-tree/index.ts",
};

const external = ["react", "react-dom", "@tanstack/react-query", "next"];

/**
 * Several subpaths share stateful singletons across entry points (e.g. `auth`'s SessionContext is
 * used internally by `transport`'s `useFetchWrapper` and `genre-tree`'s data hooks; `player`'s
 * PlayerContext is used by `genre-tree`'s TrackListContext/TrackItem; `ui`'s Button is used by
 * `popup`'s BasePopup). With `splitting: false`, esbuild would bundle a fully independent copy of
 * each shared module into every entry file that imports it — including a *second* `createContext()`
 * call per context — so a consumer wrapping their tree with `<SessionProvider>` (from the `auth`
 * subpath) and calling `useFetchWrapper()` (whose bundled copy of SessionContext would be a
 * different module instance, from the `transport` subpath) would see "must be used within a
 * Provider" errors despite doing everything right. Splitting keeps one shared chunk per module, so
 * every entry point imports the *same* context instance. esbuild only supports splitting for ESM,
 * so this ships as two tsup passes: ESM with splitting, CJS without (a "cjs" consumer that mixes
 * subpath imports of the same context is the one path not covered here — flagged in the package
 * report; CJS is a legacy escape hatch, not a scenario this org's consumers hit).
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
