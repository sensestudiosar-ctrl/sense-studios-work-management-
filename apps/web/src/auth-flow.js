import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useId, useState } from "react";
import "./auth-flow.css";
export function AuthFrame({ audience, title, intro, children, brand = true, wide = false }) {
    const heading = useId();
    return _jsxs("main", { className: "auth-flow", children: [brand && _jsxs("a", { className: "auth-flow-brand", href: "/sign-in", children: [_jsx("span", { "aria-hidden": "true", children: "SS" }), _jsx("strong", { children: "SENSE STUDIOS" })] }), _jsxs("section", { className: "auth-flow-card" + (wide ? " auth-flow-picker" : ""), "aria-labelledby": heading, children: [_jsx("p", { className: "auth-flow-audience", children: audience }), _jsx("h1", { id: heading, children: title }), intro && _jsx("p", { className: "auth-flow-intro", children: intro }), children] }), _jsx("p", { className: "auth-flow-footer", children: "Sense Studios \u00B7 A secure place for your work" })] });
}
export function PasswordField({ label, value, onChange, name, autoComplete = "new-password", disabled = false, minLength }) {
    const id = useId();
    const [visible, setVisible] = useState(false);
    return _jsxs("div", { className: "auth-flow-field", children: [_jsx("label", { htmlFor: id, children: label }), _jsxs("div", { className: "auth-password-control", children: [_jsx("input", { id: id, name: name, type: visible ? "text" : "password", autoComplete: autoComplete, required: true, maxLength: 256, minLength: minLength, value: value, onChange: event => onChange(event.target.value), disabled: disabled }), _jsx("button", { type: "button", className: "auth-show-password", "aria-label": (visible ? "Hide " : "Show ") + label.toLowerCase(), "aria-pressed": visible, onClick: () => setVisible(value => !value), disabled: disabled, children: visible ? "Hide" : "Show" })] })] });
}
export function SignInHub() {
    const choices = [
        ["/staff/sign-in", "01", "Studio team", "Owner, team leaders and employees", "Continue with your work passkey"],
        ["/client-portal/login", "02", "Clients", "Your projects, drawings and reviews", "Sign in to your client account"],
        ["/external-portal/consultant/login", "03", "Consultants", "Shared documents and project requests", "Continue with an email code"],
        ["/external-portal/vendor/login", "04", "Vendors & production", "Drawings, requirements and updates", "Continue with an email code"]
    ];
    return _jsxs(AuthFrame, { audience: "WELCOME TO SENSE STUDIOS", title: "Your work starts here", intro: "Choose where you work with us.", brand: false, wide: true, children: [_jsx("nav", { className: "auth-entry-choices", "aria-label": "Choose your sign-in", children: choices.map(([href, number, title, description, action]) => _jsxs("a", { href: href, className: "auth-entry-choice", "aria-label": [title, description, action].join(" "), children: [_jsx("span", { className: "auth-entry-number", "aria-hidden": "true", children: number }), _jsxs("span", { children: [_jsx("strong", { children: title }), _jsx("span", { children: description }), _jsx("small", { children: action })] }), _jsx("span", { "aria-hidden": "true", children: "\u2197" })] }, href)) }), _jsxs("div", { className: "auth-flow-links", children: [_jsx("a", { href: "/owner/sign-in", children: "Owner sign in" }), _jsx("a", { href: "/portfolio", children: "View our public portfolio" })] })] });
}
export function StaffRecovery() {
    return _jsxs(AuthFrame, { audience: "STUDIO TEAM \u00B7 ACCOUNT HELP", title: "Let's get you back in", intro: "Your work account uses a passkey. Choose the help you need.", brand: false, children: [_jsxs("ol", { className: "auth-help-steps", children: [_jsxs("li", { children: [_jsx("strong", { children: "Have another registered device?" }), _jsx("p", { children: "Try the passkey you already registered on that device." }), _jsx("a", { href: "/staff/sign-in", children: "Try signing in again" })] }), _jsxs("li", { children: [_jsx("strong", { children: "Lost your staff passkey?" }), _jsx("p", { children: "Contact the Owner so they can verify your identity and authorize a replacement." }), _jsx("a", { href: "/enroll", children: "I have a recovery token" })] }), _jsxs("li", { children: [_jsx("strong", { children: "Recovering the Owner account?" }), _jsx("p", { children: "Use the one-time recovery code you stored offline." }), _jsx("a", { href: "/owner-recovery", children: "Use an Owner recovery code" })] })] }), _jsx("div", { className: "auth-flow-links", children: _jsx("a", { href: "/sign-in", children: "Back to sign-in options" }) })] });
}
