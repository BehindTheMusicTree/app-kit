import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const dirname = path.dirname(fileURLToPath(import.meta.url));

// Vite hashes the installed lockfile only at startup, so a running server keeps pre-bundling the old versions after a `pnpm install`.
function restartOnInstall(): Plugin {
  return {
    name: "restart-on-install",
    apply: "serve",
    configureServer(server) {
      const watcher = fs.watch(path.resolve(dirname, "../../node_modules/.pnpm"), (_, filename) => {
        if (filename !== "lock.yaml") return;
        server.config.logger.info("dependencies changed, restarting", { timestamp: true });
        void server.restart();
      });
      server.httpServer?.once("close", () => watcher.close());
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prototypeApiKey = env.GTMT_PROTOTYPE_API_KEY;
  const appKitVersion = require(path.resolve(dirname, "../../packages/app-kit/package.json")).version;

  return {
    plugins: [react(), restartOnInstall()],
    resolve: {
      alias: [
        {
          find: /^@behindthemusictree\/app-kit$/,
          replacement: path.resolve(dirname, "../../packages/app-kit/src/index.ts"),
        },
        {
          find: /^@behindthemusictree\/app-kit\/(.+)$/,
          replacement: path.resolve(dirname, "../../packages/app-kit/src/$1/index.ts"),
        },
        {
          find: /^@behindthemusictree\/app-kit-ui\/(.+)$/,
          replacement: path.resolve(dirname, "../../packages/app-kit-ui/src/$1/index.ts"),
        },
      ],
    },
    define: {
      "import.meta.env.VITE_APP_KIT_VERSION": JSON.stringify(appKitVersion),
    },
    server: {
      proxy: {
        "/api/grow-prototype-proxy": {
          target: "https://grow-api-staging.themusictree.org",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/grow-prototype-proxy/, "/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (!prototypeApiKey) {
                throw new Error("GTMT_PROTOTYPE_API_KEY is required to proxy grow-api prototype requests");
              }
              proxyReq.setHeader("X-API-Key", prototypeApiKey);
            });
          },
        },
      },
    },
  };
});
