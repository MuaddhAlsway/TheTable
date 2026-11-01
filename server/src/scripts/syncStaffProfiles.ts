import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { clerk } from '../config/clerk.js';
import { UserProfile } from '../modules/users/user.model.js';
import { syncClerkUser } from '../modules/users/user.service.js';
async function main(){
 await connectDatabase();
 const profiles=await UserProfile.find().select('clerkId').lean();let synced=0,failed=0;
 for(const profile of profiles){try{await syncClerkUser(await clerk.users.getUser(profile.clerkId));synced++;}catch{failed++;}}
 console.log(JSON.stringify({synced,failed}));if(failed)process.exitCode=1;
}
main().catch(()=>{console.error('Profile synchronization failed. Secret details withheld.');process.exitCode=1;}).finally(()=>mongoose.disconnect());
