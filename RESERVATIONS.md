# Reservation requests

Customer: `/reservations`, then `/account/reservations/<id>`. Account links show the signed-in customer's reservations only. New requests receive an RSV reference; older records retain their existing ID and display a short reference without migration.

Front of house: `/cashier/reservations` for verified cashier/admin accounts. Administrators can also use `/admin/reservations`. Staff navigation includes Reservation desk. Filters support status and visit date in Saudi Arabia. Lists/details refresh while visible every 15 seconds and provide manual retry.

## Workflow

1. Customer signs in through the existing Clerk flow and requests a future date/time, party size, name, valid email, Saudi mobile and optional notes. The server enforces configured restaurant days/hours and maximum party size. These settings remain in Admin → Location & fulfillment.
2. The request is saved as requested, not confirmed. A per-account, tab-scoped request hash/key protects retries across refresh; customer details are kept in a per-account tab draft until success. No password is stored.
3. Cashier/admin checks actual seating and confirms, or cancels with a customer-visible reason. Requests do not automatically allocate tables or reserve capacity.
4. Customer sees the actual status and history in their account and can cancel a future requested/confirmed reservation. Ownership is selected from the verified authentication actor, never browser email or user ID.
5. Staff can mark a confirmed visit completed only after its start time. Completion must reflect a real visit. It does not place a food order or collect payment.

Status changes require expected status and updatedAt. A database compare-and-set rejects stale/concurrent changes; customer responses omit internal request keys, owner IDs and history actor IDs. Customer cancellation endpoints cannot confirm or complete reservations. Kitchen/driver accounts cannot use the staff reservation desk.

## Operational limits

This is a staff-reviewed request system. There is no automatic seating-capacity calculation, timed table allocation, no-show policy, deposit or email notification. Optional SMS requires the separately configured Android gateway and explicit consent; see SMS_SETUP.md. Staff must check seating before confirming, and customers must check their account for the response. Table QR ordering remains a separate food-order flow.

No restaurant settings or existing reservations are replaced by this implementation. Deployment requires the existing Clerk/API/MongoDB settings and reservation enablement; no new environment variable is introduced.

## Verification

- `npm run --prefix client test:reservations`: isolated UI/auth/API fixtures cover mobile/tablet/desktop, field validation, retry after a lost response across refresh, customer details/cancellation, cashier confirmation and visit completion, history and role gates.
- `npm run --prefix server test:flow`: isolated MongoDB and signed payment fixtures, including reservation ownership/privacy, API authorization, reference creation, idempotency, stale/concurrent status changes, cancellation validation and past-visit completion. Its temporary database is removed; no live customer reservation or payment is created.
- Build commands for client/server and client lint verify TypeScript/integration consistency.
