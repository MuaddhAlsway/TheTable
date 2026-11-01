import { randomUUID } from 'node:crypto';
import { trusted } from 'mongoose';
import { Order } from '../orders/order.model.js';
import { PushDevice,PushJob } from './push.model.js';
import { pushOptions,pushReady,sendPush } from './push.config.js';
import { clerk } from '../../config/clerk.js';
/** Derive the outbox from persisted assignments: recovers a crash after dispatch without a dual-write gap. */
export async function enqueueAssignments(){
 for await(const order of Order.find({status:'out_for_delivery','deliveryAssignment.driverId':trusted({$exists:true}),'deliveryProgress.acknowledgedAt':null}).select('deliveryAssignment').cursor()){
  const assignment=order.deliveryAssignment;if(!assignment?.driverId||!assignment.dispatchedAt)continue;
  const devices=await PushDevice.find({userId:assignment.driverId}).select('_id');
  for(const device of devices){const key=order.id+':'+assignment.driverId+':'+assignment.dispatchedAt.getTime()+':'+device.id;try{await PushJob.updateOne({key},{$setOnInsert:{key,orderId:order._id,driverId:assignment.driverId,dispatchedAt:assignment.dispatchedAt,deviceId:device._id,state:'pending',attempts:0,nextAttemptAt:new Date()}},{upsert:true});}catch(error){if((error as {code?:number}).code!==11000)throw error;}}
 }
}
export async function processPushJobs(){
 const now=new Date();await PushJob.updateMany({attempts:trusted({$gte:5}),$or:[{state:'pending'},{state:'sending',leaseUntil:trusted({$lt:now})}]},{$set:{state:'failed',lastCode:'ATTEMPT_LIMIT'},$unset:{leaseUntil:1,leaseToken:1}});const jobs=await PushJob.find({$or:[{state:'pending',nextAttemptAt:trusted({$lte:now})},{state:'sending',leaseUntil:trusted({$lt:now})}]}).sort({nextAttemptAt:1}).limit(30);
 const users=new Map<string,boolean>();
 for(const candidate of jobs){const token=randomUUID();const job=await PushJob.findOneAndUpdate({_id:candidate._id,state:candidate.state,updatedAt:candidate.updatedAt,leaseToken:candidate.leaseToken||null},{$set:{state:'sending',leaseUntil:new Date(Date.now()+120000),leaseToken:token},$inc:{attempts:1}},{returnDocument:'after'});if(!job)continue;
 const finish=async(data:Record<string,unknown>)=>{await PushJob.updateOne({_id:job._id,leaseToken:token},{$set:data,$unset:{leaseUntil:1,leaseToken:1}});};
 try{
  const order=await Order.findById(job.orderId).select('status deliveryAssignment deliveryProgress');const device=await PushDevice.findOne({_id:job.deviceId,userId:job.driverId}).select('+endpoint +keys.p256dh +keys.auth');
  if(!order||order.status!=='out_for_delivery'||order.deliveryAssignment?.driverId!==job.driverId||order.deliveryAssignment.dispatchedAt?.getTime()!==job.dispatchedAt.getTime()||order.deliveryProgress?.acknowledgedAt||!device){await finish({state:'skipped',lastCode:'NO_LONGER_RELEVANT'});continue;}
  if(!users.has(job.driverId)){const user=await clerk.users.getUser(job.driverId);const email=user.emailAddresses.find(value=>value.id===user.primaryEmailAddressId);users.set(job.driverId,user.publicMetadata.role==='driver'&&email?.verification?.status==='verified');}
  if(!users.get(job.driverId)){await PushDevice.deleteMany({userId:job.driverId});await finish({state:'skipped',lastCode:'ACCESS_REMOVED'});continue;}
  // Generic lock-screen payload: no customer name, address, phone or delivery code.
  await sendPush.sendNotification({endpoint:device.endpoint,keys:{p256dh:device.keys!.p256dh!,auth:device.keys!.auth!}},JSON.stringify({title:'The Table',body:'New delivery assigned — open your dashboard.',tag:'delivery-'+String(job.orderId),url:'/driver'}),pushOptions());
  await finish({state:'sent',sentAt:new Date(),lastCode:'PUSH_SERVICE_ACCEPTED'});
 }catch(error){const status=Number((error as {statusCode?:number}).statusCode||0);if(status===404||status===410){await PushDevice.deleteOne({_id:job.deviceId});await finish({state:'failed',lastCode:'DEVICE_EXPIRED'});}else{await finish({state:job.attempts>=5?'failed':'pending',nextAttemptAt:new Date(Date.now()+Math.min(900000,30000*2**job.attempts)),lastCode:status?'HTTP_'+status:'SEND_FAILED'});}}
 }
}
export function startPushWorker(keepAlive=false){let running=false;const tick=async()=>{if(running||!pushReady())return;running=true;try{await enqueueAssignments();await processPushJobs();}catch{console.warn('Background delivery notification worker failed; it will retry. Secret details withheld.');}finally{running=false;}};const timer=setInterval(()=>void tick(),15000);if(!keepAlive)timer.unref();void tick();return()=>clearInterval(timer);}
