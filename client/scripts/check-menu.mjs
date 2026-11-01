import { createPreviewServer as createServer } from "./test-server.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const url = new URL("/menu", server.resolvedUrls.local[0]).href;
  for (const width of [320, 390, 600, 768, 820, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Overflow at ${width}`);
    console.log(`PASS menu layout ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await page.getByRole("button", { name: "Starters 02", exact: true }).click();
  assert.equal(await page.locator(".menu-item-card").count(), 2);
  await page.getByRole("searchbox", { name: "Search dishes" }).fill("burrata");
  assert.equal(await page.locator(".menu-item-card").count(), 1);
  await page.getByRole("searchbox", { name: "Search dishes" }).fill("nothingmatches");
  assert.equal(await page.locator(".menu-item-card").count(), 0);
  await page.getByRole("button", { name: "Show all dishes" }).click();
  assert.equal(await page.locator(".menu-item-card").count(), 6);
  await page.getByRole("button", { name: "Add Roasted Tomato Soup to your order" }).click();
  assert.ok((await page.locator(".menu-page__notice").innerText()).includes("Roasted Tomato Soup added to your bag"));
  await page.getByRole("button", { name: "Dismiss selection notice" }).click();
  for (const image of await page.locator(".menu-item-card__image img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => img.decode());
  }
  if (process.env.MENU_SCREENSHOT_DIR) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${process.env.MENU_SCREENSHOT_DIR}/menu-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${process.env.MENU_SCREENSHOT_DIR}/menu-desktop.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("PASS categories, search, empty-state reset, selection notice, images, and runtime checks");
} finally {
  await browser?.close();
  await server.close();
}
