import { defineConfig, mergeConfig } from "vite";
import playgroundConfig from "./vite.config";

// Observe the actual renderer input without React internals or a production hook.
export default defineConfig((env) => mergeConfig(playgroundConfig(env), {
  plugins: [{
    name: "diagnostic-renderer-input",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith("/playlist-tree/toTreeNodes.ts")) return;
      const expression = "return genrePlaylists.map(";
      if (!code.includes(expression)) throw new Error("Diagnostic renderer-input hook needs updating");
      return code.replace(expression, "return globalThis.__dragRendererNodes = genrePlaylists.map(");
    },
  }],
}));
