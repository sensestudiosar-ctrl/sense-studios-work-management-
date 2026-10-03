import { BadRequestException } from "@nestjs/common";
import { jest } from "@jest/globals";
import { LibraryController } from "./library.controller.js";

const config = { webOrigin: "https://sense.test" } as never;
const actor = { accountId: "account-1", organizationId: "org-1", kind: "STAFF", sessionId: "session-1" };

describe("LibraryController", () => {
  const identity = { session: jest.fn(), ownerReady: jest.fn(), verifyCsrf: jest.fn() };
  const projects = { actor: jest.fn() };
  const library = { setup: jest.fn(), create: jest.fn(), createReference: jest.fn() };
  const controller = new LibraryController(identity as never, projects as never, library as never, config);

  beforeEach(() => { jest.clearAllMocks(); });

  it("rejects extra create fields before authentication or persistence", async () => {
    const request = { headers: {} } as never;
    await expect(controller.create(request, undefined, {
      commandId: "9d1277ac-3bf1-4327-a2ec-8f3dfbc59379", reason: "Initial draft", kind: "KNOWLEDGE", title: "Test",
      category: "Design standards", audience: "ORGANIZATION", content: { blocks: [{ type: "TEXT", text: "A safe draft" }] }, acknowledgementRequired: false,
      storageKey: "private/path",
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(identity.session).not.toHaveBeenCalled();
    expect(library.create).not.toHaveBeenCalled();
  });

  it("returns setup with no-store headers and a session-bound actor", async () => {
    identity.session.mockResolvedValue({ row: { id: actor.sessionId, accountId: actor.accountId } });
    projects.actor.mockResolvedValue({ ...actor, sessionId: undefined });
    library.setup.mockResolvedValue({ kinds: ["SOP", "KNOWLEDGE", "MODULE"] });
    const response = { setHeader: jest.fn() } as never;
    const result = await controller.setup({ headers: {} } as never, response);
    expect(response.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
    expect(library.setup).toHaveBeenCalledWith(expect.objectContaining({ accountId: actor.accountId, sessionId: actor.sessionId }));
    expect(result).toEqual({ kinds: ["SOP", "KNOWLEDGE", "MODULE"] });
  });
});
