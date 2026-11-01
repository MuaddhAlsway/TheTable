import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { SmsControl, SmsJob, SmsPreference } from '../modules/sms/sms.model.js';
import { startSmsWorker } from '../modules/sms/sms.worker.js';
import { smsReady } from '../modules/sms/sms.gateway.js';
async function start() {
  if (!smsReady()) throw new Error('SMS_SETUP_REQUIRED');
  await connectDatabase();
  for (const model of [SmsControl, SmsJob, SmsPreference]) { await model.createCollection(); await model.createIndexes(); }
  const stop = startSmsWorker(true);
  console.log('SMS worker running. Sending remains subject to the admin switch and customer consent.');
  const shutdown = () => { stop(); void mongoose.disconnect().finally(() => process.exit(0)); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
start().catch(() => { console.error('SMS worker startup failed. Check configuration and database connectivity; details withheld.'); void mongoose.disconnect().finally(() => process.exit(1)); });
