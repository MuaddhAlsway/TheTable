import { z } from 'zod';
const range = z.object({ min: z.number().int().min(1).max(240), max: z.number().int().min(1).max(240) }).strict().refine(value => value.max >= value.min, 'Maximum must be at least the minimum.');
const money = z.number().int().min(0).max(1000000).nullable();
const area = z.object({ city: z.string().trim().min(1).max(100), neighborhood: z.string().trim().max(100), postalCodes: z.array(z.string().regex(/^\d{5}$/)).max(100) }).strict().refine(value => !!value.neighborhood || value.postalCodes.length > 0, 'Specify a neighborhood or postal codes.');
const reservationSettings = z.object({ enabled: z.boolean(), maxPartySize: z.number().int().min(1).max(100).nullable() }).strict().refine(value => !value.enabled || value.maxPartySize !== null, 'Set a maximum group size before enabling reservation requests.');
export const fulfillmentSchema = z.object({
  reservations: reservationSettings.default({ enabled: false, maxPartySize: null }),
  location: z.object({ city: z.string().trim().min(1).max(100), area: z.string().trim().min(1).max(100), displayAddress: z.string().trim().min(1).max(300), mapsUrl: z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && ['maps.app.goo.gl', 'maps.google.com', 'www.google.com', 'google.com'].includes(url.hostname); }, 'Use a Google Maps HTTPS URL'), exactAddressConfirmed: z.boolean() }).strict(),
  schedule: z.object({ timeZone: z.literal('Asia/Riyadh'), opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7), daysConfirmed: z.boolean(), acceptanceBufferMinutes: z.number().int().min(0).max(120) }).strict().refine(value => value.opens !== value.closes && new Set(value.weekdays).size === value.weekdays.length, 'Use distinct opening/closing times and unique days.'),
  pickup: z.object({ enabled: z.boolean(), collectionInstructions: z.string().trim().min(1).max(1500), estimatedMinutes: range, estimateConfirmed: z.boolean() }).strict(),
  delivery: z.object({ enabled: z.boolean(), supportedAreas: z.array(area).max(100), coverageConfirmed: z.boolean(), feeHalalas: money, minimumOrderHalalas: money, pricingConfirmed: z.boolean(), estimatedMinutes: range, estimateConfirmed: z.boolean(), processConfirmed: z.boolean(), processNotes: z.string().trim().max(1500) }).strict(),
}).strict().superRefine((value, ctx) => {
  if (value.delivery.enabled && (!value.delivery.coverageConfirmed || !value.delivery.supportedAreas.length || !value.delivery.pricingConfirmed || value.delivery.feeHalalas === null || value.delivery.minimumOrderHalalas === null || !value.delivery.estimateConfirmed || !value.delivery.processConfirmed || !value.delivery.processNotes.trim())) ctx.addIssue({ code: 'custom', path: ['delivery', 'enabled'], message: 'Confirm coverage, fee/minimum, estimate and the actual delivery process before enabling delivery.' });
});
export type FulfillmentSettings = z.infer<typeof fulfillmentSchema>;
export const fulfillmentInput = z.object({ revision: z.number().int().min(0), settings: fulfillmentSchema }).strict();
export const defaultFulfillment: FulfillmentSettings = {
  reservations: { enabled: false, maxPartySize: null },
  location: { city: 'Jeddah', area: 'North Obhur (أبحر الشمالية)', displayAddress: 'North Obhur, Jeddah', mapsUrl: 'https://maps.app.goo.gl/dv9BcEmq1RgL83o39', exactAddressConfirmed: false },
  schedule: { timeZone: 'Asia/Riyadh', opens: '08:00', closes: '00:00', weekdays: [0, 1, 2, 3, 4, 5, 6], daysConfirmed: false, acceptanceBufferMinutes: 0 },
  pickup: { enabled: true, collectionInstructions: 'Come to the pickup counter and give the team your order number. Check your order status in your account; automatic notifications are not connected.', estimatedMinutes: { min: 25, max: 35 }, estimateConfirmed: false },
  delivery: { enabled: false, supportedAreas: [], coverageConfirmed: false, feeHalalas: null, minimumOrderHalalas: null, pricingConfirmed: false, estimatedMinutes: { min: 45, max: 60 }, estimateConfirmed: false, processConfirmed: false, processNotes: '' },
};
