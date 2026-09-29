import { BadRequestException } from "@nestjs/common";

const families: Record<string, string[]> = {
  pdf: ["application/pdf"], png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], gif: ["image/gif"], webp: ["image/webp"],
  dwg: ["application/acad", "image/vnd.dwg", "application/octet-stream"],
  skp: ["application/octet-stream"], rvt: ["application/octet-stream"],
  doc: ["application/msword", "application/octet-stream"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
  xls: ["application/vnd.ms-excel", "application/octet-stream"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/octet-stream"],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"], pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip", "application/octet-stream"],
  d5a: ["application/octet-stream"], lumion: ["application/octet-stream"], zip: ["application/zip", "application/octet-stream"],
  mp4: ["video/mp4"], mov: ["video/quicktime"], webm: ["video/webm"], mp3: ["audio/mpeg"], wav: ["audio/wav", "audio/x-wav"], m4a: ["audio/mp4"]
};

export const DOCUMENT_CHUNK_SIZE = 8 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 20 * 1024 * 1024 * 1024;

export function validateDocumentFile(name: string, mimeType: string, sizeBytes: number, maxBytes = DOCUMENT_MAX_BYTES): { fileName: string; mimeType: string; extension: string } {
  const fileName = name.trim();
  if (!fileName || fileName.length > 240 || fileName === "." || fileName === ".." || /[\\/]/.test(fileName) || [...fileName].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || fileName.endsWith(".") || fileName.endsWith(" ")) throw new BadRequestException("Invalid file name");
  const extension = fileName.split(".").at(-1)?.toLowerCase() ?? "";
  const allowed = families[extension];
  if (!allowed) throw new BadRequestException("Unsupported file type");
  const normalizedMime = mimeType.trim().toLowerCase() || "application/octet-stream";
  if (!allowed.includes(normalizedMime)) throw new BadRequestException("File type does not match its name");
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > maxBytes) throw new BadRequestException("File size is not allowed");
  return { fileName, mimeType: normalizedMime, extension };
}

export function validateFirstChunk(extension: string, bytes: Buffer): void {
  if (bytes.length < 4) throw new BadRequestException("File is too short");
  const signature = bytes.subarray(0, 12);
  if (signature.subarray(0, 2).toString("hex") === "4d5a" || signature.subarray(0, 4).toString("hex") === "7f454c46") throw new BadRequestException("Executable content is not allowed");
  const starts = (value: string) => signature.subarray(0, value.length).toString("hex") === Buffer.from(value).toString("hex");
  if (extension === "pdf" && !starts("%PDF-")) throw new BadRequestException("PDF content does not match its name");
  if (extension === "png" && signature.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new BadRequestException("PNG content does not match its name");
  if (["jpg", "jpeg"].includes(extension) && signature.subarray(0, 3).toString("hex") !== "ffd8ff") throw new BadRequestException("JPEG content does not match its name");
  if (extension === "gif" && !starts("GIF8")) throw new BadRequestException("GIF content does not match its name");
  if (extension === "webp" && !(starts("RIFF") && signature.subarray(8, 12).toString() === "WEBP")) throw new BadRequestException("WebP content does not match its name");
  if (["zip", "docx", "xlsx", "pptx"].includes(extension) && signature.subarray(0, 4).toString("hex") !== "504b0304") throw new BadRequestException("ZIP content does not match its name");
}
