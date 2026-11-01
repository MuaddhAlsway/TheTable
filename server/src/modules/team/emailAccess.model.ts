import { Schema, model } from 'mongoose';
const schema=new Schema({email:{type:String,required:true,unique:true},role:{type:String,enum:['cashier','kitchen'],required:true},enabled:{type:Boolean,default:true},boundClerkId:{type:String,default:null},revision:{type:Number,required:true},appliedRevision:{type:Number,default:0},updatedBy:{type:String,required:true}},{timestamps:true});
export const StaffEmailAccess=model('StaffEmailAccess',schema);
