import { ForbiddenException } from "@nestjs/common";
import { jest } from "@jest/globals";
import type { DatabaseService } from "./database.service.js";
import { AccountKind } from "./generated/prisma/client.js";
import { ProjectService } from "./project.service.js";

describe("client portal identity isolation", () => {
  it("cannot construct an internal project actor from a CLIENT identity", async () => {
    const prisma = {
      account: { findUnique: jest.fn().mockResolvedValue({ kind: AccountKind.CLIENT, employee: null }) },
      organization: { findFirst: jest.fn().mockResolvedValue({ id: "internal-organization" }) }
    };
    const service = new ProjectService({ prisma } as unknown as DatabaseService);
    await expect(service.actor("client-account")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
