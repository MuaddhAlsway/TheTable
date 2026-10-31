import type { RequestHandler } from 'express';
import { actor, type StaffRole } from '../utils/roles.js';
import { AppError } from '../utils/errors.js';
export const authorizeRoles = (...allowed: StaffRole[]): RequestHandler => (_req, res, next) => {
  try { if (!allowed.includes(actor(res).role as StaffRole)) throw new AppError(403, 'FORBIDDEN', 'You do not have permission for this staff workflow.'); next(); } catch (error) { next(error); }
};
