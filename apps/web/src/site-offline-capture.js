import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteOfflineCommand, getOfflineContext, listOfflineCommands, purgeOfflineAccount, purgeOfflineContext, purgeOfflineProject, purgeOtherOfflineAccounts, saveOfflineCommand, saveOfflineContext, saveOfflinePointer, clearOfflinePointer, readOfflinePointer, amendOfflineCommand, isRetryableOfflineStatus, } from "./site-offline.js";
const uuid = () => crypto.randomUUID();
const queueKey = (accountId, projectId, localId) => `${accountId}:${projectId}:${localId}`;
const statusMessage = {
    PENDING: "Pending", UPLOADING: "Uploading photos", SYNCING: "Syncing", CONFLICT: "Conflict", FAILED: "Failed", SYNCED: "Synchronized",
};
function httpError(status, body) {
    return Object.assign(new Error("request-failed"), { status, body });
}
async function readJson(response) {
    const body = await response.json().catch(() => undefined);
    if (!response.ok)
        throw httpError(response.status, body);
    return body;
}
function bytesToHex(bytes) { return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
async function digest(blob) { return bytesToHex(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())); }
export function SiteOfflineCapture(props) {
    const [context, setContext] = useState();
    const [queue, setQueue] = useState([]);
    const [storageError, setStorageError] = useState("");
    const [notice, setNotice] = useState("");
    const [syncBusy, setSyncBusy] = useState(false);
    const [action, setAction] = useState("NOTE");
    const [folderId, setFolderId] = useState("");
    const [photos, setPhotos] = useState([]);
    const [amendReasons, setAmendReasons] = useState({});
    const [amendPayloads, setAmendPayloads] = useState({});
    const sessionActive = useRef(true);
    const [draft, setDraft] = useState({
        note: "", date: props.today, trade: "", count: "", manpowerNote: "", workCompleted: "", materialsReceived: "", issues: "", delayCauses: "", tomorrowPlan: "",
        snagTitle: "", snagDescription: "", snagPackageId: "", packageId: "", actualPercent: "", actualQuantity: "", qualityStatus: "PENDING", materialStatus: "", blockers: "", packageTomorrowPlan: "",
    });
    const safeFolders = useMemo(() => props.folders.filter((folder) => folder.offlineUploadAllowed === true), [props.folders]);
    const reload = useCallback(async () => {
        try {
            const [nextContext, items] = await Promise.all([
                getOfflineContext(props.accountId, props.projectId),
                listOfflineCommands(props.accountId, props.projectId),
            ]);
            if (!sessionActive.current)
                return;
            setContext(nextContext);
            setQueue(items);
            setStorageError("");
        }
        catch (error) {
            if (sessionActive.current)
                setStorageError(error instanceof Error ? error.message : "Offline storage is unavailable.");
        }
    }, [props.accountId, props.projectId]);
    useEffect(() => { void reload(); }, [reload]);
    useEffect(() => {
        if (!props.offlineOnly && !props.canWork) {
            sessionActive.current = false;
            setContext(undefined);
            setQueue([]);
            void purgeOfflineProject(props.accountId, props.projectId).catch(() => setStorageError("Current project access could not be checked; stored offline drafts are hidden."));
        }
        else if (!props.offlineOnly)
            sessionActive.current = true;
    }, [props.accountId, props.projectId, props.canWork, props.offlineOnly]);
    useEffect(() => {
        sessionActive.current = props.offlineOnly === true || props.canWork;
        let mounted = true;
        void purgeOtherOfflineAccounts(props.accountId).then(() => { if (mounted)
            void reload(); }).catch(() => { if (mounted)
            setStorageError("Offline storage could not be checked. Local capture is unavailable until storage works."); });
        const clear = () => { sessionActive.current = false; clearOfflinePointer(props.accountId); void purgeOfflineAccount(props.accountId).catch(() => undefined); setContext(undefined); setQueue([]); };
        window.addEventListener("sense-session-ended", clear);
        return () => { mounted = false; sessionActive.current = false; window.removeEventListener("sense-session-ended", clear); };
    }, [props.accountId, reload]);
    const prepare = async () => {
        if (!sessionActive.current)
            return;
        const prepared = {
            key: `${props.accountId}:${props.projectId}`, accountId: props.accountId, projectId: props.projectId,
            projectTitle: props.projectTitle, preparedAt: new Date().toISOString(), today: props.today,
            packages: props.packages.map((item) => ({ id: item.id, title: item.data.title, version: item.version, actualPercent: item.data.actualPercent, actualQuantity: item.data.actualQuantity, qualityStatus: item.data.qualityStatus, materialStatus: item.data.materialStatus, blockers: item.data.blockers, tomorrowPlan: item.data.tomorrowPlan })),
            folders: safeFolders.map(({ id, name }) => ({ id, name })),
        };
        try {
            await saveOfflineContext(prepared);
            if (!sessionActive.current) {
                await purgeOfflineProject(props.accountId, props.projectId).catch(() => undefined);
                return;
            }
            saveOfflinePointer({ accountId: props.accountId, projectId: props.projectId, projectTitle: props.projectTitle });
            setContext(prepared);
            setStorageError("");
            setNotice(`Offline capture prepared for ${prepared.projectTitle}. Prepare again to refresh its minimal context.`);
        }
        catch (error) {
            setStorageError(error instanceof Error ? error.message : "Offline storage could not save this project.");
            setNotice("");
        }
    };
    const addDraft = async (event) => {
        event.preventDefault();
        if (!context || !props.canWork || storageError || !sessionActive.current)
            return;
        const form = event.currentTarget;
        const reason = form.elements.namedItem("offlineReason").value.trim();
        if (reason.length < 3)
            return;
        let payload;
        let baseRecordVersion = null;
        if (action === "NOTE")
            payload = { note: draft.note.trim(), photoIds: [] };
        else if (action === "MANPOWER")
            payload = { date: draft.date, trade: draft.trade.trim(), count: Number(draft.count), employeeAccountIds: [], note: draft.manpowerNote.trim() };
        else if (action === "REPORT")
            payload = { date: draft.date, workCompleted: draft.workCompleted.trim(), manpower: [], materialsReceived: draft.materialsReceived.trim(), photoIds: [], issues: draft.issues.trim(), delayCauses: draft.delayCauses.trim(), tomorrowPlan: draft.tomorrowPlan.trim() };
        else if (action === "SNAG")
            payload = { title: draft.snagTitle.trim(), description: draft.snagDescription.trim(), ...(draft.snagPackageId ? { packageId: draft.snagPackageId } : {}), photoIds: [] };
        else {
            const target = context.packages.find((item) => item.id === draft.packageId);
            if (!target)
                return;
            baseRecordVersion = target.version;
            payload = { recordId: target.id, actualPercent: draft.actualPercent, actualQuantity: draft.actualQuantity, qualityStatus: draft.qualityStatus, materialStatus: draft.materialStatus.trim(), blockers: draft.blockers.trim(), tomorrowPlan: draft.packageTomorrowPlan.trim(), photoIds: [] };
        }
        const selectedPhotos = action === "MANPOWER" ? [] : photos;
        if (selectedPhotos.some((file) => !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type.toLowerCase()))) {
            setNotice("Use PNG, JPEG, GIF, or WebP captured images. Unsupported files were not saved.");
            return;
        }
        if (selectedPhotos.length > 20) {
            setNotice("Choose no more than 20 captured images for one offline draft.");
            return;
        }
        const localId = uuid();
        const row = {
            key: queueKey(props.accountId, props.projectId, localId), accountId: props.accountId, projectId: props.projectId,
            projectTitle: props.projectTitle, localId, commandId: uuid(), baseRecordVersion, action, payload, reason,
            photos: selectedPhotos.map((file) => ({ localId: uuid(), folderId, fileName: file.name, mimeType: file.type, sizeBytes: file.size, bytes: file })),
            status: "PENDING", createdAt: new Date().toISOString(),
        };
        try {
            if (!sessionActive.current)
                return;
            await saveOfflineCommand(row);
            if (!sessionActive.current)
                return;
            setPhotos([]);
            form.reset();
            await reload();
            setStorageError("");
            setNotice("Offline draft saved on this device.");
        }
        catch (error) {
            setStorageError(error instanceof Error ? error.message : "Offline storage could not save this draft.");
            setNotice("");
        }
    };
    const uploadPhotos = async (entry) => {
        const uploaded = [];
        const photos = [...entry.photos];
        for (let photoIndex = 0; photoIndex < photos.length; photoIndex++) {
            let photo = photos[photoIndex];
            if (photo.finalizedDocumentId) {
                uploaded.push(photo.finalizedDocumentId);
                continue;
            }
            if (!photo.uploadId) {
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                const started = await readJson(await fetch(`/api/v1/site/projects/${encodeURIComponent(entry.projectId)}/offline-photos`, {
                    method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken },
                    body: JSON.stringify({ localId: photo.localId, folderId: photo.folderId, fileName: photo.fileName, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, reason: entry.reason }),
                }));
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                const chunkSize = Math.min(started.chunkSize, 8 * 1024 * 1024);
                if (chunkSize <= 0)
                    throw new Error("The document service returned an invalid upload size.");
                photo = { ...photo, uploadId: started.uploadId, chunkSize, nextChunk: 0 };
                photos[photoIndex] = photo;
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                await saveOfflineCommand({ ...entry, photos });
            }
            const chunkSize = photo.chunkSize;
            const chunkCount = Math.ceil(photo.sizeBytes / chunkSize);
            for (let index = photo.nextChunk ?? 0; index < chunkCount; index++) {
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                const chunk = photo.bytes.slice(index * chunkSize, Math.min((index + 1) * chunkSize, photo.sizeBytes));
                const checksum = await digest(chunk);
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                const response = await fetch(`/api/v1/documents/uploads/${encodeURIComponent(photo.uploadId)}/chunks/${index}`, {
                    method: "PUT", credentials: "include", headers: { "Content-Type": "application/octet-stream", "X-CSRF-Token": props.csrfToken, "x-chunk-sha256": checksum }, body: chunk,
                });
                if (!response.ok)
                    throw httpError(response.status, await response.json().catch(() => undefined));
                if (!sessionActive.current)
                    throw new Error("The session ended before this upload could continue.");
                photo = { ...photo, nextChunk: index + 1 };
                photos[photoIndex] = photo;
                await saveOfflineCommand({ ...entry, photos });
            }
            if (!sessionActive.current)
                throw new Error("The session ended before this upload could continue.");
            const file = await readJson(await fetch(`/api/v1/documents/uploads/${encodeURIComponent(photo.uploadId)}/finalize`, {
                method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken }, body: "{}",
            }));
            if (!sessionActive.current)
                throw new Error("The session ended before this upload could continue.");
            photo = { ...photo, finalizedDocumentId: file.id };
            photos[photoIndex] = photo;
            await saveOfflineCommand({ ...entry, photos });
            uploaded.push(file.id);
        }
        return { uploaded, retained: photos.filter((photo) => !photo.finalizedDocumentId) };
    };
    const syncOne = async (entry) => {
        if (!sessionActive.current)
            return;
        const withStatus = { ...entry, status: entry.photos.length ? "UPLOADING" : "SYNCING" };
        delete withStatus.error;
        delete withStatus.conflict;
        await saveOfflineCommand(withStatus);
        if (!sessionActive.current)
            return;
        await reload();
        try {
            let ready = withStatus;
            if (ready.photos.length) {
                const result = await uploadPhotos(ready);
                const photoIds = [...(Array.isArray(ready.payload.photoIds) ? ready.payload.photoIds : []), ...result.uploaded];
                ready = { ...ready, photos: result.retained, payload: { ...ready.payload, photoIds }, status: "SYNCING" };
                if (!sessionActive.current)
                    return;
                await saveOfflineCommand(ready);
            }
            const response = await fetch(`/api/v1/site/projects/${encodeURIComponent(ready.projectId)}/offline-commands`, {
                method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": props.csrfToken },
                body: JSON.stringify({ commandId: ready.commandId, localId: ready.localId, baseRecordVersion: ready.baseRecordVersion, reason: ready.reason, action: ready.action, payload: ready.payload }),
            });
            if (!sessionActive.current)
                return;
            if (response.status === 409) {
                const body = await response.json().catch(() => ({}));
                if (body.code === "SITE_RECORD_CONFLICT" && body.record) {
                    if (!sessionActive.current)
                        return;
                    await saveOfflineCommand({ ...ready, status: "CONFLICT", conflict: body.record });
                    return;
                }
            }
            await readJson(response);
            if (!sessionActive.current)
                return;
            await saveOfflineCommand({ ...ready, status: "SYNCED", photos: [] });
        }
        catch (error) {
            if (!sessionActive.current)
                return;
            const status = error.status ?? 0;
            if (status === 401 || status === 403 || status === 404) {
                await setNoAccess();
                return;
            }
            const latest = (await listOfflineCommands(props.accountId, props.projectId)).find((item) => item.key === entry.key) ?? entry;
            if (!sessionActive.current || latest.status === "CONFLICT")
                return;
            await saveOfflineCommand({ ...latest, status: "FAILED", error: status ? `Upload or sync failed with status ${status}.` : "Upload or sync could not reach the service." });
        }
    };
    const [accessLost, setAccessLost] = useState(false);
    const setNoAccess = async () => {
        sessionActive.current = false;
        setAccessLost(true);
        setContext(undefined);
        setQueue([]);
        clearOfflinePointer(props.accountId);
        await purgeOfflineAccount(props.accountId).catch(() => undefined);
        await purgeOfflineContext(props.accountId, props.projectId).catch(() => undefined);
        props.onAccessLost();
    };
    const syncPending = useCallback(async () => {
        if (syncBusy || !navigator.onLine || !context || props.offlineOnly)
            return;
        setSyncBusy(true);
        setNotice("");
        try {
            const items = await listOfflineCommands(props.accountId, props.projectId);
            for (const item of items) {
                if (!sessionActive.current)
                    break;
                if (isRetryableOfflineStatus(item.status) && !item.requiresPhotoRecapture)
                    await syncOne(item);
                if (!sessionActive.current)
                    break;
            }
            await reload();
            props.onSynced();
            setNotice("Offline queue sync finished. Review any failed or conflicted items.");
        }
        catch (error) {
            setStorageError(error instanceof Error ? error.message : "Offline storage is unavailable.");
        }
        finally {
            setSyncBusy(false);
        }
    }, [syncBusy, context, props.accountId, props.projectId, props.csrfToken, props.offlineOnly, props.onSynced, reload]);
    useEffect(() => {
        const online = () => { if (context)
            void syncPending(); };
        window.addEventListener("online", online);
        return () => window.removeEventListener("online", online);
    }, [context, syncPending]);
    const keepServer = async (entry) => { await deleteOfflineCommand(entry.key); await reload(); setNotice("The server’s current record was kept. This local draft was discarded."); };
    const amend = async (entry) => {
        if (!entry.conflict)
            return;
        const reason = (amendReasons[entry.key] ?? "").trim();
        if (reason.length < 3)
            return;
        const payload = { ...entry.payload, ...(amendPayloads[entry.key] ?? {}) };
        if (!sessionActive.current)
            return;
        const next = amendOfflineCommand(entry, entry.conflict.version, reason, payload, uuid);
        try {
            await saveOfflineCommand(next);
            await deleteOfflineCommand(entry.key);
            await reload();
            setNotice("Amended command saved with the displayed server version. Sync it when ready.");
        }
        catch (error) {
            setStorageError(error instanceof Error ? error.message : "The amended command could not be saved.");
        }
    };
    const discard = async (entry) => { await deleteOfflineCommand(entry.key); await reload(); };
    const conflictFields = {
        NOTE: [{ key: "note", label: "Observation note", multiline: true }],
        MANPOWER: [{ key: "date", label: "Observation date" }, { key: "trade", label: "Trade" }, { key: "count", label: "People counted", number: true }, { key: "note", label: "Manpower note", multiline: true }],
        REPORT: [{ key: "date", label: "Report date" }, { key: "workCompleted", label: "Work completed today", multiline: true }, { key: "materialsReceived", label: "Materials received", multiline: true }, { key: "issues", label: "Issues", multiline: true }, { key: "delayCauses", label: "Delay causes", multiline: true }, { key: "tomorrowPlan", label: "Plan for tomorrow", multiline: true }],
        SNAG: [{ key: "title", label: "Snag title" }, { key: "description", label: "Snag description", multiline: true }],
        PACKAGE_PROGRESS: [{ key: "actualPercent", label: "Actual progress (%)" }, { key: "actualQuantity", label: "Actual quantity" }, { key: "qualityStatus", label: "Quality status" }, { key: "materialStatus", label: "Material status" }, { key: "blockers", label: "Blockers", multiline: true }, { key: "tomorrowPlan", label: "Plan for tomorrow", multiline: true }],
    };
    if (accessLost)
        return _jsxs("section", { className: "site-panel site-offline", children: [_jsx("h2", { children: "Offline capture" }), _jsx("p", { role: "status", children: "Project access was lost. Local offline content has been removed." })] });
    return _jsxs("section", { className: "site-panel site-offline", "aria-labelledby": "site-offline-title", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { id: "site-offline-title", children: "Offline site capture" }), _jsx("p", { children: "Prepare a small project summary, then record drafts on this device. Sync repeats current access checks." })] }), _jsx("button", { type: "button", onClick: () => void prepare(), disabled: !props.canWork || Boolean(storageError), children: "Prepare offline capture" })] }), storageError && _jsxs("p", { role: "status", className: "site-note", children: [storageError, " Online site work is still available."] }), notice && _jsx("p", { role: "status", className: "site-notice", children: notice }), !props.canWork && _jsx("p", { role: "status", className: "site-note", children: "Offline capture is unavailable because current site work access is not confirmed." }), context && _jsxs(_Fragment, { children: [_jsxs("p", { role: "status", className: "site-offline-context", children: ["Offline capture prepared for ", context.projectTitle, " \u00B7 prepared ", new Date(context.preparedAt).toLocaleString(), " \u00B7 current project context only"] }), _jsxs("form", { className: "site-form", onSubmit: (event) => void addDraft(event), children: [_jsx("h3", { children: "Save an offline draft" }), _jsxs("label", { children: ["Offline capture type", _jsxs("select", { "aria-label": "Offline capture type", value: action, onChange: (e) => setAction(e.target.value), children: [_jsx("option", { value: "NOTE", children: "Note" }), _jsx("option", { value: "MANPOWER", children: "Manpower observation" }), _jsx("option", { value: "REPORT", children: "Daily report draft" }), _jsx("option", { value: "SNAG", children: "Open snag" }), _jsx("option", { value: "PACKAGE_PROGRESS", children: "Package progress" })] })] }), action === "NOTE" && _jsxs("label", { children: ["Observation note", _jsx("textarea", { "aria-label": "Observation note", required: true, minLength: 1, maxLength: 4000, value: draft.note, onChange: (e) => setDraft({ ...draft, note: e.target.value }) })] }), action === "MANPOWER" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Observation date", _jsx("input", { "aria-label": "Observation date", type: "date", required: true, value: draft.date, onChange: (e) => setDraft({ ...draft, date: e.target.value }) })] }), _jsxs("label", { children: ["Trade", _jsx("input", { "aria-label": "Trade", required: true, maxLength: 120, value: draft.trade, onChange: (e) => setDraft({ ...draft, trade: e.target.value }) })] }), _jsxs("label", { children: ["People counted", _jsx("input", { "aria-label": "People counted", type: "number", min: "0", step: "1", required: true, value: draft.count, onChange: (e) => setDraft({ ...draft, count: e.target.value }) })] }), _jsxs("label", { children: ["Manpower note", _jsx("textarea", { "aria-label": "Manpower note", value: draft.manpowerNote, onChange: (e) => setDraft({ ...draft, manpowerNote: e.target.value }) })] })] }), action === "REPORT" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Report date", _jsx("input", { "aria-label": "Report date", type: "date", required: true, value: draft.date, onChange: (e) => setDraft({ ...draft, date: e.target.value }) })] }), _jsxs("label", { children: ["Work completed today", _jsx("textarea", { "aria-label": "Work completed today", required: true, value: draft.workCompleted, onChange: (e) => setDraft({ ...draft, workCompleted: e.target.value }) })] }), _jsxs("label", { children: ["Materials received", _jsx("textarea", { "aria-label": "Materials received", value: draft.materialsReceived, onChange: (e) => setDraft({ ...draft, materialsReceived: e.target.value }) })] }), _jsxs("label", { children: ["Issues", _jsx("textarea", { "aria-label": "Issues", value: draft.issues, onChange: (e) => setDraft({ ...draft, issues: e.target.value }) })] }), _jsxs("label", { children: ["Delay causes", _jsx("textarea", { "aria-label": "Delay causes", value: draft.delayCauses, onChange: (e) => setDraft({ ...draft, delayCauses: e.target.value }) })] }), _jsxs("label", { children: ["Plan for tomorrow", _jsx("textarea", { "aria-label": "Plan for tomorrow", required: true, value: draft.tomorrowPlan, onChange: (e) => setDraft({ ...draft, tomorrowPlan: e.target.value }) })] })] }), action === "SNAG" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Snag title", _jsx("input", { "aria-label": "Snag title", required: true, value: draft.snagTitle, onChange: (e) => setDraft({ ...draft, snagTitle: e.target.value }) })] }), _jsxs("label", { children: ["Snag description", _jsx("textarea", { "aria-label": "Snag description", required: true, value: draft.snagDescription, onChange: (e) => setDraft({ ...draft, snagDescription: e.target.value }) })] }), _jsxs("label", { children: ["Related package", _jsxs("select", { "aria-label": "Related package", value: draft.snagPackageId, onChange: (e) => setDraft({ ...draft, snagPackageId: e.target.value }), children: [_jsx("option", { value: "", children: "No package" }), context.packages.map((item) => _jsx("option", { value: item.id, children: item.title }, item.id))] })] })] }), action === "PACKAGE_PROGRESS" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Package progress target", _jsxs("select", { "aria-label": "Package progress target", required: true, value: draft.packageId, onChange: (e) => { const target = context.packages.find((item) => item.id === e.target.value); setDraft({ ...draft, packageId: e.target.value, actualPercent: target?.actualPercent ?? "", actualQuantity: target?.actualQuantity ?? "", qualityStatus: target?.qualityStatus ?? "PENDING", materialStatus: target?.materialStatus ?? "", blockers: target?.blockers ?? "", packageTomorrowPlan: target?.tomorrowPlan ?? "" }); }, children: [_jsx("option", { value: "", children: "Choose package" }), context.packages.map((item) => _jsxs("option", { value: item.id, children: [item.title, " \u00B7 version ", item.version] }, item.id))] })] }), _jsxs("label", { children: ["Actual progress (%)", _jsx("input", { "aria-label": "Actual progress (%)", type: "number", min: "0", max: "100", step: "0.01", required: true, value: draft.actualPercent, onChange: (e) => setDraft({ ...draft, actualPercent: e.target.value }) })] }), _jsxs("label", { children: ["Actual quantity", _jsx("input", { "aria-label": "Actual quantity", required: true, value: draft.actualQuantity, onChange: (e) => setDraft({ ...draft, actualQuantity: e.target.value }) })] }), _jsxs("label", { children: ["Quality status", _jsxs("select", { "aria-label": "Quality status", value: draft.qualityStatus, onChange: (e) => setDraft({ ...draft, qualityStatus: e.target.value }), children: [_jsx("option", { children: "PENDING" }), _jsx("option", { children: "PASSED" }), _jsx("option", { children: "FAILED" })] })] }), _jsxs("label", { children: ["Material status", _jsx("input", { "aria-label": "Material status", required: true, value: draft.materialStatus, onChange: (e) => setDraft({ ...draft, materialStatus: e.target.value }) })] }), _jsxs("label", { children: ["Blockers", _jsx("textarea", { "aria-label": "Blockers", value: draft.blockers, onChange: (e) => setDraft({ ...draft, blockers: e.target.value }) })] }), _jsxs("label", { children: ["Plan for tomorrow", _jsx("textarea", { "aria-label": "Plan for tomorrow", value: draft.packageTomorrowPlan, onChange: (e) => setDraft({ ...draft, packageTomorrowPlan: e.target.value }) })] })] }), action !== "MANPOWER" && _jsxs(_Fragment, { children: [_jsxs("label", { children: ["Photo upload folder", _jsxs("select", { "aria-label": "Photo upload folder", value: folderId, onChange: (e) => setFolderId(e.target.value), disabled: !props.canUpload || safeFolders.length === 0, children: [_jsx("option", { value: "", children: "No captured photos" }), safeFolders.map((folder) => _jsx("option", { value: folder.id, children: folder.name }, folder.id))] })] }), _jsxs("label", { children: ["Captured photos", _jsx("input", { "aria-label": "Captured photos", type: "file", accept: "image/*", capture: "environment", multiple: true, disabled: !props.canUpload || !folderId, onChange: (e) => setPhotos(Array.from(e.target.files ?? [])) })] })] }), _jsxs("label", { children: ["Reason for this offline command", _jsx("textarea", { name: "offlineReason", "aria-label": "Reason for this offline command", required: true, minLength: 3, maxLength: 1000 })] }), _jsx("button", { disabled: !props.canWork || Boolean(storageError), children: "Save offline draft" })] })] }), !props.canUpload && _jsx("p", { className: "site-note", children: "Photo capture is unavailable until current document upload access is confirmed." }), props.offlineOnly && _jsx("p", { role: "status", className: "site-note", children: "Local capture only. Server authentication and project authorization have not been checked. Reconnect and restore your live session before syncing." }), _jsxs("div", { className: "site-offline-queue", children: [_jsxs("div", { children: [_jsx("h3", { children: "Offline capture queue" }), _jsx("button", { type: "button", onClick: () => void syncPending(), disabled: !context || syncBusy || !navigator.onLine || props.offlineOnly, children: syncBusy ? "Syncing…" : "Sync now" })] }), queue.length === 0 ? _jsx("p", { role: "status", children: "No offline drafts for this project." }) : _jsx("ul", { children: queue.map((entry) => _jsx("li", { children: _jsxs("article", { children: [_jsxs("header", { children: [_jsxs("strong", { children: [entry.action.replaceAll("_", " "), " \u00B7 ", new Date(entry.createdAt).toLocaleString()] }), _jsx("span", { className: `site-state site-offline-${entry.status.toLowerCase()}`, children: statusMessage[entry.status] })] }), _jsx("p", { children: entry.action === "NOTE" ? String(entry.payload.note) : entry.action === "PACKAGE_PROGRESS" ? `${context?.packages.find((item) => item.id === entry.payload.recordId)?.title ?? "Package"} · base version ${entry.baseRecordVersion}` : entry.action === "SNAG" ? String(entry.payload.title) : entry.action }), entry.photos.length > 0 && _jsxs("p", { children: [entry.photos.length, " captured photo(s) stored on this device."] }), entry.error && _jsx("p", { role: "alert", children: entry.error }), entry.conflict && _jsxs("div", { className: "site-offline-conflict", children: [_jsxs("h4", { children: ["Current server values \u00B7 version ", entry.conflict.version] }), _jsx("dl", { children: conflictFields[entry.action].map(({ key, label }) => _jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: String(entry.conflict?.data[key] ?? "Not recorded") })] }, key)) }), _jsx("h4", { children: "Compare and amend local values" }), _jsx("dl", { children: conflictFields[entry.action].map(({ key, label }) => _jsxs("div", { children: [_jsx("dt", { children: label }), _jsx("dd", { children: String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? "Not recorded") })] }, key)) }), conflictFields[entry.action].map(({ key, label, multiline, number }) => _jsxs("label", { children: [label, multiline ? _jsx("textarea", { "aria-label": label, value: String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? ""), onChange: (e) => setAmendPayloads({ ...amendPayloads, [entry.key]: { ...(amendPayloads[entry.key] ?? {}), [key]: e.target.value } }) }) : _jsx("input", { "aria-label": label, type: number ? "number" : "text", value: String({ ...entry.payload, ...(amendPayloads[entry.key] ?? {}) }[key] ?? ""), onChange: (e) => setAmendPayloads({ ...amendPayloads, [entry.key]: { ...(amendPayloads[entry.key] ?? {}), [key]: number ? Number(e.target.value) : e.target.value } }) })] }, key)), _jsxs("p", { children: ["Package/photo references stay attached to the original command. Amending creates a new command using current version ", entry.conflict.version, "."] }), _jsx("button", { type: "button", onClick: () => void keepServer(entry), children: "Keep server values" }), _jsxs("label", { children: ["Amendment reason", _jsx("textarea", { "aria-label": "Amendment reason", value: amendReasons[entry.key] ?? "", onChange: (e) => setAmendReasons({ ...amendReasons, [entry.key]: e.target.value }) })] }), _jsx("button", { type: "button", disabled: (amendReasons[entry.key] ?? "").trim().length < 3, onClick: () => void amend(entry), children: "Amend and retry" })] }), entry.status !== "SYNCED" && entry.status !== "CONFLICT" && _jsx("button", { type: "button", onClick: () => void discard(entry), children: "Discard offline draft" })] }) }, entry.key)) })] })] });
}
export function SiteOfflineCaptureRoute() {
    const [state, setState] = useState({});
    useEffect(() => {
        const pointer = readOfflinePointer();
        if (!pointer) {
            setState({ unavailable: true });
            return;
        }
        void getOfflineContext(pointer.accountId, pointer.projectId).then((context) => context ? setState({ pointer, context }) : setState({ pointer, unavailable: true })).catch(() => setState({ pointer, unavailable: true }));
    }, []);
    if (!state.pointer)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Offline site capture unavailable" }), _jsxs("p", { role: "status", children: [state.unavailable ? "No prepared account and project context is available on this device." : "Checking locally prepared project context…", " Reconnect and sign in to prepare a project for offline capture."] }), _jsx("a", { href: "/", children: "Return to sign in" })] }) });
    if (!state.context)
        return _jsx("main", { className: "identity-content", children: _jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Offline site capture unavailable" }), _jsx("p", { role: "status", children: "The prepared local project context could not be opened. Reconnect and sign in before continuing." }), _jsx("a", { href: "/", children: "Return to sign in" })] }) });
    const context = state.context;
    const packages = context.packages.map((item) => ({ id: item.id, version: item.version, data: { title: item.title, actualPercent: item.actualPercent, actualQuantity: item.actualQuantity, qualityStatus: item.qualityStatus, materialStatus: item.materialStatus, blockers: item.blockers, tomorrowPlan: item.tomorrowPlan } }));
    const folders = context.folders.map((folder) => ({ ...folder, offlineUploadAllowed: true }));
    return _jsxs("main", { className: "identity-content", children: [_jsxs("section", { className: "identity-section", children: [_jsx("h1", { children: "Site capture \u00B7 local device mode" }), _jsxs("p", { role: "status", children: ["Account-bound local drafts for ", context.projectTitle, ". This screen does not prove server authentication or project access. Reconnect and sign in to sync."] })] }), _jsx(SiteOfflineCapture, { accountId: context.accountId, projectId: context.projectId, projectTitle: context.projectTitle, csrfToken: "", today: context.today, canWork: true, canUpload: true, packages: packages, folders: folders, offlineOnly: true, onAccessLost: () => setState({ unavailable: true }), onSynced: () => undefined })] });
}
