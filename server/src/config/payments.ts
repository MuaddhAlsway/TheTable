import { env } from './env.js';
export function paymentReadiness() {
  const secretKeyConfigured = !!env.STRIPE_SECRET_KEY?.trim();
  const webhookSecretConfigured = !!env.STRIPE_WEBHOOK_SECRET?.trim();
  const ready = secretKeyConfigured && webhookSecretConfigured;
  return { integrationImplemented: true, secretKeyConfigured, webhookSecretConfigured, ready, reason: ready ? '' : !secretKeyConfigured ? 'Stripe server credentials are missing. Checkout is unavailable.' : 'Stripe webhook signing secret is missing. The administrator must finish payment setup before orders can be saved.' };
}
