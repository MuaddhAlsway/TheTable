import { getRestaurant } from '../fulfillment/fulfillment.service.js';
import { Operations } from './operations.model.js';
import { defaultOperations, type OperationsSettings } from '../../config/operations.js';
import { operationsInput, type OperationsInput } from './operations.validation.js';
import { pickupReady, deliveryReady } from '../../utils/fulfillment.js';
import { AppError } from '../../utils/errors.js';
export async function getOperations() {
  const record = await Operations.findById('operations');
  const parsed = operationsInput.safeParse({ ...defaultOperations, ...(record?.toObject().settings || {}), revision: record?.revision || 0 });
  if (!parsed.success) throw new AppError(503, 'OPERATIONS_SETUP_REQUIRED', 'Operational settings require administrator review.');
  return { ...parsed.data, updatedAt: record?.updatedAt?.toISOString() || null, restaurant: await getRestaurant() };
}
export async function saveOperations(input: OperationsInput, userId: string) {
  const restaurant = await getRestaurant();
  if (input.pickupHandoffEnabled && !pickupReady(restaurant)) throw new AppError(422, 'PICKUP_SETUP_REQUIRED', 'Configure the real pickup address, hours, collection instructions and preparation estimate before enabling handoff.');
  if ((input.deliveryDispatchEnabled || input.deliveryCompletionEnabled) && !deliveryReady(restaurant)) throw new AppError(422, 'DELIVERY_SETUP_REQUIRED', 'Configure real delivery areas, fees, minimums and estimates before enabling a delivery process.');
  const { revision, ...settings } = input;
  if (revision === 0) {
    try { await Operations.create({ _id: 'operations', settings, revision: 1, updatedBy: userId }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new AppError(409, 'CONFLICT', 'Settings changed. Reload before saving.'); throw error; }
  } else {
    const updated = await Operations.findOneAndUpdate({ _id: 'operations', revision }, { $set: { settings, updatedBy: userId }, $inc: { revision: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new AppError(409, 'CONFLICT', 'Settings changed. Reload before saving.');
  }
  return getOperations();
}
export function kitchenSettings(settings: OperationsSettings) { return { kitchenEnabled: settings.kitchenEnabled, pollIntervalSeconds: settings.pollIntervalSeconds, staleAfterSeconds: settings.staleAfterSeconds, urgencyWarningMinutes: settings.urgencyWarningMinutes, urgencyCriticalMinutes: settings.urgencyCriticalMinutes }; }
