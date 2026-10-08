// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { normalizedPointAt, ReviewEvidence } from "./review-evidence.js";

const pdfMocks = vi.hoisted(() => {
  const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
  const getPage = vi.fn(async (pageNumber: number) => ({
    getViewport: ({ scale }: { scale: number }) => ({ width: 600 * scale, height: 800 * scale }),
    render,
    pageNumber,
  }));
  const destroy = vi.fn(async () => undefined);
  const document = { numPages: 2, getPage, destroy };
  const getDocument = vi.fn(() => ({ promise: Promise.resolve(document), destroy }));
  return { render, getPage, destroy, document, getDocument };
});
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: { workerSrc: "" }, AnnotationMode: { DISABLE: 0 }, getDocument: pdfMocks.getDocument }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.min.mjs" }));
import { AnnotationMode, getDocument } from "pdfjs-dist";

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => { vi.clearAllMocks(); pdfMocks.document.numPages = 2; });
function response(body: BodyInit = new Uint8Array([1, 2, 3]), status = 200, type = "application/pdf"): Response {
  return new Response(body, { status, headers: { "Content-Type": type } });
}
function props(overrides: Partial<React.ComponentProps<typeof ReviewEvidence>> = {}): React.ComponentProps<typeof ReviewEvidence> {
  return { fileId: "file-1", roundId: "round-1", revisionLabel: "R3", mimeType: "application/pdf", filename: "submitted.pdf", annotations: [], canAnnotate: true, onSelectPoint: vi.fn(), onEvidenceState: vi.fn(), ...overrides };
}
function contextStub(): void {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D);
}

describe("ReviewEvidence", () => {
  it("fetches only the protected exact file stream and renders a real-page-count PDF with scripting surfaces disabled", async () => {
    contextStub();
    const calls: Array<[string, RequestInit | undefined]> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => { calls.push([String(input), init]); return response(); }));
    const onEvidenceState = vi.fn();
    render(<ReviewEvidence {...props({ onEvidenceState })} />);
    await waitFor(() => expect(onEvidenceState).toHaveBeenCalledWith("ready"));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toBe("/api/v1/documents/files/file-1/stream");
    expect(calls[0]?.[1]).toMatchObject({ credentials: "include", cache: "no-store" });
    expect(screen.getByLabelText("Page 1 of 2")).toBeInTheDocument();
    expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ enableXfa: false, useSystemFonts: false, useWasm: false, useWorkerFetch: false, stopAtErrors: true }));
    expect(pdfMocks.render).toHaveBeenCalledWith(expect.objectContaining({ canvas: null, annotationMode: AnnotationMode.DISABLE }));
    expect(screen.getByRole("button", { name: "Use this point" })).toBeEnabled();
  });

  it("maps point clicks only inside the actual page rectangle and offers normalized keyboard entry", async () => {
    contextStub();
    vi.stubGlobal("fetch", vi.fn(async () => response()));
    const onSelectPoint = vi.fn();
    const { container } = render(<ReviewEvidence {...props({ onSelectPoint })} />);
    await screen.findByLabelText("Page 1 of 2");
    await waitFor(() => expect(screen.getByRole("button", { name: "Use this point" })).toBeEnabled());
    const canvas = container.querySelector("canvas")!;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, width: 600, height: 800, right: 610, bottom: 820, x: 10, y: 20, toJSON: () => ({}) } as DOMRect);
    fireEvent.click(canvas, { clientX: 160, clientY: 220 });
    expect(onSelectPoint).toHaveBeenLastCalledWith({ page: 1, x: .25, y: .25 });
    fireEvent.click(canvas, { clientX: 9, clientY: 220 });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("X"), { target: { value: "0.125" } });
    fireEvent.change(screen.getByLabelText("Y"), { target: { value: "0.75" } });
    fireEvent.click(screen.getByRole("button", { name: "Use this point" }));
    expect(onSelectPoint).toHaveBeenLastCalledWith({ page: 1, x: .125, y: .75 });
    expect(normalizedPointAt(610, 820, { left: 10, top: 20, width: 600, height: 800 })).toEqual({ x: 1, y: 1 });
    expect(normalizedPointAt(611, 820, { left: 10, top: 20, width: 600, height: 800 })).toBeUndefined();
  });

  it("keeps page navigation within PDF bounds and labels historical points by page", async () => {
    contextStub();
    vi.stubGlobal("fetch", vi.fn(async () => response()));
    render(<ReviewEvidence {...props({ annotations: [{ id: "note-1", page: 2, x: .4, y: .6, text: "Check this dimension" }] })} />);
    await screen.findByLabelText("Page 1 of 2");
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByLabelText("Page 2 of 2")).toBeInTheDocument();
    expect(await screen.findByText("Check this dimension")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("shows the optional point composer only after ready and clamps it to the visible page viewer", async () => {
    contextStub();
    vi.stubGlobal("fetch", vi.fn(async () => response()));
    const selectedPoint = { page: 1, x: .99, y: .99 };
    const { container } = render(<ReviewEvidence {...props({ selectedPoint, pointEditor: <button type="button">Comment on this point</button> })} />);
    const composer = await screen.findByRole("button", { name: "Comment on this point" });
    const viewport = container.querySelector(".review-evidence-viewport") as HTMLDivElement;
    const pageFrame = container.querySelector(".review-evidence-page") as HTMLDivElement;
    const editor = composer.parentElement as HTMLDivElement;
    Object.defineProperty(viewport, "clientWidth", { configurable: true, value: 200 });
    Object.defineProperty(viewport, "clientHeight", { configurable: true, value: 200 });
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 } as DOMRect);
    vi.spyOn(pageFrame, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 640, height: 853, right: 640, bottom: 853 } as DOMRect);
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, width: 100, height: 80, right: 100, bottom: 80 } as DOMRect);
    fireEvent.scroll(viewport);
    await waitFor(() => expect(editor.style.left).toBe("92px"));
    expect(editor.style.top).toBe("112px");
    expect(editor.style.maxWidth).toBe("184px");
  });

  it("aborts stale file requests, clears denied evidence, and treats SVG as unsupported without fetching it", async () => {
    contextStub();
    let resolveOld!: (value: Response) => void;
    const staleResponse = new Promise<Response>((resolve) => { resolveOld = resolve; });
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/file-old/stream")) return staleResponse;
      if (url.endsWith("/file-new/stream")) return Promise.resolve(response());
      if (url.endsWith("/file-denied/stream")) return Promise.resolve(response("", 401));
      return Promise.resolve(response());
    });
    vi.stubGlobal("fetch", fetchMock);
    const { rerender, container } = render(<ReviewEvidence {...props({ fileId: "file-old" })} />);
    rerender(<ReviewEvidence {...props({ fileId: "file-new" })} />);
    await screen.findByLabelText("Page 1 of 2");
    resolveOld(response());
    await waitFor(() => expect(pdfMocks.getDocument).toHaveBeenCalledTimes(1));
    rerender(<ReviewEvidence {...props({ fileId: "file-denied" })} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Access to this submitted evidence is unavailable");
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download source" })).not.toBeInTheDocument();
    const before = fetchMock.mock.calls.length;
    rerender(<ReviewEvidence {...props({ fileId: "file-svg", mimeType: "image/svg+xml", filename: "active.svg" })} />);
    expect(await screen.findByText(/no safe in-page preview/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(before);
    expect(pdfMocks.destroy).toHaveBeenCalled();
  });
});
