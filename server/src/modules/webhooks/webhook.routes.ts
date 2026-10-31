import { stripeWebhook } from '../payments/stripeWebhook.controller.js';
import { Router, raw } from 'express';
import { clerkWebhook } from './clerkWebhook.controller.js';
export const webhookRoutes = Router();
webhookRoutes.post('/clerk', raw({ type: 'application/json', limit: '256kb' }), clerkWebhook);

webhookRoutes.post('/stripe', raw({ type: 'application/json', limit: '256kb' }), stripeWebhook);
