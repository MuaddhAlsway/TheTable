import { createServer } from "vite";
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = server.resolvedUrls.local[0];
  const soup = "Roasted Tomato Soup";
  const add = (name) => page.getByRole("button", { name: `Add ${name} to your order`, exact: true });
  const bag = page.locator(".navbar-bag");
  const count = async (quantity) => {
    await expect(bag).toHaveAttribute("aria-label", `Shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`);
    await expect(bag.locator(".navbar-bag__count")).toHaveText(String(quantity));
  };
  const subtotal = (amount) => expect(page.locator(".cart-page__summary strong")).toHaveText(`SAR ${amount.toFixed(2)}`);
  await page.goto(new URL("/menu", base).href);
  await count(0);
  await add(soup).click(); await add(soup).click(); await count(2);
  await add("Golden Fries").click(); await count(3);
  await page.getByRole("link", { name: "Our philosophy", exact: true }).first().click();
  await page.waitForURL("**/about"); await count(3);
  await bag.click(); await page.waitForURL("**/cart");
  await expect(page.locator(".cart-page__line")).toHaveCount(2);
  await expect(page.getByLabel(`${soup} quantity`, { exact: true })).toHaveText("2");
  await subtotal(74);
  await page.getByRole("button", { name: `Increase ${soup} quantity` }).click();
  await count(4); await subtotal(102);
  await page.getByRole("button", { name: `Decrease ${soup} quantity` }).click();
  await page.getByRole("button", { name: `Decrease ${soup} quantity` }).click();
  await count(2); await subtotal(46);
  await page.getByRole("button", { name: `Decrease ${soup} quantity` }).click();
  await expect(page.locator(".cart-page__line")).toHaveCount(1);
  await count(1); await subtotal(18);
  await page.getByRole("button", { name: "Remove Golden Fries", exact: true }).click();
  await count(0); await expect(page.getByRole("heading", { name: "Your bag is empty." })).toBeVisible();
  console.log("PASS deduplication, shared navigation state, quantities, zero removal, explicit removal, and subtotal");

  await page.getByRole("link", { name: "Explore the menu", exact: true }).click();
  await add(soup).evaluate((button) => { for (let i = 0; i < 10; i++) button.click(); });
  await count(10); await bag.click();
  await expect(page.locator(".cart-page__line")).toHaveCount(1);
  await expect(page.getByLabel(`${soup} quantity`, { exact: true })).toHaveText("10");
  await subtotal(280);
  await page.getByRole("button", { name: `Remove ${soup}`, exact: true }).click();
  await count(0);
  console.log("PASS rapid additions and removing a multi-quantity line");

  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("link", { name: "Explore the menu", exact: true }).click();
  await add("The Table Burger").click(); await count(1); await bag.click(); await subtotal(59);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.reload(); await count(0);
  await expect(page.getByRole("heading", { name: "Your bag is empty." })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log("PASS mobile cart layout, in-memory reset on refresh, and no runtime errors");
} finally {
  await browser?.close();
  await server.close();
}
