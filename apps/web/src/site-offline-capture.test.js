import { jsx as _jsx } from "react/jsx-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SiteOfflineCapture } from "./site-offline-capture.js";
const store = vi.hoisted(() => ({ context: undefined, rows: new Map(), failSave: false }));
vi.mock("./site-offline.js", () => ({
    OfflineStorageUnavailableError: class OfflineStorageUnavailableError extends Error {
    },
    deleteOfflineCommand: async (key) => { store.rows.delete(key); },
    getOfflineContext: async () => store.context,
    listOfflineCommands: async (accountId, projectId) => [...store.rows.values()].filter((item) => item.accountId === accountId && (!projectId || item.projectId === projectId)),
    purgeOfflineAccount: async (accountId) => { for (const [key, item] of store.rows)
        if (item.accountId === accountId)
            store.rows.delete(key); },
    purgeOfflineContext: async () => undefined,
    purgeOfflineProject: async () => undefined,
    purgeOtherOfflineAccounts: async () => undefined,
    saveOfflineCommand: async (row) => { if (store.failSave)
        throw new Error("Quota exceeded; draft was not saved."); store.rows.set(row.key, row); },
    saveOfflineContext: async (context) => { store.context = context; },
    saveOfflinePointer: () => undefined,
    clearOfflinePointer: () => undefined,
    readOfflinePointer: () => undefined,
    amendOfflineCommand: (entry, version, reason, changes, createId) => ({ ...entry, key: `account-a:project-a:${createId()}`, localId: createId(), commandId: createId(), baseRecordVersion: version, reason, payload: { ...entry.payload, ...changes }, status: "PENDING" }),
    isRetryableOfflineStatus: (status) => ["PENDING", "FAILED", "UPLOADING", "SYNCING"].includes(status),
}));
afterEach(() => { vi.unstubAllGlobals(); });
beforeEach(() => {
    store.rows.clear();
    store.failSave = false;
    store.context = { key: "account-a:project-a", accountId: "account-a", projectId: "project-a", projectTitle: "Project A", preparedAt: "2026-10-04T10:00:00Z", today: "2026-10-04", packages: [], folders: [] };
});
const renderCapture = () => render(_jsx(SiteOfflineCapture, { accountId: "account-a", projectId: "project-a", projectTitle: "Project A", csrfToken: "csrf-live", today: "2026-10-04", canWork: true, canUpload: true, packages: [], folders: [], onAccessLost: () => undefined, onSynced: () => undefined }));
describe("offline site capture queue", () => {
    it("keeps the same command ID when a lost response is retried", async () => {
        const envelopes = [];
        let failFirst = true;
        vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
            const envelope = JSON.parse(String(init?.body));
            envelopes.push(envelope);
            if (failFirst) {
                failFirst = false;
                throw new TypeError("connection lost after send");
            }
            return new Response(JSON.stringify({ id: "note-1", version: 1, recordVersion: 1, replayed: true }), { status: 201, headers: { "Content-Type": "application/json" } });
        }));
        renderCapture();
        fireEvent.click(await screen.findByRole("button", { name: "Prepare offline capture" }));
        fireEvent.change(await screen.findByLabelText("Observation note"), { target: { value: "North wall pour observed" } });
        fireEvent.change(screen.getByLabelText("Reason for this offline command"), { target: { value: "Record the field observation" } });
        fireEvent.click(screen.getByRole("button", { name: "Save offline draft" }));
        await screen.findByText("North wall pour observed");
        fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
        await screen.findByText("Failed");
        fireEvent.click(screen.getByRole("button", { name: "Sync now" }));
        await screen.findByText("Synchronized");
        await waitFor(() => expect(envelopes).toHaveLength(2));
        expect(envelopes[1]).toMatchObject({ commandId: envelopes[0]?.commandId, localId: envelopes[0]?.localId, action: "NOTE", baseRecordVersion: null });
    });
    it("reports local quota failures without showing a saved queue item", async () => {
        store.failSave = true;
        renderCapture();
        fireEvent.click(await screen.findByRole("button", { name: "Prepare offline capture" }));
        fireEvent.change(await screen.findByLabelText("Observation note"), { target: { value: "North wall pour observed" } });
        fireEvent.change(screen.getByLabelText("Reason for this offline command"), { target: { value: "Record the field observation" } });
        fireEvent.click(screen.getByRole("button", { name: "Save offline draft" }));
        expect(await screen.findByText(/Quota exceeded; draft was not saved/i)).toBeInTheDocument();
        expect(store.rows.size).toBe(0);
    });
});
