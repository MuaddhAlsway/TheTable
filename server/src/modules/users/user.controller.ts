import { verifiedRole } from "../../utils/roles.js";
import type { RequestHandler } from 'express';
import type { clerk } from '../../config/clerk.js';
import { userId } from '../../middleware/authenticate.js';
import { input } from '../../middleware/validateRequest.js';
import { UserProfile } from './user.model.js';
export const me: RequestHandler = (req, res) => { const id = userId(req); const user = res.locals.clerkUser as Awaited<ReturnType<typeof clerk.users.getUser>>; const profile = res.locals.userProfile; res.json({ data: { id, name: [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)?.emailAddress || '', role: verifiedRole(user.publicMetadata.role), preferences: profile?.preferences || { language: 'en' } } }); };
export const update: RequestHandler = async (req, res) => { const preferences = input<{ language: 'en' | 'ar' }>(res); const profile = await UserProfile.findOneAndUpdate({ clerkId: userId(req) }, { $set: { preferences } }, { new: true, upsert: true, runValidators: true }); res.json({ data: { preferences: profile.preferences } }); };
