# Infobip SMS setup

The existing SMS queue now supports Infobip as well as the Android gateway. Select Infobip explicitly; Android remains the default for backward compatibility. Your API key is private. Do not put it into SMS_GATEWAY_TOKEN, a VITE_ variable, chat, logs or committed files.

## 1. Get three values from Infobip

- Account API base URL: shown on the homepage/API Keys page, such as `https://xxxxx.api.infobip.com`. Use the HTTPS origin only, without `/sms/3/messages`, query parameters or a trailing application path. This is not your Render URL or the Infobip marketing website.
- API key: an Infobip key authorized to send SMS and read outbound SMS logs. The connection check reads logs and does not send a message.
- Sender: the exact shared test sender your account shows, or an approved sender for Saudi production traffic. Do not assume that a restaurant name is already registered.

Official authentication instructions: https://www.infobip.com/docs/developer-resources/authentication-and-access/api-authentication

## 2. Configure the server

Set these variables in Render backend → Environment. For local development, privately set the same variables in `server/.env`. No existing .env values were read out, copied or replaced by this implementation.

```env
SMS_PROVIDER=infobip
INFOBIP_BASE_URL=https://YOUR_ACCOUNT.api.infobip.com
API_KEY=YOUR_PRIVATE_INFOBIP_API_KEY
INFOBIP_SENDER=YOUR_EXACT_INFOBIP_SENDER
SMS_ENABLED=false
SMS_DAILY_LIMIT=100
```

Replace placeholders with account values. No Android phone, device ID, gateway JWT or SMS_GATEWAY_* credentials are required for Infobip. `API_KEY` is the preferred key name. `INFOBIP_API_KEY` remains supported as a fallback; if both are non-empty, `API_KEY` takes precedence.

## 3. Deploy and check

Deploy both updated backend and frontend. Open `/admin/sms`; it should show Connect Infobip and the Infobip variable names. Check gateway connection verifies API log access, not sender approval or actual mobile reception. Incorrect API permissions, host or key produce a safe error without exposing credentials.

After this succeeds, set `SMS_ENABLED=true` and restart/redeploy the backend. Choose Enable SMS sending in the admin page. Both this environment switch and the restaurant switch must be on before a job can be submitted.

## 4. Send an explicit test

Use your own verified Saudi trial number in Admin → SMS notifications → Review test SMS. Confirm only when ready to use trial credits or pay for a message. Check the handset and both logs. Trial accounts have recipient, sender and credit restrictions; a created API key alone does not remove them.

For customer traffic, resolve Saudi sender registration and billing requirements with Infobip. Do not claim a sender is approved simply because API authentication succeeds.

Official SMS onboarding: https://www.infobip.com/docs/sms/get-started

Saudi sender requirements: https://www.infobip.com/docs/essentials/mena-registration/saudi-arabia-letter-of-authorization-loa-guidelines

## Behavior and delivery tracking

Customer consent, account opt-out, state/payment checks, daily limits and queue leases remain shared. New jobs record which provider created them. Jobs from another provider are never automatically submitted through Infobip after switching.

The adapter uses the v3 SMS API, a per-job custom message ID, and repeated authenticated log queries. Logs can be read repeatedly; one-time report polling is not used. Operator acceptance is not treated as handset delivery. Only `DELIVERED_TO_HANDSET` maps to delivered.

A custom message ID is correlation, not an assumed Infobip idempotency guarantee. If a send response is lost, the worker checks the existing ID in logs and never interprets an empty log result as permission to send again. If reconciliation cannot resolve it before expiry, the job becomes unknown and needs manual review. There is no blind retry button. Message validity is bounded to the remaining notification window, rounded to minutes.

Provider acceptance is not proof of customer receipt. No order or reservation status is changed by an SMS response.

Source specifications verified against Infobip's current SMS docs and official Go SDK models:

- https://www.infobip.com/docs/sms/message-delivery
- https://github.com/infobip/infobip-api-go-client/tree/master/pkg/infobip/models/sms

## Verification

`npm run --prefix server test:infobip` tests the HTTP adapter without network sends: authentication, payload, custom ID, validity, log status mapping and error handling.

`npm run --prefix server test:sms` tests the isolated MongoDB queue, consent, limits and ambiguous-send/provider-switch behavior. `npm run --prefix client test:sms` tests the admin and consent UI with fixtures. No real SMS is sent by these checks.
