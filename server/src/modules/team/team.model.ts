import { Schema, model } from 'mongoose';
const schema = new Schema({ actorId: { type: String, required: true }, targetId: { type: String, required: true }, action: { type: String, required: true }, previousRole: String, nextRole: String }, { timestamps: true });
export const TeamAudit = model('TeamAudit', schema);
