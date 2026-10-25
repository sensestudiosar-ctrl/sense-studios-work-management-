import { jsx as _jsx } from "react/jsx-runtime";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, vi } from "vitest";
import { PeopleSelf } from "./people-self.js";
beforeEach(() => vi.restoreAllMocks());
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
describe("personal employee profile", () => {
    it("distinguishes enrolled identity from configured employee membership", async () => {
        const fetchMock = vi.fn(async () => response({ employee: null }));
        vi.stubGlobal("fetch", fetchMock);
        render(_jsx(PeopleSelf, {}));
        expect(await screen.findByText(/Owner still needs to configure your employee record/)).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledWith("/api/v1/org/self", { credentials: "include", cache: "no-store" });
    });
    it("allows a failed profile read to be retried without inventing membership", async () => {
        let status = 503;
        vi.stubGlobal("fetch", vi.fn(async () => response({ employee: null }, status)));
        render(_jsx(PeopleSelf, {}));
        expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/);
        expect(screen.queryByText(/Owner still needs/)).not.toBeInTheDocument();
        status = 200;
        fireEvent.click(screen.getByRole("button", { name: "Retry profile" }));
        expect(await screen.findByText(/Owner still needs/)).toBeInTheDocument();
    });
    it("ignores late private profile data after unmount", async () => {
        let resolveRead;
        vi.stubGlobal("fetch", vi.fn(() => new Promise(resolve => { resolveRead = resolve; })));
        const view = render(_jsx(PeopleSelf, {}));
        view.unmount();
        await act(async () => resolveRead(response({ employee: { homeBranch: { name: "Private branch" } } })));
        expect(screen.queryByText("Private branch")).not.toBeInTheDocument();
    });
});
