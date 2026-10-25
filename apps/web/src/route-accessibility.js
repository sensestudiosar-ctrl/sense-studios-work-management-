import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
/** Shared landmarks for existing routes; no reload or navigation-state reset. */
export function RouteAccessibility() {
    const { pathname } = useLocation();
    const [target, setTarget] = useState("sense-main");
    useEffect(() => {
        let resolved = false;
        const identify = () => {
            const main = document.querySelector("main");
            if (!main)
                return;
            if (!main.id)
                main.id = "sense-main";
            main.tabIndex = -1;
            setTarget(main.id);
            const heading = main.querySelector("h1,h2");
            if (!heading)
                return;
            heading.setAttribute("data-sense-page-title", "");
            if (resolved)
                return;
            resolved = true;
            if (!document.querySelector("dialog[open]")) {
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            }
        };
        const observer = new MutationObserver(identify);
        observer.observe(document.body, { childList: true, subtree: true });
        identify();
        return () => observer.disconnect();
    }, [pathname]);
    return _jsx("a", { className: "sense-skip-link", href: `#${target}`, onClick: event => { const main = document.getElementById(target); if (main) {
            event.preventDefault();
            main.focus();
            main.scrollIntoView({ block: "start" });
        } }, children: "Skip to main content" });
}
