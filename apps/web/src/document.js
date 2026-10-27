import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import "./document.css";
const API = "/api/v1";
function statusOf(error) { return error instanceof Error ? error.status ?? 0 : 0; }
async function json(response) {
    if (!response.ok)
        throw Object.assign(new Error("request-failed"), { status: response.status });
    return response.json();
}
function humanSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes;
    let index = -1;
    do {
        value /= 1024;
        index += 1;
    } while (value >= 1024 && index < units.length - 1);
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
function sha256Hex(bytes) {
    return crypto.subtle.digest("SHA-256", bytes).then((digest) => [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}
function errorText(error) {
    const status = statusOf(error);
    if (status === 403 || status === 404)
        return "You do not have access to this project’s document register.";
    if (status === 409)
        return "The project or document state changed. Refresh the register and try again.";
    if (status === 413)
        return "This file is larger than the server’s configured upload limit.";
    if (status >= 500)
        return "Document storage or service is unavailable. Try again shortly.";
    return "The document service could not complete the request. Try again.";
}
export function DocumentWorkspace({ csrfToken, owner = true }) {
    const initialProjectId = useRef(new URLSearchParams(window.location.search).get("projectId") ?? "");
    const [setup, setSetup] = useState();
    const [branchId, setBranchId] = useState("");
    const [projects, setProjects] = useState([]);
    const [projectTotal, setProjectTotal] = useState(0);
    const [projectOffset, setProjectOffset] = useState(0);
    const [projectQuery, setProjectQuery] = useState("");
    const [appliedProjectQuery, setAppliedProjectQuery] = useState("");
    const [pickerReady, setPickerReady] = useState(false);
    const [projectId, setProjectId] = useState("");
    const [register, setRegister] = useState();
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [grants, setGrants] = useState([]);
    const [grantsLoading, setGrantsLoading] = useState(false);
    const [grantsError, setGrantsError] = useState("");
    const [folderId, setFolderId] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [provisioningFolderId, setProvisioningFolderId] = useState("");
    const [denied, setDenied] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [folderName, setFolderName] = useState("");
    const [folderParentId, setFolderParentId] = useState("");
    const [folderConfidential, setFolderConfidential] = useState(false);
    const [file, setFile] = useState();
    const [confidential, setConfidential] = useState(false);
    const [viewOnly, setViewOnly] = useState(false);
    const [reason, setReason] = useState("");
    const [activeUpload, setActiveUpload] = useState();
    const [grantKind, setGrantKind] = useState("FOLDER");
    const [grantResourceId, setGrantResourceId] = useState("");
    const [grantEmployeeId, setGrantEmployeeId] = useState("");
    const [grantReason, setGrantReason] = useState("");
    const generation = useRef(0);
    const pageSize = 50;
    const clearRegister = () => {
        setRegister(undefined);
        setFolders([]);
        setFiles([]);
        setGrants([]);
        setGrantsError("");
        setGrantsLoading(false);
        setFolderId("");
    };
    const pickerUrl = (offset, selectedBranch = branchId, query = appliedProjectQuery) => {
        const params = new URLSearchParams({ offset: String(offset), limit: String(pageSize) });
        if (selectedBranch)
            params.set("branchId", selectedBranch);
        if (query)
            params.set("q", query);
        return `${API}/documents/project-picker?${params.toString()}`;
    };
    const loadProjectPage = useCallback(async (offset, selectedBranch = "", query = "", token = generation.current) => {
        const result = await json(await fetch(pickerUrl(offset, selectedBranch, query), { credentials: "include", cache: "no-store" }));
        if (token !== generation.current)
            return;
        setSetup({ branches: result.branches });
        setPickerReady(true);
        setProjects(result.items);
        setProjectTotal(result.total);
        setProjectOffset(offset);
        setBranchId(selectedBranch && result.branches.some((branch) => branch.id === selectedBranch) ? selectedBranch : "");
        setProjectId("");
        clearRegister();
    }, [branchId, appliedProjectQuery]);
    const loadRegister = useCallback(async (id, token = generation.current) => {
        const value = await json(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}`, { credentials: "include", cache: "no-store" }));
        if (token !== generation.current)
            return "";
        setRegister(value);
        setFolders(value.folders);
        setFiles(value.files);
        setFolderId((current) => value.folders.some((folder) => folder.id === current) ? current : value.folders[0]?.id ?? "");
        if (value.capabilities.grant) {
            setGrantsLoading(true);
            setGrantsError("");
            try {
                const grantPage = await json(await fetch(`${API}/documents/projects/${encodeURIComponent(id)}/grants`, { credentials: "include", cache: "no-store" }));
                if (token !== generation.current)
                    return "";
                setGrants(grantPage.items);
            }
            catch (cause) {
                if (token === generation.current) {
                    setGrants([]);
                    setGrantsError(errorText(cause));
                }
            }
            finally {
                if (token === generation.current)
                    setGrantsLoading(false);
            }
        }
        else {
            setGrants([]);
            setGrantsError("");
            setGrantsLoading(false);
        }
        return value.project.id;
    }, []);
    const loadSetup = useCallback(async () => {
        const token = ++generation.current;
        setLoading(true);
        setError("");
        setDenied(false);
        clearRegister();
        try {
            if (owner) {
                const result = await json(await fetch(`${API}/projects/setup`, { credentials: "include", cache: "no-store" }));
                if (token !== generation.current)
                    return;
                setEmployees(result.employees ?? []);
            }
            else
                setEmployees([]);
            await loadProjectPage(0, "", appliedProjectQuery, token);
            const deepLinkedProjectId = initialProjectId.current;
            if (deepLinkedProjectId) {
                try {
                    const authorizedProjectId = await loadRegister(deepLinkedProjectId, token);
                    if (token === generation.current) {
                        setProjectId(authorizedProjectId);
                        initialProjectId.current = "";
                    }
                }
                catch (cause) {
                    if (token === generation.current) {
                        if (statusOf(cause) === 403 || statusOf(cause) === 404)
                            initialProjectId.current = "";
                        setProjectId("");
                        clearRegister();
                    }
                    throw cause;
                }
            }
        }
        catch (cause) {
            if (token !== generation.current)
                return;
            clearRegister();
            setProjectId("");
            setProjects([]);
            setProjectTotal(0);
            if (initialProjectId.current && (statusOf(cause) === 403 || statusOf(cause) === 404))
                initialProjectId.current = "";
            if (statusOf(cause) === 403 || statusOf(cause) === 404)
                setDenied(true);
            else
                setError(errorText(cause));
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    }, [owner, appliedProjectQuery, loadProjectPage, loadRegister]);
    useEffect(() => { void loadSetup(); return () => { generation.current += 1; }; }, []);
    const refresh = async () => {
        if (busy)
            return;
        if (initialProjectId.current) {
            await loadSetup();
            return;
        }
        const token = ++generation.current;
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            if (projectId)
                await loadRegister(projectId, token);
            else
                await loadProjectPage(projectOffset, branchId, appliedProjectQuery, token);
        }
        catch (cause) {
            if (token !== generation.current)
                return;
            clearRegister();
            if (statusOf(cause) === 403 || statusOf(cause) === 404)
                setDenied(true);
            else
                setError(errorText(cause));
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    };
    const selectBranch = async (id) => {
        if (busy || activeUpload)
            return;
        initialProjectId.current = "";
        const token = ++generation.current;
        setBranchId(id);
        setProjectId("");
        clearRegister();
        setProjects([]);
        setProjectTotal(0);
        setProjectOffset(0);
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            await loadProjectPage(0, id, appliedProjectQuery, token);
        }
        catch (cause) {
            if (token === generation.current) {
                setProjects([]);
                setProjectTotal(0);
                clearRegister();
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    };
    const selectProject = async (id) => {
        if (busy || activeUpload)
            return;
        initialProjectId.current = "";
        const token = ++generation.current;
        setProjectId(id);
        clearRegister();
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            if (id)
                await loadRegister(id, token);
        }
        catch (cause) {
            if (token === generation.current) {
                clearRegister();
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    };
    const applyProjectSearch = async () => {
        if (busy || activeUpload)
            return;
        initialProjectId.current = "";
        const query = projectQuery.trim().slice(0, 160);
        const token = ++generation.current;
        setAppliedProjectQuery(query);
        setProjectId("");
        clearRegister();
        setProjects([]);
        setProjectTotal(0);
        setProjectOffset(0);
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            await loadProjectPage(0, branchId, query, token);
        }
        catch (cause) {
            if (token === generation.current) {
                clearRegister();
                setProjects([]);
                setProjectTotal(0);
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    };
    const changeProjectPage = async (offset) => {
        if (busy || activeUpload || offset < 0 || offset >= projectTotal)
            return;
        initialProjectId.current = "";
        const token = ++generation.current;
        setProjectId("");
        clearRegister();
        setLoading(true);
        setError("");
        setDenied(false);
        try {
            await loadProjectPage(offset, branchId, appliedProjectQuery, token);
        }
        catch (cause) {
            if (token === generation.current) {
                clearRegister();
                setProjects([]);
                setProjectTotal(0);
                if (statusOf(cause) === 403 || statusOf(cause) === 404)
                    setDenied(true);
                else
                    setError(errorText(cause));
            }
        }
        finally {
            if (token === generation.current)
                setLoading(false);
        }
    };
    const post = async (url, body) => json(await fetch(url, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body),
    }));
    const createFolder = async (event) => {
        event.preventDefault();
        if (!projectId || busy || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/folders`, { name: folderName.trim(), ...(folderParentId ? { parentId: folderParentId } : {}), confidential: folderConfidential, reason: reason.trim() });
            setFolderName("");
            setFolderParentId("");
            setFolderConfidential(false);
            setReason("");
            setNotice("Folder created.");
            await loadRegister(projectId);
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const createGrant = async (event) => {
        event.preventDefault();
        if (!projectId || !register?.capabilities.grant || busy || !grantResourceId || !grantEmployeeId || grantReason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        setGrantsError("");
        try {
            await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/grants`, { resourceKind: grantKind, resourceId: grantResourceId, employeeId: grantEmployeeId, reason: grantReason.trim() });
            setGrantReason("");
            setNotice("Confidential access granted.");
            await loadRegister(projectId);
        }
        catch (cause) {
            setGrantsError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const revokeGrant = async (grant) => {
        if (!register?.capabilities.grant || busy || grantReason.trim().length < 3) {
            setGrantsError("Enter a reason of at least 3 characters before revoking access.");
            return;
        }
        setBusy(true);
        setGrantsError("");
        setError("");
        setNotice("");
        try {
            await post(`${API}/documents/grants/${encodeURIComponent(grant.id)}/revoke`, { reason: grantReason.trim() });
            setGrantReason("");
            setNotice("Document access revoked.");
            await loadRegister(projectId);
        }
        catch (cause) {
            setGrantsError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const clearProjectSearch = () => {
        if (busy || activeUpload)
            return;
        setProjectQuery("");
        const token = ++generation.current;
        setAppliedProjectQuery("");
        setProjectId("");
        clearRegister();
        setProjects([]);
        setProjectTotal(0);
        setProjectOffset(0);
        setLoading(true);
        setError("");
        setDenied(false);
        void loadProjectPage(0, branchId, "", token).catch((cause) => {
            if (token !== generation.current)
                return;
            clearRegister();
            setProjects([]);
            setProjectTotal(0);
            if (statusOf(cause) === 403 || statusOf(cause) === 404)
                setDenied(true);
            else
                setError(errorText(cause));
        }).finally(() => { if (token === generation.current)
            setLoading(false); });
    };
    const provisionTemplateFolders = async () => {
        if (!projectId || !register?.capabilities.createFolder || busy)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/provision-template`, {});
            await loadRegister(projectId);
            setNotice("Applied template folders are set up. Any failed folders are listed for retry.");
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const retryFolderProvision = async (folder) => {
        if (!register?.capabilities.createFolder || busy)
            return;
        setBusy(true);
        setProvisioningFolderId(folder.id);
        setError("");
        setNotice("");
        try {
            await post(`${API}/documents/folders/${encodeURIComponent(folder.id)}/retry`, {});
            await loadRegister(projectId);
            setNotice(`${folder.name} storage provisioning was retried. Its current status is shown in the folder list.`);
        }
        catch (cause) {
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
            setProvisioningFolderId("");
        }
    };
    const beginUpload = async () => {
        if (!projectId || !folderId || !file || busy || reason.trim().length < 3)
            return;
        setBusy(true);
        setError("");
        setNotice("");
        try {
            const init = await post(`${API}/documents/projects/${encodeURIComponent(projectId)}/uploads`, { folderId, fileName: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size, confidential, viewOnly, reason: reason.trim() });
            await uploadChunks({ file, uploadId: init.uploadId, chunkSize: init.chunkSize, chunkIndex: 0, chunks: Math.ceil(file.size / init.chunkSize), confidential, viewOnly, reason: reason.trim(), folderId, phase: "chunks" });
        }
        catch (cause) {
            setError(errorText(cause));
            setBusy(false);
        }
    };
    const uploadChunks = async (upload) => {
        setActiveUpload(upload);
        let nextIndex = upload.chunkIndex;
        try {
            if (upload.phase === "chunks") {
                for (; nextIndex < upload.chunks; nextIndex += 1) {
                    const start = nextIndex * upload.chunkSize;
                    const bytes = await upload.file.slice(start, Math.min(start + upload.chunkSize, upload.file.size)).arrayBuffer();
                    const hash = await sha256Hex(bytes);
                    const response = await fetch(`${API}/documents/uploads/${encodeURIComponent(upload.uploadId)}/chunks/${nextIndex}`, {
                        method: "PUT", credentials: "include", headers: { "Content-Type": "application/octet-stream", "X-Chunk-Sha256": hash, "X-CSRF-Token": csrfToken }, body: bytes,
                    });
                    if (!response.ok)
                        throw Object.assign(new Error("chunk-failed"), { status: response.status });
                    setActiveUpload({ ...upload, chunkIndex: nextIndex + 1 });
                }
            }
            setActiveUpload({ ...upload, chunkIndex: upload.chunks, phase: "finalize" });
            const result = await post(`${API}/documents/uploads/${encodeURIComponent(upload.uploadId)}/finalize`, {});
            setFiles((current) => [result, ...current.filter((entry) => entry.id !== result.id)]);
            setFile(undefined);
            setReason("");
            setActiveUpload(undefined);
            setNotice("File uploaded and registered.");
            await loadRegister(projectId);
        }
        catch (cause) {
            setActiveUpload({ ...upload, chunkIndex: nextIndex, phase: nextIndex >= upload.chunks ? "finalize" : "chunks" });
            setError(errorText(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const progress = activeUpload ? activeUpload.phase === "finalize" ? 100 : Math.floor(activeUpload.chunkIndex / Math.max(1, activeUpload.chunks) * 100) : 0;
    const grantResources = grantKind === "FOLDER" ? folders.map((folder) => ({ id: folder.id, label: `${folder.name}${folder.confidential ? " · Confidential folder" : ""}` })) : files.map((entry) => ({ id: entry.id, label: `${entry.fileName}${entry.confidential ? " · Confidential file" : ""}` }));
    const resourceLabel = (grant) => grant.resourceKind === "FOLDER" ? folders.find((folder) => folder.id === grant.resourceId)?.name ?? "Unavailable folder" : files.find((entry) => entry.id === grant.resourceId)?.fileName ?? "Unavailable file";
    const employeeLabel = (id) => employees.find((employee) => employee.id === id)?.name ?? "Former or unavailable employee";
    const contextLocked = busy || !!activeUpload;
    const pickerProjects = register && !projects.some((project) => project.id === register.project.id) ? [...projects, register.project] : projects;
    return _jsxs("section", { className: "document-workspace", "aria-labelledby": "documents-heading", children: [_jsxs("header", { className: "document-header", children: [_jsxs("div", { children: [_jsx("p", { className: "document-eyebrow", children: "PROJECT RECORDS" }), _jsx("h2", { id: "documents-heading", children: "Documents" }), _jsx("p", { children: "Project files are stored and served through the authorized document service." })] }), _jsx("button", { type: "button", onClick: () => void refresh(), disabled: loading || busy, children: "Refresh" })] }), error && _jsxs("p", { className: "document-error", role: "alert", children: [error, " ", _jsx("button", { type: "button", onClick: () => void refresh(), disabled: loading || busy, children: "Try again" })] }), denied && _jsx("p", { className: "document-denied", role: "alert", children: "You are not authorized to view this document register. Ask the Owner to review your project assignment and document grants." }), notice && _jsx("p", { className: "document-notice", role: "status", children: notice }), loading && _jsx("p", { role: "status", className: "document-muted", children: "Loading project document access\u2026" }), pickerReady && !error && _jsxs(_Fragment, { children: [setup?.branches.length ? _jsxs("label", { className: "document-picker", children: ["Owning branch", _jsxs("select", { "aria-label": "Document project branch", value: branchId, onChange: (event) => void selectBranch(event.target.value), disabled: contextLocked, children: [_jsx("option", { value: "", children: "All authorized branches" }), setup.branches.map((branch) => _jsx("option", { value: branch.id, children: branch.name }, branch.id))] })] }) : !denied && !register && _jsx("p", { className: "document-muted", role: "status", children: "No project documents are available to you. Project access and document access are separate. Ask the Owner to check your project assignment and document permissions." }), setup?.branches.length ? _jsxs("form", { className: "document-project-search", onSubmit: (event) => { event.preventDefault(); void applyProjectSearch(); }, children: [_jsx("label", { htmlFor: "document-project-search", children: "Search project titles" }), _jsxs("div", { children: [_jsx("input", { id: "document-project-search", value: projectQuery, maxLength: 160, onChange: (event) => setProjectQuery(event.target.value.slice(0, 160)), placeholder: "Search projects", disabled: contextLocked }), _jsx("button", { type: "submit", disabled: loading || contextLocked, children: "Search" }), appliedProjectQuery && _jsx("button", { type: "button", onClick: clearProjectSearch, disabled: loading || contextLocked, children: "Clear search" })] })] }) : null, setup?.branches.length ? _jsxs("label", { className: "document-picker", children: ["Project", _jsxs("select", { "aria-label": "Document project", value: projectId, onChange: (event) => void selectProject(event.target.value), disabled: contextLocked, children: [_jsx("option", { value: "", children: "Choose a project" }), pickerProjects.map((project) => _jsx("option", { value: project.id, children: project.title }, project.id))] })] }) : null, setup?.branches.length ? _jsxs("nav", { className: "document-project-pagination", "aria-label": "Project picker pages", children: [_jsx("span", { children: projectTotal ? `Showing ${projectOffset + 1}–${Math.min(projectOffset + projects.length, projectTotal)} of ${projectTotal} projects` : "No matching projects" }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => void changeProjectPage(projectOffset - pageSize), disabled: loading || contextLocked || projectOffset === 0, children: "Previous" }), _jsx("button", { type: "button", onClick: () => void changeProjectPage(projectOffset + pageSize), disabled: loading || contextLocked || projectOffset + pageSize >= projectTotal, children: "Next" })] })] }) : null, !projectId && !loading && projects.length === 0 && setup?.branches.length ? _jsx("p", { role: "status", className: "document-muted", children: "No projects match this branch and search." }) : null, register && _jsxs(_Fragment, { children: [_jsxs("div", { className: "document-register-heading", children: [_jsxs("div", { children: [_jsx("span", { className: "document-eyebrow", children: "REGISTER" }), _jsx("h3", { children: register.project.title })] }), _jsxs("span", { children: [files.length, " ", files.length === 1 ? "file" : "files"] })] }), register.capabilities.createFolder && _jsxs("div", { className: "document-provision-toolbar", children: [_jsx("p", { className: "document-muted", children: "Set up physical folders from the project\u2019s applied template. Failed folder operations can be retried below." }), _jsx("button", { type: "button", onClick: () => void provisionTemplateFolders(), disabled: busy, children: busy ? "Setting up…" : "Set up template folders" })] }), _jsxs("div", { className: "document-columns", children: [_jsxs("section", { className: "document-panel", children: [_jsx("h3", { children: "Files" }), folders.length > 0 && _jsxs("label", { className: "document-picker", children: ["Folder", _jsxs("select", { "aria-label": "Filter files by folder", value: folderId, onChange: (event) => setFolderId(event.target.value), children: [_jsx("option", { value: "", children: "All project folders" }), folders.map((folder) => _jsxs("option", { value: folder.id, children: [folder.name, folder.confidential ? " · Confidential" : ""] }, folder.id))] })] }), files.length === 0 ? _jsx("p", { role: "status", className: "document-muted", children: "No files have been registered for this project." }) : _jsx("ul", { className: "document-file-list", children: files.filter((entry) => !folderId || entry.folderId === folderId).map((entry) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: entry.fileName }), _jsxs("small", { children: [humanSize(entry.sizeBytes), " \u00B7 ", new Date(entry.createdAt).toLocaleDateString(), " \u00B7 ", entry.confidential ? "Confidential" : "Project file", entry.viewOnly ? " · View only" : ""] }), _jsxs("small", { children: ["SHA-256 ", entry.sha256] })] }), _jsx("a", { className: "document-download", href: `${API}/documents/files/${encodeURIComponent(entry.id)}/stream`, children: "Download" })] }, entry.id)) }), folders.length > 0 && _jsxs(_Fragment, { children: [_jsx("h4", { children: "Project folders" }), _jsx("ul", { className: "document-folder-list", children: folders.map((folder) => _jsxs("li", { children: [_jsxs("div", { children: [_jsxs("strong", { children: [folder.name, folder.confidential ? " · Confidential" : ""] }), _jsx("small", { children: folder.provisionState === "READY" ? "Storage ready" : folder.provisionState === "FAILED" ? "Storage setup failed" : folder.provisionState ? "Storage setup pending" : "Provisioning state unavailable" }), folder.provisionError && _jsx("small", { className: "document-folder-error", children: folder.provisionError })] }), folder.provisionState === "FAILED" && register.capabilities.createFolder && _jsx("button", { type: "button", onClick: () => void retryFolderProvision(folder), disabled: busy, "aria-label": `Retry storage setup for ${folder.name}`, children: provisioningFolderId === folder.id ? "Retrying…" : "Retry provisioning" })] }, folder.id)) })] })] }), _jsxs("div", { className: "document-forms", children: [register.capabilities.createFolder && _jsxs("form", { className: "document-panel document-form", onSubmit: (event) => void createFolder(event), children: [_jsx("h3", { children: "Create folder" }), _jsxs("label", { children: ["Folder name", _jsx("input", { value: folderName, onChange: (event) => setFolderName(event.target.value), minLength: 1, maxLength: 120, required: true })] }), _jsxs("label", { children: ["Parent folder", _jsxs("select", { value: folderParentId, onChange: (event) => setFolderParentId(event.target.value), children: [_jsx("option", { value: "", children: "Project root" }), folders.map((folder) => _jsx("option", { value: folder.id, children: folder.name }, folder.id))] })] }), _jsxs("label", { className: "document-check", children: [_jsx("input", { type: "checkbox", checked: folderConfidential, onChange: (event) => setFolderConfidential(event.target.checked) }), " Confidential folder"] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "document-primary", type: "submit", disabled: busy || !folderName.trim() || reason.trim().length < 3, children: busy ? "Saving…" : "Create folder" })] }), register.capabilities.upload && _jsxs("section", { className: "document-panel document-form", children: [_jsx("h3", { children: "Upload file" }), _jsxs("label", { children: ["Destination folder", _jsxs("select", { "aria-label": "Upload destination folder", value: folderId, onChange: (event) => setFolderId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose folder" }), folders.map((folder) => _jsxs("option", { value: folder.id, children: [folder.name, folder.confidential ? " · Confidential" : ""] }, folder.id))] })] }), _jsxs("label", { children: ["File", _jsx("input", { type: "file", onChange: (event) => setFile(event.target.files?.[0]), disabled: !!activeUpload })] }), _jsxs("label", { className: "document-check", children: [_jsx("input", { type: "checkbox", checked: confidential, onChange: (event) => setConfidential(event.target.checked) }), " Confidential file"] }), _jsxs("label", { className: "document-check", children: [_jsx("input", { type: "checkbox", checked: viewOnly, onChange: (event) => setViewOnly(event.target.checked) }), " Mark as view only"] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: reason, onChange: (event) => setReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), !activeUpload ? _jsx("button", { className: "document-primary", type: "button", onClick: () => void beginUpload(), disabled: busy || !file || !folderId || reason.trim().length < 3, children: busy ? "Preparing upload…" : "Upload and register" }) : _jsxs("div", { className: "document-progress", "aria-live": "polite", children: [_jsxs("div", { children: [_jsx("strong", { children: activeUpload.file.name }), _jsxs("span", { children: [progress, "% \u00B7 ", activeUpload.phase === "finalize" ? "Finalizing" : `Chunk ${Math.min(activeUpload.chunkIndex + 1, activeUpload.chunks)} of ${activeUpload.chunks}`] })] }), _jsx("progress", { value: progress, max: "100" }), _jsx("button", { className: "document-primary", type: "button", onClick: () => void uploadChunks(activeUpload), disabled: busy, children: busy ? "Uploading…" : "Retry upload" })] }), file && !activeUpload && _jsxs("p", { className: "document-muted", children: [humanSize(file.size), " \u00B7 Upload sends one verified chunk at a time."] })] })] })] }), register.capabilities.grant && _jsxs("section", { className: "document-panel document-grants", "aria-labelledby": "document-grants-heading", children: [_jsxs("div", { className: "document-grants-heading", children: [_jsxs("div", { children: [_jsx("p", { className: "document-eyebrow", children: "OWNER ACCESS" }), _jsx("h3", { id: "document-grants-heading", children: "Confidential access" })] }), _jsx("button", { type: "button", onClick: () => void loadRegister(projectId), disabled: busy || grantsLoading, children: "Refresh grants" })] }), _jsx("p", { className: "document-muted", children: "Grant access to a confidential folder or file for an active project employee. A confidential folder needs a folder grant, and each confidential file inside it also needs its own file grant." }), grantsError && _jsx("p", { className: "document-error", role: "alert", children: grantsError }), _jsxs("form", { className: "document-grant-form", onSubmit: (event) => void createGrant(event), children: [_jsxs("label", { children: ["Resource type", _jsxs("select", { value: grantKind, onChange: (event) => { setGrantKind(event.target.value); setGrantResourceId(""); }, children: [_jsx("option", { value: "FOLDER", children: "Folder" }), _jsx("option", { value: "FILE", children: "File" })] })] }), _jsxs("label", { children: ["Folder or file", _jsxs("select", { value: grantResourceId, onChange: (event) => setGrantResourceId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose resource" }), grantResources.map((resource) => _jsx("option", { value: resource.id, children: resource.label }, resource.id))] })] }), _jsxs("label", { children: ["Project employee", _jsxs("select", { value: grantEmployeeId, onChange: (event) => setGrantEmployeeId(event.target.value), required: true, children: [_jsx("option", { value: "", children: "Choose employee" }), employees.map((employee) => _jsx("option", { value: employee.id, children: employee.name }, employee.id))] })] }), _jsxs("label", { children: ["Reason", _jsx("input", { value: grantReason, onChange: (event) => setGrantReason(event.target.value), minLength: 3, maxLength: 1000, required: true })] }), _jsx("button", { className: "document-primary", type: "submit", disabled: busy || !grantResourceId || !grantEmployeeId || grantReason.trim().length < 3, children: busy ? "Saving…" : "Grant access" })] }), _jsx("h4", { children: "Active grants" }), grantsLoading ? _jsx("p", { className: "document-muted", role: "status", children: "Loading access grants\u2026" }) : grants.length === 0 ? _jsx("p", { className: "document-muted", role: "status", children: "No confidential access grants are active." }) : _jsx("ul", { className: "document-grant-list", children: grants.map((grant) => _jsxs("li", { children: [_jsxs("div", { children: [_jsx("strong", { children: resourceLabel(grant) }), _jsxs("small", { children: [grant.resourceKind === "FOLDER" ? "Folder" : "File", " \u00B7 ", employeeLabel(grant.employeeId), " \u00B7 Granted ", new Date(grant.grantedAt).toLocaleDateString()] }), _jsxs("small", { children: ["Reason: ", grant.reason] })] }), _jsx("button", { type: "button", onClick: () => void revokeGrant(grant), disabled: busy || grantReason.trim().length < 3, "aria-label": `Revoke access for ${employeeLabel(grant.employeeId)} to ${resourceLabel(grant)}`, children: "Revoke" })] }, grant.id)) }), grants.length > 0 && _jsx("p", { className: "document-muted", children: "Enter a reason above before revoking a grant." })] })] })] })] });
}
