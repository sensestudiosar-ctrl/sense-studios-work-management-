const fs = require('fs');
const p = '_chunk7.js';
let s = fs.readFileSync(p, 'utf8');
const old = `
TASK_BY_ID = {};
TASKS.forEach(t => { TASK_BY_ID[t.id] = t; });
openTasks = TASKS.filter(t => t.status !== 'done');
doneTasks = TASKS.filter(t => t.status === 'done');
`;
if (!s.includes(old)) { console.log('PATTERN NOT FOUND'); process.exit(1); }
const repl = `
TASKS.forEach(t => { TASK_BY_ID[t.id] = t; });
openTasks.length = 0;
doneTasks.length = 0;
TASKS.forEach(t => { (t.status === 'done' ? doneTasks : openTasks).push(t); });
`;
s = s.replace(old, repl);
fs.writeFileSync(p, s);
console.log('chunk7 patched: consts mutated in place');
