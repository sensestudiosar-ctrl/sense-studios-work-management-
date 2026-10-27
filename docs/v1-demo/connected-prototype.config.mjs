import { defineConfig } from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const delivery=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../design/application-ux-audit-2026-10-25/prototype-delivery');
export default defineConfig({
 testDir: '.', testMatch: 'connected-prototype.spec.mjs', fullyParallel: true,
 timeout: 60000, expect: {timeout: 7000}, workers: 2, retries: 0,
 outputDir: '../design/application-ux-audit-2026-10-25/prototype-delivery/test-artifacts',
 snapshotPathTemplate:path.join(delivery,'visual-baselines','{arg}{ext}'),
 reporter: [['list'],['json',{outputFile:path.join(delivery,'playwright-results.json')}],['html',{outputFolder:path.join(delivery,'playwright-report'),open:'never'}]],
 use: {browserName:'chromium',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure',actionTimeout:8000}
});
