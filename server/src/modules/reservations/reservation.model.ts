import { Schema, model } from 'mongoose';
export const reservationStatuses = ['requested', 'confirmed', 'cancelled', 'completed'] as const;
const schema = new Schema({ userId: { type: String, required: true }, requestKey: { type: String, required: true }, requestHash: { type: String, required: true, select: false }, customer: { name: { type: String, required: true }, email: { type: String, required: true }, phone: { type: String, required: true, match: /^\+9665\d{8}$/ } }, dateTime: { type: Date, required: true }, partySize: { type: Number, required: true, min: 1, validate: Number.isInteger }, notes: { type: String, maxlength: 1500, default: '' }, status: { type: String, enum: reservationStatuses, default: 'requested' }, statusHistory: [{ _id: false, status: { type: String, enum: reservationStatuses }, changedAt: Date, changedBy: String }] }, { timestamps: true });
schema.index({ userId: 1, requestKey: 1 }, { unique: true });
schema.index({ userId: 1, dateTime: -1 });
schema.index({ status: 1, dateTime: 1 });
export const Reservation = model('Reservation', schema);
