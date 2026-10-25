import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { PeopleDirectory } from "./people-directory.js";
afterEach(() => vi.unstubAllGlobals());
const branchA = { id: "branch-a", name: "Mumbai" };
const teamA = { id: "team-a", name: "Design", branchId: branchA.id };
const personA = {
    id: "person-a", state: "ACTIVE", employeeCode: "SS01",
    account: { normalizedEmail: "alice@example.test" },
    homeBranch: branchA, homeTeam: teamA, jobRoleAssignments: []
};
const personB = {
    id: "person-b", state: "SUSPENDED", employeeCode: "SS02",
    account: { normalizedEmail: "bob@example.test" },
    homeBranch: branchA, homeTeam: teamA, jobRoleAssignments: []
};
/** Renders just the PeopleDirectory with a trivial children renderer. */
function renderDirectory(employees = [personA, personB], initialEntries = ["/people"]) {
    return render(_jsx(MemoryRouter, { initialEntries: initialEntries, children: _jsx(PeopleDirectory, { employees: employees, children: (employee) => _jsx("li", { children: employee.account.normalizedEmail }, employee.id) }) }));
}
describe("PeopleDirectory UX structure", () => {
    it("renders the filter-caused empty state with role=status and a clear-filters action", async () => {
        renderDirectory([personA, personB]);
        expect(screen.getByText("2 of 2 permitted employees")).toBeInTheDocument();
        // Apply a filter that matches nothing
        fireEvent.change(screen.getByRole("searchbox", { name: "Search people" }), { target: { value: "nonexistent-email-xyz" } });
        const empty = await screen.findByText("No people match these filters.");
        const status = empty.closest('[role="status"]');
        expect(status).not.toBeNull();
        // The empty state carries its own clear-filters action, alongside the
        // filter bar's action while filters are applied. Scoping to the status
        // region targets the empty-state one, and clicking it restores the list.
        const emptyAction = within(status).getByRole("button", { name: "Clear filters" });
        expect(emptyAction.className).toContain("task-empty-state__action");
        fireEvent.click(emptyAction);
        await waitFor(() => expect(screen.getByText("2 of 2 permitted employees")).toBeInTheDocument());
        expect(screen.queryByText(/No people match these filters/)).not.toBeInTheDocument();
        // The filter bar's duplicate action is gone once nothing is filtered
        expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });
    it("renders the structural empty state with role=status and no clear-filters action", async () => {
        renderDirectory([]);
        const empty = await screen.findByText("No employees have been added yet. Use onboarding to add an employee after identity enrollment.");
        expect(empty.closest('[role="status"]')).not.toBeNull();
        // No inventory means no filter to clear, so no action is offered.
        expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
        expect(screen.getByText("0 of 0 permitted employees")).toBeInTheDocument();
    });
    it("keeps the list visible while no detail is selected", async () => {
        renderDirectory([personA, personB]);
        expect(screen.getByText("alice@example.test")).toBeInTheDocument();
        expect(screen.getByText("bob@example.test")).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "Person unavailable" })).not.toBeInTheDocument();
    });
});
