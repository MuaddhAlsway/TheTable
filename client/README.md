## Image loading and cart persistence

Every restaurant image now uses components/common/LoadingImage.tsx with native lazy loading, asynchronous decoding, a warm loading placeholder, cached-image handling and an unavailable-image fallback. Inactive hero slides defer their source until selected. Existing dimensions/aspect ratios and responsive slots are preserved; the animation respects reduced-motion preferences. All styles are under src/styles/.

Cart persistence is browser-local, versioned and scoped by Clerk user ID. Stored items are validated before hydration; corrupt records are ignored and storage errors do not crash the app. Guest items are merged once on sign-in; other signed-in accounts remain separate. Matching carts synchronize across browser tabs. Quantities are bounded to the existing backend limit. Persistence does not turn a bag into an order or store payment-card data.

# The Table frontend: Vercel deployment

Local development uses ignored `client/.env.development.local` with `VITE_API_URL=http://localhost:4000/api/v1`. This overrides the Render URL only for `npm run dev`; production builds keep the production/Vercel settings. Run the backend and frontend in separate terminals from the repository root with `npm run --prefix server dev` and `npm run --prefix client dev`. Restart Vite after editing environment configuration if it does not automatically reload.

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

Available paths: `/` (home), `/about`, `/menu`, `/locations`, `/reservations`, `/contact`, `/login`, `/cart`, `/checkout`, and `/privacy`. Unmatched paths render a 404 page. Reservations, contact, login, and privacy are starter pages. The cart persists item selections and quantities in browser storage; configured authentication, reservations and Stripe checkout use the Render backend. Contact/policy starter content remains separate.

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

Adding the same ID increments its existing line. Decreasing from one removes the line. Unknown IDs leave the bag unchanged. Both totals are derived from cart state. State survives client-side route navigation and full refreshes through versioned localStorage. Guest and signed-in account carts have separate keys. A guest bag merges into the signed-in account once, and account switching restores that account’s own bag. Browser storage contains menu items/quantities only; no card details, addresses or tokens. The server still recalculates prices and validates every order.

Verification: open /menu, add Roasted Tomato Soup twice, and confirm the navbar shows 2. Add Golden Fries once and confirm 3. Open the shopping bag: there should be two lines (soup quantity 2, fries quantity 1) with subtotal SAR 74.00. Increase/decrease quantities and check the navbar and subtotal together. Decrease a quantity of one to remove that line, or use Remove to delete the entire line. A refresh should now restore the cart. Existing legacy automated cart checks may still describe the earlier refresh-reset behavior; no test suites were run for this change.


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


### Customer account dashboard

Open `/account` after signing in. The existing Clerk session token is sent through the shared API client to `/users/me`, `/orders`, `/orders/:id`, and `/reservations`. These customer endpoints derive ownership from verified Clerk authentication; no browser-supplied account ID or email selects records. The dashboard shows saved API statuses, Saudi-time dates, SAR totals, order history, and fulfillment-specific details. Profile, orders, reservations, and order details have loading/error/retry states. Switching accounts remounts protected content to discard the previous account's loaded records. No passwords are collected or stored by this dashboard.

### Homepage slide images

Slides 01–04 use `Hero01.png`–`Hero04.png`. MongoDB menu records carry optional `heroSlide` and `heroImageUrl` fields; the menu card `imageUrl` is preserved. Public copies are in `public/hero-images/`. Deploy both frontend and backend to expose the stored mapping; the frontend uses the same bundled images as a fallback while the backend update rolls out.

### Website content administration

Open `/admin/content` with a verified Clerk admin account, or choose **Website content** in the admin overview. Select a page/section, edit text or editorial image URLs, and choose **Publish changes**. Use **Discard changes** to abandon drafts or **Restore section defaults** followed by Publish to remove overrides. A search field helps find individual text blocks. Contact and Privacy have separate body fields. Menu dishes/prices and real address/hours continue to use their existing admin tools. Order, payment, reservation, and customer data remain API-owned.

Published content is read from `/api/v1/content`; authenticated admin reads/writes use `/api/v1/admin/content`. Publishing saves to MongoDB. Public pages refresh on tab focus, reconnect, and once a minute. The current page keeps working built-in copy if the content service is temporarily unavailable. Image editing accepts HTTPS URLs or existing `/content-images/`, `/hero-images/`, and `/menu-images/` paths; file uploading is not included. Existing image loading placeholders and error fallbacks are retained. Redeploy both frontend and backend for this feature; no new environment variables are needed.

### Restaurant workspaces

Cashier and kitchen use compact, responsive workspaces with API-backed counters (labelled for the current page), stage filters, live connection status and server-authorized actions. The kitchen flow is **Start preparation -> Finish preparation -> Ready for handoff**. A ready ticket means cooking is finished; cashier staff separately record actual pickup or delivery completion. Ready tickets leave the kitchen view after handoff is completed.

Ready-time edits and order-action confirmations use accessible dialogs. Customer payment actions review the order in a dialog before opening Stripe-hosted Checkout. The application still relies on signed Stripe webhook verification. Checkout has an optional kitchen-notes field; staff screens hide notes when blank. These are online-order workspaces; POS hardware, receipt printing, automatic driver integrations and refund processing remain separate integrations.

### Automated system verification

Run the existing frontend checks with `npm run test:routes`, `npm run test:cart`, `npm run test:menu`, `npm run test:checkout`, and `npm run test:responsive` from `client/`. They launch an isolated Vite instance with real API/Clerk settings disabled; existing `.env` files are unchanged.

`npm run test:flow` additionally checks the product dialog, checkout review, saved-order/payment dialogs, verified-paid cart cleanup, customer pages, cashier/kitchen actions, ready-time popup, handoff, content publication, role guards, and dashboard responsiveness. Its test-only Vite plugin supplies an authentication context and Playwright intercepts fixture API/Stripe requests. These mocks do not exercise real Clerk OAuth or make Stripe payments. Screenshots are saved under `test-results/system-flow/`. Chrome is used by default; set `BROWSER_CHANNEL` to another installed Chromium browser if necessary.

### Staff and restaurant-managed delivery

Admin → **Staff & drivers** (`/admin/team`) manages any number of cashier, kitchen, and driver accounts. Assign existing accounts using their verified primary email, or explicitly send a Clerk invitation. Invites expire after seven days and prefer a configured HTTPS frontend for signup. Employees complete Clerk sign-in themselves; this app never collects their passwords. Editing changes the work display name, role and work phone. Removing staff access demotes the restaurant role to customer and preserves account/order records. Administrators and the signed-in administrator cannot be edited/removed here. Active deliveries must finish before removing/changing the assigned driver’s access.

For your own drivers: add a **Delivery driver / مندوب** with a real Saudi mobile; have the driver accept the invitation and sign in at `/driver`. After kitchen preparation finishes, cashier staff select that registered driver and confirm dispatch only after actual collection. The assigned driver sees the recipient address, telephone, directions and ordered items. The customer sees the driver’s contact details and a six-digit handoff code in their own order details. The driver enters that code after the recipient receives the food. Five wrong attempts pause code verification for one minute. The system records dispatch and verified handoff timestamps; it does not send SMS, track GPS, assign an external courier, or physically move an order. Drivers must keep their workspace open or refresh it for new assignments.

Website content defaults are now persisted in `thetable.websitecontents` at startup. `npm run setup:content` from `server/` initializes/backfills missing fields without overwriting custom edits. Resetting an editor field stores its default value rather than leaving the collection empty.

## Public table QR links

Set VITE_PUBLIC_SITE_URL=https://the-table-khaki.vercel.app in the frontend environment (including local .env.development.local when printing from localhost). This is the CUSTOMER website origin, never the Render API URL. VITE_API_URL remains the backend /api/v1 URL used by the deployed website. Restart Vite after local changes; rebuild/redeploy Vercel after changing its environment. Without VITE_PUBLIC_SITE_URL, codes use the current website origin and show a localhost warning when relevant. Invalid configured origins block QR generation.

The QR image and Open table ordering link use the same public URL and persisted table token. The public site must connect to the same restaurant database as the admin creating the table. Existing downloaded/printed QR codes cannot change: download fresh images and replace old signs. Do not rotate the table token just to change the website origin.
