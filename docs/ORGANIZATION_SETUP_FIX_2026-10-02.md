# Initial organization setup fix — 2026-10-02

## Scope and approved context

Owner reported inability to create an organization, objected to the initial Reason field, and supplied a screenshot showing the organization load error and disabled Create organization button. S03 scope: R-004.a–d, R-006.a–c, R-007.b, R-008.a, R-009.a and R-092. S03_SPEC requires durable actor/reason/time evidence for organization writes; initial creation does not require a human-authored note in the approved source. No schema, membership policy or authorization change is in scope.

## Root causes and changes

- With no organization present, Prisma returned null. Nest's Express adapter sends an empty response for null, while OrganizationAdmin expects JSON. The GET controller now explicitly sends JSON null or the existing organization object after the existing Owner check.
- The initial form silently required a reason of at least ten characters; the screenshot contained eight. The initial form now submits the organization name alone. The API supplies the factual reason `Initial organization setup` when omitted, through the existing durable event path. Valid explicit reasons remain supported; invalid supplied reasons and unknown fields remain rejected by the existing strict schema. Other organization change forms keep their reason requirements.
- The shared disabled-button CSS used `cursor: wait`, producing the spinning mouse cursor even when no request was running. It now uses `not-allowed`.

All Owner readiness, five-minute fresh sign-in, origin, CSRF, service authorization and event recording paths remain in place. Existing data was not changed by this fix.

## Checks and limits

- Scoped ESLint for `app.tsx` and `organization.controller.ts`: passed.
- API build, including Prisma generation: passed.
- Web production build: passed with bundle-size and ineffective dynamic-import warnings.
- Web typecheck: failed in untouched `apps/web/src/workforce.tsx:80` (`unknown` not assignable to `ReactNode`); no unrelated fix was made.
- Restarted the verified test API process. API readiness reported ready/database ready; private HTTPS home returned HTTP 200.
- No automated tests were added or run. No authenticated browser creation was verified; the browser tool failed to start because of the Windows sandbox ACL error. The Owner must refresh and confirm creation. This does not claim a slice or production acceptance.

Models actually used: GPT-6.1 Sol for context and root-cause review; GPT-6 Luna for bounded form/controller implementation. Root handled cursor styling, runtime restart and final review.
