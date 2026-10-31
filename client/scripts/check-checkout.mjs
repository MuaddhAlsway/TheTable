import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";

// Synthetic fixtures ONLY. Never write these values to the restaurant config.
const configured = {
  currency: "SAR",
  pickup: { enabled: true, restaurantAddress: "TEST ONLY — collection address", openingHours: "TEST ONLY — collection hours", collectionInstructions: "TEST ONLY — collect at test counter", preparationTimeMinutes: 20 },
  delivery: { enabled: true, supportedAreas: [{ city: "Test City", neighborhood: "Test Neighborhood", postalCodes: ["TEST-001"] }], fee: 12.5, minimumOrder: 50, estimatedMinutes: { min: 30, max: 45 } },
};
const fixtureServer = async (fixture) => {
  const plugins = fixture ? [{ name: "fulfillment-test-fixture", enforce: "pre", load(id) { if (id.replaceAll("\\", "/").split("?")[0].endsWith("/src/config/fulfillment.ts")) return `export const fulfillmentConfig = ${JSON.stringify(fixture)};`; } }] : [];
  const server = await createServer({ plugins, server: { host: "127.0.0.1", port: 0 } });
  await server.listen();
  return server;
};
let browser;
const servers = [];
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
  const defaultServer = await fixtureServer(); servers.push(defaultServer);
  const { fulfillmentConfig: actual } = await defaultServer.ssrLoadModule("/src/config/fulfillment.ts");
  const rules = await defaultServer.ssrLoadModule("/src/utils/fulfillment.ts");
  const { normalizeSaudiMobile } = await defaultServer.ssrLoadModule("/src/utils/saudiPhone.ts");
  for (const input of ["0512345678", "512345678", "+966512345678", "05 1234 5678", "(05) 123-45678", "+966 (5) 1234-5678", " 512-345-678 "]) {
    assert.equal(normalizeSaudiMobile(input), "+966512345678", input);
    assert.equal(normalizeSaudiMobile(normalizeSaudiMobile(input)), "+966512345678");
  }
  for (const input of ["", "0412345678", "123456789", "51234567", "5123456789", "05123456789", "+9660512345678", "+971512345678", "+966612345678", "966512345678", "00966512345678", "05abc12345678", "05.123.45678", "++966512345678"]) assert.equal(normalizeSaudiMobile(input), null, input);
  console.log("PASS Saudi phone normalization, formatting, invalid characters/country/prefix, and exact digit counts");
  assert.equal(actual.pickup.enabled, false); assert.equal(actual.delivery.enabled, false);
  assert.equal(rules.isFulfillmentAvailable(actual, "delivery"), false);
  assert.ok(rules.getDeliveryAreaError(actual, "Test City", "Test Neighborhood", "TEST-001"));
  assert.equal(rules.getDeliveryAreaError(configured, "  test city  ", "test neighborhood", "test-001"), null);
  assert.ok(rules.getDeliveryAreaError(configured, "Other city", "Test Neighborhood", "TEST-001"));
  assert.ok(rules.getDeliveryAreaError(configured, "Test City", "Other neighborhood", "TEST-001"));
  assert.ok(rules.getDeliveryAreaError(configured, "Test City", "Test Neighborhood", "UNKNOWN"));
  assert.deepEqual(rules.getFulfillmentTotals(56, configured, "delivery"), { deliveryFee: 12.5, total: 68.5, minimumShortfall: 0 });
  assert.equal(rules.getFulfillmentTotals(40, configured, "delivery").minimumShortfall, 10); // Fee cannot satisfy minimum.
  assert.equal(rules.getFulfillmentTotals(50, configured, "delivery").minimumShortfall, 0);
  assert.equal(rules.getFulfillmentTotals(56, configured, "pickup").total, 56);
  const free = structuredClone(configured); free.delivery.fee = 0; free.delivery.minimumOrder = 0;
  assert.equal(rules.isFulfillmentAvailable(free, "delivery"), true);
  assert.equal(rules.getFulfillmentTotals(28, free, "delivery").total, 28);
  for (const value of [null, -1, Number.NaN, 1.001]) { const bad = structuredClone(configured); bad.delivery.fee = value; assert.equal(rules.isFulfillmentAvailable(bad, "delivery"), false); }
  console.log("PASS fulfillment setup, service areas/postal codes, money validation, minimum boundaries, and totals");

  const errors = [], apiRequests = [];
  const makePage = async () => { const page = await browser.newPage(); page.on("pageerror", e => errors.push(e.message)); page.on("request", r => { if (["fetch", "xhr"].includes(r.resourceType()) || r.method() === "POST") apiRequests.push(r.url()); }); return page; };
  const enterCheckout = async (page, server, additions = 1) => {
    await page.goto(new URL("/menu", server.resolvedUrls.local[0]).href);
    for (let i = 0; i < additions; i++) await page.getByRole("button", { name: "Add Roasted Tomato Soup to your order" }).click();
    await page.locator(".navbar-bag").click(); await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await page.waitForURL("**/checkout");
  };
  const page = await makePage();
  await page.goto(new URL("/checkout", defaultServer.resolvedUrls.local[0]).href);
  await expect(page.getByRole("heading", { name: "Your bag is waiting for something good." })).toBeVisible();
  await enterCheckout(page, defaultServer);
  await expect(page.getByRole("radio", { name: /Delivery/ })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Pickup/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
  await expect(page.getByText("Delivery service areas have not been configured. No address can be confirmed as supported.", { exact: true })).toBeVisible();
  await expect(page.locator(".checkout-page__total dd")).toHaveText("Unavailable");
  await page.close();
  console.log("PASS default setup placeholders, disabled choices, no serviceability claim, and empty cart");

  const setupCases = [
    { label: "empty areas", mutate: c => { c.delivery.supportedAreas = []; }, message: "Delivery service areas have not been configured. No address can be confirmed as supported." },
    { label: "missing fee", mutate: c => { c.delivery.fee = null; }, message: "Delivery fee has not been configured correctly." },
  ];
  for (const test of setupCases) {
    const fixture = structuredClone(configured); fixture.pickup.enabled = false; test.mutate(fixture);
    const server = await fixtureServer(fixture); servers.push(server);
    const p = await makePage(); await enterCheckout(p, server);
    await expect(p.getByRole("radio", { name: /Delivery/ })).toBeDisabled();
    await expect(p.getByRole("button", { name: "Continue to payment" })).toBeDisabled();
    await expect(p.getByText(test.message, { exact: true })).toBeVisible();
    await p.close(); console.log(`PASS enabled-but-incomplete config: ${test.label}`);
  }

  const server = await fixtureServer(configured); servers.push(server);
  const p = await makePage(); await enterCheckout(p, server);
  const submit = p.getByRole("button", { name: "Continue to payment" });
  await expect(submit).toBeDisabled();
  await expect(p.getByText(/Add SAR 22.00 more in items/)).toBeVisible();
  await expect(p.locator(".checkout-page__total dd")).toHaveText("SAR 40.50");
  await p.getByRole("link", { name: "The menu", exact: true }).first().click();
  await p.getByRole("button", { name: "Add Roasted Tomato Soup to your order" }).click();
  await p.locator(".navbar-bag").click(); await p.getByRole("link", { name: "Proceed to checkout" }).click();
  await expect(p.locator(".checkout-page__total dd")).toHaveText("SAR 68.50");
  await submit.click();
  await expect(p.getByLabel("Full name", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(p.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
  await p.getByLabel("Full name", { exact: true }).fill("Test Guest");
  await p.getByLabel("Email address", { exact: true }).fill("not-an-email");
  await p.getByLabel("Phone number", { exact: true }).fill("letters");
  await submit.click(); await expect(p.getByLabel("Email address", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await p.getByLabel("Email address", { exact: true }).fill("guest@example.com");
  const customerPhone = p.getByLabel("Phone number", { exact: true });
  await expect(customerPhone).toHaveAttribute("aria-invalid", "true");
  await expect(customerPhone).toHaveAttribute("aria-describedby", /checkout-phone-error/);
  await expect(p.locator(".checkout-page__phone-country").first()).toHaveText("Saudi Arabia · +966");
  await customerPhone.fill("05123456789");
  await customerPhone.blur();
  await expect(customerPhone).toHaveValue("05123456789");
  await expect(customerPhone).toHaveAttribute("aria-invalid", "true");
  for (const input of ["0512345678", "512345678", "+966 (5) 1234-5678"]) {
    await customerPhone.fill(input);
    await customerPhone.blur();
    await expect(customerPhone).toHaveValue("+966512345678");
    assert.notEqual(await customerPhone.getAttribute("aria-invalid"), "true");
  }
  await p.getByRole("radio", { name: /Pickup/ }).check();
  await expect(p.getByLabel("Street address", { exact: true })).toHaveCount(0);
  await expect(p.getByText(configured.pickup.restaurantAddress, { exact: true })).toBeVisible();
  await expect(p.getByText(configured.pickup.openingHours, { exact: true })).toBeVisible();
  await expect(p.getByText(configured.pickup.collectionInstructions, { exact: true })).toBeVisible();
  await expect(p.locator(".checkout-page__total dd")).toHaveText("SAR 56.00");
  await submit.click(); await expect(p.getByText("Choose the available pickup timing.", { exact: true })).toBeVisible();
  await p.getByLabel("Available pickup timing").selectOption("asap");
  await submit.click(); await expect(p.locator(".checkout-page__status")).toContainText("No order has been placed");
  await p.getByRole("radio", { name: /Delivery/ }).check();
  for (const [label, value] of [["Recipient name", "Test Recipient"], ["Recipient phone", "(05) 000-00001"], ["City", "Test City"], ["Neighborhood", "Outside"], ["Street address", "TEST ONLY street"], ["Building / unit details", "TEST ONLY unit"]]) await p.getByLabel(label, { exact: true }).fill(value);
  await submit.click(); await expect(p.getByLabel("Neighborhood", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await p.getByLabel("Neighborhood", { exact: true }).fill("Test Neighborhood");
  await p.getByLabel("Postal code", { exact: true }).fill("WRONG");
  await submit.click(); await expect(p.getByLabel("Postal code", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await p.getByLabel("Postal code", { exact: true }).fill("TEST-001");
  await submit.click(); await expect(p.locator(".checkout-page__status")).toContainText("Backend order creation and payment integration are not connected");
  await expect(p.locator(".checkout-page__total dd")).toHaveText("SAR 68.50");
  await expect(p.getByLabel("Phone number", { exact: true })).toHaveValue("+966512345678");
  await expect(p.getByLabel("Recipient phone", { exact: true })).toHaveValue("+966500000001");
  for (const width of [320, 390, 768, 1024, 1440]) { await p.setViewportSize({ width, height: 1000 }); await p.evaluate(() => document.fonts.ready); assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow at ${width}px`); }
  assert.deepEqual(apiRequests, []); assert.deepEqual(errors, []);
  await p.close();
  console.log("PASS configured pickup timing, delivery validation, minimum/fee, responsive layout, demo submission, and no API calls");
} finally {
  await browser?.close();
  for (const server of servers.reverse()) await server.close();
}
