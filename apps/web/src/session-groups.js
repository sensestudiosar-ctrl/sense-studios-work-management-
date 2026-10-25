import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export function SessionGroups({ sessions, children }) {
    const now = Date.now();
    const active = sessions.filter(item => !item.revokedAt && new Date(item.expiresAt).getTime() > now);
    const history = sessions.filter(item => item.revokedAt || new Date(item.expiresAt).getTime() <= now);
    return _jsxs(_Fragment, { children: [active.length ? _jsx("ul", { className: "session-list", children: active.map(children) }) : _jsx("p", { role: "status", children: "No active sessions in this list." }), history.length > 0 && _jsxs("details", { className: "session-history", children: [_jsxs("summary", { children: ["Session history \u00B7 ", history.length, " expired or revoked"] }), _jsx("p", { children: "Previous sign-ins are retained for your account history." }), _jsx("ul", { className: "session-list", children: history.map(children) })] })] });
}
