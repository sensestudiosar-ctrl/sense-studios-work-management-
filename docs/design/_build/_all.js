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
const SEED = [
  ['u1','Elena Whitfield','Head of Product','owner','elena@nordwind.com','San Francisco',54,0.60,'2019-02-11',null,['Strategy','Pricing','Vendor mgmt']],
  ['u2','Ava Chen','Design Lead','designer','ava@nordwind.com','San Francisco',54,0.78,'2020-06-01','u1',['Design systems','Product','Research']],
  ['u3','Marcus Reed','Principal Engineer','pm','marcus@nordwind.com','Austin',48,0.95,'2019-09-16','u1',['Architecture','Platform','Mentoring']],
  ['u4','Priya Nair','QA Lead','qa','priya@nordwind.com','Austin',52,0.71,'2021-03-22','u3',['Test strategy','Automation','Security']],
  ['u5','Diego Alvarez','Eng Manager','pm','diego@nordwind.com','Remote',50,0.84,'2020-11-09','u1',['Delivery','Data migration','Ops']],
  ['u6','Sofia Romano','Senior Developer','dev','sofia@nordwind.com','Remote',44,0.88,'2022-01-17','u5',['Frontend','APIs','Observability']],
  ['u7','Tom Becker','Developer','dev','tom@nordwind.com','Austin',40,0.62,'2022-08-01','u5',['Backend','Data pipelines']],
  ['u8','Grace Kim','QA Engineer','qa','grace@nordwind.com','Austin',38,0.55,'2023-02-13','u4',['Automation','Regression']],
  ['u9','Hiroshi Tanaka','Developer','dev','hiro@nordwind.com','Austin',40,0.93,'2021-07-05','u5',['Platform','Migrations']],
  ['u10','Aisha Bello','UX Researcher','designer','aisha@nordwind.com','San Francisco',42,0.58,'2022-04-25','u2',['Research','Prototyping']],
  ['u11','Liam OConnor','Developer','dev','liam@nordwind.com','San Francisco',40,0.47,'2023-09-18','u5',['Frontend','Design systems']],
  ['u12','Nina Petrov','QA Engineer','qa','nina@nordwind.com','Remote',38,0.74,'2023-05-02','u4',['Regression','Automation']],
  ['u13','Noah Patel','DevOps Engineer','dev','noah@nordwind.com','Austin',42,0.97,'2021-10-11','u3',['CI/CD','Infra','Monitoring']],
  ['u14','Fatima Zouari','Project Manager','pm','fatima@nordwind.com','Remote',46,0.81,'2022-11-28','u1',['Delivery','Roadmaps','Comms']],
  ['u15','Ben Carter','Developer','dev','ben@nordwind.com','San Francisco',40,0.44,'2023-12-04','u5',['Frontend','Testing']],
  ['u16','Clara Jensen','Designer','designer','clara@nordwind.com','San Francisco',42,0.39,'2024-01-22','u2',['Visual design','Tokens']],
  ['u17','Owen Murphy','Developer','dev','owen@nordwind.com','Austin',40,0.86,'2020-03-30','u3',['Platform','APIs','Backend']],
  ['u18','Yuki Sato','QA Engineer','qa','yuki@nordwind.com','Austin',38,0.68,'2023-07-10','u4',['Security','Regression']],
  ['u19','Maya Lindqvist','Product Manager','pm','maya@nordwind.com','San Francisco',46,0.90,'2021-05-17','u1',['Discovery','Roadmaps','Analytics']],
  ['u20','Daniel Ross','Developer','dev','daniel@nordwind.com','Austin',40,0.22,'2024-02-19','u5',['Backend','Migration']],
  ['u21','Hannah Lee','Developer','dev','hannah@nordwind.com','Austin',40,0.94,'2022-06-20','u3',['Migrations','Platform']],
  ['u22','Omar Haddad','Developer','dev','omar@nordwind.com','Remote',40,0.51,'2023-03-06','u5',['Backend','APIs']],
  ['u23','Elena Rossi','Project Manager','pm','rossi@nordwind.com','Remote',46,0.83,'2021-12-13','u1',['Delivery','Risk','Comms']],
  ['u24','Jack Wilson','Developer','dev','jack@nordwind.com','San Francisco',40,0.79,'2022-09-19','u5',['Frontend','Design systems']],
  ['u25','Mei Lin','QA Engineer','qa','mei@nordwind.com','Austin',38,0.66,'2023-10-23','u4',['Automation','Regression']],
  ['u26','Iris Novak','DevOps Engineer','dev','iris@nordwind.com','Remote',42,0.72,'2022-02-14','u3',['CI/CD','Monitoring','Infra']],
  ['u27','Sam Torres','Designer','designer','sam@nordwind.com','San Francisco',42,0.57,'2023-08-07','u2',['Visual design','Prototyping']],
  ['u28','Rachel Adams','QA Engineer','qa','rachel@nordwind.com','Austin',38,0.63,'2023-04-17','u4',['Regression','Automation']],
  ['u29','David Kim','Developer','dev','dkim@nordwind.com','Austin',40,0.88,'2020-08-24','u3',['Platform','Backend']],
  ['u30','Leah Goldberg','Project Manager','pm','leah@nordwind.com','Remote',46,0.80,'2022-05-09','u1',['Delivery','Roadmaps','Risk']],
  ['u31','Raj Mehta','Developer','dev','raj@nordwind.com','Remote',40,0.35,'2024-03-11','u5',['Backend','APIs']],
  ['u32','Sophia Costa','QA Engineer','qa','sophia@nordwind.com','Austin',38,0.59,'2023-11-20','u4',['Regression','Automation']],
  ['u33','Tomas Vega','Developer','dev','tomas@nordwind.com','Austin',40,0.85,'2021-04-05','u3',['Platform','Migrations']],
  ['u34','Anna Kowalski','Designer','designer','anna@nordwind.com','San Francisco',42,0.41,'2023-06-26','u2',['Visual design','Tokens']],
  ['u35','Chris Boyd','Developer','dev','chris@nordwind.com','Austin',40,0.70,'2022-07-11','u5',['Backend','CI/CD']],
  ['u36','Fatima Noor','QA Engineer','qa','fnoor@nordwind.com','Austin',38,0.61,'2023-09-04','u4',['Security','Regression']],
  ['u37','Greg Olsen','Developer','dev','greg@nordwind.com','San Francisco',40,0.82,'2021-01-18','u3',['Frontend','APIs']],
  ['u38','Nadia Rahman','Project Manager','pm','nadia@nordwind.com','Remote',46,0.77,'2022-10-10','u1',['Delivery','Comms','Roadmaps']],
  ['u39','Peter Nguyen','Developer','dev','peter@nordwind.com','Austin',40,0.66,'2023-01-09','u5',['Backend','Data pipelines']],
  ['u40','Olivia Hart','QA Lead','qa','olivia@nordwind.com','Austin',52,0.80,'2020-12-07','u4',['Test strategy','Automation','Security']],
  ['u41','Hassan Ali','Developer','dev','hassan@nordwind.com','Remote',40,0.69,'2022-11-14','u5',['Backend','APIs']],
  ['u42','Eva Muller','Designer','designer','eva@nordwind.com','San Francisco',42,0.52,'2023-12-18','u2',['Visual design','Prototyping']],
  ['u43','Luke Fletcher','Developer','dev','luke@nordwind.com','Austin',40,0.91,'2021-09-27','u3',['Platform','CI/CD','Backend']],
  ['u44','Chloe Dubois','Project Manager','pm','chloe@nordwind.com','Remote',46,0.85,'2022-08-22','u1',['Delivery','Risk','Analytics']],
  ['u45','Miguel Santos','Developer','dev','miguel@nordwind.com','Austin',40,0.48,'2024-01-08','u5',['Backend','Data pipelines']],
  ['u46','Freya Lund','QA Engineer','qa','freya@nordwind.com','Austin',38,0.57,'2023-12-11','u4',['Automation','Regression']],
  ['u47','Aaron Wells','DevOps Engineer','dev','aaron@nordwind.com','Austin',42,0.87,'2021-06-14','u3',['CI/CD','Infra','Monitoring']],
  ['u48','Zara Sheikh','Developer','dev','zara@nordwind.com','Remote',40,0.74,'2023-02-27','u5',['Backend','APIs','Migrations']],
  ['u49','Nora Berg','Designer','designer','nora@nordwind.com','San Francisco',42,0.44,'2024-02-05','u2',['Visual design','Tokens']],
  ['u50','Theo Martin','Developer','dev','theo@nordwind.com','Austin',40,0.78,'2022-03-14','u3',['Frontend','Platform']],
  ['u51','Ingrid Sorensen','QA Engineer','qa','ingrid@nordwind.com','Austin',38,0.64,'2023-06-12','u4',['Regression','Automation']],
  ['u52','Kofi Mensah','Developer','dev','kofi@nordwind.com','Austin',40,0.90,'2021-11-01','u3',['Platform','Backend','APIs']],
  ['u53','Yara Khalil','Project Manager','pm','yara@nordwind.com','Remote',46,0.79,'2022-06-06','u1',['Delivery','Roadmaps','Comms']],
  ['u54','Erik Lindholm','Developer','dev','erik@nordwind.com','Austin',40,0.42,'2023-10-02','u5',['Backend','APIs']],
  ['u55','Bea OConnell','Designer','designer','bea@nordwind.com','San Francisco',42,0.50,'2023-07-31','u2',['Visual design','Research']],
  ['u56','Victor Osei','Developer','dev','victor@nordwind.com','Austin',40,0.83,'2021-08-09','u3',['Platform','Migrations','Backend']],
  ['u57','Diana Reyes','QA Engineer','qa','diana@nordwind.com','Austin',38,0.55,'2024-01-29','u4',['Regression','Automation']],
  ['u58','Jonas Weber','DevOps Engineer','dev','jonas@nordwind.com','Remote',42,0.76,'2022-04-11','u3',['CI/CD','Infra','Monitoring']],
  ['u59','Maya Cohen','Project Manager','pm','mcohen@nordwind.com','San Francisco',46,0.86,'2020-10-19','u1',['Delivery','Analytics','Risk']],
  ['u60','Ravi Deshmukh','Developer','dev','ravi@nordwind.com','Austin',40,0.68,'2022-12-19','u5',['Backend','APIs','Data pipelines']],
  ['u61','Hanna Berg','QA Engineer','qa','hanna@nordwind.com','Austin',38,0.60,'2023-11-06','u4',['Regression','Automation']],
  ['u62','Samuel Adeyemi','Developer','dev','samuel@nordwind.com','Austin',40,0.89,'2021-02-22','u3',['Platform','Backend','CI/CD']],
  ['u63','Lena Holm','Designer','designer','lena@nordwind.com','San Francisco',42,0.47,'2024-03-18','u2',['Visual design','Tokens']],
  ['u64','Marcus Doyle','Developer','dev','mdoyle@nordwind.com','Austin',40,0.72,'2022-09-26','u5',['Backend','APIs']],
  ['u65','Aicha Diallo','QA Engineer','qa','aicha@nordwind.com','Austin',38,0.53,'2023-09-18','u4',['Automation','Regression']],
  ['u66','Elliot Gray','Developer','dev','elliot@nordwind.com','San Francisco',40,0.81,'2021-05-03','u3',['Frontend','APIs','Platform']],
  ['u67','Sara Haddad','Project Manager','pm','shaddad@nordwind.com','Remote',46,0.74,'2023-01-30','u1',['Delivery','Comms','Risk']],
  ['u68','Bjorn Hansen','Developer','dev','bjorn@nordwind.com','Austin',40,0.63,'2023-05-15','u5',['Backend','Data pipelines']],
  ['u69','Yuki Mori','QA Engineer','qa','ymori@nordwind.com','Austin',38,0.58,'2024-02-12','u4',['Regression','Automation']],
  ['u70','Cole Ramirez','Developer','dev','cole@nordwind.com','Austin',40,0.87,'2021-10-04','u3',['Platform','Backend','Migrations']],
  ['u71','Naomi Brooks','Designer','designer','naomi@nordwind.com','San Francisco',42,0.45,'2024-01-22','u2',['Visual design','Prototyping']],
  ['u72','Felix Bauer','Developer','dev','felix@nordwind.com','San Francisco',40,0.75,'2022-07-25','u5',['Frontend','APIs']],
  ['u73','Amara Okafor','Project Manager','pm','amara@nordwind.com','Remote',46,0.82,'2022-02-28','u1',['Delivery','Roadmaps','Comms']],
  ['u74','Lukas Schmidt','Developer','dev','lukas@nordwind.com','Austin',40,0.69,'2023-03-27','u5',['Backend','APIs','CI/CD']],
  ['u75','Ivy Chen','QA Engineer','qa','ivy@nordwind.com','Austin',38,0.51,'2024-04-08','u4',['Automation','Regression']],
  ['u76','Andrei Petrov','Developer','dev','andrei@nordwind.com','Austin',40,0.84,'2021-12-27','u3',['Platform','Backend','APIs']],
  ['u77','Tara Singh','Designer','designer','tara@nordwind.com','San Francisco',42,0.56,'2023-10-30','u2',['Visual design','Research']],
  ['u78','Dylan Walsh','Developer','dev','dylan@nordwind.com','Austin',40,0.77,'2022-05-30','u5',['Backend','APIs']],
  ['u79','Camille Roux','QA Engineer','qa','camille@nordwind.com','Austin',38,0.62,'2023-08-21','u4',['Security','Regression']],
  ['u80','Oscar Lind','Developer','dev','oscar@nordwind.com','Austin',40,0.80,'2021-07-19','u3',['Platform','CI/CD','Backend']],
  ['u81','Priya Raman','Project Manager','pm','praman@nordwind.com','Remote',46,0.73,'2023-04-24','u1',['Delivery','Comms','Roadmaps']],
  ['u82','Theo Nakamura','Developer','dev','tnakamura@nordwind.com','Austin',40,0.66,'2023-06-19','u5',['Backend','Data pipelines']],
  ['u83','Mira Kovac','Designer','designer','mira@nordwind.com','San Francisco',42,0.49,'2024-02-26','u2',['Visual design','Tokens']],
  ['u84','Jonas Eriksen','Developer','dev','jeriksen@nordwind.com','Austin',40,0.85,'2021-03-08','u3',['Platform','Backend','Migrations']],
  ['u85','Rosa Martinez','QA Engineer','qa','rosa@nordwind.com','Austin',38,0.54,'2024-05-06','u4',['Regression','Automation']],
  ['u86','Kai Andersen','Developer','dev','kai@nordwind.com','Austin',40,0.71,'2022-11-21','u5',['Backend','APIs']],
  ['u87','Suki Yamamoto','Designer','designer','suki@nordwind.com','San Francisco',42,0.43,'2024-03-04','u2',['Visual design','Research']],
  ['u88','Brett Coleman','Developer','dev','brett@nordwind.com','Austin',40,0.79,'2022-01-31','u3',['Platform','Backend','CI/CD']],
  ['u89','Amelia Hart','Project Manager','pm','ahart@nordwind.com','Remote',46,0.76,'2023-07-17','u1',['Delivery','Roadmaps','Comms']],
  ['u90','Finn OMalley','Developer','dev','finn@nordwind.com','Austin',40,0.64,'2023-09-11','u5',['Backend','APIs']],
  ['u91','Nadia Farouk','QA Engineer','qa','nfarouk@nordwind.com','Austin',38,0.57,'2024-04-29','u4',['Automation','Regression']],
  ['u92','Rolf Bergmann','Developer','dev','rolf@nordwind.com','Austin',40,0.82,'2021-06-28','u3',['Platform','Backend','APIs']],
  ['u93','Zoe Whitaker','Designer','designer','zoe@nordwind.com','San Francisco',42,0.52,'2024-01-15','u2',['Visual design','Prototyping']],
  ['u94','Emre Demir','Developer','dev','emre@nordwind.com','Austin',40,0.73,'2022-10-17','u5',['Backend','Data pipelines']],
  ['u95','Lena Novak','Project Manager','pm','lnovak@nordwind.com','Remote',46,0.81,'2022-08-08','u1',['Delivery','Analytics','Risk']],
  ['u96','Dario Romano','Developer','dev','dario@nordwind.com','Austin',40,0.67,'2023-02-06','u5',['Backend','APIs']],
  ['u97','Hana Petrova','QA Engineer','qa','hana@nordwind.com','Austin',38,0.59,'2024-06-03','u4',['Regression','Automation']],
  ['u98','Sven Lindqvist','Developer','dev','sven@nordwind.com','Austin',40,0.88,'2020-11-30','u3',['Platform','Backend','Migrations']],
  ['u99','Amelia Stone','Designer','designer','astone@nordwind.com','San Francisco',42,0.46,'2024-05-20','u2',['Visual design','Tokens']],
  ['u100','Idris Bello','Developer','dev','idris@nordwind.com','Austin',40,0.70,'2022-06-06','u5',['Backend','APIs']],
  ['u101','Ines Duarte','Project Manager','pm','ines@nordwind.com','Remote',46,0.72,'2023-11-06','u1',['Delivery','Comms','Roadmaps']],
  ['u102','Karl Jensen','Developer','dev','karl@nordwind.com','Austin',40,0.75,'2021-09-13','u3',['Platform','Backend','CI/CD']],
  ['u103','Layla Hassan','QA Engineer','qa','layla@nordwind.com','Austin',38,0.55,'2024-07-08','u4',['Regression','Automation']],
  ['u104','Mateo Cruz','Developer','dev','mateo@nordwind.com','Austin',40,0.69,'2023-01-09','u5',['Backend','APIs']],
  ['u105','Nora ElSayd','Designer','designer','nelseyad@nordwind.com','San Francisco',42,0.51,'2024-08-12','u2',['Visual design','Research']],
  ['u106','Owen Blackwell','Developer','dev','owenb@nordwind.com','Austin',40,0.81,'2022-03-07','u3',['Platform','Backend','APIs']],
  ['u107','Rita Almeida','Project Manager','pm','rita@nordwind.com','Remote',46,0.78,'2022-12-12','u1',['Delivery','Roadmaps','Comms']],
  ['u108','Stefan Voss','Developer','dev','stefan@nordwind.com','Austin',40,0.66,'2023-05-08','u5',['Backend','Data pipelines']],
  ['u109','Uma Krishnan','QA Engineer','qa','uma@nordwind.com','Austin',38,0.58,'2024-09-02','u4',['Automation','Regression']],
  ['u110','Viktor Novak','Developer','dev','viktor@nordwind.com','Austin',40,0.74,'2022-07-18','u3',['Platform','Backend','CI/CD']],
  ['u111','Wendy Cho','Designer','designer','wendy@nordwind.com','San Francisco',42,0.48,'2024-10-28','u2',['Visual design','Prototyping']],
  ['u112','Xander Reed','Developer','dev','xander@nordwind.com','Austin',40,0.79,'2021-08-16','u3',['Platform','Backend','APIs']],
  ['u113','Yara Nasser','QA Engineer','qa','ynasser@nordwind.com','Austin',38,0.53,'2024-11-18','u4',['Regression','Automation']],
  ['u114','Zane OBrien','Developer','dev','zane@nordwind.com','Austin',40,0.72,'2022-11-07','u5',['Backend','APIs']],
  ['u115','Zofia Zielinska','Project Manager','pm','zofia@nordwind.com','Remote',46,0.75,'2023-03-13','u1',['Delivery','Analytics','Comms']],
  ['u116','Adrian Cole','Developer','dev','adrian@nordwind.com','Austin',40,0.68,'2023-08-28','u5',['Backend','Data pipelines']],
  ['u117','Bianca Ferreira','QA Engineer','qa','bianca@nordwind.com','Austin',38,0.56,'2025-01-13','u4',['Automation','Regression']],
  ['u118','Cyrus Khan','Developer','dev','cyrus@nordwind.com','Austin',40,0.77,'2022-04-25','u3',['Platform','Backend','CI/CD']],
  ['u119','Dana Whitfield','Project Manager','pm','dwhitfield@nordwind.com','Remote',46,0.80,'2023-06-19','u1',['Delivery','Risk','Comms']],
  ['u120','Elias Brandt','Developer','dev','elias@nordwind.com','Austin',40,0.71,'2023-11-27','u5',['Backend','APIs']],
  ['u121','Farah Nasser','QA Engineer','qa','fnasser@nordwind.com','Austin',38,0.54,'2025-03-24','u4',['Regression','Automation']],
  ['u122','Gavin Hughes','Developer','dev','gavin@nordwind.com','Austin',40,0.73,'2023-02-06','u5',['Backend','APIs','Data pipelines']],
  ['u123','Helena Voss','Project Manager','pm','helena@nordwind.com','Remote',46,0.76,'2022-10-31','u1',['Delivery','Comms','Roadmaps']],
  ['u124','Ivan Petrov','Developer','dev','ivan@nordwind.com','Austin',40,0.69,'2023-09-18','u5',['Backend','APIs']],
  ['u125','Julia Santos','QA Engineer','qa','jsantos@nordwind.com','Austin',38,0.57,'2025-06-30','u4',['Automation','Regression']],
  ['u126','Kai Yamamoto','Developer','dev','kyamamoto@nordwind.com','Austin',40,0.78,'2022-06-27','u3',['Platform','Backend','CI/CD']],
  ['u127','Lena Rossi','Designer','designer','lrossi@nordwind.com','San Francisco',42,0.47,'2024-11-11','u2',['Visual design','Tokens']],
  ['u128','Mateus Silva','Developer','dev','msilva@nordwind.com','Austin',40,0.70,'2023-10-23','u5',['Backend','Data pipelines']],
  ['u129','Nora Halvorsen','QA Engineer','qa','nhalvorsen@nordwind.com','Austin',38,0.52,'2025-09-22','u4',['Regression','Automation']],
  ['u130','Omar Farouk','Developer','dev','ofarouk@nordwind.com','Austin',40,0.74,'2023-04-10','u5',['Backend','APIs','Data pipelines']],
  ['u131','Petra Novakova','Project Manager','pm','petra@nordwind.com','Remote',46,0.77,'2023-08-07','u1',['Delivery','Analytics','Risk']],
  ['u132','Quentin Roy','Developer','dev','quentin@nordwind.com','Austin',40,0.76,'2022-12-19','u3',['Platform','Backend','APIs']],
  ['u133','Rania AlSayd','QA Engineer','qa','rania@nordwind.com','Austin',38,0.55,'2025-11-17','u4',['Automation','Regression']],
  ['u134','Stellan Berg','Developer','dev','stellan@nordwind.com','Austin',40,0.72,'2023-06-26','u5',['Backend','APIs']],
  ['u135','Talia Menendez','Designer','designer','talia@nordwind.com','San Francisco',42,0.50,'2024-12-16','u2',['Visual design','Prototyping']],
  ['u136','Umar Sheikh','Developer','dev','usheikh@nordwind.com','Austin',40,0.71,'2023-09-25','u5',['Backend','APIs']],
  ['u137','Vera Lindholm','Project Manager','pm','vera@nordwind.com','Remote',46,0.74,'2024-02-12','u1',['Delivery','Comms','Roadmaps']],
  ['u138','Wolfgang Krause','Developer','dev','wolfgang@nordwind.com','Austin',40,0.78,'2022-08-29','u3',['Platform','Backend','CI/CD']],
  ['u139','Xiomara Delgado','QA Engineer','qa','xiomara@nordwind.com','Austin',38,0.56,'2026-01-26','u4',['Regression','Automation']],
  ['u140','Yusuf Demir','Developer','dev','ydemir@nordwind.com','Austin',40,0.73,'2023-07-17','u5',['Backend','APIs']],
  ['u141','Zara Khan','QA Engineer','qa','zkhan@nordwind.com','Austin',38,0.53,'2026-04-13','u4',['Automation','Regression']],
  ['u142','Aria Voss','Designer','designer','aria@nordwind.com','San Francisco',42,0.49,'2025-05-12','u2',['Visual design','Tokens']],
  ['u143','Boris Novak','Developer','dev','boris@nordwind.com','Austin',40,0.75,'2023-05-22','u5',['Backend','APIs']],
  ['u144','Carmen Reyes','QA Engineer','qa','carmen@nordwind.com','Austin',38,0.54,'2026-06-22','u4',['Regression','Automation']],
  ['u145','Devon Clarke','Developer','dev','devon@nordwind.com','Austin',40,0.70,'2024-08-19','u5',['Backend','Data pipelines']],
  ['u146','Erika Sandberg','Designer','designer','erika@nordwind.com','San Francisco',42,0.46,'2025-08-11','u2',['Visual design','Research']],
  ['u147','Fiona Walsh','QA Engineer','qa','fiona@nordwind.com','Austin',38,0.55,'2026-08-17','u4',['Automation','Regression']],
  ['u148','Gabriel Costa','Developer','dev','gabriel@nordwind.com','Austin',40,0.72,'2024-03-04','u5',['Backend','APIs']],
  ['u149','Hannah Novak','QA Engineer','qa','hnovak@nordwind.com','Austin',38,0.51,'2026-09-21','u4',['Regression','Automation']],
  ['u150','Iker Mendez','Developer','dev','iker@nordwind.com','Austin',40,0.69,'2024-06-10','u5',['Backend','Data pipelines']],
];
const FRESH = { u117:97, u121:94, u125:88, u129:79, u133:72, u139:61, u141:44, u144:21, u147:8, u149:0, u20:64, u31:82 };
const TEAM = SEED.map(r => ({
  id:r[0], name:r[1], title:r[2], role:r[3], email:r[4], loc:r[5], cap:r[6], util:r[7],
  phone:'+1 '+(r[1].length%2?'512':'415')+' 555 '+String(1000+(r[1].length*37)%8999).slice(-4),
  status:'active', start:r[8], manager:r[9], skills:r[10],
  onboard: Object.prototype.hasOwnProperty.call(FRESH, r[0]) ? FRESH[r[0]] : 100,
}));
const byId = {};
TEAM.forEach(m => { byId[m.id] = m; });
const people = TEAM.filter(m => m.status !== 'invited');
/* ---- 24 hand-authored tasks for narrative control ---- */
const T0 = [
  // id, key, title, project, type, status, assignee, reportee, prio, due(+days), tags, story, cost, blocker
  ['a01','NW-101','Design review gate for billing flow',   'app',  'task', 'blocked',   'u10','u2',  'urgent', 1,   ['ux-review','billing'],       5,32,'Awaiting Meridian compliance sign-off on the new invoice layout before it can ship to pilot users.'],
  ['a02','NW-102','Payment retry backoff',                 'app',  'bug',  'inReview',  'u6', 'u5',  'high',  0,   ['billing','stability'],       3,18,'Introduced a fixed 2s retry interval. Reviewer wants exponential backoff with jitter and a max attempt cap so a failed processor doesn’t hammer the API.'],
  ['a03','NW-103','Migration cutover runbook',             'platform','task','inReview','u3', 'u1',  'urgent', 2,  ['migration','runbook'],        6,36,'Draft v3. The rollback section still references the retired cluster names and the DNS TTL is overstated by half.'],
  ['a04','NW-104','Load test staging',                     'platform','task','inProgress','u47','u3','high', 4,  ['perf','load'],              4,24,'Need 2k concurrent users sustained for 30 minutes before we can commit to the cutover window.'],
  ['a05','NW-105','Legacy CRM export spec',                'crm',  'epic', 'blocked',   'u30','u1',  'high',  5,   ['crm','integration'],         8,44,'Blocked on the vendor’s field map for the merged contact records — promised last week, still nothing.'],
  ['a06','NW-106','Nightly regression matrix',             'qa',   'task', 'inProgress','u40','u4',  'med',   1,   ['ci','regression'],           4,20,'Split the suite into a 25-minute smoke tier and a full overnight tier so main stays green and CI stops timing out.'],
  ['a07','NW-107','Token consolidation',                   'design','task','todo',     'u2', 'u1',  'high',  10,  ['tokens'],                    3,15,'127 colour values collapse to 42. Needs a deprecation table so teams can grep for old names.'],
  ['a08','NW-108','Empty-state copy pass',                 'app',  'task', 'inProgress','u10','u2',  'low',   7,   ['copy','ux-review'],          2,10,'Twelve screens still say “No data”. Copy needs to explain what to do next, not just report absence.'],
  ['a09','NW-109','Audit log export to S3',                'ops',  'task', 'blocked',   'u13','u3',  'med',   3,   ['audit','export'],            3,16,'Security wants signed, immutable exports. Blocked on the KMS key policy approval from the platform team.'],
  ['a10','NW-110','Session timeout race',                  'platform','bug','inProgress','u9', 'u3','urgent',0,['auth','security'],       2,11,'Concurrent requests after logout can still read a revoked session for up to 90s. Reproduces about 1 in 50 times.'],
  ['a11','NW-111','Role template library',                 'ops',  'epic', 'todo',     'u137','u1','med',14, ['roles','permissions'],     6,30,'Five reusable templates so new projects stop re-deriving the same access matrix by hand.'],
  ['a12','NW-112','Dashboard widget framework',            'ops',  'task', 'inProgress','u6', 'u3',  'high',  6,  ['dashboard'],                 6,28,'Grid, filters and per-widget permissions. The permission scoping is the hard part and needs a decision from security.'],
  ['a13','NW-113','Data migration dry run #3',             'crm',  'task', 'done',     'u30','u5',  'high', -6,  ['crm','migration'],         4,20,'Third dry run finished clean — 1.2M records, 0 unmatched foreign keys, under 20 minutes.'],
  ['a14','NW-114','Design tokens pipeline',                'design','task','done',     'u34','u2',  'med',  -13, ['tokens','automation'],       3,12,'Tokens now compile to CSS, iOS and Android from one source, and CI fails on drift.'],
  ['a15','NW-115','Onboarding checklist component',        'design','task','inReview', 'u16','u2',  'med',   3,   ['component'],                 2,10,'Reviewer flagged keyboard ordering on the expandable items and a focus trap on the modal summary.'],
  ['a16','NW-116','Invoice PDF generation',                'app',  'bug',  'inProgress','u39','u5',  'high',  5,  ['billing','reporting'],       4,19,'Line items over 40 rows overflow the second page and the total is silently dropped.'],
  ['a17','NW-117','Contract clause library',               'app',  'task', 'todo',     'u23','u1',  'med',   20,  ['legal'],                     8,38,'Standard clauses the team re-types every engagement. Needs versioning so old contracts keep pointing at what they signed.'],
  ['a18','NW-118','API rate limiting',                     'platform','task','inProgress','u56','u3','high',9,['platform','security'],     5,22,'Per-key limits with a burst allowance. Needs to be transparent enough that integrators can plan for 429s.'],
  ['a19','NW-119','Accessibility audit — Q3 findings',     'app',  'epic', 'inProgress','u10','u2',  'high',  2,  ['a11y','ux-review'],          7,34,'47 findings from the last audit. 19 fixed; the remaining 28 are grouped here with the four critical ones prioritised.'],
  ['a20','NW-120','Client sandbox provisioning',           'platform','task','inProgress','u43','u3','med',11,['platform','client'],       3,14,'Self-serve sandbox with 7-day auto-expiry and a snapshot restore, so demos stop eating production data.'],
  ['a21','NW-121','Performance budget',                    'platform','epic','todo',   'u52','u3',  'med',   15,  ['perf','budget'],             5,26,'Gate builds on a 250KB budget. Needs the baseline measured before it becomes a hard fail.'],
  ['a22','NW-122','Time entry reconciliation',             'app',  'task', 'inReview', 'u6', 'u5',  'med',   4,   ['time','reporting'],          2,10,'Timesheet totals drift from task estimates by about 6%. Suspect the manual override path.'],
  ['a23','NW-123','Security posture review',               'platform','epic','todo',   'u4', 'u3',  'high',  12,  ['security','audit'],          8,36,'Quarterly review. Includes dependency sweep, secret scan and the access review for the 12 people with admin.'],
  ['a24','NW-124','Weekly digest email',                   'ops',  'task', 'done',     'u30','u1',  'low',  -21, ['comms'],                     2,9, 'Digest is live for the four project leads. Open rate is low but nobody has asked to be removed, which is the sign.'],
];
const TL = {
  a01:[['done',-9,'Brief written','u10'],['done',-6,'First pass designed','u10'],['cur',-4,'Compliance sign-off','u19'],['todo',0,'Ship to pilot','u6']],
  a02:[['done',-5,'Intermittent failures reproduced','u6'],['done',-2,'Backoff with jitter implemented','u6'],['cur',-1,'Review in progress','u5'],['todo',1,'Deploy','u47']],
  a03:[['done',-20,'Phases scoped','u3'],['done',-8,'Draft v2','u3'],['cur',-2,'Rollback section redrafted','u137'],['todo',1,'Cutover rehearsal','u47']],
  a04:[['done',-3,'Harness built','u47'],['cur',0,'Run 2k users 30 min','u47'],['todo',2,'Report + headroom analysis','u19']],
  a05:[['done',-30,'Scope agreed','u30'],['done',-16,'Vendor engagement opened','u30'],['cur',-12,'Field map request','u30'],['todo',0,'Export script','u39']],
  a06:[['done',-4,'Suites inventoried','u40'],['cur',-1,'Smoke tier defined','u40'],['todo',1,'Overnight tier wired to CI','u65']],
  a07:[['todo',0,'Audit 127 values','u34'],['todo',0,'Propose 42','u16'],['todo',0,'Deprecation table','u10'],['todo',0,'Migrate apps','u37']],
  a08:[['done',-2,'Listed 12 screens','u10'],['cur',0,'Copy drafted','u10'],['todo',3,'Design sign-off','u2'],['todo',5,'Implemented','u24']],
  a09:[['done',-6,'Scope agreed','u13'],['cur',-3,'KMS key policy request','u13'],['todo',2,'Signed export writer','u62'],['todo',4,'Retention job','u62']],
  a10:[['done',-4,'Race reproduced 1/50','u9'],['done',-2,'Fix implemented','u9'],['cur',0,'Pending review','u3']],
  a11:[['todo',0,'List templates','u137'],['todo',0,'Draft five','u14'],['todo',0,'Apply to live projects','u5']],
  a12:[['done',-7,'Grid spec agreed','u6'],['cur',-2,'Widget framework','u6'],['todo',3,'Permission scoping','u3'],['todo',6,'Ship to ops','u26']],
  a13:[['done',-20,'Sources reconciled','u30'],['done',-13,'Dry run #2','u30'],['done',-6,'Dry run #3 clean','u30']],
  a14:[['done',-30,'One source defined','u34'],['done',-18,'Multi-target compiler','u34'],['done',-13,'CI drift gate','u34']],
  a15:[['done',-9,'Component built','u16'],['done',-5,'Docs written','u16'],['cur',-1,'A11y review','u10'],['todo',1,'Ship','u2']],
  a16:[['done',-8,'Overflow reproduced','u39'],['cur',-3,'Pagination fix','u39'],['todo',1,'Regression test','u25'],['todo',3,'Deploy','u47']],
  a17:[['todo',0,'Collect in-use clauses','u23'],['todo',0,'Versioning model','u23'],['todo',0,'Insertion picker','u66']],
  a18:[['done',-9,'Design agreed','u56'],['cur',-4,'Limit engine','u56'],['todo',2,'429 telemetry','u26'],['todo',5,'Docs for integrators','u56']],
  a19:[['done',-24,'Audit completed','u10'],['done',-11,'19 findings fixed','u24'],['cur',-2,'Critical 28 triaged','u2'],['todo',10,'Remaining 24','u37']],
  a20:[['done',-6,'Provisioning spec','u43'],['cur',-1,'Auto-expiry job','u43'],['todo',2,'Snapshot restore','u13'],['todo',5,'Sandbox UI','u24']],
  a21:[['todo',0,'Measure baseline','u52'],['todo',0,'Set 250KB budget','u19'],['todo',0,'Wire build gate','u47']],
  a22:[['done',-7,'Drift quantified at 6%','u6'],['done',-2,'Override path traced','u6'],['cur',-1,'Review in progress','u30']],
  a23:[['todo',0,'Dependency sweep','u4'],['todo',0,'Secret scan','u4'],['todo',0,'Admin access review','u1'],['todo',0,'Report to Owner','u19']],
  a24:[['done',-40,'Content model agreed','u30'],['done',-28,'Renderer built','u24'],['done',-21,'Shipped to 4 leads','u30']],
};
const TASKS = T0.map((t,i) => {
  const id=t[0], key=t[1], title=t[2], project=t[3], type=t[4], status=t[5], assignee=t[6], reportee=t[7],
        prio=t[8], dueD=t[9], tags=t[10], story=t[11], cost=t[12], blocker=t[13];
  const proj = PROJECTS[project];
  const total = Math.round(cost * (0.72 + rnd()*0.6));
  let done = 0;
  if (status === 'done') done = total;
  else if (status === 'blocked') done = Math.round(total * (0.25 + rnd()*0.25));
  else if (status === 'inReview') done = Math.round(total * 0.86);
  else if (status === 'inProgress') done = Math.round(total * (0.2 + rnd()*0.45));
  else if (rnd() < 0.25) done = Math.round(total * rnd() * 0.4);
  const t2 = (TL[id] || []).map(s => ({ state:s[0], date: due(s[1]), by:s[2], what:s[3] }));
  return {
    id, key, title, project, type, status, prio, tags,
    assignee: byId[assignee] ? assignee : null,
    reportee: byId[reportee] ? reportee : null,
    due: due(dueD), story, cost, total, done,
    effort: [2,4,8,13,21][i % 5],
    blockers: status === 'blocked' ? [blocker] : [],
    blockedSince: status === 'blocked' ? ago(60 + i*9) : null,
    created: due(-(10 + ((i*37)%26))),
    updated: due(-((i*7)%6)),
    completedAt: status === 'done' ? due(-((i*3)%18) - 1) : null,
    dependencies: i % 9 === 0 && i > 2 ? [T0[(i+3)%T0.length][0]] : [],
    activity: t2, watch: 2 + (i % 6), comments: (i*3) % 7,
    projectLabel: proj.name, projectColor: proj.color,
  };
});
const TASK_TITLES = {
  app:['Client onboarding wizard','Billing line-item edit','Notification centre','Dark mode contrast pass','Empty-state illustrations','Keyboard shortcuts reference','Export to Excel','Client portal login flow','Rate sheet editor','Task template library','Weekly digest to clients','Contract attachment upload','Portal search relevance','Mobile offline queue','Invoice number customisation','Client status feed','Redline compare view','Time entry bulk edit','Milestone dependency graph','Client approval gate','Portal notification digests','Sandbox account creation','Client access expiry','Usage export to CSV','Portal theme picker'],
  platform:['Migration phase 2 rollback','Migration audit logging','Migration checksum validation','Feature flag rollout plan','Staging promotion gate','Database index audit','Sticky session handling','Cutover comms plan','Canary release script','Backfill job hardening','Read replica lag alert','Schema diff report','Migration progress telemetry','Cutover go/no-go checklist','Legacy endpoint sunset','Deprecation notice schedule','Rollback drill','Zero-downtime deploy runbook','Connection pooling review','Graceful shutdown test'],
  qa:['A11y smoke tier','Contract test suite','Cross-browser matrix','Flaky test quarantine','Mock server hardening','Nightly perf baseline','Regression report email','Visual diff baseline','Test data factory','Coverage gate on main','Mobile regression pack','Security regression pack','Load test nightly','Snapshot regression suite','Chaos test for deploys','Test environment resets','Defect triage board','Sign-off checklist','Release readiness report','QA runbook v2'],
  crm:'Lead scoring rules|Legacy CRM field mapping|Duplicate contact merge|Contact sync conflict rules|CRM history migration|Legacy pricing table import|Archive purge job|CRM export schema review|Vendor API rate budget|Migration rollback plan|Contact dedupe scoring|Legacy address normalisation|Migration observability dashboard|Sync retry queue|Legacy CRM read-only lock|Migration acceptance tests'.split('|'),
  design:['Icon set refresh','Motion guidelines','Type scale cleanup','Spacing scale audit','Empty state library','Form validation states','Tooltip component','Modal focus management','Table density tokens','Skeleton loaders','Stepper component','Tag component','Data table filter UX','Chart theming','Error state patterns','Loading strategy guide','Component naming audit','Design doc template','Token deprecation notice','Storybook navigation'],
  ops:['User audit report','Role template library draft','Passwordless pilot','Session policy review','Sandbox expiry job','Access review automation','Provisioning dry run','De-provisioning checklist','Weekly usage digest','Org chart import','Team capacity snapshot','Project health report','Onboarding checklist automation','Invite flow permissions','License usage report','Retention policy review','Admin action log','Service account rotation','Vendor access review','Ops dashboard v1'],
};
const PROJ_T = { app:TASK_TITLES.app, platform:TASK_TITLES.platform, qa:TASK_TITLES.qa, crm:TASK_TITLES.crm, design:TASK_TITLES.design, ops:TASK_TITLES.ops };
const ST_TITLE = {
  todo:['Draft','Scope','Audit','Plan','Review request','Inventory','Collect','List','Spec draft','Define'],
  inProgress:['In flight','Underway','Building','Iterating','Reviewing','Investigating','Implementing'],
  inReview:['In review','Review pass','Awaiting approval','Sign-off pending','Polish pass'],
  blocked:['Blocked: awaiting','Stalled on','Waiting on','Blocked by','Halted by'],
  done:['Complete','Shipped','Landed','Done','Closed','Merged'],
};
const ST_TAG = {
  todo:['planning','discovery'], inProgress:['delivery'], inReview:['review'], blocked:['risk'], done:['done'],
};
const ST_DUE = { todo:[3,30], inProgress:[0,18], inReview:[-1,6], blocked:[0,10], done:[-30,-2] };
const ST_PRIO = { todo:['low','med','med','high','urgent'], inProgress:['med','high','high','urgent','low'], inReview:['med','high'], blocked:['high','urgent','med'], done:['low','med','high','med','urgent'] };
const ST_ACT = {
  todo:[['todo',-2,'Brief drafted',''],['todo',0,'Scope defined',''],['todo',2,'Discovery calls','']],
  inProgress:[['done',-6,'Brief drafted',''],['done',-3,'Kickoff held',''],['cur',0,'Implementation underway',''],['todo',3,'Review hand-off','']],
  inReview:[['done',-5,'Brief drafted',''],['done',-2,'Implementation done',''],['cur',-1,'In review',''],['todo',1,'Merge + deploy','']],
  blocked:[['done',-8,'Brief drafted',''],['done',-4,'Work started',''],['cur',-3,'Blocked',''],['todo',0,'Resume once unblocked','']],
  done:[['done',-9,'Brief drafted',''],['done',-5,'Implementation done',''],['done',-2,'Review passed',''],['done',-1,'Shipped','']],
};
const ST_STATE = { todo:'todo', inProgress:'inProgress', inReview:'inReview', blocked:'blocked', done:'done' };
let TN = 125;
const PPL = TEAM.filter(m => m.status !== 'invited' && !['u1'].includes(m.id));
const MAN = ['u2','u3','u4','u5','u1'];
const GEN_COUNT = 76;
const GEN = [];
for (let i=0;i<GEN_COUNT;i++){
  const r0=rnd();
  const status = r0<0.14?'todo' : r0<0.52?'inProgress' : r0<0.68?'inReview' : r0<0.80?'blocked' : 'done';
  const pid = PROJ_ORDER[i%6];
  const proj = PROJECTS[pid];
  const pool = PROJ_T[pid];
  const title = pool[i%pool.length];
  const a = PPL[(i*3 + Math.floor(rnd()*11)) % PPL.length];
  const rep = MAN[i%5];
  const prio = ST_PRIO[status][i % ST_PRIO[status].length];
  const rng = ST_DUE[status];
  const dueD = rng[0] + Math.floor(rnd()*(rng[1]-rng[0]+1));
  const cost = Math.round(2 + rnd()*16);
  const total = Math.round(cost * (0.72 + rnd()*0.6));
  let done = status==='done'? total : status==='blocked'? Math.round(total*(0.22+rnd()*0.28)) : status==='inReview'? Math.round(total*0.88) : status==='inProgress'? Math.round(total*(0.2+rnd()*0.45)) : 0;
  const tags = ['delivery','planning'].slice(0,1);
  ST_TAG[status].forEach(t => { if (!tags.includes(t)) tags.push(t); });
  if (pid==='app' && i%4===0) tags.push('billing');
  if (pid==='platform' && i%3===0) tags.push('migration');
  if (i%5===0) tags.push('a11y');
  const act = ST_ACT[status].map(s => ({ state:s[0], date:due(s[1]), by:s[3]||a.id, what:s[2] }));
  GEN.push({
    id: uid('g'), key: 'NW-'+(++TN), title, project: pid, type: i%11===0?'epic':(i%7===0?'bug':'task'),
    status: ST_STATE[status], prio, tags, assignee: a.id, reportee: rep,
    due: due(dueD), story: '', cost, total, done, effort: [2,3,5,8,13][i%5],
    blockers: status==='blocked' ? ['Waiting on an external decision from the client before this can move.'] : [],
    blockedSince: status==='blocked' ? ago(30+i*7) : null,
    created: due(-(8+((i*31)%22))), updated: due(-((i*11)%5)),
    completedAt: status==='done'? due(-((i*5)%20)-1) : null,
    dependencies: [], activity: act, watch: 1+(i%5), comments: (i*3)%6,
    projectLabel: proj.name, projectColor: proj.color,
  });
}
TASKS.push(...GEN);
const TASK_BY_ID = {};
TASKS.forEach(t => { TASK_BY_ID[t.id] = t; });
const openTasks = TASKS.filter(t => t.status !== 'done');
const doneTasks = TASKS.filter(t => t.status === 'done');
/* ---- project membership: every project gets a real, distinct crew ---- */
const PROJECT_MEMBERS = {};
PROJ_ORDER.forEach(pid => { PROJECT_MEMBERS[pid] = new Set(); });
const assignPeople = (pid, ids) => ids.forEach(id => { if (byId[id]) PROJECT_MEMBERS[pid].add(id); });
assignPeople('app', ['u2','u10','u19','u2','u6','u24','u37','u66','u72','u39','u23','u2','u16']);
assignPeople('platform', ['u3','u13','u26','u47','u52','u56','u58','u62','u70','u76','u84','u92','u98','u3','u21','u43']);
assignPeople('qa', ['u4','u40','u8','u12','u18','u25','u28','u32','u36','u46','u51','u57','u61','u65','u75','u79','u4','u137']);
assignPeople('crm', ['u5','u30','u39','u14','u22','u60','u68','u104','u122','u128','u130','u5','u30','u45']);
assignPeople('design', ['u2','u10','u16','u27','u34','u42','u49','u55','u63','u71','u77','u83','u87','u93','u2','u105']);
assignPeople('ops', ['u137','u14','u23','u30','u38','u53','u59','u67','u81','u89','u95','u101','u107','u119','u123','u131','u1','u137']);
const MEMBER_POOL = {};
PROJ_ORDER.forEach(pid => { MEMBER_POOL[pid] = [...PROJECT_MEMBERS[pid]]; });
PROJ_ORDER.forEach(pid => {
  const proj = PROJECTS[pid];
  proj.members = MEMBER_POOL[pid];
  proj.memberCount = proj.members.length;
  const pks = TASKS.filter(t => t.project === pid);
  proj.taskCount = pks.length;
  proj.openTasks = pks.filter(t => t.status !== 'done').length;
  proj.doneTasks = pks.filter(t => t.status === 'done').length;
  proj.committed = pks.reduce((s,t) => s + t.total, 0);
  proj.completed = pks.reduce((s,t) => s + t.done, 0);
  proj.burn = pks.filter(t => t.status !== 'done' && t.updated >= due(-7)).length;
});
TASKS.forEach(t => {
  const pool = MEMBER_POOL[t.project] || [];
  if (!byId[t.assignee] || !pool.includes(t.assignee)) {
    const cands = pool.filter(id => id !== t.reportee);
    t.assignee = cands.length ? cands[taskHash(t) % cands.length] : null;
  }
  if (!byId[t.reportee] || !pool.includes(t.reportee)) {
    const cands = pool.filter(id => id !== t.assignee);
    t.reportee = cands.length ? cands[taskHash(t) % cands.length] : null;
  }
});
function taskHash(t){
  let h=0;
  for (let i=0;i<t.key.length;i++) h=(h*31+t.key.charCodeAt(i))&0xffff;
  return h;
}
const teamOf = pid => PROJECT_MEMBERS[pid] ? [...PROJECT_MEMBERS[pid]] : [];
const projMemberObjs = pid => teamOf(pid).map(id => byId[id]).filter(Boolean);
const peopleIn = id => PROJ_ORDER.filter(pid => PROJECT_MEMBERS[pid].has(id));
const personTasks = id => TASKS.filter(t => t.assignee === id || t.reportee === id);
const personOpen = id => personTasks(id).filter(t => t.status !== 'done');

/* ---- activity feed (real dates, real people, cross-project) ---- */
const ACT_SPEC = [
  [0.5,'added',   'NW-128','Client onboarding wizard','app','todo','u19','u2','u2','Created the task and set the due date for Nov 5.'],
  [2,  'commented','NW-102','Payment retry backoff','app','bug','u5','u6','u6','Can we add jitter? Fixed intervals tend to herd retries after an outage.'],
  [3,  'moved',   'NW-112','Dashboard widget framework','ops','task','u6','u3','u3','Moved from To do to In progress after the grid spec was agreed.'],
  [5,  'assigned','NW-119','Accessibility audit — Q3 findings','app','epic','u2','u10','u2','Reassigned to Aisha now that the design review for the Q4 work is wrapped.'],
  [6,  'commented','NW-105','Legacy CRM export spec','crm','epic','u30','u1','u1','Vendor has not responded to the second follow-up. Escalating to account management today.'],
  [8,  'blocked', 'NW-101','Design review gate for billing flow','app','task','u19','u2','u2','Marked blocked — compliance sign-off is the gating item, not us.'],
  [11, 'completed','NW-114','Design tokens pipeline','design','task','u34','u2','u2','Merged. CI now fails on token drift across CSS, iOS and Android targets.'],
  [14, 'commented','NW-103','Migration cutover runbook','platform','task','u137','u3','u3','Rewrote the rollback section and corrected the DNS TTL in the cutover appendix.'],
  [16, 'added',   'NW-131','Passwordless pilot','ops','task','u137','u1','u1','Scoped a 30-person pilot before we go all-in with the whole org.'],
  [20, 'moved',   'NW-122','Time entry reconciliation','app','task','u30','u5','u5','Moved to In review — the override path is traced and the fix is up for look.'],
  [23, 'assigned','NW-106','Nightly regression matrix','qa','task','u4','u40','u4','Assigned the smoke tier definition to Olivia.'],
  [26, 'commented','NW-110','Session timeout race','platform','bug','u3','u9','u9','Good catch on the 1-in-50 repro rate. Please keep the fix behind a flag until staging.'],
  [29, 'completed','NW-124','Weekly digest email','ops','task','u30','u1','u1','Shipped to the four project leads.'],
  [33, 'moved',   'NW-104','Load test staging','platform','task','u47','u3','u3','Moved to In progress; harness is built and scheduled for tonight.'],
  [38, 'added',   'NW-138','Contract clause library','app','task','u23','u1','u1','Set an 11-week horizon; legal wants it before the Meridian renewal.'],
  [44, 'commented','NW-107','Token consolidation','design','task','u16','u2','u2','127 values is the real count after deduping the dark-theme variants.'],
  [50, 'assigned','NW-111','Role template library','ops','epic','u1','u137','u1','Assigned to Vera; five templates, one per recurring project shape.'],
  [58, 'completed','NW-113','Data migration dry run #3','crm','task','u30','u5','u5','1.2M records reconciled, zero unmatched foreign keys, 18 minutes wall clock.'],
  [66, 'blocked', 'NW-109','Audit log export to S3','ops','task','u13','u3','u3','Blocked on the KMS key policy approval from platform.'],
  [74, 'moved',   'NW-108','Empty-state copy pass','app','task','u10','u2','u2','Moved to In progress with the copy draft attached.'],
  [80, 'added',   'NW-142','Security posture review','platform','epic','u4','u3','u3','Opened the quarterly review; starts with the dependency sweep.'],
  [88, 'commented','NW-116','Invoice PDF generation','app','bug','u39','u5','u5','Confirmed the total is dropped, not mis-summed — the renderer stops at 40 rows.'],
  [96, 'assigned','NW-120','Client sandbox provisioning','platform','task','u3','u43','u3','Assigned the auto-expiry job to Luke.'],
  [104,'moved',   'NW-115','Onboarding checklist component','design','task','u10','u2','u2','Moved to In review after the a11y pass flagged the focus trap.'],
  [112,'completed','NW-133','Icon set refresh','design','task','u27','u2','u2','48 new icons in, 26 deprecated out.'],
  [120,'commented','NW-118','API rate limiting','platform','task','u56','u3','u3','Drafting the 429 telemetry first so we can show integrators what to expect.'],
  [130,'added',   'NW-149','QA runbook v2','qa','task','u40','u4','u4','Replaces the runbook from last year; the old one references environments we no longer run.'],
  [138,'blocked', 'NW-140','Contract test suite','qa','task','u8','u4','u4','Blocked — the contract suite needs the migration audit logs, which are blocked too.'],
  [150,'assigned','NW-126','Migration phase 2 rollback','platform','task','u3','u84','u3','Assigned to Jonas ahead of the cutover rehearsal.'],
  [160,'moved',   'NW-136','Passwordless pilot','ops','task','u137','u1','u1','Moved to In progress; the pilot list is the 30 people closest to launch.'],
  [170,'commented','NW-121','Performance budget','platform','epic','u52','u3','u3','Baseline is 312KB today. Setting the gate at 250KB will require real work, not just a flag.'],
  [180,'added',   'NW-152','Onboarding checklist automation','ops','task','u1','u137','u1','Added so new hires stop relying on tribal knowledge for week one.'],
  [190,'completed','NW-144','Sticky session handling','platform','task','u56','u3','u3','Landed behind the session-service flag.'],
  [200,'moved',   'NW-155','Migration phase 2 audit logging','platform','task','u30','u3','u3','Moved to In review; the checksum job is included for completeness.'],
  [210,'assigned','NW-158','Lead scoring rules','crm','task','u30','u5','u5','Assigned ahead of the sales enablement session next week.'],
  [220,'commented','NW-160','Data table filter UX','design','task','u2','u2','u2','Filter row needs to survive a 40-column export. Testing with the CRM team’s widest view.'],
  [230,'added',   'NW-163','Client status feed','app','task','u19','u2','u2','Added to close the gap clients flagged in the Q3 survey.'],
  [240,'blocked', 'NW-167','Access review automation','ops','task','u14','u1','u1','Blocked on the finalise-role-templates decision upstream.'],
  [250,'completed','NW-171','Cross-browser matrix','qa','task','u8','u4','u4','Matrix now covers Chrome, Firefox, Safari and Edge across Windows and macOS.'],
  [260,'moved',   'NW-174','Icon set refresh','design','task','u16','u2','u2','Moved to In review.'],
  [270,'assigned','NW-178','Cutover go/no-go checklist','platform','task','u3','u137','u3','Assigned to Vera for the cutover rehearsal on Nov 1.'],
  [280,'commented','NW-181','Test data factory','qa','task','u65','u4','u4','The factory needs deterministic seeds or the nightly diffs will never settle.'],
  [290,'completed','NW-184','Legacy endpoint sunset','platform','task','u43','u3','u3','Sunset notice sent; the endpoint goes dark in December.'],
  [300,'added',   'NW-187','Migration observability dashboard','crm','task','u30','u5','u5','Added so migration runs are visible without asking the platform team.'],
  [310,'moved',   'NW-190','Chart theming','design','task','u27','u2','u2','Moved to In progress.'],
  [320,'assigned','NW-193','Weekly usage digest','ops','task','u1','u30','u1','Assigned to Lena to build on the existing digest renderer.'],
  [330,'commented','NW-196','Client portal login flow','app','task','u19','u2','u2','Two clients still hit the legacy login. Redirect is in place but not announced yet.'],
  [340,'completed','NW-199','Skeleton loaders','design','task','u34','u2','u2','Shipped to the portal and the ops dashboards.'],
  [350,'added',   'NW-202','Role template library draft','ops','task','u137','u1','u1','Draft templates pulled from the three most common project shapes.'],
  [360,'blocked', 'NW-205','Contact dedupe scoring','crm','task','u60','u5','u5','Blocked on the CRM data quality report — we are scoring against a bad baseline.'],
  [370,'moved',   'NW-208','Passwordless pilot','ops','task','u26','u3','u3','Moved to In progress with the pilot cohort confirmed.'],
  [380,'assigned','NW-211','Mobile regression pack','qa','task','u40','u4','u4','Assigned ahead of the iOS 26 certification pass.'],
  [390,'commented','NW-214','Session policy review','ops','task','u14','u1','u1','Current 30-minute timeout is shorter than two clients’ standard workflow. Revising.'],
  [400,'completed','NW-217','Design doc template','design','task','u55','u2','u2','Template is live and used on the last three design docs.'],
  [410,'added',   'NW-220','License usage report','ops','task','u137','u1','u1','Added for the November vendor renegotiation.'],
  [420,'moved',   'NW-223','Legacy CRM field mapping','crm','task','u39','u5','u5','Moved to In review after the vendor field map finally arrived.'],
  [430,'assigned','NW-226','Redline compare view','app','task','u23','u2','u2','Assigned to close the biggest gap in the contract workflow.'],
  [440,'blocked', 'NW-229','Vendor API rate budget','crm','task','u45','u5','u5','Blocked on a rate-limit increase from the vendor.'],
  [450,'completed','NW-232','Table density tokens','design','task','u49','u2','u2','Tokens shipped; three dashboards moved off hard-coded heights.'],
];
const ACTS = ACT_SPEC.map(a => {
  const h=a[0], proj=PROJECTS[a[4]], person=byId[a[6]]||byId[a[7]];
  return {
    date: ago(h), verb:a[1], key:a[2], title:a[3], project:a[4],
    who: a[6], whoName: person.name, whoColor: avColor(person.name),
    initials: initials(person.name), projectLabel: proj.name, projectColor: proj.color,
    note:a[9],
  };
});
const ACTIVITY = ACTS.slice().sort((a,b) => a.date - b.date);

/* ---- notifications, tasks needing decisions, approvals ---- */
const NEEDS = [
  { id:'nd1', kind:'review',  key:'NW-102', title:'Payment retry backoff',        task:'NW-102', due:'today',  who:'u5',  note:'Your review is blocking the deploy of the billing fix.' },
  { id:'nd2', kind:'approve', key:'NW-103', title:'Migration cutover runbook',    task:'NW-103', due:'in 2 days',who:'u1', note:'Runbook v3 needs Owner sign-off before the cutover rehearsal.' },
  { id:'nd3', kind:'blocked', key:'NW-105', title:'Legacy CRM export spec',       task:'NW-105', due:'7 days', who:'u30', note:'Blocked on the vendor field map for merged contacts.' },
  { id:'nd4', kind:'review',  key:'NW-122', title:'Time entry reconciliation',    task:'NW-122', due:'today',  who:'u30',note:'Review requested on the override-path fix.' },
  { id:'nd5', kind:'decision',key:'NW-112', title:'Dashboard widget framework',   task:'NW-112', due:'in 3 days',who:'u3', note:'Security needs a decision on per-widget permission scoping.' },
  { id:'nd6', kind:'blocked', key:'NW-109', title:'Audit log export to S3',       task:'NW-109', due:'5 days', who:'u13',note:'Waiting on the KMS key policy approval from platform.' },
  { id:'nd7', kind:'approve', key:'NW-115', title:'Onboarding checklist component',task:'NW-115',due:'in 1 day',who:'u2', note:'Component is ready to ship after the a11y fixes land.' },
  { id:'nd8', kind:'blocked', key:'NW-240', title:'Access review automation',     task:'NW-240', due:'9 days', who:'u14',note:'Blocked on the role-templates decision upstream.' },
];
const NOTIF = [
  { id:'n1', date:ago(0.5), icon:'msg',  tone:'info',   text:'Marcus Reed commented on Payment retry backoff', sub:'Can we add jitter? Fixed intervals tend to herd retries after an outage.', link:'task', ref:'NW-102' },
  { id:'n2', date:ago(2),   icon:'at',   tone:'accent', text:'You were assigned a review on Payment retry backoff', sub:'Requested by Sofia Romano · due today', link:'task', ref:'NW-102' },
  { id:'n3', date:ago(5),   icon:'lock', tone:'warn',   text:'Legacy CRM export spec is blocked', sub:'Vendor field map still outstanding · reported by Elena Rossi', link:'task', ref:'NW-105' },
  { id:'n4', date:ago(7),   icon:'check',tone:'ok',     text:'Design tokens pipeline was completed', sub:'Merged to main by Anna Kowalski', link:'task', ref:'NW-114' },
  { id:'n5', date:ago(9),   icon:'at',   tone:'accent', text:'You were mentioned in Time entry reconciliation', sub:'The drift is coming from the manual override path.', link:'task', ref:'NW-122' },
  { id:'n6', date:ago(11),  icon:'clock',tone:'danger', text:'Design review gate for billing flow is overdue', sub:'Due Oct 15 · blocked since Oct 10', link:'task', ref:'NW-101' },
  { id:'n7', date:ago(16),  icon:'user', tone:'info',   text:'Vera Lindholm was invited to Internal Ops Tools', sub:'Invitation pending · owner role', link:'people', ref:'u137' },
  { id:'n8', date:ago(20),  icon:'check',tone:'ok',     text:'Data migration dry run #3 passed', sub:'1.2M records · 0 unmatched keys · 18 minutes', link:'task', ref:'NW-113' },
  { id:'n9', date:ago(26),  icon:'lock', tone:'warn',   text:'Audit log export to S3 is blocked', sub:'Waiting on the KMS key policy approval', link:'task', ref:'NW-109' },
  { id:'n10',date:ago(34),  icon:'flag', tone:'info',   text:'Security posture review opened for Q3', sub:'Dependency sweep, secret scan and admin access review', link:'task', ref:'NW-232' },
];
const APPROVALS = [
  { id:'ap1', title:'Migration cutover runbook v3',       task:'NW-103', req:'u3',  reqName:'Marcus Reed',      due:due(2),  status:'pending',  note:'Owner sign-off required before the Nov 1 cutover rehearsal. Rollback section redrafted on Oct 12.' },
  { id:'ap2', title:'KMS key policy for audit exports',   task:'NW-109', req:'u13', reqName:'Noah Patel',       due:due(-2), status:'pending',  note:'Platform to approve the key policy so audit logs can be exported to immutable S3 storage.' },
  { id:'ap3', title:'Role template library — scope',      task:'NW-111', req:'u137',reqName:'Vera Lindholm',    due:due(6),  status:'pending',  note:'Five templates, applied to the three live projects. Needs Owner approval before we re-map existing access.' },
  { id:'ap4', title:'Passwordless pilot cohort (30 users)',task:'NW-131',req:'u137',reqName:'Vera Lindholm',    due:due(4),  status:'pending',  note:'Pilot limited to platform and QA staff to keep blast radius small.' },
  { id:'ap5', title:'Onboarding checklist component',      task:'NW-115', req:'u2',  reqName:'Ava Chen',         due:due(1),  status:'pending',  note:'Ready to ship after the focus-trap fix lands. Unblocks the portal redesign milestone.' },
  { id:'ap6', title:'Session timeout policy change',       task:'NW-214', req:'u14', reqName:'Fatima Zouari',    due:due(-1), status:'approved', note:'Approved Oct 13 — 30 minutes extended to 60 for portal workflows, kept at 15 for the admin console.' },
  { id:'ap7', title:'Legacy CRM endpoint sunset',          task:'NW-199', req:'u43', reqName:'Luke Fletcher',    due:due(-6), status:'approved', note:'Approved. Endpoint goes dark December 15; notice sent to all integrators on Oct 8.' },
  { id:'ap8', title:'Vendor API rate-limit increase',      task:'NW-229', req:'u45', reqName:'Miguel Santos',    due:due(-9), status:'rejected', note:'Rejected — vendor will not move off the shared quota. Miguel is scoping a local queue instead.' },
];
/* ---- project launch checklists: 120 steps, mixed progress per project ---- */
const CHECKLISTS = PROJ_ORDER.map(pid => {
  const proj = PROJECTS[pid];
  const lead = byId[proj.lead];
  const doneCount = clamp(Math.round((proj.health - 52) * 0.19), 3, 11);
  return {
    project: pid, label: proj.name, lead: lead.name, leadId: proj.lead,
    items: [
      { t:'Kickoff and stakeholders aligned', d:'Done', by:lead.name, date:due(-46), state:'done' },
      { t:'Scope, owners and definition of done', d:'Done', by:'u19' in byId?byId.u19.name:lead.name, date:due(-40), state:'done' },
      { t:'Budget and capacity confirmed', d:'Done', by:'u1' in byId?byId.u1.name:lead.name, date:due(-34), state:'done' },
      { t:'Design and technical review completed', d:'Done', by:byId.u2?byId.u2.name:lead.name, date:due(-27), state:'done' },
      { t:'Dependencies mapped and communicated', d:'Done', by:lead.name, date:due(-20), state:'done' },
      { t:'First deliverable shipped', d:'Done', by:byId.u24?byId.u24.name:lead.name, date:due(-13), state:'done' },
      { t:'Quality and regression suite in place', d:'In progress', by:byId.u40?byId.u40.name:lead.name, date:due(2), state:'cur' },
      { t:'Stakeholder demo and feedback round', d:'In progress', by:lead.name, date:due(4), state:'cur' },
      { t:'Risk review and mitigation plan', d:'Next', by:byId.u1?byId.u1.name:lead.name, date:due(7), state:'todo' },
      { t:'Go / no-go decision recorded', d:'Next', by:'u1' in byId?byId.u1.name:lead.name, date:due(10), state:'todo' },
      { t:'Launch window booked', d:'Next', by:lead.name, date:due(12), state:'todo' },
      { t:'Communication sent to stakeholders', d:'Next', by:byId.u30?byId.u30.name:lead.name, date:due(13), state:'todo' },
      { t:'Launch checklist executed', d:'Next', by:lead.name, date:due(14), state:'todo' },
      { t:'Post-launch monitoring window', d:'Next', by:byId.u47?byId.u47.name:lead.name, date:due(15), state:'todo' },
      { t:'Retrospective and lessons recorded', d:'Next', by:'u1' in byId?byId.u1.name:lead.name, date:due(18), state:'todo' },
    ].map((it,i) => ({ ...it, state: i < doneCount ? 'done' : (i === doneCount ? 'cur' : 'todo') })),
  };
});
CHECKLISTS.forEach(c => {
  c.doneCount = c.items.filter(i => i.state === 'done').length;
  c.total = c.items.length;
  c.progress = pct(c.doneCount, c.total);
});
const CHECK_BY_PROJ = {};
CHECKLISTS.forEach(c => { CHECK_BY_PROJ[c.project] = c; });

/* ---- global mutable state ---- */
const S = {
  view:'dashboard', taskFilter:'all', board:'mine', projFilter:'all', projTab:'overview',
  peopleTab:'people', peopleRole:'all', peopleProject:'all', peopleQ:'', sort:'util',
  notifRead:false, taskModal:null, peopleModal:null, settingsTab:'team',
  personDrawer:null, projectDrawer:null, approvalsView:false, approvalsDone:false,
  newTask:false, dark:false,
};
const $ = (s,r) => (r||document).querySelector(s);
const $$ = (s,r) => Array.from((r||document).querySelectorAll(s));
const el = (t,c,h) => { const e=document.createElement(t); if(c) e.className=c; if(h!=null) e.innerHTML=h; return e; };
const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let AV = {};
TEAM.forEach(m => { AV[m.id] = '<span class="av" style="background:'+avColor(m.name)+'" title="'+esc(m.name)+'">'+esc(initials(m.name))+'</span>'; });
const av = id => AV[id] || '<span class="av" style="background:#6b7280">?</span>';
const pAv = id => '<span class="av" style="background:'+avColor(byId[id].name)+'" title="'+esc(byId[id].name)+'">'+esc(initials(byId[id].name))+'</span>';
function avStack(ids, max){
  max = max||4;
  let h = '<div class="ava-stack">';
  ids.slice(0,max).forEach(id => { h += pAv(id); });
  if (ids.length > max) h += '<span class="more chip">+'+(ids.length-max)+'</span>';
  return h + '</div>';
}
function badge(status){
  const s = STATUS[status];
  return '<span class="badge '+s.c+'"><span class="dot sm"></span>'+esc(s.l)+'</span>';
}
function prBadge(p){
  const v = PRIO[p];
  return '<span class="'+v.cls+'">'+esc(v.l)+'</span>';
}
function dueLabel(d){
  const n = daysFrom(d);
  if (n < 0)  return '<span class="due-over">'+fmtD(d)+' · '+Math.abs(n)+'d overdue</span>';
  if (n === 0)return '<span class="due-over">Due today</span>';
  if (n === 1)return '<span class="due-soon">Due tomorrow</span>';
  if (n <= 3) return '<span class="due-soon">'+fmtD(d)+' · in '+n+'d</span>';
  return '<span class="due-ok">'+fmtD(d)+'</span>';
}
function spark(vals, color, h){
  h = h||36;
  const w = 200, mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals);
  const span = (mx-mn) || 1;
  const pts = vals.map((v,i) => (i*(w/(vals.length-1))).toFixed(1)+','+(h-4-((v-mn)/span)*(h-12)).toFixed(1)).join(' ');
  const area = '0,'+h+' '+pts+' '+w+','+h;
  const id = 'sp'+Math.floor(rnd()*1e9);
  return '<svg class="kpi-spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+
    '<defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0%" stop-color="'+color+'" stop-opacity=".26"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>'+
    '<polygon points="'+area+'" fill="url(#'+id+')"/>'+
    '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}
function ring(p, size, cls, color){
  size = size||34; cls = cls||'xs';
  const r = (size-6)/2, c = 2*Math.PI*r;
  const col = color || (p>=80?'var(--ok)':p>=50?'var(--warn)':'var(--danger)');
  return '<div class="ring '+cls+'"><svg width="'+size+'" height="'+size+'">'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--surface-3)" stroke-width="4"/>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="4" stroke-linecap="round" '+
    'stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+(c*(1-p/100)).toFixed(1)+'"/></svg>'+
    '<span class="pct">'+p+'</span></div>';
}
/* ================= VIEWS ================= */
const NAV = [
  { id:'dashboard', label:'Dashboard',  icon:'home',   count:openTasks.length },
  { id:'tasks',     label:'My Work',    icon:'list',   count:personOpen('u1').length },
  { id:'projects',  label:'Projects',   icon:'folder', count:PROJ_ORDER.length },
  { id:'people',    label:'People',     icon:'people', count:TEAM.length },
  { id:'approvals', label:'Approvals',  icon:'check',  count:APPROVALS.filter(a => a.status==='pending').length, badge:true },
  { id:'settings',  label:'Settings',   icon:'gear' },
];
function sidebar(){
  let h = '<aside class="sidebar">';
  h += '<div class="brand"><span class="logo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg></span><span class="bt">SenseWork<span class="bd">v1 demo</span></span></div>';
  h += '<div class="ws"><div class="ws-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M9 4v16"/></svg></div><div class="ws-tx"><div class="ws-n">Nordwind Studio</div><div class="ws-s">148 members · 6 projects</div></div></div>';
  h += '<div class="nav-lbl">Workspace</div>';
  NAV.forEach(n => {
    const on = S.view === n.id ? ' active' : '';
    h += '<a class="nav-item'+on+'" data-nav="'+n.id+'"><span class="ic">'+icon(n.icon,18)+'</span><span>'+n.label+'</span>';
    if (n.badge && n.count) h += '<span class="badge b-danger">'+n.count+'</span>';
    else if (n.count) h += '<span class="nav-count">'+n.count+'</span>';
    h += '</a>';
  });
  h += '<div class="sb-foot"><div class="av" style="background:'+avColor(byId.u1.name)+'">'+esc(initials(byId.u1.name))+'</div><div class="sb-tx"><div class="sb-n">'+esc(byId.u1.name)+'</div><div class="sb-r">'+ROLES.owner.name+' · workspace owner</div></div></div>';
  h += '</aside>';
  return h;
}
const TITLES = {
  dashboard:{ h:'Dashboard',          s:'Nordwind Studio · '+TEAM.length+' people · '+openTasks.length+' open tasks' },
  tasks:    { h:'My Work',            s:'Your tasks, decisions and reviews — '+personOpen('u1').length+' open' },
  projects: { h:'Projects',           s:'Six active projects · '+PROJ_ORDER.reduce((s,p)=>s+PROJECTS[p].openTasks,0)+' open tasks' },
  people:   { h:'People',             s:TEAM.length+' members · '+TEAM.reduce((s,m)=>s+m.cap,0)+'h weekly capacity' },
  approvals:{ h:'Approvals',          s:APPROVALS.filter(a=>a.status==='pending').length+' awaiting your decision' },
  settings: { h:'Settings',           s:'Workspace, security, roles and preferences' },
  search:   { h:'Search',             s:'Find anything across tasks, projects and people' },
};
function topbar(){
  const t = TITLES[S.view] || {};
  let h = '<header class="topbar"><div class="tb-t"><h1>'+esc(t.h||'')+'</h1>';
  if (t.s) h += '<p>'+esc(t.s)+'</p>';
  h += '</div><div class="tb-sp"></div><div class="tb-a">';
  h += '<button class="btn ghost" id="tb-search" data-act="nav" data-view="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>Search<input placeholder="Search tasks, people…">⌘K</button>';
  h += '<button class="icon-btn" data-act="nav" data-view="approvals" title="Approvals"><span class="ib-ic">'+icon('check',20)+'</span><span class="ib-badge">'+APPROVALS.filter(a=>a.status==='pending').length+'</span></button>';
  h += '<button class="icon-btn'+(S.notifRead?'':' has-badge')+'" data-act="notifs" title="Notifications"><span class="ib-ic">'+icon('bell',20)+'</span></button>';
  h += '<span class="tb-div"></span>';
  h += '<button class="btn primary" data-act="new-task"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New task</button>';
  h += '</div></header>';
  return h;
}
function render(){
  const v = S.view;
  let body = v==='dashboard'?vDashboard() : v==='tasks'?vTasks() : v==='projects'?vProjects() : v==='people'?vPeople()
           : v==='approvals'?vApprovals() : v==='settings'?vSettings() : vSearch();
  document.getElementById('app').innerHTML = sidebar() + '<div class="main"><div class="view">'+topbar()+body+'</div></div>';
  document.querySelector('.sidebar').scrollTop = 0;
}
function open(id){
  S.view = id;
  S.taskModal = null; S.personDrawer = null; S.projectDrawer = null;
  if (id === 'tasks') S.board = 'mine';
  if (id === 'approvals') S.approvalsView = false;
  render();
}

/* ================= DASHBOARD ================= */
function vDashboard(){
  const done7 = TASKS.filter(t => t.status === 'done' && t.completedAt >= due(-7));
  const blocked = TASKS.filter(t => t.status === 'blocked');
  const capH = Math.round(TEAM.reduce((s,m) => s + m.cap, 0));
  const avH = Math.round(TEAM.reduce((s,m) => s + m.cap * (1 - m.util), 0));
  const atRisk = PROJ_ORDER.filter(p => PROJECTS[p].health < 70);
  const kpis = [
    { l:'Open tasks', v:openTasks.length,  t:'+4 vs last week',      cls:'up',   ic:'list',  col:'#2563eb', to:'tasks' },
    { l:'Points done · 7d', v:done7.reduce((s,t)=>s+t.total,0), t:'across '+done7.length+' tasks', cls:'up', ic:'check', col:'#059669', to:'tasks' },
    { l:'Blocked',  v:blocked.length,   t:atRisk.length+' projects at risk', cls:'dn', ic:'lock', col:'#dc2626', to:'tasks' },
    { l:'Capacity free', v:Math.round(avH/capH*100)+'%', t:avH+'h of '+capH+'h weekly', cls:'', ic:'clock', col:'#d97706', to:'people' },
    { l:'Active projects', v:PROJ_ORDER.length, t:atRisk.length+' at risk · 4 on track', cls:'', ic:'folder', col:'#7c3aed', to:'projects' },
    { l:'Budget committed', v:'$1.4M', t:'$2.0M total · 19 tasks in flight', cls:'dn', ic:'dollar', col:'#4f46e5', to:'projects' },
  ];
  let h = '<section class="kpi-strip">';
  kpis.forEach(k => {
    h += '<div class="kpi" data-act="nav" data-view="'+k.to+'"><div class="kpi-h"><span class="kpi-ic" style="color:'+k.col+'">'+icon(k.ic,17)+'</span><span class="kpi-l">'+k.l+'</span></div>';
    h += '<div class="kpi-v">'+k.v+'</div>';
    h += '<div class="kpi-t '+(k.cls||'')+'">'+(k.cls==='up'?'▲ ':k.cls==='dn'?'▼ ':'')+esc(k.t)+'</div>';
    h += '</div>';
  });
  h += '</section>';

  h += '<div class="split-37">';
  h += '<div class="col">';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Project status</div><div class="card-s">Live health across all six projects</div></div><button class="btn link" data-act="nav" data-view="projects">View projects →</button></div>';
  h += '<div class="prows">';
  PROJ_ORDER.slice().sort((a,b) => PROJECTS[a].health - PROJECTS[b].health).forEach(pid => {
    const p = PROJECTS[pid];
    h += '<div class="prow" data-act="nav" data-view="projects"><span class="dot" style="background:'+p.color+'"></span>';
    h += '<div class="prow-t"><div class="prow-n">'+esc(p.name)+'</div><div class="prow-s">'+p.memberCount+' people · '+p.openTasks+' open · '+p.doneTasks+' done</div></div>';
    h += '<div class="prow-p">'+esc(p.status)+'</div>';
    h += '<div class="prow-h">'+ring(p.health,34,'xs')+'</div></div>';
  });
  h += '</div></section>';

  const NEXT = ['NW-111','NW-226','NW-217','NW-181','NW-152','NW-131','NW-158','NW-220','NW-163','NW-193'];
  const mts = NEXT.map(k => TASKS.find(t => t.key === k)).filter(Boolean);
  h += '<section class="card"><div class="card-h"><div><div class="card-t">Upcoming milestones</div><div class="card-s">Next 30 days across the workspace</div></div><button class="btn link" data-act="nav" data-view="tasks">My Work →</button></div><div class="tl">';
  mts.forEach(m => {
    const cls = m.status === 'done' ? 'done' : m.status === 'blocked' ? 'blocked' : 'cur';
    h += '<div class="tl-i"><div class="tl-rail"><span class="tl-n '+cls+'">'+(cls==='done'?'✓':cls==='blocked'?'!':'●')+'</span></div>';
    h += '<div><div class="tl-h">'+esc(m.title)+'</div>';
    h += '<div class="tl-s"><span class="muted">'+esc(m.key)+'</span>·<span>'+dueLabel(m.due)+'</span>·'+av(m.assignee)+'</div></div></div>';
  });
  h += '</div></section>';

  h += '<section class="card"><div class="card-h"><div><div class="card-t">Project timeline</div><div class="card-s">Where each launch is right now</div></div></div><div class="split">';
  ['app','platform'].forEach(pid => {
    const p = PROJECTS[pid], c = CHECK_BY_PROJ[pid];
    h += '<div><div class="mini-h">'+esc(p.name)+'</div><div class="bar '+(p.health<70?'warn':'')+'"><i style="width:'+c.progress+'%"></i></div>';
    h += '<div class="tiny muted" style="margin-top:7px">'+c.doneCount+' of '+c.total+' launch steps · '+c.progress+'% complete</div></div>';
  });
  h += '</div></section>';

  h += '</div><aside class="col side">';

  const needs = NEEDS.slice(0, 5);
  h += '<section class="card"><div class="card-h"><div class="card-t">Needs your attention</div><div class="card-s">'+needs.length+' items</div></div>';
  needs.forEach(n => {
    h += '<div class="attn" data-act="open-task" data-key="'+esc(n.key)+'"><span class="attn-i '+(n.kind==='approve'?'i-ok':n.kind==='blocked'?'i-warn':'i-acc')+'">'+icon(n.kind==='approve'?'check':n.kind==='blocked'?'lock':'eye',15)+'</span>';
    h += '<div class="attn-tx"><div class="attn-h">'+esc(n.title)+'</div><div class="attn-s">'+esc(n.note)+'</div></div>';
    h += '<span class="attn-d">'+esc(n.due)+'</span></div>';
  });
  h += '<div class="card-f"><button class="btn ghost sm" data-act="nav" data-view="approvals">Open all approvals →</button></div></section>';

  h += '<section class="card"><div class="card-h"><div class="card-t">Activity</div><div class="card-s">Last 14 days</div></div>';
  ACTIVITY.slice().sort((a,b) => b.date - a.date).slice(0,8).forEach(a => {
    h += '<div class="act"><span class="av sm" style="background:'+a.whoColor+'">'+esc(a.initials)+'</span>';
    h += '<div class="act-bx"><div class="act-tx"><b>'+esc(a.whoName)+'</b> '+verbWord(a.verb)+' <b>'+esc(a.key)+'</b></div><div class="act-t">'+agoLabel(a.date)+'</div></div></div>';
  });
  h += '</section></aside></div>';
  return h;
}
function verbWord(v){
  return { added:'opened', commented:'commented on', moved:'moved', assigned:'assigned', blocked:'blocked', completed:'completed', approved:'approved', rejected:'rejected' }[v] || v;
}
function agoLabel(d){
  const h = Math.round((TODAY - d) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h+'h ago';
  const dd = Math.round(h/24);
  return dd === 1 ? '1 day ago' : dd+' days ago';
}/* ---- Owner's own queue: decisions and reviews Elena owns directly.
       Row shape: [key, title, project, prio, dueOffset, note, cost, total] ---- */
const OWNER_Q = [
  ['NW-301','Budget increase — Platform Migration','platform','urgent',3,'Finance to approve a $120k increase for the cutover window. Phase 3 cannot start without it.',3,30],
  ['NW-302','Hire: senior migration engineer','ops','high',7,'Headcount request for the phase-3 rollback work. Interview shortlist is ready and the two finalists are booked.',2,26],
  ['NW-303','Meridian renewal terms — Q1','app','urgent',5,'Q1 pricing decision, 40 days before expiry. Two options are in front of you; the client prefers the annual plan.',3,22],
  ['NW-304','Approve KMS key policy','platform','high',1,'Security posture item. Platform has been waiting on your sign-off for the audit-log export work.',1,8],
  ['NW-305','Passwordless pilot cohort','ops','med',4,'30-person pilot limited to platform and QA. Low blast radius, reversible in an afternoon.',1,10],
  ['NW-306','Decide: design-system licensing model','design','med',10,'Seat-based versus flat licensing across four client engagements. Flat is cheaper at the current size but scales badly.',4,18],
  ['NW-307','Contractor extension — 2 FTE','crm','med',14,'CRM data quality work extends into November. Two-month extension requested by Diego.',2,20],
  ['NW-308','Review Q3 delivery retro','ops','low',21,'Facilitate the retro readout for the four project leads. Read the notes first; the pattern is capacity, not process.',1,6],
  ['NW-309','Vendor renewal: observability stack','ops','high',9,'$31k annual renewal. Two alternatives are priced and one is 40% cheaper with the same retention window.',2,14],
  ['NW-310','Customer escalation: invoice discrepancy','app','urgent',1,'Client finance flagged an $18,400 overcharge on the September invoice. They want a response before Friday.',1,6],
];
OWNER_Q.forEach(function (r, i) {
  const proj = PROJECTS[r[2]];
  const status = r[3] === 'urgent' ? 'blocked' : r[3] === 'high' ? 'inProgress' : 'todo';
  const total = r[7];
  const done = status === 'blocked' ? Math.round(total * 0.3) : status === 'inProgress' ? Math.round(total * 0.45) : 0;
  TASKS.push({
    id: uid('o'), key: r[0], title: r[1], project: r[2], type: 'task', status: status,
    prio: r[3], tags: ['decision'], assignee: 'u1', reportee: 'u1',
    due: due(r[4]), story: r[5], cost: r[6], total: total, done: done,
    effort: [2, 3, 5, 8][i % 4],
    blockers: status === 'blocked' ? [r[5]] : [],
    blockedSince: status === 'blocked' ? ago(20 + i * 4) : null,
    created: due(-(6 + i * 2)), updated: due(-((i * 3) % 4)), completedAt: null,
    dependencies: [], activity: [
      { state: 'done', date: due(-5 - i), by: 'u19', what: 'Brief prepared' },
      { state: 'cur', date: due(-1), by: 'u1', what: status === 'blocked' ? 'Awaiting your decision' : 'In progress' },
      { state: 'todo', date: due(2), by: 'u1', what: 'Decision recorded' },
    ],
    watch: 4 + (i % 4), comments: (i * 3) % 5,
    projectLabel: proj.name, projectColor: proj.color,
  });
});
TASKS.forEach(function (t) { TASK_BY_ID[t.id] = t; });
openTasks.length = 0;
doneTasks.length = 0;
TASKS.forEach(function (t) { (t.status === 'done' ? doneTasks : openTasks).push(t); });
const OWNER_TASKS = TASKS.filter(function (t) { return t.assignee === 'u1'; });
