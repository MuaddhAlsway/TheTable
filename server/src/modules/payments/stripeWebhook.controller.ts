import type { RequestHandler } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { trusted } from 'mongoose';
import type Stripe from 'stripe';
import { stripeClient } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { WebhookReceipt } from '../webhooks/webhookReceipt.model.js';
import { Order } from '../orders/order.model.js';

async function applyPayment(session: Stripe.Checkout.Session, event: Stripe.Event) {
  if (session.metadata?.application !== 'thetable') return;
  const id = session.metadata.orderId;
  if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) throw new AppError(422, 'PAYMENT_ORDER_MISMATCH', 'Payment order reference is invalid.');
  const order = await Order.findById(id);
  if (!order || order.paymentProvider !== 'stripe' || order.paymentProviderReference !== session.id || session.client_reference_id !== order.id || session.metadata.clerkUserId !== order.userId || session.mode !== 'payment') throw new AppError(409, 'PAYMENT_ORDER_MISMATCH', 'Payment session does not match a saved order.');
  if (session.currency !== 'sar' || session.amount_total !== order.totalHalalas) throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Payment amount/currency requires review.');
  const paid = event.type === 'checkout.session.completed' && session.payment_status === 'paid';
  const expired = event.type === 'checkout.session.expired';
  if (!paid && !expired) return;
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') return;
  const pending = order.status === 'pending_payment';
  const status = paid && pending ? 'pending_confirmation' : order.status;
  const now = new Date();
  const result = await Order.updateOne({ _id: id, paymentProviderReference: session.id, paymentStatus: order.paymentStatus, status: order.status, updatedAt: order.updatedAt }, { $set: { paymentStatus: paid ? 'paid' : 'failed', ...(paid && pending ? { status } : {}) }, $push: { statusHistory: { status, previousStatus: order.status, newStatus: status, changedAt: now, changedBy: 'stripe:webhook', actorRole: 'system', reason: paid ? 'Payment verified by signed Stripe webhook. Restaurant acceptance is still required.' : 'Stripe checkout session expired. No payment was recorded.', action: paid ? 'verified_payment' : 'payment_session_expired', actionId: `stripe:${event.id}` } } });
  if (!result.modifiedCount) throw new AppError(503, 'PAYMENT_RETRY_REQUIRED', 'The order changed while processing payment. Retry this event.');
}
export const stripeWebhook: RequestHandler = async (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET?.trim() || !env.STRIPE_SECRET_KEY?.trim()) throw new AppError(503, 'PAYMENT_SETUP_REQUIRED', 'Stripe webhook configuration is incomplete.');
  const signature = req.header('stripe-signature');
  if (!signature || !Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_SIGNATURE', 'A signed raw Stripe payload is required.');
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET.trim()); }
  catch { throw new AppError(400, 'INVALID_SIGNATURE', 'Stripe signature verification failed.'); }
  if (!['checkout.session.completed', 'checkout.session.expired'].includes(event.type)) { res.json({ data: { received: true } }); return; }
  const key = `stripe:${event.id}`, hash = createHash('sha256').update(req.body).digest('hex'), token = randomUUID(), now = new Date();
  try { await WebhookReceipt.create({ _id: key, payloadHash: hash, state: 'processing', leaseToken: token, leaseUntil: new Date(now.getTime() + 60000) }); }
  catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await WebhookReceipt.findById(key);
    if (!existing || existing.payloadHash !== hash) throw new AppError(409, 'PAYMENT_EVENT_CONFLICT', 'This event identifier conflicts with a prior delivery.');
    if (existing.state === 'completed') { res.json({ data: { received: true, duplicate: true } }); return; }
    const acquired = await WebhookReceipt.findOneAndUpdate({ _id: key, state: 'processing', leaseUntil: trusted({ $lte: now }) }, { $set: { leaseToken: token, leaseUntil: new Date(now.getTime() + 60000) } });
    if (!acquired) throw new AppError(503, 'PAYMENT_EVENT_IN_PROGRESS', 'This payment event is already being processed. Retry later.');
  }
  try {
    await applyPayment(event.data.object as Stripe.Checkout.Session, event);
    const completed = await WebhookReceipt.updateOne({ _id: key, leaseToken: token, state: 'processing' }, { $set: { state: 'completed', completedAt: new Date() } });
    if (!completed.modifiedCount) throw new AppError(503, 'PAYMENT_RETRY_REQUIRED', 'Payment receipt completion needs a retry.');
    res.json({ data: { received: true } });
  } catch (error) { await WebhookReceipt.updateOne({ _id: key, leaseToken: token, state: 'processing' }, { $set: { leaseUntil: new Date(0) } }); throw error; }
};
