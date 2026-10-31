import { createClerkClient } from '@clerk/express';
import { env } from './env.js';
export const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
