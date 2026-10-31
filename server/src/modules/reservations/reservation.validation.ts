import { z } from 'zod';
import { customer, optionalText, pagination } from '../../utils/validation.js';
import { reservationStatuses } from './reservation.model.js';
export const reservationInput = z.object({ customer, dateTime: z.string().datetime({ offset: true }), partySize: z.number().int().min(1), notes: optionalText(1500) }).strict();
export type ReservationInput = z.infer<typeof reservationInput>;
export const reservationQuery = z.object({ ...pagination, status: z.enum(reservationStatuses).optional() }).strict();
export type ReservationQuery = z.infer<typeof reservationQuery>;
export const reservationStatusInput = z.object({ status: z.enum(reservationStatuses) }).strict();
