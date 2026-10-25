import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./gallery.css";
const API = "/api/v1";
async function get(url, csrf) { const headers = new Headers(); if (csrf)
    headers.set("X-CSRF-Token", csrf); const r = await fetch(url, { credentials: "same-origin", cache: "no-store", headers }); if (!r.ok)
    throw Object.assign(new Error("request"), { status: r.status }); return await r.json(); }
async function post(url, csrf, data) { const r = await fetch(url, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(data) }); if (!r.ok)
    throw Object.assign(new Error("request"), { status: r.status }); return await r.json(); }
function errText(e) { const s = typeof e === "object" && e && "status" in e ? e.status : 0; return s === 401 ? "Your session expired. Sign in again and retry." : s === 403 || s === 404 ? "This gallery or portfolio action is unavailable for your current access." : s === 409 ? "This record changed. Refresh and review the current state." : s === 413 ? "The image exceeds the allowed size." : "The gallery service could not complete the request. Try again."; }
export function StaffProjectGallery({ projectId, csrfToken, owner }) {
    const [gallery, setGallery] = useState();
    const [portfolio, setPortfolio] = useState();
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [itemId, setItemId] = useState("");
    const [label, setLabel] = useState("");
    const [reason, setReason] = useState("");
    const [sourceFileId, setSourceFileId] = useState("");
    const [title, setTitle] = useState("");
    const [altText, setAltText] = useState("");
    const [image, setImage] = useState();
    const [ownerReason, setOwnerReason] = useState("");
    const requestSequence = useRef(0);
    const currentProjectId = useRef(projectId);
    useLayoutEffect(() => { currentProjectId.current = projectId; return () => { currentProjectId.current = ""; }; }, [projectId]);
    const refresh = async () => { const requestedProjectId = projectId; if (!requestedProjectId || requestedProjectId !== currentProjectId.current)
        return; const sequence = ++requestSequence.current; const current = () => sequence === requestSequence.current && requestedProjectId === currentProjectId.current; setLoading(true); setError(""); try {
        const [g, p] = await Promise.all([get(`${API}/galleries/projects/${encodeURIComponent(requestedProjectId)}`, csrfToken), get(`${API}/portfolio/projects/${encodeURIComponent(requestedProjectId)}`, csrfToken)]);
        if (!current())
            return;
        setGallery(g);
        setPortfolio(p);
        setItemId(value => value && !g.eligibleItems.some(x => x.id === value) ? "" : value);
        setSourceFileId(value => value && !p.sourceFiles.some(x => x.id === value) ? "" : value);
    }
    catch (e) {
        if (!current())
            return;
        setGallery(undefined);
        setPortfolio(undefined);
        setError(errText(e));
    }
    finally {
        if (current())
            setLoading(false);
    } };
    useEffect(() => { requestSequence.current += 1; setGallery(undefined); setPortfolio(undefined); void refresh(); return () => { requestSequence.current += 1; }; }, [projectId]);
    const add = async (e) => { e.preventDefault(); if (!itemId || reason.trim().length < 3)
        return; setBusy(true); setError(""); setNotice(""); try {
        await post(`${API}/galleries/projects/${encodeURIComponent(projectId)}`, csrfToken, { itemId, label: label.trim(), reason: reason.trim() });
        setLabel("");
        setReason("");
        await refresh();
        setNotice("Client gallery updated.");
    }
    catch (x) {
        setError(errText(x));
    }
    finally {
        setBusy(false);
    } };
    const prepare = async (e) => { e.preventDefault(); if (!owner || !sourceFileId || !image || reason.trim().length < 3)
        return; if (image.size > 8 * 1024 * 1024) {
        setError("Choose a PNG image up to 8 MiB.");
        return;
    } setBusy(true); setError(""); setNotice(""); try {
        const bytes = new Uint8Array(await image.arrayBuffer());
        let raw = "";
        for (let i = 0; i < bytes.length; i += 32768)
            raw += String.fromCharCode(...bytes.subarray(i, i + 32768));
        await post(`${API}/portfolio/projects/${encodeURIComponent(projectId)}`, csrfToken, { sourceFileId, title: title.trim(), altText: altText.trim(), reason: reason.trim(), imageBase64: btoa(raw) });
        setTitle("");
        setAltText("");
        setReason("");
        setImage(undefined);
        await refresh();
        setNotice("Separate derivative saved as a private draft. It is not public until the Owner publishes it.");
    }
    catch (x) {
        setError(errText(x));
    }
    finally {
        setBusy(false);
    } };
    const action = async (p, op) => { if (!owner || ownerReason.trim().length < 3)
        return; setBusy(true); setError(""); setNotice(""); try {
        await post(`${API}/portfolio/${encodeURIComponent(p.id)}/${op}`, csrfToken, { expectedVersion: p.version, reason: ownerReason.trim() });
        setOwnerReason("");
        await refresh();
        setNotice(op === "publish" ? "Portfolio publication is active." : "Portfolio publication withdrawn.");
    }
    catch (x) {
        setError(errText(x));
    }
    finally {
        setBusy(false);
    } };
    if (!projectId)
        return null;
    return _jsxs("section", { className: "s15-gallery", "aria-labelledby": "s15-gallery-heading", children: [_jsxs("header", { className: "s15-gallery-head", children: [_jsxs("div", { children: [_jsx("p", { className: "s15-gallery-eyebrow", children: "CLIENT PRESENTATION" }), _jsx("h3", { id: "s15-gallery-heading", children: "Project gallery and portfolio" }), _jsx("p", { children: "Curate exact client-granted items. Public work uses a separate derivative and stays private until explicit Owner publication." })] }), _jsx("button", { type: "button", className: "s15-secondary", onClick: () => void refresh(), disabled: loading || busy, children: "Refresh" })] }), loading && _jsx("p", { role: "status", className: "s15-muted", children: "Loading gallery and publication records\u2026" }), error && _jsxs("div", { className: "s15-error", children: [_jsx("p", { role: "alert", children: error }), _jsx("button", { type: "button", onClick: () => void refresh(), children: "Try again" })] }), notice && _jsx("p", { role: "status", className: "s15-notice", children: notice }), !loading && gallery && portfolio && _jsxs(_Fragment, { children: [_jsxs("section", { className: "s15-gallery-panel", "aria-labelledby": "s15-private-heading", children: [_jsx("h4", { id: "s15-private-heading", children: "Private client gallery" }), _jsx("p", { className: "s15-muted", children: "Only existing exact S14 PDF/image review items with current client grants are eligible. Access is rechecked when viewed." }), gallery.entries.length === 0 ? _jsx("p", { role: "status", className: "s15-empty", children: "No items have been added to this project\u2019s client gallery." }) : _jsx("ul", { className: "s15-entry-list", children: gallery.entries.map(x => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: x.label }), _jsx("span", { children: x.mime })] }), _jsx("a", { href: x.streamUrl, target: "_blank", rel: "noreferrer", children: "View item" })] }, x.id)) }), gallery.eligibleItems.length === 0 ? _jsx("p", { role: "status", className: "s15-muted", children: "No currently granted review items are eligible for this gallery." }) : _jsxs("form", { className: "s15-form", onSubmit: e => void add(e), children: [_jsxs("label", { children: ["Exact currently granted review item", _jsxs("select", { required: true, value: itemId, onChange: e => setItemId(e.target.value), children: [_jsx("option", { value: "", children: "Choose an item" }), gallery.eligibleItems.map(x => _jsxs("option", { value: x.id, children: [x.label, " \u00B7 ", x.mime, " (", x.grants.length, " active client grants)"] }, x.id))] })] }), _jsxs("label", { children: ["Client-facing label", _jsx("input", { required: true, minLength: 1, maxLength: 160, value: label, onChange: e => setLabel(e.target.value) })] }), _jsxs("label", { children: ["Reason", _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: reason, onChange: e => setReason(e.target.value) })] }), _jsx("button", { disabled: busy || !itemId || reason.trim().length < 3, children: busy ? "Saving…" : "Add to client gallery" })] })] }), _jsxs("section", { className: "s15-gallery-panel", "aria-labelledby": "s15-portfolio-heading", children: [_jsx("h4", { id: "s15-portfolio-heading", children: "Public portfolio" }), _jsx("p", { className: "s15-muted", children: "Confidential sources and Confidential folder ancestors are prohibited. Published visitors receive only separately stored derivatives." }), owner && _jsxs("form", { className: "s15-form", onSubmit: e => void prepare(e), children: [_jsx("h5", { children: "Prepare a separate PNG derivative" }), _jsxs("label", { children: ["Eligible source file", _jsxs("select", { required: true, value: sourceFileId, onChange: e => setSourceFileId(e.target.value), children: [_jsx("option", { value: "", children: "Choose a source file" }), portfolio.sourceFiles.map(x => _jsxs("option", { value: x.id, children: [x.fileName, " \u00B7 ", x.mimeType] }, x.id))] })] }), _jsxs("label", { children: ["Public title", _jsx("input", { required: true, minLength: 1, maxLength: 160, value: title, onChange: e => setTitle(e.target.value) })] }), _jsxs("label", { children: ["Alternative text", _jsx("input", { required: true, minLength: 1, maxLength: 500, value: altText, onChange: e => setAltText(e.target.value) })] }), _jsxs("label", { children: ["Sanitized PNG derivative", _jsx("input", { required: true, type: "file", accept: "image/png", onChange: e => setImage(e.currentTarget.files?.[0]) })] }), _jsxs("label", { children: ["Reason for preparation", _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: reason, onChange: e => setReason(e.target.value) })] }), _jsx("button", { disabled: busy || !sourceFileId || !image || reason.trim().length < 3, children: busy ? "Saving…" : "Save private draft" })] }), portfolio.publications.length === 0 ? _jsx("p", { role: "status", className: "s15-empty", children: "No portfolio derivatives have been prepared." }) : _jsxs(_Fragment, { children: [_jsx("ul", { className: "s15-entry-list", children: portfolio.publications.map(x => _jsx("li", { children: _jsxs("div", { children: [_jsx("strong", { children: x.title }), _jsxs("span", { children: [x.state, " \u00B7 ", x.mime, " \u00B7 ", x.size.toLocaleString(), " bytes"] }), _jsxs("small", { children: ["Created ", new Date(x.createdAt).toLocaleString(), " \u00B7 source file ", x.sourceFileId] })] }) }, x.id)) }), owner && _jsxs(_Fragment, { children: [_jsxs("label", { className: "s15-reason", children: ["Owner action reason", _jsx("textarea", { required: true, minLength: 3, maxLength: 1000, value: ownerReason, onChange: e => setOwnerReason(e.target.value) })] }), _jsx("div", { className: "s15-actions", children: portfolio.publications.map(x => _jsxs("div", { className: "s15-action-row", children: [_jsxs("strong", { children: [x.title, " \u00B7 ", x.state] }), x.state === "DRAFT" && _jsx("button", { disabled: busy || ownerReason.trim().length < 3, onClick: () => void action(x, "publish"), children: "Publish" }), x.state === "PUBLISHED" && _jsx("button", { className: "s15-secondary", disabled: busy || ownerReason.trim().length < 3, onClick: () => void action(x, "withdraw"), children: "Withdraw" })] }, x.id)) })] })] })] })] })] });
}
export function ClientProjectGallery({ projectId, session }) { const [items, setItems] = useState([]); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [retry, setRetry] = useState(0); const refresh = async () => { if (!projectId) {
    setItems([]);
    return;
} setLoading(true); setError(""); try {
    const r = await get(`${API}/client-portal/projects/${encodeURIComponent(projectId)}/gallery`, session.csrfToken);
    if (!Array.isArray(r?.items))
        throw new Error("invalid gallery response");
    setItems(r.items);
}
catch (e) {
    setItems([]);
    setError(errText(e));
}
finally {
    setLoading(false);
} }; useEffect(() => { void refresh(); }, [projectId, retry]); return _jsxs("section", { className: "s15-gallery s15-client-gallery", "aria-labelledby": "s15-client-gallery-heading", children: [_jsxs("header", { className: "s15-gallery-head", children: [_jsxs("div", { children: [_jsx("p", { className: "s15-gallery-eyebrow", children: "SHARED WITH THIS CLIENT ACCOUNT" }), _jsx("h3", { id: "s15-client-gallery-heading", children: "Project gallery" }), _jsx("p", { children: "Only items currently authorized for your account are shown." })] }), _jsx("button", { type: "button", className: "s15-secondary", onClick: () => setRetry(x => x + 1), disabled: loading, children: "Refresh" })] }), loading && _jsx("p", { role: "status", className: "s15-muted", children: "Loading the project gallery\u2026" }), error && _jsxs("div", { className: "s15-error", children: [_jsx("p", { role: "alert", children: error }), _jsx("button", { type: "button", onClick: () => setRetry(x => x + 1), children: "Try again" })] }), !loading && !error && items.length === 0 && _jsx("p", { role: "status", className: "s15-empty", children: "There are no current gallery items available to your account." }), items.length > 0 && _jsx("ul", { className: "s15-entry-list", children: items.map(x => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: x.label }), _jsx("span", { children: x.mime })] }), _jsx("a", { href: x.streamUrl, target: "_blank", rel: "noreferrer", children: "View shared item" })] }, x.id)) })] }); }
export function PublicPortfolioPage() { const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [retry, setRetry] = useState(0); useEffect(() => { let live = true; setLoading(true); setError(""); void fetch(`${API}/public/portfolio`, { credentials: "omit", cache: "no-store" }).then(async (r) => { if (!r.ok)
    throw new Error("request"); return await r.json(); }).then(r => { if (live)
    setItems(r.items); }).catch(() => { if (live) {
    setItems([]);
    setError("The portfolio is unavailable right now.");
} }).finally(() => { if (live)
    setLoading(false); }); return () => { live = false; }; }, [retry]); return _jsxs("main", { className: "s15-public-page", children: [_jsxs("header", { children: [_jsxs("a", { className: "s15-public-brand", href: "/", "aria-label": "Sense Studios home", children: [_jsx("span", { children: "S" }), _jsx("strong", { children: "SENSE STUDIOS" })] }), _jsx("p", { children: "SELECTED WORK" }), _jsx("h1", { children: "Portfolio" }), _jsx("p", { children: "Selected projects by Sense Studios." })] }), loading && _jsx("p", { role: "status", className: "s15-muted", children: "Loading selected work\u2026" }), error && _jsxs("div", { className: "s15-error", children: [_jsx("p", { role: "alert", children: error }), _jsx("button", { onClick: () => setRetry(x => x + 1), children: "Try again" })] }), !loading && !error && items.length === 0 && _jsx("p", { role: "status", className: "s15-empty", children: "No portfolio work is currently published." }), !loading && !error && items.length > 0 && _jsx("div", { className: "s15-public-grid", children: items.map(x => _jsxs("article", { className: "s15-public-card", children: [_jsx("div", { className: "s15-public-image", children: _jsx("img", { src: x.streamUrl, alt: x.altText, loading: "lazy" }) }), _jsx("h2", { children: x.title })] }, x.id)) }), _jsx("footer", { children: "Sense Studios" })] }); }
