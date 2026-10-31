import type { RequestHandler, Response } from 'express';
import type { z } from 'zod';
export function validateRequest(schema: z.ZodType, source: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, res, next) => { try { res.locals[source] = schema.parse(req[source]); next(); } catch (error) { next(error); } };
}
export const input = <T>(res: Response, source = 'body') => res.locals[source] as T;
