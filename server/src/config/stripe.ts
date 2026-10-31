import Stripe from 'stripe';
import { env } from './env.js';
import { AppError } from '../utils/errors.js';
export function stripeClient() {
  if (!env.STRIPE_SECRET_KEY?.trim()) throw new AppError(503, 'PAYMENT_SETUP_REQUIRED', 'The server Stripe key is missing.');
  return new Stripe(env.STRIPE_SECRET_KEY.trim(), { timeout: 15000, maxNetworkRetries: 2 });
}
