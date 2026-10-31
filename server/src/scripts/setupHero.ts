import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { Menu } from '../modules/menu/menu.model.js';
import { startupDiagnostic } from '../utils/startupDiagnostic.js';
// Preserve the four dishes previously shown on the homepage, in their existing order.
const slugs = ['seasonal-cake', 'house-pasta', 'table-burger', 'golden-fries'];
async function setup() {
  if (!process.argv.includes('--confirm')) throw new Error('CONFIRM_REQUIRED');
  await connectDatabase();
  if (mongoose.connection.name !== 'thetable') throw new Error('DATABASE_MISMATCH');
  const records = await Menu.find({ archived: false }).select('_id slug heroSlide').lean();
  if (slugs.some(slug => !records.some(item => item.slug === slug))) throw new Error('MENU_ITEMS_MISSING');
  if (records.some(item => item.heroSlide && !slugs.includes(item.slug))) throw new Error('EXISTING_SLIDES_CONFLICT');
  await mkdir(fileURLToPath(new URL('../../../client/public/hero-images/', import.meta.url)), { recursive: true });
  for (let index = 0; index < slugs.length; index++) {
    const number = String(index + 1).padStart(2, '0');
    await copyFile(fileURLToPath(new URL(`../../../client/src/assets/Hero${number}.png`, import.meta.url)), fileURLToPath(new URL(`../../../client/public/hero-images/hero${number}.png`, import.meta.url)));
  }
  await Menu.bulkWrite(slugs.map((slug, index) => ({ updateOne: { filter: { slug, archived: false }, update: { $set: { heroSlide: index + 1, heroImageUrl: `/hero-images/hero${String(index + 1).padStart(2, '0')}.png` } } } })));
  const saved = await Menu.find({}).sort({ heroSlide: 1 }).select('heroSlide heroImageUrl -_id').lean();
  console.log('Homepage image mapping saved in thetable. Menu prices and menu-card images preserved.');
  console.log(JSON.stringify(saved.filter(item => item.heroSlide && item.heroSlide >= 1 && item.heroSlide <= 4)));
}
setup().catch(error => { console.error(startupDiagnostic('homepage image setup', error)); if (error instanceof Error) console.error('Failure category: ' + error.name); if (error instanceof Error && ['CONFIRM_REQUIRED', 'DATABASE_MISMATCH', 'MENU_ITEMS_MISSING', 'EXISTING_SLIDES_CONFLICT'].includes(error.message)) console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
