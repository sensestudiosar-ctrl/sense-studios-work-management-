// Standalone V15 preview harness — mounted at /v15-preview for visual verification.
// Not part of the production app routes; used only by Playwright screenshots.
import { useState } from "react";
import { TaskComposerFields, type TaskComposerDraft } from "./task-composer-fields.js";
import "./task-create-dialog.css";
import "./task-composer-v15.css";

const initialDraft: TaskComposerDraft = {
  title: "", type: "NON_PROJECT", priority: "MEDIUM", targetDate: "",
  description: "", projectId: "", ownerId: "", startDate: "", estimatedHours: "",
  collaboratorIds: [], collaboratorHours: {}, planItemId: "", tagsText: "",
  checklistText: "", reason: "", assignTo: false, reviewRequirement: "NONE",
};

const mockOptions = {
  actorEmployeeId: null,
  project: { id: "project-a", title: "Aadi3 Apartment — 8th Floor Interiors", status: "ACTIVE" },
  canAssign: true,
  canCreate: true,
  owners: [
    { id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" },
    { id: "emp-2", name: "Karthik Reddy", homeBranchId: "branch-a" },
  ],
  collaborators: [
    { id: "emp-1", name: "Anjali Rao", homeBranchId: "branch-a" },
    { id: "emp-2", name: "Karthik Reddy", homeBranchId: "branch-a" },
    { id: "emp-3", name: "Meera Suresh", homeBranchId: "branch-a" },
    { id: "emp-4", name: "Sanjay Krishna", homeBranchId: "branch-a" },
    { id: "emp-5", name: "Pranav Chandrashekhar — Detached Technical Design & Site", homeBranchId: "branch-a" },
  ],
  readAt: "2026-10-24T00:00:00Z",
};

export function V15Preview() {
  const [draft, setDraft] = useState<TaskComposerDraft>({ ...initialDraft, title: "Prepare kitchen working drawings", description: "Draw the kitchen elevations, joinery details and hardware schedule.", targetDate: "2026-11-06", reason: "Required for site coordination and fabrication.", ownerId: "emp-1", type: "PROJECT", projectId: "project-a", assignTo: true, collaboratorIds: ["emp-2"] });

  return (
    <div style={{ maxWidth: "1160px", margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif", background: "#f7f7f2", minHeight: "100vh" }}>
      <div className="task-create-dialog task-create-dialog--harness" style={{ background: "#fff", border: "1px solid #e8eae6", borderRadius: "13px", overflow: "hidden", margin: "18px 0" }}>
        {/* Drawer head */}
        <div style={{ padding: "12px 24px 13px", borderBottom: "1px solid #e8eae6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "#7a877c", fontWeight: 600, margin: 0 }}>Project / Tasks &nbsp;›&nbsp; <strong style={{ color: "#153f35" }}>New task</strong></p>
            <h2 style={{ fontSize: 22, fontWeight: 720, letterSpacing: "-0.04em", margin: "4px 0 0" }}>New task</h2>
          </div>
          <button style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer", color: "#68796f" }} aria-label="Close">×</button>
        </div>
        {/* Composer */}
        <TaskComposerFields
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          projects={[{ id: "project-a", title: "Aadi3 Apartment — 8th Floor Interiors", status: "ACTIVE" }]}
          planItems={[]}
          options={mockOptions as never}
          optionsError={undefined}
          retryOptions={() => {}}
          compact={false}
          busy={false}
        />
        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 20px 11px", borderTop: "1px solid #e5e9e3", background: "#fff" }}>
          <span style={{ fontSize: 12, color: "#7a877c" }}>Complete required fields&nbsp;&nbsp;Ctrl / ⌘ + Enter</span>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ minHeight: 39, padding: "0 14px", border: "1px solid #d6dfd5", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button style={{ minHeight: 39, padding: "0 18px", border: "none", borderRadius: 8, background: "#254b3d", color: "#fff", fontSize: 13, fontWeight: 650, cursor: "pointer" }}>
              <span style={{ marginRight: 5 }}>+</span>Create task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
