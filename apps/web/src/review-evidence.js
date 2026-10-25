import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./review-evidence.css";
const DOCUMENTS_API = "/api/v1/documents";
export function normalizedPointAt(clientX, clientY, rect) {
    if (rect.width <= 0 || rect.height <= 0 || clientX < rect.left || clientY < rect.top || clientX > rect.left + rect.width || clientY > rect.top + rect.height)
        return undefined;
    return { x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) };
}
function mimeTypeOf(type) { return type.toLowerCase().split(";")[0]?.trim() ?? ""; }
function supportedRaster(type) { return ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(mimeTypeOf(type)); }
function selected(a, b) { return !!b && (a.id && b.id ? a.id === b.id : a.page === b.page && a.x === b.x && a.y === b.y && a.text === b.text); }
export function ReviewEvidence({ fileId, roundId, revisionLabel, mimeType, filename, annotations, canAnnotate, onSelectPoint, onEvidenceState, selectedAnnotation, selectedPoint, pointEditor }) {
    const [evidence, setEvidence] = useState();
    const [viewerStatus, setViewerStatus] = useState("loading");
    const [page, setPage] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [availableWidth, setAvailableWidth] = useState(0);
    const [viewportSize, setViewportSize] = useState();
    const [keyboardPage, setKeyboardPage] = useState("1");
    const [keyboardX, setKeyboardX] = useState("0.5");
    const [keyboardY, setKeyboardY] = useState("0.5");
    const [keyboardError, setKeyboardError] = useState("");
    const [editorPosition, setEditorPosition] = useState();
    const [scrollRevision, setScrollRevision] = useState(0);
    const generation = useRef(0);
    const bytesRef = useRef(undefined);
    const taskRef = useRef(undefined);
    const objectUrlRef = useRef(undefined);
    const renderTaskRef = useRef(undefined);
    const viewportRef = useRef(null);
    const pageFrameRef = useRef(null);
    const canvasRef = useRef(null);
    const imageRef = useRef(null);
    const pointEditorRef = useRef(null);
    const stateCallback = useRef(onEvidenceState);
    const pointCallback = useRef(onSelectPoint);
    stateCallback.current = onEvidenceState;
    pointCallback.current = onSelectPoint;
    const clearResources = useCallback(() => {
        renderTaskRef.current?.cancel();
        renderTaskRef.current = undefined;
        const task = taskRef.current;
        taskRef.current = undefined;
        if (task)
            void task.destroy();
        try {
            bytesRef.current?.fill(0);
        }
        catch { /* PDF.js may have transferred the byte buffer to its worker. */ }
        bytesRef.current = undefined;
        if (objectUrlRef.current)
            URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = undefined;
        if (canvasRef.current) {
            canvasRef.current.width = 0;
            canvasRef.current.height = 0;
        }
        if (imageRef.current)
            imageRef.current.removeAttribute("src");
        if (canvasRef.current) {
            canvasRef.current.removeAttribute("aria-label");
        }
    }, []);
    useLayoutEffect(() => {
        const current = ++generation.current;
        const controller = new AbortController();
        clearResources();
        setEvidence(undefined);
        setViewportSize(undefined);
        setPage(1);
        setZoom(1);
        setKeyboardPage("1");
        setViewerStatus("loading");
        stateCallback.current("loading");
        const type = mimeTypeOf(mimeType);
        if (type !== "application/pdf" && !supportedRaster(type)) {
            setViewerStatus("unsupported");
            stateCallback.current("unsupported");
            return () => { controller.abort(); if (generation.current === current)
                generation.current += 1; clearResources(); };
        }
        void (async () => {
            try {
                const response = await fetch(`${DOCUMENTS_API}/files/${encodeURIComponent(fileId)}/stream`, { credentials: "include", cache: "no-store", signal: controller.signal });
                if (!response.ok) {
                    if (current !== generation.current)
                        return;
                    setEvidence(undefined);
                    setViewportSize(undefined);
                    const nextStatus = response.status === 401 || response.status === 403 || response.status === 404 ? "denied" : "error";
                    setViewerStatus(nextStatus);
                    stateCallback.current(nextStatus);
                    return;
                }
                const bytes = new Uint8Array(await response.arrayBuffer());
                if (current !== generation.current) {
                    bytes.fill(0);
                    return;
                }
                bytesRef.current = bytes;
                if (type === "application/pdf") {
                    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
                    const task = pdfjs.getDocument({ data: bytes, useSystemFonts: false, enableXfa: false, useWasm: false, useWorkerFetch: false, stopAtErrors: true });
                    taskRef.current = task;
                    const document = await task.promise;
                    if (current !== generation.current)
                        return;
                    setPage((value) => Math.min(Math.max(1, value), document.numPages));
                    setKeyboardPage((value) => String(Math.min(Math.max(1, Number(value) || 1), document.numPages)));
                    setEvidence({ kind: "pdf", document });
                }
                else {
                    const blob = new Blob([bytes], { type });
                    const url = URL.createObjectURL(blob);
                    bytes.fill(0);
                    bytesRef.current = undefined;
                    if (current !== generation.current) {
                        URL.revokeObjectURL(url);
                        return;
                    }
                    objectUrlRef.current = url;
                    setEvidence({ kind: "image", url, width: 0, height: 0 });
                }
            }
            catch (cause) {
                if (current !== generation.current || (cause instanceof Error && cause.name === "AbortError"))
                    return;
                clearResources();
                setEvidence(undefined);
                setViewportSize(undefined);
                const status = cause instanceof Error ? cause.status : undefined;
                const nextStatus = status === 401 || status === 403 || status === 404 ? "denied" : "error";
                setViewerStatus(nextStatus);
                stateCallback.current(nextStatus);
            }
        })();
        return () => { controller.abort(); if (generation.current === current)
            generation.current += 1; clearResources(); };
    }, [fileId, roundId, revisionLabel, mimeType, filename, clearResources]);
    const pageCount = evidence?.kind === "pdf" ? evidence.document.numPages : evidence?.kind === "image" && evidence.width > 0 && evidence.height > 0 ? 1 : 0;
    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport)
            return;
        const measure = () => setAvailableWidth(viewport.clientWidth);
        measure();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", measure);
            return () => window.removeEventListener("resize", measure);
        }
        const observer = new ResizeObserver(measure);
        observer.observe(viewport);
        return () => observer.disconnect();
    }, [evidence?.kind]);
    useLayoutEffect(() => {
        if (evidence?.kind !== "pdf")
            return;
        let live = true;
        let renderTask;
        const canvas = canvasRef.current;
        const host = pageFrameRef.current;
        if (!canvas || !host)
            return;
        canvas.width = 0;
        canvas.height = 0;
        setViewportSize(undefined);
        setViewerStatus("loading");
        stateCallback.current("loading");
        void evidence.document.getPage(page).then((pdfPage) => {
            if (!live)
                return;
            const unitViewport = pdfPage.getViewport({ scale: 1 });
            const fitScale = Math.max(.1, Math.min(4, (availableWidth || 640) / unitViewport.width * zoom));
            const viewport = pdfPage.getViewport({ scale: fitScale });
            const ratio = Math.min(2, window.devicePixelRatio || 1);
            canvas.width = Math.ceil(viewport.width * ratio);
            canvas.height = Math.ceil(viewport.height * ratio);
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            host.style.width = `${viewport.width}px`;
            host.style.height = `${viewport.height}px`;
            const context = canvas.getContext("2d");
            if (!context)
                throw new Error("canvas-unavailable");
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            renderTask = pdfPage.render({ canvas: null, canvasContext: context, viewport, annotationMode: pdfjs.AnnotationMode.DISABLE });
            renderTaskRef.current = renderTask;
            return renderTask.promise.then(() => {
                if (!live)
                    return;
                setViewportSize({ width: viewport.width, height: viewport.height });
                setViewerStatus("ready");
                stateCallback.current("ready");
            });
        }).catch((cause) => {
            if (!live || (cause instanceof Error && cause.name === "RenderingCancelledException"))
                return;
            clearResources();
            setViewportSize(undefined);
            setEvidence(undefined);
            setViewerStatus("error");
            stateCallback.current("error");
        });
        return () => { live = false; renderTask?.cancel(); if (renderTaskRef.current === renderTask)
            renderTaskRef.current = undefined; };
    }, [evidence, page, zoom, availableWidth, clearResources]);
    useEffect(() => {
        const annotation = selectedAnnotation;
        if (!annotation || !Number.isInteger(annotation.page) || annotation.page < 1 || pageCount > 0 && annotation.page > pageCount)
            return;
        setPage(annotation.page);
        setKeyboardPage(String(annotation.page));
    }, [selectedAnnotation?.id, selectedAnnotation?.page, pageCount]);
    useLayoutEffect(() => {
        const editor = pointEditorRef.current;
        const frame = pageFrameRef.current;
        const viewer = viewportRef.current;
        if (!pointEditor || !canAnnotate || viewerStatus !== "ready" || !selectedPoint || selectedPoint.page !== page || !viewportSize || !editor || !frame || !viewer) {
            setEditorPosition(undefined);
            return;
        }
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
        if (evidence?.kind !== "image" || !imageRef.current?.naturalWidth || !imageRef.current.naturalHeight)
            return;
        const image = imageRef.current;
        const width = Math.min(image.naturalWidth, availableWidth || image.naturalWidth);
        setViewportSize((current) => current?.width === width && current.height === image.naturalHeight * width / image.naturalWidth ? current : { width, height: image.naturalHeight * width / image.naturalWidth });
    }, [evidence, availableWidth]);
    const canCapture = canAnnotate && pageCount > 0 && !!viewportSize;
    const captureAt = (event) => {
        if (!canCapture || !viewportSize)
            return;
        const point = normalizedPointAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        if (point)
            pointCallback.current({ page, ...point });
    };
    const captureKeyboard = (event) => {
        event.preventDefault();
        const selectedPage = Number(keyboardPage);
        const x = Number(keyboardX);
        const y = Number(keyboardY);
        if (!canCapture || !Number.isInteger(selectedPage) || selectedPage < 1 || selectedPage > pageCount || !Number.isFinite(x) || x < 0 || x > 1 || !Number.isFinite(y) || y < 0 || y > 1) {
            setKeyboardError("Enter a page within the evidence and X and Y values from 0 to 1.");
            return;
        }
        setPage(selectedPage);
        setKeyboardError("");
        pointCallback.current({ page: selectedPage, x, y });
    };
    const pageAnnotations = annotations.filter((annotation) => annotation.page === page && Number.isFinite(annotation.x) && Number.isFinite(annotation.y) && annotation.x >= 0 && annotation.x <= 1 && annotation.y >= 0 && annotation.y <= 1);
    const fileUrl = `${DOCUMENTS_API}/files/${encodeURIComponent(fileId)}/stream`;
    return _jsxs("section", { className: "review-evidence", "aria-label": `Submitted evidence ${revisionLabel}, round ${roundId}`, children: [_jsxs("header", { className: "review-evidence-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "review-evidence-eyebrow", children: "SUBMITTED EVIDENCE" }), _jsx("h3", { children: filename }), _jsxs("p", { children: ["Revision ", revisionLabel, " \u00B7 Review round ", roundId] })] }), viewerStatus !== "denied" && _jsx("a", { href: fileUrl, download: filename, children: "Download source" })] }), _jsxs("div", { className: "review-evidence-tools", children: [evidence?.kind === "pdf" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Page", _jsx("input", { "aria-label": "Evidence page", type: "number", min: "1", max: evidence.document.numPages, step: "1", value: page, onChange: (event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= evidence.document.numPages) {
                                            setPage(next);
                                            setKeyboardPage(String(next));
                                        } } })] }), _jsxs("span", { children: ["of ", evidence.document.numPages] }), _jsx("button", { type: "button", onClick: () => setZoom((value) => Math.max(.5, Math.round((value - .25) * 100) / 100)), disabled: zoom <= .5, "aria-label": "Zoom out", children: "\u2212" }), _jsxs("span", { children: [Math.round(zoom * 100), "%"] }), _jsx("button", { type: "button", onClick: () => setZoom((value) => Math.min(3, Math.round((value + .25) * 100) / 100)), disabled: zoom >= 3, "aria-label": "Zoom in", children: "+" }), _jsx("button", { type: "button", onClick: () => setZoom(1), children: "Fit width" })] }), evidence?.kind === "image" && evidence.width > 0 && _jsxs("span", { children: ["Image \u00B7 ", evidence.width, " \u00D7 ", evidence.height] })] }), _jsxs("div", { className: "review-evidence-viewport", ref: viewportRef, onScroll: () => setScrollRevision((value) => value + 1), children: [evidence?.kind === "pdf" && _jsxs("div", { ref: pageFrameRef, className: `review-evidence-page${canCapture ? " can-annotate" : ""}`, style: viewportSize ? { width: viewportSize.width, height: viewportSize.height } : undefined, children: [_jsx("canvas", { ref: canvasRef, "aria-label": `Page ${page} of ${pageCount}`, onClick: captureAt }), viewportSize && _jsx("div", { className: "review-evidence-pins", "aria-hidden": "true", children: pageAnnotations.map((annotation, index) => _jsx("span", { className: `review-evidence-pin${selected(annotation, selectedAnnotation) ? " is-selected" : ""}`, style: { left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }, title: `Page ${annotation.page}: ${annotation.text}` }, annotation.id ?? `${annotation.page}-${annotation.x}-${annotation.y}-${index}`)) }), selectedPoint?.page === page && viewportSize && _jsx("span", { className: "review-evidence-pin is-selected", "aria-hidden": "true", style: { position: "absolute", left: `${selectedPoint.x * 100}%`, top: `${selectedPoint.y * 100}%` } }), pointEditor && canAnnotate && viewerStatus === "ready" && selectedPoint?.page === page && viewportSize && _jsx("div", { ref: pointEditorRef, className: "review-evidence-point-editor", style: editorPosition ? { left: editorPosition.left, top: editorPosition.top, maxWidth: editorPosition.maxWidth, maxHeight: editorPosition.maxHeight } : { left: 0, top: 0 }, children: pointEditor })] }), evidence?.kind === "image" && _jsxs("div", { ref: pageFrameRef, className: `review-evidence-page${canCapture ? " can-annotate" : ""}`, style: { width: evidence.width ? Math.min(evidence.width, availableWidth || evidence.width) : "auto" }, children: [_jsx("img", { ref: imageRef, src: evidence.url, alt: `${filename}, submitted as revision ${revisionLabel}`, onLoad: (event) => { const image = event.currentTarget; if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                                    setEvidence((current) => current?.kind === "image" ? { ...current, width: image.naturalWidth, height: image.naturalHeight } : current);
                                    setViewportSize({ width: image.clientWidth, height: image.clientHeight });
                                    setViewerStatus("ready");
                                    stateCallback.current("ready");
                                } }, onError: () => { setEvidence(undefined); setViewportSize(undefined); setViewerStatus("error"); stateCallback.current("error"); }, onClick: captureAt }), viewportSize && _jsx("div", { className: "review-evidence-pins", "aria-hidden": "true", children: pageAnnotations.map((annotation, index) => _jsx("span", { className: `review-evidence-pin${selected(annotation, selectedAnnotation) ? " is-selected" : ""}`, style: { left: `${annotation.x * 100}%`, top: `${annotation.y * 100}%` }, title: `Page ${annotation.page}: ${annotation.text}` }, annotation.id ?? `${annotation.page}-${annotation.x}-${annotation.y}-${index}`)) }), selectedPoint?.page === page && viewportSize && _jsx("span", { className: "review-evidence-pin is-selected", "aria-hidden": "true", style: { position: "absolute", left: `${selectedPoint.x * 100}%`, top: `${selectedPoint.y * 100}%` } }), pointEditor && canAnnotate && viewerStatus === "ready" && selectedPoint?.page === page && viewportSize && _jsx("div", { ref: pointEditorRef, className: "review-evidence-point-editor", style: editorPosition ? { left: editorPosition.left, top: editorPosition.top, maxWidth: editorPosition.maxWidth, maxHeight: editorPosition.maxHeight } : { left: 0, top: 0 }, children: pointEditor })] }), viewerStatus === "loading" && _jsx("p", { className: "review-evidence-status", role: "status", children: "Loading protected evidence\u2026" }), viewerStatus === "unsupported" && _jsxs("div", { className: "review-evidence-fallback", role: "status", children: [_jsx("p", { children: "This file type has no safe in-page preview. You can download the submitted source or leave general feedback on this review round." }), _jsx("a", { href: fileUrl, download: filename, children: "Download submitted source" })] }), viewerStatus === "denied" && _jsx("p", { className: "review-evidence-denied", role: "alert", children: "Access to this submitted evidence is unavailable. Evidence annotations are disabled." }), viewerStatus === "error" && _jsx("div", { className: "review-evidence-fallback", role: "alert", children: _jsx("p", { children: "The submitted evidence could not be loaded. You can leave general feedback on this review round." }) })] }), evidence?.kind === "pdf" && _jsxs("div", { className: "review-evidence-page-list", "aria-label": "PDF page navigation", children: [_jsx("button", { type: "button", onClick: () => { setPage((value) => Math.max(1, value - 1)); setKeyboardPage((value) => String(Math.max(1, Number(value) - 1))); }, disabled: page <= 1, children: "Previous page" }), _jsxs("span", { children: ["Page ", page, " of ", pageCount] }), _jsx("button", { type: "button", onClick: () => { setPage((value) => Math.min(pageCount, value + 1)); setKeyboardPage((value) => String(Math.min(pageCount, Number(value) + 1))); }, disabled: page >= pageCount, children: "Next page" })] }), canAnnotate && _jsxs("form", { className: "review-evidence-keyboard", onSubmit: captureKeyboard, children: [_jsxs("fieldset", { disabled: !canCapture, children: [_jsx("legend", { children: "Add a point annotation" }), _jsxs("label", { children: ["Page", _jsx("input", { type: "number", min: "1", max: pageCount || undefined, step: "1", value: keyboardPage, onChange: (event) => setKeyboardPage(event.target.value) })] }), _jsxs("label", { children: ["X", _jsx("input", { type: "number", min: "0", max: "1", step: "0.001", value: keyboardX, onChange: (event) => setKeyboardX(event.target.value) })] }), _jsxs("label", { children: ["Y", _jsx("input", { type: "number", min: "0", max: "1", step: "0.001", value: keyboardY, onChange: (event) => setKeyboardY(event.target.value) })] }), _jsx("button", { type: "submit", children: "Use this point" })] }), keyboardError && _jsx("p", { role: "alert", children: keyboardError }), _jsx("p", { children: "Coordinates use the page image from 0 to 1. Points are captured only after page dimensions are available." })] }), _jsx("ol", { className: "review-evidence-annotations", "aria-label": "Existing evidence annotations", children: annotations.map((annotation, index) => _jsx("li", { children: _jsxs("button", { type: "button", onClick: () => { if (annotation.page >= 1 && annotation.page <= pageCount) {
                            setPage(annotation.page);
                            setKeyboardPage(String(annotation.page));
                        } }, disabled: evidence?.kind === "pdf" && annotation.page > pageCount, children: [_jsxs("span", { children: ["Page ", annotation.page, " \u00B7 ", annotation.x.toFixed(3), ", ", annotation.y.toFixed(3)] }), _jsx("strong", { children: annotation.text })] }) }, annotation.id ?? `${annotation.page}-${index}`)) })] });
}
