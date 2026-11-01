import { createECDH } from 'node:crypto';
import webpush from 'web-push';
import { env } from '../../config/env.js';
export function pushReady(){if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.WEB_PUSH_SUBJECT)return false;try{const key=createECDH('prime256v1');key.setPrivateKey(Buffer.from(env.VAPID_PRIVATE_KEY,'base64url'));return key.getPublicKey().toString('base64url')===env.VAPID_PUBLIC_KEY;}catch{return false;}}
export function pushOptions(){if(!pushReady())throw new Error('PUSH_SETUP_REQUIRED');return {vapidDetails:{subject:env.WEB_PUSH_SUBJECT!,publicKey:env.VAPID_PUBLIC_KEY!,privateKey:env.VAPID_PRIVATE_KEY!},TTL:300,urgency:'high' as const,timeout:10000};}
export const sendPush=webpush;
