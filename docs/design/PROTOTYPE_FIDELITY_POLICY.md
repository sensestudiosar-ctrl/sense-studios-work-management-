# Prototype fidelity and existing application integration policy

10 October 2026. This policy applies to already-approved work on existing modules and to any new module whose implementation is separately authorized. It provides a fidelity rule; it does not authorize work, expand a slice, or grant application-wide redesign authority.

## Approved visual reference

For a slice with an Owner-approved prototype, the exact approved prototype is the sole visual reference. For MW-I02, that reference is [prototype.html](<D:/app/reference from codex chat/Sense_Studios_My_Work_UX_Package/Sense_Studios_My_Work/prototype.html>), SHA-256 `F8C18088E04C72ACEE34C38BDB458BF84FC8CF9FC834667A75E3D5A3D95C59B8`. If the approved reference is missing or its identity cannot be confirmed, request the correct reference; do not substitute a guessed or generalized reference. A prototype is a reference for evaluating the production application; it is not a replacement deliverable, demo, or authorization for a new application.

Within each separately authorized slice, retrofit the existing UI to the approved prototype's layout, navigation, widgets, rows, cards, colors, fonts, spacing, forms, drawers, filters, responsive behavior, and interactions, as applicable to that slice. Preserve the production application's APIs, database contracts, business logic, permissions, workflows, validation, persistence, audit behavior, and cross-module behavior. A fidelity goal does not authorize broadening the slice or changing those contracts. MW-I02 remains limited to its settled widget, control, state, and density scope; preserve accepted MW-I01 functional work. Record known MW-I01 visual deviations as future bounded remediation; do not present them as differences observed in an actual application comparison that has not run. No application-wide redesign is authorized by this policy.

## Slice boundaries

Each module acceptance remains limited to its separately authorized scope and must use the real application route, components, data contracts, and states. Later slices MW-I03 through MW-I08 require their own authorization and must include the existing UI in their scope. MW-I09 owns the final cross-screen acceptance gate. These boundaries do not grant authority for work in those later slices or broaden MW-I02.

## Visual acceptance

Before an authorized module slice can complete, compare the actual application with the exact approved prototype using equivalent data and states at the viewports and acceptance conditions approved for that slice. For MW-I02, use 1440, 1024, 390, and 320 pixel widths and authenticated production-route states. Retain actual application images, matching reference images, and a regression report. Report each required acceptance gate separately as PASS, FAIL, or BLOCKED and obtain Owner approval before marking the slice complete. Prototype-only captures and mocked component images cannot establish actual-application fidelity.

An unavailable runtime, database, authentication path, or required state leaves the affected gate BLOCKED. Do not infer a visual pass from source review or from prototype captures alone.

Each screen requires **UI/UX Fidelity: PASS** and **Functional Reliability: PASS**, supported by actual evidence and submitted for Owner approval. MW-I02 reports its visual gate as **Prototype Visual Fidelity**. Neither gate can be waived by completed functionality or by visual appearance alone.
