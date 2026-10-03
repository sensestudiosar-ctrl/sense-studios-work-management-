import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/generated/**",
      "**/.env.*/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,mjs,cjs}"],
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
        vi: "readonly"
      }
    }
  },
  {
    files: ["docs/ui/v1/mockup-interactions.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        $: "readonly",
        activeFilter: "writable",
        applyDensity: "readonly",
        body: "readonly",
        content: "readonly",
        currentScreenLabel: "readonly",
        density: "writable",
        docSearch: "writable",
        docStatus: "writable",
        documents: "readonly",
        escapeHtml: "readonly",
        globalDocs: "writable",
        go: "readonly",
        icon: "readonly",
        overview: "readonly",
        preview: "readonly",
        previewRole: "writable",
        projectHeader: "readonly",
        projectTaskFilter: "writable",
        projectTaskRows: "readonly",
        projectTaskSearch: "writable",
        projectTasks: "readonly",
        reviewDetail: "readonly",
        reviews: "readonly",
        screen: "writable",
        searchText: "writable",
        selectedTaskId: "writable",
        state: "writable",
        tag: "readonly",
        taskData: "readonly",
        taskRows: "readonly",
        taskView: "writable",
        work: "readonly"
      }
    },
  }
);
