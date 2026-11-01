import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose, { trusted } from 'mongoose';
import express from 'express';
import type { Server } from 'node:http';
const databaseName = 'tbl_sms_' + randomUUID().replaceAll('-', '').slice(0,16);
Object.assign(process.env, { NODE_ENV: 'test', MONGODB_DB_NAME: databaseName, SMS_ENABLED: 'true', SMS_PROVIDER: 'android', SMS_GATEWAY_TOKEN: 'fixture-only', SMS_GATEWAY_DEVICE_ID: 'fixtureDevice', SMS_DAILY_LIMIT: '10' });
const { env } = await import('../src/config/env.js');
const { connectDatabase } = await import('../src/config/database.js');
const { SmsJob, SmsControl, SmsPreference } = await import('../src/modules/sms/sms.model.js');
const { smsGateway, GatewayError } = await import('../src/modules/sms/sms.gateway.js');
const { enqueueSmsEvents, processSmsJobs } = await import('../src/modules/sms/sms.worker.js');
const { adminSmsRoutes, customerSmsRoutes, publicSmsRoutes } = await import('../src/modules/sms/sms.routes.js');
const { authorizeRoles } = await import('../src/middleware/authorizeRoles.js');
const { errorHandler } = await import('../src/middleware/errorHandler.js');
const { Reservation } = await import('../src/modules/reservations/reservation.model.js');
const { Order } = await import('../src/modules/orders/order.model.js');
const customer = { name: 'TEST CUSTOMER', email: 'sms@example.invalid', phone: '+966512345678' };
let connected = false, server: Server | undefined;
const realFetch = globalThis.fetch;
try {
  await connectDatabase(); connected = true; assert.equal(mongoose.connection.name, databaseName);
  for (const model of [SmsJob, SmsControl, SmsPreference, Reservation, Order]) { await model.createCollection(); await model.createIndexes(); }
  await SmsControl.create({ _id: 'sms', enabled: true, activatedAt: new Date(Date.now() - 60000), nextSendAt: new Date(0) });
  const messages = new Map<string, { id: string; state: string }>(); let sends = 0; let loseReply = false;
  // Contract test the real adapter against a fake fetch; no provider request can leave this process.
  let posted: any;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    assert.ok(String(url).startsWith('https://api.sms-gate.app/3rdparty/v1/'));
    if (options?.method === 'POST') { posted = JSON.parse(String(options.body)); return new Response(JSON.stringify({ id: posted.id, state: 'Pending' }), { status: 202 }); }
    return new Response(JSON.stringify([{ id: 'fixtureDevice' }]), { status: 200 });
  }) as typeof fetch;
  await smsGateway.check(); await smsGateway.send('fixture-id', customer.phone, 'The Table: TEST', 900);
  assert.equal(posted.deviceId, 'fixtureDevice'); assert.deepEqual(posted.phoneNumbers, [customer.phone]); assert.equal(posted.withDeliveryReport, true); assert.equal(posted.id, 'fixture-id');
  globalThis.fetch = realFetch;
  smsGateway.get = async id => { const message = messages.get(id); if (!message) throw new GatewayError('GATEWAY_HTTP_404'); return message; };
  smsGateway.send = async (id, recipient, text) => { sends++; assert.equal(recipient, customer.phone); assert.ok(text.length <= 160); assert.ok(!text.includes('delivery code')); const message = { id, state: 'Pending' }; messages.set(id, message); if (loseReply) { loseReply = false; throw new GatewayError('GATEWAY_RESPONSE_UNKNOWN'); } return message; };
  smsGateway.check = async () => ({ connected: true });
  const makeReservation = (consent = true, eventAt = new Date()) => Reservation.create({ reservationNumber: 'RSV-' + randomUUID(), userId: 'fixture_customer', requestKey: randomUUID(), requestHash: 'fixture', customer, dateTime: new Date(Date.now() + 3600000), partySize: 2, smsConsent: consent, smsConsentedAt: consent ? new Date() : undefined, status: 'confirmed', statusHistory: [{ status: 'confirmed', changedAt: eventAt, changedBy: 'fixture_cashier' }] });
  const record = await makeReservation(); await makeReservation(false); await makeReservation(true, new Date(Date.now() - 3600000));
  env.SMS_ENABLED = 'false'; await enqueueSmsEvents(); assert.equal(await SmsJob.countDocuments(), 0); env.SMS_ENABLED = 'true';
  await Promise.all([enqueueSmsEvents(), enqueueSmsEvents()]); assert.equal(await SmsJob.countDocuments(), 1);
  await Promise.all([processSmsJobs(), processSmsJobs()]); assert.equal(sends, 1); let job = (await SmsJob.findOne({ sourceId: record._id }))!; assert.equal(job.state, 'gateway_queued');
  messages.get(job.id)!.state = 'Delivered'; await SmsJob.updateOne({ _id: job._id }, { $set: { lastCheckedAt: new Date(0) } }); await processSmsJobs(); assert.equal((await SmsJob.findById(job._id))!.state, 'delivered');
  const freeSlot = () => SmsControl.updateOne({ _id: 'sms' }, { $set: { nextSendAt: new Date(0), used: 0 } });
  const uncertain = await makeReservation(); await enqueueSmsEvents(); await freeSlot(); loseReply = true; await processSmsJobs(); assert.equal(sends, 2); job = (await SmsJob.findOne({ sourceId: uncertain._id }))!; assert.equal(job.state, 'pending');
  await SmsJob.updateOne({ _id: job._id }, { $set: { nextAttemptAt: new Date(0) } }); await processSmsJobs(); assert.equal(sends, 2); assert.equal((await SmsJob.findById(job._id))!.state, 'gateway_queued');
  const blocked = await makeReservation(); await enqueueSmsEvents(); await SmsPreference.create({ _id: 'fixture_customer', blocked: true }); await freeSlot(); await processSmsJobs(); assert.equal(sends, 2); assert.equal((await SmsJob.findOne({ sourceId: blocked._id }))!.state, 'skipped'); await SmsPreference.deleteMany({});
  const expired = await makeReservation(); await enqueueSmsEvents(); await SmsJob.updateOne({ sourceId: expired._id }, { $set: { expiresAt: new Date(0) } }); await processSmsJobs(); assert.equal(sends, 2);
  const stale = await makeReservation(); await enqueueSmsEvents(); await Reservation.updateOne({ _id: stale._id }, { $set: { status: 'cancelled' } }); await processSmsJobs(); assert.equal(sends, 2);
  const limited = await makeReservation(); await enqueueSmsEvents(); await freeSlot(); await SmsControl.updateOne({ _id: 'sms' }, { $set: { used: 10 } }); await processSmsJobs(); assert.equal(sends, 2); assert.equal((await SmsJob.findOne({ sourceId: limited._id }))!.lastCode, 'RATE_OR_DAILY_LIMIT');
  const app = express(); app.use(express.json()); app.use('/sms', publicSmsRoutes);
  const testActor: express.RequestHandler = (req, res, next) => { if (req.header('x-test-role')) res.locals.actor = { userId: 'fixture_' + req.header('x-test-role'), role: req.header('x-test-role') }; next(); };
  app.use('/admin/sms', testActor, authorizeRoles('admin'), adminSmsRoutes); app.use('/preference', testActor, customerSmsRoutes); app.use(errorHandler);
  server = await new Promise<Server>(resolve => { const handle = app.listen(0, '127.0.0.1', () => resolve(handle)); }); const base = 'http://127.0.0.1:' + (server.address() as any).port;
  assert.equal((await fetch(base + '/admin/sms')).status, 401); assert.equal((await fetch(base + '/admin/sms', { headers: { 'x-test-role': 'cashier' } })).status, 403);
  const headers = { 'x-test-role': 'admin', 'Content-Type': 'application/json' };
  const adminData = await fetch(base + '/admin/sms', { headers }).then(res => res.json()); assert.equal(JSON.stringify(adminData).includes('fixture-only'), false);
  const log = await fetch(base + '/admin/sms/jobs', { headers }).then(res => res.json()); assert.equal(JSON.stringify(log).includes(customer.phone), false); assert.equal('text' in log.data[0], false);
  const requestId = randomUUID(); const body = JSON.stringify({ phone: customer.phone, requestId, confirmed: true });
  assert.equal((await fetch(base + '/admin/sms/test', { method: 'POST', headers, body })).status, 202); assert.equal((await fetch(base + '/admin/sms/test', { method: 'POST', headers, body })).status, 202); assert.equal(await SmsJob.countDocuments({ sourceType: 'test' }), 1);
  assert.equal((await fetch(base + '/admin/sms', { method: 'PUT', headers, body: JSON.stringify({ enabled: false, revision: adminData.data.revision }) })).status, 200); assert.equal((await SmsControl.findById('sms'))!.enabled, false); await processSmsJobs(); assert.equal(sends, 2);
  await SmsJob.updateMany({ state: trusted({ $in: ['pending','sending'] }) }, { $set: { state: 'skipped' } });
  await SmsControl.updateOne({ _id: 'sms' }, { $set: { enabled: true, nextSendAt: new Date(0), used: 0 } });
  const makeOrder = (paid: boolean) => Order.create({ orderNumber: 'TBL-' + randomUUID(), userId: 'fixture_customer', requestKey: randomUUID(), requestHash: 'fixture', customer, fulfillment: 'pickup', smsConsent: true, smsConsentedAt: new Date(), status: 'confirmed', paymentStatus: paid ? 'paid' : 'unpaid', items: [{menuItemId:new mongoose.Types.ObjectId(),name:'TEST DISH',unitPriceHalalas:1000,quantity:1}], subtotalHalalas:1000,deliveryFeeHalalas:0,taxHalalas:0,totalHalalas:1000, statusHistory: [{status:'confirmed',changedAt:new Date(),action:'accept'},{status:'confirmed',changedAt:new Date(),action:'adjust_ready_estimate'}] });
  const paidOrder = await makeOrder(true); const unpaidOrder = await makeOrder(false);
  await enqueueSmsEvents(); await enqueueSmsEvents(); assert.equal(await SmsJob.countDocuments({sourceId:paidOrder._id}),1); assert.equal(await SmsJob.countDocuments({sourceId:unpaidOrder._id}),0);
  await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findOne({sourceId:paidOrder._id}))!.state,'gateway_queued');
  const staleOrder = await makeOrder(true); await enqueueSmsEvents(); await Order.updateOne({_id:staleOrder._id},{$set:{status:'preparing'}}); await freeSlot(); await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findOne({sourceId:staleOrder._id}))!.state,'skipped');
  const capped = await SmsJob.create({key:'fixture-cap',sourceType:'test',userId:'fixture_admin',recipient:customer.phone,text:'TEST',state:'sending',attempts:5,leaseUntil:new Date(0),leaseToken:'old-lease',expiresAt:new Date(Date.now()+600000)}); await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findById(capped._id))!.state,'unknown');
  env.SMS_PROVIDER = 'infobip'; env.INFOBIP_BASE_URL = 'https://fixture.api.infobip.com'; env.INFOBIP_API_KEY = 'fixture-key'; env.INFOBIP_SENDER = 'TEST';
  const ambiguousInfobip = await SmsJob.create({key:'infobip-uncertain',provider:'infobip',sourceType:'test',userId:'fixture_admin',recipient:customer.phone,text:'TEST',state:'pending',attempts:1,expiresAt:new Date(Date.now()+600000)});
  smsGateway.get = async () => { throw new GatewayError('INFOBIP_RESPONSE_UNKNOWN'); };
  await freeSlot(); await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findById(ambiguousInfobip._id))!.state,'pending');
  await SmsJob.updateOne({_id:ambiguousInfobip._id},{$set:{expiresAt:new Date(0),nextAttemptAt:new Date(0)}}); await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findById(ambiguousInfobip._id))!.state,'unknown');
  const oldProviderJob = await SmsJob.create({key:'old-provider',provider:'android',sourceType:'test',userId:'fixture_admin',recipient:customer.phone,text:'TEST',expiresAt:new Date(Date.now()+600000)}); await processSmsJobs(); assert.equal(sends,3); assert.equal((await SmsJob.findById(oldProviderJob._id))!.state,'skipped');
  console.log('PASS SMS adapter contract, disabled switch, consent/history exclusions, concurrent queue/claims, delivery tracking, ambiguous-send reconciliation, opt-out, expiry/stale suppression, daily cap, admin privacy/access and test idempotency. No real SMS sent.');
} finally {
  globalThis.fetch = realFetch;
  if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
  if (connected) { assert.equal(mongoose.connection.name, databaseName); assert.match(databaseName, /^tbl_sms_[a-f0-9]{16}$/); await mongoose.connection.dropDatabase(); console.log('Isolated SMS database removed.'); }
  await mongoose.disconnect();
}
