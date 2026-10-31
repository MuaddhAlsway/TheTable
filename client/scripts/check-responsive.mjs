import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
await server.listen();
const baseURL = server.resolvedUrls.local[0];
const cache = path.resolve("node_modules/.cache/responsive-check");
await mkdir(cache, { recursive: true });
const profile = await mkdtemp(path.join(cache, "browser-"));
let context;
try {
  context = await chromium.launchPersistentContext(profile, { channel: process.env.BROWSER_CHANNEL || "chrome", headless: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const checkWidth = async (label) => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Horizontal overflow: ${label}`);
  const paths = ["/", "/about", "/menu", "/locations", "/reservations", "/contact", "/login", "/cart", "/privacy", "/missing"];
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of paths) {
      await page.goto(new URL(route, baseURL).href);
      await page.evaluate(() => document.fonts.ready);
      await checkWidth(`${width}px ${route}`);
    }
    console.log(`PASS all routes at ${width}px`);
  }
  for (const viewport of [{ width: 320, height: 700 }, { width: 768, height: 1024 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto(baseURL);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const menu = page.locator("#navbar-mobile-menu");
    assert.ok(await menu.isVisible());
    await checkWidth(`open menu ${viewport.width}px`);
    await menu.getByRole("link", { name: "Get in touch" }).click();
    await page.waitForURL("**/contact");
    assert.equal(await menu.isVisible(), false);
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await page.keyboard.press("Escape");
    assert.equal(await menu.isVisible(), false);
    console.log(`PASS navigation ${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await page.getByRole("button", { name: "Next dish" }).click();
  assert.ok((await page.locator(".hero-dish-caption").innerText()).includes("Margherita Pizza"));
  await page.getByRole("button", { name: "Pizza", exact: true }).last().click();
  assert.equal(await page.locator(".menu-card").count(), 1);
  await page.getByRole("button", { name: "All dishes", exact: true }).click();
  for (const image of await page.locator(".menu-card__image").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((img) => img.decode());
  }
  assert.deepEqual(errors, []);
  console.log("PASS mobile hero, filters, food images, and runtime checks");
} finally {
  await context?.close();
  await server.close();
}
