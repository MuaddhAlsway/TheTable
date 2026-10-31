import { Router } from 'express';
import { getOperations, saveOperations } from './operations.service.js';
import { operationsInput, type OperationsInput } from './operations.validation.js';
import { validateRequest, input } from '../../middleware/validateRequest.js';
import { actor } from '../../utils/roles.js';
export const operationsSettingsRoutes = Router();
operationsSettingsRoutes.get('/', async (_req, res) => { res.json({ data: await getOperations() }); });
operationsSettingsRoutes.put('/', validateRequest(operationsInput), async (_req, res) => { res.json({ data: await saveOperations(input<OperationsInput>(res), actor(res).userId) }); });
