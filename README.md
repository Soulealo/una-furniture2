# UNA Home & Furniture

UNA Home & Furniture runs on a Cloudflare Worker with Cloudflare D1. There is no traditional Node.js/Express/MongoDB backend in this project.

## Stack

- HTML, CSS, JavaScript
- Cloudflare Worker
- Cloudflare D1 SQLite database
- Wrangler

## Project Structure

```text
client/              Static frontend assets
worker/index.js      Worker API and asset router
migrations/          D1 SQLite migrations
wrangler.toml        Cloudflare Worker, assets, and D1 config
```

## Database

The schema is SQLite/D1-compatible and is managed through migrations.

- `products`: product core data, stable integer IDs, stock, category, and compatibility image fields
- `product_images`: normalized multiple product image URLs
- `users`: customer accounts
- `admin_settings`: persisted admin username/email/password hash
- `orders`: order header, total, payment method, unique transaction/payment code, status
- `order_items`: order item snapshots, kept safe even if a product is deleted later
- `categories`: admin-managed product categories
- `payment_settings`: bank and Facebook chat payment settings

`imageUrl` and `imageUrls` remain on `products` for compatibility, but `product_images` is the normalized source for multiple images.

## API Response Shape

All Worker API success responses use:

```json
{ "success": true, "data": {} }
```

All Worker API errors use:

```json
{ "success": false, "message": "Readable error message" }
```

Raw database errors are logged by the Worker and are not exposed to the frontend.

## Main API Routes

```text
POST /register
POST /login
GET /account
PUT /account
POST /change-password

POST /admin/login
GET /admin/session
GET /admin/me
PUT /admin/me
PUT /admin/change-password
GET /admin/users

GET /products
POST /products
GET /products/:id
PUT /products/:id
DELETE /products/:id

GET /categories
POST /categories
PUT /categories/:id
DELETE /categories/:id

GET /settings/payment
PUT /admin/settings/payment

POST /orders
GET /orders/my
GET /admin/orders
GET /admin/orders/:id
PUT /admin/orders/:id/status
```

## Local Development

```bash
npm install
npm run db:migrate:local
npm run dev
```

Wrangler serves `client/` and the Worker API on the same localhost origin.

## Production

The configured D1 database is `unafurniture`:

```toml
database_id = "24f83c24-0678-49f6-b7f4-d9487b6cf63c"
```

## Google OAuth

Google OAuth is handled by the Worker at `GET /auth/google` and `GET /auth/google/callback`. The frontend should only link to `/auth/google`; do not put the Google client ID in frontend code.

Use this authorized redirect URI in Google Cloud:

```text
https://una-furniture.jntsnnrv.workers.dev/auth/google/callback
```

Store the credentials as Worker secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put JWT_SECRET
```

Apply migrations and deploy:

```bash
npm run db:migrate:remote
npm run deploy
```

## Safe Reset / Seed Notes

Migrations seed only the required default category, payment settings row, and admin settings row with `INSERT OR IGNORE`.

Default admin login is:

```text
username: admin
password: 1234
```

After the first successful admin login, the Worker stores a password hash in D1. Admin username and password changes persist across refreshes, restarts, and deploys.
