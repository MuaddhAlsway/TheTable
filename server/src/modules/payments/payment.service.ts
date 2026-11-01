import { DiningTable } from '../tables/table.model.js';
import type Stripe from 'stripe';
import { Order } from '../orders/order.model.js';
import { orderDetail } from '../orders/order.service.js';
import { stripeClient } from '../../config/stripe.js';
import { paymentReadiness } from '../../config/payments.js';
import { clientOrigins, env } from '../../config/env.js';
import { getRestaurant } from '../fulfillment/fulfillment.service.js';
import { assertCanCreateOrder } from '../../utils/fulfillment.js';
import { AppError } from '../../utils/errors.js';

export async function createPaymentSession(id: string, userId: string, origin: string | undefined) {
  if (!paymentReadiness().ready || env.ORDER_CREATION_ENABLED !== 'true') throw new AppError(503, 'PAYMENT_SETUP_REQUIRED', 'Stripe and online ordering must be configured before payment.');
  if (!origin || !clientOrigins.includes(origin)) throw new AppError(403, 'ORIGIN_FORBIDDEN', 'Open checkout from a configured restaurant website.');
  const order = await orderDetail(id, userId);
  if (order.paymentStatus !== 'unpaid' || order.status !== 'pending_payment') throw new AppError(409, 'ORDER_NOT_PAYABLE', 'This order is no longer awaiting payment. Refresh its status.');
  const restaurant = await getRestaurant();
  assertCanCreateOrder(restaurant, order.fulfillment);
  if (order.fulfillment === 'dine_in' && !await DiningTable.exists({ _id: order.table?.id, enabled: true })) throw new AppError(409, 'TABLE_UNAVAILABLE', 'This table is no longer enabled. Ask restaurant staff before paying.');
  const stripe = stripeClient();
  if (order.paymentProviderReference) {
    const existing = await stripe.checkout.sessions.retrieve(order.paymentProviderReference);
    if (existing.status === 'open' && existing.url) return { url: existing.url };
    throw new AppError(409, 'PAYMENT_SESSION_CLOSED', 'This payment session has closed. Refresh your order status; create a new order if the old session expired.');
  }
  if (Date.now() - order.createdAt.getTime() > 30 * 60000) throw new AppError(409, 'ORDER_EXPIRED', 'This unpaid order has expired. Return to your bag to create a fresh order at current prices.');
  if (order.totalHalalas < 1) throw new AppError(422, 'INVALID_PAYMENT_AMOUNT', 'A positive server-calculated total is required.');
  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map(item => ({ quantity: item.quantity, price_data: { currency: 'sar', unit_amount: item.unitPriceHalalas, product_data: { name: item.name } } }));
  if (order.deliveryFeeHalalas) lines.push({ quantity: 1, price_data: { currency: 'sar', unit_amount: order.deliveryFeeHalalas, product_data: { name: 'Delivery fee' } } });
  if (order.taxHalalas) lines.push({ quantity: 1, price_data: { currency: 'sar', unit_amount: order.taxHalalas, product_data: { name: 'Tax' } } });
  if (order.items.reduce((sum, item) => sum + item.unitPriceHalalas * item.quantity, 0) + order.deliveryFeeHalalas + order.taxHalalas !== order.totalHalalas) throw new AppError(409, 'TOTAL_MISMATCH', 'The saved order total needs restaurant review.');
  const session = await stripe.checkout.sessions.create({ mode: 'payment', allowed_payment_method_types: ['card'], line_items: lines, customer_email: order.customer?.email, client_reference_id: order.id, metadata: { application: 'thetable', orderId: order.id, clerkUserId: userId }, success_url: `${origin}/account/orders/${order.id}?payment=returned`, cancel_url: `${origin}/account/orders/${order.id}?payment=cancelled`, expires_at: Math.floor(order.createdAt.getTime() / 1000) + 3600 }, { idempotencyKey: `thetable:checkout:${order.id}` });
  const saved = await Order.findOneAndUpdate({ _id: order.id, userId, status: 'pending_payment', paymentStatus: 'unpaid', paymentProviderReference: null }, { $set: { paymentProvider: 'stripe', paymentProviderReference: session.id } }, { returnDocument: 'after' });
  if (!saved) {
    const latest = await orderDetail(id, userId);
    if (latest.paymentProviderReference !== session.id || latest.status !== 'pending_payment' || latest.paymentStatus !== 'unpaid') { try { await stripe.checkout.sessions.expire(session.id); } catch { /* No client URL is released for an invalid order. */ } throw new AppError(409, 'ORDER_CHANGED', 'The order changed before payment. Refresh its status.'); }
  }
  if (!session.url) throw new AppError(503, 'PAYMENT_UNAVAILABLE', 'Stripe did not provide a checkout URL.');
  return { url: session.url };
}
