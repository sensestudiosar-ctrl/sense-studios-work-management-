import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { App } from "./app.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root is missing.");
const ClientPortalAuth = React.lazy(async () => ({ default: (await import("./client-portal-auth.js")).ClientPortalAuth }));
const ExternalPortalWorkspace = React.lazy(async () => ({ default: (await import("./external-portal.js")).ExternalPortalWorkspace }));
const PublicPortfolioPage = React.lazy(async () => ({ default: (await import("./gallery.js")).PublicPortfolioPage }));

createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/client-portal/*" element={<React.Suspense fallback={<p role="status">Loading client portal…</p>}><ClientPortalAuth /></React.Suspense>} />
        <Route path="/external-portal/*" element={<React.Suspense fallback={<p role="status">Loading external portal…</p>}><ExternalPortalWorkspace /></React.Suspense>} />
        <Route path="/portfolio" element={<React.Suspense fallback={<p role="status">Loading portfolio…</p>}><PublicPortfolioPage /></React.Suspense>} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
