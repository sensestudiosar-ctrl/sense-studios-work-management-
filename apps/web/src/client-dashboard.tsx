import { useEffect, useState } from "react";
import type { PortalSession } from "./client-portal-auth.js";
import { ClientProjectGallery } from "./gallery.js";
import "./client-dashboard.css";

const API = "/api/v1/client-portal";
type Project = { id: string; title: string; status: string };
type Item = { id: string; label: string; status: string; revision: { id: string; label: string; mimeType: string } | null; permissions?: { view: boolean; review: boolean; approve: boolean; download: boolean } };
type Package = { id: string; title: string; status: string; createdAt?: string; submittedAt?: string; items: Item[] };
type Workspace = { project: Project; packages: Package[] };
type Projects = { projects: Project[] };
async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${API}${path}`, { credentials: "include", cache: "no-store", signal });
  if (!response.ok) throw new Error(String(response.status));
  return await response.json() as T;
}

export function ClientDashboard({ session }: { session: PortalSession }): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setWorkspace(null); setProjects([]); setSelectedId("");
    void get<Projects>("/projects", controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setProjects(result.projects);
      setSelectedId(result.projects[0]?.id ?? "");
      if (!result.projects.length) setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) { setError("Your shared projects could not be loaded. Refresh to try again."); setLoading(false); } });
    return () => controller.abort();
  }, [session.account.id, retry]);

  useEffect(() => {
    if (!selectedId) { setWorkspace(null); return; }
    const controller = new AbortController();
    setLoading(true); setError(""); setWorkspace(null);
    void get<Workspace>(`/reviews/projects/${encodeURIComponent(selectedId)}`, controller.signal)
      .then(value => { if (!controller.signal.aborted) setWorkspace(value); })
      .catch(() => { if (!controller.signal.aborted) { setError("This project summary is unavailable under your current access. Refresh or choose another shared project."); setWorkspace(null); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedId, session.account.id, retry]);

  const project = projects.find(value => value.id === selectedId);
  const packages = workspace?.packages ?? [];
  const visible = packages.flatMap(pack => pack.items.filter(item => item.permissions?.view || item.permissions?.review || item.permissions?.approve || item.permissions?.download).map(item => ({ ...item, packageTitle: pack.title, packageStatus: pack.status })));
  const approved = visible.filter(item => item.status === "APPROVED").length;
  const recentPackages = [...packages].sort((a, b) => new Date(b.submittedAt ?? b.createdAt ?? 0).getTime() - new Date(a.submittedAt ?? a.createdAt ?? 0).getTime()).slice(0, 5);
  const pending = visible.filter(item => item.status === "PENDING" || item.status === "IN_REVIEW").filter(item => item.permissions?.review || item.permissions?.approve);

  return <section className="client-dashboard" aria-labelledby="client-dashboard-heading">
    <header><div><p className="client-dashboard-kicker">SHARED PROJECT OVERVIEW</p><h2 id="client-dashboard-heading">Project dashboard</h2><p>Project details and shared review items available to your client account.</p></div><button type="button" className="client-portal-secondary" onClick={() => setRetry(value => value + 1)} disabled={loading}>Refresh</button></header>
    {error && <p className="client-dashboard-error" role="alert">{error}</p>}
    {loading && <p className="client-dashboard-muted" role="status">Loading shared project details…</p>}
    {!loading && !error && projects.length === 0 && <p className="client-dashboard-muted" role="status">No projects are currently shared with your account.</p>}
    {!loading && !error && projects.length > 0 && <>
      <label className="client-dashboard-project">Project<select value={selectedId} onChange={event => setSelectedId(event.target.value)}>{projects.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      {workspace && project && <>
        <div className="client-dashboard-cards"><article><span>Project status</span><strong>{project.status}</strong></article><article><span>Shared approvals</span><strong>{approved} / {visible.length}</strong><small>Approved items among items shared with your account.</small></article></div>
        <div className="client-dashboard-grid"><article><h3>Recent submitted packages</h3>{recentPackages.length ? <ul>{recentPackages.map(pack => <li key={pack.id}><strong>{pack.title}</strong><span>{pack.status}</span></li>)}</ul> : <p className="client-dashboard-muted">No review packages are currently shared.</p>}</article>
          <article><h3>Reviews available to you</h3>{pending.length ? <ul>{pending.map(item => <li key={item.id}><strong>{item.label}</strong><span>{item.packageTitle} · {item.status}</span></li>)}</ul> : <p className="client-dashboard-muted">No shared review or approval items need your action.</p>}</article></div>
        <article className="client-dashboard-files"><h3>Approved shared items</h3>{visible.filter(item => item.status === "APPROVED").length ? <ul>{visible.filter(item => item.status === "APPROVED").map(item => <li key={item.id}><strong>{item.label}</strong><span>{item.revision?.label ?? "Approved shared item"}</span></li>)}</ul> : <p className="client-dashboard-muted">No approved shared items are available.</p>}</article>
        <ClientProjectGallery projectId={selectedId} session={session} />
      </>}
    </>}
  </section>;
}
