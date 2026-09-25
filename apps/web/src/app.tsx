import { useCallback, useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { HEALTH_PATHS, type ReadinessResponse } from "@sense/contracts";

type ConnectionState = "loading" | "ready" | "unavailable";

function useConnection(): { state: ConnectionState; retry: () => void } {
  const [state, setState] = useState<ConnectionState>("loading");
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState("loading");
    setAttempt((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(HEALTH_PATHS.ready, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("API is unavailable");
        const body = (await response.json()) as ReadinessResponse;
        if (body.status !== "ready" || body.dependencies.database !== "ready") {
          throw new Error("Database is unavailable");
        }
        setState("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setState("unavailable");
      });
    return () => controller.abort();
  }, [attempt]);

  return { state, retry };
}

function Home(): React.JSX.Element {
  const { state, retry } = useConnection();
  return (
    <main className="main-content">
      <div className="eyebrow">FOUNDATION / S01</div>
      <h1>Work, clearly organized.</h1>
      <p className="intro">The Sense Studios workspace is being prepared. Project and team tools will appear in later approved releases.</p>

      <section className="status-panel" aria-labelledby="connection-heading">
        <div>
          <p className="panel-label">SYSTEM STATUS</p>
          <h2 id="connection-heading">Connection</h2>
        </div>
        {state === "loading" && <p role="status" className="status-line"><span className="status-dot pending" />Checking the API and database…</p>}
        {state === "ready" && <p role="status" className="status-line"><span className="status-dot ready" />API and database ready</p>}
        {state === "unavailable" && (
          <div role="alert" className="connection-error">
            <p className="status-line"><span className="status-dot error" />The service is unavailable right now.</p>
            <button type="button" onClick={retry}>Try again</button>
          </div>
        )}
      </section>

      <section className="empty-panel" aria-labelledby="empty-heading">
        <div className="empty-mark" aria-hidden="true">S</div>
        <div>
          <h2 id="empty-heading">No workspace content yet</h2>
          <p>This foundation has no business records. Access, projects, tasks and documents will be built in their approved slices.</p>
        </div>
      </section>
    </main>
  );
}

function NotFound(): React.JSX.Element {
  return (
    <main className="main-content">
      <div className="eyebrow">PAGE NOT FOUND</div>
      <h1>That page is not here.</h1>
      <p className="intro">Return to the foundation home page.</p>
      <Link to="/" className="home-link">Go home</Link>
    </main>
  );
}

export function App(): React.JSX.Element {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="Sense Studios home">
          <span className="brand-mark">S</span>
          <span><strong>SENSE STUDIOS</strong><small>WORK MANAGEMENT</small></span>
        </Link>
        <span className="phase-badge">FOUNDATION</span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <footer className="site-footer">Sense Studios · Foundation build</footer>
    </div>
  );
}
