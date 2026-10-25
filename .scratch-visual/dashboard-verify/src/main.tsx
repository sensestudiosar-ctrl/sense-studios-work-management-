import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { App } from "../../../apps/web/src/app.js";
import { PhoneInstall, PwaUpdateNotice } from "../../../apps/web/src/pwa-delivery.js";
import { ReleaseStatus } from "../../../apps/web/src/release-status.js";
import "../../../apps/web/src/styles.css";
import "../../../apps/web/src/studio-theme.css";
import { applyMockFetch } from "./mock-fetch.js";

/* Mount the real App (the full production component tree) with a mock
   fetch layer so every page renders with representative data — no API
   or database required. */
applyMockFetch();

const root = document.getElementById("root");
if (!root) throw new Error("root missing");
createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <PwaUpdateNotice />
      <Routes>
        <Route path="/install" element={<PhoneInstall />} />
        <Route path="*" element={<App />} />
      </Routes>
      <ReleaseStatus />
    </BrowserRouter>
  </React.StrictMode>,
);
