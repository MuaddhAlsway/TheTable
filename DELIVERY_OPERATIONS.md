# Own-driver delivery operations

## Customer
Choose Delivery at /checkout, enter the complete recipient address and Saudi mobile number. Add latitude/longitude manually or use current location while physically at the destination. Check the map before submitting. Location permission requires HTTPS (or localhost). Denial does not block entering an address manually. A GPS pin does not certify coverage: configured city/neighborhood/postcode checks, fee, minimum, hours and payment checks still apply. No geocoding or geographic service-area polygon validation is connected.

## Cashier
Use /cashier to accept verified paid orders. Once the kitchen marks delivery ready, assign a registered verified driver. The driver needs a Clerk driver role and Saudi phone set in Staff & drivers email assignment controls. Enable delivery alerts in Delivery support. Reported issues appear here across the order filters and require an actual resolution note. Contact the driver/customer to arrange the solution. Resolving an issue does not complete the delivery, refund a payment, or change the address. Use the order details for customer contact.

## Driver
Sign in at /driver. Enable delivery alerts and keep the dashboard visible and online; refresh/status controls show connection problems. Acknowledge each assignment, collect the correct food from the restaurant, then open Directions to recipient. Directions use exact coordinates when supplied, otherwise the written address. At the destination record arrival. Give the food to the recipient, then ask for the code in their customer account to complete handoff. New dispatches require the checklist; legacy dispatches retain their previous code-based completion behavior.

If the customer cannot be reached, the address cannot be found, or the vehicle has a problem, use Report a delivery problem. Completion is blocked until the cashier records a resolution. Driver updates and issue resolutions use authenticated role/ownership checks, stale-record protection, and timestamped MongoDB delivery events. Staff issue notes are withheld from the customer response; customers see a support-needed indication and actual progress timestamps.

## Notification limits and launch
Alerts are opt-in sound and optional browser notifications driven by polling while the dashboard is open/visible and online. Initial current assignments alert when enabled; subsequent new assignments/issues alert once per page session. Closing/suspending the page stops polling. These are not background push, SMS, automatic phone calls or live driver tracking. Arrange direct cashier-to-driver contact for unattended devices. Sound/notification permission and device restrictions can prevent an alert.

Deploy client and server together. No extra map API key is required. No real deliveries, charges or customer addresses were created by implementation verification. A restaurant must supply actual available drivers and confirm its operating coverage/settings. Automated checks use isolated data and payment/auth fixtures.
