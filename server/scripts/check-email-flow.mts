import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
const databaseName = 'tbl_email_' + randomUUID().replaceAll('-', '').slice(0, 16);
Object.assign(process.env, { NODE_ENV: 'test', MONGODB_DB_NAME: databaseName, EMAIL_PROVIDER: 'gmail', EMAIL_ENABLED: 'true', EMAIL_MODE: 'demo', GMAIL_USER: 'sender@example.invalid', GMAIL_APP_PASSWORD: 'abcdefghijklmnop', EMAIL_TEST_RECIPIENT: 'customer@example.invalid', EMAIL_FRONTEND_URL: 'http://localhost:5173', EMAIL_DAILY_LIMIT: '10' });
const { env } = await import('../src/config/env.js');
const { connectDatabase } = await import('../src/config/database.js');
const { EmailJob, EmailControl, EmailPreference } = await import('../src/modules/email/email.model.js');
const { emailProvider, emailPayload, verifyEmailConnection } = await import('../src/modules/email/email.provider.js');
const { enqueueEmailEvents, processEmailJobs } = await import('../src/modules/email/email.worker.js');
const { Order } = await import('../src/modules/orders/order.model.js');
const { Reservation } = await import('../src/modules/reservations/reservation.model.js');
const { UserProfile } = await import('../src/modules/users/user.model.js');
const originalTransport = nodemailer.createTransport; const originalFetch = globalThis.fetch;
let deliveries = 0, checks = 0, lost = false;
// No real SMTP or HTTP sending can occur: both transports are replaced before any send call.
(nodemailer as any).createTransport = (options: any) => { assert.equal(options.host, 'smtp.gmail.com'); assert.equal(options.secure, true); return { verify: async () => { checks++; }, close() {}, sendMail: async (message: any) => { deliveries++; assert.ok(['customer@example.invalid', 'driver@example.invalid'].includes(message.to[0])); assert.ok(message.text.includes('/account/') || message.text.includes('/driver')); assert.ok(!message.text.includes('123456')); if (lost) throw Object.assign(new Error('fixture'), { code: 'ESOCKET' }); return { accepted: message.to, messageId: message.messageId }; } }; };
globalThis.fetch = (async (_url: unknown, options: any) => { assert.equal(options.headers['Idempotency-Key'], 'fixture-id'); return new Response(JSON.stringify({ id: 'fixture-provider-id' }), { status: 200 }); }) as typeof fetch;
let connected = false;
try {
  await verifyEmailConnection(); assert.equal(checks, 1); assert.equal(deliveries, 0);
  env.EMAIL_PROVIDER = 'resend'; env.RESEND_API_KEY = 'fixture'; env.RESEND_FROM = 'onboarding@resend.dev'; await emailProvider.send('fixture-id', emailPayload('customer@example.invalid', 'Test', 'Fixture', '/account')); env.EMAIL_PROVIDER = 'gmail';
  console.log("Email test: connecting isolated database");
  await Promise.race([connectDatabase(), new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('ISOLATED_DATABASE_UNAVAILABLE')), 20000); timer.unref(); })]); connected = true; assert.equal(mongoose.connection.name, databaseName);
  for (const model of [EmailJob, EmailControl, EmailPreference, Reservation, Order, UserProfile]) { await model.createCollection(); await model.createIndexes(); }
  console.log("Email test: database indexes ready");
  await EmailControl.create({ _id: 'email', enabled: true, activatedAt: new Date(Date.now() - 60000) });
  await UserProfile.create({ clerkId: 'fixture_customer', email: 'customer@example.invalid', emailVerified: true });
  const make = () => Reservation.create({ userId: 'fixture_customer', requestKey: randomUUID(), requestHash: 'fixture', customer: { name: 'Fixture', email: 'untrusted@example.invalid', phone: '+966512345678' }, dateTime: new Date(Date.now() + 3600000), partySize: 2, status: 'confirmed', statusHistory: [{ status: 'confirmed', changedAt: new Date() }] });
  await make(); await enqueueEmailEvents(); assert.equal(await EmailJob.countDocuments(), 0, 'no email without account opt-in');
  await EmailPreference.create({ _id: 'fixture_customer', enabled: true, activatedAt: new Date() });
  console.log("Email test: checking deduplication");
  const reservation = await make(); await Promise.all([enqueueEmailEvents(), enqueueEmailEvents()]); assert.equal(await EmailJob.countDocuments(), 1);
  await Promise.all([processEmailJobs(), processEmailJobs()]); assert.equal(deliveries, 1); assert.equal((await EmailJob.findOne({ sourceId: reservation._id }))!.state, 'accepted');
  const free = () => EmailControl.updateOne({ _id: 'email' }, { $set: { nextSendAt: new Date(0), used: 0 } });
  const optedOut = await make(); await enqueueEmailEvents(); await EmailPreference.updateOne({ _id: 'fixture_customer' }, { $set: { enabled: false } }); await free(); await processEmailJobs(); assert.equal((await EmailJob.findOne({ sourceId: optedOut._id }))!.state, 'skipped');
  await EmailPreference.updateOne({ _id: 'fixture_customer' }, { $set: { enabled: true } });
  const uncertain = await make(); await enqueueEmailEvents(); lost = true; await free(); await processEmailJobs(); assert.equal((await EmailJob.findOne({ sourceId: uncertain._id }))!.state, 'unknown'); assert.equal(deliveries, 2); await processEmailJobs(); assert.equal(deliveries, 2);
  await UserProfile.updateOne({ clerkId: 'fixture_customer' }, { $set: { email: 'other@example.invalid' } }); await make(); const before = await EmailJob.countDocuments(); await enqueueEmailEvents(); assert.equal(await EmailJob.countDocuments(), before, 'demo must not reroute other customer mail');
  // Delivery assignments are routed to the verified assigned driver, never the customer or arbitrary email.
  await Reservation.deleteMany({}); await EmailJob.deleteMany({}); lost = false; env.EMAIL_MODE = 'production';
  await UserProfile.updateOne({ clerkId: 'fixture_customer' }, { $set: { email: 'customer@example.invalid' } });
  await UserProfile.create({ clerkId: 'fixture_driver', role: 'driver', email: 'driver@example.invalid', emailVerified: true });
  await EmailPreference.create({ _id: 'fixture_driver', enabled: true, activatedAt: new Date(Date.now() - 60000) });
  const dispatch = new Date();
  const order = await Order.create({ orderNumber: 'TBL-FIXTURE', userId: 'fixture_customer', requestKey: randomUUID(), requestHash: 'fixture', customer: { name: 'Fixture', email: 'untrusted@example.invalid', phone: '+966512345678' }, fulfillment: 'delivery', deliveryAddress: { recipientName: 'Fixture', recipientPhone: '+966512345678', city: 'Fixture', neighborhood: 'Fixture', street: 'Fixture', buildingUnit: 'Fixture' }, deliveryAssignment: { driverId: 'fixture_driver', dispatchedAt: dispatch }, status: 'out_for_delivery', paymentStatus: 'paid', items: [], subtotalHalalas: 100, deliveryFeeHalalas: 0, taxHalalas: 0, totalHalalas: 100, statusHistory: [{ status: 'out_for_delivery', action: 'dispatch_delivery', changedAt: dispatch }] });
  await Promise.all([enqueueEmailEvents(), enqueueEmailEvents()]);
  let driverJob = (await EmailJob.findOne({ sourceType: 'driver_assignment' }).select('+recipient +payload'))!;
  assert.equal(driverJob.userId, 'fixture_driver'); assert.equal(driverJob.recipient, 'driver@example.invalid'); assert.ok(driverJob.payload.includes('/driver')); assert.ok(!driverJob.payload.includes('deliveryHandoffCode'));
  await free(); await processEmailJobs(); await free(); await processEmailJobs();
  assert.equal((await EmailJob.findById(driverJob._id))!.state, 'accepted');
  await Order.updateOne({ _id: order._id }, { $set: { 'deliveryProgress.arrivedAt': new Date(), 'deliveryProgress.acknowledgedAt': new Date() } });
  await enqueueEmailEvents(); const arrived = (await EmailJob.findOne({ sourceType: 'order_progress', eventKind: 'arrived' }).select('+payload'))!; assert.ok(arrived.payload.includes('before sharing')); assert.ok(arrived.payload.includes('/account/orders/'));
  await free(); await processEmailJobs(); assert.equal((await EmailJob.findById(arrived._id))!.state, 'accepted');
  // A reassigned delivery must invalidate an unsent driver's earlier assignment alert.
  await EmailJob.deleteMany({}); await Order.updateOne({ _id: order._id }, { $unset: { deliveryProgress: 1 }, $set: { 'deliveryAssignment.dispatchedAt': new Date() } }); await enqueueEmailEvents();
  driverJob = (await EmailJob.findOne({ sourceType: 'driver_assignment' }))!;
  await Order.updateOne({ _id: order._id }, { $set: { 'deliveryAssignment.driverId': 'different_driver' } });
  await free(); await processEmailJobs(); await free(); await processEmailJobs(); assert.equal((await EmailJob.findById(driverJob._id))!.state, 'skipped');
  console.log('PASS assigned-driver email routing, arrival instructions and stale assignment suppression.');
  console.log('PASS email SMTP/read-only verify, Resend contract, verified recipient, opt-in, concurrent deduplication/claims, opt-out, demo isolation and uncertain SMTP no-resend. Mocked sending only.');
} catch { console.error('Email flow verification failed or isolated database unavailable; sensitive details withheld.'); process.exitCode = 1; } finally { nodemailer.createTransport = originalTransport; globalThis.fetch = originalFetch; if (connected && mongoose.connection.name === databaseName && /^tbl_email_[a-f0-9]{16}$/.test(databaseName)) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); }
