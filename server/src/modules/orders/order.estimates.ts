import { z } from 'zod';
import { Order } from './order.model.js';
import { orderDetail } from './order.service.js';
import type { Actor } from '../../utils/roles.js';
import { AppError } from '../../utils/errors.js';
import { getRestaurant } from '../fulfillment/fulfillment.service.js';
import { openingAvailability } from '../../utils/openingHours.js';
export const readyEstimateInput = z.object({ expectedUpdatedAt: z.string().datetime({ offset: true }), actionId: z.string().uuid(), minMinutes: z.number().int().min(1).max(240), maxMinutes: z.number().int().min(1).max(240), reason: z.string().trim().min(1).max(1000) }).strict().refine(value => value.maxMinutes >= value.minMinutes, 'Maximum must be at least the minimum.');
export async function updateReadyEstimate(id: string, input: z.infer<typeof readyEstimateInput>, actor: Actor) {
  if (!['admin', 'cashier'].includes(actor.role)) throw new AppError(403, 'FORBIDDEN', 'Front-of-house staff manage ready estimates.');
  const order = await orderDetail(id);
  const reason = `Ready estimate: ${input.minMinutes}–${input.maxMinutes} minutes from update time. ${input.reason}`;
  const replay = order.statusHistory.find(entry => entry.actionId === input.actionId);
  if (replay) { if (replay.changedBy !== actor.userId || replay.action !== 'adjust_ready_estimate' || replay.reason !== reason) throw new AppError(409, 'ACTION_CONFLICT', 'This action identifier was already used.'); return order; }
  if (!['confirmed', 'preparing'].includes(order.status) || order.paymentStatus !== 'paid') throw new AppError(409, 'ACTION_NOT_ALLOWED', 'Only accepted paid orders awaiting preparation can have their ready estimate adjusted.');
  const restaurant = await getRestaurant();
  const transport = order.fulfillment === 'delivery' ? Math.max(0, restaurant.delivery.estimatedMinutes.max - restaurant.pickup.estimatedMinutes.max) : 0;
  const config = { ...restaurant, [order.fulfillment]: { ...restaurant[order.fulfillment], estimatedMinutes: { min: input.minMinutes, max: input.maxMinutes + transport } } };
  const hours = openingAvailability(config, order.fulfillment);
  if (!hours.available) throw new AppError(422, hours.code, hours.reason);
  const now = new Date();
  const updated = await Order.findOneAndUpdate({ _id: id, status: order.status, paymentStatus: 'paid', updatedAt: new Date(input.expectedUpdatedAt) }, { $set: { readyEstimateMinAt: new Date(now.getTime() + input.minMinutes * 60000), readyEstimateMaxAt: new Date(now.getTime() + input.maxMinutes * 60000) }, $push: { statusHistory: { status: order.status, previousStatus: order.status, newStatus: order.status, changedAt: now, changedBy: actor.userId, actorRole: actor.role, reason, action: 'adjust_ready_estimate', actionId: input.actionId } } }, { returnDocument: 'after', runValidators: true });
  if (!updated) { const latest = await orderDetail(id); if (latest.statusHistory.some(entry => entry.actionId === input.actionId && entry.changedBy === actor.userId && entry.action === 'adjust_ready_estimate' && entry.reason === reason)) return latest; throw new AppError(409, 'STALE_ORDER', 'The order changed. Refresh before adjusting its estimate.'); }
  return updated;
}
