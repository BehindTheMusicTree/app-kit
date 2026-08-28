import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prototypeApiKey = env.GTMT_PROTOTYPE_API_KEY;

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_VERCEL_ENV": JSON.stringify(process.env.VERCEL_ENV ?? ""),
    },
    server: {
      proxy: {
        "/api/grow-prototype-proxy": {
          target: "https://grow-api-staging.themusictree.org",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/grow-prototype-proxy/, "/v0"),
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
