/** @jsxRuntime classic */
/** @jsx React.createElement */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { TaskCreateDialog } from "../src/task-create-dialog.js";
import { TaskComposerFields, type TaskComposerDraft } from "../src/task-composer-fields.js";
import "../src/task-create-dialog.css";
import "../src/task.css";

const draft: TaskComposerDraft = {
  title: "",
  type: "NON_PROJECT",
  priority: "MEDIUM",
  targetDate: "2026-11-04",
  description: "",
  projectId: "",
  ownerId: "",
  startDate: "",
  estimatedHours: "",
  collaboratorIds: [],
  collaboratorHours: {},
  planItemId: "",
  tagsText: "",
  checklistText: "",
  reason: "",
  assignTo: false,
  reviewRequirement: "NONE",
};

const projects = [
  { id: "project-residence-01", title: "Riverside Residence", status: "ACTIVE" },
  { id: "project-courtyard-02", title: "Courtyard House", status: "ACTIVE" },
  { id: "project-draft-03", title: "Studio Draft Project", status: "DRAFT" },
];

const planItems = [
  { id: "plan-1", projectId: "project-residence-01", kind: "STAGE", label: "Concept review" },
  { id: "plan-2", projectId: "project-residence-01", kind: "MILESTONE", label: "Client delivery" },
];

const options = {
  actorEmployeeId: "self",
  project: null,
  canAssign: true,
  canCreate: true,
  owners: [
    { id: "self", name: "Asha Mehta", homeBranchId: "branch-central" },
    { id: "person-2", name: "Dev Kapoor", homeBranchId: "branch-central" },
    { id: "person-3", name: "Mira Shah", homeBranchId: "branch-central" },
  ],
  collaborators: [
    { id: "person-2", name: "Dev Kapoor" },
    { id: "person-3", name: "Mira Shah" },
  ],
  readAt: new Date().toISOString(),
};

function Demo() {
  const [d, setD] = React.useState(draft);
  const [open, setOpen] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const patch = React.useCallback((p: Partial<TaskComposerDraft>) => {
    setD(prev => ({ ...prev, ...p }));
  }, []);

  if (!open) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f5f0" }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "14px 32px",
            fontSize: 15,
            fontWeight: 600,
            color: "#fff",
            background: "#244f43",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(36, 79, 67, 0.3)",
          }}
        >
          ＋ Create task
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f5f0" }}>
      <TaskCreateDialog
        title="Create task"
        variant="OWNER"
        busy={busy}
        onRequestClose={() => {
          if (!busy) setOpen(false);
          return true;
        }}
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (!busy) setOpen(false); }}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 500,
                color: "#26312b",
                background: "#fff",
                border: "1px solid #e8e8e2",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); setOpen(false); }, 1200); }}
              style={{
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#244f43",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {busy ? "Creating…" : "Create task"}
            </button>
          </>
        }
      >
        <form style={{ margin: 0, padding: 0, border: 0, background: "transparent" }} onSubmit={e => e.preventDefault()}>
          <TaskComposerFields
            draft={d}
            onChange={patch}
            projects={projects}
            planItems={planItems}
            options={options}
            optionsError={undefined}
            retryOptions={() => undefined}
            compact={false}
            busy={busy}
          />
        </form>
      </TaskCreateDialog>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Demo />);
