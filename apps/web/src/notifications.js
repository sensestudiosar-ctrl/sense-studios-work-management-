import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const NOTIFICATIONS_PATH = "/api/v1/notifications";
function emailFailure(code) {
    if (!code)
        return undefined;
    if (code === "recipient_not_authorized")
        return "Delivery stopped because the recipient is no longer authorized.";
    if (code === "recipient_unverified")
        return "Delivery stopped because the account email is not verified.";
    if (code === "preference_disabled")
        return "Delivery was disabled by your channel preference.";
    if (code === "email_not_configured")
        return "Email delivery is not configured.";
    if (code === "email_provider_rejected")
        return "The email provider rejected this message.";
    return "Email delivery could not be completed.";
}
function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}
export function NotificationCenter({ csrfToken, initiallyOpen = false }) {
    const [open, setOpen] = useState(initiallyOpen);
    const [inbox, setInbox] = useState(null);
    const [settings, setSettings] = useState(null);
    const [emailStatus, setEmailStatus] = useState([]);
    const [emailVerified, setEmailVerified] = useState(null);
    const [emailVerificationAvailable, setEmailVerificationAvailable] = useState(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [verificationMessage, setVerificationMessage] = useState();
    const [verificationError, setVerificationError] = useState();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState();
    const [category, setCategory] = useState("");
    const [channel, setChannel] = useState("EMAIL");
    const [enabled, setEnabled] = useState(false);
    const [startLocal, setStartLocal] = useState("");
    const [endLocal, setEndLocal] = useState("");
    const [timeZone, setTimeZone] = useState("");
    const load = async () => {
        setLoading(true);
        setError(undefined);
        try {
            const [inboxResponse, settingsResponse, emailStatusResponse] = await Promise.all([
                fetch(NOTIFICATIONS_PATH, { credentials: "include", cache: "no-store" }),
                fetch(`${NOTIFICATIONS_PATH}/preferences`, { credentials: "include", cache: "no-store" }),
                fetch(`${NOTIFICATIONS_PATH}/email-status`, { credentials: "include", cache: "no-store" }),
            ]);
            if (!inboxResponse.ok || !settingsResponse.ok || !emailStatusResponse.ok)
                throw new Error("load");
            const [nextInbox, nextSettings, nextEmailStatus] = await Promise.all([inboxResponse.json(), settingsResponse.json(), emailStatusResponse.json()]);
            setInbox(nextInbox);
            setSettings(nextSettings);
            setEmailStatus(nextEmailStatus.items);
            setEmailVerified(nextEmailStatus.verified);
            setEmailVerificationAvailable(nextEmailStatus.available);
            if (nextSettings.quietHours) {
                setStartLocal(nextSettings.quietHours.startLocal);
                setEndLocal(nextSettings.quietHours.endLocal);
                setTimeZone(nextSettings.quietHours.timeZone);
            }
        }
        catch {
            setError("We couldn’t load your notifications. Try again.");
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { if (open)
        void load(); }, [open]);
    const request = async (url, method, body) => {
        setSaving(true);
        setError(undefined);
        try {
            const response = await fetch(url, {
                method,
                credentials: "include",
                headers: { "X-CSRF-Token": csrfToken, ...(body ? { "Content-Type": "application/json" } : {}) },
                ...(body ? { body: JSON.stringify(body) } : {}),
            });
            if (!response.ok)
                throw new Error("request");
            await load();
            // Re-fetching the inbox reflects the new read state in the nav badge.
            window.dispatchEvent(new Event("sense-notifications-read"));
        }
        catch {
            setError("We couldn’t save that change. Try again.");
        }
        finally {
            setSaving(false);
        }
    };
    const savePreference = async (event) => {
        event.preventDefault();
        if (!category.trim())
            return;
        await request(`${NOTIFICATIONS_PATH}/preferences`, "PUT", { category: category.trim().toLowerCase(), channel, enabled });
    };
    const loadMore = async () => {
        if (!inbox?.nextCursor)
            return;
        setLoading(true);
        setError(undefined);
        try {
            const response = await fetch(`${NOTIFICATIONS_PATH}?cursor=${encodeURIComponent(inbox.nextCursor)}`, { credentials: "include", cache: "no-store" });
            if (!response.ok)
                throw new Error("load");
            const next = await response.json();
            setInbox({ items: [...inbox.items, ...next.items], nextCursor: next.nextCursor });
        }
        catch {
            setError("We couldn’t load more notifications. Try again.");
        }
        finally {
            setLoading(false);
        }
    };
    const saveQuietHours = async (event) => {
        event.preventDefault();
        await request(`${NOTIFICATIONS_PATH}/quiet-hours`, "PUT", { startLocal, endLocal, timeZone: timeZone.trim() });
    };
    const requestEmailVerification = async () => {
        setSaving(true);
        setVerificationError(undefined);
        setVerificationMessage(undefined);
        try {
            const response = await fetch(`${NOTIFICATIONS_PATH}/email-verification`, {
                method: "POST", credentials: "include", headers: { "X-CSRF-Token": csrfToken }
            });
            if (!response.ok)
                throw new Error("request");
            setVerificationMessage("A verification code was sent to your email address.");
        }
        catch {
            setVerificationError("We couldn’t send a verification code. Try again.");
        }
        finally {
            setSaving(false);
        }
    };
    const verifyEmail = async (event) => {
        event.preventDefault();
        if (!/^\d{6}$/.test(verificationCode))
            return;
        setSaving(true);
        setVerificationError(undefined);
        setVerificationMessage(undefined);
        try {
            const response = await fetch(`${NOTIFICATIONS_PATH}/email-verification/verify`, {
                method: "POST", credentials: "include",
                headers: { "X-CSRF-Token": csrfToken, "Content-Type": "application/json" },
                body: JSON.stringify({ code: verificationCode })
            });
            if (!response.ok)
                throw new Error("verify");
            setVerificationCode("");
            setEmailVerified(true);
            setVerificationMessage("Your email address is verified.");
        }
        catch {
            setVerificationError("We couldn’t verify that code. Check it and try again.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("section", { className: "identity-section notification-center", "aria-labelledby": "notifications-heading", children: [_jsxs("div", { className: "sessions-heading-row", children: [_jsxs("div", { children: [_jsx("div", { className: "eyebrow", children: "INBOX & PREFERENCES" }), _jsx("h2", { id: "notifications-heading", children: "Notifications" })] }), _jsx("button", { className: "secondary-action", type: "button", "aria-expanded": open, onClick: () => setOpen((value) => !value), children: open ? "Close" : "Open notifications" })] }), !open && _jsx("p", { className: "identity-note", children: "Your private inbox and delivery preferences." }), open && _jsxs(_Fragment, { children: [loading && _jsx("p", { role: "status", className: "identity-note", children: "Loading notifications\u2026" }), error && _jsxs("div", { className: "sessions-error", children: [_jsx("p", { role: "alert", className: "auth-error", children: error }), _jsx("button", { className: "secondary-action", type: "button", onClick: () => void load(), children: "Try again" })] }), !loading && !error && inbox?.items.length === 0 && _jsxs("div", { className: "notification-center-empty task-empty-state", role: "status", children: [_jsx("svg", { className: "task-empty-state__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "task-empty-state__title", children: "Your inbox is clear. New authorized updates will appear here." })] }), !loading && !error && inbox && inbox.items.length > 0 && _jsx("ul", { className: "notification-list", children: inbox.items.map((item) => _jsxs("li", { className: item.readAt ? "notification-item is-read" : "notification-item", children: [_jsxs("div", { className: "notification-copy", children: [_jsxs("div", { className: "notification-meta", children: [_jsx("span", { children: item.category }), item.critical && _jsx("strong", { children: "Critical" }), item.mandatory && _jsx("strong", { children: "Required" })] }), _jsx("h3", { children: item.title }), _jsx("p", { children: item.body }), _jsx("time", { dateTime: item.createdAt, children: formatTime(item.createdAt) })] }), _jsxs("div", { className: "notification-actions", children: [_jsx("a", { className: "secondary-action notification-link", href: item.internalRoute.startsWith("/") && !item.internalRoute.startsWith("//") ? item.internalRoute : "/", children: "Open" }), !item.readAt && _jsx("button", { className: "secondary-action", type: "button", disabled: saving, onClick: () => void request(`${NOTIFICATIONS_PATH}/${item.id}/read`, "PATCH"), children: "Mark read" })] })] }, item.id)) }), inbox?.nextCursor && _jsx("button", { className: "secondary-action", type: "button", disabled: loading, onClick: () => void loadMore(), children: loading ? "Loading…" : "Load more" }), _jsxs("section", { "aria-labelledby": "email-delivery-heading", className: "notification-email-status", children: [_jsx("h3", { id: "email-delivery-heading", children: "Email delivery" }), emailVerificationAvailable === false ? _jsx("p", { className: "identity-note", role: "status", children: "Email verification is unavailable until transactional email is configured." }) : emailVerified === true ? _jsx("p", { className: "identity-note", role: "status", children: "Email address verified." }) : emailVerified === false ? _jsxs("div", { className: "notification-verification", children: [_jsx("p", { className: "identity-note", role: "status", children: "Email address not verified. Verify it to enable email delivery." }), _jsx("button", { className: "secondary-action", type: "button", disabled: saving, onClick: () => void requestEmailVerification(), children: saving ? "Sending…" : "Send or resend verification code" }), _jsxs("form", { className: "notification-form", onSubmit: (event) => void verifyEmail(event), children: [_jsx("label", { htmlFor: "email-verification-code", children: "Six-digit verification code" }), _jsx("input", { id: "email-verification-code", inputMode: "numeric", autoComplete: "one-time-code", pattern: "[0-9]{6}", minLength: 6, maxLength: 6, value: verificationCode, onChange: (event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6)), required: true }), _jsx("button", { type: "submit", disabled: saving || verificationCode.length !== 6, children: saving ? "Verifying…" : "Verify email" })] }), verificationMessage && _jsx("p", { className: "identity-note", role: "status", children: verificationMessage }), verificationError && _jsx("p", { className: "auth-error", role: "alert", children: verificationError })] }) : _jsx("p", { className: "identity-note", role: "status", children: "Checking email verification\u2026" }), emailStatus.length === 0 ? _jsxs("div", { className: "notification-preference-empty", role: "status", children: [_jsx("svg", { className: "notification-preference-empty__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "identity-note", children: "No email notifications have been queued." })] }) : _jsx("ul", { className: "notification-preference-list", children: emailStatus.map((item) => _jsxs("li", { children: [_jsxs("span", { children: [_jsx("strong", { children: item.title }), _jsxs("small", { children: [item.deliveryState === "DELIVERED" ? "Delivered" : item.deliveryState === "DEAD" ? "Not delivered" : "Pending", emailFailure(item.failureCode) ? ` · ${emailFailure(item.failureCode)}` : ""] })] }), _jsxs("span", { children: [item.attempts, " attempts"] })] }, item.id)) })] }), _jsxs("div", { className: "notification-settings-grid", children: [_jsxs("section", { "aria-labelledby": "channel-preferences-heading", children: [_jsx("h3", { id: "channel-preferences-heading", children: "Optional channel preferences" }), _jsx("p", { className: "identity-note", children: "Required business notices remain enabled. Leave a category unset to use its configured delivery defaults." }), settings?.preferences.length ? _jsx("ul", { className: "notification-preference-list", children: settings.preferences.map((item) => _jsxs("li", { children: [_jsxs("span", { children: [_jsx("strong", { children: item.category }), " \u00B7 ", item.channel] }), _jsx("span", { children: item.enabled ? "On" : "Off" })] }, `${item.category}:${item.channel}`)) }) : _jsxs("div", { className: "notification-preference-empty", role: "status", children: [_jsx("svg", { className: "notification-preference-empty__icon", "aria-hidden": "true", focusable: "false", viewBox: "0 0 24 24", children: _jsx("path", { d: "M4 6h16M7 12h10m-7 6h4" }) }), _jsx("p", { className: "identity-note", children: "No optional preferences are saved." })] }), _jsxs("form", { className: "notification-form", onSubmit: (event) => void savePreference(event), children: [_jsx("label", { htmlFor: "notification-category", children: "Category" }), _jsx("input", { id: "notification-category", value: category, onChange: (event) => setCategory(event.target.value), maxLength: 100, pattern: "[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}", required: true }), _jsx("label", { htmlFor: "notification-channel", children: "Channel" }), _jsxs("select", { id: "notification-channel", value: channel, onChange: (event) => setChannel(event.target.value), children: [_jsx("option", { value: "EMAIL", children: "Email" }), _jsx("option", { value: "IN_APP", children: "In app" })] }), _jsxs("label", { className: "notification-check", children: [_jsx("input", { type: "checkbox", checked: enabled, onChange: (event) => setEnabled(event.target.checked) }), " Enable this optional category and channel"] }), _jsx("button", { type: "submit", disabled: saving || !category.trim(), children: saving ? "Saving…" : "Save preference" })] })] }), _jsxs("section", { "aria-labelledby": "quiet-hours-heading", children: [_jsx("h3", { id: "quiet-hours-heading", children: "Quiet hours" }), _jsx("p", { className: "identity-note", children: "Times use your selected time zone. Critical notices can bypass quiet hours." }), settings?.quietHours && _jsxs("p", { className: "identity-note", role: "status", children: ["Currently ", settings.quietHours.startLocal, "\u2013", settings.quietHours.endLocal, " \u00B7 ", settings.quietHours.timeZone] }), _jsxs("form", { className: "notification-form", onSubmit: (event) => void saveQuietHours(event), children: [_jsx("label", { htmlFor: "quiet-start", children: "Start" }), _jsx("input", { id: "quiet-start", type: "time", value: startLocal, onChange: (event) => setStartLocal(event.target.value), required: true }), _jsx("label", { htmlFor: "quiet-end", children: "End" }), _jsx("input", { id: "quiet-end", type: "time", value: endLocal, onChange: (event) => setEndLocal(event.target.value), required: true }), _jsx("label", { htmlFor: "quiet-time-zone", children: "IANA time zone" }), _jsx("input", { id: "quiet-time-zone", value: timeZone, onChange: (event) => setTimeZone(event.target.value), placeholder: "Asia/Kolkata", maxLength: 100, required: true }), _jsxs("div", { className: "notification-actions", children: [_jsx("button", { type: "submit", disabled: saving, children: saving ? "Saving…" : "Save quiet hours" }), settings?.quietHours && _jsx("button", { className: "secondary-action", type: "button", disabled: saving, onClick: () => void request(`${NOTIFICATIONS_PATH}/quiet-hours`, "DELETE"), children: "Clear" })] })] })] })] })] })] }));
}
