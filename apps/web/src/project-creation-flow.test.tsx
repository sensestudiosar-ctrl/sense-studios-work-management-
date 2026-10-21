import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectWorkspace } from "./project.js";
const branch={id:"branch",name:"Mumbai"};
const project={id:"created-project",title:"New studio",status:"DRAFT",version:1,deliveryType:"DESIGN",branch,scopes:[{id:"scope",name:"Design",normalizedName:"design",baseline:true}],createdAt:"2026-10-15"};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
beforeEach(()=>window.history.replaceState(null,"","/projects?branchId=branch&q=Existing&sort=milestone&offset=50"));
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function api(mode:"success"|"lost"|"malformed"|"detailDenied"|"denied"="success", template=false){
 const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=new URL(String(input),"http://localhost");
  if(url.pathname==="/api/v1/project-templates")return reply({templates:template?[{id:"template",name:"Studio setup",active:true,versions:[{id:"template-version",number:1,createdAt:"2026-10-15",definition:{deliveryType:"DESIGN",scopes:["Design"],stages:[],milestones:[],folders:[]}}]}]:[],canManage:false,defaults:{DESIGN:[],TURNKEY:[]}});
  if(url.pathname.endsWith("/plan"))return reply({plan:null,items:[],history:[],capabilities:{}});
  if(url.pathname==="/api/v1/projects/setup")return reply({branches:[branch],employees:[]});
  if(url.pathname==="/api/v1/projects"&&init?.method==="POST"){
    if(mode==="lost")throw new TypeError("Lost result");
    if(mode==="denied")return reply({},403);
    return reply(mode==="malformed"?{}:{project},201);
  }
  if(url.pathname==="/api/v1/projects")return reply({total:0,items:[]});
  if(url.pathname==="/api/v1/projects/created-project")return reply(mode==="detailDenied"?{}:{project,assignments:[],capabilities:{}},mode==="detailDenied"?403:200);
  return reply({},404);
 });vi.stubGlobal("fetch",fetcher);return fetcher;
}
async function fill(){
 const form=await screen.findByRole("form",{name:"Create project"});
 fireEvent.change(within(form).getByLabelText("Project title"),{target:{value:project.title}});
 fireEvent.change(within(form).getByLabelText("Initial service scopes"),{target:{value:"Design"}});
 fireEvent.change(within(form).getByLabelText("Creation reason"),{target:{value:"Approved studio project"}});
 return form;
}
describe("Project creation canonical results",()=>{
 it("opens the confirmed ID outside the current directory filter and preserves Back context",async()=>{
  const mock=api();render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);const form=await fill();
  await screen.findByText("No projects match these filters.");expect(screen.getByRole("button",{name:"Previous"})).toBeDisabled();fireEvent.submit(form);
  await screen.findByRole("heading",{name:project.title});
  const query=new URL(location.href).searchParams;expect(query.get("projectId")).toBe(project.id);expect(query.get("q")).toBe("Existing");expect(query.get("sort")).toBe("milestone");expect(query.get("offset")).toBe("50");
  expect(screen.getByText("0 total")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"← Back to projects"}));
  expect(new URL(location.href).searchParams.get("q")).toBe("Existing");expect(new URL(location.href).searchParams.has("projectId")).toBe(false);
  expect(mock.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
 });
 it("guards two same-frame submit events while creation is pending",async()=>{
  const mock=api(),initial=mock.getMockImplementation()!;let resolve:((value:Response)=>void)|undefined;
  mock.mockImplementation((input,init)=>init?.method==="POST"?new Promise<Response>(done=>{resolve=done;}):initial(input,init));
  render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);const form=await fill();act(()=>{fireEvent.submit(form);fireEvent.submit(form);});
  expect(mock.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
  await act(async()=>resolve!(reply({project})));await screen.findByRole("heading",{name:project.title});
 });
 it.each(["lost","malformed"]as const)("locks an unconfirmed non-template command (%s) without claiming safe retry",async mode=>{
  const mock=api(mode);render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);const form=await fill();fireEvent.submit(form);
  const recovery=await screen.findByRole("region",{name:"Unconfirmed project creation"});
  expect(recovery).toHaveTextContent("no retry receipt");expect(within(recovery).queryByRole("button",{name:"Check creation result"})).not.toBeInTheDocument();
  expect(within(form).getByLabelText("Project title")).toHaveValue(project.title);expect(within(form).getByLabelText("Project title")).toBeDisabled();
  fireEvent.submit(form);expect(mock.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
  expect(screen.queryByText("Draft project created.")).not.toBeInTheDocument();
 });
 it("keeps the known created ID after a post-success detail denial and retries only the read",async()=>{
  const mock=api("detailDenied");render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);fireEvent.submit(await fill());
  await screen.findByText("You do not have access to this project.");expect(screen.getByText("Draft project created.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:project.id}));
  await waitFor(()=>expect(mock.mock.calls.filter(([input])=>String(input).endsWith("/created-project"))).toHaveLength(2));
  expect(mock.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
 });
 it("recovers an existing template creation contract with the exact original key and body",async()=>{
  const mock=api("lost",true);render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);
  await screen.findByRole("option",{name:"Studio setup · version 1"});
  fireEvent.change(screen.getByLabelText("Project template"),{target:{value:"template-version"}});
  const form=await fill();fireEvent.submit(form);
  const recovery=await screen.findByRole("region",{name:"Unconfirmed project creation"});
  const first=mock.mock.calls.find(([,init])=>init?.method==="POST")![1]!.body;
  expect(JSON.parse(String(first))).toMatchObject({templateVersionId:"template-version",idempotencyKey:expect.any(String)});
  expect(screen.getByLabelText("Project template")).toBeDisabled();
  const initial=mock.getMockImplementation()!;mock.mockImplementation((input,init)=>init?.method==="POST"?Promise.resolve(reply({project})):initial(input,init));
  fireEvent.click(within(recovery).getByRole("button",{name:"Check creation result"}));
  await screen.findByRole("heading",{name:project.title});
  const writes=mock.mock.calls.filter(([,init])=>init?.method==="POST");expect(writes).toHaveLength(2);expect(writes[1]![1]!.body).toBe(first);
 });
 it("keeps a denied creation draft editable without claiming it was created",async()=>{
  api("denied");render(<ProjectWorkspace csrfToken="csrf" owner listFirst/>);const form=await fill();fireEvent.submit(form);
  await screen.findByText("You need Owner access to create or recover a project.");
  expect(within(form).getByLabelText("Project title")).toHaveValue(project.title);expect(within(form).getByLabelText("Project title")).toBeEnabled();
  expect(screen.queryByText("Draft project created.")).not.toBeInTheDocument();expect(screen.queryByRole("region",{name:"Unconfirmed project creation"})).not.toBeInTheDocument();
 });
});
