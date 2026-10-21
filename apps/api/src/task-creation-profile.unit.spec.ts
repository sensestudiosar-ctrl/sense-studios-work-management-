import { describe, expect, it } from "@jest/globals";
import { resolveTaskCreationProfile } from "./task-creation-profile.js";

describe("task creation presentation profile", () => {
  it("uses canonical Owner account kind ahead of any assigned role hints", () => {
    expect(resolveTaskCreationProfile("OWNER", ["SITE", "LEADER"])).toEqual({ version: 1, variant: "OWNER", resolution: "ACCOUNT_KIND" });
  });

  it("uses one distinct configured presentation independent of role order", () => {
    expect(resolveTaskCreationProfile("STAFF", ["SITE"])).toEqual({ version: 1, variant: "SITE", resolution: "CONFIGURED_ROLE" });
    expect(resolveTaskCreationProfile("STAFF", ["LEADER", "LEADER"])).toEqual({ version: 1, variant: "LEADER", resolution: "CONFIGURED_ROLE" });
  });

  it("uses generic Employee presentation when no current role is classified", () => {
    expect(resolveTaskCreationProfile("STAFF")).toEqual({ version: 1, variant: "EMPLOYEE", resolution: "GENERIC_FALLBACK" });
    expect(resolveTaskCreationProfile("STAFF", [null, null])).toEqual({ version: 1, variant: "EMPLOYEE", resolution: "GENERIC_FALLBACK" });
  });

  it("falls back to generic Employee when current roles conflict or contain an invalid hint", () => {
    expect(resolveTaskCreationProfile("STAFF", ["SITE", "LEADER"])).toEqual({ version: 1, variant: "EMPLOYEE", resolution: "AMBIGUOUS" });
    expect(resolveTaskCreationProfile("STAFF", ["SITE", "UNRECOGNIZED"])).toEqual({ version: 1, variant: "EMPLOYEE", resolution: "AMBIGUOUS" });
  });
});
