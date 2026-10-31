/** Technical refresh defaults are NOT preparation-time promises. Unknown business settings stay off. */
export const defaultOperations = {
  cashierEnabled: false,
  kitchenEnabled: false,
  pickupHandoffEnabled: false,
  pickupHandoffInstructions: '',
  deliveryDispatchEnabled: false,
  deliveryCompletionEnabled: false,
  deliveryProcessNotes: '',
  pollIntervalSeconds: 20,
  staleAfterSeconds: 60,
  urgencyWarningMinutes: null as number | null,
  urgencyCriticalMinutes: null as number | null,
};
export type OperationsSettings = typeof defaultOperations;
