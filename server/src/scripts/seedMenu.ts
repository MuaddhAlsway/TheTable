import '../config/database.js';
import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import mongoose from 'mongoose';
import menuSeed from '../data/menu.json' with { type: 'json' };
import { env } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { Menu } from '../modules/menu/menu.model.js';
import { menuInput } from '../modules/menu/menu.validation.js';
import { Order } from '../modules/orders/order.model.js';
import { Reservation } from '../modules/reservations/reservation.model.js';
import { UserProfile } from '../modules/users/user.model.js';
import { Operations } from '../modules/operations/operations.model.js';
import { WebhookReceipt } from '../modules/webhooks/webhookReceipt.model.js';
import { startupDiagnostic } from '../utils/startupDiagnostic.js';

async function seed() {
  if (!process.argv.includes('--confirm-menu') && !process.argv.includes('--confirm-demo')) throw new Error('DEMO_CONFIRMATION_REQUIRED');
  if (!env.MONGODB_DB_NAME) throw new Error('EXPLICIT_DATABASE_REQUIRED');
  const assetsDirectory = fileURLToPath(new URL('../../../client/src/assets/', import.meta.url));
  const publicDirectory = fileURLToPath(new URL('../../../client/public/menu-images/', import.meta.url));
  const items = menuSeed.map(({ assetFile, ...item }) => {
    if (!/^[a-zA-Z0-9&_-]+\.png$/.test(assetFile)) throw new Error('DEMO_ASSET_INVALID');
    return { assetFile, item: menuInput.parse(item) };
  });
  await mkdir(publicDirectory, { recursive: true });
  for (const { assetFile, item } of items) {
    const publicFile = item.imageUrl.slice('/menu-images/'.length);
    if (!/^[a-zA-Z0-9_-]+\.png$/.test(publicFile)) throw new Error('DEMO_ASSET_INVALID');
    await copyFile(resolve(assetsDirectory, assetFile), resolve(publicDirectory, publicFile));
  }
  await connectDatabase();
  const models: { createCollection(): Promise<unknown>; createIndexes(): Promise<unknown> }[] = [Menu, Order, Reservation, UserProfile, Operations, WebhookReceipt];
  await Promise.all(models.map(async model => { await model.createCollection(); await model.createIndexes(); }));
  let inserted = 0;
  for (const { item } of items) {
    const result = await Menu.updateOne({ slug: item.slug }, { $setOnInsert: item }, { upsert: true, runValidators: true });
    inserted += result.upsertedCount;
  }
  console.log(`Menu import complete: ${inserted} inserted, ${items.length - inserted} existing dishes preserved. Database: ${mongoose.connection.name}.`);
  console.log('Existing menu names and prices are imported unchanged. Orders, payments and fulfillment remain unchanged.');
}
seed().catch(error => {
  const code = error instanceof Error ? error.message : '';
  if (code === 'DEMO_CONFIRMATION_REQUIRED') console.error('Use --confirm-menu to explicitly import the menu.');
  else if (code === 'EXPLICIT_DATABASE_REQUIRED') console.error('Set MONGODB_DB_NAME explicitly before importing menu data.');
  else if (code.startsWith('DEMO_')) console.error('Menu assets could not be read safely. No existing dishes were overwritten.');
  else { console.error(startupDiagnostic('menu import', error)); if (error instanceof Error && /^[A-Za-z]+$/.test(error.name)) console.error('Failure category: ' + error.name); const driverCode = (error as { code?: unknown }).code; if (typeof driverCode === 'number') console.error('Database error code: ' + driverCode); }
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
