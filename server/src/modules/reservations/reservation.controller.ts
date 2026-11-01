import type { RequestHandler } from 'express';
import { input } from '../../middleware/validateRequest.js';
import { actor } from '../../utils/roles.js';
import { requestKey } from '../orders/order.validation.js';
import type { ReservationInput, ReservationQuery } from './reservation.validation.js';
import * as service from './reservation.service.js';
function customerDTO(record: Awaited<ReturnType<typeof service.reservationDetail>>) {
  const { userId: _owner, requestKey: _key, requestHash: _hash, __v: _version, statusHistory, ...data } = record.toObject();
  return { ...data, statusHistory: statusHistory.map(entry => ({ status: entry.status, changedAt: entry.changedAt, reason: entry.reason })) };
}
export const create: RequestHandler = async (req, res) => { const result = await service.createReservation(actor(res).userId, input<ReservationInput>(res), requestKey.parse(req.header('Idempotency-Key'))); res.status(result.replay ? 200 : 201).json({ data: customerDTO(result.reservation), message: 'Reservation request saved. It is not confirmed until staff review it.' }); };
export const mine: RequestHandler = async (req, res) => { const result = await service.listReservations(input<ReservationQuery>(res, 'query'), actor(res).userId); res.json({ ...result, data: result.data.map(customerDTO) }); };
export const myDetail: RequestHandler = async (req, res) => { res.json({ data: customerDTO(await service.reservationDetail(input<{ id: string }>(res, 'params').id, actor(res).userId)) }); };
export const adminList: RequestHandler = async (_req, res) => { res.json(await service.listReservations(input<ReservationQuery>(res, 'query'))); };
export const status: RequestHandler = async (req, res) => { const data = input<{ status: service.ReservationStatus; expectedStatus: service.ReservationStatus; expectedUpdatedAt: string; reason: string }>(res); res.json({ data: await service.updateReservationStatus(input<{ id: string }>(res, 'params').id, data.status, actor(res).userId, data) }); };
export const cancel: RequestHandler = async (req, res) => { const data = input<{ expectedStatus: service.ReservationStatus; expectedUpdatedAt: string; reason: string }>(res); res.json({ data: customerDTO(await service.updateReservationStatus(input<{ id: string }>(res, 'params').id, 'cancelled', actor(res).userId, { ...data, owner: actor(res).userId })) }); };
