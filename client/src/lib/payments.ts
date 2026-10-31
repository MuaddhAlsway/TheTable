import { apiRequest } from './api';
// Stripe-hosted Checkout needs no browser secret or card handling in this app.
export const stripePublishableKeyConfigured = /^pk_(test|live)_/.test((import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() || '');
export async function openStripeCheckout(orderId: string, token: string | null) {
  const response = await apiRequest<{ url: string }>(`/orders/${encodeURIComponent(orderId)}/payment-session`, { method: 'POST', token, body: {} });
  const url = new URL(response.data.url);
  if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('The payment service returned an invalid checkout address.');
  window.location.assign(url.href);
}
