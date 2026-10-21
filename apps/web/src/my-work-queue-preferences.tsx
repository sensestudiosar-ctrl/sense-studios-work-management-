import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { loadMyWorkSavedViews, saveMyWorkSavedViews } from "./my-work-saved-views.js";
import type { MyWorkSavedView, MyWorkSnapshot, SavedViewsResult } from "./my-work-saved-views.js";

export type QueuePreferenceMode = "customize" | "save" | null;
type Props = {
  accountId?: string | undefined;
  snapshot: MyWorkSnapshot;
  defaults: MyWorkSnapshot;
  mode: QueuePreferenceMode;
  onMode: (mode: QueuePreferenceMode) => void;
  onApply: (snapshot: MyWorkSnapshot) => void;
};

export function MyWorkQueuePreferences({ accountId, snapshot, defaults, mode, onMode, onApply }: Props): React.JSX.Element {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [loaded, setLoaded] = useState<{ accountId: string | undefined; result: SavedViewsResult }>(() => ({ accountId, result: loadMyWorkSavedViews(accountId ?? "") }));
  const [activeId, setActiveId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [draftView, setDraftView] = useState(snapshot.view);
  const [draftCompact, setDraftCompact] = useState(snapshot.compact);
  const result = loaded.accountId === accountId ? loaded.result : undefined;
  const views: MyWorkSavedView[] = result?.status === "ready" ? result.views : [];

  useEffect(() => {
    setLoaded({ accountId, result: loadMyWorkSavedViews(accountId ?? "") });
    setActiveId(""); setMessage("");
  }, [accountId]);
  useEffect(() => {
    const active = views.find(view => view.id === activeId);
    if (active && JSON.stringify(active.snapshot) !== JSON.stringify(snapshot)) setActiveId("");
  }, [snapshot, activeId, views]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mode) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setName(""); setMessage(""); setDraftView(snapshot.view); setDraftCompact(snapshot.compact);
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close(); triggerRef.current?.focus({ preventScroll: true });
    }
  }, [mode, snapshot]);

  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); event.stopPropagation();
    if (!accountId || result?.status !== "ready" || !name.trim()) return;
    if (views.length >= 20) { setMessage("This browser has twenty saved views. No new view was saved."); return; }
    let viewId: string;
    try { viewId = crypto.randomUUID(); } catch { setMessage("Browser saved views are unavailable. No save was confirmed."); return; }
    const saved = saveMyWorkSavedViews(accountId, [...views, { id: viewId, name: name.trim(), snapshot }]);
    setLoaded({ accountId, result: saved });
    if (saved.status !== "ready") { setMessage(saved.message); return; }
    setActiveId(viewId); onMode(null); setMessage(`Saved “${name.trim()}” in this browser.`);
  };
  const applyView = (viewId: string): void => {
    const selected = views.find(view => view.id === viewId);
    if (viewId && !selected) return;
    onApply(selected?.snapshot ?? defaults); setActiveId(viewId);
    setMessage(selected ? `Loaded “${selected.name}”.` : "Default view restored.");
  };
  const available = result?.status === "ready";
  return <>
    <div className="my-work-saved-controls">
      <button type="button" className="my-work-save-view" disabled={!available} onClick={() => onMode("save")}><span aria-hidden="true">◇</span> Save view</button>
      <select aria-label="Saved view" value={activeId} disabled={!available} onChange={event => applyView(event.target.value)}>
        <option value="">Default view</option>{views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
      </select>
    </div>
    {message && <p className="my-work-preference-message" role="status">{message}</p>}
    {accountId && result && result.status !== "ready" && <p className="my-work-preference-message" role="alert">{result.message}</p>}
    {createPortal(<dialog ref={dialogRef} className="my-work-preferences-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={() => onMode(null)} onClose={() => { if (mode) onMode(null); }}>
      <h3 id={`${id}-title`}>{mode === "save" ? "Save view" : "Customize My Work"}</h3>
      <p id={`${id}-description`}>{mode === "save" ? "Save the applied filters, display and density for your account in this browser. Saved preferences are not synced or encrypted." : "Personal display preferences. Task access and recorded information stay the same."}</p>
      {mode === "save" ? <form onSubmit={save}>
        <label>View name<input autoFocus value={name} onChange={event => setName(event.target.value)} required maxLength={40} /></label>
        {!available && <p role="alert">{result ? result.message : "Saved views require a signed-in account."}</p>}
        {message && <p role="alert">{message}</p>}
        <div className="my-work-preferences-actions"><button type="button" onClick={() => onMode(null)}>Cancel</button><button type="submit" className="task-primary" disabled={!available || !name.trim()}>Save</button></div>
      </form> : <form onSubmit={event => { event.preventDefault(); event.stopPropagation(); onApply({ ...snapshot, view: draftView, compact: draftCompact }); onMode(null); }}>
        <label>Display<select autoFocus value={draftView} onChange={event => setDraftView(event.target.value as MyWorkSnapshot["view"])}><option value="list">List</option><option value="cards">Cards</option><option value="board">Kanban</option><option value="timeline">Timeline</option></select></label>
        <label>Row density<select value={draftCompact ? "compact" : "comfortable"} onChange={event => setDraftCompact(event.target.value === "compact")}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
        <p>Compact density applies to desktop rows; mobile keeps readable touch targets.</p>
        <div className="my-work-preferences-actions"><button type="button" onClick={() => onMode(null)}>Cancel</button><button type="submit" className="task-primary">Apply</button></div>
      </form>}
    </dialog>, document.body)}
  </>;
}
