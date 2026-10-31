import { Schema, model } from 'mongoose';
const option = new Schema({ id: { type: String, required: true }, name: { type: String, required: true }, priceHalalas: { type: Number, required: true, min: 0, validate: Number.isSafeInteger }, available: { type: Boolean, default: true } }, { _id: false });
const optionGroup = new Schema({ id: { type: String, required: true }, name: { type: String, required: true }, required: { type: Boolean, default: false }, maxSelections: { type: Number, required: true, min: 1 }, options: { type: [option], default: [] } }, { _id: false });
const schema = new Schema({
  name: { type: String, required: true, maxlength: 120 }, slug: { type: String, required: true, unique: true }, description: { type: String, required: true, maxlength: 2000 },
  priceHalalas: { type: Number, required: true, min: 0, validate: Number.isSafeInteger }, category: { type: String, required: true, enum: ['Starters', 'Mains', 'Sides', 'Desserts'] },
  imageUrl: { type: String, required: true }, available: { type: Boolean, default: true }, archived: { type: Boolean, default: false },
  tags: { type: [String], default: [] }, allergens: { type: [String], default: [] }, customizationOptions: { type: [optionGroup], default: [] },
}, { timestamps: true });
schema.index({ category: 1, available: 1, archived: 1 });
export const Menu = model('MenuItem', schema);
