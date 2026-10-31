import { Schema, model } from 'mongoose';
// The complete nested object is validated against the strict typed schema on read/write.
const schema = new Schema({ _id: { type: String, default: 'fulfillment' }, settings: { type: Schema.Types.Mixed, required: true }, revision: { type: Number, required: true }, updatedBy: { type: String, required: true } }, { timestamps: true });
export const Fulfillment = model('FulfillmentSettings', schema);
