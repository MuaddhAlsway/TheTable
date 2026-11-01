# System test report — 1 November 2026

All seven automated suites completed successfully after updating stale test assumptions. No failing checks remain in the suites listed below.

| Suite | Result | Scope |
| --- | --- | --- |
| Frontend `test:routes` | PASS | 11 routes, single main/footer, active navigation, protected-page fallback |
| Frontend `test:cart` | PASS | Add/deduplicate, quantities, totals, removal, cross-page state, refresh persistence |
| Frontend `test:menu` | PASS | Search, categories, empty-state recovery, images, add feedback, widths 320–1440px |
| Frontend `test:checkout` | PASS | Saudi mobile normalization, required fields, pickup timing, delivery coverage/minimum/fee, unavailable setup, responsive layout |
| Frontend `test:responsive` | PASS | Public pages at 320/390/768/1024px, mobile/tablet/landscape navigation, hero controls and images |
| Frontend `test:flow` | PASS | Authenticated UI fixtures: dish/allergen popup, isolated carts, checkout/payment review dialogs, failed-save-response retry after refresh with identical request key, exactly one saved order, server-paid cart cleanup, customer order/reservation/history views, role gates, cashier acceptance and ETA dialog, kitchen preparation/ready, delivery handoff, content publication, back-to-top, dashboard widths 320/768/1440px |
| Backend `test:flow` | PASS | Eight integration groups using the actual server services, MongoDB, and signed webhook controller |

Frontend build/type-check/lint and backend type-check/build also passed. Browser flow checks recorded zero page runtime errors and zero unexpected native dialogs.

## Backend coverage

- Orders persist; identical request keys replay one order; changed payloads conflict; other customers cannot read an owned order.
- Unpaid orders appear at cashier but not kitchen; unpaid acceptance/preparation is rejected.
- Server pricing includes valid selected options; unknown options, unsupported delivery areas and below-minimum orders are rejected.
- Checkout sessions enforce ownership/origin, use server totals and reuse an open session.
- Missing/invalid Stripe signatures and wrong amounts are rejected. A valid synthetic signed payment moves the order to pending confirmation. Identical deliveries do not duplicate history; conflicting payloads for the same event ID are rejected.
- Paid cashier acceptance supplies kitchen estimates and preparation notes while excluding customer contact/address/prices from the kitchen DTO.
- Unauthorized roles, stale actions, invalid transitions and premature delivery completion are rejected. Pickup and delivery both reach completed through their correct sequence.
- Signed session expiry records failed payment. Cancellation requires a reason.
- Opening hours and closing cutoffs are enforced. Reservation ownership, confirmation and future-completion restrictions are verified.
- Content editing requires admin authorization; publication, stale revision conflicts, unknown fields, unsafe image URLs and reset-to-default behavior are verified.

## Isolation and external integrations

The backend suite used uniquely named `tbl_flow_…` databases on the configured MongoDB connection. Both successful runs confirmed deletion of their exact temporary database. No fixtures were written to `thetable`, no real order statuses were changed, and no real charges or refunds were made. Existing `.env` files were not changed, exposed or copied.

Stripe network methods were replaced only inside the test process. Signature checks used the real Stripe SDK with a synthetic signing secret. The browser suite used a test-only authentication provider and intercepted fixture API/Stripe responses. Production code does not import these test fixtures.

These checks do not verify real Clerk Google/email login, Stripe-hosted card entry/SCA, Stripe-to-Render webhook delivery, physical pickup/delivery, refunds, printers or other POS hardware. A controlled Stripe test-mode transaction using real authenticated customer/staff sessions is still required to certify those integrations.

## Deployed availability checks

- Local API `/health`: HTTP 200.
- Render API `/health`: HTTP 200.
- Vercel homepage: HTTP 200.
- Render CORS preflight from `https://the-table-khaki.vercel.app`: HTTP 204 with that allowed origin.

These deployed checks confirm availability/CORS only; they do not prove the latest local changes have been deployed.

## Fixes and test maintenance

The audit found stale hardcoded hours in the Footer and homepage location section. Both now read the confirmed restaurant schedule; unconfigured schedules show a clear fallback. Dead content-editor fields for operational hours were removed. The Stripe SDK client is reused in-process, retaining all existing payment checks.

Older tests were updated for current page titles, image-loader wrappers, delivery selectors and cart persistence. Test Vite instances explicitly disable real API/Clerk settings unless the isolated browser fixture is in use.

Non-blocking warnings remain: the frontend bundle exceeds Vite's 500kB warning threshold, and existing Mongoose calls use a deprecated `new` option. These warnings did not fail the checks.

## Reproduction

From `client/`: run `npm run test:routes`, `npm run test:cart`, `npm run test:menu`, `npm run test:checkout`, `npm run test:responsive`, and `npm run test:flow`.

From `server/`: run `npm run test:flow`. Its database user needs permission to create and remove the isolated test database. The suite checks its database name before any fixtures are written and before cleanup.

Screenshots: `client/test-results/system-flow/kitchen-desktop.png` and `client/test-results/system-flow/cashier-desktop.png` (synthetic fixtures only).

## Staff and delivery implementation update — 1 November 2026

The website content collection was explicitly initialized: `thetable.websitecontents` contains one website document with 450 persisted default/content fields, preserving custom edits. Startup safely backfills missing defaults.

The backend suite was extended to nine integration groups for staff role assignment/edit/removal, protected administrators and stale-update guards, invitation/revocation fixtures, driver assignment, assignment-scoped task visibility, wrong-code rejection, and verified driver completion. Browser checks now also exercise the staff editor, customer driver/code display, and the driver handoff screen. Existing manual delivery completion now requires the recipient’s code; it does not simulate dispatch or receipt. Test-only Clerk invitation calls remain stubbed; no invitations were sent to actual people during implementation.

Actual driver registration, invitation acceptance and physical pickup/delivery are operational setup steps. No actual driver identity or contact was invented. No live payment or real order status was changed while implementing this update.

## Email workspace assignments — 2026-11-01
Added admin email + Kitchen/Cashier assignments, including pending registration. Backend isolated MongoDB integration flow passed all 10 groups, including unverified-email exclusion, verified activation, role changes, revocation, and existing protected/admin role guards. Browser fixture flow passed with the new simple form and existing advanced team controls. Server/client production builds and frontend lint passed. Existing bundle-size and Mongoose deprecation warnings remain. Clerk operations in verification were stubbed; no real staff assignments or invitations were created. Deploy both frontend and backend to expose the changes publicly.

## Own-driver delivery workflow additions — 2026-11-01
Added optional exact GPS coordinates to checkout and order schema with finite/range validation, current-location permission handling, manual entry and map preview. Driver navigation prefers coordinates; written-address navigation remains supported for existing orders. Added authenticated driver acknowledgement, collection and arrival, timestamped MongoDB delivery events, issue reporting and cashier resolution queue. New dispatches require the checklist before customer-code handoff; unresolved issues block completion. Private issue notes/events are removed from customer DTOs; customer screens show actual recorded progress and support-needed state.

Validation passed: server and frontend production builds, frontend lint, browser fixture flow including alert activation, coordinate navigation, driver checklist, address issue -> cashier resolution -> recipient code, and 320/768/1440 dashboard widths. All 10 isolated MongoDB backend integration groups passed, including coordinate persistence, wrong-driver rejection, progress sequence, mandatory new-dispatch checklist, unresolved-issue blocking and stale resolution rejection. Temporary databases were removed. No real payments or production orders were created. Existing bundle-size and Mongoose deprecation warnings remain. Actual device GPS accuracy, mobile suspension behavior, notification permissions and physical delivery are operational checks; alerts are foreground/open-dashboard polling, not background push/SMS. See DELIVERY_OPERATIONS.md.

## Driver assignment from the simple email form — 2026-11-01
Extended email-based role assignments to Driver, with Saudi phone validation/normalization, pending registration, immediate Clerk/MongoDB synchronization for verified accounts, editable phone/role, enable/disable and protected-administrator handling. Active deliveries block access removal or contact/role changes. Drivers signing in through the default login flow or staff link are routed to /driver using the backend-verified profile; direct account access remains available.

All 10 isolated backend integration groups passed, including driver phone-required rejection, normalized phone metadata, MongoDB driver snapshot and revocation. Browser fixture flow passed with simple driver email creation, driver sign-in link and automatic login redirect. Frontend/server builds and frontend lint passed. Clerk authentication/metadata operations were fixture-backed for verification; no actual staff accounts were changed or emails sent. Redeploy both applications.

## Background driver Web Push — 2026-11-01
Implemented authenticated device subscription ownership, restricted vendor endpoints, matched VAPID configuration, a persistent per-assignment/device outbox, atomic leases and crash recovery, at most five claimed attempts with exponential retry, provider-expired device cleanup, revoked-role checks and acknowledgement/completion suppression. Added a push-only service worker with generic lock-screen messages and fixed /driver navigation, PWA manifest/icons, Vercel static exclusions, driver opt-in/out and cashier overdue acknowledgement warnings/call links (default 120 seconds). Local signing credentials were newly generated into ignored server/.env.push.local, without modifying server/.env or displaying keys. Render configuration and always-running hosting are still required for production.

Passed: server/frontend production builds, frontend lint, full browser restaurant fixture flow, 11 isolated backend workflow groups, dedicated isolated push verification including concurrent claims/lease recovery, attempt cap, retries, ownership/role/SSRF guards, expired cleanup, acknowledgement cancellation and access removal. Service-worker VM checks passed for fixed private message/destination and no API cache. Browser subscription fixtures passed driver enable/disable and cashier overdue-warning display. No real staff subscriptions, real push sends or live payments were used. Temporary databases were removed. Local /health, /sw.js and /manifest.webmanifest returned HTTP 200 with appropriate content types. Existing bundle-size/Mongoose warnings remain. Real-phone OS delivery and production VAPID/always-running Render setup must be verified with WEB_PUSH_SETUP.md.
