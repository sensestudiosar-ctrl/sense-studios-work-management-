import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const frontend = { commit: import.meta.env.VITE_SENSE_RELEASE_COMMIT ?? "development", buildId: import.meta.env.VITE_SENSE_BUILD_ID ?? "development", builtAt: import.meta.env.VITE_SENSE_BUILT_AT ?? "" };
export function ReleaseStatus({ build = frontend }) {
    const [api, setApi] = useState(null);
    const [unavailable, setUnavailable] = useState(false);
    useEffect(() => {
        if (build.commit === "development")
            return;
        let live = true;
        let controller;
        let requestId = 0;
        const read = async () => {
            const id = ++requestId;
            controller?.abort();
            const current = new AbortController();
            controller = current;
            const signal = current.signal;
            const timeout = window.setTimeout(() => current.abort(), 5000);
            try {
                const response = await fetch("/api/v1/health/release", { cache: "no-store", credentials: "omit", signal });
                const value = await response.json();
                if (!response.ok || !/^[a-f0-9]{40}$/.test(value.commit) || typeof value.buildId !== "string")
                    throw new Error("Release unavailable");
                if (live && id === requestId) {
                    setApi(value);
                    setUnavailable(false);
                }
            }
            catch {
                if (live && id === requestId) {
                    setUnavailable(true);
                    setApi(null);
                }
            }
            finally {
                window.clearTimeout(timeout);
            }
        };
        void read();
        const timer = window.setInterval(() => { void read(); }, 30000);
        const visible = () => { if (document.visibilityState === "visible")
            void read(); };
        document.addEventListener("visibilitychange", visible);
        return () => { live = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
    }, [build.commit]);
    if (build.commit === "development")
        return null;
    const mismatch = api && (api.commit !== build.commit || api.buildId !== build.buildId);
    return _jsxs("aside", { className: "release-status", "aria-label": "Deployed release", children: [mismatch && _jsx("p", { role: "alert", children: "A different approved release is available. Save your work, then reload this page." }), unavailable && _jsx("p", { role: "status", children: "API unavailable. This page cannot verify the current server release." }), _jsxs("details", { children: [_jsxs("summary", { children: ["Release ", build.commit.slice(0, 8), " \u00B7 API ", api ? api.commit.slice(0, 8) : unavailable ? "unavailable" : "checking"] }), _jsxs("p", { children: ["Frontend: ", build.commit, " \u00B7 ", build.buildId] }), _jsxs("p", { children: ["API: ", api ? `${api.commit} · ${api.buildId}` : "Not verified"] }), _jsxs("p", { children: ["Built: ", build.builtAt] })] })] });
}
