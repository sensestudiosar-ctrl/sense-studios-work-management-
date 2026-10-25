/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter} from "react-router-dom";
import {ProjectWorkspace} from "../src/project";
import "../src/styles.css";
import "../src/studio-theme.css";
const template=new URLSearchParams(location.search).get("mode")==="template";
const branch={id:"11111111-1111-4111-8111-111111111111",name:"Mumbai"};
const version={id:"22222222-2222-4222-8222-222222222222",number:1,createdAt:"2026-10-15",definition:{deliveryType:"DESIGN",scopes:["Interior design"],stages:[],milestones:[],folders:[]}};
const project={id:"33333333-3333-4333-8333-333333333333",title:"Studio residence — coordinated drawing delivery",status:"DRAFT",version:1,deliveryType:"DESIGN",branch,createdAt:"2026-10-15",scopes:[{id:"scope",name:"Interior design",normalizedName:"interior design",baseline:true}]};
const stats={writes:0,persisted:0,sameRequest:true};let firstBody="";
Object.assign(window,{projectRecoveryStats:stats});
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=new URL(String(input),location.origin);
 if(url.pathname==="/api/v1/projects"&&init?.method==="POST"){
  stats.writes++;
  if(firstBody){stats.sameRequest&&=firstBody===String(init.body);return template&&stats.sameRequest?reply({project}):reply({},409);}
  firstBody=String(init.body);stats.persisted++;throw new TypeError("Synthetic project result lost after memory-only creation");
 }
 if(init?.method&&init.method!=="GET")return reply({},403);
 if(url.pathname==="/api/v1/project-templates")return reply({templates:[{id:"template",active:true,name:"Design delivery",versions:[version]}],canManage:false,defaults:{DESIGN:[],TURNKEY:[]}});
 if(url.pathname==="/api/v1/projects/setup")return reply({branches:[branch],employees:[]});
 if(url.pathname==="/api/v1/projects")return reply({total:0,items:[]});
 if(url.pathname.endsWith("/plan"))return reply({plan:null,items:[],history:[],capabilities:{}});
 if(url.pathname===`/api/v1/projects/${project.id}`)return reply({project,assignments:[],capabilities:{}});
 return reply({},404);
};
const query=new URLSearchParams(location.search);query.set("branchId",branch.id);query.set("q","Existing");query.set("sort","milestone");query.set("offset","50");history.replaceState(null,"",`${location.pathname}?${query}`);
createRoot(document.getElementById("root")!).render(<MemoryRouter><main className="identity-content"><p>Synthetic Project recovery · memory only</p><ProjectWorkspace owner csrfToken="synthetic" listFirst/></main></MemoryRouter>);
