# MW-I02 acceptance stopped at source readiness

14 October 2026. Attempt `1791961422817-7a2ae5da0968`.

**Functional Reliability: BLOCKED for the new candidate.** Prior Owner-accepted bounded functional PASS remains preserved.

**Prototype Visual Fidelity: BLOCKED.** No new authenticated screenshots or comparisons were produced.

## Exact cause

The Owner approved candidate `752761cbc613f382a4abcfdc58bd209e5cc1b18ec166ba5d7de7eb94e8f722b2` on separate acceptance ports59542/59543. Its source was frozen at11:37:20 IST. Before execution, `apps/web/src/actionable-work.css` changed at12:33:26 IST. The one approved preflight began at12:33:42 IST and rejected that file's checksum during its first source-readiness stage.

| Evidence | Value |
| --- | --- |
| Expected CSS SHA256 | `9789877029e7682829dc1780e2f519d698c7d4268e7d693fb6bb1d0b1f24f686` |
| Observed CSS SHA256 | `58adf2db6c435db02d9414fe0bd0aaf79ede2d11fed7b600c50176853f6be590` |
| Native preflight exit |1|
| Failed invariant | Frozen candidate source bytes must match |
| Native error | Source readiness failed |

This is concurrent source drift, not a demonstrated application or database defect. The guard was retained and worked as intended. No retry or source substitution was made.

Evidence preserved:

- `.env.checkpoint-tools/mw-i02-approved-attempt-1791961422817-7a2ae5da0968.json`
- `.env.checkpoint-tools/mw-i02-approved-preflight-1791961422817-7a2ae5da0968.log`
- `.env.checkpoint-tools/mw-i02-source-drift-1791961422817-7a2ae5da0968.json`
- Approved `candidate-source.json`, its original passing source/readiness evidence and v8 synthetic screenshots.

## Operations reached

Runtime/context checks and source readiness were invoked. Source readiness failed before PostgreSQL status, process/live identity, SQL absence checks or any conditional startup. Setup, migrations, fixtures, task integration, authenticated Playwright, Review and parity persistence were not reached.

No run database, application processes or sessions were created. Manifest-bound cleanup and cluster restoration were therefore not applicable; neither was invoked. This attempt performed no preview changes or PostgreSQL operations. Current cluster safety and catalog preservation were not newly established because those guards were not reached.

The earlier359 API /453 frontend tests, typecheck/lint/build and800 readiness checks apply to the approved frozen source. They do not verify the subsequently changed CSS. Prior acceptance evidence stays intact; no new functional regression or visual PASS is claimed.

## Next gate

Review the revised CSS, obtain matching source/component checks, then freeze a stable candidate. Coordinate an edit pause on the acceptance inputs through approval and execution, or prepare an isolated immutable source snapshot for review; neither changes application functionality. Do not bypass checksum checks or repeat an authenticated attempt against a moving checkout.

The specific one-run authorization required stopping on failed guards. A general “continue” does not authorize a retry or revised source under that condition. No renewed execution request is made before revised preparation is ready. MW-I02 remains IN PROGRESS; MW-I03 is excluded.

GPT-6.1 Sol independently reviewed the authorization boundary and confirmed the required stop. No live operations were performed by that review.
