import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { fixtureServer, installRoutes, state } from './flow-fixture.mjs';
const server = await fixtureServer(); let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await installRoutes(page); state.smsAvailable = true; state.reservations.clear(); state.failFirstReservationReply = true;
  const base = server.resolvedUrls.local[0]; const go = path => page.goto(new URL(path, base).href);
  await go('/reservations'); const consent = page.getByRole('checkbox', { name: /Send service SMS updates/ }); await expect(consent).not.toBeChecked();
  await page.getByLabel('Full name', { exact: true }).fill('TEST SMS'); await page.getByLabel('Email address', { exact: true }).fill('fixture@example.invalid'); await page.getByLabel('Phone number', { exact: true }).fill('0512345678'); await page.getByLabel('Number of guests', { exact: true }).fill('2'); await page.getByLabel('Date and time (Saudi Arabia)', { exact: true }).fill(new Date(Date.now() + 86400000 + 3 * 3600000).toISOString().slice(0,16)); await consent.check();
  await page.getByRole('button', { name: 'Request a table', exact: true }).click(); await expect(page.getByText('Transient reservation fixture; retry safely.', { exact: true })).toBeVisible(); await page.reload(); await expect(consent).toBeChecked(); await page.getByRole('button', { name: 'Request a table', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Your request is with us.', exact: true })).toBeVisible();
  const posted = state.requests.filter(request => request.path === '/reservations' && request.method === 'POST'); assert.equal(posted[0].body.smsConsent, true); assert.equal(posted[0].key, posted[1].key); assert.equal(state.reservations.size, 1);
  await go('/account'); await page.getByRole('button', { name: 'Pause all SMS updates', exact: true }).click(); await expect(page.getByText('All SMS updates are paused.', { exact: true })).toBeVisible(); assert.equal(state.smsBlocked, true);
  state.role = 'admin'; await page.evaluate(() => sessionStorage.setItem('fixture-role', 'admin')); await go('/admin/sms');
  await page.getByRole('button', { name: 'Check gateway connection', exact: true }).click(); await expect(page.getByText('Gateway account and selected device found.', { exact: false })).toBeVisible();
  assert.equal(state.requests.some(request => request.path === '/admin/sms/test'), false);
  await page.getByRole('button', { name: 'Enable SMS sending', exact: true }).click(); await expect(page.getByRole('button', { name: 'Pause SMS sending', exact: true })).toBeVisible();
  await page.getByLabel('Saudi test mobile number', { exact: true }).fill('0512345678'); await page.getByRole('button', { name: 'Review test SMS', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('SMS charges or trial allowance usage may apply'); assert.equal(state.requests.some(request => request.path === '/admin/sms/test'), false); await page.getByRole('button', { name: 'Queue real test SMS', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); assert.equal(state.requests.find(request => request.path === '/admin/sms/test').body.phone, '+966512345678');
  for (const width of [320, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'SMS admin overflow at ' + width); }
  state.smsProvider='infobip'; await page.reload(); await expect(page.getByRole('heading',{name:'Connect Infobip',exact:true})).toBeVisible(); await expect(page.getByText('Infobip trial restrictions and paid SMS charges apply.',{exact:false})).toBeVisible(); await page.getByRole('button',{name:'Check gateway connection',exact:true}).click(); await expect(page.getByText('Infobip API access verified.',{exact:false})).toBeVisible();
  assert.deepEqual(errors, []); console.log('PASS SMS opt-in/draft/idempotency, account pause, admin connection/enable/test review and responsive UI. API fixtures only; no real SMS sent.');
} finally { await browser?.close(); await server.close(); }
