import { Order } from '../orders/order.model.js';
import { AppError } from '../../utils/errors.js';
export async function updateDeliveryProgress(id:string,data:{kind:'acknowledge'|'collect'|'arrive'|'report_issue';expectedUpdatedAt:string;category?:string;note:string},driverId:string){
 const order=await Order.findOne({_id:id,status:'out_for_delivery','deliveryAssignment.driverId':driverId});
 if(!order)throw new AppError(404,'NOT_FOUND','Active assigned delivery not found.');
 if(order.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new AppError(409,'STALE_ORDER','Delivery changed. Refresh before continuing.');
 const now=new Date();let changes:Record<string,unknown>={};
 if(data.kind==='report_issue'){
 if(!data.category||!data.note.trim())throw new AppError(422,'ISSUE_DETAILS_REQUIRED','Describe the delivery problem.');
 if(order.deliveryIssue?.reportedAt&&!order.deliveryIssue.resolvedAt)throw new AppError(409,'ISSUE_ALREADY_OPEN','An issue is already awaiting cashier review.');
 changes={deliveryIssue:{category:data.category,note:data.note,reportedAt:now,reportedBy:driverId}};
 }else{
 const field={acknowledge:'acknowledgedAt',collect:'collectedAt',arrive:'arrivedAt'}[data.kind] as 'acknowledgedAt'|'collectedAt'|'arrivedAt';
 if(order.deliveryProgress?.[field])return;
 if(data.kind==='collect'&&!order.deliveryProgress?.acknowledgedAt||data.kind==='arrive'&&!order.deliveryProgress?.collectedAt)throw new AppError(409,'INVALID_DELIVERY_PROGRESS','Acknowledge the assignment, then collect the order before arrival.');
 changes['deliveryProgress.'+field]=now;
 }
 const result=await Order.updateOne({_id:id,status:'out_for_delivery','deliveryAssignment.driverId':driverId,updatedAt:order.updatedAt},{$set:changes,$push:{deliveryEvents:{kind:data.kind,note:data.note,at:now,actorId:driverId}}},{runValidators:true});
 if(!result.matchedCount)throw new AppError(409,'STALE_ORDER','Delivery changed. Refresh before continuing.');
}
export async function resolveDeliveryIssue(id:string,data:{expectedUpdatedAt:string;resolution:string},actorId:string){
 const order=await Order.findById(id);
 if(!order||order.status!=='out_for_delivery'||!order.deliveryIssue?.reportedAt||order.deliveryIssue.resolvedAt)throw new AppError(409,'NO_OPEN_ISSUE','No active delivery issue to resolve.');
 const now=new Date();const result=await Order.updateOne({_id:id,status:'out_for_delivery',updatedAt:new Date(data.expectedUpdatedAt)},{$set:{'deliveryIssue.resolvedAt':now,'deliveryIssue.resolvedBy':actorId,'deliveryIssue.resolution':data.resolution},$push:{deliveryEvents:{kind:'resolve_issue',note:data.resolution,at:now,actorId}}},{runValidators:true});
 if(!result.matchedCount)throw new AppError(409,'STALE_ORDER','Delivery changed. Refresh before continuing.');
}
