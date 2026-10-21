# Login UI reference shortlist — Refero

Date: 17 October 2026  
Status: researched recommendations for the [separate user login plan](LOGIN_FLOWS_BY_USER_2026-10-17.md); not selected mockups or implementation.

## Recommendation

Use **Family's focused single-column form** as the common login composition. Borrow **Mercury's password-field/action details** for clients and **Dock's code-step instructions** for consultants/vendors/factory users. Use **Family recovery setup** for the protected Owner setup step and **Dropbox's settings rows** after sign-in.

Keep one Sense Studios visual system across all user journeys: existing pine actions/navigation, warm canvas, white surfaces, Inter/system type, fine borders and visible focus. The existing approved brand/current tokens supply visual direction; this session's additional style query also returned NO_RESULTS. The six screen records below were retrieved in full and visually inspected. Mercury's full image could not be rendered, so its thumbnail was inspected successfully.

Separate user flows do not require14 different visual identities. Owner/staff share one passkey form pattern; Primary/Additional Clients share one proposed password pattern; EXTERNAL users share one code pattern with audience-specific copy and current-grant destinations. Public visitors need no login.

## At a glance

| Use in Sense Studios | Direct Refero reference | Specific contribution |
| --- | --- | --- |
| Owner and staff sign-in | [Family — passkey sign-in](https://refero.design/pages/caf2b40a-491b-4ed1-ac54-fcf422a062b7) | Single focused column, recognisable email context, one prominent passkey action and a simple Back link. |
| Owner setup and offline recovery kit | [Family — account recovery setup](https://refero.design/pages/ca6ab003-f7ab-4bf6-96d1-3ba3fdb573c2) | A dedicated recovery-code step, short explanation, clearly separated code area and explicit saved-code acknowledgement. |
| Primary and Additional Client sign-in | [Mercury — login form](https://refero.design/pages/94763a9a-67e9-43bf-b644-9851e421d116) | Clearly labelled email/password, Show password, recovery next to the password field and strong primary/secondary action hierarchy. |
| Client forgot password request | [Cal.com — forgot password](https://refero.design/pages/48a1e812-f5d1-48ce-a9a3-655111c33289) | One email field, one reset-request action and an obvious Back to sign in path. |
| Consultant, Vendor and Factory code entry | [Dock — email-code verification](https://refero.design/pages/637c7ad0-39ff-4fc1-88b4-fcacf73c57d8) | A clear “Check your email” step, the user-entered email context, expiry guidance and spam/help instructions. |
| Account security and active sessions | [Dropbox — personal account security](https://refero.design/pages/6bb72ede-e9e9-4da2-a2a1-757f29547caa) | Security settings as clean rows: title/help on the left, current status and action on the right; devices/sessions in a separate section. |

## 1. Family — passkey sign-in

**Use for:** Owner and staff sign-in  
[Open this screen in Refero](https://refero.design/pages/caf2b40a-491b-4ed1-ac54-fcf422a062b7)

![Family — passkey sign-in](https://images.refero.design/screenshots/family.co/desktop/d01856fd-402f-4839-8c5b-7b0ec54c7bdf_preview.jpg)

**Adapt:** Single focused column, recognisable email context, one prominent passkey action and a simple Back link.

**Keep bounded:** Use “Can't sign in?” for approved recovery. Do not copy Family's staff password fallback, blue palette or low-contrast text.

## 2. Family — account recovery setup

**Use for:** Owner setup and offline recovery kit  
[Open this screen in Refero](https://refero.design/pages/ca6ab003-f7ab-4bf6-96d1-3ba3fdb573c2)

![Family — account recovery setup](https://images.refero.design/screenshots/family.co/desktop/873c3e37-d5b0-45c0-8b92-4d558c14dba2_preview.jpg)

**Adapt:** A dedicated recovery-code step, short explanation, clearly separated code area and explicit saved-code acknowledgement.

**Keep bounded:** Keep the existing second-passkey requirement and acknowledged offline storage. Show a real code only after protected issuance; reference/demo codes never enter our product.

## 3. Mercury — login form

**Use for:** Primary and Additional Client sign-in  
[Open this screen in Refero](https://refero.design/pages/94763a9a-67e9-43bf-b644-9851e421d116)

![Mercury — login form](https://images.refero.design/screenshots/mercury.com/desktop/94763a9a-67e9-43bf-b644-9851e421d116_preview.jpg)

**Adapt:** Clearly labelled email/password, Show password, recovery next to the password field and strong primary/secondary action hierarchy.

**Keep bounded:** Borrow the form details only. Omit the referral/promotion column; use our proposed email-code alternative rather than importing an additional client passkey sign-in method.

## 4. Cal.com — forgot password

**Use for:** Client forgot password request  
[Open this screen in Refero](https://refero.design/pages/48a1e812-f5d1-48ce-a9a3-655111c33289)

![Cal.com — forgot password](https://images.refero.design/screenshots/cal.com/desktop/1012c03c-efc8-4ced-b0ab-d14a09a0ba3c_preview.jpg)

**Adapt:** One email field, one reset-request action and an obvious Back to sign in path.

**Keep bounded:** Our generic durable acknowledgement, resend/error and expired/used-link states still need specification; this single screenshot does not prove those states.

## 5. Dock — email-code verification

**Use for:** Consultant, Vendor and Factory code entry  
[Open this screen in Refero](https://refero.design/pages/637c7ad0-39ff-4fc1-88b4-fcacf73c57d8)

![Dock — email-code verification](https://images.refero.design/screenshots/dock.us/desktop/97c45dc3-e983-4c36-bea3-9c02e8017ee3_preview.jpg)

**Adapt:** A clear “Check your email” step, the user-entered email context, expiry guidance and spam/help instructions.

**Keep bounded:** Keep one labelled pasteable code input, plus change-email/resend controls. Do not copy six separate focus-jumping inputs, decorative circles or unsupported resend timing.

## 6. Dropbox — personal account security

**Use for:** Account security and active sessions  
[Open this screen in Refero](https://refero.design/pages/6bb72ede-e9e9-4da2-a2a1-757f29547caa)

![Dropbox — personal account security](https://images.refero.design/screenshots/dropbox.com/desktop/6bb72ede-e9e9-4da2-a2a1-757f29547caa_preview.jpg)

**Adapt:** Security settings as clean rows: title/help on the left, current status and action on the right; devices/sessions in a separate section.

**Keep bounded:** Expose only implemented, authorized features. Do not import recovery-email changes, an MFA off toggle, security checkup, location inference or every Dropbox account feature.


## Full journey references

- [Reown — password reset, six steps](https://refero.design/flows/5727): useful for Client sign in → Forgot password → request → new password → completion → ordinary sign-in. Use our planned durable confirmation in place of a transient email-sent toast.
- [Contra — email-code sign-in, eight steps](https://refero.design/flows/4815): useful for the distinct email/code stages, invalid-code correction and return to authenticated work. Borrow sequencing, not segmented inputs/social login/rewards.
- [Voicenotes — generic reset acknowledgement](https://refero.design/pages/eae29959-ed62-4641-934f-7ba59c33dc52): useful supporting copy/state reference; do not reveal whether an account exists.

These were inspected earlier in this conversation and are preserved in the linked planning evidence. Their UI patterns do not supersede S02/S14/S21 authentication, recovery, grants or exact approval rules.

## Proposed screen direction

| Surface | Proposed composition |
| --- | --- |
| Owner and all internal staff | Brand mark → audience title → work email → Continue with passkey → Can't sign in? / invitation help |
| Owner setup | Small progress indicator → current required setup step → second passkey or protected recovery-code area → explicit saved-code acknowledgement |
| Primary and Additional Client | Brand mark → Client sign in → email → password/Show password → Forgot password → Sign in → Email me a code |
| Client recovery | Narrow one-field request → durable generic acknowledgement → focused reset form → success → Sign in |
| Consultant / Vendor / Factory | Audience-labelled email request → Check your email → one pasteable code field → Verify → scoped project context |
| Account security | Section title → existing authorized security rows → separate devices/sessions list → clear current-device indicator |

Keep auth forms approximately400–440px wide on desktop as a proposed readable target, fluid with at least16px side gutters on small screens. This width is a new layout recommendation, not a measured property of every reference. Retain at least44px touch targets and the current approved accessibility/keyboard requirements.

Do not use Mercury's referral split panel as our default auth layout. At320/390px every form must work in one column with the mobile keyboard open. Native passkey prompts remain controlled by the browser/device; these references guide the page around that prompt.

## Decision ledger

| Decision | Source and role |
| --- | --- |
| Dominant form structure | Family passkey screen: single-column composition only |
| Client form details | Mercury: password visibility/recovery/action hierarchy only |
| External verification context | Dock: email/code instructions only |
| Owner recovery acknowledgement | Family recovery: protected code step and explicit saved confirmation only |
| Password request simplicity | Cal.com: one field/action and clear return path only |
| Account settings hierarchy | Dropbox: rows and session grouping only |
| Palette/type/status semantics | Existing Sense Studios approved brand and current theme, not another product's colors |

This is the recommended reference set for LOGIN-02 screen specification. Before build, turn it into concrete Sense Studios screens covering ready, pending, invalid, throttled, expired, revoked and success states at the four agreed widths. No application, schema, account, mail, runtime or feature-test operation was performed to produce this shortlist.

Actual author: current Codex agent; no independent Opus/Sonnet or final security acceptance review is claimed.

