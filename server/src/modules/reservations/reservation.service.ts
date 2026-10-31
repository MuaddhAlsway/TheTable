import { createHash } from 'node:crypto';
import { Reservation, reservationStatuses } from './reservation.model.js';
import type { ReservationInput, ReservationQuery } from './reservation.validation.js';
import { getRestaurant, type RestaurantSettings } from '../fulfillment/fulfillment.service.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
export type ReservationStatus = typeof reservationStatuses[number];
export function validateReservationTime(date: Date, partySize: number, restaurant: RestaurantSettings) {
  const settings = restaurant.reservations;
  if (!settings.enabled || !settings.maxPartySize || !Number.isInteger(settings.maxPartySize) || settings.maxPartySize < 1 || !settings.collectionWindows.length) throw new AppError(503, 'RESERVATION_SETUP_REQUIRED', 'Reservation hours and party-size limits must be configured.');
  if (partySize > settings.maxPartySize) throw new AppError(422, 'PARTY_SIZE', 'The party size exceeds the configured limit.');
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new AppError(422, 'INVALID_TIME', 'Choose a future reservation time.');
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: settings.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  const supported = settings.collectionWindows.some(window => {
    if (!Number.isInteger(window.weekday) || window.weekday < 0 || window.weekday > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.opens) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.closes)) throw new AppError(503, 'RESERVATION_SETUP_REQUIRED', 'Reservation hours require review.');
    const parse = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    const start = parse(window.opens), end = parse(window.closes);
    if (start === end) return false;
    return end > start ? day === window.weekday && minutes >= start && minutes < end : (day === window.weekday && minutes >= start) || (day === (window.weekday + 1) % 7 && minutes < end);
  });
  if (!supported) throw new AppError(422, 'OUTSIDE_HOURS', 'The selected time is outside configured reservation hours.');
}
export async function createReservation(userId: string, data: ReservationInput, key: string) {
  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const prior = await Reservation.findOne({ userId, requestKey: key }).select('+requestHash');
  if (prior) { if (prior.requestHash !== hash) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'This request key was used for different reservation details.'); prior.set('requestHash', undefined); return { reservation: prior, replay: true }; }
  if (env.RESERVATION_CREATION_ENABLED !== 'true') throw new AppError(503, 'RESERVATIONS_DISABLED', 'Online reservation requests are not enabled.');
  const restaurant = await getRestaurant();
  const dateTime = new Date(data.dateTime); validateReservationTime(dateTime, data.partySize, restaurant);
  try { const reservation = await Reservation.create({ userId, requestKey: key, requestHash: hash, ...data, dateTime, status: 'requested', statusHistory: [{ status: 'requested', changedAt: new Date(), changedBy: userId }] }); reservation.set('requestHash', undefined); return { reservation, replay: false }; }
  catch (error) { if ((error as { code?: number }).code === 11000) { const duplicate = await Reservation.findOne({ userId, requestKey: key }).select('+requestHash'); if (duplicate && duplicate.requestHash === hash) { duplicate.set('requestHash', undefined); return { reservation: duplicate, replay: true }; } } throw error; }
}
export async function listReservations(query: ReservationQuery, owner?: string) { const filter = { ...(owner ? { userId: owner } : {}), ...(query.status ? { status: query.status } : {}) }; const [data, total] = await Promise.all([Reservation.find(filter).sort({ dateTime: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).select('-requestKey'), Reservation.countDocuments(filter)]); return { data, pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } }; }
export async function reservationDetail(id: string, owner?: string) { const reservation = await Reservation.findOne({ _id: id, ...(owner ? { userId: owner } : {}) }).select('-requestKey'); if (!reservation) throw new AppError(404, 'NOT_FOUND', 'Reservation not found.'); return reservation; }
export async function updateReservationStatus(id: string, status: ReservationStatus, actor: string) {
  const reservation = await reservationDetail(id);
  const allowed: Record<ReservationStatus, ReservationStatus[]> = { requested: ['confirmed', 'cancelled'], confirmed: ['cancelled', 'completed'], cancelled: [], completed: [] };
  if (!allowed[reservation.status as ReservationStatus].includes(status)) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'That reservation status change is not permitted.');
  if (status === 'completed' && reservation.dateTime > new Date()) throw new AppError(409, 'INVALID_STATUS_TRANSITION', 'A future reservation cannot be completed.');
  const updated = await Reservation.findOneAndUpdate({ _id: id, status: reservation.status }, { $set: { status }, $push: { statusHistory: { status, changedAt: new Date(), changedBy: actor } } }, { new: true, runValidators: true }); if (!updated) throw new AppError(409, 'CONFLICT', 'Reservation changed. Refresh before updating.'); return updated;
}
