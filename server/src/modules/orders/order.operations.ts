import { randomInt } from 'node:crypto';
import { loadDeliveryDriver, verifyDeliveryCode } from '../delivery/delivery.service.js';
import { Order } from './order.model.js';
import { orderDetail, type OrderStatus } from './order.service.js';
import type { OrderAction, OrderActionInput } from './order.validation.js';
import type { Actor } from '../../utils/roles.js';
import { getOperations } from '../operations/operations.service.js';
type OperationsSettings = Awaited<ReturnType<typeof getOperations>>;
import { openingAvailability } from '../../utils/openingHours.js';
import { pickupReady, deliveryReady } from '../../utils/fulfillment.js';
import { AppError } from '../../utils/errors.js';
export type StoredOrder = Awaited<ReturnType<typeof orderDetail>>;
const terminal = ['completed', 'cancelled', 'rejected'];
export function allowedActions(order: StoredOrder, role: Actor['role'], settings: OperationsSettings): OrderAction[] {
  const front = role === 'admin' || role === 'cashier';
  const kitchen = role === 'admin' || role === 'kitchen';
  const pending = order.status === 'pending_payment' || order.status === 'pending_confirmation';
  const paid = order.paymentStatus === 'paid';
  const result: OrderAction[] = [];
  if (front && pending) result.push('reject');
  if (front && !terminal.includes(order.status)) result.push('cancel');
  if (front && pending && paid && openingAvailability(settings.restaurant, order.fulfillment).available && settings.cashierEnabled && settings.kitchenEnabled && (order.fulfillment === 'pickup' ? pickupReady(settings.restaurant) : deliveryReady(settings.restaurant))) result.unshift('accept');
  if (kitchen && paid && settings.kitchenEnabled && order.status === 'confirmed') result.push('start_preparation');
  if (kitchen && paid && settings.kitchenEnabled && order.status === 'preparing') result.push('mark_ready');
  if (front && paid && settings.cashierEnabled && settings.pickupHandoffEnabled && settings.pickupHandoffInstructions.trim() && pickupReady(settings.restaurant) && order.fulfillment === 'pickup' && order.status === 'ready_for_pickup') result.push('complete_pickup');
  if (front && paid && settings.cashierEnabled && settings.deliveryDispatchEnabled && settings.deliveryProcessNotes.trim() && deliveryReady(settings.restaurant) && order.fulfillment === 'delivery' && order.status === 'ready_for_delivery') result.push('dispatch_delivery');
  if ((front || role === 'driver') && paid && settings.cashierEnabled && settings.deliveryDispatchEnabled && settings.deliveryCompletionEnabled && settings.deliveryProcessNotes.trim() && deliveryReady(settings.restaurant) && order.fulfillment === 'delivery' && order.status === 'out_for_delivery') result.push('complete_delivery');
  return result;
}
const nextStatus = (action: OrderAction, order: StoredOrder): OrderStatus => ({ accept: 'confirmed', reject: 'rejected', start_preparation: 'preparing', mark_ready: order.fulfillment === 'pickup' ? 'ready_for_pickup' : 'ready_for_delivery', complete_pickup: 'completed', dispatch_delivery: 'out_for_delivery', complete_delivery: 'completed', cancel: 'cancelled' } as Record<OrderAction, OrderStatus>)[action];
function isReplay(order: StoredOrder, actor: Actor, action: OrderAction, input: OrderActionInput) {
  const prior = order.statusHistory.find(entry => entry.actionId === input.actionId);
  if (!prior) return false;
  if (prior.changedBy !== actor.userId || prior.action !== action || (prior.reason || '') !== input.reason.trim() || (action === 'dispatch_delivery' && prior.driverId !== input.driverId)) throw new AppError(409, 'ACTION_CONFLICT', 'This action identifier was already used for a different operation.');
  return true;
}
export async function performOrderAction(id: string, action: OrderAction, input: OrderActionInput, actor: Actor) {
  const order = await orderDetail(id);
  if (actor.role === 'driver' && (action !== 'complete_delivery' || order.deliveryAssignment?.driverId !== actor.userId)) throw new AppError(403, 'FORBIDDEN', 'Drivers can only complete their own assigned deliveries.');
  if (isReplay(order, actor, action, input)) return order;
  if (order.status !== input.expectedStatus || order.updatedAt.toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) throw new AppError(409, 'STALE_ORDER', 'The order changed. Refresh and review it before continuing.');
  if ((action === 'reject' || action === 'cancel') && !input.reason.trim()) throw new AppError(422, 'REASON_REQUIRED', 'A reason is required for rejection or cancellation.');
  const settings = await getOperations();
  if (!allowedActions(order, actor.role, settings).includes(action)) throw new AppError(409, 'ACTION_NOT_ALLOWED', 'This action is not permitted for your role, the current order/payment state, or the configured restaurant workflow.');
  const driver = action === 'dispatch_delivery' ? await loadDeliveryDriver(input.driverId) : null;
  if (action === 'complete_delivery') await verifyDeliveryCode(order.id, input.handoffCode);
  const status = nextStatus(action, order);
  const now = new Date();
  const updated = await Order.findOneAndUpdate({ _id: id, status: order.status, paymentStatus: order.paymentStatus, updatedAt: order.updatedAt }, {
    $set: { status, ...(driver ? { deliveryAssignment: { driverId: driver.id, name: driver.name, phone: driver.phone, dispatchedAt: now, dispatchedBy: actor.userId }, deliveryHandoffCode: String(randomInt(100000, 1000000)), handoffAttempts: 0, handoffBlockedUntil: null } : {}), ...(action === 'complete_delivery' ? { 'deliveryAssignment.completedAt': now } : {}), ...(action === 'accept' ? { acceptedAt: now, acceptedBy: actor.userId, readyEstimateMinAt: new Date(now.getTime() + settings.restaurant[order.fulfillment].estimatedMinutes.min * 60000), readyEstimateMaxAt: new Date(now.getTime() + settings.restaurant[order.fulfillment].estimatedMinutes.max * 60000) } : {}), ...(action === 'reject' ? { rejectedReason: input.reason.trim() } : {}) },
    $push: { statusHistory: { status, previousStatus: order.status, newStatus: status, changedAt: now, changedBy: actor.userId, actorRole: actor.role, reason: input.reason.trim(), action, driverId: input.driverId, actionId: input.actionId } },
  }, { new: true, runValidators: true }).select('-requestKey');
  if (!updated) { const latest = await orderDetail(id); if (isReplay(latest, actor, action, input)) return latest; throw new AppError(409, 'STALE_ORDER', 'The order changed. Refresh before continuing.'); }
  return updated;
}
export async function statusAction(id: string, status: OrderStatus, input: OrderActionInput, actor: Actor) {
  const order = await orderDetail(id);
  let action: OrderAction;
  switch (status) {
    case 'confirmed': action = 'accept'; break;
    case 'preparing': action = 'start_preparation'; break;
    case 'ready_for_pickup': if (order.fulfillment !== 'pickup') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Delivery orders cannot be ready for pickup.'); action = 'mark_ready'; break;
    case 'ready_for_delivery': if (order.fulfillment !== 'delivery') throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Pickup orders cannot be ready for delivery.'); action = 'mark_ready'; break;
    case 'out_for_delivery': action = 'dispatch_delivery'; break;
    case 'completed': action = order.fulfillment === 'pickup' ? 'complete_pickup' : 'complete_delivery'; break;
    case 'rejected': action = 'reject'; break;
    case 'cancelled': action = 'cancel'; break;
    default: throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'Staff cannot set this status directly.');
  }
  return performOrderAction(id, action, input, actor);
}
export function staffOrderDTO(order: StoredOrder, role: Actor['role'], settings: OperationsSettings) {
  const restaurant = settings.restaurant;
  const data = order.toObject();
  const { requestKey: _key, requestHash: _hash, deliveryHandoffCode: _code, handoffAttempts: _attempts, handoffBlockedUntil: _blocked, __v: _version, userId: _user, ...safe } = data;
  const hasPickupSnapshot = Boolean(data.pickupDetails?.restaurantAddress?.trim());
  return { ...safe, canAdjustReadyEstimate: ['admin', 'cashier'].includes(role) && order.paymentStatus === 'paid' && ['confirmed', 'preparing'].includes(order.status), pickupDetails: data.fulfillment === 'pickup' ? hasPickupSnapshot ? data.pickupDetails : { restaurantAddress: restaurant.pickup.restaurantAddress, openingHours: restaurant.pickup.openingHours, collectionInstructions: restaurant.pickup.collectionInstructions, preparationTimeMinutes: restaurant.pickup.preparationTimeMinutes } : undefined, pickupDetailsSource: hasPickupSnapshot ? 'order snapshot' : 'current configuration (legacy order)', allowedActions: allowedActions(order, role, settings) };
}
export function kitchenOrderDTO(order: StoredOrder, role: Actor['role'], settings: OperationsSettings) {
  // Deliberate allowlist: no name, phone, email, address, payment reference, price, or staff user IDs.
  return { _id: order.id, orderNumber: order.orderNumber, fulfillment: order.fulfillment, status: order.status, acceptedAt: order.acceptedAt || null, readyEstimateMinAt: order.readyEstimateMinAt, readyEstimateMaxAt: order.readyEstimateMaxAt, updatedAt: order.updatedAt, preparationNotes: order.preparationNotes || '', items: order.items.map(line => ({ name: line.name, quantity: line.quantity, selectedOptions: line.selectedOptions.map(group => ({ name: group.name, options: group.options.map(option => ({ name: option.name })) })) })), allowedActions: allowedActions(order, role, settings).filter(action => action === 'start_preparation' || action === 'mark_ready') };
}

