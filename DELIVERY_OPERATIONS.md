# Own-driver delivery operations

## Customer
Choose Delivery at /checkout, enter the complete recipient address and Saudi mobile number. Add latitude/longitude manually or use current location while physically at the destination. Check the map before submitting. Location permission requires HTTPS (or localhost). Denial does not block entering an address manually. A GPS pin does not certify coverage: configured city/neighborhood/postcode checks, fee, minimum, hours and payment checks still apply. No geocoding or geographic service-area polygon validation is connected.

## Cashier
Use /cashier to accept verified paid orders. Once the kitchen marks delivery ready, assign a registered verified driver. The driver needs a Clerk driver role and Saudi phone set in Staff & drivers email assignment controls. Enable delivery alerts in Delivery support. Reported issues appear here across the order filters and require an actual resolution note. Contact the driver/customer to arrange the solution. Resolving an issue does not complete the delivery, refund a payment, or change the address. Use the order details for customer contact.

## Driver
Sign in at /driver. Enable delivery alerts and keep the dashboard visible and online; refresh/status controls show connection problems. Acknowledge each assignment, collect the correct food from the restaurant, then open Directions to recipient. Directions use exact coordinates when supplied, otherwise the written address. At the destination record arrival. Give the food to the recipient, then ask for the code in their customer account to complete handoff. New dispatches require the checklist; legacy dispatches retain their previous code-based completion behavior.

If the customer cannot be reached, the address cannot be found, or the vehicle has a problem, use Report a delivery problem. Completion is blocked until the cashier records a resolution. Driver updates and issue resolutions use authenticated role/ownership checks, stale-record protection, and timestamped MongoDB delivery events. Staff issue notes are withheld from the customer response; customers see a support-needed indication and actual progress timestamps.

## Notification setup and launch

Open-dashboard sound/optional browser alerts still require a visible online page. Background Web Push has now been added separately: drivers enable Background delivery alerts in /driver. It uses a service worker so the tab need not remain open, subject to phone/browser permissions and OS restrictions. iPhone/iPad users first install the Home Screen app. Signing out alone does not unsubscribe a device; disable background alerts before sharing it.

See WEB_PUSH_SETUP.md for VAPID configuration, always-running Render requirements and a real-phone verification checklist. The default driver acknowledgement deadline is 120 seconds. Cashier warnings and call links escalate unacknowledged assignments. A successful push-service response is not a driver acknowledgement, proof of delivery to a device, or a physical delivery guarantee.

Deploy client and server together. No map API key is required. No real deliveries, charges or customer addresses were created by implementation verification. Your restaurant supplies actual available drivers and confirmed operating coverage. SMS, automatic phone calls and live driver tracking are not connected.
