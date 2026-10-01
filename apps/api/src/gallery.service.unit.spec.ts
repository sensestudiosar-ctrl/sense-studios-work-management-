import sharp from "sharp";
import { GalleryService } from "./gallery.service.js";

describe("S15 sanitized public raster input", () => {
  const service = new GalleryService({} as never, {} as never, {} as never, {} as never, { nasRoot: undefined } as never);
  const encode = (service as unknown as { encodeImage(value: string): Promise<Buffer> }).encodeImage.bind(service);

  it("decodes, re-encodes to PNG and strips supplied image metadata", async () => {
    const input = await sharp({ create: { width: 9, height: 7, channels: 3, background: { r: 20, g: 80, b: 160 } } }).png().withMetadata({ density: 144 }).toBuffer();
    const sourceMeta = await sharp(input).metadata();
    expect(sourceMeta.density).toBe(144);
    const output = await encode(input.toString("base64"));
    const metadata = await sharp(output).metadata();
    expect(metadata).toMatchObject({ format: "png", width: 9, height: 7 });
    expect(metadata.pages ?? 1).toBe(1);
    expect(metadata.density).not.toBe(144);
    expect(metadata.exif).toBeUndefined();
    expect(metadata.icc).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
  });

  it("rejects malformed base64, SVG, truncated input and oversized encoded content", async () => {
    await expect(encode("data:image/png;base64,AAAA")).rejects.toMatchObject({ status: 400 });
    await expect(encode(Buffer.from("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>").toString("base64"))).rejects.toMatchObject({ status: 400 });
    await expect(encode(Buffer.from("\x89PNG\r\n\x1a\ntruncated").toString("base64"))).rejects.toMatchObject({ status: 400 });
    await expect(encode("A".repeat(11_185_001))).rejects.toMatchObject({ status: 400 });
  });
});

describe("S15 rechecks confidentiality before serving a published derivative", () => {
  async function expectHiddenWhenConfidential(sourceConfidential: boolean, ancestorConfidential: boolean) {
    const publication = { id: "33333333-3333-4333-8333-333333333333", organizationId: "11111111-1111-4111-8111-111111111111", projectId: "22222222-2222-4222-8222-222222222222", sourceFileId: "44444444-4444-4444-8444-444444444444", sourceBlobId: "55555555-5555-4555-8555-555555555555", storageKey: "66666666-6666-4666-8666-666666666666", sha256: "a".repeat(64), mime: "image/png", size: 12, state: "PUBLISHED", version: 2 };
    const tx = {
      $queryRaw: async () => [],
      portfolioPublication: { findFirst: async () => publication },
      publicationGrant: { findFirst: async () => ({ id: "77777777-7777-4777-8777-777777777777" }) },
      document: { findFirst: async () => ({ id: publication.sourceFileId, organizationId: publication.organizationId, projectId: publication.projectId, folderId: "88888888-8888-4888-8888-888888888888", confidential: sourceConfidential }) },
      documentFolder: { findFirst: async () => ({ id: "88888888-8888-4888-8888-888888888888", parentId: null, confidential: ancestorConfidential }) }
    };
    const database = { prisma: { $transaction: async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx) } };
    const isolated = new GalleryService(database as never, {} as never, {} as never, {} as never, { nasRoot: undefined } as never);
    await expect(isolated.publicDerivative(publication.id)).rejects.toMatchObject({ status: 404 });
  }

  it("hides an already-published derivative when the source becomes confidential", async () => {
    await expectHiddenWhenConfidential(true, false);
  });

  it("hides an already-published derivative when an ancestor is confidential", async () => {
    await expectHiddenWhenConfidential(false, true);
  });
});
