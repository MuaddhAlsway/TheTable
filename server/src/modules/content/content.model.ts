import { Schema, model } from 'mongoose';
const schema = new Schema({ _id: { type: String, default: 'website' }, values: { type: Schema.Types.Mixed, default: {} }, revision: { type: Number, required: true }, updatedBy: { type: String, required: true } }, { timestamps: true });
export const WebsiteContent = model('WebsiteContent', schema);
