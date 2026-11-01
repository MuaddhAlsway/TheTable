import { Router } from 'express';
import { z } from 'zod';
import { trusted } from 'mongoose';
import { clerk } from '../../config/clerk.js';
import { env, clientOrigins } from '../../config/env.js';
import { UserProfile } from '../users/user.model.js';
import { syncClerkUser } from '../users/user.service.js';
import { Order } from '../orders/order.model.js';
import { TeamAudit } from './team.model.js';
import { verifiedRole } from '../../utils/roles.js';
import { phone, text } from '../../utils/validation.js';
import { actor } from '../../utils/roles.js';
import { AppError } from '../../utils/errors.js';
import { validateRequest, input } from '../../middleware/validateRequest.js';
import { staffMutationLimit } from '../../middleware/rateLimits.js';
const role = z.enum(['cashier', 'kitchen', 'driver']);
const fields = { role, displayName: text(120), phone: z.union([z.literal(''), phone]).default('') };
const entry = z.object({ email: z.string().trim().email().toLowerCase(), ...fields }).strict().refine(v => v.role !== 'driver' || !!v.phone, 'Drivers need a Saudi mobile number.');
const update = z.object({ ...fields, expectedUpdatedAt: z.number().int() }).strict().refine(v => v.role !== 'driver' || !!v.phone, 'Drivers need a Saudi mobile number.');
const idInput = z.object({ id: z.string().regex(/^user_[a-zA-Z0-9]+$/) }).strict();
const safe = (user: Awaited<ReturnType<typeof clerk.users.getUser>>) => ({ id: user.id, name: String(user.publicMetadata.staffDisplayName || [user.firstName, user.lastName].filter(Boolean).join(' ')), email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || '', role: verifiedRole(user.publicMetadata.role), phone: String(user.publicMetadata.staffPhone || ''), updatedAt: user.updatedAt, protected: verifiedRole(user.publicMetadata.role) === 'admin' });
async function protect(user: Awaited<ReturnType<typeof clerk.users.getUser>>, actorId: string) {
  const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
  if (user.id === actorId || verifiedRole(user.publicMetadata.role) === 'admin' || email?.emailAddress.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()) throw new AppError(403, 'PROTECTED_ACCOUNT', 'Administrator and current-user access cannot be changed here.');
  if (!email || email.verification?.status !== 'verified') throw new AppError(422, 'VERIFIED_EMAIL_REQUIRED', 'The teammate must verify their primary email before access can be assigned.');
  if (await Order.exists({ 'deliveryAssignment.driverId': user.id, status: 'out_for_delivery' })) throw new AppError(409, 'ACTIVE_DELIVERIES', 'This driver has active deliveries. Complete those deliveries before changing access.');
}
export const teamRoutes = Router();
teamRoutes.get('/', async (_req, res) => {
  const profiles = await UserProfile.find(trusted({ $or: [{ staffManaged: true }, { role: { $in: ['admin','cashier','kitchen','driver'] } }] })).limit(100).lean();
  const users = await Promise.all(profiles.map(profile => clerk.users.getUser(profile.clerkId)));
  const invites = await clerk.invitations.getInvitationList({ status: 'pending', limit: 100 });
  res.json({ data: { users: users.map(safe), invitations: invites.data.filter(item => item.publicMetadata?.application === 'thetable-staff').map(item => ({ id: item.id, email: item.emailAddress, role: item.publicMetadata?.role, name: item.publicMetadata?.staffDisplayName, status: item.status })) } });
});
teamRoutes.post('/', staffMutationLimit, validateRequest(entry), async (_req, res) => {
  const data = input<z.infer<typeof entry>>(res); const current = actor(res);
  const matches = await clerk.users.getUserList({ emailAddress: [data.email], limit: 10 });
  if (matches.data.length !== 1) throw new AppError(422, 'ACCOUNT_REQUIRED', 'No unique registered account was found. Use Send invitation for a new teammate.');
  const user = matches.data[0]; if (user.emailAddresses.find(email => email.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase() !== data.email) throw new AppError(422, 'VERIFIED_PRIMARY_REQUIRED', 'Use the teammate’s verified primary email.'); await protect(user, current.userId);
  const updated = await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role: data.role, staffDisplayName: data.displayName, staffPhone: data.phone, staffManaged: true } });
  await syncClerkUser(updated); await TeamAudit.create({ actorId: current.userId, targetId: user.id, action: 'assign_staff', previousRole: verifiedRole(user.publicMetadata.role), nextRole: data.role });
  res.json({ data: safe(updated) });
});
teamRoutes.patch('/:id', staffMutationLimit, validateRequest(idInput, 'params'), validateRequest(update), async (_req, res) => {
  const data = input<z.infer<typeof update>>(res), id = input<{ id: string }>(res,'params').id, current = actor(res);
  const user = await clerk.users.getUser(id); await protect(user, current.userId);
  if (user.updatedAt !== data.expectedUpdatedAt) throw new AppError(409, 'STAFF_CHANGED', 'Staff details changed. Refresh before editing.');
  const updated = await clerk.users.updateUserMetadata(id, { publicMetadata: { role: data.role, staffDisplayName: data.displayName, staffPhone: data.phone, staffManaged: true } });
  await syncClerkUser(updated); await TeamAudit.create({ actorId: current.userId, targetId: id, action: 'edit_staff', previousRole: verifiedRole(user.publicMetadata.role), nextRole: data.role });
  res.json({ data: safe(updated) });
});
teamRoutes.delete('/:id', staffMutationLimit, validateRequest(idInput, 'params'), validateRequest(z.object({ expectedUpdatedAt: z.number().int() }).strict()), async (_req,res) => {
  const id = input<{id:string}>(res,'params').id, current = actor(res), user = await clerk.users.getUser(id); await protect(user,current.userId);
  if (user.updatedAt !== input<{expectedUpdatedAt:number}>(res).expectedUpdatedAt) throw new AppError(409,'STAFF_CHANGED','Staff details changed. Refresh before removing access.');
  const updated = await clerk.users.updateUserMetadata(id,{publicMetadata:{role:'customer',staffManaged:true}}); await syncClerkUser(updated);
  await TeamAudit.create({actorId:current.userId,targetId:id,action:'remove_staff',previousRole:verifiedRole(user.publicMetadata.role),nextRole:'customer'});
  res.json({data:safe(updated),message:'Staff access removed. The account and its customer records are preserved.'});
});
teamRoutes.post('/invitations', staffMutationLimit, validateRequest(entry), async (req,res) => {
  const data=input<z.infer<typeof entry>>(res); const origin=req.header('origin');
  if (!origin || !clientOrigins.includes(origin)) throw new AppError(403,'ORIGIN_FORBIDDEN','Open staff invitations from the configured restaurant website.');
  if (data.email===env.ADMIN_EMAIL.toLowerCase()) throw new AppError(403,'PROTECTED_ACCOUNT','This account is protected.');
  const existing=await clerk.users.getUserList({emailAddress:[data.email],limit:1});
  if(existing.data.length) throw new AppError(422,'ACCOUNT_EXISTS','This person already has an account. Choose Assign an existing account.');
  const invite=await clerk.invitations.createInvitation({emailAddress:data.email,redirectUrl:(clientOrigins.find(value=>value.startsWith('https://'))||origin)+'/signup',notify:true,ignoreExisting:false,expiresInDays:7,publicMetadata:{application:'thetable-staff',role:data.role,staffDisplayName:data.displayName,staffPhone:data.phone,staffManaged:true}});
  await TeamAudit.create({actorId:actor(res).userId,targetId:invite.id,action:'invite_staff',nextRole:data.role});
  res.status(201).json({data:{id:invite.id,email:invite.emailAddress,status:invite.status},message:'Clerk staff invitation sent.'});
});
teamRoutes.delete('/invitations/:invitationId', staffMutationLimit, validateRequest(z.object({invitationId:z.string().regex(/^inv_[a-zA-Z0-9]+$/)}).strict(),'params'), async (_req,res) => {
  const id=input<{invitationId:string}>(res,'params').invitationId;
  const invitations=await clerk.invitations.getInvitationList({status:'pending',query:id,limit:100});
  if (!invitations.data.some(item=>item.id===id&&item.publicMetadata?.application==='thetable-staff')) throw new AppError(404,'NOT_FOUND','Pending staff invitation not found.');
  await clerk.invitations.revokeInvitation(id);await TeamAudit.create({actorId:actor(res).userId,targetId:id,action:'revoke_invitation'});res.json({data:{revoked:true}});
});
