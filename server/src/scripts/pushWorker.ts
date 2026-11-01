import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { Order } from '../modules/orders/order.model.js';
import { PushDevice,PushJob } from '../modules/push/push.model.js';
import { pushReady } from '../modules/push/push.config.js';
import { startPushWorker } from '../modules/push/push.worker.js';
async function main(){if(!pushReady())throw new Error();await connectDatabase();for(const model of [Order,PushDevice,PushJob]){await model.createCollection();await model.createIndexes();}const stop=startPushWorker(true);console.log('Delivery push worker started.');const shutdown=()=>{stop();void mongoose.disconnect().finally(()=>process.exit(0));};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);}
main().catch(()=>{console.error('Delivery push worker could not start. Check database and VAPID configuration; secret details withheld.');void mongoose.disconnect().finally(()=>process.exit(1));});
