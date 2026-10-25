import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { hasPendingOfflineCommands } from "./site-offline.js";
import "./pwa-delivery.css";
export function PwaUpdateNotice() {
    const [waiting, setWaiting] = useState();
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const dismissed = useRef(undefined);
    useEffect(() => {
        if (!import.meta.env.PROD || !("serviceWorker" in navigator))
            return;
        let disposed = false;
        let registration;
        const refresh = () => {
            if (!disposed)
                setWaiting(registration?.waiting && registration.waiting !== dismissed.current ? registration.waiting : undefined);
        };
        const check = () => { if (navigator.onLine)
            void registration?.update().catch(() => undefined); refresh(); };
        const installed = () => { refresh(); };
        const found = () => registration?.installing?.addEventListener("statechange", installed);
        void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((next) => {
            if (disposed)
                return;
            registration = next;
            registration.addEventListener("updatefound", found);
            found();
            refresh();
        }).catch(() => { });
        window.addEventListener("online", check);
        window.addEventListener("focus", check);
        const timer = window.setInterval(check, 60 * 60_000);
        return () => {
            disposed = true;
            window.clearInterval(timer);
            window.removeEventListener("online", check);
            window.removeEventListener("focus", check);
            registration?.removeEventListener("updatefound", found);
        };
    }, []);
    async function apply() {
        if (!waiting || !confirmed || busy)
            return;
        setBusy(true);
        setError("");
        try {
            if (!navigator.onLine)
                throw new Error("Connect to the internet before updating.");
            if (await hasPendingOfflineCommands())
                throw new Error("Synchronize or resolve your pending site captures before updating. They remain saved on this device.");
            await new Promise((resolve, reject) => {
                const channel = new MessageChannel();
                const activated = () => { if (waiting.state === "activated")
                    window.location.reload(); };
                const timeout = window.setTimeout(() => { channel.port1.close(); waiting.removeEventListener("statechange", activated); reject(new Error("The update could not be checked. Your current app is still available; try again later.")); }, 10_000);
                channel.port1.onmessage = (event) => {
                    window.clearTimeout(timeout);
                    channel.port1.close();
                    if (!event.data.ok) {
                        waiting.removeEventListener("statechange", activated);
                        reject(new Error("Close all other tabs and windows of this app, then try again."));
                    }
                    else {
                        activated();
                        resolve();
                    }
                };
                waiting.addEventListener("statechange", activated);
                waiting.postMessage({ type: "SENSE_ACTIVATE_UPDATE" }, [channel.port2]);
            });
        }
        catch (failure) {
            setError(failure instanceof Error ? failure.message : "Unable to check saved site captures. Finish your work and try again later.");
        }
        finally {
            setBusy(false);
        }
    }
    if (!waiting)
        return null;
    return _jsxs("aside", { className: "pwa-update", "aria-label": "App update", children: [_jsxs("div", { children: [_jsx("strong", { children: "A new version is ready" }), _jsx("p", { children: "Update when you have finished your current work. Saved site captures will not be deleted." })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: confirmed, onChange: (event) => setConfirmed(event.target.checked) }), " I saved my work and closed other app tabs."] }), error && _jsx("p", { role: "alert", children: error }), _jsxs("div", { className: "pwa-actions", children: [_jsx("button", { type: "button", disabled: !confirmed || busy, onClick: () => void apply(), children: busy ? "Checking…" : "Update and reload" }), _jsx("button", { type: "button", className: "pwa-secondary", disabled: busy, onClick: () => { dismissed.current = waiting; setWaiting(undefined); setConfirmed(false); setError(""); }, children: "Later" })] })] });
}
export function PhoneInstall() {
    const [prompt, setPrompt] = useState();
    const [notice, setNotice] = useState("");
    useEffect(() => {
        const available = (event) => { event.preventDefault(); setPrompt(event); };
        const installed = () => { setPrompt(undefined); setNotice("The app is installed. Open Sense Studios from your home screen and sign in with your own passkey."); };
        window.addEventListener("beforeinstallprompt", available);
        window.addEventListener("appinstalled", installed);
        return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", installed); };
    }, []);
    async function install() {
        if (!prompt)
            return;
        try {
            await prompt.prompt();
            const choice = await prompt.userChoice;
            setNotice(choice.outcome === "accepted" ? "Follow your phone’s installation steps, then open Sense Studios from your home screen." : "You can install later or continue in your browser.");
        }
        catch {
            setNotice("Use your browser’s Install app or Add to Home Screen menu, or continue in your browser.");
        }
        finally {
            setPrompt(undefined);
        }
    }
    return _jsxs("main", { className: "phone-install", children: [_jsxs(Link, { to: "/", className: "phone-install-brand", children: [_jsx("img", { src: "/icon.svg", width: "48", height: "48", alt: "" }), _jsx("span", { children: "Sense Studios" })] }), _jsx("h1", { children: "Your work, on your phone" }), _jsx("p", { className: "phone-install-intro", children: "Employees, site workers and the Owner use the same app. Your own account controls what you can see and do." }), prompt && _jsx("button", { type: "button", onClick: () => void install(), children: "Install Sense Studios" }), notice && _jsx("p", { role: "status", className: "notice", children: notice }), _jsxs("section", { children: [_jsx("h2", { children: "Android" }), _jsxs("ol", { children: [_jsx("li", { children: "Open this address in Chrome." }), _jsxs("li", { children: ["Open the browser menu and choose ", _jsx("strong", { children: "Install app" }), " or ", _jsx("strong", { children: "Add to Home screen" }), "."] }), _jsx("li", { children: "Open Sense Studios from your home screen, then sign in with your own passkey." })] })] }), _jsxs("section", { children: [_jsx("h2", { children: "iPhone" }), _jsxs("ol", { children: [_jsx("li", { children: "Open this address in Safari." }), _jsxs("li", { children: ["Choose ", _jsx("strong", { children: "Share \u2192 Add to Home Screen" }), ". Enable ", _jsx("strong", { children: "Open as Web App" }), " if shown, then tap ", _jsx("strong", { children: "Add" }), "."] }), _jsx("li", { children: "Open the new icon and sign in. If you cannot sign in, ask the Owner for account recovery." })] })] }), _jsxs("section", { children: [_jsx("h2", { children: "Before going to a site" }), _jsx("p", { children: "While online, open your assigned site and prepare its offline capture context. Supported notes, new photos, report drafts, snags and progress can be saved locally. Reopen the app online to synchronize and resolve any conflicts." }), _jsxs("p", { children: ["Check that captures show ", _jsx("strong", { children: "Synchronized" }), " before clearing browser storage, reinstalling or changing phones. Pending captures exist only on this device. Approvals and other unsupported actions need an online connection."] })] }), _jsxs("section", { children: [_jsx("h2", { children: "Keep access secure" }), _jsx("p", { children: "Use your own account and a phone screen lock. Report a lost phone to the Owner promptly. Launch alerts are available in the app and by configured email; installation alone does not enable lock-screen notifications." })] }), _jsx(Link, { to: "/", className: "home-link", children: "Open Sense Studios" })] });
}
