import { BadRequestException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

export type WebsiteEnquiry = {
  enquiryId: string;
  title: string;
  contactName: string;
  email?: string;
  phone?: string;
};

const ID = /^[A-Za-z0-9_-]{1,120}$/;
const EMAIL = /^[^\s@<>(),;:\\"]+@[^\s@<>(),;:\\"]+\.[^\s@<>(),;:\\"]+$/;
const MAX_CANONICAL_BYTES = 16_384;

function requiredText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > max) return undefined;
  return normalized;
}

export function canonicalWebsiteEnquiry(input: WebsiteEnquiry): string {
  const ordered: WebsiteEnquiry = {
    enquiryId: input.enquiryId,
    title: input.title,
    contactName: input.contactName,
    ...(input.email === undefined ? {} : { email: input.email }),
    ...(input.phone === undefined ? {} : { phone: input.phone }),
  };
  return JSON.stringify(ordered);
}

export function parseWebsiteEnquiry(input: unknown): WebsiteEnquiry {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BadRequestException("Invalid website enquiry");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some((key) => !["enquiryId", "title", "contactName", "email", "phone"].includes(key))) {
    throw new BadRequestException("Invalid website enquiry");
  }
  if (typeof value.enquiryId !== "string" || !ID.test(value.enquiryId)) throw new BadRequestException("Invalid website enquiry");
  const title = requiredText(value.title, 160);
  const contactName = requiredText(value.contactName, 160);
  if (!title || !contactName) throw new BadRequestException("Invalid website enquiry");

  const result: WebsiteEnquiry = { enquiryId: value.enquiryId, title, contactName };
  if (value.email !== undefined) {
    const email = requiredText(value.email, 254);
    if (!email || !EMAIL.test(email)) throw new BadRequestException("Invalid website enquiry");
    result.email = email;
  }
  if (value.phone !== undefined) {
    const phone = requiredText(value.phone, 80);
    if (!phone) throw new BadRequestException("Invalid website enquiry");
    result.phone = phone;
  }
  if (Buffer.byteLength(canonicalWebsiteEnquiry(result), "utf8") > MAX_CANONICAL_BYTES) throw new BadRequestException("Invalid website enquiry");
  return result;
}

export function websiteSignature(secret: string, connectorId: string, timestamp: string, input: WebsiteEnquiry): string {
  const message = `sense-website-v1\n${connectorId}\n${timestamp}\n${canonicalWebsiteEnquiry(input)}`;
  return createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

export function verifyWebsiteSignature(
  secret: string,
  connectorId: string,
  timestamp: string,
  signature: string,
  input: WebsiteEnquiry,
  now = Date.now(),
): boolean {
  if (!/^\d{10}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature) || !Number.isFinite(now)) return false;
  const seconds = Number(timestamp);
  const currentSeconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(seconds) || Math.abs(currentSeconds - seconds) > 300) return false;
  const expected = websiteSignature(secret, connectorId, timestamp, input);
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}
