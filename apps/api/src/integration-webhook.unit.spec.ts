import { BadRequestException } from "@nestjs/common";
import {
  canonicalWebsiteEnquiry,
  parseWebsiteEnquiry,
  verifyWebsiteSignature,
  websiteSignature,
  type WebsiteEnquiry,
} from "./integration-webhook.js";

const secret = "test-only-website-signing-secret";
const connectorId = "connector-123";
const timestamp = "1791206429";
const now = Number(timestamp) * 1000;
const enquiry: WebsiteEnquiry = {
  enquiryId: "external_01-A",
  title: "Kitchen renovation",
  contactName: "A Customer",
  email: "customer@example.test",
  phone: "+1 555 0100",
};

describe("S25 website enquiry signing", () => {
  it("normalizes accepted fields and serializes them in fixed canonical order", () => {
    const parsed = parseWebsiteEnquiry({ phone: " +1 555 0100 ", contactName: " A Customer ", email: " customer@example.test ", title: " Kitchen renovation ", enquiryId: "external_01-A" });
    expect(parsed).toEqual(enquiry);
    expect(canonicalWebsiteEnquiry(parsed)).toBe('{"enquiryId":"external_01-A","title":"Kitchen renovation","contactName":"A Customer","email":"customer@example.test","phone":"+1 555 0100"}');
  });

  it("signs the connector, timestamp, and canonical payload and verifies only a matching fresh signature", () => {
    const signature = websiteSignature(secret, connectorId, timestamp, enquiry);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyWebsiteSignature(secret, connectorId, timestamp, signature, enquiry, now)).toBe(true);
    expect(verifyWebsiteSignature(secret, "another-connector", timestamp, signature, enquiry, now)).toBe(false);
    expect(verifyWebsiteSignature(secret, connectorId, timestamp, signature, { ...enquiry, title: "Different payload" }, now)).toBe(false);
    expect(verifyWebsiteSignature("wrong-secret", connectorId, timestamp, signature, enquiry, now)).toBe(false);
  });

  it("rejects malformed or expired timestamp/signature inputs", () => {
    const signature = websiteSignature(secret, connectorId, timestamp, enquiry);
    for (const invalidTimestamp of ["179120642", "17912064290", "179120642a", "1791206729", "1791206128"]) {
      expect(verifyWebsiteSignature(secret, connectorId, invalidTimestamp, signature, enquiry, now)).toBe(false);
    }
    expect(verifyWebsiteSignature(secret, connectorId, timestamp, signature.toUpperCase(), enquiry, now)).toBe(false);
    expect(verifyWebsiteSignature(secret, connectorId, timestamp, signature.slice(1), enquiry, now)).toBe(false);
  });

  it("rejects unknown fields, invalid identifiers/contacts, and invalid optional values", () => {
    const invalid = [
      { ...enquiry, branchId: "tampered" },
      { ...enquiry, enquiryId: "has spaces" },
      { ...enquiry, enquiryId: "" },
      { ...enquiry, title: "  " },
      { ...enquiry, title: "x".repeat(161) },
      { ...enquiry, contactName: "x".repeat(161) },
      { ...enquiry, email: "not-an-email" },
      { ...enquiry, email: "x".repeat(245) + "@example.test" },
      { ...enquiry, phone: " " },
      { ...enquiry, phone: "x".repeat(81) },
      null,
      [],
    ];
    for (const input of invalid) expect(() => parseWebsiteEnquiry(input)).toThrow(BadRequestException);
  });

  it("rejects canonical UTF-8 payloads larger than 16 KiB", () => {
    expect(() => parseWebsiteEnquiry({ enquiryId: "large", title: "é".repeat(8200), contactName: "Customer" })).toThrow(BadRequestException);
  });
});
