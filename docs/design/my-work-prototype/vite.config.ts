import react from "../../../apps/web/node_modules/@vitejs/plugin-react/dist/index.js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const prototypeRoot = fileURLToPath(new URL(".", import.meta.url));
const webRoot = resolve(prototypeRoot, "../../../apps/web");

export default {
  root: prototypeRoot,
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      { find: "react-dom/client", replacement: resolve(webRoot, "node_modules/react-dom/client.js") },
      { find: "react-dom", replacement: resolve(webRoot, "node_modules/react-dom") },
      { find: "react", replacement: resolve(webRoot, "node_modules/react") },
    ],
    dedupe: ["react", "react-dom"],
  },
  server: { host: "127.0.0.1", port: 59263, strictPort: true },
  preview: { host: "127.0.0.1", port: 59263, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
};
