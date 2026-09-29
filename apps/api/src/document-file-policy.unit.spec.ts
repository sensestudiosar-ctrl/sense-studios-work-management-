import { validateDocumentFile, validateFirstChunk } from "./document-file-policy.js";

describe("S11 file validation", () => {
  it("accepts approved working file families within the configured limit", () => {
    expect(validateDocumentFile("drawing.dwg", "", 1024, 1024)).toMatchObject({ extension: "dwg", mimeType: "application/octet-stream" });
    expect(validateDocumentFile("model.rvt", "application/octet-stream", 1024, 1024).extension).toBe("rvt");
    expect(validateDocumentFile("report.pdf", "application/pdf", 1024, 1024).extension).toBe("pdf");
  });
  it("rejects traversal, unsupported/executable names, type mismatch and size over policy", () => {
    expect(() => validateDocumentFile("../drawing.pdf", "application/pdf", 100)).toThrow();
    expect(() => validateDocumentFile("setup.exe", "application/octet-stream", 100)).toThrow();
    expect(() => validateDocumentFile("drawing.pdf", "image/png", 100)).toThrow();
    expect(() => validateDocumentFile("drawing.pdf", "application/pdf", 101, 100)).toThrow();
    expect(() => validateFirstChunk("pdf", Buffer.from("MZ executable"))).toThrow();
    expect(() => validateFirstChunk("pdf", Buffer.from("not pdf content"))).toThrow();
  });
});
