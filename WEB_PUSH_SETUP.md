# Driver background push

## Implemented flow
A signed-in verified driver enables Background delivery alerts on /driver. The browser asks permission, registers /sw.js, and saves its Web Push subscription under the server-verified Clerk ID. The admin does not supply user IDs. Notification endpoints are restricted to supported browser push vendors; endpoint ownership cannot be reassigned to a different account through the subscription API.

Every 15 seconds the server derives notification jobs from persisted out-for-delivery assignments that have no acknowledgement. This repairs a crash after dispatch without requiring a second atomic order/notification write. Each order/driver/dispatch-time/device combination is unique. Jobs have leases for concurrent-worker/crash recovery, capped exponential retries (five attempts), 30-day retention and expired-subscription removal for provider 404/410 responses. Revoked driver access, acknowledged/reassigned/completed orders and removed devices suppress pending sends. Delivery is at least once: a crash after provider acceptance can cause a repeated notification; the notification tag replaces duplicates where supported. Sending never updates the delivery acknowledgement.

The service worker shows a fixed generic notification without recipient name, address, telephone or handoff code. A tap opens /driver and the existing authentication/ownership checks apply. It does not cache pages or API responses. Signed Clerk user deletion removes saved devices.

Cashier/admin dashboards poll /staff/dispatch-alerts separately from order filters. Assignments still unacknowledged after DRIVER_ACK_TIMEOUT_SECONDS (default 120 seconds, configurable 30–3600) appear with a call link and push-job state. Provider acceptance is explicitly not proof that a person received/read the notification. Acknowledgement clears the warning on the next refresh. Staff should call the driver and confirm availability; this software does not place phone calls.

## Local configuration
Local setup generated server/.env.push.local with new signing credentials. It is covered by the existing server/.env.* ignore rule. The existing server/.env was not changed; process environment and its existing settings take precedence. Keys were not printed. Keep this file private and stable: rotating the key pair requires devices to unsubscribe and re-enable.

If setting up a fresh checkout, build the server, then run from server:

    npm run setup:push -- https://YOUR-FRONTEND-DOMAIN

This creates the private file only if absent; it never overwrites it. Use the real public HTTPS frontend origin as the Web Push subject, or configure a real mailto contact directly in the environment. Do not commit this generated file.

## Render configuration
Privately set these existing generated values in Render Environment (do not put the private key in Vite/Vercel):

- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- WEB_PUSH_SUBJECT
- DRIVER_ACK_TIMEOUT_SECONDS (optional; default 120)

The matched signing pair and subject are required for subscriptions/sends. Missing configuration disables background push without disabling API health. Browser setup UI explains this state. The public key is returned only to authenticated drivers; the private key never leaves the backend.

Deploy the updated server and client. Use an always-running Render API instance, whose built-in worker starts after MongoDB and indexes connect. Alternatively add a continuously running Render Background Worker with root server, build npm ci --include=dev && npm run build, start npm run start:push-worker, and the same database, Clerk, VAPID and other validated server environment settings. It can coexist with the API worker because jobs are uniquely claimed. The worker uses no HTTP health endpoint. A free/sleeping API instance alone is not sufficient for dependable background retry processing. Database and Clerk outages delay processing; failed jobs and missing acknowledgements remain visible to staff.

## Driver phone setup
Open the deployed HTTPS frontend and sign in as the assigned verified driver. On iPhone/iPad (iOS/iPadOS 16.4+), add the website to the Home Screen, launch that icon and press Enable background notifications. On supported Android/desktop browsers, allow notifications directly. The browser/device may block notifications, disable them in battery-saving modes, or delay delivery while offline. Disable background notifications here before sharing a device or switching driver accounts; sign-out alone does not unsubscribe a push device.

## Live verification
1. Driver enables background notifications on an actual phone.
2. Close the dashboard tab/Home Screen app.
3. Cashier dispatches a paid, prepared delivery to that driver.
4. Confirm a generic notification arrives; tap it and confirm only assigned deliveries appear.
5. Leave an assignment unacknowledged beyond the configured deadline and confirm the cashier warning/call link.
6. Acknowledge it; confirm the warning clears and retry jobs no longer send.
7. Disable device notifications and verify no further assignments are pushed to that device.

Automated integration verification stubs provider delivery and Clerk users. It does not prove OS-level delivery to a real phone, and does not send real staff messages.

References: https://github.com/web-push-libs/web-push and https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
