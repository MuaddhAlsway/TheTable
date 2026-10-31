import { z } from 'zod';
import { optionalText } from '../../utils/validation.js';
export const operationsInput = z.object({
  revision: z.number().int().min(0),
  cashierEnabled: z.boolean(), kitchenEnabled: z.boolean(),
  pickupHandoffEnabled: z.boolean(), pickupHandoffInstructions: optionalText(1500),
  deliveryDispatchEnabled: z.boolean(), deliveryCompletionEnabled: z.boolean(), deliveryProcessNotes: optionalText(1500),
  pollIntervalSeconds: z.number().int().min(10).max(120), staleAfterSeconds: z.number().int().min(20).max(600),
  urgencyWarningMinutes: z.number().int().min(1).max(1440).nullable(), urgencyCriticalMinutes: z.number().int().min(1).max(1440).nullable(),
}).strict().superRefine((value, ctx) => {
  if (value.staleAfterSeconds < value.pollIntervalSeconds * 2) ctx.addIssue({ code: 'custom', path: ['staleAfterSeconds'], message: 'Stale threshold must be at least twice the polling interval.' });
  if ((value.urgencyWarningMinutes === null) !== (value.urgencyCriticalMinutes === null) || (value.urgencyWarningMinutes !== null && value.urgencyCriticalMinutes! <= value.urgencyWarningMinutes)) ctx.addIssue({ code: 'custom', path: ['urgencyCriticalMinutes'], message: 'Set both visual urgency thresholds, with critical greater than warning, or leave both unset.' });
  if (value.pickupHandoffEnabled && !value.pickupHandoffInstructions.trim()) ctx.addIssue({ code: 'custom', path: ['pickupHandoffInstructions'], message: 'Real pickup handoff instructions are required.' });
  if ((value.deliveryDispatchEnabled || value.deliveryCompletionEnabled) && !value.deliveryProcessNotes.trim()) ctx.addIssue({ code: 'custom', path: ['deliveryProcessNotes'], message: 'Describe the real delivery/driver process before enabling it.' });
  if (value.deliveryCompletionEnabled && !value.deliveryDispatchEnabled) ctx.addIssue({ code: 'custom', path: ['deliveryCompletionEnabled'], message: 'Dispatch must be enabled before delivery completion.' });
});
export type OperationsInput = z.infer<typeof operationsInput>;
