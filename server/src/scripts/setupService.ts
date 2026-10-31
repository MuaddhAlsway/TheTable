import '../config/database.js';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { readFulfillment, saveFulfillment } from '../modules/fulfillment/fulfillment.service.js';
import { saveOperations } from '../modules/operations/operations.service.js';
import { Operations } from '../modules/operations/operations.model.js';
import { defaultOperations, type OperationsSettings } from '../config/operations.js';
import { startupDiagnostic } from '../utils/startupDiagnostic.js';

const ACTOR = 'setup:service';
const PICKUP_HANDOFF = 'Check the order number and paid status at the counter, then hand the order to the customer. Record pickup completion in the cashier screen.';
const DELIVERY_PROCESS = 'Restaurant-managed delivery. Front-of-house dispatches after the kitchen marks the order ready, and records completion when the order is handed over to the customer. No third-party courier service is connected.';

async function setup() {
  if (!process.argv.includes('--confirm-service')) throw new Error('SERVICE_CONFIRMATION_REQUIRED');
  await connectDatabase();

  const current = await readFulfillment();
  const settings = structuredClone(current.settings);
  settings.pickup.estimateConfirmed = true;
  settings.delivery = {
    ...settings.delivery,
    enabled: true,
    supportedAreas: settings.delivery.supportedAreas.length ? settings.delivery.supportedAreas : [{ city: settings.location.city, neighborhood: 'North Obhur', postalCodes: [] }],
    coverageConfirmed: true,
    pricingConfirmed: true,
    estimateConfirmed: true,
    processConfirmed: true,
    processNotes: settings.delivery.processNotes.trim() || DELIVERY_PROCESS,
  };
  if (JSON.stringify(settings) === JSON.stringify(current.settings)) {
    console.log('Fulfillment is already configured.');
  } else {
    const saved = await saveFulfillment(settings, current.revision, ACTOR);
    console.log(`Fulfillment saved at revision ${saved.revision}.`);
  }

  const existing = await Operations.findById('operations');
  const stored = existing?.toObject().settings as Partial<OperationsSettings> | undefined;
  const previous: OperationsSettings = {
    cashierEnabled: stored?.cashierEnabled ?? defaultOperations.cashierEnabled,
    kitchenEnabled: stored?.kitchenEnabled ?? defaultOperations.kitchenEnabled,
    pickupHandoffEnabled: stored?.pickupHandoffEnabled ?? defaultOperations.pickupHandoffEnabled,
    pickupHandoffInstructions: stored?.pickupHandoffInstructions ?? defaultOperations.pickupHandoffInstructions,
    deliveryDispatchEnabled: stored?.deliveryDispatchEnabled ?? defaultOperations.deliveryDispatchEnabled,
    deliveryCompletionEnabled: stored?.deliveryCompletionEnabled ?? defaultOperations.deliveryCompletionEnabled,
    deliveryProcessNotes: stored?.deliveryProcessNotes ?? defaultOperations.deliveryProcessNotes,
    pollIntervalSeconds: stored?.pollIntervalSeconds ?? defaultOperations.pollIntervalSeconds,
    staleAfterSeconds: stored?.staleAfterSeconds ?? defaultOperations.staleAfterSeconds,
    urgencyWarningMinutes: stored?.urgencyWarningMinutes ?? defaultOperations.urgencyWarningMinutes,
    urgencyCriticalMinutes: stored?.urgencyCriticalMinutes ?? defaultOperations.urgencyCriticalMinutes,
  };
  const operations: OperationsSettings = {
    ...previous,
    cashierEnabled: true,
    kitchenEnabled: true,
    pickupHandoffEnabled: true,
    pickupHandoffInstructions: previous.pickupHandoffInstructions.trim() || PICKUP_HANDOFF,
    deliveryDispatchEnabled: true,
    deliveryCompletionEnabled: true,
    deliveryProcessNotes: previous.deliveryProcessNotes.trim() || DELIVERY_PROCESS,
  };
  if (existing && JSON.stringify(operations) === JSON.stringify(previous)) {
    console.log('Operations workflow is already enabled.');
  } else {
    const saved = await saveOperations({ revision: existing?.revision || 0, ...operations }, ACTOR);
    console.log(`Operations workflow enabled at revision ${saved.revision}.`);
  }
}

setup()
  .catch(error => {
    const code = error instanceof Error ? error.message : '';
    if (code === 'SERVICE_CONFIRMATION_REQUIRED') console.error('Use --confirm-service to apply the restaurant service configuration.');
    else console.error(startupDiagnostic('service setup', error));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
