# The Table frontend: Vercel deployment

The frontend is the existing React + Vite + TypeScript application in client. Deploy it as its own Vercel project; the Express backend stays on Render. No Vercel project or public frontend URL has been created by this local configuration change.

## Vercel import settings

Import the Git repository in Vercel and choose these settings before deploying:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Root Directory | client |
| Node.js Version | 24.x |
| Install Command | npm ci --include=dev |
| Build Command | npm run build |
| Output Directory | dist |

client/vercel.json configures the framework, install/build commands, output directory and SPA route rewrite. The root directory must still be selected as client in the Vercel project settings. Do not set it to server or run npm start for this static frontend. If importing only the contents of client as a separate repository, use that repository root instead.

## Environment variables in Vercel

Set these in Project Settings > Environment Variables for the intended Production/Preview environments before building:

| Name | Configuration |
| --- | --- |
| VITE_API_URL | https://thetable-50sf.onrender.com/api/v1 |
| VITE_CLERK_PUBLISHABLE_KEY | Public key from the same Clerk application used by the Render backend. |
| VITE_STRIPE_PUBLISHABLE_KEY | Optional existing Stripe public key; hosted payment sessions are created by the backend, not with a browser secret. |

Keys must be entered through Vercel settings; no real key values are committed or copied from local files. Never configure server database credentials, Clerk secrets or Stripe secrets as frontend variables. Vite embeds public configuration at build time, so redeploy after environment changes. The Vercel build now reports missing/invalid VITE_API_URL or VITE_CLERK_PUBLISHABLE_KEY by name only, rather than publishing a disconnected preview. Local development keeps its existing optional preview behavior.

.env files and Vercel local metadata are ignored. .vercelignore additionally excludes local environment files for CLI uploads. Existing server/.env and client/.env.local values remain untouched.

## Connect the generated frontend URL

After Vercel generates the actual frontend URL:

1. Set CLIENT_ORIGINS in Render to that exact HTTPS frontend origin, without a trailing slash or path. Preserve any other explicitly approved frontend origins as a comma-separated list. Save/restart the Render service.
2. Configure that frontend domain and permitted redirects in the existing Clerk application. Keep the same application identity and trusted role metadata unless deliberately migrating accounts.
3. Confirm VITE_API_URL includes /api/v1. The Render backend hostname alone is not the API prefix.
4. Refresh the deployed frontend. If the browser reports an unreachable restaurant service while Render health works, check CORS first: the request Origin must exactly match Render CLIENT_ORIGINS.

Individual Vercel preview domains must also be explicitly allowlisted in Render/Clerk if they should access authenticated APIs. Do not use an unrestricted wildcard. Localhost is not automatically authorized against the production backend.

## Routes and assets

React Router deep links, including /menu, /checkout, /account, /admin/fulfillment and Clerk /login/* and /signup/* paths, fall back to index.html. Public folders assets, fonts, icons, images and menu-images are excluded from the SPA fallback so missing asset URLs do not return HTML. Vite copies existing public assets into dist during the build. This preserves the MongoDB menu image paths under /menu-images/.

The frontend calls the Render API directly; Vercel hosts the frontend files. Stripe webhooks remain on Render, never on the Vercel frontend hostname. No CORS proxy, authentication bypass or payment-success simulation was added.

## Existing local verification commands

From the repository root:

    npm run --prefix client typecheck
    npm run --prefix client build
    npm run --prefix client lint

No test suites should be run unless requested. Build success does not verify Vercel deployment, provider configuration or end-to-end payments. A large-bundle warning may still be reported by Vite.

Official reference: https://vercel.com/docs/frameworks/frontend/vite.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Application routing

The app uses React Router with browser URLs. Routes are declared in `src/app/router.tsx`, with the shared navbar and footer in `src/app/App.tsx` and route content rendered through `Outlet`.

Available paths: `/` (home), `/about`, `/menu`, `/locations`, `/reservations`, `/contact`, `/login`, `/cart`, `/checkout`, and `/privacy`. Unmatched paths render a 404 page. Reservations, contact, login, and privacy are starter pages. The cart supports in-memory items and quantities; booking, authentication, payment processing, contact submission, and policy content are not implemented.

Use `Link` for internal navigation and `NavLink` for links that show the active page. Keep ordinary anchors for external URLs. Homepage fragments such as `/#menu` continue to work. Route changes update the document title, reset scroll, and focus the page heading; fragments scroll to their target instead.

To add a page, create a component in `src/pages/`, import it into `src/app/router.tsx`, and add a child entry such as `{ path: "example", element: <Example /> }`. Add its destination to the navbar/footer where appropriate.

Run `npm run test:routes` to verify page rendering, the 404 fallback, active navigation, and the shared layout. Also run `npm run build` and `npm run lint`.

### Production hosting

Configure your host to serve `dist/index.html` for application URLs that do not match a static file. Browser routing needs this fallback for direct visits and refreshes at `/about`, `/menu`, and other routes. For example, Netlify uses `/* /index.html 200` in a `_redirects` file, while nginx commonly uses `try_files $uri $uri/ /index.html;`. Vite's development server already supports SPA fallback.

## Responsive checks

`src/styles/responsive.css` contains the shared phone and tablet refinements. The layout supports 320px phones, tablet portrait/landscape, and larger desktop widths without masking horizontal overflow.

Run `npm run test:responsive` for browser checks of all routes at 320, 390, 768, and 1024px, mobile-menu routing and Escape behavior, a short landscape viewport, hero controls, category filters, image decoding, and runtime errors. This uses installed Google Chrome in headless mode. Set `BROWSER_CHANNEL` to another installed Playwright-supported channel if needed.


## Shared cart

The persistent app layout in src/app/App.tsx wraps the navbar, route outlet, and footer with CartProvider. src/hooks/useCart.ts exposes cartItems (each line contains an existing MenuItem and quantity), addToCart(item), increaseQuantity(itemId), decreaseQuantity(itemId), removeItem(itemId), totalQuantity, and subtotal. MenuItem is imported from src/data/menuItems.ts; it is not redefined.

Adding the same ID increments its existing line. Decreasing from one removes the line. Unknown IDs leave the bag unchanged. Both totals are derived from cart state. State survives client-side route navigation and resets on a full refresh; there is no storage, payment, or API integration.

Verification: open /menu, add Roasted Tomato Soup twice, and confirm the navbar shows 2. Add Golden Fries once and confirm 3. Open the shopping bag: there should be two lines (soup quantity 2, fries quantity 1) with subtotal SAR 74.00. Increase/decrease quantities and check the navbar and subtotal together. Decrease a quantity of one to remove that line, or use Remove to delete the entire line. Refresh to reset the cart. Run npm run test:cart for automated browser checks, including rapid additions, route persistence, mobile layout, and refresh reset.


## Checkout and fulfillment setup

Open /menu, add a dish, open the bag, and choose Proceed to checkout. /checkout uses the existing cart context and preserves the cart behavior. Empty bags link back to the menu.

Edit src/config/fulfillment.ts using verified restaurant values. Both services intentionally start disabled. Blank strings, empty service areas, and null monetary/timing values mean setup is incomplete. Setting enabled to true is insufficient when required configuration is missing or invalid: the option remains unavailable and the page explains why.

Pickup requires the actual collection address, collection days/hours, collection instructions, and a positive preparation-time estimate in minutes. The only timing choice is next available collection during those hours, with the preparation estimate; no time slot is reserved or confirmed.

Delivery requires verified supportedAreas entries (city and neighborhood together, plus exact postal codes where restricted), a non-negative fee, a non-negative minimum items subtotal, and a valid minimum/maximum delivery-time estimate. Explicit 0 means free delivery or no minimum; null never means zero. Each entry with an empty postalCodes list covers its named neighborhood without postal-code restriction. An entirely empty supportedAreas list never supports an address. Matching trims and normalizes case/spacing but does not perform geocoding or claim street-level verification. The minimum is checked against items subtotal before the fee. Total is subtotal plus the configured delivery fee, calculated in integer halalas. Pickup has no delivery fee.

Customer name, valid email, and phone are required. Delivery also requires recipient name/phone, city, supported neighborhood, street, building/unit details, and a supported postal code for restricted areas. Instructions are optional. Delivery fields are not shown or validated for pickup. Inline errors are associated with their fields; failed submissions focus the first invalid input.

Demo only: Continue to payment validates local inputs and shows a message that backend order creation and payment integration are not connected. It does not place an order, process payment, persist form details, or call an API. Frontend rules will need equivalent server-side validation when the backend is implemented.

Run npm run test:checkout for setup/rule checks and browser flows, including 320–1440px layouts. Tests inject clearly synthetic settings through a test-only Vite plugin; they never overwrite the restaurant configuration. npm run test:cart and npm run test:routes cover existing shared-cart and routing behavior.

## Backend integration

See ../server/README.md for authoritative setup documentation. Frontend supports an optional VITE_API_URL and a separate VITE_CLERK_PUBLISHABLE_KEY, Clerk login/account pages, protected customer/admin dashboards, API menu data, and authenticated pending-order/reservation submissions. Local menu/cart remains preview-only when the API URL is unset. Server fulfillment settings are authoritative when connected. Saved orders are unpaid/pending_payment, never payment confirmation. Required-customization dishes need an option picker before production ordering. No end-to-end tests were run for this backend change at the user's request.

Staff workspaces are available at `/cashier`, `/kitchen`, and `/admin/operations`, guarded using server-verified Clerk roles. See [the server operations guide](../server/README.md) for permissions, disabled-by-default workflow gates and deployment setup. No payment collection, physical POS hardware or driver integration is connected. Only accepted paid orders enter the kitchen queue.
# Home menu data

The home hero and featured menu share one `useMenuCatalog` result from `Home`. With `VITE_API_URL` configured, their names, prices, images, categories and tags come from the menu API backed by `thetable`, just like the Menu page. The hero shows up to four dishes and featured filters show up to three dishes per selection. Loading, empty and retry states replace hardcoded dish fallbacks on API errors. An unconfigured API retains the existing explicit preview mode. Editing menu records in the admin workspace is reflected when the catalog is fetched again. Checkout and fulfillment settings are unchanged.

