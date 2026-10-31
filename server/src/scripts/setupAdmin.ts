import '../config/database.js';
import mongoose from 'mongoose';
import { clerk } from '../config/clerk.js';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { UserProfile } from '../modules/users/user.model.js';
import { syncClerkUser } from '../modules/users/user.service.js';

// Explicit offline bootstrap only. No public endpoint or configurable recipient.
const targetEmail = 'muaddhalsway@gmail.com';
async function setup() {
  if (!process.argv.includes('--confirm-admin')) throw new Error('CONFIRMATION_REQUIRED');
  if (env.MONGODB_DB_NAME !== 'thetable') throw new Error('DATABASE_REQUIRED');
  const matches = await clerk.users.getUserList({ emailAddress: [targetEmail], limit: 10 });
  if (matches.totalCount !== 1 || matches.data.length !== 1) throw new Error('ACCOUNT_NOT_UNIQUE');
  const user = matches.data[0];
  const email = user.emailAddresses.find(entry => entry.id === user.primaryEmailAddressId);
  if (email?.emailAddress.toLowerCase() !== targetEmail || email.verification?.status !== 'verified') throw new Error('VERIFIED_PRIMARY_REQUIRED');
  await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role: 'admin' } });
  const verified = await clerk.users.getUser(user.id);
  if (verified.publicMetadata.role !== 'admin') throw new Error('ROLE_VERIFICATION_FAILED');
  await connectDatabase();
  await UserProfile.createCollection();
  await UserProfile.createIndexes();
  const profile = await syncClerkUser(verified);
  if (profile?.role !== 'admin' || profile.email !== targetEmail || !profile.emailVerified) throw new Error('PROFILE_VERIFICATION_FAILED');
  console.log('Verified target Clerk account has admin metadata. Its verified admin profile is saved in thetable.userprofiles.');
}
setup().catch(error => {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    CONFIRMATION_REQUIRED: 'Pass --confirm-admin to explicitly assign the fixed project administrator.',
    DATABASE_REQUIRED: 'Select thetable explicitly before running admin setup.',
    ACCOUNT_NOT_UNIQUE: 'Exactly one matching Clerk account must exist. No account was created.',
    VERIFIED_PRIMARY_REQUIRED: 'The fixed target must be the verified primary Clerk email before granting admin.',
    ROLE_VERIFICATION_FAILED: 'The admin role could not be confirmed in Clerk. Review the trusted Dashboard.',
    PROFILE_VERIFICATION_FAILED: 'Clerk admin metadata was assigned, but its MongoDB profile still needs review.',
  };
  console.error(messages[code] || 'Admin setup could not complete. Check Clerk and database connectivity; secret details withheld. The Clerk assignment may have completed before a database error.');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
