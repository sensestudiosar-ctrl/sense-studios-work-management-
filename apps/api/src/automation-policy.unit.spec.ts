import { automationEventNames, automationRuleSchema } from "./automation.service.js";

const recipientId="11111111-1111-4111-8111-111111111111";
const rule={title:"Work notices",enabled:true,eventNames:["task.created"],condition:{subjectType:"task"},action:{kind:"NOTIFY",recipientId}};
describe("S26 guarded rule catalogue",()=>{
 it("permits only supported task/project source events and excludes its own effects",()=>{
  expect(automationEventNames.length).toBeGreaterThan(0);
  expect(automationEventNames.every(v=>/^(task|project)\./.test(v))).toBe(true);
  for(const name of ["automation.run_created","automation.record_changed","dashboard.delivered","report.finalized","approval.requested"])
   expect(automationRuleSchema.safeParse({...rule,eventNames:[name]}).success).toBe(false);
 });
 it("rejects executable expressions and all business mutation action kinds",()=>{
  for(const kind of ["ASSIGN","REASSIGN","DEADLINE","CLIENT_MESSAGE","DELETE","PROCUREMENT","ARCHIVE"])
   expect(automationRuleSchema.safeParse({...rule,action:{kind,recipientId}}).success).toBe(false);
  expect(automationRuleSchema.safeParse({...rule,condition:{expression:"true"}}).success).toBe(false);
 });
 it("requires typed report and recommendation inputs without action-field mixing",()=>{
  expect(automationRuleSchema.safeParse({...rule,action:{kind:"REPORT",recipientId}}).success).toBe(false);
  expect(automationRuleSchema.safeParse({...rule,action:{kind:"RECOMMENDATION",recipientId}}).success).toBe(false);
  expect(automationRuleSchema.safeParse({...rule,action:{kind:"NOTIFY",recipientId,recommendation:"Change deadline"}}).success).toBe(false);
  expect(automationRuleSchema.safeParse({...rule,action:{kind:"RECOMMENDATION",recipientId,recommendation:"Review the existing deadline workflow"}}).success).toBe(true);
 });
 it("does not invent enablement or recipients",()=>{
  expect(automationRuleSchema.safeParse({...rule,enabled:undefined}).success).toBe(false);
  expect(automationRuleSchema.safeParse({...rule,action:{kind:"NOTIFY"}}).success).toBe(false);
 });
});
