import { clerk } from '../../config/clerk.js';
import { syncClerkUser } from '../users/user.service.js';
import { Order } from '../orders/order.model.js';
import { AppError } from '../../utils/errors.js';
export async function loadDeliveryDriver(id?: string) {
  if (!id) throw new AppError(422,'DRIVER_REQUIRED','Select a registered driver before dispatching.');
  const user=await clerk.users.getUser(id);
  const email=user.emailAddresses.find(entry=>entry.id===user.primaryEmailAddressId);
  const phone=String(user.publicMetadata.staffPhone||'');
  if(user.publicMetadata.role!=='driver'||email?.verification?.status!=='verified'||!/^\+9665\d{8}$/.test(phone))throw new AppError(422,'DRIVER_UNAVAILABLE','This driver needs active access, a verified email, and a Saudi mobile number.');
  await syncClerkUser(user);
  return {id:user.id,name:String(user.publicMetadata.staffDisplayName||[user.firstName,user.lastName].filter(Boolean).join(' ')),phone};
}
export async function verifyDeliveryCode(id:string, code?:string) {
  const order=await Order.findById(id).select('+deliveryHandoffCode +handoffAttempts +handoffBlockedUntil');
  if(order?.deliveryAssignment?.checklistRequired&&!order.deliveryProgress?.arrivedAt)throw new AppError(409,'DELIVERY_CHECKLIST_REQUIRED','Acknowledge, collect the food, and record arrival before confirming delivery.');
  if(order?.deliveryIssue?.reportedAt&&!order.deliveryIssue.resolvedAt)throw new AppError(409,'DELIVERY_ISSUE_OPEN','The cashier must resolve the reported delivery issue before completion.');
  if(!order?.deliveryAssignment?.driverId||!order.deliveryHandoffCode)throw new AppError(409,'DELIVERY_ASSIGNMENT_REQUIRED','A registered driver and handoff code are required before completion.');
  if(order.handoffBlockedUntil&&order.handoffBlockedUntil.getTime()>Date.now())throw new AppError(429,'DELIVERY_CODE_LOCKED','Too many attempts. Wait one minute before trying again.');
  if(!code||code!==order.deliveryHandoffCode){const attempts=order.handoffBlockedUntil&&order.handoffBlockedUntil.getTime()<=Date.now()?1:(order.handoffAttempts||0)+1;await Order.updateOne({_id:id},{$set:{handoffAttempts:attempts,...(attempts>=5?{handoffBlockedUntil:new Date(Date.now()+60000)}:{})}},{timestamps:false});throw new AppError(422,'DELIVERY_CODE_INVALID','Ask the recipient for the six-digit code shown in their account after they receive the order.');}
}
