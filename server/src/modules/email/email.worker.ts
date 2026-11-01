import { randomUUID } from 'node:crypto';
import { trusted } from 'mongoose';
import { EmailControl, EmailJob, EmailPreference } from './email.model.js';
import { emailReady, recipientAllowed, emailPayload, emailProvider, EmailError } from './email.provider.js';
import { Order } from '../orders/order.model.js';
import { Reservation } from '../reservations/reservation.model.js';
import { UserProfile } from '../users/user.model.js';
import { env } from '../../config/env.js';
const orderMessages: Record<string, string> = { pending_confirmation: 'Payment is recorded. The restaurant has not yet accepted your order.', confirmed: 'The restaurant accepted your order.', preparing: 'The kitchen has started preparing your order.', ready_for_pickup: 'Your order is ready for pickup.', ready_for_table: 'Your dishes are ready for staff to serve.', out_for_delivery: 'Your order is out for delivery. Open your order to contact the driver and view your delivery code.', completed: 'The restaurant recorded your order as completed.', cancelled: 'Your order was cancelled. Open your account for details.', rejected: 'Your order was declined. Open your account for details.' };
const reservationMessages: Record<string, string> = { confirmed: 'Your reservation is confirmed.', cancelled: 'Your reservation was cancelled.' };
export async function enqueueEmailEvents() {
  if (!emailReady()) return;
  const control = await EmailControl.findById('email'); if (!control?.enabled || !control.activatedAt) return;
  const since = new Date(Math.max(control.activatedAt.getTime(), Date.now() - 15 * 60000));
  for (const kind of ['order', 'reservation'] as const) {
    const filter = { updatedAt: trusted({ $gte: since }) };
    const records = kind === 'order' ? Order.find({ ...filter, paymentStatus: 'paid' }).cursor() : Reservation.find(filter).cursor();
    for await (const record of records) {
      const message = (kind === 'order' ? orderMessages : reservationMessages)[record.status]; if (!message) continue;
      const event = Array.from(record.statusHistory as Iterable<{ status?: string | null; changedAt?: Date | null; action?: string | null }>).reverse().find(entry => entry.status === record.status && (kind === 'reservation' || !entry.action || ['verified_payment', 'accept', 'start_preparation', 'mark_ready', 'dispatch_delivery', 'cancel', 'reject', 'complete_delivery', 'complete_pickup', 'complete_dine_in'].includes(entry.action)));
      if (!event?.changedAt || event.changedAt < since) continue;
      const pref = await EmailPreference.findById(record.userId); if (!pref?.enabled || !pref.activatedAt || event.changedAt < pref.activatedAt) continue;
      // Use the verified account address, never a recipient supplied in an order or by a driver.
      const profile = await UserProfile.findOne({ clerkId: record.userId, emailVerified: true }); if (!profile?.email || !recipientAllowed(profile.email)) continue;
      const source = record.toObject() as { orderNumber?: string; reservationNumber?: string };
      const reference = source.orderNumber || source.reservationNumber || 'Reservation';
      const key = kind + ':' + record.id + ':' + record.status + ':' + event.changedAt.getTime();
      try { await EmailJob.updateOne({ key }, { $setOnInsert: { key, provider: env.EMAIL_PROVIDER, userId: record.userId, sourceType: kind, sourceId: record._id, expectedStatus: record.status, reference, recipient: profile.email.toLowerCase(), payload: emailPayload(profile.email.toLowerCase(), reference, message, '/account/' + (kind === 'order' ? 'orders/' : 'reservations/') + record.id), expiresAt: new Date(Date.now() + 6 * 3600000) } }, { upsert: true }); } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    }
  }
  await enqueueDeliveryEmailEvents(since);
}
async function enqueueDeliveryEmailEvents(since: Date) {
  const records = Order.find({ fulfillment: 'delivery', status: 'out_for_delivery', paymentStatus: 'paid', updatedAt: trusted({ $gte: since }) }).cursor();
  for await (const order of records) {
    const assignment = order.deliveryAssignment;
    if (!assignment?.driverId || !assignment.dispatchedAt) continue;
    const events = [
      { userId: assignment.driverId, kind: 'assigned', at: assignment.dispatchedAt, type: 'driver_assignment', path: '/driver', message: 'A delivery has been assigned to you. Open your driver dashboard to review and acknowledge it.' },
      { userId: order.userId, kind: 'collected', at: order.deliveryProgress?.collectedAt, type: 'order_progress', path: '/account/orders/' + order.id, message: 'Your driver has recorded collecting your food from the restaurant. Open your order to contact the driver.' },
      { userId: order.userId, kind: 'arrived', at: order.deliveryProgress?.arrivedAt, type: 'order_progress', path: '/account/orders/' + order.id, message: 'Your driver has recorded arrival at your address. Receive your food before sharing the delivery code shown in your order.' },
    ];
    for (const event of events) {
      if (!event.at || event.at < since) continue;
      if (event.kind === 'assigned' && order.deliveryProgress?.acknowledgedAt) continue;
      const pref = await EmailPreference.findById(event.userId);
      if (!pref?.enabled || !pref.activatedAt || event.at < pref.activatedAt) continue;
      const profile = await UserProfile.findOne({ clerkId: event.userId, emailVerified: true });
      if (!profile?.email || !recipientAllowed(profile.email) || (event.type === 'driver_assignment' && profile.role !== 'driver')) continue;
      const key = event.type + ':' + order.id + ':' + event.kind + ':' + assignment.dispatchedAt.getTime() + ':' + event.at.getTime();
      try { await EmailJob.updateOne({ key }, { $setOnInsert: { key, provider: env.EMAIL_PROVIDER, userId: event.userId, sourceType: event.type, sourceId: order._id, expectedStatus: 'out_for_delivery', assignmentAt: assignment.dispatchedAt, eventKind: event.kind, reference: order.orderNumber, recipient: profile.email.toLowerCase(), payload: emailPayload(profile.email.toLowerCase(), order.orderNumber, event.message, event.path), expiresAt: new Date(Date.now() + 15 * 60000) } }, { upsert: true }); } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    }
  }
}
export async function processEmailJobs() {
  if (!emailReady() || !(await EmailControl.findById('email'))?.enabled) return;
  const now = new Date();
  const job = await EmailJob.findOneAndUpdate({ $or: [{ state: 'pending', nextAttemptAt: trusted({ $lte: now }) }, { state: 'sending', leaseUntil: trusted({ $lt: now }) }] }, { $set: { state: 'sending', leaseUntil: new Date(Date.now() + 60000), leaseToken: randomUUID() } }, { sort: { createdAt: 1 }, returnDocument: 'after' }).select('+recipient +payload'); if (!job) return;
  const finish = async (data: Record<string, unknown>) => { await EmailJob.updateOne({ _id: job._id, leaseToken: job.leaseToken }, { $set: data, $unset: { leaseToken: 1, leaseUntil: 1 } }); };
  try {
    if (job.provider !== env.EMAIL_PROVIDER) { await finish({ state: job.attempts ? 'unknown' : 'skipped', lastCode: 'PROVIDER_CHANGED_NO_RESEND' }); return; }
    // SMTP has no provider deduplication: a previous submission with a lost reply must never be automatically resent.
    if (job.provider === 'gmail' && job.attempts > 0) { await finish({ state: 'unknown', lastCode: 'GMAIL_AMBIGUOUS_SEND_NO_RESEND' }); return; }
    // Retry the same immutable payload and key within Resend's 24-hour deduplication window only.
    if (job.expiresAt <= now || job.attempts >= 5) { await finish({ state: job.attempts ? 'unknown' : 'skipped', lastCode: 'EXPIRED_NO_RESEND' }); return; }
    const profile = await UserProfile.findOne({ clerkId: job.userId, emailVerified: true });
    if (!profile?.email || profile.email.toLowerCase() !== job.recipient || !recipientAllowed(job.recipient)) { await finish({ state: 'skipped', lastCode: 'RECIPIENT_UNAVAILABLE_OR_DEMO_RESTRICTED' }); return; }
    if (job.sourceType !== 'test') {
      const pref = await EmailPreference.findById(job.userId);
      const source = job.sourceType === 'reservation' ? await Reservation.findById(job.sourceId) : await Order.findById(job.sourceId);
      if (!pref?.enabled || !source || (job.sourceType !== 'driver_assignment' && source.userId !== job.userId) || source.status !== job.expectedStatus || (job.sourceType !== 'reservation' && 'paymentStatus' in source && source.paymentStatus !== 'paid')) { await finish({ state: 'skipped', lastCode: 'PREFERENCE_OR_STATUS_CHANGED' }); return; }
    }
    if (job.sourceType === 'driver_assignment' || job.sourceType === 'order_progress') {
      const order = await Order.findById(job.sourceId);
      const sameAssignment = order?.deliveryAssignment?.dispatchedAt?.getTime() === job.assignmentAt?.getTime();
      const invalidDriver = job.sourceType === 'driver_assignment' && (profile.role !== 'driver' || order?.deliveryAssignment?.driverId !== job.userId || !!order?.deliveryProgress?.acknowledgedAt);
      const invalidProgress = job.sourceType === 'order_progress' && (job.eventKind === 'arrived' ? !order?.deliveryProgress?.arrivedAt : !order?.deliveryProgress?.collectedAt || !!order?.deliveryProgress?.arrivedAt);
      if (!sameAssignment || invalidDriver || invalidProgress) { await finish({ state: 'skipped', lastCode: 'DELIVERY_ASSIGNMENT_OR_PROGRESS_CHANGED' }); return; }
    }
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(now);
    await EmailControl.updateOne({ _id: 'email', enabled: true, day: trusted({ $ne: day }) }, { $set: { day, used: 0 } });
    const slot = await EmailControl.findOneAndUpdate({ _id: 'email', enabled: true, day, used: trusted({ $lt: env.EMAIL_DAILY_LIMIT }), nextSendAt: trusted({ $lte: now }) }, { $inc: { used: 1 }, $set: { nextSendAt: new Date(Date.now() + 15000) } });
    if (!slot) { await finish({ state: 'pending', nextAttemptAt: new Date(Date.now() + 60000), lastCode: 'RATE_OR_DAILY_LIMIT' }); return; }
    await EmailJob.updateOne({ _id: job._id, leaseToken: job.leaseToken }, { $inc: { attempts: 1 } });
    const providerId = await emailProvider.send('thetable-email/' + job.id, job.payload);
    await finish({ state: 'accepted', providerId, lastCode: 'PROVIDER_ACCEPTED_NOT_DELIVERY_CONFIRMATION' });
  } catch (error) { await finish({ state: error instanceof EmailError && ['GMAIL_RESPONSE_UNKNOWN', 'GMAIL_CONNECTION_BLOCKED_OR_UNAVAILABLE'].includes(error.code) ? 'unknown' : error instanceof EmailError && !error.retryable ? 'failed' : job.attempts >= 4 ? 'unknown' : 'pending', lastCode: error instanceof EmailError ? error.code : 'EMAIL_RESPONSE_UNKNOWN', nextAttemptAt: new Date(Date.now() + 60000 * 2 ** job.attempts) }); }
}
export function startEmailWorker() { let running = false; const tick = async () => { if (running || !emailReady()) return; running = true; try { await enqueueEmailEvents(); await processEmailJobs(); } catch { console.warn('Email worker cycle failed; details withheld.'); } finally { running = false; } }; const timer = setInterval(() => void tick(), 15000); timer.unref(); void tick(); return () => clearInterval(timer); }
