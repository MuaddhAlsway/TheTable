import { createPreviewServer as createServer } from "./test-server.mjs";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter, useRoutes } from "react-router-dom";
import assert from "node:assert/strict";

const server = await createServer({ server: { middlewareMode: true } });
try {
  const { routes } = await server.ssrLoadModule("/src/app/router.tsx");
  function TestRoutes() { return useRoutes(routes); }
  const cases = [
    ["/", "Good pasta."], ["/about", "More than"],
    ["/menu", "made for sharing."], ["/locations", "Your people."],
    ["/reservations", "Account setup required."], ["/contact", "Let&#x27;s talk."],
    ["/login", "Welcome back."], ["/cart", "Your shopping bag."], ["/checkout", "A little closer to delicious."],
    ["/privacy", "Your privacy."], ["/missing-page", "This table isn&#x27;t here."],
  ];
  for (const [path, title] of cases) {
    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(TestRoutes)));
    assert.ok(html.includes(title), `Page content for ${path}`);
    assert.equal((html.match(/<main\b/g) || []).length, 1, `Single main for ${path}`);
    assert.equal((html.match(/<footer\b/g) || []).length, 1, `Single footer for ${path}`);
    if (["/", "/about", "/menu", "/locations"].includes(path)) {
      const currentLinks = (html.match(/<a\b[^>]*>/g) || []).filter((tag) => tag.includes('aria-current="page"'));
      assert.equal(currentLinks.length, 2, `Desktop and mobile active links for ${path}`);
      assert.ok(currentLinks.every((tag) => tag.includes(`href="${path}"`)), `Correct active path for ${path}`);
    }
    console.log(`PASS ${path}`);
  }
} finally { await server.close(); }


