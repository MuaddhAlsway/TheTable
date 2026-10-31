import { z } from 'zod';
export const text = (max = 200) => z.string().trim().min(1).max(max).refine(value => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Control characters are not allowed');
export const optionalText = (max = 1000) => z.string().trim().max(max).refine(value => !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value), 'Control characters are not allowed').optional().default('');
export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid item ID');
export const phone = z.string().max(100).transform(value => value.replace(/[\s()-]/g, '')).refine(value => /^(?:05\d{8}|5\d{8}|\+9665\d{8})$/.test(value), 'Enter a Saudi mobile: 05XXXXXXXX, 5XXXXXXXX, or +9665XXXXXXXX').transform(value => value.startsWith('+966') ? value : '+966' + (value.startsWith('0') ? value.slice(1) : value));
export const customer = z.object({ name: text(120), email: z.string().trim().email().max(254), phone }).strict();
export const pagination = { page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) };
export const money = z.number().int().min(0).max(100000000);
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
