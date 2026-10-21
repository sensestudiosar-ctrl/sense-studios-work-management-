import { useEffect, useState } from "react";

type Build = { commit: string; buildId: string; builtAt: string };
const frontend: Build = { commit: import.meta.env.VITE_SENSE_RELEASE_COMMIT ?? "development", buildId: import.meta.env.VITE_SENSE_BUILD_ID ?? "development", builtAt: import.meta.env.VITE_SENSE_BUILT_AT ?? "" };

export function ReleaseStatus({ build = frontend }: { build?: Build }): React.JSX.Element | null {
  const [api, setApi] = useState<Build | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (build.commit === "development") return;
    let live = true;
    let controller: AbortController | undefined;
    let requestId = 0;
    const read = async () => {
      const id = ++requestId;
      controller?.abort(); const current = new AbortController(); controller = current;
      const signal = current.signal;
      const timeout = window.setTimeout(() => current.abort(), 5000);
      try {
        const response = await fetch("/api/v1/health/release", { cache: "no-store", credentials: "omit", signal });
        const value = await response.json() as Build;
        if (!response.ok || !/^[a-f0-9]{40}$/.test(value.commit) || typeof value.buildId !== "string") throw new Error("Release unavailable");
        if (live && id === requestId) { setApi(value); setUnavailable(false); }
      } catch { if (live && id === requestId) { setUnavailable(true); setApi(null); } }
      finally { window.clearTimeout(timeout); }
    };
    void read(); const timer = window.setInterval(() => { void read(); }, 30000);
    const visible = () => { if (document.visibilityState === "visible") void read(); };
    document.addEventListener("visibilitychange", visible);
    return () => { live = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [build.commit]);
  if (build.commit === "development") return null;
  const mismatch = api && (api.commit !== build.commit || api.buildId !== build.buildId);
  return <aside className="release-status" aria-label="Deployed release">
    {mismatch && <p role="alert">A different approved release is available. Save your work, then reload this page.</p>}
    {unavailable && <p role="status">API unavailable. This page cannot verify the current server release.</p>}
    <details><summary>Release {build.commit.slice(0, 8)} · API {api ? api.commit.slice(0, 8) : unavailable ? "unavailable" : "checking"}</summary>
      <p>Frontend: {build.commit} · {build.buildId}</p><p>API: {api ? `${api.commit} · ${api.buildId}` : "Not verified"}</p><p>Built: {build.builtAt}</p>
    </details>
  </aside>;
}
