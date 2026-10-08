import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { DOMAIN_EVENT_CATALOGUE } from "./domain-event-catalogue.js";

export const reportCategories = ["project", "employee", "leader", "time", "attendance", "quality", "documents", "skills_training"] as const;
export type ReportCategory = typeof reportCategories[number];
const supportedSubjects=new Set(["task","project","review","document","revision","document_revision","transmittal","workforce_record","workforce_ledger","site_record","site_workspace","turnkey_release","employee_performance","project_health","approval_request"]);
export const scheduledEventNames=Object.entries(DOMAIN_EVENT_CATALOGUE).filter(([key,value])=>!key.startsWith("dashboard.")&&!key.startsWith("report.")&&(supportedSubjects.has(value.subjectType)||key.startsWith("client."))).map(([key])=>key);
const date = z.iso.date();
export const reportFilterSchema = z.object({ category: z.enum(reportCategories), from: date, to: date }).strict().refine(v => v.to >= v.from && Date.parse(v.to) - Date.parse(v.from) <= 366 * 86400000, "Period must be ordered and no longer than one year");
const command = { commandId: z.uuid(), reason: z.string().trim().min(3).max(1000) };
export const snapshotSchema = z.object({ ...command, category: z.enum(reportCategories), from: date, to: date, correctsId: z.uuid().optional() }).strict().refine(v => reportFilterSchema.safeParse({category:v.category,from:v.from,to:v.to}).success,"Invalid report period");
export const reminderSchema = z.object({ ...command, title: z.string().trim().min(1).max(160), dueAt: z.iso.datetime({ offset: true }) }).strict();
const timeZone = z.string().max(100).refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }, "Valid IANA timezone required");
export const scheduleSchema = z.object({ ...command, kind: z.enum(["TASK_REMINDER", "SUMMARY", "EVENT_NOTICE"]), enabled: z.boolean(), localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timezone: timeZone,
 weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(), dayOfMonth: z.number().int().min(1).max(31).optional(), offsetDays: z.number().int().min(-366).max(366).optional(),
 priority: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(), projectId: z.uuid().optional(), audience: z.enum(["SELF","OWNER","EMPLOYEE","MANAGER"]),
 summaryKind: z.enum(["MORNING","EVENING","WEEKLY","MONTHLY"]).optional(), eventNames:z.array(z.enum(scheduledEventNames as [string,...string[]])).min(1).max(100).optional(), critical: z.boolean(), mandatory: z.boolean(), expectedVersion: z.number().int().positive().optional()
}).strict().superRefine((value,ctx) => {
 if(value.kind === "TASK_REMINDER" && value.offsetDays === undefined) ctx.addIssue({code:"custom",message:"Explicit reminder offset required"});
 if(value.kind === "SUMMARY" && !value.summaryKind) ctx.addIssue({code:"custom",message:"Explicit summary kind required"});
 if(value.kind === "SUMMARY" && value.summaryKind === "WEEKLY" && !value.weekdays) ctx.addIssue({code:"custom",message:"Explicit weekly day required"});
 if(value.kind === "SUMMARY" && value.summaryKind === "MONTHLY" && !value.dayOfMonth) ctx.addIssue({code:"custom",message:"Explicit monthly day required"});
 if(value.kind === "EVENT_NOTICE" && !value.eventNames) ctx.addIssue({code:"custom",message:"Explicit event names required"});
 if(value.kind === "SUMMARY"&&(value.priority!==undefined||value.projectId!==undefined||value.offsetDays!==undefined||value.eventNames!==undefined))ctx.addIssue({code:"custom",message:"Summary rules use the recipient's full current scope; task/event filters are not summary inputs"});
 if(value.kind !== "SUMMARY"&&value.summaryKind!==undefined)ctx.addIssue({code:"custom",message:"Summary period is only valid for a summary rule"});
 if(value.kind !== "TASK_REMINDER"&&value.offsetDays!==undefined)ctx.addIssue({code:"custom",message:"Reminder offset is only valid for a task reminder"});
 if(value.kind !== "EVENT_NOTICE"&&value.eventNames!==undefined)ctx.addIssue({code:"custom",message:"Event names are only valid for an event notice"});
 if(value.eventNames?.some(v=>v.startsWith("dashboard.")||v.startsWith("report.")))ctx.addIssue({code:"custom",message:"Scheduled notices cannot recursively notify their own events"});
});
export function parse<T>(schema:z.ZodType<T>,value:unknown):T { const parsed=schema.safeParse(value); if(!parsed.success) throw new BadRequestException(parsed.error.issues.map(v=>v.message).join("; ")); return parsed.data; }
export type ReportFilter=z.infer<typeof reportFilterSchema>;
export type ScheduleInput=z.infer<typeof scheduleSchema>;
export function localSlot(now:Date,rule:Pick<ScheduleInput,"timezone"|"localTime"|"weekdays"|"dayOfMonth">):string|null {
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:rule.timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
 const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));const day=`${p.year}-${p.month}-${p.day}`;
 if(`${p.hour}:${p.minute}` < rule.localTime || rule.dayOfMonth!==undefined && Number(p.day)!==rule.dayOfMonth || rule.weekdays && !rule.weekdays.includes(new Date(`${day}T12:00:00Z`).getUTCDay()))return null;
 return day;
}
