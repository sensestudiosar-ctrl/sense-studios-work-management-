import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./app.js";
import "./styles.css";
import "./studio-theme.css";
import { PhoneInstall, PwaUpdateNotice } from "./pwa-delivery.js";
import { ReleaseStatus } from "./release-status.js";
import { RouteAccessibility } from "./route-accessibility.js";
import "./ux-usability.css";
// Load the shared shell after module styles so every internal route uses one frame.
import "./my-work-shell.css";
import "./dashboard-shell.css";
const root = document.getElementById("root");
if (!root)
    throw new Error("Application root is missing.");
const ClientPortalAuth = React.lazy(async () => ({ default: (await import("./client-portal-auth.js")).ClientPortalAuth }));
const ExternalPortalWorkspace = React.lazy(async () => ({ default: (await import("./external-portal.js")).ExternalPortalWorkspace }));
const PublicPortfolioPage = React.lazy(async () => ({ default: (await import("./gallery.js")).PublicPortfolioPage }));
const V15PreviewLazy = React.lazy(async () => ({ default: (await import("./__v15-preview.js")).V15Preview }));
createRoot(root).render(_jsx(React.StrictMode, { children: _jsxs(BrowserRouter, { children: [_jsx(RouteAccessibility, {}), _jsx(PwaUpdateNotice, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/install", element: _jsx(PhoneInstall, {}) }), _jsx(Route, { path: "/client-portal/*", element: _jsx(React.Suspense, { fallback: _jsx("p", { role: "status", children: "Loading client portal\u2026" }), children: _jsx(ClientPortalAuth, {}) }) }), _jsx(Route, { path: "/external-portal/*", element: _jsx(React.Suspense, { fallback: _jsx("p", { role: "status", children: "Loading external portal\u2026" }), children: _jsx(ExternalPortalWorkspace, {}) }) }), _jsx(Route, { path: "/portfolio", element: _jsx(React.Suspense, { fallback: _jsx("p", { role: "status", children: "Loading portfolio\u2026" }), children: _jsx(PublicPortfolioPage, {}) }) }), _jsx(Route, { path: "/v15-preview", element: _jsx(React.Suspense, { fallback: _jsx("p", { role: "status", children: "Loading\u2026" }), children: _jsx(V15PreviewLazy, {}) }) }), _jsx(Route, { path: "*", element: _jsx(App, {}) })] }), _jsx(ReleaseStatus, {})] }) }));
