/* Owner requirement 26 October 2026. Prototype/specification only.
 * Shared review evidence policy; no backend, client grant or external transmission.
 * Files are hashed locally, never uploaded. Client portal acceptance stays BLOCKED. */
const evidenceRequiredMessage='Add at least one file or link before submitting for review.';
const evidenceDrafts=new Map();
function validReviewLink(value){
 if(!value||value.length>2048||value!==value.trim()||/[\x00-\x20\x7f\\]/.test(value))return null;
 try{const url=new URL(value),host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||host.includes(':')||/^\d+\.\d+\.\d+\.\d+$/.test(host)||!host.includes('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid|example|home|lan)$/.test(host)||host.endsWith('.'))return null;return url.href;}catch{return null;}
}
function evidenceIdentity(e){if(!e)return null;if(e.kind==='FILE')return 'FILE:'+e.sha256;const url=new URL(e.url);url.hash='';return 'LINK:'+url.href;}
function currentEvidence(taskId){const draft=evidenceDrafts.get(taskId);if(!draft||draft.pending)return null;if(draft.kind==='FILE')return draft.file||null;const url=validReviewLink(draft.link||'');return url?{kind:'LINK',url}:null;}
function evidenceValidation(taskId){const current=currentEvidence(taskId);if(!current)return {valid:false,message:evidenceRequiredMessage};const identity=evidenceIdentity(current);const prior=(rounds.get(taskId)||[]).some(r=>r.evidenceSnapshot?.identity===identity);return prior?{valid:false,message:evidenceRequiredMessage,detail:'Provide updated evidence for this new round. Previously submitted evidence alone cannot be reused.'}:{valid:true,evidence:current,identity};}
function evidenceControls(t){
 const draft=evidenceDrafts.get(t.id)||{kind:'LINK',link:'',file:null,pending:false};evidenceDrafts.set(t.id,draft);
 return `<fieldset id="review-evidence-fields" style="border:0;padding:0;margin:0"><legend style="font-weight:700;font-size:15px">${(rounds.get(t.id)||[]).length?'Updated evidence for this submission':'Evidence for this submission'} *</legend><p class="cx-guidance">Attach a file or provide a valid public HTTPS link. A typed filename is not an attachment. Evidence is not required to create or start work.</p><div class="cx-actions" role="group" aria-label="Review evidence source"><button class="cx-btn" type="button" data-evidence-kind="FILE" aria-pressed="${draft.kind==='FILE'}">Attach file</button><button class="cx-btn" type="button" data-evidence-kind="LINK" aria-pressed="${draft.kind==='LINK'}">Use link</button></div><label ${draft.kind==='FILE'?'':'hidden'}>File attachment<input id="cx-evidence-file" type="file" aria-describedby="review-evidence-status"><span class="cx-guidance">Local prototype only: file content is hashed in memory to identify evidence; it is never uploaded.</span></label><label ${draft.kind==='LINK'?'':'hidden'}>Review link<input id="cx-evidence" type="url" maxlength="2048" value="${html(draft.link||'')}" placeholder="https://drive.google.com/file/d/…/view" aria-describedby="review-evidence-status review-link-guidance"></label><p class="cx-guidance" id="review-link-guidance" ${draft.kind==='LINK'?'':'hidden'}>Use the existing public HTTPS link rules. Private/local addresses, credentials and unsupported protocols are rejected. Links are never opened or fetched. Use a new version-specific link when resubmitting.</p><p class="cx-notice" id="review-evidence-status" role="status" aria-live="polite"></p><button class="cx-link" data-evidence-clear type="button">Clear current evidence</button></fieldset>`;
}
const evidenceRender=renderDetail;renderDetail=function(){
 evidenceRender();const t=tasks.find(x=>x.id===detailId);if(!t)return;
 const submit=detail.querySelector('[data-cx-action="submit"]'),clientPreparation=t.reviewRequirement==='CLIENT'&&actor()===t.primaryWorker&&t.status==='progress';
 if(submit||clientPreparation){
  if(submit){const input=$id('cx-evidence');input?.closest('label')?.remove();$id('cx-evidence-help')?.remove();}
  const target=submit?detail.querySelector('[aria-label="Action details"]'):detail.querySelector('.cx-detail-body');
  const section=document.createElement('section');section.className='cx-card cx-pad';section.id='mandatory-evidence-panel';section.innerHTML=evidenceControls(t)+(clientPreparation?'<p class="cx-notice">Client submission remains with its existing authorized publishing workflow. Client/external audits are BLOCKED; this is staff evidence preparation only.</p><button class="cx-btn" id="check-client-evidence">Check client review evidence</button>':'');
  if(submit)target.prepend(section);else target.prepend(section);
  const status=$id('review-evidence-status');
  const update=()=>{const d=evidenceDrafts.get(t.id),result=evidenceValidation(t.id);status.className='cx-notice '+(result.valid?'':'cx-error');status.textContent=d.pending?'Preparing the selected attachment…':result.valid?(result.evidence.kind==='FILE'?`Attachment ready: ${result.evidence.name}`:'Valid link ready for this submission.'):[result.message,result.detail].filter(Boolean).join(' ');$id('cx-evidence')?.setAttribute('aria-invalid',String(d.kind==='LINK'&&!!d.link&&!result.valid));};
  detail.querySelectorAll('[data-evidence-kind]').forEach(b=>b.onclick=()=>{const d=evidenceDrafts.get(t.id);d.kind=b.dataset.evidenceKind;renderDetail();detail.querySelector(`[data-evidence-kind="${d.kind}"]`).focus();});
  $id('cx-evidence')?.addEventListener('input',e=>{const d=evidenceDrafts.get(t.id);d.link=e.target.value;draftEvidence.set(t.id,e.target.value);e.target.dataset.dirty=String(!!e.target.value);update();});
  $id('cx-evidence-file').onchange=async e=>{
   const file=e.target.files?.[0],d=evidenceDrafts.get(t.id);d.file=null;if(!file){update();return;}d.pending=true;e.target.dataset.dirty='true';update();
   try{const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());if(evidenceDrafts.get(t.id)!==d)return;d.file={kind:'FILE',id:'DEMO-EVIDENCE-'+crypto.randomUUID(),name:file.name,size:file.size,mimeType:file.type,sha256:[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('')};}catch{d.file=null;}finally{d.pending=false;if(detailId===t.id)update();}
  };
  detail.querySelector('[data-evidence-clear]').onclick=()=>{evidenceDrafts.set(t.id,{kind:'LINK',link:'',file:null,pending:false});draftEvidence.delete(t.id);renderDetail();$id('cx-evidence')?.focus();};
  $id('check-client-evidence')?.addEventListener('click',()=>{const result=evidenceValidation(t.id);feedback(result.valid?'Evidence is ready for the existing authorized client workflow. No client submission was made.':result.message,!result.valid);});update();
 }
 const rs=rounds.get(t.id)||[];
 detail.querySelectorAll('.cx-history').forEach((article,index)=>{const snapshot=rs[index]?.evidenceSnapshot;if(snapshot){const note=document.createElement('p');note.className='cx-guidance';note.textContent=`Exact evidence: ${snapshot.id} · Task ${snapshot.taskId} · task version ${snapshot.taskVersion} · submission version ${snapshot.submissionVersion} · round ${snapshot.roundNumber}${snapshot.evidence.kind==='FILE'?' · SHA-256 '+snapshot.evidence.sha256:''}`;article.append(note);}});
 const last=rs.at(-1);
 if(t.reviewRequirement==='BOTH'&&last?.evidenceSnapshot){const box=document.createElement('p');box.className='cx-notice';box.id='approved-evidence-carry-forward';box.textContent=last.status==='Approved'?`Independent internal approval recorded for ${last.evidenceSnapshot.id}. Authorized client review must carry forward this exact approved evidence, without another upload. Existing publishing permissions and client acceptance still apply.`:`Client review is blocked until independent internal approval of ${last.evidenceSnapshot.id}. No duplicate upload is required when this same approved evidence is legitimately carried forward.`;detail.querySelector('.cx-next').append(box);}
};
const evidenceTransition=transition;transition=async function(action){
 const t=tasks.find(x=>x.id===detailId);if(!t)return;
 if(action!=='submit')return evidenceTransition(action);
 // Evidence is a prerequisite, never an authorization override.
 if(nextAction(t).action!=='submit')return feedback('Submission is unavailable until the current worker, start, reviewer and correction prerequisites are satisfied.');
 const result=evidenceValidation(t.id);
 if(!result.valid){feedback(result.message);if(result.detail)$id('review-evidence-status').textContent=result.message+' '+result.detail;(evidenceDrafts.get(t.id)?.kind==='FILE'?$id('cx-evidence-file'):$id('cx-evidence'))?.focus();return;}
 const rs=rounds.get(t.id),count=rs.length,version=t.demoEvidenceVersion||1;
 draftEvidence.set(t.id,result.evidence.kind==='FILE'?result.evidence.name:result.evidence.url);
 await evidenceTransition(action);
 if(rs.length!==count+1)return;
 const round=rs.at(-1),evidence=Object.freeze({...result.evidence});
 round.evidenceSnapshot=Object.freeze({id:'EVIDENCE-'+round.id,taskId:t.id,taskVersion:version,submissionVersion:round.number,roundNumber:round.number,submissionId:round.id,roundId:round.id,identity:result.identity,evidence});
 t.demoEvidenceVersion=version+1;evidenceDrafts.delete(t.id);draftEvidence.delete(t.id);renderDetail();feedback(`Submitted as a new round — Round ${round.number} · Awaiting ${person(t.reviewerId).name}. Earlier evidence and review history remain unchanged.`,false);$id('cx-detail-title').focus();
};
// Retained My Work shortcuts must enter the same guarded detail, not an older mock submission form.
document.addEventListener('click',e=>{const quick=e.target.closest('[data-quick]');if(quick){e.preventDefault();e.stopImmediatePropagation();openTask(quick.dataset.quick);}},true);
const evidenceClose=closeDetail;closeDetail=function(){const id=detailId,draft=evidenceDrafts.get(id);if(draft&&(draft.file||draft.link||draft.pending))detail.querySelector('#mandatory-evidence-panel')?.setAttribute('data-dirty','true');const dirty=!!detail.querySelector('[data-dirty="true"]');const closed=evidenceClose();if(closed&&dirty)evidenceDrafts.delete(id);return closed;};
const evidenceSnapshot=window.connectedPrototype.snapshot;
window.connectedPrototype.snapshot=()=>({...evidenceSnapshot(),evidencePolicy:'MANDATORY_ALL_REVIEW_SUBMISSIONS_2026_10_26',clientCarryForward:tasks.filter(t=>t.reviewRequirement==='BOTH').map(t=>{const r=rounds.get(t.id)?.at(-1);return {taskId:t.id,internalApproved:r?.status==='Approved',evidenceId:r?.evidenceSnapshot?.id||null,clientEvidenceId:r?.status==='Approved'?r?.evidenceSnapshot?.id:null};})});
window.reviewEvidencePolicy=Object.freeze({message:evidenceRequiredMessage,validLink:validReviewLink,validate:taskId=>evidenceValidation(taskId),modes:Object.freeze(['INTERNAL','CLIENT','BOTH'])});
