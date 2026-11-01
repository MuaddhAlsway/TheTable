import { resolveTable } from '../tables/table.service.js';
import { randomUUID, createHash } from 'node:crypto';
import { trusted } from 'mongoose';
import { Order, orderStatuses } from './order.model.js';
import { Menu } from '../menu/menu.model.js';
import type { OrderInput, OrderQuery } from './order.validation.js';
import { getRestaurant } from '../fulfillment/fulfillment.service.js';
import { env } from '../../config/env.js';
import { deliveryFee, assertCanCreateOrder } from '../../utils/fulfillment.js';
import { escapeRegex } from '../../utils/validation.js';
import type { UserRole } from '../../utils/roles.js';
import { AppError } from '../../utils/errors.js';
export type OrderStatus = typeof orderStatuses[number];
export async function createOrder(userId: string, data: OrderInput, key: string, actorRole: UserRole) {
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const existing = await Order.findOne({ userId, requestKey: key }).select('+requestHash');
  if (existing) { if (existing.requestHash !== hash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was used for a different order.'); existing.set('requestHash', undefined); return { order: existing, replay: true }; }
  if (env.ORDER_CREATION_ENABLED !== 'true') throw new AppError(503, 'ORDERING_DISABLED', 'Online order creation is not enabled. No order has been placed.');
  const restaurant = await getRestaurant();
  assertCanCreateOrder(restaurant, data.fulfillment);
  const table = data.fulfillment === 'dine_in' ? await resolveTable(data.tableToken!) : null;
  const menu = await Menu.find({ _id: trusted({ $in: data.items.map(line => line.menuItemId) }), available: true, archived: false });
  const items = data.items.map(line => {
    const item = menu.find(entry => entry.id === line.menuItemId);
    if (!item) throw new AppError(422, 'ITEM_UNAVAILABLE', 'An item is unavailable or no longer exists. Refresh the menu.');
    if (new Set(line.selectedOptions.map(g => g.groupId)).size !== line.selectedOptions.length || line.selectedOptions.some(g => !item.customizationOptions.some(group => group.id === g.groupId))) throw new AppError(422, 'INVALID_OPTIONS', 'Unknown or duplicate customization group.');
    let unitPriceHalalas = item.priceHalalas;
    const selectedOptions = item.customizationOptions.map(group => {
      const selected = line.selectedOptions.find(g => g.groupId === group.id)?.optionIds || [];
      if (new Set(selected).size !== selected.length || selected.length > group.maxSelections || (group.required && !selected.length)) throw new AppError(422, 'INVALID_OPTIONS', 'Invalid customization selection.');
      const options = selected.map(id => { const option = group.options.find(o => o.id === id && o.available); if (!option) throw new AppError(422, 'OPTION_UNAVAILABLE', 'A customization option is unavailable.'); unitPriceHalalas += option.priceHalalas; return { id: option.id, name: option.name, priceHalalas: option.priceHalalas }; });
      return { groupId: group.id, name: group.name, options };
    }).filter(group => group.options.length);
    return { menuItemId: item._id, name: item.name, unitPriceHalalas, quantity: line.quantity, selectedOptions };
  });
  const subtotalHalalas = items.reduce((sum, line) => sum + line.unitPriceHalalas * line.quantity, 0);
  const fee = deliveryFee(restaurant, data.fulfillment, subtotalHalalas, data.deliveryAddress);
  const rate = restaurant.taxBasisPoints;
  if (rate !== null && (!Number.isInteger(rate) || rate < 0 || rate > 10000 || typeof restaurant.taxDeliveryFee !== 'boolean')) throw new AppError(503, 'TAX_SETUP_REQUIRED', 'Tax settings require review.');
  const taxHalalas = rate === null ? 0 : Math.round((subtotalHalalas + (restaurant.taxDeliveryFee ? fee : 0)) * rate / 10000);
  const totalHalalas = subtotalHalalas + fee + taxHalalas;
  if (totalHalalas < 1) throw new AppError(422, 'INVALID_PAYMENT_AMOUNT', 'The order total must be positive to continue to Stripe. No order was saved.');
  if (!Number.isSafeInteger(totalHalalas)) throw new AppError(422, 'INVALID_TOTAL', 'Order total is out of range.');
  try {
    const order = await Order.create({ orderNumber: 'TBL-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(), userId, requestKey: key, requestHash: hash, customer: data.customer, smsConsent: data.smsConsent, ...(data.smsConsent ? { smsConsentedAt: new Date() } : {}), fulfillment: data.fulfillment, ...(table ? { table: { id: table._id, label: table.label } } : data.fulfillment === 'delivery' ? { deliveryAddress: data.deliveryAddress } : { pickupTiming: data.pickupTiming, pickupDetails: { restaurantAddress: restaurant.pickup.restaurantAddress, openingHours: restaurant.pickup.openingHours, collectionInstructions: restaurant.pickup.collectionInstructions, preparationTimeMinutes: restaurant.pickup.preparationTimeMinutes, estimatedMinutes: restaurant.pickup.estimatedMinutes, mapsUrl: restaurant.location.mapsUrl } }), preparationNotes: data.preparationNotes, items, subtotalHalalas, deliveryFeeHalalas: fee, taxBasisPoints: rate, taxDeliveryFee: restaurant.taxDeliveryFee, taxHalalas, totalHalalas, status: 'pending_payment', paymentStatus: 'unpaid', statusHistory: [{ status: 'pending_payment', previousStatus: null, newStatus: 'pending_payment', changedAt: new Date(), changedBy: userId, actorRole, action: 'create', reason: '' }] });
    order.set('requestHash', undefined); return { order, replay: false };
  } catch (error) { if ((error as { code?: number }).code === 11000) { const duplicate = await Order.findOne({ userId, requestKey: key }).select('+requestHash'); if (duplicate && duplicate.requestHash === hash) { duplicate.set('requestHash', undefined); return { order: duplicate, replay: true }; } } throw error; }
}
export function orderFilter(query: OrderQuery, owner?: string) {
  const dateFilter = query.date ? { createdAt: trusted({ $gte: new Date(query.date + 'T00:00:00+03:00'), $lt: new Date(new Date(query.date + 'T00:00:00+03:00').getTime() + 86400000) }) } : {};
  return { ...(owner ? { userId: owner } : {}), ...(query.status ? { status: query.status } : {}), ...(query.fulfillment ? { fulfillment: query.fulfillment } : {}), ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}), ...(query.orderNumber ? { orderNumber: trusted({ $regex: escapeRegex(query.orderNumber), $options: 'i' }) } : {}), ...dateFilter };
}
export async function listOrders(query: OrderQuery, owner?: string) { const filter = orderFilter(query, owner); const [data, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).select('-requestKey'), Order.countDocuments(filter)]); return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } }; }
export async function orderDetail(id: string, owner?: string) { const order = await Order.findOne({ _id: id, ...(owner ? { userId: owner } : {}) }).select('-requestKey' + (owner ? ' +deliveryHandoffCode' : '')); if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found.'); return order; }
