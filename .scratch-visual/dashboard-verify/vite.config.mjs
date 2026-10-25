import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "../../apps/web");
const webNm = path.join(webRoot, "node_modules");
/* Load the React plugin from the web app's installed copy. */
const require = createRequire(path.join(webRoot, "package.json"));
const react = require("@vitejs/plugin-react");

export default {
  plugins: [react()],
  resolve: {
    /* Every bare dependency resolves against the web app's pnpm-installed
       copies, so the harness and the dashboard share one React. */
    alias: [
      { find: /^react$/, replacement: path.join(webNm, "react") },
      { find: /^react-dom\/(.*)$/, replacement: path.join(webNm, "react-dom", "$1") },
      { find: /^react-dom$/, replacement: path.join(webNm, "react-dom") },
      { find: /^react-router-dom$/, replacement: path.join(webNm, "react-router-dom") },
      { find: /^@dnd-kit\/core$/, replacement: path.join(webNm, "@dnd-kit/core") },
      { find: /^@dnd-kit\/sortable$/, replacement: path.join(webNm, "@dnd-kit/sortable") },
      { find: /^@dnd-kit\/utilities$/, replacement: path.join(webNm, "@dnd-kit/utilities") },
      /* Transitive dep of @dnd-kit/core that pnpm places only inside core's
         own store entry — point at it explicitly. */
      { find: /^@dnd-kit\/accessibility$/, replacement: path.join(here, "../../node_modules/.pnpm/@dnd-kit+core@6.3.1_react-d_5b9ddec44e14c8a53fa8750ace964073/node_modules/@dnd-kit/accessibility") },
      { find: /^apps\/web\/(.*)$/, replacement: path.join(webRoot, "src", "$1") },
    ],
  },
  optimizeDeps: {
    include: [
      "react", "react-dom", "react-dom/client",
      "react/jsx-dev-runtime", "react/jsx-runtime",
      "react-router-dom",
      "@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities",
      "@dnd-kit/accessibility",
    ],
  },
  server: {
    port: 5188,
    strictPort: true,
    fs: { allow: [path.resolve(here, "../..")] },
  },
};
