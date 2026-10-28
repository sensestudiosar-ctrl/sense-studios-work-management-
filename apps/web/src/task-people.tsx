import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./task-people.css";

export type TaskPeopleTask = {
  id: string;
  title: string;
  version: number;
  primaryOwnerEmployeeId: string;
  primaryOwner?: { account?: { normalizedEmail?: string | null } | null } | null;
  projectId?: string | null;
  reviewRequirement: string;
};
type Collaborator = { employeeId: string; name: string; estimatedHours?: number };
type Props = {
  task: TaskPeopleTask;
  primaryOwnerLabel: string;
  refreshVersion: number;
  onOpenTask: () => void;
  onSessionExpired?: () => void;
};
type LoadState = { key: string; status: "unknown" | "loading" | "ready" | "error" | "denied"; collaborators?: Collaborator[]; assignedBy?: { name: string; kind: "OWNER" | "STAFF" }; message?: string };

/**
 * "Assigned by" is the actor of the most recent owner reassignment, falling
 * back to the task creator. It is deliberately NOT treated as a collaborator:
 * the demo distinguishes the two relationships, and so does the audit trail.
 */
function readAssignedBy(value: unknown): { name: string; kind: "OWNER" | "STAFF" } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const assignedBy = (value as { assignedBy?: unknown }).assignedBy;
  if (!assignedBy || typeof assignedBy !== "object") return undefined;
  const name = (assignedBy as { name?: unknown }).name;
  if (typeof name !== "string" || !name.trim()) return undefined;
  const kind = (assignedBy as { kind?: unknown }).kind;
  return { name: name.trim(), kind: kind === "STAFF" ? "STAFF" : "OWNER" };
}

export function initials(value: string): string {
  const clean = value.trim();
  if (!clean || /^(unknown worker|task owner)$/i.test(clean)) return "?";
  const words = (clean.includes("@") ? clean.split("@")[0]! : clean).split(/[\s._+-]+/).filter(Boolean);
  if (!words.length) return "?";
  return words.length === 1 ? words[0]!.slice(0, 2).toUpperCase() : `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
}

export function TaskPeople({ task, primaryOwnerLabel, refreshVersion, onOpenTask, onSessionExpired }: Props): React.JSX.Element {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [load, setLoad] = useState<LoadState>({ key: "", status: "unknown" });
  const [retry, setRetry] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const sessionExpiredRef = useRef(onSessionExpired);
  sessionExpiredRef.current = onSessionExpired;
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const key = `${task.id}:${task.version}:${refreshVersion}:${task.primaryOwnerEmployeeId}:${task.primaryOwner?.account?.normalizedEmail ?? ""}`;
  const open = openKey === key;

  useEffect(() => {
    if (!open || (loadRef.current.key === key && loadRef.current.status === "ready")) return;
    const controller = new AbortController();
    let current = true;
    setLoad({ key, status: "loading" });
    fetch(`/api/v1/tasks/${encodeURIComponent(task.id)}`, { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          if (response.status === 401 && current) sessionExpiredRef.current?.();
          const error = new Error(`Could not load people (${response.status})`) as Error & { status: number };
          error.status = response.status;
          throw error;
        }
        return response.json() as Promise<{ task?: { id?: unknown; version?: unknown; primaryOwnerEmployeeId?: unknown }; collaborators?: unknown; people?: unknown }>;
      })
      .then((body) => {
        if (!current) return;
        if (body.task?.id !== task.id || body.task.version !== task.version || body.task.primaryOwnerEmployeeId !== task.primaryOwnerEmployeeId || !Array.isArray(body.collaborators)) throw new Error("Task details are unavailable. Please retry.");
        const collaborators: Collaborator[] = [];
        for (const value of body.collaborators) {
          if (!value || typeof value !== "object") throw new Error("Task details are unavailable. Please retry.");
          const person = value as Record<string, unknown>;
          if (typeof person.employeeId !== "string" || !person.employeeId.trim() || typeof person.name !== "string" || !person.name.trim()) throw new Error("Task details are unavailable. Please retry.");
          const hasHours = typeof person.estimatedHours === "number" || (typeof person.estimatedHours === "string" && person.estimatedHours.trim() !== "");
          const parsedHours = hasHours ? Number(person.estimatedHours) : NaN;
          collaborators.push({ employeeId: person.employeeId, name: person.name, ...(Number.isFinite(parsedHours) ? { estimatedHours: parsedHours } : {}) });
        }
        const assignedBy = readAssignedBy(body.people);
        setLoad({ key, status: "ready", collaborators, ...(assignedBy ? { assignedBy } : {}) });
      })
      .catch((error: unknown) => {
        if (!current || controller.signal.aborted) return;
        const status = (error as { status?: number }).status;
        setLoad({ key, status: status === 403 ? "denied" : "error", message: status === 403 ? "You don’t have access to collaborator details." : "Could not load people. Please retry." });
      });
    return () => { current = false; controller.abort(); };
  }, [open, key, task.id, retry]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  function close(): void {
    setOpenKey(null);
    queueMicrotask(() => trigger.current?.focus());
  }
  function openTask(): void { close(); onOpenTask(); }
  const activeLoad = load.key === key ? load : { key, status: "unknown" as const };
  const ready = activeLoad.status === "ready";
  const people = ready ? activeLoad.collaborators! : [];
  const email = task.primaryOwner?.account?.normalizedEmail;
  const label = primaryOwnerLabel.trim() || email || "Unknown worker";

  return <>
    <button ref={trigger} type="button" className="task-people-trigger" aria-label={`People on ${task.title}: responsible worker ${label}`} onClick={() => setOpenKey(key)}>
      <span className="task-people-avatar-stack" aria-hidden="true"><span className="task-people-avatar">{initials(label)}</span>{ready && people.slice(0, 2).map((person) => <span className="task-people-avatar" key={person.employeeId}>{initials(person.name)}</span>)}{ready && people.length > 2 && <span className="task-people-overflow">+{people.length - 2}</span>}</span>
      <span className="task-people-copy"><strong>{label}{ready && people.length > 0 ? ` +${people.length}` : ""}</strong><small>People</small></span>
    </button>
    {open && typeof document !== "undefined" && createPortal(<dialog ref={dialog} className="task-people-dialog" aria-labelledby={`task-people-title-${task.id}`} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => { if (open) close(); }}>
      <header><h2 id={`task-people-title-${task.id}`}>People · {task.title}</h2><button type="button" aria-label="Close people dialog" onClick={close}>×</button></header>
      <div className="task-people-info">
        <PersonRow name={label} detail="Responsible worker" />
        {activeLoad.status === "loading" && <p role="status">Loading collaborators…</p>}
        {activeLoad.status === "unknown" && <p role="status">Loading collaborators…</p>}
        {activeLoad.status === "denied" && <div role="alert">{activeLoad.message} <button type="button" onClick={() => { setLoad({ key, status: "unknown" }); setRetry((value) => value + 1); }}>Retry</button></div>}
        {activeLoad.status === "error" && <div role="alert">{activeLoad.message} <button type="button" onClick={() => { setLoad({ key, status: "unknown" }); setRetry((value) => value + 1); }}>Retry</button></div>}
        {ready && people.map((person) => <PersonRow key={person.employeeId} name={person.name} detail="Collaborator" />)}
        {ready && people.length === 0 && <p>No collaborators assigned.</p>}
        <div className="task-people-assigned-by"><strong>Assigned by</strong><span>{activeLoad.assignedBy ? `${activeLoad.assignedBy.name}${activeLoad.assignedBy.kind === "OWNER" ? " · Owner" : " · Staff"}` : "Assigning person’s name unavailable."}</span></div>
        <div className="task-people-review-note"><strong>Review</strong>{task.reviewRequirement === "NONE" ? <span>Review not required.</span> : <button type="button" onClick={openTask}>Open review assignment</button>}</div>
      </div>
      <footer><button type="button" onClick={close}>Close</button><button type="button" className="primary" onClick={openTask}>Open task details</button></footer>
    </dialog>, document.body)}
  </>;
}

function PersonRow({ name, detail }: { name: string; detail: string }): React.JSX.Element {
  return <div className="task-people-info-row"><span className="task-people-avatar" aria-hidden="true">{initials(name)}</span><span><strong>{name}</strong><small>{detail}</small></span></div>;
}
