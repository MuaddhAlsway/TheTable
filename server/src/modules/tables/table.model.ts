import { Schema, model } from 'mongoose';
const schema = new Schema({
  label: { type: String, required: true, trim: true, maxlength: 60, unique: true },
  token: { type: String, required: true, unique: true, select: false },
  enabled: { type: Boolean, default: true },
  updatedBy: { type: String, required: true },
}, { timestamps: true });
export const DiningTable = model('DiningTable', schema);
