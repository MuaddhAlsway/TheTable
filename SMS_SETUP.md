# SMS through your Android phone / SIM

For Infobip instead of Android, follow [INFOBIP_SETUP.md](INFOBIP_SETUP.md). Set `SMS_PROVIDER=infobip` and use INFOBIP_API_KEY, INFOBIP_BASE_URL and INFOBIP_SENDER; the Android credentials below are not used by that provider.

The Table now supports real service SMS through SMS Gateway for Android (SMSGate). No Twilio account or paid fallback is used. SMS sending is disabled by default and no real messages are sent during automated verification.

Customers receive messages from the SIM's mobile number. This does not register an alphanumeric “The Table” sender name or guarantee carrier approval for business messaging.

Software and cloud availability/pricing: https://docs.sms-gate.app/pricing/ . The gateway software currently offers free local/cloud modes. Carrier SMS charges, plan limits, business-use restrictions and future service changes remain outside this website's control. An included SMS allowance must be confirmed with your carrier. This is not a promise of free or guaranteed delivery.

## Phone setup

1. Follow the official installation instructions at https://docs.sms-gate.app/ . Use a restaurant-controlled Android phone and SIM, not a shared personal phone.
2. Grant the app SMS permission. Enable Cloud Server mode, register/start its service, and keep the phone online with mobile signal and sufficient SMS allowance. Disable restrictive battery optimization for the gateway as needed. Do not enable any paid SMS fallback.
3. Cloud mode is needed for the Render backend to reach a phone behind home/mobile NAT. A private Wi-Fi address cannot be reached directly from Render. This integration uses `https://api.sms-gate.app/3rdparty/v1`; recipient numbers and message text pass through that service. End-to-end encrypted payloads are not implemented in this adapter. If your device requires encrypted messages, do not enable sending until an encryption adapter is added.
4. Get the gateway device ID and credentials from its Cloud Server settings. The API supports a JWT token (preferred, scopes `devices:list`, `messages:send`, `messages:read`) or the gateway's username/password. These are gateway credentials, not your Clerk/MongoDB/Google credentials. A JWT must be renewed before expiry.

Cloud setup guide: https://docs.sms-gate.app/getting-started/public-cloud-server/ . API/authentication: https://docs.sms-gate.app/integration/api/ .

## Backend configuration

Add these to Render backend Environment settings, or edit local `server/.env` privately. No existing environment values have been changed or copied by this implementation. Never use VITE_ prefixes for these secrets.

```env
SMS_ENABLED=true
SMS_GATEWAY_DEVICE_ID=<your Android device ID>
SMS_GATEWAY_TOKEN=<your gateway JWT>
SMS_GATEWAY_SIM_NUMBER=1
SMS_DAILY_LIMIT=100
```

Alternatively omit SMS_GATEWAY_TOKEN and set both SMS_GATEWAY_USERNAME and SMS_GATEWAY_PASSWORD from the gateway app. A token takes precedence when present. Use the same restaurant phone account/device in every backend worker.

Restart/redeploy the backend. Open `/admin/sms`, choose Check gateway connection, then Enable SMS sending. The connection check sends no SMS and does not prove reception. Enter a Saudi mobile number you control, review the confirmation, and queue a real test. This explicit action uses the SIM allowance. Check the receiving handset and delivery log.

The restaurant switch and SMS_ENABLED must both be enabled. Pausing the restaurant switch stops new gateway submissions, but messages already accepted by the gateway may still be sent. Turning SMS_ENABLED=false is a backend emergency stop. Disabling/re-enabling does not backfill historical status changes.

## Customer flow

- Customers explicitly opt in on delivery/pickup checkout, table checkout, or reservation requests. The checkbox targets the customer's own phone above, not a different delivery recipient. Existing records default to no consent and are never automatically opted in.
- Paid order acceptance, pickup/table readiness, delivery dispatch, and paid order cancellation/rejection can generate a short service SMS. Reservation confirmation/cancellation can generate a service SMS.
- Messages contain a reference and status; no recipient address, payment information or delivery handoff code is included. These are not login OTPs and do not verify phone ownership.
- Account → SMS updates → Pause all SMS updates blocks future gateway submissions for that account. Re-enabling allows only notifications for records where consent was given. No marketing messages are implemented. Incoming STOP replies are not automatically processed: monitor replies on the gateway phone and arrange customer opt-out through the account. Bidirectional inbox automation is not implemented.
- Driver assignments continue using the existing foreground/Web Push flow. Driver SMS escalation is not implemented by this customer notification integration.

## Reliability and status

The persistent MongoDB queue derives events from saved records, recovering after an API crash without a dual-write gap. Only eligible events in the 15 minutes after a status change and after the latest activation are queued. It deduplicates by source/event; price/ETA-only changes do not create another acceptance SMS. Stale statuses, missing consent, global opt-out and expired unsent messages are skipped.

Workers claim jobs atomically with a lease. Each job uses one stable gateway message ID. If the response is lost, the worker checks that ID before retrying; it does not create a fresh ID or blindly resend an indeterminate message. Transient failures have bounded backoff. Unknown/Processed states need operator review. A daily cap counts send attempts, not billing segments, and a shared database throttle allows at most one new gateway submission per 20 seconds across workers.

Delivery log states distinguish pending, gateway queued, sent, delivered, failed, skipped and unknown. Only authenticated gateway status responses can report delivery; no public callback can mark it delivered. A delivery report is not proof that a person read the SMS. Status tracking reference: https://docs.sms-gate.app/features/status-tracking/ .

The API process includes the worker. Keep it always running. Sleeping hosting delays notifications and may cause old jobs to expire. Alternatively create a Render Background Worker with root `server`, build `npm ci --include=dev && npm run build`, start `npm run start:sms-worker`, and the same backend environment/database. It can coexist with the API worker because leases, the event key and rate control are shared. Hosting can have costs independent of SMS.

## Verification

- `npm run --prefix server test:sms`: isolated MongoDB, fake gateway calls, adapter request format, disabled/consent/history exclusions, queue/claim concurrency, delivery tracking, uncertain response recovery, opt-out, expiry, daily cap, role gates, masked logs and test request deduplication. The test database is removed; no real SMS is sent.
- `npm run --prefix client test:sms`: opt-in payload, account pause, admin configuration/check/test review and responsive UI fixtures. Provider credentials never enter the frontend.
- Existing builds/lint/workflow checks validate integration. Actual SIM delivery can only be verified after phone setup and an explicitly requested real test.
