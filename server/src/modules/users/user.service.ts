import type { clerk } from '../../config/clerk.js';
import { UserProfile } from './user.model.js';
import { verifiedRole } from '../../utils/roles.js';

type ClerkUser = Awaited<ReturnType<typeof clerk.users.getUser>>;
/** Only call with a user fetched through the trusted Clerk Backend API. */
export async function syncClerkUser(user: ClerkUser) {
  const email = user.emailAddresses.find(entry => entry.id === user.primaryEmailAddressId);
  const snapshot = {
    name: [user.firstName, user.lastName].filter(Boolean).join(' '),
    email: email?.emailAddress.toLowerCase() || '',
    emailVerified: email?.verification?.status === 'verified',
    role: verifiedRole(user.publicMetadata.role),
    clerkUpdatedAt: new Date(user.updatedAt),
    lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt) : null,
  };
  const existing = await UserProfile.findOne({ clerkId: user.id });
  if (existing && existing.clerkUpdatedAt?.getTime() === snapshot.clerkUpdatedAt.getTime() && existing.name === snapshot.name && existing.email === snapshot.email && existing.emailVerified === snapshot.emailVerified && existing.role === snapshot.role && (existing.lastSignInAt?.getTime() || null) === (snapshot.lastSignInAt?.getTime() || null)) return existing;
  try {
    return await UserProfile.findOneAndUpdate({ clerkId: user.id }, { $set: snapshot }, { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true });
  } catch (error) {
    // A concurrent first authenticated request may already have inserted this user.
    if ((error as { code?: number }).code !== 11000) throw error;
    return UserProfile.findOneAndUpdate({ clerkId: user.id }, { $set: snapshot }, { returnDocument: 'after', runValidators: true });
  }
}
