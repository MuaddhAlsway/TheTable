import type { RestaurantSettings } from '../modules/fulfillment/fulfillment.service.js';
import { getRestaurant } from '../modules/fulfillment/fulfillment.service.js';
import { env } from '../config/env.js';
import { paymentReadiness } from '../config/payments.js';
import { openingAvailability } from './openingHours.js';
import { AppError } from './errors.js';
const nonnegative = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0;
const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function pickupReady(config: RestaurantSettings) { const p = config.pickup; return p.enabled && !!config.location.displayAddress.trim() && !!config.location.mapsUrl && !!config.schedule.opens && !!config.schedule.closes && !!p.collectionInstructions.trim() && p.estimatedMinutes.max >= p.estimatedMinutes.min; }
export function deliveryReady(config: RestaurantSettings) { const d = config.delivery; return d.enabled && d.coverageConfirmed && d.supportedAreas.length > 0 && d.supportedAreas.every(a => a.city.trim() && (a.neighborhood.trim() || a.postalCodes.length > 0)) && d.pricingConfirmed && nonnegative(d.feeHalalas) && nonnegative(d.minimumOrderHalalas) && d.estimateConfirmed && d.processConfirmed && !!d.processNotes.trim(); }
export function orderAvailability(config: RestaurantSettings, method: 'pickup' | 'delivery') {
  const reasons: string[] = [];
  if (method === 'delivery' && !config.delivery.supportedAreas.length) reasons.push('The restaurant has not configured confirmed delivery coverage yet.');
  if (!(method === 'pickup' ? pickupReady(config) : deliveryReady(config))) reasons.push(`${method === 'pickup' ? 'Pickup' : 'Delivery'} settings are not enabled and fully confirmed.`);
  if (!config[method].estimateConfirmed) reasons.push('The displayed time range is a proposal and still needs restaurant confirmation.');
  const hours = openingAvailability(config, method);
  if (!hours.available) reasons.push(hours.reason);
  if (env.ORDER_CREATION_ENABLED !== 'true') reasons.push('Online order creation is disabled by the restaurant.');
  if (!paymentReadiness().ready) reasons.push(paymentReadiness().reason);
  return { available: reasons.length === 0, reasons, hours };
}
export function assertCanCreateOrder(config: RestaurantSettings, method: 'pickup' | 'delivery') {
  if (!(method === 'pickup' ? pickupReady(config) : deliveryReady(config))) throw new AppError(503, 'FULFILLMENT_SETUP_REQUIRED', 'This fulfillment option is not fully configured and enabled.');
  if (!config[method].estimateConfirmed) throw new AppError(503, 'ESTIMATE_SETUP_REQUIRED', 'Restaurant fulfillment estimates require confirmation.');
  const hours = openingAvailability(config, method);
  if (!hours.available) throw new AppError(422, hours.code, hours.reason);
  if (!paymentReadiness().ready) throw new AppError(503, 'PAYMENT_SETUP_REQUIRED', paymentReadiness().reason);
}
export function deliveryFee(config: RestaurantSettings, method: 'delivery' | 'pickup', subtotal: number, address?: { city: string; neighborhood: string; postalCode?: string }) {
  if (method === 'pickup') { if (!pickupReady(config)) throw new AppError(503, 'PICKUP_SETUP_REQUIRED', 'Pickup is unavailable until restaurant setup is complete.'); return 0; }
  if (!deliveryReady(config)) throw new AppError(503, 'DELIVERY_SETUP_REQUIRED', 'Confirmed delivery coverage, pricing, estimates and process are required.');
  if (!address || !config.delivery.supportedAreas.some(area => normalized(area.city) === normalized(address.city) && (!area.neighborhood || normalized(area.neighborhood) === normalized(address.neighborhood)) && (!area.postalCodes.length || area.postalCodes.some(code => normalized(code) === normalized(address.postalCode || ''))))) throw new AppError(422, 'OUTSIDE_SERVICE_AREA', 'This city, neighborhood, or postal code is outside the confirmed delivery area.');
  if (subtotal < config.delivery.minimumOrderHalalas!) throw new AppError(422, 'MINIMUM_ORDER', 'The food subtotal is below the configured delivery minimum.');
  return config.delivery.feeHalalas!;
}
export async function publicSettings() {
  const config = await getRestaurant(); const payment = paymentReadiness();
  return { currency: config.currency, ordersEnabled: env.ORDER_CREATION_ENABLED === 'true' && payment.ready, reservationsEnabled: env.RESERVATION_CREATION_ENABLED === 'true' && config.reservations.enabled && config.reservations.maxPartySize !== null && config.reservations.collectionWindows.length > 0, reservations: { maxPartySize: config.reservations.maxPartySize, timeZone: config.schedule.timeZone, openingHours: config.pickup.openingHours, weekdays: config.schedule.weekdays, reasons: [...(env.RESERVATION_CREATION_ENABLED !== 'true' ? ['Reservation requests are paused by the server.'] : []), ...(!config.reservations.enabled ? ['Reservation requests are disabled in restaurant settings.'] : []), ...(!config.schedule.daysConfirmed ? ['Operating days need confirmation in admin settings.'] : []), ...(config.reservations.maxPartySize === null ? ['Set the maximum guests per request in admin settings.'] : [])] }, location: config.location, schedule: config.schedule, payment, availability: { pickup: orderAvailability(config, 'pickup'), delivery: orderAvailability(config, 'delivery') }, serverTime: new Date().toISOString(), fulfillment: { currency: config.currency, pickup: { ...config.pickup, enabled: !!pickupReady(config), mapsUrl: config.location.mapsUrl }, delivery: { enabled: !!deliveryReady(config) && payment.ready, supportedAreas: config.delivery.supportedAreas, fee: config.delivery.feeHalalas === null ? null : config.delivery.feeHalalas / 100, minimumOrder: config.delivery.minimumOrderHalalas === null ? null : config.delivery.minimumOrderHalalas / 100, estimatedMinutes: config.delivery.estimatedMinutes, estimateConfirmed: config.delivery.estimateConfirmed } }, taxBasisPoints: config.taxBasisPoints, taxDeliveryFee: config.taxDeliveryFee };
}
