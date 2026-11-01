import { createServer } from 'vite';
// These overrides exist only in the test Vite instance. Local .env files are untouched.
export function createPreviewServer(options = {}) {
  return createServer({ ...options, define: { 'import.meta.env.VITE_API_URL': JSON.stringify(''), 'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(''), ...options.define } });
}
