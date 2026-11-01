import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
// Render environment variables take precedence; local .env values are never overwritten.
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
config({ path: fileURLToPath(new URL('../../.env.push.local', import.meta.url)), quiet: true });
const schema = z.object({
  EMAIL_PROVIDER: z.enum(['gmail', 'resend']).default('gmail'),
  GMAIL_USER: z.string().email().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_ENABLED: z.enum(['true', 'false']).default('false'),
  EMAIL_MODE: z.enum(['demo', 'production']).default('demo'),
  RESEND_API_KEY: z.string().trim().optional(),
  RESEND_FROM: z.string().email().optional(),
  EMAIL_TEST_RECIPIENT: z.string().email().optional(),
  RESEND_TEST_RECIPIENT: z.string().email().optional(),
  EMAIL_DAILY_LIMIT: z.coerce.number().int().min(1).max(1000).default(50),
  EMAIL_FRONTEND_URL: z.string().refine(value => { try { const u = new URL(value); return u.origin === value && !u.username && !u.password && (u.protocol === 'https:' || (u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))); } catch { return false; } }, 'Use an exact frontend origin.').optional(),
  SMS_PROVIDER: z.enum(['android', 'infobip']).default('android'),
  API_KEY: z.string().optional(),
  INFOBIP_API_KEY: z.string().optional(),
  INFOBIP_SENDER: z.string().trim().max(50).optional(),
  INFOBIP_BASE_URL: z.string().refine(value => { try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname === 'api.infobip.com' || /^[a-z0-9-]+\.api\.infobip\.com$/i.test(url.hostname)) && !url.port && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash; } catch { return false; } }, 'Use the HTTPS Infobip account origin only.').optional(),
  SMS_ENABLED: z.enum(['true','false']).default('false'),
  SMS_GATEWAY_TOKEN: z.string().optional(),
  SMS_GATEWAY_USERNAME: z.string().optional(),
  SMS_GATEWAY_PASSWORD: z.string().optional(),
  SMS_GATEWAY_DEVICE_ID: z.string().max(21).optional(),
  SMS_GATEWAY_SIM_NUMBER: z.coerce.number().int().min(1).max(3).default(1),
  SMS_DAILY_LIMIT: z.coerce.number().int().min(1).max(500).default(100),
  VAPID_PUBLIC_KEY: z.string().regex(/^[A-Za-z0-9_-]{87}$/).optional(),
  VAPID_PRIVATE_KEY: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
  WEB_PUSH_SUBJECT: z.string().refine(value => /^mailto:[^\s@]+@[^\s@]+$/.test(value) || (()=>{try{return new URL(value).protocol==='https:';}catch{return false;}})()).optional(),
  DRIVER_ACK_TIMEOUT_SECONDS: z.coerce.number().int().min(30).max(3600).default(120),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1).refine(value => /^mongodb(?:\+srv)?:\/\//.test(value), 'Invalid database configuration.'),
  MONGODB_DB_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
  MONGODB_DNS_SERVERS: z.string().optional(),
  CLERK_SECRET_KEY: z.string().trim().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLIENT_ORIGINS: z.string().optional(),
  ADMIN_EMAIL: z.string().email().default('muaddhalsway@gmail.com'),
  ORDER_CREATION_ENABLED: z.enum(['true', 'false']).default('false').describe('Stripe readiness and confirmed fulfillment remain mandatory.'),
  RESERVATION_CREATION_ENABLED: z.enum(['true', 'false']).default('false').describe('Reservation requests use the saved restaurant schedule and party limit.'),
}).superRefine((value, ctx) => {
  if (value.EMAIL_MODE === 'production' && value.RESEND_FROM?.endsWith('@resend.dev')) ctx.addIssue({ code: 'custom', path: ['RESEND_FROM'], message: 'Production email requires your verified domain.' });
  if (value.NODE_ENV === 'production' && value.EMAIL_FRONTEND_URL?.startsWith('http:')) ctx.addIssue({ code: 'custom', path: ['EMAIL_FRONTEND_URL'], message: 'Production requires HTTPS.' });
  if (value.NODE_ENV !== 'production') return;
  for (const name of ['CLERK_PUBLISHABLE_KEY'] as const) {
    if (!value[name]?.trim()) ctx.addIssue({ code: 'custom', path: [name], message: 'Required for production.' });
  }
  // Missing optional integration settings disable their features, not API health.
  // Payment readiness still requires both Stripe credentials at request time.
});
const parsed = schema.safeParse(process.env);
// Only field names are included. Zod issues and process.env are never logged.
if (!parsed.success) throw new Error('Missing or invalid server configuration: ' + [...new Set(parsed.error.issues.map(issue => issue.path.join('.')))].join(', '));
export const env = parsed.data;
const origins = env.CLIENT_ORIGINS?.trim() || (env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173');
export const clientOrigins = [...new Set(origins.split(',').map(value => value.trim()).filter(Boolean))];
if (clientOrigins.some(origin => {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin || origin.includes('*') || url.username || url.password) return true;
    return env.NODE_ENV === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  } catch { return true; }
})) throw new Error('CLIENT_ORIGINS must contain exact origins without paths or wildcards; production requires HTTPS frontend origins.');
// Clerk Express needs this in addition to the public Vite key in the frontend.
export const serverPublishableKey = env.CLERK_PUBLISHABLE_KEY?.trim() || undefined;
