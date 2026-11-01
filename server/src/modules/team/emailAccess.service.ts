import { Order } from '../orders/order.model.js';
import { syncClerkUser } from '../users/user.service.js';
import { clerk } from '../../config/clerk.js';
import { env } from '../../config/env.js';
import { StaffEmailAccess } from './emailAccess.model.js';
import { TeamAudit } from './team.model.js';
import { verifiedRole } from '../../utils/roles.js';
import { AppError } from '../../utils/errors.js';
type ClerkUser=Awaited<ReturnType<typeof clerk.users.getUser>>;
/** Call only with the trusted Clerk Backend API user, never browser identity data. */
export async function applyStaffEmailAccess(original:ClerkUser):Promise<ClerkUser>{
 let user=original;
 for(let attempt=0;attempt<3;attempt++){
  const primary=user.emailAddresses.find(entry=>entry.id===user.primaryEmailAddressId),email=primary?.emailAddress.toLowerCase();
  if(verifiedRole(user.publicMetadata.role)==='admin'||email===env.ADMIN_EMAIL.toLowerCase())return user;
  const tag=typeof user.publicMetadata.staffEmailGrantId==='string'?user.publicMetadata.staffEmailGrantId:'';
  let grant=tag&&/^[a-f0-9]{24}$/i.test(tag)?await StaffEmailAccess.findById(tag):email?await StaffEmailAccess.findOne({email}):null;
  if(!grant){if(tag&&['cashier','kitchen','driver'].includes(verifiedRole(user.publicMetadata.role)))return clerk.users.updateUserMetadata(user.id,{publicMetadata:{role:'customer',staffEmailGrantId:null}});return user;}
  const verified=primary?.verification?.status==='verified'&&email===grant.email;
  if(!tag&&(!grant.enabled||!verified))return user;
  if(grant.boundClerkId&&grant.boundClerkId!==user.id)throw new AppError(403,'STAFF_EMAIL_BOUND','This staff assignment belongs to a different account. Ask the administrator to review it.');
  if(!grant.boundClerkId&&verified&&grant.enabled){grant=await StaffEmailAccess.findOneAndUpdate({_id:grant.id,revision:grant.revision,boundClerkId:null},{$set:{boundClerkId:user.id}},{returnDocument:'after'});if(!grant)continue;}
  const desired=grant.enabled&&verified?grant.role:'customer';
  if(verifiedRole(user.publicMetadata.role)!==desired||tag!==grant.id||(desired==='driver'&&user.publicMetadata.staffPhone!==grant.phone))user=await clerk.users.updateUserMetadata(user.id,{publicMetadata:{role:desired,staffManaged:true,staffEmailGrantId:grant.id,...(desired==='driver'?{staffPhone:grant.phone}:{})}});
  const marked=await StaffEmailAccess.updateOne({_id:grant.id,revision:grant.revision},{$set:{appliedRevision:grant.revision}},{timestamps:false});
  if(marked.matchedCount)return user;
 }
 throw new AppError(503,'STAFF_ACCESS_CHANGED','Staff access changed while signing in. Please retry.');
}
export async function saveEmailAccess(data:{email:string;role:'cashier'|'kitchen'|'driver';phone?:string;enabled:boolean;revision:number},actorId:string){
 if(data.email===env.ADMIN_EMAIL.toLowerCase())throw new AppError(403,'PROTECTED_ACCOUNT','Administrator access cannot be changed by this form.');
 const matches=await clerk.users.getUserList({emailAddress:[data.email],limit:10});
 const users=matches.data.filter(user=>user.emailAddresses.some(entry=>entry.id===user.primaryEmailAddressId&&entry.emailAddress.toLowerCase()===data.email));
 if(users.length>1)throw new AppError(409,'ACCOUNT_NOT_UNIQUE','More than one account matches this email. Review it in Clerk.');
 const user=users[0];
 if(user&&(user.id===actorId||verifiedRole(user.publicMetadata.role)==='admin'))throw new AppError(403,'PROTECTED_ACCOUNT','Administrator and current-user access are protected.');
 if(data.role==='driver'&&!/^\+9665\d{8}$/.test(data.phone||''))throw new AppError(422,'DRIVER_PHONE_REQUIRED','Enter a valid Saudi mobile number for this driver.');
 const existingGrant=await StaffEmailAccess.findOne({email:data.email});
 const driverId=user?.id||existingGrant?.boundClerkId;
 if(driverId&&await Order.exists({'deliveryAssignment.driverId':driverId,status:'out_for_delivery'})&&(!data.enabled||data.role!=='driver'||(data.phone||'')!==(existingGrant?.phone||String(user?.publicMetadata.staffPhone||''))))throw new AppError(409,'ACTIVE_DELIVERIES','Complete this driver’s active deliveries before changing or removing access.');
 let record;
 if(data.revision===0){try{record=await StaffEmailAccess.create({...data,revision:1,updatedBy:actorId});}catch(error){if((error as {code?:number}).code===11000)throw new AppError(409,'ACCESS_CHANGED','This email is already saved. Edit its existing row.');throw error;}}
 else{record=await StaffEmailAccess.findOneAndUpdate({email:data.email,revision:data.revision},{$set:{role:data.role,phone:data.phone||'',enabled:data.enabled,updatedBy:actorId},$inc:{revision:1}},{returnDocument:'after',runValidators:true});if(!record)throw new AppError(409,'ACCESS_CHANGED','This assignment changed. Reload before saving.');}
 await TeamAudit.create({actorId,targetId:record.id,action:data.enabled?'save_email_access':'disable_email_access',nextRole:data.enabled?data.role:'customer'});
 if(user&&user.emailAddresses.find(entry=>entry.id===user.primaryEmailAddressId)?.verification?.status==='verified')await syncClerkUser(await applyStaffEmailAccess(user));
 return StaffEmailAccess.findById(record.id).lean();
}
/** An explicit advanced-team change supersedes any email-based assignment. */
export async function supersedeEmailAccess(userId:string){await StaffEmailAccess.updateMany({boundClerkId:userId,enabled:true},{$set:{enabled:false},$inc:{revision:1}});}
