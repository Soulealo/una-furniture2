# UNA Home & Furniture

UNA Home & Furniture now runs on a Cloudflare Worker with Cloudflare D1. The legacy Node backend and local upload service have been removed.

## Stack

- HTML
- CSS
- JavaScript
- Cloudflare Workers
- Cloudflare D1
- Wrangler

## Project Structure

```text
.
├── client/
│   ├── index.html
│   ├── products.html
│   ├── login.html
│   ├── signup.html
│   ├── account.html
│   ├── cart.html
│   ├── admin.html
│   ├── styles.css
│   ├── admin-styles.css
│   ├── script.js
│   ├── admin.js
│   └── images/
├── worker/
│   └── index.js
├── migrations/
│   └── 0001_create_products.sql
├── wrangler.toml
├── package.json
└── README.md
```

## D1 Schema

```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price INTEGER,
    description TEXT,
    category TEXT,
    imageUrl TEXT,
    createdAt TEXT
);
```

## API

```text
GET /products
POST /products
DELETE /products/:id
```

The Worker also supports `GET /products/:id`, `PUT /products/:id`, and `GET /categories` so the existing frontend product screens can keep working while using the D1 `products` table.

## Local Development

Install dependencies:

```bash
npm install
```

Apply the D1 migration locally:

```bash
npm run db:migrate:local
```

Run the Worker locally:

```bash
npm run dev
```

Wrangler serves the static frontend from `client/` and the Worker API on the same localhost origin.

## Production D1 Setup

Create a real D1 database:

```bash
npx wrangler d1 create una-furniture-db
```

Copy the generated `database_id` into `wrangler.toml`, then apply the migration remotely:

```bash
npm run db:migrate:remote
```

Deploy:

```bash
npm run deploy
```

## Product JSON

```json
{
  "id": "1",
  "name": "Modern sofa",
  "description": "Comfortable living room sofa",
  "price": 1000000,
  "category": "Sofa",
  "imageUrl": "https://example.com/product.jpg",
  "createdAt": "2026-04-27T00:00:00.000Z"
}
```

Images remain URL-based through `imageUrl`. Use Cloudinary or any public image URL.
