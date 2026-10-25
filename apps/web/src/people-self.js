import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function PeopleSelf() {
    const [profile, setProfile] = useState();
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setProfile(undefined);
        void (async () => {
            try {
                const response = await fetch("/api/v1/org/self", { credentials: "include", cache: "no-store" });
                if (!active)
                    return;
                if (response.status === 401) {
                    window.dispatchEvent(new Event("sense-session-ended"));
                    return;
                }
                if (!response.ok) {
                    setError(response.status === 403 ? "Your current membership is unavailable. Ask the Owner to review your access." : "Your employee profile could not be loaded. Try again.");
                    return;
                }
                const value = await response.json();
                if (active)
                    setProfile(value);
            }
            catch {
                if (active)
                    setError("Your employee profile could not be loaded. Try again.");
            }
            finally {
                if (active)
                    setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [retry]);
    return _jsxs("section", { className: "identity-section", "aria-labelledby": "my-employee-profile", children: [_jsx("h2", { id: "my-employee-profile", children: "My employee profile" }), loading && _jsx("p", { role: "status", children: "Loading your membership\u2026" }), error && _jsxs(_Fragment, { children: [_jsx("p", { role: "alert", children: error }), _jsx("button", { type: "button", className: "secondary-action", onClick: () => setRetry(value => value + 1), children: "Retry profile" })] }), profile?.employee === null && _jsx("p", { children: "Your staff identity is enrolled. The Owner still needs to configure your employee record and home membership before you can receive employee work." }), profile?.employee && _jsxs("dl", { className: "people-self-details", children: [_jsxs("div", { children: [_jsx("dt", { children: "Employee code" }), _jsx("dd", { children: profile.employee.employeeCode ?? "Not assigned" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Home branch" }), _jsx("dd", { children: profile.employee.homeBranch.name })] }), _jsxs("div", { children: [_jsx("dt", { children: "Home team" }), _jsx("dd", { children: profile.employee.homeTeam.name })] }), _jsxs("div", { children: [_jsx("dt", { children: "Reports to" }), _jsx("dd", { children: profile.employee.reportsTo?.account.normalizedEmail ?? "No reporting manager" })] }), _jsxs("div", { children: [_jsx("dt", { children: "Job roles" }), _jsx("dd", { children: profile.employee.jobRoleAssignments.map(item => item.jobRole.name).join(", ") || "No job roles assigned" })] })] })] });
}
