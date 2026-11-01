import { Router } from 'express';
import { z } from 'zod';
import { SmsControl, SmsJob, SmsPreference } from './sms.model.js';
import { smsConfigured, smsReady, smsGateway, GatewayError } from './sms.gateway.js';
import { input, validateRequest as validate } from '../../middleware/validateRequest.js';
import { actor } from '../../utils/roles.js';
import { phone, pagination } from '../../utils/validation.js';
import { creationLimit, staffMutationLimit } from '../../middleware/rateLimits.js';
import { AppError } from '../../utils/errors.js';
import { env } from '../../config/env.js';
async function control() { await SmsControl.updateOne({ _id: 'sms' }, { $setOnInsert: { enabled: false, nextSendAt: new Date(0), createdAt: new Date(), updatedAt: new Date() } }, { upsert: true, timestamps: false }); return (await SmsControl.findById('sms'))!; }
export const publicSmsRoutes = Router();
publicSmsRoutes.get('/config', async (_req, res) => res.json({ data: { available: smsReady() && !!(await SmsControl.findById('sms'))?.enabled } }));
export const customerSmsRoutes = Router();
customerSmsRoutes.get('/preference', async (_req, res) => res.json({ data: { blocked: !!(await SmsPreference.findById(actor(res).userId))?.blocked } }));
customerSmsRoutes.put('/preference', creationLimit, validate(z.object({ blocked: z.boolean() }).strict()), async (_req, res) => { const data = input<{ blocked: boolean }>(res); await SmsPreference.updateOne({ _id: actor(res).userId }, { $set: data }, { upsert: true }); res.json({ data }); });
export const adminSmsRoutes = Router();
adminSmsRoutes.get('/', async (_req, res) => { const record = await control(); res.json({ data: { provider: env.SMS_PROVIDER, revision: record.revision, enabled: record.enabled, configured: smsConfigured(), environmentEnabled: env.SMS_ENABLED === 'true', updatedAt: record.updatedAt, dailyLimit: env.SMS_DAILY_LIMIT, used: record.used, activatedAt: record.activatedAt, requiredVariables: env.SMS_PROVIDER === 'infobip' ? ['SMS_PROVIDER=infobip', 'SMS_ENABLED', 'INFOBIP_BASE_URL', 'API_KEY (or INFOBIP_API_KEY)', 'INFOBIP_SENDER'] : ['SMS_PROVIDER=android', 'SMS_ENABLED', 'SMS_GATEWAY_DEVICE_ID', 'SMS_GATEWAY_TOKEN (or SMS_GATEWAY_USERNAME and SMS_GATEWAY_PASSWORD)'] } }); });
adminSmsRoutes.put('/', staffMutationLimit, validate(z.object({ enabled: z.boolean(), revision: z.number().int().min(0) }).strict()), async (_req, res) => {
  const data = input<{ enabled: boolean; revision: number }>(res);
  if (data.enabled && !smsReady()) throw new AppError(503, 'SMS_SETUP_REQUIRED', 'Configure the selected SMS provider and SMS_ENABLED on the backend first.');
  const current = await control();
  const record = await SmsControl.findOneAndUpdate({ _id: 'sms', revision: data.revision }, { $set: { enabled: data.enabled, ...(!current.enabled && data.enabled ? { activatedAt: new Date() } : {}), updatedBy: actor(res).userId }, $inc: { revision: 1 } }, { returnDocument: 'after' });
  if (!record) throw new AppError(409, 'STALE_SETTINGS', 'SMS settings changed. Refresh first.');
  res.json({ data: { enabled: record.enabled, updatedAt: record.updatedAt } });
});
adminSmsRoutes.post('/check', staffMutationLimit, validate(z.object({}).strict()), async (_req, res) => { try { res.json({ data: await smsGateway.check() }); } catch (error) { throw new AppError(503, 'SMS_GATEWAY_UNAVAILABLE', error instanceof GatewayError ? (error.code === 'INFOBIP_HTTP_403' ? 'Infobip denied access to SMS logs (403). In Infobip Developer Tools > API Keys, grant sms:logs:read for this connection check and delivery tracking, and sms:message:send for sending. Also check account permissions and key IP restrictions. If you replace the key, update API_KEY on the connected backend and restart it. No SMS was sent by this check.' : error.code) : 'The gateway check did not complete.'); } });
adminSmsRoutes.get('/jobs', validate(z.object({ ...pagination }).strict(), 'query'), async (_req, res) => { const query = input<{ page: number; limit: number }>(res, 'query'); const [jobs, total] = await Promise.all([SmsJob.find().select('+recipient').sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit), SmsJob.countDocuments()]); res.json({ data: jobs.map(job => ({ _id: job.id, reference: job.reference, sourceType: job.sourceType, recipient: '••••' + job.recipient.slice(-4), state: job.state, gatewayState: job.gatewayState, attempts: job.attempts, lastCode: job.lastCode, createdAt: job.createdAt })), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } }); });
adminSmsRoutes.post('/test', creationLimit, validate(z.object({ phone, requestId: z.string().uuid(), confirmed: z.literal(true) }).strict()), async (_req, res) => {
  if (!smsReady() || !(await control()).enabled) throw new AppError(503, 'SMS_DISABLED', 'Enable the configured gateway before queuing a real test SMS.');
  const data = input<{ phone: string; requestId: string }>(res);
  const key = 'test:' + actor(res).userId + ':' + data.requestId;
  const prior = await SmsJob.findOne({ key }).select('+recipient');
  if (prior && prior.recipient !== data.phone) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Use a new request for a different phone.');
  await SmsJob.updateOne({ key }, { $setOnInsert: { key, provider: env.SMS_PROVIDER, sourceType: 'test', userId: actor(res).userId, reference: 'ADMIN TEST', recipient: data.phone, text: 'The Table: SMS service test. This message was requested by the restaurant administrator.', expiresAt: new Date(Date.now() + 15 * 60000) } }, { upsert: true });
  const saved = await SmsJob.findOne({ key }).select('+recipient');
  if (saved?.recipient !== data.phone) throw new AppError(409, 'IDEMPOTENCY_CONFLICT', 'Use a new request for a different phone.');
  res.status(202).json({ data: { queued: true }, message: 'Test queued, not yet delivered. Provider charges or trial limits apply.' });
});
