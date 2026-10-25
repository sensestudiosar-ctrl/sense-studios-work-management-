import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
export function DashboardPerformanceWidget({ context, csrfToken, owner }) {
    const isOwner = owner && context.owner;
    const employees = context.employees.filter(e => isOwner || e.canManage);
    const [mode, setMode] = useState(isOwner ? "teams" : "employees");
    const [employeeId, setEmployeeId] = useState(() => employees[0]?.id ?? "");
    const [metric, setMetric] = useState("overall"), [data, setData] = useState(null);
    const [error, setError] = useState(""), [loading, setLoading] = useState(false), [refresh, setRefresh] = useState(0);
    const requestId = useRef(0);
    const selectedId = employees.some(e => e.id === employeeId) ? employeeId : "";
    useEffect(() => {
        const current = ++requestId.current;
        setData(null);
        setError("");
        if (!selectedId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        void fetch(`/api/v1/performance/employees/${encodeURIComponent(selectedId)}`, { credentials: "include", cache: "no-store", headers: { "X-CSRF-Token": csrfToken } })
            .then(async (response) => { if (!response.ok)
            throw new Error(`Performance source unavailable (${response.status})`); return response.json(); })
            .then(next => { if (current === requestId.current && next.employee.id === selectedId)
            setData(next); })
            .catch(cause => { if (current === requestId.current)
            setError(cause instanceof Error ? cause.message : "Performance source unavailable"); })
            .finally(() => { if (current === requestId.current)
            setLoading(false); });
        return () => { requestId.current++; };
    }, [selectedId, csrfToken, refresh]);
    const current = data?.employee.id === selectedId ? data : null;
    const snapshot = current?.snapshots.find(s => s.data.family === "EMPLOYEE" && s.data.status === "SCORED" && typeof s.data.score === "number" && Number.isFinite(s.data.score));
    const component = snapshot?.data.components?.find(c => c.metric === metric);
    const score = mode === "teams" ? metric === "overall" ? current?.teamAverage : null : metric === "overall" ? snapshot?.data.score : component?.normalized;
    const finite = typeof score === "number" && Number.isFinite(score);
    return _jsxs("div", { className: "dv-widget-body dv-perf-body", children: [isOwner && _jsxs("div", { className: "dv-performance-tabs", "aria-label": "Performance view", children: [_jsx("button", { type: "button", "aria-pressed": mode === "teams", onClick: () => { setMode("teams"); setMetric("overall"); }, children: "Teams" }), _jsx("button", { type: "button", "aria-pressed": mode === "employees", onClick: () => { setMode("employees"); setMetric("overall"); }, children: "Employees" })] }), _jsxs("label", { className: "dv-performance-select", children: [mode === "teams" ? "Team cohort for employee" : "Employee", _jsxs("select", { value: selectedId, onChange: event => { setData(null); setEmployeeId(event.target.value); setMetric("overall"); }, children: [_jsx("option", { value: "", children: "Choose an authorized employee" }), employees.map(e => _jsx("option", { value: e.id, children: e.label }, e.id))] })] }), snapshot && _jsxs("label", { className: "dv-performance-select", children: ["Compare by", _jsxs("select", { value: metric, onChange: e => setMetric(e.target.value), children: [_jsx("option", { value: "overall", children: "Overall score" }), snapshot.data.components?.map(c => _jsx("option", { value: c.metric, children: c.label ?? c.metric.replace(/_/g, " ") }, c.metric))] })] }), loading ? _jsx("p", { role: "status", children: "Reading performance source\u2026" }) : error ? _jsxs("div", { className: "dv-source-error", role: "alert", children: [_jsx("strong", { children: error }), _jsx("button", { type: "button", onClick: () => setRefresh(value => value + 1), children: "Retry performance" })] }) : !selectedId ? _jsx("p", { children: "No employee selected from your authorized management scope." }) : !snapshot ? _jsxs("p", { children: ["No scored performance snapshot is available for this employee. ", context.policies.length ? "Generate a period through the performance workspace." : "A scoring policy must be configured first."] }) : _jsxs(_Fragment, { children: [_jsxs("div", { className: "dv-perf-score", children: [finite ? _jsx("div", { className: "dv-perf-dial", role: "img", "aria-label": `${mode === "teams" ? "Team average" : "Score"} ${score} out of 100`, style: { "--score-pct": `${Math.min(100, Math.max(0, score))}%` }, children: _jsxs("div", { className: "dv-perf-dial-core", children: [_jsx("strong", { children: Math.round(score) }), _jsx("span", { children: "/ 100" })] }) }) : _jsx("p", { className: "dv-perf-unavailable", children: mode === "teams" ? "No comparable team score is supplied for this selection." : "This metric is unavailable." }), _jsxs("div", { className: "dv-perf-meta", children: [_jsx("strong", { children: current?.employee.label }), _jsxs("div", { children: [snapshot.data.from, " \u2192 ", snapshot.data.to] }), _jsxs("small", { children: ["Policy ", snapshot.data.policyId ?? "unavailable"] }), mode === "employees" && isOwner && current?.teamAverage !== null && _jsxs("p", { children: ["Team average ", _jsx("strong", { children: current?.teamAverage }), current?.relativeToAverage !== null && _jsxs("span", { children: [" \u00B7 ", current.relativeToAverage >= 0 ? "+" : "", current?.relativeToAverage, " vs team"] })] })] })] }), mode === "teams" && _jsx("p", { className: "dv-perf-explanation", children: "Average of comparable employee scores in this team for the same policy and period. Detailed team metrics are unavailable." }), mode === "employees" && snapshot.data.components?.map((c, index) => _jsxs("div", { className: "dv-performance-component", children: [_jsxs("div", { className: "dv-perf-component-head", children: [_jsx("span", { children: c.label ?? c.metric.replace(/_/g, " ") }), _jsx("strong", { children: c.normalized === null ? "—" : c.normalized })] }), c.normalized !== null && _jsx("div", { className: "dv-perf-track", role: "img", "aria-label": `${c.label ?? c.metric.replace(/_/g, " ")}: ${c.normalized} out of 100`, children: _jsx("i", { style: { width: `${Math.min(100, Math.max(0, c.normalized))}%` }, "data-tint": index + 1 }) })] }, c.metric))] }), _jsxs("div", { className: "dv-perf-foot", children: [_jsx(Link, { to: "/performance", children: "Open performance workspace \u2192" }), _jsx("span", { children: "Authorized persisted evidence" })] })] });
}
