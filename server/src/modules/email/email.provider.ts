import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
export class EmailError extends Error { constructor(public code: string, public retryable = false) { super(code); } }
export const emailConfigured = () => !!(env.EMAIL_FRONTEND_URL && (env.EMAIL_PROVIDER === 'gmail' ? env.GMAIL_USER && /^[a-zA-Z0-9]{16}$/.test(env.GMAIL_APP_PASSWORD?.replace(/\s/g, '') || '') : env.RESEND_API_KEY?.trim() && env.RESEND_FROM) && (env.EMAIL_MODE !== 'demo' || (env.EMAIL_TEST_RECIPIENT || env.RESEND_TEST_RECIPIENT)));
export const emailReady = () => env.EMAIL_ENABLED === 'true' && emailConfigured();
export function recipientAllowed(email: string) { return env.EMAIL_MODE !== 'demo' || email.toLowerCase() === (env.EMAIL_TEST_RECIPIENT || env.RESEND_TEST_RECIPIENT)?.toLowerCase(); }
export const gmailTransport = () => nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD?.replace(/\s/g, '') }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true });
export function smtpError(error: unknown) { const code = (error as { code?: string }).code; return new EmailError(code === 'EAUTH' ? 'GMAIL_AUTH_FAILED_USE_APP_PASSWORD' : code === 'ETIMEDOUT' || code === 'ECONNECTION' ? 'GMAIL_CONNECTION_BLOCKED_OR_UNAVAILABLE' : 'GMAIL_RESPONSE_UNKNOWN'); }
export async function verifyEmailConnection() { if (!emailConfigured()) throw new EmailError('EMAIL_SETUP_REQUIRED'); if (env.EMAIL_PROVIDER !== 'gmail') throw new EmailError('RESEND_USE_EXPLICIT_TEST'); const transport = gmailTransport(); try { await transport.verify(); return { connected: true }; } catch (error) { throw smtpError(error); } finally { transport.close(); } }
export const emailProvider = { async send(key: string, payload: string) {
  if (!emailReady()) throw new EmailError('EMAIL_SETUP_REQUIRED');
  if (env.EMAIL_PROVIDER === 'gmail') {
    const transport = gmailTransport();
    try { const data = JSON.parse(payload) as { to: string[]; subject: string; text: string }; const result = await transport.sendMail({ from: { name: 'The Table', address: env.GMAIL_USER! }, to: data.to, subject: data.subject, text: data.text, messageId: '<' + key.replace(/[^a-zA-Z0-9-]/g, '-') + '@thetable.local>' }); if (!result.accepted.length) throw new EmailError('GMAIL_RECIPIENT_REJECTED'); return result.messageId as string; } catch (error) { if (error instanceof EmailError) throw error; throw smtpError(error); } finally { transport.close(); }
  }
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: payload });
    if (!response.ok) throw new EmailError('RESEND_HTTP_' + response.status, response.status === 429 || response.status >= 500 || response.status === 409);
    const data = await response.json() as { id?: string };
    if (typeof data.id !== 'string') throw new EmailError('RESEND_RESPONSE_UNKNOWN', true);
    return data.id;
  } catch (error) { if (error instanceof EmailError) throw error; throw new EmailError('RESEND_RESPONSE_UNKNOWN', true); }
} };
export function emailPayload(recipient: string, reference: string, message: string, path: string) {
  return JSON.stringify({ from: env.EMAIL_PROVIDER === 'gmail' ? env.GMAIL_USER : env.RESEND_FROM, to: [recipient], subject: 'The Table · ' + reference, text: 'The Table\n\n' + message + '\n\nOpen your secure account: ' + env.EMAIL_FRONTEND_URL + path + (path === '/driver' ? '\n\nOpen your driver dashboard to acknowledge the assignment, collect the food and navigate to the recipient. Ask the customer for their delivery code only after handing over the food.' : '\n\nFor delivery, contact your assigned driver through your order page. Share your delivery code only after receiving the food. Your code is available only in your signed-in account.') + '\n\nManage email updates in your account settings.' });
}
