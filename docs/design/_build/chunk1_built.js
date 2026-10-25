/* SenseWork demo v1 — data + state. Static mock; no backend. */
const TODAY = new Date(2026,9,14);
const AV_COLORS = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#4f46e5','#0d9488','#ca8a04','#be123c','#0369a1','#15803d'];
const avColor = n => AV_COLORS[(n.charCodeAt(0)+n.length)%AV_COLORS.length];
const initials = n => n.split(' ').map(s=>s[0]).slice(0,2).join('');
const daysFrom = d => Math.round((d-TODAY)/86400000);
const fmtD = d => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]+' '+d.getDate();
const fmtDT = d => fmtD(d)+' '+String(d.getHours()).padStart(2,'0')+':00';
const iso = n => n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
const due = n => { const d=new Date(TODAY); d.setDate(d.getDate()+n); return d; };
const ago = h => { const d=new Date(TODAY); d.setHours(d.getHours()-h); return d; };
const money = n => '$'+Math.round(n).toLocaleString('en-US');
const pct = (a,b) => b? Math.round(a/b*100) : 0;
const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const uid = (() => { let n=0; return p => p+(++n); })();
const rnd = (() => { let s=1337; return () => (s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff; })();
const pick = (a,i) => a[Math.floor(i)%a.length];

const STATUS = {
  todo:      { l:'To do',       c:'b-gray'   },
  inProgress:{ l:'In progress', c:'b-info'   },
  inReview:  { l:'In review',   c:'b-violet' },
  blocked:   { l:'Blocked',     c:'b-danger' },
  done:      { l:'Done',        c:'b-ok'     },
};
const COLS = ['todo','inProgress','inReview','blocked','done'];
const PRIO = { urgent:{l:'Urgent',cls:'pri-urgent'}, high:{l:'High',cls:'pri-high'}, med:{l:'Medium',cls:'pri-med'}, low:{l:'Low',cls:'pri-low'} };
const TYPES = { feature:{l:'Feature'}, bug:{l:'Bug'}, task:{l:'Task'}, epic:{l:'Epic'} };
const PROJECTS = {
  app:      { name:'Client App Redesign',  color:'#2563eb',lead:'u2',status:'On track', s:'b-ok',    budget:480000,health:88,desc:'Mobile + web redesign for the Meridian banking engagement.' },
  platform: { name:'Platform Migration',   color:'#7c3aed',lead:'u3',status:'At risk',  s:'b-danger',budget:920000,health:61,desc:'Re-platform the monolith onto the services architecture.' },
  qa:       { name:'QA Automation Suite',  color:'#0891b2',lead:'u4',status:'On track', s:'b-ok',    budget:160000,health:83,desc:'Self-serve regression suite and CI quality gates.' },
  crm:      { name:'CRM Data Migration',   color:'#059669',lead:'u5',status:'At risk',  s:'b-warn',  budget:240000,health:57,desc:'Consolidate three legacy CRM systems into one record of truth.' },
  design:   { name:'Design System v2',     color:'#d97706',lead:'u2',status:'On track', s:'b-ok',    budget:90000, health:91,desc:'Unified tokens, components and documentation across products.' },
  ops:       { name:'Internal Ops Tools',  color:'#4f46e5',lead:'u6',status:'Planning', s:'b-info',  budget:70000, health:78,desc:'Internal dashboards, access provisioning and audit trail.' },
};
const PROJ_ORDER = ['app','platform','qa','crm','design','ops'];
const ROLES = {
  owner:   { name:'Owner',       color:'#dc2626' },
  admin:   { name:'Admin',       color:'#7c3aed' },
  pm:      { name:'Project Mgr', color:'#2563eb' },
  designer:{ name:'Designer',    color:'#d97706' },
  dev:     { name:'Developer',   color:'#0891b2' },
  qa:      { name:'QA',          color:'#059669' },
  guest:   { name:'Guest',       color:'#6b7280' },
};
const SKILLS = {
  dev:['Backend','APIs','Frontend','Platform','Migrations','CI/CD','Data pipelines','Observability'],
  qa:['Test strategy','Automation','Regression','Security','Performance'],
  designer:['Visual design','Prototyping','Research','Tokens','Interviewing'],
  pm:['Delivery','Roadmaps','Comms','Risk','Analytics','Vendor mgmt'],
};
