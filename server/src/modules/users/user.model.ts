import { Schema, model } from 'mongoose';
// Read-only identity/role snapshots for app records; Clerk remains authoritative.
const schema = new Schema({ clerkId: { type: String, required: true, unique: true }, name: { type: String, default: '' }, email: { type: String, default: '' }, emailVerified: { type: Boolean, default: false }, role: { type: String, enum: ['customer', 'admin', 'cashier', 'kitchen', 'driver'], default: 'customer' }, staffName: { type: String, default: '' }, staffPhone: { type: String, default: '' }, staffManaged: { type: Boolean, default: false }, clerkUpdatedAt: Date, lastSignInAt: Date, preferences: { language: { type: String, enum: ['en', 'ar'], default: 'en' } } }, { timestamps: true });
export const UserProfile = model('UserProfile', schema);
