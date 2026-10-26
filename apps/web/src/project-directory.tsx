import { useState } from "react";
import "./project-directory.css";

export type ProjectDirectoryItem = {
  id: string;
  title: string;
  status: string;
  deliveryType: "DESIGN" | "TURNKEY";
  branch: { id: string; name: string };
  scopes?: Array<{ id: string; name: string }>;
  currentLeadName?: string | null;
  appliedStageKeys?: string[];
  nextMilestone?: { key: string; label: string; targetAt: string } | null;
};

type ProjectDirectoryProps = {
  items: ProjectDirectoryItem[];
  selectedId: string;
  pending: boolean;
  onSelect: (id: string) => void;
  initialView?: "cards" | "list";
};

const knownStatusClasses = new Set(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "ARCHIVED"]);

function statusClass(status: string): string {
  const canonical = String(status ?? "").toUpperCase();
  return knownStatusClasses.has(canonical) ? `is-${canonical.toLowerCase()}` : "is-neutral";
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ProjectMetadata({ item, compact = false }: { item: ProjectDirectoryItem; compact?: boolean }): React.JSX.Element {
  const scopes = item.scopes ?? [];
  const stages = item.appliedStageKeys ?? [];
  return (
    <dl className={`project-directory-metadata${compact ? " is-compact" : ""}`}>
      <div className="project-directory-meta">
        <dt>Branch</dt><dd>{item.branch.name}</dd>
      </div>
      <div className="project-directory-meta project-directory-scopes">
        <dt>Baseline scopes <span className="project-directory-count">{scopes.length}</span></dt>
        <dd>{scopes.length ? scopes.map((scope) => scope.name).join(", ") : "No scopes recorded"}</dd>
      </div>
      <div className="project-directory-meta">
        <dt>Lead</dt><dd>{item.currentLeadName?.trim() || "Unassigned"}</dd>
      </div>
      <div className="project-directory-meta">
        <dt>Next milestone</dt>
        <dd>{item.nextMilestone ? <>{item.nextMilestone.label}<span className="project-directory-date"> · {dateLabel(item.nextMilestone.targetAt)}</span></> : "No dated incomplete milestone"}</dd>
      </div>
      <div className="project-directory-meta project-directory-stages">
        <dt>Plan stages</dt><dd>{stages.length ? stages.join(", ") : "No applied plan stage keys"}</dd>
      </div>
    </dl>
  );
}

function ProjectIdentityIcon(): React.JSX.Element {
  return <svg className="project-directory-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 6.75h6l1.8 2h9.2v8.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5z" /><path d="M3.5 9h17" /></svg>;
}

export function ProjectDirectory({ items, selectedId, pending, onSelect, initialView = "cards" }: ProjectDirectoryProps): React.JSX.Element {
  const [view, setView] = useState<"cards" | "list">(initialView);
  return (
    <section className="project-directory" aria-label="Projects directory">
      <div className="project-directory-toolbar">
        <p className="project-directory-total">{items.length} {items.length === 1 ? "project" : "projects"} on this page</p>
        <div className="project-directory-view-switch" role="group" aria-label="Project display">
          <button type="button" aria-label="Cards view" aria-pressed={view === "cards"} onClick={() => setView("cards")}>Cards</button>
          <button type="button" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
        </div>
      </div>
      {items.length ? (
        <ul className={`project-directory-items is-${view}`}>
          {items.map((item) => (
            <li className="project-directory-entry" key={item.id}>
              <button type="button" className="project-directory-project" aria-pressed={selectedId === item.id} disabled={pending} onClick={() => onSelect(item.id)}>
                <span className="project-directory-heading">
                  <span className="project-directory-icon-wrap"><ProjectIdentityIcon /></span>
                  <span className="project-directory-title-wrap">
                    <span className="project-directory-title">{item.title}</span>
                    <span className="project-directory-subtitle">{item.deliveryType === "TURNKEY" ? "Turnkey" : "Design"} · {item.branch.name}</span>
                  </span>
                  <span className={`project-directory-status ${statusClass(item.status)}`}>{item.status}</span>
                </span>
                <ProjectMetadata item={item} compact={view === "list"} />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="project-directory-empty">No projects match the current view.</p>}
    </section>
  );
}
