import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the submitted fields.', fields: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) } }); return; }
  if (error instanceof AppError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
  const known = error as { code?: number; name?: string; type?: string; status?: number } | null;
  if (known?.code === 11000) { res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that identifier already exists. Refresh and try again.' } }); return; }
  if (known?.name === 'ValidationError' || known?.name === 'CastError') { res.status(422).json({ error: { code: 'INVALID_DATA', message: 'Invalid record data.' } }); return; }
  if (known?.type === 'entity.too.large') { res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } }); return; }
  if (known?.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body.' } }); return; }
  // Do not log the exception, request headers/body, URI, tokens, or database details.
  console.error('Request failed; internal details withheld.');
  res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again later.' } });
};
