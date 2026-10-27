import base from './connected-refinement.config.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../design/application-ux-audit-2026-10-25/prototype-delivery/evidence-rule-2026-10-26');
export default {...base,testMatch:['connected-prototype.spec.mjs','connected-refinement.spec.mjs','mandatory-evidence.spec.mjs'],outputDir:path.join(dir,'test-artifacts'),reporter:[['list'],['json',{outputFile:path.join(dir,'playwright-results.json')}],['html',{outputFolder:path.join(dir,'playwright-report'),open:'never'}]]};
