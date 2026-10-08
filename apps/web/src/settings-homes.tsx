import { Link } from "react-router-dom";
import { ApprovalQueue } from "./approval-queue.js";
import "./settings-homes.css";

type SettingsHomeProps = { owner?: boolean };

export type SettingsSection = "account" | "notifications" | "organization" | "team" | "setup";

const settingsSections: Array<{ key: Exclude<SettingsSection, "setup">; label: string; ownerOnly?: boolean; staffOnly?: boolean }> = [
  { key: "account", label: "Account & devices" },
  { key: "notifications", label: "Notifications" },
  { key: "organization", label: "Organization administration", ownerOnly: true },
  { key: "team", label: "Team workspace", staffOnly: true },
];

export function SettingsSectionNavigation({ active, owner, staff }: { active: SettingsSection; owner: boolean; staff: boolean }): React.JSX.Element {
  const personal = settingsSections.filter((item) => item.key === "account" || item.key === "notifications");
  const organization = settingsSections.filter((item) => (item.key === "organization" || item.key === "team") && (!item.ownerOnly || owner) && (!item.staffOnly || staff));
  const renderSection = (item: (typeof settingsSections)[number]): React.JSX.Element => (
    <Link key={item.key} to={`/settings?section=${item.key}`} aria-current={active === item.key ? "page" : undefined}>{item.label}</Link>
  );
  return (
    <nav className="settings-section-navigation" aria-label="Settings sections">
      <section aria-labelledby="settings-personal-heading"><h2 id="settings-personal-heading">Personal</h2>{personal.map(renderSection)}</section>
      <section aria-labelledby="settings-organization-heading"><h2 id="settings-organization-heading">Organization &amp; administration</h2>{organization.map(renderSection)}<Link to="/integrations">Integrations</Link><Link to="/automation">Automation &amp; reports</Link></section>
    </nav>
  );
}

export function SettingsHome({ owner = false }: SettingsHomeProps): React.JSX.Element {
  return (
    <section className="settings-homes" aria-labelledby="settings-home-heading">
      <header className="settings-homes-heading">
        <p className="settings-homes-eyebrow">WORKSPACE</p>
        <h1 id="settings-home-heading">Settings</h1>
        <p>Choose a settings area. Each link opens its existing workspace and applies its usual access rules.</p>
      </header>
      <nav className="settings-home-grid" aria-label="Settings categories">
        <section className="settings-home-card" aria-labelledby="settings-account-heading"><h2 id="settings-account-heading">Account and sessions</h2><p>Review your account, sign-in devices and active sessions.</p><Link className="settings-home-link" to="/settings?section=account">Manage active sessions<span aria-hidden="true">→</span></Link></section>
        <section className="settings-home-card" aria-labelledby="settings-notifications-heading"><h2 id="settings-notifications-heading">Notifications</h2><p>Review your inbox and manage notification preferences.</p><Link className="settings-home-link" to="/settings?section=notifications">Open notifications<span aria-hidden="true">→</span></Link></section>
        <section className="settings-home-card" aria-labelledby="settings-integrations-heading"><h2 id="settings-integrations-heading">Integrations</h2><p>Manage connected services and their existing access controls.</p><Link className="settings-home-link" to="/integrations">Manage integrations<span aria-hidden="true">→</span></Link></section>
        <section className="settings-home-card" aria-labelledby="settings-automation-heading"><h2 id="settings-automation-heading">Automation and reports</h2><p>Manage event automation and report workflows using your current capabilities.</p><Link className="settings-home-link" to="/automation">Manage automation and reports<span aria-hidden="true">→</span></Link></section>
        <section className="settings-home-card settings-home-card-owner" aria-labelledby="settings-org-home-heading"><h2 id="settings-org-home-heading">Organization settings</h2><p>Organization configuration is managed by an Owner account.</p>{owner ? <Link className="settings-home-link" to="/settings?section=organization">Manage organization settings<span aria-hidden="true">→</span></Link> : <span className="settings-home-access" aria-label="Owner accounts only">Owner accounts only</span>}</section>
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
