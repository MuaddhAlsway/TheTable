# Workflow audit and fixes

## Implemented flow

Cart -> authenticated server-priced pending order -> Stripe-hosted Checkout -> signed payment webhook -> paid pending-confirmation order -> cashier acceptance -> kitchen preparation -> ready -> cashier pickup handoff or manual delivery dispatch/completion.

Clerk roles are enforced by the server. The kitchen receives only accepted paid orders and an allowlisted data projection. Customers read only their own verified Clerk-user records. Staff mutations check the current order state, payment state, expected timestamp, role, configured workflow, and action ID. A frontend redirect does not mark payment successful.

## Fixes in this audit

- Kitchen queue projection now includes the stored ready-estimate timestamps.
- Customer order detail refreshes every 15 seconds and on return to the browser tab; it continues to show the last successfully fetched order during a refresh.
- Protected API resource snapshots are scoped to the current account and URL, avoiding prior-account/previous-route data flashes. Requests have bounded timeouts and unmount cancellation.
- Shared API requests time out rather than leaving the menu, settings, or checkout waiting indefinitely.
- Checkout reuses an account-scoped, tab-scoped idempotency key after refresh for the same payload. Stored request metadata contains a SHA-256 payload hash and request/order IDs, not customer addresses, tokens or payment data.
- Only an API-confirmed paid order associated with this tab's checkout can clear its matching cart. A changed bag is preserved. Old historical orders and frontend success parameters do not clear the bag.
- Closed/expired payment-session errors release the matching stored request key so a fresh checkout can be created. Paid/rejected/cancelled states are explained accurately; the UI does not claim a refund was issued.
- Zero-total orders are rejected before saving because this project requires Stripe for all orders.

## Verification limits

Build/type-check/lint and read-only HTTP checks do not prove a successful Stripe transaction or a complete authenticated customer/staff session. No automated test suite, payment, refund, or real order mutation was performed during this audit. A controlled test-mode transaction with separate customer/cashier/kitchen accounts is still required to verify the webhook delivery and each handoff in the deployed environment.

The restaurant's confirmed 08:00-midnight Asia/Riyadh schedule and near-closing fulfillment cutoff remain enforced. Delivery uses the configured service-area allowlist, fee, and minimum. Exact street-address confirmation remains an operational responsibility. Refund creation/synchronization, driver integrations, and POS hardware are not implemented by these fixes.

## Remaining acceptance walkthrough

During configured opening hours, use a Stripe test-mode environment: add current MongoDB menu items, refresh the cart, submit delivery or pickup, complete hosted payment, wait for API-paid status, accept as cashier, start/finish as kitchen, and record actual pickup or delivery handoff as cashier. Confirm the customer history reflects each server-reported transition. Check cancelled/expired checkout without treating it as paid. Replay protections must be exercised in an isolated verification environment if further automated testing is requested.

Deploy the updated backend to Render and frontend to Vercel together before verifying the deployed workflow.

## Local service-check results

- `GET /health`, public menu, and public content: HTTP 200.
- Customer orders/reservations, cashier queue, kitchen queue, fulfillment administration, and content administration without a session: HTTP 401.
- Unsigned `POST /api/webhooks/stripe`: HTTP 400.
- Public readiness reports online ordering enabled and Stripe configuration present; both fulfillment methods are currently closed under the saved 08:00-midnight Riyadh schedule.
- Frontend build/type-check/lint and backend type-check/build passed during this audit. No test suite was run.
