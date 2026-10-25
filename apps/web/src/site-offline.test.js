import { afterEach, describe, expect, it, vi } from "vitest";
import { amendOfflineCommand, isRetryableOfflineStatus, OfflineStorageUnavailableError, purgeOfflineAccount, readOfflinePointer, saveOfflineCommand, saveOfflinePointer, } from "./site-offline.js";
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals(); });
const command = {
    key: "account-a:project-a:local-a", accountId: "account-a", projectId: "project-a", projectTitle: "Site A",
    localId: "local-a", commandId: "command-a", baseRecordVersion: 7, action: "PACKAGE_PROGRESS",
    payload: { recordId: "record-a", actualPercent: "42.5", photoIds: ["doc-a"] }, reason: "Capture site progress",
    photos: [{ localId: "photo-a", folderId: "folder-a", fileName: "slab.jpg", mimeType: "image/jpeg", sizeBytes: 3, bytes: new Blob(["img"]) }],
    status: "CONFLICT", conflict: { id: "record-a", version: 9, state: "OPEN", data: { actualPercent: "40" } }, createdAt: "2026-10-04T00:00:00.000Z",
};
describe("offline capture persistence contract", () => {
    it("retries interrupted upload and command states without replacing their identity", () => {
        for (const status of ["PENDING", "FAILED", "UPLOADING", "SYNCING"])
            expect(isRetryableOfflineStatus(status)).toBe(true);
        expect(isRetryableOfflineStatus("CONFLICT")).toBe(false);
        expect(isRetryableOfflineStatus("SYNCED")).toBe(false);
        const retry = { ...command, status: "UPLOADING" };
        expect(retry.commandId).toBe(command.commandId);
        expect(retry.photos[0]?.localId).toBe(command.photos[0]?.localId);
    });
    it("amends only through a new key and command ID at the shown current version", () => {
        let next = 0;
        const amended = amendOfflineCommand(command, 9, "Correct actual progress after comparison", { actualPercent: "45.25" }, () => `new-${++next}`);
        expect(amended).toMatchObject({
            key: "account-a:project-a:new-1", localId: "new-1", commandId: "new-2", baseRecordVersion: 9,
            action: "PACKAGE_PROGRESS", reason: "Correct actual progress after comparison",
            payload: { recordId: "record-a", actualPercent: "45.25", photoIds: ["doc-a"] },
            photos: command.photos, status: "PENDING",
        });
        expect(amended).not.toHaveProperty("conflict");
        expect(amended).not.toHaveProperty("error");
        expect(command.baseRecordVersion).toBe(7);
    });
    it("keeps the cold-offline pointer minimal and refuses fake success when IndexedDB is unavailable", async () => {
        saveOfflinePointer({ accountId: "account-a", projectId: "project-a", projectTitle: "Site A" });
        expect(readOfflinePointer()).toEqual({ accountId: "account-a", projectId: "project-a", projectTitle: "Site A" });
        expect(localStorage.getItem("sense-site-offline-pointer-v1")).not.toContain("csrf");
        vi.stubGlobal("indexedDB", undefined);
        await expect(saveOfflineCommand(command)).rejects.toBeInstanceOf(OfflineStorageUnavailableError);
        await expect(purgeOfflineAccount("account-a")).rejects.toBeInstanceOf(OfflineStorageUnavailableError);
    });
    it("does not let a delayed IndexedDB open write a draft after account purge begins", async () => {
        const database = { close: vi.fn(), transaction: vi.fn() };
        const requests = [];
        vi.stubGlobal("indexedDB", {
            open: () => {
                const request = { result: database, onsuccess: null, onerror: null };
                requests.push(request);
                return request;
            },
        });
        const saving = saveOfflineCommand(command);
        const purging = purgeOfflineAccount("account-a");
        expect(requests).toHaveLength(2);
        const purgeRejected = expect(purging).rejects.toBeInstanceOf(OfflineStorageUnavailableError);
        requests[0].onsuccess?.(new Event("success"));
        await expect(saving).rejects.toThrow("Offline access changed before the draft could be saved.");
        expect(database.transaction).not.toHaveBeenCalled();
        requests[1].onerror?.(new Event("error"));
        await purgeRejected;
    });
});
