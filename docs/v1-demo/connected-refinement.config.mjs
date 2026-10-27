import base from './connected-prototype.config.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dest=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../design/application-ux-audit-2026-10-25/prototype-delivery/refinement-1');
export default {...base,testMatch:['connected-prototype.spec.mjs','connected-refinement.spec.mjs'],outputDir:path.join(dest,'test-artifacts'),snapshotPathTemplate:path.join(dest,'visual-baselines','{arg}{ext}'),reporter:[['list'],['json',{outputFile:path.join(dest,'playwright-results.json')}],['html',{outputFolder:path.join(dest,'playwright-report'),open:'never'}]]};
