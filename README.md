# The Table

Restaurant frontend in client/; Express/TypeScript API in server/.

Read server/README.md for environment setup, safe Clerk admin-role assignment, API endpoints, restaurant settings, Vercel/Render deployment, and what blocks production ordering. Never commit real .env files.

```sh
npm ci --prefix server
npm run --prefix server dev
# another terminal
npm ci --prefix client
npm run --prefix client dev
```

No database seeding, Clerk user/role assignment, deployment, payment integration, or end-to-end verification has been performed. Creation switches and unknown operational settings remain disabled/unconfigured. Existing frontend preview menu/cart behavior remains available without an API URL.
