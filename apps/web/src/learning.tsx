import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./learning.css";
import { TrainingWorkspace } from "./learning-training.js";

const API = "/api/v1/skills";
type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
type Skill = { id: string; name: string; normalizedName: string };
type Employee = { id: string; employeeCode: string | null; label: string; homeBranchId: string; homeTeamId: string };
type Approver = { accountId: string; label: string };
type Setup = { skills: Skill[]; employees: Employee[]; eligibleApprovers: Array<{ employeeId: string; approvers: Approver[] }> };
type Rating = { id: string; employeeId: string; skillId: string; level: Level; version: number };
type Change = { id: string; ratingId: string; version: number; fromLevel: Level | null; toLevel: Level; reason: string; actorId: string; occurredAt: string };
type SkillRequest = { id: string; skillId: string | null; proposedSkillName: string | null; requestedLevel: Level; expectedRatingVersion: number; reason: string; createdAt: string; approvalState: string | null; approverAccountId: string | null; approverLabel: string; decisionEvidence: { outcome: string; reason: string; deciderId: string; decidedAt: string } | null; canDecide: boolean };
type Profile = { ratings: Rating[]; changes: Change[]; requests: SkillRequest[]; capabilities: { currentAccountId: string; canRequest: boolean; canManage: boolean; canDirectRate: boolean } };
const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];
const LEVEL_LABELS: Record<Level, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced", EXPERT: "Expert" };
const commandId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); } }
async function api<T>(url: string, csrf: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set("X-CSRF-Token", csrf);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  const body = await response.json().catch(() => ({})) as { error?: { message?: string }; message?: string };
  if (!response.ok) throw new ApiError(body.error?.message ?? body.message ?? `Request failed (${response.status})`, response.status);
  return body as T;
}
const labelLevel = (value: Level | null | undefined) => value ? LEVEL_LABELS[value] ?? value : "No previous rating";

export function SkillsWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [skillChoice, setSkillChoice] = useState("");
  const [proposedSkillName, setProposedSkillName] = useState("");
  const [requestedLevel, setRequestedLevel] = useState<Level>("BEGINNER");
  const [approverAccountId, setApproverAccountId] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [directSkillId, setDirectSkillId] = useState("");
  const [directLevel, setDirectLevel] = useState<Level>("BEGINNER");
  const [directReason, setDirectReason] = useState("");
  const [catalogueName, setCatalogueName] = useState("");
  const [catalogueReason, setCatalogueReason] = useState("");
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const requestSequence = useRef(0);

  const loadSetup = useCallback(async () => {
    const result = await api<Setup>(`${API}/setup`, csrfToken);
    setSetup(result);
    setEmployeeId(current => current && result.employees.some(e => e.id === current) ? current : result.employees[0]?.id ?? "");
  }, [csrfToken]);
  const loadProfile = useCallback(async (id: string, initial = false) => {
    const sequence = ++requestSequence.current;
    if (!id) { setProfile(null); setProfileLoading(false); return; }
    if (initial) setProfileLoading(true);
    try {
      const result = await api<Profile>(`${API}/employees/${encodeURIComponent(id)}`, csrfToken);
      if (sequence === requestSequence.current) { setProfile(result); setError(""); }
    } catch (cause) {
      if (sequence === requestSequence.current) { setProfile(null); setError(cause instanceof Error ? cause.message : "Couldn’t load employee skills."); }
    } finally { if (sequence === requestSequence.current && initial) setProfileLoading(false); }
  }, [csrfToken]);
  const refresh = useCallback(async () => { await loadSetup(); await loadProfile(employeeId); }, [employeeId, loadProfile, loadSetup]);

  useEffect(() => {
    let current = true;
    setLoading(true); setError("");
    void loadSetup().catch(cause => { if (current) setError(cause instanceof Error ? cause.message : "Couldn’t load Skills."); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; requestSequence.current++; };
  }, [loadSetup]);
  useEffect(() => {
    setProfile(null); setError(""); setSkillChoice(""); setProposedSkillName(""); setApproverAccountId(""); setRequestReason(""); setDirectSkillId(""); setDecisionReasons({});
    void loadProfile(employeeId, true);
  }, [employeeId, loadProfile]);

  const employee = setup?.employees.find(item => item.id === employeeId);
  const approvers = setup?.eligibleApprovers.find(item => item.employeeId === employeeId)?.approvers ?? [];
  const ratingForSkill = useMemo(() => new Map(profile?.ratings.map(r => [r.skillId, r]) ?? []), [profile]);
  const currentSkillName = (skillId: string | null) => setup?.skills.find(skill => skill.id === skillId)?.name ?? "Proposed skill";
  const mutate = async (path: string, body: Record<string, unknown>, success: string) => {
    setPending(true); setError(""); setNotice("");
    try {
      await api(path, csrfToken, { method: "POST", body: JSON.stringify({ commandId: commandId(), ...body }) });
      setNotice(success); await refresh();
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 409 ? "This skill record changed or the request conflicts with current history. Refresh and review the latest version, then try again." : cause instanceof Error ? cause.message : "The skill action could not be saved.");
    } finally { setPending(false); }
  };

  const submitRequest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !employeeId || !approverAccountId) return;
    const skillId = skillChoice && skillChoice !== "__new__" ? skillChoice : undefined;
    const expectedRatingVersion = skillId ? ratingForSkill.get(skillId)?.version ?? 0 : 0;
    void mutate(`${API}/requests`, {
      employeeId, ...(skillId ? { skillId } : { proposedSkillName: proposedSkillName.trim() }), requestedLevel,
      expectedRatingVersion, approverAccountId, reason: requestReason.trim()
    }, "Request saved. The official rating changes only after approval.");
  };
  const submitDirectRate = (event: React.FormEvent) => {
    event.preventDefault(); if (!employeeId || !directSkillId) return;
    void mutate(`${API}/ratings`, { employeeId, skillId: directSkillId, level: directLevel, expectedRatingVersion: ratingForSkill.get(directSkillId)?.version ?? 0, reason: directReason.trim() }, "Official rating saved.");
  };
  const submitCatalogue = (event: React.FormEvent) => {
    event.preventDefault(); void mutate(`${API}/catalogue`, { name: catalogueName.trim(), reason: catalogueReason.trim() }, "Skill added to the catalogue.");
  };
  const decide = (row: SkillRequest, outcome: "APPROVED" | "REJECTED") => {
    const reason = decisionReasons[row.id]?.trim() ?? ""; if (reason.length < 3) { setError("Enter a decision reason of at least 3 characters."); return; }
    void mutate(`${API}/requests/${encodeURIComponent(row.id)}/decision`, { outcome, reason }, outcome === "APPROVED" ? "Skill request approved." : "Skill request rejected.");
  };

  if (loading) return <section className="learning-workspace" aria-busy="true"><p role="status">Loading Skills…</p></section>;
  if (error && !setup) return <section className="learning-workspace"><div className="learning-alert" role="alert">{error}</div><button type="button" onClick={() => { setLoading(true); void loadSetup().catch(cause => setError(cause instanceof Error ? cause.message : "Couldn’t load Skills.")).finally(() => setLoading(false)); }}>Retry</button></section>;
  if (!setup || setup.employees.length === 0) return <section className="learning-workspace"><header className="learning-heading"><div><h2>Skills</h2><p>Official skills are recorded through a reasoned request and approval.</p></div></header><p className="learning-empty" role="status">No active employee profiles are available to you.</p></section>;

  return <section className="learning-workspace" aria-busy={pending || profileLoading}>
    <header className="learning-heading"><div><h2>Skills</h2><p>Official levels: Beginner, Intermediate, Advanced and Expert. Requests do not change an official rating until approved.</p></div><button className="learning-secondary" type="button" disabled={pending} onClick={() => void refresh()}>Refresh</button></header>
    <div className="learning-toolbar"><label htmlFor="learning-employee">Employee profile</label><select id="learning-employee" value={employeeId} onChange={event => setEmployeeId(event.target.value)}><option value="">Choose employee</option>{setup.employees.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
    {error && <div className="learning-alert" role="alert">{error}</div>}{notice && <div className="learning-notice" role="status">{notice}</div>}
    {profileLoading && <p role="status">Loading profile…</p>}
    {employee && profile && <>
      <section className="learning-panel"><div className="learning-section-heading"><div><h3>Official ratings</h3><p>Current approved level and version for {employee.label}.</p></div></div>
        {profile.ratings.length === 0 ? <p className="learning-empty" role="status">No official skill ratings yet.</p> : <div className="learning-list">{profile.ratings.map(rating => <article className="learning-card" key={rating.id}><div><strong>{currentSkillName(rating.skillId)}</strong><p>{labelLevel(rating.level)} · Version {rating.version}</p></div></article>)}</div>}
      </section>

      {profile.capabilities.canRequest && <section className="learning-panel"><h3>Request a skill rating</h3><p>Choose a catalogue skill or propose a new name. A named eligible approver must decide before the official rating changes.</p>
        <form className="learning-form" onSubmit={submitRequest}>
          <label>Skill<select value={skillChoice} onChange={event => setSkillChoice(event.target.value)} required><option value="">Choose a catalogue skill</option>{setup.skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}<option value="__new__">Propose a new skill</option></select></label>
          {skillChoice === "__new__" && <label>Proposed skill name<input value={proposedSkillName} onChange={event => setProposedSkillName(event.target.value)} minLength={1} maxLength={120} required /></label>}
          <label>Requested level<select value={requestedLevel} onChange={event => setRequestedLevel(event.target.value as Level)}>{LEVELS.map(value => <option value={value} key={value}>{labelLevel(value)}</option>)}</select></label>
          <label>Approver<select value={approverAccountId} onChange={event => setApproverAccountId(event.target.value)} required><option value="">Choose an eligible approver</option>{approvers.map(person => <option value={person.accountId} key={person.accountId}>{person.label}</option>)}</select></label>
          {!approvers.length && <p className="learning-empty" role="status">No eligible approver is available for this employee.</p>}
          <label className="learning-wide">Reason<textarea value={requestReason} onChange={event => setRequestReason(event.target.value)} minLength={3} maxLength={1000} rows={3} required /></label>
          <button type="submit" disabled={pending || !approvers.length || !skillChoice || skillChoice === "__new__" && !proposedSkillName.trim() || requestReason.trim().length < 3}>Submit request</button>
        </form>
      </section>}

      {profile.capabilities.canDirectRate && <section className="learning-panel"><h3>Owner direct rating</h3><p>Direct changes are reasoned and retained in immutable rating history.</p>
        <form className="learning-form" onSubmit={submitDirectRate}><label>Skill<select value={directSkillId} onChange={event => setDirectSkillId(event.target.value)} required><option value="">Choose skill</option>{setup.skills.map(skill => <option value={skill.id} key={skill.id}>{skill.name}</option>)}</select></label><label>Official level<select value={directLevel} onChange={event => setDirectLevel(event.target.value as Level)}>{LEVELS.map(value => <option value={value} key={value}>{labelLevel(value)}</option>)}</select></label><label className="learning-wide">Reason<textarea value={directReason} onChange={event => setDirectReason(event.target.value)} minLength={3} maxLength={1000} rows={3} required /></label><button type="submit" disabled={pending || !directSkillId || directReason.trim().length < 3}>Save official rating</button></form>
      </section>}

      {profile.capabilities.canDirectRate && <section className="learning-panel"><h3>Owner catalogue</h3><form className="learning-form" onSubmit={submitCatalogue}><label>New skill name<input value={catalogueName} onChange={event => setCatalogueName(event.target.value)} maxLength={120} required /></label><label className="learning-wide">Reason<textarea value={catalogueReason} onChange={event => setCatalogueReason(event.target.value)} minLength={3} maxLength={1000} rows={2} required /></label><button type="submit" disabled={pending || !catalogueName.trim() || catalogueReason.trim().length < 3}>Add skill</button></form></section>}

      <section className="learning-panel"><h3>Requests and decisions</h3>{profile.requests.length === 0 ? <p className="learning-empty" role="status">No skill requests for this employee.</p> : <div className="learning-list">{profile.requests.map(row => <article className="learning-card" key={row.id}>
        <div className="learning-card-main"><strong>{row.proposedSkillName ?? currentSkillName(row.skillId)}</strong><p>{labelLevel(row.requestedLevel)} · {row.approvalState ?? "Approval unavailable"} · Approver: {row.approverLabel}</p><p>Expected rating version: {row.expectedRatingVersion} · {row.reason}</p>{row.proposedSkillName && <p>Proposed skill</p>}
          {row.decisionEvidence && <div className="learning-decision"><strong>{row.decisionEvidence.outcome === "APPROVED" ? "Approved" : "Rejected"}</strong><p>{row.decisionEvidence.reason}</p><small>{new Date(row.decisionEvidence.decidedAt).toLocaleString()}</small></div>}
        </div>
        {row.canDecide && <div className="learning-decision-actions"><label>Decision reason<textarea aria-label={`Decision reason for ${row.proposedSkillName ?? currentSkillName(row.skillId)}`} value={decisionReasons[row.id] ?? ""} onChange={event => setDecisionReasons(current => ({ ...current, [row.id]: event.target.value }))} minLength={3} maxLength={1000} rows={2} /></label><div><button type="button" disabled={pending || (decisionReasons[row.id]?.trim().length ?? 0) < 3} onClick={() => decide(row, "APPROVED")}>Approve</button><button className="learning-secondary" type="button" disabled={pending || (decisionReasons[row.id]?.trim().length ?? 0) < 3} onClick={() => decide(row, "REJECTED")}>Reject</button></div></div>}
      </article>)}</div>}</section>

      <section className="learning-panel"><h3>Immutable rating history</h3>{profile.changes.length === 0 ? <p className="learning-empty" role="status">No approved rating changes have been recorded.</p> : <div className="learning-list">{profile.changes.map(change => { const rating = profile.ratings.find(item => item.id === change.ratingId); return <article className="learning-card learning-history" key={change.id}><div><strong>{rating ? currentSkillName(rating.skillId) : "Skill"} · Version {change.version}</strong><p>{labelLevel(change.fromLevel)} → {labelLevel(change.toLevel)} · {new Date(change.occurredAt).toLocaleString()}</p><p>{change.reason}</p></div></article>; })}</div>}</section>
    </>}
  </section>;
}

export function SkillsTrainingWorkspace({ csrfToken }: { csrfToken: string }): React.JSX.Element {
  return <><SkillsWorkspace csrfToken={csrfToken} /><TrainingWorkspace csrfToken={csrfToken} /></>;
}
