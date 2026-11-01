import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { WebsiteContent } from '../modules/content/content.model.js';
import { initializeWebsiteContent } from '../modules/content/content.service.js';
async function setup() {
  await connectDatabase();
  if (mongoose.connection.name !== 'thetable') throw new Error('DATABASE_MISMATCH');
  await WebsiteContent.createCollection(); await WebsiteContent.createIndexes();
  const before = await WebsiteContent.countDocuments();
  await initializeWebsiteContent();
  const doc = await WebsiteContent.findById('website').lean();
  console.log(JSON.stringify({ database: 'thetable', documentsBefore: before, documentsAfter: await WebsiteContent.countDocuments(), storedFields: Object.keys(doc?.values || {}).length, revision: doc?.revision }));
}
setup().catch(() => { console.error('Content initialization failed; secret details withheld.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
