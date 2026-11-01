import { randomUUID } from 'node:crypto';
import { trusted } from 'mongoose';
import { SmsJob, SmsControl, SmsPreference } from './sms.model.js';
import { smsGateway, smsReady, GatewayError } from './sms.gateway.js';
import { Order } from '../orders/order.model.js';
import { Reservation } from '../reservations/reservation.model.js';
import { env } from '../../config/env.js';
const orderMessages: Record<string, string> = { confirmed: 'Your order has been accepted.', ready_for_pickup: 'Your order is ready for pickup.', ready_for_table: 'Your dishes are ready. Staff will serve your table.', out_for_delivery: 'Your order is out for delivery.', cancelled: 'Your order was cancelled. Check your account for details.', rejected: 'Your order was declined. Check your account for details.' };
const reservationMessages: Record<string, string> = { confirmed: 'Your reservation is confirmed.', cancelled: 'Your reservation was cancelled.' };
export async function enqueueSmsEvents() {
  if (!smsReady()) return;
  const control = await SmsControl.findById('sms');
  if (!control?.enabled || !control.activatedAt) return;
  const since = new Date(Math.max(control.activatedAt.getTime(), Date.now() - 15 * 60000));
  for (const kind of ['order', 'reservation'] as const) {
    const messages = kind === 'order' ? orderMessages : reservationMessages;
    const filter = { smsConsent: true, updatedAt: trusted({ $gte: since }) };
    const fields = 'userId customer.phone smsConsent status statusHistory orderNumber reservationNumber';
    const records = kind === 'order' ? Order.find({ ...filter, paymentStatus: 'paid', status: trusted({ $in: ['confirmed', 'ready_for_pickup', 'ready_for_table', 'out_for_delivery', 'cancelled', 'rejected'] }) }).select(fields).cursor() : Reservation.find({ ...filter, status: trusted({ $in: ['confirmed', 'cancelled'] }) }).select(fields).cursor();
    for await (const record of records) {
      const history = Array.from(record.statusHistory as Iterable<{ status?: string; changedAt?: Date; action?: string }>);
      const event = history.reverse().find(entry => entry.status === record.status && (kind === 'reservation' || ['accept', 'mark_ready', 'dispatch_delivery', 'cancel', 'reject'].includes(entry.action || '')));
      if (!event?.changedAt || event.status !== record.status || event.changedAt < since || !record.customer?.phone || !/^\+9665\d{8}$/.test(record.customer.phone)) continue;
      const source = record.toObject() as { orderNumber?: string; reservationNumber?: string };
      const reference = source.orderNumber || source.reservationNumber || 'Reservation ' + record.id.slice(-6);
      const key = kind + ':' + record.id + ':' + record.status + ':' + event.changedAt.getTime();
      try { await SmsJob.updateOne({ key }, { $setOnInsert: { key, provider: env.SMS_PROVIDER, sourceType: kind, sourceId: record._id, userId: record.userId, reference, expectedStatus: record.status, eventAt: event.changedAt, recipient: record.customer.phone, text: `The Table: ${reference}. ${messages[record.status]} Check your account.`, expiresAt: new Date(event.changedAt.getTime() + 15 * 60000), state: 'pending' } }, { upsert: true }); }
      catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
    }
  }
}
async function relevant(job: { sourceType: string; userId: string; sourceId?: unknown; recipient: string; expectedStatus?: string | null }) {
  if (!job) return false;
  if (job.sourceType === 'test') return true;
  if ((await SmsPreference.findById(job.userId))?.blocked) return false;
  const record = job.sourceType === 'order' ? await Order.findById(job.sourceId) : await Reservation.findById(job.sourceId);
  return !!(record?.smsConsent && record.userId === job.userId && record.customer?.phone === job.recipient && record.status === job.expectedStatus && (job.sourceType !== 'order' || 'paymentStatus' in record && record.paymentStatus === 'paid'));
}
async function slot() {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await SmsControl.updateOne({ _id: 'sms', enabled: true, day: trusted({ $ne: day }) }, { $set: { day, used: 0 } });
  return SmsControl.findOneAndUpdate({ _id: 'sms', enabled: true, day, used: trusted({ $lt: env.SMS_DAILY_LIMIT }), nextSendAt: trusted({ $lte: new Date() }) }, { $inc: { used: 1 }, $set: { nextSendAt: new Date(Date.now() + 20000) } }, { returnDocument: 'after' });
}
const gatewayStates: Record<string, 'gateway_queued' | 'sent' | 'delivered' | 'failed'> = { Pending: 'gateway_queued', Processed: 'gateway_queued', Sent: 'sent', Delivered: 'delivered', Failed: 'failed', Cancelled: 'failed', Cancelling: 'gateway_queued' };
const stateFor = (state: string) => gatewayStates[state] || 'unknown';
export async function processSmsJobs() {
  if (!smsReady() || !(await SmsControl.findById('sms'))?.enabled) return;
  const candidates = await SmsJob.find({ $or: [{ state: 'pending', nextAttemptAt: trusted({ $lte: new Date() }) }, { state: 'sending', leaseUntil: trusted({ $lt: new Date() }) }] }).sort({ createdAt: 1 }).limit(10);
  for (const candidate of candidates) {
    const token = randomUUID();
    const job = await SmsJob.findOneAndUpdate({ _id: candidate._id, state: candidate.state, updatedAt: candidate.updatedAt, leaseToken: candidate.leaseToken || null }, { $set: { state: 'sending', leaseUntil: new Date(Date.now() + 120000), leaseToken: token } }, { returnDocument: 'after' }).select('+recipient +text');
    if (!job) continue;
    const finish = async (data: Record<string, unknown>) => { await SmsJob.updateOne({ _id: job._id, leaseToken: token }, { $set: data, $unset: { leaseUntil: 1, leaseToken: 1 } }); };
    try {
      if (job.provider !== env.SMS_PROVIDER) { await finish({ state: job.attempts ? 'unknown' : 'skipped', lastCode: 'PROVIDER_CHANGED_NO_RESEND' }); continue; }
      // Reconcile the same gateway ID before retrying; never create a second ID after an uncertain send.
      if (job.attempts > 0) { try { const existing = await smsGateway.get(job.id); await finish({ state: stateFor(existing.state), gatewayState: existing.state, lastCheckedAt: new Date(), lastCode: 'GATEWAY_RECONCILED' }); continue; } catch (error) { if (!(error instanceof GatewayError && error.code === 'GATEWAY_HTTP_404')) throw error; } }
      if (job.expiresAt <= new Date() || !await relevant(job)) { await finish({ state: 'skipped', lastCode: 'EXPIRED_OR_NO_LONGER_RELEVANT' }); continue; }
      if (job.attempts >= 5) { await finish({ state: 'unknown', lastCode: 'REVIEW_REQUIRED_NO_RESEND' }); continue; }
      if (!await slot()) { await finish({ state: 'pending', nextAttemptAt: new Date(Date.now() + 30000), lastCode: 'RATE_OR_DAILY_LIMIT' }); continue; }
      const sending = await SmsJob.updateOne({ _id: job._id, leaseToken: token }, { $inc: { attempts: 1 } }); if (!sending.modifiedCount) continue;
      const response = await smsGateway.send(job.id, job.recipient, job.text, Math.max(5, Math.floor((job.expiresAt.getTime() - Date.now()) / 1000)));
      await finish({ state: stateFor(response.state), gatewayState: response.state, lastCheckedAt: new Date(), lastCode: 'GATEWAY_ACCEPTED' });
    } catch (error) { const known = error instanceof GatewayError; await finish({ state: known && !error.retryable ? 'failed' : job.attempts >= 4 || job.expiresAt <= new Date() ? 'unknown' : 'pending', nextAttemptAt: new Date(Date.now() + Math.min(900000, 30000 * 2 ** job.attempts)), lastCode: known ? error.code : 'SMS_RESPONSE_UNKNOWN' }); }
  }
  // Authenticated status polling distinguishes acceptance, sent and delivered. No unauthenticated callback can claim delivery.
  const pending = await SmsJob.find({ state: trusted({ $in: ['gateway_queued', 'sent'] }), lastCheckedAt: trusted({ $lt: new Date(Date.now() - 60000) }) }).limit(20);
  for (const job of pending) {
    if (job.provider !== env.SMS_PROVIDER) { await SmsJob.updateOne({ _id: job._id, state: job.state }, { $set: { state: 'unknown', lastCode: 'PROVIDER_CHANGED_NO_RESEND' } }); continue; }
    if (Date.now() - job.createdAt.getTime() > 86400000) { await SmsJob.updateOne({ _id: job._id, state: job.state }, { $set: { state: 'unknown', lastCode: 'DELIVERY_NOT_CONFIRMED' } }); continue; }
    try { const response = await smsGateway.get(job.id); await SmsJob.updateOne({ _id: job._id, state: job.state }, { $set: { state: stateFor(response.state), gatewayState: response.state, lastCheckedAt: new Date(), lastCode: 'GATEWAY_STATUS_CHECKED' } }); }
    catch { await SmsJob.updateOne({ _id: job._id, state: job.state }, { $set: { lastCheckedAt: new Date(), lastCode: 'STATUS_CHECK_UNAVAILABLE' } }); }
  }
}
export function startSmsWorker(keepAlive = false) {
  let running = false;
  const tick = async () => { if (running || !smsReady()) return; running = true; try { await enqueueSmsEvents(); await processSmsJobs(); } catch { console.warn('SMS worker could not complete a cycle; details withheld.'); } finally { running = false; } };
  const timer = setInterval(() => void tick(), 15000); if (!keepAlive) timer.unref(); void tick();
  return () => clearInterval(timer);
}
