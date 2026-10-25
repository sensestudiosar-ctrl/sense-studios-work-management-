// Local test operator contract. This file is outside the application/build.
export const ORIGIN='http://localhost:59223';
export const OWNER={id:'3301b429-93fd-41d5-95e5-5ed38837bb12',email:'owner@local.test',kind:'OWNER'};
export const TARGET={database:'sense_local_preview_20261008_1791474390772_test',system:'7693570241708228348',port:45434};
const org='322e38d3-a455-4d6b-9a18-771497e36d27',branch='79a6a68e-e2ba-41e7-b6ef-aad1fdb0fc60',team='622064e0-521f-432b-9a3d-1dd4d5592aa4';
const people={
  leader1:{email:'task-test-20261012@example.test',label:'Team Leader 1',role:'Team Leader',code:'LOCAL-TASK-001',project:'a',reviewer:'designer1'},
  leader2:{email:'task-test-02-20261012@example.test',label:'Team Leader 2',role:'Team Leader',code:'LOCAL-TASK-002',project:'b',reviewer:'designer2'},
  designer1:{email:'task-test-03-20261012@example.test',label:'Designer 1',role:'Designer',code:'LOCAL-TASK-003',project:'a',manager:'leader1',reviewer:'leader1'},
  designer2:{email:'task-test-04-20261012@example.test',label:'Designer 2',role:'Designer',code:'LOCAL-TASK-004',project:'b',manager:'leader2',reviewer:'leader2'},
  site:{email:'task-test-05-20261012@example.test',label:'Site Staff',role:'Site Staff',code:'LOCAL-TASK-005',project:'a',manager:'leader1',reviewer:'leader1'}
};
const grants={'Team Leader':['project.view','project.manage','task.assign','review.decide'],Designer:['project.view','review.decide'],'Site Staff':['project.view']};
const why='Owner-authorized synthetic test persona setup';
function check(value,message='Unexpected test operation'){if(!value)throw new Error(message);}
function uuid(value){check(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));return value;}
function exact(input,allowed){check(input&&typeof input==='object'&&!Array.isArray(input));check(Object.keys(input).every(k=>allowed.includes(k)));check(allowed.every(k=>Object.hasOwn(input,k)));}
function person(key){check(Object.hasOwn(people,key));return people[key];}
function projectKey(key){check(key==='a'||key==='b');return key;}
function project(s,key){projectKey(key);check(s.projects[key]);return s.projects[key];}
function employee(s,key){person(key);check(s.people[key]?.employeeId);return s.people[key].employeeId;}
function version(value){check(Number.isInteger(value)&&value>0);return value;}
export function assertOwnerSession(session){check(session?.account?.id===OWNER.id&&session.account.email===OWNER.email&&session.account.kind===OWNER.kind&&typeof session.csrfToken==='string'&&session.csrfToken.length>0,'Exact normal Owner session required');}
export function createRegistry(){return {roles:{},permissions:[],people:{},projects:{},tasks:{},rounds:{},invitations:[]};}
export function resolveOperation(s,operation,input){
  const get=path=>({path,method:'GET'}),post=(path,data)=>({path,method:'POST',data});
  switch(operation){
    case 'org-read':exact(input,[]);return get('/api/v1/org');
    case 'personal-count':exact(input,[]);return get('/api/v1/tasks?scope=personal&limit=1');
    case 'invite':{exact(input,['key']);const p=person(input.key);check(!s.invitations.includes(input.key));return post('/api/v1/auth/staff/invitations',{email:p.email});}
    case 'account-bind':{exact(input,['key','id']);const p=person(input.key);uuid(input.id);check(!s.people[input.key]);return get(`/api/v1/auth/staff?email=${encodeURIComponent(p.email)}`);}
    case 'role-create':{exact(input,['role']);check(Object.hasOwn(grants,input.role)&&!s.roles[input.role]);return post('/api/v1/org/roles',{organizationId:org,name:input.role,description:'Synthetic local test persona role',reason:why});}
    case 'role-grant':{exact(input,['role','permission']);check(Object.hasOwn(grants,input.role)&&grants[input.role].includes(input.permission)&&s.roles[input.role]&&!s.permissions.includes(input.role+':'+input.permission));return post(`/api/v1/org/roles/${s.roles[input.role]}/permissions`,{organizationId:org,permissionKey:input.permission,scopeKind:'BRANCH',branchId:branch,reason:why});}
    case 'employee-create':{exact(input,['key']);const p=person(input.key);check(s.people[input.key]?.id&&!s.people[input.key].employeeId&&s.roles[p.role]);return post('/api/v1/org/employees',{organizationId:org,branchId:branch,teamId:team,accountId:s.people[input.key].id,jobRoleIds:[s.roles[p.role]],...(p.manager?{reportsToId:employee(s,p.manager)}:{}),employeeCode:p.code,hiredAt:'2026-10-12',reason:why});}
    case 'project-create':{exact(input,['key']);projectKey(input.key);check(!s.projects[input.key]);return post('/api/v1/projects',{branchId:branch,title:`Local Test Project ${input.key.toUpperCase()}`,deliveryType:input.key==='a'?'TURNKEY':'DESIGN',scopes:['Architecture'],reason:why});}
    case 'project-read':{exact(input,['key']);return get(`/api/v1/projects/${project(s,input.key).id}`);}
    case 'project-assign':{exact(input,['key','person','version']);const p=person(input.person),v=project(s,input.key);check(p.project===input.key&&version(input.version)===v.version&&!v.assigned.includes(input.person));return post(`/api/v1/projects/${v.id}/assignments`,{employeeId:employee(s,input.person),expectedVersion:input.version,reason:why});}
    case 'project-lead':{exact(input,['key','version']);const p=project(s,input.key),key=input.key==='a'?'leader1':'leader2';check(version(input.version)===p.version&&p.assigned.includes(key)&&!p.lead);return post(`/api/v1/projects/${p.id}/lead`,{employeeId:employee(s,key),expectedVersion:input.version,reason:why});}
    case 'project-activate':{exact(input,['key','version']);const p=project(s,input.key);check(version(input.version)===p.version&&p.lead&&!p.active);return post(`/api/v1/projects/${p.id}/status`,{toStatus:'ACTIVE',expectedVersion:input.version,reason:why});}
    case 'category-create':exact(input,[]);check(!s.categoryId);return post('/api/v1/reviews/categories',{name:'Local test coordination',reason:why});
    case 'task-bind':{exact(input,['key','id','index']);person(input.key);uuid(input.id);check([6,7].includes(input.index)&&!s.tasks[input.id]);return get(`/api/v1/tasks/${input.id}`);}
    case 'reviewer-assign':{exact(input,['taskId','version']);const t=s.tasks[uuid(input.taskId)];check(t&&!t.assigned&&version(input.version)===t.version);return post(`/api/v1/reviews/tasks/${input.taskId}/reviewer`,{employeeId:employee(s,person(t.key).reviewer),expectedVersion:input.version,reason:why});}
    case 'round-bind':{exact(input,['taskId','roundId']);check(s.tasks[uuid(input.taskId)]?.assigned);uuid(input.roundId);check(!s.rounds[input.roundId]);return get(`/api/v1/reviews/tasks/${input.taskId}`);}
    case 'correction-assign':{exact(input,['roundId']);const r=s.rounds[uuid(input.roundId)];check(r&&!r.corrected&&s.tasks[r.taskId].index===7);return post(`/api/v1/reviews/rounds/${input.roundId}/correction`,{ownerEmployeeId:employee(s,r.key),reason:why});}
    default:throw new Error('Operation not in approved test plan');
  }
}
export function recordResult(s,op,i,r){
  switch(op){
    case 'org-read':check(r?.id===org);break;
    case 'personal-count':check(r?.total===0);break;
    case 'invite':check(typeof r?.invitationToken==='string'&&r.invitationToken.length>10);s.invitations.push(i.key);break;
    case 'account-bind':{check(r?.account?.id===i.id&&r.account.email===person(i.key).email&&r.account.state==='ACTIVE');if(i.key==='leader1')check(i.id==='473d501d-b547-4329-a30d-bacbfa064747');s.people[i.key]={id:i.id};break;}
    case 'role-create':s.roles[i.role]=uuid(r?.id);break;
    case 'role-grant':s.permissions.push(i.role+':'+i.permission);break;
    case 'employee-create':check(r?.accountId===s.people[i.key].id);s.people[i.key].employeeId=uuid(r?.id);break;
    case 'project-create':check(r?.project?.title===`Local Test Project ${i.key.toUpperCase()}`&&r.project.branchId===branch);s.projects[i.key]={id:uuid(r.project.id),version:version(r.project.version),assigned:[]};break;
    case 'project-read':{const p=project(s,i.key);check(r?.project?.id===p.id&&r.project.branchId===branch);p.version=version(r.project.version);break;}
    case 'project-assign':project(s,i.key).assigned.push(i.person);break;
    case 'project-lead':project(s,i.key).lead=true;break;
    case 'project-activate':project(s,i.key).active=true;break;
    case 'category-create':s.categoryId=uuid(r?.id);break;
    case 'task-bind':{const t=r?.task,p=person(i.key),label=i.index===6?'Submit quality checklist':'Resolve drawing coordination issue';check(t?.id===i.id&&t.primaryOwnerEmployeeId===employee(s,i.key)&&t.projectId===project(s,p.project).id&&t.type==='PROJECT'&&t.reviewRequirement==='INTERNAL'&&t.title===`TEST ${p.label} ${String(i.index+1).padStart(2,'0')} · ${label}`);s.tasks[i.id]={key:i.key,index:i.index,version:version(t.version)};break;}
    case 'reviewer-assign':s.tasks[i.taskId].assigned=true;break;
    case 'round-bind':{const t=s.tasks[i.taskId];check(Array.isArray(r?.rounds)&&r.task?.id===i.taskId&&r.assignment?.reviewerEmployeeId===employee(s,person(t.key).reviewer));const round=r.rounds.find(v=>v.id===i.roundId);check(round?.reviewerName===person(person(t.key).reviewer).email);s.rounds[i.roundId]={taskId:i.taskId,key:t.key};break;}
    case 'correction-assign':{const round=r?.rounds?.find(v=>v.id===i.roundId);uuid(round?.correctionTaskId);s.rounds[i.roundId].corrected=true;break;}
    default:throw new Error('Unexpected operation result');
  }
}
export function projectResult(s,op,i,r){
  switch(op){
    case 'org-read':return {id:org};
    case 'personal-count':return {total:0};
    case 'invite':return {invitationToken:r.invitationToken};
    case 'account-bind':return {account:{id:r.account.id,email:r.account.email,state:r.account.state}};
    case 'role-create':return {id:s.roles[i.role]};
    case 'employee-create':return {id:s.people[i.key].employeeId,accountId:s.people[i.key].id};
    case 'project-create':case 'project-read':return {project:{id:s.projects[i.key].id,version:s.projects[i.key].version,title:r.project.title,branchId:r.project.branchId}};
    case 'category-create':return {id:s.categoryId};
    case 'task-bind':return {task:Object.fromEntries(['id','version','primaryOwnerEmployeeId','projectId','type','reviewRequirement','title'].map(k=>[k,r.task[k]]))};
    case 'round-bind':return {task:{id:i.taskId},assignment:{reviewerEmployeeId:r.assignment.reviewerEmployeeId},rounds:[{id:i.roundId,reviewerName:r.rounds.find(v=>v.id===i.roundId).reviewerName}]};
    case 'correction-assign':return {rounds:[{id:i.roundId,correctionTaskId:r.rounds.find(v=>v.id===i.roundId).correctionTaskId}]};
    default:return {ok:true};
  }
}
