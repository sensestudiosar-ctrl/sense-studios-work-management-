import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router-dom";
import "./insights-navigation.css";
const destinations = [
    ["/performance", "Performance"],
    ["/project-health", "Project Health"],
    ["/reports", "Reports"],
    ["/saved-reports", "Saved Reports"],
];
export function InsightsNavigation({ projectId }) {
    const location = useLocation();
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return _jsxs("nav", { className: "insights-navigation", "aria-label": "Insights", children: [destinations.map(([path, label]) => {
                const active = location.pathname === path;
                return _jsx(Link, { to: `${path}${path === "/performance" || path === "/project-health" ? query : ""}`, "aria-current": active ? "page" : undefined, children: label }, path);
            }), _jsx(Link, { className: "insights-manage-link", to: "/automation", children: "Automation settings" })] });
}
