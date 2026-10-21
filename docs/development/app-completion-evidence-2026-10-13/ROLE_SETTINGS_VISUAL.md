# Role task-form setting — component verification

Synthetic browser fixture built from current `App`, global styles and studio theme. Every fetch uses in-memory responses, all browser network requests are aborted, and writes throw. No application server, login, database, migration or real account is used. This is component evidence, not authenticated acceptance.

The Owner's role form fits at 1440×900, 1024×900, 390×844 and 320×740. All controls remain inside the viewport; the document has no horizontal overflow or browser page errors. Mobile select, reason and save controls meet the 44px target. The 320px and desktop captures were visually inspected: labels, values, reason and save action are readable and retain the existing form styling.

`role-settings-geometry.json` records measurements and SHA-256 inputs. The three source hashes remained unchanged through capture. The reusable fixture/runner and all four captures are under `.env.s27-tools/role-settings-*`; selected captures are retained here. Current-source application acceptance remains pending.
