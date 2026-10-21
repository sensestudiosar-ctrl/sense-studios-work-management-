import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { hasPendingOfflineCommands } from "./site-offline.js";
import "./pwa-delivery.css";

export function PwaUpdateNotice(): React.JSX.Element | null {
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dismissed = useRef<ServiceWorker | undefined>(undefined);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const refresh = () => {
      if (!disposed) setWaiting(registration?.waiting && registration.waiting !== dismissed.current ? registration.waiting : undefined);
    };
    const check = () => { if (navigator.onLine) void registration?.update().catch(() => undefined); refresh(); };
    const installed = () => { refresh(); };
    const found = () => registration?.installing?.addEventListener("statechange", installed);
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((next) => {
      if (disposed) return;
      registration = next;
      registration.addEventListener("updatefound", found);
      found(); refresh();
    }).catch(() => { /* Online use remains available if worker installation is unsupported. */ });
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

  async function apply(): Promise<void> {
    if (!waiting || !confirmed || busy) return;
    setBusy(true); setError("");
    try {
      if (!navigator.onLine) throw new Error("Connect to the internet before updating.");
      if (await hasPendingOfflineCommands()) throw new Error("Synchronize or resolve your pending site captures before updating. They remain saved on this device.");
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        const activated = () => { if (waiting!.state === "activated") window.location.reload(); };
        const timeout = window.setTimeout(() => { channel.port1.close(); waiting!.removeEventListener("statechange", activated); reject(new Error("The update could not be checked. Your current app is still available; try again later.")); }, 10_000);
        channel.port1.onmessage = (event: MessageEvent<{ ok?: boolean }>) => {
          window.clearTimeout(timeout); channel.port1.close();
          if (!event.data.ok) {
            waiting!.removeEventListener("statechange", activated);
            reject(new Error("Close all other tabs and windows of this app, then try again."));
          } else { activated(); resolve(); }
        };
        waiting!.addEventListener("statechange", activated);
        waiting!.postMessage({ type: "SENSE_ACTIVATE_UPDATE" }, [channel.port2]);
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to check saved site captures. Finish your work and try again later.");
    } finally { setBusy(false); }
  }

  if (!waiting) return null;
  return <aside className="pwa-update" aria-label="App update">
    <div><strong>A new version is ready</strong><p>Update when you have finished your current work. Saved site captures will not be deleted.</p></div>
    <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> I saved my work and closed other app tabs.</label>
    {error && <p role="alert">{error}</p>}
    <div className="pwa-actions"><button type="button" disabled={!confirmed || busy} onClick={() => void apply()}>{busy ? "Checking…" : "Update and reload"}</button><button type="button" className="pwa-secondary" disabled={busy} onClick={() => { dismissed.current = waiting; setWaiting(undefined); setConfirmed(false); setError(""); }}>Later</button></div>
  </aside>;
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PhoneInstall(): React.JSX.Element {
  const [prompt, setPrompt] = useState<InstallPrompt>();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installed = () => { setPrompt(undefined); setNotice("The app is installed. Open Sense Studios from your home screen and sign in with your own passkey."); };
    window.addEventListener("beforeinstallprompt", available); window.addEventListener("appinstalled", installed);
    return () => { window.removeEventListener("beforeinstallprompt", available); window.removeEventListener("appinstalled", installed); };
  }, []);
  async function install(): Promise<void> {
    if (!prompt) return;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setNotice(choice.outcome === "accepted" ? "Follow your phone’s installation steps, then open Sense Studios from your home screen." : "You can install later or continue in your browser.");
    } catch { setNotice("Use your browser’s Install app or Add to Home Screen menu, or continue in your browser."); }
    finally { setPrompt(undefined); }
  }
  return <main className="phone-install">
    <Link to="/" className="phone-install-brand"><img src="/icon.svg" width="48" height="48" alt="" /><span>Sense Studios</span></Link>
    <h1>Your work, on your phone</h1><p className="phone-install-intro">Employees, site workers and the Owner use the same app. Your own account controls what you can see and do.</p>
    {prompt && <button type="button" onClick={() => void install()}>Install Sense Studios</button>}
    {notice && <p role="status" className="notice">{notice}</p>}
    <section><h2>Android</h2><ol><li>Open this address in Chrome.</li><li>Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li><li>Open Sense Studios from your home screen, then sign in with your own passkey.</li></ol></section>
    <section><h2>iPhone</h2><ol><li>Open this address in Safari.</li><li>Choose <strong>Share → Add to Home Screen</strong>. Enable <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li><li>Open the new icon and sign in. If you cannot sign in, ask the Owner for account recovery.</li></ol></section>
    <section><h2>Before going to a site</h2><p>While online, open your assigned site and prepare its offline capture context. Supported notes, new photos, report drafts, snags and progress can be saved locally. Reopen the app online to synchronize and resolve any conflicts.</p><p>Check that captures show <strong>Synchronized</strong> before clearing browser storage, reinstalling or changing phones. Pending captures exist only on this device. Approvals and other unsupported actions need an online connection.</p></section>
    <section><h2>Keep access secure</h2><p>Use your own account and a phone screen lock. Report a lost phone to the Owner promptly. Launch alerts are available in the app and by configured email; installation alone does not enable lock-screen notifications.</p></section>
    <Link to="/" className="home-link">Open Sense Studios</Link>
  </main>;
}
