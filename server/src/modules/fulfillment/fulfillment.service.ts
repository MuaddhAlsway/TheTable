import { Fulfillment } from './fulfillment.model.js';
import { defaultFulfillment, fulfillmentSchema, type FulfillmentSettings } from './fulfillment.validation.js';
import { restaurant as legacy } from '../../config/restaurant.js';
import { AppError } from '../../utils/errors.js';
export async function readFulfillment() {
  const record = await Fulfillment.findById('fulfillment');
  const parsed = fulfillmentSchema.safeParse(record?.settings || defaultFulfillment);
  if (!parsed.success) throw new AppError(503, 'FULFILLMENT_SETUP_REQUIRED', 'Restaurant settings require administrator review.');
  return { settings: parsed.data, revision: record?.revision || 0, updatedAt: record?.updatedAt?.toISOString() || null };
}
export async function saveFulfillment(settings: FulfillmentSettings, revision: number, actor: string) {
  const parsed = fulfillmentSchema.parse(settings);
  if (revision === 0) {
    try { await Fulfillment.create({ _id: 'fulfillment', settings: parsed, revision: 1, updatedBy: actor }); }
    catch (error) { if ((error as { code?: number }).code === 11000) throw new AppError(409, 'CONFLICT', 'Settings changed. Reload before saving.'); throw error; }
  } else {
    const updated = await Fulfillment.findOneAndUpdate({ _id: 'fulfillment', revision }, { $set: { settings: parsed, updatedBy: actor }, $inc: { revision: 1 } }, { returnDocument: 'after', runValidators: true });
    if (!updated) throw new AppError(409, 'CONFLICT', 'Settings changed. Reload before saving.');
  }
  return readFulfillment();
}
export async function getRestaurant() {
  const { settings } = await readFulfillment();
  return { ...legacy, ...settings, reservations: { ...settings.reservations, timeZone: settings.schedule.timeZone, collectionWindows: settings.schedule.daysConfirmed ? settings.schedule.weekdays.map(weekday => ({ weekday, opens: settings.schedule.opens, closes: settings.schedule.closes })) : [] }, pickup: { ...settings.pickup, restaurantAddress: settings.location.displayAddress, openingHours: `${settings.schedule.opens}–${settings.schedule.closes === '00:00' ? 'midnight' : settings.schedule.closes} (${settings.schedule.timeZone})`, preparationTimeMinutes: settings.pickup.estimatedMinutes.max } };
}
export type RestaurantSettings = Awaited<ReturnType<typeof getRestaurant>>;
