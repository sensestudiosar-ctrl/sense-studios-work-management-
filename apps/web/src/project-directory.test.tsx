import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProjectDirectory, type ProjectDirectoryItem } from "./project-directory.js";

const projects: ProjectDirectoryItem[] = [
  {
    id: "project-alpha-id", title: "Alpha Residence", status: "ACTIVE", deliveryType: "DESIGN",
    branch: { id: "branch-mumbai", name: "Mumbai" },
    scopes: [{ id: "scope-interior", name: "Interior" }, { id: "scope-lighting", name: "Lighting" }],
    currentLeadName: "Mira Shah", appliedStageKeys: ["CONCEPT", "DETAILS"],
    nextMilestone: { key: "concept-review", label: "Concept review", targetAt: "2026-11-12T00:00:00.000Z" }
  },
  {
    id: "project-beta-id", title: "Beta House", status: "ON_HOLD", deliveryType: "TURNKEY",
    branch: { id: "branch-delhi", name: "Delhi" }, scopes: [{ id: "scope-civil", name: "Civil" }],
    currentLeadName: "Dev Rao", appliedStageKeys: ["SITE"],
    nextMilestone: { key: "site-handover", label: "Site handover", targetAt: "2026-12-02T00:00:00.000Z" }
  }
];

function itemButton(title: string): HTMLButtonElement {
  const titleNode = screen.getByText(title, { selector: ".project-directory-title" });
  const button = titleNode.closest("button");
  if (!button) throw new Error(`Project button for ${title} was not found`);
  return button;
}

describe("ProjectDirectory", () => {
  it("switches views without changing row order and selects the exact project ID", () => {
    const onSelect = vi.fn();
    render(<ProjectDirectory items={projects} selectedId="project-beta-id" pending={false} onSelect={onSelect} />);

    const list = screen.getByRole("list");
    expect(within(list).getAllByText(/Alpha Residence|Beta House/).map((node) => node.textContent)).toEqual(["Alpha Residence", "Beta House"]);
    expect(screen.getByRole("button", { name: "Cards view" })).toHaveAttribute("aria-pressed", "true");
    expect(itemButton("Beta House")).toHaveAttribute("aria-pressed", "true");
    expect(itemButton("Alpha Residence")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list")).toHaveClass("is-list");
    expect(within(screen.getByRole("list")).getAllByText(/Alpha Residence|Beta House/).map((node) => node.textContent)).toEqual(["Alpha Residence", "Beta House"]);

    fireEvent.click(itemButton("Alpha Residence"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("project-alpha-id");
  });

  it("disables row selection while pending but retains the selected pressed state", () => {
    render(<ProjectDirectory items={projects} selectedId="project-alpha-id" pending onSelect={vi.fn()} />);
    expect(itemButton("Alpha Residence")).toBeDisabled();
    expect(itemButton("Alpha Residence")).toHaveAttribute("aria-pressed", "true");
    expect(itemButton("Beta House")).toBeDisabled();
  });

  it("keeps unknown status neutral and shows no invented progress or imagery", () => {
    const unknown = { ...projects[0]!, id: "project-unknown", title: "Unclassified studio", status: "CUSTOM_REVIEW" };
    const { container } = render(<ProjectDirectory items={[unknown]} selectedId="" pending={false} onSelect={vi.fn()} />);
    expect(screen.getByText("CUSTOM_REVIEW")).toHaveClass("is-neutral");
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).not.toMatch(/\b\d{1,3}%\b|progress/i);
  });

  it("shows explicit fallbacks when project metadata is absent", () => {
    const sparse: ProjectDirectoryItem = {
      id: "project-sparse", title: "Sparse record", status: "DRAFT", deliveryType: "DESIGN",
      branch: { id: "branch-1", name: "North" }
    };
    render(<ProjectDirectory items={[sparse]} selectedId="" pending={false} onSelect={vi.fn()} />);
    expect(screen.getByText("North")).toBeInTheDocument();
    expect(screen.getByText(/Baseline scopes/).parentElement).toHaveTextContent("0");
    expect(screen.getByText("No scopes recorded")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("No dated incomplete milestone")).toBeInTheDocument();
    expect(screen.getByText("No applied plan stage keys")).toBeInTheDocument();
  });

  it("preserves the chosen view when the item array changes", () => {
    const { rerender } = render(<ProjectDirectory items={projects} selectedId="" pending={false} onSelect={vi.fn()} initialView="cards" />);
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    const replacement = [{ ...projects[0]!, id: "project-new", title: "Replacement" }];
    rerender(<ProjectDirectory items={replacement} selectedId="" pending={false} onSelect={vi.fn()} initialView="cards" />);
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("list")).toHaveClass("is-list");
    expect(itemButton("Replacement")).toBeInTheDocument();
  });
});
