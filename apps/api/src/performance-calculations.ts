import { z } from "zod";
import { BadRequestException } from "@nestjs/common";
export const families = ["EMPLOYEE", "LEADER", "DESIGN", "TURNKEY"] as const;
export type Family = typeof families[number];
export const unavailable = ["Training", "Skills", "SOP recommendations"];
const employee = ["EMPLOYEE"], leader = ["LEADER"], project = ["DESIGN", "TURNKEY"];
export const metrics = [
  {key:"TASK_ON_TIME",label:"On-time completed tasks",families:employee,category:"speed",unit:"percent",description:"Completed tasks against approved deadline, after Owner-reviewed external exclusions."},
  {key:"REVIEW_FIRST_PASS",label:"First-pass review approval",families:employee,category:"quality",unit:"percent",description:"First decided internal review rounds approved."},
  {key:"REVIEW_CORRECTION_FREE",label:"Correction-free internal reviews",families:employee,category:"quality",unit:"percent",description:"Decided internal rounds approved without correction decision."},
  {key:"TIME_EFFICIENCY",label:"Estimated versus approved actual effort",families:employee,category:"efficiency",unit:"percent",description:"Explicit per-person estimated allocation divided by approved current actual effort."},
  {key:"ATTENDANCE_VERIFIED",label:"Verified completed attendance",families:employee,category:"attendance",unit:"percent",description:"Completed non-provisional or manager-approved attendance among eligible records."},
  {key:"LEADER_REVIEW_TURNAROUND",label:"Personally handled review turnaround",families:leader,category:"control",unit:"minutes",description:"Started-to-decided time for the leader's own decided reviews; employee errors are not transferred."},
  {key:"LEADER_EXTENSION_TURNAROUND",label:"Personally resolved extension turnaround",families:leader,category:"control",unit:"hours",description:"Requested-to-resolved time for extension decisions personally assigned to and resolved by this leader."},
  {key:"LEADER_ALLOCATION_COVERAGE",label:"Personally prepared capacity allocations",families:leader,category:"control",unit:"percent",description:"Tasks with this leader's explicit dated allocations relative to estimated tasks in their current team."},
  {key:"PROJECT_TASK_ON_TIME",label:"Project on-time completed tasks",families:project,category:"speed",unit:"percent",description:"Completed project tasks against approved deadlines; project delay remains separate from employee exclusions."},
  {key:"PROJECT_MILESTONE_COMPLETION",label:"Due milestone completion",families:project,category:"delivery",unit:"percent",description:"Milestones due in the period completed by their due time."},
  {key:"PROJECT_REVIEW_FIRST_PASS",label:"Project first-pass approval",families:project,category:"quality",unit:"percent",description:"First decided internal rounds approved."},
  {key:"PROJECT_PENDING_DECISIONS",label:"Pending project decisions",families:project,category:"risk",unit:"count",description:"Currently pending exact task/project approval requests at capture."},
  {key:"PROJECT_SCOPE_CHANGE_COUNT",label:"Approved scope changes",families:project,category:"risk",unit:"count",description:"Persisted effective scope changes in the period."},
  {key:"PROJECT_DELAY_DAYS",label:"Owner-reviewed allocated delay",families:project,category:"risk",unit:"days",description:"Current deduplicated Owner allocations linked to actual source records."},
  {key:"PROJECT_WORKLOAD_ALLOCATION",label:"Explicit workload coverage",families:project,category:"risk",unit:"percent",description:"Explicit person/date allocations against estimated task minutes; capacity values remain schedule-derived."},
  {key:"PROJECT_WORKLOAD_RISK",label:"Schedule-derived overloaded days",families:project,category:"risk",unit:"percent",description:"Allocated person/dates overloaded under the existing Owner-approved workforce thresholds and actual scheduled capacity."},
  {key:"SITE_PROGRESS",label:"Factual package progress",families:["TURNKEY"],category:"delivery",unit:"percent",description:"Current actual percentage across site packages."},
  {key:"SITE_QUALITY",label:"Site packages passing quality",families:["TURNKEY"],category:"quality",unit:"percent",description:"Current packages with PASSED quality evidence."},
  {key:"SITE_SNAG_CLOSURE",label:"Management-closed snags",families:["TURNKEY"],category:"quality",unit:"percent",description:"Current snags closed through independent verification and management closure."}
];
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;});
const uuid=z.uuid(), reason=z.string().trim().min(3).max(1000), bounded=z.number().finite().min(0).max(100);
export const policySchema=z.object({family:z.enum(families),groupKey:z.string().trim().min(1).max(80),label:z.string().trim().min(2).max(160),effectiveFrom:date,
 components:z.array(z.object({metric:z.enum(metrics.map(m=>m.key) as [string,...string[]]),weight:z.number().finite().positive().max(100),min:z.number().finite(),max:z.number().finite(),direction:z.enum(["HIGHER","LOWER"]),required:z.boolean()}).strict()).min(1).max(18),
 attendanceMaxWeight:bounded,efficiencyMaxWeight:bounded,strengthAt:bounded,weaknessBelow:bounded,thresholds:z.object({criticalBelow:bounded,delayedBelow:bounded,atRiskBelow:bounded}).strict()}).strict();
export type PerformancePolicy=z.infer<typeof policySchema>;
const base={commandId:uuid,reason}; const period={from:date,to:date}; const idVersion={id:uuid,expectedVersion:z.number().int().positive()};
export const delaySchema=z.object({cause:z.enum(["INTERNAL_TEAM","CLIENT","CONSULTANT","VENDOR","FACTORY","PROCUREMENT","MATERIAL","SITE_CONDITION","APPROVAL","SCOPE_CHANGE","OTHER"]),days:z.number().finite().positive().max(36600),sourceKind:z.enum(["TASK_STATUS","TASK_DATE","REVIEW_ROUND","SITE_HISTORY","PROJECT_SCOPE"]),sourceId:uuid,employeeId:uuid.nullable().optional(),external:z.boolean(),...period,summary:z.string().trim().min(3).max(1000),supersedesId:uuid.nullable().optional()}).strict();
export const performanceCommandSchema=z.discriminatedUnion("operation",[
 z.object({...base,operation:z.literal("POLICY_CREATE"),policy:policySchema}).strict(),
 z.object({...base,operation:z.literal("POLICY_APPROVE"),...idVersion}).strict(),
 z.object({...base,operation:z.literal("ASSIGN_GROUP"),employeeId:uuid,family:z.enum(["EMPLOYEE","LEADER"]),groupKey:z.string().trim().min(1).max(80),effectiveFrom:date}).strict(),
 z.object({...base,operation:z.literal("EMPLOYEE_SNAPSHOT"),employeeId:uuid,family:z.enum(["EMPLOYEE","LEADER"]),...period}).strict(),
 z.object({...base,operation:z.literal("PROJECT_SNAPSHOT"),projectId:uuid,...period}).strict(),
 z.object({...base,operation:z.literal("DELAY_RECORD"),projectId:uuid,delay:delaySchema}).strict(),
 z.object({...base,operation:z.literal("CYCLE_CREATE"),employeeId:uuid,frequency:z.enum(["WEEKLY","MONTHLY","QUARTERLY","ANNUAL"]),...period,scoreId:uuid.nullable(),goals:z.array(reason).max(30),developmentActions:z.array(reason).max(30)}).strict(),
 z.object({...base,operation:z.literal("CYCLE_COMMENT"),...idVersion,text:z.string().trim().min(3).max(2000),goals:z.array(reason).max(30),developmentActions:z.array(reason).max(30)}).strict(),
 z.object({...base,operation:z.literal("CYCLE_ACKNOWLEDGE"),...idVersion,text:z.string().trim().min(3).max(2000)}).strict(),
 z.object({...base,operation:z.literal("CYCLE_FINALIZE"),...idVersion}).strict()
]);
export type PerformanceCommand=z.infer<typeof performanceCommandSchema>;
export function parseCommand(value:unknown):PerformanceCommand {const parsed=performanceCommandSchema.safeParse(value);if(!parsed.success)throw new BadRequestException("Invalid performance command");return parsed.data;}
export type Evidence={kind:string;id:string;version:number;description:string;values:Record<string,unknown>;projectId?:string};
export type MetricInput={raw:number|null;evidence:Evidence[]};
export function evidenceChanged(previous:unknown,current:unknown):boolean {
 const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):value!==null&&typeof value==="object"?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;
 return JSON.stringify(canonical(previous))!==JSON.stringify(canonical(current));
}
export function validatePolicy(policy:PerformancePolicy):void {
 if(new Set(policy.components.map(c=>c.metric)).size!==policy.components.length||Math.abs(policy.components.reduce((s,c)=>s+c.weight,0)-100)>0.000001)throw new Error("Unique component weights must total 100");
 for(const component of policy.components){if(component.max<=component.min||!metrics.find(m=>m.key===component.metric)?.families.includes(policy.family))throw new Error("Metric range or family invalid");}
 if(policy.weaknessBelow>=policy.strengthAt||policy.thresholds.criticalBelow>=policy.thresholds.delayedBelow||policy.thresholds.delayedBelow>=policy.thresholds.atRiskBelow)throw new Error("Thresholds must be strictly ordered");
 if(["DESIGN","TURNKEY"].includes(policy.family)&&policy.groupKey!==policy.family)throw new Error("Project policy group must match delivery type");
 if(policy.family==="EMPLOYEE"){
 const sum=(category:string)=>policy.components.filter(c=>metrics.find(m=>m.key===c.metric)?.category===category).reduce((s,c)=>s+c.weight,0);
 if(sum("quality")<=sum("speed")||sum("quality")===0||sum("attendance")>policy.attendanceMaxWeight||sum("efficiency")>policy.efficiencyMaxWeight||policy.attendanceMaxWeight>=sum("quality")||policy.efficiencyMaxWeight>=sum("quality"))throw new Error("Quality must outweigh speed, attendance and efficiency caps");
 }
}
export function calculateSnapshot(policy:PerformancePolicy,inputs:Record<string,MetricInput>){
 validatePolicy(policy);
 const components=policy.components.map(c=>{const input=inputs[c.metric]??{raw:null,evidence:[]};const normalized=input.raw===null?null:Math.max(0,Math.min(100,(c.direction==="HIGHER"?(input.raw-c.min):(c.max-input.raw))*100/(c.max-c.min)));return {...c,label:metrics.find(m=>m.key===c.metric)!.label,raw:input.raw,normalized,evidence:input.evidence};});
 const missing=components.filter(c=>c.required&&c.normalized===null).map(c=>c.metric),present=components.filter(c=>c.normalized!==null),denominator=present.reduce((s,c)=>s+c.weight,0);
 if(policy.family==="EMPLOYEE"&&denominator){const sum=(category:string)=>present.filter(c=>metrics.find(m=>m.key===c.metric)?.category===category).reduce((s,c)=>s+c.weight,0);if(sum("quality")<=sum("speed"))missing.push("QUALITY_EVIDENCE");if(sum("attendance")*100/denominator>policy.attendanceMaxWeight||sum("efficiency")*100/denominator>policy.efficiencyMaxWeight)missing.push("APPROVED_LOW_WEIGHT_LIMIT");}
 const score=missing.length||!denominator?null:Math.round(present.reduce((s,c)=>s+c.weight*c.normalized!,0)/denominator*100)/100;
 const healthStatus=score===null||["EMPLOYEE","LEADER"].includes(policy.family)?null:score<policy.thresholds.criticalBelow?"Critical":score<policy.thresholds.delayedBelow?"Delayed":score<policy.thresholds.atRiskBelow?"At Risk":"On Track";
 return {status:score===null?"INSUFFICIENT_EVIDENCE":"SCORED",score,healthStatus,components,missing,explanation:components.map(c=>c.raw===null?`${c.label}: no eligible evidence${c.required?"; required input blocks score":"; explicitly optional and omitted"}`:`${c.label}: ${c.raw} → ${Math.round(c.normalized!*100)/100}/100 at weight ${c.weight}`),strengths:components.filter(c=>c.normalized!==null&&c.normalized>=policy.strengthAt).map(c=>c.label),weaknesses:components.filter(c=>c.normalized!==null&&c.normalized<policy.weaknessBelow).map(c=>c.label),improvementActions:components.filter(c=>c.normalized!==null&&c.normalized<policy.weaknessBelow).map(c=>`Review the retained ${c.label.toLowerCase()} evidence with your manager and record a development action.`),unavailable};
}
