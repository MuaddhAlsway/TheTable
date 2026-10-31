import { Router } from 'express';
import { z } from 'zod';
import catalog from '../../data/site-content.json' with { type: 'json' };
import { WebsiteContent } from './content.model.js';
import { AppError } from '../../utils/errors.js';
import { actor } from '../../utils/roles.js';
import { validateRequest, input } from '../../middleware/validateRequest.js';
import { staffMutationLimit } from '../../middleware/rateLimits.js';
type Values = Record<string, string>;
const fields = new Map(catalog.map(field => [field.key, field]));
async function read() {
  const doc = await WebsiteContent.findById('website').lean();
  const values = Object.fromEntries(Object.entries((doc?.values || {}) as Values).filter(([key, value]) => fields.has(key) && typeof value === 'string'));
  return { values, revision: doc?.revision || 0, updatedAt: doc?.updatedAt || null };
}
export const publicContentRoutes = Router();
publicContentRoutes.get('/', async (_req, res) => { const current = await read(); res.json({ data: { values: current.values, revision: current.revision } }); });
export const adminContentRoutes = Router();
adminContentRoutes.get('/', async (_req, res) => res.json({ data: { ...await read(), fields: catalog } }));
const updateInput = z.object({ revision: z.number().int().min(0), changes: z.record(z.string().regex(/^[a-zA-Z0-9_-]+$/).max(180), z.union([z.string().max(3000), z.null()])) }).strict().refine(value => Object.keys(value.changes).length > 0 && Object.keys(value.changes).length <= 250, 'Change between 1 and 250 content fields at a time.');
adminContentRoutes.put('/', staffMutationLimit, validateRequest(updateInput), async (_req, res) => {
  const body = input<z.infer<typeof updateInput>>(res);
  const current = await read();
  if (current.revision !== body.revision) throw new AppError(409, 'CONTENT_CONFLICT', 'Content changed in another session. Reload before publishing again.');
  const values: Values = { ...current.values };
  for (const [key, value] of Object.entries(body.changes)) {
    const field = fields.get(key);
    if (!field) throw new AppError(422, 'UNKNOWN_CONTENT_FIELD', 'This content field is not editable. Refresh the editor.');
    if (value === null || value === field.defaultValue) { delete values[key]; continue; }
    if (!value.trim()) throw new AppError(422, 'EMPTY_CONTENT', 'Content cannot be blank. Use Restore defaults to reset it.');
    if (field.type === 'image') {
      let allowed = /^\/(?:content-images|hero-images|menu-images)\/[a-zA-Z0-9_%&.()-]+$/.test(value);
      try { const url = new URL(value); allowed ||= url.protocol === 'https:' && !url.username && !url.password; } catch { /* A local public asset path is also supported. */ }
      if (!allowed) throw new AppError(422, 'INVALID_CONTENT_IMAGE', 'Images need an HTTPS URL or an existing /content-images/, /hero-images/, or /menu-images/ path.');
    }
    values[key] = value;
  }
  const updatedBy = actor(res).userId;
  if (body.revision === 0) {
    try { await WebsiteContent.create({ _id: 'website', revision: 1, values, updatedBy }); }
    catch (error) { if ((error as { code?: number }).code === 11000) throw new AppError(409, 'CONTENT_CONFLICT', 'Content changed in another session. Reload before publishing again.'); throw error; }
  } else {
    const updated = await WebsiteContent.findOneAndUpdate({ _id: 'website', revision: body.revision }, { $set: { values, updatedBy }, $inc: { revision: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new AppError(409, 'CONTENT_CONFLICT', 'Content changed in another session. Reload before publishing again.');
  }
  res.json({ data: { ...await read(), fields: catalog }, message: 'Website content published.' });
});
