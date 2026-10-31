import type { RequestHandler } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { trusted } from 'mongoose';
import { Webhook } from 'svix';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { UserProfile } from '../users/user.model.js';
import { WebhookReceipt } from './webhookReceipt.model.js';
export const clerkWebhook: RequestHandler = async (req, res) => {
  if (!env.CLERK_WEBHOOK_SECRET) throw new AppError(503, 'WEBHOOK_SETUP_REQUIRED', 'Webhook verification is not configured.');
  const id = req.header('svix-id'), timestamp = req.header('svix-timestamp'), signature = req.header('svix-signature');
  if (!id || id.length > 200 || !timestamp || !signature || !Buffer.isBuffer(req.body)) throw new AppError(400, 'INVALID_WEBHOOK', 'Invalid webhook request.');
  let verified: unknown;
  try { verified = new Webhook(env.CLERK_WEBHOOK_SECRET).verify(req.body.toString('utf8'), { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': signature }); }
  catch { throw new AppError(400, 'INVALID_SIGNATURE', 'Webhook signature verification failed.'); }
  const event = z.object({ type: z.string(), data: z.object({ id: z.string().max(200).optional() }).passthrough() }).passthrough().parse(verified);
  const key = `clerk:${id}`; const payloadHash = createHash('sha256').update(req.body).digest('hex');
  const token = randomUUID(); const now = new Date(); const leaseUntil = new Date(now.getTime() + 60000);
  try { await WebhookReceipt.create({ _id: key, payloadHash, state: 'processing', leaseUntil, leaseToken: token }); }
  catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const existing = await WebhookReceipt.findById(key);
    if (!existing || existing.payloadHash !== payloadHash) throw new AppError(409, 'WEBHOOK_EVENT_CONFLICT', 'Webhook event identifier conflicts with a prior delivery.');
    if (existing.state === 'completed') { res.json({ data: { received: true, duplicate: true } }); return; }
    const acquired = await WebhookReceipt.findOneAndUpdate({ _id: key, payloadHash, state: 'processing', leaseUntil: trusted({ $lte: now }) }, { $set: { leaseToken: token, leaseUntil } });
    if (!acquired) throw new AppError(503, 'WEBHOOK_IN_PROGRESS', 'Webhook processing is in progress. Retry later.');
  }
  try {
    // Deletion is itself idempotent; a crash before receipt completion is safe to retry.
    if (event.type === 'user.deleted' && event.data.id) await UserProfile.deleteOne({ clerkId: event.data.id });
    const completed = await WebhookReceipt.updateOne({ _id: key, leaseToken: token, state: 'processing' }, { $set: { state: 'completed', completedAt: new Date() } });
    if (!completed.modifiedCount) throw new AppError(503, 'WEBHOOK_RETRY_REQUIRED', 'Webhook processing needs a retry.');
    res.json({ data: { received: true } });
  } catch (error) { await WebhookReceipt.updateOne({ _id: key, leaseToken: token, state: 'processing' }, { $set: { leaseUntil: new Date(0) } }); throw error; }
};
