# The Table API and restaurant operations

## Render startup fix: optional setup must not crash the API

The reported startup errors for CLIENT_ORIGINS and STRIPE_WEBHOOK_SECRET are fixed. Push/redeploy the updated server code. No local environment values were modified.

In production, an absent or empty CLIENT_ORIGINS produces an empty allowlist. Requests from browser origins are denied; authenticated API routes return AUTH_SETUP_REQUIRED until a frontend origin is configured. Clerk middleware is not started with an empty authorized-parties list. Originless Render health checks and signed provider webhooks can still reach their respective routes. An invalid nonempty origin is still rejected by validation.

An absent Stripe server key or webhook signing secret keeps payment readiness false, even if ORDER_CREATION_ENABLED is true. Order creation and payment sessions remain blocked, and unsigned/unconfigured webhook requests are never acknowledged as verified payments. Missing Stripe setup no longer stops server startup. Fixed startup warnings explain disabled features without logging values.

MongoDB and core authentication settings remain required. Startup still waits for MongoDB and index initialization before binding Render's port on 0.0.0.0. GET /health reports database availability.


## Deploy this backend to Render

No backend hostname is assumed or configured in source. Push this project to your Git provider, deploy it to Render, and use the backend URL Render generates afterward. The root render.yaml is an optional Blueprint template; for an existing service, enter the same settings manually instead of creating a duplicate service. The template service name is only a suggestion and does not guarantee a particular hostname.

| Render setting | Exact configuration |
| --- | --- |
| Service type / runtime | Web Service / Node |
| Root directory | server |
| Build command | npm ci --include=dev && npm run build |
| Start command | npm start |
| Health-check path | /health |
| Node version | 24, configured by server/.node-version and the Blueprint |
| Runtime mode | Set NODE_ENV to production in Render Environment |

The build explicitly installs development dependencies so the TypeScript compiler is present even when NODE_ENV is production. It compiles src into dist; npm start runs node dist/server.js. The server binds 0.0.0.0 using the validated process.env.PORT supplied by Render. If PORT is absent locally, it uses the development fallback. Do not hardcode a Render port or a generated public hostname.

Production startup validates core database/authentication configuration. Missing optional browser/payment setup disables those features without crashing API health, so Render can generate the backend URL before webhook registration. Validation reports field names only, never values. Render environment variables take precedence over local server/.env. The local file is optional on Render and must not be committed, uploaded or copied into the deployment.

| Required production variable name | Purpose |
| --- | --- |
| NODE_ENV | Production runtime mode. |
| MONGODB_URI | MongoDB Atlas connection, server-only. |
| CLERK_SECRET_KEY | Server-side Clerk authentication. |
| CLERK_PUBLISHABLE_KEY | Also required by this Express Clerk integration; configure separately from the Vite public variable. |
| CLERK_WEBHOOK_SECRET | Required for the Clerk webhook; add after registering its actual generated URL. Until configured, the endpoint returns 503. |
| STRIPE_SECRET_KEY | Required for payment/order requests; missing configuration blocks those requests without stopping API startup; server-only Stripe API access. |
| STRIPE_WEBHOOK_SECRET | Required when production ORDER_CREATION_ENABLED is enabled; add the actual endpoint signing secret after Render generates its URL. |
| CLIENT_ORIGINS | Required for browser/authenticated access. Missing means an empty production allowlist; no localhost or wildcard fallback. No paths or trailing slash. |

Render supplies PORT automatically. Set MONGODB_DB_NAME explicitly when the application database is not selected in the URI. Optional operational names are ORDER_CREATION_ENABLED and RESERVATION_CREATION_ENABLED; omitted switches default to disabled in a fresh deployment. Set them deliberately only after the corresponding restaurant/payment setup is complete. MONGODB_DNS_SERVERS is a local diagnostic override and should normally remain unset on Render. Do not copy local operating switches or DNS overrides blindly. The Blueprint prompts for core database/authentication settings and origins through sync:false entries; it contains no copied environment values. It omits frontend origins, webhook secrets and creation switches for the first deployment. Missing origins block browser and authenticated access; missing webhook secrets leave those endpoints unavailable and food ordering disabled. Neither blocks core API/health deployment.

The API connects to MongoDB and initializes collections/indexes before opening the HTTP listener. Configure Atlas network access and database-user permissions for Render. GET /health returns 200 when MongoDB is connected and 503 when disconnected. A failed startup never pretends the database is available. The existing graceful shutdown handles Render termination. Production trusts one reverse proxy for request IPs; retain that setting for this topology.

### Add the webhook after Render generates the URL

The existing implemented Stripe route is **POST /api/webhooks/stripe**. It is not /api/v1/webhooks/stripe. Do not add a second route. Build its public URL by appending the route to the actual backend origin shown in Render:

    YOUR_RENDER_BACKEND_ORIGIN/api/webhooks/stripe

Stripe setup sequence:

1. Deploy the updated backend from your Git repository using the settings above. Leave creation switches disabled for this first deployment; Render shows the generated backend origin on the service page.
2. In the matching Stripe account/mode, create the webhook destination with that generated origin plus /api/webhooks/stripe. Subscribe to checkout.session.completed and checkout.session.expired.
3. Set STRIPE_SECRET_KEY and that endpoint's signing secret as STRIPE_WEBHOOK_SECRET in Render Environment. Only after the restaurant settings and payment integration are verified, enable ORDER_CREATION_ENABLED and deploy/restart. Do not use a fabricated placeholder, a local CLI secret for the deployed endpoint, or the Clerk signing secret.
4. Set the Vercel VITE_API_URL to the generated backend origin plus /api/v1. Add that exact Vercel origin to server CLIENT_ORIGINS and Clerk, then rebuild the frontend. Server secrets never belong in Vite.
5. After deployment, verify health, authenticated requests and actual signed Stripe deliveries in the provider dashboards before enabling customer ordering. No deployment or payment verification was performed by this code preparation.

The identity route remains **POST /api/webhooks/clerk**, configured separately with its own secret and actual generated backend origin.

Both raw-body webhook routes are mounted before express.json and Clerk session middleware. Stripe constructEvent verifies the exact raw Buffer and Stripe-Signature using STRIPE_WEBHOOK_SECRET before any database/payment change. Persistent provider-event receipts deduplicate retries with processing leases, payload hashes and completed markers. Atomic order updates reconcile the saved session, owner, mode, amount and currency. Only a supported signed completed event with a paid payment status can mark an order paid; browser returns never do so. Checkout creation is already implemented with server-calculated order totals and Stripe idempotency keys. Refund/dispute handling and live end-to-end verification remain separate work.

### Git/environment verification

Root and server .gitignore rules explicitly exclude server/.env and environment variants while permitting .env.example. The inspected working folder currently has no Git metadata, so its tracked-file state cannot be audited here. After adding the code to your actual repository, verify before pushing:

    git check-ignore -v server/.env
    git ls-files --error-unmatch server/.env

The first command should identify an ignore rule; the second must fail because the real environment file must not be tracked. No real environment values were printed, modified, copied or committed for this deployment preparation.

Official Render references: https://render.com/docs/deploy-node-express-app and https://render.com/docs/web-services#port-binding.



## Active users and project administrator

The verified primary Clerk account `muaddhalsway@gmail.com` has been assigned `publicMetadata.role` of `admin` through the trusted Clerk Backend API, then re-read to confirm it. Its profile is persisted in `thetable.userprofiles`. Refresh the frontend account page to reload the server-verified role. This assignment applies to the currently configured Clerk application, not an unrelated or future production instance.

Authenticated API requests synchronize the trusted Clerk ID, name, primary email/verification state, role snapshot and Clerk sign-in/update timestamps into MongoDB. Preferences remain app-owned and are preserved. Existing unchanged profiles are read without repeated writes. Concurrent first requests use the unique Clerk ID index and retry the upsert safely. No password, token, signing secret or full Clerk payload is stored. Clerk remains the authority for authentication/roles; database role snapshots never grant access. Signed user deletion events continue to remove the app profile; other profile changes synchronize on the next authenticated request.

The offline, fixed-recipient administrator setup can be rerun explicitly:

```sh
npm run --prefix server setup:admin -- --confirm-admin
```

This script refuses an absent, ambiguous or unverified primary target and requires the `thetable` database. It never creates accounts or accepts a different target email. It merges the role through Clerk without overwriting unrelated metadata. There is no public role assignment endpoint and no automatic email-based promotion on login; other staff roles are managed through the trusted Clerk Dashboard.

## Named database and active menu

`MONGODB_DB_NAME` explicitly selects the database; this installation uses **thetable**. The URI, credentials and URI options are preserved. The previous `test` database is retained, not renamed or deleted. Collections and indexes initialize after connection; pre-connection auto-creation is disabled to avoid initialization races on a new database.

From the repository root, explicitly import the existing menu with:

```sh
npm run --prefix server seed:menu -- --confirm-menu
```

The script requires an explicit database name and confirmation flag. `src/data/menu.json` captures the six existing frontend mock dishes and prices in integer halalas. Insert-only slug upserts preserve existing dishes. The imported dishes now form the active menu; the earlier Demo menu label has been removed. Existing names, prices, availability and other tags are preserved. No fake users, orders, payments or reservations are created, and fulfillment switches remain unchanged. Original images are copied to `client/public/menu-images/`; include them in the frontend deployment. Restricted `/menu-images/` paths and HTTP(S) image URLs are supported.

Clerk pages use `/login/*` and `/signup/*`, path routing and explicit same-window OAuth redirects so callback/verification paths remain on the authentication page. A retry/help control is provided. Google authorization navigation was observed, but the account holder has since confirmed Google sign-in works. No account was created, CAPTCHA solved or security protection disabled. If verification still times out, retry in a normal supported browser and inspect Clerk/Google provider logs. Local routing changes cannot guarantee resolution of browser, network or provider challenges. Reference: https://clerk.com/docs/react/reference/components/authentication/sign-in.

Express, TypeScript, Mongoose and Clerk backend; the existing Vite frontend is in `../client`. Existing menu, shared cart, checkout, reservations and customer/admin accounts are preserved. Staff views are web workflows; no POS hardware, printer, cash drawer or terminal is connected.

## Run and validate

Use Node.js 22 or newer. From the repository root, in separate terminals:

```sh
npm ci --prefix server
npm run --prefix server dev
```

```sh
npm ci --prefix client
npm run --prefix client dev
```

Existing checks:

```sh
npm run --prefix server typecheck
npm run --prefix server build
npm run --prefix client typecheck
npm run --prefix client build
npm run --prefix client lint
```

Production server: `npm start --prefix server` after building. No backend lint command is configured. Automated tests must not be run without the user's request. Build/lint success does not verify database connectivity, deployed webhooks, real Clerk sign-in or an operational restaurant workflow.

Startup connects to MongoDB and initializes model indexes before listening. The URI options are honored; an explicit MONGODB_DB_NAME overrides its database selection. `/health` reports database readiness. Connection errors are sanitized.

## Environment: names and separation

Do not overwrite the real `.env` files with examples. Existing environment values were not renamed, copied into Vite or printed. Real environment files are ignored by Git.

| Server variable | Purpose |
| --- | --- |
| MONGODB_URI | Server-only database connection secret. |
| MONGODB_DB_NAME | Optional explicit application database selection. |
| CLERK_SECRET_KEY | Server-only Clerk API secret. |
| CLERK_PUBLISHABLE_KEY | Explicit publishable key required for authenticated Express routes. |
| CLERK_WEBHOOK_SECRET | Server-only signing secret for the configured Clerk endpoint. |
| CLIENT_ORIGINS | Comma-separated exact allowed browser origins, without paths, trailing slashes or wildcards. |
| NODE_ENV | Runtime environment. |
| PORT | Listening port; honor the hosting provider's port. |
| ADMIN_EMAIL | Informational intended account only; never grants a role. |
| ORDER_CREATION_ENABLED | Explicit pending-order creation switch; does not enable payment or acceptance. |
| RESERVATION_CREATION_ENABLED | Explicit reservation-request creation switch. |

Frontend public variables: `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_API_URL`. Vite reads the former directly. Set the latter to the backend HTTPS origin followed by `/api/v1`. Never put server secrets in a `VITE_` variable.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is now ignored; the Express fallback was removed. If an installation only has that legacy name, manually add `CLERK_PUBLISHABLE_KEY` from the same trusted Clerk application's dashboard. Existing values are left untouched. Until the explicit server key exists, protected APIs return an authentication setup error. Configure the frontend key separately and rebuild/restart Vite.

Without the frontend API configuration, the existing preview menu/cart/demo checkout remains a preview. API-connected failures do not silently substitute preview prices.

## Trusted Clerk role setup

The only staff roles are `admin`, `cashier` and `kitchen`; other/missing roles resolve to customer. Every authenticated API request validates the Clerk session and fetches the current user from Clerk server-side before authorizing. Clerk failures deny access. Email, browser metadata, body/query values and local storage cannot grant privileges.

1. Use the existing Clerk application and matching server/frontend keys.
2. Configure exact local/deployed origins and redirect URLs in Clerk.
3. Find the intended administrator `muaddhalsway@gmail.com` in Clerk Dashboard > Users, verifying the correct identity. Create the account through the trusted Dashboard if required. The verified account was assigned the admin role through the trusted Backend API during this implementation.
4. Open that user's public metadata editor. Merge the `role` property with string `admin`, preserving unrelated metadata. Save through the trusted Clerk Dashboard.
5. Select each verified staff user's own record and assign either `cashier` or `kitchen` through the same trusted process. Never copy arbitrary user IDs from a public request into a privileged assignment process.
6. Reload/sign in again and open the appropriate workspace. Removing/changing the role takes effect on subsequent backend requests.

Public metadata is browser-readable but writable only by trusted Clerk Dashboard/backend administration. There is no public role-assignment API or email-based promotion. Frontend guards are usability controls; backend authorization is authoritative.

| Role | Permissions |
| --- | --- |
| Customer | Own orders/reservations and permitted profile preferences only. |
| Cashier | FOH queue/details, accept/reject/cancel, configured pickup and delivery handoff. Cannot change payment or preparation statuses. |
| Kitchen | Minimal accepted-order queue; start preparation and mark ready only. No customer contact/address, prices or handoff/completion actions. |
| Admin | All staff actions under the same workflow gates; menu/reservation management and operations settings. Cannot mark payment paid. |

## Staff interfaces

- `/cashier`: refreshed/paginated FOH queue, explicit filter application, order number/date/fulfillment/payment/status filters, manual refresh, full order/contact/address/pickup details, customizations, totals and guarded actions.
- `/cashier/orders/:id`: detail and audit history.
- `/kitchen`: accepted, paid orders in queued/preparing/ready columns, preparation notes/options, accepted timestamp and elapsed time. Only preparation actions appear.
- `/admin/orders` and detail: shared operational oversight with audit history.
- `/admin/operations`: administrator-only workflow switches, real handoff/process notes, polling/staleness settings and optional urgency thresholds.

Polling defaults are technical refresh settings, not delivery/preparation promises. The hook permits one request at a time, pauses scheduled polling in hidden/offline tabs, cleans up timers and aborts requests, backs off failures and supports manual refresh. Last good records remain visible on transient failures with stale/error notices and disabled actions. Authorization failures clear records. KDS has an optional controlled visual arrival notice, muted by default; no audio is played. Urgency thresholds start unset and must be configured by an administrator; they are visual cues, not service guarantees.

Consequential actions require confirmation. Rejection/cancellation require reasons. The API rejects stale updates and invalid transitions, even if a browser submits a handcrafted request.

## Restaurant and operational configuration

Pickup/delivery/location/schedule are now managed through the database-backed `/admin/fulfillment` editor; see the current configurable fulfillment section below. `src/config/restaurant.ts` retains reservation and unconfigured tax policies. Supplied location/hours and proposed time ranges are distinct from confirmed production settings. No delivery fees, minimums or service areas are invented.

Configure verified pickup address, hours, collection instructions and preparation estimate. Configure delivery city/neighborhood/postal restrictions, fee, minimum and time range; an empty area list never supports an address. Null is unconfigured; zero must represent an explicitly verified policy. Configure tax basis points and whether delivery fees are taxed. Configure reservation timezone, party limits and opening windows. Restaurant-local opening and near-closing checks are implemented for ordering. Capacity scheduling, street-level geocoding and inventory allocation are not implemented.

`src/config/operations.ts` supplies safe disabled defaults; persisted singleton settings are managed through the admin operations page/API with revision conflict checks. Pickup handoff requires complete enabled pickup configuration plus a real handoff procedure. Delivery dispatch/completion require complete enabled delivery configuration plus real driver/provider/process notes; completion also requires dispatch enabled. Cashier/kitchen switches must be enabled deliberately. Settings do not connect a driver or notification provider.

Verified MongoDB menu records must be created by an administrator. Server prices/options are authoritative; initial menu records are imported only by the explicit seed command described above. Do not enable required customization groups for customer ordering until a customer variant-selection interface exists. Saudi mobile numbers are independently validated and normalized server-side; no SMS or ownership verification is connected.

## Order lifecycle, payment and audit

New orders remain `unpaid` with order status `pending_payment`. Supported payment states are exactly `unpaid`, `paid`, `failed`, `refunded`; `pending_payment` is an order status, not a fabricated payment state. Stripe-hosted Checkout and signed payment webhooks are implemented; live setup and end-to-end verification remain outstanding. Cash collection is absent. There is no staff mark-paid endpoint. Consequently newly created unpaid orders cannot currently be accepted into the kitchen workflow.

| Action | Allowed transition and gates |
| --- | --- |
| Accept | pending_payment or pending_confirmation -> confirmed; cashier/admin, paid, enabled cashier and kitchen, complete enabled fulfillment configuration. |
| Reject | Pending -> rejected; cashier/admin, required reason. |
| Cancel | Active nonterminal -> cancelled; cashier/admin, required reason, no automatic refund. |
| Start preparation | confirmed -> preparing; kitchen/admin, paid, kitchen enabled. |
| Mark ready | preparing -> ready_for_pickup OR ready_for_delivery according to fulfillment; kitchen/admin, paid, kitchen enabled. |
| Complete pickup | ready_for_pickup -> completed; cashier/admin, paid, configured enabled pickup handoff. |
| Dispatch delivery | ready_for_delivery -> out_for_delivery; cashier/admin, paid, configured enabled delivery dispatch. |
| Complete delivery | out_for_delivery -> completed; cashier/admin, paid, configured enabled delivery completion. |

Saving a pending document is not acceptance, payment, dispatch or collection. Customer views state this distinction. Only accepted paid orders appear in the kitchen queue; out-for-delivery/completed orders leave it. Kitchen staff cannot complete pickup/delivery.

Every new transition appends previous/new status, timestamp, verified Clerk actor ID/role, action identifier and optional reason. New orders also record their creation audit. Existing enum values and legacy history fields are retained; no bulk rewrite/migration or invented historical actor/acceptance time is performed. Missing legacy acceptance time is labeled unknown. Legacy pickup records without snapshots display clearly labeled current configuration. Existing out_for_delivery records retain their status and require the configured completion gate.

The legacy admin status endpoint remains, but its body now requires expectedStatus, expectedUpdatedAt and UUID actionId, plus a reason for reject/cancel. It goes through the same transition rules. Clients must update to this contract. Staff action retries reuse the same actionId; changed actions/reasons require a new identifier. Atomic status/payment/updatedAt comparisons prevent concurrent stale writes. Creation retries retain existing Idempotency-Key behavior and server-calculated prices.

## API summary

API prefix `/api/v1`. Lists use page/limit, bounded to 100. Errors use `{error:{code,message,fields?}}`; queue responses include pagination, server time and applicable operational settings. Strict schemas reject unknown input and Mongo query objects.

| Method/path (relative to prefix unless stated) | Access/behavior |
| --- | --- |
| GET /settings, GET /menu, GET /menu/:id | Public safe settings and available menu. |
| GET /users/me, PATCH /users/me/preferences | Authenticated; verified role/preferences, no role editing. |
| POST /orders, GET /orders, GET /orders/:id | Authenticated creation and owner-only history/detail; creation UUID Idempotency-Key required. |
| POST /reservations, GET /reservations, GET /reservations/:id | Authenticated request creation and owner-only history/detail. |
| GET /staff/orders, GET /staff/orders/:id | Cashier/admin queue and detail. |
| POST /staff/orders/:id/accept, /reject, /cancel | Cashier/admin guarded actions. |
| POST /staff/orders/:id/complete-pickup, /dispatch-delivery, /complete-delivery | Cashier/admin configured handoff actions. |
| GET /kitchen/orders | Kitchen/admin minimized accepted-order queue. |
| POST /kitchen/orders/:id/start, /ready | Kitchen/admin preparation actions. |
| GET /admin/overview | Admin overview. |
| GET, POST /admin/menu; PUT, DELETE /admin/menu/:id; PATCH /admin/menu/:id/availability | Admin menu management. |
| GET /admin/orders, GET /admin/orders/:id; PATCH /admin/orders/:id/status | Admin operational oversight and guarded transitions. |
| GET /admin/reservations; PATCH /admin/reservations/:id/status | Admin reservation management. |
| GET, PUT /admin/operations-settings | Admin singleton settings; PUT requires current revision. |
| GET, PUT /admin/fulfillment-settings | Admin location, hours and confirmed pickup/delivery configuration; revision required on PUT. |
| POST /staff/orders/:id/ready-estimate | Cashier/admin approximate ready-time adjustment; expectedUpdatedAt and actionId required. |
| POST /api/webhooks/clerk (outside prefix) | Signed Clerk webhook; no browser session required. |
| GET /health (outside prefix) | Database readiness. |

FOH/admin filters: partial orderNumber, date (Saudi calendar day), fulfillment, paymentStatus, status. Kitchen filters allow accepted workflow statuses, fulfillment and orderNumber only. Staff mutation bodies require expectedStatus, expectedUpdatedAt, actionId and optional reason. Delivery/pickup items use the existing server order types and snapshots. No endpoint accepts browser prices, arbitrary payment state or user-supplied authorization roles.

## Webhook reliability and deployment

Exact implemented route: **POST /api/webhooks/clerk**, mounted before JSON parsing and session middleware. After deployment, construct the Clerk endpoint with the actual generated Render backend origin:

YOUR_RENDER_BACKEND_ORIGIN/api/webhooks/clerk

Configure that endpoint in the existing Clerk application's Webhooks page, subscribe to user.deleted, and store its endpoint signing secret server-side. Svix verifies signature/timestamp against the raw Buffer before effects. Persistent receipts use the signed provider event ID, payload hash and a renewable-by-retry processing lease. Completed duplicates acknowledge; conflicting payload IDs reject; concurrent in-progress retries request a retry; expired leases can be reclaimed. The profile deletion effect is idempotent. Receipt completion occurs only after successful handling. No full webhook payload is stored. Orders/reservations retain Clerk user IDs; retention policy remains a restaurant decision. Startup initializes receipt and order indexes.

This is implementation inspection, not a deployed delivery verification. Inspect actual Clerk delivery results after deployment before claiming connectivity.

Render: root `server`, build `npm ci --include=dev && npm run build`, start `npm start`, health `/health`. Set the server variable names above securely in Render, production runtime mode and exact permitted browser origins. Configure Atlas access and least-privilege credentials. One reverse proxy is trusted; review this if topology changes.

Vercel: root `client`, build `npm run build`, output `dist`. Set only the two public frontend variables above and rebuild. Existing `vercel.json` provides SPA rewrites. Add the actual production Vercel origin to both Clerk and server CORS; explicitly allow individual preview origins when needed. Do not allow arbitrary authenticated wildcard origins.

Helmet, restrictive CORS, bounded JSON/raw bodies, schema validation, centralized sanitized errors and private response no-store remain. API rate limit: 120/minute/IP; creation: 15/15 minutes/IP; staff mutations: 90/minute/IP. Limits are process-local; use a shared store and review proxy/rate settings before horizontal scaling or many terminals on a shared network. Queue indexes cover status/date, fulfillment/status and payment/status/acceptance; action IDs are indexed. Exact production query performance has not been measured.

## Remaining production blockers

- Explicit frontend/server Clerk configuration, actual trusted role assignments and live authorization verification.
- Atlas/deployment connectivity and actual signed webhook delivery/retry verification.
- Verified restaurant/menu/tax/reservation values and deliberately enabled creation/workflow switches.
- Real staff handoff and delivery-driver/provider process; no home delivery is connected by these screens.
- Server-created Stripe payment sessions/intents with server-only secrets; signed payment webhook verification, event-ID deduplication and atomic verified order amount/currency/payment reconciliation. Only verified server payment events should mark paid and move to pending_confirmation for staff acceptance. Browser success must never do this. No Stripe integration is implemented or live here.
- Production scheduling/capacity, notifications, refunds, retention and operational review as required.

No real order, payment, kitchen handoff, collection or delivery was executed or verified by this change. No deployment was performed.

## Local startup troubleshooting

`MONGODB_DNS_SERVERS` is an optional, comma-separated list of DNS server IP addresses for this Node process's DNS queries, including Atlas SRV/TXT discovery. Leave it unset when the platform resolver works. It does not change Windows DNS, database credentials, the MongoDB URI or TLS verification. A local DNS override was required on this development machine after its default resolver refused SRV queries. Do not blindly copy the local override to Render. See the official Node DNS documentation: https://nodejs.org/api/dns.html#dnssetserversservers.

Local public Clerk/API configuration belongs in ignored `client/.env.local`; Express requires the explicit `CLERK_PUBLISHABLE_KEY`. Restart both development servers after editing environment files. Startup failures now identify the stage and a fixed troubleshooting category without printing raw driver messages, credentials or database hosts. Changing DNS does not bypass Atlas network-access or database authentication requirements.

## Configurable restaurant-managed fulfillment (current)

Open `/admin/fulfillment` as a verified Clerk administrator. The versioned API is `GET` / `PUT /api/v1/admin/fulfillment-settings`, mounted behind the existing backend admin guard. Writes are strictly validated, rate limited and require the last saved revision; conflicting changes return 409. Settings persist in `thetable.fulfillmentsettings` after an administrator saves. Until then, typed defaults in `src/modules/fulfillment/fulfillment.validation.ts` are used. Reads reject invalid stored configuration instead of guessing. There is no public settings-write endpoint.

The supplied location is Jeddah, North Obhur (أبحر الشمالية), displayed as **North Obhur, Jeddah**. The supplied Maps URL is kept separately: https://maps.app.goo.gl/dv9BcEmq1RgL83o39. The short link has not been used to verify an exact street address or place name. The exact-address-confirmed flag starts false.

The supplied daily time span is 08:00–00:00 (8 AM until midnight), using `Asia/Riyadh`. Operating days start as an all-days proposal and remain **unconfirmed** until an administrator selects/confirms the actual days. Both creation and staff acceptance check restaurant-local time. No order is accepted outside the configured window, or when the maximum fulfillment estimate plus the configurable acceptance buffer exceeds time remaining before closing. Closing is exclusive; midnight belongs to the following day. Overnight schedules check the prior operating day correctly. Admins must choose a realistic acceptance buffer; its initial value is zero, not a promise that acceptance is instant. Existing in-progress orders can still be prepared/completed after the cutoff; new acceptance is blocked.

Pickup selection is enabled from the supplied display location/hours and instructions. The initial **proposed** estimate is 25–35 minutes after restaurant acceptance. It must be confirmed by the restaurant before order creation. Instructions say to provide the order number at the counter and check the account status. They do not promise automatic notifications, because no notification provider is connected. Selecting Pickup to review these details is distinct from enabling ordering.

Delivery remains disabled. Configure an explicit city/neighborhood and/or five-digit postal-code allowlist. A postal-only entry must contain specific postal codes; a blank city or an empty city-wide wildcard is rejected. If both neighborhood and postal codes are provided, both must match. Empty coverage never makes an address serviceable. Server and frontend normalize case/spacing consistently; there is no geocoder, GPS pin requirement, driver assignment or street-level route validation.

Delivery fee and minimum food subtotal start null. Enter amounts in SAR in the admin page; the API/database use integer halalas. A verified zero is permitted. Coverage, pricing, estimates and the actual restaurant-managed dispatch/completion procedure each require explicit confirmation. The **proposed** delivery estimate is 45–60 minutes after acceptance, not an arrival guarantee. No proposed fee, minimum or service area has been invented. Enabling delivery settings without the required confirmations is rejected. Public delivery availability also requires implemented payment integration, so setting switches alone cannot make delivery operational.

`GET /api/v1/settings` now reads database-backed settings and exposes safe location/hours, approximate/proposed ranges, payment readiness booleans, server time, and per-method ordering reasons. Checkout refreshes availability every minute while visible/online and offers manual refresh. The backend checks the current configuration again for every creation/acceptance; the browser is never authoritative. Below-minimum checks use recalculated food subtotal before delivery fees, and existing strict schemas reject browser totals. Existing Saudi phone validation/normalization, owner-scoped customer history and audited staff transitions remain in force.

### Staff ready-time estimates

Acceptance snapshots an approximate kitchen-ready window from the pickup/preparation range. Cashier/admin order cards expose a confirmed estimate-adjustment form for accepted, paid orders that are confirmed/preparing. `POST /api/v1/staff/orders/:id/ready-estimate` requires min/max minutes from now, reason, expectedUpdatedAt and UUID actionId. It checks current status, payment, permissions, closing time and a delivery transport allowance, uses an atomic stale-write check, and appends a timestamped Clerk ID/role/action/reason audit entry. Retries reuse the action ID. It does not change payment or create a delivery proof. Kitchen/customer views can read the approximate ready window; kitchen users cannot change handoff/completion states. Existing documents need no destructive migration; absent estimate fields remain absent until an actual acceptance/update.

### Stripe environment audit and remaining implementation

The names found locally match the intended separation:

| Variable name | Location | Inspection result |
| --- | --- | --- |
| STRIPE_SECRET_KEY | Server/Render only | Present locally; value not printed, copied or changed. |
| STRIPE_WEBHOOK_SECRET | Server/Render only | Missing locally. |
| VITE_STRIPE_PUBLISHABLE_KEY | Vite frontend/Vercel only | Present locally; only a public-key format/presence indicator is used. |

Server configuration now recognizes the two server names explicitly. The frontend payment configuration reads only the Vite publishable-key variable, never a server secret. Real `.env` files remain excluded by root/server/client ignore rules. No actual environment values were overwritten. Presence or a key prefix is not proof of validity, matching Stripe mode/account, connectivity, settlement support or a live integration.

**Stripe-hosted Checkout and a raw signed webhook are now implemented. The exact payment endpoint is POST /api/webhooks/stripe, with public endpoint YOUR_RENDER_BACKEND_ORIGIN/api/webhooks/stripe after Render generates the backend URL. It has not been deployed or verified here. Do not register the Clerk webhook as a Stripe endpoint. The exact existing signed identity endpoint remains `YOUR_RENDER_BACKEND_ORIGIN/api/webhooks/clerk` and is unrelated to payments.

Before enabling payments, implement server-created sessions/intents from immutable server-calculated order amount/currency; implement a dedicated raw-body Stripe endpoint mounted before JSON parsing; verify Stripe-Signature with its endpoint signing secret; persist provider event IDs and handle concurrent/retried events idempotently; reconcile amount, currency, order ownership/reference and supported payment events before atomically setting paid/pending_confirmation. Browser redirects must never mark paid. Implement failure/refund/expiry reconciliation as required. Then document the exact implemented payment route and verify actual signed deliveries. No payment request, payment event or money collection was executed here. Official references: https://docs.stripe.com/keys and https://docs.stripe.com/events/manage-webhook-endpoints.

Server order creation and public readiness require Stripe server and webhook configuration, the creation switch, confirmed fulfillment settings, and valid opening hours. Locally the webhook signing secret is still missing, so ordering remains unavailable. The separate environment creation switch is still required after integration exists. Existing pending orders remain unpaid; there is no cashier mark-paid workaround.

### Deployment and final setup

Render: use root `server`, build `npm ci --include=dev && npm run build`, start `npm start`; configure the existing server variables plus the two Stripe server variable names securely. Vercel: root `client`, build `npm run build`, output `dist`; configure `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`, and `VITE_STRIPE_PUBLISHABLE_KEY`, then rebuild. Never place server secrets in Vite. Keep exact deployed browser origins in server `CLIENT_ORIGINS` and Clerk; explicitly allow required preview origins rather than wildcards. Existing SPA rewrites cover the new admin route.

Local commands from the repository root:

```sh
npm run --prefix server dev
npm run --prefix client dev
```

Before real delivery: confirm the actual operating days, address/place details and pickup procedure; confirm preparation/delivery ranges and an acceptance buffer; configure confirmed delivery coverage, fee and minimum; confirm staff/driver dispatch and completion procedures; enable cashier/kitchen and handoff switches appropriately; implement and verify Stripe; deliberately enable creation; review tax policy and operating capacity. Settings and UI do not connect a courier, notification service or payment processor. No real order was paid, accepted, delivered or collected as part of this change.

## Reservation and Stripe checkout alignment

Reservation requests now read the same MongoDB schedule as pickup/delivery rather than the obsolete hardcoded reservation windows. The account holder confirmed **08:00 to midnight, every day**; those operating days/hours have been saved with confirmation. Requests were enabled with an initial adjustable limit of **8 guests per request**. This is a request limit, not verified seating capacity; staff must still accept/decline each request. The admin fulfillment form now includes reservation enablement and the party limit. The public API exposes the actual limit and individual setup/disabled reasons, and the reservation page shows those instead of the old blanket opening-hours error. No reservation document was fabricated or submitted.

The local nonsecret `RESERVATION_CREATION_ENABLED` and `ORDER_CREATION_ENABLED` switches were enabled at the account holder's request. Secret values were preserved. Reservations have independent readiness; they never require Stripe. All food orders require configured Stripe, confirmed fulfillment/estimate settings, valid hours and the usual server pricing/address checks. No unpaid pickup bypass was added.

### Implemented payment flow

- `POST /api/v1/orders/:id/payment-session`: authenticated, owner-scoped and rate-limited. The body must be empty. Only pending/unpaid orders can create/reuse a Stripe-hosted Checkout session. Totals come from the server-created order snapshot, including customization-inclusive line prices, delivery fee and tax. The sum must match the saved SAR total. Current hours/fulfillment rules are checked again. New session creation rejects orders older than 30 minutes. An existing open session can be resumed subject to current availability.
- Stripe receives server-defined return URLs based only on the exact allowlisted request Origin. Hosted Checkout handles card details; no card information or server Stripe secrets enter this frontend. The installed SDK supports card-only allowed payment methods. The session uses a stable per-order Stripe idempotency key and a stable expiry one hour after the original order was created; retries do not generate a second payment session.
- The session reference is atomically attached to the order before its URL is returned. Closed sessions are not silently replaced with another charge attempt. A failed attempt can be retried from the saved order page; an expired order/session requires a fresh order at current prices.
- `POST /api/webhooks/stripe` is mounted under the existing raw-body webhook router, before JSON parsing and Clerk session middleware. It verifies Stripe-Signature using `STRIPE_WEBHOOK_SECRET`. The supported events are `checkout.session.completed` and `checkout.session.expired`. Other signed events acknowledge without changing payment.
- A completed session marks paid only when Stripe reports paid and application metadata, saved session reference, order ID, owner, mode, amount and currency all match. A pending order then moves to pending_confirmation, still awaiting restaurant acceptance. The browser return URL never marks paid. Payment to a previously cancelled/rejected order does not reopen it; staff must review it and arrange any required refund.
- Durable `stripe:` provider event receipts use unique event IDs, payload hashes, leases and completed-state deduplication. Atomic order updates prevent duplicate payment processing; interrupted events can retry. Expiration records failed only when payment was not already paid/refunded. Payment audit entries identify the actor as `system` / `stripe:webhook`, never as a fabricated Clerk user. Old documents/statuses remain compatible.
- The Checkout CTA is now **Continue to secure payment** when available and **Payment setup required** when configuration is missing. The misleading Save pending order label is removed. Customer order details support continuing payment and manual refresh while waiting for the verified webhook.

### Remaining required Stripe setup

After deployment, construct the Stripe endpoint with the actual generated Render backend origin:

YOUR_RENDER_BACKEND_ORIGIN/api/webhooks/stripe

After deploying the updated server, register this endpoint with the correct Stripe account/mode and subscribe to the two supported Checkout events. Set that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET` in Render. For local development, the Stripe CLI may forward to `http://localhost:4000/api/webhooks/stripe`; its signing secret is distinct from the deployed endpoint's secret. Store the local signing secret in server/.env yourself, never in chat or a frontend variable. Restart the API afterward. Do not copy the Clerk signing secret or use an API key as the Stripe webhook secret.

`STRIPE_SECRET_KEY` stays server-only; `VITE_STRIPE_PUBLISHABLE_KEY` stays public frontend-only. A Stripe-hosted redirect does not need Stripe.js or a public key to create the session; the frontend retains only its existing public-key configuration indicator. Use matching Stripe account/mode settings. Key presence is not a completed live connectivity check. The current local webhook secret remains missing, so payment-required orders are still blocked. Pickup estimate confirmation and delivery coverage/pricing/process confirmation remain separate admin requirements.

Refund processing, disputes, notification providers and driver integrations are not implemented. No Stripe API payment/session request, webhook delivery, charge, refund or real fulfillment was executed during this change. No automated tests were run, per instruction. Build/typecheck/lint are separate from live payment verification.

## Owner-approved North Obhur delivery setup

The owner approved North Obhur, Jeddah as the initial delivery area, the existing SAR 20 delivery fee, SAR 100 minimum food subtotal, approximate pickup 25–35 minutes and delivery 45–60 minutes after acceptance, and restaurant staff arranging dispatch/delivery completion. These settings were saved through the validated settings services under the verified project administrator. Coverage remains limited to the explicit North Obhur entry, with no claim of all-Jeddah delivery. Cashier/kitchen and delivery dispatch/completion workflows are enabled; no automated driver, GPS or notification integration was added. Existing unrelated settings were preserved.

At the end of this work the public APIs reported configured Stripe credentials and the approved delivery settings. Actual order acceptance still follows current opening hours and the maximum-range closing cutoff: midnight closing means new deliveries stop approximately 60 minutes before midnight, and pickups approximately 35 minutes before midnight. Configuration does not bypass this rule.

Inspection found zero order documents and zero Stripe payment-event receipts in the connected thetable database. No order was fabricated or marked paid to populate a queue. Saved unpaid orders belong in the cashier queue; only verified paid orders accepted by authorized staff enter the kitchen. A customer should have a TBL order number after successful order creation. Role and ownership enforcement are unchanged. No checkout session, charge or automated test suite was run during these changes.

### Homepage image mapping

`npm run setup:hero -- --confirm` copies the four existing frontend Hero01–Hero04 assets to `client/public/hero-images/` and saves slide numbers and image paths on the existing Seasonal Cake, House Tomato Pasta, The Table Burger, and Golden Fries menu records, preserving their previous homepage order. It requires the connected database to be `thetable`, checks all target records before writing, and preserves menu card images, prices, orders, and payments. Run from the repository with both `client/` and `server/` present, before frontend deployment. The public menu DTO returns optional `heroSlide` and `heroImageUrl`; no extra customer or hero API endpoint is needed.

### Website content API

The `WebsiteContent` model stores published text/image overrides with a revision, update timestamp, and verified administrator ID. Its collection/index initialization is part of normal startup. `GET /api/v1/content` is public and returns only published overrides and revision. `GET /api/v1/admin/content` returns the editable field catalog, saved values and revision; `PUT /api/v1/admin/content` accepts `{ revision, changes: { "known-field-key": "new value or null to reset" } }`. Both admin routes inherit the existing Clerk authentication and server-side admin authorization. Unknown keys, invalid image URLs, oversized content and stale revisions are rejected; writes are rate-limited. Text is rendered by React as plain text, never injected HTML. No operational settings, customer records, or payment state are editable through this API.

The authoritative catalog is `src/data/site-content.json`; keys correspond to `SiteText` / `useSiteContent` bindings in the frontend. For new editable sections, add matching catalog entries and frontend bindings together. Defaults remain in the existing components; only overrides are saved. No new secrets or environment variables are required. Deploy the backend and frontend together. Editorial public images copied from existing assets live in `client/public/content-images/` and are excluded from the Vercel SPA rewrite.

### Isolated backend integration suite

Run `npm run test:flow` from `server/`. It uses the existing MongoDB connection privately, but overrides the database name in the test process with a unique `tbl_flow_` name, asserts isolation before writing, and drops only that exact temporary database on completion. The database account must permit creation/removal of this isolated database. It never writes test orders/settings to `thetable`. No `.env` file is changed, logged or copied.

The suite runs the actual order, fulfillment, reservation, payment-webhook, queue, staff-action and content-editor code against MongoDB. Stripe network methods use in-process fixtures; signed webhook payloads use a synthetic signing secret and the actual Stripe SDK verifier. Role fixtures exercise authorization and action rules; they do not substitute for a real Clerk OAuth integration check. The test script is outside `src/` and is excluded from the production TypeScript build. Successful runs verify their temporary database was removed.

### Team roles and internal-driver endpoints

`/api/v1/admin/team` is behind the existing Clerk/admin middleware: GET lists registered staff plus pending staff invitations; POST assigns an existing verified-primary-email account; PATCH/DELETE `/:id` edit or remove access with an expected Clerk update timestamp. POST `/invitations` explicitly sends a Clerk invitation and DELETE `/invitations/:invitationId` revokes a pending staff invitation. Only cashier/kitchen/driver roles are assignable. Administrator/self/owner-email accounts are protected. Role authority remains in Clerk public metadata; MongoDB stores synchronized staff snapshots and management audit records. Employees with unverified primary email cannot use staff access. No real invitation was sent during implementation/testing.

`GET /api/v1/staff/drivers` is available to cashier/admin staff. Dispatch requires a registered active verified driver with a Saudi work phone, which is rechecked against Clerk at dispatch. `GET /api/v1/driver/orders` is restricted to the authenticated driver’s assignment and supports out-for-delivery/completed views. `POST /api/v1/driver/orders/:id/complete` checks assignment, payment/workflow/current timestamp, and the recipient’s six-digit code. The equivalent cashier completion also requires the code. Code fields are excluded from normal queries and staff/driver DTOs; only the owning customer’s out-for-delivery detail response includes the code. Invalid codes are throttled per order. The driver cannot read other drivers’ tasks or a customer’s unrelated orders.

New delivery dispatches snapshot the actual driver name/phone/ID plus timestamps on the order. Existing out-for-delivery records without an assignment/code require administrator review; the server will not silently fabricate proof for them. Public location coverage/fees/opening hours and Stripe payment requirements are preserved.

### Persisted website defaults

Startup calls `initializeWebsiteContent` after database/index initialization. It inserts the current catalog defaults if no website record exists and backfills only missing fields using revision checks. Existing custom values are preserved. `npm run setup:content` can perform this initialization explicitly and refuses any database other than `thetable`. Public GET responses include effective defaults and published edits, while admin writes remain role-protected. No new environment variables are required for these features.

### Assign kitchen and cashier access by email
In `/admin/team`, enter an email, choose Kitchen, Cashier or Driver, and save email access. An account need not exist yet. Assignments are stored in MongoDB and applied by the authenticated backend only after Clerk verifies the exact primary email. Existing verified accounts receive changes immediately; signed-in frontend profiles refresh on focus and periodically. Edit or disable assignments in the same list. Administrator accounts are protected. Advanced controls remain available for registered staff, drivers and optional invitations. This simple assignment does not send an email or create a password. Deploy both server and client for these controls.

Email role saves now synchronize both the saved assignment and the verified Clerk user snapshot in MongoDB immediately. Configure Clerk user.created, user.updated and user.deleted events on the existing Clerk webhook to synchronize dashboard changes. Saved email assignments remain authoritative on sign-in; disable the assignment in Staff & drivers to revoke that access permanently. To refresh existing MongoDB profiles from trusted Clerk accounts without changing Clerk metadata, run `node dist/scripts/syncStaffProfiles.js` after building. The command reports counts only.

Own-driver delivery progress, exact delivery coordinates and cashier delivery support are documented in ../DELIVERY_OPERATIONS.md. Existing authenticated driver routes now include POST /api/v1/driver/orders/:id/progress. Cashier/admin support routes are GET /api/v1/staff/drivers/issues and POST /api/v1/staff/drivers/orders/:id/resolve-issue. Deploy both backend and frontend together. No additional map credentials or messaging-provider secrets are required for these open-dashboard alerts.

Driver email assignments require a Saudi mobile number, normalized by the API. A verified account receives the driver role and phone in Clerk and its MongoDB profile immediately; an unregistered email remains pending. Sign-in defaults route verified drivers to /driver. Driver access/phone changes and removal are blocked while assigned deliveries remain out for delivery.

### Background driver notifications
See ../WEB_PUSH_SETUP.md for the full flow, private VAPID setup, Render always-running API/background-worker options, driver phone installation and live checks. New settings: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, WEB_PUSH_SUBJECT, optional DRIVER_ACK_TIMEOUT_SECONDS (default 120). The private key stays on the server. Newly generated server/.env.push.local is ignored; server/.env was preserved. Use npm run start:push-worker for a separate persistent Render worker, or an always-running API instance. The push service accepting a message never acknowledges an order.

## Android/SIM SMS notifications

See [SMS_SETUP.md](../SMS_SETUP.md) for phone setup, Render environment variable names and the admin activation/test flow. Sending defaults to disabled, requires customer consent and uses your own Android SIM through SMSGate. No paid-provider fallback is configured. The API includes the durable SMS worker; an always-running standalone worker can use `npm run start:sms-worker` after build. Test with `npm run test:sms`; its gateway is mocked and its MongoDB database is isolated.

## Infobip SMS provider

See [INFOBIP_SETUP.md](../INFOBIP_SETUP.md). Set SMS_PROVIDER=infobip with INFOBIP_BASE_URL, INFOBIP_API_KEY and INFOBIP_SENDER. SMS_ENABLED and the admin sending switch remain required. No Android gateway is needed for this provider. `npm run test:infobip` uses mocked HTTP and sends no real SMS.

## Email notifications

Gmail SMTP with an App Password and optional Resend demo are implemented independently of SMS. See [EMAIL_SETUP.md](../EMAIL_SETUP.md) for settings, demo recipient restrictions, verification and Render SMTP limitations. Admin: /admin/email; customer preferences: /account. Credentials remain backend-only.
