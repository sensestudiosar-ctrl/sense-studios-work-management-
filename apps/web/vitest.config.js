/**
 * Design-system test configuration.
 * Extends the shared vite.config.ts settings; only overrides worker/timeout
 * defaults that are safe for this repo's CI hardware.
 *
 * The shared vite.config.ts already sets: globals, environment (jsdom),
 * setupFiles, include, resolve, plugins, and PWA middleware.
 * Do NOT duplicate those — this file only adds timing and isolation bounds.
 */
import baseConfig from "./vite.config.js";
import { defineConfig } from "vitest/config";
const existingTest = baseConfig.test ?? {};
export default defineConfig({
    ...baseConfig,
    test: {
        ...existingTest,
        // Keep module caches and hoisted mocks private to each test file.
        // Reused workers otherwise retain imports from earlier app/site tests,
        // bypassing later PDF, review, WebAuthn and offline-store mocks.
        // Worker concurrency is bounded independently below.
        isolate: true,
        // Bound the worker pool so a burst of concurrent files can't starve memory.
        maxWorkers: existingTest.maxWorkers ?? 4,
        // 25 s timeout: generous for a jsdom unit test on a constrained VM.
        testTimeout: 25_000,
        hookTimeout: 25_000,
    },
});
