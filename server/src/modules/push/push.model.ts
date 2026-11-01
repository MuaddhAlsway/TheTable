import { Schema,model } from 'mongoose';
const device=new Schema({userId:{type:String,required:true,index:true},endpointHash:{type:String,required:true,unique:true},endpoint:{type:String,required:true,select:false},keys:{p256dh:{type:String,required:true,select:false},auth:{type:String,required:true,select:false}}},{timestamps:true});
export const PushDevice=model('PushDevice',device);
const job=new Schema({key:{type:String,required:true,unique:true},orderId:{type:Schema.Types.ObjectId,required:true},driverId:{type:String,required:true},deviceId:{type:Schema.Types.ObjectId,required:true},dispatchedAt:{type:Date,required:true},state:{type:String,enum:['pending','sending','sent','failed','skipped'],default:'pending'},attempts:{type:Number,default:0},nextAttemptAt:{type:Date,default:Date.now},leaseUntil:Date,leaseToken:String,lastCode:String,sentAt:Date},{timestamps:true});
job.index({state:1,nextAttemptAt:1});job.index({createdAt:1},{expireAfterSeconds:2592000});
export const PushJob=model('PushJob',job);
