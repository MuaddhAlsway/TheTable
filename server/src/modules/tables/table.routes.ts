import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { DiningTable } from './table.model.js';
import { resolveTable } from './table.service.js';
import { getRestaurant } from '../fulfillment/fulfillment.service.js';
import { orderAvailability } from '../../utils/fulfillment.js';
import { input, validateRequest as validate } from '../../middleware/validateRequest.js';
import { actor } from '../../utils/roles.js';
import { objectId } from '../../utils/validation.js';
import { staffMutationLimit } from '../../middleware/rateLimits.js';
import { AppError } from '../../utils/errors.js';
export const publicTableRoutes = Router();
publicTableRoutes.get('/:token', validate(z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }).strict(), 'params'), async (_req, res) => {
  const table = await resolveTable(input<{ token: string }>(res, 'params').token);
  const restaurant = await getRestaurant();
  res.json({ data: { label: table.label, availability: orderAvailability(restaurant, 'dine_in') } });
});
export const adminTableRoutes = Router();
adminTableRoutes.get('/', async (_req, res) => res.json({ data: await DiningTable.find().select('+token').sort({ label: 1 }).limit(300) }));
const fields = { label: z.string().trim().min(1).max(60), enabled: z.boolean() };
const editInput = z.object({ ...fields, expectedUpdatedAt: z.string().datetime(), rotateCode: z.boolean().default(false) }).strict();
const id = validate(z.object({ id: objectId }).strict(), 'params');
adminTableRoutes.post('/', staffMutationLimit, validate(z.object(fields).strict()), async (_req, res) => {
  if (await DiningTable.countDocuments() >= 300) throw new AppError(422, 'TABLE_LIMIT', 'A maximum of 300 tables is supported.');
  const table = await DiningTable.create({ ...input(res), token: randomBytes(24).toString('hex'), updatedBy: actor(res).userId });
  res.status(201).json({ data: table });
});
adminTableRoutes.put('/:id', staffMutationLimit, id, validate(editInput), async (_req, res) => {
  const data = input<z.infer<typeof editInput>>(res);
  const table = await DiningTable.findOneAndUpdate({ _id: input<{ id: string }>(res, 'params').id, updatedAt: new Date(data.expectedUpdatedAt) }, { $set: { label: data.label, enabled: data.enabled, updatedBy: actor(res).userId, ...(data.rotateCode ? { token: randomBytes(24).toString('hex') } : {}) } }, { returnDocument: 'after', runValidators: true }).select('+token');
  if (!table) throw new AppError(409, 'STALE_TABLE', 'The table changed. Refresh before editing it.');
  res.json({ data: table });
});
