import type { RequestHandler } from 'express';
import { input } from '../../middleware/validateRequest.js';
import { userId } from '../../middleware/authenticate.js';
import { actor } from '../../utils/roles.js';
import type { OrderInput, OrderQuery, OrderActionInput, OrderAction } from './order.validation.js';
import { requestKey } from './order.validation.js';
import * as service from './order.service.js';
import { performOrderAction, statusAction, staffOrderDTO, kitchenOrderDTO } from './order.operations.js';
import { getOperations, kitchenSettings } from '../operations/operations.service.js';
import { cashierQueue, kitchenQueue } from './order.queues.js';
function customerDTO(order: Awaited<ReturnType<typeof service.orderDetail>>) {
  const data = order.toObject();
  const { requestKey: _key, requestHash: _hash, acceptedBy: _by, deliveryHandoffCode: handoffCode, handoffAttempts: _attempts, handoffBlockedUntil: _blocked, deliveryAssignment, deliveryIssue, deliveryEvents: _events, ...safe } = data;
  return { ...safe, deliveryNeedsSupport: !!(deliveryIssue?.reportedAt && !deliveryIssue.resolvedAt), deliveryAssignment: deliveryAssignment ? { name: deliveryAssignment.name, phone: deliveryAssignment.phone, dispatchedAt: deliveryAssignment.dispatchedAt, completedAt: deliveryAssignment.completedAt } : undefined, ...(data.status === 'out_for_delivery' ? { deliveryHandoffCode: handoffCode } : {}), statusHistory: data.statusHistory.map(entry => ({ status: entry.status, previousStatus: entry.previousStatus, newStatus: entry.newStatus, changedAt: entry.changedAt, ...(['rejected', 'cancelled'].includes(entry.status || '') ? { reason: entry.reason } : {}) })) };
}
export const create: RequestHandler = async (req, res) => { const result = await service.createOrder(userId(req), input<OrderInput>(res), requestKey.parse(req.header('Idempotency-Key')), actor(res).role); res.status(result.replay ? 200 : 201).json({ data: customerDTO(result.order), message: 'Order saved as pending payment. It is not confirmed or accepted for fulfillment.' }); };
export const mine: RequestHandler = async (req, res) => { const result = await service.listOrders(input<OrderQuery>(res, 'query'), userId(req)); res.json({ ...result, data: result.data.map(customerDTO) }); };
export const myDetail: RequestHandler = async (req, res) => { res.json({ data: customerDTO(await service.orderDetail(input<{ id: string }>(res, 'params').id, userId(req))) }); };
export const adminList: RequestHandler = async (_req, res) => { res.json(await cashierQueue(input<OrderQuery>(res, 'query'), actor(res))); };
export const adminDetail: RequestHandler = async (_req, res) => { const order = await service.orderDetail(input<{ id: string }>(res, 'params').id); const settings = await getOperations(); res.json({ data: staffOrderDTO(order, actor(res).role, settings), operations: settings, serverTime: new Date().toISOString() }); };
export const status: RequestHandler = async (_req, res) => { const data = input<OrderActionInput & { status: service.OrderStatus }>(res); const order = await statusAction(input<{ id: string }>(res, 'params').id, data.status, data, actor(res)); const settings = await getOperations(); res.json({ data: staffOrderDTO(order, actor(res).role, settings) }); };
export const cashierList: RequestHandler = async (_req, res) => { res.json(await cashierQueue(input<OrderQuery>(res, 'query'), actor(res))); };
export const kitchenList: RequestHandler = async (_req, res) => { res.json(await kitchenQueue(input<OrderQuery>(res, 'query'), actor(res))); };
export const orderAction = (action: OrderAction): RequestHandler => async (_req, res) => {
  const currentActor = actor(res);
  const order = await performOrderAction(input<{ id: string }>(res, 'params').id, action, input<OrderActionInput>(res), currentActor);
  const settings = await getOperations();
  res.json({ data: currentActor.role === 'kitchen' ? kitchenOrderDTO(order, currentActor.role, settings) : staffOrderDTO(order, currentActor.role, settings), operations: currentActor.role === 'kitchen' ? kitchenSettings(settings) : settings });
};
