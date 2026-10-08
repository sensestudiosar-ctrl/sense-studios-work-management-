import { Link, useLocation } from "react-router-dom";
import "./insights-navigation.css";

const destinations = [
  ["/performance", "Performance"],
  ["/project-health", "Project Health"],
  ["/reports", "Reports"],
  ["/saved-reports", "Saved Reports"],
] as const;

export function InsightsNavigation({ projectId }: { projectId?: string }): React.JSX.Element {
  const location = useLocation();
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  return <nav className="insights-navigation" aria-label="Insights">
    {destinations.map(([path, label]) => {
      const active = location.pathname === path;
      return <Link key={path} to={`${path}${path === "/performance" || path === "/project-health" ? query : ""}`} aria-current={active ? "page" : undefined}>{label}</Link>;
    })}
    <Link className="insights-manage-link" to="/automation">Automation settings</Link>
  </nav>;
}
