import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./review-evidence.css";

const DOCUMENTS_API = "/api/v1/documents";
export type EvidenceAnnotation = { id?: string; page: number; x: number; y: number; text: string };
export type EvidenceState = "loading" | "ready" | "unsupported" | "error" | "denied";
export type EvidencePoint = { page: number; x: number; y: number };
type Props = {
  fileId: string;
  roundId: string;
  revisionLabel: string;
  mimeType: string;
  filename: string;
  annotations: EvidenceAnnotation[];
  canAnnotate: boolean;
  onSelectPoint: (point: EvidencePoint) => void;
  onEvidenceState: (state: EvidenceState) => void;
  selectedAnnotation?: EvidenceAnnotation;
  selectedPoint?: EvidencePoint;
  pointEditor?: ReactNode;
};
type LoadedEvidence = { kind: "pdf"; document: pdfjs.PDFDocumentProxy } | { kind: "image"; url: string; width: number; height: number };

export function normalizedPointAt(clientX: number, clientY: number, rect: Pick<DOMRect, "left" | "top" | "width" | "height">): { x: number; y: number } | undefined {
  if (rect.width <= 0 || rect.height <= 0 || clientX < rect.left || clientY < rect.top || clientX > rect.left + rect.width || clientY > rect.top + rect.height) return undefined;
  return { x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) };
}

function mimeTypeOf(type: string): string { return type.toLowerCase().split(";")[0]?.trim() ?? ""; }
function supportedRaster(type: string): boolean { return ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mimeTypeOf(type)); }
function selected(a: EvidenceAnnotation, b?: EvidenceAnnotation): boolean { return !!b && (a.id && b.id ? a.id === b.id : a.page === b.page && a.x === b.x && a.y === b.y && a.text === b.text); }

export function ReviewEvidence({ fileId, roundId, revisionLabel, mimeType, filename, annotations, canAnnotate, onSelectPoint, onEvidenceState, selectedAnnotation, selectedPoint, pointEditor }: Props): React.JSX.Element {
  const [evidence, setEvidence] = useState<LoadedEvidence>();
  const [viewerStatus, setViewerStatus] = useState<EvidenceState>("loading");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>();
  const [keyboardPage, setKeyboardPage] = useState("1");
  const [keyboardX, setKeyboardX] = useState("0.5");
  const [keyboardY, setKeyboardY] = useState("0.5");
  const [keyboardError, setKeyboardError] = useState("");
  const [editorPosition, setEditorPosition] = useState<{ left: number; top: number; maxWidth: number; maxHeight: number }>();
  const [scrollRevision, setScrollRevision] = useState(0);
  const generation = useRef(0);
  const bytesRef = useRef<Uint8Array | undefined>(undefined);
  const taskRef = useRef<pdfjs.PDFDocumentLoadingTask | undefined>(undefined);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const renderTaskRef = useRef<pdfjs.RenderTask | undefined>(undefined);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageFrameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointEditorRef = useRef<HTMLDivElement>(null);
  const stateCallback = useRef(onEvidenceState);
  const pointCallback = useRef(onSelectPoint);
  stateCallback.current = onEvidenceState;
  pointCallback.current = onSelectPoint;

  const clearResources = useCallback(() => {
    renderTaskRef.current?.cancel(); renderTaskRef.current = undefined;
    const task = taskRef.current; taskRef.current = undefined;
    if (task) void task.destroy();
    try { bytesRef.current?.fill(0); } catch { /* PDF.js may have transferred the byte buffer to its worker. */ }
    bytesRef.current = undefined;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = undefined;
    if (canvasRef.current) { canvasRef.current.width = 0; canvasRef.current.height = 0; }
    if (imageRef.current) imageRef.current.removeAttribute("src");
    if (canvasRef.current) { canvasRef.current.removeAttribute("aria-label"); }
  }, []);

  useLayoutEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    clearResources();
    setEvidence(undefined); setViewportSize(undefined); setPage(1); setZoom(1); setKeyboardPage("1"); setViewerStatus("loading");
    stateCallback.current("loading");
    const type = mimeTypeOf(mimeType);
    if (type !== "application/pdf" && !supportedRaster(type)) {
      setViewerStatus("unsupported");
      stateCallback.current("unsupported");
      return () => { controller.abort(); if (generation.current === current) generation.current += 1; clearResources(); };
    }
    void (async () => {
      try {
        const response = await fetch(`${DOCUMENTS_API}/files/${encodeURIComponent(fileId)}/stream`, { credentials: "include", cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          if (current !== generation.current) return;
          setEvidence(undefined); setViewportSize(undefined);
          const nextStatus = response.status === 401 || response.status === 403 || response.status === 404 ? "denied" : "error";
          setViewerStatus(nextStatus); stateCallback.current(nextStatus);
          return;
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (current !== generation.current) { bytes.fill(0); return; }
        bytesRef.current = bytes;
        if (type === "application/pdf") {
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
          const task = pdfjs.getDocument({ data: bytes, useSystemFonts: false, enableXfa: false, useWasm: false, useWorkerFetch: false, stopAtErrors: true });
          taskRef.current = task;
          const document = await task.promise;
          if (current !== generation.current) return;
          setPage((value) => Math.min(Math.max(1, value), document.numPages));
          setKeyboardPage((value) => String(Math.min(Math.max(1, Number(value) || 1), document.numPages)));
          setEvidence({ kind: "pdf", document });
        } else {
          const blob = new Blob([bytes], { type });
          const url = URL.createObjectURL(blob);
          bytes.fill(0); bytesRef.current = undefined;
          if (current !== generation.current) { URL.revokeObjectURL(url); return; }
          objectUrlRef.current = url;
          setEvidence({ kind: "image", url, width: 0, height: 0 });
        }
      } catch (cause) {
        if (current !== generation.current || (cause instanceof Error && cause.name === "AbortError")) return;
        clearResources(); setEvidence(undefined); setViewportSize(undefined);
        const status = cause instanceof Error ? (cause as Error & { status?: number }).status : undefined;
        const nextStatus = status === 401 || status === 403 || status === 404 ? "denied" : "error";
        setViewerStatus(nextStatus); stateCallback.current(nextStatus);
      }
    })();
    return () => { controller.abort(); if (generation.current === current) generation.current += 1; clearResources(); };
  }, [fileId, roundId, revisionLabel, mimeType, filename, clearResources]);

  const pageCount = evidence?.kind === "pdf" ? evidence.document.numPages : evidence?.kind === "image" && evidence.width > 0 && evidence.height > 0 ? 1 : 0;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setAvailableWidth(viewport.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") { window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }
    const observer = new ResizeObserver(measure); observer.observe(viewport);
    return () => observer.disconnect();
  }, [evidence?.kind]);

  useLayoutEffect(() => {
    if (evidence?.kind !== "pdf") return;
    let live = true;
    let renderTask: pdfjs.RenderTask | undefined;
    const canvas = canvasRef.current;
    const host = pageFrameRef.current;
    if (!canvas || !host) return;
    canvas.width = 0; canvas.height = 0;
    setViewportSize(undefined);
    setViewerStatus("loading"); stateCallback.current("loading");
    void evidence.document.getPage(page).then((pdfPage) => {
      if (!live) return;
      const unitViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = Math.max(.1, Math.min(4, (availableWidth || 640) / unitViewport.width * zoom));
      const viewport = pdfPage.getViewport({ scale: fitScale });
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.ceil(viewport.width * ratio); canvas.height = Math.ceil(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      host.style.width = `${viewport.width}px`; host.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      renderTask = pdfPage.render({ canvas: null, canvasContext: context, viewport, annotationMode: pdfjs.AnnotationMode.DISABLE });
      renderTaskRef.current = renderTask;
      return renderTask.promise.then(() => {
        if (!live) return;
        setViewportSize({ width: viewport.width, height: viewport.height }); setViewerStatus("ready"); stateCallback.current("ready");
      });
    }).catch((cause: unknown) => {
      if (!live || (cause instanceof Error && cause.name === "RenderingCancelledException")) return;
      clearResources(); setViewportSize(undefined); setEvidence(undefined); setViewerStatus("error"); stateCallback.current("error");
    });
    return () => { live = false; renderTask?.cancel(); if (renderTaskRef.current === renderTask) renderTaskRef.current = undefined; };
  }, [evidence, page, zoom, availableWidth, clearResources]);

  useEffect(() => {
    const annotation = selectedAnnotation;
    if (!annotation || !Number.isInteger(annotation.page) || annotation.page < 1 || pageCount > 0 && annotation.page > pageCount) return;
    setPage(annotation.page); setKeyboardPage(String(annotation.page));
  }, [selectedAnnotation?.id, selectedAnnotation?.page, pageCount]);

  useLayoutEffect(() => {
    const editor = pointEditorRef.current;
    const frame = pageFrameRef.current;
    const viewer = viewportRef.current;
    if (!pointEditor || !canAnnotate || viewerStatus !== "ready" || !selectedPoint || selectedPoint.page !== page || !viewportSize || !editor || !frame || !viewer) { setEditorPosition(undefined); return; }
    const frameRect = frame.getBoundingClientRect();
    const editorRect = editor.getBoundingClientRect();
    const viewerRect = viewer.getBoundingClientRect();
    const width = frameRect.width || viewportSize.width;
    const height = frameRect.height || viewportSize.height;
    const maxWidth = Math.max(0, Math.min(300, viewer.clientWidth - 16));
    const maxHeight = Math.max(0, viewer.clientHeight - 16);
    const desiredLeft = frameRect.left + selectedPoint.x * width - editorRect.width / 2;
    const desiredTop = frameRect.top + selectedPoint.y * height + 10;
    const visibleLeft = viewerRect.left + 8;
    const visibleRight = viewerRect.left + viewer.clientWidth - 8;
    const visibleTop = viewerRect.top + 8;
    const visibleBottom = viewerRect.top + viewer.clientHeight - 8;
    const clampedLeft = Math.max(visibleLeft, Math.min(desiredLeft, visibleRight - Math.min(editorRect.width, maxWidth)));
    const clampedTop = Math.max(visibleTop, Math.min(desiredTop, visibleBottom - Math.min(editorRect.height, maxHeight)));
    setEditorPosition({ left: clampedLeft - frameRect.left, top: clampedTop - frameRect.top, maxWidth, maxHeight });
  }, [pointEditor, canAnnotate, viewerStatus, selectedPoint?.page, selectedPoint?.x, selectedPoint?.y, page, viewportSize, availableWidth, zoom, scrollRevision]);

  useLayoutEffect(() => {
    if (evidence?.kind !== "image" || !imageRef.current?.naturalWidth || !imageRef.current.naturalHeight) return;
    const image = imageRef.current;
    const width = Math.min(image.naturalWidth, availableWidth || image.naturalWidth);
    setViewportSize((current) => current?.width === width && current.height === image.naturalHeight * width / image.naturalWidth ? current : { width, height: image.naturalHeight * width / image.naturalWidth });
  }, [evidence, availableWidth]);

  const canCapture = canAnnotate && pageCount > 0 && !!viewportSize;
  const captureAt = (event: React.MouseEvent<HTMLCanvasElement | HTMLImageElement>) => {
    if (!canCapture || !viewportSize) return;
    const point = normalizedPointAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    if (point) pointCallback.current({ page, ...point });
  };
  const captureKeyboard = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedPage = Number(keyboardPage); const x = Number(keyboardX); const y = Number(keyboardY);
    if (!canCapture || !Number.isInteger(selectedPage) || selectedPage < 1 || selectedPage > pageCount || !Number.isFinite(x) || x < 0 || x > 1 || !Number.isFinite(y) || y < 0 || y > 1) {
      setKeyboardError("Enter a page within the evidence and X and Y values from 0 to 1."); return;
    }
    setPage(selectedPage); setKeyboardError(""); pointCallback.current({ page: selectedPage, x, y });
  };
  const pageAnnotations = annotations.filter((annotation) => annotation.page === page && Number.isFinite(annotation.x) && Number.isFinite(annotation.y) && annotation.x >= 0 && annotation.x <= 1 && annotation.y >= 0 && annotation.y <= 1);
  const fileUrl = `${DOCUMENTS_API}/files/${encodeURIComponent(fileId)}/stream`;

  return <section className="review-evidence" aria-label={`Submitted evidence ${revisionLabel}, round ${roundId}`}>
    <header className="review-evidence-heading"><div><p className="review-evidence-eyebrow">SUBMITTED EVIDENCE</p><h3>{filename}</h3><p>Revision {revisionLabel} · Review round {roundId}</p></div>{viewerStatus !== "denied" && <a href={fileUrl} download={filename}>Download source</a>}</header>
    <div className="review-evidence-tools">
      {evidence?.kind === "pdf" && <><label>Page<input aria-label="Evidence page" type="number" min="1" max={evidence.document.numPages} step="1" value={page} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= evidence.document.numPages) { setPage(next); setKeyboardPage(String(next)); } }} /></label><span>of {evidence.document.numPages}</span><button type="button" onClick={() => setZoom((value) => Math.max(.5, Math.round((value - .25) * 100) / 100))} disabled={zoom <= .5} aria-label="Zoom out">−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(3, Math.round((value + .25) * 100) / 100))} disabled={zoom >= 3} aria-label="Zoom in">+</button><button type="button" onClick={() => setZoom(1)}>Fit width</button></>}
      {evidence?.kind === "image" && evidence.width > 0 && <span>Image · {evidence.width} × {evidence.height}</span>}
    </div>
    <div className="review-evidence-viewport" ref={viewportRef} onScroll={() => setScrollRevision((value) => value + 1)}>
      {evidence?.kind === "pdf" && <div ref={pageFrameRef} className={`review-evidence-page${canCapture ? " can-annotate" : ""}`} style={viewportSize ? { width: viewportSize.width, height: viewportSize.height } : undefined}>
        <canvas ref={canvasRef} aria-label={`Page ${page} of ${pageCount}`} onClick={captureAt} />
        {viewportSize && <div className="review-evidence-pins" aria-hidden="true">{pageAnnotations.map((annotation, index) => <span key={annotation.id ?? `${annotation.page}-${annotation.x}-${annotation.y}-${index}`} className={`review-evidence-pin${selected(annotation, selectedAnnotation) ? " is-selected" : ""}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }} title={`Page ${annotation.page}: ${annotation.text}`} />)}</div>}
        {selectedPoint?.page === page && viewportSize && <span className="review-evidence-pin is-selected" aria-hidden="true" style={{ position: "absolute", left: `${selectedPoint.x * 100}%`, top: `${selectedPoint.y * 100}%` }} />}
        {pointEditor && canAnnotate && viewerStatus === "ready" && selectedPoint?.page === page && viewportSize && <div ref={pointEditorRef} className="review-evidence-point-editor" style={editorPosition ? { left: editorPosition.left, top: editorPosition.top, maxWidth: editorPosition.maxWidth, maxHeight: editorPosition.maxHeight } : { left: 0, top: 0 }}>{pointEditor}</div>}
      </div>}
      {evidence?.kind === "image" && <div ref={pageFrameRef} className={`review-evidence-page${canCapture ? " can-annotate" : ""}`} style={{ width: evidence.width ? Math.min(evidence.width, availableWidth || evidence.width) : "auto" }}>
        <img ref={imageRef} src={evidence.url} alt={`${filename}, submitted as revision ${revisionLabel}`} onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth > 0 && image.naturalHeight > 0) { setEvidence((current) => current?.kind === "image" ? { ...current, width: image.naturalWidth, height: image.naturalHeight } : current); setViewportSize({ width: image.clientWidth, height: image.clientHeight }); setViewerStatus("ready"); stateCallback.current("ready"); } }} onError={() => { setEvidence(undefined); setViewportSize(undefined); setViewerStatus("error"); stateCallback.current("error"); }} onClick={captureAt} />
        {viewportSize && <div className="review-evidence-pins" aria-hidden="true">{pageAnnotations.map((annotation, index) => <span key={annotation.id ?? `${annotation.page}-${annotation.x}-${annotation.y}-${index}`} className={`review-evidence-pin${selected(annotation, selectedAnnotation) ? " is-selected" : ""}`} style={{ left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }} title={`Page ${annotation.page}: ${annotation.text}`} />)}</div>}
        {selectedPoint?.page === page && viewportSize && <span className="review-evidence-pin is-selected" aria-hidden="true" style={{ position: "absolute", left: `${selectedPoint.x * 100}%`, top: `${selectedPoint.y * 100}%` }} />}
        {pointEditor && canAnnotate && viewerStatus === "ready" && selectedPoint?.page === page && viewportSize && <div ref={pointEditorRef} className="review-evidence-point-editor" style={editorPosition ? { left: editorPosition.left, top: editorPosition.top, maxWidth: editorPosition.maxWidth, maxHeight: editorPosition.maxHeight } : { left: 0, top: 0 }}>{pointEditor}</div>}
      </div>}
      {viewerStatus === "loading" && <p className="review-evidence-status" role="status">Loading protected evidence…</p>}
      {viewerStatus === "unsupported" && <div className="review-evidence-fallback" role="status"><p>This file type has no safe in-page preview. You can download the submitted source or leave general feedback on this review round.</p><a href={fileUrl} download={filename}>Download submitted source</a></div>}
      {viewerStatus === "denied" && <p className="review-evidence-denied" role="alert">Access to this submitted evidence is unavailable. Evidence annotations are disabled.</p>}
      {viewerStatus === "error" && <div className="review-evidence-fallback" role="alert"><p>The submitted evidence could not be loaded. You can leave general feedback on this review round.</p></div>}
    </div>
    {evidence?.kind === "pdf" && <div className="review-evidence-page-list" aria-label="PDF page navigation"><button type="button" onClick={() => { setPage((value) => Math.max(1, value - 1)); setKeyboardPage((value) => String(Math.max(1, Number(value) - 1))); }} disabled={page <= 1}>Previous page</button><span>Page {page} of {pageCount}</span><button type="button" onClick={() => { setPage((value) => Math.min(pageCount, value + 1)); setKeyboardPage((value) => String(Math.min(pageCount, Number(value) + 1))); }} disabled={page >= pageCount}>Next page</button></div>}
    {canAnnotate && <form className="review-evidence-keyboard" onSubmit={captureKeyboard}><fieldset disabled={!canCapture}><legend>Add a point annotation</legend><label>Page<input type="number" min="1" max={pageCount || undefined} step="1" value={keyboardPage} onChange={(event) => setKeyboardPage(event.target.value)} /></label><label>X<input type="number" min="0" max="1" step="0.001" value={keyboardX} onChange={(event) => setKeyboardX(event.target.value)} /></label><label>Y<input type="number" min="0" max="1" step="0.001" value={keyboardY} onChange={(event) => setKeyboardY(event.target.value)} /></label><button type="submit">Use this point</button></fieldset>{keyboardError && <p role="alert">{keyboardError}</p>}<p>Coordinates use the page image from 0 to 1. Points are captured only after page dimensions are available.</p></form>}
    <ol className="review-evidence-annotations" aria-label="Existing evidence annotations">{annotations.map((annotation, index) => <li key={annotation.id ?? `${annotation.page}-${index}`}><button type="button" onClick={() => { if (annotation.page >= 1 && annotation.page <= pageCount) { setPage(annotation.page); setKeyboardPage(String(annotation.page)); } }} disabled={evidence?.kind === "pdf" && annotation.page > pageCount}><span>Page {annotation.page} · {annotation.x.toFixed(3)}, {annotation.y.toFixed(3)}</span><strong>{annotation.text}</strong></button></li>)}</ol>
  </section>;
}
