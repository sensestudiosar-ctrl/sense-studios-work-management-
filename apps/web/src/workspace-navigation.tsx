import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./workspace-navigation.css";

const destinations = [
  { to: "/settings", label: "Account & settings" },
  { to: "/my-work", label: "My Work" },
  { to: "/decisions", label: "Decisions" },
  { to: "/notifications", label: "Notifications" },
  { to: "/tasks", label: "Tasks" },
  { to: "/projects", label: "Projects" },
  { to: "/documents", label: "Project documents" },
  { to: "/revisions", label: "Drawing register" },
  { to: "/reviews", label: "Internal reviews" },
  { to: "/client-reviews", label: "Client reviews" },
  { to: "/dashboard", label: "Dashboard & reports" },
  { to: "/integrations", label: "Integrations" },
  { to: "/automation", label: "Automation & reports" },
  { to: "/assistance", label: "Evidence assistance" },
  { to: "/performance", label: "Performance" },
  { to: "/external-access", label: "External access" },
  { to: "/turnkey", label: "Turnkey operations" },
  { to: "/site", label: "Site delivery" },
  { to: "/time", label: "Time" },
  { to: "/workforce", label: "Workforce" },
  { to: "/learning", label: "Learning" },
] as const;

const primaryPaths = new Set<string>(["/my-work", "/tasks", "/documents"]);

function DestinationLinks({ items, onNavigate }: { items: (typeof destinations)[number][]; onNavigate?: () => void }): React.JSX.Element {
  return <>
    {items.map(({ to, label, ...props }) => (
      <NavLink key={to} to={to} {...("end" in props ? { end: true } : {})} {...(onNavigate ? { onClick: onNavigate } : {})}>
        {label}
      </NavLink>
    ))}
  </>;
}

export function WorkspaceNavigation(): React.JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const location = useLocation();
  const isDesktop = (): boolean => typeof window.matchMedia === "function"
    ? window.matchMedia("(min-width: 768px)").matches
    : window.innerWidth >= 768;

  useEffect(() => {
    if (!moreOpen) return;
    const element = dialog.current;
    if (!element) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element.open) {
      if (typeof element.showModal === "function") element.showModal();
      else element.setAttribute("open", "");
    }
    const focusable = (): HTMLElement[] => Array.from(dialog.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (element.open && typeof element.close === "function") element.close();
      else element.removeAttribute("open");
      if (previouslyFocused?.isConnected && !(previouslyFocused === moreButton.current && isDesktop())) previouslyFocused.focus();
      else if (!isDesktop()) moreButton.current?.focus();
    };
  }, [moreOpen]);

  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    const closeForDesktop = (): void => {
      if (isDesktop()) setMoreOpen(false);
    };
    window.addEventListener("resize", closeForDesktop);
    return () => window.removeEventListener("resize", closeForDesktop);
  }, []);

  return <>
    <aside className="workspace-sidebar">
      <NavLink className="workspace-bell-link" to="/notifications" aria-label="Notifications" title="Notifications"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><span>Notifications</span></NavLink>
      <nav className="workspace-nav" aria-label="Workspace navigation">
        <DestinationLinks items={[...destinations]} />
      </nav>
    </aside>
    <div className="workspace-mobile-nav">
      <NavLink className="workspace-bell-link" to="/notifications" aria-label="Notifications" title="Notifications"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></NavLink>
      <nav className="workspace-mobile-main" aria-label="Main workspace destinations">
        <DestinationLinks items={destinations.filter(({ to }) => primaryPaths.has(to))} />
      </nav>
      <button ref={moreButton} className="workspace-more-button" type="button" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>More</button>
    </div>
    <dialog ref={dialog} className="workspace-more-dialog" aria-modal="true" aria-labelledby="workspace-more-title" onCancel={(event) => { event.preventDefault(); setMoreOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget) setMoreOpen(false); }}>
        <div className="workspace-dialog-heading"><h2 id="workspace-more-title">More destinations</h2><button className="workspace-dialog-close" type="button" aria-label="Close navigation" onClick={() => setMoreOpen(false)}>Close</button></div>
        <nav className="workspace-more-links" aria-label="More workspace destinations">
          <DestinationLinks items={destinations.filter(({ to }) => !primaryPaths.has(to))} onNavigate={() => setMoreOpen(false)} />
        </nav>
    </dialog>
  </>;
}

export function WorkspaceLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="workspace-layout"><WorkspaceNavigation /><div className="workspace-page">{children}</div></div>;
}
