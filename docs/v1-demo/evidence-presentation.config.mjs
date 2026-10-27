import base from './mandatory-evidence.config.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../design/application-ux-audit-2026-10-25/prototype-delivery/evidence-refinement-2026-10-26');
export default {...base,testMatch:[...base.testMatch,'evidence-presentation.spec.mjs'],outputDir:path.join(dir,'test-artifacts'),snapshotPathTemplate:path.join(dir,'visual-baselines','{arg}{ext}'),reporter:[['list'],['json',{outputFile:path.join(dir,'playwright-results.json')}],['html',{outputFolder:path.join(dir,'playwright-report'),open:'never'}]]};
