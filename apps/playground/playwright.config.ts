import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";

async function allocatePort() {
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolve);
  });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a browser-test port");
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()));
  return String(address.port);
}

// Workers reload this config and must inherit the runner's server address.
const port = process.env.APP_KIT_E2E_PORT ?? await allocatePort();
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error("APP_KIT_E2E_PORT must be a port between 1 and 65535");
}
process.env.APP_KIT_E2E_PORT = port;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `pnpm dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
