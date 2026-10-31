import { Router } from 'express';
import { fulfillmentInput } from './fulfillment.validation.js';
import { readFulfillment, saveFulfillment } from './fulfillment.service.js';
import { validateRequest, input } from '../../middleware/validateRequest.js';
import { actor } from '../../utils/roles.js';
import { staffMutationLimit } from '../../middleware/rateLimits.js';
import type { z } from 'zod';
export const fulfillmentRoutes = Router();
// Mounted behind the existing server-side authenticate + authorizeAdmin middleware.
fulfillmentRoutes.get('/', async (_req, res) => { res.json({ data: await readFulfillment() }); });
fulfillmentRoutes.put('/', staffMutationLimit, validateRequest(fulfillmentInput), async (_req, res) => { const data = input<z.infer<typeof fulfillmentInput>>(res); res.json({ data: await saveFulfillment(data.settings, data.revision, actor(res).userId) }); });
