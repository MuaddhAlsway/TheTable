import './config/database.js';
import { Fulfillment } from './modules/fulfillment/fulfillment.model.js';
import { WebhookReceipt } from './modules/webhooks/webhookReceipt.model.js';
import { Operations } from './modules/operations/operations.model.js';
import { Menu } from './modules/menu/menu.model.js';
import { Order } from './modules/orders/order.model.js';
import { Reservation } from './modules/reservations/reservation.model.js';
import { UserProfile } from './modules/users/user.model.js';
import mongoose from 'mongoose';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { startupDiagnostic } from './utils/startupDiagnostic.js';
let startupStage = 'database connection';
async function start() {
  await connectDatabase();
  startupStage = 'database index initialization';
  const models: { createCollection(): Promise<unknown>; createIndexes(): Promise<unknown> }[] = [Menu, Order, Reservation, UserProfile, Operations, WebhookReceipt, Fulfillment];
  await Promise.all(models.map(async model => { await model.createCollection(); await model.createIndexes(); }));
  startupStage = 'HTTP listener';
  const server = app.listen(env.PORT, '0.0.0.0', () => console.log(`The Table API listening on 0.0.0.0:${env.PORT}`));
  server.on('error', error => { console.error(startupDiagnostic('HTTP listener', error)); void mongoose.disconnect().finally(() => process.exit(1)); });
  const stop = () => { server.close(() => { void mongoose.disconnect().finally(() => process.exit(0)); }); setTimeout(() => process.exit(1), 10000).unref(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
start().catch(error => { console.error(startupDiagnostic(startupStage, error)); void mongoose.disconnect().finally(() => process.exit(1)); });
