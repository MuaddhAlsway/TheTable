import { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../middleware/validateRequest.js';
import { me, update } from './user.controller.js';
export const userRoutes = Router();
userRoutes.get('/me', me);
userRoutes.patch('/me/preferences', validateRequest(z.object({ language: z.enum(['en', 'ar']) }).strict()), update);
