import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const workerSetting = process.env.VITEST_WORKERS;
const requestedWorkers = workerSetting === undefined ? undefined : Number(workerSetting);
if (workerSetting !== undefined && (requestedWorkers === undefined || !/^\d+$/.test(workerSetting) || !Number.isSafeInteger(requestedWorkers) || requestedWorkers < 1)) {
  throw new Error("VITEST_WORKERS must be a positive integer.");
}
const boundedWorkers = requestedWorkers;

export default defineConfig({
  plugins: [
    {
      name: "reserve-canonical-staging-port",
      configResolved(config) {
        config.server.strictPort = true;
        config.preview.strictPort = true;
        if (config.server.port === 59443 || config.preview.port === 59443) {
          throw new Error("Port 59443 is reserved for immutable canonical Sense staging. Use a separate port for Vite development or experimental previews.");
        }
      }
    },
    {
      name: "retire-preview-worker-in-development",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.split("?")[0] !== "/sw.js") return next();
          response.setHeader("Content-Type", "application/javascript");
          response.setHeader("Cache-Control", "no-store");
          response.end(`
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil((async () => {
  await self.clients.claim();
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: "window" });
  await Promise.all(windows.map(client => client.navigate(client.url)));
})()));
`);
        });
      }
    },
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "pwa-update-guard.js"],
      manifest: {
        name: "Sense Studios Work Management",
        short_name: "Sense Studios",
        description: "Work management application",
        theme_color: "#182c29",
        background_color: "#f4f1e9",
        display: "standalone",
        id: "/",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png}"],
        skipWaiting: false,
        clientsClaim: false,
        importScripts: ["/pwa-update-guard.js"]
      }
    })
  ],
  server: {
    allowedHosts: process.env.SENSE_DEV_ALLOWED_HOST ? [process.env.SENSE_DEV_ALLOWED_HOST] : [],
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://localhost:4000",
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setup-tests.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    testTimeout: 25000,
    ...(boundedWorkers === undefined ? {} : { maxWorkers: boundedWorkers })
  }
});
