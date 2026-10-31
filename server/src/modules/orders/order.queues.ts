import { trusted } from 'mongoose';
import { Order } from './order.model.js';
import { orderFilter, type OrderStatus } from './order.service.js';
import { kitchenOrderDTO, staffOrderDTO } from './order.operations.js';
import { getOperations, kitchenSettings } from '../operations/operations.service.js';
import type { OrderQuery } from './order.validation.js';
import type { Actor } from '../../utils/roles.js';
export async function cashierQueue(query: OrderQuery, actor: Actor) {
  const settings = await getOperations(); const filter = orderFilter(query);
  const [records, total] = await Promise.all([Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).select('-requestKey'), Order.countDocuments(filter)]);
  return { data: records.map(order => staffOrderDTO(order, actor.role, settings)), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }, operations: settings, serverTime: new Date().toISOString() };
}
export async function kitchenQueue(query: OrderQuery, actor: Actor) {
  const settings = await getOperations();
  const statuses: OrderStatus[] = ['confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery'];
  const filter = { ...orderFilter(query), paymentStatus: 'paid' as const, status: query.status || trusted({ $in: statuses }) };
  const projection = 'orderNumber fulfillment status acceptedAt readyEstimateMinAt readyEstimateMaxAt updatedAt paymentStatus preparationNotes items.name items.quantity items.selectedOptions.name items.selectedOptions.options.name';
  const [records, total] = await Promise.all([Order.find(filter).select(projection).sort({ acceptedAt: 1, createdAt: 1, _id: 1 }).skip((query.page - 1) * query.limit).limit(query.limit), Order.countDocuments(filter)]);
  return { data: records.map(order => kitchenOrderDTO(order, actor.role, settings)), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) }, operations: kitchenSettings(settings), serverTime: new Date().toISOString() };
}
