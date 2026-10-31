import { Schema, model } from 'mongoose';
// Provider event IDs only; no webhook payload, credentials, or customer data.
const schema = new Schema({ _id: { type: String, required: true }, payloadHash: { type: String, required: true }, state: { type: String, enum: ['processing', 'completed'], required: true }, leaseUntil: { type: Date, required: true }, leaseToken: { type: String, required: true }, completedAt: Date }, { timestamps: true });
export const WebhookReceipt = model('WebhookReceipt', schema);
