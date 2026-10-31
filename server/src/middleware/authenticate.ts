import type { RequestHandler, Request } from 'express';
import { getAuth } from '@clerk/express';
import { AppError } from '../utils/errors.js';
import { serverPublishableKey } from '../config/env.js';
import { clerk } from '../config/clerk.js';
import { verifiedRole } from '../utils/roles.js';
import { syncClerkUser } from '../modules/users/user.service.js';
export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    if (!serverPublishableKey) throw new AppError(503, 'AUTH_SETUP_REQUIRED', 'Server authentication requires CLERK_PUBLISHABLE_KEY.');
    const auth = getAuth(req);
    if (!auth.userId || !auth.sessionId) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    const user = await clerk.users.getUser(auth.userId);
    res.locals.actor = { userId: user.id, role: verifiedRole(user.publicMetadata.role) };
    res.locals.clerkUser = user;
    try { res.locals.userProfile = await syncClerkUser(user); }
    catch { throw new AppError(503, 'PROFILE_SYNC_UNAVAILABLE', 'Unable to save your account profile. Please try again.'); }
    next();
  } catch (error) { next(error instanceof AppError ? error : new AppError(503, 'AUTH_UNAVAILABLE', 'Unable to verify your account. Please try again.')); }
};
export const userId = (req: Request) => { const id = getAuth(req).userId; if (!id) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.'); return id; };
