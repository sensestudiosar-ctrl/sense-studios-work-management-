import { Link } from "react-router-dom";
import { ApprovalQueue } from "./approval-queue.js";
import "./settings-homes.css";

type SettingsHomeProps = { owner?: boolean };

const settingsDestinations = [
  {
    title: "Account and sessions",
    description: "Review your account, sign-in devices and active sessions.",
    links: [{ to: "/workspace#sessions-heading", label: "Manage active sessions" }],
  },
  {
    title: "Notifications",
    description: "Review your inbox and manage notification preferences.",
    links: [{ to: "/notifications", label: "Open notifications" }],
  },
  {
    title: "Integrations",
    description: "Manage connected services and their existing access controls.",
    links: [{ to: "/integrations", label: "Manage integrations" }],
  },
  {
    title: "Automation and reports",
    description: "Manage event automation and report workflows using your current capabilities.",
    links: [{ to: "/automation", label: "Manage automation and reports" }],
  },
];

export function SettingsHome({ owner = false }: SettingsHomeProps): React.JSX.Element {
  return (
    <section className="settings-homes" aria-labelledby="settings-home-heading">
      <header className="settings-homes-heading">
        <p className="settings-homes-eyebrow">WORKSPACE</p>
        <h1 id="settings-home-heading">Settings</h1>
        <p>Choose a settings area. Each link opens its existing workspace and applies its usual access rules.</p>
      </header>

      <nav className="settings-home-grid" aria-label="Settings categories">
        {settingsDestinations.map((category) => (
          <section className="settings-home-card" key={category.title} aria-labelledby={`settings-${category.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>
            <h2 id={`settings-${category.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>{category.title}</h2>
            <p>{category.description}</p>
            {category.links.map((link) => <Link className="settings-home-link" key={link.to} to={link.to}>{link.label}<span aria-hidden="true">→</span></Link>)}
          </section>
        ))}

        <section className="settings-home-card settings-home-card-owner" aria-labelledby="settings-organization-heading">
          <h2 id="settings-organization-heading">Organization settings</h2>
          <p>Organization configuration is managed by an Owner account.</p>
          {owner
            ? <Link className="settings-home-link" to="/workspace#organization-settings-toggle">Manage organization settings<span aria-hidden="true">→</span></Link>
            : <span className="settings-home-access" aria-label="Owner accounts only">Owner accounts only</span>}
        </section>
      </nav>
    </section>
  );
}

export function DecisionsHome(): React.JSX.Element {
  return (
    <section className="decisions-home" aria-labelledby="decisions-home-heading">
      <header className="decisions-home-heading">
        <p className="settings-homes-eyebrow">WORKSPACE</p>
        <h1 id="decisions-home-heading">Decisions</h1>
        <p>Review requests that need your attention. Approving or declining a request is completed in the workflow that owns it, where its context and authorization are checked.</p>
      </header>
      <ApprovalQueue title="Pending decisions" />
    </section>
  );
}
