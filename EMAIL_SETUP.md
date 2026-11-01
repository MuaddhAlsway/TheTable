# Email notifications: Gmail SMTP and optional Resend

SMS is preserved. Email is independently controlled at /admin/email. Customers opt in at /account. This is transactional email, not marketing.

## Gmail App Password (selected provider)

Enable Google 2-Step Verification, then create an App Password at https://myaccount.google.com/apppasswords. Use a dedicated sending mailbox if possible. Do not use your normal Google password. App Password availability depends on account/organization policy.

Add the following settings privately to server/.env (local) and backend hosting Environment settings. Existing .env values are not modified by this implementation. Never put secrets in VITE_ variables or commit them.

```env
EMAIL_PROVIDER=gmail
EMAIL_MODE=demo
EMAIL_ENABLED=true
GMAIL_USER=your_sending_account@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password
EMAIL_TEST_RECIPIENT=your_verified_signed_in_email@gmail.com
EMAIL_FRONTEND_URL=http://localhost:5173
EMAIL_DAILY_LIMIT=50
```

For deployment use the exact HTTPS frontend origin (no trailing slash) for EMAIL_FRONTEND_URL. Gmail SMTP uses smtp.gmail.com:465 over TLS. No domain registration or changes are made.

**Render Free blocks outbound SMTP on 465 and 587.** Gmail SMTP will not work from a free Render web service. Use hosting permitting SMTP or Resend HTTPS; an App Password cannot bypass the block. No paid hosting or accounts are purchased by this code.

Restart the backend, sign in as admin, open /admin/email, Check Gmail connection (no email sent), enable the restaurant switch, and review an explicit test. The verified signed-in address must match EMAIL_TEST_RECIPIENT in demo mode. Queued/accepted is not inbox delivery; check Gmail inbox and spam.

Demo mode never reroutes another customer's message to your test mailbox. It skips other recipients. EMAIL_MODE=production permits verified opted-in customer addresses; only enable after a real reception test and appropriate hosting/account limits review. Gmail quotas and account restrictions still apply; this is not an unlimited sending service.

## Optional Resend demo

Set EMAIL_PROVIDER=resend, EMAIL_MODE=demo, RESEND_API_KEY privately, RESEND_FROM=onboarding@resend.dev, and EMAIL_TEST_RECIPIENT to your Resend account email. Keep EMAIL_FRONTEND_URL, EMAIL_ENABLED and limits above. RESEND_TEST_RECIPIENT remains supported as a compatibility fallback. The Resend demo sender can send only to the account email. Production Resend requires a verified domain, which this app does not create or change.

## Behavior and security

MongoDB EmailControl, EmailPreference and EmailJob provide an independent paused-by-default switch, explicit account opt-in, unique event keys, atomic job leases, a shared daily attempt limit and a 15-second global sending interval. The API process runs the worker every 15 seconds; sleeping/offline hosting delays it. Only new recent events after restaurant and customer activation are queued; old orders are not bulk emailed. Only the verified account email from the server profile is used, never customer-supplied checkout email or a browser-supplied user ID.

Paid order payment-pending-confirmation, accepted, ready, dispatched, completed, cancelled/rejected statuses and confirmed/cancelled reservations generate emails when eligible. Stale statuses, revoked preferences and changed account addresses skip unsent jobs. Deleted profiles cannot receive queued messages. Email cannot create an order, mark payment paid, or complete a delivery.

Delivery emails link to /account/orders/:id, protected by existing ownership authentication. They do not embed delivery codes, addresses or driver-only credentials. Customers open their account to view the code/contact driver; driver contact and handoff verification remain unchanged. Share the code after receiving food.

Gmail SMTP has no guaranteed idempotency. Unknown transport outcomes are not automatically resent. A crash after starting SMTP submission marks the recovered job unknown, rather than risking duplicate mail. Resend retries reuse the immutable payload and idempotency key within a six-hour expiry, safely inside its documented 24-hour window. Provider changes do not resend prior jobs.

Accepted means provider acceptance only. This implementation does not claim verified inbox delivery and has no email delivery webhook. Jobs expire from MongoDB after 30 days; stored recipients/payloads are excluded from admin responses. Logs never contain credentials or raw provider errors.

## Verification

server: npm run test:email (isolated test DB, mocked SMTP/HTTP only), npm run typecheck.
client: npm run typecheck, npm run lint, npm run build.

References: https://support.google.com/mail/answer/185833 ; https://nodemailer.com/guides/using-gmail ; https://render.com/docs/free ; https://resend.com/docs/knowledge-base/403-error-resend-dev-domain ; https://resend.com/changelog/idempotency-keys

## Delivery email flow

A paid order dispatched by the cashier queues an assignment email to the verified assigned driver, independently of customer opt-in. Drivers opt in using Email updates on /driver or /account. Alerts are suppressed if assignment changed, driver access was removed, or the driver already acknowledged. Customer opt-in enables out-for-delivery, collected, arrived and completed updates as well as other order/reservation status updates. Collected alerts are skipped if arrival already superseded them. Driver emails link only to /driver; customer emails link to the ownership-protected order. No code/address is embedded in the email. Progress emails expire after 15 minutes. New notifications need an online backend worker and remain subject to the shared daily limit. Status text describes recorded driver actions, not live GPS tracking.
