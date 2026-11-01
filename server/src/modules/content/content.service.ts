import catalog from '../../data/site-content.json' with { type: 'json' };
import { WebsiteContent } from './content.model.js';
export const contentDefaults = Object.fromEntries(catalog.map(field => [field.key, field.defaultValue]));
/** Populate missing defaults while preserving every published customization. */
export async function initializeWebsiteContent() {
  try { await WebsiteContent.updateOne({ _id: 'website' }, { $setOnInsert: { values: contentDefaults, revision: 1, updatedBy: 'system:content-bootstrap', createdAt: new Date(), updatedAt: new Date() } }, { upsert: true, timestamps: false }); } catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await WebsiteContent.findById('website').lean();
    if (!doc) continue;
    const values = (doc.values || {}) as Record<string, string>;
    if (Object.keys(contentDefaults).every(key => typeof values[key] === 'string')) return;
    const updated = await WebsiteContent.updateOne({ _id: 'website', revision: doc.revision }, { $set: { values: { ...contentDefaults, ...values }, updatedBy: 'system:content-bootstrap' }, $inc: { revision: 1 } });
    if (updated.modifiedCount) return;
  }
  throw new Error('CONTENT_INITIALIZATION_CONFLICT');
}
