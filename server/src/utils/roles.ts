import type { Response } from 'express';
import { AppError } from './errors.js';
export const staffRoles = ['admin', 'cashier', 'kitchen', 'driver'] as const;
export type StaffRole = typeof staffRoles[number];
export type UserRole = StaffRole | 'customer';
export type Actor = { userId: string; role: UserRole };
export const verifiedRole = (value: unknown): UserRole => staffRoles.includes(value as StaffRole) ? value as StaffRole : 'customer';
export function actor(res: Response): Actor { const value = res.locals.actor as Actor | undefined; if (!value) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.'); return value; }
